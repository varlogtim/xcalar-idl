/**
    This file is where all the global variables go, as well as any
    document.ready functions. Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/

// =================================== Globals =================================
var gNumEntriesPerPage = 20;
var gMaxEntriesPerPage = 50;
var gNewCellWidth = 125;
var gMouseStatus = null;
var gDragObj = {};
var gRescol = {
    "minCellHeight"  : 30,
    "cellMinWidth"   : 15,
    "clicks"         : 0,
    "delay"          : 500,
    "timer"          : null
};
var gResrow = {};
var gMinTableWidth = 30;
var gTables = {}; // This is the main global array containing structures
                    // Stores TableMeta structs
var gOrphanTables = [];
var gFnBarOrigin;
var gActiveTableId = "";
var gDSObj = {};    //obj for DS folder structure
var gRetinaObj = {}; //obj for retina modal
var gLastClickTarget = $(window); // track which element was last clicked
var gDatasetBrowserResultSetId = 0; // resultSetId for currently viewed
var gMinModeOn = false;
var KB = 1024;
var MB = 1024 * KB;
var GB = 1024 * MB;
var TB = 1024 * GB;
var PB = 1024 * TB;

// ================================ Misc ======================================
function infScrolling(tableId) {
    var $rowScroller = $('#rowScrollerArea');
    var scrollCount = 0;
    var $xcTbodyWrap = xcHelper.getElementByTableId(tableId, 'xcTbodyWrap');

    $xcTbodyWrap.scroll(function() {
        if (gMouseStatus === "movingTable") {
            return;
        }
        if ($rowScroller.hasClass('autoScroll')) {
            $rowScroller.removeClass('autoScroll');
            return;
        }

        $(".colMenu:visible").hide();
        $('.highlightBox').remove();

        var table = xcHelper.getTableFromId(tableId);
        focusTable(tableId);
        var $table = xcHelper.getElementByTableId(tableId, 'xcTable');

        if ($table.height() < $('#mainFrame').height()) {
            // prevent scrolling on a short table
            $(this).scrollTop(0);
        }

        var innerDeferred = jQuery.Deferred();
        var firstRow = $table.find('tbody tr:first');
        var topRowNum = xcHelper.parseRowNum(firstRow);
        var info;
        var numRowsToAdd;

        if (firstRow.length === 0) {
            innerDeferred.resolve();
        } else if ($(this).scrollTop() === 0 &&
            !firstRow.hasClass('row0'))
        {
            scrollCount++;
            
            if (scrollCount < 2) {
                // var initialTop = firstRow.offset().top;
                numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum,
                                        table.resultSetMax);

                var rowNumber = topRowNum - numRowsToAdd;
                var lastRowToDisplay = $table.find('tbody tr:lt(30)');

                info = {
                    "numRowsToAdd"    : numRowsToAdd,
                    "numRowsAdded"    : 0,
                    "targetRow"       : rowNumber,
                    "lastRowToDisplay": lastRowToDisplay,
                    "bulk"            : false,
                    "tableName"       : table.tableName,
                    "tableId"         : tableId
                };

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
                   // $(this).outerHeight() <= 1) {
                   $(this).outerHeight() <= 1) {
            scrollCount++;

            if (scrollCount < 2) {
                numRowsToAdd = Math.min(gNumEntriesPerPage,
                                table.resultSetMax -
                                table.currentRowNumber);
                info = {
                    "numRowsToAdd": numRowsToAdd,
                    "numRowsAdded": 0,
                    "targetRow"   : table.currentRowNumber +
                                    numRowsToAdd,
                    "lastRowToDisplay": table.currentRowNumber +
                                        numRowsToAdd,
                    "bulk"     : false,
                    "tableName": table.tableName,
                    "tableId"  : tableId
                };
                
                goToPage(table.currentRowNumber, numRowsToAdd,
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
            console.error("Scroll Fails!", error);
        });
    });
}

var MouseEvents = function() {
    var lastMouseDownTarget;
    var lastClickTarget;

    this.setMouseDownTarget = function($element) {
        lastMouseDownTarget = $element;
    };

    this.setClickTarget = function($element) {
        lastClickTarget = $element;
    };

    this.getLastMouseDownTarget = function() {
        return (lastMouseDownTarget);
    };

    this.getLastClickTarget = function() {
        return (lastClickTarget);
    };
};

var gMouseEvents = new MouseEvents();

function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?')
                 + 1).split('&');
    if (window.location.href.indexOf("?") < 0) {
        return [];
    }

    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}

function setupMenuBar() {
    RowScroller.setup();
    setupMainPanelsTab();
    setupFunctionBar();
}

function setupFunctionBar() {
    $("#fnBar").on({
        // "input": function() {
        //     if ($(".scratchpad").has(gFnBarOrigin).length !== 0 &&
        //         $(this).val().indexOf("=") === 0) {
        //         enterEquationMode();
        //     }
        // },
        "keyup": function(event) {
            if (event.which === keyCode.Enter) {
                functionBarEnter(gFnBarOrigin);
                $(this).blur().addClass("entered");
            }
        },
        "mousedown": function() {
            $(this).addClass("inFocus");
        },
        "blur": function() {
            $(this).removeClass("inFocus");
        }
    });
}

function setupMainPanelsTab() {
    var $tabs = $(".mainMenuTab");

    $tabs.click(function() {
        var $curTab = $(this);

        if ($curTab.hasClass("active")) {
            return;
        }

        $tabs.removeClass("active");
        $('.mainPanel').removeClass('active');
        $curTab.addClass("active");

        switch ($curTab.attr("id")) {
            case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                MonitorGraph.clear();
                WSManager.focusOnWorksheet();
                break;
            case ("schedulerTab"):
                $('#schedulerPanel').addClass("active");
                MonitorGraph.clear();
                break;
            case ("dataStoresTab"):
                $("#datastorePanel").addClass("active");
                DataSampleTable.sizeTableWrapper();
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

function setupHiddenTable(tableName) {
    var deferred = jQuery.Deferred();

    setTableMeta(tableName)
    .then(function() {
        var tableId = xcHelper.getTableId(tableName);
        var table = gTables[tableId];
        table.active = false;

        var index = getIndex(gTables[tableId].tableName);
        if (index && index.length > 0) {
            table.tableCols = index;
        } else {
            console.warn("Not stored", tableName);
        }  

        deferred.resolve();
    })
    .fail(function(error) {
        console.error("setupHiddenTable fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
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
        var left = $userName.position().left + $userName.width() / 2 -
                    $popOut.width() / 2;

        event.stopPropagation();

        $popOut.toggle();
        $popOut.css({"top": top, "left": left});
    });

    $("body").click(function() {
        $popOut.hide();
    });

    $("#signout").click(function() {
        freeAllResultSetsSync()
        .then(function() {
            return (KVStore.release());
        })
        .then(function() {
            window.location = "dologout.html";
        })
        .fail(function(error) {
            Alert.error("Signout fails", error);
        });

    });
}

function setupTooltips() {
    $("body").tooltip({
        selector: '[data-toggle="tooltip"]',
        delay   : {
            "show": 100,
            "hide": 100
        },
        html: true
    });

    $("body").on('mouseenter', '[data-toggle="tooltip"]', function() {
        $('.tooltip').hide();
    });    
}

// ========================== Document Ready ==================================
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
        timer = setTimeout(function() {
            var table = xcHelper.getTableFromId(gActiveTableId);
            if (table && table.resultSetCount !== 0) {
                generateFirstVisibleRowNum();
            }
            moveTableDropdownBoxes();
        }, 100);
        moveTableTitles();
    });

    //XXX using this to keep window from scrolling on dragdrop
    $(window).scroll(function() {
        $(this).scrollLeft(0);
    });

    //XXX using this to keep window from scrolling up and down;
    $('#container').scroll(function() {
        $(this).scrollTop(0);
    });

    $('#mainFrame').scroll(function() {
        $(this).scrollTop(0);
        $('.colMenu').hide();
        $(".highlightBox").remove();

        clearTimeout(timer);
        timer = setTimeout(function() {
            moveTableDropdownBoxes();
        }, 300);

        moveFirstColumn();
        moveTableTitles();
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
        var clickable = $target.closest('.colMenu').length > 0 ||
                        $target.closest('.clickable').length > 0 ||
                        $target.hasClass("highlightBox");
        if (!clickable && $target.closest('.dropdownBox').length === 0) {
            $('.colMenu').hide();
            $('.highlightBox').remove();
            $('body').removeClass('noSelection');
        }

        if (!$target.is('.editableHead') && !$target.is('#fnBar')) {
            if ($target.closest('.selectedCell').length !== 0) {
                return;
            } else if ($target.attr('id') === 'mainFrame') {
                return;
            } else if ($target.closest('.colMenu').length !== 0 &&
                        $target.closest('.xcTableWrap').length !== 0) {
                return;
            }
            $('.selectedCell').removeClass('selectedCell');
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
            case ("rowScroller"):
                RowScroller.mouseMove(event);
                break;
            default:  // do nothing
        }
    });

    $(document).mouseup(function() {
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
            case ("rowScroller"):
                RowScroller.mouseUp();
                break;
            default: // do nothing
        }
    });

    $(document).click(function(event) {
        gLastClickTarget = $(event.target);
    });

}

function loadMonitorPanel() {
    $('#monitorPanel').load(paths.monitor, function() {
        MonitorPanel.setup();
    });
}

function startupFunctions() {
    var deferred = jQuery.Deferred();

    // Shut up the console logs
    verbose = false;

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
        setupMenuBar();
        scratchpadStartup();
        StatusMessage.setup();
        WSManager.setup();
        loadMonitorPanel();
        DagPanel.setup();
        FileBrowser.setup();
        STATSManager.setup();
        ExportModal.setup();
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("startupFunctions fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function initializeTable() {
    var deferred   = jQuery.Deferred();
    var tableCount = 0;

    XcalarGetTables()
    .then(function(backEndTables) {
        var backTables = backEndTables.nodeInfo;
        var numBackTables = backEndTables.numNodes;
        var tableMap = {};

        for (var i = 0; i < numBackTables; i++) {
            tableMap[backTables[i].name] = backTables[i].name;
        }

        var hasTable = false;
        var promises = [];
        var failures = [];
        var tableName;
        var tableId;
        var currentTable;
        var worksheets = WSManager.getWorksheets();
        var numWorksheets = worksheets.length;

        for (var i = 0; i < numWorksheets; i++) {
            if (worksheets[i] == null) {
                continue;
            }
            var wsTables = worksheets[i].tables;
            var numWsTables = wsTables.length;

            if (!hasTable && numWsTables > 0) {
                hasTable = true;
            }

            // create active tables
            for (var j = 0; j < numWsTables; j++) {
                tableId = wsTables[j];
                currentTable = gTables[tableId];

                if (!currentTable) {
                    WSManager.removeTable(tableId);
                    console.error("not find table", tableId);
                    continue;
                }

                tableName = currentTable.tableName;
                delete tableMap[tableName];
                ++tableCount;

                promises.push((function(tName, tId) {
                    var innerDeferred = jQuery.Deferred();

                    parallelConstruct(tId)
                    .then(innerDeferred.resolve)
                    .fail(function(thriftError) {
                        failures.push("Add table " + tName +
                                     "fails: " + thriftError.error);
                        innerDeferred.resolve(error);
                    });

                    return (innerDeferred.promise());
                }).bind(this, tableName, tableId));
            }

            // create hidden tables
            var wsHiddenTables = worksheets[i].hiddenTables;
            var numHiddenWsTables = wsHiddenTables.length;
            for (var j = 0; j < numHiddenWsTables; j++) {
                tableId = wsHiddenTables[j];
                currentTable = gTables[tableId];

                if (!currentTable) {
                    WSManager.removeTable(tableId);
                    console.error("not find table", tableId);
                    continue;
                }

                tableName = currentTable.tableName;
                delete tableMap[tableName];
                ++tableCount;

                promises.push((function(tName) {
                    var innerDeferred = jQuery.Deferred();

                    setupHiddenTable(tName)
                    .then(innerDeferred.resolve)
                    .fail(function(thriftError) {
                        failures.push("set hidden table " + tName +
                                     "fails: " + thriftError.error);
                        innerDeferred.resolve(error);
                    });

                    return (innerDeferred.promise());
                }).bind(this, tableName));
            }
        }

        // create no worksheet tables
        var noSheetTables = WSManager.getNoSheetTables();
        var numNoSheetTables = noSheetTables.length;

        for (var i = 0; i < numNoSheetTables; i++) {
            tableId = noSheetTables[i];
            currentTable = gTables[tableId];

            if (!currentTable) {
                // this case is fine since some are in agg table list
                console.info("not find table", tableId);
                continue;
            }

            tableName = currentTable.tableName;
            delete tableMap[tableName];
            ++tableCount;

            promises.push((function(tName) {
                var innerDeferred = jQuery.Deferred();

                setupHiddenTable(tName)
                .then(innerDeferred.resolve)
                .fail(function(thriftError) {
                    failures.push("set no sheet table " + tName +
                                    "fails: " + thriftError.error);
                    innerDeferred.resolve(error);
                });

                return (innerDeferred.promise());
            }).bind(this, tableName));
        }

        // setup leftover tables
        setupOrphanedList(tableMap);

        chain(promises)
        .then(function() {
            if (hasTable) {
                RowScroller.resize();
            } else {
                $('#mainFrame').addClass('empty');
            }

            if (failures.length > 0) {
                for (var j = 0; j < failures.length; j++) {
                    console.error(failures[j]);
                }

                if (failures.length === tableCount) {
                    deferred.reject("InitializeTable fails!");
                } else {
                    deferred.resolve();
                }
            } else {
                deferred.resolve();
            }
        })
        .fail(function(error) {
            deferred.reject(error);
        });
    })
    .fail(function(error) {
        console.error("InitializeTable fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function setupOrphanedList(tableMap) {
    var tables = [];
    for (var table in tableMap) {
        tables.push(table);
    }
    gOrphanTables = tables;
}

function checkXcalarVersionMatch() {
    var deferred = jQuery.Deferred();

    XcalarGetVersion()
    .then(function(result) {
        var versionNum = result.output.outputResult.getVersionOutput
                                                   .apiVersionSignatureShort;
        if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {

            deferred.reject({error: 'Update required.'});
        } else {
            deferred.resolve();
        }
    })
    .fail(function() {
        deferred.reject({error: 'Connection could not be established.'});
    });

    return (deferred.promise());
}

function documentReadyIndexFunction() {
    $(document).ready(function() {
        Compitable.check();

        checkXcalarVersionMatch()
        .then(startupFunctions)
        .then(initializeTable)
        .then(function() {
            RightSideBar.initialize();
            Alert.setup();
            JoinModal.setup();
            AggModal.setup();
            OperationsModal.setup();
            WorkbookModal.setup();
            Scheduler.setup();
            DataFlowModal.setup();
            AddScheduleModal.setup();
            DFGPanel.setup();
            WSManager.focusOnWorksheet();
        })
        .then(function() {
            // this should come in last!
            KVStore.safeSetup();
        })
        .fail(function(error) {
            if (typeof error === "string"){
                // when it's a front end error, already has handler
                console.error("Setup fails", error);
            } else {
                // when it's an error from backend we cannot handle
                var title;
                var options = {lockScreen: true};
                if (error.error.indexOf('Update required') !== -1) {
                    title = "Xcalar version mismatch";
                } else if (error.error.indexOf('Connection') !== -1) {
                    title = "Connection error";
                } else {
                    title = "Setup fails";
                }
                Alert.error(title, error, options);
            }
        });
    });
}

function xcDrag(event) {
    event.dataTransfer.setData("text", $(event.target).text());
}

