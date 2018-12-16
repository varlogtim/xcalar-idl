// DagList controls the panel Dataflow List.
class DagList {
    private static _instance: DagList;
    public static get Instance() {
        return this._instance || (this._instance = new DagList());
    }

    private _dags: Map<string, DagTab>;
    private _fileLister: FileLister;
    private _kvStore: KVStore;
    private _initialized: boolean;

    private constructor() {
        let key: string = KVStore.getKey("gDagListKey");
        this._kvStore = new KVStore(key, gKVScope.WKBK);
        this._dags = new Map();
        this._initialized = false;
        this._setupFileLister();
        this._addEventListeners();
    }

    /**
     * Sets up the DagList
     * @returns {XDPromise<void>}
     */
    public setup(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._restoreUserDags()
        .then(() => {
            return this._restorePublishedDags();
        })
        .then(() => {
            return this._fetchAllRetinas();
        })
        .then(() => {
            this._renderDagList();
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
    public getAllDags(): Map<string, DagTab> {
        return this._dags;
    }

    public getDagTabById(id: string): DagTab {
        return this._dags.get(id);
    }

    public list(): {path: string, id: string}[] {
        const publishedList: {path: string, id: string}[] = [];
        const userList: {path: string, id: string}[] = [];
        this._dags.forEach((dagTab) => {
            let path = "";
            if (dagTab instanceof DagTabPublished) {
                path = dagTab.getPath();
                publishedList.push({
                    path: path,
                    id: dagTab.getId()
                });
            } else if (dagTab instanceof DagTabOptimized) {
                path = "/" + dagTab.getPath();
                userList.push({
                    path: path,
                    id: dagTab.getId()
                });
            } else {
                path = "/" + dagTab.getName();
                userList.push({
                    path: path,
                    id: dagTab.getId()
                });
            }
        });
        publishedList.sort();
        userList.sort();
        if (publishedList.length === 0) {
            // add the published folder by default
            publishedList.push({
                path: DagTabPublished.PATH,
                id: null
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
        for (let [id, dagTab] of this._dags) {
            if (dagTab instanceof DagTabPublished ||
                dagTab instanceof DagTabOptimized) {
                this._dags.delete(id);
            }
        }

        xcHelper.showRefreshIcon($section, false, promise);
        this._restorePublishedDags()
        .then(() => {
            return this._fetchAllRetinas();
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            this._renderDagList(true);
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
        } else {
            // not support rename published df now
           return;
        }
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
        const prefix: string = prefixName || "Dataflow";
        const nameSet: Set<string> = new Set();
        let cnt: number = 1;
        this._dags.forEach((dagTab) => {
            nameSet.add(dagTab.getName());
            if (dagTab instanceof DagTabUser) {
                cnt++;
            }
        });
        if (hasBracket) {
            cnt = 0;
        }
        let name: string = prefixName ? prefix : `${prefix} ${cnt}`;
        while(nameSet.has(name)) {
            cnt++;
            name = hasBracket ? `${prefix}(${cnt})` : `${prefix} ${cnt}`;
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
        this._updateSection();
    }

    private _setupFileLister(): void {
        const renderTemplate = (
            files: {name: string, id: string}[],
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
                html +=
                '<li class="fileName dagListDetail" data-id="' + file.id + '">' +
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

    private _renderDagList(keepLocation?: boolean): void {
        const dagLists = this.list();
        this._fileLister.setFileObj(dagLists);
        if (keepLocation) {
            let path = "Home/" + this._fileLister.getCurrentPath() + "/";
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

    private _restoreUserDags(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let userDagTabs: DagTabUser[] = [];
        let needReset: boolean = false;

        this._checkIfNeedReset()
        .then((res) => {
            needReset = res;
            return this.listUserDagAsync();
        })
        .then((res: {dags: {name: string, id: string, reset: boolean}[]}) => {
            let dags: {name: string, id: string, reset: boolean}[] = [];
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

    private _restorePublishedDags(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagTabPublished.restore()
        .then((dags) => {
            dags.forEach((dagTab) => {
                this._dags.set(dagTab.getId(), dagTab);
            });
            deferred.resolve();
        })
        .fail((error) => {
            console.error(error);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    private _fetchAllRetinas(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarListRetinas()
        .then((retinas) => {
            retinas.retinaDescs.forEach((retina) => {
                 // hide user dataflows - If we want to expose all optimized
                 // dataflows then set this if to true!
                if (!retina.retinaName.startsWith(gRetinaPrefix)) {
                    const retinaId = DagTab.generateId();
                    const retinaTab = new DagTabOptimized({
                                            id: retinaId,
                                            name: retina.retinaName});
                    this._dags.set(retinaId, retinaTab);
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
        const key: string = KVStore.getKey("gDagResetKey");
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

    private _saveUserDagList(): XDPromise<void> {
        const dags: {name: string, id: string, reset: boolean}[] = [];
        this._dags.forEach((dagTab) => {
            if (dagTab instanceof DagTabUser) {
                dags.push({
                    name: dagTab.getName(),
                    id: dagTab.getId(),
                    reset: dagTab.needReset()
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
        $("#dagList").find(".numDF").text(this._dags.size);
        WorkbookManager.updateDFs(this._dags.size);
    }

    private _getDagListSection(): JQuery {
        return $("#dagListSection");
    }

    private _getListElById(id: string): JQuery {
        return this._getDagListSection().find('.dagListDetail[data-id="' + id + '"]');
    }

    private _addEventListeners(): void {
        const $dagListSection: JQuery = this._getDagListSection();
        $("#dagList .iconSection .refreshBtn").click(() => {
            this.refresh();
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