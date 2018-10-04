// dagTabs hold a user's dataflows and kvStore.
class DagTab {
    private static uid: XcUID;
    private _name: string;
    private _id: string;
    private _kvStore: KVStore;
    private _dagGraph: DagGraph;

    public static setup(): void {
        this.uid = new XcUID("DF2");
    }

    public static generateId(): string {
        return this.uid.gen();
    }

    /**
     * DagTab.restore
     * used to load up the kvstore anddataflow
     * @param id Dag's id
     */
    public static restore(id: string): XDPromise<DagTab> {
        const key: string = id;
        const kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        const deferred: XDDeferred<DagTab> = PromiseHelper.deferred();
        kvStore.getAndParse()
        .then((dagTab) => {
            if (dagTab == null) {
                // An invalid dagTab has been stored- let's delete it.
                kvStore.delete();
                deferred.reject({
                    error: DFTStr.InvalidDF
                });
            } else {
                const name: string  = dagTab.name;
                const id: string = dagTab.id;
                let grapah: DagGraph = new DagGraph();
                if (!grapah.deserializeDagGraph(dagTab.dag)) {
                    return null;
                }
                const tab: DagTab = new DagTab(name, id, grapah);
                deferred.resolve(tab);
            }
        })
        .fail(deferred.reject);
        
        return deferred.promise();
    }

    public constructor(name: string, id: string, dagGraph: DagGraph) {
        this._name = name;
        this._id = id || DagTab.generateId();
        this._kvStore = new KVStore(this._id, gKVScope.WKBK);
        this._dagGraph = dagGraph;
    }

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
        this.saveTab();
    }

    /**
     * Saves this Tab in the kvStore
     */
    public saveTab(): XDPromise<void> {
        let serializedJSON: string = JSON.stringify(this._getJSON());
        const promise: XDPromise<void> = this._kvStore.put(serializedJSON, true, true);

        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            workbook.update();
        }
        KVStore.logSave(true);
        return promise;
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

    private _getJSON(): {name: string, id: string, dag: string} {
        return {
            name: this._name,
            id: this._id,
            dag: this._dagGraph.serialize()
        }
    }
}