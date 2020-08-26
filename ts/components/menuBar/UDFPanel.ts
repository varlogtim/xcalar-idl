class UDFPanel {
    private static _instance = null;

    public static get Instance(): UDFPanel {
        return this._instance || (this._instance = new this());
    }

    /**
     * UDFPanel.parseModuleNameFromFileName
     * @param fileName
     */
    public static parseModuleNameFromFileName(fileName: string): string {
        return fileName.substring(0, fileName.indexOf(".py"));
    }

    private readonly _sqlUDF: string = "sql";
    private editor: CodeMirror.EditorFromTextArea;
    private udfWidgets: CodeMirror.LineWidget[] = [];
    private isSetup: boolean;
    private _popup: PopupPanel;
    private _mode = {
        name: "python",
        version: 3,
        singleLineStringErrors: false
    };
    private _modalHelper: ModalHelper;
    private _monitorFileManager: FileManagerPanel;

    public readonly udfDefault: string =
        "# PLEASE TAKE NOTE:\n" +
        "# \n" +
        "# Scalar function works on one or more\n" +
        "# fields of a table row\n" +
        "# and/or on literal values.\n" +
        "# Function automatically\n" +
        "# applys to all rows of a\n" +
        "# table.\n" +
        "# \n" +
        "# Function def:\n" +
        "# 'def' NAME parameters ':'\n" +
        "#     [TYPE_COMMENT]\n" +
        "#     func_body_suite\n" +
        "# full grammar here: https://docs.python.org/3.6/reference/grammar.html\n" +
        "# Note: Return type is always\n" +
        "# treated as string\n" +
        "# \n" +
        "# ex:\n" +
        "# def scalar_sum(col1, col2):\n" +
        "#     return col1 + col2;\n" +
        "# \n";
    /**
     * UDFPanel.Instance.setup
     */
    public setup(): void {
        if (this.isSetup) {
            return;
        }
        this.isSetup = true;
        this._monitorFileManager = new FileManagerPanel(
            $("#monitorFileManager")
        );
        this._addEventListeners();
        this._modalHelper = new ModalHelper(this._getManagerModal(), {
            sizeToDefault: true
        });
    }

    /**
     * UDFPanel.Instance.toggleDisplay
     * @param display
     */
    public toggleDisplay(display?: boolean): void {
        const $container = $("#udfViewContainer").parent();
        if (display == null) {
            display = $container.hasClass("xc-hidden");
        }

        const $tab = $("#udfTab");
        if (display) {
            $tab.addClass("active");
            $container.removeClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Show_BroadCast");
            this.getEditor().refresh();

        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
            this._popup.trigger("Hide_BroadCast");
        }
    }

    /**
     * UDFPanel.Instance.toggleSyntaxHighlight
     * @param on
     */
    public toggleSyntaxHighlight(on: boolean): void {
        if (on) {
            this.editor.setOption("mode", this._mode);
        } else {
            this.editor.setOption("mode", null);
        }
    }

    /**
     * UDFPanel.Instance.newUDF
     */
    public newUDF(): void {
        this.toggleDisplay(true);
        UDFTabManager.Instance.newTab();
    }

    /**
     * UDFPanel.Instance.loadUDF
     */
    public loadUDF(name: string): void {
        this.toggleDisplay(true);
        UDFTabManager.Instance.openTab(name);
    }

    /**
     * UDFPanel.Instance.loadSQLUDF
     */
    public loadSQLUDF(): void {
        return this.loadUDF(this._sqlUDF);
    }

    /**
     * UDFPanel.Instance.refresh
     */
    public refresh(): void {
        this.editor.refresh();
    }

    /**
     * UDFPanel.Instance.getEditor
     * Get the UDF editor.
     * @returns CodeMirror
     */
    public getEditor(): CodeMirror.EditorFromTextArea {
        return this.editor;
    }

    /**
     * UDFPanel.Instance.openUDF
     * @param moduleName
     */
    public openUDF(moduleName: string, isNew?: boolean): void {
        this._selectUDF(moduleName, isNew);
    }

    /**
     * UDFPanel.Instance.deleteUDF
     * @param moduleName
     */
    public deleteUDF(moduleName: string): void {
        let msg = xcStringHelper.replaceMsg(UDFTStr.DelMsg, {
            name: moduleName
        });
        Alert.show({
            title: UDFTStr.Del,
            msg,
            onConfirm: () => {
                const displayPath = this._getDisplayNameAndPath(moduleName)[1] + ".py";
                UDFFileManager.Instance.delete([displayPath]);
                UDFTabManager.Instance.closeTab(moduleName);
            }
        });
    }

    /**
     * @param  {{reason:string;line:number}} error
     * @returns void
     */
    public updateHints(error: {reason: string; line: number}): void {
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

    public listUDFs(): {displayName: string, path: string}[] {
        const res: {displayName: string, path: string}[] = [];
        const loadUDFFilter = RegExp('/LOAD_WIZARD_');

        // store by name
        const unsortedUDF: string[] = Array.from(
            UDFFileManager.Instance.getUDFs().keys()
        ).filter((name) => !loadUDFFilter.test(name));
        const workbookUDF: string[] = unsortedUDF.filter((value: string) => {
            return value.startsWith(
                UDFFileManager.Instance.getCurrWorkbookPath()
            );
        });
        const sharedUDF: string[] = unsortedUDF.filter((value: string) => {
            return value.startsWith(
                UDFFileManager.Instance.getSharedUDFPath()
            );
        });
        const nsPaths = workbookUDF.sort().concat(sharedUDF.sort());
        for (const nsPath of nsPaths) {
            const displayName: string = this._getDisplayNameFromNSPath(nsPath);
            res.push({
                displayName,
                path: nsPath
            });
        }
        return res;
    }

    /**
     * UDFPanel.Instance.openManager
     */
    public openManager() {
        const monitorFileManager: FileManagerPanel = this._monitorFileManager;
        monitorFileManager.switchType("UDF");
        monitorFileManager.switchPath("/");
        monitorFileManager.switchPathByStep(
            UDFFileManager.Instance.getCurrWorkbookDisplayPath()
        );
        this._modalHelper.setup();
    }

    private _getUDFSection(): JQuery {
        return $("#udfSection");
    }

    private _getEditSection(): JQuery {
        return this._getUDFSection().find(".editSection");
    }

    private _getSaveButton(): JQuery {
        return this._getUDFSection().find(".saveFile");
    }

    private _getManagerModal(): JQuery {
        return $("#monitorFileManager");
    }

    private _addEventListeners(): void {
        const $udfSection: JQuery = this._getUDFSection();
        UDFFileManager.Instance.initialize();
        UDFFileManager.Instance.registerPanel(this._monitorFileManager);

        $udfSection.find(".toManager").on("click", () => {
            this.openManager();
        });

        $udfSection.find("header .close").click(() => {
            this.toggleDisplay(false);
        });

        this._getManagerModal().find(".cancel, .close").click(() => {
            this._modalHelper.clear();
        });

        const textArea: HTMLElement = document.getElementById("udf-codeArea");

        this.editor = CodeMirror.fromTextArea(
            textArea as HTMLTextAreaElement,
            {
                mode: this._mode,
                theme: CodeMirrorManager.Instance.getColorTheme(),
                lineNumbers: true,
                lineWrapping: true,
                indentWithTabs: false,
                indentUnit: 4,
                matchBrackets: true,
                autoCloseBrackets: true,
                search: true
            }
        );
        CodeMirrorManager.Instance.register(this.editor);

        this._setupAutocomplete(this.editor);

        this._setEditorValue(this.udfDefault);

        let waiting: NodeJS.Timer;
        this.editor.on("change", () => {
            clearTimeout(waiting);
            waiting = setTimeout(
                (error: {reason: string; line: number}) =>
                    this.updateHints(error),
                300
            );
        });

        const wasActive: boolean = $udfSection.hasClass("active");
        // panel needs to be active to set editor value to udf default
        $udfSection.addClass("active");
        this.editor.refresh();

        if (!wasActive) {
            // only remove active class if it didnt start active
            $udfSection.removeClass("active");
        }

        this._addSaveEvent();
        this.toggleSyntaxHighlight(!UserSettings.Instance.getPref("hideSyntaxHiglight"));
    }

    private _addSaveEvent(): void {
        const $udfSection: JQuery = this._getUDFSection();
        this._getSaveButton().on("click", () => {
            this._saveUDF();
        });

        const $editArea: JQuery = $udfSection.find(".editSection .editArea");
        $editArea.keydown((event) => {
            if (xcHelper.isShirtKey(event) && event.which === keyCode.S) {
                // ctl + s to save
                event.preventDefault();
                event.stopPropagation(); // Stop propagation, otherwise will clear StatusBox.
                this._saveUDF();
            }
        });
    }

    private _saveUDF(): void {
        const activeTab = UDFTabManager.Instance.getActiveTab();
        if (activeTab == null) {
            // error case
            return;
        }

        const tabName = activeTab.name;
        if (activeTab.isNew) {
            this._eventSaveAs(tabName);
            return;
        }
        let displayPath = `${tabName}.py`;
        if (!displayPath.startsWith("/")) {
            displayPath = UDFFileManager.Instance.getCurrWorkbookDisplayPath() + displayPath;
        }
        if (
            UDFFileManager.Instance.canAdd(
                displayPath,
                this._getEditSection(),
                null,
                "bottom"
            )
        ) {
            const $save: JQuery = this._getSaveButton();
            $save.addClass("xc-disabled");
            this._eventSave(displayPath)
            .always(() => {
                $save.removeClass("xc-disabled");
            });
        }
    }

    private _eventSaveAs(tabName: string) {
        const options = {
            onSave: (displayPath: string) => {
                this._eventSave(displayPath);
                const name = this._getDisplayNameAndPath(displayPath)[0];
                const newName = name.substring(0, name.indexOf(".py"));
                UDFTabManager.Instance.renameTab(tabName, newName);
            }
        };
        FileManagerSaveAsModal.Instance.show(
            FileManagerTStr.SAVEAS,
            "new_module.py",
            UDFFileManager.Instance.getCurrWorkbookDisplayPath(),
            options
        );
    }

    private _eventSave(displayPath: string): XDPromise<void> {
        const entireString: string = this._validateUDFStr();
        if (entireString) {
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            UDFFileManager.Instance.add(displayPath, entireString)
            .then(() => {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return PromiseHelper.resolve();
        }
    }

    public setupPopup(): void {
        this._popup = new PopupPanel("udfViewContainer", {
            draggableHeader: ".draggableHeader"
        });
        this._popup
        .on("Undock", () => {
            this._undock();
        })
        .on("Dock", () => {
            this._dock();
        })
        .on("Resize", () => {
            this.refresh();
        })
        .on("ResizeDocked", (state) => {
            $("#udfViewContainer").parent().css("width", `${state.dockedWidth}%`);
            this.refresh();
        })
        .on("Show", () => {
            this.toggleDisplay(true);
        });
    }

    public getPopup() {
        return this._popup;
    }

    private _undock(): void {
        this.refresh();
    }

    private _dock(): void {
        this.refresh();
    }

    private _setupAutocomplete(editor: CodeMirror.EditorFromTextArea): void {
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

    private _validateUDFStr(): string {
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

    private _getUDFPathFromModuleName(moduleName: string): string {
        const modulePath = moduleName + ".py";
        const displayPath: string = this._getDisplayNameAndPath(modulePath)[1];
        return UDFFileManager.Instance.displayPathToNsPath(displayPath);
    }

    private _selectUDF(moduleName: string, isNew: boolean): void {
        if (isNew) {
            this._selectBlankUDF();
            return;
        }
        const udfPath = this._getUDFPathFromModuleName(moduleName);
        if (!UDFFileManager.Instance.getUDFs().has(udfPath)) {
            this._selectBlankUDF();
            return;
        }

        UDFFileManager.Instance.getEntireUDF(udfPath)
        .then((udfStr) => {
            const currentTab = UDFTabManager.Instance.getActiveTab();
            if (currentTab && currentTab.name === moduleName) {
                this._setEditorValue(udfStr);
            }
        })
        .fail((error) => {
            const currentTab = UDFTabManager.Instance.getActiveTab();
            if (currentTab && currentTab.name === moduleName) {
                const options: {side: string; offsetY: number} = {
                    side: "bottom",
                    offsetY: -2
                };
                StatusBox.show(
                    xcHelper.parseError(error),
                    this._getEditSection(),
                    true,
                    options
                );
            }
        });
    }

    private _focusBlankUDF(): void {
        let lineNum = this.udfDefault.match(/\n/g).length;
        this.editor.setCursor({line: lineNum, ch: 0});
        this.editor.focus();
    }

    private _selectBlankUDF(): void {
        this._setEditorValue(this.udfDefault);
        this._focusBlankUDF();
    }

    private _getDisplayNameAndPath(
        displayNameOrPath: string
    ): [string, string] {
        let displayName: string;
        let displayPath: string;
        if (!displayNameOrPath.startsWith("/")) {
            displayName = displayNameOrPath;
            displayPath =
                UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
                displayName;
        } else {
            displayPath = displayNameOrPath;
            displayName = displayNameOrPath.startsWith(
                UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            )
                ? displayPath.split("/").pop()
                : displayPath;
        }
        return [displayName, displayPath];
    }

    private _getDisplayNameFromNSPath(nsPath: string): string {
        const nsPathSplit: string[] = nsPath.split("/");
        let displayName: string = nsPath.startsWith(
            UDFFileManager.Instance.getCurrWorkbookPath()
        )
            ? nsPathSplit[nsPathSplit.length - 1]
            : nsPath;
        displayName = UDFFileManager.Instance.nsPathToDisplayPath(
            displayName
        );
        return displayName;
    }

    private _setEditorValue(valueStr: string): void {
        this.editor.setValue(valueStr);
    }
}