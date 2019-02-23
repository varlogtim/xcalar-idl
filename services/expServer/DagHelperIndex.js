var DagGraph = require("./dagHelper/DagGraph.js").DagGraph

class DagHelper {
    static convertKvs(kvsStr, optimized, listXdfsOutput, userName, sessionId) {
        if (typeof kvsStr !== "string" || kvsStr.length === 0) {
            return PromiseHelper.reject( {error: "KVS string not provided"});
        }
        if (typeof listXdfsOutput !== "string" || listXdfsOutput.length === 0) {
            return PromiseHelper.reject( {error: "listXdfsOutput string not provided"});
        }
        if (typeof userName !== "string" || userName.length === 0) {
            return PromiseHelper.reject({ error: "userName string not provided" });
        }
        if (typeof sessionId !== "string" || sessionId.length === 0) {
            return PromiseHelper.reject({ error: "sessionId string not provided" });
        }
        try {
            var parsedVal = JSON.parse(kvsStr);
            var parsedXdfs = JSON.parse(listXdfsOutput);
            // XXX: Liang incorporates parsedXdfs, userName, sessionId into
            // expServer so they can be used by getQuery() and getRetinaArgs()
            return XDFManager.Instance.setup({
                userName: userName, sessionId: sessionId, listXdfsObj: parsedXdfs
            })
            .then(() => {
                var graph = new DagGraph();
                graph.create(parsedVal.dag);
                if (optimized) {
                    return graph.getRetinaArgs();
                } else {
                    return graph.getQuery();
                }
            });
        }
        catch (err) {
            console.log(err);
            return PromiseHelper.reject(err);
        }
    }
}

exports.DagHelper = DagHelper;
