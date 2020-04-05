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
import * as crypto from 'crypto'

// GLOBAL THINGS...
var AWS_TARGET_NAME = 'AWS Target';
var AWS_S3_SELECT_PARSER_NAME = 'default:parse_s3_select_with_schema';
var NUMBER_OF_XPUS = null;

var icvColumnName = '_X_ICV';
var fileRecordNumColumnName = '_X_FILE_RECORD_NUM';
var dataColumnName = '_X_SOURCE_DATA';
var pathColumnName = '_X_PATH';

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
        var inputSerial = new proto.xcalar.compute.localtypes.SchemaDiscover.InputSerialization();
        inputSerial.setArgs(inputSerialJson);
        return inputSerial;
    } catch (e) {
        console.error("getInputSerial error: ", e);
        throw e;
        // throw "getInputSerial() must be called with an object"
        //       " similar to the following: " + JSON.stringify(InputSerialization);
    }
}

function updateProgress(cb, startProgress, endProgress) {
    if (typeof cb !== "function") {
        return;
    }
    let currentProgress = startProgress;
    let callCb = (progress) => {
        const message = `Progress ${progress}%`;
        cb(message);
    }
    let timer = setInterval(() => {
        if (currentProgress <= endProgress) {
            callCb(currentProgress);
            currentProgress++;
        }
    }, 5000);
    callCb(currentProgress);
    return timer;
}

async function createTableAndComplements(paths, schema, inputSerialObject, tableName, progressCB) {
    /*
     * paths => list of paths to create the data from
     * schema => a schema object returned from a discoverSchema call
     * inputSerialObject => an object similar to the one defined in getInputSerial()
     * tableName => the name of the final table to be created. This function
     *     will also create the complements table, tableName + '_COMPLEMENTS'
     */
    tableName = PTblManager.Instance.getUniqName(tableName.toUpperCase());
    const compName = PTblManager.Instance.getUniqName(tableName + '_COMPLEMENTS');
    try {
        PTblManager.Instance.addLoadingTable(tableName);
        PTblManager.Instance.addLoadingTable(compName);

        const myRandomName = randomName();
        const myDatasetName = 'DS' + myRandomName;
        const inputSerialJson = getInputSerial(inputSerialObject);

        // TODO: Must check to see if PubTables already exist with
        // a given name
        log("createTableAndComplements on session: " + sessionName);

        // make load args for BulkLoad.
        const schemaSet = getSchemaSet(schema);
        const sourceArgs = buildSourceLoadArgsNoKV(paths);
        const parserArgs = getParseArgsNoKV(schema, inputSerialJson);
        const options = {
            sources: sourceArgs,
            ...parserArgs
        };

        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": false
        });

        let hasCreateDataset = false;
        let timer = null;
        try {
            timer = updateProgress(progressCB, 0, 30);
            // await loadStore.save();
            await XcalarDatasetCreate(myDatasetName, options)
            await XcalarDatasetActivate(myDatasetName, txId);
            hasCreateDataset = true;
        } finally {
            // await loadStore.delete();
            clearInterval(timer);
        }
        // do a bunch of table operations
        let hasDeleteComplement = await datasetToTableWithComplements(myDatasetName, schemaSet, tableName, compName, progressCB, txId);
        PTblManager.Instance.removeLoadingTable(tableName);
        PTblManager.Instance.removeLoadingTable(compName);

        PTblManager.Instance.addTable(tableName);
        if (!hasDeleteComplement) {
            PTblManager.Instance.addTable(compName);
        }

        Transaction.done(txId, {
            noNotification: true,
            noCommit: true
        });

        return {
            table: tableName,
            complementTable: hasDeleteComplement ? null : compName
        };
    } catch (e) {
        PTblManager.Instance.removeLoadingTable(tableName);
        PTblManager.Instance.removeLoadingTable(compName);
        throw e;
    }
}

function getSchemaSet(schema) {
    const map = new Map();
    try {
        // type is from https://docs.aws.amazon.com/kinesisanalytics/latest/sqlref/sql-reference-data-types.html
        schema.columns.forEach((schema) => {
            let type = null;
            switch (schema.type) {
                case "BOOLEAN":
                    type = ColumnType.boolean;
                    break;
                case "INTEGER":
                    type = ColumnType.integer;
                    break;
                case "REAL":
                case "DOUBLE":
                    type = ColumnType.float;
                    break;
                default:
                    break;
            }
            map.set(schema.name.toUpperCase(), type);
        });
    } catch (e) {
        console.error(e);
    }
    return map;
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

function _deleteTempTable(tableName, txId) {
    return XcalarDeleteTable(tableName, txId, false, false);
}

async function _cleanupDataset(txId, datasetName) {
    try {
        log("Delete dataset");
        await XIApi.deleteDataset(txId, datasetName, true);
        log("Delete dataset succeed");
        // const datasetList = await XcalarGetDatasets();
        // log("datasetList: " + JSON.stringify(datasetList));
        // {numDatasets: 1, datasets: [ {loadArgs: asdf, datasetId: 123, name: "asdf", ... }]
        // for(let ii = 0; ii < datasetList.datasets.length; ii++) {
        //     if (datasetList.datasets[ii].name.indexOf(datasetName) > 0) {
        //         console.error("Error deleting dataset: " + datasetName);
        //         break;
        //     }
        // }
    } catch (e) {
        console.error("clean up dataset fails", e);
    }
}


async function datasetToTableWithComplements(datasetName, schemaSet, finalTableName, finalComplementsName, progressCB, txId) {
    // this is the function that divides the dataset into the
    // primary and complements table along with the requisite
    // steps to publish both tables.
    //
    // TODO: Should remove tables as they are no longer needed.
    let timer = null;
    let srcTableName = null;
    let destTableName = null;
    let srcCompTableName = null;
    let destCompTableName = null;
    try {
        let datasetInfo = await XcalarGetDatasetsInfo(datasetName);
        log("My Dataset Info: " + JSON.stringify(datasetInfo));
        // Determine the names of our table and complements columns
        let complementColumnNames = [icvColumnName, fileRecordNumColumnName, dataColumnName, pathColumnName];
        const internalTableColumnNames = new Set([pathColumnName]);
        const complementColumnSchema = [];
        const tableColumnNames = [];
        const tableColumnSchema = [];
        const columnSchema = DS.getSchemaMeta(datasetInfo.datasets[0].columns);
        columnSchema.forEach(function(column){
            if (column.type == null || column.type === ColumnType.mixed) {
                if (schemaSet.has(column.name)) {
                    column.type = schemaSet.get(column.name);
                }

                if (!column.type) {
                    column.type = ColumnType.string;
                }
            }
            if (complementColumnNames.includes(column.name)) {
                complementColumnSchema.push(column);
                if (internalTableColumnNames.has(column.name)) {
                    tableColumnNames.push(column.name);
                    tableColumnSchema.push(column);
                }
            } else {
                tableColumnNames.push(column.name);
                tableColumnSchema.push(column);
            }
        });
        log("TABLE COLUMNS: " + JSON.stringify(tableColumnSchema));
        log("COMPLEMENTS COLUMNS: " + JSON.stringify(complementColumnSchema));

        // synthesize Dataset
        log("Synthesize Dataset");
        timer = updateProgress(progressCB, 30, 35);
        const parsedDsName = parseDS(datasetName);
        const colInfos = xcHelper.getColRenameInfosFromSchema(columnSchema);
        destTableName = genTableName(datasetName + "_synthesize");
        await XcalarSynthesize(parsedDsName, destTableName, colInfos, true, txId);

        // Add Xcalar Row Number PK
        log("Adding Xcalar Row Number Primary Keys");
        clearInterval(timer);
        timer = updateProgress(progressCB, 35, 40);
        const xcalarRowNumPkName = "XcalarRankOver";
        srcTableName = destTableName;
        srcCompTableName = destTableName;
        destTableName = genTableName(datasetName + "_rowNum");
        await XcalarGenRowNum(srcTableName, destTableName, xcalarRowNumPkName, txId);

        _deleteTempTable(srcTableName, txId);

        complementColumnNames.push(xcalarRowNumPkName);
        tableColumnNames.push(xcalarRowNumPkName);

        // Filter
        // At this point we need to run two filters to split of the table and it's complements.
        log("Filtering out the table and it's complements");
        clearInterval(timer);
        timer = updateProgress(progressCB, 40, 42);
        srcTableName = destTableName;
        srcCompTableName = destTableName;
        destTableName = genTableName(datasetName + "_filter");
        destCompTableName = genTableName(datasetName + "_comp_filter");
        await XcalarFilter("eq(" + icvColumnName + ", '')", srcTableName, destTableName, txId);
        await XcalarFilter("neq(" + icvColumnName + ", '')", srcCompTableName, destCompTableName, txId);

        _deleteTempTable(srcTableName, txId);

        // Project tables...
        log("Projecting columns for table and complements");
        clearInterval(timer);
        timer = updateProgress(progressCB, 42, 45);
        srcTableName = destTableName;
        srcCompTableName = destCompTableName;
        destTableName = genTableName(datasetName + "_project");
        destCompTableName = genTableName(datasetName + "_comp_project");
        await XcalarProject(tableColumnNames, srcTableName, destTableName, txId);
        await XcalarProject(complementColumnNames, srcCompTableName, destCompTableName, txId);

        _deleteTempTable(srcTableName, txId);
        _deleteTempTable(srcCompTableName, txId);

        // Index on Xcalar Row Number PK
        log("Indexing on Xcalar Row Number Primary Key");
        clearInterval(timer);
        timer = updateProgress(progressCB, 45, 65);
        srcTableName = destTableName;
        srcCompTableName = destCompTableName;
        destTableName = genTableName(datasetName + "_index");
        destCompTableName = genTableName(datasetName + "_comp_index");
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

        _deleteTempTable(srcTableName, txId);
        _deleteTempTable(srcCompTableName, txId);

        // Publish tables...
        log("Publishing tables... :)");
        clearInterval(timer);
        timer = updateProgress(progressCB, 65, 100);
        srcTableName = destTableName;
        srcCompTableName = destCompTableName;
        await createPublishTable(srcTableName, finalTableName, false, txId);
        const hasDelete = await createPublishTable(srcCompTableName, finalComplementsName, true, txId);
        log("TABLE CREATED: '" + finalTableName + "'");
        log("COMPLEMENTS CREATED: '" + finalComplementsName + "'");
        clearInterval(timer);
        timer = updateProgress(progressCB, 100, 100);
        clearInterval(timer);
        _cleanupDataset(txId, datasetName);
        return hasDelete;
    } catch (e) {
        clearInterval(timer);
        try {
            await _deleteTempTable(srcTableName, txId);
            if (srcCompTableName !== srcTableName) {
                await _deleteTempTable(srcCompTableName, txId);
            }
            _cleanupDataset(txId, datasetName);
        } catch (e) {
            console.error(e);
        }
        throw e;
    }
}

function genTableName(prefix) {
    const rand = Math.floor(Math.random() * 1000 + 1);
    return prefix + "_" + rand;
}

async function createPublishTable(resultSetName, pubTableName, deleteEmpty, txId) {
    await XcalarPublishTable(resultSetName, pubTableName, txId);

    let hasDelete = false;
    if (deleteEmpty) {
        hasDelete = await deleteEmptyPbTable(pubTableName);
    }
    if (!hasDelete) {
        await _savePublishedTableDataFlow(pubTableName, resultSetName)
    }
    _deleteTempTable(resultSetName, txId);
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
        log("persisted the dataflow of published table " + pubTableName);
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

/**
 * Get parser args with kvstore solution
 * @param {*} schema
 * @param {*} inputSerial
 * @param {*} paths
 */
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

/**
 * Get parser args w/o kvstore solution
 * @param {*} schema
 * @param {*} inputSerial
 * @param {*} paths
 */
function getParseArgsNoKV(schema, inputSerial) {
    const [moduleName, funcName] = AWS_S3_SELECT_PARSER_NAME.split(":");
    const parserArgs = {
        moduleName: moduleName,
        funcName: funcName,
        udfQuery: {
            'schema': schema,
            'input_serialization': inputSerial.toString()
        }
    };

    return parserArgs;
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

/**
 * Build source args with kvstore solution
 * @param {*} paths
 */
function buildSourceLoadArgs() {
    return [{
        targetName: AWS_TARGET_NAME,
        path: '',
        fileNamePattern: '',
        recursive: false
    }];
}

/**
 * Build source args w/o kvstore solution
 * @param {*} paths
 */
function buildSourceLoadArgsNoKV(paths) {
    return paths.map(({path}) => ({
        targetName: AWS_TARGET_NAME,
        path: path,
        fileNamePattern: '',
        recursive: false
    }));
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