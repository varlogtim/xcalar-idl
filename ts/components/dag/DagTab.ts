// dagTabs hold a user's dataflows and kvStore.
abstract class DagTab {
    private static uid: XcUID;
    private _events: object;

    protected _name: string;
    protected _id: string;
    protected _dagGraph: DagGraph;
    protected _kvStore: KVStore;
    protected _disableSaveLock: number;

    public static setup(): void {
        this.uid = new XcUID("DF2");
    }

    public static generateId(): string {
        return this.uid.gen();
    }

    public constructor(name: string, id?: string, dagGraph?: DagGraph) {
        this._name = name;
        this._id = id || DagTab.generateId();
        this._dagGraph = dagGraph || null;
        if (this._dagGraph != null) {
            this._dagGraph.setTabId(this._id);
        }
        this._disableSaveLock = 0;
        this._events = {};
    }

    public abstract load(): XDPromise<void>
    public abstract save(): XDPromise<void>
    public abstract delete(): XDPromise<void>
    public abstract download(name: string, optimized?: boolean): XDPromise<void>
    public abstract upload(fileContent: string, overwriteUDF: boolean): XDPromise<void>;
    /**
     * Get Tab's name
     */
    public getName(): string {
        return this._name;
    }

    /**
     * Changes the name of a tab to newName
     * @param {string} newName The tab's new name.
     */
    public setName(newName: string): void {
        this._name = newName;
    }

    /**
     * gets the DagGraph for this tab
     * @returns {DagGraph}
     */
    public getGraph(): DagGraph {
        return this._dagGraph;
    }

    /**
     * Gets the ID for this tab
     * @returns {string}
     */
    public getId(): string {
        return this._id;
    }

    /**
     * For Bulk Operation only
     */
    public turnOffSave(): void {
        this._disableSaveLock++;
    }

    /**
     * For Bulk Operation only
     */
    public turnOnSave(): void {
        if (this._disableSaveLock === 0) {
            console.error("error case to turn on");
        } else {
            this._disableSaveLock--;
        }
    }

    public forceTurnOnSave(): void {
        this._disableSaveLock = 0;
    }

    /**
     * add events to the DagTab
     * @param event {string} event name
     * @param callback {Function} call back of the event
     */
    public on(event, callback): DagTab {
        this._events[event] = callback;
        return this;
    }

    public setGraph(graph: DagGraph): void {
        this._dagGraph = graph;
        this._dagGraph.setTabId(this._id);
    }

    public getShortName(): string {
        const name: string = this.getName();
        const splits: string[] = name.split("/");
        return splits[splits.length - 1];
    }

    public downloadStats(name: string): XDPromise<void> {
        let fileName: string = name || this.getShortName();
        fileName += ".json";
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const statsJson = this.getGraph().getStatsJson();

        xcHelper.downloadAsFile(fileName, JSON.stringify(statsJson, null, 4), true);
        deferred.resolve();

        return deferred.promise();
    }

    // the save version of meta
    protected _loadFromKVStore(): XDPromise<any> {
        if (this._kvStore == null) {
            return PromiseHelper.reject("Initialize error");
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((dagInfo) => {
            if (dagInfo == null) {
                deferred.reject({
                    error: DFTStr.InvalidDF
                });
            } else {
                const valid = this._validateKVStoreDagInfo(dagInfo);
                if (valid.error) {
                    console.error(valid.error);
                    deferred.reject({
                        error: valid.error
                    });
                } else {
                    let graph: DagGraph = new DagGraph();
                    graph.create(dagInfo.dag);
                    deferred.resolve(dagInfo, graph);
                }
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // save meta
    protected _writeToKVStore(json: object): XDPromise<void> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const serializedJSON: string = JSON.stringify(json);
        return this._kvStore.put(serializedJSON, true, true);
    }

    protected _getJSON(includeStats?: boolean): {
        name: string,
        id: string,
        dag: DagGraphInfo
    } {
        return {
            name: this._name,
            id: this._id,
            dag: this._dagGraph.getSerializableObj(includeStats)
        }
    }

    protected _deleteTableHelper(): XDPromise<void> {
        DagTblManager.Instance.deleteTable(this._id + "_dag_*", true, true);
        return PromiseHelper.alwaysResolve(DagTblManager.Instance.forceDeleteSweep());
    }

    protected _deleteAggregateHelper(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagAggManager.Instance.graphRemoval(this._id)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // delete all retinas associated with this tab
    protected _deleteRetinaHelper(): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let promises = [];
        // patternMatch doesn't work yet
        XcalarListRetinas(gRetinaPrefix + this._id + "*")
        .then((retinas) => {
            retinas.retinaDescs.forEach((retina) => {
                // TODO remove the need to search once listRetinas takes in a namepattenr
                if (retina.retinaName.startsWith(gRetinaPrefix + this._id)) {
                    promises.push(XcalarDeleteRetina(retina.retinaName));
                }
            });
            return PromiseHelper.when(...promises);
        })
        .then(deferred.resolve)
        .fail((...errors) => {
            let error;
            for (let i = 0; i < errors.length; i++) {
                if (errors[i] && errors[i]["status"] === StatusT.StatusRetinaInUse) {
                    error = errors[i];
                    break;
                }
            }
            // only reject if error is that retina is in use
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        });
        return deferred.promise();
    }

    protected _trigger(event, ...args): void {
        if (typeof this._events[event] === "function") {
            this._events[event].apply(this, args);
        }
    }

    protected _validateKVStoreDagInfo(dagInfo) {
        if (typeof dagInfo !== "object") {
            return {error: "Invalid dataflow information"}
        }
        if (typeof dagInfo.name !== "string") {
            return {error: "Invalid dataflow name"}
        }
        if (typeof dagInfo.id !== "string") {
            return {error: "Invalid dataflow ID"}
        }
        if (!dagInfo.dag  || typeof dagInfo.dag !== "object" ||
            dagInfo.dag.constructor !== Object) {
            return {error: "Invalid dataflow"}
        }

        return {}
    }
}
