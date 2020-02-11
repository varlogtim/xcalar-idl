class UDFPanel {
    private static _instance = null;

    public static get Instance(): UDFPanel {
        return this._instance || (this._instance = new this());
    }

    private editor: CodeMirror.EditorFromTextArea;
    private editorInitValue: string;
    private udfWidgets: CodeMirror.LineWidget[] = [];
    private dropdownHint: InputDropdownHint;
    private isSetup: boolean;
    private _popup: PopupPanel;

    private readonly udfDefault: string =
        "# PLEASE TAKE NOTE:\n" +
        "# \n" +
        "# UDFs works on one or more\n" +
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
        "# def udf_sum(col1, col2):\n" +
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
        this._setupUDF();
        this._setupDropdownList();
        this._setupPopup();
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
            this.getEditor().refresh();
        } else {
            $tab.removeClass("active");
            $container.addClass("xc-hidden");
            PopupManager.checkAllContentUndocked();
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
        return this.loadUDF("sql");
    }

    /**
     * Clear the UDF editor.
     * @returns void
     */
    public clearEditor(): void {
        // clear CodeMirror
        if (this.editor != null) {
            this._setEditorValue(this.udfDefault);
            this.editor.clearHistory();
        }
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
    public openUDF(moduleName: string): void {
        if (moduleName) {
            this.selectUDFPath(moduleName);
        } else {
            this._selectBlankUDF();
        }
    }

    /**
     * @param  {string} moduleName
     * @returns void
     */
    public selectUDFPath(moduleName: string): void {
        this._selectUDF(moduleName + ".py", false);
    }

    /**
     * @param  {string} displayName
     * @returns void
     */
    public edit(displayName: string): void {
        this._selectUDF(displayName, true);
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

    /**
     * UDFPanel.Instance.updateUDF
     * @returns void
     */
    public updateUDF(): void {
        this._updateDropdownList(this.listUDFs());
    }

    public listUDFs(): {displayName: string, path: string}[] {
        const res: {displayName: string, path: string}[] = [];
        // store by name
        const unsortedUDF: string[] = Array.from(
            UDFFileManager.Instance.getUDFs().keys()
        );
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
     * UDFPanel.Instance.switchMode
     * update mode of udf section
     */
    public switchMode(sqlMode: boolean): void {
        // XXX TODO: deprecate it
        if (!XVM.isDataMart()) {
            sqlMode = XVM.isSQLMode() &&
            $("#sqlWorkSpacePanel").hasClass("active");
        }
        const $udfSection: JQuery = this._getUDFSection();
        const $topSection: JQuery = $("#udf-fnSection .topSection");
        if (sqlMode) {
            // switch to sql mode, only show sql.py
            $udfSection.addClass("sqlMode");
            $topSection.find(".refreshUdf").addClass("xc-hidden");
            $topSection.find(".template.normal").addClass("xc-hidden");
            $topSection.find(".template.sql").removeClass("xc-hidden");
            this._selectSQLUDF();
        } else {
            $udfSection.removeClass("sqlMode");
            $topSection.find(".refreshUdf").removeClass("xc-hidden");
            $topSection.find(".template.normal").removeClass("xc-hidden");
            $topSection.find(".template.sql").addClass("xc-hidden");
        }
    }

    public selectUDF(udfPath: string): void {
        if (UDFFileManager.Instance.hasUDF(udfPath)) {
            const displayName = this._getDisplayNameFromNSPath(udfPath);
            this._selectUDF(displayName, false);
        } else {
            this._selectBlankUDF();
        }
    }


    private _getUDFSection(): JQuery {
        return $("#udfSection");
    }

    // Setup UDF section
    private _setupUDF(): void {
        const $udfSection: JQuery = this._getUDFSection();
        UDFFileManager.Instance.initialize();
        const monitorFileManager: FileManagerPanel = new FileManagerPanel(
            $("#monitor-file-manager")
        );
        UDFFileManager.Instance.registerPanel(monitorFileManager);

        $udfSection.find(".toManager").on("click", (_event: JQueryEventObject) => {
            $udfSection.addClass("switching");
            MainMenu.openPanel("monitorPanel", "fileManagerButton");
            monitorFileManager.switchType("UDF");
            monitorFileManager.switchPath("/");
            monitorFileManager.switchPathByStep(
                UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            );

            $udfSection.removeClass("switching");
        });

        $udfSection.find("header .close").click(() => {
            this.toggleDisplay(false);
        });

        const textArea: HTMLElement = document.getElementById("udf-codeArea");

        this.editor = CodeMirror.fromTextArea(
            textArea as HTMLTextAreaElement,
            {
                mode: {
                    name: "python",
                    version: 3,
                    singleLineStringErrors: false
                },
                theme: "xcalar-dark",
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

        $udfSection.on(
            "mouseenter",
            ".tooltipOverflow",
            (event: JQueryEventObject): void => {
                xcTooltip.auto(<any>event.currentTarget);
            }
        );
    }

    private _addSaveEvent(): void {
        const $udfSection: JQuery = this._getUDFSection();
        const $topSection: JQuery = $udfSection.find(".topSection");
        const $save: JQuery = $udfSection.find(".saveFile");
        const $saveNameInput: JQuery = $topSection.find(".udf-fnName");
        $save.on("click", () => {
            this._saveUDF($saveNameInput);
        });

        const $editArea: JQuery = $udfSection.find(".editSection .editArea");
        $editArea.keydown((event: JQueryEventObject) => {
            if (
                (!(isSystemMac && event.metaKey) &&
                    !(!isSystemMac && event.ctrlKey)) ||
                event.which !== keyCode.S
            ) {
                return;
            }
            event.preventDefault();
            // Stop propagation, otherwise will clear StatusBox.
            event.stopPropagation();
            $save.click();
        });
    }

    private _saveUDF($saveNameInput: JQuery): void {
        const $save: JQuery = $("#udfButtonWrap").find(".saveFile");
        let displayPath: string = $saveNameInput.val().trim();
        let newModule: boolean = false;

        if (displayPath === "New Module") {
            let $udfSection = this._getUDFSection();
            const tabName = UDFTabManager.Instance.getActiveTabName();
            // XXX hakc that should be removed
            if ($udfSection.hasClass("sqlMode") || tabName === "sql") {
                newModule = true;
                displayPath = "sql.py";
            } else {
                this._eventSaveAs(tabName);
                return;
            }
        }
        if (!displayPath.startsWith("/")) {
            displayPath =
                UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
                displayPath;
        }
        if (
            UDFFileManager.Instance.canAdd(
                displayPath,
                $saveNameInput,
                $saveNameInput,
                "bottom"
            )
        ) {
            $save.addClass("xc-disabled");
            this._eventSave(displayPath, newModule)
            .always(() => {
                $save.removeClass("xc-disabled");
            });
        }
    }

    private _eventSaveAs(tabName: string) {
        const options = {
            onSave: (displayPath: string) => {
                this._eventSave(displayPath, true);
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

    private _eventSave(displayPath: string, newModule?: boolean): XDPromise<void> {
        const entireString: string = this._validateUDFStr();
        if (entireString) {
            let deferred: XDDeferred<void> = PromiseHelper.deferred();
            UDFFileManager.Instance.add(displayPath, entireString)
            .then(() => {
                if (newModule) {
                    this._selectUDF(displayPath, false);
                } else {
                    this.editorInitValue = this.editor.getValue();
                }
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return PromiseHelper.resolve();
        }
    }

    private _setupDropdownList(): void {
        const $dropdownList: JQuery = $("#udf-fnList");
        const menuHelper: MenuHelper = new MenuHelper($dropdownList, {
            onSelect: ($li: JQuery) => {
                let name: string = "";
                if ($li.attr("name") === "blank") {
                    name = $li.find("span").text();
                } else {
                    name = $li.text();
                }
                this._selectUDF(name, true)
            },
            container: "#udfSection",
            bounds: "#udfSection",
            bottomPadding: 2
        });

        this.dropdownHint = new InputDropdownHint($dropdownList, {
            menuHelper,
            onEnter: (displayName: string) =>
                this._selectUDF(displayName, true)
        });

        this._selectBlankUDF();
    }

    private _setupPopup(): void {
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
            this.getEditor().refresh();
        });
    }

    private _undock(): void {
        this.getEditor().refresh();
    }

    private _dock(): void {
        this.getEditor().refresh();
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

    /**
     * @param  {string} displayNameOrPath
     * @param  {boolean} needConfirm
     * @returns void
     */
    private _selectUDF(displayNameOrPath: string, needConfirm: boolean): void {
        const confirmSelect = () => {
            if (displayNameOrPath === "New Module") {
                this._selectBlankUDF();
                return;
            }

            const displayNameAndPath: [
            string,
            string
            ] = this._getDisplayNameAndPath(displayNameOrPath);
            const displayName = displayNameAndPath[0];
            const displayPath = displayNameAndPath[1];

            const nsPath = UDFFileManager.Instance.displayPathToNsPath(
                displayPath
            );
            if (!UDFFileManager.Instance.getUDFs().has(nsPath)) {
                // XXX hack way
                if (displayNameOrPath === "sql.py") {
                    this._selectBlankUDF();
                    return;
                }
                StatusBox.show(UDFTStr.NoTemplate, $("#udf-fnList"));
                return;
            }

            const $fnListInput: JQuery = $("#udf-fnList input");
            StatusBox.forceHide();
            this.dropdownHint.setInput(displayName);
            xcTooltip.changeText($fnListInput, displayName);

            const fillUDFFunc = (funcStr: string) => {
                if ($fnListInput.val() !== displayName) {
                    // Check if diff list item was selected during
                    // the async call
                    return;
                }

                this._setEditorValue(funcStr);
            };
            UDFFileManager.Instance.getEntireUDF(nsPath)
            .then(fillUDFFunc)
            .fail((error) => {
                const options: {side: string; offsetY: number} = {
                    side: "bottom",
                    offsetY: -2
                };
                StatusBox.show(
                    xcHelper.parseError(error),
                    $fnListInput,
                    true,
                    options
                );
            });
        };

        if (needConfirm && this.editorInitValue !== this.editor.getValue()) {
            Alert.show({
                title: UDFTStr.SwitchTitle,
                msg: UDFTStr.SwitchMsg,
                onConfirm: () => {
                    confirmSelect();
                }
            });
        } else {
            confirmSelect();
        }
    }

    public focusBlankUDF(): void {
        let lineNum = this.udfDefault.match(/\n/g).length;
        this.editor.setCursor({line: lineNum, ch: 0});
        this.editor.focus();
    }

    private _selectBlankUDF(): void {
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        const displayName: string = $blankFunc.find("span").text();

        StatusBox.forceHide();
        this.dropdownHint.setInput(displayName);
        xcTooltip.changeText($fnListInput, displayName);

        this._setEditorValue(this.udfDefault);
        this.focusBlankUDF();
    }

    private _selectSQLUDF(): void {
        let sqlUDFPath = UDFFileManager.Instance.getCurrWorkbookPath() + "sql";
        if (UDFFileManager.Instance.hasUDF(sqlUDFPath)) {
            this._selectUDF("sql.py", false);
        } else {
            this._selectBlankUDF();
        }
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

    private _updateDropdownList(udfLists: {displayName}[]): void {
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        let html: string = "";
        const liClass: string = "workbookUDF";

        for (const {displayName} of udfLists) {
            const tempHTML: string =
                '<li class="tooltipOverflow' +
                liClass +
                '"' +
                ' data-toggle="tooltip"' +
                ' data-container="body"' +
                ' data-placement="top"' +
                ' data-original-title="' +
                displayName +
                '">' +
                displayName +
                "</li>";

            html += tempHTML;
        }

        $blankFunc.siblings().remove();
        $blankFunc.after(html);
    }

    private _setEditorValue(valueStr: string): void {
        this.editor.setValue(valueStr);
        // after put into editor, valueStr may be different then
        // editor.getValue
        this.editorInitValue = this.editor.getValue();
    }

    /* Unit Test Only */
    public __testOnly__: any = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.inputUDFFuncList = (displayName: string) =>
                this._selectUDF(displayName, false);
        }
    }
    /* End Of Unit Test Only */
}
