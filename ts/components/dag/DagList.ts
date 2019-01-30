// DagList controls the panel Dataflow List.
class DagList {
    private static _instance: DagList;
    public static SQLPrefix = ".tempSQL";

    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _dags: Map<string, DagTab>;
    private _fileLister: FileLister;
    private _kvStore: KVStore;
    private _initialized: boolean;

    private constructor() {
        this._initialize();
        this._setupFileLister();
        this._addEventListeners();
    }

    /**
     * Sets up the DagList
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isAdvancedMode: boolean = XVM.isAdvancedMode();
        this._restoreLocalDags(isAdvancedMode)
        .then(() => {
            if (isAdvancedMode) {
                return this._restorePublishedDags();
            }
        })
        .then(() => {
            if (isAdvancedMode) {
                return this._fetchAllRetinas();
            }
        })
        .then(() => {
            this._renderDagList(false);
            this._updateSection();
            this._initialized = true;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public swithMode(): XDPromise<void> {
        if (XVM.isSQLMode()) {
            $("#dagList").addClass("sqlMode");
        } else {
            $("#dagList").removeClass("sqlMode");
        }
        this._initialize();
        return this.setup();
    }

    /**
     * Get a list of all dags
     */
    public getAllDags(): Map<string, DagTab> {
        return this._dags;
    }

    public getDagTabById(id: string): DagTab {
        return this._dags.get(id);
    }

    public list(): {path: string, id: string, options: {isOpen: boolean}}[] {
        let sortFunc = (a: {path: string}, b: {path: string}): number => {
            var aName = a.path.toLowerCase();
            var bName = b.path.toLowerCase();
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        };
        const publishedList: {path: string, id: string, options: {isOpen: boolean}}[] = [];
        const userList: {path: string, id: string, options: {isOpen: boolean}}[] = [];
        this._dags.forEach((dagTab) => {
            let path = "";
            let tabId = dagTab.getId();
            if (dagTab instanceof DagTabPublished) {
                path = dagTab.getPath();
                publishedList.push({
                    path: path,
                    id: tabId,
                    options: {isOpen: dagTab.isOpen()}
                });
            } else if (dagTab instanceof DagTabOptimized) {
                path = "/" + dagTab.getPath();
                userList.push({
                    path: path,
                    id: tabId,
                    options: {isOpen: dagTab.isOpen()}
                });
            } else {
                let dagName: string = dagTab.getName();
                if (this._isForSQLFolder(tabId)) {
                    path = "/" + DagTabSQL.PATH + dagName;
                } else {
                    path = "/" + dagName;
                }
                userList.push({
                    path: path,
                    id: tabId,
                    options: {isOpen: dagTab.isOpen()}
                });
            }
        });
        publishedList.sort(sortFunc);
        userList.sort(sortFunc);
        if (publishedList.length === 0 && XVM.isAdvancedMode()) {
            // add the published folder by default
            publishedList.push({
                path: DagTabPublished.PATH,
                id: null,
                options: {isOpen: false}
            });
        }
        return publishedList.concat(userList);
    }

    public listUserDagAsync(): XDPromise<{dags: {name: string, id: string}[]}> {
        return this._kvStore.getAndParse();
    }

    public save(): XDPromise<void> {
        return this._saveUserDagList();
    }

    public refresh(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promise: XDPromise<void> = deferred.promise();
        const $section: JQuery = this._getDagListSection();
        // delete shared dag and optimized list first
        const oldPublishedDags: Map<string, DagTabPublished> = new Map();
        const oldOptimizedDags: Map<string, DagTabOptimized> = new Map();
        for (let [id, dagTab] of this._dags) {
            if (dagTab instanceof DagTabPublished) {
                oldPublishedDags.set(dagTab.getId(), dagTab);
                this._dags.delete(id);
            } else if (dagTab instanceof DagTabOptimized) {
                oldOptimizedDags.set(dagTab.getName(), dagTab);
                this._dags.delete(id);
            }
        }

        xcHelper.showRefreshIcon($section, false, promise);
        let isAdvancedMode = XVM.isAdvancedMode();
        let def: XDPromise<void> = isAdvancedMode ?
        this._restorePublishedDags(oldPublishedDags) : PromiseHelper.resolve();

        def
        .then(() => {
            if (XVM.isAdvancedMode()) {
                return this._fetchAllRetinas(oldOptimizedDags);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            this._renderDagList();
            this._updateSection();
        });
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
            this._dags.set(dagTab.getId(), dagTab);
            this._saveUserDagList();
        } else if (dagTab instanceof DagTabPublished) {
            this._dags.set(dagTab.getId(), dagTab);
        }
        this._renderDagList();
        this._updateSection();
        return true;
    }

    /**
     * Changes the name of a Dataflow in the user's dataflows.
     * @param newName the new name
     * @param id The dataflow we change.
     */
    public changeName(newName: string, id: string): void {
        const $li: JQuery = this._getListElById(id);
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return;
        }
        if (dagTab instanceof DagTabUser) {
            // this is a rename of user dag
            dagTab.setName(newName);
            this._saveUserDagList();
            $li.find(".name").text(newName);
        }
        // not support rename published df now
        this.updateList();
    }

    /**
     * Changes the list item to be open or not
     * @param id
     */
    public updateDagState(id): void {
        const $li: JQuery = this._getListElById(id);
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return;
        }
        if (dagTab.isOpen()) {
            $li.addClass("open");
        } else {
            $li.removeClass("open");
        }
    }

    public updateList(): void {
        this._renderDagList();
    }

    /**
     * Returns if the user has used this name for a dag graph or not.
     * @param name The name we want to check
     * @returns {string}
     */
    public isUniqueName(name: string): boolean {
        let found: boolean = false;
        this._dags.forEach((dagTab) => {
            if (dagTab.getName() == name) {
                found = true;
                return false; // stop llo
            }
        });
        return (found === false);
    }

    /**
     * Return a valid name for new dafaflow tab
     */
    public getValidName(prefixName?: string, hasBracket?: boolean): string {
        const isSQLMode: boolean = XVM.isSQLMode();
        const prefix: string = prefixName || (isSQLMode ? "fn" : "Dataflow");
        const nameSet: Set<string> = new Set();
        let cnt: number = 1;
        this._dags.forEach((dagTab) => {
            nameSet.add(dagTab.getName());
            if (!isSQLMode && dagTab instanceof DagTabUser) {
                let tabId: string = dagTab.getId();
                if (!this._isForSQLFolder(tabId)) {
                    cnt++;
                }
            } else if (isSQLMode && dagTab instanceof DagTabSQLFunc) {
                cnt++;
            }
        });
        if (hasBracket) {
            cnt = 0;
        }
        let name: string;
        if (isSQLMode) {
            name = prefixName ? prefix : `${prefix}${cnt}`;
        } else {
            name = prefixName ? prefix : `${prefix} ${cnt}`;
        }
        while(nameSet.has(name)) {
            cnt++;
            if (isSQLMode) {
                name = `${prefix}${cnt}`;
            } else {
                name = hasBracket ? `${prefix}(${cnt})` : `${prefix} ${cnt}`;
            }
        }
        return name;
    }

    /**
     * Deletes the dataflow represented by dagListItem from the dagList
     * Also removes from dagTabs if it is active.
     * @param $dagListItem Dataflow we want to delete.
     * @returns {XDPromise<void>}
     */
    public deleteDataflow($dagListItem: JQuery): XDPromise<void> {
        const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
        if (dagTab == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const id: string = dagTab.getId();
        let removal: {success: boolean, error?: string} = DagTabManager.Instance.removeTab(id);
        if (!removal.success) {
            return deferred.reject({error: removal.error});
        }

        dagTab.delete()
        .then(() => {
            $dagListItem.remove();
            this._dags.delete(id);
            if (dagTab instanceof DagTabUser) {
                this._saveUserDagList();
            }
            this._renderDagList();
            this._updateSection();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Switches the active dagList dag to the one with key.
     * @param id Dag id we want to note as active
     */
    public switchActiveDag(id: string): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $dagListSection.find(".dagListDetail").removeClass("active");
        this._getListElById(id).addClass("active");
    }

    public markToResetDags(sqlMode: boolean): XDPromise<void> {
        const kvStore = this._getResetMarkKVStore(sqlMode);
        return kvStore.put("reset", false, true);
    }

    /**
     * Resets keys and tabs in the case of error.
     * Also used for testing.
     */
    public reset(): void {
        this._dags = new Map();
        this._getDagListSection().find(".dagListDetails ul").empty();
        DagTabManager.Instance.reset();
        this._saveUserDagList();
        this._updateSection();
    }

    private _initialize(): void {
        this._setLocalKVStore();
        this._dags = new Map();
        this._initialized = false;
    }

    private _setLocalKVStore(): void {
        let key: string = null;
        if (XVM.isAdvancedMode()) {
            key = KVStore.getKey("gDagListKey");
        } else {
            // sql mode
            key = KVStore.getKey("gSQLFuncListKey");

        }
        this._kvStore = new KVStore(key, gKVScope.WKBK);
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string, options: {isOpen: boolean}}[],
            folders: string[]
        ): string => {
            let html: HTML = "";
            // Add folders
            folders.forEach((folder) => {
                html += '<li class="folderName">' +
                            '<i class="gridIcon icon xi-folder"></i>' +
                            '<div class="name">' + folder + '</div>' +
                        '</li>';
            });
            // Add files
            const icon: HTML = this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF);
            files.forEach((file) => {
                let openClass: string = "";
                if (file.options && file.options.isOpen) {
                    openClass = "open";
                }
                html +=
                '<li class="fileName dagListDetail ' + openClass + '" data-id="' + file.id + '">' +
                    '<i class="gridIcon icon xi-dfg2"></i>' +
                    '<div class="name">' + file.name + '</div>' +
                    icon +
                '</li>';
            });
            return html;
        };
        this._fileLister = new FileLister(this._getDagListSection(), {
            renderTemplate: renderTemplate,
            folderSingleClick: true
        });
    }

    private _renderDagList(keepLocation: boolean = true): void {
        const dagLists = this.list();
        this._fileLister.setFileObj(dagLists);
        if (keepLocation) {
            let curPath = this._fileLister.getCurrentPath();
            let path = "Home/";
            if (curPath) {
                path += curPath + "/";
            }
            this._fileLister.goToPath(path);
        } else {
            this._fileLister.render();
        }
    }

    private _iconHTML(type: string, icon: string, title: string): HTML {
        const tooltip: string = 'data-toggle="tooltip" ' +
                                'data-container="body" ' +
                                'data-title="' + title + '"';
        return `<i class="${type} ${icon} icon xc-action" ${tooltip}></i>`;
    }

    private _loadErroHandler($dagListItem: JQuery): void {
        const icon: HTML = this._iconHTML("error", "gridIcon xi-critical", DFTStr.LoadErr);
        $dagListItem.find(".xc-action:not(.deleteDataflow)").addClass("xc-disabled"); // disable all icons
        $dagListItem.find(".gridIcon").remove();
        $dagListItem.prepend(icon);
        StatusBox.show(DFTStr.LoadErr, $dagListItem);
    }

    private _restoreLocalDags(isAdvancedMode: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userDagTabs: DagTabUser[] = [];
        let needReset: boolean = false;

        this._checkIfNeedReset(isAdvancedMode)
        .then((res) => {
            needReset = res;
            return this.listUserDagAsync();
        })
        .then((res: {dags: {name: string, id: string, reset: boolean, createdTime: number}[]}) => {
            let dags: {name: string, id: string, reset: boolean, createdTime: number}[] = [];
            if (res && res.dags) {
                dags = res.dags;
                if (needReset) {
                    dags.forEach((dagInfo) => {
                        dagInfo.reset = true;
                    });
                }
            }
            if (isAdvancedMode) {
                return DagTabUser.restore(dags);
            } else {
                return DagTabSQLFunc.restore(dags);
            }
        })
        .then((dagTabs, metaNotMatch) => {
            userDagTabs = dagTabs;
            userDagTabs.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), dagTab);
            });
            if (metaNotMatch || needReset) {
                // if not match, commit sycn up dag list
                return this._saveUserDagList();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _restorePublishedDags(
        oldPublishedDags?: Map<string, DagTabPublished>
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabPublished.restore()
        .then((dags) => {
            const oldDags: Map<string, DagTabOptimized> = oldPublishedDags || new Map();
            dags.forEach((dagTab) => {
                // if the old tab still exists, use it because it contains
                // data such as whether it's closed or open
                if (oldDags.has(dagTab.getId()) &&
                    DagTabManager.Instance.getTabById(dagTab.getId())) {
                    const oldDag = oldDags.get(dagTab.getId());
                    this._dags.set(oldDag.getId(), oldDag);
                } else {
                    this._dags.set(dagTab.getId(), dagTab);
                }
            });
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _fetchAllRetinas(
        oldOptimizedDags?: Map<string, DagTabOptimized>
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarListRetinas()
        .then((retinas) => {
            const oldDags: Map<string, DagTabOptimized> = oldOptimizedDags || new Map();
            retinas.retinaDescs.forEach((retina) => {
                 // hide user dataflows - If we want to expose all optimized
                 // dataflows then set this if to true!
                if (!retina.retinaName.startsWith(gRetinaPrefix)) {
                    let newTab = true;
                    if (oldDags.has(retina.retinaName)) {
                        const oldDagTab: DagTabOptimized = oldDags.get(retina.retinaName);
                        if (DagTabManager.Instance.getTabById(oldDagTab.getId())) {
                            newTab = false;
                            this._dags.set(oldDagTab.getId(), oldDagTab);
                            if (oldDagTab.isFocused()) {
                                // restarts status check
                                oldDagTab.unfocus();
                                oldDagTab.focus();
                            }
                        }
                    }
                    if (newTab) {
                        const retinaId = DagTab.generateId();
                        const retinaTab = new DagTabOptimized({
                                                id: retinaId,
                                                name: retina.retinaName});
                        this._dags.set(retinaId, retinaTab);
                    }
                }
            });
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _getResetMarkKVStore(sqlMode: boolean): KVStore {
        let key: string;
        if (sqlMode) {
            key = KVStore.getKey("gSQLFuncResetKey");
        } else {
            key = KVStore.getKey("gDagResetKey");
        }
        return new KVStore(key, gKVScope.WKBK);
    }

    private _checkIfNeedReset(isAdvancedMode: boolean): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const isSQLMode: boolean = !isAdvancedMode;
        const kvStore = this._getResetMarkKVStore(isSQLMode);
        let reset: boolean = false;

        kvStore.get()
        .then((val) => {
            if (val != null) {
                // when has val, it's a rest case
                reset = true;
                return kvStore.delete(); // delete the key
            }
        })
        .then(() => {
            deferred.resolve(reset);
        })
        .fail(() => {
            deferred.resolve(reset); // still resolve it
        });

        return deferred.promise();
    }

    private _saveUserDagList(): XDPromise<void> {
        const dags: {name: string, id: string, reset: boolean, createdTime: number}[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabUser) {
                dags.push({
                    name: dagTab.getName(),
                    id: dagTab.getId(),
                    reset: dagTab.needReset(),
                    createdTime: dagTab.getCreatedTime()
                });
            }
        });
        const jsonStr: string = JSON.stringify({dags: dags});
        const promise = this._kvStore.put(jsonStr, true, true);
        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            workbook.update();
        }
        KVStore.logSave(true);
        return promise;
    }

    private _updateSection(): void {
        let text: string = XVM.isSQLMode() ? SQLTStr.Func : DFTStr.DFs;
        text = `${text} (${this._dags.size})`;
        $("#dagList").find(".numDF").text(text);
        WorkbookManager.updateDFs(this._dags.size);
    }

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
    }

    private _getListElById(id: string): JQuery {
        return this._getDagListSection().find('.dagListDetail[data-id="' + id + '"]');
    }

    private _isForSQLFolder(id: string): boolean {
        return id && id.endsWith("sql");
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        const $iconSection: JQuery = $("#dagList .iconSection");
        $iconSection.find(".refreshBtn").click(() => {
            this.refresh();
        });

        $iconSection.find(".uploadBtn").click(() => {
            DFUploadModal.Instance.show();
        });

        // expand/collapse the section
        $dagListSection.on("click", ".listWrap .listInfo", (event) => {
            $(event.currentTarget).closest(".listWrap").toggleClass("active");
        });

        $dagListSection.on("click", ".fileName .name", (event) => {
            const $dagListItem: JQuery = $(event.currentTarget).parent();
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
            xcHelper.disableElement($dagListItem);
            DagTabManager.Instance.loadTab(dagTab)
            .fail(() => {
                this._loadErroHandler($dagListItem);
            })
            .always(() => {
                xcHelper.enableElement($dagListItem);
            });
        });

        $dagListSection.on("click", ".deleteDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).parent();
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            Alert.show({
                title: DFTStr.DelDF,
                msg: xcHelper.replaceMsg(DFTStr.DelDFMsg, {
                    dfName: $dagListItem.text()
                }),
                onConfirm: () => {
                    xcHelper.disableElement($dagListItem);
                    this.deleteDataflow($dagListItem)
                    .fail((error) => {
                        let log = error && typeof error === "object" ? error.log : null;
                        if (!log && error && error.error) {
                            log = error.error;
                        }
                        StatusBox.show(DFTStr.DelDFErr, $dagListItem, false, {
                            detail: log
                        });
                    })
                    .always(() => {
                        xcHelper.enableElement($dagListItem);
                    });
                }
            });
        });
    }
}