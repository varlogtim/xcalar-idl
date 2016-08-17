window.TblAnim = (function($, TblAnim) {
    // This module consists of column resizing, row resizing,
    // column drag and dropping, and table drag and dropping
    var dragInfo = {};
    var rowInfo = {};

    /* START COLUMN RESIZING */
    TblAnim.startColResize = function(el, event, options) {
        var rescol = gRescol;
        var $table = el.closest('.dataTable');
        var colNum = xcHelper.parseColNum(el.parent().parent());
        var $th = el.closest('th');
        if (!options || options.target !== "datastore") {
            rescol.tableId = xcHelper.parseTableId($table);
        }
        if (options && options.target === "datastore") {
            rescol.isDatastore = true;
            rescol.$tableWrap = $('#dsTableWrap');
            rescol.$dsTable = $('#dsTable');
            rescol.$previewTable = $('#previewTable');
        } else if ($th.hasClass("userHidden")) {
            // This is a hidden column! we need to unhide it
            // return;
            $table.find("th.col" + colNum + ",td.col" + colNum)
                  .removeClass("userHidden");
            gTables[rescol.tableId].tableCols[colNum - 1].isHidden = false;
        }
        event.preventDefault();
        rescol.mouseStart = event.pageX;
        rescol.grabbedCell = el.parent().parent();  // the th
        rescol.startWidth = rescol.grabbedCell.outerWidth();

        hideOffScreenTables({
            marginLeft : 0,
            marginRight: rescol.startWidth
        });

        rescol.index = colNum;
        rescol.newWidth = rescol.startWidth;
        rescol.table = $table;
        rescol.tableHead = el.closest('.xcTableWrap').find('.xcTheadWrap');

        rescol.tempCellMinWidth = rescol.cellMinWidth;
        rescol.leftDragMax = rescol.tempCellMinWidth - rescol.startWidth;
        $table.addClass('resizingCol');
        $('.xcTheadWrap').find('.dropdownBox').hide();

        var cursorStyle = '<div id="resizeCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);

        if (!rescol.grabbedCell.hasClass('selectedCell')) {
            $('.selectedCell').removeClass('selectedCell');
            FnBar.clear();
        }

        $(document).on('mousemove.onColResize', onColResize);
        $(document).on('mouseup.endColResize', endColResize);
    };

    function onColResize(event) {
        var rescol = gRescol;
        var dragDist = (event.pageX - rescol.mouseStart);
        var newWidth;
        if (dragDist > rescol.leftDragMax) {
            newWidth = rescol.startWidth + dragDist;
        } else if (dragDist < rescol.leftDragMax ) {
            newWidth = rescol.tempCellMinWidth;
        }
        rescol.grabbedCell.outerWidth(newWidth);
        rescol.newWidth = newWidth;

        moveTableTitles();
        if (rescol.isDatastore) {
            rescol.$tableWrap.width(rescol.$dsTable.width());
               // size line divider to fit table
            var tableWidth = rescol.$previewTable.width();
            rescol.$previewTable.find('.divider').width(tableWidth - 10);
        }
    }

    function endColResize() {
        $(document).off('mousemove.onColResize');
        $(document).off('mouseup.endColResize');
        var rescol = gRescol;
        var isDatastore = rescol.isDatastore;
        var wasResized = true;
        var widthState;
        $('#resizeCursor').remove();
        $('body').removeClass('tooltipOff');
        $('.xcTheadWrap').find('.dropdownBox').show();
        rescol.table.closest('.xcTableWrap').find('.rowGrab')
                                            .width(rescol.table.width());
        rescol.table.removeClass('resizingCol');
        $('.tooltip').remove();
        if (!rescol.isDatastore) {
            var table = gTables[rescol.tableId];
            var progCol = table.tableCols[rescol.index - 1];

            if (rescol.newWidth === 15) {
                rescol.table
                      .find('th.col' + rescol.index + ',td.col' + rescol.index)
                      .addClass("userHidden");
                progCol.isHidden = true;
            } else {
                progCol.width = rescol.grabbedCell.outerWidth();
            }
            var column = gTables[rescol.tableId].tableCols[rescol.index - 1];
            widthState = column.sizeToHeader;
            if (Math.abs(rescol.newWidth - rescol.startWidth) > 1) {
                // set autoresize to header only if column moved at least 2 pixels
                column.sizeToHeader = true;
            }
            if (rescol.newWidth === rescol.startWidth) {
                wasResized = false;
            }
        } else {
            rescol.isDatastore = false;
            if (Math.abs(rescol.newWidth - rescol.startWidth) > 1) {
                // set autoresize to header only if column moved at least 2 pixels
                rescol.grabbedCell.find('.colGrab').data('sizetoheader', true);
            }
        }

        // set timeout because unhiding is slow
        setTimeout(function() {
            unhideOffScreenTables();
        }, 0);

        moveTableDropdownBoxes();

        if (!isDatastore && wasResized) {
            SQL.add("Resize Column", {
                "operation"  : SQLOps.DragResizeTableCol,
                "tableName"  : gTables[rescol.tableId].tableName,
                "tableId"    : rescol.tableId,
                "colNum"     : rescol.index,
                "fromWidth"  : rescol.startWidth,
                "toWidth"    : rescol.newWidth,
                "widthState" : widthState,
                "htmlExclude": ["colNum", "fromWidth", "toWidth", "widthState"]
            });
        }
    }

    // used for replaying and redo/undo
    TblAnim.resizeColumn = function(tableId, colNum, fromWidth, toWidth,
                                    widthState) {
        var $table = $('#xcTable-' + tableId);
        var progCol = gTables[tableId].tableCols[colNum - 1];
        var $th = $table.find('th.col' + colNum);
        var $allCells = $table.find("th.col" + colNum + ",td.col" + colNum);
        if ($th.hasClass("userHidden")) {
            // This is a hidden column! we need to unhide it

            $allCells.removeClass("userHidden");
            progCol.isHidden = false;
        }
        if (toWidth <= 15) {
            $allCells.addClass("userHidden");
            progCol.isHidden = true;
        } else {
            progCol.width = toWidth;
        }
        $th.outerWidth(toWidth);
        var oldWidthState = progCol.sizeToHeader;
        if (widthState == null) {
            if (Math.abs(toWidth - fromWidth) > 1) {
                // set autoresize to header only if column moved at least 2 pixels
                progCol.sizeToHeader = true;
            }
        } else {
            progCol.sizeToHeader = widthState;
        }
        var newWidthState = progCol.sizeToHeader;
        matchHeaderSizes($table);

        SQL.add("Resize Column", {
            "operation"    : SQLOps.DragResizeTableCol,
            "tableName"    : gTables[tableId].tableName,
            "tableId"      : tableId,
            "colNum"       : colNum,
            "fromWidth"    : fromWidth,
            "toWidth"      : toWidth,
            "oldWidthState": oldWidthState,
            "newWidthState": newWidthState,
            "htmlExclude"  : ["colNum", "fromWidth", "toWidth", "oldWidthState",
                              "newWidthState"]
        });
    };

    /* END COLUMN RESIZING */

    /* START ROW RESIZING */

    TblAnim.startRowResize = function(el, event) {
        rowInfo.mouseStart = event.pageY;
        gMouseStatus = "checkingRowMove";
        rowInfo.$el = el;
        var $table = el.closest('.xcTbodyWrap');
        rowInfo.$table = $table;
        rowInfo.actualTd = el.closest('td');
        // we actually target the td above the one we're grabbing.
        if (el.hasClass('last')) {
            rowInfo.targetTd = $table.find('tr:last').find('td').eq(0);
            rowInfo.actualTd = rowInfo.targetTd;
        } else {
            rowInfo.targetTd = el.closest('tr').prev().find('td').eq(0);
        }

        rowInfo.startHeight = rowInfo.targetTd.outerHeight();

        $(document).on('mousemove.checkRowResize', checkRowResize);
        $(document).on('mouseup.endRowResize', endRowResize);
    };

    function checkRowResize(event) {
        var mouseDistance = event.pageY - rowInfo.mouseStart;
        if (mouseDistance + rowInfo.startHeight > gRescol.minCellHeight) {
            $(document).off('mousemove.checkRowResize');
            $(document).on('mousemove.onRowResize', onRowResize);
            gMouseStatus = "rowMove";

            hideOffScreenTables();
            // var el = rowInfo.$el;
            var $table = rowInfo.$table;

            rowInfo.tableId = xcHelper.parseTableId($table);

            rowInfo.rowIndex = rowInfo.targetTd.closest('tr').index();
            rowInfo.$divs = $table.find('tbody tr:eq(' + rowInfo.rowIndex +
                                        ') td > div');
            xcHelper.disableTextSelection();

            $('body').addClass('hideScroll tooltipOff')
                     .append('<div id="rowResizeCursor"></div>');
            rowInfo.targetTd.closest('tr').addClass('changedHeight');
            rowInfo.actualTd.closest('tr').addClass('dragging');
            rowInfo.$divs.css('max-height', rowInfo.startHeight - 4);
            rowInfo.$divs.eq(0).css('max-height', rowInfo.startHeight);
            rowInfo.targetTd.outerHeight(rowInfo.startHeight);

            $table.find('tr:not(.dragging)').addClass('notDragging');
            lockScrolling($('#mainFrame'), 'horizontal');
        }
    }

    function onRowResize(event) {
        var mouseDistance = event.pageY - rowInfo.mouseStart;
        var newHeight = rowInfo.startHeight + mouseDistance;
        var padding = 4; // top + bottom padding in td
        if (newHeight < gRescol.minCellHeight) {
            rowInfo.targetTd.outerHeight(gRescol.minCellHeight);
            rowInfo.$divs.css('max-height', gRescol.minCellHeight - padding);
            rowInfo.$divs.eq(0).css('max-height', gRescol.minCellHeight);
        } else {
            rowInfo.targetTd.outerHeight(newHeight);
            rowInfo.$divs.css('max-height', newHeight - padding);
            rowInfo.$divs.eq(0).css('max-height', newHeight);
        }
    }

    function endRowResize() {
        $(document).off('mouseup.endRowResize');
        if (gMouseStatus === "checkingRowMove") {
            $(document).off('mousemove.checkRowResize');
            gMouseStatus = null;
            return;
        }

        $(document).off('mousemove.onRowResize');
        gMouseStatus = null;

        var newRowHeight = rowInfo.targetTd.outerHeight();
        var rowNum = xcHelper.parseRowNum(rowInfo.targetTd.parent()) + 1;
        var rowObj = gTables[rowInfo.tableId].rowHeights;
        // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
        var pageNum = Math.floor((rowNum - 1) / gNumEntriesPerPage);
        xcHelper.reenableTextSelection();
        $('body').removeClass('hideScroll tooltipOff');
        $('#rowResizeCursor').remove();
        unlockScrolling($('#mainFrame'), 'horizontal');
        var $table = $('#xcTable-' + rowInfo.tableId);
        $table.find('tr').removeClass('notDragging dragging');
        if (gTables[gActiveTableId].resultSetCount !== 0) {
            RowScroller.genFirstVisibleRowNum();
            RowScroller.updateViewRange(rowInfo.tableId);
        }

        if (newRowHeight !== gRescol.minCellHeight) {
            if (rowObj[pageNum] == null) {
                rowObj[pageNum] = {};
            }
            rowObj[pageNum][rowNum] = newRowHeight;
        } else {
            // remove this rowNumber from gTables and
            //if no other rows exist in the page, remove the pageNumber as well
            if (rowObj[pageNum] != null) {
                delete rowObj[pageNum][rowNum];
                if ($.isEmptyObject(rowObj[pageNum])) {
                    delete rowObj[pageNum];
                }
            }
            rowInfo.targetTd.parent().removeClass('changedHeight');
            rowInfo.targetTd.parent().find('.jsonElement >  div')
                                     .css('max-height', 16);
        }

        // settimeout because unhiding is slow
        setTimeout(function() {
            unhideOffScreenTables();
        }, 0);


        SQL.add("Resize Row", {
            "operation"  : SQLOps.DragResizeRow,
            "tableName"  : gTables[rowInfo.tableId].tableName,
            "tableId"    : rowInfo.tableId,
            "rowNum"     : rowNum - 1,
            "fromHeight" : rowInfo.startHeight,
            "toHeight"   : newRowHeight,
            "htmlExclude": ["rowNum", "fromHeight", "toHeight"]
        });
    }

    TblAnim.resizeRow = function(rowNum, tableId, fromHeight, toHeight) {
        var padding = 4; // top + bottom padding in td
        var $table = $('#xcTable-' + tableId);
        var $targetRow = $table.find('.row' + rowNum);
        var $targetTd = $targetRow.find('.col0');

        var $divs = $targetRow.find('td > div');
        if (toHeight < gRescol.minCellHeight) {
            $targetTd.outerHeight(gRescol.minCellHeight);
            $divs.css('max-height', gRescol.minCellHeight - padding);
            $divs.eq(0).css('max-height', gRescol.minCellHeight);
        } else {
            $targetTd.outerHeight(toHeight);
            $divs.css('max-height', toHeight - padding);
            $divs.eq(0).css('max-height', toHeight);
        }
        var rowObj = gTables[tableId].rowHeights;
        var pageNum = Math.floor((rowNum) / gNumEntriesPerPage);

        if (toHeight !== gRescol.minCellHeight) {
            if (rowObj[pageNum] == null) {
                rowObj[pageNum] = {};
            }
            rowObj[pageNum][rowNum + 1] = toHeight;
            $targetRow.addClass('changedHeight');
        } else {
            // remove this rowNumber from gTables and
            //if no other rows exist in the page, remove the pageNumber as well
            if (rowObj[pageNum] != null) {
                delete rowObj[pageNum][rowNum + 1];
                if ($.isEmptyObject(rowObj[pageNum])) {
                    delete rowObj[pageNum];
                }
            }
            $targetTd.parent().removeClass('changedHeight');
            $targetTd.parent().find('.jsonElement >  div')
                                     .css('max-height', 16);
        }
        RowScroller.updateViewRange(tableId);

        SQL.add("Resize Row", {
            "operation"  : SQLOps.DragResizeRow,
            "tableName"  : gTables[tableId].tableName,
            "tableId"    : tableId,
            "rowNum"     : rowNum,
            "fromHeight" : fromHeight,
            "toHeight"   : toHeight,
            "htmlExclude": ["rowNum", "fromHeight", "toHeight"]
        });
    };

    /* END ROW RESIZING */

    /* START COLUMN DRAG DROP */

    TblAnim.startColDrag = function($el, event) {
        var $tableWrap = $el.closest('.xcTableWrap');
        if ($tableWrap.hasClass('undraggable')) {
            return;
        }

        gMouseStatus = "checkingMovingCol";
        dragInfo.mouseX = event.pageX;
        dragInfo.$el = $el;
        dragInfo.$tableWrap = $tableWrap;

        var cursorStyle = '<div id="moveCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);

        $('.highlightBox').remove();

        $(document).on('mousemove.checkColDrag', checkColDrag);
        $(document).on('mouseup.endColDrag', endColDrag);
    };

    // checks if mouse has moved and will initiate the column dragging
    function checkColDrag(event) {
        dragInfo.pageX = event.pageX;
        // mouse must move at least 3 pixels horizontally to trigger draggin
        if (Math.abs(dragInfo.mouseX - dragInfo.pageX) > 2) {
            $(document).off('mousemove.checkColDrag');
            $(document).on('mousemove.onColDrag', onColDrag);
            gMouseStatus = "dragging";
            var el = dragInfo.$el;
            var pageX = event.pageX;
            var $mainFrame = $('#mainFrame');
            dragInfo.colNum = xcHelper.parseColNum(el);
            var $tableWrap = dragInfo.$tableWrap;

            var $table = el.closest('.xcTable');
            var $tbodyWrap = $table.parent();
            var $editableHead = el.find('.editableHead');
            dragInfo.$table = $tableWrap;
            dragInfo.tableId = xcHelper.parseTableId($table);
            dragInfo.element = el;
            dragInfo.colIndex = parseInt(el.index());
            dragInfo.offsetTop = el.offset().top;
            dragInfo.grabOffset = pageX - el.offset().left;
            // dragInfo.grabOffset = distance from the left side of dragged column
            // to the point that was grabbed

            dragInfo.docHeight = $(document).height();
            dragInfo.val = $editableHead.val();
            var shadowDivHeight = $tbodyWrap.height();
            var shadowTop = $tableWrap.find('.header').position().top - 5;

            dragInfo.inFocus = $editableHead.is(':focus');
            dragInfo.selected = el.hasClass('selectedCell');
            dragInfo.isHidden = el.hasClass('userHidden');
            dragInfo.colWidth = el.width();
            dragInfo.windowWidth = $(window).width();
            dragInfo.mainFrameLeft = $mainFrame[0].getBoundingClientRect().left;

            var timer;
            if (gTables[dragInfo.tableId].tableCols.length > 50) {
                timer = 100;
            } else {
                timer = 40;
            }
            dragdropMoveMainFrame(dragInfo, timer);

            // the following code deals with hiding non visible tables and locking the
            // scrolling when we reach the left or right side of the table

            var mfWidth = $mainFrame.width();

            var mfScrollLeft = $mainFrame.scrollLeft();
            var tableLeft = dragInfo.$table.offset().left - MainMenu.getOffset();
            $mainFrame.addClass('scrollLocked');

            var leftLimit = mfScrollLeft + tableLeft;
            leftLimit = Math.min(leftLimit, mfScrollLeft);
            var rightLimit = mfScrollLeft + tableLeft + $tableWrap.width() - mfWidth +
                             dragInfo.grabOffset;
            rightLimit = Math.max(rightLimit, mfScrollLeft);

            var hideOptions = {
                marginLeft : mfScrollLeft - leftLimit,
                marginRight: rightLimit - mfScrollLeft
            };
            hideOffScreenTables(hideOptions);

            var scrollLeft;
            $mainFrame.on('scroll.draglocked', function() {
                scrollLeft = $mainFrame.scrollLeft();
                
                if (scrollLeft <= leftLimit) {
                    $mainFrame.scrollLeft(leftLimit);
                } else if (scrollLeft >= rightLimit) {
                    $mainFrame.scrollLeft(rightLimit);
                }

                moveTableTitles();
                moveFirstColumn();
            });

            // create a fake transparent column by cloning

            createTransparentDragDropCol(pageX);
            $tbodyWrap.addClass('hideScroll');

            // create a replica shadow with same column width, height,
            // and starting position
            xcHelper.disableTextSelection();
            $tableWrap.append('<div id="shadowDiv" style="width:' +
                            dragInfo.colWidth +
                            'px;height:' + (shadowDivHeight) + 'px;left:' +
                            (dragInfo.element.position().left) +
                            'px;top:' + shadowTop + 'px;"></div>');
            createDropTargets();
        }
    }

    function onColDrag(event) {
        var pageX = event.pageX;
        dragInfo.pageX = pageX;
        dragInfo.fauxCol.css('left', pageX);
    }

    function endColDrag() {
        $(document).off('mouseup.endColDrag');
        $('#moveCursor').remove();
        $('body').removeClass('tooltipOff');
        if (gMouseStatus === "checkingMovingCol") {
            // endColDrag is called on mouseup but if there was no mouse movement
            // then just clean up and exit
            gMouseStatus = null;
            $(document).off('mousemove.checkColDrag');

            return;
        }
        $(document).off('mousemove.onColDrag');

        gMouseStatus = null;
        var $tableWrap = dragInfo.$table;
        var $th = dragInfo.element;
        $('#mainFrame').off('scroll.draglocked');
        $('#mainFrame').removeClass('scrollLocked');
        if (gMinModeOn) {
            $('#shadowDiv, #fauxCol').remove();
        } else {
            // slide column into place
            $tableWrap.addClass('undraggable');
            var slideLeft = $th.offset().left -
                            parseInt(dragInfo.fauxCol.css('margin-left'));
            var currentLeft = parseInt(dragInfo.fauxCol.css('left'));
            var slideDistance = Math.max(2, Math.abs(slideLeft - currentLeft));
            var slideDuration = Math.log(slideDistance * 4) * 90 - 200;

            // unhiding non visible tables is slow and interrupts column sliding
            // animation so we delay the animation with the timout
            setTimeout(function() {
                dragInfo.fauxCol.animate({left: slideLeft}, slideDuration, "linear",
                    function() {
                        $('#shadowDiv, #fauxCol').remove();
                        $tableWrap.removeClass('undraggable');
                    }
                );
            }, 0);
        }

        $('#dropTargets').remove();
        $('#mainFrame').off('scroll', mainFrameScrollDropTargets)
                       .scrollTop(0);
        xcHelper.reenableTextSelection();
        $tableWrap.find('.xcTbodyWrap').removeClass('hideScroll');
        if (dragInfo.inFocus) {
            dragInfo.element.find('.editableHead').focus();
        }

        // only pull col if column is dropped in new location
        if ((dragInfo.colIndex) !== dragInfo.colNum) {
            var tableId  = dragInfo.tableId;
            var oldColNum = dragInfo.colNum;
            var newColNum = dragInfo.colIndex;

            ColManager.reorderCol(tableId, oldColNum, newColNum);

            Tips.refresh();
        }
        unhideOffScreenTables();
    }

    function cloneCellHelper(obj) {
        var trClass = "";
        if ($(obj).hasClass('changedHeight')) {
            trClass = 'changedHeight';
        }
        var td = $(obj).children().eq(dragInfo.colIndex);

        var clone = td.clone();
        var cloneHeight = td.outerHeight();
        var cloneColor = td.css('background-color');
        clone.css('height', cloneHeight + 'px');
        clone.outerWidth(dragInfo.colWidth);
        clone.css('background-color', cloneColor);
        var cloneHTML = clone[0].outerHTML;
        cloneHTML = '<tr class="' + trClass + '">' + cloneHTML + '</tr>';
        return cloneHTML;
        // row.append(clone).appendTo($("#fauxTable"));
        // $('#fauxTable').append(cloneHTML);
    }

    function createTransparentDragDropCol(pageX) {
        var $tableWrap = dragInfo.$table;
        var $table = $tableWrap.find('table');
        $('#mainFrame').append('<div id="fauxCol" style="left:' +
                        pageX + 'px;' +
                        'width:' + (dragInfo.colWidth) + 'px;' +
                        'margin-left:' + (-dragInfo.grabOffset) + 'px;">' +
                            '<table id="fauxTable" ' +
                            'class="dataTable xcTable" ' +
                            'style="width:' + (dragInfo.colWidth) + 'px">' +
                            '</table>' +
                        '</div>');
        dragInfo.fauxCol = $('#fauxCol');
        var $fauxTable = $('#fauxTable');

        var rowHeight = 25;
        // turn this into binary search later
        var topPx = $table.find('.header').offset().top - rowHeight;
        var topRowIndex = -1;
        var topRowEl;
        $table.find('tbody tr').each(function() {
            if ($(this).offset().top > topPx) {
                topRowIndex = $(this).index();
                topRowEl = $(this).find('td');
                return (false);
            }
        });

        var cloneHTML = "";
        // check to see if topRowEl was found;
        if (topRowIndex === -1) {
            console.error("BUG! Cannot find first visible row??");
            // Clone entire shit and be.then.
            $table.find('tr').each(function(i, ele) {
                cloneHTML += cloneCellHelper(ele);
            });
            $fauxTable.append(cloneHTML);
            return;
        }

        // Clone head

        $table.find('tr:first').each(function(i, ele) {
            cloneHTML += cloneCellHelper(ele);
        });

        if (dragInfo.selected) {
            $fauxTable.addClass('selectedCol');
        }
        if (dragInfo.isHidden) {
            $fauxTable.addClass('userHidden');
        }

        var totalRowHeight = $tableWrap.height() -
                             $table.find('th:first').outerHeight();
        var numRows = Math.ceil(totalRowHeight / rowHeight);

        $table.find('tr:gt(' + (topRowIndex) + ')').each(function(i, ele) {
            cloneHTML += cloneCellHelper(ele);
            if (i >= numRows + topRowIndex) {
                return (false);
            }
        });
        $fauxTable.append(cloneHTML);

        // Ensure rows are offset correctly
        var fauxTableHeight = $fauxTable.height() +
                              $fauxTable.find('tr:first').outerHeight();

        var xcTableWrapHeight = $tableWrap.height();
        var fauxColHeight = Math.min(fauxTableHeight, xcTableWrapHeight - 36);
        dragInfo.fauxCol.height(fauxColHeight);
        var firstRowOffset = $(topRowEl).offset().top - topPx - rowHeight;
        $fauxTable.css('margin-top', firstRowOffset);
        $fauxTable.find('tr:first-child').css({'margin-top':
                -($fauxTable.find('tr:first').outerHeight() + firstRowOffset - 1)});
    }

    function createDropTargets(dropTargetIndex, swappedColIndex) {
        var dragMargin = 30;
        if (dragInfo.isHidden) {
            dragMargin = 10;
        }
        var colLeft;
        // targets extend this many pixels to left of each column

        if (!dropTargetIndex) {
            // create targets that will trigger swapping of columns on hover
            var dropTargets = "";
            dragInfo.$table.find('tr').eq(0).find('th').each(function(i) {
                if (i === 0 || i === dragInfo.colIndex) {
                    return true;
                }
                colLeft = $(this).position().left;
                var targetWidth;

                if ((dragInfo.colWidth - dragMargin) <
                    Math.round(0.5 * $(this).width()))
                {
                    targetWidth = dragInfo.colWidth;
                } else {
                    targetWidth = Math.round(0.5 * $(this).outerWidth()) +
                                    dragMargin;
                }
                dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                                'style="left:' +
                                (colLeft - dragMargin + dragInfo.grabOffset) + 'px;' +
                                'width:' + targetWidth + 'px;height:' +
                                dragInfo.docHeight + 'px;">' +
                                    i +
                                '</div>';
            });
            var scrollLeft = $('#mainFrame').scrollLeft();
            // may have issues with table left if dragInfo.$table isn't correct
            var tableLeft = dragInfo.$table[0].getBoundingClientRect().left +
                scrollLeft;
            $('body').append('<div id="dropTargets" style="' +
                    'margin-left:' + tableLeft + 'px;' +
                    'left:' + (-scrollLeft) + 'px;">' + dropTargets + '</div>');
            $('#dropTargets').on('mouseenter', '.dropTarget', function() {
                dragdropSwapColumns($(this));
            });
            $('#mainFrame').scroll(mainFrameScrollDropTargets);

        } else {
            // targets have already been created, so just adjust the one
            // corresponding to the column that was swapped
            var swappedCol = dragInfo.$table.find('th:eq(' + swappedColIndex + ')');
            colLeft = swappedCol.position().left;
            $('#dropTarget' + dropTargetIndex).attr('id',
                                                    'dropTarget' + swappedColIndex);
            var dropTarget = $('#dropTarget' + swappedColIndex);
            dropTarget.css({'left': (colLeft - dragMargin + dragInfo.grabOffset) +
                            'px'});
        }
    }

    function mainFrameScrollDropTargets(event) {
        var left = -$(event.target).scrollLeft();
        $('#dropTargets').css('left', left);
    }

    function dragdropSwapColumns(el) {
        var dropTargetId = parseInt((el.attr('id')).substring(10));
        var nextCol = dropTargetId - Math.abs(dropTargetId - dragInfo.colIndex);
        var prevCol = dropTargetId + Math.abs(dropTargetId - dragInfo.colIndex);
        var movedCol;
        if (dropTargetId > dragInfo.colIndex) {
            dragInfo.$table.find('tr').each(function() {
                $(this).children(':eq(' + dropTargetId + ')').after(
                    $(this).children(':eq(' + nextCol + ')')
                );
            });
            movedCol = nextCol;
        } else {
            dragInfo.$table.find('tr').each(function() {
                $(this).children(':eq(' + dropTargetId + ')').before(
                    $(this).children(':eq(' + prevCol + ')')
                );
            });
            movedCol = prevCol;
        }

        // HACK: weird hack hide show or else .header won't reposition itself
        dragInfo.$table.find('.header').css('height', '35px');
        setTimeout(function() {
            dragInfo.$table.find('.header').css('height', '36px');
        }, 0);

        var left = dragInfo.element.position().left;
        $('#shadowDiv').css('left', left);
        dragInfo.colIndex = dropTargetId;
        createDropTargets(dropTargetId, movedCol);
    }

    /* END COLUMN DRAG DROP */

    /* START TABLE DRAG DROP */

    TblAnim.startTableDrag = function($el, e) {
        if ($el.closest('.noDrag').length || $('.xcTable').length === 1) {
            return;
        }
        gMouseStatus = "checkingMovingTable";
        dragInfo.mouseX = e.pageX;
        dragInfo.$el = $el;

        var cursorStyle = '<div id="moveCursor"></div>';
        $('body').addClass('tooltipOff').append(cursorStyle);
        $(document).on('mousemove.checkTableDrag', checkTableDrag);
        $(document).on('mouseup.endTableDrag', endTableDrag);
    };

    function checkTableDrag(e) {
        dragInfo.pageX = e.pageX;
        if (Math.abs(dragInfo.mouseX - dragInfo.pageX) > 0) {
            $(document).off('mousemove.checkTableDrag');
            $(document).on('mousemove.onTableDrag', onTableDrag);

            gMouseStatus = "dragging";
            dragInfo.$el.find('.tableGrab').addClass('noDropdown');
            dragInfo.$table = dragInfo.$el.closest('.xcTableWrap');
            dragInfo.halfWidth = dragInfo.$table.outerWidth() * 0.5;
            var $activeTables = $('.xcTableWrap:not(.inActive)');
            var tableIndex = $activeTables.index(dragInfo.$table);
            dragInfo.$activeTables = $activeTables;
            dragInfo.tableIndex = tableIndex;
            dragInfo.tableId = xcHelper.parseTableId(dragInfo.$table);
            dragInfo.originalIndex = dragInfo.tableIndex;
            dragInfo.mainFrame = $('#mainFrame');
            var rect = dragInfo.$table[0].getBoundingClientRect();

            dragInfo.offsetLeft = dragInfo.$table.offset().left;
            dragInfo.prevTable = dragInfo.$table.prev();
            dragInfo.mouseOffset = dragInfo.mouseX - rect.left;
            dragInfo.docHeight = $(document).height();
            dragInfo.tableScrollTop = dragInfo.$table.scrollTop();
            createShadowTable();
            sizeTableForDragging();
            dragInfo.$table.addClass('tableDragging');
            dragInfo.$table.css('left', dragInfo.offsetLeft + 'px');
            dragInfo.windowWidth = $(window).width();
            dragInfo.mainFrameLeft = dragInfo.mainFrame[0].getBoundingClientRect().left;
            dragInfo.$table.scrollTop(dragInfo.tableScrollTop);
            createTableDropTargets();
            dragdropMoveMainFrame(dragInfo, 50);
            xcHelper.disableTextSelection();
            $('.xcTheadWrap').find('.dropdownBox').hide();
        }
    }

    function onTableDrag(e) {
        var left =  e.pageX - dragInfo.mouseOffset;
        dragInfo.$table.css('left', left + 'px');
        dragInfo.pageX = e.pageX;
    }

    function endTableDrag() {
        $(document).off('mouseup.endTableDrag');
        $('#moveCursor').remove();
        $('body').removeClass('tooltipOff');

        if (gMouseStatus === "checkingMovingTable") {
            gMouseStatus = null;
            $(document).off('mousemove.checkTableDrag');
            dragInfo.$el.find('.tableGrab').removeClass('noDropdown');
            return;
        }
        $(document).off('mousemove.onTableDrag');

        gMouseStatus = null;
        dragInfo.$table.removeClass('tableDragging').css({
            'left'  : '0px',
            'height': '100%'
        });
        $('#shadowTable, #dropTargets').remove();
        $('#mainFrame').off('scroll', mainFrameScrollTableTargets);
        dragInfo.$table.scrollTop(dragInfo.tableScrollTop);
        gActiveTableId = dragInfo.tableId;
        xcHelper.reenableTextSelection();

        if (dragInfo.tableIndex !== dragInfo.originalIndex) {
            // reorder only if order changed
            reorderAfterTableDrop(dragInfo.tableId, dragInfo.originalIndex,
                                    dragInfo.tableIndex);
        }
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();
        $('.xcTheadWrap').find('.dropdownBox').show();
    }

    function createShadowTable() {
        var $mainFrame = $('#mainFrame');
        var width = dragInfo.$table.children().width();
        var tableHeight = dragInfo.$table.find('.xcTheadWrap').height() +
                          dragInfo.$table.find('.xcTbodyWrap').height();
        var mainFrameHeight = $mainFrame.height();
        if ($mainFrame[0].scrollWidth > $mainFrame.width()) {
            mainFrameHeight -= 11;
        }
        var shadowHeight = Math.min(mainFrameHeight, tableHeight + 5);

        var shadowTable = '<div id="shadowTable" ' +
                    'style="width:' + width + 'px;height:' +
                    shadowHeight + 'px;">' +
                '</div>';

        if (dragInfo.prevTable.length > 0) {
            dragInfo.prevTable.after(shadowTable );
        } else {
            $('#mainFrame').prepend(shadowTable);
        }
    }

    function createTableDropTargets() {
        var offset = dragInfo.mouseX - dragInfo.offsetLeft;
        var tableLeft;
        var $mainFrame = dragInfo.mainFrame;
        var dropTargets = "";
        var targetWidth;
        var tempOffset = offset;
        var mainFrameScrollLeft = $mainFrame.scrollLeft();

        dragInfo.$activeTables.each(function(i) {
            if (i === dragInfo.tableIndex) {
                return true;
            }

            targetWidth = Math.round(0.5 * $(this).outerWidth());
            targetWidth = Math.min(targetWidth, dragInfo.halfWidth);

            if (i > dragInfo.tableIndex) {
                offset = tempOffset - dragInfo.halfWidth + 5;
            } else {
                offset = tempOffset - 5;
            }

            tableLeft = $(this).position().left + mainFrameScrollLeft;
            dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                            'style="left:' + (tableLeft + offset) +
                            'px;' + 'width:' + targetWidth + 'px;height:' +
                            (dragInfo.docHeight) + 'px;">' +
                                i +
                            '</div>';
        });

        tableLeft = -mainFrameScrollLeft;
        $('body').append('<div id="dropTargets" style="left:' +
                            tableLeft + 'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('#dropTargets').on('mouseenter', '.dropTarget', function() {
            dragdropSwapTables($(this));
        });
        $mainFrame.scroll(mainFrameScrollTableTargets);
    }

    function moveTableDropTargets(dropTargetIndex, oldIndex, swappedTable) {
        var offset = dragInfo.mouseX - dragInfo.offsetLeft;
        var $mainFrame = dragInfo.mainFrame;
        var tableLeft = swappedTable.position().left + $mainFrame.scrollLeft();
        var $dropTarget = $('#dropTarget' + dropTargetIndex);
        if (dropTargetIndex < oldIndex) {
            offset -= (dragInfo.halfWidth * 0.5) - 5;
        } else {
            offset -= 5;
        }

        $dropTarget.attr('id', 'dropTarget' + oldIndex);
        $dropTarget.css({'left': (tableLeft + offset) + 'px'});
    }

    function mainFrameScrollTableTargets() {
        var left = dragInfo.mainFrame.scrollLeft();
        $("#dropTargets").css('left', '-' + left + 'px');
    }

    function dragdropSwapTables(el) {
        var dropTargetIndex = parseInt((el.attr('id')).substring(10));
        var $activeTables = $('.xcTableWrap:not(.inActive)');
        var $table = $activeTables.eq(dropTargetIndex);

        if (dropTargetIndex > dragInfo.tableIndex) {
            $table.after($('#shadowTable'));
            $table.after(dragInfo.$table);
        } else {
            $table.before($('#shadowTable'));
            $table.before(dragInfo.$table);
        }

        dragInfo.$table.scrollTop(dragInfo.tableScrollTop);

        var oldIndex = dragInfo.tableIndex;
        dragInfo.tableIndex = dropTargetIndex;
        moveTableDropTargets(dropTargetIndex, oldIndex, $table);
        moveFirstColumn();
        moveTableDropdownBoxes();
        moveTableTitles();
    }

    function sizeTableForDragging() {
        var tableHeight = $('#shadowTable').height();
        dragInfo.$table.height(tableHeight);
    }

    /* END TABLE DRAG DROP */

    /* Start Helper Functions */

    // scrolls #mainFrame while draggin column or table
    function dragdropMoveMainFrame(dragInfo, timer) {
        // essentially moving the horizontal mainframe scrollbar if the mouse is
        // near the edge of the viewport
        var $mainFrame = $('#mainFrame');
        var left;

        if (gMouseStatus === 'dragging') {
            if (dragInfo.pageX > dragInfo.windowWidth - 30) { // scroll right
                left = $mainFrame.scrollLeft() + 40;
                $mainFrame.scrollLeft(left);
            } else if (dragInfo.pageX < dragInfo.mainFrameLeft + 30) { // scroll left;
                left = $mainFrame.scrollLeft() - 40;
                $mainFrame.scrollLeft(left);
            }

            setTimeout(function() {
                dragdropMoveMainFrame(dragInfo, timer);
            }, timer);
        }
    }

    // prevents screen from scrolling during drag or resize
    function lockScrolling($target, direction) {
        if (direction === "horizontal") {
            var scrollLeft = $target.scrollLeft();
            $target.addClass('scrollLocked');
            $target.on('scroll.locked', function() {
                $target.scrollLeft(scrollLeft);
            });
        }
    }

    function unlockScrolling($target, direction) {
        $target.off('scroll.locked');
        if (direction === "horizontal") {
            $target.removeClass('scrollLocked');
        }
    }

    return (TblAnim);

}(jQuery, {}));
