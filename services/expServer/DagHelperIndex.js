var DagGraph = require("./dagHelper/DagGraph.js").DagGraph

class DagHelper {
    static convertKvs(kvsStr, optimized) {
        var graph;
        if (typeof kvsStr !== "string" || kvsStr === 0) {
            return PromiseHelper.reject( {error: "KVS string not provided"});
        }
        try {
            var parsedVal = JSON.parse(kvsStr);
            graph = new DagGraph();
            graph.create(parsedVal.dag);
            if (optimized) {
                return graph.getRetinaArgs();
            } else {
                return graph.getQuery();
            }
        }
        catch (err) {
            console.log(err);
            return PromiseHelper.reject(err);
        }
    }
}

exports.DagHelper = DagHelper;
