/**
    This file is where all the global variables go, as well as any
    document.ready functions. Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/

// =================================== Globals =================================
var gTableRowIndex = 1;
var gCurrentPageNumber = 0;
var gNumEntriesPerPage = 20;
var gResultSetId = 0;
var gNewCellWidth = 125;
var gKeyName = "";
var gMouseStatus = null;
var gDragObj = {};
var gRescol = {
    minCellHeight: 20,
    cellMinWidth: 30,
    first: true,
    clicks: 0,
    delay: 500,
    timer: null,
    lastCellGrabbed: false
};
var resrow = {};
var gScrollbarHeight = 8;
var gTempStyle = "";
var gMinTableWidth = 1200;
var gTableCols = []; // This is what we call setIndex on
var gUrlTableName;
var gTableName;
var gResultSetId;
var resultSetCount;
var gNumPages;

// ================================= Classes ==================================
var ProgCol = function() {
    this.index = -1;
    this.name = "New heading";
    this.type = "Object";
    this.func = {};
    this.width = 0;
    this.userStr = "";
    this.isDark = true;
    this.datasetId = 0;
};

// ================================ Misc ======================================
function infScrolling() {
  $("#mainFrame").scroll(function() {
        if ($(this).scrollTop() == 0 && 
            $('#autoGenTable tbody td:first').attr('id') != 'bodyr1c1') {
            console.log('the top!');
            var firstRow = $('#autoGenTable tbody tr:first');
            var initialTop = firstRow.offset().top;
            if ($("#autoGenTable tbody tr").length > 60) {
                var pageNumber = gCurrentPageNumber-1;
            } else {
                var pageNumber = gCurrentPageNumber;
            }
            goToPage(pageNumber, RowDirection.Top);
            $('#mainFrame').scrollTop(firstRow.offset().top - initialTop + 10);
            $("#autoGenTable tbody tr:gt(79)").remove();
        } else if ($(this)[0].scrollHeight - $(this).scrollTop()+
                    gScrollbarHeight - $(this).outerHeight() <= 1) {
            console.log('the bottom!');
            gTempStyle = $("#autoGenTable tbody tr:nth-last-child(1)").html();
            if ($('#autoGenTable tbody tr').length > 79) {
                // keep row length at 80
                $("#autoGenTable tbody tr:lt(20)").remove();
            }
            goToPage(gCurrentPageNumber+1, RowDirection.Bottom); 
        }
        generateFirstLastVisibleRowNum();
    });
}

// XXX: This function should disappear. But I need to be able to free the
// result sets
function loadMainContent(op) {
    if (window.location.pathname.search("cat_table.html") > -1) {
        freeAllResultSets();
    }
}

function loadLoad(op) {
    $("#loadArea").load('/'+op.concat('_r.html'));
}

function getUrlVars()
{
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?')
                 + 1).split('&');
    if (window.location.href.indexOf("?") < 0) {
        return [];
    }
    for(var i = 0; i < hashes.length; i++)
    {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function prelimFunctions() {
    setTabs();
    selectPage(1);
}

function setCatGlobals(table) {
    gUrlTableName = getUrlVars()["tablename"];
    gTableName = gUrlTableName || table;
    // XXX: Hack for faster testing
    // autoLoad();
    gResultSetId = XcalarGetTableId(gTableName);
    resultSetCount = XcalarGetCount(gTableName);
    gNumPages = Math.ceil(resultSetCount / gNumEntriesPerPage);
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);

// ========================== Document Ready ==================================

function documentReadyCommonFunction() {
    // XXX: TODO: FIXME: Break this function up into its various components,
    // and stick them into separate files.
    addColListeners(2); // set up listeners for json column

    if (typeof gTableName === 'undefined') {
        var searchText = "View Tables";
    } else {
        var searchText = gTableName;
    }

    $('#fnBar').on('input', function(e) {
        var selectedCell = $('th.selectedCell .editableHead');
        selectedCell.val($(this).val());
    });

    $('#fnBar').keyup(function(e) {
        var selectedCell = $('th.selectedCell .editableHead');
        if (e.which == 13) {
            selectedCell.trigger(e);
        }
    });

    $('#fnBar').mousedown(function() {
        var fnBar = $(this);
        // must activate mousedown after header's blur, hence delay
        setTimeout(selectCell, 1);
        function selectCell() {
            var selectedCell = $('th.selectedCell .editableHead');
            selectedCell.val(fnBar.val());
        }
        
    });

    $('#fnBar').blur(function() {
        var selectedCell = $('th.selectedCell .editableHead');
        var index = $('th.selectedCell').index();
        if (selectedCell.length !=0) {
            if (gTableCols[index-1].name.length > 0) {
                selectedCell.val(gTableCols[index-1].name);
            } 
        }
    });

    var resultTextLength = (""+resultSetCount).length;
    $('#rowInput').attr({'maxLength': resultTextLength,
                          'size': resultTextLength});
    $('#rowInput').keypress(function(e) {
        if (e.which === 13) {
            var row = $('#rowInput').val();
            if (row == "" || row%1 != 0) {
                return;
            } else if (row < 1) {
                $('#rowInput').val('1');
            } else if (row > resultSetCount) {
                $('#rowInput').val(resultSetCount);
            }
            row = parseInt($('#rowInput').val());
            // XXX: HACK
            gTempStyle = $("#autoGenTable tbody tr:nth-last-child(1)").html();
            $("#autoGenTable tbody").empty();

            if (((row)/gNumEntriesPerPage) >
                    Math.floor((resultSetCount/gNumEntriesPerPage)-2)) {
                //if row lives inside last 3 pages, prepare to display last 3 pages
                var pageNum = (resultSetCount-1)/gNumEntriesPerPage - 2;
            } else {
                var pageNum = row/gNumEntriesPerPage;
            }
            var numPagesToAdd = 3;
            for (var i = 0; i < numPagesToAdd; i++) {
                goToPage(Math.ceil(pageNum)+i);
            }

            positionScroll(row);
            generateFirstLastVisibleRowNum();
            movePageScroll(row);
            // $(this).blur(); 
        }
    });

    $('#pageBar > div:last-child').append('<span>of '+resultSetCount+'</span>');

    $(window).resize(function() {
        $('.colGrab').height($('#mainFrame').height());
        checkForScrollBar();
        generateFirstLastVisibleRowNum();
    });

    $('.closeJsonModal, #modalBackground').click(function(){
        if ($('#jsonModal').css('display') == 'block') {
            $('#modalBackground').hide(); 
            $('body').removeClass('hideScroll');
        }
        $('#jsonModal').hide();
       
    });

    $('#datastorePanel .menuAreaItem:first').click(function(){
        $("#loadArea").load('load_r.html', function(){
            // load_r.html contains load.js where this function is defined
            loadReadyFunction();
            $('#progressBar').css('transform', 'translateX(330px)');
            $('.dataStep').css('transform', 'translateX(320px)');
            $('.dataOptions').css('left',330).css('z-index', 6);
        });
        $('.datasetWrap').addClass('shiftRight');
    });

    $('#autoGenTable thead').mouseenter(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $('.dropdownBox').css('opacity', 0.4);
            $('.editableHead').addClass('resizeEditableHead');
        }
    })
    .mouseleave(function() {
        $('.dropdownBox').css('opacity', 0);
        $('.editableHead').removeClass('resizeEditableHead');
    });

    $('.worksheetTab').mousedown(function() {
        $('.worksheetTab').removeClass('tabSelected');
        $(this).addClass('tabSelected');
    });

    $('.worksheetTab input').each(function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    });

    $('.worksheetTab input').on('input', function() {
        var size = $(this).val().length;
        $(this).attr('size', size);
    }

     $('#newWorksheet span').click(function() {
        addWorksheetTab();
    });

    $("#shoppingCart").hide();

    $('#pageScroll').mousedown(function(event) {
        var mouseX = event.pageX - $(this).offset().left;
        var scrollWidth = $(this).outerWidth();
        var pageNum = Math.ceil((mouseX / scrollWidth) * resultSetCount);
        var rowInputNum = $("#rowInput").val();
        var e = $.Event("keypress");
        e.which = 13;
        $("#rowInput").val(pageNum).trigger(e);
        $("#rowInput").val(rowInputNum);
        $('#pageMarker').css('transform', 'translateX('+mouseX+'px)');
    });

    $('.jsonDragArea').mousedown(function(event){
        jsonModalMouseDown(event);
    });

    $(document).mousedown(function(event) {
        var target = $(event.target);
        var clickable = target.closest('.colMenu').length > 0;
        if (!clickable && !target.is('.dropdownBox')) {
                $('.colMenu').hide();
        }
        if (target.closest('.selectedCell').length == 0 && !target.is('#fnBar')) {
            $('.selectedCell').removeClass('selectedCell');
            $('#fnBar').val("");
        }
    });
    $(document).mousemove(function(event){
        if (gMouseStatus != null) {
            switch (gMouseStatus) {
                case ("resizingCol"):
                    if (gRescol.lastCellGrabbed) {
                        gRescolMouseMoveLast(event);
                    } else {
                        gRescolMouseMove(event);
                    }
                    break;
                case ("resizingRow"):
                    resrowMouseMove(event);
                    break;
                case ("movingCol"):
                    dragdropMouseMove(event);
                    break;
                case ("movingJson"):
                    jsonModalMouseMove(event);
                    break;
                default:  // do nothing
            }
        }
    });
    $(document).mouseup(function(event){
        if (gMouseStatus != null) {
            switch (gMouseStatus) {
                case ("resizingCol"):
                    gRescolMouseUp();
                    break;
                case ("resizingRow"):
                    resrowMouseUp();
                    break;
                case ("movingCol"):
                    dragdropMouseUp();
                    break;
                case ("movingJson"):
                    jsonModalMouseUp();
                    break;
                default: // do nothing
            }
        }
    }); 
}

function documentReadyCatFunction() {
    documentReadyCommonFunction();
    // getTablesAndDatasets();  //XXX this is being called before documentreadycatfunction gets called

    var index = getIndex(gTableName);
    getNextPage(gResultSetId, true);
    if (index) {
        gTableCols = index;
        console.log("Stored "+gTableName);
        // XXX Move this into getPage
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(gResultSetId,
                                           gNumEntriesPerPage);
        gKeyName = tableOfEntries.keysAttrHeader.name;
        console.log(index);
        for (var i = 0; i<index.length; i++) {
            if (index[i].name != "DATA") {
                addCol("headCol"+(index[i].index-1), index[i].name,
                      {width: index[i].width,
                       isDark: index[i].isDark,
                       progCol:index[i]});
            } else {
                $("#headCol"+(index[i].index+1)).css("width", 
                    index[i].width);
            }
        }
    } else {
        console.log("Not stored "+gTableName);
    }    

}

function startupFunctions(table) {
    readFromStorage();
    setCatGlobals(table);
    menuBarArt();
    menuAreaClose();
    getTablesAndDatasets();
    documentReadyCatFunction();

    fillPageWithBlankCol();
    goToPage(gCurrentPageNumber+1);
    goToPage(gCurrentPageNumber+1);
    generateFirstLastVisibleRowNum();
    cloneTableHeader();   
    infScrolling();
    // if (getUrlVars().length == 0) {
    //     $('#autoGenTable th, #autoGenTable td').empty();
    //     $('.rowNum').text('-');
    //     $('#pageInput').next().remove();
    //     $('#searchBar').val('');
    // }
    checkForScrollBar();
    setWorksheetNames();
}        

function documentReadyIndexFunction() {
    $(document).ready(function() {
       startupFunctions("gdelt"); 
    });
}

function parseJsonValue(value) {
    if (value == undefined) {
        value = '<span class="undefined">'+value+'</span>';
    } else {
        switch (value.constructor) {
        case (Object):
            if ($.isEmptyObject(value)) {
                value = "";
            } else {
                value = JSON.stringify(value).replace(/,/g, ", ");
            }
            break;
        case (Array):
            value = value.join(', ');
            break;
        default: // leave value as is;
        }
    }
    return (value);
}

function movePageScroll(pageNum) {
    var pct = (pageNum/resultSetCount);
    var dist = Math.floor(pct*$('#pageScroll').width());
    $('#pageMarker').css('transform', 'translateX('+dist+'px)');
}

function checkForScrollBar() {
    var tableWidth = $('#autoGenTable').width()+
        parseInt($('#autoGenTable').css('margin-left'));
    if (tableWidth > $(window).width()) {
        gScrollbarHeight = 8;
    } else {
        gScrollbarHeight = 0;
    }
}

function positionScroll(row) {
    var canScroll = true;
    var theadHeight = $('#autoGenTable thead').height();
    function positionScrollToRow() {
        var tdTop = $('#bodyr'+row+'c1')[0].offsetTop;
        var scrollPos = Math.max((tdTop-theadHeight), 1);
        if (canScroll && scrollPos > 
                ($('#autoGenTable').height() - $('#mainFrame').height())) {
            canScroll = false;
        }
        $('#mainFrame').scrollTop(scrollPos);
    }
    
    positionScrollToRow();
    if (!canScroll) {
        // this means we can't scroll to page without moving scrollbar all the
        // way to the bottom, which triggers another getpage and thus we must
        // try to position the scrollbar to the proper row again
        setTimeout(positionScrollToRow, 1);
    }
}


//XXX remove this for production. I updated load_r.html
// but the jquery load function loads the old load_r.html 
// unless I use ajaxSetup cache: false;
$.ajaxSetup ({
    // Disable caching of AJAX responses
    cache: false
});
