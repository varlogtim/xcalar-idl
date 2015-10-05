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
                var tabeName = newTableName + Authentication.getHashId();
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

        if (gMinModeOn) {
            $modalBackground.show();
            $joinModal.show();
            showHandler();
        } else {
            $modalBackground.fadeIn(300, function() {
                $joinModal.fadeIn(180);
                showHandler();
            });
        }

        modalHelper.setup();
        isOpenTime = false;

        function showHandler() {
            scrollToColumn($leftJoinTable.find("th.colSelected"));
            // this is the case when right table has suggested col
            scrollToColumn($rightJoinTable.find("th.colSelected"));

            // have to reattach scroll listener each time modal is opened
            // because it is lost for some reason
            $("#mainJoin .joinTableArea").off('scroll');
            $("#mainJoin .joinTableArea").scroll(function(){
                $(this).scrollTop(0);
            });
        }
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
        xcFunction.join([lColNum], lTableId, [rColNum], rTableId,
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

        // right table
        var $rTLabel = $rightJoinTable.find(".tableLabel.active");
        var rTableId = $rTLabel.data('id');
        var $rTable  = $rightJoinTable.find('.joinTable[data-id="' +
                                                rTableId + '"]');

        var lColNums = [];
        var rColNums = [];

        for (var i = 0; i < lCols.length; i++) {
            lColNums[i] = getColNum($lTable, lCols[i]);
        }

        for (var i = 0; i < rCols.length; i++) {
            rColNums[i] = getColNum($rTable, rCols[i]);
        }

        resetJoinTables();
        xcFunction.join(lColNums, lTableId, rColNums, rTableId,
                        joinType, newTableName);
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

        modalHelper.clear();
        modalHelper.enableSubmit();

        var fadeOutTime = gMinModeOn ? 0 : 300;

        $joinModal.hide();
        $modalBackground.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });

        // clean up multi clause section
        $mainJoin.removeClass("multiClause");
        $multiJoinBtn.find(".active").removeClass("active")
                    .end()  // back to $("#multiJoinBtn")
                    .find(".offBox").addClass("active");
        $multiJoin.find(".placeholder").siblings().remove();


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
                // when focus on a button, no trigger
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
        var wsTabHtml   = "";
        var tabHtml     = "";
        var worksheets  = WSManager.getWorksheets();
        var $columnArea = $modal.find(".joinTableArea");

        // group table tab by worksheet (only show active table)
        for (var i = 0, len = worksheets.length; i < len; i++) {
            if (worksheets[i] == null) {
                // case that ws is deleted
                continue;
            }

            var wsTables = worksheets[i].tables;

            for (var j = 0; j < wsTables.length; j++) {
                var wsName  = (j === 0) ? worksheets[i].name : "";
                var tableId = wsTables[j];
                var table   = gTables[tableId];

                wsTabHtml +=
                    '<div class="worksheetLabel textOverflow" ' +
                    'data-id="' + tableId + '">' +
                        wsName +
                    '</div>';
                tabHtml +=
                    '<div class="tableLabel textOverflow" ' +
                    'data-id="' + tableId + '">' +
                        table.tableName +
                    '</div>';

                appendColHTML(tableId, table.tableCols);
            }
        }

        $modal.find(".worksheetTabs").html(wsTabHtml);
        $modal.find(".tableTabs").html(tabHtml);

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

                var type    = tableCols[t].type;
                var thClass = "col" + (t + 1) + " type-" + type;

                if (type === "object" || type === "undefined") {
                    thClass += " unselectable";
                }

                colHtml += '<th class="' + thClass + '">' +
                                '<div class="columnTab textOverflow">' +
                                    colName +
                                '</div>' +
                            '</th>';
            }

            colHtml += '</tr></thead>';

            var $tbody = $('#xcTable-' + id).find('tbody').clone(true);

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

            $modal.find(".worksheetLabel.active").removeClass("active");
            $modal.find(".worksheetLabel[data-id=" + tableId + "]")
                    .addClass("active");

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
                    // the reason for this time out is it will created more
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

            if ($th.hasClass('colSelected')) {
                 // unselect column
                $th.removeClass('colSelected');
                $table.find('.col' + colNum).removeClass('colSelected');
            } else {
                // select column
                $modal.find('.colSelected').removeClass('colSelected');
                $table.find('.col' + colNum).addClass('colSelected');

                if (isLeft && isOpenTime) {
                    suggestJoinKey(tableId, $th);
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

    function getType($th) {
        // match "abc type-XXX abc" and "abc type-XXX"
        var match = $th.attr("class").match(/type-(.*)/)[1];
        // match = "type-XXX" or "type-XXX abc"
        return (match.split(" ")[0]);
    }

    function suggestJoinKey(tableId, $th) {
        var type     = getType($th);
        var colNum   = xcHelper.parseColNum($th);
        var colName  = $th.find(".columnTab").text();
        var lContext = contextCheck($th.closest('table'), colNum, type);

        var $thToClick;
        var tableIdToClick;

        // XXX the limit score valid as suggest key, can be modified
        var maxScore = -50;

        $rightJoinTable.find("table").each(function() {
            var $rTable  = $(this);
            var rTableId = $rTable.data("id");

            if (rTableId === tableId) {
                return;  // skip same table
            }

            $rTable.find("th").each(function(index) {
                var $rTh = $(this);

                if (getType($rTh) === type) {
                    var rContext = contextCheck($rTable, index + 1, type);

                    var curColName = $rTh.find(".columnTab").text();
                    var dist = getTitleDistance(colName, curColName);

                    var score = getScore(lContext, rContext, dist, type);

                    if (score > maxScore) {
                        maxScore = score;
                        $thToClick = $rTh;
                        tableIdToClick = rTableId;
                    }
                }
            });
        });

        if (tableIdToClick != null) {
            // if find the suggeest join key
            $rightJoinTable.find(".tableLabel").filter(function() {
                return ($(this).data("id") === tableIdToClick);
            }).click();
            $thToClick.click();
            scrollToColumn($thToClick);
        }
    }

    function getScore(context1, context2, titleDist, type) {
        // max: 1,
        // min: 1,
        // avg: 2
        // sig2(variance): 5
        // dist: 7
        // hash match: 3?

        // the two value of max, min, sig2, avg..closer, score is better,
        // also, shorter distance, higher score. So those socres are negative

        var score   = 0;
        var bucket  = {};
        var bucket2 = {};
        var match   = 0;

        if (type === "string") {
            // XXX current way is hash each char and count frequency
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
        } else {
            // a base score for number,
            // since limit score to pass is -50
            match = 20;
        }

        score += match * 3;
        score += Math.abs(context1.max - context2.max) * -1;
        score += Math.abs(context1.min - context2.min) * -1;
        score += Math.abs(context1.avg - context2.avg) * -2;
        score += Math.abs(context1.sig2 - context2.sig2) * -5;
        score += titleDist * -7;
        return (score);
    }

    function contextCheck($table, colNum, type) {
        // only check number and string
        if (type !== "integer" && type !== "decimal" && type !== "string") {
            return {"max": 0, "min": 0, "total": 0, "variance": 0};
        }

        var max   = Number.MIN_VALUE;
        var min   = Number.MAX_VALUE;
        var total = 0;
        var datas = [];
        var values = [];

        $table.find("td.col" + colNum).each(function() {
            var val = $(this).find(".addedBarTextWrap").text();
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

    return (JoinModal);
}(jQuery, {}));
