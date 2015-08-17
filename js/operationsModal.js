window.OperationsModal = (function($, OperationsModal) {
    var $operationsModal = $('#operationsModal');
    var $categoryInput = $('#categoryList').find('.autocomplete');
    var $categoryMenu = $('#categoryMenu');
    var $functionInput = $('#functionList').find('.autocomplete');
    var $functionsMenu = $('#functionsMenu');
    var $menus = $('#categoryMenu, #functionsMenu');
    var colNum = "";
    var colName = "";
    var operatorName = "";
    var operatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    var $lastInputFocused;
    
    var modalHelper = new xcHelper.Modal($operationsModal);
    var corrector;

    var tableId;

    OperationsModal.getOperatorsMap = function() {
        return (operatorsMap);
    };

    OperationsModal.setup = function() {
        var allowInputChange = true;

        var $autocompleteInputs = $operationsModal.find('.autocomplete');
        $autocompleteInputs.on({
            'click': function() {
                hideDropdowns();
                suggest($(this));
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

                if (inputNum === 0) {
                    // when $input is $categoryInput
                    updateFunctionsList();
                }
                if ($input.siblings('.list').find('li').length > 0) {
                    clearInput(inputNum, true);
                    return;
                }
                produceArgumentTable();
                if ($input.val() !== "") {
                    enterInput(inputNum);
                }
            },
            'keypress': function(event) {
                var $input = $(this);
                if (event.which === keyCode.Enter) {
                    var inputNum = $autocompleteInputs.index($input);
                    var value    = $input.val().trim();

                    if (value === "") {
                        clearInput(inputNum);
                        return;
                    }
                    $input.blur();
                    hideDropdowns();
                    // when choose the same category as before
                    if (inputNum === 1 &&
                        value === $functionsMenu.data('category'))
                    {
                        return;
                    }
                    enterInput(inputNum);
                } else {
                    closeListIfNeeded($input);
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
                $list.show()
                    .children().sort(sortHTML).prependTo($list).show();
            }
        });

        // only for category list and function menu list
        $operationsModal.find('.modalTopMain .list').on({
            'mousedown': function() {
                // do not allow input change
                allowInputChange = false;
            },
            'mouseup': function(event) {
                listMouseup(event, $(this));
            }
        }, 'li');

        // for all lists (including hint li in argument table)
        $operationsModal.find('.list').on({
            'mouseenter': function() {
                $operationsModal.find('li.highlighted')
                                .removeClass('highlighted');
                $(this).addClass('highlighted');
            },
            'mouseleave': function() {
                $(this).removeClass('highlighted');
            }
        }, 'li');

        // click on the hint list
        $operationsModal.on('click', '.hint li', function() {
            var $li = $(this);

            $li.removeClass("openli")
                .closest(".hint").removeClass("openList").hide()
                .siblings(".argument").val($li.text())
                .closest(".listSection").removeClass("open");
        });

        $lastInputFocused = $operationsModal.find('.argument:first');
        $operationsModal.on('focus', 'input', function() {
            $lastInputFocused = $(this);
        });

        var argumentTimer;
        var $argSection = $operationsModal.find('.argumentSection');
        $operationsModal.on({
            'keypress': function(event) {
                if (event.which === keyCode.Enter &&
                    !modalHelper.checkBtnFocus())
                {
                    if ($argSection.hasClass('minimized')) {
                        return;
                    }
                    $(this).blur();
                    submitForm();
                }
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
            },
            'input': function() {
                // Suggest column name
                var $input = $(this);
                if ($input.closest(".listSection").hasClass("colNameSection")) {
                    // for new column name, do not suggest anything
                    return;
                }

                clearTimeout(argumentTimer);
                argumentTimer = setTimeout(function() {
                    // here $(this) != $input
                    argSuggest($input);
                }, 300);
            }
        }, '.argument');

        // toggle between mininizeTable and unMinimizeTable
        $operationsModal.on('click', '.argIconWrap', function() {
            if ($argSection.hasClass('minimized')) {
                unminimizeTable();
            } else {
                // we want to target only headers that have editableheads
                var $input = $(this).siblings('input');
                minimizeTableAndFocusInput($input);
                $lastInputFocused = $input;
            }
        });

        $operationsModal.find('.confirm').on('click', submitForm);

        $operationsModal.find('.cancel, .close').on('click', function(e, data) {
            var time = (data && data.slow) ? 300 : 0;

            $operationsModal.fadeOut(time, function() {
                clearInput(0);
                modalHelper.clear();
                $functionsMenu.data('category', 'null');
                unminimizeTable();
            });

            var isHide = true;
            toggleModalDisplay(isHide, time);
            
            $(document).mousedown(); // hides any error boxes;
        });

        $operationsModal.on('click', function() {
            var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
            if ($mousedownTarget.closest('.listSection').length === 0) {
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

        $operationsModal.draggable({
            handle     : '.operationsModalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });

        XcalarListXdfs("*", "*")
        .done(function(listXdfsObj) {
            setupOperatorsMap(listXdfsObj.fnDescs);
        });

        function listMouseup(event, $li) {
            allowInputChange = true;
            event.stopPropagation();
            var value = $li.text();
            var $input = $li.parent().siblings('.autocomplete');

            hideDropdowns();
            $input.val(value);

            if (value === $functionsMenu.data('category')) {
                return;
            }

            var inputNum = $autocompleteInputs.index($input);
            enterInput(inputNum);
        }
    };

    OperationsModal.show = function(newTableId, newColNum, operator) {
        XcalarListXdfs("*", "User*")
        .done(function(listXdfsObj) {
            udfUpdateOperatorsMap(listXdfsObj.fnDescs);

            tableId = newTableId;
            var tableCols = xcHelper.getTableFromId(tableId).tableCols;
            var currentCol = tableCols[newColNum - 1];
            // groupby and aggregates stick to num 6,
            // filter and map use 0-5;
            colNum = newColNum;
            colName = currentCol.name;
            operatorName = operator.toLowerCase().trim();

            $operationsModal.find('.operationsModalHeader .text').text(operator);

            var colNames = [];
            tableCols.forEach(function(col) {
                // skip data column
                if (col.name !== "DATA") {
                    // Add $ since this is the current format of column
                    colNames.push('$' + col.name);
                }
            });

            corrector = new xcHelper.Corrector(colNames);

            // get modal's origin classes
            var classes = $operationsModal.attr('class').split(' ');
            for (var i = 0; i < classes.length; i++) {
                if (classes[i].startsWith('numArgs')){
                    classes.splice(i, 1);
                    i--;
                }
            }

            $operationsModal.attr('class', classes.join(' '));

            populateInitialCategoryField(operatorName);

            if (operatorName === 'aggregate') {
                $operationsModal.addClass('numArgs0');
            } else if (operatorName === 'map') {
                $operationsModal.addClass('numArgs4');
            } else if (operatorName === 'group by') {
                $operationsModal.addClass('numArgs4');
            }

            centerPositionElement($operationsModal);
            modalHelper.setup();

            toggleModalDisplay(false);

            $categoryInput.focus();
            if ($categoryMenu.find('li').length === 1) {
                var val = $categoryMenu.find('li').text();
                $categoryInput.val(val).change();
                enterInput(0);
                $operationsModal.find('.circle1').addClass('filled');
                $functionInput.focus();
            }
        });
    };

    function toggleModalDisplay(isHide, time) {
        xcHelper.toggleModal(tableId, isHide, {
            "fadeOutTime": time
        });

        var $table = $("#xcTable-" + tableId);

        if (isHide) {
            $functionInput.attr('placeholder', "");

            $table.find('.header').off('click', fillInputFromColumn)
                    .end()
                    .find('.modalHighlighted').removeClass('modalHighlighted');

            $('body').off('keydown', listHighlightListener);
        } else {
            $operationsModal.fadeIn(300);
            $table.find('.header').click(fillInputFromColumn)
                    .end()
                    .find('.col' + colNum).addClass('modalHighlighted');

            $('body').on('keydown', listHighlightListener);
            fillInputPlaceholder(0);
        }
    }

    function minimizeTableAndFocusInput($input) {
        // is there a better way????
        $operationsModal.find('div, p, b, thead').addClass('minimized');
        $operationsModal.find('.modalHeader, .close, .tableContainer,' +
                              '.tableWrapper')
                        .removeClass('minimized');
        $input.closest('tbody').find('div').removeClass('minimized');
        $input.focus();
        $('body').on('keyup', opModalKeyListener);
        centerPositionElement($operationsModal);
    }

    function unminimizeTable() {
        $operationsModal.find('.minimized').removeClass('minimized');
        $('body').off('keyup', opModalKeyListener);
        centerPositionElement($operationsModal);
    }

    function opModalKeyListener(event) {
        if (event.which === keyCode.Enter ||
            event.which === keyCode.Escape) {
            setTimeout(function() {
                unminimizeTable();
            }, 0);
        }
    }

    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument

    var firstArgExceptions = {
        'conditional functions': ['not']
    };

    function fillInputFromColumn(event) {
        var $input = $lastInputFocused;
        if (!$lastInputFocused.hasClass('argument') ||
            $lastInputFocused.closest('.colNameSection').length !== 0) {
            return;
        }
        var $target = $(event.target).closest('.header');
        $target = $target.find('.editableHead');
        var newColName = $target.val();
        insertText($input, newColName);
        gMouseEvents.setMouseDownTarget($input);
        $lastInputFocused.focus();
    }

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

        $categoryMenu.html(html);
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
        var curVal    = $input.val();
        var corrected = corrector.suggest(curVal);
        var $ul       = $input.siblings(".list");

        // should not suggest if the input val is already a column name
        if (corrected && corrected !== curVal) {
            $ul.empty()
                .append('<li class="openli">' + corrected + '</li>')
                .addClass("openList")
                .show();
            $input.closest('.listSection').addClass('open');
        } else {
            $ul.empty().removeClass("openList").hide()
                .closest(".listSection").removeClass("open");
        }
    }

    function suggest($input) {
        var value = $input.val().trim().toLowerCase();
        var $list = $input.siblings('.list');

        $operationsModal.find('li.highlighted').removeClass('highlighted');

        $list.show()
             .find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return (value === "" ||
                    $(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();

        $visibleLis.sort(sortHTML).prependTo($list);

        if (value === "") {
            return;
        }

        // put the li that starts with value at first,
        // in asec order
        for (var i = $visibleLis.length; i >= 0; i--) {
            var $li = $visibleLis.eq(i);
            if ($li.text().startsWith(value)) {
                $list.prepend($li);
            }
        }
    }

    function hideDropdowns() {
        $operationsModal.find('.list, .list li').hide();
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

        if (inputNum === 1) {
            produceArgumentTable();
        }

        if (!noFocus) {
            var $input = $operationsModal.find('input').eq(inputNum + 1);
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

        $operationsModal.find('.innerLink:eq(' + (inputNum) + ')')
                        .removeClass('filled');
        $operationsModal.find('.innerLink:gt(' + (inputNum) + ')')
                        .removeClass('filled');
    }

    function closeListIfNeeded($input) {
        var parentId = $input.closest('.listSection').attr('id');
        var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
        if ($mousedownTarget.closest('#' + parentId).length === 0) {
            hideDropdowns();
        }
    }

    function listHighlight($input, keyCodeNum) {
        var direction;
        if (keyCodeNum === keyCode.Up) {
            direction = -1;
        } else if (keyCodeNum === keyCode.Down) {
            direction = 1;
        } else {
            // key code not supported
            return;
        }
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

        // setting cursor to the end doesn't work unless we use timeout
        setTimeout(function() {
            $input[0].selectionStart = $input[0].selectionEnd = val.length;
        }, 0);
    }

    function isOperationValid(inputNum) {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());

        if (inputNum === 0) {

            return (categoryNames.indexOf(category) > -1 );
        } else if (inputNum === 1) {
            var categoryIndex = categoryNames.indexOf(category);
            if (categoryIndex > -1) {
                var matches = $functionsMenu.find('li').filter(function() {
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
        var text = 'This operation is not supported';
        var $target = $operationsModal.find('input').eq(inputNum);
        if ($.trim($target.val()) === "") {
            text = 'Please fill out this field';
        }
        var isFormMode = false;
        var offset = -5;
        StatusBox.show(text, $target, isFormMode, offset);
    }

    function updateFunctionsList() {
        var category = $categoryInput.val().trim().toLowerCase();
        var index = categoryNames.indexOf(category);

        $functionsMenu.empty();
        clearInput(1);
        // invalid category
        if (index < 0) {
            return;
        }

        var $categoryLi = $categoryMenu.find('li').filter(function() {
            return ($(this).text().toLowerCase() === category);
        });
        var categoryNum = $categoryLi.data('category');
        var ops = functionsMap[categoryNum];

        var html = "";
        for (var i = 0, numOps = ops.length; i < numOps; i++) {
            html += '<li>' + ops[i].fnName + '</li>';
        }
        var $list = $(html);

        $list.sort(sortHTML).prependTo($functionsMenu);
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

        var $categoryLi = $categoryMenu.find('li').filter(function() {
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
            var colPrefix = "$";
            var defaultValue = colPrefix + colName;

            if (firstArgExceptions[category] &&
                firstArgExceptions[category].indexOf(func) !== -1)
            {
                defaultValue = "";
            }

            var numArgs = operObj.numArgs;
            if (numArgs < 0) {
                numArgs = 1; // Refer to operObj.numArgs for min number
            }
            var $tbody = $operationsModal.find('.argumentTable tbody');

            // as rows order may change, update it here
            var $rows = $tbody.find('tr');
            $rows.find('.colNameSection').removeClass('colNameSection')
                    .end()
                    .find('input').data('typeid', -1)
                    .end()
                    .find('.checkboxSection').removeClass('checkboxSection')
                        .find('input').attr('type', 'text')
                        .removeAttr('id')
                        .end()
                        .find('.checkBoxText').remove();

            var description;
            var autoGenColName;
            var typeId;

            for (var i = 0; i < numArgs; i++) {
                if (operObj.argDescs[i]) {
                    description = operObj.argDescs[i].argDesc;
                    typeId = operObj.argDescs[i].typesAccepted;
                } else {
                    description = "";
                    var keyLen = Object.keys(DfFieldTypeT).length;
                    typeId = Math.pow(2, keyLen + 1) - 1;
                }

                var $input = $rows.eq(i).find('input');
                if (i === 0) {
                    $input.val(defaultValue);
                } else {
                    $input.val("");
                }
                $input.data("typeid", typeId);
                $rows.eq(i).find('.description').text(description);
            }

            if (operatorName === 'map') {
                description = 'New Resultant Column Name';
                autoGenColName = getAutoGenColName('mappedCol');

                $rows.eq(numArgs).find('.listSection').addClass('colNameSection')
                                .end()
                                .find('input').val(autoGenColName)
                                .end()
                                .find('.description').text(description);
                ++numArgs;
            } else if (operatorName === 'group by') {
                // group by sort col field
                description = 'Field name to group by';
                var sortedCol = xcHelper.getTableFromId(tableId).keyName;
                if (sortedCol === "recordNum") {
                    sortedCol = "";
                } else {
                    sortedCol = colPrefix + sortedCol;
                }

                $rows.eq(numArgs).find('input').val(sortedCol)
                                .end()
                                .find('.description').text(description);
                ++numArgs;

                // new col name field
                description = 'New Column Name for the groupBy' +
                                ' resultant column';
                autoGenColName = getAutoGenColName('groupBy');

                $rows.eq(numArgs).find('.listSection')
                                    .addClass('colNameSection')
                                .end()
                                .find('input').val(autoGenColName)
                                .end()
                                .find('.description').text(description);
                ++numArgs;
                // check box for include sample
                description = 'If include other fields(result is sampled) or not';
                description = 'If checked, a sample of all fields will be included';
                var checkboxText =
                    '<label class="checkBoxText" for="incSample">' +
                    'Include Sample</span>';

                $rows.eq(numArgs)
                        .find('.listSection').addClass('checkboxSection')
                        .end()
                        .find('input').val("").attr("type", "checkbox")
                                                .attr("checked", false)
                                                .attr("id", "incSample")
                            .after(checkboxText)
                        .end()
                        .find('.description').text(description);
                ++numArgs;
            }   

            $rows.show().filter(":gt(" + (numArgs - 1) + ")").hide();

            $operationsModal.find('.descriptionText').text(operObj.fnDesc);
        }
    }

    function checkArgumentParams(blankOK) {
        var allInputsFilled = true;
        var inputIndex = 2;
        var $argInputs =
            $operationsModal.find('.argumentSection input').filter(function() {
                return ($(this).closest('tr').css('display') !== 'none');
            });
        $argInputs.each(function(index) {
            var $input = $(this);

            if ($input.closest('.listSection').hasClass('checkboxSection')) {
                return (true);
            }

            var val = $(this).val().trim();
            if (val === "") {
                allInputsFilled = false;
                if (!blankOK) {
                    showErrorMessage(inputIndex + index);
                }
                return (false);
            }
        });

        if (allInputsFilled) {
            var noFocus = true;
            enterInput(2, noFocus);
            return (true);
        } else {
            clearInput(2);
            return (false);
        }
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

        var args = [];
        var colType;
        var typeid;

        // constant
        var colPrefix = "$";

        var $argInputs =
            $operationsModal.find('.argumentTable tbody tr').filter(function() {
                return ($(this).css('display') !== "none");
            }).find('.argument');

        // XXX this part may still have potential bugs
        $argInputs.each(function() {
            var $input = $(this);
            var arg = $input.val().trim();

            typeid = $input.data('typeid');
            // col name field, do not add quote
            if ($input.closest(".listSection").hasClass("colNameSection")) {
                arg = arg.replace(/\$/g, '');
            } else if (arg.indexOf(colPrefix) >= 0) {
                // if it contains a column name
                // note that field like pythonExc can have more than one $col
                arg = arg.replace(/\$/g, '');

                // Since there is currently no way for users to specify what
                // col types they are expecting in the python functions, we will
                // skip this type check if the function category is user defined
                // function.
                if ($("#categoryList input").val().indexOf("user") !== 0) {
                    colType = getColumnTypeFromArg(arg);

                    if (colType != null) {
                        var types = parseType(typeid);

                        if (types.indexOf(colType) < 0) {
                            isPassing = false;
                            var text = "Invalid type for the field, wanted: " +
                                    types.join("/") + ", but gives: " + colType;
                            StatusBox.show(text, $input);
                            return (false);
                        }
                    } else {
                        console.error("colType is null/col not pulled!");
                    }
                }
            } else {
                arg = formatArgumentInput(arg, typeid);
            }

            args.push(arg);
        });

        if (!isPassing) {
            modalHelper.enableSubmit();
            return;
        }

        var func = $functionInput.val().trim();
        var funcLower = func.substring(0, 1).toLowerCase() + func.substring(1);
        var funcCapitalized = func.substr(0, 1).toUpperCase() + func.substr(1);

        switch (operatorName) {
            case ('aggregate'):
                isPassing = aggregate(funcCapitalized, args);
                break;
            case ('filter'):
                isPassing = filter(func, args);
                break;
            case ('group by'):
                isPassing = groupBy(funcCapitalized, args);
                break;
            case ('map'):
                isPassing = map(funcLower, args);
                break;
            default:
                showErrorMessage(0);
                isPassing = false;
                break;
        }

        if (isPassing) {
            $operationsModal.find('.close').trigger('click', {slow: true});
        } else {
            // show some kinda error message
            modalHelper.enableSubmit();
        }
    }

    function aggregate(aggrOp, args) {
        var colIndex = -1;
        var columns = xcHelper.getTableFromId(tableId).tableCols;
        var frontColName = args[0];

        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            if (columns[i].name === frontColName && columns[i].func.args) {
                colIndex = i;
                break;
            }
        }

        if (colIndex === -1) {
            return (false);
        }

        xcFunction.aggregate(colIndex, tableId, aggrOp);
        return (true);
    }

    function filter(operator, args) {
        var options = {};
        var colIndex = colNum;
        if (operator !== 'not') {
            var frontName = args[0];
            var backName = frontName;
            var columns = xcHelper.getTableFromId(tableId).tableCols;
            var numCols = columns.length;
            for (var i = 0; i < numCols; i++) {
                if (columns[i].name === frontName) {
                    if (columns[i].func.args) {
                        backName = columns[i].func.args[0];
                        colIndex = i;
                    }
                }
            }
            args[0] = backName;
        }

        var filterString = formulateFilterString(operator, args);
        options = {"filterString": filterString};

        xcFunction.filter(colIndex, tableId, options);

        return (true);
    }

    function groupBy(operator, args) {
        // Current groupBy has 4 arguments:
        // 1. grouby col
        // 2. indexed col
        // 3. is include sample
        // 4. new col name

        // var errorText  = 'Invalid column name';
        // var isFormMode = false;

        // var columns = xcHelper.getTableFromId(tableId).tableCols;
        // var numCols = columns.length;
        // var i;

        var $argInputs = $operationsModal.find('.argument');
        var groupbyColName = args[0];
        var indexedColName = args[1];
        // check new col name
        var newColName  = args[2];
        var isDuplicate = ColManager.checkColDup($argInputs.eq(2), null,
                                                 tableId);
        if (isDuplicate) {
            return (false);
        }

        var isIncSample = $argInputs.eq(3).is(':checked');

        xcFunction.groupBy(operator, tableId, indexedColName, groupbyColName,
                            isIncSample, newColName);
        return (true);
    }

    function map(operator, args) {
        var numArgs = args.length;
        var $nameInput = $operationsModal.find('.argument')
                                           .eq(numArgs - 1);
        var newColName = args.splice(numArgs - 1, 1)[0];

        var parseCol    = true;
        var isDuplicate = ColManager.checkColDup($nameInput, null,
                                                tableId, parseCol);
        if (isDuplicate) {
            return (false);
        }

        var firstValue = args[0];

        var columns = xcHelper.getTableFromId(tableId).tableCols;
        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            if (columns[i].name === firstValue && columns[i].func.args) {
                firstValue = columns[i].func.args[0];
                break;
            }
        }
        args[0] = firstValue;
        var mapStr = "";

        mapStr = formulateMapString(operator, args);

        xcFunction.map(colNum, tableId, newColName, mapStr);

        return (true);
    }

    function getColumnTypeFromArg(value) {
        // if value = "col1, col2", it only check col1
        value = value.split(/[,) ]/)[0];

        var colType;
        var columns = xcHelper.getTableFromId(tableId).tableCols;
        for (var i = 0, numCols = columns.length; i < numCols; i++) {
            if (columns[i].name === value) {
                colType = columns[i].type;
                break;
            }
        }

        return (colType);
    }

    function formatArgumentInput(value, typeid) {
        var strShift    = 1 << DfFieldTypeT.DfString;
        var numberShift =
                        (1 << DfFieldTypeT.DfInt32) |
                        (1 << DfFieldTypeT.DfUInt32) |
                        (1 << DfFieldTypeT.DfInt64) |
                        (1 << DfFieldTypeT.DfUInt64) |
                        (1 << DfFieldTypeT.DfFloat32) |
                        (1 << DfFieldTypeT.DfFloat64);

        if ((typeid & numberShift) > 0 && !isNaN(parseInt(value))) {
            // if the field support number and value is a number
            return (value);
        }

        // add quote if the field support string
        if ((typeid & strShift) > 0) {
            value = JSON.stringify(value);
        }
        return (value);
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

        // decimal
        // XXX not sure if decimal should also include integer
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push("decimal");
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

    function formulateMapString(operator, args) {
        var mapString = operator + "(";
        for (var i = 0; i < args.length; i++) {
            mapString += args[i] + ", ";
        }
        mapString = mapString.slice(0, -2);
        mapString += ")";
        return (mapString);
    }

    function formulateFilterString(operator, args) {
        var filterString = operator + "(";
        for (var i = 0; i < args.length; i++) {
            filterString += args[i] + ", ";
        }
        filterString = filterString.slice(0, -2);
        filterString += ")";
        return (filterString);
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

    function getAutoGenColName(name) {
        var takenNames = {};
        var tableCols  = xcHelper.getTableFromId(tableId).tableCols;
        var numCols = tableCols.length;
        for (var i = 0; i < numCols; i++) {
            takenNames[tableCols[i].name] = 1;
            if (tableCols[i].func.args) {
                var backName = tableCols[i].func.args[0];
                takenNames[backName] = 1;
            }  
        }

        var validNameFound = false;
        // var limit = 20; // we won't try more than 20 times
        var newName = name;
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
            newName = xcHelper.randName(name, 5);
            while (newName in takenNames && tries < 20) {
                newName = xcHelper.randName(name, 5);
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
            if (event.which === keyCode.Down) {
                listHighlight($input, keyCode.Down);
            } else if (event.which === keyCode.Up) {
                listHighlight($input, keyCode.Up);
            }
        }
    }

    function insertText($input, textToInsert) {
        var value  = $input.val();
        var valLen = value.length;
        var newVal;
       
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        var strLeft;

        textToInsert = "$" + textToInsert;

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            newVal = ", " + textToInsert;
            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            newVal = textToInsert + ", ";
            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal)) {
            $input.val($input.val() + newVal);
        }
        $input[0].setSelectionRange(currentPos, currentPos);
    }

    return (OperationsModal);
}(jQuery, {}));
