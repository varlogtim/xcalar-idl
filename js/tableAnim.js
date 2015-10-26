function generateFirstVisibleRowNum(rowScrollerMove) {
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
    var tdYCoor = 168; //top rows's distance from top of window
    var firstEl = document.elementFromPoint(tdXCoor, tdYCoor);
    var firstId = $(firstEl).closest('tr').attr('class');

    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(3)) + 1;
        if (!isNaN(firstRowNum)) {
            $('#rowInput').val(firstRowNum).data('val', firstRowNum);
            if (rowScrollerMove && isTableScrollable(activeTableId)) {
                RowScroller.move(firstRowNum,
                    xcHelper.getTableFromId(activeTableId).resultSetCount);
            }
        }
    }
}

function disableTextSelection() {
    xcHelper.removeSelectionRange();
    var style =
        '<style id="disableSelection" type="text/css">*' +
            '{ -ms-user-select:none;-moz-user-select:-moz-none;' +
            '-khtml-user-select:none;' +
            '-webkit-user-select:none;user-select:none;}' +
            'div[contenteditable]{pointer-events:none;}' +
        '</style>';
    $(document.head).append(style);
    $('input').prop('disabled', true);
}

function reenableTextSelection() {
    $('#disableSelection').remove();
    $('input').prop('disabled', false);
}

function gRescolMouseDown(el, event, options) {
    var rescol   = gRescol;
    var $table   = el.closest('.dataTable');
    var colNum   = xcHelper.parseColNum(el.parent().parent());
    rescol.tableId = xcHelper.parseTableId($table);
    if (options && options.target === "datastore") {
        rescol.isDatastore = true;
        rescol.$tableWrap = $('#dataSetTableWrap');
        rescol.$worksheetTable = $('#worksheetTable');
        rescol.$previewTable = $('#previewTable');
    } else if (el.closest('th').hasClass("userHidden")) {
        // This is a hidden column! we need to unhide it
        // return;
        ColManager.unhideCols([colNum], rescol.tableId, {"autoResize": false});
    }
    gMouseStatus = "resizingCol";
    event.preventDefault();
    rescol.mouseStart = event.pageX;
    rescol.grabbedCell = el.parent().parent();  // the th
    rescol.index = colNum;
    rescol.startWidth = rescol.grabbedCell.outerWidth();
    rescol.newWidth = rescol.startWidth;
    rescol.table = $table;
    rescol.tableHead = el.closest('.xcTableWrap').find('.xcTheadWrap');
    
    rescol.tempCellMinWidth = rescol.cellMinWidth;
    rescol.leftDragMax = rescol.tempCellMinWidth - rescol.startWidth;

    disableTextSelection();
    $(document.head).append('<style id="col-resizeCursor" type="text/css">*' +
                            '{cursor: col-resize !important;}' +
                            '.tooltip{display: none !important;}</style>');
}

function gRescolMouseMove(event) {
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
    if (gRescol.isDatastore) {
        rescol.$tableWrap.width(rescol.$worksheetTable.width());
           // size line divider to fit table
        var tableWidth = rescol.$previewTable.width();
        rescol.$previewTable.find('.divider').width(tableWidth - 10);
    }
}

function gRescolMouseUp() {
    gMouseStatus = null;
    var rescol = gRescol;
    $('#col-resizeCursor').remove();
    reenableTextSelection();
    gRescol.table.find('.rowGrab').width(gRescol.table.width());
    if (!gRescol.isDatastore) {
        var table = xcHelper.getTableFromId(gRescol.tableId);
        var progCol = table.tableCols[gRescol.index - 1];
        
        if (rescol.newWidth === 15) {
            rescol.table
                  .find('th.col' + rescol.index + ',td.col' + rescol.index)
                  .addClass("userHidden");
            progCol.isHidden = true;
        } else {
            progCol.width = gRescol.grabbedCell.outerWidth();
        }
        if (rescol.newWidth - 1 > rescol.startWidth ||
            rescol.newWidth + 1 < rescol.startWidth) {
            // set autoresize to header only if column moved at least 2 pixels
            var column = gTables[rescol.tableId].tableCols[rescol.index - 1];
            column.sizeToHeader = true;
        }
    } else {
        rescol.isDatastore = false;
        if (rescol.newWidth - 1 > rescol.startWidth ||
            rescol.newWidth + 1 < rescol.startWidth) {
            // set autoresize to header only if column moved at least 2 pixels
            rescol.grabbedCell.find('.colGrab').data('sizetoheader', true);
        }
    }
    moveTableDropdownBoxes();
}

function gResrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    var resrow = gResrow;
    var $table = el.closest('table');

    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
    resrow.tableId = xcHelper.parseTableId($table);
    resrow.startHeight = resrow.targetTd.outerHeight();
    resrow.rowIndex = resrow.targetTd.closest('tr').index();
    resrow.$divs = $table.find('tbody tr:eq(' + resrow.rowIndex + ') td > div');
    disableTextSelection();
    var style = '<style id="row-resizeCursor" type="text/css">*' +
                    '{cursor: row-resize !important;}' +
                    '.tooltip{display: none !important;}' +
                '</style>';
    $(document.head).append(style);
    $('body').addClass('hideScroll');
    resrow.targetTd.closest('tr').addClass('dragging changedHeight');
    resrow.$divs.css('max-height', resrow.startHeight - 4);
    resrow.$divs.eq(0).css('max-height', resrow.startHeight);
    resrow.targetTd.outerHeight(resrow.startHeight);

    $table.find('tr:not(.dragging)').addClass('notDragging');
}

function gResrowMouseMove(event) {
    var resrow = gResrow;
    var mouseDistance = event.pageY - resrow.mouseStart;
    var newHeight = resrow.startHeight + mouseDistance;
    var padding = 4; // top + bottom padding in td
    if (newHeight < gRescol.minCellHeight) {
        resrow.targetTd.outerHeight(gRescol.minCellHeight);
        resrow.$divs.css('max-height', gRescol.minCellHeight - padding);
        resrow.$divs.eq(0).css('max-height', gRescol.minCellHeight);
    } else {
        resrow.targetTd.outerHeight(newHeight);
        resrow.$divs.css('max-height', newHeight - padding);
        resrow.$divs.eq(0).css('max-height', newHeight);
    }
}

function gResrowMouseUp() {
    var newRowHeight = gResrow.targetTd.outerHeight();
    var rowNum = xcHelper.parseRowNum(gResrow.targetTd.parent()) + 1;
    var rowObj = xcHelper.getTableFromId(gResrow.tableId).rowHeights;
    // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
    var pageNum = Math.floor((rowNum - 1) / gNumEntriesPerPage);
    gMouseStatus = null;
    $('#row-resizeCursor').remove();
    reenableTextSelection();
    $('body').removeClass('hideScroll');
    $table = $('#xcTable-' + gResrow.tableId);
    $table.find('tr').removeClass('notDragging dragging');
    if (xcHelper.getTableFromId(gActiveTableId).resultSetCount !== 0) {
        generateFirstVisibleRowNum();
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
        gResrow.targetTd.parent().removeClass('changedHeight');
        gResrow.targetTd.parent().find('.jsonElement >  div')
                                 .css('max-height', 16);
    }
}

function dragdropMouseDown(el, event) {
    var $tableWrap = el.closest('.xcTableWrap');
    if ($tableWrap.hasClass('undraggable')) {
        return;
    }
    gMouseStatus = "movingCol";
    var dragObj = gDragObj;
    var cursorStyle =
        '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}' +
            '.tooltip{display: none !important;}' +
        '</style>';
    $(document.head).append(cursorStyle);
    $('.highlightBox').remove();

    var pageX = event.pageX;
    dragObj.colNum = xcHelper.parseColNum(el);
    
    var $table = el.closest('.xcTable');
    var $tbodyWrap = $table.parent();
    var $editableHead = el.find('.editableHead');
    dragObj.$table = $tableWrap;
    dragObj.tableId = xcHelper.parseTableId($table);
    dragObj.element = el;
    dragObj.colIndex = parseInt(el.index());
    dragObj.offsetTop = el.offset().top;
    dragObj.grabOffset = pageX - el.offset().left;
    // dragObj.grabOffset = distance from the left side of dragged column
    // to the point that was grabbed

    dragObj.docHeight = $(document).height();
    dragObj.val = $editableHead.val();
    var shadowDivHeight = $tbodyWrap.height();
    var shadowTop = $tableWrap.find('.header').position().top - 5;

    dragObj.inFocus = $editableHead.is(':focus');
    dragObj.selected = el.hasClass('selectedCell');
    dragObj.isHidden = el.hasClass('userHidden');
    dragObj.colWidth = el.width();
    dragObj.windowWidth = $(window).width();
    

    // create a fake transparent column by cloning
    createTransparentDragDropCol(pageX);
    
    $tbodyWrap.addClass('hideScroll');

    // create a replica shadow with same column width, height,
    // and starting position
    disableTextSelection();
    $tableWrap.append('<div id="shadowDiv" style="width:' +
                    dragObj.colWidth +
                    'px;height:' + (shadowDivHeight) + 'px;left:' +
                    (dragObj.element.position().left) +
                    'px;top:' + shadowTop + 'px;"></div>');
    createDropTargets();

    var timer;
    if (xcHelper.getTableFromId(dragObj.tableId).tableCols.length > 50) {
        timer = 100;
    } else {
        timer = 40;
    }
    dragdropMoveMainFrame(dragObj, timer);
}

function dragdropMouseMove(event) {
    var pageX = event.pageX;
    var dragObj = gDragObj;
    dragObj.pageX = pageX;
    dragObj.fauxCol.css('left', pageX);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    var dragObj = gDragObj;
    var $tableWrap = dragObj.$table;
    var $th = dragObj.element;

    if (gMinModeOn) {
        $('#shadowDiv, #fauxCol').remove();
    } else {
        // slide column into place
        $tableWrap.addClass('undraggable');
        var slideLeft = $th.offset().left -
                        parseInt(dragObj.fauxCol.css('margin-left'));
        var currentLeft = parseInt(dragObj.fauxCol.css('left'));
        var slideDistance = Math.max(2, Math.abs(slideLeft - currentLeft));
        var slideDuration = Math.log(slideDistance * 4) * 90 - 200;
        dragObj.fauxCol.animate({left: slideLeft}, slideDuration, "linear",
            function() {
                $('#shadowDiv, #fauxCol').remove();
                $tableWrap.removeClass('undraggable');
            }
        );
    }
    
    $('#dropTargets, #moveCursor').remove();
    $('#mainFrame').off('scroll', mainFrameScrollDropTargets)
                   .scrollTop(0);
    reenableTextSelection();
    $tableWrap.find('.xcTbodyWrap').removeClass('hideScroll');
    if (dragObj.inFocus) {
        dragObj.element.find('.editableHead').focus();
    }
   
    // only pull col if column is dropped in new location
    if ((dragObj.colIndex) !== dragObj.colNum) {
        var tableId  = dragObj.tableId;
        var oldColNum = dragObj.colNum;
        var newColNum = dragObj.colIndex;

        ColManager.reorderCol(tableId, oldColNum, newColNum);

        Tips.refresh();
    }
}

function dragdropMoveMainFrame(dragObj, timer) {
    // essentially moving the horizontal mainframe scrollbar if the mouse is
    // near the edge of the viewport
    var $mainFrame = $('#mainFrame');
    var left;

    if (gMouseStatus === 'movingCol' || gMouseStatus === 'movingTable') {
        if (dragObj.pageX > dragObj.windowWidth - 20) {
            left = $mainFrame.scrollLeft() + 40;
            $mainFrame.scrollLeft(left);
        } else if (dragObj.pageX < 20) {
            left = $mainFrame.scrollLeft() - 40;
            $mainFrame.scrollLeft(left);
        }
        setTimeout(function() {
            dragdropMoveMainFrame(dragObj, timer);
        }, timer);
    }
}

function cloneCellHelper(obj) {
    var dragObj = gDragObj;
    var trClass = "";
    if ($(obj).hasClass('changedHeight')) {
        trClass = 'changedHeight';
    }
    var td = $(obj).children();

    var clone = td.eq(dragObj.colIndex).clone();
    var cloneHeight = td.eq(dragObj.colIndex).outerHeight();
    var cloneColor = td.eq(dragObj.colIndex).css('background-color');
    // row.css('background-color', rowColor);
    clone.css('height', cloneHeight + 'px');
    clone.outerWidth(dragObj.colWidth);
    clone.css('background-color', cloneColor);
    var cloneHTML = clone[0].outerHTML;
    cloneHTML = '<tr class="' + trClass + '">' + cloneHTML + '</tr>';
    return cloneHTML;
    // row.append(clone).appendTo($("#fauxTable"));
    // $('#fauxTable').append(cloneHTML);
}

function createTransparentDragDropCol(pageX) {
    var dragObj = gDragObj;
    var $tableWrap = dragObj.$table;
    var $table = $tableWrap.find('table');
    $('#mainFrame').append('<div id="fauxCol" style="left:' +
                    pageX + 'px;' +
                    'width:' + (dragObj.colWidth) + 'px;' +
                    'margin-left:' + (-dragObj.grabOffset) + 'px;">' +
                        '<table id="fauxTable" ' +
                        'class="dataTable xcTable" ' +
                        'style="width:' + (dragObj.colWidth) + 'px">' +
                        '</table>' +
                    '</div>');
    dragObj.fauxCol = $('#fauxCol');
    $fauxTable = $('#fauxTable');
    
    var rowHeight = 30;
    // turn this into binary search later
    var topPx = $table.find('.header').offset().top - rowHeight;
    var topRowIndex = -1;

    $table.find('tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowIndex = $(this).index();
            topRowEl = $(this).find('td');
            return (false);
        }
    });
     
    var cloneHTML = "";
    //XXX check to see if topRowEl was found;
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
   
    if (dragObj.selected) {
        $fauxTable.addClass('selectedCol');
    }
    if (dragObj.isHidden) {
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
    dragObj.fauxCol.height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx - rowHeight;
    $fauxTable.css('margin-top', firstRowOffset);
    $fauxTable.find('tr:first-child').css({'margin-top':
            -($fauxTable.find('tr:first').outerHeight() + firstRowOffset - 5)});
}

function createDropTargets(dropTargetIndex, swappedColIndex) {
    var dragObj = gDragObj;
    var dragMargin = 30;
    if (dragObj.isHidden) {
        dragMargin = 10;
    }
    var colLeft;
    // targets extend this many pixels to left of each column
   
    if (!dropTargetIndex) {
        // create targets that will trigger swapping of columns on hover
        var dropTargets = "";
        var i = 0;
        dragObj.$table.find('tr:first th').each(function() {
            if (i === 0 || i === dragObj.colIndex) {
                i++;
                return true;  
            }
            colLeft = $(this).position().left;
            var targetWidth;

            if ((dragObj.colWidth - dragMargin) <
                Math.round(0.5 * $(this).width()))
            {
                targetWidth = dragObj.colWidth;
            } else {
                targetWidth = Math.round(0.5 * $(this).outerWidth()) +
                                dragMargin;
            }
            dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                            'style="left:' +
                            (colLeft - dragMargin + dragObj.grabOffset) + 'px;' +
                            'width:' + targetWidth + 'px;height:' +
                            (dragObj.docHeight) + 'px;">' +
                                i +
                            '</div>';
            i++;
        });
        var scrollLeft = $('#mainFrame').scrollLeft();
        // may have issues with table left if dragObj.$table isn't correct
        var tableLeft = dragObj.$table[0].getBoundingClientRect().left +
            scrollLeft;
        $('body').append('<div id="dropTargets" style="' +
                'margin-left:' + tableLeft + 'px;' +
                'left:' + (-scrollLeft) + 'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapColumns($(this));
        });
        $('#mainFrame').scroll(mainFrameScrollDropTargets);
       
    } else {
        // targets have already been created, so just adjust the one
        // corresponding to the column that was swapped
        var swappedCol = dragObj.$table.find('th:eq(' + swappedColIndex + ')');
        colLeft = swappedCol.position().left;
        $('#dropTarget' + dropTargetIndex).attr('id',
                                                'dropTarget' + swappedColIndex);
        var dropTarget = $('#dropTarget' + swappedColIndex);
        dropTarget.css({'left': (colLeft - dragMargin + dragObj.grabOffset) +
                        'px'});
    }
}

function mainFrameScrollDropTargets(event) {
    var left = -$(event.target).scrollLeft();
    $('#dropTargets').css('left', left);
}

function dragdropSwapColumns(el) {
    var dragObj = gDragObj;
    var dropTargetId = parseInt((el.attr('id')).substring(10));
    var nextCol = dropTargetId - Math.abs(dropTargetId - dragObj.colIndex);
    var prevCol = dropTargetId + Math.abs(dropTargetId - dragObj.colIndex);
    var movedCol;
    if (dropTargetId > dragObj.colIndex) {
        dragObj.$table.find('tr').each(function() {
            $(this).children(':eq(' + dropTargetId + ')').after(
                $(this).children(':eq(' + nextCol + ')')
            );
        });
        movedCol = nextCol;
    } else {
        dragObj.$table.find('tr').each(function() {
            $(this).children(':eq(' + dropTargetId + ')').before(
                $(this).children(':eq(' + prevCol + ')')
            );
        });
        movedCol = prevCol;
    }

    // XXX weird hack hide show or else .header won't reposition itself
    dragObj.$table.find('.header').css('height', '39px');
    setTimeout(function() {
        dragObj.$table.find('.header').css('height', '40px');
    }, 0);
    
    var left = dragObj.element.position().left;
    $('#shadowDiv').css('left', left);
    dragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function getTextWidth(el) {
    var width;
    var text;

    if (el.is('input')) {
        text = $.trim(el.val() + " ");
    } else {
        text = $.trim(el.text());
    }

    tempDiv = $('<div>' + text + '</div>');
    tempDiv.css({
        'font-family': el.css('font-family'),
        'font-size'  : el.css('font-size'),
        'font-weight': el.css('font-weight'),
        'position'   : 'absolute',
        'display'    : 'inline-block',
        'white-space': 'pre'
    }).appendTo($('body'));

    width = tempDiv.width();
    tempDiv.remove();
    return (width);
}

function autosizeCol(el, options) {
    options = options || {};

    var index = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var tableId = xcHelper.parseTableId($table);
    var table = xcHelper.getTableFromId(tableId);

    var includeHeader = options.includeHeader || false;
    var fitAll = options.fitAll || false;
    var minWidth = options.minWidth || (gRescol.cellMinWidth - 5);
    
    var widestTdWidth = getWidestTdWidth(el, {
        "includeHeader": includeHeader,
        "fitAll"       : fitAll
    });
    var newWidth = Math.max(widestTdWidth, minWidth);
    // dbClick is autoSized to a fixed width
    if (!options.dbClick) {
        var originalWidth = table.tableCols[index - 1].width;
        newWidth = Math.max(newWidth, originalWidth);
    }

    if (!options.unlimitedWidth) {
        var maxWidth = 700;
        newWidth = Math.min(newWidth, maxWidth);
    }
    
    el.outerWidth(newWidth);
    if ($table.attr('id').indexOf('xc') > -1) {
        table.tableCols[index - 1].width = newWidth;
    } else if ($table.attr('id') === 'worksheetTable') {
        $("#dataSetTableWrap").width($('#worksheetTable').width());
    }
    if (!options.multipleCols) {
        matchHeaderSizes($table);
    }
}

function getWidestTdWidth(el, options) {
    options = options || {};

    var includeHeader = options.includeHeader || false;
    var fitAll = options.fitAll || false;
    var id = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 10;
    var largestTd = $table.find('tbody tr:first td:eq(' + id + ')');
    var headerWidth = 0;

    if (includeHeader) {
        var $th;
        if ($table.find('.col' + id + ' .dataCol').length === 1) {
            $th = $table.find('.col' + id + ' .dataCol');
        } else {
            $th = $table.find('.col' + id + ' .editableHead');
        }
        var extraPadding = 58;
        headerWidth = getTextWidth($th) + extraPadding;
       
        if (!fitAll) {
            return (headerWidth);
        }
    }

    $table.find('tbody tr').each(function() {
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var $td = $(this).children(':eq(' + (id) + ')');
        textLength = $.trim($td.text()).length;
        if (textLength > longestText) {
            longestText = textLength;
            largestTd = $td;
        }
    });

    largestWidth = getTextWidth(largestTd) + padding;

    if (includeHeader && fitAll) {
        largestWidth = Math.max(headerWidth, largestWidth);
    }

    return (largestWidth);
}

function getTdHeights() {
    var tdHeights = [];
    $(".xcTable tbody tr").each(function() {
        tdHeights.push($(this).children().eq(0).outerHeight());
    });
    return (tdHeights);  
}

function dblClickResize($el, options) {
    // $el is the colGrab div inside the header
    gRescol.clicks++;  //count clicks
    if (gRescol.clicks === 1) {
        gRescol.timer = setTimeout(function() {   
            gRescol.clicks = 0; //after action performed, reset counter
        }, gRescol.delay);
    } else {
        $('#col-resizeCursor').remove();
        $el.tooltip('destroy');
        gMouseStatus = null;
        reenableTextSelection();
        options = options || {};

        var $th = $el.parent().parent();
        var colNum = xcHelper.parseColNum($th);
        var $table = $th.closest('.dataTable');
        $table.find('.colGrab')
              .removeAttr('data-toggle data-original-title title');

        var includeHeader;
        var target = options.target;
        if (target === "datastore") {
            if ($el.data('sizetoheader')) {
                includeHeader = true;
                $el.data('sizetoheader', false);
            } else {
                includeHeader = false;
                $el.data('sizetoheader', true);
            }
        } else {
            var tableId = $table.data('id');
            var column =  gTables[tableId].tableCols[colNum - 1];

            includeHeader = column.sizeToHeader;
            if (includeHeader) {
                column.sizeToHeader = false;
            } else {
                column.sizeToHeader = true;
            }
        }
        
        var resize;
        if ($el.closest('tHead').index() === 0) {
            resize = true;
        } else {
            resize = false;
        }

        var minWidth;
        if (options.minWidth) {
            minWidth = options.minWidth;
        } else {
            minWidth = 17;
        }
       
        autosizeCol($th, {
            "resizeFirstRow": resize,
            "dbClick"       : true,
            "minWidth"      : minWidth,
            "unlimitedWidth": true,
            "includeHeader" : includeHeader
        });
        $('#col-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
        
    }
}

function createTableHeader(tableId) {
    var $xcTheadWrap = $('<div id="xcTheadWrap-' + tableId +
                         '" class="xcTheadWrap dataTable" ' +
                         '" data-id="' + tableId + '" ' +
                         'style="top:0px;"></div>');

    $('#xcTableWrap-' + tableId).prepend($xcTheadWrap);

    var tableName = "";
    // build this table title somewhere else
    var table = xcHelper.getTableFromId(tableId);
    if (table != null) {
        tableName = table.tableName;
    }

    var html = '<div class="tableTitle">' +
                    '<div class="tableGrab"></div>' +
                    '<div class="text" spellcheck="false" contenteditable></div>' +
                    '<div class="dropdownBox">' +
                        '<span class="innerBox"></span>' +
                    '</div>' +
                '</div>';

    $xcTheadWrap.prepend(html);
    //  title's Format is tablename  [cols]
    updateTableHeader(tableId);

    var newTableName = xcHelper.randName(tableName, undefined, true);
    var tableMenuHTML =
        '<ul id="tableMenu-' + tableId +
            '" class="colMenu tableMenu" ' +
            'data-id="' + tableId + '">' +
            '<li class="archiveTable">Archive Table</li>' +
            '<li class="hideTable">Hide Table</li>' +
            '<li class="unhideTable">Unhide Table</li>' +
            // '<li class="deleteTable">Delete Table</li>' + XXX temporary
            '<li class="exportTable">Export Table</li>' +
            '<li class="delAllDuplicateCols">Delete All Duplicates</li>' +
            '<li class="quickAgg"> Quick Aggregates' +
                '<ul class="subColMenu">' +
                    '<li class="aggregates">Aggregate Functions</li>' +
                    '<li class="correlation">Correlation Coefficient</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            '<li class="moveToWorksheet" data-toggle="tooltip" ' +
                'data-placement="top" title="no worksheet to move to">' +
                'Move to worksheet' +
                '<ul class="subColMenu">' +
                    '<li style="text-align: center" class="clickable">' +
                        '<span>Worksheet Name</span>' +
                        '<div class="listSection">' +
                            '<input class="wsName" type="text" width="100px" ' +
                                'placeholder="click to see options"/>' +
                            '<ul class="list"></ul>' +
                        '</div>' +
                    '</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            '<li class="sort">Sort Columns' +
                '<ul class="subColMenu">' +
                    '<li class="sortForward">' +
                        '<span class="sortUp"></span>A-Z</li>' +
                    '<li class="sortReverse">' +
                        '<span class="sortDown"></span>Z-A</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            '<li class="resizeCols">Resize All Columns' +
                '<ul class="subColMenu">' +
                    '<li class="sizeToHeader">Size To Headers</li>' +
                    '<li class="sizeToContents">Size To Contents</li>' +
                    '<li class="sizeToFitAll">Size To Fit All</li>' +
                    '<div class="subColMenuArea"></div>' +
                '</ul>' +
                '<div class="dropdownBox"></div>' +
            '</li>' +
            // XX copy to worksheet is temporarily disabled until we can do
            // an actual copy of a table
            
            // '<li class="dupToWorksheet">' +
            //     '<span class="label">Copy to worksheet</span>' +
            //     '<ul class="subColMenu">' +
            //         '<li style="text-align: center" class="clickable">' +
            //             '<span>Worksheet Name</span>' +
            //             '<div class="listSection">' +
            //                 '<input class="wsName" type="text" width="100px" ' +
            //                     'placeholder="click to see options"/>' +
            //                 '<ul class="list"></ul>' +
            //             '</div>' +
            //         '</li>' +
            //         '<li style="text-align: center" class="clickable">' +
            //             '<span>New Table Name</span>' +
            //             '<input class="tableName" type="text" width="100px" ' +
            //                     'placeholder="Enter a new table name" ' +
            //                     'value="' + newTableName + '"/>' +
            //         '</li>' +
            //         '<div class="subColMenuArea"></div>' +
            //     '</ul>' +
            //     '<div class="dropdownBox"></div>' +
            // '</li>' +
        '</ul>';

    $('#xcTableWrap-' + tableId).append(tableMenuHTML);
    var $tableMenu = $('#tableMenu-' + tableId);
    addColMenuBehaviors($tableMenu);
    // Event Listener for table dropdown menu
    addTableMenuActions($tableMenu);
    // Event Listener for table title
    $xcTheadWrap.on({
        // must use keypress to prevent contenteditable behavior
        "keypress": function(event) {
            if (event.which === keyCode.Enter) {
                event.preventDefault();
                event.stopPropagation();
                renameTableHead($(this));
            }        
        },
        "input": function() {
            moveTableTitles();
        },
        "focus": function() {
            updateTableHeader(null, $(this), true);
            moveTableTitles();
        },
        "blur": function() {
            updateTableHeader(null, $(this));
            moveTableTitles();
        },
        "click": function() {
            // when cursor is at hashName part. move to tableName part
            if (window.getSelection) {
                var sel = window.getSelection();
                if (sel.rangeCount) {
                    var range = sel.getRangeAt(0);
                    var $parent = $(range.commonAncestorContainer.parentNode);
                    if ($parent.hasClass("hashName") ||
                        $parent.hasClass("tableTitle"))
                    {
                        xcHelper.createSelection($(this).find(".tableName")[0],
                                                 true);
                    }
                }
            }
        }
    }, ".tableTitle .text");

    $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function() {
        var classes   = "tableMenu";
        var $dropdown = $(this);

        if ($dropdown.closest('.xcTableWrap').hasClass('tableLocked')) {
            classes += "locked";
        }

        dropdownClick($dropdown, {
            "type"   : "tableDropdown",
            "classes": classes
        });
    });

    // Change from $xcTheadWrap.find('.tableGrab').mosedown...
    $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
        // Not Mouse down
        if (event.which !== 1) {
            return;
        }
        dragTableMouseDown($(this).parent(), event);
    });

    var $table = $('#xcTable-' + tableId);
    $table.width(0);
    matchHeaderSizes($table);
}

function addTableMenuActions($tableMenu) {
    var tableId = xcHelper.parseTableId($tableMenu);
    $tableMenu.on('mouseup', '.archiveTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var tableName = gTables[tableId].tableName;
        archiveTable(tableId, ArchiveTable.Keep);
        // add sql
        SQL.add('Archive Table', {
            "operation": SQLOps.ArchiveTable,
            "tableId"  : tableId,
            "tableName": tableName
        });
    });

    $tableMenu.on('mouseup', '.hideTable', function(event) {
        if (event.which !== 1) {
            return;
        }

        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        $xcTableWrap.addClass('tableHidden');
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();

        SQL.add("Hide Table", {
            "operation": SQLOps.HideTable,
            "tableName": gTables[tableId].tableName,
            "tableId"  : tableId
        });
    });

    $tableMenu.on('mouseup', '.unhideTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $xcTableWrap = $('#xcTableWrap-' + tableId);
        $xcTableWrap.removeClass('tableHidden');
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableId);
        moveTableDropdownBoxes();
        moveFirstColumn();
        moveTableTitles();
        var $table = $('#xcTable-' + tableId);
        $table.find('.rowGrab').width($table.width());

        SQL.add("UnHide Table", {
            "operation": SQLOps.UnhideTable,
            "tableName": gTables[tableId].tableName,
            "tableId"  : tableId
        });
    });

    $tableMenu.on('mouseup', '.deleteTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var tableName = xcHelper.getTableFromId(tableId).tableName;

        var msg = "Are you sure you want to delete table " + tableName + "?";
        Alert.show({
            "title"     : "DELETE TABLE",
            "msg"       : msg,
            "isCheckBox": true,
            "confirm"   : function() {
                deleteTable(tableId, TableType.Active)
                .then(function() {
                    commitToStorage();
                })
                .fail(function(error) {
                    Alert.error("Delete Table Fails", error);
                });
            }
        });
    });

    $tableMenu.on('mouseup', '.exportTable', function(event) {
        if (event.which !== 1) {
            return;
        }

        ExportModal.show(tableId);
    });

    $tableMenu.on('mouseup', '.delAllDuplicateCols', function(event) {
        if (event.which !== 1) {
            return;
        }
        ColManager.delAllDupCols(tableId);
    });

    $tableMenu.on('mouseup', '.aggregates', function(event) {
        if (event.which !== 1) {
            return;
        }
        AggModal.show(tableId, 'aggregates');
    });

    $tableMenu.on('mouseup', '.correlation', function(event) {
        if (event.which !== 1) {
            return;
        }
        AggModal.show(tableId, 'correlation');
    });


    // opeartion for move to worksheet and copy to worksheet
    $tableMenu.on('mouseenter', '.moveToWorksheet', function() {
        var $list = $(this).find(".list");
        $list.empty().append(WSManager.getWSLists(false));
    });


    $tableMenu.on('mouseenter', '.dupToWorksheet', function() {
        var $list = $(this).find(".list");
        $list.empty().append( WSManager.getWSLists(true));
    });

    xcHelper.dropdownList($tableMenu.find(".listSection"), {
        "onSelect": function($li) {
            var $input = $li.closest(".listSection").find(".wsName");
            $input.val($li.text()).focus();
        }
    });

    $tableMenu.on('keypress', '.moveToWorksheet input', function(event) {
        if (event.which === keyCode.Enter) {
            var $input  = $(this);
            var wsName  = jQuery.trim($input.val());
            var $option =
                $input.siblings(".list").find("li").filter(function() {
                    return ($(this).text() === wsName); });

            var isValid  = xcHelper.validate([
                {
                    "$selector": $input,
                    "forMode"  : true
                },
                {
                    "$selector": $input,
                    "check"    : function () {
                        return ($option.length === 0);
                    },
                    "text": "Invalid worksheet name, please choose a " +
                                 "worksheet in the pop up list!",
                    "forMode": true
                }
            ]);

            if (!isValid) {
                return false;
            }

            var $menu    = $input.closest('.tableMenu');
            var wsIndex  = $option.data("worksheet");

            WSManager.moveTable(tableId, wsIndex);

            $input.val("");
            $input.blur();
            closeMenu($menu);
        }
    });

    $tableMenu.on('keypress', '.dupToWorksheet input', function(event) {
        if (event.which === keyCode.Enter) {
            var $li             = $(this).closest(".dupToWorksheet");
            // there are two inputs in the sectin, so not use $(this)
            var $wsInput        = $li.find(".wsName");
            var $tableNameInput = $li.find(".tableName");
            // validation check
            var isValid         = xcHelper.validate([
                { "$selector": $wsInput,
                  "formMode" : true
                },
                { "$selector": $tableNameInput,
                  "formMode" : true
                }
            ]);

            if (!isValid) {
                return false;
            }

            var wsName       = jQuery.trim($wsInput.val());
            var newTableName = jQuery.trim($tableNameInput.val());

            var $option = $li.find(".list li").filter(function() {
                return ($(this).text() === wsName);
            });
            // XXX also need to check table name conflict
            isValid = xcHelper.validate({
                "$selector": $wsInput,
                "check"    : function() {
                    return ($option.length === 0);
                },
                "text": "Invalid worksheet name, " +
                             "please choose a worksheet in the pop up list!",
                "formMode": true
            });

            if (!isValid) {
                return false;
            }

            var $menu    = $li.closest('.tableMenu');
            var table    = xcHelper.getTableFromId(tableId);
            var wsIndex  = $option.data("worksheet");

            WSManager.copyTable(table.tableName, newTableName, wsIndex);

            $wsInput.val("");
            $wsInput.blur();

            $tableNameInput.val(xcHelper.randName(table.tableName, undefined,
                                                  true));
            $tableNameInput.blur();
            closeMenu($menu);
        }
    });

    $tableMenu.on('mouseup', '.sortForward', function(event) {
        if (event.which !== 1) {
            return;
        }
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableId, "forward");
        }, 0);
    });

    $tableMenu.on('mouseup', '.sortReverse', function(event) {
        if (event.which !== 1) {
            return;
        }
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableId, "reverse");
        }, 0);
    });


    $tableMenu.on('mouseup', '.resizeCols li', function(event) {
        if (event.which !== 1) {
            return;
        }
        var sizeToHeader = $(this).hasClass('sizeToHeader');
        var fitAll = $(this).hasClass('sizeToFitAll');
        if (fitAll) {
            sizeToHeader = true;
        }
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            var columns = gTables[tableId].tableCols;
            var numCols = columns.length;
            var $th;
            var $table = $('#xcTable-' + tableId);

            for (var i = 0; i < numCols; i++) {
                $th = $table.find('th.col' + (i + 1));
                columns[i].sizeToHeader = !sizeToHeader;
                columns[i].isHidden = false;

                autosizeCol($th, {
                    "dbClick"       : true,
                    "minWidth"      : 17,
                    "unlimitedWidth": false,
                    "includeHeader" : sizeToHeader,
                    "fitAll"        : fitAll,
                    "multipleCols"  : true
                });
            }

            $table.find('.userHidden').removeClass('userHidden');

            matchHeaderSizes($table);
        }, 0);
    });
}

function sortAllTableColumns(tableId, direction) {
    var table = gTables[tableId];
    var tableCols = table.tableCols;
    var order;
    if (direction === "reverse") {
        order = 1;
    } else {
        order = -1;
    }

    var numCols = tableCols.length;
    var dataCol;
    if (tableCols[numCols - 1].name === 'DATA') {
        dataCol = tableCols.splice(numCols - 1, 1)[0];
    }

    tableCols.sort(function(a, b) {
        a = a.name.toLowerCase();
        b = b.name.toLowerCase();

        // if a = "as1df12", return ["as1df12", "as1df", "12"]
        // if a = "adfads", return null
        var matchA = a.match(/(^.*?)([0-9]+$)/);
        var matchB = b.match(/(^.*?)([0-9]+$)/);

        if (matchA != null && matchB != null && matchA[1] === matchB[1]) {
            // if the rest part that remove suffix number is same,
            // compare the suffix number
            a = parseInt(matchA[2]);
            b = parseInt(matchB[2]);
        }

        if (a < b) {
            return (order);
        } else if (a > b) {
            return (-order);
        } else {
            return (0);
        }
    });

    if (dataCol) {
        tableCols.push(dataCol);
        numCols--;
    }
    var $table = $('#xcTable-' + tableId);
    var $rows = $table.find('tbody tr');
    var numRows = $rows.length;
    var oldColIndex;
    var newColIndex;
    // loop through each column
    for (var i = 0; i < numCols; i++) {
        oldColIndex = tableCols[i].index;
        newColIndex = i + 1;
        var $thToMove = $table.find('th.col' + oldColIndex);
        $thToMove.find('.col' + oldColIndex).removeClass('col' + oldColIndex)
                                            .addClass('col' + newColIndex);
        var oldPos = $thToMove.index();
        $table.find('th').eq(i).after($thToMove);
        // loop through each row and order each td
        for (var j = 0; j < numRows; j++) {
            var $row = $rows.eq(j);
            var $tdToMove = $row.find('td').eq(oldPos);
            $tdToMove.removeClass('col' + oldColIndex)
                     .addClass('col' + newColIndex);
            $row.find('td').eq(i).after($tdToMove);
        }
    }

    // correct gTable tableCols index and th col class number
    var $ths = $table.find('th');
    for (var i = 0; i < numCols; i++) {
        oldColIndex = tableCols[i].index;
        newIndex = i + 1;
        $ths.eq(newIndex).removeClass('col' + oldColIndex)
                                   .addClass('col' + newIndex);
        tableCols[i].index = newIndex;
    }

    RightSideBar.updateTableInfo(tableId);

    SQL.add("Sort Table Columns", {
        "operation": SQLOps.SortTableCols,
        "tableName": table.tableName,
        "tableId"  : tableId,
        "direction": direction
    });
}

function renameTableHead($div) {
    var newName = $div.find(".tableName").text().trim();
    var $th = $div.closest('.xcTheadWrap');
    var tableId = xcHelper.parseTableId($th);
    var newTableName = newName + "#" + tableId;
    var oldTableName = gTables[tableId].tableName;

    if (newTableName === oldTableName) {
        $div.blur();
        return;
    }

    // XXX Shall we really check if the name part has conflict?
    xcHelper.checkDuplicateTableName(newName)
    .then(function() {
        return (xcFunction.rename(tableId, newTableName));
    })
    .then(function() {
        $div.blur();
    })
    .fail(function() {
        $div.text(oldTableName);
        var text = 'The name "' + newName + '" is already ' +
                    ' in use. Please select a unique name.';
        StatusBox.show(text, $div, false);
    });
}

function updateTableHeader(tableId, $tHead, isFocus) {
    var fullTableName = "";
    var cols = 0;

    // for blur and focus on table header
    if (tableId == null) {
        cols = $tHead.data("cols");
        fullTableName = $tHead.data("title");
    } else {
        // for update table header
        $tHead = $("#xcTheadWrap-" + tableId).find(".tableTitle .text");
        var table = gTables[tableId];

        if (table != null) {
            fullTableName = table.tableName;
            cols = table.tableCols.length;
        }
        isFocus = false;
        $tHead.data("cols", cols);
        $tHead.data("title", fullTableName);
    }

    fullTableName = fullTableName.split("#");

    var tableName = fullTableName[0];

    if (fullTableName.length === 2) {
        tableName =
            '<span class="tableName">' + tableName + '</span>' +
            '<span class="hashName" contenteditable="false">#' +
                fullTableName[1] +
            '</span>';
    }

    if (isFocus) {
        $tHead.html(tableName);
        xcHelper.createSelection($tHead.find(".tableName")[0]);
    } else {
        var colsHTML = '<span class="colNumBracket" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="number of columns">' +
                        ' [' + cols + ']</span>';
        $tHead.html(tableName + colsHTML);
    }
}

function matchHeaderSizes($table) {
    // concurrent build table may make some $table be []
    if ($table.length === 0) {
        return;
    }

    // var tableId = xcHelper.parseTableId($table);
    var tableWidth = $table.width();

    moveTableDropdownBoxes();
    moveTableTitles();
    $table.find('.rowGrab').width(tableWidth);
}

function addColListeners($table, tableId) {
    var $thead = $table.find('thead tr');
    var $tbody = $table.find("tbody");
    var $colMenu = $("#colMenu-" + tableId);
    var lastSelectedCell;

    // listeners on thead
    var $fnBar = $('#fnBar');
    $thead.on({
        "focus": function() {
            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
            var $colInput = $(this);

            $fnBar.addClass('active');
            focusTable(tableId);

            var oldFnBarOrigin;
            if (gFnBarOrigin) {
                // gFnBarOrigin could be null
                oldFnBarOrigin = gFnBarOrigin.get(0);
            }
            gFnBarOrigin = $colInput;

            if ($fnBar.hasClass('entered')) {
                $fnBar.removeClass('entered');
            } else if (oldFnBarOrigin === gFnBarOrigin.get(0)) {
                // the function bar origin hasn't changed so just return
                // and do not rehighlight or update any text
                return;
            }
        },
        "blur": function() {
            $fnBar.removeClass('active');
        }
    }, ".editableHead");
    
    $thead.on("mousedown", ".flexContainer", function(event) {
        if ($("#mainFrame").hasClass("modalOpen")) {
            // not focus when in modal
            return;
        } else if ($(this).closest('.dataCol').length !== 0) {
            return;
        }
        gFnBarOrigin = $(this).find('.editableHead');

        var colNum = xcHelper.parseColNum(gFnBarOrigin);
        var table = xcHelper.getTableFromId(tableId);
        var userStr = table.tableCols[colNum - 1].userStr;
        userStr = userStr.substring(userStr.indexOf('='));
        $fnBar.val(userStr);
        var notDropDown = $(event.target).closest('.dropdownBox')
                                            .length === 0;

        if ($table.find('.selectedCell').length === 0) {
            $('.selectedCell').removeClass('selectedCell');
            lastSelectedCell = gFnBarOrigin;
        }

        if (event.ctrlKey || event.metaKey) {
            if ($(this).closest('.selectedCell').length > 0) {
                if (notDropDown) {
                    unhighlightColumn(gFnBarOrigin);
                }   
            } else {
                highlightColumn(gFnBarOrigin, true);
            }
        } else if (event.shiftKey) {
            if (lastSelectedCell && lastSelectedCell.length > 0) {
                var preColNum = xcHelper.parseColNum(lastSelectedCell);
                var lowNum = Math.min(preColNum, colNum);
                var highNum = Math.max(preColNum, colNum);
                var $th;
                var $col;
                var select = !$(this).closest('th').hasClass('selectedCell');

                for (var i = lowNum; i <= highNum; i++) {
                    $th = $table.find('th.col' + i);
                    $col = $th.find('.editableHead');
                    if ($col.length === 0) {
                        continue;
                    }

                    if (select) {
                        highlightColumn($col, true);
                    } else if (notDropDown) {
                        unhighlightColumn($col);
                    }
                }
            }
        } else {
            if ($(this).closest('.selectedCell').length > 0) {
                if (notDropDown) {
                    highlightColumn(gFnBarOrigin, false);
                    lastSelectedCell = null;
                } else {
                    highlightColumn(gFnBarOrigin, true);
                }
            } else {
                highlightColumn(gFnBarOrigin, false);
                lastSelectedCell = null;
            }
        }
        lastSelectedCell = gFnBarOrigin;
    });

    $thead.on("click", ".header .flex-right > .dropdownBox", function() {
        var options = {"type": "thDropdown"};

        var $el = $(this);
        var $th = $el.closest("th");

        var colNum = xcHelper.parseColNum($th);

        $(".tooltip").hide();
        resetColMenuInputs($el);

        options.colNum = colNum;
        options.classes = $el.closest('.header').attr('class');

        if ($th.hasClass('indexedColumn')) {
            options.classes += " type-indexed";
        }

        if ($th.hasClass('newColumn') ||
            options.classes.indexOf('type') === -1) {
            options.classes += " type-newColumn";
        }
        if ($th.hasClass("userHidden")) {
            // column is hidden
            options.classes += " type-hidden";
        }

        if ($el.closest('.xcTable').hasClass('emptyTable')) {
            options.classes += " type-emptyTable";
        }

        if ($('th.selectedCell').length > 1) {
            options.classes += " type-multiColumn";
            options.multipleColNums = [];
            var tableCols = gTables[tableId].tableCols;
            var types = {};
            var tempType = "type-" + tableCols[colNum - 1].type;
            types[tempType] = true;

            var tempColNum;
            var hiddenDetected = false;
            $('th.selectedCell').each(function() {
                tempColNum = xcHelper.parseColNum($(this));
                options.multipleColNums.push(tempColNum);
                if (!hiddenDetected && $(this).hasClass("userHidden")) {
                    hiddenDetected = true;
                    options.classes += " type-hidden";
                }

                tempType = "type-" + tableCols[tempColNum - 1].type;
                if (!types.hasOwnProperty(tempType)) {
                    types[tempType] = true;
                    options.classes += " " + tempType;
                }
            });
        }

        dropdownClick($el, options);
    });

    $thead.on('mousedown', '.colGrab', function(event) {
        if (event.which !== 1) {
            return;
        }
        gRescolMouseDown($(this), event);
        dblClickResize($(this));
    });

    $thead.on('mousedown', '.dragArea', function(event) {
        if (event.which !== 1) {
            return;
        }
        var headCol = $(this).parent().parent();
        dragdropMouseDown(headCol, event);
    });

    $thead.on("keydown", ".editableHead", function(event) {
        var $input = $(event.target);
        if (event.which === keyCode.Enter && !$input.prop("readonly")) {
            var colName = $input.val().trim();

            if (colName === "" ||
                ColManager.checkColDup($input, null, tableId))
            {
                return false;
            }

            $input.prop("readonly", true);

            var colNum = xcHelper.parseColNum($input);
            ColManager.renameCol(colNum, tableId, colName);
        }
    });

    // listeners on tbody
    $tbody.on("mousedown", "td", function(event) {
        var $td = $(this);
        var $el = $td.children('.clickable');

        if (event.which !== 1 || $el.length === 0) {
            return;
        }

        var yCoor = Math.max(event.pageY, $el.offset().top + $el.height() - 10);
        var colNum = xcHelper.parseColNum($td);
        var rowNum = xcHelper.parseRowNum($td.closest("tr"));
        var isUnSelect = false;
        
        $(".tooltip").hide();
        resetColMenuInputs($el);

        var $highlightBoxs = $(".highlightBox");

        // remove highlights of other tables
        $highlightBoxs.filter(function() {
            return (!$(this).hasClass(tableId));
        }).remove();

        if (event.ctrlKey || event.metaKey) {
            // ctrl key: multi selection
            multiSelection();
        } else if (event.shiftKey) {
            // shift key: multi selection from minIndex to maxIndex
            var $lastNoShiftCell = $highlightBoxs.filter(function() {
                return $(this).hasClass("noShiftKey");
            });

            if ($lastNoShiftCell.length === 0) {
                singleSelection();
            } else {
                var lastColNum = $lastNoShiftCell.data("colNum");

                if (lastColNum !== colNum) {
                    // when colNum changes
                    multiSelection();
                } else {
                    // re-hightlight shift key cell
                    $highlightBoxs.filter(function() {
                        return $(this).hasClass("shiftKey");
                    }).remove();

                    var $curTable  = $td.closest(".xcTable");
                    var baseRowNum = $lastNoShiftCell.data("rowNum");

                    var minIndex = Math.min(baseRowNum, rowNum);
                    var maxIndex = Math.max(baseRowNum, rowNum);
                    var isShift = true;

                    for (var r = minIndex; r <= maxIndex; r++) {
                        var $cell = $curTable.find(".row" + r + " .col" + colNum);
                        // in case double added hightlight to same cell
                        $cell.find(".highlightBox").remove();

                        if (r === baseRowNum) {
                            highlightCell($cell, tableId, r, colNum);
                        } else {
                            highlightCell($cell, tableId, r, colNum, isShift);
                        }
                    }
                }
            }
        } else {
            // select single cell
            singleSelection();
        }

        dropdownClick($el, {
            "type"      : "tdDropdown",
            "colNum"    : colNum,
            "rowNum"    : rowNum,
            "classes"   : "tdMenu", // specify classes to update colmenu's class attr
            "mouseCoors": {"x": event.pageX, "y": yCoor},
            "shiftKey"  : event.shiftKey,
            "isMutiCol" : isMultiColum(),
            "isUnSelect": isUnSelect
        });

        function singleSelection() {
            if ($highlightBoxs.length === 1 &&
                $td.find('.highlightBox').length > 0)
            {
                // deselect
                unHighlightCell($td);
                isUnSelect = true;
            } else {
                $highlightBoxs.remove();
                highlightCell($td, tableId, rowNum, colNum);
            }
        }

        function multiSelection() {
            // remove old shiftKey and noShiftKey class
            $highlightBoxs.removeClass("shiftKey")
                        .removeClass("noShiftKey");

            if ($td.find('.highlightBox').length > 0) {
                // deselect
                unHighlightCell($td);
                isUnSelect = true;
            } else {
                highlightCell($td, tableId, rowNum, colNum);
            }
        }
    });

    // right click the open colMenu
    $tbody[0].oncontextmenu = function(event) {
        var $el = $(event.target).closest(".highlightBox");

        if ($el.length === 0) {
            return false;
        }

        var $td = $el.parent();

        var yCoor = Math.max(event.pageY, $el.offset().top + $el.height() - 10);
        var colNum = xcHelper.parseColNum($td);
        var rowNum = xcHelper.parseRowNum($td.closest("tr"));

        $(".tooltip").hide();
        resetColMenuInputs($el);

        dropdownClick($el, {
            "type"      : "tdDropdown",
            "colNum"    : colNum,
            "rowNum"    : rowNum,
            "classes"   : "tdMenu", // specify classes to update colmenu's class attr
            "mouseCoors": {"x": event.pageX, "y": yCoor},
            "isMutiCol" : isMultiColum()
        });

        return false;
    };

    addColMenuBehaviors($colMenu);
    addColMenuActions($colMenu);
}

function isMultiColum() {
    var lastColNum;
    var multiCol = false;

    $(".highlightBox").each(function() {
        var colNum = $(this).data("colNum");

        if (lastColNum == null) {
            lastColNum = colNum;
        } else if (lastColNum !== colNum) {
            multiCol = true;
            return false;
        }
    });

    return (multiCol);
}

function sortHightlightCells($highlightBoxs) {
    var cells = [];

    $highlightBoxs.each(function() {
        cells.push($(this));
    });

    cells.sort(function($a, $b) {
        // first sort by colNum, then sort by rowNum if in same col
        var res = $a.data("colNum") - $b.data("colNum");

        if (res === 0) {
            res = $a.data("rowNum") - $b.data("rowNum");
        }

        return (res);
    });

    return (cells);
}

function highlightCell($td, tableId, rowNum, colNum, isShift) {
    // draws a new div positioned where the cell is, intead of highlighting
    // the actual cell
    var border = 5;
    var width = $td.outerWidth() - border;
    var height = $td.outerHeight();
    var left = $td.position().left;
    var top = $td.position().top;
    var styling = 'width:' + width + 'px;' +
                  'height:' + height + 'px;' +
                  'left:' + left + 'px;' +
                  'top:' + top + 'px;';
    var divClass = "highlightBox " + tableId;

    if (isShift) {
        divClass += " shiftKey";
    } else {
        // this can be used as a base cell when user press shift
        // to select multi rows
        divClass += " noShiftKey";
    }

    var $highlightBox = $('<div class="' + divClass + '" ' +
                            'style="' + styling + '">' +
                        '</div>');

    $highlightBox.data("rowNum", rowNum)
                .data("colNum", colNum);

    $td.append($highlightBox);
}

function unHighlightCell($td) {
    $td.find(".highlightBox").remove();
}

function addColMenuBehaviors($colMenu) {
    // enter and leave the menu
    $colMenu.on({
        "mouseenter": function() {
            var $li = $(this);
            $li.children('ul').addClass('visible');
            $li.addClass('selected');
            if (!$li.hasClass('inputSelected')) {
                $colMenu.find('.inputSelected').removeClass('inputSelected');
            }
        },
        "mouseleave": function() {
            var $li = $(this);
            $li.children('ul').removeClass('visible');
            $li.find('.listSection').removeClass("open")
                .find('.list').hide();
            $li.removeClass('selected');
            $('.tooltip').remove();
        }
    }, "li");

    $colMenu.on('mousedown', '.subColMenuArea', function(event) {
        if (event.which !== 1) {
            return;
        }
        closeMenu($colMenu);
    });

    $colMenu.on('mousedown', '.inputMenu span', function(event) {
        if (event.which !== 1) {
            return;
        }
        if ($(this).hasClass('openMenuInput')) {
            $(this).removeClass('openMenuInput');
        } else {
            $(this).addClass('openMenuInput');
        }
    });
    
    // prevents input from closing unless you hover over a different li
    // on the main column menu
    $colMenu.find('input').on({
        "focus": function() {
            $(this).parents('li').addClass('inputSelected')
                   .parents('.subColMenu').addClass('inputSelected');
        },
        "blur": function() {
            $(this).parents('li').removeClass('inputSelected')
                   .parents('.subColMenu').removeClass('inputSelected');
        },
        "keyup": function() {
            var $input = $(this);
            $input.parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }
    });

    $colMenu.on('mouseup', 'li', function(event) {
        if (event.which !== 1) {
            return;
        }
        event.stopPropagation();
        var $li = $(this);
        if ($li.children('.subColMenu, input').length === 0 &&
            !$li.hasClass('unavailable') &&
            $li.closest('.clickable').length === 0) {
            // hide li if doesnt have a submenu or an input field
            closeMenu($colMenu);
            if (!$li.hasClass('functions')) {
                $('.selectedCell').removeClass('selectedCell');
            }
        }
    });

    // the following behavior isn't great...
    // $colMenu.on('mouseup', 'input', function() {
    //     $(this).select();
    // });
}

function addColMenuActions($colMenu) {
    var tableId = xcHelper.parseTableId($colMenu);

    // add new column
    $colMenu.on('mouseup', '.addColumns', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');

        // add sql
        var table = gTables[tableId];
        var sqlOptions = {
            "operation"  : SQLOps.AddNewCol,
            "tableName"  : table.tableName,
            "tableId"    : tableId,
            "siblColName": table.tableCols[colNum - 1].name,
            "siblColNum" : colNum
        };

        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
            sqlOptions.direction = "L";
        } else {
            sqlOptions.direction = "R";
        }

        ColManager.addCol(colNum, tableId, null, {
            "direction": direction,
            "isNewCol" : true,
            "inFocus"  : true
        });

        SQL.add("Add New Column", sqlOptions);
        commitToStorage();
    });

    $colMenu.on('mouseup', '.deleteColumn', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum  = $colMenu.data('colNum');
        ColManager.delCol([colNum], tableId);
    });

    $colMenu.on('mouseup', '.deleteDuplicates', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        ColManager.delDupCols(colNum, tableId);
    });

    $colMenu.on('keypress', '.renameCol input', function(event) {
        if (event.which === keyCode.Enter) {
            var $input  = $(this);
            var colName = $input.val().trim();

            if (colName === "" ||
                ColManager.checkColDup($input, null, tableId))
            {
                return false;
            }

            var colNum = $colMenu.data('colNum');

            ColManager.renameCol(colNum, tableId, colName);
            $input.val("").blur();
            closeMenu($colMenu);
        }
    });

    $colMenu.on('keypress', '.splitCol input', function(event) {
        if (event.which === keyCode.Enter) {
            var colNum = $colMenu.data("colNum");
            var $li = $(this).closest("li");
            var $delimInput = $li.find(".delimiter");
            var delim = $delimInput.val();

            if (delim.trim() === "") {
                if (delim.length === 0) {
                    // when this field is empty
                    var errorText = "Please fill out this field.";
                    StatusBox.show(errorText, $delimInput);
                    return;
                }
                // cast of space/tab
                // XXX this part maybe buggy
                delim = delim.charAt(0);
            }

            var $numInput = $li.find(".num");
            var num = $numInput.val().trim();
            var numColToGet;

            if (num === "") {
                // start from 1
                var maxNum = 1;
                $("#xcTable-" + tableId + " tbody td.col" + colNum +
                " .addedBarTextWrap").each(function() {
                    var splitNum = $(this).text().split(delim).length;
                    maxNum = Math.max(maxNum, splitNum);
                });
                num = maxNum;
                numColToGet = null;
            } else {
                num = Number($numInput.val().trim());
                numColToGet = num;
            }

            var isValid = xcHelper.validate([
                {
                    "$selector": $numInput,
                    "text"     : "Invalid input, please input a number",
                    "check"    : function() {
                        return (isNaN(num) || !Number.isInteger(num));
                    }
                },
                {
                    "$selector": $numInput,
                    "check"    : function() { return (num < 1); },
                    "text"     : "Ivalid number, " +
                                "please specify a number bigger than 0"
                }
            ]);

            if (!isValid) {
                return;
            }

            ColManager.splitCol(colNum, tableId, delim, numColToGet, true);
            $delimInput.val("").blur();
            $numInput.val("").blur();
            closeMenu($colMenu);
        }
    });

    $colMenu.on('mouseup', '.duplicate', function(event) {
        if (event.which !== 1) {
            return;
        }

        var colNum = $colMenu.data('colNum');
        ColManager.dupCol(colNum, tableId);
    });

    $colMenu.on('mouseup', '.hide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        ColManager.hideCols([colNum], tableId);
    });

    $colMenu.on('mouseup', '.unhide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        ColManager.unhideCols([colNum], tableId, {"autoResize": true});
    });

    $colMenu.on('mouseup', '.textAlign', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $li = $(this);
        var colNum;
        if ($li.closest('.multiColumn').length !== 0) {
            colNum = $colMenu.data('columns');
        } else {
            colNum = $colMenu.data('colNum');
        }
        ColManager.textAlign(colNum, tableId, $(this).attr("class"));
    });

    $colMenu.on('mouseup', '.typeList', function(event) {
        if (event.which !== 1) {
            return;
        }

        var $li = $(this);
        var colTypeInfos = [];
        var colNum;
        var newType = $li.find(".label").text().toLowerCase();
        if ($li.closest(".multiColumn").length !== 0) {
            var colNums = $colMenu.data("columns");
            for (var i = 0, len = colNums.length; i < len; i++) {
                colNum = colNums[i];
                colTypeInfos.push({
                    "colNum": colNum,
                    "type"  : newType
                });
            }
        } else {
            colNum = $colMenu.data("colNum");
            colTypeInfos.push({
                "colNum": colNum,
                "type"  : newType
            });
        }

        ColManager.changeType(colTypeInfos, tableId);
    });

    $colMenu.on('mouseup', '.sort .sort', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        xcFunction.sort(colNum, tableId, SortDirection.Forward);
    });
    
    $colMenu.on('mouseup', '.sort .revSort', function(event) {
        return; //XX revSort is currently unavailable
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        xcFunction.sort(colNum, tableId, SortDirection.Backward);
    });

    $colMenu.on('mouseup', '.joinList', function(event) {
        if (event.which !== 1) {
            return;
        }

        var colNum  = $colMenu.data('colNum');
        JoinModal.show(tableId, colNum);
    });

    $colMenu.on('mouseup', '.functions', function(event) {
        if (event.which !== 1 || $(this).hasClass('unavailable')) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        var func = $(this).text().replace(/\./g, '');
        OperationsModal.show(tableId, colNum, func);
    });

    $colMenu.on('mouseup', '.profile', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        STATSManager.run(tableId, colNum);
    });

    $colMenu.on('mouseup', '.tdFilter, .tdExclude', function(event) {
        var $li =  $(this);

        if (event.which !== 1 || $li.hasClass('unavailable')) {
            return;
        }

        var colNum  = $colMenu.data('colNum');

        var $table  = $("#xcTable-" + tableId);
        var $header = $table.find("th.col" + colNum + " .header");

        var colName = gTables[tableId].tableCols[colNum - 1]
                                                        .func.args[0];
        var $highlightBoxs = $table.find(".highlightBox");

        var notValid = false;
        var uniqueVals = {};
        var hasCheckExist = false;
        var colVal;

        $highlightBoxs.each(function() {
            colVal = $(this).siblings(".addedBarTextWrap").text();

            if ($header.hasClass("type-integer")) {
                if (colVal === "") {
                    hasCheckExist = true;
                    return true; // continue to next iteration
                }
                colVal = parseInt(colVal);
            } else if ($header.hasClass("type-decimal")) {
                if (colVal === "") {
                    hasCheckExist = true;
                    return true; // continue to next iteration
                }
                colVal = parseFloat(colVal);
            } else if ($header.hasClass("type-string")) {
                colVal = JSON.stringify(colVal);
            } else if ($header.hasClass("type-boolean")) {
                if (colVal === "true") {
                    colVal = true;
                } else {
                    colVal = false;
                }
            } else {
                notValid = true;
                return false;
            }

            uniqueVals[colVal] = true;
        });

        if (notValid) {
            $highlightBoxs.remove();
            return;
        }

        var colVals = [];

        for (var val in uniqueVals) {
            colVals.push(val);
        }

        var operator;
        var str = "";
        var len = colVals.length;

        if ($li.hasClass("tdFilter")) {
            operator = "eq";

            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "or(eq(" + colName + ", " + colVals[i] + "), ";
                }

                str += "eq(" + colName + ", " + colVals[len - 1];

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }

            if (hasCheckExist) {
                if (len > 0) {
                    str = "or(" + str + ", not(exists(" + colName + ")))";
                } else {
                    str = "not(exists(" + colName + "))";
                }
            }
        } else {
            operator = "exclude";

            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "and(not(eq(" + colName + ", " + colVals[i] + ")), ";
                }

                str += "not(eq(" + colName + ", " + colVals[len - 1] + ")";

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }

            if (hasCheckExist) {
                if (len > 0) {
                    str = "and(" + str + ", exists(" + colName + "))";
                } else {
                    str = "exists(" + colName + ")";
                }
            }
        }

        var options = {
            "operator"    : operator,
            "filterString": str
        };
        xcFunction.filter(colNum - 1, tableId, options);
        $highlightBoxs.remove();
    });

    $colMenu.on('mouseup', '.tdJsonModal', function(event) {
        if (event.which !== 1) {
            return;
        }
        var rowNum  = $colMenu.data('rowNum');
        var colNum  = $colMenu.data('colNum');
        var $table  = $("#xcTable-" + tableId);
        var $td     = $table.find(".row" + rowNum + " .col" + colNum);
        var isArray = $table.find("th.col" + colNum + " > div")
                            .hasClass('type-array');
        JSONModal.show($td, isArray);
    });

    $colMenu.on('mouseup', '.tdUnnest', function(event) {
        if (event.which !== 1) {
            return;
        }
        var rowNum  = $colMenu.data('rowNum');
        var colNum  = $colMenu.data('colNum');
        var $table  = $("#xcTable-" + tableId);
        var $td     = $table.find(".row" + rowNum + " .col" + colNum);
        var isArray = $table.find("th.col" + colNum + " > div")
                            .hasClass('type-array');
        $(".xcTable").find(".highlightBox").remove();
        setTimeout(function() {
           unnest($td, isArray);
       }, 0);
    });

    $colMenu.on('mouseup', '.tdCopy', function(event) {
        var $li = $(this);
        if (event.which !== 1 || $li.hasClass('unavailable')) {
            return;
        }
        var $highlightBoxs = $("#xcTable-" + tableId).find(".highlightBox");
        var valArray = [];
        var colVal;
        var cells = sortHightlightCells($highlightBoxs);

        for (var i = 0, len = cells.length; i < len; i++) {
            colVal = cells[i].siblings(".addedBarTextWrap").text();
            valArray.push(colVal);
        }

        copyToClipboard(valArray);
        $highlightBoxs.remove();
    });

    // multiple columns
    $colMenu.on('mouseup', '.deleteColumns', function(event) {
        if (event.which !== 1) {
            return;
        }
        var columns = $colMenu.data('columns');
        ColManager.delCol(columns, tableId);
    });

    $colMenu.on('mouseup', '.hideColumns', function(event) {
        if (event.which !== 1) {
            return;
        }

        var columns = $colMenu.data('columns');

        ColManager.hideCols(columns, tableId);
    });

    $colMenu.on('mouseup', '.unhideColumns', function(event) {
        if (event.which !== 1) {
            return;
        }

        var columns = $colMenu.data('columns');
        ColManager.unhideCols(columns, tableId, {"autoResize": true});
    });
}

function unnest($jsonTd, isArray) {
    var text = $jsonTd.find("div").eq(0).text();
    if (isArray) {
        text = text.split(', ');
        text = JSON.stringify(text);
    }
    var jsonString;

    try {
        jsonString = jQuery.parseJSON(text);
    } catch (error) {
        console.error(error, text);
        return;
    }

    var colNum = xcHelper.parseColNum($jsonTd);
    var tableId  = $jsonTd.closest('table').data('id');

    var arrayOfKeys = [];
    for (var key in jsonString) {
        arrayOfKeys.push(key);
    }
    var numKeys = arrayOfKeys.length;
    var pullColOptions = {
        "isDataTd" : false,
        "isArray"  : isArray,
        "noAnimate": true
    };

    // loop backwards because of how new columns are appended
    for (var i = numKeys - 1; i >= 0; i--) {
        var key = arrayOfKeys[i];
        var esc = key.replace(/\./g, "\\\.");
        var nameInfo;

        if (isArray) {
            nameInfo = {name: "[" + key + "]", escapedName: "[" + esc + "]"};
        } else {
            nameInfo = {name: key, escapedName: esc};
        }

        ColManager.pullCol(colNum, tableId, nameInfo, pullColOptions);
    }
}

function copyToClipboard(valArray) {
    var $hiddenInput = $("<input>");
    var str = valArray.join(", ");

    $("body").append($hiddenInput);
    $hiddenInput.val(str).select();
    document.execCommand("copy");
    $hiddenInput.remove();
}

function closeMenu($menu) {
    $menu.hide();
    $('body').removeClass('noSelection');
}

function functionBarEnter($colInput) {
    if (!$colInput) {
        return;
    }
    gFnBarOrigin = $colInput;

    var $fnBar = $("#fnBar").removeClass("inFocus");

    var $table   = $colInput.closest('.dataTable');
    var tableId  = xcHelper.parseTableId($table);
    var colNum   = xcHelper.parseColNum($colInput);
    var table    = xcHelper.getTableFromId(tableId);
    var tableCol = table.tableCols[colNum - 1];
    var colName  = tableCol.name;

    if (tableCol.isNewCol && colName === "") {
        // when it's new column and do not give name yet
        var text = "Column name is not confirmed yet, " +
                "please fill in the column name and press enter to confirm";
        StatusBox.show(text, $colInput);
        return;
    }

    var newFuncStr = '"' + colName + '" ' + $fnBar.val().trim();
    var oldUsrStr  = tableCol.userStr;

    $colInput.blur();
    // when usrStr not change
    if (newFuncStr === oldUsrStr) {
        return;
    }

    $colInput.closest('th').removeClass('unusedCell');
    $table.find('td:nth-child(' + colNum + ')').removeClass('unusedCell');

    var progCol = parseFunc(newFuncStr, colNum, table, true);
    // add sql
    SQL.add("Pull Column", {
        "operation": "pullCol",
        "tableName": table.tableName,
        "colName"  : progCol.name,
        "colIndex" : progCol.index
    });

    ColManager.execCol(progCol, tableId)
    .then(function() {
        updateTableHeader(tableId);
        RightSideBar.updateTableInfo(tableId);
        commitToStorage();
    });
}

function parseFunc(funcString, colNum, table, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open   = funcString.indexOf("\"");
    var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
    var name   = funcString.substring(open + 1, close);
    var funcSt = funcString.substring(funcString.indexOf("=") + 1);
    var progCol;

    if (modifyCol) {
        progCol = table.tableCols[colNum - 1];
    } else {
        progCol = ColManager.newCol();
    }

    progCol.name = name;
    progCol.func = cleanseFunc(funcSt, name);
    progCol.index = colNum;
    progCol.userStr = '"' + progCol.func.args[0] + '" =' + funcSt;

    return (progCol);
}

function cleanseFunc(funcString, name) {
    // funcString should be: function(args)
    var open     = funcString.indexOf("(");
    var close    = funcString.lastIndexOf(")");
    var funcName = jQuery.trim(funcString.substring(0, open));
    var args     = (funcString.substring(open + 1, close)).split(",");

    if (funcName === "map") {
        args = [name];
    } else {
        for (var i = 0; i < args.length; i++) {
            args[i] = jQuery.trim(args[i]);
        }
    }

    return ({func: funcName, args: args});
}

function dropdownClick($el, options) {
    options = options || {};

    if (!options.type) {
        console.error("Wrong dropdownClick call");
        return;
    }

    var tableId = xcHelper.parseTableId($el.closest(".xcTableWrap"));
    var $menu;

    if (options.type === "tableDropdown") {
        $menu = $('#tableMenu-' + tableId);

        if (WSManager.getWSLen() <= 1) {
            $menu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $menu.find(".moveToWorksheet").removeClass("unavailable");
        }
    
        // case that should close table menu
        if ($menu.is(":visible")) {
            $menu.hide();
            return;
        }
    } else if (options.type === "thDropdown") {
        $menu = $('#colMenu-' + tableId);
        // case that should close column menu
        if ($menu.is(":visible") && $menu.data("colNum") === options.colNum
            && !$menu.hasClass('tdMenu')) {
            $menu.hide();
            return;
        }
        if (options.multipleColNums) {
            $menu.data('columns', options.multipleColNums);
        } else {
            $menu.data('columns', []);
        }
        // XXX Use CSS to show the options
    } else if (options.type === "tdDropdown") {
        $menu = $('#colMenu-' + tableId);
        // case that should close column menu
        if (options.isUnSelect && !options.shiftKey)
        {
            $menu.hide();
            return;
        }

        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        var columnType = gTables[tableId].tableCols[options.colNum - 1].type;
        var shouldNotFilter = options.isMutiCol ||
                            (
                                columnType !== "string" &&
                                columnType !== "decimal" &&
                                columnType !== "integer" &&
                                columnType !== "boolean"
                            );
        var isMultiCell = $("#xcTable-" + tableId).find(".highlightBox").length > 1;

        var $tdFilter  = $menu.find(".tdFilter");
        var $tdExclude = $menu.find(".tdExclude");

        if (shouldNotFilter) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
        }

        if (isMultiCell) {
            $tdFilter.text('Filter these values');
            $tdExclude.text('Exclude these values');
        } else {
            $tdFilter.text('Filter this value');
            $tdExclude.text('Exclude this value');
        }

        if (columnType === "object" || columnType === "array") {
            if ($el.text().trim() === "") {
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else if (isMultiCell){
                // when more than one cell is selected
                $menu.find(".tdJsonModal").addClass("hidden");
                $menu.find(".tdUnnest").addClass("hidden");
            } else {
                $menu.find(".tdJsonModal").removeClass("hidden");
                $menu.find(".tdUnnest").removeClass("hidden");
            }
        } else {
            $menu.find(".tdJsonModal").addClass("hidden");
            $menu.find(".tdUnnest").addClass("hidden");
        }
    }

    $(".colMenu:visible").hide();
    $(".leftColMenu").removeClass("leftColMenu");
    // case that should open the menu (note that colNum = 0 may make it false!)
    if (options.colNum != null && options.colNum > -1) {
        $menu.data("colNum", options.colNum);
    } else {
        $menu.removeData("colNum");
    }

    if (options.rowNum != null && options.rowNum > -1) {
        $menu.data("rowNum", options.rowNum);
    } else {
        $menu.removeData("rowNum");
    }

    if (options.classes != null) {
        var className = options.classes.replace("header", "");
        $menu.attr("class", "colMenu " + className);
    }

    if (options.type === 'thDropdown') {
        $menu.find('.sort .sort').removeClass('unavailable');
    }
    
    //position menu
    var topMargin  = options.type === "tdDropdown" ? 15 : -4;
    var leftMargin = 5;

    var left;
    var top;
    if (options.mouseCoors) {
        left = options.mouseCoors.x - 5;
        top = options.mouseCoors.y + topMargin;
    } else {
        top = $el[0].getBoundingClientRect().bottom + topMargin;
        left = $el[0].getBoundingClientRect().left + leftMargin;
    }

    $menu.css({"top": top, "left": left}).show();

    $menu.closest('.xcTheadWrap').css('z-index', '10');


    //positioning if dropdown menu is on the right side of screen
    var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
    if ($menu[0].getBoundingClientRect().right > leftBoundary) {
        left = $el[0].getBoundingClientRect().right - $menu.width();
        $menu.css('left', left).addClass('leftColMenu');
    }

    $menu.find('.subColMenu').each(function() {
        if ($(this)[0].getBoundingClientRect().right > leftBoundary) {
            $menu.find('.subColMenu').addClass('leftColMenu');
        }
    });

    $('body').addClass('noSelection');
}

function resetColMenuInputs($el) {
    var tableId = xcHelper.parseTableId($el.closest('.xcTableWrap'));
    var $menu = $('#colMenu-' + tableId);
    $menu.find('.gb input').val("groupBy");
    $menu.find('.numFilter input').val(0);
    $menu.find('.strFilter input').val("");
    $menu.find('.mixedFilter input').val("");
    $menu.find('.regex').next().find('input').val("*");
}

function highlightColumn($el, keepOthersSelected) {
    var index    = xcHelper.parseColNum($el);
    var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
    var $table = $('#xcTable-' + tableId);
    if (!keepOthersSelected) {
        $('.selectedCell').removeClass('selectedCell');
    }
    $table.find('th.col' + index).addClass('selectedCell');
    $table.find('td.col' + index).addClass('selectedCell');
}

function unhighlightColumn($el) {
    var index    = xcHelper.parseColNum($el);
    var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
    var $table = $('#xcTable-' + tableId);
    $table.find('th.col' + index).removeClass('selectedCell');
    $table.find('td.col' + index).removeClass('selectedCell');
}

function addRowListeners(newCells) {
    newCells.find('.jsonElement').dblclick(function() {
            JSONModal.show($(this));
        }
    );
    
    newCells.find('.rowGrab').mousedown(function(event) {
        if (event.which === 1) {
            gResrowMouseDown($(this), event);
        }     
    });

    newCells.find('.idSpan').click(function() {
        var tableId = xcHelper.parseTableId($(this).closest('table'));
        var rowNum = parseInt($(this).closest('tr').attr('class').substring(3));
        if (xcHelper.getTableFromId(tableId).bookmarks.indexOf(rowNum) < 0) {
            bookmarkRow(rowNum, tableId);
        } else {
            unbookmarkRow(rowNum, tableId);
        }
    });
}

function adjustRowHeights(newCells, rowIndex, tableId) {
    var rowObj = xcHelper.getTableFromId(tableId).rowHeights;
    var numRows = newCells.length;
    var pageNum = Math.floor(rowIndex / gNumEntriesPerPage);
    var lastPageNum = pageNum + Math.ceil(numRows / gNumEntriesPerPage);
    var padding = 4;
    var $row;

    for (var i = pageNum; i < lastPageNum; i++) {
        if (rowObj[i]) {
            for (var row in rowObj[i]) {
                $row = newCells.filter(function() {
                    return ($(this).hasClass('row' + (row - 1)));
                });
                $firstTd = $row.find('td.col0');
                $firstTd.outerHeight(rowObj[i][row]);
                $row.find('td > div')
                    .css('max-height', rowObj[i][row] - padding);
                $firstTd.children('div').css('max-height', rowObj[i][row]);
                $row.addClass('changedHeight');
            }
        }
    }
}

function addTableListeners(tableId) {
    var $xcTableWrap = $('#xcTableWrap-' + tableId);

    $xcTableWrap.mousedown(function() {
        if (gActiveTableId === tableId) {
            return;
        } else {
            gActiveTableId = tableId;
            focusTable(tableId);
        }
    }).scroll(function() {
        $(this).scrollLeft(0); // prevent scrolling when colmenu is open
        $(this).scrollTop(0); // prevent scrolling when colmenu is open
    });
}

function moveTableDropdownBoxes() {
    var $startingTableHead;

    $('.xcTableWrap:not(".inActive")').each(function() {
        if ($(this)[0].getBoundingClientRect().right > 0) {
            $startingTableHead = $(this).find('.xcTheadWrap');
            return false;
        }
    });

    var tablesAreVisible;
    if ($startingTableHead && $startingTableHead.length > 0) {
        tablesAreVisible = true;
    } else {
        tablesAreVisible = false;
    }
    
    var rightSideBarWidth = 10;
    var windowWidth = $(window).width();
    if (windowWidth === $('#container').width()) {
        windowWidth -= rightSideBarWidth;
    }
    while (tablesAreVisible) {
        var tableRight = $startingTableHead[0].getBoundingClientRect().right;
        if (tableRight > windowWidth) {
            var position = tableRight - windowWidth - 3;
            $startingTableHead.find('.dropdownBox')
                                .css('right', position + 'px');
            tablesAreVisible = false;
        } else {
            $startingTableHead.find('.dropdownBox').css('right', -3 + 'px');
            $startingTableHead = $startingTableHead.closest('.xcTableWrap')
                                                   .next()
                                                   .find('.xcTheadWrap');
            if ($startingTableHead.length < 1) {
                tablesAreVisible = false;
            }
        }
    }
}

function moveTableTitles() {
    if (isBrowserMicrosoft) {
        return;
    }

    var viewWidth = $('#mainFrame').width();
    $('.xcTableWrap:not(.inActive):not(.tableHidden)').each(function() {
        var $table = $(this);
        var $thead = $table.find('.xcTheadWrap');
        if ($thead.length === 0) {
            return null;
        }
        if ($table.hasClass('tableDragging')) {
            return null;
        }

        var rect = $thead[0].getBoundingClientRect();
        if (rect.right > 0) {
            if (rect.left < viewWidth) {
                var $tableTitle = $table.find('.tableTitle .text');
                var titleWidth = $tableTitle.outerWidth();
                var tableWidth = $thead.width();
                var center;
                if (rect.left < 0) {
                    // left side of table is offscreen to the left
                    if (rect.right > viewWidth) { // table spans the whole screen
                        center = -rect.left + ((viewWidth - titleWidth) / 2);
                    } else { // right side of table is visible
                        center = tableWidth - ((rect.right + titleWidth) / 2);
                        center = Math.min(center, tableWidth - titleWidth - 6);
                    }
                } else { // the left side of the table is visible
                    if (rect.right < viewWidth) {
                        // the right side of the table is visible
                        center = (tableWidth - titleWidth) / 2;
                    } else { // the right side of the table isn't visible
                        center = (viewWidth - rect.left - titleWidth) / 2;
                        center = Math.max(10, center);
                    }
                }
                center = Math.floor(center);
                $tableTitle.css('left', center);
            } else {
                return false;
            }
        }
    });
}

function moveTableTitlesAnimated(tableId, oldWidth, widthChange, speed) {
    if (isBrowserMicrosoft) {
        return;
    }
    var duration = speed || 250;
    var viewWidth = $('#mainFrame').width();
    var $table = $('#xcTableWrap-' + tableId);
    var $thead = $table.find('.xcTheadWrap');
    var rect = $thead[0].getBoundingClientRect();
    var right = rect.right - widthChange;

    if (right > 0 && rect.left < viewWidth) {
        var $tableTitle = $table.find('.tableTitle .text');
        var titleWidth = $tableTitle.outerWidth();
        var tableWidth = oldWidth - widthChange - 5;
        var center;
        if (rect.left < 0) {
            // left side of table is offscreen to the left
            if (right > viewWidth) { // table spans the whole screen
                center = -rect.left + ((viewWidth - titleWidth) / 2);
            } else { // right side of table is visible
                center = tableWidth - ((right + titleWidth) / 2);
                center = Math.min(center, tableWidth - titleWidth - 6);
            }
        } else { // the left side of the table is visible
            if (right < viewWidth) {
                // the right side of the table is visible
                center = (tableWidth - titleWidth) / 2;
            } else { // the right side of the table isn't visible
                center = (viewWidth - rect.left - titleWidth) / 2;
                center = Math.max(10, center);
            }
        }
        center = Math.floor(center);
        $tableTitle.animate({left: center}, duration, "linear");
    }
}

function focusTable(tableId) {
    if (WSManager.getWSFromTable(tableId) !== WSManager.getActiveWS())
    {
        console.warn("Table not in current worksheet");
        return;
    }

    $('#mainFrame').find('.tableTitle').removeClass('tblTitleSelected');
    var $xcTheadWrap = $('#xcTheadWrap-' + tableId);
    $xcTheadWrap.find('.tableTitle').addClass('tblTitleSelected');
    gActiveTableId = tableId;
    RowScroller.update(tableId);

    if (xcHelper.getTableFromId(tableId).resultSetCount === 0) {
        $('#rowInput').val(0).data('val', 0);
    } else {
        generateFirstVisibleRowNum();
    }

    Tips.refresh();
}

function checkTableDraggable() {
    // disallow dragging if only 1 table in worksheet
    var activeWS = WSManager.getActiveWS();
    var $tables = $('#mainFrame').find('.xcTableWrap.worksheet-' + activeWS);
    if ($tables.length === 1) {
        $tables.addClass('noDrag');
    } else {
        $tables.removeClass('noDrag');
    }
}

function isTableScrollable(tableId) {
    var tHeadHeight = $('#xcTheadWrap-' + tableId).height();
    var tBodyHeight = $('#xcTable-' + tableId).height();
    var tableWrapHeight = $('#xcTableWrap-' + tableId).height();

    return ((tHeadHeight + tBodyHeight) >= (tableWrapHeight));
}

function bookmarkRow(rowNum, tableId) {
    //XXX allow user to select color in future?
    var $table = $('#xcTable-' + tableId);
    var td = $table.find('.row' + rowNum + ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('title', 'bookmarked');
    RowScroller.addBookMark(rowNum, tableId);
    var table = xcHelper.getTableFromId(tableId);
    if (table.bookmarks.indexOf(rowNum) < 0) {
        table.bookmarks.push(rowNum);
    }
}

function unbookmarkRow(rowNum, tableId) {
    var $table = $('#xcTable-' + tableId);
    var td = $table.find('.row' + rowNum + ' .col0');
    td.removeClass('rowBookmarked');
    td.find('.idSpan').attr('title', '');
    RowScroller.removeBookMark(rowNum, tableId);
    var table = xcHelper.getTableFromId(tableId);
    var index = table.bookmarks.indexOf(rowNum);
    table.bookmarks.splice(index, 1);
}

function parseBookmarkNum(el) {
    var classNames = el.attr('class');
    var index = classNames.indexOf('bkmkRow') + 'bkmkRow'.length;
    return parseInt(classNames.substring(index)) + 1;
}

function dragTableMouseDown(el, e) {
    var dragObj = gDragObj;
    gMouseStatus = "movingTable";
    dragObj.mouseX = e.pageX;
    dragObj.$table = el.closest('.xcTableWrap');
    var $activeTables = $('.xcTableWrap:not(.inActive)');
    var tableIndex = $activeTables.index(dragObj.$table);
    dragObj.$activeTables = $activeTables;
    dragObj.tableIndex = tableIndex;
    dragObj.tableId = xcHelper.parseTableId(dragObj.$table);
    dragObj.originalIndex = dragObj.tableIndex;
    dragObj.mainFrame = $('#mainFrame');
    var rect = dragObj.$table[0].getBoundingClientRect();

    dragObj.offsetLeft = dragObj.$table.offset().left;
    dragObj.prevTable = dragObj.$table.prev();
    dragObj.mouseOffset = dragObj.mouseX - rect.left;
    dragObj.docHeight = $(document).height();
    dragObj.tableScrollTop = dragObj.$table.scrollTop();

    var cursorStyle =
        '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}' +
            '.tooltip{display: none !important;}' +
        '</style>';

    $(document.head).append(cursorStyle);
    createShadowTable();
    sizeTableForDragging();
    dragObj.$table.addClass('tableDragging');
    dragObj.$table.css('left', dragObj.offsetLeft + 'px');
    dragObj.windowWidth = $(window).width();
    dragObj.pageX = e.pageX;
    dragObj.$table.scrollTop(dragObj.tableScrollTop);
    createTableDropTargets();
    dragdropMoveMainFrame(dragObj, 50);
    disableTextSelection();
}
    
function dragTableMouseMove(e) {
    var dragObj = gDragObj;
    var left =  e.pageX - dragObj.mouseOffset;
    dragObj.$table.css('left', left + 'px');
    dragObj.pageX = e.pageX;
}

function dragTableMouseUp() {
    var dragObj = gDragObj;

    gMouseStatus = null;
    dragObj.$table.removeClass('tableDragging').css({
        'left'  : '0px',
        'height': '100%'
    });
    $('#shadowTable, #moveCursor, #dropTargets').remove();
    $('#mainFrame').off('scroll', mainFrameScrollTableTargets);
    dragObj.$table.scrollTop(dragObj.tableScrollTop);
    gActiveTableId = dragObj.tableId;
    reenableTextSelection();

    if (dragObj.tableIndex !== dragObj.originalIndex) {
        // reorder only if order changed
        reorderAfterTableDrop(gDragObj.tableId, gDragObj.originalIndex,
                                gDragObj.tableIndex);
    }
    moveTableDropdownBoxes();
    moveFirstColumn();
    moveTableTitles();
}

function createShadowTable() {
    var $mainFrame = $('#mainFrame');
    var width = gDragObj.$table.children().width();
    var tableHeight = gDragObj.$table.find('.xcTheadWrap').height() +
                      gDragObj.$table.find('.xcTbodyWrap').height();
    var mainFrameHeight = $mainFrame.height();
    if ($mainFrame[0].scrollWidth > $mainFrame.width()) {
        mainFrameHeight -= 11;
    }
    var shadowHeight = Math.min(mainFrameHeight, tableHeight + 5);
    
    var shadowTable = '<div id="shadowTable" ' +
                'style="width:' + width + 'px;height:' +
                shadowHeight + 'px;">' +
            '</div>';

    if (gDragObj.prevTable.length > 0) {
        gDragObj.prevTable.after(shadowTable );
    } else {
        $('#mainFrame').prepend(shadowTable);
    }
}

function createTableDropTargets() {
    var offset = gDragObj.mouseX - gDragObj.offsetLeft;
    var dragMargin = 10;
    var tableLeft;
    var $mainFrame = gDragObj.mainFrame;
    var dropTargets = "";
    var tableWidth = gDragObj.$table.width();

    gDragObj.$activeTables.each(function(i) {
        if (i === gDragObj.tableIndex) {
            return true;  
        }

        var targetWidth;
        if ((tableWidth - dragMargin) < Math.round(0.5 * $(this).outerWidth()))
        {
            targetWidth = tableWidth;
        } else {
            targetWidth = Math.round(0.5 * $(this).outerWidth()) +
                            dragMargin;
        }

        tableLeft = $(this).position().left + $mainFrame.scrollLeft();
        dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                        'style="left:' + (tableLeft - dragMargin + offset) +
                        'px;' + 'width:' + targetWidth + 'px;height:' +
                        (gDragObj.docHeight) + 'px;">' +
                            i +
                        '</div>';
    });

    tableLeft = -$mainFrame.scrollLeft();
    $('body').append('<div id="dropTargets" style="left:' +
                        tableLeft + 'px;"></div>');
    $('#dropTargets').append(dropTargets);
    $('.dropTarget').mouseenter(function() {
        dragdropSwapTables($(this));
    });
    $mainFrame.scroll(mainFrameScrollTableTargets);
}

function moveTableDropTargets(dropTargetIndex, oldIndex, swappedTable) {
    var offset = gDragObj.mouseX - gDragObj.offsetLeft;
    var dragMargin = 10;
    var $mainFrame = gDragObj.mainFrame;
    var tableLeft = swappedTable.position().left + $mainFrame.scrollLeft();
    $('#dropTarget' + dropTargetIndex).attr('id', 'dropTarget' + oldIndex);
    $('#dropTarget' + oldIndex).css({
        'left': (tableLeft - dragMargin + offset) + 'px'});
}

function mainFrameScrollTableTargets() {
    var left = gDragObj.mainFrame.scrollLeft();
    $("#dropTargets").css('left', '-' + left + 'px');
}

function dragdropSwapTables(el) {
    var dropTargetIndex = parseInt((el.attr('id')).substring(10));
    var $activeTables = $('.xcTableWrap:not(.inActive)');
    var $table = $activeTables.eq(dropTargetIndex);

    if (dropTargetIndex > gDragObj.tableIndex) {
        $table.after($('#shadowTable'));
        $table.after(gDragObj.$table);
    } else {
        $table.before($('#shadowTable'));
        $table.before(gDragObj.$table);
    }

    gDragObj.$table.scrollTop(gDragObj.tableScrollTop);
    
    var oldIndex = gDragObj.tableIndex;
    gDragObj.tableIndex = dropTargetIndex;
    moveTableDropTargets(dropTargetIndex, oldIndex, $table);
}

function sizeTableForDragging() {
    var tableHeight = $('#shadowTable').height();
    gDragObj.$table.height(tableHeight);
}

function reorderAfterTableDrop(tableId, srcIndex, desIndex) {
    WSManager.reorderTable(tableId, srcIndex, desIndex);

    var newIndex = WSManager.getTablePosition(tableId);

    var $dagWrap = $('#dagWrap-' + tableId);
    var $dagWraps = $('.dagWrap:not(.tableToRemove)');

    if (newIndex === 0) {
        $('.dagArea').find('.legendArea').after($dagWrap);
    } else if (srcIndex < desIndex) {
        $dagWraps.eq(newIndex).after($dagWrap);
    } else if (srcIndex > desIndex) {
        $dagWraps.eq(newIndex).before($dagWrap);
    }

    SQL.add("Change Table Order", {
        "operation": "reorderTable",
        "tableId"  : tableId,
        "tableName": gTables[tableId].tableName,
        "srcIndex" : srcIndex,
        "desIndex" : desIndex
    });
}

function moveFirstColumn($targetTable) {
    var rightOffset;
    var datasetPreview;
    if (isBrowserMicrosoft) {
        return;
    }

    if (!$targetTable) {
        datasetPreview = false;
        $('.xcTableWrap:not(".inActive")').each(function() {
            rightOffset = $(this)[0].getBoundingClientRect().right;
            if (rightOffset > 0) {
                $targetTable = $(this);
                return false;
            }
        });
    } else {
        datasetPreview = true;
    }
    
    if ($targetTable && $targetTable.length > 0) {
        var $idCol =  $targetTable.find('.idSpan');
        var cellWidth = $idCol.width();
        var scrollLeft;

        if (datasetPreview) {
            scrollLeft = -($targetTable.offset().left -
                              $('#datasetWrap').offset().left);
        } else {
            scrollLeft = -$targetTable.offset().left;
        }
        
        var rightDiff = rightOffset - (cellWidth + 15);
        if (rightDiff < 0) {
            scrollLeft += rightDiff;
        }
        scrollLeft = Math.max(0, scrollLeft);
        $idCol.css('left', scrollLeft);
        $targetTable.find('th.rowNumHead > div').css('left', scrollLeft);
        if (!datasetPreview) {
            var adjustNext = true;
            while (adjustNext) {
                $targetTable = $targetTable.next();
                if ($targetTable.length === 0) {
                    return;
                }
                rightOffset = $targetTable[0].getBoundingClientRect().right;
                if (rightOffset > $(window).width()) {
                    adjustNext = false;
                }
                $targetTable.find('.idSpan').css('left', 0);
                $targetTable.find('th.rowNumHead > div').css('left', 0);
            }
        }
    }
}


function showWaitCursor() {
    var waitCursor = '<style id="waitCursor" type="text/css">' +
                        '*{cursor: wait !important;}' +
                    '</style>';
    $(document.head).append(waitCursor);
}

function removeWaitCursor() {
    $('#waitCursor').remove();
}

function centerPositionElement($target) {
    // to position elements in the center of the window i.e. for modals
    var $window = $(window);

    var winHeight   = $window.height();
    var winWidth    = $window.width();
    var modalWidth  = $target.width();
    var modalHeight = $target.height();

    var left = ((winWidth - modalWidth) / 2);
    var top  = ((winHeight - modalHeight) / 2);

    $target.css({
        "left": left,
        "top" : top
    });
}

window.RowScroller = (function($, RowScroller) {
    var $rowInput = $("#rowInput");
    var $rowScrollerArea = $("#rowScrollerArea");

    RowScroller.setup = function() {
        $rowScrollerArea.mousedown(function(event) {
            if (event.which !== 1 || $(".rowScroller").length === 0) {
                return;
            }
            if (!gActiveTableId) {
                return;
            }
            if ($(event.target).hasClass("subRowMarker")) {
                rowScrollerStartDrag(event, $(event.target).parent());
                return;
            }
            
            var tableId = gActiveTableId;
            var $rowScroller = $('#rowScroller-' + tableId);
            if ($rowScroller.hasClass('locked')) {
                return;
            }
            var table = xcHelper.getTableFromId(tableId);
            
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

            if (!table) {
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
                    RowScroller.move(1, maxCount);
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
            // divide evenly on both top and bottom buffer
            var rowToBuffer = Math.floor((gMaxEntriesPerPage - rowOnScreen) / 2);

            targetRow = Math.max(1, targetRow);
            targetRow = Math.min(targetRow, maxCount);

            $rowInput.data("val", targetRow).val(targetRow);

            backRow = Math.min(maxRow - gMaxEntriesPerPage,
                                targetRow - rowToBuffer);
            backRow = Math.max(backRow, 0);

            var tableName = table.tableName;
            var numRowsToAdd = Math.min(gMaxEntriesPerPage, maxRow);
            var info = {
                "numRowsToAdd"    : numRowsToAdd,
                "numRowsAdded"    : 0,
                "lastRowToDisplay": backRow + numRowsToAdd,
                "targetRow"       : targetRow,
                "bulk"            : true,
                "tableName"       : tableName,
                "tableId"         : tableId
            };

            goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
            .then(function() {
                var rowToScrollTo = Math.min(targetRow, maxRow);
                positionScrollbar(rowToScrollTo, tableId);
                generateFirstVisibleRowNum();
                if (!event.rowScrollerMousedown) {
                    RowScroller.move($rowInput.val(), maxCount);
                } else {
                    $rowScrollerArea.addClass("autoScroll");
                }
            });
        });
    };

    RowScroller.add = function(tableId) {
        var rowScrollerHTML =
            '<div id="rowScroller-' + tableId +
            '" class="rowScroller" data-id="' + tableId + '" ' +
            'data-toggle="tooltip" ' +
                'data-container="body" ' +
                'data-placement="bottom" title="scroll to a row">' +
                '<div id="rowMarker-' + tableId + '" class="rowMarker" ' +
                'data-id="' + tableId + '">' +
                    '<div class="subRowMarker top"></div>' +
                    '<div class="subRowMarker middle"></div>' +
                    '<div class="subRowMarker bottom"></div>' +
                '</div>' +
            '</div>';

        $rowScrollerArea.append(rowScrollerHTML);

        var rows = xcHelper.getTableFromId(tableId).bookmarks;
        for (var i = 0, numRows = rows.length; i < numRows; i++) {
            RowScroller.addBookMark(rows[i], tableId);
        }

        if ($(".xcTable").length > 1) {
            $(".rowScroller").last().hide();
        }
    };

    RowScroller.move = function (rowNum, resultSetCount) {
        var pct = 100 * ((rowNum - 1) / (resultSetCount - 1));
        var $rowMarker = $('#rowMarker-' + gActiveTableId);
        $rowMarker.css("transform", "translate3d(" + pct + "%, 0px, 0px)");
    };

    RowScroller.update = function(tableId) {
        var $numPages = $("#numPages");
        var table = xcHelper.getTableFromId(gActiveTableId);
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
        var table = xcHelper.getTableFromId(tableId);
        var leftPos = 100 * (rowNum / table.resultSetCount);
        var bookmark =
            '<div class="bookmark bkmkRow' + rowNum + '"' +
                ' style="left:' + leftPos + '%;" data-toggle="tooltip" ' +
                ' data-placement="bottom" data-container="body" title="row ' +
                (rowNum + 1) + '">' +
            '</div>';
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
        var table = xcHelper.getTableFromId(gActiveTableId);
        var resultSetCount   = table.resultSetCount;
        var resultTextLength = ("" + resultSetCount).length;

        if (resultTextLength > $rowInput.attr('size')) {
            $rowInput.attr({
                'maxLength': resultTextLength,
                'size'     : resultTextLength
            });
        }
    };

    // mouse event for row scroller
    RowScroller.mouseMove = function(event) {
        var mouseX = event.pageX;
        var translate;

        if (mouseX - gResrow.totalOffset < gResrow.boundary.lower) {
            translate = 0;
        } else if (mouseX - gResrow.totalOffset > gResrow.boundary.upper ) {
            translate = 100;
        } else {
            translate = 100 * (mouseX - gResrow.scrollAreaOffset -
                        gResrow.totalOffset) / (gResrow.rowScrollerWidth - 1);
        }

        gResrow.el.css('transform', 'translate3d(' + translate + '%, 0px, 0px)');
    };

    RowScroller.mouseUp = function() {
        gMouseStatus = null;
        gResrow.el.removeClass('scrolling');
        $('#moveCursor').remove();
        reenableTextSelection();
        var e = $.Event("mousedown");
        e.which = 1;
        e.pageX = (gResrow.el.offset().left - parseInt(gResrow.el.css('left')) + 0.5);
        if (e.pageX + 3 >= gResrow.rowScrollerWidth + gResrow.scrollAreaOffset) {
            e.pageX += 3;
        } else if (e.pageX - 2 <= gResrow.scrollAreaOffset) {
            e.pageX -= 2;
        }
        $rowScrollerArea.trigger(e);
    };

    function showRowScroller(tableId) {
        $(".rowScroller").hide();
        if (tableId != null) {
            var $rowScroller = $('#rowScroller-' + tableId);
            $rowScroller.show();
        }
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
        gResrow.el = el;
        gResrow.mouseStart = event.pageX;
        gResrow.scrollAreaOffset = el.parent().offset().left;
        gResrow.rowScrollerWidth = el.parent().width();
        var mouseOffset = gResrow.mouseStart - el.offset().left;
        var cssLeft = parseInt(el.css('left'));
        gResrow.totalOffset = mouseOffset + cssLeft;
        gResrow.boundary = {
            "lower": gResrow.scrollAreaOffset,
            "upper": gResrow.scrollAreaOffset + gResrow.rowScrollerWidth
        };

        var cursorStyle =
            '<style id="moveCursor" type="text/css">*' +
                '{cursor:pointer !important}' +
                '.tooltip{display: none !important;}' +
            '</style>';

        $(document.head).append(cursorStyle);
        disableTextSelection();
    }


    return (RowScroller);
}(jQuery, {}));
