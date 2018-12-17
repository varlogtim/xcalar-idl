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

    /**
     * Reset the section
     */
    public reset(): void {
        this.hintMenu = [];
        const $extArgs: JQuery = this.$extArgs;
        $extArgs.addClass("xc-hidden")
                    .find(".argSection").remove()
                    .find(".tableSecion .dropDownList ul").empty();
    }

    /**
     * Restore the section
     * @param args
     */
    public restore() {
        const args: object = this.model.args;
        let restoreInputArg = (
            $input: JQuery,
            val: any,
            argInfo: ExtensionFieldInfo
        ): void => {
            if (argInfo.type === "table") {
                this._selectNode(val["triggerNode"], $input);
            } else if (argInfo.type === "column") {
                val = val["triggerColumn"];
                val = (val instanceof Array) ? val : [val];
                const text: string = val.map((col: {name: string, type: ColumnType}) => {
                    return gColPrefix + col.name;
                }).join(", ");
                $input.val(text);
            } else {
                $input.val(val);
            }
        };

        if (this.model.hasDependentTable()) {
            this._selectNode(args["triggerNode"], this._getMainNodeList().find("input"));
        }

        const $arguments: JQuery = this.$extArgs.find(".argument:not(.subArg)");
        const extFields: ExtensionFieldInfo[] = this.model.func.arrayOfFields;
        try {
            $arguments.each((index, el) => {
                const argInfo: ExtensionFieldInfo = extFields[index];
                const $input: JQuery = $(el);
                let val: any = args[argInfo.fieldClass];
                if (argInfo.variableArg && val instanceof Array) {
                    restoreInputArg($input, val[0], argInfo);
                    const $field: JQuery = $input.closest(".field");
                    for (let i = 1; i < val.length; i++) {
                        const $subInput: JQuery = this._addClause($field);
                        restoreInputArg($subInput, val[i], argInfo);
                    }
                } else {
                    restoreInputArg($input, val, argInfo);
                }
            });
        } catch (e) {
            console.error(e);
        }
    }

    public getArgs(): object {
        const mainNodeIndex: number = this._getMainNode();
        if (this.model.hasDependentTable() && mainNodeIndex == null) {
            StatusBox.show(ErrTStr.NoEmptyList, this._getMainNodeList().find("input"));
            return null;
        }
        const args: object = this._getFieldArgs();
        if (args == null) {
            return null;
        }
        args["triggerNode"] = mainNodeIndex;
        return args;
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
            '<div class="description">Input:</div>' +
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
            html += `<li data-index="${i}">Input #${i + 1}</li>`;
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
                    this._selectNode($li.data("index"), $input);
                }
            },
            container: selector,
            bounds: selector
        }).setupListeners();
    }

    private _selectNode(index: number, $input: JQuery): void {
        $input.data("index", index)
            .val(`Input #${(index + 1)}`);
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

    private _addClause($field: JQuery): JQuery {
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
        return $input;
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
            const $tableDropdown: JQuery = this._getMainNodeList();
            nodeIndex = this._getNodeIndex($tableDropdown.find("input"));
        } else {
            const $fields: JQuery = $extArgs.find(".argSection .field");
            const $tableField: JQuery = $fields.filter((_index, el) => {
                return $(el).data("field") === tableField;
            });

            if ($tableField.length) {
                nodeIndex = this._getNodeIndex($tableField.find(".argument"));
            }
        }

        let html: HTML = "";
        if (nodeIndex != null) {
            if (keyWord.startsWith(gColPrefix)) {
                keyWord = keyWord.substring(1);
            }
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
        const $mainNodeDropdown: JQuery = this._getMainNodeList();
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

    private _getMainNodeList(): JQuery {
        return this.$extArgs.find(".tableSection .dropDownList");
    }

    private _getNodeIndex($input: JQuery): number {
        let index: number = Number($input.data("index"));
        if (index == null || isNaN(index)) {
            index = null;
        }
        return index;
    }

    private _getMainNode(): number {
        const $input: JQuery = this._getMainNodeList().find("input");
        const nodeIndex: number = this._getNodeIndex($input);
        return this.model.hasDependentTable() ? nodeIndex : null;
    }

    private _getFieldArgs(): object {
        const args: object = {};
        const $arguments: JQuery = this.$extArgs.find(".argument:not(.subArg)");
        const extFields: ExtensionFieldInfo[] = this.model.func.arrayOfFields;
        let invalidArg: boolean = false;

        $arguments.each((index, el) => {
            const argInfo: ExtensionFieldInfo = extFields[index];
            // check table type first
            if (argInfo.type === "table") {
                const res = this._checkTableArg($(el), argInfo);
                if (!res.valid) {
                    invalidArg = true;
                    return false;
                }
                args[argInfo.fieldClass] = {
                    triggerNode: res.arg
                };
            }
        });

        if (invalidArg) {
            return null;
        }
        // check col names
        $arguments.each((index, el) => {
            const argInfo: ExtensionFieldInfo = extFields[index];
            if (argInfo.type !== "table") {
                const $input: JQuery = $(el);
                const res = this._checkArg(argInfo, $input, args);
                if (!res.valid) {
                    invalidArg = true;
                    return false;
                }
                let arg: any = res.arg;
                const subArgs = this._checkSubArgs(argInfo, $input, args);
                if (subArgs == null) {
                    // error case;
                    invalidArg = true;
                    return false;
                } else if (subArgs.length > 0) {
                    arg = [arg].concat(subArgs);
                }

                args[argInfo.fieldClass] = arg;
            }
        });

        if (invalidArg) {
            return null;
        } else {
            return args;
        }
    }

    private _checkTableArg(
        $input: JQuery,
        argInfo: ExtensionFieldInfo
    ): {valid: boolean, arg: number} {
        const nodeIndex: number = this._getNodeIndex($input);
        const typeCheck: ExtensionTypeCheck = argInfo.typeCheck ||
        <ExtensionTypeCheck>{};
        if (nodeIndex == null) {
            if (typeCheck.allowEmpty) {
                return {
                    valid: true,
                    arg: undefined
                }
            }

            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { valid: false, arg: undefined };
        }
        // XXX TODO used to return XcTable, need update
        return {
            valid: true,
            arg: nodeIndex
        };
    }

    private _checkSubArgs(
        argInfo: ExtensionFieldInfo,
        $input: JQuery,
        args: object
    ): {valid: boolean, arg: any}[] {
        const subArgs: {valid: boolean, arg: any}[] = [];
        if (argInfo.variableArg !== true) {
            return subArgs;
        }

        let invalidArg: boolean = false;
        $input.closest(".field").find(".subArg").each((_i, el) => {
            const res: {valid: boolean, arg: any} = this._checkArg(argInfo, $(el), args);
            if (!res.valid) {
                invalidArg = true;
                return false;
            }
            subArgs.push(res.arg);
        });

        if (invalidArg) {
            return null;
        }
        return subArgs;
    }

    private _checkArg(
        argInfo: ExtensionFieldInfo,
        $input: JQuery,
        args: object
    ): {valid: boolean, arg: any} {
        const argType: string = argInfo.type;
        const typeCheck: ExtensionTypeCheck = argInfo.typeCheck || <ExtensionTypeCheck>{};
        let arg: any;

        if (argType === "boolean") {
            arg = $input.hasClass("checked");
            return {
                valid: true,
                arg: arg
            };
        }

        if (argType !== "string") {
            arg = $input.val().trim();
        } else {
            arg = $input.val(); // We cannot trim in this case
        }

        if (typeCheck.allowEmpty && arg.length === 0) {
            if (argType === "string") {
                return ({
                    "valid": true,
                    "arg": arg
                });
            } else {
                return ({
                    "valid": true,
                    "arg": undefined
                });
            }
        }

        if (arg === "") {
            StatusBox.show(ErrTStr.NoEmpty, $input);
            return { valid: false, arg: undefined };
        } else if (argType === "column") {
            // check in first round
            if (!xcHelper.hasValidColPrefix(arg)) {
                StatusBox.show(ErrTStr.ColInModal, $input);
                return { valid: false, arg: undefined };
            }

            arg = this._getColInfo(arg, typeCheck, $input, args);
            if (arg == null) {
                return { valid: false, arg: undefined };
            }
        } else if (argType === "number") {
            arg = Number(arg);

            if (isNaN(arg)) {
                StatusBox.show(ErrTStr.OnlyNumber, $input);
                return { valid: false, arg: undefined };
            } else if (typeCheck.integer && !Number.isInteger(arg)) {
                StatusBox.show(ErrTStr.OnlyInt, $input);
                return { valid: false, arg: undefined };
            } else if (typeCheck.min != null &&
                !isNaN(typeCheck.min) &&
                arg < typeCheck.min
            ) {
                const error: string = xcHelper.replaceMsg(ErrWRepTStr.NoLessNum, {
                    num: typeCheck.min
                });
                StatusBox.show(error, $input);
                return { valid: false, arg: undefined };
            } else if (typeCheck.max != null &&
                !isNaN(typeCheck.max) &&
                arg > typeCheck.max
            ) {
                const error: string = xcHelper.replaceMsg(ErrWRepTStr.NoBiggerNum, {
                    num: typeCheck.max
                });
                StatusBox.show(error, $input);
                return { valid: false, arg: undefined };
            }
        } else if (argType === "string") {
            if (typeCheck.newColumnName === true) {
                const nodeIndex = this._getAssociateNode(args, typeCheck);
                if (nodeIndex != null) {
                    const progCols: ProgCol[] = this.model.getColumns(nodeIndex).filter((col) => {
                        return col.getBackColName() === arg;
                    });
                    if (progCols.length > 0) {
                        const error: string = xcHelper.replaceMsg(ErrWRepTStr.ColConflictInNode, {
                            name: arg,
                            node: (nodeIndex + 1)
                        });

                        StatusBox.show(error, $input);
                        return { valid: false, arg: undefined };
                    }
                }
            } else if (typeCheck.newTableName === true) {
                // XXX TODO, in DF 2.0 should not have it
                if (!xcHelper.isValidTableName(arg)) {
                    StatusBox.show(ErrTStr.InvalidTableName, $input);
                    return { valid: false, arg: undefined };
                }
            } else if (typeCheck.newAggName === true) {
                arg = arg.startsWith(gAggVarPrefix)
                ? arg.substring(1) : arg;
                if (!xcHelper.isValidTableName(arg)) {
                    StatusBox.show(ErrTStr.InvalidAggName, $input);
                    return { valid: false, arg: undefined };
                }
                if (DagAggManager.Instance.hasOwnProperty(arg)) {
                    const error: string = xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        name: arg,
                        aggPrefix: gAggVarPrefix
                    });
                    StatusBox.show(error, $input);
                    return {valid: false, arg: undefined};
                }
            }
        }

        return {
            valid: true,
            arg: arg
        };
    }

    private _getColInfo(
        arg: string,
        typeCheck: ExtensionTypeCheck,
        $input: JQuery,
        args: object
    ): object {
        arg = arg.replace(/\$/g, '');

        const tempColNames: string[] = arg.split(",");
        const colLen: number = tempColNames.length;
        const cols: {name: string, type: ColumnType}[] = [];
        let validType: string[] = typeCheck.columnType;

        if (!typeCheck.multiColumn && colLen > 1) {
            StatusBox.show(ErrTStr.NoMultiCol, $input);
            return null;
        }

        if (validType != null && !(validType instanceof Array)) {
            validType = [validType];
        }

        for (let i = 0, len = colLen; i < len; i++) {
            let shouldCheck: boolean = true;
            const nodexIndex: number = this._getAssociateNode(args, typeCheck);
            if (nodexIndex == null) {
                // invalid table filed, not checking
                shouldCheck = false;
            }

            const colName: string = tempColNames[i].trim();
            if (shouldCheck) {
                const progCols: ProgCol[] = this.model.getColumns(nodexIndex);
                const progCol: ProgCol = progCols.filter((col) => {
                    return col.getBackColName() === colName
                })[0];
                if (progCol != null) {
                    const colType: ColumnType = progCol.getType();
                    let type: string = colType;
                    if (progCol.isNumberCol()) {
                        type = "number";
                    }

                    if (validType != null && validType.indexOf(type) < 0) {
                        const error: string = xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                            type1: validType.join(","),
                            type2: type
                        });
                        StatusBox.show(error, $input);
                        return null;
                    }

                    // XXX TODO: update it
                    // cols.push(new XcSDK.Column(backColName, colType));
                    cols.push({
                        name: progCol.getBackColName(),
                        type: colType
                    });
                } else {
                    const error: string = xcHelper.replaceMsg(ErrWRepTStr.InvalidColOnNode, {
                        col: colName,
                        node: (nodexIndex + 1)
                    });
                    StatusBox.show(error, $input);
                    return null;
                }
            } else {
                // when not do any checking
                // XXX TODO: update it
                // cols.push(new XcSDK.Column(colName));
                cols.push({
                    name: colName,
                    type: undefined
                });
            }
        }
        return {
            triggerColumn: typeCheck.multiColumn ? cols : cols[0]
        };
    }

    private _getAssociateNode(
        args: object,
        typeCheck: ExtensionTypeCheck
    ): number {
        let nodeIndex = typeCheck.tableField ?
        args[typeCheck.tableField] : this._getMainNode();
        return nodeIndex;
    }
}