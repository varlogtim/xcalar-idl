function generateFirstVisibleRowNum(rowScrollerMove) {
    // if ($('#xcTableWrap'+gActiveTableNum).length == 0) {
    //     return;
    // }

    if (! document.elementFromPoint) {
        return;
    }

    var tableLeft = $('#xcTable'+gActiveTableNum).offset().left;
    var tdXCoor = Math.max(0, tableLeft);; 
    var tdYCoor = 168; //top rows's distance from top of window
    var firstRowNum;
    var firstEl = document.elementFromPoint(tdXCoor, tdYCoor);
    var firstId = $(firstEl).closest('tr').attr('class');

    if (firstId && firstId.length > 0) {
        var firstRowNum = parseInt(firstId.substring(3))+1;
        if (!isNaN(firstRowNum)) {
            $('#rowInput').val(firstRowNum).data('val', firstRowNum);
            if (rowScrollerMove && isTableScrollable(gActiveTableNum)) {
                moverowScroller(firstRowNum, 
                    gTables[gActiveTableNum].resultSetCount);
            }
        }
    }
}

function disableTextSelection() {
    xcHelper.removeSelectionRange();
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

function gRescolMouseDown(el, event, options) {
    var rescol   = gRescol;
    var $table   = el.closest('.dataTable');
    var tableNum = xcHelper.parseTableNum($table);
    var colNum   = xcHelper.parseColNum(el.parent().parent());

    if (options && options.target == "datastore") {
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
    rescol.tableHeadInput = rescol.tableHead.find('input');
    rescol.headerDiv = el.parent(); // the .header div
    
    rescol.tempCellMinWidth = rescol.cellMinWidth-5;
    rescol.leftDragMax =  rescol.tempCellMinWidth - rescol.startWidth;

    disableTextSelection();
    $(document.head).append('<style id="ew-resizeCursor" type="text/css">*'+ 
        '{cursor: ew-resize !important;}</style>');
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
    rescol.tableHeadInput.width(tableWidth - 30);
    rescol.tableHead.width(tableWidth);
}

function gRescolMouseUp() {
    gMouseStatus = null;
    $('#ew-resizeCursor').remove();
    reenableTextSelection();
    gRescol.table.find('.rowGrab').width(gRescol.table.width());
    if (!gRescol.isDatastore) {
        var progCol = gTables[gRescol.tableNum].tableCols[gRescol.index-1];
        progCol.width = gRescol.grabbedCell.outerWidth();
    } else {
        gRescol.isDatastore = false;
    }
    moveTableDropdownBoxes();
}

function gResrowMouseDown(el, event) {
    gMouseStatus = "resizingRow";
    gResrow.mouseStart = event.pageY;
    gResrow.targetTd = el.closest('td');
    gResrow.tableNum = parseInt(el.closest('table').attr('id').substring(7));
    gResrow.startHeight = gResrow.targetTd.outerHeight();
    gResrow.rowIndex = gResrow.targetTd.closest('tr').index();
    disableTextSelection();
    var style = '<style id="ns-resizeCursor" type="text/css">*'+ 
        '{cursor: ns-resize !important;}</style>';
    $(document.head).append(style);
    $('body').addClass('hideScroll');
}

function gResrowMouseMove(event) {
    var mouseDistance = event.pageY - gResrow.mouseStart;
    var newHeight = gResrow.startHeight + mouseDistance;
    var row = gResrow.rowIndex;
    var padding = 4; // top + bottom padding in td
    if (newHeight < gRescol.minCellHeight) {
        gResrow.targetTd.outerHeight(gRescol.minCellHeight);
        $('#xcTable'+gResrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', gRescol.minCellHeight-padding);
    } else {
        gResrow.targetTd.outerHeight(newHeight);
        $('#xcTable'+gResrow.tableNum+' tbody tr:eq('+row+') td > div').
            css('max-height', newHeight-padding);
    }
}

function gResrowMouseUp() {
    var newRowHeight = gResrow.targetTd.outerHeight();
    var classNames = gResrow.targetTd.parent().attr('class');
    var index = classNames.indexOf('row');
    var rowNum = parseInt(classNames.substring(index+3))+1;
    var rowObj = gTables[gResrow.tableNum].rowHeights;
    // structure of rowObj is rowObj {pageNumber:{rowNumber: height}}
    var pageNum = Math.floor((rowNum-1) / gNumEntriesPerPage);
    gMouseStatus = null;
    $('#ns-resizeCursor').remove();
    reenableTextSelection();
    $('body').removeClass('hideScroll'); 
    adjustColGrabHeight(gResrow.tableNum);
    if (gTables[gActiveTableNum].resultSetCount != 0) {  
        generateFirstVisibleRowNum();
    }

    if (newRowHeight != gRescol.minCellHeight) {
        if (rowObj[pageNum] == undefined) {
            rowObj[pageNum] = {};
        }
        rowObj[pageNum][rowNum] = newRowHeight;
    } else {
        // remove this rowNumber from gTables and 
        //if no other rows exist in the page, remove the pageNumber as well
        if (rowObj[pageNum] != undefined) {
            delete rowObj[pageNum][rowNum];
            if ($.isEmptyObject(rowObj[pageNum])) {
                delete rowObj[pageNum];
            }
        }
    }
}

function dragdropMouseDown(el, event) {
    gMouseStatus = "movingCol";
    var dragObj = gDragObj;
    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
        '{cursor:move !important; cursor: -webkit-grabbing !important;'+
        'cursor: -moz-grabbing !important;}</style>';
    $(document.head).append(cursorStyle);

    dragObj.mouseX = event.pageX;
    dragObj.colNum = xcHelper.parseColNum(el);
    var tableWrap = el.closest('.xcTableWrap');
    var $table = el.closest('.xcTable');
    var $tbodyWrap = $table.parent();
    dragObj.table = tableWrap;
    dragObj.tableNum = parseInt(tableWrap.attr('id').substring(11));
    dragObj.element = el;
    dragObj.colIndex = parseInt(el.index());
    dragObj.offsetTop = el.offset().top;
    dragObj.grabOffset = dragObj.mouseX - el.offset().left;
    // dragObj.grabOffset = distance from the left side of dragged column
    // to the point that was grabbed

    dragObj.docHeight = $(document).height();
    dragObj.val = el.find('.editableHead').val();
    var tableTitleHeight = tableWrap.find('.tableTitle').height();
    var shadowDivHeight = $tbodyWrap.height();
    var shadowTop = tableWrap.find('.header').position().top - 5;
    dragObj.inFocus =  el.find('.editableHead').is(':focus');
    dragObj.selected = el.hasClass('selectedCell');
    dragObj.colWidth = el.width();
    dragObj.windowWidth = $(window).width();
    
    // create a replica shadow with same column width, height,
    // and starting position
    tableWrap.append('<div id="shadowDiv" style="width:'+
                            dragObj.colWidth+
                            'px;height:'+(shadowDivHeight)+'px;left:'+
                            (dragObj.element.position().left)+
                            'px;top:'+shadowTop+'px;"></div>');

    // create a fake transparent column by cloning 
    createTransparentDragDropCol();
    disableTextSelection();
    $tbodyWrap.addClass('hideScroll');
    createDropTargets();
    dragdropMoveMainFrame();
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
    if ((dragObj.colIndex) != dragObj.colNum) {
        // add sql
        var table = gTables[dragObj.tableNum];

        SQL.add("Change Column Order", {
            "operation": "changeColOrder",
            "tablename": table.frontTableName,
            "colName": table.tableCols[dragObj.colNum - 1].name,
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

    dragObj.table.find('.col'+dragObj.colNum)
                 .removeClass('col'+dragObj.colNum)
                 .addClass('colNumToChange');

    if (dragObj.colNum > dragObj.colIndex) {
        for (var i = dragObj.colNum; i >= dragObj.colIndex; i--) {
            dragObj.table.find('.col'+i)
                   .removeClass('col'+i)
                   .addClass('col'+(i+1));
        }
    } else {
        for (var i = dragObj.colNum; i <= dragObj.colIndex; i++) {
            dragObj.table.find('.col'+i)
                   .removeClass('col'+i)
                   .addClass('col'+(i-1));
        }
    }

    dragObj.table.find('.colNumToChange')
                 .addClass('col'+dragObj.colIndex)
                 .removeClass('colNumToChange');
}

function dragdropMoveMainFrame() {
    // essentially moving the horizontal mainframe scrollbar if the mouse is 
    // near the edge of the viewport
    var dragObj = gDragObj;
    if (gMouseStatus == 'movingCol' || gMouseStatus == 'movingTable') {
        if (dragObj.pageX > dragObj.windowWidth-2) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()+50));
        } else if (dragObj.pageX > dragObj.windowWidth-20) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()+20));
        } else if (dragObj.pageX < 2) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()-50));
        } else if (dragObj.pageX < 20) {
            $('#mainFrame').scrollLeft(($('#mainFrame').scrollLeft()-20));
        }
        setTimeout(function() {
            dragdropMoveMainFrame();
        }, 40);
    }
}

function cloneCellHelper(obj) {
    var dragObj = gDragObj;
    var td = $(obj).children();
    var row = $("<tr></tr>");
    var rowColor = $(obj).css('background-color');
    var clone = td.eq(dragObj.colIndex).clone();
    var cloneHeight = td.eq(dragObj.colIndex).outerHeight();
    var cloneColor = td.eq(dragObj.colIndex).css('background-color');
    row.css('background-color', rowColor);
    clone.css('height', cloneHeight+'px');
    clone.outerWidth(dragObj.colWidth);
    clone.css('background-color', cloneColor);
    row.append(clone).appendTo($("#fauxTable"));
}

function createTransparentDragDropCol() {
    var dragObj = gDragObj;
    $('#mainFrame').append('<div id="fauxCol" style="left:'+
                    dragObj.mouseX+'px;'+
                    'width:'+(dragObj.colWidth)+'px;'+
                    'margin-left:'+(-dragObj.grabOffset)+'px;">'+
                        '<table id="fauxTable" '+
                        'class="dataTable xcTable" '+
                        'style="width:'+(dragObj.colWidth)+'px">'+
                        '</table>'+
                    '</div>');
    dragObj.fauxCol = $('#fauxCol');
    
    var rowHeight = 30;
    // turn this into binary search later
    var topPx = dragObj.table.find('.header').offset().top - rowHeight;
    var topRowIndex = -1;
    var topRowTd = null;
    dragObj.table.find('tbody tr').each(function() {
        if ($(this).offset().top > topPx) {
            topRowIndex = $(this).index();
            topRowEl = $(this).find('td');
            return (false);
        }
    });

    //XXX check to see if topRowEl was found;
    if (topRowIndex == -1) {
        console.log("BUG! Cannot find first visible row??");
        // Clone entire shit and be.then.
        dragObj.table.find('tr').each(function(i, ele) {
            cloneCellHelper(ele);
        });
        return;
    }

    // Clone head
    dragObj.table.find('tr:first').each(function(i, ele) {
        cloneCellHelper(ele);
        if (dragObj.selected) {
            $('#fauxTable').addClass('selectedCol');
        }
    });

    var totalRowHeight = dragObj.element
            .closest('#xcTableWrap'+dragObj.tableNum).height()-
            dragObj.table.find('th:first').outerHeight();
    var numRows = Math.ceil(totalRowHeight/rowHeight);
    var count = 0;
    dragObj.table.find('tr:gt('+(topRowIndex)+')')
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

    var xcTableWrap0Height = $('#xcTableWrap'+dragObj.tableNum).height();
    var fauxColHeight = Math.min(fauxTableHeight, xcTableWrap0Height - 36);
    dragObj.fauxCol.height(fauxColHeight);
    var firstRowOffset = $(topRowEl).offset().top - topPx-rowHeight;
    $('#fauxTable').css('margin-top', firstRowOffset);
    $('#fauxTable tr:first-child').css({'margin-top': 
            -($('#fauxTable tr:first').outerHeight()+firstRowOffset- 5)});
}

function createDropTargets(dropTargetIndex, swappedColIndex) {
    var dragObj = gDragObj;
    var dragMargin = 30; 
    // targets extend this many pixels to left of each column
   
    if (!dropTargetIndex) {
        // create targets that will trigger swapping of columns on hover
        var dropTargets = "";
        var i = 0;
        dragObj.table.find('tr:first th').each(function() {
            if (i == 0 || i == dragObj.colIndex) {
                i++;
                return true;  
            }
            var colLeft = $(this).position().left;
            if ((dragObj.colWidth-dragMargin) < 
                Math.round(0.5*$(this).width())) {
                var targetWidth = dragObj.colWidth;
            } else {
                var targetWidth = Math.round(0.5*$(this).outerWidth())+
                                  dragMargin;
            }
            dropTargets += '<div id="dropTarget'+i+'" class="dropTarget"'+
                            'style="left:'+
                            (colLeft-dragMargin+dragObj.grabOffset)+'px;'+
                            'width:'+targetWidth+'px;height:'
                            +(dragObj.docHeight)+'px;">'+i+
                            '</div>';
            i++;
        });
        var scrollLeft = $('#mainFrame').scrollLeft();
        // may have issues with table left if dragObj.table isn't correct
        var tableLeft = dragObj.table[0].getBoundingClientRect().left +
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
        var swappedCol = dragObj.table.find('th:eq('+swappedColIndex+')');
        var colLeft = swappedCol.position().left;
        $('#dropTarget'+dropTargetIndex)
            .attr('id', 'dropTarget'+swappedColIndex);
        var dropTarget = $('#dropTarget'+swappedColIndex);
        dropTarget.css({'left': (colLeft-dragMargin+dragObj.grabOffset)+'px'});
    }
}

function mainFrameScrollDropTargets(event) {
    var left = -$(event.target).scrollLeft();
    $('#dropTargets').css('left', left);
}

function dragdropSwapColumns(el) {
    var dragObj = gDragObj;
    var dropTargetId = parseInt((el.attr('id')).substring(10));
    var nextCol = dropTargetId - Math.abs(dropTargetId-dragObj.colIndex);
    var prevCol = dropTargetId + Math.abs(dropTargetId-dragObj.colIndex);
    var movedCol;
    if (dropTargetId>dragObj.colIndex) {
        dragObj.table.find('tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').after(
                $(this).children(':eq('+nextCol+')')
            );
        });
        movedCol = nextCol;
    } else {
        dragObj.table.find('tr').each(function() { 
            $(this).children(':eq('+dropTargetId+')').before(
                $(this).children(':eq('+prevCol+')')
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
    var table = $('#xcTable'+tableNum);
    var oldTableWidth = table.width();
    if (oldTableWidth < gMinTableWidth) {
        var lastTd = table.find('tr:first th').length-1;
        var lastTdWidth = table.find('.th.col'+lastTd).width();
        table.find('thead:last .th.col'+lastTd).
            width(lastTdWidth + (gMinTableWidth - oldTableWidth)); 
    }
    matchHeaderSizes(colNum, $('#xcTable'+tableNum));
}

function getTextWidth(el) {
    var width;
    if (el.is('input')) {
        var text = $.trim(el.val()+" ");
    } else {
        var text = $.trim(el.text());
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
    var index = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var tableNum = xcHelper.parseTableNum($table);
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var resizeFirstRow = options.resizeFirstRow || false;
    var minWidth = options.minWidth || (gRescol.cellMinWidth - 10);
    var oldTableWidth = $table.width();
    var maxWidth = 700;
    var widestTdWidth = getWidestTdWidth(el, {includeHeader: includeHeader});
    var newWidth = Math.max(widestTdWidth, minWidth);
    var dbClick = options && options.dbClick;
    // dbClick is autoSized to a fixed width
    if (!dbClick) {
        var originalWidth = gTables[tableNum].tableCols[index - 1].width;
        newWidth = Math.max(newWidth, originalWidth);
    }
    newWidth = Math.min(newWidth, maxWidth);
    el.outerWidth(newWidth);
    if ($table.attr('id').indexOf('xc') > -1) {
        gTables[tableNum].tableCols[index - 1].width = el.outerWidth();
    }
    matchHeaderSizes(index, $table);
}

function getWidestTdWidth(el, options) {
    var options = options || {};
    var includeHeader = options.includeHeader || false;
    var id = xcHelper.parseColNum(el);
    var $table = el.closest('.dataTable');
    var largestWidth = 0;
    var longestText = 0;
    var textLength;
    var padding = 10;
    var largestTd = $table.find('tbody tr:first td:eq('+(id)+')');
    var headerWidth = 0;

    $table.find('tbody tr').each(function() {
        // we're going to take advantage of monospaced font
        //and assume text length has an exact correlation to text width
        var td = $(this).children(':eq('+(id)+')');
        textLength = $.trim(td.text()).length;
        if (textLength > longestText) {
            longestText = textLength; 
            largestTd = td;
        }
    });

    largestWidth = getTextWidth(largestTd);

    if (includeHeader) {
        var th = $table.find('.col'+id+' .editableHead');
        headerWidth = getTextWidth(th);
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
        if (el.closest('tHead').index() == 0) {
            var resize = true;
        } else {
            var resize = false;
        }
        if (options && options.minWidth) {
            var minWidth = options.minWidth
        } else {
            var minWidth = 17;
        }
        autosizeCol(el.parent().parent(), {resizeFirstRow: resize,
                                            dbClick: true,
                                            minWidth: minWidth});
        $('#ew-resizeCursor').remove();
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
    if (gTables[tableNum] != undefined) {
        tableName = gTables[tableNum].backTableName;
    }

    var html = '<div class="tableTitle">' + 
                    '<div class="tableGrab"></div>' + 
                    '<input type="text">' + 
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
            '<li class="quickAgg">Quick Aggregates</li>' + 
            '<li class="moveToWorksheet" data-toggle="tooltip" '+
                'data-placement="top" title="no worksheet to move to">' + 
                'Move to worksheet' + 
                '<ul class="subColMenu">' + 
                    '<li style="text-align: center" class="clickable">'+
                        '<span>Worksheet Name</span>' + 
                        '<div class="listSection">' + 
                            '<input class="wsName" type="text" width="100px" '+ 
                                'placeholder="click to see options"/>' +
                            '<ul class="list"></ul>' + 
                        '</div>' + 
                    '</li>' +
                '</ul>' + 
                '<div class="dropdownBox"></div>' + 
            '</li>' + 
            '<li class="dupToWorksheet">' + 
                '<span class="label">Copy to worksheet</span>' + 
                '<ul class="subColMenu">' + 
                    '<li style="text-align: center" class="clickable">'+
                        '<span>Worksheet Name</span>' + 
                        '<div class="listSection">' + 
                            '<input class="wsName" type="text" width="100px" '+ 
                                'placeholder="click to see options"/>' +
                            '<ul class="list"></ul>' + 
                        '</div>' + 
                    '</li>' +
                    '<li style="text-align: center" class="clickable">'+
                        '<span>New Table Name</span>' + 
                        '<input class="tableName" type="text" width="100px" ' + 
                                'placeholder="Enter a new table name" ' + 
                                'value="' + newTableName + '"/>' + 
                    '</li>' +
                '</ul>' + 
                '<div class="dropdownBox"></div>' + 
            '</li>' + 
        '</ul>';

    $('#xcTableWrap'+ tableNum).append(tableMenuHTML);

    addColMenuBehaviors($("#tableMenu" + tableNum));

    // Event Listener for table title
    $xcTheadWrap.on({
        "keyup": function(event) {
            if (event.which == keyCode.Enter) {
                $(this).blur();
            }
        },
        "focus": function() {
            updateTableHeader(null, $(this), true);
        },
        "blur": function() {
            updateTableHeader(null, $(this));
        }
    }, ".tableTitle input");

    $xcTheadWrap.on('click', '.tableTitle > .dropdownBox', function() {
        dropdownClick($(this));
    });

    // Change from $xcTheadWrap.find('.tableGrab').mosedown...
    $xcTheadWrap.on('mousedown', '.tableGrab', function(event) {
        // Not Mouse down
        if (event.which != 1) {
            return;
        }
        dragTableMouseDown($(this).parent(), event);
    });

    // Event Listener for table dropdown menu
    var $tableMenu = $('#tableMenu' + tableNum);

    $tableMenu.on('click', '.archiveTable', function() {
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        var tableName = gTables[tableNum].frontTableName;

        $menu.hide();

        archiveTable(tableNum, DeleteTable.Keep);
        // add sql
        SQL.add('Archive Table', {
            "operation": "archiveTable",
            "tableName": tableName
        });
    });

    $tableMenu.on('click', '.hideTable', function() {
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $('#xcTableWrap'+tableNum).addClass('tableHidden');
        moveTableDropdownBoxes();
    });

    $tableMenu.on('click', '.unhideTable', function() {
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $('#xcTableWrap'+tableNum).removeClass('tableHidden');
        WSManager.focusOnWorksheet(WSManager.getActiveWS(), false, tableNum);
        moveTableDropdownBoxes();
    });

    $tableMenu.on('click', '.deleteTable', function() {
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id')
                                     .substring(9));
        var tableName = gTables[tableNum].frontTableName;
        var alertOptions = {};

        $menu.hide();

        // add alert
        alertOptions.title = "DELETE TABLE";
        alertOptions.msg = "Are you sure you want to delete table " 
                            + tableName + "?";
        alertOptions.isCheckBox = true;
        alertOptions.confirm = function() {
            deleteActiveTable(tableNum)
            .then(function() {
                commitToStorage();
            })
            .fail(function(error) {
                Alert.error("Delete Table Fails", error);
            });
        }

        Alert.show(alertOptions);
    });

    $tableMenu.on('click', '.exportTable', function() {
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $menu.hide();
        xcFunction.exportTable(tableNum)
    });

    $tableMenu.on('click', '.delAllDuplicateCols', function() {
        var $menu = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));
        $menu.hide();
        var columns = gTables[tableNum].tableCols;
        // var numCols = columns.length;

        for (var i = 0; i < columns.length; i++) {
            if (columns[i].func.func && columns[i].func.func == "raw") {
                continue;
            } else {
                var forwardCheck = true;
                ColManager.delDupCols(i+1, tableNum, forwardCheck);
            }     
        }
    });

    $tableMenu.on('click', '.quickAgg', function() {
        var $menu    = $(this).closest('.tableMenu');
        var tableNum = parseInt($menu.attr('id').substring(9));

        $menu.hide();
        AggModal.show(tableNum);
    });

    // opeartion for move to worksheet and copy to worksheet
    $tableMenu.on('mouseenter', '.moveToWorksheet', function() {
        var $list = $(this).find(".list");
        var html  = WSManager.getWSLists(false);

        $list.empty().append(html);
    });


    $tableMenu.on('mouseenter', '.dupToWorksheet', function() {
        var $list = $(this).find(".list");
        var html  = WSManager.getWSLists(true);

        $list.empty().append(html);
    });

    xcHelper.dropdownList($tableMenu.find(".listSection"), {
        "onSelect" : function($li) {
            var $input = $li.closest(".listSection").find(".wsName");
            $input.val($li.text()).focus();
        }
    });

    $tableMenu.on('keypress', '.moveToWorksheet input', function(event) {
        if (event.which == keyCode.Enter) {
            var $input   = $(this);
            var wsName   = jQuery.trim($input.val());
            var $option  = $input.siblings(".list").find("li")
                                 .filter(function() 
            {
                return $(this).text() === wsName;
            });

            var isValid  = xcHelper.validate([
                {
                    "$selector": $input,
                    "forMode"  : true,
                },
                {
                    "$selector": $input,
                    "check"    : function () {
                        return ($option.length === 0);
                    },
                    "text"     : "Invalid worksheet name, please choose a " + 
                                 "worksheet in the pop up list!",
                    "forMode"  : true
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
            $menu.hide();
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

            var wsName        = jQuery.trim($wsInput.val());
            var newTableName  = jQuery.trim($tableNameInput.val());

            var $option       = $li.find(".list li").filter(function() {
                return $(this).text() === wsName;
            });
            // XXX also need to check table name conflict
            isValid = xcHelper.validate({
                "$selector": $wsInput,
                "check"    : function() {
                    return ($option.length === 0);
                },
                "text"     : "Invalid worksheet name, " + 
                             "please choose a worksheet in the pop up list!",
                "formMode" : true
            });

            if (!isValid) {
                return false;
            }

            var $menu    = $li.closest('.tableMenu');
            var tableNum = parseInt($menu.attr('id').substring(9));
            var table    = gTables[tableNum];
            var wsIndex  = $option.data("worksheet");

            WSManager.copyTable(table.frontTableName, newTableName, wsIndex);

            $wsInput.val("");
            $wsInput.blur();

            $tableNameInput.val(xcHelper.randName(table.backTableName, 
                                                  undefined, true));
            $tableNameInput.blur();
            $menu.hide();
        }
    });

    var $table = $('#xcTable' + tableNum);
    $table.width(0);
    var matchAllHeaders = true;
    matchHeaderSizes(null, $table, matchAllHeaders);
}

function updateTableHeader(tableNum, $tHead, isFocus) {
    var tableName = "";
    var cols = 0;

    var $tHead = $tHead || $("#xcTheadWrap" + tableNum + " .tableTitle input");
    // for blur and focus on table header
    if (tableNum == null) {
        cols = $tHead.data("cols");
        tableName = $tHead.data("title");
        if (isFocus) {
            $tHead.val(tableName);
        } else {
            $tHead.val(tableName + "  [" + cols + "]");
        }
    } else {
        // for update table header
        if (gTables[tableNum] != undefined) {
            tableName = gTables[tableNum].frontTableName;
            cols = gTables[tableNum].tableCols.length;
        }
        $tHead.data("cols", cols);
        $tHead.data("title", tableName);
        $tHead.val(tableName + "  [" + cols + "]");
    }
}

function matchHeaderSizes(colNum, $table, matchAllHeaders) {
    if (matchAllHeaders) {
        var numCols = $table.find('th').length;
        var $theadRow = $table.find('thead tr');
        for (var i = 0; i < numCols; i++) {
            var $header = $theadRow.find('th.col'+i);
            var headerWidth = $header.outerWidth();
            $header.children().outerWidth(headerWidth);
        }
    } else {
        var $header = $table.find('th.col'+colNum);
        var headerWidth = $header.outerWidth();
        $header.children().outerWidth(headerWidth);
    }
    var tableNum = $table.attr('id').slice(7);
    var tableWidth = $table.width();
    $theadWrap = $('#xcTheadWrap'+tableNum);
    $theadWrap.width(tableWidth);

    $theadWrap.find('input').width(tableWidth - 30);
    moveTableDropdownBoxes();
}

function displayShortenedHeaderName($el, tableNum, colNum) {
    if (gTables[tableNum].tableCols[colNum-1].name.length > 0) {
        $el.val(gTables[tableNum].tableCols[colNum-1].name);
    }
}

function addColListeners($table, tableNum) {;
    var $thead = $table.find('thead tr');
    var $colMenu = $('#colMenu'+tableNum);
    $thead.on({
        "focus": function() {
            $('#fnBar').addClass('active');
            var dynTableNum = parseInt($(this).closest('.dataTable').attr('id')
                          .substring(7));
            focusTable(dynTableNum);
            
            var oldFnBarOrigin;
            if (gFnBarOrigin) {
                oldFnBarOrigin = gFnBarOrigin[0];
            }
            gFnBarOrigin = $(this);
            if (!$('#fnBar').hasClass('entered')) {
                if (oldFnBarOrigin == gFnBarOrigin[0]) {
                    // the function bar origin hasn't changed so just return
                    // and do not rehighlight or update any text
                    return;
                }
            } else {
                $('#fnBar').removeClass('entered');
            }
            var index = xcHelper.parseColNum($(this));
            $(this).closest('.header').css('z-index', '9');

            var userStr = gTables[dynTableNum].tableCols[index-1].userStr;
            userStr = userStr.substring(userStr.indexOf('='));
            $('#fnBar').val(userStr);

            highlightColumn(gFnBarOrigin);
            $(this).parent().siblings('.dropdownBox').addClass('hidden');
        },
        "blur": function() {
            var $el         = $(this);
            var dynTableNum = parseInt($el.closest('.dataTable').attr('id')
                                        .substring(7));
            var index       = xcHelper.parseColNum($el);

            if (!$('#fnBar').hasClass('inFocus')) {
                displayShortenedHeaderName($el, dynTableNum, index);
            }
 
            $el.parent().siblings('.dropdownBox').removeClass('hidden');
            $('#fnBar').removeClass('active');
        },
        "keyup": function(event) {
            if (event.which == keyCode.Enter) {
                functionBarEnter($(this));
                return;
            }
        },
        "input": function() {
            gFnBarOrigin = $(this);
        }
    }, ".editableHead");

    $thead.on('click', '.header .flex-right > .dropdownBox', function() {
        $('.tooltip').hide();
        var options = {};
        var colNum  = xcHelper.parseColNum($(this).closest('th'));
        resetColMenuInputs($(this));

        options.colNum = colNum;
        options.classes = $(this).closest('.header').attr('class');
        if ($(this).closest('th').hasClass('indexedColumn')) {
            options.classes += " type-indexed";
        }
        if ($(this).closest('th').hasClass('newColumn') ||
            options.classes.indexOf('type') === -1) {
            options.classes += " type-newColumn";
        }
        if ($(this).closest('th').width() == 10) {
            // column is hidden
            options.classes += " type-hidden";
        }

        dropdownClick($(this), null, options);
    });

    $thead.on({
        "mouseenter": function() {
            $(this).removeClass('hidden');
        },
        "mouseout": function() {
            var input = $(this).siblings('.editableHead');
            if (input.is(':focus')) {
                $(this).addClass('hidden');
            }
        }
    }, ".dropdownBox");

    $thead.on('mousedown', '.colGrab', function(event) {
        if (event.which != 1) {
            return;
        }
        gRescolMouseDown($(this), event);
        dblClickResize($(this));
    });

    $thead.on('mousedown', '.dragArea', function(event) {
        if (event.which != 1) {
            return;
        }
        var headCol = $(this).parent().parent();
        dragdropMouseDown(headCol, event);
    }); 

    addColMenuBehaviors($colMenu);
    addColMenuActions($colMenu, $thead);
}

function addColMenuBehaviors($colMenu) {
    $colMenu.on({
        "mouseenter": function() {
            $(this).children('ul').addClass('visible');
            $(this).addClass('selected');
            if (!$(this).hasClass('inputSelected')) {
                $('.inputSelected').removeClass('inputSelected');
            }
        },
        "mouseleave": function() {
            $(this).children('ul').removeClass('visible');
            $(this).find('.listSection').removeClass("open")
                    .find('.list').hide();
            $(this).removeClass('selected');
            $('.tooltip').remove();
        }
    }, "li");

    $colMenu.on('mousedown', '.subColMenuArea', function() {
        $colMenu.hide();
    });

    $colMenu.on('mousedown', '.inputMenu span', function() {
        if ($(this).hasClass('openMenuInput')) {
            $(this).removeClass('openMenuInput');
        } else {
            $(this).addClass('openMenuInput');
        }
    });
    
    // prevents input from closing unless you hover over a different li
    // on the main column menu
    $colMenu.on({
        "focus": function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        },
        "blur": function() {
            $(this).parents('li').removeClass('inputSelected')
            .parents('.subColMenu').removeClass('inputSelected');
        },
        "keyup": function() {
            $(this).parents('li').addClass('inputSelected')
            .parents('.subColMenu').addClass('inputSelected');
        }
    }, 'input');

    $colMenu.on('click', 'li', function(event) {
        if ($(this).children('.subColMenu, input').length === 0 ) {
            // hide li if doesnt have a submenu or an input field
            $colMenu.hide();
        }
    });

    $colMenu.on('click', 'input', function() {
        $(this).select();
    });
}

function addColMenuActions($colMenu, $thead) {

    $colMenu.on('click', '.addColumns', function() {
        var colNum = $colMenu.data('colNum');
        var index = 'col'+ colNum;
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var tableId = "xcTable"+tableNum;

        // add sql
        var table = gTables[tableNum];
        var sqlOptions = {
            "operation": "addCol",
            "tableName": table.frontTableName,
            "newColName": "",
            "siblColName": table.tableCols[colNum - 1].name,
            "siblColIndex": colNum
        };

        var direction;
        if ($(this).hasClass('addColLeft')) {
            direction = "L";
            sqlOptions.direction = "L";
        } else {
            sqlOptions.direction = "R";
        }
        $colMenu.hide();

        ColManager.addCol(index, tableId, null, 
                         {direction: direction, isNewCol: true, inFocus: true});

        SQL.add("Add Column", sqlOptions);
    })

    $colMenu.on('click', '.deleteColumn', function() {
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7)); 

        ColManager.delCol(colNum, tableNum);
    });

    $colMenu.on('click', '.deleteDuplicates', function() {
        var index    = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.delDupCols(index, tableNum);

    });

    $colMenu.on('click', '.renameCol', function() {
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var index = $colMenu.data('colNum');
        $('#xcTable'+tableNum).find('.editableHead.col'+index)
            .focus().select();
    });

    $colMenu.on('click', '.duplicate', function() {
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var table = $('#xcTable'+tableNum);
        var name = table.find('.editableHead.col'+index).val();
        var width = table.find('th.col'+index).outerWidth();
        var isNewCol = table.find('th.col'+index).hasClass('unusedCell');

        ColManager.addCol('col'+index, table.attr('id'),name, 
                          {width: width, isNewCol: isNewCol});
        // add sql
        SQL.add("Duplicate Column", {
            "operation": "duplicateCol",
            "tableName": gTables[tableNum].frontTableName,
            "colName": name,
            "colIndex": index
        });

        gTables[tableNum].tableCols[index].func.func = 
            gTables[tableNum].tableCols[index-1].func.func;
        gTables[tableNum].tableCols[index].func.args = 
            gTables[tableNum].tableCols[index-1].func.args;
        gTables[tableNum].tableCols[index].userStr = 
            gTables[tableNum].tableCols[index-1].userStr;

        ColManager.execCol(gTables[tableNum].tableCols[index], tableNum)
        .then(function() {
            updateTableHeader(tableNum);
            RightSideBar.updateTableInfo(gTables[tableNum]);
        }); 
    });

    $colMenu.on('click', '.hide', function() {
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.hideCol(colNum, tableNum);
        
    });

    $colMenu.on('click', '.unhide', function() {
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.unhideCol(colNum, tableNum, {autoResize: true});
    });

    $colMenu.on('click', '.textAlign', function() {
        var colNum   = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));

        ColManager.textAlign(colNum, tableNum, $(this).attr("class")); 
    });

    /// added back in
    $colMenu.on('click', '.sort .sort', function() {
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        xcFunction.sort(index, tableNum, SortDirection.Forward);
    }); 
    
    $colMenu.on('click', '.sort .revSort', function() {
        var index = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        xcFunction.sort(index, tableNum, SortDirection.Backward);
    }); 
    
    // $colMenu.on('click', '.aggrOp', function() {
    //     var index = $colMenu.data('colNum');
    //     var tableNum = parseInt($colMenu.attr('id').substring(7));
    //     var pCol = gTables[tableNum].tableCols[index-1];
    //     if (pCol.func.func != "pull") {
    //         console.log(pCol);
    //         alert("Cannot aggregate on column that does not exist in DATA.");
    //         return;
    //     }
    //     console.log(index, pCol);
    //     var colName = pCol.func.args[0];
    //     var aggrOp = $(this).closest('.aggrOp').text();
    //     console.log(colName+" "+gTables[tableNum].backTableName+" "+aggrOp);
    //     var msg = StatusMessageTStr.Aggregate+' '+aggrOp+' '+
    //                     StatusMessageTStr.OnColumn+': ' + colName;
    //     StatusMessage.show(msg);

    //     checkSorted(tableNum, index)
    //     .then(function(tableName) {
    //         aggregateCol(aggrOp, colName, tableName, msg);
    //     });

    // });

    // // added back in

    $colMenu.on('click', '.joinList', function() {
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var colNum   = $colMenu.data('colNum');

        JoinModal.show(tableNum, colNum);
    });

    $colMenu.on('click', '.functions', function() {
        var colNum = $colMenu.data('colNum');
        var tableNum = parseInt($colMenu.attr('id').substring(7));
        var func = $(this).text().replace(/\./g,'');
        OperationsModal.show(tableNum, colNum, func);
    });

    // $colMenu.on('click', '.operations', function() {
    //     var colNum = $colMenu.data('colNum');
    //     var tableNum = parseInt($colMenu.attr('id').substring(7));
    //     OperationsModal.show(tableNum, colNum);
    // });
}

function functionBarEnter($colInput) {
    gFnBarOrigin = $colInput;
    var index = xcHelper.parseColNum($colInput);
    var $table = $colInput.closest('.dataTable');
    var tableNum = parseInt($table.attr('id').substring(7));
    var tableCol = gTables[tableNum].tableCols[index-1];
    var newName = $.trim($colInput.val());
    var oldName = tableCol.name;
    var newFuncStr = $.trim($('#fnBar').val());
    var progStr = '"' + newName + '" ' + newFuncStr;
    var oldUsrStr = tableCol.userStr;
    $('#fnBar').removeClass('inFocus');
  
    if (progStr == oldUsrStr || newName == "") {
        $colInput.val(oldName);
        $colInput.blur();
        return;
    }

    $colInput.closest('th').removeClass('unusedCell');
    $table.find('td:nth-child('+index+')').removeClass('unusedCell');

    //check if the function changed
    var tempFuncStr = '"' + oldName + '" ' + newFuncStr;
    if (oldUsrStr == tempFuncStr) {
        // only the name has changed, not the function
        tableCol.name = newName;
        tableCol.userStr = progStr;
        $colInput.blur();
        return;
    }

    var progCol = parseFunc(progStr, index, tableNum, true);
    // add sql
    SQL.add("Pull Column", {
        "operation": "pullCol",
        "tableName": gTables[tableNum].frontTableName,
        "colName": progCol.name,
        "colIndex": progCol.index,
    });

    ColManager.execCol(progCol, tableNum)
    .then(function() {
        updateTableHeader(tableNum);
        RightSideBar.updateTableInfo(gTables[tableNum]);
    });

    function parseFunc(funcString, colId, tableNum, modifyCol) {
        // Everything must be in a "name" = function(args) format
        var open   = funcString.indexOf("\"");
        var close  = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
        var name   = funcString.substring(open + 1, close);
        var funcSt = funcString.substring(funcString.indexOf("=") + 1);
        var progCol;

        if (modifyCol) {
            progCol = gTables[tableNum].tableCols[colId-1];
        } else {
            progCol = ColManager.newCol();
        }
        // console.log(progCol)
        progCol.userStr = funcString;
        progCol.name    = name;
        progCol.func    = cleanseFunc(funcSt);
        progCol.index   = colId;

        return (progCol);
    }

    function cleanseFunc(funcString) {
        // funcString should be: function(args)
        var open     = funcString.indexOf("(");
        var close    = funcString.lastIndexOf(")");
        var funcName = jQuery.trim(funcString.substring(0, open));
        var args     = (funcString.substring(open+1, close)).split(",");

        for (var i = 0; i < args.length; i++) {
            args[i] = jQuery.trim(args[i]);
        }

        return ({func: funcName, args: args});
    }

}

function dropdownClick($el, outside, options) {
    $('.colMenu').hide();
    $('.leftColMenu').removeClass('leftColMenu');
    //position colMenu
    var topMargin = -4;
    var leftMargin = 5;
    var top = $el[0].getBoundingClientRect().bottom + topMargin;
    var left = $el[0].getBoundingClientRect().left + leftMargin;
    if (outside) {
        // for dataset dropdown
        var $menu = $("#datasetTableMenu");
    } else {
        var tableNum = parseInt($el.closest('.xcTableWrap').attr('id')
                       .substring(11));
        if ($el.parent().hasClass('tableTitle')) {
            var $menu = $('#tableMenu'+tableNum);

            if (WSManager.getWSLen() <= 1) {
                $menu.find(".moveToWorksheet").addClass("unavailable");
            } else {
                $menu.find(".moveToWorksheet").removeClass("unavailable");
            }
        } else {
            var $menu = $('#colMenu'+tableNum);
        }
    }
    var options = options || {};
    if (options.colNum > -1) {
        $menu.data('colNum', options.colNum);
    }
    if (options.classes) {
        var className = options.classes.replace("header", "");
        $menu.attr('class', 'colMenu '+className);
    }
    
    $menu.css({'top':top, 'left':left});
    $menu.show();

    $('.xcTheadWrap').css('z-index', '9');
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
}

function resetColMenuInputs($el) {
    var tableNum = parseInt($el.closest('.xcTableWrap').attr('id')
                       .substring(11));
    var $menu = $('#colMenu'+tableNum);
    $menu.find('.gb input').val("groupBy");
    $menu.find('.numFilter input').val(0);
    $menu.find('.strFilter input').val("");
    $menu.find('.mixedFilter input').val("");
    $menu.find('.regex').next().find('input').val("*");
}

function highlightColumn(el, keepHighlighted) {
    var index    = xcHelper.parseColNum(el);
    var tableNum = parseInt(el.closest('.dataTable').attr('id').
                       substring(7));
    var $table   = $('#xcTable'+tableNum);
    $('.selectedCell').removeClass('selectedCell');
    $table.find('th.col'+index).addClass('selectedCell');
    $table.find('td.col'+index).addClass('selectedCell');
}

function positionScrollbar(row, tableNum) {
    var canScroll = true;
    var table = $('#xcTable'+tableNum);
    var theadHeight = table.find('thead').height();
    function positionScrollToRow() {
        if (!table.find('.row'+(row-1))[0]) {
            return;
        } 
        var tdTop = table.find('.row'+(row-1))[0].offsetTop;
        var scrollPos = Math.max((tdTop-theadHeight), 1);
        if (canScroll && scrollPos > 
                (table.height() - $('#xcTableWrap'+tableNum).height())) {
            canScroll = false;
        }
        $('#rowScrollerArea').addClass('autoScroll');
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
    for (var i = pageNum; i < lastPageNum; i++) {
        if (rowObj[i]) {
            for (var row in rowObj[i]) {
                var $row = newCells.filter(function() {
                                return ($(this).hasClass('row'+(row-1)));
                           });
                
                $row.find('td.col0')
                    .outerHeight(rowObj[i][row]);
                $row.find('td > div')
                    .css('max-height', rowObj[i][row]-padding);
            }
        }
    }
}

function addTableListeners(tableNum) {
    $('#xcTableWrap'+tableNum).mousedown(function() { 
        var dynTableNum = parseInt($(this).closest('.tableWrap').attr('id')
                       .substring(11));
        if (gActiveTableNum == dynTableNum) {
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
    if (windowWidth == $('#container').width()) {
        windowWidth -= rightSideBarWidth;
    }
    while (tablesAreVisible) {
        var tableRight = $startingTableHead[0].getBoundingClientRect().right;
        if (tableRight > windowWidth) {
            var position = tableRight - windowWidth - 3;
            $startingTableHead.find('.dropdownBox').css('right', position+'px');
            tablesAreVisible = false;
        } else {
            $startingTableHead.find('.dropdownBox').css('right', -3+'px');
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
    var tableName = gTables[tableNum].frontTableName;
    if (WSManager.getWSFromTable(tableName) !== 
        WSManager.getActiveWS()) {
        console.log("Table not in current worksheet");
        return;
    }
    $('#mainFrame').find('.tableTitle').removeClass('tblTitleSelected');
    $('#xcTheadWrap'+tableNum).find('.tableTitle')
        .addClass('tblTitleSelected');
    gActiveTableNum = tableNum;
    updatePageBar(tableNum);
    if (gTables[tableNum].resultSetCount == 0) {  
        $('#rowInput').val(0).data('val', 0);
    } else {
        generateFirstVisibleRowNum();
    }
    Tips.refresh();
}

function moverowScroller(rowNum, resultSetCount) {
    var pct = 100* ((rowNum-1)/(resultSetCount-1));
    $('#rowMarker'+gActiveTableNum)
        .css('transform', 'translate3d('+pct+'%, 0px, 0px)');

}

function setupBookmarkArea() {
    $('#rowScrollerArea').mousedown(function(event) {
        if (event.which != 1 || $('.rowScroller').length == 0) {
            return;
        }
        if ($(event.target).hasClass('subRowMarker')) {
            rowScrollerStartDrag(event, $(event.target).parent());
            return;
        }
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

        if (!isTableScrollable(tableNum)) {
            return;
        }

        var e = $.Event("keypress");
        e.which = keyCode.Enter;
        e['rowScrollerMousedown'] = true;
        var el = $(this);

        setTimeout( function() {
            $("#rowInput").val(rowNum).trigger(e);
            // moverowScroller(rowNum, gTables[gActiveTableNum].resultSetCount);
        }, 145);
    });
}

function isTableScrollable(tableNum) {
    var tHeadHeight = $('#xcTheadWrap'+tableNum).height();
    var tBodyHeight = $('#xcTable'+tableNum).height();
    var tableWrapHeight = $('#xcTableWrap'+tableNum).height();

    return ((tHeadHeight + tBodyHeight) >= (tableWrapHeight));
}

function addRowScroller(tableNum) {
    var rowScrollerHTML = '<div id="rowScroller'+tableNum+
        '" class="rowScroller" data-toggle="tooltip"'+
            'data-placement="bottom" title="scroll to a row">'+
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

    var rows = gTables[tableNum].bookmarks;
    var numRows = rows.length;
    for (var i = 0; i < numRows; i++) {
        appendBookmarkTick(rows[i], tableNum);
    }
    
    if ($('.xcTable').length > 1) {
        $('#rowScroller'+tableNum).hide();
    }  
}

function showRowScroller(tableNum) {
    $('.rowScroller').hide();
    if (tableNum != undefined && tableNum >= 0) {
        $('#rowScroller'+tableNum).show();
    }
}

function emptyScroller() {
    $('#rowInput').val("").data('val',"");
    gActiveTableNum = -1;
    updatePageBar();
}

function bookmarkRow(rowNum, tableNum) {
    //XXX allow user to select color in future? 
    var td = $('#xcTable'+tableNum+' .row'+rowNum+ ' .col0');
    td.addClass('rowBookmarked');
    td.find('.idSpan').attr('title', 'bookmarked');
    appendBookmarkTick(rowNum, tableNum);
    if (gTables[tableNum].bookmarks.indexOf(rowNum) < 0) {
        gTables[tableNum].bookmarks.push(rowNum);
    }
}

function appendBookmarkTick(rowNum, tableNum) {
    var leftPos = 100*(rowNum/gTables[tableNum].resultSetCount);
    var bookmark = $('<div class="bookmark bkmkRow'+rowNum+'"'+
        ' style="left:'+leftPos+'%;" data-toggle="tooltip" '+
        ' data-placement="bottom" data-container="body" title="row '+
        (rowNum+1)+'"></div>');
    $('#rowScroller'+tableNum).append(bookmark);
}

function unbookmarkRow(rowNum, tableNum) {
    var td = $('#xcTable'+tableNum+' .row'+rowNum+ ' .col0');
    td.removeClass('rowBookmarked');
    td.find('.idSpan').attr('title', '');
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
    if (gActiveTableNum < 0 || $.isEmptyObject(gTables[gActiveTableNum])) {
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
    gResrow.el = el;
    gResrow.mouseStart = event.pageX;
    gResrow.scrollAreaOffset = el.parent().offset().left;
    gResrow.rowScrollerWidth = el.parent().width(); 
    var scrollerPositionStart = el.position().left;
    var mouseOffset = gResrow.mouseStart - el.offset().left;
    var cssLeft = parseInt(el.css('left'));
    gResrow.totalOffset = mouseOffset + cssLeft;
    gResrow.boundary = {
        lower: gResrow.scrollAreaOffset, 
        upper: gResrow.scrollAreaOffset + gResrow.rowScrollerWidth 
    }

    var cursorStyle = '<style id="moveCursor" type="text/css">*'+ 
    '{cursor:pointer !important}</style>';
    $(document.head).append(cursorStyle);
    disableTextSelection();
}

function rowScrollerMouseMove(event) {
    var mouseX = event.pageX;
    var translate;
    if (mouseX - gResrow.totalOffset < gResrow.boundary.lower) {
        translate = 0;
    } else if (mouseX - gResrow.totalOffset > gResrow.boundary.upper ) {
        translate = 100;
    } else {
        translate = 100 * (mouseX - gResrow.scrollAreaOffset 
                    - gResrow.totalOffset) / (gResrow.rowScrollerWidth - 1);
    }
    gResrow.el.css('transform', 'translate3d('+translate+'%, 0px, 0px)'); 
}

function rowScrollerMouseUp() {
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
    $("#rowScrollerArea").trigger(e);
}

function resizeRowInput() {
    if (gActiveTableNum < 0) {
        return;
    }

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
    gDragObj.table.scrollTop(gDragObj.tableScrollTop);
    createTableDropTargets();
    dragdropMoveMainFrame();
    disableTextSelection();
}
    
function dragTableMouseMove(e) {
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
    reenableTextSelection(); 

    if (gDragObj.tableIndex != gDragObj.originalIndex) {
        // reorder only if order changed
        reorderAfterTableDrop();
    }
    moveTableDropdownBoxes();
}

function createShadowTable() {
    var rect = gDragObj.table[0].getBoundingClientRect();
    var $mainFrame = $('#mainFrame');
    var width = gDragObj.table.children().width();
    var tableHeight = gDragObj.table.find('.xcTheadWrap').height() + 
                      gDragObj.table.find('.xcTbodyWrap').height();
    var mainFrameHeight = $mainFrame.height();
    if ($mainFrame[0].scrollWidth > $mainFrame.width()) {
        mainFrameHeight -= 11;
    }
    var shadowHeight = Math.min(mainFrameHeight, tableHeight+5);
    
    var shadowTable = '<div id="shadowTable" '+
                'style="width:'+width+'px;height:'+shadowHeight+'px;">'+
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
    var $dagWrap = $('#dagWrap'+gDragObj.originalIndex);
    if (gDragObj.tableIndex == 0) {
        $('#rowScrollerArea').prepend(rowScroller);
        $('.dagArea').prepend($dagWrap);
    } else if (gDragObj.originalIndex < gDragObj.tableIndex) {
        $('#rowScroller'+gDragObj.tableIndex).after(rowScroller);
        $('#dagWrap'+gDragObj.tableIndex).after($dagWrap);
    } else if (gDragObj.originalIndex > gDragObj.tableIndex) {
        $('#rowScroller'+gDragObj.tableIndex).before(rowScroller);
         $('#dagWrap'+gDragObj.tableIndex).before($dagWrap);
    }

    // correct table and rowscroller id numbers
    var rowScrollers = $('.rowScroller');
    var $dagWraps = $('.dagWrap');
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
        tableWrap.children('.colMenu:not(.tableMenu)').attr('id', 'colMenu'+i);
        $(rowScrollers[i]).attr('id', 'rowScroller'+i);
        $(rowScrollers[i]).find('.rowMarker').attr('id','rowMarker'+i);
        $($dagWraps[i]).attr('id', 'dagWrap'+i);
    }
}

function adjustColGrabHeight(tableNum) {
    var colGrabHeight = $('#xcTbodyWrap'+tableNum).height();

    $('#xcTable'+tableNum).find('.colGrab').height(colGrabHeight);
}

function showWaitCursor() {
    var waitCursor = '<style id="waitCursor" type="text/css">'+
                        '*{cursor: wait !important;}'+
                    '</style>';
    $(document.head).append(waitCursor);
}

function removeWaitCursor() {
    $('#waitCursor').remove();
}

function centerPositionElement($target) {
    // to position elements in the center of the window i.e. for modals
    var $window      = $(window);
    var winHeight    = $window.height();
    var winWidth     = $window.width();
    var modalWidth   = $target.width();
    var modalHeight  = $target.height();
    var left         = ((winWidth - modalWidth) / 2);
    var top          = ((winHeight - modalHeight) / 2);

    $target.css({
        "left": left, 
        "top" : top
    });
}
