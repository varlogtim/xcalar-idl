describe("sqlApiServer Test", function() {
    var chai = require('chai');
    var expect = require('chai').expect;
    // chai.use(require('chai-http'));
    var xc = require(__dirname + '/../../expServer/route/xcalarApiBuilt.js');
    var sqlUser = "xcalar-internal-sql";
    var sqlId = 4193719;
    var args;
    var testSchema;
    var sampleSchema;
    var planStr;
    var fakeFunc;
    var path;
    var sqlTable;
    before(function() {
        sqlTable = xcHelper.randName("SQL") + Authentication.getHashId();
        path = "/home/jyang/xcalar-gui/xcalar-gui/services/test/config/sqlTestDataset";
        args = {};
        args.importTable = xcHelper.randName("importTable") + Authentication.getHashId();
        args.dsArgs = {
            url: path,
            targetName: "Default Shared Root",
            maxSampleSize: 0
        };
        args.formatArgs = {
            format: "JSON"
        };
        args.txId = 1;
        args.sqlDS = xcHelper.randName("sql.12345.ds");

        sampleSchema = [{"R_COMMENT": "string"},
                        {"R_NAME": "string"},
                        {"R_REGIONKEY" : "float"}];
        sampleResult = {"execid": 0,
                        "schema": [{"R_COMMENT": "string"},
                                   {"R_NAME": "string"},
                                   {"R_REGIONKEY" : "float"},
                                   {"_1": "integer"}],
                        "result": [[0, "AFRICA", 1],
                                   [1, "AMERICA", 1],
                                   [2, "ASIA", 1],
                                   [3, "EUROPE", 1],
                                   [4, "MIDDLE EAST", 1]]};
        fakeFunc = function() {
            return PromiseHelper.resolve([]);
        };
        planStr = "[ {\n  \"class\" : \"org.apache.spark.sql.catalyst.plans.logical.Sort\",\n  \"num-children\" : 1,\n  \"order\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.SortOrder\",\n    \"num-children\" : 1,\n    \"child\" : 0,\n    \"direction\" : {\n      \"object\" : \"org.apache.spark.sql.catalyst.expressions.Ascending$\"\n    },\n    \"nullOrdering\" : {\n      \"object\" : \"org.apache.spark.sql.catalyst.expressions.NullsFirst$\"\n    },\n    \"sameOrderExpressions\" : {\n      \"object\" : \"scala.collection.immutable.Set$EmptySet$\"\n    }\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_regionkey\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ] ],\n  \"global\" : true,\n  \"child\" : 0\n}, {\n  \"class\" : \"org.apache.spark.sql.catalyst.plans.logical.Project\",\n  \"num-children\" : 1,\n  \"projectList\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_regionkey\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"r_name\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5487,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"qualifier\" : \"region\"\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.Alias\",\n    \"num-children\" : 1,\n    \"child\" : 0,\n    \"name\" : \"1\",\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 12298,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    },\n    \"explicitMetadata\" : { }\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.Literal\",\n    \"num-children\" : 0,\n    \"value\" : \"1\",\n    \"dataType\" : \"integer\"\n  } ] ],\n  \"child\" : 0\n}, {\n  \"class\" : \"org.apache.spark.sql.execution.LogicalRDD\",\n  \"num-children\" : 0,\n  \"output\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"XC_TABLENAME_" + sqlTable + "\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5485,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_REGIONKEY\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5486,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_NAME\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5487,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"R_COMMENT\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 5488,\n      \"jvmId\" : \"cf0e691c-0a80-4ccf-9f4c-44c9f8b64d61\"\n    }\n  } ] ],\n  \"rdd\" : null,\n  \"outputPartitioning\" : {\n    \"product-class\" : \"org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning\",\n    \"numPartitions\" : 0\n  },\n  \"outputOrdering\" : [ ],\n  \"isStreaming\" : false,\n  \"session\" : null\n} ]\n";
    });

    describe("Functional Test", function() {
        it("Should connect", function(done) {
            xc.connect("localhost:9090", sqlUser, sqlId)
            .then(function() {
                done();
            })
            .fail(function() {
                done("connect failed");
            });
        });

        it("Should goToSqlWkbk", function(done) {
            xc.goToSqlWkbk()
            .then(function() {
                done();
            })
            .fail(function() {
                done("goToSqlWkbk failed");
            })
        });

        it("Should convertToDerivedColAndGetSchema", function(done) {
            // First load datasets
            xc.loadDatasets(args)
            .then(function() {
                return xc.convertToDerivedColAndGetSchema(args.txId,
                                                          args.importTable,
                                                          sqlTable);
            })
            .then(function(schema) {
                testSchema = schema;
                console.log("schema: " + JSON.stringify(schema));
                expect(testSchema).to.deep.equal(sampleSchema);
                done();
            })
            .fail(function(err) {
                console.log("err");
                console.log(err);
                done("convertToDerivedColAndGetSchema failed");
            })
        });

        it("Should load", function(done) {
            var oldConnect = xc.connect;
            var oldLoadDatasets = xc.loadDatasets;
            var oldConvertAndGetSchema = xc.convertToDerivedColAndGetSchema;
            xc.setConnect(fakeFunc);
            xc.setLoadDatasets(fakeFunc);
            xc.setConvertToDerivedColAndGetSchema(fakeFunc);
            xc.sqlLoad(path)
            .then(function(struct) {
                expect(struct).to.have.keys(["tableName", "schema"]);
                done();
            })
            .fail(function() {
                done("loadDatasets failed");
            })
            .always(function() {
                xc.setConnect(oldConnect);
                xc.setLoadDatasets(oldLoadDatasets);
                xc.setConvertToDerivedColAndGetSchema(oldConvertAndGetSchema);
            });
        });

        it("Should compile and run sqlPlan", function() {
            xc.sqlPlan(0, planStr, 5)
            .then(function(res) {
                console.log("result:" + JSON.stringify(res));
                expect(res).to.deep.equal(sampleResult);
                done();
            })
            .fail(function() {
                done("sqlPlan failed");
            });
        });
    });

    // describe("Restful API Test", function(done) {
    //     it("Should support /xcedf/load", function() {
    //         var oldSqlLoad = xc.sqlLoad;
    //         xc.setSqlLoad(fakeFunc);
    //         var req = {"path": "test"};
    //         postRequest("POST", "/xcedf/load", req)
    //         .then(function(ret) {
    //             expect(ret.status).to.equal(200);
    //             done();
    //         })
    //         .fail(function() {
    //             done("fail");
    //         })
    //         .always(function() {
    //             xc.setSqlLoad(oldSqlLoad);
    //         });
    //     });

    //     it.only("Should support /xcedf/query", function(done) {
    //         var oldSqlPlan = xc.sqlPlan;
    //         xc.setSqlPlan(fakeFunc);
    //         var req = {"execid": 0,
    //                    "plan": "test",
    //                    "limit": 5};
    //         chai
    //         .request(server)
    //         .post("/xcedf/query")
    //         .send(req)
    //         .then(function(res) {
    //             expect(ret.status).to.equal(200);
    //             done();
    //         })
    //         .fail(function() {
    //             done("API test /xced/query failed");
    //         })
    //         .always(function() {
    //             xc.setSqlPlan(oldSqlPlan);
    //         });
    //         // postRequest("POST", "/xcedf/query", req)
    //         // .then(function(ret) {
    //         //     expect(ret.status).to.equal(200);
    //         //     done();
    //         // })
    //         // .fail(function() {
    //         //     done("fail");
    //         // })
    //         // .always(function() {
    //         //     xc.setSqlPlan(oldSqlPlan);
    //         // });
    //     });
    // });
});