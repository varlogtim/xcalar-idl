class MapOpPanel extends GeneralOpPanel {
    // handles map, filter, group by, and aggregate forms

    private _filteredOperatorsMap = {};
    private _$categoryList;
    private _$functionsList: JQuery;
    private _$mapFilter;
    private _currentCol: any;
    protected _dagNode: DagNodeMap;
    protected mapData: MapOpPanelModel;

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

        this._$panel.on('click', '.closeGroup', function() {
            self._removeGroup($(this).closest('.group'));
        });

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
            self._updateArgumentSection($li, 0);
            self._focusNextInput(0);
        });

        this._$functionsList.scroll(function() {
            xcTooltip.hideAll();
        });

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
    public show(node: DagNodeMap, options: any): XDPromise<any> {
        const self = this;
        options = options || {};
        super.show(node, options);
        const deferred = PromiseHelper.deferred();

        this._formHelper.addWaitingBG({
            heightAdjust: 20,
            transparent: true
        });
        this._disableInputs();
        UDF.list()
        .then(function(listXdfsObj) {
            const fns = xcHelper.filterUDFs(listXdfsObj.fnDescs);
            self._udfUpdateOperatorsMap(fns);
            self._panelShowHelper();
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Listing of UDFs failed", error.error);
            deferred.reject();
        });

        return (deferred.promise());
    };

    // functions that get called after list udfs is called during op view show
    protected _panelShowHelper() {
        const self = this;
        self.mapData = new MapOpPanelModel(this._dagNode, () => {
            self._render();
        });
        super._panelShowHelper(self.mapData);

        this._$mapFilter.focus();
        this._enableInputs();
        this._formHelper.removeWaitingBG();
        this._formHelper.refreshTabbing();

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

        let opInfo;
        let ops;
        let args;
        const params: DagNodeMapInput = this._dagNode.getParam();
        let newFields;
        let icv;

        opInfo = xcHelper.extractOpAndArgs(params.eval[0].evalString);
        ops = [opInfo.op];
        args = [opInfo.args];
        newFields = params.eval.map(function(item) {
            return item.newField;
        });
        icv = params.icv;

        this._$panel.find('.group').find(".argsSection").last().empty();

        for (let i = 0; i < ops.length; i++) {
            let $group: JQuery;

            self._$mapFilter.val(ops[i]).trigger("input");
            this._$panel.find(".functionsMenu").find("li").filter(function() {
                return $(this).text() === ops[i];
            }).click(); // triggers listing of argument inputs
            $group = this._$panel.find('.group').eq(i);

            const paramArgs = args[i];
            const $args = $group.find(".arg:visible").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });
            for (let j = 0; j < paramArgs.length; j++) {
                const arg = formatArg(paramArgs[j]);

                if ($args.eq(j).length) {
                    $args.eq(j).val(arg);
                    if ($args.eq(j).closest(".row").hasClass("boolOption")) {
                        if (arg === "true") {
                            $args.eq(j).closest(".row")
                                .find(".boolArgWrap .checkbox")
                                .addClass("checked");
                        }
                    }
                } else { // check if has variable arguments
                    if ($group.find(".addArgWrap").length) {
                        $group.find(".addArg").last().click();
                        $group.find(".arg").filter(function() {
                            return $(this).closest(".colNameSection")
                                        .length === 0;
                        }).last().val(arg);
                    } else {
                        break;
                    }
                }
            }

            $group.find(".resultantColNameRow .arg:visible")
                .val(newFields[i]);

        }

        if (icv) {
            this._$panel.find(".icvMode .checkbox").addClass("checked");
        }

        function formatArg(arg) {
            if (arg.indexOf("'") !== 0 && arg.indexOf('"') !== 0) {
                if (self._isArgAColumn(arg)) {
                    // it's a column
                    if (arg[0] !== gAggVarPrefix) {
                        // do not prepend colprefix if has aggprefix
                        arg = gColPrefix + arg;
                    }
                }
            } else {
                const quote = arg[0];
                if (arg.lastIndexOf(quote) === arg.length - 1) {
                    arg = arg.slice(1, -1);
                }
            }
            return arg;
        }

        self._checkIfStringReplaceNeeded(true);
    }


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

    private _udfUpdateOperatorsMap(opArray) {
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
        for (let i = 0; i < opArray.length; i++) {
            this._operatorsMap[udfCategoryNum].push(opArray[i]);
        }
    }

    protected _updateColNamesCache() {
        // this.colNamesCache = xcHelper.getColNameMap(tableId);
    }

    protected _isOperationValid() {
        return this._$functionsList.find('li.active').length > 0;
    }

    protected _showFunctionsInputErrorMsg(inputNum, groupNum) {
        let text = ErrTStr.NoSupportOp;
        let $target;
        if (inputNum === 0) {
            $target = this._$functionsList.parent();
            text = ErrTStr.NoEmpty;
        } else {
            inputNum = inputNum || 0;
            groupNum = groupNum || 0;
            $target = this._$panel.find('.group').eq(groupNum)
                                    .find('input').eq(inputNum);
            if ($.trim($target.val()) === "") {
                text = ErrTStr.NoEmpty;
            }
        }

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
    protected _updateArgumentSection($li, groupIndex) {
        let category;
        let categoryNum;
        let func;
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);

        if ($li) {
            categoryNum = $li.data('category');
            category = this._categoryNames[categoryNum];
            func = $li.text().trim();
        } else {
            categoryNum = 0;
            category = this._categoryNames[categoryNum];
            func = $argsGroup.find('.functionsInput').val().trim();
        }


        const ops = this._functionsMap[categoryNum];
        let operObj = null;

        for (let i = 0, numOps = ops.length; i < numOps; i++) {
            if (func === ops[i].displayName) {
                operObj = ops[i];
                break;
            }
        }

        const $argsSection = $argsGroup.find('.argsSection').last();
        const firstTime = $argsSection.html() === "";
        $argsSection.removeClass('inactive');
        $argsSection.empty();
        $argsSection.data("fnname", operObj.displayName);
        this._$panel.find('.icvMode').removeClass('inactive');


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

        const noHighlight = true;
        this._checkIfStringReplaceNeeded(noHighlight);
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
        let $inputs = this._$panel.find('.arg:visible');
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
            $inputs = $(this).find('.arg:visible').not(":last");

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

        $group.find('.arg:visible').each(function() {
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


    protected _submitForm() {
        const self = this;
        const deferred = PromiseHelper.deferred();
        let isPassing = true;

        const $groups = this._$panel.find('.group');

        // check if function name is valid (not checking arguments)
        $groups.each(function(groupNum) {
            if (!self._isOperationValid()) {
                const inputNum = 0;
                self._showFunctionsInputErrorMsg(inputNum, groupNum);
                isPassing = false;
                return false;
            }
        });

        if (!isPassing) {
            return PromiseHelper.reject();
        }

        const invalidInputs = [];

        if (!self._checkIfBlanksAreValid(invalidInputs)) {
            self._handleInvalidBlanks(invalidInputs);
            return PromiseHelper.reject();
        }

        const multipleArgSets = [];
        let args = [];
        // get colType first
        $groups.each(function(i) {
            if ($(this).find('.argsSection.inactive').length) {
                return (true);
            }
            const existingTypes = self._getExistingTypes(i);
            const argFormatHelper = self._argumentFormatHelper(existingTypes, i);
            isPassing = argFormatHelper.isPassing;

            if (!isPassing) {
                return false;
            }
            args = argFormatHelper.args;
            multipleArgSets.push(args);
        });

        if (!isPassing) {
            return PromiseHelper.reject();
        }

        this._formHelper.disableSubmit();

        // new column name duplication & validity check
        this._newColNameCheck()
        .then(function() {
            let hasMultipleSets = false;
            if (multipleArgSets.length > 1){
                args = multipleArgSets;
                hasMultipleSets = true;
            }
            return self._submitFinalForm(args, hasMultipleSets);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            self._formHelper.enableSubmit();
        });

        return deferred.promise();
    }

    private _submitFinalForm(args, hasMultipleSets) {
        const self = this;
        const deferred = PromiseHelper.deferred();
        const func = self._$functionsList.find('.active').text().trim();
        const funcLower = func;

        let colTypeInfos;
        if (hasMultipleSets) {
            colTypeInfos = [];
            for (let i = 0; i < args.length; i++) {
                colTypeInfos.push(self._getCastInfo(args[i], i));
            }
        } else {
            colTypeInfos = self._getCastInfo(args, 0);
        }

        this._save(funcLower, args, colTypeInfos);
        this._closeOpSection();

        return deferred.promise();
    }

    // new column name duplication & validity check
    private _newColNameCheck() {
        const deferred = PromiseHelper.deferred();
        let $nameInput;
        let isPassing;

        return PromiseHelper.resolve();// XXX skipping name checks

        $nameInput = this._$panel.find('.arg:visible').last();
        if (this._isNewCol && this._colName !== "" &&
            ($nameInput.val().trim() === this._colName)) {
            isPassing = true; // input name matches new column name
            // which is ok
        } else {

            // TODO: check name
            isPassing = true;
            // const checkOpts = {stripColPrefix: true,
            //     ignoreNewCol: this.isEditMode};
            // isPassing = !ColManager.checkColName($nameInput, this.tableId,
            //                                     null, checkOpts);
        }
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
        $group.find('.arg:visible').each(function(inputNum) {
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

                    // Since there is currently no way for users to specify what
                    // col types they are expecting in the python functions, we will
                    // skip this type check if the function category is user defined
                    // function.
                    if (!self._isUDF()) {
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
                    } else {
                        allColTypes.push({});
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
                $errorInput = $group.find(".arg:visible").eq(inputsToCast[0]);
            } else {
                isInvalidColType = false;
            }
            self._handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                              allColTypes, inputsToCast);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    private _save(operator, args, colTypeInfos) {
        const numArgs = args.length;
        const newColName = args.splice(numArgs - 1, 1)[0];
        const mapStr = this._formulateMapString(operator, args, colTypeInfos);
        const mapOptions = {
            formOpenTime: this._formHelper.getOpenTime()
        };
        if (this._isNewCol) {
            mapOptions["replaceColumn"] = true;
            if (this._colName === "") {
                const width = xcHelper.getTextWidth(null, newColName);
                mapOptions["width"] = width;
            }
        }

        const icvMode = this._$panel.find(".icvMode .checkbox")
                        .hasClass("checked");

        // XXX handle map options - replace column
        this._dagNode.setParam({
            "eval": [{"evalString": mapStr, "newField": newColName}],
            "icv": icvMode
        });
    }





    // hasMultipleSets: boolean, true if there are multiple groups of arguments
    // such as gt(a, 2) && lt(a, 5)
    private _formulateMapString(operator, args, colTypeInfos) {
        let str = "";
        let argNum;
        const argGroups = [];
        const colTypeGroups = [];

        argGroups.push(args);
        colTypeGroups.push(colTypeInfos);

        for (let i = 0; i < colTypeGroups.length; i++) {
            for (let j = 0; j < colTypeGroups[i].length; j++) {
                argNum = colTypeGroups[i][j].argNum;
                const colNames = argGroups[i][argNum].split(",");
                let colStr: string = "";
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
            const fName = operator;

            if (i > 0) {
                str += ", ";
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
        super._resetForm();
        this._$mapFilter.val("");
        this._$functionsList.empty();
        this._$panel.find('.icvMode').addClass('inactive');
    }

      // used to disable inputs while UDFS load
    private _disableInputs() {
        this._$panel.find('.strPreview, .submit, .opSection')
                        .addClass('tempDisabled');
    }
    private _enableInputs() {
        this._$panel.find('.tempDisabled').removeClass('tempDisabled');
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

    protected _closeOpSection() {
        super._closeOpSection();
        $(document).off('mousedown.mapCategoryListener');
    }
}