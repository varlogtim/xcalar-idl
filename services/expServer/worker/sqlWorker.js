const { parentPort, workerData } = require('worker_threads');
require("jsdom/lib/old-api").env("", function(err, window) {
    if (err) {
        console.error(err);
        return;
    }
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js');
    var sqlUtil = require("../utils/sqlUtils.js").SqlUtil;
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
            var queryWithDrop;
            try {
                queryWithDrop = optimizerObject.logicalOptimize(xcQueryString,
                                        optimizations, JSON.stringify(selectQuery));
            } catch(e) {
                return promiseHelper.reject(e);
            }
            var prefixStruct = sqlUtil.addPrefix(
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