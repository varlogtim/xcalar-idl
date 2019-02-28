var DagGraph = require("./dagHelper/DagGraph.js").DagGraph

class DagHelper {
    static convertKvs(kvsStrList, dataflowName, optimized, listXdfsOutput, userName,
            sessionId, workbookName) {
        var graph;
        if (typeof kvsStrList !== "object" || kvsStrList === 0) {
            return PromiseHelper.reject( {error: "KVS list not provided"});
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
        if (typeof workbookName !== "string" || workbookName.length === 0) {
            return PromiseHelper.reject({ error: "workbookName string not provided" });
        }
        try {
            var parsedVal;
            // XXX: This is where multiple KVS strings are passed in when
            // there's linkout/linkin resolution needed.
            for (var ii = 0; ii < kvsStrList.length; ii++){
                parsedVal = JSON.parse(kvsStrList[ii]);
            }
            var parsedXdfs = JSON.parse(listXdfsOutput);

            WorkbookManager.init(userName, workbookName);
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
