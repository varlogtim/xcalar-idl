var xcalar = require('xcalar');
var dataflow_pb = proto.xcalar.compute.localtypes.Dataflow;

function indexFromDataset(indexRequest) {
    var deferred = PromiseHelper.deferred();
    var dsName = indexRequest.getDsname();
    var prefix = indexRequest.getPrefix();
    var newTableName = indexRequest.getDsttablename();
    var txId = Transaction.start({ "simulate": true });
    XIApi.indexFromDataset(txId, dsName, newTableName, prefix)
        .then(function (ret) {
            const dstTable = ret.newTableName;
            const prefix = ret.prefix;
            var indexResponse = new dataflow_pb.IndexFromDatasetResponse();
            indexResponse.setQuerystr(Transaction.done(txId));
            indexResponse.setNewtablename(dstTable);
            indexResponse.setPrefix(prefix);
            deferred.resolve(indexResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.IndexFromDataset = indexFromDataset;

function filter(filterRequest) {
    var deferred = PromiseHelper.deferred();
    var fltStr = filterRequest.getFilterstr();
    var tableName = filterRequest.getSrctablename();
    var newTableName = filterRequest.getDsttablename();
    var txId = Transaction.start({ "simulate": true });
    XIApi.filter(txId, fltStr, tableName, newTableName)
        .then(function (dstTable) {
            var filterResponse = new dataflow_pb.FilterResponse();
            filterResponse.setQuerystr(Transaction.done(txId));
            filterResponse.setNewtablename(dstTable);
            deferred.resolve(filterResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Filter = filter;

function aggregate(aggRequest) {
    var deferred = PromiseHelper.deferred();
    var aggOp = aggRequest.getAggop();
    var colName = aggRequest.getColname();
    var tableName = aggRequest.getSrctablename();
    var dstAggName = aggRequest.getDstaggname();
    var txId = Transaction.start({ "simulate": true });
    XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName)
        .then(function (aggVal, dstAggName, toDelete) {
            var aggResponse = new dataflow_pb.AggregateResponse();
            aggResponse.setQuerystr(Transaction.done(txId));
            aggResponse.setAggval(aggVal);
            aggResponse.setDstaggname(dstAggName);
            aggResponse.setTodelete(toDelete);
            deferred.resolve(aggResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Aggregate = aggregate;

function map(mapRequest) {
    var deferred = PromiseHelper.deferred();
    var mapStrs = mapRequest.getMapstrsList();
    var newColNames = mapRequest.getNewcolnamesList();
    var tableName = mapRequest.getSrctablename();
    var newTableName = mapRequest.getDsttablename();
    var icvMode = mapRequest.getIcvmode();
    var txId = Transaction.start({ "simulate": true });
    XIApi.map(txId, mapStrs, tableName, newColNames, newTableName, icvMode)
        .then(function (dstTable) {
            var mapResponse = new dataflow_pb.MapResponse();
            mapResponse.setQuerystr(Transaction.done(txId));
            mapResponse.setNewtablename(dstTable);
            deferred.resolve(mapResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Map = map;

function genRowNum(genRowNumRequest) {
    var deferred = PromiseHelper.deferred();
    var newColName = genRowNumRequest.getNewcolname();
    var tableName = genRowNumRequest.getSrctablename();
    var newTableName = genRowNumRequest.getDsttablename();
    var txId = Transaction.start({ "simulate": true });
    XIApi.genRowNum(txId, tableName, newColName, newTableName)
        .then(function (dstTable) {
            var genRowResponse = new dataflow_pb.GenRowNumResponse();
            genRowResponse.setQuerystr(Transaction.done(txId));
            genRowResponse.setNewtablename(dstTable);
            deferred.resolve(genRowResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.GenRowNum = genRowNum;

function project(projectReq) {
    var deferred = PromiseHelper.deferred();
    var columns = projectReq.getColumnsList();
    var tableName = projectReq.getSrctablename();
    var newTableName = projectReq.getDsttablename();
    var txId = Transaction.start({ "simulate": true });
    XIApi.project(txId, columns, tableName, newTableName)
        .then(function (dstTable) {
            var projectResponse = new dataflow_pb.ProjectResponse();
            projectResponse.setQuerystr(Transaction.done(txId));
            projectResponse.setNewtablename(dstTable);
            deferred.resolve(projectResponse);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Project = project;

function unionOp(unionReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var tableInfoMsgs = unionReq.getTableinfosList();
    var tableInfos = [];
    tableInfoMsgs.forEach(tableInfoMsg => {
        var columnMsgs = tableInfoMsg.getColumnsList();
        var columns = [];
        columnMsgs.forEach((columnMsg) => {
            columns.push({
                "name": columnMsg.getName(),
                "rename": columnMsg.getRename(),
                "type": columnMsg.getType(),
                "cast": columnMsg.getCast()
            })
        });
        var tableInfoStruct = {
            "tableName": tableInfoMsg.getTablename(),
            "columns": columns
        };
        tableInfos.push(tableInfoStruct);
    });
    var dedup = unionReq.getDedup();
    var unionType = unionReq.getUniontype();
    var tableName = unionReq.getNewtablename();
    var txId = Transaction.start({ "simulate": true });
    XIApi.union(txId, tableInfos, dedup, tableName, unionType)
        .then(function (ret) {
            const {newTableName, newTableCols} = ret;
            var unionRes = new dataflow_pb.UnionResponse();
            unionRes.setQuerystr(Transaction.done(txId));
            unionRes.setNewtablename(newTableName);
            var newTablesColsMsgs = newTableCols.map(function (renameCol) {
                var colRenameMsg = new dataflow_pb.UnionResponse.RenameInfo();
                colRenameMsg.setRename(renameCol.rename);
                colRenameMsg.setType(renameCol.type);
                return colRenameMsg;
            });
            unionRes.setNewtablecolsList(newTablesColsMsgs);
            deferred.resolve(unionRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.UnionOp = unionOp;

function getJoinTableInfoAsDict(tableInfo) {
    var renameMsgs = tableInfo.getRenameList();
    var renames = [];
    renameMsgs.forEach((renameMsg) => {
        renames.push({
            "orig": renameMsg.getOrig(),
            "new": renameMsg.getNew(),
            "type": renameMsg.getType()
        });
    });
    var tableInfoDict = {
        "tableName": tableInfo.getTablename(),
        "columns": tableInfo.getColumnsList(),
        "casts": tableInfo.getCastsList(),
        "pulledColumns": tableInfo.getPulledcolumnsList(),
        "rename": renames,
        "allImmediates": tableInfo.getAllimmediatesList(),
        "removeNulls": tableInfo.getRemovenulls()
    };
    return tableInfoDict;
}

function getColRenameMsg(colRename) {
    var colRenameMsg = new dataflow_pb.ColRenameInfo();
    colRenameMsg.setOrig(colRename['orig']);
    colRenameMsg.setNew(colRename['new']);
    colRenameMsg.setType(colRename['type']);
    return colRenameMsg;
}

function join(joinReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var joinType = joinReq.getJointype();
    var lTableInfo = getJoinTableInfoAsDict(joinReq.getLtableinfo());
    var rTableInfo = getJoinTableInfoAsDict(joinReq.getRtableinfo());
    var optionsMsg = joinReq.getOptions();
    var options = {
        "newTableName": optionsMsg.getNewtablename(),
        "clean": optionsMsg.getClean(),
        "evalString": optionsMsg.getEvalstr(),
        "existenceCol": optionsMsg.getExistencecol(),
        "keepAllColumns": optionsMsg.getKeepallcolumns()
    };
    var txId = Transaction.start({ "simulate": true });
    // Delete index table for SDK
    let lIndexCache = XIApi.getIndexTable(lTableInfo.tableName, lTableInfo.columns);
    if (lIndexCache != null) {
        XIApi.deleteIndexTable(lIndexCache.tableName);
    }
    let rIndexCache = XIApi.getIndexTable(rTableInfo.tableName, rTableInfo.columns);
    if (rIndexCache != null) {
        XIApi.deleteIndexTable(rIndexCache.tableName);
    }
    XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
        .then(function ({newTableName, tempCols, lRename, rRename}) {
            var joinRes = new dataflow_pb.JoinResponse();
            joinRes.setQuerystr(Transaction.done(txId));
            joinRes.setNewtablename(newTableName);
            joinRes.setTempcolsList(tempCols);
            joinRes.setLrename(getColRenameMsg(lRename));
            joinRes.setRrename(getColRenameMsg(rRename));
            deferred.resolve(joinRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Join = join;

function groupBy(groupByReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var aggArgs = [];
    var aggArgsMsgs = groupByReq.getAggargsList();
    aggArgsMsgs.forEach(aggArgMsg => {
        var aggArgStruct = {
            "operator": aggArgMsg.getOperator(),
            "aggColName": aggArgMsg.getAggcolname(),
            "newColName": aggArgMsg.getNewcolname(),
            "isDistinct": aggArgMsg.getIsdistinct()
        };
        aggArgs.push(aggArgStruct);
    });
    var groupByCols = groupByReq.getGroupbycolsList();
    var optionsMsg = groupByReq.getOptions();
    var options = {
        "newTableName": optionsMsg.getNewtablename(),
        "groupAll": optionsMsg.getGroupall(),
        "icvMode": optionsMsg.getIcvmode(),
        "dhtName": optionsMsg.getDhtname(),
        "clean": optionsMsg.getClean(),
        "isIncSample": optionsMsg.getIsincsample(),
        "sampleCols": optionsMsg.getSamplecolsList(),
        "newKeys": optionsMsg.getNewkeysList()
    };
    var tableName = groupByReq.getSrctablename();
    var txId = Transaction.start({ "simulate": true });
    //Delete index table for SDK
    let indexCache = XIApi.getIndexTable(tableName, groupByCols);
    if (indexCache != null) {
        XIApi.deleteIndexTable(indexCache.tableName);
    }
    XIApi.groupBy(txId, aggArgs, groupByCols, tableName, options)
        .then(function ({finalTable, tempCols, newKeyFieldName, newKeys}) {
            var groupByRes = new dataflow_pb.GroupByResponse();
            groupByRes.setQuerystr(Transaction.done(txId));
            groupByRes.setNewtablename(finalTable);
            groupByRes.setTempcolsList(tempCols);
            groupByRes.setNewkeyfieldname(newKeyFieldName);
            groupByRes.setNewkeysList(newKeys);
            deferred.resolve(groupByRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.GroupBy = groupBy;

function index(indexReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var colNames = indexReq.getColnamesList();
    var tableName = indexReq.getSrctablename();
    var newTableName = indexReq.getDsttablename();
    var newKeys = indexReq.getNewkeysList();
    var dhtName = indexReq.getDhtname();
    var txId = Transaction.start({ "simulate": true });
    XIApi.index(txId, colNames, tableName, newTableName, newKeys, dhtName)
        .then(function (ret) {
            const {newTableName, isCache, newKeys, tempCols} = ret;
            var indexRes = new dataflow_pb.IndexResponse();
            indexRes.setQuerystr(Transaction.done(txId));
            indexRes.setNewtablename(newTableName);
            indexRes.setIscache(isCache);
            indexRes.setTempcolsList(tempCols);
            indexRes.setNewkeysList(newKeys);
            deferred.resolve(indexRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Index = index;

function sort(sortReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var keyInfoMessages = sortReq.getKeyinfosList();
    keyInfos = [];
    keyInfoMessages.forEach(msg => {
        keyInfo = {
            "name": msg.getName(),
            "ordering": msg.getOrdering(),
            "type": msg.getType()
        };
        keyInfos.push(keyInfo);
    });
    var tableName = sortReq.getSrctablename();
    var newTableName = sortReq.getDsttablename();
    var dhtName = sortReq.getDhtname();
    var txId = Transaction.start({ "simulate": true });
    XIApi.sort(txId, keyInfos, tableName, newTableName, dhtName)
        .then(function (ret) {
            const {newTableName, newKeys} = ret;
            var sortRes = new dataflow_pb.SortResponse();
            sortRes.setQuerystr(Transaction.done(txId));
            sortRes.setNewtablename(newTableName);
            sortRes.setNewkeysList(newKeys);
            deferred.resolve(sortRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Sort = sort;

function synthesize(synthesizeReq) {
    var deferred = PromiseHelper.deferred();
    //Translate from protobuf message to xiapi arguments
    var colInfosMsgs = synthesizeReq.getColinfosList();
    colInfos = [];
    colInfosMsgs.forEach(col => {
        colRenameInfo = {
            "orig": col.getOrig(),
            "new": col.getNew(),
            "type": col.getType().startsWith('Df') ? DfFieldTypeTFromStr[col.getType()] : xcHelper.convertColTypeToFieldType(col.getType())
        };
        colInfos.push(colRenameInfo);
    });
    var tableName = synthesizeReq.getSrctablename();
    var newTableName = synthesizeReq.getDsttablename();
    var sameSession = synthesizeReq.getSamesession();
    var txId = Transaction.start({ "simulate": true });
    XIApi.synthesize(txId, colInfos, tableName, newTableName, sameSession)
        .then(function (newTableName) {
            var synthesizeRes = new dataflow_pb.SynthesizeResponse();
            synthesizeRes.setQuerystr(Transaction.done(txId));
            synthesizeRes.setNewtablename(newTableName);
            deferred.resolve(synthesizeRes);
        })
        .fail(function (err) {
            deferred.reject(err);
        });
    return deferred.promise();
}
exports.Synthesize = synthesize;
