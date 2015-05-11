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

    OperationsModal.setup = function() {
        var $autocompleteInputs = $operationsModal.find('.autocomplete');

        $autocompleteInputs.on('input', function() {
            suggest($(this));
        });

        $autocompleteInputs.on('blur', function(event) {
            closeListIfNeeded($(this));
        });

        $autocompleteInputs.on('change', function(event) {
            var parentId = $(this).closest('.listSection').attr('id');
            var $whatCausedBlur = gMouseEvents.getLastMouseDownTarget();
            if ($whatCausedBlur.closest('#'+parentId).length == 0) {
                updateFunctionsList();
                produceArgumentTable();
                var index = $autocompleteInputs.index($(this));
                if ($(this).val() == "") {
                    clearInput(index);
                } else {
                    enterInput(index);
                }
            }     
        });

        $autocompleteInputs.on('click', function() {
            suggest($(this));
        });

        $autocompleteInputs.on('keypress', function(event) {
            if (event.which == keyCode.Enter && $(this).val() != "") {
                $(this).blur();
                $operationsModal.find('.list, .list li').hide();
                var index = $autocompleteInputs.index($(this));
                enterInput(index);
            } else {
                closeListIfNeeded($(this));
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

        $operationsModal.find('.clearInput').on('click', function() {
            var index = $operationsModal.find('.clearInput').index($(this));
            clearInput(index);
            $autocompleteInputs.eq(index).focus();
        });

        var $argumentInputs = $operationsModal.find('.argumentSection input');

        $argumentInputs.on('blur', function() {
            var blankOK = true;
            checkArgumentParams(blankOK);
        });

        $argumentInputs.on('keypress', function(event) {
            if (event.which == keyCode.Enter) {
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
            $operationsModal.fadeOut(time); 
            $('#modalBackground').fadeOut(time);
            
            $('.modalHighlighted').removeClass('modalHighlighted');
            clearInput(0);
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

        $operationsModal.on('keydown', function() {
            closeListIfNeeded($(this));
        });

        $operationsModal.find('.confirm').on('click', submitForm);
    }

    OperationsModal.show = function(newTableNum, newColNum) {
        tableNum = newTableNum;
        colNum = newColNum;
        colName = gTables[tableNum].tableCols[colNum-1].name;
        backColName = gTables[tableNum].tableCols[colNum-1].func.args[0];

        highlightOperationColumn(tableNum, colNum);
        $operationsModal = $('#operationsModal');
        $operationsModal.fadeIn(200);
        $('#modalBackground').fadeIn(200);

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
            }
        }
        $operationsModal.attr('class', classes.join(' '));
        for (var i = 0; i < colTypes.length; i++) {
            $operationsModal.addClass('type-'+colTypes[i]);
        }
        if (!gTables[tableNum].isTable) {
            $operationsModal.addClass('type-dataset');
        }

        fillInputPlaceholder(0); 
        $categoryInput.focus();
    }


    function suggest($input) {
        var value = $.trim($input.val()).toLowerCase();
        var $list = $input.siblings('.list');
        $list.show();
        $list.find('li').show();
        $list.find('li:not(:contains('+value+'))').hide();
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
        }, 350);
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
    

    function isOperationValid(inputNum) {
        var category = $.trim($categoryInput.val().toLowerCase());
        var categoryNoSpace = category.replace(/\s+/g, ''); // remove spaces;
        var operation = $.trim($functionInput.val().toLowerCase());
        var operationNoSpace = operation.replace(/\s+/g, ''); // remove spaces;

        if (inputNum == 0) {
            if ($operationsModal.find('.'+categoryNoSpace).css('opacity')
                 < 0.2) {
                return (false);
            } 
            else {
                return (categoriesList[category]);
            }
        } else if (inputNum == 1) {
            if ($operationsModal.find('.'+operationNoSpace).css('opacity')
                 < 0.2) {
                return (false);
            } else if (categoriesList[category] 
                && categoriesList[category].indexOf(operation) > -1) {
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
        var category = $.trim($categoryInput.val().toLowerCase());
        var categoryNoSpace = category.replace(/\s+/g, ''); // remove spaces;
        var funcText = $.trim($functionInput.val()).toLowerCase();
        var classes = $functionsMenu.attr('class').split(' ');

        for (var i = 0; i < classes.length; i++) {
            if (classes[i].indexOf('category-') == 0) {
                classes.splice(i, 1);
                i--;
            }
        }

        $functionsMenu.attr('class', classes.join(' '));
        $functionsMenu.addClass('category-'+categoryNoSpace);

        if (categoriesList[category]) {
            if ($operationsModal.find('.'+categoryNoSpace).css('opacity')
                 < 0.2) {
                $functionsMenu.empty();
                return;
            } 

            var html = "";
            var numOptions = categoriesList[category].length;
            for (var i = 0; i < numOptions; i++) {
                var value = categoriesList[category][i];
                var classValue = value.replace(/\s+/g, ''); // remove spaces;
                html += '<li class="'+classValue+'">'+value+'</li>';
            }
            
            $functionsMenu.html(html);

            var $lis = $functionsMenu.find('li').filter(function() {
                            return ($(this).text() == funcText);
                        });
            if ($lis.length == 0) {
                $functionInput.val("");
            }
        } else {
            $functionsMenu.empty();
            $functionInput.val("");
        }
        fillInputPlaceholder(1);
    }

    function produceArgumentTable() {
        var category = $.trim($categoryInput.val().toLowerCase());
        var func = $.trim($functionInput.val().toLowerCase());

        if (allArgs[category]) {
            if (allArgs[category][func]) {
                var args = allArgs[category][func];
            } else {
                var args = allArgs[category]['defaultArgs'];
            }
            args = JSON.parse(JSON.stringify(args));

            if (args[0] && args[0][""] != undefined ) {
                // if no description provided, use func as the discription
                args[0][func] = args[0][""]; 
                delete args[0][""];
            }

            displayArgumentRows(args, category);

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
        var descriptionOfFunction = "Perform "+article+" " + 
                                    capitalize(category) + 
                                    ": \"<b>" + func +
                                    "\"</b> on column: \"<b>" + colName + 
                                    "</b>\".";;
        $operationsModal.find('.descriptionText').html(descriptionOfFunction);
    }

    function displayArgumentRows(args, category) {
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
                if (category == 'filter' 
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
        } else if (categoriesList[category].indexOf(func) == -1) {
            showErrorMessage(1);
        } else {
            isPassing = checkArgumentParams();
        }

        if (!isPassing) {
            return;
        } 

        func = capitalize(func);

        switch (category) {
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
            case ('sort') :
                ascSort();
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
        var $nameInput   = $operationsModal.find('.argument').eq(1);
        var $theadInputs = $('#xcTable'+tableNum).find('.editableHead');
        var isDuplicate  = ColManager.checkColDup($theadInputs, $nameInput);

        if (isDuplicate) {
            return (false);
        }

        var $valInput  = $operationsModal.find('.argument').eq(0);
        var value      = $.trim($valInput.val());
        var newColName = $.trim($nameInput.val());

        var switched   = false; // XX we need to enable argument switching;
        var mapStr     = formulateMapString(operator, backColName,
                                        value, switched);

        console.log(operator);

        ColManager.addCol('col' + colNum, 'xcTable' + tableNum, null, 
                          {direction: 'L', isDark: true});

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

    var categoriesList = {
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
        'sort' : ['a-z']
    }

    var allArgs = {
        'aggregate' : {'defaultArgs' : []},

        'filter' : {
                    'defaultArgs' : [{'': 0}],
                    'regex' : [{'': '*'}],
                    'custom' : [{'enter a custom argument': ''}]
                   },
        'group by' : {'defaultArgs' : [{'New Column Name' : 'groupBy'}]},

        'map' : {
                    'defaultArgs' : [
                        {'Value or Column' : 1}, 
                        {'New Column Name' : 'mappedCol'}
                    ], 
                    'sum' : [
                        {'Value or Column' : 3}, 
                        {'New Column Name' : 'mappedCol'}
                    ],
                    'subtract' : [
                        {'Value or Column' : 2}, 
                        {'New Column Name' : 'mappedCol'}
                    ],
                    'multiply' : [
                        {'Value or Column' : 4}, 
                        {'New Column Name' : 'mappedCol'}
                    ],
                    'ip address to integer' : [
                        {'Value or Column' : 3}, 
                        {'Number of Octets' : 'mappedCol'}
                    ]
                },
        'sort' : {'defaultArgs' : []}
        
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




