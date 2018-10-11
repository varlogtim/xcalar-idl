class UDFPanel {
    private static _instance = null;

    public static get Instance(): UDFPanel {
        return this._instance || (this._instance = new this());
    }

    private editor: CodeMirror.EditorFromTextArea;
    private udfWidgets: CodeMirror.LineWidget[] = [];
    private dropdownHint: InputDropdownHint;
    private readonly udfDefault: string =
        "# PLEASE TAKE NOTE:\n\n" +
        "# UDFs can only support\n" +
        "# return values of\n" +
        "# type String.\n\n" +
        "# Function names that\n" +
        "# start with __ are\n" +
        "# considered private\n" +
        "# functions and will not\n" +
        "# be directly invokable.\n\n";

    /**
     * @returns void
     */
    public setup(): void {
        this._setupUDF();
        this._setupTemplateList();
    }

    /**
     * Clear UDFs.
     * @returns void
     */
    public clear(): void {
        this.clearEditor();
        UDFFileManager.Instance.getUDFs().clear();
        $("#udf-fnMenu")
        .find("li[name=blank]")
        .siblings()
        .remove();
    }

    /**
     * Clear the UDF editor.
     * @returns void
     */
    public clearEditor(): void {
        // clear CodeMirror
        if (this.editor != null) {
            // Wrap in if because KVStore.restore may call UDFPanel.Instance.clear()
            // and at that time editor has not setup yet.
            this.editor.setValue(this.udfDefault);
            this.editor.clearHistory();
        }
    }

    /**
     * Get the UDF editor.
     * @returns CodeMirror
     */
    public getEditor(): CodeMirror.EditorFromTextArea {
        return this.editor;
    }

    /**
     * @param  {string} module
     * @returns void
     */
    public selectUDFFuncList(module: string): void {
        this._inputUDFFuncList(module);
    }

    /**
     * @param  {string} modulePath
     * @returns void
     */
    public edit(modulePath: string): void {
        this._eventExpandSaveAs(false);
        this._inputUDFFuncList(modulePath);
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
     * @param  {boolean} doNotClear
     * @returns void
     */
    public updateUDF(doNotClear: boolean): void {
        // store by name
        const unsortedUDF: string[] = Array.from(
            UDFFileManager.Instance.getUDFs().keys()
        );
        const workbookUDF: string[] = unsortedUDF.filter((value: string) => {
            return value.startsWith(
                UDFFileManager.Instance.getCurrWorkbookPath()
            );
        });
        const otherUDF: string[] = unsortedUDF.filter((value: string) => {
            return !value.startsWith(
                UDFFileManager.Instance.getCurrWorkbookPath()
            );
        });
        const sortedUDF = workbookUDF.sort().concat(otherUDF.sort());
        this._updateTemplateList(sortedUDF, doNotClear);
    }

    // Setup UDF section
    private _setupUDF(): void {
        const $toManagerButton: JQuery = $("#udfButtonWrap .toManager");
        $toManagerButton.on("click", (_event: JQueryEventObject) => {
            $udfSection.addClass("switching");
            $("#monitorTab").trigger("click");
            $("#fileManagerButton").trigger("click");
            FileManagerPanel.Instance.switchType("UDF");
            FileManagerPanel.Instance.switchPath(
                UDFFileManager.Instance.getCurrWorkbookDisplayPath()
            );
            $udfSection.removeClass("switching");
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
                    this.updateHints(error),
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

        this._addSaveEvent();

        $udfSection.on(
            "mouseenter",
            ".tooltipOverflow",
            (event: JQueryEventObject): void => {
                xcTooltip.auto(event.currentTarget as HTMLElement);
            }
        );
    }

    private _addSaveEvent(): void {
        const $udfSection: JQuery = $("#udfSection");
        const $topSection: JQuery = $udfSection.find(".topSection");
        const $save: JQuery = $topSection.find(".save");
        const $saveNameInput: JQuery = $topSection.find(".udf-fnName");
        $save.on("click", (event: JQueryEventObject) => {
            if (
                $(event.currentTarget)
                .find(".icon")
                .hasClass("xi-close")
            ) {
                this._eventExpandSaveAs(false);
                return;
            }

            if ($saveNameInput.val() === "New Module") {
                this._eventExpandSaveAs(true);
            } else {
                this._eventSave($topSection);
            }
        });

        const $saveAsSection: JQuery = $udfSection.find(".saveAsSection");
        const $saveAsInput: JQuery = $saveAsSection.find("input");
        const $saveAs: JQuery = $saveAsSection.find(".save");

        $saveAsInput.keypress((event: JQueryEventObject) => {
            if (event.which === keyCode.Enter) {
                if (this._eventSave($saveAsSection)) {
                    this._eventExpandSaveAs(false);
                    $saveAsSection.find("input").val("");
                }
            }
        });

        $saveAs.on("click", (event: JQueryEventObject) => {
            if (this._eventSave($saveAsSection)) {
                this._eventExpandSaveAs(false);
                $saveAsSection.find("input").val("");
            }
        });
    }

    private _eventExpandSaveAs(expand: boolean) {
        const $udfSection: JQuery = $("#udfSection");
        const $topSection: JQuery = $udfSection.find(".topSection");
        const $saveAsSection: JQuery = $udfSection.find(".saveAsSection");
        if (expand) {
            $topSection.find(".save .icon").removeClass("xi-save");
            $topSection.find(".save .icon").addClass("xi-close");
            $saveAsSection.removeClass("xc-hidden");
        } else {
            $topSection.find(".save .icon").addClass("xi-save");
            $topSection.find(".save .icon").removeClass("xi-close");
            $saveAsSection.addClass("xc-hidden");
        }
    }

    private _eventSave($section: JQuery): boolean {
        const modulePath: string = this._validateUDFName($section);
        const entireString: string = this._validateUDFStr();
        if (modulePath && entireString) {
            if (
                modulePath.startsWith(
                    UDFFileManager.Instance.getSharedUDFPath()
                )
            ) {
                UDFFileManager.Instance.upload(modulePath, entireString, true);
            } else if (
                modulePath.startsWith(
                    UDFFileManager.Instance.getCurrWorkbookPath()
                )
            ) {
                const moduleName: string = modulePath.split("/").pop();
                UDFFileManager.Instance.upload(moduleName, entireString);
            }
            return true;
        }
        return false;
    }

    private _setupTemplateList(): void {
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

    private _readUDFFromFile(file: File, moduleName: string): void {
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

    private _validateUDFName($section: JQuery): string {
        const $nameInput: JQuery = $section.find(".udf-fnName");
        let modulePath: string = $nameInput.val().trim();

        const options: {side: string; offsetY: number} = {
            side: "top",
            offsetY: -2
        };

        if (
            !xcHelper.checkNamePattern(
                PatternCategory.UDFFileName,
                PatternAction.Check,
                modulePath
            )
        ) {
            StatusBox.show(UDFTStr.InValidFileName, $nameInput, true, options);
            return null;
        }

        modulePath = UDFFileManager.Instance.displayNameToNsName(modulePath);
        let moduleName: string = modulePath;
        if (modulePath.startsWith("/")) {
            moduleName = moduleName.split("/").pop();
        } else {
            modulePath =
                UDFFileManager.Instance.getCurrWorkbookPath() + modulePath;
        }

        if (
            !UDFFileManager.Instance.isWritable(
                UDFFileManager.Instance.nsNameToDisplayName(modulePath)
            )
        ) {
            StatusBox.show(UDFTStr.InValidPath, $nameInput, true, options);
            return null;
        }

        if (moduleName === "") {
            StatusBox.show(ErrTStr.NoEmpty, $nameInput, true, options);
            return null;
        } else if (
            !xcHelper.checkNamePattern(
                PatternCategory.UDF,
                PatternAction.Check,
                moduleName
            )
        ) {
            StatusBox.show(UDFTStr.InValidName, $nameInput, true, options);
            return null;
        } else if (
            moduleName.length >
            XcalarApisConstantsT.XcalarApiMaxUdfModuleNameLen
        ) {
            StatusBox.show(ErrTStr.LongFileName, $nameInput, true, options);
            return null;
        }

        return modulePath;
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

    private _inputUDFFuncList(displayModulePath: string): boolean {
        const $li = $("#udf-fnMenu")
        .find("li")
        .filter(
            (_index: number, el: Element): boolean => {
                return $(el).text() === displayModulePath;
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

    private _selectUDFFuncList($li: JQuery): void {
        this._eventExpandSaveAs(false);

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

    private _getAndFillUDF(modulePath: string): void {
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $fnName: JQuery = $("#udf-fnName");
        const moduleSplit: string[] = modulePath.split("/");
        let moduleName: string = modulePath.startsWith(
            UDFFileManager.Instance.getCurrWorkbookPath()
        )
            ? moduleSplit[moduleSplit.length - 1]
            : modulePath;
        moduleName = UDFFileManager.Instance.nsNameToDisplayName(moduleName);
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

        UDFFileManager.Instance.getEntireUDF(modulePath)
        .then(fillUDFFunc)
        .fail((error) => {
            fillUDFFunc("#" + xcHelper.parseError(error));
        });
    }

    private _updateTemplateList(
        moduleArray: string[],
        doNotClear: boolean
    ): void {
        const $input: JQuery = $("#udf-fnList input");
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        const selectedModule: string = $input.val();
        let hasSelectedModule: boolean = false;
        let html: string = "";
        const liClass: string = "workbookUDF";

        for (const modulePath of moduleArray) {
            const moduleSplit: string[] = modulePath.split("/");
            let moduleName: string = modulePath.startsWith(
                UDFFileManager.Instance.getCurrWorkbookPath()
            )
                ? moduleSplit[moduleSplit.length - 1]
                : modulePath;
            moduleName = UDFFileManager.Instance.nsNameToDisplayName(
                moduleName
            );
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
                modulePath +
                '">' +
                moduleName +
                "</li>";

            html += tempHTML;
            if (!hasSelectedModule && moduleName === selectedModule) {
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

    /* Unit Test Only */
    public __testOnly__: {
        inputUDFFuncList;
        readUDFFromFile;
    } = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
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
