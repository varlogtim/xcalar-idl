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
    "minCellHeight": 30,
    "cellMinWidth" : 15,
    "clicks"       : 0,
    "delay"        : 500,
    "timer"        : null
};
var gResrow = {};
var gMinTableWidth = 30;
// XXX this part should change to right scope after backend fix
/*
  "AUTH": Authentication info (should be XcalarApiKeyScopeSession)
  "PREF": user preference info (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "WKBK": Workbook info (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "META": all meta data need for UI (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "LOG" : SQL Log (this use append) (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "FLAG": special commitFlag to make sure UI have right to write (should be XcalarApiKeyScopeSession)
 */
var gKVScope = {
    "AUTH": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "PREF": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "WKBK": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "META": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "LOG" : XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "FLAG": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal
};
var gTables = {}; // This is the main global array containing structures
                    // Stores TableMeta structs
var gOrphanTables = [];
var gFnBarOrigin;
var gActiveTableId = "";
var gDSObj = {};    //obj for DS folder structure
var gRetinaObj = {}; //obj for retina modal
var gLastClickTarget = $(window); // track which element was last clicked
var gDatasetBrowserResultSetId = 0; // resultSetId for currently viewed
var gIsTableScrolling = false;
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
    var $xcTbodyWrap = $('#xcTbodyWrap-' + tableId);

    $xcTbodyWrap.scroll(function() {
        if (gMouseStatus === "movingTable") {
            return;
        }
        if ($rowScroller.hasClass('autoScroll')) {
            $rowScroller.removeClass('autoScroll');
            return;
        }

        $(".menu:visible").hide();
        removeMenuKeyboardNavigation();
        $('.highlightBox').remove();

        var table = gTables[tableId];
        focusTable(tableId);
        var $table = $('#xcTable-' + tableId);

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
    var lastMouseDownTarget = $(document);
    var lastClickTarget = lastMouseDownTarget;

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
    var $functionArea = $('#functionArea');
    var searchHelper = new xcHelper.SearchBar($functionArea, {
        "removeSelected": function() {
            $('.xcTable:visible').find('.selectedCell')
                                 .removeClass('selectedCell');
        },
        "highlightSelected": function($match) {
            highlightColumn($match);
        },
        "scrollMatchIntoView": function($match) {
            var $mainFrame = $('#mainFrame');
            var mainFrameWidth = $mainFrame.width();
            var matchOffsetLeft = $match.offset().left;
            var scrollLeft = $mainFrame.scrollLeft();
            var matchWidth = $match.width();
            if (matchOffsetLeft > mainFrameWidth - matchWidth) {
                $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft - ((mainFrameWidth - matchWidth) / 2));
            } else if (matchOffsetLeft < 25) {
                $mainFrame.scrollLeft(matchOffsetLeft + scrollLeft - ((mainFrameWidth - matchWidth) / 2));
            }
        },
        "ignore": "="
    });
    searchHelper.setup();

    $("#fnBar").on({
        "input": function() {
            var val = $(this).val();
            var trimmedVal = val.trim();
            if (trimmedVal.indexOf('=') !== 0) {
                $functionArea.addClass('searching');
                var args = {value: trimmedVal, searchBar: searchHelper};
                ColManager.execCol({func: {func: 'search'}}, null, args);
            } else {
                $functionArea.removeClass('searching');
            }
        },
        "keyup": function(event) {
            if (event.which === keyCode.Enter) {
                functionBarEnter(gFnBarOrigin);
            }
        },
        "mousedown": function() {
            $(this).addClass("inFocus");
        },
        "blur": function() {
            $(this).removeClass("inFocus");
           
            searchHelper.clearSearch(function() {
                $functionArea.removeClass('searching');
            });
        }
    });

    // $('#functionArea').on('mousedown', '.arrows', function(e) {
    //     e.preventDefault();
    //     e.stopPropagation();
    // });
}

function setupMainPanelsTab() {
    var $tabs = $(".mainMenuTab");

    $tabs.click(function() {
        var $curTab = $(this);

        if ($curTab.hasClass("active")) {
            return;
        }
        var lastTabId = $tabs.filter(".active").attr("id");
        $tabs.removeClass("active");
        $('.mainPanel').removeClass('active');
        $curTab.addClass("active");

        switch ($curTab.attr("id")) {
            case ("workspaceTab"):
                $("#workspacePanel").addClass("active");
                WSManager.focusOnWorksheet();
                break;
            case ("schedulerTab"):
                $('#schedulerPanel').addClass("active");
                break;
            case ("dataStoresTab"):
                $("#datastorePanel").addClass("active");
                DataSampleTable.sizeTableWrapper();
                break;
            case ("monitorTab"):
                $('#monitorPanel').addClass("active");
                MonitorPanel.updateDonuts();
                MonitorGraph.start();
                break;
            default:
                $(".underConstruction").addClass("active");
        }
        if (lastTabId === "monitorTab") {
            MonitorGraph.clear();
        }
        StatusMessage.updateLocation();
    });

    // $("#workspaceTab").click();
    StatusMessage.updateLocation();
}

function setupHiddenTable(tableName) {
    var tableId = xcHelper.getTableId(tableName);
    var table = gTables[tableId];
    table.tableName = tableName;
    table.tableId = tableId;
    table.active = false;
    var index = getIndex(gTables[tableId].tableName);
    if (index && index.length > 0) {
        table.tableCols = index;
    } else {
        console.warn("Not stored", tableName);
    }
}

function setupLogout() {
    var $userName = $("#userName");
    var $popOut = $("#userNamePopout");
    var username = sessionStorage.getItem("xcalar-username");

    $userName.text(username);
    $('#userNameArea').show();
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
        .fail(function(error) {
            console.error(error);
        })
        .always(function() {
            sessionStorage.setItem("xcalar-username", "");
            window.location = "dologout.html";
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
    var backspaceIsPressed = false;
    var hasRelease = false;
    var $rowInput = $("#rowInput");

    $rowInput.val("").data("");
    $rowInput.blur(function() {
        var val = $(this).data('val');
        $(this).val(val);
    });

    $(document).keydown(function(event){
        var isPreventEvent;

        switch (event.which) {
            case keyCode.Backspace:
                backspaceIsPressed = true;
                break;
            case keyCode.PageUp:
                isPreventEvent = tableScroll("pageUpdown", true);
                break;
            case keyCode.Space:
            case keyCode.PageDown:
                isPreventEvent = tableScroll("pageUpdown", false);
                break;
            case keyCode.Up:
                isPreventEvent = tableScroll("updown", true);
                break;
            case keyCode.Down:
                isPreventEvent = tableScroll("updown", false);
                break;
            case keyCode.Home:
                isPreventEvent = tableScroll("homeEnd", true);
                break;
            case keyCode.End:
                isPreventEvent = tableScroll("homeEnd", false);
                break;
            default:
                break;
        }

        if (isPreventEvent) {
            event.preventDefault();
        }
    });

    $(document).keyup(function(event){
        if (event.which === keyCode.Backspace) {
            backspaceIsPressed = false;
        }
    });

    window.onbeforeunload = function() {
        if (backspaceIsPressed) {
            backspaceIsPressed = false;
            return "You are leaving Xcalar";
        } else {
            hasRelease = true;
            KVStore.release();
            sleep("500ms");
            freeAllResultSets();
            sleep("500ms");
        }
    };

    window.onunload = function() {
        if (!hasRelease) {
            // XXX this may not work
            // no it's fine since backend do not has refCount
            KVStore.release();
            sleep("500ms");
            freeAllResultSets();
            sleep("500ms");
        }
    };

    var timer;
    $(window).resize(function() {
        $('#mainFrame').find('.colGrab').height(30);
        clearTimeout(timer);
        timer = setTimeout(function() {
            var table = gTables[gActiveTableId];
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
        $('.menu').hide();
        removeMenuKeyboardNavigation();
        $(".highlightBox").remove();

        clearTimeout(timer);
        timer = setTimeout(function() {
            moveTableDropdownBoxes();
        }, 300);

        moveFirstColumn();
        moveTableTitles();
    });

    $(document).mousedown(function(event) {
        var $target = $(event.target);
        gMouseEvents.setMouseDownTarget($target);
        var clickable = $target.closest('.menu').length > 0 ||
                        $target.closest('.clickable').length > 0 ||
                        $target.hasClass("highlightBox");
        if (!clickable && $target.closest('.dropdownBox').length === 0) {
            $('.menu').hide();
            removeMenuKeyboardNavigation();
            $('.highlightBox').remove();
            $('body').removeClass('noSelection');
        }

        if (!$target.is('.editableHead') && !$target.is('#fnBar')) {
            if ($target.closest('.selectedCell').length !== 0) {
                return;
            } else if ($target.attr('id') === 'mainFrame') {
                return;
            } else if ($target.closest('.menu').length !== 0 &&
                        $target.closest('#workspacePanel').length !== 0) {
                return;
            } else if ($target.is('.iconHelper') &&
                       $target.closest('.header').length !== 0) {
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

    $(window).blur(function() {
        $('.menu').hide();
        removeMenuKeyboardNavigation();
    });

    function tableScroll(scrollType, isUp) {
        if (!$("#workspaceTab").hasClass("active") ||
            gActiveTableId == null)
        {
            return false;
        }

        var $visibleMenu = $('.menu:visible');
        if ($visibleMenu.length !== 0) {
            // if the menu is only .tdMenu, allow scroll
            if ($visibleMenu.length > 1 || !$visibleMenu.hasClass("tdMenu")) {
                return false;
            }
        }

        var tableId = gActiveTableId;
        var $lastTarget = gMouseEvents.getLastMouseDownTarget();
        var isInMainFrame = $lastTarget == null ||
                            ($lastTarget.closest("#mainFrame").length > 0 &&
                            !$lastTarget.is("input"));

        if (isInMainFrame && xcHelper.isTableInScreen(tableId)) {
            if (gIsTableScrolling ||
                $("#modalBackground").is(":visible") ||
                !isTableScrollable(tableId)) {
                // not trigger table scroll, but should return true
                // to prevent table's natural scroll
                return true;
            }

            var maxRow     = gTables[tableId].resultSetCount;
            var curRow     = $rowInput.data("val");
            var lastRowNum = xcHelper.getLastVisibleRowNum(tableId);
            var rowToGo;

            // validation check
            xcHelper.assert((lastRowNum != null), "Error Case!");

            if (scrollType === "homeEnd") {
                // isUp === true for home button, false for end button
                rowToGo = isUp ? 1 : maxRow;
            } else {
                var rowToSkip;
                if (scrollType === "updown") {
                    var $xcTbodyWrap = $("#xcTbodyWrap-" + tableId);
                    var scrollTop = $xcTbodyWrap.scrollTop();
                    var $trs = $("#xcTable-" + tableId + " tbody tr");
                    var trHeight = $trs.height();
                    var rowNum;

                    if (!isUp) {
                        rowNum = xcHelper.parseRowNum($trs.eq($trs.length - 1)) + 1;
                        if (rowNum - lastRowNum > 5) {
                            // when have more then 5 buffer on bottom
                            $xcTbodyWrap.scrollTop(scrollTop + trHeight);
                            return true;
                        }
                    } else {
                        rowNum = xcHelper.parseRowNum($trs.eq(0)) + 1;
                        if (curRow - rowNum > 5) {
                            // when have more then 5 buffer on top
                            $xcTbodyWrap.scrollTop(scrollTop - trHeight);
                            return true;
                        }
                    }

                    rowToSkip = 1;
                } else if (scrollType === "pageUpdown") {
                    // this is one page's row
                    rowToSkip = lastRowNum - curRow;
                } else {
                    // error case
                    console.error("Invalid case!");
                    return false;
                }

                rowToGo = isUp ? Math.max(1, curRow - rowToSkip) :
                                Math.min(maxRow, curRow + rowToSkip);
            }

            if (isUp && curRow === 1 || !isUp && lastRowNum === maxRow) {
                // no need for backend call
                return true;
            }

            $(".menu").hide();
            removeMenuKeyboardNavigation();
            gMouseEvents.setMouseDownTarget(null);
            $rowInput.val(rowToGo).trigger(fakeEvent.enter);

            return true;
        }

        return false;
    }

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
        setupTableColumnsMenu();
        JSONModal.setup();
        setupTooltips();
        setupMenuBar();
        scratchpadStartup();
        StatusMessage.setup();
        WSManager.setup();
        loadMonitorPanel();
        DagPanel.setup();
        FileBrowser.setup();
        Profile.setup();
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
        var wsOrder = WSManager.getOrders();
        var numWorksheets = wsOrder.length;

        for (var i = 0; i < numWorksheets; i++) {
            var wsId = wsOrder[i];
            var ws = worksheets[wsId];
            var wsTables = ws.tables;
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
            var wsHiddenTables = ws.hiddenTables;
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

                setupHiddenTable(tableName);
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

            setupHiddenTable(tableName);
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
                for (var c = 0; c < failures.length; c++) {
                    console.error(failures[c]);
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
        gMinModeOn = true; // startup use min mode;
        Compatible.check();
        setupThrift();

        checkXcalarVersionMatch()
        .then(startupFunctions)
        .then(initializeTable)
        .then(function() {
            WSManager.focusOnWorksheet();
            RightSideBar.initialize();
            Alert.setup();
            JoinModal.setup();
            AggModal.setup();
            OperationsModal.setup();
            WorkbookModal.setup();
            Scheduler.setup();
            DataFlowModal.setup();
            DFGPanel.setup();
            MultiCastModal.setup();
        })
        .then(function() {
            // this should come in last!
            KVStore.safeSetup();

            if (!isBrowseFireFox) {
                gMinModeOn = false; // turn off min mode
            }

            console.log('%c Have fun with Xcalar Insight! ',
            'background: linear-gradient(to bottom, #378cb3, #5cb2e8); ' +
            'color: #ffffff; font-size:20px; font-family:Open Sans, Arial;');

            // start heartbeat check
            Support.heartbeatCheck();
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
        })
        .always(function() {
            $('#initialLoadScreen').remove();
        });
    });
}

function xcDrag(event) {
    event.dataTransfer.setData("text", $(event.target).text());
}

