window.RowScroller = (function($, RowScroller) {
    var $rowInput;        // $("#rowInput");
    var rowInfo = {};

    RowScroller.setup = function() {
        $rowInput = $("#rowInput");

        $rowInput.val("").data("");
        $rowInput.blur(function() {
            var val = $(this).data('val');
            $(this).val(val);
        });

        $rowInput.keypress(function(event, noScrollBar) {
            if (event.which !== keyCode.Enter) {
                return;
            }

            var tableId = gActiveTableId;
            var table = gTables[tableId];
            var $table = $('#xcTable-' + tableId);

            if (!table || table.hasLock()) {
                return;
            }

            if ($table.hasClass('scrolling')) {
                return;
            }

            // note that resultSetCount is the total num of rows
            // resultSetMax is the max row that can fetch
            var maxRow = table.resultSetMax;
            var maxCount = table.resultSetCount;

            if (!TblFunc.isTableScrollable(tableId)) {
                if (maxRow === 0) {
                    // when table has no rows
                    $rowInput.val(0).data("val", 0);
                } else {
                    $rowInput.data("val", 1).val(1);
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

            var numRowsToAdd = Math.min(gMaxEntriesPerPage, table.resultSetMax);
            var info = {
                "lastRowToDisplay": backRow + numRowsToAdd,
                "targetRow": targetRow,
                "bulk": true,
                "tableId": tableId,
                "currentFirstRow": backRow
            };

            RowManager.addRows(backRow, numRowsToAdd, RowDirection.Bottom, info)
            .always(function() {
                TblManager.removeWaitingCursor(tableId);
                var rowToScrollTo = Math.min(targetRow, table.resultSetMax);
                positionScrollbar(rowToScrollTo, tableId, !noScrollBar);
                RowScroller.genFirstVisibleRowNum();
            });
        });

        $('#rowInputArea').mousedown(function() {
            if (!gActiveTableId) {
                return;
            }
            var tableId = gActiveTableId;
            var $tableWrap = $('#xcTableWrap-' + tableId);
            if (!$tableWrap.length) {
                return;
            }
            xcHelper.centerFocusedTable($tableWrap, false,
                                                {onlyIfOffScreen: true});
        });
    };

    RowScroller.setSizerHeight = function(tableId) {
        var sizerHeight = getSizerHeight(tableId);
        var scale = 1;
        if (sizerHeight > gMaxDivHeight) {
            scale = sizerHeight / gMaxDivHeight;
            sizerHeight = gMaxDivHeight;
        }
        gTables[tableId].scrollMeta.scale = scale;
        $("#xcTableWrap-" + tableId).find(".sizer").height(sizerHeight);
    };

    function getSizerHeight(tableId) {
        var table = gTables[tableId];
        var sizerHeight = table.resultSetCount * gRescol.minCellHeight;
        for (var pageNum in table.rowHeights) {
            var page = table.rowHeights[pageNum];
            for (var row in page) {
                sizerHeight += (page[row] - gRescol.minCellHeight);
            }
        }
        return sizerHeight;
    }

    // calculates the height of all the top rows that are not visible
    RowScroller.getRowsAboveHeight = function(tableId, numRowsAbove) {
        var table = gTables[tableId];
        var numPages = Math.ceil(numRowsAbove / gNumEntriesPerPage);
        var height = numRowsAbove * gRescol.minCellHeight;
        for (var pageNum in table.rowHeights) {
            pageNum = parseInt(pageNum);
            if (pageNum < numPages) {
                var page = table.rowHeights[pageNum];
                if (pageNum === numPages - 1) {
                    for (var row in page) {
                        row = parseInt(row);
                        if (row <= numRowsAbove) {
                            height += (page[row] - gRescol.minCellHeight);
                        }
                    }
                } else {
                    for (var row in page) {
                        height += (page[row] - gRescol.minCellHeight);
                    }
                }
            }
        }
        return height;
    };

    function setupScrollbar(tableId) {
        var $scrollBar = $("#xcTableWrap-" + tableId).find(".tableScrollBar");
        var table = gTables[tableId];
        var numRows = table.resultSetCount;
        var isMouseDown = false;
        var $table = $("#xcTable-" + tableId);

        // XXX move this into the table constructor
        table.scrollMeta = {};
        var scrollMeta = table.scrollMeta;
        scrollMeta.base = 0;
        scrollMeta.isTableScrolling = false;
        scrollMeta.isBarScrolling = false;
        RowScroller.setSizerHeight(tableId);
        var visibleRows = Math.min(gMaxEntriesPerPage, table.resultSetCount);

        $scrollBar.scroll(function(event) {
            if (isMouseDown) {
                return;
            }
            if (scrollMeta.isTableScrolling) {
                scrollMeta.isTableScrolling = false;
            } else {
                scrollMeta.isBarScrolling = true;
                var top = $scrollBar.scrollTop() + scrollMeta.base;
                var numRowsAbove = table.currentRowNumber - visibleRows;
                var rowsAboveHeight = RowScroller.getRowsAboveHeight(tableId,
                                                                numRowsAbove);
                top -= rowsAboveHeight;
                $("#xcTbodyWrap-" + tableId).scrollTop(top);
            }
        });


        $scrollBar.on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            isMouseDown = true;
            $(document).on("mouseup.tableScrollBar", function() {
                isMouseDown = false;
                $(document).off("mouseup.tableScrollBar");

                if ($table.hasClass("scrolling")) {
                    return;
                }

                var top = $scrollBar.scrollTop() * scrollMeta.scale;

                // if scrollbar is all the way at the bottom
                if (scrollMeta.scale > 1 && ($scrollBar[0].scrollHeight -
                    $scrollBar.scrollTop() - $scrollBar.outerHeight() <= 1)) {
                    top += $scrollBar.outerHeight() * scrollMeta.scale;
                }

                var rowNum = Math.ceil((top / gRescol.minCellHeight));
                var defaultRowNum = rowNum;

                var numPages = Math.ceil(rowNum / gNumEntriesPerPage);
                var extraHeight = 0;
                var numAdjustedRows = 0;
                for (var pageNum in table.rowHeights) {
                    if (pageNum < numPages) {
                        var page = table.rowHeights[pageNum];
                        for (var row in page) {
                            if (row <= rowNum) {
                                var height = page[row] - gRescol.minCellHeight;
                                extraHeight += height;
                                numAdjustedRows++;
                                rowNum = Math.ceil(defaultRowNum -
                                    (extraHeight / gRescol.minCellHeight));

                                numPages = Math.ceil(rowNum /
                                                     gNumEntriesPerPage);
                                if (pageNum >= numPages) {
                                    extraHeight -= height;
                                    rowNum = Math.ceil(defaultRowNum -
                                        (extraHeight / gRescol.minCellHeight));
                                    break;
                                }
                            }
                        }
                    }
                }

                rowNum += 1;
                rowNum = Math.round(rowNum);
                $rowInput.val(rowNum);
                $rowInput.trigger(fakeEvent.enter, true);
                scrollMeta.base = top - (top / scrollMeta.scale);
            });
        });
    }

    function infScrolling(tableId) {
        var scrolling = false;
        var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);
        var updateRangeTimer;
        var needsFocusing = true;
        var focusTimer;
        var table = gTables[tableId];
        var visibleRows = Math.min(gMaxEntriesPerPage, table.resultSetCount);

        $xcTbodyWrap.scroll(function() {
            if (gMouseStatus === "movingTable") {
                return;
            }

            var $table = $('#xcTable-' + tableId);

            if ($table.hasClass('autoScroll')) {
                $table.removeClass('autoScroll');
                return;
            }

            var deferred = jQuery.Deferred();

            if (needsFocusing) {
                needsFocusing = false;
                TblFunc.focusTable(tableId);
                clearElements();
            }

            clearTimeout(focusTimer);
            focusTimer = setTimeout(scrollingEnd, 200);

            RowScroller.genFirstVisibleRowNum();

            var scrollTop = $xcTbodyWrap.scrollTop();
            var scrollMeta = table.scrollMeta;

            if (scrollMeta.isBarScrolling) {
                scrollMeta.isBarScrolling = false;
            } else {
                scrollMeta.isTableScrolling = true;
                var numRowsAbove = table.currentRowNumber - visibleRows;
                var rowsAboveHeight = RowScroller.getRowsAboveHeight(tableId,
                                                                 numRowsAbove);
                var scrollBarTop = scrollTop + rowsAboveHeight;

                scrollBarTop -= scrollMeta.base;
                $xcTbodyWrap.siblings(".tableScrollBar")
                            .scrollTop(scrollBarTop);
            }

            var firstRow = $table.find('tbody tr:first');
            var topRowNum = xcHelper.parseRowNum(firstRow);
            var info;
            var numRowsToAdd;

            // gets this class from RowManager.addRows
            scrolling = $table.hasClass('scrolling');
            if (firstRow.length === 0) {
                deferred.resolve();
            } else if (scrollTop === 0 && !firstRow.hasClass('row0')) {
                // scrolling to top
                if (!scrolling) {

                    // var initialTop = firstRow.offset().top;
                    numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum,
                                            table.resultSetMax);

                    var rowNumber = topRowNum - numRowsToAdd;
                    if (rowNumber < table.resultSetMax) {
                        var lastRowToDisplay = table.currentRowNumber -
                                               numRowsToAdd;

                        info = {
                            "targetRow": rowNumber,
                            "lastRowToDisplay": lastRowToDisplay,
                            "bulk": false,
                            "tableId": tableId,
                            "currentFirstRow": topRowNum
                        };

                        RowManager.addRows(rowNumber, numRowsToAdd,
                                            RowDirection.Top, info)
                        .then(deferred.resolve)
                        .fail(deferred.reject);
                    } else {
                        deferred.resolve();
                    }

                } else {
                    deferred.resolve();
                }
            } else if (isScrollBarAtBottom()) {
                // scrolling to bottom
                if (!scrolling && (table.currentRowNumber < table.resultSetMax))
                {
                    numRowsToAdd = Math.min(gNumEntriesPerPage,
                                    table.resultSetMax -
                                    table.currentRowNumber);
                    info = {
                        "targetRow": table.currentRowNumber + numRowsToAdd,
                        "lastRowToDisplay": table.currentRowNumber + numRowsToAdd,
                        "bulk": false,
                        "tableId": tableId,
                        "currentFirstRow": topRowNum
                    };
                    RowManager.addRows(table.currentRowNumber, numRowsToAdd,
                             RowDirection.Bottom, info)
                    .then(deferred.resolve)
                    .fail(deferred.reject);
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.resolve();
            }

            deferred
            .always(function() {
                if ($table.find('.jsonElement.modalHighlighted').length) {
                    JSONModal.rehighlightTds($table);
                }
                var rowScrollerMove = true;
                RowScroller.genFirstVisibleRowNum(rowScrollerMove);
            });
        });

        function scrollingEnd() {
            needsFocusing = true;
        }

        function isScrollBarAtBottom() {
            return ($xcTbodyWrap[0].scrollHeight - $xcTbodyWrap.scrollTop() -
                       $xcTbodyWrap.outerHeight() <= 1);
        }

        function clearElements() {
            $(".menu:visible").hide();
            xcMenu.removeKeyboardNavigation();
            $('.highlightBox').remove();
        }
    }

    RowScroller.add = function(tableId) {
        setupScrollbar(tableId);
        var table = gTables[tableId];
        if (table.resultSetCount > 0) {
            infScrolling(tableId);
        }

        var bookmarks = gTables[tableId].bookmarks;
        RowScroller.addBookmark(bookmarks, tableId);
    };

    RowScroller.update = function(tableId) {
        var $numPages = $("#numPages");
        var table = gTables[gActiveTableId];
        var inputWidth = 50;
        if (!gActiveTableId || $.isEmptyObject(table)) {
            $numPages.text("");
        } else {
            var rowCount = table.resultSetCount;
            var num = xcHelper.numToStr(rowCount);
            $numPages.text("of " + num);
            var numDigits = ("" + rowCount).length;
            inputWidth = Math.max(inputWidth, 10 + (numDigits * 8));
        }
        $rowInput.width(inputWidth);
    };

    RowScroller.empty = function() {
        $rowInput.val("").data("val", "");
        gActiveTableId = null;
        RowScroller.update();
    };

    // for book mark tick
    RowScroller.addBookmark = function(rowNums, tableId) {
        if (rowNums != null && !(rowNums instanceof Array)) {
            rowNums = [rowNums];
        }

        var totalRows = gTables[tableId].resultSetCount;
        var bookmark = "";

        rowNums.forEach(function(rowNum) {
            var leftPos = 100 * (rowNum / totalRows);
            var title = xcHelper.replaceMsg(ScrollTStr.BookMark, {
                "row": (rowNum + 1)
            });

            bookmark += '<div class="bookmark bkmkRow' + rowNum + '"' +
                       ' style="left:' + leftPos + '%;"' +
                       ' data-toggle="tooltip"' +
                       ' data-placement="bottom"' +
                       ' data-original-title="' + title + '"' +
                       ' data-container="body"></div>';
        });

        // $('#rowScroller-' + tableId).append(bookmark);
    };

    RowScroller.removeBookmark = function(rowNum, tableId) {
        // var $rowScroller = $('#rowScroller-' + tableId);
        // $rowScroller.find('.bkmkRow' + rowNum).remove();
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
                'size': resultTextLength
            });
        }
    };

    RowScroller.genFirstVisibleRowNum = function() {
        var firstRowNum = getFirstVisibleRowNum();
        if (firstRowNum !== null) {
            var activeTableId = gActiveTableId;
            $('#rowInput').val(firstRowNum).data('val', firstRowNum);
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
        var tdYCoor = 160; //top rows's distance from top of window
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

    function parseBookmarkNum(el) {
        var classNames = el.attr('class');
        var index = classNames.indexOf('bkmkRow') + 'bkmkRow'.length;
        return parseInt(classNames.substring(index)) + 1;
    }

    function positionScrollbar(row, tableId, adjustTableScroller) {
        var canScroll = true;
        var $table = $('#xcTable-' + tableId);
        var theadHeight = $table.find('thead').height();

        function positionScrollToRow() {
            if (!$table.find('.row' + (row - 1)).length) {
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
            $table.addClass('autoScroll');
            $tbodyWrap.scrollTop(scrollPos);

            if (adjustTableScroller) {
                // adjust tableScrollBar;
                var table = gTables[tableId];
                var scrollMeta = table.scrollMeta;
                scrollMeta.isTableScrolling = true;
                var numRowsAbove = table.currentRowNumber -
                        Math.min(gMaxEntriesPerPage, table.resultSetCount);
                var rowsAboveHeight = RowScroller.getRowsAboveHeight(tableId,
                                                                 numRowsAbove);
                var scrollBarTop = scrollPos + rowsAboveHeight;
                var newTop = scrollBarTop / scrollMeta.scale;
                $tbodyWrap.siblings(".tableScrollBar").scrollTop(newTop);
                scrollMeta.base = scrollBarTop - (scrollBarTop / scrollMeta.scale);
            }
        }

        positionScrollToRow();
        if (!canScroll) {
            // this means we can't scroll to page without moving scrollbar all the
            // way to the bottom, which triggers another getpage and thus we must
            // try to position the scrollbar to the proper row again
            setTimeout(positionScrollToRow, 1);
        }
    }
    return (RowScroller);
}(jQuery, {}));
