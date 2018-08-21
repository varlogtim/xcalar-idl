class MapOpPanel extends GeneralOpPanel {
    // handles map, filter, group by, and aggregate forms

    private _filteredOperatorsMap = {};
    private _$categoryList;
    private _$functionsList: JQuery;
    private _$mapFilter;
    private _currentCol: any;
    protected _dagNode: DagNodeMap;
    protected model: MapOpPanelModel;
    protected _opCategories: number[] = [];
    private _pendingFnUpdate: any = null;

    public constructor() {
        super();
        this._operatorName = "map";

    }

    public setup(): void {
        const self = this;
        super.setupPanel("#mapOpPanel");
        this._$mapFilter = $("#mapFilter2");
        this._$categoryList = this._$panel.find('.categoryMenu');
        this._$functionsList = this._$panel.find('.functionsMenu');

        for (let i in this._operatorsMap) {
            if (parseInt(i) !== FunctionCategoryT.FunctionCategoryAggregate) {
                this._opCategories.push(parseInt(i));
            }
        }

        this._$panel.on('click', '.closeGroup', function() {
            const $group = $(this).closest('.group');
            const index = self._$panel.find(".group").index($group);
            self.model.removeGroup(index);
        });

        this._functionsInputEvents();

        let argumentTimer: number;
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
            argumentTimer = <any>setTimeout(function() {
                // XXX the first arg's list scroller won't be set up until
                // 2nd part of form is filled, need to fix
                if (options && options.insertText) {
                    return;
                }

                self._argSuggest($input);
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
            const argIndex = $group.find(".arg").index($input);
            if ($input.closest(".colNameSection").length) {
                self.model.updateNewFieldName(val, groupIndex);
            } else {
                self.model.updateArg(val, groupIndex, argIndex);
            }
        }


        // dynamic button - ex. default:multiJoin
        this._$panel.on('click', '.addMapArg', function() {
            self._addMapArg($(this));
        });

        this._$panel.on('click', '.extraArg .xi-cancel', function() {
            self._removeExtraArg($(this).closest('.extraArg'));
        });

        this._$panel.on('click', '.checkboxSection', function() {
            const $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass("checked");
            if ($(this).hasClass("icvMode")) {
                self.model.toggleICV($checkbox.hasClass("checked"));
            }
            self._checkIfStringReplaceNeeded();
        });
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    // prefill: object, used to prefill the form
    // public show = function(currTableId, currColNums, operator,
    //                                options) {
    public show(node: DagNodeMap) {
        const self = this;
        if (super.show(node)) {
            this.model = new MapOpPanelModel(this._dagNode, () => {
                this._render();
            });
            super._panelShowHelper(this.model);
            this._formHelper.refreshTabbing();
            this._render();

            $(document).on('mousedown.mapCategoryListener', function(e) {
                const $target = $(e.target);
                if (!$target.closest('.catFuncMenus').length &&
                    !$target.is(self._$mapFilter) &&
                    !$target.hasClass('ui-resizable-handle'))
                {
                    if (self._$categoryList.find('li.active').length &&
                        self._$functionsList.find('li.active').length === 0)
                    {
                        const val = self._$mapFilter.val();
                        const valTrimmed = val.trim();
                        if (valTrimmed.length || val.length === 0) {
                            self._filterTheMapFunctions(valTrimmed);
                        }
                    }
                }
            });
        }
    }

    public close() {
        super.close();
        $(document).off('mousedown.mapCategoryListener');
        if (this._pendingFnUpdate) {
            this._udfUpdateOperatorsMap();
        }
    }

    // functions that get called after list udfs is called during op view show
    protected _render() {
        const self = this;
        const model = this.model.getModel();

        this._$mapFilter.focus();

        this._resetForm();

        const $groups = this._$panel.find('.group')
        for (let i = 0; i < model.groups.length; i++) {
            let $group = $groups.eq(i);
            const operator: string = model.groups[i].operator;
            if (!operator) {
                continue;
            }

            const operObj = self._getOperatorObj(operator);
            if (!operObj) {
                return;
            }

            // self._$mapFilter.val(operator).trigger("input");
            $group.find(".categoryMenu").find("li").filter(function() {
                return $(this).data("category") === operObj.category;
            }).removeClass("active").click();

            let $li = $group.find(".functionsMenu").find("li").filter(function() {
                return $(this).text() === operator;
            });
            $li.siblings().removeClass("active");
            $li.addClass("active");
            self._updateArgumentSection(i, operObj);

            const $args = $group.find(".arg").filter(function() {
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

        if (model.icv) {
            this._$panel.find(".icvMode .checkbox").addClass("checked");
        }

        self._checkIfStringReplaceNeeded(true);
    }

    private _functionsInputEvents(): void {
        const self = this;

        this._$mapFilter.on('input', function() {
            const val = $(this).val();
            const valTrimmed = val.trim();
            if (valTrimmed.length || val.length === 0) {
                self._filterTheMapFunctions(valTrimmed);
            } else {
                // blank but with spaces, do nothing
            }
        });

        this._$mapFilter.on('keydown', function(event) {
            if (event.which === keyCode.Down ||
                event.which === keyCode.Up) {
                event.preventDefault();
                if (self._$categoryList.find('li.active').length === 0) {
                    self._$categoryList.find('li:visible').eq(0).click();
                    return;
                }
            }
            if (event.which === keyCode.Down) {
                self._$categoryList.find('li.active').nextAll('li:visible')
                                            .eq(0).click();
            } else if (event.which === keyCode.Up) {
                self._$categoryList.find('li.active').prevAll('li:visible')
                                            .eq(0).click();
            }

            if (event.which === keyCode.Enter) {
                if (self._$functionsList.find('li').length === 1) {
                    self._$functionsList.find('li:visible').eq(0).click();
                    event.preventDefault();
                }
            }

            // position the scrollbar
            const $activeLi = self._$categoryList.find('li.active');
            if (!$activeLi.length) {
                return;
            }
            const liTop = $activeLi.position().top;
            const liBottom = liTop + $activeLi.height();
            const categoryHeight = self._$categoryList.height();
            if (liBottom > (categoryHeight + 5) || liTop < -5) {
                const position = liTop + self._$categoryList.scrollTop();
                self._$categoryList.scrollTop(position - (categoryHeight / 2));
            }
        });

        this._$panel.find('.filterMapFuncArea .clear').mousedown(function(event) {
            if (self._$mapFilter.val() !== "") {
                self._$mapFilter.val("").trigger("input").focus();
                event.preventDefault(); // prevent input from blurring
                self.model.clearFunction(0);
            }
        });

        this._$categoryList.on('click', 'li', function() {
            const $li = $(this);
            if ($li.hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            $li.siblings().removeClass('active');
            $li.addClass('active');
            self._updateMapFunctionsList();
        });

        this._$functionsList.on('click', 'li', function() {
            if ($(this).hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            const $li = $(this);
            $li.siblings().removeClass('active');
            $li.addClass('active');
            const func = $li.text().trim();

            const operObj = self._getOperatorObj(func);
            self.model.enterFunction(func, operObj, 0);
            self._focusNextInput(0);
        });

        this._$functionsList.scroll(function() {
            xcTooltip.hideAll();
        });
    }

    public updateOperationsMap(listXdfsObj) {
        var fns = xcHelper.filterUDFs(listXdfsObj.fnDescs);
        this._pendingFnUpdate = fns;
        if (this._formHelper.isOpen()) {
            // only update once form is closed
            return;
        }
        this._udfUpdateOperatorsMap();
    };


    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument

    protected _populateInitialCategoryField() {
        this._functionsMap = {};
        this._categoryNames = [];
        let html = "";
        let categoryName;

        for (let i = 0; i < Object.keys(this._operatorsMap).length; i++) {
            if (FunctionCategoryTStr[i] === 'Aggregate functions') {
                continue;
            }

            categoryName = FunctionCategoryTStr[i].toLowerCase();
            const searchStr = " functions";
            const categoryNameLen = categoryName.length;
            if (categoryName.lastIndexOf(searchStr) ===
                (categoryNameLen - searchStr.length))
            {
                categoryName = categoryName.substring(0,
                                        categoryNameLen - searchStr.length);
            }
            this._categoryNames.push(categoryName);
            this._functionsMap[i] = this._operatorsMap[i];
            html += '<li data-category="' + i + '">' +
                        categoryName +
                    '</li>';
        }
        const $list = $(html);
        $list.sort(this._sortHTML.bind(this));
        this._$categoryList.html($list);
    }

    private _udfUpdateOperatorsMap() {
        const opArray = this._pendingFnUpdate;
        const udfCategoryNum = FunctionCategoryT.FunctionCategoryUdf;
        if (opArray.length === 0) {
            delete this._operatorsMap[udfCategoryNum];
            return;
        }

        opArray.sort(sortFn);

        function sortFn(a, b){
            return (a.displayName) > (b.displayName) ? 1 : -1;
        }

        this._operatorsMap[udfCategoryNum] = [];
        for (var i = 0; i < opArray.length; i++) {
            this._operatorsMap[udfCategoryNum].push(opArray[i]);
        }
        this._pendingFnUpdate = null;
    }

    protected _isOperationValid(groupIndex) {
        return this._$panel.find(".group").eq(groupIndex)
                           .find(".functionsMenu")
                           .find('li.active').length > 0;
    }

    protected _showFunctionsInputErrorMsg(_groupNum) {
        let $target = this._$functionsList.parent();
        let text = ErrTStr.NoEmpty;

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                            preventImmediateHide: true});
    }

    // // for map
    private _updateMapFunctionsList(filtered?: boolean) {
        let opsMap;
        if (!filtered) {
            const $li = this._$categoryList.find('.active');
            const categoryNum = $li.data('category');
            opsMap = {};
            if (this._$mapFilter.val().trim() !== "") {
                opsMap[categoryNum] = this._filteredOperatorsMap[categoryNum];
            } else {
                opsMap[categoryNum] = this._functionsMap[categoryNum];
            }
        } else {
            opsMap = this._filteredOperatorsMap;
        }
        const filterVal = this._$mapFilter.val().trim();
        let startsWith = "";
        let includes = "";
        let i;
        let li = "";

        for (const cat in opsMap) {
            const ops = opsMap[cat];
            if (!ops) {
                continue;
            }
            if (parseInt(cat) === FunctionCategoryT.FunctionCategoryUdf) {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '" data-container="body" ' +
                    'data-placement="right" data-toggle="tooltip" title="' +
                    ops[i].displayName + '">' + ops[i].displayName + '</li>';
                    if (filterVal &&
                        ops[i].displayName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            } else {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '">' + ops[i].displayName + '</li>';
                    if (filterVal &&
                        ops[i].displayName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            }
        }

        const $startsWith = $(startsWith);
        const $includes = $(includes);
        $startsWith.sort(this._sortHTML.bind(this));
        $includes.sort(this._sortHTML.bind(this));

        this._$functionsList.empty();
        this._$functionsList.append($startsWith);
        this._$functionsList.append($includes);

        this._$panel.find('.argsSection').addClass('inactive');
        this._$panel.find('.icvMode').addClass('inactive');
        this._$panel.find('.descriptionText').empty();
        this._$panel.find('.strPreview').empty();
    }

    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex, operObj) {
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);
        let categoryNum = operObj.category;
        let category = this._categoryNames[categoryNum];
        let func = operObj.fnName;

        const $argsSection = $argsGroup.find('.argsSection').last();
        const firstTime = !$argsSection.hasClass("touched");
        $argsSection.empty();
        $argsSection.addClass("touched");
        $argsSection.removeClass('inactive');
        $argsSection.data("fnname", operObj.displayName);
        this._$panel.find(".icvMode").removeClass('inactive');


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

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs + 1;// for new column name

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue);

        const strPreview = this._mapArgumentsSetup(numArgs, categoryNum, func, operObj);
        numArgs++;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

        this._$panel.find('.strPreview')
                    .html('<b>' + OpFormTStr.CMD + ':</b> <br>' +
                                strPreview);


        this._formHelper.refreshTabbing();

        this._checkIfStringReplaceNeeded(true);
        if ((this._$panel.find('.group').length - 1) === groupIndex) {
            const noAnim = (firstTime && groupIndex === 0);
            this._scrollToBottom(noAnim);
        }
    }

    protected _addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        const self = this;
        const $argsSection = $argsGroup.find('.argsSection').last();
        let argsHtml = "";
        for (let i = 0; i < numInputsNeeded; i++) {
            argsHtml += this._getArgHtml();
        }

        $argsSection.append(argsHtml);
        this._addCastDropDownListener();
        this._suggestLists[groupIndex] = [];

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
            } else if (!this._isUDF()) {
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

//  // sets up the last argument for map
    private _mapArgumentsSetup(numArgs, categoryNum, func, operObj) {
        const description = OpModalTStr.ColNameDesc + ":";
        const tempName = xcHelper.parsePrefixColName(this._colName).name;
        let autoGenColName;
        const $rows = this._$panel.find('.row');

        if (this._isEditMode && !this._colName) {
            autoGenColName = "";
        } else if (this._isNewCol && this._colName !== "" && this._currentCol) {
            autoGenColName = this._currentCol.getFrontColName();
            autoGenColName = xcHelper.stripColName(autoGenColName);
        } else {
            if (categoryNum === FunctionCategoryT.FunctionCategoryUdf) {
                autoGenColName = tempName + "_udf";
            } else {
                autoGenColName = tempName + "_" + func;
            }
            autoGenColName = xcHelper.stripColName(autoGenColName);
            autoGenColName = this._getAutoGenColName(autoGenColName);
        }

        const $row = $rows.eq(numArgs).addClass('resultantColNameRow');
        const icon = xcHelper.getColTypeIcon(operObj.outputType);

        $row.find('.dropDownList')
            .addClass('colNameSection')
            .prepend('<div class="iconWrapper"><i class="icon ' + icon +
                    '"></i></div>')
            .end()
            .find('.arg').val(autoGenColName)
            .end()
            .find('.description').text(description)
            .end()
            .find(".inputWrap");
        const strPreview =  this._operatorName + '(<span class="descArgs">' +
                        operObj.displayName +
                            '(' + $rows.eq(0).find(".arg").val() +
                            ')</span>)';
        return (strPreview);
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
        let $inputs = this._$panel.find('.arg');
        let tempText;
        let newText = "";
        let $groups;
        const oldText = $description.find('.descArgs').text();
        $groups = this._$panel.find(".group").filter(function() {
            return ($(this).find('.argsSection.inactive').length === 0);
        });
        const numGroups = $groups.length;
        let inputCount = 0;
        $groups.each(function(groupNum) {
            let funcName = self._$functionsList.find('.active').text().trim();
            if ($(this).find('.argsSection.inactive').length) {
                return;
            }

            if (groupNum > 0) {
                newText += ", ";
            }
            if (groupNum < numGroups - 1) {
                if (this._$panel.find(".switch").hasClass("on")) {
                    newText += "and(";
                } else {
                    newText += "or(";
                }
            }
            newText += funcName + "(";
            $inputs = $(this).find('.arg').not(":last");

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
            newText = self._wrapText(tempText);
            $description.find(".descArgs").html(newText);
        } else {
            const $spanWrap = $description.find(".descArgs");
            const $spans = $spanWrap.find('span.char');
            self._modifyDescText(oldText, newText, $spanWrap, $spans);
        }


        return (tempText);
    }

    private _isUDF() {
        return this._$functionsList.find(".active").data("category") ===
                                    FunctionCategoryT.FunctionCategoryUdf;
    }


    protected _getExistingTypes(groupNum) {
        const self = this;
        const existingTypes = {};
        let arg;
        let $input;
        let type;
        const $group = this._$panel.find('.group').eq(groupNum);
        const funcName = this._$functionsList.find('.active').text().trim();

        if (funcName !== "eq" && funcName !== "neq") {
            return existingTypes;
        }

        $group.find('.arg').each(function() {
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

    protected _resetForm(keepFilter?: boolean) {
        super._resetForm();
        if (!keepFilter) {
            this._$mapFilter.val("");
        }

        this._$functionsList.empty();
        this._$panel.find('.icvMode').addClass('inactive');
    }

    private _filterTheMapFunctions(val) {
        let categorySet;
        this._filteredOperatorsMap = {};
        const categoryNums = {};
        let fn;
        let firstCategoryNumFound;
        val = val.toLowerCase();

        for (let i in this._operatorsMap) {
            if (parseInt(i) === FunctionCategoryT.FunctionCategoryAggregate) {
                continue;
            }
            categorySet = this._operatorsMap[i];
            for (let j = 0; j < categorySet.length; j++) {
                fn = categorySet[j];
                if (fn.displayName.toLowerCase().indexOf(val) > -1) {
                    if (!this._filteredOperatorsMap[fn.category]) {
                        this._filteredOperatorsMap[fn.category] = [];
                    }
                    categoryNums[fn.category] = true;
                    this._filteredOperatorsMap[fn.category].push(fn);
                    if (firstCategoryNumFound == null) {
                        firstCategoryNumFound = fn.category;
                    }
                }
            }
        }

        if (firstCategoryNumFound != null) {
            this._$categoryList.find('li').addClass('filteredOut');
            for (const catId in categoryNums) {
                this._$categoryList.find('li[data-category="' + catId + '"]')
                            .removeClass('filteredOut');
            }

            this._updateMapFunctionsList(true);
        } else {
            this._$categoryList.find('li').addClass('filteredOut');
            this._$functionsList.find('li').addClass('filteredOut');
            this._$panel.find('.argsSection')
                    .addClass('inactive');
            this._$panel.find('.argsSection').empty();
            this._$panel.find('.icvMode').addClass('inactive');
            this._$panel.find('.descriptionText').empty();
            this._$panel.find('.strPreview').empty();
        }
        this._$categoryList.find('li').removeClass('active');
        if (Object.keys(categoryNums).length === 1) {
            this._$categoryList.find('li:visible').eq(0).addClass('active');
        }
    }

    private _addMapArg($btn) {
        const typeId = $btn.data("typeid");
        const html = this._getArgInputHtml(typeId);
        $btn.parent().before(html);
        $btn.parent().prev().find('.inputWrap').find('input').focus();
        this._formHelper.refreshTabbing();

        const $ul = $btn.parent().prev().find('.inputWrap').find(".list");
        this._addSuggestListForExtraArg($ul);
        this._addCastDropDownListener();
    }

    private _addSuggestListForExtraArg($ul) {
        const self = this;
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($ul.closest('.group'));
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        const scroller = new MenuHelper($ul, {
            bounds: self._panelSelector,
            bottomPadding: 5
        });

        this._suggestLists[groupIndex].splice(argIndex, 0, scroller);
        $ul.removeClass('new');
    }

    private _getArgInputHtml(typeId) {
        if (typeId == null) {
            typeId = -1;
        }
        const inputClass = "mapExtraArg";

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

    private _removeExtraArg($inputWrap) {
        const $allGroups = this._$panel.find('.group');
        const groupIndex = $allGroups.index($inputWrap.closest('.group'));
        const $ul = $inputWrap.find(".list");
        const argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        this._suggestLists[groupIndex].splice(argIndex, 1);
        const $input = $inputWrap.find(".arg");
        $input.val("");
        $inputWrap.remove();
        this._checkIfStringReplaceNeeded();
    }

    protected _switchMode(toAdvancedMode: boolean): {error: string} {
        return this.model.switchMode(toAdvancedMode, this._editor);
    }
}