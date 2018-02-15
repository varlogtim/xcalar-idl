window.OperationsView = (function($, OperationsView) {
    // handles map, filter, group by, and aggregate forms

    var $operationsView; // $('#operationsView');
    var $categoryList; // for map $operationsView.find('.categoryMenu');
    var $functionsList; // for map $operationsView.find('.functionsMenu');
    var $genFunctionsMenu;   // $('.genFunctionsMenu'
    var $functionsUl;     // $genFunctionsMenu.find('ul')
    var $activeOpSection = $(); // $operationsView.find('.map or .filter or
                                //  .groupby etc')
    var currentCol;
    var colNum = "";
    var triggerColName = "";
    var colName = "";
    var colNamesCache = {};
    var isNewCol;
    var operatorName = ""; // group by, map, filter, aggregate, etc..
    var funcName = "";
    var operatorsMap = {};
    var filteredOperatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    var $lastInputFocused;
    var quotesNeeded = [];
    var aggNames = [];
    var suggestLists = [[]]; // groups of arguments
    var allowInputChange = true;
    var functionsListScrollers = [];
    var aggFunctionsListScroller;
    var tableId;
    var formHelper;
    var listMax = 30; // max length for hint list
    var focusedColListNum = null; // to track shift-clicking columns
    var isEditMode = false;
    var table;

    // shows valid cast types
    var castMap = {
        "string": [ColumnType.boolean, ColumnType.integer, ColumnType.float],
        "integer": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string],
        "float": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                  ColumnType.string],
        "number": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string],
        "boolean": [ColumnType.integer, ColumnType.float, ColumnType.string],
        "mixed": [ColumnType.boolean, ColumnType.integer, ColumnType.float,
                    ColumnType.string],
        // no valid cast options for: undefined, array, objects
    };

    // XXX can it be removed?
    // useful for debugging
    OperationsView.getOperatorsMap = function() {
        return (operatorsMap);
    };

    OperationsView.setup = function() {
        $operationsView = $('#operationsView');
        $genFunctionsMenu = $operationsView.find('.genFunctionsMenu');
        $functionsUl = $genFunctionsMenu.find('ul');

        $categoryList = $operationsView.find('.categoryMenu');
        $functionsList = $operationsView.find('.functionsMenu');

        // GENERAL LISTENERS, not inputs

        formHelper = new FormHelper($operationsView, {
            noEsc: true
        });

        var scrolling = false;
        var scrollTimeout;
        var scrollTime = 300;
        $operationsView.find('.mainContent').scroll(function() {
            if (!scrolling) {
                StatusBox.forceHide();// hides any error boxes;
                xcTooltip.hideAll();
                scrolling = true;
            }
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(function() {
                scrolling = false;
            }, scrollTime);
        });

        $operationsView.find('.cancel, .close').on('click', function() {
            closeOpSection();
        });

        $operationsView.on('click', '.closeGroup', function() {
            removeGroup($(this).closest('.group'));
            if ($operationsView.find(".filter .group").length < 2) {
                $operationsView.find(".andOrToggle").hide();
            }
        });

        $operationsView.on('click', '.minGroup', function() {
            minimizeGroups($(this).closest('.group'));
        });

        $operationsView.find('.submit').on('click', submitForm);


        // INPUT AND DROPDOWN LISTENERS

        // for map

        $('#mapFilter').on('input', function() {
            var val = $(this).val();
            var valTrimmed = val.trim();
            if (valTrimmed.length || val.length === 0) {
                filterTheMapFunctions(valTrimmed);
            } else {
                // blank but with spaces, do nothing
            }
        });

        $('#mapFilter').on('keydown', function(event) {
            if (event.which === keyCode.Down ||
                event.which === keyCode.Up) {
                event.preventDefault();
                if ($categoryList.find('li.active').length === 0) {
                    $categoryList.find('li:visible').eq(0).click();
                    return;
                }
            }
            if (event.which === keyCode.Down) {
                $categoryList.find('li.active').nextAll('li:visible')
                                               .eq(0).click();
            } else if (event.which === keyCode.Up) {
                $categoryList.find('li.active').prevAll('li:visible')
                                               .eq(0).click();
            }

            if (event.which === keyCode.Enter) {
                if ($functionsList.find('li').length === 1) {
                    $functionsList.find('li:visible').eq(0).click();
                    event.preventDefault();
                }
            }

            // position the scrollbar
            var $activeLi = $categoryList.find('li.active');
            if (!$activeLi.length) {
                return;
            }
            var liTop = $activeLi.position().top;
            var liBottom = liTop + $activeLi.height();
            var categoryHeight = $categoryList.height();
            if (liBottom > (categoryHeight + 5) || liTop < -5) {
                var position = liTop + $categoryList.scrollTop();
                $categoryList.scrollTop(position - (categoryHeight / 2));
            }
        });

        $operationsView.find('.filterMapFuncArea .clear').mousedown(
        function(event) {
            if ($('#mapFilter').val() !== "") {
                $('#mapFilter').val("").trigger("input").focus();
                event.preventDefault(); // prevent input from blurring
            }
        });

        $categoryList.on('click', 'li', function() {
            var $li = $(this);
            if ($li.hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            $li.siblings().removeClass('active');
            $li.addClass('active');
            updateMapFunctionsList();
        });

        // for map
        $functionsList.on('click', 'li', function() {
            if ($(this).hasClass('active')) {
                return; // do not update functions list if clicking on same li
            }
            var $li = $(this);
            $li.siblings().removeClass('active');
            $li.addClass('active');
            updateArgumentSection($li, 0);

            // focus on the next empty input
            var $nextInput;
            var $inputs = $activeOpSection.find('.group').eq(0)
                                          .find('.arg:visible');
            $inputs.each(function() {
                if ($(this).val().trim().length === 0) {
                    $nextInput = $(this);
                    return false;
                }
            });

            if (!$nextInput) {
                $nextInput = $inputs.last();
            }

            $nextInput.focus();
        });

        $functionsList.scroll(function() {
            xcTooltip.hideAll();
        });

        // .functionsInput used in filter, groupby, aggregate, not in map
        $operationsView.on({
            'mousedown': function() {
                var $list = $(this).siblings('.list');
                if (!$list.is(':visible')) {
                    hideDropdowns();
                }
            },
            'click': function() {
                var $input = $(this);
                var $list = $input.siblings('.list');
                if (!$list.is(':visible')) {
                    hideDropdowns();
                    $activeOpSection.find('li.highlighted')
                                    .removeClass('highlighted');
                    // show all list options when use icon to trigger
                    $list.show().find('li').sort(sortHTML)
                                           .prependTo($list.children('ul'))
                                           .show();
                    var fnInputNum = parseInt($input.data('fninputnum'));
                    if (operatorName === "filter" || operatorName === "group by") {
                        functionsListScrollers[fnInputNum]
                                    .showOrHideScrollers();
                    } else {
                        aggFunctionsListScroller.showOrHideScrollers();
                    }
                }
            },
            'keydown': function(event) {
                var $input = $(this);
                if (event.which === keyCode.Enter || event.which ===
                    keyCode.Tab) {
                    var $li = $input.siblings(".list").find("li.highlighted");
                    if ($li.length === 1) {
                        fnListMouseup(event, $li);
                        return false;
                    }

                    var value = $input.val().trim().toLowerCase();
                    var prevValue = $input.data("value");
                    $input.data("value", value);

                    if (value === "") {
                        clearFunctionsInput($input.data('fninputnum'));
                        return;
                    }
                    $input.blur();
                    hideDropdowns();

                    if (prevValue === value && event.which === keyCode.Tab) {
                        return;
                    }

                    enterFunctionsInput($input.data('fninputnum'));
                    // prevent modal tabbing
                    return (false);
                } else if (event.which === keyCode.Escape) {
                    hideDropdowns();
                    return false;
                }
            },
            'input': function() {
                suggest($(this));
            },
            'change': function() {
                if (!allowInputChange) {
                    return;
                }

                var $input = $(this);
                var value = $input.val().trim().toLowerCase();
                $input.data("value", value);

                // find which element caused the change event;
                var $changeTarg = gMouseEvents.getLastMouseDownTarget();

                // if change caused by submit btn, don't clear the input and
                // enterFunctionsInput() will do a check for validity
                if (!$changeTarg.closest('.submit').length &&
                    !isOperationValid($input.data('fninputnum'))) {
                    clearFunctionsInput($input.data('fninputnum'), true);
                    return;
                }

                if ($input.val() !== "") {
                    enterFunctionsInput($input.data('fninputnum'));
                }
            }
        }, '.functionsInput');


        $lastInputFocused = $operationsView.find('.arg:first');

        $operationsView.on('focus', '.arg', function() {
            $lastInputFocused = $(this);
            $(this).closest('.group').removeClass('minimized fnInputEmpty');
        });

        $operationsView.on('mouseup', '.group', function() {
            $(this).removeClass('minimized fnInputEmpty');
        });

        // click icon to toggle functions list

        $operationsView.on('click', '.functionsList .dropdown', function() {
            var $list = $(this).siblings('.list');
            hideDropdowns();

            $operationsView.find('li.highlighted')
                            .removeClass('highlighted');
            // show all list options when use icon to trigger
            $list.show().find('li').sort(sortHTML)
                                   .prependTo($list.children('ul'))
                                   .show();
            $list.siblings('input').focus();

            if (operatorName === "filter" || operatorName === "group by") {
                var fnInputNum = parseInt($list.siblings('input')
                                               .data('fninputnum'));
                functionsListScrollers[fnInputNum].showOrHideScrollers();
            } else {
                aggFunctionsListScroller.showOrHideScrollers();
            }
        });

        $operationsView.on('mousedown', '.functionsList .dropdown', function() {
            var $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                allowInputChange = false;
            } else {
                allowInputChange = true;
            }
        });

        // only for category list and function menu list
        $operationsView.on({
            'mousedown': function() {
                // do not allow input change
                allowInputChange = false;
            },
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                fnListMouseup(event, $(this));
            }
        }, '.functionsList .list li');

        // for all lists (including hint li in argument table)
        $operationsView.on({
            'mouseenter': function() {
                if ($(this).closest('.list').hasClass('disableMouseEnter')) {
                    $(this).closest('.list').removeClass('disableMouseEnter');
                    return;
                }
                $operationsView.find('li.highlighted')
                                .removeClass('highlighted');
                $(this).addClass('highlighted');
                $(this).closest('.list').addClass('hovering');
            },
            'mouseleave': function() {
                if ($(this).closest('.list').hasClass('disableMouseEnter')) {
                    return;
                }
                $(this).removeClass('highlighted');
                $(this).closest('.list').removeClass('hovering');
            }
        }, '.list li');

        // all inputs except functions input will either submit the form or
        // select a highlighted list element
        $operationsView.on("keypress", "input", function(event) {
            var $input = $(this);
            if (event.which !== keyCode.Enter ||
                $input.hasClass("functionsInput")) {
                // ignore function inputs
                return;
            }

            var $hintli = $input.siblings('.hint').find('li.highlighted');
            if ($hintli.length && $hintli.is(":visible")) {
                $hintli.click();
                return;
            }
            $(this).blur();
            submitForm();
        });

        var argumentTimer;

        // .arg (argument input)
        $operationsView.on({
            'keydown': function(event) {
                var $input = $(this);
                var $list = $input.siblings('.openList');
                if ($list.length && (event.which === keyCode.Up ||
                    event.which === keyCode.Down))
                {
                    var isArgInput = true;
                    formHelper.listHighlight($input, event, isArgInput);
                }
            },
            'focus': function() {
                hideDropdowns();
            },
            'input': function(event, options) {
                // Suggest column name
                var $input = $(this);
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
                    hideEmptyOptions($input);
                }

                clearTimeout(argumentTimer);
                argumentTimer = setTimeout(function() {
                    // XXX the first arg's list scroller won't be set up until
                    // 2nd part of form is filled, need to fix
                    if (options && options.insertText) {
                        return;
                    }
                    checkHighlightTableCols($input);

                    if (!$input.hasClass('gbOnArg')) {
                        argSuggest($input);
                    }

                    checkIfStringReplaceNeeded();
                }, 200);

                updateStrPreview();
                if (options && options.insertText) {
                    checkIfStringReplaceNeeded();
                }
            }
        }, '.arg');

        $operationsView.on('dblclick', 'input', function() {
            this.setSelectionRange(0, this.value.length);
        });

        // add filter arguments button
        $operationsView.find('.addFilterArg').click(function() {
            addFilterGroup();
            $operationsView.find(".andOrToggle").show();
        });

        // toggle filter and/or
        $operationsView.find(".switch").click(function() {
            var $slider = $(this);
            if (!$slider.hasClass("unavailable")) {
                $slider.toggleClass("on");
            }
            var noHighlight = false;
            var andOrSwitch = true;
            updateStrPreview(noHighlight, andOrSwitch);
        });

        // adds field to group on input
        $operationsView.on("click", ".addGroupArg", function() {
            var $allGroups = $activeOpSection.find(".group");
            var $group = $(this).closest(".group");
            var groupIndex = $allGroups.index($group);
            addGroupOnArg(groupIndex);
        });

         // add filter arguments button
        $operationsView.find('.addGBGroup').click(function() {
            addGroupbyGroup();
        });

        // dynamic button - ex. default:multiJoin
        $operationsView.on('click', '.addMapArg', function() {
            addMapArg($(this));
        });

        $operationsView.on('click', '.extraArg .xi-cancel', function() {
            removeExtraArg($(this).closest('.extraArg'));
        });

        // click on the hint list
        $operationsView.on('click', '.hint li', function() {
            var $li = $(this);
            var val = $li.text();
            if (val[0] !== gAggVarPrefix) {
                val = gColPrefix + val;
            }

            applyArgSuggest($li, val);
        });

        addCastDropDownListener();

        $operationsView.on('click', '.checkboxSection', function() {
            var $checkbox = $(this).find('.checkbox');
            $checkbox.toggleClass("checked");

             // incSample and keepInTable toggling
            if ($checkbox.closest('.gbCheckboxes').length) {

                if ($checkbox.hasClass('checked')) {
                    $checkbox.closest('.checkboxSection').siblings()
                            .find('.checkbox').removeClass('checked');
                }

                // show or hide new table name input if join back option is
                // selected
                var $newTableNameRow = $activeOpSection
                                            .find('.newTableNameRow');
                var $joinBackBox = $checkbox.closest('.gbCheckboxes')
                                             .find('.joinBack .checkbox');
                var $keepTableBox = $activeOpSection.find(".keepTable .checkbox");
                if ($joinBackBox.hasClass('checked')) {
                    $newTableNameRow.addClass('inactive');
                    $keepTableBox.removeClass("checked");
                } else {
                    $newTableNameRow.removeClass('inactive');
                }

                var isIncSample = $activeOpSection.find('.incSample .checkbox')
                                                  .hasClass('checked');
                if (isIncSample) {
                    $operationsView.find(".groupByColumnsSection")
                                   .removeClass("xc-hidden");
                } else {
                    $operationsView.find(".groupByColumnsSection")
                                   .addClass("xc-hidden");
                }
            } else if ($(this).hasClass("keepTable")) {
                if ($checkbox.hasClass("checked")) {
                    $activeOpSection.find('.joinBack .checkbox')
                                    .removeClass("checked");
                    $activeOpSection.find('.newTableNameRow')
                                     .removeClass('inactive');
                }
            }

            checkIfStringReplaceNeeded();
        });

        $operationsView.on("click", ".boolArgWrap", function() {
            var $checkbox = $(this).find(".checkbox");
            $checkbox.toggleClass("checked");
            var $input = $checkbox.closest(".row").find(".arg");
            if ($checkbox.hasClass("checked")) {
                $input.val("true");
            } else {
                $input.val("");
            }
            updateStrPreview(true);
        });

        // empty options checkboxes
        $operationsView.on('click', '.emptyOptions .checkboxWrap', function() {
            var $checkboxWrap = $(this);
            var $checkbox = $checkboxWrap.find('.checkbox');
            var $emptyOptsWrap = $checkboxWrap.parent();
            var isEmptyArgsBox = $checkboxWrap.closest(".skipField").length > 0;

            var $arg = $emptyOptsWrap.siblings(".inputWrap").find(".arg");
            var $group = $checkbox.closest(".group");
            var index = $group.find(".arg").index($arg);
            var $sibArgs = $group.find(".arg:gt(" + index + ")");
            $sibArgs = $sibArgs.filter(function() {
                return !$(this).closest(".resultantColNameRow").length;
            });
            $arg.val("");

            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $emptyOptsWrap.siblings('.inputWrap')
                               .removeClass('semiHidden');
                $emptyOptsWrap.siblings('.cast')
                              .removeClass('semiHidden');

            } else {
                $checkbox.addClass('checked');
                if ($emptyOptsWrap.siblings('.inputWrap').length === 1) {
                    $emptyOptsWrap.siblings('.inputWrap')
                                  .addClass('semiHidden')
                                  .find('.arg').val("");
                    $emptyOptsWrap.siblings('.cast')
                                           .addClass('semiHidden');
                }

                // noArg and empty str toggling
                $checkbox.closest('.checkboxWrap').siblings()
                        .find('.checkbox').removeClass('checked');
                if (isEmptyArgsBox) {
                    showEmptyOptions($sibArgs);
                    $sibArgs.val("");
                    var $inputWraps = $checkbox.closest(".row").find(".inputWrap");
                    $inputWraps.addClass("semiHidden");
                    $inputWraps.siblings(".cast").addClass("semiHidden");
                    $inputWraps.siblings(".emptyOptions")
                               .find(".noArgWrap .checkbox").addClass("checked");
                    $inputWraps.siblings(".emptyOptions")
                               .find(".emptyStrWrap .checkbox")
                               .removeClass("checked");
                }
            }
            checkIfStringReplaceNeeded();
        });

        $operationsView.on('click', '.focusTable', function() {
            xcHelper.centerFocusedTable(tableId, true);
        });

        var $aggList = $('.aggregate .functionsList');
        aggFunctionsListScroller = new MenuHelper($aggList, {
            scrollerOnly: true,
            bounds: '#operationsView',
            bottomPadding: 5
        });

        $operationsView.find('.tableList').each(function() {
            var $list = $(this);
            var tableListScroller = new MenuHelper($list, {
                "onOpen": function() {
                    fillTableList(true);
                },
                "onSelect": function($li) {
                    var tableName = $li.text();
                    var $textBox = $list.find(".text");
                    var originalText = $textBox.text();

                    if (originalText !== tableName) {
                        $textBox.text(tableName);
                        $li.siblings().removeClass('selected');
                        $li.addClass('selected');
                        tableId = $li.data('id');
                        // xx should we focus on the table that was selected?
                        if (!gTables[tableId]) {
                            return;
                        }
                        table = gTables[tableId];
                        xcHelper.centerFocusedTable(tableId, true);
                        updateColNamesCache();
                        if (operatorName === "group by") {
                            var listHtml = getTableColList();
                            $activeOpSection.find(".cols").html(listHtml);
                            $activeOpSection.find(".selectAllCols")
                                            .removeClass('checked');
                            focusedColListNum = null;
                        }
                    } else {
                        return;
                    }
                }
            });
            tableListScroller.setupListeners();
        });

        // for group by advanced options
        $operationsView.find('.advancedTitle').click(function() {
            var $advancedSection = $(this).closest(".advancedSection");
            if ($advancedSection.hasClass('collapsed')) {
                $advancedSection.addClass('expanded').removeClass('collapsed');
            } else {
                $advancedSection.addClass('collapsed').removeClass('expanded');
            }
        });

        // used only for groupby columns to keep
        $operationsView.find('.columnsWrap').on('click', 'li', function(event) {
            var $li = $(this);
            var colNum = $li.data("colnum");
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }


            if (event.shiftKey && focusedColListNum != null) {
                var start = Math.min(focusedColListNum, colNum);
                var end = Math.max(focusedColListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i);
                    } else {
                        deselectCol(i);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum);
                } else {
                    deselectCol(colNum);
                }
            }

            focusedColListNum = colNum;
        });

        $operationsView.find('.selectAllCols').on('click', function() {
            var $checkbox = $(this);
            var $cols = $activeOpSection.find(".cols");

            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $cols.find('li').removeClass('checked')
                     .find('.checkbox').removeClass('checked');
            } else {
                $checkbox.addClass('checked');
                $cols.find('li').addClass('checked')
                      .find('.checkbox').addClass('checked');
            }
            focusedColListNum = null;
        });

        XcalarListXdfs("*", "*")
        .then(function(listXdfsObj) {
            FnBar.updateOperationsMap(listXdfsObj.fnDescs);
            setupOperatorsMap(listXdfsObj.fnDescs);
        })
        .fail(function(error) {
            Alert.error("List XDFs failed", error.error);
        });
    };

    OperationsView.restore = function() {
        // restore user saved preferences
        var keepOriginalTable = UserSettings.getPref('keepGBTable');
        if (keepOriginalTable) {
            $operationsView.find('.keepTable .checkbox').addClass('checked');
        }
    };

    // options
    // restore: boolean, if true, will not clear the form from it's last state
    // restoreTime: time when previous operation took place
    // triggerColNum: colNum that triggered the opmodal
    // prefill: object, used to prefill the form
    OperationsView.show = function(currTableId, currColNums, operator,
                                   options) {
        if (formHelper.isOpen()) {
            return PromiseHelper.reject();
        }
        options = options || {};
        if (options.restoreTime &&
            options.restoreTime !== formHelper.getOpenTime()) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return PromiseHelper.reject();
        }
        var deferred = jQuery.Deferred();
        if (!options.restore) {
            operatorName = operator.toLowerCase().trim();
        }

        formHelper.showView(operatorName);

        isEditMode = DagEdit.isEditMode();
        var hasPrefill = options.prefill ? true : false;
        if (options.prefill && options.prefill.isDroppedTable) {
            table = gDroppedTables[currTableId];
        } else if (currTableId) {
            table = gTables[currTableId];
        }

        if (options.restore) {
            $activeOpSection.removeClass('xc-hidden');
        } else {
            tableId = currTableId;
            // changes mainMenu and assigns activeOpSection
            showOpSection();
            resetForm();
            if (options.triggerColNum != null) {
                colNum = options.triggerColNum;
            } else if (currColNums && currColNums.length) {
                colNum = currColNums[0];
            }
            if (table.getCol(colNum)) {
                triggerColName = table.getCol(colNum).getBackColName();
            }

            if (currColNums && currColNums.length) {
                currentCol = table.getCol(colNum);
                colName = currentCol.getFrontColName(true);
                isNewCol = currentCol.isNewCol;
            } else if (hasPrefill) {
                if (options.prefill.args[0] &&
                    options.prefill.args[0][0] &&
                    options.prefill.args[0][0].indexOf("(") === -1) {
                    colName = options.prefill.args[0][0];
                } else {
                    colName = "";
                }
                isNewCol = false;
            }
        }
        updateFormTitles(options);

        // highlight active column
        if (currColNums && currColNums.length === 1) {
            $('#xcTable-' + tableId).find('.col' + colNum)
                                    .addClass('modalHighlighted');
        }

        operationsViewShowListeners(options.restore);

        // used for css class
        var opNameNoSpace = operatorName.replace(/ /g, "");
        var columnPicker = {
            "state": opNameNoSpace + "State",
            "colCallback": function($target) {
                var options = {};
                var $focusedEl = $(document.activeElement);
                if (($focusedEl.is("input") &&
                    !$focusedEl.is($lastInputFocused)) ||
                    $lastInputFocused.closest(".semiHidden").length) {
                    return;
                }
                if ($lastInputFocused.closest(".row")
                                     .siblings(".addArgWrap").length
                    || $lastInputFocused.hasClass("variableArgs")) {
                    options.append = true;
                }
                xcHelper.fillInputFromCell($target, $lastInputFocused,
                                            gColPrefix, options);
                checkHighlightTableCols($lastInputFocused);
                if ($lastInputFocused.hasClass("gbAgg")) {
                    autoGenNewGroubyName($lastInputFocused);
                }
            }
        };
        formHelper.setup({"columnPicker": columnPicker});

        toggleOperationsViewDisplay(false);

        // load updated UDFs if operator is map
        if (operatorName === "map") {
            formHelper.addWaitingBG({
                heightAdjust: 20,
                transparent: true
            });
            disableInputs();
            UDF.list()
            .then(function(listXdfsObj) {
                udfUpdateOperatorsMap(listXdfsObj.fnDescs);
                operationsViewShowHelper(options.restore, null, options);
                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error("Listing of UDFs failed", error.error);
                deferred.reject();
            });
        } else {
            operationsViewShowHelper(options.restore, currColNums, options);
            deferred.resolve();
        }
        return (deferred.promise());
    };

    OperationsView.close = function() {
        if (formHelper.isOpen()) {
            closeOpSection();
        }
    };

    OperationsView.updateColumns = function() {
        if (!formHelper.isOpen()) {
            return;
        }

        focusedColListNum = null;
        updateColNamesCache();

        if (operatorName === "group by") {
            var colsToKeep = [];
            $activeOpSection.find('.cols li.checked').each(function() {
                colsToKeep.push($(this).text());
            });
            var listHtml = getTableColList();
            $activeOpSection.find(".cols").html(listHtml);
            $activeOpSection.find(".selectAllCols").removeClass('checked');
            colsToKeep.forEach(function(colName) {
                var colNum = getColNum(colName);
                selectCol(colNum - 1);
            });
        }
    };

    function updateFormTitles() {
        var titleName = operatorName;
        var submitText;
        if (isEditMode) {
            titleName = "EDIT " + titleName;
            submitText = "SAVE";
        } else {
            submitText = operatorName.toUpperCase();
        }
        $operationsView.find('.title').text(titleName);
        $operationsView.find('.submit').text(submitText);
    }


    // for functions dropdown list
    // forceUpdate is a boolean, if true, we trigger an update even if
    // input's val didn't change
    function fnListMouseup(event, $li, forceUpdate) {
        allowInputChange = true;
        event.stopPropagation();
        var value = $li.text();
        var $input = $li.closest('.list').siblings('.autocomplete');
        var fnInputNum = $input.data('fninputnum');
        var originalInputValue = $input.data("value");
        hideDropdowns();

        // value didn't change && argSection is inactive (not showing)
        if (!forceUpdate && originalInputValue === value &&
            $activeOpSection.find('.group').eq(fnInputNum)
                            .find('.argsSection.inactive').length === 0) {
            $input.val(value);
            return;
        }

        $input.val(value);

        if (value === $genFunctionsMenu.data('category')) {
            return;
        }

        $input.data("value", value.trim());
        enterFunctionsInput(fnInputNum);
    }

    // listeners added whenever operation view opens
    function operationsViewShowListeners(restoring) {
        $("#mainFrame").on("mousedown.keepInputFocused", ".xcTable .header, " +
                        ".xcTable td.clickable", keepInputFocused);

        $(document).on('click.OpSection', function() {
            var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
            // close if user clicks somewhere on the op modal, unless
            // they're clicking on a dropdownlist
            // if dropdown had a higlighted li, trigger a fnListMouseup and thus
            // select it for the functions dropdown list
            if ($mousedownTarget.closest('.dropDownList').length === 0) {
                var dropdownHidden = false;
                $activeOpSection.find('.genFunctionsMenu:visible')
                .each(function() {
                    var $selectedLi = $(this).find('.highlighted');
                    if ($selectedLi.length > 0) {
                        var e = $.Event("mouseup");
                        fnListMouseup(e, $selectedLi, true);
                        dropdownHidden = true;
                        return false; // exit loop
                    }
                });
                if (!dropdownHidden) {
                    hideDropdowns();
                }
            }
            allowInputChange = true;
        });

        $(document).on("keydown.OpSection", function(event) {
            if (event.which === keyCode.Escape) {
                if ($operationsView.find(".hint.list:visible").length) {
                    hideDropdowns();
                } else if (!$operationsView.find(".list:visible").length) {
                    closeOpSection();
                }
            }
        });

        if (!restoring &&
            (operatorName === "filter" || operatorName === "group by")) {
            var $list;
            if (operatorName === "filter") {
                $list = $('.filter .functionsList');
            } else {
                $list = $('.groupby .functionsList');
            }
            var functionsListScroller = new MenuHelper($list, {
                scrollerOnly: true,
                bounds: '#operationsView',
                bottomPadding: 5
            });

            functionsListScrollers = [functionsListScroller];
        }
    }

    // functions that get called after list udfs is called during op view show
    function operationsViewShowHelper(restore, colNums, options) {
        var aggs = Aggregates.getNamedAggs();
        aggNames = [];
        for (var i in aggs) {
            aggNames.push(aggs[i].aggName);
        }

        if (restore) {
            if (operatorName === "group by") {
                $activeOpSection.find(".arg:visible").each(function() {
                    checkHighlightTableCols($(this));
                });
            }
        } else {
            populateInitialCategoryField(operatorName);
            fillInputPlaceholder(0);

            if (operatorName === "map") {
                $('#mapFilter').focus();
            } else if (operatorName === "group by") {
                populateGroupOnFields(colNums);
            } else {
                $activeOpSection.find('.functionsInput').focus();
            }
        }

        if (operatorName === "map") {
            $(document).on('mousedown.mapCategoryListener', function(e) {
                var $target = $(e.target);
                if (!$target.closest('.catFuncMenus').length &&
                    !$target.is('#mapFilter') &&
                    !$target.hasClass('ui-resizable-handle'))
                {
                    if ($categoryList.find('li.active').length &&
                        $functionsList.find('li.active').length === 0)
                    {
                        var val = $('#mapFilter').val();
                        var valTrimmed = val.trim();
                        if (valTrimmed.length || val.length === 0) {
                            filterTheMapFunctions(valTrimmed);
                        }
                    }
                }
            });
        }

        $operationsView.find('.list').removeClass('hovering');
        enableInputs();
        formHelper.removeWaitingBG();
        formHelper.refreshTabbing();

        if (!options.prefill) {
            return;
        }

        $activeOpSection.find('.group').find(".argsSection").last().empty();

        if (operatorName === "group by") {
            for (var i = 0; i < options.prefill.indexedFields.length; i++) {
                if (i > 0) {
                    addGroupOnArg(0);
                }
                var name = options.prefill.indexedFields[i];
                $activeOpSection.find('.gbOnArg').last().val(gColPrefix + name);
                checkHighlightTableCols($activeOpSection.find('.gbOnArg').last());
            }
            $activeOpSection.find('.gbOnArg').last().blur();
        }

        for (var i = 0; i < options.prefill.ops.length; i++) {
            var $group;
            if (operatorName === "map") {
                $("#mapFilter").val(options.prefill.ops[i]).trigger("input");
                $activeOpSection.find(".functionsMenu").find("li").filter(function() {
                    return $(this).text() === options.prefill.ops[i];
                }).click(); // triggers listing of argument inputs
                $group = $activeOpSection.find('.group').eq(i);
            } else {
                if (operatorName === "group by" && i > 0) {
                    addGroupbyGroup();
                }
                $group = $activeOpSection.find('.group').eq(i);
                $group.find(".functionsInput").val(options.prefill.ops[i]).change();
            }

            var params = options.prefill.args[i];
            var $args = $group.find(".arg:visible:not(.gbOnArg)").filter(function() {
                return $(this).closest(".colNameSection").length === 0;
            });
            for (var j = 0; j < params.length; j++) {
                var arg = params[j];
                arg = formatArg(arg);

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
            if (options.prefill.newFields) {
                $group.find(".resultantColNameRow .arg:visible")
                      .val(options.prefill.newFields[i]);
            }
        }

        if (options.prefill.dest) {
            $activeOpSection.find(".newTableName:visible").val(options.prefill.dest);
        }

        if (options.prefill.icv) {
            $activeOpSection.find(".icvMode .checkbox").addClass("checked");
        }
        if (options.prefill.includeSample) {
            $activeOpSection.find(".incSample .checkbox").addClass("checked");
        }

        function formatArg(arg) {
            if (arg.indexOf("'") !== 0 && arg.indexOf('"') !== 0) {
                if (isArgAColumn(arg)) {
                    // it's a column
                    if (arg[0] !== gAggVarPrefix) {
                        // do not prepend colprefix if has aggprefix
                        arg = gColPrefix + arg;
                    }
                }
            } else {
                var quote = arg[0];
                if (arg.lastIndexOf(quote) === arg.length - 1) {
                    arg = arg.slice(1, -1);
                }
            }
            return arg;
        }

        checkIfStringReplaceNeeded(true);
    }

    function populateGroupOnFields(colNums) {
        for (var i = 0; i < colNums.length; i++) {

            var progCol = table.getCol(colNums[i]);
            if (!progCol.isNewCol) {
                if (i > 0) {
                    addGroupOnArg(0);
                }
                var name = progCol.getFrontColName(true);
                $activeOpSection.find('.gbOnArg').last().val(gColPrefix + name);
                checkHighlightTableCols($activeOpSection.find('.gbOnArg').last());
            }
        }
        $activeOpSection.find('.gbOnArg').last().blur();
    }

    function showOpSection() {
        var concatedOpName = operatorName.replace(/ /g, "");
        $activeOpSection = $operationsView.find('.' + concatedOpName);
        $activeOpSection.removeClass('xc-hidden');
    }

    function toggleOperationsViewDisplay(isHide) {
        var $tableWrap = $('.xcTableWrap');
        if (isHide) {
            $("#mainFrame").off('mousedown.keepInputFocused');
            $('body').off('keydown', listHighlightListener);
            $tableWrap.removeClass('modalOpen');
        } else {
            $('body').on('keydown', listHighlightListener);
        }
    }

    function keepInputFocused(event) {
        xcMenu.close($('#colMenu'));
        event.preventDefault();
        event.stopPropagation();
    }

    function addCastDropDownListener() {
        var $lists = $operationsView.find(".cast.new .dropDownList");
        $lists.closest('.cast.new').removeClass('new');
        var castList = new MenuHelper($lists, {
            "onOpen": function() {
                StatusBox.forceHide();
            },
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                var type   = $li.text();
                var casted;

                $input.val(type);
                if (type === "default") {
                    casted = false;
                } else {
                    casted = true;
                }
                $input.attr("data-casted", casted);
                $input.closest('.row').find('.arg')
                                       .data('casted', casted)
                                       .data('casttype', type);
                StatusBox.forceHide();
                updateStrPreview();
            },
            "container": "#operationsView"
        });
        castList.setupListeners();
    }

    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument

    var firstArgExceptions = {
        'conditional functions': ['not'],
        'conditional': ['not']
    };

    function populateInitialCategoryField(operator) {
        functionsMap = {};
        categoryNames = [];
        var html = "";
        var categoryName;

        if (operator === "map") {
            for (var i = 0; i < Object.keys(operatorsMap).length; i++) {
                if (FunctionCategoryTStr[i] === 'Aggregate functions') {
                    continue;
                }

                categoryName = FunctionCategoryTStr[i].toLowerCase();
                var searchStr = " functions";
                var categoryNameLen = categoryName.length;
                if (categoryName.lastIndexOf(searchStr) ===
                    (categoryNameLen - searchStr.length))
                {
                    categoryName = categoryName.substring(0,
                                            categoryNameLen - searchStr.length);
                }
                categoryNames.push(categoryName);
                functionsMap[i] = operatorsMap[i];
                html += '<li data-category="' + i + '">' +
                            categoryName +
                        '</li>';
            }
            var $list = $(html);
            $list.sort(sortHTML);
            $categoryList.html($list);
        } else {
            var categoryIndex;
            if (operator === "aggregate" || operator === "group by") {
                categoryIndex = FunctionCategoryT.FunctionCategoryAggregate;
            } else if (operator === "filter") {
                categoryIndex = FunctionCategoryT.FunctionCategoryCondition;
            }

            categoryName = FunctionCategoryTStr[categoryIndex].toLowerCase();
            categoryNames.push(categoryName);
            var ops = operatorsMap[categoryIndex];
            functionsMap[0] = ops;

            populateFunctionsListUl(0);
        }
    }

    // map should not call this function
    function populateFunctionsListUl(groupIndex) {
        var categoryIndex;
        if (operatorName === "filter") {
            categoryIndex = FunctionCategoryT.FunctionCategoryCondition;
        } else if (operatorName === "group by" ||
                   operatorName === "aggregate") {
            categoryIndex = FunctionCategoryT.FunctionCategoryAggregate;
        }

        var ops = operatorsMap[categoryIndex];
        var html = "";
        for (var i = 0, numOps = ops.length; i < numOps; i++) {
            html += '<li class="textNoCap">' + ops[i].fnName + '</li>';
        }
        $activeOpSection.find('.genFunctionsMenu ul[data-fnmenunum="' +
                                groupIndex + '"]')
                        .html(html);
    }

    function setupOperatorsMap(opArray) {
        operatorsMap = [];
        opArray.forEach(function(op) {
            if (!operatorsMap[op.category]) {
                operatorsMap[op.category] = [];
            }
            operatorsMap[op.category].push(op);
        });

        // sort each set of operators by name
        for (var i = 0; i < operatorsMap.length; i++) {
            operatorsMap[i].sort(sortFn);
        }
        function sortFn(a, b){
            return (a.fnName) > (b.fnName) ? 1 : -1;
        }
    }

    function udfUpdateOperatorsMap(opArray) {
        var arrayLen = opArray.length;
        var udfCategoryNum = FunctionCategoryT.FunctionCategoryUdf;
        if (opArray.length === 0) {
            delete operatorsMap[udfCategoryNum];
            return;
        }

        opArray.sort(sortFn);

        function sortFn(a, b){
            return (a.fnName) > (b.fnName) ? 1 : -1;
        }

        operatorsMap[udfCategoryNum] = [];
        var hideXcUDF = UserSettings.getPref("hideXcUDF");
        for (var i = 0; i < arrayLen; i++) {
            if (hideXcUDF && opArray[i].fnName.startsWith("_xcalar")) {
                continue;
            }
            operatorsMap[udfCategoryNum].push(opArray[i]);
        }
    }

    function sortHTML(a, b){
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    function getArgSuggestMenu($list) {
        var $allGroups = $activeOpSection.find(".group");
        var $group = $list.closest(".group");
        var groupIndex = $allGroups.index($group);
        var argIndex = $group.find(".list.hint").index($list);
        // this should always exists, just taking precaution
        if (suggestLists[groupIndex] && suggestLists[groupIndex][argIndex]) {
            return suggestLists[groupIndex][argIndex];
        } else {
            console.error("cannot find menu");
            return null;
        }
    }

    function getArgSuggestLists(input) {
        var listLis = "";
        // ignore if there are multiple cols
        if (input.includes(",")) {
            return listLis;
        }

        var aggNameMatches = getMatchingAggNames(input);
        var colNameMatches = getMatchingColNames(input);
        var allMatches = aggNameMatches.concat(colNameMatches);
        var count = 0;

        for (var i = 0; i < allMatches.length; i++) {
            listLis += "<li>" + xcHelper.escapeHTMLSpecialChar(allMatches[i]) +
                         "</li>";
            count++;
            if (count > listMax) {
                break;
            }
        }
        return listLis;
    }

    function argSuggest($input) {
        var $list = $input.siblings(".list");
        var menu = getArgSuggestMenu($list);
        if (menu == null) {
            return;
        }

        var input = $input.val().trim();
        if (input.length === 1 && !isNaN(input)) {
            // if it's a single number don't suggest
            return;
        }
        var listLis = getArgSuggestLists(input);

        $list.find("ul").html(listLis);
        // should not suggest if the input val is already a column name
        if (listLis.length) {
            menu.openList();
            positionDropdown($list);
            $list.find("li").eq(0).addClass("highlighted");
        } else {
            menu.hideDropdowns();
        }
    }

    function applyArgSuggest($li, val) {
        var $list = $li.closest(".list");
        var menu = getArgSuggestMenu($list);
        if (menu != null) {
            menu.hideDropdowns();
        }
        $list.siblings(".arg").val(val);
        checkIfStringReplaceNeeded();
    }

    function updateColNamesCache() {
        colNamesCache = xcHelper.getColNameMap(tableId);
    }

    function getMatchingAggNames(val) {
        var list = [];
        var originalVal = val;
        val = val.toLowerCase();
        if (val.length) {
            for (var i = 0; i < aggNames.length; i++) {
                if (aggNames[i].toLowerCase().indexOf(val) > -1 ) {
                    list.push(aggNames[i]);
                }
            }
        }

        if (list.length === 1 && list[0] === originalVal) {
            // do not populate if exact match
            return [];
        }

        list.sort();
        return (list);
    }

    function getMatchingColNames(val) {
        var list = [];
        var seen = {};
        var originalVal = val;

        if (val[0] === gColPrefix) {
            val = val.slice(1);
        }
        val = val.toLowerCase();

        if (val.length) {
            for (var name in colNamesCache) {
                if (name.indexOf(val) !== -1 &&
                    !seen.hasOwnProperty(name)) {
                    seen[name] = true;
                    list.push(colNamesCache[name]);
                }
            }
        }

        if (list.length === 1 && (gColPrefix + list[0] === originalVal)) {
            // do not populate if exact match
            return [];
        }

        // shorter results on top
        list.sort(function(a, b) {
            return a.length - b.length;
        });

        return (list);
    }

    function positionDropdown($ul) {
        var $input = $ul.siblings('input');
        var top = $input[0].getBoundingClientRect().bottom;
        var left = $input[0].getBoundingClientRect().left;
        $ul.css({top: top, left: left});
    }

    // suggest value for .functionsInput
    function suggest($input) {
        var value = $input.val().trim().toLowerCase();
        var $list = $input.siblings('.list');

        $operationsView.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(sortHTML).prependTo($list.find('ul'));
        $visibleLis.eq(0).addClass('highlighted');

        if (operatorName === "filter" || operatorName === "group by") {
            var fnInputNum = parseInt($list.siblings('input')
                                           .data('fninputnum'));
            functionsListScrollers[fnInputNum].showOrHideScrollers();
        } else {
            aggFunctionsListScroller.showOrHideScrollers();
        }

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order
        for (var i = $visibleLis.length; i >= 0; i--) {
            var $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.find('ul').prepend($li);
            }
        }
    }

    function hideDropdowns() {
        $operationsView.find('.list').filter(function() {
            return ($(this).closest('.tableList').length === 0);
        }).hide();
        $operationsView.find('.list li').hide();
        $operationsView.find('.cast .list li').show();
        $operationsView.find('.tableList .list li').show();
    }

    // index is the argument group numbers
    function enterFunctionsInput(index) {
        index = index || 0;
        if (!isOperationValid(index)) {
            var $fnInput = $activeOpSection.find(".group").eq(index)
                                            .find(".functionsInput");
            var inputNum = $activeOpSection.find(".group").eq(index)
                            .find("input").index($fnInput);
            if (inputNum < 1) {
                inputNum = 0;
            }

            showErrorMessage(inputNum, index);
            clearFunctionsInput(index);
            return;
        }

        updateArgumentSection(null, index);

        var $nextInput;
        var $inputs = $activeOpSection.find('.group').eq(index)
                                      .find('.arg:visible');
        if (operatorName === "aggregate") {
            $nextInput = $inputs.eq(0);
        } else {
            $inputs.each(function() {
                if ($(this).val().trim().length === 0) {
                    $nextInput = $(this);
                    return false;
                }
            });
        }

        if (!$nextInput) {
            $nextInput = $inputs.last();
        }

        $nextInput.focus();
        var val = $nextInput.val();
        // will highlight entire text if exists
        $nextInput[0].selectionStart = $nextInput[0].selectionEnd = val.length;
    }

    function clearFunctionsInput(groupNum, keep) {
        var $argsGroup =  $activeOpSection.find('.group').eq(groupNum);
        if (!keep) {
            $argsGroup.find('.functionsInput')
                      .val("").attr('placeholder', "");
        }

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').last().addClass('inactive');
        $activeOpSection.find('.gbCheckboxes').addClass('inactive');
        $activeOpSection.find('.icvMode').addClass('inactive');
        $activeOpSection.find(".advancedSection").addClass("inactive");
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data("value", "");
        $activeOpSection.find('.newTableNameRow').addClass('inactive');
        hideDropdowns();
        checkIfStringReplaceNeeded(true);
    }

    function isOperationValid(index) {
        if (operatorName === "map") { // no custom input so no need to check
            if ($functionsList.find('li.active').length) {
                return (true);
            } else {
                return (false);
            }
        } else {
            var func = $.trim($activeOpSection.find('.group').eq(index)
                                          .find('.functionsInput').val());

            var matches = $functionsUl.find('li').filter(function() {
                return ($(this).text() === func);
            });

            return (matches.length > 0);
        }
    }

    function showErrorMessage(inputNum, groupNum) {
        var text = ErrTStr.NoSupportOp;
        var $target;
        if (operatorName === "map" && inputNum === 0) {
            $target = $functionsList.parent();
            text = ErrTStr.NoEmpty;
        } else {
            inputNum = inputNum || 0;
            groupNum = groupNum || 0;
            $target = $activeOpSection.find('.group').eq(groupNum)
                                      .find('input').eq(inputNum);
            if ($.trim($target.val()) === "") {
                text = ErrTStr.NoEmpty;
            }
        }

        StatusBox.show(text, $target, false, {"offsetX": -5});
    }

    // scrolls to target before showing statusbox
    function statusBoxShowHelper(text, $input) {
        $input.get(0).scrollIntoView();
        xcTooltip.hideAll();
        StatusBox.show(text, $input, false, {preventImmediateHide: true});
    }

    // for map
    function updateMapFunctionsList(filtered) {
        var opsMap;
        if (!filtered) {
            var $li = $categoryList.find('.active');
            var categoryNum = $li.data('category');
            opsMap = {};
            if ($('#mapFilter').val().trim() !== "") {
                opsMap[categoryNum] = filteredOperatorsMap[categoryNum];
            } else {
                opsMap[categoryNum] = functionsMap[categoryNum];
            }
        } else {
            opsMap = filteredOperatorsMap;
        }
        var filterVal = $('#mapFilter').val().trim();
        var startsWith = "";
        var includes = "";
        var i;

        for (var cat in opsMap) {
            var ops = opsMap[cat];
            if (!ops) {
                continue;
            }
            if (parseInt(cat) === FunctionCategoryT.FunctionCategoryUdf) {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '" data-container="body" ' +
                    'data-placement="right" data-toggle="tooltip" title="' +
                    ops[i].fnName + '">' + ops[i].fnName + '</li>';
                    if (filterVal &&
                        ops[i].fnName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            } else {
                for (i = 0; i < ops.length; i++) {
                    li = '<li class="textNoCap" data-category="' + cat +
                    '">' + ops[i].fnName + '</li>';
                    if (filterVal &&
                        ops[i].fnName.toLowerCase().startsWith(filterVal))
                    {
                        startsWith += li;
                    } else {
                        includes += li;
                    }
                }
            }
        }

        var $startsWith = $(startsWith);
        var $includes = $(includes);
        $startsWith.sort(sortHTML);
        $includes.sort(sortHTML);

        $functionsList.empty();
        $functionsList.append($startsWith);
        $functionsList.append($includes);

        $activeOpSection.find('.argsSection').addClass('inactive');
        $operationsView.find('.icvMode').addClass('inactive');
        $activeOpSection.find('.descriptionText').empty();
        $operationsView.find('.strPreview').empty();
    }

    function fillTableList(refresh) {
        var tableLis = WSManager.getTableList();
        var $tableListSection = $activeOpSection.find('.tableListSection');
        $tableListSection.find('ul').html(tableLis);
        var tableName;
        // select li and fill left table name dropdown
        if (refresh) {
            tableName = $tableListSection.find('.dropDownList .text').text();
        } else {
            tableName = table.getName();
            $tableListSection.find('.dropDownList .text').text(tableName);
            updateColNamesCache();
        }

        $tableListSection.find('li').filter(function() {
            return ($(this).text() === tableName);
        }).addClass('selected');
    }

    // $li = map's function menu li
    // groupIndex, the index of a group of arguments (multi filter)
    function updateArgumentSection($li, groupIndex) {
        var category;
        var categoryNum;
        var func;
        var $argsGroup = $activeOpSection.find('.group').eq(groupIndex);

        if (operatorName === "map" && $li) {
            categoryNum = $li.data('category');
            category = categoryNames[categoryNum];
            func = $li.text().trim();
        } else {
            categoryNum = 0;
            category = categoryNames[categoryNum];
            func = $argsGroup.find('.functionsInput').val().trim();
        }

        funcName = func;

        var ops = functionsMap[categoryNum];
        var operObj = null;

        for (var i = 0, numOps = ops.length; i < numOps; i++) {
            if (func === ops[i].fnName) {
                operObj = ops[i];
                break;
            }
        }

        var $argsSection = $argsGroup.find('.argsSection').last();
        var firstTime = $argsSection.html() === "";
        $argsSection.removeClass('inactive');
        $argsSection.empty();
        $argsSection.data("fnname", operObj.fnName);

        $activeOpSection.find(".advancedSection").removeClass("inactive");
        $activeOpSection.find('.icvMode').removeClass('inactive');
        $activeOpSection.find('.gbCheckboxes').removeClass('inactive');
        $activeOpSection.find('.newTableNameRow').removeClass('inactive');


        var defaultValue = ""; // to autofill first arg

        if ((firstArgExceptions[category] &&
            firstArgExceptions[category].indexOf(func) !== -1) ||
            groupIndex > 0)
        {
            // do not give default value if not the first group of args
            defaultValue = "";
        } else if (!isNewCol && colName) {
            if (isArgAColumn(colName)) {
                defaultValue = gColPrefix + colName;
            } else {
                defaultValue = "";
            }
        }

        var numArgs = Math.max(Math.abs(operObj.numArgs),
                                operObj.argDescs.length);

        var numInputsNeeded = numArgs;
        if (operatorName !== "filter") {
            numInputsNeeded++; // for new column name
        }

        addArgRows(numInputsNeeded, $argsGroup, groupIndex);
        // get rows now that more were added
        var $rows = $argsSection.find('.row');

        hideCastColumn(groupIndex);

        // sets up the args generated by backend, not front end arguments such
        // as new column name input
        setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue);

        var strPreview = "";
        if (operatorName === 'map') {
            // sets up the last input for map
            strPreview = mapArgumentsSetup(numArgs, categoryNum, func, operObj);
            numArgs++;
        } else if (operatorName === "filter") {
            strPreview = filterArgumentsSetup(operObj, $rows);
        } else if (operatorName === "aggregate") {
            aggArgumentsSetup(numArgs, operObj, $rows, defaultValue);
            numArgs++;
        } else if (operatorName === "group by") {
            strPreview = groupbyArgumentsSetup(numArgs, operObj, $rows);
            numArgs += 2;
        }

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        var despText = operObj.fnDesc || "N/A";
        var descriptionHtml = '<b>' + OpFormTStr.Descript + ':</b> ' + despText;
        if (DagEdit.isEditMode()) {
            descriptionHtml += '<br><span class="editDescWarning">' +
                                DFTStr.NoColumnTypeCheck + '</span>';
        }
        $argsGroup.find('.descriptionText').html(descriptionHtml);
        if (operatorName === "group by") {
            var $strPreview = $operationsView.find('.strPreview');
            if ($strPreview.text() === "") {
                var initialText = '<b class="prevTitle">' + OpFormTStr.CMD +
                                   ':<br></b>' +
                                   '<span class="aggColSection"></span>' +
                                   'GROUP BY (' +
                         '<span class="groupByCols"></span>)';
                $strPreview.html(initialText);
            }
            $strPreview.find(".aggColSection").append(strPreview);
        } else if (operatorName !== "aggregate") {
            $operationsView.find('.strPreview')
                           .html('<b>' + OpFormTStr.CMD + ':</b> <br>' +
                                 strPreview);
        }

        formHelper.refreshTabbing();

        var noHighlight = true;
        checkIfStringReplaceNeeded(noHighlight);
        if (($activeOpSection.find('.group').length - 1) === groupIndex) {
            if (operatorName !== "group by") {
                // xx not working well with group by
                var noAnim = (isEditMode && firstTime && groupIndex === 0);
                scrollToBottom(noAnim);
            }
        }
    }

    function addArgRows(numInputsNeeded, $argsGroup, groupIndex) {
        var $argsSection = $argsGroup.find('.argsSection').last();
        var argsHtml = "";
        for (var i = 0; i < numInputsNeeded; i++) {
            argsHtml += getArgHtml();
        }

        $argsSection.append(argsHtml);
        addCastDropDownListener();
        suggestLists[groupIndex] = [];
        if (operatorName === "group by" && groupIndex === 0) {
            $activeOpSection.find('.hint').addClass('new');
        }
        $activeOpSection.find('.list.hint.new').each(function() {
            var scroller = new MenuHelper($(this), {
                scrollerOnly: true,
                bounds: '#operationsView',
                bottomPadding: 5
            });
            suggestLists[groupIndex].push(scroller);
            $(this).removeClass('new');
        });
    }

    // sets up the args generated by backend, not front end arguments
    function setupBasicArgInputsAndDescs(numArgs, operObj, $rows, defaultValue)
    {
        var description;
        var typeId;
        var types;
        for (var i = 0; i < numArgs; i++) {
            if (operObj.argDescs[i]) {
                description = operObj.argDescs[i].argDesc;
                typeId = operObj.argDescs[i].typesAccepted;
            } else {
                description = "";
                var keyLen = Object.keys(DfFieldTypeT).length;
                typeId = Math.pow(2, keyLen + 1) - 1;
            }
            types = parseType(typeId);
            var $input = $rows.eq(i).find('.arg');

            if (i === 0 && operatorName !== "group by") {
                $input.val(defaultValue);
            } else {
                $input.val("");
            }
            $input.data("typeid", typeId);

            // special case to ignore removing autoquotes from
            // function-like arguments if it is 2nd regex input
            if (operObj.fnName === "regex" && i === 1) {
                $input.data("nofunc", true);
            }

            var $row = $rows.eq(i);

            $row.find('.description').text(description + ':');

            // automatically show empty checkbox if optional detected
            if (operObj.argDescs[i].argType === XcalarEvalArgTypeT.OptionalArg)
            {
                if (types.length === 1 && types[0] === ColumnType.boolean ||
                    (types.length === 2 &&
                        types.indexOf(ColumnType.boolean) > -1 &&
                        types.indexOf(ColumnType.undefined) > -1)) {
                    // one case is the "contains" function
                    addBoolCheckbox($input);
                } else {
                    showEmptyOptions($input);
                }
            } else if (!isUDF()) {
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
                        '<button class="btn addArg addMapArg">' +
                          '<i class="icon xi-plus"></i>' +
                          '<span class="text">ADD ANOTHER ARGUMENT</span>' +
                        '</button>' +
                      '</div>');
                if (description.indexOf("*") === 0 &&
                    description.indexOf("**") === -1) {
                    var $checkboxWrap = $row.find(".noArgWrap");
                    $checkboxWrap.addClass("skipField")
                                 .find(".checkboxText").text(OpModalTStr.NoArg);
                    xcTooltip.changeText($checkboxWrap, OpModalTStr.EmptyHint);
                }
            }
        }
    }

    // sets up the last argument for map
    function mapArgumentsSetup(numArgs, categoryNum, func, operObj) {
        var description = OpModalTStr.ColNameDesc + ":";
        var tempName = xcHelper.parsePrefixColName(colName).name;
        var autoGenColName;
        var $rows = $activeOpSection.find('.row');
        if (colName === "" && !isEditMode) {
            tempName = "mapped";
        }
        if (isNewCol && colName !== "" && currentCol) {
            autoGenColName = currentCol.getFrontColName();
            autoGenColName = xcHelper.stripColName(autoGenColName);
        } else {
            if (categoryNum === FunctionCategoryT.FunctionCategoryUdf) {
                autoGenColName = tempName + "_udf";
            } else {
                autoGenColName = tempName + "_" + func;
            }
            autoGenColName = xcHelper.stripColName(autoGenColName);
            autoGenColName = getAutoGenColName(autoGenColName);
        }
        if (isEditMode && !colName) {
            autoGenColName = "";
        }

        var $row = $rows.eq(numArgs).addClass('resultantColNameRow');
        var icon = xcHelper.getColTypeIcon(operObj.outputType);

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
        var strPreview =  operatorName + '(<span class="descArgs">' +
                          operObj.fnName +
                            '(' + $rows.eq(0).find(".arg").val() +
                            ')</span>)';
        return (strPreview);
    }

    function filterArgumentsSetup(operObj) {
        var $rows = $activeOpSection.find('.row');
        var strPreview = operatorName + '(<span class="descArgs">' +
                         operObj.fnName + '(' +
                         $rows.eq(0).find(".arg").val() +
                        ')</span>)';
        return (strPreview);
    }

    function autoGenNewGroubyName($aggArg) {
        var $argSection = $aggArg.closest(".argsSection");
        var $newColName = $argSection.find(".colNameSection .arg");
        if ($newColName.hasClass("touched")) {
            // when user have touched it, don't autoRename
            return;
        }

        var fnName = $argSection.closest(".groupbyGroup")
                                .find(".functionsList input").val();
        var autoGenColName = $aggArg.val().trim();
        if (xcHelper.hasValidColPrefix(autoGenColName)) {
            autoGenColName = parseColPrefixes(autoGenColName);
        }
        autoGenColName = xcHelper.parsePrefixColName(autoGenColName).name;
        autoGenColName = getAutoGenColName(autoGenColName + "_" + fnName);
        autoGenColName = xcHelper.stripColName(autoGenColName);

        $argSection.find(".colNameSection .arg").val(autoGenColName);
    }

    function groupbyArgumentsSetup(numArgs, operObj, $rows) {
        // agg input
        var $gbOnRow = $rows.eq(0);
        $gbOnRow.find(".arg").addClass("gbAgg").focus();
        var description = OpFormTStr.NewColName + ":";
        // new col name field
        var $newColRow = $rows.eq(numArgs);
        var icon = xcHelper.getColTypeIcon(operObj.outputType);
        $newColRow.addClass("resultantColNameRow")
                .find(".dropDownList").addClass("colNameSection")
                .prepend('<div class="iconWrapper"><i class="icon ' + icon +
                       '"></i></div>')
                .end()
                .find(".description").text(description);

        $newColRow.find(".arg").on("change", function() {
            $(this).addClass("touched");
        });

        var strPreview = '<span class="aggColStrWrap">' + operObj.fnName + '(' +
                        '<span class="aggCols">' +
                            $rows.eq(1).find(".arg").val() +
                        '</span>' +
                        '), </span>';
        return (strPreview);
    }

    function aggArgumentsSetup(numArgs, operObj, $rows) {
        var description;
        if (isEditMode) {
            description = OpModalTStr.AggNameReq;
        } else {
            description = OpModalTStr.AggNameDesc;
        }

        $rows.eq(numArgs).addClass('resultantColNameRow')
                        .find('.dropDownList')
                        .addClass('colNameSection')
                        .end()
                        .find('.arg').val("")
                        .end()
                        .find('.description').text(description);

        var $nameInput = $rows.eq(numArgs).find('.arg');
        xcHelper.addAggInputEvents($nameInput);
    }

    function findStringDiff(oldText, newText) {

        // Find the index at which the change began
        var start = 0;
        while (start < oldText.length && start < newText.length &&
               oldText[start] === newText[start]) {
            start++;
        }

        // Find the index at which the change ended
        // (relative to the end of the string)
        var end = 0;
        while (end < oldText.length &&
            end < newText.length &&
            oldText.length - end > start &&
            newText.length - end > start &&
            oldText[oldText.length - 1 - end] === newText[newText.length - 1 -
            end])
        {
            end++;
        }

        // The change end of the new string (newEnd) and old string (oldEnd)
        var newEnd = newText.length - end;
        var oldEnd = oldText.length - end;

        // The number of chars removed and added
        var removed = oldEnd - start;
        var added = newEnd - start;

        var type;
        switch (true) {
            case (removed === 0 && added > 0):
                type = 'add';
                break;
            case (removed > 0 && added === 0):
                type = 'remove';
                break;
            case (removed > 0 && added > 0):
                type = 'replace';
                break;
            default:
                type = 'none';
                start = 0;
        }

        return ({type: type, start: start, removed: removed, added: added});
    }

    // noHighlight: boolean; if true, will not highlight new changes
    function checkIfStringReplaceNeeded(noHighlight) {
        quotesNeeded = [];

        $activeOpSection.find('.group').each(function(i) {
            // var typeIds = [];
            var $inputs = $(this).find('.arg:visible');
            var existingTypes = getExistingTypes(i);

            $inputs.each(function() {
                var $input = $(this);
                var $row = $input.closest('.row');
                var arg = $input.val().trim();
                var typeId;
                var parsedType;
                if (!$input.closest(".dropDownList").hasClass("colNameSection"))
                {
                    typeId = $input.data("typeid");
                }
                parsedType = parseType(typeId);
                var emptyStrChecked = $row.find('.emptyStr.checked').length > 0;
                if (emptyStrChecked && arg === "") {
                    quotesNeeded.push(true);
                } else if (isNoneInInput($input)) {
                    quotesNeeded.push(false);
                } else if (!$input.closest(".dropDownList")
                            .hasClass("colNameSection") &&
                            !xcHelper.hasValidColPrefix(arg) &&
                            arg[0] !== gAggVarPrefix &&
                            parsedType.indexOf("string") > -1 &&
                            ($input.data("nofunc") || !hasFuncFormat(arg))) {
                    // one of the valid types is string


                    if (parsedType.length === 1) {
                        // if input only accepts strings
                        quotesNeeded.push(true);
                    } else if (existingTypes.hasOwnProperty("string")) {
                        quotesNeeded.push(true);
                    } else {
                        if (formatArgumentInput(arg, typeId, {}).isString) {
                            if (isNumberInQuotes(arg) || isBoolInQuotes(arg)) {
                                quotesNeeded.push(false);
                            } else {
                                quotesNeeded.push(true);
                            }
                        } else {
                            quotesNeeded.push(false);
                        }
                    }
                } else {
                    quotesNeeded.push(false);
                }
            });
        });

        updateStrPreview(noHighlight);
    }

    // returns true of the noArg box is selected, not skipping fields
    function isNoneInInput($input) {
        var $row = $input.closest(".row");
        return ($row.find(".noArg.checked").length &
                !$row.find(".skipField").length);
    }

    function checkArgsHasCol(colName) {
        var found = false;
        $activeOpSection.find(".arg:visible").each(function() {
            var $arg = $(this);
            if ($arg.data("colname") === colName) {
                found = true;
                return false;
            }
        });
        return found;
    }

    function checkHighlightTableCols($input) {
        if (operatorName !== "group by") {
            return;
        }

        var arg = $input.val().trim();
        var prevColName = $input.data("colname");
        $input.data("colname", null);
        var $table = $("#xcTable-" + tableId);
        if (prevColName && !checkArgsHasCol(prevColName)) {
            var colNum = getColNum(prevColName);
            $table.find(".col" + colNum).removeClass("modalHighlighted");
        }

        if (xcHelper.hasValidColPrefix(arg)) {
            arg = parseColPrefixes(arg);
            var colNum = table.getColNumByFrontName(arg);
            if (colNum > -1) {
                $input.data("colname", arg);
                $table.find(".col" + colNum).addClass("modalHighlighted");
            }
        }
    }

    function updateStrPreview(noHighlight, andOrSwitch) {
        var $description = $operationsView.find(".strPreview");
        var $inputs = $activeOpSection.find('.arg:visible');
        var tempText;
        var newText = "";
        var andOrIndices = [];
        var $groups;

        if (operatorName === "map" || operatorName === "filter") {
            var oldText = $description.find('.descArgs').text();
            $groups = $activeOpSection.find(".group").filter(function() {
                return ($(this).find('.argsSection.inactive').length === 0);
            });
            var numGroups = $groups.length;
            var inputCount = 0;
            $groups.each(function(groupNum) {
                var funcName;
                if (operatorName === "filter") {
                    funcName = $(this).find('.functionsInput').val().trim();
                } else if (operatorName === "map") {
                    funcName = $functionsList.find('.active').text().trim();
                }
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
                    if ($operationsView.find(".switch").hasClass("on")) {
                        newText += "and(";
                    } else {
                        newText += "or(";
                    }
                }
                newText += funcName + "(";
                $inputs = $(this).find('.arg:visible');
                if (operatorName === "map") { // remove new column name input
                    $inputs = $inputs.not(':last');
                }
                var numNonBlankArgs = 0;
                $inputs.each(function() {
                    var $input = $(this);
                    var $row = $input.closest('.row');
                    var noArgsChecked = ($row.find('.noArg.checked').length &&
                                        $row.find(".skipField").length) ||
                                        ($row.hasClass("boolOption") &&
                                    !$row.find(".boolArg").hasClass("checked"));
                    var val = $input.val();

                    val = parseColPrefixes(parseAggPrefixes(val));

                    if (noArgsChecked && val.trim() === "") {
                        // no quotes if noArgs and nothing in the input
                    } else if (quotesNeeded[inputCount]) {
                        val = "\"" + val + "\"";
                    } else if (isNoneInInput($input)) {
                        val = "None";
                    }

                    if ($input.data('casted')) {
                        var cols = val.split(",");
                        val = "";
                        for (var i = 0; i < cols.length; i++) {
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

            for (var i = 0; i < numGroups - 1; i++) {
                newText += ")";
            }

            tempText = newText;
            if (tempText.trim() === "") {
                $description.empty();
            } else if (noHighlight) {
                newText = wrapText(tempText);
                $description.find(".descArgs").html(newText);
            } else {
                var $spanWrap = $description.find(".descArgs");
                var $spans = $spanWrap.find('span.char');
                if (andOrSwitch) {
                    modifyAndOrDescText(newText, andOrIndices, $spanWrap);
                } else {
                    modifyDescText(oldText, newText, $spanWrap, $spans);
                }
            }
        } else if (operatorName === "group by") {

            $inputs = $activeOpSection.find('.arg:visible');
            var $activeArgs = $activeOpSection.find(".group").filter(function() {
                return !$(this).find(".argsSection").last().hasClass("inactive");
            });
            if (!$activeArgs.length) {
                $operationsView.find('.strPreview').empty();
                return;
            }

            $groups = $activeOpSection.find(".group").filter(function() {
                return (!$(this).find('.argsSection.inactive').length);
            });

            var aggColNewText = [];
            $groups.each(function() {
                var aggCol = $(this).find('.argsSection').last()
                                            .find('.arg').eq(0).val().trim();
                aggCol = parseAggPrefixes(aggCol);
                aggCol = parseColPrefixes(aggCol);
                aggColNewText.push(aggCol);
            });

            var gbColOldText = $description.find(".groupByCols").text();
            var gbColNewText = "";
            var $args = $activeOpSection.find('.groupOnSection').find('.arg');
            $args.each(function() {
                if ($(this).val().trim() !== "") {
                    gbColNewText += ", " + $(this).val().trim();
                }
            });
            if (gbColNewText) {
                gbColNewText = gbColNewText.slice(2);
            }

            gbColNewText = parseAggPrefixes(gbColNewText);
            gbColNewText = parseColPrefixes(gbColNewText);

            if (noHighlight) {
                var html = "";
                $groups.each(function(groupNum) {
                    var fnName = $(this).find(".argsSection").last()
                                                            .data("fnname");
                    html += '<span class="aggColStrWrap">' +fnName + '(<span class="aggCols">' +
                                    wrapText(aggColNewText[groupNum]) +
                                    '</span>), </span>';
                });

                $description.find(".aggColSection").html(html);

                gbColNewText = wrapText(gbColNewText);
                $description.find(".groupByCols").html(gbColNewText);
            } else {
                $groups.each(function(groupNum) {
                    var $aggColWrap = $description.find(".aggCols").eq(groupNum);
                    var $aggColSpans = $aggColWrap.find('span.char');
                    var aggColOldText = $aggColWrap.text();

                    modifyDescText(aggColOldText, aggColNewText[groupNum],
                                    $aggColWrap, $aggColSpans);
                });
                var $gbColWrap = $description.find(".groupByCols");
                var $gbColSpans = $gbColWrap.find('span.char');
                modifyDescText(gbColOldText, gbColNewText, $gbColWrap,
                                $gbColSpans);
            }
        }

        return (tempText);
    }

    function wrapText(text) {
        var res = "";
        for (var i = 0; i < text.length; i++) {
            res += '<span class="char">' +
                        text[i] +
                    '</span>';
        }
        return res;
    }

    function modifyAndOrDescText(newText, andOrIndices, $spanWrap) {
        var descText = "";
        var spanClass;
        var andOrLen = 2;
        if ($operationsView.find(".switch").hasClass("on")) {
            andOrLen = 3;
        }
        for (var i = 0; i < newText.length; i++) {
            if (andOrIndices.indexOf(i) > -1) {
                for (var j = 0; j < andOrLen; j++) {
                    descText += '<span class="char visible">' + newText[i] +
                       '</span>';
                    i++;
                }
                i--; // inner for loop increments i 1 too many times
            } else {
                if (newText[i] === " ") {
                    spanClass = "space";
                } else {
                    spanClass = "";
                }
                descText += '<span class="char ' + spanClass + '">' +
                            newText[i] + '</span>';
            }
        }
        $spanWrap.html(descText);
        setTimeout(function() {
            $spanWrap.find('.visible').removeClass('visible');
        });
    }

    function modifyDescText(oldText, newText, $spanWrap, $spans) {
        var diff = findStringDiff(oldText, newText);
        if (diff.type !== "none") {
            var type = diff.type;
            var position;
            var tempText;
            var i;

            switch (type) {
                case ('remove'):
                // do nothing
                    position = diff.start;
                    for (i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }

                    break;
                case ('add'):
                    tempText = newText;
                    newText = "";
                    for (i = diff.start; i < diff.start + diff.added; i++) {
                        if (tempText[i] === " ") {
                            newText += "<span class='char visible space'>" +
                                    tempText[i] + "</span>";
                        } else {
                            newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";
                        }
                    }
                    if (diff.start === 0) {
                        $spanWrap.prepend(newText);
                    } else {
                        $spans.eq(diff.start - 1).after(newText);
                    }
                    break;
                case ('replace'):
                    tempText = newText;
                    position = diff.start;
                    newText = "";
                    for (i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }
                    for (i = diff.start; i < diff.start + diff.added; i++) {
                        if (tempText[i] === " ") {
                            newText += "<span class='char visible space'>" +
                                    tempText[i] + "</span>";
                        } else {
                            newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";
                        }

                    }
                    if (diff.start === 0) {
                        $spanWrap.prepend(newText);
                    } else {
                        $spans.eq(diff.start - 1).after(newText);
                    }

                    break;
                default:
                //nothing;
                    break;
            }

            // delay hiding the diff or else it won't have transition
            setTimeout(function() {
                $spanWrap.find('.visible').removeClass('visible');
            });

        } else {
            return;
        }
    }

    function isUDF() {
        if (operatorName !== "map") {
            return false;
        }
        return $functionsList.find(".active").data("category") ===
                                    FunctionCategoryT.FunctionCategoryUdf;
    }

    function getExistingTypes(groupNum) {
        var existingTypes = {};
        var arg;
        var $input;
        var type;
        var $group = $activeOpSection.find('.group').eq(groupNum);
        var funcName;
        if (operatorName === "filter") {
            funcName = $group.find('.functionsInput').val().trim();
        } else if (operatorName === "map") {
            funcName = $functionsList.find('.active').text().trim();
        }
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
            } else if (!$input.data("nofunc") && hasFuncFormat(arg)) {
                // skip
            } else if (xcHelper.hasValidColPrefix(arg)) {
                arg = parseColPrefixes(arg);
                type = getColumnTypeFromArg(arg);
            } else if (arg[0] === gAggVarPrefix) {
                // skip
            } else {
                var isString = formatArgumentInput(arg,
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

    // used in cases where arg could be type string and number
    function isNumberInQuotes(arg) {
        if (arg[0] === "'" || arg[0] === '"') {
            var quote = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1);
                var parsedVal = parseFloat(arg);
                if (!isNaN(parsedVal) && String(parsedVal) === arg) {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    // used in cases where arg could be type string and bool
    function isBoolInQuotes(arg) {
        if (arg[0] === "'" || arg[0] === '"') {
            var quote = arg[0];
            arg = arg.slice(1);
            if (arg.length > 1 && arg[arg.length - 1] === quote) {
                arg = arg.slice(0, arg.length - 1).toLowerCase();
                if (arg === "true" || arg === "false") {
                    return true;
                } else {
                    return false;
                }
            } else {
                return false;
            }

        } else {
            return false;
        }
    }

    function submitForm() {
        var deferred = jQuery.Deferred();
        var isPassing = true;

        if (!gTables[tableId] && !isEditMode) {
            statusBoxShowHelper(ErrTStr.TableNotExists,
                            $activeOpSection.find('.tableList'));
            return deferred.reject().promise();
        }
        if (!isEditMode && !gTables[tableId].isActive()) {
            statusBoxShowHelper(TblTStr.NotActive,
                            $activeOpSection.find('.tableList'));
            return PromiseHelper.reject();
        }
        var $groups = $activeOpSection.find('.group');

        // check if function name is valid (not checking arguments)
        $groups.each(function(groupNum) {
            if (!isOperationValid(groupNum)) {
                var inputNum = 0;
                if (operatorName === "group by") {
                    var $group = $activeOpSection.find(".group").eq(groupNum);
                    var $fnInput = $group.find('.functionsInput');
                    inputNum = $group.find('input').index($fnInput);
                }
                showErrorMessage(inputNum, groupNum);
                isPassing = false;
                return false;
            }
        });

        if (!isPassing) {
            return deferred.reject().promise();
        }

        var invalidInputs = [];

        if (!checkIfBlanksAreValid(invalidInputs)) {
            handleInvalidBlanks(invalidInputs);
            return deferred.reject().promise();
        }

        var multipleArgSets = [];
        var args = [];
        // get colType first
        $groups.each(function(i) {
            if ($(this).find('.argsSection.inactive').length) {
                return (true);
            }
            var existingTypes = getExistingTypes(i);
            var argFormatHelper = argumentFormatHelper(existingTypes, i);
            isPassing = argFormatHelper.isPassing;

            if (!isPassing) {
                return false;
            }
            args = argFormatHelper.args;
            multipleArgSets.push(args);
        });

        if (!isPassing) {
            return deferred.reject().promise();
        }

        formHelper.disableSubmit();

        // new column name duplication & validity check
        newColNameCheck(args)
        .then(function() {
            var hasMultipleSets = false;
            if (multipleArgSets.length > 1){
                args = multipleArgSets;
                hasMultipleSets = true;
            }
            return submitFinalForm(args, hasMultipleSets);
        })
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            formHelper.enableSubmit();
        });

        return deferred.promise();
    }

    function submitFinalForm(args, hasMultipleSets) {
        var deferred = jQuery.Deferred();
        var func = funcName;
        var funcLower = func;
        var isPassing;

        // all operations have their own way to show error StatusBox
        switch (operatorName) {
            case ('filter'):
            case ('map'):
                isPassing = true;
                break;
            case ('aggregate'):
                isPassing = aggregateCheck(args);
                break;
            case ('group by'):
                if (isEditMode) {
                    isPassing = true;
                } else {
                    isPassing = groupByCheck(args, hasMultipleSets);
                }
                break;
            default:
                showErrorMessage(0);
                isPassing = false;
                break;
        }

        if (isPassing) {
            var colTypeInfos;
            if (hasMultipleSets) {
                colTypeInfos = [];
                for (var i = 0; i < args.length; i++) {
                    colTypeInfos.push(getCastInfo(args[i], i));
                }
            } else {
                colTypeInfos = getCastInfo(args, 0);
            }

            var promise;
            switch (operatorName) {
                case ('aggregate'):
                    promise = aggregate(func, args, colTypeInfos);
                    break;
                case ('filter'):
                    var andOr;
                    if (hasMultipleSets) {
                        if ($operationsView.find(".switch").hasClass("on")) {
                            andOr = "and";
                        } else {
                            andOr = "or";
                        }
                    }
                    promise = filter(func, args, colTypeInfos, hasMultipleSets,
                                     andOr);
                    break;
                case ('group by'):
                    if (!hasMultipleSets) {
                        args = [args];
                        colTypeInfos = [colTypeInfos];
                    }
                    var funcs = [];
                    $activeOpSection.find(".group").each(function() {
                        var fName = $(this).find(".argsSection").last()
                                                            .data("fnname");
                        funcs.push(fName);
                    });
                    promise = groupBy(funcs, args, colTypeInfos);
                    break;
                case ('map'):
                    promise = map(funcLower, args, colTypeInfos);
                    break;
                default:
                    return PromiseHelper.reject();
            }

            promise
            .then(deferred.resolve)
            .fail(deferred.reject);

            closeOpSection();
        } else {
            deferred.reject();
        }

        return deferred.promise();
    }

    // new column name duplication & validity check
    function newColNameCheck(args) {
        var deferred = jQuery.Deferred();
        var $nameInput;
        var isPassing;

        switch (operatorName) {
            case ('map'):
                $nameInput = $activeOpSection.find('.arg:visible').last();
                if (isNewCol && colName !== "" &&
                    ($nameInput.val().trim() === colName)) {
                    isPassing = true; // input name matches new column name
                    // which is ok
                } else {
                    var checkOpts = {stripColPrefix: true,
                                     ignoreNewCol: isEditMode};
                    isPassing = !ColManager.checkColName($nameInput, tableId,
                                                        null, checkOpts);
                }
                if (isPassing) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
                break;
            case ('group by'):
                // check new col name
                $activeOpSection.find(".group").each(function() {
                    var $group = $(this);
                    var numArgs = $group.find('.arg:visible').length;
                    $nameInput = $group.find('.arg:visible').eq(numArgs - 1);
                    var checkOpts = {
                        strictDuplicates: true,
                        stripColPrefix: true
                    };

                    isPassing = !ColManager.checkColName($nameInput, tableId,
                                                        null, checkOpts);
                    if (isPassing && !$activeOpSection.find('.joinBack .checkbox')
                                    .hasClass('checked')) {
                        if (!isEditMode) {
                            isPassing = xcHelper.tableNameInputChecker(
                                        $activeOpSection.find('.newTableName'));
                        }

                    }
                    if (!isPassing) {
                        return false;
                    } else if (checkColNameUsedInInputs($nameInput.val(), $nameInput)) {
                        isPassing = false;
                        var text = ErrTStr.NameInUse;
                        statusBoxShowHelper(text, $nameInput);
                        return false;
                    }
                });

                // check new table name if join option is not checked

                if (isPassing) {
                    deferred.resolve();
                } else {
                    deferred.reject();
                }
                break;
            case ('aggregate'):
                if (args[1].length > 1 || isEditMode) {
                    checkAggregateNameValidity()
                    .then(function(isPassing) {
                        if (!isPassing) {
                            deferred.reject();
                        } else {
                            deferred.resolve();
                        }
                    })
                    .fail(function(error) {
                        console.error(error);
                        deferred.reject();
                    });
                } else {
                    deferred.resolve();
                }

                break;
            default:
                deferred.resolve();
                break;
        }

        return deferred.promise();
    }

    // returns an array of objects that include the new type and argument number
    function getCastInfo(args, groupNum) {
        var colTypeInfos = [];

        // set up colTypeInfos, filter out any that shouldn't be casted
        var $group = $activeOpSection.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function(i) {
            var $input = $(this);
            var hasEmpty = $input.closest('.row')
                                 .find('.emptyOptions .checked').length;
            var isCasting = $input.data('casted') && !hasEmpty;
            if (isCasting) {
                var cols = args[i].split(",");
                var casting = false;
                for (var j = 0; j < cols.length; j++) {
                    var progCol = table.getColByBackName(cols[j]);
                    if (progCol != null) {
                        isValid = true;
                        var castType = $input.data('casttype');
                        if (castType !== progCol.getType() && !casting) {
                            casting = true;
                            colTypeInfos.push({
                                "type": castType,
                                "argNum": i
                            });
                        }
                    } else {
                        console.error("Cannot find col", args[i]);
                    }
                }

            }
        });

        return colTypeInfos;
    }

    // returns an object that contains an array of formated arguments,
    // an object of each argument's column type
    // and a flag of whether all arguments are valid or not
    function argumentFormatHelper(existingTypes, groupNum) {
        var args = [];
        var isPassing = true;
        var colTypes;
        var allColTypes = [];
        var errorText;
        var $errorInput;
        var inputsToCast = [];
        var castText;
        var invalidNonColumnType = false; // when an input does not have a
        // a column name but still has an invalid type
        var $group = $activeOpSection.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function(inputNum) {
            var $input = $(this);
            // Edge case. GUI-1929

            var $row = $input.closest('.row');
            var noArgsChecked = $row.find('.noArg.checked').length > 0 ||
                                ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
            var emptyStrChecked = $row.find('.emptyStr.checked').length > 0;

            var arg = $input.val();
            var trimmedArg = arg.trim();
            // empty field and empty field is allowed
            if (trimmedArg === "") {
                if (noArgsChecked) {
                    if (isNoneInInput($input)) {
                        trimmedArg = "None";
                    }
                    args.push(trimmedArg);
                    return;
                } else if (emptyStrChecked) {
                    args.push('"' + arg + '"');
                    return;
                }
            }

            var typeid = $input.data('typeid');

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection") ||
                (!$input.data("nofunc") && hasFuncFormat(trimmedArg))) {
                arg = parseColPrefixes(trimmedArg);
            } else if (trimmedArg[0] === gAggVarPrefix) {
                arg = trimmedArg;
                // leave it
            } else if (xcHelper.hasValidColPrefix(trimmedArg)) {
                arg = parseColPrefixes(trimmedArg);
                if (!isEditMode) {
                    // if it contains a column name
                    // note that field like pythonExc can have more than one $col
                    // containsColumn = true;
                    var frontColName = arg;
                    var tempColNames = arg.split(",");
                    var backColNames = "";

                    for (var i = 0; i < tempColNames.length; i++) {
                        if (i > 0) {
                            backColNames += ",";
                        }
                        var backColName = getBackColName(tempColNames[i].trim());
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
                    if (!isUDF()) {
                        var types;
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
                            colTypes = getAllColumnTypesFromArg(frontColName);
                            types = parseType(typeid);
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
                            var isCasted = $input.data('casted');
                            if (!isCasted) {
                                var numTypes = colTypes.length;

                                for (var i = 0; i < numTypes; i++) {
                                    if (colTypes[i] == null) {
                                        console.error("colType is null/col not " +
                                            "pulled!");
                                        continue;
                                    }

                                    errorText = validateColInputType(types,
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
                var checkRes = checkArgTypes(trimmedArg, typeid);

                if (checkRes != null && !invalidNonColumnType) {
                    isPassing = false;
                    invalidNonColumnType = true;
                    if (checkRes.currentType === "string" &&
                        hasUnescapedParens($input.val())) {
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
                    var formatArgumentResults = formatArgumentInput(arg,
                                                        typeid,
                                                        existingTypes);
                    arg = formatArgumentResults.value;
                }
            }

            args.push(arg);
        });

        if (!isPassing) {
            var isInvalidColType;
            if (inputsToCast.length) {
                errorText = castText;
                isInvalidColType = true;
                $errorInput = $group.find(".arg:visible").eq(inputsToCast[0]);
            } else {
                isInvalidColType = false;
            }
            handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                              allColTypes, inputsToCast);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    function handleInvalidArgs(isInvalidColType, $errorInput, errorText, groupNum,
                                       allColTypes, inputsToCast) {
        if (isInvalidColType) {
            var castIsVisible = $activeOpSection.find('.group').eq(groupNum)
                                                .find('.cast')
                                                .hasClass('showing');
            showCastRow(allColTypes, groupNum, inputsToCast)
            .then(function() {
                if (!castIsVisible) {
                    var $castDropdown = $errorInput.closest('.inputWrap')
                                        .siblings('.cast')
                                        .find('.dropDownList:visible');
                    if ($castDropdown.length) {
                        $errorInput = $castDropdown.find('input');
                    }
                    statusBoxShowHelper(errorText, $errorInput);
                }
            });
            if (castIsVisible) {
                var $cast = $errorInput.closest(".inputWrap").siblings(".cast");
                $cast.addClass("noAnim");
                var $castDropdown = $cast.find('.dropDownList:visible');
                if ($castDropdown.length) {
                    $errorInput = $castDropdown.find('input');
                }
                statusBoxShowHelper(errorText, $errorInput);
            }
        } else {
            resetCastOptions($errorInput);
            updateStrPreview();
            statusBoxShowHelper(errorText, $errorInput);
        }
    }

    function showCastRow(allColTypes, groupNum, inputsToCast) {
        var deferred = jQuery.Deferred();
        getProperCastOptions(allColTypes);

        var isCastAvailable = displayCastOptions(allColTypes, groupNum, inputsToCast);
        $activeOpSection.find('.cast .list li').show();

        if (isCastAvailable) {
            var $castable = $activeOpSection
                            .find('.cast .dropDownList:not(.hidden)').parent();
            $castable.addClass('showing');
            $activeOpSection.find('.group').eq(groupNum)
                            .find('.cast .dropDownList:not(.colNameSection)')
                            .removeClass('hidden');

            setTimeout(function() {
                if ($activeOpSection.find('.cast.showing').length) {
                    $castable.addClass('overflowVisible');
                }

                deferred.resolve();
            }, 250);
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function getProperCastOptions(allColTypes) {
        var inputColTypes;
        var requiredTypes;
        var inputNum;
        var castTypes;
        for (var i = 0; i < allColTypes.length; i++) {
            inputColTypes = allColTypes[i];
            inputNum = inputColTypes.inputNum;
            if (inputNum === undefined) {
                return;
            }
            // this wil hold the valid column types that the current input can
            // be casted to
            inputColTypes.filteredTypes = [];
            requiredTypes = inputColTypes.requiredTypes;

            // check if each valid column type can be applied to the current
            // column type that is in the input
            for (var j = 0; j < requiredTypes.length; j++) {
                var isValid = true;
                for (var k = 0; k < inputColTypes.inputTypes.length; k++) {
                    castTypes = castMap[inputColTypes.inputTypes[k]];
                    if (!castTypes ||
                        castTypes.indexOf(requiredTypes[j]) === -1) {
                        isValid = false;
                        break;
                    }
                }

                if (isValid) {
                    inputColTypes.filteredTypes.push(requiredTypes[j]);
                }
            }
        }
    }

    function displayCastOptions(allColTypes, groupNum, inputsToCast) {
        var $castWrap = $activeOpSection.find('.group').eq(groupNum)
                                                       .find('.cast');
        var $castDropdowns = $castWrap.find('.dropDownList');
        $castDropdowns.addClass('hidden');
        var lis;
        var castAvailable = false;
        var start = 0;
        if (operatorName === "group by") {
            // ignore "index on" args
            // start = allColTypes.length - 1;
        }
        var inputNum;
        for (var i = start; i < allColTypes.length; i++) {
            if (allColTypes[i].filteredTypes &&
                allColTypes[i].filteredTypes.length &&
                inputsToCast.indexOf(allColTypes[i].inputNum) > -1) {
                castAvailable = true;
                lis = "<li class='default'>default</li>";
                inputNum = allColTypes[i].inputNum;
                // if (operatorName === "group by") {
                //     // have to adjust because in groupby, cast dropdowns
                //     // and args indexes don't match up
                //     inputNum -= (allColTypes.length - 1);
                // }
                $castDropdowns.eq(inputNum).removeClass('hidden');
                for (var j = 0; j < allColTypes[i].filteredTypes.length; j++) {
                    lis += "<li>" + allColTypes[i].filteredTypes[j] + "</li>";
                }
                $castDropdowns.eq(inputNum).find('ul').html(lis);
            }
        }
        return (castAvailable);
    }

    // $input is an $argInput
    function resetCastOptions($input) {
        $input.closest('.inputWrap').next().find('input').val('default')
                                                .attr("data-casted", false);
        $input.data('casted', false);
        $input.data('casttype', null);
    }

    function hideCastColumn(groupIndex) {
        var $target;
        if (groupIndex != null) {
            $target = $activeOpSection.find('.group').eq(groupIndex);
            if (operatorName === "group by") {
                $target = $target.find(".argsSection").last();
            }
        } else {
            $target = $operationsView;
        }
        $target.find('.cast').removeClass('showing overflowVisible');
    }

    function aggregateCheck(args) {
        if (isEditMode) {
            return true;
        }
        if (!hasFuncFormat(args[0])) {
            var aggColNum = getColNum(args[0]);
            if (aggColNum < 1) {
                statusBoxShowHelper(ErrTStr.InvalidColName,
                                $activeOpSection.find('.arg').eq(0));
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    function aggregate(aggrOp, args, colTypeInfos) {
        var deferred = jQuery.Deferred();
        var aggColNum;
        var tableCol;
        var aggStr;
        if (isEditMode) {
            aggStr = args[0];
        } else if (!hasFuncFormat(args[0])) {
            aggColNum = getColNum(args[0]);
            tableCol = table.getCol(aggColNum);
            aggStr = tableCol.getBackColName();
        } else {
            aggStr = args[0];
            aggColNum = getColNumFromFunc(aggStr);
        }

        var aggName = args[1];
        if (colTypeInfos.length) {
            aggStr = xcHelper.castStrHelper(args[0], colTypeInfos[0].type);
        }
        if (aggName.length < 2) {
            aggName = null;
        }
        var options = {
            formOpenTime: formHelper.getOpenTime()
        };

        if (isEditMode) {
            DagEdit.store({
                args: {
                    "eval": [{
                        "evalString": aggrOp + "(" + aggStr + ")",
                        "newField": ""
                    }],
                    "dest": aggName.slice(gAggVarPrefix.length)
                }
            });
            deferred.resolve();
        } else {
            var startTime = Date.now();
            xcFunction.aggregate(aggColNum, tableId, aggrOp, aggStr, aggName,
                                 options)
            .then(deferred.resolve)
            .fail(function(error) {
                submissionFailHandler(startTime, error);
                deferred.reject();
            });
        }

        return deferred.promise();
    }

    function filter(operator, args, colTypeInfos, hasMultipleSets, andOr) {
        var deferred = jQuery.Deferred();
        var filterColNum;
        var firstArg;
        if (hasMultipleSets) {
            firstArg = args[0][0];
        } else {
            firstArg = args[0];
        }

        if (!hasFuncFormat(firstArg)) {
            filterColNum = getColNum(firstArg);
        } else {
            filterColNum = getColNum(triggerColName);
        }
        if (filterColNum == null || filterColNum < 0) {
            filterColNum = getColNum(triggerColName);
        }

        var filterString = formulateMapFilterString(operator, args,
                                                    colTypeInfos,
                                                    hasMultipleSets, andOr);

        var startTime = Date.now();

        if (isEditMode) {
            DagEdit.store({
                args: {
                    "eval": [{"evalString": filterString, "newField": ""}]
                }
            });
            deferred.resolve();
        } else {
            xcFunction.filter(filterColNum, tableId, {
                filterString: filterString,
                formOpenTime: formHelper.getOpenTime()
            })
            .then(deferred.resolve)
            .fail(function(error) {
                submissionFailHandler(startTime, error);
                deferred.reject();
            });
        }


        return deferred.promise();
    }

    function getColNum(backColName) {
        return table.getColNumByBackName(backColName);
    }

    function groupBy(operators, args, colTypeInfos) {
        // Current groupBy args has at least 3 arguments:
        // 1. agg col
        // 2. grouby col(cols)
        // 3. new col name

        var deferred = jQuery.Deferred();
        colTypeInfos = colTypeInfos || [];
        var gbArgs = [];
        var groupByCols = [];
        var gbCol;
        var colTypeInfo;
        for (var i = 0; i < args[0].length - 2; i++) {
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

        var operatorsFound = {};
        for (var i = 0; i < args.length; i++) {
            var numArgs = args[i].length;
            var aggColIndex = numArgs - 2;
            var aggCol = args[i][aggColIndex];

            // avoid duplicate operator-aggCol pairs
            // using # as delimiter
            if (operatorsFound[operators[i] + "#" + aggCol]) {
                continue;
            }
            operatorsFound[operators[i] + "#" + aggCol] = true;

            gbArgs.push({
                operator: operators[i],
                aggColName: aggCol,
                newColName: args[i][numArgs - 1],
                cast: null
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

        var isIncSample = $activeOpSection.find('.incSample .checkbox')
                                    .hasClass('checked');
        var isJoin = $activeOpSection.find('.joinBack .checkbox')
                                    .hasClass('checked');
        var icvMode = $activeOpSection.find(".icvMode .checkbox")
                                    .hasClass("checked");

        var isKeepOriginal = $activeOpSection.find(".keepTable .checkbox")
                                             .hasClass("checked");
        var colsToKeep = [];

        if (isIncSample) {
            $activeOpSection.find('.cols li.checked').each(function() {
                colsToKeep.push($(this).data("colnum"));
            });
        }

        var dstTableName;
        if (isJoin) {
            dstTableName = null;
        } else {
            dstTableName = $activeOpSection.find('.newTableName').val().trim();
        }

        var options = {
            "isIncSample": isIncSample,
            "isJoin": isJoin,
            "icvMode": icvMode,
            "isKeepOriginal": isKeepOriginal,
            "formOpenTime": formHelper.getOpenTime(),
            "dstTableName": dstTableName,
            "columnsToKeep": colsToKeep
        };
        if (options.isIncSample && options.isJoin) {
            console.warn('shouldnt be able to select incSample and join');
            options.isIncSamples = false;
        }
        if (options.isJoin && options.isKeepOriginal) {
            console.warn('shouldnt be able to select join and keep table');
            options.isJoin = false;
        }

        if (isEditMode) {
            var evals = [];
            for (var i = 0; i < gbArgs.length; i++) {
                var op = gbArgs[i].operator;
                op = op.slice(0, 1).toLowerCase() + op.slice(1);
                var evalStr = op + "(" + gbArgs[i].aggColName + ")";
                evals.push({
                    "evalString": evalStr,
                    "newField": gbArgs[i].newColName
                });
            }

            DagEdit.store({
                args: {
                    "eval": evals,
                    "icv": icvMode,
                    "includeSample": isIncSample,
                    "newKeyField": ""
                },
                indexFields: groupByCols.map(function(colInfo) {
                    return colInfo.colName;
                })
            });
            deferred.resolve();
        } else {
            var startTime = Date.now();
            xcFunction.groupBy(tableId, gbArgs, groupByCols, options)
            .then(deferred.resolve)
            .fail(function(error) {
                submissionFailHandler(startTime, error);
                deferred.reject();
            });
        }

        return deferred.promise();
    }

    function groupByCheck(args, hasMultipleGroups) {
        if (!hasMultipleGroups) {
            args = [args];
        }
        var isValid = true;
        $activeOpSection.find(".group").each(function(groupNum) {
            var numArgs = args[groupNum].length;
            var groupbyColName = args[groupNum][numArgs - 2];
            var singleArg = true;

            var $groupByInput = $activeOpSection.find(".group").eq(groupNum)
                                                .find('.argsSection').last()
                                                .find('.arg').eq(0);
            var isGroupbyColNameValid;
            if (!hasFuncFormat(groupbyColName)) {
                isGroupbyColNameValid = checkValidColNames($groupByInput,
                                                        groupbyColName, singleArg);
            } else {
                isGroupbyColNameValid = true;
            }

            if (!isGroupbyColNameValid) {
                isValid = false;
                return false;
            } else if (groupNum === 0) {
                var indexedColNames;
                var $input;
                var areIndexedColNamesValid = false;
                for (var i = 0; i < numArgs - 2; i++) {
                    indexedColNames = args[groupNum][i];
                    $input = $activeOpSection.find('.gbOnArg').eq(i);
                    areIndexedColNamesValid = checkValidColNames($input,
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

    function map(operator, args, colTypeInfos) {
        var deferred = jQuery.Deferred();
        var numArgs = args.length;
        var newColName = args.splice(numArgs - 1, 1)[0];
        var mapStr = formulateMapFilterString(operator, args, colTypeInfos);
        var mapOptions = {
            formOpenTime: formHelper.getOpenTime()
        };
        if (isNewCol) {
            mapOptions.replaceColumn = true;
            if (colName === "") {
                var width = xcHelper.getTextWidth(null, newColName);
                mapOptions.width = width;
            }
        }

        var startTime = Date.now();

        var icvMode = $("#operationsView .map .icvMode .checkbox")
                        .hasClass("checked");

        var hasWeirdQuotes = (mapStr.indexOf("“") > -1 ||
                              mapStr.indexOf("”") > -1);

        var colNum = getColNum(triggerColName);
        if (isEditMode) {
            DagEdit.store({
                args: {
                    "eval": [{"evalString": mapStr, "newField": newColName}],
                    "icv": icvMode
                }
            });
            deferred.resolve();
        } else {
            xcFunction.map(colNum, tableId, newColName, mapStr, mapOptions, icvMode)
            .then(deferred.resolve)
            .fail(function(error) {
                submissionFailHandler(startTime, error,
                                      {"hasWeirdQuotes": hasWeirdQuotes});
                deferred.reject();
            });
        }


        return deferred.promise();
    }
    //show alert to go back to op view
    function submissionFailHandler(startTime, error, options) {
        if (error) {
            if (error === StatusTStr[StatusT.StatusCanceled] ||
                error.status === StatusT.StatusCanceled) {
                // no error message if failed because of cancel
                return;
            }
        }
        var endTime = Date.now();
        var elapsedTime = endTime - startTime;
        var timeSinceLastClick = endTime - gMouseEvents.getLastMouseDownTime();
        if (timeSinceLastClick < elapsedTime) {
            return;
        }
        var origMsg = $("#alertContent .text").text().trim();
        if (origMsg.length && origMsg[origMsg.length - 1] !== ".") {
            origMsg += ".";
        }
        var newMsg = origMsg;
        if (origMsg.length) {
            newMsg += "\n";
        }
        newMsg += xcHelper.replaceMsg(OpModalTStr.ModifyDesc, {
            name: operatorName
        });
        var btnText = xcHelper.replaceMsg(OpModalTStr.ModifyBtn, {
            name: operatorName.toUpperCase()
        });
        var title;
        var btnClass = "";
        switch (operatorName) {
            case "filter":
                title = StatusMessageTStr.FilterFailedAlt;
                break;
            case "map":
                title = StatusMessageTStr.MapFailed;
                if (options.hasWeirdQuotes) {
                    newMsg += "\n" + OpModalTStr.WeirdQuotes;
                }
                break;
            case "group by":
                title = StatusMessageTStr.GroupByFailed;
                btnClass = "larger";
                break;
            default:
                return;
        }

        Alert.error(title, newMsg, {
            buttons: [{
                name: btnText,
                className: btnClass,
                func: function() {
                    OperationsView.show(null , null , null , {restore: true});
                }
            }]
        });
    }

    // hasMultipleSets: boolean, true if there are multiple groups of arguments
    // such as gt(a, 2) && lt(a, 5)
    function formulateMapFilterString(operator, args, colTypeInfos,
                                      hasMultipleSets, andOr) {
        var str = "";
        var argNum;
        var argGroups = [];
        var colTypeGroups = [];
        if (!hasMultipleSets) {
            argGroups.push(args);
            colTypeGroups.push(colTypeInfos);
        } else {
            argGroups = args;
            colTypeGroups = colTypeInfos;
        }
        for (var i = 0; i < colTypeGroups.length; i++) {
            for (var j = 0; j < colTypeGroups[i].length; j++) {
                argNum = colTypeGroups[i][j].argNum;
                var colNames = argGroups[i][argNum].split(",");
                var colStr = "";
                for (var k = 0; k < colNames.length; k++) {
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
        for (var i = 0; i < argGroups.length; i++) {
            var fName;
            if (operatorName === "filter") {
                fName = $activeOpSection.find('.group').eq(i)
                                            .find('.functionsInput').val()
                                            .trim();
            } else {
                fName = operator;
            }

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

            var numNonBlankArgs = 0;
            // loop through arguments within a group
            for (var j = 0; j < argGroups[i].length; j++) {
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

        for (var i = 0; i < argGroups.length - 1; i++) {
            str += ")";
        }
        return (str);
    }

    // looks for columnNames and figures out column type
    function getColumnTypeFromArg(value) {
        // if value = "col1, col2", it only check col1
        value = value.split(",")[0];
        var spaces = jQuery.trim(value);
        if (spaces.length > 0) {
            value = spaces;
        }
        var colType = null;
        var progCol = table.getColByFrontName(value);
        if (progCol != null) {
            colType = progCol.getType();
        }

        return colType;
    }

    function getAllColumnTypesFromArg(argValue) {
        var values = argValue.split(",");
        var types = [];

        values.forEach(function(value) {
            var trimmedVal = value.trim();
            if (trimmedVal.length > 0) {
                value = trimmedVal;
            }

            var progCol = table.getColByFrontName(value);
            if (progCol == null) {
                console.error("cannot find col", value);
                return;
            }

            // var backName = progCol.getBackColName();
            var colType = progCol.getType();
            if (colType === ColumnType.integer && !progCol.isKnownType()) {
                // for fat potiner, we cannot tell float or integer
                // so for integer, we mark it
                colType = ColumnType.number;
            }

            types.push(colType);
        });

        return types;
    }

    // used for args with column names provided like $col1, and not "hey" or 3
    function validateColInputType(requiredTypes, inputType, $input) {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
        } else if (inputType === ColumnType.mixed) {
            if ($input.hasClass("gbOnArg")) {
                return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                    "type1": castMap[ColumnType.mixed].join("/"),
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
                    hasUnescapedParens($input.val())) {
            // function-like string found but invalid format
            return ErrTStr.InvalidFunction;
        } else {
            return xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                "type1": requiredTypes.join("/"),
                "type2": inputType
            });
        }
    }

    // used in groupby to check if inputs have column names that match any
    // that are found in gTables.tableCols
    function checkValidColNames($input, colNames, single) {
        var text;

        if (typeof colNames !== "string") {
            text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colNames
            });
            statusBoxShowHelper(text, $input);
            return (false);
        }
        var values = colNames.split(",");
        var numValues = values.length;
        if (single && numValues > 1) {
            text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colNames
            });
            statusBoxShowHelper(text, $input);
            return (false);
        }

        var value;
        var trimmedVal;
        for (var i = 0; i < numValues; i++) {
            value = values[i];
            trimmedVal = value.trim();
            if (trimmedVal.length > 0) {
                value = trimmedVal;
            }

            if (!table.hasColWithBackName(value)) {
                if (value.length === 2 && value.indexOf('""') === 0) {
                    text = ErrTStr.NoEmpty;
                } else {
                    text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                        "name": value.replace(/\"/g, '')
                    });
                }

                statusBoxShowHelper(text, $input);
                return (false);
            }
        }
        return (true);
    }

    function checkAggregateNameValidity() {
        var deferred = jQuery.Deferred();
        // Name input is always the 2nd input
        var $input = $activeOpSection.find('.arg').eq(1);
        var val = $input.val().trim();
        var errorTitle;
        var invalid = false;
        if (val[0] !== gAggVarPrefix) {
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
            showInvalidAggregateName($input, errorTitle);
            deferred.resolve(false);
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
                    showInvalidAggregateName($input, errorTitle);
                    deferred.resolve(false);
                } else {
                    deferred.resolve(true);
                }
            })
            .fail(function() {
                deferred.resolve(true);
            });
        }
        return deferred.promise();
    }

    function showInvalidAggregateName($input, errorTitle) {
        var $toolTipTarget = $input.parent();

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

    // used for non column name args such as "hey" or 3, not $col1
    // returning null means no problem found
    // returning an object means there was a type mismatch
    function checkArgTypes(arg, typeid) {
        var types = parseType(typeid);
        var argType = "string";

        if (types.indexOf(ColumnType.string) > -1 ||
            types.indexOf(ColumnType.mixed) > -1)
        {
            // if it accepts string/mixed, any input should be valid
            return null;
        }

        var tmpArg = arg.toLowerCase();
        var isNumber = !isNaN(Number(arg));
        var canBeBooleanOrNumber = false;

        // boolean is a subclass of number
        if (tmpArg === "true" || tmpArg === "false" ||
            tmpArg === "t" || tmpArg === "f" || isNumber)
        {
            canBeBooleanOrNumber = true;
            argType = "string/boolean/integer/float";
        }

        if (types.indexOf(ColumnType.boolean) > -1) {
            // if arg doesn't accept strings but accepts booleans,
            // then the provided value needs to be a booleanOrNumber
            if (canBeBooleanOrNumber) {
                return null;
            } else {
                return {
                    "validType": types,
                    "currentType": argType
                };
            }
        }

        // the remaining case is float and integer, both is number
        tmpArg = Number(arg);

        if (!isNumber) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        if (types.indexOf(ColumnType.float) > -1) {
            // if arg is integer, it could be a float
            return null;
        }

        if (types.indexOf(ColumnType.integer) > -1) {
            if (tmpArg % 1 !== 0) {
                return {
                    "validType": types,
                    "currentType": ColumnType.float
                };
            } else {
                return null;
            }
        }

        if (types.length === 1 && types[0] === ColumnType.undefined) {
            return {
                "validType": types,
                "currentType": argType
            };
        }

        return null; // no known cases for this
    }

    function checkIfBlanksAreValid(invalidInputs) {
        var hasValidBlanks = true;
        $activeOpSection.find('.arg:visible').each(function() {
            var $input = $(this);
            var val = $input.val().trim();
            var untrimmedVal = $input.val();
            if (val === gColPrefix || val === gAggVarPrefix) {
                // the prefix only without escaping is invalid,
                // handle it as empty val
                val = "";
                untrimmedVal = "";
            }

            if (val !== "") {
                // not blank so no need to check. move on to next input.
                return;
            }
            var $row = $input.closest('.row');
            var noArgsChecked = $row.find('.noArg.checked').length > 0 ||
                                ($row.hasClass("boolOption") &&
                                !$row.find(".boolArg").hasClass("checked"));
            var emptyStrChecked = $row.find('.emptyStr.checked').length > 0;
            var hasEmptyStrCheckedOption = $row.find('.emptyStr').length;

            if (noArgsChecked || emptyStrChecked ||
                (operatorName === "aggregate" &&
                $input.closest('.colNameSection').length)) {
               // blanks are ok
            } else if (untrimmedVal.length === 0 || !hasEmptyStrCheckedOption) {
                hasValidBlanks = false;
                invalidInputs.push($input);
                // stop iteration
                return false;
            }
        });

        return (hasValidBlanks);
    }

    function handleInvalidBlanks(invalidInputs) {
        var $input = invalidInputs[0];
        var hasEmptyOption = !$input.closest('.colNameSection').length &&
                             !$input.closest('.gbOnRow').length &&
                             (!$input.closest(".required").length ||
                              $input.closest(".row").find(".emptyStr").length);
        var errorMsg;
        if (hasEmptyOption) {
            showEmptyOptions($input);
            errorMsg = ErrTStr.NoEmptyOrCheck;
        } else {
            errorMsg = ErrTStr.NoEmpty;
        }
        statusBoxShowHelper(errorMsg, $input);
        formHelper.enableSubmit();
    }

    function getColNumFromFunc(str) {
        // assume we're passing in a valid func
        var parenIndex = str.indexOf("(");
        str = str.slice(parenIndex + 1);
        var colName = "";
        var colNum = null;
        for (var i = 0; i < str.length; i++) {
            if (str[i] === "," || str[i] === " " || str[i] === ")") {
                break;
            } else {
                colName += str[i];
            }
        }
        if (colName.length) {
            colNum = getColNum(colName);
            if (colNum === -1) {
                colNum = null;
            }
        }
        return (colNum);
    }

    function showEmptyOptions($input) {
        $input.closest('.row').find('.noArgWrap, .emptyStrWrap').removeClass('xc-hidden');
    }

    function hideEmptyOptions($input) {
        $input.closest('.row').find('.checkboxWrap').addClass('xc-hidden')
                              .find('.checkbox').removeClass('checked');
    }

    function addBoolCheckbox($input) {
        $input.closest(".row").addClass("boolOption").find(".inputWrap")
                                                     .addClass("semiHidden");
        var html = '<div class="checkboxWrap boolArgWrap">' +
                        '<span class="checkbox boolArg" >'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                    '</div>';
        $input.closest(".row").append(html);
    }

    function formatArgumentInput(value, typeid, existingTypes) {
        var strShift    = 1 << DfFieldTypeT.DfString;
        var numberShift =
                        (1 << DfFieldTypeT.DfInt32) |
                        (1 << DfFieldTypeT.DfUInt32) |
                        (1 << DfFieldTypeT.DfInt64) |
                        (1 << DfFieldTypeT.DfUInt64) |
                        (1 << DfFieldTypeT.DfFloat32) |
                        (1 << DfFieldTypeT.DfFloat64);
        var boolShift = 1 << DfFieldTypeT.DfBoolean;

        // when field accept
        var shouldBeString  = (typeid & strShift) > 0;
        var shouldBeNumber = (typeid & numberShift) > 0;
        var shouldBeBoolean = (typeid & boolShift) > 0;
        var isNumberAsString;
        var isBoolAsString;

        if (shouldBeString) {
            // handle edge case
            var parsedVal = parseFloat(value);
            if (!isNaN(parsedVal) &&
                parsedVal === Number(value) &&
                shouldBeNumber)
            {
                // the case that the field accepts both string and number and
                // it fills in a number, should depends on the existingTypes

                // XXX potential bug is that existingTypes
                // has both string and number
                shouldBeString = existingTypes.hasOwnProperty(ColumnType.string);
                if (!shouldBeString) {
                    // when its number
                    value = parsedVal;
                }
            } else if (isNumberInQuotes(value)) {
                if (shouldBeNumber) {
                    isNumberAsString = true;
                }
                // keep value as is
            } else if (isBoolInQuotes(value)) {
                if (shouldBeBoolean) {
                    isBoolAsString = true;
                }
            } else if (shouldBeBoolean) {
                var valLower = ("" + value).toLowerCase();
                if (valLower === "true" || valLower === "false") {
                    shouldBeString = false;
                }
            }
        }

        value = parseAggPrefixes(value);
        value = parseColPrefixes(value);
        if (shouldBeString) {
            if (!isNumberAsString && !isBoolAsString) {
                // add quote if the field support string
                value = "\"" + value + "\"";
                // stringify puts in too many slashes
            }
        } else if (shouldBeNumber) {
            var tempValue = "" + value; // Force string to provide indexOf
            if (tempValue.indexOf(".") === 0) {
                value = "0" + value;
            }
        } else {
            if (typeof value === ColumnType.string) {
                value = value.trim();
            }
        }

        return ({value: value, isString: shouldBeString});
    }

    function parseType(typeId) {
        var types = [];
        var typeShift;

        // string
        typeShift = 1 << DfFieldTypeT.DfString;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.string);
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.integer);
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.float);
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.boolean);
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.mixed);
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.undefined);
        }

        return (types);
    }

    function fillInputPlaceholder() {
        var $inputs = $activeOpSection.find('.autocomplete');
        $inputs.each(function() {
            var placeholderText = $(this).siblings('.list').find('li')
                                          .eq(0).text();
            $(this).attr('placeholder', placeholderText);
        });
    }

    function getBackColName(frontColName) {
        var progCol = table.getColByFrontName(frontColName);
        if (progCol != null) {
            return progCol.getBackColName();
        } else {
            // XXX Cheng: it's an error case.
            // is this the correct way to handle it?
            return frontColName;
        }
    }

    function getAutoGenColName(name) {
        var limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        var newName = name;

        var tries = 0;
        while (tries < limit && (table.hasCol(newName, "") ||
            checkColNameUsedInInputs(newName))) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    function checkColNameUsedInInputs(name, $inputToIgnore) {
        name = xcHelper.stripColName(name);
        var $inputs = $activeOpSection.find(".resultantColNameRow")
                                      .find("input");
        var dupFound = false;
        $inputs.each(function() {
            if ($inputToIgnore && $(this).is($inputToIgnore)) {
                return;
            }
            var val = $(this).val();
            if (val === name) {
                dupFound = true;
                return false;
            }
        });
        return dupFound;
    }

    function listHighlightListener(event) {
        var $list = $operationsView.find('.functionsList')
                                    .find('.list:visible');
        if ($list.length !== 0) {
            var $input = $list.siblings('input');
            switch (event.which) {
                case (keyCode.Down):
                case (keyCode.Up):
                    formHelper.listHighlight($input, event);
                    break;
                case (keyCode.Right):
                    $input.trigger(fakeEvent.enter);
                    break;
                case (keyCode.Enter):
                    if (!$input.is(':focus')) {
                        event.stopPropagation();
                        event.preventDefault();
                        $input.trigger(fakeEvent.enter);
                    }
                    break;
                case (keyCode.Tab):
                    hideDropdowns();
                    break;
                default:
                    break;
            }
        } else {
            if (event.which === keyCode.Tab) {
                hideDropdowns();
            }
        }
    }

    function hasFuncFormat(val) {
        if (typeof val !== ColumnType.string) {
            return false;
        }
        val = val.trim();
        var valLen = val.length;

        if (valLen < 3) { // must be at least this long: a()
            return false;
        }

        //check if has opening and closing parens
        if (val.indexOf("(") > -1 && val.indexOf(")") > -1) {
            // check that val doesnt start with parens and that it does end
            // with parens
            if (val.indexOf("(") !== 0 &&
                val.lastIndexOf(")") === (valLen - 1)) {
                return (xcHelper.checkMatchingBrackets(val).index === -1);
            } else {
                return false;
            }
        } else {
            return false;
        }
        return false;
    }

    // checks to see if value has at least one parentheses that's not escaped
    // or inside quotes
    function hasUnescapedParens(val) {
        var inQuotes = false;
        for (var i = 0; i < val.length; i++) {
            if (inQuotes) {
                if (val[i] === '"') {
                    inQuotes = false;
                } else if (val[i] === '\\') {
                    i++; // ignore next character
                }
                continue;
            }
            if (val[i] === '"') {
                inQuotes = true;
            } else if (val[i] === '\\') {
                i++; // ignore next character
            } else if (val[i] === "(" || val[i] === ")") {
                return (true);
            }
        }
        return (false);
    }

    function parseColPrefixes(str) {
        for (var i = 0; i < str.length; i++) {
            if (str[i] === gColPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                } else if (isActualPrefix(str, i)) {
                    str = str.slice(0, i) + str.slice(i + 1);
                }
            }
        }
        return (str);
    }

    function parseAggPrefixes(str) {
        for (var i = 0; i < str.length; i++) {
            if (str[i] === gAggVarPrefix) {
                if (str[i - 1] === "\\") {
                    str = str.slice(0, i - 1) + str.slice(i);
                }
            }
        }
        return (str);
    }

    // returns true if previous character, not including spaces, is either
    // a comma, a (, or the very beginning
    function isActualPrefix(str, index) {
        for (var i = index - 1; i >= 0; i--) {
            if (str[i] === ",") {
                return (true);
            } else if (str[i] === "(") {
                return (true);
            } else if (str[i] !== " ") {
                return (false);
            }
        }
        return (true);
    }

    function closeOpSection() {
        // highlighted column sticks out if we don't close it early
        $(".xcTable").find('.modalHighlighted').removeClass('modalHighlighted');
        toggleOperationsViewDisplay(true);
        formHelper.removeWaitingBG();
        enableInputs();
        formHelper.hideView();
        $activeOpSection.addClass('xc-hidden');

        formHelper.clear();
        $(document).off('click.OpSection');
        $(document).off("keydown.OpSection");
        $(document).off('mousedown.mapCategoryListener');
    }

    function resetForm() {
        // clear filter map function input
        $('#mapFilter').val("");

        // clear function list input
        $operationsView.find('.functionsInput').attr('placeholder', "")
                                               .data("value", "")
                                               .val("");
        // clear functions list menu
        $operationsView.find('.genFunctionsMenu').data('category', 'null');
        $functionsList.empty();

         // clear function description text
        $operationsView.find('.descriptionText').empty();

        // hide cast dropdownlists
        $operationsView.find('.cast').find('.dropDownList')
                                     .addClass('hidden');
        hideCastColumn();

        $operationsView.find('.argsSection:not(.groupOnSection)')
                       .addClass('inactive');
        $operationsView.find('.newTableNameRow').addClass('inactive')
                       .find('.newTableName').val("");

        // empty all checkboxes except keeptable checkbox
        $operationsView.find(".checkbox").filter(function() {
            return !$(this).parent().hasClass("keepTable");
        }).removeClass("checked");
        $operationsView.find('.icvMode').addClass('inactive');
        $operationsView.find('.gbCheckboxes').addClass('inactive');
        $operationsView.find(".advancedSection").addClass("inactive");
        $operationsView.find(".groupByColumnsSection").addClass("xc-hidden");

        $operationsView.find('.arg').val("");

        // remove "additional arguments" inputs
        $operationsView.find('.extraArg').remove();

        // for filter, unminimize first argument box
        $operationsView.find('.group').removeClass('minimized fnInputEmpty');
        $operationsView.find(".advancedSection").addClass('collapsed')
                                                .removeClass('expanded');

        $operationsView.find(".andOrToggle").hide();

        fillTableList();
        if (operatorName === "group by") {
            var listHtml = getTableColList();
            $activeOpSection.find(".cols").html(listHtml);
            $activeOpSection.find(".selectAllCols")
                            .removeClass('checked');
            focusedColListNum = null;
            $activeOpSection.find('.group').each(function(i) {
                if (i !== 0) {
                    removeGroup($(this), true);
                }
            });
        } else if (operatorName === "filter") {
            $activeOpSection.find('.group').each(function(i) {
                if (i !== 0) {
                    removeGroup($(this), true);
                }
            });
        }

        // clear string preview
        $operationsView.find('.strPreview').empty();

        // empty list scrollers and associated suggest lists
        suggestLists = [[]];
        var numFnScrollers = functionsListScrollers.length;
        functionsListScrollers.splice(1, numFnScrollers - 1);
        allowInputChange = true;
    }

    function getArgHtml() {
        var html =
            '<div class="row clearfix">' +
                '<div class="description"></div>' +
                '<div class="inputWrap">' +
                    '<div class="dropDownList">' +
                      '<input class="arg" type="text" tabindex="10" ' +
                        'spellcheck="false" data-typeid="-1" ' +
                        'data-casted="false" data-casttype="null">' +
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
                '<div class="emptyOptions">' +
                    '<div class="checkboxWrap xc-hidden noArgWrap" ' +
                        'data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        OpModalTStr.NoneHint + '">' +
                        '<span class="checkbox noArg" >'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                        '<span class="checkboxText">' +
                        OpModalTStr.NoneArg +
                        '</span>' +
                    '</div>' +
                    '<div class="checkboxWrap xc-hidden emptyStrWrap" ' +
                        'data-container="body" ' +
                        'data-toggle="tooltip" title="' +
                        OpModalTStr.EmptyStringHint + '">' +
                        '<span class="checkbox emptyStr">'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                        OpModalTStr.EmptyString +
                    '</div>' +
                '</div>' +
            '</div>';
        return (html);
    }

    function addFilterGroup() {
        minimizeGroups();
        var newGroupIndex = $activeOpSection.find('.group').length;
        $activeOpSection.find('.group').last()
                        .after(getFilterGroupHtml(newGroupIndex));
        populateFunctionsListUl(newGroupIndex);
        fillInputPlaceholder();
        var functionsListScroller = new MenuHelper(
            $('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                scrollerOnly: true,
                bounds: '#operationsView',
                bottomPadding: 5
            }
        );
        functionsListScrollers.push(functionsListScroller);
        suggestLists.push([]);// array of groups, groups has array of inputs
        scrollToBottom();
        $activeOpSection.find('.group').last().find('.functionsInput').focus();
        formHelper.refreshTabbing();
    }

    function addGroupOnArg(index) {
        var html = getArgInputHtml();
        html = '<div class="row gbOnRow extraArg clearfix">' + html +
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
        var $group = $activeOpSection.find(".group").eq(index);
        $group.find('.gbOnRow').last().after(html);
        $group.find('.gbOnArg').last().focus();
        formHelper.refreshTabbing();

        var $ul = $group.find('.gbOnArg').last().siblings(".list");
        addSuggestListForExtraArg($ul);
        addCastDropDownListener();
    }

    function getGroupbyGroupHtml(index) {
        var html =
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

    function addGroupbyGroup() {
        var newGroupIndex = $activeOpSection.find('.group').length;
        $activeOpSection.find('.group').last()
                        .after(getGroupbyGroupHtml(newGroupIndex));
        populateFunctionsListUl(newGroupIndex);
        // fillInputPlaceholder();
        var functionsListScroller = new MenuHelper(
            $('.functionsList[data-fnlistnum="' + newGroupIndex + '"]'),
            {
                scrollerOnly: true,
                bounds: '#operationsView',
                bottomPadding: 5
            }
        );

        functionsListScrollers.push(functionsListScroller);
        suggestLists.push([]);// array of groups, groups has array of inputs
        scrollToBottom();
        // $activeOpSection.find('.group').last().find('.functionsInput').focus();
        formHelper.refreshTabbing();
        if ($operationsView.find(".strPreview .aggColSection").length) {
            $operationsView.find(".strPreview .aggColSection").append('<span class="aggColStrWrap"></span>');
        } else {
            $operationsView.find(".strPreview").append('<span class="aggColStrWrap"></span>');
        }
    }

    function addMapArg($btn) {
        var html = getArgInputHtml();
        $btn.parent().prev().find('.inputWrap').last().after(html);
        $btn.parent().prev().find('.inputWrap').last().find('input').focus();
        formHelper.refreshTabbing();

        var $ul = $btn.parent().prev().find('.inputWrap').last().find(".list");
        addSuggestListForExtraArg($ul);
    }

    function addSuggestListForExtraArg($ul) {
        var $allGroups = $activeOpSection.find('.group');
        var groupIndex = $allGroups.index($ul.closest('.group'));
        var argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        var scroller = new MenuHelper($ul, {
            scrollerOnly: true,
            bounds: '#operationsView',
            bottomPadding: 5
        });

        suggestLists[groupIndex].splice(argIndex, 0, scroller);
        $ul.removeClass('new');
    }

    function getArgInputHtml() {
        var inputClass = "";
        var wrapClass = "";
        if (operatorName === "map") {
            wrapClass = "extraArg";
            inputClass = "mapExtraArg";
        } else if (operatorName === "group by") {
            inputClass = "gbOnArg";
        }
        var html = '<div class="inputWrap ' + wrapClass + '">' +
                        '<div class="dropDownList">' +
                          '<input class="arg ' + inputClass +
                          '" type="text" tabindex="10" ' +
                            'spellcheck="false" data-typeid="-1">' +
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
                    '</div>';
        return html;
    }

    function removeExtraArg($inputWrap) {
        var $allGroups = $activeOpSection.find('.group');
        var groupIndex = $allGroups.index($inputWrap.closest('.group'));
        var $ul = $inputWrap.find(".list");
        var argIndex = $ul.closest('.group').find('.list.hint').index($ul);

        suggestLists[groupIndex].splice(argIndex, 1);
        var $input = $inputWrap.find(".arg");
        $input.val("");
        checkHighlightTableCols($input);
        $inputWrap.remove();
        checkIfStringReplaceNeeded();
    }

    // $group is optional, will minimize all groups if not passed in
    function minimizeGroups($group) {
        if (!$group) {
            $activeOpSection.find('.group').each(function () {
                var $group = $(this);
                if ($group.hasClass('minimized')) {
                    return;
                }
                var numArgs = $group.find('.arg:visible').length;
                $group.attr('data-numargs', numArgs);
                $group.addClass('minimized');
                if ($group.find('.functionsInput').val().trim() === "") {
                    $group.addClass('fnInputEmpty');
                }
            });
        } else {
            var numArgs = $group.find('.arg:visible').length;
            $group.attr('data-numargs', numArgs);
            $group.addClass('minimized');
            if ($group.find('.functionsInput').val().trim() === "") {
                $group.addClass('fnInputEmpty');
            }
        }
    }

    function scrollToBottom(noAnim) {
        var animSpeed = 500;
        var scrollTop = $activeOpSection.closest('.mainContent')[0]
                                        .scrollHeight -
                        $activeOpSection.closest('.mainContent').height();
        if (noAnim) {
            $activeOpSection.closest('.mainContent').scrollTop(scrollTop);
        } else {
            $activeOpSection.closest('.mainContent')
            .animate({scrollTop: scrollTop}, animSpeed);
        }
    }

    function filterTheMapFunctions(val) {
        var categorySet;
        filteredOperatorsMap = {};
        var categoryNums = {};
        var fn;
        var firstCategoryNumFound;
        val = val.toLowerCase();
        for (var i = 0; i < operatorsMap.length; i++) {
            if (i === FunctionCategoryT.FunctionCategoryAggregate) {
                continue;
            }
            categorySet = operatorsMap[i];
            for (var j = 0; j < categorySet.length; j++) {
                fn = categorySet[j];
                if (fn.fnName.toLowerCase().indexOf(val) > -1) {
                    if (!filteredOperatorsMap[fn.category]) {
                        filteredOperatorsMap[fn.category] = [];
                    }
                    categoryNums[fn.category] = true;
                    filteredOperatorsMap[fn.category].push(fn);
                    if (firstCategoryNumFound == null) {
                        firstCategoryNumFound = fn.category;
                    }
                }
            }
        }

        if (firstCategoryNumFound != null) {
            $categoryList.find('li').addClass('filteredOut');
            for (var catId in categoryNums) {
                $categoryList.find('li[data-category="' + catId + '"]')
                             .removeClass('filteredOut');
            }

            updateMapFunctionsList(true);
        } else {
            $categoryList.find('li').addClass('filteredOut');
            $functionsList.find('li').addClass('filteredOut');
            $activeOpSection.find('.argsSection')
                       .addClass('inactive');
            $operationsView.find('.icvMode').addClass('inactive');
            $activeOpSection.find('.descriptionText').empty();
            $operationsView.find('.strPreview').empty();
        }
        $categoryList.find('li').removeClass('active');
        if (Object.keys(categoryNums).length === 1) {
            $categoryList.find('li:visible').eq(0).addClass('active');
        }
    }

    function removeGroup($group, all) {
        var index = $activeOpSection.find('.group').index($group);
        $group.remove();
        if (!all) {
            $activeOpSection.find('.group').each(function(i){
                var $group = $(this);
                $group.find('.functionsList').data('fnlistnum', i);
                $group.find('.functionsInput').data('fninputnum', i);
                $group.find('.genFunctionsMenu ul').data('fnmenunum', i);
            });
        }
        functionsListScrollers.splice(index, 1);
        suggestLists.splice(index, 1);
        $operationsView.find(".aggColStrWrap").last().remove();
        checkIfStringReplaceNeeded();
    }
    // used to disable inputs while UDFS load
    function disableInputs() {
        $operationsView.find('.strPreview, .submit, .opSection')
                        .addClass('tempDisabled');
    }
    function enableInputs() {
        $operationsView.find('.tempDisabled').removeClass('tempDisabled');
    }

    function getFilterGroupHtml(index) {
        var html = '<div class="group filterGroup">' +
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

    function getTableColList() {
        var html = "";
        var numBlanks = 10; // to take up flexbox space
        var allCols = table.tableCols;
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
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
        for (var c = 0; c < numBlanks; c++) {
            html += '<div class="flexSpace"></div>';
        }
        return (html);
    }

    function isArgAColumn(arg) {
        return (isNaN(arg) &&
                arg.indexOf("(") === -1 &&
                arg !== "true" && arg !== "false" &&
                arg !== "t" && arg !== "f");
    }

    function selectCol(colNum) {
        var $colList = $activeOpSection.find(".cols");
        $colList.find('li[data-colnum="' + colNum + '"]')
                .addClass('checked')
                .find('.checkbox').addClass('checked');
        checkToggleSelectAllBox();
    }

    function deselectCol(colNum) {
        var $colList = $activeOpSection.find(".cols");
        $colList.find('li[data-colnum="' + colNum + '"]')
                .removeClass('checked')
                .find('.checkbox').removeClass('checked');
        checkToggleSelectAllBox();
    }

    // if all lis are checked, select all checkbox will be checked as well
    function checkToggleSelectAllBox() {
        var totalCols = $activeOpSection.find('.cols li').length;
        var selectedCols = $activeOpSection.find('.cols li.checked').length;
        if (selectedCols === 0) {
            $activeOpSection.find('.selectAllWrap').find('.checkbox')
                                              .removeClass('checked');
        } else if (selectedCols === totalCols) {
            $activeOpSection.find('.selectAllWrap').find('.checkbox')
                                              .addClass('checked');
        }
    }

    function getColTypeIcon(type) {
        var icon = "xi-mixed";
        switch (type) {
            case (DfFieldTypeT.DfInt32):
            case (DfFieldTypeT.DfInt64):
            case (DfFieldTypeT.DfUInt32):
            case (DfFieldTypeT.DfUInt64):
            case (DfFieldTypeT.DfFloat32):
            case (DfFieldTypeT.DfFloat64):
                icon = "xi-integer";
                break;
            case (DfFieldTypeT.DfString):
                icon = "xi-string";
                break;
            case (DfFieldTypeT.DfBoolean):
                icon = "xi-boolean";
                break;
            default:
                // DfScalarObj will be mixed
                break;
        }
        return icon;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        OperationsView.__testOnly__ = {};
        // functions
        OperationsView.__testOnly__.hasFuncFormat = hasFuncFormat;
        OperationsView.__testOnly__.hasUnescapedParens = hasUnescapedParens;
        OperationsView.__testOnly__.getExistingTypes = getExistingTypes;
        OperationsView.__testOnly__.argumentFormatHelper = argumentFormatHelper;
        OperationsView.__testOnly__.parseType = parseType;
        OperationsView.__testOnly__.formulateMapFilterString = formulateMapFilterString;
        OperationsView.__testOnly__.isNumberInQuotes = isNumberInQuotes;
        OperationsView.__testOnly__.checkAggregateNameValidity = checkAggregateNameValidity;
        OperationsView.__testOnly__.addFilterGroup = addFilterGroup;
        OperationsView.__testOnly__.removeFilterGroup = removeGroup;
        OperationsView.__testOnly__.submitForm = submitForm;
        OperationsView.__testOnly__.getMatchingAggNames = getMatchingAggNames;
        OperationsView.__testOnly__.getMatchingColNames = getMatchingColNames;
        OperationsView.__testOnly__.getAllColumnTypesFromArg = getAllColumnTypesFromArg;
        OperationsView.__testOnly__.argSuggest = argSuggest;
        OperationsView.__testOnly__.updateColNamesCache = updateColNamesCache;
        OperationsView.__testOnly__.filter = filter;
        OperationsView.__testOnly__.submissionFailHandler = submissionFailHandler;
        OperationsView.__testOnly__.groupBy = groupBy;
        OperationsView.__testOnly__.groupByCheck = groupByCheck;
        OperationsView.__testOnly__.getColNumFromFunc = getColNumFromFunc;
        OperationsView.__testOnly__.isBoolInQuotes = isBoolInQuotes;
        OperationsView.__testOnly__.newColNameCheck = newColNameCheck;
        OperationsView.__testOnly__.checkArgTypes = checkArgTypes;
        OperationsView.__testOnly__.submitFinalForm = submitFinalForm;
        OperationsView.__testOnly__.changeParseTypeFn = function(newFn) {
            var cache = parseType;
            parseType = newFn;
            return cache;
        };

        // metadata
        OperationsView.__testOnly__.aggNames = aggNames;
        OperationsView.__testOnly__.getColNamesCache = function() {
            return colNamesCache;
        };


    }
    /* End Of Unit Test Only */


    return (OperationsView);
}(jQuery, {}));

