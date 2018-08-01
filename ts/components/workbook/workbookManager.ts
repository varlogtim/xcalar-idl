namespace WorkbookManager {
    let wkbkStore: KVStore;
    let activeWKBKId: string;
    let wkbkSet: WKBKSet;
    let checkInterval: number = 2000; // progress bar check time
    let progressTimeout: any;

    /**
    * WorkbookManager.setup
    * initial setup
    */
    export function setup(): XDPromise<string> {
        initializeVariable();
        setupSessionCancel();
        return setupWorkbooks();
    };

    function setupWorkbooks(refreshing?: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        WorkbookManager.getWKBKsAsync(refreshing)
        .then(syncSessionInfo)
        .then(function(wkbkId) {
            if (wkbkId == null) {
                setURL(null, true);
                deferred.reject(WKBKTStr.NoWkbk);
            } else {
                // retrieve key from username and wkbkId
                setupKVStore();
                setActiveWKBK(wkbkId);
                setURL(wkbkId, true);
                deferred.resolve(wkbkId);
            }
        })
        .fail(function(error) {
            if (error !== WKBKTStr.NoWkbk) {
                console.error("Setup Workbook fails!", error);
            }
            deferred.reject(error);
        })
        .always(function() {
            KVStore.logSave(true);
        });

        return deferred.promise();
    }

    /**
    * WorkbookManager.upgrade
    * upgrades the list of workbooks to newer versions
    * @param oldWkbks - the current set of workbooks
    */
    export function upgrade(oldWkbks: object): object {
        if (oldWkbks == null) {
            return null;
        }

        const newWkbks: object = {};
        for (let wkbkId in oldWkbks) {
            const wkbk: WKBK = oldWkbks[wkbkId];
            newWkbks[wkbkId] = KVStore.upgrade(wkbk, "WKBK");
        }

        return newWkbks;
    };

    /**
    * WorkbookManager.commit
    * Commits the active workbook and saves it
    */
    export function commit(): XDPromise<void> {
        // if activeWKBK is null, then it's creating a new WKBK
        if (activeWKBKId != null) {
            const wkbk: WKBK = wkbkSet.get(activeWKBKId);
            if (wkbk != null) {
                wkbk.update();
            }
        }

        return saveWorkbook();
    };

    /**
    * WorkbookManager.getWorkbooks
    * Returns the set of workbooks
    */
    export function getWorkbooks(): object {
        return wkbkSet.getAll();
    };

    /**
    * WorkbookManager.getWorkbooks
    * Returns a workbook based on id
    * @param workbookId - id of the target workbook
    */
    export function getWorkbook(workbookId: string): WKBK {
        return wkbkSet.get(workbookId) || null;
    };

    /**
    * WorkbookManager.getWKBKsAsync
    * gets workbook based on id asyncronously
    * @param refreshing - boolean, if only refreshing perform no modifications
    */
    export function getWKBKsAsync(refreshing?: boolean): XDPromise<object> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        let sessionInfo: object[];

        XcalarListWorkbooks("*")
        .then(function(sessionRes) {
            sessionInfo = sessionRes;
            return wkbkStore.getAndParse();
        })
        .then(function(wkbk) {
            deferred.resolve(wkbk, sessionInfo, refreshing);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
    * WorkbookManager.getActiveWKBK
    * gets active workbook
    */
    export function getActiveWKBK(): string {
        return activeWKBKId;
    };

    function setActiveWKBK(workbookId: string): boolean {
        if (workbookId == null) {
            activeWKBKId = null;
            setSessionName(null);
            return true;
        }

        const wkbk: WKBK = wkbkSet.get(workbookId);
        if (wkbk == null) {
            // error case
            return false;
        }

        activeWKBKId = workbookId;
        setSessionName(wkbk.getName());
        return true;
    }

    function setURL(workbookId: string, replace: boolean, newTab: boolean = false): void {
        try {
            const curHref: string = window.location.href;
            let workbookName: string = null;
            let newHref: string;
            if (workbookId != null && wkbkSet.has(workbookId)) {
                workbookName = wkbkSet.get(workbookId).getName();
                newHref = xcHelper.setURLParam("workbook", workbookName);
            } else {
                newHref = xcHelper.deleteURLParam("workbook");
            }

            if (newTab) {
                const win: Window = window.open(newHref, '_blank');
                if (win) {
                    win.focus();
                }
                return;
            }

            if (!curHref.endsWith(newHref)) {
                if (replace) {
                    window.history.replaceState("view workbook", workbookName, newHref);
                } else {
                    window.history.pushState("view workbook", workbookName, newHref);
                }
            }
        } catch (e) {
            console.error("set url error", e);
        }
    }

    /**
    * WorkbookManager.updateWorksheet
    * updates the number of worksheets in the active workbook
    * @param numWorksheets - the new number of worksheets
    */
    export function updateWorksheet(numWorksheets: number): void {
        const workbook: WKBK = wkbkSet.get(activeWKBKId);
        workbook.numWorksheets = numWorksheets;
    };

    /**
    * WorkbookManager.newWKBK
    * creates a new workbook
    * @param wkbkName - name of the new workbook
    * @param scrWKBKId - if duplicating a workbook, the source workbook, optional
    */
    export function newWKBK(wkbkName: string, srcWKBKId?: string): XDPromise<string> {
        if (!wkbkName) {
            return PromiseHelper.reject("Invalid name");
        }

        const isCopy: boolean = (srcWKBKId != null);
        let copySrc: WKBK = null;

        if (isCopy) {
            copySrc = wkbkSet.get(srcWKBKId);
            if (copySrc == null) {
                // when the source workbook's meta not exist
                return PromiseHelper.reject("missing workbook meta");
            }
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const copySrcName: string = isCopy ? copySrc.name : null;
        const username: string = XcUser.getCurrentUserName();

        XcalarNewWorkbook(wkbkName, isCopy, copySrcName)
        .then(function() {
            return finishCreatingWKBK(wkbkName, username, isCopy, copySrc);
        })
        .then(function(wkbkId) {
            if (typeof SQLEditor !== "undefined") {
                SQLEditor.dropAllSchemas(wkbkId);
            }
            deferred.resolve(wkbkId);
        })
        .fail(function(error) {
            console.error("Create workbook failed!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.switchWKBK
    * switches between workbooks
    * @param wkbkId - id of the workbook to switch to
    * @param newTab - should the workbook be opened in a new tab, by default false
    * @param workbookBox - if opening in a new tab, the workbook card that should be updated to active, optional
    */
    export function switchWKBK(wkbkId: string, newTab: boolean = false, $workbookBox?: JQuery): XDPromise<void> {
        // validation
        if (wkbkId === activeWKBKId) {
            return PromiseHelper.reject({
                "error": "Cannot switch to same workbook"
            });
        }

        const toWkbk: WKBK = wkbkSet.get(wkbkId);
        if (toWkbk == null) {
            return PromiseHelper.reject({
                "error": "Invalid workbook Id"
            });
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        if (!newTab) {
            $("#initialLoadScreen").show();
        } else {
            if ($workbookBox.hasClass("active")) {
                setURL(wkbkId, false, true);
                deferred.resolve();
                return deferred.promise();
            }

            $workbookBox.addClass("loading");
        }

        const promise: XDPromise<void> = (!newTab && activeWKBKId != null) ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        XcSupport.stopHeartbeatCheck();

        promise
        .then(function() {
            const toWkbkName: string = toWkbk.getName();
            return switchWorkBookHelper(toWkbkName);
        })
        .then(function() {
            if (!newTab) {
                setActiveWKBK(wkbkId);
                return switchWorkbookAnimation();
            } else {
                setURL(wkbkId, false, true);
                $workbookBox.addClass("active");
                $workbookBox.find(".isActive").text(WKBKTStr.Active);
                deferred.resolve();
            }
        })
        .then(function() {
            if (!newTab) {
                WorkbookManager.gotoWorkbook(wkbkId);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Switch Workbook Fails", error);
            error = error || {error: "Error occurred while switching workbooks"};
            if (!newTab) {
                $("#initialLoadScreen").hide();
                $("#container").removeClass("switchingWkbk");
            }
            endProgressCycle();
            deferred.reject(error);
        })
        .always(function() {
            if (newTab) {
                $workbookBox.removeClass("loading");
            }
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.gotoWorkbook
    * navigates the browser to a workbook
    * @param workbookId - id of the workbook
    * @param replaceURL - bool, should the current url be replaced
    */
    export function gotoWorkbook(workbookId: string, replaceURL: boolean = false): void {
        setURL(workbookId, replaceURL);
        xcHelper.reload();
    };

    function countdown(): XDPromise<void> {
        if (!$("#monitorTopBar").find(".wkbkTitle").is(":visible")) {
            return PromiseHelper.resolve();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let time: number = 3;
        const msg: string = xcHelper.replaceMsg(WKBKTStr.Refreshing, {
            time: time
        });
        $("#monitorTopBar").find(".wkbkTitle").text(msg);

        const interval: NodeJS.Timer = setInterval(function() {
            time--;
            if (time > 0) {
                const msg: string = xcHelper.replaceMsg(WKBKTStr.Refreshing, {
                    time: time
                });
                $("#monitorTopBar").find(".wkbkTitle").text(msg);
            } else {
                clearInterval(interval);
                deferred.resolve();
            }
        }, 1000);

        return deferred.promise();
    }

    function isActiveWorkbook(workbookName: string): XDPromise<boolean> {
        const deferred: XDDeferred<boolean> = PromiseHelper.deferred();

        XcalarListWorkbooks(workbookName)
        .then(function(ret) {
            const session: any = ret.sessions[0];
            const isActive: boolean = (session.state === "Active");
            deferred.resolve(isActive);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function switchWorkBookHelper(wkbkName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const queryName: string = XcUser.getCurrentUserName() + ":" + wkbkName;

        $("#initialLoadScreen").data("curquery", queryName);
        $("#container").addClass("switchingWkbk");

        cleanProgressCycle(queryName)
        .then(() => {
            progressCycle(queryName, checkInterval);
            return restoreInactivePublishedTable(wkbkName);
        })
        .then(function() {
            progressCycle(queryName, checkInterval);
            $("#initialLoadScreen").data("curquery", queryName);
            $("#container").addClass("switchingWkbk");
            return XcalarActivateWorkbook(wkbkName);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error && error.canceled) {
                deferred.reject(error);
                return;
            }
            console.error(error);

            isActiveWorkbook(wkbkName)
            .then(function(isActive) {
                if (isActive) {
                    // when it's active
                    deferred.resolve();
                } else {
                    deferred.reject(error);
                }
            })
            .fail(deferred.reject);
        })
        .always(function() {
            $("#initialLoadScreen").removeClass("canceling")
                                   .removeData("canceltime");
            $("#initialLoadScreen").find(".animatedEllipsisWrapper .text")
                                    .text(StatusMessageTStr.PleaseWait);
            $("#container").removeClass("switchingWkbk");
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "activate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        });

        return deferred.promise();
    }

    /**
    * WorkbookManager.copyWKBK
    * copies a workbook
    * @param srcWKBKId - id of the workbook to be copied
    * @param wkbkName - name of the new workbook
    */
    export function copyWKBK(srcWKBKId: string, wkbkName: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const promise: XDPromise<void> = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return WorkbookManager.newWKBK(wkbkName, srcWKBKId);
        })
        .then(function(newId) {
            if (copyHelper(srcWKBKId, newId)) {
                deferred.resolve(newId);
            } else {
                deferred.reject("Error when copy workbook meta data");
            }
        })
        .fail(function(error) {
            console.error("Copy Workbook fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.downloadWKBK
    * downloads a workbook
    * @param workbookName - name of the workbook to be downloaded
    */
    export function downloadWKBK(workbookName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let jupyterFolderPath: string = "";
        const wkbk: WKBK = wkbkSet.get(getWKBKId(workbookName));

        if (wkbk) {
            const folderName: string = wkbk.jupyterFolder;
            if (folderName) {
                jupyterFolderPath = window['jupyterNotebooksPath'] + folderName +
                                    "/";
            }
        }

        XcalarDownloadWorkbook(workbookName, jupyterFolderPath)
        .then(function(file) {
            xcHelper.downloadAsFile(workbookName + ".tar.gz", file.sessionContent, true);
            deferred.resolve();
        })
        .fail(function(err) {
            deferred.reject(err);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.uploadWKBK
    * uploads a workbook from a file
    * @param workbookName - name of the workbook to upload
    * @param workbookContent - the file being uploaded
    */
    export function uploadWKBK(workbookName: string, workbookContent: File): XDPromise<string> {
        let deferred: XDDeferred<string> = PromiseHelper.deferred();

        let jupFolderName: string;
        const username: string = XcUser.getCurrentUserName();
        let parsedWorkbookContent: any;

        readFile(workbookContent)
        .then(function(res) {
            parsedWorkbookContent = res;
            return JupyterPanel.newWorkbook(workbookName);
        })
        .then(function(folderName) {
            let jupyterFolderPath: string;
            if (typeof folderName !== "string") {
                // it's an error so default to "";
                folderName = "";
            }
            jupFolderName = folderName;
            if (!folderName) { // can be empty due to error or if not found
                jupyterFolderPath = "";
            } else {
                jupyterFolderPath = window['jupyterNotebooksPath'] + folderName +
                                    "/";
            }
            return XcalarUploadWorkbook(workbookName, parsedWorkbookContent,
                                        jupyterFolderPath);
        })
        .then(function() {
            return finishCreatingWKBK(workbookName, username, null, null,
                                      jupFolderName);
        })
        .then(function(wkbkId) {
            if (typeof SQLEditor !== "undefined") {
                SQLEditor.dropAllSchemas(wkbkId);
            }
            deferred.resolve(wkbkId);
        })
        .fail(function(err) {
            // XXX need to remove jupyter folder
            deferred.reject(err);
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.uploadWKBK
    * deactivate a workbook by id
    * @param workbookId - id of the workbook to be deactivated
    */
    export function deactivate(workbookId: string): XDPromise<void> {
        const wkbk: WKBK = wkbkSet.get(workbookId);
        if (wkbk == null) {
            return PromiseHelper.reject(WKBKTStr.DeactivateErr);
        }

        // should stop check since seesion is released
        XcSupport.stopHeartbeatCheck();

        $("#initialLoadScreen").show();
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const isCurrentWKBK: boolean = (workbookId === activeWKBKId);
        const promise: XDPromise<void> = isCurrentWKBK ?
                        commitActiveWkbk() : PromiseHelper.resolve();

        promise
        .then(function() {
            return XcalarDeactivateWorkbook(wkbk.getName());
        })
        .then(function() {
            // no need to save as resource will be synced in setup
            wkbk.setResource(false);

            if (isCurrentWKBK) {
                setActiveWKBK(null);
                setURL(null, true);
            }
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(workbookId);
            xcSocket.sendMessage("refreshWorkbook", {
                "action": "deactivate",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": workbookId
            });
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(function() {
            $("#initialLoadScreen").hide();
            endProgressCycle();
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.inActiveAllWKBK
    * deactivate all workbooks
    */
    export function inActiveAllWKBK(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const promises: XDPromise<void>[] = [];

        XcalarListWorkbooks("*")
        .then(function(output) {
            const numSessions: number = output.numSessions;
            const sessions: any = output.sessions;
            for (let i: number = 0; i < numSessions; i++) {
                const session: any = sessions[i];
                if (session.state === "Active") {
                    promises.push(XcalarDeactivateWorkbook.bind(this,
                                                                session.name));
                }
            }

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            setActiveWKBK(null);
            WorkbookManager.gotoWorkbook(null, true);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
    * WorkbookManager.updateDescription
    * update the description of a workbook
    * @param wkbkId - id of the workbook to be updated
    * @param description - new description
    */
    export function updateDescription(wkbkId: string, description: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const wkbk: WKBK = wkbkSet.get(wkbkId);
        wkbk.description = description;
        wkbk.update();

        saveWorkbook()
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "description",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": wkbkId
            });
            deferred.resolve(wkbkId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    /**
    * WorkbookManager.renameWKBK
    * update the name of a workbook
    * @param srcWKBKId - id of the workbook to be updated
    * @param newName - new name for the workbook
    * @param description - description of the workbook
    */
    export function renameWKBK(srcWKBKId: string, newName: string, description: string): XDPromise<string> {
        const newWKBKId: string = getWKBKId(newName);
        if (wkbkSet.has(newWKBKId)) {
            let errStr: string = xcHelper.replaceMsg(ErrTStr.WorkbookExists, {
                workbookName: newName
            });
            return PromiseHelper.reject(errStr);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const isCurrentWKBK: boolean = (srcWKBKId === activeWKBKId);
        const srcWKBK: WKBK = wkbkSet.get(srcWKBKId);

        // should follow theses order:
        // 1. stop heart beat check (in case key is changed)
        // 2. copy meta to new wkbkb,
        // 3. rename wkbk
        // 4. delete meta in current wkbk
        // 5. update wkbkSet meta
        // 6. reset KVStore and change active key if change current wkbk's name
        // 7. restart heart beat check
        XcSupport.stopHeartbeatCheck();

        const promise: XDPromise<void> = (activeWKBKId == null)
                      ? PromiseHelper.resolve() // when no active workbook
                      : KVStore.commit();

        promise
        .then(function() {
            return XcalarRenameWorkbook(newName, srcWKBK.name);
        })
        .then(function() {
            return JupyterPanel.renameWorkbook(srcWKBK.jupyterFolder, newName);
        })
        .then(function(folderName) {
            if (typeof folderName !== "string") {
                folderName = srcWKBK.jupyterFolder;
            }
            const options: object = {
                "id": newWKBKId,
                "name": newName,
                "description": description || srcWKBK.description,
                "created": srcWKBK.created,
                "srcUser": srcWKBK.srcUser,
                "curUser": srcWKBK.curUser,
                "numWorksheets": srcWKBK.numWorksheets,
                "resource": srcWKBK.resource,
                "jupyterFolder": folderName,
                "sessionId": srcWKBK.sessionId
            };

            const newWkbk: WKBK = new WKBK(options);
            wkbkSet.put(newWKBKId, newWkbk);
            wkbkSet.delete(srcWKBK.id);
            return saveWorkbook();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "rename",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": srcWKBKId,
                "oldName": srcWKBK.name,
                "newName": newName
            });
            if (typeof SQLEditor !== "undefined") {
                SQLEditor.dropAllSchemas(newWKBKId);
            }
            if (isCurrentWKBK) {
                /// Change workbookname in status bar
                $("#worksheetInfo .wkbkName").text(newName);
                return resetActiveWKBK(newWKBKId);
            }
        })
        .then(function() {
            deferred.resolve(newWKBKId);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.deleteWKBK
    * deletes a given workbook
    * @param workbookId - id of the workbook to be deleted
    */
    export function deleteWKBK(workbookId: string): XDPromise<any> {
        const workbook: WKBK = wkbkSet.get(workbookId);

        if (workbook == null) {
            return PromiseHelper.reject(WKBKTStr.DelErr);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        // 1. Stop heart beat check (Heartbeat key may change due to active
        //                           worksheet changing)
        // 2. Delete workbook form backend
        // 3. Delete the meta data for the current workbook
        // 4. Restart heart beat check
        XcSupport.stopHeartbeatCheck();

        XcalarDeleteWorkbook(workbook.name)
        .then(function() {
            JupyterPanel.deleteWorkbook(workbookId);
            wkbkSet.delete(workbook.id);
            return WorkbookManager.commit();
        })
        .then(function() {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "delete",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk":workbookId
            });
            if (typeof SQLEditor !== "undefined") {
                SQLEditor.dropAllSchemas(workbookId);
            }
            deferred.resolve.apply(this, arguments);
        })
        .fail(deferred.reject)
        .always(function() {
            XcSupport.restartHeartbeatCheck();
        });

        return deferred.promise();
    };

    /**
    * WorkbookManager.getIDfromName
    * constructs a workbook id based on name
    * @param name - name of the workbook
    */
    export function getIDfromName(name: string): string {
        return getWKBKId(name);
    };

    function initializeVariable(): void {
        // key that stores all workbook infos for the user
        const wkbkKey: string = getWKbkKey(currentVersion);
        wkbkStore = new KVStore(wkbkKey, gKVScope.USER);
        wkbkSet = new WKBKSet();
    }

    function setupSessionCancel(): void {
        const $loadScreen: JQuery = $("#initialLoadScreen");
        $loadScreen.find(".cancel").click(function() {
            if ($loadScreen.hasClass("canceling")) {
                return;
            }
            $loadScreen.addClass("canceling");
            const time: number = Date.now();
            $loadScreen.data('canceltime', time);
            $loadScreen.addClass("alertOpen");

            Alert.show({
                "title": WKBKTStr.CancelTitle,
                "msg": WKBKTStr.CancelMsg,
                "hideButtons": ["cancel"],
                "buttons": [{
                    "name": AlertTStr.CLOSE,
                    "className": "btn-cancel",
                    func: function() {
                        $loadScreen.removeClass("canceling alertOpen");
                    }
                }, {
                    "name": AlertTStr.CONFIRM,
                    func: cancel
                }],
                "onCancel": function() {
                    $loadScreen.removeClass("canceling alertOpen");
                },
                "ultraHighZindex": true
            });

            function cancel(): void {
                $loadScreen.removeClass("alertOpen");
                if ($loadScreen.data("canceltime") !== time ||
                    !$loadScreen.hasClass("canceling")) {
                    return;
                }
                endProgressCycle();

                $loadScreen.find(".animatedEllipsisWrapper .text")
                           .text(StatusMessageTStr.Canceling);
                const queryName: string = $loadScreen.data("curquery");
                XcalarQueryCancel(queryName)
                .always(function() {
                    $loadScreen.removeClass("canceling")
                               .removeData("canceltime");
                    $loadScreen.find(".animatedEllipsisWrapper .text")
                               .text(StatusMessageTStr.PleaseWait);
                });
            }
        });
    }

    function getWKbkKey(version: number): string {
        const username: string = XcUser.getCurrentUserName();
        return generateKey(username, "workbookInfos", version);
    }


    function setupKVStore(): void {
        const globlKeys: any = WorkbookManager.getGlobalScopeKeys(currentVersion);
        const userScopeKeys: any = getUserScopeKeys(currentVersion);
        const wkbkScopeKeys: any = getWkbkScopeKeys(currentVersion);

        const keys: string[] = $.extend({}, globlKeys, userScopeKeys, wkbkScopeKeys);

        KVStore.setup(keys);
    }

    /**
    * WorkbookManager.getGlobalScopeKeys
    * gets global scope keys
    * @param version - version number
    */
    export function getGlobalScopeKeys(version: number): any {
        const gEphInfoKey: string = generateKey("", "gEphInfo", version);
        const gSharedDSKey: string = generateKey("", "gSharedDS", version);
        const gSettingsKey: string = generateKey("", "gSettings", version);

        return {
            "gEphStorageKey": gEphInfoKey,
            "gSettingsKey": gSettingsKey,
            "gSharedDSKey": gSharedDSKey
        };
    }

    function getUserScopeKeys(version: number): any {
        const username: string = XcUser.getCurrentUserName();
        const gUserKey: string = generateKey(username, "gUser", version);

        return {
            "gUserKey": gUserKey
        };
    }

    function getWkbkScopeKeys(version: number): any {
        const gStorageKey: string = generateKey("gInfo", version);
        const gLogKey: string = generateKey("gLog", version);
        const gErrKey: string = generateKey("gErr", version);
        const gOverwrittenLogKey: string = generateKey("gOverwritten", version);
        const gNotebookKey: string = generateKey("gNotebook", version);
        const gAuthKey: string = generateKey("authentication", version);
        const gIMDKey: string = generateKey("gIMDKey", version);
        const gSQLTablesKey: string = generateKey("gSQLTables", version);
        const gDagManagerKey: string = generateKey("gDagManagerKey", version);
        const gDagListKey: string = generateKey("gDagListKey", version);
        const gSQLQueryKey: string = generateKey("gSQLQuery", version);
        const gSQLEditorKey: string = generateKey("gSQLEditor", version);
        const gSQLEditorQuery: string = generateKey("gSQLEditorQuery", version);

        return {
            "gStorageKey": gStorageKey,
            "gLogKey": gLogKey,
            "gErrKey": gErrKey,
            "gOverwrittenLogKey": gOverwrittenLogKey,
            "gAuthKey": gAuthKey,
            "gNotebookKey": gNotebookKey,
            "gIMDKey": gIMDKey,
            "gSQLTables": gSQLTablesKey,
            "gSQLQuery": gSQLQueryKey,
            "gDagManagerKey": gDagManagerKey,
            "gDagListKey": gDagListKey,
            "gSQLEditor": gSQLEditorKey,
            "gSQLEditorQuery": gSQLEditorQuery
        };
    }

    // sync sessionInfo with wkbkInfo
    function syncSessionInfo(oldWorkbooks: object, sessionInfo: any, refreshing: boolean): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        syncWorkbookMeta(oldWorkbooks, sessionInfo, refreshing)
        .then(function() {
            const activeWorkbooks: string[] = getActiveWorkbooks(sessionInfo);
            const activeId: string = getActiveWorkbookId(activeWorkbooks);
            deferred.resolve(activeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getActiveWorkbooks(sessionInfo: any): string[] {
        const numSessions: number = sessionInfo.numSessions;
        const sessions: any = sessionInfo.sessions;
        const activeWorkbooks: string[] = [];
        for (let i: number = 0; i < numSessions; i++) {
            if (sessions[i].state === "Active") {
                activeWorkbooks.push(sessions[i].name);
            }
        }
        return activeWorkbooks;
    }

    function getActiveWorkbookId(activeWorkbooks: string[]): string {
        const params: object = xcHelper.decodeFromUrl(window.location.href);
        const activeWKBKName: string = params["workbook"];
        if (activeWKBKName && activeWorkbooks.includes(activeWKBKName)) {//XXX includes does exist on array
            return getWKBKId(activeWKBKName);
        } else {
            return null;
        }
    }

    function checkResource(sessionInfo: string): boolean {
        return (sessionInfo.toLowerCase() === "has resources");
    }

    function syncWorkbookMeta(oldWorkbooks: object, sessionInfo: any, refreshing: boolean): XDPromise<void> {
        try {
            if (oldWorkbooks == null) {
                oldWorkbooks = {};
            }
            const numSessions: number = sessionInfo.numSessions;
            const sessions: any = sessionInfo.sessions;
            if  (refreshing) {
                initializeVariable();
            }

            for (let i: number = 0; i < numSessions; i++) {
                const wkbkName: string = sessions[i].name;
                const hasResouce: boolean = checkResource(sessions[i].info);
                const wkbkId: string = getWKBKId(wkbkName);
                let wkbk: WKBK;

                if (oldWorkbooks.hasOwnProperty(wkbkId)) {
                    wkbk = new WKBK(oldWorkbooks[wkbkId]);
                    delete oldWorkbooks[wkbkId];
                } else {
                    console.warn("Error!", wkbkName, "has no meta.");
                    wkbk = new WKBK({
                        "id": wkbkId,
                        "name": wkbkName,
                        "noMeta": true
                    });
                }

                wkbk.setSessionId(sessions[i].sessionId);
                wkbk.setResource(hasResouce);
                wkbkSet.put(wkbkId, wkbk);
            }

            for (let oldWkbkId in oldWorkbooks) {
                console.warn("Error!", oldWkbkId, "is missing.");
            }

            if (refreshing) {
                return PromiseHelper.resolve();
            } else {
                return saveWorkbook();
            }
        } catch (error) {
            console.error(error);
            return PromiseHelper.reject("error");
        }
    }

    /**
    * WorkbookManager.getKeysForUpgrade
    * gets all relevant keys when performing an upgrade
    * @param sessionInfo - information about the current session
    * @param version - version number
    */
    export function getKeysForUpgrade(sessionInfo: any, version: number): any {
        const globalKeys: any = WorkbookManager.getGlobalScopeKeys(version);
        const userKeys: any = getUserScopeKeysForUpgrade(version);
        const wkbkKeys: any = getWkbkScopeKeysForUpgrade(sessionInfo, version);

        return {
            "global": globalKeys,
            "user": userKeys,
            "wkbk": wkbkKeys
        };
    };

    /**
    * WorkbookManager.getKeysForUpgrade
    * gets storage key
    */
    export function getStorageKey(): string {
        return getWkbkScopeKeys(currentVersion).gStorageKey;
    };

    /**
    * WorkbookManager.updateWorkbooks
    * updates workbook info from socket
    * @param info - info from socket containing operation, workbook id and new value
    */
    export function updateWorkbooks(info: any): void {
        if (XcUser.getCurrentUserName() !== info.user) {
            // XXX socket should only send messages to relevant users
            return;
        }
        const activeWkbk: string = WorkbookManager.getActiveWKBK();
        if (info.action === "deactivate" &&
            activeWkbk && activeWkbk === info.triggerWkbk) {
            XcSupport.stopHeartbeatCheck();
            const wkbk: WKBK = wkbkSet.get(activeWkbk);
            wkbk.setResource(false);
            setActiveWKBK(null);
            setURL(null, true);
            WorkbookPanel.show();
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.unregisterUserSession(activeWkbk);
            $("#container").addClass("noWorkbook noMenuBar");

            return;
        }
        setupWorkbooks(true)
        .always(function() {
            if (info.action === "rename") {
                if (activeWkbk && activeWkbk === info.triggerWkbk) {
                    $("#worksheetInfo .wkbkName").text(info.newName);
                    const newWKBKId: string = getWKBKId(info.newName);
                    resetActiveWKBK(newWKBKId);
                    const newFoldername: string = WorkbookManager.getWorkbook(newWKBKId).jupyterFolder;
                    JupyterPanel.updateFolderName(newFoldername);
                }
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            } else if (info.action === "delete") {
                WorkbookPanel.updateWorkbooks(info);
                WorkbookInfoModal.update(info);
            }
            WorkbookPanel.listWorkbookCards();
        });
    };

    function getUserScopeKeysForUpgrade(version: number): any {
        let keys: any = getUserScopeKeys(version);
        const wkbkKeyOfVersion: string = getWKbkKey(version);

        keys = $.extend(keys, {
            "wkbkKey": wkbkKeyOfVersion
        });

        return keys;
    }

    function getWkbkScopeKeysForUpgrade(sessionInfo:any, version: number): any {
        const wkbks: any = {};
        const numSessions: number = sessionInfo.numSessions;
        const sessions: any = sessionInfo.sessions;

        for (let i: number = 0; i < numSessions; i++) {
            let wkbkName: string = sessions[i].name;
            const key: any = getWkbkScopeKeys(version);
            wkbks[wkbkName] = key;
        }

        return wkbks;
    }

    function saveWorkbook(): XDPromise<void> {
        return wkbkStore.put(wkbkSet.getWithStringify(), true);
    }

    function resetActiveWKBK(newWKBKId: string): XDPromise<void> {
        setupKVStore();
        setActiveWKBK(newWKBKId);
        setURL(newWKBKId, true);
        // rehold the session as KVStore's key changed
        return XcUser.CurrentUser.holdSession(newWKBKId, true);
    }

    // if upload, jupFolderName should be provided
    function finishCreatingWKBK(wkbkName: string, username: string, isCopy: boolean, copySrc: WKBK, jupFolderName?: string): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let wkbk: WKBK;

        let jupyterPromise: XDPromise<string>;
        if (!jupFolderName) {
            jupyterPromise = JupyterPanel.newWorkbook(wkbkName);
        } else {
            jupyterPromise = PromiseHelper.resolve(jupFolderName);
        }

        jupyterPromise
        .then(function(folderName) {
            // when create new wkbk, we always deactiveate it
            if (typeof folderName !== "string") {
                folderName = "";
            }

            // XXX for uploads, we should include description and numWorksheets
            const options: any = {
                "id": getWKBKId(wkbkName),
                "name": wkbkName,
                "srcUser": username,
                "curUser": username,
                "resource": false,
                "jupyterFolder": folderName
            };

            if (isCopy) {
                options.numWorksheets = copySrc.numWorksheets;
                options.modified = copySrc.modified;
            }

            wkbk = new WKBK(options);
            wkbkSet.put(wkbk.id, wkbk);

            return saveWorkbook();
        })
        .then(function() {
            // If workbook is active, make it inactive so that our UX is linear
            return XcalarListWorkbooks(wkbkName);
        })
        .then(function(retStruct) {
            if (retStruct.numSessions !== 1) {
                let error: string;
                if (retStruct.numSessions === 0) {
                    error = ErrTStr.NoWKBKErr;
                } else {
                    error = ErrTStr.MultipleWKBKErr;
                }
                console.error(error);
                deferred.reject(error);
            } else {
                try {
                    wkbk.setSessionId(retStruct.sessions[0].sessionId);
                } catch (e) {
                    console.error(e);
                }

                if (retStruct.sessions[0].state === "Active") {
                    // This happens when there are no active sessions. The
                    // first one we create gets auto activated
                    xcAssert(!WorkbookManager.getActiveWKBK());
                    XcalarDeactivateWorkbook(retStruct.sessions[0].name)
                    .always(function() {
                        broadCast();
                        deferred.resolve(wkbk.id);
                        // XXX Handle failure here separately! It should never
                        // happen...
                    });
                } else {
                    broadCast();
                    deferred.resolve(wkbk.id);
                }
            }
        })
        .fail(deferred.reject);

        function broadCast(): void {
            XcSocket.Instance.sendMessage("refreshWorkbook", {
                "action": "newWorkbook",
                "user": XcUser.getCurrentUserName(),
                "triggerWkbk": getWKBKId(wkbkName)
            });
        }

        return deferred.promise();
    }

    // helper for WorkbookManager.copyWKBK
    function copyHelper(srcId: string, newId: string): boolean {
        const oldWKBK: WKBK = wkbkSet.get(srcId);
        const newWKBK: WKBK = wkbkSet.get(newId);
        if (oldWKBK == null || newWKBK == null) {
            return false;
        }
        JupyterPanel.copyWorkbook(oldWKBK.jupyterFolder, newWKBK.jupyterFolder);
        return true;
    }

    function commitActiveWkbk(): XDPromise<void> {
        // to switch workbook, should release all ref count first
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        PromiseHelper.alwaysResolve(SQLEditor.storeQuery())
        .then(function() {
            return PromiseHelper.alwaysResolve(TblManager.freeAllResultSetsSync());
        })
        .then(function() {
            return KVStore.commit();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    // generate key for KVStore use
    function generateKey(...args: any[]): string {
        // currently just cat all arguments as a key
        let key: string;
        for (let i: number = 0; i < args.length; i++) {
            if (args[i]) {
                if (!key) {
                    key = args[i];
                } else {
                    key += "-" + args[i];
                }
            }
        }
        return (key);
    }

    function getWKBKId(wkbkName: string): string {
        const username: string = XcUser.getCurrentUserName();
        return generateKey(username, "wkbk", wkbkName);
    }

    function switchWorkbookAnimation(failed: boolean = false): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!failed) {
            progressComplete();
        }
        const $loadScreen: JQuery = $("#initialLoadScreen");
        $loadScreen.removeClass("canceling").removeData("canceltime");
        $loadScreen.find(".animatedEllipsisWrapper .text")
                   .text(StatusMessageTStr.PleaseWait);
        countdown()
        .always(function() {
            MainMenu.close(true);
            WorkbookPanel.hide(true);

            deferred.resolve();
        });
        return deferred.promise();
    }

    // Note: due to bug 12614, we need to delete the queryName first
    function cleanProgressCycle(queryName: string): XDPromise<void> {
        return PromiseHelper.alwaysResolve(XcalarQueryDelete(queryName));
    }

    function progressCycle(queryName: string, adjustTime?: number, retry: boolean = false): void {
        let intTime: number = checkInterval;
        if (adjustTime) {
            intTime = Math.max(200, checkInterval - adjustTime);
        }

        progressTimeout = <any>setTimeout(function() {
            const timeoutNum: number = progressTimeout;
            const startTime: number = Date.now();
            getProgress(queryName)
            .then(function(progress) {
                if (timeoutNum !== progressTimeout || progress.numTotal < 1) {
                    return;
                }

                const $loadScreen: JQuery = $("#initialLoadScreen");
                const $bar: JQuery = $loadScreen.find(".progressBar");
                const $numSteps: JQuery = $loadScreen.find(".numSteps");
                const $progressNode: JQuery = $loadScreen.find(".progressNode");
                if (!$loadScreen.hasClass("sessionProgress")) {
                    $loadScreen.addClass("sessionProgress");
                    $bar.stop().width(0).data("pct", 0);
                    $progressNode.text("").data("node", "");
                }
                $bar.data("totalsteps", progress.numTotal);
                $numSteps.text(progress.numCompleted + "/" + progress.numTotal);

                const prevNode: any = $progressNode.data("node");
                const curNode: any = progress.processingNode;
                let pct: number;
                if (curNode) {
                    $progressNode.text(StatusMessageTStr.CurrReplay + ": " +
                                        XcalarApisTStr[curNode.api])
                                 .data("node", curNode);
                    pct = Math.round(100 * curNode.numWorkCompleted /
                                           curNode.numWorkTotal);
                } else if (prevNode) {
                    $progressNode.text(StatusMessageTStr.CompReplay + ": " +
                                       XcalarApisTStr[prevNode.api]);
                    pct = 100;
                } else {
                    pct = 0;
                }
                pct = Math.max(pct, 0);
                pct = Math.min(pct, 100); // between 0 and 100

                if (prevNode && curNode &&
                    prevNode.dagNodeId !== curNode.dagNodeId) {
                    // new node so reset width
                    $bar.stop().width(0).data("pct", 0);
                }

                if (pct && pct >= $bar.data("pct")) {
                    let animTime: number = checkInterval;
                    if (pct === 100) {
                        animTime /= 2;
                    }
                    $bar.animate({"width": pct + "%"}, animTime, "linear");
                    $bar.data("pct", pct);
                }

                if (progress.numCompleted !== progress.numTotal) {
                    const elapsedTime: number = Date.now() - startTime;
                    progressCycle(queryName, elapsedTime);
                }
            })
            .fail(function() {
                if (timeoutNum !== progressTimeout) {
                    return;
                }
                if (!retry) {
                    progressCycle(queryName, null, true);
                }
            });
        }, intTime);
    }

    function getProgress(queryName: string): XDPromise<any> {
        const deferred: XDDeferred<object> = PromiseHelper.deferred();
        XcalarQueryState(queryName)
        .then(function(ret) {
            let state: any;
            let numCompleted: number = 0;
            let processingNode: string;
            for (let i: number = 0; i < ret.queryGraph.numNodes; i++) {
                state = ret.queryGraph.node[i].state;
                if (state === DgDagStateT.DgDagStateReady) {
                    numCompleted++;
                } else if (state === DgDagStateT.DgDagStateProcessing) {
                    processingNode = ret.queryGraph.node[i];
                }
            }
            const progress: any = {
                numCompleted: numCompleted,
                numTotal: ret.queryGraph.numNodes,
                processingNode: processingNode
            };
            deferred.resolve(progress);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    function progressComplete(): void {
        const $loadScreen: JQuery = $("#initialLoadScreen");
        const $bar: JQuery = $loadScreen.find(".progressBar");
        const $numSteps: JQuery = $loadScreen.find(".numSteps");
        $bar.stop().width("100%").data('pct', 100);
        const numSteps: string = $bar.data("totalsteps");
        $numSteps.text(numSteps + "/" + numSteps);
        clearTimeout(progressTimeout);
    }

    function endProgressCycle(): void {
        clearTimeout(progressTimeout);
        progressTimeout += "canceled";
        $("#initialLoadScreen").removeClass("sessionProgress");
    }

    function readFile(file: File): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        const reader: FileReader = new FileReader();

        reader.onload = function(event: any) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event: any) {
            const error: DOMException = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    // always resolves
    function restoreInactivePublishedTable(wkbkName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let progressCircle: ProgressCircle;
        let canceled: boolean = false;
        let currTable: string;
        let successTables: string[] = [];
        let failedTables: string[] = [];

        checkHasSessionTables(wkbkName)
        .then(function(hasTables) {
            if (hasTables) {
                return XcalarListPublishedTables("*")
            } else {
                return PromiseHelper.resolve({tables: []});
            }
        })
        .then(function(result) {
            let inactiveTables: string[] = [];
            result.tables.forEach(function(table) {
                if (!table.active) {
                    inactiveTables.push(table.name);
                }
            });

            if (inactiveTables.length) {
                showRestoreProgress(inactiveTables.length);
                return restoreAllPublishedTables(inactiveTables);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            const $waitSection: JQuery = $("#initialLoadScreen").find(".publishSection");
            $waitSection.empty();
            $waitSection.removeClass("hasProgress");
            $waitSection.parent().removeClass("pubTable");
        });

        return deferred.promise();

        function checkHasSessionTables(wkbkName: string): XDPromise<boolean> {
            const innerDeferred: XDDeferred<boolean> = PromiseHelper.deferred();
            const currentSession: string = sessionName;
            setSessionName(wkbkName);

            XcalarGetTables("*")
            .then(function(res) {
                innerDeferred.resolve(res.numNodes > 0)
            })
            .fail(function() {
                innerDeferred.resolve(false);
            });

            setSessionName(currentSession);
            return innerDeferred.promise();
        }

        function restoreAllPublishedTables(inactiveTables): XDPromise<any> {
            const innerDeferred: XDDeferred<void> = PromiseHelper.deferred();
            let promises: Function[] = [];

            successTables = [];
            failedTables = [];

            inactiveTables.forEach(function(tableName) {
                promises.push(function() {
                    if (canceled) {
                        return PromiseHelper.reject({canceled: true});
                    } else {
                        return restorePublishedTable(tableName);
                    }
                });
            });
            PromiseHelper.chain(promises)
            .then(function() {
                if (successTables.length === inactiveTables.length) {
                    innerDeferred.resolve();
                } else {
                    if (!successTables.length) {
                        innerDeferred.reject.apply(this, arguments);
                    } else {
                        restoreAllPublishedTables(failedTables)
                        .then(innerDeferred.resolve)
                        .fail(innerDeferred.reject);
                    }
                }
            })
            .fail(function() { // only fails if canceled
                innerDeferred.reject.apply(this, arguments);
            });

            return innerDeferred.promise();
        }

        // loop through all tables, do as many as possible

        function restorePublishedTable(tableName: string): XDPromise<any> {
            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            currTable = tableName;
            XcalarRestoreTable(tableName)
            .then(function () {
                successTables.push(tableName);
                progressCircle.increment();
                deferred.resolve();
            })
            .fail(function(err) {
                if (err && err.status === StatusT.StatusCanceled) {
                    deferred.reject({canceled: true});
                } else {
                    failedTables.push(tableName);
                    deferred.resolve.apply(this, arguments);
                }
            });

            return deferred.promise();
        }

        function showRestoreProgress(numSteps: number): void {
            const $waitSection: JQuery = $("#initialLoadScreen").find(".publishSection");
            $waitSection.addClass("hasProgress");
            $waitSection.parent().addClass("pubTable");
            const progressAreaHtml: string = xcHelper.getLockIconHtml("pubTablesWorksheet", 0, true, true);
            $waitSection.html(progressAreaHtml);
            $waitSection.find(".stepText").addClass("extra").append(
                '<span class="extraText">' + IMDTStr.Activating + '</span>')
            progressCircle = new ProgressCircle("pubTablesWorksheet", 0, true, {steps: numSteps});
            $waitSection.find(".cancelLoad").data("progresscircle",
                                                    progressCircle);
            progressCircle.update(0, 1000);

            $waitSection.find(".progressCircle .xi-close").click(function() {
                if (canceled) {
                    return;
                }
                canceled = true;
                XcalarQueryCancel("Xc.tmp.updateRetina." + currTable);
            });
        }
    }

    /* Unit Test Only */
    if (window["unitTestMode"]) {
        let cacheActiveWKBKId: string = undefined;
        WorkbookManager["__testOnly__"] = {
            setAcitiveWKBKId: function(id) {
                cacheActiveWKBKId = activeWKBKId;
                activeWKBKId = id;
            },
            restoreWKBKId: function() {
                if (cacheActiveWKBKId !== undefined) {
                    activeWKBKId = cacheActiveWKBKId;
                    cacheActiveWKBKId = undefined;
                }
            },
            generateKey: generateKey,
            getWKBKId: getWKBKId,
            copyHelper: copyHelper,
            resetActiveWKBK: resetActiveWKBK,
            saveWorkbook: saveWorkbook,
            syncSessionInfo: syncSessionInfo,
            switchWorkBookHelper: switchWorkBookHelper,
            changeIntTime: function(time) {
                checkInterval = time;
            },
            progressCycle: progressCycle,
            endProgressCycle: endProgressCycle,
            countdown: countdown,
            setupWorkbooks: setupWorkbooks,
            restoreInactivePublishedTable: restoreInactivePublishedTable
        }
    }
    /* End Of Unit Test Only */
}
