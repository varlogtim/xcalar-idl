function generateFirstLastVisibleRowNum(tableId) {
    //XXX table will be passed in
    var mfPos = $('.mainFrame')[0].getBoundingClientRect();
    var tdXCoor = 30;
    var tdYCoor = 50;
    var tdBotYCoor = -18;
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+mfPos.left,
                                            tdYCoor+mfPos.top);
    var firstId = $(firstEl).closest('tr').attr('class');
    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(3));
    }

    var tdBottom = tdBotYCoor + mfPos.bottom;
    var lastEl = document.elementFromPoint(tdXCoor+mfPos.left,
                                           tdBottom);
    var lastId = $(lastEl).closest('tr').attr('class');
    if (lastId && lastId.length > 0) {
        var lastRowNum = parseInt(lastId.substring(3));
    }

    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar .rowNum:first-of-type').html(firstRowNum);
        // movePageScroll(firstRowNum);
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar .rowNum:last-of-type').html(lastRowNum);
    } 
}

function resizableColumns() {
    $('#autoGenTable1 tr:first .header').each(
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
    // $('.colGrab').height($('.autoGenTable').height());
    $('.colGrab').height($('#mainFrame').height());
    if (gRescol.first) {
        $('.autoGenTable tr:first th').each(
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
    gMouseStatus = "resizingCol";
    event.preventDefault();
    gRescol.mouseStart = event.pageX;
    gRescol.grabbedCell = el.parent().parent();  // the th 
    gRescol.index = gRescol.grabbedCell.index();
    gRescol.startWidth = gRescol.grabbedCell.outerWidth();
    gRescol.tableNum = parseInt(el.closest('table').attr('id').substring(12));
    gRescol.colNum = parseColNum(gRescol.grabbedCell);
    gRescol.lastCellWidth = $('#autoGenTable'+gRescol.tableNum+' thead:last th:last').outerWidth();
    gRescol.tableWidth = $('#autoGenTable'+gRescol.tableNum).outerWidth();
    gRescol.tableExcessWidth = gRescol.tableWidth - gMinTableWidth;

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
        //XXX TODO: cache this cell so we don't have to search for it
        $('#autoGenTable'+gRescol.tableNum+' tr:eq(1) th.col'+gRescol.colNum)
            .outerWidth(gRescol.startWidth + dragDist);

        $('#autoGenTable'+gRescol.tableNum+' thead:first').outerWidth($('#autoGenTable'+gRescol.tableNum).width());

        if (dragDist <= -gRescol.tableExcessWidth) {
            $('.autoGenTable thead th:last-child').outerWidth(
                gRescol.lastCellWidth - 
                (dragDist + gRescol.tableExcessWidth));
            $('.autoGenTable thead:first').outerWidth(
                $('.autoGenTable').width());
        }     
    } else if ( dragDist < gRescol.leftDragMax ) {
        gRescol.grabbedCell.outerWidth(gRescol.tempCellMinWidth);
        $('#autoGenTable'+gRescol.tableNum+' tr:eq(1) th.col'+gRescol.colNum)
            .outerWidth(gRescol.tempCellMinWidth);
        if (dragDist < -gRescol.tableExcessWidth) {
            $('#autoGenTable'+gRescol.tableNum+' thead:first').outerWidth(gMinTableWidth);
            var addWidth = gMinTableWidth - $('#autoGenTable'+gRescol.tableNum).width();
            $('#autoGenTable'+gRescol.tableNum+' thead th:last-child').
                outerWidth('+='+addWidth+'px');
        } else {
            $('#autoGenTable'+gRescol.tableNum+' thead:first').
                outerWidth($('#autoGenTable'+gRescol.tableNum).outerWidth());
        }
    }
}

function gRescolMouseMoveLast(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist >= -gRescol.tableExcessWidth) {
        if (dragDist > gRescol.leftDragMax) {
            gRescol.grabbedCell.outerWidth(gRescol.startWidth + dragDist);
            $('#autoGenTable'+gRescol.tableNum+' tr:eq(1) th.col'+gRescol.colNum).
                outerWidth(gRescol.startWidth + dragDist);
            $('#autoGenTable'+gRescol.tableNum+' thead:first').width(gRescol.tableWidth + dragDist);
        } 
    } else {
        gRescol.grabbedCell.
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable'+gRescol.tableNum+' tr:eq(1) th.col'+gRescol.colNum).
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable'+gRescol.tableNum+' thead').width(gMinTableWidth);
    } 
}

function gRescolMouseUp() {
    gMouseStatus = null;
    gRescol.lastCellGrabbed = false;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    $('.rowGrab').width($('#autoGenTable'+gRescol.tableNum).width());
    var progCol = gTableCols[gRescol.index-1];
    progCol.width = gRescol.grabbedCell.outerWidth();
    matchHeaderSizes();
    checkForScrollBar();
}

function resrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
    resrow.tableNum = parseInt(el.cloest('table').attr('id').substring(12));
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
    $('.colGrab').height($('#mainFrame').height());
    generateFirstLastVisibleRowNum()
}

function dragdropMouseDown(el, event) {
    gMouseStatus = "movingCol";
    gDragObj.mouseX = event.pageX;
    gDragObj.colNum = parseColNum(el);
    gDragObj.tableNum = parseInt(el.closest('table').attr('id').substring(12));
    gDragObj.element = el;
    gDragObj.colIndex = parseInt(el.index());
    gDragObj.top = el.offset().top;
    gDragObj.left = el.offset().left;
    gDragObj.docHeight = $(document).height();
    gDragObj.val = el.find('.editableHead').val();
    var tableHeight = $('#autoGenTable'+gDragObj.tableNum).height();
    var mainFrameHeight = el.closest('.mainFrame').height()-gScrollbarHeight;
    var shadowDivHeight = Math.min(tableHeight,mainFrameHeight);
    gDragObj.inFocus =  el.find('.editableHead').is(':focus');
    gDragObj.colWidth = el.outerWidth();
    // create a replica shadow with same column width, height,
    // and starting position
    el.closest('.mainFrame').prepend('<div id="shadowDiv" style="width:'+
                            (gDragObj.colWidth)+
                            'px;height:'+(shadowDivHeight)+'px;left:'+
                            (gDragObj.left)+
                            'px;top:'+(gDragObj.top)+'px;"></div>');

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
    var newX = gDragObj.left + (event.pageX - gDragObj.mouseX);
    $('#fauxCol').css('left', newX);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    $('#shadowDiv, #fauxCol, .dropTarget, #moveCursor').remove();
    var progCol = gTableCols[gDragObj.colNum-2];
    var isDark = gDragObj.element.hasClass('unusedCell');
    var selected = gDragObj.element.hasClass('selectedCell');
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex+1) != gDragObj.colNum) { 
        console.log('deleting')
        delCol(gDragObj.colNum, gDragObj.tableNum, true);
        progCol.index = gDragObj.colIndex+1;
        insertColAtIndex(gDragObj.colIndex-1, progCol);
        addCol("col"+gDragObj.colIndex, "autoGenTable"+gDragObj.tableNum, 
                progCol.name, {width: progCol.width,
                isDark: isDark, 
                select: selected, 
                inFocus: gDragObj.inFocus,
                progCol: progCol});
        execCol(progCol);
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
    $('#mainFrame').append('<div id="fauxCol" style="left:'+
                        (gDragObj.left)+'px;top:'+
                        (gDragObj.top)+'px;width:'+
                        (gDragObj.colWidth-5)+'px">'+
                            '<table id="fauxTable" class="dataTable autoGenTable" '+
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
    $('.autoGenTable tbody tr').each(function() {
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

    var totalRowHeight = gDragObj.element.closest('.mainFrame').height()-
            $('#autoGenTable'+gDragObj.tableNum+' th:first').outerHeight() - gScrollbarHeight;
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    $('#autoGenTable'+gDragObj.tableNum+' tr:gt('+(topRowIndex+1)+')').each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= numRows+topRowIndex) {
                return (false);
            }
    });

    // Ensure rows are offset correctly
    var fauxTableHeight = $('#fauxTable').height()+
                        $('#fauxTable tr:first').outerHeight();
    var mainFrameHeight = $('#mainFrame').height()- gScrollbarHeight;
    var fauxColHeight = Math.min(fauxTableHeight, mainFrameHeight);
    $('#fauxCol').height(fauxColHeight);
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
        $('#autoGenTable'+gDragObj.tableNum+' tr:first th:not(:last)').each(function(){
            if (i == 0 || i == gDragObj.colIndex) {
                i++;
                return true;  
            }
            var colLeft = $(this)[0].getBoundingClientRect().left;
            if ((gDragObj.colWidth-dragMargin) < Math.round(0.5*$(this).width())) {
                var targetWidth = gDragObj.colWidth;
            } else {
                var targetWidth = Math.round(0.5*$(this).outerWidth())+dragMargin;
            }
            dropTargets += '<div id="dropTarget'+i+'" class="dropTarget"'+
                            'style="left:'+(colLeft-dragMargin+offset)+'px;'+
                            'width:'+targetWidth+'px;height:'
                            +(gDragObj.docHeight)+'px;">'+
                            '</div>';
            i++;
        });
        $('body').append(dropTargets);
        $('.dropTarget').mouseenter(function() {
            dragdropSwapColumns($(this));
        });
    } else {
        // targets have already been created, so just adjust the one corresponding
        // to the column that was swapped
        var swappedCol = $('#autoGenTable'+gDragObj.tableNum+' th:eq('+swappedColIndex+')');
        var colLeft = swappedCol[0].getBoundingClientRect().left;
        $('#dropTarget'+dropTargetIndex).attr('id', 'dropTarget'+swappedColIndex);
        var dropTarget = $('#dropTarget'+swappedColIndex);
        dropTarget.css({'left': (colLeft-dragMargin+offset)+'px'});
    }
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
    $('#shadowDiv').css('left',
                        gDragObj.element.offset().left); 
    gDragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function gRescolDelWidth(colNum, tableNum, resize) {
    matchHeaderSizes(true);
    var id = colNum;
    var table = $('#autoGenTable'+tableNum);
    var oldTableWidth = table.width();
    if (!resize && (oldTableWidth < gMinTableWidth)) {
        var lastTd = table.find('tr:first th').length;
        var lastTdWidth = table.find('.table_title_bg.col'+lastTd).width();
        table.find('thead:last .table_title_bg.col'+lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth)); 
    }
    matchHeaderSizes();
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
    var tableNum = parseInt(el.closest('table').attr('id').substring(12));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || gRescol.cellMinWidth-10;
    var oldTableWidth = $('#autoGenTable'+tableNum).width();
    var maxWidth = 600;
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
        gTableCols[index-2].width = el.outerWidth();
    }
    matchHeaderSizes(resizeFirstRow);
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
    var largestTd = $('#autoGenTable'+tableNum+' tbody tr:first td:eq('+(id-1)+')');
    var headerWidth = 0;

    $('#autoGenTable'+tableNum+' tbody tr').each(function(){
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var td = $(this).children(':eq('+(id-1)+')');
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
        autosizeCol(el.parent().parent(), {resizeFirstRow: true});
        $('#ew-resizeCursor').remove();
        clearTimeout(gRescol.timer);    //prevent single-click action
        gRescol.clicks = 0;      //after action performed, reset counter
    }
}

function cloneTableHeader() {
    var mainFrameTop = $('.mainFrame').offset().top;
    var tHead = $('.autoGenTable thead');
    var tHeadXPos = tHead.offset().left;
    var tHeadYPos = tHead.offset().top;
    var tHeadClone = $('.autoGenTable thead').clone();
    var leftPos = $('.autoGenTable').position().left;

    tHeadClone.addClass('fauxTHead');
    tHead.addClass('trueTHead');
    $('.autoGenTable thead').after(tHeadClone);
    tHead.css({'position':'absolute', 'top':0,
                    'left':leftPos, 'padding-top':5});
    tHead.wrap('<div class="theadWrap"></div>');
    matchHeaderSizes() ;

    $('.autoGenTable').width(0); 
    $('.mainFrame').scroll(function() {
        var leftPos = $('.autoGenTable').position().left -
                      $(window).scrollLeft();
        tHead.css('left', leftPos);
    });
    $(window).scroll(function(){
        var tHeadTop = $('#mainFrame').offset().top - $(window).scrollTop();
        var tHeadLeft = $('.autoGenTable').position().left -
                        $(window).scrollLeft();
        tHead.css({'top': tHeadTop, 'left':tHeadLeft});
    });
}

function matchHeaderSizes(reverse) {
    var tHeadLength = $('.fauxTHead th').length;
    if (reverse) {
        var trueTHead = '.fauxTHead';
        var fauxTHead = '.trueTHead';
    } else {
        var trueTHead = '.trueTHead';
        var fauxTHead = '.fauxTHead';
    }
    for (var i = 0; i < tHeadLength; i++) {
        var width = $(fauxTHead+' th').eq(i).outerWidth();
        $(trueTHead+' th').eq(i).outerWidth(width);
    }
    $('.autoGenTable thead').width($('.autoGenTable').width());
    $('.rowGrab').width($('.autoGenTable').width());
}

function addColListeners(colId, tableId) {
    resizableColumns();
    var table = $('#'+tableId);
    table.find('.editableHead.col'+colId).focus(function() {  
        $('.colMenu').hide();
        var index = parseColNum($(this));
        if (gTableCols[index-2].userStr.length > 0) {
            $(this).val(gTableCols[index-2].userStr);
        }
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
        highlightColumn($(this));
        $(this).parent().siblings('.dropdownBox')
            .addClass('hidden');
    }).blur(function() {
        var index = parseColNum($(this));
        if (gTableCols[index-2].name.length > 0) {
            $(this).val(gTableCols[index-2].name);
        } 
        $(this).parent().siblings('.dropdownBox')
            .removeClass('hidden');
    });

    table.find('.editableHead.col'+colId).keyup(function(e) {
        updateFunctionBar($(this).val());
        gFnBarOrigin = $(this);
        if (e.which == keyCode.Enter) {
            var index = parseColNum($(this));
            var progCol = parseCol($(this).val(), index, true);
            execCol(progCol);
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
        $('.colMenu').hide();
        $('.leftColMenu').removeClass('leftColMenu');
        $(this).siblings('.colMenu').show();
        var colMenu = $(this).siblings('.colMenu');
        if (colMenu[0].getBoundingClientRect().right > $(window).width()) {
            colMenu.addClass('leftColMenu');
        }
        if (colMenu.find('.subColMenu').length) {
            if (colMenu.find('.subColMenu')[0].getBoundingClientRect().right > 
                $(window).width()) {
                    colMenu.find('.subColMenu').addClass('leftColMenu');
            }
        }
    });

    table.find('.table_title_bg.col'+colId+' .dropdownBox').mouseenter(function() {
        $(this).removeClass('hidden');
    }).mouseout(function() {
        var input = $(this).siblings('.editableHead');
        if (input.is(':focus')) {
            $(this).addClass('hidden');
        }
    });

    table.find('.table_title_bg.col'+colId+' .subColMenuArea').mousedown(function() {
        $('.colMenu').hide();
    });

    table.find('.table_title_bg.col'+colId+' ul.colMenu > li:first-child').mouseenter(function(){
        $(this).parent().removeClass('white');
    }).mouseleave(function(){
        $(this).parent().addClass('white');
    });

    table.find('.table_title_bg.col'+colId+' .subColMenu li').mouseenter(function() {
            subColMenuMouseEnter($(this));
    }).mouseleave(function() {
            subColMenuMouseLeave($(this));
    });

    table.find('.table_title_bg.col'+colId+' .colMenu ul').mouseleave(function(){
        if ($(this).parent().is(':first-child')) {
            $(this).parent().parent().siblings('.rightArrow').
            removeClass('dimmed').addClass('arrowExtended');
        } 
    });

    table.find('.table_title_bg.col'+colId+' .dragArea').mousedown(function(event){
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

    table.find('.table_title_bg.col'+colId+' .addColumns').click(function() {
        var index = 'col'+parseColNum($(this));
        var tableId = $(this).closest('table').attr('id');
        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
        }
        $('.colMenu').hide();
        addCol(index, tableId, null, {direction: direction, isDark: true, inFocus: true});
    });

    table.find('.deleteColumn.col'+colId).click(function() {
        var index = parseColNum($(this));
        var tableNum = parseInt($(this).closest('table').attr('id').substring(12));
        delCol(index, tableNum);
    });

    table.find('.renameCol.col'+colId).click(function() {
        var tableNum = parseInt($(this).closest('table').attr('id').substring(12));
        var index = parseColNum($(this));
        $('#autoGenTable'+tableNum+ ' tr:first .editableHead.col'+index).focus().select();
    });

    table.find('.duplicate.col'+colId).click(function() {
        var index = parseColNum($(this));
        var table = $(this).closest('table');
        var tableNum = parseInt(table.attr('id').substring(12));
        var name = table.find('.editableHead.col'+index).val();
        var width = table.find('th.col'+index).outerWidth();
        var isDark = table.find('th.col'+index).hasClass('unusedCell');

        addCol('col'+index, table.attr('id'),name, {width: width, isDark: isDark});
        // Deep copy
        // XXX: TEST THIS FEATURE!
        gTableCols[index-1].func.func = gTableCols[index-2].func.func;
        gTableCols[index-1].func.args = gTableCols[index-2].func.args;
        gTableCols[index-1].userStr = gTableCols[index-2].userStr;
        execCol(gTableCols[index-1], null); 
    });

    table.find('.sort.col'+colId).click(function() {
        var index = parseColNum($(this));
        sortRows(index, SortDirection.Forward);
    }); 
    
    table.find('.revSort.col'+colId).click(function() {
        var index = parseColNum($(this));
        sortRows(index, SortDirection.Backward);
    }); 

    table.find('.editableHead.col'+colId).mousedown(function(event) {
        //XXX Test to see if we even need this anymore
        event.stopPropagation();
    });

    table.find('.filterWrap.col'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        $(this).closest('.filter').siblings().find('input').val(value);
        if (e.which === keyCode.Enter) {
            var index = parseColNum($(this).closest('.filterWrap'));
            var operator = $(this).closest('.filter').text(); 
            console.log(operator, 'operator')
            filterCol(operator, value, index);
        }
    });

    table.find('.filter.col'+colId+' input').click(function(){
        $(this).select();
    });

    table.find('.join .subColMenu li').click(function() {
        joinTables($(this).text());
    });

    table.find('.table_title_bg.col'+colId+' .colMenu li').click(function() {
        if ($(this).children('.subColMenu, input').length === 0) {
            // hide li if doesnt have a submenu or an input field
            $(this).closest('.colMenu').hide();
        }
    });
}

function highlightColumn(el) {
    var index = el.closest('th').index()+1;
    $('.selectedCell').removeClass('selectedCell');
    el.closest('th').addClass('selectedCell');
    el.closest('.dataTable').find('td:nth-child('+index+')')
        .addClass('selectedCell');
}
