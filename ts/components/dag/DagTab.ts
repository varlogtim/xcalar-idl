// dagTabs hold a user's dataflows and kvStore.
abstract class DagTab {
    private static uid: XcUID;
    protected _name: string;
    protected _id: string;
    protected _dagGraph: DagGraph;
    protected _kvStore: KVStore;

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
    }

    public abstract load(): XDPromise<void>
    public abstract save(): XDPromise<void>
    public abstract delete(): XDPromise<void>
    public abstract download(): XDPromise<void>

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

    protected _loadFromKVStore(): XDPromise<void> {
        if (this._kvStore == null) {
            return PromiseHelper.reject("Initialize error");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((dagTab) => {
            if (dagTab == null) {
                deferred.reject({
                    error: DFTStr.InvalidDF
                });
            } else {
                let grapah: DagGraph = new DagGraph();
                if (!grapah.deserializeDagGraph(dagTab.dag)) {
                    return null;
                }
                this._dagGraph = grapah;
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _getJSON(): {name: string, id: string, dag: string} {
        return {
            name: this._name,
            id: this._id,
            dag: this._dagGraph.serialize()
        }
    }
}