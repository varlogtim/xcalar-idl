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
    lastCellGrabbed: false,
    minNumRows: 60,
    maxNumRows: 80
};
var resrow = {};
var gScrollbarHeight = 8;
var gTempStyle = "";
//XX we will no longer have a minimum table width
var gMinTableWidth = 500;
var gTableCols = []; // This is what we call setIndex on
var gUrlTableName;
var gTableName;
var gResultSetId;
var resultSetCount;
var gNumPages;
var gFnBarOrigin;
var gActiveTableNum; // The table that is currently in focus

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
function infScrolling(tableNum) {
    $("#autoGenTableWrap"+tableNum).scroll(function() {
        if ($(this).scrollTop() === 0 && 
            $('#autoGenTable'+tableNum+' tbody tr:first').attr('class') != 
            'row0') {
                console.log('the top!');
                var firstRow = $('#autoGenTable'+tableNum+' tbody tr:first');
                var initialTop = firstRow.offset().top;
                if ($("#autoGenTable"+tableNum+" tbody tr").length > 60) {
                    var pageNumber = gCurrentPageNumber-1;
                } else {
                    var pageNumber = gCurrentPageNumber;
                }
                goToPage(pageNumber, RowDirection.Top, tableNum);
                $('#autoGenTableWrap'+tableNum).scrollTop(firstRow.offset().top - 
                    initialTop + 10);
                $("#autoGenTable"+tableNum+" tbody tr:gt(79)").remove();
        } else if ($(this)[0].scrollHeight - $(this).scrollTop()+
                    gScrollbarHeight - $(this).outerHeight() <= 1) {
            gTempStyle = $("#autoGenTable"+tableNum+" tbody tr:last").html();
            if ($('#autoGenTable'+tableNum+' tbody tr').length >= 80) {
                // keep row length at 80
                $('#autoGenTable'+tableNum+' tbody tr:lt(20)').remove();
            }
            goToPage(gCurrentPageNumber+1, RowDirection.Bottom, tableNum); 
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

function getUrlVars() {
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

function documentReadyAutoGenTableFunction(tableNum) {
    if (tableNum != 0) {
        return;
    }

    var dataTh = $('#autoGenTable'+tableNum).find('.dataCol').closest('th');
    var dataIndex = parseColNum(dataTh);
    addColListeners(dataIndex, "autoGenTable"+tableNum); // set up listeners for data column

    var resultTextLength = (""+resultSetCount).length;
    $('#rowInput').attr({'maxLength': resultTextLength,
                          'size': resultTextLength});

    $('#rowInput').keypress(function(e) {
        if (e.which !== keyCode.Enter) {
            return;
        }
        var row = $('#rowInput').val();
        var tableNum = 0;
        //XXX detect which table the user means to target
        if (row == "" || row%1 != 0) {
            return;
        } else if (row < 1) {
            $('#rowInput').val('1');
        } else if (row > resultSetCount) {
            $('#rowInput').val(resultSetCount);
        }
        row = parseInt($('#rowInput').val());
        // XXX: HACK
        gTempStyle = $("#autoGenTable"+tableNum+" tbody tr:nth-last-child(1)").html();
        $("#autoGenTable"+tableNum+" tbody").empty();

        if (((row)/gNumEntriesPerPage) >
                Math.floor((resultSetCount/gNumEntriesPerPage)-2)) {
            //if row lives inside last 3 pages, prepare to display last 3 pages
            var pageNum = (resultSetCount-1)/gNumEntriesPerPage - 2;
        } else {
            var pageNum = row/gNumEntriesPerPage;
        }
        var numPagesToAdd = 3;
        for (var i = 0; i < numPagesToAdd; i++) {
            goToPage(Math.ceil(pageNum)+i, null, tableNum);
        }

        positionScrollbar(row, tableNum);
        generateFirstLastVisibleRowNum();
        moverowScroller(row);
        // $(this).blur(); 
    });

    $('#pageBar > div:last-child').append('<span>of '+resultSetCount+'</span>');

    $('.autoGenTable thead').mouseenter(function(event) {
        if (!$(event.target).hasClass('colGrab')) {
            $('.dropdownBox').css('opacity', 0.4);
        }
    })
    .mouseleave(function() {
        $('.dropdownBox').css('opacity', 0);
    });

    $('#rowScroller').mousedown(function(event) {
        var mouseX = event.pageX - $(this).offset().left;
        $('#rowMarker').css('transform', 'translateX('+mouseX+'px)');
        var scrollWidth = $(this).outerWidth();
        var pageNum = Math.ceil((mouseX / scrollWidth) * resultSetCount);
        var rowInputNum = $("#rowInput").val();
        var e = $.Event("keypress");
        e.which = keyCode.Enter;
        $("#rowInput").val(pageNum).trigger(e);
        // $("#rowInput").val(rowInputNum);
    });
}

function documentReadyGeneralFunction() {
    $(window).on('beforeunload', function() {
        commitToStorage();
    }); 

    $(window).resize(function() {
        $('.colGrab').height($('.autoGenTableWrap0').height());
        checkForScrollBar(0);
        generateFirstLastVisibleRowNum();
    });

    $('#fnBar').on('input', function(e) {
        if ($(".scratchpad").has(gFnBarOrigin).length != 0 &&
            $(this).val().indexOf("=") == 0) {
            enterEquationMode();
        }
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
        }
    });

    $('#fnBar').keyup(function(e) {
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
            gFnBarOrigin.trigger(e);
        }
        if (e.which == keyCode.Enter) {
            $(this).blur();
        }
    });

    $('#fnBar').mousedown(function() {
        var fnBar = $(this);
        // must activate mousedown after header's blur, hence delay
        setTimeout(selectCell, 1);
        function selectCell() {
            // console.log($(".scratchpad").has(gFnBarOrigin))
            if ($(".scratchpad").has(gFnBarOrigin).length == 0) {
                if (gFnBarOrigin) {
                    console.log(fnBar.val());
                    // gFnBarOrigin.val(fnBar.val());



                    var index = parseColNum(gFnBarOrigin);
                    var tableNum = parseInt(gFnBarOrigin.closest('table')
                        .attr('id').substring(12)); 
                    if (gTableCols[tableNum][index-1].userStr.length > 0) {
                        gFnBarOrigin.val(gTableCols[tableNum][index-1].userStr);
                    }
                    
                }
            }
        }
    });

    $('#fnBar').blur(function() {
        console.log("Here");
        if ($(".scratchpad").has(gFnBarOrigin).length != 0) {
        } else {
            console.log('blurring')
            var selectedCell = $('th.selectedCell .editableHead');
            var index = $('th.selectedCell').index();
            // if (gFnBarOrigin.length !=0) {
            if (!gFnBarOrigin && selectedCell.length !=0) {
                var tableNum = parseInt($('.selectedCell').closest('table')
                .attr('id').substring(12));
                if (gTableCols[tableNum][index-1].name.length > 0) {
                    gFnBarOrigin.val(gTableCols[tableNum][index-1].name);
                } 
            }
        }
         // $('#fnBar').val("");
         // setTimeout(function(){gFnBarOrigin = undefined;},1);
         
    });

    $('.closeJsonModal, #modalBackground').click(function(){
        if ($('#jsonModal').css('display') == 'block') {
            $('#modalBackground').hide(); 
            $('body').removeClass('hideScroll');
        }
        $('#jsonModal').hide();
       
    });

    $('.jsonDragArea').mousedown(function(event){
        jsonModalMouseDown(event);
    });

    $('#datastorePanel .menuAreaItem:first').click(function(){
        $("#loadArea").load('load_r.html', function(){
            // load_r.html contains load.js where this function is defined
            loadReadyFunction();
            setTimeout(function() {
                $('#progressBar').css('transform', 'translateX(330px)');
                $('.dataStep').css('transform', 'translateX(320px)');
                $('.dataOptions').css({'transform':'translateX(570px)', 
                    'z-index': 6});
            }, 1);
        });
        $('.datasetWrap').addClass('slideAway');
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
    });

     $('#newWorksheet span').click(function() {
        addWorksheetTab();
        shoppingCart();
        $('#modalBackground').show();
    });

    $("#shoppingCart").hide();
    scratchpadStartup(); 

    $(document).mousedown(function(event) {
        var target = $(event.target);
        var clickable = target.closest('.colMenu').length > 0;
        if (!clickable && !target.is('.dropdownBox')) {
                $('.colMenu').hide();
        }
        if (target.closest('.selectedCell').length == 0 && !target.is('#fnBar')
            && (!equationCellRow)) {
            $('.selectedCell').removeClass('selectedCell');
            gFnBarOrigin = undefined;    
            $('#fnBar').val("");
        }
    });
    $(document).mousemove(function(event){
        if (gMouseStatus == null) {
            return;
        }
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
    });
    $(document).mouseup(function(event){
        if (gMouseStatus == null) {
            return;
        }
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
    });
}

function documentReadyCatFunction(tableNum) {

    var index = getIndex(gTableName);
    getNextPage(gResultSetId, true, tableNum);
    if (index) {
        gTableCols[tableNum] = index;
        console.log("Stored "+gTableName);
        // XXX Move this into getPage
        // XXX API: 0105
        var tableOfEntries = XcalarGetNextPage(gResultSetId,
                                           gNumEntriesPerPage);
        gKeyName = tableOfEntries.keysAttrHeader.name;
        for (var i = 0; i<index.length; i++) {
            if (index[i].name != "DATA") {
                addCol("col"+(index[i].index-1), 
                        "autoGenTable"+tableNum, 
                        index[i].name,
                      {width: index[i].width,
                       isDark: index[i].isDark,
                       progCol:index[i]});
            } else {
                $("#autoGenTable"+tableNum+" .table_title_bg.col"+
                    (index[i].index))
                    .css("width",index[i].width);
            }
        }
    } else {
        console.log("Not stored "+gTableName);
    }    

}

function startupFunctions() {
    readFromStorage();
    menuBarArt();
    menuAreaClose();
    getTablesAndDatasets();
    documentReadyGeneralFunction();
    getWorksheetNames();
}  

function tableStartupFunctions(table, tableNum) {
    gTableCols[tableNum] = [];
    setCatGlobals(table);
    documentReadyAutoGenTableFunction(tableNum);
    documentReadyCatFunction(tableNum);
    fillPageWithBlankCol(tableNum);
    goToPage(gCurrentPageNumber+1, null, tableNum);
    goToPage(gCurrentPageNumber+1, null, tableNum);
    generateFirstLastVisibleRowNum();
    cloneTableHeader(tableNum);
    resizeForMultipleTables(tableNum);
    infScrolling(tableNum);
    checkForScrollBar(tableNum);
}      

function documentReadyIndexFunction() {
    $(document).ready(function() {
        startupFunctions(); 
        if (XcalarGetTables().numTables == 0) {
            generateBlankTable();
        } else {
            //XXX loop through datasets and call tableStartUpFunctions
            tableStartupFunctions("gdelt", 0);
            // tableStartupFunctions("sp500", 1); 
            // tableStartupFunctions("sp500", 2); 
        }
        
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

//XXX remove this for production. I updated load_r.html
// but the jquery load function loads the old load_r.html 
// unless I use ajaxSetup cache: false;
$.ajaxSetup ({
    // Disable caching of AJAX responses
    cache: false
});
