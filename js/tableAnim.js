function generateFirstLastVisibleRowNum() {
    //XXX table will need to be passed in
    var mfPos = $('#autoGenTableWrap'+gActiveTableNum)[0]
                .getBoundingClientRect();
    var tdXCoor = 30;
    var tdYCoor = 80;
    var tdBotYCoor = -18;
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+mfPos.left,
                                            tdYCoor+mfPos.top);
    var firstId = $(firstEl).closest('tr').attr('class');
    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(3))+1;
    }

    var tdBottom = tdBotYCoor + mfPos.bottom;
    var lastEl = document.elementFromPoint(tdXCoor+mfPos.left,
                                           tdBottom);
    var lastId = $(lastEl).closest('tr').attr('class');
    if (lastId && lastId.length > 0) {
        var lastRowNum = parseInt(lastId.substring(3))+1;
    }

    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar .rowNum:first-of-type').html(firstRowNum);
        moverowScroller(firstRowNum, gTables[gActiveTableNum].resultSetCount);
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar .rowNum:last-of-type').html(lastRowNum);
    } 
}

function resizableColumns(tableNum) {
    // $('#autoGenTable'+tableNum+' tr:first .header').each(
    $('#autoGenTable'+tableNum+' .header').each(
        function() {
            if (!$(this).children().hasClass('colGrab') 
                &&!$(this).parent().is(':first-child')) {
                    var grabArea = $('<div class="colGrab"></div>');
                    $(this).prepend(grabArea);
                    grabArea.mousedown(
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
    $('#autoGenTable'+tableNum+' .colGrab')
            .height($('#autoGenTable'+tableNum).height());
    if (gRescol.first) {
        $('#autoGenTable'+tableNum+' tr:first th').each(
            function() {
                    var initialWidth = $(this).width();
                    $(this).width(initialWidth);
                    $(this).removeAttr('width');
            } 
        );
        gRescol.first = false;
    } 
}

// el is th .subColMenu li
function subColMenuMouseEnter(el) {
    el.siblings().addClass('subColUnselected');
    el.addClass('subColSelected');
    el.parent().parent().addClass('subSelected');

    if (el.is(':first-child')) {
        el.parent().siblings('.rightArrow').addClass('arrowExtended');
    }
    
    if (el.parent().parent().is(':first-child')) {
        el.parent().parent().parent().addClass('dimmed');
        el.parent().parent().parent().siblings('.rightArrow').
            removeClass('arrowExtended').addClass('dimmed');
    }
}

function subColMenuMouseLeave(el) {
    el.siblings().removeClass('subColUnselected');
    el.removeClass('subColSelected');
    el.parent().parent().removeClass('subSelected');
    el.parent().siblings('.rightArrow').removeClass('arrowExtended').
        removeClass('dimmed');
    el.closest('.colMenu').removeClass('dimmed');
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
    console.log('resizingcol', el.closest('thead'))
    gMouseStatus = "resizingCol";
    event.preventDefault();
    gRescol.mouseStart = event.pageX;
    gRescol.grabbedCell = el.parent().parent();  // the th 
    gRescol.index = gRescol.grabbedCell.index();
    gRescol.startWidth = gRescol.grabbedCell.outerWidth();
    var tableNum = parseInt(el.closest('table').attr('id').substring(12));
    gRescol.tableNum = tableNum;
    gRescol.colNum = parseColNum(gRescol.grabbedCell);
    // var rowNum = gRescol.grabbedCell.closest('thead').index();
    if (gRescol.grabbedCell.closest('thead').hasClass('fauxTHead')) {
        var rowNum = 0;
    } else {
        var rowNum = 1;
    }
    gRescol.secondCell = $('#autoGenTable'+tableNum+' tr:eq('+rowNum+') th.col'+
                            gRescol.colNum);
    gRescol.lastCellWidth = $('#autoGenTable'+tableNum+' thead:last th:last')
                            .outerWidth();
    gRescol.tableWidth = $('#autoGenTable'+tableNum).outerWidth();
    gRescol.tableExcessWidth = gRescol.tableWidth - gMinTableWidth;
    gRescol.thead = $('#autoGenTable'+tableNum+' thead:first');
    gRescol.theadWrap = $('#theadWrap'+tableNum);
    var minTableWidth = gRescol.tableWidth - 
                            (gRescol.startWidth-gRescol.cellMinWidth);
    gRescol.tempMinTableWidth = Math.max(minTableWidth, gMinTableWidth);

    if (gRescol.grabbedCell.is(':last-child')) {
        gRescol.lastCellGrabbed = true;
    }

    gRescol.tempCellMinWidth = gRescol.cellMinWidth-5;
    gRescol.leftDragMax =  gRescol.tempCellMinWidth - gRescol.startWidth;
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
            console.log(dragDist,-gRescol.tableExcessWidth)
            $('#autoGenTable'+gRescol.tableNum+' thead th:last-child')
                .outerWidth(gRescol.lastCellWidth - 
                (dragDist + gRescol.tableExcessWidth));
        }     
    } else if (dragDist < gRescol.leftDragMax ) {
        gRescol.grabbedCell.outerWidth(gRescol.tempCellMinWidth);
        gRescol.secondCell.outerWidth(gRescol.tempCellMinWidth);
    }
    var tableWidth = $('#autoGenTable'+gRescol.tableNum).width();
    gRescol.thead.outerWidth(tableWidth);
    gRescol.theadWrap.outerWidth(tableWidth+10);
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
        if (dragDist < gRescol.leftDragMax) {
            gRescol.grabbedCell.outerWidth(gRescol.tempCellMinWidth);
            gRescol.secondCell.outerWidth(gRescol.tempCellMinWidth);
        } else {
            gRescol.grabbedCell.
                outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
            gRescol.secondCell.
                outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        }
        $('#autoGenTable'+gRescol.tableNum+' thead')
            .width(gRescol.tempMinTableWidth);
    } 
    var tableWidth = $('#autoGenTable'+gRescol.tableNum).width();
    gRescol.thead.outerWidth(tableWidth);
    gRescol.theadWrap.outerWidth(tableWidth+10);
}

function gRescolMouseUp() {
    gMouseStatus = null;
    gRescol.lastCellGrabbed = false;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    $('#autoGenTable'+gRescol.tableNum+' .rowGrab')
            .width($('#autoGenTable'+gRescol.tableNum).width());
    var progCol = gTables[gRescol.tableNum].tableCols[gRescol.index-1];
    progCol.width = gRescol.grabbedCell.outerWidth();
    matchHeaderSizes(gRescol.tableNum);
    checkForScrollBar(gRescol.tableNum);
}

function resrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
    resrow.tableNum = parseInt(el.closest('table').attr('id').substring(12));
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
    if (newHeight < gRescol.minCellHeight) {
        resrow.targetTd.outerHeight(gRescol.minCellHeight);
        $('#autoGenTable'+resrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', gRescol.minCellHeight-4);
    } else {
        resrow.targetTd.outerHeight(newHeight);
        $('#autoGenTable'+resrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', newHeight-4);
    }
}

function resrowMouseUp() {
    gMouseStatus = null;
    reenableTextSelection();
    $('#ns-resizeCursor').remove();
    $('body').removeClass('hideScroll'); 
    $('.colGrab').height($('#autoGenTable0').height()-10);
    generateFirstLastVisibleRowNum()
}

function dragdropMouseDown(el, event) {
    gMouseStatus = "movingCol";
    gDragObj.mouseX = event.pageX;
    gDragObj.colNum = parseColNum(el);
    gDragObj.tableNum = parseInt(el.closest('table').attr('id').substring(12));
    gDragObj.element = el;
    gDragObj.colIndex = parseInt(el.index());
    gDragObj.scrollLeft = $('#autoGenTable'+gDragObj.tableNum).position().left;
    gDragObj.top = parseInt($('#theadWrap'+gDragObj.tableNum).css('top')) + 5;
    gDragObj.offsetTop = el.offset().top;
    gDragObj.left = el.offset().left - 
            gDragObj.scrollLeft;

    gDragObj.docHeight = $(document).height();
    gDragObj.val = el.find('.editableHead').val();
    var tableHeight = $('#autoGenTable'+gDragObj.tableNum).height();
    var autoGenTableWrapHeight = el.closest('#autoGenTableWrap'+
                                gDragObj.tableNum).height()-gScrollbarHeight;
    var shadowDivHeight = Math.min(tableHeight,autoGenTableWrapHeight);
    gDragObj.inFocus =  el.find('.editableHead').is(':focus');
    gDragObj.colWidth = el.outerWidth();

    // create a replica shadow with same column width, height,
    // and starting position
    el.closest('#autoGenTableWrap'+gDragObj.tableNum)
                    .append('<div id="shadowDiv" style="width:'+
                            (gDragObj.colWidth)+
                            'px;height:'+(shadowDivHeight-30)+'px;left:'+
                            (gDragObj.element.position().left+10)+
                            'px;top:'+(gDragObj.top+30)+'px;"></div>');

    // create a fake transparent column by cloning 
    createTransparentDragDropCol();

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
        '{cursor:move !important; cursor: -webkit-grabbing !important;'+
        'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);
    disableTextSelection();
    createDropTargets();
}

function dragdropMouseMove(event) {
    var newX = gDragObj.left + (event.pageX - gDragObj.mouseX) - 
        $('#autoGenTableWrap'+gDragObj.tableNum).scrollLeft();
    $('#fauxCol').css('left', newX);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    $('#shadowDiv, #fauxCol, #dropTargets, #moveCursor').remove();
    $('#autoGenTableWrap'+gDragObj.tableNum).off('scroll', tableScrollDropTargets); 
    $('#mainFrame').off('scroll', mainFramecrollDropTargets);
    $('#mainFrame').removeClass('hideScroll');
    var progCol = gTables[gDragObj.tableNum].tableCols[gDragObj.colNum-1];
    var isDark = gDragObj.element.hasClass('unusedCell');
    var selected = gDragObj.element.hasClass('selectedCell');
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex) != gDragObj.colNum) { 
        console.log('deleting')
        delCol(gDragObj.colNum, gDragObj.tableNum, true);
        progCol.index = gDragObj.colIndex;
        insertColAtIndex(gDragObj.colIndex-1, gDragObj.tableNum, progCol);
        addCol("col"+(gDragObj.colIndex-1), "autoGenTable"+gDragObj.tableNum, 
                progCol.name, {width: progCol.width,
                isDark: isDark, 
                select: selected, 
                inFocus: gDragObj.inFocus,
                progCol: progCol});
        execCol(progCol, gDragObj.tableNum);
    }
    reenableTextSelection(); 
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
    clone.outerWidth(gDragObj.colWidth-5);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($("#fauxTable"));
}

function createTransparentDragDropCol() {
    // $('#autoGenTableWrap'+gDragObj.tableNum)
    var leftPos = gDragObj.left - 
        $('#autoGenTableWrap'+gDragObj.tableNum).scrollLeft();
    $('#mainFrame')
                .append('<div id="fauxCol" style="left:'+
                        leftPos+'px;top:'+
                        (gDragObj.offsetTop)+'px;width:'+
                        (gDragObj.colWidth-5)+'px">'+
                            '<table id="fauxTable" '+
                            'class="dataTable autoGenTable" '+
                            'style="width:'+(gDragObj.colWidth-5)+'px">'+
                            '</table>'+
                        '</div>');
    
    var rowHeight = 20;
    // turn this into binary search later
    var topPx = $('#autoGenTable'+gDragObj.tableNum+' thead').offset().top + 
                $('#autoGenTable'+gDragObj.tableNum+' thead').outerHeight() -
                rowHeight;
    var topRowIndex = -1;
    var topRowTd = null;
    $('#autoGenTable'+gDragObj.tableNum+' tbody tr').each(function() {
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
        $('#autoGenTable'+gDragObj.tableNum+' tr').each(function(i, ele) {
            cloneCellHelper(ele);
        });
        return;
    }

    // Clone head
    $('#autoGenTable'+gDragObj.tableNum+' tr:first').each(function(i, ele) {
        cloneCellHelper(ele);
    });

    var totalRowHeight = gDragObj.element
            .closest('#autoGenTableWrap'+gDragObj.tableNum).height()-
            $('#autoGenTable'+gDragObj.tableNum+' th:first').outerHeight() -
            gScrollbarHeight;
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    $('#autoGenTable'+gDragObj.tableNum+' tr:gt('+(topRowIndex+1)+')')
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
    var autoGenTableWrap0Height = $('#autoGenTableWrap0').height()- 
        gScrollbarHeight;
    var fauxColHeight = Math.min(fauxTableHeight, autoGenTableWrap0Height);
    $('#fauxCol').height(fauxColHeight-30);
    var firstRowOffset = $(topRowEl).offset().top - topPx-rowHeight;
    $('#fauxTable').css('margin-top', $('#fauxTable tr:first').outerHeight()+
                        firstRowOffset);
    $('#fauxTable tr:first-child').css({'margin-top': 
            -($('#fauxTable tr:first').outerHeight()+firstRowOffset)});
}

function createDropTargets(dropTargetIndex, swappedColIndex) {
    // var offset = distance from the left side of dragged column
    // to the point that was grabbed
    var offset = gDragObj.mouseX - gDragObj.left;
    var dragMargin = 30; 
    // targets extend this many pixels to left of each column
   
    if (!dropTargetIndex) {
        // create targets that will trigger swapping of columns on hover
        var dropTargets = "";
        var i = 0;
        $('#autoGenTable'+gDragObj.tableNum+' tr:first th').each(function() {
            if (i == 0 || i == gDragObj.colIndex) {
                i++;
                return true;  
            }
            // var colLeft = $(this)[0].getBoundingClientRect().left;
            var colLeft = $(this).position().left;
            if ((gDragObj.colWidth-dragMargin) < 
                Math.round(0.5*$(this).width())) {
                var targetWidth = gDragObj.colWidth;
            } else {
                var targetWidth = Math.round(0.5*$(this).outerWidth())+
                                  dragMargin;
            }
            dropTargets += '<div id="dropTarget'+i+'" class="dropTarget"'+
                            'style="left:'+(colLeft-dragMargin+offset)+'px;'+
                            'width:'+targetWidth+'px;height:'
                            +(gDragObj.docHeight)+'px;">'+i+
                            '</div>';
            i++;
        });

        var tableLeft = $('#autoGenTable'+gDragObj.tableNum)[0]
            .getBoundingClientRect().left + 
            $('#autoGenTableWrap'+gDragObj.tableNum).scrollLeft();
        $('body').append('<div id="dropTargets" style="left:'+tableLeft+'px;"></div>');
        $('#dropTargets').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapColumns($(this));
        });
        if ($('.autoGenTable').length == 2) {
            $('#autoGenTableWrap'+gDragObj.tableNum)
                .scroll(tableScrollDropTargets);
        } 
        $('#mainFrame').scroll(mainFramecrollDropTargets);
       
    } else {
        // targets have already been created, so just adjust the one corresponding
        // to the column that was swapped
        var swappedCol = $('#autoGenTable'+gDragObj.tableNum +
            ' th:eq('+swappedColIndex+')');
        var colLeft = swappedCol.position().left;
        $('#dropTarget'+dropTargetIndex)
            .attr('id', 'dropTarget'+swappedColIndex);
        var dropTarget = $('#dropTarget'+swappedColIndex);
        dropTarget.css({'left': (colLeft-dragMargin+offset)+'px'});
    }
}

function tableScrollDropTargets(event) {
    var left = -$(event.target).scrollLeft();
    $('#dropTargets').css('left',left);
}

function mainFramecrollDropTargets(event) {
    var left = $('#autoGenTable'+gDragObj.tableNum)[0].getBoundingClientRect().left;
    $('#dropTargets').css('left', left);
}

function dragdropSwapColumns(el) {
    var dropTargetId = parseInt((el.attr('id')).substring(10));
    var nextCol = dropTargetId - Math.abs(dropTargetId-gDragObj.colIndex);
    var prevCol = dropTargetId + Math.abs(dropTargetId-gDragObj.colIndex);
    var movedCol;
    if (dropTargetId>gDragObj.colIndex) {
        $('#autoGenTable'+gDragObj.tableNum+' tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').after(
                $(this).children(':eq('+nextCol+')'));
        });
        movedCol = nextCol;
    } else {
        $('#autoGenTable'+gDragObj.tableNum+' tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').before(
                $(this).children(':eq('+prevCol+')'));
        });
        movedCol = prevCol;
    }
    var left = gDragObj.element.position().left+10;
        // console.log(gDragObj.element.offset().left,gDragObj.element.position().left , $('#autoGenTable'+gDragObj.tableNum).position().left, $('#mainFrame').scrollLeft());
    $('#shadowDiv').css('left', left); 
    gDragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function gRescolDelWidth(colNum, tableNum, resize) {
    matchHeaderSizes(tableNum, true);
    var table = $('#autoGenTable'+tableNum);
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
    console.log(el.attr('class'))
    var index = parseColNum(el);
    var tableNum = parseInt(el.closest('table').attr('id').substring(12));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || gRescol.cellMinWidth-10;
    var oldTableWidth = $('#autoGenTable'+tableNum).width();
    var maxWidth = 700;
    var oldWidth = el.width();  
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var newWidth = Math.max(widestTdWidth, minWidth);
    newWidth = Math.min(newWidth, maxWidth);
    var widthDiff = newWidth - oldWidth; 
    if (widthDiff > 0) {
        $('#autoGenTable'+tableNum+' thead').width('+='+(newWidth-oldWidth));
        el.width(newWidth);
    } else if (oldTableWidth + widthDiff < gMinTableWidth) {
        el.width(newWidth);
        $('#autoGenTable'+tableNum+' tr:first th:last').outerWidth('+='+
            (gMinTableWidth-(oldTableWidth+widthDiff)));
    } else {
        el.width(newWidth);
    }
    if (index != 1) { // don't store id column
        gTables[tableNum].tableCols[index-1].width = el.outerWidth();
    }
    matchHeaderSizes(tableNum, resizeFirstRow);
}

function getWidestTdWidth(el, options) {
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var id = parseColNum(el);
    var tableNum = parseInt(el.closest('table').attr('id').substring(12));
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 4;
    var largestTd = $('#autoGenTable'+tableNum+' tbody'+
                    ' tr:first td:eq('+(id)+')');
    var headerWidth = 0;

    $('#autoGenTable'+tableNum+' tbody tr').each(function(){
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
        var th = $('#autoGenTable'+tableNum+' .col'+id+' .editableHead');
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
    $(".autoGenTable tbody tr").each(function(){
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
        autosizeCol(el.parent().parent(), {resizeFirstRow: resize});
        $('#ew-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
    }
}

function cloneTableHeader(tableNum) {
    var autoGenTableWrapTop = $('#autoGenTableWrap'+tableNum).offset().top;
    var tHead = $('#autoGenTable'+tableNum+' thead');
    
    var tHeadXPos = 0;
    var tHeadYPos = 0;
    var tHeadClone = $('#autoGenTable'+tableNum+' thead').clone();
    var leftPos = $('#autoGenTable'+tableNum).position().left;

    tHeadClone.addClass('fauxTHead');
    tHead.addClass('trueTHead');
    $('#autoGenTable'+tableNum+' thead').after(tHeadClone);
    tHead.css({'position':'absolute', 'top':30,
                    'left':leftPos, 'padding-top':5});
    //XXX z-index of theadwrap decreases per every theadwrap
    tHead.wrap('<div id="theadWrap'+tableNum+'" class="theadWrap"'+
                'style="z-index:'+(10-tableNum)+';'+
                'top:'+(tHeadYPos)+'px;"></div>');
    var tHeadWrap = $('#theadWrap'+tableNum);
    //XX build this table title somewhere else
    if (gTables[tableNum] != undefined) {
        var tableName = gTables[tableNum].frontTableName;
    } else {
        var tableName = "";
    }
    tHeadWrap.prepend('<div class="tableTitle"><input type="text" value="'+
        tableName+'">'+
        '</div>');
    tHeadWrap.find('.tableTitle input').keyup(function(event) {
        if (event.which ==keyCode.Enter) {
            $(this).blur();
        }
    });

    matchHeaderSizes(tableNum);

    $('#autoGenTable'+tableNum).width(0); 
    tHeadClone.find('.colGrab').remove();
    resizableColumns(tableNum);
}

function matchHeaderSizes(tableNum, reverse) {
    var tHeadLength = $('.fauxTHead th').length;
    if (reverse) {
        var trueTHead = '.fauxTHead';
        var fauxTHead = '.trueTHead';
    } else {
        var trueTHead = '.trueTHead';
        var fauxTHead = '.fauxTHead';
    }
    for (var i = 0; i < tHeadLength; i++) {
        var width = $('#autoGenTable'+tableNum+' '+fauxTHead+' th').eq(i)
                    .outerWidth();
        $('#autoGenTable'+tableNum+' '+trueTHead+' th').eq(i).outerWidth(width);
    }
    $('#autoGenTable'+tableNum+' thead').width($('#autoGenTable'+tableNum).width());
    $('#autoGenTable'+tableNum+' .rowGrab').width($('#autoGenTable'+tableNum)
                                           .width());
    $('#autoGenTable'+tableNum+' .theadWrap').width($('#autoGenTable'+tableNum)
                                             .width()+10);
}

function addColListeners(colId, tableId) {
    console.log("Adding col listeners for "+tableId+":"+colId);
    var table = $('#'+tableId);
    var tableNum = parseInt(tableId.substring(12));
    resizableColumns(tableNum);
    table.find('.editableHead.col'+colId).focus(function() {
        var dynTableNum = parseInt($(this).closest('table').attr('id')
                          .substring(12));
        $('.colMenu').hide();
        $(this).closest('.theadWrap').css('z-index', '9');
        var index = parseColNum($(this));
        if (gTables[dynTableNum].tableCols[index-1].userStr.length > 0) {
            $(this).val(gTables[dynTableNum].tableCols[index-1].userStr);
        }
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
        highlightColumn($(this));
        $(this).parent().siblings('.dropdownBox')
            .addClass('hidden');
    }).blur(function() {
        var dynTableNum = parseInt($(this).closest('table').attr('id')
                          .substring(12));
        var index = parseColNum($(this));
        if (gTables[dynTableNum].tableCols[index-1].name.length > 0) {
            $(this).val(gTables[dynTableNum].tableCols[index-1].name);
        } 
        $(this).parent().siblings('.dropdownBox')
            .removeClass('hidden');
    });

    table.find('.editableHead.col'+colId).keyup(function(e) {
        console.log('head key up');
        gFnBarOrigin = $(this);
        if (e.which == keyCode.Enter) {
            var index = parseColNum($(this));
            var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
            var progCol = parseCol($(this).val(), index, tableNum, true);
            execCol(progCol, tableNum);
            if (progCol.name.length > 0) {
                $(this).val(progCol.name);
            } else {
                // keep value that user entered
            }
            $(this).blur();
            $(this).closest('th').removeClass('unusedCell');
            table.find('td:nth-child('+index+')').removeClass('unusedCell');
        }
    });

    table.find('.editableHead.col'+colId).on('input', function(e) {
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
    });

    table.find('.table_title_bg.col'+colId+' .dropdownBox').click(function() {
        console.log('dropdownclicked');
        $('.colMenu').hide();
        $('.leftColMenu').removeClass('leftColMenu');
        //position colMenu
        var top = $(this)[0].getBoundingClientRect().bottom;
        var left = $(this)[0].getBoundingClientRect().left+3;
        var colMenu = $(this).siblings('.colMenu');
        colMenu.css({'top':top, 'left':left});
        colMenu.show();
        $('.theadWrap').css('z-index', '9');
        colMenu.closest('.theadWrap').css('z-index', '10');

        //positioning if dropdown menu is on the right side of screen
        if (colMenu[0].getBoundingClientRect().right > $(window).width()) {
            console.log('a');
            left = $(this)[0].getBoundingClientRect().right - colMenu.width();
            colMenu.css('left', left);
            colMenu.addClass('leftColMenu');
        }
        if (colMenu.find('.subColMenu').length) {
            if (colMenu.find('.subColMenu')[0].getBoundingClientRect().right > 
                $(window).width()) {
                    colMenu.find('.subColMenu').addClass('leftColMenu');
            }
        }

    });

    table.find('.table_title_bg.col'+colId+' .dropdownBox')
        .mouseenter(function() {
            $(this).removeClass('hidden');
    }).mouseout(function() {
        var input = $(this).siblings('.editableHead');
        if (input.is(':focus')) {
            $(this).addClass('hidden');
        }
    });

    table.find('.table_title_bg.col'+colId+' .subColMenuArea')
        .mousedown(function() {
            $('.colMenu').hide();
    });

    table.find('.table_title_bg.col'+colId+' ul.colMenu > li:first-child')
        .mouseenter(function(){
            $(this).parent().removeClass('white');
    }).mouseleave(function(){
        $(this).parent().addClass('white');
    });

    table.find('.table_title_bg.col'+colId+' .subColMenu li')
        .mouseenter(function() {
            subColMenuMouseEnter($(this));
    }).mouseleave(function() {
            subColMenuMouseLeave($(this));
    });

    table.find('.table_title_bg.col'+colId+' .colMenu ul')
        .mouseleave(function(){
            if ($(this).parent().is(':first-child')) {
                $(this).parent().parent().siblings('.rightArrow').
                removeClass('dimmed').addClass('arrowExtended');
            } 
    });

    table.find('.table_title_bg.col'+colId+' .dragArea')
        .mousedown(function(event){
        var headCol = $(this).parent().parent();
        dragdropMouseDown(headCol, event);
    }); 

    table.find('.table_title_bg.col'+colId).mouseover(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $(this).find('.dropdownBox').css('opacity', 1);
        }
    }).mouseleave(function() {
        $(this).find('.dropdownBox').css('opacity', 0.4);
    });

    table.find('.editableHead.col'+colId).mousedown(function(event) {
        //XXX Test to see if we even need this anymore
        event.stopPropagation();
    });

    addColMenuActions(colId, tableId);
}

function addColMenuActions(colId, tableId) {
    var tableNum = parseInt(tableId.substring(12));
    var table = $('#'+tableId);

    table.find('.table_title_bg.col'+colId+' .colMenu li').click(function() {
        if ($(this).children('.subColMenu, input').length === 0) {
            // hide li if doesnt have a submenu or an input field
            $(this).closest('.colMenu').hide();
            $(this).closest('.theadWrap').css('z-index', '9');
        }
    });
    console.log(colId, tableId)
    table.find('.table_title_bg.col'+colId+' .addColumns').click(function() {
        var index = 'col'+parseColNum($(this));
        var tableId = $(this).closest('table').attr('id');
        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
        }
        $('.colMenu').hide();
        $(this).closest('.theadWrap').css('z-index', '9');
        addCol(index, tableId, null, 
            {direction: direction, isDark: true, inFocus: true});
    });
    
    table.find('.deleteColumn.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        delCol(index, tableNum);
    });

    table.find('.renameCol.col'+colId).click(function() {
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        var index = parseColNum($(this));
        $('#autoGenTable'+tableNum+ ' tr:first .editableHead.col'+index)
            .focus().select();
    });

    table.find('.duplicate.col'+colId).click(function() {
        var index = parseColNum($(this));
        var table = $(this).closest('table');
        var tableNum = parseInt(table.attr('id').substring(12));
        var name = table.find('.editableHead.col'+index).val();
        var width = table.find('th.col'+index).outerWidth();
        var isDark = table.find('th.col'+index).hasClass('unusedCell');

        addCol('col'+index, table.attr('id'),name, 
            {width: width, isDark: isDark});
        // Deep copy
        // XXX: TEST THIS FEATURE!
        gTables[tableNum].tableCols[index].func.func = 
            gTables[tableNum].tableCols[index-1].func.func;
        gTables[tableNum].tableCols[index].func.args = 
            gTables[tableNum].tableCols[index-1].func.args;
        gTables[tableNum].tableCols[index].userStr = 
            gTables[tableNum].tableCols[index-1].userStr;
        execCol(gTables[tableNum].tableCols[index], tableNum); 
    });

    table.find('.sort.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        sortRows(index, tableNum, SortDirection.Forward);
    }); 
    
    table.find('.revSort.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        sortRows(index, tableNum, SortDirection.Backward);
    }); 

    table.find('.filterWrap.col'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        $(this).closest('.filter').siblings().find('input').val(value);
        if (e.which === keyCode.Enter) {
            var index = parseColNum($(this).closest('.filterWrap'));
            var operator = $(this).closest('.filter').text(); 
            console.log(operator, 'operator')
            filterCol(operator, value, index, tableNum);
        }
    });

    table.find('.filter.col'+colId+' input').click(function(){
        $(this).select();
    });

    table.find('.joinList.col'+colId+ ' .join').click(function() {
        var tableNum = parseInt($(this).closest('table')
                        .attr('id').substring(12));
        joinTables($(this).text(), tableNum);
    });
}

function highlightColumn(el) {
    var index = parseColNum(el);
    var table = el.closest('table');
    $('.selectedCell').removeClass('selectedCell');
    table.find('th.col'+index).addClass('selectedCell');
    table.find('td.col'+index).addClass('selectedCell');
}

function checkForScrollBar(tableNum) {
    var tableWidth = $('#autoGenTable'+tableNum).width()+
        parseInt($('#autoGenTable'+tableNum).css('margin-left'));
    if ($('.autoGenTable').length > 1) {
        gScrollbarHeight = 0;
    }else if (tableWidth > $(window).width()) {
        gScrollbarHeight = getScrollBarHeight();
    } else {
        gScrollbarHeight = 0;
    }
}

function positionScrollbar(row, tableNum) {
    var canScroll = true;
    var theadHeight = $('#autoGenTable'+tableNum+' thead').height();
    function positionScrollToRow() {
        var tdTop = $('#autoGenTable'+tableNum+' .row'+(row-1))[0].offsetTop;
        var scrollPos = Math.max((tdTop-theadHeight), 1);
        if (canScroll && scrollPos > 
                ($('#autoGenTable'+tableNum).height() - 
                $('#autoGenTableWrap'+tableNum).height())) {
            canScroll = false;
        }
        $('#autoGenTableWrap'+tableNum).scrollTop(scrollPos-30);
    }
    
    positionScrollToRow();
    if (!canScroll) {
        // this means we can't scroll to page without moving scrollbar all the
        // way to the bottom, which triggers another getpage and thus we must
        // try to position the scrollbar to the proper row again
        setTimeout(positionScrollToRow, 1);
    }
}

function getScrollBarHeight() {
    var inner = $('<div style="width:100%;height:200px;"></div>');
    var outer = $('<div class="tableWrap" style="position:absolute;'+
                    'top:0;left:0;visibility:hidden;width:200px;'+
                    'height:150px;overflow:hidden;"></div>');
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

function addTableListeners(tableNum) {
    $('#autoGenTable'+tableNum).mousedown(function() {     
        var dynTableNum = parseInt($(this).closest('table').attr('id')
                       .substring(12));
        $('#theadWrap'+gActiveTableNum+' .tableTitle input')
            .removeClass('tblTitleSelected');
        $('#theadWrap'+dynTableNum+' .tableTitle input')
            .addClass('tblTitleSelected');
        gActiveTableNum = dynTableNum;
        updatePageBar(dynTableNum);
        generateFirstLastVisibleRowNum();
    });

    $('#autoGenTable'+tableNum+' thead').mouseenter(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $('#autoGenTable'+tableNum+' .dropdownBox').css('opacity', 0.4);
        }
    })
    .mouseleave(function() {
        $('#autoGenTable'+tableNum+' .dropdownBox').css('opacity', 0);
    });
}

function moverowScroller(pageNum, resultSetCount) {
    var pct = (pageNum/resultSetCount);
    var dist = Math.floor(pct*$('#rowScroller'+gActiveTableNum).width());
    $('#rowMarker'+gActiveTableNum).css('transform', 'translateX('+dist+'px)');
}

function addRowScroller(tableNum) {
    console.log('adding scroller -------------------------------------------------------------------------')
    if ($('.autoGenTable').length == 1) {
        $('#rowScrollerArea').append('<div id="rowScroller'+tableNum+
        '" class="rowScroller" title="scroll to a row">'+
            '<div id="rowMarker'+tableNum+'" class="rowMarker">'+
            '</div>'+
        '</div>');
    } else {
       $('#rowScroller'+(tableNum-1)).after('<div id="rowScroller'+tableNum+
        '" class="rowScroller" title="scroll to a row">'+
            '<div id="rowMarker'+tableNum+'" class="rowMarker">'+
            '</div>'+
        '</div>');
       $('#rowScroller'+tableNum).hide();
    }
    
    $('#rowScroller'+tableNum).mousedown(function(event) {
        if (event.which != 1) {
            return;
        }
        console.log(gActiveTableNum)
        var tableNum = gActiveTableNum;

        var mouseX = event.pageX - $(this).offset().left;
        $('#rowMarker'+tableNum).css('transform', 'translateX('+mouseX+'px)');
        var scrollWidth = $(this).outerWidth();
        var rowNum = Math.ceil((mouseX / scrollWidth) * 
                gTables[tableNum].resultSetCount);
        if ($(this).find('.bookmark').length > 0) {
            // check 10 pixels around for bookmark?
            var yCoor = $(this).offset().top+$(this).height()-5;
            for (var x = (event.pageX-5); x < (event.pageX+5); x++) {
                var element = $(document.elementFromPoint(x, yCoor));
                if (element.hasClass('bookmark')) {
                    console.log('bookmark found',element);
                    console.log(rowNum)
                    rowNum = parseBookmarkNum(element);
                    break;
                }
            }
        }
        var rowInputNum = $("#rowInput").val();
        var e = $.Event("keypress");
        e.which = keyCode.Enter;
        $("#rowInput").val(rowNum).trigger(e);
    });
}

function showRowScroller(tableNum) {
    $('.rowScroller').hide();
    $('#rowScroller'+tableNum).show();
}

function bookmarkRow(rowNum, tableNum) {
    //XXX allow user to select color in future? 
    var td = $('#autoGenTable'+tableNum+' .row'+rowNum+ ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('title', 'bookmarked');
    var leftPos = 100*(rowNum/gTables[tableNum].resultSetCount);
    var bookmark = $('<div class="bookmark bkmkRow'+rowNum+'"'+
        ' style="left:'+leftPos+'%;" title="row '+(rowNum+1)+'"></div>');
    $('#rowScroller'+tableNum).append(bookmark);
    if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
        gTables[tableNum].bookmarks.push(rowNum);
    }
    
    //XXX bookmark not persisted
}

function parseBookmarkNum(el) {
    var classNames = el.attr('class');
    var index = classNames.indexOf('bkmkRow')+'bkmkRow'.length;
    return parseInt(classNames.substring(index))+1;
}

function updatePageBar(tableNum) {
    showRowScroller(tableNum);
    $('#pageBar > div:last-child span')
        .text('of '+gTables[gActiveTableNum].resultSetCount);
}
