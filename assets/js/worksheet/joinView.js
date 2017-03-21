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

        setupRenameMenu($renameSection);

        var columnPicker = {
            "state": "joinState",
            "validColTypes": validTypes,
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
                        TblFunc.focusTable(getTableIds(index));
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
                xcHelper.centerFocusedTable(tableId, true);
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
                TblFunc.focusTable(tableId);
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
                    if (isFind === JoinKeySuggestion.KeyUnsure) {
                        showErrorTooltip($suggErrorArea, {
                            "title": JoinTStr.UnlikelyJoinKey,
                            "placement": "right"
                        });

                    } else if (isFind === JoinKeySuggestion.KeyNotFound) {
                        text = isLeftTableVal ? JoinTStr.NoMatchRight :
                                                JoinTStr.NoMatchLeft;
                        showErrorTooltip($suggErrorArea, {
                            "title": text,
                            "placement": "right"
                        });
                    }
                } else {
                    showErrorTooltip($suggErrorArea, {
                        "title": JoinTStr.NoColToCheck,
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
                    "title": title,
                    "placement": "right"
                });
            }

            checkNextBtn();
            updatePreviewText();
        });

        $renameSection.on("click", ".renameIcon", function() {
            var $colToRename = $(this).closest(".rename");
            smartRename($colToRename);
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
        StatusBox.forceHide();
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
        var colsInClause = getColsInClause();
        if (colsInClause == null) {
            return false;
        }

        var lCols = colsInClause.lCols;
        var rCols = colsInClause.rCols;
        var tableIds = getTableIds();
        var leftColRes = xcHelper.convertFrontColNamesToBack(lCols, tableIds[0],
                                                    validTypes);

        if (leftColRes.invalid) {
            columnErrorHandler('left', leftColRes, tableIds[0]);
            return false;
        } else {
            var rightColRes = xcHelper.convertFrontColNamesToBack(rCols,
                                                                  tableIds[1],
                                                                  validTypes);
            if (rightColRes.invalid) {
                columnErrorHandler('right', rightColRes, tableIds[1]);
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

    function getColsInClause(toGoBack) {
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

        var error = ($invalidClause != null || lCols.length === 0);
        if (error) {
            if (toGoBack) {
                // go back
                toggleNextView();
            }
            invalidMultiClauseTooltip($invalidClause);
            return null;
        }

        return {
            "lCols": lCols,
            "rCols": rCols
        };
    }

    function columnErrorHandler(side, colRes, tableId) {
        var errorText;
        var $clauseSection;
        var $input;
        var tooltipTime = 2000;

        if (side === "left") {
            $clauseSection = $clauseContainer.find('.joinClause .leftClause');
        } else {
            $clauseSection = $clauseContainer.find('.joinClause .rightClause');
        }

        $input = $clauseSection.filter(function() {
            return ($(this).val() === colRes.name);
        }).eq(0);

        if (colRes.reason === 'notFound') {
            var tableName = gTables[tableId].getName();
            errorText = xcHelper.replaceMsg(ErrWRepTStr.ColNotInTable, {
                "name": colRes.name,
                "table": tableName
            });
            tooltipTime = 3000;
        } else if (colRes.reason === "tableNotFound") {
            errorText = ErrTStr.SourceTableNotExists;
        } else if (colRes.reason === 'type') {
            errorText = xcHelper.replaceMsg(ErrWRepTStr.InvalidColType, {
                "name": colRes.name,
                "type": colRes.type
            });
        }
        showErrorTooltip($input, {"title": errorText}, {"time": tooltipTime});
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
                            types: [lType, rType],
                            row: i
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
                        types: [lType, rType],
                        row: i
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
            "leftLimit": 100,
            "rightLimit": 100,
            "joinType": $joinTypeSelect.find(".text").text(),
            "lCol": cols[0],
            "rCol": cols[1],
            "rTable": new XcSDK.Table(rTableName),
            "unlock": true,
            "fromJoin": true
        };

        var $estimatorWrap = $joinView.find('.estimatorWrap');
        $(".estimatorWrap .stats").show();
        $estimatorWrap.find('.min .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.med .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.max .value').text(JoinTStr.Estimating);
        $estimatorWrap.find('.title').text(JoinTStr.EstimatingJoin);
        $estimatorWrap.find('.value').empty();

        var extOptions = {
            noNotification: true,
            noSql: true
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
                "title": errorTitle,
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
                        '<span class="text tooltipOverflow" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' +
                            progCol.getFrontColName(true) + '">' +
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

        var deferred = jQuery.Deferred();

        formHelper.disableSubmit();

        joinSubmitHelper()
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(function() {
            formHelper.enableSubmit();
        });

        return deferred.promise();
    }


    function executeChecks($renames, $origNames, $newNames, origArray,
                           renameArray, isFatptr) {
        // Check that none are empty
        var isValid = true;
        $newNames.each(function(index) {
            var newName = $(this).val();
            if (newName.trim().length === 0) {
                error = ErrTStr.NoEmpty;
            } else if (isFatptr) {
                error = xcHelper.validatePrefixName(newName);
            } else {
                error = xcHelper.validateColName(newName);
            }

            if (error != null) {
                StatusBox.show(error, $renames.eq(index), true);
                // stop loop
                isValid = false;
                return false;
            }
        });

        if (!isValid) {
            return false;
        }

        $origNames.each(function(index) {
            var origName = $(this).val();
            var newName = $newNames.eq(index).val();
            var type = isFatptr
                       ? DfFieldTypeT.DfFatptr
                       : DfFieldTypeT.DfUnknown;
            renameArray.push({
                "orig": origName,
                "new": newName,
                "type": type
            });
        });

        for (var i = 0; i < $origNames.length; i++) {
            var index = origArray.indexOf(renameArray[i].orig);
            origArray[index] = renameArray[i].new;
        }

        return true;
    }

    function proceedWithJoin(lJoinInfo, rJoinInfo, joinKeyDataToSubmit) {
        var deferred = jQuery.Deferred();

        var joinType = $joinTypeSelect.find(".text").text();
        var newTableName = $joinTableName.val().trim();
        var keepTable = $joinView.find(".keepTablesCBWrap")
                        .find(".checkbox").hasClass("checked");

        var options = {
            "keepTables": keepTable,
            "formOpenTime": formOpenTime
        };

        JoinView.close();

        var origFormOpenTime = formOpenTime;

        xcFunction.join(joinType, lJoinInfo, rJoinInfo, newTableName, options)
        .then(function(finalTableName) {
            submitJoinKeyData(joinKeyDataToSubmit);
            deferred.resolve(finalTableName);
        })
        .fail(function(error) {
            submissionFailHandler(lJoinInfo.tableId, rJoinInfo.tableId,
                                  origFormOpenTime, error);
            deferred.reject();
        });

        return deferred.promise();
    }

    function joinSubmitHelper() {
        var colsInClause = getColsInClause(true);
        if (colsInClause == null) {
            return PromiseHelper.reject();
        }

        var lCols = colsInClause.lCols;
        var rCols = colsInClause.rCols;

        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];
        var lTable = gTables[lTableId];
        var rTable = gTables[rTableId];

        // Must collect joinKey data here in case old tables not kept
        var joinKeyDataToSubmit = prepJoinKeyDataSubmit(lCols, rCols,
                                                        lTableId, rTableId);
        // set up "joining on" columns
        var lColNums = getColNumFromName(lCols, lTable);
        var rColNums = getColNumFromName(rCols, rTable);
        // set up "keeping" columns
        var $lColLis = $joinView.find(".leftCols li.checked");
        var $rColLis = $joinView.find(".rightCols li.checked");
        var lColsToKeep = getColNameFromList($lColLis, lTable);
        var rColsToKeep = getColNameFromList($rColLis, rTable);

        var lJoinInfo = {
            "tableId": lTableId,
            "colNums": lColNums,
            "pulledColumns": lColsToKeep,
            "rename": null
        };
        var rJoinInfo = {
            "tableId": rTableId,
            "colNums": rColNums,
            "pulledColumns": rColsToKeep,
            "rename": null
        };

        // 1) We check whether the column name resolution is already there
        // 2) If it is, then we check whether the resolution is satisfactory.
        // 3) If it is, then we skip the checking and go straight to join
        // Else, we trigger the resolution again

        // XXX When a column is deselected or selected, we should only remove
        // that one column from prefix. Currently just going to remove all
        if ($renameSection.is(":visible")) {
            // Already in rename mode. Verify that the renames are correct
            var renameInfo = getAndCheckRenameMap(lColsToKeep, rColsToKeep);
            if (renameInfo == null) {
                return PromiseHelper.reject();
            }
            lJoinInfo.rename = renameInfo.lRename;
            rJoinInfo.rename = renameInfo.rRename;
            return proceedWithJoin(lJoinInfo, rJoinInfo, joinKeyDataToSubmit);
        }

        // Split valueAttrs into fatPtrs and immediates
        var lFatPtr = lTable.getFatPtrNames();
        var rFatPtr = rTable.getFatPtrNames();

        var lImmediate = lTable.getImmediateNames();
        var rImmediate = rTable.getImmediateNames();

        // Today we are only handing immediate collisions. Later we will
        // handle fatptr collisions and prefix renaming for those

        // Only keep column names since we are not doing anything with types
        lFatPtrCache = lFatPtr;
        rFatPtrCache = rFatPtr;
        lImmediatesCache = lImmediate;
        rImmediatesCache = rImmediate;

        // All fat ptrs are kept and will be renamed if they clash even if they
        // are not selected

        // If none of the columns collide are part of the user's selection
        // then we resolve it underneath the covers and let the user go
        allClashingFatPtrsCache = getNameCollision(lFatPtr, rFatPtr);
        var lFatPtrToRename = getUserChosenFatPtrCollision(lColsToKeep,
                                                            rColsToKeep);
        var rFatPtrToRename = xcHelper.deepCopy(lFatPtrToRename);

        allClashingImmediatesCache = getNameCollision(lImmediate, rImmediate);
        var lImmediatesToRename = allClashingImmediatesCache
                                  .filter(userChosenColCollision);
        var rImmediatesToRename = xcHelper.deepCopy(lImmediatesToRename);

        // Now that we have all the columns that we want to rename, we
        // display the columns and ask the user to rename them
        // XXX Remove when backend fixes their stuff
        if (!gTurnOnPrefix) {
            return proceedWithJoin(lJoinInfo, rJoinInfo, joinKeyDataToSubmit);
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
            autoResolveCollisions(allClashingImmediatesCache,
                                  suff,
                                  DfFieldTypeT.DfUnknown,
                                  lColsToKeep,
                                  rColsToKeep,
                                  leftAutoRenames,
                                  rightAutoRenames);

            autoResolveCollisions(allClashingFatPtrsCache,
                                  suff,
                                  DfFieldTypeT.DfFatptr,
                                  getPrefixes(lColsToKeep),
                                  getPrefixes(rColsToKeep),
                                  leftAutoRenames,
                                  rightAutoRenames);

            lJoinInfo.rename = leftAutoRenames;
            rJoinInfo.rename = rightAutoRenames;
            return proceedWithJoin(lJoinInfo, rJoinInfo, joinKeyDataToSubmit);
        }

        if (lImmediatesToRename.length > 0) {
            $("#leftTableRenames").show();
            addRenameRows($("#leftRenamePlaceholder"), lImmediatesToRename);
        }

        if (rImmediatesToRename.length > 0) {
            $("#rightTableRenames").show();
            addRenameRows($("#rightRenamePlaceholder"), rImmediatesToRename);
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

        // scroll to rename section
        $joinView.find(".mainContent").scrollTop(0);
        var renameTop = $renameSection.position().top -
                        $joinView.find("header .title").height();
        $joinView.find(".mainContent").scrollTop(renameTop);

        formHelper.refreshTabbing();
        return PromiseHelper.reject();

        function userChosenColCollision(colName) {
            if (lColsToKeep.indexOf(colName) > -1 &&
                rColsToKeep.indexOf(colName) > -1) {
                return true;
            } else {
                return false;
            }
        }
    }

    function getNameCollision(namesToCheck, namesToCompare) {
        var collisionNames = namesToCheck.filter(function(name) {
            return namesToCompare.includes(name);
        });
        return collisionNames;
    }

    function getUserChosenFatPtrCollision(lColsToKeep, rColsToKeep) {
        // Get all prefixes in lColsToKeep
        var leftPrefixes = getPrefixes(lColsToKeep);
        var rightPrefixes = getPrefixes(rColsToKeep);
        return getNameCollision(leftPrefixes, rightPrefixes);
    }

    function getAndCheckRenameMap(lColsToKeep, rColsToKeep) {
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

            return null;
        }

        // Cross check between left and right fat ptrs on whether they
        // still clash
        if (!crossRenameCheck($leftFatRenames, lFatPtr, rFatPtr) ||
            !crossRenameCheck($rightFatRenames, rFatPtr, lFatPtr))
        {
            return null;
        }

        // Cross check between left and right immediates on whether they
        // still clash
        if (!crossRenameCheck($leftRenames, lImmediates, rImmediates, true) ||
            !crossRenameCheck($rightRenames, rImmediates, lImmediates, true))
        {
            return null;
        }

        // Dedup left and right rename arrays since checks are all passed
        leftRenameArray = leftRenameArray.filter(removeNoChanges);
        rightRenameArray = rightRenameArray.filter(removeNoChanges);
        leftFatRenameArray = leftFatRenameArray.filter(removeNoChanges);
        rightFatRenameArray = rightFatRenameArray.filter(removeNoChanges);

        // Remove user's renames from autoRename array and auto rename the rest
        var suff = Math.floor(Math.random() * 1000);
        autoResolveCollisions(allClashingImmediatesCache,
                              suff,
                              DfFieldTypeT.DfUnknown,
                              lColsToKeep,
                              rColsToKeep,
                              leftRenameArray,
                              rightRenameArray);

        autoResolveCollisions(allClashingFatPtrsCache,
                              suff,
                              DfFieldTypeT.DfFatptr,
                              getPrefixes(lColsToKeep),
                              getPrefixes(rColsToKeep),
                              leftFatRenameArray,
                              rightFatRenameArray);

        leftRenameArray = leftRenameArray.concat(leftFatRenameArray);
        rightRenameArray = rightRenameArray.concat(rightFatRenameArray);

        return {
            "lRename": leftRenameArray,
            "rRename": rightRenameArray
        };
    }

    function crossRenameCheck($renames, renameList, pairRenameList, immediate) {
        var $invalidEle = null;

        for (var i = 0, len = $renames.length; i < len; i++) {
            var $rename = $renames.eq(i);
            var newName = $rename.find(".newName").val();
            if (pairRenameList.includes(newName)) {
                $invalidEle = $rename;
                break;
            }
            var firstIdx = renameList.indexOf(newName);
            if (renameList.includes(newName, firstIdx + 1)) {
                $invalidEle = $rename;
                break;
            }
        }

        if ($invalidEle != null) {
            var error = immediate
                        ? ErrTStr.ColumnConflict
                        : ErrTStr.PrefixConflict;
            StatusBox.show(error, $invalidEle, true);
            return false;
        } else {
            return true;
        }
    }

    function removeNoChanges(elem) {
        return (elem.orig !== elem.new);
    }

    function getPrefixes(array) {
        // Given an array of column names, extract all unique prefixes
        var prefixes = [];
        for (var i = 0; i < array.length; i++) {
            var colNameParts = array[i].split("::");
            if (colNameParts.length < 2) {
                continue;
            }
            if (!prefixes.includes(colNameParts[0])) {
                prefixes.push(colNameParts[0]);
            }
        }
        return prefixes;
    }

    function getColNumFromName(cols, table) {
        var colNums = cols.map(function(colName) {
            var progCol = table.getColByFrontName(colName);
            return table.getColNumByBackName(progCol.getBackColName());
        });
        return colNums;
    }

    function getColNameFromList($colLis, table) {
        var colsToKeep = [];
        $colLis.each(function(i) {
            var name = $(this).text();
            var progCol = table.getColByFrontName(name);
            colsToKeep[i] = progCol.getBackColName();
        });
        return colsToKeep;
    }

    function prepJoinKeyDataSubmit(lCols, rCols, lTableId, rTableId) {
        var dataPerClause = [];
        // Iterate over each clause, treating every pair of left|right clause
        // as a completely independent data point.
        try {
            for (var i = 0; i < lCols.length; i++) {
                var curSrcBackName = lCols[i];
                var curDestBackName = rCols[i];
                var joinKeyInputs = getJoinKeyInputs(lTableId,
                                                    curSrcBackName,
                                                    rTableId);
                var dataToSubmit = xcSuggest.processJoinKeySubmitData(
                                                            joinKeyInputs,
                                                            curDestBackName);
                if (!dataToSubmit.isValid) {
                    console.log("Tried to submit invalid mlInputData:",
                                JSON.stringify(dataToSubmit));
                    return null;
                } else {
                    dataPerClause.push(dataToSubmit);
                }
            }
        } catch (err) {
            console.error("Failed to prep join key data with err:", err);
            return null;
        }

        return dataPerClause;
    }

    function submitJoinKeyData(joinKeyDataToSubmit) {
        // Submit data for data collection
        try {
            if (joinKeyDataToSubmit) {
                xcSuggest.submitJoinKeyData(joinKeyDataToSubmit);
            }
        } catch (err) {
            console.log("Submit Join Key Data failed with error: " + err);
        }
    }

    //show alert to go back to op view
    function submissionFailHandler(lTableId, rTableId, origFormOpenTime,
                                   error) {
        if (error) {
            if (error === StatusTStr[StatusT.StatusCanceled] ||
                error.status === StatusT.StatusCanceled) {
                // no error message if failed because of cancel
                return;
            }
        }

        var btns = [];
        var newMsg = $("#alertContent .text").text().trim();
        if (typeof error === "object" &&
            error.status === StatusT.StatusMaxJoinFieldsExceeded) {
            // show project buttons

            newMsg += "\n" + ErrTStr.SuggestProject;

            btns.push({
                name: "Project Left Table",
                className: "larger",
                func: function() {
                    projectSelect(lTableId);
                }
            });

            btns.push({
                name: "Project Right Table",
                className: "larger",
                func: function() {
                    projectSelect(rTableId);
                }
            });
        } else {
            // show modify and/or delete tables modal button
            var showModifyBtn = formOpenTime === origFormOpenTime;
            // if they're not equal, the form has been opened before
            // and we can't show the modify join button
            var showDeleteTableBtn = newMsg.toLowerCase()
                                           .indexOf('out of') > -1;

            if (!showDeleteTableBtn && !showModifyBtn) {
                return;
            }

            if (newMsg.length && newMsg[newMsg.length - 1] !== ".") {
                newMsg += ".";
            }

            if (showModifyBtn) {
                if (newMsg.length) {
                    newMsg += "\n";
                }
                newMsg += JoinTStr.ModifyDesc;

                btns.push({
                    name: xcHelper.replaceMsg(OpModalTStr.ModifyBtn, {
                        name: JoinTStr.JOIN
                    }),
                    className: "",
                    func: function() {
                        focusOnTable(rTableId);
                        JoinView.show(null , null , true);
                        StatusMessage.removePopups();
                    }
                });
            }
            if (showDeleteTableBtn) {
                btns.push({
                    name: MonitorTStr.RELEASEMEM,
                    className: "larger",
                    func: DeleteTableModal.show
                });
            }
        }

        Alert.error(StatusMessageTStr.JoinFailedAlt, newMsg, {
            buttons: btns
        });

        function projectSelect(tableId) {
            focusOnTable(tableId);
            var rowNum = RowScroller.getFirstVisibleRowNum(tableId);
            var $td = $("#xcTable-" + tableId)
                        .find(".row" + (rowNum - 1))
                        .find('.jsonElement');
            StatusMessage.removePopups();
            JSONModal.show($td, {saveModeOff: true});
            $("#jsonModal .projectionOpt").trigger(fakeEvent.mouseup);
        }

        function focusOnTable(tableId) {
            if (!$("#workspaceTab").hasClass("active")) {
                $('#workspaceTab').click();
            }
            var ws = WSManager.getWSFromTable(tableId);
            WSManager.focusOnWorksheet(ws, false, tableId);
            xcHelper.centerFocusedTable(tableId, false, {
                onlyIfOffScreen: true
            });
        }
    }

    function autoResolveCollisions(clashes, suff, type,
                                   leftColsToKeep, rightColsToKeep,
                                   leftRenameOut, rightRenameOut) {
        var i;
        var idx;
        // Remove all leftColsToKeep from clashes
        var leftClashArray = xcHelper.deepCopy(clashes);
        var rightClashArray = xcHelper.deepCopy(clashes);

        for (i = 0; i < leftColsToKeep.length; i++) {
            idx = leftClashArray.indexOf(leftColsToKeep[i]);
            if (idx > -1) {
                leftClashArray[idx] = undefined;
            }
        }

        for (i = 0; i < rightColsToKeep.length; i++) {
            idx = rightClashArray.indexOf(rightColsToKeep[i]);
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

    function invalidMultiClauseTooltip($invalidClause) {
        var id = "#mainJoin .clauseContainer";
        var title = JoinTStr.InvalidClause;
        if ($invalidClause == null) {
            // when no clause to join
            $invalidClause = $clauseContainer.find(".joinClause").eq(0);
        }

        showErrorTooltip($invalidClause, {
            "title": title,
            "container": id
        });
    }


    function showErrorTooltip($el, options, otherOptions) {
        var deafultOptions = {
            "title": "",
            "placement": "top",
            "animation": true,
            "container": "body",
            "trigger": "manual",
            "template": xcTooltip.Template.Error
        };
        otherOptions = otherOptions || {};
        var displayTime = otherOptions.time || 2000;

        options = $.extend(deafultOptions, options);

        xcTooltip.remove($el);
        // cannot overwrite previous title without removing the title attributes

        xcTooltip.transient($el, options, displayTime);
        $el.focus();
    }

    function getColInputs(tableId, backColName) {
        var col = gTables[tableId].getColByBackName(backColName);
        if (!col) {
            return null;
        }
        var type = col.getType();
        var frontColName = col.getFrontColName();

        var colNum = gTables[tableId].getColNumByBackName(backColName);
        var data = gTables[tableId].getColContents(colNum);
        var requiredInfo = {
            'type': type,
            'name': frontColName,
            'data': data,
            'uniqueIdentifier': backColName // Only IDs chosen result
        };
        return requiredInfo;
    }

    function getJoinKeyInputs(tableId, val, suggTableId) {
        var srcInfo = getColInputs(tableId, val);
        var destInfo = [];
        var suggTable = gTables[suggTableId];
        var suggCols = suggTable.getAllCols();
        for (var i = 0; i < suggCols.length; i++) {
            if (!suggCols[i].isDATACol()) {
                var result = getColInputs(suggTableId,
                    suggCols[i].getBackColName());
                if (result !== null) {
                    destInfo.push(result);
                }
            }
        }
        var inputs = {
            'srcColInfo': srcInfo,
            'destColsInfo': destInfo
        };
        return inputs;
    }

    function suggestJoinKey(tableId, val, $inputToFill, suggTableId) {
        var inputs = getJoinKeyInputs(tableId, val, suggTableId);

        var suggestion = xcSuggest.suggestJoinKey(inputs);
        // NOTE: Heuristic score on range of all ints,
        // but ML score on range of -100 to 0;
        var thresholdScore = -50;

        if (suggestion.colToSugg !== null) {
            $inputToFill.val(suggestion.colToSugg);

            if (thresholdScore > suggestion.maxScore) {
                return JoinKeySuggestion.KeyUnsure;
            }
            return JoinKeySuggestion.KeySuggested;
        }
        return JoinKeySuggestion.KeyNotFound;
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

    function smartRename($colToRename) {
        var origName = $colToRename.find(".origName").val();
        var $tableRenames = $colToRename.closest(".tableRenames");
        var $siblTableRenamse;

        switch ($tableRenames.attr("id")) {
            case "lFatPtrRenames":
                $siblTableRenamse = $("#rFatPtrRenames");
                break;
            case "rFatPtrRenames":
                $siblTableRenamse = $("#lFatPtrRenames");
                break;
            case "leftTableRenames":
                $siblTableRenamse = $("#rightTableRenames");
                break;
            case "rightTableRenames":
                $siblTableRenamse = $("#leftTableRenames");
                break;
            default:
                console.error("error case");
                $colToRename.find(".newName").val(origName);
                return;
        }

        var nameMap = {};
        var maxTry = 0;
        var $inputs = $colToRename.siblings(".rename")
                      .add($siblTableRenamse.find(".rename"));

        $inputs.each(function() {
            var newName = $(this).find(".newName").val().trim();
            if (newName) {
                maxTry++;
                nameMap[newName] = true;
            }
        });
        var newName = xcHelper.autoName(origName, nameMap, maxTry);
        $colToRename.find(".newName").val(newName);
    }

    function setupRenameMenu($renameSection) {
        $renameSection.find(".menu").each(function() {
            xcMenu.add($(this), {"keepOpen": true});
        });

        $renameSection.on("click", ".option", function(event) {
            var $target = $(event.target);
            var $menu = $target.closest(".optionWrap").find(".menu");
            $menu.find("input").val("");

            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": 0, "y": -71},
                "floating": true
            });
            return false;
        });

        $renameSection.on("click", ".copyAll", function() {
            if (event.which !== 1) {
                return;
            }
            var $section = $(this).closest(".tableRenames");
            copyInRename($section);
        });

        $renameSection.on("click", ".copyAppend", function() {
            if (event.which !== 1) {
                return;
            }
            $(this).find("input").focus();
        });

        $renameSection.on("input", ".copyAppend input", function() {
            var $input = $(this);
            var $section = $input.closest(".tableRenames");
            var suffix = $input.val();
            copyInRename($section, suffix);
        });
    }

    function copyInRename($section, suffix) {
        $section.find(".rename").each(function() {
            var $el = $(this);
            var val = $el.find(".origName").val();
            if (suffix != null) {
                val += suffix;
            }
            $el.find(".newName").val(val);
        });
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
        JoinView.__testOnly__.submissionFailHandler = submissionFailHandler;
        JoinView.__testOnly__.deactivateClauseSection = deactivateClauseSection;
        JoinView.__testOnly__.autoResolveCollisions = autoResolveCollisions;
        JoinView.__testOnly__.smartRename = smartRename;

    }
    /* End Of Unit Test Only */

    return (JoinView);
}(jQuery, {}));
