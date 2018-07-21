var jQuery;
var $;
var xcalarApi;
var xcHelper;
var PromiseHelper;
var XIApi;
var Transaction;
var SQLApi;
var SQLCompiler;
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

    require("../../../assets/js/thrift/CsvLoadArgsEnums_types.js");
    require("../../../assets/js/thrift/DagRefTypeEnums_types.js");
    require("../../../assets/js/thrift/DagStateEnums_types.js");
    require("../../../assets/js/thrift/DagTypes_types.js");
    require("../../../assets/js/thrift/DataFormatEnums_types.js");
    require("../../../assets/js/thrift/DataTargetEnums_types.js");
    require("../../../assets/js/thrift/DataTargetTypes_types.js");
    require("../../../assets/js/thrift/FunctionCategory_types.js");
    require("../../../assets/js/thrift/JoinOpEnums_types.js");
    require("../../../assets/js/thrift/LibApisCommon_types.js");
    require("../../../assets/js/thrift/LibApisConstants_types.js");
    require("../../../assets/js/thrift/LibApisConstants_types.js");
    require("../../../assets/js/thrift/LibApisEnums_types.js");
    require("../../../assets/js/thrift/OrderingEnums_types.js");
    require("../../../assets/js/thrift/QueryStateEnums_types.js");
    require("../../../assets/js/thrift/SourceTypeEnum_types.js");
    require("../../../assets/js/thrift/Status_types.js");
    require("../../../assets/js/thrift/UdfTypes_types.js");
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
});

var gTurnSelectCacheOn = false;

function generateJDBCId(userName, wkbkName) {
    var curNum = idNum;
    idNum++;
    return userName + "-wkbk-" + wkbkName + "-" + Date.now() + "#JDBC" + curNum;
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
    global.DagEdit = {
        isEditMode: function() { return false; }
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

function getRows(tableName, startRowNum, rowsToFetch) {
    var deferred = PromiseHelper.deferred();

    if (tableName === null || startRowNum === null ||
        rowsToFetch <= 0)
    {
        deferred.reject("Invalid args in fetch data");
        return deferred.promise();
    }

    var resultSetId;
    var finalData;

    XcalarMakeResultSetFromTable(tableName)
    .then(function(res) {
        resultSetId = res.resultSetId;
        var totalRows = res.numEntries;

        if (totalRows == null || totalRows === 0) {
            deferred.reject("No Data!");
            return deferred.promise();
        }

        // startRowNum starts with 1, rowPosition starts with 0
        var rowPosition = startRowNum - 1;
        if (rowsToFetch == null) {
            rowsToFetch = totalRows;
        }
        rowsToFetch = Math.min(rowsToFetch, totalRows);
        return XcalarFetchData(resultSetId, rowPosition, rowsToFetch,
                               totalRows, [], 0, 0);
    })
    .then(function(result) {
        finalData = [];
        for (var i = 0, len = result.length; i < len; i++) {
            finalData.push(result[i]);
        }
        return XcalarSetFree(resultSetId);
    })
    .then(function() {
        deferred.resolve(finalData);
    })
    .fail(function(error) {
        if (resultSetId != null) {
            XcalarSetFree(resultSetId);
        }
        deferred.reject(error);
    });

    return deferred.promise();
};

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
    connect("localhost")
    .then(function() {
        xcConsole.log("connected");
        var pubPatternMatch = pattern || "*";
        return XcalarListPublishedTables(pubPatternMatch);
    })
    .then(function(res) {
        var publishedTables = [];
        for (var i = 0; i < res.tables.length; i++) {
            var table = res.tables[i];
            publishedTables.push(table.name);
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
    var valid = xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (valid) {
        if (getTHandle() == null) {
            setupThrift(hostname);
            Admin.addNewUser(username);
        }
        return XcalarGetVersion();
    } else {
        return PromiseHelper.reject("Authentication fails");
    }
};

function goToSqlWkbk(workbook) {
    var wkbkName = workbook || "sql-workbook";
    var deferred = PromiseHelper.deferred();
    var activeSessionNames = [];
    var sqlSession = null;

    XcalarListWorkbooks("*")
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
        if (activeSessionNames.indexOf(wkbkName) < 0) {
            return XcalarActivateWorkbook(wkbkName);
        } else {
            return PromiseHelper.resolve("already activated");
        }
    })
    .then(function(ret) {
        xcConsole.log("Activating workbook: ", ret);
        setSessionName(wkbkName);
        deferred.resolve(ret);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
}

function selectPublishedTables(args, allSchemas) {
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
    var data;
    getRows(tableName, 1, 1)
    .then(function(res) {
        data = res;
        if (orderedColumns) {
            return XcalarGetTableMeta(tableName);
        } else {
            return PromiseHelper.resolve();
        }
    })
    .then(function(tableMeta) {
        try {
            var row = JSON.parse(data);
            var colMap = {};
            var headers = [];
            var orderedHeaders = [];
            var renameMap = {};
            if (!orderedColumns) {
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
                if (tableMeta == null || tableMeta.valueAttrs == null) {
                    deferred.reject("Failed to get table meta for final result");
                    return;
                }
                var valueAttrs = tableMeta.valueAttrs;
                var row = JSON.parse(data);
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
                for (var i = 0; i < orderedColumns.length; i++) {
                    var found = false;
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

function getListOfPublishedTablesFromQueryViaParser(sqlStatement,
    listOfPubTables) {
    var chars = new antlr4.InputStream(sqlStatement.toUpperCase());
    var lexer = new SqlBaseLexer(chars);
    var tokens  = new antlr4.CommonTokenStream(lexer);
    var parser = new SqlBaseParser(tokens);
    parser.buildParseTrees = true;
    var tree = parser.statement();

    var visitor = new TableVisitor();
    visitor.visitTables(tree);

    var tableIdentifiers = [];
    var errorTables = [];
    var upperCaseListOfPubTables = listOfPubTables.map(function(v) {
        return v.toUpperCase();
    });
    var backtickedListOfPubTables = upperCaseListOfPubTables.map(function(v) {
        return "`" + v + "`";
    });
    visitor.tableIdentifiers.forEach(function(identifier) {
        if (visitor.namedQueries.indexOf(identifier) === -1) {
            var idx = upperCaseListOfPubTables.indexOf(identifier);
            if (idx === -1) {
                idx = backtickedListOfPubTables.indexOf(identifier);
            }
            if (idx > -1) {
                tableIdentifiers.push(listOfPubTables[idx]);
            } else {
                errorTables.push(identifier);
            }
        }
    });

    if (errorTables.length > 0) {
        return "Please publish these tables first: " +
            JSON.stringify(errorTables);
    }
    return tableIdentifiers;
}


function sendToPlanner(allSchemas, queryStr, username, wkbkName) {
    var type;
    var requestStruct;
    var method = "get";
    if (allSchemas) {
        method = "put";
        type = "schemasupdate";
        requestStruct = allSchemas;
    } else if (queryStr) {
        method = "post";
        type = "sqlquery";
        requestStruct = {"sqlQuery": queryStr};
    } else {
        return PromiseHelper.reject("Invalid args in sendToPlanner");
    }
    if (!username) {
        username = "xcalar-internal-sql";
        wkbkName = "sql-workbook";
    }
    var deferred = PromiseHelper.deferred();
    var url = "http://localhost:27000/xcesql/" + type + "/";
    if (type === "schemasupdate") {
        url += encodeURIComponent(encodeURIComponent(username + "-wkbk-" +
            wkbkName));
    } else {
        url += encodeURIComponent(encodeURIComponent(username + "-wkbk-" +
            wkbkName)) + "/true/true";
    }

    request({
        method: method,
        url: url,
        json: true,
        body: requestStruct
        },
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                if (queryStr) {
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

function getRowsAndCleanup(finalTable, orderedColumns, rowsToFetch, tablePrefix, execid) {
    var deferred = jQuery.Deferred();
    var schema;
    var renameMap;
    getSchema(finalTable, orderedColumns)
    .then(function(res) {
        schema = res.schema;
        renameMap = res.renameMap;
        return getRows(finalTable, 1, rowsToFetch);
    })
    .then(function(data) {
        var result = parseRows(data, schema, renameMap);
        xcConsole.log("Final table schema: " + JSON.stringify(schema));
        XIApi.deleteTable(1, tablePrefix + "*");
        var res = {
            execid: execid,
            schema: schema,
            result: result
        };
        deferred.resolve(res);
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function executeSqlWithQueryInteractivePublished(userIdName, userIdUnique,
    wbkbName, queryString, quertyTablePrefix) {
    // To implement
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
        var type = xcHelper.getDFFieldTypeToString(
            DfFieldTypeTFromStr[column.type]);
        colStruct[column.name] = type;
        schema.push(colStruct);
    }
    tableStruct.schema = schema;

    return tableStruct;
}

function selectUsedPublishedTables(queryStr, tablePrefix) {
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
                "found": false
            });
        }
        XcalarGetTableMeta(tableName)
        .then(function(ret) {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": true
            });
        })
        .fail(function() {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": false
            });
        });
        return deferred.promise();
    }

    var allSchemas = {};
    var allSelects = {};
    var deferred = jQuery.Deferred();
    var error = false;

    listPublishedTables("*")
    .then(function(allPubTableNames, res) {
        var usedTables = getListOfPublishedTablesFromQueryViaParser(queryStr,
            allPubTableNames);
        if (typeof(usedTables) !== "object") {
            return PromiseHelper.reject("Cannot find all published tables");
        }
        var tableValidPromiseArray = [];
        for (var usedTable of usedTables) {
            var tableStruct = getInfoForPublishedTable(res, usedTable);
            // schema must exist because getListOfPublishedTables ensures
            // that it exists
            allSchemas[usedTable] = tableStruct.schema;
            var candidateSelectTable = findValidLastSelect(tableStruct.selects,
                tableStruct.nextBatchId);
            allSelects[usedTable] = candidateSelectTable;
            tableValidPromiseArray.push(tableValid(usedTable, candidateSelectTable));
        }
        
        return PromiseHelper.when(...tableValidPromiseArray);
    })
    .then(function() {
        var returns = arguments;
        // XXX FIX ME We need to make sure from when we check to when we run
        // this call, that the table still exists and that no one has dropped
        // it in the meantime. Alternatively, we can just put in a backup clause
        for (var retStruct of returns) {
            if (!retStruct.found) {
                allSelects[retStruct.pubTableName] = undefined;
            }
        }
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
        deferred.resolve(selectPublishedTables(toSelect, allSchemas), allSchemas,
            allSelects);
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function executeSqlWithExtQuery(execid, queryStr, rowsToFetch, sessionPrefix,
                                checkTime, queryName) {
    var deferred = PromiseHelper.deferred();
    var finalTable;
    var orderedColumns;
    var tables;
    var allSchemas = [];
    var allPublishArgs = [];
    var option = {
        prefix: sessionPrefix,
        checkTime: checkTime,
        sqlMode: true,
        queryString: queryStr
    };

    var selectQuery = "";
    selectUsedPublishedTables(queryStr, sessionPrefix)
    .then(function(selQuery, schemas, selects) {
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
        return sendToPlanner(schemasToSendToSqlDf);
    })
    .then(function () {
        // get logical plan
        return sendToPlanner(undefined, queryStr);
    })
    .then(function(planStr) {
        return setupAndCompile(queryName, planStr, option)
    })
    .then(function(compilerObject, xcQueryString, newTableName, colNames) {
        xcConsole.log("Compilation finished");
        finalTable = newTableName;
        orderedColumns = colNames;
        var xcQueryWithSelect = JSON.stringify(selectQuery.concat(
            JSON.parse(xcQueryString)));
        return compilerObject.execute(xcQueryWithSelect, newTableName, colNames,
            queryStr, undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        return getRowsAndCleanup(finalTable, orderedColumns, rowsToFetch,
            sessionPrefix, execid);
    })
    .then(deferred.resolve)
    .fail(function(err) {
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
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

    setupAndCompile(queryName, planStr, option)
    .then(function(compilerObject, xcQueryString, newTableName, colNames) {
        xcConsole.log("Compilation finished!");
        finalTable = newTableName;
        orderedColumns = colNames;
        return compilerObject.execute(xcQueryString, finalTable, orderedColumns,
            "", undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        return getRowsAndCleanup(finalTable, orderedColumns, rowsToFetch,
            sessionPrefix);
    })
    .then(deferred.resolve)
    .fail(function(err) {
        var retObj = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    });
    
    return deferred.promise();
};

function executeSqlWithQueryInteractive(userIdName, userIdUnique, wkbkName,
    queryString, queryTablePrefix) {
    var deferred = PromiseHelper.deferred();
    var finalTable;
    var orderedColumns;
    var option = {
        prefix: queryTablePrefix,
        checkTime: checkTime,
        sqlMode: true,
        queryString: queryString
    };
    getSqlPlan(userIdName, wkbkName, queryString)
    .then(function(planStr) {
        return setupAndCompile(undefined, planStr, option, userIdName, userIdUnique);
    })
    .then(function(compilerObject, xcQueryString, newTableName, colNames) {
        xcConsole.log("Compilation finished!");
        finalTable = newTableName;
        orderedColumns = colNames;
        return compilerObject.execute(xcQueryString, finalTable, orderedColumns,
            queryString, undefined, option);
    })
    .then(function() {
        xcConsole.log("Execution finished!");
        var result = {
            tableName: finalTable,
            columns: orderedColumns
        }
        deferred.resolve(result);
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function setupAndCompile(queryName, plan, option, userIdName, userIdUnique, wkbkName) {
    var deferred = jQuery.Deferred();
    var compilerObject;
    connect("localhost", userIdName, userIdUnique)
    .then(function() {
        xcConsole.log("connected");
        return goToSqlWkbk(wkbkName);
    })
    .then(function() {
        xcConsole.log(option.prefix, " started compiling.");
        compilerObject = new SQLCompiler();
        var name = queryName || xcHelper.randName("sql");
        sqlCompilerObjects[name] = compilerObject;
        return compilerObject.compile(name, plan, true, option);
    })
    .then(function(xcQueryString, newTableName, colNames, toCache) {
        // TODO integrate toCache in the future
        deferred.resolve(compilerObject, xcQueryString, newTableName,
            colNames);
    })
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

function getSqlPlan(userIdName, wkbkName, queryString) {
    var deferred = PromiseHelper.deferred();
    var url = "http://127.0.0.1:27000/xcesql/sqlquery/" +
        encodeURIComponent(encodeURIComponent(userIdName + "-wkbk-" +
        wkbkName)) + "/true/true";
    request.post(url, {json: {sqlQuery: queryString}}, function(error, response,
        body) {
        if (!error && response.statusCode == 200) {
            deferred.resolve(JSON.parse(body.sqlQuery));
        } else {
            deferred.reject(error);
        }
    });
    return deferred.promise();
}

function parseRows(data, schema, renameMap) {
    try {
        var headers = schema.map(function(cell) {
            return Object.keys(cell)[0];
        });
        var rows = data.map(function(row) {
            row = JSON.parse(row);
            return headers.map(function(header) {
                return renameMap[header] ? row[renameMap[header]] : row[header];
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

    switch (typeId) {
        case DfFieldTypeT.DfUnknown:
            return ColumnType.unknown;
        case DfFieldTypeT.DfString:
            return ColumnType.string;
        case DfFieldTypeT.DfInt32:
        case DfFieldTypeT.DfInt64:
        case DfFieldTypeT.DfUInt32:
        case DfFieldTypeT.DfUInt64:
            return ColumnType.integer;
        case DfFieldTypeT.DfFloat32:
        case DfFieldTypeT.DfFloat64:
            return ColumnType.float;
        case DfFieldTypeT.DfBoolean:
            return ColumnType.boolean;
        case DfFieldTypeT.DfMixed:
            return ColumnType.mixed;
        case DfFieldTypeT.DfFatptr:
            return null;
        default:
            return null;
    }
}

router.post("/xcsql/query", [support.checkAuth], function(req, res) {
    var userIdName = req.body.userIdName;
    var userIdUnique = req.body.userIdUnique;
    var wkbkName = req.body.wkbkName;
    var queryString = req.body.queryString;
    var queryTablePrefix = req.body.queryTablePrefix;
    executeSqlWithQueryInteractive(userIdName, userIdUnique, wkbkName,
        queryString, queryTablePrefix)
    .then(function(output) {
        xcConsole.log("sql query finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

// XXX Some parameters need to be renamed
// apply similar code to /sql/query, or even simply merge them into one router 
// Only difference is they take different parameters
router.post("/xcsql/queryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    var execid = req.body.execid;
    var queryName = req.body.queryName;
    var queryString = req.body.queryString;
    var limit = req.body.limit;
    var sessionPrefix = req.body.sessionId;
    // jdbc only passes string to us
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionPrefix = "sql" + sessionPrefix.replace(/-/g, "") + "_";
    executeSqlWithExtQuery(execid, queryString, limit, sessionPrefix, checkTime, queryName)
    .then(function(output) {
        xcConsole.log("sql query finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
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
    listPublishedTables(pattern)
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
exports.router = router;