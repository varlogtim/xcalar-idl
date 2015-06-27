window.OperationsModal = (function($, OperationsModal) {
    var $operationsModal = $('#operationsModal');
    var $categoryInput = $('#categoryList').find('.autocomplete');
    var $categoryMenu = $('#categoryMenu');
    var $functionInput = $('#functionList').find('.autocomplete');
    var $functionsMenu = $('#functionsMenu');
    var colNum = "";
    var tableNum = "";
    var colName = "";
    var operatorName = "";
    var operatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    var $lastInputFocused;
    
    var modalHelper = new xcHelper.Modal($operationsModal);
    var corrector;

    OperationsModal.setup = function() {
        var allowInputChange = true;
        var $autocompleteInputs = $operationsModal.find('.autocomplete');

        $autocompleteInputs.on('input', function() {
            suggest($(this));
        });

        $autocompleteInputs.on('change', function() {
            if (!allowInputChange) {
                return;
            }
            var inputNum = $autocompleteInputs.index($(this));
            if (inputNum === 0) {
                updateFunctionsList();
            }
            if ($(this).siblings('.list').find('li').length > 0) {
                clearInput(inputNum, true);
                return;
            }
            produceArgumentTable();
            if ($(this).val() !== "") {
                enterInput(inputNum);
            }
        });

        $autocompleteInputs.on('click', function() {
            $operationsModal.find('.list, .list li').hide();
            suggest($(this));
            $operationsModal.find('li.highlighted').removeClass('highlighted');
        });

        $autocompleteInputs.on('keypress', function(event) {
            if (event.which === keyCode.Enter) {
                var index = $autocompleteInputs.index($(this));
                if ($(this).val() === "") {
                    clearInput(index);
                    return;
                }
                $(this).blur();
                $operationsModal.find('.list, .list li').hide();
                if ($(this).val() === $functionsMenu.data('category')) {
                    return;
                }
                enterInput(index);
            } else {
                closeListIfNeeded($(this));
            }
        });

        $autocompleteInputs.on('keydown', function(event) {
            if (event.which === keyCode.Down) {
                listHighlight($(this), keyCode.Down);
            } else if (event.which === keyCode.Up) {
                listHighlight($(this), keyCode.Up);
            }
        });

        $operationsModal.find('.list').on('mousedown', 'li', function() {
            allowInputChange = false;
        });

        $operationsModal.find('.modalTopMain .list')
                        .on('mouseup', 'li', function(event) {
            allowInputChange = true;
            event.stopPropagation();
            var $el = $(this);
            var value = $el.text();
            var $input = $el.parent().siblings('.autocomplete');
            $el.parent().hide().children().hide();
            $input.val(value);

            if (value === $functionsMenu.data('category')) {
                return;
            }
            
            var index = $operationsModal.find('.list').index($el.parent());
            enterInput(index);
        });

        $operationsModal.find('.list').on('mouseenter', 'li', function() {
            $operationsModal.find('.list li').removeClass('highlighted');
            $(this).addClass('highlighted');
        });

        $operationsModal.find('.list').on('mouseleave', 'li', function() {
            $operationsModal.find('.list li').removeClass('highlighted');
            $(this).removeClass('highlighted');
        });

        $operationsModal.find('.modalTopMain .dropdown').on('click', function() {

            $operationsModal.find('.list').hide();
            var $list = $(this).siblings('.list');
            $list.show();
            $list.children().sort(sortHTML).prependTo($list);
            $list.children().show();
        });

        $operationsModal.on('keypress', '.argument', function(event) {
            if (event.which === keyCode.Enter && !modalHelper.checkBtnFocus()) {
                if ($operationsModal.find('.argumentSection')
                                    .hasClass('minimized')) {
                    return;
                }
                $(this).blur();
                submitForm();
            }
        });

        $operationsModal.on('focus', 'input', function() {
            $lastInputFocused = $(this);
        });

        $operationsModal.on('blur', '.argument', function() {
            setTimeout(function() {
                var $mouseTarget = gMouseEvents.getLastMouseDownTarget();
                if ($operationsModal.find('.argumentSection')
                                    .hasClass('minimized') ) {
                    if ($mouseTarget.closest('.editableHead').length === 0) {
                        $lastInputFocused.focus();
                    }
                    return;
                }
            }, 0);
        });

        $operationsModal.on('click', '.argIconWrap', function() {
            
            if ($operationsModal.find('.argumentSection')
                                .hasClass('minimized')) {
                unminimizeTable();
            } else {
                // we want to target only headers that have editableheads
                var $input = $(this).siblings('input');
                minimizeTableAndFocusInput($input);
                $lastInputFocused = $input;
            }
            
        });

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

        var argumentTimer;
        $operationsModal.on('input', '.argument', function() {
            var $input = $(this);
            clearTimeout(argumentTimer);
            argumentTimer = setTimeout(function() {
                argSuggest($input);
            }, 300);
        });

        $operationsModal.on('click', '.hint li', function() {
            var $li = $(this);

            $li.removeClass("openli")
                .closest(".hint").removeClass("openList").hide()
                .siblings(".argument").val($li.text())
                .closest(".listSection").removeClass("open");
        });

        $operationsModal.find('.cancel, .close').on('click', function(e, data) {
            var time;
            if (data && data.slow) {
                time = 300;
            } else {
                time = 0;
            }
            $operationsModal.fadeOut(time, function() {
                clearInput(0);
                modalHelper.clear();
                $functionsMenu.data('category', 'null');
                unminimizeTable();
            });

            $('#opModalBackground').fadeOut(time, function() {
                $(this).removeClass('light');
                $('#mainFrame').removeClass('opModalOpen');
            });
            $('#sideBarModal').fadeOut(time, function() {
                $(this).removeClass('light');
                $('#rightSideBar').removeClass('opModalOpen');
            });

            $('.xcTableWrap').not('#xcTableWrap' + tableNum)
                             .removeClass('modalDarkened');

            $('#xcTableWrap' + tableNum).removeClass('opModalOpen');
            $('.modalHighlighted').removeClass('modalHighlighted');

            $functionInput.attr('placeholder', "");
            $('#xcTableWrap' + tableNum).find('.editableHead')
                                        .attr('disabled', false);
            $('#xcTable' + tableNum).find('.colGrab')
                                    .off('mouseup', disableTableEditing);

            $('#xcTable' + tableNum).find('.header')
                                    .off('click', fillInputFromColumn);
            
            $(document).mousedown(); // hides any error boxes;   
        });

        $operationsModal.on('click', function() {
            var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
            if ($mousedownTarget.closest('.listSection').length === 0) {
                $operationsModal.find('.list, .list li').hide();
            }
            allowInputChange = true;
        });

        $operationsModal.find('.confirm').on('click', submitForm);

        $operationsModal.draggable({
            handle     : '.operationsModalHeader',
            containment: 'window',
            cursor     : '-webkit-grabbing'
        });
        
        // Populate the XDFs list on setup so that we don't have to keep calling
        // the listXdfs call. However we must keep calling listUdfs because user
        // defined functions are populated on run. However, Xdfs will not be
        // added dynamically.
        XcalarListXdfs("*", "*")
        .done(function(listXdfsObj) {
            setupOperatorsMap(listXdfsObj.fnDescs);
        });
    };

    OperationsModal.show = function(newTableNum, newColNum, operator) {
        // groupby and aggregates stick to num 6,
        // filter and map use 0-5;
        tableNum = newTableNum;
        colNum = newColNum;
        colName = gTables[tableNum].tableCols[colNum - 1].name;
        
        $('#xcTable' + tableNum).find('.editableHead').attr('disabled', true);
        $('#xcTable' + tableNum).find('.colGrab').mouseup(disableTableEditing);

        $operationsModal.find('.operationsModalHeader .text').text(operator);
        operatorName = $.trim(operator.toLowerCase());

        var colNames = [];
        gTables[tableNum].tableCols.forEach(function(colObj) {
            // skip data column
            if (colObj.name !== "DATA") {
                colNames.push(colObj.name);
            }
        });

        corrector = new xcHelper.Corrector(colNames);

        var columnType = gTables[tableNum].tableCols[colNum - 1].type;
        var colClasses = [columnType];
        $operationsModal.data('coltype', columnType);
        
        if ($('#xcTable' + tableNum).find('th.col' + colNum)
                                    .hasClass('indexedColumn')) {
            colClasses.push('indexed');
        }

        var classes = $operationsModal.attr('class').split(' ');
        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('type') === 0) {
                classes.splice(i, 1);
                i--;
            }else if (classes[i].indexOf('numArgs') === 0){
                classes.splice(i, 1);
                i--;
            }
        }
        $operationsModal.attr('class', classes.join(' '));
        for (var i = 0; i < colClasses.length; i++) {
            $operationsModal.addClass('type-' + colClasses[i]);
        }
        if (gTables[tableNum].tableCols[colNum - 1].isNewCol) {
            $operationsModal.addClass('type-newColumn');
        }
        populateInitialCategoryField(operatorName);

        if (operatorName === 'aggregate') {
            $operationsModal.addClass('numArgs0');
        } else if (operatorName === 'map') {
            $operationsModal.addClass('numArgs4');
        }

        centerPositionElement($operationsModal);
        modalHelper.setup();

        highlightOperationColumn();
        $('#xcTableWrap' + tableNum).addClass('opModalOpen');
        $('.xcTableWrap').not('#xcTableWrap' + tableNum)
                         .addClass('modalDarkened');

        $('#rightSideBar').addClass('opModalOpen');
        $('#mainFrame').addClass('opModalOpen');
        $('#sideBarModal').addClass('light').fadeIn(150);
        $('#opModalBackground').addClass('light').fadeIn(150, function() {
            $operationsModal.fadeIn(300);
        });

        $('#xcTable' + tableNum).find('.editableHead')
                                        .closest('.header')
                                        .click(fillInputFromColumn);

        fillInputPlaceholder(0);

        $categoryInput.focus();
        if ($categoryMenu.find('li').length === 1) {
            var val = $categoryMenu.find('li').text();
            $categoryInput.val(val).change();
            enterInput(0);
            $operationsModal.find('.circle1').addClass('filled');
            $functionInput.focus();
        }
    };

    // empty array means the first argument will always be the column name
    // any function names in the array will not have column name as 1st argument

    var firstArgExceptions = {
        'conditional functions'  : ['not'],
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
        for (var i = 0; i < arrayLen; i++) {
            if (!operatorsMap[opArray[i].category]) {
                operatorsMap[opArray[i].category] = [];
            }
            operatorsMap[opArray[i].category].push(opArray[i]);
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
        var value = $.trim($input.val()).toLowerCase();
        var $list = $input.siblings('.list');
        $list.show();
        $list.find('li').hide();

        var $visibleLis = $list.find('li').filter(function() {
            return ($(this).text().toLowerCase().indexOf(value) !== -1);
        }).show();


        $visibleLis.sort(sortHTML).prependTo($list);
        $operationsModal.find('li.highlighted').removeClass('highlighted');

        if (value === "") {
            return;
        }

        var strongMatchArray = [];
        var numVisibleLis = $visibleLis.length;
        for (var i = 0; i < numVisibleLis; i++) {
            var $li = $visibleLis.eq(i);
            var liText = $li.text();
            if (liText.indexOf(value) === 0) {
                strongMatchArray.push($li);
            }
        }
        for (var i = 0; i < strongMatchArray.length; i++) {
            $list.prepend(strongMatchArray[i]);
        }
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

        $operationsModal.find('.list, .list li').hide();

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
            $operationsModal.find('.list, .list li').hide();
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
        if ($lis.length === 0) {
            return;
        }
        
        var $highlightedLi = $lis.filter(function() {
                                return ($(this).hasClass('highlighted'));
                            });

        var index;
        if ($highlightedLi.length !== 0) {
            var indexArray = [];
            $lis.each(function() {
                indexArray.push($(this).index());
            });
            var highlightIndex = $highlightedLi.index();
            index = indexArray.indexOf(highlightIndex);
            $highlightedLi.removeClass('highlighted');
            var newIndex = index + direction;
            if (newIndex === numLis) {
                $highlightedLi = $lis.eq(0);
            } else if (newIndex < 0) {
                $highlightedLi = $lis.eq(numLis - 1);
            } else {
                $highlightedLi = $lis.eq(newIndex);
            }
        } else {
            if (direction === -1) {
                index = numLis - 1;
            } else {
                index = 0;
            }
            $highlightedLi = $lis.eq(index);
        }
        $highlightedLi.addClass('highlighted');
        var val = $highlightedLi.text();
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
        
        var category = $.trim($categoryInput.val()).toLowerCase();
        var index = categoryNames.indexOf(category);
        
        $functionsMenu.empty();
        clearInput(1);
        if (index < 0) {
            return;
        }

        var $categoryLi = $categoryMenu.find('li').filter(function() {
            return ($(this).text() === categoryNames[index]);
        });
        var categoryNum = $categoryLi.data('category');
        var ops = functionsMap[categoryNum];
        var numOps = ops.length;
        var html = "";
        for (var i = 0; i < numOps; i++) {
            html += '<li>' + ops[i].fnName + '</li>';
        }
        var $list = $(html);

        $list.sort(sortHTML).prependTo($functionsMenu);
        $functionsMenu.data('category', category);
        fillInputPlaceholder(1);
    }

    function produceArgumentTable() {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());

        var categoryIndex = categoryNames.indexOf(category);
        if (categoryIndex < 0) {
            return;
        }

        var $categoryLi = $categoryMenu.find('li').filter(function() {
            return ($(this).text() === categoryNames[categoryIndex]);
        });
        var categoryNum = $categoryLi.data('category');
        var ops = functionsMap[categoryNum];
        var numOps = ops.length;
        var opIndex = -1;
        var operObj;
        for (var i = 0; i < numOps; i++) {
            if (func === ops[i].fnName.toLowerCase()) {
                opIndex = i;
                operObj = ops[i];
            }
        }

        if (opIndex > -1) {
            var defaultValue = "$" + colName;

            if (firstArgExceptions[category]) {
                if (firstArgExceptions[category].indexOf(func) !== -1) {
                    defaultValue = "";
                }
            }

            var numArgs = operObj.numArgs;
            var $tbody = $operationsModal.find('.argumentTable tbody');

            // as rows order may change, update it here
            var $rows = $tbody.find('tr');
            $rows.show();
            $rows.find('.colNameSection').removeClass('colNameSection');
            var description;
            for (var i = 0; i < operObj.numArgs; i++) {
                description = operObj.argDescs[i].argDesc;
                if (i === 0) {
                    $rows.eq(i).find('input').val(defaultValue);
                } else {
                    $rows.eq(i).find('input').val("");
                }
                $rows.eq(i).find('.description').text(description);
            }
            if (operatorName === 'map') {
                description = 'New Resultant Column Name';
                $rows.eq(numArgs).find('.listSection')
                                 .addClass('colNameSection');
                var autoGenColName = getAutoGenColName('mappedCol');
                $rows.eq(numArgs).find('input').val(autoGenColName);
                $rows.eq(numArgs).find('.description').text(description);
                numArgs++;
            } else if (operatorName === 'group by') {
                description = 'New Column Name for the groupBy' +
                                ' resultant column';
                $rows.eq(numArgs).find('.listSection')
                                 .addClass('colNameSection');
                var autoColGenName = getAutoGenColName('groupBy');
                $rows.eq(numArgs).find('input').val(autoGenColName);
                $rows.eq(numArgs).find('.description').text(description);
                numArgs++;
            }   

            $rows.filter(":gt(" + (numArgs - 1) + ")").hide();

            $operationsModal.find('.descriptionText').text(operObj.fnDesc);
        } else {
            // $operationsModal.find('.descriptionText').text(operObj.fnDesc);
        }
    }

    function checkArgumentParams(blankOK) {
        var allInputsFilled = true;
        var inputIndex = 2;
        var $argInputs = $operationsModal.find('.argumentSection input')
                                        .filter(function() {
                        return ($(this).closest('tr').css('display') !== 'none');
                    });
        $argInputs.each(function(index) {
            var val = $.trim($(this).val());
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
        // XXX This is a time bomb! We have to fix this
        modalHelper.submit();
        var func =  $.trim($functionInput.val());
        var funcLower = func.substring(0, 1).toLowerCase() + func.substring(1);
        var isPassing = false;
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
        var colType = $operationsModal.data('coltype');
        var args = [];

        var $argInputs = $operationsModal.find('.argumentTable tbody tr')
                                        .filter(function() {
                                return ($(this).css('display') != "none");

                        }).find('.argument');

        var numArgs = $argInputs.length;
        $argInputs.each(function(index) {
            // if map or groupby, last argument will always represent the new
            // column name
            var arg = $.trim($(this).val());
            if (index === 0 && arg.indexOf('$') !== -1) {
                var tempType = getColumnTypeFromArg(arg);
                if (tempType) {
                    colType = tempType;
                }
            }
            if (index === (numArgs - 1) && (operatorName === "map" ||
                                            operatorName === "group by")) {
                arg = arg.replace(/["']/g, '');
                arg = arg.replace(/\$/g, '');
            } else {
                arg = formatArgumentInput(arg, colType);
            }
            
            args.push(arg);
        });

        funcCapitalized = func.substr(0, 1).toUpperCase() + func.substr(1);

        switch (operatorName) {
            case ('aggregate'):
                isPassing = aggregate(funcCapitalized, args);
                break;
            case ('filter'):
                // filter(func, args).
                filter(func, args)
                .then(function() {
                    $operationsModal.find('.close')
                                    .trigger('click', {slow: true});
                })
                .fail(function() {
                    // we're already handling this
                });
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
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var frontColName = args[0];
        var backColName = frontColName;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === frontColName) {
                if (columns[i].func.args) {
                    backColName = columns[i].func.args[0];
                    colIndex = i;
                }
            }
        }
        return (xcFunction.aggregate(colIndex, frontColName, backColName,
                                     tableNum, aggrOp));
    }

    function filter(operator, args) {
        var deferred = jQuery.Deferred();

        var options = {};
        var colIndex = colNum;
        if (operator !== 'not') {
            var frontName = args[0];
            var backName = frontName;
            var columns = gTables[tableNum].tableCols;
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
        var colType = $operationsModal.data('coltype');
        var filterString = formulateFilterString(operator, args); 
        options = {"filterString" : filterString};

        xcFunction.filter(colIndex, tableNum, options)
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });

        return (deferred.promise());
    }

    function groupBy(operator, args) {
        var colIndex = -1;
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var frontName = args[0];
        var backName = frontName;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === frontName) {
                if (columns[i].func.args) {
                    backName = columns[i].func.args[0];
                    colIndex = i;
                }
            }
        }
        var numArgs      = args.length;
        var $input       = $operationsModal.find('.argument').eq((numArgs - 1));
        var newColName   = args[numArgs - 1];

        console.log("operator:", operator, "newColName:", newColName,
                    "colNum:", colNum, "tableNum:", tableNum);

        var isDuplicate = ColManager.checkColDup($input, null, tableNum);

        if (!isDuplicate) {
            xcFunction.groupBy(colIndex, frontName, backName, tableNum,
                                newColName, operator);
            return (true);
        } else {
            return (false);
        }
    }

    function map(operator, args) {
        var numArgs = args.length;
        var $nameInput   = $operationsModal.find('.argument')
                                           .eq(numArgs - 1);
        var newColName = args.splice(numArgs - 1, 1)[0];
        var isDuplicate = ColManager.checkColDup($nameInput, null, tableNum);
        if (isDuplicate) {
            return (false);
        }

        var firstValue = args[0];

        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === firstValue) {
                if (columns[i].func.args) {
                    firstValue = columns[i].func.args[0];
                }
            }
        }
        args[0] = firstValue;
        var mapStr = "";

        mapStr = formulateMapString(operator, args);

        xcFunction.map(colNum, tableNum, newColName, mapStr);

        return (true);
    }

    function getColumnTypeFromArg(value) {
        var colType;
        var colNameIndex = value.indexOf('$');
        value = value.substr(colNameIndex + 4);
        value = value.split(/[,) ]/)[0];
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === value) {
                colType = columns[i].type;
                break;
            }
        }
        return (colType);
    }

    function formatArgumentInput(value, colType) {
        value = $.trim(value);
        value = value.replace(/["']/g, '');
        if (value.indexOf("$") !== -1) {
            value = value.replace(/\$/g, '');
        } else if (colType === "string") {
            value = '"' + value + '"';
        }

        return (value);
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
        $operationsModal.find('.list').eq(inputNum)
                        .find('li').each(function() {
            if ($(this).css('opacity') > 0.2) {
                placeholderText = $(this).text();
                return (false);
            }
        });

        $operationsModal.find('.autocomplete').eq(inputNum)
                        .attr('placeholder', placeholderText);
    }

    function highlightOperationColumn() {
        var $th = $('#xcTable' + tableNum).find('th.col' + colNum);
        $th.addClass('modalHighlighted');
        $('#xcTable' + tableNum).find('td.' + 'col' + colNum)
                              .addClass('modalHighlighted');
    }

    function disableTableEditing() {
        // setTimeout to act after resize column width's mouseup
        setTimeout(function() {
            $('#xcTable' + tableNum).find('.editableHead')
                                    .attr('disabled', true);
        }, 0);
    }

    function disableSubmit() {
        $operationsModal.find('.confirm').prop("disabled", true);
    }

    function enableSubmit() {
        $operationsModal.find('.confirm').prop("disabled", false);
    }

    function getAutoGenColName(name) {
        var takenNames = {};
        var tableCols   = gTables[tableNum].tableCols;
        var numCols = tableCols.length;
        for (var i = 0; i < numCols; i++) {
            takenNames[tableCols[i].name] = 1;
            if (tableCols[i].func.args) {
                var backName = tableCols[i].func.args[0];
                takenNames[backName] = 1;
            }  
        }

        var validNameFound = false;
        var limit = 20; // we won't try more than 20 times
        var newName = name;
        if (newName in takenNames) {
            for (var i = 1; i < limit; i++) {
                newName = name + i;
                if (!(newName in takenNames)) {
                    validNameFound = true;
                    break;
                }
            }
            if (!validNameFound) {
                var tries = 0;
                while (newName in takenNames && tries < 20) {
                    newName = xcHelper.randName(name, 4);
                    tries++;
                }
            }
        }
        return (newName);
    }

    function insertText($input, textToInsert) {
        var value = $input.val();
        textToInsert = "$" + textToInsert;
       
        var firstBracketIndex = value.lastIndexOf("(");
        var lastBracketIndex = value.indexOf(")");
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        if (numCharSelected !== 0) {
            var begin = value.substr(0, currentPos);
            var end = value.substr(currentPos + numCharSelected, value.length);
            value = begin + end;
        } else if ((firstBracketIndex >= 0 &&
                    lastBracketIndex > firstBracketIndex) &&
                    (currentPos > firstBracketIndex &&
                    currentPos <= lastBracketIndex)) {
            var textBetweenBrackets =
                $.trim(value.substring(firstBracketIndex + 1,
                                       lastBracketIndex));
            if (value[lastBracketIndex - 1] === "(" ||
                textBetweenBrackets === "") {
                // fall through
            } else if (currentPos !== lastBracketIndex) {
                if ((currentPos - 1) === firstBracketIndex) {
                    if (value[currentPos] !== " "
                        && value[currentPos] !== ",") {
                        textToInsert += ", ";
                    }
                } else if (value[currentPos - 2] === ","
                    && value[currentPos - 1] === " ") {
                    if (value[currentPos] !== " ") {
                        textToInsert += ", ";
                    }
                }
                else if (value[currentPos - 1] === ",") {
                    textToInsert = " " + textToInsert;
                    if (value[currentPos] !== " ") {
                        textToInsert += ", ";
                    } else if (value[currentPos + 1] !== " ") {
                        textToInsert += ",";
                    }
                } else if (value[currentPos] === ",") {
                    textToInsert = ", " + textToInsert;
                }
            } else if (value[currentPos - 2] !== ",") {
                if (value[currentPos - 1] !== ','
                    && value[currentPos] !== " ") {
                    textToInsert = ", " + textToInsert;
                } else if (value[currentPos - 1] === ',') {
                    textToInsert = " " + textToInsert;
                }
            }  
        }

        var strLeft = value.substring(0, currentPos);
        var strRight = value.substring(currentPos, value.length);
        $input.val(strLeft + textToInsert + strRight);
        currentPos += textToInsert.length;
        $input[0].setSelectionRange(currentPos, currentPos);
    }

    return (OperationsModal);
}(jQuery, {}));
