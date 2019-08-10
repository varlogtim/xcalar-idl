class DagTabOptimized extends DagTabProgress {
    public static readonly KEY = "xcRet_";
    public static readonly XDPATH = "Optimized Dataflows/";
    public static readonly SDKPATH = "SDK Dataflows/Optimized SDK Dataflows/";
    public uid: XcUID;

    /**
     * DagTabOptimized.getId
     * format: xcRet_tabId_nodeId_DF2_workbookId_datetime_idCount
     * @param srcTabId
     * @param srcNodeId
     */
    public static getId(srcTabId: string, srcNodeId: DagNodeId): string {
        return this.KEY + srcTabId + "_" + srcNodeId + "_" + this.generateId();
    }

    /**
     * @deprecated
     * DagTabOptimized.getId_deprecated
     * format: xcRet_tabId_nodeId
     * @param srcTabId
     * @param srcNodeId
     */
    public static getId_deprecated(srcTabId: string, srcNodeId: DagNodeId): string {
        return this.KEY + srcTabId + "_" + srcNodeId;
    }

    /**
     * DagTabOptimized.restore
     */
    public static restore(
        dagList: {name: string, id: string}[]
    ): XDPromise<{dagTabs: DagTabOptimized[], metaNotMatch: boolean}> {
        const deferred: XDDeferred<{dagTabs: DagTabOptimized[], metaNotMatch: boolean}> = PromiseHelper.deferred();
        XcalarListRetinas()
        .then((retinas) => {
            try {
                let dagListMap: Map<string, string> = new Map();
                dagList.forEach((dag) => dagListMap.set(dag.id, dag.name));
                let dagTabs: DagTabOptimized[] = [];
                let metaNotMatch: boolean = false;
                let activeWKBKId = WorkbookManager.getActiveWKBK();
                let activeWKBNK = WorkbookManager.getWorkbook(activeWKBKId);
                let sessionId: string = activeWKBNK ? activeWKBNK.sessionId : null;
                let key: string = DagNode.KEY + "_" + sessionId;

                retinas.retinaDescs.forEach((retina) => {
                    let retinaName: string = retina.retinaName;
                    if (retinaName.startsWith(DagTabOptimized.KEY)) {
                        if (dagListMap.has(retinaName) && retinaName.includes(key)) {
                            let dagTabName: string = dagListMap.get(retinaName);
                            dagTabs.push(new DagTabOptimized({
                                id: retinaName,
                                name: dagTabName
                            }));
                            dagListMap.delete(retinaName);
                        } else if (retinaName.includes(key)) {
                            console.warn("optimized dataflow", retinaName, "is missing in meta");
                            dagTabs.push(new DagTabOptimized({
                                id: retinaName,
                                name: retinaName
                            }));
                            metaNotMatch = true;
                        }
                    } else {
                        // optimized dataflow that generate by SDK
                        dagTabs.push(new DagTabOptimized({
                            id: DagTab.generateId(),
                            name: retinaName,
                            fromSDK: true
                        }));
                    }
                });

                if (dagListMap.size > 0) {
                    metaNotMatch = true;
                }

                deferred.resolve({
                    dagTabs,
                    metaNotMatch
                });
            } catch (e) {
                console.error(e);
                deferred.reject(e.message);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * DagTabOptimized.getOutputTableName
     * @param retinaName
     */
    public static getOutputTableName(retinaName: string): string {
        let outputTableName = "table_";
        let nameSplit = retinaName.split("_");
        outputTableName = "table";
        try {
            for (let i = 1; i < nameSplit.length - 2; i++) {
                outputTableName += "_" + nameSplit[i];
            }
            outputTableName += "#t_" + nameSplit[nameSplit.length - 2] + "_" +
                                nameSplit[nameSplit.length - 1];
        } catch (e) {}

        return outputTableName;
    }

    private _fromSDK: boolean;

    constructor(options: {
        id: string,
        name: string,
        queryNodes?: any[],
        executor?: DagGraphExecutor,
        fromSDK?: boolean
    }) {
        super(options);
        const {queryNodes, executor} = options;
        this._fromSDK = options.fromSDK || false;

        if (queryNodes) {
            const graph: DagSubGraph = this._constructGraphFromQuery(queryNodes);
            graph.startExecution(queryNodes, executor);
            this._inProgress = true;
        }
    }

    public isFromSDK(): boolean {
        return this._fromSDK;
    }

    public getPath(): string {
        return this._fromSDK
        ? DagTabOptimized.SDKPATH + this.getName()
        : DagTabOptimized.XDPATH + this.getName();
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._hasQueryStateGraph = false; // reload query graph

        XcalarGetRetinaJson(this._queryName)
        .then((retina) => {
            this._dagGraph = this._constructGraphFromQuery(retina.query);
            this._dagGraph.startExecution(retina.query, null);
            this.setGraph(this._dagGraph);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public delete(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._isDeleted = true;
        this._queryCheckId++;

        let retinaName: string = this._queryName;
        XcalarDeleteRetina(retinaName)
        .then(() => {
            let tableName: string = DagTabOptimized.getOutputTableName(retinaName);
            DagUtil.deleteTable(tableName, false);
        })
        .then(deferred.resolve)
        .fail((error) => {
            this._isDeleted = false;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public endStatusCheck(): XDPromise<any> {
        this._inProgress = false;
        return this._getAndUpdateStatuses();
    }

    public getSourceTab(): DagTab {
        try {
            let tabId = this._id;
            if (!tabId.startsWith(DagTabOptimized.KEY)) {
                return null;
            }
            let splits = tabId.split("_" + DagNode.KEY)[0].split(DagTabOptimized.KEY);
            let srcTabId = splits[1];
            return DagList.Instance.getDagTabById(srcTabId);
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.DagTabOptimized = DagTabOptimized;
}