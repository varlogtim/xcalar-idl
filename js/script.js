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
var gMinTableWidth = 30;
var gTables = []; // This is the main global array containing structures
                  // Stores TableMeta structs
var gHiddenTables = [];
var gFnBarOrigin;
var gActiveTableNum = 0; // The table that is currently in focus
var gDSObj = {};    //obj for DS folder structure
var gRetinaObj = {}; //obj for retina modal
var gLastClickTarget = $(window); // track which element was last clicked
// ================================= Classes ==================================
var ProgCol = function() {
    this.index = -1;
    this.name = "New heading";
    this.type = "undefined";
    this.func = {};
    this.width = 0;
    this.userStr = "";
    this.isDark = true;
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
            if (table.find("tbody tr").length > 40) {
                var pageNumber = gTables[dynTableNum].currentPageNumber-1;
            } else {
                var pageNumber = gTables[dynTableNum].currentPageNumber;
            }

            goToPage(pageNumber, RowDirection.Top, dynTableNum)
            .then(function() {
                $('#xcTbodyWrap'+dynTableNum)
                    .scrollTop(firstRow.offset().top - initialTop + 10);
                table.find("tbody tr:gt(59)").remove();

                innerDeferred.resolve();
            })
            .fail(function(error) {
                innerDeferred.reject(error);
            });
        } else if ($(this)[0].scrollHeight - $(this).scrollTop() -
                   $(this).outerHeight() <= 1) {
            // console.log('the bottom!');
            if (table.find('tbody tr').length >= 60) {
                // keep number of rows at 60
                table.find('tbody tr:lt(20)').remove();
            }
            goToPage(gTables[dynTableNum].currentPageNumber+1,
                     RowDirection.Bottom, dynTableNum)
            .then(innerDeferred.resolve)
            .fail(function(error) {
                innerDeferred.reject(error);
            });
        } else {
            innerDeferred.resolve();
        }

        innerDeferred
        .then(function() {
            var rowScrollerMove = true;
            generateFirstVisibleRowNum(rowScrollerMove);
            updatePageBar(dynTableNum);
        })
        .fail(function(error) {
            console.log("Scroll Fails!");
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
    .then(function(totEntries) {
        newTable.resultSetCount = totEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.backTableName = tableName;
        newTable.frontTableName = tableName;

        deferred.resolve(newTable);
    })
    .fail(function(error){
        console.log("setTableMeta Fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function setupFunctionBar() {
    var $fnBar = $('#fnBar');

    $fnBar.on({
        "input": function() {
            if ($(".scratchpad").has(gFnBarOrigin).length != 0 &&
                $(this).val().indexOf("=") == 0) {
                enterEquationMode();
            }
        },
        "keyup": function(event) {
            if (event.which == keyCode.Enter) {
                functionBarEnter(gFnBarOrigin);
                $(this).blur().addClass('entered');
            }
        },
        "mousedown": function() {
            $(this).addClass('inFocus');
        },
        "blur": function() {
            $(this).removeClass('inFocus');
        }
    });
}

function setupHiddenTable(table) {
    var deferred = jQuery.Deferred();
    setTableMeta(table)
    .then(function(newTableMeta) {
        gHiddenTables.push(newTableMeta); 
        var lastIndex = gHiddenTables.length - 1;
        var index = getIndex(gHiddenTables[lastIndex].frontTableName);
        if (index && index.length > 0) {
            gHiddenTables[lastIndex].tableCols = index;
        } else {
            console.log("Not stored "+gHiddenTables[lastIndex].frontTableName);
        }  

        deferred.resolve();
    })
    .fail(function(error) {
        console.log("setupHiddenTable fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function mainPanelsTabbing() {
    $(".mainMenuTab").click(function() {
        $(".mainMenuTab").removeClass("active");
        $(this).addClass("active");
        switch ($(this).attr("id")) {
        case ("workspaceTab"):
            $(".underConstruction").hide().removeClass("active");
            $("#datastoreView").hide().removeClass("active");
            if ($("#workspacePanel").css("display") == "none") {
                $("#workspacePanel").show().addClass("active");
                var numTables = gTables.length;
                for (var i = 0; i < numTables; i++) {
                    adjustColGrabHeight(i);
                    matchHeaderSizes(null, $('#xcTable'+i)); 
                }
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
        StatusMessage.updateLocation();
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
        delay: {"show" : 200, "hide" : 100}
    });

    $("body").on('mouseenter', '[data-toggle="tooltip"]', function() {
        $('.tooltip').hide();
    });    
}

function setupWorksheetMeta() {
    var d = new Date();
    var day = d.getDate();
    var month = d.getMonth()+1;
    var year = d.getFullYear();
    $("#workspaceDate").text("Created on "+month+"-"+day+"-"+year);
}

// ========================== Document Ready ==================================

function documentReadyxcTableFunction() {
    resizeRowInput();

    $('#rowInput').keypress(function(e) {
        if (e.which !== keyCode.Enter) {
            return;
        }
        var row = $('#rowInput').val();

        if (row == "" || row%1 != 0) {
            return;
        }
        if (gTables[gActiveTableNum].resultSetCount == 0) {
            $('#rowInput').val('0');
            return;
        } else if (row < 1) {
            
            $('#rowInput').val('1');
        } else if (row > gTables[gActiveTableNum].resultSetCount) {
            $('#rowInput').val(gTables[gActiveTableNum].resultSetCount);
        }
        row = parseInt($('#rowInput').val());

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
        var skipToRow = true;
        goToPage(Math.ceil(pageNum), RowDirection.Bottom, gActiveTableNum, 
                 skipToRow)
        .then(function() {
            adjustColGrabHeight(gActiveTableNum);
            positionScrollbar(row, gActiveTableNum);
            generateFirstVisibleRowNum();
            if (!e.rowScrollerMousedown) {
                moverowScroller(row, gTables[gActiveTableNum].resultSetCount);
            }
        });
        
        // $(this).blur(); 
    });
    generateFirstVisibleRowNum();
    var num = Number(gTables[gActiveTableNum].resultSetCount).
                    toLocaleString('en');
    $('#numPages').text('of '+num);
}

function documentReadyGeneralFunction() {
    $(window).on('beforeunload', function() {
        commitToStorage();
        freeAllResultSets();
        // XXX As it blocks the UI, better to add a progress bar in the future
        sleep("500ms");
    }); 

    var timer;
    $(window).resize(function() {
        $('#mainFrame').find('.colGrab').height(30);
        clearTimeout(timer);
        timer = setTimeout(function () { 
            var i = 0;
            $('.xcTable').each(function() {
                adjustColGrabHeight(i);
                i++;
            });
        }, 100 );
        generateFirstVisibleRowNum();
    });

    //XXX using this to keep window from scrolling on dragdrop
    $(window).scroll(function() {
        $(this).scrollLeft(0);
    });

    $('#mainFrame').scroll(function() {
        $(this).scrollTop(0);
    });


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
        var $target = $(event.target);
        var clickable = $target.closest('.colMenu').length > 0;
        if (!clickable && !$target.is('.dropdownBox')) {
            $('.colMenu').hide();
        }

        if (!$target.is('.editableHead') && !$target.is('#fnBar')) {
            var index = $('th.selectedCell').index();
            if (index > -1) {
                $('.selectedCell').removeClass('selectedCell');
                if (gFnBarOrigin) {
                    displayShortenedHeaderName(gFnBarOrigin, 
                                               gActiveTableNum, index);
                }
            }
            gFnBarOrigin = undefined;
            $('#fnBar').val("");
        }
    });
    $(document).mousemove(function(event) {
        if (gMouseStatus == null) {
            return;
        }

        switch (gMouseStatus) {
            case ("resizingCol"):
                gRescolMouseMove(event);
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

    $(document).click(function(event) {
        gLastClickTarget = $(event.target);
    });

}


function documentReadyCatFunction(tableNum, tableNumsToRemove) {
    var deferred = jQuery.Deferred();
    
    var index = getIndex(gTables[tableNum].frontTableName);
    var notIndexed = !(index && index.length > 0);
    getFirstPage(gTables[tableNum].resultSetId, tableNum, notIndexed)
    .then(function(jsonData, keyName) {
        if (notIndexed) { // getNextPage will setupProgCols
            index = gTables[tableNum].tableCols;
        }
        if (tableNumsToRemove && tableNumsToRemove.length > 0) {
            for (var i = 0; i < tableNumsToRemove.length; i++) {
                $('#tablesToRemove'+tableNumsToRemove[i]).remove();
                $('#rowScrollerToRemove'+tableNumsToRemove[i]).remove();
            }
        }
        buildInitialTable(index, tableNum, jsonData, keyName);
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("documentReadyCatFunction fails!");
        deferred.reject(error);
    });
    
    return (deferred.promise());
}

function startupFunctions() {
    var deferred = jQuery.Deferred();

    setupLogout();
    readFromStorage()
    .then(function() {
        documentReadyGeneralFunction();
        setupRightSideBar();
        return (setupDatasetList());
    })
    .then(function() {
        setupTooltips();
        mainPanelsTabbing();
        setupFunctionBar();
        scratchpadStartup(); 
        setupDSCartButtons();
        setupImportDSForm();
        setupBookmarkArea();
        setupWorksheetMeta();
        return (updateDatasetInfoFields("Datasets", undefined, IsActive.Active));
    })
    .then(function() {
        setupDag();
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("startupFunctions fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}  

function tableStartupFunctions(table, tableNum, tableNumsToRemove) {
    var deferred = jQuery.Deferred();
    setTableMeta(table)
    .then(function(newTableMeta) {
        gTables[tableNum] = newTableMeta;
        return (documentReadyCatFunction(tableNum, tableNumsToRemove));
    })
    .then(function(val) {
        generateFirstVisibleRowNum();
        infScrolling(tableNum);
        adjustColGrabHeight(tableNum);
        resizeRowInput();
        constructDagImage(gTables[tableNum].backTableName);

        deferred.resolve();
    })
    .fail(function(error) {
        console.log("tableStartupFunctions Fails!");
        deferred.reject(error);
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
                promises.push(addTable.bind(this, gTableOrderLookup[i], i));
            }
            for (var table in gTableIndicesLookup) {
                if (!gTableIndicesLookup[table].active) {
                    promises.push(setupHiddenTable.bind(this, table));
                }
            }

            chain(promises)
            .then(function() {
                if (gTableOrderLookup.length > 0) {
                    documentReadyxcTableFunction();
                } else {
                    $('#mainFrame').addClass('empty');
                }
                deferred.resolve();
            })
            .fail(function(error) {
                console.log("initializeTable fails!");
                deferred.reject(error);
            });
        }
        return (deferred.promise());
    }  

    $(document).ready(function() {
        startupFunctions()
        .then(initializeTable)
        .then(function() {
            setuptableListSection();
            initializeJoinModal();
        })
        .fail(function(error) {
            console.log("Initialization fails!");
        });
    });
}
