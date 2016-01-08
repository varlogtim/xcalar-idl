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
                RowScroller.move(firstRowNum, gTables[activeTableId].resultSetCount);
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
        var table = gTables[gRescol.tableId];
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
    var rowObj = gTables[gResrow.tableId].rowHeights;
    // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
    var pageNum = Math.floor((rowNum - 1) / gNumEntriesPerPage);
    gMouseStatus = null;
    $('#row-resizeCursor').remove();
    reenableTextSelection();
    $('body').removeClass('hideScroll');
    var $table = $('#xcTable-' + gResrow.tableId);
    $table.find('tr').removeClass('notDragging dragging');
    if (gTables[gActiveTableId].resultSetCount !== 0) {
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
    if (gTables[dragObj.tableId].tableCols.length > 50) {
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
    var $fauxTable = $('#fauxTable');
    
    var rowHeight = 30;
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

    // HACK: weird hack hide show or else .header won't reposition itself
    dragObj.$table.find('.header').css('height', '39px');
    setTimeout(function() {
        dragObj.$table.find('.header').css('height', '40px');
    }, 0);
    
    var left = dragObj.element.position().left;
    $('#shadowDiv').css('left', left);
    dragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function getTextWidth(el, val) {
    var width;
    var text;
    if (val === undefined) {
        if (el.is('input')) {
            text = $.trim(el.val() + " ");
        } else {
            text = $.trim(el.text());
        }
    } else {
        text = val;
    }
    text = text.replace(/\</g, "&lt;").replace(/\>/g, "&gt;");
    
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
    var table = gTables[tableId];

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

    // var tableName = "";
    // build this table title somewhere else
    // var table = gTables[tableId];
    // if (table != null) {
    //     tableName = table.tableName;
    // }
    var tableTitleClass = "";
    if ($('.xcTable:visible').length === 1) {
        tableTitleClass = " tblTitleSelected";
    }

    var html = '<div class="tableTitle ' + tableTitleClass + '">' +
                    '<div class="tableGrab"></div>' +
                    '<label class="text" ></label>' +
                    '<div class="dropdownBox">' +
                        '<span class="innerBox"></span>' +
                    '</div>' +
                '</div>';

    $xcTheadWrap.prepend(html);

    //  title's Format is tablename  [cols]
    updateTableHeader(tableId);

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
        "keydown": function(event) {
            if (event.which === keyCode.Space) {
                // XXX temporary do not allow space
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }, ".tableTitle .text");

    $xcTheadWrap.on({
        "focus": function() {
            var val = $(this).val();
            var width = getTextWidth($(this), val);
            $(this).width(width + 1); 
            $(this)[0].setSelectionRange(val.length, val.length);
            moveTableTitles();
        },
        "blur": function() {
            updateTableHeader(null, $(this).parent());
            moveTableTitles();
        },
        "input": function() {
            var width = getTextWidth($(this), $(this).val());
            $(this).width(width + 1);
            moveTableTitles($(this).closest('.xcTableWrap'));
        }
    }, ".tableTitle .tableName");

    $xcTheadWrap[0].oncontextmenu = function(e) {
        var $target = $(e.target).closest('.dropdownBox');
        if ($target.length) {
            $target.trigger('click');
            e.preventDefault();
        }
    };

    $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function() {
        var classes   = "tableMenu";
        var $dropdown = $(this);
        var $tableWrap = $dropdown.closest('.xcTableWrap');

        if ($tableWrap.hasClass('tableLocked')) {
            classes += " locked";
        }

        if ($tableWrap.hasClass('tableHidden')) {
            classes += " tableHidden";
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

function addTableMenuActions() {
    var $tableMenu = $('#tableMenu');
    var $subMenu = $('#tableSubMenu');
    var $allMenus = $tableMenu.add($subMenu);
    var tableId;
    $tableMenu.on('mouseup', '.archiveTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
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

        tableId = $tableMenu.data('tableId');
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
        tableId = $tableMenu.data('tableId');
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
        tableId = $tableMenu.data('tableId');
        var tableName = gTables[tableId].tableName;

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
        tableId = $tableMenu.data('tableId');
        ExportModal.show(tableId);
    });

    $tableMenu.on('mouseup', '.copyColNames', function(event) {
        function getAllColNames(tableId) {
            var colNames = [];
            $.each(gTables[tableId].tableCols, function() {
                    if (this.name !== "DATA") {
                        colNames.push(this.name)
                    }
            });
            return colNames;
        }

        wsId = WSManager.getActiveWS()
        var allColNames = [];
        $.each(WSManager.getWorksheets()[wsId].tables, function() {
            var tableColNames = getAllColNames(this);
            for (var i = 0; i < tableColNames.length; i++) {
                var value = tableColNames[i];
                if (allColNames.indexOf(value) == -1) {
                    allColNames.push(value);
                }
            }
        });
        copyToClipboard(allColNames, true);
    });

    $tableMenu.on('mouseup', '.delAllDuplicateCols', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        ColManager.delAllDupCols(tableId);
    });

    $tableMenu.on('mouseup', '.multiCast', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        MultiCastModal.show(tableId);
    });

    $subMenu.on('mouseup', '.aggregates', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        AggModal.show(tableId, 'aggregates');
    });

    $subMenu.on('mouseup', '.correlation', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        AggModal.show(tableId, 'correlation');
    });


    // opeartion for move to worksheet and copy to worksheet
    $tableMenu.on('mouseenter', '.moveToWorksheet', function() {
        var $list = $subMenu.find(".list");
        $list.empty().append(WSManager.getWSLists(false));
    });


    $tableMenu.on('mouseenter', '.dupToWorksheet', function() {
        var $list = $(this).find(".list");
        $list.empty().append( WSManager.getWSLists(true));
    });

    xcHelper.dropdownList($subMenu.find(".dropDownList"), {
        "onSelect": function($li) {
            var $input = $li.closest(".dropDownList").find(".wsName");
            $input.val($li.text()).focus();
        }
    });

    $subMenu.on('keypress', '.moveToWorksheet input', function(event) {
        if (event.which === keyCode.Enter) {
            tableId = $tableMenu.data('tableId');
            var $input  = $(this);
            var wsName  = $input.val().trim();
            var $option = $input.siblings(".list").find("li").filter(function() {
                return ($(this).text() === wsName);
            });

            var isValid = xcHelper.validate([
                {
                    "$selector": $input
                },
                {
                    "$selector": $input,
                    "text"     : ErrorTextTStr.InvalidWSInList,
                    "check"    : function () {
                        return ($option.length === 0);
                    }
                }
            ]);

            if (!isValid) {
                return false;
            }

            var wsId = $option.data("ws");

            WSManager.moveTable(tableId, wsId);

            $input.val("");
            $input.blur();
            closeMenu($allMenus);
        }
    });

    $tableMenu.on('keypress', '.dupToWorksheet input', function(event) {
        if (event.which === keyCode.Enter) {
            var $li = $(this).closest(".dupToWorksheet");
            // there are two inputs in the sectin, so not use $(this)
            var $wsInput        = $li.find(".wsName");
            var $tableNameInput = $li.find(".tableName");
            // validation check
            var isValid = xcHelper.validate([
                { "$selector": $wsInput
                },
                { "$selector": $tableNameInput
                }
            ]);

            if (!isValid) {
                return false;
            }

            var wsName       = $wsInput.val().trim();
            var newTableName = $tableNameInput.val().trim();

            var $option = $li.find(".list li").filter(function() {
                return ($(this).text() === wsName);
            });
            // XXX also need to check table name conflict
            isValid = xcHelper.validate({
                "$selector": $wsInput,
                "text"     : ErrorTextTStr.InvalidWSInList,
                "check"    : function() {
                    return ($option.length === 0);
                }
            });

            if (!isValid) {
                return false;
            }
            tableId = $tableMenu.data('tableId');
            var table = gTables[tableId];
            var wsId = $option.data("ws");

            WSManager.copyTable(table.tableName, newTableName, wsId);

            $wsInput.val("");
            $wsInput.blur();

            $tableNameInput.val(xcHelper.randName(table.tableName, undefined,
                                                  true));
            $tableNameInput.blur();
            closeMenu($allMenus);
        }
    });

    $subMenu.on('mouseup', '.sortForward', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableId, "forward");
        }, 0);
    });

    $subMenu.on('mouseup', '.sortReverse', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $tableMenu.data('tableId');
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableId, "reverse");
        }, 0);
    });


    $subMenu.on('mouseup', '.resizeCols li', function(event) {
        if (event.which !== 1) {
            return;
        }
        var sizeToHeader = $(this).hasClass('sizeToHeader');
        var fitAll = $(this).hasClass('sizeToFitAll');
        if (fitAll) {
            sizeToHeader = true;
        }
        tableId = $tableMenu.data('tableId');
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
    var newIndex;
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

    var match;
    $table.find('th').each(function(i) {
        match = $(this).attr('class').match(/col/g);
        if (match && match.length > 1) {
            console.error('incorrect class after columns sort', $(this));
            return false;
        } else if (!$(this).hasClass('col' + i)) {
            console.error('incorrect column class order after columns sort',
                $(this));
            return false;
        }
    });

    RightSideBar.updateTableInfo(tableId);

    SQL.add("Sort Table Columns", {
        "operation": SQLOps.SortTableCols,
        "tableName": table.tableName,
        "tableId"  : tableId,
        "direction": direction
    });
}

function renameTableHead($div) {
    var newName = $div.find(".tableName").val().trim();
    var $th = $div.closest('.xcTheadWrap');
    var tableId = xcHelper.parseTableId($th);
    var newTableName = newName + "#" + tableId;
    var oldTableName = gTables[tableId].tableName;

    if (newTableName === oldTableName) {
        $div.blur();
        return;
    }

     var isValid = xcHelper.validate([
        {
            "$selector": $div.find(".tableName"),
            "text"     : ErrorTextTStr.NoSpecialChar,
            "check"    : function() {
                return xcHelper.hasSpecialChar(newName);
            }
        },
        {
            "$selector": $div.find(".tableName"),
            "text"     : ErrorTextTStr.InvalidColName,
            "check"    : function() {
                return (newName.length === 0);
            }
        }
    ]);

    if (!isValid) {
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
        var text = ErrorTextWReplaceTStr.TableConflict
                                        .replace("<name>", newName);
        StatusBox.show(text, $div, false);
    });
}

function updateTableHeader(tableId, $tHead) {
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
        $tHead.data("cols", cols);
        $tHead.data("title", fullTableName);
    }

    fullTableName = fullTableName.split("#");

    var tableName = fullTableName[0];

    if (fullTableName.length === 2) {
        tableName =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off">' +
            '<span class="hashName">#' +
                fullTableName[1] +
            '</span>';
    }

    var colsHTML = '<span class="colNumBracket" ' +
                    'data-toggle="tooltip" ' +
                    'data-placement="top" ' +
                    'data-container="body" ' +
                    'title="number of columns">' +
                    ' [' + cols + ']</span>';
    $tHead.html(tableName + colsHTML);
    var $tableName = $tHead.find('.tableName');
    var width = getTextWidth($tableName, $tableName.val());
    $tableName.width(width + 1);
}

function matchHeaderSizes($table) {
    // concurrent build table may make some $table be []
    if ($table.length === 0) {
        return;
    }

    var tableWidth = $table.width();

    moveTableDropdownBoxes();
    moveTableTitles();
    $table.find('.rowGrab').width(tableWidth);
}

function addColListeners($table, tableId) {
    var $thead = $table.find('thead tr');
    var $tbody = $table.find("tbody");
    var lastSelectedCell;

    // listeners on thead
    var $fnBar = $('#fnBar');
    $thead.on({
        "blur": function() {
            // $fnBar.removeClass('active');
        }
    }, ".editableHead");

    $thead.on({
        "mousedown": function() {
            if ($("#mainFrame").hasClass("modalOpen")) {
                // not focus when in modal
                return;
            }
            var $colInput = $(this).find('input');
            $colInput.focus();

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
        }
    }, ".flex-mid");
    
    $thead.on("mousedown", ".flexContainer, .iconHelper", function(event) {
        if ($("#mainFrame").hasClass("modalOpen")) {
            // not focus when in modal
            return;
        } else if ($(this).closest('.dataCol').length !== 0) {
            return;
        }

        if ($(this).is('.iconHelper')) {
            gFnBarOrigin = $(this).closest('.header').find('.editableHead');
        } else {
            gFnBarOrigin = $(this).find('.editableHead');
        }

        var colNum = xcHelper.parseColNum(gFnBarOrigin);
        var table = gTables[tableId];
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
        xcHelper.removeSelectionRange();
        lastSelectedCell = gFnBarOrigin;
    });
    
    $thead[0].oncontextmenu = function(e) {
        var $target = $(e.target).closest('.dropdownBox');
        if ($target.length) {
            $target.trigger('click');
            e.preventDefault();
        }
    };

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
        if (event.ctrlKey || event.shiftKey || event.metaKey) {
            if ($(event.target).is('.iconHelper')) {
                return;
            }
        }
        var headCol = $(this).parent().parent();

        dragdropMouseDown(headCol, event);
    });

    $thead.on("keydown", ".editableHead", function(event) {
        var $input = $(event.target);
        if (event.which === keyCode.Enter && !$input.prop("readonly")) {
            var colName = $input.val().trim();
            var colNum = xcHelper.parseColNum($input);

            if (colName === "" ||
                ColManager.checkColDup($input, null, tableId, false, colNum))
            {
                return false;
            }

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
    
        if (isSystemMac && event.metaKey ||
            !isSystemMac && event.ctrlKey)
        {
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
        var $el = $(event.target);
        var $td = $el.closest("td");
        var $div = $td.children('.clickable');
        if ($div.length === 0) {
            // when click sth like row marker cell, rowGrab
            return false;
        }

        var yCoor = Math.max(event.pageY, $el.offset().top + $el.height() - 10);
        var colNum = xcHelper.parseColNum($td);
        var rowNum = xcHelper.parseRowNum($td.closest("tr"));

        $(".tooltip").hide();
        resetColMenuInputs($el);

        if ($td.find(".highlightBox").length === 0) {
            // same as singleSelection()
            $(".highlightBox").remove();
            highlightCell($td, tableId, rowNum, colNum);
        }

        dropdownClick($div, {
            "type"      : "tdDropdown",
            "colNum"    : colNum,
            "rowNum"    : rowNum,
            "classes"   : "tdMenu", // specify classes to update colmenu's class attr
            "mouseCoors": {"x": event.pageX, "y": yCoor},
            "isMutiCol" : isMultiColum()
        });

        return false;
    };
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

function highlightCell($td, tableId, rowNum, colNum, isShift, options) {
    // draws a new div positioned where the cell is, intead of highlighting
    // the actual cell
    options = options || {};
    if (options.jsonModal && $td.find('.jsonModalHighlightBox').length !== 0) {
        $td.find('.jsonModalHighlightBox').data().count++;
        return;
    }

    var border = 5;
    var width = $td.outerWidth() - border;
    var height = $td.outerHeight();
    var left = $td.position().left;
    var top = $td.position().top;
    var styling = 'width:' + width + 'px;' +
                  'height:' + height + 'px;' +
                  'left:' + left + 'px;' +
                  'top:' + top + 'px;';
    var divClass;
    if (options.jsonModal) {
        divClass = "jsonModalHighlightBox";
    } else {
        divClass = "highlightBox " + tableId;
    }

    if (isShift) {
        divClass += " shiftKey";
    } else {
        // this can be used as a base cell when user press shift
        // to select multi rows
        divClass += " noShiftKey";
    }

    var $highlightBox = $('<div class="' + divClass + '" ' +
                            'style="' + styling + '" data-count="1">' +
                        '</div>');

    $highlightBox.data("rowNum", rowNum)
                 .data("colNum", colNum);

    $td.append($highlightBox);
}

function unHighlightCell($td) {
    $td.find(".highlightBox").remove();
}

function setupTableColumnsMenu() {
    generateTableDropDown();
    addMenuBehaviors($('#tableMenu'));
    addTableMenuActions();

    generateColDropDowns();
    addMenuBehaviors($('#colMenu'));
    addMenuBehaviors($('#cellMenu'));
    addColMenuActions();
}

function addMenuBehaviors($mainMenu) {
    var $subMenu;
    var $allMenus = $mainMenu;
    var subMenuId = $mainMenu.data('submenu');
    var hideTimeout;
    var showTimeout;

    if (subMenuId) {
        $subMenu = $('#' + subMenuId);
        $allMenus = $allMenus.add($subMenu);

        $subMenu.on('mousedown', '.subMenuArea', function(event) {
            if (event.which !== 1) {
                return;
            }
            closeMenu($allMenus);
        });

        $subMenu.on('mouseenter', '.subMenuArea', function() {
            var className = $(this).siblings(':visible').attr('class');
            $mainMenu.find('.' + className).addClass('selected');
            clearTimeout(hideTimeout);
        });
        
        // prevents input from closing unless you hover over a different li
        // on the main column menu
        $subMenu.find('input').on({
            "focus": function() {
                $(this).parents('li').addClass('inputSelected')
                       .parents('.subMenu').addClass('inputSelected');
            },
            "blur": function() {
                $(this).parents('li').removeClass('inputSelected')
                       .parents('.subMenu').removeClass('inputSelected');
            },
            "keyup": function() {
                var $input = $(this);
                $input.parents('li').addClass('inputSelected')
                .parents('.subMenu').addClass('inputSelected');
            }
        });

        $subMenu.on('mouseup', 'li', function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            event.stopPropagation();

            if (!$li.hasClass('unavailable') &&
                $li.closest('input').length === 0 &&
                $li.closest('.clickable').length === 0) {
                // hide li if doesnt have an input field
                closeMenu($allMenus);
                clearTimeout(showTimeout);
            }
        });

        $subMenu.on({
            "mouseenter": function() {
                $subMenu.find('li').removeClass('selected');

                var $li = $(this);
                var className = $li.parent().attr('class');
                $mainMenu.find('.' + className).addClass('selected');
                $li.addClass('selected');
                
                if (!$li.hasClass('inputSelected')) {
                    $subMenu.find('.inputSelected').removeClass('inputSelected');
                }
                clearTimeout(hideTimeout);
            },
            "mouseleave": function() {
                $subMenu.find('li').removeClass('selected');
                var $li = $(this);
                $li.find('.dropDownList').removeClass("open")
                    .find('.list').hide();
                // $li.removeClass('selected');
                $('.tooltip').remove();
            }
        }, "li");
    }

    $mainMenu.on('mouseup', 'li', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $li = $(this);
        if ($li.hasClass('parentMenu')) {
            return;
        }
        event.stopPropagation();
        
        if (!$li.hasClass('unavailable')) {
            // hide li if doesnt have a submenu or an input field
            closeMenu($allMenus);
            clearTimeout(showTimeout);
        }
    });

    $mainMenu.on({
        "mouseenter": function(event) {
            if ($mainMenu.hasClass('disableMouseEnter')) {
                $mainMenu.removeClass('disableMouseEnter');
                return;
            }
            var $li = $(this);
            $mainMenu.find('.selected').removeClass('selected');
            $mainMenu.addClass('hovering');
            $li.addClass('selected');
            var hasSubMenu = $li.hasClass('parentMenu');
            
            if (!hasSubMenu || $li.hasClass('unavailable')) {
                if ($subMenu) {
                    if (event.keyTriggered) {
                        $subMenu.hide();
                    } else {
                        hideTimeout = setTimeout(function() {
                            $subMenu.hide();
                        }, 150);
                    }
                }
                return;
            }

            clearTimeout(hideTimeout);
            var subMenuClass = $li.data('submenu');
            if (event.keyTriggered) { // mouseenter triggered by keypress
                showSubMenu($li, subMenuClass);
            } else {
                showTimeout = setTimeout(function() {
                    showSubMenu($li, subMenuClass);
                }, 150);
            }
            
        },
        "mouseleave": function() {
            if ($mainMenu.hasClass('disableMouseEnter')) {
                return;
            }
            $mainMenu.removeClass('hovering');
            $mainMenu.find('.selected').removeClass('selected');
            var $li = $(this);
            $li.children('ul').removeClass('visible');
            $('.tooltip').remove();
        }
    }, "li");

    function showSubMenu($li, subMenuClass) {
        if ($li.hasClass('selected')) {
            $subMenu.show();   
            var $targetSubMenu = $subMenu.find('.' + subMenuClass);
            var visible = false;
            if ($targetSubMenu.is(':visible')) {
                visible = true;
            }
            $subMenu.children('ul').hide();
            $subMenu.find('li').removeClass('selected');
            $targetSubMenu.show();
            if (!visible) {
                StatusBox.forceHide();
            }
            var top = $li.offset().top + 30;
            var left = $li.offset().left + 155;
            var shiftedLeft = false;

            // move submenu to left if overflowing to the right
            var viewportRight;
            var $rightSideBar = $('#rightSideBar');
            if (!$rightSideBar.hasClass('poppedOut')) {
                viewportRight = $rightSideBar.offset().left;
            } else {
                viewportRight = $(window).width();
            }
            if (left + $subMenu.width() > viewportRight) {
                $subMenu.addClass('left');
                shiftedLeft = true;
                top -= 29;
            } else {
                $subMenu.removeClass('left');
            }

            // move submenu up if overflowing to the bottom
            var viewportBottom = $(window).height();
            if (top + $subMenu.height() > viewportBottom) {
                top -= $subMenu.height();
                if (shiftedLeft) {
                    top += 29;
                }
            }

            $subMenu.css({left: left, top: top});
        }
    }

    if ($mainMenu.find('.scrollArea').length !== 0) {
        var listScroller = new xcHelper.dropdownList($mainMenu, {
            $subMenu: $subMenu,
            scrollerOnly: true
        });
    }
}

function addMenuKeyboardNavigation($menu, $subMenu) {
    $(document).on('keydown.menuNavigation', function(event) {
        listHighlight(event);
    });
    var $lis = $menu.find('li:visible:not(.unavailable)');
    var numLis = $lis.length;

    function listHighlight(event) {
        var keyCodeNum = event.which;
        var direction;
        var lateral = false;
        var enter;

        switch (keyCodeNum) {
            case (keyCode.Up):
                direction = -1;
                break;
            case (keyCode.Down):
                direction = 1;
                break;
            case (keyCode.Left):
                if ($(event.target).is('input')) {
                    if ($(event.target)[0].selectionStart !== 0) {
                        return;
                    }
                }
                lateral = true;
                break;
            case (keyCode.Right):
                if ($(event.target).is('input')) {
                    return;
                }
                lateral = true;
                break;
            case (keyCode.Enter):
                enter = true;
                break;
            case (keyCode.Escape):
            case (keyCode.Backspace):
                if ($(event.target).is('input')) {
                    return;
                }
                event.preventDefault();
                closeMenu($menu.add($subMenu));
                return;
            default:
                return; // key not supported
        }

        if (!enter) {
            event.preventDefault();
        }
       
        var $highlightedLi = $lis.filter(function() {
            return ($(this).hasClass('selected'));
        });

        var $highlightedSubLi = "";
        var $subLis;
        var numSubLis;
        if ($subMenu) {
            $subLis = $subMenu.find('li:visible');
            numSubLis = $subLis.length;
            $highlightedSubLi = $subLis.filter('.selected');
        }

        if (enter) {
            if ($highlightedSubLi.length === 1) {
                if (!$highlightedSubLi.hasClass('unavailable')) {
                    $highlightedSubLi.trigger(fakeEvent.mouseup);
                }
                return;
            } else if ($highlightedSubLi.length === 0 &&
                        $highlightedLi.length === 1) {
                if (!$highlightedLi.hasClass('unavailable')) {
                    if ($highlightedLi.hasClass('parentMenu')) {
                        // if li has submenu, treat enter key as a
                        // right keypress
                        lateral = true;
                        keyCodeNum = keyCode.Right;
                    } else {
                        $highlightedLi.trigger(fakeEvent.mouseup);
                        return;
                    }
                } else {
                    return;
                }
            }
        }

        if (!lateral) {
            var index;
            var newIndex;
            if ($subMenu && $subMenu.is(':visible')) {
                // navigate vertically through sub menu if it's open
                if ($highlightedSubLi.length) {
                    index = $subLis.index($highlightedSubLi);
                    $highlightedSubLi.removeClass('selected');
                    newIndex = (index + direction + numSubLis) % numSubLis;
                    $highlightedSubLi = $subLis.eq(newIndex);
                } else {
                    index = (direction === -1) ? (numSubLis - 1) : 0;
                    $highlightedSubLi = $subLis.eq(index);
                }
                $highlightedSubLi.addClass('selected');
            } else {
                // navigate vertically through main menu
                if ($highlightedLi.length) {// When a li is highlighted                    
                    index = $lis.index($highlightedLi);    
                    $highlightedLi.removeClass('selected');
                    newIndex = (index + direction + numLis) % numLis;
                    $highlightedLi = $lis.eq(newIndex);
                } else {
                    index = (direction === -1) ? (numLis - 1) : 0;
                    $highlightedLi = $lis.eq(index);
                }
                $highlightedLi.addClass('selected');

                // adjust scroll position if newly highlighted li is not visible
                var menuHeight = $menu.height();
                var liTop = $highlightedLi.position().top;
                var liHeight = 30;
                var currentScrollTop;

                if (liTop > menuHeight - liHeight) {
                    currentScrollTop = $menu.find('ul').scrollTop();
                    var newScrollTop = liTop - menuHeight + liHeight +
                                       currentScrollTop;
                    $menu.find('ul').scrollTop(newScrollTop);
                    if ($menu.hasClass('hovering')) {
                        $menu.addClass('disableMouseEnter');
                    }
                } else if (liTop < 0) {
                    currentScrollTop = $menu.find('ul').scrollTop();
                    $menu.find('ul').scrollTop(currentScrollTop + liTop);
                    if ($menu.hasClass('hovering')) {
                        $menu.addClass('disableMouseEnter');
                    }
                }
            }
        } else if (lateral) { // left or right key is pressed
            if (!$subMenu) { // if no submenu, do nothing
                return;
            }
            if ($highlightedLi.length &&
                $highlightedLi.hasClass('parentMenu')) {
                var e;
                // if mainmenu li is highlighted and has a submenu
                if (keyCodeNum === keyCode.Right) {
                    if ($subMenu.is(':visible')) {
                        if (!$highlightedSubLi.length) {
                            // select first sub menu li if sub menu is open
                            // but no sub menu li is highlighted
                            e = $.Event('mouseenter');
                            e.keyTriggered = true;
                            $highlightedLi.trigger(e);
                            var $subLis = $subMenu.find('li:visible');
                            $subLis.eq(0).mouseover();
                            if ($subLis.find('input').length > 0) {
                                $subLis.find('input').eq(0).focus();
                            }
                        } else {
                            // close menus if sub menu li is already highlighted
                            closeMenu($menu.add($subMenu));
                        }
                    } else {
                        // open submenu and highlight first li
                        e = $.Event('mouseenter');
                        e.keyTriggered = true;
                        $highlightedLi.trigger(e);
                        var $subLis = $subMenu.find('li:visible');
                        $subLis.eq(0).mouseover();
                        if ($subLis.find('input').length > 0) {
                            $subLis.find('input').eq(0).focus();
                        }
                    }
                } else { // left key is pressed
                    if ($subMenu.is(':visible')) { // if submenu open, hide it
                        $subMenu.hide();
                    } else { // if no submenu is open, close all menus
                        closeMenu($menu);
                    }
                }
            } else {
                closeMenu($menu.add($subMenu));
            }
        }
    }
}

function removeMenuKeyboardNavigation() {
    $(document).off('keydown.menuNavigation');
}

function addColMenuActions() {
    var $colMenu = $('#colMenu');
    var $subMenu = $('#colSubMenu');
    var $cellMenu = $('#cellMenu');

    var $colMenus = $colMenu.add($subMenu);
    var $allMenus = $colMenus.add($cellMenu);
    var tableId;

    // add new column
    $subMenu.on('mouseup', '.addColumn', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');

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
    });

    $colMenu.on('mouseup', '.deleteColumn', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum  = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.delCol([colNum], tableId);
    });

    $colMenu.on('mouseup', '.deleteDuplicates', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.delDupCols(colNum, tableId);
    });

    $subMenu.on('keypress', '.rename input', function(event) {
        if (event.which === keyCode.Enter) {
            var $input  = $(this);
            var colName = $input.val().trim();
            var colNum  = $colMenu.data('colNum');

            if (colName === "" ||
                ColManager.checkColDup($input, null, tableId, false, colNum))
            {
                return false;
            }

            tableId = $colMenu.data('tableId');

            ColManager.renameCol(colNum, tableId, colName);
            $input.val("").blur();
            closeMenu($allMenus);
        }
    });

    $subMenu.on('mouseup', '.changeFormat', function(event) {
        if (event.which !== 1) {
            return;
        }

        var format = $(this).data("format");
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.format(colNum, tableId, format);
    });

    $subMenu.on('keypress', '.digitsToRound', function(event) {
        if (event.which !== keyCode.Enter) {
            return;
        }

        var val = parseInt($(this).val().trim());
        if (isNaN(val) || val < 0 || val > 14) {
            // when this field is empty
            StatusBox.show(ErrorTextWReplaceTStr.InvalidRange
                                                .replace("<num1>", 0)
                                                .replace("<num2>", 14),
                                                $(this), null, null,
                                                {"side": "left", "closeable": true});
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.roundToFixed(colNum, tableId, val);
        closeMenu($allMenus);
    });

    $subMenu.on('keypress', '.splitCol input', function(event) {
        if (event.which === keyCode.Enter) {
            var colNum = $colMenu.data("colNum");
            tableId = $colMenu.data('tableId');
            var $li = $(this).closest("li");
            var $delimInput = $li.find(".delimiter");
            var delim = $delimInput.val();

            if (delim.trim() === "") {
                if (delim.length === 0) {
                    // when this field is empty
                    StatusBox.show(ErrorTextTStr.NoEmpty, $delimInput, null,
                                    null, {closeable: true});
                    return;
                }
                // cast of space/tab
                // XXX FIXME: this part maybe buggy
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
                    "text"     : ErrorTextTStr.OnlyNumber,
                    "check"    : function() {
                        return (isNaN(num) || !Number.isInteger(num));
                    }
                },
                {
                    "$selector": $numInput,
                    "text"     : ErrorTextTStr.OnlyPositiveNumber,
                    "check"    : function() { return (num < 1); }
                }
            ]);

            if (!isValid) {
                return;
            }

            ColManager.splitCol(colNum, tableId, delim, numColToGet, true);
            $delimInput.val("").blur();
            $numInput.val("").blur();
            closeMenu($allMenus);
        }
    });

    $colMenu.on('mouseup', '.duplicate', function(event) {
        if (event.which !== 1) {
            return;
        }

        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.dupCol(colNum, tableId);
    });

    $colMenu.on('mouseup', '.hide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.hideCols([colNum], tableId);
    });

    $colMenu.on('mouseup', '.unhide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        ColManager.unhideCols([colNum], tableId, {"autoResize": true});
    });

    $subMenu.on('mouseup', '.textAlign', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $li = $(this);
        var colNum;
        if ($li.closest('.multiTextAlign').length !== 0) {
            colNum = $colMenu.data('columns');
        } else {
            colNum = $colMenu.data('colNum');
        }
        tableId = $colMenu.data('tableId');
        ColManager.textAlign(colNum, tableId, $(this).attr("class"));
    });

    $subMenu.on('mouseup', '.typeList', function(event) {
        if (event.which !== 1) {
            return;
        }

        var $li = $(this);
        var colTypeInfos = [];
        var colNum;
        var newType = $li.find(".label").text().toLowerCase();
        if ($li.closest(".multiChangeDataType").length !== 0) {
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
        tableId = $colMenu.data('tableId');
        ColManager.changeType(colTypeInfos, tableId);
    });

    $subMenu.on('mouseup', 'li.sort', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        xcFunction.sort(colNum, tableId, SortDirection.Forward);
    });
    
    $subMenu.on('mouseup', 'li.revSort', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        xcFunction.sort(colNum, tableId, SortDirection.Backward);
    });

    $colMenu.on('mouseup', '.joinList', function(event) {
        if (event.which !== 1) {
            return;
        }

        var colNum  = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        JoinModal.show(tableId, colNum);
    });

    $colMenu.on('mouseup', '.functions', function(event) {
        if (event.which !== 1 || $(this).hasClass('unavailable')) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        var func = $(this).text().replace(/\./g, '');
        OperationsModal.show(tableId, colNum, func);
    });

    $colMenu.on('mouseup', '.profile', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        tableId = $colMenu.data('tableId');
        Profile.show(tableId, colNum);
    });

    $cellMenu.on('mouseup', '.tdFilter, .tdExclude', function(event) {
        var $li =  $(this);

        if (event.which !== 1 || $li.hasClass('unavailable')) {
            return;
        }

        var colNum  = $cellMenu.data('colNum');
        tableId = $cellMenu.data('tableId');

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
            var $td = $(this).closest("td");

            if ($header.hasClass("type-integer")) {
                colVal = $td.data("val");
                if (colVal === "") {
                    hasCheckExist = true;
                    return true; // continue to next iteration
                }
                colVal = parseInt(colVal);
            } else if ($header.hasClass("type-float")) {
                colVal = $td.data("val");
                if (colVal === "") {
                    hasCheckExist = true;
                    return true; // continue to next iteration
                }
                colVal = parseFloat(colVal);
            } else if ($header.hasClass("type-string")) {
                // colVal = colVal + ""; // if it's number, change to string
                // XXX for string, text is more reliable
                // since data-val might be messed up
                colVal = $td.children(".addedBarTextWrap").text();
                colVal = JSON.stringify(colVal);
            } else if ($header.hasClass("type-boolean")) {
                colVal = $td.children(".addedBarTextWrap").text();
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

    $cellMenu.on('mouseup', '.tdJsonModal', function(event) {
        if (event.which !== 1) {
            return;
        }
        tableId = $cellMenu.data('tableId');

        var rowNum  = $cellMenu.data('rowNum');
        var colNum  = $cellMenu.data('colNum');
        var $table  = $("#xcTable-" + tableId);
        var $td     = $table.find(".row" + rowNum + " .col" + colNum);
        var isArray = $table.find("th.col" + colNum + " > div")
                            .hasClass('type-array');
        JSONModal.show($td, isArray);
    });

    $cellMenu.on('mouseup', '.tdUnnest', function(event) {
        if (event.which !== 1) {
            return;
        }

        tableId = $cellMenu.data('tableId');

        var rowNum  = $cellMenu.data('rowNum');
        var colNum  = $cellMenu.data('colNum');
        var $table  = $("#xcTable-" + tableId);
        var $td     = $table.find(".row" + rowNum + " .col" + colNum);
        var isArray = $table.find("th.col" + colNum + " > div")
                            .hasClass('type-array');
        $(".xcTable").find(".highlightBox").remove();
        setTimeout(function() {
           unnest($td, isArray);
       }, 0);
    });

    $cellMenu.on('mouseup', '.tdCopy', function(event) {
        var $li = $(this);
        if (event.which !== 1 || $li.hasClass('unavailable')) {
            return;
        }
        tableId = $cellMenu.data('tableId');
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
        tableId = $colMenu.data('tableId');
        ColManager.delCol(columns, tableId);
    });

    $colMenu.on('mouseup', '.hideColumns', function(event) {
        if (event.which !== 1) {
            return;
        }

        var columns = $colMenu.data('columns');
        tableId = $colMenu.data('tableId');
        ColManager.hideCols(columns, tableId);
    });

    $colMenu.on('mouseup', '.unhideColumns', function(event) {
        if (event.which !== 1) {
            return;
        }

        var columns = $colMenu.data('columns');
        tableId = $colMenu.data('tableId');
        ColManager.unhideCols(columns, tableId, {"autoResize": true});
    });
}

function unnest($jsonTd, isArray, options) {
    var text = $jsonTd.find("div").eq(0).text();
    var jsonObj;
    options = options || {};

    try {
        jsonObj = jQuery.parseJSON(text);
    } catch (error) {
        console.error(error, text);
        return;
    }

    var colNum = xcHelper.parseColNum($jsonTd);
    var tableId  = $jsonTd.closest('table').data('id');
    var cols = gTables[tableId].tableCols;
    var numCols = cols.length;
    var arrayOfKeys = [];
    var duplicateFound = false;
    var colName;
    var openSymbol;
    var closingSymbol;
    for (var arrayKey in jsonObj) {
        if (options.isDataTd) {
            colName = arrayKey;
        } else {
            openSymbol = "";
            closingSymbol = "";
            if (!isArray) {
                openSymbol = ".";
            } else {
                openSymbol = "[";
                closingSymbol = "]";
            }
            colName = cols[colNum - 1].func.args[0] + openSymbol +
                      arrayKey.replace(/\./g, "\\\.") + closingSymbol;
        }
        for (var i = 0; i < numCols; i++) {
            if (cols[i].func.args[0] === colName) {
                duplicateFound = true;
                break;
            }
        }
        if (duplicateFound) {
            duplicateFound = false;
        } else {
            arrayOfKeys.push(arrayKey);
        }    
    }
    var numKeys = arrayOfKeys.length;
    var pullColOptions = {
        "isDataTd" : options.isDataTd,
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

function copyToClipboard(valArray, stringify) {
    var $hiddenInput = $("<input>");
    var str = "";
    if (stringify) {
        str = JSON.stringify(valArray);
    } else {
        str = valArray.join(", ");
    }

    $("body").append($hiddenInput);
    $hiddenInput.val(str).select();
    document.execCommand("copy");
    $hiddenInput.remove();
}

function closeMenu($menu) {
    $menu.hide();
    $('body').removeClass('noSelection');
    removeMenuKeyboardNavigation();
}

function functionBarEnter($colInput) {
    var $fnBar = $("#fnBar");
    var fnBarVal = $fnBar.val();
    var fnBarValTrim = fnBarVal.trim();
    
    if (!$colInput) {
        return;
    }
    gFnBarOrigin = $colInput;
    if (fnBarValTrim.indexOf('=') === 0) {
        var $table   = $colInput.closest('.dataTable');
        var tableId  = xcHelper.parseTableId($table);
        var colNum   = xcHelper.parseColNum($colInput);
        var table    = gTables[tableId];
        var tableCol = table.tableCols[colNum - 1];
        var colName  = tableCol.name;
        $fnBar.blur().addClass("entered");

        if (tableCol.isNewCol && colName === "") {
            // when it's new column and do not give name yet
            StatusBox.show(ErrorTextTStr.NoEmpty, $colInput);
            return;
        }

        $fnBar.removeClass("inFocus");
        
        var newFuncStr = '"' + colName + '" ' + fnBarValTrim;
        var oldUsrStr  = tableCol.userStr;

        $colInput.blur();
        // when usrStr not change
        if (newFuncStr === oldUsrStr) {
            return;
        }

        $colInput.closest('th').removeClass('unusedCell');
        $table.find('td:nth-child(' + colNum + ')').removeClass('unusedCell');
        var isValid = checkFuncSyntaxValidity(fnBarValTrim);
        if (!isValid) {
            return;
        }
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
}

function checkFuncSyntaxValidity(funcStr) {
    if (funcStr.indexOf("(") === -1 || funcStr.indexOf(")") === -1) {
        return (false);
    }

    var count = 0;
    var strLen = funcStr.length;
    for (var i = 0; i < strLen; i++) {
        if (funcStr[i] === "(") {
            count++;
        } else if (funcStr[i] === ")") {
            count--;
        }
        if (count < 0) {
            return (false);
        }
    }

    return (count === 0);
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

    return new ColFunc({"func": funcName, "args": args});
}

function dropdownClick($el, options) {
    options = options || {};
    var tableId;

    if (!options.type) {
        console.error("Wrong dropdownClick call");
        return;
    }

    if (options.type !== "tabMenu") {
        tableId = xcHelper.parseTableId($el.closest(".xcTableWrap"));
    }
    
    var $menu;
    var $subMenu;
    var $allMenus;
    var menuHeight;
    $('.menu .selected').removeClass('selected');
    $('.tooltip').hide();

    if (typeof options.callback === "function") {
        options.callback();
    }

    if (options.type === "tableDropdown") {
        $menu = $('#tableMenu');
        $subMenu = $('#tableSubMenu');
        $allMenus = $menu.add($subMenu);
    
        // case that should close table menu
        if ($menu.is(":visible")) {
            closeMenu($allMenus);
            return;
        }
        menuHeight = $(window).height() - 116;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        if (options.classes && options.classes.indexOf('locked') !== -1) {
            $menu.find('li:not(.hideTable, .unhideTable)')
                  .addClass('unavailable');
        } else {
            $menu.find('li').removeClass('unavailable');
        }
        if (WSManager.getWSLen() <= 1) {
            $menu.find(".moveToWorksheet").addClass("unavailable");
        } else {
            $menu.find(".moveToWorksheet").removeClass("unavailable");
        }
    } else if (options.type === "thDropdown") {
        $menu = $('#colMenu');
        $subMenu = $('#colSubMenu');
        $allMenus = $menu.add($subMenu);
        // case that should close column menu
        if ($menu.is(":visible") && $menu.data("colNum") === options.colNum &&
            $menu.data('tableId') === tableId && !$menu.hasClass('tdMenu')) {
            closeMenu($allMenus);
            return;
        }
        if (options.multipleColNums) {
            $menu.data('columns', options.multipleColNums);
        } else {
            $menu.data('columns', []);
        }
        menuHeight = $(window).height() - 152;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);
        // $menu.children('ul').css('max-height', $(window).height() - 152);

        // Use CSS to show the options
    } else if (options.type === "tdDropdown") {
        $menu = $('#cellMenu');
        // case that should close column menu
        if (options.isUnSelect && !options.shiftKey)
        {
            closeMenu($menu);
            return;
        }

        // If the tdDropdown is on a non-filterable value, we need to make the
        // filter options unavailable
        var tableCol = gTables[tableId].tableCols[options.colNum - 1];
        var columnType = tableCol.type;
        var shouldNotFilter = options.isMutiCol ||
                            (
                                columnType !== "string" &&
                                columnType !== "float" &&
                                columnType !== "integer" &&
                                columnType !== "boolean"
                            );
        var notAllowed = $el.find('.undefined, .null, .blank').length;
        var isMultiCell = $("#xcTable-" + tableId).find(".highlightBox").length > 1;

        var $tdFilter  = $menu.find(".tdFilter");
        var $tdExclude = $menu.find(".tdExclude");

        if (shouldNotFilter || notAllowed) {
            $tdFilter.addClass("unavailable");
            $tdExclude.addClass("unavailable");
        } else {
            $tdFilter.removeClass("unavailable");
            $tdExclude.removeClass("unavailable");
        }

        if (!options.isMutiCol &&
            (tableCol.format != null || tableCol.decimals > -1))
        {
            // when it's only on one column and column is formatted
            if (isMultiCell) {
                $tdFilter.text('Filter pre-formatted values');
                $tdExclude.text('Exclude pre-formatted values');
            } else {
                $tdFilter.text('Filter pre-formatted value');
                $tdExclude.text('Exclude pre-formatted value');
            }
            options.classes += " long";
        } else {
           if (isMultiCell) {
                $tdFilter.text('Filter these values');
                $tdExclude.text('Exclude these values');
            } else {
                $tdFilter.text('Filter this value');
                $tdExclude.text('Exclude this value');
            }
        }

        if ((columnType === "object" || columnType === "array") && !notAllowed) {
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
    } else if (options.type === "tabMenu") {
        $menu = $('#worksheetTabMenu');
    }

    if (options.type !== "tdDropdown") {
        $('.highlightBox').remove();
    }

    $(".menu:visible").hide();
    removeMenuKeyboardNavigation();
    $(".leftColMenu").removeClass("leftColMenu");
    // case that should open the menu (note that colNum = 0 may make it false!)
    if (options.colNum != null && options.colNum > -1) {
        $menu.data("colNum", options.colNum);
        $menu.data("tableId", tableId);

    } else {
        $menu.removeData("colNum");
        $menu.removeData("tableId");
    }
    if (options.type === "tableDropdown") {
        $menu.data("tableId", tableId);
    }

    if (options.rowNum != null && options.rowNum > -1) {
        $menu.data("rowNum", options.rowNum);
    } else {
        $menu.removeData("rowNum");
    }

    if (options.classes != null) {
        var className = options.classes.replace("header", "");
        $menu.attr("class", "menu " + className);
        if ($subMenu) {
            $subMenu.attr("class", "menu subMenu " + className);
        }
    }

    if (options.type === 'thDropdown') {
        $subMenu.find('.sort').removeClass('unavailable');
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

    if (options.offsetX) {
        left += options.offsetX;
    }

    $menu.css({"top": top, "left": left}).show();
    $menu.children('ul').scrollTop(0);

    // size menu and ul
    var $ul = $menu.find('ul');
    if ($ul.length > 0) {
        var ulHeight = $menu.find('ul')[0].scrollHeight;
        if (ulHeight > $menu.height()) {
            $menu.children('ul').css('max-height', menuHeight);
            $menu.find('.scrollArea').show();
        } else {
            $menu.children('ul').css('max-height', 'auto');
            $menu.find('.scrollArea').hide();
        }
    }
    // set scrollArea states
    $menu.find('.scrollArea.top').addClass('stopped');
    $menu.find('.scrollArea.bottom').removeClass('stopped');
    

    //positioning if dropdown menu is on the right side of screen
    var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
    if ($menu[0].getBoundingClientRect().right > leftBoundary) {
        left = $el[0].getBoundingClientRect().right - $menu.width();
        $menu.css('left', left).addClass('leftColMenu');
    }
    //positioning if td menu is below the screen
    if (options.type === "tdDropdown" || options.type === "tabMenu") {
        if (top + $menu.height() + 5 > $(window).height()) {
            top -= ($menu.height() + 20);
            $menu.css('top', top);
        }
    }

    addMenuKeyboardNavigation($menu, $subMenu);

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
    var index   = xcHelper.parseColNum($el);
    var tableId = xcHelper.parseTableId($el.closest('.dataTable'));
    var $table  = $('#xcTable-' + tableId);
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
        if (gTables[tableId].bookmarks.indexOf(rowNum) < 0) {
            bookmarkRow(rowNum, tableId);
        } else {
            unbookmarkRow(rowNum, tableId);
        }
    });
}

function adjustRowHeights(newCells, rowIndex, tableId) {
    var rowObj = gTables[tableId].rowHeights;
    var numRows = newCells.length;
    var pageNum = Math.floor(rowIndex / gNumEntriesPerPage);
    var lastPageNum = pageNum + Math.ceil(numRows / gNumEntriesPerPage);
    var padding = 4;
    var $row;
    var $firstTd;

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
    var oldId = gActiveTableId;
    $xcTableWrap.mousedown(function() {
        if (gActiveTableId === tableId) {
            return;
        } else {
            gActiveTableId = tableId;
            var focusDag;
            if (oldId !== gActiveTableId) {
                focusDag = true;
            }
            focusTable(tableId, focusDag);
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

function moveTableTitles($tableWraps) {
    if (isBrowserMicrosoft) {
        return;
    }
    $tableWraps = $tableWraps ||
                  $('.xcTableWrap:not(.inActive):not(.tableHidden)');
    var viewWidth = $('#mainFrame').width();
    $tableWraps.each(function() {
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
                $table.find('.lockedIcon')
                      .css('left', center + titleWidth / 2 + 5);
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
        var $input = $tableTitle.find('input');
        var inputTextWidth = getTextWidth($input, $input.val()) + 1;
        var titleWidth = $tableTitle.outerWidth();
        var inputWidth = $input.width();
        var inputWidthChange = inputTextWidth - inputWidth;
        var expectedTitleWidth; 
        // because the final input width is variable we need to figure out 
        // how much it's going to change and what the expected title width is
        if (widthChange > 0) {
            var extraSpace = $thead.width() - titleWidth - 2;
            expectedTitleWidth = titleWidth -
                                 Math.max(0,(widthChange - extraSpace));
        } else {
            expectedTitleWidth = titleWidth + 
                                 Math.min(inputWidthChange, -widthChange);
        }
        
        titleWidth = expectedTitleWidth;
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

function focusTable(tableId, focusDag) {
    if (WSManager.getWSFromTable(tableId) !== WSManager.getActiveWS())
    {
        console.warn("Table not in current worksheet");
        return;
    }
    var wsNum = WSManager.getActiveWS();
    $('.xcTableWrap.worksheet-' + wsNum).find('.tableTitle')
                                        .removeClass('tblTitleSelected');
    var $xcTheadWrap = $('#xcTheadWrap-' + tableId);
    $xcTheadWrap.find('.tableTitle').addClass('tblTitleSelected');
    gActiveTableId = tableId;
    RowScroller.update(tableId);

    if (gTables[tableId].resultSetCount === 0) {
        $('#rowInput').val(0).data('val', 0);
    } else {
        generateFirstVisibleRowNum();
    }
    if (focusDag) {
        var tableFocused = true;
        Dag.focusDagForActiveTable(null, tableFocused);
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
    var table = gTables[tableId];
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
    var table = gTables[tableId];
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
    moveFirstColumn();
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
                        '*{cursor: progress !important;}' +
                    '</style>';
    $(document.head).append(waitCursor);
}

function removeWaitCursor() {
    $('#waitCursor').remove();
}

function centerPositionElement($target, options) {
    // to position elements in the center of the window i.e. for modals
    var $window = $(window);
    var top;
    options = options || {};

    if (!options.horizontalOnly) {
        var winHeight   = $window.height();
        var modalHeight = $target.height();
        top  = ((winHeight - modalHeight) / 2);
        if (options.limitTop) {
            top = Math.max(top, 0);
        }
    }
    
    var winWidth    = $window.width();
    var modalWidth  = $target.width();

    var left = ((winWidth - modalWidth) / 2);
    
    if (options.horizontalOnly) {
        $target.css({"left": left});
    } else {
        $target.css({
            "left": left,
            "top" : top
        });
    }
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

        var rows = gTables[tableId].bookmarks;
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
