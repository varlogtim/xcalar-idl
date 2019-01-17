const { parentPort, workerData } = require('worker_threads');
require("jsdom/lib/old-api").env("", function(err, window) {
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

    let sqlHelpers;
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
    global.Authentication = {
        getHashId: function() {
            return xcHelper.randName("#", 8);
        }
    };
    global.Log = Log = {
        errorLog: function() { xcConsole.log(arguments); }
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

    global.httpStatus = httpStatus = require("../../../assets/js/httpStatus.js").httpStatus;
    global.XDParser = XDParser = {};
    XDParser.XEvalParser = require("../xEvalParser/index.js").XEvalParser;

    // Worker's job starts from here
    const compilerObject = new SQLCompiler();
    parentPort.on("message", (data) => {
        const { queryName,
            planStr,
            isJsonPlan,
            option,
            optimizations,
            selectQuery,
            allSelects,
            params,
            type
        } = data;
        let finalTable;
        let orderedColumns;
        compilerObject.compile(queryName, planStr, isJsonPlan, option)
        .then(function(xcQueryString, newTableName, colNames, toCache) {
            orderedColumns = colNames;
            var optimizerObject = new SQLOptimizer();
            var queryWithDrop = optimizerObject.logicalOptimize(xcQueryString,
                                        optimizations, JSON.stringify(selectQuery));
            var prefixStruct = addPrefix(
                JSON.parse(queryWithDrop),
                allSelects,
                newTableName,
                params.sessionPrefix,
                params.usePaging);
            var prefixedQuery = prefixStruct.query;
            finalTable = prefixStruct.tableName || newTableName;
            var ret = {
                xcQueryString: prefixedQuery,
                newTableName: finalTable,
                colNames: colNames,
                toCache: toCache
            }
            parentPort.postMessage({success: true, data: ret});
        })
        .fail(function(err) {
            parentPort.postMessage({success: false, error: err});
        });
    });
});

function addPrefix(plan, selectTables, finalTable, prefix, usePaging) {
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
function getSchema(tableName, orderedColumns) {
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
function getColType(typeId) {
    // XXX TODO generalize it with setImmediateType()
    if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
        // error case
        console.error("Invalid typeId");
        return null;
    }
    return xcHelper.convertFieldTypeToColType(typeId);
}