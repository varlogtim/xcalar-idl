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

    Aggregates.checkAgg = function(tableId, colName, aggOp) {
        var key = tableId + "#" + colName + "#" + aggOp;
        return (aggs[key]);
    };

    Aggregates.addAgg = function(tableId, colName, aggOp, aggRes) {
        // use this as key so that if later you want to sort,
        // write a sort function that split by "#" and
        // extract tableId/colNam/aggOp to sort by one of them
        var key;
        var dagName = aggRes.dagName;
        if (dagName[0] === "@") {
            key = dagName;
        } else {
            key = tableId + "#" + colName + "#" + aggOp;
        }

        if (aggs.hasOwnProperty(key)) {
            // XXX now if this agg ops is exist, do not update it,
            // since update will make the old table info lost
            console.warn("Aggregate result already exists!");
        } else {
            aggs[key] = aggRes;
        }
    };

     // remove one entry of aggregate information
    Aggregates.removeAgg = function(key) {
        delete aggs[key];
    };

    return (Aggregates);
}({}, jQuery));