function getFirstVisibleRowNum() {
     var mainFramePos = $('#mainFrame')[0].getBoundingClientRect();
    var mfPosTop = mainFramePos.top;
    var mfPosLeft = mainFramePos.left;
    var tdXCoor = 30;
    var tdYCoor = 45;
    var el = document.elementFromPoint(tdXCoor+mfPosLeft, tdYCoor+mfPosTop);
    var rowNum = parseInt($(el).closest('td').attr('id').substring(5));
}

function generateFirstLastVisibleRowNum() {
    var mfPos = $('#mainFrame')[0].getBoundingClientRect();
    var tdXCoor = 30;
    var tdYCoor = 50;
    var tdBotYCoor = -20;
    var firstRowNum;
    var lastRowNum;
    var firstEl = document.elementFromPoint(tdXCoor+mfPosLeft,
                                            tdYCoor+mfPosTop);
    var firstId = $(firstEl).closest('td').attr('id');
    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(5));
    }

    if (tdBotYCoor + mfPos.bottom >= $(window).height()) {
        var tdBottom = $(window).height()-10;
    } else {
        var tdBottom = tdBotYCoor + mfPos.bottom;
    }
    var lastEl = document.elementFromPoint(tdXCoor+mfPos.left,
                                           tdBottom);
    var lastId = $(lastEl).closest('td').attr('id');
    if (lastId && lastId.length > 0) {
        var lastRowNum = parseInt(lastId.substring(5));
    }

    if (parseInt(firstRowNum) != NaN) {
        $('#pageBar .rowNum:first-of-type').html(firstRowNum);
        movePageScroll(firstRowNum);
    }
    if (parseInt(lastRowNum) != NaN) {
        $('#pageBar .rowNum:last-of-type').html(lastRowNum);
    } 
}

function resizableColumns() {
    $('#autoGenTable tr:first .header').each(
        function() {
            if (!$(this).children().hasClass('colGrab') 
                &&!$(this).parent().is(':first-child')) {
                    var tdId = $(this).parent().attr('id');
                    $(this).prepend('<div class="colGrab"></div>');
                    $('#autoGenTable tr:eq(1) #'+tdId+' .header').prepend(
                        '<div class="colGrab"></div>');
                    var firstEl = '#'+tdId+' .colGrab';
                    var secondEl = '#autoGenTable tr:eq(1) #'+tdId+' .colGrab';
                    $(firstEl+','+secondEl).mousedown(
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
    // $('.colGrab').height($('#autoGenTable').height());
    $('.colGrab').height($('#mainFrame').height());
    if (gRescol.first) {
        $('#autoGenTable tr:first th').each(
            function() {
                    var initialWidth = $(this).width();
                    $(this).width(initialWidth);
                    $(this).removeAttr('width');
            } 
        );
        gRescol.first = false;
    } 
}

//XXX consider using mouseover
// el is #headCol2 .subColMenu li
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
    gRescol.grabbedCell = el.parent().parent();  // the td 
    gRescol.index = gRescol.grabbedCell.index();
    gRescol.startWidth = gRescol.grabbedCell.outerWidth(); 
    gRescol.id = gRescol.grabbedCell.attr('id');
    gRescol.lastCellWidth = $('#autoGenTable thead:last th:last').outerWidth();
    gRescol.tableWidth = $('#autoGenTable').outerWidth();
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
        $('#'+gRescol.id).outerWidth(gRescol.startWidth + dragDist);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).outerWidth(gRescol.startWidth +
            dragDist);
        $('#autoGenTable thead:first').outerWidth($('#autoGenTable').width());

        if (dragDist <= -gRescol.tableExcessWidth) {
            $('#autoGenTable thead th:last-child').outerWidth(
                gRescol.lastCellWidth - 
                (dragDist + gRescol.tableExcessWidth));
            $('#autoGenTable thead:first').outerWidth(
                $('#autoGenTable').width());
        }     
    } else if ( dragDist < gRescol.leftDragMax ) {
        $('#'+gRescol.id).outerWidth(gRescol.tempCellMinWidth);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).
            outerWidth(gRescol.tempCellMinWidth);
        if (dragDist < -gRescol.tableExcessWidth) {
            $('#autoGenTable thead:first').outerWidth(gMinTableWidth);
            var addWidth = gMinTableWidth - $('#autoGenTable').width();
            $('#autoGenTable thead th:last-child').
                outerWidth('+='+addWidth+'px');
        } 
        else {
            $('#autoGenTable thead:first').
                outerWidth($('#autoGenTable').outerWidth());
        }
    }
}

function gRescolMouseMoveLast(event) {
    var dragDist = (event.pageX - gRescol.mouseStart);
    if (dragDist >= -gRescol.tableExcessWidth) {
        if (dragDist > gRescol.leftDragMax) {
            $('#'+gRescol.id).outerWidth(gRescol.startWidth + dragDist);
            $('#autoGenTable tr:eq(1) #'+gRescol.id).
                outerWidth(gRescol.startWidth +
            dragDist);
            $('#autoGenTable thead:first').width(gRescol.tableWidth + dragDist);
        } 
    } else {
        $('#'+gRescol.id).
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable tr:eq(1) #'+gRescol.id).
            outerWidth(gRescol.startWidth - gRescol.tableExcessWidth);
        $('#autoGenTable thead').width(gMinTableWidth);
    } 
}

function gRescolMouseUp() {
    gMouseStatus = null;
    gRescol.lastCellGrabbed = false;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    $('.rowGrab').width($('#autoGenTable').width());
    var progCol = gTableCols[gRescol.index-1];
    progCol.width = gRescol.grabbedCell.outerWidth();
    matchHeaderSizes();
    checkForScrollBar();
}

function resrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    resrow.mouseStart = event.pageY;
    resrow.targetTd = el.closest('td');
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
        $('#autoGenTable tbody tr:eq('+row+') td > div').
            css('max-height', gRescol.minCellHeight-4);
    } else {
        resrow.targetTd.outerHeight(newHeight);
        $('#autoGenTable tbody tr:eq('+row+') td > div').
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
    gDragObj.mouseStart = event.pageX;
    gDragObj.id = el.attr('id');
    gDragObj.colId = parseInt(gDragObj.id.substring(7));
    gDragObj.colIndex = parseInt(el.index());
    gDragObj.colOffLeft = el.offset().left;
    gDragObj.colOffTop = el.offset().top;
    var firstTd = $('#autoGenTable td:eq('+(gDragObj.colId-1)+')');
    gDragObj.colOffLeft = firstTd.offset().left;
    gDragObj.docHeight = $(document).height();
    var tableHeight = el.closest('table').height();
    var mainFrameHeight = $('#mainFrame').height()-gScrollbarHeight;
    var shadowDivHeight = Math.min(tableHeight,mainFrameHeight);
    gDragObj.inFocus =  $('#headCol'+gDragObj.colId+' .editableHead').is(':focus');

    // get dimensions and position of column that was clicked
    gDragObj.colWidth = el.outerWidth();
    var startY = el.position().top;
    // create a replica shadow with same column width, height,
    // and starting position
    $('#mainFrame').prepend('<div class="shadowDiv" style="width:'+
                            (gDragObj.colWidth)+
                            'px;height:'+(shadowDivHeight)+'px;left:'+
                            (gDragObj.left)+
                            'px;top:'+(gDragObj.top)+'px;"></div>');

    // create a fake transparent column by cloning 
    createTransparentDragDropCol(startYPos);

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
        '{cursor:move !important; cursor: -webkit-grabbing !important;'+
        'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);
    disableTextSelection();
    createDropTargets();
}

function dragdropMouseMove(event) {
    var newX = gDragObj.left + (event.pageX - gDragObj.mouseX);
    $('.fauxCol').css('left', newX);
}

function dragdropMouseUp() {
    gMouseStatus = null;
    var name = $('.fauxCol .editableHead').val();
    $('.shadowDiv, .fauxCol, .dropTarget, #moveCursor').remove();
    var head = $("#autoGenTable tr:first th span");
    var progCol = gTableCols[gDragObj.colId-2];
    var isDark = $('#headCol'+gDragObj.colId).hasClass('unusedCell');
    var selected = $('#headCol'+gDragObj.colId).hasClass('selectedCell');
    
    // only pull col if column is dropped in new location
    if ((gDragObj.colIndex+1) != gDragObj.colId) { 
        delCol("closeButton"+gDragObj.colId, true);
        progCol.index = gDragObj.colIndex+1;
        insertColAtIndex(gDragObj.colIndex-1, progCol);
        // addCol("headCol"+gDragObj.colIndex, progCol.name, {width: progCol.width,
        //         isDark: isDark, select: selected, progCol: progCol});
        addCol("headCol"+gDragObj.colIndex, name, {width: progCol.width,
                isDark: isDark, select: selected, inFocus: gDragObj.inFocus,
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
    clone.outerHeight(cloneHeight);
    clone.outerWidth(gDragObj.colWidth-5);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($(".fauxTable"));
}

function createTransparentDragDropCol(startYPos) {
    $('#mainFrame').append('<div class="fauxCol" style="left:'+
                        (gDragObj.left)+'px;top:'+
                        (gDragObj.top)+'px;width:'+
                        (gDragObj.colWidth-5)+'px">'+
                            '<table id="autoGenTable" class="dataTable fauxTable" '+
                            'style="width:'+(gDragObj.colWidth-5)+'px">'+
                            '</table>'+
                        '</div>');
    
    var rowHeight = 20;
    // turn this into binary search later
    var topPx = $('#autoGenTable thead').offset().top + 
                $('#autoGenTable thead').outerHeight() -
                rowHeight;
    var topRowIndex = -1;
    var topRowTd = null;
    $('#autoGenTable tbody tr').each(function() {
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
        $('#autoGenTable tr').each(function(i, ele) {
            cloneCellHelper(ele);
        });
        return;
    }

    // Clone head
    $('#autoGenTable tr:first').each(function(i, ele) {
            cloneCellHelper(ele);
    });

    var totalRowHeight = $('#mainFrame').height()-
            $('#autoGenTable th:first').outerHeight() - gScrollbarHeight;
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    $('#autoGenTable tr:gt('+(topRowIndex+1)+')').each(function(i, ele) {
            cloneCellHelper(ele);
            count++;
            if (count >= numRows+topRowIndex) {
                return (false);
            }
    });

    // Ensure rows are offset correctly
    var fauxTableHeight = $('.fauxTable').height()+
                        $('.fauxTable tr:first').outerHeight();
    var mainFrameHeight = $('#mainFrame').height()- gScrollbarHeight;
    var fauxColHeight = Math.min(fauxTableHeight, mainFrameHeight);
    $('.fauxCol').height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx-rowHeight;
    $('.fauxTable').css('margin-top', $('.fauxTable tr:first').outerHeight()+
                        firstRowOffset);
    $('.fauxTable tr:first-child').css({'margin-top': 
            -($('.fauxTable tr:first').outerHeight()+firstRowOffset)});
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
        $('#autoGenTable tr:first th:not(:last)').each(function(){
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
        var swappedCol = $('#autoGenTable th:eq('+swappedColIndex+')');
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
        $('#autoGenTable tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').after(
                $(this).children(':eq('+nextCol+')'));
        });
        movedCol = nextCol;
    } else {
        $('#autoGenTable tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').before(
                $(this).children(':eq('+prevCol+')'));
        });
        movedCol = prevCol;
    }
    $('.shadowDiv').css('left',
                        $('#autoGenTable #'+gDragObj.id).offset().left); 
    gDragObj.colIndex = dropTargetId;
    createDropTargets(dropTargetId, movedCol);
}

function gRescolDelWidth(id, resize) {
    matchHeaderSizes(true);
    var id = parseInt(id.substring(11));
    var oldTableWidth = $('#autoGenTable').width();
    if (!resize && (oldTableWidth < gMinTableWidth)) {
        var lastTd = $('#autoGenTable tr:first th').length;
        var lastTdWidth = $('#headCol'+lastTd).width();
        $('#autoGenTable thead:last #headCol'+lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth));
    }
    matchHeaderSizes();
}

function getTextWidth(el) {
    var width;
    if (el.is('input')) {
        var text = el.val();
    } else {
        var text = el.text();
    }
    tempDiv = $('<div>'+text+'</div>');
    tempDiv.css({'font': el.css('font'), 'position': 'absolute', 
        'display': 'inline-block', 'white-space': 'pre'}).appendTo($('body'));
    width = tempDiv.width();
    tempDiv.remove();
    return (width);
}

function autosizeCol(el, options) {
    var index = parseInt(el.attr('id').substring(7));
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || gRescol.cellMinWidth-10;
    var oldTableWidth = $('#autoGenTable').width();
    var maxWidth = 600;
    var oldWidth = el.width();  
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var newWidth = Math.max(widestTdWidth, minWidth);
    newWidth = Math.min(newWidth, maxWidth);
    var widthDiff = newWidth - oldWidth; 
    if (widthDiff > 0) {
        $('#autoGenTable thead').width('+='+(newWidth-oldWidth));
        el.width(newWidth);
    } else if (oldTableWidth + widthDiff < gMinTableWidth) {
        el.width(newWidth);
        $('#autoGenTable tr:first th:last').outerWidth('+='+
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
    var id = (el.attr('id')).substr(7);
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 6;
    var largestTd = $('#autoGenTable tbody tr:first td:eq('+(id-1)+')');
    var headerWidth = 0;

    $('#autoGenTable tbody tr').each(function(){
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
        var th = $('#autoGenTable th:eq('+(id-1)+') .editableHead');
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
    $("#autoGenTable tbody tr").each(function(){
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
    var mainFrameTop = $('#mainFrame').offset().top;
    var tHead = $('#autoGenTable thead');
    var tHeadXPos = tHead.offset().left;
    var tHeadYPos = tHead.offset().top;
    var tHeadClone = $('#autoGenTable thead').clone();
    var leftPos = $('#autoGenTable').position().left;

    tHeadClone.addClass('fauxTHead');
    tHead.addClass('trueTHead');
    $('#autoGenTable thead').after(tHeadClone);
    tHead.css({'position':'fixed', 'top':mainFrameTop,
                    'left':leftPos, 'padding-top':5});
    matchHeaderSizes() ;
    $('.fauxTHead th .header').each(function() {
        var tdId = $(this).parent().attr('id');
        $('.fauxTHead #'+tdId+' .colGrab').mousedown(
            function(event) {
                if (event.which === 1) {
                    gRescolMouseDown($(this), event);
                    dblClickResize($(this));
                }
            }
        );
    });
    $('#autoGenTable').width(0); 
    $('#mainFrame').scroll(function() {
        var leftPos = $('#autoGenTable').position().left -
                      $(window).scrollLeft();
        tHead.css('left', leftPos);
    });
    $(window).scroll(function(){
        var tHeadTop = $('#mainFrame').offset().top - $(window).scrollTop();
        var tHeadLeft = $('#autoGenTable').position().left -
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
    $('#autoGenTable thead').width($('#autoGenTable').width());
    $('.rowGrab').width($('#autoGenTable').width());
}

function addColListeners(colId) {
    $('#rename'+colId).focus(function() {  
        $('.colMenu').hide();
        var index = parseInt($(this).attr('id').substring(6));
        if (gTableCols[index-2].userStr.length > 0) {
            $(this).val(gTableCols[index-2].userStr);
        }
        
        updateFunctionBar($(this).val());
        $('.selectedCell').removeClass('selectedCell');
        $(this).closest('th').addClass('selectedCell');
        $('#autoGenTable td:nth-child('+index+')')
                .addClass('selectedCell');
        $(this).parent().siblings('.dropdownBox')
            .addClass('hidden');
        // $(this).select();
    }).blur(function() {
        var index = parseInt($(this).attr('id').substring(6));
        if (gTableCols[index-2].name.length > 0) {
            $(this).val(gTableCols[index-2].name);
        } 
        $(this).parent().siblings('.dropdownBox')
            .removeClass('hidden');
    });

    $("#rename"+colId).keyup(function(e) {
        updateFunctionBar($(this).val());
        if (e.which == 13) {
            var index = parseInt($(this).attr('id').substring(6));
            var progCol = parseCol($(this).val(), index, true);
            execCol(progCol);
            if (progCol.name.length > 0) {
                $(this).val(progCol.name);
            } else {
                // keep value that user entered
            }
            $(this).blur();
            $(this).closest('th').removeClass('unusedCell');
            $('#autoGenTable td:nth-child('+index+')').removeClass('unusedCell');
        }
    });

    $("#rename"+colId).on('input', function(e) {
        updateFunctionBar($(this).val());
    });

    $('#headCol'+colId+' .dropdownBox').click(function() {
        $('.colMenu').hide().removeClass('leftColMenu')
                    .find('.subColMenu').removeClass('leftColMenu');
        $(this).siblings('.colMenu').show();
        var colMenu = $(this).siblings('.colMenu');
        if (colMenu[0].getBoundingClientRect().right > $(window).width()) {
            colMenu.addClass('leftColMenu');
        }
        if (colMenu.find('.subColMenu').length > 0) {
            if (colMenu.find('.subColMenu')[0].getBoundingClientRect().right > 
                $(window).width()) {
                    colMenu.find('.subColMenu').addClass('leftColMenu');
            }
        }
    });

    $('#headCol'+colId+' .dropdownBox').mouseenter(function() {
        $(this).removeClass('hidden');
    }).mouseout(function() {
        var input = $(this).siblings('span').children('.editableHead');
        if (input.is(':focus')) {
            $(this).addClass('hidden');
        }
    });

    $('#headCol'+colId+' .subColMenuArea').mousedown(function() {
        $('.colMenu').hide();
    });

    $('#headCol'+colId+' ul.colMenu > li:first-child').mouseenter(function(){
        $(this).parent().removeClass('white');
    }).mouseleave(function(){
        $(this).parent().addClass('white');
    });

    $('#headCol'+colId+' .subColMenu li').mouseenter(function() {
            subColMenuMouseEnter($(this));
        }).mouseleave(function() {
            subColMenuMouseLeave($(this));
    });

    $('#headCol'+colId+' .colMenu ul').mouseleave(function(){
        if ($(this).parent().is(':first-child')) {
            $(this).parent().parent().siblings('.rightArrow').
            removeClass('dimmed').addClass('arrowExtended');
        } 
    });

    $('#headCol'+colId+' .dragArea').mousedown(function(event){
        var headCol = $(this).parent().parent();
        headCol.find('.editableHead').focus();
        dragdropMouseDown(headCol, event);
    });

    $('#headCol'+colId+' .addColumns').click(function() {
        var id = $(this).attr('id');
        var direction = id.substring(3,4);
        $('.colMenu').hide();
        addCol(id, null, {direction: direction, isDark: true});
    });

    $('#renameCol'+colId).click(function() {
        var index = $(this).attr('id').substring(9);
        $('#rename'+index).focus().select();
    });

    $("#headCol"+colId).mouseover(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $(this).find('.dropdownBox').css('opacity', 1);
        }
    }).mouseleave(function() {
        $(this).find('.dropdownBox').css('opacity', 0.4);
    });


    $('#duplicate'+colId).click(function() {
        var id = $(this).attr('id').substring(2);
        var index = parseInt(id.substring(7));
        var name = $('#rename'+index).val();
        var width = $('#headCol'+index).outerWidth();
        var isDark = $('#headCol'+index).hasClass('unusedCell');

        console.log(name, 'name')
        addCol(id, name, {width: width, isDark: isDark});
        // Deep copy
        // XXX: TEST THIS FEATURE!
        gTableCols[index-1].func.func = gTableCols[index-2].func.func;
        gTableCols[index-1].func.args = gTableCols[index-2].func.args;
        gTableCols[index-1].userStr = gTableCols[index-2].userStr;
        execCol(gTableCols[index-1], null); 
    });

    $('#sort'+colId).click(function() {
        var index = $(this).attr("id").substring(4);
        sortRows(index, SortDirection.Forward);
    }); 
    
    $('#revSort'+colId).click(function() {
        var index = $(this).attr("id").substring(7);
        sortRows(index, SortDirection.Backward);
    }); 

    $('#headCol'+colId+' .editableHead').mousedown(function(event) {
        event.stopPropagation();
    });

    $('#filter'+colId+' input').keyup(function(e) {
        var value = $(this).val();
        $(this).closest('.filter').siblings().find('input').val(value);
        if (e.which === 13) {
            var operator = $(this).closest('.filter').text(); 
            filterCol(operator, value, colId);
        }
    });

    $('#filter'+colId+' input').click(function(){
        $(this).select();
    });

    $('#join .subColMenu li').click(function() {
        joinTables($(this).text());
    });

    $('#headCol'+colId+' .colMenu li').click(function() {
        if ($(this).children('.subColMenu, input').length === 0) {
            // hide li if doesnt have a submenu or an input field
            $(this).closest('.colMenu').hide();
        }
    });
}
