window.Aggregates = (function(Aggregates, $) {
    var aggs = {};
    var tempAggs = {}; // UI cache only, not persist to kv store

    Aggregates.restore = function(aggInfos) {
        aggs = aggInfos || {};
        FnBar.updateAggMap(aggs);
    };

    Aggregates.clear = function() {
        aggs = {};
        FnBar.updateAggMap(aggs);
    };

    // Get all aggregate information
    Aggregates.getAggs = function() {
        return (aggs);
    };

    // returns aggs that the user named, and not any unnamed aggs
    Aggregates.getNamedAggs = function() {
        var namedAggs = {};
        for (var key in aggs) {
            if (aggs[key].aggName.startsWith(gAggVarPrefix)) {
                namedAggs[key] = aggs[key];
            }
        }
        return namedAggs;
    };

    Aggregates.getAgg = function(tableId, colName, aggOp) {
        var key = tableId + "#" + colName + "#" + aggOp;
        var c;
        for (c in aggs) {
            if (aggs[c].key === key) {
                return aggs[c];
            }
        }

        // if not found, try temp agg
        for (c in tempAggs) {
            if (tempAggs[c].key === key) {
                return tempAggs[c];
            }
        }
        // not found
        return null;
    };

    Aggregates.addAgg = function(tableId, colName, aggOp, aggRes, isTemp) {
        var container = isTemp ? tempAggs : aggs;
        var name = aggRes.dagName;

        if (container.hasOwnProperty(name)) {
            // XXX now if this agg ops is exist, do not update it,
            // since update will make the old table info lost
            console.warn("Aggregate result already exists!");
        } else {
            // used for checking duplicate aggs
            // use this as key so that if later you want to sort,
            // write a sort function that split by "#" and
            // extract tableId/colNam/aggOp to sort by one of them
            aggRes.key = tableId + "#" + colName + "#" + aggOp;
            container[name] = aggRes;
            FnBar.updateAggMap(aggs);
        }
    };

    // remove one entry of aggregate information
    Aggregates.removeAgg = function(dagName) {
        delete aggs[dagName];
        FnBar.updateAggMap(aggs);
    };

    // deletes from backend
    Aggregates.deleteAggs = function(aggNames) {
        var deferred = jQuery.Deferred();
        if (!(aggNames instanceof Array)) {
            aggNames = [aggNames];
        }
        var promises = [];
        var sql = {
            "operation": SQLOps.DeleteAgg,
            "aggs"     : aggNames
        };
        var txId = Transaction.start({
            "operation": SQLOps.DeleteAgg,
            "sql"      : sql
        });

        for (var i = 0; i < aggNames.length; i++) {
            promises.push(XIApi.deleteTable(txId, aggNames[i]));
        }

        PromiseHelper.when.apply(window, promises)
        .then(function() {
            for (var i = 0; i < aggNames.length; i++) {
                Aggregates.removeAgg(aggNames[i]);
                Dag.makeInactive(aggNames[i], true);
            }
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function() {
            var successAggs = aggDeleteFailHandler(arguments, aggNames, sql,
                                                   txId);
            deferred.reject(successAggs);
        });


        return deferred.promise();
    };

    // returns array of any successful deletions
    function aggDeleteFailHandler(results, aggNames, sql, txId) {
        var hasSuccess = false;
        var fails = [];
        var errorMsg = "";
        var tablesMsg = "";
        var failedTables = "";
        var successTables = [];
        for (var i = 0, len = results.length; i < len; i++) {
            if (results[i] != null && results[i].error != null) {
                fails.push({tables: aggNames[i], error: results[i].error});
                failedTables += aggNames[i] + ", ";
            } else if (results[i] != null && results[i].statuses) {
                hasSuccess = true;
                var aggName = results[i].statuses[0].nodeInfo.name;
                Aggregates.removeAgg(aggName);
                Dag.makeInactive(aggName, true);
                successTables.push(aggName);
            } else {
                // invalid info from the backend
                console.warn('invalid results', results);
            }
        }

        var numFails = fails.length;
        if (numFails) {
            failedTables = failedTables.substr(0, failedTables.length - 2);
            if (numFails > 1) {
                tablesMsg = ErrTStr.ConstsNotDeleted + " " + failedTables;
            } else {
                tablesMsg = xcHelper.replaceMsg(ErrWRepTStr.ConstNotDeleted, {
                    "name": failedTables
                });
            }
        }

        if (hasSuccess) {
            sql.tables = successTables;
            if (numFails) {
                errorMsg = fails[0].error + ". " + tablesMsg;
                Alert.error(StatusMessageTStr.PartialDeleteConstFail, errorMsg);
            }
            Transaction.done(txId, {
                "sql": sql
            });
        } else {
            errorMsg = fails[0].error + ". " + ErrTStr.NoConstsDeleted;
            Transaction.fail(txId, {
                "error"  : errorMsg,
                "failMsg": StatusMessageTStr.DeleteConstFailed
            });
        }
        return (successTables);
    }

    return (Aggregates);
}({}, jQuery));