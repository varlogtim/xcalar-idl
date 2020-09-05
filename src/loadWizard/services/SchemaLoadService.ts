import * as Path from 'path'
import { LoadSession, IXcalarSession } from './sdk/Session'
import { Table } from './sdk/Table'
import { Schema, InputSerialization } from './SchemaService'

type ProgressCallback = (progress?: number) => void;

async function executeSchemaLoadApp(jsonStr: string) {
    const response = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSchemaLoadService().appRun(jsonStr);

    try {
        return JSON.parse(response);
    } catch(_) {
        return {};
    }
}

function convertLoadId(loadId: string): string {
    // "LOAD_WIZARD_5F454B190E0DFF06_1599241301_119471
    function randomNumber(numDigits) {
        let result = '';
        for (let i = 0; i < numDigits; i ++) {
            result += Math.floor(Math.random() * 10);
        }
        return result;
    }

    const t = `${Date.now()}`;
    const part1 = t.substr(0, 10);
    const part2 = t.substr(10) + randomNumber(6 - (t.length - 10));

    const list = loadId.split('_');
    list[list.length - 1] = part2;
    list[list.length - 2] = part1;
    return list.join('_');
}

async function createLoadId(session: IXcalarSession) {
    const appInput = {
        func: 'get_load_id',
        session_name: session.sessionName
    };
    const loadId: string = await executeSchemaLoadApp(JSON.stringify(appInput));
    return loadId;
}

function createDiscoverNames(appId) {
    return {
        loadPrefix: `xl_${appId}_load`,
        compPrefix: `xl_${appId}_comp`,
        dataPrefix: `xl_${appId}_data`
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

async function initSession(session) {
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
}

async function initApp() {
    // Load session
    const loadSession = new LoadSession();
    await initSession(loadSession);
    // Load Id
    const loadId = await createLoadId(loadSession);
    // Table names
    const names = createDiscoverNames(loadId);

    return {
        session: loadSession,
        appId: loadId,
        names: names
    };
}

const discoverApps = new Map();
async function createDiscoverApp(params: {
    targetName: string,
}) {
    const { targetName } = params;
    const { appId, session, names } = await initApp();

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

    async function runTableQuery(query, progressCB: ProgressCallback = () => {}) {
        /**
         * Do not delete the result table of each dataflow execution here,
         * or IMD table will persist an incomplete dataflow to its metadata
         * thus table restoration will fail
         */
        const {loadQueryOpt, dataQueryOpt, compQueryOpt, tableNames, loadId} = query;

        // Execute Load DF
        const loadQuery = JSON.parse(loadQueryOpt).retina;
        const loadProgress = updateProgress((p) => progressCB(p), 0, 60);
        try {
            await session.executeQueryOptimized({
                queryStringOpt: loadQuery,
                queryName: `q_${loadId}_load`,
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
                    queryName: `q_${loadId}_data`,
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
                    queryName: `q_${loadId}_comp`,
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
        shareResultTables: async (tables, sharedNames) => {
            const { data: dataName, comp: compName } = sharedNames;

            // Publish data table
            const dataTable = await tables.data.share();

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
                icvTable = await tables.comp.share();
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
        getCreateTableQueryWithSchema: async (param: {
            path: string, filePattern: string,
            inputSerialization: InputSerialization,
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
            loadId: string,
            dataQueryComplete: string,
            compQueryComplete: string
        }> => {
            const { path, filePattern, inputSerialization, schema, numRows = -1, progressCB = () => {} } = param;
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
                const loadId = convertLoadId(appId);
                const names = createDiscoverNames(loadId);
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
                    loadId: loadId,
                    dataQueryComplete: combineQueries(response.load_df_query_string, response.data_df_query_string),
                    compQueryComplete: combineQueries(response.load_df_query_string, response.comp_df_query_string)
                };
            } finally {
                getQueryProgress.stop();
            }
        },
        previewFile: async (params: {
            path: string, filePattern: string,
            inputSerialization: InputSerialization,
            numRows?: number}): Promise<{
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
            const { path, filePattern, inputSerialization, numRows = 20 } = params;
            const appInput = {
                func: 'preview_rows',
                load_id: convertLoadId(appId),
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
