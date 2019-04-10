class MemoryAlert {
    private static _instance: MemoryAlert;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $memoryAlert: JQuery;
    private _turnOffRedMemoryAlert: boolean;
    private _isCheckingMem: boolean;

    private constructor() {
        this.$memoryAlert = $("#memoryAlert");
        this._turnOffRedMemoryAlert = false;
        this._isCheckingMem = false;
    }

    public setup(): void {
        this.$memoryAlert.click(function() {
            if ($("#container").hasClass("noWorkbook") ||
                $("#container").hasClass("switchingWkbk")) {
                WorkbookPanel.goToMonitor();
                return;
            }
            const $el = $(this);
            if (!$el.hasClass("yellow") && !$el.hasClass("red")) {
                MainMenu.openPanel("monitorPanel", "systemButton");
                return false;
            }
            if ($el.hasClass("tableAlert")) {
                MainMenu.openPanel("monitorPanel", "systemButton");
                DeleteTableModal.Instance.show();
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

    /**
     * MemoryAlert.Instance.detectUsage
     * @param topOutput
     */
    public detectUsage(topOutput: any): XDPromise<void> {
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

        const shouldAlert: boolean = this.handleMemoryUsage(highestMemUsage, avgUsg);
        if (shouldAlert) {
            return PromiseHelper.alwaysResolve(TblManager.refreshOrphanList());
        } else {
            return PromiseHelper.resolve();
        }
    }

    /**
    *  MemoryAlert.Instance.check
    * @param onlyCheckOnWarn
    */
    public check(onlyCheckOnWarn: boolean = false): XDPromise<void> {
        if (this._isCheckingMem) {
            console.warn("Last time's memory check not finish yet");
            return PromiseHelper.resolve();
        } else if (onlyCheckOnWarn && !this.hasMemoryWarn()) {
            // this case no need to check
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._isCheckingMem = true;

        this.refreshTables()
            .then(XcalarApiTop)
            .then((topOutPut) => {
                return this.detectUsage(topOutPut);
            })
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                this._isCheckingMem = false;
            });

        return deferred.promise();
    }

    private hasMemoryWarn(): boolean {
        const $memoryAlert: JQuery = this.$memoryAlert;
        return ($memoryAlert.hasClass("yellow") ||
            $memoryAlert.hasClass("red"));
    }

    private refreshTables(): XDPromise<void> {
        if (WorkbookManager.getActiveWKBK() == null) {
            return PromiseHelper.resolve();
        } else if (this.hasNoTables()) {
            // no tables, need a refresh
            var promise = TblManager.refreshOrphanList();
            return PromiseHelper.alwaysResolve(promise);
        } else {
            return PromiseHelper.resolve();
        }
    }

    private redMemoryAlert(): void {
        if (this._turnOffRedMemoryAlert || Alert.isOpen()) {
            return;
        }

        const instr: string = xcStringHelper.replaceMsg(MonitorTStr.LowMemInstr, {
            link: paths.memory
        });
        Alert.show({
            title: MonitorTStr.LowMem,
            instrTemplate: instr,
            msg: MonitorTStr.LowMemMsg,
            isAlert: true,
            isCheckBox: true,
            buttons: [{
                name: MonitorTStr.ClearMemOption,
                className: "clear memory",
                func: () => {
                    DagTblManager.Instance.emergencyClear();
                }
            }],
            onCancel: (checked) => {
                this._turnOffRedMemoryAlert = checked;
            }
        });
    }

    private handleMemoryUsage(
        highestMemUsage: number,
        avgMemUsage: number
    ): boolean {
        const autoTableThreshold: number = 0.3;
        const yellowThreshold: number = 0.6;
        const redThreshold: number = 0.8;

        const $memoryAlert: JQuery = this.$memoryAlert;
        $memoryAlert.removeClass("inActive");

        let shouldAlert: boolean = false;
        if (highestMemUsage > redThreshold) {
            DagTblManager.Instance.setClockTimeout(60);
            // when it's red, can stop loop immediately
            $memoryAlert.addClass("red").removeClass("yellow");
            shouldAlert = true;
            this.redMemoryAlert();
        } else if (highestMemUsage > yellowThreshold) {
            DagTblManager.Instance.setClockTimeout(120);
            // when it's yellow, should continue loop
            // to see if it has any red case
            $memoryAlert.addClass("yellow").removeClass("red");
            shouldAlert = true;
        } else {
            if (highestMemUsage > autoTableThreshold) {
                DagTblManager.Instance.setClockTimeout(240);
            } else {
                DagTblManager.Instance.setClockTimeout(-1);
            }
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
            if (this.hasNoTables()) {
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

    private hasNoTables(): boolean {
        return jQuery.isEmptyObject(gTables) && gOrphanTables.length === 0;
    }
}