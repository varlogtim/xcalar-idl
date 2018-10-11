// DagList controls the panel Dataflow List.
class DagList {
    private static _instance: DagList;
    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _userDags: DagTabUser[];
    private _sharedDags: DagTabShared[];
    private _kvStore: KVStore;
    private _initialized: boolean;

    private constructor() {
        let key: string = KVStore.getKey("gDagListKey");
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

    public refresh(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promise: XDPromise<void> = deferred.promise();
        const $section: JQuery = this._getDagListSection();
        xcHelper.showRefreshIcon($section, false, promise);
        this._restoreSharedDags()
        .then(() => {
            this._updateSection();
            deferred.resolve();
        })
        .fail(deferred.reject);
        return promise;
    }

    /**
     * Adds a new dataflow.
     * @param dagTab The instance of the new dataflow
     */
    public addDag(dagTab: DagTab): boolean {
        if (!this._initialized) {
            return false;
        }
        if (dagTab instanceof DagTabUser) {
            this._userDags.push(dagTab);
            this._addUserDagList([dagTab]);
            this._saveUserDagList();
        } else if (dagTab instanceof DagTabShared) {
            this._sharedDags.push(dagTab);
            this._addSharedDagList([dagTab]);
        }
        this._updateSection();
        return true;
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
        let index: number = this.getAll().findIndex((dag) => {
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
        dagTab.delete()
        .then(() => {
            $dagListItem.remove();
            if (dagTab instanceof DagTabUser) {
                this._userDags = this._userDags.filter((dag) => dag.getId() !== id);
                this._saveUserDagList();
            } else if (dagTab instanceof DagTabShared) {
                this._sharedDags = this._sharedDags.filter((dag) => dag.getId() !== id);
            }
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            this._updateSection();
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

    /**
     * Resets keys and tabs in the case of error.
     * Also used for testing.
     */
    public reset(): void {
        this._userDags = [];
        this._getDagListSection().find(".dagListDetails ul").empty();
        DagTabManager.Instance.reset();
        this._saveUserDagList();
        this._updateSection();
    }

    private _addUserDagList(dags: DagTabUser[]): void {
        const icon: HTML = this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF);
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
            let icon: HTML = this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF) + basicIcon;
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
        return `<i class="${type} ${icon} icon xc-action" ${tooltip}></i>`;
    }

    private _loadErroHandler($dagListItem: JQuery): void {
        const icon: HTML = this._iconHTML("error", "xi-critical", DFTStr.LoadErr);
        $dagListItem.find(".xc-action:not(.deleteDataflow)").addClass("xc-disabled"); // disable all icons
        $dagListItem.prepend(icon);
        StatusBox.show(DFTStr.LoadErr, $dagListItem);
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $("#dagUpload").click(() => {
            DFUploader.show();
        });

        $("#dagList .iconSection .refreshBtn").click(() => {
            this.refresh();
        });

        // expand/collapse the section
        $dagListSection.on("click", ".listWrap .listInfo", (event) => {
            $(event.currentTarget).closest(".listWrap").toggleClass("active");
        });

        $dagListSection.on("click", ".name", (event) => {
            const $dagListItem: JQuery = $(event.currentTarget).parent();
            const dagTab: DagTab = this._getDagTabFromListItem($dagListItem);
            DagTabManager.Instance.loadTab(dagTab)
            .fail(() => {
                this._loadErroHandler($dagListItem);
            });
        });

        $dagListSection.on("click", ".deleteDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            Alert.show({
                title: DFTStr.DelDF,
                msg: xcHelper.replaceMsg(DFTStr.DelDFMsg, {
                    dfName: $dagListItem.text()
                }),
                onConfirm: () => {
                    this.deleteDataflow($dagListItem)
                    .fail((error) => {
                        StatusBox.show(DFTStr.DelDFErr, $dagListItem, false, {
                            detail: error.log
                        });
                    });
                }
            });
        });

        $dagListSection.on("click", ".downloadDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            if (!$dagListItem.closest(".dagListDetails").hasClass("shared")) {
                return;
            }
            // Now only support download of shared dataflow
            const index: number = $dagListItem.index();
            const dagTab: DagTabShared = this._sharedDags[index];
            dagTab.download()
            .fail((error) => {
                StatusBox.show(DFTStr.DownloadErr, $dagListItem, false, {
                    detail: error.log
                });
            });
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
        .then(() => {
            this._addUserDagList(this._userDags);
            deferred.resolve();
        })
        .fail(deferred.reject)

        return deferred.promise();
    }

    private _restoreSharedDags(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabShared.restore()
        .then((dags) => {
            this._sharedDags = dags;
            this._getDagListSection().find(".dagListDetails.shared ul").empty();
            this._addSharedDagList(dags);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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

    private _updateSection(): void {
        const $section: JQuery = this._getDagListSection();
        $section.find(".user .listInfo .num").text(this._userDags.length);
        $section.find(".shared .listInfo .num").text(this._sharedDags.length);

        const $deleteBtns: JQuery = this._getDagListSection().find(".dagListDetails.user")
        .find(".deleteDataflow");
        if (this._userDags.length != 1) {
            $deleteBtns.removeClass('xc-hidden');
        } else if (this._userDags.length == 1) {
            // This happens if a workbook is new.
            $deleteBtns.addClass('xc-hidden');
        }
    }

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
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