/**
    This file is where all the global variables go, as well as any
    document.ready functions. Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/

// =================================== Globals =================================
var gNumEntriesPerPage = 20;
var gNewCellWidth = 125;
var gMouseStatus = null;
var gDragObj = {};
var gRescol = {
    minCellHeight: 30,
    cellMinWidth: 20,
    first: true,
    clicks: 0,
    delay: 500,
    timer: null,
    lastCellGrabbed: false,
    minNumRows: 60,
    maxNumRows: 80
};
var gResrow = {};
var gScrollbarHeight = 8;
var gTempStyle = ""; // XXX
var gMinTableWidth = 30;
var gTables = []; // This is the main global array containing structures
                  // Stores TableMeta structs
var gHiddenTables = [];
var gFnBarOrigin;
var gActiveTableNum = 0; // The table that is currently in focus
var gDSObj = {};    //obj for DS folder structure
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

var TableMeta = function() {
    this.tableCols = undefined;
    this.currentPageNumber = -1;
    this.resultSetId = -1;
    this.keyName = "";
    this.backTableName = "";
    this.frontTableName = "";
    this.resultSetCount = -1;
    this.numPages = -1;
    this.bookmarks = [];
}
// ================================ Misc ======================================
function infScrolling(tableNum) {

    $("#xcTbodyWrap"+tableNum).scroll(function() {
        if (gMouseStatus == "movingTable") {
            return;
        }
        var dynTableNum = parseInt($(this).attr("id")
                           .substring("xcTbodyWrap".length));
        focusTable(dynTableNum);
        var table = $('#xcTable'+dynTableNum);
        if (table.height() < $('#mainFrame').height()) {
            // prevent scrolling on a short table
           $(this).scrollTop(0);
        }

        var innerDeferred = jQuery.Deferred();
        var firstRow = table.find('tbody tr:first');
        if (firstRow.length === 0) {
            innerDeferred.resolve();
        } else if ($(this).scrollTop() === 0 && 
            table.find('tbody tr:first').attr('class') != 'row0') {

            // console.log('the top!');
            var initialTop = firstRow.offset().top;
            if (table.find("tbody tr").length > 60) {
                var pageNumber = gTables[dynTableNum].currentPageNumber-1;
            } else {
                var pageNumber = gTables[dynTableNum].currentPageNumber;
            }

            goToPage(pageNumber, RowDirection.Top, dynTableNum)
            .done(function() {
                $('#xcTbodyWrap'+dynTableNum)
                    .scrollTop(firstRow.offset().top - initialTop + 10);
                table.find("tbody tr:gt(79)").remove();

                innerDeferred.resolve();
            });
        } else if ($(this)[0].scrollHeight - $(this).scrollTop() -
                   $(this).outerHeight() <= 1) {
            // console.log('the bottom!');
            gTempStyle = table.find("tbody tr:last").html();
            if (table.find('tbody tr').length >= 80) {
                // keep row length at 80
                table.find('tbody tr:lt(20)').remove();
            }
            goToPage(gTables[dynTableNum].currentPageNumber+1,
                     RowDirection.Bottom, dynTableNum)
            .done(innerDeferred.resolve);
        }

        innerDeferred
        .done(function() {
            var rowScrollerMove = true;
            generateFirstLastVisibleRowNum(rowScrollerMove);
            updatePageBar(dynTableNum);
        });
    });
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

function setTableMeta(table) {
    var deferred = jQuery.Deferred();

    var urlTableName = getUrlVars()["tablename"];
    var tableName = urlTableName || table;
    var newTable = new TableMeta();
    newTable.tableCols = [];
    newTable.currentPageNumber = 0;

    XcalarMakeResultSetFromTable(tableName)
    .then(function(resultSet) {
        newTable.resultSetId = resultSet.resultSetId;
        return (XcalarGetCount(tableName));
    })
    .done(function(totEntries) {
        newTable.resultSetCount = totEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.backTableName = tableName;
        newTable.frontTableName = tableName;

        deferred.resolve(newTable);
    });

    return (deferred.promise());
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);

function setupFunctionBar() {
     var functionbar = $('#fnBar');

    functionbar.on('input', function(e) {
        if ($(".scratchpad").has(gFnBarOrigin).length != 0 &&
            $(this).val().indexOf("=") == 0) {
            enterEquationMode();
        }
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
        }
    });

    functionbar.keyup(function(e) {
        if (gFnBarOrigin) {
            gFnBarOrigin.val($(this).val());
            gFnBarOrigin.trigger(e);
        }
        if (e.which == keyCode.Enter) {
            $(this).blur();
        }
    });

    functionbar.mousedown(function() {
        var fnBar = $(this);
        // must activate mousedown after header's blur, hence delay
        setTimeout(selectCell, 0);

        function selectCell() {
            if ($(".scratchpad").has(gFnBarOrigin).length == 0 
                && gFnBarOrigin) {

                var index = parseColNum(gFnBarOrigin);
                var tableNum = parseInt(gFnBarOrigin.closest('.tableWrap')
                    .attr('id').substring(11)); 
                if (gTables[tableNum].tableCols[index-1].userStr.length > 0) {
                    gFnBarOrigin.val(gTables[tableNum].tableCols[index-1]
                                     .userStr);
                } 
            }
        }
    });

    functionbar.blur(function() {
        if ($(".scratchpad").has(gFnBarOrigin).length != 0) {
        } else {
            // console.log('blurring')
            var selectedCell = $('.xcTableWrap th.selectedCell .editableHead');
            var index = $('th.selectedCell').index();
            // if (gFnBarOrigin.length !=0) {
            if (gFnBarOrigin && selectedCell.length !=0) {
                var tableNum = parseInt($('.selectedCell').closest('.tableWrap')
                .attr('id').substring(11));
                // console.log(tableNum)
                if (gTables[tableNum].tableCols[index-1].name.length > 0) {
                    displayShortenedHeaderName(gFnBarOrigin, tableNum, index); 
                } 
            }
        }
    });
}

function setupHiddenTable() {
    var deferred = jQuery.Deferred();

    setTableMeta(table)
    .done(function(newTableMeta) {
        gHiddenTables.push(newTableMeta); 
        var lastIndex = gHiddenTables.length - 1;
        var index = getIndex(gHiddenTables[lastIndex].frontTableName);
        if (index && index.length > 0) {
            gHiddenTables[lastIndex].tableCols = index;
        } else {
            console.log("Not stored "+gHiddenTables[lastIndex].frontTableName);
        }  

        deferred.resolve();
    });

    return (deferred.promise());
}

function mainPanelsTabing() {
    $(".mainMenuTab").click(function() {
        $(".mainMenuTab").removeClass("active");
        $(this).addClass("active");
        switch ($(this).attr("id")) {
        case ("workspaceTab"):
            $(".underConstruction").hide().removeClass("active");
            $("#datastoreView").hide().removeClass("active");
            if ($("#workspacePanel").css("display") == "none") {
                $("#workspacePanel").show().addClass("active");
            } 
            break;
        case ("dataStoresTab"):
            $(".underConstruction").hide().removeClass("active");
            $(".mainPanel").hide().removeClass("active");
            $("#datastoreView").show().addClass("active");
            break;
        default:
            $("#datastoreView").hide().removeClass("active");
            $(".mainPanel").hide().removeClass("active");
            $(".underConstruction").show().addClass("active");
        }
    });
    $("#workspaceTab").click();
}

function setupLogout() {
    $("#userNamePopout").css("top", $("#userName").position().top+
                                           $("#userName").height());
    $("#userNamePopout").css("left",
        $("#userName").position().left + $("#userName").width()/2 -
        $("#userNamePopout").width()/2);
    $("#userNamePopout").hide();
    $("#userName").click(function() {
        $("#userNamePopout").toggle();
    });
    $("#signout").click(function() {
        window.location = "dologout.html";
    });
}

function setupTooltips() {
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]',
        delay: 100
    });    
}

function setupWorksheetMeta() {
    var d = new Date();
    var day = d.getDate();
    var month = d.getMonth()+1;
    var year = d.getFullYear();
    $("#workspaceDate").text("Created on "+day+"-"+month+"-"+year);
}

// ========================== Document Ready ==================================

function documentReadyxcTableFunction() {
    focusTable(0);
    resizeRowInput();

    $('#rowInput').keypress(function(e) {
        if (e.which !== keyCode.Enter) {
            return;
        }
        var row = $('#rowInput').val();
        //XXX detect which table the user means to target
        if (row == "" || row%1 != 0) {
            return;
        } else if (row < 1) {
            $('#rowInput').val('1');
        } else if (row > gTables[gActiveTableNum].resultSetCount) {
            $('#rowInput').val(gTables[gActiveTableNum].resultSetCount);
        }
        row = parseInt($('#rowInput').val());
        // XXX: HACK
        gTempStyle = $("#xcTable"+gActiveTableNum+" tbody tr:nth-last-child(1)")
                     .html();
        $("#xcTable"+gActiveTableNum+" tbody").empty();

        if ((row/gNumEntriesPerPage) >
                Math.floor((gTables[gActiveTableNum].resultSetCount/
                            gNumEntriesPerPage)-2)) {
            //if row lives inside last 3 pages, prepare to display last 3 pages
            var pageNum = (gTables[gActiveTableNum].resultSetCount-1)/
                           gNumEntriesPerPage - 2;
        } else {
            var pageNum = row/gNumEntriesPerPage;
        }
        if (pageNum < 0) {
            pageNum = 0;
        }
        var numPagesToAdd = 3;

        var promises = [];
        for (var i = 0; i < numPagesToAdd; i++) {
            promises.push(goToPage.bind(this, Math.ceil(pageNum)+i, 
                                        null, gActiveTableNum));
        }

        chain(promises)
        .done(function() {
            adjustColGrabHeight(gActiveTableNum);
            positionScrollbar(row, gActiveTableNum);
            generateFirstLastVisibleRowNum();
            if (!e.rowScrollerMousedown) {
                moverowScroller(row, gTables[gActiveTableNum].resultSetCount);
            }
        });
        
        // $(this).blur(); 
    });
    generateFirstLastVisibleRowNum();
    var num = Number(gTables[gActiveTableNum].resultSetCount).
                    toLocaleString('en');
    $('#numPages').text('of '+num);
}

function documentReadyGeneralFunction() {
    $(window).on('beforeunload', function() {
        commitToStorage();
    }); 

    var timer;
    $(window).resize(function() {
        $('.colGrab').height(30);
        clearTimeout(timer);
        timer = setTimeout(function () { 
            var i = 0;
            $('.xcTable').each(function() {
                adjustColGrabHeight(i);
                i++;
            });
        }, 100 );
        checkForScrollBar(0);
        generateFirstLastVisibleRowNum();
    });

    //XXX using this to keep window from scrolling on dragdrop
    $(window).scroll(function() {
        $(this).scrollLeft(0);
    })

    $('.closeJsonModal, #modalBackground').click(function() {
        if ($('#jsonModal').css('display') == 'block') {
            $('#modalBackground').hide(); 
            $('body').removeClass('hideScroll');
        }
        $('#jsonModal').hide();
    });

    $('.jsonDragArea').mousedown(function(event) {
        jsonModalMouseDown(event);
    });

    $(document).mousedown(function(event) {
        var target = $(event.target);
        var clickable = target.closest('.colMenu').length > 0;
        if (!clickable && !target.is('.dropdownBox')) {
                $('.colMenu').hide();
                $('.xcTheadWrap').css('z-index', '9');
        }
        if (target.closest('.selectedCell').length == 0 
            && target.closest('#scratchpadArea').length == 0
            && !target.is('#fnBar')
            && (!equationCellRow)) {
            setTimeout(function() {
                $('.selectedCell').removeClass('selectedCell');
                gFnBarOrigin = undefined;
            }, 1);
            
            $('#fnBar').val("");
        }
    });
    $(document).mousemove(function(event) {
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
                gResrowMouseMove(event);
                break;
            case ("movingTable"):
                dragTableMouseMove(event);
                break;
            case ("movingCol"):
                dragdropMouseMove(event);
                break;
            case ("movingJson"):
                jsonModalMouseMove(event);
                break;
            case ("rowScroller"): 
                rowScrollerMouseMove(event);
            default:  // do nothing
        }
    });
    $(document).mouseup(function(event) {
        if (gMouseStatus == null) {
            return;
        }
        switch (gMouseStatus) {
            case ("resizingCol"):
                gRescolMouseUp();
                break;
            case ("resizingRow"):
                gResrowMouseUp();
                break;
            case ("movingTable"):
                    dragTableMouseUp();
                    break;
            case ("movingCol"):
                dragdropMouseUp();
                break;
            case ("movingJson"):
                jsonModalMouseUp();
                break;
            case ("rowScroller"):
                rowScrollerMouseUp();
            default: // do nothing
        }
    });
}


function documentReadyCatFunction(tableNum) {
    var deferred = jQuery.Deferred();
    
    var index = getIndex(gTables[tableNum].frontTableName);
    var notIndexed = !(index && index.length > 0);
    var firstTime = true; // first time we're loading this table since page load
    
    getNextPage(gTables[tableNum].resultSetId, firstTime, tableNum, notIndexed)
    .then(function(jsonData) {
        if (notIndexed) { // getNextPage will setupProgCols
            index = gTables[tableNum].tableCols;
        }
        return (buildInitialTable(index, tableNum, jsonData));
    })
    .done(deferred.resolve);

    return (deferred.promise());
}

function startupFunctions() {
    var deferred = jQuery.Deferred();

    readFromStorage()
    .then(function() {
        documentReadyGeneralFunction();
        setupRightSideBar();
        setupLogout();
        return (setupDatasetList());
    })
    .then(function() {
        setupTooltips();
        mainPanelsTabing();
        setupFunctionBar();
        scratchpadStartup(); 
        setupDSCartButtons();
        setupImportDSForm();
        setupBookmarkArea();
        setupWorksheetMeta();
        return (updateDatasetInfoFields("Datasets", IsActive.Active));
    })
    .done(function() {
        setupDag();
        deferred.resolve();
    });

    return (deferred.promise());
}  

function tableStartupFunctions(table, tableNum) {
    var deferred = jQuery.Deferred();

    setTableMeta(table)
    .then(function(newTableMeta) {
        gTables[tableNum] = newTableMeta;
        return (documentReadyCatFunction(tableNum));
    })
    .then(function(val) {
        return goToPage(gTables[tableNum].currentPageNumber+1, null, tableNum)
        .then(goToPage(gTables[tableNum].currentPageNumber+1, null, tableNum));
    })
    .done(function(val) {
        focusTable(tableNum);
        var dataCol = $('#xcTable'+tableNum+' tr:eq(0) th.dataCol');
        addColListeners(parseColNum(dataCol), $("#xcTable"+tableNum));
        generateFirstLastVisibleRowNum();
        infScrolling(tableNum);
        checkForScrollBar(tableNum);
        resizeRowInput();

        deferred.resolve();
    });

    return (deferred.promise());
}    

function documentReadyIndexFunction() {
    function initializeTable() {
        var deferred = jQuery.Deferred();

        if ($.isEmptyObject(gTableIndicesLookup)) {
            $('#mainFrame').addClass('empty');

            deferred.resolve();
        } else {
            var promises = [];

            for (var i = 0; i < gTableOrderLookup.length; i++) {
                promises.push(addTable(gTableOrderLookup[i], i));
            }
            for (table in gTableIndicesLookup) {
                if (!gTableIndicesLookup[table].active) {
                    promises.push(setupHiddenTable(table));
                }
            }

            jQuery.when.apply(jQuery, promises)
            .done(function() {
                if (gTableOrderLookup.length > 0) {
                    documentReadyxcTableFunction();
                } else {
                    $('#mainFrame').addClass('empty');
                }

                deferred.resolve();
            });
        }

        return (deferred.promise());
    }  

    $(document).ready(function() {
        startupFunctions()
        .then(initializeTable)
        .done(function() {
            setuptableListSection();
            initializeJoinModal();
        }); 
    });
}