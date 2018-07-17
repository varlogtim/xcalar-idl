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

// Antlr4 SQL Parser
var SqlBaseListener;
var SqlBaseParser;
var SqlBaseLexer;
var SqlBaseVisitor;
var TableVisitor;
var antlr4;

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

    SqlBaseListener = require("../sqlParser/SqlBaseListener.js").SqlBaseListener;
    SqlBaseParser = require("../sqlParser/SqlBaseParser.js").SqlBaseParser;
    SqlBaseLexer = require("../sqlParser/SqlBaseLexer.js").SqlBaseLexer;
    SqlBaseVisitor = require("../sqlParser/SqlBaseVisitor.js").SqlBaseVisitor;
    TableVisitor = require("../sqlParser/TableVisitor.js").TableVisitor;
    antlr4 = require('antlr4/index');
});

function generateJDBCId(userName, wkbkName) {
    var curNum = idNum;
    idNum++;
    return userName + "-wkbk-" + wkbkName + "-" + Date.now() + "#JDBC" + curNum;
}

function hackFunction() {
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

    global.Log = {
        errorLog: function() { console.log.apply(this, arguments); }
    };
    global.DagEdit = {
        isEditMode: function() { return false; }
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

var sqlTable;
var sqlUser = "xcalar-internal-sql";
var sqlId = 4193719;

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
                console.log("get schema", schema);
                sqlTables.push(publishArgs.sqlTable);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);
        promiseArray.push(innerDeferred.promise());
    });
    PromiseHelper.when.apply(this, promiseArray)
    .then(function() {
        if (cleanup) {
            console.log("clean up after select");
            return cleanAllTables(sqlTables, checkTime);
        }
    })
    .then(function() {
        deferred.resolve(res);
    })
    .fail(deferred.reject);
    return deferred.promise();
}

function sqlSelect(publishNames, sessionId, cleanup, checkTime) {
    var deferred = PromiseHelper.deferred();
    var sqlTableAlias = "sql";
    var res;
    var publishArgsList = [];
    connect("localhost", sqlUser, sqlId)
    .then(function() {
        console.log("Connected. Going to workbook...");
        return goToSqlWkbk();
    })
    .then(function() {
        console.log("Selecting published tables: ", publishNames);
        publishArgsList = publishNames.map(function(name) {
            return {
                    sqlTable: sessionId + xcHelper.randName("SQL") +
                                                     Authentication.getHashId(),
                    importTable: xcHelper.randName("importTable") +
                                                     Authentication.getHashId(),
                    txId: 1,
                    publishName: name
            };
        });
        return loadPublishedTables(publishArgsList, checkTime);
    })
    .then(function() {
        console.log("Finalizing tables");
        return finalizeTable(publishArgsList, cleanup, checkTime);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function sqlLoad(path) {
    sqlTable = xcHelper.randName("SQL") + Authentication.getHashId();
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

    connect("localhost", sqlUser, sqlId)
    .then(function() {
        console.log("connected");
        return goToSqlWkbk();
    })
    .then(function() {
        return loadDatasets(args);
    })
    .then(function() {
        console.log("create table");
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
        console.log("get schema", schema);
        deferred.resolve(res);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
};


function listPublishTables(pattern) {
    var deferred = PromiseHelper.deferred();
    connect("localhost", sqlUser, sqlId)
    .then(function() {
        console.log("connected");
        var pubPatternMatch = pattern || "*";
        return XcalarListPublishedTables(pubPatternMatch);
    })
    .then(function(res) {
        var publishedTables = [];
        for (var i = 0; i < res.tables.length; i++) {
            var table = res.tables[i];
            publishedTables.push(table.name);
        }
        deferred.resolve(publishedTables);
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function connect(hostname, username, id) {
    var valid = xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (valid) {
        if (getTHandle() == null) {
            setupThrift(hostname);
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
        console.log("Activating workbook: ", ret);
        setSessionName(wkbkName);
        deferred.resolve(ret);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function loadPublishedTables(args, checkTime) {
    var queryArray = [];
    for (var i = 0; i < args.length; i++) {
        var query = {
            "operation": "XcalarApiSelect",
            "args": {
                "source": args[i].publishName,
                "dest": args[i].importTable,
                "minBatchId": -1,
                "maxBatchId": -1
            }
        }
        queryArray.push(query);
    }
    return XIApi.query(1, "JDBC Select" + Math.ceil(Math.random() * 100000),
        JSON.stringify(queryArray), checkTime);
    // return XIApi.query(1, "JDBCSelect" + generateJDBCId(userName, wkbkName), JSON.stringify(queryArray), checkTime);
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
        console.log("load dataset");
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

                    if (colName.startsWith("XC_ROW_COL_")) {
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
            console.error("parse error", e);
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

function getListOfPublishedTablesFromQuery(sqlStatement, listOfPubTables) {
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
    visitor.tableIdentifiers.forEach(function(identifier) {
        if (visitor.namedQueries.indexOf(identifier) === -1) {
            if (listOfPubTables.indexOf(identifier) > -1) {
                tableIdentifiers.push(identifier);
            } else {
                errorTables.push(identifier);
            }
        }
    });

    if (errorTables.length > 0) {
        return "Please publish these tables first: " + JSON.stringify(errorTables);
    }
    return tableIdentifiers;
}

function sqlPlan(execid, planStr, rowsToFetch, sessionId, checkTime) {
    var deferred = PromiseHelper.deferred();
    if (rowsToFetch == null) {
        rowsToFetch = 10; // default to be 10
    }
    var finalTable;
    var schema;
    var orderedColumns;
    var renameMap;

    try {
        var plan = JSON.parse(planStr);
        connect("localhost", sqlUser, sqlId)
        .then(function() {
            console.log("connected");
            return goToSqlWkbk();
        })
        .then(function() {
            console.log(sessionId, " starts compiling...");
            var jdbcOption = {
                prefix: sessionId,
                jdbcCheckTime: checkTime,
                sqlMode: true
            };
            var queryName = "sql" + sessionId;
            return new SQLCompiler().compile(queryName, plan, true, jdbcOption);
        })
        .then(function(res) {
            console.log("compiling finished!");
            tableName = res[0];
            orderedColumns = res[1];
            console.log("get table from plan", tableName);
            finalTable = tableName;
            return getSchema(finalTable, orderedColumns);
        })
        .then(function(res) {
            schema = res.schema;
            renameMap = res.renameMap;
            return getRows(finalTable, 1, rowsToFetch);
        })
        .then(function(data) {
            var result = parseRows(data, schema, renameMap);
            console.log("schema:" + JSON.stringify(schema));
            XIApi.deleteTable(1, finalTable);
            var res = {
                execid: execid,
                schema: schema,
                result: result
            };
            deferred.resolve(res);
        })
        .fail(function(err) {
            deferred.reject(err);
        });
    } catch (e) {
        console.error("plan parse error", e);
        deferred.reject(e);
    }

    return deferred.promise();
};

function sqlQuery(userIdName, userIdUnique, wkbkName, queryString, queryTablePrefix) {
    var deferred = PromiseHelper.deferred();
    connect("localhost", userIdName, userIdUnique)
    .then(function() {
        console.log("connected");
        return goToSqlWkbk(wkbkName);
    })
    .then(function() {
        var innerDeferred = PromiseHelper.deferred();
        var url = "http://127.0.0.1:27000/xcesql/sqlquery/" +
                encodeURIComponent(encodeURIComponent(userIdName + "-wkbk-" + wkbkName)) +
                "/true/true";
        request.post(
            url,
            {json: {sqlQuery: queryString}},
            function (error, response, body) {
                if (!error && response.statusCode == 200) {
                    innerDeferred.resolve(JSON.parse(body.sqlQuery));
                } else {
                    innerDeferred.reject(error);
                }
            }
        );
        return innerDeferred.promise();
    })
    .then(function(plan) {
        console.log(queryTablePrefix, " starts compiling...");
        var option = {prefix: queryTablePrefix,
                      sqlMode: true};
        var queryName = "sql" + queryTablePrefix;
        return new SQLCompiler().compile(queryName, plan, true, option);
    })
    .then(function(res) {
        console.log("compiling finished!");
        var result = {
            tableName: res[0],
            columns: res[1]
        }
        deferred.resolve(result)
    })
    .fail(function(err) {
        deferred.reject(err);
    });
    return deferred.promise();
};

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
    console.log("load sql path", path);
    sqlLoad(path)
    .then(function(output) {
        console.log("sql load finishes");
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql load error", error);
        res.status(500).send(error);
    });
});

router.post("/xcedf/select", function(req, res) {
    try {
        var publishNames = JSON.parse(req.body.names);
    } catch (err) {
        res.status(500).send("Invalid table names.");
        return;
    }
    var sessionId = req.body.sessionId;
    var cleanup = (req.body.cleanup === "true");
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionId = "src" + sessionId.replace(/-/g, "") + "_";
    console.log("load from published table: ", publishNames);
    sqlSelect(publishNames, sessionId, cleanup, checkTime)
    .then(function(output) {
        console.log("sql load published table finishes");
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql load error", error);
        res.status(500).send(error);
    });
});

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
    console.log("deleting: ", JSON.stringify(allIds));
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

router.post("/sql/query", function(req, res) {
    var userIdName = req.body.userIdName;
    var userIdUnique = req.body.userIdUnique;
    var wkbkName = req.body.wkbkName;
    var queryString = req.body.queryString;
    var queryTablePrefix = req.body.queryTablePrefix;
    sqlQuery(userIdName, userIdUnique, wkbkName, queryString, queryTablePrefix)
    .then(function(output) {
        console.log("sql query finishes");
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcedf/query", function(req, res) {
    var execid = req.body.execid;
    var plan = req.body.plan;
    var limit = req.body.limit;
    var sessionId = req.body.sessionId;
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionId = "sql" + sessionId.replace(/-/g, "") + "_";
    sqlPlan(execid, plan, limit, sessionId, checkTime)
    .then(function(output) {
        console.log("sql query finishes");
        res.send(output);
    })
    .fail(function(error) {
        console.log("sql query error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcedf/list", function(req, res) {
    var pattern = req.body.pattern;
    listPublishTables(pattern)
    .then(function(tables) {
        console.log("get published tables: ", tables);
        res.send(tables);
    })
    .fail(function(error) {
        console.log("get published tables error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcedf/clean", function(req, res) {
    var sessionId = req.body.sessionId;
    var type = req.body.type;
    var checkTime = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    var srcId = "src" + sessionId.replace(/-/g, "") + "_";
    var otherId = "sql" + sessionId.replace(/-/g, "") + "_";
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
        console.log("all temp and result tables deleted");
        res.send(output);
    })
    .fail(function(error) {
        console.log("clean tables error: ", error);
        res.send("Some tables are not deleted because: " + JSON.stringify(error));
    });
});

// For unit tests
function fakeSqlLoad(func) {
    sqlLoad = func;
}
function fakeSqlPlan(func) {
    sqlPlan = func;
}
function fakeSqlSelect(func) {
    sqlSelect = func;
}
function fakeListPublishTables(func) {
    listPublishTables = func;
}
function fakeCleanAllTables(func) {
    cleanAllTables = func;
}
if (process.env.NODE_ENV === "test") {
    exports.sqlLoad = sqlLoad;
    exports.sqlPlan = sqlPlan;
    exports.sqlSelect = sqlSelect;
    exports.listPublishTables = listPublishTables;
    exports.cleanAllTables = cleanAllTables;
    // Stub functions
    exports.fakeSqlLoad = fakeSqlLoad;
    exports.fakeSqlPlan = fakeSqlPlan;
    exports.fakeSqlSelect = fakeSqlSelect;
    exports.fakeListPublishTables = fakeListPublishTables;
    exports.fakeCleanAllTables = fakeCleanAllTables;
}
exports.router = router;