describe("sqlRestApi Test", function() {
    var expect = require('chai').expect;
    var request = require('request');
    var expServer = require(__dirname + '/../../expServer/expServer.js');
    var sql = require(__dirname + '/../../expServer/route/sqlRestApi.js');
    var sqlUser = "xcalar-internal-sql";
    var sqlId = 4193719;
    var planStr;
    var fakeFunc;
    var path;
    var sqlTable;
    var sampleResult;
    var tablePrefix;
    var testSession;
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
        it("Should load dataset and run query", function(done) {
            var publishName;
            sql.sqlLoad(path)
            .then(function(struct) {
                expect(struct).to.have.keys(["tableName", "schema"]);
                for (var i = 0; i < struct.schema.length; i++) {
                    if (publishName) {
                        break;
                    }
                    var schema = struct.schema[i];
                    for (var key in schema) {
                        if (key.startsWith(tablePrefix)) {
                            publishName = key.substring(tablePrefix.length);
                            break;
                        }
                    }
                }
                planStr = "[{\n  \"class\" : \"org.apache.spark.sql.catalyst.plans.logical.Sort\",\n  \"num-children\" : 1,\n  \"order\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.SortOrder\",\n    \"num-children\" : 1,\n    \"child\" : 0,\n    \"direction\" : {\n      \"object\" : \"org.apache.spark.sql.catalyst.expressions.Ascending$\"\n    },\n    \"nullOrdering\" : {\n      \"object\" : \"org.apache.spark.sql.catalyst.expressions.NullsFirst$\"\n    },\n    \"sameOrderExpressions\" : {\n      \"object\" : \"scala.collection.immutable.Set$EmptySet$\"\n    }\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_regionkey\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ] ],\n  \"global\" : true,\n  \"child\" : 0\n}, {\n  \"class\" : \"org.apache.spark.sql.catalyst.plans.logical.Project\",\n  \"num-children\" : 1,\n  \"projectList\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_regionkey\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_name\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5487,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.Alias\",\n    \"num-children\" : 1,\n    \"child\" : 0,\n    \"name\" : \"1\",\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 12298,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"explicitMetadata\" : { }\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.Literal\",\n    \"num-children\" : 0,\n    \"value\" : \"1\",\n    \"dataType\" : \"integer\"\n  } ] ],\n  \"child\" : 0\n}, {\n  \"class\" : \"org.apache.spark.sql.execution.LogicalRDD\",\n  \"num-children\" : 0,\n  \"output\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"" + tablePrefix + publishName + "\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5485,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_REGIONKEY\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_NAME\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5487,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_COMMENT\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5488,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ] ],\n  \"rdd\" : null,\n  \"outputPartitioning\" : {\n    \"product-class\" : \"org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning\",\n    \"numPartitions\" : 0\n  },\n  \"outputOrdering\" : [ ],\n  \"isStreaming\" : false,\n  \"session\" : null\n} ]\n";
                return sql.sqlPlan("0", planStr, "5", testSession, 200);
            })
            .then(function(res) {
                console.log("result:" + JSON.stringify(res));
                expect(res).to.deep.equal(sampleResult);
                return sql.cleanAllTables([publishName, testSession], 200);
            })
            .then(function() {
                done();
            })
            .fail(function(err) {
                console.log(JSON.stringify(err));
                done("load & query failed");
            });
        });

        it("Should list all published tables", function(done) {
            sql.listPublishTables("sqltest")
            .then(function(res) {
                expect(res).to.deep.equal([]);
                done();
            })
            .fail(function() {
                done("fail");
            });
        });
    });

    describe("Restful API Test", function() {
        it("Should support /xcedf/load", function(done) {
            var oldLoad = sql.sqlLoad;
            sql.fakeSqlLoad(fakeFunc);
            var req = {"path": "test"};
            var data = {
                url: 'http://localhost:12125/xcedf/load',
                json: req
            }
            request.post(data, function (err, res, body){
                sql.fakeSqlLoad(oldLoad);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });
        it("Should support /xcedf/select", function(done) {
            var oldSelect = sql.sqlSelect;
            sql.fakeSqlSelect(fakeFunc);
            var req = {"names": '["test"]',
                       "sessionId": "testSession",
                       "cleanup": "true",
                       "checkTime": 100};
            var data = {
                url: 'http://localhost:12125/xcedf/select',
                json: req
            }
            request.post(data, function (err, res, body){
                sql.fakeSqlSelect(oldSelect);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it("Should support /xcedf/query", function(done) {
            var oldSqlPlan = sql.sqlPlan;
            sql.fakeSqlPlan(fakeFunc);
            var req = {"execid": "0",
                       "plan": "test",
                       "limit": "5",
                       "sessionId": "testSession",
                       "checkTime": "100"};
            var data = {
                url: 'http://localhost:12125/xcedf/query',
                json: req
            }
            request.post(data, function (err, res, body){
                sql.fakeSqlPlan(oldSqlPlan);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it("Should support /xcedf/list", function(done) {
            var oldList = sql.listPublishTables;
            sql.fakeListPublishTables(fakeFunc);
            var req = {"pattern": "*"};
            var data = {
                url: 'http://localhost:12125/xcedf/list',
                json: req
            }
            request.post(data, function (err, res, body){
                sql.fakeListPublishTables(oldList);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it("Should support /xcedf/clean", function(done) {
            var oldClean = sql.cleanAllTables;
            sql.fakeCleanAllTables(fakeFunc);
            var req = {"type": 'all',
                       "sessionId": "testSession",
                       "checkTime": 100};
            var data = {
                url: 'http://localhost:12125/xcedf/clean',
                json: req
            }
            request.post(data, function (err, res, body){
                sql.fakeCleanAllTables(oldClean);
                expect(res.statusCode).to.equal(200);
                done();
            });
        });
    });
});