window.JoinView = (function($, JoinView) {
    var $mainJoin;       // $("#mainJoin")
    var $joinView;      // $("#joinView")
    var $tableDropDown;  // $mainJoin.find('.joinTableList')
    var $leftTableDropdown;  // $('#joinLeftTableList');
    var $rightTableDropdown;  // $('#joinRightTableList');
    var $joinTypeSelect;     // $("#joinType")
    var $joinTableName;  // $("#joinTableNameInput")
    var $clauseContainer;      // $("#multiJoin")
    var $lastInputFocused;
    var isNextNew = true; // if true, will run join estimator

    var modalHelper;
    var multiClauseTemplate =
        '<div class="joinClause">' +
            '<input class="clause leftClause arg" type="text" ' +
            'spellcheck="false" />' +
              '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                  '<i class="icon xi-equal-circle fa-14"></i>' +
                '</div>' +
              '</div>' +
              '<input  class="clause rightClause arg" type="text" ' +
                'spellcheck="false"/>' +
        '</div>';

    var dragSide = null;
    var isOpenTime;

    JoinView.setup = function () {
        $mainJoin = $("#mainJoin");
        $joinView = $("#joinView");
        $tableDropDown = $mainJoin.find('.joinTableList');
        $leftTableDropdown = $('#joinLeftTableList');
        $rightTableDropdown = $('#joinRightTableList');
        $joinTypeSelect = $("#joinType");
        $joinTableName = $("#joinTableNameInput");
        $clauseContainer = $mainJoin.find('.joinContainer');
        // constant
        var minHeight = 600;
        var minWidth  = 800;

        modalHelper = new ModalHelper($joinView, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        
        $joinView.find('.cancel, .close').on('click', function() {
            JoinView.close();
        });

        $joinView.find('.next, .back').click(function() {
            toggleNextView();
        });

        $joinView.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        $("#closeJoin, #cancelJoin").click(function() {
            JoinView.close();
            resetJoinView();
        });

        $joinTableName.blur(function() {
            var tableName = $joinTableName.val().trim();
            if (tableName && /^ | $|[*#'"]/.test(tableName) === true) {
                // status box would get closed on blur event if no timeout
                setTimeout(function() {
                    StatusBox.show(ErrTStr.InvalidTableName, $joinTableName);
                }, 0);

                return;
            }
        });

        var joinTypeList = new MenuHelper($joinTypeSelect, {
            "onSelect": function($li) {
                var joinType = $li.text();
                $joinTypeSelect.find(".text").text(joinType);
                updatePreviewText();
                checkNextBtn();
            }
        });
        joinTypeList.setupListeners();

        var leftTableList = new MenuHelper($leftTableDropdown, {
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $leftTableDropdown.find(".text");
                var originalText = $textBox.text();

                if (originalText !== tableName) {
                    // $tableNameText.text(tableName).data('id', tableId);
                    $textBox.text(tableName);
                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    $joinView.find('.leftClause').val("");
                    checkNextBtn();
                    updatePreviewText();
                } else {
                    return;
                }
            }
        });
        leftTableList.setupListeners();


        var rightTableList = new MenuHelper($rightTableDropdown, {
            "onSelect": function($li) {
                var tableName = $li.text();
                var $textBox = $rightTableDropdown.find(".text");
                var originalText = $textBox.text();

                if (originalText !== tableName) {
                    // $tableNameText.text(tableName).data('id', tableId);
                    $textBox.text(tableName);
                  
                    $li.siblings().removeClass('selected');
                    $li.addClass('selected');
                    $joinView.find('.rightClause').val("");  
                    checkNextBtn();
                    updatePreviewText();
                } else {
                    return;
                }
            }
        });
        rightTableList.setupListeners();


        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();
            submitJoin();    
        });

        // toggle keep tables
        $joinView.find('.keepTablesCBWrap').click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // add multi clause
        $clauseContainer.on("click", ".placeholder", function() {
            addClause($(this));
        });

        // delete multi clause
        $clauseContainer.on("click", ".joinClause .middleIcon", function() {
            var $joinClause = $(this).closest(".joinClause");
            if ($joinClause.hasClass("placeholder")) {
                return;
            } else {
                $joinClause.slideUp(100, function() {
                    $joinClause.remove();
                    updatePreviewText();
                    checkNextBtn();
                    // reset estimator if removing a filled input
                    if ($joinClause.find('.leftClause').val().trim() !== ""  ||
                        $joinClause.find('.leftClause').val().trim() !== "") {
                        isNextNew = true;
                    } 
                });
            }
        });

        $joinView.on('focus', '.clause', function() {
            $lastInputFocused = $(this);
        });
        $joinView.on('input', '.clause', function() {
            updatePreviewText();
            checkNextBtn();
            isNextNew = true;
        });
        $joinView.on('change', '.clause', function() {
            updatePreviewText();
            checkNextBtn();
            isNextNew = true;
        });

        $joinView.find('.columnsWrap').on('click', 'li', function() {
            var $li = $(this);
            var $checkbox = $li.find('.checkbox');
            
            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $li.removeClass('checked');
                if ($li.siblings('.checked').length === 0) {
                    if ($li.closest('ul').hasClass('leftCols')) {
                        $joinView.find('.leftColHeading .selectAll').removeClass('checked');
                    } else {
                        $joinView.find('.rightColHeading .selectAll').removeClass('checked');
                    }
                }
            } else {
                $checkbox.addClass('checked');
                $li.addClass('checked');
            }

        });

        $joinView.find('.selectAll').on('click', function() {
            var $checkbox = $(this);
            var index = $joinView.find('.selectAll').index($checkbox);
            var $cols = $joinView.find('.columnsWrap ul').eq(index);
            
            if ($checkbox.hasClass('checked')) {
                $checkbox.removeClass('checked');
                $cols.find('li').removeClass('checked')
                     .find('.checkbox').removeClass('checked');
               
            } else {
                $checkbox.addClass('checked');
                 $cols.find('li').addClass('checked')
                      .find('.checkbox').addClass('checked');
            }
        });

        // smart suggest button
        $joinView.find('.smartSuggest').click(function() {
            var $inputToCheck;
            var $inputToFill;
            var isLeftTableVal = false;
            var $suggErrorArea = $(this).siblings(".suggError");
            // var $suggErrorArea = $(this);
            if (hasValidTableNames()) {
                
                $joinView.find('.joinClause:not(.placeholder)').each(function() {
                    var $row = $(this);
                    
                    if ($row.find('.arg').eq(0).val().trim() !== "" && 
                        $row.find('.arg').eq(1).val().trim() === "") {
                        $inputToCheck = $row.find('.arg').eq(0);
                        isLeftTableVal = true;
                    } else if ($row.find('.arg').eq(1).val().trim() !== "" && 
                        $row.find('.arg').eq(0).val().trim() === "") {
                        $inputToCheck = $row.find('.arg').eq(1);
                    }
                    if ($inputToCheck) {

                        return false; // exit .each loop
                    }
                });

                if ($inputToCheck) {
                    var tableName;
                    var otherTableName;
                    if (isLeftTableVal) {
                        tableName = $leftTableDropdown.find('.text').text();
                        otherTableName = $rightTableDropdown.find('.text').text();
                    } else {
                        tableName = $rightTableDropdown.find('.text').text();
                        otherTableName = $leftTableDropdown.find('.text').text();
                    }
                    var tableId = xcHelper.getTableId(tableName);
                    var suggTableId = xcHelper.getTableId(otherTableName);
                    var $inputToFill = $inputToCheck.siblings('.arg');

                        // tableId is the left table
                    // $th is the left table
                    // $suggSection is the right table
                    // suggTableId is the right table
                    var isFind = suggestJoinKey(tableId, $inputToCheck.val().trim(),
                                            $inputToFill, suggTableId);

                     if (!isFind) {
                        text = isLeftTableVal ? JoinTStr.NoMatchRight :
                                                JoinTStr.NoMatchLeft;
                        showErrorTooltip($suggErrorArea, {
                            "title"    : text,
                            "placement": "right",
                            "animation": "true",
                            "container": "body",
                            "trigger"  : "manual",
                            "template" : TooltipTemplate.Error
                        });
                    }
                } else {
                    showErrorTooltip($suggErrorArea, {
                        "title"    : 'No available column names to check',
                        "placement": "right",
                        "animation": "true",
                        "container": "body",
                        "trigger"  : "manual",
                        "template" : TooltipTemplate.Error
                    });
                }
            } else {
                // no table selected in dropdown
                showErrorTooltip($suggErrorArea, {
                    "title"    : 'Select a left and right table first',
                    "placement": "right",
                    "animation": "true",
                    "container": "body",
                    "trigger"  : "manual",
                    "template" : TooltipTemplate.Error
                });
            }
            
            checkNextBtn();
            updatePreviewText();
        });
    };

    JoinView.restore = function() {
        var keepJoinTables = UserSettings.getPref('keepJoinTables');
        if (keepJoinTables) {
            $joinView.find('.keepTablesCBWrap .checkbox').addClass('checked');
        }
    };

    JoinView.show = function(tableId, colNum, restore) {
        $('#workspaceMenu').find('.menuSection:not(.xc-hidden)').addClass('lastOpened');
        $('#workspaceMenu').find('.menuSection').addClass('xc-hidden');
        $joinView.removeClass('xc-hidden');
        if (!MainMenu.isMenuOpen("mainMenu")) {
            MainMenu.open();
        } else {
            BottomMenu.close(true);
        }
        
        if (!restore) {
            resetJoinView();
            fillTableLists(tableId); 
            updatePreviewText();
            addClause($joinView.find('.placeholder'), true, tableId, colNum);
        }

        $("body").on("keypress.joinModal", function(event) {
            switch (event.which) {
                case keyCode.Enter:
                    // when focus on a button, no trigger
                    if (modalHelper.checkBtnFocus()) {
                        break;
                    }
                    $('#joinTables').click();
                    break;
                default:
                    break;
            }
        });
        $("body").on("mouseup.joinModal", function() {
            $("#moveCursor").remove();
        });


        columnPickers();
    };

    JoinView.close = function() {
        $joinView.addClass('xc-hidden');
        $('#workspaceMenu').find('.menuSection.lastOpened')
                           .removeClass('lastOpened xc-hidden'); 
        // modalHelper.clear();
        $("body").off(".joinModal");
        $('.xcTable').off('click.columnPicker').removeClass('columnPicker');
        $lastInputFocused = null;
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    };

    function toggleNextView() {
        if ($joinView.hasClass('nextStep')) {
            // go to step 1
            $joinView.removeClass('nextStep');
        } else {
            // go to step 2
            if (checkFirstView()) {
                if (isNextNew) {
                    estimateJoinSize();
                    displayAllColumns();
                    isNextNew = false;
                }  

                $joinView.addClass('nextStep');
                if ($joinTableName.val().trim() === "") {
                    $joinTableName.focus();
                }
            } else {
               // checkfirstview is handling errors 
            }
        }
        $joinView.scrollTop(0);
    }

    function checkFirstView() {
        var joinType = $joinTypeSelect.find(".text").text();
        var newTableName = newTableName + Authentication.getHashId();


        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
                return true;
            } else if (!(lClause === "" && rClause === "")){
                $invalidClause = $joinClause;
                return false;   // stop loop
            }
        });

        if ($invalidClause != null || lCols.length === 0) {
            invalidMultiCaluseTooltip($invalidClause);
            return false;
        }

        var validTypes = ['integer', 'float', 'string', 'float'];
        var tableIds = getTableIds();
        var leftColRes = xcHelper.convertFrontColNamesToBack(lCols, tableIds[0],
                                                    validTypes);

        // xx need to refactor below 
    
        if (leftColRes.invalid) {
            var errorTitle;
            var errorText;
            var $input = 
                $clauseContainer.find('.joinClause .leftClause').filter(function() {
                    return ($(this).val() === leftColRes.name);
                }).eq(0);
            if (leftColRes.reason === 'notFound') {

                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                    "name": leftColRes.name
                });
            } else if (leftColRes.reason === 'type') {
                errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                    "name": leftColRes.name,
                    "type": leftColRes.type
                });
            }
            showErrorTooltip($input, {
                "title"    : errorText,
                "placement": "top",
                "animation": "true",
                "container": "body",
                "trigger"  : "manual",
                "template" : TooltipTemplate.Error
            });
            return false;
        } else {
            var rightColRes = xcHelper.convertFrontColNamesToBack(rCols, tableIds[1],
                                                    validTypes);
            if (rightColRes.invalid) {
                var errorTitle;
                var errorText;
                var $input = 
                    $clauseContainer.find('.joinClause .rightClause').filter(function() {
                        return ($(this).val() === rightColRes.name);
                    }).eq(0);
                if (rightColRes.reason === 'notFound') {

                    errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                        "name": rightColRes.name
                    });
                } else if (rightColRes.reason === 'type') {
                    errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                        "name": rightColRes.name,
                        "type": rightColRes.type
                    });
                }
                showErrorTooltip($input, {
                    "title"    : errorText,
                    "placement": "top",
                    "animation": "true",
                    "container": "body",
                    "trigger"  : "manual",
                    "template" : TooltipTemplate.Error
                });
                return false;
            } else {
                return true;
            }
        }

        return true
    }

    function estimateJoinSize() {
        var tableIds = getTableIds();
        var functionName = 'UExtDev::estimateJoin';
        var colNames = getClauseColNames();
        var colNum = gTables[tableIds[0]].getColNumByBackName(colNames[0][0]);

        var argList = {
            leftLimit: 100,
            rightLimit: 100,
            lCol: colNames[0],
            rCol: colNames[1],
            rTable: gTables[tableIds[1]].tableName
        };

        var $estimatorWrap = $joinView.find('.estimatorWrap');
        $estimatorWrap.find('.title').text(JoinTStr.EstimatingJoin + ':');
        $estimatorWrap.find('.value').empty();

        // xx handle canceling of estimateJoinSize

        ExtensionManager.trigger(colNum, tableIds[0], functionName, argList)
        .then(function(ret) {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.min .value').text(ret.minSum);
            $estimatorWrap.find('.med .value').text(ret.expSum);
            $estimatorWrap.find('.max .value').text(ret.maxSum);
        })
        .fail(function(error) {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.value').text('N/A');
        });
    }

    // generates all left and right table columns to keep
    function displayAllColumns() {
        var tableIds = getTableIds();
        var lHtml = getTableColList(tableIds[0]);
        var rHtml = getTableColList(tableIds[1]);
        $joinView.find('.leftCols').html(lHtml);
        $joinView.find('.rightCols').html(rHtml);
        $joinView.find('.selectAll').addClass('checked');
    }

    function hasValidTableNames() {
        var tableIds = getTableIds();
        return (gTables[tableIds[0]] && gTables[tableIds[1]]);
    }

    // returns array of 2 table ids
    function getTableIds() {
        var lTableName = $leftTableDropdown.find('.text').text();
        var rTableName = $rightTableDropdown.find('.text').text();
        var lTableId = xcHelper.getTableId(lTableName);
        var rTableId = xcHelper.getTableId(rTableName);
        return ([lTableId, rTableId]);
    }

    function hasColsAndTableNames() {
        if (hasValidTableNames()) {
            var columnPairs = [];
            var pair;
            var lClause;
            var rClause;

            $joinView.find(".joinClause:not(.placeholder)").each(function() {
                var $joinClause = $(this);
                lClause = $joinClause.find(".leftClause").val().trim();
                rClause = $joinClause.find(".rightClause").val().trim();
                pair = [lClause, rClause];
                columnPairs.push(pair);
            });

            var numPairs = columnPairs.length;
            var leftColText;
            var rightColText;
            var validColPairFound = false;

            for (var i = 0; i < numPairs; i++) {
                if ((columnPairs[i][0] && !columnPairs[i][1]) ||
                    (columnPairs[i][1] && !columnPairs[i][1])) {
                    validColPairFound = false;
                    break;
                }
                if (columnPairs[i][0] && columnPairs[i][1]) {
                    validColPairFound = true;
                }        
            }
            return (validColPairFound);
        } else {
            return (false);
        }
    }


    function getClauseColNames() {
        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lCols = [];
        var rCols = [];
        var lColNames = [];
        var rColNames = [];
        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
            }
        });

        var lTable = gTables[lTableId];
        for (var i = 0; i < lCols.length; i++) {
            var col = lTable.getColByFrontName(lCols[i]);
            lColNames[i] = col.backName;
        }

        var rTable = gTables[rTableId];
        for (var i = 0; i < rCols.length; i++) {
            var col = rTable.getColByFrontName(rCols[i]);
            rColNames[i] = col.backName;
        }
        return ([lColNames, rColNames]);
    }

    function checkNextBtn() {
        var $nextBtn = $joinView.find('.next');
        var isDisabled = $nextBtn.hasClass('btn-disabled');
        if (hasColsAndTableNames()) {
            $nextBtn.removeClass('btn-disabled');
            if (isDisabled) {
                isNextNew = true;
            }
        } else {
            $nextBtn.addClass('btn-disabled');
            if (!isDisabled) {
                isNextNew = true;
            }
        }
    }

    function getTableColList(tableId) {
        var html = "";
        var allCols = gTables[tableId].tableCols;
        for (var i = 0; i < allCols.length; i++) {
            if (allCols[i].type !== "newColumn" && allCols[i].backName !== "DATA") {
                html += '<li class="checked"><span class="text">' + allCols[i].name + 
                            '</span>' +
                            '<div class="checkbox checked">' +
                                '<i class="icon xi-ckbox-empty fa-13"></i>' +
                                '<i class="icon xi-ckbox-selected fa-13"></i>' +
                            '</div>' +
                        '</li>';
            }
        }
        return (html);
    }

    function columnPickers() {
        var $tables = $(".xcTable:visible").addClass('columnPicker');

        $tables.on('click.columnPicker', '.header, td.clickable', function(event) {
            if (!$lastInputFocused) {
                return;
            }
            var $target = $(event.target);
            if ($target.closest('.dataCol').length ||
                $target.closest('.jsonElement').length) {
                return;
            }
            xcHelper.fillInputFromCell($target, $lastInputFocused);
        });
    }

    function submitJoin() {
        // check validation
        // if submit is enabled, that means first view is already valid
        
        var newTableName = $joinTableName.val().trim();

        if (newTableName === "") {
            StatusBox.show(ErrTStr.NoEmpty, $joinTableName, true);
            return;
        }
        if (/^ | $|[*#'"]/.test(newTableName) === true) {
            StatusBox.show(ErrTStr.InvalidTableName, $joinTableName, true);
            return;
        }
        if (newTableName.length >=
            XcalarApisConstantsT.XcalarApiMaxTableNameLen) {
            StatusBox.show(ErrTStr.TooLong, $joinTableName, true);
            return;
        }

        var validTableName = xcHelper.checkDupTableName(newTableName);
        if (validTableName) {
            modalHelper.submit();
            var joinType = $joinTypeSelect.find(".text").text();
            var tabeName = newTableName + Authentication.getHashId();
            var isValid = joinSubmitHelper(joinType, tabeName);

            if (!isValid) {
                modalHelper.enableSubmit();
            }
        } else {
            StatusBox.show(ErrTStr.TableConflict, $joinTableName, true);
        }
    }

    function joinSubmitHelper(joinType, newTableName) {
        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
                return true;
            } else if (!(lClause === "" && rClause === "")){
                $invalidClause = $joinClause;
                return false;   // stop loop
            }
        });

        if ($invalidClause != null || lCols.length === 0) {
            invalidMultiCaluseTooltip($invalidClause);
            return false;
        }

        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lTable = gTables[lTableId];
        var rTable = gTables[rTableId];
        var lColNums = [];
        var rColNums = [];
        var $colLis;
        var lColsToKeep = [];
        var rColsToKeep = [];
        
        
        // set up "joining on" columns
        for (var i = 0; i < lCols.length; i++) {
            var col = lTable.getColByFrontName(lCols[i]);
            lColNums[i] = lTable.getColNumByBackName(col.backName) - 1;
        }
        
        for (var i = 0; i < rCols.length; i++) {
            var col = rTable.getColByFrontName(rCols[i]);
            rColNums[i] = rTable.getColNumByBackName(col.backName) - 1;
        }

        // set up "keeping" columns
        $colLis = $joinView.find('.leftCols li.checked');
        $colLis.each(function(i) {
            var name = $(this).text();
            var col = lTable.getColByFrontName(name);
            lColsToKeep[i] = col.backName;
        });


        $colLis = $joinView.find('.rightCols li.checked');
        $colLis.each(function(i) {
            var name = $(this).text();
            var col = rTable.getColByFrontName(name);
            rColsToKeep[i] = col.backName;
        });


        var options = {
            keepTables: $joinView.find('.keepTablesCBWrap')
                                  .find('.checkbox').hasClass('checked'),
            keepLeftCols: lColsToKeep,
            keepRightCols: rColsToKeep
        };

        JoinView.close();
        xcFunction.join(lColNums, lTableId, rColNums, rTableId, joinType,
                        newTableName, options);
        
        return true;
    }

    function addClause($placeholder, noAnimation, tableId, colNum) {
        var $div = $(multiClauseTemplate).insertBefore($placeholder);
        if (tableId) {
           var colName = gTables[tableId].tableCols[colNum - 1].name;
            $div.find('.arg').eq(0).val(colName); 
        } else {
            $div.find('.arg').eq(0).focus();
        }
        
        if (!noAnimation) {
            $div.hide().slideDown(100);
        }
    }

    function getColNum($table, colName) {
        var $colTab = $table.find(".columnTab").filter(function() {
            return ($(this).find(".text").text() === colName);
        });

        var colNum = xcHelper.parseColNum($colTab.closest("th")) - 1;

        return (colNum);
    }


    function resetJoinView() {
        $clauseContainer.find(".joinClause:not(.placeholder)").remove();
        $clauseContainer.find('.clause').val("");
        $joinView.find('.next').addClass('btn-disabled');
        $rightTableDropdown.find('.text').empty();
        isNextNew = true;

        updatePreviewText();
        $joinView.removeClass('nextStep');
        updateJoinTableName();
    }

    function updateJoinTableName() {
        var joinTableName = "";
        $joinTableName.val(joinTableName);
    }

    function fillTableLists(origTableId) {
        var wsOrders = WSManager.getOrders();
        var tableLis = "";
        // group table tab by worksheet (only show active table)
        for (var i = 0, len = wsOrders.length; i < len; i++) {
            var wsId = wsOrders[i];
            var ws = WSManager.getWSById(wsId);
            var wsTables = ws.tables;

            for (var j = 0; j < wsTables.length; j++) {
                var tableId = wsTables[j];
                var table = gTables[tableId];
                if (j === 0 && wsOrders.length > 1) {
                    tableLis += '<div class="sectionLabel">' +
                                    ws.name +
                                '</div>';
                }

                tableLis += '<li data-ws="' + wsId + '" data-id="' +
                            tableId + '">' +
                                table.getName() +
                            '</li>';
            }
        }

        $leftTableDropdown.find('ul').html(tableLis);
        $rightTableDropdown.find('ul').html(tableLis);

        // select li and fill left table name dropdown
        var tableName = gTables[origTableId].getName();
        $leftTableDropdown.find('.text').text(tableName);
        $leftTableDropdown.find('li').filter(function() {
            return ($(this).text() === tableName)
        }).addClass('selected');
    }

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    function noJoinTooltip($th, isLeft) {
        var $colPadding = $th.find(".colPadding");
        var id = isLeft ? "#leftJoin" : "#rightJoin";
        var title = xcHelper.replaceMsg(JoinTStr.NoJoin, {
            "type": getType($th)
        });

        showErrorTooltip($colPadding, {
            "title"    : title,
            "placement": "top",
            "animation": "true",
            "container": id,
            "trigger"  : "manual",
            "template" : TooltipTemplate.Error
        });
    }

    function noJoinKeyTooltip(isLeft) {
        var id = isLeft ? "#leftJoin" : "#rightJoin";
        var $tab = $(id).find(".joinTableList");
        var title = isLeft ? JoinTStr.NoKeyLeft : JoinTStr.NoKeyRight;
        showErrorTooltip($tab, {
            "title"    : title,
            "placement": "top",
            "animation": "true",
            "container": id,
            "trigger"  : "manual",
            "template" : TooltipTemplate.Error
        });
    }

    function invalidMultiCaluseTooltip($invalidClause) {
        var id = "#multiJoin";
        var title = JoinTStr.InvalidClause;
        if ($invalidClause == null) {
            // when no clause to join
            $invalidClause = $clauseContainer.find(".joinClause").eq(0);
        }

        showErrorTooltip($invalidClause, {
            "title"    : title,
            "placement": "top",
            "animation": "true",
            "container": id,
            "trigger"  : "manual",
            "template" : TooltipTemplate.Error
        });
    }

    var tooltipTimer;

    function showErrorTooltip($el, options) {
        $el.tooltip("destroy");
        clearTimeout(tooltipTimer);
        $(".tooltip").hide();
        $el.tooltip(options);
        $el.tooltip("show");
        tooltipTimer = setTimeout(function() {
            $el.tooltip("destroy");
        }, 2000);
    }

    function suggestJoinKey(tableId, val, $inputToFill, suggTableId) {
        var tableCols = gTables[tableId].tableCols;
        var col = gTables[tableId].getColByFrontName(val);
        var type = col.type;
        var backColName = col.backName;
        var frontColName = col.name;
        var colNum = gTables[tableId].getColNumByBackName(backColName);

        var context1 = contextCheck($('#xcTable-' + tableId), colNum, type);

        var $thToClick;
        var tableIdToClick;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = -50;

        var $suggTable = $('#xcTable-' + suggTableId);
        $suggTable.find(".header").each(function(index) {
            var $curTh = $(this);

            if (index !== 0 && !$curTh.hasClass('dataCol') && getType($curTh) === type) {
                var context2 = contextCheck($suggTable, index, type);

                var curColName = $curTh.find(".editableHead").val();
                var dist = getTitleDistance(frontColName, curColName);
                var score = getScore(context1, context2, dist, type);

                if (score > maxScore) {
                    maxScore = score;
                    $thToClick = $curTh;
                    tableIdToClick = suggTableId;
                }
            }
        });


        // if find the suggeest join key
        if (tableIdToClick != null) {

            var suggColName = $thToClick.find('.editableHead').val();
            $inputToFill.val(suggColName);

            return true;
        }

        return false;
    }

    function getScore(context1, context2, titleDist, type) {
        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative

        var score   = 0;
        var bucket  = {};
        var bucket2 = {};
        var match   = 0;

        if (type === "string") {
            // Note: current way is hash each char and count frequency
            // change it if you have better way!
            context1.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket[value.charAt(i)] = true;
                }
            });

            context2.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket2[value.charAt(i)] = true;
                }
            });

            for (var c in bucket2) {
                if (bucket.hasOwnProperty(c)) {
                    if (/\W/.test(c)) {
                        // special char, high weight
                        match += 10;
                    } else {
                        match += 1;
                    }
                }
            }

            if (match === 0) {
                // no match
                return (-Number.MAX_VALUE);
            }

            // for string compare absolute value
            score += match * 3;
            score += Math.abs(context1.max - context2.max) * -1;
            score += Math.abs(context1.min - context2.min) * -1;
            score += Math.abs(context1.avg - context2.avg) * -2;
            score += Math.abs(context1.sig2 - context2.sig2) * -5;
            score += titleDist * -7;
        } else {
            // a base score for number,
            // since limit score to pass is -50
            match = 20;

            // for number compare relative value
            score += match * 3;
            score += calcSim(context1.max, context2.max) * -8;
            score += calcSim(context1.min, context2.min) * -8;
            score += calcSim(context1.avg, context2.avg) * -16;
            score += calcSim(context1.sig2, context2.sig2) * -40;
            score += titleDist * -7;
        }
        return score;
    }

    function calcSim(a, b) {
        var diff = a - b;
        var sum = a + b;

        if (sum === 0) {
            if (diff === 0) {
                // when a === 0 and b === 0
                return 0;
            } else {
                // a = -b, one is positive and one num is negative
                // no similarity
                return 1;
            }
        }
        // range is [0, 1), more close to 0, similar
        return Math.abs(diff / sum);
    }


    function contextCheck($table, colNum, type) {
        // only check number and string
        if (type !== "integer" && type !== "float" && type !== "string") {
            return {"max": 0, "min": 0, "total": 0, "variance": 0};
        }

        var max = Number.MIN_VALUE;
        var min = Number.MAX_VALUE;
        var total = 0;
        var datas = [];
        var values = [];
        var val;

        $table.find("td.col" + colNum).each(function() {
            $textDiv = $(this).find(".originalData");
            val = $textDiv.text();

            var d;

            if (type === "string") {
                if (val == null || val === "") {
                    // skip empty value
                    return;
                }
                d = val.length; // for string, use its length as metrics
            } else {
                d = Number(val);
            }

            values.push(val);
            datas.push(d);
            max = Math.max(d, max);
            min = Math.min(d, min);
            total += d;
        });

        var count = datas.length;
        var avg = total / count;
        var sig2 = 0;

        for (var i = 0; i < count; i++) {
            sig2 += Math.pow((datas[i] - avg), 2);
        }

        return {
            "max" : max,
            "min" : min,
            "avg" : avg,
            "sig2": sig2,
            "vals": values
        };
    }

    function getTitleDistance(name1, name2) {
        if (name1.startsWith("column") || name2.startsWith("column")) {
            // any column has auto-generate column name, then do not check
            return 0;
        }

        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();

        if (name1 === name2) {
            // same name
            return 0;
        } else if (name1.startsWith(name2) || name2.startsWith(name1)) {
            // which means the name is quite related
            return 2;
        }

        var distArray = levenshteinenator(name1, name2);
        var len = distArray.length;
        var dist = distArray[len - 1][distArray[len - 1].length - 1];

        return (dist);

        // http://andrew.hedges.name/experiments/levenshtein/levenshtein.js
        /**
         * @param String a
         * @param String b
         * @return Array
         */
        function levenshteinenator(a, b) {
            var cost;
            var m = a.length;
            var n = b.length;

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever that is
            if (m < n) {
                var c = a; a = b; b = c;
                var o = m; m = n; n = o;
            }

            var r = []; r[0] = [];
            for (var c = 0; c < n + 1; ++c) {
                r[0][c] = c;
            }

            for (var i = 1; i < m + 1; ++i) {
                r[i] = []; r[i][0] = i;
                for ( var j = 1; j < n + 1; ++j ) {
                    cost = a.charAt( i - 1 ) === b.charAt( j - 1 ) ? 0 : 1;
                    r[i][j] = minimator(r[i - 1][j] + 1, r[i][j - 1] + 1,
                                        r[i - 1][j - 1] + cost);
                }
            }

            return r;
        }

        /**
         * Return the smallest of the three numbers passed in
         * @param Number x
         * @param Number y
         * @param Number z
         * @return Number
         */
        function minimator(x, y, z) {
            if (x < y && x < z) {
                return x;
            }
            if (y < x && y < z) {
                return y;
            }
            return z;
        }
    }


    function updatePreviewText() {
        var joinType = $joinTypeSelect.find(".text").text();
        var lTableName = $leftTableDropdown.find(".text").text();
        var rTableName = $rightTableDropdown.find(".text").text();
        var previewText = '<span class="joinType keyword">' + joinType +
                          '</span> <span class="highlighted">' + lTableName +
                          '</span>, <span class="highlighted">' + rTableName +
                          '</span><br/><span class="keyword">ON </span>';
        var columnPairs = [];
        var pair;
        var lClause;
        var rClause;

        $joinView.find(".joinClause:not(.placeholder)").each(function() {

            var $joinClause = $(this);
            lClause = $joinClause.find(".leftClause").val().trim();
            rClause = $joinClause.find(".rightClause").val().trim();
            pair = [lClause, rClause];
            columnPairs.push(pair);
        });


        var numPairs = columnPairs.length;
        var leftColText;
        var rightColText;

        for (var i = 0; i < numPairs; i++) {
            if (columnPairs[i][0]) {
                leftColText = '<span class="highlighted">' + columnPairs[i][0] +
                              '</span>';
            } else {
                leftColText = "\"\"";
            }
            if (columnPairs[i][1]) {
                rightColText = '<span class="highlighted">' + columnPairs[i][1] +
                              '</span>';
            } else {
                rightColText = "\"\"";
            }
            if (columnPairs[i][0] || columnPairs[i][1]) {
                if (i > 0) {
                    previewText += '<span class="keyword"><br/>AND </span>';
                }
                previewText += leftColText + ' = ' + rightColText;
                            
            }
        }
        previewText += ";";
        $joinView.find('.joinPreview').html(previewText);
    }

    return (JoinView);
}(jQuery, {}));
