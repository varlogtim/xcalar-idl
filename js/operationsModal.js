window.OperationsModal = (function($, OperationsModal) {
    var $operationsModal = $('#operationsModal');
    var $categoryInput = $('#categoryList').find('.autocomplete');
    var $categoryMenu = $('#categoryMenu');
    var $functionInput = $('#functionList').find('.autocomplete');
    var $functionsMenu = $('#functionsMenu');
    var $th = ""; // the head of the selected column
    var colNum = "";
    var tableNum = "";
    var colName = "";
    var backColName = "";
    var operatorName = "";
    var operatorNoSpace = operatorName.replace(/\s+/g, ''); // remove spaces;
    var operatorsMap = {};
    var categoryNames = [];
    var functionsMap = {};
    
    var modalHelper = new xcHelper.Modal($operationsModal);

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

        $operationsModal.find('.list').on('mouseup', 'li', function(event) {
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

        $operationsModal.find('.dropdown').on('click', function() {

            $operationsModal.find('.list').hide();
            var $list = $(this).siblings('.list');
            $list.show();
            $list.children().sort(sortHTML).prependTo($list);
            $list.children().show();
        });

        var $argumentInputs = $operationsModal.find('.argumentSection input');

        $operationsModal.on('blur', '.argument', function() {
            var blankOK = true;
            checkArgumentParams(blankOK);
        });

        $operationsModal.on('keypress', '.argument', function(event) {
            if (event.which === keyCode.Enter && !modalHelper.checkBtnFocus()) {
                $(this).blur();
                submitForm();
            }
        });

        $operationsModal.on('blur', '.argument', function(event) {
            var $el = $(this);
            setTimeout(function() {
                var $mouseTarget = gMouseEvents.getLastMouseDownTarget();
                if ($mouseTarget.hasClass('editableHead') && 
                    $mouseTarget.closest('.xcTable').length !== 0) {
                    var colName = $mouseTarget.val();
                    $el.focus().val(colName);
                }
            },0);
        })

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
            });
            $('#xcTable'+tableNum).removeClass('opModalOpen');
            $('.modalHighlighted').removeClass('modalHighlighted');

            $functionInput.attr('placeholder', "");
            $('#xcTable'+tableNum).find('.editableHead').attr('disabled', false);
            
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

        // XXX Cheng for udf dropdown list
        UDF.dropdownEvent($("#agrTable-udfModule").find(".listSection"),
                          $("#agrTable-udfFunc").find(".listSection"),
                          "#operationsModal");
    };

    OperationsModal.show = function(newTableNum, newColNum, operator) {
        // groupby and aggregates stick to num 6,
        // filter and map use 0-5;
        tableNum = newTableNum;
        colNum = newColNum;
        colName = gTables[tableNum].tableCols[colNum - 1].name;
        if (gTables[tableNum].tableCols[colNum - 1].func.args) {
            backColName = gTables[tableNum].tableCols[colNum - 1].func.args[0];
        } else {
            backColName = gTables[tableNum].tableCols[colNum - 1].name;
        }
        
        highlightOperationColumn(tableNum, colNum);
        $('#xcTable'+tableNum).addClass('opModalOpen');
        $('#xcTable'+tableNum).find('.editableHead').attr('disabled', true);
        $operationsModal = $('#operationsModal');
        $operationsModal.fadeIn(200);

        $operationsModal.find('.operationsModalHeader .text').text(operator);
        operatorName = $.trim(operator.toLowerCase());
        operatorNoSpace = operatorName.replace(/\s+/g, ''); // remove spaces;

        var colTypes = [gTables[tableNum].tableCols[colNum - 1].type];
        
        if ($('#xcTable' + tableNum).find('th.col' + colNum)
                                  .hasClass('indexedColumn')) {
            colTypes.push('indexed');
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
        for (var i = 0; i < colTypes.length; i++) {
            $operationsModal.addClass('type-' + colTypes[i]);
        }
        if (!gTables[tableNum].isTable) {
            $operationsModal.addClass('type-dataset');
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

    function populateInitialCategoryField(operator) {
        functionsMap = {};
        categoryNames = [];
        var html = "";
        if (operator === "map") {
            for (var i = 0; i < operatorsMap.length; i++) {
                if (FunctionCategoryTStr[i] === 'Aggregate functions') {
                    continue;
                }
                var categoryName = FunctionCategoryTStr[i].toLowerCase();
                categoryNames.push(categoryName);
                functionsMap[i] = operatorsMap[i];
                html += '<li class="category' + i + '">' +
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
            var categoryName = FunctionCategoryTStr[categoryIndex]
                               .toLowerCase();
            categoryNames.push(categoryName);
            functionsMap[0] = operatorsMap[categoryIndex];
            html += '<li class="category' + categoryIndex + '">' +
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
        var i = 0;
        for (var category in FunctionCategoryT) {
            var custom = {
                argDescs: [{'argDesc': 'Module Name'},
                             {'argDesc': 'Function String'}],
                category  : i,
                fnDesc    : "Enter a user defined function",
                fnName    : "udf",
                numArgs   : 2,
                outputType: -1
            };

            operatorsMap[i].push(custom);

            i++;
        }
        operatorsMap.length = i;
    }

    function sortHTML(a, b){
        return ($(b).text()) < ($(a).text()) ? 1 : -1;    
    }

    function suggest($input) {
        var value = $.trim($input.val()).toLowerCase();
        // var valLen = value.length;
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
        var ops = functionsMap[index];
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
        var ops = functionsMap[categoryIndex];
        var numOps = ops.length;
        // var html = "";
        var opIndex = -1;
        var operObj;
        for (var i = 0; i < numOps; i++) {
            if (func === ops[i].fnName.toLowerCase()) {
                opIndex = i;
                operObj = ops[i];
            }
        }

        if (opIndex > -1) {
            // var defaultValue;
            var firstDefaultValue;
            var defaultValue = colName;
            if (!firstArgExceptions[category]) {
                defaultValue = "";
            } else if (firstArgExceptions[category].indexOf(func) != -1) {
                defaultValue = "";
            }

            var numArgs = operObj.numArgs;
            var $tbody = $operationsModal.find('.argumentTable tbody');

            var $moduleRow = $("#agrTable-udfModule");
            var $funcRow   = $("#agrTable-udfFunc");
            // specifically for udf section
            if (func === "udf") {
                // make module row and func row as first row and second row
                $tbody.prepend($funcRow ).prepend($moduleRow);
                UDF.getDropdownList($moduleRow.find(".listSection"),
                                    $funcRow.find(".listSection"));
                // XXX Cheng handle dropdown list overflow issue
                $operationsModal.find(".tableContainer")
                                    .addClass("udfMode");
            } else {
                $tbody.append($moduleRow).append($funcRow);
                $operationsModal.find(".tableContainer")
                                    .removeClass("udfMode");
            }

            // as rows order may change, update it here
            var $rows = $tbody.find('tr');
            $rows.show();

            var description;
            for (var i = 0; i < operObj.numArgs; i++) {
                description = operObj.argDescs[i].argDesc;

                if (func !== "udf") {
                    
                    if (i == 0) {
                        $rows.eq(i).find('input').val(defaultValue);
                    } else {
                        $rows.eq(i).find('input').val("");
                    }
                }
                $rows.eq(i).find('.description').text(description);
            }
            if (operatorName === 'map') {
                description = 'New Resultant Column Name';
                $rows.eq(numArgs).find('input').val('mappedCol');
                $rows.eq(numArgs).find('.description').text(description);
                numArgs++;
            } else if (operatorName === 'group by') {
                description = 'New Column Name for the groupBy' +
                                ' resultant column';
                $rows.eq(numArgs).find('input').val('groupBy');
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
            if ($(this).val() === "") {
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
            return;
        }

        funcCapitalized = func.substr(0, 1).toUpperCase() + func.substr(1);

        switch (operatorName) {
            case ('aggregate'):
                isPassing = aggregate(funcCapitalized);
                break;
            case ('filter'):
                isPassing = filter(func);
                break;
            case ('group by'):
                isPassing = groupBy(funcCapitalized);
                break;
            case ('map'):
                isPassing = map(funcLower);
                break;
            default:
                showErrorMessage(0);
                isPassing = false;

        }

        if (isPassing) {
            $operationsModal.find('.close').trigger('click', {slow: true});
        } else {
            // show some kidddna error message
        }
    }

    function aggregate(aggrOp) {
        
        if (aggrOp === "Udf") {
            Alert.error("Aggregate Failed",
                        "UDF currently not available for aggregates");
            return (false);
        } else {
            var colIndex = -1;
            var columns = gTables[tableNum].tableCols;
            var numCols = columns.length;
            var frontName = $.trim($operationsModal.find('.argument').val());
            var backName = frontName;
            for (var i = 0; i < numCols; i++) {
                if (columns[i].name === frontName) {
                    if (columns[i].func.args) {
                        backName = columns[i].func.args[0];
                        colIndex = i;
                    }
                }
            }
        }
        return (xcFunction.aggregate(colIndex, frontName, backName,
                                     tableNum, aggrOp));
    }

    function filter(operator) {
        var numVisibleInputs = $operationsModal.find('.argument:visible')
                                               .length;
        var value1 = $.trim($operationsModal.find('.argument').eq(0).val());
        var value2;
        var value3;
        var options = {};
        if (numVisibleInputs === 2) {
            value2 = $.trim($operationsModal.find('.argument').eq(1).val());
        } else if (numVisibleInputs === 3) {
            value2 = $.trim($operationsModal.find('.argument').eq(1).val());
            value3 = $.trim($operationsModal.find('.argument').eq(2).val());
        }   
        console.log(operator, 'operator');
        var colIndex = colNum;
        if (operator === "udf") {
            // value2 is in the form of fnCall(arg1, arg2, ...) and I need to
            // break it into "fnCall", arg1, arg2, arg3
            var regex = new RegExp('(.*)[(](.*)[)]', "g");
            var match = regex.exec(value2);
            var funcName = match[1];
            var args = match[2];
            var fltStr = "filter(pyExec(\"" + value1 + "\",\"";
            fltStr += funcName + "\",";
            fltStr += args + "))";
            options = {"filterString": fltStr};
        } else {
            if (operator !== 'not') {
                var frontName = value1;
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
                value1 = backName;
            }
            options = {"operator": operator,
                       "value1"  : value1,
                       "value2"  : value2,
                       "value3"  : value3};
        }

        return (xcFunction.filter(colIndex, tableNum, options));
    }

    function groupBy(operator) {
        var colIndex = -1;
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var frontName = $.trim($operationsModal.find('.argument').eq(0).val());
        var backName = frontName;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === frontName) {
                if (columns[i].func.args) {
                    backName = columns[i].func.args[0];
                    colIndex = i;
                }
            }
        }
        var $input       = $operationsModal.find('.argument').eq(1);
        var newColName   = $.trim($operationsModal.find('.argument')
                                                   .eq(1).val());
        var $theadInputs = $('#xcTable' + tableNum).find('.editableHead');

        console.log("operator:", operator, "newColName:", newColName,
                    "colNum:", colNum, "tableNum:", tableNum);

        var isDuplicate = ColManager.checkColDup($theadInputs, $input);

        if (!isDuplicate) {
            xcFunction.groupBy(colIndex, frontName, backName, tableNum,
                                newColName, operator);
            return (true);
        } else {
            return (false);
        }
    }

    function map(operator) {
        var numVisibleInputs = $operationsModal.find('.argument:visible')
                                               .length;
        var $nameInput   = $operationsModal.find('.argument')
                                           .eq(numVisibleInputs - 1);
        var $theadInputs = $('#xcTable' + tableNum).find('.editableHead');
        var isDuplicate  = ColManager.checkColDup($theadInputs, $nameInput);


        if (isDuplicate) {
            return (false);
        }

        var $firstVal  = $operationsModal.find('.argument').eq(0);
        var firstValue = $.trim($firstVal.val());
        var secondValue;
        var columns = gTables[tableNum].tableCols;
        var numCols = columns.length;
        var backName = firstValue;
        for (var i = 0; i < numCols; i++) {
            if (columns[i].name === firstValue) {
                if (columns[i].func.args) {
                    backName = columns[i].func.args[0];
                }
            }
        }
        if (numVisibleInputs === 3) {
            var $secondVal  = $operationsModal.find('.argument').eq(1);
            secondValue = $.trim($secondVal.val());
        }
        
        // var switched  = false;
        var newColName = $.trim($nameInput.val());
        var mapStr = "";

        if (operator.toLowerCase() === "udf") {
            var moduleName = firstValue;
            var funcString = secondValue;
            var regex = new RegExp('(.*)[(](.*)[)]', "g");
            var match = regex.exec(funcString);
            var funcName = match[1];
            var args = match[2];

            mapStr = "=map(pyExec(\"" + moduleName + "\",\"";
            mapStr += funcName + "\",";
            mapStr += args + "))";
        } else {
            mapStr = formulateMapString(operator, backName, secondValue);
        }
        console.log(operator, mapStr);

        if (!$operationsModal.hasClass('type-newColumn')) {
            ColManager.addCol('col' + colNum, 'xcTable' + tableNum, null,
                          {direction: 'L', isNewCol: true});
        }

        var $th       = $('#xcTable' + tableNum).find('th.col' + colNum);
        var $colInput = $th.find('.editableHead.col' + colNum);

        $colInput.val(newColName);
        $("#fnBar").val(mapStr);
        functionBarEnter($colInput);

        return (true);
    }

    function formulateMapString(operator, value1, value2) {
        // we're assuming the operator was picked from a list of valid operators
        console.log(arguments);
        var mapString = '=map(';
        mapString += operator + "(";
        mapString += value1;
        if (value2 != null) {
            mapString += ", " + value2;
        }
        mapString += "))";
        return (mapString);
    }

    function ascSort() {
        xcFunction.sort(colNum, tableNum, SortDirection.Forward);
    }

    function capitalize(string) {
        return (string.replace(/\w\S*/g, function(text) {
                    return (text.charAt(0).toUpperCase() +
                            text.substr(1).toLowerCase());
                }));
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

    function highlightOperationColumn(tableNum, colNum) {
        $th = $('#xcTable' + tableNum).find('th.' + 'col' + colNum);
        $th.addClass('modalHighlighted');
        $('#xcTable' + tableNum).find('td.' + 'col' + colNum)
                              .addClass('modalHighlighted');
    }

    // empty array means the first argument will always be the column name
    // value of false means the first argument will never be the column name
    // any function names in the array will not have column name as first argument
    var firstArgExceptions = {
        'aggregate functions' : [],
        'arithmetic functions' : [],
        'bitwise functions' : [],
        'conditional functions' : ['not'],
        'conversion functions' : [],
        'miscellaneous functions' : [],
        'string functions' : [],
        'trigonometric functions' : []
    }

    return (OperationsModal);
}(jQuery, {}));
