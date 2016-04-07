window.RowScroller = (function($, RowScroller) {
    var $rowInput = $("#rowInput");
    var $rowScrollerArea = $("#rowScrollerArea");
    var rowInfo = {};

    RowScroller.setup = function() {
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
            var $tableWrap = $('#xcTableWrap-' + tableId);
            xcHelper.centerFocusedTable($tableWrap, false,
                                                {onlyIfOffScreen: true});

            if ($(event.target).hasClass("subRowMarker")) {
                rowScrollerStartDrag(event, $(event.target).parent());
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
            var $rowMarker = $('#rowMarker-' + tableId);
            $rowMarker.css("transform",
                                "translate3d(" + translate + "%, 0px, 0px)");
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

            if (!table) {
                return;
            }
            if (table.isLocked) {
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

            var rowOnScreen = xcHelper.getLastVisibleRowNum(tableId) -
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

            goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
            .then(function() {
                var arr = [];
                $table.find('tbody tr').each(function() {
                    arr.push($(this).find('td:first').text());
                });
                $('#xcTableWrap-' + tableId).find('.tableCoverWaiting')
                                            .remove();

                var rowToScrollTo = Math.min(targetRow, table.resultSetMax);
                positionScrollbar(rowToScrollTo, tableId);
                RowScroller.genFirstVisibleRowNum();
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
            'class="rowScroller" data-id="' + tableId + '" ' +
            'data-toggle="tooltip" ' +
            'data-container="body" ' +
            'data-placement="bottom" title="' + ScrollTStr.Title + '">' +
                '<div id="rowMarker-' + tableId + '" class="rowMarker" ' +
                'data-id="' + tableId + '">' +
                    '<div class="subRowMarker top"></div>' +
                    '<div class="subRowMarker middle"></div>' +
                    '<div class="subRowMarker bottom"></div>' +
                '</div>' +
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
        if (!document.elementFromPoint) {
            return;
        }
        var activeTableId = gActiveTableId;
        var $table = $('#xcTable-' + activeTableId);
        if ($table.length === 0) {
            return;
        }
        var tableLeft = $table.offset().left;
        var tdXCoor = Math.max(0, tableLeft);
        var tdYCoor = 164; //top rows's distance from top of window
        var firstEl = document.elementFromPoint(tdXCoor, tdYCoor);
        var firstId = $(firstEl).closest('tr').attr('class');

        if (firstId && firstId.length > 0) {
            var firstRowNum = parseInt(firstId.substring(3)) + 1;
            if (!isNaN(firstRowNum)) {
                $('#rowInput').val(firstRowNum).data('val', firstRowNum);
                if (isTableScrollable(activeTableId)) {
                    rowScrollerMove(firstRowNum,
                                     gTables[activeTableId].resultSetCount);
                }
            }
        }
    };

    function rowScrollerMove(rowNum, resultSetCount) {
        var pct = 100 * ((rowNum - 1) / (resultSetCount - 1));
        var $rowMarker = $('#rowMarker-' + gActiveTableId);
        $rowMarker.css("transform", "translate3d(" + pct + "%, 0px, 0px)");
    }

    // mouse event for row scroller
    function rowScrollerMouseMove(event) {
        var mouseX = event.pageX;
        var translate;

        if (mouseX - rowInfo.totalOffset < rowInfo.boundary.lower) {
            translate = 0;
        } else if (mouseX - rowInfo.totalOffset > rowInfo.boundary.upper ) {
            translate = 100;
        } else {
            translate = 100 * (mouseX - rowInfo.scrollAreaOffset -
                        rowInfo.totalOffset) / (rowInfo.rowScrollerWidth - 1);
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
        var e = $.Event("mousedown");
        e.which = 1;
        e.pageX = (rowInfo.el.offset().left - parseInt(rowInfo.el.css('left')) + 0.5);
        if (e.pageX + 3 >= rowInfo.rowScrollerWidth + rowInfo.scrollAreaOffset) {
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

    function rowScrollerStartDrag(event, el) {
        gMouseStatus = "rowScroller";
        el.addClass('scrolling');
        rowInfo.el = el;
        rowInfo.mouseStart = event.pageX;
        rowInfo.scrollAreaOffset = el.parent().offset().left;
        rowInfo.rowScrollerWidth = el.parent().width();
        var mouseOffset = rowInfo.mouseStart - el.offset().left;
        var cssLeft = parseInt(el.css('left'));
        rowInfo.totalOffset = mouseOffset + cssLeft;
        rowInfo.boundary = {
            "lower": rowInfo.scrollAreaOffset,
            "upper": rowInfo.scrollAreaOffset + rowInfo.rowScrollerWidth
        };

        var cursorStyle =
            '<style id="moveCursor" type="text/css">*' +
                '{cursor:pointer !important}' +
                '.tooltip{display: none !important;}' +
            '</style>';

        $(document.head).append(cursorStyle);
        xcHelper.disableTextSelection();
        $(document).on('mousemove.rowScrollerDrag', rowScrollerMouseMove);
        $(document).on('mouseup.rowScrollerMouseUp', rowScrollerMouseUp);
    }

    return (RowScroller);
}(jQuery, {}));
