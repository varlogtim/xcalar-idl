class UDFFileManager extends BaseFileManager {
    private static _instance = null;

    public static get Instance(): UDFFileManager {
        return this._instance || (this._instance = new this());
    }

    private storedUDF: Map<string, string>;
    private defaultModule: string;
    private userIDWorkbookMap: Map<string, Map<string, string>>;
    private userWorkbookIDMap: Map<string, Map<string, string>>;
    private panels: FileManagerPanel[];
    private hiddenPatterns: string[];

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
        super();
        this.storedUDF = new Map<string, string>();
        this.defaultModule = "default";
        this.userIDWorkbookMap = new Map();
        this.userWorkbookIDMap = new Map();
        this.panels = [];
        this.hiddenPatterns = [];
        this.registerHiddenPattern(
            "/workbook/" +
                xcHelper.escapeRegExp(DagTabShared.getSecretUser()) +
                "/.*"
        );
    }

    /**
     * @param  {string} displayPath
     * @returns void
     */
    public open(displayPath: string): void {
        displayPath = displayPath.startsWith(this.getCurrWorkbookDisplayPath())
            ? displayPath.split("/").pop()
            : displayPath;
        UDFPanel.Instance.edit(displayPath);

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
        return this.getSharedUDFPath() + this.defaultModule;
    }

    /**
     * @returns string
     */
    public getSharedUDFPath(): string {
        return "/sharedUDFs/";
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
        const currWorkbookPath: string = this.getCurrWorkbookPath();
        if (!currWorkbookPath) {
            return null;
        }

        this.panels.forEach((panel: FileManagerPanel) =>
            this._createWorkbookFolder(panel)
        );
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
            const idWorkbookMap: Map<
            string,
            string
            > = this.userIDWorkbookMap.get(nsPathSplit[2]);
            if (idWorkbookMap && idWorkbookMap.has(nsPathSplit[3])) {
                nsPathSplit[3] = idWorkbookMap.get(nsPathSplit[3]);
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
     * Store Python script. Used in extManager.js.
     * @param  {string} nsPath
     * @param  {string} entireString
     * @returns void
     */
    public storePython(nsPath: string, entireString: string): void {
        this.storedUDF.set(nsPath, entireString);
        UDFPanel.Instance.updateUDF();
        this.panels.forEach((panel: FileManagerPanel) =>
            this._buildPathTree(panel)
        );
        this.panels.forEach((panel: FileManagerPanel) =>
            this._updateList(panel)
        );
    }

    /**
     * @param  {boolean} isUpdate?
     * @param  {boolean} isDelete?
     * @returns XDPromise
     */
    public refresh(isUpdate?: boolean, isDelete?: boolean): XDPromise<void> {
        return this._refreshUDF(isUpdate, isDelete);
    }

    /**
     * Initialize UDF list and update views.
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

        this.list()
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            const updateViews = (
                listXdfsObjUpdate: XcalarApiListXdfsOutputT
            ) => {
                const deferredUpdate: XDDeferred<
                void
                > = PromiseHelper.deferred();

                this.filterOutHiddenUDF(listXdfsObjUpdate);
                this._updateStoredUDF(listXdfsObjUpdate);
                this.filterWorkbookUDF(listXdfsObjUpdate);
                DSTargetManager.updateUDF(listXdfsObjUpdate);

                deferredUpdate.resolve();
                return deferredUpdate.promise();
            };

            return PromiseHelper.when(
                updateViews(xcHelper.deepCopy(listXdfsObj)),
                this._getUserWorkbookMap(listXdfsObj)
            );
        })
        .then(() => {
            UDFPanel.Instance.updateUDF();
            $("#udf-fnSection").removeClass("xc-disabled");
            this.panels.forEach((panel: FileManagerPanel) =>
                this._buildPathTree(panel)
            );
            this.panels.forEach((panel: FileManagerPanel) =>
                this._updateList(panel)
            );
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            xcHelper.enableScreen($waitingBg);
        });

        return deferred.promise();
    }

    /**
     * @returns XDPromise
     */
    public list(): XDPromise<XcalarApiListXdfsOutputT> {
        const deferred: XDDeferred<
        XcalarApiListXdfsOutputT
        > = PromiseHelper.deferred();
        XcalarListXdfs("*", "User*")
        .then(deferred.resolve)
        .fail(deferred.reject);
        return deferred.promise();
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
     * @param  {XcalarApiListXdfsOutputT} xdfRes
     * @returns void
     */
    public filterOutHiddenUDF(xdfRes: XcalarApiListXdfsOutputT): void {
        xdfRes.fnDescs = xcHelper.filterHiddenUDFs(
            xdfRes.fnDescs,
            this.hiddenPatterns
        );
        xdfRes.numXdfs = xdfRes.fnDescs.length;
    }

    /**
     * @param  {string} nsPath
     * @returns XDPromise
     */
    public getEntireUDF(nsPath: string): XDPromise<string> {
        if (!this.storedUDF.has(nsPath)) {
            const error: string = xcHelper.replaceMsg(ErrWRepTStr.NoUDF, {
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
     * @returns XDPromise<void>
     */
    public delete(displayPaths: string[]): XDPromise<void> {
        // The promise is used in tests.
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const delTasks: XDPromise<void>[] = displayPaths.map(
            (displayPath: string) => {
                const nsPath: string = this.displayPathToNsPath(displayPath);
                return this.deleteOne(nsPath);
            }
        );

        PromiseHelper.when(...delTasks)
        .then(() => {
            xcHelper.showSuccess(SuccessTStr.DelUDF);
            this.panels.forEach((panel: FileManagerPanel) =>
                panel.removeSearchResultNodes(displayPaths)
            );
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.sendMessage("refreshUDF", {
                isUpdate: false,
                isDelete: true
            });

            this._refreshUDF(false, true)
            .then(() => {
                deferred.resolve();
            })
            .fail((error) => {
                deferred.reject(error);
            });
        })
        .fail((error) => {
            this._refreshUDF(false, true).always(() => {
                deferred.reject(error);
            });
        });

        return deferred.promise();
    }

    /**
     * @param  {string} nsPath
     * @returns XDPromise
     */
    public deleteOne(nsPath: string): XDPromise<void> {
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
                .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
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
    }

    /**
     * @param  {string} displayPath
     * @returns XDPromise
     */
    public download(displayPath: string): XDPromise<void> {
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

    /**
     * @param  {string} uploadPath
     * @param  {string} entireString
     * @param  {boolean} absolutePath?
     * @returns XDPromise
     */
    public upload(
        uploadPath: string,
        entireString: string,
        absolutePath?: boolean
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
                xcHelper.toggleBtnInProgress($fnUpload, false);
            }, 1000);

            xcHelper.disableSubmit($fnUpload);

            XcalarUploadPython(uploadPath, entireString, absolutePath)
            .then(() => {
                this.storedUDF.set(nsPath, entireString);
                KVStore.commit();
                xcHelper.showSuccess(SuccessTStr.UploadUDF);

                const xcSocket: XcSocket = XcSocket.Instance;
                xcSocket.sendMessage("refreshUDF", {
                    isUpdate: true,
                    isDelete: false
                });

                // This could be an update, but UDF cache is already updated by
                // `this.storedUDF.set`, so no need to update again.
                return this._refreshUDF(false, false);
            })
            .then(deferred.resolve)
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

        if (uploadPath === this.getDefaultUDFPath() && !gUdfDefaultNoCheck) {
            Alert.error(SideBarTStr.UploadError, SideBarTStr.OverwriteErr);
            return PromiseHelper.reject(SideBarTStr.OverwriteErr);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const nsPath: string = absolutePath
            ? uploadPath
            : this.getCurrWorkbookPath() + uploadPath;
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
        if (displayPath.startsWith(this.getCurrWorkbookDisplayPath())) {
            displayPath = displayPath
            .split("/")
            .pop()
            .toLowerCase()
            .replace(/ /g, "");
            absolutePath = false;
        }

        uploadPath = displayPath.substring(0, displayPath.lastIndexOf("."));
        this.upload(uploadPath, entireString, absolutePath)
        .then(() => {
            deferred.resolve();
        })
        .fail(() => {
            deferred.reject();
        });

        return deferred.promise();
    }

    /**
     * @param  {string} displayPath
     * @returns boolean
     */
    public canDelete(displayPath: string): boolean {
        if (this.writeLocked) {
            return false;
        }
        const nsPath: string = this.displayPathToNsPath(displayPath);
        return (
            (nsPath.startsWith(this.getCurrWorkbookPath()) ||
                nsPath.startsWith(this.getSharedUDFPath())) &&
            (nsPath !== this.getDefaultUDFPath() || gUdfDefaultNoCheck)
        );
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
    public fileIcon(): string {
        return "xi-menu-udf";
    }

    /**
     * @returns string
     */
    public fileExtension(): string {
        return ".py";
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
        this._buildPathTree(panel);
        this._createWorkbookFolder(panel);
    }

    /**
     * @param  {string} hiddenPattern
     * @returns void
     */
    public registerHiddenPattern(hiddenPattern: string): void {
        this.hiddenPatterns.push(hiddenPattern);
    }

    // Prevent all write operations. Because not supported by backend without
    // an activated session.
    private get writeLocked(): boolean {
        return !this.getCurrWorkbookDisplayPath();
    }

    /**
     * Build UDF path trie.
     * @returns void
     */
    private _buildPathTree(panel: FileManagerPanel, clean?: boolean): void {
        if (!panel.rootPathNode.children.has("UDF")) {
            panel.rootPathNode.children.set("UDF", {
                pathName: "UDF",
                isDir: true,
                timestamp: null,
                size: null,
                isSelected: false,
                sortBy: FileManagerField.Name,
                sortDescending: false,
                isSorted: false,
                parent: panel.rootPathNode,
                children: new Map()
            });
        }

        const udfRootPathNode: FileManagerPathNode = panel.rootPathNode.children.get(
            "UDF"
        );
        const storedUDF: Map<string, string> = this.getUDFs();

        for (let [key] of storedUDF) {
            key = this.nsPathToDisplayPath(key);
            const pathSplit: string[] = key.split("/");
            let curPathNode: FileManagerPathNode = udfRootPathNode;

            for (const path of pathSplit) {
                if (path === "") {
                    continue;
                }

                if (curPathNode.children.has(path)) {
                    curPathNode = curPathNode.children.get(path);
                } else {
                    curPathNode.isSorted = false;
                    const childPathNode: FileManagerPathNode = {
                        pathName: path,
                        isDir: true,
                        // TODO: no info from api.
                        timestamp: Math.floor(Math.random() * 101),
                        size: Math.floor(Math.random() * 101),
                        isSelected: false,
                        sortBy: FileManagerField.Name,
                        sortDescending: false,
                        isSorted: false,
                        parent: curPathNode,
                        children: new Map()
                    };
                    curPathNode.children.set(path, childPathNode);
                    curPathNode = childPathNode;
                }
            }
            curPathNode.isDir = false;
        }

        if (clean) {
            this._cleanPathNodes(panel);
        }
    }

    private _createWorkbookFolder(panel: FileManagerPanel): void {
        const currWorkbookPath: string = this.getCurrWorkbookPath();
        if (currWorkbookPath == null) {
            return;
        }
        let folderPath = this.nsPathToDisplayPath(currWorkbookPath);
        folderPath = folderPath.substring(0, folderPath.length - 3);
        const paths: string[] = folderPath.split("/");
        let curPathNode = panel.rootPathNode.children.get("UDF");

        paths.forEach((path: string) => {
            if (path === "") {
                return;
            }

            if (curPathNode.children.has(path)) {
                curPathNode = curPathNode.children.get(path);
                return;
            } else {
                curPathNode.children.set(path, {
                    pathName: path,
                    isDir: true,
                    // TODO: no info from api.
                    timestamp: Math.floor(Math.random() * 101),
                    size: Math.floor(Math.random() * 101),
                    isSelected: false,
                    sortBy: FileManagerField.Name,
                    sortDescending: false,
                    isSorted: false,
                    parent: curPathNode,
                    children: new Map()
                });
                curPathNode = curPathNode.children.get(path);
            }
        });
    }

    private _cleanPathNodes(panel: FileManagerPanel): void {
        const storedUDF: Map<string, string> = this.getUDFs();
        const storedUDFSet: Set<string> = new Set(
            Array.from(storedUDF.keys()).map((value: string) => {
                return this.nsPathToDisplayPath(value);
            })
        );
        const curPathNode: FileManagerPathNode = panel.rootPathNode.children.get(
            "UDF"
        );
        const sortRes: FileManagerPathNode[] = [];
        const visited: Set<FileManagerPathNode> = new Set();

        this._sortPathNodes(curPathNode, visited, sortRes);
        sortRes.pop();

        for (const sortedPathNode of sortRes) {
            if (
                (!sortedPathNode.isDir &&
                    !storedUDFSet.has(panel.nodeToPath(sortedPathNode))) ||
                (sortedPathNode.isDir &&
                    sortedPathNode.children.size === 0 &&
                    panel.nodeToPath(sortedPathNode) !==
                        this.getCurrWorkbookDisplayPath())
            ) {
                sortedPathNode.parent.children.delete(sortedPathNode.pathName);
            }
        }

        panel.refreshNodeReference();
    }

    private _sortPathNodes(
        curPathNode: FileManagerPathNode,
        visited: Set<FileManagerPathNode>,
        sortRes: FileManagerPathNode[]
    ): void {
        if (visited.has(curPathNode)) {
            return;
        }

        visited.add(curPathNode);

        for (const childPathNode of curPathNode.children.values()) {
            this._sortPathNodes(childPathNode, visited, sortRes);
        }

        sortRes.push(curPathNode);
    }

    private _updateList(panel: FileManagerPanel) {
        panel.updateList();
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
        isUpdate: boolean,
        isDelete: boolean
    ): XDPromise<void> {
        if (isUpdate) {
            this.storedUDF.clear();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.list()
        .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
            const updateViews = (
                listXdfsObjUpdate: XcalarApiListXdfsOutputT
            ) => {
                const deferredUpdate: XDDeferred<
                void
                > = PromiseHelper.deferred();
                MapOpPanel.Instance.updateOperationsMap(listXdfsObjUpdate);

                this.filterOutHiddenUDF(listXdfsObjUpdate);
                this._updateStoredUDF(listXdfsObjUpdate);

                this.filterWorkbookUDF(listXdfsObjUpdate);
                DSPreview.update(listXdfsObjUpdate);
                DSTargetManager.updateUDF(listXdfsObjUpdate);
                XDFManager.Instance.updateUDFs(listXdfsObjUpdate);
                deferredUpdate.resolve();
                return deferredUpdate.promise();
            };

            return PromiseHelper.when(
                updateViews(xcHelper.deepCopy(listXdfsObj)),
                this._getUserWorkbookMap(listXdfsObj)
            );
        })
        .then(() => {
            UDFPanel.Instance.updateUDF();
            this.panels.forEach((panel: FileManagerPanel) =>
                this._buildPathTree(panel, isDelete)
            );
            this.panels.forEach((panel: FileManagerPanel) =>
                this._createWorkbookFolder(panel)
            );
            this.panels.forEach((panel: FileManagerPanel) =>
                this._updateList(panel)
            );
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateStoredUDF(listXdfsObj: XcalarApiListXdfsOutputT) {
        const newStoredUDF: Map<string, string> = new Map();
        listXdfsObj.fnDescs.forEach((udf: XcalarEvalFnDescT) => {
            const nsPath: string = udf.fnName.split(":")[0];
            newStoredUDF.set(nsPath, this.storedUDF.get(nsPath));
        });
        this.storedUDF = newStoredUDF;
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
        // create a fake folder for the current user workbook.
        users.push(XcUser.getCurrentUserName());
        users = Array.from(new Set(users));

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
    public __testOnly__: any = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.parseSyntaxError = (error: {error: string}) =>
                this._parseSyntaxError(error);
        }
    }
    /* End Of Unit Test Only */
}
