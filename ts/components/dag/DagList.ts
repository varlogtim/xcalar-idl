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

    /**
     * Sets up the DagList
     * @returns {JQueryPromise<{}>}
     */
    public setup(): JQueryPromise<{}> {
        var deferred: JQueryDeferred<{}> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((dagListJSON: {dags: StoredDags[]}) => {
            if (dagListJSON == null) {
                dagListJSON = {dags: []};
            }
            this._userDags = this._userDags.concat(dagListJSON.dags);
            this._initializeDagList();
            this._registerHandlers();
            this._initialized = true;
            if(this._userDags.length > 1) {
                this._enableDelete();
            } else {
                this._disableDelete();
            }
            deferred.resolve();
        })
        .fail((err) => {
            deferred.reject(err);
        });
        return deferred.promise();
    }

    private _initializeDagList(): void {
        let names: string[] = this._userDags.map((dag) => {
            return dag.name;
        });
        this._addBulkDagListHtml(names);
    }

    private _registerHandlers(): void {
        const self = this;
        $('#dagList .uploadBtn').click(function() {
            UploadDataflowCard.show();
        })

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
            Alert.show({
                'title': DFTStr.DelDF,
                'msg': xcHelper.replaceMsg(DFTStr.DelDFMsg, {
                    "dfName": $dagListItem.text()
                }),
                'onConfirm': function() {
                    self.deleteDataflow($dagListItem);
                }
            });
        })

        $("#dagListSection").on("click", ".downloadDataflow", function() {
            let $dagListItem: JQuery = $(this).parent();
            let index: number = $("#dagListSection .dagListDetail").index($dagListItem);
            let key: string = self._userDags[index].key;
            const dagtabManager: DagTabManager = DagTabManager.Instance;
            const keyIndex = dagtabManager.getKeyIndex(key);
            let graphString = "";
            if (keyIndex == -1) {
                let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
                kvStore.getAndParse()
                    .then((dagTab) => {
                        graphString = dagTab.dag;
                        xcHelper.downloadAsFile($dagListItem.find(".name").text() + '.json', graphString, true);
                    })
                    .fail(() => {
                        StatusBox.show(DFTStr.DownloadErr, $dagListItem,
                            false, {'side': 'right'});
                        return;
                    });
            } else {
                let graph: DagGraph = dagtabManager.getGraphByIndex(keyIndex);
                graphString = graph.serialize();
                xcHelper.downloadAsFile($dagListItem.find(".name").text() + '.json', graphString, true);
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
        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            workbook.update();
        }
        KVStore.logSave(true);
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
                '<span class="name textOverflowOneLine">' + name + '</span>' +
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
                '<span class="name textOverflowOneLine">' + name + '</span>' +
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
        if (!this._initialized) {
            return;
        }
        let newDag: StoredDags = {
            "name": name,
            "key": key
        }
        this._userDags.push(newDag);
        this.addDagListHtml(name);
        this._saveDagList();
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

    /**
     * Returns if the user has used this name for a dag graph or not.
     * @param name The name we want to check
     * @returns {string}
     */
    public isUniqueName(name: string): boolean {
        let index: number = this._userDags.findIndex((dag) => {
            return dag.name == name;
        });
        return (index == -1);
    }

    /**
     * Deletes the dataflow represented by dagListItem from the dagList
     * Also removes from dagTabs if it is active.
     * @param $dagListItem Dataflow we want to delete.
     * @returns {JQueryPromise<{}>}
     */
    public deleteDataflow($dagListItem: JQuery): JQueryPromise<{}> {
        // TODO: Add confirm delete UX
        var deferred: JQueryDeferred<{}> = PromiseHelper.deferred();
        let index: number = $("#dagListSection .dagListDetail").index($dagListItem);
        if (index == -1) {
            return deferred.reject();
        }
        let key: string = this._userDags[index].key;
        let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
        const dagtabManager: DagTabManager = DagTabManager.Instance;
        if (!dagtabManager.removeTab(key)) {
            return deferred.reject();
        }
        this._disableDelete();
        kvStore.delete()
        .then(() => {
            $dagListItem.remove();
            this._userDags.splice(index, 1);
            this._saveDagList();
            if (this._userDags.length != 1) {
                this._enableDelete();
            }
            deferred.resolve();
        })
        .fail((err) => {
            console.error("Could not delete tab:" + err);
            this._enableDelete();
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * Switches the active dagList dag to the one with key.
     * @param key Dag key we want to note as active
     */
    public switchActiveDag(key: string): void {
        $("#dagListSection .dagListDetail").removeClass("active");
        let index: number = this._userDags.findIndex((dag) => {
            return dag.key == key;
        });
        $("#dagListSection .dagListDetail").eq(index).addClass("active");
    }

    /**
     * Upload a dag that is represented by a string.
     * @param name Name of the dataflow
     * @param dag The string representing a dag
     */
    public uploadDag(name: string, dag: DagGraph): void {
        const activeWKBNK: string = WorkbookManager.getActiveWKBK();
        const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
        const prefix: string = workbook.sessionId + Date.now();
        const key: string = (KVStore.getKey("gDagManagerKey") + "-DF-" + prefix);
        let newTab: DagTab = new DagTab(name, prefix, key, dag);
        dag.resetRunningStates();
        this.addDag(name, key);
        newTab.saveTab()
        .then(() => {
            DagTabManager.Instance.loadTab(key);
        })
        .fail(() => {
            this._disableDelete();
            const index: number = this._userDags.findIndex((dag) => {
                return dag.key == key;
            });
            this._userDags.splice(index, 1);
            $("#dagListSection .dagListDetail").eq(index).remove();
            StatusBox.show(DFTStr.DFDrawError, $("#retinaPath"));
            this._enableDelete();
        });
        

    }

    /**
     * Returns the key from the dag at index.
     * Primarily used for testing.
     * @param index 
     * @returns {string}
     */
    public getKeyFromIndex(index: number): string {
        if (index < 0 || index >= this._userDags.length) {
            return "";
        } 
        return this._userDags[index].key;
    }

    /**
     * Resets keys and tabs in the case of error.
     * Also used for testing.
     */
    public reset(): void {
        this._userDags = [];
        this._disableDelete();
        $("#dagListSection .dagListDetails").empty();
        DagTabManager.Instance.reset();
        this._saveDagList();
    }
}