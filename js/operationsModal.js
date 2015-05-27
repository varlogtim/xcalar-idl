window.OperationsModal = (function($, OperationsModal) {
    var $operationsModal = $('#operationsModal');
    var $categoryInput = $('#categoryList').find('.autocomplete');
    var $functionInput = $('#functionList').find('.autocomplete');
    var $functionsMenu = $('#functionsMenu');
    var $th = ""; // the head of the selected column
    var colNum = "";
    var tableNum = "";
    var colName = "";
    var backColName = "";
    var operatorName = "";
    var operatorNoSpace = operatorName.replace(/\s+/g, ''); // remove spaces;
    var operatorsArray = [];
    
    var modalHelper = new xcHelper.Modal($operationsModal);

    OperationsModal.setup = function() {
        var $autocompleteInputs = $operationsModal.find('.autocomplete');

        $autocompleteInputs.on('input', function() {
            suggest($(this));
        });

        $autocompleteInputs.on('change', function(event) {
            if ($(this).parent().index() == 0) {
                updateFunctionsList();
            }
            if ($(this).siblings('.list').find('li').length > 0) {
                return;
            }
            produceArgumentTable();
            var index = $autocompleteInputs.index($(this));
            if ($(this).val() != "") {
                enterInput(index);
            } 
        });

        $autocompleteInputs.on('click', function() {
            $operationsModal.find('.list, .list li').hide();
            suggest($(this));
            $operationsModal.find('li.highlighted').removeClass('highlighted');
        });

        $autocompleteInputs.on('keypress', function(event) {
            if (event.which == keyCode.Enter) {
                var index = $autocompleteInputs.index($(this));
                if ($(this).val() == "") {
                    clearInput(index);
                    return;
                }
                $(this).blur();
                $operationsModal.find('.list, .list li').hide();
                
                enterInput(index);  
            } else {
                closeListIfNeeded($(this));
            }
        });

        $autocompleteInputs.on('keydown', function(event) {
            if (event.which == keyCode.Down) {
                listHighlight($(this), keyCode.Down);
            } else if (event.which == keyCode.Up) {
                listHighlight($(this), keyCode.Up);
            }
        });

        $operationsModal.find('.list').on('click', 'li', function(event) {
            event.stopPropagation();
            var $el = $(this);
            var value = $el.text();
            var $input = $el.parent().siblings('.autocomplete');
            $el.parent().hide().children().hide(); 
            if ($input.val() == value) {

                return;
            }
            $input.val(value);
            
            var index = $operationsModal.find('.list').index($el.parent());
            enterInput(index);
        });

        $operationsModal.find('.list').on('mouseenter', 'li', function(event) {
            $operationsModal.find('.list li').removeClass('highlighted');
            $(this).addClass('highlighted');
        });

        $operationsModal.find('.list').on('mouseleave', 'li', function(event) {
            $operationsModal.find('.list li').removeClass('highlighted');
            $(this).removeClass('highlighted');
        });

        $operationsModal.find('.dropdown').on('click', function() {

            $operationsModal.find('.list').hide();
            var $list = $(this).siblings('.list');
            $list.show();
            $list.children().show();
        });

        var $argumentInputs = $operationsModal.find('.argumentSection input');

        $argumentInputs.on('blur', function() {
            var blankOK = true;
            checkArgumentParams(blankOK);
        });

        $argumentInputs.on('keypress', function(event) {
            if (event.which == keyCode.Enter && !modalHelper.checkBtnFocus()) {
                $(this).blur();
                submitForm();
            }
        });

        $operationsModal.find('.cancel, .close').on('click', function(e, data) {
            if (data && data.slow) {
                var time = 300;
            } else {
                var time = 0;
            }
            $operationsModal.fadeOut(time, function() {
                clearInput(0);
                modalHelper.clear();
            }); 
            $('#modalBackground').fadeOut(time, function() {
                $(this).removeClass('light');
            });
            $('#sideBarModal').fadeOut(time, function() {
                $(this).removeClass('light');
                $('#rightSideBar').removeClass('modalOpen');
            });
            
            
            $('.modalHighlighted').removeClass('modalHighlighted');
            $functionInput.attr('placeholder', "");
            
            $(document).mousedown(); // hides any error boxes;
            $('#highlightOffset').remove();
            $(window).off('resize', moveHighlightedColumn);
             
        });

        $operationsModal.on('click', function() {
            var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
            if ($mousedownTarget.closest('.listSection').length == 0) {
                $operationsModal.find('.list, .list li').hide();
            }
        });

        $operationsModal.find('.confirm').on('click', submitForm);

        $operationsModal.draggable({
            handle: '.operationsModalHeader',
            cursor: '-webkit-grabbing'
        });
        
        // Populate the XDFs list on setup so that we don't have to keep calling
        // the listXdfs call. However we must keep calling listUdfs because user
        // defined functions are populated on run. However, Xdfs will not be
        // added dynamically.
        XcalarListXdfs("*", "*")
        .done(function(listXdfsObj) {
            operatorsArray = listXdfsObj.fnDescs;
        });
    }

    OperationsModal.show = function(newTableNum, newColNum, operator) {
        tableNum = newTableNum;
        colNum = newColNum;
        colName = gTables[tableNum].tableCols[colNum-1].name;
        if (gTables[tableNum].tableCols[colNum-1].func.args) {
            backColName = gTables[tableNum].tableCols[colNum-1].func.args[0];
        } else {
            backColName = gTables[tableNum].tableCols[colNum-1].name;
        }
        
        highlightOperationColumn(tableNum, colNum);
        $operationsModal = $('#operationsModal');
        $operationsModal.fadeIn(200);
        $('#modalBackground').addClass('light').fadeIn(200);
        $('#sideBarModal').addClass('light').fadeIn(200);
        $('#rightSideBar').addClass('modalOpen');
        $operationsModal.find('.operationsModalHeader .text').text(operator);
        operatorName = $.trim(operator.toLowerCase());
        operatorNoSpace = operatorName.replace(/\s+/g, ''); // remove spaces;

        
        var colTypes = [gTables[tableNum].tableCols[colNum-1].type];
        
        if ($('#xcTable'+tableNum).find('th.col'+colNum)
                                  .hasClass('indexedColumn')) {
            colTypes.push('indexed');
        }

        var classes = $operationsModal.attr('class').split(' ');
        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('type') == 0) {
                classes.splice(i, 1);
                i--;
            }else if (classes[i].indexOf('numArgs') == 0){
                classes.splice(i, 1);
                i--;
            }
        }
        $operationsModal.attr('class', classes.join(' '));
        for (var i = 0; i < colTypes.length; i++) {
            $operationsModal.addClass('type-'+colTypes[i]);
        }
        if (!gTables[tableNum].isTable) {
            $operationsModal.addClass('type-dataset');
        }
        if (gTables[tableNum].tableCols[colNum-1].isNewCol) {
            $operationsModal.addClass('type-newColumn');
        }

        var args = Object.keys(allArgs[operatorName])
        if (args.length == 1 && 
            allArgs[operatorName]['defaultArgs'].length == 0) {
            $operationsModal.addClass('numArgs0');
        } else if (allArgs[operatorName]['defaultArgs'].length == 3) {
            $operationsModal.addClass('numArgs3');
        }

        centerPositionElement($operationsModal);
        modalHelper.setup();

        fillInputPlaceholder(0); 

        $categoryInput.val('all').change();
        enterInput(0);
        $operationsModal.find('.circle1').addClass('filled');
        $functionInput.focus();
    }


    function suggest($input) {
        var value = $.trim($input.val()).toLowerCase();
        var $list = $input.siblings('.list');
        $list.show();
        
        replaceFunctionListItems();
        $list.find('li').show();
        $list.find('li:not(:contains('+value+'))').remove();
        if (value == "") {
            return;
        }

        var $lis = $list.find('li');
        var strongMatchArray = [];
        for (var i = 0; i < $lis.length; i++) {
            var $li = $lis.eq(i);
            var liText = $li.text();
            if (liText.indexOf(value) == 0) {
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
            } else {
                updateFunctionsList();
            }  
        }

        $operationsModal.find('.circle'+inputNum).addClass('done');
        $operationsModal.find('.link'+inputNum).addClass('filled');

        $operationsModal.find('.step:eq('+(inputNum+1)+')')
                        .removeClass('inactive')
                        .find('.autocomplete')
                        .attr('disabled', false);

        if (inputNum == 1) {
            produceArgumentTable();
        }

        if (!noFocus) {
            $operationsModal.find('input').eq(inputNum+1).focus();
        }

        setTimeout(function() {
            $operationsModal.find('.circle'+(inputNum+1)).addClass('filled');
        }, 300);
    }

    function clearInput(inputNum, keep) {
        if (!keep) {
            $operationsModal.find('.autocomplete').eq(inputNum).val("");
        }

        $operationsModal.find('.list, .list li').hide();

        $operationsModal.find('.outerCircle:eq('+inputNum+')')
                        .removeClass('done');
        $operationsModal.find('.outerCircle:gt('+inputNum+')')
                        .removeClass('done filled');
        $operationsModal.find('.step:gt('+inputNum+')')
                        .addClass('inactive')
                        .find('.autocomplete')
                        .attr('disabled', true)
                        .val("");

        $operationsModal.find('.innerLink:eq('+(inputNum)+')')
                        .removeClass('filled');
        $operationsModal.find('.innerLink:gt('+(inputNum)+')')
                        .removeClass('filled');
    }

    function closeListIfNeeded($input) {
        var parentId = $input.closest('.listSection').attr('id');
        var $mousedownTarget = gMouseEvents.getLastMouseDownTarget();
        if ($mousedownTarget.closest('#'+parentId).length == 0) {
            $operationsModal.find('.list, .list li').hide();
        }
    }

    function listHighlight($input, keyCodeNum) {
        if (keyCodeNum == keyCode.Up) {
            var direction = -1;
        } else if (keyCodeNum == keyCode.Down) {
            var direction = 1;
        } else {
            // key code not supported
            return;
        }

        var $lis = $input.siblings('.list').find('li').filter(function() {
                        return ($(this).css('display') != 'none');
                    });
        if ($lis.length == 0) {
            return;
        }
        var $highlightedLi = $lis.filter(function() {
                                return ($(this).hasClass('highlighted'));
                            });
        if ($highlightedLi.length != 0) {
            var index = $highlightedLi.index();
            $highlightedLi.removeClass('highlighted');
            if ((index+1) >= $lis.length) {
                if (direction == -1) {
                    $highlightedLi = $lis.eq(index+direction);
                } else {
                    $highlightedLi = $lis.eq(0);
                }
            } else {
                $highlightedLi = $lis.eq(index+direction);
            }
        } else {
            var index = 0;
            $highlightedLi = $lis.eq(0); 
        } 
        $highlightedLi.addClass('highlighted');
        var val = $highlightedLi.text();
        $input.val(val);
    }
    

    function isOperationValid(inputNum) {
        var category = $.trim($categoryInput.val().toLowerCase());
        var categoryNoSpace = category.replace(/\s+/g, ''); // remove spaces;
        var func = $.trim($functionInput.val().toLowerCase());
        var funcNoSpace = func.replace(/\s+/g, ''); // remove spaces;

        if (inputNum == 0) {
            if ($operationsModal.find('.'+categoryNoSpace).css('opacity')
                 < 0.2) {
                return (false);
            } 
            else {
                return (categoriesList[category]);
            }
        } else if (inputNum == 1) {
            if ($operationsModal.find('.'+funcNoSpace).css('opacity')
                 < 0.2) {
                return (false);
            } else if (categoriesList[category] 
                && functionsList[operatorName].indexOf(func) > -1) {
                return (true);
            } else {
                return (false);
            }
        }
        return (false);
    }

    function showErrorMessage(inputNum) {
        var text = 'This operation is not supported';
        var $target = $operationsModal.find('input').eq(inputNum);
        if ($.trim($target.val()) == "") {
            text = 'Please fill out this field';
        }
        var isFormMode = false;
        var offset = -5;
        StatusBox.show(text, $target, isFormMode, offset);
    }

    function updateFunctionsList() {

        var funcText = $.trim($functionInput.val()).toLowerCase();
        var classes = $functionsMenu.attr('class').split(' ');

        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('category-') == 0) {
                classes.splice(i, 1);
                i--;
            }
        }

        $functionsMenu.attr('class', classes.join(' '));
        $functionsMenu.addClass('category-'+operatorName);
        replaceFunctionListItems();
       
        fillInputPlaceholder(1);
    }

    function replaceFunctionListItems() {
        var category = $.trim($categoryInput.val().toLowerCase());
        var categoryNoSpace = category.replace(/\s+/g, ''); // remove spaces
        if (functionsList[operatorName]) {
            if ($operationsModal.find('.'+categoryNoSpace).css('opacity')
                 < 0.2) {
                $functionsMenu.empty();
                return;
            } 

            var html = "";
            var numOptions = functionsList[operatorName].length;
            for (var i = 0; i < numOptions; i++) {
                var value = functionsList[operatorName][i];
                var classValue = value.replace(/\s+/g, ''); // remove spaces;
                html += '<li class="'+classValue+'">'+value+'</li>';
            }

            $functionsMenu.html(html);
            var $hiddenLis = $functionsMenu.find('li').filter(function() {
                return ($(this).css('opacity') < 0.2);
            });

            $hiddenLis.remove();
        } else {
            $functionsMenu.empty();
        }
    }

    function produceArgumentTable() {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());

        if (allArgs[operatorName]) {
            if (allArgs[operatorName][func]) {
                var args = allArgs[operatorName][func];
            } else {
                var args = allArgs[operatorName]['defaultArgs'];
            }
            args = JSON.parse(JSON.stringify(args));

            if (args[0] && args[0][""] != undefined ) {
                // if no description provided, use func as the discription
                args[0][func] = args[0][""]; 
                delete args[0][""];
            }

            displayArgumentRows(args);

            if (args.length == 0) {
                $operationsModal.find('.argumentListTitle').hide();
                $operationsModal.find('.tableContainer').css('opacity', 0);
                $operationsModal.find('.circle2').addClass('done');
            } else {
                $operationsModal.find('.argumentListTitle').show();
                $operationsModal.find('.tableContainer').css('opacity', 1);
            }
        } else {
            $operationsModal.find('.argumentTable').show()
                            .find('input').val("");
            $operationsModal.find('.description').html('');
        }

        displayDescriptionText(category, func);
    }

    function displayDescriptionText(category, func) {
        var vowels = ['a', 'e', 'i', 'o', 'u'];
        if (vowels.indexOf(category[0]) > -1) {
            var article = 'an';
        } else {
            var article = 'a';
        }
        // var descriptionOfFunction = "Perform "+article+" " + 
        //                             capitalize(category) + 
        //                             ": \"<b>" + func +
        //                             "\"</b> on column: \"<b>" + colName + 
        //                             "</b>\".";
        var descriptionOfFunction = "Perform function"+
                                    ": \"<b>" + func +
                                    "\"</b> on column: \"<b>" + colName + 
                                    "</b>\".";
        $operationsModal.find('.descriptionText').html(descriptionOfFunction);
    }

    function displayArgumentRows(args) {
        var numArgs = args.length;
        var $rows = $operationsModal.find('.argumentTable tbody tr');

        $rows.each(function(index) {
            if (index >= numArgs) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });

        for (var i = 0; i < numArgs; i++) {
            for (var description in args[i]) {
                $rows.eq(i).find('.description').text(capitalize(description)); 
                if (operatorName == 'filter' 
                    && $operationsModal.hasClass('type-string')
                    && args[i][description] == 0) {
                    $rows.eq(i).find('input').val('');
                } else {
                   $rows.eq(i).find('input').val(args[i][description]);
                }
            }
        }
    }

    function submitForm() {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());
        var isPassing = false;
        if (!categoriesList[category]) {
            showErrorMessage(0);
        } else if (functionsList[operatorName].indexOf(func) == -1) {
            showErrorMessage(1);
        } else {
            isPassing = checkArgumentParams();
        }

        if (!isPassing) {
            return;
        } 

        func = capitalize(func);

        switch (operatorName) {
            case ('aggregate'):
                aggregate(func);
                break;
            case ('filter') :
                filter(func);
                break;
            case ('group by'):
                isPassing = groupBy(func);
                break;
            case ('map') :
                isPassing = map(func);
                break;
            default: 
                showErrorMessage(0);
                isPassing = false;

        }

        if (isPassing) {
            $operationsModal.find('.close').trigger('click', {slow:true});
        }
    }

    function checkArgumentParams(blankOK) {
        var allInputsFilled = true;
        var inputIndex = 2;
        var $argInputs = $operationsModal.find('.argumentSection input')
                                        .filter(function() {
                        return ($(this).closest('tr').css('display') != 'none');
                    });
        $argInputs.each(function(index) {
            if ($(this).val() == "") {
                allInputsFilled = false;
                if (!blankOK) {
                    showErrorMessage(inputIndex+index);
                }
                return (false);
            }
        })

        if (allInputsFilled) {
            var noFocus = true;
            enterInput(2, noFocus);
            return (true);
        } else {
            clearInput(2);
            return (false);
        }
    }

    function aggregate(aggrOp) {
        xcFunction.aggregate(colNum, tableNum, aggrOp);
    }

    function filter(operator) {
        var value = $.trim($operationsModal.find('.argument').eq(0).val());

        if (operator == "Exclude" )  {
            if ($operationsModal.hasClass('type-number')) {
                operator += " number";
            } else {
                operator += " string";
            }
        }
        console.log(operator, 'operator');

        xcFunction.filter(colNum, tableNum, operator, value);
    }

    function groupBy(operator) {
        var $input       = $operationsModal.find('.argument').eq(0);
        var newColName   =  $.trim($input.val());
        var $theadInputs = $('#xcTable'+tableNum).find('.editableHead');

        console.log("operator:", operator, "newColName:", newColName, 
                    "colNum:"  , colNum  , "tableNum:"  , tableNum);

        var isDuplicate = ColManager.checkColDup($theadInputs, $input);

        if (!isDuplicate) {
             xcFunction.groupBy(colNum, tableNum, newColName, operator);
            return (true);
        } else {
            return (false);
        }
    }

    function map(operator) {
        var $nameInput   = $operationsModal.find('.argument').eq(2);
        var $theadInputs = $('#xcTable'+tableNum).find('.editableHead');
        var isDuplicate  = ColManager.checkColDup($theadInputs, $nameInput);

        if (isDuplicate) {
            return (false);
        }

        var $firstVal  = $operationsModal.find('.argument').eq(0);
        var firstValue      = $.trim($firstVal.val());
        var $secondVal  = $operationsModal.find('.argument').eq(1);
        var secondValue      = $.trim($secondVal.val());
        var newColName = $.trim($nameInput.val());

        var switched   = false; // XX we need to enable argument switching;
        var mapStr     = formulateMapString(operator, firstValue, secondValue);

        console.log(operator);

        if (!$operationsModal.hasClass('type-newColumn')) {
            ColManager.addCol('col' + colNum, 'xcTable' + tableNum, null, 
                          {direction: 'L', isNewCol: true});
        }
        

        var $th       = $('#xcTable'+tableNum).find('th.col'+colNum);
        var $colInput = $th.find('.editableHead.col'+colNum);

        $colInput.val(newColName);
        $("#fnBar").val(mapStr);
        functionBarEnter($colInput);

        return (true);
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

    var categoriesList = {'all': true};

    var functionsList = {
        'aggregate' : [
                        'average',
                        'count',
                        'max',
                        'min',
                        'sum'
                      ],
        'filter' : [
                    'greater than', 
                    'greater than equal to', 
                    'equals',
                    'less than equal to',
                    'less than',
                    'exclude',
                    'like',
                    'regex',
                    'custom',
                   ],
        'group by' : [
                        'average',
                        'count',
                        'max',
                        'min',
                        'sum'
                     ],
        'map' : [
                    'sum',
                    'subtract',  
                    'multiply', 
                    'divide', 
                    'and',
                    'or', 
                    'ip address to integer'
                ],
    }

    var allArgs = {
        'aggregate' : {'defaultArgs' : []},

        'filter' : {
                    'defaultArgs' : [{'Value to be compared with': 0}],
                    'exclude' : [{'Value or Regex to exclude': '*'}],
                    'like': [{'Clause to search for a specified pattern': ''}],
                    'regex' : [{'Regular expression to be matched to': '*'}],
                    'custom' : [{'enter a custom argument': ''}]
                   },
        'group by' : {'defaultArgs' : 
                      [{'New Column Name for the groupBy resultant column' :
                        'groupBy'}]},

        'map' : {
                    'defaultArgs' : [
                        {'Value or Column Name' : 1}, 
                        {'Value or Column Name' : 1}, 
                        {'New Resultant Column Name' : 'mappedCol'}
                    ], 
                    'sum' : [
                        {'Value or Column Name' : 3}, 
                        {'Value or Column Name' : 3}, 
                        {'New Resultant Column Name' : 'mappedCol'}
                    ],
                    'subtract' : [
                        {'Value or Column Name' : 2}, 
                        {'Value or Column Name' : 2}, 
                        {'New Resultant Column Name' : 'mappedCol'}
                    ],
                    'multiply' : [
                        {'Value or Column Name' : 4}, 
                        {'Value or Column Name' : 4}, 
                        {'New Resultant Column Name' : 'mappedCol'}
                    ],
                    'ip address to integer' : [
                        {'Number of Octets' : 3}, 
                        {'New Resultant Column Name' : 'mappedCol'}
                    ]
                }
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
        $th = $('#xcTable'+tableNum).find('th.'+'col'+colNum);
        $th.addClass('modalHighlighted');
        var left = $th.offset().left;
        var style = '<style id="highlightOffset">'+
                    '.modalHighlighted .header{left:'+left+
                    'px;}</style>';
        $(document.body).append(style);

        $('#xcTable'+tableNum).find('td.'+'col'+colNum)
                              .addClass('modalHighlighted');
        $(window).resize(moveHighlightedColumn);
    }

    function moveHighlightedColumn() {
        var left = $th.offset().left;
        $('#highlightOffset').text('.modalHighlighted .header{left:'+left+
                                    'px;}');
    }

    return (OperationsModal);
}(jQuery, {}));




