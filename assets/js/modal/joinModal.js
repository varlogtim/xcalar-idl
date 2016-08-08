window.JoinModal = (function($, JoinModal) {
    var $mainJoin;       // $("#mainJoin")
    var $joinModal;      // $("#joinModal")
    var $joinView;      // $("#joinView")
    var $tableDropDown;  // $mainJoin.find('.joinTableList')
    var $leftTableDropdown;  // $('#joinLeftTableList');
    var $rightTableDropdown;  // $('#joinRightTableList');

    var $joinSelect;     // $("#joinType")

    var $joinTableName;  // $("#joinTableNameInput")
    var $leftJoinTable;  // $("#leftJoin")
    var $rightJoinTable; // $("#rightJoin")

    var $multiJoinBtn;   // $("#multiJoinBtn")
    var $multiJoin;      // $("#multiJoin")
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

    JoinModal.setup = function () {
        $mainJoin = $("#mainJoin");
        // $joinModal = $("#joinModal");
        $joinModal = $("#joinView");
        $joinView = $("#joinView");
        $tableDropDown = $mainJoin.find('.joinTableList');
        $leftTableDropdown = $('#joinLeftTableList');
        $rightTableDropdown = $('#joinRightTableList');
        $joinSelect = $("#joinType");
        $joinTableName = $("#joinTableNameInput");
        $leftJoinTable = $("#leftJoin");
        $rightJoinTable = $("#rightJoin");
        $multiJoinBtn = $("#multiJoinBtn");
        $multiJoin = $("#multiJoin");

        // constant
        var minHeight = 600;
        var minWidth  = 800;

        modalHelper = new ModalHelper($joinModal, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        
        $joinView.find('.cancel, .close').on('click', function() {
            closeJoinView();
        });

        $joinView.find('.next, .back').click(function() {
            toggleNextView();
        });

        $joinModal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        $("#closeJoin, #cancelJoin").click(function() {
            closeJoinView();
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

        var joinTypeList = new MenuHelper($joinSelect, {
            "onSelect": function($li) {
                var joinType = $li.text();
                $joinSelect.find(".text").text(joinType);
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
        $joinModal.find('.keepTablesCBWrap').click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        // add multi clause
        $multiJoin.on("click", ".placeholder", function() {
            addClause($(this));
        });

        // delete multi clause
        $multiJoin.on("click", ".joinClause .middleIcon", function() {
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

        addModalTabListeners($leftJoinTable, true);
        // addModalTabListeners($rightJoinTable, false);
    };

    JoinModal.restore = function() {
        var keepJoinTables = UserSettings.getPref('keepJoinTables');
        if (keepJoinTables) {
            $joinModal.find('.keepTablesCBWrap .checkbox').addClass('checked');
        }
    };

    JoinModal.show = function(tableId, colNum, restore) {
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

    JoinModal.close = function() {
        closeJoinView();
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
        var joinType = $joinSelect.find(".text").text();
        var newTableName = newTableName + Authentication.getHashId();


        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
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
                $multiJoin.find('.joinClause .leftClause').filter(function() {
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
                    $multiJoin.find('.joinClause .rightClause').filter(function() {
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
        $estimatorWrap.find('.title').text('Estimating join size...');
        $estimatorWrap.find('.value').empty();

        ExtensionManager.trigger(colNum, tableIds[0], functionName, argList)
        .then(function(ret) {
            $joinView.find('.estimatorWrap .title').text('Estimated join size:');
            $estimatorWrap.find('.min .value').text(ret.minSum);
            $estimatorWrap.find('.med .value').text(ret.expSum);
            $estimatorWrap.find('.max .value').text(ret.maxSum);
        })
        .fail(function(error) {
            $joinView.find('.estimatorWrap .title').text('Estimated join size:');
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
         $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
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


    function multiClauseOpener() {
        var leftClause  = "";
        var rightClause = "";

        var $leftSelectedCol  = $leftJoinTable.find("th.colSelected");
        var $rightSelectedCol = $rightJoinTable.find("th.colSelected");

        if ($leftSelectedCol.length > 0) {
            leftClause = $leftSelectedCol.text();
        }

        if ($rightSelectedCol.length > 0) {
            rightClause = $rightSelectedCol.text();
        }

        var $multiClause = $(multiClauseTemplate);

        $multiClause.find(".leftClause").val(leftClause);
        $multiClause.find(".rightClause").val(rightClause);

        $multiJoin.find(".joinClause.placeholder").before($multiClause);
    }

    function multiClauseCloser() {
        var lCols = [];
        var rCols = [];

        $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "") {
                lCols.push(lClause);
            }

            if (rClause !== "") {
                rCols.push(rClause);
            }
        });

        if (lCols.length <= 1 && rCols.length <= 1) {
            // only when left Clause and rightClause has less that 1 column,
            // then do the rehighlight
            if (lCols.length === 1) {
                var lTableId = $leftJoinTable.find(".joinTableList .text").data("id");
                highlightColumn(lTableId, lCols[0], true);
            }

            if (rCols.length === 1) {
                var rTableId = $rightJoinTable.find(".joinTableList .text").data("id");
                highlightColumn(rTableId, rCols[0], false);
            }
            return;
        }

        updatePreviewText();

        function highlightColumn(tableId, colName, isLeft) {
            var $container = isLeft ? $leftJoinTable : $rightJoinTable;
            var $table = $container.find(".joinTable").filter(function() {
                return $(this).data("id") === tableId;
            });

            var $th = $table.find("th").filter(function() {
                return $(this).find(".columnTab .text").text() === colName;
            });

            if ($th.length > 0) {
                $th.click();
                // XXX Not sure we should scroll or not
                // scrollToColumn($th);
            }
        }
    }

    // function checkFirstView() {
    //     var joinType = $joinSelect.find(".text").text();
    //     var newTableName = newTableName + Authentication.getHashId();


    //     var lCols = [];
    //     var rCols = [];
    //     var $invalidClause = null;

    //     // check validation
    //     $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
    //         var $joinClause = $(this);
    //         var lClause = $joinClause.find(".leftClause").val().trim();
    //         var rClause = $joinClause.find(".rightClause").val().trim();

    //         if (lClause !== "" && rClause !== "") {
    //             lCols.push(lClause);
    //             rCols.push(rClause);
    //             return true;
    //         } else if (!(lClause === "" && rClause === "")){
    //             $invalidClause = $joinClause;
    //             return false;   // stop loop
    //         }
    //     });

    //     if ($invalidClause != null || lCols.length === 0) {
    //         invalidMultiCaluseTooltip($invalidClause);
    //         return false;
    //     } else {
    //         return true;
    //     }
    // }

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
            var joinType = $joinSelect.find(".text").text();
            var tabeName = newTableName + Authentication.getHashId();
            var isValid = multiJoinHelper(joinType, tabeName);

            if (!isValid) {
                modalHelper.enableSubmit();
            }
        } else {
            StatusBox.show(ErrTStr.TableConflict, $joinTableName, true);
        }
    }

    function singleJoinHelper(joinType, newTableName) {
        var $leftCol = $leftJoinTable.find("th.colSelected");
        var lColNum  = xcHelper.parseColNum($leftCol) - 1;
        var lTableId = $leftCol.closest(".joinTable").data("id");

        var $rightCol = $rightJoinTable.find('th.colSelected');
        var rColNum   = xcHelper.parseColNum($rightCol) - 1;
        var rTableId  = $rightCol.closest(".joinTable").data("id");

        var lCol = gTables[lTableId].getCol(lColNum + 1);
        var rCol = gTables[rTableId].getCol(rColNum + 1);

        if (lCol.isNumberCol() && rCol.isNumberCol() ||
            lCol.getType() === rCol.getType()) {
            resetJoinTables();
            var options = {
                keepTables: $joinModal.find('.keepTablesCBWrap')
                                      .find('.checkbox').hasClass('checked')
            };
            xcFunction.join([lColNum], lTableId, [rColNum], rTableId,
                            joinType, newTableName, options);
            return true;
        } else {
            showErrorTooltip($rightCol.find(".colPadding"), {
                "title"    : JoinTStr.TypeMistch,
                "placement": "top",
                "animation": "true",
                "container": "#rightJoin",
                "trigger"  : "manual",
                "template" : TooltipTemplate.Error
            });

            return false;
        }
    }

    function multiJoinHelper(joinType, newTableName) {
        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
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

        // left table
        var $lTText = $leftJoinTable.find(".joinTableList .text");
        var lTableId = $lTText.data('id');
        var $lTable  = $leftJoinTable.find('.joinTable[data-id="' +
                                            lTableId + '"]');

        // right table
        var $rTText = $rightJoinTable.find(".joinTableList .text");
        var rTableId = $rTText.data('id');
        var $rTable  = $rightJoinTable.find('.joinTable[data-id="' +
                                                rTableId + '"]');


        var lTableName = $leftTableDropdown.find('.text').text();
        var rTableName = $rightTableDropdown.find('.text').text();
        var lTableId = xcHelper.getTableId(lTableName);
        var rTableId = xcHelper.getTableId(rTableName);

        var lColNums = [];
        var rColNums = [];
        
        
        // set up "joining on" columns
        var lTable = gTables[lTableId];
        for (var i = 0; i < lCols.length; i++) {
            var col = lTable.getColByFrontName(lCols[i]);
            lColNums[i] = lTable.getColNumByBackName(col.backName) - 1;
        }

        var rTable = gTables[rTableId];
        for (var i = 0; i < rCols.length; i++) {
            var col = rTable.getColByFrontName(rCols[i]);
            rColNums[i] = rTable.getColNumByBackName(col.backName) - 1;
        }

        // set up "keeping" columns
        var $colLis = $joinView.find('.leftCols li.checked');
        var keepLeftCols = [];
        $colLis.each(function(i) {
            var name = $(this).text();
            var col = lTable.getColByFrontName(name);
            // keepLeftCols[i] = rTable.getColNumByBackName(col.backName);
            keepLeftCols[i] = col.backName;
        });


        $colLis = $joinView.find('.rightCols li.checked');
        var keepRightCols = [];
         $colLis.each(function(i) {
            var name = $(this).text();
            var col = rTable.getColByFrontName(name);
            // keepLeftCols[i] = rTable.getColNumByBackName(col.backName);
            keepRightCols[i] = col.backName;
        });


        var options = {
            keepTables: $joinView.find('.keepTablesCBWrap')
                                  .find('.checkbox').hasClass('checked'),
            keepLeftCols: keepLeftCols,
            keepRightCols: keepRightCols
        };
        xcFunction.join(lColNums, lTableId, rColNums, rTableId,
                        joinType, newTableName, options);
        closeJoinView();
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

    function closeJoinView() {
        $joinView.addClass('xc-hidden');
        $('#workspaceMenu').find('.menuSection.lastOpened')
                           .removeClass('lastOpened xc-hidden'); 
        // modalHelper.clear();
        $("body").off(".joinModal");
        $('.xcTable').off('click.columnPicker').removeClass('columnPicker');
        $lastInputFocused = null;
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    }

    function resetJoinView() {
        $multiJoin.find(".joinClause:not(.placeholder)").remove();
        $multiJoin.find('.clause').val("");
        $joinView.find('.next').addClass('btn-disabled');
        $rightTableDropdown.find('.text').empty();
        isNextNew = true;

        updatePreviewText();
        $joinView.removeClass('nextStep');
        updateJoinTableName();
    }

    // xx xi2 to remove
    function resetJoinTables() {
        modalHelper.clear();
        $("body").off(".joinModal");
        $('.xcTable').off('click.columnPicker').removeClass('columnPicker');
        $lastInputFocused = null;

        // clean up multi clause section

        // $multiJoinBtn.find(".active").removeClass("active")
        //             .end()  // back to $("#multiJoinBtn")
        //             .find(".offBox").addClass("active");
        $multiJoin.find(".placeholder").siblings().remove();

        // $tableDropDown.find('.text').text("").data('id', "").end()
        //               .find('ul').empty();
        // $joinModal.find('.joinTable').remove();
        
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
        var tableName = gTables[origTableId].getName();
        $leftTableDropdown.find('.text').text(tableName);
        $leftTableDropdown.find('li').filter(function() {
            return ($(this).text() === tableName)
        }).addClass('selected');
    }


    function joinModalHTMLHelper($modal) {
        var $columnArea = $modal.find(".joinTableArea");
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
                appendColHTML(tableId, table.tableCols);
            }
        }

        $joinModal.find('.joinTableList').eq(1).find('ul').html(tableLis);


        function appendColHTML(id, tableCols) {
            var colHtml = '<table class="dataTable joinTable" ' +
                            'data-id="' + id + '">' +
                            '<thead>' +
                                '<tr>';

            for (var t = 0; t < tableCols.length; t++) {
                var colName = tableCols[t].name;

                if (colName === "DATA") {
                    continue;
                }

                var type = tableCols[t].type;
                var thClass = "col" + (t + 1) + " type-" + type;

                if (type === "object" || type === "undefined") {
                    thClass += " unselectable";
                }

                colHtml += '<th class="' + thClass + '">' +
                                '<div class="colPadding"></div>' +
                                '<div class="columnTab">' +
                                    '<div class="iconWrap">' +
                                        '<span class="icon"></span>' +
                                    '</div>' +
                                    '<div title="' + colName + '"' +
                                    ' data-container="body"' +
                                    ' data-toggle="tooltip"' +
                                    ' data-placement="top"' +
                                    ' class="text textOverflowOneLine' +
                                    ' tooltipOverflow">' +
                                        colName +
                                    '</div>' +
                                '</div>' +
                            '</th>';
            }

            colHtml += '</tr></thead>';

            var $tbody = $('#xcTable-' + id).find('tbody').clone(true);

            $tbody.find('tr:gt(14)').remove();
            $tbody.find('.col0').remove();
            $tbody.find('.jsonElement').remove();
            $tbody.find('.indexedColumn').removeClass('indexedColumn');
            $tbody.find(".tdText.clickable").removeClass("clickable");
            $tbody.find(".selectedCell").removeClass("selectedCell");

            colHtml += ($tbody.html() || "");
            colHtml += '</table>';

            $columnArea.append(colHtml);
        }
    }

    function addModalTabListeners($modal, isLeft) {

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

        // $modal.on("click", ".smartSuggest", function() {
        //     $(".tooltip").hide();
        //     var $btn = $(this).blur();
        //     var $suggErrorArea = $btn.siblings(".suggError");
        //     var $checkSection = isLeft ? $rightJoinTable :
        //                                  $leftJoinTable; // check section is the section we're searching in
        //     var $tableText = $checkSection.find('.joinTableList .text');  // the section we're searching in
        //     var text;

        //     if ($tableText.text() !== "") {
        //         var tableId = $tableText.data("id");
        //         var $th = $checkSection.find('.joinTable[data-id="' + tableId +
        //                                 '"] th.colSelected');  // selected col in the section we're searching in
        //         if ($th.length > 0) {
        //             var $suggSection = isLeft ? $leftJoinTable :
        //                                         $rightJoinTable; // the section we have a column in
        //             var $suggTableText = $suggSection.find('.joinTableList .text'); // the name of the table we're searching in
        //             if ($suggTableText.text() === "") {
        //                 console.error("Error, none of the lable is active!");
        //                 return;
        //             }

        //             var suggTableId = $suggTableText.data("id");  
        //                   // tableId is the right table
        //             // $th is the right table
        //             // $suggSection is the left table
        //             // suggTableId is the left table
        //             var isFind = suggestJoinKey(tableId, $th,
        //                                         $suggSection, suggTableId);

        //             if (!isFind) {
        //                 text = isLeft ? JoinTStr.NoMatchRight :
        //                                 JoinTStr.NoMatchLeft;
        //                 showErrorTooltip($suggErrorArea, {
        //                     "title"    : text,
        //                     "placement": "left",
        //                     "animation": "true",
        //                     "container": "#" + $modal.attr("id"),
        //                     "trigger"  : "manual",
        //                     "template" : TooltipTemplate.Error
        //                 });
        //             }
        //         } else {
        //             text = isLeft ? JoinTStr.NoKeyRight :
        //                             JoinTStr.NoKeyLeft;
        //             showErrorTooltip($suggErrorArea, {
        //                 "title"    : text,
        //                 "placement": "left",
        //                 "animation": "true",
        //                 "container": "#" + $modal.attr("id"),
        //                 "trigger"  : "manual",
        //                 "template" : TooltipTemplate.Error
        //             });
        //         }
        //     } else {
        //         console.error("Error, none of the label is active!");
        //     }
        // });

        // $modal.on('click', 'th', function() {
        //     var $th = $(this);

        //     if ($mainJoin.hasClass("multiClause")) {
        //         return;
        //     }

        //     if ($th.hasClass("unselectable")) {
        //         noJoinTooltip($th, isLeft);
        //         return;
        //     }

        //     var colNum = xcHelper.parseColNum($th);
        //     var $table = $th.closest('table');

        //     var tableId = $table.data("id");

        //     if ($th.hasClass('colSelected')) {
        //          // unselect column
        //         $th.removeClass('colSelected');
        //         $table.find('.col' + colNum).removeClass('colSelected');
        //     } else {
        //         // select column
        //         $modal.find('.colSelected').removeClass('colSelected');
        //         $table.find('.col' + colNum).addClass('colSelected');

        //         if (isLeft && isOpenTime) {
        //             // suggest on right table
        //             suggestJoinKey(tableId, $th, $rightJoinTable);
        //         }
        //     }
        //     updatePreviewText();
        // });

        // var dragImage;
        // $modal.on("mousedown", ".columnTab", function() {
        //     if ($mainJoin.hasClass('multiClause')) {
        //         var $th = $(this).closest("th");
        //         if ($th.hasClass("unselectable")) {
        //             noJoinTooltip($th, isLeft);
        //             return;
        //         }

        //         var cursorStyle =
        //             '<style id="moveCursor" type="text/css">*' +
        //                 '{cursor:move !important; cursor: -webkit-grabbing !important;' +
        //                 'cursor: -moz-grabbing !important;}' +
        //                 '.tooltip{display: none !important;}' +
        //             '</style>';
        //         $(document.head).append(cursorStyle);

        //         if (isBrowseChrome) {
        //             var canvas = buildTabCanvas($(this));
        //             dragImage = document.createElement("img");
        //             dragImage.src = canvas.toDataURL();
        //         }
        //     }
        // });

        // $modal.on("dragstart", ".columnTab", function(event) {
        //     var originEvent = event.originalEvent;
        //     dragSide = isLeft ? "left" : "right";

        //     // XXX canvas not work for firfox, IE do not test
        //     if (isBrowseChrome) {
        //         if (dragImage != null) {
        //             originEvent.dataTransfer.setDragImage(dragImage, 0, 0);
        //         } else {
        //             console.error("Lose drag image!");
        //         }
        //     }

        //     originEvent.dataTransfer.effectAllowed = "copy";
        //     originEvent.dataTransfer.setData("text", $(this).text());

        //     if (isLeft) {
        //         $multiJoin.find(".clause.rightClause").addClass("inActive");
        //     } else {
        //         $multiJoin.find(".clause.leftClause").addClass("inActive");
        //     }
        // });

        // $modal.on("dragend", ".columnTab", function() {
        //     $('#moveCursor').remove();
        // });
    }

    function buildTabCanvas($tab) {
        if ($tab == null) {
            $tab = $joinModal.find(".columnTab").eq(0);
        }
        var w = $tab.width();
        var h = $tab.height();

        $("#joinCanvas").width(w);
        $("#joinCanvas").height(h);

        var c = $("#joinCanvas")[0];
        var ctx = c.getContext("2d");

        ctx.save();

        var grd = ctx.createLinearGradient(0, 0, 0, h);
        grd.addColorStop(0, "#CCCCCC");
        grd.addColorStop(1, "#AEAEAE");

        ctx.font = "600 12px Open Sans";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillStyle = grd;

        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#6e6e6e";
        var text = $tab.find(".text").text();

        var textW = ctx.measureText(text).width;
        var charLen = text.length;
        var charW = textW / charLen;
        var ellipsis = '…';
        var maxLen = Math.max(1, Math.floor(w / charW) - 3);

        if (charLen > maxLen) {
            text = text.substring(0, maxLen + 1) + ellipsis;
        }

        ctx.fillText(text, w / 2, h / 2);
        ctx.restore();

        return (c);
    }

    function scrollToColumn($th) {
        if (!$th || $th.length === 0) {
            return;
        }
        var $tableArea = $th.closest('.joinTableArea');
        $tableArea.scrollLeft(0);
        var tableOffset = $tableArea.offset().left;
        var tableAreaWidth = $tableArea.width();
        var thWidth = $th.width();
        var thOffset = $th.offset().left;
        var position = (thOffset - tableOffset) - (tableAreaWidth * 0.5) +
                           (thWidth * 0.5);
        $tableArea.scrollLeft(position);
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
            $invalidClause = $multiJoin.find(".joinClause").eq(0);
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

    function showErrorTooltip($el, options) {
        $(".tooltip").hide();
        $el.tooltip(options);
        $el.tooltip("show");
        setTimeout(function() {
            $el.tooltip("destroy");
        }, 2000);
    }

    // function suggestJoinKey(tableId, $th, $suggSection, suggTableId) {
    //     var type     = getType($th);
    //     var colNum   = xcHelper.parseColNum($th);
    //     var colName  = $th.find(".columnTab .text").text();
    //     var context1 = contextCheck($th.closest('table'), colNum, type);

    //     var $thToClick;
    //     var tableIdToClick;

    //     // only score that more than -50 will be suggested, can be modified
    //     var maxScore = -50;
    //     var $suggTables = $suggSection.find("table");

    //     if (suggTableId != null) {
    //         $suggTables = $suggTables.filter(function() {
    //             return ($(this).data("id") === suggTableId);
    //         });
    //     }

    //     $suggTables.each(function() {
    //         var $suggTable = $(this);
    //         var curTaleId = $suggTable.data("id");

    //         if (curTaleId === tableId) {
    //             return;  // skip same table
    //         }

    //         $suggTable.find("th").each(function(index) {
    //             var $curTh = $(this);

    //             if (getType($curTh) === type) {
    //                 var context2 = contextCheck($suggTable, index + 1, type);

    //                 var curColName = $curTh.find(".columnTab .text").text();
    //                 var dist = getTitleDistance(colName, curColName);
    //                 var score = getScore(context1, context2, dist, type);

    //                 if (score > maxScore) {
    //                     maxScore = score;
    //                     $thToClick = $curTh;
    //                     tableIdToClick = curTaleId;
    //                 }
    //             }
    //         });
    //     });

    //     // if find the suggeest join key
    //     if (tableIdToClick != null) {
    //         $suggSection.find($tableDropDown).find('li').filter(function() {
    //             return ($(this).data("id") === tableIdToClick);
    //         }).click();

    //         if (!$thToClick.hasClass("colSelected")) {
    //             $thToClick.click();
    //         }

    //         scrollToColumn($thToClick);

    //         if (!isOpenTime) {
    //             $thToClick.tooltip({
    //                 "title"    : TooltipTStr.SuggKey,
    //                 "placement": "top",
    //                 "animation": "true",
    //                 "container": "#" + $suggSection.attr("id"),
    //                 "trigger"  : "manual"
    //             });

    //             $thToClick.tooltip("show");
    //             setTimeout(function() {
    //                 $thToClick.tooltip("destroy");
    //             }, 1000);
    //         }

    //         return true;
    //     }

    //     return false;
    // }

    function suggestJoinKey(tableId, val, $inputToFill, suggTableId) {
        var tableCols = gTables[tableId].tableCols;
        var col = gTables[tableId].getColByFrontName(val);
        var type = col.type;
        var backColName = col.backName;
        var frontColName = col.name;
        var colNum = gTables[tableId].getColNumByBackName(backColName);

        // var colNum   = xcHelper.parseColNum($th);
        // var colName  = $th.find(".columnTab .text").text();
        var context1 = contextCheck($('#xcTable-' + tableId), colNum, type);

        var $thToClick;
        var tableIdToClick;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = -50;

        var $suggTable = $('#xcTable-' + suggTableId);
        $suggTable.find(".header").each(function(index) {
            var $curTh = $(this);

            // if (index !== 0 && !$curTh.hasClass('dataCol') && getType($curTh) === type) {
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
            // scrollToColumn($thToClick);

            if (!isOpenTime) {
                // $thToClick.tooltip({
                //     "title"    : TooltipTStr.SuggKey,
                //     "placement": "top",
                //     "animation": "true",
                //     "container": "#" + $suggSection.attr("id"),
                //     "trigger"  : "manual"
                // });

                // $thToClick.tooltip("show");
                // setTimeout(function() {
                //     $thToClick.tooltip("destroy");
                // }, 1000);
            }

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
        var joinType = $joinSelect.find(".text").text();
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

    return (JoinModal);
}(jQuery, {}));
