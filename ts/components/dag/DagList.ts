// DagList controls the panel Dataflow List.

class DagList {

    private static _instance: DagList;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _$dagListSection: JQuery; //$("#dagListSection")
    private _userDags: StoredDags[];
    private _kvStore: KVStore;
    private _deleteEnabled: boolean;
    private _initialized: boolean;


    private constructor() {
        let key = KVStore.getKey("gDagListKey");
        this._deleteEnabled = true;
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this._userDags = [];
        this._$dagListSection = $("#dagListSection");
        this._initialized = false;
    }

    public setup(): void {
        this._kvStore.getAndParse()
        .then((dagListJSON: {dags: StoredDags[]}) => {
            if (dagListJSON == null) {
                dagListJSON = {dags: []};
            }
            this._userDags = this._userDags.concat(dagListJSON.dags);
            this._initialized = true;
            this._initializeDagList();
            this._registerHandlers();
            if(this._userDags.length > 1) {
                this._enableDelete();
            } else {
                this._disableDelete();
            }
        });
    }

    private _initializeDagList(): void {
        let names: string[] = this._userDags.map((dag) => {
            return dag.name;
        });
        this._addBulkDagListHtml(names);
    }

    private _registerHandlers(): void {
        const self = this;
        $("#dagListSection").on("click", ".name", function() {
            let $dagListItem: JQuery = $(this).parent();
            let index: number = $("#dagListSection .dagListDetail").index($dagListItem);
            let key: string = self._userDags[index].key;
            const dagtabManager: DagTabManager = DagTabManager.Instance;
            dagtabManager.loadTab(key);
        });

        $("#dagListSection").on("click", ".deleteDataflow", function() {
            if (!self._deleteEnabled) {
                return;
            }
            let $dagListItem: JQuery = $(this).parent();
            let index: number = $("#dagListSection .dagListDetail").index($dagListItem);
            let key: string = self._userDags[index].key;
            let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
            const dagtabManager: DagTabManager = DagTabManager.Instance;
            if (!dagtabManager.removeTab(key)) {
                return;
            }
            kvStore.delete();
            $dagListItem.remove();
            self._userDags.splice(index, 1);
            self._saveDagList();
            if (self._userDags.length == 1) {
                self._disableDelete();
            }
        })
    }

    /**
     * Saves a users current dataflows.
     * @param dags The list of dags a user owns
     */
    private _saveDagList(): void {
        let json = {
            "dags": this._userDags
        };
        this._kvStore.put(JSON.stringify(json), true, true);
    }

    private _disableDelete(): void {
        $("#dagListSection .deleteDataflow").addClass('xc-hidden');
        this._deleteEnabled = false;
    }

    private _enableDelete(): void {
        $("#dagListSection .deleteDataflow").removeClass('xc-hidden');
        this._deleteEnabled = true;
    }

    private _addBulkDagListHtml(names: string[]): void {
        let html: string = "";
        for (let i = 0; i < names.length; i++) {
            let name = xcHelper.escapeHTMLSpecialChar(names[i]);
            html +=
            '<li class="dagListDetail">' +
                '<span class="name">' + name + '</span>' +
                '<i class="icon xi-trash deleteDataflow">' +
                '</i>' +
                '<i class="icon xi-download downloadDataflow">' +
                '</i>' +
            '</li>';
        }
        let $list = this._$dagListSection.find(".dagListDetails");
        $list.append(html);
    }

    /**
     * Adds the html representing the dataflow we added
     * @param name Name of the dag list
     */
    public addDagListHtml(name: string): void {
        let $list = this._$dagListSection.find(".dagListDetails");
        let html: string =
            '<li class="dagListDetail">' +
                '<span class="name">' + name + '</span>' +
                '<i class="icon xi-trash deleteDataflow">' +
                '</i>' +
                '<i class="icon xi-download downloadDataflow">' +
                '</i>' +
            '</li>'
        $list.append(html);
    }

    /**
     * Adds a new dataflow to the user's dataflows.
     * @param name The name of the new dataflow
     * @param key The key of the new dataflow
     */
    public addDag(name: string, key: string): void {
        let newDag: StoredDags = {
            "name": name,
            "key": key
        }
        this._userDags.push(newDag);
        this.addDagListHtml(name);
        if (this._initialized) {
            // Ensure that the userDags were loaded up already, to prevent overwriting.
            this._saveDagList();
        }
        if (!this._deleteEnabled && this._userDags.length != 1) {
            this._enableDelete();
        } else if (!this._deleteEnabled && this._userDags.length == 1) {
            // This happens if a workbook is new.
            this._disableDelete();
        }
    }

    /**
     * Changes the name of a Dataflow in the user's dataflows.
     * @param newName the new name
     * @param key The dataflow we change.
     */
    public changeName(newName: string, key: string): void {
        let index: number = this._userDags.findIndex((dag) => {
            return dag.key == key;
        });
        this._userDags[index].name = newName;
        this._saveDagList();
        let $list: JQuery = this._$dagListSection.find(".dagListDetail .name");
        $($list.get(index)).text(newName);
    }
}