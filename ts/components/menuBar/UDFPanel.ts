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
     * @param  {string} moduleName
     * @returns void
     */
    public selectUDFPath(moduleName: string): void {
        this._selectUDFPath(moduleName + ".py");
    }

    /**
     * @param  {string} displayName
     * @returns void
     */
    public edit(displayName: string): void {
        this._eventExpandSaveAs(false);
        this._selectUDFPath(displayName);
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
     * @returns void
     */
    public updateUDF(): void {
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
        this._updateTemplateList(sortedUDF);
    }

    // Setup UDF section
    private _setupUDF(): void {
        UDFFileManager.Instance.initialize();
        const monitorFileManager: FileManagerPanel = new FileManagerPanel(
            $("#monitor-file-manager")
        );

        const $toManagerButton: JQuery = $("#udfButtonWrap .toManager");
        $toManagerButton.on("click", (_event: JQueryEventObject) => {
            $udfSection.addClass("switching");
            $("#monitorTab").trigger("click");
            $("#fileManagerButton").trigger("click");
            monitorFileManager.switchType("UDF");
            monitorFileManager.switchPathByStep(
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
                theme: "xcalar-light",
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
            if ($saveAsSection.hasClass("xc-hidden")) {
                $save.click();
            } else {
                $saveAs.click();
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
        const nsPath: string = this._validateUDFName($section);
        const entireString: string = this._validateUDFStr();
        if (nsPath && entireString) {
            if (
                nsPath.startsWith(UDFFileManager.Instance.getSharedUDFPath())
            ) {
                const uploadPath: string = nsPath;
                UDFFileManager.Instance.upload(
                    uploadPath,
                    entireString,
                    true
                ).then(() =>
                    this._selectUDFPath(
                        UDFFileManager.Instance.nsPathToDisplayPath(nsPath)
                    )
                );
            } else if (
                nsPath.startsWith(
                    UDFFileManager.Instance.getCurrWorkbookPath()
                )
            ) {
                const uploadPath: string = nsPath.split("/").pop();
                UDFFileManager.Instance.upload(uploadPath, entireString).then(
                    () => this._selectUDFPath(uploadPath + ".py")
                );
            }
            return true;
        }
        return false;
    }

    private _setupTemplateList(): void {
        /* Template dropdown list */
        const $template: JQuery = $("#udf-fnList");
        const menuHelper: MenuHelper = new MenuHelper($template, {
            onSelect: ($li: JQuery) => this._selectUDFElement($li),
            container: "#udfSection",
            bounds: "#udfSection",
            bottomPadding: 2
        });

        this.dropdownHint = new InputDropdownHint($template, {
            menuHelper,
            onEnter: (displayName: string) => this._selectUDFPath(displayName)
        });

        this._selectBlankUDFElement();
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

    private _validateUDFName($section: JQuery): string {
        const $inputSection: JQuery = $section.find(".udf-fnName");
        let displayPath: string = $inputSection.val().trim();

        if (!displayPath.startsWith("/")) {
            displayPath =
                UDFFileManager.Instance.getCurrWorkbookDisplayPath() +
                displayPath;
        }

        return UDFFileManager.Instance.canAdd(
            displayPath,
            $inputSection,
            $inputSection
        )
            ? UDFFileManager.Instance.displayPathToNsPath(displayPath)
            : null;
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

    private _selectUDFPath(displayName: string): boolean {
        const $li = $("#udf-fnMenu")
        .find("li")
        .filter(
            (_index: number, el: Element): boolean => {
                return $(el).text() === displayName;
            }
        );

        if ($li.length === 0) {
            StatusBox.show(UDFTStr.NoTemplate, $("#udf-fnList"));
            return true;
        } else {
            this._selectUDFElement($li);
            return false;
        }
    }

    private _selectBlankUDFElement(): void {
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        this._selectUDFElement($blankFunc);
    }

    private _selectUDFElement($li: JQuery): void {
        this._eventExpandSaveAs(false);

        if ($li.hasClass("udfHeader") || $li.hasClass("dataflowHeader")) {
            return;
        }

        $li.parent()
        .find("li")
        .removeClass("selected");
        $li.addClass("selected");

        const nsPath: string = $li.attr("data-udf-path");
        const displayName: string = $li.text();
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $fnName: JQuery = $("#udf-fnName");

        StatusBox.forceHide();
        this.dropdownHint.setInput(displayName);

        xcTooltip.changeText($fnListInput, displayName);

        if ($li.attr("name") === "blank") {
            $fnName.val("");
            this.editor.setValue(this.udfDefault);
        } else {
            this._getAndFillUDF(nsPath);
        }
    }

    private _getAndFillUDF(nsPath: string): void {
        const $fnListInput: JQuery = $("#udf-fnList input");
        const $fnName: JQuery = $("#udf-fnName");
        const nsPathSplit: string[] = nsPath.split("/");
        let displayName: string = nsPath.startsWith(
            UDFFileManager.Instance.getCurrWorkbookPath()
        )
            ? nsPathSplit[nsPathSplit.length - 1]
            : nsPath;
        displayName = UDFFileManager.Instance.nsPathToDisplayPath(displayName);
        const fillUDFFunc = (funcStr: string) => {
            if ($fnListInput.val() !== displayName) {
                // Check if diff list item was selected during
                // the async call
                return;
            }

            if (funcStr == null) {
                funcStr = "#" + SideBarTStr.DownloadMsg;
            }

            this.editor.setValue(funcStr);
        };

        $fnListInput.val(displayName);
        xcTooltip.changeText($fnListInput, displayName);
        $fnName.val(displayName);

        UDFFileManager.Instance.getEntireUDF(nsPath)
        .then(fillUDFFunc)
        .fail((error) => {
            fillUDFFunc("#" + xcHelper.parseError(error));
        });
    }

    private _updateTemplateList(nsPaths: string[]): void {
        const $blankFunc: JQuery = $("#udf-fnMenu").find("li[name=blank]");
        let html: string = "";
        const liClass: string = "workbookUDF";

        for (const nsPath of nsPaths) {
            const nsPathSplit: string[] = nsPath.split("/");
            let displayName: string = nsPath.startsWith(
                UDFFileManager.Instance.getCurrWorkbookPath()
            )
                ? nsPathSplit[nsPathSplit.length - 1]
                : nsPath;
            displayName = UDFFileManager.Instance.nsPathToDisplayPath(
                displayName
            );
            const tempHTML: string =
                '<li class="tooltipOverflow' +
                liClass +
                '"' +
                ' data-toggle="tooltip"' +
                ' data-container="body"' +
                ' data-placement="top"' +
                ' data-title="' +
                displayName +
                '" data-udf-path="' +
                nsPath +
                '">' +
                displayName +
                "</li>";

            html += tempHTML;
        }

        $blankFunc.siblings().remove();
        $blankFunc.after(html);
    }

    /* Unit Test Only */
    public __testOnly__: any = {};

    public setupTest(): void {
        if (typeof unitTestMode !== "undefined" && unitTestMode) {
            this.__testOnly__.inputUDFFuncList = (displayName: string) =>
                this._selectUDFPath(displayName);
        }
    }
    /* End Of Unit Test Only */
}
