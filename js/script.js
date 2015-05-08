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
var gDatasetBrowserResultSetId = 0; // resultSetId for currently viewed 
var KB = 1024;
var MB = 1024 * KB;
var GB = 1024 * MB;
var TB = 1024 * GB;
var PB = 1024 * TB;

// ================================= Classes ==================================
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
    this.rowHeights = {};
}
// ================================ Misc ======================================
function infScrolling(tableNum) {
    var $rowScroller = $('#rowScrollerArea');
    $("#xcTbodyWrap"+tableNum).scroll(function(e) {
        if (gMouseStatus == "movingTable") {
            return;
        }
        if ($rowScroller.hasClass('autoScroll')) {
            $rowScroller.removeClass('autoScroll');
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
        })
        .fail(function(error) {
            console.log("Scroll Fails!");
        });
    });
}

var MouseEvents = function() {
    var lastMouseDownTarget;
    var lastClickTarget;

    this.setMouseDownTarget = function($element) {
        lastMouseDownTarget = $element;
    }

    this.setClickTarget = function($element) {
        lastClickTarget = $element;
    }

    this.getLastMouseDownTarget = function() {
        return (lastMouseDownTarget);
    }

    this.getLastClickTarget = function() {
        return (lastClickTarget);
    }
}

var gMouseEvents = new MouseEvents();

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

function setTableMeta(table, frontName) {
    var deferred = jQuery.Deferred();

    var urlTableName = getUrlVars()["tablename"];
    var tableName = urlTableName || table;
    var newTable = new TableMeta();
    var isTable = true;
    if (gTableIndicesLookup[tableName] && 
        !gTableIndicesLookup[tableName].isTable) {
        isTable = false;
    }

    newTable.tableCols = [];
    newTable.currentPageNumber = 0;
    if (gTableIndicesLookup[tableName]) {
        newTable.rowHeights = gTableIndicesLookup[tableName].rowHeights;
        newTable.bookmarks = gTableIndicesLookup[tableName].bookmarks;
    }

    getResultSet(isTable, tableName)
    .then(function(resultSet) {
        newTable.isTable = isTable;
        newTable.resultSetId = resultSet.resultSetId;

        newTable.resultSetCount = resultSet.numEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.backTableName = tableName;
        newTable.frontTableName = frontName == undefined ? tableName:frontName;

        // console.log(newTable);

        deferred.resolve(newTable);
    })
    .fail(function(error){
        console.log("setTableMeta Fails!");
        deferred.reject(error);
    });
        
    return (deferred.promise());
}

function getResultSet(isTable, tableName) {
    if (isTable) {
        return (XcalarMakeResultSetFromTable(tableName));
    } else {
        return (XcalarMakeResultSetFromDataset(gTableIndicesLookup[tableName]
                                                .datasetName));
    }
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

function setupHiddenTable(table, frontName) {
    var deferred = jQuery.Deferred();

    if (frontName == undefined) {
        frontName = table;
    }

    setTableMeta(table, frontName)
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
        if ($(this).hasClass('active')) {
            return;
        }
        $(".mainMenuTab").removeClass("active");
        $('.mainPanel').removeClass('active');
        $(this).addClass("active");
        switch ($(this).attr("id")) {
        case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                MonitorGraph.clear();
                WSManager.focusOnWorksheet();
            break;
        case ("dataStoresTab"):
            $("#datastoreView").addClass("active");
            MonitorGraph.clear();
            break;
        case ("monitorTab"):
            $('#monitorPanel').addClass("active");
            updateMonitorGraphs();
            MonitorGraph.start();
            break;
        default:
            $(".underConstruction").addClass("active");
        }
        StatusMessage.updateLocation();
    });
    // $("#workspaceTab").click();
    StatusMessage.updateLocation();
}

function setupLogout() {
    var $userName = $("#userName");
    var $popOut = $("#userNamePopout");
    var username = sessionStorage.getItem("xcalar-username");

    username = username || "Vikram Joshi";

    $userName.text(username);
    $popOut.find(".text").text(username);

    $userName.click(function() {
        var top = $userName.position().top + $userName.height();
        var left =  $userName.position().left + $userName.width()/2 -
                    $popOut.width() / 2;

        $popOut.toggle();
        $popOut.css({"top": top, "left": left});
    });

    $("#signout").click(function() {
        // window.location = "dologout.html";
        // XXX this redirect is only for temporary use
        KVStore.release();
        window.location = "login.html";
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

// ========================== Document Ready ==================================

function documentReadyxcTableFunction() {
    resizeRowInput();

    var $rowInput = $('#rowInput');

    $rowInput.keypress(function(e) {
        if (e.which !== keyCode.Enter) {
            return;
        }
        var row = $('#rowInput').val();

        if (row == "" || row%1 != 0) {
            return;
        }
        if (gTables[gActiveTableNum].resultSetCount == 0) {
            $rowInput.val('0');
            $rowInput.data('val', 0);
            return;
        } else if (row < 1) {
            row = 1;
        } else if (row > gTables[gActiveTableNum].resultSetCount) {
            row = gTables[gActiveTableNum].resultSetCount;
        }
        $rowInput.data('val', row);
        $rowInput.val(row);

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
                moverowScroller($('#rowInput').val(), 
                                 gTables[gActiveTableNum].resultSetCount);
            } else {
                $('#rowScrollerArea').addClass('autoScroll');
            }
        });
    });
    
    if (gActiveTableNum >= 0) {
        var num = Number(gTables[gActiveTableNum].resultSetCount)
                    .toLocaleString('en');

        $("#numPages").text("of " + num);
    }
}

function documentReadyGeneralFunction() {
    window.onbeforeunload = function() {
        KVStore.release();
        freeAllResultSets();
        sleep("500ms");
        return;
    };

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

            if (gTables[gActiveTableNum] && 
                gTables[gActiveTableNum].resultSetCount != 0) {  
                generateFirstVisibleRowNum();
            }
            moveTableDropdownBoxes();
        }, 100 );
    });

    //XXX using this to keep window from scrolling on dragdrop
    $(window).scroll(function() {
        $(this).scrollLeft(0);
    });

    $('#mainFrame').scroll(function() {
        $(this).scrollTop(0);
        
        clearTimeout(timer);
        timer = setTimeout(function () { 
           moveTableDropdownBoxes();
        }, 300 );
    });

    var $rowInput = $('#rowInput');
    $rowInput.val("").data("");
    $rowInput.blur(function() {
        var val = $(this).data('val');
        $(this).val(val);
    });

    $(document).mousedown(function(event) {
        var $target = $(event.target);
        gMouseEvents.setMouseDownTarget($target);
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
            // case ("movingJson"):
            //     JSONModal.mouseMove(event);
            //     break;
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
            // case ("movingJson"):
            //     JSONModal.mouseUp();
            //     break;
            case ("rowScroller"):
                rowScrollerMouseUp();
            default: // do nothing
        }
    });

    $(document).click(function(event) {
        gLastClickTarget = $(event.target);
    });

}

function loadMonitorPanel() {
    $('#monitorPanel').load('monitor.html', function() {
        setupMonitorPanel();
    });
}

function documentReadyCatFunction(tableNum, tableNumsToRemove) {
    var deferred = jQuery.Deferred();
    var index = getIndex(gTables[tableNum].frontTableName);
    var notIndexed = !(index && index.length > 0);
    getFirstPage(gTables[tableNum].resultSetId, tableNum, notIndexed)
    .then(function(jsonData, keyName) {
        if (notIndexed) { // getNextPage will ColManager.setupProgCols()
            index = gTables[tableNum].tableCols;
        }
        if (tableNumsToRemove && tableNumsToRemove.length > 0) {
            for (var i = 0; i < tableNumsToRemove.length; i++) {
                $('#tablesToRemove'+tableNumsToRemove[i]).remove();
                $('#rowScrollerToRemove'+tableNumsToRemove[i]).remove();
                $('#dagWrapToRemove'+tableNumsToRemove[i]).remove();
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
    RightSideBar.setup();
    DataStore.setup();
    readFromStorage()
    .then(function() {
        documentReadyGeneralFunction();
        JSONModal.setup();
        setupTooltips();
        mainPanelsTabbing();
        setupFunctionBar();
        scratchpadStartup(); 
        setupBookmarkArea();
        WSManager.setup();
        loadMonitorPanel();
        setupDag();
        FileBrowser.setup();
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("startupFunctions fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}  

function tableStartupFunctions(table, tableNum, tableNumsToRemove, frontName) {
    var deferred = jQuery.Deferred();
    var worksheetIndex;

    if (frontName == undefined) {
        frontName = table;
    }

    setTableMeta(table, frontName)
    .then(function(newTableMeta) {
        gTables[tableNum] = newTableMeta;

        return (documentReadyCatFunction(tableNum, tableNumsToRemove));
    })
    .then(function(val) {
        // not have the flick, must refresh immediately after create table
        worksheetIndex = WSManager.addTable(frontName);
        $("#xcTableWrap" + tableNum).addClass("worksheet-" + worksheetIndex);
        WSManager.focusOnWorksheet();

        if (gTables[tableNum].resultSetCount != 0) {  
            infScrolling(tableNum);
        }

        adjustColGrabHeight(tableNum);
        resizeRowInput();

        return (constructDagImage(gTables[tableNum].backTableName, tableNum));
    })
    .then(function() {
        // refresh dag
        $("#dagWrap" + tableNum).addClass("worksheet-" + worksheetIndex);
        WSManager.focusOnWorksheet();

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
                var frontName = gTableOrderLookup[i];
                var backName = gTableIndicesLookup[frontName].backTableName;

                if (backName == undefined) {
                    backName = frontName;
                }
                promises.push(addTable.bind(this, backName, i, 
                                            null, null, frontName));
            }
            for (var frontName in gTableIndicesLookup) {
                var table = gTableIndicesLookup[frontName];

                if (!table.active) {
                    var backName = table.backTableName;

                    if (backName == undefined) {
                        backName = frontName;
                    }

                    promises.push(setupHiddenTable.bind(this, 
                                                        backName, frontName));
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
            RightSideBar.initialize();
            JoinModal.setup();
            AggModal.setup();
            OperationsModal.setup();
            WSManager.focusOnWorksheet();
        })
        .fail(function(error) {
            console.log("Initialization fails!");
        });
    });
}
