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
        TblManager.freeAllResultSets();
    } else {
        TblManager.freeAllResultSetsSync()
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
                logoutRedirect();
            }
        });
    }
}

function logoutRedirect() {
    xcSessionStorage.removeItem("xcalar-username");
    xcSessionStorage.removeItem("xcalar-fullUsername");
    window.location = paths.dologout;
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

        setupUserArea();
        Compatible.check();
        setupThrift();
        // Support.setup() get username, so need to be at very eary time
        Support.setup();
        XVM.setup();

        xcTooltip.setup();
        CSHelp.setup();
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
        Admin.initialize();
        xcSuggest.setup();

        XVM.checkVersionMatch()
        .then(XVM.checkKVVersion)
        .then(setupSession)
        .then(function() {
            DataStore.initialize();
            // Extensions need to be moved to after version check because
            // somehow uploadUdf causes mgmtd to crash if checkVersion doesn't
            // pass
            // Extmanager promise so unit test can wait on resolution.
            var extPromise = setupExtensions();
            documentReadyGeneralFunction();
            WSManager.initialize();
            BottomMenu.initialize();
            Workbook.initialize();
            DataflowPanel.initialize();
            // restore user settings
            JoinView.restore();
            FileBrowser.restore();

            XVM.initMode();

            WSManager.focusOnWorksheet();
            // This adds a new failure mode to setup.
            return extPromise;
        })
        .then(function() {
            if (!isBrowserFirefox && !isBrowserIE) {
                gMinModeOn = false; // turn off min mode
            }

            setupStatus = SetupStatus.Success;

            console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
            'background-color: #5CB2E8; ' +
            'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

            XVM.alertLicenseExpire();
            // start heartbeat check
            Support.heartbeatCheck();
            deferred.resolve();
        })
        .fail(function(error) {
            $("body").addClass("xc-setup-error");
            setupStatus = SetupStatus.Fail;
            setupWinResize();

            var title;
            if (error === WKBKTStr.NoWkbk){
                // when it's new workbook
                $('#initialLoadScreen').hide();
                Workbook.forceShow();
                var text = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
                StatusMessage.updateLocation(true, text);
                Admin.addNewUser();
            } else if (error === WKBKTStr.Hold) {
                // when seesion is hold by others
                Alert.show({
                    "title": WKBKTStr.Hold,
                    "msg": WKBKTStr.HoldMsg,
                    "buttons": [
                        {
                            "name": CommonTxtTstr.Back,
                            "className": "cancel",
                            "func": function() {
                                logoutRedirect();
                            }
                        },
                        {
                            "name": WKBKTStr.Release,
                            "className": "cancel",
                            "func": function() {
                                Support.forceReleaseSession();
                            }
                        }
                    ],
                    "noCancel": true
                });
            } else if (error.status === StatusT.StatusSessionNotFound) {
                Alert.show({
                    "title": WKBKTStr.NoOldWKBK,
                    "instr": WKBKTStr.NoOldWKBKInstr,
                    "msg": WKBKTStr.NoOldWKBKMsg,
                    "lockScreen": true,
                    "logout": true,
                    "buttons": [{
                        "name": WKBKTStr.NewWKBK,
                        "func": function() {
                            WorkbookManager.inActiveAllWKBK();
                        }
                    }],
                    "hideButtons": ['copySql']
                });
            } else if (error.status === StatusT.StatusSessionUsrActiveElsewhere) {
                title = ThriftTStr.SessionElsewhere;
                Alert.error(title, error.error + '\n' +
                            ThriftTStr.LogInDifferent,
                            {"lockScreen": true});

            } else {
                // when it's an error from backend we cannot handle
                var errorStruct = {"lockScreen": true};
                if (error && error.error != null && error.error.indexOf('expired') !== -1) {
                    errorStruct = {"lockScreen": true, "expired": true};
                } else if (error.error != null && error.error.indexOf('Update required') !== -1) {
                    title = ThriftTStr.UpdateErr;
                } else if (error.error != null && error.error.indexOf('Connection') !== -1) {
                    title = ThriftTStr.CCNBEErr;
                } else {
                    title = ThriftTStr.SetupErr;
                }
                // check whether there's another alert that's already on the screen
                Alert.error(title, error, errorStruct);
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
                winWidth: $(window).width()
            };

            $(window).resize(function() {
                if (!resizing) {
                    resizing = true;
                    var $modal = $('.modalContainer:visible');
                    if ($modal.length) {
                        modalSpecs = {
                            $modal: $modal,
                            top: $modal.offset().top,
                            left: $modal.offset().left
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

    StartManager.isStart = function() {
        return $("body").hasClass("xc-setup") ||
               $("body").hasClass("xc-setup-error");
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
            var extPromise = ExtensionManager.setup();
            ExtensionPanel.setup();
            return extPromise;
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
            return PromiseHelper.reject();
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
        DFParamModal.setup();
        SmartCastView.setup();
        DeleteTableModal.setup();
        ExtModal.setup();
        LicenseModal.setup();
        SupTicketModal.setup();
        AboutModal.setup();
    }

    function setupUserArea() {
        setupUserBox();
        setupMemoryAlert();
    }

    function setupUserBox() {
        var $menu = $("#userMenu");
        addMenuBehaviors($menu);

        $("#userNameArea").click(function() {
            var $target = $(this);
            xcHelper.dropdownOpen($target, $menu, {
                "offsetY": -3,
                "toggle": true
            });
        });

        var username = xcSessionStorage.getItem("xcalar-fullUsername");
        if (username == null) {
            username = xcSessionStorage.getItem("xcalar-username");
        }

        $menu.on("mouseup", ".help", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $tab = $("#helpTab");
            if (!$tab.hasClass("active")) {
                $tab.click();
            }
        });

        $menu.on("mouseup", ".about", function(event) {
            if (event.which !== 1) {
                return;
            }
            AboutModal.show();
        });

        $menu.on('mouseup', ".setup", function(event) {
            if (event.which !== 1) {
                return;
            }
            // visible to admin only
            MainMenu.openPanel('monitorPanel');
            $('#setupButton').click();
            MainMenu.open(true);
        });

        $("#userName").text(username);

        $("#signout").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            unloadHandler();
        });
    }

    function setupMemoryAlert() {
        $("#memoryAlert").click(function() {
            if ($(this).hasClass("tableAlert")) {
                DeleteTableModal.show();
            } else {
                // go to datastore panel
                var $datastoreTab = $("#dataStoresTab");
                if (!$datastoreTab.hasClass("active")) {
                    $datastoreTab.click();
                }

                if (!$datastoreTab.hasClass("mainMenuOpen")) {
                    $datastoreTab.click();
                }

                var $inButton = $("#inButton");
                if (!$inButton.hasClass("active")) {
                    $inButton.click();
                }
            }
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
        var failures = [];
        var hasTable = false;
        var noMetaTables = [];

        StatusMessage.updateLocation(true, StatusMessageTStr.LoadingTables);
        // since we are not storing any redo states on start up, we should
        // drop any tables that were undone since there's no way to go forward
        // to reach them
        WSManager.dropUndoneTables()
        .then(function() {
            return xcHelper.getBackTableSet();
        })
        .then(function(backTableSet) {
            syncTableMetaWithBackTable(backTableSet);
            var promises = syncTableMetaWithWorksheet(backTableSet);
            cleanNoMetaTables();
            // setup leftover tables
            setupOrphanedList(backTableSet);

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            if (hasTable) {
                RowScroller.resize();
            } else {
                $("#mainFrame").addClass("empty");
            }
            StatusMessage.updateLocation();

            failures.forEach(function(fail) {
                console.error(fail);
            });

            deferred.resolve();
        })
        .fail(function(error) {
            console.error("InitializeTable fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();

        function syncTableMetaWithBackTable(backTableSet) {
            // check if some table has front meta but not backend info
            // if yes, delete front meta (gTables and wsManager)
            for (var tableId in gTables) {
                var tableName = gTables[tableId].getName();
                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.warn(tableName, "is not in backend");
                    WSManager.removeTable(tableId);
                    delete gTables[tableId];
                }
            }
        }

        function syncTableMetaWithWorksheet(backTableSet) {
            var promises = [];
            var worksheetList = WSManager.getWSList();

            worksheetList.forEach(function(worksheetId) {
                var worksheet = WSManager.getWSById(worksheetId);
                if (!hasTable && worksheet.tables.length > 0) {
                    hasTable = true;
                }

                worksheet.tables.forEach(function(tableId) {
                    if (checkIfHasTableMeta(tableId, backTableSet)) {
                        promises.push(restoreActiveTable.bind(window, tableId,
                                                                failures));
                    }
                });

                // check archived tables
                worksheet.archivedTables.forEach(function(tableId) {
                    if (checkIfHasTableMeta(tableId, backTableSet)) {
                        gTables[tableId].beArchived();
                    }
                });
            });

            // check no worksheet tables
            var noSheetTables = WSManager.getNoSheetTables();
            noSheetTables.forEach(function(tableId) {
                if (checkIfHasTableMeta(tableId, backTableSet)) {
                    gTables[tableId].beArchived();
                }
            });

            // set up tables in hidden worksheets
            var hiddenWorksheets = WSManager.getHiddenWSList();
            hiddenWorksheets.forEach(function(worksheetId) {
                var worksheet = WSManager.getWSById(worksheetId);
                if (worksheet == null) {
                    // this is error case
                    return;
                }

                worksheet.tempHiddenTables.forEach(function(tableId) {
                    checkIfHasTableMeta(tableId, backTableSet);
                });

                worksheet.archivedTables.forEach(function(tableId) {
                    checkIfHasTableMeta(tableId, backTableSet);
                });
            });

            return promises;
        }

        function checkIfHasTableMeta(tableId, backTableSet) {
            var table = gTables[tableId];
            if (table == null) {
                noMetaTables.push(tableId);
                return false;
            } else {
                var tableName = table.getName();
                delete backTableSet[tableName];
                return true;
            }
        }

        function cleanNoMetaTables() {
            noMetaTables.forEach(function(tableId) {
                console.info("not find table", tableId);
                WSManager.removeTable(tableId);
            });
        }
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
                xcHelper.showSuccess(SuccessTStr.Saved);
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
            winWidth: $(window).width()
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
                        top: $modal.offset().top,
                        left: $modal.offset().left
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

                if ($(this).hasClass('scrollLocked')) {
                    scrollPrevented = true;
                } else {
                    $('.menu').hide();
                }

                removeMenuKeyboardNavigation();
                $(".highlightBox").remove();
                // table head's dropdown has position issue if not hide
                $('.xcTheadWrap').find('.dropdownBox')
                                 .addClass('dropdownBoxHidden');
                $('.tooltip').hide();
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
            if (window.isBrowserMicrosoft && event.shiftKey) {
                // prevents text from being selected on shift click
                var cachedFn = document.onselectstart;
                document.onselectstart = function() {
                    return false;
                };
                setTimeout(function() {
                    document.onselectstart = cachedFn;
                }, 0);
            }

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

        var dragCount = 0; // tracks document drag enters and drag leaves
        // as multiple enters/leaves get triggered by children
        $(document).on('dragenter', function(event) {
            var dt = event.originalEvent.dataTransfer;
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {

                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';

                $('.fileDroppable').addClass('fileDragging');
                dragCount++;
            }
        });

        $(document).on('dragover', function(event) {
            var dt = event.originalEvent.dataTransfer;
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';
            }
        });

        $(document).on('dragleave', function(event) {
            var dt = event.originalEvent.dataTransfer;
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                dragCount--;
                if (dragCount === 0) {
                    $('.fileDroppable').removeClass('fileDragging');
                }
            }
        });

        $(document).on('drop', function(event) {
            event.preventDefault();
            $('.fileDroppable').removeClass('fileDragging');
        });

        $(window).blur(function() {
            $('.menu').hide();
            removeMenuKeyboardNavigation();
            StatusBox.forceHide();
        });

        setupMouseWheel();

        if (!window.isBrowserChrome) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

        window.onerror = function(error, url, line, column) {
            var mouseDownTargetHTML = "";
            var $lastTarget = gMouseEvents.getLastMouseDownTarget();
            if ($lastTarget && !$lastTarget.is(document)) {
                mouseDownTargetHTML = $lastTarget.clone().empty()[0].outerHTML;
            }
            var mouseDownTime = gMouseEvents.getLastMouseDownTime();

            var info = {
                "error": error,
                "url": url,
                "line": line,
                "column": column,
                "lastMouseDown": {
                    "el": mouseDownTargetHTML,
                    "time": mouseDownTime
                }
            };

            xcConsole.log(error, url + ":" + line + ":" + column);

            SQL.errorLog("Console error", null, null, info);
        };

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
                xcAssert((lastRowNum != null), "Error Case!");

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
                !$('.modalContainer:not(#aboutModal):visible').length &&
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

    function isRetinaDevice() {
        return window.devicePixelRatio > 1;
    }

    function reImplementMouseWheel(e) {
        var deltaX = e.originalEvent.wheelDeltaX * -1;
        var deltaY = e.originalEvent.wheelDeltaY;
        if (isNaN(deltaX)) {
            deltaX = e.deltaX;
        }
        if (isNaN(deltaY)) {
            deltaY = e.deltaY;
        }
        var x = Math.abs(deltaX);
        var y = Math.abs(deltaY);

        // iterate over the target and all its parents in turn
        var $target = $(e.target);
        var $pathToRoot = $target.add($target.parents());

        $($pathToRoot.get().reverse()).each(function() {
            var $el = $(this);
            var delta;

            if ($el.css("overflow") !== "hidden") {
                // do horizontal scrolling
                if (deltaX > 0) {
                    var scrollWidth = $el.prop("scrollWidth");
                    var scrollLeftMax = scrollWidth - $el.outerWidth();
                    if ($el.scrollLeft() < scrollLeftMax) {
                        // we can scroll right
                        delta = scrollLeftMax - $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() + delta);
                    }
                } else {
                    if ($el.scrollLeft() > 0) {
                        // we can scroll left
                        delta = $el.scrollLeft();
                        if (x < delta) {
                            delta = x;
                        }
                        x -= delta;
                        $el.scrollLeft($el.scrollLeft() - delta);
                    }
                }

                // do vertical scrolling
                if (deltaY < 0) {
                    var scrollHeight = $el.prop("scrollHeight");
                    var scrollTopMax = scrollHeight - $el.outerHeight();
                    if ($el.scrollTop() < scrollTopMax) {
                        // we can scroll down
                        delta = scrollTopMax - $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() + delta);
                    }
                } else {
                    if ($el.scrollTop() > 0) {
                        // we can scroll up
                        delta = $el.scrollTop();
                        if (y < delta) {
                            delta = y;
                        }
                        y -= delta;
                        $el.scrollTop($el.scrollTop() - delta);
                    }
                }
            }
        });
    }

    // Note: This including two cases in mac
    // Case 1: if it's Chrome in retina dispaly or fireforx
    // reimplement the wheel scroll to resolve the jitter issue
    // and the same time, it can prevent both back/forwad swipe
    // Case 2: for other cases, only prevent back swipe
    // (not found a good soution to also prevent forward)
    function setupMouseWheel() {
        $(window).on("mousewheel", function(event) {
            // This code is only valid for Mac
            if (!window.isSystemMac) {
                return;
            }

            var isBrowserToHandle = window.isBrowserChrome
                                || window.isBrowserFirefox
                                || window.isBrowserSafari;
            if (!isBrowserToHandle) {
                return;
            }

            if (window.isBrowserChrome && isRetinaDevice()
                || window.isBrowserFirefox)
            {
                reImplementMouseWheel(event);
                // prevent back/forward swipe
                event.preventDefault();
                return;
            }

            var $parents = $(event.target).parents();
            // If none of the parents can be scrolled left
            // when we try to scroll left
            var prevent_left = event.deltaX < 0 && $parents.filter(function() {
                return $(this).scrollLeft() > 0;
            }).length === 0;

            // If none of the parents can be scrolled up
            // when we try to scroll up
            var prevent_up = event.deltaY > 0 && !$parents.filter(function() {
                return $(this).scrollTop() > 0;
            }).length === 0;
            // Prevent swipe scroll,
            // which would trigger the Back/Next page event
            if (prevent_left || prevent_up) {
                event.preventDefault();
            }
        });
    }

    return StartManager;
}({}, jQuery));
