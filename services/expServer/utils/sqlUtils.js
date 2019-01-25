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

// Added for KVS to query conversion
global.Ajv = require("../../../3rd/AJV/ajv.js");
global.XcUID = require("../../../assets/js/shared/util/XcUID.js").XcUID;

// The order of these is needed as there's dependancies between the files.
global.DagHelper = require("../DagHelperIndex.js").DagHelper;
global.DagNodeType = require("../dagHelper/DagEnums.js").DagNodeType
global.DagNodeSubType = require("../dagHelper/DagEnums.js").DagNodeSubType
global.DagNodeState = require("../dagHelper/DagEnums.js").DagNodeState
global.DagNodeEvents = require("../dagHelper/DagEnums.js").DagNodeEvents
global.DagNodeFactory = require("../dagHelper/DagNodeFactory.js").DagNodeFactory
global.DagNode = require("../dagHelper/node/DagNode.js").DagNode
global.DagNodeIn = require("../dagHelper/node/DagNodeIn.js").DagNodeIn
global.DagNodeDataset = require("../dagHelper/node/DagNodeDataset.js").DagNodeDataset
global.DagParamManager = require("../dagHelper/DagParamManager.js").DagParamManager
global.DagNodeInput = require("../dagHelper/nodeInput/DagNodeInput.js").DagNodeInput
global.DagLineage = require("../dagHelper/DagLineage.js").DagLineage
global.DagNodeDatasetInput = require("../dagHelper/nodeInput/DagNodeDatasetInput.js").DagNodeDatasetInput
global.XDFManager = require("../../../assets/js/components/worksheet/xdfManager.js").XDFManager
global.DagNodeMap = require("../dagHelper/node/DagNodeMap.js").DagNodeMap
global.DagNodeMapInput = require("../dagHelper/nodeInput/DagNodeMapInput.js").DagNodeMapInput
global.DagNodeOut = require("../dagHelper/node/DagNodeOut.js").DagNodeOut
global.DagNodeOutOptimizable = require("../dagHelper/node/DagNodeOutOptimizable.js").DagNodeOutOptimizable
global.DagNodeExport = require("../dagHelper/node/DagNodeExport.js").DagNodeExport
 global.DagNodeExportInput = require("../dagHelper/nodeInput/DagNodeExportInput.js").DagNodeExportInput
global.DagNodeSQLFuncIn = require("../dagHelper/node/DagNodeSQLFuncIn.js").DagNodeSQLFuncIn
global.CommentNode = require("../dagHelper/node/CommentNode.js").CommentNode
// XXX: Needed by DagGraph.getQuery()
global.DagTab = require("../dagHelper/DagTab.js").DagTab
// global.DagList = require("../dagHelper/DagList.js").DagList
// XXX: Needed by DagNodeExecutor
global.DagTblManager = require("../dagHelper/DagTblManager.js").DagTblManager
global.DagNodeExecutor = require("../dagHelper/DagNodeExecutor.js").DagNodeExecutor
global.DagGraphExecutor = require("../dagHelper/DagGraphExecutor.js").DagGraphExecutor
global.DagNodeFilter = require("../dagHelper/node/DagNodeFilter.js").DagNodeFilter
global.DagNodeFilterInput = require("../dagHelper/nodeInput/DagNodeFilterInput.js").DagNodeFilterInput

// Ordering may not yet be determined.

global.DagNodeAggregateInput = require("../dagHelper/nodeInput/DagNodeAggregateInput.js").DagNodeAggregateInput
global.DagNodeAggregate = require("../dagHelper/node/DagNodeAggregate.js").DagNodeAggregate
global.DagNodeCustom = require("../dagHelper/node/DagNodeCustom.js").DagNodeCustom
global.DagNodeCustomInput = require("../dagHelper/node/DagNodeCustomInput.js").DagNodeCustomInput
global.DagNodeCustomOutput = require("../dagHelper/node/DagNodeCustomOutput.js").DagNodeCustomOutput
global.DagNodeDFIn = require("../dagHelper/node/DagNodeDFIn.js").DagNodeDFIn
global.DagNodeDFInInput = require("../dagHelper/nodeInput/DagNodeDFInInput.js").DagNodeDFInInput
global.DagNodeDFOut = require("../dagHelper/node/DagNodeDFOut.js").DagNodeDFOut
global.DagNodeDFOutInput = require("../dagHelper/nodeInput/DagNodeDFOutInput.js").DagNodeDFOutInput
global.DagNodeExplode = require("../dagHelper/node/DagNodeExplode.js").DagNodeExplode
global.DagNodeExtension = require("../dagHelper/node/DagNodeExtension.js").DagNodeExtension
global.DagNodeExtensionInput = require("../dagHelper/nodeInput/DagNodeExtensionInput.js").DagNodeExtensionInput
global.DagNodeGroupBy = require("../dagHelper/node/DagNodeGroupBy.js").DagNodeGroupBy
global.DagNodeGroupByInput = require("../dagHelper/nodeInput/DagNodeGroupByInput.js").DagNodeGroupByInput
global.DagNodeIMDTable = require("../dagHelper/node/DagNodeIMDTable.js").DagNodeIMDTable
global.DagNodeIMDTableInput = require("../dagHelper/nodeInput/DagNodeIMDTableInput.js").DagNodeIMDTableInput

global.DagNodeIndex = require("../dagHelper/node/DagNodeIndex.js").DagNodeIndex
global.DagNodeIndexInput = require("../dagHelper/nodeInput/DagNodeIndexInput.js").DagNodeIndexInput
global.DagNodeJoinInput = require("../dagHelper/nodeInput/DagNodeJoinInput.js").DagNodeJoinInput
global.DagNodeJoin = require("../dagHelper/node/DagNodeJoin.js").DagNodeJoin
global.DagNodeJupyter = require("../dagHelper/node/DagNodeJupyter.js").DagNodeJupyter
global.DagNodeJupyterInput = require("../dagHelper/nodeInput/DagNodeJupyterInput.js").DagNodeJupyterInput
global.DagNodePlaceholder = require("../dagHelper/node/DagNodePlaceholder.js").DagNodePlaceholder
global.DagNodePlaceholderInput = require("../dagHelper/nodeInput/DagNodePlaceholderInput.js").DagNodePlaceholderInput
global.DagNodeProject = require("../dagHelper/node/DagNodeProject.js").DagNodeProject
global.DagNodeProjectInput = require("../dagHelper/nodeInput/DagNodeProjectInput.js").DagNodeProjectInput
global.DagNodePublishIMD = require("../dagHelper/node/DagNodePublishIMD.js").DagNodePublishIMD
global.DagNodePublishIMDInput = require("../dagHelper/nodeInput/DagNodePublishIMDInput.js").DagNodePublishIMDInput
global.DagNodeRound = require("../dagHelper/node/DagNodeRound.js").DagNodeRound
global.DagNodeRowNum = require("../dagHelper/node/DagNodeRowNum.js").DagNodeRowNum
global.DagNodeRowNumInput = require("../dagHelper/nodeInput/DagNodeRowNumInput.js").DagNodeRowNumInput
global.DagNodeSQL = require("../dagHelper/node/DagNodeSQL.js").DagNodeSQL
global.DagNodeSQLFuncOut = require("../dagHelper/node/DagNodeSQLFuncOut.js").DagNodeSQLFuncOut
global.DagNodeSQLSubInput = require("../dagHelper/node/DagNodeSQLSubInput.js").DagNodeSQLSubInput
global.DagNodeSQLSubOutput = require("../dagHelper/node/DagNodeSQLSubOutput.js").DagNodeSQLSubOutput
global.DagNodeSet = require("../dagHelper/node/DagNodeSet.js").DagNodeSet
global.DagNodeSetInput = require("../dagHelper/nodeInput/DagNodeSetInput.js").DagNodeSetInput
global.DagNodeSort = require("../dagHelper/node/DagNodeSort.js").DagNodeSort
global.DagNodeSortInput = require("../dagHelper/nodeInput/DagNodeSortInput.js").DagNodeSortInput
global.DagNodeSplit = require("../dagHelper/node/DagNodeSplit.js").DagNodeSplit
global.DagNodeSynthesize = require("../dagHelper/node/DagNodeSynthesize.js").DagNodeSynthesize
global.DagNodeSynthesizeInput = require("../dagHelper/nodeInput/DagNodeSynthesizeInput.js").DagNodeSynthesizeInput
global.DagNodeUpdateIMD = require("../dagHelper/node/DagNodeUpdateIMD.js").DagNodeUpdateIMD

// Call init routines
global.DagNode.setup();
global.DagTab.setup();

function hackFunction() {

    // Some browsers and node.js don't support Object.values
    if (!Object.values) Object.values = o=>Object.keys(o).map(k=>o[k]);

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
            return new ProgCol ( {
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
            } )
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

    class ProgCol {
        constructor(options) {
            options = options || {};
            this.backName = options.backName;
            this.name = options.name;
            this.type = options.type || null;
            this.width = 100;
            this.isNewCol = false;
            this.userStr = options.userStr;
            this.func = options.func;
            this.sizedTo = options.sizedTo
        }

        getBackColName() {
            return this.backName
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
