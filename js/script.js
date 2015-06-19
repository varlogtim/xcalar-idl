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
    "minCellHeight"  : 30,
    "cellMinWidth"   : 20,
    "first"          : true,
    "clicks"         : 0,
    "delay"          : 500,
    "timer"          : null,
    "lastCellGrabbed": false,
    "minNumRows"     : 60,
    "maxNumRows"     : 80
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

// ================================ Misc ======================================
function infScrolling(tableNum) {
    var $rowScroller = $('#rowScrollerArea');
    var scrollCount = 0;

    $("#xcTbodyWrap" + tableNum).scroll(function() {
        if (gMouseStatus === "movingTable") {
            return;
        }
        if ($rowScroller.hasClass('autoScroll')) {
            $rowScroller.removeClass('autoScroll');
            return;
        }
        var dynTableNum = parseInt($(this).attr("id")
                           .substring("xcTbodyWrap".length));
        focusTable(dynTableNum);
        var table = $('#xcTable' + dynTableNum);
        if (table.height() < $('#mainFrame').height()) {
            // prevent scrolling on a short table
            $(this).scrollTop(0);
        }

        var innerDeferred = jQuery.Deferred();
        var firstRow = table.find('tbody tr:first');
        var topRowNum = parseInt(firstRow.attr('class').substr(3));
        var info;
        var numRowsToAdd;

        if (firstRow.length === 0) {
            innerDeferred.resolve();
        } else if ($(this).scrollTop() === 0 &&
            firstRow.attr('class') !== 'row0')
        {
            scrollCount++;
            
            if (scrollCount < 2) {
                // var initialTop = firstRow.offset().top;
                numRowsToAdd = Math.min(gNumEntriesPerPage, topRowNum);

                var rowNumber = topRowNum - numRowsToAdd;
                var lastRowToDisplay = table.find('tbody tr:lt(40)');

                info = {
                    "numRowsToAdd"    : numRowsToAdd,
                    "numRowsAdded"    : 0,
                    "targetRow"       : rowNumber,
                    "lastRowToDisplay": lastRowToDisplay,
                    "bulk"            : false,
                    "tableNum"        : dynTableNum
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
                   $(this).outerHeight() <= 1) {
            scrollCount++;

            if (scrollCount < 2) {
                numRowsToAdd = Math.min(gNumEntriesPerPage,
                                gTables[dynTableNum].resultSetMax -
                                gTables[dynTableNum].currentRowNumber);
                info = {
                    "numRowsToAdd": numRowsToAdd,
                    "numRowsAdded": 0,
                    "targetRow"   : gTables[dynTableNum].currentRowNumber +
                                    numRowsToAdd,
                    "lastRowToDisplay": gTables[dynTableNum].currentRowNumber +
                                        numRowsToAdd,
                    "bulk"    : false,
                    "tableNum": dynTableNum
                };
                
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
    setupRowScroller();
    setupMainPanelsTab();
    setupFunctionBar();
}

function setupFunctionBar() {
    $("#fnBar").on({
        "input": function() {
            if ($(".scratchpad").has(gFnBarOrigin).length !== 0 &&
                $(this).val().indexOf("=") === 0) {
                enterEquationMode();
            }
        },
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

function setupRowScroller() {
    // entuer row num to go to that row
    var $rowInput = $("#rowInput");
    $rowInput.keypress(function(event) {
        if (event.which !== keyCode.Enter) {
            return;
        }

        var targetRow = parseInt($rowInput.val());
        var backRow   = targetRow;

        if (isNaN(targetRow) || targetRow % 1 !== 0) {
            return;
        }

        if (gTables[gActiveTableNum].resultSetCount === 0) {
            $rowInput.val("0");
            $rowInput.data("val", 0);
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

        backRow = Math.min(gTables[gActiveTableNum].resultSetMax - 60,
                            backRow - 20);

        if (backRow < 0) {
            backRow = 0;
        }

        var numRowsToAdd = 60;
        var info = {
            "numRowsToAdd"    : numRowsToAdd,
            "numRowsAdded"    : 0,
            "lastRowToDisplay": backRow + 60,
            "targetRow"       : targetRow,
            "bulk"            : true,
            "tableNum"        : gActiveTableNum
        };

        goToPage(backRow, numRowsToAdd, RowDirection.Bottom, false, info)
        .then(function() {
            var rowToScrollTo = Math.min(targetRow,
                                gTables[gActiveTableNum].resultSetMax);
            positionScrollbar(rowToScrollTo, gActiveTableNum);
            generateFirstVisibleRowNum();
            if (!event.rowScrollerMousedown) {
                moverowScroller($('#rowInput').val(),
                                 gTables[gActiveTableNum].resultSetCount);
            } else {
                $('#rowScrollerArea').addClass('autoScroll');
            }
        });
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

function setupHiddenTable(tableName) {
    var deferred = jQuery.Deferred();

    setTableMeta(tableName)
    .then(function(newTableMeta) {
        gHiddenTables.push(newTableMeta);
        var lastIndex = gHiddenTables.length - 1;
        var index = getIndex(gHiddenTables[lastIndex].tableName);
        if (index && index.length > 0) {
            gHiddenTables[lastIndex].tableCols = index;
        } else {
            console.log("Not stored", gHiddenTables[lastIndex].tableName);
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
        delay   : {
            "show": 200,
            "hide": 100
        }
    });

    $("body").on('mouseenter', '[data-toggle="tooltip"]', function() {
        $('.tooltip').hide();
    });    
}

// ========================== Document Ready ==================================

function documentReadyxcTableFunction() {
    resizeRowInput();
    
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
        timer = setTimeout(function() {
            if (gTables[gActiveTableNum] &&
                gTables[gActiveTableNum].resultSetCount !== 0) {
                generateFirstVisibleRowNum();
            }
            moveTableDropdownBoxes();
        }, 100);
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
        
        clearTimeout(timer);
        timer = setTimeout(function() {
            moveTableDropdownBoxes();
        }, 300);

        moveFirstColumn();
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
        if (!clickable && $target.closest('.dropdownBox').length === 0) {
            $('.colMenu').hide();
            $('body').removeClass('noSelection');
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
            // case ("movingJson"):
            //     JSONModal.mouseUp();
            //     break;
            case ("rowScroller"):
                rowScrollerMouseUp();
                break;
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
        setupMenuBar();
        scratchpadStartup();
        setupBookmarkArea();
        WSManager.setup();
        loadMonitorPanel();
        DagPanel.setup();
        FileBrowser.setup();
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("startupFsetupBookmarkAreaunctions fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function initializeTable() {
    var deferred   = jQuery.Deferred();
    var tableCount = 0;

    if (jQuery.isEmptyObject(gTableIndicesLookup)) {
        $('#mainFrame').addClass('empty');
        deferred.resolve();
    } else {
        var promises = [];
        var failures = [];

        var tableName;

        for (var i = 0; i < gTableOrderLookup.length; i++) {
            ++tableCount;
            tableName = gTableOrderLookup[i];

            promises.push((function(index, tableName) {
                var innerDeferred = jQuery.Deferred();

                addTable(tableName, index, null, null)
                .then(innerDeferred.resolve)
                .fail(function(thriftError) {
                    failures.push("Add table " + tableName +
                                 "fails: " + thriftError.error);
                    innerDeferred.resolve(error);
                });

                return (innerDeferred.promise());
            }).bind(this, i, tableName));
        }

        for (tName in gTableIndicesLookup) {
            var table = gTableIndicesLookup[tName];

            if (!table.active) {
                ++tableCount;
                tableName = table.tableName;

                promises.push((function(tableName) {
                    var innerDeferred = jQuery.Deferred();

                    setupHiddenTable(tableName)
                    .then(innerDeferred.resolve)
                    .fail(function(thriftError) {
                        failures.push("set hidden table " + tableName +
                                     "fails: " + thriftError.error);
                        innerDeferred.resolve(error);
                    });

                    return (innerDeferred.promise());
                }).bind(this, tableName));
            }
        }

        chain(promises)
        .then(function() {
            if (gTableOrderLookup.length > 0) {
                documentReadyxcTableFunction();
            } else {
                $('#mainFrame').addClass('empty');
            }

            if (failures.length > 0) {
                for (var i = 0; i < failures.length; i++) {
                    console.error(failures[i]);
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
            console.error("InitializeTable fails!", error);
            deferred.reject(error);
        });
    }

    return (deferred.promise());
}

function documentReadyIndexFunction() {
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
            console.error("Initialization fails!", error);
        });
    });
}
