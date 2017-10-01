var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
require('shelljs/global');
var app = express();
var xc = require('./xcalarApiBuilt.js');
var port = 12130;
var hostname;

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    next();
});

app.post("/connect", function(req, res) {
    console.log("connecting RESTFUL");
    var user = req.body.user;
    var id = req.body.id;
    if (user == null) {
        console.log("error username or id");
        res.status(500).send("no username or id");
        return;
    }

    xc.connect(hostname, user, id)
    .then(function(ret) {
        console.log("RESTFUL connected");
        res.send(ret);
    })
    .fail(function(error) {
        res.status(500).send(error);
    });
});

app.get("/listTables", function(req, res) {
    var tableName = req.param["tableName"] || "*";
    xc.getTables(tableName)
    .then(function(ret) {
        console.log("get tables");
        res.send(ret);
    })
    .fail(function(error) {
        res.status(500).send(error);
    });
});

app.post("/getRows", function(req, res) {
    var tableName = req.body.tableName;
    var startRowNum = req.body.startRowNum;
    var rowsToFetch = req.body.rowsToFetch;

    xc.getRows(tableName, startRowNum, rowsToFetch)
    .then(function(ret) {
        console.log("get rows");
        res.send(ret);
    })
    .fail(function(error) {
        res.status(500).send(error);
    });
});

/*
 * parameters: args, a stringfied json object, need to use JSON.parse to unnest
 * args includes the following arguments:
 *      gbArgs: an array of coumns to aggregate on, each element is an object,
 *              which have the following attributes:
 *              1) operator: aggregate function to apply, it should be one of the following:
 *                           (Avg, Count, ListAgg, Max, MaxInteger,
 *                           Min, MinInteger, Sum, SumInteger)
 *              2) aggColName: column name to apply aggregate on
 *              3) newColName: column name for the calculated result
 *      groupByCols: an array of columns to group by
 *      tableName: table to group by
 *      newTableName: final name will be newTableName + randomNumber
 */
app.post("/groupBy", function(req, res) {
    var args = req.body.args;
    try {
        args = JSON.parse(args);

        var gbArgs = args.gbArgs;
        var groupByCols = args.groupByCols;
        var tableName = args.tableName;
        var newTableName = args.newTableName;

        console.log("groupBy on", tableName);
        xc.groupBy(gbArgs, groupByCols, tableName, newTableName)
        .then(function(finalTableName) {
            console.log("groupBy finishes", finalTableName);
            res.send(finalTableName);
        })
        .fail(function(error) {
            console.log("groupBy error", error);
            res.status(500).send(error);
        });
    } catch (error) {
        console.error("pase arg error", error);
        res.status(500).send(error);
    }
});

app.post("/query", function(req, res) {
    // 这是一个定制的function, 类似于Xcalar Extension中使用的ext.query
    var queryStr = checkStores(req.body);
    console.log("query", queryStr);
    xc.query(queryStr)
    .then(function(ret) {
        console.log("finish query tables");
        res.send(ret);
    })
    .fail(function(error) {
        res.status(500).send(error);
    });
});

function checkStores(data) {
    var srcTableName = data.srcTableName;
    var dstTableName = data.dstTableName;
    // var query ='map --eval "concat(string(g_inouttbl_zmd::iodate), concat(\\\".Xc.\\\", string(g_inouttbl_zmd::gfrom)))" --srctable "'+srcTableName+'" --fieldName "multiGroupBy80127" --dsttable "g_inouttbl_zmd#Rb572";index --key "multiGroupBy80127" --srctable "g_inouttbl_zmd#Rb572" --dsttable "g_inouttbl_zmd.index#Rb573";groupBy --srctable "g_inouttbl_zmd.index#Rb573" --eval "sum(int(g_inouttbl_zmd::totalmoney, 10))" --fieldName "iodate_sum" --dsttable "cc#Rb571" --nosample;map --eval "cut(multiGroupBy80127, 1, \\\".Xc.\\\")" --srctable "cc#Rb571" --fieldName "iodate" --dsttable "cc#Rb574";map --eval "cut(multiGroupBy80127, 2, \\\".Xc.\\\")" --srctable "cc#Rb574" --fieldName "gfrom" --dsttable "'+dstTableName+'";';
    //var query = 'filter --srctable ' + srcTableName + ' --eval "eq(test::fans, 0)" --dsttable "' + dstTableName + '";'
    //q = filter --srctable NaNNaNdstTable2201
    var query = 'filter --srctable ' + srcTableName + ' --eval "eq(unitTestFakeYelp2974::one, \\\"a.b\\\")" --dsttable "' + dstTableName + '";';
    return query;
}

app.post("/sqlApi", function(req, res) {
    xc.sqlApi()
    .then(function(output) {
        console.log("sql finishes", output);
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql error", error);
        res.status(500).send(error);
    });
});

app.post("/sql", function(req, res) {
    var sql = req.body.sql;
    xc.sql(sql)
    .then(function(output) {
        console.log("sql finishes", output);
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql error", error);
        res.status(500).send(error);
    });
});

app.post("/xcedf/load", function(req, res) {
    var path = req.body.path;
    console.log("load sql path", path);
    xc.sqlLoad(path)
    .then(function(output) {
        console.log("sql load finishes");
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql load error", error);
        res.status(500).send(error);
    });
});

app.post("/xcedf/query", function(req, res) {
    var execid = req.body.execid;
    var plan = req.body.plan;
    var limit = req.body.limit;
    xc.sqlPlan(execid, plan, limit)
    .then(function(output) {
        console.log("sql plan finishes", output);
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql plan error", error);
        res.status(500).send(error);
    });
});

var httpServer = http.createServer(app);
httpServer.listen(port, function() {
    hostname = process.env.DEPLOY_HOST;
    if (!hostname) {
        hostname = "localhost";
    }
    console.log("All ready, listen on port:", port);
});