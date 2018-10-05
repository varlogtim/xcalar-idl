class UDFFileManager extends BaseFileManager {
    private static _instance = null;

    public static get Instance(): UDFFileManager {
        return this._instance || (this._instance = new this());
    }

    private storedUDF: Map<string, string> = new Map<string, string>();
    private defaultModule: string = "default";
    private userIDWorkbookMap: Map<string, Map<string, string>> = new Map();
    private userWorkbookIDMap: Map<string, Map<string, string>> = new Map();

    /**
     * @param  {string} path
     * @returns void
     */
    public open(path: string): void {
        path = this._displayNameToNsName(path);
        UDFPanel.Instance.edit(path);

        if (
            !$("#bottomMenu").hasClass("open") ||
            !$("#udfSection").hasClass("active")
        ) {
            $("#udfTab").trigger("click");
        }
    }

    /**
     * @returns string
     */
    public getDefaultUDFPath(): string {
        return "/globaludf/default";
    }

    /**
     * @returns string
     */
    public getCurrWorkbookPath(): string {
        const workbook: WKBK = WorkbookManager.getWorkbook(
            WorkbookManager.getActiveWKBK()
        );
        if (workbook == null) {
            return null;
        }
        return (
            "/workbook/" +
            XcUser.getCurrentUserName() +
            "/" +
            workbook.sessionId +
            "/udf/"
        );
    }

    /**
     * @returns string
     */
    public getCurrWorkbookDisplayPath(): string {
        let currWorkbookPath: string = this.nsNameToDisplayName(
            this.getCurrWorkbookPath()
        );
        currWorkbookPath = currWorkbookPath.substring(
            0,
            currWorkbookPath.length - 3
        );
        return currWorkbookPath;
    }

    /**
     * @param  {string} nsName
     * @returns string
     */
    public nsNameToDisplayName(nsName: string): string {
        const nsNameArray: string[] = nsName.split("/");
        if (nsNameArray[1] === "workbook") {
            nsNameArray.splice(4, 1);
            const idWorkbookMap: Map<
            string,
            string
            > = this.userIDWorkbookMap.get(nsNameArray[2]);
            if (idWorkbookMap) {
                nsNameArray[3] = idWorkbookMap.get(nsNameArray[3]);
            }
        }
        return nsNameArray.join("/") + ".py";
    }

    private _displayNameToNsName(displayName: string): string {
        if (displayName.endsWith("/")) {
            displayName = displayName.substring(0, displayName.length - 1);
        }
        const displayNameArray: string[] = displayName.split("/");
        if (displayNameArray[1] === "workbook") {
            displayNameArray.splice(4, 0, "udf");
            const workbookIDMap: Map<
            string,
            string
            > = this.userWorkbookIDMap.get(displayNameArray[2]);
            if (workbookIDMap) {
                displayNameArray[3] = workbookIDMap.get(displayNameArray[3]);
            }
        }
        const nsName: string = displayNameArray.join("/");
        return nsName.substring(0, nsName.length - 3);
    }

    /**
     * Get stored UDFs.
     * @returns Map
     */
    public getUDFs(): Map<string, string> {
        return this.storedUDF;
    }

    /**
     * Store Python script. Used in extManager.js.
     * @param  {string} moduleName
     * @param  {string} entireString
     * @returns void
     */
    public storePython(moduleName: string, entireString: string): void {
        this._storePython(moduleName, entireString);
        UDFPanel.Instance.updateUDF(false);
        FileManagerPanel.Instance.udfBuildPathTree();
        FileManagerPanel.Instance.updateList();
    }

    /**
     * Refresh UDFs.
     * @param  {boolean} isInBg - Is background. Whether to show refresh icon.
     * @returns XDPromise
     */
    public refresh(isInBg: boolean): XDPromise<void> {
        return this._refreshUDF(isInBg, false);
    }

    /**
     * @param  {boolean} clearCache - Whether to clear cache.
     * @returns XDPromise
     */
    public refreshWithoutClearing(clearCache: boolean): XDPromise<void> {
        if (clearCache) {
            this.storedUDF.clear();
        }

        return this._refreshUDF(true, true);
    }

    /**
     * Initialize UDF list and update it everywhere used.
     * @returns XDPromise
     */
    public initialize(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $waitingBg: JQuery = xcHelper.disableScreen(
            $("#udfSection " + ".mainSectionContainer"),
            {
                classes: "dark"
            }
        );

        this._initializeUDFList(true, false)
        .then((listXdfsObj: any) => {
            listXdfsObj.fnDescs = xcHelper.filterUDFs(listXdfsObj.fnDescs);
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;

            DSExport.refreshUDF(listXdfsObj);
            DSTargetManager.updateUDF(listXdfsObj);
        })
        .then(() => this._getUserWorkbookMap())
        .then(() => {
            FileManagerPanel.Instance.udfBuildPathTree();
            FileManagerPanel.Instance.udfCreateWorkbookFolder();
            FileManagerPanel.Instance.updateList();
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            xcHelper.enableScreen($waitingBg);
        });

        return deferred.promise();
    }

    /**
     * @param  {boolean} workbookOnly - Only show default and user workbook's
     * udfs
     * @returns XDPromise
     */
    public list(workbookOnly: boolean): XDPromise<XcalarApiListXdfsOutputT> {
        const deferred: XDDeferred<
        XcalarApiListXdfsOutputT
        > = PromiseHelper.deferred();
        XcalarListXdfs("*", "User*")
        .then((res: XcalarApiListXdfsOutputT) => {
            if (workbookOnly) {
                res.fnDescs = xcHelper.filterUDFs(
                        res.fnDescs as UDFInfo[]
                ) as XcalarEvalFnDescT[];
                res.numXdfs = res.fnDescs.length;
            }
            deferred.resolve(res);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public getEntireUDF(moduleName: string): XDPromise<string> {
        if (!this.storedUDF.has(moduleName)) {
            const error: string = xcHelper.replaceMsg(ErrWRepTStr.NoUDF, {
                udf: moduleName
            });
            return PromiseHelper.reject(error);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        const entireString: string = this.storedUDF.get(moduleName);
        if (entireString == null) {
            XcalarDownloadPython(moduleName)
            .then((udfStr: string) => {
                this.storedUDF.set(moduleName, udfStr);
                deferred.resolve(udfStr);
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve(entireString);
        }

        return deferred.promise();
    }

    public delete(paths: string[]): void {
        const delTasks: XDPromise<void>[] = paths.map((path: string) => {
            path = this._displayNameToNsName(path);
            return this.del(path, true);
        });

        PromiseHelper.when(...delTasks)
        .then(() => {
            xcHelper.showSuccess(SuccessTStr.DelUDF);
        })
        .always(() => {
            FileManagerPanel.Instance.udfBuildPathTree(true);
            FileManagerPanel.Instance.updateList();
        });
    }

    /**
     * @param  {string} moduleName
     * @returns void
     */
    public del(moduleName: string, bulk?: boolean): XDPromise<void> {
        xcAssert(this.storedUDF.has(moduleName), "Delete UDF error");

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const deleteUDFResolve = () => {
            this.storedUDF.delete(moduleName);
            this._refreshUDF(true, false);
            UDFPanel.Instance.updateUDF(false);
            FileManagerPanel.Instance.removeSearchResultNode(
                this.nsNameToDisplayName(moduleName)
            );
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.sendMessage("refreshUDFWithoutClear");

            if (!bulk) {
                FileManagerPanel.Instance.udfBuildPathTree(true);
                FileManagerPanel.Instance.updateList();
                xcHelper.showSuccess(SuccessTStr.DelUDF);
            }

            deferred.resolve();
        };

        XcalarDeletePython(moduleName)
        .then(deleteUDFResolve)
        .fail((error) => {
            // assume deletion if module is not listed
            if (
                error &&
                    error.status === StatusT.StatusUdfModuleNotFound
            ) {
                XcalarListXdfs(moduleName + ":*", "User*")
                .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
                    if (listXdfsObj.numXdfs === 0) {
                        deleteUDFResolve();
                    } else {
                        Alert.error(UDFTStr.DelFail, error);
                        deferred.reject();
                    }
                })
                .fail((otherErr) => {
                    console.warn(otherErr);
                    Alert.error(UDFTStr.DelFail, error);
                    deferred.reject();
                });
            } else {
                Alert.error(UDFTStr.DelFail, error);
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    /**
     * @param  {string} moduleName
     * @returns XDPromise
     */
    public download(moduleName: string): XDPromise<void> {
        moduleName = this._displayNameToNsName(moduleName);

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.getEntireUDF(moduleName)
        .then((entireString: string) => {
            if (entireString == null) {
                Alert.error(
                    SideBarTStr.DownloadError,
                    SideBarTStr.DownloadMsg
                );
            } else {
                const moduleSplit: string[] = moduleName.split("/");
                xcHelper.downloadAsFile(
                    moduleSplit[moduleSplit.length - 1],
                    entireString,
                    false
                );
            }
            deferred.resolve();
        })
        .fail((error) => {
            Alert.error(SideBarTStr.DownloadError, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public upload(moduleName: string, entireString: string): XDPromise<any> {
        moduleName = moduleName.toLowerCase();
        const uploadHelper = () => {
            const $fnUpload: JQuery = $("#udf-fnUpload");
            let hasToggleBtn: boolean = false;

            // if upload finish with in 1 second, do not toggle
            const timer: NodeJS.Timer = setTimeout(() => {
                hasToggleBtn = true;
                xcHelper.toggleBtnInProgress($fnUpload, false);
            }, 1000);

            xcHelper.disableSubmit($fnUpload);

            XcalarUploadPython(moduleName, entireString)
            .then(() => {
                this.storePython(udfPath, entireString);
                KVStore.commit();
                xcHelper.showSuccess(SuccessTStr.UploadUDF);

                this._refreshUDF(true, true);
                const $uploadedFunc: JQuery = $("#udf-fnMenu").find(
                    'li[data-udf-path="' + udfPath + '"]'
                );
                    // select list directly use
                    // $uploadedFunc.trigger(fakeEvent.mouseup) will reset
                    // the cursor, which might be ignoring
                if ($uploadedFunc.length) {
                    $("#udf-fnList input").val(moduleName);
                } else {
                    $("#udf-fnList input").val("");
                }
                const xcSocket: XcSocket = XcSocket.Instance;
                xcSocket.sendMessage("refreshUDFWithoutClear");
                deferred.resolve();
            })
            .fail((error) => {
                // XXX might not actually be a syntax error
                const syntaxErr: {
                reason: string;
                line: number;
                } = this._parseSyntaxError(error);
                if (syntaxErr != null) {
                    UDFPanel.Instance.updateHints(syntaxErr);
                }
                const errorMsg: string =
                        error && typeof error === "object" && error.error
                            ? error.error
                            : error;
                Alert.error(SideBarTStr.UploadError, null, {
                    msgTemplate: "<pre>" + errorMsg + "</pre>",
                    align: "left"
                });
                deferred.reject(error);
            })
            .always(() => {
                if (hasToggleBtn) {
                    // toggle back
                    xcHelper.toggleBtnInProgress($fnUpload, false);
                } else {
                    clearTimeout(timer);
                }
                xcHelper.enableSubmit($fnUpload);
            });
        };

        if (!this._isEditableUDF(moduleName)) {
            Alert.error(SideBarTStr.UploadError, SideBarTStr.OverwriteErr);
            return PromiseHelper.reject(SideBarTStr.OverwriteErr);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const udfPath: string = this.getCurrWorkbookPath() + moduleName;
        if (this.storedUDF.has(udfPath)) {
            const msg: string = xcHelper.replaceMsg(SideBarTStr.DupUDFMsg, {
                module: moduleName
            });

            Alert.show({
                title: SideBarTStr.DupUDF,
                msg,
                onConfirm: () => {
                    uploadHelper();
                },
                onCancel: () => {
                    deferred.resolve();
                }
            });
        } else {
            uploadHelper();
        }

        return deferred.promise();
    }

    public isWritable(path: string): boolean {
        return this._displayNameToNsName(path).startsWith(
            this.getCurrWorkbookPath()
        );
    }

    private _initializeUDFList(
        _isSetup: boolean,
        doNotClear: boolean
    ): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        // Update UDF
        this.list(false)
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            const oldStoredUDF = new Map(this.storedUDF);
            // List UDFs and filter out temp UDFs
            listXdfsObj.fnDescs = listXdfsObj.fnDescs.filter(
                (udf: XcalarEvalFnDescT): boolean => {
                    const moduleName = udf.fnName.split(":")[0];

                    if (!this.storedUDF.has(moduleName)) {
                        // This means moduleName exists
                        // when user fetches this module,
                        // the entire string will be cached here
                        this.storedUDF.set(moduleName, null);
                    } else {
                        oldStoredUDF.delete(moduleName);
                    }
                    return true;
                }
            );
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;
            // Remove UDFs that does not exist any more
            oldStoredUDF.forEach((_value: string, key: string) =>
                this.storedUDF.delete(key)
            );
            UDFPanel.Instance.updateUDF(doNotClear);
            deferred.resolve(xcHelper.deepCopy(listXdfsObj));
        })
        .fail((error) => {
            UDFPanel.Instance.updateUDF(doNotClear);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _isEditableUDF(moduleName: string): boolean {
        return !(moduleName === this.defaultModule && !gUdfDefaultNoCheck);
    }

    private _storePython(moduleName: string, entireString: string): void {
        this.storedUDF.set(moduleName, entireString);
    }

    private _parseSyntaxError(error: {
    error: string;
    }): {reason: string; line: number} {
        if (!error || !error.error) {
            return null;
        }

        try {
            let reason: string;
            let line: number;
            let splits = error.error.match(
                /^.*: '(.*)' at line (.*) column (.*)/
            );
            if (!splits || splits.length < 3) {
                // try another format of error
                splits = error.error.match(/^.*line (.*)/);
                line = Number(splits[1].trim());
                const syntexErrorIndex: number = error.error.indexOf(
                    "SyntaxError:"
                );
                reason =
                    syntexErrorIndex > -1
                        ? error.error.substring(syntexErrorIndex).trim()
                        : error.error.trim();
            } else {
                reason = splits[1].trim();
                line = Number(splits[2].trim());
            }

            if (!Number.isInteger(line)) {
                console.error("cannot parse error", error);
                return null;
            }
            return {
                reason,
                line
            };
        } catch (error) {
            console.error("cannot parse error", error);
            return null;
        }
    }

    private _refreshUDF(
        isInBg: boolean,
        doNotClear: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        $("#udf-fnList").addClass("loading");

        this._initializeUDFList(false, doNotClear)
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            listXdfsObj.fnDescs = xcHelper.filterUDFs(
                    listXdfsObj.fnDescs as UDFInfo[]
            ) as XcalarEvalFnDescT[];
            listXdfsObj.numXdfs = listXdfsObj.fnDescs.length;
            DSPreview.update(listXdfsObj);
            DSTargetManager.updateUDF(listXdfsObj);
            XDFManager.Instance.updateUDFs(listXdfsObj);
            FnBar.updateOperationsMap(listXdfsObj.fnDescs, true);
            OperationsView.updateOperationsMap(listXdfsObj);
            MapOpPanel.Instance.updateOperationsMap(listXdfsObj);
            DSExport.refreshUDF(listXdfsObj);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $("#udf-fnList").removeClass("loading");
        });

        return deferred.promise();
    }

    private _getUserWorkbookMap(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const users: string[] = Array.from(this.storedUDF.keys())
        .filter((path: string) => {
            return path.startsWith("/workbook/");
        })
        .map((path: string) => {
            return path.substring(10, path.indexOf("/", 10));
        });

        const getUserTasks: XDPromise<Map<string, string>>[] = users.map(
            (user: string) => {
                return this._getWorkbookMap(user);
            }
        );

        PromiseHelper.when(...getUserTasks)
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getWorkbookMap(userName: string): XDPromise<Map<string, string>> {
        const deferred: XDDeferred<
        Map<string, string>
        > = PromiseHelper.deferred();

        const user: XcUser = new XcUser(userName);
        XcUser.setUserSession(user);

        XcalarListWorkbooks("*")
        .then((sessionRes) => {
            const sessionIdWorkbookMap: Map<string, string> = new Map();
            const sessionWorkbookIDMap: Map<string, string> = new Map();
            try {
                sessionRes.sessions.forEach((sessionInfo) => {
                    sessionIdWorkbookMap.set(
                        sessionInfo.sessionId,
                        sessionInfo.name
                    );
                    sessionWorkbookIDMap.set(
                        sessionInfo.name,
                        sessionInfo.sessionId
                    );
                });
                this.userIDWorkbookMap.set(userName, sessionIdWorkbookMap);
                this.userWorkbookIDMap.set(userName, sessionWorkbookIDMap);
            } catch (e) {
                console.error(e);
            }
            deferred.resolve(sessionIdWorkbookMap);
        })
        .fail(deferred.reject);

        XcUser.resetUserSession();

        return deferred.promise();
    }

    /* Unit Test Only */
    public __testOnly__: {
        isEditableUDF;
        parseSyntaxError;
        upload;
    } = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.isEditableUDF = (moduleName: string) =>
                this._isEditableUDF(moduleName);
            this.__testOnly__.parseSyntaxError = (error: {error: string}) =>
                this._parseSyntaxError(error);
            this.__testOnly__.upload = (
                moduleName: string,
                entireString: string
            ) => this.upload(moduleName, entireString);
        }
    }
    /* End Of Unit Test Only */
}
