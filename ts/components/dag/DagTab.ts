// dagTabs hold a user's dataflows and kvStore.
abstract class DagTab {
    private static uid: XcUID;
    private _events: object;

    protected _name: string;
    protected _id: string;
    protected _dagGraph: DagGraph;
    protected _kvStore: KVStore;
    protected _tempKVStore: KVStore;
    protected _unsaved: boolean;
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
        this._unsaved = false;
        this._disableSaveLock = 0;
        this._events = {};
    }

    public abstract load(): XDPromise<void>
    public abstract save(foceSave?: boolean): XDPromise<void>
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
     * return true if tab is modifed and unsaved
     */
    public isUnsave(): boolean {
        return this._unsaved;
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

    public discardUnsavedChange(): XDPromise<void> {
        if (!this._unsaved || this._tempKVStore == null) {
            return PromiseHelper.resolve();
        }
        return this._tempKVStore.delete()
                .then(() => {
                    this._unsaved = false;
                });
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
                let graph: DagGraph = new DagGraph();
                graph.create(dagInfo.dag);
                deferred.resolve(dagInfo, graph);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // load unsaved meta
    protected _loadFromTempKVStore(): XDPromise<any> {
        if (this._tempKVStore == null) {
            return PromiseHelper.reject("Initialize error");
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._tempKVStore.getAndParse()
        .then((dagInfo) => {
            if (dagInfo == null) {
                deferred.resolve(null); // still resolve
            } else {
                let grapah: DagGraph = new DagGraph();
                grapah.create(dagInfo.dag)
                deferred.resolve(dagInfo, grapah);
            }
        })
        .fail(() => {
            deferred.resolve(null); // still resolve
        });

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

    // save a temp copy of meta
    protected _writeToTempKVStore(includeStats?: boolean): XDPromise<void> {
        if (this._dagGraph == null) {
            // when the grah is not loaded
            return PromiseHelper.reject();
        }
        const serializedJSON: string = JSON.stringify(this._getJSON(includeStats));
        return this._tempKVStore.put(serializedJSON, true, true);
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
        let nodes: Map<string, DagNode> = this._dagGraph.getAllNodes();
        let aggregates: string[] = [];
        nodes.forEach((node: DagNode) => {
            if (node instanceof DagNodeAggregate) {
                let input: DagNodeAggregateInputStruct = node.getParam();
                if (input.dest != null) {
                    aggregates.push(input.dest);
                }
            }
        });
        DagAggManager.Instance.bulkNodeRemoval(aggregates)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _trigger(event, ...args): void {
        if (typeof this._events[event] === "function") {
            this._events[event].apply(this, args);
        }
    }
}