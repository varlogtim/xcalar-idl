class UDF {
    private static editor: CodeMirror.EditorFromTextArea;
    private static storedUDF: Map<string, string> = new Map<string, string>();
    private static udfWidgets: CodeMirror.LineWidget[] = [];
    private static dropdownHint: InputDropdownHint;

    private static readonly udfDefault: string =
        "# PLEASE TAKE NOTE:\n\n" +
        "# UDFs can only support\n" +
        "# return values of\n" +
        "# type String.\n\n" +
        "# Function names that\n" +
        "# start with __ are\n" +
        "# considered private\n" +
        "# functions and will not\n" +
        "# be directly invokable.\n\n";
    private static defaultModule: string = "default";

    /**
     * UDF.setup
     * Setup UDF class.
     * @returns void
     */
    public static setup(): void {
        this._setupUDF();
        this._setupTemplateList();
        this._setupUDFManager();
    }

    /**
     * UDF.getDefaultUDFPath
     * @returns string
     */
    public static getDefaultUDFPath(): string {
        return "/globaludf/default";
    }

    /**
     * UDF.initialize
     * Initialize UDF list and update it everywhere used.
     * @returns XDPromise
     */
    public static initialize(): XDPromise<void> {
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
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            xcHelper.enableScreen($waitingBg);
        });

        return deferred.promise();
    }

    /**
     * UDF.clear
     * Clear UDFs.
     * @returns void
     */
    public static clear(): void {
        this.clearEditor();
        this.storedUDF.clear();
        $("#udf-fnMenu")
        .find("li[name=blank]")
        .siblings()
        .remove();
    }

    /**
     * UDF.clearEditor
     * Clear the UDF editor.
     * @returns void
     */
    public static clearEditor(): void {
        // clear CodeMirror
        if (this.editor != null) {
            // Wrap in if because KVStore.restore may call UDF.clear()
            // and at that time editor has not setup yet.
            this.editor.setValue(this.udfDefault);
            this.editor.clearHistory();
        }
    }

    /**
     * UDF.getEditor
     * Get the UDF editor.
     * @returns CodeMirror
     */
    public static getEditor(): CodeMirror.EditorFromTextArea {
        return this.editor;
    }

    /**
     * UDF.getUDFs
     * Get stored UDFs.
     * @returns Map
     */
    public static getUDFs(): Map<string, string> {
        return this.storedUDF;
    }

    /**
     * UDF.storePython
     * Store Python script. Used in extManager.js.
     * @param  {string} moduleName
     * @param  {string} entireString
     * @returns void
     */
    public static storePython(moduleName: string, entireString: string): void {
        this._storePython(moduleName, entireString);
        this._updateUDF(false);
    }

    /**
     * UDF.refresh
     * Refresh UDFs.
     * @param  {boolean} isInBg - Is background. Whether to show refresh icon.
     * @returns XDPromise
     */
    public static refresh(isInBg: boolean): XDPromise<void> {
        return this._refreshUDF(isInBg, false);
    }

    /**
     * UDF.refreshWithoutClearing
     * @param  {boolean} clearCache - Whether to clear cache.
     * @returns XDPromise
     */
    public static refreshWithoutClearing(
        clearCache: boolean
    ): XDPromise<void> {
        if (clearCache) {
            this.storedUDF.clear();
        }

        return this._refreshUDF(true, true);
    }

    /**
     * UDF.list
     * @param  {boolean} workbookOnly - Only show default and user workbook's
     * udfs
     * @returns XDPromise
     */
    public static list(
        workbookOnly: boolean
    ): XDPromise<XcalarApiListXdfsOutputT> {
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

    /**
     * UDF.selectUDFFuncList
     * @param  {string} module
     * @returns void
     */
    public static selectUDFFuncList(module: string): void {
        this._inputUDFFuncList(module);
    }

    /**
     * UDF.getCurrWorkbookPath
     * @returns string
     */
    public static getCurrWorkbookPath(): string {
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
     * UDF.edit
     * @param  {string} modulePath
     * @returns void
     */
    public static edit(modulePath: string): void {
        // switch to first tab
        $("#udfSection .tab:first-child").click();
        this._getAndFillUDF(modulePath);
    }

    /**
     * UDF.download
     * @param  {string} moduleName
     * @returns XDPromise
     */
    public static download(moduleName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getEntireUDF(moduleName)
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

    /**
     * UDF.del
     * @param  {string} moduleName
     * @returns void
     */
    public static del(moduleName: string): void {
        xcAssert(this.storedUDF.has(moduleName), "Delete UDF error");
        const deleteUDFResolve = () => {
            this.storedUDF.delete(moduleName);
            this._updateUDF(false);
            this._refreshUDF(true, false);
            const xcSocket: XcSocket = XcSocket.Instance;
            xcSocket.sendMessage("refreshUDFWithoutClear");
            xcHelper.showSuccess(SuccessTStr.DelUDF);
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
                    }
                })
                .fail((otherErr) => {
                    console.warn(otherErr);
                    Alert.error(UDFTStr.DelFail, error);
                });
            } else {
                Alert.error(UDFTStr.DelFail, error);
            }
        });
    }

    private static _storePython(
        moduleName: string,
        entireString: string
    ): void {
        this.storedUDF.set(moduleName, entireString);
    }

    private static _initializeUDFList(
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
            this._updateUDF(doNotClear);

            deferred.resolve(xcHelper.deepCopy(listXdfsObj));
        })
        .fail((error) => {
            this._updateUDF(doNotClear);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // Setup UDF section
    private static _setupUDF(): void {
        const textArea: HTMLElement = document.getElementById("udf-codeArea");

        this.editor = CodeMirror.fromTextArea(
            textArea as HTMLTextAreaElement,
            {
                mode: {
                    name: "python",
                    version: 3,
                    singleLineStringErrors: false
                },
                theme: "rubyblue",
                lineNumbers: true,
                lineWrapping: true,
                indentWithTabs: false,
                indentUnit: 4,
                matchBrackets: true,
                autoCloseBrackets: true,
                search: true
            }
        );

        this._setupAutocomplete(this.editor);

        this.editor.setValue(this.udfDefault);

        let waiting: NodeJS.Timer;
        this.editor.on("change", () => {
            clearTimeout(waiting);
            waiting = setTimeout(
                (error: {reason: string; line: number}) =>
                    this._updateHints(error),
                300
            );
        });

        const $udfSection: JQuery = $("#udfSection");
        const wasActive: boolean = $udfSection.hasClass("active");
        // panel needs to be active to set editor value to udf default
        $udfSection.addClass("active");
        this.editor.refresh();

        if (!wasActive) {
            // only remove active class if it didnt start active
            $udfSection.removeClass("active");
        }

        /* switch between UDF sections */
        const $sections: JQuery = $udfSection.find(".mainSection");
        const $tabs: JQuery = $udfSection.find(".tabSection");
        $tabs.on("click", ".tab", (event: JQueryEventObject) => {
            const $tab: JQuery = $(event.currentTarget);
            $tab.addClass("active")
            .siblings()
            .removeClass("active");
            const tabId: string = $tab.data("tab");
            $sections.addClass("xc-hidden");
            $("#" + tabId).removeClass("xc-hidden");

            if (tabId === "udf-fnSection") {
                this.editor.refresh();
            }
        });
        /* end of switch between UDF sections */

        $udfSection.on(
            "mouseenter",
            ".tooltipOverflow",
            (event: JQueryEventObject): void => {
                xcTooltip.auto(event.currentTarget as HTMLElement);
            }
        );

        // browser file
        const $browserBtn: JQuery = $("#udf-upload-fileBrowser");
        $("#udf-upload-browse").click((event: JQueryEventObject) => {
            $(event.currentTarget).blur();
            // clear so we can trigger .change on a repeat file
            $browserBtn.val("");

            $browserBtn.click();
            return false;
        });
        // display the chosen file's path
        $browserBtn.change((event: JQueryEventObject) => {
            if ($browserBtn.val().trim() === "") {
                return;
            }
            const path: string = $(event.currentTarget)
            .val()
            .replace(/C:\\fakepath\\/i, "");
            const moduleName: string = path
            .substring(0, path.indexOf("."))
            .toLowerCase()
            .replace(/ /g, "");
            const file: File = ($browserBtn[0] as HTMLInputElement).files[0];

            this._readUDFFromFile(file, moduleName);
        });

        /* upload udf section */
        $("#udf-fnName").keypress((event: JQueryEventObject) => {
            if (event.which === keyCode.Enter) {
                $("#udf-fnUpload").click();
                $(event.currentTarget).blur();
            }
        });

        $("#udf-fnUpload").click((event: JQueryEventObject) => {
            $(event.currentTarget).blur();
            const moduleName: string = this._validateUDFName();
            if (moduleName == null) {
                return;
            }

            const entireString = this._validateUDFStr();
            if (entireString == null) {
                return;
            }
            this._upload(moduleName, entireString);
        });
        /* end of upload udf section */
    }

    private static _setupTemplateList(): void {
        /* Template dropdown list */
        const $template: JQuery = $("#udf-fnList");
        const menuHelper: MenuHelper = new MenuHelper($template, {
            onSelect: ($li: JQuery) => this._selectUDFFuncList($li),
            container: "#udfSection",
            bounds: "#udfSection",
            bottomPadding: 2
        });

        this.dropdownHint = new InputDropdownHint($template, {
            menuHelper,
            onEnter: (module: string) => this._inputUDFFuncList(module)
        });
    }

    private static _setupUDFManager(): void {
        UDFManager.Instance.addEvents();
    }

    private static _inputUDFFuncList(module: string): boolean {
        const $li = $("#udf-fnMenu")
        .find("li")
        .filter(
            (_index: number, el: Element): boolean => {
                return $(el).text() === module;
            }
        );

        if ($li.length === 0) {
            StatusBox.show(UDFTStr.NoTemplate, $("#udf-fnList"));
            return true;
        } else {
            this._selectUDFFuncList($li);
            return false;
        }
    }

    private static _selectUDFFuncList($li: JQuery): void {
        if ($li.hasClass("udfHeader") || $li.hasClass("dataflowHeader")) {
            return;
        }

        $li.parent()
        .find("li")
        .removeClass("selected");
        $li.addClass("selected");

        const modulePath: string = $li.attr("data-udf-path");
        const moduleName: string = $li.text();
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $fnName: JQuery = $("#udf-fnName");

        StatusBox.forceHide();
        this.dropdownHint.setInput(moduleName);

        xcTooltip.changeText($fnListInput, moduleName);

        if ($li.attr("name") === "blank") {
            $fnName.val("");
            this.editor.setValue(this.udfDefault);
        } else {
            this._getAndFillUDF(modulePath);
        }
    }

    private static _getAndFillUDF(modulePath: string): void {
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $fnName: JQuery = $("#udf-fnName");
        const moduleName: string = modulePath.split("/").pop();
        const fillUDFFunc = (funcStr: string) => {
            if ($fnListInput.val() !== moduleName) {
                // Check if diff list item was selected during
                // the async call
                return;
            }

            if (funcStr == null) {
                funcStr = "#" + SideBarTStr.DownloadMsg;
            }

            this.editor.setValue(funcStr);
        };

        $fnListInput.val(moduleName);
        xcTooltip.changeText($fnListInput, moduleName);
        $fnName.val(moduleName);

        this._getEntireUDF(modulePath)
        .then(fillUDFFunc)
        .fail((error) => {
            fillUDFFunc("#" + xcHelper.parseError(error));
        });
    }

    private static _setupAutocomplete(
        editor: CodeMirror.EditorFromTextArea
    ): void {
        const keysToIgnore: keyCode[] = [
            keyCode.Left,
            keyCode.Right,
            keyCode.Down,
            keyCode.Up,
            keyCode.Tab,
            keyCode.Enter
        ];

        // Trigger autocomplete menu on keyup, except when keysToIgnore
        editor.on("keyup", (_cm, e) => {
            // var val = editor.getValue().trim();
            if (keysToIgnore.indexOf(e.keyCode) < 0) {
                editor.execCommand("autocompleteUDF");
            }
        });

        // Set up codemirror autcomplete command
        CodeMirror.commands.autocompleteUDF = (cm) => {
            CodeMirror.showHint(cm, CodeMirror.pythonHint, {
                alignWithWord: true,
                completeSingle: false,
                completeOnSingleClick: true
            });
        };
    }

    private static _refreshUDF(
        isInBg: boolean,
        doNotClear: boolean
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $udfManager: JQuery = $("#udf-manager");
        $udfManager.addClass("loading");
        if (!isInBg) {
            xcHelper.showRefreshIcon($udfManager, false, null);
        }

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
            $udfManager.removeClass("loading");
        });

        return deferred.promise();
    }

    private static _updateUDF(doNotClear: boolean): void {
        // store by name
        const curWorkbookModules: string[] = [];
        const defaultModules: string[] = [];
        const otherWorkbookModules: string[] = [];
        const otherUsersModules: string[] = [];
        const dataflowModules: string[] = [];
        const otherModules: string[] = [];

        const sortedUDF: string[] = Array.from(this.storedUDF.keys()).sort();
        const userName: string = XcUser.getCurrentUserName();
        const sessionId: string = WorkbookManager.getWorkbook(
            WorkbookManager.getActiveWKBK()
        ).sessionId;
        const defaultUDFPath = this.getDefaultUDFPath();

        for (const udf of sortedUDF) {
            const moduleSplit: string[] = udf.split("/");

            if (moduleSplit[1] === "dataflow") {
                dataflowModules.push(udf);
            } else {
                if (
                    moduleSplit[2] === userName &&
                    moduleSplit[3] === sessionId
                ) {
                    curWorkbookModules.push(udf);
                } else if (udf === defaultUDFPath) {
                    defaultModules.push(udf);
                } else if (moduleSplit[2] === userName) {
                    otherWorkbookModules.push(udf);
                } else if (
                    moduleSplit.length === 6 &&
                    moduleSplit[1] === "workbook"
                ) {
                    otherUsersModules.push(udf);
                } else if (this.storedUDF.has(udf)) {
                    otherModules.push(udf);
                }
            }
        }

        // Concat in this order
        const otherUDFModules = otherUsersModules.concat(otherModules);

        this._updateTemplateList(curWorkbookModules, doNotClear);
        this._updateManager(
            curWorkbookModules,
            defaultModules,
            otherWorkbookModules,
            otherUDFModules,
            dataflowModules
        );
    }

    private static _updateTemplateList(
        moduleNames: string[],
        doNotClear: boolean
    ): void {
        const $input: JQuery = $("#udf-fnList input");
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        const selectedModule: string = $input.val();
        let hasSelectedModule: boolean = false;
        let html: string = "";
        const liClass: string = "workbookUDF";

        for (const module of moduleNames) {
            const moduleSplit: string[] = module.split("/");
            const moduleName: string = moduleSplit[moduleSplit.length - 1];
            const tempHTML: string =
                '<li class="tooltipOverflow' +
                liClass +
                '"' +
                ' data-toggle="tooltip"' +
                ' data-container="body"' +
                ' data-placement="top"' +
                ' data-title="' +
                moduleName +
                '" data-udf-path="' +
                module +
                '">' +
                moduleName +
                "</li>";

            html += tempHTML;
            if (!hasSelectedModule && module === selectedModule) {
                hasSelectedModule = true;
            }
        }

        $blankFunc.siblings().remove();
        $blankFunc.after(html);

        if (!hasSelectedModule && !doNotClear) {
            this.dropdownHint.clearInput();
            $blankFunc.trigger(fakeEvent.mouseup);
        } else if (hasSelectedModule && doNotClear) {
            this._inputUDFFuncList(selectedModule);
        }
    }

    private static _updateManager(
        curWorkbookModules: string[],
        defaultModules: string[],
        otherWorkbookModules: string[],
        otherModules: string[],
        dfModuels: string[]
    ): void {
        const udfManager: UDFManager = UDFManager.Instance;
        udfManager.setCurrentWKBKUDFs(curWorkbookModules);
        udfManager.setDefaultUDFs(defaultModules);
        udfManager.setOtherWKBKUDFs(otherWorkbookModules);
        udfManager.setOtherUDFs(otherModules);
        udfManager.setDFUDFs(dfModuels);
        udfManager.update();
    }

    private static _getEntireUDF(moduleName: string): XDPromise<string> {
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

    private static _isEditableUDF(moduleName: string): boolean {
        return !(moduleName === this.defaultModule && !gUdfDefaultNoCheck);
    }

    private static _readUDFFromFile(file: File, moduleName: string): void {
        const reader: FileReader = new FileReader();
        // Workaround for TypeScript bug.
        reader.onload = (event: any) => {
            const entireString = event.target.result;
            this.editor.setValue(entireString);
        };

        reader.readAsText(file);
        $("#udf-fnName").val(moduleName);
        this.dropdownHint.clearInput();
    }

    private static _validateUDFName(): string {
        const $fnName: JQuery = $("#udf-fnName");
        const moduleName: string = $fnName
        .val()
        .trim()
        .toLowerCase();
        const options: {side: string; offsetY: number} = {
            side: "top",
            offsetY: -2
        };

        if (moduleName === "") {
            StatusBox.show(ErrTStr.NoEmpty, $fnName, true, options);
            return null;
        } else if (
            !xcHelper.checkNamePattern(
                PatternCategory.UDF,
                PatternAction.Check,
                moduleName
            )
        ) {
            StatusBox.show(UDFTStr.InValidName, $fnName, true, options);
            return null;
        } else if (
            moduleName.length >
            XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen
        ) {
            StatusBox.show(ErrTStr.LongFileName, $fnName, true, options);
            return null;
        }

        return moduleName;
    }

    private static _validateUDFStr(): string {
        // Get code written and call thrift call to upload
        const entireString: string = this.editor.getValue();
        const $editor: JQuery = $("#udf-fnSection .CodeMirror");
        const options: {side: string; offsetY: number} = {
            side: "top",
            offsetY: -2
        };

        if (
            entireString.trim() === "" ||
            entireString.trim() === this.udfDefault.trim()
        ) {
            StatusBox.show(ErrTStr.NoEmptyFn, $editor, false, options);
            return null;
        } else if (
            entireString.trim().length >
            XcalarApisConstantsT.XcalarApiMaxUdfSourceLen
        ) {
            StatusBox.show(ErrTStr.LargeFile, $editor, false, options);
            return null;
        }
        return entireString;
    }

    private static _upload(
        moduleName: string,
        entireString: string
    ): XDPromise<any> {
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
                    this._updateHints(syntaxErr);
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

    private static _parseSyntaxError(error: {
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

    private static _updateHints(error: {reason: string; line: number}): void {
        this.editor.operation(() => {
            for (const udfWidget of this.udfWidgets) {
                this.editor.removeLineWidget(udfWidget);
            }
            this.udfWidgets.length = 0;

            if (!error) {
                return;
            }

            const msg: HTMLDivElement = document.createElement("div");
            const icon: HTMLSpanElement = msg.appendChild(
                document.createElement("span")
            );
            icon.innerHTML = "!";
            icon.className = "lint-error-icon";
            msg.appendChild(document.createTextNode(error.reason));
            msg.className = "lint-error";
            this.udfWidgets.push(
                this.editor.addLineWidget(error.line - 1, msg, {
                    coverGutter: false,
                    noHScroll: true,
                    above: true,
                    showIfHidden: false
                })
            );
        });

        const info: CodeMirror.ScrollInfo = this.editor.getScrollInfo();
        const after: number = this.editor.charCoords(
            {line: this.editor.getCursor().line + 1, ch: 0},
            "local"
        ).top;
        if (info.top + info.clientHeight < after) {
            this.editor.scrollTo(null, after - info.clientHeight + 3);
        }
    }

    /* Unit Test Only */
    public static __testOnly__: {
        isEditableUDF;
        getEntireUDF;
        parseSyntaxError;
        upload;
        inputUDFFuncList;
        readUDFFromFile;
    } = {};

    public static setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.isEditableUDF = (moduleName: string) =>
                this._isEditableUDF(moduleName);
            this.__testOnly__.getEntireUDF = (moduleName: string) =>
                this._getEntireUDF(moduleName);
            this.__testOnly__.parseSyntaxError = (error: {error: string}) =>
                this._parseSyntaxError(error);
            this.__testOnly__.upload = (
                moduleName: string,
                entireString: string
            ) => this._upload(moduleName, entireString);
            this.__testOnly__.inputUDFFuncList = (module: string) =>
                this._inputUDFFuncList(module);
            this.__testOnly__.readUDFFromFile = (
                file: File,
                moduleName: string
            ) => this._readUDFFromFile(file, moduleName);
        }
    }
    /* End Of Unit Test Only */
}
