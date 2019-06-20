describe("sqlRestApi Test", function() {
    const { expect, assert } = require('chai');
    const request = require('request');
    require(__dirname + '/../expServer.js');
    const sqlManager = require(__dirname + '/../controllers/sqlManager.js').default;
    const sqlUser = "xcalar-internal-sql";
    const sqlId = 4193719;
    const sqlWkbk = "xcalar_test_wkbk";
    var planStr;
    let fakeFunc;
    let path;
    let sqlTable;
    let sampleResult;
    let tablePrefix;
    let testSession;
    this.timeout(10000);

    before(function() {
        sqlTable = xcHelper.randName("SQL") + Authentication.getHashId();
        path = __dirname.substring(0, __dirname.lastIndexOf("expServerSpec")) +
               "config/sqlTestDataset";
        sampleResult = {"execid": "0",
                        "schema": [{"R_REGIONKEY": "float"},
                                   {"R_NAME": "string"},
                                   {"_1": "integer"}],
                        "result": [[0, "AFRICA", 1],
                                   [1, "AMERICA", 1],
                                   [2, "ASIA", 1],
                                   [3, "EUROPE", 1],
                                   [4, "MIDDLE EAST", 1]]};
        fakeFunc = function() {
            return PromiseHelper.resolve([]);
        };
        tablePrefix = "XC_TABLENAME_";
        testSession = "testSession_";
    });

    describe("Functional Test", function() {
        // it("sqlManager.generateTablePrefix should work", () => {
        //     const expectedRe = new RegExp(`${sqlUser}_wkbk_${sqlWkbk}_.+_0`);
        //     const ret = sqlManager.generateTablePrefix(sqlUser, sqlWkbk);
        //     expect(expectedRe.test(ret)).to.be.true;
        // })
    });

    describe("Restful API Test", function() {
        // it("Should support /xcsql/list", function(done) {
        //     var oldList = sqlManager.listPublishTables;
        //     sqlManager.fakeListPublishTables(fakeFunc);
        //     var req = {"pattern": "*"};
        //     var data = {
        //         url: 'http://localhost:12224/xcsql/list',
        //         json: req
        //     }
        //     request.post(data, function (err, res, body){
        //         sqlManager.fakeListPublishTables(oldList);
        //         expect(res.statusCode).to.equal(200);
        //         done();
        //     });
        // });
    });
});
