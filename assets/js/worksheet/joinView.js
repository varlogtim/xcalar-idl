window.JoinView = (function($, JoinView) {
    var $mainJoin;       // $("#mainJoin")
    var $joinView;      // $("#joinView")
    var $leftTableDropdown;  // $('#joinLeftTableList');
    var $rightTableDropdown;  // $('#joinRightTableList');
    var $joinTypeSelect;     // $("#joinType")
    var $joinTableName;  // $("#joinTableNameInput")
    var $clauseContainer;   // $mainJoin.find('.clauseContainer');
    var $lastInputFocused;
    var $renameSection; // $("#joinView .renameSection")
    var isNextNew = true; // if true, will run join estimator
    var joinEstimatorType = "inner"; // if user changes join type,
                                     // rerun estimator
    var isOpen = false;
    var lImmediatesCache;
    var rImmediatesCache;
    var lFatPtrCache;
    var rFatPtrCache;
    var allClashingImmediatesCache;
    var allClashingFatPtrsCache;
    var lastSideClicked; // for column selector ("left" or "right")
    var focusedListNum;
    var formOpenTime; // stores the last time the form was opened
    var turnOnPrefix = true; // Set to false if backend crashes

    var validTypes = ['integer', 'float', 'string', 'boolean'];

    var formHelper;
    var multiClauseTemplate =
        '<div class="joinClause">' +
            '<input class="clause leftClause inActive arg" type="text" ' +
                'data-original-title="' + JoinTStr.NoLeftTable + '"' +
                ' data-toggle="tooltip" data-container="body"' +
                'spellcheck="false" disabled />' +
            '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                  '<i class="icon xi-equal-circle fa-14"></i>' +
                '</div>' +
            '</div>' +
            '<input class="clause rightClause inActive arg" type="text"' +
                ' data-original-title="' + JoinTStr.NoRightTable + '"' +
                ' data-toggle="tooltip" data-container="body"' +
                ' spellcheck="false" disabled />' +
        '</div>';

    JoinView.setup = function () {
        $mainJoin = $("#mainJoin");
        $joinView = $("#joinView");
        $leftTableDropdown = $('#joinLeftTableList');
        $rightTableDropdown = $('#joinRightTableList');
        $joinTypeSelect = $("#joinType");
        $joinTableName = $("#joinTableNameInput");
        $clauseContainer = $mainJoin.find('.clauseContainer');
        $renameSection = $("#joinView .renameSection");

        var columnPicker = {
            "state"      : "joinState",
            "colCallback": function($target) {
                if ($lastInputFocused &&
                    !$lastInputFocused.closest('.joinTableList').length) {
                    xcHelper.fillInputFromCell($target, $lastInputFocused);
                }
            },
            "headCallback": function($target) {
                if (!$lastInputFocused) {
                    return;
                }
                var $joinTableList = $lastInputFocused
                                            .closest('.joinTableList');
                if ($joinTableList.length) {
                    var originalText = $lastInputFocused.val();
                    xcHelper.fillInputFromCell($target, $lastInputFocused, null,
                        {type: "table"});
                    var index = $joinView.find('.joinTableList')
                                         .index($joinTableList);
                    var newTableName = $lastInputFocused.val();
                    if (originalText !== newTableName) {
                        $joinView.find('.joinClause').each(function() {
                            $(this).find('.clause').eq(index).val("");
                        });
                        $joinView.find('.clause').eq(index).focus();
                        checkNextBtn();
                        updatePreviewText();
                        focusTable(getTableIds(index));
                        activateClauseSection(index);
                    }
                }
            }
        };

        formHelper = new FormHelper($joinView, {
            "columnPicker": columnPicker
        });

        $joinView.find('.cancel, .close').on('click', function() {
            JoinView.close();
        });

        $joinView.find('.next, .back').click(function() {
            toggleNextView();
        });

        $("#closeJoin, #cancelJoin").click(function() {
            JoinView.close();
            resetJoinView();
        });

        $joinTableName.blur(function() {
            var tableName = $joinTableName.val().trim();
            if (tableName && !xcHelper.isValidTableName(tableName)) {
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
            "onOpen": function() {
                fillTableLists(null, true);
            },
            "onSelect": function($li) {
                tableListSelect($li, 0);
            }
        });
        leftTableList.setupListeners();

        var rightTableList = new MenuHelper($rightTableDropdown, {
            "onOpen": function() {
                fillTableLists(null, true);
            },
            "onSelect": function($li) {
                tableListSelect($li, 1);
            }
        });
        rightTableList.setupListeners();

        // index: 0 for left, 1 for right table list
        function tableListSelect($li, index) {
            var tableName = $li.text();
            var $dropdown = $li.closest('.dropDownList');
            var $textBox = $dropdown.find(".text");
            var originalText = $textBox.val();
            activateClauseSection(index);

            if (originalText !== tableName) {
                $textBox.val(tableName);
                $li.siblings().removeClass('selected');
                $li.addClass('selected');
                var $clauses;
                if (index === 0) {
                    $clauses = $joinView.find('.leftClause');
                } else {
                    $clauses = $joinView.find('.rightClause');
                }
                $clauses.val("").eq(0).focus();
                checkNextBtn();
                updatePreviewText();
                var tableId = getTableIds(index);
                focusTable(tableId);
            } else {
                return;
            }
        }

        $joinView.find('.tableListSections .focusTable').click(function() {
            var tableIds = getTableIds();
            var index = $joinView.find('.tableListSections .focusTable')
                                 .index($(this));
            var tableId = tableIds[index];
            xcHelper.centerFocusedTable(tableId, true);
        });


        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();
            submitJoin();
        });

        // toggle keep tables
        $joinView.find('.keepTablesCBWrap').click(function() {
            $(this).find(".checkbox").toggleClass("checked");
        });

        $joinView.find('.estimateCheckbox').click(function() {
            if ($(this).hasClass('checked')) {
                return;
            }
            $(this).addClass('checked');
            estimateJoinSize();
        });

        // add multi clause
        $clauseContainer.on("click", ".addClause", function() {
            addClause();
        });

        // delete multi clause
        $clauseContainer.on("click", ".joinClause .middleIcon", function() {
            var $joinClause = $(this).closest(".joinClause");
            if (gMinModeOn) {
                clauseRemoveHelper();
            } else {
                $joinClause.slideUp(100, clauseRemoveHelper);
            }
           
            function clauseRemoveHelper() {
                $joinClause.remove();
                updatePreviewText();
                checkNextBtn();
                if ($joinClause.find('.leftClause').val().trim() !== "" ||
                    $joinClause.find('.leftClause').val().trim() !== "") {
                    isNextNew = true;
                }
            }
        });

        $joinView.on('focus', '.tableListSection .arg', function() {
            $lastInputFocused = $(this);
        });
        $joinView.on('change', '.tableListSection .arg', function() {
            var index = $joinView.find('.tableListSection .arg').index($(this));
            $joinView.find('.joinClause').each(function() {
                $(this).find('.clause').eq(index).val("");
            });

            checkNextBtn();
            updatePreviewText();

            var tableId = getTableIds(index);
            if (gTables[tableId]) {
                focusTable(tableId);
                activateClauseSection(index);
                $joinView.find('.clause').eq(index).focus();
            } else {
                deactivateClauseSection(index);
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

        $joinView.find('.columnsWrap').on('click', 'li', function(event) {
            var $li = $(this);
            var colNum = $li.data('colnum');
            var toHighlight = false;
            if (!$li.hasClass('checked')) {
                toHighlight = true;
            }

            var $colList = $li.closest('ul');
            var isLeftSide = $colList.hasClass('leftCols');
            var toShift = event.shiftKey &&
                          (isLeftSide && lastSideClicked === "left" ||
                          !isLeftSide && lastSideClicked === "right");


            if (toShift && focusedListNum != null) {
                var start = Math.min(focusedListNum, colNum);
                var end = Math.max(focusedListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i, $colList);
                    } else {
                        deselectCol(i, $colList);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum, $colList);
                } else {
                    deselectCol(colNum, $colList);
                }
            }

            if ($li.siblings('.checked').length === 0) {
                if ($li.closest('ul').hasClass('leftCols')) {
                    $joinView.find('.leftColHeading .selectAll')
                             .removeClass('checked');
                } else {
                    $joinView.find('.rightColHeading .selectAll')
                             .removeClass('checked');
                }
            } else if ($li.siblings().length ===
                       $li.siblings('.checked').length) {
                if ($li.closest('ul').hasClass('leftCols')) {
                    $joinView.find('.leftColHeading .selectAll')
                             .addClass('checked');
                } else {
                    $joinView.find('.rightColHeading .selectAll')
                             .addClass('checked');
                }
            }

            if (isLeftSide) {
                lastSideClicked = "left";
            } else {
                lastSideClicked = "right";
            }

            focusedListNum = colNum;

            resetRenames();
        });

        function selectCol(colNum, $colList) {
            $colList.find('li[data-colnum="' + colNum + '"]')
                    .addClass('checked')
                    .find('.checkbox').addClass('checked');
        }

        function deselectCol(colNum, $colList) {
            $colList.find('li[data-colnum="' + colNum + '"]')
                    .removeClass('checked')
                    .find('.checkbox').removeClass('checked');
        }

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
            resetRenames();
        });

        // smart suggest button
        $joinView.find('.smartSuggest').click(function() {
            var $inputToCheck;
            var isLeftTableVal = false;
            var $suggErrorArea = $(this).siblings(".suggError");
            // var $suggErrorArea = $(this);
            if (hasValidTableNames()) {
                $joinView.find('.joinClause').each(function() {
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
                        tableName = $leftTableDropdown.find('.text').val();
                        otherTableName = $rightTableDropdown.find('.text')
                                                            .val();
                    } else {
                        tableName = $rightTableDropdown.find('.text')
                                                       .val();
                        otherTableName = $leftTableDropdown.find('.text')
                                                           .val();
                    }
                    var tableId = xcHelper.getTableId(tableName);
                    var suggTableId = xcHelper.getTableId(otherTableName);
                    var $inputToFill = $inputToCheck.siblings('.arg');

                    // tableId is the left table
                    // $th is the left table
                    // $suggSection is the right table
                    // suggTableId is the right table
                    var isFind = suggestJoinKey(tableId,
                                                $inputToCheck.val().trim(),
                                                $inputToFill, suggTableId);

                    if (!isFind) {
                        text = isLeftTableVal ? JoinTStr.NoMatchRight :
                                                JoinTStr.NoMatchLeft;
                        showErrorTooltip($suggErrorArea, {
                            "title"    : text,
                            "placement": "right"
                        });
                    }
                } else {
                    showErrorTooltip($suggErrorArea, {
                        "title"    : JoinTStr.NoColToCheck,
                        "placement": "right"
                    });
                }
            } else {
                var title;
                if (!gTables[getTableIds(0)]) {
                    title = JoinTStr.NoLeftTable;
                } else {
                    title = JoinTStr.NoRightTable;
                }
                // no table selected in dropdown
                showErrorTooltip($suggErrorArea, {
                    "title"    : title,
                    "placement": "right"
                });
            }

            checkNextBtn();
            updatePreviewText();
        });

        $renameSection.on("click", ".renameIcon", function() {
            var $colToRename = $(this).closest(".rename");
            var origName = $colToRename.find(".origName").val();
            $colToRename.find(".newName").val(origName);
        });
    };

    // restore user saved preferences
    JoinView.restore = function() {
        var keepJoinTables = UserSettings.getPref('keepJoinTables');
        if (keepJoinTables) {
            $joinView.find('.keepTablesCBWrap .checkbox').addClass('checked');
        }
    };

    JoinView.show = function(tableId, colNum, restore, restoreTime) {
        if (restoreTime && restoreTime !== formOpenTime) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return;
        }
        isOpen = true;
        formHelper.showView();
        formOpenTime = Date.now();

        if (!restore) {
            resetJoinView();
            fillTableLists(tableId);
            updatePreviewText();
            addClause(true, tableId, colNum);
        }
        formHelper.setup();

        $("body").on("keypress.joinModal", function(event) {
            switch (event.which) {
                case keyCode.Enter:
                    // when focus on a button, no trigger
                    if (formHelper.checkBtnFocus()) {
                        return;
                    }
                    if ($joinView.hasClass('nextStep')) {
                        $('#joinTables').click();
                    } else {
                        $joinView.find('.next').click();
                    }

                    break;
                default:
                    break;
            }
        });
    };

    JoinView.close = function() {
        if (!isOpen) {
            return;
        }

        isOpen = false;
        lastSideClicked = null;
        focusedListNum = null;
        formHelper.hideView();
        formHelper.clear();
        $("body").off(".joinModal");
        $lastInputFocused = null;
        StatusBox.forceHide();// hides any error boxes;
        $('.tooltip').hide();
    };

    function activateClauseSection(index) {
        $joinView.find('.joinClause').each(function() {
            $(this).find('.clause').eq(index).removeClass('inActive')
                                              .attr('disabled', false);
        });
        if (index === 0) {
            xcTooltip.remove($(".leftClause"));
        } else {
            xcTooltip.remove($(".rightClause"));
        }
        var $subHeading = $joinView.find('.tableListSection').eq(index)
                                   .find('.subHeading');
        xcTooltip.remove($subHeading.find('.tooltipWrap'));
        $subHeading.find('.iconWrap').removeClass('inactive');
    }

    function deactivateClauseSection(index) {
        var $subHeading = $joinView.find('.tableListSection').eq(index)
                                   .find('.subHeading');
        $subHeading.find('.iconWrap').addClass('inactive');
        var tooltipTitle;
        if (index === 0) {
            tooltipTitle = JoinTStr.NoLeftTable;
        } else {
            tooltipTitle = JoinTStr.NoRightTable;
        }
        xcTooltip.add($subHeading.find('.tooltipWrap'), {
            "title": tooltipTitle
        });
        $joinView.find('.joinClause').each(function() {
            var $input = $(this).find('.arg').eq(index);
            if ($input.length) {
                xcTooltip.add($input, {
                    "title": tooltipTitle
                });
                $input.addClass('inActive').attr('disabled', true);
            }
        });
    }

    function resetJoinEstimator() {
        $('.estimateCheckbox').removeClass('checked');
        $('.estimatorWrap .stats').hide();
        $('.estimatorWrap .title').text(JoinTStr.EstimateJoin);
    }

    function toggleNextView() {
        if ($joinView.hasClass('nextStep')) {
            // go to step 1
            goToFirstStep();
        } else {
            // go to step 2
            if (checkFirstView()) {
                if (isNextNew) {
                    resetJoinEstimator();
                    displayAllColumns();
                    isNextNew = false;
                    resetRenames();
                } else if ($joinTypeSelect.find(".text").text() !==
                           joinEstimatorType) {
                    // Rerun estimator since type is now different
                    resetJoinEstimator();
                }

                $joinView.addClass('nextStep');
                if ($joinTableName.val().trim() === "") {
                    $joinTableName.focus();
                }

                // clear any empty column rows
                $clauseContainer.find(".joinClause")
                .each(function() {
                    var $joinClause = $(this);
                    var lClause = $joinClause.find(".leftClause").val().trim();
                    var rClause = $joinClause.find(".rightClause").val().trim();

                    if (lClause === "" && rClause === "") {
                        $joinClause.remove();
                    }
                });

                formHelper.refreshTabbing();
            } else {
                // checkfirstview is handling errors
                return;
            }
        }
        $joinView.find('.mainContent').scrollTop(0);
    }

    function goToFirstStep() {
        $joinView.removeClass('nextStep');
        formHelper.refreshTabbing();
        lastSideClicked = null;
        focusedListNum = null;
    }

    function checkFirstView() {
        // var newTableName = newTableName + Authentication.getHashId();

        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause").each(function() {
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

            invalidMultiClauseTooltip($invalidClause);
            return false;
        }

        var tableIds = getTableIds();
        var leftColRes = xcHelper.convertFrontColNamesToBack(lCols, tableIds[0],
                                                    validTypes);

        if (leftColRes.invalid) {
            columnErrorHandler('left', leftColRes);
            return false;
        } else {
            var rightColRes = xcHelper.convertFrontColNamesToBack(rCols,
                                                                  tableIds[1],
                                                                  validTypes);
            if (rightColRes.invalid) {
                columnErrorHandler('right', rightColRes);
                return (false);
            }
        }
        var matchRes = checkMatchingColTypes(lCols, rCols, tableIds);

        if (!matchRes.success) {
            var $row = $clauseContainer.find('.joinClause').eq(matchRes.row);
            showErrorTooltip($row, {
                "title": xcHelper.replaceMsg(JoinTStr.MismatchDetail, {
                    type1: '<b>' + matchRes.types[0] + '</b>',
                    type2: '<b>' + matchRes.types[1] + '</b>'
                }),
                "html": true
            },
            {time: 3000});
            return false;
        }

        return (true);
    }

    function columnErrorHandler(side, colRes) {
        var errorText;
        var $clauseSection;
        var $input;

        if (side === "left") {
            $clauseSection = $clauseContainer.find('.joinClause .leftClause');
        } else {
            $clauseSection = $clauseContainer.find('.joinClause .rightClause');
        }

        $input = $clauseSection.filter(function() {
                        return ($(this).val() === colRes.name);
                    }).eq(0);

        if (colRes.reason === 'notFound') {
            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                "name": colRes.name
            });
        } else if (colRes.reason = "tableNotFound") {
            errorText = ErrTStr.SourceTableNotExists;
        } else if (colRes.reason === 'type') {
            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                "name": colRes.name,
                "type": colRes.type
            });
        }
        showErrorTooltip($input, {
            "title": errorText
        });
    }

    // assumes lCols and rCols exist, returns obj with sucess property
    // will return obj with success:false if has definitivly mismatching types
    function checkMatchingColTypes(lCols, rCols, tableIds) {
        var lTable = gTables[tableIds[0]];
        var rTable = gTables[tableIds[1]];
        var lProgCol;
        var rProgCol;
        var lType;
        var rType;
        var problemTypes = ["integer", "float", "number"];
        for (var i = 0; i < lCols.length; i++) {
            lProgCol = lTable.getColByFrontName(lCols[i]);
            rProgCol = rTable.getColByFrontName(rCols[i]);
            lType = lProgCol.getType();
            rType = rProgCol.getType();

            if (lType !== rType) {
                if (problemTypes.indexOf(lType) !== -1 &&
                    problemTypes.indexOf(rType) !== -1) {
                    if (lProgCol.isKnownType() && rProgCol.isKnownType()) {
                        return {
                            success: false,
                            types  : [lType, rType],
                            row    : i
                        };
                    } else {
                        // if one of the columns has a problematic type but is
                        // not an immediate, we really don't know it's true type
                        // and could be matching
                    }
                } else {
                    // types don't match and they're not problematic types so
                    // they really must not match
                    return {
                        success: false,
                        types  : [lType, rType],
                        row    : i
                    };
                }
            }
        }
        return {success: true};
    }

    function estimateJoinSize() {
        var deferred = jQuery.Deferred();
        if (!validTableNameChecker()) {
            deferred.reject();
            return deferred.promise();
        }
        var tableIds = getTableIds();
        var cols = getClauseCols();
        var rTableName = gTables[tableIds[1]].getName();
        var argList = {
            "leftLimit" : 100,
            "rightLimit": 100,
            "joinType"  : $joinTypeSelect.find(".text").text(),
            "lCol"      : cols[0],
            "rCol"      : cols[1],
            "rTable"    : new XcSDK.Table(rTableName),
            "unlock"    : true,
            "fromJoin"  : true
        };

        var $estimatorWrap = $joinView.find('.estimatorWrap');
        $(".estimatorWrap .stats").show();
        $estimatorWrap.find('.min .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.med .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.max .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.title').text(JoinTStr.EstimatingJoin);
        $estimatorWrap.find('.value').empty();

        var extOptions = {
            noNotification: true
        };

        joinEstimatorType = $joinTypeSelect.find(".text").text();

        ExtensionManager.trigger(tableIds[0], "UExtDev", "estimateJoin",
                                 argList, extOptions)
        .then(function(ret) {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.min .value').text(ret.minSum);
            $estimatorWrap.find('.med .value').text(ret.expSum);
            $estimatorWrap.find('.max .value').text(ret.maxSum);
            deferred.resolve();
        })
        .fail(function() {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.value').text('N/A');
            deferred.reject();
        });

        return deferred.promise();
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

    function resetRenames() {
        lImmediatesCache = undefined;
        rImmediatesCache = undefined;
        lFatPtrCache = undefined;
        rFatPtrCache = undefined;
        allClashingImmediatesCache = undefined;
        $("#leftTableRenames").find(".rename").remove();
        $("#rightTableRenames").find(".rename").remove();
        $("#lFatPtrRenames").find(".rename").remove();
        $("#rFatPtrRenames").find(".rename").remove();
        $renameSection.find(".tableRenames").hide();
        $renameSection.hide();
        formHelper.refreshTabbing();
    }

    function hasValidTableNames() {
        var tableIds = getTableIds();
        return (gTables[tableIds[0]] && gTables[tableIds[1]]);
    }

    function validTableNameChecker() {
        var errorTitle;
        var $input;
        var $errorInput;
        if (!gTables[getTableIds(0)]) {
            errorTitle = JoinTStr.NoLeftTable;
            $errorInput = $('#joinLeftTableList');
        } else if (!gTables[getTableIds(1)]) {
            errorTitle = JoinTStr.NoRightTable;
            $errorInput = $('#joinRightTableList');
        }

        if (errorTitle) {
            if ($joinView.hasClass('nextStep')) {
                goToFirstStep();
            }
            showErrorTooltip($errorInput, {
                "title"    : errorTitle,
                "placement": "right"
            });
            return false;
        } else {
            return true;
        }
    }

    // returns array of 2 table ids if no args passed in
    // or returns corresponding id if index passed in
    function getTableIds(index) {
        if (index != null) {
            var tableName;
            if (index === 0) {
                tableName = $leftTableDropdown.find('.text').val();
            } else {
                tableName = $rightTableDropdown.find('.text').val();
            }
            return xcHelper.getTableId(tableName);
        } else {
            var lTableName = $leftTableDropdown.find('.text').val();
            var rTableName = $rightTableDropdown.find('.text').val();
            var lTableId = xcHelper.getTableId(lTableName);
            var rTableId = xcHelper.getTableId(rTableName);
            return ([lTableId, rTableId]);
        }
    }

    function hasColsAndTableNames() {
        if (hasValidTableNames()) {
            var columnPairs = [];
            var pair;
            var lClause;
            var rClause;

            $joinView.find(".joinClause").each(function() {
                var $joinClause = $(this);
                lClause = $joinClause.find(".leftClause").val().trim();
                rClause = $joinClause.find(".rightClause").val().trim();
                pair = [lClause, rClause];
                columnPairs.push(pair);
            });

            var numPairs = columnPairs.length;
            // var leftColText;
            // var rightColText;
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


    function getClauseCols() {
        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lCols = [];
        var rCols = [];

        $clauseContainer.find(".joinClause").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
            }
        });

        var lTable = gTables[lTableId];
        lCols = lCols.map(function(colName) {
            var progCol = lTable.getColByFrontName(colName);
            var backColName = progCol.getBackColName();
            var colType = progCol.getType();
            return new XcSDK.Column(backColName, colType);
        });

        var rTable = gTables[rTableId];
        rCols = rCols.map(function(colName) {
            var progCol = rTable.getColByFrontName(colName);
            var backColName = progCol.getBackColName();
            var colType = progCol.getType();
            return new XcSDK.Column(backColName, colType);
        });

        return ([lCols, rCols]);
    }

    function checkNextBtn() {
        var $nextBtn = $joinView.find('.next');
        var isDisabled = $nextBtn.hasClass('btn-disabled');
        if (hasColsAndTableNames()) {
            $nextBtn.removeClass('btn-disabled');
            if (isDisabled) {
                isNextNew = true;
                formHelper.refreshTabbing();
            }
        } else {
            $nextBtn.addClass('btn-disabled');
            if (!isDisabled) {
                isNextNew = true;
                formHelper.refreshTabbing();
            }
        }
    }

    function getTableColList(tableId) {
        var html = "";
        var allCols = gTables[tableId].tableCols;
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
            if (progCol.isEmptyCol() || progCol.isDATACol()) {
                continue;
            }

            html += '<li class="checked" data-colnum="' + i + '">' +
                        '<span class="text">' +
                            progCol.getFrontColName(true) +
                        '</span>' +
                        '<div class="checkbox checked">' +
                            '<i class="icon xi-ckbox-empty fa-13"></i>' +
                            '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
                    '</li>';
        }
        return (html);
    }

    function submitJoin() {
        // check validation
        // if submit is enabled, that means first view is already valid

        var isValidTableName = xcHelper.tableNameInputChecker($joinTableName);
        if (!isValidTableName) {
            return PromiseHelper.reject();
        }
        if (!validTableNameChecker()) {
            return PromiseHelper.reject();
        }

        var newTableName = $joinTableName.val().trim();

        formHelper.disableSubmit();
        var joinType = $joinTypeSelect.find(".text").text();
        var tableName = newTableName + Authentication.getHashId();
        return joinSubmitHelper(joinType, tableName);

        // XXX some bugs here
        formHelper.enableSubmit();

    }

    function executeChecks($renames, $origNames, $newNames, origArray,
                           renameArray, isFatptr) {
        // Check that none are empty
        for (i = 0; i < $newNames.length; i++) {
            if ($($newNames[i]).val().trim().length === 0) {
                StatusBox.show(ErrTStr.NoEmpty, $renames.eq(i), true);
                return false;
            }
        }

        for (i = 0; i < $origNames.length; i++) {
            var origName = $($origNames[i]).val();
            var newName = $($newNames[i]).val();
            if (isFatptr) {
                type = DfFieldTypeT.DfFatptr;
            } else {
                type = DfFieldTypeT.DfUnknown;
            }
            renameArray.push({"orig": origName, "new": newName,
                              "type": type});
        }

        for (i = 0; i < $origNames.length; i++) {
            var index = origArray.indexOf(renameArray[i].orig);
            origArray[index] = renameArray[i].new;
        }

        return true;
    }

    function joinSubmitHelper(joinType, newTableName) {
        var deferred = jQuery.Deferred();
        var lCols = [];
        var rCols = [];
        var $invalidClause = null;

        // check validation
        $clauseContainer.find(".joinClause").each(function() {
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
            toggleNextView(); // go back
            invalidMultiClauseTooltip($invalidClause);

            deferred.reject();
            return deferred.promise();
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
            lColNums[i] = lTable.getColNumByBackName(col.backName);
        }

        for (var i = 0; i < rCols.length; i++) {
            var col = rTable.getColByFrontName(rCols[i]);
            rColNums[i] = rTable.getColNumByBackName(col.backName);
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

        // 1) We check whether the column name resolution is already there
        // 2) If it is, then we check whether the resolution is satisfactory.
        // 3) If it is, then we skip the checking and go straight to join
        // Else, we trigger the resolution again

        // XXX When a column is deselected or selected, we should only remove
        // that one column from prefix. Currently just going to remove all
        if ($renameSection.is(":visible")) {
            // Already in rename mode. Verify that the renames are correct
            var $leftRenames = $("#leftTableRenames .rename");
            var $leftOrigNames = $leftRenames.find(".origName");
            var $leftNewNames = $leftRenames.find(".newName");
            var lImmediates = xcHelper.deepCopy(lImmediatesCache);
            var leftRenameArray = [];

            var $rightRenames = $("#rightTableRenames .rename");
            var $rightOrigNames = $rightRenames.find(".origName");
            var $rightNewNames = $rightRenames.find(".newName");
            var rImmediates = xcHelper.deepCopy(rImmediatesCache);
            var rightRenameArray = [];

            // For fatPtrs
            var $leftFatRenames = $("#lFatPtrRenames .rename");
            var $leftFatOrigNames = $leftFatRenames.find(".origName");
            var $leftFatNewNames = $leftFatRenames.find(".newName");
            var lFatPtr = xcHelper.deepCopy(lFatPtrCache);
            var leftFatRenameArray = [];

            var $rightFatRenames = $("#rFatPtrRenames .rename");
            var $rightFatOrigNames = $rightFatRenames.find(".origName");
            var $rightFatNewNames = $rightFatRenames.find(".newName");
            var rFatPtr = xcHelper.deepCopy(rFatPtrCache);
            var rightFatRenameArray = [];

            var i = -1;

            if (!executeChecks($leftFatRenames, $leftFatOrigNames,
                               $leftFatNewNames, lFatPtr, leftFatRenameArray,
                               true) ||
                !executeChecks($rightFatRenames, $rightFatOrigNames,
                               $rightFatNewNames, rFatPtr,
                               rightFatRenameArray, true) ||
                !executeChecks($leftRenames, $leftOrigNames, $leftNewNames,
                               lImmediates, leftRenameArray, false) ||
                !executeChecks($rightRenames, $rightOrigNames, $rightNewNames,
                               rImmediates, rightRenameArray, false)) {
                
                deferred.reject();
                return deferred.promise();
            }

            // Cross check between left and right fat ptrs on whether they
            // still clash
            for (i = 0; i < $leftFatRenames.length; i++) {
                if (rFatPtr.indexOf($leftFatRenames.eq(i).find(".newName")
                                                    .val()) > -1) {
                    StatusBox.show(ErrTStr.PrefixConflict,$leftFatRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
                var firstIdx = lFatPtr.indexOf($leftFatRenames.eq(i)
                                                       .find(".newName").val());
                if (lFatPtr.indexOf($leftFatRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.PrefixConflict,$leftFatRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
            }

            for (i = 0; i < $rightFatRenames.length; i++) {
                if (lFatPtr.indexOf($rightFatRenames.eq(i).find(".newName")
                                                     .val()) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict,
                                   $rightFatRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
                var firstIdx = rFatPtr.indexOf($rightFatRenames.eq(i)
                                                       .find(".newName").val());
                if (rFatPtr.indexOf($rightFatRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict,
                                   $rightFatRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
            }

            // Cross check between left and right immediates on whether they
            // still clash
            for (i = 0; i < $leftRenames.length; i++) {
                if (rImmediates.indexOf($leftRenames.eq(i).find(".newName")
                                                    .val()) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $leftRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
                var firstIdx = lImmediates.indexOf($leftRenames.eq(i)
                                                       .find(".newName").val());
                if (lImmediates.indexOf($leftRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $leftRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
            }

            for (i = 0; i < $rightRenames.length; i++) {
                if (lImmediates.indexOf($rightRenames.eq(i).find(".newName")
                                                     .val()) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $rightRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
                var firstIdx = rImmediates.indexOf($rightRenames.eq(i)
                                                       .find(".newName").val());
                if (rImmediates.indexOf($rightRenames.eq(i).find(".newName")
                                                   .val(), firstIdx + 1) > -1) {
                    StatusBox.show(ErrTStr.ColumnConflict, $rightRenames.eq(i),
                                   true);
                    deferred.reject();
                    return deferred.promise();
                }
            }

            // Dedup left and right rename arrays since checks are all passed
            leftRenameArray = leftRenameArray.filter(removeNoChanges);
            rightRenameArray = rightRenameArray.filter(removeNoChanges);
            leftFatRenameArray = leftFatRenameArray.filter(removeNoChanges);
            rightFatRenameArray = rightFatRenameArray.filter(removeNoChanges);

            // Remove user's renames from autoRename array and auto rename the
            // rest
            var suff = Math.floor(Math.random() * 1000);
            autoResolveCollisions(allClashingImmediatesCache, suff,
                                  DfFieldTypeT.DfUnknown, lColsToKeep,
                                  rColsToKeep, leftRenameArray,
                                  rightRenameArray);
            autoResolveCollisions(allClashingFatPtrsCache, suff,
                                  DfFieldTypeT.DfFatptr,
                                  getPrefixes(lColsToKeep),
                                  getPrefixes(rColsToKeep), leftFatRenameArray,
                                  rightFatRenameArray);

            leftRenameArray = leftRenameArray.concat(leftFatRenameArray);
            rightRenameArray = rightRenameArray.concat(rightFatRenameArray);
            return proceedWithJoin(leftRenameArray, rightRenameArray);
        }

        var lTableMeta = gTables[lTableId].backTableMeta;
        var rTableMeta = gTables[rTableId].backTableMeta;

        function getFatPtr(valueAttr) {
            if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                return true;
            } else {
                return false;
            }
        }

        function getImmediates(valueAttr) {
            if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                return false;
            } else {
                return true;
            }
        }

        function getUserChosenFatPtrCollision() {
            // Get all prefixes in lColsToKeep
            var i = 0;
            var leftPrefixes = getPrefixes(lColsToKeep);
            var rightPrefixes = getPrefixes(rColsToKeep);
            var clashingUserChosenPrefixes = [];
            for (i = 0; i < leftPrefixes.length; i++) {
                if (rightPrefixes.indexOf(leftPrefixes[i]) > -1) {
                    clashingUserChosenPrefixes.push(leftPrefixes[i]);
                }
            }
            return clashingUserChosenPrefixes;
        }

        function userChosenColCollision(colName) {
            if (lColsToKeep.indexOf(colName) > -1 &&
                rColsToKeep.indexOf(colName) > -1) {
                return true;
            } else {
                return false;
            }
        }

        function getPrefixes(array) {
            // Given an array of column names, extract all unique prefixes
            var prefixes = [];
            var i = 0;
            for (i = 0; i < array.length; i++) {
                colNameParts = array[i].split("::");
                if (colNameParts.length < 2) {
                    continue;
                }
                if (prefixes.indexOf(colNameParts[0]) == -1) {
                    prefixes.push(colNameParts[0]);
                }
            }
            return prefixes;
        }

        function keepOnlyNames(valueAttr) {
            return (valueAttr.name);
        }

        // Split valueAttrs into fatPtrs and immediates
        var lFatPtr = lTableMeta.valueAttrs.filter(getFatPtr);
        var rFatPtr = rTableMeta.valueAttrs.filter(getFatPtr);
        var lImmediate = lTableMeta.valueAttrs.filter(getImmediates);
        var rImmediate = rTableMeta.valueAttrs.filter(getImmediates);

        // Today we are only handing immediate collisions. Later we will
        // handle fatptr collisions and prefix renaming for those

        // Only keep column names since we are not doing anything with types
        lFatPtr = lFatPtr.map(keepOnlyNames);
        rFatPtr = rFatPtr.map(keepOnlyNames);
        lImmediate = lImmediate.map(keepOnlyNames);
        rImmediate = rImmediate.map(keepOnlyNames);


        lFatPtrCache = lFatPtr;
        rFatPtrCache = rFatPtr;
        lImmediatesCache = lImmediate;
        rImmediatesCache = rImmediate;

        var lImmediatesToRename = [];
        var rImmediatesToRename = [];
        var lFatPtrToRename = [];
        var rFatPtrToRename = [];

        for (var i = 0; i < lImmediate.length; i++) {
            if (rImmediate.indexOf(lImmediate[i]) > -1) {
                lImmediatesToRename.push(lImmediate[i]);
                rImmediatesToRename.push(lImmediate[i]);
            }
        }

        for (i = 0; i < lFatPtr.length; i++) {
            if (rFatPtr.indexOf(lFatPtr[i]) > -1) {
                lFatPtrToRename.push(lFatPtr[i]);
                rFatPtrToRename.push(lFatPtr[i]);
            }
        }

        // All fat ptrs are kept and will be renamed if they clash even if they
        // are not selected

        // If none of the columns collide are part of the user's selection
        // then we resolve it underneath the covers and let the user go
        allClashingFatPtrsCache = lFatPtrToRename;
        lFatPtrToRename = getUserChosenFatPtrCollision();
        rFatPtrToRename = xcHelper.deepCopy(lFatPtrToRename);

        allClashingImmediatesCache = xcHelper.deepCopy(lImmediatesToRename);
        lImmediatesToRename =
                  allClashingImmediatesCache.filter(userChosenColCollision);
        rImmediatesToRename = xcHelper.deepCopy(lImmediatesToRename);

        // Now that we have all the columns that we want to rename, we
        // display the columns and ask the user to rename them
        // XXX Remove when backend fixes their stuff
        if (!turnOnPrefix) {
            return proceedWithJoin();
        }

        if (lImmediatesToRename.length > 0 || lFatPtrToRename.length > 0) {
            if (lImmediatesToRename.length === 0) {
                lImmediatesCache = [];
                rImmediatesCache = [];
            }
            $renameSection.show();
        } else {
            var leftAutoRenames = [];
            var rightAutoRenames = [];
            var suff = Math.floor(Math.random() * 1000);
            autoResolveCollisions(allClashingImmediatesCache, suff,
                                  DfFieldTypeT.DfUnknown, lColsToKeep,
                                  rColsToKeep, leftAutoRenames,
                                  rightAutoRenames);
            autoResolveCollisions(allClashingFatPtrsCache, suff,
                                  DfFieldTypeT.DfFatptr,
                                  getPrefixes(lColsToKeep),
                                  getPrefixes(rColsToKeep), leftAutoRenames,
                                  rightAutoRenames);
            return proceedWithJoin(leftAutoRenames, rightAutoRenames);
        }

        if (lImmediatesToRename.length > 0) {
            $("#leftTableRenames").show();
            addRenameRows($("#leftRenamePlaceholder"), lImmediatesToRename);
        }

        if (rImmediatesToRename.length > 0) {
            $("#rightTableRenames").show();
            addRenameRows($("#rightRenamePlaceholder"),
                          rImmediatesToRename);
        }

        if (lImmediatesToRename.length || rImmediatesToRename.length) {
            $("#derivedHeader").show();
        } else {
            $("#derivedHeader").hide();
        }

        if (lFatPtrToRename.length > 0) {
            $("#prefixHeader").show();
            $("#lFatPtrRenames").show();
            $("#rFatPtrRenames").show();
            addRenameRows($("#lFatPtrPlaceholder"), lFatPtrToRename);
            addRenameRows($("#rFatPtrPlaceholder"), rFatPtrToRename);
        } else {
            $("#prefixHeader").hide();
        }
        formHelper.refreshTabbing();
        deferred.reject();
        return deferred.promise();;

        function proceedWithJoin(leftRenames, rightRenames) {
            var innerDeferred = jQuery.Deferred();
            var keepTable = $joinView.find('.keepTablesCBWrap')
                                    .find('.checkbox').hasClass('checked');

            var lJoinInfo = {
                "tableId"      : lTableId,
                "colNums"      : lColNums,
                "pulledColumns": lColsToKeep,
                "rename"       : leftRenames
            };
            var rJoinInfo = {
                "tableId"      : rTableId,
                "colNums"      : rColNums,
                "pulledColumns": rColsToKeep,
                "rename"       : rightRenames
            };

            var options = {
                keepTables   : keepTable,
                formOpenTime : formOpenTime
            };

            JoinView.close();

            var startTime = Date.now();
            var origFormOpenTime = formOpenTime;

            xcFunction.join(joinType, lJoinInfo, rJoinInfo,
                            newTableName, options)
            .then(function(finalTableName) {
                innerDeferred.resolve(finalTableName);
            })
            .fail(function(error) {
                submissionFailHandler(origFormOpenTime, error);
                innerDeferred.reject();
            });

            return innerDeferred.promise();
        }

        function removeNoChanges(elem) {
            return (!(elem.orig === elem.new));
        }
    }

    //show alert to go back to op view
    function submissionFailHandler(origFormOpenTime, error) {
        if (error) {
            if (error === StatusTStr[StatusT.StatusCanceled] ||
                error.status === StatusT.StatusCanceled) {
                // no error message if failed because of cancel
                return;
            }
        }
        var showModifyBtn;
        var showDeleteTableBtn;
        if (formOpenTime !== origFormOpenTime) {
            // if they're not equal, the form has been opened before
            // and we can't show the modify join button
            showModifyBtn = false;
        } else {
            showModifyBtn = true;
        }

        var origMsg = $("#alertContent .text").text().trim();
        if (origMsg.length && origMsg[origMsg.length - 1] !== ".") {
            origMsg += ".";
        }
        if (origMsg.toLowerCase().indexOf('out of') > -1) {
            showDeleteTableBtn = true;
        } else {
            showDeleteTableBtn = false;
        }
        if (!showDeleteTableBtn && !showModifyBtn) {
            return;
        }
        var btns = [];
        var newMsg = origMsg;

        if (showModifyBtn) {
            if (origMsg.length) {
                newMsg += "\n";
            }
            newMsg += JoinTStr.ModifyDesc;

            btns.push({
                name: xcHelper.replaceMsg(OpModalTStr.ModifyBtn, {
                    name: JoinTStr.JOIN
                }),
                className: "",
                func     : function() {
                    JoinView.show(null , null , true);
                }
            });
        }
        if (showDeleteTableBtn) {
            btns.push({
                name     : MonitorTStr.RELEASEMEM,
                className: "larger",
                func     : DeleteTableModal.show
            });
        }

        var title = StatusMessageTStr.JoinFailedAlt;

        Alert.error(title, newMsg, {
            buttons: btns
        });
    }

    function autoResolveCollisions(clashes, suff, type,
                                   leftColsToKeep, rightColsToKeep,
                                   leftRenameOut, rightRenameOut) {
        var i;
        // Remove all leftColsToKeep from clashes
        var leftClashArray = xcHelper.deepCopy(clashes);
        var rightClashArray = xcHelper.deepCopy(clashes);

        for (i = 0; i < leftColsToKeep.length; i++) {
            var idx = leftClashArray.indexOf(leftColsToKeep[i]);
            if (idx > -1) {
                leftClashArray[idx] = undefined;
            }
        }

        for (i = 0; i < rightColsToKeep.length; i++) {
            var idx = rightClashArray.indexOf(rightColsToKeep[i]);
            if (idx > -1) {
                rightClashArray[idx] = undefined;
            }
        }

        // Now that we have undefed all columns that the user has selected,
        // for every idx where both left and right are there, we clear out the
        // right one and rename the left one
        // If both are undefed, this means that the user has resolved this
        // already do we don't have to do anything.
        // If only one is undefed, then we rename the other defined one

        for (i = 0; i < leftClashArray.length; i++) {
            var oldName;
            var newName;
            var renameMap;

            if (leftClashArray[i] === undefined) {
                if (rightClashArray[i] === undefined) {
                    // Both undefined, do nothing
                } else {
                    // Push right clash into rename
                    oldName = rightClashArray[i];
                    newName = rightClashArray[i] + "_" + suff;
                    renameMap = xcHelper.getJoinRenameMap(oldName, newName,
                                                          type);
                    rightRenameOut.push(renameMap);
                }
            } else {
                // For both cases where only left is def or both are def
                // we rename the left
                oldName = leftClashArray[i];
                newName = leftClashArray[i] + "_" + suff;
                renameMap = xcHelper.getJoinRenameMap(oldName, newName,
                                                      type);
                leftRenameOut.push(renameMap);
            }
        }
        return;
    }

    function addRenameRows($placeholder, renames) {
        for (var i = 0; i < renames.length; i++) {
            var $rename = $(FormHelper.Template.rename);
            $rename.find(".origName").val(renames[i]);
            $rename.insertBefore($placeholder);
        }
    }

    function addClause(noAnimation, tableId, colNum) {
        var $newClause = $(multiClauseTemplate);
        var tableIds = getTableIds();
        if (gTables[tableIds[0]]) {
            var $leftClause = $newClause.find(".leftClause");
            xcTooltip.remove($leftClause);
            $leftClause.attr("disabled", false).removeClass("inActive");
        }
        if (gTables[tableIds[1]]) {
            var $rightClause = $newClause.find(".rightClause");
            xcTooltip.remove($rightClause);
            $rightClause.attr("disabled", false).removeClass("inActive");
        }

        var $div = $newClause.insertBefore($joinView.find('.addClause'));
        if (tableId) {
            var progCol = gTables[tableId].getCol(colNum);
            var colName = progCol.getFrontColName(true);
            $div.find('.arg').eq(0).val(colName);
        } else if (gTables[tableIds[0]]) {
            $div.find('.arg').eq(0).focus();
        }

        if (!noAnimation) {
            $div.hide().slideDown(100);
        }
        formHelper.refreshTabbing();
    }

    function resetJoinView() {
        $clauseContainer.find(".joinClause").remove();
        $clauseContainer.find('.clause').val("");
        $joinView.find('.next').addClass('btn-disabled');
        $rightTableDropdown.find('.text').val("");
        activateClauseSection(0);
        deactivateClauseSection(1);
        isNextNew = true;

        updatePreviewText();
        $joinView.removeClass('nextStep');
        updateJoinTableName();
        resetRenames();
    }

    function updateJoinTableName() {
        var joinTableName = "";
        $joinTableName.val(joinTableName);
    }

    function fillTableLists(origTableId, refresh) {
        var tableLis = WSManager.getTableList();

        $leftTableDropdown.find('ul').html(tableLis);
        $rightTableDropdown.find('ul').html(tableLis);
        var tableName;

        if (refresh) {
            var leftTableName = $leftTableDropdown.find('.text').val();
            $leftTableDropdown.find('li').filter(function() {
                return ($(this).text() === leftTableName);
            }).addClass('selected');

            var rightTableName = $rightTableDropdown.find('.text').val();
            $rightTableDropdown.find('li').filter(function() {
                return ($(this).text() === rightTableName);
            }).addClass('selected');
        } else {
            // select li and fill left table name dropdown
            var tableName = gTables[origTableId].getName();
            $leftTableDropdown.find('.text').val(tableName);
            $leftTableDropdown.find('li').filter(function() {
                return ($(this).text() === tableName);
            }).addClass('selected');
        }
    }

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    function invalidMultiClauseTooltip($invalidClause) {
        var id = "#mainJoin .clauseContainer";
        var title = JoinTStr.InvalidClause;
        if ($invalidClause == null) {
            // when no clause to join
            $invalidClause = $clauseContainer.find(".joinClause").eq(0);
        }

        showErrorTooltip($invalidClause, {
            "title"    : title,
            "container": id
        });
    }


    function showErrorTooltip($el, options, otherOptions) {
        var deafultOptions = {
            "title"    : "",
            "placement": "top",
            "animation": true,
            "container": "body",
            "trigger"  : "manual",
            "template" : xcTooltip.Template.Error
        };
        otherOptions = otherOptions || {};
        var displayTime = otherOptions.time || 2000;

        options = $.extend(deafultOptions, options);

        xcTooltip.remove($el);
        // cannot overwrite previous title without removing the title attributes

        xcTooltip.transient($el, options, displayTime);
        $el.focus();
    }

    function suggestJoinKey(tableId, val, $inputToFill, suggTableId) {
        var col = gTables[tableId].getColByFrontName(val);
        if (!col) {
            return false;
        }
        var type = col.getType();
        var backColName = col.getBackColName();
        var frontColName = col.getFrontColName(); // not include prefix
        var colNum = gTables[tableId].getColNumByBackName(backColName);

        var context1 = contextCheck($('#xcTable-' + tableId), colNum, type);
        var colToSugg = null;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = -50;

        var $suggTable = $('#xcTable-' + suggTableId);
        var suggTable = gTables[suggTableId];
        $suggTable.find(".header").each(function(curColNum) {
            var $curTh = $(this);
            // 0 is rowMarker
            if (curColNum !== 0 && !$curTh.hasClass('dataCol') &&
                getType($curTh) === type) {
                var context2 = contextCheck($suggTable, curColNum, type);

                var curColName = suggTable.getCol(curColNum)
                                          .getFrontColName(true);
                var parsedName = xcHelper.parsePrefixColName(curColName).name;
                var dist = getTitleDistance(frontColName, parsedName);
                var score = getScore(context1, context2, dist, type);

                if (score > maxScore) {
                    maxScore = score;
                    colToSugg = curColName;
                }
            }
        });


        // if find the suggeest join key
        if (colToSugg != null) {
            $inputToFill.val(colToSugg);

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
        var words   = {};

        if (type === "string") {
            // Note: current way is hash each char and count frequency
            // change it if you have better way!
            context1.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket[value.charAt(i)] = true;
                }

                words[value] = words[value] || 0;
                words[value]++;
            });

            context2.vals.forEach(function(value) {
                for (var i = 0; i < value.length; i++) {
                    bucket2[value.charAt(i)] = true;
                }
                // when has whole word match
                if (words.hasOwnProperty(value)) {
                    match += 10 * words[value];
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

        name1 = xcHelper.parsePrefixColName(name1.toLowerCase()).name;
        name2 = xcHelper.parsePrefixColName(name2.toLowerCase()).name;

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

            // make sure a.length >= b.length to use O(min(n,m)) space, whatever
            // that is
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
        var lTableName = $leftTableDropdown.find(".text").val();
        var rTableName = $rightTableDropdown.find(".text").val();
        var previewText = '<span class="joinType keyword">' + joinType +
                          '</span> <span class="highlighted">' + lTableName +
                          '</span>, <span class="highlighted">' + rTableName +
                          '</span><br/><span class="keyword">ON </span>';
        var columnPairs = [];
        var pair;
        var lClause;
        var rClause;

        $joinView.find(".joinClause").each(function() {

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
                rightColText = '<span class="highlighted">' + columnPairs[i][1]+
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        JoinView.__testOnly__ = {};
        JoinView.__testOnly__.addClause = addClause;
        JoinView.__testOnly__.checkMatchingColTypes = checkMatchingColTypes;
        JoinView.__testOnly__.estimateJoinSize = estimateJoinSize;
        JoinView.__testOnly__.checkFirstView = checkFirstView;
        JoinView.__testOnly__.validTableNameChecker = validTableNameChecker;
        JoinView.__testOnly__.submitJoin = submitJoin;
    }
    /* End Of Unit Test Only */

    return (JoinView);
}(jQuery, {}));
