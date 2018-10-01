class FilterOpPanel extends GeneralOpPanel {
    protected _dagNode: DagNodeFilter;
    private filterData: FilterOpPanelModel;
    protected _opCategories: number[] = [FunctionCategoryT.FunctionCategoryCondition];

    public constructor() {
        super();
        this._operatorName = "filter";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#filterOpPanel");

        this._$panel.find('.addFilterArg').click(function() {
            self.filterData.addGroup();
            self._scrollToGroup(self._$panel.find(".group").length - 1);
        });

        this._$panel.on('click', '.closeGroup', function() {
            const $group = $(this).closest('.group');
            const index = self._$panel.find(".group").index($group);
            self.filterData.removeGroup(index);
        });

        this._functionsInputEvents();

        // toggle filter and/or
        this._$panel.find(".andOrSwitch").click(function() {
            const wasAnd = $(this).hasClass("on");
            self.filterData.toggleAndOr(wasAnd);
            self._updateStrPreview(false, true);
        });
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    public show(node: DagNodeFilter, options?): boolean {
        if (super.show(node, options)) {
            this.filterData = new FilterOpPanelModel(node, () => {
                this._render();
            });
            super._panelShowHelper(this.filterData);
            this._render();
            return true;
        }
        return false;
    }

    protected _render(): void {
        const model = this.filterData.getModel();
        const self = this;

        const scrollTop = this._$panel.find(".opSection").scrollTop();
        self._resetForm();
        for (let i = 0; i < model.groups.length; i++) {
            let $group = this._$panel.find('.group').eq(i);
            if (!$group.length) {
                this._addFilterGroup();
                $group = this._$panel.find('.group').eq(i);
            }
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const $funcInput: JQuery = $group.find(".functionsInput");
            $funcInput.val(operator);
            $funcInput.data("value", operator.trim().toLowerCase());

            if (this._isOperationValid(i)) {
                self._updateArgumentSection(i);
            }

            const $args = $group.find(".arg").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg = model.groups[i].args[j].getValue();

                $args.eq(j).val(arg);
                if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                    if (arg === "true") {
                        $args.eq(j).closest(".row")
                                .find(".boolArgWrap .checkbox")
                                .addClass("checked");
                    }
                } else if (model.groups[i].args[j].checkIsEmptyString()) {
                    this._showEmptyOptions($args.eq(j));
                    $args.eq(j).closest(".row").find(".emptyStrWrap").click();
                }
            }
        }

        if (model.groups.length > 1) {
            self._$panel.find(".andOrToggle").show();
            if (model.andOrOperator === "or") {
                self._$panel.find(".andOrSwitch").removeClass("on");
            } else {
                self._$panel.find(".andOrSwitch").addClass("on");
            }
        } else {
            self._$panel.find(".andOrToggle").hide();
        }
        this._$panel.find(".opSection").scrollTop(scrollTop);
        this._$panel.find('.group').last().find('.functionsInput').focus();
        this._formHelper.refreshTabbing();
        this._checkIfStringReplaceNeeded(true);
    }

    private _functionsInputEvents() {
        const self = this;
        this._$panel.on("mousedown", ".functionsInput", function() {
            const $list = $(this).siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
            }
        });

        this._$panel.on("click", ".functionsInput", function() {
            const $input = $(this);
            const $list = $input.siblings('.list');
            if (!$list.is(':visible')) {
                self._hideDropdowns();
                self._$panel.find('li.highlighted')
                                .removeClass('highlighted');
                // show all list options when use icon to trigger
                $list.show().find('li').sort(self._sortHTML)
                                        .prependTo($list.children('ul'))
                                        .show();
                const fnInputNum = parseInt($input.data('fninputnum'));

                self._functionsListScrollers[fnInputNum]
                            .showOrHideScrollers();

            }
        });

        this._$panel.on("keydown", ".functionsInput", function(event) {
            const $input = $(this);
            if (event.which === keyCode.Enter || event.which ===
                keyCode.Tab) {
                const $li = $input.siblings(".list").find("li.highlighted");
                if ($li.length === 1) {
                    self._fnListMouseup(event, $li);
                    return false;
                }

                const value = $input.val().trim().toLowerCase();
                const prevValue = $input.data("value");
                $input.data("value", value);

                if (value === "") {
                    self._clearFunctionsInput($input.data('fninputnum'));
                    return;
                }
                $input.blur();
                self._hideDropdowns();

                if (prevValue === value && event.which === keyCode.Tab) {
                    return;
                }

                self._enterFunctionsInput($input.data('fninputnum'));
                // prevent modal tabbing
                return (false);
            } else if (event.which === keyCode.Escape) {
                self._hideDropdowns();
                return false;
            }
        });

        this._$panel.on("input", ".functionsInput", function() {
            self._suggest($(this));
        });

        this._$panel.on("change", ".functionsInput", function() {
            if (!self._allowInputChange) {
                return;
            }

            const $input = $(this);
            const value = $input.val().trim().toLowerCase();
            $input.data("value", value);

            // find which element caused the change event;
            const $changeTarg = gMouseEvents.getLastMouseDownTarget();

            // if change caused by submit btn, don't clear the input and
            // enterFunctionsInput() will do a check for validity
            const onChange = !$changeTarg.closest('.submit').length;

            self._enterFunctionsInput($input.data('fninputnum'), onChange);
        });

        // click icon to toggle functions list
        this._$panel.on('click', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            self._hideDropdowns();

            self._$panel.find('li.highlighted')
                        .removeClass('highlighted');
            // show all list options when use icon to trigger
            $list.show().find('li').sort(self._sortHTML)
                                    .prependTo($list.children('ul'))
                                    .show();
            $list.siblings('input').focus();

            const fnInputNum = parseInt($list.siblings('input')
                                            .data('fninputnum'));
            self._functionsListScrollers[fnInputNum].showOrHideScrollers();
        });

        this._$panel.on('mousedown', '.functionsList .dropdown', function() {
            const $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                self._allowInputChange = false;
            } else {
                self._allowInputChange = true;
            }
        });

        // only for category list and function menu list
        this._$panel.on({
            'mousedown': function() {
                // do not allow input change
                self._allowInputChange = false;
            },
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                self._fnListMouseup(event, $(this));
            }
        }, '.functionsList .list li');

        const $functionsList = this._$panel.find('.functionsList');
        let functionsListScroller = new MenuHelper($functionsList, {
            bounds: self._panelContentSelector,
            bottomPadding: 5
        });
        this._functionsListScrollers = [functionsListScroller];
    }

    protected _populateInitialCategoryField() {
        this._populateFunctionsListUl(0);
    }

    // map should not call this function
    protected _populateFunctionsListUl(groupIndex: number): void {
        const operatorsLists = this._getOperatorsLists();
        let html: HTML = "";
        operatorsLists.forEach((category: any[]) => {
            category.forEach((op) => {
                html += '<li class="textNoCap">' + op.displayName + '</li>';
            })
        });
        this._$panel.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }

    // suggest value for .functionsInput
    protected _suggest($input): void {
        const value: string = $input.val().trim().toLowerCase();
        const $list: JQuery = $input.siblings('.list');

        this._$panel.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        const $visibleLis: JQuery = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(this._sortHTML).prependTo($list.find('ul'));
        $visibleLis.eq(0).addClass('highlighted');

        const fnInputNum = parseInt($list.siblings('input')
                                        .data('fninputnum'));
        this._functionsListScrollers[fnInputNum].showOrHideScrollers();

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order
        for (let i = $visibleLis.length; i >= 0; i--) {
            const $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
    }

    // index is the argument group numbers
    protected _enterFunctionsInput(index: number, onChange?: boolean) {
        const func = $.trim(this._$panel.find('.group').eq(index)
                                      .find('.functionsInput').val());
        const operObj = this._getOperatorObj(func);
        if (!operObj) {
            if (!onChange) {
                this._showFunctionsInputErrorMsg(index);
            }
            this._clearFunctionsInput(index, onChange);
        } else {
            this.filterData.enterFunction(func, operObj, index);
            this._focusNextInput(index);
            this._scrollToGroup(index, true);
        }
    }

    protected _clearFunctionsInput(groupNum: number, keep?: boolean) {
        const $group = this._$panel.find('.group').eq(groupNum);
        const $input = $group.find(".functionsInput");
        if (!keep) {
            $input.val("").attr('placeholder', "");
        }
        const val = $input.val().trim();

        $group.find('.genFunctionsMenu').data('category', 'null');
        $group.find('.argsSection').last().addClass('inactive');
        $group.find(".argsSection").empty();
        $group.find('.descriptionText').empty();
        $group.find('.functionsInput').data("value", "");
        this._hideDropdowns();
        this.filterData.enterFunction(val, null, groupNum);
        this._checkIfStringReplaceNeeded(true);
    }

    protected _showFunctionsInputErrorMsg(groupNum) {
        let text = ErrTStr.NoSupportOp;
        let $target;
        groupNum = groupNum || 0;
        $target = this._$panel.find('.group').eq(groupNum)
                              .find(".functionsInput");

        if ($.trim($target.val()) === "") {
            text = ErrTStr.NoEmpty;
        }

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                                preventImmediateHide: true});
    }

    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex) {
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);
        const categoryNum = FunctionCategoryT.FunctionCategoryCondition;
        const category = FunctionCategoryTStr[categoryNum].toLowerCase();
        // const category = this._categoryNames[categoryNum];
        const func = $argsGroup.find('.functionsInput').val().trim();
        const ops = this._operatorsMap[categoryNum];
        const operObj = ops[func];

        const $argsSection = $argsGroup.find('.argsSection').last();
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);

        let defaultValue = ""; // to autofill first arg

        if ((GeneralOpPanel.firstArgExceptions[category] &&
            GeneralOpPanel.firstArgExceptions[category].indexOf(func) !== -1) ||
            groupIndex > 0)
        {
            // do not give default value if not the first group of args
            defaultValue = "";
        } else if (!this._isNewCol && this._colName) {
            if (this._isArgAColumn(this._colName)) {
                defaultValue = gColPrefix + this._colName;
            } else {
                defaultValue = "";
            }
        }

        const numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        this._addArgRows(numArgs, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue);

        const strPreview = this._filterArgumentsSetup(operObj);

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").remove();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        this._$panel.find('.strPreview')
                        .html('<b>' + OpFormTStr.CMD + ':</b> <br>' +
                                strPreview);
        this._checkIfStringReplaceNeeded(true);
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection: JQuery = $argsGroup.find('.argsSection').last();
        let argsHtml: HTML = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        self._suggestLists[groupIndex] = [];

        this._$panel.find('.list.hint.new').each(function() {
            const scroller = new MenuHelper($(this), {
                bounds: self._panelContentSelector,
                bottomPadding: 5
            });
            self._suggestLists[groupIndex].push(scroller);
            $(this).removeClass('new');
        });
    }

    // sets up the args generated by backend, not front end arguments
    protected _setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue)
    {
        let description;
        let typeId;
        let types;
        for (let i = 0; i < numArgs; i++) {
            if (operObj.argDescs[i]) {
                description = operObj.argDescs[i].argDesc;
                typeId = operObj.argDescs[i].typesAccepted;
            } else {
                description = "";
                const keyLen = Object.keys(DfFieldTypeT).length;
                typeId = Math.pow(2, keyLen + 1) - 1;
            }
            types = this._parseType(typeId);
            const $input = $rows.eq(i).find('.arg');

            if (i === 0) {
                $input.val(defaultValue);
            } else {
                $input.val("");
            }
            $input.data("typeid", typeId);

            // special case to ignore removing autoquotes from
            // function-like arguments if it is 2nd regex input
            if (operObj.displayName === "regex" && i === 1) {
                $input.data("nofunc", true);
            }

            const $row = $rows.eq(i);

            $row.find('.description').text(description + ':');

            // automatically show empty checkbox if optional detected
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.OptionalArg)
            {
                if (types.length === 1 && types[0] === ColumnType.boolean ||
                    (types.length === 2 &&
                        types.indexOf(ColumnType.boolean) > -1 &&
                        types.indexOf(ColumnType.undefined) > -1)) {
                    // one case is the "contains" function
                    this._addBoolCheckbox($input);
                } else {
                    this._showEmptyOptions($input);
                }
            } else {
                $row.addClass("required").find(".noArgWrap").remove();
            }

            if (types.indexOf(ColumnType.string) === -1) {
                $row.find('.emptyStrWrap').remove();
            }

            // add "addArg" button if *arg is found in the description
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.VariableArg ||
                (description.indexOf("*") === 0 &&
                description.indexOf("**") === -1)) {
                $input.addClass("variableArgs");
                $row.after(
                    '<div class="addArgWrap addArgWrapLarge">' +
                        '<button class="btn btn-rounded addArg addMapArg" data-typeid="' +
                            typeId + '">' +
                            '<i class="icon xi-plus"></i>' +
                            '<span class="text">ADD ANOTHER ARGUMENT</span>' +
                        '</button>' +
                        '</div>');
                if (description.indexOf("*") === 0 &&
                    description.indexOf("**") === -1) {
                    // default:coalesce or default:multijoin
                    const $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                 .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

    protected _filterArgumentsSetup(operObj) {
        const $rows = this._$panel.find('.row');
        const strPreview = this._operatorName + '(<span class="descArgs">' +
                            operObj.displayName + '(' +
                            $rows.eq(0).find(".arg").val() +
                        ')</span>)';
        return (strPreview);
    }

    protected _updateStrPreview(noHighlight?: boolean, andOrSwitch?: boolean) {
        const self = this;
        const $description = this._$panel.find(".strPreview");
        let $inputs = this._$panel.find(".arg");
        let tempText;
        let newText = "";
        const andOrIndices = [];


        const oldText = $description.find('.descArgs').text();
        const $groups = this._$panel.find(".group").filter(function() {
            return ($(this).find('.argsSection.inactive').length === 0);
        });
        const numGroups = $groups.length;
        let inputCount = 0;
        $groups.each(function(groupNum) {
            const funcName = $(this).find('.functionsInput').val().trim();
            if ($(this).find('.argsSection.inactive').length) {
                return;
            }

            if (groupNum > 0) {
                newText += ", ";
            }
            if (groupNum < numGroups - 1) {
                if (andOrSwitch) {
                    andOrIndices.push(newText.length);
                }
                if (self._$panel.find(".andOrSwitch").hasClass("on")) {
                    newText += "and(";
                } else {
                    newText += "or(";
                }
            }
            newText += funcName + "(";
            $inputs = $(this).find(".arg");

            let numNonBlankArgs = 0;
            $inputs.each(function() {
                const $input = $(this);
                const $row = $input.closest('.row');
                const noArgsChecked = ($row.find('.noArg.checked').length &&
                                    $row.find(".skipField").length) ||
                                    ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
                let val = $input.val();

                val = self._parseColPrefixes(self._parseAggPrefixes(val));

                if (noArgsChecked && val.trim() === "") {
                    // no quotes if noArgs and nothing in the input
                } else if (self._quotesNeeded[inputCount]) {
                    val = "\"" + val + "\"";
                } else if (self._isNoneInInput($input)) {
                    val = "None";
                }

                if ($input.data('casted')) {
                    const cols = val.split(",");
                    val = "";
                    for (let i = 0; i < cols.length; i++) {
                        if (i > 0) {
                            val += ", ";
                        }
                        val += xcHelper.castStrHelper(cols[i],
                                                    $input.data('casttype'));
                    }
                }

                if (numNonBlankArgs > 0) {
                    // check: if arg is blank and is not a string then do
                    // not add comma
                    // ex. add(6) instead of add(6, )
                    if (val === "") {
                        if (!noArgsChecked) {
                            val = ", " + val;
                        }
                    } else {
                        val = ", " + val;
                    }
                }
                if (!noArgsChecked || val.trim() !== "") {
                    numNonBlankArgs++;
                }

                newText += val;
                inputCount++;
            });
            newText += ")";
        });

        for (let i = 0; i < numGroups - 1; i++) {
            newText += ")";
        }

        tempText = newText;
        if (tempText.trim() === "") {
            $description.empty();
        } else if (noHighlight) {
            newText = this._wrapText(tempText);
            $description.find(".descArgs").html(newText);
        } else {
            const $spanWrap = $description.find(".descArgs");
            const $spans = $spanWrap.find('span.char');
            if (andOrSwitch) {
                this._modifyAndOrDescText(newText, andOrIndices, $spanWrap);
            } else {
                this._modifyDescText(oldText, newText, $spanWrap, $spans);
            }
        }

        return (tempText);
    }

    // protected _updateStrPreview2(noHighlight?: boolean, andOrSwitch?: boolean) {
    //     const self = this;
    //     const model = this.filterData.getModel();
    //     const $description = this._$panel.find(".strPreview");

    //     let tempText;
    //     let newText = "";
    //     const andOrIndices = [];


    //     const oldText = $description.find('.descArgs').text();
    //     const groups = model.groups;
    //     let inputCount = 0;

    //     // TODO: do not include empty groups, better check for quotes

    //     groups.forEach((group, i) => {
    //         const funcName: string = group.operator;
    //         if (i > 0) {
    //             newText += ", ";
    //         }
    //         if (i < groups.length - 1) {
    //             if (andOrSwitch) {
    //                 andOrIndices.push(newText.length);
    //             }
    //             newText += model.andOrOperator + "(";
    //         }
    //         newText += funcName + "(";

    //         group.args.forEach(arg => {
    //             let val: string = self._parseColPrefixes(self._parseAggPrefixes(arg.value));
    //             if (self._quotesNeeded[inputCount]) {
    //                 val = "\"" + val + "\"";
    //             }

    //             if (arg.cast) {
    //                 const cols = val.split(",");
    //                 val = "";
    //                 for (let i = 0; i < cols.length; i++) {
    //                     if (i > 0) {
    //                         val += ", ";
    //                     }
    //                     val += xcHelper.castStrHelper(cols[i], arg.cast);
    //                 }
    //             }
    //             if (arg.value !== "") {

    //             }
    //         });

    //         inputCount++;
    //     });




    //     // for (let i = 0; i < numGroups - 1; i++) {
    //     //     newText += ")";
    //     // }

    //     // tempText = newText;
    //     // if (tempText.trim() === "") {
    //     //     $description.empty();
    //     // } else if (noHighlight) {
    //     //     newText = this._wrapText(tempText);
    //     //     $description.find(".descArgs").html(newText);
    //     // } else {
    //     //     const $spanWrap = $description.find(".descArgs");
    //     //     const $spans = $spanWrap.find('span.char');
    //     //     if (andOrSwitch) {
    //     //         this._modifyAndOrDescText(newText, andOrIndices, $spanWrap);
    //     //     } else {
    //     //         this._modifyDescText(oldText, newText, $spanWrap, $spans);
    //     //     }
    //     // }

    //     // return (tempText);
    // }

    protected _getExistingTypes(groupNum) {
        const self = this;
        const existingTypes = {};
        let arg;
        let $input;
        let type;
        const $group = this._$panel.find('.group').eq(groupNum);
        const funcName = $group.find('.functionsInput').val().trim();

        if (funcName !== "eq" && funcName !== "neq") {
            return existingTypes;
        }

        $group.find(".arg").each(function() {
            $input = $(this);
            arg = $input.val().trim();
            type = null;

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                return;
            } else if (!$input.data("nofunc") && self._hasFuncFormat(arg)) {
                // skip
            } else if (xcHelper.hasValidColPrefix(arg)) {
                arg = self._parseColPrefixes(arg);
                type = self._getColumnTypeFromArg(arg);
            } else if (arg[0] === gAggVarPrefix) {
                // skip
            } else {
                const isString = self._formatArgumentInput(arg,
                                                $input.data('typeid'),
                                                existingTypes).isString;
                if (isString) {
                    type = "string";
                }
            }

            if (type != null) {
                existingTypes[type] = true;
            }
        });
        return (existingTypes);
    }

    protected _validate(): boolean {
        const self = this;
        if (this._isAdvancedMode()) {
            const error: {error: string} = this.filterData.validateAdvancedMode(this._editor.getValue());
            if (error != null) {
                StatusBox.show(error.error, this._$panel.find(".advancedEditor"));
                return false;
            }
        } else {
            const error = this.filterData.validateGroups();
            if (error) {
                const model = this.filterData.getModel();
                const groups = model.groups;
                const $input = this._$panel.find(".group").eq(error.group).find(".arg").eq(error.arg);
                switch (error.type) {
                    case ("function"):
                        self._showFunctionsInputErrorMsg(error.group);
                        break;
                    case ("blank"):
                        self._handleInvalidBlanks([$input]);
                        break;
                    case ("other"):
                        self._statusBoxShowHelper(error.error, $input);
                        break;
                    case ("columnType"):
                        let allColTypes = [];
                        let inputNums = [];
                        const group = groups[error.group];
                        for (var i = 0; i < group.args.length; i++) {
                            let arg = group.args[i];
                            if (arg.getType() === "column") {
                                let colType = self.filterData.getColumnTypeFromArg(arg.getFormattedValue());
                                let requiredTypes = self._parseType(arg.getTypeid());
                                allColTypes.push({
                                    inputTypes: [colType],
                                    requiredTypes: requiredTypes,
                                    inputNum: i
                                });
                                if (!arg.checkIsValid() && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                                    inputNums.push(i);
                                }
                            }
                        }
                        self._handleInvalidArgs(true, $input, error.error, error.group, allColTypes, inputNums);
                        break;
                    case ("valueType"):
                        self._handleInvalidArgs(false, $input, error.error);
                        break;
                    default:
                        console.warn("unhandled error found", error);
                        break;
                }
                return false;
            }
        }

        return true;
    }

    // hasMultipleSets: boolean, true if there are multiple groups of arguments
    // such as gt(a, 2) && lt(a, 5)
    protected _formulateFilterString(args, colTypeInfos,
                                        hasMultipleSets, andOr) {
        let str = "";
        let argNum;
        let argGroups = [];
        let colTypeGroups = [];
        if (!hasMultipleSets) {
            argGroups.push(args);
            colTypeGroups.push(colTypeInfos);
        } else {
            argGroups = args;
            colTypeGroups = colTypeInfos;
        }
        for (let i = 0; i < colTypeGroups.length; i++) {
            for (let j = 0; j < colTypeGroups[i].length; j++) {
                argNum = colTypeGroups[i][j].argNum;
                const colNames = argGroups[i][argNum].split(",");
                let colStr = "";
                for (let k = 0; k < colNames.length; k++) {
                    if (k > 0) {
                        colStr += ", ";
                    }
                    colStr += xcHelper.castStrHelper(colNames[k],
                                                    colTypeGroups[i][j].type);
                }
                argGroups[i][argNum] = colStr;
            }
        }

        // loop through groups
        for (let i = 0; i < argGroups.length; i++) {
            const fName = this._$panel.find('.group').eq(i)
                                            .find('.functionsInput').val()
                                            .trim();

            if (i > 0) {
                str += ", ";
            }
            if (i < argGroups.length - 1) {
                if (!andOr) {
                    andOr = "and";
                }
                str += andOr + "(";
            }
            str += fName + "(";

            let numNonBlankArgs = 0;
            // loop through arguments within a group
            for (let j = 0; j < argGroups[i].length; j++) {
                if (argGroups[i][j] !== "") {
                    str += argGroups[i][j] + ", ";
                    numNonBlankArgs++;
                }
            }
            if (numNonBlankArgs > 0) {
                str = str.slice(0, -2);
            }
            str += ")";
        }

        for (let i = 0; i < argGroups.length - 1; i++) {
            str += ")";
        }
        return (str);
    }

    protected _resetForm() {
        const self = this;
        super._resetForm();
        this._$panel.find(".andOrToggle").hide();
        this._$panel.find('.group').each(function(i) {
            if (i !== 0) {
                self._removeGroup($(this), true);
            }
        });
    }

    private _addFilterGroup() {
        const self = this;
        self._$panel.find(".andOrToggle").show();
        this._minimizeGroups();
        const newGroupIndex = this._$panel.find('.group').length;
        this._$panel.find('.group').last()
                        .after(this._getFilterGroupHtml(newGroupIndex));
        this._populateFunctionsListUl(newGroupIndex);
        this._fillInputPlaceholder();
        const functionsListScroller = new MenuHelper(
            this._$panel.find('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                bounds: self._panelContentSelector,
                bottomPadding: 5
            }
        );
        this._functionsListScrollers.push(functionsListScroller);
        this._suggestLists.push([]);// array of groups, groups has array of inputs
    }

    protected _removeGroup($group: JQuery, all?: boolean) {
        super._removeGroup($group, all);
        if (this._$panel.find(".group").length < 2) {
            this._$panel.find(".andOrToggle").hide();
        }
    }

    private _getFilterGroupHtml(index) {
        const html = '<div class="group filterGroup">' +
                        '<div class="catFuncHeadings clearfix subHeading">' +
                            '<div class="filterFnTitle">Filter Function</div>' +
                            '<div class="altFnTitle">No Function Chosen</div>' +
                            '<i class="icon xi-close closeGroup"></i>' +
                            '<i class="icon xi-minus minGroup"></i>' +
                        '</div>' +
                        '<div data-fnlistnum="' + index + '" ' +
                            'class="dropDownList firstList functionsList">' +
                            '<input data-fninputnum="' + index + '" ' +
                            'class="text inputable autocomplete functionsInput" ' +
                            'tabindex="10" spellcheck="false">' +
                            '<div class="iconWrapper dropdown">' +
                                '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list genFunctionsMenu">' +
                                '<ul data-fnmenunum="' + index + '"></ul>' +
                                '<div class="scrollArea top">' +
                                    '<i class="arrow icon xi-arrow-up"></i>' +
                                '</div>' +
                                '<div class="scrollArea bottom">' +
                                    '<i class="arrow icon xi-arrow-down"></i>' +
                                '</div>' +
                            '</div>' +
                        '</div>' +
                        '<div class="descriptionText">' +
                        '</div>' +
                        '<div class="argsSection inactive">' +
                        '</div>' +
                    '</div>';
        return (html);
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.filterData.switchMode(toAdvancedMode, this._editor);
    }
}