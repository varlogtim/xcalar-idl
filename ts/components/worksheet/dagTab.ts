// dagTabs hold a user's dataflows and kvStore.

interface TagJSON {
    name: string,
    id: number,
    key: string,
    dag: string
}

class DagTab{

    private _name: string;
    private _id: number;
    private _key: string;
    private _kvStore: KVStore;
    private _dagGraph: DagGraph;

    constructor(name: string, id: number, key: string, dagGraph: DagGraph) {
        this._name = name;
        this._id = id;
        this._key = key;
        this._kvStore = new KVStore(key, gKVScope.WKBK);
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
                let myDag = null;
                /* TODO: Uncomment this once deserialize and serialize are done
                let myDag = new DagGraph();
                myDag.deserialize(dagTab.dag);
                */
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
                this._dagGraph = myDag;
                return this;
            })
            .fail(function() {
                return null;
            });
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
     * Deletes this tab from the kvStore
     */
    public delete(): void {
        this._kvStore.delete();
    }

    /**
     * Returns the JSON representing this tab.
     * @returns {TagJSON}
     */
    public getJSON(): TagJSON {
        return {
            "name": this._name,
            "id": this._id,
            "key": this._key,
            "dag": null
        }
    }

    /**
     * Saves this Tab in the kvStore
     */
    public saveTab(): void {
        let json: object = this.getJSON();
        this._kvStore.put(JSON.stringify(json), true, true);
    }
}