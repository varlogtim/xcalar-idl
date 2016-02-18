window.JoinModal = (function($, JoinModal) {
    var $modalBackground = $("#modalBackground");

    var $joinModal = $("#joinModal");
    // var $joinInstr = $("#joinInstr");

    var $joinSelect   = $("#joinType");
    var $joinDropdown = $("#joinTypeSelect");
    var $joinPreview = $('#joinPreview');
    var $mainJoin     = $("#mainJoin");

    // var $joinTableName  = $("#joinRoundedInput");
    var $leftJoinTable  = $("#leftJoin");
    var $rightJoinTable = $("#rightJoin");

    var $multiJoinBtn = $("#multiJoinBtn");
    var $multiJoin    = $("#multiJoin");
    var multiClauseTemplate =
        '<div class="joinClause">' +
            '<input class="clause leftClause" type="text" spellcheck="false" ' +
                'readonly/>' +
              '<div class="middleIcon">' +
                '<div class="iconWrapper">' +
                  '<span class="icon"></span>' +
                '</div>' +
              '</div>' +
              '<input  class="clause rightClause" type="text" ' +
                'spellcheck="false" readonly/>' +
        '</div>';

    var dragSide  = null;
    var minHeight = 600;
    var minWidth  = 800;
    var modalHelper = new xcHelper.Modal($joinModal, {
        "minHeight": minHeight,
        "minWidth" : minWidth
    });
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
            updatePreviewText();
            hideJoinTypeSelect();
        });

        $joinModal.click(hideJoinTypeSelect);

        // This submits the joined tables
        $("#joinTables").click(function() {
            $(this).blur();

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
            var lTableName = $leftJoinTable.find(".tableLabel.active").text();
            var rTableName = $rightJoinTable.find(".tableLabel.active").text();

            getNewTableName(lTableName, rTableName)
            .then(function(newTableName) {
                var joinType = $joinSelect.find(".text").text();
                var tabeName = newTableName + Authentication.getHashId();
                if (isMultiJoin) {
                    multiJoinHelper(joinType, tabeName);
                } else {
                    singleJoinHelper(joinType, tabeName);
                }
            })
            .fail(function(error) {
                Alert.error("Error Naming New Table", error);
            });
        });

        // listener for toggle mutli clause section
        $multiJoinBtn.on("click", function() {
            var $activeBox = $multiJoinBtn.find(".offOnBox.active");

            if ($activeBox.hasClass("offBox")) {
                // case to open multi clause
                $activeBox.removeClass("active")
                            .siblings(".onBox").addClass("active");
                toggleMultiClause(true);
            } else {
                // case to close multi clause
                $activeBox.removeClass("active")
                            .siblings(".offBox").addClass("active");
                toggleMultiClause(false);
            }

            // XXX Hack From Cheng: I know it's a bad workaround,
            // the reason is because we use css with 0.5s delay to do animation,
            // so this is the way I could think
            // to move ws tab with table tab in sync
            // change it if you have better idea!
            var $wsLabels = $joinModal.find(".worksheetLabel");
            $wsLabels.hide();
            setTimeout(function() {
                updateWSTabSize($leftJoinTable);
                updateWSTabSize($rightJoinTable);
                $wsLabels.show();
            }, 600);
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
                    updatePreviewText();
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
                var clause = dragSide;
                var text   = originEvent.dataTransfer.getData("text");

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
                    updatePreviewText();
                }
            }

            return false;
        });

        $joinModal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        $joinModal.draggable({
            handle     : '.modalHeader',
            cursor     : '-webkit-grabbing',
            containment: 'window'
        });

        $joinModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document",
            resize     : function() {
                updateWSTabSize($leftJoinTable);
                updateWSTabSize($rightJoinTable);
            }
        });

        addModalTabListeners($leftJoinTable, true);
        addModalTabListeners($rightJoinTable, false);
    };

    JoinModal.show = function(tableId, colNum) {
        isOpenTime = true;
        $("body").on("keypress", joinTableKeyPress);
        $("body").on("mouseup", removeCursors);
        $modalBackground.on("click", hideJoinTypeSelect);
        modalHelper.setup();

        joinModalTabs($rightJoinTable, null, -1);
        joinModalTabs($leftJoinTable, tableId, colNum, $rightJoinTable);
        toggleMultiClauseToolTip(false);
        updatePreviewText();

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

        isOpenTime = false;

        function showHandler() {
            updateWSTabSize($leftJoinTable);
            updateWSTabSize($rightJoinTable);
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

    function toggleMultiClause(toMultiClause) {
        if (toMultiClause) {
            $mainJoin.addClass("multiClause");
            multiClauseOpener();

            $mainJoin.find(".colSelected").removeClass("colSelected");
            $mainJoin.find("th:not(.unselectable) .columnTab")
                    .prop("draggable", true);
        } else {
            $mainJoin.removeClass("multiClause");
            // the function will trigger click event on th, which is only
            // valid after remove .multiCluase
            multiClauseCloser();
            $multiJoin.find(".joinClause.placeholder").siblings().remove();
            $mainJoin.find(".columnTab").prop("draggable", false);
        }
        toggleMultiClauseToolTip(toMultiClause);
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
                var lTableId = $leftJoinTable.find(".tableLabel.active").data("id");
                highlightColumn(lTableId, lCols[0], true);
            }

            if (rCols.length === 1) {
                var rTableId = $rightJoinTable.find(".tableLabel.active").data("id");
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
                return $(this).find(".columnTab").text() === colName;
            });

            if ($th.length > 0) {
                $th.click();
                // XXX Not sure we should scroll or not
                // scrollToColumn($th);
            }
        }
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
        $mainJoin.find(".smartSuggest").removeClass("inActive");

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

    function updateWSTabSize($section) {
        // Caculate each table tab's width in the worksheet
        // and make the ws tab to be that size
        var $tabs = $section.find(".tableLabel");
        var includeMargin = true;

        $section.find(".worksheetLabel").each(function() {
            var $wsLabel = $(this);
            var ws = $wsLabel.data("ws");
            var width = 0;

            $tabs.each(function() {
                var $tab = $(this);
                if ($tab.data("ws") === ws) {
                    width += $tab.outerWidth(includeMargin);
                }
            });

            $wsLabel.css("flex", "0 1 " + width + "px");
        });
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
            // this is for left join table
            $modal.find(".tableLabel").filter(function() {
                return ($(this).data("id") === tableId);
            }).click();

            if (colNum > 0) {
                var $table = $("#xcTable-" + tableId);
                var dataColNum = $table.find('tbody .jsonElement').index();
                if (colNum >= dataColNum) {
                    colNum--;
                }

                $modal.find('.joinTable[data-id="' + tableId + '"]' +
                            ' th:nth-child(' + colNum + ')').click();
            }
        } else {
            // for right join table
            $modal.find('.tableLabel:first').click();
        }
    }

    function joinModalHTMLHelper($modal) {
        var wsTabHtml   = "";
        var tabHtml     = "";
        var $columnArea = $modal.find(".joinTableArea");
        var wsOrders    = WSManager.getOrders();
        // group table tab by worksheet (only show active table)
        for (var i = 0, len = wsOrders.length; i < len; i++) {
            var wsId = wsOrders[i];
            var ws = WSManager.getWSById(wsId);
            var wsTables = ws.tables;

            for (var j = 0; j < wsTables.length; j++) {
                var tableId = wsTables[j];
                var table   = gTables[tableId];

                if (j === 0) {
                    wsTabHtml +=
                        '<div title="' + ws.name + '" ' +
                        '"data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body" ' +
                        'class="worksheetLabel textOverflow tooltipOverflow" ' +
                        'data-ws="' + wsId + '" ' +
                        'data-id="' + tableId + '">' +
                            ws.name +
                        '</div>';
                }

                tabHtml +=
                    '<div class="tableLabel textOverflow tooltipOverflow" ' +
                    'title="' + table.tableName +
                    '" data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body" ' +
                    'data-ws="' + wsId + '" ' +
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
                                '<div class="colPadding"></div>' +
                                '<div title="' + colName + '" ' +
                                'data-container="body" ' +
                                'data-toggle="tooltip" data-placement="top" ' +
                                'class="columnTab textOverflow tooltipOverflow">' +
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
            $tbody.find(".selectedCell").removeClass("selectedCell");

            colHtml += $tbody.html();
            colHtml += '</table>';

            $columnArea.append(colHtml);
        }
    }

    function addModalTabListeners($modal, isLeft) {
        $modal.on('click', '.tableLabel', function() {
            var $tableLabel = $(this);
            if ($tableLabel.hasClass('active')) {
                return;
            }

            var tableId = $tableLabel.data("id");
            $modal.find(".tableLabel.active").removeClass("active");
            $tableLabel.addClass("active");


            $modal.find(".colSelected").removeClass("colSelected");
            $modal.find(".joinTable").hide();
            $modal.find('.joinTable[data-id="' + tableId + '"]').show();

            if ($mainJoin.hasClass("multiClause")) {
                // when multijoin, empty left or right inputs if new table
                // selected
                if ($tableLabel.closest('.joinContainer').attr('id') ===
                    'rightJoin')
                {
                    $joinModal.find('.rightClause').val("");
                } else {
                    $joinModal.find('.leftClause').val("");
                }
            }

            updateWSTabSize($modal);
            updatePreviewText();
        });

        $modal.on("click", ".smartSuggest", function() {
            $(".tooltip").hide();
            var $suggErrorArea = $(this).siblings(".suggError");
            var $checkSection = isLeft ? $rightJoinTable :
                                         $leftJoinTable;
            var $tableLabel = $checkSection.find(".tableLabel.active");
            var text;

            if ($tableLabel.length > 0) {
                var tableId = $tableLabel.data("id");
                var $th = $checkSection.find('.joinTable[data-id="' + tableId +
                                        '"] th.colSelected');
                if ($th.length > 0) {
                    var $suggSection = isLeft ? $leftJoinTable :
                                                $rightJoinTable;
                    var $suggTableLabel = $suggSection.find(".tableLabel.active");
                    if ($suggTableLabel.length === 0) {
                        console.error("Error, none of the lable is active!");
                        return;
                    }

                    var suggTableId = $suggTableLabel.data("id");
                    var isFind = suggestJoinKey(tableId, $th,
                                                $suggSection, suggTableId);

                    if (!isFind) {
                        text = "Sorry, cannot find a good key to match the ";
                        text += isLeft ? "right table" : "left table";
                        toolTipHelper(text);
                    }
                } else {
                    text = isLeft ? "Right" : "Left";
                    text += " table has no selected key";
                    toolTipHelper(text);
                }
            } else {
                console.error("Error, none of the label is active!");
            }

            function toolTipHelper(title) {
                $suggErrorArea.tooltip({
                    "title"    : title,
                    "placement": "right",
                    "animation": "true",
                    "container": "#" + $modal.attr("id"),
                    "trigger"  : "manual",
                    "template" : TooltipTemplate.Error
                });

                $suggErrorArea.tooltip("show");
                setTimeout(function() {
                    $suggErrorArea.tooltip("destroy");
                }, 1000);
            }
        });

        $modal.on('click', 'th', function() {
            var $th = $(this);

            if ($mainJoin.hasClass("multiClause")) {
                return;
            }

            if ($th.hasClass("unselectable")) {
                showErroTooltip($th, isLeft);
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
                    // suggest on right table
                    suggestJoinKey(tableId, $th, $rightJoinTable);
                }
            }
            updatePreviewText();
        });

        var dragImage;
        $modal.on("mousedown", ".columnTab", function() {
            if ($mainJoin.hasClass('multiClause')) {
                var $th = $(this).closest("th");
                if ($th.hasClass("unselectable")) {
                    showErroTooltip($th, isLeft);
                    return;
                }

                var cursorStyle =
                    '<style id="moveCursor" type="text/css">*' +
                        '{cursor:move !important; cursor: -webkit-grabbing !important;' +
                        'cursor: -moz-grabbing !important;}' +
                        '.tooltip{display: none !important;}' +
                    '</style>';
                $(document.head).append(cursorStyle);

                if (isBrowseChrome) {
                    var canvas = buildTabCanvas($(this));
                    dragImage = document.createElement("img");
                    dragImage.src = canvas.toDataURL();
                }
            }
        });

        $modal.on("dragstart", ".columnTab", function(event) {
            var originEvent = event.originalEvent;
            dragSide = isLeft ? "left" : "right";

            // XXX canvas not work for firfox, IE do not test
            if (isBrowseChrome) {
                if (dragImage != null) {
                    originEvent.dataTransfer.setDragImage(dragImage, 0, 0);
                } else {
                    console.error("Lose drag image!");
                }
            }

            originEvent.dataTransfer.effectAllowed = "copy";
            originEvent.dataTransfer.setData("text", $(this).text());

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
        var text = $tab.text();

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

    function showErroTooltip($th, isLeft) {
        // if ($th.hasClass('clicked')) {
        //     return;
        // }
        // $th.addClass("clicked");
        // var $div = $th.find("div");
        // $div.attr("data-toggle", "tooltip")
        //     .attr("data-placement", "top")
        //     .attr("data-original-title", "can't join this type")
        //     .attr("data-container", "body");
        // $div.mouseover();
        // setTimeout(function(){
        //     $div.mouseout();
        //     $div.removeAttr("data-toggle")
        //         .removeAttr("data-placement")
        //         .removeAttr("data-original-title")
        //         .removeAttr("data-container");
        //     // the reason for this time out is it will created more
        //     // than one tooltip if you click on th too quick
        //     setTimeout(function() {
        //         $th.removeClass("clicked");
        //     }, 100);
        // }, 2000);
        var $colPadding = $th.find(".colPadding");
        var id = isLeft ? "#leftJoin" : "#rightJoin";
        $colPadding.tooltip({
            "title"    : "Cannot join " + getType($th),
            "placement": "top",
            "animation": "true",
            "container": id,
            "trigger"  : "manual",
             "template" : TooltipTemplate.Error
        });

        $colPadding.tooltip("show");
        setTimeout(function() {
            $colPadding.tooltip("destroy");
        }, 1000);
    }

    function suggestJoinKey(tableId, $th, $suggSection, suggTableId) {
        var type     = getType($th);
        var colNum   = xcHelper.parseColNum($th);
        var colName  = $th.find(".columnTab").text();
        var context1 = contextCheck($th.closest('table'), colNum, type);

        var $thToClick;
        var tableIdToClick;

        // only score that more than -50 will be suggested, can be modified
        var maxScore = -50;
        var $suggTables = $suggSection.find("table");

        if (suggTableId != null) {
            $suggTables = $suggTables.filter(function() {
                return ($(this).data("id") === suggTableId);
            });
        }

        $suggTables.each(function() {
            var $suggTable = $(this);
            var curTaleId = $suggTable.data("id");

            if (curTaleId === tableId) {
                return;  // skip same table
            }

            $suggTable.find("th").each(function(index) {
                var $curTh = $(this);

                if (getType($curTh) === type) {
                    var context2 = contextCheck($suggTable, index + 1, type);

                    var curColName = $curTh.find(".columnTab").text();
                    var dist = getTitleDistance(colName, curColName);
                    var score = getScore(context1, context2, dist, type);

                    if (score > maxScore) {
                        maxScore = score;
                        $thToClick = $curTh;
                        tableIdToClick = curTaleId;
                    }
                }
            });
        });

        // if find the suggeest join key
        if (tableIdToClick != null) {
            $suggSection.find(".tableLabel").filter(function() {
                return ($(this).data("id") === tableIdToClick);
            }).click();

            if (!$thToClick.hasClass("colSelected")) {
                $thToClick.click();
            }

            scrollToColumn($thToClick);

            if (!isOpenTime) {
                $thToClick.tooltip({
                    "title"    : "Suggested Key",
                    "placement": "top",
                    "animation": "true",
                    "container": "#" + $suggSection.attr("id"),
                    "trigger"  : "manual"
                });

                $thToClick.tooltip("show");
                setTimeout(function() {
                    $thToClick.tooltip("destroy");
                }, 1000);
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

    function toggleMultiClauseToolTip(multi) {
        if (multi) {
            $multiJoinBtn.attr('data-original-title', 'switch to single join');
        } else {
            $multiJoinBtn.attr('data-original-title', 'switch to multi ' +
                               'clause join');
        }
        $('.tooltip').hide();
    }

    function updatePreviewText() {
        var joinType = $joinSelect.find(".text").text();
        var lTableName = $leftJoinTable.find(".tableLabel.active").text();
        var rTableName = $rightJoinTable.find(".tableLabel.active").text();
        var isMultiJoin = $mainJoin.hasClass("multiClause");
        var previewText = '<span class="joinType">' + joinType +
                          '</span> <span class="highlighted">' + lTableName +
                          '</span>, <span class="highlighted">' + rTableName +
                          '</span><br/>ON ';
        var columnPairs = [];
        var pair;
        var lClause;
        var rClause;
        if (isMultiJoin) {
            $multiJoin.find(".joinClause:not(.placeholder)").each(function() {

                var $joinClause = $(this);
                lClause = $joinClause.find(".leftClause").val().trim();
                rClause = $joinClause.find(".rightClause").val().trim();
                pair = [lClause, rClause];
                columnPairs.push(pair);
            });
            
        } else {
            lClause = $leftJoinTable.find("th.colSelected").text();
            rClause = $rightJoinTable.find('th.colSelected').text();
            pair = [lClause, rClause];
            columnPairs.push(pair);
        }

        var numPairs = columnPairs.length;
        var leftColText;
        var rightColText;
        var blank = true;
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
                previewText += leftColText + ' = ' + rightColText + " AND ";
                blank = false;
            }
        }
        var textLen = previewText.length;
        if (!blank) {
            previewText = previewText.slice(0, textLen - 5);
        }
        previewText += ";";
        $joinPreview.html(previewText);
    }

    function getNewTableName(lTableName, rTableName) {
        var deferred = jQuery.Deferred();
        var tempName = xcHelper.getTableName(lTableName) + '-' +
                       xcHelper.getTableName(rTableName);
        var destName;
        var tableNames = {};
        XcalarGetTables()
        .then(function(result) {
            var tables = result.nodeInfo;
            for (var i = 0; i < result.numNodes; i++) {
                var name = xcHelper.getTableName(tables[i].name);
                tableNames[name] = 1;
            }

            var validNameFound = false;
            var limit = 20; // we won't try more than 20 times
            destName = tempName;
            if (tableNames.hasOwnProperty(destName)) {
                for (var i = 1; i <= limit; i++) {
                    destName = tempName + i;
                    if (!tableNames.hasOwnProperty(destName)) {
                        validNameFound = true;
                        break;
                    }
                }
                if (!validNameFound) {
                    var tries = 0;
                    while (tableNames.hasOwnProperty(destName) && tries < 100) {
                        destName = xcHelper.randName(tempName, 4);
                        tries++;
                    }
                }
            }
            deferred.resolve(destName);
        })
        .fail(function(error) {
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    return (JoinModal);
}(jQuery, {}));
