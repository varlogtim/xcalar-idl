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
            var newTableName = $joinTableName.val().trim();

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
                var tabeName = newTableName + Authentication.fetchHashTag();
                if (isMultiJoin) {
                    multiJoinHelper(joinType, tabeName);
                } else {
                    singleJoinHelper(joinType, tabeName);
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
        $joinModal.on("dragover", "input, div.clause", function(event) {
            var originEvent = event.originalEvent;

            if ($(this).hasClass("clause") && !$(this).hasClass("inActive")) {
                originEvent.dataTransfer.dropEffect = "copy";
            } else {
                // other input is non-droppable
                originEvent.dataTransfer.dropEffect = "none";
            }
            var $parent = $(this).parent();
            if ($parent.hasClass('placeholder')) {
                $parent.addClass('hovering');
            }
            return false;
        });

        $joinModal.on("dragover", ".joinClause.placeholder", function() {
            $(this).addClass('hovering');
        });

        $joinModal.on("dragleave", ".joinClause.placeholder", function() {
            $(this).removeClass('hovering');
        });

        $("#mainJoin").on("dragover", function(event) {
            event.preventDefault();
            // this allows the cursor to not have disallowed appearance
        });

        // drop for input box
        $joinModal.on("drop", "input, div.clause", function(event) {
            var $input = $(this);
            var originEvent = event.originalEvent;

            if ($input.hasClass("clause")) {
                var clause = originEvent.dataTransfer.getData("clause");
                var text   = originEvent.dataTransfer.getData("text/plain");

                if (clause === "left" && $input.hasClass("leftClause") ||
                    clause === "right" && $input.hasClass("rightClause"))
                {
                    var $parent = $input.parent();
                    if ($parent.hasClass('placeholder')) {
                        $parent.click();
                        if ($input.hasClass("leftClause")) {
                            $joinModal.find(".joinClause.placeholder").prev()
                                                        .find(".leftClause")
                                                        .val(text);
                        } else {
                            $joinModal.find(".joinClause.placeholder").prev()
                                                        .find(".rightClause")
                                                        .val(text);
                        }
                    } else {
                        $input.val(text);
                    }
                    $parent.removeClass('hovering');
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

    JoinModal.show = function(tableId, colNum) {
        isOpenTime = true;
        $("body").on("keypress", joinTableKeyPress);
        $("body").on("mouseup", removeCursors);
        $modalBackground.on("click", hideJoinTypeSelect);
        updateJoinTableName();
        centerPositionElement($joinModal);

        joinModalTabs($rightJoinTable, null, -1);
        joinModalTabs($leftJoinTable, tableId, colNum, $rightJoinTable);

        $modalBackground.fadeIn(150, function() {
            $joinModal.fadeIn(300);
            scrollToColumn($leftJoinTable.find("th.colSelected"));
            // this is the case when right table has suggested col
            scrollToColumn($rightJoinTable.find("th.colSelected"));
        });

        modalHelper.setup();
        
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
        var $leftCol = $leftJoinTable.find("th.colSelected");
        var lColNum  = xcHelper.parseColNum($leftCol) - 1;
        var lTableId = $leftCol.closest(".joinTable").data("id");

        var $rightCol = $rightJoinTable.find('th.colSelected');
        var rColNum   = xcHelper.parseColNum($rightCol) - 1;
        var rTableId  = $rightCol.closest(".joinTable").data("id");

        resetJoinTables();
        xcFunction.join(lColNum, lTableId, rColNum, rTableId,
                        joinType, newTableName);
    }

    function multiJoinHelper(joinType, newTableName) {
        var lCols = [];
        var rCols = [];
        var notValid = false;

        // check validation
        $multiJoin.find(".joinClause:not(.placeholder)").each(function() {
            if (notValid) {
                return;
            }

            var $joinClause = $(this);
            var lClause = $joinClause.find(".leftClause").val().trim();
            var rClause = $joinClause.find(".rightClause").val().trim();

            if (lClause !== "" && rClause !== "") {
                lCols.push(lClause);
                rCols.push(rClause);
            } else if (!(lClause === "" && rClause === "")){
                notValid = true;
            }
        });

        if (notValid || lCols.length === 0) {
            Alert.show({
                "title"  : "Cannot Join",
                "msg"    : "Invalid Multi Clause",
                "modal"  : $joinModal,
                "isAlert": true
            });

            return;
        }

        // left table
        var $lTLabel = $leftJoinTable.find(".tableLabel.active");
        var lTableId = $lTLabel.data('id');
        var $lTable  = $leftJoinTable.find('.joinTable[data-id="' +
                                            lTableId + '"]');
        var lColNum;

        // right table
        var $rTLabel = $rightJoinTable.find(".tableLabel.active");
        var rTableId = $rTLabel.data('id');
        var $rTable  = $rightJoinTable.find('.joinTable[data-id="' +
                                                rTableId + '"]');
        var rColNum;

        // Only one clause, use same with single join
        if (lCols.length === 1) {
            lColNum = getColNum($lTable, lCols[0]);
            rColNum = getColNum($rTable, rCols[0]);
            resetJoinTables();
            xcFunction.join(lColNum, lTableId, rColNum, rTableId,
                            joinType, newTableName);
            return;
        }

        // left cols
        var lString  = 'multiJoinModule:multiJoin(';
        var lColName = xcHelper.randName("leftJoinCol");

        lColNum = xcHelper.getTableFromId(lTableId).tableCols.length;

        var len = lCols.length;
        for (var i = 0; i <= len - 2; i++) {
            lString += lCols[i] + ", ";
        }
        lString += lCols[len - 1] + ")";

        // right cols
        var rString  = 'multiJoinModule:multiJoin(';
        var rColName = xcHelper.randName("rightJoinCol");

        rColNum = xcHelper.getTableFromId(rTableId).tableCols.length;

        len = rCols.length;
        for (var i = 0; i <= len - 2; i++) {
            rString += rCols[i] + ", ";
        }

        rString += rCols[len - 1] + ")";

        var lMapOptions = {
            "colNum"   : lColNum,
            "tableId"  : lTableId,
            "fieldName": lColName,
            "mapString": lString
        };

        var rMapOptions = {
            "colNum"   : rColNum,
            "tableId"  : rTableId,
            "fieldName": rColName,
            "mapString": rString
        };

        var mapMsg = StatusMessageTStr.Map + " for multiClause Join";

        resetJoinTables();
        xcFunction.twoMap(lMapOptions, rMapOptions, true, mapMsg)
        .then(function(lNewName, rNewName) {
            var lRemoved = {};
            var rRemoved = {};

            lRemoved[lColName] = true;
            rRemoved[rColName] = true;

            var lNewId = xcHelper.getTableId(lNewName);
            var rNewId = xcHelper.getTableId(rNewName);
            
            return xcFunction.join(lColNum - 1, lNewId,
                                    rColNum - 1, rNewId,
                                    joinType, newTableName,
                                    lRemoved, rRemoved);
        });
    }

    function getColNum($table, colName) {
        var $colTab = $table.find(".columnTab").filter(function() {
            return ($(this).text() === colName);
        });

        var colNum = xcHelper.parseColNum($colTab.closest("th")) - 1;

        return (colNum);
    }

    function resetJoinTables() {
        $("body").off("keypress", joinTableKeyPress);
        $("body").off("mouseup", removeCursors);
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
        $modalBackground.fadeOut(300, function() {
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
        var joinTableName = xcHelper.randName("joinTable-");
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

    function removeCursors() {
        $('#moveCursor').remove();
    }
    // build left join table and right join table
    function joinModalTabs($modal, tableId, colNum, $sibling) {
        if ($sibling != null) {
            $modal.find(".tabArea").html($sibling.find(".tabArea").html());
            $modal.find(".joinTableArea").html(
                    $sibling.find(".joinTableArea").html());
        } else {
            joinModalHTMLHelper($modal);
        }
        // trigger click of table and column
        if (tableId != null) {
            $modal.find(".tableLabel").filter(function() {
                return ($(this).data("id") === tableId);
            }).click();

            // this is only for left join
            if (colNum > 0) {
                var $table = xcHelper.getElementByTableId(tableId, "xcTable");
                var dataColNum = $table.find('tbody .jsonElement').index();
                if (colNum >= dataColNum) {
                    colNum--;
                }

                $modal.find('.joinTable[data-id="' + tableId + '"]' +
                            ' th:nth-child(' + colNum + ')').click();
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
            // XXX this should be fixed when no WSManager.getWSFromTable()
            var tableId   = gTables[i].tableId;
            var tableName = gTables[i].tableName;
            var wsIndex   = WSManager.getWSFromTable(tableName);

            worksheets[wsIndex] = worksheets[wsIndex] || [];
            worksheets[wsIndex].push({
                "name": tableName,
                "id"  : tableId
            });
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
                tabHtml +=
                    '<div class="tableLabel" data-id="' + wsTables[j].id + '">' +
                        wsTables[j].name +
                    '</div>';
            }
        }

        $modal.find(".worksheetTabs").html(wsTabHtml);
        $modal.find(".tableTabs").html(tabHtml);

        var $columnArea = $modal.find('.joinTableArea');

        for (var i = 0; i < gTables.length; i++) {
            var table = gTables[i];
            var colHtml = '<table class="dataTable joinTable" ' +
                            'data-id="' + table.tableId + '">' +
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

            var $tableLabel = $(this);
            var tableId = $tableLabel.data("id");
            if ($tableLabel.hasClass('active')) {
                return;
            }
            $modal.find(".tableLabel.active").removeClass("active");

            $tableLabel.addClass("active");

            $modal.find(".colSelected").removeClass("colSelected");

            // when multijoin, empty left or right inputs if new table
            // selected
            if ($tableLabel.closest('.joinContainer').attr('id')
                 === 'rightJoin') {
                $joinModal.find('.rightClause').val("");
            } else {
                $joinModal.find('.leftClause').val("");
            }

            $modal.find(".joinTable").hide();
            $modal.find('.joinTable[data-id="' + tableId + '"]').show();

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

            var tableId = $table.data("id");
            var colName = $th.find(".columnTab").text();

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
                    suggestJoinKey(tableId, colName, getType($th),
                                   new xcHelper.Corrector(cols));
                }
            }
        });

        $modal.on("mousedown", ".columnTab", function() {
            if ($mainJoin.hasClass('multiClause')) {
                var cursorStyle =
                    '<style id="moveCursor" type="text/css">*' +
                        '{cursor:move !important; cursor: -webkit-grabbing !important;' +
                        'cursor: -moz-grabbing !important;}' +
                        '.tooltip{display: none !important;}' +
                    '</style>';
                $(document.head).append(cursorStyle);
            }
        });

        $modal.on("dragstart", ".columnTab", function(event) {
            var originEvent = event.originalEvent;
            var clause = isLeft ? "left" : "right";
            originEvent.dataTransfer.setData("clause", clause);
            originEvent.dataTransfer.effectAllowed = "copy";
            originEvent.dataTransfer.setData("text/plain", $(this).text());

            if (isLeft) {
                $multiJoin.find(".clause.rightClause").addClass("inActive");
            } else {
                $multiJoin.find(".clause.leftClause").addClass("inActive");
            }
        });

        $modal.on("dragend", ".columnTab", function() {
            $multiJoin.find(".clause.inActive").removeClass("inActive");
            $('#moveCursor').remove();
        });
    }

    function scrollToColumn($th) {
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

    function suggestJoinKey(tableId, colName, type, corrector) {
        var isFound = false;
        var $thToClick;
        var curColName;

        $rightJoinTable.find("table").each(function() {
            var $table = $(this);

            if (isFound) {
                return;
            }

            curTableId = $table.data("id");

            if (curTableId === tableId) {
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
                        $thToClick = $th;
                        break;
                    }
                }
            }
        });

        if (isFound && isOpenTime) {
            $rightJoinTable.find(".tableLabel").filter(function() {
                return ($(this).data("id") === curTableId);
            }).click();
            $thToClick.click();
            scrollToColumn($thToClick);
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
