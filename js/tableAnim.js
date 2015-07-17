function generateFirstVisibleRowNum(rowScrollerMove) {
    if (!document.elementFromPoint) {
        return;
    }
    var $table = $('#xcTable' + gActiveTableNum);
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
            if (rowScrollerMove && isTableScrollable(gActiveTableNum)) {
                RowScroller.move(firstRowNum,
                    gTables[gActiveTableNum].resultSetCount);
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
    var tableNum = xcHelper.parseTableNum($table);
    var colNum   = xcHelper.parseColNum(el.parent().parent());

    if (options && options.target === "datastore") {
        rescol.isDatastore = true;
    }

    if (el.parent().width() === 10) {
        // This is a hidden column! we need to unhide it
        // return;
        ColManager.unhideCol(colNum, tableNum, {autoResize: false});
    }
    gMouseStatus = "resizingCol";
    event.preventDefault();
    rescol.mouseStart = event.pageX;
    rescol.grabbedCell = el.parent().parent();  // the th
    rescol.index = colNum;
    rescol.startWidth = rescol.grabbedCell.outerWidth();
    rescol.tableNum = tableNum;
    rescol.table = $table;
    rescol.tableHead = el.closest('.xcTableWrap').find('.xcTheadWrap');
    rescol.tableHeadInput = rescol.tableHead.find('.text');
    rescol.headerDiv = el.parent(); // the .header div
    
    rescol.tempCellMinWidth = rescol.cellMinWidth - 5;
    rescol.leftDragMax = rescol.tempCellMinWidth - rescol.startWidth;

    disableTextSelection();
    $(document.head).append('<style id="col-resizeCursor" type="text/css">*' +
                            '{cursor: col-resize !important;}</style>');
    HelpController.tooltipOff();
}

function gRescolMouseMove(event) {
    var rescol = gRescol;
    var dragDist = (event.pageX - rescol.mouseStart);
    if (dragDist > rescol.leftDragMax) {
        rescol.grabbedCell.outerWidth(rescol.startWidth + dragDist);
        rescol.headerDiv.outerWidth(rescol.startWidth + dragDist);
    } else if (dragDist < rescol.leftDragMax ) {
        rescol.grabbedCell.outerWidth(rescol.tempCellMinWidth);
        rescol.headerDiv.outerWidth(rescol.tempCellMinWidth);
    }
    var tableWidth = rescol.table.width();
    rescol.tableHeadInput.width('75%');
    rescol.tableHead.width(tableWidth);
}

function gRescolMouseUp() {
    gMouseStatus = null;
    $('#col-resizeCursor').remove();
    reenableTextSelection();
    gRescol.table.find('.rowGrab').width(gRescol.table.width());
    if (!gRescol.isDatastore) {
        var progCol = gTables[gRescol.tableNum].tableCols[gRescol.index - 1];
        progCol.width = gRescol.grabbedCell.outerWidth();
    } else {
        gRescol.isDatastore = false;
    }
    moveTableDropdownBoxes();
    setTimeout(function() {
        HelpController.tooltipOn();
    }, 300);
}

function gResrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    gResrow.mouseStart = event.pageY;
    gResrow.targetTd = el.closest('td');
    gResrow.tableNum = parseInt(el.closest('table').attr('id').substring(7));
    gResrow.startHeight = gResrow.targetTd.outerHeight();
    gResrow.rowIndex = gResrow.targetTd.closest('tr').index();
    disableTextSelection();
    var style = '<style id="row-resizeCursor" type="text/css">*' +
                    '{cursor: row-resize !important;}' +
                '</style>';
    $(document.head).append(style);
    $('body').addClass('hideScroll');
    gResrow.targetTd.closest('tr').addClass('dragging changedHeight')
                                 .find('td > div')
                                 .css('max-height', gResrow.startHeight - 4);
    gResrow.targetTd.outerHeight(gResrow.startHeight);

    $('#xcTable' + gResrow.tableNum + ' tr:not(.dragging)')
                                   .addClass('notDragging');
}

function gResrowMouseMove(event) {
    var mouseDistance = event.pageY - gResrow.mouseStart;
    var newHeight = gResrow.startHeight + mouseDistance;
    var row = gResrow.rowIndex;
    var padding = 4; // top + bottom padding in td
    if (newHeight < gRescol.minCellHeight) {
        gResrow.targetTd.outerHeight(gRescol.minCellHeight);
        $('#xcTable' + gResrow.tableNum + ' tbody tr:eq(' + row + ') td > div')
            .css('max-height', gRescol.minCellHeight - padding);
    } else {
        gResrow.targetTd.outerHeight(newHeight);
        $('#xcTable' + gResrow.tableNum + ' tbody tr:eq(' + row + ') td > div')
            .css('max-height', newHeight - padding);
    }
}

function gResrowMouseUp() {
    var newRowHeight = gResrow.targetTd.outerHeight();
    var rowNum = xcHelper.parseRowNum(gResrow.targetTd.parent()) + 1;
    var rowObj = gTables[gResrow.tableNum].rowHeights;
    // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
    var pageNum = Math.floor((rowNum - 1) / gNumEntriesPerPage);
    gMouseStatus = null;
    $('#row-resizeCursor').remove();
    reenableTextSelection();
    $('body').removeClass('hideScroll');
    $('#xcTable' + gResrow.tableNum + ' tr').removeClass('notDragging dragging');
    if (gTables[gActiveTableNum].resultSetCount !== 0) {
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
    gMouseStatus = "movingCol";
    var dragObj = gDragObj;
    var cursorStyle =
        '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}' +
        '</style>';
    $(document.head).append(cursorStyle);
    $('.highlightBox').remove();

    dragObj.mouseX = event.pageX;
    dragObj.colNum = xcHelper.parseColNum(el);
    var tableWrap = el.closest('.xcTableWrap');
    var $table = el.closest('.xcTable');
    var $tbodyWrap = $table.parent();
    var $editableHead = el.find('.editableHead');
    dragObj.table = tableWrap;
    dragObj.tableNum = parseInt(tableWrap.attr('id').substring(11));
    dragObj.element = el;
    dragObj.colIndex = parseInt(el.index());
    dragObj.offsetTop = el.offset().top;
    dragObj.grabOffset = dragObj.mouseX - el.offset().left;
    // dragObj.grabOffset = distance from the left side of dragged column
    // to the point that was grabbed

    dragObj.docHeight = $(document).height();
    dragObj.val = $editableHead.val();
    var shadowDivHeight = $tbodyWrap.height();
    var shadowTop = tableWrap.find('.header').position().top - 5;

    dragObj.inFocus = $editableHead.is(':focus');
    dragObj.selected = el.hasClass('selectedCell');
    dragObj.colWidth = el.width();
    dragObj.windowWidth = $(window).width();
    

    // create a fake transparent column by cloning
    createTransparentDragDropCol();
    
    $tbodyWrap.addClass('hideScroll');

    // create a replica shadow with same column width, height,
    // and starting position
    disableTextSelection();
    tableWrap.append('<div id="shadowDiv" style="width:' +
                    dragObj.colWidth +
                    'px;height:' + (shadowDivHeight) + 'px;left:' +
                    (dragObj.element.position().left) +
                    'px;top:' + shadowTop + 'px;"></div>');
    createDropTargets();

    var timer;
    if (gTables[dragObj.tableNum].tableCols.length > 50) {
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
    $('#shadowDiv, #fauxCol, #dropTargets, #moveCursor').remove();
    $('#mainFrame').off('scroll', mainFrameScrollDropTargets)
                   .scrollTop(0);
    reenableTextSelection();
    gDragObj.table.find('.xcTbodyWrap').removeClass('hideScroll');
    if (dragObj.inFocus) {
        dragObj.element.find('.editableHead').focus();
    }
    
    // only pull col if column is dropped in new location
    if ((dragObj.colIndex) !== dragObj.colNum) {
        // add sql
        var table = gTables[dragObj.tableNum];

        SQL.add("Change Column Order", {
            "operation"  : "changeColOrder",
            "tablename"  : table.tableName,
            "colName"    : table.tableCols[dragObj.colNum - 1].name,
            "oldColIndex": dragObj.colNum,
            "newColIndex": dragObj.colIndex
        });
        
        reorderAfterColumnDrop();
        Tips.refresh();
    }
}

function reorderAfterColumnDrop() {
    var dragObj  = gDragObj;
    var tableNum = dragObj.tableNum;
    var oldIndex = dragObj.colNum - 1;
    var newIndex = dragObj.colIndex - 1;

    ColManager.reorderCol(tableNum, oldIndex, newIndex);

    dragObj.table.find('.col' + dragObj.colNum)
                 .removeClass('col' + dragObj.colNum)
                 .addClass('colNumToChange');

    if (dragObj.colNum > dragObj.colIndex) {
        for (var i = dragObj.colNum; i >= dragObj.colIndex; i--) {
            dragObj.table.find('.col' + i)
                   .removeClass('col' + i)
                   .addClass('col' + (i + 1));
        }
    } else {
        for (var i = dragObj.colNum; i <= dragObj.colIndex; i++) {
            dragObj.table.find('.col' + i)
                   .removeClass('col' + i)
                   .addClass('col' + (i - 1));
        }
    }

    dragObj.table.find('.colNumToChange')
                 .addClass('col' + dragObj.colIndex)
                 .removeClass('colNumToChange');
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
    var td = $(obj).children();
    // var row = $("<tr></tr>");

    // var rowColor = $(obj).css('background-color');
    var clone = td.eq(dragObj.colIndex).clone();
    var cloneHeight = td.eq(dragObj.colIndex).outerHeight();
    var cloneColor = td.eq(dragObj.colIndex).css('background-color');
    // row.css('background-color', rowColor);
    clone.css('height', cloneHeight + 'px');
    clone.outerWidth(dragObj.colWidth);
    clone.css('background-color', cloneColor);
    var cloneHTML = clone[0].outerHTML;
    cloneHTML = '<tr>' + cloneHTML + '</tr>';
    return cloneHTML;
    // row.append(clone).appendTo($("#fauxTable"));
    // $('#fauxTable').append(cloneHTML);
}

function createTransparentDragDropCol() {
    var dragObj = gDragObj;
    $('#mainFrame').append('<div id="fauxCol" style="left:' +
                    dragObj.mouseX + 'px;' +
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
    var topPx = dragObj.table.find('.header').offset().top - rowHeight;
    var topRowIndex = -1;
    // var topRowTd = null;
    dragObj.table.find('tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowIndex = $(this).index();
            topRowEl = $(this).find('td');
            return (false);
        }
    });
     
    var cloneHTML = "";
    //XXX check to see if topRowEl was found;
    if (topRowIndex === -1) {
        console.log("BUG! Cannot find first visible row??");
        // Clone entire shit and be.then.
        dragObj.table.find('tr').each(function(i, ele) {
            cloneHTML += cloneCellHelper(ele);
        });
        $fauxTable.append(cloneHTML);
        return;
    }

    // Clone head
   
    dragObj.table.find('tr:first').each(function(i, ele) {
        cloneHTML += cloneCellHelper(ele);
    });
   
    if (dragObj.selected) {
        $fauxTable.addClass('selectedCol');
    }

    var totalRowHeight = dragObj.element
                                .closest('#xcTableWrap' + dragObj.tableNum)
                                .height() -
                                dragObj.table.find('th:first').outerHeight();
    var numRows = Math.ceil(totalRowHeight / rowHeight);

    dragObj.table.find('tr:gt(' + (topRowIndex) + ')').each(function(i, ele) {
        cloneHTML += cloneCellHelper(ele);
        if (i >= numRows + topRowIndex) {
            return (false);
        }
    });
    $fauxTable.append(cloneHTML);

    // Ensure rows are offset correctly
    var fauxTableHeight = $fauxTable.height() +
                          $fauxTable.find('tr:first').outerHeight();

    var xcTableWrap0Height = $('#xcTableWrap' + dragObj.tableNum).height();
    var fauxColHeight = Math.min(fauxTableHeight, xcTableWrap0Height - 36);
    dragObj.fauxCol.height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx - rowHeight;
    $fauxTable.css('margin-top', firstRowOffset);
    $fauxTable.find('tr:first-child').css({'margin-top':
            -($fauxTable.find('tr:first').outerHeight() + firstRowOffset - 5)});
}

function createDropTargets(dropTargetIndex, swappedColIndex) {
    var dragObj = gDragObj;
    var dragMargin = 30;
    var colLeft;
    // targets extend this many pixels to left of each column
   
    if (!dropTargetIndex) {
        // create targets that will trigger swapping of columns on hover
        var dropTargets = "";
        var i = 0;
        dragObj.table.find('tr:first th').each(function() {
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
        // may have issues with table left if dragObj.table isn't correct
        var tableLeft = dragObj.table[0].getBoundingClientRect().left +
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
        var swappedCol = dragObj.table.find('th:eq(' + swappedColIndex + ')');
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
        dragObj.table.find('tr').each(function() {
            $(this).children(':eq(' + dropTargetId + ')').after(
                $(this).children(':eq(' + nextCol + ')')
            );
        });
        movedCol = nextCol;
    } else {
        dragObj.table.find('tr').each(function() {
            $(this).children(':eq(' + dropTargetId + ')').before(
                $(this).children(':eq(' + prevCol + ')')
            );
        });
        movedCol = prevCol;
    }

    // XXX weird hack hide show or else .header won't reposition itself
    dragObj.table.find('.header').css('height', '39px');
    setTimeout(function() {
        dragObj.table.find('.header').css('height', '40px');
    }, 0);
    
    var left = dragObj.element.position().left;
    $('#shadowDiv').css('left', left);
    dragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function gRescolDelWidth(colNum, tableNum) {
    var table = $('#xcTable' + tableNum);
    var oldTableWidth = table.width();
    if (oldTableWidth < gMinTableWidth) {
        var lastTd = table.find('tr:first th').length - 1;
        var lastTdWidth = table.find('.th.col' + lastTd).width();

        table.find('thead:last .th.col' + lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth));
    }
    matchHeaderSizes(colNum, $('#xcTable' + tableNum));
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
    var tableNum = xcHelper.parseTableNum($table);
    var includeHeader = options.includeHeader || false;
    // var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || (gRescol.cellMinWidth - 10);

    
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var newWidth = Math.max(widestTdWidth, minWidth);
    // dbClick is autoSized to a fixed width
    if (!options.dbClick) {
        var originalWidth = gTables[tableNum].tableCols[index - 1].width;
        newWidth = Math.max(newWidth, originalWidth);
    }
    if (!options.unlimitedWidth) {
        var maxWidth = 700;
        newWidth = Math.min(newWidth, maxWidth);
    }
    
    el.outerWidth(newWidth);
    if ($table.attr('id').indexOf('xc') > -1) {
        gTables[tableNum].tableCols[index - 1].width = el.outerWidth();
    }
    matchHeaderSizes(index, $table);
}

function getWidestTdWidth(el, options) {
    options = options || {};

    var includeHeader = options.includeHeader || false;
    var id = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 10;
    var largestTd = $table.find('tbody tr:first td:eq(' + (id) + ')');
    var headerWidth = 0;

    $table.find('tbody tr').each(function() {
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var td = $(this).children(':eq(' + (id) + ')');
        textLength = $.trim(td.text()).length;
        if (textLength > longestText) {
            longestText = textLength;
            largestTd = td;
        }
    });

    largestWidth = getTextWidth(largestTd);

    if (includeHeader) {
        var th = $table.find('.col' + id + ' .editableHead');
        var extraPadding = 48;
        headerWidth = getTextWidth(th) + extraPadding;
        if (headerWidth > largestWidth) {
            largestWidth = headerWidth;
        }
    }
    largestWidth += padding;
    return (largestWidth);
}

function getTdHeights() {
    var tdHeights = [];
    $(".xcTable tbody tr").each(function() {
        tdHeights.push($(this).children().eq(0).outerHeight());
    });
    return (tdHeights);  
}

function dblClickResize(el, options) {
    gRescol.clicks++;  //count clicks
    if (gRescol.clicks === 1) {
        gRescol.timer = setTimeout(function() {   
            gRescol.clicks = 0; //after action performed, reset counter
        }, gRescol.delay);
    } else {
        gMouseStatus = null;
        reenableTextSelection();

        var resize;
        if (el.closest('tHead').index() === 0) {
            resize = true;
        } else {
            resize = false;
        }

        var minWidth;
        if (options && options.minWidth) {
            minWidth = options.minWidth;
        } else {
            minWidth = 17;
        }
        autosizeCol(el.parent().parent(), {
            "resizeFirstRow": resize,
            "dbClick"       : true,
            "minWidth"      : minWidth,
            "unlimitedWidth": true
        });
        $('#col-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
    }
}

function createTableHeader(tableNum) {
    var $xcTheadWrap = $('<div id="xcTheadWrap' + tableNum +
                         '" class="xcTheadWrap dataTable" ' +
                         'style="top:0px;"></div>');

    $('#xcTableWrap' + tableNum).prepend($xcTheadWrap);

    var tableName = "";
    // XXX build this table title somewhere else
    if (gTables[tableNum] != null) {
        tableName = gTables[tableNum].tableName;
    }

    var html = '<div class="tableTitle">' +
                    '<div class="tableGrab"></div>' +
                    '<div class="text" spellcheck="false" contenteditable></div>' +
                    '<div class="dropdownBox">' +
                        '<span class="innerBox"></span>' +
                    '</div>' +
                '</div>';

    $xcTheadWrap.prepend(html);
    // XXX Format is tablename  [cols]
    updateTableHeader(tableNum);

    var newTableName = xcHelper.randName(tableName, undefined, true);
    var tableMenuHTML =
        '<ul id="tableMenu' + tableNum +
            '" class="colMenu tableMenu" >' +
            '<li class="archiveTable">Archive Table</li>' +
            '<li class="hideTable">Hide Table</li>' +
            '<li class="unhideTable">Unhide Table</li>' +
            '<li class="deleteTable">Delete Table</li>' +
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

    $('#xcTableWrap' + tableNum).append(tableMenuHTML);
    var $tableMenu = $('#tableMenu' + tableNum);
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
        "focus": function() {
            updateTableHeader(null, $(this), true);
        },
        "blur": function() {
            updateTableHeader(null, $(this));
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

    $xcTheadWrap.on('mousedown', '.tableTitle > .dropdownBox', function(event) {
        if (event.which !== 1) {
            return;
        }
        dropdownClick($(this), {"type": "tableDropdown"});
    });

    // Change from $xcTheadWrap.find('.tableGrab').mosedown...
    $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
        // Not Mouse down
        if (event.which !== 1) {
            return;
        }
        dragTableMouseDown($(this).parent(), event);
    });

    var $table = $('#xcTable' + tableNum);
    $table.width(0);
    var matchAllHeaders = true;
    matchHeaderSizes(null, $table, matchAllHeaders);
}

function addTableMenuActions($tableMenu) {

    $tableMenu.on('mouseup', '.archiveTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        var tableName = gTables[tableNum].tableName;

        archiveTable(tableNum, DeleteTable.Keep);
        // add sql
        SQL.add('Archive Table', {
            "operation": "archiveTable",
            "tableName": tableName
        });
    });

    $tableMenu.on('mouseup', '.hideTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $('#xcTableWrap' + tableNum).addClass('tableHidden');
        moveTableDropdownBoxes();
        moveFirstColumn();
    });

    $tableMenu.on('mouseup', '.unhideTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $('#xcTableWrap' + tableNum).removeClass('tableHidden');
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableNum);
        moveTableDropdownBoxes();
        moveFirstColumn();
        var $table = $('#xcTable' + tableNum);
        $table.find('.rowGrab').width($table.width());
    });

    $tableMenu.on('mouseup', '.deleteTable', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        var tableName = gTables[tableNum].tableName;

        var msg = "Are you sure you want to delete table " + tableName + "?";
        Alert.show({
            "title"     : "DELETE TABLE",
            "msg"       : msg,
            "isCheckBox": true,
            "confirm"   : function() {
                deleteActiveTable(tableNum)
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
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        var tableName = gTables[tableNum].tableName;

        ExportModal.show(tableName);
        // xcFunction.exportTable(tableNum);
    });

    $tableMenu.on('mouseup', '.delAllDuplicateCols', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        var columns = gTables[tableNum].tableCols;

        for (var i = 0; i < columns.length; i++) {
            if (columns[i].func.func && columns[i].func.func === "raw") {
                continue;
            } else {
                var forwardCheck = true;
                ColManager.delDupCols(i + 1, tableNum, forwardCheck);
            }     
        }
    });

    $tableMenu.on('mouseup', '.aggregates', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        AggModal.show(tableNum, 'aggregates');
    });

    $tableMenu.on('mouseup', '.correlation', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        AggModal.show(tableNum, 'correlation');
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
            var tableNum = parseInt($menu.attr('id').substring(9));
            var wsIndex  = $option.data("worksheet");

            WSManager.moveTable(tableNum, wsIndex);

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
            var tableNum = parseInt($menu.attr('id').substring(9));
            var table    = gTables[tableNum];
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
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableNum, "forward");
        }, 0);
        
    });

    $tableMenu.on('mouseup', '.sortReverse', function(event) {
        if (event.which !== 1) {
            return;
        }
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        // could be long process so we allow the menu to close first
        setTimeout(function() {
            sortAllTableColumns(tableNum, "reverse");
        }, 0);
        
    });
}

function sortAllTableColumns(tableNum, direction) {
    var tableCols = gTables[tableNum].tableCols;
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
    var $table = $('#xcTable' + tableNum);
    var $rows = $table.find('tbody tr');
    var numRows = $rows.length;
    // loop through each column
    for (var i = 0; i < numCols; i++) {
        var oldColIndex = tableCols[i].index;
        var newColIndex = i + 1;
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
        var oldColIndex = tableCols[i].index;
        var newIndex = i + 1;
        $ths.eq(newIndex).removeClass('col' + oldColIndex)
                                   .addClass('col' + newIndex);
        tableCols[i].index = newIndex;
    }

    RightSideBar.updateTableInfo(gTables[tableNum]);
}

function renameTableHead($div) {
    var newTableName = jQuery.trim($div.text());
    var tableNum = parseInt($div.closest('.xcTheadWrap')
                                  .attr('id').substr(11));
    var oldTableName = gTables[tableNum].tableName;
    if (newTableName === oldTableName) {
        $div.blur();
        return;
    }

    // in case hash tag is deleted
    var oldHashIndex = oldTableName.indexOf("#");
    if (oldHashIndex >= 0 && newTableName.indexOf("#") < 0) {
        newTableName = $div.find(".tableName").text();
        newTableName += oldTableName.substring(oldHashIndex);
    }

    xcHelper.checkDuplicateTableName(newTableName)
    .then(function() {
        return (xcFunction.rename(tableNum, oldTableName, newTableName));
    })
    .then(function() {
        updateTableHeader(null, $div);
        $div.blur();
    })
    .fail(function() {
        $div.text(oldTableName);
        var text = 'The name "' + newTableName + '" is already ' +
                           ' in use. Please select a unique name.';
        StatusBox.show(text, $div, false);
    });
}

function updateTableHeader(tableNum, $tHead, isFocus) {
    var wholeTableName = "";
    var cols = 0;

    $tHead = $tHead || $("#xcTheadWrap" + tableNum + " .tableTitle .text");
    // for blur and focus on table header
    if (tableNum == null) {
        cols = $tHead.data("cols");
        wholeTableName = $tHead.data("title");
    } else {
        // for update table header
        if (gTables[tableNum] != null) {
            wholeTableName = gTables[tableNum].tableName;
            cols = gTables[tableNum].tableCols.length;
        }
        isFocus = false;
        $tHead.data("cols", cols);
        $tHead.data("title", wholeTableName);
    }

    wholeTableName = wholeTableName.split("#");

    var tableName = wholeTableName[0];

    if (wholeTableName.length === 2) {
        tableName =
            '<span class="tableName">' + tableName + '</span>' +
            '<span class="hashName" contenteditable="false">#' +
                wholeTableName[1] +
            '</span>';
    }

    if (isFocus) {
        $tHead.html(tableName);
        xcHelper.createSelection($tHead.find(".tableName")[0]);
    } else {
        $tHead.html(tableName + "  [" + cols + "]");
    }
}

function matchHeaderSizes(colNum, $table, matchAllHeaders) {
    // concurrent build table may make some $table be []
    if ($table.length === 0) {
        return;
    }
    var $header;
    var headerWidth;

    if (matchAllHeaders) {
        var numCols = $table.find('th').length;
        var $theadRow = $table.find('thead tr');
        for (var i = 0; i < numCols; i++) {
            $header = $theadRow.find('th.col' + i);
            headerWidth = $header.outerWidth();
            $header.children().outerWidth(headerWidth);
        }
    } else {
        $header = $table.find('th.col' + colNum);
        headerWidth = $header.outerWidth();
        $header.children().outerWidth(headerWidth);
    }

    var tableNum = $table.attr('id').slice(7);
    var tableWidth = $table.width();
    $theadWrap = $('#xcTheadWrap' + tableNum);
    $theadWrap.width(tableWidth);

    $theadWrap.find('.text').width(tableWidth - 30);
    moveTableDropdownBoxes();
}

function addColListeners($table, tableNum) {
    var $thead = $table.find('thead tr');
    var $tbody = $table.find("tbody");
    var $colMenu = $('#colMenu' + tableNum);

    // listeners on thead
    var $fnBar = $('#fnBar');
    $thead.on({
        "focus": function() {
            var $colInput   = $(this);
            var dynTableNum = parseInt($colInput.closest('.dataTable').attr('id')
                                        .substring(7));

            $fnBar.addClass('active');
            focusTable(dynTableNum);

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

            var colNum = xcHelper.parseColNum($colInput);
            var userStr = gTables[dynTableNum].tableCols[colNum - 1].userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            $fnBar.val(userStr);

            highlightColumn(gFnBarOrigin);
        },
        "blur": function() {
            $fnBar.removeClass('active');
        }
    }, ".editableHead");

    $thead.on("mousedown", ".header .flex-right > .dropdownBox", function() {
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
        if ($th.width() === 10) {
            // column is hidden
            options.classes += " type-hidden";
        }

        if ($el.closest('.xcTable').hasClass('emptyTable')) {
            options.classes += " type-emptyTable";
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

    //listeners on tbody
    $tbody.on("mousedown", "td", function(event) {
        var $td = $(this);
        if (event.which !== 1 || $td.children('.clickable').length === 0) {
            return;
        }
        var $el = $td.children('.clickable');
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
            "mouseCoors": {x: event.pageX, y: yCoor}
        });
        if ($td.children('.highlightBox').length !== 0) {
            $('.highlightBox').remove();
            return;
        }
        highlightCell($td);
    });

    addColMenuBehaviors($colMenu);
    addColMenuActions($colMenu);
}

function highlightCell($td) {
    // draws a new div positioned where the cell is, intead of highlighting
    // the actual cell
    var border = 5;
    var width = $td.outerWidth() - border;
    var height = $td.outerHeight();
    var left = $td.offset().left;
    var top = $td.offset().top;
    var styling = 'width:' + width + 'px;' +
                  'height:' + height + 'px;' +
                  'left:' + left + 'px;' +
                  'top:' + top + 'px;';
    var highlightBox = '<div id="highlightBox" class="highlightBox" ' +
                            'style="' + styling + '">' +
                        '</div>';
    $td.append(highlightBox);
    $('#highlightBox').mousedown(function(){
        $('.highlightBox').remove();
    });
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
        if ($(this).children('.subColMenu, input').length === 0 &&
            !$(this).hasClass('unavailable') &&
            $(this).closest('.clickable').length === 0) {
            // hide li if doesnt have a submenu or an input field
            closeMenu($colMenu);
        }
    });

    // the following behavior isn't great...
    // $colMenu.on('mouseup', 'input', function() {
    //     $(this).select();
    // });
}

function addColMenuActions($colMenu) {

    $colMenu.on('mouseup', '.addColumns', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        var index = 'col' + colNum;
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var tableId = "xcTable" + tableNum;

        // add sql
        var table = gTables[tableNum];
        var sqlOptions = {
            "operation"   : "addCol",
            "tableName"   : table.tableName,
            "newColName"  : "",
            "siblColName" : table.tableCols[colNum - 1].name,
            "siblColIndex": colNum
        };

        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
            sqlOptions.direction = "L";
        } else {
            sqlOptions.direction = "R";
        }

        ColManager.addCol(index, tableId, null,
                         {direction: direction, isNewCol: true, inFocus: true});

        SQL.add("Add Column", sqlOptions);
    });

    $colMenu.on('mouseup', '.deleteColumn', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.delCol(colNum, tableNum);
    });

    $colMenu.on('mouseup', '.deleteDuplicates', function(event) {
        if (event.which !== 1) {
            return;
        }
        var index    = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.delDupCols(index, tableNum);
    });

    $colMenu.on('keypress', '.renameCol input', function(event) {
        if (event.which === keyCode.Enter) {
            var $input  = $(this);
            var colName  = $input.val().trim();

            if (colName === "") {
                return false;
            }

            var tableNum = parseInt($colMenu.attr('id').substring(7));
            var colNum   = $colMenu.data('colNum');

            renameColumn(tableNum, colNum, colName);
            $input.val("").blur();
            closeMenu($colMenu);
        }
    });

    $colMenu.on('mouseup', '.duplicate', function(event) {
        if (event.which !== 1) {
            return;
        }
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var table = $('#xcTable' + tableNum);
        var name = table.find('.editableHead.col' + index).val();
        var width = table.find('th.col' + index).outerWidth();
        var isNewCol = table.find('th.col' + index).hasClass('unusedCell');

        ColManager.addCol('col' + index, table.attr('id'), name, {
                          "width"   : width,
                          "isNewCol": isNewCol});
        // add sql
        SQL.add("Duplicate Column", {
            "operation": "duplicateCol",
            "tableName": gTables[tableNum].tableName,
            "colName"  : name,
            "colIndex" : index
        });

        gTables[tableNum].tableCols[index].func.func =
            gTables[tableNum].tableCols[index - 1].func.func;
        gTables[tableNum].tableCols[index].func.args =
            gTables[tableNum].tableCols[index - 1].func.args;
        gTables[tableNum].tableCols[index].userStr =
            gTables[tableNum].tableCols[index - 1].userStr;

        ColManager.execCol(gTables[tableNum].tableCols[index], tableNum)
        .then(function() {
            updateTableHeader(tableNum);
            RightSideBar.updateTableInfo(gTables[tableNum]);
        });
    });

    $colMenu.on('mouseup', '.hide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.hideCol(colNum, tableNum);
        
    });

    $colMenu.on('mouseup', '.unhide', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.unhideCol(colNum, tableNum, {autoResize: true});
    });

    $colMenu.on('mouseup', '.textAlign', function(event) {
        if (event.which !== 1) {
            return;
        }
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.textAlign(colNum, tableNum, $(this).attr("class"));
    });

    $colMenu.on('mouseup', '.typeList', function(event) {
        if (event.which !== 1) {
            return;
        }
        changeColumnType($(this));
    });

    /// added back in
    $colMenu.on('mouseup', '.sort .sort', function(event) {
        if (event.which !== 1) {
            return;
        }
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        xcFunction.sort(index, tableNum, SortDirection.Forward);
    });
    
    $colMenu.on('mouseup', '.sort .revSort', function(event) {
        if (event.which !== 1) {
            return;
        }
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        xcFunction.sort(index, tableNum, SortDirection.Backward);
    });

    $colMenu.on('mouseup', '.joinList', function(event) {
        if (event.which !== 1) {
            return;
        }
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var colNum   = $colMenu.data('colNum');

        JoinModal.show(tableNum, colNum);
    });

    $colMenu.on('mouseup', '.functions', function(event) {
        if (event.which !== 1 || $(this).hasClass('unavailable')) {
            return;
        }
        var colNum = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var func = $(this).text().replace(/\./g, '');
        OperationsModal.show(tableNum, colNum, func);
    });

    $colMenu.on('mouseup', '.tdFilter, .tdExclude', function(event) {
        var $li =  $(this);

        if (event.which !== 1 || $li.hasClass('unavailable')) {
            return;
        }

        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var rowNum   = $colMenu.data('rowNum');
        var colNum   = $colMenu.data('colNum');

        var $table  = $("#xcTable" + tableNum);
        var $header = $table.find("th.col" + colNum + " .header");
        var $td     = $table.find(".row" + rowNum + " .col" + colNum);

        var colName = gTables[tableNum].tableCols[colNum - 1].func.args[0];
        var colVal  = $td.find(".addedBarTextWrap").text();

        if ($header.hasClass("type-integer")) {
            colVal = parseInt(colVal);
        } else if ($header.hasClass("type-string")){
            colVal = '\"' + colVal + '\"';
        } else {
            return;
        }

        var filterStr = $li.hasClass("tdFilter") ?
                            'eq(' + colName + ', ' + colVal + ')' :
                            'not(eq(' + colName + ', ' + colVal + '))';

        var options = {"operator"    : "eq",
                       "filterString": filterStr};

        xcFunction.filter(colNum - 1, tableNum, options);
    });
}

function closeMenu($menu) {
    $menu.hide();
    $('body').removeClass('noSelection');
}

function renameColumn(tableNum, colNum, newName) {
    gTables[tableNum].tableCols[colNum - 1].name = newName;
    $('#xcTable' + tableNum).find('.editableHead.col' + colNum).val(newName);
}

function functionBarEnter($colInput) {
    gFnBarOrigin = $colInput;

    var $fnBar = $('#fnBar').removeClass('inFocus');

    var $table = $colInput.closest('.dataTable');
    var tableNum = parseInt($table.attr('id').substring(7));
    var colNum = xcHelper.parseColNum($colInput);
    var tableCol = gTables[tableNum].tableCols[colNum - 1];

    var colName = tableCol.name;

    var newFuncStr = '"' + colName + '" ' + $fnBar.val().trim();
    var oldUsrStr  = tableCol.userStr;

    $colInput.blur();
    // when usrStr not change
    if (newFuncStr === oldUsrStr) {
        return;
    }

    $colInput.closest('th').removeClass('unusedCell');
    $table.find('td:nth-child(' + colNum + ')').removeClass('unusedCell');

    var progCol = parseFunc(newFuncStr, colNum, tableNum, true);
    // add sql
    SQL.add("Pull Column", {
        "operation": "pullCol",
        "tableName": gTables[tableNum].tableName,
        "colName"  : progCol.name,
        "colIndex" : progCol.index
    });

    ColManager.execCol(progCol, tableNum)
    .then(function() {
        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(gTables[tableNum]);
    });
}

function parseFunc(funcString, colId, tableNum, modifyCol) {
    // Everything must be in a "name" = function(args) format
    var open   = funcString.indexOf("\"");
    var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
    var name   = funcString.substring(open + 1, close);
    var funcSt = funcString.substring(funcString.indexOf("=") + 1);
    var progCol;

    if (modifyCol) {
        progCol = gTables[tableNum].tableCols[colId - 1];
    } else {
        progCol = ColManager.newCol();
    }
    // console.log(progCol)
    progCol.userStr = funcString;
    progCol.name = name;
    progCol.func = cleanseFunc(funcSt);
    progCol.index = colId;

    return (progCol);
}

function cleanseFunc(funcString) {
    // funcString should be: function(args)
    var open     = funcString.indexOf("(");
    var close    = funcString.lastIndexOf(")");
    var funcName = jQuery.trim(funcString.substring(0, open));
    var args     = (funcString.substring(open + 1, close)).split(",");

    for (var i = 0; i < args.length; i++) {
        args[i] = jQuery.trim(args[i]);
    }

    return ({func: funcName, args: args});
}

function dropdownClick($el, options) {
    options = options || {};

    if (!options.type) {
        console.error("Wrong dropdownClick call");
        return;
    }

    var tableNum = parseInt($el.closest(".xcTableWrap").attr("id")
                            .substring(11));
    var $menu;

    if (options.type === "tableDropdown") {
        $menu = $("#tableMenu" + tableNum);

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
        $menu = $("#colMenu" + tableNum);
        // case that should close column menu
        if ($menu.is(":visible") && $menu.data("colNum") === options.colNum
            && !$menu.hasClass('tdMenu')) {
            $menu.hide();
            return;
        }

        // XXX Use CSS to show the options

    } else if (options.type === "tdDropdown") {
        $menu = $("#colMenu" + tableNum);
        // case that should close column menu
        if ($menu.is(":visible") &&
            $menu.data("colNum") === options.colNum &&
            $menu.data("rowNum") === options.rowNum)
        {
            $menu.hide();
            return;
        }
    }
    $('.highlightBox').remove();
    $(".colMenu:visible").hide();
    $(".leftColMenu").removeClass("leftColMenu");
    // case that should open the menu (note that colNum = 0 may make it false!)
    if (options.colNum != null && options.colNum > -1) {
        $menu.data("colNum", options.colNum);
    } else {
        $menu.removeData("colNum");
    }

    if (options.colNum != null && options.rowNum > -1) {
        $menu.data("rowNum", options.rowNum);
    } else {
        $menu.removeData("rowNum");
    }

    if (options.classes != null) {
        var className = options.classes.replace("header", "");
        $menu.attr("class", "colMenu " + className);
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

    $menu.css({"top": top, "left": left})
        .show();

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

function changeColumnType($typeList) {
    var newType  = $typeList.find(".label").text().toLowerCase();
    var $colMenu = $typeList.closest('.colMenu');
    var colNum   = $colMenu.data('colNum');
    var tableNum = parseInt($colMenu.attr('id').substring(7));
    var colName = gTables[tableNum].tableCols[colNum - 1].func.args[0];
    var mapStr = "";
    var newColName = colName + "_" + newType;
    // var tableName = gTables[tableNum].tableName;
    switch (newType) {
    case ("boolean"):
        mapStr += "bool(";
        break;
    case ("decimal"):
        mapStr += "float(";
        break;
    case ("integer"):
        mapStr += "int(";
        break;
    case ("string"):
        mapStr += "string(";
        break;
    default:
        console.log("XXX no such operator! Will guess");
        mapStr += newType + "(";
    }

    mapStr += colName + ")";
    var options = {replaceColumn: true};
    xcFunction.map(colNum, tableNum, newColName, mapStr, options);
}


function resetColMenuInputs($el) {
    var tableNum = parseInt($el.closest('.xcTableWrap').attr('id')
                       .substring(11));
    var $menu = $('#colMenu' + tableNum);
    $menu.find('.gb input').val("groupBy");
    $menu.find('.numFilter input').val(0);
    $menu.find('.strFilter input').val("");
    $menu.find('.mixedFilter input').val("");
    $menu.find('.regex').next().find('input').val("*");
}

function highlightColumn(el) {
    var index    = xcHelper.parseColNum(el);
    var tableNum = parseInt(el.closest('.dataTable').attr('id').
                       substring(7));
    var $table   = $('#xcTable' + tableNum);
    $('.selectedCell').removeClass('selectedCell');
    $table.find('th.col' + index).addClass('selectedCell');
    $table.find('td.col' + index).addClass('selectedCell');
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
        var tableNum = parseInt($(this).closest('table').attr('id')
                .substring(7));
        var rowNum = parseInt($(this).closest('tr').attr('class').substring(3));
        if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
            bookmarkRow(rowNum, tableNum);
        } else {
            unbookmarkRow(rowNum, tableNum);
        }
    });
}

function adjustRowHeights(newCells, rowIndex, tableNum) {
    var rowObj = gTables[tableNum].rowHeights;
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
                
                $row.find('td.col0')
                    .outerHeight(rowObj[i][row]);
                $row.find('td > div')
                    .css('max-height', rowObj[i][row] - padding);
                $row.addClass('changedHeight');
            }
        }
    }
}

function addTableListeners(tableNum) {
    $('#xcTableWrap' + tableNum).mousedown(function() {
        var dynTableNum = parseInt($(this).closest('.tableWrap').attr('id')
                       .substring(11));
        if (gActiveTableNum === dynTableNum) {
            return;
        } else {
            gActiveTableNum = dynTableNum;
            focusTable(dynTableNum);
        }
    }).scroll(function() {
        $(this).scrollLeft(0); // prevent scrolling when colmenu is open
        $(this).scrollTop(0); // prevent scrolling when colmenu is open
    });
}

function moveTableDropdownBoxes() {
    var mainFrameScrollLeft = $('#mainFrame').scrollLeft();
    var $startingTableHead;

    $('.xcTableWrap:not(".inActive")').each(function() {
        if ($(this)[0].getBoundingClientRect().right > 0) {
            $startingTableHead = $(this).find('.xcTheadWrap');
            return false;
        }
    });

    if ($startingTableHead && $startingTableHead.length > 0) {
        var tablesAreVisible = true;
    } else {
        var tablesAreVisible = false;
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

function focusTable(tableNum) {
    var tableName = gTables[tableNum].tableName;
    if (WSManager.getWSFromTable(tableName) !== WSManager.getActiveWS())
    {
        console.log("Table not in current worksheet");
        return;
    }

    $('#mainFrame').find('.tableTitle').removeClass('tblTitleSelected');
    $('#xcTheadWrap' + tableNum).find('.tableTitle')
        .addClass('tblTitleSelected');
    gActiveTableNum = tableNum;
    RowScroller.update(tableNum);
    if (gTables[tableNum].resultSetCount === 0) {
        $('#rowInput').val(0).data('val', 0);
    } else {
        generateFirstVisibleRowNum();
    }
    Tips.refresh();
}

function isTableScrollable(tableNum) {
    var tHeadHeight = $('#xcTheadWrap' + tableNum).height();
    var tBodyHeight = $('#xcTable' + tableNum).height();
    var tableWrapHeight = $('#xcTableWrap' + tableNum).height();

    return ((tHeadHeight + tBodyHeight) >= (tableWrapHeight));
}

function bookmarkRow(rowNum, tableNum) {
    //XXX allow user to select color in future?
    var td = $('#xcTable' + tableNum + ' .row' + rowNum + ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('title', 'bookmarked');
    RowScroller.addBookMark(rowNum, tableNum);
    if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
        gTables[tableNum].bookmarks.push(rowNum);
    }
}

function unbookmarkRow(rowNum, tableNum) {
    var td = $('#xcTable' + tableNum + ' .row' + rowNum + ' .col0');
    td.removeClass('rowBookmarked');
    td.find('.idSpan').attr('title', '');
    RowScroller.removeBookMark(rowNum, tableNum);
    var index = gTables[tableNum].bookmarks.indexOf(rowNum);
    gTables[tableNum].bookmarks.splice(index, 1);
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
    dragObj.table = el.closest('.xcTableWrap');
    dragObj.tableIndex = parseInt(dragObj.table.attr('id').substring(11));
    dragObj.originalIndex = dragObj.tableIndex;
    dragObj.mainFrame = $('#mainFrame');
    var rect = dragObj.table[0].getBoundingClientRect();

    dragObj.offsetLeft = dragObj.table.offset().left;
    dragObj.prevTable = dragObj.table.prev();
    dragObj.mouseOffset = dragObj.mouseX - rect.left;
    dragObj.docHeight = $(document).height();
    dragObj.tableScrollTop = dragObj.table.scrollTop();

    var cursorStyle =
        '<style id="moveCursor" type="text/css">*' +
            '{cursor:move !important; cursor: -webkit-grabbing !important;' +
            'cursor: -moz-grabbing !important;}' +
        '</style>';

    $(document.head).append(cursorStyle);
    createShadowTable();
    sizeTableForDragging();
    dragObj.table.addClass('tableDragging');
    dragObj.table.css('left', dragObj.offsetLeft + 'px');
    dragObj.windowWidth = $(window).width();
    dragObj.pageX = e.pageX;
    dragObj.table.scrollTop(dragObj.tableScrollTop);
    dragObj.table.find('.idSpan').css('left', 0);
    dragObj.table.find('th.rowNumHead input').css('left', 0);
    createTableDropTargets();
    dragdropMoveMainFrame(dragObj, 50);
    disableTextSelection();
}
    
function dragTableMouseMove(e) {
    var dragObj = gDragObj;
    var left =  e.pageX - dragObj.mouseOffset;
    dragObj.table.css('left', left + 'px');
    dragObj.pageX = e.pageX;
}

function dragTableMouseUp() {
    var dragObj = gDragObj;

    gMouseStatus = null;
    dragObj.table.removeClass('tableDragging').css({
        'left'  : '0px',
        'height': '100%'
    });
    $('#shadowTable, #moveCursor, #dropTargets').remove();
    $('#mainFrame').off('scroll', mainFrameScrollTableTargets);
    dragObj.table.scrollTop(dragObj.tableScrollTop);
    gActiveTableNum = dragObj.tableIndex;
    reenableTextSelection();

    if (dragObj.tableIndex !== dragObj.originalIndex) {
        // reorder only if order changed
        reorderAfterTableDrop();
    }
    moveTableDropdownBoxes();
    moveFirstColumn();
}

function createShadowTable() {
    // var rect = gDragObj.table[0].getBoundingClientRect();
    var $mainFrame = $('#mainFrame');
    var width = gDragObj.table.children().width();
    var tableHeight = gDragObj.table.find('.xcTheadWrap').height() +
                      gDragObj.table.find('.xcTbodyWrap').height();
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

function createTableDropTargets(dropTargetIndex, oldIndex, swappedTable) {
    var offset = gDragObj.mouseX - gDragObj.offsetLeft;
    var dragMargin = 10;
    var tableLeft;

    if (!swappedTable) {
        var dropTargets = "";
        var i = 0;
        var tableWidth = gDragObj.table.width();

        $('#mainFrame').find('.xcTableWrap').each(function() {
            if (i === gDragObj.tableIndex) {
                i++;
                return true;  
            }

            var targetWidth;
            if ((tableWidth - dragMargin) <
                Math.round(0.5 * $(this).outerWidth()))
            {
                targetWidth = tableWidth;
            } else {
                targetWidth = Math.round(0.5 * $(this).outerWidth()) +
                                dragMargin;
            }

            tableLeft = $(this).position().left + $('#mainFrame').scrollLeft();
            dropTargets += '<div id="dropTarget' + i + '" class="dropTarget"' +
                            'style="left:' + (tableLeft - dragMargin + offset) +
                            'px;' + 'width:' + targetWidth + 'px;height:' +
                            (gDragObj.docHeight) + 'px;">' +
                                i +
                            '</div>';
            i++;
        });

        tableLeft = -$('#mainFrame').scrollLeft();
        $('body').append('<div id="dropTargets" style="left:' +
                            tableLeft + 'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapTables($(this));
        });
        $('#mainFrame').scroll(mainFrameScrollTableTargets);
    } else {
        tableLeft = swappedTable.position().left + $('#mainFrame').scrollLeft();
        $('#dropTarget' + dropTargetIndex).attr('id', 'dropTarget' + oldIndex);
        $('#dropTarget' + oldIndex).css({
            'left': (tableLeft - dragMargin + offset) + 'px'});
    }
}

function mainFrameScrollTableTargets() {
    var left = $('#mainFrame').scrollLeft();
    $("#dropTargets").css('left', '-' + left + 'px');
}

function dragdropSwapTables(el) {
    var dropTargetIndex = parseInt((el.attr('id')).substring(10));
    var table = $('#xcTableWrap' + dropTargetIndex);
    // var tableScrollTop = table.scrollTop();

    if (dropTargetIndex > gDragObj.tableIndex) {
        table.after($('#shadowTable'));
        table.after(gDragObj.table);
    } else {
        table.before($('#shadowTable'));
        table.before(gDragObj.table);
    }

    gDragObj.table.scrollTop(gDragObj.tableScrollTop);

    gDragObj.table.attr('id', 'xcTableWrap' + dropTargetIndex);
    gDragObj.table.find('.xcTheadWrap').attr('id',
                                             'xcTheadWrap' + dropTargetIndex);
     
    table.attr('id', 'xcTableWrap' + gDragObj.tableIndex);
    table.find('.xcTheadWrap').attr('id', 'xcTheadWrap' + gDragObj.tableIndex);
    
    var oldIndex = gDragObj.tableIndex;
    gDragObj.tableIndex = dropTargetIndex;
    createTableDropTargets(dropTargetIndex, oldIndex, table);
}

function sizeTableForDragging() {
    var tableHeight = $('#shadowTable').height();
    gDragObj.table.height(tableHeight);
}

function reorderAfterTableDrop() {

    var tempTable = gTables.splice(gDragObj.originalIndex, 1)[0];
    gTables.splice(gDragObj.tableIndex, 0, tempTable);
    
    // reorder rowScrollers
    var rowScroller = $('#rowScroller' + gDragObj.originalIndex);
    var $dagWrap = $('#dagWrap' + gDragObj.originalIndex);

    if (gDragObj.tableIndex === 0) {
        $('#rowScrollerArea').prepend(rowScroller);
        $('.dagArea').prepend($dagWrap);
    } else if (gDragObj.originalIndex < gDragObj.tableIndex) {
        $('#rowScroller' + gDragObj.tableIndex).after(rowScroller);
        $('#dagWrap' + gDragObj.tableIndex).after($dagWrap);
    } else if (gDragObj.originalIndex > gDragObj.tableIndex) {
        $('#rowScroller' + gDragObj.tableIndex).before(rowScroller);
        $('#dagWrap' + gDragObj.tableIndex).before($dagWrap);
    }

    // correct table and rowscroller id numbers
    var rowScrollers = $('.rowScroller');
    var $dagWraps = $('.dagWrap');
    var start = Math.min(gDragObj.originalIndex, gDragObj.tableIndex);
    var end = Math.max(gDragObj.originalIndex, gDragObj.tableIndex);
    for (var i = start; i <= end; i++) {
        // tablewrap and xcTheadWrap IDs were already changed during table
        // swapping
        var tableWrap = $('#xcTableWrap' + i);
        var table = tableWrap.find('.xcTable');
        // var oldIndex = parseInt(table.attr('id').substring(7));
        table.attr('id', 'xcTable' + i);
        tableWrap.find('.xcTbodyWrap').attr('id', 'xcTbodyWrap' + i);
        tableWrap.find('.tableMenu').attr('id', 'tableMenu' + i);
        tableWrap.children('.colMenu:not(.tableMenu)').attr('id', 'colMenu' + i);
        $(rowScrollers[i]).attr('id', 'rowScroller' + i);
        $(rowScrollers[i]).find('.rowMarker').attr('id', 'rowMarker' + i);
        $($dagWraps[i]).attr('id', 'dagWrap' + i);
    }
}

function moveFirstColumn() {
    var $startingTable;
    var rightOffset;
    $('.xcTableWrap:not(".inActive")').each(function() {
        rightOffset = $(this)[0].getBoundingClientRect().right;
        if (rightOffset > 0) {
            $startingTable = $(this);
            return false;
        }
    });

    if ($startingTable && $startingTable.length > 0) {
        var $idCol =  $startingTable.find('.idSpan');
        var cellWidth = $idCol.width();
        var scrollLeft = -$startingTable.offset().left;
        var rightDiff = rightOffset - (cellWidth + 15);
        if (rightDiff < 0) {
            scrollLeft += rightDiff;
        }
        $idCol.css('left', scrollLeft);
        $startingTable.find('th.rowNumHead input').css('left', scrollLeft);
        var adjustNext = true;
        while (adjustNext) {
            $startingTable = $startingTable.next();
            if ($startingTable.length === 0) {
                return;
            }
            rightOffset = $startingTable[0].getBoundingClientRect().right;
            if (rightOffset > $(window).width()) {
                adjustNext = false;
            }
            $startingTable.find('.idSpan').css('left', 0);
            $startingTable.find('th.rowNumHead input').css('left', 0);
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
    var $rowInput        = $("#rowInput");
    var $rowScrollerArea = $("#rowScrollerArea");

    RowScroller.setup = function() {
        $rowScrollerArea.mousedown(function(event) {
            if (event.which !== 1 || $(".rowScroller").length === 0) {
                return;
            }
            if ($(event.target).hasClass("subRowMarker")) {
                rowScrollerStartDrag(event, $(event.target).parent());
                return;
            }
            var tableNum = gActiveTableNum;
            var rowScroller = $("#rowScroller" + tableNum);
            var mouseX = event.pageX - rowScroller.offset().left;
            var rowPercent = mouseX / $(this).width();

            var translate = Math.min(99.9, Math.max(0, rowPercent * 100));
            $("#rowMarker" + tableNum).css("transform",
                                "translate3d(" + translate + "%, 0px, 0px)");

            var rowNum = Math.ceil(rowPercent * gTables[tableNum].resultSetCount);
            if (rowScroller.find(".bookmark").length > 0) {
                // check 8 pixels around for bookmark?
                var yCoor = rowScroller.offset().top + rowScroller.height() - 5;
                for (var x = (event.pageX - 4); x < (event.pageX + 4); x++) {
                    var element = $(document.elementFromPoint(x, yCoor));
                    if (element.hasClass("bookmark")) {
                        rowNum = parseBookmarkNum(element);
                        break;
                    }
                }
            }

            if (!isTableScrollable(tableNum)) {
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

            var targetRow = parseInt($rowInput.val());
            var backRow   = targetRow;

            if (isNaN(targetRow) || targetRow % 1 !== 0) {
                return;
            }

            if (gTables[gActiveTableNum].resultSetCount === 0) {
                $rowInput.val("0");
                $rowInput.data("val", 0);
                return;
            } else if (targetRow < 1) {
                targetRow = 1;
                backRow = 0;
            } else if (targetRow > gTables[gActiveTableNum].resultSetCount) {
                targetRow = gTables[gActiveTableNum].resultSetCount;
                backRow = gTables[gActiveTableNum].resultSetCount - 20;
            }

            $rowInput.data("val", targetRow);
            $rowInput.val(targetRow);

            backRow = Math.min(gTables[gActiveTableNum].resultSetMax - 60,
                                backRow - 20);

            if (backRow < 0) {
                backRow = 0;
            }
            var tableName = gTables[gActiveTableNum].tableName;
            var numRowsToAdd = 60;
            var info = {
                "numRowsToAdd"    : numRowsToAdd,
                "numRowsAdded"    : 0,
                "lastRowToDisplay": backRow + 60,
                "targetRow"       : targetRow,
                "bulk"            : true,
                "tableName"       : tableName
            };

            goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
            .then(function() {
                var tableNum = xcHelper.getTableIndexFromName(tableName);
                var rowToScrollTo = Math.min(targetRow,
                                    gTables[tableNum].resultSetMax);
                positionScrollbar(rowToScrollTo, tableNum);
                generateFirstVisibleRowNum();
                if (!event.rowScrollerMousedown) {
                    RowScroller.move($rowInput.val(),
                                     gTables[tableNum].resultSetCount);
                } else {
                    $rowScrollerArea.addClass("autoScroll");
                }
            });
        });
    };

    RowScroller.add = function(tableNum) {
        var rowScrollerHTML =
            '<div id="rowScroller' + tableNum +
            '" class="rowScroller" data-toggle="tooltip" ' +
                'data-container="body" ' +
                'data-placement="bottom" title="scroll to a row">' +
                '<div id="rowMarker' + tableNum + '" class="rowMarker">' +
                    '<div class="subRowMarker top"></div>' +
                    '<div class="subRowMarker middle"></div>' +
                    '<div class="subRowMarker bottom"></div>' +
                '</div>' +
            '</div>';

        if (tableNum === 0) {
            $rowScrollerArea.prepend(rowScrollerHTML);
        } else {
            $("#rowScroller" + (tableNum - 1)).after(rowScrollerHTML);
        }

        var rows = gTables[tableNum].bookmarks;
        for (var i = 0, numRows = rows.length; i < numRows; i++) {
            RowScroller.addBookMark(rows[i], tableNum);
        }

        if ($(".xcTable").length > 1) {
            $("#rowScroller" + tableNum).hide();
        }
    };

    RowScroller.move = function (rowNum, resultSetCount) {
        var pct = 100 * ((rowNum - 1) / (resultSetCount - 1));
        $("#rowMarker" + gActiveTableNum).css("transform",
                                        "translate3d(" + pct + "%, 0px, 0px)");
    };

    RowScroller.update = function(tableNum) {
        var $numPages = $("#numPages");
        showRowScroller(tableNum);
        if (gActiveTableNum < 0 || $.isEmptyObject(gTables[gActiveTableNum])) {
            $numPages.text("");
        } else {
            var num = Number(gTables[gActiveTableNum].resultSetCount).
                                toLocaleString("en");
            $numPages.text("of " + num);
        }
    };

    RowScroller.empty = function() {
        $rowInput.val("").data("val", "");
        gActiveTableNum = -1;
        RowScroller.update();
    };

    // for book mark tick
    RowScroller.addBookMark = function(rowNum, tableNum) {
        var leftPos = 100 * (rowNum / gTables[tableNum].resultSetCount);
        var bookmark =
            '<div class="bookmark bkmkRow' + rowNum + '"' +
                ' style="left:' + leftPos + '%;" data-toggle="tooltip" ' +
                ' data-placement="bottom" data-container="body" title="row ' +
                (rowNum + 1) + '">' +
            '</div>';
        $('#rowScroller' + tableNum).append(bookmark);
    };

    RowScroller.removeBookMark = function(rowNum, tableNum) {
        $('#rowScroller' + tableNum).find('.bkmkRow' + rowNum).remove();
    };

    RowScroller.resize = function() {
        // resize the lenght of #rowInput
        if (gActiveTableNum < 0) {
            return;
        }

        var resultSetCount   = gTables[gActiveTableNum].resultSetCount;
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
        HelpController.tooltipOn();
    };

    function showRowScroller(tableNum) {
        $(".rowScroller").hide();
        if (tableNum != null && tableNum >= 0) {
            $("#rowScroller" + tableNum).show();
        }
    }

    function positionScrollbar(row, tableNum) {
        var canScroll = true;
        var table = $('#xcTable' + tableNum);
        var theadHeight = table.find('thead').height();

        function positionScrollToRow() {
            if (!table.find('.row' + (row - 1))[0]) {
                return;
            }

            var tdTop = table.find('.row' + (row - 1))[0].offsetTop;
            var scrollPos = Math.max((tdTop - theadHeight), 1);
            if (canScroll && scrollPos >
                (table.height() - $('#xcTableWrap' + tableNum).height()))
            {
                canScroll = false;
            }
            $rowScrollerArea.addClass('autoScroll');
            $('#xcTbodyWrap' + tableNum).scrollTop(scrollPos);
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
        // var scrollerPositionStart = el.position().left;
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
            '</style>';

        $(document.head).append(cursorStyle);
        disableTextSelection();
        HelpController.tooltipOff();
    }


    return (RowScroller);
}(jQuery, {}));
