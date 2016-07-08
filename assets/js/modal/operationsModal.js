window.OperationsModal = (function($, OperationsModal) {
    var $operationsModal; // $('#operationsModal')
    var $categoryInput;   // $('#categoryList').find('.autocomplete')
    var $categoryUl;      // $('#categoryMenu').find('ul')
    var $functionInput;   // $('#functionList').find('.autocomplete')
    var $functionsMenu;   // $('#functionsMenu')
    var $functionsUl;     // $functionsMenu.find('ul')
    var $menus;           // $('#categoryMenu, #functionsMenu')
    var $autocompleteInputs; // $operationsModal.find('.autocomplete');
    var $argInputs;
    var currentCol;
    var colNum = "";
    var colName = "";
    var isNewCol;
    var operatorName = ""; // group by, map, filter, aggregate, etc..
    var operatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    var $lastInputFocused;
    var categoryListScroller;
    var functionsListScroller;
    var quotesNeeded = [];
    var colPrefix = '$';
    var aggPrefix = "@";

    var modalHelper;
    var corrector;
    var aggNames = [];
    var suggestLists = [];

    var tableId;

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
    OperationsModal.getOperatorsMap = function() {
        return (operatorsMap);
    };

    OperationsModal.setup = function() {
        $operationsModal = $('#operationsModal');
        $categoryInput = $('#categoryList').find('.autocomplete');
        $categoryUl = $('#categoryMenu').find('ul');
        $functionInput = $('#functionList').find('.autocomplete');
        $functionsMenu = $('#functionsMenu');
        $functionsUl = $functionsMenu.find('ul');
        $menus = $('#categoryMenu, #functionsMenu');

        modalHelper = new ModalHelper($operationsModal, {
            "noResize": true
        });

        var allowInputChange = true;

        $autocompleteInputs = $operationsModal.find('.autocomplete');
        $autocompleteInputs.on({
            'mousedown': function(event) {
                gMouseEvents.setMouseDownTarget($(this));
                event.stopPropagation();
                var $list = $(this).siblings('.list');
                if (!$list.is(':visible')) {
                    hideDropdowns();
                }
            },
            'click': function() {
                var $list = $(this).siblings('.list');
                if (!$list.is(':visible')) {
                    hideDropdowns();
                    $operationsModal.find('li.highlighted')
                                    .removeClass('highlighted');
                    // show all list options when use icon to trigger
                    $list.show().find('li').sort(sortHTML)
                                           .prependTo($list.children('ul'))
                                           .show();
                    if ($list.attr('id') === "categoryMenu") {
                        categoryListScroller.showOrHideScrollers();
                    } else {
                        functionsListScroller.showOrHideScrollers();
                    }
                }
            },
            'keydown': function(event) {
                var $input = $(this);
                if (event.which === keyCode.Enter || event.which ===
                    keyCode.Tab) {
                    var inputNum = $autocompleteInputs.index($input);
                    var value    = $input.val().trim().toLowerCase();
                    var prevValue = $input.data('value');
                    $input.data('value', value);


                    if (value === "") {
                        clearInput(inputNum);
                        return;
                    }
                    $input.blur();
                    hideDropdowns();

                    if (prevValue === value && event.which === keyCode.Tab) {
                        return;
                    }

                    // when choose the same category as before
                    if (inputNum === 0 &&
                        value === $functionsMenu.data('category'))
                    {
                        $autocompleteInputs.eq(1).focus();
                        return;
                    }
                    enterInput(inputNum);
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
                var inputNum = $autocompleteInputs.index($input);
                var value = $input.val().trim().toLowerCase();
                $input.data('value', value);

                if (inputNum === 0) {
                    // when $input is $categoryInput
                    updateFunctionsList();
                }
                if ($input.siblings('.list').find('li').length > 0) {
                    clearInput(inputNum, true);
                    return;
                }

                if ($input.val() !== "") {
                    enterInput(inputNum);
                }
            }
        });

        // click icon to toggle list
        $operationsModal.find('.modalTopMain .dropdown').on('click', function() {
            var $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                hideDropdowns();
            } else {

                hideDropdowns();
                $operationsModal.find('li.highlighted')
                                .removeClass('highlighted');
                // show all list options when use icon to trigger
                $list.show().find('li').sort(sortHTML)
                                       .prependTo($list.children('ul'))
                                       .show();
                $list.siblings('input').focus();
                if ($list.attr('id') === "categoryMenu") {
                    categoryListScroller.showOrHideScrollers();
                } else {
                    functionsListScroller.showOrHideScrollers();
                }
            }
        });

        $operationsModal.find('.modalTopMain .dropdown').on('mousedown', function() {
            var $list = $(this).siblings('.list');
            if ($list.is(':visible')) {
                allowInputChange = false;
            } else {
                allowInputChange = true;
            }
        });

        // only for category list and function menu list
        $operationsModal.find('.modalTopMain .list').on({
            'mousedown': function() {
                // do not allow input change
                allowInputChange = false;
            },
            'mouseup': function(event) {
                if (event.which !== 1) {
                    return;
                }
                listMouseup(event, $(this));
            }
        }, 'li');

        // for all lists (including hint li in argument table)
        $operationsModal.on({
            'mouseenter': function() {
                if ($(this).closest('.list').hasClass('disableMouseEnter')) {
                    $(this).closest('.list').removeClass('disableMouseEnter');
                    return;
                }
                $operationsModal.find('li.highlighted')
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

        // click on the hint list
        $operationsModal.on('click', '.hint li', function() {
            var $li = $(this);

            $li.removeClass("openli")
                .closest(".hint").removeClass("openList").hide()
                .siblings(".argument").val($li.text())
                .closest(".dropDownList").removeClass("open");
            checkIfStringReplaceNeeded();
        });

        $lastInputFocused = $operationsModal.find('.argument:first');
        $operationsModal.on('focus', 'input', function() {
            $lastInputFocused = $(this);
        });

        var argumentTimer;
        var $argSection = $operationsModal.find('.argumentSection');
        $operationsModal.on({
            'keydown': function(event) {
                var $input = $(this);
                var $list = $input.siblings('.openList');
                if (event.which === keyCode.Down && $list.length) {

                    $operationsModal.find('li.highlighted')
                                    .removeClass('highlighted');
                    $list.addClass('hovering').find('li')
                                              .addClass('highlighted');
                } else if (event.which === keyCode.Up && $list.length) {
                    $list.removeClass('hovering').find('li')
                                                 .removeClass('highlighted');
                    $list.removeClass("openList").hide()
                         .find('li').removeClass('openLi')
                         .closest('.dropDownList').removeClass("open");
                    event.preventDefault();
                }
            },
            'keypress': function(event) {
                if (event.which === keyCode.Enter &&
                    !modalHelper.checkBtnFocus())
                {
                    if ($argSection.hasClass('minimized')) {
                        return;
                    }
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
                setTimeout(function() {
                    var $mouseTarget = gMouseEvents.getLastMouseDownTarget();
                    if ($argSection.hasClass('minimized') ) {
                        if ($mouseTarget.closest('.editableHead').length === 0) {
                            $lastInputFocused.focus();
                        }
                        return;
                    }
                }, 0);
                restoreInputSize($(this));
            },
            'input': function() {
                // Suggest column name
                var $input = $(this);
                if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                    // for new column name, do not suggest anything
                    return;
                }

                clearTimeout(argumentTimer);
                argumentTimer = setTimeout(function() {
                    argSuggest($input);
                    checkIfStringReplaceNeeded();
                }, 200);

                updateDescription();
                if ($input.siblings('.argIconWrap:visible').length) {
                    checkInputSize($input);
                }
            },
            'mousedown': function() {
                $menus.hide();
                var $activeInput = $(this);
                // close other input's open lists when active input is clicked
                $('.openList').each(function() {
                    if (!$(this).siblings('.argument').is($activeInput)) {
                        $(this).hide();
                    }
                });
                if ($activeInput.siblings('.argIconWrap:visible').length) {
                    checkInputSize($activeInput);
                }
            }
        }, '.argument');

        $operationsModal.on('dblclick', 'input', function() {
            this.setSelectionRange(0, this.value.length);
        });

        $operationsModal.on('click', '.checkbox', function() {
            $(this).toggleClass("checked");
            checkIfStringReplaceNeeded();
        });

        // incSample and keepInTable toggling
        $operationsModal.on('change', 'input[type="checkbox"]', function() {
            var $checkbox = $(this);
            if ($checkbox.prop("checked")) {
                if ($checkbox.attr('id') === "incSample") {
                    $("#keepInTable").prop("checked", false);
                } else if ($checkbox.attr('id') === "keepInTable") {
                    $("#incSample").prop("checked", false);
                }
            }
        });

        // toggle between mininizeTable and unMinimizeTable
        $operationsModal.on('click', '.argIconWrap', function() {
            var $input = $(this).siblings('input');
            if ($argSection.hasClass('minimized')) {
                unminimizeTable();
                $(this).siblings('.argument').focus();
            } else {
                // we want to target only headers that have editableheads
                minimizeTableAndFocusInput($input);
            }
            $lastInputFocused = $input;
        });

        $operationsModal.on('click', '.minimize', function() {
            minimizeTableAndFocusInput($lastInputFocused);
        });
        $operationsModal.on('click', '.maximize', function() {
            unminimizeTable();
        });

        $operationsModal.on('mousedown', '.argIconWrap', function(event) {
            event.preventDefault(); // prevents input from blurring
            event.stopPropagation();
        });

        $operationsModal.find('.confirm').on('click', submitForm);

        $operationsModal.find('.cancel, .close').on('click', function() {
            closeModal();
        });

        $operationsModal.on('click', function() {
            var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
            // close if user clicks somewhere on the op modal, unless
            // they're clicking on a dropdownlist
            if ($mousedownTarget.closest('.dropDownList').length === 0) {
                var dropdownHidden = false;
                $menus.each(function() {
                    if ($(this).is(':visible')) {
                        var $selectedLi = $(this).find('.highlighted');
                        if ($selectedLi.length > 0) {
                            var e = $.Event("mouseup");
                            listMouseup(e, $selectedLi);
                            dropdownHidden = true;
                        }
                    }
                });
                if (!dropdownHidden) {
                    hideDropdowns();
                }
            }
            allowInputChange = true;
        });

        // focus on section's input if you click anywhere in the section except
        // for the actual input and dropdown
        $operationsModal.find('.modalTopMain').on('mousedown', '.step', function(event) {
            var $section = $(this);
            if ($(event.target).closest('.dropDownList').length === 0) {
                event.stopPropagation();
                event.preventDefault();
                hideDropdowns();
                $section.find('input').focus();
            }
        });

        addCastDropDownListener();

        categoryListScroller = new MenuHelper($('#categoryList'), {
            scrollerOnly : true,
            bounds       : '#operationsModal',
            bottomPadding: 5
        });

        functionsListScroller = new MenuHelper($('#functionList'), {
            scrollerOnly : true,
            bounds       : '#operationsModal',
            bottomPadding: 5
        });

        $operationsModal.draggable({
            handle     : '.operationsModalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing',
            cancel     : '.headerBtn, input',
            start      : function() {
                $operationsModal.find('.openList')
                                 .removeClass("openList")
                                 .hide()
                                 .closest(".dropDownList")
                                 .removeClass("open");
            }

        });

        XcalarListXdfs("*", "*")
        .then(function(listXdfsObj) {
            setupOperatorsMap(listXdfsObj.fnDescs);
        })
        .fail(function(error) {
            Alert.error("List XDFs failed", error.error);
        });

        $operationsModal.find('.hint').each(function() {
            var scroller = new MenuHelper($(this), {
                scrollerOnly : true,
                bounds       : '#operationsModal',
                bottomPadding: 5
            });
            suggestLists.push(scroller);
        });

        function listMouseup(event, $li) {
            allowInputChange = true;
            event.stopPropagation();
            var value = $li.text();
            var $input = $li.closest('.list').siblings('.autocomplete');
            var originalInputValue = $input.val();
            hideDropdowns();

            // value didn't change
            if (originalInputValue === value) {
                return;
            }

            $input.val(value);

            if (value === $functionsMenu.data('category')) {
                return;
            }

            var inputNum = $autocompleteInputs.index($input);
            if (inputNum < 2) {
                $autocompleteInputs.eq(inputNum).data('value',
                                                    value.trim().toLowerCase());
            }
            enterInput(inputNum);
        }
    };

    // restore: boolean, if true, will not clear the form from it's last state
    OperationsModal.show = function(currTableId, currColNum, operator, restore) {
        var deferred = jQuery.Deferred();

        if (!restore) {
            resetForm();
            tableId = currTableId;
            var tableCols = gTables[tableId].tableCols;
            currentCol = tableCols[currColNum - 1];
            colNum = currColNum;
            colName = currentCol.name;
            isNewCol = currentCol.isNewCol;
            $operationsModal.find('.operationsModalHeader .text')
                        .text(operator);

            // get modal's origin classes
            var classes = $operationsModal.attr('class').split(' ');
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].startsWith('numArgs')){
                    classes.splice(i, 1);
                    i--;
                }
            }

            $operationsModal.attr('class', classes.join(' '));

            operatorName = operator.toLowerCase().trim();
            $operationsModal.removeClass('fewArgs numerousArgs');
            if (operatorName === 'aggregate') {
                $operationsModal.addClass('fewArgs');
            } else if (operatorName === 'map') {
                $operationsModal.addClass('numerousArgs');
            } else if (operatorName === 'group by') {
                $operationsModal.addClass('numerousArgs');
            }
        }

        $('#xcTable-' + tableId).find('.col' + colNum)
                                .addClass('modalHighlighted');




        // we want the modal to show up ~ below the first row
        var modalTop = $('#xcTable-' + tableId).find('tbody tr').eq(0)
                                               .offset().top +
                                               gRescol.minCellHeight;

        modalHelper.addWaitingBG();
        modalHelper.setup({
            "center": {"maxTop": modalTop},
            "open"  : function() {
                // ops modal has its own opener
                toggleModalDisplay(false);
                if (!restore) {
                    fillInputPlaceholder(0);
                }
            }
        });

        XcalarListXdfs("*", "User*")
        .then(function(listXdfsObj) {
            udfUpdateOperatorsMap(listXdfsObj.fnDescs);

            var aggs = Aggregates.getAggs();
            aggNames = [];
            for (var i in aggs) {
                aggNames.push(aggs[i].dagName);
            }

            if (!restore) {
                var colNames = [];
                tableCols.forEach(function(col) {
                    // skip data column
                    if (col.name !== "DATA") {
                        // Add $ since this is the current format of column
                        colNames.push('$' + col.name);
                    }
                });

                corrector = new Corrector(colNames);

                populateInitialCategoryField(operatorName);
                fillInputPlaceholder(0);

                $categoryInput.focus();
                if ($categoryUl.find('li').length === 1) {
                    var val = $categoryUl.find('li').text();
                    $categoryInput.val(val).change();
                    enterInput(0);
                    $operationsModal.find('.circle1').addClass('filled');
                    $functionInput.focus();
                }
            }

            $operationsModal.find('.list').removeClass('hovering');

            modalHelper.removeWaitingBG();

            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("Listing of UDFs failed", error.error);
            deferred.reject();
        });
        return (deferred.promise());
    };

    function toggleModalDisplay(isHide, time) {
        // do not close background if alert is showing
        if (!isHide || !$('#alertModal').is(":visible")) {
            modalHelper.toggleBG(tableId, isHide, {"time": time});
        }

        var $table = $("#xcTable-" + tableId);
        if (isHide) {
            $table.off('mousedown', '.header, td.clickable', keepInputFocused);
            $table.off('click.columnPicker');
            $('body').off('keydown', listHighlightListener);
        } else {
            if (gMinModeOn) {
                $operationsModal.show();
            } else {
                $operationsModal.fadeIn(400);
            }

            $table.on('click.columnPicker', '.header, td.clickable', function(event) {
                var $target = $(event.target);
                xcHelper.fillInputFromCell($target, $lastInputFocused, colPrefix);
            });
            $table.on('mousedown', '.header, td.clickable', keepInputFocused);
            $('body').on('keydown', listHighlightListener);
        }
    }

    function keepInputFocused(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function minimizeTableAndFocusInput($input) {
        // is there a better way????
        $operationsModal.find('div, p, b, thead').addClass('minimized');
        $operationsModal.find('.modalHeader, .maximize, .close, .tableContainer,' +
                              '.tableWrapper')
                        .removeClass('minimized');
        $operationsModal.find('.maximize').show();
        $operationsModal.find('.argumentSection tbody div').removeClass('minimized');

        $input.focus();
        $('body').on('keydown', opModalKeyListener);
        modalHelper.center();
        $('#statusBox').trigger('mousedown');
        checkInputSize($input);
    }

    function unminimizeTable() {
        $operationsModal.find('.minimized').removeClass('minimized');
        $operationsModal.find('.minimize').show();
        $operationsModal.find('.maximize').hide();
        $('body').off('keydown', opModalKeyListener);
        modalHelper.center();
    }

    function opModalKeyListener(event) {
        if (event.which === keyCode.Enter ||
            event.which === keyCode.Escape)
        {
            event.preventDefault();
            event.stopPropagation();
            // prevent event in order to keep form from submitting or exiting
            // because there's a keypress listener trying to close the modal
            unminimizeTable();
        }
    }

    function addCastDropDownListener() {
        var $lists = $operationsModal.find(".cast.new .dropDownList");
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
                $input.closest('td').prev().find('input')
                                           .data('casted', casted)
                                           .data('casttype', type);
                StatusBox.forceHide();
            },
            "container": "#operationsModal"
        });
        castList.setupListeners();
    }

    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument

    var firstArgExceptions = {
        'conditional functions': ['not']
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
                categoryNames.push(categoryName);
                functionsMap[i] = operatorsMap[i];
                html += '<li data-category="' + i + '">' +
                            categoryName +
                        '</li>';
            }
        } else {
            var categoryIndex;
            if (operator === "aggregate" || operator === "group by") {
                categoryIndex = FunctionCategoryT.FunctionCategoryAggregate;
            } else if (operator === "filter") {
                categoryIndex = FunctionCategoryT.FunctionCategoryCondition;
            }

            categoryName = FunctionCategoryTStr[categoryIndex].toLowerCase();
            categoryNames.push(categoryName);
            functionsMap[0] = operatorsMap[categoryIndex];
            html += '<li data-category="' + 0 + '">' +
                        categoryName +
                    '</li>';
        }

        $categoryUl.html(html);
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
    }

    function udfUpdateOperatorsMap(opArray) {
        var arrayLen = opArray.length;
        var udfCategoryNum = FunctionCategoryT.FunctionCategoryUdf;
        if (opArray.length === 0) {
            delete operatorsMap[udfCategoryNum];
            return;
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
        var index = $operationsModal.find('.hint').index($ul);
        var shouldSuggest = true;
        var corrected;
        var hasAggPrefix = false;
        var listLimit = 30; // do not show more than 30 results

        // when there is multi cols
        if (curVal.indexOf(",") > -1) {
            shouldSuggest = false;
        } else if (curVal.indexOf(aggPrefix) === 0) {
            shouldSuggest = true;
            hasAggPrefix = true;
        } else {
            corrected = corrector.suggest(curVal);

            // should not suggest if the input val is already a column name
            if (corrected == null || corrected === curVal) {
                shouldSuggest = false;
            }
        }

        // should not suggest if the input val is already a column name
        if (shouldSuggest) {
            $ul.find('ul').empty();
            if (hasAggPrefix) {
                var lis = "";
                var count = 0;
                aggNames.forEach(function(name) {
                    if (name.startsWith(curVal)) {
                        lis += '<li class="openli">' + name + '</li>';
                        count++;
                    }
                    if (count > listLimit) {
                        return (false);
                    }
                });
                if (!lis.length) {
                    $ul.find('ul').empty().end().removeClass("openList").hide()
                        .closest(".dropDownList").removeClass("open");
                } else {
                    var $lis = $(lis);
                    $lis.sort(sortHTML);
                    $ul.find('ul').append($lis).end().addClass('openList')
                                                     .show();
                    suggestLists[index].showOrHideScrollers();
                }
            } else {
                $ul.find('ul').append('<li class="openli">' + corrected + '</li>')
                .end().addClass("openList")
                .show();
                suggestLists[index].showOrHideScrollers();
            }


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

    function suggest($input) {
        var value = $input.val().trim().toLowerCase();
        var $list = $input.siblings('.list');

        $operationsModal.find('li.highlighted').removeClass('highlighted');

        $list.show().find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(sortHTML).prependTo($list.find('ul'));

        if ($list.attr('id') === "categoryMenu") {
            categoryListScroller.showOrHideScrollers();
        } else {
            functionsListScroller.showOrHideScrollers();
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
        $operationsModal.find('.list').hide();
        $operationsModal.find('.list li').hide();
        $operationsModal.find('.cast .list li').show();
    }

    function enterInput(inputNum, noFocus) {
        if (inputNum < 2) {
            if (!isOperationValid(inputNum)) {
                showErrorMessage(inputNum);
                var keep = true;
                clearInput(inputNum, keep);
                return;
            } else if (inputNum === 0) {
                updateFunctionsList();
            }
        }

        $operationsModal.find('.circle' + inputNum).addClass('done');
        $operationsModal.find('.link' + inputNum).addClass('filled');

        $operationsModal.find('.step:eq(' + (inputNum + 1) + ')')
                        .removeClass('inactive')
                        .find('.autocomplete')
                        .attr('disabled', false);

        if (!$operationsModal.find('.modalMain').hasClass('inactive')) {
            $operationsModal.find('.minimize').show();
        }

        if (inputNum === 1) {
            produceArgumentTable();
        }

        if (!noFocus) {
            var $input;
            if (inputNum === 1) {
                if (operatorName === "aggregate") {
                    $input = $argInputs.eq(0);
                } else {
                    $argInputs.each(function() {
                        if ($(this).val().trim().length === 0) {
                            $input = $(this);
                            return false;
                        }
                    });
                    if (!$input) {
                        $input = $argInputs.last();
                    }
                }
            } else {

                var inputNumToFocus = inputNum + 1;
                if (inputNum === 1 &&
                    operatorName !== "aggregate" &&
                    operatorName !== "group by" &&
                    !isNewCol) {
                    inputNumToFocus++;
                }

                $input = $operationsModal.find('input:not(.nonEditable)')
                                         .eq(inputNumToFocus);
            }
            $input.focus();
            var val = $input.val();
            $input[0].selectionStart = $input[0].selectionEnd = val.length;
        }

        setTimeout(function() {
            $operationsModal.find('.circle' + (inputNum + 1))
                            .addClass('filled');
        }, 300);
    }

    function clearInput(inputNum, keep) {
        if (!keep) {
            $operationsModal.find('.autocomplete')
                            .eq(inputNum).val("")
                            .attr('placeholder', "");
        }
        if (inputNum === 0) {
            $functionsMenu.data('category', 'null');
        }
        if (inputNum < 2) {
            $autocompleteInputs.eq(inputNum).data('value', "");
        }

        hideDropdowns();

        $operationsModal.find('.outerCircle:eq(' + inputNum + ')')
                        .removeClass('done');
        $operationsModal.find('.outerCircle:gt(' + inputNum + ')')
                        .removeClass('done filled');
        $operationsModal.find('.step:gt(' + inputNum + ')')
                        .addClass('inactive')
                        .find('.autocomplete')
                        .attr('disabled', true)
                        .val("");

        if ($operationsModal.find('.modalMain').hasClass('inactive')) {
            $operationsModal.find('.minimize').hide();
        }

        $operationsModal.find('.innerLink:eq(' + (inputNum) + ')')
                        .removeClass('filled');
        $operationsModal.find('.innerLink:gt(' + (inputNum) + ')')
                        .removeClass('filled');
    }

    function closeListIfNeeded($input) {
        var parentId = $input.closest('.dropDownList').attr('id');
        var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
        if ($mousedownTarget.closest('#' + parentId).length === 0) {
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

    function isOperationValid(inputNum) {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());

        if (inputNum === 0) {

            return (categoryNames.indexOf(category) > -1 );
        } else if (inputNum === 1) {
            var categoryIndex = categoryNames.indexOf(category);
            if (categoryIndex > -1) {
                var matches = $functionsUl.find('li').filter(function() {
                    return ($(this).text().toLowerCase() === func);
                });
                return (matches.length > 0);
            } else {
                return (false);
            }
        }
        return (false);
    }

    function showErrorMessage(inputNum) {
        var text = ErrTStr.NoSupportOp;
        var $target = $operationsModal.find('input').eq(inputNum);
        if ($target.val().trim() === "") {
            text = ErrTStr.NoEmpty;
        }
        StatusBox.show(text, $target, false, {"offsetX": -5});
    }

    function updateFunctionsList() {
        var category = $categoryInput.val().trim().toLowerCase();
        var index = categoryNames.indexOf(category);

        $functionsUl.empty();
        clearInput(1);
        // invalid category
        if (index < 0) {
            return;
        }

        var $categoryLi = $categoryUl.find('li').filter(function() {
            return ($(this).text().toLowerCase() === category);
        });
        var categoryNum = $categoryLi.data('category');
        var ops = functionsMap[categoryNum];

        var html = "";
        for (var i = 0, numOps = ops.length; i < numOps; i++) {
            html += '<li class="textNoCap">' + ops[i].fnName + '</li>';
        }
        var $list = $(html);

        $list.sort(sortHTML).prependTo($functionsUl);
        $functionsMenu.data('category', category);
        fillInputPlaceholder(1);
    }

    function produceArgumentTable() {
        var category = $categoryInput.val().toLowerCase().trim();
        var func = $functionInput.val().toLowerCase().trim();

        var categoryIndex = categoryNames.indexOf(category);

        if (categoryIndex < 0) {
            return;
        }

        var $categoryLi = $categoryUl.find('li').filter(function() {
            return ($(this).text() === categoryNames[categoryIndex]);
        });
        var categoryNum = $categoryLi.data('category');
        var ops = functionsMap[categoryNum];
        var operObj = null;

        for (var i = 0, numOps = ops.length; i < numOps; i++) {
            if (func === ops[i].fnName.toLowerCase()) {
                operObj = ops[i];
                break;
            }
        }

        if (operObj != null) {
            var defaultValue = colPrefix + colName;

            if (firstArgExceptions[category] &&
                firstArgExceptions[category].indexOf(func) !== -1)
            {
                defaultValue = "";
            } else if (isNewCol) {
                defaultValue = "";
            }

            var numArgs = operObj.numArgs;
            if (numArgs < 0) {
                numArgs = 1; // Refer to operObj.numArgs for min number
            }
            var $tbody = $operationsModal.find('.argumentTable tbody');
            var numRowsInTable = $tbody.find('tr').length;
            var numRowsNeeded;
            if (operatorName === "group by") {
                numRowsNeeded = (numArgs + 4) - numRowsInTable;
            } else {
                numRowsNeeded = (numArgs + 1) - numRowsInTable;
            }

            if (numRowsNeeded) {
                var rowHtml = "";
                for (var i = 0; i < numRowsNeeded; i++) {
                    rowHtml += getArgRowHtml();
                }
                $tbody.append(rowHtml);
                addCastDropDownListener();
                var scroller = new MenuHelper(
                            $operationsModal.find('.hint').last(), {
                                scrollerOnly : true,
                                bounds       : 'body',
                                bottomPadding: 5
                            });
                suggestLists.push(scroller);
            }

            $operationsModal.find('.checkbox').removeClass('checked')
                                              .parent()
                                              .removeClass('hidden');

            // as rows order may change, update it here
            $tbody.find("tr.rowToListen")
                .removeClass("rowToListen")
                .off(".groupbyListener");
            var $rows = $tbody.find('tr');
            var $colNameRow = $rows.filter(function() {
                return ($(this).hasClass('colNameRow'));
            });
            $colNameRow.removeClass('colNameRow')
                       .find('.colNameSection')
                       .removeClass('colNameSection');

            $rows.find('.cast input').val('default');
            hideCastColumn();

            $rows.find('input').data('typeid', -1)
                               .data('casted', false)
                               .data('casttype', null)
                 .end()
                 .find('.checkboxSection')
                 .removeClass('checkboxSection')
                 .removeClass("disabled")
                 .removeAttr("data-toggle")
                 .removeAttr("data-placement")
                 .removeAttr("data-original-title")
                 .removeAttr("data-container")
                 .find('input').attr('type', 'text')
                 .prop("checked", false)
                 .removeAttr('id')
                 .end()
                 .find('.checkBoxText').remove();

            $rows.find('.argument').off('input.aggPrefix');
            $rows.find('.argument').off('keydown.aggPrefix');
            $rows.find('.argument').off('focus.aggPrefix');
            $rows.find('.argument').off('blur.aggPrefix');

            var description;
            var autoGenColName;
            var typeId;
            var despText = operObj.fnDesc;

            for (var i = 0; i < numArgs; i++) {
                if (operObj.argDescs[i]) {
                    description = operObj.argDescs[i].argDesc;
                    typeId = operObj.argDescs[i].typesAccepted;
                } else {
                    description = "";
                    var keyLen = Object.keys(DfFieldTypeT).length;
                    typeId = Math.pow(2, keyLen + 1) - 1;
                }

                var $input = $rows.eq(i).find('.argument');
                if (i === 0 && operatorName !== "group by") {
                    $input.val(defaultValue);
                } else {
                    $input.val("");
                }
                $input.data("typeid", typeId);
                $rows.eq(i).find('.description').text(description);
            }

            if (operatorName === 'map') {
                description = OpModalTStr.ColNameDesc;
                var tempName = colName;
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

                $rows.eq(numArgs).addClass('colNameRow')
                                .find('.dropDownList')
                                .addClass('colNameSection')
                                .end()
                                .find('.argument').val(autoGenColName)
                                .end()
                                .find('.description').text(description);
                ++numArgs;
                despText = '<p>' + despText + '</p>' +
                            '<b>String Preview:</b>' +
                            '<p class="funcDescription textOverflow">' +
                                operatorName + '(' + operObj.fnName + '(' +
                                '<span class="descArgs">' +
                                    $rows.eq(0).find(".argument").val() +
                                '</span>)' +
                                ')' +
                            '</p>';
            } else if (operatorName === 'group by') {
                var $rowToListen;
                description = 'Field name to group by';

                $rowToListen = $rows.eq(numArgs).addClass("rowToListen");
                $rowToListen.find('.argument').val(defaultValue)
                            .end()
                            .find('.description').text(description);

                ++numArgs;

                // new col name field
                description = 'New Column Name for the groupBy' +
                                ' resultant column';
                autoGenColName = getAutoGenColName(colName + "_" + func);
                $rows.eq(numArgs).addClass('colNameRow')
                                 .find('.dropDownList')
                                    .addClass('colNameSection')
                                .end()
                                .find('.argument').val(autoGenColName)
                                .end()
                                .find('.description').text(description);
                ++numArgs;

                // check box for include sample
                description = OpModalTStr.IncSampleDesc;
                var checkboxText =
                    '<label class="checkBoxText" for="incSample">' +
                    OpModalTStr.IncSample + '</span>';

                $rows.eq(numArgs).addClass('colNameRow')
                        .find('.dropDownList').addClass('checkboxSection')
                        .end()
                        .find('.argument').val("").attr("type", "checkbox")
                                                .attr("checked", false)
                                                .attr("id", "incSample")
                            .after(checkboxText)
                        .end()
                        .find('.description').text(description)
                        .end()
                        .find('.checkboxWrap').addClass('hidden');
                ++numArgs;

                // check box for join group by table
                description = OpModalTStr.KeepInTableDesc;
                var checkboxText =
                    '<label class="checkBoxText" for="keepInTable">' +
                     OpModalTStr.KeepInTable + '</span>';

                $rows.eq(numArgs).addClass('colNameRow')
                        .find('.dropDownList').addClass('checkboxSection')
                        .end()
                        .find('.argument').val("").attr("type", "checkbox")
                                                .attr("checked", false)
                                                .attr("id", "keepInTable")
                            .after(checkboxText)
                        .end()
                        .find('.description').text(description)
                        .end()
                        .find('.checkboxWrap').addClass('hidden');
                ++numArgs;

                despText = '<p>' + despText + '</p>' +
                            '<b>String Preview:</b>' +
                            '<p class="funcDescription textOverflow">' +
                                operObj.fnName + '(' +
                                '<span class="aggCols">' +
                                    $rows.eq(0).find(".argument").val() +
                                '</span>' +
                                '), GROUP BY ' +
                                '<span class="groupByCols">' +
                                    defaultValue +
                                '</span>' +
                            '</p>';

                // this part prevent multi groupby to include sample
                // because it sample will mess up with indexed cols
                // XXX just a temporary work around
                var prevCheck = false;
                $rowToListen.on("input.groupbyListener", ".argument", function(event) {
                    var numCols = $(event.target).val().split(",").length;
                    var $checkbox = $("#incSample");
                    var $checkboxSection = $checkbox.closest(".checkboxSection");

                    if (numCols > 1) {
                        // when try to do multi groupby
                        var title = "Including sample temporarily not supported for multi groupby";
                        $checkboxSection.addClass("disabled")
                                        .attr("data-toggle", "tooltip")
                                        .attr("data-placement", "right")
                                        .attr("data-original-title", title)
                                        .attr("data-container", "body");
                        $checkbox.prop("checked", false);
                    } else {
                        $checkboxSection.removeClass("disabled")
                                        .removeAttr("data-toggle")
                                        .removeAttr("data-placement")
                                        .removeAttr("data-original-title")
                                        .removeAttr("data-container");
                        $checkbox.prop("checked", prevCheck);
                        if (prevCheck) {
                            $('#keepInTable').prop("checked", false);
                        }
                    }
                });

                $("#incSample").click(function() {
                    // cache previous checked state
                    prevCheck = $(this).prop("checked") || false;
                });
            } else if (operatorName === "filter") {
                despText = '<p>' + despText + '</p>' +
                            '<b>String Preview:</b>' +
                            '<p class="funcDescription textOverflow">' +
                                operatorName + '(' + operObj.fnName + '(' +
                                '<span class="descArgs">' +
                                    $rows.eq(0).find(".argument").val() +
                                '</span>)' +
                                ')' +
                            '</p>';
            } else if (operatorName === "aggregate") {
                var description = OpModalTStr.AggNameDesc;

                $rows.eq(numArgs).addClass('colNameRow')
                                .find('.dropDownList')
                                .addClass('colNameSection')
                                .end()
                                .find('.argument').val("")
                                .end()
                                .find('.description').text(description);

                var $nameInput =  $rows.eq(numArgs).find('.argument');

                // focus, blur, keydown, input listeners ensures the aggPrefix
                // is always the first chracter in the colname input
                // and is only visible when focused or changed
                $nameInput.on('focus.aggPrefix', function() {
                    var $input = $(this);
                    if ($input.val().trim() === "") {
                        $input.val(aggPrefix);
                    }
                });
                $nameInput.on('blur.aggPrefix', function() {
                    var $input = $(this);
                    if ($input.val().trim() === aggPrefix) {
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
                    if (trimmedVal[0] !== aggPrefix) {
                        var caretPos = $input.caret();
                        $input.val(aggPrefix + val);
                        if (caretPos === 0) {
                            $input.caret(1);
                        }
                    }
                });
                ++numArgs;
            }

            $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();
            $operationsModal.find('.descriptionText').html(despText);
            if (numArgs > 4) {
                $operationsModal.find('.tableContainer').addClass('manyArgs');
            } else {
                $operationsModal.find('.tableContainer')
                                .removeClass('manyArgs');
            }
            $argInputs = $operationsModal.find('.argumentSection .argument:visible');
            $operationsModal.find('.argument').parent().each(function(i) {
                // xx this would be a bug if more than 100 arguments ¯\_(ツ)_/¯
                $(this).css('z-index', 100 - i);
            });

            modalHelper.refreshTabbing();

            var noHighlight = true;
            checkIfStringReplaceNeeded(noHighlight);
        }
    }

    function updateDescription(noHighlight) {
        var $description = $operationsModal.find(".funcDescription");

        var numArgs = $argInputs.length;
        // var val;
        var $inputs = $argInputs;
        var tempText;
        var newText = "";
        if (operatorName === "map" || operatorName === "filter") {
            var oldText = $description.find('.descArgs').text();
            if (operatorName === "map") {
                numArgs--;
                $inputs = $argInputs.not(':last');
            }
            $inputs.each(function(i) {
                var $input = $(this);
                var val = $input.val();
                val = parseAggPrefixes(val);
                val = parseColPrefixes(val);

                if (quotesNeeded[i]) {
                    val = "\"" + val + "\"";
                }

                if (i > 0) {
                    // check: if arg is blank and is not a string then do not add comma
                    // ex. add(6) instead of add(6, )
                    if (val === "") {
                        var typeId = $input.data('typeid');
                        var types = parseType(typeId);
                        if (types.indexOf("string") > -1 ||
                            !$input.closest('tr').find('.checked').length) {
                            val = ", " + val;
                        }
                    } else {
                        val = ", " + val;
                    }
                }

                newText += val;

            });
            if (noHighlight) {
                tempText = newText;
                newText = "";
                for (var i = 0; i < tempText.length; i++) {
                    newText += "<span class='char'>" + tempText[i] + "</span>";
                }
                $description.find(".descArgs").html(newText);
            } else {
                var $spanWrap = $description.find(".descArgs");
                var $spans = $spanWrap.find('span.char');
                modifyDescText(oldText, newText, $spanWrap, $spans);
            }


        } else if (operatorName === "group by") {
            var aggColOldText = $description.find(".aggCols").text();
            var aggColNewText = $argInputs.eq(0).val().trim();
            aggColNewText = parseAggPrefixes(aggColNewText);
            aggColNewText = parseColPrefixes(aggColNewText);
            var gbColOldText = $description.find(".groupByCols").text();
            var gbColNewText = $argInputs.eq(1).val().trim();
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
    }

    function modifyDescText(oldText, newText, $spanWrap, $spans) {
        var diff = findStringDiff(oldText, newText);
        if (diff.type !== "none") {
            var type = diff.type;
            var position;

            switch (type) {
                case ('remove'):
                // do nothing
                    position = diff.start;
                    for (var i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }

                    break;
                case ('add'):
                    var tempText = newText;
                    newText = "";
                    for (var i = diff.start; i < diff.start + diff.added; i++) {
                        newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";
                    }
                    if (diff.start === 0) {
                        $spanWrap.prepend(newText);
                    } else {
                        $spans.eq(diff.start - 1).after(newText);
                    }
                    break;
                case ('replace'):
                    var tempText = newText;
                    position = diff.start;
                    newText = "";
                    for (var i = 0; i < diff.removed; i++) {
                        $spans.eq(position++).remove();
                    }
                    for (var i = diff.start; i < diff.start + diff.added; i++) {
                        newText += "<span class='char visible'>" +
                                    tempText[i] + "</span>";

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

    function findStringDiff(oldText, newText) {

        // Find the index at which the change began
        var start = 0;
        while (start < oldText.length && start < newText.length &&
               oldText[start] === newText[start]) {
            start++;
        }

        // Find the index at which the change ended (relative to the end of the string)
        var end = 0;
        while (end < oldText.length &&
            end < newText.length &&
            oldText.length - end > start &&
            newText.length - end > start &&
            oldText[oldText.length - 1 - end] === newText[newText.length - 1 - end])
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
        var existingTypes = {};

        var typeIds = [];
        quotesNeeded = [];
        $argInputs.each(function() {
            var $input = $(this);
            var arg    = $input.val().trim();
            var type   = null;

            // ignore new colname input
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                return;
            } else if (hasUnescapedParens(arg)) {
                // skip
            } else if (xcHelper.hasValidColPrefix(arg, colPrefix)) {
                arg = parseColPrefixes(arg);
                if ($("#categoryList input").val().indexOf("user") !== 0) {
                    type = getColumnTypeFromArg(arg);
                }
            } else if (arg[0] === aggPrefix) {
                // skip
            } else {
                var parsedType = parseType($input.data('typeid'));
                if (parsedType.length === 6) {
                    type = null;
                } else {
                    var isString = formatArgumentInput(arg, $input.data('typeid'),
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

        $argInputs.each(function(i) {
            var $input = $(this);
            var arg = $(this).val().trim();
            var parsedType = parseType(typeIds[i]);
            if (!$input.closest(".dropDownList").hasClass("colNameSection") &&
                !xcHelper.hasValidColPrefix(arg, colPrefix) &&
                arg[0] !== aggPrefix &&
                parsedType.indexOf("string") !== -1 &&
                !hasUnescapedParens(arg)) {

                if (parsedType.length === 1) {
                    // if input only accepts strings
                    quotesNeeded.push(true);
                } else if (!$.isEmptyObject(existingTypes) &&
                        existingTypes.hasOwnProperty("string")) {
                    quotesNeeded.push(true);
                } else {
                    quotesNeeded.push(false);
                }
            } else {
                quotesNeeded.push(false);
            }
        });
        updateDescription(noHighlight);
    }

    function checkArgumentParams() {
        var allInputsFilled = true;
        $argInputs.each(function(index) {
            var $input = $(this);

            if ($input.closest('.dropDownList').hasClass('checkboxSection')) {
                return (true);
            }

            if (!$input.closest('.dropDownList').hasClass('colNameSection')) {
                // if map, some args can be blank
                if (operatorName === "map") {
                    if ($categoryInput.val() === "user-defined functions") {
                        return (true);
                    }
                    if ($categoryInput.val() === "string functions") {
                        if ($functionInput.val() !== "cut" &&
                            $functionInput.val() !== "substring") {
                            return (true);
                        } else {
                            if ($functionInput.val() === "substring") {
                                if (index === 0) {
                                    return (true);
                                }
                            } else if (index !== 1) {
                                return (true);
                            }
                        }
                    }
                }
                // allow blanks in eq and like filters
                if (operatorName === "filter") {
                    if ($functionInput.val() === "eq" ||
                        $functionInput.val() === "like") {
                        return (true);
                    }
                }
            }

            // Special case: When the user actually wants to have <space>
            // or \n as an input, then we should not trim it.
            var origLength = $(this).val().length;

            var val = $(this).val().trim();

            var newLength = val.length;
            if (origLength > 0 && newLength === 0) {
                val = $(this).val();
            }
            if (val === "") {
                allInputsFilled = false;
                return (true);
            }
        });

        if (allInputsFilled) {
            var noFocus = true;
            enterInput(2, noFocus);
            return (true);
        } else {
            clearInput(2);
            return (true);
        }
    }

    function getExistingTypes() {
        var existingTypes = {};
        var arg;
        var $input;
        var type;
        $argInputs.each(function() {
            $input = $(this);
            arg = $input.val().trim();
            type = null;

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                arg = parseColPrefixes(arg);
                type = getColumnTypeFromArg(arg);
            } else if (xcHelper.hasValidColPrefix(arg, colPrefix)) {
                arg = parseColPrefixes(arg);

                // Since there is currently no way for users to specify what
                // col types they are expecting in the python functions, we will
                // skip this type check if the function category is user defined
                // function.
                if ($("#categoryList input").val().indexOf("user") !== 0) {
                    type = getColumnTypeFromArg(arg);
                }
            }

            if (type != null) {
                existingTypes[type] = true;
            }
        });
        return (existingTypes);
    }

    function submitForm() {
        var isPassing = false;
        modalHelper.submit();

        if (!isOperationValid(0)) {
            showErrorMessage(0);
        } else if (!isOperationValid(1)) {
            showErrorMessage(1);
        } else {
            isPassing = checkArgumentParams();
        }

        if (!isPassing) {
            modalHelper.enableSubmit();
            return;
        }

        var invalidInputs = [];

        var validBlanks = checkIfBlanksAreValid(invalidInputs);

        if (!validBlanks) {
            var hasEmptyOption = invalidInputs[0].closest('.colNameSection')
                                              .length === 0;
            var errorMsg;
            if (hasEmptyOption) {
                errorMsg = ErrTStr.NoEmptyOrCheck;
            } else {
                errorMsg = ErrTStr.NoEmpty;
            }
            StatusBox.show(errorMsg, invalidInputs[0]);
            modalHelper.enableSubmit();
            return;
        }

        var args = [];

        // get colType first
        var existingTypes = getExistingTypes();
        var argFormatHelper = argumentFormatHelper(existingTypes);

        isPassing = argFormatHelper.isPassing;
        args = argFormatHelper.args;

        if (!isPassing) {
            modalHelper.enableSubmit();
            return;
        }

        // name duplication check
        var $nameInput;
        var isPromise = false;
        switch (operatorName) {
            case ('map'):
                $nameInput = $argInputs.eq(args.length - 1);
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
                $nameInput = $argInputs.eq(2);
                isPassing = !ColManager.checkColDup($nameInput, null, tableId);
                break;
            case ('aggregate'):
                if (args[1].length > 1) {
                    isPromise = true;
                    checkAggregateNameValidity()
                    .then(function(isPassing) {
                        if (!isPassing) {
                            modalHelper.enableSubmit();
                        } else {
                            submitFinalForm(args);
                        }
                    })
                    .fail(function(err) {
                        modalHelper.enableSubmit();
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
                modalHelper.enableSubmit();
            } else {
                submitFinalForm(args);
            }
        }
    }

    function submitFinalForm(args) {
        var func = $functionInput.val().trim();
        var funcLower = func.substring(0, 1).toLowerCase() + func.substring(1);
        var funcCapitalized = func.substr(0, 1).toUpperCase() + func.substr(1);
        var isPassing;

        // all operation have their own way to show error StatusBox
        switch (operatorName) {
            case ('aggregate'):
                isPassing = aggregateCheck(args);
                break;
            case ('filter'):
                isPassing = filterCheck(func, args);
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
            closeModal({slow: true});

            var colTypeInfos = getCastInfo(args);

            switch (operatorName) {
                case ('aggregate'):
                    aggregate(funcCapitalized, args, colTypeInfos);
                    break;
                case ('filter'):
                    filter(func, args, colTypeInfos);
                    break;
                case ('group by'):
                    groupBy(funcCapitalized, args, colTypeInfos);
                    break;
                case ('map'):
                    map(funcLower, args, colTypeInfos);
                    break;
                default:
                    showErrorMessage(0);
                    isPassing = false;
                    break;
            }

        } else {
            modalHelper.enableSubmit();
        }
    }

    // returns an array of objects that include the new type and argument number
    function getCastInfo(args) {
        var table = gTables[tableId];
        var colTypeInfos = [];

        // set up colTypeInfos, filter out any that shouldn't be casted
        $argInputs.each(function(i) {
            var $input = $(this);
            isCasting = $input.data('casted');
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

    function argumentFormatHelper(existingTypes) {
        var args = [];
        var isPassing = true;
        var colTypes;
        var typeid;
        var allColTypes = [];
        var errorText;
        var $errorInput;
        var errorType;
        var invalidNonColumnType = false; // when an input does not have a
        // a column name but still has an invalid type

        // XXX this part may still have potential bugs
        $argInputs.each(function(inputNum) {
            var $input = $(this);

            // Edge case. GUI-1929
            var origLength = $input.val().length;

            var arg = $input.val().trim();

            var newLength = arg.length;
            // var containsColumn = false;

            if (origLength > 0 && newLength === 0) {
                arg = $input.val();
            }

            typeid = $input.data('typeid');

            // col name field, do not add quote
            if ($input.closest(".dropDownList").hasClass("colNameSection")) {
                arg = parseColPrefixes(arg);
            } else if (hasUnescapedParens(arg)) {
                if (hasFuncFormat(arg)) {
                    arg = parseColPrefixes(arg);
                } else {
                    errorText = ErrTStr.BracketsMis;
                    $errorInput = $input;
                    errorType = "unmatchedParens";
                    isPassing = false;
                }
            } else if (arg[0] === aggPrefix) {
                // leave it
            } else if (xcHelper.hasValidColPrefix(arg, colPrefix)) {
                // if it contains a column name
                // note that field like pythonExc can have more than one $col
                // containsColumn = true;
                arg = parseColPrefixes(arg);

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
                if ($("#categoryList input").val().indexOf("user") !== 0) {
                    var types;
                    if (tempColNames.length > 1 &&
                        (operatorName !== "group by" ||
                        (operatorName === "group by" && inputNum !== 1))) {
                        // non group by fields cannot have multiple column names;
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
                            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
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
                                if (colTypes[i] != null) {
                                    if (types.indexOf(colTypes[i]) < 0) {
                                        isPassing = false;
                                        if (colTypes[i] === "newColumn") {
                                            errorText = ErrTStr.InvalidOpNewColumn;
                                        } else {
                                            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                                                "type1": types.join("/"),
                                                "type2": colTypes[i]
                                            });
                                        }

                                        $errorInput = $input;

                                        errorType = "invalidColType";
                                    }
                                } else {
                                    console.error("colType is null/col not pulled!");
                                }
                            }
                        }
                    }
                } else {
                    allColTypes.push({});
                }
            } else if (!isPassing) {
                // leave it
            } else {
                var checkRes = checkArgTypes(arg, typeid);

                if (checkRes != null && !invalidNonColumnType) {
                    isPassing = false;
                    invalidNonColumnType = true;
                    if (checkRes.currentType === "newColumn") {
                        errorText = ErrTStr.InvalidOpNewColumn;
                    } else {
                        errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidOpsType, {
                            "type1": checkRes.validType.join("/"),
                            "type2": checkRes.currentType
                        });
                    }

                    $errorInput = $input;
                    errorType = "invalidType";
                } else {
                    var parsedType = parseType(typeid);
                    if (parsedType.length < 6) {
                        var formatArgumentResults = formatArgumentInput(arg, typeid,
                                                            existingTypes);
                        arg = formatArgumentResults.value;
                    }
                }
            }

            args.push(arg);
        });

        if (!isPassing) {
            if (errorType === "invalidColType") {
                var castIsVisible = $operationsModal.find('.cast')
                                                    .hasClass('showing');
                showCastColumn(allColTypes)
                .then(function() {
                    if (!castIsVisible) {
                        var $castDropdown = $errorInput.closest('td').next()
                                            .find('.dropDownList:visible');
                        if ($castDropdown.length) {
                            $errorInput = $castDropdown.find('input');
                        }
                        StatusBox.show(errorText, $errorInput);
                    }
                });
                if (castIsVisible) {
                    var $castDropdown = $errorInput.closest('td').next()
                                            .find('.dropDownList:visible');
                    if ($castDropdown.length) {
                        $errorInput = $castDropdown.find('input');
                    }
                    StatusBox.show(errorText, $errorInput);
                }
            } else {
                resetCastOptions($errorInput);
                StatusBox.show(errorText, $errorInput);
            }
        }

        return ({args: args, isPassing: isPassing, allColTypes: allColTypes});
    }

    function showCastColumn(allColTypes) {
        var deferred = jQuery.Deferred();

        getProperCastOptions(allColTypes);
        var isCastAvailable = displayCastOptions(allColTypes);
        $operationsModal.find('.cast .list li').show();

        if (isCastAvailable) {
            $operationsModal.find('.cast').addClass('showing');
            $operationsModal.find('.descCell').addClass('castShowing');
            setTimeout(function() {
                if ($operationsModal.find('.cast.showing').length) {
                    $operationsModal.find('.cast').addClass('overflowVisible');
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

    function displayCastOptions(allColTypes) {

        var $castDropdowns = $operationsModal.find('td.cast')
                                             .find('.dropDownList');
        $castDropdowns.addClass('hidden');
        var lis;
        var castAvailable = false;
        for (var i = 0; i < allColTypes.length; i++) {
            if (allColTypes[i].filteredTypes &&
                allColTypes[i].filteredTypes.length) {
                castAvailable = true;
                lis = "<li class='default'>default</li>";
                $castDropdowns.eq(allColTypes[i].inputNum).removeClass('hidden');
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
        $input.closest('td').next().find('input').val('default');
        $input.data('casted', false);
        $input.data('casttype', null);
    }

    function hideCastColumn() {
        $operationsModal.find('.cast').removeClass('showing overflowVisible');
        $operationsModal.find('.descCell').removeClass('castShowing');
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
        var aggColNum = getColNum(args[0]);
        if (aggColNum < 1) {
            StatusBox.show(ErrTStr.InvalidColName, $argInputs.eq(0));
            return false;
        } else {
            return true;
        }
    }

    function aggregate(aggrOp, args, colTypeInfos) {
        var aggColNum = getColNum(args[0]);
        var tableCol = gTables[tableId].getCol(aggColNum);
        var aggStr = tableCol.getBackColName();
        var aggName = args[1];
        if (colTypeInfos.length) {
            aggStr = xcHelper.castStrHelper(args[0], colTypeInfos[0].type);
        }
        if (aggName.length < 2) {
            aggName = null;
        }

        xcFunction.aggregate(aggColNum, tableId, aggrOp, aggStr, aggName);
        return true;
    }

    function hasAggPrefix(val) {
        if (val[0] === aggPrefix) {
            return true;
        } else if (val[0] === "\\" && val[1] === aggPrefix) {
            return true;
        } else {
            return false;
        }
    }

    function filterCheck(operator, args) {
        if (!hasUnescapedParens(args[0])) {
            var filterColNum = getColNum(args[0]);
            if (filterColNum < 1) {
                StatusBox.show(ErrTStr.InvalidColName, $argInputs.eq(0));
                return false;
            } else {
                return true;
            }
        } else {
            return true;
        }
    }

    function filter(operator, args, colTypeInfos) {
        var filterColNum;
        // var colName;
        if (!hasUnescapedParens(args[0])) {
            filterColNum = getColNum(args[0]);
        } else {
            filterColNum = colNum;
        }

        var filterString = formulateMapFilterString(operator, args, colTypeInfos);
        xcFunction.filter(filterColNum, tableId, {
            "filterString": filterString
        });

        return true;
    }

    function getColNum(backColName) {
        return gTables[tableId].getColNumByBackName(backColName);
    }

    function groupBy(operator, args, colTypeInfos) {
        // Current groupBy has 4 arguments:
        // 1. grouby col
        // 2. indexed col
        // 3. is include sample
        // 4. new col name

        var groupbyColName = args[0];

        if (colTypeInfos.length) {
            for (var i = 0; i < colTypeInfos.length; i++) {
                if (colTypeInfos[i].argNum === 0) {
                    groupbyColName = xcHelper.castStrHelper(args[0],
                                                    colTypeInfos[i].type);
                    break;
                }
            }
        }

        // var singleArg = true;
        var indexedColNames = args[1];
        var newColName  = args[2];
        var options = {
            "isIncSample": $argInputs.eq(3).is(':checked'),
            "isJoin"     : $argInputs.eq(4).is(':checked')
        };
        if (options.isIncSample && options.isJoin) {
            console.warn('shouldnt be able to select incSample and join');
            options.isIncSamples = false;
        }

        xcFunction.groupBy(operator, tableId, indexedColNames, groupbyColName,
                            newColName, options);
    }

    function groupByCheck(args) {
        var groupbyColName = args[0];
        var singleArg = true;
        var indexedColNames = args[1];
        var isGroupbyColNameValid = checkValidColNames($argInputs.eq(0),
                                                        groupbyColName,
                                                        singleArg);
        if (!isGroupbyColNameValid) {
            StatusBox.show(ErrTStr.InvalidColName, $argInputs.eq(0));
            return (false);
        } else {
            var areIndexedColNamesValid = checkValidColNames($argInputs.eq(1),
                                                        indexedColNames);
            if (!areIndexedColNamesValid) {
                StatusBox.show(ErrTStr.InvalidColName, $argInputs.eq(1));
                return (false);
            } else {
                return (true);
            }
        }
    }

    function map(operator, args, colTypeInfos) {
        var numArgs = args.length;
        var newColName = args.splice(numArgs - 1, 1)[0];
        var mapStr = formulateMapFilterString(operator, args, colTypeInfos);
        var mapOptions = {};
        if (isNewCol) {
            mapOptions.replaceColumn = true;
            if (colName === "") {
                var widthOptions = {defaultHeaderStyle: true};
                var width = getTextWidth($(), newColName, widthOptions);
                mapOptions.width = width;
            }
        }

        var startTime = Date.now();

        xcFunction.map(colNum, tableId, newColName, mapStr, mapOptions)
        .fail(function(error) {
            var endTime = Date.now();
            var elapsedTime = endTime - startTime;
            var timeSinceLastClick = endTime - gMouseEvents.getLastMouseDownTime();

            if (timeSinceLastClick < elapsedTime) {
                return;
            }
            // overwrite thriftlog alert modal if user has not clicked
            var origMsg = $("#alertContent .text").text().trim();
            if (origMsg[origMsg.length - 1] !== ".") {
                origMsg += ".";
            }
            var newMsg = origMsg + "\n" + OpModalTStr.ModifyMapDesc;
            Alert.error(StatusMessageTStr.MapFailed, newMsg,
                {"buttons": [{
                    "name": OpModalTStr.ModifyMap,
                    "func": function() {
                        OperationsModal.show(null, null, null, true);
                    }
                }],
                "onCancel": function() {
                    modalHelper.toggleBG(tableId, true, {"time": 300});
                }
            });
        });
    }

    function formulateMapFilterString(operator, args, colTypeInfos) {
        var str = operator + "(";
        var argNum;
        for (var i = 0; i < colTypeInfos.length; i++) {
            argNum = colTypeInfos[i].argNum;
            args[argNum] = xcHelper.castStrHelper(args[argNum],
                                                 colTypeInfos[i].type);
        }

        for (var i = 0; i < args.length; i++) {
            // check: if arg is blank and is not a string then do not add comma
            // ex. add(6) instead of add(6, )
            if (args[i] === "") {
                var $input = $argInputs.eq(i);
                var typeId = $input.data('typeid');
                var types = parseType(typeId);
                if (types.indexOf("string") > -1 ||
                    !$input.closest('tr').find('.checked').length) {
                    str += args[i] + ", ";
                }
            } else {
                str += args[i] + ", ";
            }
        }
        // remove last comma and space;
        if (args.length > 0) {
            str = str.slice(0, -2);
        }

        str += ")";
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
        var numValues = values.length;
        var columns = gTables[tableId].tableCols;
        var numCols = columns.length;
        var types = [];
        var value;
        var trimmedVal;
        var colArg;
        for (var i = 0; i < numValues; i++) {
            value = values[i];
            trimmedVal = value.trim();
            if (trimmedVal.length > 0) {
                value = trimmedVal;
            }
            for (var j = 0; j < numCols; j++) {
                if (columns[j].name === value) {
                    var colType = columns[j].type;
                    colArg = columns[j].getBackColName();

                    if (colArg != null) {
                        var bracketIndex = colArg.indexOf("[");
                        if (bracketIndex > -1 &&
                            colArg[bracketIndex - 1] !== "\\") {
                            colType = CommonTxtTstr.ArrayVal;
                        }
                    }
                    types.push(colType);
                    break;
                }
            }
        }
        return (types);
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
        var $input = $argInputs.eq(1);
        var val = $input.val().trim();
        var errorTitle;
        var invalid = false;
        if (val[0] !== aggPrefix) {
            errorTitle = ErrTStr.InvalidAggName;
            invalid = false;
        } else if (/^ | $|[,\(\)'"]/.test(name) === true) {
            errorTitle = ColTStr.RenamSpecialChar;
            invalid = true;
        } else if (val.length < 2) {
            errorTitle = ErrTStr.InvalidAggLength;
            invalid = true;
        }

        if (invalid) {
            showInvalidAggregateName($input, errorTitle);
            deferred.resolve(false);
        } else {
            // check duplicates
            // XXX temp fix for backend not wanting @
            val = val.slice(1);
            XcalarGetConstants(val)
            .then(function(ret) {
                if (ret.length) {
                    errorTitle = xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        "name": val
                    });
                    showInvalidAggregateName($input, errorTitle);
                    deferred.resolve(false);
                } else {
                    deferred.resolve(true);
                }
            })
            .fail(function() {
                deferred.reject();
            });
        }
        return (deferred.promise());
    }

    function showInvalidAggregateName($input, errorTitle) {
        var container = $input.closest('.mainPanel').attr('id');
        var $toolTipTarget = $input.parent();

        $toolTipTarget.tooltip({
            "title"    : errorTitle,
            "placement": "top",
            "trigger"  : "manual",
            "container": "#" + container,
            "template" : TooltipTemplate.Error
        });

        $toolTipTarget.tooltip('show');
        $input.click(hideTooltip);

        var timeout = setTimeout(function() {
            hideTooltip();
        }, 5000);

        function hideTooltip() {
            $toolTipTarget.tooltip('destroy');
            $input.off('click', hideTooltip);
            clearTimeout(timeout);
        }
    }

    function checkArgTypes(arg, typeid) {
        var types = parseType(typeid);
        var argType = "string";
        var tmpArg;
        var isBoolean = false;
        var isNumber = true;

        if (types.indexOf("string") > -1 ||
            types.indexOf("mixed") > -1 ||
            types.indexOf("undefined") > -1)
        {
            // if it accept string/mixed/undefined, any input
            // should be valid
            return null;
        }

        tmpArg = arg.toLowerCase();
        isNumber = !isNaN(Number(arg));

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
        var isValidBlanks = true;
        var check;
        $argInputs.each(function() {
            var $input   = $(this);
            var val   = $input.val().trim();
            var $checkboxWrap = $input.closest('tr').find('.checkboxWrap');
            check = false;
            if ($checkboxWrap.hasClass('hidden')) {
                check = true;
            } else if ($checkboxWrap.find('.checkbox').hasClass('checked')) {
                check = true;
            } else if (operatorName === "aggregate" &&
                $input.closest('.colNameSection').length) {
                check = true;
            }

            if (val === "" && !check) {
                isValidBlanks = false;
                invalidInputs.push($input);
                return false; // stop iteration
            }
        });

        return (isValidBlanks);
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
            var parsedVal = parseInt(value);
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
        }

        return ({value: value, isString: shouldBeString});
    }

    function parseType(typeId) {
        var types = [];
        var typeShift;
        var supportInteger = false;

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
            supportInteger = true;
        }

        // float
        // XXX not sure if float should also include integer
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push("float");

            // XXX we can not differenate float and integer,
            // so now just let type support to include integer
            // if it does't.
            if (!supportInteger) {
                types.push("integer");
            }
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

    function fillInputPlaceholder(inputNum) {
        var placeholderText = "";
        $operationsModal.find('.list').eq(inputNum).find('li').each(function() {
            if ($(this).css('opacity') > 0.2) {
                placeholderText = $(this).text();
                return (false);
            }
        });

        $operationsModal.find('.autocomplete').eq(inputNum)
                        .attr('placeholder', placeholderText);
    }

    function getBackColName(frontColName) {
        var columns = gTables[tableId].tableCols;
        var numCols = columns.length;
        var backColName = frontColName;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].getFronColName() === frontColName) {
                var name = columns[i].getBackColName();
                if (name != null) {
                    backColName = name;
                }
                break;
            }
        }

        return backColName;
    }

    function getAutoGenColName(name) {
        var takenNames = {};
        var tableCols  = gTables[tableId].tableCols;
        var numCols = tableCols.length;
        for (var i = 0; i < numCols; i++) {
            takenNames[tableCols[i].name] = 1;

            if (!tableCols[i].isDATACol()) {
                var backName = tableCols[i].getBackColName();
                if (backName != null) {
                    takenNames[backName] = 1;
                }
            }
        }

        // var limit = 20; // we won't try more than 20 times
        name = name.replace(/\s/g, '');
        var newName = name;
        var validNameFound = false;
        // if (newName in takenNames) {
            // for (var i = 1; i < limit; i++) {
            //     newName = name + i;
            //     if (!(newName in takenNames)) {
            //         validNameFound = true;
            //         break;
            //     }
            // }

        // XXX Now just rand a name since check in gTables cannot include
        // all cols of the table... May need better way in the future
        if (!validNameFound) {
            var tries = 0;
            newName = name + tableId.substring(2);
            while (takenNames.hasOwnProperty(name) && tries < 20) {
                newName = xcHelper.randName(name, 3);
                tries++;
            }
        }
        // }
        return (newName);
    }

    function listHighlightListener(event) {
        var $list = $operationsModal.find('.modalTopMain')
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
        // var textWidth = getTextWidth($input) + 20;
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
            if (str[i] === colPrefix) {
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
            if (str[i] === aggPrefix) {
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

    function closeModal(speed) {
        var time;
        if (gMinModeOn) {
            time = 0;
        } else {
            time = (speed && speed.slow) ? 300 : 150;
        }

        modalHelper.clear({"close": function() {
            // ops modal has its owne closer
            // highlighted column sticks out if we don't close it early
            $("#xcTable-" + tableId).find('.modalHighlighted')
                                    .removeClass('modalHighlighted');
            $operationsModal.fadeOut(time, function() {
                toggleModalDisplay(true, time);
                unminimizeTable();
                $operationsModal.find('.minimize').hide();
                modalHelper.removeWaitingBG();
            });
        }});

        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    }

    function resetForm() {
        $functionInput.attr('placeholder', "");
        clearInput(0);
        $autocompleteInputs.each(function() {
            $(this).data('value', '');
        });
        $functionsMenu.data('category', 'null');
        $operationsModal.find('.checkbox').removeClass('checked');
        $operationsModal.find('td.cast').find('.dropDownList')
                                                .addClass('hidden');
        hideCastColumn();
    }

    function getArgRowHtml() {
        var html =
        '<tr>' +
            '<td>' +
              '<div class="inputWrap">' +
                 '<div class="dropDownList">' +
                  '<input class="argument" type="text" tabindex="10" ' +
                    'spellcheck="false">' +
                  '<div class="argIconWrap">' +
                    '<span class="icon"></span>' +
                  '</div>' +
                  '<div class="list hint">' +
                    '<ul></ul>' +
                    '<div class="scrollArea top">' +
                     ' <div class="arrow"></div>' +
                   ' </div>' +
                    '<div class="scrollArea bottom">' +
                      '<div class="arrow"></div>' +
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</td>' +
            '<td class="cast new">' +
              '<div class="dropDownList">' +
                  '<input class="text nonEditable" value="default" disabled>' +
                  '<div class="iconWrapper dropdown">' +
                    '<span class="icon"></span>' +
                  '</div>' +
                  '<ul class="list">' +
                  '</ul>' +
               '</div>' +
            '</td>' +
            '<td class="descCell">' +
              '<div class="description"></div>' +
            '</td>' +
            '<td>' +
              '<div class="checkboxWrap">' +
                '<span class="checkbox" data-container="body" ' +
                    'data-toggle="tooltip" title="' + OpModalTStr.EmptyHint + '">' +
                '</span>' +
              '</div>' +
            '</td>' +
        '</tr>';
        return (html);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        OperationsModal.__testOnly__ = {};
        OperationsModal.__testOnly__.hasFuncFormat = hasFuncFormat;
        OperationsModal.__testOnly__.hasUnescapedParens = hasUnescapedParens;
        OperationsModal.__testOnly__.getExistingTypes = getExistingTypes;
        OperationsModal.__testOnly__.argumentFormatHelper = argumentFormatHelper;
        OperationsModal.__testOnly__.parseType = parseType;
    }
    /* End Of Unit Test Only */

    return (OperationsModal);
}(jQuery, {}));

