var jQuery;
var $;
var xcalarApi;
var xcHelper;
var PromiseHelper;
var XIApi;
var Transaction;
var SQLApi;
var SQLCompiler;
var SQLOptimizer;
var request = require('request');
var express = require('express');
var fs = require('fs');
var router = express.Router();
var idNum = 0;
var sqlHelpers;
var support = require("../expServerSupport.js");
var KVStore;
var SqlQueryHistory;
var httpStatus;

// Antlr4 SQL Parser
var SqlBaseListener;
var SqlBaseParser;
var SqlBaseLexer;
var SqlBaseVisitor;
var TableVisitor;
var antlr4;
var Admin;

var sqlCompilerObjects = {};

require("jsdom/lib/old-api").env("", function(err, window) {
    console.log("initting jQuery");
    if (err) {
        console.error(err);
        return;
    }
    global.Thrift = Thrift = require("../../../assets/js/thrift/thrift.js").Thrift;
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js');


    var enumsPath = "../../../assets/js/thrift/";
    var normalizedPath = require("path").join(__dirname, enumsPath);
    require("fs").readdirSync(normalizedPath).forEach(function(file) {
        if (file.indexOf("_types") > -1) {
            require("../../../assets/js/thrift/" + file);
        }
    });

    try {
        sqlHelpers = require("../sqlHelpers/sqlHelpers.js");
    } catch(error) {
        require("../sqlHelpers/enums.js");
    }

    global.xcHelper = xcHelper = sqlHelpers ? sqlHelpers.xcHelper :
                                 require("../sqlHelpers/xcHelper.js").xcHelper;
    global.xcGlobal = xcGlobal = sqlHelpers ? sqlHelpers.xcGlobal :
                                 require("../sqlHelpers/xcGlobal.js").xcGlobal;
    global.xcConsole = xcConsole = require("../expServerXcConsole.js").xcConsole;
    xcGlobal.setup();
    require("../../../assets/js/thrift/XcalarApiService.js");
    require("../../../assets/js/thrift/XcalarApiVersionSignature_types.js");
    require("../../../assets/js/thrift/XcalarApiServiceAsync.js");
    require("../../../assets/js/thrift/XcalarEvalEnums_types.js");
    xcalarApi = require("../../../assets/js/thrift/XcalarApi.js");

    global.PromiseHelper = PromiseHelper = require("../../../assets/js/promiseHelper.js");
    global.Transaction = Transaction = sqlHelpers ? sqlHelpers.Transaction :
                                       require("../sqlHelpers/transaction.js").Transaction;

    hackFunction();

    require("../../../assets/js/XcalarThrift.js");
    global.XIApi = XIApi = sqlHelpers ? sqlHelpers.XIApi :
                           require("../sqlHelpers/xiApi.js").XIApi;
    global.SQLApi = SQLApi = sqlHelpers ? sqlHelpers.SQLApi :
                           require("../sqlHelpers/sqlApi.js").SQLApi;
    SQLCompiler = sqlHelpers ? sqlHelpers.SQLCompiler :
                  require("../sqlHelpers/sqlCompiler.js").SQLCompiler;
    SQLOptimizer = sqlHelpers ? sqlHelpers.SQLOptimizer :
                   require("../sqlHelpers/optimizer.js").SQLOptimizer;
    require("../../../assets/lang/en/jsTStr.js");

    antlr4 = require('antlr4/index');
    global.KVStore = KVStore = sqlHelpers ? sqlHelpers.KVStore :
                               require("../sqlHelpers/kvStore.js").KVStore;
    global.SqlQueryHistory = SqlQueryHistory = sqlHelpers ? sqlHelpers.SqlQueryHistory :
                             require("../sqlHelpers/sqlQueryHistory.js").SqlQueryHistory;
    global.httpStatus = httpStatus = require("../../../assets/js/httpStatus.js").httpStatus;

    SqlBaseListener = require("../sqlParser/SqlBaseListener.js").SqlBaseListener;
    SqlBaseParser = require("../sqlParser/SqlBaseParser.js").SqlBaseParser;
    SqlBaseLexer = require("../sqlParser/SqlBaseLexer.js").SqlBaseLexer;
    SqlBaseVisitor = require("../sqlParser/SqlBaseVisitor.js").SqlBaseVisitor;
    TableVisitor = require("../sqlParser/TableVisitor.js").TableVisitor;
    XDParser = {};
    XDParser.XEvalParser = require("../xEvalParser/index.js").XEvalParser;
});

var gTurnSelectCacheOn = false;

function generateTablePrefix(userName, wkbkName) {
    var curNum = idNum;
    idNum++;
    return userName + "-wkbk-" + wkbkName + "-" + Date.now() + "#" + curNum;
}

function hackFunction() {
    var CurrentUser = {
        commitCheck: function() {
            return PromiseHelper.resolve();
        }
    };

    global.XcUser = {
        CurrentUser: CurrentUser
    };

    global.TblManager = {
        setOrphanTableMeta: function() {}
    };

    global.ColManager = {
        newPullCol: function(colName, backColName, type) {
            if (backColName == null) {
                backColName = colName;
            }
            return {
                "backName": backColName,
                "name": colName,
                "type": type || null,
                "width": 100,
                "isNewCol": false,
                "userStr": '"' + colName + '" = pull(' + backColName + ')',
                "func": {
                    "name": "pull",
                    "args": [backColName]
                },
                "sizedTo": "header"
            };
        },

        newDATACol: function() {
            return {
                "backName": "DATA",
                "name": "DATA",
                "type": "object",
                "width": "auto",// to be determined when building table
                "userStr": "DATA = raw()",
                "func": {
                    "name": "raw",
                    "args": []
                },
                "isNewCol": false
            };
        }
    };

    global.Authentication = {
        getHashId: function() {
            return xcHelper.randName("#", 8);
        }
    };

    global.MonitorGraph = {
        tableUsageChange: function() {}
    };

    global.Log = Log = {
        errorLog: function() { xcConsole.log(arguments); }
    };
    global.Admin = Admin = {
        addNewUser: function(username) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var kvStore = new KVStore("gUserListKey", gKVScope.GLOB);

            kvStore.get()
            .then(function(value) {
                if (value == null) {
                    xcConsole.log("Adding user to admin panel: " + username);
                    return self.storeUsername(kvStore, username);
                } else {
                    var userList = self.parseStrIntoUserList(value);
                    // usernames are case sensitive
                    if (userList.indexOf(username) === -1) {
                        xcConsole.log("Adding user to admin panel: " + username);
                        return self.storeUsername(kvStore, username, true);
                    } else {
                        xcConsole.log("User exists in admin panel: " + username);
                        return PromiseHelper.resolve();
                    }
                }
            })
            .then(deferred.resolve)
            .fail(function(err) {
                xcConsole.log(err);
                deferred.reject(err);
            });

            return deferred.promise();
        },
        storeUsername: function (kvStore, username, append) {
            var deferred = PromiseHelper.deferred();
            var entry = JSON.stringify(username) + ",";
            if (append) {
                return kvStore.append(entry, true, true);
            } else {
                return kvStore.put(entry, true, true);
            }
        },
        parseStrIntoUserList: function (value) {
            var len = value.length;
            if (value.charAt(len - 1) === ",") {
                value = value.substring(0, len - 1);
            }
            var arrayStr = "[" + value + "]";
            var userList;
            try {
                userList = JSON.parse(arrayStr);
            } catch (err) {
                userList = [];
                xcConsole.log("Parsing user list failed! ", err);
            }
            userList.sort(xcHelper.sortVals);
            return userList;
        }
    };
}

function getRows(tableName, startRowNum, rowsToFetch, usePaging) {
    if (tableName === null || startRowNum === null || rowsToFetch <= 0) {
        return PromiseHelper.reject("Invalid args in fetch data");
    }
    var deferred = PromiseHelper.deferred();
    var resultMeta = {};

    XcalarMakeResultSetFromTable(tableName)
    .then(function(res) {
        resultMeta.resultSetId = res.resultSetId;
        resultMeta.totalRows = res.numEntries;
        if (usePaging) {
            return PromiseHelper.resolve(resultMeta);
        }

        if (resultMeta.totalRows == null || resultMeta.totalRows === 0) {
            return PromiseHelper.resolve([]);
        }

        // startRowNum starts with 1, rowPosition starts with 0
        var rowPosition = startRowNum - 1;
        if (rowsToFetch == null) {
            rowsToFetch = resultMeta.totalRows;
        }
        rowsToFetch = Math.min(rowsToFetch, resultMeta.totalRows);
        return fetchData(resultMeta.resultSetId, rowPosition, rowsToFetch,
                         resultMeta.totalRows, [], 0, 0);
    })
    .then(deferred.resolve)
    .fail(deferred.reject)
    .always(function() {
        if (!usePaging && resultMeta.resultSetId != null) {
            XcalarSetFree(resultSetId);
        }
    });

    return deferred.promise();
};

function fetchData(resultSetId, rowPosition, rowsToFetch, totalRows) {
    var deferred = PromiseHelper.deferred();
    var finalData = [];
    XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRows, [], 0, 0)
    .then(function(result) {
        for (var i = 0, len = result.length; i < len; i++) {
            finalData.push(result[i]);
        }
        deferred.resolve(finalData);
    })
    .fail(deferred.reject);
    return deferred.promise();
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
                // add tablename to schema
                var tableNameCell = {};
                tableNameCell["XC_TABLENAME_" + publishArgs.sqlTable] = "string";
                schema.push(tableNameCell);
                res.push({
                    table: publishArgs.publishName,
                    schema: schema
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
        // add tablename to schema
        var tableNameCell = {};
        tableNameCell["XC_TABLENAME_" + sqlTable] = "string";
        schema.push(tableNameCell);
        var res = {
            tableName: sqlTableAlias,
            schema: schema
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
        deferred.resolve(publishedTables, res);
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
                "maxBatchId": batchIdMap ? batchIdMap[args[i].publishName] : -1,
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
    getSchema(tableName)
    .then(function(res) {
        return getDerivedCol(txId, tableName, res.schema, dstTable);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function getSchema(tableName, orderedColumns) {
    // If orderedColumns gets passed in, it's for running a SQL query
    var deferred = PromiseHelper.deferred();
    var promise;
    if (orderedColumns) {
        promise = XcalarGetTableMeta(tableName);
    } else {
        promise = getRows(tableName, 1, 1);
    }
    promise
    .then(function(res) {
        try {
            var colMap = {};
            var headers = [];
            var orderedHeaders = [];
            var renameMap = {};
            if (!orderedColumns) {
                var row = JSON.parse(res);
                for (var colName in row) {
                    if (colName.startsWith("XC_ROW_COL_")) {
                        // this is auto-generated by xcalar
                        continue;
                    }
                    var type = typeof row[colName];
                    if (type === "array" || type === "object") {
                        // array and object will be projected away
                        continue;
                    } else if (type === "number") {
                        type = "float";
                    }
                    colMap[colName] = type;
                    headers.push(colName);
                }
                // Only for loading datasets & sending schema
                orderedHeaders = headers.sort();
            } else {
                var tableMeta = res;
                if (tableMeta == null || tableMeta.valueAttrs == null) {
                    deferred.reject("Failed to get table meta for final result");
                    return;
                }
                var valueAttrs = tableMeta.valueAttrs;
                for (var i = 0; i < valueAttrs.length; i++) {
                    var colName = valueAttrs[i].name;
                    var type = getColType(valueAttrs[i].type);

                    if (colName.startsWith("XC_ROW_COL_") ||
                        colName.startsWith("XCALARRANKOVER") ||
                        colName.startsWith("XCALAROPCODE") ||
                        colName.startsWith("XCALARBATCHID") ||
                        colName.startsWith("XCALARROWNUMPK")) {
                        // this is auto-generated by xcalar
                        continue;
                    }
                    colMap[colName] = type;
                    headers.push(colName);
                }
                var colNameSet = new Set();
                for (var i = 0; i < orderedColumns.length; i++) {
                    var found = false;
                    if (colNameSet.has(orderedColumns[i].colName)) {
                        var k = 1;
                        while (colNameSet.has(orderedColumns[i].colName + "_" + k)) {
                            k++;
                        }
                        orderedColumns[i].colName = orderedColumns[i].colName + "_" + k;
                    }
                    colNameSet.add(orderedColumns[i].colName);
                    var colName = orderedColumns[i].colName;
                    if (orderedColumns[i].rename) {
                        renameMap[colName] = orderedColumns[i].rename;
                        colName = orderedColumns[i].rename;
                    }
                    if (colName.startsWith("XC_ROW_COL_") ||
                        colName.startsWith("XCALARRANKOVER") ||
                        colName.startsWith("XCALAROPCODE") ||
                        colName.startsWith("XCALARBATCHID") ||
                        colName.startsWith("XCALARROWNUMPK")) {
                        // this is auto-generated by xcalar
                        continue;
                    }
                    var prefix = colName;
                    if (colName.indexOf("::") > 0) {
                        prefix = colName.split("::")[0];
                        colName = colName.split("::")[1];
                    }
                    for (var j = 0; j < headers.length; j++) {
                        var name = headers[j];
                        if (name === colName || name === prefix) {
                            found = true;
                            orderedHeaders.push(orderedColumns[i].colName);
                            break;
                        }
                    }
                    if (!found) {
                        deferred.reject("Columns don't match after compilation");
                    }
                }
            }

            var schema = orderedHeaders.map(function(header) {
                var cell = {};
                cell[header] = renameMap[header] ? colMap[renameMap[header]] :
                                                   colMap[header];
                return cell;
            });
            deferred.resolve({schema: schema, renameMap: renameMap});
        } catch (e) {
            xcConsole.error("parse error", e);
            deferred.reject(e);
        }
    })
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

function getTablesFromQueryViaParser(sqlStatement,
    listOfPubTables) {
    var chars = new antlr4.InputStream(sqlStatement);
    var lexer = new SqlBaseLexer(chars);
    var tokens  = new antlr4.CommonTokenStream(lexer);
    var parser = new SqlBaseParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.statement();

    var visitor = new TableVisitor();
    visitor.visitTables(tree);

    var imdTables = [];
    var xdTables = [];
    var upperCaseListOfPubTables = listOfPubTables.map(function(v) {
        return v.toUpperCase();
    });
    var backtickedListOfPubTables = upperCaseListOfPubTables.map(function(v) {
        return "`" + v + "`";
    });
    visitor.tableIdentifiers.forEach(function(identifier) {
        var identifierUppercase = identifier.toUpperCase();
        if (visitor.namedQueries.indexOf(identifier) === -1) {
            var idx = upperCaseListOfPubTables.indexOf(identifierUppercase);
            if (idx === -1) {
                idx = backtickedListOfPubTables.indexOf(identifierUppercase);
            }
            if (idx > -1) {
                imdTables.push(listOfPubTables[idx]);
            } else {
                xdTables.push(identifier);
            }
        }
    });
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
    var url = "http://localhost:27000/xcesql/" + type + "/";
    if (type !== "sqlquery") {
        url += encodeURIComponent(encodeURIComponent(sessionPrefix + username +
            "-wkbk-" + wkbkName));
    } else {
        url += encodeURIComponent(encodeURIComponent(sessionPrefix + username +
            "-wkbk-" + wkbkName)) + "/true/true";
    }

    request({
        method: method,
        url: url,
        json: true,
        body: data
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (requestStruct.data && requestStruct.data.sqlQuery) {
                    deferred.resolve(JSON.parse(body.sqlQuery));
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.reject(error);
            }
        }
    );
    return deferred.promise();
}

function getResults(finalTable, orderedColumns, rowsToFetch, execid, usePaging) {
    var deferred = jQuery.Deferred();
    var schema;
    var renameMap;
    getSchema(finalTable, orderedColumns)
    .then(function(res) {
        schema = res.schema;
        renameMap = res.renameMap;
        return getRows(finalTable, 1, rowsToFetch, usePaging);
    })
    .then(function(data) {
        var res = {
            execid: execid,
            schema: schema,
            tableName: finalTable
        };
        if (usePaging) {
            res.resultSetId = data.resultSetId;
            res.totalRows = data.totalRows;
            res.renameMap = renameMap;
        } else {
            var result = parseRows(data, schema, renameMap);
            xcConsole.log("Final table schema: " + JSON.stringify(schema));
            res.result = result;
        }
        deferred.resolve(res);
    })
    .fail(deferred.reject);
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

function getInfoForXDTable(tableName) {
    var deferred = PromiseHelper.deferred();
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
                colType !== "string") {
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

function collectTablesMetaInfo(queryStr, tablePrefix) {
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

    listPublishedTables("*")
    .then(function(allPubTableNames, res) {
        var allTables = getTablesFromQueryViaParser(queryStr,
                                                allPubTableNames);
        var imdTables = allTables[0];
        var xdTables = allTables[1];
        console.log("IMD tables are", imdTables);
        console.log("XD tables are", xdTables);
        var tableValidPromiseArray = [];
        for (var imdTable of imdTables) {
            var tableStruct = getInfoForPublishedTable(res, imdTable);
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
            tableValidPromiseArray.push(getInfoForXDTable(xdTable));
        }

        return PromiseHelper.when(...tableValidPromiseArray);
    })
    .then(function() {
        var returns = arguments;
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
    setupConnection(params.userName, params.userId,
        params.sessionName)
    .then(function () {
        return collectTablesMetaInfo(params.queryString,
                                tablePrefix)
    })
    .then(function(selQuery, schemas, selects) {
        allSelects = selects;
        selectQuery = selQuery;
        var schemasToSendToSqlDf = [];
        for (var pubTable in schemas) {
            var tableNameCol = {};
            tableNameCol["XC_TABLENAME_" + selects[pubTable]] = "string";
            schemas[pubTable].push(tableNameCol);
            schemasToSendToSqlDf.push({
                tableName: pubTable,
                tableColumns: schemas[pubTable]
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
    .then(function(plan) {
        return compilerObject.compile(queryName, plan, true, option);
    })
    .then(function(xcQueryString, newTableName, colNames, toCache) {
        xcConsole.log("Compilation finished");
        orderedColumns = colNames;
        var optimizerObject = new SQLOptimizer();
        var queryWithDrop = optimizerObject.logicalOptimize(xcQueryString,
                                    optimizations, JSON.stringify(selectQuery));
        var prefixStruct = addPrefix(
            JSON.parse(queryWithDrop),
            allSelects,
            newTableName,
            tablePrefix,
            params.usePaging,
            params.resultTableName);
        var prefixedQuery = prefixStruct.query;
        finalTable = prefixStruct.tableName || newTableName;
        return compilerObject.execute(prefixedQuery, finalTable, orderedColumns,
                                      params.queryString, undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        // Drop schema on planner
        var tableNames = [];
        for (var pubTable in allSelects) {
            tableNames.push(pubTable);
        }
        var requestStruct = {
            type: "schemasdrop",
            method: "delete",
            data: tableNames
        }
        sendToPlanner(tablePrefix, requestStruct,
                      params.userName, params.sessionName);
        if (compilerObject.getStatus() === SQLStatus.Cancelled) {
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        if (type === "odbc") {
            return getResults(finalTable, orderedColumns, params.rowsToFetch,
                            params.execid, params.usePaging);
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
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    })
    .always(function() {
        XIApi.deleteTable(1, tablePrefix + "*");
        xcConsole.log("sql query finishes.");
    });

    return deferred.promise();
};

function addPrefix(plan, selectTables, finalTable,
    prefix, usePaging, newSqlTable) {
    var retStruct = {};
    for (var i = 0; i < plan.length; i++) {
        var operation = plan[i];
        var source = operation.args.source;
        var dest = operation.args.dest;
        if (!source || !dest) {
            const namePattern = operation.args.namePattern;
            if (!namePattern.startsWith(prefix)) {
                operation.args.namePattern = prefix + namePattern;
            }
            continue;
        }
        if (typeof(source) === "string") {
            source = [source];
        }
        var newName;
        for (var j = 0; j < source.length; j++) {
            if (source[j] in selectTables) {
                continue;
            }
            if (!source[j].startsWith(prefix)) {
                if (source.length === 1) {
                    operation.args.source = prefix + source[j];
                } else {
                    operation.args.source[j] = prefix + source[j];
                }
            }
        }
        var newTableName = dest;
        if (!dest.startsWith(prefix)) {
            newTableName = prefix + newTableName;
        }
        if (dest === finalTable) {
            if (newSqlTable) {
                newTableName = newSqlTable;
            }
            if (usePaging) {
                newTableName = "res_" + newTableName;
            }
            retStruct.tableName = newTableName;
        }
        operation.args.dest = newTableName;
    }
    retStruct.query = JSON.stringify(plan);
    return retStruct;
}

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
        return getResults(finalTable, orderedColumns, rowsToFetch);
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
        XIApi.deleteTable(1, sessionPrefix + "*");
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

function parseRows(data, schema, renameMap) {
    try {
        var typeMap = {};
        var headers = schema.map(function(cell) {
            typeMap[Object.keys(cell)[0]] = cell[Object.keys(cell)[0]];
            return Object.keys(cell)[0];
        });
        var rows = data.map(function(row) {
            row = JSON.parse(row);
            return headers.map(function(header) {
                var value = renameMap[header] ? row[renameMap[header]] : row[header];
                if (typeMap[header] !== "string" && (value === "inf" || value === "-inf")) {
                    value = null;
                }
                return value;
            });
        });
        return rows;
    } catch (e) {
        console.error(e);
        return null;
    }
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

function getColType(typeId) {
    // XXX TODO generalize it with setImmediateType()
    if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
        // error case
        console.error("Invalid typeId");
        return null;
    }
    return xcHelper.convertFieldTypeToColType(typeId);
}

router.post("/xcsql/query", function(req, res) {
    req.setTimeout(14400000);
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
        optimizations: optimizations,
        usePaging: true // this is to keep resultant table
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

router.post("/xcsql/result", [support.checkAuth], function(req, res) {
    var resultSetId = req.body.resultSetId;
    var rowPosition = parseInt(req.body.rowPosition);
    var rowsToFetch = parseInt(req.body.rowsToFetch);
    var totalRows = parseInt(req.body.totalRows);
    var schema = JSON.parse(req.body.schema);
    var renameMap = JSON.parse(req.body.renameMap);
    fetchData(resultSetId, rowPosition, rowsToFetch, totalRows, [], 0, 0)
    .then(function(data) {
        var result = parseRows(data, schema, renameMap);
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
    XIApi.deleteTable(1, tableName)
    .then(function() {
        xcConsole.log("cleaned table and free result set for: ", tableName);
        res.send({sucess: true});
    })
    .fail(function(error) {
        xcConsole.log("fetching data error: ", error);
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
    .then(function(tables, results) {
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
