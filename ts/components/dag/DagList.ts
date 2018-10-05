// DagList controls the panel Dataflow List.
class DagList {
    private static _instance: DagList;
    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _userDags: DagTabUser[];
    private _sharedDags: DagTabShared[];
    private _kvStore: KVStore;
    private _deleteEnabled: boolean;
    private _initialized: boolean;

    private constructor() {
        let key: string = KVStore.getKey("gDagListKey");
        this._deleteEnabled = true;
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this._userDags = [];
        this._sharedDags = [];
        this._initialized = false;
    }

    /**
     * Sets up the DagList
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._restoreUserDags()
        .then(() => {
            // XXX TODO: even fail should continue the process
            return this._restoreSharedDags();
        })
        .then(() => {
            this._initializeDagList();
            this._addEventListeners();
            this._updateSection();
            this._initialized = true;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Get a list of all dags
     */
    public getAll(): DagTab[] {
        const dags: DagTab[] = [];
        this._userDags.forEach((dag) => {
            dags.push(dag);
        });
        this._sharedDags.forEach((dag) => {
            dags.push(dag);
        });
        return dags;
    }

    public getDagTabById(id: string): DagTab {
        const dags: DagTab[] = this.getAll().filter((dag) => dag.getId() === id);
        return dags.length ? dags[0] : null;
    }

    /**
     * Adds a new dataflow to the user's dataflows.
     * @param name The name of the new dataflow
     * @param id The id of the new dataflow
     */
    public addDag(name: string): DagTabUser {
        if (!this._initialized) {
            return;
        }
        let newDagTab: DagTabUser = new DagTabUser(name, null, new DagGraph());
        newDagTab.save();
        this._userDags.push(newDagTab);
        this._addUserDagList([newDagTab]);
        this._saveUserDagList();
        this._updateSection();
        return newDagTab;
    }

    /**
     * Changes the name of a Dataflow in the user's dataflows.
     * @param newName the new name
     * @param id The dataflow we change.
     */
    public changeName(newName: string, id: string): void {
        let index: number = this._userDags.findIndex((dag) => dag.getId() == id);
        let $li: JQuery = null;
        if (index >= 0) {
            // this is a rename of user dag
            this._userDags[index].setName(newName);
            this._saveUserDagList();
            $li = this._getDagListSection().find(".dagListDetail .name").eq(index);
        } else {
            index = this._sharedDags.findIndex((dag) => dag.getId() == id);
            if (index >= 0) {
                this._sharedDags[index].setName(newName);
                $li = this._getDagListSection().find(".dagListDetail .shared").eq(index);
            }
        }

        if ($li != null) {
            $li.text(newName);
        }
    }

    /**
     * Returns if the user has used this name for a dag graph or not.
     * @param name The name we want to check
     * @returns {string}
     */
    public isUniqueName(name: string): boolean {
        let index: number = this._userDags.findIndex((dag) => {
            return dag.getName() == name;
        });
        return (index == -1);
    }

    /**
     * Return a valid name for new dafaflow tab
     */
    public getValidName(): string {
        const nameSet: Set<string> = new Set();
        this._userDags.forEach((dag) => {
            nameSet.add(dag.getName());
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
        const dagTab: DagTab = this._getDagTabFromListItem($dagListItem);
        if (dagTab == null) {
            return PromiseHelper.reject();
        }
        const deferred: JQueryDeferred<{}> = PromiseHelper.deferred();
        const id: string = dagTab.getId();        

        if (!DagTabManager.Instance.removeTab(id)) {
            return deferred.reject();
        }
        this._disableDelete();
        dagTab.delete()
        .then(() => {
            $dagListItem.remove();
            this._userDags = this._userDags.filter((dag) => dag.getId() !== id);
            this._sharedDags = this._sharedDags.filter((dag) => dag.getId() !== id);
            this._saveUserDagList();
            this._updateSection();
            deferred.resolve();
        })
        .fail((err) => {
            console.error("Could not delete tab:" + err);
            this._updateSection();
            deferred.reject(err);
        });

        return deferred.promise();
    }

    /**
     * Switches the active dagList dag to the one with key.
     * @param id Dag id we want to note as active
     */
    public switchActiveDag(id: string): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $dagListSection.find(".dagListDetail").removeClass("active");
        let index: number = this._userDags.findIndex((dag) => dag.getId() == id);
        if (index > 0) {
            $dagListSection.find(".dagListDetail.user").eq(index).addClass("active");
            return;
        }
        index = this._sharedDags.findIndex((dag) => dag.getId() == id);
        if (index > 0) {
            $dagListSection.find(".dagListDetail.shared").eq(index).addClass("active");
            return;
        }
    }

    // XXX TODO: make it work for shared DF
    /**
     * Upload a dag that is represented by a string.
     * @param name Name of the dataflow
     * @param dag The string representing a dag
     */
    public uploadDag(name: string, dag: DagGraph): void {
        // let newTab: DagTab = new DagTab(name, null, dag);
        // const id: string = newTab.getId();
        // dag.resetRunningStates();
        // this.addDag(name, id);
        // newTab.save()
        // .then(() => {
        //     DagTabManager.Instance.loadTab(newTab.getId());
        // })
        // .fail(() => {
        //     this._disableDelete();
        //     const index: number = this._userDags.findIndex((dag) => {
        //         return dag.id == id;
        //     });
        //     this._userDags.splice(index, 1);
        //     $("#dagListSection .dagListDetail").eq(index).remove();
        //     StatusBox.show(DFTStr.DFDrawError, $("#retinaPath"));
        //     this._enableDelete();
        // });
    }

    /**
     * Resets keys and tabs in the case of error.
     * Also used for testing.
     */
    public reset(): void {
        this._userDags = [];
        this._disableDelete();
        this._getDagListSection().find(".dagListDetails ul").empty();
        DagTabManager.Instance.reset();
        this._saveUserDagList();
    }

    private _initializeDagList(): void {
        this._addUserDagList(this._userDags);
        this._addSharedDagList(this._sharedDags);
    }

    private _addUserDagList(dags: DagTabUser[]): void {
        const icon: HTML = this._iconHTML("shareDataflow", "xi-add-dataflow", DFTStr.Share) +
        this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF);
        const html: HTML = dags.map((dag) => {
            let name = xcHelper.escapeHTMLSpecialChar(dag.getName());
            return '<li class="dagListDetail">' +
                        '<span class="name textOverflowOneLine">' +
                            name +
                        '</span>' +
                        icon +
                    '</li>';
        }).join("");
        let $list: JQuery = this._getDagListSection().find(".dagListDetails.user ul");
        $list.append(html);
    }

    private _addSharedDagList(dags: DagTabShared[]): void {
        const basicIcon: HTML = this._iconHTML("downloadDataflow", "xi-download", DFTStr.DownloadDF);
        const html: HTML = dags.map((dag) => {
            let name = xcHelper.escapeHTMLSpecialChar(dag.getName());
            let icon: HTML = basicIcon;
            if (dag.canEdit()) {
                icon = this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF) + icon;
            }
            return '<li class="dagListDetail">' +
                        '<span class="name textOverflowOneLine">' +
                            name +
                        '</span>' +
                        icon +
                    '</li>';
        }).join("");
        let $list: JQuery = this._getDagListSection().find(".dagListDetails.shared ul");
        $list.append(html);
    }

    private _iconHTML(type: string, icon: string, title: string): HTML {
        const tooltip: string = 'data-toggle="tooltip" ' +
                                'data-container="body" ' +
                                'data-title="' + title + '"';
        return `<i class="${type} ${icon} icon" ${tooltip}></i>`;
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $("#dagUpload").click(() => {
            UploadDataflowCard.show();
        });

        // expand/collapse the section
        $dagListSection.on("click", ".listWrap .listInfo", (event) => {
            $(event.currentTarget).closest(".listWrap").toggleClass("active");
        });

        $dagListSection.on("click", ".name", (event) => {
            const $dagListItem: JQuery = $(event.currentTarget).parent();
            const dagTab: DagTab = this._getDagTabFromListItem($dagListItem);
            DagTabManager.Instance.loadTab(dagTab);
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

        // XXX TODO: make it work for shared DF
        $dagListSection.on("click", ".downloadDataflow", (event) => {
            // let $dagListItem: JQuery = $(event.currentTarget).parent();
            // let index: number = $dagListSection.find(".dagListDetail").index($dagListItem);
            // let key: string = this._userDags[index].getId();
            // const dagtabManager: DagTabManager = DagTabManager.Instance;
            // const keyIndex: number = dagtabManager.getTabIndex(key);
            // let graphString: string = "";
            // const name: string = $dagListItem.find(".name").text();
            // if (keyIndex == -1) {
            //     let kvStore: KVStore = new KVStore(key, gKVScope.WKBK);
            //     kvStore.getAndParse()
            //     .then((dagTab) => {
            //         graphString = dagTab.dag;
            //         this._downloadDataflow(name, graphString);
            //     })
            //     .fail(() => {
            //         StatusBox.show(DFTStr.DownloadErr, $dagListItem, false, {
            //             side: "right"
            //         });
            //         return;
            //     });
            // } else {
            //     const dagTab: DagTab = dagtabManager.getTabByIndex(keyIndex);
            //     let graph: DagGraph = dagTab.getGraph();
            //     graphString = graph.serialize();
            //     this._downloadDataflow(name, graphString);
            // }
        });
    }

    private _restoreUserDags(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._kvStore.getAndParse()
        .then((res: {dags: {name: string, id: string}[]}) => {
            let dags: {name: string, id: string}[] = [];
            if (res && res.dags) {
                dags = res.dags;
            }
            return DagTabUser.restore(dags);
        })
        .then((dagTabs, metaNotMatch) => {
            this._userDags = dagTabs;
            if (metaNotMatch) {
                // if not match, commit sycn up dag list
                return this._saveUserDagList();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)

        return deferred.promise();
    }

    private _restoreSharedDags(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabShared.restore()
        .then((dags) => {
            this._sharedDags = dags;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _downloadDataflow(name: string, content: string): void {
        name += ".json";
        xcHelper.downloadAsFile(name, content, true);
    }

    private _saveUserDagList(): void {
        const dags: {name: string, id: string}[] = this._userDags.map((dag) => {
            return {
                name: dag.getName(),
                id: dag.getId()
            }
        });
        const jsonStr: string = JSON.stringify({dags: dags});
        this._kvStore.put(jsonStr, true, true);
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

    private _updateSection(): void {
        const $section: JQuery = this._getDagListSection();
        $section.find(".user .listInfo .num").text(this._userDags.length);
        $section.find(".shared .listInfo .num").text(this._sharedDags.length);

        if (this._userDags.length != 1) {
            this._enableDelete();
        } else if (this._userDags.length == 1) {
            // This happens if a workbook is new.
            this._disableDelete();
        }
    }

    private _getDagTabFromListItem($dagListItem: JQuery): DagTab {
        const index: number = $dagListItem.index();
        const $section: JQuery = $dagListItem.closest(".dagListDetails");
        if ($section.hasClass("user")) {
            // load user tab
            return this._userDags[index];
        } else {
            return this._sharedDags[index];
        }
    }
}