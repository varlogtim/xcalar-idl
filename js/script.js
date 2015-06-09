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
    this.currentRowNumber = -1;
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
    var scrollCount = 0;
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
        var topRowNum = parseInt(firstRow.attr('class').substr(3));
        if (firstRow.length === 0) {
            innerDeferred.resolve();
        } else if ($(this).scrollTop() === 0 && 
            firstRow.attr('class') != 'row0') {
            scrollCount++;
            
            if (scrollCount < 2) {
                var initialTop = firstRow.offset().top;
                var numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum);
                var rowNumber = topRowNum - numRowsToAdd;
                var lastRowToDisplay = table.find('tbody tr:lt(40)');

                var info = {
                    numRowsToAdd: numRowsToAdd,
                    numRowsAdded: 0,
                    targetRow: rowNumber,
                    lastRowToDisplay: lastRowToDisplay,
                    bulk: false,
                    tableNum: dynTableNum
                }

                goToPage(rowNumber, numRowsToAdd, RowDirection.Top, false, info)
                .then(function() {

                    scrollCount--;
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    scrollCount--;
                    innerDeferred.reject(error);
                });
            } else {
                scrollCount--;
                innerDeferred.resolve();
            }
        } else if ($(this)[0].scrollHeight - $(this).scrollTop() -
                   $(this).outerHeight() <= 1) {
            scrollCount++;

            if (scrollCount < 2) {
                var numRowsToAdd = Math.min(gNumEntriesPerPage, 
                                  gTables[dynTableNum].resultSetMax - 
                                  gTables[dynTableNum].currentRowNumber);
                var info = {
                    numRowsToAdd: numRowsToAdd,
                    numRowsAdded: 0,
                    targetRow: gTables[dynTableNum].currentRowNumber+
                               numRowsToAdd,
                    lastRowToDisplay: gTables[dynTableNum].currentRowNumber+
                                      numRowsToAdd,
                    bulk: false,
                    tableNum : dynTableNum
                }
                
                goToPage(gTables[dynTableNum].currentRowNumber, numRowsToAdd,
                         RowDirection.Bottom, false, info)
                .then(function() {
                    scrollCount--;
                    innerDeferred.resolve();
                })
                .fail(function(error) {
                    scrollCount--;
                    innerDeferred.reject(error);
                });
            } else {
                scrollCount--;
                innerDeferred.resolve();
            }
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
    newTable.currentRowNumber = 0;
    if (gTableIndicesLookup[tableName]) {
        newTable.rowHeights = gTableIndicesLookup[tableName].rowHeights;
        newTable.bookmarks = gTableIndicesLookup[tableName].bookmarks;
    }

    getResultSet(isTable, tableName)
    .then(function(resultSet) {
        newTable.isTable = isTable;
        newTable.resultSetId = resultSet.resultSetId;

        newTable.resultSetCount = resultSet.numEntries;
        newTable.resultSetMax = resultSet.numEntries;
        newTable.numPages = Math.ceil(newTable.resultSetCount /
                                      gNumEntriesPerPage);
        newTable.backTableName = tableName;
        newTable.frontTableName = frontName == null ? tableName : frontName;
        newTable.keyName = resultSet.keyAttrHeader.name;

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
            MonitorPanel.updateDonuts();
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

    $userName.click(function(event) {
        var top  = $userName.position().top + $userName.height();
        var left =  $userName.position().left + $userName.width()/2 -
                    $popOut.width() / 2;

        event.stopPropagation();

        $popOut.toggle();
        $popOut.css({"top": top, "left": left});
    });

    $("body").click(function() {
        $popOut.hide();
    });

    $("#signout").click(function() {
        // window.location = "dologout.html";
        // XXX this redirect is only for temporary use
        freeAllResultSetsSync()
        .then(function() {
            return (KVStore.release());
        })
        .then(function() {
            window.location = "login.html";
        })
        .fail(function(error) {
            Alert.error("Signout fails", error);
        });

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
        var targetRow = $('#rowInput').val();
        var backRow = parseInt(targetRow);

        if (targetRow == "" || targetRow%1 != 0) {
            return;
        }
        if (gTables[gActiveTableNum].resultSetCount == 0) {
            $rowInput.val('0');
            $rowInput.data('val', 0);
            return;
        } else if (targetRow < 1) {
            targetRow = 1;
            backRow = 0;
        } else if (targetRow > gTables[gActiveTableNum].resultSetCount) {
            targetRow = gTables[gActiveTableNum].resultSetCount;
            backRow = gTables[gActiveTableNum].resultSetCount - 20;
        }
        $rowInput.data('val', targetRow);
        $rowInput.val(targetRow);

        backRow = Math.min(gTables[gActiveTableNum].resultSetMax-60, 
                            backRow-20);

        if (backRow < 0) {
            backRow = 0;
        }

        var numRowsToAdd = 60;
        var info = {
            numRowsToAdd: numRowsToAdd,
            numRowsAdded: 0,
            lastRowToDisplay: backRow+60,
            targetRow: targetRow,
            bulk: true,
            tableNum: gActiveTableNum
        }
        goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
        .then(function() {
            adjustColGrabHeight(gActiveTableNum);
            var rowToScrollTo = Math.min(targetRow, 
                                gTables[gActiveTableNum].resultSetMax);
            positionScrollbar(rowToScrollTo, gActiveTableNum);
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
        sleep("500ms");
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
        }, 100);
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
        MonitorPanel.setup();
    });
}

function documentReadyCatFunction(tableNum, tableNumsToRemove) {
    var deferred = jQuery.Deferred();
    var index = getIndex(gTables[tableNum].frontTableName);
    var notIndexed = !(index && index.length > 0);
    getFirstPage(gTables[tableNum].resultSetId, tableNum, notIndexed)
    .then(function(jsonObj, keyName) {
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
        gTables[tableNum].currentRowNumber = jsonObj.normal.length;
        buildInitialTable(index, tableNum, jsonObj, keyName);
        deferred.resolve();
    })
    .then(function() {
        var deferred2 = jQuery.Deferred();
        var requiredNumRows = Math.min(60, gTables[tableNum].resultSetCount);
        var numRowsStillNeeded = requiredNumRows - 
                                 $('#xcTable'+tableNum+' tbody tr').length;
        if (numRowsStillNeeded > 0) {
            var info = {
                numRowsToAdd: numRowsStillNeeded,
                numRowsAdded: 0,
                targetRow: gTables[tableNum].currentRowNumber+
                           numRowsStillNeeded,
                lastRowToDisplay: gTables[tableNum].currentRowNumber+
                                  numRowsStillNeeded,
                bulk: false,
                dontRemoveRows : true,
                tableNum : tableNum
            };
            goToPage(gTables[tableNum].currentRowNumber, numRowsStillNeeded,
                         RowDirection.Bottom, false, info)
            .then(function() {
                var lastRow = $('#xcTable'+tableNum+' tr:last');
                var lastRowNum = parseInt(lastRow.attr('class').substr(3));
                gTables[tableNum].currentRowNumber = lastRowNum + 1;
                deferred2.resolve();
            })
            .fail(function(error) {
                deferred2.reject(error);
            });
        } else {
            deferred2.resolve();
        }
        return (deferred2.promise());      
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
    WKBKManager.setup()
    .then(function() {
        return (readFromStorage());
    })
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
        DagPanel.setup();
        FileBrowser.setup();
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("startupFunctions fails!");
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
            Alert.setup();
            JoinModal.setup();
            AggModal.setup();
            OperationsModal.setup();
            WorkbookModal.setup();
            WSManager.focusOnWorksheet();
        })
        .fail(function(error) {
            console.log("Initialization fails!");
        });
    });
}
