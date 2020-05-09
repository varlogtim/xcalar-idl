import { randomName, hashFunc } from './sdk/Api'
import { LoadSession } from './sdk/Session'
import { Table } from './sdk/Table'

const {
    Xcrpc,
    xcHelper
} = global;

function getFileExt(fileName) {
    return (fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none').toLowerCase();
}

async function executeSchemaLoadApp(jsonStr) {
    const appRequest = new proto.xcalar.compute.localtypes.SchemaLoad.AppRequest();
    appRequest.setJson(jsonStr);

    const client = new Xcrpc.xce.XceClient(xcHelper.getApiUrl());
    const service = new Xcrpc.xce.SchemaLoadService(client);
    const response = await service.appRun(appRequest);

    try {
        return JSON.parse(response.getJson());
    } catch(_) {
        return {};
    }
}

function createDiscoverAppId({ path, filePattern, inputSerialization }) {
    const randName = randomName();
    // const randName = Date.now();
    const inputHash = hashFunc(path + filePattern + JSON.stringify(inputSerialization));
    return `${inputHash}_${randName}`;
}

function createDiscoverNames(appId) {
    return {
        file: `xl_${appId}_file`,
        schema: `xl_${appId}_schema`,
        report: `xl_${appId}_report`,
        fileSchema: `xl_${appId}_fileschema`,
        // schemaStat: `xl_${appId}_schemastat`,
        kvPrefix: `xl_${appId}_`,
        loadPrefix: `xl_${appId}_load_`,
        compPrefix: `xl_${appId}_comp_`,
        dataPrefix: `xl_${appId}_data_`,
    };
}

const discoverApps = new Map();
function createDiscoverApp({ path, filePattern, inputSerialization, isRecursive = true }) {
    let executionDone = false;
    const tables = {
        file: null, schema: null, report: null,
        fileSchema: null
    };
    let queryIndex = 0;

    const session = new LoadSession();

    const appId = createDiscoverAppId({
        path: path,
        filePattern: filePattern,
        inputSerialization: inputSerialization
    });
    const names = createDiscoverNames(appId);

    function sleep(time) {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve();
            }, time);
        });
    }

    async function waitForTable(tableName, checkInterval) {
        while(!executionDone) {
            await sleep(checkInterval);
            const tables = await session.listTables({ namePattern: tableName });
            if (tables.length > 0) {
                return tables[0];
            }
        }

        const tables = await session.listTables({ namePattern: tableName });
        return tables.length > 0 ? tables[1] : null;
    }

    async function createFileSchemaTable() {
        if (tables.fileSchema != null) {
            return tables.fileSchema;
        }
        if (tables.file == null || tables.schema == null) {
            return null;
        }

        const sql =
            `select
                file.SIZE as SIZE, file.ISDIR as ISDIR, file.NUM as NUM, file.PATH as PATH,
                schema.STATUS as STATUS, schema.SCHEMA as SCHEMA, schema.SCHEMA_HASH as SCHEMA_HASH
            from ${tables.file.getName()} file, ${tables.schema.getName()} schema
            where file.NUM = schema.FILE_NUM`;
        const table = await session.executeSql(sql, names.fileSchema);

        tables.fileSchema = table;
        return table;
    }

    async function deleteTempTables() {
        const tempTablePrefix = '_xl_temp_';
        await session.deleteTables({
            namePattern: `${tempTablePrefix}*`
        });
    }

    function convertFileSchemaRecord(record) {
        const {SIZE, ISDIR, NUM, PATH, STATUS, SCHEMA, SCHEMA_HASH} = record;
        const fileInfo = {
            fileId: NUM,
            fullPath: PATH,
            size: SIZE,
            type: ISDIR ? 'directory' : getFileExt(PATH),
            schema: null
        };

        if (STATUS != null) {
            const schemaInfo = {};
            if (STATUS.toLowerCase() != 'success') {
                schemaInfo.error = STATUS;
            } else {
                schemaInfo.columns = JSON.parse(SCHEMA);
                schemaInfo.hash = SCHEMA_HASH;
            }
            fileInfo.schema = schemaInfo;
        }

        return fileInfo;
    }

    function convertReportRecords(record) {
        const {FILE_COUNT, TOTAL_SIZE, SCHEMA, SCHEMA_HASH} = record;
        return {
            schema: { hash: SCHEMA_HASH, columns: JSON.parse(SCHEMA) },
            files: { count: FILE_COUNT, size: TOTAL_SIZE }
        };
    }

    const app = {
        appId: appId,
        getSession: () => session,
        init: async () => {
            try {
                await session.create();
            } catch(_) {
                // Skip error
            }

            try {
                await session.activate();
            } catch(_) {
                // Skip error
            }
        },
        run: async () => {
            try {
                await deleteTempTables();
                const appInput = {
                    session_name: session.sessionName,
                    func: 'discover_all',
                    path: path,
                    file_name_pattern: filePattern,
                    recursive: isRecursive,
                    input_serial_json: JSON.stringify(inputSerialization),
                    files_table_name: names.file,
                    schema_results_table_name: names.schema,
                    schema_report_table_name: names.report
                };
                console.log('Discover app: ', appInput);
                await executeSchemaLoadApp(JSON.stringify(appInput));
            } finally {
                executionDone = true;
            }
        },
        createResultTables: async ({loadQueryOpt, dataQueryOpt, compQueryOpt, tableNames}) => {
            const loadQuery = JSON.parse(loadQueryOpt).retina;
            await session.executeQueryOptimized({
                queryStringOpt: loadQuery,
                queryName: `q_${appId}_${queryIndex ++}`,
                tableName: tableNames.load,
                params: new Map([['session_name', session.sessionName]])
            });
            const loadTable = new Table({
                session: session,
                tableName: tableNames.load
            })

            try {
                const dataQuery = JSON.parse(dataQueryOpt).retina;
                await session.executeQueryOptimized({
                    queryStringOpt: dataQuery,
                    queryName: `q_${appId}_${queryIndex ++}`,
                    tableName: tableNames.data
                });
                const dataTable = new Table({
                    session: session, tableName: tableNames.data
                });

                const compQuery = JSON.parse(compQueryOpt).retina;
                await session.executeQueryOptimized({
                    queryStringOpt: compQuery,
                    queryName: `q_${appId}_${queryIndex ++}`,
                    tableName: tableNames.comp
                });
                const compTable = new Table({
                    session: session,
                    tableName: tableNames.comp
                });

                return {
                    data: dataTable,
                    comp: compTable
                };
            } finally {
                await loadTable.destroy();
            }
        },
        getCreateTableQuery: async (schemaHash) => {
            await deleteTempTables();
            const tableNames = {
                load: `${names.loadPrefix}${schemaHash}`,
                data: `${names.dataPrefix}${schemaHash}`,
                comp: `${names.compPrefix}${schemaHash}`
            };
            const appInput = {
                session_name: session.sessionName,
                func: 'get_dataflows',
                unique_id: `${names.kvPrefix}${schemaHash}`,
                path: path,
                file_name_pattern: filePattern,
                recursive: isRecursive,
                schema_hash: schemaHash,
                files_table_name: names.file,
                schema_results_table_name: names.schema,
                input_serial_json: JSON.stringify(inputSerialization),
                load_table_name: tableNames.load,
                comp_table_name: tableNames.comp,
                data_table_name: tableNames.data
            };
            console.log('Table query: ', appInput);
            const response = await executeSchemaLoadApp(JSON.stringify(appInput));
            return {
                loadQuery: response.load_df_query_string,
                loadQueryOpt: response.load_df_optimized_query_string,
                dataQuery: response.data_df_query_string,
                dataQueryOpt: response.data_df_optimized_query_string,
                compQuery: response.comp_df_query_string,
                compQueryOpt: response.comp_df_optimized_query_string,
                tableNames: tableNames
            };
        },
        waitForFileTable: async (checkInterval = 200) => {
            tables.file = await waitForTable(names.file, checkInterval);
            return tables.file;
        },
        waitForSchemaTable: async (checkInterval = 200) => {
            tables.schema = await waitForTable(names.schema, checkInterval);
            return tables.schema;
        },
        waitForReportTable: async (checkInterval = 200) => {
            tables.report = await waitForTable(names.report, checkInterval);
            return tables.report;
        },
        cancel: async () => {
            // XXX TODO: Need a real cancel
            executionDone = true;
        },
        getFileSchema: async (page, rowsPerPage) => {
            // Try to create the file-schema joint table
            try {
                await createFileSchemaTable();
            } catch(e) {
                console.error('getFileSchema error: ', e);
            }

            // Source table is either file-schema or file
            const fileSchemaTable =tables.fileSchema || tables.file;
            if (fileSchemaTable == null) {
                return { page: page, count: 0, files: [] };
            }

            // Fetch records from table
            const cursor = fileSchemaTable.createCursor();
            try {
                await cursor.open();
                if (await cursor.position(rowsPerPage * page)) {
                    const files = (await cursor.fetchJson(rowsPerPage)).map((r) => convertFileSchemaRecord(r));
                    return {
                        page: page,
                        count: cursor.getNumRows(),
                        files: files
                    };
                } else {
                    return { page: page, count: 0, files: [] };
                }
            } catch(e) {
                console.error('getFileSchema error: ', e);
            } finally {
                await cursor.close();
            }
        },
        getReport: async (page, rowsPerPage) => {
            const reportTable = tables.report;
            if (reportTable == null) {
                return { page: page, count: 0, schemas: [] };
            }

            // Fetch records from table
            const cursor = reportTable.createCursor();
            try {
                await cursor.open();
                if (await cursor.position(rowsPerPage * page)) {
                    const schemas = (await cursor.fetchJson(rowsPerPage)).map((r) => convertReportRecords(r));
                    return {
                        page: page,
                        count: cursor.getNumRows(),
                        schemas: schemas
                    }
                } else {
                    return { page: page, count: 0, schemas: [] };
                }
            } catch(e) {
                console.error('getReport error: ', e);
            } finally {
                await cursor.close();
            }
        }
    };

    discoverApps.set(appId, app);
    return app;
}

function getDiscoverApp(appId) {
    if (appId == null) {
        return null;
    }
    return discoverApps.get(appId);
}

export { createDiscoverApp, getDiscoverApp }
