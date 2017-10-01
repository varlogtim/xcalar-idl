// var url = "http://host:12130";
var url = "http://skywalker.int.xcalar.com:12130"

function sqlLoad() {
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": {
            "path": "file:///netstore/datasets/yelp/user/"
        },
        "url": url + "/xcedf/load",
    });
}

function sqlPlan() {
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": {
            "execid": 1,
            "plan": '[ {\n  \"class\" : \"org.apache.spark.sql.catalyst.plans.logical.Filter\",\n  \"num-children\" : 1,\n  \"condition\" : [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.And\",\n    \"num-children\" : 2,\n    \"left\" : 0,\n    \"right\" : 1\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.IsNotNull\",\n    \"num-children\" : 1,\n    \"child\" : 0\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"REVIEW_COUNt\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2420,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    },\n    \"qualifier\" : \"yelp\"\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.GreaterThan\",\n    \"num-children\" : 2,\n    \"left\" : 0,\n    \"right\" : 1\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"REVIEW_COUNt\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2420,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    },\n    \"qualifier\" : \"yelp\"\n  }, {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.Literal\",\n    \"num-children\" : 0,\n    \"value\" : \"10.0\",\n    \"dataType\" : \"double\"\n  } ],\n  \"child\" : 0\n}, {\n  \"class\" : \"org.apache.spark.sql.execution.LogicalRDD\",\n  \"num-children\" : 0,\n  \"output\" : [ [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"USER_ID\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2417,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"AVERAGE_STARS\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2418,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"TYPE\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2419,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"REVIEW_COUNT\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2420,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"YELPING_SINCE\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2421,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"NAME\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2422,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"FANS\",\n    \"dataType\" : \"double\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2423,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ], [ {\n    \"class\" : \"org.apache.spark.sql.catalyst.expressions.AttributeReference\",\n    \"num-children\" : 0,\n    \"name\" : \"XC_TABLENAME_SQL24323#QW7\",\n    \"dataType\" : \"string\",\n    \"nullable\" : true,\n    \"metadata\" : { },\n    \"exprId\" : {\n      \"product-class\" : \"org.apache.spark.sql.catalyst.expressions.ExprId\",\n      \"id\" : 2424,\n      \"jvmId\" : \"f370555c-76b6-49ec-b750-4949a5aa5fd4\"\n    }\n  } ] ],\n  \"rdd\" : null,\n  \"outputPartitioning\" : {\n    \"product-class\" : \"org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning\",\n    \"numPartitions\" : 0\n  },\n  \"outputOrdering\" : [ ],\n  \"session\" : null\n} ]',
        },
        "url": url + "/xcedf/query",
    });
}

function connect() {
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": {
            "user": "cheng", // type in userIdName in browser console to get the name
            "id": 4563573    // type in userIdUnique in browser console to get the id
        },
        "url": url + "/connect",
    });
}

function listTables() {
    return $.ajax({
        "type": "GET",
        "url": url + "/listTables"
    });
}

function getRows(data) {
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": data,
        "url": url + "/getRows"
    });
}

function query(data) {
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": data,
        "url": url + "/query"
    });
}

function groupBy(args) {
    args = JSON.stringify(args);
    return $.ajax({
        "type": "POST",
        "Content-Type": "application/json",
        "data": {"args": args},
        "url": url + "/groupBy"
    });
}

function queryTest() {
    var srcTableName;
    var dstTableName;

    connect()
    .then(function() {
        console.log("connected");
        return listTables();
    })
    .then(function(res) {
        console.log("list tables", res);
        // find a table that starts with test
        for (var i = 0; i < res.nodeInfo.length; i++) {
            var tableName = res.nodeInfo[i].name;
            if (tableName.includes("test")) {
                srcTableName = tableName;
                break;
            }
        }
        // srcTableName = "test#RX3967";
        dstTableName = "dstTable" + Math.floor(Math.random() * 1000) + 1;
        return query({
            "srcTableName": srcTableName,
            "dstTableName": dstTableName
        });
    })
    .then(function() {
        return getRows({
            "tableName": dstTableName,
            "startRowNum": 1,
            "rowsToFetch": 10
        });
    })
    .then(function(res) {
        console.log("fetch rows", res);
    })
    .fail(function(error) {
        console.log("error", error);
    });
}

function groupByTest() {
    var srcTableName;
    var dstTableName;

    connect()
    .then(function() {
        console.log("connected");
        return listTables();
    })
    .then(function(res) {
        console.log("list tables", res);
        // find a table that starts with airports
        for (var i = 0; i < res.nodeInfo.length; i++) {
            var tableName = res.nodeInfo[i].name;
            if (tableName.includes("airports")) {
                srcTableName = tableName;
                break;
            }
        }
        dstTableName = "dstTable" + Math.floor(Math.random() * 1000) + 1;
        return groupBy({
            "operator": "Avg",
            "aggColName": "lat",
            "gbArgs": [{
                "operator": "Avg",
                "aggColName": "lat",
                "newColName": "lat_avg",
            }, {
                "operator": "Count",
                "aggColName": "airports::state",
                "newColName": "state_count",
            }],
            "groupByCols": ["state"],
            "tableName": srcTableName,
            "newTableName": dstTableName
        });
    })
    .then(function(finalTableName) {
        return getRows({
            "tableName": finalTableName,
            "startRowNum": 1,
            "rowsToFetch": 10
        });
    })
    .then(function(res) {
        console.log("fetch rows", res);
    })
    .fail(function(error) {
        console.log("error", error);
    });
}

// SQL Test
function sqlTest() {
    var srcTableName;
    var dstTableName;

    connect()
    .then(function() {
        console.log("connected");

        var sql = "Select * from Test";
        return $.ajax({
            "type": "POST",
            "Content-Type": "application/json",
            "data": {"args": sql},
            "url": url + "/sql"
        });
    })
    .then(function() {
        console.log.appy(this, arguments);
    })
    .fail(function(error) {
        console.log("error", error);
    });
}

/*
[ {
  "class" : "org.apache.spark.sql.catalyst.plans.logical.Filter",
  "num-children" : 1,
  "condition" : [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.And",
    "num-children" : 2,
    "left" : 0,
    "right" : 1
  }, {
    "class" : "org.apache.spark.sql.catalyst.expressions.IsNotNull",
    "num-children" : 1,
    "child" : 0
  }, {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "REVIEW_COUNT",
    "dataType" : "double",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2420,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    },
    "qualifier" : "yelp"
  }, {
    "class" : "org.apache.spark.sql.catalyst.expressions.GreaterThan",
    "num-children" : 2,
    "left" : 0,
    "right" : 1
  }, {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "REVIEW_COUNT",
    "dataType" : "double",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2420,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    },
    "qualifier" : "yelp"
  }, {
    "class" : "org.apache.spark.sql.catalyst.expressions.Literal",
    "num-children" : 0,
    "value" : "10.0",
    "dataType" : "double"
  } ],
  "child" : 0
}, {
  "class" : "org.apache.spark.sql.execution.LogicalRDD",
  "num-children" : 0,
  "output" : [ [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "USER_ID",
    "dataType" : "string",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2417,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "AVERAGE_STARS",
    "dataType" : "double",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2418,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "TYPE",
    "dataType" : "string",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2419,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "REVIEW_COUNT",
    "dataType" : "double",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2420,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "YELPING_SINCE",
    "dataType" : "string",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2421,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "NAME",
    "dataType" : "string",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2422,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "FANS",
    "dataType" : "double",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2423,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ], [ {
    "class" : "org.apache.spark.sql.catalyst.expressions.AttributeReference",
    "num-children" : 0,
    "name" : "XC_TABLENAME_SQL31059",
    "dataType" : "string",
    "nullable" : true,
    "metadata" : { },
    "exprId" : {
      "product-class" : "org.apache.spark.sql.catalyst.expressions.ExprId",
      "id" : 2424,
      "jvmId" : "f370555c-76b6-49ec-b750-4949a5aa5fd4"
    }
  } ] ],
  "rdd" : null,
  "outputPartitioning" : {
    "product-class" : "org.apache.spark.sql.catalyst.plans.physical.UnknownPartitioning",
    "numPartitions" : 0
  },
  "outputOrdering" : [ ],
  "session" : null
} ]
*/