/**
 * XXX TODO: This should be part of the service
 */

// initial version is written by Tim Tucker
//
//
// Example of calling APIs needed for Instant Data Mart
//
// How to deploy:
//
// 1. This needs to be symlinked to ~/xcalar-gui/assets/js/discover_schema_demo.js
//
// 2. Include the file:
//   in this file: xcalar-gui/site/partials/script.html ... add this:
// <script src="assets/js/discover_schema_demo.js"></script>
//
// 3. Expose the XcRPC:
//   in this file: xcalar-gui/ts/shared/Xcrpc/index.ts ... add this:
// import * as xce from 'xcalar';
// export { xce };
//
// 4. Build the XD
//   $ make trunk
//
//
// NOTES:
//  - Creating the client:
// var client = new Xcrpc.xce.XceClient('http://localhost/app/service/xce/')
// var disco = new Xcrpc.xce.DiscoverSchemasService(client)
// Hellllllaaa good test case stuff in: xcalar-gui/ts/thrift/MgmtTest.js
//
// const SupersetSchemas = require('./SupersetSchemas.js');
import * as crypto from 'crypto'
import { SupersetSchemas } from './SupersetSchemas.js'
const supersetSchemas = new SupersetSchemas()

// GLOBAL THINGS...
var AWS_TARGET_NAME = 'AWS Target';
var AWS_S3_SELECT_PARSER_NAME = 'default:parse_s3_select_with_schema';
var NUMBER_OF_XPUS = null;
var DATASET_PREFIX = '.XcalarDS.'

// Move to config file
//var icvColumnName = 'ICV';
//var fileRecordNumColumnName = 'FILE_RECORD_NUM';
//var dataColumnName = 'SOURCE_DATA';
//var pathColumnName = 'PATH';

var icvColumnName = '_X_ICV';
var fileRecordNumColumnName = '_X_FILE_RECORD_NUM';
var dataColumnName = '_X_SOURCE_DATA';
var pathColumnName = '_X_PATH';

const filez = ['hi']

function getPaths() {
    var paths = [
        '/xcfield/idm_demo/element_list_0.csv',
        '/xcfield/idm_demo/element_list_1.csv',
        '/xcfield/idm_demo/element_list_2.csv',
        '/xcfield/idm_demo/element_list_3.csv',
        '/xcfield/idm_demo/element_list_4.csv',
        '/xcfield/idm_demo/element_list_5.csv',
        '/xcfield/idm_demo/employees_0.csv',
        '/xcfield/idm_demo/employees_1.csv',
        '/xcfield/idm_demo/male_cricket_players_0.jsonl',
        '/xcfield/idm_demo/male_cricket_players_1.jsonl',
        '/xcfield/idm_demo/male_cricket_players_2.jsonl',
    ];
    paths = [ '/xcfield/instantdatamart/csv/keylist.csv'];
    return paths;
}

function randomName() {
    let pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}


function getInputSerial(inputSerialObject) {
    // See: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html#S3.Client.select_object_content ... in the InputSerialization of the Request Syntax section
    // Definition
    // const InputSerialization = {
    //     'CSV': {
    //         'FileHeaderInfo': ['USE', 'IGNORE', 'NONE'],
    //         'Comments': 'string',
    //         'QuoteEscapeCharacter': 'string',
    //         'RecordDelimiter': 'string',
    //         'FieldDelimiter': 'string',
    //         'QuoteCharacter': 'string',
    //         'AllowQuotedRecordDelimiter': [true, false]
    //     },
    //     'CompressionType': ['NONE', 'GZIP', 'BZIP2'],
    //     'JSON': {
    //         'Type': ['LINES'] // ['DOCUMENT'] is not supported
    //     },
    //     'Parquet': {}
    // }

    try {
        const inputSerialJson = JSON.stringify(inputSerialObject);
        var inputSerial = new proto.xcalar.compute.localtypes.Schema.InputSerialization();
        inputSerial.setArgs(inputSerialJson);
        return inputSerial;
    } catch (e) {
        console.error("getInputSerial error: ", e);
        throw e;
        // throw "getInputSerial() must be called with an object"
        //       " similar to the following: " + JSON.stringify(InputSerialization);
    }
}

async function checkTableName(tableName) {
    if (tableName == null) {
        throw "tableName must not be null";
    }
    if (tableName.toUpperCase() != tableName) {
        throw "tableName must be INCAPITALLETTERS";
    }
    // XXX this is bad that it is hard coded in two places.
    // This function is garbage, rewrite
    const compName = tableName + '_COMPLEMENTS';
    const pubTables = await XcalarListPublishedTables('*');
    for (let ii = 0; ii < pubTables.tables.length; ii++) {
        if(pubTables.tables[ii].name == compName ||
           pubTables.tables[ii].name == tableName) {
            throw "Published table or complements " +
                "already exists with name: '" + tableName + "'";
        }
    }
}

function updateProgress(messge, cb) {
    if (typeof cb === "function") {
        cb(messge);
    }
}

async function createTableAndComplements(paths, schema, inputSerialObject, tableName, progressCB) {
    /*
     * paths => list of paths to create the data from
     * schema => a schema object returned from a discoverSchema call
     * inputSerialObject => an object similar to the one defined in getInputSerial()
     * tableName => the name of the final table to be created. This function
     *     will also create the complements table, tableName + '_COMPLEMENTS'
     */

    const myRandomName = randomName();
    const myDatasetName = 'DS' + myRandomName;
    const inputSerialJson = getInputSerial(inputSerialObject);

    tableName = PTblManager.Instance.getUniqName(tableName.toUpperCase());
    const compName = PTblManager.Instance.getUniqName(tableName + '_COMPLEMENTS');

    // TODO: Must check to see if PubTables already exist with
    // a given name
    log("createTableAndComplements on session: " + sessionName);

    // make load args for BulkLoad.
    const sourceArgs = buildSourceLoadArgs(paths);
    const { parserArgs, loadStore } = getParseArgs(schema, inputSerialJson, paths);
    // Load that dataset!!
    // await xcalarLoad(tHandle, myDatasetName, sourceArgs, parseArgs, 0);
    const options = {
        sources: sourceArgs,
        ...parserArgs
    };

    try {
        updateProgress("Progress 0%", progressCB);
        await loadStore.save();
        await XcalarDatasetLoad(myDatasetName, options);
    } finally {
        await loadStore.delete();
    }
    // do a bunch of table operations
    updateProgress("Progress: 30%", progressCB);
    const hasDeleteComplement = await datasetToTableWithComplements(myDatasetName, tableName, compName, progressCB);
    PTblManager.Instance.addTable(tableName);
    if (!hasDeleteComplement) {
        PTblManager.Instance.addTable(compName);
    }

    return {
        table: tableName,
        complementTable: hasDeleteComplement ? null : compName
    };
}

function createLoadStore({ kvSchema, kvLoad }) {
    const storeSchema = new KVStore(kvSchema.key, gKVScope.GLOB);
    const storeLoad = new KVStore(kvLoad.key, gKVScope.GLOB);

    return {
        save: async () => {
            await Promise.all([
                storeSchema.put(kvSchema.value, false),
                storeLoad.put(kvLoad.value, false)
            ]);
        },
        delete: async () => {
            try {
                await Promise.all([
                    storeSchema.delete(),
                    storeLoad.delete()
                ]);
            } catch(e) {
                // Don't fail the cleanup, just log the error
                console.error(e);
            }
        }
    };
}

function _deleteTempTable(tableName) {
    return XcalarDeleteTable(tableName, null, false, true);
}

async function _cleanupDataset(datasetName) {
    try {
        log("Cleaning up dataset");
        // Deactivate Dataset
        await XcalarDatasetDeactivate(datasetName);
        log("Deactivated Dataset");
        await XcalarDatasetDelete(datasetName);
        log("Delete Dataset");

        const datasetList = await XcalarGetDatasets();
        log("datasetList: " + JSON.stringify(datasetList));
        // {numDatasets: 1, datasets: [ {loadArgs: asdf, datasetId: 123, name: "asdf", ... }]
        for(let ii = 0; ii < datasetList.datasets.length; ii++) {
            if (datasetList.datasets[ii].name.indexOf(datasetName) > 0) {
                console.error("Error deleting dataset: " + datasetName);
                break;
            }
        }
    } catch (e) {
        console.error("clean up dataset fails", e);
    }
}


async function getPublishedTableNames(tableName) {
    let publishedTables = await xcalarListPublishedTables(tHandle, tableName);
    console.log("Published Tables: " + JSON.stringify(publishedTables))
}

async function datasetToTableWithComplements(datasetName, finalTableName, finalComplementsName, progressCB) {
    // this is the function that divides the dataset into the
    // primary and complements table along with the requisite
    // steps to publish both tables.
    //
    // TODO: Should remove tables as they are no longer needed.

    let dsName = DATASET_PREFIX + datasetName;
    let datasetInfo = await xcalarGetDatasetsInfo(tHandle, dsName);
    log("My Dataset Info: " + JSON.stringify(datasetInfo));
    // Determine the names of our table and complements columns
    let complementColumnNames = [icvColumnName, fileRecordNumColumnName, dataColumnName, pathColumnName];
    let tableColumnNames = [];
    datasetInfo.datasets[0].columns.forEach(function(column){
        if (!complementColumnNames.includes(column.name)) {
            tableColumnNames.push(column.name);
        }
    });
    log("TABLE COLUMN NAMES: " + JSON.stringify(tableColumnNames));
    log("COMPLEMENTS COLUMN NAMES: " + JSON.stringify(complementColumnNames));

    let deletePromises = [];
    let srcTableName = null;
    let destTableName = null;
    let srcCompTableName = null;
    let destCompTableName = null;
    // Index Dataset
    destTableName = genTableName(datasetName + "_indexed");
    await xcalarIndex(
        tHandle,
        dsName,
        destTableName,
        [new XcalarApiKeyT({
            name: "xcalarRecordNum",
            type:"DfInt64",
            keyFieldName:"",
            ordering:"Unordered"})],
        datasetName
    );
    updateProgress("Progress: 35%", progressCB);
    // Build string-cast evals for map
    let allEvals = [];
    let allColumnNames = tableColumnNames.concat(complementColumnNames);
    allColumnNames.forEach(function(name){
        allEvals.push('string(' + datasetName + '::' + name + ')');
    });

    // Map-casting all columns to strings - make table of immediates
    log("Mapping Table to produce immedates.");
    srcTableName = destTableName;
    destTableName = genTableName(datasetName + "_map");
    await xcalarApiMap(tHandle, allColumnNames, allEvals, srcTableName, destTableName);
    deletePromises.push(_deleteTempTable(srcTableName));
    updateProgress("Progress: 38%", progressCB);

    // Add Xcalar Row Number PK
    const xcalarRowNumPkName = "XcalarRowNumPk";
    log("Adding Xcalar Row Number Primary Keys");
    srcTableName = destTableName;
    srcCompTableName = destTableName;
    destTableName = genTableName(datasetName + "_rowNum");
    await xcalarApiGetRowNum(tHandle, xcalarRowNumPkName, srcTableName, destTableName);
    deletePromises.push(_deleteTempTable(srcTableName));

    complementColumnNames.push(xcalarRowNumPkName);
    tableColumnNames.push(xcalarRowNumPkName);
    updateProgress("Progress: 40%", progressCB);

    // Filter
    // At this point we need to run two filters to split of the table and it's complements.
    log("Filtering out the table and it's complements");
    srcTableName = destTableName;
    srcCompTableName = destTableName;
    destTableName = genTableName(datasetName + "_filter");
    destCompTableName = genTableName(datasetName + "_comp_filter");
    await xcalarFilter(tHandle, "neq(" + icvColumnName + ", '')", srcCompTableName, destCompTableName);
    await xcalarFilter(tHandle, "eq(" + icvColumnName + ", '')", srcTableName, destTableName);
    deletePromises.push(_deleteTempTable(srcTableName));
    deletePromises.push(_deleteTempTable(srcCompTableName));
    updateProgress("Progress: 42%", progressCB);

    // Index on Xcalar Row Number PK
    log("Indexing on Xcalar Row Number Primary Key");
    srcTableName = destTableName;
    srcCompTableName = destCompTableName;
    destTableName = genTableName(datasetName + "_index");
    destCompTableName = genTableName(datasetName + "_comp_index");
    await xcalarIndex(
        tHandle,
        srcCompTableName,
        destCompTableName,
        [new XcalarApiKeyT({
            name: xcalarRowNumPkName,
            type: "DfInt64",
            keyFieldName:"",
            ordering:"Unordered"})]
    );
    await xcalarIndex(
        tHandle,
        srcTableName,
        destTableName,
        [new XcalarApiKeyT({
            name: xcalarRowNumPkName,
            type: "DfInt64",
            keyFieldName:"",
            ordering:"Unordered"})]
    );
    deletePromises.push(_deleteTempTable(srcTableName));
    deletePromises.push(_deleteTempTable(srcCompTableName));
    updateProgress("Progress: 55%", progressCB);

    // Project tables...
    log("Projecting columns for table and complements");
    srcTableName = destTableName;
    srcCompTableName = destCompTableName;
    destTableName = genTableName(datasetName + "_project");
    destCompTableName = genTableName(datasetName + "_comp_project");
    await xcalarProject(tHandle,
        complementColumnNames.length, complementColumnNames,
        srcCompTableName, destCompTableName);
    await xcalarProject(tHandle,
        tableColumnNames.length, tableColumnNames,
        srcTableName, destTableName);
    deletePromises.push(_deleteTempTable(srcTableName));
    deletePromises.push(_deleteTempTable(srcCompTableName));
    updateProgress("Progress: 65%", progressCB);

    // at this point we don't rely on fat pointer, so dataset can be dropped
    log("Delete dataset");
    try {
        await Promise.all(deletePromises);
    } catch (e) {
        cosnole.error("delete table fails", e);
    }
    await _cleanupDataset(datasetName);

    // Map on XcalarOpCode and XcalarRankOver
    // TODO: figure out if this is actually needed, I don't think it is?
    srcTableName = destTableName;
    srcCompTableName = destCompTableName;
    destTableName = genTableName(datasetName + "_rankOver");
    destCompTableName = genTableName(datasetName + "_comp_rankOver");
    await xcalarApiMap(tHandle,
        ['XcalarOpCode', 'XcalarRankOver'], ['int(1)', 'int(1)'],
        srcCompTableName, destCompTableName);
    await xcalarApiMap(tHandle,
        ['XcalarOpCode', 'XcalarRankOver'], ['int(1)', 'int(1)'],
        srcTableName, destTableName);
    _deleteTempTable(srcTableName);
    _deleteTempTable(srcCompTableName);
    updateProgress("Progress: 70%", progressCB);

    // Publish tables...
    log("Publishing tables... :)");
    srcTableName = destTableName;
    srcCompTableName = destCompTableName;
    await createPublishTable(srcTableName, finalTableName, false);
    const hasDelete = await createPublishTable(srcCompTableName, finalComplementsName, true);
    log("TABLE CREATED: '" + finalTableName + "'");
    log("COMPLEMENTS CREATED: '" + finalComplementsName + "'");
    _deleteTempTable(srcTableName);
    _deleteTempTable(srcCompTableName);
    updateProgress("Progress: 100%", progressCB);

    return hasDelete;
}

function genTableName(prefix) {
    const rand = Math.floor(Math.random() * 1000 + 1);
    return prefix + "_" + rand;
}

async function createPublishTable(resultSetName, pubTableName, deleteEmpty) {
    await xcalarApiPublish(tHandle, resultSetName, pubTableName);

    let hasDelete = false;
    if (deleteEmpty) {
        hasDelete = await deleteEmptyPbTable(pubTableName);
    }
    if (!hasDelete) {
        _savePublishedTableDataFlow(pubTableName, resultSetName)
    }
    return hasDelete;
}

// XXX TODO: use the one in xiApi.js
// This will save the published table meta in kvstore
// so XD know how to re-create it in batch job
async function _savePublishedTableDataFlow(
    pubTableName,
    resultSetName,
) {
    try {
        const pbTblInfo = new PbTblInfo({name: pubTableName});
        await pbTblInfo.saveDataflow(resultSetName);
        console.log("persisted the dataflow of published table " + pubTableName);
    } catch (e) {
        console.error("persist published table data flow failed", e);
    }
}

// for complement table use only
async function deleteEmptyPbTable(pubTableName) {
    try {
        const res = await XcalarListPublishedTables(pubTableName, false, false);
        for (let i = 0; i < res.tables.length; i++) {
            const table = res.tables[i];
            if (table.name === pubTableName) {
                if (table.numRowsTotal === 0) {
                    log("Delete empty published table");
                    await XcalarUnpublishTable(pubTableName);
                    return true;
                }
                break;
            }
        }
    } catch (e) {
        console.error("deleteEmptyPbTable failed", e);
    }
    return false;
}


async function getNumXpus(){
    // presently the discoverSchema API will process the
    // entire list of paths it is given before returning
    // any results. The API runs inside a Xcalar App and
    // so can do number of XPUs work in parallel. Given
    // this, I would expect the expect the execution time
    // to be the same for any number of files between one
    // and number of XPUs.
    //
    // If more than number of XPUs needs to be sent to
    // discoverSchema, it seems the best option is to
    // make multiple calls. This allows the caller to
    // start processing or displaying the data as soon
    // as possible.
    if (NUMBER_OF_XPUS === null) {
        topOut = await xcalarApiTop(tHandle, XcalarApisConstantsT.XcalarApiDefaultTepIntervalInMs,
            XcalarApisConstantsT.XcalarApiDefaultCacheValidityInMs);
        // I copied this code, it appears that this is just grabbing
        // the core count of node zero? verify/change
        NUMBER_OF_XPUS = topOut.topOutputPerNode[0].numCores;
    }
    return NUMBER_OF_XPUS
}



async function logTables() {
    listTables = await xcalarListTables(tHandle, "*", SourceTypeT.SrcTable);
    console.log("LIST TABLES: " + JSON.stringify(listTables));
}


async function showTableMeta(tablePattern, dataset=null) {
    listTables = await xcalarListTables(tHandle, tablePattern, SourceTypeT.SrcTable);
    //LIST TABLES: {"numNodes":5,"nodeInfo":[{"name":"_tmp-complements-ttuckerds-1","dagNodeId":"897","state":5,"size":0,"api":17,"pinned":false},{"name":"_tmp-table-ttuckerds-0","dagNodeId":"873","state":5,"size":4063232,"api":18,"pinned":false},{"name":"_tmp-complements-ttuckerds-0","dagNodeId":"850","state":5,"size":0,"api":18,"pinned":false},{"name":"_tmp-table-ttuckerds-1","dagNodeId":"924","state":5,"size":4063232,"api":17,"pinned":false},{"name":"ttuckerds-indexed","dagNodeId":"829","state":5,"size":4063232,"api":3,"pinned":false}]}
    listTables.nodeInfo.forEach(async function(info){
        tableMeta = await xcalarGetTableMeta(tHandle, info.name, dataset);
        console.log("TABLE NAME: " + JSON.stringify(info.name) + ", TABLE META: " + JSON.stringify(tableMeta));
    });
}

function getSuccessfulPaths(discoverResponse) {
    const schemas = discoverResponse.getObjectSchemaList();
    const paths = []
    schemas.forEach(function(s) {
        const success = s.getSuccess();
        if (success) {
            paths.push(s.getPath());
        }
    });
    return paths;
}


function getParseArgs(schema, inputSerial, paths) {
    const [moduleName, funcName] = AWS_S3_SELECT_PARSER_NAME.split(":");
    const kvSchema = generateSchemaKeyValue(schema);
    const kvLoad = generateLoadKeyValue(paths);
    const parserArgs = {
        moduleName: moduleName,
        funcName: funcName,
        udfQuery: {
            'load_from_kvstore': true,
            'load_key': kvLoad.key,
            'schema_key': kvSchema.key,
            'input_serialization_args': inputSerial.toString()
        }
    };

    return {
        parserArgs: parserArgs,
        loadStore: createLoadStore({
            kvSchema: kvSchema,
            kvLoad: kvLoad
        })
    };
}

function hashFunc(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

function generateSchemaKeyValue(schema) {
    // This algorithm is not stable, as JSON.stringify doesn't guarantee the field order
    // but it's good enough to generate 'unique' keys
    const prefix = 'LoadWizard/Schema/';
    const value = JSON.stringify(schema);
    return {
        key: `${prefix}${hashFunc(value)}`,
        value: value
    };
}

function generateLoadKeyValue(paths) {
    // This algorithm is not stable, as the result will change when the order of paths changes
    // but it's good enough to generate 'unique' keys
    const prefix = 'LoadWizard/LoadList/';
    const value = JSON.stringify(paths);
    return {
        key: `${prefix}${hashFunc(value)}`,
        value: value
    };
}

function getLastSchema(discoverResponse) {
    const schemas = discoverResponse.getObjectSchemaList();
    let schema = null;
    schemas.forEach(function(s) {
        const success = s.getSuccess();
        if (success) {
            // This is lame
            schema = s.getSchema();
        }
    });
    return schema;
}

function getSchemas(discoverResponse) {
    const schemas = discoverResponse.getObjectSchemaList();
    // const schema = [];
    // schemas.forEach(function(s) {
    //     const success = s.getSuccess();
    //     if (success) {
    //         // This is lame
    //         schema = s.getSchema();
    //     }
    // });
    return schemas;
}

function buildSourceLoadArgs() {
    return [{
        targetName: AWS_TARGET_NAME,
        path: '',
        fileNamePattern: '',
        recursive: false
    }];
}

export async function discoverSchemas(paths, inputSerialization) {
    console.log("discoverSchemas() called");

    // Build Discover Schema Request Object
    var discoverRequest= new proto.xcalar.compute.localtypes.Schema.ListObjectSchemaRequest();
    discoverRequest.setNumObjects(paths.length);
    discoverRequest.setPathsList(paths);

    discoverRequest.setInputSerializationArgs(inputSerialization);

    // Build the XCE Client and Discover Schema
    var client = new Xcrpc.xce.XceClient(xcHelper.getApiUrl());
    var discoverService = new Xcrpc.xce.DiscoverSchemasService(client); // handle failure
    const discoverResponse = await discoverService.discoverSchemas(discoverRequest);

    // console.log("Discover Response: " + discoverResponse);

    return discoverResponse;
}
const discoveredFiles = []
const discoveredFilePathsSet = new Set()
let currentSchemaSuperset


export async function addFileForDiscovery(path, inputSerialization) {
    if (!discoveredFilePathsSet.has(path)) {
        await discoverSingleFile(path, inputSerialization)
        currentSchemaSuperset = supersetSchemas.getSchemas(discoveredFiles);
    }
    console.log(currentSchemaSuperset)
    return currentSchemaSuperset
}

function defaultInputSerialization(path) {
    var inputSerialization = {};
    if (path.toLowerCase().endsWith(".csv")) {
        inputSerialization = {
            // FieldDelimiter hard-coded still as we do not have all the code here
            'CSV': {'FileHeaderInfo': 'USE', 'FieldDelimiter': ','}
        }
    } else if (path.toLowerCase().endsWith(".parquet")) {
        inputSerialization = {
            'Parquet': {}
        }
    } else if (path.toLowerCase().endsWith(".json") || path.toLowerCase().endsWith("*.jsonl")) {
        inputSerialization = {
            'JSON': {'Type' : 'LINES'}
        }
    }
    return inputSerialization;
}

export async function discoverSingleFile(path, inputSerialization) {
    discoveredFilePathsSet.add(path)
    if (!inputSerialization) {
        inputSerialization = defaultInputSerialization(path);
    }
    const inputSerialJson = getInputSerial(inputSerialization);

    const discoverProtoResponse = await discoverSchemas([path], inputSerialJson);
    const discoveredFile = await discoverProtoResponse.getObjectSchemaList()[0].toObject()
    discoveredFiles.push(discoveredFile)
    console.log(discoveredFiles)
}

/**
 *
 * @param {*} tableName
 * @param {[{ path, size }]} paths
 * @param {{ numColumns, columns }} schema
 * @param {*} inputSerial
 * @param {func} progressCB
 */
export async function createTableFromSchema(
    tableName,
    paths,
    schema,
    inputSerial,
    progressCB
) {
    return await createTableAndComplements(paths, schema, inputSerial, tableName, progressCB);
}

function log() {
    if (typeof verbose !== "undefined" && verbose === true) {
        console.log.apply(this, arguments);
    }
}