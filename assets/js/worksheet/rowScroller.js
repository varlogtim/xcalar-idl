window.RowScroller = (function($, RowScroller) {
    var $rowInput;        // $("#rowInput");
    var $rowScrollerArea; // $("#rowScrollerArea");
    var rowInfo = {};

    RowScroller.setup = function() {
        $rowInput = $("#rowInput");
        $rowScrollerArea = $("#rowScrollerArea");

        $rowInput.val("").data("");
        $rowInput.blur(function() {
            var val = $(this).data('val');
            $(this).val(val);
        });

        $rowScrollerArea.mousedown(function(event) {
            if (event.which !== 1 || $(".rowScroller").length === 0) {
                return;
            }
            if (!gActiveTableId) {
                return;
            }


            var tableId = gActiveTableId;
            if ($('#rowScroller-' + tableId).hasClass('scrolling')) {
                return;
            }
            var $tableWrap = $('#xcTableWrap-' + tableId);
            xcHelper.centerFocusedTable($tableWrap, false,
                                                {onlyIfOffScreen: true});
            var $eventTarget = $(event.target);

            if ($eventTarget.hasClass("rangeWrapper")) {
                rowScrollerStartDrag(event, $(event.target).parent());
                return;
            }
            if ($eventTarget.closest('.arrow').length ||
                $eventTarget.closest('.rangeBar').length) {
                rowScrollerStartDrag(event, $eventTarget.closest('.rowMarker'));
                return;
            }

            var $rowScroller = $('#rowScroller-' + tableId);
            if ($rowScroller.hasClass('locked')) {
                return;
            }
            var table = gTables[tableId];
            var mouseX = event.pageX - $rowScroller.offset().left;
            var rowPercent = mouseX / $(this).width();


            var translate = Math.min(99.9, Math.max(0, rowPercent * 100));
            var pctOfRowsShowing = getPctOfRowsShowing(tableId);
            var update = false;
            if (translate > (100 - pctOfRowsShowing)) {
                update = true;
            }
            translate = Math.min(translate, 100 - pctOfRowsShowing);
            var $rowMarker = $('#rowMarker-' + tableId);
            $rowMarker.css("transform",
                                "translate3d(" + translate + "%, 0px, 0px)");
            if (update) {
                RowScroller.updateViewRange(tableId);
            }

            var rowNum = Math.ceil(rowPercent * table.resultSetCount);
            if ($rowScroller.find(".bookmark").length > 0) {
                // check 8 pixels around for bookmark?
                var yCoor = $rowScroller.offset().top + $rowScroller.height() - 5;
                for (var x = (event.pageX - 4); x < (event.pageX + 4); x++) {
                    var element = $(document.elementFromPoint(x, yCoor));
                    if (element.hasClass("bookmark")) {
                        rowNum = parseBookmarkNum(element);
                        break;
                    }
                }
            }

            if (!isTableScrollable(tableId)) {
                return;
            }

            var e = $.Event("keypress");
            e.which = keyCode.Enter;
            e.rowScrollerMousedown = true;

            setTimeout( function() {
                $rowInput.val(rowNum).trigger(e);
            }, 145);
        });

        $rowInput.keypress(function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }

            var tableId = gActiveTableId;
            var table = gTables[tableId];
            var $table = $('#xcTable-' + tableId);

            if (!table || table.hasLock()) {
                return;
            }

            if ($('#rowScroller-' + tableId).hasClass('scrolling')) {
                return;
            }

            // note that resultSetCount is the total num of rows
            // resultSetMax is the max row that can fetch
            var maxRow   = table.resultSetMax;
            var maxCount = table.resultSetCount;

            if (!isTableScrollable(tableId)) {
                if (maxRow === 0) {
                    // when table has no rows
                    $rowInput.val(0).data("val", 0);
                } else {
                    $rowInput.data("val", 1).val(1);
                    rowScrollerMove(1, maxCount);
                }

                return;
            }

            var curRow    = $rowInput.data("val");
            var targetRow = Number($rowInput.val());
            var backRow   = targetRow;

            if (isNaN(targetRow) || targetRow % 1 !== 0) {
                $rowInput.val(curRow);
                return;
            }

            var rowOnScreen = RowScroller.getLastVisibleRowNum(tableId) -
                                curRow + 1;
            if (isNaN(rowOnScreen)) {
                rowOnScreen = xcHelper.parseRowNum($table.find('tr:last'));
            }
            // divide evenly on both top and bottom buffer
            var rowToBuffer = Math.floor((gMaxEntriesPerPage - rowOnScreen) / 2);

            targetRow = Math.max(1, targetRow);
            targetRow = Math.min(targetRow, maxCount);

            $rowInput.data("val", targetRow).val(targetRow);

            backRow = Math.min(table.resultSetMax - gMaxEntriesPerPage,
                                targetRow - rowToBuffer);
            backRow = Math.max(backRow, 0);

            var tableName = table.tableName;
            var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetMax);
            var info = {
                "numRowsToAdd"    : numRowsToAdd,
                "numRowsAdded"    : 0,
                "lastRowToDisplay": backRow + numRowsToAdd,
                "targetRow"       : targetRow,
                "bulk"            : true,
                "tableName"       : tableName,
                "tableId"         : tableId,
                "currentFirstRow" : backRow
            };
            $('#rowScroller-' + tableId).addClass('scrolling');

            goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
            .then(function() {
                var arr = [];
                $table.find('tbody tr').each(function() {
                    arr.push($(this).find('td:first').text());
                });
                $('#xcTableWrap-' + tableId).find('.tableCoverWaiting')
                                            .remove();
                $('#rowScroller-' + tableId).removeClass('scrolling');
                var rowToScrollTo = Math.min(targetRow, table.resultSetMax);
                positionScrollbar(rowToScrollTo, tableId);
                RowScroller.genFirstVisibleRowNum();
                RowScroller.updateViewRange(tableId);

                if (!event.rowScrollerMousedown) {
                    rowScrollerMove($rowInput.val(), maxCount);
                } else {
                    $rowScrollerArea.addClass("autoScroll");
                }
            });
        });

        $('#rowInputArea').mousedown(function() {
            if ($(".rowScroller").length === 0 || !gActiveTableId) {
                return;
            }
            var tableId = gActiveTableId;
            var $tableWrap = $('#xcTableWrap-' + tableId);
            xcHelper.centerFocusedTable($tableWrap, false,
                                                {onlyIfOffScreen: true});
        });
    };

    RowScroller.add = function(tableId) {
        var rowScrollerHTML =
            '<div id="rowScroller-' + tableId + '" ' +
            'class="rowScroller" data-id="' + tableId + '">' +
                '<div id="rowMarker-' + tableId + '" class="rowMarker" ' +
                'data-id="' + tableId + '">' +
                    '<div class="rangeWrapper">' +
                        '<div class="top arrow"' +
                            'data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="left" data-title="row 0">' +
                            '<div class="bar"></div>' +
                            '<div class="triangle"></div>' +
                        '</div>' +
                        '<div class="rangeBar"></div>' +
                        '<div class="bottom arrow"' +
                            'data-toggle="tooltip" ' +
                            'data-container="body" ' +
                            'data-placement="left" data-title="row 0">' +
                            '<div class="bar"></div>' +
                            '<div class="triangle"></div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="tooltipHelper"' +
                    'data-toggle="tooltip" ' +
                    'data-container="body" ' +
                    'data-placement="bottom" title="' + ScrollTStr.Title +
                '"></div>' +
            '</div>';

        $rowScrollerArea.append(rowScrollerHTML);

        var rows = gTables[tableId].bookmarks;
        for (var i = 0, numRows = rows.length; i < numRows; i++) {
            RowScroller.addBookMark(rows[i], tableId);
        }

        if ($(".xcTable").length > 1) {
            $(".rowScroller").last().hide();
        } else if ($("#xcTableWrap-" + tableId).hasClass('inActive')) {
            $('#rowScroller-' + tableId).hide();
        }
    };

    RowScroller.update = function(tableId) {
        var $numPages = $("#numPages");
        var table = gTables[gActiveTableId];
        showRowScroller(tableId);
        var inputWidth = 50;
        if (!gActiveTableId || $.isEmptyObject(table)) {
            $numPages.text("");
        } else {
            var rowCount = table.resultSetCount;
            var num = Number(rowCount).toLocaleString("en");
            $numPages.text("of " + num);
            var numDigits = ("" + rowCount).length;
            inputWidth = Math.max(inputWidth, 10 + (numDigits * 8));
        }
        $rowInput.width(inputWidth);
    };

    RowScroller.updateViewRange = function(tableId) {
        if (!tableId) {
            return;
        }
        var tableRowInfo = getTableRowInfo(tableId);
        var $rowMarker = $('#rowMarker-' + tableId);

        $rowMarker.find('.rangeWrapper').width(tableRowInfo.pctRowsShowing + "%");
        $rowMarker.find('.top').attr('data-original-title',
                                     'row ' + tableRowInfo.topRow);
        $rowMarker.find('.bottom').attr('data-original-title',
                                        'row ' + tableRowInfo.botRow);
    };

    RowScroller.empty = function() {
        $rowInput.val("").data("val", "");
        gActiveTableId = null;
        RowScroller.update();
    };

    // for book mark tick
    RowScroller.addBookMark = function(rowNum, tableId) {
        var table = gTables[tableId];
        var leftPos = 100 * (rowNum / table.resultSetCount);
        var title = xcHelper.replaceMsg(ScrollTStr.BookMark, {
            "row": (rowNum + 1)
        });
        var bookmark = '<div class="bookmark bkmkRow' + rowNum + '" ' +
                       'style="left:' + leftPos + '%;" data-toggle="tooltip" ' +
                       ' data-placement="bottom" ' +
                       'data-container="body" title="' + title + '"></div>';
        var $rowScroller = $('#rowScroller-' + tableId);
        $rowScroller.append(bookmark);
    };

    RowScroller.removeBookMark = function(rowNum, tableId) {
        var $rowScroller = $('#rowScroller-' + tableId);
        $rowScroller.find('.bkmkRow' + rowNum).remove();
    };

    RowScroller.resize = function() {
        // resize the lenght of #rowInput
        if (!gActiveTableId) {
            return;
        }
        var table = gTables[gActiveTableId];
        var resultSetCount   = table.resultSetCount;
        var resultTextLength = ("" + resultSetCount).length;

        if (resultTextLength > $rowInput.attr('size')) {
            $rowInput.attr({
                'maxLength': resultTextLength,
                'size'     : resultTextLength
            });
        }
    };

    RowScroller.genFirstVisibleRowNum = function() {
        var firstRowNum = getFirstVisibleRowNum();
        if (firstRowNum !== null) {
            var activeTableId = gActiveTableId;
            $('#rowInput').val(firstRowNum).data('val', firstRowNum);
            if (isTableScrollable(activeTableId)) {
                rowScrollerMove(firstRowNum,
                                 gTables[activeTableId].resultSetCount);
            }
        }
    };

    RowScroller.getFirstVisibleRowNum = getFirstVisibleRowNum;

    function getFirstVisibleRowNum(tableId) {
        if (!document.elementFromPoint) {
            return null;
        }
        var activeTableId;
        if (!tableId) {
            activeTableId = gActiveTableId;
        } else {
            activeTableId = tableId;
        }

        var $table = $('#xcTable-' + activeTableId);
        if ($table.length === 0) {
            return null;
        }
        var tableLeft = $table.offset().left;
        var tdXCoor = Math.max(0, tableLeft);
        var tdYCoor = 150; //top rows's distance from top of window
        var firstEl = document.elementFromPoint(tdXCoor, tdYCoor);
        var firstId = $(firstEl).closest('tr').attr('class');

        if (firstId && firstId.length > 0) {
            var firstRowNum = parseInt(firstId.substring(3)) + 1;
            if (!isNaN(firstRowNum)) {
                return (firstRowNum);
            } else {
                return null;
            }
        } else {
            // var offsetTop = $table.parent().offset().top;
            // // tdYCoor may need to be changed when query graph is open
            // tdYCoor += (offsetTop - 114);
            var $trs = $table.find('tbody tr');
            var $tr;
            var rowNum = null;
            $trs.each(function() {
                $tr = $(this);
                if ($tr[0].getBoundingClientRect().bottom > tdYCoor) {
                    rowNum = xcHelper.parseRowNum($tr) + 1;
                    return false;
                }
            });
            return (rowNum);
        }
    }

    RowScroller.getLastVisibleRowNum = function(tableId) {
        var $tableWrap = $("#xcTableWrap-" + tableId);
        if ($tableWrap.length === 0) {
            return null;
        }
        var tableWrapTop = $tableWrap.offset().top;
        var tableBottom = $tableWrap.offset().top + $tableWrap.height();
        var minTableBottom = tableWrapTop + gFirstRowPositionTop +
                             gRescol.minCellHeight;
        tableBottom = Math.max(tableBottom, minTableBottom);
        var $trs = $tableWrap.find(".xcTable tbody tr");

        for (var i = $trs.length - 1; i >= 0; i--) {
            var $tr = $trs.eq(i);

            if ($tr.offset().top < tableBottom) {
                var rowNum = xcHelper.parseRowNum($tr) + 1;
                return rowNum;
            }
        }
        return null;
    };

    function rowScrollerMove(rowNum, resultSetCount) {
        var pct = 100 * ((rowNum - 1) / resultSetCount);
        var $rowMarker = $('#rowMarker-' + gActiveTableId);
        $rowMarker.css("transform", "translate3d(" + pct + "%, 0px, 0px)");
        var currRangeWidth = $rowMarker.find('.rangeWrapper').width();
        var rowMarkerWidth = $rowMarker.width();
        if (100 * (currRangeWidth / rowMarkerWidth) > (100 - pct)) {
            $rowMarker.find('.rangeWrapper').width((100 - pct) + '%');
        }
    }

    // mouse event for row scroller
    function rowScrollerMouseMove(event) {
        var mouseX = event.pageX;
        var translate;

        if (mouseX - rowInfo.totalOffset < rowInfo.boundary.lower) {
            translate = 0;
        } else if (mouseX - rowInfo.totalOffset > rowInfo.boundary.upper ) {
            translate = rowInfo.maxTranslate;
        } else {
            translate = 100 * (mouseX - rowInfo.scrollAreaOffset -
                        rowInfo.totalOffset) / (rowInfo.rowScrollerWidth);
        }

        rowInfo.el.css('transform', 'translate3d(' + translate + '%, 0px, 0px)');
    }

    function rowScrollerMouseUp() {
        gMouseStatus = null;
        $(document).off('mousemove.rowScrollerDrag');
        $(document).off('mouseup.rowScrollerMouseUp');
        rowInfo.el.removeClass('scrolling');
        $('#moveCursor').remove();
        xcHelper.reenableTextSelection();
        $('body').removeClass('tooltipOff');
        var e = $.Event("mousedown");
        e.which = 1;
        e.pageX = (rowInfo.el.offset().left - parseInt(rowInfo.el.css('left')) + 0.5);
        if (e.pageX + 3 >= rowInfo.boundary.upper) {
            e.pageX += 3;
        } else if (e.pageX - 2 <= rowInfo.scrollAreaOffset) {
            e.pageX -= 2;
        }
        $rowScrollerArea.trigger(e);
    }

    function showRowScroller(tableId) {
        $(".rowScroller").hide();
        if (tableId != null) {
            var $rowScroller = $('#rowScroller-' + tableId);
            $rowScroller.show();
        }
    }

    function parseBookmarkNum(el) {
        var classNames = el.attr('class');
        var index = classNames.indexOf('bkmkRow') + 'bkmkRow'.length;
        return parseInt(classNames.substring(index)) + 1;
    }

    function positionScrollbar(row, tableId) {
        var canScroll = true;
        var $table = $('#xcTable-' + tableId);
        var theadHeight = $table.find('thead').height();

        function positionScrollToRow() {
            if (!$table.find('.row' + (row - 1))[0]) {
                return;
            }
            var $tableWrap = $('#xcTableWrap-' + tableId);
            var $tbodyWrap = $('#xcTbodyWrap-' + tableId);

            var tdTop = $table.find('.row' + (row - 1))[0].offsetTop;
            var scrollPos = Math.max((tdTop - theadHeight), 1);
            if (canScroll && scrollPos >
                ($table.height() - $tableWrap.height()))
            {
                canScroll = false;
            }
            $rowScrollerArea.addClass('autoScroll');
            $tbodyWrap.scrollTop(scrollPos);
        }

        positionScrollToRow();
        if (!canScroll) {
            // this means we can't scroll to page without moving scrollbar all the
            // way to the bottom, which triggers another getpage and thus we must
            // try to position the scrollbar to the proper row again
            setTimeout(positionScrollToRow, 1);
        }
    }

    function rowScrollerStartDrag(event, $el) {
        gMouseStatus = "rowScroller";
        $el.addClass('scrolling');
        rowInfo.el = $el;
        rowInfo.mouseStart = event.pageX;
        rowInfo.scrollAreaOffset = $el.parent().offset().left;
        rowInfo.rowScrollerWidth = $el.parent().width();
        var rangeWidth = $el.find('.rangeWrapper').outerWidth();
        var mouseOffset = rowInfo.mouseStart - $el.offset().left;
        var cssLeft = parseInt($el.css('left'));
        rowInfo.totalOffset = mouseOffset + cssLeft;
        rowInfo.boundary = {
            "lower": rowInfo.scrollAreaOffset,
            "upper": rowInfo.scrollAreaOffset + rowInfo.rowScrollerWidth -
                     rangeWidth
        };
        rowInfo.maxTranslate = 100 - 100 * (rangeWidth / rowInfo.rowScrollerWidth) + 0.2;

        var cursorStyle = '<div id="moveCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);
        xcHelper.disableTextSelection();
        $(document).on('mousemove.rowScrollerDrag', rowScrollerMouseMove);
        $(document).on('mouseup.rowScrollerMouseUp', rowScrollerMouseUp);
    }

    // returns object containing numbers of rows showing, percent of full table,
    // topmost visible row, bottommost visible row
    function getTableRowInfo(tableId) {
        var topRow = getFirstVisibleRowNum(tableId);
        var botRow = RowScroller.getLastVisibleRowNum(tableId);
        var totalRows = gTables[tableId].resultSetMax;
        if (!botRow) {
            var $table = $('#xcTable-' + tableId);
            if ($table.length) {
                botRow = $table.find('tbody tr').length;
            }
        }
        if (!botRow) {
            botRow = totalRows;
        }
        var numRowsShowing = botRow - (topRow - 1);
        var pctRowsShowing = 100 * (numRowsShowing / totalRows);

        return ({
            topRow        : topRow,
            botRow        : botRow,
            numRowsShowing: numRowsShowing,
            pctRowsShowing: pctRowsShowing
        });
    }

    function getPctOfRowsShowing(tableId) {
        var topRow = getFirstVisibleRowNum() || 1;
        var botRow = RowScroller.getLastVisibleRowNum(tableId);
        var totalRows = gTables[tableId].resultSetMax;
        if (!botRow) {
            var $table = $('#xcTable-' + tableId);
            if ($table.length) {
                botRow = $table.find('tbody tr').length;
            }
        }
        if (!botRow) {
            botRow = totalRows;
        }
        var numRowsShowing = botRow - (topRow - 1);
        return (100 * (numRowsShowing / totalRows));
    }

    return (RowScroller);
}(jQuery, {}));
