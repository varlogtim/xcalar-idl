window.JoinView = (function($, JoinView) {
    var $joinView;      // $("#joinView")
    var $leftTableDropdown;  // $('#joinLeftTableList');
    var $rightTableDropdown;  // $('#joinRightTableList');
    var $joinTypeSelect;     // $("#joinType")
    var $joinTableName;  // $("#joinTableNameInput")
    var $clauseContainer;   // $("#mainJoin").find('.clauseContainer');
    var $lastInputFocused;
    var $renameSection; // $("#joinView .renameSection")
    var needsNextStepUpdate = true; // if true, will reset join estimator
                          // and redisplay columns list
    var joinEstimatorType = "inner"; // if user changes join type,
                                     // rerun estimator
    var lImmediatesCache;
    var rImmediatesCache;
    var lFatPtrCache;
    var rFatPtrCache;
    var allClashingImmediatesCache;
    var allClashingFatPtrsCache;
    var lastSideClicked; // for column selector ("left" or "right")
    var focusedListNum;
    var focusedThNum;
    var isEditMode;
    var lTable;
    var rTable;

    var validTypes = [ColumnType.integer, ColumnType.float, ColumnType.string,
                      ColumnType.boolean];

    var formHelper;
    var multiClauseTemplate =
        '<div class="joinClause multi">' +
            '<div class="castRow clearfix">' +
                '<div class="cast leftCast new">' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list">' +
                            '<li class="default">' + CommonTxtTstr.Default +
                            '</li>' +
                            '<li>' + ColumnType.boolean + '</li>' +
                            '<li>' + ColumnType.integer + '</li>' +
                            '<li>' + ColumnType.float + '</li>' +
                            '<li>' + ColumnType.string + '</li>' +
                        '</ul>' +
                    '</div>' +
                '</div>' +
                '<div class="cast rightCast new">' +
                    '<div class="dropDownList hidden">' +
                        '<input class="text nonEditable" value="default"' +
                            ' disabled>' +
                        '<div class="iconWrapper dropdown">' +
                            '<i class="icon xi-arrow-down"></i>' +
                        '</div>' +
                        '<ul class="list">' +
                            '<li class="default">' + CommonTxtTstr.Default +
                            '</li>' +
                            '<li>' + ColumnType.boolean + '</li>' +
                            '<li>' + ColumnType.integer + '</li>' +
                            '<li>' + ColumnType.float + '</li>' +
                            '<li>' + ColumnType.string + '</li>' +
                        '</ul>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="clauseRow clearfix">' +
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
            '</div>' +
        '</div>';
    var JoinKeySuggestion = {
        KeySuggested: 0,
        KeyUnsure: 1,
        KeyNotFound: 2
    };

    JoinView.setup = function () {
        $joinView = $("#joinView");
        $leftTableDropdown = $('#joinLeftTableList');
        $rightTableDropdown = $('#joinRightTableList');
        $joinTypeSelect = $("#joinType");
        $joinTableName = $("#joinTableNameInput");
        $clauseContainer = $("#mainJoin").find('.clauseContainer');
        $renameSection = $("#joinView .renameSection");

        $clauseContainer.find(".colSelectInstr").html(JoinTStr.ColSelectInstr);
        // ****** actions available in BOTH steps of the join form

        var columnPicker = {
            "state": "joinState",
            "validColTypes": validTypes,
            "validTypeException": function() {
                return $joinView.hasClass("nextStep");
            },
            "colCallback": function($target, event) {
                if ($joinView.hasClass("nextStep")) {
                    colHeaderClick($target, event);
                } else {
                    if ($lastInputFocused &&
                        !$lastInputFocused.closest('.joinTableList').length) {
                        xcHelper.fillInputFromCell($target, $lastInputFocused);
                    }
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
                    xcHelper.fillInputFromCell($target, $lastInputFocused, "",
                        {type: "table"});
                    var index = $joinView.find('.joinTableList')
                                         .index($joinTableList);
                    var newTableName = $lastInputFocused.val();
                    if (originalText !== newTableName) {
                        $joinView.find('.joinClause').each(function() {
                            $(this).find('.clause').eq(index).val("");
                        });

                        TblFunc.focusTable(getTableIds(index));
                        $lastInputFocused.trigger("change");
                        $joinView.find('.clause').eq(index).focus();
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

        // ****** actions available in FIRST step

        // join type menu
        var joinTypeList = new MenuHelper($joinTypeSelect, {
            "onSelect": function($li) {
                var joinType = $li.text();
                var $input = $joinTypeSelect.find(".text");
                var prevType = $input.text();
                var tableIds;
                $input.text(joinType);
                updatePreviewText();
                checkNextBtn();

                // the following toggles all column selection and deselection
                // for the left and right tables
                // based on switching the join type from nonsemi -> semi
                // or semi - nonsemi
                // if previous and current type were semi then
                // check if leftsemi -> rightsemi or rightsemi-> left semi
                // and de/select appropriate table columns
                if (prevType !== joinType) {
                    var tableId;
                    // from non semi to semi - deselect right table cols
                    if (prevType.indexOf("Semi") === -1 &&
                        joinType.indexOf("Semi") > -1) {

                        if (isLeftSemiJoin()) {
                            tableId = getTableIds(1);
                        } else {
                            tableId = getTableIds(0);
                        }
                        if (gTables[tableId]) {
                            deselectAllTableCols(tableId);
                            needsNextStepUpdate = true;
                        }
                        // from semi to non semi - select right table cols
                    } else if (prevType.indexOf("Semi") > -1 &&
                                joinType.indexOf("Semi") === -1) {
                        if (prevType.indexOf("Left") > -1) {
                            tableId = getTableIds(1);
                        } else {
                            tableId = getTableIds(0);
                        }
                        if (gTables[tableId]) {
                            selectAllTableCols(gTables[tableId]);
                            needsNextStepUpdate = true;
                        }
                    } else if (joinType.indexOf("Semi") > -1) { // semi -> semi
                        if (prevType.indexOf("Right") === -1 &&
                            joinType.indexOf("Right") > -1) {
                            tableIds = getTableIds();
                            if (gTables[tableIds[0]]) {
                                deselectAllTableCols(tableIds[0]);
                                needsNextStepUpdate = true;
                            }
                            if (gTables[tableIds[1]]) {
                                selectAllTableCols(gTables[tableIds[1]]);
                                needsNextStepUpdate = true;
                            }
                        } else if (prevType.indexOf("Left") === -1 &&
                            joinType.indexOf("Left") > -1) {
                            tableIds = getTableIds();
                            if (gTables[tableIds[0]]) {
                                selectAllTableCols(gTables[tableIds[0]]);
                                needsNextStepUpdate = true;
                            }
                            if (gTables[tableIds[1]]) {
                                deselectAllTableCols(tableIds[1]);
                                needsNextStepUpdate = true;
                            }
                        }
                    }
                }
                if (isCrossJoin()) {
                    $joinView.addClass("crossJoin");
                    $clauseContainer.find(".colSelectInstr")
                                    .html(JoinTStr.ColSelectInstrCross);
                } else {
                    $joinView.removeClass("crossJoin");
                    $clauseContainer.find(".colSelectInstr")
                                    .html(JoinTStr.ColSelectInstr);
                }
            }
        });

        joinTypeList.setupListeners();

        var leftTableList = new MenuHelper($leftTableDropdown, {
            "onOpen": function() {
                fillTableLists(true);
            },
            "onSelect": function($li) {
                tableListSelect($li, 0);
            }
        });
        leftTableList.setupListeners();

        var rightTableList = new MenuHelper($rightTableDropdown, {
            "onOpen": function() {
                fillTableLists(true);
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
                $textBox.trigger("change");
                var tableId = getTableIds(index);
                xcHelper.centerFocusedTable(tableId, true, {noClear: true});
            }
        }

        $joinView.find('.tableListSections .focusTable').click(function() {
            var tableIds = getTableIds();
            var index = $joinView.find('.tableListSections .focusTable')
                                 .index($(this));
            var tableId = tableIds[index];
            xcHelper.centerFocusedTable(tableId, true);
        });

        $joinView.on('focus', '.tableListSection .arg', function() {
            $lastInputFocused = $(this);
        });

        // change table name
        $joinView.on('change', '.tableListSection .arg', function() {
            var index = $joinView.find('.tableListSection .arg').index($(this));
            $joinView.find('.joinClause').each(function() {
                $(this).find('.clause').eq(index).val("");
            });
            var tableId;
            var tableName;
            if (index === 0) {
                tableName = $leftTableDropdown.find('.text').val();
                tableId = xcHelper.getTableId(tableName);
                lTable = gTables[tableId];
                if (!lTable) {
                    lTable = gDroppedTables[tableId];
                }
            } else {
                tableName = $rightTableDropdown.find('.text').val();
                tableId = xcHelper.getTableId(tableName);
                rTable = gTables[tableId];
                if (!rTable) {
                    rTable = gDroppedTables[tableId];
                }
            }

            checkNextBtn();
            updatePreviewText();
            var tableIds = getTableIds();
            var prev = $(this).data("val");
            var prevId = xcHelper.getTableId(prev);
            if (gTables[prevId] && prevId !== tableIds[0] &&
                prevId !== tableIds[1]) {
                deselectAllTableCols(prevId, true);
            }

            tableId = tableIds[index];
            if (gTables[tableId]) {
                var table = gTables[tableId];
                TblFunc.focusTable(tableId);
                activateClauseSection(index);
                $joinView.find('.clause').eq(index).focus();
                if (isSemiJoin()) {
                    if (isLeftSemiJoin()) {
                        if (index === 0) {
                            selectAllTableCols(table);
                        }
                    } else if (index === 1) {
                        selectAllTableCols(table);
                    }
                } else {
                    selectAllTableCols(table);
                }

            } else {
                deactivateClauseSection(index);
            }
            $(this).data("val", $(this).val());
            if (isCrossJoin()) {
                // usually checkNextButton() detects if next step needs
                // an update but not if crossJoin
                needsNextStepUpdate = true;
            }
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
                                                $inputToFill);
                    if (isFind === JoinKeySuggestion.KeyUnsure) {
                        showErrorTooltip($suggErrorArea, {
                            "title": JoinTStr.UnlikelyJoinKey,
                            "placement": "right"
                        });

                    } else if (isFind === JoinKeySuggestion.KeyNotFound) {
                        var text;
                        if (tableId === suggTableId) {
                            text = JoinTStr.NoMatchSelf;
                        } else {
                            text = isLeftTableVal ? JoinTStr.NoMatchRight :
                                                     JoinTStr.NoMatchLeft;
                        }
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

        // cross join only
        $joinView.on('input', ".crossJoinFilter input", function() {
            updatePreviewText();
            resetJoinEstimator();
        });

        // clause section
        $joinView.on('focus', '.clause', function() {
            $lastInputFocused = $(this);
        });
        $joinView.on('input', '.clause', function(event, other) {
            var delay = true;
            if (other && other.insertText) {
                delay = false;
            }
            updatePreviewText(delay);
            checkNextBtn();
            needsNextStepUpdate = true;
        });
        $joinView.on('change', '.clause', function() {
            updatePreviewText();
            checkNextBtn();
            needsNextStepUpdate = true;
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
                    needsNextStepUpdate = true;
                }
            }
        });

        addCastDropDownListener();


        // ***** actions available in SECOND step

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
            var tIdx = isLeftSide ? 0 : 1;
            var tableId = getTableIds(tIdx);

            if (toShift && focusedListNum != null) {
                var start = Math.min(focusedListNum, colNum);
                var end = Math.max(focusedListNum, colNum);

                for (var i = start; i <= end; i++) {
                    if (toHighlight) {
                        selectCol(i, $colList, tableId);
                    } else {
                        deselectCol(i, $colList, tableId);
                    }
                }
            } else {
                if (toHighlight) {
                    selectCol(colNum, $colList, tableId);
                } else {
                    deselectCol(colNum, $colList, tableId);
                }
            }

            if (isLeftSide) {
                lastSideClicked = "left";
            } else {
                lastSideClicked = "right";
            }

            focusedListNum = colNum;
            focusedThNum = null;

            resetRenames();
        });

        $joinView.find('.selectAll').on('click', function() {
            var $checkbox = $(this);
            var index = $joinView.find('.selectAll').index($checkbox);
            var tableId = getTableIds(index);
            toggleAllCols(!$checkbox.hasClass("checked"), tableId, index);
        });

        setupRenameMenu($renameSection);

        $renameSection.on("click", ".renameIcon", function() {
            var $colToRename = $(this).closest(".rename");
            smartRename($colToRename);
        });

        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();
            submitForm();
        });
    };

    // restore user saved preferences
    JoinView.restore = function() {
        var keepJoinTables = UserSettings.getPref('keepJoinTables');
        if (keepJoinTables) {
            $joinView.find('.keepTablesCBWrap .checkbox').addClass('checked');
        }
    };

    JoinView.show = function(tableId, colNums, options) {
        if (formHelper.isOpen()) {
            return;
        }
        options = options || {};
        var restoreTime = options.restoreTime;
        var restore = options.restore;
        if (restoreTime && restoreTime !== formHelper.getOpenTime()) {
            // if restoreTime and formOpenTime do not match, it means we're
            // trying to restore a form to a state that's already been
            // overwritten
            return;
        }
        formHelper.showView();
        updateFormTitles(options);

        isEditMode = options.prefill ? true : false;
        if (options.prefill) {
            if (options.prefill.isLeftDroppedTable) {
                lTable = gDroppedTables[tableId];
            } else {
                lTable = gTables[tableId];
            }

            var rTName = options.prefill.rightTable;
            var rTId = xcHelper.getTableId(rTName);

            if (options.prefill.isRightDroppedTable) {
                rTable = gDroppedTables[rTId];
            } else {
                rTable = gTables[rTId];
            }
        } else if (!restore) {
            lTable = gTables[tableId];
        }

        if (restore) {
            if ($joinView.hasClass('nextStep')) {
                $("#container").addClass("joinState2");
            }
            updatePreviewText();
            restoreSelectedTableCols();
        } else {
            resetJoinView();
            fillTableLists();
            for (var i = 0; i < colNums.length; i++) {
                addClause(true, tableId, colNums[i]);
            }
            updatePreviewText();
            if (!DagEdit.isEditMode()) {
                $rightTableDropdown.find("input").focus();
            }
        }

        if (options.prefill) {
            restorePrefill(options.prefill);
        }

        formHelper.setup();

        $("body").on("keypress.joinModal", function(event) {
            switch (event.which) {
                case keyCode.Enter:
                    // when focus on a button, no trigger
                    if (formHelper.checkBtnFocus()) {
                        return;
                    }
                    if ($(event.target).is("#rowInput")) {
                        return;
                    }
                    if (!$joinView.is(":visible")) {
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

    function restorePrefill(options) {
        $rightTableDropdown.find('.text').val(options.rightTable);
        $rightTableDropdown.find('.text').data("val", options.rightTable);
        $rightTableDropdown.find('li').filter(function() {
            return ($(this).text() === options.rightTable);
        }).addClass('selected');

        selectAllTableCols(rTable);

        for (var i = 0; i < options.srcCols.left.length; i++) {
            var cols =  [options.srcCols.left[i], options.srcCols.right[i]];
            addClause(true, null, null, cols);
        }

        var joinTextMap = {
            "innerJoin": "Inner Join",
            "leftJoin": "Left Outer Join",
            "rightJoin": "Right Outer Join",
            "fullOuterJoin": "Full Outer Join",
            "crossJoin": "Cross Join"
        };
        var joinType = joinTextMap[options.joinType];
        $joinTypeSelect.find("li").filter(function() {
            return $(this).text() === joinType;
        }).trigger(fakeEvent.mouseup);

        $joinTableName.val(options.dest);

        $joinView.find(".crossJoinFilter input").val(options.evalString);
        updatePreviewText();
    }

    JoinView.close = function() {
        if (!formHelper.isOpen()) {
            return;
        }

        lastSideClicked = null;
        focusedListNum = null;
        focusedThNum = null;
        formHelper.hideView();
        formHelper.clear();
        $("body").off(".joinModal");
        $lastInputFocused = null;
        $(".xcTableWrap").find('.modalHighlighted')
                         .removeClass('modalHighlighted');
        $("#container").removeClass("joinState2");
        $(".xcTable").find(".formColNum").remove();
    };

    JoinView.updateColumns = function() {
        if (!formHelper.isOpen()) {
            return;
        }
        lastSideClicked = null;
        focusedListNum = null;
        focusedThNum = null;
        needsNextStepUpdate = true;
        displayAllColumnsList();
        resetRenames();
    };

    function addCastDropDownListener() {
        var $lists = $joinView.find(".cast.new .dropDownList");
        $lists.closest('.cast.new').removeClass('new');
        var castList = new MenuHelper($lists, {
            "onOpen": function() {
                StatusBox.forceHide();
            },
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                var type   = $li.text();
                var casted;

                $input.val(type);
                if (type === "default") {
                    casted = false;
                } else {
                    casted = true;
                }
                $input.attr("data-casted", casted);
                var index = $lists.index($list.parent());
                $list.closest(".joinClause").find(".clause").eq(index)
                                            .data('casted', casted)
                                            .data('casttype', type);
                StatusBox.forceHide();
            },
            "container": "#joinView"
        });
        castList.setupListeners();
    }

    function selectCol(colNum, $colList, tableId) {
        if (!gTables[tableId]) {
            return;
        }
        var $table = $("#xcTable-" + tableId);
        $table.find(".col" + colNum).addClass("modalHighlighted");
        $colList.find('li[data-colnum="' + colNum + '"]')
                .addClass('checked')
                .find('.checkbox').addClass('checked');

        var $lis = $colList.find("li");
        if ($lis.length === $lis.filter(".checked").length) {
            if ($colList.hasClass('leftCols')) {
                $joinView.find('.leftColHeading .selectAll')
                         .addClass('checked');
            } else {
                $joinView.find('.rightColHeading .selectAll')
                         .addClass('checked');
            }
        }
    }

    function deselectCol(colNum, $colList, tableId) {
        var $table = $("#xcTable-" + tableId);
        var tableIds = getTableIds();

        $colList.find('li[data-colnum="' + colNum + '"]')
                .removeClass('checked')
                .find('.checkbox').removeClass('checked');

        // self join
        if (tableIds[0] === tableIds[1]) {
            var $sibList = $colList.siblings("ul");
            if ($sibList.find('li[data-colnum="' + colNum + '"]')
                .hasClass("checked")) {
                return;
            }
        }
        $table.find(".col" + colNum).removeClass("modalHighlighted");
        var $lis = $colList.find("li");
        if (!$lis.filter(".checked").length) {
            if ($colList.hasClass('leftCols')) {
                $joinView.find('.leftColHeading .selectAll')
                         .removeClass('checked');
            } else {
                $joinView.find('.rightColHeading .selectAll')
                         .removeClass('checked');
            }
        }
    }

    function toggleAllCols(selectAll, tableId, index) {
        var $colList = $joinView.find('.columnsWrap ul').eq(index);
        var $checkbox  = $joinView.find(".selectAll").eq(index);

        if (selectAll) {
            $checkbox.addClass('checked');
            $colList.find('li').addClass('checked')
                  .find('.checkbox').addClass('checked');
            selectAllTableCols(gTables[tableId]);
        } else {
            $checkbox.removeClass('checked');
            $colList.find('li').removeClass('checked')
                 .find('.checkbox').removeClass('checked');
            var tableIds = getTableIds();
            if (tableIds[0] === tableIds[1]) {
                var $sibList = $colList.siblings("ul");
                var $table = $("#xcTable-" + tableId);
                $sibList.find("li:not(.checked)").each(function() {
                    var colNum = $(this).data("colnum");
                    $table.find(".col" + colNum)
                           .removeClass("modalHighlighted");
                });
            }
            deselectAllTableCols(tableId);
        }

        resetRenames();
    }

    function selectAllTableCols(table) {
        var tableId = table.getId();
        var $table = $("#xcTable-" + tableId);
        var allCols = table.getAllCols();
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
            if (!progCol.isEmptyCol() && !progCol.isDATACol()) {
                $table.find(".col" + (i + 1)).addClass("modalHighlighted");
            }
        }
    }

    function deselectAllTableCols(tableId, force) {
        var tableIds = getTableIds();
        if (!force && tableIds[0] === tableIds[1]) {
            return;
        }

        var $table = $("#xcTable-" + tableId);
        $table.find(".modalHighlighted").removeClass("modalHighlighted");
    }

    function colHeaderClick($target, event) {
        var $cell = $target.closest("th");
        if (!$cell.length) {
            $cell = $target.closest("td");
        }

        var tableId = $cell.closest(".xcTable").data("id");
        var tableIds = getTableIds();
        var tIdx = tableIds.indexOf(tableId);
        if (tIdx === -1) {
            return;
        }

        if (isSemiJoin()) {
            if (isLeftSemiJoin()) {
                if (tIdx === 1) {
                    return;
                }
            } else if (tIdx === 0) {
                return;
            }
        }

        var colNum = xcHelper.parseColNum($cell);
        if (colNum === 0) {
            toggleAllCols(true, tableId, tIdx);
            return;
        }

        var isLeftSide = tIdx === 0;
        var toShift = event.shiftKey &&
                      (isLeftSide && lastSideClicked === "left" ||
                      !isLeftSide && lastSideClicked === "right");

        var toHighlight = !$cell.hasClass("modalHighlighted");
        var $colList = isLeftSide ? $joinView.find(".leftCols") :
                                    $joinView.find(".rightCols");
        var isSelfJoin = tableIds[0] === tableIds[1];
        var $sibList = $colList.siblings("ul");
        // check side clicked
        if (toShift && focusedThNum != null) {
            var start = Math.min(focusedThNum, colNum);
            var end = Math.max(focusedThNum, colNum);

            for (var i = start; i <= end; i++) {
                if (toHighlight) {
                    selectCol(i, $colList, tableId);
                    if (isSelfJoin) {
                        selectCol(i, $sibList, tableId);
                    }
                } else {
                    deselectCol(i, $colList, tableId);
                    if (isSelfJoin) {
                        deselectCol(i, $sibList, tableId);
                    }
                }
            }
        } else {
            if (toHighlight) {
                selectCol(colNum, $colList, tableId);
                if (isSelfJoin) {
                    selectCol(colNum, $sibList, tableId);
                }
            } else {
                deselectCol(colNum, $colList, tableId);
                if (isSelfJoin) {
                    deselectCol(colNum, $sibList, tableId);
                }
            }
        }

        if (isLeftSide) {
            lastSideClicked = "left";
        } else {
            lastSideClicked = "right";
        }

        focusedThNum = colNum;
        focusedListNum = null;
        resetRenames();
    }

    function restoreSelectedTableCols() {
        var tableIds = getTableIds();
        $joinView.find(".columnsWrap ul").each(function(i) {
            var tableId = tableIds[i];
            if (gTables[tableId]) {
                var $table = $("#xcTable-" + tableId);
                $(this).find("li.checked").each(function() {
                    var colNum = $(this).data("colnum");
                    $table.find(".col" + colNum).addClass("modalHighlighted");
                });
            }
        });
    }

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

    function getJoinType() {
        return $joinTypeSelect.find(".text").text();
    }

    function isSemiJoin() {
        var type = getJoinType();
        return type.indexOf("Semi") > -1;
    }

    function isLeftSemiJoin() {
        var type = getJoinType();
        return type.indexOf("Left") > -1;
    }

    function isCrossJoin() {
        var type = getJoinType();
        return type.indexOf("Cross") > -1;
    }

    function toggleNextView() {
        StatusBox.forceHide();
        if ($joinView.hasClass('nextStep')) { // go to step 1
            goToFirstStep();
        } else if (checkFirstViewValid()) { // go to step 2
            if (isSemiJoin()) {
                $joinView.addClass("semiJoin");
                if (isLeftSemiJoin()) {
                    $joinView.addClass("leftSemiJoin");
                } else {
                    $joinView.addClass("rightSemiJoin");
                }

                $("#container").addClass("semiJoinState");
            } else if (isCrossJoin()) {
                $joinView.addClass("crossJoin");
            }

            if (needsNextStepUpdate) {
                resetJoinEstimator();
                displayAllColumnsList();
                needsNextStepUpdate = false;
                resetRenames();
                if (isCrossJoin()) {
                    $joinView.find('.estimateCheckbox').click();
                }
            } else if (getJoinType() !== joinEstimatorType) {
                // Rerun estimator since type is now different
                resetJoinEstimator();
            }

            $joinView.addClass('nextStep');
            $("#container").addClass("joinState2");

            if ($joinTableName.val().trim() === "") {
                if (!DagEdit.isEditMode()) {
                    $joinTableName.focus();
                }
            }

            // clear any empty column rows
            $clauseContainer.find(".joinClause").each(function() {
                var $joinClause = $(this);
                var lClause = $joinClause.find(".leftClause").val().trim();
                var rClause = $joinClause.find(".rightClause").val().trim();

                if (lClause === "" && rClause === "") {
                    $joinClause.remove();
                }
            });

            formHelper.refreshTabbing();
            if (DagEdit.isEditMode()) {
                setTimeout(function () {
                    $joinTableName.blur();
                });
            }
        } else {
            return;
        }
        $joinView.find('.mainContent').scrollTop(0);
    }

    function goToFirstStep() {
        $joinView.removeClass("nextStep semiJoin leftSemiJoin rightSemiJoin");
        $("#container").removeClass("joinState2 semiJoinState");
        formHelper.refreshTabbing();
        lastSideClicked = null;
        focusedListNum = null;
        focusedThNum = null;
    }

    function checkFirstViewValid() {
        if (isCrossJoin()) {
            var filterEvalString = $joinView.find(".crossJoinFilter input")
                                            .val().trim();
            if (filterEvalString.length > 0 &&
                (filterEvalString.indexOf("(") === -1 ||
                 filterEvalString.indexOf(")") === -1)) {
                showErrorTooltip($joinView.find(".crossJoinFilter input"),
                                 {title: "Filter string must be a valid " +
                                         "xcalar eval string."});
                return false;
            }
            return true;
        }
        var joinKeys = getJoinKeys();
        if (joinKeys == null) {
            return false;
        }

        var lCols = joinKeys.lCols;
        var rCols = joinKeys.rCols;
        var tableIds = getTableIds();
        var leftColRes = xcHelper.convertFrontColNamesToBack(lCols, tableIds[0],
                                                    validTypes);
        var rightColRes;

        if (leftColRes.invalid) {
            columnErrorHandler('left', leftColRes, lTable);
            return false;
        } else {
            rightColRes = xcHelper.convertFrontColNamesToBack(rCols,
                                                                  tableIds[1],
                                                                  validTypes);
            if (rightColRes.invalid) {
                columnErrorHandler('right', rightColRes, rTable);
                return (false);
            }
        }

        var matchRes = checkMatchingColTypes(leftColRes, rightColRes);

        if (!matchRes.success) {
            var $row = $clauseContainer.find('.joinClause').eq(matchRes.errors[0].row);
            showErrorTooltip($row, {
                "title": xcHelper.replaceMsg(JoinTStr.MismatchDetail, {
                    type1: '<b>' + matchRes.errors[0].types[0] + '</b>',
                    type2: '<b>' + matchRes.errors[0].types[1] + '</b>'
                }),
                "html": true
            },
            {time: 3000});

            for (var i = 0 ; i < matchRes.errors.length; i++) {
                showCastRow(matchRes.errors[i].row);
            }

            return false;
        }

        return (true);
    }

    function showCastRow(rowNum) {
        var $row = $clauseContainer.find(".castRow").eq(rowNum);
        $row.addClass("showing");
        setTimeout(function() {
            $row.addClass("overflowVisible");
        }, 250);
    }

    function getJoinKeys(toGoBack) {
        var lCols = [];
        var rCols = [];

        if (isCrossJoin()) {
            return {
                "lCols": lCols,
                "rCols": rCols
            };
        }
        var $invalidClause = null;
        var lUsed = {};
        var rUsed = {};
        var hasDupNameError = false;
        // check validation
        $clauseContainer.find(".joinClause").each(function() {
            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);

                if (lUsed.hasOwnProperty(lClause)) {
                    hasDupNameError = true;
                    showErrorTooltip($joinClause.find(".leftClause"),
                                    {title: ErrTStr.DuplicateColNames});
                    return false; // stop loop
                } else if (rUsed.hasOwnProperty(rClause)) {
                    hasDupNameError = true;
                    showErrorTooltip($joinClause.find(".rightClause"),
                                    {title: ErrTStr.DuplicateColNames});
                    return false; // stop loop
                }
                lUsed[lClause] = true;
                rUsed[rClause] = true;

                return true;
            } else if (!(lClause === "" && rClause === "")){
                $invalidClause = $joinClause;
                return false;   // stop loop
            }
        });

        var error = ($invalidClause != null || lCols.length === 0 || hasDupNameError);
        if (error) {
            if (toGoBack) {
                // go back
                toggleNextView();
            }
            if (!hasDupNameError) {
                invalidMultiClauseTooltip($invalidClause);
            }
            return null;
        }

        return {
            "lCols": lCols,
            "rCols": rCols
        };
    }

    function columnErrorHandler(side, colRes, table) {
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
            return ($(this).val().trim() === colRes.name);
        }).eq(0);

        if (colRes.reason === 'notFound') {
            var tableName = table.getName();
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
    function checkMatchingColTypes(lCols, rCols) {
        var lProgCol;
        var rProgCol;
        var lType;
        var rType;
        var problemTypes = ["integer", "float", "number"];
        var retObj = {
            success: true,
            errors: []
        };
        var $clauseRows = $clauseContainer.find(".joinClause");
        for (var i = 0; i < lCols.length; i++) {
            lProgCol = lTable.getColByBackName(lCols[i]);
            rProgCol = rTable.getColByBackName(rCols[i]);
            var $row = $clauseRows.eq(i);
            var $lInput = $row.find(".clause").eq(0);
            var $rInput = $row.find(".clause").eq(1);
            var isLKnown = false;
            var isRKnown = false;
            if ($lInput.data("casted")) {
                lType = $lInput.data("casttype");
                isLKnown = true;
            } else {
                lType = lProgCol.getType();
            }
            if ($rInput.data("casted")) {
                rType = $rInput.data("casttype");
                isRKnown = true;
            } else {
                rType = rProgCol.getType();
            }

            if (lType !== rType) {
                if (problemTypes.indexOf(lType) !== -1 &&
                    problemTypes.indexOf(rType) !== -1) {
                    if ((isLKnown || lProgCol.isKnownType()) &&
                        (isRKnown || rProgCol.isKnownType())) {
                        retObj.success = false;
                        retObj.errors.push({
                            types: [lType, rType],
                            row: i
                        });
                    } else {
                        // if one of the columns has a problematic type but is
                        // not an immediate, we really don't know it's true type
                        // and could be matching
                    }
                } else {
                    // types don't match and they're not problematic types so
                    // they really must not match
                    retObj.success = false;
                    retObj.errors.push({
                        types: [lType, rType],
                        row: i
                    });
                }
            }
        }
        return retObj;
    }

    function estimateJoinSize() {
        var deferred = PromiseHelper.deferred();
        if (!validTableNameChecker()) {
            deferred.reject();
            return deferred.promise();
        }
        var tableIds = getTableIds();

        joinEstimatorType = getJoinType();
        var $estimatorWrap = $joinView.find('.estimatorWrap');
        $estimatorWrap.find(".stats").show();
        $estimatorWrap.find('.value').empty();

        var promise;
        if (joinEstimatorType === "Cross Join") {
            var lNumRows = gTables[tableIds[0]].resultSetCount;
            var rNumRows = gTables[tableIds[1]].resultSetCount;
            var totalRows = lNumRows * rNumRows;
            var joinEstInfo = {
                minSum: totalRows,
                maxSum: totalRows,
                expSum: totalRows
            };
            if ($joinView.find(".crossJoinFilter input").val().trim()
                                                        .length > 0) {
                joinEstInfo = {
                    minSum: 0,
                    maxSum: totalRows,
                    expSum: totalRows/2
                };
            }
            promise = PromiseHelper.resolve(joinEstInfo);
        } else {
            var cols = getClauseCols();
            var rTableName = gTables[tableIds[1]].getName();
            var argList = {
                "leftLimit": 100,
                "rightLimit": 100,
                "joinType": getJoinType(),
                "lCol": cols[0],
                "rCol": cols[1],
                "rTable": new XcSDK.Table(rTableName),
                "unlock": true,
                "fromJoin": true
            };

            $estimatorWrap.find('.min .value').text(JoinTStr.Estimating);
            $estimatorWrap.find('.med .value').text(JoinTStr.Estimating);
            $estimatorWrap.find('.max .value').text(JoinTStr.Estimating);
            $estimatorWrap.find('.title').text(JoinTStr.EstimatingJoin);

            var extOptions = {
                noNotification: true,
                noSql: true
            };
            promise = ExtensionManager.trigger(tableIds[0], "UExtDev",
                                                "estimateJoin", argList,
                                                extOptions);
        }

        promise
        .then(function(ret) {
            $estimatorWrap.find('.title').text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.min .value').text(ret.minSum);
            $estimatorWrap.find('.med .value').text(ret.expSum);
            $estimatorWrap.find('.max .value').text(ret.maxSum);
            deferred.resolve();
        })
        .fail(function(error) {
            $joinView.find('.estimatorWrap .title')
                     .text(JoinTStr.EstimatedJoin + ':');
            $estimatorWrap.find('.value').text('N/A');
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // generates all left and right table columns to keep
    function displayAllColumnsList() {
        var html;
        $joinView.find(".cols").empty();
        if (isSemiJoin()) {
            if (isLeftSemiJoin()) {
                html = getTableColList(lTable);
                $joinView.find(".cols").eq(0).html(html);
                $joinView.find(".selectAll").eq(0).addClass("checked");
                selectAllTableCols(lTable);
            } else {
                html = getTableColList(rTable);
                $joinView.find(".cols").eq(1).html(html);
                $joinView.find(".selectAll").eq(1).addClass("checked");
                selectAllTableCols(rTable);
            }
        } else {
            html = getTableColList(lTable);
            $joinView.find(".cols").eq(0).html(html);
            $joinView.find(".selectAll").eq(0).addClass("checked");
            selectAllTableCols(lTable);

            html = getTableColList(rTable);
            $joinView.find(".cols").eq(1).html(html);
            $joinView.find(".selectAll").eq(1).addClass("checked");
            selectAllTableCols(rTable);
        }
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

    function validJoinTables() {
        var tableIds = getTableIds();
        if (!gTables[tableIds[0]].isActive() || !gTables[tableIds[1]].isActive()) {
            toggleNextView();
            var index;
            if (!gTables[tableIds[0]].isActive()) {
                index = 0;
            } else {
                index = 1;
            }
            var text = TblTStr.NotActive;
            var $tableInput = $joinView.find(".tableListSection .arg").eq(index);
            StatusBox.show(text, $tableInput, false);
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
        if (lTable && rTable) {
            if (isCrossJoin()) {
                return true; // passes, no columns needed for cross join
            }
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

        lCols = lCols.map(function(colName) {
            var progCol = lTable.getColByFrontName(colName);
            var backColName = progCol.getBackColName();
            var colType = progCol.getType();
            return new XcSDK.Column(backColName, colType);
        });

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
        var wasDisabled = $nextBtn.hasClass('btn-disabled');
        if (hasColsAndTableNames()) {
            $nextBtn.removeClass('btn-disabled');
            if (wasDisabled) {
                needsNextStepUpdate = true;
                formHelper.refreshTabbing();
            }
        } else {
            $nextBtn.addClass('btn-disabled');
            if (!wasDisabled) {
                needsNextStepUpdate = true;
                formHelper.refreshTabbing();
            }
        }
    }

    function getTableColList(table) {
        var html = "";
        var allCols = table.tableCols;
        for (var i = 0; i < allCols.length; i++) {
            var progCol = allCols[i];
            if (progCol.isEmptyCol() || progCol.isDATACol()) {
                continue;
            }

            html += '<li class="checked" data-colnum="' + (i + 1) + '">' +
                        '<span class="text tooltipOverflow" ' +
                        'data-toggle="tooltip" data-container="body" ' +
                        'data-original-title="' +
                            xcHelper.escapeHTMLSpecialChar(
                                xcHelper.escapeHTMLSpecialChar(
                                progCol.getFrontColName(true))) + '">' +
                            xcHelper.escapeHTMLSpecialChar(
                                progCol.getFrontColName(true)) +
                        '</span>' +
                        '<div class="checkbox checked">' +
                            '<i class="icon xi-ckbox-empty fa-13"></i>' +
                            '<i class="icon xi-ckbox-selected fa-13"></i>' +
                        '</div>' +
                    '</li>';
        }
        return (html);
    }

    function submitForm() {
        // check validation
        // if submit is enabled, that means first view is already valid
        if (!isEditMode) {
            if (!xcHelper.tableNameInputChecker($joinTableName) ||
                !validTableNameChecker() ||
                !validJoinTables()) {
                return PromiseHelper.reject();
            }
        }

        var deferred = PromiseHelper.deferred();

        formHelper.disableSubmit();

        submitFormHelper()
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
            var type = isFatptr ?
                       DfFieldTypeT.DfFatptr : DfFieldTypeT.DfUnknown;
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

    function proceedWithJoin(lJoinInfo, rJoinInfo) {
        var deferred = PromiseHelper.deferred();

        var joinType = getJoinType();
        var newTableName = $joinTableName.val().trim();
        var keepTable = $joinView.find(".keepTablesCBWrap")
                        .find(".checkbox").hasClass("checked");

        var options = {
            "keepTables": keepTable,
            "formOpenTime": formHelper.getOpenTime()
        };

        var fltString = "";
        if (joinType === "Cross Join") {
            fltString = $joinView.find(".crossJoinFilter input").val().trim();
            if (fltString.length > 0) {
                options.filterEvalString = fltString;
            }
        }

        JoinView.close();

        var origFormOpenTime = formHelper.getOpenTime();

        if (DagEdit.isEditMode()) {
            DagEdit.storeJoin(joinType, lJoinInfo, rJoinInfo,
                            newTableName + "#aa00", options);
        } else {
            xcFunction.join(joinType, lJoinInfo, rJoinInfo, newTableName, options)
            .then(function(finalTableName) {
                deferred.resolve(finalTableName);
            })
            .fail(function(error) {
                submissionFailHandler(lJoinInfo.tableId, rJoinInfo.tableId,
                                      origFormOpenTime, error);
                deferred.reject();
            });
        }

        return deferred.promise();
    }

    function submitFormHelper() {
        var joinKeys = getJoinKeys(true);
        if (joinKeys == null) {
            return PromiseHelper.reject();
        }

        var lCols = joinKeys.lCols;
        var rCols = joinKeys.rCols;

        var tableIds = getTableIds();
        var lTableId = tableIds[0];
        var rTableId = tableIds[1];

        // Must collect joinKey data here in case old tables not kept
        prepJoinKeyDataSubmit(lCols, rCols);
        // set up "joining on" columns
        var lColNums = getColNumsFromName(lCols, lTable);
        var rColNums = getColNumsFromName(rCols, rTable);

        var lColNames = getColNames(lCols, lTable);
        var rColNames = getColNames(rCols, rTable);
        // set up "keeping" columns
        var colNamesToKeep = getColNamesToKeep(lTable, rTable);
        var lColsToKeep = colNamesToKeep.left;
        var rColsToKeep = colNamesToKeep.right;

        var lJoinInfo = {
            "tableId": lTableId,
            "colNums": lColNums,
            "colNames": lColNames,
            "casts": getCasts(0),
            "pulledColumns": lColsToKeep,
            "rename": null,
            "allImmediates": lTable.getImmediateNames()
        };
        var rJoinInfo = {
            "tableId": rTableId,
            "colNums": rColNums,
            "colNames": rColNames,
            "casts": getCasts(1),
            "pulledColumns": rColsToKeep,
            "rename": null,
            "allImmediates": rTable.getImmediateNames()
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
            return proceedWithJoin(lJoinInfo, rJoinInfo);
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
            return proceedWithJoin(lJoinInfo, rJoinInfo);
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

            return proceedWithJoin(lJoinInfo, rJoinInfo);
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

    function getCasts(index) {
        var casts = [];
        if (isCrossJoin()) {
            return casts;
        }
        $clauseContainer.find(".clauseRow").each(function() {
            var $input = $(this).find("input").eq(index);
            if ($input.data("casted")) {
                casts.push($input.data("casttype"));
            } else {
                casts.push(null);
            }
        });
        return casts;
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

    function getColNumsFromName(cols, table) {
        var colNums = cols.map(function(colName) {
            var progCol = table.getColByFrontName(colName);
            return table.getColNumByBackName(progCol.getBackColName());
        });
        return colNums;
    }

    function getColNames(cols, table) {
        var colNames = cols.map(function(colName) {
            var progCol = table.getColByFrontName(colName);
            if (!progCol) {
                return colName;
            } else {
                return progCol.getBackColName();
            }
        });
        return colNames;
    }

    function getColNamesToKeep(lTable, rTable) {
        var $lColLis = $joinView.find(".leftCols li.checked");
        var $rColLis = $joinView.find(".rightCols li.checked");
        var lColsToKeep;
        var rColsToKeep;
        if (isSemiJoin()) {
            var joinType = getJoinType();
            if (joinType.indexOf("Left") > -1) {
                lColsToKeep = getColNameFromList($lColLis, lTable);
                rColsToKeep = [];
            } else if (joinType.indexOf("Right") > -1) {
                lColsToKeep = [];
                rColsToKeep = getColNameFromList($rColLis, rTable);
            }
        } else {
            lColsToKeep = getColNameFromList($lColLis, lTable);
            rColsToKeep = getColNameFromList($rColLis, rTable);
        }
        return {
            left: lColsToKeep,
            right: rColsToKeep
        };
    }

    // for columns to keep/pull
    function getColNameFromList($colLis, table) {
        var colsToKeep = [];
        $colLis.each(function(i) {
            var name = $(this).text();
            var progCol = table.getColByFrontName(name);
            colsToKeep[i] = progCol.getBackColName();
        });
        return colsToKeep;
    }

    function prepJoinKeyDataSubmit(lCols, rCols) {
        var dataPerClause = [];
        // Iterate over each clause, treating every pair of left|right clause
        // as a completely independent data point.
        try {
            for (var i = 0; i < lCols.length; i++) {
                var curSrcBackName = lCols[i];
                var curDestBackName = rCols[i];
                var joinKeyInputs = getJoinKeyInputs(curSrcBackName);
                var dataToSubmit = xcSuggest.processJoinKeyData(
                                                            joinKeyInputs,
                                                            curDestBackName);
                if (!dataToSubmit.isValid) {
                    // console.log("Tried to submit invalid mlInputData:",
                    //             JSON.stringify(dataToSubmit));
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
            var showModifyBtn = formHelper.getOpenTime() === origFormOpenTime;
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
                        JoinView.show(null , null, {restore: true});
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

    function addClause(noAnimation, tableId, colNum, colNames) {

        var progCol;
        if (tableId != null && colNum != null) {
            progCol = gTables[tableId].getCol(colNum);
            if (validTypes.indexOf(progCol.getType()) === -1) {
                return;
            }
        }

        var $newClause = $(multiClauseTemplate);
        if (lTable) {
            var $leftClause = $newClause.find(".leftClause");
            xcTooltip.remove($leftClause);
            $leftClause.attr("disabled", false).removeClass("inActive");
        }
        if (rTable) {
            var $rightClause = $newClause.find(".rightClause");
            xcTooltip.remove($rightClause);
            $rightClause.attr("disabled", false).removeClass("inActive");
        }

        var $div = $newClause.insertBefore($joinView.find('.addClause'));
        if (tableId != null && colNum != null) {
            var colName = progCol.getFrontColName(true);
            $div.find('.arg').eq(0).val(colName);
        } else if (colNames) {
            $div.find('.arg').eq(0).val(colNames[0]);
            $div.find('.arg').eq(1).val(colNames[1]);
        } else if (lTable) {
            $div.find('.arg').eq(0).focus();
        }

        if (!noAnimation) {
            $div.hide().slideDown(100);
        }
        formHelper.refreshTabbing();
        addCastDropDownListener();
    }

    function resetJoinView() {
        $clauseContainer.find(".joinClause").remove();
        $clauseContainer.find('.clause').val("");
        $joinView.find('.next').addClass('btn-disabled');
        $rightTableDropdown.find('.text').val("");
        activateClauseSection(0);
        deactivateClauseSection(1);
        needsNextStepUpdate = true;

        updatePreviewText();
        $joinView.removeClass('nextStep');
        $("#container").removeClass("joinState2");
        $joinTableName.val("");
        $joinView.find(".crossJoinFilter input").val("");
        resetRenames();
        $joinView.find(".tableListSection .arg").data("val", "");
    }

    function fillTableLists(refresh) {
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
            var tableName = lTable.getName();
            $leftTableDropdown.find('.text').val(tableName);
            $leftTableDropdown.find('.text').data("val", tableName);
            $leftTableDropdown.find('li').filter(function() {
                return ($(this).text() === tableName);
            }).addClass('selected');
            selectAllTableCols(lTable);
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
        var defaultOptions = {
            "title": "",
            "placement": "top",
            "animation": true,
            "container": "body",
            "trigger": "manual",
            "template": xcTooltip.Template.Error
        };
        otherOptions = otherOptions || {};
        var displayTime = otherOptions.time || 2000;

        options = $.extend(defaultOptions, options);

        xcTooltip.remove($el);
        // cannot overwrite previous title without removing the title attributes
        xcTooltip.transient($el, options, displayTime);
        $el.focus();
    }

    function getColInputs(table, frontColName) {
        var col = table.getColByFrontName(frontColName);
        if (!col) {
            return null;
        }
        var backColName = col.getBackColName();
        var type = col.getType();
        var colNum = table.getColNumByBackName(backColName);
        var data = table.getColContents(colNum);
        var requiredInfo = {
            'type': type,
            'name': col.getFrontColName(), // without prefix
            'data': data,
            'uniqueIdentifier': backColName, // Only IDs chosen result,
            'tableId': table.getId()
        };
        return requiredInfo;
    }

    function getJoinKeyInputs(val) {
        var table = lTable;
        var suggTable = rTable;
        var srcInfo = getColInputs(table, val);
        var destInfo = [];
        var suggCols = suggTable.getAllCols();
        for (var i = 0; i < suggCols.length; i++) {
            if (!suggCols[i].isDATACol()) {
                var result = getColInputs(suggTable,
                    suggCols[i].getFrontColName(true));
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

    function suggestJoinKey(tableId, val, $inputToFill) {
        var inputs = getJoinKeyInputs(val);
        if (inputs.srcColInfo == null) {
            return JoinKeySuggestion.KeyNotFound;
        }
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

    var joinOnNumTimer;

    function updateJoinOnNums() {
        var tableIds = getTableIds();
        var lTable = gTables[tableIds[0]];
        var rTable = gTables[tableIds[1]];
        $(".xcTable").find(".formColNum").remove();
        if (isCrossJoin()) {
            return;
        }
        var $lTable;
        var $rTable;
        if (lTable) {
            $lTable = $("#xcTable-" + tableIds[0]);
        }
        if (rTable) {
            $rTable = $("#xcTable-" + tableIds[1]);
        }

        $joinView.find(".joinClause").each(function(i) {
            var $joinClause = $(this);
            lClause = $joinClause.find(".leftClause").val().trim();
            rClause = $joinClause.find(".rightClause").val().trim();
            if (lTable && lClause) {
                var lColNum = lTable.getColNumByFrontName(lClause);
                $lTable.find("th.col" + lColNum + ' .header')
                       .append('<span class="formColNum">' + (i + 1) + '</span>');
            }
            if (rTable && rClause) {
                var rColNum = rTable.getColNumByFrontName(rClause);
                $rTable.find("th.col" + rColNum + ' .header')
                   .append('<span class="formColNum">' + (i + 1) + '</span>');
            }
        });
    }

    function updatePreviewText(delay) {
        var joinType = getJoinType();
        var lTableName = $leftTableDropdown.find(".text").val();
        var rTableName = $rightTableDropdown.find(".text").val();
        var previewText = '<span class="joinType keyword">' + joinType +
                          '</span> <span class="highlighted">' + lTableName +
                          '</span>, <span class="highlighted">' + rTableName +
                          '</span>';
        var crossJoin = isCrossJoin();
        if (!crossJoin) {
            previewText += '<br/><span class="keyword">ON </span>';
        } else {
            var whereClause = $joinView.find(".crossJoinFilter input").val()
                                                                      .trim();
            if (whereClause.length > 0) {
                previewText += '<br/><span class="keyword">WHERE </span>';
                previewText += xcHelper.escapeHTMLSpecialChar(whereClause);
            }
        }

        var columnPairs = [];
        var pair;
        var lClause;
        var rClause;
        clearTimeout(joinOnNumTimer);
        if (delay) {
            joinOnNumTimer = setTimeout(function() {
                updateJoinOnNums();
            }, 300);
        } else {
            updateJoinOnNums();
        }

        if (crossJoin) {
            $joinView.find('.joinPreview').html(previewText);
            return;
        }

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
                leftColText = '<span class="highlighted">' +
                            xcHelper.escapeHTMLSpecialChar(columnPairs[i][0]) +
                              '</span>';
            } else {
                leftColText = "\"\"";
            }
            if (columnPairs[i][1]) {
                rightColText = '<span class="highlighted">' +
                            xcHelper.escapeHTMLSpecialChar(columnPairs[i][1]) +
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

        $renameSection.on("click", ".copyAll", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $section = $(this).closest(".tableRenames");
            copyInRename($section);
        });

        $renameSection.on("click", ".copyAppend", function(event) {
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

    function updateFormTitles(options) {
        var titleName = "Join";
        var submitText;
        if (options.prefill) {
            titleName = "EDIT " + titleName;
            submitText = "SAVE";
        } else {
            submitText = titleName.toUpperCase();
        }
        $joinView.find('header .title').text(titleName);
        $joinView.find('.confirm').text(submitText);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        JoinView.__testOnly__ = {};
        JoinView.__testOnly__.addClause = addClause;
        JoinView.__testOnly__.checkMatchingColTypes = checkMatchingColTypes;
        JoinView.__testOnly__.estimateJoinSize = estimateJoinSize;
        JoinView.__testOnly__.checkFirstView = checkFirstViewValid;
        JoinView.__testOnly__.validTableNameChecker = validTableNameChecker;
        JoinView.__testOnly__.submitJoin = submitForm;
        JoinView.__testOnly__.submissionFailHandler = submissionFailHandler;
        JoinView.__testOnly__.deactivateClauseSection = deactivateClauseSection;
        JoinView.__testOnly__.autoResolveCollisions = autoResolveCollisions;
        JoinView.__testOnly__.smartRename = smartRename;
        JoinView.__testOnly__.colHeaderClick = colHeaderClick;
        JoinView.__testOnly__.getFormHelper = function() {
            return formHelper;
        };

    }
    /* End Of Unit Test Only */

    return (JoinView);
}(jQuery, {}));
