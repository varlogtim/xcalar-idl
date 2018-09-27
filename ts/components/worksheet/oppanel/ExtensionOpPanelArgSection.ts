class ExtensionOpPanelArgSection {
    private $extArgs: JQuery;
    private model: ExtensionOpPanelModel;
    private formHelper: FormHelper;
    private hintMenu: MenuHelper[][];

    public constructor(
        $extArgs: JQuery,
        model: ExtensionOpPanelModel,
        formHelper: FormHelper
    ) {
        this.$extArgs = $extArgs;
        this.model = model;
        this.formHelper = formHelper;
        this.hintMenu = [];
        this._render();
        this._addEventListeners();
        this._setupSuggest();
    }

    public reset(): void {
        this.hintMenu = [];
        const $extArgs: JQuery = this.$extArgs;
        $extArgs.addClass("xc-hidden")
                    .find(".argSection").remove()
                    .find(".tableSecion .dropDownList ul").empty();
    }

    // XXX TODO
    public restore(args: object) {
    }

    private _render() {
        const func: ExtensionFuncInfo = this.model.func;
        if (func == null) {
            return;
        }
        this.$extArgs.append('<div class="argSection"></div>');
        this._populateArgInstruction(func.instruction);
        this._populateArgTableSection();
        this._populateArgFields(func);
        this.$extArgs.removeClass("xc-hidden");
    }

    private _populateArgInstruction(instruction: string): void {
        const $instr: JQuery = this.$extArgs.find(".instructionSection");
        if (instruction) {
            $instr.text(ExtTStr.Instruction + ": " + instruction).show();
        } else {
            $instr.text("").hide();
        }
    }

    private _populateArgTableSection(): void {
        const $section: JQuery = this.$extArgs.find(".tableSection");
        if (this.model.hasDependentTable()) {
            const html: HTML =
            '<div class="description">Node:</div>' +
            '<div class="inputWrap">' +
                '<div class="dropDownList">' +
                    '<input class="text" type="text" disabled>' +
                    '<div class="iconWrapper">' +
                        '<i class="icon xi-arrow-down"></i>' +
                    '</div>' +
                    '<div class="list">' +
                        '<ul>' +
                        '</ul>' +
                        '<div class="scrollArea top">' +
                            '<i class="arrow icon xi-arrow-up"></i>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                            '<i class="arrow icon xi-arrow-down"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>';
            $section.removeClass("xc-hidden").html(html);
        } else {
            $section.addClass("xc-hidden").empty();
        }
    }

    private _populateArgFields(func: ExtensionFuncInfo): void {
        const $extArgs: JQuery = this.$extArgs;
        const args: ExtensionFieldInfo[] = func.arrayOfFields;
        const html: HTML = args.map((arg) => this._getArgHTML(arg)).join("");
        const $argSection: JQuery = $extArgs.find(".argSection");
        $argSection.html(html);
        $argSection.find(".field").each((index, el) => {
            const argInfo: ExtensionFieldInfo = args[index] || <ExtensionFieldInfo>{};
            const $field: JQuery = $(el);
            if (argInfo.fieldClass != null) {
                $field.data("field", argInfo.fieldClass);
            }
            if (argInfo.type === "column" &&
                argInfo.typeCheck &&
                argInfo.typeCheck.tableField
            ) {
                $field.data("table", argInfo.typeCheck.tableField);
            }
        });
        this.formHelper.refreshTabbing();
    }

    private _populateNodeList($dropdown: JQuery): void {
        const numNodes = this.model.getAvailableNodeNum();
        let html: HTML = "";
        for (let i = 0; i< numNodes; i++) {
            html += `<li data-index="${i}">Node ${i + 1}</li>`;
        }
        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $dropdown.find("ul").html(html);
    }

    private _getDropdownContainer(): string {
        const $panel: JQuery = this.$extArgs.closest(".opPanel");
        return `#${$panel.attr("id")} .extArgs`;
    }

    private _addNodeListDropdown($dropDown: JQuery): MenuHelper {
        const selector: string = this._getDropdownContainer();
        return new MenuHelper($dropDown, {
            onOpen: ($curDropdown) => {
                this._populateNodeList($curDropdown);
            },
            onSelect: ($li) => {
                if (!$li.hasClass("hint")) {
                    const $input: JQuery = $li.closest(".dropDownList").find("input");
                    $input.val($li.text());
                    $input.data("index", $li.data("index"));
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _addArgDropdown($list) {
        const selector: string = this._getDropdownContainer();
        new MenuHelper($list, {
            onSelect: ($li) => {
                $li.closest(".dropDownList").find("input").val($li.text());
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _addHintDropdown($dropDown: JQuery, index: number): void {
        const selector: string = this._getDropdownContainer();
        this.hintMenu[index] = this.hintMenu[index] || [];
        const menuHelper = new MenuHelper($dropDown, {
            onSelect: ($li) => {
                if (!$li.hasClass("htin")) {
                    $li.closest(".dropDownList").find("input").val($li.text());
                }
            },
            container: selector,
            bounds: selector
        });
        this.hintMenu[index].push(menuHelper);
    }

    private _removeHintDropdown(index: number, subIndex: number): void {
        this.hintMenu[index].splice(subIndex, 1);
    }

    private _hideHintDropdown() {
        this.hintMenu.forEach((menus) => {
            if (menus == null) {
                return;
            }
            menus.forEach((menuHelper) => {
                menuHelper.hideDropdowns();
            });
        });
    }

    private _addClause($field: JQuery): void {
        const $inputWraps: JQuery = $field.find(".inputWrap");
        const $newWrap: JQuery = $inputWraps.eq(0).clone();
        const $input: JQuery = $newWrap.find("input");
        $input.addClass("subArg").val("");
        const icon: string = '<i class="icon xi-cancel removeClause xc-action"></i>';
        $newWrap.addClass("subInput").append(icon);
        $inputWraps.eq($inputWraps.length - 1).after($newWrap);

        const $list: JQuery = $newWrap.find(".hintDropdown");
        if ($list.length) {
            this._addHintDropdown($list, $field.index());
        }
        $input.focus();
        this.formHelper.refreshTabbing();
    }

    private _removeClause($inputWrap: JQuery): void {
        const index: number = $inputWrap.closest(".field").index();
        const subIndex: number = this._getInputSubIndex($inputWrap);
        this._removeHintDropdown(index, subIndex);
        $inputWrap.remove();
        this.formHelper.refreshTabbing();
    }

    private _getColSuggestList($field: JQuery, keyWord: string): HTML {
        const $extArgs: JQuery = this.$extArgs;
        const tableField: string = $field.data("table");
        let nodeIndex: number = null;
        if (tableField == null) {
            const $tableDropdown: JQuery = $extArgs.find(".tableSection .dropDownList");
            nodeIndex = Number($tableDropdown.find("input").data("index"));
        } else {
            const $fields: JQuery = $extArgs.find(".argSection .field");
            const $tableField: JQuery = $fields.filter((_index, el) => {
                return $(el).data("field") === tableField;
            });

            if ($tableField.length) {
                nodeIndex = Number($tableField.find(".argument").data("index"));
            }
        }

        let html: HTML = "";
        if (nodeIndex != null && !isNaN(nodeIndex)) {
            const progCols: ProgCol[] = this.model.getColumns(nodeIndex);
            progCols.forEach((progCol) => {
                const colName: string = progCol.getBackColName();
                if (colName.includes(keyWord)) {
                    html +=
                    '<li>' +
                        BaseOpPanel.craeteColumnListHTML(progCol.getType(), colName) +
                    '</li>';
                }
            })
        }

        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        return html;
    }

    private _addColSuggest($input: JQuery): void {
        const keyword: string = $input.val().trim();
        const $field: JQuery = $input.closest(".field");
        const index: number = $field.index();
        const subIndex: number = this._getInputSubIndex($input);
        if (this.hintMenu[index] == null ||
            this.hintMenu[index][subIndex] == null
        ) {
            console.error("cannot find menu");
            return;
        }
        const list: HTML = this._getColSuggestList($field, keyword);
        $input.closest(".hintDropdown").find("ul").html(list);
        const menu: MenuHelper = this.hintMenu[index][subIndex];
        menu.openList();
    }

    private _applyColSuggest($li: JQuery): void {
        const val: string = gColPrefix + $li.text();
        const $inputWrap: JQuery = $li.closest(".inputWrap");
        const $field: JQuery = $inputWrap.closest(".field");
        const index: number = $field.index();
        const subIndex: number = this._getInputSubIndex($inputWrap);
        if (this.hintMenu[index] && this.hintMenu[index][subIndex]) {
            const menu: MenuHelper = this.hintMenu[index][subIndex];
            menu.hideDropdowns();
        }
        $inputWrap.find(".argument").val(val);
    }

    private _getInputSubIndex($input: JQuery): number {
        // first element in .inputWrap is always .desc
        return $input.closest(".inputWrap").index() - 1;
    }

    private _getAutofillVal(autofill): string {
        let val;
        if (typeof autofill === "function") {
            val = autofill();
        } else {
            val = autofill;
        }
        return val;
    }

    private _isValidNum(num): boolean {
        return num != null && !isNaN(num);
    }

    private _getArgHTML(arg: ExtensionFieldInfo): HTML {
        const argType: string = arg.type;
        const typeCheck: ExtensionTypeCheck = arg.typeCheck || <ExtensionTypeCheck>{};

        let inputType: string = "text";
        let inputVal: string = "";
        let inputClass: string = "argument type-" + argType;
        // for dropdowns
        let isDropdown: boolean = false;
        let isCheckbox: boolean = false;

        let list: HTML = "";
        let placeholder: string = "";

        if (argType === "table") {
            isDropdown = true;
            list = "";
        } else if (argType === "boolean") {
            isCheckbox = true;
            inputClass += " checkbox";
            if (arg.autofill === true) {
                inputClass += " checked";
            }
        } else if (argType === "column") {
            if (typeCheck.multiColumn) {
                inputClass += " multiColumn";
            }
        } else {
            if (argType === "number") {
                inputType = "number";
                if (arg.autofill != null) {
                    inputVal = this._getAutofillVal(arg.autofill);
                }
            } else if (arg.autofill != null) {
                // when it's string
                inputVal = this._getAutofillVal(arg.autofill);
            }

            if (typeCheck.newAggName) {
                inputClass += " aggName";
            }

            if (arg.enums != null && arg.enums instanceof Array) {
                isDropdown = true;
                list +=  arg.enums.map((val) => `<li>${val}</val>`).join("");
                if (inputVal !== "" && !arg.enums.includes(inputVal)) {
                    // when has invalid auto value
                    inputVal = "";
                }
            } else {
                const max: number = typeCheck.max;
                const min: number = typeCheck.min;
                if (this._isValidNum(min)) {
                    placeholder = `range: >=${min}`;
                }

                if (this._isValidNum(max)) {
                    if (placeholder !== "") {
                        placeholder += `, <=${max}`;
                    } else {
                        placeholder = `range: <=${max}`;
                    }
                }
            }
        }

        if (typeCheck.allowEmpty) {
            placeholder = placeholder
            ? placeholder + ` (${CommonTxtTstr.Optional})`
            : CommonTxtTstr.Optional;
        }

        let addClause: string = "";
        if (arg.variableArg === true) {
            addClause = '<div class="addClause">' +
                            '<button class="btn iconBtn">' +
                                '<i class="icon xi-plus fa-14"></i>' +
                                ExtTStr.AddClause +
                            '</button>' +
                        '</div>';
        }
        inputVal = xcHelper.escapeHTMLSpecialChar(inputVal);
        let html: HTML;
        if (isCheckbox) {
            html =
                '<div class="field row clearfix">' +
                    '<div class="checkboxWrap">' +
                        '<div class="' + inputClass + '">' +
                            '<i class="icon xi-ckbox-empty fa-15"></i>' +
                            '<i class="icon xi-ckbox-selected fa-15"></i>' +
                        '</div>' +
                        '<div class="text">' +
                            arg.name +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else if (isDropdown) {
            // generate dropdown
            inputClass += " text dropdownInput";
            html =
                '<div class="field row clearfix">' +
                    '<div class="description">' +
                        arg.name +
                    '</div>' +
                    '<div class="inputWrap">' +
                        '<div class="dropDownList argDropdown">' +
                            '<input class="' + inputClass +'"' +
                            ' value="' + inputVal + '"' +
                            ' spellcheck="false" type="text" disabled>' +
                            '<div class="iconWrapper">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list">' +
                                '<ul>' +
                                    list +
                                '</ul>' +
                                '<div class="scrollArea top">' +
                                  '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                  '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';
        } else {
            // generate input
            html =
                '<div class="field row clearfix">' +
                    '<div class="description">' +
                        arg.name +
                    '</div>' +
                    '<div class="inputWrap">' +
                        '<div class="dropDownList hintDropdown">' +
                            '<input class="' + inputClass +'"' +
                            ' type="' + inputType + '"' +
                            ' value="' + inputVal + '"' +
                            ' placeholder="' + placeholder + '"' +
                            ' spellcheck="false">' +
                            '<div class="list hint">' +
                                '<ul></ul>' +
                                '<div class="scrollArea top">' +
                                  '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                  '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                    addClause +
                '</div>';
        }

        return html;
    }

    private _addEventListeners(): void {
        const $extArgs: JQuery = this.$extArgs;
        const $mainNodeDropdown: JQuery = $extArgs.find(".tableSection .dropDownList");
        this._addNodeListDropdown($mainNodeDropdown);

        // add dropdowns
        const $argSection: JQuery = $extArgs.find(".argSection");
        $argSection.find(".field").each((index, el) => {
            // should add one by one or the scroll will not work
            const $dropDown: JQuery = $(el).find(".dropDownList");
            if ($dropDown.length !== 0) {
                if ($dropDown.hasClass("hintDropdown")) {
                    this._addHintDropdown($dropDown, index);
                } else if ($dropDown.hasClass("argDropdown")) {
                    if ($dropDown.find(".argument").hasClass("type-table")) {
                        this._addNodeListDropdown($dropDown);
                    } else {
                        this._addArgDropdown($dropDown);
                    }
                }
            }
        });

        $argSection.find("input.aggName").each((_index, el) => {
            xcHelper.addAggInputEvents($(el));
        });

        $argSection.on("click", ".checkboxWrap", (event) => {
            $(event.currentTarget).find(".checkbox").toggleClass("checked");
        });

        // add more clause
        $argSection.on("click", ".addClause", (event) => {
            this._hideHintDropdown();
            const $field: JQuery = $(event.currentTarget).closest(".field");
            this._addClause($field);
        });

        // remove clause
        $argSection.on("click", ".removeClause", (event) => {
            this._hideHintDropdown();
            this._removeClause($(event.currentTarget).closest(".inputWrap"));
        });
    }

    private _setupSuggest(): void {
        let argumentTimer: number;
        const $extArgs = this.$extArgs;

        const inputSuggest: InputSuggest = new InputSuggest({
            $container: $extArgs,
            onClick: ($li) => { this._applyColSuggest($li); } 
        });

        const $argSection: JQuery = $extArgs.find(".argSection");
        $argSection.on('keydown', '.hintDropdown input', (event) => {
            inputSuggest.listHighlight(event);
        });

        $argSection.on("input", ".argument.type-column", (event) => {
            const $input: JQuery = $(event.currentTarget);
            clearTimeout(argumentTimer);
            argumentTimer = window.setTimeout(() => {
                this._addColSuggest($input);
            }, 200);
        });

        $argSection.on("focus", ".argument", () => {
            this._hideHintDropdown();
        });
    }
}