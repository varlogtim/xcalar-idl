const expect = require('chai').expect;
const ProtoTypes = require('xcalar');
const Xcrpc = require('xcalarsdk');
const sleep = require('util').promisify(setTimeout)
exports.testSuite = function(DatasetService) {
    describe("DatasetService test: ", function () {
        this.timeout(60000);
        // XXX TODO: test all DatasetService APIs
        // Need session implemented to access the workbook scope
        const id = Math.floor(Math.random()*90000) + 10000;
        const testUserName = "testUserDataset" + id;
        const testSessionName = "testSessionDataset" + id;
        const testCreateDSName = testUserName + "." +  + ".nation";
        const testCreateDSArgs = {"sourceArgsList":[{"targetName":"Default Shared Root","path":"/netstore/datasets/tpch_sf1_notrail/nation.tbl","fileNamePattern":"","recursive":false}],"parseArgs":{"parserFnName":"default:parseCsv","parserArgJson":"{\"recordDelim\":\"\\n\",\"fieldDelim\":\"|\",\"isCRLF\":false,\"linesToSkip\":1,\"quoteDelim\":\"\\\"\",\"hasHeader\":true,\"schemaFile\":\"\",\"schemaMode\":\"loadInput\"}","allowRecordErrors":false,"allowFileErrors":false,"fileNameFieldName":"","recordNumFieldName":"","schema":[{"sourceColumn":"N_NATIONKEY","destColumn":"N_NATIONKEY","columnType":4},{"sourceColumn":"N_NAME","destColumn":"N_NAME","columnType":1},{"sourceColumn":"N_REGIONKEY","destColumn":"N_REGIONKEY","columnType":4},{"sourceColumn":"N_COMMENT","destColumn":"N_COMMENT","columnType":1}]},"size":10737418240};

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
         });
        it("create() should work", async () => {
            try {
                // creating dataset
                let result = await DatasetService.create({
                    datasetName: testCreateDSName,
                    loadArgs: testCreateDSArgs,
                    scope: Xcrpc.Session.SCOPE.WORKBOOK,
                    scopeInfo: {
                        userName: testUserName,
                        workbookName: testSessionName
                    }
                });
                expect(result.success).to.be.true;
            } catch(err) {
                console.log("create() not work: ", err);
                expect.fail(err);
            }
        });
    });
}