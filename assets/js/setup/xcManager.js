window.xcManager = (function(xcManager, $) {
    var setupStatus;

    xcManager.setup = function() {
        setupStatus = SetupStatus.Setup;
        // use promise for better unit test
        var deferred = jQuery.Deferred();
        gMinModeOn = true; // startup use min mode;
        $("body").addClass("xc-setup");
        $("#favicon").attr("href", paths.favicon);

        Compatible.check();
        setupThrift();
        // XcSupport.setup() get username, so need to be at very early time
        XcSupport.setup();
        XVM.setup();

        setupUserArea();
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
        JupyterPanel.setup();
        setupModals();
        TutorialsSetup.setup();
        Admin.initialize();
        xcSuggest.setup();
        documentReadyGeneralFunction();
        XcSocket.init();

        var firstTimeUser;

        XVM.checkVersionAndLicense()
        .then(XVM.checkKVVersion)
        .then(function(isFirstTimeUser) {
            firstTimeUser = isFirstTimeUser;
        })
        .then(function() {
            // First XD instance to run since cluster restart
            return oneTimeSetup();
        })
        .then(setupSession)
        .then(setupConfigParams)
        .then(function() {
            StatusMessage.updateLocation(true,
                                        StatusMessageTStr.SettingExtensions);
            DataStore.initialize();
            // Extensions need to be moved to after version check because
            // somehow uploadUdf causes mgmtd to crash if checkVersion doesn't
            // pass
            // Extmanager promise so unit test can wait on resolution.
            var extPromise = setupExtensions();
            WSManager.initialize(); // async
            BottomMenu.initialize(); // async
            Workbook.initialize();
            DataflowPanel.initialize(); // async if has df
            // restore user settings
            JoinView.restore();
            FileBrowser.restore();
            JupyterPanel.initialize();

            XVM.initMode();

            WSManager.focusOnWorksheet();
            // This adds a new failure mode to setup.
            return extPromise;
        })
        .then(function() {
            StatusMessage.updateLocation();
            if (!isBrowserFirefox && !isBrowserIE) {
                gMinModeOn = false; // turn off min mode
            }

            setupStatus = SetupStatus.Success;

            console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
            'background-color: #5CB2E8; ' +
            'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

            XVM.alertLicenseExpire();
            // get initial memory usage
            XcSupport.memoryCheck();
            // start heartbeat check
            XcSupport.heartbeatCheck();
            deferred.resolve();
        })
        .fail(function(error) {
            $("body").addClass("xc-setup-error");
            setupStatus = SetupStatus.Fail;
            handleSetupFail(error, firstTimeUser);
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

        return deferred.promise();
    };

    function handleSetupFail(error, firstTimeUser) {
        var locationText = StatusMessageTStr.Error;
        var isNotNullObj = error && (typeof error === "object");
        if (error === WKBKTStr.NoWkbk){
            // when it's new workbook
            $("#initialLoadScreen").hide();
            Workbook.forceShow();
            locationText = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
            // start socket (no workbook is also a valid login case)
            XcSupport.holdSession()
            .always(function() {
                if (firstTimeUser) {
                    Admin.addNewUser();
                    // when it's new user first time login
                    Alert.show({
                        "title": DemoTStr.title,
                        "msg": NewUserTStr.msg,
                        "buttons": [{
                            "name": AlertTStr.CLOSE,
                            "className": "cancel"
                        },
                        {
                            "name": NewUserTStr.openGuide,
                            "className": "confirm",
                            "func": function() {
                                var url = "https://university.xcalar.com/" +
                                        "confluence/display/XU/Self-Paced+Training";
                                window.open(url, "_blank");
                            }
                        }],
                        "noCancel": true
                    });
                }
            });
        } else if (error === WKBKTStr.Hold) {
            // when seesion is hold by others and user choose to log out
            logoutRedirect();
        } else if (isNotNullObj &&
                   error.status != null &&
                   error.status === StatusT.StatusSessionNotFound)
        {
            locationText = WKBKTStr.NoOldWKBK;
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
                "hideButtons": ['copyLog']
            });
        } else if (isNotNullObj &&
                   error.status != null &&
                   error.status === StatusT.StatusSessionUsrAlreadyExists)
        {
            locationText = ThriftTStr.SessionElsewhere;
            var errorMsg = error.error + '\n' + ThriftTStr.LogInDifferent;
            Alert.error(ThriftTStr.SessionElsewhere, errorMsg, {
                "lockScreen": true
            });
        } else {
            // when it's an error from backend we cannot handle
            var errorStruct = {"lockScreen": true};
            var title;
            if (!isNotNullObj ||
                !error.error ||
                typeof(error.error) !== "string")
            {
                title = ThriftTStr.SetupErr;
            } else {
                if (error.error.includes("expired")) {
                    title = ThriftTStr.SetupErr;
                    errorStruct = {"lockScreen": true, "expired": true};
                } else if (error.error.includes("Update required")) {
                    title = ThriftTStr.UpdateErr;
                } else if (error.error.includes("Connection")) {
                    title = ThriftTStr.CCNBEErr;
                    errorStruct.noLogout = true;
                } else {
                    title = ThriftTStr.SetupErr;
                }
            }
            locationText = StatusMessageTStr.Error;
            // check whether there's another alert that's already on the screen
            Alert.error(title, error, errorStruct);
        }
        StatusMessage.updateLocation(true, locationText);
    }

    xcManager.isInSetup = function() {
        return $("body").hasClass("xc-setup") ||
               $("body").hasClass("xc-setup-error");
    };

    xcManager.getStatus = function() {
        return setupStatus;
    };

    xcManager.unload = function(isAsync, doNotLogout) {
        if (isAsync) {
            // async unload should only be called in beforeload
            // this time, no commit, only free result set
            // as commit may only partially finished, which is dangerous
            DSPreview.cleanup();
            TblManager.freeAllResultSets();
        } else {
            DSPreview.cleanup()
            .then(function() {
                return TblManager.freeAllResultSetsSync();
            })
            .then(function() {
                return XcSupport.releaseSession();
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                xcManager.removeUnloadPrompt();
                if (doNotLogout) {
                    window.location = paths.index;
                } else {
                    logoutRedirect();
                }
            });
        }
    };

    xcManager.forceLogout = function() {
        xcManager.removeUnloadPrompt();
        logoutRedirect();
    };

    xcManager.removeUnloadPrompt = function() {
        window.onbeforeunload = function() {}; // Do not enable prompt
        window.onunload = function() {
            // do not call unload again, but keep auto-sending email for liveHelp
            // auto-send check is then implemented in liveHelpModal.js
            LiveHelpModal.autoSendEmail();
            LiveHelpModal.updateTicket();
        };
    };

    function oneTimeSetup() {
        function initLocks() {
            var keys = WorkbookManager.getGlobalScopeKeys(currentVersion);
            var keyAttrs = [{
                "key": keys.gEphStorageKey,
                "scope": gKVScope.EPHM
            }, {
                "key": keys.gSettingsKey,
                "scope": gKVScope.GLOB
            }];
            var promises = [];

            keyAttrs.forEach(function(keyAttr) {
                var mutex = KVStore.genMutex(keyAttr.key, keyAttr.scope);
                promises.push(Concurrency.initLock(mutex));
            });

            return PromiseHelper.when.apply(this, promises);
        }

        function actualOneTimeSetup() {
            var def = jQuery.Deferred();

            function initPhase() {
                var innerDeferred = jQuery.Deferred();
                initLocks()
                .then(function() {
                    return XcalarKeyPut(GlobalKVKeys.InitFlag,
                                        InitFlagState.AlreadyInit, false,
                                        gKVScope.INIT);
                })
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            }

            XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.INIT)
            .then(function(ret) {
                if (ret && ret.value === InitFlagState.AlreadyInit) {
                    def.resolve();
                } else {
                    initPhase()
                    .then(def.resolve)
                    .fail(def.reject);
                }
            })
            .fail(def.reject);

            return def.promise();
        }

        function showForceAlert(deferred) {
            $("#initialLoadScreen").hide();
            Alert.show({
                title: AlertTStr.UnexpectInit,
                msg: AlertTStr.UnexpectInitMsg,
                hideButtons: ["cancel"],
                buttons: [{
                    name: CommonTxtTstr.Retry,
                    className: "retry",
                    func: function() {
                        $("#initialLoadScreen").show();
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.INIT)
                            .then(function(ret) {
                                if (ret && ret.value ===
                                        InitFlagState.AlreadyInit) {
                                    return deferred.resolve();
                                } else {
                                    showForceAlert(deferred);
                                }
                            })
                            .fail(function(err) {
                                console.error(err);
                                showForceAlert(deferred);
                            });
                        }, 5000);
                    }
                },
                {
                    name: CommonTxtTstr.Overwrite,
                    className: "force",
                    func: function() {
                        $("#initialLoadScreen").show();
                        console.log("Force");
                        actualOneTimeSetup()
                        .then(function() {
                            // Force unlock
                            return XcalarKeyPut(
                                          GlobalKVKeys.XdFlag,
                                          "0", false, gKVScope.XD);
                        })
                        .then(deferred.resolve)
                        .fail(function(err) {
                            console.error(err, "SEVERE ERROR: Race " +
                                          "conditions ahead");
                            deferred.resolve();
                        });
                    }
                }]
            });
        }

        var deferred = jQuery.Deferred();
        XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.INIT)
        .then(function(ret) {
            if (ret && ret.value === InitFlagState.AlreadyInit) {
                deferred.resolve();
            } else {
            // NOTE: Please do not follow this for generic concurrency use.
            // This is a one time setup where the lock init phase is part of the
            // backend startup process
                var globalMutex = new Mutex(GlobalKVKeys.XdFlag);
                var ls = "";
                Concurrency.tryLock(globalMutex)
                .then(function(lockString) {
                    ls = lockString;
                    return actualOneTimeSetup();
                })
                .then(function() {
                    return Concurrency.unlock(globalMutex, ls);
                })
                .then(deferred.resolve)
                .fail(function(err) {
                    if (err === ConcurrencyEnum.OverLimit) {
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.INIT)
                            .then(function(ret) {
                                if (ret &&
                                    ret.value === InitFlagState.AlreadyInit) {
                                    // All good
                                    deferred.resolve();
                                } else {
                                    showForceAlert(deferred);
                                }
                            })
                            .fail(function(err) {
                                console.error(err);
                                showForceAlert(deferred);
                            });
                        }, 5000);
                    } else {
                        showForceAlert(deferred);
                    }
                });
            }
        })
        .fail(function(err) {
            console.error("Error Setting up global flags. May have race " +
                          "conditions later. Letting it go through", err);
            deferred.resolve();
        });
        return deferred.promise();
    }

    function setupSession() {
        var deferred = jQuery.Deferred();

        WorkbookManager.setup()
        .then(XcSupport.holdSession)
        .then(Authentication.setup)
        .then(KVStore.restore)
        .then(initializeTable)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupConfigParams() {
        var deferred = jQuery.Deferred();

        MonitorConfig.refreshParams(true)
        .then(function(params) {
            try {
                var paraName = "maxinteractivedatasize";
                var size = Number(params[paraName].paramValue);
                setMaxSampleSize(size);
            } catch (error) {
                console.error("error case", error);
                setMaxSampleSize(null);
            }
            deferred.resolve();
        })
        .fail(function() {
            setMaxSampleSize(null);
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function setMaxSampleSize(size) {
        if (size != null) {
            gMaxSampleSize = size;
        } else {
            // when set size from backend fails
            var mode = XVM.getLicenseMode();
            var maxSize;
            switch (mode) {
                case XcalarMode.Mod:
                case XcalarMode.Demo:
                    maxSize = "10GB";
                    break;
                case XcalarMode.Oper:
                case XcalarMode.Unlic:
                    maxSize = "1TB";
                    break;
                default:
                    console.error("error case");
                    maxSize = "10GB";
                    break;
            }
            gMaxSampleSize = xcHelper.textToBytesTranslator(maxSize);
        }
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
        SortView.setup();
        DeleteTableModal.setup();
        ExtModal.setup();
        LicenseModal.setup();
        SupTicketModal.setup();
        AboutModal.setup();
        FileInfoModal.setup();
        PreviewFileModal.setup();
        DSInfoModal.setup();
        SkewInfoModal.setup();
        LoginConfigModal.setup();
        LiveHelpModal.setup();
        JupyterFinalizeModal.setup();
        JupyterUDFModal.setup();
    }

    function setupUserArea() {
        setupUserBox();
        setupMemoryAlert();
    }

    function setupUserBox() {
        var $menu = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcSupport.getFullUsername());

        $("#userNameArea").click(function() {
            var $target = $(this);
            xcHelper.dropdownOpen($target, $menu, {
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
        });

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
            if ($("#container").hasClass("noWorkbook")) {
                Workbook.goToSetup();
            } else {
                MainMenu.openPanel("monitorPanel", "setupButton");
                MainMenu.open(true);
            }

        });
        $menu.on("mouseup", ".liveHelp", function(event) {
            if (event.which !== 1) {
                return;
            }
            LiveHelpModal.show();
        });
        $("#logout").mouseup(function(event) {
            if (event.which !== 1) {
                return;
            }
            xcManager.unload();
        });
    }

    function setupMemoryAlert() {
        $("#memoryAlert").click(function() {
            if ($("#container").hasClass("noWorkbook") ||
                $("#container").hasClass("switchingWkbk")) {
                Workbook.goToMonitor();
                return;
            }
            if (!$(this).hasClass("yellow") && !$(this).hasClass("red")) {
                MainMenu.openPanel("monitorPanel", "systemButton");
                return false;
            }
            if ($(this).hasClass("tableAlert")) {
                MainMenu.openPanel("monitorPanel", "systemButton");
                DeleteTableModal.show();
            } else {
                // go to datastore panel
                var $datastoreTab = $("#dataStoresTab");
                if (!$datastoreTab.hasClass("active")) {
                    $datastoreTab.click();
                }

                if (!$datastoreTab.hasClass("mainMenuOpen")) {
                    $datastoreTab.find(".mainTab").click();
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

    function restoreActiveTable(tableId, worksheetId, failures) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var passedUpdate = false;

        table.beActive();

        table.getMetaAndResultSet()
        .then(function() {
            passedUpdate = true;
            var options = {
                wsId: worksheetId,
                atStartUp: true
            };
            return TblManager.parallelConstruct(tableId, null, options);
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

        StatusMessage.updateLocation(true, StatusMessageTStr.ImportTables);
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
            TblManager.setOrphanedList(backTableSet);

            return PromiseHelper.chain(promises);
        })
        .then(function() {
            if (hasTable) {
                RowScroller.resize();
            } else {
                $("#mainFrame").addClass("empty");
            }

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
            var activeTables = {};

            worksheetList.forEach(function(worksheetId) {
                var worksheet = WSManager.getWSById(worksheetId);
                if (!hasTable && worksheet.tables.length > 0) {
                    hasTable = true;
                }

                worksheet.tables.forEach(function(tableId) {
                    if (checkIfHasTableMeta(tableId, backTableSet)) {
                        promises.push(restoreActiveTable.bind(window, tableId,
                                                worksheetId, failures));
                    }
                    activeTables[tableId] = true;
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
                    activeTables[tableId] = true;
                });

                worksheet.archivedTables.forEach(function(tableId) {
                    checkIfHasTableMeta(tableId, backTableSet);
                });
            });

            for (var i in gTables) {
                var table = gTables[i];
                if (table.isActive()) {
                    var tableId = table.getId();
                    if (!activeTables[tableId]) {
                        console.error("active table without worksheet",
                                       tableId);
                        table.beOrphaned();
                    }
                }
            }

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
                    tableKeyEvents(event);
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
            $(this).blur();

            KVStore.commit()
            .then(function() {
                xcHelper.showSuccess(SuccessTStr.Saved);
            })
            .fail(function(error) {
                Alert.error(AlertTStr.Error, error);
            });
        });

        window.onbeforeunload = function() {
            xcManager.unload(true);
            xcSessionStorage.setItem(XcSupport.getUser(), new Date().getTime());
            if (Log.hasUncommitChange() || KVStore.hasUnCommitChange()) {
                return CommonTxtTstr.LogoutWarn;
            } else if (backspaceIsPressed) {
                // when no commit change but may caused by backSapce
                backspaceIsPressed = false; // reset
                return CommonTxtTstr.LeaveWarn;
            } else {
                // when no change, no need to warn
                return;
            }
        };
        window.onunload = function() {
            LiveHelpModal.autoSendEmail();
            LiveHelpModal.updateTicket();
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
                xcMenu.close();
                $('#dagScrollBarWrap').hide();
                resizing = true;
                var $modal = $('.modalContainer:visible');
                if ($modal.length && !$modal.hasClass("noWinResize")) {
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
                TblFunc.moveTableTitles();
            }

            DSCart.resize();
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
                }
                TblFunc.moveTableDropdownBoxes();
                // for tableScrollBar
                TblFunc.moveFirstColumn();
                TblManager.adjustRowFetchQuantity();
                DagPanel.setScrollBarId($(window).height());
                DagPanel.adjustScrollBarPositionAndSize();
                if (modalSpecs) {
                    xcHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
                MonitorLog.adjustTabNumber();
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
                    xcMenu.close();
                }

                xcMenu.removeKeyboardNavigation();
                // table head's dropdown has position issue if not hide
                $('.xcTheadWrap').find('.dropdownBox')
                                 .addClass('dropdownBoxHidden');
                xcTooltip.hideAll();
                $('.tableScrollBar').hide();
            }
            $(this).scrollTop(0);

            clearTimeout(mainFrameScrollTimer);
            mainFrameScrollTimer = setTimeout(mainFrameScrollingStop, 300);
            if (!scrollPrevented) {
                TblFunc.moveFirstColumn(null, true);
                TblFunc.moveTableTitles();
            }
        });

        function mainFrameScrollingStop() {
            $('.xcTheadWrap').find('.dropdownBox')
                             .removeClass('dropdownBoxHidden');
            $('.tableScrollBar').show();
            TblFunc.moveFirstColumn();
            TblFunc.moveTableDropdownBoxes();
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
                xcMenu.close();
                if ($target.attr('id') !== 'mainFrame') {
                    TblManager.unHighlightCells();
                }
            }

            if (!$('#workspacePanel').hasClass('active')) {
                // if not on workspace panel, then we're done
                return;
            }

            /*
            The spots you can click on where the fnBar and column DO NOT get
            cleared or deselected:
                - selected column header
                - selected column cells
                - the function bar
                - any menu list item
                - worksheet scroll bar
                - table scroll bar of the respective column's table
                - the draggable resizing area on the right side of the left panel
                - the draggable resizing area on the top of the QG panel
                - the maximize/close buttons on the QG panel
            */

            if (!$target.closest(".header").length &&
                !$target.closest(".selectedCell").length &&
                !$target.closest(".menu").length &&
                $target.attr("id") !== "mainFrame" &&
                !$target.hasClass("ui-resizable-handle") &&
                !($target.closest(".topButtons").length &&
                    $target.closest("#dagPanel").length) &&
                !$target.closest("#dfPanelSwitch").length &&
                !($target.closest("li.column").length &&
                 $target.closest("#activeTablesList").length) &&
                !$target.closest(".tableScrollBar").length &&
                !isTargetFnBar($target)) {

                $(".selectedCell").removeClass("selectedCell");
                FnBar.clear();
            }
        });

        function isTargetFnBar($target) {
            // some code mirror elements don't have parents for some reason
            // such as the pre tag
            var isCodeMirror = $target.hasClass("fnbarPre") ||
                               $target.closest("#functionArea").length > 0 ||
                               $target.hasClass("CodeMirror-cursor") ||
                               $target.closest(".CodeMirror-hint").length > 0 ||
                               $target.closest(".fnbarPre").length > 0 ||
                               ($target.closest("pre").length > 0 &&
                               $target.parents('html').length === 0);
            return isCodeMirror;
        }

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
            xcMenu.close();
            StatusBox.forceHide();
        });

        setupMouseWheel();

        if (!window.isBrowserChrome) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

        window.onerror = function(msg, url, line, column, error) {
            var mouseDownTargetHTML = "";
            var parentsHTML = [];
            var lastTargets = gMouseEvents.getLastMouseDownTargets();
            var $lastTarget = lastTargets[0];
            var prevTargetsHtml = [];

            // get last 3 mousedown elements and parents
            if ($lastTarget && !$lastTarget.is(document)) {
                mouseDownTargetHTML = $lastTarget.clone().empty()[0].outerHTML;

                $lastTarget.parents().each(function() {
                    if (!this.tagName) {
                        return;
                    }
                    var html = "<" + this.tagName.toLowerCase();
                    $.each(this.attributes, function() {
                        if (this.specified) {
                            html += ' ' + this.name + '="' + this.value + '"';
                        }
                    });
                    html += ">";
                    parentsHTML.push(html);
                });

                for (var i = 1; i < lastTargets.length; i++) {
                    var prevTargetParents = [];
                    lastTargets[i].parents().andSelf().each(function() {
                        if (!this.tagName) {
                            return;
                        }
                        var html = "<" + this.tagName.toLowerCase();
                        $.each(this.attributes, function() {
                            if (this.specified) {
                                html += ' ' + this.name + '="' + this.value +
                                        '"';
                            }
                        });
                        html += ">";
                        prevTargetParents.unshift(html);
                    });

                    prevTargetsHtml.push(prevTargetParents);
                }
            }

            var mouseDownTime = gMouseEvents.getLastMouseDownTime();
            var stack = null;
            if (error && error.stack) {
                stack = error.stack.split("\n");
            }

            var info = {
                "error": msg,
                "url": url,
                "line": line,
                "column": column,
                "lastMouseDown": {
                    "el": mouseDownTargetHTML,
                    "time": mouseDownTime,
                    "parents": parentsHTML,
                    "prevMouseDowns": prevTargetsHtml
                },
                "stack": stack,
                "txCache": xcHelper.deepCopy(Transaction.getCache()),
                "browser": window.navigator.userAgent,
                "platform": window.navigator.platform,
            };
            xcConsole.log(msg, url + ":" + line + ":" + column);

            Log.errorLog("Console error", null, null, info);

            // if debugOn, xcConsole.log will show it's own error
            // if no stack, then it's a custom error, don't show message
            if (!window.debugOn && stack &&
                !(isBrowserIE && (msg === "Unspecified error." ||
                    (stack[1] && stack[1].indexOf("__BROWSERTOOLS") > -1)))) {

                var promise = Log.commitErrors();

                Alert.error(ErrTStr.RefreshBrowser, ErrTStr.RefreshBrowserDesc, {
                    "lockScreen": true,
                    "buttons": [{
                        className: "refresh",
                        name: "Refresh",
                        func: function() {
                            // wait for commit to finish before refreshing
                            promise
                            .always(function() {
                                location.reload();
                            });
                        }
                    }]
                });
            }
        };

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
                xcMenu.close();
                TblManager.unHighlightCells();

                if (event.which === keyCode.Z) {
                    $('#undo').click();
                } else if (event.which === keyCode.Y) {
                    if ($("#redo").hasClass("disabled")) {
                        Log.repeat();
                    } else {
                        $('#redo').click();
                    }
                }
            }
        }
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

        if ($("#functionArea .CodeMirror").hasClass("CodeMirror-focused") ||
            $(document.activeElement).is("input")) {
            return false;
        }

        var $rowInput = $("#rowInput");
        var tableId = gActiveTableId;
        var $lastTarget = gMouseEvents.getLastMouseDownTarget();
        var isInMainFrame = !$lastTarget.context ||
                            ($lastTarget.closest("#mainFrame").length > 0 &&
                            !$lastTarget.is("input"));

        if (isInMainFrame && xcHelper.isTableInScreen(tableId)) {
            if (gIsTableScrolling ||
                $("#modalBackground").is(":visible") ||
                !TblFunc.isTableScrollable(tableId)) {
                // not trigger table scroll, but should return true
                // to prevent table's natural scroll
                return true;
            }

            var maxRow = gTables[tableId].resultSetCount;
            var curRow = $rowInput.data("val");
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

            xcMenu.close();
            gMouseEvents.setMouseDownTarget(null);
            $rowInput.val(rowToGo).trigger(fakeEvent.enter);

            return true;
        }

        return false;
    }

    function tableKeyEvents(event) {
        // only being used for ctrl+o to open column dropdown
        if (!(isSystemMac && event.metaKey) &&
            !(!isSystemMac && event.ctrlKey))
        {
            return;
        }
        if (letterCode[event.which] !== "o") {
            return;
        }

        if ($('#workspacePanel').hasClass('active') &&
            !$('#modalBackground').is(":visible") &&
            !$('textarea:focus').length &&
            !$('input:focus').length) {

            var $th = $(".xcTable th.selectedCell");
            if ($th.length > 0) {
                event.preventDefault();
            }
            if ($th.length !== 1) {
                return;
            }

            $th.find(".dropdownBox").trigger(fakeEvent.click);
        }
    }

    function logoutRedirect() {
        xcSessionStorage.removeItem("xcalar-username");
        var waadUser = null;
        var waadAuthContext;
        var waadConfig = getWaadConfigFromLocalStorage();
        if (waadConfig != null) {
            try {
                waadAuthContext = new AuthenticationContext(waadConfig);
                waadUser = waadAuthContext.getCachedUser();
            } catch (error) {
                // Not via WAAD authentication.
                // XXX We really should be remembering if we logged in via
                // WAAD instead of relying on this hack
            }
        }

        if (waadUser != null) {
            waadAuthContext.logOut();
        } else {
            window.location = paths.dologout;
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

        // this is to fix the issue when scroll table
        // both horizontally and verticall will move
        if ($target.closest(".dataTable").length) {
            if (y > x) {
                x = 0;
            } else if (x > y) {
                y = 0;
            }
        }
        $($pathToRoot.get().reverse()).each(function() {
            var $el = $(this);
            var delta;

            if ($el.css("overflow") !== "hidden") {
                // do horizontal scrolling
                if (deltaX > 0) {
                    var scrollWidth = $el.prop("scrollWidth");
                    // because there is a rowReiszer in .idWrap,
                    // which wrongly detect the element as scrollable
                    // we just skip it
                    if ($el.closest(".dataTable").length) {
                        scrollWidth = 0;
                    }

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

            if ((window.isBrowserChrome && isRetinaDevice()
                || window.isBrowserFirefox) &&
                ($(event.target).closest(".dataTable").length))
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

    /* Unit Test Only */
    if (window.unitTestMode) {
        var oldLogoutRedirect;
        var oldTableScroll;
        xcManager.__testOnly__ = {};
        xcManager.__testOnly__.handleSetupFail = handleSetupFail;
        xcManager.__testOnly__.reImplementMouseWheel = reImplementMouseWheel;
        xcManager.__testOnly__.oneTimeSetup = oneTimeSetup;
        xcManager.__testOnly__.restoreActiveTable = restoreActiveTable;

        xcManager.__testOnly__.fakeLogoutRedirect = function() {
            oldLogoutRedirect = logoutRedirect;
            logoutRedirect = function() {};
        };

        xcManager.__testOnly__.resetLogoutRedirect = function() {
            logoutRedirect = oldLogoutRedirect;
        };

        xcManager.__testOnly__.fakeTableScroll = function(func) {
            oldTableScroll = tableScroll;
            tableScroll = func;
        };

        xcManager.__testOnly__.resetFakeScroll = function() {
            tableScroll = oldTableScroll;
        };
    }
    /* End Of Unit Test Only */

    return (xcManager);
}({}, jQuery));
