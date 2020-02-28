import * as crypto from 'crypto';
import { Session } from './sdk/Session';

// Import global functions. This should be modulized in the future
const {
    XcalarListFiles,
    setSessionName,
    PromiseHelper,
    xcalarGetDatasetsInfo,
    xcalarIndex,
    XcalarApiKeyT,
    xcalarApiMap,
    xcalarApiGetRowNum,
    xcalarProject,
    xcalarApiPublish,
    xcalarApiSessionNew,
    xcalarApiSessionActivate,
    xcalarListPublishedTables,
    ParseArgsT, DataSourceArgsT,
    xcalarLoad,
    XcalarDatasetDeactivate,
    xcalarApiSessionInact,
    xcalarApiSessionDelete
} = global;

const DATASET_PREFIX = '.XcalarDS.';
const DS_PREFIX = 'LWDS';
const SESSION_PREFIX = 'LWS';
const XCALAR_ROWNUM_PK_NAME = 'XcalarRowNumPk';



async function listFiles(path, namePattern = '*') {
    const fileInfos = new Map();

    try {
        const s3Files = await XcalarListFiles({
            "recursive": false,
            "targetName": "AWS Target",
            "path": path,
            "fileNamePattern": namePattern
        });

        // XXX TODO: add comment about why slice(1)?
        for (const file of s3Files.files.slice(1)) {
            const fullFilePath = path + file.name;
            const isDirectory = file.attr.isDirectory ? true : false;

            fileInfos.set(fullFilePath, {
                fileId: fullFilePath,
                directory: isDirectory,
                path: file.name,
                sizeInBytes: file.attr.size,
                type: isDirectory
                    ? 'directory'
                    : getFileExt(file.name)
            });
        }
    } catch(e) {
        console.error(e);
    }

    return fileInfos;
}

// XXX TODO: Need to carefully handle errors and do cleanup
async function createKeyListTable({ basePath='/xcfield/', namePattern='*', recursive=true }) {
    const tHandle = getThriftHandler();

    const finalTableName = getKeylistTableName(basePath);
    const {
        rand: myRandomName,
        sessionName: mySessionName
    } = generateRandomSession();
    const myDatasetName = DS_PREFIX + myRandomName;

    // Create a temporary session
    // setSessionName(mySessionName);
    await createSession(mySessionName);
    // console.log("Created temporary session: " + mySessionName);

    // Check if we already have a table
    const publishedTables = await xcalarListPublishedTables(tHandle, finalTableName);
    // console.log(`PublishedTableNames: ${JSON.stringify(publishedTables)}`)
    if (publishedTables.tables.length > 0) {
        return finalTableName;
    }

    const udfParserArgs = {
        's3_path': basePath,
        's3_name_pattern': namePattern,
        's3_recursive': recursive
    }
    let parseArgs = new ParseArgsT()
    parseArgs.parserFnName = 'default:generateS3KeyList';
    parseArgs.parserArgJson = JSON.stringify(udfParserArgs);

    let dummySourceArgs = new DataSourceArgsT();
    dummySourceArgs.targetName = 'Default Shared Root';
    dummySourceArgs.path = '/etc/hosts';
    dummySourceArgs.fileNamePattern = '';
    dummySourceArgs.recursive = false;

    await callApiInSession(
        mySessionName,
        () => xcalarLoad(tHandle, myDatasetName, [dummySourceArgs], parseArgs, 0)
    );
    // console.log(`Dataset for KeyList loaded: ${myDatasetName}`);

    try {
        // console.log('Attempting to create published table');
        await createPublishedTableFromDataset(mySessionName, myDatasetName, finalTableName);
        return finalTableName;
    } catch (e) {
        console.log(`ERROR: Creating published table: ${JSON.stringify(e)}`);
    } finally {
        await callApiInSession(
            mySessionName,
            () => XcalarDatasetDeactivate(myDatasetName));
        // console.log(`Dataset deleted: ${myDatasetName}`);

        await destorySession(mySessionName);
    }
}

async function getForensicsStats(fullPath) {
    const keyListTableName = getKeylistTableName(fullPath);
    const sql = `
        SELECT
            COUNT(*) as TOTAL_COUNT,
            MAX(LENGTH(path) - LENGTH(REPLACE(path, '/', ''))) AS MAX_DEPTH,
            MAX(CAST(size as int)) AS LARGEST_FILE_SIZE,
            MIN(CAST(size as int)) AS SMALLEST_FILE_SIZE,
            STDDEV(CAST(size as int)) AS STD_DEV,
            SUM(CASE WHEN path LIKE '%.csv' THEN 1 ELSE 0 END) AS CSV_COUNT,
            SUM(CASE WHEN path LIKE '%.json%' THEN 1 ELSE 0 END) AS JSON_COUNT,
            SUM(CASE WHEN path LIKE '%.parquet' THEN 1 ELSE 0 END) AS PARQUET_COUNT
        from ${keyListTableName}`;

    const session = new Session();
    const stats = {
        file: {
            count: 0,
            maxSize: 0,
            minSize: 0,
        },
        structure: {
            depth: 0
        },
        type: {
            csv: 0, json: 0, parquet: 0
        }
    }

    try {
        // Create temporary session
        await session.create();
        await session.activate();
        console.log(`Session for sql: ${session.sessionName}`);

        // execute sql
        const table = await session.executeSql(sql);
        console.log(`Sql result table: ${table.getName()}`);

        // fetch the result
        const cursor = table.createCursor();
        await cursor.open();
        const rows = await cursor.fetch(1);

        // Parse result
        if (rows.length > 0) {
            const result = JSON.parse(rows[0]);
            stats.file.count = result['TOTAL_COUNT'];
            stats.file.maxSize = result['LARGEST_FILE_SIZE'];
            stats.file.minSize = result['SMALLEST_FILE_SIZE'];
            stats.structure.depth = result['MAX_DEPTH'];
            stats.type.csv = result['CSV_COUNT'];
            stats.type.json = result['JSON_COUNT'];
            stats.type.parquet = result['PARQUET_COUNT'];
        }
    } catch(e) {
        console.error(e);
    } finally {
        await session.destroy();
    }

    return stats;
}


// === Helper functions: begin ===

// XXX TODO: replace individual operators with a xcalarQuery
async function createPublishedTableFromDataset(callSessionName, datasetName, publishedTableName) {
    const tHandle = getThriftHandler();

    let tt = 0;
    const tableNames = [];
    for (tt = 0; tt < 20; tt++) {
        tableNames.push(datasetName + '-table-' + tt);
    }
    tt = 0;

    const dsName = DATASET_PREFIX + datasetName;
    const datasetInfo = await callApiInSession(
        callSessionName,
        () => xcalarGetDatasetsInfo(tHandle, dsName)
    );

    const tableColumnNames = datasetInfo.datasets[0].columns.map((column) => column.name);

    // Index Dataset
    const callIndex = () => xcalarIndex(
        tHandle, dsName,
        tableNames[tt++],
        [new XcalarApiKeyT({
            name: "xcalarRecordNum",
            type:"DfInt64",
            keyFieldName:"",
            ordering:"Unordered"})],
        datasetName
    );
    await callApiInSession(callSessionName, callIndex);

    // Build string-cast evals for map
    const allEvals = tableColumnNames.map((name) => `string(${datasetName}::${name})`);

    // Map-casting all columns to strings - make table of immediates
    console.log("Mapping Table to produce immedates.");
    const callMap = () => xcalarApiMap(tHandle, tableColumnNames, allEvals, tableNames[tt - 1], tableNames[tt++]);
    await callApiInSession(callSessionName, callMap);

    // Add Xcalar Row Number PK
    console.log("Adding Xcalar Row Number Primary Keys");
    const callRowNum = () => xcalarApiGetRowNum(tHandle, XCALAR_ROWNUM_PK_NAME, tableNames[tt - 1], tableNames[tt++]);
    await callApiInSession(callSessionName, callRowNum);

    tableColumnNames.push(XCALAR_ROWNUM_PK_NAME);

    // Index on Xcalar Row Number PK
    console.log("Indexing on Xcalar Row Number Primary Key");
    const callIndex2 = () => xcalarIndex(
        tHandle,
        tableNames[tt - 1],
        tableNames[tt++],
        [new XcalarApiKeyT({
            name: XCALAR_ROWNUM_PK_NAME,
            type: "DfInt64",
            keyFieldName:"",
            ordering:"Unordered"})]
    );
    await callApiInSession(callSessionName, callIndex2);

    // Project tables...
    console.log("Projecting columns for table");
    const callProject = () => xcalarProject(tHandle,
        tableColumnNames.length, tableColumnNames,
        tableNames[tt - 1], tableNames[tt++]);
    await callApiInSession(callSessionName, callProject);

    // Map on XcalarOpCode and XcalarRankOver
    // TODO: figure out if this is actually needed, I don't think it is?
    const callMap2 = () => xcalarApiMap(tHandle,
        ['XcalarOpCode', 'XcalarRankOver'], ['int(1)', 'int(1)'],
        tableNames[tt - 1], tableNames[tt++]);
    await callApiInSession(callSessionName, callMap2);

    // Publish tables...
    console.log("Publishing tables... :)");
    const callPublish = () => xcalarApiPublish(tHandle, tableNames[tt - 1], publishedTableName);
    await callApiInSession(callSessionName, callPublish);
    // This raises an exception, but still works?
}

function getKeylistTableName(fullPath) {
    const pathHash = crypto.createHash('md5').update(fullPath).digest('hex').toUpperCase();
    return `LW_KEYLIST_${pathHash}`;
}

function generateRandomSession() {
    const randStr = randomName();
    const sessionName = SESSION_PREFIX + randStr;
    return {
        rand: randStr,
        sessionName: sessionName
    };
}

async function createSession(sessionName) {
    await xcalarApiSessionNew(tHandle, sessionName);
    await xcalarApiSessionActivate(tHandle, sessionName);
}

async function destorySession(sessionName) {
    try {
        await callApiInSession(
            sessionName,
            () => xcalarApiSessionInact(tHandle, sessionName)
        );
        // console.log(`Session deactivated: ${sessionName}`);

        await callApiInSession(
            sessionName,
            () => xcalarApiSessionDelete(tHandle, sessionName));
        // console.log(`Session deleted: ${sessionName}`);
    } catch(e) {
        console.warn(`Destory session ${sessionName} failed:`, e);
    }
}

function getFileExt(fileName) {
    return fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none';
}

function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

function getCurrentSession() {
    // Global variable: sessionName
    return sessionName;
}

function callApiInSession(callSession, func) {
    if (callSession == null) {
        return func();
    }
    const currentSession = getCurrentSession();
    setSessionName(callSession);
    const result = PromiseHelper.convertToNative(func());
    setSessionName(currentSession);

    return result;
}

function getThriftHandler() {
    // Global variable: tHandle
    return tHandle;
}
// === Helper functions: end ===

// XXX TODO: it's something related to the state hook
// Need to split it from service code
import prettyBytes from 'pretty-bytes';
function populateFiles(fileInfos, setData, fileIdToFile, setFileIdToFile) {
    const fileList = [];
    for (const [ fileFullPath, fileInfo] of fileInfos.entries()) {
        const fileObj = {
            size: prettyBytes(fileInfo.sizeInBytes),
            ...fileInfo
        };
        fileIdToFile[fileFullPath] = fileObj;
        fileList.push(fileObj);
    }

    setFileIdToFile(fileIdToFile);
    setData(fileList);
}

export { listFiles, createKeyListTable, getForensicsStats, populateFiles };