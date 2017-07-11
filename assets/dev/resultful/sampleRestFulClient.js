var url = "http://host:12130";

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
            "aggColName": "lat_integer",
            "gbArgs": [{
                "operator": "Avg",
                "aggColName": "lat_integer",
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