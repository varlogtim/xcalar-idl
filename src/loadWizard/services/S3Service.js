import * as crypto from 'crypto';
import * as Path from 'path';
import { XDSession } from './sdk/Session';
import * as DiscoverSchema from '../utils/discoverSchema';

// Import global functions. This should be modulized in the future
const {
    XcalarListFiles,
    ParseArgsT, DataSourceArgsT,
} = global;

const DS_PREFIX = 'LWDS';

// XXX TODO: Performance issue: result could be large
async function flattenFileDir(fileDirList, fileNamePattern = '*') {
    const flattenFiles = new Map();

    for (const fod of fileDirList) {
        if (fod.directory) {
            const s3Files = await XcalarListFiles({
                "recursive": true,
                "targetName": "AWS Target",
                "path": fod.fullPath,
                "fileNamePattern": fileNamePattern
            });

            for (const file of s3Files.files) {
                const fullFilePath = Path.join(fod.fullPath, file.name);
                const isDirectory = file.attr.isDirectory ? true : false;

                flattenFiles.set(fullFilePath, {
                    fileId: fullFilePath,
                    fullPath: fullFilePath,
                    directory: isDirectory,
                    name: file.name,
                    sizeInBytes: file.attr.size,
                    type: isDirectory
                        ? 'directory'
                        : getFileExt(file.name)
                });
            }
        } else {
            flattenFiles.set(fod.fileId, {...fod});
        }
    }

    return flattenFiles;
}

async function listFiles(path, filter = (fileInfo) => true) {
    const fileInfos = new Map();
    const s3Files = await XcalarListFiles({
        "recursive": false,
        "targetName": "AWS Target",
        "path": path,
        "fileNamePattern": '*'
    });
    // XXX TODO: add comment about why slice(1)?
    for (const file of s3Files.files) {
        const fullFilePath = Path.join(path, file.name);
        const isDirectory = file.attr.isDirectory ? true : false;
        const fileInfo = {
            fileId: fullFilePath,
            fullPath: fullFilePath,
            directory: isDirectory,
            name: file.name,
            sizeInBytes: file.attr.size,
            type: isDirectory
                ? 'directory'
                : getFileExt(file.name)
        };
        if (filter(fileInfo)) {
            fileInfos.set(fullFilePath, fileInfo);
        }
    }

    return fileInfos;
}

async function createKeyListTable({ bucketName='/xcfield/', namePattern='*', recursive=true }) {
    const finalTableName = getKeylistTableName(bucketName);
    const myDatasetName = DS_PREFIX + randomName();

    const session = new XDSession();
    await session.create();
    await session.activate();

    try {
        // Check if we already have a table
        const existingTable = await session.getPublishedTable({ name: finalTableName });
        if (existingTable != null) {
            return finalTableName;
        }

        // load key list to dataset
        const udfParserArgs = {
            's3_path': bucketName,
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

        const keylistDataset = await session.createDataset({
            name: myDatasetName,
            sourceArgs: [dummySourceArgs],
            parseArgs: parseArgs
        });

        // Create published table from dataset
        const keylistTable = await keylistDataset.createPublishedTable(finalTableName);
        return keylistTable.getName();
    } catch(e) {
        console.error('ERROR: Creating published table: ', e);
    } finally {
        await session.destroy();
    }
}

async function getForensicsStats(bucketName, pathPrefix) {
    const fullPath = Path.join(bucketName, pathPrefix);
    const keyListTableName = getKeylistTableName(bucketName);
    const sql = `SELECT * FROM (SELECT * FROM
        (SELECT *,(TOTAL_COUNT-CSV_COUNT-JSON_COUNT-PARQUET_COUNT-NOEXT_COUNT) AS UNSUPPORTED_COUNT FROM
        (SELECT
            COUNT(*) as TOTAL_COUNT,
            MAX(LENGTH(PATH) - LENGTH(REPLACE(PATH, '/', ''))) AS MAX_DEPTH,
            STDDEV(CAST(SIZE as int)) AS STD_DEV,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.csv' THEN 1 ELSE 0 END) AS CSV_COUNT,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.json%' THEN 1 ELSE 0 END) AS JSON_COUNT,
            SUM(CASE WHEN LOWER(PATH) LIKE '\%.parquet' THEN 1 ELSE 0 END) AS PARQUET_COUNT,
            SUM(CASE WHEN LOWER(PATH) NOT LIKE '\%.\%' THEN 1 ELSE 0 END) AS NOEXT_COUNT
        FROM ( SELECT * FROM ${keyListTableName} WHERE PATH LIKE '${fullPath}\%'))) JOIN (
            SELECT a.PATH LARGEST_FILE, a.SIZE LARGEST_FILE_SIZE
               FROM ${keyListTableName} a
               INNER JOIN (
                    SELECT MAX(CAST(SIZE AS INT)) LARGEST_FILE_SIZE
                    FROM ${keyListTableName}
            ) b ON a.SIZE = b.LARGEST_FILE_SIZE
        )) JOIN (
            SELECT a.PATH SMALLEST_FILE, a.SIZE SMALLEST_FILE_SIZE
               FROM ${keyListTableName} a
               INNER JOIN (
                    SELECT MIN(CAST(SIZE AS INT)) SMALLEST_FILE_SIZE
                    FROM ${keyListTableName}
            ) b ON a.SIZE = b.SMALLEST_FILE_SIZE
        )`;

    const session = new XDSession();
    const stats = {
        file: {
            count: 0,
            maxSize: 0,
            minSize: 0,
            largestFile: '',
            smallestFile: ''
        },
        structure: {
            depth: 0
        },
        type: {
            csv: 0, json: 0, parquet: 0, unsupported: 0, noext: 0
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
            stats.file.largestFile = result['LARGEST_FILE'];
            stats.file.smallestFile = result['SMALLEST_FILE'];
            stats.structure.depth = result['MAX_DEPTH'];
            stats.type.csv = result['CSV_COUNT'];
            stats.type.json = result['JSON_COUNT'];
            stats.type.parquet = result['PARQUET_COUNT'];
            stats.type.unsupported = result['UNSUPPORTED_COUNT'];
            stats.type.noext = result['NOEXT_COUNT'];
        }
    } finally {
        await session.destroy();
    }

    return stats;
}

/**
 *
 * @param {string} tableName
 * @param {[{ path:string, size:number }]} fileInfos [{ path, size }]
 * @param {[{name, mapping, type}]} schema
 * @param {*} inputSerialization
 */
async function createTableFromSchema(tableName, fileInfos, schema, inputSerialization) {
    const finalTableName = await DiscoverSchema.createTableFromSchema(
        tableName,
        fileInfos,
        {
            numColumns: schema.length,
            columns: schema
        },
        inputSerialization
    );
    return finalTableName;
}

// === Helper functions: begin ===
function getKeylistTableName(fullPath) {
    const pathHash = crypto.createHash('md5').update(fullPath).digest('hex').toUpperCase();
    return `LW_KEYLIST_${pathHash}`;
}

function getFileExt(fileName) {
    return (fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none').toLowerCase();
}

function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
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

export {
    listFiles,
    createKeyListTable,
    getForensicsStats,
    populateFiles,
    flattenFileDir,
    createTableFromSchema
};
