// DagList controls the panel Dataflow List.
class DagList extends Durable {
    private static _instance: DagList;
    public static SQLPrefix = ".tempSQL";

    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _dags: Map<string, DagTab>;
    private _fileLister: FileLister;
    private _setup: boolean;
    private _stateOrder = {};

    private constructor() {
        super(null);
        this._initialize();
        this._setupFileLister();
        this._addEventListeners();

        this._stateOrder[QueryStateTStr[QueryStateT.qrCancelled]] = 2;
        this._stateOrder[QueryStateTStr[QueryStateT.qrNotStarted]] = 3;
        this._stateOrder[QueryStateTStr[QueryStateT.qrProcessing]] = 4;
        this._stateOrder[QueryStateTStr[QueryStateT.qrFinished]] = 0;
        this._stateOrder[QueryStateTStr[QueryStateT.qrError]] = 1;
    }

    /**
     * DagList.Instance.setup
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        if (this._setup) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let needReset: boolean = true;

        this._checkIfNeedReset()
        .then((res) => {
            needReset = res;
            return this._restoreLocalDags(needReset);
        })
        .then(() => {
            return this._restoreSQLFuncDag(needReset);
        })
        .then(() => {
            return this._restorePublishedDags();
        })
        .then(() => {
            return this._fetchAllRetinas();
        })
        .then(() => {
            return this._fetchXcalarQueries();
        })
        .then(() => {
            this._renderDagList(false);
            this._updateSection();
            this._setup = true;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * DagList.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        let $dagList: JQuery = this._getDagListMenuEl();
        if (disable) {
            $dagList.addClass("xc-disabled");
        } else {
            $dagList.removeClass("xc-disabled");
        }
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
        const self = this;
        let sortFunc = (a: {path: string}, b: {path: string}): number => {
            var aName = a.path.toLowerCase();
            var bName = b.path.toLowerCase();
            return (aName < bName ? -1 : (aName > bName ? 1 : 0));
        };
        let querySortFunc = (a: {path: string, options: any}, b: {path: string, options: any}): number => {
            if (a.options.isSDK) {
                if (b.options.isSDK) {
                    var aName = a.path.toLowerCase();
                    var bName = b.path.toLowerCase();
                    return (aName < bName ? -1 : (aName > bName ? 1 : 0));
                } else {
                    return 1; // place sdk queries after abandoned queries
                }
            } else {
                if (b.options.isSDK) {
                    return -1;
                } else { // both abandoned queries
                    if (a.options.state === b.options.state) {
                        return (a.options.createdTime < b.options.createdTime ? -1 : (a.options.createdTime > b.options.createdTime ? 1 : 0));
                    } else {
                        return (self._stateOrder[a.options.state] > self._stateOrder[b.options.state] ? -1 : 1);
                    }
                }
            }

        };
        const publishedList: {path: string, id: string, options: {isOpen: boolean}}[] = [];
        let userList: {path: string, id: string, options: {isOpen: boolean}}[] = [];
        const queryList: {
            path: string,
            id: string,
            options: {isOpen: boolean, createdTime: number, isSDK: boolean, state: string}}[] = [];

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
            } else if (dagTab instanceof DagTabQuery) {
                path = "/" + dagTab.getPath();
                queryList.push({
                    path: path,
                    id: tabId,
                    options: {
                        isOpen: dagTab.isOpen(),
                        isSDK: dagTab.isSDK(),
                        createdTime: dagTab.getCreatedTime(),
                        state: dagTab.getState()
                    }
                });
            } else if (dagTab instanceof DagTabSQLFunc) {
                path = dagTab.getPath();
                userList.push({
                    path: path,
                    id: tabId,
                    options: {isOpen: dagTab.isOpen()}
                });
            } else {
                let dagName: string = dagTab.getName();
                if (this._isForSQLFolder(dagTab)) {
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
        queryList.sort(querySortFunc);
        if (publishedList.length === 0) {
            // add the published folder by default
            publishedList.push({
                path: DagTabPublished.PATH,
                id: null,
                options: {isOpen: false}
            });
        }
        userList = userList.concat(queryList);
        return publishedList.concat(userList);
    }

    public listUserDagAsync(): XDPromise<{dags: {name: string, id: string}[]}> {
        let kvStore = this._getUserDagKVStore();
        return kvStore.getAndParse();
    }

    public listSQLFuncAsync(): XDPromise<{dags: {name: string, id: string}[]}> {
        let kvStore = this._getSQLFuncKVStore();
        return kvStore.getAndParse();
    }

    /**
     * DagList.Instance.saveUserDagList
     */
    public saveUserDagList(): XDPromise<void> {
        return this._saveUserDagList();
    }

    /**
     * DagList.Instance.saveSQLFuncList
     */
    public saveSQLFuncList(): XDPromise<void> {
        return this._saveSQLFuncList();
    }

    /**
     * DagList.Instance.removePublishedDagFromList
     * @param tab
     */
    public removePublishedDagFromList(tab: DagTabPublished): void {
        if (!(tab instanceof DagTabPublished)) {
            return;
        }
        try {
            let tabId = tab.getId();
            this._dags.delete(tabId);
            this._renderDagList(true, true);
            this._updateSection();
        } catch (e) {
          console.error(e);
        }
    }

    /**
     * DagList.Instance.refresh
     */
    public refresh(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promise: XDPromise<void> = deferred.promise();
        const $section: JQuery = this._getDagListSection();
        // delete shared dag and optimized list first
        const oldPublishedDags: Map<string, DagTabPublished> = new Map();
        const oldOptimizedDags: Map<string, DagTabOptimized> = new Map();
        const oldQueryDags: Map<string, DagTabQuery> = new Map();
        for (let [id, dagTab] of this._dags) {
            if (dagTab instanceof DagTabPublished) {
                oldPublishedDags.set(dagTab.getId(), dagTab);
                this._dags.delete(id);
            } else if (dagTab instanceof DagTabOptimized) {
                oldOptimizedDags.set(dagTab.getName(), dagTab);
                this._dags.delete(id);
            } else if (dagTab instanceof DagTabQuery) {
                oldQueryDags.set(dagTab.getQueryName(), dagTab);
                this._dags.delete(id);
            }
        }

        xcUIHelper.showRefreshIcon($section, false, promise);

        this._restorePublishedDags(oldPublishedDags)
        .then(() => {
            return this._fetchAllRetinas(oldOptimizedDags);
        })
        .then(() => {
            return this._fetchXcalarQueries(oldQueryDags, true);
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
        if (!this._setup) {
            return false;
        }

        if (this._isForSQLFolder(dagTab) && this._isHideSQLFolder()) {
            return false;
        }

        if (dagTab instanceof DagTabSQLFunc ||
            dagTab instanceof DagTabUser
        ) {
            this._dags.set(dagTab.getId(), dagTab);
            this._saveDagList(dagTab);
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

        if (dagTab instanceof DagTabSQLFunc ||
            dagTab instanceof DagTabUser
        ) {
            // this is a rename of SQL Function
            dagTab.setName(newName);
            this._saveDagList(dagTab);
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
            $li.find(".canBeDisabledIconWrap").removeClass("xc-disabled");
            $li.find(".xi-duplicate").removeClass("xc-disabled");
        } else {
            $li.removeClass("open");
            $li.find(".canBeDisabledIconWrap").addClass("xc-disabled");
            $li.find(".xi-duplicate").addClass("xc-disabled");
        }
        if (dagTab instanceof DagTabQuery) {
            const state: string = dagTab.getState();
            const $statusIcon: JQuery = $li.find(".statusIcon");
            const html = '<div class="statusIcon state-' + state +
                '" ' + xcTooltip.Attrs + ' data-original-title="' +
                xcStringHelper.camelCaseToRegular(state.slice(2)) + '"></div>'
            if ($statusIcon.length) {
                $statusIcon.replaceWith(html);
            } else {
                $li.find(".gridIcon").after(html);
                $li.addClass("abandonedQuery");
            }
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
    public getValidName(
        prefixName?: string,
        hasBracket?: boolean,
        isSQLFunc?: boolean
    ): string {
        const prefix: string = prefixName || (isSQLFunc ? "fn" : "Dataflow");
        const nameSet: Set<string> = new Set();
        let cnt: number = 1;
        this._dags.forEach((dagTab) => {
            nameSet.add(dagTab.getName());
            if (!isSQLFunc && dagTab instanceof DagTabUser) {
                if (!this._isForSQLFolder(dagTab)) {
                    cnt++;
                }
            } else if (isSQLFunc && dagTab instanceof DagTabSQLFunc) {
                cnt++;
            }
        });
        if (hasBracket) {
            cnt = 0;
        }
        let name: string;
        if (isSQLFunc) {
            name = prefixName ? prefix : `${prefix}${cnt}`;
        } else {
            name = prefixName ? prefix : `${prefix} ${cnt}`;
        }
        while(nameSet.has(name)) {
            cnt++;
            if (isSQLFunc) {
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
    public deleteDataflow(id: string): XDPromise<void> {
        const dagTab: DagTab = this.getDagTabById(id);
        if (dagTab == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const name: string = dagTab.getName();
        let removal: {success: boolean, error?: string} = DagTabManager.Instance.removeTab(id);
        if (!removal.success) {
            return deferred.reject({error: removal.error});
        }

        dagTab.delete()
        .then(() => {
            $('#dagListSection .dagListDetail[data-id="' +id + '"]').remove();
            this._dags.delete(id);
            this._saveDagList(dagTab);
            this._renderDagList(true, true);
            this._updateSection();
            if (dagTab instanceof DagTabPublished) {
                DagSharedActionService.Instance.broadcast(DagGraphEvents.DeleteGraph, {
                    tabId: id
                });
            }
            Log.add(DagTStr.DeleteDataflow, {
                "operation": SQLOps.DeleteDataflow,
                "id": id,
                "dataflowName": name
            });

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public addDataflow(dagTab: DagTab) : void{
        this._dags.set(dagTab.getId(), dagTab);
    }

    public removeDataflow(id: string): void {
        this._dags.delete(id);
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

    /**
     * DagList.Instance.markToResetDags
     */
    public markToResetDags(): XDPromise<void> {
        const kvStore = this._getResetMarkKVStore();
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
        this._saveSQLFuncList();
        this._updateSection();
    }

    /**
     * DagList.Instance.gotToSQLFuncFolder
     * @param path
     */
    public gotToSQLFuncFolder(): void {
        this._fileLister.goToPath("/" + DagTabSQLFunc.HOMEDIR + "/");
    }

    /**
     * DagList.Instance.clearSQLDataflow
     */
    public clearSQLDataflow(): void {
        let sqlDags: DagTab[] = [];
        this._dags.forEach((dagTab) => {
            if (this._isForSQLFolder(dagTab)) {
                sqlDags.push(dagTab);
            }
        });

        sqlDags.forEach((sqlTab) => {
            sqlTab.delete();
            this._dags.delete(sqlTab.getId());
        });
        this._renderDagList(false, true);
        this._updateSection();
    }

    public serialize(dags: DagListTabDurable[]): string {
        let json = this._getDurable(dags);
        return JSON.stringify(json);
    }

    protected _getDurable(dags: DagListTabDurable[]): DagListDurable {
        return {
            version: this.version,
            dags: dags
        }
    }

    private _initialize(): void {
        this._dags = new Map();
        this._setup = false;
    }

    private _getUserDagKVStore(): KVStore {
        let key: string = KVStore.getKey("gDagListKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private _getSQLFuncKVStore(): KVStore {
        let key: string = KVStore.getKey("gSQLFuncListKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string, options: {isOpen: boolean, createdTime?: number, state?: string}}[],
            folders: string[],
            path: string
        ): string => {
            let html: HTML = "";
            let publishedPath = DagTabPublished.PATH.substring(1, DagTabPublished.PATH.length - 1);
            let isInPublishedFolder = path.startsWith(publishedPath);
            let isAbandonedQuery = path.startsWith(DagTabQuery.PATH.substring(0, DagTabQuery.PATH.length - 1)) ||
                                    path.startsWith(DagTabQuery.SDKPATH.substring(0, DagTabQuery.SDKPATH.length - 1));
            // Add folders
            folders.forEach((folder) => {
                let icon = "xi-folder";
                if (folder === "Published" && path === "" || isInPublishedFolder) {
                    icon = "xi-share-icon";
                }
                html += '<li class="folderName">' +
                            '<i class="gridIcon icon ' + icon + '"></i>' +
                            '<div class="name">' + folder + '</div>' +
                        '</li>';
            });
            // Add files
            let deleteIcon: HTML = this._iconHTML("deleteDataflow", "xi-trash", DFTStr.DelDF);
            let duplicateIcon: HTML = this._iconHTML("duplicateDataflow", "xi-duplicate", DFTStr.DupDF);
            let publishIcon: HTML = "";
            if (!isInPublishedFolder) {
                publishIcon = this._iconHTML("publishDataflow", "xi-add-dataflow", DFTStr.PubDF);
            }
            let downloadIcon: HTML = this._iconHTML("downloadDataflow", "xi-download", DFTStr.DownloadDF);
            files.forEach((file) => {
                let openClass: string = "";
                let timeTooltip: string = "";
                let canBeDisabledIconWrap: HTML = "";
                let stateIcon: HTML = "";
                let queryClass: string = "";
                if (file.options) {
                    if (file.options.isOpen) {
                        openClass = "open";
                        canBeDisabledIconWrap =
                        "<div class='canBeDisabledIconWrap'>" +
                            duplicateIcon +
                            publishIcon +
                            downloadIcon +
                        "</div>";
                    } else {
                        canBeDisabledIconWrap =
                        "<div class='canBeDisabledIconWrap xc-disabled'>" +
                            duplicateIcon +
                            publishIcon +
                            downloadIcon +
                        "</div>";
                    }
                    if (file.options.createdTime) {
                        timeTooltip = xcTimeHelper.getDateTip(file.options.createdTime, {prefix: "Created: "});
                    }
                    if (isAbandonedQuery && file.options.state) {
                        queryClass = " abandonedQuery ";
                        stateIcon = '<div class="statusIcon state-' + file.options.state +
                                    '" ' + xcTooltip.Attrs + ' data-original-title="' +
                                    xcStringHelper.camelCaseToRegular(file.options.state.slice(2)) + '"></div>';
                    }
                }

                html +=
                '<li class="fileName dagListDetail ' + openClass + queryClass + '" data-id="' + file.id + '">' +
                    '<i class="gridIcon icon xi-dfg2"></i>' +
                    stateIcon +
                    '<div class="name" ' + timeTooltip + '>' + file.name + '</div>' +
                    '<div class="listIcons">' +
                        deleteIcon + canBeDisabledIconWrap +
                    '</div>' +
                '</li>';
            });
            this._updateIconSection(path);
            return html;
        };
        this._fileLister = new FileLister(this._getDagListSection(), {
            renderTemplate: renderTemplate,
            folderSingleClick: true
        });
    }

    private _renderDagList(keepLocation: boolean = true, ignoreError = false): void {
        const dagLists = this.list();
        this._fileLister.setFileObj(dagLists);
        if (keepLocation) {
            let curPath = this._fileLister.getCurrentPath();
            let path = "Home/";
            if (curPath) {
                path += curPath + "/";
            }
            this._fileLister.goToPath(path, ignoreError);
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

    private _togglLoadState(dagTab: DagTab, isLoading: boolean): void {
        try {
            let tabId = dagTab.getId();
            let $dagListItem = this._getListElById(tabId);
            if (isLoading) {
                this._addLoadingStateOnList($dagListItem);
            } else {
                this._removeLoadingStateOnList($dagListItem);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _addLoadingStateOnList($dagListItem: JQuery): void {
        xcUIHelper.disableElement($dagListItem);
        if ($dagListItem.find(".loadingSection").length === 0) {
            let html: HTML = xcUIHelper.getLoadingSectionHTML("Loading", "loadingSection");
            $dagListItem.find(".name").append(html);
        }
    }

    private _removeLoadingStateOnList($dagListItem: JQuery): void {
        $dagListItem.find(".loadingSection").remove();
        xcUIHelper.enableElement($dagListItem);
    }

    private _loadErroHandler(dagTab: DagTab, noAlert: boolean): void {
        try {
            let tabId = dagTab.getId();
            let $dagListItem = this._getListElById(tabId);
            let icon: HTML = this._iconHTML("error", "gridIcon xi-critical", DFTStr.LoadErr);
            $dagListItem.find(".xc-action:not(.deleteDataflow)").addClass("xc-disabled"); // disable all icons
            $dagListItem.find(".gridIcon").remove();
            let $icon = $(icon);
            $icon.removeClass("xc-action");
            $dagListItem.prepend($icon);
            if (!noAlert) {
                StatusBox.show(DFTStr.LoadErr, $dagListItem);
            }
        } catch (e) {
            console.error(e);
        }
    }

    private _restoreLocalDags(needReset: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userDagTabs: DagTabUser[] = [];

        this.listUserDagAsync()
        .then((res: DagListDurable) => {
            let dags: DagListTabDurable[] = [];
            if (res && res.dags) {
                dags = res.dags;
                if (needReset) {
                    dags.forEach((dagInfo) => {
                        dagInfo.reset = true;
                    });
                }
            }
            return DagTabUser.restore(dags);
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            userDagTabs = dagTabs;
            if (this._isHideSQLFolder()) {
                userDagTabs = userDagTabs.filter((dagTab) => !this._isForSQLFolder(<DagTab>dagTab));
            }

            userDagTabs.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), <DagTab>dagTab);
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

    private _restoreSQLFuncDag(needReset: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let sqFuncDagTabs: DagTab[] = [];

        this.listSQLFuncAsync()
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
            return DagTabSQLFunc.restore(dags);
        })
        .then((ret) => {
            const {dagTabs, metaNotMatch} = ret;
            sqFuncDagTabs = <DagTab[]>dagTabs;
            sqFuncDagTabs.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), dagTab);
            });
            if (metaNotMatch || needReset) {
                // if not match, commit sycn up dag list
                return this._saveSQLFuncList();
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
                    this._dags.set(dagTab.getId(), <DagTab>dagTab);
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

    private _fetchXcalarQueries(
        oldQueryDags?: Map<string, DagTabQuery>,
        refresh?: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarQueryList("*")
        .then((queries) => {
            const activeWKBNK: string = WorkbookManager.getActiveWKBK();
            const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
            const abandonedQueryPrefix: string = "table_DF2_" + workbook.sessionId + "_";
            const sdkPrefix = XcUID.SDKPrefix + XcUser.getCurrentUserName() + "-" + workbook.sessionId + "-";

            const oldQueries: Map<string, DagTabQuery> = oldQueryDags || new Map();
            queries.forEach((query) => {
                let displayName: string;
                if (query.name.startsWith("table_published_")) {
                    displayName = query.name.slice("table_".length);
                    displayName = displayName.slice(0, displayName.lastIndexOf("_dag"));
                } else if (query.name.startsWith(sdkPrefix)) {
                    displayName = query.name.slice(sdkPrefix.length);
                } else if (query.name.startsWith(abandonedQueryPrefix)) {
                    // strip the query name to find the tabId of the original dataflow
                    // so we can get use that dataflow's name
                    displayName = query.name.slice("table_".length);
                    let firstNamePart = displayName.slice(0, ("DF2_" + workbook.sessionId + "_").length)
                    let secondNamePart = displayName.slice(("DF2_" + workbook.sessionId + "_").length);
                    let splitName = secondNamePart.split("_");
                    let tabId = firstNamePart + splitName[0] + "_" + splitName[1];
                    let origTab = this._dags.get(tabId);
                    if (origTab) {
                        displayName = origTab.getName()
                    } else {
                        displayName = secondNamePart;
                    }
                } else {
                    return;
                }

                let newTab = true;
                if (oldQueries.has(query.name)) {
                    const oldDagTab: DagTabQuery = oldQueries.get(query.name);
                    oldDagTab.setState(query.state);
                    if (DagTabManager.Instance.getTabById(oldDagTab.getId())) {
                        newTab = false;
                        this._dags.set(oldDagTab.getId(), oldDagTab);
                        if (oldDagTab.isFocused()) {
                            // restarts status check
                            oldDagTab.unfocus();
                            oldDagTab.focus();
                        }
                    }
                } else if (refresh && query.name.startsWith(abandonedQueryPrefix)) {
                    // if we're refreshing the list and a new abandoned query appears
                    // then do not show it because we don't want to show XD
                    // queries that were created after a page refresh
                    return;
                }
                if (newTab) {
                    const queryTabId = DagTab.generateId();
                    const queryTab = new DagTabQuery({
                                            id: queryTabId,
                                            name: displayName,
                                            queryName: query.name,
                                            state: query.state
                                        });
                    this._dags.set(queryTabId, queryTab);
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

    private _getResetMarkKVStore(): KVStore {
        let key: string = KVStore.getKey("gDagResetKey");
        return new KVStore(key, gKVScope.WKBK);
    }

    private _checkIfNeedReset(): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();
        const kvStore = this._getResetMarkKVStore();
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

    private _saveDagList(dagTabToChange: DagTab): XDPromise<void> {
        if (dagTabToChange instanceof DagTabSQLFunc) {
            return this._saveSQLFuncList();
        } else if (dagTabToChange instanceof DagTabUser) {
            return this._saveUserDagList();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _saveUserDagList(): XDPromise<void> {
        const dags: DagListTabDurable[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabUser &&
                !(dagTab instanceof DagTabSQLFunc) &&
                !this._isForSQLFolder(dagTab)
            ) {
                dags.push(this._getSerializableDagList(dagTab));
            }
        });
        const jsonStr: string = this.serialize(dags);
        const kvStore = this._getUserDagKVStore();
        const promise = kvStore.put(jsonStr, true, true);
        const activeWKBKId = WorkbookManager.getActiveWKBK();
        if (activeWKBKId != null) {
            const workbook = WorkbookManager.getWorkbooks()[activeWKBKId];
            workbook.update();
        }
        return promise;
    }

    private _saveSQLFuncList(): XDPromise<void> {
        const dags: {name: string, id: string, reset: boolean, createdTime: number}[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabSQLFunc) {
                dags.push(this._getSerializableDagList(dagTab));
            }
        });
        const jsonStr: string = this.serialize(dags);
        const kvStore = this._getSQLFuncKVStore();
        return kvStore.put(jsonStr, true, true);
    }

    private _getSerializableDagList(dagTab: DagTabUser | DagTabSQLFunc): DagListTabDurable {
        return {
            name: dagTab.getName(),
            id: dagTab.getId(),
            reset: dagTab.needReset(),
            createdTime: dagTab.getCreatedTime()
        }
    }


    private _updateSection(): void {
        let text: string = `${DFTStr.DFs} (${this._dags.size})`;
        this._getDagListMenuEl().find(".numDF").text(text);
    }

    private _getDagListMenuEl(): JQuery {
        return $("#dagList");
    }

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
    }

    private _getIconSection(): JQuery {
        return this._getDagListMenuEl().find(".iconSection");
    }

    private _getListElById(id: string): JQuery {
        return this._getDagListSection().find('.dagListDetail[data-id="' + id + '"]');
    }

    private _isForSQLFolder(dagTab: DagTab): boolean {
        return DagTabUser.isForSQLFolder(dagTab);
    }

    private _updateIconSection(path: string): void {
        const $iconSection: JQuery = this._getIconSection();
        const $btn = $iconSection.find(".clearSQLBtn");
        if (path === "SQL" && !this._isHideSQLFolder()) {
            $btn.removeClass("xc-hidden");
        } else {
            $btn.addClass("xc-hidden");
        }
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        const $iconSection: JQuery = this._getIconSection();
        $iconSection.find(".refreshBtn").click(() => {
            this.refresh();
        });

        $iconSection.find(".uploadBtn").click(() => {
            DFUploadModal.Instance.show();
        });

        $iconSection.find(".clearSQLBtn").click(() => {
            DagList.Instance.clearSQLDataflow();
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
            DagTabManager.Instance.loadTab(dagTab);
        });

        $dagListSection.on("click", ".deleteDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).closest(".dagListDetail");
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const tabId: string = $dagListItem.data("id");
            Alert.show({
                title: DFTStr.DelDF,
                msg: xcStringHelper.replaceMsg(DFTStr.DelDFMsg, {
                    dfName: $dagListItem.text()
                }),
                onConfirm: () => {
                    xcUIHelper.disableElement($dagListItem);
                    this.deleteDataflow($dagListItem.data("id"))
                    .fail((error) => {
                        let log = error && typeof error === "object" ? error.log : null;
                        if (!log && error && error.error) {
                            log = error.error;
                        }
                        // need to refetch dagListItem after list is updated
                        $dagListItem = this._getListElById(tabId);
                        StatusBox.show(DFTStr.DelDFErr, $dagListItem, false, {
                            detail: log
                        });
                    })
                    .always(() => {
                        // need to refetch dagListItem after list is updated
                        $dagListItem = this._getListElById(tabId);
                        xcUIHelper.enableElement($dagListItem);
                    });
                }
            });
        });

        $dagListSection.on("click", ".duplicateDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).closest(".dagListDetail");
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
            DagTabManager.Instance.duplicateTab(dagTab);
        });

        $dagListSection.on("click", ".publishDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).closest(".dagListDetail");
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
            DFPublishModal.Instance.show(<DagTabUser>dagTab);

        });

        $dagListSection.on("click", ".downloadDataflow", (event) => {
            let $dagListItem: JQuery = $(event.currentTarget).closest(".dagListDetail");
            if ($dagListItem.hasClass("unavailable")) {
                return;
            }
            const dagTab: DagTab = this.getDagTabById($dagListItem.data("id"));
            DFDownloadModal.Instance.show(dagTab);
        });

        DagTabManager.Instance
        .on("beforeLoad", (dagTab: DagTab) => {
            this._togglLoadState(dagTab, true);
        })
        .on("afterLoad", (dagTab: DagTab) => {
            this._togglLoadState(dagTab, false);
        })
        .on("loadFail", (dagTab: DagTab, noAlert: boolean) => {
            this._loadErroHandler(dagTab, noAlert);
        });
    }

    private _isHideSQLFolder(): boolean {
        return (typeof gShowSQLDF === "undefined" || !gShowSQLDF);
    }
}

if (typeof exports !== 'undefined') {
    exports.DagList = DagList;
};
