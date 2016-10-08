/*
    This file is where all the document.ready functions go.
    Any misc functions that kind of applies to the
    entire page and doesn't really have any specific purpose should come here as
    well.
*/
// ================================ Misc ======================================

function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') +
                 1).split('&');
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

function unloadHandler(isAsync, doNotLogout) {
    if (isAsync) {
        // async unload should only be called in beforeload
        // this time, no commit, only free result set
        // as commit may only partially finished, which is dangerous
        freeAllResultSets();
    } else {
        freeAllResultSetsSync()
        .then(function() {
            return Support.releaseSession();
        })
        .fail(function(error) {
            console.error(error);
        })
        .always(function() {
            removeUnloadPrompt();
            if (doNotLogout) {
                window.location = paths.index;
            } else {
                sessionStorage.setItem("xcalar-username", "");
                window.location = paths.dologout;
            }
        });
    }
}

function removeUnloadPrompt() {
    window.onbeforeunload = function() {}; // Do not enable prompt
    window.onunload = function() {}; // do not call unload again
}

function xcDrag(event) {
    event.dataTransfer.setData("text", $(event.target).text());
}

function setupOrphanedList(tableMap) {
    var tables = [];
    for (var table in tableMap) {
        tables.push(table);
    }
    gOrphanTables = tables;
}
// ========================== Document Ready ==================================
function documentReadyIndexFunction() {
    $(document).ready(StartManager.setup);
}

window.StartManager = (function(StartManager, $) {
    var setupStatus = SetupStatus.Setup;

    StartManager.setup = function() {
        // use promise for better unit test
        var deferred = jQuery.Deferred();
        gMinModeOn = true; // startup use min mode;
        $("body").addClass("xc-setup");

        setupUserBox();
        Compatible.check();
        setupThrift();
        // Support.setup() get username, so need to be at very eary time
        Support.setup();

        setupTooltips();
        MainMenu.setup();
        setupWorkspaceBar();
        StatusMessage.setup();
        BottomMenu.setup();
        DataStore.setup();
        TblMenu.setup();
        WSManager.setup();
        MonitorPanel.setup();
        DagPanel.setup();
        DataflowPanel.setup();
        setupModals();
        TutorialsSetup.setup();

        XVM.checkVersionMatch()
        .then(setupSession)
        .then(function() {
            // Extensions need to be moved to after version check because
            // somehow uploadUdf causes mgmtd to crash if checkVersion doesn't
            // pass
            setupExtensions();
            documentReadyGeneralFunction();
            WSManager.initialize();
            BottomMenu.initialize();
            Workbook.initialize();
            // restore user settings
            JoinView.restore();
            FileBrowser.restore();

            WSManager.focusOnWorksheet();
        })
        .then(function() {
            if (!isBrowseFireFox && !isBrowserIE) {
                gMinModeOn = false; // turn off min mode
            }

            setupStatus = SetupStatus.Success;

            console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
            'background-color: #5CB2E8; ' +
            'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

            XVM.commitVersionInfo();
            // start heartbeat check
            Support.heartbeatCheck();
            deferred.resolve();
        })
        .fail(function(error) {
            setupStatus = SetupStatus.Fail;
            setupWinResize();

            var title;
            if (error === WKBKTStr.NoWkbk){
                // when it's new workbook
                $('#initialLoadScreen').hide();
                Workbook.forceShow();
                var text = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
                StatusMessage.updateLocation(true, text);
            } else if (error === WKBKTStr.Hold) {
                // when seesion is hold by others
                Alert.show({
                    "title"  : WKBKTStr.Hold,
                    "msg"    : WKBKTStr.HoldMsg,
                    "buttons": [
                        {
                            "name"     : WKBKTStr.Release,
                            "className": "cancel",
                            "func"     : function() {
                                Support.forceReleaseSession();
                            }
                        }
                    ],
                    "noCancel": true
                });
            } else if (error.status === StatusT.StatusSessionNotFound) {
                Alert.show({
                    "title"     : WKBKTStr.NoOldWKBK,
                    "instr"     : WKBKTStr.NoOldWKBKInstr,
                    "msg"       : WKBKTStr.NoOldWKBKMsg,
                    "lockScreen": true,
                    "logout"    : true,
                    "buttons"   : [{
                        "name": WKBKTStr.NewWKBK,
                        "func": function() {
                            WorkbookManager.inActiveAllWKBK();
                        }
                    }],
                    "hideButtons": ['copySql']
                });
            } else if (error.status === StatusT.StatusSessionActiveElsewhere) {
                title = ThriftTStr.SessionElsewhere;
                Alert.error(title, error.error + '\n' +
                            ThriftTStr.LogInDifferent,
                            {"lockScreen": true});

            } else {
                // when it's an error from backend we cannot handle
                if (error.error != null && error.error.indexOf('Update required') !== -1) {
                    title = ThriftTStr.UpdateErr;
                } else if (error.error != null && error.error.indexOf('Connection') !== -1) {
                    title = ThriftTStr.CCNBEErr;
                } else {
                    title = ThriftTStr.SetupErr;
                }
                // check whether there's another alert that's already on the screen
                Alert.error(title, error, {"lockScreen": true});
                StatusMessage.updateLocation(true, StatusMessageTStr.Error);
            }

            deferred.reject(error);
        })
        .always(function() {
            $("body").removeClass("xc-setup");

            if (!gMinModeOn) {
                $("#initialLoadScreen").fadeOut(200, function() {
                    $("#initialLoadScreen").hide();
                    RowScroller.genFirstVisibleRowNum();
                });
            } else {
                $("#initialLoadScreen").hide();
                RowScroller.genFirstVisibleRowNum();
            }
        });

        // currently just used to center the modals on window resize
        function setupWinResize() {
            var winResizeTimer;
            var resizing = false;
            var modalSpecs;
            var windowSpecs = {
                winHeight: $(window).height(),
                winWidth : $(window).width()
            };

            $(window).resize(function() {
                if (!resizing) {
                    resizing = true;
                    var $modal = $('.modalContainer:visible');
                    if ($modal.length) {
                        modalSpecs = {
                            $modal: $modal,
                            top   : $modal.offset().top,
                            left  : $modal.offset().left
                        };
                    } else {
                        modalSpecs = null;
                    }
                }

                clearTimeout(winResizeTimer);
                winResizeTimer = setTimeout(winResizeStop, 100);
            });

            function winResizeStop() {
                if (modalSpecs) {
                    xcHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
                resizing = false;
            }
        }

        return deferred.promise();
    };

    StartManager.getStatus = function() {
        return setupStatus;
    };

    function setupSession() {
        var deferred = jQuery.Deferred();

        WorkbookManager.setup()
        .then(Support.holdSession)
        .then(Authentication.setup)
        .then(KVStore.restore)
        .then(initializeTable)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupExtensions() {
        try {
            ExtensionManager.setup();
            ExtensionPanel.setup();
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
        }
    }

    // excludes alert modal wish is set up earlier
    function setupModals() {
        Alert.setup();
        JSONModal.setup();
        Profile.setup();
        ExportView.setup();
        JoinView.setup();
        AggModal.setup();
        OperationsView.setup();
        Workbook.setup();
        DFCreateView.setup();
        DFGParamModal.setup();
        SmartCastView.setup();
        DeleteTableModal.setup();
        ExtModal.setup();
        AboutModal.setup();
    }

    function setupUserBox() {
        var $menu = $("#userMenu");
        addMenuBehaviors($menu);

        $("#userNameArea").click(function() {
            if ($menu.is(":visible")) {
                $menu.hide();
                return;
            }

            var $target = $(event.target);
            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": 1803, "y": 37}
            });
        });

        var username = sessionStorage.getItem("xcalar-fullUsername");
        if (username == null) {
            username = sessionStorage.getItem("xcalar-username");
        }

        $menu.on("click", ".help", function() {
            var $tab = $("#helpTab");
            if (!$tab.hasClass("active")) {
                $tab.click();
            }
        });

        $menu.on("click", ".about", function() {
            AboutModal.show();
        });

        $("#userName").text(username);

        $("#signout").click(function() {
            unloadHandler();
        });
    }

    function setupTooltips() {
        $("body").tooltip({
            "selector": '[data-toggle="tooltip"]',
            "html"    : true,
            "delay"   : {
                "show": 250,
                "hide": 100
            }
        });

        // element's delay attribute will take precedence - unique for xcalar

        $("body").on("mouseenter", '[data-toggle="tooltip"]', function() {
            $(".tooltip").hide();
        });
    }

    function setupWorkspaceBar() {
        RowScroller.setup();
        FnBar.setup();
    }

    function restoreActiveTable(tableId, failures) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var passedUpdate = false;

        table.beActive();

        table.getMetaAndResultSet()
        .then(function() {
            passedUpdate = true;
            return TblManager.parallelConstruct(tableId);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            failures.push("Add table " + table.getName() +
                        "fails: " + error.error);
            if (!passedUpdate) {
                table.beOrphaned();
                WSManager.removeTable(tableId);
            }
            // still resolve but push error failures
            deferred.resolve();
        });

        return deferred.promise();
    }

    function initializeTable() {
        var deferred = jQuery.Deferred();

        StatusMessage.updateLocation(true, StatusMessageTStr.LoadingTables);
        // since we are not storing any redo states on start up, we should
        // drop any tables that were undone since there's no way to go forward
        // to reach them
        WSManager.dropUndoneTables()
        .then(function() {
            return (xcHelper.getBackTableSet());
        })
        .then(function(backTableSet) {
            var tableId;
            var tableName;

            // check if some table has front meta but not backend info
            // if yes, delete front meta
            for (tableId in gTables) {
                tableName = gTables[tableId].tableName;
                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.warn(tableName, "is not in backend");
                    delete gTables[tableId];
                }
            }

            var hasTable = false;
            var promises = [];
            var failures = [];

            var ws;
            var wsId;
            var worksheets = WSManager.getWorksheets();
            var wsOrder = WSManager.getOrders();
            var numWorksheets = wsOrder.length; // counts only active worksheets

            for (var i = 0; i < numWorksheets; i++) {
                wsId = wsOrder[i];
                ws = worksheets[wsId];

                // deep copy because checkIfTableHasMeta may remove table from
                // array and mess up the position of the for loop
                var wsTables = xcHelper.deepCopy(ws.tables);
                var numWsTables = wsTables.length;

                if (!hasTable && numWsTables > 0) {
                    hasTable = true;
                }

                // create active table
                for (var j = 0; j < numWsTables; j++) {
                    tableId = wsTables[j];

                    if (!checkIfTableHasMeta(tableId, backTableSet)) {
                        continue;
                    }

                    promises.push(restoreActiveTable.bind(this, tableId, failures));
                }

                // create archived tables
                var wsArchivedTables = xcHelper.deepCopy(ws.archivedTables);
                var numArchivedWsTables = wsArchivedTables.length;
                for (var j = 0; j < numArchivedWsTables; j++) {
                    tableId = wsArchivedTables[j];

                    if (!checkIfTableHasMeta(tableId, backTableSet)) {
                        continue;
                    }

                    gTables[tableId].beArchived();
                }
            }

            // create no worksheet tables
            var noSheetTables = xcHelper.deepCopy(WSManager.getNoSheetTables());
            var numNoSheetTables = noSheetTables.length;

            for (var i = 0; i < numNoSheetTables; i++) {
                tableId = noSheetTables[i];

                if (!checkIfTableHasMeta(tableId, backTableSet, true)) {
                    continue;
                }

                gTables[tableId].beArchived();
            }

            // set up tables in hidden worksheets
            var hiddenWorksheets = WSManager.getHiddenWS();
            var numHiddenWsTables = hiddenWorksheets.length;
            var numTables;
            var numArchivedTables;

            for (var i = 0; i < numHiddenWsTables; i++) {
                wsId = hiddenWorksheets[i];
                ws = xcHelper.deepCopy(worksheets[wsId]);
                numTables = ws.tempHiddenTables.length;

                for (var j = 0; j < numTables; j++) {
                    tableId = ws.tempHiddenTables[j];
                    checkIfTableHasMeta(tableId, backTableSet);
                }

                numArchivedTables = ws.archivedTables.length;

                for (var j = 0; j < numArchivedTables; j++) {
                    tableId = ws.archivedTables[j];
                    checkIfTableHasMeta(tableId, backTableSet);
                }
            }

            // setup leftover tables
            setupOrphanedList(backTableSet);

            PromiseHelper.chain(promises)
            .then(function() {
                if (hasTable) {
                    RowScroller.resize();
                } else {
                    $('#mainFrame').addClass('empty');
                }
                StatusMessage.updateLocation();

                if (failures.length > 0) {
                    for (var c = 0; c < failures.length; c++) {
                        console.error(failures[c]);
                    }
                }

                deferred.resolve();
            })
            .fail(deferred.reject);
        })
        .fail(function(error) {
            console.error("InitializeTable fails!", error);
            deferred.reject(error);
        });

        function checkIfTableHasMeta(tableId, backTableSet, isNoSheetTable) {
            var curTable = gTables[tableId];

            if (curTable == null) {
                if (isNoSheetTable) {
                    // this case is fine since some are in agg table list
                    console.info("not find table", tableId);
                } else {
                    WSManager.removeTable(tableId);
                    console.error("not find table", tableId);
                }

                return false;
            } else {
                delete backTableSet[curTable.getName()];
                return true;
            }
        }

        return deferred.promise();
    }

    function documentReadyGeneralFunction() {
        var $rowInput = $("#rowInput");
        var backspaceIsPressed = false;

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
                case keyCode.Y:
                case keyCode.Z:
                    checkUndoRedo(event);
                    break;
                default:
                    break;
            }

            if (isPreventEvent) {
                event.preventDefault();
            }
        });

        $(document).keyup(function(event) {
            if (event.which === keyCode.Backspace) {
                backspaceIsPressed = false;
            }
        });

        $("#autoSaveBtn").click(function() {
            var $btn = $(this);
            xcHelper.disableSubmit($btn);

            KVStore.commit()
            .then(function() {
                xcHelper.showSuccess();
            })
            .fail(function(error) {
                Alert.error(AlertTStr.Error, error);
            })
            .always(function() {
                xcHelper.enableSubmit($btn);
            });
        });

        window.onbeforeunload = function() {
            unloadHandler(true);
            if (SQL.hasUnCommitChange() || KVStore.hasUnCommitChange()) {
                return CommonTxtTstr.LogoutWarn;
            } else if (backspaceIsPressed) {
                // when no commit change but may caused by backSapce
                backspaceIsPressed = false; // reset
                return CommonTxtTstr.LeaveWarn;
            } else {
                // when no change, no need to warn
                return null;
            }
        };

        var winResizeTimer;
        var resizing = false;
        var otherResize = false; // true if winresize is triggered by 3rd party code
        var modalSpecs;
        var windowSpecs = {
            winHeight: $(window).height(),
            winWidth : $(window).width()
        };

        $(window).resize(function(event) {
            if (!resizing) {
                $('.menu').hide();
                $('#dagScrollBarWrap').hide();
                resizing = true;
                var $modal = $('.modalContainer:visible');
                if ($modal.length) {
                    modalSpecs = {
                        $modal: $modal,
                        top   : $modal.offset().top,
                        left  : $modal.offset().left
                    };
                } else {
                    modalSpecs = null;
                }
            }

            if (event.target !== window) {
                otherResize = true;
            } else {
                otherResize = false;
                moveTableTitles();
            }
            clearTimeout(winResizeTimer);
            winResizeTimer = setTimeout(winResizeStop, 100);
        });

        function winResizeStop() {
            if (otherResize) {
                otherResize = false;
            } else {
                var table = gTables[gActiveTableId];
                if (table && table.resultSetCount !== 0) {
                    RowScroller.genFirstVisibleRowNum();
                    RowScroller.updateViewRange(gActiveTableId);
                }
                moveTableDropdownBoxes();
                TblManager.adjustRowFetchQuantity();
                DagPanel.setScrollBarId($(window).height());
                DagPanel.adjustScrollBarPositionAndSize();
                if (modalSpecs) {
                    xcHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
            }
            resizing = false;
        }


        // using this to keep window from scrolling on dragdrop
        $(window).scroll(function() {
            $(this).scrollLeft(0);
        });

        // using this to keep window from scrolling up and down;
        $('#container').scroll(function() {
            $(this).scrollTop(0);
        });

        var mainFrameScrolling = false;
        var mainFrameScrollTimer;
        var scrollPrevented = false;
        $('#mainFrame').scroll(function() {
            if (!mainFrameScrolling) {
                mainFrameScrolling = true;
                // apply the following actions only once per scroll session
                $('.menu').hide();
                removeMenuKeyboardNavigation();
                $(".highlightBox").remove();
                // table head's dropdown has position issue if not hide
                $('.xcTheadWrap').find('.dropdownBox')
                                 .addClass('dropdownBoxHidden');
                $('.tooltip').hide();
                if ($(this).hasClass('scrollLocked')) {
                    scrollPrevented = true;
                }
            }
            $(this).scrollTop(0);

            clearTimeout(mainFrameScrollTimer);
            mainFrameScrollTimer = setTimeout(mainFrameScrollingStop, 300);
            if (!scrollPrevented) {
                moveFirstColumn();
                moveTableTitles();
            }
        });

        function mainFrameScrollingStop() {
            $('.xcTheadWrap').find('.dropdownBox')
                             .removeClass('dropdownBoxHidden');
            moveTableDropdownBoxes();
            mainFrameScrolling = false;
            scrollPrevented = false;
        }

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
            }

            if (!$('#workspacePanel').hasClass('active')) {
                // if not on workspace panel, then we're done
                return;
            }

            // some code mirror elements don't have parents for some reason
            // such as the pre tag
            if (!$target.hasClass('fnbarPre') &&
                !$target.hasClass('CodeMirror-cursor') &&
                !$target.closest('.CodeMirror-hint').length &&
                !$target.closest('.fnbarPre').length &&
                !$target.closest('#functionArea').length &&
                !$target.closest('.header').length &&
                !($target.closest('pre').length &&
                  $target.parents('html').length === 0)) {
                if ($target.closest('.selectedCell').length !== 0) {
                    return;
                } else if ($target.attr('id') === 'mainFrame') {
                    return;
                } else if ($target.closest('.menu').length !== 0) {
                    return;
                }
                $('.selectedCell').removeClass('selectedCell');
                FnBar.clear();
            }
        });

        $(document).click(function(event) {
            gLastClickTarget = $(event.target);
        });

        $(window).blur(function() {
            $('.menu').hide();
            removeMenuKeyboardNavigation();
            StatusBox.forceHide();
        });

        if (!window.isBrowseChrome) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

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
                var lastRowNum = RowScroller.getLastVisibleRowNum(tableId);
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

        function checkUndoRedo(event) {
            if (!(isSystemMac && event.metaKey) &&
                !(!isSystemMac && event.ctrlKey))
            {
                return;
            }
            if ($('#workspacePanel').hasClass('active') &&
                !$('#container').hasClass('columnPicker') &&
                !$('.modalContainer:visible').length &&
                !$('textarea:focus').length &&
                !$('input:focus').length) {

                event.preventDefault();
                $('.menu').hide();
                removeMenuKeyboardNavigation();
                $('.highlightBox').remove();

                if (event.which === keyCode.Z) {
                    $('#undo').click();
                } else if (event.which === keyCode.Y) {
                    $('#redo').click();
                }
            }
        }
    }

    return StartManager;
}({}, jQuery));
