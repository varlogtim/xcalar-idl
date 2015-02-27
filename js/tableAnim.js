function generateFirstLastVisibleRowNum(rowScrollerMove) {
    //XXX table will need to be passed in
    if ($('#xcTableWrap'+gActiveTableNum).length == 0) {
        return;
    }
    var table = $('#xcTable'+gActiveTableNum);
    var tablePos = $('#xcTableWrap'+gActiveTableNum)[0]
                .getBoundingClientRect();
    var tdXCoor = 30; //top cell's distance from left side of tablewrap
    var tdYCoor = 80; //top cell's distance from top of tablewrap
    var tdBotYCoor = 18; //bottom cell's distance from bottom of tablewrap
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+tablePos.left,
                                            tdYCoor+tablePos.top);
    var firstId = $(firstEl).closest('tr').attr('class');

    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(3))+1;
    }

    var tdBottom = tablePos.bottom - tdBotYCoor; 
    
    if ($('#mainFrame').height() > table.height()) {
        var lastRowNum = table.find('tr:last td:first').text();
    } else {
        var lastEl = document.elementFromPoint(tdXCoor+tablePos.left, tdBottom);
        var lastId = $(lastEl).closest('tr').attr('class');
        if (lastId && lastId.length > 0) {
            var lastRowNum = parseInt(lastId.substring(3))+1;
        }
    }
    
    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar .rowNum:first-of-type').html(firstRowNum);
        if (rowScrollerMove) {
            moverowScroller(firstRowNum, 
                gTables[gActiveTableNum].resultSetCount);
        }
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar .rowNum:last-of-type').html(lastRowNum);
    } 
}

function resizableColumns(tableNum) {
    var tableWrap = $('#xcTableWrap'+tableNum);
    tableWrap.find('thead:not(.fauxTHead)').find('.header').each(
        function() {
            if (!$(this).children().hasClass('colGrab') 
                &&!$(this).parent().is(':first-child')) {
                    var colGrab = $('<div class="colGrab"></div>');
                    $(this).prepend(colGrab);
                    colGrab.mousedown(
                        function(event) {
                            if (event.which === 1) {
                                gRescolMouseDown($(this), event);
                                dblClickResize($(this));
                            }
                        }
                    );
            }
        }
    );
    adjustColGrabHeight(tableNum);
    if (gRescol.first) {
        tableWrap.find('tr:first th').each(
            function() {
                    var initialWidth = $(this).width();
                    $(this).width(initialWidth);
                    $(this).removeAttr('width');
            } 
        );
        gRescol.first = false;
    } 
}


function disableTextSelection() {
    window.getSelection().removeAllRanges();
    var style = '<style id="disableSelection" type="text/css">*'+ 
        '{ -ms-user-select:none;-moz-user-select:-moz-none;'+
        '-khtml-user-select:none;'+
        '-webkit-user-select:none;user-select:none; }</style>';
    $(document.head).append(style);
    $('input').prop('disabled', true);
}

function reenableTextSelection() {
    $('#disableSelection').remove();
    $('input').prop('disabled', false);
}

function gRescolMouseDown(el, event) {
    var headerWrap = el.closest('.xcTheadWrap');
    var tableNum = parseInt(headerWrap.attr('id').substring(11));

    // var table = el.closest('table');
    var table = $('#xcTable'+tableNum);
    var colNum = parseColNum(el.parent().parent());
    if (el.parent().width() === 10) {
        // This is a hidden column! we need to unhide it
        // return;
        unhideCol(colNum, tableNum, {autoResize: false});
    }
    gMouseStatus = "resizingCol";
    event.preventDefault();
    var tableWidth = table.outerWidth();
    gRescol.mouseStart = event.pageX;
    gRescol.grabbedCell = el.parent().parent();  // the th 
    gRescol.index = gRescol.grabbedCell.index();
    gRescol.startWidth = gRescol.grabbedCell.outerWidth();
    gRescol.tableNum = tableNum;
    gRescol.table = table;
    gRescol.colNum = colNum;
    // since the headers come in pairs, this is the second header
    gRescol.secondCell = table.find('tr:eq(0) th.col'+gRescol.colNum);
    gRescol.lastCell = table.find('thead:last th:last');
    gRescol.lastCellWidth = gRescol.lastCell.outerWidth();
    
    gRescol.tableExcessWidth = tableWidth - gMinTableWidth;
    gRescol.thead = headerWrap.find('thead');
    gRescol.xcTheadWrap = headerWrap;
    var minTableWidth = tableWidth - 
                            (gRescol.startWidth-gRescol.cellMinWidth);
    gRescol.tempMinTableWidth = Math.max(minTableWidth, gMinTableWidth);
    gRescol.minLastCellWidth = Math.max(gMinTableWidth - 
        (tableWidth - gRescol.startWidth), gRescol.cellMinWidth-5);

    if (gRescol.grabbedCell.is(':last-child')) {
        gRescol.lastCellGrabbed = true;
    }

    gRescol.tempCellMinWidth = gRescol.cellMinWidth-5;
    gRescol.leftDragMax =  gRescol.tempCellMinWidth - gRescol.startWidth;

    // what the last cell width will be if current column is resized to minimum
    if ((tableWidth - (gRescol.startWidth - gRescol.cellMinWidth)) > 
            gMinTableWidth) {
        gRescol.setLastCellWidth = gRescol.lastCellWidth;
    } else {
        gRescol.setLastCellWidth = gRescol.lastCellWidth + (gMinTableWidth-
            (tableWidth + gRescol.leftDragMax));
    }

    disableTextSelection();
    $(document.head).append('<style id="ew-resizeCursor" type="text/css">*'+ 
        '{cursor: ew-resize !important;}</style>');
}

function gRescolMouseMove(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist > gRescol.leftDragMax) {
        gRescol.grabbedCell.outerWidth(gRescol.startWidth + dragDist);
        gRescol.secondCell.outerWidth(gRescol.startWidth + dragDist);
        if (dragDist <= -gRescol.tableExcessWidth) {
            gRescol.lastCell.outerWidth(gRescol.lastCellWidth - 
                (dragDist + gRescol.tableExcessWidth));
        }     
    } else if (dragDist < gRescol.leftDragMax ) {
        gRescol.grabbedCell.outerWidth(gRescol.tempCellMinWidth);
        gRescol.secondCell.outerWidth(gRescol.tempCellMinWidth);
        gRescol.lastCell.outerWidth(gRescol.setLastCellWidth);
    }
    var tableWidth = gRescol.table.width();
    gRescol.thead.outerWidth(tableWidth);
    gRescol.xcTheadWrap.outerWidth(tableWidth);
}

function gRescolMouseMoveLast(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist >= -gRescol.tableExcessWidth) {
        if (dragDist > gRescol.leftDragMax) {
            gRescol.grabbedCell.outerWidth(gRescol.startWidth + dragDist);
            gRescol.secondCell.outerWidth(gRescol.startWidth + dragDist);
        } else {
            gRescol.grabbedCell.outerWidth(gRescol.tempCellMinWidth);
            gRescol.secondCell.outerWidth(gRescol.tempCellMinWidth);
        } 
    } else {
        gRescol.grabbedCell.outerWidth(gRescol.minLastCellWidth);
        gRescol.secondCell.outerWidth(gRescol.minLastCellWidth);
        gRescol.table.find('thead').width(gRescol.tempMinTableWidth);
    } 
    var tableWidth = gRescol.table.width();
    gRescol.thead.outerWidth(tableWidth);
    gRescol.xcTheadWrap.outerWidth(tableWidth);
}

function gRescolMouseUp() {
    gMouseStatus = null;
    gRescol.lastCellGrabbed = false;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    gRescol.table.find('.rowGrab').width(gRescol.table.width());
    var progCol = gTables[gRescol.tableNum].tableCols[gRescol.index-1];
    progCol.width = gRescol.grabbedCell.outerWidth();
    matchHeaderSizes(gRescol.tableNum);
    checkForScrollBar(gRescol.tableNum);
}

function resrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
    resrow.tableNum = parseInt(el.closest('table').attr('id').substring(7));
    resrow.startHeight = resrow.targetTd.outerHeight();
    resrow.rowIndex = resrow.targetTd.closest('tr').index();
    disableTextSelection();
    var style = '<style id="ns-resizeCursor" type="text/css">*'+ 
        '{cursor: ns-resize !important;}</style>';
    $(document.head).append(style);
    $('body').addClass('hideScroll');
}

function resrowMouseMove(event) {
    var mouseDistance = event.pageY - resrow.mouseStart;
    var newHeight = resrow.startHeight + mouseDistance;
    var row = resrow.rowIndex;
    var padding = 4; // top + bottom padding in td
    if (newHeight < gRescol.minCellHeight) {
        resrow.targetTd.outerHeight(gRescol.minCellHeight);
        $('#xcTable'+resrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', gRescol.minCellHeight-padding);
    } else {
        resrow.targetTd.outerHeight(newHeight);
        $('#xcTable'+resrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', newHeight-padding);
    }
}

function resrowMouseUp() {
    gMouseStatus = null;
    $('#ns-resizeCursor').remove();
    reenableTextSelection();
    $('body').removeClass('hideScroll'); 
    adjustColGrabHeight(resrow.tableNum);
    generateFirstLastVisibleRowNum();
}

function dragdropMouseDown(el, event) {
    gMouseStatus = "movingCol";
    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
        '{cursor:move !important; cursor: -webkit-grabbing !important;'+
        'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);
    gDragObj.mouseX = event.pageX;
    gDragObj.colNum = parseColNum(el);
    var tableWrap = el.closest('.xcTableWrap');
    gDragObj.table = tableWrap;
    gDragObj.tableNum = parseInt(tableWrap.attr('id').substring(11));
    gDragObj.element = el;
    gDragObj.colIndex = parseInt(el.index());
    gDragObj.offsetTop = el.offset().top;
    gDragObj.grabOffset = gDragObj.mouseX - el.offset().left;
    // gDragObj.grabOffset = distance from the left side of dragged column
    // to the point that was grabbed
    checkForMainFrameScrollBar();

    gDragObj.docHeight = $(document).height();
    gDragObj.val = el.find('.editableHead').val();
    var tableTitleHeight = tableWrap.find('.tableTitle').height();
    var tableHeaderHeight = tableWrap.find('.trueTHead').height();
    var tableHeight = $('#xcTable'+gDragObj.tableNum).height() +
                      tableHeaderHeight;
    var xcTableWrapHeight = el.closest('#xcTableWrap' +
                                gDragObj.tableNum).height()+gScrollbarHeight;
    var shadowDivHeight = Math.min(tableHeight-5, 
                          xcTableWrapHeight - tableTitleHeight);
    var headerTop = parseInt($('#xcTheadWrap'+gDragObj.tableNum).css('top')) + 
        tableWrap.find('.trueTHead').position().top;
    gDragObj.inFocus =  el.find('.editableHead').is(':focus');
    gDragObj.colWidth = el.width();
    gDragObj.windowWidth = $(window).width();
    gDragObj.pageX = gDragObj.pageX;
    

    // create a replica shadow with same column width, height,
    // and starting position
    el.closest('#xcTableWrap'+gDragObj.tableNum)
                    .append('<div id="shadowDiv" style="width:'+
                            gDragObj.colWidth+
                            'px;height:'+(shadowDivHeight)+'px;left:'+
                            (gDragObj.element.position().left)+
                            'px;top:'+headerTop+'px;"></div>');

    // create a fake transparent column by cloning 
    createTransparentDragDropCol();
    disableTextSelection();
    createDropTargets();
    dragdropMoveMainFrame();
}

function dragdropMouseMove(event) {
    var pageX = event.pageX;
    gDragObj.pageX = pageX;
    gDragObj.fauxCol.css('left', pageX);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    $('#shadowDiv, #fauxCol, #dropTargets, #moveCursor').remove(); 
    $('#mainFrame').off('scroll', mainFrameScrollDropTargets);
    reenableTextSelection();
    var progCol = gTables[gDragObj.tableNum].tableCols[gDragObj.colNum-1];
    var isDark = gDragObj.element.hasClass('unusedCell');
    var selected = gDragObj.element.hasClass('selectedCell');
    if (gDragObj.inFocus) {
        gDragObj.element.find('.editableHead').focus();
    }
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex) != gDragObj.colNum) { 
        setTimeout(function() {
            // add cli
            var cliOptions = {};
            cliOptions.tableName = gTables[gDragObj.tableNum].frontTableName;
            cliOptions.colName = gTables[gDragObj.tableNum]
                                 .tableCols[gDragObj.colNum - 1].name;
            cliOptions.oldColIndex = gDragObj.colNum;
            cliOptions.newColIndex = gDragObj.colIndex;

            var storedScrollLeft =  $('#mainFrame').scrollLeft();
            delCol(gDragObj.colNum, gDragObj.tableNum, true);
            progCol.index = gDragObj.colIndex;
            insertColAtIndex(gDragObj.colIndex-1, gDragObj.tableNum, progCol);
            addCol("col"+(gDragObj.colIndex-1), "xcTable"+gDragObj.tableNum, 
                    progCol.name, {width: progCol.width,
                    isDark: isDark, 
                    select: selected, 
                    inFocus: gDragObj.inFocus,
                    progCol: progCol});

            execCol(progCol, gDragObj.tableNum)
            .done(function() {
                updateMenuBarTable(gTables[gDragObj.tableNum],
                                   gDragObj.tableNum);
                //prevent scroll position from changing when 
                // you delete and add column
                $('#mainFrame').scrollLeft(storedScrollLeft);

                addCli('Change Column Order', cliOptions);
            });
        }, 0);
    }
}

function dragdropMoveMainFrame() {
    // essentially moving the horizontal mainframe scrollbar if the mouse is 
    // near the edge of the viewport
    if (gMouseStatus == 'movingCol' || gMouseStatus == 'movingTable') {
        if (gDragObj.pageX > gDragObj.windowWidth-2) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()+50));
        } else if (gDragObj.pageX > gDragObj.windowWidth-20) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()+20));
        } else if (gDragObj.pageX < 2) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()-50));
        } else if (gDragObj.pageX < 20) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()-20));
        }
        setTimeout(function() {
            dragdropMoveMainFrame();
        }, 40);
    }
}

function cloneCellHelper(obj) {
    var td = $(obj).children();
    var row = $("<tr></tr>");
    var rowColor = $(obj).css('background-color');
    var clone = td.eq(gDragObj.colIndex).clone();
    var cloneHeight = td.eq(gDragObj.colIndex).outerHeight();
    var cloneColor = td.eq(gDragObj.colIndex).css('background-color');
    row.css('background-color', rowColor);
    clone.css('height', cloneHeight+'px');
    clone.outerWidth(gDragObj.colWidth);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($("#fauxTable"));
}

function createTransparentDragDropCol() {
    $('#mainFrame').append('<div id="fauxCol" style="left:'+
                    gDragObj.mouseX+'px;top:'+
                    (gDragObj.offsetTop)+'px;width:'+
                    (gDragObj.colWidth)+'px;'+
                    'margin-left:'+(-gDragObj.grabOffset)+'px;">'+
                        '<table id="fauxTable" '+
                        'class="dataTable xcTable" '+
                        'style="width:'+(gDragObj.colWidth)+'px">'+
                        '</table>'+
                    '</div>');
    gDragObj.fauxCol = $('#fauxCol');
    
    var rowHeight = 30;
    // turn this into binary search later
    var topPx = gDragObj.table.find('thead').offset().top + 
                gDragObj.table.find('thead').outerHeight() - rowHeight;
    var topRowIndex = -1;
    var topRowTd = null;
    gDragObj.table.find('tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowIndex = $(this).index();
            topRowEl = $(this).find('td');
            return (false);
        }
    });

    //XXX check to see if topRowEl was found;
    if (topRowIndex == -1) {
        console.log("BUG! Cannot find first visible row??");
        // Clone entire shit and be done.
        gDragObj.table.find('tr').each(function(i, ele) {
            cloneCellHelper(ele);
        });
        return;
    }

    // Clone head
    gDragObj.table.find('tr:first').each(function(i, ele) {
        cloneCellHelper(ele);
    });

    var totalRowHeight = gDragObj.element
            .closest('#xcTableWrap'+gDragObj.tableNum).height()-
            gDragObj.table.find('th:first').outerHeight() -
            gScrollbarHeight;
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    gDragObj.table.find('tr:gt('+(topRowIndex+1)+')')
        .each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= numRows+topRowIndex) {
                return (false);
            }
    });

    // Ensure rows are offset correctly
    var fauxTableHeight = $('#fauxTable').height()+
                        $('#fauxTable tr:first').outerHeight();
    var xcTableWrap0Height = $('#xcTableWrap0').height();
    var fauxColHeight = Math.min(fauxTableHeight-1, xcTableWrap0Height-35);
    gDragObj.fauxCol.height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx-rowHeight;
    $('#fauxTable').css('margin-top', $('#fauxTable tr:first').outerHeight()+
                        firstRowOffset);
    $('#fauxTable tr:first-child').css({'margin-top': 
            -($('#fauxTable tr:first').outerHeight()+firstRowOffset)});
}

function createDropTargets(dropTargetIndex, swappedColIndex) {
    var dragMargin = 30; 
    // targets extend this many pixels to left of each column
   
    if (!dropTargetIndex) {
        // create targets that will trigger swapping of columns on hover
        var dropTargets = "";
        var i = 0;
        gDragObj.table.find('tr:first th').each(function() {
            if (i == 0 || i == gDragObj.colIndex) {
                i++;
                return true;  
            }
            var colLeft = $(this).position().left;
            if ((gDragObj.colWidth-dragMargin) < 
                Math.round(0.5*$(this).width())) {
                var targetWidth = gDragObj.colWidth;
            } else {
                var targetWidth = Math.round(0.5*$(this).outerWidth())+
                                  dragMargin;
            }
            dropTargets += '<div id="dropTarget'+i+'" class="dropTarget"'+
                            'style="left:'+
                            (colLeft-dragMargin+gDragObj.grabOffset)+'px;'+
                            'width:'+targetWidth+'px;height:'
                            +(gDragObj.docHeight)+'px;">'+i+
                            '</div>';
            i++;
        });
        var scrollLeft = $('#mainFrame').scrollLeft();
        var tableLeft = gDragObj.table[0].getBoundingClientRect().left +
            scrollLeft;
        $('body').append('<div id="dropTargets" style="'+
                'margin-left:'+tableLeft+'px;'+
                'left:'+(-scrollLeft)+'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapColumns($(this));
        });
        $('#mainFrame').scroll(mainFrameScrollDropTargets);
       
    } else {
        // targets have already been created, so just adjust the one 
        // corresponding to the column that was swapped
        var swappedCol = gDragObj.table.find('th:eq('+swappedColIndex+')');
        var colLeft = swappedCol.position().left;
        $('#dropTarget'+dropTargetIndex)
            .attr('id', 'dropTarget'+swappedColIndex);
        var dropTarget = $('#dropTarget'+swappedColIndex);
        dropTarget.css({'left': (colLeft-dragMargin+gDragObj.grabOffset)+'px'});
    }
}

function mainFrameScrollDropTargets(event) {
    var left = -$(event.target).scrollLeft();
    $('#dropTargets').css('left', left);
}

function dragdropSwapColumns(el) {
    var dropTargetId = parseInt((el.attr('id')).substring(10));
    var nextCol = dropTargetId - Math.abs(dropTargetId-gDragObj.colIndex);
    var prevCol = dropTargetId + Math.abs(dropTargetId-gDragObj.colIndex);
    var movedCol;
    if (dropTargetId>gDragObj.colIndex) {
        gDragObj.table.find('tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').after(
                $(this).children(':eq('+nextCol+')'));
        });
        movedCol = nextCol;
    } else {
        gDragObj.table.find('tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').before(
                $(this).children(':eq('+prevCol+')'));
        });
        movedCol = prevCol;
    }
    var left = gDragObj.element.position().left;
    $('#shadowDiv').css('left', left); 
    gDragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function gRescolDelWidth(colNum, tableNum, resize) {
    var table = $('#xcTable'+tableNum);
    var oldTableWidth = table.width();
    if (!resize && (oldTableWidth < gMinTableWidth)) {
        var lastTd = table.find('tr:first th').length-1;
        var lastTdWidth = table.find('.table_title_bg.col'+lastTd).width();
        table.find('thead:last .table_title_bg.col'+lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth)); 
    }
    matchHeaderSizes(tableNum);
}

function getTextWidth(el) {
    var width;
    if (el.is('input')) {
        var text = el.val()+" ";
    } else {
        var text = el.text();
    }
    tempDiv = $('<div>'+text+'</div>');
    tempDiv.css({'font-family': el.css('font-family'), 
        'font-size': el.css('font-size'),
        'font-weight': el.css('font-weight'), 
        'position': 'absolute', 
        'display': 'inline-block', 
        'white-space': 'pre'})
        .appendTo($('body'));
    width = tempDiv.width();
    tempDiv.remove();
    return (width);
}

function autosizeCol(el, options) {
    var index = parseColNum(el);
    var tableNum = parseInt(el.closest('.tableWrap').attr('id').substring(11));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || gRescol.cellMinWidth-10;
    var oldTableWidth = $('#xcTable'+tableNum).width();
    var maxWidth = 700;
    var oldWidth = el.width();  
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var originalWidth = gTables[tableNum].tableCols[index-1].width;
    var newWidth = Math.max(widestTdWidth, minWidth);
    var dbClick = options && options.dbClick;
    // dbClick is autoSized to a fixed width
    if (!dbClick) {
        newWidth = Math.max(newWidth, originalWidth);
    }
    newWidth = Math.min(newWidth, maxWidth);
    var widthDiff = newWidth - oldWidth;
    // reassigning el from the fixed table header cell to the header cell
    // located in the table
    el = $('#xcTable'+tableNum).find('th.col'+index); 
    if (widthDiff > 0) {
        $('#xcTable'+tableNum+' thead').width('+='+(newWidth-oldWidth));
        el.width(newWidth);
    } else if (oldTableWidth + widthDiff < gMinTableWidth) {
        el.width(newWidth);
        $('#xcTable'+tableNum+' tr:first th:last').outerWidth('+='+
            (gMinTableWidth-(oldTableWidth+widthDiff)));
    } else {
        el.width(newWidth);
    }
    gTables[tableNum].tableCols[index-1].width = el.width();
    matchHeaderSizes(tableNum);
}

function getWidestTdWidth(el, options) {
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var id = parseColNum(el);
    var tableWrap = el.closest('.tableWrap');
    var tableNum = parseInt(tableWrap.attr('id').substring(11));
    var table = $('#xcTable'+tableNum);
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 10;
    var largestTd = table.find('tbody tr:first td:eq('+(id)+')');
    var headerWidth = 0;

    table.find('tbody tr').each(function() {
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var td = $(this).children(':eq('+(id)+')');
        textLength = td.text().length;
        if (textLength > longestText) {
            longestText = textLength; 
            largestTd = td;
        }
    });

    largestWidth = getTextWidth(largestTd);

    if (includeHeader) {
        var th = table.find('.col'+id+' .editableHead');
        headerWidth = getTextWidth(th);
        if (headerWidth > largestWidth) {
            largestWidth = headerWidth;
        }
    }
    largestWidth += padding;
    return (largestWidth);
}

// XXX: Td heights are not persisted
function getTdHeights() {
    var tdHeights = [];
    $(".xcTable tbody tr").each(function() {
        tdHeights.push($(this).children().eq(0).outerHeight());
    });
    return (tdHeights);  
}

function dblClickResize(el) {
    gRescol.clicks++;  //count clicks
    if (gRescol.clicks === 1) {
        gRescol.timer = setTimeout(function() {   
            gRescol.clicks = 0; //after action performed, reset counter
        }, gRescol.delay);
    } else {
        gMouseStatus = null;
        reenableTextSelection();
        if (el.closest('tHead').index() == 0) {
            var resize = true;
        } else {
            var resize = false;
        }
        autosizeCol(el.parent().parent(), {resizeFirstRow: resize,
                                            dbClick: true});
        $('#ew-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
    }
}

function cloneTableHeader(tableNum) {
    var xcTableWrapTop = $('#xcTableWrap'+tableNum).offset().top;
    var tHead = $('#xcTable'+tableNum+' thead');
    var tHeadClone = tHead.clone();

    tHeadClone.addClass('fauxTHead');
    tHead.addClass('trueTHead').after(tHeadClone);
    tHead.wrap('<div id="xcTheadWrap'+tableNum+
                '" class="xcTheadWrap dataTable"'+
                'style="top:0px;"></div>');
    var xcTheadWrap = $('#xcTheadWrap'+tableNum);

    $('#xcTableWrap'+tableNum).prepend(xcTheadWrap);
    //XX build this table title somewhere else
    if (gTables[tableNum] != undefined) {
        var tableName = gTables[tableNum].frontTableName;
    } else {
        var tableName = "";
    }
    xcTheadWrap.prepend('<div class="tableTitle"><div class="tableGrab"></div>'+
        '<input type="text" value="'+tableName+'">'+
        '<div class="dropdownBox"></div>'+
        '<ul class="colMenu tableMenu" id="tableMenu'+tableNum+'">'+
        '<li class="archiveTable">Archive Table</li>'+
        '<li class="unavailable">Hide Table</li>'+
        '<li class="deleteTable">Delete Table</li>'+
        '</ul>'+
        '</div>');
    xcTheadWrap.find('.tableTitle input').keyup(function(event) {
        if (event.which == keyCode.Enter) {
            $(this).blur();
        }
    });

    xcTheadWrap.find('.tableTitle > .dropdownBox').click(function() {
        dropdownClick($(this));
    });

    xcTheadWrap.find('.tableGrab').mousedown(function(event) {
        if (event.which != 1) {
            return;
        }
        dragTableMouseDown($(this).parent(), event);
    });

    var tableMenu = $('#tableMenu'+tableNum);

    tableMenu.find('.archiveTable').click(function() {
        var tableNum = parseInt($(this).closest('.tableMenu').
                       attr('id').substring(9));
        $(this).closest('.tableMenu').hide();

        // add cli
        var cliOptions = {};
        cliOptions.operation = 'archiveTable';
        cliOptions.tableName =  gTables[tableNum].frontTableName;

        archiveTable(tableNum, DeleteTable.Keep);

        addCli('Archive Table', cliOptions);
    });

    tableMenu.find('.deleteTable').click(function() {
        var tableNum = parseInt($(this).closest('.tableMenu').
                       attr('id').substring(9));
        $(this).closest('.tableMenu').hide();


        // add cli
        var cliOptions = {};
        cliOptions.operation = 'deleteTable';
        cliOptions.tableName = gTables[tableNum].frontTableName;

        deleteTable(tableNum)
        .done(function() {
            addCli('Delete Table', cliOptions);
        });
    });

    $('#xcTable'+tableNum).width(0); 
    tHeadClone.find('.colGrab').remove();
    matchHeaderSizes(tableNum);
}

function matchHeaderSizes(tableNum, reverse) {
    var table = $('#xcTable'+tableNum);
    var headerWrap = $('#xcTheadWrap'+tableNum);
    var tHeadLength = table.find('.fauxTHead th').length;
    if (reverse) {
        var trueTHead = '.fauxTHead';
        var fauxTHead = '.trueTHead';
    } else {
        var trueTHead = '.trueTHead';
        var fauxTHead = '.fauxTHead';
    }
    for (var i = 0; i < tHeadLength; i++) {
        var width = table.find(fauxTHead+' th.col'+i).outerWidth();
        headerWrap.find(trueTHead+' th.col'+i).outerWidth(width);
    }
    var tableWidth = table.width();
    table.find('thead').width(tableWidth);
    table.find('.rowGrab').width(tableWidth);
    table.find('.xcTheadWrap').width(tableWidth);
    headerWrap.width(tableWidth);
    headerWrap.find('.trueTHead').width(tableWidth);
}

function displayShortenedHeaderName(el, tableNum, colNum) {
    if (gTables[tableNum].tableCols[colNum-1].name.length > 0) {
        el.val(gTables[tableNum].tableCols[colNum-1].name);
    }
}

function addColListeners(colId, tableId) {
    var table = $('#'+tableId);
    var tableNum = parseInt(tableId.substring(7));
    var headerWrap = $('#xcTheadWrap'+tableNum);
    var tables = $('#'+tableId+', #xcTheadWrap'+tableNum);
    resizableColumns(tableNum);
    tables.find('.editableHead.col'+colId).focus(function() {
        var dynTableNum = parseInt($(this).closest('.dataTable').attr('id')
                          .substring(11));
        $('.colMenu').hide();
        $(this).closest('.xcTheadWrap').css('z-index', '9');
        var index = parseColNum($(this));
        if (gTables[dynTableNum].tableCols[index-1].userStr.length > 0) {
            $(this).val(gTables[dynTableNum].tableCols[index-1].userStr);
        }
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
        highlightColumn($(this));
        $(this).parent().siblings('.dropdownBox')
            .addClass('hidden');
        focusTable(dynTableNum);
    }).blur(function() {
        var dynTableNum = parseInt($(this).closest('.dataTable').attr('id')
                          .substring(11));
        var index = parseColNum($(this));
        var el = $(this);
        setTimeout(
            function() {
                if (!$('#fnBar').is(':focus') && gFnBarOrigin != el) {
                    displayShortenedHeaderName(el, dynTableNum, index);
                }
                
            },
        1);

        $(this).parent().siblings('.dropdownBox')
            .removeClass('hidden');
    });

    tables.find('.editableHead.col'+colId).keyup(function(e) {
        gFnBarOrigin = $(this);
        if (e.which == keyCode.Enter) {
            var index = parseColNum($(this));
            var tableNum = parseInt($(this).closest('.dataTable').attr('id')
                          .substring(11));
            var progCol = parseCol($(this).val(), index, tableNum, true);

            var self = this;
            execCol(progCol, tableNum)
            .done(function() {
                updateMenuBarTable(gTables[tableNum], tableNum);

                // add cli
                var cliOptions = {};
                cliOptions.operation = 'execCol';
                cliOptions.tableName = gTables[tableNum].frontTableName;
                cliOptions.colIndex = index;
                cliOptions.progCol = progCol.name;
                cliOptions.func = progCol.func.func;

                addCli("Prog Column", cliOptions);

                if (progCol.name.length > 0) {
                    $(self).val(progCol.name);
                } else {
                    // keep value that user entered
                }
                $(self).blur();
                $(self).closest('th').removeClass('unusedCell');
                table.find('td:nth-child('+index+')').removeClass('unusedCell');
            });
        }
    });

    tables.find('.editableHead.col'+colId).on('input', function(e) {
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
    });

    tables.find('.table_title_bg.col'+colId+' .dropdownBox').click(function() {
        dropdownClick($(this));
    });

    tables.find('.table_title_bg.col'+colId+' .dropdownBox')
        .mouseenter(function() {
            $(this).removeClass('hidden');
    }).mouseout(function() {
        var input = $(this).siblings('.editableHead');
        if (input.is(':focus')) {
            $(this).addClass('hidden');
        }
    });

    tables.find('.table_title_bg.col'+colId+' .colMenu li')
        .mouseenter(function() {
            $(this).children('ul').addClass('visible');
            $(this).addClass('selected');
            if (!$(this).hasClass('inputSelected')) {
                $('.inputSelected').removeClass('inputSelected');
            }
        }).mouseleave(function(event) {
            $(this).children('ul').removeClass('visible');
            $(this).removeClass('selected');
            // console.log(event.target);
    });

    tables.find('.table_title_bg.col'+colId+' .subColMenuArea')
        .mousedown(function() {
            $('.colMenu').hide();
    });

    tables.find('.table_title_bg.col'+colId+' .dragArea')
        .mousedown(function(event) {
        if (event.which != 1) {
            return;
        }
        var headCol = $(this).parent().parent();
        dragdropMouseDown(headCol, event);
    }); 

    tables.find('.editableHead.col'+colId).mousedown(function(event) {
        //XXX Test to see if we even need this anymore
        event.stopPropagation();
    });

    tables.find('.table_title_bg.col'+colId+' .inputMenu span')
        .mousedown(function(){
            if ($(this).hasClass('openMenuInput')) {
                $(this).removeClass('openMenuInput');
            } else {
                $(this).addClass('openMenuInput');
            }
    });

    tables.find('.filterWrap.col'+colId).mouseenter(function() {
        clearTimeout($(this).data('timeout'));
    }).mouseleave(function(){
        var timeout = setTimeout(function() {
                            $('.openMenuInput').siblings('input').val(0);
                            $('.openMenuInput').removeClass('openMenuInput');
                        }, 200);
        $(this).data('timeout', timeout); 
    });

    tables.find('.table_title_bg.col'+colId+' .colMenu input')
        .focus(function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }).keyup(function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }).blur(function() {
            $(this).parents('li').removeClass('inputSelected')
            .parents('.subColMenu').removeClass('inputSelected');
    });

   addColMenuActions(colId, tableId);
}

function addColMenuActions(colId, tableId) {
    var tableNum = parseInt(tableId.substring(7));
    var table = $('#'+tableId);
    var headerWrap = $('#xcTheadWrap'+tableNum);
    var tables = $('#'+tableId+', #xcTheadWrap'+tableNum);

    tables.find('.table_title_bg.col'+colId+' .colMenu li').click(
    function(event) {
        if ($(this).children('.subColMenu, input').length === 0) {
            if ($(this).hasClass('clickable')) {
                return;
            }
            // hide li if doesnt have a submenu or an input field
            $(this).closest('.colMenu').hide();
            $(this).closest('.xcTheadWrap').css('z-index', '9');
        }
    });

    tables.find('.table_title_bg.col'+colId+' .addColumns').click(function() {
        var colNum = parseColNum($(this));
        var index = 'col'+ colNum;
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        var tableId = "xcTable"+tableNum;

        // add cli
        var cliOptions = {};
        cliOptions.operation = "addCol";
        cliOptions.tableName = gTables[tableNum].frontTableName;
        cliOptions.newColName = "";
        cliOptions.siblColName = gTables[tableNum].tableCols[colNum - 1].name;
        cliOptions.siblColIndex = colNum;

        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
            cliOptions.direction = "L";
        } else {
            cliOptions.direction = "R";
        }
        $('.colMenu').hide();
        $(this).closest('.xcTheadWrap').css('z-index', '9');
        addCol(index, tableId, null, 
            {direction: direction, isDark: true, inFocus: true});

        addCli("Add Column", cliOptions);
    });
    
    tables.find('.deleteColumn.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable')
                        .attr('id').substring(11));
        
        // add cli
        var cliOptions = {};
        cliOptions.operation = "delCol";
        cliOptions.tableName = gTables[tableNum].frontTableName;
        cliOptions.colName = gTables[tableNum].tableCols[index - 1].name;
        cliOptions.colIndex = index;

        delCol(index, tableNum);

        addCli('Delete Column', cliOptions);
    });

    tables.find('.renameCol.col'+colId).click(function() {
        var tableNum = parseInt($(this).closest('.dataTable')
                        .attr('id').substring(11));
        var index = parseColNum($(this));
        $('#xcTheadWrap'+tableNum+ ' tr:first .editableHead.col'+index)
            .focus().select();
    });

    tables.find('.duplicate.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        var table = $('#xcTable'+tableNum);
        var name = table.find('.editableHead.col'+index).val();
        var width = table.find('th.col'+index).outerWidth();
        var isDark = table.find('th.col'+index).hasClass('unusedCell');

        // add cli
        var cliOptions = {};
        cliOptions.operation = 'duplicateCol'
        cliOptions.tableName = gTables[tableNum].frontTableName;
        cliOptions.colName = name;
        cliOptions.colIndex = index;

        addCol('col'+index, table.attr('id'),name, 
            {width: width, isDark: isDark});

        addCli('Duplicate Column', cliOptions);

        gTables[tableNum].tableCols[index].func.func = 
            gTables[tableNum].tableCols[index-1].func.func;
        gTables[tableNum].tableCols[index].func.args = 
            gTables[tableNum].tableCols[index-1].func.args;
        gTables[tableNum].tableCols[index].userStr = 
            gTables[tableNum].tableCols[index-1].userStr;
        execCol(gTables[tableNum].tableCols[index], tableNum)
        .done(function() {
            updateMenuBarTable(gTables[tableNum], tableNum);
        }); 
    });

    tables.find('.hide.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        hideCol(index, tableNum);
    });

    tables.find('.unhide.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        unhideCol(index, tableNum, {autoResize: true});
    });

    tables.find('.sort.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        sortRows(index, tableNum, SortDirection.Forward);
    }); 
    
    tables.find('.revSort.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        sortRows(index, tableNum, SortDirection.Backward);
    }); 
    
    tables.find('.aggrOp.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        var pCol = gTables[tableNum].tableCols[index-1];
        if (pCol.func.func != "pull") {
            console.log(pCol);
            alert("Cannot aggregate on column that does not exist in DATA.");
            return;
        }
        var colName = pCol.func.args[0];
        var aggrOp = $(this).closest('.aggrOp').text();
        console.log(colName+" "+gTables[tableNum].backTableName+" "+aggrOp);
        var value = XcalarAggregate(colName, gTables[tableNum].backTableName,
                                    aggrOp);
        var title = 'Aggregate: ' + aggrOp;
        var instruction = 'This is the aggregate result for column "' + 
                          colName + '". \r\n The aggregate operation is "' +
                          aggrOp + '".';
        showAlertModal({'title':title, 'msg':value, 
                        'instruction': instruction, 'isAlert':true,
                        'isCheckBox': true});
        // alert(value);
    });

    tables.find('.filterWrap.col'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        if (e.which === keyCode.Enter) {
            var index = parseColNum($(this).closest('.filterWrap'));
            var operator = $(this).closest('.filter').text(); 
            console.log(operator, 'operator');

            filterCol(operator, value, index, tableNum);
        }
    });

    tables.find('.groupBy.col'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        var tableNum = parseInt($(this).closest('.dataTable').attr('id').
                       substring(11));
        if (e.which === keyCode.Enter) {
            var index = parseColNum($(this).closest('.groupBy'));
            var operator = $(this).closest('.gb').text(); 
            operator = operator.substring(0, operator.indexOf(
                                          "New Column Name"));
            console.log('operator: '+operator+"value: "+value+"index: "+
                        index+"tableNum: "+tableNum);

            groupByCol(operator, value, index, tableNum);
            $('.colMenu').hide();
        }
    });

    tables.find('.filter.col'+colId+' input').click(function() {
        $(this).select();
    });

    tables.find('.joinList.col' + colId).click(function() {
        var tableNum = parseInt($(this).closest('.tableWrap').attr('id').
                   substring(11));
        colId = parseColNum($(this));
        setupJoinModalTables(tableNum, colId);
        $('.colMenu').hide();
    });
}

function dropdownClick(el, outside) {
    $('.colMenu').hide();
    $('.leftColMenu').removeClass('leftColMenu');
    //position colMenu
    var topMargin = -4;
    var leftMargin = 5;
    var top = el[0].getBoundingClientRect().bottom + topMargin;
    var left = el[0].getBoundingClientRect().left + leftMargin;
    if (outside) {
        var tableNum = parseInt(el.closest('.datasetTableWrap').attr('id')
                       .substring(16));
        var menu = $('#outerColMenu'+tableNum);
    } else {
        var menu = el.siblings('.colMenu');
    }
    
    menu.css({'top':top, 'left':left});
    menu.show();
    $('.xcTheadWrap').css('z-index', '9');
    menu.closest('.xcTheadWrap').css('z-index', '10');

    //positioning if dropdown menu is on the right side of screen
    var leftBoundary = $('#rightSideBar')[0].getBoundingClientRect().left;
    if (menu[0].getBoundingClientRect().right > leftBoundary) {
        left = el[0].getBoundingClientRect().right - menu.width();
        menu.css('left', left).addClass('leftColMenu');
    }
    menu.find('.subColMenu').each(function() {
        if ($(this)[0].getBoundingClientRect().right > leftBoundary) {
            menu.find('.subColMenu').addClass('leftColMenu');
        }
    });
}

function highlightColumn(el, keepHighlighted) {
    var index = parseColNum(el);
    var tableNum = parseInt(el.closest('.dataTable').attr('id').
                       substring(11));
    var table = $('#xcTable'+tableNum);
    var tables = $('#xcTable'+tableNum+', #xcTheadWrap'+tableNum);
    $('.selectedCell').removeClass('selectedCell');
    tables.find('th.col'+index).addClass('selectedCell');
    table.find('td.col'+index).addClass('selectedCell');

}

function checkForScrollBar(tableNum) {
    // var tableWidth = $('#xcTable'+tableNum).width()+
    //     parseInt($('#xcTable'+tableNum).css('margin-left'));
    // if ($('.xcTable').length > 1) {
    //     gScrollbarHeight = 0;
    // }else if (tableWidth > $(window).width()) {
    //     console.log('yes', $('.xcTable').length > 1)
    //     gScrollBarHeight = 0;
    //     // gScrollbarHeight = getScrollBarHeight();
    // } else {
    //     gScrollbarHeight = 0;
    // }
    //XXX this entire function may not be needed
    gScrollbarHeight = 0;
}

function checkForMainFrameScrollBar() {
    if ($('#mainFrame')[0].scrollWidth > $('#mainFrame').width()) {
        var forMainFrame = true;
        gScrollbarHeight = getScrollBarHeight(forMainFrame);
    } else {
        gScrollbarHeight = 0;
    } 
    console.log('mainframescrollheight', gScrollbarHeight) 
}

function positionScrollbar(row, tableNum) {
    console.log('positioning scrollbar')
    var canScroll = true;
    var table = $('#xcTable'+tableNum);
    var theadHeight = table.find('thead').height();
    function positionScrollToRow() {
        var tdTop = table.find('.row'+(row-1))[0].offsetTop;
        var scrollPos = Math.max((tdTop-theadHeight), 1);
        if (canScroll && scrollPos > 
                (table.height() - $('#xcTableWrap'+tableNum).height())) {
            canScroll = false;
        }
        $('#xcTbodyWrap'+tableNum).scrollTop(scrollPos);
    }
    
    positionScrollToRow();
    if (!canScroll) {
        // this means we can't scroll to page without moving scrollbar all the
        // way to the bottom, which triggers another getpage and thus we must
        // try to position the scrollbar to the proper row again
        setTimeout(positionScrollToRow, 1);
    }
}

function getScrollBarHeight(outerDiv) {
    console.log('gettingScrollBarHeight')
    var inner = $('<div style="width:100%;height:200px;"></div>');
    if (outerDiv) {
        var outer = $('<div id="mainFrame" style="position:absolute;'+
                    'top:0;left:0;visibility:hidden;width:200px;'+
                    'height:150px;overflow:hidden;"></div>');
    } else {
        var outer = $('<div class="tableWrap" style="position:absolute;'+
                    'top:0;left:0;visibility:hidden;width:200px;'+
                    'height:150px;overflow:hidden;"></div>');
    }
    
    outer.append(inner);
    $('body').append(outer);
    var width1 = inner.outerWidth();
    outer.css('overflow', 'scroll');
    var width2 = inner.outerWidth();
    if (width1 == width2) {
        width2 = outer[0].clientWidth;
    }
    outer.remove();
    return (width1 - width2);
}

function addRowListeners(rowNum, tableNum) {
    var table = $("#xcTable"+tableNum);
    table.find('.row'+rowNum+' .jsonElement').dblclick(function() {
            showJsonModal($(this));
        }
    );
    table.find('.row'+rowNum+' .rowGrab').mousedown(function(event) {
         if (event.which === 1) {
            resrowMouseDown($(this), event);
        }     
    });

    table.find('.row'+rowNum+' .idSpan').dblclick(function() {
        var tableNum = parseInt($(this).closest('table').attr('id')
                .substring(7));
        if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
            bookmarkRow(rowNum, tableNum);
        } else {
            unbookmarkRow(rowNum, tableNum);
        }
    });
}

function addTableListeners(tableNum) {
    $('#xcTableWrap'+tableNum).mousedown(function() { 
        var dynTableNum = parseInt($(this).closest('.tableWrap').attr('id')
                       .substring(11));
        $('.tableTitle').removeClass('tblTitleSelected');
        $('#xcTheadWrap'+dynTableNum+' .tableTitle')
            .addClass('tblTitleSelected');
        gActiveTableNum = dynTableNum;
        updatePageBar(dynTableNum);
        generateFirstLastVisibleRowNum();
    });
}

function focusTable(tableNum) {
    $('#mainFrame').find('.tableTitle').removeClass('tblTitleSelected');
    $('#xcTheadWrap'+tableNum).find('.tableTitle')
        .addClass('tblTitleSelected');
    gActiveTableNum = tableNum;
    updatePageBar(tableNum);
}

function moverowScroller(pageNum, resultSetCount) {
    var pct = 100* (pageNum/resultSetCount);
    $('#rowMarker'+gActiveTableNum)
        .css('transform', 'translate3d('+pct+'%, 0px, 0px)');

}

function setupBookmarkArea() {
    $('#rowScrollerArea').mousedown(function(event) {
    // $('#rowScroller'+tableNum).mousedown(function(event) {
        if (event.which != 1) {
            return;
        }
        if ($(event.target).hasClass('subRowMarker')) {
            rowScrollerStartDrag(event, $(event.target).parent());
            return;
        }
        // console.log(event.target)
        var tableNum = gActiveTableNum;
        var rowScroller = $('#rowScroller'+tableNum)
        var mouseX = event.pageX - rowScroller.offset().left;
        var rowPercent = mouseX/$(this).width();

        var translate = Math.min(99.9, Math.max(0,rowPercent * 100));
        $('#rowMarker'+tableNum).css('transform', 
                                'translate3d('+translate+'%, 0px, 0px)'); 
        
        var rowNum = Math.ceil(rowPercent*gTables[tableNum].resultSetCount);
        if (rowScroller.find('.bookmark').length > 0) {
            // check 8 pixels around for bookmark?
            var yCoor = rowScroller.offset().top+rowScroller.height()-5;
            for (var x = (event.pageX-4); x < (event.pageX+4); x++) {
                var element = $(document.elementFromPoint(x, yCoor));
                if (element.hasClass('bookmark')) {
                    rowNum = parseBookmarkNum(element);
                    break;
                }
            }
        }
        
        // var rowInputNum = $("#rowInput").val();
        var e = $.Event("keypress");
        e.which = keyCode.Enter;
        e['rowScrollerMousedown'] = true;
        var el = $(this)
        setTimeout( function() {
            $("#rowInput").val(rowNum).trigger(e);
        }, 145);
    });
}

function addRowScroller(tableNum) {
    var rowScrollerHTML = '<div id="rowScroller'+tableNum+
        '" class="rowScroller" title="scroll to a row">'+
            '<div id="rowMarker'+tableNum+'" class="rowMarker">'+
            '<div class="subRowMarker top"></div>'+
            '<div class="subRowMarker middle"></div>'+
            '<div class="subRowMarker bottom"></div>'+
            '</div>'+
        '</div>';

    if (tableNum == 0) {
        $('#rowScrollerArea').prepend(rowScrollerHTML);
    } else {
        $('#rowScroller'+(tableNum-1)).after(rowScrollerHTML);
    }
    if ($('.xcTable').length > 1) {
        $('#rowScroller'+tableNum).hide();
    }  
}

function showRowScroller(tableNum) {
    $('.rowScroller').hide();
    $('#rowScroller'+tableNum).show();
}

function bookmarkRow(rowNum, tableNum) {
    //XXX allow user to select color in future? 
    var td = $('#xcTable'+tableNum+' .row'+rowNum+ ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('title', 'bookmarked');
    var leftPos = 100*(rowNum/gTables[tableNum].resultSetCount);
    var bookmark = $('<div class="bookmark bkmkRow'+rowNum+'"'+
        ' style="left:'+leftPos+'%;" title="row '+(rowNum+1)+'"></div>');
    $('#rowScroller'+tableNum).append(bookmark);
    if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
        gTables[tableNum].bookmarks.push(rowNum);
    }
}

function unbookmarkRow(rowNum, tableNum) {
    console.log('unbookmark')
    var td = $('#xcTable'+tableNum+' .row'+rowNum+ ' .col0');
    td.removeClass('rowBookmarked');
    td.find('.idSpan').attr('title', '');
    console.log('#bkmkRow'+rowNum);
    $('#rowScroller'+tableNum).find('.bkmkRow'+rowNum).remove();
    var index = gTables[tableNum].bookmarks.indexOf(rowNum);
    gTables[tableNum].bookmarks.splice(index,1);
}

function parseBookmarkNum(el) {
    var classNames = el.attr('class');
    var index = classNames.indexOf('bkmkRow')+'bkmkRow'.length;
    return parseInt(classNames.substring(index))+1;
}

function updatePageBar(tableNum) {
    showRowScroller(tableNum);
    if ($.isEmptyObject(gTables[gActiveTableNum])) {
        $('#numPages').text("");
    } else {
        var num = Number(gTables[gActiveTableNum].resultSetCount).
                    toLocaleString('en');
        $('#numPages').text('of '+num);
    }
}

function rowScrollerStartDrag(event, el) {
    gMouseStatus = "rowScroller";
    el.addClass('scrolling');
    resrow.el = el;
    resrow.mouseStart = event.pageX;
    resrow.scrollAreaOffset = el.parent().offset().left;
    resrow.rowScrollerWidth = el.parent().width(); 
    var scrollerPositionStart = el.position().left;
    var mouseOffset = resrow.mouseStart - el.offset().left;
    var cssLeft = parseInt(el.css('left'));
    resrow.totalOffset = mouseOffset + cssLeft;
    resrow.boundary = {
        lower: resrow.scrollAreaOffset, 
        upper: resrow.scrollAreaOffset + resrow.rowScrollerWidth 
    }

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
    '{cursor:pointer !important}</style>';
    $(document.head).append(cursorStyle);
    disableTextSelection();
}

function rowScrollerMouseMove(event) {
    var mouseX = event.pageX;
    var translate;
    if (mouseX - resrow.totalOffset < resrow.boundary.lower) {
        translate = 0;
    } else if (mouseX - resrow.totalOffset > resrow.boundary.upper ) {
        translate = 100;
    } else {
        translate = 100 * (mouseX - resrow.scrollAreaOffset 
                    - resrow.totalOffset) / (resrow.rowScrollerWidth - 1);
    }
    resrow.el.css('transform', 'translate3d('+translate+'%, 0px, 0px)'); 
}

function rowScrollerMouseUp() {
    gMouseStatus = null;
    resrow.el.removeClass('scrolling');
    $('#moveCursor').remove();
    reenableTextSelection();
    var e = $.Event("mousedown");
    e.which = 1;
    e.pageX = (resrow.el.offset().left - parseInt(resrow.el.css('left')) + 0.5);
    if (e.pageX + 3 >= resrow.rowScrollerWidth + resrow.scrollAreaOffset) {
        e.pageX += 3;
    } else if (e.pageX - 2 <= resrow.scrollAreaOffset) {
        e.pageX -= 2;
    }
    $("#rowScrollerArea").trigger(e);
}

function resizeRowInput() {
    var resultTextLength = (""+gTables[gActiveTableNum].resultSetCount).length;
    if (resultTextLength > $('#rowInput').attr('size')) {
        $('#rowInput').attr({'maxLength': resultTextLength,
                          'size': resultTextLength});
    }  
}
    
function dragTableMouseDown(el, e) {
    gMouseStatus = "movingTable"
    gDragObj.mouseX = e.pageX;
    gDragObj.table = el.closest('.xcTableWrap');
    gDragObj.tableIndex = parseInt(gDragObj.table.attr('id').substring(11));
    gDragObj.originalIndex = gDragObj.tableIndex;
    gDragObj.mainFrame = $('#mainFrame');
    var rect = gDragObj.table[0].getBoundingClientRect();

    // gDragObj.rectLeft = rect.left - gDragObj.mouseX;
    // gDragObj.maxScroll = $('#mainFrame')[0].scrollWidth -
    //                      $('#mainFrame').width();


    gDragObj.offsetLeft = gDragObj.table.offset().left;
    gDragObj.prevTable = gDragObj.table.prev();
    gDragObj.mouseOffset = gDragObj.mouseX - rect.left;
    gDragObj.docHeight = $(document).height();
    gDragObj.tableScrollTop = gDragObj.table.scrollTop();

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
    '{cursor:move !important; cursor: -webkit-grabbing !important;'+
    'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);
    createShadowTable();
    sizeTableForDragging();
    gDragObj.table.addClass('tableDragging');
    gDragObj.table.css('left', gDragObj.offsetLeft+'px');
    gDragObj.windowWidth = $(window).width();
    gDragObj.pageX = e.pageX;
    checkForMainFrameScrollBar();
    gDragObj.table.scrollTop(gDragObj.tableScrollTop);
    createTableDropTargets();
    dragdropMoveMainFrame();
    disableTextSelection();
}
    
function dragTableMouseMove(e) {
    // var left = gDragObj.offsetLeft + (e.pageX - gDragObj.mouseX);
    var left =  e.pageX - gDragObj.mouseOffset;
    gDragObj.table.css('left',left+'px');
    gDragObj.pageX = e.pageX;
}

function dragTableMouseUp() {
    gMouseStatus = null;
    gDragObj.table.removeClass('tableDragging')
                    .css({'left':'0px', 'height':'100%'});
    $('#shadowTable, #moveCursor, #dropTargets').remove();
    $('#mainFrame').off('scroll', mainFrameScrollTableTargets);
    gDragObj.table.scrollTop(gDragObj.tableScrollTop);
    gActiveTableNum = gDragObj.tableIndex;
    checkForScrollBar();
    reenableTextSelection(); 

    if (gDragObj.tableIndex != gDragObj.originalIndex) {
        // reorder only if order changed
        reorderAfterTableDrop();
    }
}

function createShadowTable() {
    var rect = gDragObj.table[0].getBoundingClientRect();
    var width = gDragObj.table.children().width();
    // var height = Math.min($('#mainFrame').height()-gScrollbarHeight, 
    //     gDragObj.table.children().height());
    var tableHeight = gDragObj.table.find('.xcTheadWrap').height() + 
                      gDragObj.table.find('.xcTbodyWrap').height();
    var shadowTable = '<div id="shadowTable" '+
                'style="width:'+width+'px;height:'+tableHeight+'px;">'+
            '</div>';

    if (gDragObj.prevTable.length > 0) {
        gDragObj.prevTable.after(shadowTable );
    } else {
        $('#mainFrame').prepend(shadowTable);
    }
}

function createTableDropTargets(dropTargetIndex, oldIndex, swappedTable) {
    var offset = gDragObj.mouseX - gDragObj.offsetLeft;
    var dragMargin = 100;
    
    if (!swappedTable) {
        var dropTargets = "";
        var i = 0;
        var tableWidth = gDragObj.table.width();
        $('#mainFrame').find('.xcTableWrap').each(function() {
            if (i == gDragObj.tableIndex) {
                i++;
                return true;  
            }

            if ((tableWidth-dragMargin) < 
                    Math.round(0.5*$(this).outerWidth())) {
                var targetWidth = tableWidth;
            } else {
                var targetWidth = Math.round(0.5*$(this).outerWidth())+
                                  dragMargin;
            }
            var tableLeft = $(this).position().left + 
                            $('#mainFrame').scrollLeft();
            dropTargets += '<div id="dropTarget'+i+'" class="dropTarget"'+
                            'style="left:'+(tableLeft-dragMargin+offset)+'px;'+
                            'width:'+targetWidth+'px;height:'
                            +(gDragObj.docHeight)+'px;">'+i+
                            '</div>';
            i++;
        });

        var tableLeft = -$('#mainFrame').scrollLeft();
        $('body').append('<div id="dropTargets" style="left:'+
                tableLeft+'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapTables($(this));
        });
        $('#mainFrame').scroll(mainFrameScrollTableTargets);
    } else {
        var tableLeft = swappedTable.position().left + 
                        $('#mainFrame').scrollLeft();
        $('#dropTarget'+dropTargetIndex).attr('id', 'dropTarget'+oldIndex);
        $('#dropTarget'+oldIndex)
            .css({'left': (tableLeft-dragMargin+offset)+'px'});
    }

}

function mainFrameScrollTableTargets() {
    var left = $('#mainFrame').scrollLeft();
    $("#dropTargets").css('left', '-'+left+'px');
}

function dragdropSwapTables(el) {
    var dropTargetIndex = parseInt((el.attr('id')).substring(10));
    var table = $('#xcTableWrap'+dropTargetIndex);
    var tableScrollTop = table.scrollTop();
    if (dropTargetIndex >gDragObj.tableIndex) {
        table.after($('#shadowTable'));
        table.after(gDragObj.table);
    } else {
        table.before($('#shadowTable'));
        table.before(gDragObj.table);
    }

    gDragObj.table.scrollTop(gDragObj.tableScrollTop);

    gDragObj.table.attr('id', 'xcTableWrap'+dropTargetIndex);
    gDragObj.table.find('.xcTheadWrap').attr('id',
                                             'xcTheadWrap'+dropTargetIndex);
     
    table.attr('id', 'xcTableWrap'+gDragObj.tableIndex);
    table.find('.xcTheadWrap').attr('id', 'xcTheadWrap'+gDragObj.tableIndex);
    
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
    var rowScroller = $('#rowScroller'+gDragObj.originalIndex);
    if (gDragObj.tableIndex == 0) {
        $('#rowScrollerArea').prepend(rowScroller);
    } else if (gDragObj.originalIndex < gDragObj.tableIndex) {
        $('#rowScroller'+gDragObj.tableIndex).after(rowScroller);
    } else if (gDragObj.originalIndex > gDragObj.tableIndex) {
        $('#rowScroller'+gDragObj.tableIndex).before(rowScroller);
    }

    // correct table and rowscroller id numbers
    var rowScrollers = $('.rowScroller');
    var start = Math.min(gDragObj.originalIndex, gDragObj.tableIndex);
    var end = Math.max(gDragObj.originalIndex, gDragObj.tableIndex);
    for (var i = start; i <= end; i++) {
        // tablewrap and xcTheadWrap IDs were already changed during table
        // swapping
        var tableWrap = $('#xcTableWrap'+i);
        var table = tableWrap.find('.xcTable');
        var oldIndex = parseInt(table.attr('id').substring(7));
        table.attr('id', 'xcTable'+i);
        tableWrap.find('.xcTbodyWrap').attr('id', 'xcTbodyWrap'+i);
        tableWrap.find('.tableMenu').attr('id', 'tableMenu'+i);
        $(rowScrollers[i]).attr('id', 'rowScroller'+i);
        $(rowScrollers[i]).find('.rowMarker').attr('id','rowMarker'+i);
    }
}

function adjustColGrabHeight(tableNum) {
    console.log('adjusting height')
    var tableWrap = $('#xcTableWrap'+tableNum);
    var tableTitleHeight = tableWrap.find('.tableTitle').outerHeight();
    var tableWrapHeight = tableWrap.height() - tableTitleHeight;
    var mainFrameHeight = $('#mainFrame').height() - tableTitleHeight - 15;
    var visibleTableHeight = tableWrap.find('.xcTable')[0]
                             .getBoundingClientRect().bottom - 
                             $('#mainFrame')[0].getBoundingClientRect().top -
                             tableTitleHeight - 5;
    var tableHeight = tableWrap.find('.xcTable').height() + tableTitleHeight;

    var colGrabHeight = Math.min(tableWrapHeight, mainFrameHeight, tableHeight);
    tableWrap.find('.colGrab').height(colGrabHeight);
}
