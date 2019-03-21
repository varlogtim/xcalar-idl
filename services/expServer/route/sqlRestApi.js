var jQuery;
var $;
var request = require('request');
var express = require('express');
var fs = require('fs');
var router = express.Router();
var idNum = 0;
var support = require("../expServerSupport.js");
var SqlUtil;
// set default timeout to 20 min
var defaultSQLTimeout = process.env.EXP_SQL_TIMEOUT &&
                        !isNaN(parseInt(process.env.EXP_SQL_TIMEOUT)) ?
                        parseInt(process.env.EXP_SQL_TIMEOUT) : 1200000;
var workerFlag = process.env.EXP_WORKER != null &&
                 process.env.EXP_WORKER.toUpperCase() !== "FALSE" ?
                 true : false;
let sqlWorkerPool;
if (workerFlag) {
    const Pool = require("../worker/workerPool.js");
    sqlWorkerPool = new Pool({fileName: './sqlWorker.js', max: 9});
}

var sqlCompilerObjects = {};

require("jsdom/lib/old-api").env("", function(err, window) {
    console.log("initting jQuery");
    if (err) {
        console.error(err);
        return;
    }
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js');
    SqlUtil = require("../utils/sqlUtils.js").SqlUtil;
});

var gTurnSelectCacheOn = false;

function generateTablePrefix(userName, wkbkName) {
    var curNum = idNum;
    idNum++;
    // Avoid # symbol in table name, cause it might be potential table publish issue
    // return userName + "-wkbk-" + wkbkName + "-" + Date.now() + "#" + curNum;
    return userName + "_wkbk_" + wkbkName + "_" + Date.now() + "_" + curNum;
}

// Deprecated
function finalizeTable(publishArgsList, cleanup, checkTime) {
    var deferred = PromiseHelper.deferred();
    var res = [];
    var promiseArray = [];
    var sqlTables = [];
    publishArgsList.forEach(function(publishArgs) {
        var innerDeferred = PromiseHelper.deferred();
        var promise = convertToDerivedColAndGetSchema(publishArgs.txId,
                                                      publishArgs.importTable,
                                                      publishArgs.sqlTable)
            .then(function(schema) {
                res.push({
                    table: publishArgs.publishName,
                    schema: schema,
                    xcTableName: publishArgs.sqlTable
                });
                xcConsole.log("get schema", schema);
                sqlTables.push(publishArgs.sqlTable);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
        promiseArray.push(innerDeferred.promise());
    });
    PromiseHelper.when.apply(this, promiseArray)
    .then(function() {
        if (cleanup) {
            xcConsole.log("clean up after select");
            return cleanAllTables(sqlTables, checkTime);
        }
    })
    .then(function() {
        deferred.resolve(res);
    })
    .fail(deferred.reject);
    return deferred.promise();
}

// Already deprecated
function sqlSelect(publishNames, sessionPrefix, cleanup, checkTime) {
    var deferred = PromiseHelper.deferred();
    var sqlTableAlias = "sql";
    var res;
    var publishArgsList = [];
    connect("localhost")
    .then(function() {
        xcConsole.log("Connected. Going to workbook...");
        return goToSqlWkbk();
    })
    .then(function() {
        xcConsole.log("Selecting published tables: ", publishNames);
        publishArgsList = publishNames.map(function(name) {
            return {
                sqlTable: sessionPrefix + xcHelper.randName("SQL") +
                                                    Authentication.getHashId(),
                importTable: xcHelper.randName("importTable") +
                                                    Authentication.getHashId(),
                txId: 1,
                publishName: name
            };
        });
        return selectPublishedTables(publishArgsList, checkTime);
    })
    .then(function() {
        xcConsole.log("Finalizing tables");
        return finalizeTable(publishArgsList, cleanup, checkTime);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function sqlLoad(path) {
    var sqlTable = xcHelper.randName("SQL") + Authentication.getHashId();
    var sqlTableAlias = "sql";

    var deferred = PromiseHelper.deferred();
    var args = {};
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

    connect("localhost")
    .then(function() {
        xcConsole.log("connected");
        return goToSqlWkbk();
    })
    .then(function() {
        return loadDatasets(args);
    })
    .then(function() {
        xcConsole.log("create table");
        return convertToDerivedColAndGetSchema(args.txId, args.importTable, sqlTable);
    })
    .then(function(schema) {
        var res = {
            tableName: sqlTableAlias,
            schema: schema,
            xcTableName: sqlTable
        };
        xcConsole.log("get schema", schema);
        deferred.resolve(res);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
};

function listPublishedTables(pattern) {
    var deferred = PromiseHelper.deferred();
    var pubPatternMatch = pattern || "*";
    XcalarListPublishedTables(pubPatternMatch)
    .then(function(res) {
        var publishedTables = [];
        for (var i = 0; i < res.tables.length; i++) {
            if (res.tables[i].active) {
                var table = res.tables[i];
                publishedTables.push(table.name);
            }
        }
        deferred.resolve(res, publishedTables);
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function listAllTables(pattern, pubTables, xdTables) {
    var deferred = PromiseHelper.deferred();
    var patternMatch = pattern || "*";
    var tableListPromiseArray = [];
    tableListPromiseArray.push(XcalarListPublishedTables(patternMatch));
    tableListPromiseArray.push(XcalarGetTables(patternMatch));
    PromiseHelper.when.apply(this, tableListPromiseArray)
    .then(function() {
        var pubTablesRes = arguments[0];
        var xdTablesRes = arguments[1];
        pubTablesRes.tables.forEach(function(table){
            if (table.active) {
                pubTables.set(table.name.toUpperCase(), table.name);
            }
        });
        xdTablesRes.nodeInfo.forEach(function(node){
            xdTables.set(node.name.toUpperCase(), node.name);
        });
        deferred.resolve(pubTablesRes);
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function connect(hostname, username, id) {
    if (!username) {
        username = "xcalar-internal-sql";
        id = 4193719;
    }
    xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (getTHandle() == null) {
        setupThrift(hostname);
        Admin.addNewUser(username);
    }
    return XcalarGetVersion();
};

function goToSqlWkbk(workbook) {
    var wkbkName = workbook || "sql-workbook";
    var deferred = PromiseHelper.deferred();
    var activeSessionNames = [];
    var sqlSession = null;

    XcalarListWorkbooks("*", true)
    .then(function(res) {
        res.sessions.forEach(function(session) {
            if (session.name === wkbkName) {
                sqlSession = session;
            }
            if (session.state === "Active") {
                activeSessionNames.push(session.name);
            }
        });
        if (sqlSession == null) {
            return XcalarNewWorkbook(wkbkName, false);
        }
    })
    .then(function() {
        return activateWkbk(activeSessionNames, wkbkName);
    }, function(error) {
        if (error.status === StatusT.StatusSessionExists) {
            return activateWkbk(activeSessionNames, wkbkName);
        } else {
            return PromiseHelper.reject(error);
        }
    })
    .then(function(ret) {
        xcConsole.log("Activated workbook: ", ret);
        setSessionName(wkbkName);
        deferred.resolve(ret);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
}

function activateWkbk(activeSessionNames, wkbkName) {
    if (activeSessionNames.indexOf(wkbkName) < 0) {
        return XcalarActivateWorkbook(wkbkName);
    } else {
        return PromiseHelper.resolve("already activated");
    }
}

function selectPublishedTables(args, allSchemas, batchIdMap) {
    var queryArray = [];
    for (var i = 0; i < args.length; i++) {
        var renameMap = [];
        for(var j = 0; j < allSchemas[args[i].publishName].length;) {
            var obj = allSchemas[args[i].publishName][j];
            var colName = Object.keys(obj)[0];
            var upColName = colName.toUpperCase();
            if (!upColName.startsWith("XCALARRANKOVER") &&
                !upColName.startsWith("XCALAROPCODE") &&
                !upColName.startsWith("XCALARBATCHID") &&
                !upColName.startsWith("XCALARROWNUMPK")) {
                renameMap.push({sourceColumn: colName, destColumn: upColName,
                                columnType: DfFieldTypeTStr[xcHelper
                                    .convertColTypeToFieldType(obj[colName])]});
                var newColObj = {};
                newColObj[upColName] = obj[colName];
                allSchemas[args[i].publishName][j] = newColObj;
                j++;
            } else {
                allSchemas[args[i].publishName].splice(j, 1);
            }
        }
        var query = {
            "operation": "XcalarApiSelect",
            "args": {
                "source": args[i].publishName,
                "dest": args[i].importTable,
                "minBatchId": -1,
                // "maxBatchId": batchIdMap ? batchIdMap[args[i].publishName] : -1,
                "maxBatchId": -1,
                "columns": renameMap
            }
        }
        queryArray.push(query);
    }
    return queryArray;
}

function loadDatasets(args) {
    var dsArgs = args.dsArgs;
    var formatArgs = args.formatArgs;
    var txId = args.txId;
    var importTable = args.importTable;
    var sqlDS = args.sqlDS;

    var deferred = PromiseHelper.deferred();
    XIApi.load(dsArgs, formatArgs, sqlDS, txId)
    .then(function() {
        xcConsole.log("load dataset");
        return XIApi.indexFromDataset(txId, sqlDS, importTable, "p");
    })
    .then(deferred.resolve)
    .fail(deferred.reject);
    return deferred.promise();
}

function convertToDerivedColAndGetSchema(txId, tableName, dstTable) {
    var deferred = PromiseHelper.deferred();
    SqlUtil.getSchema(tableName)
    .then(function(res) {
        return getDerivedCol(txId, tableName, res.schema, dstTable);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function getDerivedCol(txId, tableName, schema, dstTable) {
    var deferred = PromiseHelper.deferred();
    var newSchema = [];
    var mapStrs = [];
    var newColNames = [];
    var newTableName = xcHelper.randName("tempTable") + Authentication.getHashId();
    schema.forEach(function(cell) {
        var colName = Object.keys(cell)[0];
        var type = cell[colName];
        var newColName = xcHelper.parsePrefixColName(colName).name.toUpperCase();
        var mapFn;
        if (type === "number" || type === "float") {
            type = "float";
            mapFn = "float";
        } else if (type === "boolean") {
            mapFn = "bool";
        } else {
            mapFn = type;
        }

        var newCell = {};
        newCell[newColName] = type;
        newSchema.push(newCell);

        mapStrs.push(mapFn + "(" + colName + ")");
        newColNames.push(newColName);
    });

    XIApi.map(txId, mapStrs, tableName, newColNames, newTableName)
    .then(function() {
        return XIApi.project(txId, newColNames, newTableName, dstTable);
    })
    .then(function() {
        XIApi.deleteTable(txId, tableName);
        XIApi.deleteTable(txId, newTableName);
        deferred.resolve(newSchema);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function getTablesFromParserResult(identifiers, setOfPubTables, setOfXDTables) {
    var imdTables = [];
    var xdTables = [];
    var errorTables = [];
    setOfXDTables = setOfXDTables || new Map();
    identifiers.forEach(function(identifier) {
        identifier = identifier.toUpperCase();
        var slicedIdentifier = identifier.slice(1, -1);
        if (setOfXDTables.has(identifier)){
            xdTables.push(setOfXDTables.get(identifier));
        }
        else if (identifier[0] === "`" && identifier[identifier.length - 1] === "`"
            && setOfXDTables.has(slicedIdentifier)) {
                xdTables.push(setOfXDTables.get(slicedIdentifier));
        }
        else if(setOfPubTables.has(identifier)){
            imdTables.push(setOfPubTables.get(identifier));
        }
        else if (identifier[0] === "`" && identifier[identifier.length - 1] === "`"
            && setOfPubTables.has(slicedIdentifier)) {
                imdTables.push(setOfPubTables.get(slicedIdentifier));
        }
        else {
            errorTables.push(identifier);
        }
    });
    if (errorTables.length > 0) {
        return "Tables not found: " +
            JSON.stringify(errorTables);
    }
    return [imdTables, xdTables];
}

function sendToPlanner(sessionPrefix, requestStruct, username, wkbkName) {
    var type = requestStruct.type;
    var method = requestStruct.method;
    var data = requestStruct.data;
    if (!username) {
        username = "xcalar-internal-sql";
        wkbkName = "sql-workbook";
    }
    var deferred = PromiseHelper.deferred();
    var url = "http://localhost:27000/xcesql/" + type;
    if (type !== "sqlparse") {
        url += "/" + encodeURIComponent(encodeURIComponent(sessionPrefix +
               username + "-wkbk-" + wkbkName));
        if (type === "sqlquery") {
            url += "/true/true"
        }
    }

    request({
        method: method,
        url: url,
        json: true,
        body: data
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (type === "sqlquery") {
                    deferred.resolve(JSON.parse(body.sqlQuery));
                } else {
                    deferred.resolve(body);
                }
            } else {
                if(body.exceptionName && body.exceptionMsg) {
                    error = {errorType: body.exceptionName, errorMsg: body.exceptionMsg};
                }
                deferred.reject(error);
            }
        }
    );
    return deferred.promise();
}

function getInfoForPublishedTable(pubTableReturn, pubTableName) {
    function findPubTableByName(pubList, pubName) {
        for (var pubTable of pubList.tables) {
            if (pubTable.name === pubName) {
                return pubTable;
            }
        }
    }
    var tableStruct = findPubTableByName(pubTableReturn, pubTableName);

    var columns = tableStruct.values;
    var schema = [];
    for (var i = 0; i < columns.length; i++) {
        var colStruct = {};
        var column = columns[i];
        var type = xcHelper.convertFieldTypeToColType(
            DfFieldTypeTFromStr[column.type]);
        colStruct[column.name] = type;
        schema.push(colStruct);
    }
    tableStruct.schema = schema;

    return tableStruct;
}

function getInfoForXDTable(tableName, sessionInfo) {
    var deferred = PromiseHelper.deferred();
    var {userName, userId, sessionName} = sessionInfo;
    SqlUtil.setSessionInfo(userName, userId, sessionName);
    XcalarGetTableMeta(tableName)
    .then(function(ret) {
        var columns = ret.valueAttrs;
        var schema = [];
        var colInfos = columns.map((column) => {
            var colStruct = {};
            var columnName = column.name.toUpperCase();
            var colType = xcHelper.convertFieldTypeToColType(column.type);
            if (colType !== 'integer' && colType !== 'float' &&
                colType !== 'boolean' && colType !== 'timestamp' &&
                colType !== "string" && colType !== 'money') {
                // can't handle other types in SQL
                return deferred.reject("Invalid column type, cannot handle " + colType);
            }
            colStruct[columnName] = colType;
            schema.push(colStruct);
            return xcHelper.getJoinRenameMap(column.name,
                    columnName, column.type);
        });
        var txId = Transaction.start({"simulate": true});
        XIApi.synthesize(txId, colInfos, tableName)
        .then(function(finalizedTableName) {
            var query = Transaction.done(txId);
            if(query.slice(-1) === ','){
                query = query.slice(0, -1);
            }
            var jsonQuery = JSON.parse(query);
            return deferred.resolve({
                    "pubTableName": tableName,
                    "tableName": finalizedTableName,
                    "query": jsonQuery,
                    "schema":schema,
                    "isIMD": false
                });
        })
        .fail(deferred.reject)
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function collectTablesMetaInfo(queryStr, tablePrefix, type, sessionInfo) {
    var {userName, userId, sessionName} = sessionInfo;
    function findValidLastSelect(selects, nextBatchId) {
        for (var select of selects) {
            if (select.maxBatchId + 1 === nextBatchId &&
                select.minBatchId === 0) {
                return select.dest;
            }
        }
    }

    function tableValid(pubTableName, tableName) {
        var deferred = jQuery.Deferred();
        if (!gTurnSelectCacheOn) {
            return PromiseHelper.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": false,
                "isIMD": true
            });
        }
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        XcalarGetTableMeta(tableName)
        .then(function(ret) {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": true,
                "isIMD": true
            });
        })
        .fail(function() {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": false,
                "isIMD": true
            });
        });
        return deferred.promise();
    }

    var allSchemas = {};
    var allSelects = {};
    var deferred = jQuery.Deferred();
    var error = false;
    var batchIdMap = {};
    var pubTablesMap = new Map();
    var xdTablesMap = new Map();
    var pubTableRes;

    var prom;
    //XXX Doing this not to mess up with odbc calls
    // but works without doing this for odbc, need to remove
    // this when we unify sdk and odbc code paths
    if (type === 'odbc') {
        prom = listPublishedTables('*');
    }
    else {
        prom = listAllTables('*', pubTablesMap, xdTablesMap);
    }
    prom
    .then(function(retPubTableRes, retPubTables) {
        //XXX converting pubTables array to Map
        // making xdTables to empty Map
        pubTableRes = retPubTableRes;
        if (type === 'odbc') {
            for (var pubTable of retPubTables) {
                pubTablesMap.set(pubTable.toUpperCase(), pubTable);
            }
        }
        var requestStruct = {
            type: "sqlparse",
            method: "POST",
            data: {
                sqlQuery: queryStr,
                ops: ["identifier"],
                isMulti: false
            }
        }
        return sendToPlanner(tablePrefix, requestStruct, userName, sessionName);
    })
    .then(function(data) {
        var retStruct = data.ret;
        if (retStruct.length > 1) {
            return PromiseHelper.reject("Multiple queries not supported yet");
        }
        var identifiers = retStruct[0].identifiers;
        if (identifiers.length === 0) {
            return PromiseHelper.reject("Failed to get identifiers from invalid SQL");
        }
        var allTables = getTablesFromParserResult(identifiers, pubTablesMap, xdTablesMap);
        if (typeof(allTables) !== "object") {
            console.log(allTables);
            return PromiseHelper.reject(SQLErrTStr.NoPublishedTable);
        }
        var imdTables = allTables[0];
        var xdTables = allTables[1];
        console.log("IMD tables are", imdTables);
        console.log("XD tables are", xdTables);
        var tableValidPromiseArray = [];
        for (var imdTable of imdTables) {
            var tableStruct = getInfoForPublishedTable(pubTableRes, imdTable);
            // schema must exist because getListOfPublishedTables ensures
            // that it exists
            allSchemas[imdTable] = tableStruct.schema;
            batchIdMap[imdTable] = tableStruct.nextBatchId - 1;
            var candidateSelectTable = findValidLastSelect(tableStruct.selects,
                tableStruct.nextBatchId);
            allSelects[imdTable] = candidateSelectTable;
            tableValidPromiseArray.push(tableValid(imdTable, candidateSelectTable));
        }

        for (var xdTable of xdTables) {
            tableValidPromiseArray.push(getInfoForXDTable(xdTable, sessionInfo));
        }
        return PromiseHelper.when(...tableValidPromiseArray);
    })
    .then(function() {
        returns = arguments;
        // XXX FIX ME We need to make sure from when we check to when we run
        // this call, that the table still exists and that no one has dropped
        // it in the meantime. Alternatively, we can just put in a backup clause
        var xdTableReturns = [];
        for (var retStruct of returns) {
            if (retStruct.isIMD && !retStruct.found) {
                allSelects[retStruct.pubTableName] = undefined;
            }
            else if (!retStruct.isIMD) {
                xdTableReturns.push(retStruct);
            }
        }
        //imd tables information gathering
        var toSelect = [];
        for (var pubTable in allSelects) {
            if (!allSelects[pubTable]) {
                var xcalarTableName = xcHelper.randName(tablePrefix) +
                    Authentication.getHashId();
                toSelect.push({
                    importTable: xcalarTableName,
                    publishName: pubTable
                });
                allSelects[pubTable] = xcalarTableName;
            }
        }
        query_array = selectPublishedTables(toSelect, allSchemas, batchIdMap);

        //xd tables information gathering
        xdTableReturns.forEach(function(xdTableStruct) {
            var xdTable = xdTableStruct.tableName;
            var pubTable = xdTableStruct.pubTableName;
            allSelects[pubTable] = xdTable;
            query_array.push(xdTableStruct.query);
            allSchemas[pubTable] = xdTableStruct.schema;
        });

        deferred.resolve(query_array, allSchemas, allSelects);
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function getXCquery(params, type) {
    var deferred = PromiseHelper.deferred();
    var finalTable;
    var orderedColumns;
    var tables;
    var allPublishArgs = [];
    var option;
    var optimizations = params.optimizations;
    var tablePrefix = params.tablePrefix ||
                        generateTablePrefix(params.userName, params.sessionName);
    params.usePaging = params.usePaging || false;
    option = {
        prefix: tablePrefix,
        checkTime: params.checkTime,
        sqlMode: true,
        queryString: params.queryString
    };
    var allSelects = {};
    var queryName = params.queryName || xcHelper.randName("sql");
    var compilerObject = new SQLCompiler();
    sqlCompilerObjects[queryName] = compilerObject;

    var selectQuery = "";

    setupConnection(params.userName, params.userId, params.sessionName)
    .then(function () {
        sessionInfo = {"userName": params.userName, "userId": params.userId, "sessionName": params.sessionName};
        return collectTablesMetaInfo(params.queryString, tablePrefix, type, sessionInfo);
    })
    .then(function(selQuery, schemas, selects) {
        allSelects = selects;
        selectQuery = selQuery;
        var schemasToSendToSqlDf = [];
        for (var pubTable in schemas) {
            schemasToSendToSqlDf.push({
                tableName: pubTable,
                tableColumns: schemas[pubTable],
                xcTableName: selects[pubTable]
            });
        }
        var requestStruct = {
            type: "schemasupdate",
            method: "put",
            data: schemasToSendToSqlDf
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function () {
        // get logical plan
        var requestStruct = {
            type: "sqlquery",
            method: "post",
            data: {"sqlQuery": params.queryString}
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (plan) {
            return compilerObject.compile(queryName, plan, true, option);
    })
    .then(function(xcQueryString, newTableName, colNames, toCache) {
        xcConsole.log("Compilation finished");
        orderedColumns = colNames;
        var prefixedQuery;
        var optimizerObject = new SQLOptimizer();
        var queryWithDrop;
        try {
            queryWithDrop = optimizerObject.logicalOptimize(xcQueryString,
                                    optimizations, JSON.stringify(selectQuery));
        } catch(e) {
            deferred.reject(e);
        }
        var prefixStruct = SqlUtil.addPrefix(
            JSON.parse(queryWithDrop),
            allSelects,
            newTableName,
            tablePrefix,
            params.usePaging,
            params.resultTableName);
        var prefixedQuery = prefixStruct.query;
        deferred.resolve({"prefixedQuery":prefixedQuery, "orderedColumns": orderedColumns});
    })
    .fail(function(err) {
        xcConsole.log("sql query error: ", err);
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    })

    return deferred.promise();
};

function executeSql(params, type) {
    var deferred = PromiseHelper.deferred();
    var finalTable;
    var orderedColumns;
    var tables;
    var allPublishArgs = [];
    var option;
    var optimizations = params.optimizations;
    var tablePrefix = params.tablePrefix ||
                        generateTablePrefix(params.userName, params.sessionName);
    tablePrefix = SqlUtil.cleansePrefix(tablePrefix);
    params.usePaging = params.usePaging || false;
    option = {
        prefix: tablePrefix,
        checkTime: params.checkTime,
        sqlMode: true,
        queryString: params.queryString
    };
    if (type === "odbc") {
        option["checkTime"] = params.checkTime;
    }
    var allSelects = {};
    var queryName = params.queryName || xcHelper.randName("sql");
    var compilerObject = new SQLCompiler();
    sqlCompilerObjects[queryName] = compilerObject;

    var selectQuery = "";

    var sqlHistoryObj = {
        queryId: queryName,
        status: SQLStatus.Compiling,
        queryString: params.queryString
    };

    setupConnection(params.userName, params.userId, params.sessionName)
    .then(function () {
        sqlHistoryObj["startTime"] = new Date();
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        sessionInfo = {"userName": params.userName, "userId": params.userId, "sessionName": params.sessionName};
        return collectTablesMetaInfo(params.queryString, tablePrefix, type, sessionInfo);
    })
    .then(function(selQuery, schemas, selects) {
        allSelects = selects;
        selectQuery = selQuery;
        var schemasToSendToSqlDf = [];
        for (var pubTable in schemas) {
            schemasToSendToSqlDf.push({
                tableName: pubTable,
                tableColumns: schemas[pubTable],
                xcTableName: selects[pubTable]
            });
        }
        var requestStruct = {
            type: "schemasupdate",
            method: "put",
            data: schemasToSendToSqlDf
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function () {
        // get logical plan
        var requestStruct = {
            type: "sqlquery",
            method: "post",
            data: {"sqlQuery": params.queryString}
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (plan) {
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        if (workerFlag) {
            var workerData = {
                queryName: queryName,
                planStr: plan,
                isJsonPlan: true,
                option: option,
                optimizations: optimizations,
                selectQuery: selectQuery,
                allSelects: allSelects,
                params: params,
                type: type
            }
            return startWorker(workerData);
        } else {
            return compilerObject.compile(queryName, plan, true, option);
        }
    })
    .then(function(xcQueryString, newTableName, colNames, toCache) {
        xcConsole.log("Compilation finished");
        orderedColumns = colNames;
        var prefixedQuery;
        if (workerFlag) {
            prefixedQuery = xcQueryString;
            finalTable = newTableName;
        } else {
            var queryWithDrop;
            if (optimizations.noOptimize) {
                var selectString = JSON.stringify(selectQuery);
                queryWithDrop = selectString.substring(0, selectString.length - 1)
                                + "," + xcQueryString.substring(1);
            } else {
                var optimizerObject = new SQLOptimizer();
                try {
                    queryWithDrop = optimizerObject.logicalOptimize(xcQueryString,
                                        optimizations, JSON.stringify(selectQuery));
                } catch(e) {
                    deferred.reject(e);
                }
            }
            // Auto-generate a name for the final table if not specified
            if(!params.usePaging && !params.resultTableName) {
                params.resultTableName = xcHelper.randName("res_") + Authentication.getHashId();
            }
            var prefixStruct = SqlUtil.addPrefix(
                JSON.parse(queryWithDrop),
                allSelects,
                newTableName,
                tablePrefix,
                params.usePaging,
                params.resultTableName);
            var prefixedQuery = prefixStruct.query;
            finalTable = prefixStruct.tableName || newTableName;
        }
        // To show better performance, we only display duration of execution
        sqlHistoryObj["startTime"] = new Date();
        sqlHistoryObj["status"] = SQLStatus.Running;
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        return compilerObject.execute(prefixedQuery, finalTable, orderedColumns,
                                      params.queryString, undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        sqlHistoryObj["status"] = SQLStatus.Done;
        sqlHistoryObj["endTime"] = new Date();
        sqlHistoryObj["tableName"] = finalTable;
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        // Drop schemas and nuke session on planner
        var requestStruct = {
            type: "schemasdrop",
            method: "delete"
        }
        return sendToPlanner(tablePrefix, requestStruct, params.userName, params.sessionName)
    })
    .then(function() {
        if (compilerObject.getStatus() === SQLStatus.Cancelled) {
            // Query is done already
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        if (type === "odbc") {
            sessionInfo  = {};
            sessionInfo.userName = params.userName;
            sessionInfo.userId = params.userId;
            sessionInfo.sessionName = params.sessionName;
            return SqlUtil.getResults(finalTable, orderedColumns, params.rowsToFetch,
                            params.execid, params.usePaging, sessionInfo);
        } else {
            var result = {
                tableName: finalTable,
                columns: orderedColumns
            }
            return PromiseHelper.resolve(result);
        }
    })
    .then(deferred.resolve)
    .fail(function(err) {
        xcConsole.log("sql query error: ", err);
        sqlHistoryObj["endTime"] = new Date();
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            sqlHistoryObj["status"] = SQLStatus.Cancelled;
            retObj.isCancelled = true;
        } else {
            sqlHistoryObj["status"] = SQLStatus.Failed;
            sqlHistoryObj["errorMsg"] = err;
        }
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        deferred.reject(retObj);
    })
    .always(function() {
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        XIApi.deleteTable(1, tablePrefix + "*");
        xcConsole.log("sql query finishes.");
    });

    return deferred.promise();
};

function executeSqlWithExtPlan(execid, planStr, rowsToFetch, sessionPrefix,
                            checkTime, queryName) {
    var deferred = PromiseHelper.deferred();
    if (rowsToFetch == null) {
        rowsToFetch = 10; // default to be 10
    }
    var finalTable;
    var orderedColumns;
    var option = {
        prefix: sessionPrefix,
        checkTime: checkTime,
        sqlMode: true,
        queryString: ""
    };
    queryName = queryName || xcHelper.randName("sql");
    var compilerObject = new SQLCompiler();
    sqlCompilerObjects[name] = compilerObject;

    setupConnection()
    .then(function() {
        return compilerObject.compile(queryName, planStr, true, option);
    })
    .then(function(xcQueryString, newTableName, colNames, toCache) {
        xcConsole.log("Compilation finished!");
        finalTable = newTableName;
        orderedColumns = colNames;
        return compilerObject.execute(xcQueryString, finalTable, orderedColumns,
                                      "", undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        if (compilerObject.getStatus() === SQLStatus.Cancelled) {
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        return SqlUtil.getResults(finalTable, orderedColumns, rowsToFetch);
    })
    .then(deferred.resolve)
    .fail(function(err) {
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    })
    .always(function() {
        XIApi.deleteTable(1, params.sessionPrefix + "*");
    });

    return deferred.promise();
};

function setupConnection(userIdName, userIdUnique, wkbkName) {
    var deferred = jQuery.Deferred();
    connect("localhost", userIdName, userIdUnique)
    .then(function() {
        xcConsole.log("connected  to localhost");
        return goToSqlWkbk(wkbkName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);
    return deferred.promise();
}

// deprecated
function getListOfPublishedTablesFromQuery(sqlStatement, listOfPubTables) {
    var pubTablesUsed = []
    for (var table of listOfPubTables) {
        var regex = new RegExp("\\b" + table + "\\b", "i");
        if (regex.test(sqlStatement)) {
            pubTablesUsed.push(table);
        }
    }
    return pubTablesUsed;
}

router.post("/xcedf/load", function(req, res) {
    var path = req.body.path;
    xcConsole.log("load sql path", path);
    sqlLoad(path)
    .then(function(output) {
        xcConsole.log("sql load finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql load error", error);
        res.status(500).send(error);
    });
});

router.post("/deprecated/select", function(req, res) {
    try {
        var publishNames = JSON.parse(req.body.names);
    } catch (err) {
        res.status(500).send("Invalid table names.");
        return;
    }
    var sessionPrefix = req.body.sessionId;
    var cleanup = (req.body.cleanup === "true");
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionPrefix = "src" + sessionPrefix.replace(/-/g, "") + "_";
    xcConsole.log("load from published table: ", publishNames);
    sqlSelect(publishNames, sessionPrefix, cleanup, checkTime)
    .then(function(output) {
        xcConsole.log("sql load published table finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql load error", error);
        res.status(500).send(error);
    });
});

// Deprecated
function cleanAllTables(allIds, checkTime) {
    var queryArray = [];
    for (var i = 0; i < allIds.length; i++) {
        var query = {
                        "operation": "XcalarApiDeleteObjects",
                        "args": {
                            "namePattern": allIds[i] + "*",
                            "srcType": "Table"
                        }
                    };
        queryArray.push(query);
    }
    xcConsole.log("deleting: ", JSON.stringify(allIds));
    return XIApi.deleteTables(1, queryArray, checkTime);
}

router.post("/xcsql/query", function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    var optimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        dropSrcTables: !req.body.keepOri,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    }
    var params = {
        userName: req.body.userIdName,
        userId: req.body.userIdUnique,
        sessionName: req.body.wkbkName,
        resultTableName: req.body.newSqlTableName,
        queryString: req.body.queryString,
        tablePrefix: req.body.queryTablePrefix,
        queryName: req.body.queryTablePrefix,
        optimizations: optimizations
    }
    executeSql(params)
    .then(function(executionOutput) {
        xcConsole.log("Sent schema for resultant table");
        res.send(executionOutput);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
});

// XXX Some parameters need to be renamed
// apply similar code to /sql/query, or even simply merge them into one router
// Only difference is they take different parameters
router.post("/xcsql/queryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    var execid = req.body.execid;
    var queryName = req.body.queryName;
    var queryString = req.body.queryString;
    var limit = req.body.limit;
    var tablePrefix = req.body.sessionId;
    var usePaging = req.body.usePaging === "true";
    // jdbc only passes string to us
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    var type = "odbc";
    var optimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect,
        dedup: req.body.dedup,
        noOptimize: req.body.noOptimize
    };
    optimizations.dropAsYouGo = optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin = optimizations.randomCrossJoin == undefined ? false : optimizations.randomCrossJoin;
    optimizations.pushToSelect = optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    var params = {
        execid: execid,
        queryString: queryString,
        limit: limit,
        tablePrefix: tablePrefix,
        checkTime: checkTime,
        queryName: queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    executeSql(params, type)
    .then(function(output) {
        xcConsole.log("sql query finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/getXCqueryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    var execid = req.body.execid;
    var queryName = req.body.queryName;
    var queryString = req.body.queryString;
    var limit = req.body.limit;
    var tablePrefix = req.body.sessionId;
    var usePaging = req.body.usePaging === "true";
    // jdbc only passes string to us
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    var type = "odbc";
    var optimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    };
    optimizations.dropAsYouGo = optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin = optimizations.randomCrossJoin == undefined ? false : optimizations.randomCrossJoin;
    optimizations.pushToSelect = optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    var params = {
        execid: execid,
        queryString: queryString,
        limit: limit,
        tablePrefix: tablePrefix,
        checkTime: checkTime,
        queryName: queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    getXCquery(params, type)
    .then(function(output) {
        xcConsole.log("get xcalar query finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("get xcalar query error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/result", [support.checkAuth], function(req, res) {
    var resultSetId = req.body.resultSetId;
    var rowPosition = parseInt(req.body.rowPosition);
    var rowsToFetch = parseInt(req.body.rowsToFetch);
    var totalRows = parseInt(req.body.totalRows);
    var schema = JSON.parse(req.body.schema);
    var renameMap = JSON.parse(req.body.renameMap);
    var userName = req.body.userName;
    var userId = req.body.userId;
    var sessionName = req.body.sessionName;
    SqlUtil.fetchData(resultSetId, rowPosition, rowsToFetch, totalRows, [], 0, 0, userName, userId, sessionName)
    .then(function(data) {
        var result = SqlUtil.parseRows(data, schema, renameMap);
        var endRow = rowPosition + rowsToFetch;
        xcConsole.log("fetched data from " + rowPosition + " to " + endRow);
        res.send(result);
    })
    .fail(function(error) {
        xcConsole.log("fetching data error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/clean", [support.checkAuth], function(req, res) {
    var tableName = req.body.tableName;
    var resultSetId = req.body.resultSetId;
    var userName = req.body.userName;
    var userId = req.body.userId;
    var sessionName = req.body.sessionName;
    var promise;
    if (resultSetId) {
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        promise = XcalarSetFree(resultSetId);
    } else {
        promise = PromiseHelper.resolve();
    }
    promise
    .then(function() {
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        return XIApi.deleteTable(1, tableName);
    })
    .then(function() {
        xcConsole.log("cleaned table and free result set for: ", tableName);
        res.send({sucess: true});
    })
    .fail(function(error) {
        xcConsole.log("failed to drop table: ", tableName, error);
        res.status(500).send(error);
    });
});

router.post("/xdh/query", [support.checkAuth], function(req, res) {
    var execid = req.body.execid;
    var queryName = req.body.queryName;
    var plan = req.body.plan;
    var limit = req.body.limit;
    var sessionPrefix = req.body.sessionId;
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionPrefix = "sql" + sessionPrefix.replace(/-/g, "") + "_";
    executeSqlWithExtPlan(execid, plan, limit, sessionPrefix, checkTime, queryName)
    .then(function (output) {
        xcConsole.log("sql query finishes");
        res.send(output);
    })
    .fail(function (error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/list", [support.checkAuth], function(req, res) {
    var pattern = req.body.pattern;
    connect("localhost")
    .then(function() {
        xcConsole.log("connected");
        return listPublishedTables(pattern);
    })
    .then(function(results, tables) {
        var retStruct = [];

        for (var pubTable of tables) {
            var pubTableMeta = {};
            pubTableMeta["tableName"] = pubTable;
            pubTableMeta["tableColumns"] = getInfoForPublishedTable(results,
                pubTable).schema;
            retStruct.push(pubTableMeta);
        }

        xcConsole.log("List published tables schema");
        res.send(retStruct);
    })
    .fail(function(error) {
        xcConsole.log("get published tables error: ", error);
        res.status(500).send(error);
    });
});

function cancelQuery(queryName) {
    var compilerObject = sqlCompilerObjects[queryName];
    if (compilerObject) {
        return compilerObject.setStatus(SQLStatus.Cancelled);
    } else {
        return PromiseHelper.reject({error: "Query doesn't exist"});
    }
}

router.post("/xcsql/cancel", [support.checkAuth], function(req, res) {
    var queryName = req.body.queryName;
    var userName = req.body.userName;
    var userId = req.body.userId;
    var sessionName = req.body.sessionName;
    SqlUtil.setSessionInfo(userName, userId, sessionName);
    cancelQuery(queryName)
    .then(function() {
        xcConsole.log("query cancelled");
        res.send({log: "query cancel issued: " + queryName});
    })
    .fail(function(error) {
        xcConsole.log("cancel query error: ", error);
        res.send(error);
    });
});

router.post("/deprecated/clean", [support.checkAuth], function(req, res) {
    var sessionPrefix = req.body.sessionId;
    var type = req.body.type;
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    var srcId = "src" + sessionPrefix.replace(/-/g, "") + "_";
    var otherId = "sql" + sessionPrefix.replace(/-/g, "") + "_";
    var allIds = [];
    if (type === "select") {
        allIds.push(srcId);
    } else if (type === "other") {
        allIds.push(otherId);
    } else if (type === "all") {
        allIds.push(srcId);
        allIds.push(otherId);
    } else {
        res.status(500).send("Invalid type provided");
    }
    cleanAllTables(allIds, checkTime)
    .then(function(output) {
        xcConsole.log("all temp and result tables deleted");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("clean tables error: ", error);
        res.send("Some tables are not deleted because: " + JSON.stringify(error));
    });
});

// Start a worker for CPU intensive jobs
function startWorker(data) {
    if (sqlWorkerPool) {
        var deferred = PromiseHelper.deferred();
        sqlWorkerPool.submit(deferred, data);
        return deferred.promise();
    }
}

// For unit tests
function fakeSqlLoad(func) {
    sqlLoad = func;
}
function fakeSqlSelect(func) {
    sqlSelect = func;
}
function fakeListPublishTables(func) {
    listPublishedTables = func;
}
function fakeCleanAllTables(func) {
    cleanAllTables = func;
}
if (process.env.NODE_ENV === "test") {
    exports.sqlLoad = sqlLoad;
    exports.sqlSelect = sqlSelect;
    exports.listPublishedTables = listPublishedTables;
    exports.cleanAllTables = cleanAllTables;
    // Stub functions
    exports.fakeSqlLoad = fakeSqlLoad;
    exports.fakeSqlSelect = fakeSqlSelect;
    exports.fakeListPublishTables = fakeListPublishTables;
    exports.fakeCleanAllTables = fakeCleanAllTables;
}
exports.executeSql = executeSql;
exports.router = router;
