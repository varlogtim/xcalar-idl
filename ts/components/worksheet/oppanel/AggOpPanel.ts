class AggOpPanel extends GeneralOpPanel {
    protected _dagNode: DagNodeAggregate;
    protected aggData: AggOpPanelModel;

    public constructor() {
        super();
        this._operatorName = "aggregate";
    }

    public setup(): void {
        const self = this;
        super.setupPanel("#aggOpPanel");

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

                self._argSuggest($input);
                self._checkIfStringReplaceNeeded();
            }, 200);

            if (options && options.insertText) {
                self._checkIfStringReplaceNeeded();
            }
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
    public show(node: DagNodeAggregate, options) {
        options = options || {};
        super.show(node, options);
        this._panelShowHelper();
        return PromiseHelper.resolve();
    };

  // functions that get called after list udfs is called during op view show
    protected _panelShowHelper() {
        const self = this;
        self.aggData = new AggOpPanelModel(this._dagNode, () => {
            self._render();
        });
        super._panelShowHelper(this.aggData);
        this._$panel.find('.functionsInput').focus();

        this._formHelper.refreshTabbing();

        const params: DagNodeAggregateInput = this._dagNode.getParam();
        const ops = [];
        const args = [];
        let opInfo = xcHelper.extractOpAndArgs(params.evalString);
        ops.push(opInfo.op);
        args.push(opInfo.args);

        for (let i = 0; i < ops.length; i++) {
            let $group = this._$panel.find('.group').eq(i);
            $group.find(".functionsInput").val(ops[i]).change();

            const paramArgs = args[i];
            const $args = $group.find(".arg:visible").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });
            for (let j = 0; j < paramArgs.length; j++) {
                let arg = formatArg(paramArgs[j]);

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
            if (!$changeTarg.closest('.submit').length &&
                !self._isOperationValid($input.data('fninputnum'))) {
                self._clearFunctionsInput($input.data('fninputnum'), true);
                return;
            }

            if ($input.val() !== "") {
                self._enterFunctionsInput($input.data('fninputnum'));
            }
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

    protected _populateInitialCategoryField() {
        this._functionsMap = {};
        this._categoryNames = [];
        const categoryIndex = FunctionCategoryT.FunctionCategoryAggregate;

        const categoryName = FunctionCategoryTStr[categoryIndex].toLowerCase();
        this._categoryNames.push(categoryName);
        const ops = this._operatorsMap[categoryIndex];
        this._functionsMap[0] = ops;

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
    protected _enterFunctionsInput(index) {
        index = index || 0;
        if (!this._isOperationValid(index)) {
            const $fnInput = this._$panel.find(".group").eq(index)
                                            .find(".functionsInput");
            let inputNum = this._$panel.find(".group").eq(index)
                            .find("input").index($fnInput);
            if (inputNum < 1) {
                inputNum = 0;
            }

            this._showFunctionsInputErrorMsg(inputNum, index);
            this._clearFunctionsInput(index);
            return;
        }

        this._updateArgumentSection(index);
        this._focusNextInput(index);
    }

    protected _clearFunctionsInput(groupNum, keep?: boolean) {
        const $argsGroup = this._$panel.find('.group').eq(groupNum);
        if (!keep) {
            $argsGroup.find('.functionsInput')
                      .val("").attr('placeholder', "");
        }

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').last().addClass('inactive');
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data("value", "");
        this._hideDropdowns();
        this._checkIfStringReplaceNeeded(true);
    }

    protected _showFunctionsInputErrorMsg(inputNum, groupNum) {
        let text = ErrTStr.NoSupportOp;
        let $target;

        inputNum = inputNum || 0;
        groupNum = groupNum || 0;
        $target = this._$panel.find('.group').eq(groupNum)
                                    .find('input').eq(inputNum);
        if ($.trim($target.val()) === "") {
            text = ErrTStr.NoEmpty;
        }

        StatusBox.show(text, $target, false, {"offsetX": -5,
                                                preventImmediateHide: true});
    }


    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    protected _updateArgumentSection(groupIndex) {
        let categoryNum;
        let func;
        const $argsGroup = this._$panel.find('.group').eq(groupIndex);

        categoryNum = 0;
        func = $argsGroup.find('.functionsInput').val().trim();

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

        let numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        const numInputsNeeded = numArgs + 1;

        this._addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        const $rows = $argsSection.find('.row');

        this._hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        this._setupBasicArgInputsAndDescs(numArgs, operObj, $rows, "");

        this._aggArgumentsSetup(numArgs, $rows);
        numArgs++;

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        const despText = operObj.fnDesc || "N/A";
        const descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' +
                    '<span class="instrText">' + despText + '</span>';

        $argsGroup.find('.descriptionText').html(descriptionHtml);

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
        let argsHtml: HTML = "";
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

    private _aggArgumentsSetup(numArgs, $rows) {
        const description = OpModalTStr.AggNameReq;

        $rows.eq(numArgs).addClass('resultantColNameRow')
                        .find('.dropDownList')
                        .addClass('colNameSection')
                        .end()
                        .find('.arg').val("")
                        .end()
                        .find('.description').text(description);

        const $nameInput = $rows.eq(numArgs).find('.arg');
        xcHelper.addAggInputEvents($nameInput);
    }

    protected _getExistingTypes(_groupNum) {
        return {};
    }

    protected _submitForm() {
        const self = this;
        const deferred = PromiseHelper.deferred();
        let isPassing = true;

        const $groups = this._$panel.find('.group');

        // check if function name is valid (not checking arguments)
        $groups.each(function(groupNum) {
            if (!self._isOperationValid(groupNum)) {
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
            const argFormatHelper = self._argumentFormatHelper({}, i);
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
            self._submitFinalForm(args, hasMultipleSets);
            deferred.resolve.apply(arguments);
        })
        .fail(deferred.reject)
        .always(function() {
            self._formHelper.enableSubmit();
        });

        return deferred.promise();
    }

    private _submitFinalForm(args, hasMultipleSets) {
        const self = this;
        const func = self._$panel.find('.functionsInput').val().trim();
        const funcLower = func;

        if (!this._aggregateCheck(args)) {
            return PromiseHelper.reject();
        }

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
    }

    // new column name duplication & validity check
    private _newColNameCheck() {
        const self = this;
        const deferred = PromiseHelper.deferred();

        return PromiseHelper.resolve();// XXX skipping name checks

        // Name input is always the 2nd input
        const $input = this._$panel.find('.arg').eq(1);
        let val = $input.val().trim();
        let errorTitle;
        let invalid = false;
        if (val.charAt(0) !== gAggVarPrefix) {
            errorTitle = xcHelper.replaceMsg(ErrWRepTStr.InvalidAggName, {
                "aggPrefix": gAggVarPrefix
            });
            invalid = true;
        } else if (!xcHelper.isValidTableName(val.substring(1))) {
            // test the value after gAggVarPrefix
            errorTitle = ErrTStr.InvalidAggName;
            invalid = true;
        } else if (val.length < 2) {
            errorTitle = xcHelper.replaceMsg(ErrWRepTStr.InvalidAggLength, {
                "aggPrefix": gAggVarPrefix
            });
            invalid = true;
        }

        if (invalid) {
            this._showInvalidAggregateName($input, errorTitle);
            deferred.reject();
        } else {
            // check duplicates
            val = val.slice(1); // remove prefix
            XcalarGetConstants(val)
            .then(function(ret) {
                if (ret.length) {
                    errorTitle = xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        "name": val,
                        "aggPrefix": gAggVarPrefix
                    });
                    self._showInvalidAggregateName($input, errorTitle);
                    deferred.reject();
                } else {
                    deferred.resolve();
                }
            })
            .fail(function() {
                deferred.resolve();
            });
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
                $errorInput = $group.find(".arg:visible").eq(inputsToCast[0]);
            } else {
                isInvalidColType = false;
            }
            self._handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                              allColTypes, inputsToCast);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    private _getColNum(_backColName) {
        return 1;
        // return this._table.getColNumByBackName(backColName);
    }

    private _aggregateCheck(args) {
        if (!this._hasFuncFormat(args[0])) {
            const aggColNum = this._getColNum(args[0]);
            if (aggColNum < 1) {
                this._statusBoxShowHelper(ErrTStr.InvalidColName,
                                this._$panel.find('.arg').eq(0));
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    private _save(aggrOp, args, colTypeInfos) {
        let argStr = args[0];
        const destName = args[1];
        if (colTypeInfos.length) {
            argStr = xcHelper.castStrHelper(args[0], colTypeInfos[0].type);
        }
        // XXX keep prefix and store
        this._dagNode.setParam({
            "evalString": aggrOp + "(" + argStr + ")",
            "dest": destName.slice(gAggVarPrefix.length)
        });
    }

    private _showInvalidAggregateName($input, errorTitle) {
        const $toolTipTarget = $input.parent();

        xcTooltip.transient($toolTipTarget, {
            "title": errorTitle,
            "placement": "right",
            "template": xcTooltip.Template.Error
        }, 4000);

        $input.click(hideTooltip);

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $input.off('click', hideTooltip);
        }
    }

     // used for args with column names provided like $col1, and not "hey" or 3
    protected _validateColInputType(requiredTypes, inputType, $input) {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            return null;
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

    // private _getColNumFromFunc(str) {
    //     // assume we're passing in a valid func
    //     const parenIndex = str.indexOf("(");
    //     str = str.slice(parenIndex + 1);
    //     const colName = "";
    //     const colNum = null;
    //     for (let i = 0; i < str.length; i++) {
    //         if (str[i] === "," || str[i] === " " || str[i] === ")") {
    //             break;
    //         } else {
    //             colName += str[i];
    //         }
    //     }
    //     if (colName.length) {
    //         colNum = this._getColNum(colName);
    //         if (colNum === -1) {
    //             colNum = null;
    //         }
    //     }
    //     return (colNum);
    // }

    protected _resetForm() {
        super._resetForm();
    }
}