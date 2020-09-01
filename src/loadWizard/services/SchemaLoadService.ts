import * as Path from 'path'
import { randomName, hashFunc } from './sdk/Api'
import { LoadSession } from './sdk/Session'
import { Table } from './sdk/Table'
import { Schema } from './SchemaService'

type ProgressCallback = (progress?: number) => void;

enum DiscoverStatus {
    OK = 0,
    WARNING = 1,
    FAIL = 2
};

const ExceptionAppCancelled = new Error('AppCancel');

function getFileExt(fileName) {
    return (fileName.includes('.')
        ? fileName.split('.').pop()
        : 'none').toLowerCase();
}

async function executeSchemaLoadApp(jsonStr: string) {
    const response = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSchemaLoadService().appRun(jsonStr);

    try {
        return JSON.parse(response);
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
        loadPrefix: `xl_${appId}_load`,
        compPrefix: `xl_${appId}_comp`,
        dataPrefix: `xl_${appId}_data`,
    };
}

function updateProgress(cb: ProgressCallback, startProgress: number, endProgress: number) {
    if (typeof cb !== "function") {
        throw new Error('cb is not a function');
    }
    let currentProgress = startProgress;
    let timer = setInterval(() => {
        if (currentProgress < endProgress - 1) {
            cb(currentProgress);
            currentProgress++;
        } else {
            if (timer != null) {
                clearInterval(timer);
            }
            timer = null;
        }
    }, 5000);
    cb(currentProgress);

    return {
        done: () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
            cb(endProgress);
        },
        stop: () => {
            if (timer != null) {
                clearInterval(timer);
                timer = null;
            }
        }
    };
}

const failedSchemaHash = hashFunc('[]');
function isFailedSchema(schemaHash) {
    return schemaHash === failedSchemaHash;
}

async function callInTransaction<T>(
    operation: string,
    runTask: () => Promise<T>
): Promise<T> {
    const txId = Transaction.start({
        "msg": 'SchemaLoadApp',
        "operation": operation,
        "track": false
    });

    try {
        const returnVal = await runTask();
        Transaction.done(txId);
        return returnVal;
    } catch(e) {
        Transaction.fail(txId);
        throw e;
    }
}

function sleep(time) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}

const discoverApps = new Map();
function createDiscoverApp({ path, filePattern, targetName, inputSerialization, isRecursive = true, isErrorRetry = true }) {
    let executionDone = false;
    let cancelDiscover = false;
    const tables = {
        file: null, schema: null, report: null,
        fileSchema: null
    };

    const session = new LoadSession();

    const appId = createDiscoverAppId({
        path: path,
        filePattern: filePattern,
        inputSerialization: inputSerialization
    });
    const names = createDiscoverNames(appId);

    async function wrapWithCancel(task) {
        if (cancelDiscover) {
            throw ExceptionAppCancelled;
        }
        const result = await task();
        if (cancelDiscover) {
            throw ExceptionAppCancelled;
        }

        return result;
    }

    async function waitForTable(tableName, checkInterval) {
        while(!executionDone) {
            await wrapWithCancel(() => sleep(checkInterval));
            const tables = await wrapWithCancel(() => session.listTables({ namePattern: tableName }));
            if (tables.length > 0) {
                return tables[0];
            }
        }

        const tables = await wrapWithCancel(() => session.listTables({ namePattern: tableName }));
        return tables.length > 0 ? tables[0] : null;
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

    async function createSchemaDetailTable(schemaHash) {
        if (tables.file == null || tables.schema == null) {
            throw new Error('File/Schema table not exists');
        }

        const sql =
            `select
                file.RELPATH as RELPATH, file.PATH as PATH,
                schema.STATUS as STATUS, schema.SCHEMA as SCHEMA, schema.SCHEMA_HASH as SCHEMA_HASH
            from ${tables.file.getName()} file, (
                select * from ${tables.schema.getName()} where SCHEMA_HASH = "${schemaHash}"
            ) schema
            where file.NUM = schema.FILE_NUM`;
        const table = await session.executeSql(sql);
        return table;
    }

    async function getSchemaDetail(schemaHash) {
        const table = await createSchemaDetailTable(schemaHash);
        try {
            const cursor = table.createCursor();
            await cursor.open();

            const result = [];
            let records = await cursor.fetchJson(20);
            while (records.length > 0) {
                for (const record of records) {
                    result.push(convertSchemaDetailRecord(record));
                }
                if (records.length < 20) {
                    break;
                }
                records = await cursor.fetchJson(20);
            }
            return result;
        } finally {
            await table.destroy();
        }
    }

    async function deleteTempTables() {
        const tempTablePrefix = '_xl_temp_';
        await session.deleteTables({
            namePattern: `${tempTablePrefix}*`
        });
    }

    function combineQueries(loadQuery, tableQuery, params = new Map()) {
        // Remove the leading synthesize, which is not necessary in regular execution
        tableQuery = removeSynthesize(tableQuery);

        // Remove export from the query string
        const excludeSet = new Set([
            Xcrpc.EnumMap.XcalarApisToStr[Xcrpc.EnumMap.XcalarApisToInt.XcalarApiExport]
        ]);
        const queryList = JSON.parse(loadQuery).concat(JSON.parse(tableQuery));
        let queryString = JSON.stringify(
            queryList.filter(({ operation }) => !excludeSet.has(operation))
        );

        for (const [key, value] of params) {
            const replacementKey = `<${key}>`;
            queryString = queryString.replace(replacementKey, value);
        }

        return queryString;
    }

    function removeSynthesize(query) {
        const queryList = JSON.parse(query);
        if (queryList.length < 2) {
            return query;
        }
        if (queryList[0].operation === Xcrpc.EnumMap.XcalarApisToStr[Xcrpc.EnumMap.XcalarApisToInt.XcalarApiSynthesize]) {
            const synthesizeOp = queryList.shift();
            queryList[0].args.source = synthesizeOp.args.source;
        }

        return JSON.stringify(queryList);
    }

    function converStatusField(statusStr, numColumns) {
        const { unsupported_columns = [], error_message, stack_trace } = JSON.parse(statusStr);
        const parsedError = numColumns === 0
            ? (error_message == null ? 'All fields cannot be parsed' : error_message)
            : error_message;

        const schemaStatus = {
            statusCode: DiscoverStatus.OK,
            errorColumns: unsupported_columns.map(({ name, mapping, message }) => ({
                name: name, mapping: mapping, message: message
            })),
            message: parsedError,
            stackTrace: stack_trace
        };

        if (parsedError != null) {
            schemaStatus.statusCode = DiscoverStatus.FAIL;
        } else if (unsupported_columns.length > 0) {
            schemaStatus.statusCode = DiscoverStatus.WARNING;
        }

        return schemaStatus;
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
            const { columns } = JSON.parse(SCHEMA);
            const discoverStatus = converStatusField(STATUS, columns.length);
            fileInfo.schema = {
                statusCode: discoverStatus.statusCode,
                error: {
                    columns: discoverStatus.errorColumns,
                    message: discoverStatus.message,
                    stackTrace: discoverStatus.stackTrace
                },
                columns: columns,
                hash: SCHEMA_HASH
            };
        }

        return fileInfo;
    }

    function convertReportRecords(record) {
        const {FILE_COUNT, TOTAL_SIZE, MAX_PATH, SCHEMA, SCHEMA_HASH} = record;
        return {
            schema: { hash: SCHEMA_HASH, columns: JSON.parse(SCHEMA).columns },
            files: { count: FILE_COUNT, size: TOTAL_SIZE, maxPath: MAX_PATH }
        };
    }

    function convertSchemaDetailRecord(record) {
        const { RELPATH, PATH, STATUS, SCHEMA, SCHEMA_HASH} = record;

        const { columns } = JSON.parse(SCHEMA);
        const discoverStatus = converStatusField(STATUS, columns.length);
        return {
            schema: {
                statusCode: discoverStatus.statusCode,
                error: {
                    columns: discoverStatus.errorColumns,
                    message: discoverStatus.message,
                    stackTrace: discoverStatus.stackTrace
                },
                columns: columns,
                hash: SCHEMA_HASH
            },
            file: {
                fullPath: PATH,
                relPath: RELPATH.length
            }
        };
    }

    async function runDiscover() {
        try {
            await deleteTempTables();
            const appInput = {
                session_name: session.sessionName,
                user_name: session.user.getUserName(),
                user_id: session.user.getUserId(),
                func: 'discover_all',
                path: path,
                file_name_pattern: filePattern,
                recursive: isRecursive,
                input_serial_json: JSON.stringify(inputSerialization),
                retry_on_error: isErrorRetry,
                files_table_name: names.file,
                schema_results_table_name: names.schema,
                schema_report_table_name: names.report
            };
            console.log('Discover app: ', appInput);
            await wrapWithCancel(() => executeSchemaLoadApp(JSON.stringify(appInput)));
        } finally {
            executionDone = true;
        }
    }

    async function runTableQuery(query, progressCB: ProgressCallback = () => {}) {
        /**
         * Do not delete the result table of each dataflow execution here,
         * or IMD table will persist an incomplete dataflow to its metadata
         * thus table restoration will fail
         */
        const {loadQueryOpt, dataQueryOpt, compQueryOpt, tableNames} = query;

        // Execute Load DF
        const loadQuery = JSON.parse(loadQueryOpt).retina;
        const loadProgress = updateProgress((p) => progressCB(p), 0, 60);
        try {
            await session.executeQueryOptimized({
                queryStringOpt: loadQuery,
                queryName: `q_${appId}_load`,
                tableName: tableNames.load,
                params: new Map([
                    ['session_name', session.sessionName],
                    ['user_name', session.user.getUserName()]
                ])
            });
            loadProgress.done();
        } finally {
            loadProgress.stop();
        }
        const loadTable = new Table({
            session: session,
            tableName: tableNames.load
        });

        try {
            // Execute Data DF
            const dataQuery = JSON.parse(dataQueryOpt).retina;
            const dataProgress = updateProgress((p) => progressCB(p), 60, 80);
            try {
                await session.executeQueryOptimized({
                    queryStringOpt: dataQuery,
                    queryName: `q_${appId}_data`,
                    tableName: tableNames.data
                });
                dataProgress.done();
            } finally {
                dataProgress.stop();
            }
            const dataTable = new Table({
                session: session, tableName: tableNames.data
            });

            // Execute ICV DF
            const compQuery = JSON.parse(compQueryOpt).retina;
            const compProgress = updateProgress((p) => progressCB(p), 80, 99);
            try {
                await session.executeQueryOptimized({
                    queryStringOpt: compQuery,
                    queryName: `q_${appId}_comp`,
                    tableName: tableNames.comp
                });
                compProgress.done();
            } finally {
                compProgress.stop();
            }
            const compTable = new Table({
                session: session,
                tableName: tableNames.comp
            });

            // Delete Load XDB but keep lineage
            await loadTable.destroy({ isCleanLineage: false });

            // Return the session tables created from those 3 DFs
            return {
                data: dataTable,
                comp: compTable,
                load: loadTable
            };
        } finally {
            progressCB(100);
        }
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
            return await callInTransaction('Discovery', () => runDiscover());
        },
        shareResultTables: async (tables, sharedNames) => {
            const { data: dataName, comp: compName } = sharedNames;
            // const { dataQueryComplete = '[]', compQueryComplete = '[]' } = dataflows || {};

            // Publish data table
            // await tables.data.rename({ newName: dataName });
            const dataTable = await tables.data.share();
            // await tables.data.publishWithQuery(dataName, JSON.parse(dataQueryComplete));

            // Check if comp table is empty
            let compHasData = false;
            const cursor = tables.comp.createCursor(false);
            try {
                await cursor.open();
                if (cursor.getNumRows() > 0) {
                    compHasData = true;
                }
            } finally {
                cursor.close();
            }

            // Publish comp table
            let icvTable = null;
            if (compHasData) {
                // await tables.comp.rename({ newName: compName });
                icvTable = await tables.comp.share();
                // await tables.comp.publishWithQuery(compName, JSON.parse(compQueryComplete));
            }

            return {
                data: dataTable,
                icv: icvTable
            };
        },
        publishResultTables: async (tables, pubNames, dataflows) => {
            const { data: dataName, comp: compName } = pubNames;
            const { dataQueryComplete = '[]', compQueryComplete = '[]' } = dataflows || {};

            // Publish data table
            await tables.data.publishWithQuery(dataName, JSON.parse(dataQueryComplete));

            // Check if comp table is empty
            let compHasData = false;
            const cursor = tables.comp.createCursor(false);
            try {
                await cursor.open();
                if (cursor.getNumRows() > 0) {
                    compHasData = true;
                }
            } finally {
                cursor.close();
            }

            // Publish comp table
            if (compHasData) {
                await tables.comp.publishWithQuery(compName, JSON.parse(compQueryComplete));
            }

            return compHasData;
        },
        createResultTables: async (query, progressCB: ProgressCallback = () => {}) => {
            return await callInTransaction('Create tables', () => runTableQuery(query, progressCB));
        },
        getCreateTableQuery: async (
            schemaHash: string,
            progressCB: ProgressCallback = () => {}
        ): Promise<{
            loadQuery:string,
            loadQueryOpt: string,
            dataQuery: string,
            dataQueryOpt: string,
            compQuery: string,
            compQueryOpt: string,
            tableNames: {
                load: string, data: string, comp: string
            },
            dataQueryComplete: string,
            compQueryComplete: string
        }> => {
            const delProgress = updateProgress((p) => {
                progressCB(p);
            }, 0, 10);
            try {
                await deleteTempTables();
                delProgress.done();
            } finally {
                delProgress.stop();
            }

            const getQueryProgress = updateProgress((p) => {
                progressCB(p);
            }, 10, 100);
            try {
                const tableNames = {
                    load: `${names.loadPrefix}_${schemaHash}`,
                    data: `${names.dataPrefix}_${schemaHash}`,
                    comp: `${names.compPrefix}_${schemaHash}`
                };
                const appInput = {
                    session_name: session.sessionName,
                    user_name: session.user.getUserName(),
                    user_id: session.user.getUserId(),
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
                getQueryProgress.done();

                // XXX TODO: Remove once load app leverages runtime generated UDF to pass file/schema list to bulkLoad
                const params = new Map([
                    ['session_name', session.sessionName],
                    ['user_name', session.user.getUserName()]
                ]);
                return {
                    loadQuery: combineQueries(response.load_df_query_string, '[]'),
                    loadQueryOpt: response.load_df_optimized_query_string,
                    dataQuery: combineQueries(response.data_df_query_string, '[]'),
                    dataQueryOpt: response.data_df_optimized_query_string,
                    compQuery: combineQueries(response.comp_df_query_string, '[]'),
                    compQueryOpt: response.comp_df_optimized_query_string,
                    tableNames: tableNames,
                    dataQueryComplete: combineQueries(response.load_df_query_string, response.data_df_query_string, params),
                    compQueryComplete: combineQueries(response.load_df_query_string, response.comp_df_query_string, params)
                };
            } finally {
                getQueryProgress.stop();
            }
        },
        getCreateTableQueryWithSchema: async (param: {
            schema: Schema,
            numRows?: number,
            progressCB?: ProgressCallback
        }): Promise<{
            loadQuery:string,
            loadQueryOpt: string,
            dataQuery: string,
            dataQueryOpt: string,
            compQuery: string,
            compQueryOpt: string,
            tableNames: {
                load: string, data: string, comp: string
            },
            dataQueryComplete: string,
            compQueryComplete: string
        }> => {
            const { schema, numRows = -1, progressCB = () => {} } = param;
            const delProgress = updateProgress((p) => {
                progressCB(p);
            }, 0, 10);
            try {
                await deleteTempTables();
                delProgress.done();
            } finally {
                delProgress.stop();
            }

            const getQueryProgress = updateProgress((p) => {
                progressCB(p);
            }, 10, 100);
            try {
                const schemaJsonStr = JSON.stringify(schema);
                const tableNames = {
                    load: names.loadPrefix,
                    data: names.dataPrefix,
                    comp: names.compPrefix
                };
                const appInput = {
                    func: 'get_dataflows_with_schema',
                    session_name: session.sessionName,
                    source_args_json: JSON.stringify([{
                        targetName: targetName,
                        path: Path.join(path, '/'),
                        fileNamePattern: filePattern,
                        recursive: false
                    }]),
                    input_serial_json: JSON.stringify(inputSerialization),
                    schema_json: schemaJsonStr,
                    num_rows: numRows > 0 ? numRows : null,
                    load_table_name: tableNames.load,
                    comp_table_name: tableNames.comp,
                    data_table_name: tableNames.data
                };
                console.log('get_dataflows_with_schema: ', appInput);
                const response = await executeSchemaLoadApp(JSON.stringify(appInput));
                getQueryProgress.done();

                return {
                    loadQuery: combineQueries(response.load_df_query_string, '[]'),
                    loadQueryOpt: response.load_df_optimized_query_string,
                    dataQuery: combineQueries(response.data_df_query_string, '[]'),
                    dataQueryOpt: response.data_df_optimized_query_string,
                    compQuery: combineQueries(response.comp_df_query_string, '[]'),
                    compQueryOpt: response.comp_df_optimized_query_string,
                    tableNames: tableNames,
                    dataQueryComplete: combineQueries(response.load_df_query_string, response.data_df_query_string),
                    compQueryComplete: combineQueries(response.load_df_query_string, response.comp_df_query_string)
                };
            } finally {
                getQueryProgress.stop();
            }
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
            if (!executionDone) {
                cancelDiscover = true;
            }
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
                throw e;
            } finally {
                await cursor.close();
            }
        },
        getReport: async (page, rowsPerPage) => {
            const reportTable = tables.report;
            if (reportTable == null) {
                console.log('getReport: table not ready');
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
                    console.log(`getReport: out of range(${rowsPerPage * page}, ${cursor.getNumRows()})`);
                    return { page: page, count: 0, schemas: [] };
                }
            } catch(e) {
                console.error('getReport error: ', e);
                throw e;
            } finally {
                await cursor.close();
            }
        },
        getDiscoverError: async () => {
            const files = await getSchemaDetail(failedSchemaHash);
            return files.map(({ schema, file }) => ({
                fullPath: file.fullPath, relPath: file.relPath, error: schema.error
            }));
        },
        getSchemaDetail: async (schemaHash) => {
            const result = {
                hash: schemaHash,
                columns: [],
                files: []
            };
            const files = await getSchemaDetail(schemaHash);
            if (files.length > 0) {
                for (const column of files[0].schema.columns) {
                    result.columns.push({...column});
                }
            }
            for (const { file } of files) {
                result.files.push({ ...file });
            }

            return result;
        },
        getDiscoverSuccessStats: async function() {
            const table = await createDiscoverSuccessTable();
            try {
                const cursor = table.createCursor();
                await cursor.open();

                const result = {
                    numFiles: 0, numSchemas: 0
                };
                let records = await cursor.fetchJson(1);
                if (records.length > 0) {
                    const record = records[0];
                    result.numFiles = record['NUM_FILES'] || 0;
                    result.numSchemas = record['NUM_SCHEMAS'] || 0;
                }
                return result;
            } finally {
                await table.destroy();
            }

            async function createDiscoverSuccessTable() {
                if (tables.report == null) {
                    throw new Error('Report table not exists');
                }

                const sql =
                    `select
                        SUM(FILE_COUNT) AS NUM_FILES, COUNT(SCHEMA_HASH) AS NUM_SCHEMAS
                    from ${tables.report.getName()}
                    where SCHEMA_HASH <> '${failedSchemaHash}'`;
                const table = await session.executeSql(sql);
                return table;
            }
        },
        getDiscoverFailStats: async function() {
            const table = await createDiscoverFailTable();
            try {
                const cursor = table.createCursor();
                await cursor.open();

                const result = {
                    numFiles: 0, numSchemas: 0
                };
                let records = await cursor.fetchJson(1);
                if (records.length > 0) {
                    const record = records[0];
                    result.numFiles = record['NUM_FILES'] || 0;
                    result.numSchemas = record['NUM_SCHEMAS'] || 0;
                }
                return result;
            } finally {
                await table.destroy();
            }

            async function createDiscoverFailTable() {
                if (tables.report == null) {
                    throw new Error('Report table not exists');
                }

                const sql =
                    `select
                        SUM(FILE_COUNT) AS NUM_FILES, COUNT(SCHEMA_HASH) AS NUM_SCHEMAS
                    from ${tables.report.getName()}
                    where SCHEMA_HASH = '${failedSchemaHash}'`;
                const table = await session.executeSql(sql);
                return table;
            }
        },
        previewFile: async (numRows: number = 20): Promise<{
            status: { errorMessage?: string },
            lines: Array<{
                data: any,
                schema: Schema | {},
                status: {
                    hasError: boolean,
                    errorMessage: string,
                    unsupportedColumns: Array<{
                        message: string,
                        name: string,
                        mapping: string
                    }>
                }
            }>
        }> => {
            const appInput = {
                func: 'preview_rows',
                session_name: session.sessionName,
                target_name: targetName,
                path: Path.join(path, filePattern),
                input_serial_json: JSON.stringify(inputSerialization),
                num_rows: numRows
            };
            console.log('App.perfileFile: ', appInput);

            const { rows = [], schemas = [], statuses = [], global_status = {} } = await executeSchemaLoadApp(JSON.stringify(appInput));

            return {
                status: { errorMessage: global_status.error_message },
                lines: rows.map((line, i) => {
                    const schema = schemas[i];
                    const status = statuses[i] || { error_message: null, unsupported_columns: [] };
                    return {
                        data: line,
                        schema: schema || {},
                        status: {
                            hasError: status.unsupported_columns.length > 0,
                            errorMessage: status.error_message,
                            unsupportedColumns: status.unsupported_columns.map(({message, name, mapping}) => ({
                                message: message, name: name, mapping: mapping
                            }))
                        }
                    };
                })
            };
        }
    };

    // discoverApps.set(appId, app);
    return app;
}

function getDiscoverApp(appId) {
    if (appId == null) {
        return null;
    }
    return discoverApps.get(appId);
}

export { createDiscoverApp, getDiscoverApp, isFailedSchema, DiscoverStatus, ExceptionAppCancelled }
