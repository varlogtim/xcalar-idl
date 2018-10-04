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
        // switch to first tab
        // TODO: remove
        // $("#udfSection .tab:first-child").click();
        this._getAndFillUDF(modulePath);
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
        const curWorkbookModules: string[] = [];
        const sortedUDF: string[] = Array.from(
            UDFFileManager.Instance.getUDFs().keys()
        ).sort();

        for (const udf of sortedUDF) {
            if (UDFFileManager.Instance.isWritable(udf)) {
                curWorkbookModules.push(udf);
            }
        }

        this._updateTemplateList(curWorkbookModules, doNotClear);
    }

    // Setup UDF section
    private _setupUDF(): void {
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

        /* open file manager */
        const $tabs: JQuery = $udfSection.find(".tabSection");
        $tabs.on("click", ".tab", (_event: JQueryEventObject) => {
            $udfSection.addClass("switching");
            $("#monitorTab").trigger("click");
            $("#fileManagerButton").trigger("click");
            $udfSection.removeClass("switching");
        });
        /* end of open file manager */

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
            UDFFileManager.Instance.upload(moduleName, entireString);
        });
        /* end of upload udf section */
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

    private _validateUDFName(): string {
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

    private _inputUDFFuncList(module: string): boolean {
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

    private _selectUDFFuncList($li: JQuery): void {
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

        UDFFileManager.Instance.getEntireUDF(modulePath)
        .then(fillUDFFunc)
        .fail((error) => {
            fillUDFFunc("#" + xcHelper.parseError(error));
        });
    }

    private _updateTemplateList(
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
