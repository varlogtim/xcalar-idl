class UDFFileManager {
    private static _instance = null;

    public static get Instance(): UDFFileManager {
        return this._instance || (this._instance = new this());
    }

    private storedUDF: Map<string, string>;
    private defaultModule: string;
    private userIDWorkbookMap: Map<string, Map<string, string>>;
    private userWorkbookIDMap: Map<string, Map<string, string>>;
    private panels: FileManagerPanel[];
    private storedSQLFuncs: {name: string, numArg: number}[];

    /*
     * Pay special attention when dealing with UDF paths / names.
     *
     * The complexity results from the backend storing all UDFs using libns.
     * There are 2 main reasons for the complexity.
     * 1. the api is sending and receiving the names in libns directly.
     * 2. different path format is defined to upload / delete UDFs in workbooks
     *    or shared space.
     *
     * In the future, the backend should send and receive displayPaths that are
     * shown to users, and make necessary conversions internally in backend.
     * This will simplify the frontend implementation and prevent potential
     * bugs.
     *
     * For UDFs in the current workbook:
     * - nsPath (from libns, also used to download):
     *   /workbook/hying/5BC63E6F15A3208D/udf/a
     * - displayPath (in FileManager): /workbook/hying/workbook1/a.py
     * - moduleFilename: a.py
     * - displayName (in UDF panel): a.py
     * - uploadPath (to upload / delete): a
     *
     * For UDFs in other workbooks:
     * - nsPath: /workbook/hying/5BC63E6F15A3208E/udf/a
     * - displayPath: /workbook/hying/workbook2/a.py
     * - moduleFilename: a.py
     * - displayName: /workbook/hying/workbook2/a.py
     * - uploadPath: not supported
     *
     * For Shared UDFs:
     * - nsPath: /sharedUDFs/a
     * - displayPath: /sharedUDFs/a.py
     * - moduleFilename: a.py
     * - displayName: /sharedUDFs/a.py
     * - uploadPath: /sharedUDFs/a
     */

    public constructor() {
        this.storedUDF = new Map<string, string>();
        this.defaultModule = "default";
        this.userIDWorkbookMap = new Map();
        this.userWorkbookIDMap = new Map();
        this.panels = [];
        this.storedSQLFuncs = [];
    }

    /**
     * @param  {string} displayPath
     * @returns void
     */
    public open(displayPath: string): void {
        displayPath = displayPath.startsWith(this.getCurrWorkbookDisplayPath())
            ? displayPath.split("/").pop()
            : displayPath;
        const moduleName = UDFPanel.parseModuleNameFromFileName(displayPath);
        UDFPanel.Instance.loadUDF(moduleName);
    }

    /**
     * @returns string
     */
    public getDefaultUDFPath(): string {
        return this.getSharedUDFPath() + this.defaultModule;
    }

    /**
     * @returns string
     */
    public getSharedUDFPath(): string {
        return xcHelper.constructUDFSharedPrefix();
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
        return xcHelper.constructUDFWBPrefix(
            XcUser.getCurrentUserName(),
            workbook.sessionId
        );
    }

    /**
     * @returns string
     */
    public getCurrWorkbookDisplayPath(): string {
        const currWorkbookPath: string = this.getCurrWorkbookPath();
        if (!currWorkbookPath) {
            return null;
        }

        let currWorkbookDisplayPath: string = this.nsPathToDisplayPath(
            currWorkbookPath
        );
        currWorkbookDisplayPath = currWorkbookDisplayPath.substring(
            0,
            currWorkbookDisplayPath.length - 3
        );
        return currWorkbookDisplayPath;
    }

    /**
     * Only works with files, doesn't work with dirs.
     * @param  {string} nsPath
     * @returns string
     */
    public nsPathToDisplayPath(nsPath: string): string {
        const nsPathSplit: string[] = nsPath.split("/");
        if (nsPathSplit[1] === "workbook") {
            nsPathSplit.splice(4, 1);

            const userName: string = nsPathSplit[2];
            const workbookId: string = nsPathSplit[3];

            const idWorkbookMap: Map<
            string,
            string
            > = this.userIDWorkbookMap.get(userName);

            if (idWorkbookMap && idWorkbookMap.has(workbookId)) {
                nsPathSplit[3] = idWorkbookMap.get(workbookId);
            }
        }
        return nsPathSplit.join("/") + ".py";
    }

    /**
     * Only works with files and workbook prefixes, doesn't work with general
     * dirs.
     * @param  {string} displayPath
     * @returns string
     */
    public displayPathToNsPath(displayPath: string): string {
        let isPrefix: boolean = false;
        if (displayPath.endsWith("/")) {
            displayPath = displayPath.substring(0, displayPath.length - 1);
        }
        const displayPathSplit: string[] = displayPath.split("/");
        if (displayPathSplit[1] === "workbook") {
            // workbook prefixes.
            if (displayPathSplit.length === 4) {
                isPrefix = true;
                displayPathSplit.push("");
            }
            displayPathSplit.splice(4, 0, "udf");
            const workbookIDMap: Map<
            string,
            string
            > = this.userWorkbookIDMap.get(displayPathSplit[2]);
            if (workbookIDMap && workbookIDMap.has(displayPathSplit[3])) {
                displayPathSplit[3] = workbookIDMap.get(displayPathSplit[3]);
            }
        }
        const nsPath: string = displayPathSplit.join("/");
        return isPrefix ? nsPath : nsPath.substring(0, nsPath.length - 3);
    }

    /**
     * Get stored UDFs.
     * @returns Map
     */
    public getUDFs(): Map<string, string> {
        return this.storedUDF;
    }

    /**
     * check if has the UDF or not
     * @param udfPath
     */
    public hasUDF(udfPath): boolean {
        return this.storedUDF.has(udfPath);
    }

    /**
     * Store Python script. Used in extManager.js.
     * @param  {string} nsPath
     * @param  {string} entireString
     * @returns void
     */
    public storePython(nsPath: string, entireString: string): void {
        this.storedUDF.set(nsPath, entireString);
        this.panels.forEach((panel: FileManagerPanel) =>
            this._updatePanel(panel, false)
        );
    }

    /**
     * @param  {boolean} isUpdate?
     * @param  {boolean} isDelete?
     * @returns XDPromise
     */
    public refresh(isUpdate?: boolean, isDelete?: boolean): XDPromise<void> {
        return this._refresh(isUpdate, isDelete);
    }

    /**
     * Initialize UDF list and update views.
     * @returns XDPromise
     */
    public initialize(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $waitingBg: JQuery = xcUIHelper.disableScreen(
            $("#udfSection " + ".mainSectionContainer"),
            {
                classes: "dark"
            }
        );

        this.list()
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            const listXdfsObjUpdate: XcalarApiListXdfsOutputT = xcHelper.deepCopy(listXdfsObj);
            this._updateStoredUDF(listXdfsObjUpdate);
            this.filterWorkbookUDF(listXdfsObjUpdate);
            DSTargetManager.updateUDF(listXdfsObjUpdate);

            return this._getUserWorkbookMap(listXdfsObj);
        })
        .then(() => {
            UDFTabManager.Instance.setup();
            $("#udf-fnSection").removeClass("xc-disabled");
            this.panels.forEach((panel: FileManagerPanel) =>
                this._updatePanel(panel, false)
            );
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            xcUIHelper.enableScreen($waitingBg);
        });

        return deferred.promise();
    }

    /**
     * @param  {string} prefix?
     * @returns XDPromise
     */
    public list(prefix?: string): XDPromise<any> {
        prefix = prefix || "";
        return XcalarListXdfs(prefix + "*", "User*");
    }

    public listSQLUDFFuncs(): {name: string, numArg: number}[] {
        return this.storedSQLFuncs;
    }

    /**
     * @param  {XcalarApiListXdfsOutputT} xdfRes
     * @returns void
     */
    public filterWorkbookUDF(xdfRes: XcalarApiListXdfsOutputT): void {
        xdfRes.fnDescs = xcHelper.filterUDFs(xdfRes.fnDescs);
        xdfRes.numXdfs = xdfRes.fnDescs.length;
    }

    /**
     * @param  {string} nsPath
     * @returns XDPromise
     */
    public getEntireUDF(nsPath: string): XDPromise<string> {
        if (!this.storedUDF.has(nsPath)) {
            const error: string = xcStringHelper.replaceMsg(ErrWRepTStr.NoUDF, {
                udf: nsPath
            });
            return PromiseHelper.reject(error, false);
        }

        const deferred: XDDeferred<string> = PromiseHelper.deferred();

        const entireString: string = this.storedUDF.get(nsPath);
        if (entireString == null) {
            XcalarDownloadPython(nsPath)
            .then((udfStr: string) => {
                this.storedUDF.set(nsPath, udfStr);
                deferred.resolve(udfStr);
            })
            .fail((error) => {
                deferred.reject(error, true);
            });
        } else {
            deferred.resolve(entireString);
        }

        return deferred.promise();
    }

    /**
     * @param  {string[]} displayPaths
     * @returns XDPromise<void> The promise is used in tests.
     */
    public delete(displayPaths: string[]): XDPromise<void> {
        const deleteTask = (displayPath: string) => {
            const nsPath: string = this.displayPathToNsPath(displayPath);
            xcAssert(this.storedUDF.has(nsPath), "Delete UDF error");

            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const absolutePath: boolean = !nsPath.startsWith(
                this.getCurrWorkbookPath()
            );
            const uploadPath: string = absolutePath
                ? nsPath
                : nsPath.split("/").pop();
            XcalarDeletePython(uploadPath, absolutePath)
            .then(deferred.resolve)
            .fail((error) => {
                // assume deletion if module is not listed
                if (
                    error &&
                        error.status === StatusT.StatusUdfModuleNotFound
                ) {
                    XcalarListXdfs(nsPath + ":*", "User*")
                    .then((listXdfsObj: any) => {
                        if (listXdfsObj.numXdfs === 0) {
                            deferred.resolve();
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
        };

        const deleteTasks: XDPromise<void>[] = displayPaths.map(
            (displayPath: string) => {
                return deleteTask(displayPath);
            }
        );

        return this._bulkTask(deleteTasks, true);
    }

    /**
     * @param  {string} displayPaths
     * @returns XDPromise
     */
    public download(displayPaths: string[]): XDPromise<void> {
        const downloadTask = (displayPath: string) => {
            const nsPath = this.displayPathToNsPath(displayPath);

            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            this.getEntireUDF(nsPath)
            .then((entireString: string) => {
                if (entireString == null) {
                    Alert.error(
                        SideBarTStr.DownloadError,
                        SideBarTStr.DownloadMsg
                    );
                } else {
                    const moduleSplit: string[] = nsPath.split("/");
                    xcHelper.downloadAsFile(
                        moduleSplit[moduleSplit.length - 1] + ".py",
                        entireString
                    );
                }
                deferred.resolve();
            })
            .fail((error) => {
                Alert.error(SideBarTStr.DownloadError, error);
                deferred.reject(error);
            });

            return deferred.promise();
        };

        const downloadTasks: XDPromise<void>[] = displayPaths.map(
            (displayPath: string) => {
                return downloadTask(displayPath);
            }
        );

        return PromiseHelper.when(...downloadTasks);
    }

    /**
     * @param  {string} uploadPath
     * @param  {string} entireString
     * @param  {boolean} absolutePath?
     * @returns XDPromise
     */
    public upload(
        uploadPath: string,
        entireString: string,
        absolutePath?: boolean,
        overwiteShareUDF?: boolean
    ): XDPromise<any> {
        const uploadPathSplit: string[] = uploadPath.split("/");
        uploadPathSplit[uploadPathSplit.length - 1] = uploadPathSplit[
        uploadPathSplit.length - 1
        ].toLowerCase();
        uploadPath = uploadPathSplit.join("/");
        const uploadHelper = () => {
            const $fnUpload: JQuery = $("#udf-fnUpload");
            let hasToggleBtn: boolean = false;

            // if upload finish with in 1 second, do not toggle
            const timer: NodeJS.Timer = setTimeout(() => {
                hasToggleBtn = true;
                xcUIHelper.toggleBtnInProgress($fnUpload, false);
            }, 1000);

            xcUIHelper.disableSubmit($fnUpload);
            XcalarUploadPython(uploadPath, entireString, absolutePath, true)
            .then(() => {
                if (overwiteShareUDF) {
                    let shareUDFPath = this.getSharedUDFPath() + uploadPath;
                    let promise = XcalarUploadPython(shareUDFPath, entireString, true, true)
                    return promise;
                }
            })
            .then(() => {
                xcUIHelper.showSuccess(SuccessTStr.UploadUDF);

                const xcSocket: XcSocket = XcSocket.Instance;
                xcSocket.sendMessage("refreshUDF", {
                    isUpdate: true,
                    isDelete: false
                });
                return this._refresh(true, false);
            })
            .then(deferred.resolve)
            .then(() => {
                if (XVM.isDataMart() || XVM.isSQLMode()) {
                    SQLResultSpace.Instance.refresh();
                }
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
                    xcUIHelper.toggleBtnInProgress($fnUpload, false);
                } else {
                    clearTimeout(timer);
                }
                xcUIHelper.enableSubmit($fnUpload);
            });
        };

        if (uploadPath === this.getDefaultUDFPath() && !gUdfDefaultNoCheck) {
            Alert.error(SideBarTStr.UploadError, SideBarTStr.OverwriteErr);
            return PromiseHelper.reject(SideBarTStr.OverwriteErr);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        uploadHelper();

        return deferred.promise();
    }

    /**
     * @param  {string} displayPath
     * @param  {string} entireString
     * @returns XDPromise
     */
    public add(displayPath: string, entireString: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        let uploadPath: string = displayPath;
        let absolutePath: boolean = true;
        let isLocalUDF: boolean = false;

        if (displayPath.startsWith(this.getCurrWorkbookDisplayPath())) {
            displayPath = displayPath
            .split("/")
            .pop()
            .toLowerCase()
            .replace(/ /g, "");
            absolutePath = false;
            isLocalUDF = true;
        }

        uploadPath = displayPath.substring(0, displayPath.lastIndexOf("."));
        let def = isLocalUDF
        ? this._warnDatasetUDF(uploadPath, entireString)
        : PromiseHelper.resolve();
        def
        .then((overwiteShareUDF: boolean) => {
            return this.upload(uploadPath, entireString, absolutePath, overwiteShareUDF);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail(() => {
            deferred.reject();
        });

        return deferred.promise();
    }

    /**
     * @param  {string} displayPaths
     * @returns boolean
     */
    public canDelete(displayPaths: string[]): boolean {
        if (this.writeLocked) {
            return false;
        }

        for (const displayPath of displayPaths) {
            const nsPath: string = this.displayPathToNsPath(displayPath);
            if (
                !(
                    (nsPath.startsWith(this.getCurrWorkbookPath()) ||
                        nsPath.startsWith(this.getSharedUDFPath())) &&
                    (nsPath !== this.getDefaultUDFPath() || gUdfDefaultNoCheck)
                )
            ) {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  {string} displayPath the file to be duplicated
     * @returns boolean
     */
    public canDuplicate(displayPath: string): boolean {
        return this.canAdd(displayPath);
    }

    /**
     * @param  {string} displayPath the file to be added
     * @returns boolean
     */
    public canAdd(
        displayPath: string,
        $inputSection?: JQuery,
        $actionButton?: JQuery,
        side?: string
    ): boolean {
        if (displayPath.endsWith(".txt")) {
            displayPath =
                displayPath.substring(0, displayPath.lastIndexOf(".txt")) +
                this.fileExtension();
        }

        const nsPath: string = this.displayPathToNsPath(displayPath);
        const options: {side: string; offsetY: number} = {
            side: side ? side : "top",
            offsetY: -2
        };

        // Should append the extension before this function is called. So
        // should never hit this.
        if (
            !xcHelper.checkNamePattern(
                PatternCategory.UDFFileName,
                PatternAction.Check,
                displayPath
            )
        ) {
            if ($inputSection) {
                StatusBox.show(
                    UDFTStr.InValidFileName,
                    $inputSection,
                    true,
                    options
                );
            }

            return false;
        }

        if (
            !(
                nsPath.startsWith(this.getCurrWorkbookPath()) ||
                nsPath.startsWith(this.getSharedUDFPath())
            ) ||
            this.writeLocked
        ) {
            if ($actionButton) {
                StatusBox.show(
                    UDFTStr.InValidPath,
                    $actionButton,
                    true,
                    options
                );
            }
            return false;
        }

        const moduleFilename: string = nsPath.split("/").pop();

        if (
            !xcHelper.checkNamePattern(
                PatternCategory.UDF,
                PatternAction.Check,
                moduleFilename
            )
        ) {
            if ($inputSection) {
                StatusBox.show(
                    UDFTStr.InValidName,
                    $inputSection,
                    true,
                    options
                );
            }
            return false;
        } else if (
            moduleFilename.length >
            XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen
        ) {
            if ($inputSection) {
                StatusBox.show(
                    ErrTStr.LongFileName,
                    $inputSection,
                    true,
                    options
                );
            }
            return false;
        }

        return true;
    }

    /**
     * @param  {string} displayPath
     * @returns boolean
     */
    public canShare(displayPath: string): boolean {
        const nsPath: string = this.displayPathToNsPath(displayPath);
        return nsPath.startsWith(this.getCurrWorkbookPath());
    }

    /**
     * @param  {string} oldDisplayPath
     * @param  {string} newDisplayPath
     * @returns void
     */
    public copy(
        oldDisplayPath: string,
        newDisplayPath: string
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const oldNsPath: string = this.displayPathToNsPath(oldDisplayPath);
        this.getEntireUDF(oldNsPath)
        .then((entireString: string) => {
            this.add(newDisplayPath, entireString);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * @param  {string} displayPath
     * @returns void
     */
    public share(displayPath: string): void {
        const nsPath: string = this.displayPathToNsPath(displayPath);

        this.getEntireUDF(nsPath).then((entireString) => {
            const uploadPath: string =
                this.getSharedUDFPath() + nsPath.split("/")[5];
            this.upload(uploadPath, entireString, true);
        });
    }

    /**
     * @returns string
     */
    public fileType(): string {
        return "UDF";
    }

    /**
     * @returns string
     */
    public fileIcon(): string {
        return "xi-menu-udf";
    }

    /**
     * @returns string
     */
    public fileExtension(): string {
        return ".py";
    }

    public autoRename(fileName: string) {
        return fileName.toLowerCase();
    }

    /**
     * All File Manager Panel that displays UDFs should be registered.
     * Otherwise they will not get the update after another panel adds /
     * deletes files.
     * @param  {FileManagerPanel} panel
     * @returns void
     */
    public registerPanel(panel: FileManagerPanel): void {
        this.panels.push(panel);
        this._updatePanel(panel, false);
    }

    // Prevent all write operations. Because not supported by backend without
    // an activated session.
    private get writeLocked(): boolean {
        return !this.getCurrWorkbookDisplayPath();
    }

    private _updatePanel(panel: FileManagerPanel, isDelete: boolean): void {
        panel.update(
            [...this.storedUDF.keys()].map((value: string) => {
                return {
                    pathName: this.nsPathToDisplayPath(value),
                    timestamp: null,
                    size: null
                };
            }),
            this.getCurrWorkbookDisplayPath() == null
                ? []
                : [this.getCurrWorkbookDisplayPath()].map((value: string) => {
                    return {
                        pathName: value,
                        timestamp: null,
                        size: null
                    };
                }),
            UDFFileManager.Instance,
            isDelete
        );
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

    private _refresh(isUpdate: boolean, isDelete: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        // Should not simply clear `this.storedUDF` and rebuild on itself. This
        // will make `this.storedUDF` in an incomplete status during the
        // execution of this async function. If at the same time there is
        // another operation, this may cause failure. For example,
        // `getEntireUDF` will fail since it cannot find the UDF module name in
        // `this.storedUDF`. This will cause test failures, though is unlikely
        // to be a real user issue since users will not click that fast.
        if (isUpdate) {
            this.storedUDF = new Map(
                [...this.storedUDF.keys()].map(
                    (key: string): [string, string] => {
                        return [key, null];
                    }
                )
            );
        }

        // Make sure the current workbook folder is updated quickly enough,
        // since listing all UDFs from backend is slow when there are lots of
        // UDFs.
        // This is hacky, and should be carefully thought about if patterned to
        // other folers (like the shared folder).
        this.list(this.getCurrWorkbookPath())
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            this._updateStoredUDF(listXdfsObj, this.getCurrWorkbookPath());
            this.panels.forEach((panel: FileManagerPanel) =>
                this._updatePanel(panel, isDelete)
            );
        })
        .then(() => {
            // Another round of update, this time everything.
            return this.list();
        })
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            const listXdfsObjUpdate: XcalarApiListXdfsOutputT = xcHelper.deepCopy(listXdfsObj);
            let def: XDDeferred<void> = PromiseHelper.deferred();
            XDFManager.Instance.waitForSetup()
            .always(() => {
                XDFManager.Instance.updateAllUDFs(listXdfsObjUpdate);
                GeneralOpPanel.updateOperationsMap();
                MapOpPanel.Instance.updateOpCategories();
                this._updateStoredUDF(listXdfsObjUpdate);

                // transform object - filter out other notebooks and shorten
                // names
                this.filterWorkbookUDF(listXdfsObjUpdate);
                DSConfig.update(listXdfsObjUpdate);
                DSTargetManager.updateUDF(listXdfsObjUpdate);
                XDFManager.Instance.updateUDFs(listXdfsObjUpdate);

                this._getUserWorkbookMap(listXdfsObj)
                .then(def.resolve)
                .fail(def.reject);
            });

            return def.promise();
        })
        .then(() => {
            this.panels.forEach((panel: FileManagerPanel) =>
                this._updatePanel(panel, isDelete)
            );
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateStoredUDF(
        listXdfsObj: XcalarApiListXdfsOutputT,
        prefix?: string
    ) {
        this.storedSQLFuncs = [];
        const sqlUDFPath: string = UDFFileManager.Instance.getCurrWorkbookPath() + "sql";
        const newStoredUDF: Map<string, string> = new Map();
        listXdfsObj.fnDescs.forEach((udf: XcalarEvalFnDescT) => {
            const splits = udf.fnName.split(":");
            const nsPath: string = splits[0];
            newStoredUDF.set(nsPath, this.storedUDF.get(nsPath));

            if (sqlUDFPath === nsPath) {
                this.storedSQLFuncs.push({
                    name: splits[1],
                    numArg: udf.numArgs
                });
            }
        });

        // prefix != null means the output is partial. Should add those who
        // don't start with the prefix back.
        if (prefix != null) {
            this.storedUDF.forEach((value: string, nsPath: string) => {
                if (!nsPath.startsWith(prefix)) {
                    newStoredUDF.set(nsPath, value);
                }
            });
        }
        this.storedUDF = newStoredUDF;
        DagList.Instance.refreshMenuList(ResourceMenu.KEY.UDF);
    }

    private _bulkTask(operations: XDPromise<void>[], isDelete: boolean) {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        PromiseHelper.when(...operations)
        .then(() => {
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.sendMessage("refreshUDF", {
                isUpdate: false,
                isDelete
            });

            this._refresh(false, isDelete)
            .then(() => {
                deferred.resolve();
            })
            .fail((error) => {
                deferred.reject(error);
            });
        })
        .fail((error) => {
            this._refresh(false, isDelete).always(() => {
                deferred.reject(error);
            });
        });

        return deferred.promise();
    }

    private _getUserWorkbookMap(listXdfsObj): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        let users: string[] = listXdfsObj.fnDescs
        .map((udf: XcalarEvalFnDescT) => {
            return udf.fnName.split(":")[0];
        })
        .filter((path: string) => {
            return path.startsWith("/workbook/");
        })
        .map((path: string) => {
            return path.substring(10, path.indexOf("/", 10));
        });

        // This is necessary, because current user can have no UDF, but we will
        // create a folder for the current user workbook.
        users.push(XcUser.getCurrentUserName());
        users = Array.from(new Set(users));

        const getUserTasks: XDPromise<void>[] = users.map((user: string) => {
            return this._getWorkbookMap(user);
        });

        PromiseHelper.when(...getUserTasks)
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getWorkbookMap(userName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const user: XcUser = new XcUser(userName);
        XcUser.setUserSession(user);

        XcalarListWorkbooks("*", true)
        .then((sessionRes) => {
            const sessionIdWorkbookMap: Map<string, string> = new Map();
            const sessionWorkbookIDMap: Map<string, string> = new Map();
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

            deferred.resolve();
        })
        .fail(() => {
            // deferred.reject();
            // Error from backend list session, continue.
            deferred.resolve();
        });

        XcUser.resetUserSession();

        return deferred.promise();
    }

    private _warnDatasetUDF(udfPath: string, entireString: string): XDPromise<boolean> {
        let shareUDFPath = this.getSharedUDFPath() + udfPath;
        if (shareUDFPath === this.getDefaultUDFPath()) {
            // when it's shared UDF, xcalar will handle it, no need to warn
            return PromiseHelper.resolve(false);
        }

        if (!this.storedUDF.has(shareUDFPath)) {
            // when there is no share version of it, no need to warn
            return PromiseHelper.resolve(false);
        }

        let sharedUDFString: string = this.storedUDF.get(shareUDFPath);
        if (sharedUDFString != null && sharedUDFString === entireString) {
            // when we have a shared cache and there is no change of the ones going to save
            return PromiseHelper.resolve(false);
        }

        if (this._hasDatasetWithUDF(udfPath)) {
            let deferred: XDDeferred<boolean> = PromiseHelper.deferred();
            Alert.show({
                title: "Overwrite import UDF",
                msg: "The UDF you are editing has a copy in the shared folder, which is used during the import. Do you want to apply the changes to the UDF in the shared folder too?",
                buttons: [{
                    name: "No",
                    func: () => { deferred.resolve(false); }
                }, {
                    name: "Yes",
                    func: () => { deferred.resolve(true); }
                }],
                onCancel: () => { deferred.reject(); },
                hideButtons: ["cancel"]
            });
            return deferred.promise();
        } else {
            return PromiseHelper.resolve(false);
        }
    }

    private _hasDatasetWithUDF(udfPath: string): boolean {
        try {
            udfPath = this.getCurrWorkbookPath() + udfPath;
            let homeDir = DS.getHomeDir(false);
            let queue: any[] = [homeDir];
            while (queue.length > 0) {
                let folder: DSObj = queue.shift();
                for (let i = 0; i < folder.eles.length; i++) {
                    let dsObj = folder.eles[i];
                    if (dsObj.beFolder()) {
                        queue.push(dsObj);
                    } else if (dsObj.moduleName === udfPath) {
                        return true;
                    }
                }
            }
        } catch (e) {
            console.error(e);
            return false;
        }
        return false;
    }

    /* Unit Test Only */
    public __testOnly__: any = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.parseSyntaxError = (error: {error: string}) =>
                this._parseSyntaxError(error);
        }
    }
    /* End Of Unit Test Only */
}
