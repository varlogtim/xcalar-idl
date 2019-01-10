var xcalar = require('xcalar');
var sqlApi = require('../route/sqlRestApi');
var sql_pb = proto.xcalar.compute.localtypes.Sql;

function executeSql(sqlQueryReq) {
    var deferred = PromiseHelper.deferred();
    var optimizationMsg = sqlQueryReq.getOptimizations();
    var optimizations = {
        dropAsYouGo: optimizationMsg.getDropasyougo(),
        dropSrcTables: optimizationMsg.getDropsrctables(),
        randomCrossJoin: optimizationMsg.getRandomcrossjoin(),
        pushToSelect: optimizationMsg.getPushtoselect()
    };
    var params = {
        userName: sqlQueryReq.getUsername(),
        userId: sqlQueryReq.getUserid(),
        sessionName: sqlQueryReq.getSessionname(),
        resultTableName: sqlQueryReq.getResulttablename(),
        queryString: sqlQueryReq.getQuerystring(),
        tablePrefix: sqlQueryReq.getTableprefix(),
        queryName: sqlQueryReq.getQueryname(),
        optimizations: optimizations
    }
    sqlApi.executeSql(params)
    .then(function(executionOutput) {
        var queryResp = new sql_pb.SQLQueryResponse();
        queryResp.setTablename(executionOutput.tableName);
        var orderedColumns = executionOutput.columns.map(function(col){
            var colMsg = new sql_pb.SQLQueryResponse.ColInfo();
            colMsg.setColname(col.colName);
            colMsg.setColid(col.colId);
            colMsg.setColtype(col.colType);
            return colMsg;
        });
        queryResp.setOrderedcolumnsList(orderedColumns);
        deferred.resolve(queryResp);
    })
    .fail(function(err){
        deferred.reject(err);
    });
    return deferred.promise();
}

exports.ExecuteSQL = executeSql;