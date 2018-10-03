// dagTabs hold a user's dataflows and kvStore.
class DagTab{
    private static uid: XcUID;
    private _name: string;
    private _id: string;
    private _key: string;
    private _kvStore: KVStore;
    private _dagGraph: DagGraph;

    public static setup(): void {
        this.uid = new XcUID("DF2");
    }

    public static generateId(): string {
        return this.uid.gen();
    }

    public constructor(name: string, id: string, key: string, dagGraph: DagGraph) {
        this._name = name;
        this._id = id || DagTab.generateId();
        this._key = key || this._id;
        this._kvStore = new KVStore(this._key, gKVScope.WKBK);
        this._dagGraph = dagGraph;
    }

    /**
     * initializeTab is used to load up the kvstore and
     * dataflow
     * @param dagKey Key for this dag's kvstore.
     */
    public initializeTab(dagKey: string) {
        let kvStore: KVStore = new KVStore(dagKey, gKVScope.WKBK);
        return kvStore.getAndParse()
            .then((dagTab) => {
                if (dagTab == null) {
                    // An invalid dagTab has been stored- let's delete it.
                    let kvStore = new KVStore(dagKey, gKVScope.WKBK);
                    kvStore.delete();
                    return this;
                }
                this._name  = dagTab.name;
                this._id = dagTab.id;
                this._key = dagTab.key;
                this._kvStore = new KVStore(dagTab.key, gKVScope.WKBK);
                let newGraph: DagGraph = new DagGraph();
                if (!newGraph.deserializeDagGraph(dagTab.dag)) {
                    return null;
                }
                this._dagGraph = newGraph;
                return this;
            });
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
     * Returns the JSON representing this tab.
     * @returns {DagTabJSON}
     */
    public getJSON(): DagTabJSON {
        return {
            "name": this._name,
            "id": this._id,
            "key": this._key,
            "dag": this._dagGraph.serialize()
        }
    }

    /**
     * Saves this Tab in the kvStore
     */
    public saveTab(): XDPromise<void> {
        let json: object = this.getJSON();
        const promise: XDPromise<void> = this._kvStore.put(
                                            JSON.stringify(json), true, true);

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

    public getKey(): string {
        return this._key;
    }
}