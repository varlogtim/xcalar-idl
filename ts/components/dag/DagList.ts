// DagList controls the panel Dataflow List.

class DagList {
    private static _instance: DagList;
    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _userDags: {name: string, key: string}[];
    private _kvStore: KVStore;
    private _deleteEnabled: boolean;
    private _initialized: boolean;

    private constructor() {
        let key: string = KVStore.getKey("gDagListKey");
        this._deleteEnabled = true;
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this._userDags = [];
        this._initialized = false;
    }

    /**
     * Sets up the DagList
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        var deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._kvStore.getAndParse()
        .then((dagListJSON: {dags: {name: string, key: string}[]}) => {
            dagListJSON = dagListJSON || {dags: []};
            this._userDags = this._userDags.concat(dagListJSON.dags);
            this._initializeDagList();
            this._addEventListeners();
            this._initialized = true;
            if(this._userDags.length > 1) {
                this._enableDelete();
            } else {
                this._disableDelete();
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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
        let newDag: {name: string, key: string} = {
            name: name,
            key: key
        };
        this._userDags.push(newDag);
        this._addBulkDagListHtml([name]);
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
        let $list: JQuery = this._getDagListSection().find(".dagListDetail .name");
        $list.eq(index).text(newName);
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
     * Return a valid name for new dafaflow tab
     */
    public getValidName(): string {
        const nameSet: Set<string> = new Set();
        this._userDags.forEach((dag) => {
            nameSet.add(dag.name);
        });
        let cnt = this._userDags.length;
        let name: string = `Dataflow ${cnt}`;
        while(nameSet.has(name)) {
            cnt++;
            name = `Dataflow ${cnt}`;
        }
        return name;
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
     * @param id Dag id we want to note as active
     */
    public switchActiveDag(id: string): void {
        $("#dagListSection .dagListDetail").removeClass("active");
        let index: number = this._userDags.findIndex((dag) => {
            return dag.key == id;
        });
        $("#dagListSection .dagListDetail").eq(index).addClass("active");
    }

    /**
     * Upload a dag that is represented by a string.
     * @param name Name of the dataflow
     * @param dag The string representing a dag
     */
    public uploadDag(name: string, dag: DagGraph): void {
        let newTab: DagTab = new DagTab(name, null, dag);
        const key: string = newTab.getId();
        dag.resetRunningStates();
        this.addDag(name, key);
        newTab.saveTab()
        .then(() => {
            DagTabManager.Instance.loadTab(newTab.getId());
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

    private _initializeDagList(): void {
        let names: string[] = this._userDags.map((dag) => dag.name);
        this._addBulkDagListHtml(names);
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $('#dagList .uploadBtn').click(() => {
            UploadDataflowCard.show();
        });

        $dagListSection.on("click", ".name", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            let index: number = $dagListSection.find(".dagListDetail").index($dagListItem);
            let key: string = this._userDags[index].key;
            DagTabManager.Instance.loadTab(key);
        });

        $dagListSection.on("click", ".deleteDataflow", (event) => {
            if (!this._deleteEnabled) {
                return;
            }
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            Alert.show({
                title: DFTStr.DelDF,
                msg: xcHelper.replaceMsg(DFTStr.DelDFMsg, {
                    dfName: $dagListItem.text()
                }),
                onConfirm: () => {
                    this.deleteDataflow($dagListItem)
                    .fail(() => {
                        StatusBox.show(DFTStr.DelDFErr, $dagListItem);
                    });
                }
            });
        })

        $dagListSection.on("click", ".downloadDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            let index: number = $dagListSection.find(".dagListDetail").index($dagListItem);
            let key: string = this._userDags[index].key;
            const dagtabManager: DagTabManager = DagTabManager.Instance;
            const keyIndex: number = dagtabManager.getTabIndex(key);
            let graphString: string = "";
            const name: string = $dagListItem.find(".name").text();
            if (keyIndex == -1) {
                let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
                kvStore.getAndParse()
                .then((dagTab) => {
                    graphString = dagTab.dag;
                    this._downloadDataflow(name, graphString);
                })
                .fail(() => {
                    StatusBox.show(DFTStr.DownloadErr, $dagListItem, false, {
                        side: "right"
                    });
                    return;
                });
            } else {
                const dagTab: DagTab = dagtabManager.getTabByIndex(keyIndex);
                let graph: DagGraph = dagTab.getGraph();
                graphString = graph.serialize();
                this._downloadDataflow(name, graphString);
            }
        });
    }

    private _downloadDataflow(name: string, content: string): void {
        name += ".json";
        xcHelper.downloadAsFile(name, content, true);
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

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
    }

    private _disableDelete(): void {
        this._getDagListSection().find(".deleteDataflow").addClass('xc-hidden');
        this._deleteEnabled = false;
    }

    private _enableDelete(): void {
        this._getDagListSection().find(".deleteDataflow").removeClass('xc-hidden');
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
        let $list: JQuery = this._getDagListSection().find(".dagListDetails");
        $list.append(html);
    }
}