window.JoinModal = (function($, JoinModal) {
    var $modalBackground = $("#modalBackground");

    var $joinModal = $("#joinModal");
    // var $joinInstr = $("#joinInstr");

    var $joinSelect   = $("#joinType");
    var $joinDropdown = $("#joinTypeSelect");
    var $mainJoin     = $("#mainJoin");

    var $joinTableName  = $("#joinRoundedInput");
    var $leftJoinTable  = $("#leftJoin");
    var $rightJoinTable = $("#rightJoin");

    var $multiJoinBtn = $("#multiJoinBtn");
    var $multiJoin    = $("#multiJoin");
    var multiClauseTemplate =
        '<div class="joinClause">' +
            '<input class="clause leftClause" type="text"/>' +
              '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                  '<span class="icon"></span>' +
                '</div>' +
              '</div>' +
              '<input  class="clause rightClause" type="text"/>' +
        '</div>';

    var modalHelper = new xcHelper.Modal($joinModal);
    var isOpenTime;

    JoinModal.setup = function () {
        $("#closeJoin, #cancelJoin").click(function() {
            resetJoinTables();
        });

        $joinSelect.click(function(event) {
            event.stopPropagation();

            $joinSelect.toggleClass("open");
            $joinDropdown.toggle();
        });

        $joinDropdown.on("click", "li", function(event) {
            var $li  = $(this);

            event.stopPropagation();

            if ($li.hasClass("inactive")) {
                return;
            }

            var joinType = $li.text();

            $joinSelect.find(".text").text(joinType);
            hideJoinTypeSelect();
        });

        $joinModal.click(hideJoinTypeSelect);

        $("#mainJoin .joinTableArea").scroll(function(){
            $(this).scrollTop(0);
        });

        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();
            
            // check validation
            var newTableName = $.trim($joinTableName.val());

            if (newTableName === "") {
                var text = "Table name is empty! Please name your new table";
                StatusBox.show(text, $joinTableName, true);
                return;
            }

            var isMultiJoin = $mainJoin.hasClass("multiClause");

            if (!isMultiJoin && $mainJoin.find("th.colSelected").length !== 2) {
                Alert.show({
                    "title"  : "Cannot Join",
                    "msg"    : "Select 2 columns to join by",
                    "modal"  : $joinModal,
                    "isAlert": true
                });
                return;
            }
            
            modalHelper.submit();

            xcHelper.checkDuplicateTableName(newTableName)
            .then(function() {
                var joinType = $joinSelect.find(".text").text();

                if (isMultiJoin) {
                    multiJoinHelper(joinType, newTableName);
                } else {
                    singleJoinHelper(joinType, newTableName);
                }
            })
            .fail(function() {
                var error = 'The name "' + newTableName + '" is already ' +
                           ' in use. Please select a unique name.';
                StatusBox.show(error, $joinTableName, true);
                modalHelper.enableSubmit();
            });
        });

        // listener for toggle mutli clause section
        $multiJoinBtn.on("click", function() {
            var $activeBox = $multiJoinBtn.find(".offOnBox.active");

            if ($activeBox.hasClass("offBox")) {
                // case to open multi clause
                $activeBox.removeClass("active")
                            .siblings(".onBox").addClass("active");
                $mainJoin.addClass("multiClause");
                multiClauseOpener();

                $mainJoin.find(".colSelected").removeClass("colSelected");
                $mainJoin.find(".columnTab").prop("draggable", true);
            } else {
                // case to close multi clause
                $activeBox.removeClass("active")
                            .siblings(".offBox").addClass("active");
                $mainJoin.removeClass("multiClause");

                $multiJoin.find(".joinClause.placeholder").siblings().remove();
                $mainJoin.find(".columnTab").prop("draggable", false);
            }
        });

        // add multi clause
        $multiJoin.on("click", ".placeholder", function() {
            $(multiClauseTemplate).insertBefore($(this))
                                .hide().slideDown(100);
        });

        // delete multi clause
        $multiJoin.on("click", ".joinClause .middleIcon", function() {
            var $joinClause = $(this).closest(".joinClause");
            if ($joinClause.hasClass("placeholder")) {
                return;
            } else {
                $joinClause.slideUp(100, function() {
                    $joinClause.remove();
                });
            }
        });

        // drag over for input box
        $joinModal.on("dragover", "input", function(event) {
            var originEvent = event.originalEvent;

            if ($(this).hasClass("clause")){
                originEvent.dataTransfer.dropEffect = "copy";
            } else {
                // other input is non-droppable
                originEvent.dataTransfer.dropEffect = "none";
            }

            return false;
        });

        // drop for input box
        $joinModal.on("drop", "input", function(event) {
            var $input = $(this);
            var originEvent = event.originalEvent;

            if ($input.hasClass("clause")) {
                var clause = originEvent.dataTransfer.getData("clause");
                var text   = originEvent.dataTransfer.getData("text/plain");

                if (clause === "left" && $input.hasClass("leftClause") ||
                    clause === "right" && $input.hasClass("rightClause"))
                {
                    $input.val(text);
                }
            }

            return false;
        });

        $joinModal.draggable({
            handle     : '.modalHeader',
            cursor     : '-webkit-grabbing',
            containment: 'window'
        });

        $joinModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : 600,
            minWidth   : 800,
            containment: "document"
        });

        addModalTabListeners($leftJoinTable, true);
        addModalTabListeners($rightJoinTable, false);
    };

    JoinModal.show = function (tableNum, colNum) {
        isOpenTime = true;
        $("body").on("keypress", joinTableKeyPress);
        $modalBackground.on("click", hideJoinTypeSelect);
        updateJoinTableName();
        centerPositionElement($joinModal);

        // here tableNum start from 1;
        joinModalTabs($rightJoinTable, -1, -1);
        joinModalTabs($leftJoinTable, (tableNum + 1), colNum, $rightJoinTable);

        $joinModal.show();
        $modalBackground.fadeIn(200);

        modalHelper.setup();
        scrolleToColumn($leftJoinTable.find("th.colSelected"));
        // this is the case when right table has suggested col
        scrolleToColumn($rightJoinTable.find("th.colSelected"));
        isOpenTime = false;
    };

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

    function singleJoinHelper(joinType, newTableName) {
        var $leftCol     = $leftJoinTable.find("th.colSelected");
        var leftColNum   = xcHelper.parseColNum($leftCol) - 1;
        var leftTableNum = $leftCol.closest(".joinTable").data("tablenum");

        var $rightCol     = $rightJoinTable.find('th.colSelected');
        var rightColNum   = xcHelper.parseColNum($rightCol) - 1;
        var rightTableNum = $rightCol.closest(".joinTable").data("tablenum");

        xcFunction.join(leftColNum, leftTableNum, rightColNum,
                        rightTableNum, joinType, newTableName)
        .always(resetJoinTables);
    }

    function multiJoinHelper(joinType, newTableName) {
        var leftCols  = [];
        var rightCols = [];
        var notValid  = false;

        // check validation
        $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
            if (notValid) {
                return;
            }

            var $joinClause = $(this);
            var leftClause  = $.trim($joinClause.find(".leftClause").val());
            var rightClause = $.trim($joinClause.find(".rightClause").val());

            if (leftClause !== "" && rightClause !== "") {
                leftCols.push(leftClause);
                rightCols.push(rightClause);
            } else if (!(leftClause === "" && rightClause === "")){
                notValid = true;
            }
        });

        if (notValid || leftCols.length === 0) {
            Alert.show({
                "title"  : "Cannot Join",
                "msg"    : "Invalid Multi Clause",
                "modal"  : $joinModal,
                "isAlert": true
            });

            return;
        }

        // left table
        var leftTableName = $leftJoinTable.find(".tableLabel.active").text();
        var $leftTable    = $leftJoinTable.find('.joinTable[data-tablename="' +
                                leftTableName + '"]');
        var leftTableNum  = $leftTable.data('tablenum');
        var leftColNum;

        var rightTableName = $rightJoinTable.find(".tableLabel.active").text();
        var $rightTable    =  $rightJoinTable.find('.joinTable[data-tablename="' +
                                rightTableName + '"]');
        var rightTableNum  = $rightTable.data('tablenum');
        var rightColNum;

        // Only one clause, use same with single join
        if (leftCols.length === 1) {
            leftColNum = getColumnNum($leftTable, leftCols[0]) - 1;
            rightColNum = getColumnNum($rightTable, rightCols[0]) - 1;

            xcFunction.join(leftColNum, leftTableNum, rightColNum,
                        rightTableNum, joinType, newTableName)
            .always(resetJoinTables);

            return;
        }

        var leftString  = '=map(pyExec("multiJoinModule","multiJoin"';
        var leftColName = xcHelper.randName("leftJoinCol");

        leftColNum = gTables[leftTableNum].tableCols.length;

        for (var i = 0; i < leftCols.length; i++) {
            leftString += ', ' + leftCols[i];
        }

        leftString += '))';

        ColManager.addCol('col' + leftColNum, 'xcTable' + leftTableNum, null,
                          {direction: 'L', isNewCol: true});

        var $leftColInput = $('#xcTable' + leftTableNum)
                                .find('th.col' + leftColNum)
                                .find('.editableHead.col' + leftColNum);
        $leftColInput.val(leftColName);

        // right table
        var rightString  = '=map(pyExec("multiJoinModule","multiJoin"';
        var rightColName = xcHelper.randName("rightJoinCol");

        rightColNum = gTables[rightTableNum].tableCols.length;

        for (var i = 0; i < rightCols.length; i++) {
            rightString += ', ' + rightCols[i];
        }

        rightString += '))';


        ColManager.addCol('col' + rightColNum, 'xcTable' + rightTableNum, null,
                          {direction: 'L', isNewCol: true});
        var $rightColInput = $('#xcTable' + rightTableNum).find('th.col' + rightColNum)
                            .find('.editableHead.col' + rightColNum);
        $rightColInput.val(rightColName);

        jQuery.when(mapHelper(leftString, $leftColInput),
                    mapHelper(rightString, $rightColInput)
        )
        .then(function() {
            var leftRemoved = {};
            var righRemoved = {};

            leftRemoved[leftColName] = true;
            righRemoved[rightColName] = true;

            return xcFunction.join(leftColNum - 1, leftTableNum,
                                    rightColNum - 1, rightTableNum,
                                    joinType, newTableName,
                                    leftRemoved, righRemoved);
        })
        .always(resetJoinTables);

        function mapHelper(str, $col) {
            $("#fnBar").val(str);
            return (functionBarEnter($col));
        }
    }

    function getColumnNum($table, colName) {
        var $colTab = $table.find(".columnTab").filter(function() {
                            return ($(this).text() === colName);
                        });

        return xcHelper.parseColNum($colTab.closest("th"));
    }

    function resetJoinTables() {
        $("body").off("keypress", joinTableKeyPress);
        $modalBackground.off("click", hideJoinTypeSelect);

        // clean up multi clause section
        $mainJoin.removeClass("multiClause");
        $multiJoinBtn.find(".active").removeClass("active")
                    .end()  // back to $("#multiJoinBtn")
                    .find(".offBox").addClass("active");
        $multiJoin.find(".placeholder").siblings().remove();

        modalHelper.clear();
        modalHelper.enableSubmit();

        $joinModal.hide();
        $modalBackground.fadeOut(200, function() {
            Tips.refresh();
        });

        $joinModal.find('.tableLabel').remove();
        $joinModal.find('.joinTable').remove();
        $joinModal.width(920).height(620);
    }

    function hideJoinTypeSelect() {
        $joinSelect.removeClass("open");
        $joinDropdown.hide();
    }

    function updateJoinTableName() {
        var joinTableName = xcHelper.randName("tempJoinTable-");
        $joinTableName.val(joinTableName);
    }

    function joinTableKeyPress(event) {
        switch (event.which) {
            case keyCode.Enter:
                // XXX when focus on a button, no trigger
                if (modalHelper.checkBtnFocus()) {
                    break;
                }
                $('#joinTables').click();
                break;
            default:
                break;
        }
    }
    // build left join table and right join table
    function joinModalTabs($modal, tableNum, colNum, $sibling) {
        if ($sibling) {
            $modal.find(".tabArea").html($sibling.find(".tabArea").html());
            $modal.find(".joinTableArea").html(
                    $sibling.find(".joinTableArea").html());
        } else {
            joinModalHTMLHelper($modal);
        }
        // trigger click of table and column
        if (tableNum >= 0) {
            var tablename = gTables[tableNum - 1].tableName;
            $modal.find(".tableLabel").filter(function() {
                return ($(this).text() === tablename);
            }).click();

            // this is only for left join
            if (colNum > 0) {
                var dataColNum = $('#xcTable' + (tableNum - 1) + ' tbody .jsonElement')
                                    .index();
                if (colNum >= dataColNum) {
                    colNum--;
                }

                $modal.find('.joinTable[data-tablename="' +
                                    tablename + '"]' + ' th:nth-child(' +
                                colNum + ')').click();
            }
        } else {
            $modal.find('.tableLabel:first').click();
        }
    }

    function joinModalHTMLHelper($modal) {
        var wsTabHtml  = "";
        var tabHtml    = "";
        var worksheets = [];

        // group table tab by worksheet (only show active table)
        for (var i = 0; i < gTables.length; i++) {
            var tableName = gTables[i].tableName;
            var wsIndex   = WSManager.getWSFromTable(tableName);

            worksheets[wsIndex] = worksheets[wsIndex] || [];
            worksheets[wsIndex].push(tableName);
        }

        for (var i = 0, len = worksheets.length; i < len; i++) {
            var wsTables = worksheets[i];
            if (wsTables == null) {
                // case that ws is deleted
                continue;
            }

            for (var j = 0; j < wsTables.length; j++) {
                var wsName = (j === 0) ? WSManager.getWSName(i) : "";
                wsTabHtml += '<div class="worksheetLabel">' +
                                wsName +
                            '</div>';
                tabHtml += '<div class="tableLabel">' +
                                wsTables[j] +
                            '</div>';
            }
        }

        $modal.find(".worksheetTabs").html(wsTabHtml);
        $modal.find(".tableTabs").html(tabHtml);

        var $columnArea = $modal.find('.joinTableArea');

        for (var i = 0; i < gTables.length; i++) {
            var table = gTables[i];
            var colHtml = '<table class="dataTable joinTable" ' +
                            'data-tablename="' + table.tableName + '"' +
                            'data-tablenum="' + i + '">' +
                            '<thead>' +
                                '<tr>';

            for (var j = 0; j < table.tableCols.length; j++) {
                var colName = table.tableCols[j].name;

                if (colName === "DATA") {
                    continue;
                }

                var thClass = "col" + (j + 1);
                var type    = table.tableCols[j].type;

                thClass += " type-" + type;

                if (type === "object" || type === "undefined") {
                    thClass += " unselectable";
                }

                colHtml += '<th class="' + thClass + '">' +
                                '<div class="columnTab">' +
                                    colName +
                                '</div>' +
                            '</th>';
            }

            colHtml += '</tr></thead>';

            var $tbody = $('#xcTable' + i).find('tbody').clone(true);

            $tbody.find('tr:gt(14)').remove();
            $tbody.find('.col0').remove();
            $tbody.find('.jsonElement').remove();
            $tbody.find('.indexedColumn').removeClass('indexedColumn');
            $tbody.find(".addedBarTextWrap.clickable").removeClass("clickable");

            colHtml += $tbody.html();
            colHtml += '</table>';

            $columnArea.append(colHtml);
        }
    }

    function addModalTabListeners($modal, isLeft) {
        $modal.on('click', '.tableLabel', function() {
            // in multiClause mode, not allow switching table
            if ($mainJoin.hasClass("multiClause")) {
                return;
            }

            var $tableLabel = $(this);
            var tableName   = $tableLabel.text();

            $modal.find(".tableLabel.active").removeClass("active");

            $tableLabel.addClass("active");

            $modal.find(".joinTable").hide();
            $modal.find('.joinTable[data-tablename="' + tableName + '"]')
                    .show();
        });

        $modal.on('click', 'th', function() {
            var $th = $(this);

            if ($mainJoin.hasClass("multiClause")) {
                return;
            }

            if ($th.hasClass("unselectable")) {
                if ($th.hasClass('clicked')) {
                    return;
                }
                $th.addClass("clicked");
                var $div = $th.find("div");
                $div.attr("data-toggle", "tooltip")
                    .attr("data-placement", "top")
                    .attr("data-original-title", "can't join this type")
                    .attr("data-container", "body");
                $div.mouseover();
                setTimeout(function(){
                    $div.mouseout();
                    $div.removeAttr("data-toggle")
                        .removeAttr("data-placement")
                        .removeAttr("data-original-title")
                        .removeAttr("data-container");
                    // XXX the reason for this time out is it will created more
                    // than one tooltip if you click on th too quick
                    setTimeout(function() {
                        $th.removeClass("clicked");
                    }, 100);
                }, 2000);
                return;
            }

            var colNum = xcHelper.parseColNum($th);
            var $table = $th.closest('table');

            var tableName = $table.data("tablename");
            var colName   = $th.find(".columnTab").text();

            // var $tableInfo = isLeft ? $joinInstr.find(".leftTable") :
            //                           $joinInstr.find(".rightTable");
            // console.log(colNum);

            if ($th.hasClass('colSelected')) {
                 // unselect column
                $th.removeClass('colSelected');
                $table.find('.col' + colNum).removeClass('colSelected');
                // $tableInfo.find(".joinKey .text").text("");
            } else {
                // select column
                $modal.find('.colSelected').removeClass('colSelected');
                $table.find('.col' + colNum).addClass('colSelected');
                // $tableInfo.find(".tableName .text").text(tableName);
                // $tableInfo.find(".joinKey .text").text(colName);

                if (isLeft) {
                    var cols = [];
                    $table.find(".columnTab").each(function() {
                        cols.push($(this).text());
                    });
                    suggestJoinKey(tableName, colName, getType($th),
                                   new xcHelper.Corrector(cols));
                }
            }
        });

        $modal.on("dragstart", ".columnTab", function(event) {
            var originEvent = event.originalEvent;
            var clause = isLeft ? "left" : "right";

            originEvent.dataTransfer.setData("clause", clause);
            originEvent.dataTransfer.effectAllowed = "copy";
            originEvent.dataTransfer.setData("text/plain", $(this).text());

            if (isLeft) {
                $multiJoin.find("input.rightClause").addClass("inActive");
            } else {
                $multiJoin.find("input.leftClause").addClass("inActive");
            }
        });

        $modal.on("dragend", ".columnTab", function() {
            $multiJoin.find("input.clause.inActive").removeClass("inActive");
        });
    }

    function scrolleToColumn($th) {
        if (!$th || $th.length === 0) {
            return;
        }
        var $tableArea = $th.closest('.joinTableArea');
        var tableOffset = $tableArea.offset().left;
        var tableAreaWidth = $tableArea.width();
        var thWidth = $th.width();
        var thOffset = $th.offset().left;
        var position = (thOffset - tableOffset) - (tableAreaWidth * 0.5) +
                           (thWidth * 0.5);
        $tableArea.scrollLeft(position);
    }

    function suggestJoinKey(tableName, colName, type, corrector) {
        var isFound = false;
        var $thToClick;
        // var $suggTableName = $joinInstr.find(".suggTable .tableName .text");
        // var $suggColName = $joinInstr.find(".suggTable .joinKey .text");

        var curTableName;
        var curColName;

        // $suggTableName.text("");
        // $suggColName.text("");

        $rightJoinTable.find("table").each(function() {
            var $table = $(this);

            if (isFound) {
                return;
            }

            curTableName = $table.data("tablename");

            if (curTableName === tableName) {
                return;
            }

            var $ths = $table.find("th");
            for (var i = 0, len = $ths.length; i < len; i++) {
                var $th = $ths.eq(i);

                if (getType($th) === type) {
                    curColName = $th.find(".columnTab").text();

                    if (curColName.toLowerCase() === colName.toLowerCase() ||
                        corrector.correct(curColName) === colName.toLowerCase())
                    {
                        isFound = true;
                        // $suggTableName.text(curTableName);
                        // $suggColName.text(curColName);
                        $thToClick = $th;
                        break;
                    }
                }
            }
        });

        if (isFound && isOpenTime) {
            $rightJoinTable.find(".tableLabel").filter(function() {
                return ($(this).text() === curTableName);
            }).click();
            $thToClick.click();
            scrolleToColumn($thToClick);
        }
    }

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    return (JoinModal);
}(jQuery, {}));
