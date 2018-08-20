class GroupByOpPanel extends GeneralOpPanel {
    private _focusedColListNum: number;
    private _tableId: TableId;
    protected _dagNode: DagNodeGroupBy;
    private model: GroupByOpPanelModel;
    protected _opCategories: number[] = [FunctionCategoryT.FunctionCategoryAggregate];

    public constructor() {
        super();
        this._operatorName = "groupBy";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#groupByOpPanel");

        // adds field to group on input
         this._$panel.on("click", ".addGroupArg", function() {
            self.model.addGroupOnArg();
        });

        this._$panel.on('click', '.extraArg .xi-cancel', function() {
            const $row: JQuery = $(this).closest(".gbOnRow");
            const index: number = this._$panel.find(".gbOnRow").index($row);
            self.model.removeGroupOnArg(index);
        });

        this._$panel.on('click', '.closeGroup', function() {
            const $group = $(this).closest('.group');
            const index = self._$panel.find(".group").index($group);
            self.model.removeGroup(index);
        });

        this._functionsInputEvents();

        let argumentTimer;
        // .arg (argument input)
        this._$panel.on("input", ".arg", function(_event, options) {
            // Suggest column name
            const $input = $(this);
            if ($input.closest(".dropDownList")
                        .hasClass("colNameSection")) {
                // for new column name, do not suggest anything
                return;
            }

            if ($input.val() !== "" &&
                $input.closest('.inputWrap').siblings('.inputWrap')
                                            .length === 0) {
                // hide empty options if input is dirty, but only if
                // there are no sibling inputs from extra arguments
                self._hideEmptyOptions($input);
            }

            clearTimeout(argumentTimer);
            argumentTimer = setTimeout(function() {
                // XXX the first arg's list scroller won't be set up until
                // 2nd part of form is filled, need to fix
                if (options && options.insertText) {
                    return;
                }

                if (!$input.hasClass('gbOnArg')) {
                    self._argSuggest($input);
                }
                self._checkIfStringReplaceNeeded();
            }, 200);

            self._updateStrPreview();
            if (options && options.insertText) {
                self._checkIfStringReplaceNeeded();
            }
        });

        this._$panel.on("change", ".arg", argChange);

        function argChange() {
            const $input = $(this);

            const val = $input.val();
            const $group = $input.closest(".group")
            const groupIndex = self._$panel.find(".group").index($group);

            if ($input.closest(".colNameSection").length) {
                self.model.updateNewFieldName(val, groupIndex);
            } else if ($input.closest(".gbOnArg").length) {
                const argIndex = $group.find(".groupOnSection .arg").index($input);
                self.model.updateGroupOnArg(val, argIndex);
            } else {
                const argIndex = $group.find(".argsSection:not(.groupOnSection) .arg").index($input);
                self.model.updateArg(val, groupIndex, argIndex);
            }
        }

        // add filter arguments button
        this._$panel.find('.addGBGroup').click(function() {
            self.model.addGroup();
        });

        this._$panel.on('click', '.checkboxSection', function() {
            const $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass("checked");

             // incSample and keepInTable toggling
            if ($checkbox.closest('.gbCheckboxes').length) {

                if ($checkbox.hasClass('checked')) {
                    $checkbox.closest('.checkboxSection').siblings()
                            .find('.checkbox').removeClass('checked');
                }

                const isIncSample = self._$panel.find('.incSample .checkbox')
                                                  .hasClass('checked');
                if (isIncSample) {
                    self._$panel.find(".groupByColumnsSection")
                                   .removeClass("xc-hidden");
                } else {
                    self._$panel.find(".groupByColumnsSection")
                                   .addClass("xc-hidden");
                }
            }
            self._checkIfStringReplaceNeeded();
        });

        // for group by advanced options
        this._$panel.find('.advancedTitle').click(function() {
            const $advancedSection = $(this).closest(".advancedSection");
            if ($advancedSection.hasClass('collapsed')) {
                $advancedSection.addClass('expanded').removeClass('collapsed');
            } else {
                $advancedSection.addClass('collapsed').removeClass('expanded');
            }
        });

        this._$panel.on("click", ".distinct", function() {
            const $checkbox = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
        });

        this._$panel.on("click", ".groupByAll", function() {
            const $checkbox = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                self._$panel.find(".gbOnRow").hide();
                self._$panel.find(".addGroupArg").hide();
            } else {
                self._$panel.find(".gbOnRow").show();
                self._$panel.find(".addGroupArg").show();
            }
            self._formHelper.refreshTabbing();
            self._checkIfStringReplaceNeeded();
        });

        // used only for groupby columns to keep
        this._$panel.find('.columnsWrap').on('click', 'li', function(event) {
            const $li = $(this);
            const colNum = $li.data("colnum");
            let toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }

            if (event.shiftKey && self._focusedColListNum != null) {
                const start = Math.min(self._focusedColListNum, colNum);
                const end = Math.max(self._focusedColListNum, colNum);

                for (let i = start; i <= end; i++) {
                    if (toHighlight) {
                        self._selectCol(i);
                    } else {
                        self._deselectCol(i);
                    }
                }
            } else {
                if (toHighlight) {
                    self._selectCol(colNum);
                } else {
                    self._deselectCol(colNum);
                }
            }

            self._focusedColListNum = colNum;
        });

        this._$panel.find('.selectAllCols').on('click', function() {
            const $checkbox = $(this);
            const $cols = self._$panel.find(".cols");

            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $cols.find('li').removeClass('checked')
                     .find('.checkbox').removeClass('checked');
            } else {
                $checkbox.addClass('checked');
                $cols.find('li').addClass('checked')
                      .find('.checkbox').addClass('checked');
            }
            self._focusedColListNum = null;
        });
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    // prefill: object, used to prefill the form
    // public show = function(currTableId, currColNums, operator,
    //                                options) {
    public show(node: DagNodeGroupBy, options): boolean {
        if (this._formHelper.isOpen()) {
            return false;
        }

        const self = this;
        options = options || {};
        this._dagNode = node;


        this._operatorName = this._dagNode.getType().toLowerCase().trim();


        this._showPanel(this._operatorName);

        // XXX need reference to table or dag node

        this._resetForm();

        this._operationsViewShowListeners();

        // used for css class
        const opNameNoSpace = this._operatorName.replace(/ /g, "");
        const columnPicker = {
            "state": opNameNoSpace + "State",
            "colCallback": function($target) {
                const options: any = {};
                const $focusedEl = $(document.activeElement);
                if (($focusedEl.is("input") &&
                    !$focusedEl.is(self._$lastInputFocused)) ||
                    self._$lastInputFocused.closest(".semiHidden").length) {
                    return;
                }
                if (self._$lastInputFocused.closest(".row")
                                        .siblings(".addArgWrap").length
                    || self._$lastInputFocused.hasClass("variableArgs")) {
                    options.append = true;
                }
                xcHelper.fillInputFromCell($target, self._$lastInputFocused,
                                            gColPrefix, options);
                self._checkHighlightTableCols(self._$lastInputFocused);
                if (self._$lastInputFocused.hasClass("gbAgg")) {
                    self._autoGenNewGroupByName(self._$lastInputFocused);
                }
            }
        };
        this._formHelper.setup({"columnPicker": columnPicker});

        this._toggleOpPanelDisplay(false);
        this.model = new GroupByOpPanelModel(this._dagNode, () => {
            this._render();
        });

        super._panelShowHelper(this.model);
        this._populateGroupOnFields([]);
        this._formHelper.refreshTabbing();
        this._render();
    };

    public updateColumns() {
        super.updateColumns();
        if (!this._formHelper.isOpen()) {
            return;
        }

        const self = this;
        this._focusedColListNum = null;
        this._updateColNamesCache();


        const colsToKeep = [];
        this._$panel.find('.cols li.checked').each(function() {
            colsToKeep.push($(this).text());
        });
        const listHtml = this._getTableColList();
        this._$panel.find(".cols").html(listHtml);
        this._$panel.find(".selectAllCols").removeClass('checked');
        colsToKeep.forEach(function(colName) {
            const colNum = self._getColNum(colName);
            self._selectCol(colNum - 1);
        });
    }

    // functions that get called after list udfs is called during op view show
    protected _render() {
        const self = this;
        const model = this.model.getModel();
        //{
        // groupOnCols: string[],
        // groups: OpPanelFunctionGroup[],
        // includeSample: boolean,
        // icv: boolean,
        // groupAll: boolean,
        // }
        this._resetForm();

        const icv = model.icv;
        const includeSample = model.includeSample;
        const groupAll = model.groupAll;

        for (let i = 0; i < model.groupOnCols.length; i++) {
            if (i > 0) {
                this._addGroupOnArg(0);
            }
            const name = model.groupOnCols[i];
            this._$panel.find('.gbOnArg').last().val(gColPrefix + name);
            this._checkHighlightTableCols(this._$panel.find('.gbOnArg').last());
        }
        this._$panel.find('.gbOnArg').last().blur();

        for (let i = 0; i < model.groups.length; i++) {
            if (i > 0) {
                this._addGroupbyGroup();
            }
            const $group = this._$panel.find('.group').eq(i);
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const operObj = self._getOperatorObj(operator);
            if (!operObj) {
                return;
            }

            const $funcInput: JQuery = $group.find(".functionsInput");
            $funcInput.val(operator);
            $funcInput.data("value", operator.trim().toLowerCase());

            if (this._isOperationValid(i)) {
                self._updateArgumentSection(i);
            }

            const $args = $group.find(".argsSection:not(.groupOnSection) .arg").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });

            for (let j = 0; j < model.groups[i].args.length; j++) {
                let arg = model.groups[i].args[j].getValue();
                if ($args.eq(j).length) {
                    $args.eq(j).val(arg);
                    if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                        if (arg === "true") {
                            $args.eq(j).closest(".row")
                                    .find(".boolArgWrap .checkbox")
                                    .addClass("checked");
                        }
                    }
                } else {
                    if ($group.find(".addArgWrap").length) {
                        $group.find(".addArg").last().click(); // change this
                        $group.find(".arg").filter(function() {
                            return $(this).closest(".colNameSection")
                                        .length === 0;
                        }).last().val(arg);
                    } else {
                        break;
                    }
                }
            }
            $group.find(".resultantColNameRow .arg")
                  .val(model.groups[i].newFieldName);
        }

        if (icv) {
            this._$panel.find(".icvMode .checkbox").addClass("checked");
        }

        if (includeSample) {
            this._$panel.find(".incSample .checkbox").addClass("checked");
        }

        if (groupAll) {
            this._$panel.find(".groupByAll .checkbox").click();
        }

        self._checkIfStringReplaceNeeded(true);
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
            bounds: self._panelSelector,
            bottomPadding: 5
        });
        this._functionsListScrollers = [functionsListScroller];
    }

    private _populateGroupOnFields(colNums) {
        for (let i = 0; i < colNums.length; i++) {
            const progCol = this._table.getCol(colNums[i]);
            if (!progCol.isNewCol) {
                if (i > 0) {
                    this._addGroupOnArg(0);
                }
                const name = progCol.getFrontColName(true);
                this._$panel.find('.gbOnArg').last().val(gColPrefix + name);
                this._checkHighlightTableCols(this._$panel.find('.gbOnArg').last());
            }
        }
        this._$panel.find('.gbOnArg').last().blur();
    }

    protected _populateInitialCategoryField() {
        this._populateFunctionsListUl(0);
    }

    protected _populateFunctionsListUl(groupIndex) {
        const categoryIndex = FunctionCategoryT.FunctionCategoryAggregate;
        const ops = this._operatorsMap[categoryIndex];
        let html: HTML = "";
        for (let i = 0, numOps = ops.length; i < numOps; i++) {
            html += '<li class="textNoCap">' + ops[i].displayName + '</li>';
        }
        this._$panel.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }
    protected _updateColNamesCache() {
        // this.colNamesCache = xcHelper.getColNameMap(tableId);
    }

    //suggest value for .functionsInput
    protected _suggest($input) {
        const value = $input.val().trim().toLowerCase();
        const $list = $input.siblings('.list');

        this._$panel.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        const $visibleLis = $list.find('li').filter(function() {
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
            this.model.enterFunction(func, operObj, index);
            this._focusNextInput(index);
        }
    }

    protected _clearFunctionsInput(groupNum, keep?: boolean) {
        const $argsGroup = this._$panel.find('.group').eq(groupNum);
        const $input = $argGroup.find(".functionsInput");
        if (!keep) {
            $argsGroup.find('.functionsInput')
                      .val("").attr('placeholder', "");
        }
        const val = $input.val().trim();

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').last().addClass('inactive');
        $argsGroup.find('.argsSection').last().empty();
        this._$panel.find('.gbCheckboxes').addClass('inactive');
        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find(".advancedSection").addClass("inactive");
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data("value", "");
        this._hideDropdowns();
        this.model.enterFunction(val, null, groupNum);
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
        const categoryNum = FunctionCategoryT.FunctionCategoryAggregate;
        const func = $argsGroup.find('.functionsInput').val().trim();
        const ops = this._operatorsMap[categoryNum];

        const operObj = ops.find((op) => {
            return op.displayName === func;
        });

        const $argsSection = $argsGroup.find('.argsSection').last();
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);

        this._$panel.find(".advancedSection").removeClass("inactive");
        this._$panel.find('.icvMode').removeClass('inactive');
        this._$panel.find('.gbCheckboxes').removeClass('inactive');

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs + 1;

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows);

        const strPreview = this._groupByArgumentsSetup(numArgs, operObj, $rows);
        numArgs += 2;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        const $strPreview = this._$panel.find('.strPreview');
        if ($strPreview.text() === "") {
            const initialText = '<b class="prevTitle">' + OpFormTStr.CMD +
                               ':<br></b>' +
                               '<span class="aggColSection"></span>' +
                               'GROUP BY (' +
                     '<span class="groupByCols"></span>)';
            $strPreview.html(initialText);
        }
        $strPreview.find(".aggColSection").append(strPreview);

        this._formHelper.refreshTabbing();
        const noHighlight = true;
        this._checkIfStringReplaceNeeded(noHighlight);
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection = $argsGroup.find('.argsSection').last();
        let argsHtml: HTML = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        this._suggestLists[groupIndex] = [];
        if (groupIndex === 0) {
            this._$panel.find('.hint').addClass('new');
        }

        this._$panel.find('.list.hint.new').each(function() {
            const scroller = new MenuHelper($(this), {
                bounds: self._panelSelector,
                bottomPadding: 5
            });
            self._suggestLists[groupIndex].push(scroller);
            $(this).removeClass('new');
        });
    }


   // sets up the args generated by backend, not front end arguments
    protected _setupBasicArgInputsAndDescs(numArgs, operObj, $rows) {
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

            $input.val("");

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
                    const $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

    private _autoGenNewGroupByName($aggArg) {
        const $argSection = $aggArg.closest(".argsSection");
        const $newColName = $argSection.find(".colNameSection .arg");
        if ($newColName.hasClass("touched")) {
            // when user have touched it, don't autoRename
            return;
        }

        const fnName = $argSection.closest(".groupbyGroup")
                                .find(".functionsList input").val();
        let autoGenColName = $aggArg.val().trim();
        if (xcHelper.hasValidColPrefix(autoGenColName)) {
            autoGenColName = this._parseColPrefixes(autoGenColName);
        }
        autoGenColName = xcHelper.parsePrefixColName(autoGenColName).name;
        autoGenColName = this._getAutoGenColName(autoGenColName + "_" + fnName);
        autoGenColName = xcHelper.stripColName(autoGenColName);

        $argSection.find(".colNameSection .arg").val(autoGenColName);
    }

    private _groupByArgumentsSetup(numArgs, operObj, $rows) {
        // agg input
        const $gbOnRow = $rows.eq(0);
        $gbOnRow.find(".arg").addClass("gbAgg").focus();
        $gbOnRow.before('<div class="row checkboxWrap distinct">' +
            '<div class="text">Distinct ' +
                '<i class="hint qMark icon xi-unknown new" ' +
                xcTooltip.Attrs + ' data-original-title="' +
                TooltipTStr.Distinct + '"></i>' +
            '</div>' +
            '<div class="checkbox">' +
                '<i class="icon xi-ckbox-empty fa-11"></i>' +
                '<i class="icon xi-ckbox-selected fa-11"></i>' +
            '</div>' +
        '</div>');

        const description = OpFormTStr.NewColName + ":";
        // new col name field
        const $newColRow = $rows.eq(numArgs);
        const icon = xcHelper.getColTypeIcon(operObj.outputType);
        $newColRow.addClass("resultantColNameRow")
                .find(".dropDownList").addClass("colNameSection")
                .prepend('<div class="iconWrapper"><i class="icon ' + icon +
                       '"></i></div>')
                .end()
                .find(".description").text(description);

        $newColRow.find(".arg").on("change", function() {
            $(this).addClass("touched");
        });

        const strPreview = '<span class="aggColStrWrap">' + operObj.displayName + '(' +
                        '<span class="aggCols">' +
                            $rows.eq(1).find(".arg").val() +
                        '</span>' +
                        '), </span>';
        return (strPreview);
    }


    private _checkArgsHasCol(colName) {
        let found = false;
        this._$panel.find(".arg").each(function() {
            const $arg = $(this);
            if ($arg.data("colname") === colName) {
                found = true;
                return false;
            }
        });
        return found;
    }

    private _checkHighlightTableCols($input) {
        let arg = $input.val().trim();
        const prevColName = $input.data("colname");
        $input.data("colname", null);
        const $table = $("#xcTable-" + this._tableId);
        if (prevColName && !this._checkArgsHasCol(prevColName)) {
            const colNum = this._getColNum(prevColName);
            $table.find(".col" + colNum).removeClass("modalHighlighted");
        }

        // XXX fix this
        return;

        if (xcHelper.hasValidColPrefix(arg)) {
            arg = this._parseColPrefixes(arg);
            const colNum = this._table.getColNumByFrontName(arg);
            if (colNum > -1) {
                $input.data("colname", arg);
                $table.find(".col" + colNum).addClass("modalHighlighted");
            }
        }
    }

    private _getAutoGenColName(name) {
        const limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        let newName = name;

        let tries = 0;
        while (tries < limit && (this._table.hasCol(newName, "") ||
            this._checkColNameUsedInInputs(newName))) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    private _checkColNameUsedInInputs(name, $inputToIgnore?: JQuery) {
        name = xcHelper.stripColName(name);
        const $inputs = this._$panel.find(".resultantColNameRow")
                                      .find("input");
        let dupFound = false;
        $inputs.each(function() {
            if ($inputToIgnore && $(this).is($inputToIgnore)) {
                return;
            }
            const val = $(this).val();
            if (val === name) {
                dupFound = true;
                return false;
            }
        });
        return dupFound;
    }

    protected _updateStrPreview(noHighlight?: boolean) {
        const self = this;
        const $description = this._$panel.find(".strPreview");
        let tempText;
        let $groups;

        const $activeArgs = this._$panel.find(".group").filter(function() {
            return !$(this).find(".argsSection").last().hasClass("inactive");
        });
        if (!$activeArgs.length) {
            this._$panel.find('.strPreview').empty();
            return;
        }

        $groups = this._$panel.find(".group").filter(function() {
            return (!$(this).find('.argsSection.inactive').length);
        });

        const aggColNewText = [];
        $groups.each(function() {
            let aggCol = $(this).find('.argsSection').last()
                                        .find('.arg').eq(0).val().trim();
            aggCol = self._parseAggPrefixes(aggCol);
            aggCol = self._parseColPrefixes(aggCol);
            aggColNewText.push(aggCol);
        });

        const gbColOldText = $description.find(".groupByCols").text();
        let gbColNewText = "";
        const $args = this._$panel.find('.groupOnSection').find('.arg');
        $args.each(function() {
            if ($(this).val().trim() !== "") {
                gbColNewText += ", " + $(this).val().trim();
            }
        });
        if (gbColNewText) {
            gbColNewText = gbColNewText.slice(2);
        }

        gbColNewText = this._parseAggPrefixes(gbColNewText);
        gbColNewText = this._parseColPrefixes(gbColNewText);

        if (noHighlight) {
            let html = "";
            $groups.each(function(groupNum) {
                const fnName = $(this).find(".argsSection").last()
                                                        .data("fnname");
                html += '<span class="aggColStrWrap">' +fnName + '(<span class="aggCols">' +
                                self._wrapText(aggColNewText[groupNum]) +
                                '</span>), </span>';
            });

            $description.find(".aggColSection").html(html);

            gbColNewText = this._wrapText(gbColNewText);
            $description.find(".groupByCols").html(gbColNewText);
        } else {
            $groups.each(function(groupNum) {
                const $aggColWrap = $description.find(".aggCols").eq(groupNum);
                const $aggColSpans = $aggColWrap.find('span.char');
                const aggColOldText = $aggColWrap.text();

                self._modifyDescText(aggColOldText, aggColNewText[groupNum],
                                $aggColWrap, $aggColSpans);
            });
            const $gbColWrap = $description.find(".groupByCols");
            const $gbColSpans = $gbColWrap.find('span.char');
            this._modifyDescText(gbColOldText, gbColNewText, $gbColWrap,
                            $gbColSpans);
        }
        return (tempText);
    }

    protected _getExistingTypes(_groupNum) {
        return {};
    }

    protected _submitForm() {
        if (!this._validate()) {
            return false;
        }

        this.model.submit();
        this._closeOpSection();
        return true;
    }

    protected _validate(): boolean {
        const self = this;
        if (this._isAdvancedMode()) {
            const error: {error: string} = this.model.validateAdvancedMode(this._editor.getValue());
            if (error != null) {
                StatusBox.show(error.error, this._$panel.find(".advancedEditor"));
                return false;
            }
        } else {
            const error = this.model.validateGroups();
            if (error) {
                const model = this.model.getModel();
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
                                let colType = self.model.getColumnTypeFromArg(arg.getFormattedValue());
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
                        self._handleInvalidArgs(true, $input, error.error, error.arg, allColTypes, inputNums);
                        break;
                    case ("valueType"):
                        self._handleInvalidArgs(false, $input, error.error);
                        break;
                    case ("newField"):
                        StatusBox.show(error.error, this._$panel.find(".group").find(".colNameSection .arg"));
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


    // new column name duplication & validity check
    private _newColNameCheck() {
        const deferred = PromiseHelper.deferred();
        let $nameInput;
        let isPassing;
        const self = this;

        return PromiseHelper.resolve();// XXX skipping name checks

        this._$panel.find(".group").each(function() {
            const $group = $(this);
            const numArgs = $group.find('.arg').length;
            $nameInput = $group.find('.arg').eq(numArgs - 1);
            const checkOpts = {
                strictDuplicates: true,
                stripColPrefix: true
            };

            isPassing = !ColManager.checkColName($nameInput, self._tableId,
                                                null, checkOpts);
            // if (isPassing && !$activeOpSection.find('.joinBack .checkbox')
            //                 .hasClass('checked')) {
            //     if (!isEditMode) {
            //         isPassing = xcHelper.tableNameInputChecker(
            //                     $activeOpSection.find('.newTableName'));
            //     }

            // }
            if (!isPassing) {
                return false;
            } else if (self._checkColNameUsedInInputs($nameInput.val(), $nameInput)) {
                isPassing = false;
                const text = ErrTStr.NameInUse;
                self._statusBoxShowHelper(text, $nameInput);
                return false;
            }
        });

            // check new table name if join option is not checked

        if (isPassing) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
        return deferred.promise();
    }


    // returns an object that contains an array of formated arguments,
    // an object of each argument's column type
    // and a flag of whether all arguments are valid or not
    private _argumentFormatHelper(existingTypes, groupNum) {
        const self = this;
        const args = [];
        let isPassing = true;
        let colTypes;
        const allColTypes = [];
        let errorText;
        let $errorInput;
        const inputsToCast = [];
        let castText;
        let invalidNonColumnType = false; // when an input does not have a
        // a column name but still has an invalid type
        const $group = this._$panel.find('.group').eq(groupNum);
        if (this._$panel.find(".groupByAll .checkbox").hasClass("checked")) {
            args.push(undefined);
        }
        $group.find('.arg').each(function(inputNum) {
            const $input = $(this);
            // Edge case. GUI-1929

            const $row = $input.closest('.row');
            const noArgsChecked = $row.find('.noArg.checked').length > 0 ||
                                ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
            const emptyStrChecked = $row.find('.emptyStr.checked').length > 0;

            let arg = $input.val();
            let trimmedArg = arg.trim();
            // empty field and empty field is allowed
            if (trimmedArg === "") {
                if (noArgsChecked) {
                    if (self._isNoneInInput($input)) {
                        trimmedArg = "None";
                    }
                    args.push(trimmedArg);
                    return;
                } else if (emptyStrChecked) {
                    args.push('"' + arg + '"');
                    return;
                }
            }

            const typeid = $input.data('typeid');

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection") ||
                (!$input.data("nofunc") && self._hasFuncFormat(trimmedArg))) {
                arg = self._parseColPrefixes(trimmedArg);
            } else if (trimmedArg[0] === gAggVarPrefix) {
                arg = trimmedArg;
                // leave it
            } else if (xcHelper.hasValidColPrefix(trimmedArg)) {
                arg = self._parseColPrefixes(trimmedArg);
                if (!self._isEditMode) {
                    // if it contains a column name
                    // note that field like pythonExc can have more than one $col
                    // containsColumn = true;
                    const frontColName = arg;
                    const tempColNames = arg.split(",");
                    let backColNames = "";

                    for (let i = 0; i < tempColNames.length; i++) {
                        if (i > 0) {
                            backColNames += ",";
                        }
                        const backColName = self._getBackColName(tempColNames[i].trim());
                        if (!backColName) {
                            errorText = ErrTStr.InvalidOpNewColumn;
                            isPassing = false;
                            $errorInput = $input;
                            args.push(arg);
                            return;
                        }
                        backColNames += backColName;
                    }

                    arg = backColNames;

                    let types;
                    if (tempColNames.length > 1 &&
                        !$input.hasClass("variableArgs") &&
                        !$input.closest(".extraArg").length &&
                        !$input.closest(".row")
                                .siblings(".addArgWrap").length) {
                        // non group by fields cannot have multiple column
                        //  names;
                        allColTypes.push({});
                        errorText = ErrTStr.InvalidColName;
                        $errorInput = $input;
                        isPassing = false;
                    } else {
                        colTypes = self._getAllColumnTypesFromArg(frontColName);
                        types = self._parseType(typeid);
                        if (colTypes.length) {
                            allColTypes.push({
                                "inputTypes": colTypes,
                                "requiredTypes": types,
                                "inputNum": inputNum
                            });
                        } else {
                            allColTypes.push({});
                            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                                "name": frontColName
                            });
                            $errorInput = $input;
                            isPassing = false;
                        }
                    }

                    if (isPassing || inputsToCast.length) {
                        const isCasted = $input.data('casted');
                        if (!isCasted) {
                            const numTypes = colTypes.length;

                            for (let i = 0; i < numTypes; i++) {
                                if (colTypes[i] == null) {
                                    console.error("colType is null/col not " +
                                        "pulled!");
                                    continue;
                                }

                                errorText = self._validateColInputType(types,
                                                        colTypes[i], $input);
                                if (errorText != null) {
                                    isPassing = false;
                                    $errorInput = $input;
                                    inputsToCast.push(inputNum);
                                    if (!castText) {
                                        castText = errorText;
                                    }
                                    break;
                                }
                            }
                        }
                    }

                }
            } else if (!isPassing) {
                arg = trimmedArg;
                // leave it
            } else {
                // checking non column name args such as "hey" or 3, not $col1
                const checkRes = self._checkArgTypes(trimmedArg, typeid);

                if (checkRes != null && !invalidNonColumnType) {
                    isPassing = false;
                    invalidNonColumnType = true;
                    if (checkRes.currentType === "string" &&
                        self._hasUnescapedParens($input.val())) {
                        // function-like string found but invalid format
                        errorText = ErrTStr.InvalidFunction;
                    } else {
                        errorText = ErrWRepTStr.InvalidOpsType;
                        errorText = xcHelper.replaceMsg(errorText, {
                            "type1": checkRes.validType.join("/"),
                            "type2": checkRes.currentType
                        });
                    }

                    $errorInput = $input;
                } else {
                    const formatArgumentResults = self._formatArgumentInput(arg,
                                                        typeid,
                                                        existingTypes);
                    arg = formatArgumentResults.value;
                }
            }

            args.push(arg);
        });

        if (!isPassing) {
            let isInvalidColType;
            if (inputsToCast.length) {
                errorText = castText;
                isInvalidColType = true;
                $errorInput = $group.find(".arg").eq(inputsToCast[0]);
            } else {
                isInvalidColType = false;
            }
            self._handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                              allColTypes, inputsToCast);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    private _getColNum(backColName) {
        return this._table.getColNumByBackName(backColName);
    }


    private _save(operators, args, colTypeInfos) {
        // Current groupBy args has at least 3 arguments:
        // 1. agg col
        // 2. grouby col(cols)
        // 3. new col name

        const deferred = PromiseHelper.deferred();
        colTypeInfos = colTypeInfos || [];
        const gbArgs = [];
        const groupByCols = [];
        let gbCol;
        let colTypeInfo;
        const isGroupAll: boolean = this._$panel.find(".groupByAll .checkbox")
                                           .hasClass("checked");
        for (let i = 0; i < args[0].length - 2; i++) {
            gbCol = args[0][i].trim();
            if (groupByCols.indexOf(gbCol) === -1) {
                groupByCols.push({
                    colName: gbCol,
                    cast: null
                });
            }
            colTypeInfo = colTypeInfos[0] || [];
            colTypeInfo.forEach(function(colInfo) {
                if (colInfo.argNum === i) {
                    groupByCols[i].cast = colInfo.type;
                    return false;
                }
            });
        }

        const $groups = this._$panel.find('.group');
        const operatorsFound = {};
        for (let i = 0; i < args.length; i++) {
            const numArgs = args[i].length;
            const aggColIndex = numArgs - 2;
            const aggCol = args[i][aggColIndex];

            // avoid duplicate operator-aggCol pairs
            // using # as delimiter
            if (operatorsFound[operators[i] + "#" + aggCol]) {
                continue;
            }
            operatorsFound[operators[i] + "#" + aggCol] = true;

            gbArgs.push({
                operator: operators[i],
                sourceColumn: aggCol,
                destColumn: args[i][numArgs - 1],
                cast: null,
                isDistinct: $groups.eq(i).find(".distinct .checkbox")
                                        .hasClass("checked")
            });

            colTypeInfo = colTypeInfos[i] || [];

            colTypeInfo.forEach(function(colInfo) {
                if (colInfo.argNum === aggColIndex) {
                    gbArgs[i].cast = colInfo.type;
                    // stop looping
                    return false;
                }
            });
        }

        const isIncSample: boolean = this._$panel.find('.incSample .checkbox')
                                    .hasClass('checked');
        const icvMode: boolean = this._$panel.find(".icvMode .checkbox")
                                    .hasClass("checked");
        // const isJoin = this._$panel.find('.joinBack .checkbox')
        //                             .hasClass('checked');
        const colsToKeep = [];

        if (isIncSample) {
            this._$panel.find('.cols li.checked').each(function() {
                colsToKeep.push($(this).data("colnum"));
            });
        }

        const evals = [];

        for (let i = 0; i < gbArgs.length; i++) {
            let op = gbArgs[i].operator;
            op = op.slice(0, 1).toLowerCase() + op.slice(1);
            const evalStr = op + "(" + gbArgs[i].aggColName + ")";
            evals.push({
                "evalString": evalStr,
                "newField": gbArgs[i].newColName
            });
        }
        // XXX handle distinct and groupall
        this._dagNode.setParam({
            groupBy: groupByCols.map(function(colInfo) {
                return colInfo.colName;
            }),
            aggregate: <DagNodeGroupByInput["aggregate"]>gbArgs,
            includeSample: isIncSample,
            icv: icvMode,
            groupAll: isGroupAll
        });


        deferred.resolve();


        return deferred.promise();
    }

    private _groupByCheck(args, hasMultipleGroups) {
        const self = this;
        if (!hasMultipleGroups) {
            args = [args];
        }
        let isValid = true;
        this._$panel.find(".group").each(function(groupNum) {
            const numArgs = args[groupNum].length;
            const groupbyColName = args[groupNum][numArgs - 2];
            const singleArg = true;

            const $groupByInput = self._$panel.find(".group").eq(groupNum)
                                                .find('.argsSection').last()
                                                .find('.arg').eq(0);
            let isGroupbyColNameValid;
            if (!self._hasFuncFormat(groupbyColName)) {
                isGroupbyColNameValid = self._checkValidColNames($groupByInput,
                                                        groupbyColName, singleArg);
            } else {
                isGroupbyColNameValid = true;
            }

            if (!isGroupbyColNameValid) {
                isValid = false;
                return false;
            } else if (groupNum === 0) {
                let indexedColNames;
                let $input;
                let areIndexedColNamesValid = false;
                for (let i = 0; i < numArgs - 2; i++) {
                    indexedColNames = args[groupNum][i];
                    $input = self._$panel.find('.gbOnArg').eq(i);
                    areIndexedColNamesValid = self._checkValidColNames($input,
                                                            indexedColNames);
                    if (!areIndexedColNamesValid) {
                        break;
                    }
                }
                if (!areIndexedColNamesValid) {
                    isValid = false;
                    return false;
                }
            }
        });

        return isValid;
    }



    // used in groupby to check if inputs have column names that match any
    // that are found in gTables.tableCols
    private _checkValidColNames($input, colNames, single?: boolean) {
        let text;

        if (typeof colNames !== "string") {
            text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colNames
            });
            this._statusBoxShowHelper(text, $input);
            return (false);
        }
        const values = colNames.split(",");
        const numValues = values.length;
        if (single && numValues > 1) {
            text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colNames
            });
            this._statusBoxShowHelper(text, $input);
            return (false);
        }

        let value;
        let trimmedVal;
        for (let i = 0; i < numValues; i++) {
            value = values[i];
            trimmedVal = value.trim();
            if (trimmedVal.length > 0) {
                value = trimmedVal;
            }

            if (!this._table.hasColWithBackName(value)) {
                if (value.length === 2 && value.indexOf('""') === 0) {
                    text = ErrTStr.NoEmpty;
                } else {
                    text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                        "name": value.replace(/\"/g, '')
                    });
                }

                this._statusBoxShowHelper(text, $input);
                return (false);
            }
        }
        return (true);
    }


    // used for args with column names provided like $col1, and not "hey" or 3
    protected _validateColInputType(requiredTypes, inputType, $input) {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            if ($input.hasClass("gbOnArg")) {
                return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                    "type1": GeneralOpPanel.castMap[ColumnType.mixed].join("/"),
                    "type2": inputType
                });
            } else {
                return null;
            }
        } else if (requiredTypes.includes(inputType)) {
            return null;
        } else if (inputType === ColumnType.number &&
                    (requiredTypes.includes(ColumnType.float) ||
                     requiredTypes.includes(ColumnType.integer))) {
            return null;
        } else if (inputType === ColumnType.string &&
                    this._hasUnescapedParens($input.val())) {
            // function-like string found but invalid format
            return ErrTStr.InvalidFunction;
        } else {
            return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                "type1": requiredTypes.join("/"),
                "type2": inputType
            });
        }
    }

    protected _handleInvalidBlanks(invalidInputs) {
        const $input = invalidInputs[0];
        const hasEmptyOption = !$input.closest('.colNameSection').length &&
                            !$input.closest('.gbOnRow').length &&
                            (!$input.closest(".required").length ||
                                $input.closest(".row").find(".emptyStr").length);
        let errorMsg;
        if (hasEmptyOption) {
            this._showEmptyOptions($input);
            errorMsg = ErrTStr.NoEmptyOrCheck;
        } else {
            errorMsg = ErrTStr.NoEmpty;
        }
        this._statusBoxShowHelper(errorMsg, $input);
        this._formHelper.enableSubmit();
    }

    protected _resetForm() {
        const self = this;
        super._resetForm();

        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find('.gbCheckboxes').addClass('inactive');
        this._$panel.find(".advancedSection").addClass("inactive");
        this._$panel.find(".groupByColumnsSection").addClass("xc-hidden");
        const listHtml = this._getTableColList();
        this._$panel.find(".cols").html(listHtml);
        this._$panel.find(".selectAllCols")
                        .removeClass('checked');
        this._focusedColListNum = null;
        this._$panel.find('.group').each(function(i) {
            if (i !== 0) {
                self._removeGroup($(this), true);
            }
        });
    }

    private _getArgInputHtml(typeId?) {
        if (typeId == null) {
            typeId = -1;
        }
        const inputClass = "gbOnArg";
        const html =
            '<div class="row gbOnRow extraArg clearfix">' +
                '<div class="inputWrap">' +
                    '<div class="dropDownList">' +
                      '<input class="arg ' + inputClass +
                      '" type="text" tabindex="10" ' +
                        'spellcheck="false" data-typeid="' + typeId + '">' +
                      '<div class="list hint new">' +
                       '<ul></ul>' +
                        '<div class="scrollArea top">' +
                          '<i class="arrow icon xi-arrow-up"></i>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                          '<i class="arrow icon xi-arrow-down"></i>' +
                        '</div>' +
                     '</div>' +
                    '</div>' +
                    '<i class="icon xi-cancel"></i>' +
                '</div>' +
                '<div class="cast new">' +
                    '<span class="label">Cast: </span>' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list"></ul>' +
                    '</div>' +
                '</div>' +
            '</div>';
        return html;
    }

    private _getGroupbyGroupHtml(index) {
        const html =
        '<div class="group groupbyGroup">' +
            '<div class="catFuncHeadings clearfix subHeading">' +
              '<div class="groupbyFnTitle">' +
                'Function to apply to group:</div>' +
              '<div class="altFnTitle">Function to apply to group</div>' +
              '<i class="icon xi-close closeGroup"></i>' +
            '</div>' +
            '<div class="dropDownList firstList functionsList" ' +
                'data-fnlistnum="' + index + '">' +
              '<input class="text inputable autocomplete functionsInput" ' +
                    'data-fninputnum="' + index + '" tabindex="10" ' +
                    'spellcheck="false">' +
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
            '<div class="descriptionText"></div>' +
            '<div class="argsSection inactive"></div>' +
        '</div>';
        return html;
    }

    private _addGroupbyGroup() {
        const self = this;
        const newGroupIndex = this._$panel.find('.group').length;
        this._$panel.find('.group').last()
                        .after(this._getGroupbyGroupHtml(newGroupIndex));
        this._populateFunctionsListUl(newGroupIndex);

        const functionsListScroller = new MenuHelper(
            this._$panel.find('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                bounds: self._panelSelector,
                bottomPadding: 5
            }
        );

        this._functionsListScrollers.push(functionsListScroller);
        this._suggestLists.push([]);// array of groups, groups has array of inputs
        this._scrollToBottom();
        // $activeOpSection.find('.group').last().find('.functionsInput').focus();
        this._formHelper.refreshTabbing();
        if (this._$panel.find(".strPreview .aggColSection").length) {
            this._$panel.find(".strPreview .aggColSection").append('<span class="aggColStrWrap"></span>');
        } else {
            this._$panel.find(".strPreview").append('<span class="aggColStrWrap"></span>');
        }
    }

    private _addGroupOnArg(index) {
        const html = this._getArgInputHtml();
        const $group = this._$panel.find(".group").eq(index);
        $group.find('.gbOnRow').last().after(html);
        $group.find('.gbOnArg').last().focus();
        this._formHelper.refreshTabbing();

        const $ul = $group.find('.gbOnArg').last().siblings(".list");
        this._addSuggestListForExtraArg($ul);
        this._addCastDropDownListener();
    }

    private _getTableColList() {
        let html: HTML = "";
        const numBlanks = 10; // to take up flexbox space
        // const allCols = this._table.tableCols;
        const allCols = [];
        for (let i = 0; i < allCols.length; i++) {
            const progCol = allCols[i];
            if (progCol.isEmptyCol() || progCol.isDATACol()) {
                continue;
            }

            html += '<li data-colnum="' + i + '">' +
                        '<span class="text tooltipOverflow" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' +
                            xcHelper.escapeHTMLSpecialChar(
                                xcHelper.escapeHTMLSpecialChar(
                                progCol.getFrontColName(true))) + '">' +
                            xcHelper.escapeHTMLSpecialChar(
                                progCol.getFrontColName(true)) +
                        '</span>' +
                        '<div class="checkbox">' +
                            '<i class="icon xi-ckbox-empty fa-13"></i>' +
                            '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
                    '</li>';
        }
        for (let c = 0; c < numBlanks; c++) {
            html += '<div class="flexSpace"></div>';
        }
        return (html);
    }

    private _addSuggestListForExtraArg($ul) {
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($ul.closest('.group'));
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        const scroller = new MenuHelper($ul, {
            bounds: this._panelSelector,
            bottomPadding: 5
        });

        this._suggestLists[groupIndex].splice(argIndex, 0, scroller);
        $ul.removeClass('new');
    }

    private _selectCol(colNum) {
        const $colList = this._$panel.find(".cols");
        $colList.find('li[data-colnum="' + colNum + '"]')
                .addClass('checked')
                .find('.checkbox').addClass('checked');
        this._checkToggleSelectAllBox();
    }

    private _deselectCol(colNum) {
        const $colList = this._$panel.find(".cols");
        $colList.find('li[data-colnum="' + colNum + '"]')
                .removeClass('checked')
                .find('.checkbox').removeClass('checked');
        this._checkToggleSelectAllBox();
    }

    // if all lis are checked, select all checkbox will be checked as well
    private _checkToggleSelectAllBox() {
        const totalCols = this._$panel.find('.cols li').length;
        const selectedCols = this._$panel.find('.cols li.checked').length;
        if (selectedCols === 0) {
            this._$panel.find('.selectAllWrap').find('.checkbox')
                                              .removeClass('checked');
        } else if (selectedCols === totalCols) {
            this._$panel.find('.selectAllWrap').find('.checkbox')
                                              .addClass('checked');
        }
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.model.switchMode(toAdvancedMode, this._editor);
    }
}