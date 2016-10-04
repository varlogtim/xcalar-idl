window.Aggregates = (function(Aggregates, $) {
    var aggs = {};
    var tempAggs = {}; // UI cache only, not persist to kv store

    Aggregates.restore = function(aggInfos) {
        aggs = aggInfos || {};
    };

    Aggregates.clear = function() {
        aggs = {};
    };

    // Get all aggreagte information
    Aggregates.getAggs = function() {
        return (aggs);
    };

    // returns aggs that the user named, and not any unnamed aggs
    Aggregates.getNamedAggs = function() {
        var namedAggs = {};
        for (var key in aggs) {
            if (key.startsWith(gAggVarPrefix)) {
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
        }
    };

    // remove one entry of aggregate information
    Aggregates.removeAgg = function(key) {
        delete aggs[key];
    };

    return (Aggregates);
}({}, jQuery));