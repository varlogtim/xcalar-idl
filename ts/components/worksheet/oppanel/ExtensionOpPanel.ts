class ExtensionOpPanel extends BaseOpPanel {
    private model: ExtensionOpPanelModel;
    private argSection: ExtensionOpPanelArgSection;

    public constructor() {
        super();
        this._setup();
    }

    /**
     * Show panel
     * @param dagNode
     */
    public show(dagNode: DagNodeExtension, options?): boolean {
        if (!super.showPanel("Extension", options)) {
            return false;
        }
        this._initialize(dagNode);
        this._formHelper.setup({});
        try {
            this._restorePanel();
        } catch (e) {
            console.error(e);
        }
        return true;
    }

    /**
     * Close panel
     */
    public close(): void {
        if (!this._formHelper.isOpen()) {
            return;
        }
        super.hidePanel();
        this._reset();
    }

    protected _reset(): void {
        super._reset();
        this._resetArgSection();
        const $panel: JQuery = this._getPanel();
        const $dropdownList: JQuery = $panel.find(".dropDownList");
        $dropdownList.find("input").val("")
                    .find("ul").empty();
    }

    private _resetArgSection(): void {
        if (this.argSection != null) {
            this.argSection.reset();
            this.argSection = null;
        }
    }

    private _setup(): void {
        super.setup($("#extensionOpPanel"));
        this._addEventListeners();
    }

    private _initialize(dagNode: DagNodeExtension): void {
        this.model = new ExtensionOpPanelModel(dagNode);
        this._populateModuleList();
        this._populateFuncList();
    }

    private _restorePanel(): void {
        // restore module
        const moduleName: string = this.model.moduleText;
        if (!moduleName) {
            return;
        }
        this._getModuleDropdown().find("input").val(moduleName || "");
        // restore func
        const func: ExtensionFuncInfo = this.model.func;
        if (!func) {
            return;
        }
        this._getFuncDropdown().find("input").val(func.buttonText || "");
        this._populateArgSection();
        this.argSection.restore();
    }

    private _submitForm(): void {
        if (!this._validate()) {
            // invalid case
            return;
        }
        const args: object = this.argSection.getArgs();
        if (args == null) {
            // invalid case
            return;
        }
        this.model.args = args;
        this.model.submit();
        this.close();
    }

    private _validate(): boolean {
        if (this._isAdvancedMode()) {
            // XXX TODO
            // const advancedErr: {error: string} = this.setOpData.validateAdvancedMode(this._editor.getValue());
            // if (advancedErr != null) {
            //     StatusBox.show(advancedErr.error, $panel.find(".advancedEditor"));
            //     return false;
            // } else {
            //     return true;
            // }
        }

        let isValid: boolean = xcHelper.validate([{
            $ele: this._getModuleDropdown().find("input")
        }, {
            $ele: this._getFuncDropdown().find("input")
        }]);
        if (!isValid) {
            return false;
        }

        return true;
    }

    private _populateModuleList(): void {
        const html: HTML = this._populateListHelper(this.model.getAvailableModules());
        this._getModuleDropdown().find("ul").html(html);
    }

    private _populateFuncList(): void {
        const html: HTML = this._populateListHelper(this.model.getAvailableFunctions());
        this._getFuncDropdown().find("ul").html(html);
    }

    private _populateListHelper(items: {text: string, name: string}[]): HTML {
        let html: HTML = null;
        html = items.map((item) => `<li data-name="${item.name}">${item.text}</li>`).join("");
        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        return html;
    }

    private _populateArgSection(): void {
        this._resetArgSection();
        this.argSection = new ExtensionOpPanelArgSection(this._getExtArgs(),
        this.model, this._formHelper);
    }

    private _getModuleDropdown(): JQuery {
        return this._getPanel().find(".moduleName .dropDownList");
    }

    private _getFuncDropdown(): JQuery {
        return this._getPanel().find(".funcName .dropDownList");
    }

    private _getExtArgs(): JQuery {
        return this._getPanel().find(".extArgs");
    }

    private _addEventListeners(): void {
        const $panel: JQuery = this._getPanel();

        $panel.on("click", ".close", () => {
            this.close();
        });

        $panel.on("click", ".confirm", (event) => {
            $(event.target).blur();
            this._submitForm();
        });

        // dropdown for module name
        const $moduleDropdown: JQuery = this._getModuleDropdown();
        this._addEventListenersForDropdown($moduleDropdown, (moduleName) => {
            this.model.moduleName = moduleName;
            this.model.funcName = null;
            this._resetArgSection();
            this._getFuncDropdown().find("input").val("");
            this._populateFuncList();
        });

        // dropdown for function name
        const $funcDropdown: JQuery = this._getFuncDropdown();
        this._addEventListenersForDropdown($funcDropdown, (funcName) => {
            this.model.funcName = funcName;
            this._populateArgSection();
        });
    }

    private _addEventListenersForDropdown(
        $dropdown: JQuery,
        selectCallback?: Function,
    ): void {
        const selector: string = `#${this._getPanel().attr("id")}`;
        new MenuHelper($dropdown, {
            onSelect: ($li) => {
                const text: string = $li.text();
                const $input: JQuery = $dropdown.find("input");
                if (!$li.hasClass("hint") && text !== $input.val()) {
                    $input.val(text);
                    selectCallback($li.data("name"));
                }
            },
            container: selector
        }).setupListeners();
    }
}