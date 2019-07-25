const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const Xcrpc = require('xcalarsdk');
const sleep = require('util').promisify(setTimeout)
exports.testSuite = function(DagNodeService, DAGSCOPE) {
    describe("DagNodeService test: ", function () {
        this.timeout(60000);
        // XXX TODO: test all DagNodeService APIs
        // Need session implemented to access the workbook scope
        const testUserName = "testUserSession";
        const testSessionName = "testSessionSession";
        const testCreateDSName = testUserName + "." + (Math.floor(Math.random()*90000) + 10000) + ".nation";
        const testCreateDSArgs = {"sourceArgsList":[{"targetName":"Default Shared Root","path":"/netstore/datasets/tpch_sf1_notrail/nation.tbl","fileNamePattern":"","recursive":false}],"parseArgs":{"parserFnName":"default:parseCsv","parserArgJson":"{\"recordDelim\":\"\\n\",\"fieldDelim\":\"|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}","allowRecordErrors":false,"allowFileErrors":false,"fileNameFieldName":"","recordNumFieldName":"","schema":[{"sourceColumn":"N_NATIONKEY","destColumn":"N_NATIONKEY","columnType":4},{"sourceColumn":"N_NAME","destColumn":"N_NAME","columnType":1},{"sourceColumn":"N_REGIONKEY","destColumn":"N_REGIONKEY","columnType":4},{"sourceColumn":"N_COMMENT","destColumn":"N_COMMENT","columnType":1}]},"size":10737418240};
        const testLoadArgs = '{"sourceArgsList":null,"parseArgs":null,"size":null}';
        const testLoadDSName = ".XcalarDS." + testCreateDSName;
        const testQueryName = "testXcalarQuery1";
        const testTableName = "table_DF2_5D324A043B307F6D_1563577542673_0_dag_5D324A043B307F6D_1563930449950_37#t_1563930487120_0";
        const testXcalarQuery = '[{"operation":"XcalarApiIndex","args":{"source":"' + testLoadDSName + '","dest":"' + testTableName + '","key":[{"name":"xcalarRecordNum","type":"DfUnknown","keyFieldName":"","ordering":"Unordered"}],"prefix":"nation","dhtName":"","delaySort":false,"broadcast":false},"tag":"dag_5D324A043B307F6D_1563930449950_37"}]';

        before(async () => {
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSessionService().create({
                sessionName: testSessionName,
                fork: false,
                forkedSessionName: "",
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSessionService().activate({
                sessionName: testSessionName,
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getDatasetService().create({
                datasetName: testCreateDSName,
                loadArgs: testCreateDSArgs,
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getOperatorService().opBulkLoad({
                datasetName: testLoadDSName,
                loadArgs: JSON.parse(testLoadArgs),
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getQueryService().execute({
                queryName: testQueryName,
                queryString: testXcalarQuery,
                scope: Xcrpc.Session.SCOPE.WORKBOOK,
                scopeInfo: {
                    userName: testUserName,
                    workbookName: testSessionName
                }
            });
            await sleep(2000);
         });
        it("delete() should work", async () => {
            try {
                // deleting table
                let result = await DagNodeService.delete({
                    namePattern: testTableName,
                    srcType: 2, //SourceTypeT.SrcTable
                    deleteCompletely: true,
                    dagScope: DAGSCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result.numNodes).to.equal(1);
                let statuses = result.statuses;
                expect(statuses.length === 1);
                expect(statuses[0].status).to.equal(0);
                expect(statuses[0].nodeInfo.name).to.equal(testTableName);
            } catch(err) {
                console.log("delete() not work: ", err);
                expect.fail(err);
            }
        });
    });
}