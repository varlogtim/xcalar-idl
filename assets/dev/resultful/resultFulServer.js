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

app.post("/groupBy", function(req, res) {
    var args = req.body.args;
    try {
        args = JSON.parse(args);

        // operator should be one of the follwing:
        // (Avg, Count, ListAgg, Max, MaxInteger, Min, MinInteger, Sum, SumInteger)
        var operator = args.operator;
        var groupByCols = args.groupByCols;   // an array of columns to group by
        var aggColName = args.aggColName;     // column to apply aggregate on
        var tableName = args.tableName;
        var newColName = args.newColName;     // new col name for the resultant agg col
        var newTableName = args.newTableName; // newTableName (finalTable name will append a randNum after it)

        console.log("groupBy on", tableName);
        xc.groupBy(operator, groupByCols, aggColName, tableName, newColName, newTableName)
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

var httpServer = http.createServer(app);
httpServer.listen(port, function() {
    hostname = process.env.DEPLOY_HOST;
    if (!hostname) {
        hostname = "localhost";
    }
    console.log("All ready");
});