window.OperationsView = (function($, OperationsView) {
    var $operationsView; // $('#operationsView');
    var $categoryInput;   // $('#categoryList').find('.autocomplete')
    var $categoryList; // for map $operationsView.find('.categoryMenu');
    var $functionsList; // for map $operationsView.find('.functionsMenu');
    var $genFunctionsMenu;   // $('.genFunctionsMenu')
    var $genFunctionsMenus;   // $('.genFunctionsMenu')
    var $functionsUl;     // $genFunctionsMenu.find('ul')
    var $autocompleteInputs; // $operationsView.find('.autocomplete');
    var $activeOpSection = $(); // $operationsView.find('.map or .filter or
                                //  .groupby etc')
    var currentCol;
    var colNum = "";
    var colName = "";
    var isNewCol;
    var operatorName = ""; // group by, map, filter, aggregate, etc..
    var funcName = "";
    var operatorsMap = {};
    var filteredOperatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    var $lastInputFocused;
    var quotesNeeded = [];
    var corrector;
    var aggNames = [];
    var suggestLists = [[]]; // groups of arguments
    var isOpen = false;
    var allowInputChange = true;
    var functionsListScrollers = [];
    var gbFunctionsListScroller;
    var aggFunctionsListScroller;
    var tableId;
    var formHelper;
    var mainMenuPrevState; // used to restore main menu state once operation is
                            // closed
    var formOpenTime; // stores the last time the form was opened

    // shows valid cast types
    var castMap = {
        string       : ['boolean', 'integer', 'float'],
        integer      : ['boolean', 'integer', 'float', 'string'],
        float        : ['boolean', 'integer', 'float', 'string'],
        number       : ['boolean', 'integer', 'float', 'string'],
        boolean      : ['integer', 'float', 'string'],
        undefined    : [],
        array        : [],
        'Array Value': [],
        object       : [],
        mixed        : []
    };

    // XXX can it be removed?
    // useful for debugging
    OperationsView.getOperatorsMap = function() {
        return (operatorsMap);
    };

    OperationsView.setup = function() {
        $operationsView = $('#operationsView');
        $categoryInput = $('#categoryList').find('.autocomplete');
        $genFunctionsMenu = $operationsView.find('.genFunctionsMenu');
        $genFunctionsMenus = $operationsView.find('.genFunctionsMenu');
        $functionsUl = $genFunctionsMenu.find('ul');
        
        $categoryList = $operationsView.find('.categoryMenu');
        $functionsList = $operationsView.find('.functionsMenu');
        $autocompleteInputs = $operationsView.find('.autocomplete');

        // GENERAL LISTENERS, not inputs

        formHelper = new FormHelper($operationsView);

        var scrolling = false;
        var scrollTimeout;
        var scrollTime = 300;
        $operationsView.find('.mainContent').scroll(function() {
            if (!scrolling) {
                StatusBox.forceHide();// hides any error boxes;
                $('.tooltip').hide();
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
            removeFilterGroup($(this).closest('.group'));
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
                    $categoryList.find('li').eq(0).click();
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
                    $functionsList.find('li').eq(0).click();
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

        $operationsView.find('.filterMapFuncArea .clear').mousedown(function() {
            if ($('#mapFilter').val() !== "") {
                $('#mapFilter').val("").trigger('input');
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
            $('.tooltip').hide();
        });

        // .functionsInput
        $operationsView.on({
            'mousedown': function(event) {
                gMouseEvents.setMouseDownTarget($(this));
                event.stopPropagation();
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
                    if (operatorName === "filter") {
                        functionsListScrollers[fnInputNum]
                                    .showOrHideScrollers();
                    } else if (operatorName === "group by") {
                        gbFunctionsListScroller.showOrHideScrollers();
                    } else {
                        aggFunctionsListScroller.showOrHideScrollers();
                    }
                }
            },
            'keydown': function(event) {
                var $input = $(this);
                if (event.which === keyCode.Enter || event.which ===
                    keyCode.Tab) {
                    var value = $input.val().trim().toLowerCase();
                    var prevValue = $input.data('value');
                    $input.data('value', value);

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
                } else {
                    closeListIfNeeded($input);
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
                $input.data('value', value);

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
            if (!$list.is(':visible')) {
                $operationsView.find('li.highlighted')
                                .removeClass('highlighted');
                // show all list options when use icon to trigger
                $list.show().find('li').sort(sortHTML)
                                       .prependTo($list.children('ul'))
                                       .show();
                $list.siblings('input').focus();

                if (operatorName === "filter") {
                    var fnInputNum = parseInt($list.siblings('input')
                                                   .data('fninputnum'));
                    functionsListScrollers[fnInputNum].showOrHideScrollers();
                } else if (operatorName === "group by") {
                    gbFunctionsListScroller.showOrHideScrollers();
                } else {
                    aggFunctionsListScroller.showOrHideScrollers();
                }
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

        var argumentTimer;

        // .arg (argument input)
        $operationsView.on({
            'keydown': function(event) {
                var $input = $(this);
                var $list = $input.siblings('.openList');
                if ($list.length && (event.which === keyCode.Up ||
                    event.which === keyCode.Down)) {
                    listHighlight($input, event.which, event);
                }
            },
            'keypress': function(event) {
                if (event.which === keyCode.Enter) {
                    var $input = $(this);
                    var $hintli = $input.siblings('.hint').find('li');
                    if ($hintli.hasClass('highlighted')) {
                        $hintli.click();
                        return;
                    }
                    $(this).blur();
                    submitForm();
                }
            },
            'focus': function() {
                hideDropdowns();
            },
            'blur': function() {
                restoreInputSize($(this));
            },
            'input': function() {
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
                    if (!$input.hasClass('gbOnArg')) {
                        argSuggest($input);
                    }
                    
                    checkIfStringReplaceNeeded();
                }, 200);

                updateStrPreview();
                if ($input.siblings('.argIconWrap:visible').length) {
                    checkInputSize($input);
                }
            },
            'mousedown': function() {
                $genFunctionsMenus.hide();
                var $activeInput = $(this);
                // close other input's open lists when active input is clicked
                $('.openList').each(function() {
                    if (!$(this).siblings('.arg').is($activeInput)) {
                        $(this).hide();
                    }
                });
                if ($activeInput.siblings('.argIconWrap:visible').length) {
                    checkInputSize($activeInput);
                }
            }
        }, '.arg');

        $operationsView.on('click', '.argIconWrap', function() {
            var $input = $(this).siblings('input');
            $input.focus();
            $lastInputFocused = $input;
        });

        $operationsView.on('mousedown', '.argIconWrap', function(event) {
            event.preventDefault(); // prevents input from blurring
            event.stopPropagation();
        });


        $operationsView.on('dblclick', 'input', function() {
            this.setSelectionRange(0, this.value.length);
        });

        // add filter arguments button
        $operationsView.find('.addFilterArg').click(function() {
            addFilterGroup();
        });

        // static button
        $operationsView.find('.addGroupArg').click(function() {
            addGroupOnArg();
        });

        // dynamic button
        $operationsView.on('click', '.addMapArg', function() {
            addMapArg($(this));
        });

        $operationsView.on('click', '.inputWrap.extra .xi-cancel', function() {
            removeExtraArg($(this).closest('.inputWrap'));
        });

        // click on the hint list
        $operationsView.on('click', '.hint li', function() {
            var $li = $(this);

            $li.removeClass("openli")
                .closest(".hint").removeClass("openList").hide()
                .siblings(".arg").val($li.text())
                .closest(".dropDownList").removeClass("open");
            checkIfStringReplaceNeeded();
        });


        addCastDropDownListener();

        $operationsView.on('click', '.checkboxSection', function() {
            var $checkbox = $(this).find('.checkbox');
            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
            } else {
                $checkbox.addClass('checked');
            }

             // incSample and keepInTable toggling
            if ($checkbox.closest('.gbCheckboxes').length) {
                if ($checkbox.hasClass('checked')) {
                    $checkbox.closest('.checkboxSection').siblings()
                            .find('.checkbox').removeClass('checked');
                }
            }

            checkIfStringReplaceNeeded();
        });

        // empty options checkboxes
        $operationsView.on('click', '.checkboxWrap', function() {
            var $checkbox = $(this).find('.checkbox');
            var $emptyOptsWrap = $(this).parent();
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
            }

            // noArg and empty str toggling
            if ($checkbox.hasClass('checked')) {
                $checkbox.closest('.checkboxWrap').siblings()
                        .find('.checkbox').removeClass('checked');

            }
            checkIfStringReplaceNeeded();
        });


        $operationsView.on('click', '.focusTable', function() {
            if (!gTables[tableId]) {
                return;
            }
            xcHelper.centerFocusedTable(tableId, true);
        });

        // should only have 1 initially...
        var functionsListScroller = new MenuHelper($('.filter .functionsList'), {
            scrollerOnly : true,
            bounds       : '#operationsView',
            bottomPadding: 5
        });

        functionsListScrollers.push(functionsListScroller);

        gbFunctionsListScroller = new MenuHelper($('.groupby .functionsList'), {
            scrollerOnly : true,
            bounds       : '#operationsView',
            bottomPadding: 5
        });

        aggFunctionsListScroller = new MenuHelper($('.aggregate .functionsList'), {
            scrollerOnly : true,
            bounds       : '#operationsView',
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
                        xcHelper.centerFocusedTable(tableId, true);
                    } else {
                        return;
                    }
                }
            });
            tableListScroller.setupListeners();
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

    // restore: boolean, if true, will not clear the form from it's last state
    OperationsView.show = function(currTableId, currColNum, operator, restore,
                                   restoreTime) {
        if (restoreTime && restoreTime !== formOpenTime) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return;
        }
        var deferred = jQuery.Deferred();
        isOpen = true;

        mainMenuPrevState = MainMenu.getState();
        $('#workspaceMenu').find('.menuSection').addClass('xc-hidden');
        $operationsView.removeClass('xc-hidden');
        if (!MainMenu.isMenuOpen("mainMenu")) {
            MainMenu.open();
        } else {
            BottomMenu.close(true);
        }
        formOpenTime = Date.now();

        if (restore) {
            $activeOpSection.removeClass('xc-hidden');
        } else {
            operatorName = operator.toLowerCase().trim();
            tableId = currTableId;
            // changes mainMenu and assigns activeOpSection
            showOpSection();
            resetForm();
            
            var tableCols = gTables[tableId].tableCols;
            currentCol = tableCols[currColNum - 1];
            colNum = currColNum;
            colName = currentCol.name;
            isNewCol = currentCol.isNewCol;
        }
        $operationsView.find('.title').text(operatorName);
        $operationsView.find('.submit').text(operatorName.toUpperCase());

        // highlight active column
        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');
        operationsViewShowListeners();

        // used for css class
        var opNameNoSpace = operatorName.replace(/ /g, "");
        var columnPicker = {
            "state"      : opNameNoSpace + "State",
            "colCallback": function($target) {
                xcHelper.fillInputFromCell($target, $lastInputFocused,
                                            gColPrefix);
            }
        };
        formHelper.setup({"columnPicker": columnPicker});

        toggleOperationsViewDisplay(false);

        // load updated UDFs if operator is map
        if (operatorName === "map") {
            formHelper.addWaitingBG({
                heightAdjust: 20,
                transparent : true
            });
            disableInputs();
            XcalarListXdfs("*", "User*")
            .then(function(listXdfsObj) {
                udfUpdateOperatorsMap(listXdfsObj.fnDescs);
                operationsViewShowHelper(restore);
                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error("Listing of UDFs failed", error.error);
                deferred.reject();
            });
        } else {
            operationsViewShowHelper(restore);
            deferred.resolve();
        }
        return (deferred.promise());
    };

    OperationsView.turnOffClickHandlers = function() {
        $(document).off('click.OpSection');
        $(document).off('mousedown.mapCategoryListener');
    };

    OperationsView.close = function() {
        if (isOpen) {
            closeOpSection();
        }
    };

    OperationsView.updateTableLists = function() {
        if (isOpen) {

        }
    };

    // for functions dropdown list
    // forceUpdate is a boolean, if true, we trigger an update even if
    // input's val didn't change
    function fnListMouseup(event, $li, forceUpdate) {
        allowInputChange = true;
        event.stopPropagation();
        var value = $li.text();
        var $input = $li.closest('.list').siblings('.autocomplete');
        var fnInputNum = $input.data('fninputnum');
        var originalInputValue = $input.val();
        hideDropdowns();

        // value didn't change && argSection is inactive (not showing)
        if (!forceUpdate && originalInputValue === value &&
            $activeOpSection.find('.group').eq(fnInputNum)
                            .find('.argsSection.inactive').length === 0) {
            return;
        }

        $input.val(value);

        if (value === $genFunctionsMenu.data('category')) {
            return;
        }

        $input.data('value', value.trim());
        enterFunctionsInput(fnInputNum);
    }

    // listeners added whenever operation view opens
    function operationsViewShowListeners() {
        $('.xcTable').on('mousedown', '.header, td.clickable', keepInputFocused);

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
    }

    // functions that get called after list udfs is called during op view show
    function operationsViewShowHelper(restore) {
        var aggs = Aggregates.getNamedAggs();
        aggNames = [];
        for (var i in aggs) {
            aggNames.push(aggs[i].dagName);
        }

        if (!restore) {
            var tableCols = gTables[tableId].tableCols;
            var colNames = [];
            tableCols.forEach(function(col) {
                // skip data column
                if (!col.isDATACol() && !col.isEmptyCol()) {
                    // Add $ since this is the current format of column
                    colNames.push('$' + col.name);
                }
            });
            colNames.concat(aggNames);

            corrector = new Corrector(colNames);

            populateInitialCategoryField(operatorName);
            fillInputPlaceholder(0);

            $categoryInput.focus();
            if (operatorName === "map") {
                $('#mapFilter').focus();
            } else if (operatorName === "group by") {
                $activeOpSection.find('.gbOnArg').val(gColPrefix + colName);
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
    }

    function showOpSection() {
        var concatedOpName = operatorName.replace(/ /g, "");
        $activeOpSection = $operationsView.find('.' + concatedOpName);
        $activeOpSection.removeClass('xc-hidden');
    }

    function toggleOperationsViewDisplay(isHide) {
        var $table = $('.xcTable');
        var $tableWrap = $('.xcTableWrap');
        if (isHide) {
            $table.off('mousedown', '.header, td.clickable', keepInputFocused);
            $('body').off('keydown', listHighlightListener);


            $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .removeClass('tableOpSection');
            $tableWrap.removeClass('modalOpen');
        } else {
            $('body').on('keydown', listHighlightListener);
        }
    }

    function keepInputFocused(event) {
        closeMenu($('#colMenu'));
        event.preventDefault();
        event.stopPropagation();
    }

    function addCastDropDownListener() {
        var $lists = $operationsView.find(".cast.new .dropDownList");
        $lists.closest('.cast.new').removeClass('new');
        var castList = new MenuHelper($lists, {
            "onOpen": function($list) {
                var $td = $list.parent();
                var $ul = $list.find('ul');
                var top = $td.offset().top + 30;
                var left = $td.offset().left + 9;
                $ul.css({'top': top, 'left': left});
                StatusBox.forceHide();
            },
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                var type   = $li.text();
                var casted;
                // var castedType;

                $input.val(type);
                if (type === "default") {
                    casted = false;
                } else {
                    casted = true;
                }
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
        'conditional'          : ['not']
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
        var arrayLen = opArray.length;
        operatorsMap = [];

        for (var i = 0; i < arrayLen; i++) {
            if (!operatorsMap[opArray[i].category]) {
                operatorsMap[opArray[i].category] = [];
            }
            operatorsMap[opArray[i].category].push(opArray[i]);
        }
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
        for (var i = 0; i < arrayLen; i++) {
            operatorsMap[udfCategoryNum].push(opArray[i]);
        }
    }

    function sortHTML(a, b){
        return ($(b).text()) < ($(a).text()) ? 1 : -1;
    }

    function argSuggest($input) {
        var curVal = $input.val().trim();
        var $ul = $input.siblings(".list");
        var $allGroups = $activeOpSection.find('.group');
        var groupIndex = $allGroups.index($ul.closest('.group'));
        var argIndex = $ul.closest('.group').find('.hint').index($ul);
        var shouldSuggest = true;
        var corrected;
        var listLimit = 30; // do not show more than 30 results
        var aggNameMatches = [];
        var aggNameLis = "";
        var hasCorrected = false;

        // when there is multi cols
        if (curVal.indexOf(",") > -1) {
            shouldSuggest = false;
        } else {
            if (curVal.length) {
                var count = 0;
                for (var i = 0; i < aggNames.length; i++) {
                    if (aggNames[i].toLowerCase().indexOf(curVal) > -1 ) {
                        count++;
                        aggNameMatches.push(aggNames[i]);
                        if (count > listLimit) {
                            break;
                        }
                    }
                }
            }
            
            aggNameMatches.sort();
            for (var i = 0; i < aggNameMatches.length; i++) {
                aggNameLis += '<li class="openli">' + aggNameMatches[i] +
                              '</li>';
            }
            corrected = corrector.suggest(curVal);
            if (corrected != null && corrected !== curVal) {
                hasCorrected = true;
            }
            // should not suggest if the input val is already a column name
            if (!hasCorrected && !aggNameMatches.length) {
                shouldSuggest = false;
            }
        }

        // should not suggest if the input val is already a column name
        if (shouldSuggest) {
            $ul.find('ul').empty();
            if (hasCorrected) {
                $ul.find('ul').append('<li class="openli">' + corrected +
                                  '</li>');
            }
            if (aggNameLis.length) {
                $ul.find('ul').append(aggNameLis);
            }
            
            $ul.addClass("openList").show();
            suggestLists[groupIndex][argIndex].showOrHideScrollers();

            $input.closest('.dropDownList').addClass('open');
            positionDropdown($ul);
        } else {
            $ul.find('ul').empty().end().removeClass("openList").hide()
                .closest(".dropDownList").removeClass("open");
        }
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

        if (operatorName === "filter") {
            var fnInputNum = parseInt($list.siblings('input')
                                           .data('fninputnum'));
            functionsListScrollers[fnInputNum].showOrHideScrollers();
        } else if (operatorName === "group by") {
            gbFunctionsListScroller.showOrHideScrollers();
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
        $operationsView.find('.list').hide();
        $operationsView.find('.list li').hide();
        $operationsView.find('.cast .list li').show();
        $operationsView.find('.tableList .list li').show();
    }

    // index is the argument group numbers
    function enterFunctionsInput(index) {
        index = index || 0;
        if (!isOperationValid(index)) {
            showErrorMessage(0, index);
            var keep = true;
            clearInput(0, index, keep);
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

    function clearInput(inputNum, groupNum, keep) {
        if (!keep) {
            $operationsView.find('.autocomplete')
                            .eq(inputNum).val("")
                            .attr('placeholder', "");
        }
        if (inputNum === 0) {
            var $group = $activeOpSection.find('.groupo').eq(groupNum);
            $group.find('.functionsInput').data('category', 'null');
            $group.find('.argsSection').last()
                       .addClass('inactive');
            $group.find('.gbCheckboxes').addClass('inactive');
            $group.find('.icvMode').addClass('inactive');
            $group.find('.descriptionText').empty();
            checkIfStringReplaceNeeded(true);
        }
        if (inputNum < 2) {
            $autocompleteInputs.eq(inputNum).data('value', "");
        }
        hideDropdowns();
    }

    function clearFunctionsInput(groupNum, keep) {
        var $argsGroup =  $activeOpSection.find('.group').eq(groupNum);
        if (!keep) {
            $argsGroup.find('.functionsInput')
                      .val("").attr('placeholder', "");
        }

        $argsGroup.find('.genFunctionsMenu').data('category', 'null');
        $argsGroup.find('.argsSection').last().addClass('inactive');
        $argsGroup.find('.gbCheckboxes').addClass('inactive');
        $argsGroup.find('.icvMode').addClass('inactive');
        $argsGroup.find('.descriptionText').empty();
        $argsGroup.find('.functionsInput').data('value', "");
        hideDropdowns();
        checkIfStringReplaceNeeded(true);
    }

    function closeListIfNeeded($input) {
        var parentNum = $input.closest('.dropDownList').data('fnlistnum');
        var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
        if ($mousedownTarget.closest('[data-fnlistnum="' + parentNum + '"]')
                            .length === 0) {
            hideDropdowns();
        }
    }

    function listHighlight($input, keyCodeNum, event) {
        var direction;
        if (keyCodeNum === keyCode.Up) {
            direction = -1;
        } else if (keyCodeNum === keyCode.Down) {
            direction = 1;
        } else {
            // key code not supported
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        var $menu = $input.siblings('.list');
        var $lis = $input.siblings('.list').find('li:visible');
        var numLis = $lis.length;

        if (numLis === 0) {
            return;
        }

        var $highlightedLi = $lis.filter(function() {
            return ($(this).hasClass('highlighted'));
        });

        var index;
        if ($highlightedLi.length !== 0) {
            // When a li is highlighted
            var highlightIndex = $highlightedLi.index();
            $lis.each(function() {
                var liIndex = $(this).index();
                if (highlightIndex === liIndex) {
                    index = liIndex;
                    return (false);
                }
            });

            $highlightedLi.removeClass('highlighted');

            var newIndex = (index + direction + numLis) % numLis;
            $highlightedLi = $lis.eq(newIndex);
        } else {
            index = (direction === -1) ? (numLis - 1) : 0;
            $highlightedLi = $lis.eq(index);
        }

        var val = $highlightedLi.text();
        $highlightedLi.addClass('highlighted');
        $input.val(val);

        var menuHeight = $menu.height();
        var liTop = $highlightedLi.position().top;
        var liHeight = 30;
        var currentScrollTop;

        if (liTop > menuHeight - liHeight) {
            currentScrollTop = $menu.find('ul').scrollTop();
            var newScrollTop = liTop - menuHeight + liHeight +
                               currentScrollTop;
            $menu.find('ul').scrollTop(newScrollTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        } else if (liTop < 0) {
            currentScrollTop = $menu.find('ul').scrollTop();
            $menu.find('ul').scrollTop(currentScrollTop + liTop);
            if ($menu.hasClass('hovering')) {
                $menu.addClass('disableMouseEnter');
            }
        }
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
            $target = $activeOpSection.find('.group').eq(groupNum)
                                      .find('input').eq(inputNum);
            if ($target.val().trim() === "") {
                text = ErrTStr.NoEmpty;
            }
        }
       
        StatusBox.show(text, $target, false, {"offsetX": -5});
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
        for (var cat in opsMap) {
            var ops = opsMap[cat];
            if (parseInt(cat) === FunctionCategoryT.FunctionCategoryUdf) {
                for (var i = 0; i < ops.length; i++) {
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
                for (var i = 0; i < ops.length; i++) {
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

        $activeOpSection.find('.argsSection')
                       .addClass('inactive');
        $operationsView.find('.icvMode').addClass('inactive');
        $activeOpSection.find('.descriptionText').empty();
        $operationsView.find('.strPreview').empty();
    }

    function fillTableList(refresh) {
        var tableLis = xcHelper.getWSTableList();
        var $tableListSection = $activeOpSection.find('.tableListSection');
        $tableListSection.find('ul').html(tableLis);
        var tableName;
        // select li and fill left table name dropdown
        if (refresh) {
            tableName = $tableListSection.find('.dropDownList .text').text();
        } else {
            tableName = gTables[tableId].getName();
            $tableListSection.find('.dropDownList .text').text(tableName);
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
        $argsSection.removeClass('inactive');
        $argsSection.empty();

        $argsGroup.find('.icvMode').removeClass('inactive');
        $argsGroup.find('.gbCheckboxes').removeClass('inactive');


        var defaultValue; // to autofill first arg

        if ((firstArgExceptions[category] &&
            firstArgExceptions[category].indexOf(func) !== -1) ||
            groupIndex > 0)
        {
            // do not give default value if not the first group of args
            defaultValue = "";
        } else if (isNewCol) {
            defaultValue = "";
        } else {
            defaultValue = gColPrefix + colName;
        }

        var numArgs = operObj.numArgs;
        if (numArgs < 0) {
            numArgs = 1; // Refer to operObj.numArgs for min number
        }
        var numInputsNeeded = numArgs;
        if (operatorName !== "filter") {
            numInputsNeeded++;
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
            strPreview = groupbyArgumentsSetup(numArgs, operObj, $rows,
                                                defaultValue);
            numArgs += 2;
        }

        // hide any args that aren't being used
        $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

        var despText = operObj.fnDesc || "N/A";
        $argsGroup.find('.descriptionText').html('<b>Description:</b> ' +
                                                 despText);
        if (operatorName !== "aggregate") {
            $operationsView.find('.strPreview')
                           .html('<b>Command Preview:</b> <br>' + strPreview);
        }
        
        $activeOpSection.find('.arg').parent().each(function(i) {
            // xx this would be a styling bug if more than 100 arguments
            $(this).css('z-index', 100 - i);
        });
        $activeOpSection.find('.cast').each(function(i) {
            // xx this would be a styling bug if more than 100 arguments
            $(this).css('z-index', 100 - i);
        });
        
        formHelper.refreshTabbing();

        var noHighlight = true;
        checkIfStringReplaceNeeded(noHighlight);
        if (($activeOpSection.find('.group').length - 1) === groupIndex) {
            if (operatorName !== "group by") {
                // xx not working well with group by
                scrollToBottom();
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
        if (operatorName === "group by") {
            $activeOpSection.find('.hint').addClass('new');
        }
        $activeOpSection.find('.hint.new').each(function() {
            var scroller = new MenuHelper($(this), {
                scrollerOnly : true,
                bounds       : '#operationsView',
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

            var $input = $rows.eq(i).find('.arg');
            if (i === 0 && operatorName !== "group by") {
                $input.val(defaultValue);
            } else {
                $input.val("");
            }
            $input.data("typeid", typeId);
            $rows.eq(i).find('.description').text(description + ':');
            types = parseType(typeId);
            if (types.indexOf('string') === -1) {
                $rows.eq(i).find('.emptyStrWrap').remove();
            }
 
            // add "addArg" button if *arg is found in the description
            if (description.indexOf("*") === 0 &&
                description.indexOf("**") === -1) {
                $rows.eq(i).after(
                    '<div class="addArgWrap">' +
                        '<button class="btn addArg addMapArg">' +
                          '<i class="icon xi-plus"></i>' +
                          '<span class="text">ADD ANOTHER ARGUMENT</span>' +
                        '</button>' +
                      '</div>');
            }
        }
    }

    // sets up the last argument for map
    function mapArgumentsSetup(numArgs, categoryNum, func, operObj) {
        var description = OpModalTStr.ColNameDesc + ":";
        var tempName = colName;
        var autoGenColName;
        var $rows = $activeOpSection.find('.row');
        if (colName === "") {
            tempName = "mapped";
        }
        if (isNewCol && colName !== "") {
            autoGenColName = currentCol.name;
        } else {
            if (categoryNum === FunctionCategoryT.FunctionCategoryUdf) {
                autoGenColName = getAutoGenColName(tempName + "_udf");
            } else {
                autoGenColName = getAutoGenColName(tempName + "_" +
                                                   func);
            }
        }

        autoGenColName = xcHelper.stripeColName(autoGenColName);

        $rows.eq(numArgs).addClass('colNameRow')
                        .find('.dropDownList')
                        .addClass('colNameSection')
                        .end()
                        .find('.arg').val(autoGenColName)
                        .end()
                        .find('.description').text(description);
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

    function groupbyArgumentsSetup(numArgs, operObj, $rows, defaultValue) {
        var description = 'Fields to group on';
        var $gbOnRow = $rows.eq(0);
        $gbOnRow.find('.arg').focus();

        // new col name field
        description = 'New Column Name for the groupBy' +
                        ' resultant column';
        autoGenColName = getAutoGenColName(colName + "_" + operObj.fnName );
        autoGenColName = xcHelper.stripeColName(autoGenColName);

        $rows.eq(numArgs).addClass('colNameRow')
                         .find('.dropDownList')
                            .addClass('colNameSection')
                        .end()
                        .find('.arg').val(autoGenColName)
                        .end()
                        .find('.description').text(description);

        var strPreview =      operObj.fnName + '(' +
                        '<span class="aggCols">' +
                            $rows.eq(1).find(".arg").val() +
                        '</span>' +
                        '), GROUP BY ' +
                        '<span class="groupByCols">' +
                            // defaultValue +
                        '</span>' +
                    '</p>';

        return (strPreview);
    }

    function aggArgumentsSetup(numArgs, operObj, $rows) {
        var description = OpModalTStr.AggNameDesc;

        $rows.eq(numArgs).addClass('colNameRow')
                        .find('.dropDownList')
                        .addClass('colNameSection')
                        .end()
                        .find('.arg').val("")
                        .end()
                        .find('.description').text(description);

        var $nameInput =  $rows.eq(numArgs).find('.arg');

        // focus, blur, keydown, input listeners ensures the aggPrefix
        // is always the first chracter in the colname input
        // and is only visible when focused or changed
        $nameInput.on('focus.aggPrefix', function() {
            var $input = $(this);
            if ($input.val().trim() === "") {
                $input.val(gAggVarPrefix);
            }
        });
        $nameInput.on('blur.aggPrefix', function() {
            var $input = $(this);
            if ($input.val().trim() === gAggVarPrefix) {
                $input.val("");
            }
        });
        $nameInput.on('keydown.aggPrefix', function(event) {
            var $input = $(this);
            if ($input.caret() === 0 &&
                $input[0].selectionEnd === 0) {
                event.preventDefault();
                $input.caret(1);
                return false;
            }
        });
        $nameInput.on('input.aggPrefix', function() {
            var $input = $(this);
            var val = $input.val();
            var trimmedVal = $input.val().trim();
            if (trimmedVal[0] !== gAggVarPrefix) {
                var caretPos = $input.caret();
                $input.val(gAggVarPrefix + val);
                if (caretPos === 0) {
                    $input.caret(1);
                }
            }
        });
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
        if (!gTables[tableId]) {
            return;
        }
        quotesNeeded = [];

        $activeOpSection.find('.group').each(function() {
            var typeIds = [];
            var existingTypes = {};
            var $inputs = $(this).find('.arg:visible');

            $inputs.each(function() {
                var $input = $(this);
                var arg    = $input.val().trim();
                var type   = null;

                // ignore new colname input
                if ($input.closest(".dropDownList").hasClass("colNameSection"))
                {
                    return;
                } else if (hasFuncFormat(arg)) {
                    // skip
                } else if (xcHelper.hasValidColPrefix(arg)) {
                    arg = parseColPrefixes(arg);
                    if (operatorName !== "map" ||
                        $functionsList.find('.active').data('category') !==
                        FunctionCategoryT.FunctionCategoryUdf)
                    {
                        type = getColumnTypeFromArg(arg);
                    }
                } else if (arg[0] === gAggVarPrefix) {
                    // skip
                } else {
                    var parsedType = parseType($input.data('typeid'));
                    if (parsedType.length === 6) {
                        type = null;
                    } else {
                        var isString = formatArgumentInput(arg,
                                                        $input.data('typeid'),
                                                       existingTypes).isString;
                        if (isString) {
                            type = "string";
                        }
                    }
                }

                if (type != null) {
                    existingTypes[type] = true;
                }
                typeIds.push($input.data('typeid'));
            });

            $inputs.each(function(i) {
                var $input = $(this);
                var $row = $input.closest('.row');
                var arg = $input.val().trim();
                var parsedType = parseType(typeIds[i]);
                // var noArgsChecked = $row.find('.noArg.checked').length > 0;
                var emptyStrChecked = $row.find('.emptyStr.checked').length > 0;
                if (emptyStrChecked && arg === "") {
                    quotesNeeded.push(true);
                } else if (!$input.closest(".dropDownList")
                            .hasClass("colNameSection") &&
                            !xcHelper.hasValidColPrefix(arg) &&
                            arg[0] !== gAggVarPrefix &&
                            parsedType.indexOf("string") > -1 &&
                            !hasFuncFormat(arg)) {
                    // one of the valid types is string

                    if (parsedType.length === 1) {
                        // if input only accepts strings
                        quotesNeeded.push(true);
                    } else if (existingTypes.hasOwnProperty("string")) {
                        if (isNumberInQuotes(arg)) {
                            quotesNeeded.push(false);
                        } else {
                            quotesNeeded.push(true);
                        }
                    } else {
                        quotesNeeded.push(false);
                    }
                } else {
                    quotesNeeded.push(false);
                }
            });
        });

        updateStrPreview(noHighlight);
    }

    function updateStrPreview(noHighlight) {
        var $description = $operationsView.find(".strPreview");
        var $inputs = $activeOpSection.find('.arg:visible');
        var tempText;
        var newText = "";

        if (operatorName === "map" || operatorName === "filter") {
            var oldText = $description.find('.descArgs').text();
            var $groups = $activeOpSection.find(".group").filter(function() {
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
                    newText += "and(";
                }
                newText += funcName + "(";
                $inputs = $(this).find('.arg:visible');
                if (operatorName === "map") { // remove new column name input
                    $inputs = $inputs.not(':last');
                }
                var numNonBlankArgs = 0;
                $inputs.each(function(i) {
                    var $input = $(this);
                    var $row = $input.closest('.row');
                    var noArgsChecked = $row.find('.noArg.checked').length > 0;
                    // var casted;

                    var val = $input.val();

                    val = parseColPrefixes(parseAggPrefixes(val));

                    if (noArgsChecked && val.trim() === "") {
                        // no quotes if noArgs and nothing in the input
                    } else if (quotesNeeded[inputCount]) {
                        val = "\"" + val + "\"";
                    }

                    if ($input.data('casted')) {
                        val = xcHelper.castStrHelper(val,
                                                     $input.data('casttype'));
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
                    inputCount ++;
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
                newText = "";
                for (var i = 0; i < tempText.length; i++) {
                    newText += "<span class='char'>" +
                                    tempText[i] +
                                "</span>";
                }
                $description.find(".descArgs").html(newText);
            } else {
                var $spanWrap = $description.find(".descArgs");
                var $spans = $spanWrap.find('span.char');
                modifyDescText(oldText, newText, $spanWrap, $spans);
            }
        } else if (operatorName === "group by") {
            var aggColOldText = $description.find(".aggCols").text();
            var $inputs = $activeOpSection.find('.arg:visible');
            if ($activeOpSection.find('.argsSection').last()
                                                     .hasClass('inactive')) {
                return;
            }
            var aggColNewText = $activeOpSection.find('.argsSection').last()
                                            .find('.arg').eq(0).val().trim();
            // var aggColNewText = $inputs.eq(0).val().trim();
            aggColNewText = parseAggPrefixes(aggColNewText);
            aggColNewText = parseColPrefixes(aggColNewText);
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
            // var gbColNewText = $inputs.eq(1).val().trim();
            gbColNewText = parseAggPrefixes(gbColNewText);
            gbColNewText = parseColPrefixes(gbColNewText);

            if (noHighlight) {
                tempText = aggColNewText;
                aggColNewText = "";
                for (var i = 0; i < tempText.length; i++) {
                    aggColNewText += "<span class='char'>" + tempText[i] +
                                     "</span>";
                }
                $description.find(".aggCols").html(aggColNewText);

                tempText = gbColNewText;
                gbColNewText = "";
                for (var i = 0; i < tempText.length; i++) {
                    gbColNewText += "<span class='char'>" +
                                        tempText[i] +
                                    "</span>";
                }
                $description.find(".groupByCols").html(gbColNewText);
            } else {

                var $aggColWrap = $description.find(".aggCols");
                var $aggColSpans = $aggColWrap.find('span.char');
                modifyDescText(aggColOldText, aggColNewText, $aggColWrap,
                                $aggColSpans);

                var $gbColWrap = $description.find(".groupByCols");
                var $gbColSpans = $gbColWrap.find('span.char');
                modifyDescText(gbColOldText, gbColNewText, $gbColWrap,
                                $gbColSpans);
            }
        }

        return (tempText);
    }

    function modifyDescText(oldText, newText, $spanWrap, $spans) {
        var diff = findStringDiff(oldText, newText);
        if (diff.type !== "none") {
            var type = diff.type;
            var position;
            var tempText;

            switch (type) {
                case ('remove'):
                // do nothing
                    position = diff.start;
                    for (var i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }

                    break;
                case ('add'):
                    tempText = newText;
                    newText = "";
                    for (var i = diff.start; i < diff.start + diff.added; i++) {
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
                    for (var i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }
                    for (var i = diff.start; i < diff.start + diff.added; i++) {
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
                $spanWrap.find('.char').removeClass('visible');
            });

        } else {
            return;
        }
    }

    function getExistingTypes(groupNum) {
        var existingTypes = {};
        var arg;
        var $input;
        var type;
        var $group = $activeOpSection.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function() {
            $input = $(this);
            arg = $input.val().trim();
            type = null;

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                arg = parseColPrefixes(arg);
                type = getColumnTypeFromArg(arg);
            } else if (xcHelper.hasValidColPrefix(arg)) {
                arg = parseColPrefixes(arg);

                // Since there is currently no way for users to specify what
                // col types they are expecting in the python functions, we will
                // skip this type check if the function category is user defined
                // function.
                if (operatorName !== "map" ||
                    $functionsList.find('.active').data('category') !==
                    FunctionCategoryT.FunctionCategoryUdf)
                {
                    type = getColumnTypeFromArg(arg);
                }
                
            } else {
                var parsedType = parseType($input.data('typeid'));
                if (parsedType.length === 6) {
                    type = null;
                } else {
                    var isString = formatArgumentInput(arg,
                                                      $input.data('typeid'),
                                                       existingTypes).isString;
                    if (isString) {
                        type = "string";
                    }
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

    function submitForm() {
        var deferred = jQuery.Deferred();
        var isPassing = true;
        formHelper.disableSubmit(); // disabling it early because there are
        // async calls to follow that shouldn't be triggered multiple times

        if (!gTables[tableId]) {
            StatusBox.show('Table no longer exists',
                            $activeOpSection.find('.tableList'));
            return deferred.reject().promise();
        }

        // check if function name is valid (not checking arguments)
        $activeOpSection.find('.group').each(function(groupNum) {
            if (!isOperationValid(groupNum)) {
                var inputNum = 0;
                if (operatorName === "group by") {
                    var $fnInput = $activeOpSection.find('.functionsInput');
                    inputNum = $activeOpSection.find('input').index($fnInput);
                }
                showErrorMessage(inputNum, groupNum);
                isPassing = false;
                return false;
            }
        });
  
        if (!isPassing) {
            formHelper.enableSubmit();
            return deferred.reject().promise();
        }

        var invalidInputs = [];

        if (!checkIfBlanksAreValid(invalidInputs)) {
            handleInvalidBlanks(invalidInputs);
            return deferred.reject().promise();
        }

        var multipleArgSets = [];

        var $groups = $activeOpSection.find('.group');
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
            formHelper.enableSubmit();
            return deferred.reject().promise();
        }

        // name duplication check
        var $nameInput;
        var isPromise = false;
        switch (operatorName) {
            case ('map'):
                $nameInput = $activeOpSection.find('.arg:visible').last();
                if (isNewCol && colName !== "" &&
                    ($nameInput.val().trim() === colName)) {
                    isPassing = true; // input name matches new column name
                    // which is ok
                } else {
                    isPassing = !ColManager.checkColDup($nameInput, null,
                                                tableId, true);
                }

                break;
            case ('group by'):
                // check new col name
                $nameInput = $activeOpSection.find('.arg:visible').eq(2);
                isPassing = !ColManager.checkColDup($nameInput, null, tableId);
                break;
            case ('aggregate'):
                if (args[1].length > 1) {
                    isPromise = true;
                    checkAggregateNameValidity()
                    .then(function(isPassing) {
                        if (!isPassing) {
                            formHelper.enableSubmit();
                            deferred.reject();
                        } else {
                            submitFinalForm(args)
                            .then(deferred.resolve)
                            .fail(deferred.reject);
                        }
                    })
                    .fail(function(error) {
                        console.error(error);
                        formHelper.enableSubmit();
                        deferred.reject();
                    });
                } else {
                    isPassing = true;
                }

                break;
            default:
                break;
        }
        if (!isPromise) {
            if (!isPassing) {
                formHelper.enableSubmit();
                deferred.reject();
            } else {
                // if there are multiple sets of arguments such as filter
                var hasMultipleSets = false;
                if (multipleArgSets.length > 1){
                    args = multipleArgSets;
                    hasMultipleSets = true;
                }
                submitFinalForm(args, hasMultipleSets)
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        }

        return deferred.promise();
    }

    function submitFinalForm(args, hasMultipleSets) {
        var deferred = jQuery.Deferred();
        var func = funcName;
        var funcLower = func;
        var isPassing;

        // all operations have their own way to show error StatusBox
        switch (operatorName) {
            case ('aggregate'):
                isPassing = aggregateCheck(args);
                break;
            case ('filter'):
                isPassing = true;
                break;
            case ('group by'):
                isPassing = groupByCheck(args);
                break;
            case ('map'):
                isPassing = true;
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
                    promise = filter(func, args, colTypeInfos, hasMultipleSets);
                    break;
                case ('group by'):
                    promise = groupBy(func, args, colTypeInfos);
                    break;
                case ('map'):
                    promise = map(funcLower, args, colTypeInfos);
                    break;
                default:
                    showErrorMessage(0);
                    isPassing = false;
                    // deferred.reject();
                    promise = PromiseHelper.reject();
                    break;
            }

            promise
            .then(deferred.resolve)
            .fail(deferred.reject);

            closeOpSection();
        } else {
            formHelper.enableSubmit();
            deferred.reject();
        }

        return deferred.promise();
    }


    // returns an array of objects that include the new type and argument number
    function getCastInfo(args, groupNum) {
        var table = gTables[tableId];
        var colTypeInfos = [];

        // set up colTypeInfos, filter out any that shouldn't be casted
        var $group = $activeOpSection.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function(i) {
            var $input = $(this);
            var hasEmpty = $input.closest('.row')
                                 .find('.emptyOptions .checked').length;
            var isCasting = $input.data('casted') && !hasEmpty;
            if (isCasting) {
                var progCol = table.getColByBackName(args[i]);
                if (progCol != null) {
                    isValid = true;
                    var castType = $input.data('casttype');
                    if (castType !== progCol.getType()) {
                        colTypeInfos.push({
                            "type"  : castType,
                            "argNum": i
                        });
                    }
                } else {
                    console.error("Cannot find col", args[i]);
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
        var errorType;
        var invalidNonColumnType = false; // when an input does not have a
        // a column name but still has an invalid type
        var $group = $activeOpSection.find('.group').eq(groupNum);
        $group.find('.arg:visible').each(function(inputNum) {
            var $input = $(this);
            // Edge case. GUI-1929
            // var origLength = $input.val().length;
            var $row = $input.closest('.row');
            var noArgsChecked = $row.find('.noArg.checked').length > 0;
            var emptyStrChecked = $row.find('.emptyStr.checked').length > 0;

            // var arg = $input.val().trim();
            var arg = $input.val();
            var trimmedArg = arg.trim();
            // empty field and empty field is allowed
            if (trimmedArg === "") {
                if (noArgsChecked) {
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
                hasFuncFormat(trimmedArg)) {
                arg = parseColPrefixes(trimmedArg);
            } else if (trimmedArg[0] === gAggVarPrefix) {
                arg = trimmedArg;
                // leave it
            } else if (xcHelper.hasValidColPrefix(trimmedArg)) {
                // if it contains a column name
                // note that field like pythonExc can have more than one $col
                // containsColumn = true;
                arg = parseColPrefixes(trimmedArg);

                var frontColName = arg;
                var tempColNames = arg.split(",");
                var backColNames = "";

                for (var i = 0; i < tempColNames.length; i++) {
                    if (i > 0) {
                        backColNames += ",";
                    }
                    backColNames += getBackColName(tempColNames[i].trim());
                }

                arg = backColNames;

                // Since there is currently no way for users to specify what
                // col types they are expecting in the python functions, we will
                // skip this type check if the function category is user defined
                // function.
                if (operatorName !== "map" ||
                    $functionsList.find('.active').data('category') !==
                    FunctionCategoryT.FunctionCategoryUdf)
                {
                    var types;
                    if (tempColNames.length > 1 &&
                        (operatorName !== "group by" ||
                        (operatorName === "group by" &&
                         $input.closest('.gbOnRow').length === 0))) {
                        // non group by fields cannot have multiple column
                        //  names;
                        allColTypes.push({});
                        errorText = ErrTStr.InvalidColName;
                        $errorInput = $input;
                        errorType = "invalidCol";
                        isPassing = false;
                    } else {
                        colTypes = getAllColumnTypesFromArg(frontColName);
                        types = parseType(typeid);
                        if (colTypes.length) {
                            allColTypes.push({
                                "inputTypes"   : colTypes,
                                "requiredTypes": types,
                                "inputNum"     : inputNum
                            });
                        } else {
                            allColTypes.push({});

                            errorText = ErrWRepTStr.InvalidCol;
                            errorText = xcHelper.replaceMsg(errorText, {
                                "name": frontColName
                            });
                            $errorInput = $input;
                            errorType = "invalidCol";
                            isPassing = false;
                        }
                    }

                    if (isPassing) {
                        var isCasted = $input.data('casted');
                        if (!isCasted) {
                            var numTypes = colTypes.length;

                            for (var i = 0; i < numTypes; i++) {
                                if (colTypes[i] == null) {
                                    console.error("colType is null/col not " +
                                        "pulled!");
                                    continue;
                                }

                                errorText = validateColInput(types, colTypes[i],
                                                            $input);
                                if (errorText != null) {
                                    isPassing = false;
                                    $errorInput = $input;
                                    errorType = "invalidColType";
                                    break;
                                }
                            }
                        }
                    }
                } else {
                    allColTypes.push({});
                }
            } else if (!isPassing) {
                arg = trimmedArg;
                // leave it
            } else {
                var checkRes = checkArgTypes(trimmedArg, typeid);

                if (checkRes != null && !invalidNonColumnType) {
                    isPassing = false;
                    invalidNonColumnType = true;
                    if (checkRes.currentType === "newColumn") {
                        errorText = ErrTStr.InvalidOpNewColumn;
                    } else if (checkRes.currentType === "string" &&
                        hasUnescapedParens($input.val())) {
                        // function-like string found but
                        // invalid format
                        errorText = ErrTStr.InvalidFunction;
                    } else {
                        errorText = ErrWRepTStr.InvalidOpsType;
                        errorText = xcHelper.replaceMsg(errorText, {
                            "type1": checkRes.validType.join("/"),
                            "type2": checkRes.currentType
                        });
                    }

                    $errorInput = $input;
                    errorType = "invalidType";
                } else {
                    var parsedType = parseType(typeid);
                    if (parsedType.length < 6) {
                        var formatArgumentResults = formatArgumentInput(arg,
                                                            typeid,
                                                            existingTypes);
                        arg = formatArgumentResults.value;
                    }
                }
            }

            args.push(arg);
        });

        if (!isPassing) {
            handleInvalidArgs(errorType, $errorInput, errorText, groupNum,
                              allColTypes);
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    function handleInvalidArgs(errorType, $errorInput, errorText, groupNum,
                                       allColTypes) {
        if (errorType === "invalidColType") {
            var castIsVisible = $activeOpSection.find('.group').eq(groupNum)
                                                .find('.cast')
                                                .hasClass('showing');
            showCastRow(allColTypes, groupNum)
            .then(function() {
                if (!castIsVisible) {
                    var $castDropdown = $errorInput.closest('.inputWrap')
                                        .next()
                                        .find('.dropDownList:visible');
                    if ($castDropdown.length) {
                        $errorInput = $castDropdown.find('input');
                    }
                    StatusBox.show(errorText, $errorInput);
                }
            });
            if (castIsVisible) {
                var $castDropdown = $errorInput.closest('.inputWrap').next()
                                        .find('.dropDownList:visible');
                if ($castDropdown.length) {
                    $errorInput = $castDropdown.find('input');
                }
                StatusBox.show(errorText, $errorInput);
            }
        } else {
            resetCastOptions($errorInput);
            updateStrPreview();
            StatusBox.show(errorText, $errorInput);
        }
    }

    function showCastRow(allColTypes, groupNum) {
        var deferred = jQuery.Deferred();

        getProperCastOptions(allColTypes);
        var isCastAvailable = displayCastOptions(allColTypes, groupNum);
        $activeOpSection.find('.cast .list li').show();

        if (isCastAvailable) {
            var $castable = $activeOpSection
                            .find('.cast .dropDownList:not(.hidden)').parent();
            $castable.addClass('showing');

            $activeOpSection.find('.descCell').addClass('castShowing');
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
        // var filteredTypes;
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

    function displayCastOptions(allColTypes, groupNum) {
        var $castDropdowns = $activeOpSection.find('.group').eq(groupNum)
                                             .find('.cast')
                                             .find('.dropDownList');
        $castDropdowns.addClass('hidden');
        var lis;
        var castAvailable = false;
        for (var i = 0; i < allColTypes.length; i++) {
            if (allColTypes[i].filteredTypes &&
                allColTypes[i].filteredTypes.length) {
                castAvailable = true;
                lis = "<li class='default'>default</li>";
                $castDropdowns.eq(allColTypes[i].inputNum)
                              .removeClass('hidden');
                for (var j = 0; j < allColTypes[i].filteredTypes.length; j++) {
                    lis += "<li>" + allColTypes[i].filteredTypes[j] + "</li>";
                }
                $castDropdowns.eq(allColTypes[i].inputNum).find('ul').html(lis);
            }
        }
        return (castAvailable);
    }

    // $input is an $argInput
    function resetCastOptions($input) {
        $input.closest('.inputWrap').next().find('input').val('default');
        $input.data('casted', false);
        $input.data('casttype', null);
    }

    function hideCastColumn(groupIndex) {
        var $target;
        if (groupIndex != null) {
            $target = $activeOpSection.find('.group').eq(groupIndex);
        } else {
            $target = $operationsView;
        }
        $target.find('.cast').removeClass('showing overflowVisible');
        $target.find('.descCell').removeClass('castShowing');
    }

    // function checkNoEmptyFields(args) {
    //     var numArgs = args.length;
    //     var emptyFields = [];
    //     for (var i = 0; i < numArgs; i++) {
    //         if (args[i] === "\"\"" || args[i] === "") {
    //             if (!(operatorName === "group by" && i === numArgs - 1)) {
    //                 emptyFields.push(i);
    //             }
    //         }
    //     }
    //     if (emptyFields.length) {
    //         return (false);
    //     } else {
    //         return (true);
    //     }
    // }

    function aggregateCheck(args) {
        if (!hasFuncFormat(args[0])) {
            var aggColNum = getColNum(args[0]);
            if (aggColNum < 1) {
                StatusBox.show(ErrTStr.InvalidColName,
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
        if (!hasFuncFormat(args[0])) {
            aggColNum = getColNum(args[0]);
            tableCol = gTables[tableId].getCol(aggColNum);
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
            formOpenTime: formOpenTime
        };

        var startTime = Date.now();
        xcFunction.aggregate(aggColNum, tableId, aggrOp, aggStr, aggName,
                             options)
        .then(deferred.resolve)
        .fail(function(error) {
            submissionFailHandler(startTime, error);
            deferred.reject();
        });
        return deferred.promise();
    }

    function filter(operator, args, colTypeInfos, hasMultipleSets) {
        var deferred = jQuery.Deferred();
        var filterColNum;
        // var colName;
        var firstArg;
        if (hasMultipleSets) {
            firstArg = args[0][0];
        } else {
            firstArg = args[0];
        }
    
        if (!hasFuncFormat(firstArg)) {
            filterColNum = getColNum(firstArg);
        } else {
            filterColNum = colNum;
        }
        if (filterColNum == null || filterColNum < 0) {
            filterColNum = colNum;
        }

        var filterString = formulateMapFilterString(operator, args,
                                                    colTypeInfos,
                                                    hasMultipleSets);

        var startTime = Date.now();

        xcFunction.filter(filterColNum, tableId, {
            filterString: filterString,
            formOpenTime: formOpenTime
        })
        .then(deferred.resolve)
        .fail(function(error) {
            submissionFailHandler(startTime, error);
            deferred.reject();
        });

        return deferred.promise();
    }

    function getColNum(backColName) {
        return gTables[tableId].getColNumByBackName(backColName);
    }

    function groupBy(operator, args, colTypeInfos) {
        // Current groupBy args has at least 3 arguments:
        // 1. agg col
        // 2. grouby col(cols)
        // 3. new col name
        var deferred = jQuery.Deferred();
        var numArgs = args.length;
        var groupByColIndex = numArgs - 2;
        var aggCol = args[groupByColIndex];

        colTypeInfos = colTypeInfos || [];
        colTypeInfos.forEach(function(colInfo) {
            if (colInfo.argNum === groupByColIndex) {
                aggCol = xcHelper.castStrHelper(aggCol, colInfo.type);
                // stop looping
                return false;
            }
        });

        var groupByCols = [];
        for (var i = 0; i < groupByColIndex; i++) {
            groupByCols.push(args[i].trim());
        }

        var newColName = args[numArgs - 1];
        var isIncSample = $activeOpSection.find('.incSample .checkbox')
                                    .hasClass('checked');
        var isJoin = $activeOpSection.find('.keepTable .checkbox')
                                    .hasClass('checked');
        var icvMode = $activeOpSection.find(".icvMode .checkbox")
                                    .hasClass("checked");
        var options = {
            "isIncSample" : isIncSample,
            "isJoin"      : isJoin,
            "icvMode"     : icvMode,
            "formOpenTime": formOpenTime
        };
        if (options.isIncSample && options.isJoin) {
            console.warn('shouldnt be able to select incSample and join');
            options.isIncSamples = false;
        }

        var startTime = Date.now();
        xcFunction.groupBy(operator, tableId, groupByCols, aggCol,
                            newColName, options)
        .then(deferred.resolve)
        .fail(function(error) {
            submissionFailHandler(startTime, error);
            deferred.reject();
        });
        return deferred.promise();
    }

    function groupByCheck(args) {
        var numArgs = args.length;
        var groupbyColName = args[numArgs - 2];
        // var groupbyColName = args[0];
        var singleArg = true;
       
        var $groupByInput = $activeOpSection.find('.argsSection').last()
                                            .find('.arg').eq(0);
        var isGroupbyColNameValid;
        if (!hasFuncFormat(groupbyColName)) {
            isGroupbyColNameValid = checkValidColNames($groupByInput,
                                                    groupbyColName, singleArg);
        } else {
            isGroupbyColNameValid = true;
        }
        
        if (!isGroupbyColNameValid) {
            StatusBox.show(ErrTStr.InvalidColName, $groupByInput);
            return (false);
        } else {
            var indexedColNames;
            var $input;
            var areIndexedColNamesValid = false;
            for (var i = 0; i < numArgs - 2; i++) {
                indexedColNames = args[i];
                $input = $activeOpSection.find('.gbOnArg').eq(i);
                areIndexedColNamesValid = checkValidColNames($input,
                                                        indexedColNames);
                if (!areIndexedColNamesValid) {
                    break;
                }
            }
            
            if (!areIndexedColNamesValid) {
                StatusBox.show(ErrTStr.InvalidColName, $input);
                return (false);
            } else {
                return (true);
            }
        }
    }

    function map(operator, args, colTypeInfos) {
        var deferred = jQuery.Deferred();
        var numArgs = args.length;
        var newColName = args.splice(numArgs - 1, 1)[0];
        var mapStr = formulateMapFilterString(operator, args, colTypeInfos);
        var mapOptions = {
            formOpenTime: formOpenTime
        };
        if (isNewCol) {
            mapOptions.replaceColumn = true;
            if (colName === "") {
                var widthOptions = {defaultHeaderStyle: true};
                var width = getTextWidth($(), newColName, widthOptions);
                mapOptions.width = width;
            }
        }

        var startTime = Date.now();

        var icvMode = $("#operationsView .map .icvMode .checkbox")
                        .hasClass("checked");

        xcFunction.map(colNum, tableId, newColName, mapStr, mapOptions, icvMode)
        .then(deferred.resolve)
        .fail(function(error) {
            submissionFailHandler(startTime, error);
            deferred.reject();
        });
        return deferred.promise();
    }
    //show alert to go back to op view
    function submissionFailHandler(startTime) {
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
        switch (operatorName) {
            case "filter":
                title = StatusMessageTStr.FilterFailedAlt;
                break;
            case "map":
                title = StatusMessageTStr.MapFailed;
                break;
            case "group by":
                title = StatusMessageTStr.GroupByFailed;
                break;
            default:
                return;
        }
        Alert.error(title, newMsg, {
            buttons: [{
                name: btnText,
                func: function() {
                    OperationsView.show(null , null , null , true);
                }
            }]
        });
    }

    // hasMultipleSets: boolean, true if there are multiple groups of arguments
    // such as gt(a, 2) && lt(a, 5)
    function formulateMapFilterString(operator, args, colTypeInfos,
                                      hasMultipleSets) {
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
                argGroups[i][argNum] = xcHelper.castStrHelper(
                                                argGroups[i][argNum],
                                                 colTypeGroups[i][j].type);
            }
        }

        // loop throguh groups
        for (var i = 0; i < argGroups.length; i++) {
            var funcName;
            if (operatorName === "filter") {
                funcName = $activeOpSection.find('.group').eq(i)
                                            .find('.functionsInput').val()
                                            .trim();
            } else {
                funcName = operator;
            }

            if (i > 0) {
                str += ", ";
            }
            if (i < argGroups.length - 1) {
                str += "and(";
            }
            str += funcName + "(";

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

    function getColumnTypeFromArg(value) {
        // if value = "col1, col2", it only check col1
        value = value.split(",")[0];
        var spaces = jQuery.trim(value);
        if (spaces.length > 0) {
            value = spaces;
        }
        var colType;
        // var colArg;
        var columns = gTables[tableId].tableCols;
        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            if (columns[i].name === value) {
                colType = columns[i].type;
                break;
            }
        }

        return (colType);
    }

    function getAllColumnTypesFromArg(argValue) {
        var values = argValue.split(",");
        var table = gTables[tableId];
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

            var backName = progCol.getBackColName();
            var colType = progCol.getType();
            if (colType === ColumnType.integer && !progCol.isImmediate()) {
                // for fat potiner, we cannot tell float or integer
                // so for integer, we mark it
                colType = ColumnType.number;
            }

            if (backName != null) {
                var bracketIndex = backName.indexOf("[");
                if (bracketIndex > -1 &&
                    backName[bracketIndex - 1] !== "\\") {
                    colType = CommonTxtTstr.ArrayVal;
                }
            }
            types.push(colType);
        });

        return types;
    }

    function validateColInput(requiredTypes, inputType, $input) {
        if (inputType === "newColumn") {
            return ErrTStr.InvalidOpNewColumn;
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
            StatusBox.show(text, $input);
            return (false);
        }
        var values = colNames.split(",");
        var numValues = values.length;
        if (single && numValues > 1) {
            text = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colNames
            });
            StatusBox.show(text, $input);
            return (false);
        }

        var table = gTables[tableId];
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

                StatusBox.show(text, $input);
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
            invalid = false;
        } else if (xcHelper.hasInvalidCharInCol(val.substring(1))) {
            // test the value after gAggVarPrefix
            errorTitle = ColTStr.RenameSpecialCharAgg;
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
            // XXX temp fix for backend not wanting gAggVarPrefix
            val = val.slice(1);
            XcalarGetConstants(val)
            .then(function(ret) {
                if (ret.length) {
                    errorTitle = xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        "name"     : val,
                        "aggPrefix": gAggVarPrefix
                    });
                    showInvalidAggregateName($input, errorTitle);
                    deferred.resolve(false);
                } else {
                    deferred.resolve(true);
                }
            })
            .fail(deferred.reject);
        }
        return deferred.promise();
    }

    function showInvalidAggregateName($input, errorTitle) {
        var $toolTipTarget = $input.parent();

        xcTooltip.transient($toolTipTarget, {
            "title"    : errorTitle,
            "placement": "right",
            "template" : xcTooltip.Template.Error
        });

        $input.click(hideTooltip);

        var timeout = setTimeout(function() {
            hideTooltip();
        }, 4000);

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $input.off('click', hideTooltip);
            clearTimeout(timeout);
        }
    }

    function checkArgTypes(arg, typeid) {
        var types = parseType(typeid);
        var argType = "string";

        if (types.indexOf("string") > -1 ||
            types.indexOf("mixed") > -1 ||
            types.indexOf("undefined") > -1)
        {
            // if it accept string/mixed/undefined, any input
            // should be valid
            return null;
        }

        var tmpArg = arg.toLowerCase();
        var isNumber = !isNaN(Number(arg));
        var isBoolean = false;

        // boolean is a subclass of number
        if (tmpArg === "true" || tmpArg === "false" ||
            tmpArg === "t" || tmpArg === "f" || isNumber)
        {
            isBoolean = true;
            argType = "string/boolean/integer/float";
        }

        if (types.indexOf("boolean") > -1) {
            // XXX this part might be buggy
            if (isBoolean) {
                return null;
            } else {
                return {
                    "validType"  : types,
                    "currentType": argType
                };
            }
        }

        // the remaining case is float and integer, both is number
        tmpArg = Number(arg);

        if (!isNumber) {
            return {
                "validType"  : types,
                "currentType": argType
            };
        }

        if (types.indexOf("float") > -1) {
            // if arg is integer, it could be a float
            return null;
        }

        if (types.indexOf("integer") > -1) {
            if (tmpArg % 1 !== 0) {
                argType = "float";

                return {
                    "validType"  : types,
                    "currentType": argType
                };
            } else {
                return null;
            }
        }

        return null;
    }

    function checkIfBlanksAreValid(invalidInputs) {
        var hasValidBlanks = true;
        $activeOpSection.find('.arg:visible').each(function() {
            var $input   = $(this);
            var val   = $input.val().trim();
            var untrimmedVal = $input.val();
            if (val !== "") {
                // not blank so no need to check. move on to next input.
                return;
            }
            var $row = $input.closest('.row');
            var noArgsChecked = $row.find('.noArg.checked').length > 0;
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
        var hasEmptyOption = invalidInputs[0].closest('.colNameSection')
                                      .length === 0 &&
                         invalidInputs[0].closest('.gbOnRow')
                                        .length === 0;
        var errorMsg;
        if (hasEmptyOption) {
            showEmptyOptions(invalidInputs[0]);
            errorMsg = ErrTStr.NoEmptyOrCheck;
        } else {
            errorMsg = ErrTStr.NoEmpty;
        }
        StatusBox.show(errorMsg, invalidInputs[0]);
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
        return colNum;
    }

    function showEmptyOptions($input) {
        $input.closest('.row').find('.checkboxWrap').removeClass('xc-hidden');
    }

    function hideEmptyOptions($input) {
        $input.closest('.row').find('.checkboxWrap').addClass('xc-hidden')
                              .find('.checkbox').removeClass('checked');
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

        if (shouldBeString) {
            // handle edge case
            var parsedVal = parseFloat(value);
            if (!isNaN(parsedVal) &&
                String(parsedVal) === value &&
                shouldBeNumber)
            {
                // the case that the field accepets both string and number and
                // it fills in a number, should depends on the existingTypes

                // XXX potential bug is that existingTypes
                // has both string and number
                shouldBeString = existingTypes.hasOwnProperty("string");
                if (!shouldBeString) {
                    // when its number
                    value = parsedVal;
                }
            } else if (existingTypes.hasOwnProperty("string") &&
                        isNumberInQuotes(value)) {
                // keep value as is
            } else if (shouldBeBoolean &&
                        (value === "true" || value === "false")) {
                shouldBeString = false;
                value = JSON.parse(value);
            }
        }
        value = parseAggPrefixes(value);
        value = parseColPrefixes(value);
        if (shouldBeString) {
            // add quote if the field support string
            value = "\"" + value + "\"";
            // stringify puts in too many slashes
        } else {
            if (typeof value === "string") {
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
            types.push("string");
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push("integer");
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push("float");
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push("boolean");
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push("mixed");
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push("undefined");
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
        var table = gTables[tableId];
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
        var table = gTables[tableId];
        if (!table) {
            return "";
        }

        var limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        var newName = name;

        var tries = 0;
        while (tries < limit && table.hasCol(newName, "")) {
            tries++;
            newName = name + tries;
        }

        if (tries >= limit) {
            newName = xcHelper.randName(name);
        }

        return newName;
    }

    function listHighlightListener(event) {
        var $list = $operationsView.find('.functionsList')
                                    .find('.list:visible');
        if ($list.length !== 0) {
            var $input = $list.siblings('input');
            switch (event.which) {
                case (keyCode.Down):
                case (keyCode.Up):
                    listHighlight($input, event.which, event);
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
                default:
                    break;
            }
        }
    }

    function hasFuncFormat(val) {
        if (typeof val !== "string") {
            return false;
        }
        val = val.trim();
        var valLen = val.length;

        if (valLen < 4) { // must be at least this long: a(b)
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

    function checkInputSize($input) {
        var currentWidth = $input.outerWidth();
        var textWidth = $input[0].scrollWidth;
        var newWidth;
        if (currentWidth < textWidth) {
            newWidth = textWidth + 80;
            newWidth = Math.min(newWidth, 550);
            $input.parent().width(newWidth)
                           .addClass('modifiedWidth');
        }
    }

    function restoreInputSize($input) {
        $input.parent().width('100%').removeClass('modifiedWidth');
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
        isOpen = false;
        // highlighted column sticks out if we don't close it early
        $("#xcTable-" + tableId).find('.modalHighlighted')
                                .removeClass('modalHighlighted');
        toggleOperationsViewDisplay(true);
        formHelper.removeWaitingBG();
        enableInputs();
        $operationsView.addClass('xc-hidden');
        $activeOpSection.addClass('xc-hidden');
        MainMenu.restoreState(mainMenuPrevState);

        formHelper.clear();
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
        OperationsView.turnOffClickHandlers();
    }

    function resetForm() {
        // clear filter map function input
        $('#mapFilter').val("");

        // clear function list input
        $operationsView.find('.functionsInput').attr('placeholder', "")
                                               .data('value', "")
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

        // empty all checkboxes
        $operationsView.find('.checkbox').removeClass('checked');
        $operationsView.find('.icvMode').addClass('inactive');
        $operationsView.find('.gbCheckboxes').addClass('inactive');

        $operationsView.find('.arg').val("");

        // remove "additional arguments" inputs
        $operationsView.find('.inputWrap.extra').remove();

        // for filter, unminimize first argument box
        $operationsView.find('.group').removeClass('minimized fnInputEmpty');

        fillTableList();

        // clear string preview
        $operationsView.find('.strPreview').empty();

        if (operatorName === "filter") {
            $activeOpSection.find('.group').each(function(i) {
                if (i !== 0) {
                    removeFilterGroup($(this), true);
                }
            });
        }
        
        // empty list scrollers and associated suggest lists
        suggestLists = [[]];
        var numFnScrollers = functionsListScrollers.length;
        delete functionsListScrollers.splice(1, numFnScrollers - 1);
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
                      '<div class="argIconWrap btn btn-small">' +
                        '<i class="icon xi_select-column"></i>' +
                      '</div>' +
                      '<div class="list hint new">' +
                        '<ul></ul>' +
                        '<div class="scrollArea top">' +
                          '<div class="arrow"></div>' +
                        '</div>' +
                        '<div class="scrollArea bottom">' +
                          '<div class="arrow"></div>' +
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
                        OpModalTStr.EmptyHint + '">' +
                        '<span class="checkbox noArg" >'+
                            '<i class="icon xi-ckbox-empty fa-13"></i>'+
                            '<i class="icon xi-ckbox-selected fa-13"></i>'+
                        '</span>' +
                        OpModalTStr.NoArg +
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
                scrollerOnly : true,
                bounds       : '#operationsView',
                bottomPadding: 5
            }
        );
        functionsListScrollers.push(functionsListScroller);
        suggestLists.push([]);// array of groups, groups has array of inputs
        scrollToBottom();
        $activeOpSection.find('.group').last().find('.functionsInput').focus();
        formHelper.refreshTabbing();
    }

    function addGroupOnArg() {
        var html = getArgInputHtml();
        $activeOpSection.find('.gbOnRow').append(html);
        $activeOpSection.find('.gbOnArg').last().focus();
        formHelper.refreshTabbing();
    }

    function addMapArg($btn) {
        var html = getArgInputHtml();
        $btn.parent().prev().find('.inputWrap').last().after(html);
        $btn.parent().prev().find('.inputWrap').last().find('input').focus();
        formHelper.refreshTabbing();
    }

    function getArgInputHtml() {
        var inputClass = "";
        if (operatorName === "map") {
            inputClass = "mapExtraArg";
        } else if (operatorName === "group by") {
            inputClass = "gbOnArg";
        }
        var html = '<div class="inputWrap extra">' +
                        '<div class="dropDownList">' +
                          '<input class="arg ' + inputClass +
                          '" type="text" tabindex="10" ' +
                            'spellcheck="false" data-typeid="-1">' +
                          '<div class="argIconWrap btn btn-small">' +
                            '<i class="icon xi_select-column"></i>' +
                          '</div>' +
                          '<div class="list hint new">' +
                           '<ul></ul>' +
                            '<div class="scrollArea top">' +
                              '<div class="arrow"></div>' +
                            '</div>' +
                            '<div class="scrollArea bottom">' +
                              '<div class="arrow"></div>' +
                            '</div>' +
                         '</div>' +
                        '</div>' +
                        '<i class="icon xi-cancel"></i>' +
                    '</div>';
        return html;
    }

    function removeExtraArg($inputWrap) {
        $inputWrap.remove();
        checkIfStringReplaceNeeded();
    }

    // $group is optional, will minimize all groups if not passed in
    function minimizeGroups($group) {
        if (!$group) {
            $activeOpSection.find('.group').addClass('minimized').each(function () {
                var $group = $(this);
                var numArgs = $group.find('.arg:visible').length;
                $group.attr('data-numargs', numArgs);
                if ($group.find('.functionsInput').val().trim() === "") {
                    $group.addClass('fnInputEmpty');
                }
            });
        } else {
            $group.addClass('minimized');
            var numArgs = $group.find('.arg:visible').length;
            $group.attr('data-numargs', numArgs);
            if ($group.find('.functionsInput').val().trim() === "") {
                $group.addClass('fnInputEmpty');
            }
        }
    }

    function scrollToBottom() {
        var animSpeed = 500;
        var scrollTop = $activeOpSection.closest('.mainContent')[0]
                                        .scrollHeight -
                        $activeOpSection.closest('.mainContent').height();
        // $activeOpSection.closest('.mainContent').scrollTop(scrollHeight);
        $activeOpSection.closest('.mainContent')
        .animate({scrollTop: scrollTop}, animSpeed, function() {

        });
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
            for (var i in categoryNums) {
                $categoryList.find('li[data-category="' + i + '"]')
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

    function removeFilterGroup($group, all) {
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
        delete functionsListScrollers.splice(index, 1);
        delete suggestLists.splice(index, 1);
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
                            'tabindex="10" spellcheck="false" required>' +
                            '<div class="iconWrapper dropdown">' +
                              '<i class="icon xi-arrow-down"></i>' +
                            '</div>' +
                            '<div class="list genFunctionsMenu">' +
                              '<ul data-fnmenunum="' + index + '"></ul>' +
                              '<div class="scrollArea top">' +
                                '<div class="arrow"></div>' +
                              '</div>' +
                              '<div class="scrollArea bottom">' +
                                '<div class="arrow"></div>' +
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        OperationsView.__testOnly__ = {};
        OperationsView.__testOnly__.hasFuncFormat = hasFuncFormat;
        OperationsView.__testOnly__.hasUnescapedParens = hasUnescapedParens;
        OperationsView.__testOnly__.getExistingTypes = getExistingTypes;
        OperationsView.__testOnly__.argumentFormatHelper = argumentFormatHelper;
        OperationsView.__testOnly__.parseType = parseType;
        OperationsView.__testOnly__.formulateMapFilterString = formulateMapFilterString;
        OperationsView.__testOnly__.isNumberInQuotes = isNumberInQuotes;
        OperationsView.__testOnly__.submitForm = submitForm;
        
    }
    /* End Of Unit Test Only */

    return (OperationsView);
}(jQuery, {}));

