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
    var tdYCoor = 164; //top rows's distance from top of window
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

    $('input:enabled').prop('disabled', true).addClass('tempDisabledInput');
}

function reenableTextSelection() {
    $('#disableSelection').remove();
    $('.tempDisabledInput').removeClass('tempDisabledInput')
                           .prop('disabled', false);
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
    $table.addClass('resizingCol');

    disableTextSelection();
    $(document.head).append('<style id="col-resizeCursor" type="text/css">*' +
                            '{cursor: col-resize !important;}' +
                            '.tooltip{display: none !important;}</style>');
    if (!rescol.grabbedCell.hasClass('selectedCell')) {
        $('.selectedCell').removeClass('selectedCell');
    }
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
    if (rescol.isDatastore) {
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
    rescol.table.find('.rowGrab').width(rescol.table.width());
    rescol.table.removeClass('resizingCol');
    $('.tooltip').hide();
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
    var $table = el.closest('.xcTbodyWrap');

    resrow.mouseStart = event.pageY;
    // we actually target the td above the one we're grabbing.
    resrow.actualTd = el.closest('td');
    if (el.hasClass('last')) {
        resrow.targetTd = $table.find('tr:last').find('td').eq(0);
        resrow.actualTd = resrow.targetTd;
    } else {
        resrow.targetTd = el.closest('tr').prev().find('td').eq(0);
    }
    
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
    resrow.targetTd.closest('tr').addClass('changedHeight');
    resrow.actualTd.closest('tr').addClass('dragging');
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
            -($fauxTable.find('tr:first').outerHeight() + firstRowOffset - 1)});
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
        dragObj.$table.find('tr').eq(0).find('th').each(function(i) {
            if (i === 0 || i === dragObj.colIndex) {
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
                            dragObj.docHeight + 'px;">' +
                                i +
                            '</div>';
        });
        var scrollLeft = $('#mainFrame').scrollLeft();
        // may have issues with table left if dragObj.$table isn't correct
        var tableLeft = dragObj.$table[0].getBoundingClientRect().left +
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
    dragObj.$table.find('.header').css('height', '35px');
    setTimeout(function() {
        dragObj.$table.find('.header').css('height', '36px');
    }, 0);
    
    var left = dragObj.element.position().left;
    $('#shadowDiv').css('left', left);
    dragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function getTextWidth(el, val, options) {
    var width;
    var text;
    options = options || {};
    var defaultStyle;
    if (options.defaultHeaderStyle) {
        defaultStyle = { // styling we use for column header
            "fontFamily": "'Open Sans', 'Trebuchet MS', Arial, sans-serif",
            "fontSize": "13px",
            "fontWeight": "600",
            "padding": 48
        };
    } else {
        defaultStyle = {padding: 0};
    }
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
        'font-family': defaultStyle.fontFamily || el.css('font-family'),
        'font-size'  : defaultStyle.fontSize || el.css('font-size'),
        'font-weight': defaultStyle.fontWeight || el.css('font-weight'),
        'position'   : 'absolute',
        'display'    : 'inline-block',
        'white-space': 'pre'
    }).appendTo($('body'));

    width = tempDiv.width() + defaultStyle.padding;
    tempDiv.remove();
    return (width);
}

/* Possible Options:
    includeHeader: boolean, default is false. If set, column head will be
                    included when determining column width
    fitAll: boolean, default is false. If set, both column head and cell widths
            will be included in determining column width
    minWidth: integer, default is 10. Minimum width a column can be.
    maxWidth: integer, default is 2000. Maximum width a column can be.
    unlimitedWidth: boolean, default is false. Set to true if you don't want to
                    limit the width of a column
    dataStore: boolean, default is false. Set to true if measuring columns
                located in the datastore panel
    dblClick: boolean, default is false. Set to true when resizing using a
                double click
*/
function autosizeCol($th, options) {
    options = options || {};

    var index = xcHelper.parseColNum($th);
    var $table = $th.closest('.dataTable');
    var tableId = xcHelper.parseTableId($table);
    var table = gTables[tableId];

    var includeHeader = options.includeHeader || false;
    var fitAll = options.fitAll || false;
    var minWidth = options.minWidth || (gRescol.cellMinWidth - 5);
    var maxWidth = options.maxWidth || 700;
    var datastore = options.datastore || false;
    
    var widestTdWidth = getWidestTdWidth($th, {
        "includeHeader": includeHeader,
        "fitAll"       : fitAll,
        "datastore"    : datastore
    });
    var newWidth = Math.max(widestTdWidth, minWidth);
    // dblClick is autoSized to a fixed width
    if (!options.dblClick) {
        var originalWidth = table.tableCols[index - 1].width;
        if (originalWidth === "auto") {
            originalWidth = 0;
        }
        newWidth = Math.max(newWidth, originalWidth);
    }

    if (!options.unlimitedWidth) {
        newWidth = Math.min(newWidth, maxWidth);
    }
    
    $th.outerWidth(newWidth);
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

    if (fitAll || includeHeader) {
        var $th;
        if ($table.find('.col' + id + ' .dataCol').length === 1) {
            $th = $table.find('.col' + id + ' .dataCol');
        } else {
            $th = $table.find('.col' + id + ' .editableHead');
        }
        var extraPadding = 48;
        if (options.datastore) {
            extraPadding += 4;
        }
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

    if (fitAll) {
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
        var target = options.target;

        var $th = $el.parent().parent();
        var $table = $th.closest('.dataTable');
        $table.find('.colGrab')
              .removeAttr('data-toggle data-original-title title');

        var $selectedCols;
        if (target === "datastore") {
            $selectedCols = $table.find('th.selectedCol');
        } else {
            $selectedCols = $table.find('th.selectedCell');
        }
        var numSelectedCols = $selectedCols.length;
        if (numSelectedCols === 0) {
            $selectedCols = $th;
            numSelectedCols = 1;
        }
        var indices = [];
        $selectedCols.each(function() {
            indices.push($(this).index() - 1);
        });

        var includeHeader = false;
        
        if (target === "datastore") {

            $selectedCols.find('.colGrab').each(function() {
                if ($(this).data('sizetoheader')) {
                    includeHeader = true;
                    return false;
                }
            });

            $selectedCols.find('.colGrab').each(function() {
                $(this).data('sizetoheader', !includeHeader);
            });

        } else {
            var tableId = $table.data('id');
            var columns = gTables[tableId].tableCols;
            var i;
            for (i = 0; i < numSelectedCols; i++) {
                if (columns[indices[i]].sizeToHeader) {
                    includeHeader = true;
                    break;
                }
            }
            for (i = 0; i < numSelectedCols; i++) {
                columns[indices[i]].sizeToHeader = !includeHeader;
            }
        }
        
        var minWidth;
        if (options.minWidth) {
            minWidth = options.minWidth;
        } else {
            minWidth = 17;
        }
        
        $selectedCols.each(function() {
            autosizeCol($(this), {
                "dblClick"      : true,
                "minWidth"      : minWidth,
                "unlimitedWidth": true,
                "includeHeader" : includeHeader,
                "datastore"     : target === "datastore"
            });
        });
       
        $('#col-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
        $table.removeClass('resizingCol');
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
                    '<div class="labelWrap">' +
                        '<label class="text" ></label>' +
                    '</div>' +
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

    $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function(event) {
        var classes   = "tableMenu";
        var $dropdown = $(this);
        var $tableWrap = $dropdown.closest('.xcTableWrap');
        

        if ($tableWrap.hasClass('tableLocked')) {
            classes += " locked";
        }

        if ($tableWrap.hasClass('tableHidden')) {
            classes += " tableHidden";
        }

        var options = {
            "type"   : "tableDropdown",
            "classes": classes
        };

        if (event.rightClick) {
            options.mouseCoors = {"x": event.pageX,
                                  "y": $dropdown.offset().top + 36};
        }

        dropdownClick($dropdown, options);
    });

    // Change from $xcTheadWrap.find('.tableGrab').mosedown...
    $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
        // Not Mouse down
        if (event.which !== 1) {
            return;
        }
        dragTableMouseDown($(this).parent(), event);
    });

    $xcTheadWrap.on('click', '.tableGrab', function(e) {
        var $target = $(this);
        if (!$(this).hasClass('noDropdown')) {
            var click = $.Event("click");
            click.rightClick = true;
            click.pageX = e.pageX;
            $target.siblings('.dropdownBox').trigger(click);
            e.preventDefault();
        }
    });

    $xcTheadWrap[0].oncontextmenu = function(e) {
        var $target = $(e.target).closest('.tableGrab');
        if ($target.length) {
            var click = $.Event("click");
            click.rightClick = true;
            click.pageX = e.pageX;
            $target.siblings('.dropdownBox').trigger(click);
            e.preventDefault();
        }
    };

    var $table = $('#xcTable-' + tableId);
    $table.width(0);
    matchHeaderSizes($table);
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
            cols = table.tableCols.length - 1; // skip DATA col
        }
        $tHead.data("cols", cols);
        $tHead.data("title", fullTableName);
    }

    fullTableName = fullTableName.split("#");

    var tableName = fullTableName[0];

    if (fullTableName.length === 2) {
        tableName =
            '<input type="text" class="tableName" value="' + tableName + '" ' +
            ' autocorrect="off" spellcheck="false">' +
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
            $subMenu    : $subMenu,
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

function unnest($jsonTd, isArray, options) {
    var text = $jsonTd.find("div").eq(0).text();
    var jsonTdObj;
    options = options || {};

    try {
        jsonTdObj = jQuery.parseJSON(text);
    } catch (error) {
        console.error(error, text);
        return;
    }

    var colNum = xcHelper.parseColNum($jsonTd);
    var $table = $jsonTd.closest('table');
    var tableId  = $table.data('id');
    var table = gTables[tableId];
    var cols = table.tableCols;
    var numCols = cols.length;
    var colNames = [];
    var escapedColNames = [];
    var colName;
    var escapedColName;
    var openSymbol;
    var closingSymbol;
    // var tempName;

    for (var arrayKey in jsonTdObj) {
        if (options.isDataTd) {
            colName = arrayKey;
            escapedColName = arrayKey.replace(/\./g, "\\\.");
        } else {
            openSymbol = "";
            closingSymbol = "";
            if (!isArray) {
                openSymbol = ".";
            } else {
                openSymbol = "[";
                closingSymbol = "]";
            }

            colName = cols[colNum - 1].getBackColName().replace(/\\./g, ".") +
                      openSymbol + arrayKey + closingSymbol;
            escapedColName = cols[colNum - 1].getBackColName() + openSymbol +
                            arrayKey.replace(/\./g, "\\\.") + closingSymbol;
        }

        if (!table.hasBackCol(escapedColName)) {
            colNames.push(colName);
            escapedColNames.push(escapedColName);
        }    
    }

    if (colNames.length === 0) {
        return;
    }
    var numKeys = colNames.length;
    var newColNum = colNum - 1;
    var columnClass = "";
    var color = "";
    var ths = "";
    var widthOptions = {
        defaultHeaderStyle: true
    };
    var width;

    for (var i = 0; i < numKeys; i++) {
        var key = colNames[i];
        var escapedKey = escapedColNames[i];
        var usrStr = '"' + key + '" = pull(' + escapedKey + ')';

        width = getTextWidth($(), key, widthOptions);

        var newCol = ColManager.newCol({
            "name"   : key,
            "width"  : width,
            "userStr": usrStr,
            "func"   : {
                "func": "pull",
                "args": [escapedKey]
            },
            "isNewCol": false
        });
        if (options.isDataTd) {
            cols.splice(newColNum, 0, newCol);
        } else {
            cols.splice(newColNum + 1, 0, newCol);
        }
      
        if (key === table.key) {
            columnClass += " indexedColumn";
        }
        newColNum++;
        var colHeadNum = newColNum;
        if (!options.isDataTd) {
            colHeadNum++;
        }

        ths += TblManager.generateColumnHeadHTML(columnClass, color, colHeadNum,
                                      {name: key, width: width});
    }
    var rowNum = xcHelper.parseRowNum($table.find('tbody').find('tr:eq(0)'));
    var origDataIndex = xcHelper.parseColNum($table.find('th.dataCol'));
    var jsonObj = {normal: []};
    $table.find('tbody').find('.col' + origDataIndex).each(function() {
        jsonObj.normal.push($(this).text());
    });
    $table.find('tbody').empty(); // remove tbody contents for pullrowsbulk
    var endIndex;
    if (options.isDataTd) {
        endIndex = colNum;
    } else {
        endIndex = colNum + 1;
    }

    for (var i = numCols; i >= endIndex; i--) {
        $table.find('.col' + i )
              .removeClass('col' + i)
              .addClass('col' + (numKeys + i));
    }

    if (options.isDataTd) {
        $table.find('.th.col' + (newColNum + 1)).before(ths);
    } else {
        $table.find('.th.col' + colNum).after(ths);
    }

    var dataIndex = xcHelper.parseColNum($table.find('th.dataCol')) - 1;

    TblManager.pullRowsBulk(tableId, jsonObj, rowNum, dataIndex,
                            RowDirection.Bottom);
    updateTableHeader(tableId);
    TableList.updateTableInfo(tableId);
    moveTableDropdownBoxes();
    moveFirstColumn();
    moveTableTitles();
}

function closeMenu($menu) {
    $menu.hide();
    $('body').removeClass('noSelection');
    removeMenuKeyboardNavigation();
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
        if ($menu.is(":visible") && $menu.data('tableId') === tableId) {
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
        menuHeight = $(window).height() - 150;
        $menu.css('max-height', menuHeight);
        $menu.children('ul').css('max-height', menuHeight);

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
            $menu.find('.scrollArea.bottom').addClass('active');
        } else {
            $menu.children('ul').css('max-height', 'auto');
            $menu.find('.scrollArea').hide();
        }
    }
    // set scrollArea states
    $menu.find('.scrollArea.top').addClass('stopped');
    $menu.find('.scrollArea.bottom').removeClass('stopped');
    

    //positioning if dropdown menu is on the right side of screen
    if (!options.ignoreSideBar) {
        var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
        if ($menu[0].getBoundingClientRect().right > leftBoundary) {
            left = $el[0].getBoundingClientRect().right - $menu.width();
            $menu.css('left', left).addClass('leftColMenu');
        }
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
                                 Math.max(0, (widthChange - extraSpace));
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
    // unhighlight any selected columns from all other tables
    $('.xcTable:not(#xcTable-' + tableId + ')').find('.selectedCell')
                                               .removeClass('selectedCell');
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

function dragTableMouseDown($el, e) {
    var dragObj = gDragObj;
    gMouseStatus = "checkingMovingTable";
    dragObj.mouseX = e.pageX;
    dragObj.$el = $el;

    var cursorStyle =
        '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}' +
            '.tooltip{display: none !important;}' +
        '</style>';

    $(document.head).append(cursorStyle);
}

function checkDragTableMouseMove(e) {
    var dragObj = gDragObj;
    dragObj.pageX = e.pageX;
    if (Math.abs(dragObj.mouseX - dragObj.pageX) > 0) {
        gMouseStatus = "movingTable";
        dragObj.$el.find('.tableGrab').addClass('noDropdown');
        dragObj.$table = dragObj.$el.closest('.xcTableWrap');
        dragObj.halfWidth = dragObj.$table.outerWidth() * 0.5;
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
        createShadowTable();
        sizeTableForDragging();
        dragObj.$table.addClass('tableDragging');
        dragObj.$table.css('left', dragObj.offsetLeft + 'px');
        dragObj.windowWidth = $(window).width();
        dragObj.$table.scrollTop(dragObj.tableScrollTop);
        createTableDropTargets();
        dragdropMoveMainFrame(dragObj, 50);
        disableTextSelection();
    }
}

function dragTableMouseMove(e) {
    var dragObj = gDragObj;
    var left =  e.pageX - dragObj.mouseOffset;
    dragObj.$table.css('left', left + 'px');
    dragObj.pageX = e.pageX;
}

function dragTableMouseUp() {
    var dragObj = gDragObj;
    if (gMouseStatus === "checkingMovingTable") {
        gMouseStatus = null;
        dragObj.$el.find('.tableGrab').removeClass('noDropdown');
        $('#moveCursor').remove();
        return;
    }

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
    var dragObj = gDragObj;
    var offset = dragObj.mouseX - dragObj.offsetLeft;
    var tableLeft;
    var $mainFrame = dragObj.mainFrame;
    var dropTargets = "";
    var targetWidth;
    var tempOffset = offset;
    var mainFrameScrollLeft = $mainFrame.scrollLeft();

    dragObj.$activeTables.each(function(i) {
        if (i === gDragObj.tableIndex) {
            return true;  
        }

        targetWidth = Math.round(0.5 * $(this).outerWidth());
        targetWidth = Math.min(targetWidth, dragObj.halfWidth);
        
        if (i > gDragObj.tableIndex) {
            offset = tempOffset - dragObj.halfWidth + 5;
        } else {
            offset = tempOffset - 5;
        }

        tableLeft = $(this).position().left + mainFrameScrollLeft;
        dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                        'style="left:' + (tableLeft + offset) +
                        'px;' + 'width:' + targetWidth + 'px;height:' +
                        (gDragObj.docHeight) + 'px;">' +
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
    var dragObj = gDragObj;
    var offset = dragObj.mouseX - dragObj.offsetLeft;
    var $mainFrame = dragObj.mainFrame;
    var tableLeft = swappedTable.position().left + $mainFrame.scrollLeft();
    var $dropTarget = $('#dropTarget' + dropTargetIndex);
    if (dropTargetIndex < oldIndex) {
        offset -= (dragObj.halfWidth * 0.5) - 5;
    } else {
        offset -= 5;
    }

    $dropTarget.attr('id', 'dropTarget' + oldIndex);
    $dropTarget.css({'left': (tableLeft + offset) + 'px'});
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
        top = ((winHeight - modalHeight) / 2);
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
        } else if ($("#xcTableWrap-" + tableId).hasClass('inActive')) {
            $('#rowScroller-' + tableId).hide();
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
