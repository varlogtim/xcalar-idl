var SqlUtil = {};
global.Thrift = Thrift = require("../../../assets/js/thrift/thrift.js").Thrift;

var enumsPath = "../../../assets/js/thrift/";
var normalizedPath = require("path").join(__dirname, enumsPath);
var sqlHelpers;
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
global.xcalarApi = xcalarApi = require("../../../assets/js/thrift/XcalarApi.js");

global.PromiseHelper = PromiseHelper = require("../../../assets/js/promiseHelper.js");
global.Transaction = Transaction = sqlHelpers ? sqlHelpers.Transaction :
                                   require("../sqlHelpers/transaction.js").Transaction;

hackFunction();

require("../../../assets/js/XcalarThrift.js");
global.XIApi = XIApi = sqlHelpers ? sqlHelpers.XIApi :
                       require("../sqlHelpers/xiApi.js").XIApi;
global.SQLApi = SQLApi = sqlHelpers ? sqlHelpers.SQLApi :
                       require("../sqlHelpers/sqlApi.js").SQLApi;
global.SQLCompiler = SQLCompiler = sqlHelpers ? sqlHelpers.SQLCompiler :
              require("../sqlHelpers/sqlCompiler.js").SQLCompiler;
global.SQLOptimizer = SQLOptimizer = sqlHelpers ? sqlHelpers.SQLOptimizer :
               require("../sqlHelpers/optimizer.js").SQLOptimizer;
require("../../../assets/lang/en/jsTStr.js");

global.antlr4 = antlr4 = require('antlr4/index');
global.KVStore = KVStore = sqlHelpers ? sqlHelpers.KVStore :
                           require("../sqlHelpers/kvStore.js").KVStore;
// global.SqlQueryHistory = SqlQueryHistory = sqlHelpers ? sqlHelpers.SqlQueryHistory :
//                          require("../sqlHelpers/sqlQueryHistory.js").SqlQueryHistory;
global.httpStatus = httpStatus = require("../../../assets/js/httpStatus.js").httpStatus;

// Antlr4 SQL Parser
global.SqlBaseListener = SqlBaseListener = require("../sqlParser/SqlBaseListener.js").SqlBaseListener;
global.SqlBaseParser = SqlBaseParser = require("../sqlParser/SqlBaseParser.js").SqlBaseParser;
global.SqlBaseLexer = SqlBaseLexer = require("../sqlParser/SqlBaseLexer.js").SqlBaseLexer;
global.SqlBaseVisitor = SqlBaseVisitor = require("../sqlParser/SqlBaseVisitor.js").SqlBaseVisitor;
global.TableVisitor = TableVisitor = require("../sqlParser/TableVisitor.js").TableVisitor;
global.XDParser = XDParser = {};
XDParser.XEvalParser = require("../xEvalParser/index.js").XEvalParser;

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

SqlUtil.addPrefix = function(plan, selectTables, finalTable, prefix, usePaging) {
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
SqlUtil.getRows = function(tableName, startRowNum, rowsToFetch, usePaging) {
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
        return SqlUtil.fetchData(resultMeta.resultSetId, rowPosition, rowsToFetch,
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

SqlUtil.fetchData = function(resultSetId, rowPosition, rowsToFetch, totalRows) {
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
SqlUtil.getResults = function(finalTable, orderedColumns, rowsToFetch, execid, usePaging) {
    var deferred = jQuery.Deferred();
    var schema;
    var renameMap;
    SqlUtil.getSchema(finalTable, orderedColumns)
    .then(function(res) {
        schema = res.schema;
        renameMap = res.renameMap;
        return SqlUtil.getRows(finalTable, 1, rowsToFetch, usePaging);
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
            var result = SqlUtil.parseRows(data, schema, renameMap);
            xcConsole.log("Final table schema: " + JSON.stringify(schema));
            res.result = result;
        }
        deferred.resolve(res);
    })
    .fail(deferred.reject);
    return deferred.promise();
}
SqlUtil.getSchema = function(tableName, orderedColumns) {
    // If orderedColumns gets passed in, it's for running a SQL query
    var deferred = PromiseHelper.deferred();
    var promise;
    XcalarGetTableMeta(tableName)
    .then(function(res) {
        try {
            var colMap = {};
            var headers = [];
            var orderedHeaders = [];
            var renameMap = {};
            var tableMeta = res;
            if (tableMeta == null || tableMeta.valueAttrs == null) {
                deferred.reject("Failed to get table meta for final result");
                return;
            }
            var valueAttrs = tableMeta.valueAttrs;
            for (var i = 0; i < valueAttrs.length; i++) {
                var colName = valueAttrs[i].name;
                var type = SqlUtil.getColType(valueAttrs[i].type);

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
SqlUtil.getColType = function(typeId) {
    // XXX TODO generalize it with setImmediateType()
    if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
        // error case
        console.error("Invalid typeId");
        return null;
    }
    return xcHelper.convertFieldTypeToColType(typeId);
}
SqlUtil.parseRows = function(data, schema, renameMap) {
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
exports.SqlUtil = SqlUtil;
