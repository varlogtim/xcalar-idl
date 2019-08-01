const expect = require('chai').expect;
const XcrpcSDK = require('xcalarsdk');
const { ErrorType, status: ErrorStatus } = XcrpcSDK.Error;
const { QueryState } = XcrpcSDK.XcalarEnum;
const { QueryStateFromStr } = XcrpcSDK.EnumMap;

exports.testSuite = function(operatorService) {
    const sdkClient = XcrpcSDK.getClient(XcrpcSDK.DEFAULT_CLIENT_NAME);

    // Random id for the current test
    const testId = Math.floor(Math.random()*90000) + 10000;

    // userName and sessionName for the current test
    const testUserName = "testUserOperator";
    const testSessionName = "testSessionOperator" + testId;

    // dataset helper
    const datasetHelper = createDatasetHelper(sdkClient, testUserName, testSessionName);
    // query helper
    const queryHelper = createQueryHelper(sdkClient, testUserName, testSessionName);

    describe("OperatorService test: ", function() {

        before(async () => {
            try {
                const sessionService = sdkClient.getSessionService();
                const SessionScope = XcrpcSDK.Session.SCOPE;

                await sessionService.create({
                    sessionName: testSessionName,
                    fork: false,
                    forkedSessionName: "",
                    scope: SessionScope.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                await sessionService.activate({
                    sessionName: testSessionName,
                    scope: SessionScope.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
            } catch(e) {
                expect.fail(null, null, `Test preparation failed: ${e}`);
            }
        });

        after(async () => {
            // XXX TODO: delete dataset and session/workbook
        });

        describe("opBulkLoad() test", function() {
            it("Case: w/o loadArgs on existing DS", async () => {
                // Prepare the test dataset
                const testDSName = await datasetHelper.createDS();

                // Call service to activate a DS
                let res = null;
                let error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});
            });

            // XXX TODO: equal to createDataset() ?
            it("Case: with loadArgs on new DS", async () => {
                // Call service to create a DS
                let res = null;
                let error = null;
                try {
                    res = await operatorService.opBulkLoad({
                        datasetName: datasetHelper.genDSName(),
                        loadArgs: datasetHelper.getLoadArgs(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});
            });

            // XXX TODO: Not sure what's the expected behavior, disable for now
            // it("Case: with loadArgs on existing DS", async () => {
            //     // Prepare the test dataset
            //     const testDSName = await datasetHelper.createDS();

            //     // Call service with the same DS name
            //     let res = null;
            //     let error = null;
            //     try {
            //         res = await operatorService.opBulkLoad({
            //             datasetName: testDSName,
            //             loadArgs: datasetHelper.getLoadArgs(),
            //             scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
            //             scopeInfo: {
            //                 userName: testUserName, workbookName: testSessionName
            //             }
            //         });
            //     } catch(e) {
            //         error = e;
            //     }

            //     // Expect error "Dataset name already exists"
            //     expect(error).to.not.be.null;
            //     expect(error.type).to.equal(ErrorType.XCALAR);
            //     expect(error.status).to.equal(ErrorStatus.STATUS_DATASET_NAME_ALREADY_EXISTS);
            // });

            // Activate twice
            it("Case: w/o loadArgs multiple times on existing DS", async () => {
                // Prepare the test dataset
                const testDSName = await datasetHelper.createDS();

                // Call service to activate a DS
                let res = null;
                let error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // No error expected
                expect(error, `error="${JSON.stringify(error)}"`).to.be.null;
                // Result check
                expect(res, "Check result").to.deep.equal({});

                // Call service the second time
                res = null;
                error = null;
                try {
                    const loadDSName = queryHelper.getLoadDSName(testDSName);
                    res = await operatorService.opBulkLoad({
                        datasetName: loadDSName,
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(e) {
                    error = e;
                }

                // Expect error "Dataset name already exists"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_DATASET_NAME_ALREADY_EXISTS);
            });
        });

        describe("export() test", function() {
            let indexTableName;
            before(async () => {
                // Prepare the dataset
                const datasetName = await datasetHelper.createDS();
                // Activate the dataset
                const loadDSName = await queryHelper.activateDataset(datasetName);
                // Prepare the index table from dataset
                indexTableName = await queryHelper.indexDataset(loadDSName);
            });

            it("Case: regular", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {
                            target: 'Default Shared Root',
                            file_path: '/tmp/testOperator.csv',
                            header: true,
                            field_delim: '\t',
                            record_delim: '\n',
                            quote_delim: '"'
                        },
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // No error expected
                expect(error, JSON.stringify(error)).to.be.null;
                // Result should be {}
                expect(res).to.deep.equal({});
            });

            it("Case: no access permission", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {
                            target: 'Default Shared Root',
                            file_path: '/testOperator.csv',
                            header: true,
                            field_delim: '\t',
                            record_delim: '\n',
                            quote_delim: '"'
                        },
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // Expect error "Failed to execute user-defined function/application"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_UDF_EXECUTE_FAILED);
            });

            it("Case: invalid parameter", async () => {
                let error = null;
                let res = null;
                try {
                    res = await operatorService.export({
                        tableName: indexTableName,
                        driverName: 'single_csv',
                        driverParams: {},
                        columns: [{ columnName: 'nation0::N_NATIONKEY', headerName: 'N_NATIONKEY' }],
                        exportName: queryHelper.genTableName(),
                        scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                        scopeInfo: {
                            userName: testUserName, workbookName: testSessionName
                        }
                    });
                } catch(err) {
                    error = err;
                }

                // Expect error "Failed to execute user-defined function/application"
                expect(error).to.not.be.null;
                expect(error.type).to.equal(ErrorType.XCALAR);
                expect(error.status).to.equal(ErrorStatus.STATUS_UDF_EXECUTE_FAILED);
            });
        });
    });

    // Helper factory
    function createQueryHelper(sdkClient, userName, sessionName) {
        let id = 0;
        const tablePrefix = `table_${userName}_${sessionName}`;

        async function indexDataset(loadDSName) {
            const getQueryService = sdkClient.getGetQueryService();
            const queryService = sdkClient.getQueryService();
            const queryList = [];

            // construct index query
            const indexTableName = genTableName();
            const indexQueryString = getQueryService.getIndex(
                loadDSName,
                indexTableName,
                [{
                    name: 'xcalarRecordNum',
                    type: 'DfUnknown',
                    keyFieldName: '',
                    ordering: 'Unordered'
                }],
                'nation', '', false, false
            );
            queryList.push(indexQueryString);

            // Execute query
            const queryName = getQueryName(indexTableName);
            const queryString = `[${queryList.join(',')}]`;
            await queryService.execute({
                queryName: queryName,
                queryString: queryString,
                scope: XcrpcSDK.Query.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: userName,
                    workbookName: sessionName
                }
            });
            // Wait for query done
            if (!await waitForQuery(queryName)) {
                throw new Error('query exec failed');
            }

            return indexTableName;
        }

        async function activateDataset(dsName) {
            const operatorService = sdkClient.getOperatorService();
            const loadDSName = getLoadDSName(dsName);
            await operatorService.opBulkLoad({
                datasetName: loadDSName,
                scope: XcrpcSDK.Operator.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: userName, workbookName: sessionName
                }
            });
            return loadDSName;
        }

        async function waitForQuery(queryName) {
            try {
                let retryCount = 10;
                const duration = 100;

                for (let i = 0; i < retryCount; i ++) {
                    const { done, success } = await checkQueryState(queryName);
                    if (done) {
                        return success;
                    }
                    await waitTimeout(duration);
                }

                return false;
            } catch(e) {
                return false;
            }
        }

        function waitTimeout(duration) {
            return new Promise((resolve) => {
                setTimeout(() => { resolve(); }, duration);
            });
        }

        async function checkQueryState(queryName) {
            try {
                const doneStates = new Set([QueryState.QR_FINISHED, QueryState.QR_ERROR, QueryState.QR_CANCELLED]);
                const successStates = new Set([QueryState.QR_FINISHED]);

                const queryService = sdkClient.getQueryService();
                const queryList = await queryService.list({ namePattern: queryName });
                for (const { name, state } of queryList) {
                    if (name === queryName) {
                        const stateEnum = QueryStateFromStr[state];
                        return { done: doneStates.has(stateEnum), success: successStates.has(stateEnum) };
                    }
                }
                return { done: true, success: false };
            } catch(e) {
                return { done: true, success: false };
            }
        }

        function getLoadDSName(dsName) {
            return `.XcalarDS.${dsName}`;
        }

        function genTableName() {
            return `${tablePrefix}_${id ++}`;
        }

        function getQueryName(tableName) {
            return `query_${tableName}`;
        }

        return {
            activateDataset: (dsName) => activateDataset(dsName),
            indexDataset: (loadDSName) => indexDataset(loadDSName),
            getLoadDSName: (dsName) => getLoadDSName(dsName),
            genTableName: () => genTableName()
        };
    }

    function createDatasetHelper(sdkClient, userName, sessionName) {
        const dsPrefix = `${userName}.${sessionName}.nation`;
        const createDSArgs = {
            sourceArgsList: [{
                targetName: "Default Shared Root",
                path: "/netstore/datasets/tpch_sf1_notrail/nation.tbl",
                fileNamePattern: "",
                recursive: false
            }],
            parseArgs: {
                parserFnName: "default:parseCsv",
                parserArgJson: "{\"recordDelim\":\"\\n\",\"fieldDelim\":\"|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}",
                allowRecordErrors: false,
                allowFileErrors: false,
                fileNameFieldName: "",
                recordNumFieldName: "",
                schema:[
                    { sourceColumn: "N_NATIONKEY", destColumn: "N_NATIONKEY", columnType: 4 },
                    { sourceColumn: "N_NAME", destColumn: "N_NAME", columnType: 1 },
                    { sourceColumn: "N_REGIONKEY", destColumn: "N_REGIONKEY", columnType: 4 },
                    { sourceColumn: "N_COMMENT", destColumn: "N_COMMENT", columnType: 1 }
                ]
            },
            size: 10737418240
        };

        let id = 0;
        function genDSName() {
            return `${dsPrefix}${id ++}`;
        }

        return {
            createDS: async () => {
                const testDSName = genDSName();
                await sdkClient.getDatasetService().create({
                    datasetName: testDSName,
                    loadArgs: createDSArgs,
                    scope: XcrpcSDK.Dataset.SCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: userName,
                        workbookName: sessionName
                    }
                });
                return testDSName;
            },
            getLoadArgs: () => {
                return createDSArgs;
            },
            genDSName: () => genDSName()
        };
    }
}