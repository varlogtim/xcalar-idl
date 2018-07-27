namespace xcManager {
    let setupStatus: string;

    /**
     * xcManager.setup
     * Sets up most services for XD
     */
    export function setup(): XDPromise<void> {
        setupStatus = SetupStatus["Setup"];
        // use promise for better unit test
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        gMinModeOn = true; // startup use min mode;
        $("body").addClass("xc-setup");
        $("#favicon").attr("href", paths.favicon);

        Compatible.check();
        xcGlobal.setup();
        xcTimeHelper.setup();
        setupThrift("");

        let xcSocket: XcSocket;
        let firstTimeUser: boolean;

        hotPatch()
        .then(function() {
            return XcUser.setCurrentUser();
        })
        .then(function() {
            XVM.setup();

            setupUserArea();
            xcTooltip.setup();
            CSHelp.setup();
            MainMenu.setup();
            setupWorkspaceBar();
            StatusBox.setup();
            StatusMessage.setup();
            BottomMenu.setup();
            DataStore.setup();
            TblMenu.setup();
            WSManager.setup();
            MonitorPanel.setup();
            WorkspacePanel.setup();
            DagPanel.setup();
            DataflowPanel.setup();
            JupyterPanel.setup();
            IMDPanel.setup();
            setupModals();
            TutorialsSetup.setup();
            Admin.initialize();
            xcSuggest.setup();
            documentReadyGeneralFunction();

            xcSocket = setupSocket();
            try {
                // In case mixpanel is not loaded
                xcMixpanel.setup();
            } catch (error){
                console.log("mixpanel is not loaded");
            }

            return XVM.checkVersionAndLicense();
        })
        .then(function() {
            XVM.checkBuildNumber();
            return XVM.checkKVVersion();
        })
        .then(function(isFirstTimeUser) {
            firstTimeUser = isFirstTimeUser;
        })
        .then(function() {
            // First XD instance to run since cluster restart
            return oneTimeSetup();
        })
        .then(setupSession) // restores info from kvStore
        .then(setupConfigParams)
        .then(function() {
            return PromiseHelper.alwaysResolve(DSTargetManager.refreshTargets(true));
        })
        .then(function() {
            StatusMessage.updateLocation(true,
                                        StatusMessageTStr.SettingExtensions);
            // Extensions need to be moved to after version check because
            // somehow uploadUdf causes mgmtd to crash if checkVersion doesn't
            // pass
            // Extmanager promise so unit test can wait on resolution.
            const extPromise: XDPromise<void> = setupExtensions();

            setupDag();
            DagView.setup();
            JSONModal.setup();
            ExportView.setup();
            JoinView.setup();
            UnionView.setup();
            AggModal.setup();
            OperationsView.setup();
            DFCreateView.setup();
            ProjectView.setup();
            DFParamModal.setup();
            SmartCastView.setup();
            SortView.setup();
            WSManager.initialize(); // async
            BottomMenu.initialize(); // async
            WorkbookPanel.initialize();
            DataflowPanel.initialize(); // async if has df
            setupDagTabs();
            if (typeof SQLEditor !== "undefined") {
                SQLEditor.initialize();
            }
            // restore user settings
            OperationsView.restore();
            JoinView.restore();
            FileBrowser.restore();

            WSManager.focusOnWorksheet();
            // This adds a new failure mode to setup.
            return extPromise;
        })
        .then(function() {
            if (Authentication.getInfo()["idCount"] === 1) {
                // show hint to create datasets if no tables have been created
                // in this workbook
                WSManager.showDatasetHint();
            }
            StatusMessage.updateLocation(false, null);
            if (!isBrowserFirefox && !isBrowserIE) {
                gMinModeOn = false; // turn off min mode
            }

            setupStatus = SetupStatus["Success"];

            console.log('%c ' + CommonTxtTstr.XcWelcome + ' ',
            'background-color: #5CB2E8; ' +
            'color: #ffffff; font-size:18px; font-family:Open Sans, Arial;');

            xcSocket.addEventsAfterSetup();
            // start heartbeat check
            XcSupport.heartbeatCheck();

            if(!window["isBrowserSupported"]) {
                Alert.error(AlertTStr.UnsupportedBrowser, "", {
                    msgTemplate: AlertTStr.BrowserVersions,
                    sizeToText: true
                });
            }
            deferred.resolve();
        })
        .fail(function(error) {
            $("body").addClass("xc-setup-error");
            setupStatus = SetupStatus["Fail"];
            handleSetupFail(error, firstTimeUser);
            deferred.reject(error);
        })
        .always(function() {
            $("body").removeClass("xc-setup");
            // get initial memory usage
            MemoryAlert.Instance.check();

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

    function handleSetupFail(error: string|object, firstTimeUser: boolean): void {
        // in case it's not setup yet
        MainMenu.setup();
        QueryManager.setup();
        SupTicketModal.setup();
        Alert.setup();
        StatusMessage.setup();
        StatusBox.setup();
        xcTooltip.setup();
        let locationText: string = StatusMessageTStr.Error;
        const isNotNullObj: boolean = error && (typeof error === "object");
        if (error === WKBKTStr.NoWkbk){
            // when it's new workbook
            $("#initialLoadScreen").hide();
            WorkbookPanel.forceShow();
            locationText = StatusMessageTStr.Viewing + " " + WKBKTStr.Location;
            // start socket (no workbook is also a valid login case)
            let userExists: boolean = false;
            XcUser.CurrentUser.holdSession(null, false)
            .fail(function(err) {
                if (err === WKBKTStr.Hold) {
                    userExists = true;
                    WorkbookManager.gotoWorkbook(null, true);
                }
            })
            .always(function() {
                if (firstTimeUser && !userExists) {
                    Admin.addNewUser();
                    // when it's new user first time login
                    Alert.show(<Alert.AlertOptions>{
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
                                const url: string = "https://discourse.xcalar.com/c/xcalar-training-videos";
                                window.open(url, "_blank");
                            }
                        }],
                        "noCancel": true
                    });
                }
                JupyterPanel.initialize(true);
            });
        } else if (error === WKBKTStr.Hold) {
            // when seesion is hold by others and user choose to not login
            WorkbookManager.gotoWorkbook(null, true);
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionNotFound)
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
                "hideButtons": ['downloadLog']
            });
        } else if (isNotNullObj &&
                   error["status"] != null &&
                   error["status"] === StatusT.StatusSessionUsrAlreadyExists)
        {
            locationText = ThriftTStr.SessionElsewhere;
            const errorMsg: string = error["error"] + '\n' + ThriftTStr.LogInDifferent;
            Alert.error(ThriftTStr.SessionElsewhere, errorMsg, {
                "lockScreen": true
            });
        } else {
            // when it's an error from backend we cannot handle
            let errorStruct: Alert.AlertErrorOptions = {"lockScreen": true};
            let title: string;
            if (!isNotNullObj ||
                !error["error"] ||
                typeof(error["error"]) !== "string")
            {
                title = ThriftTStr.SetupErr;
            } else {
                if (error["error"].includes("expired")) {
                    title = ThriftTStr.SetupErr;
                    errorStruct = {"lockScreen": true, "expired": true};
                } else if (error["error"].includes("Update required")) {
                    title = ThriftTStr.UpdateErr;
                    error = ErrTStr.Update;
                } else if (error["error"].includes("Connection")) {
                    title = ThriftTStr.CCNBEErr;
                    errorStruct["noLogout"] = true;
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

    /**
     * xcManager.isInSetup
     * returns true if the webpage is in setup mode
     */
    export function isInSetup(): boolean {
        return $("body").hasClass("xc-setup") ||
               $("body").hasClass("xc-setup-error");
    };

    /**
     * xcManager.getStatus
     * returns the setup status
     */
    export function getStatus(): string {
        return setupStatus;
    };

    /**
     * xcManager.isStatusFail
     * returns true if setup has failed
     */
    export function isStatusFail(): boolean {
        return (setupStatus === SetupStatus["Fail"]);
    };

    /**
     * xcManager.unload
     * unloads user's resources from XD
     * @param isAsync - boolean, if request is async
     * @param doNotLogout - if user should not be logged out durring unload
     */
    export function unload(isAsync: boolean = false, doNotLogout: boolean = false): void {
        if (isAsync) {
            // async unload should only be called in beforeload
            // this time, no commit, only free result set
            // as commit may only partially finished, which is dangerous
            SQLEditor.storeQuery();
            TblManager.freeAllResultSets();
        } else {
            PromiseHelper.alwaysResolve(SQLEditor.storeQuery())
            .then(function() {
                return TblManager.freeAllResultSetsSync();
            })
            .then(function() {
                return XcUser.CurrentUser.releaseSession();
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                xcManager.removeUnloadPrompt();
                if (doNotLogout) {
                    window["location"]["href"] = paths.index;
                } else {
                    logoutRedirect();
                }
            });
        }
    };

    /**
     * xcManager.forceLogout
     * logs the user out with no confirmation modals
     */
    export function forceLogout(): void {
        xcManager.removeUnloadPrompt();
        logoutRedirect();
    };

    /**
     * xcManager.removeUnloadPrompt
     * Removes prompt for user unload.
     * @param markUser - boolean, if true record the time the user unloaded
     */
    export function removeUnloadPrompt(markUser: boolean = false): void {
        window.onbeforeunload = function() {
            if (markUser) {
                markUserUnload();
            }
        }; // Do not enable prompt
        window.onunload = function() {
            // do not call unload again, but keep auto-sending email for liveHelp
            // auto-send check is then implemented in liveHelpModal.js
            LiveHelpModal.userLeft();
        };
    };

    function markUserUnload(): void {
        const xcSocket: XcSocket = XcSocket.Instance;
        if (xcSocket.isResigered()) {
            xcSessionStorage.setItem(XcUser.getCurrentUserName(), String(new Date().getTime()));
        }
    }

    function oneTimeSetup(): XDPromise<any> {
        function initLocks() {
            const keys: any = WorkbookManager.getGlobalScopeKeys(currentVersion);
            const keyAttrs: object[] = [{
                "key": keys.gEphStorageKey,
                "scope": gKVScope.GLOB
            }, {
                "key": keys.gSettingsKey,
                "scope": gKVScope.GLOB
            }, {
                "key": keys.gSharedDSKey,
                "scope": gKVScope.GLOB
            }];
            const promises: XDPromise<void>[] = [];

            keyAttrs.forEach(function(keyAttr) {
                const mutex: Mutex = KVStore.genMutex(keyAttr["key"], keyAttr["scope"]);
                const concurrency: Concurrency = new Concurrency(mutex);
                promises.push(concurrency.initLock());
            });

            return PromiseHelper.when.apply(this, promises);
        }

        function actualOneTimeSetup(force: boolean = false): XDPromise<any> {
            let def: XDDeferred<any> = PromiseHelper.deferred();
            let markAsAlreadyInit: () => XDPromise<any> = function() {
                return XcalarKeyPut(GlobalKVKeys.InitFlag,
                                        InitFlagState.AlreadyInit, false,
                                        gKVScope.GLOB);
            };
            const initPhase: Function = function(): XDPromise<any> {
                const innerDeferred: XDDeferred<any> = PromiseHelper.deferred();
                initLocks()
                .then(function() {
                    return markAsAlreadyInit();
                })
                .then(innerDeferred.resolve)
                .fail(function(error) {
                    if (force && error === ConcurrencyEnum.AlreadyInit) {
                        // we see this issue, patch a fix
                        markAsAlreadyInit()
                        .then(innerDeferred.resolve)
                        .fail(innerDeferred.reject);
                    } else {
                        innerDeferred.reject(error);
                    }
                });

                return innerDeferred.promise();
            };

            XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
            .then(function(ret) {
                if (!ret || ret.value !== InitFlagState.AlreadyInit) {
                    return initPhase();
                }
            })
            .then(def.resolve)
            .fail(def.reject);

            return def.promise();
        }

        function showForceAlert(deferred: XDDeferred<StatusT>): void {
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
                                            gKVScope.GLOB)
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
                        actualOneTimeSetup(true)
                        .then(function() {
                            // Force unlock
                            return XcalarKeyPut(
                                          GlobalKVKeys.XdFlag,
                                          "0", false, gKVScope.GLOB);
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

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarKeyLookup(GlobalKVKeys.InitFlag, gKVScope.GLOB)
        .then(function(ret) {
            if (ret && ret.value === InitFlagState.AlreadyInit) {
                deferred.resolve();
            } else {
            // NOTE: Please do not follow this for generic concurrency use.
            // This is a one time setup where the lock init phase is part of the
            // backend startup process
                const globalMutex: Mutex = new Mutex(GlobalKVKeys.XdFlag, XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal);
                const concurrency: Concurrency = new Concurrency(globalMutex);
                concurrency.tryLock()
                .then(function() {
                    return actualOneTimeSetup();
                })
                .then(function() {
                    return concurrency.unlock();
                })
                .then(deferred.resolve)
                .fail(function(err) {
                    if (err === ConcurrencyEnum.OverLimit) {
                        setTimeout(function() {
                            XcalarKeyLookup(GlobalKVKeys.InitFlag,
                                            gKVScope.GLOB)
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

    function setupDag() {
        const activeWKBNK: string = WorkbookManager.getActiveWKBK();
        const workbook: WKBK = WorkbookManager.getWorkbook(activeWKBNK);
        // in case no session Id
        const idPrefix: string = workbook.sessionId || xcHelper.randName("dag");
        DagNode.setIdPrefix(idPrefix);
    }

    function setupSession(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        WorkbookManager.setup()
        .then(function(wkbkId) {
            return XcUser.CurrentUser.holdSession(wkbkId, false);
        })
        .then(function() {
            return JupyterPanel.initialize();
        })
        .then(Authentication.setup)
        .then(KVStore.restore) // restores table info, dataset info, settings etc
        .then(initializeTable)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupConfigParams(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        MonitorConfig.refreshParams(true)
        .then(function(params) {
            try {
                const paraName: string = "maxinteractivedatasize";
                const size: number = Number(params[paraName].paramValue);
                setMaxSampleSize(size);
            } catch (error) {
                console.error("error case", error);
            }
            deferred.resolve();
        })
        .fail(function() {
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function loadDynamicPath(): XDPromise<void> {
        const dynamicSrc: string = 'https://www.xcalar.com/xdscripts/dynamic.js';
        const randId: string = String(Math.ceil(Math.random() * 100000));
        const src: string = dynamicSrc + '?r=' + randId;
        return $.getScript(src);
    }

    function checkHotPathEnable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        adminTools.getHotPatch()
        .then(function(res) {
            if (res.hotPatchEnabled) {
                deferred.resolve();
            } else {
                console.info("Hot Patch is disabled");
                deferred.reject(null, true);
            }
        })
        .fail(function() {
            deferred.resolve(); // still  resolve it
        });

        return deferred.promise();
    }

    function hotPatch(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();

        checkHotPathEnable()
        .then(function() {
            return loadDynamicPath();
        })
        .then(function() {
            try {
                if (typeof XCPatch.patch !== 'undefined') {
                    const promise: XDPromise<void> = XCPatch.patch();
                    if (promise != null) {
                        return promise;
                    }
                }
            } catch (e) {
                console.error(e);
            }
        })
        .then(deferred.resolve)
        .fail(function(error, isHotPatchDisabled) {
            if (!isHotPatchDisabled) {
                console.error("failed to get script", error);
            }
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function setMaxSampleSize(size: number): void {
        if (size != null) {
            gMaxSampleSize = size;
        }
    }

    function setupExtensions(): XDPromise<void> {
        try {
            const extPromise: XDPromise<void> = ExtensionManager.setup();
            ExtensionPanel.setup();
            return extPromise;
        } catch (error) {
            console.error(error);
            Alert.error(ThriftTStr.SetupErr, error);
            return PromiseHelper.reject();
        }
    }

    // excludes alert modal wish is set up earlier
    function setupModals(): void {
        Alert.setup();
        Profile.setup();
        WorkbookPanel.setup();
        DeleteTableModal.setup();
        ExtModal.setup();
        LicenseModal.setup();
        SupTicketModal.setup();
        AboutModal.setup();
        FileInfoModal.setup();
        DSInfoModal.setup();
        SkewInfoModal.setup();
        WorkbookInfoModal.setup();
        WorkbookPreview.setup();
        LoginConfigModal.setup();
        LiveHelpModal.setup();
        JupyterFinalizeModal.setup();
        JupyterUDFModal.setup();
        DFCommentModal.setup();
        FileListModal.setup();
        DSImportErrorModal.setup();
    }

    function setupUserArea(): void {
        setupUserBox();
        MemoryAlert.Instance.setup();
    }

    function setupUserBox(): void {
        const $menu: JQuery = $("#userMenu");
        xcMenu.add($menu);
        $("#userName").text(XcUser.CurrentUser.getFullName());

        $("#userNameArea").click(function() {
            const $target: JQuery = $(this);
            xcHelper.dropdownOpen($target, $menu, <xcHelper.DropdownOptions>{
                "offsetY": -3,
                "toggle": true,
                "closeListener": true
            });
        });

        $menu.on("mouseup", ".help", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            const $tab: JQuery = $("#helpTab");
            if (!$tab.hasClass("active")) {
                $tab.click();
            }
        });

        $menu.on("mouseup", ".discourse", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            const win: Window = window.open('https://discourse.xcalar.com/', '_blank');
            if (win) {
                win.focus();
            } else {
                alert('Please allow popups for this website');
            }
        });

        $menu.on("mouseup", ".about", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            AboutModal.show();
        });

        $menu.on('mouseup', ".setup", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            // visible to admin only
            if ($("#container").hasClass("noWorkbook")) {
                WorkbookPanel.goToSetup();
            } else {
                MainMenu.openPanel("monitorPanel", "setupButton");
                MainMenu.open(true);
            }

        });
        $menu.on("mouseup", ".liveHelp", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            LiveHelpModal.show();
        });

        $menu.on("mouseup", ".supTicket", function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            SupTicketModal.show();
        });

        $("#logout").mouseup(function(event: JQueryEventObject): void {
            if (event.which !== 1) {
                return;
            }
            XcUser.CurrentUser.logout();
        });
    }

    function setupWorkspaceBar(): void {
        RowScroller.setup();
        FnBar.setup();
    }

    function setupSocket(): XcSocket {
        const xcSocket: XcSocket = XcSocket.Instance;
        xcSocket.setup();
        return xcSocket;
    }

    function setupDagTabs(): void {
        const dagTabManager: DagTabManager = DagTabManager.Instance;
        dagTabManager.setup();
    }

    function restoreActiveTable(tableId: string, worksheetId: string, failures: any[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let table: any = gTables[tableId];
        let passedUpdate: boolean = false;

        table.beActive();

        table.getMetaAndResultSet()
        .then(function() {
            passedUpdate = true;
            const options: object = {
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

    function initializeTable(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const failures: string[] = [];
        let hasTable: boolean = false;
        const noMetaTables: string[] = [];

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
            const promises: any[] = syncTableMetaWithWorksheet(backTableSet);
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

        function syncTableMetaWithBackTable(backTableSet: object): void {
            // check if some table has front meta but not backend info
            // if yes, delete front meta (gTables and wsManager)
            for (let tableId in gTables) {
                const tableName: string = gTables[tableId].getName();
                if (!backTableSet.hasOwnProperty(tableName)) {
                    console.warn(tableName, "is not in backend");
                    WSManager.removeTable(tableId);
                    delete gTables[tableId];
                }
            }
        }

        function syncTableMetaWithWorksheet(backTableSet: object): any[] {
            const promises: any[] = [];
            const worksheetList: string[] = WSManager.getWSList();
            const activeTables: Set<string> = new Set<string>();

            worksheetList.forEach(function(worksheetId) {
                const worksheet: object = WSManager.getWSById(worksheetId);
                if (!hasTable && worksheet["tables"].length > 0) {
                    hasTable = true;
                }

                worksheet["tables"].forEach(function(tableId) {
                    if (checkIfHasTableMeta(tableId, backTableSet)) {
                        promises.push(restoreActiveTable.bind(window, tableId,
                                                worksheetId, failures));
                    }
                    activeTables.add(tableId);
                });

                // pending tables will be orphaned
                worksheet["pendingTables"].forEach(function(tableId) {
                    if (gTables[tableId]) {
                        gTables[tableId].beOrphaned();
                    }
                });
                worksheet["pendingTables"] = [];
            });

            // set up tables in hidden worksheets
            const hiddenWorksheets: string[] = WSManager.getHiddenWSList();
            hiddenWorksheets.forEach(function(worksheetId) {
                const worksheet: object = WSManager.getWSById(worksheetId);
                if (worksheet == null) {
                    // this is error case
                    return;
                }

                worksheet["tempHiddenTables"].forEach(function(tableId) {
                    checkIfHasTableMeta(tableId, backTableSet);
                    activeTables.add(tableId);
                });
            });

            for (let i in gTables) {
                let table: TableMeta = gTables[i];
                if (table.isActive()) {
                    const tableId: string = table.getId();
                    if (!activeTables.has(tableId)) {
                        console.error("active table without worksheet",
                                       tableId);
                        table.beOrphaned();
                    }
                } else if (table.status === "archived") {
                    table.beOrphaned();
                }
            }

            return promises;
        }

        function checkIfHasTableMeta(tableId: string, backTableSet: object): boolean {
            let table: TableMeta = gTables[tableId];
            if (table == null) {
                noMetaTables.push(tableId);
                return false;
            } else {
                const tableName: string = table.getName();
                delete backTableSet[tableName];
                return true;
            }
        }

        function cleanNoMetaTables(): void {
            noMetaTables.forEach(function(tableId) {
                console.info("not find table", tableId);
                WSManager.removeTable(tableId);
            });
        }
    }

    function documentReadyGeneralFunction(): void {
        $(document).keydown(function(event: JQueryEventObject): void{
            let isPreventEvent: boolean;

            switch (event.which) {
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

        $("#autoSaveBtn").click(function(): void {
            $(this).blur();

            KVStore.commit()
            .then(function() {
                xcHelper.showSuccess(SuccessTStr.Saved);
            })
            .fail(function(error) {
                Alert.error(AlertTStr.Error, error);
            });
        });

        window.onbeforeunload = function(): string {
            xcManager.unload(true);
            markUserUnload();
            if (Log.hasUncommitChange() || KVStore.hasUnCommitChange()) {
                return CommonTxtTstr.LogoutWarn;
            } else {
                return CommonTxtTstr.LeaveWarn;
            }
        };
        window.onunload = function(): void {
            LiveHelpModal.userLeft();
        };

        let winResizeTimer: number;
        let resizing: boolean = false;
        let otherResize: boolean = false; // true if winresize is triggered by 3rd party code
        let modalSpecs: xcHelper.ModalSpec;
        const windowSpecs: xcHelper.WindowSpec = {
            winHeight: $(window).height(),
            winWidth: $(window).width()
        };

        $(window).resize(function(event: JQueryEventObject): void {
            if (!resizing) {
                xcMenu.close();
                $('#dagScrollBarWrap').hide();
                $(".dfScrollBar").hide();
                resizing = true;
                const $modal: JQuery = $('.modalContainer:visible');
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

            if (event.target !== <any>window) {
                otherResize = true;
            } else {
                otherResize = false;
                TblFunc.moveTableTitles();
            }

            DSCart.resize();
            clearTimeout(winResizeTimer);
            winResizeTimer = <any>setTimeout(winResizeStop, 100);
        });

        function winResizeStop(): void {
            if (otherResize) {
                otherResize = false;
            } else {
                const table: TableMeta = gTables[gActiveTableId];
                if (table && table["resultSetCount"] !== 0) {
                    RowScroller.genFirstVisibleRowNum();
                }
                TblFunc.moveTableDropdownBoxes();
                // for tableScrollBar
                TblFunc.moveFirstColumn();
                TblManager.adjustRowFetchQuantity();
                DagPanel.setScrollBarId($(window).height());
                DagPanel.adjustScrollBarPositionAndSize();
                DFCard.adjustScrollBarPositionAndSize();
                if (modalSpecs) {
                    xcHelper.repositionModalOnWinResize(modalSpecs,
                                                        windowSpecs);
                }
                MonitorLog.adjustTabNumber();
            }
            resizing = false;
        }

        // using this to keep window from scrolling on dragdrop
        $(window).scroll(function(): void {
            $(this).scrollLeft(0);
        });

        // using this to keep window from scrolling up and down;
        $('#container').scroll(function(): void {
            $(this).scrollTop(0);
        });

        let mainFrameScrolling: boolean = false;
        let mainFrameScrollTimer: number;
        let scrollPrevented: boolean = false;
        $('#mainFrame').scroll(function(): void {
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
                $(".xcTheadWrap").find(".lockIcon").addClass("xc-hidden");
                xcTooltip.hideAll();
                $('.tableScrollBar').hide();
            }
            $(this).scrollTop(0);

            clearTimeout(mainFrameScrollTimer);
            mainFrameScrollTimer = <any>setTimeout(mainFrameScrollingStop, 300);
            if (!scrollPrevented) {
                TblFunc.moveFirstColumn(null, true);
                TblFunc.moveTableTitles();
            }
        });

        function mainFrameScrollingStop(): void {
            $('.xcTheadWrap').find('.dropdownBox')
                             .removeClass('dropdownBoxHidden');
            $(".xcTheadWrap").find(".lockIcon").removeClass("xc-hidden");
            $('.tableScrollBar').show();
            TblFunc.moveFirstColumn();
            TblFunc.moveTableDropdownBoxes();
            mainFrameScrolling = false;
            scrollPrevented = false;
        }

        $(document).mousedown(function(event: JQueryEventObject): void {
            if (window["isBrowserMicrosoft"] && event.shiftKey) {
                // prevents text from being selected on shift click
                const cachedFn: any = document.onselectstart;
                document.onselectstart = function() {
                    return false;
                };
                setTimeout(function() {
                    document.onselectstart = cachedFn;
                }, 0);
            }

            const $target: JQuery = $(event.target);
            gMouseEvents.setMouseDownTarget($target);
            const clickable: boolean = $target.closest('.menu').length > 0 ||
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
                !isTargetFnBar($target) && !$(".fnBarLocked").length) {

                $(".selectedCell").removeClass("selectedCell");
                FnBar.clear();
            }
        });

        function isTargetFnBar($target: JQuery): boolean {
            // some code mirror elements don't have parents for some reason
            // such as the pre tag
            const isCodeMirror: boolean = $target.hasClass("fnbarPre") ||
                               $target.closest("#functionArea").length > 0 ||
                               $target.hasClass("CodeMirror-cursor") ||
                               $target.closest(".CodeMirror-hint").length > 0 ||
                               $target.closest(".fnbarPre").length > 0 ||
                               ($target.closest("pre").length > 0 &&
                               $target.parents('html').length === 0);
            return isCodeMirror;
        }

        let dragCount: number = 0; // tracks document drag enters and drag leaves
        // as multiple enters/leaves get triggered by children
        $(document).on('dragenter', function(event: JQueryEventObject): void {
            const dt: any = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {

                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';

                $('.xc-fileDroppable').addClass('xc-fileDragging');
                dragCount++;
            }
        });

        $(document).on('dragover', function(event: JQueryEventObject): void {
            const dt = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.contains('Files'))) {
                event.stopPropagation();
                event.preventDefault();

                dt.effectAllowed = 'none';
                dt.dropEffect = 'none';
            }
        });

        $(document).on('dragleave', function(event: JQueryEventObject): void {
            let dt: DataTransfer = event.originalEvent["dataTransfer"];
            if (dt.types && (dt.types.indexOf ?
                dt.types.indexOf('Files') !== -1 :
                dt.types.includes('Files'))) {
                dragCount--;
                if (dragCount === 0) {
                    $('.xc-fileDroppable').removeClass('xc-fileDragging');
                }
            }
        });

        $(document).on('drop', function(event: JQueryEventObject): void {
            event.preventDefault();
            $('.xc-fileDroppable').removeClass('xc-fileDragging');
        });

        $(window).blur(function(): void {
            xcMenu.close();
        });

        setupMouseWheel();

        if (!window["isBrowserChrome"]) {
            //  prevent cursor from showing in IE and firefox
            $(document).on('focus', 'input[readonly]', function(){
                this.blur();
            });
        }

        window.onerror = function(msg: string|Event, url: string, line: number, column: number, error: Error): void {
            let mouseDownTargetHTML: string = "";
            const parentsHTML: string[] = [];
            const lastTargets: JQuery[] = gMouseEvents.getLastMouseDownTargets();
            const $lastTarget: JQuery = lastTargets[0];
            const prevTargetsHtml: string[][] = [];
            let promise: XDPromise<void> = PromiseHelper.alwaysResolve(SQLEditor.storeQuery());

            // get last 3 mousedown elements and parents
            if ($lastTarget && !$lastTarget.is(document)) {
                mouseDownTargetHTML = $lastTarget.clone().empty()[0].outerHTML;

                $lastTarget.parents().each(function() {
                    if (!this.tagName) {
                        return;
                    }
                    let html: string = "<" + this.tagName.toLowerCase();
                    $.each(this.attributes, function() {
                        if (this.specified) {
                            html += ' ' + this.name + '="' + this.value + '"';
                        }
                    });
                    html += ">";
                    parentsHTML.push(html);
                });

                for (let i = 1; i < lastTargets.length; i++) {
                    const prevTargetParents: string[] = [];
                    lastTargets[i].parents().addBack().each(function() {
                        if (!this.tagName) {
                            return;
                        }
                        let html: string = "<" + this.tagName.toLowerCase();
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

            const mouseDownTime: number = gMouseEvents.getLastMouseDownTime();
            let stack: string[] = null;
            if (error && error.stack) {
                stack = error.stack.split("\n");
            }

            let info: object = {
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
            if (!window["debugOn"] && stack &&
                !(isBrowserIE && (msg === "Unspecified error." ||
                    (stack[1] && stack[1].indexOf("__BROWSERTOOLS") > -1)))) {

                promise = promise.then(function() {
                        return Log.commitErrors();
                    });

                if (typeof mixpanel !== "undefined") {
                    const timestamp: number = (new Date()).getTime();
                    mixpanel["track"]("XdCrash", {
                        "Timestamp": timestamp,
                        "errorMsg": JSON.stringify(info)
                    });
                }

                Alert.error(ErrTStr.RefreshBrowser, ErrTStr.RefreshBrowserDesc, <Alert.AlertErrorOptions>{
                    "lockScreen": true,
                    "buttons": [{
                        className: "refresh",
                        name: "Refresh",
                        func: function() {
                            // wait for commit to finish before refreshing
                            promise
                            .always(function() {
                                xcHelper.reload();
                            });
                        }
                    }]
                });
            }
        };

        function checkUndoRedo(event: JQueryEventObject): void {
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

    let tableScroll: Function = function(scrollType: string, isUp: boolean): boolean {
        if (!$("#workspaceTab").hasClass("active") ||
            !$("#worksheetButton").hasClass("active") ||
            gActiveTableId == null)
        {
            return false;
        }

        const $visibleMenu: JQuery = $('.menu:visible');
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

        const $rowInput: JQuery = $("#rowInput");
        const tableId: string = <string>gActiveTableId;
        const $lastTarget: JQuery = gMouseEvents.getLastMouseDownTarget();
        const isInMainFrame: boolean = !$lastTarget.context ||
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

            const maxRow: number = gTables[tableId].resultSetCount;
            const curRow: number = $rowInput.data("val");
            const lastRowNum: number = RowScroller.getLastVisibleRowNum(tableId);
            let rowToGo: number;

            // validation check
            xcAssert((lastRowNum != null), "Error Case!");

            if (scrollType === "homeEnd") {
                // isUp === true for home button, false for end button
                rowToGo = isUp ? 1 : maxRow;
            } else {
                let rowToSkip: number;
                if (scrollType === "updown") {
                    const $xcTbodyWrap: JQuery = $("#xcTbodyWrap-" + tableId);
                    const scrollTop: number = $xcTbodyWrap.scrollTop();
                    const $trs: JQuery = $("#xcTable-" + tableId + " tbody tr");
                    const trHeight: number = $trs.height();
                    let rowNum: number;

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

    function tableKeyEvents(event: JQueryEventObject): void {
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

            const $th: JQuery = $(".xcTable th.selectedCell");
            if ($th.length > 0) {
                event.preventDefault();
            }
            if ($th.length !== 1) {
                return;
            }

            $th.find(".dropdownBox").trigger(fakeEvent.click);
        }
    }

    let logoutRedirect: Function = function(): void {
        let msalUser: string = null;
        let msalAgentApplication: Msal.UserAgentApplication = null;
        const config: any = getMsalConfigFromLocalStorage();

        if (config != null &&
            config.hasOwnProperty('msal') &&
            config.msal.hasOwnProperty('enabled') &&
            config.msal.enabled) {

            const msalLogger: Msal.Logger = new Msal.Logger(
                msalLoggerCallback,
                { level: Msal["LogLevel"].Verbose, correlationId: '12345' }
            );

            function msalLoggerCallback(logLevel, message, piiEnabled) {
                console.log(message);
            }

            function msalAuthCallback(errorDesc, token, error, tokenType) {
                // this callback function provided to UserAgentApplication
                // is intentionally empty because the logout callback does
                // not need to do anything
            }

            msalAgentApplication = new Msal.UserAgentApplication(
                config.msal.clientID,
                null,
                msalAuthCallback,
                { cacheLocation: 'sessionStorage', logger: msalLogger }
            );

            msalUser = msalAgentApplication.getUser();
        }

        if (msalUser != null) {
            msalAgentApplication.logout();
        } else {
            window["location"]["href"] = paths.dologout;
        }
    }

    function isRetinaDevice(): boolean {
        return window.devicePixelRatio > 1;
    }

    function reImplementMouseWheel(e: JQueryEventObject): void {
        let deltaX: number = e.originalEvent["wheelDeltaX"] * -1;
        let deltaY: number = e.originalEvent["wheelDeltaY"];
        if (isNaN(deltaX)) {
            deltaX = e["deltaX"];
        }
        if (isNaN(deltaY)) {
            deltaY = e["deltaY"];
        }
        let x: number = Math.abs(deltaX);
        let y: number = Math.abs(deltaY);
        // iterate over the target and all its parents in turn
        const $target: JQuery = $(e.target);
        const $pathToRoot: JQuery = $target.add($target.parents());

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
            const $el: JQuery = $(this);
            let delta: number;

            if ($el.css("overflow") !== "hidden") {
                // do horizontal scrolling
                if (deltaX > 0) {
                    let scrollWidth: number = $el.prop("scrollWidth");
                    // because there is a rowReiszer in .idWrap,
                    // which wrongly detect the element as scrollable
                    // we just skip it
                    if ($el.closest(".dataTable").length) {
                        scrollWidth = 0;
                    }

                    const scrollLeftMax: number = scrollWidth - $el.outerWidth();
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
                    const scrollHeight: number = $el.prop("scrollHeight");
                    const scrollTopMax: number = scrollHeight - $el.outerHeight();
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
    function setupMouseWheel(): void {
        $(window).on("mousewheel", function(event: JQueryEventObject): void {
            // This code is only valid for Mac
            if (!window["isSystemMac"]) {
                return;
            }

            const isBrowserToHandle: boolean = window["isBrowserChrome"]
                                || window["isBrowserFirefox"]
                                || window["isBrowserSafari"];
            if (!isBrowserToHandle) {
                return;
            }

            if ((window["isBrowserChrome"] && isRetinaDevice()
                || window["isBrowserFirefox"]) &&
                ($(event.target).closest(".dataTable").length))
            {
                reImplementMouseWheel(event);
                // prevent back/forward swipe
                event.preventDefault();
                return;
            }

            const $target: JQuery = $(event.target);
            const $parents: JQuery = $(event.target).parents().add($target);
            // If none of the parents can be scrolled left
            // when we try to scroll left
            const prevent_left: boolean = event["deltaX"] < 0 && $parents.filter(function() {
                return $(this).scrollLeft() > 0;
            }).length === 0;

            // If none of the parents can be scrolled up
            // when we try to scroll up
            const prevent_up: boolean = event["deltaY"] > 0 && $parents.filter(function() {
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
    if (window["unitTestMode"]) {
        let oldLogoutRedirect: Function;
        let oldTableScroll: Function;
        xcManager["__testOnly__"] = {
            handleSetupFail: handleSetupFail,
            reImplementMouseWheel: reImplementMouseWheel,
            oneTimeSetup: oneTimeSetup,
            restoreActiveTable: restoreActiveTable,
            fakeLogoutRedirect: function() {
                oldLogoutRedirect = logoutRedirect;
                logoutRedirect = function() {};
            },
            resetLogoutRedirect: function() {
                logoutRedirect = oldLogoutRedirect;
            },
            fakeTableScroll: function(func) {
                oldTableScroll = tableScroll;
                tableScroll = func;
            },
            resetFakeScroll: function() {
                tableScroll = oldTableScroll;
            }
        };
    }
    /* End Of Unit Test Only */
}
