namespace XcSupport {
    var _commitCheckTimer: number;

    var _connectionCheckTimer: number;

    var _isCheckingMem: boolean = false;
    var _turnOffRedMemoryAlert: boolean = false;
    var _heartbeatLock: number = 0;
    
    /** =========== Memory Alert Helper =================== **/
    function hasMemoryWarn(): boolean {
        const $memoryAlert: JQuery = $("#memoryAlert");
        return ($memoryAlert.hasClass("yellow") ||
                $memoryAlert.hasClass("red"));
    }

    function refreshTables(): XDPromise<void> {
        if (WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        } else if (jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0) {
            // no tables, need a refresh
            var promise = TableList.refreshOrphanList(false);
            return PromiseHelper.alwaysResolve(promise);
        } else {
            return PromiseHelper.resolve();
        }
    }

    function redMemoryAlert(): void {
        if (_turnOffRedMemoryAlert || Alert.isVisible()) {
            return;
        }

        const instr: string = xcHelper.replaceMsg(MonitorTStr.LowMemInstr, {
            link: paths.memory
        });
        Alert.show({
            title: MonitorTStr.LowMem,
            instrTemplate: instr,
            msg: MonitorTStr.LowMemMsg,
            isAlert: true,
            isCheckBox: true,
            onCancel: () => {
                _turnOffRedMemoryAlert = Alert.isChecked();
            }
        });
    }

    function handleMemoryUsage(
        highestMemUsage: number,
        avgMemUsage: number
    ): boolean {
        const yellowThreshold: number = 0.6;
        const redThreshold: number = 0.8;

        const $memoryAlert: JQuery = $("#memoryAlert").removeClass("inActive");
        let shouldAlert: boolean = false;

        if (highestMemUsage > redThreshold) {
            // when it's red, can stop loop immediately
            $memoryAlert.addClass("red").removeClass("yellow");
            shouldAlert = true;
            redMemoryAlert();
        } else if (highestMemUsage > yellowThreshold) {
            // when it's yellow, should continue loop
            // to see if it has any red case
            $memoryAlert.addClass("yellow").removeClass("red");
            shouldAlert = true;
        } else {
            $memoryAlert.removeClass("red").removeClass("yellow");
        }

        const highPercent: string = Math.round(highestMemUsage * 100) + "%";
        const percent: string = Math.round(avgMemUsage * 100) + "%";
        const highestUsageText: string = "<br>" +
        CommonTxtTstr.HighXcalarMemUsage + ": " + highPercent;
        const usageText: string = "<br>" + CommonTxtTstr.XcalarMemUsage + ": " + percent;

        let text: string;
        if (shouldAlert) {
            // we want user to drop table first and only when no tables
            // let them drop ds
            if (jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0)
            {
                text = TooltipTStr.LowMemInDS + highestUsageText + usageText;
                $memoryAlert.removeClass("tableAlert");
            } else {
                text = TooltipTStr.LowMemInTable + highestUsageText + usageText;
                $memoryAlert.addClass("tableAlert");
            }
        } else {
            text = TooltipTStr.SystemGood + usageText;
        }

        xcTooltip.changeText($memoryAlert, text);
        return shouldAlert;
    }
    /** =========== End of Memory Alert Helper =================== **/

    function autoSave(): XDPromise<void> {
        if (Log.hasUncommitChange() || KVStore.hasUnCommitChange()) {
            return KVStore.commit();
        } else {
            return PromiseHelper.resolve();
        }
    }

    function checkXcalarConnection(): XDPromise<boolean> {
        // if we get this status, there may not be a connection to the backend
        // if xcalargetversion doesn't work then it's very probably that
        // there is no connection so alert.
        return XVM.checkVersion(true);
    }

    function checkConnectionTrigger(cnt: number, alertId: string): void {
        const interval: number = 1000; // 1s/update
        const connectionCheckInterval: number = 10000; // 10s/check
        
        const mod: number = Math.floor(connectionCheckInterval / interval);
        cnt = cnt % mod;

        const shouldCheck: boolean = (cnt === 0);
        const timeRemain: number = (connectionCheckInterval - cnt * interval) / 1000;
        
        let msg: string = AlertTStr.NoConnect + " ";
        msg += shouldCheck
                ? AlertTStr.Connecting
                : xcHelper.replaceMsg(AlertTStr.TryConnect, {
                    second: timeRemain
                });

        Alert.updateMsg(alertId, msg);

        clearTimeout(_connectionCheckTimer);

        _connectionCheckTimer = <any>setTimeout(() => {
            if (shouldCheck) {
                // if fail, continue to another check
                checkXcalarConnection()
                .then((versionMatch) => {
                    clearTimeout(_connectionCheckTimer);
                    // reload browser if connection back
                    const hardLoad: boolean = !versionMatch;
                    xcHelper.reload(hardLoad);
                })
                .fail(() => {
                    checkConnectionTrigger(cnt + 1, alertId);
                });
            } else {
                checkConnectionTrigger(cnt + 1, alertId);
            }
        }, interval);
    }

    /**
     * XcSupport.detectMemoryUsage
     * @param topOutput
     */
    export function detectMemoryUsage(topOutput: any): XDPromise<void> {
        let highestMemUsage: number = 0;
        let used: number = 0;
        let total: number = 0;
        let numNodes: number = topOutput.numNodes;

        for (let i = 0; i < numNodes; i++) {
            const node: any = topOutput.topOutputPerNode[i];
            const xdbUsage: number = node.xdbUsedBytes / node.xdbTotalBytes;

            used += node.xdbUsedBytes;
            total += node.xdbTotalBytes;

            highestMemUsage = Math.max(highestMemUsage, xdbUsage);
        }

        let avgUsg: number = used / total;
        if (isNaN(avgUsg)) {
            avgUsg = 0;
        }

        const shouldAlert: boolean = handleMemoryUsage(highestMemUsage, avgUsg);
        if (shouldAlert) {
            return PromiseHelper.alwaysResolve(TableList.refreshOrphanList(false));
        } else {
            return PromiseHelper.resolve();
        }
    }

    /**
     * XcSupport.memoryCheck
     * @param onlyCheckOnWarn
     */
    export function memoryCheck(onlyCheckOnWarn: boolean): XDPromise<void> {
        if (_isCheckingMem) {
            console.warn("Last time's mem check not finish yet");
            return PromiseHelper.resolve();
        } else if (onlyCheckOnWarn && !hasMemoryWarn()) {
            // this case no need to check
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        _isCheckingMem = true;

        refreshTables()
        .then(XcalarApiTop)
        .then(XcSupport.detectMemoryUsage)
        .then(deferred.resolve)
        .fail(deferred.reject)
        .always(() => {
            _isCheckingMem = false;
        });

        return deferred.promise();
    }

    /**
     * XcSupport.heartbeatCheck
     */
    export function heartbeatCheck(): void {
        if (WorkbookManager.getActiveWKBK() == null) {
            console.info("no active workbook, not check");
            return;
        }

        let isChecking: boolean = false;
        // 2 mins each check by default
        let commitCheckInterval: number =
        (UserSettings.getPref('commitInterval') * 1000) || 120000;

        clearInterval(_commitCheckTimer);
        _commitCheckTimer = <any>setInterval(() => {
            if (KVStore.getKey("commitKey") == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            // last time not finishing
            if (isChecking) {
                console.warn("Last time's check not finishing yet!");
                return;
            }

            isChecking = true;
            XcUser.CurrentUser.commitCheck(true)
            .then(() => {
                return XcSupport.memoryCheck(false);
            })
            .then(() => {
                return autoSave();
            })
            .fail((error) => {
                console.error(error);
            })
            .always(() => {
                isChecking = false;
            });

        }, commitCheckInterval);
    }

    /**
     * XcSupport.stopHeartbeatCheck
     */
    export function stopHeartbeatCheck(): void {
        clearInterval(_commitCheckTimer);
        _commitCheckTimer = null;
        _heartbeatLock++;
        // console.log("lock to", heartbeatLock);
    }

    /**
     * XcSupport.restartHeartbeatCheck
     */
    export function restartHeartbeatCheck(): void {
        if (_heartbeatLock === 0) {
            console.error("wrong trigger, must combine with stopHeartbeatCheck");
            return;
        }
        _heartbeatLock--;
        // console.log("unlock to", heartbeatLock);
        if (_heartbeatLock > 0) {
            console.info("heart beat is locked");
            return;
        }

        return XcSupport.heartbeatCheck();
    }

    /**
     * XcSupport.hasHeartbeatCheck
     */
    export function hasHeartbeatCheck(): boolean {
        return (_commitCheckTimer != null);
    }

    /**
     * XcSupport.checkConnection
     */
    export function checkConnection() {
        checkXcalarConnection()
        .fail(() => {
            const error: object = {error: ThriftTStr.CCNBE};
            const id: string = Alert.error(ThriftTStr.CCNBEErr, error, {
                lockScreen: true,
                noLogout: true
            });
            Log.backup();

            checkConnectionTrigger(10, id);
        });
    }

    /**
     * XcSupport.downloadLRQ
     */
    export function downloadLRQ(lrqName: string): void {
        XcalarExportRetina(lrqName)
        .then((a) => {
            xcHelper.downloadAsFile(lrqName + ".tar.gz", a.retina, true);
        })
        .fail((error) => {
            Alert.error(DFTStr.DownloadErr, error);
        });
    }

    /**
     * XcSupport.getRunTimeBreakdown
     * @param dfName
     */
    export function getRunTimeBreakdown(dfName: string): void {
        XcalarQueryState(dfName)
        .then((ret) => {
            const nodeArray: any[] = ret.queryGraph.node;
            for (let i = 0; i < nodeArray.length; i++) {
                console.log(XcalarApisTStr[nodeArray[i].api] + " - " +
                            nodeArray[i].name.name + ": " +
                            nodeArray[i].elapsed.milliseconds + "ms");
            }
        });
    }
}
