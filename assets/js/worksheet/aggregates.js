window.Aggregates = (function(Aggregates, $) {
    var aggs = {};

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

    Aggregates.checkAgg = function(tableId, colName, aggOp) {
        var key = tableId + "#" + colName + "#" + aggOp;
        for (var i in aggs) {
            if (aggs[i].key === key) {
                return (aggs[i]);
            }
        }
        return null;
    };

    Aggregates.addAgg = function(tableId, colName, aggOp, aggRes) {
       
        var name = aggRes.dagName;

        if (aggs.hasOwnProperty(name)) {
            // XXX now if this agg ops is exist, do not update it,
            // since update will make the old table info lost
            console.warn("Aggregate result already exists!");
        } else {
            // used for checking duplicate aggs
            // use this as key so that if later you want to sort,
            // write a sort function that split by "#" and
            // extract tableId/colNam/aggOp to sort by one of them
            aggRes.key = tableId + "#" + colName + "#" + aggOp;
            aggs[name] = aggRes;
        }
    };

     // remove one entry of aggregate information
    Aggregates.removeAgg = function(key) {
        delete aggs[key];
    };

    return (Aggregates);
}({}, jQuery));