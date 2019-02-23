var DagGraph = require("./dagHelper/DagGraph.js").DagGraph

class DagHelper {
    static convertKvs(kvsStr, optimized, listXdfsOutput, userName, sessionId) {
        var graph;
        if (typeof kvsStr !== "string" || kvsStr === 0) {
            return PromiseHelper.reject( {error: "KVS string not provided"});
        }
        if (typeof listXdfsOutput !== "string" || listXdfsOutput === 0) {
            return PromiseHelper.reject( {error: "listXdfsOutput string not provided"});
        }
        try {
            var parsedVal = JSON.parse(kvsStr);
            var parsedXdfs = JSON.parse(listXdfsOutput);
            // XXX: Liang incorporates parsedXdfs, userName, sessionId into
            // expServer so they can be used by getQuery() and getRetinaArgs()
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
