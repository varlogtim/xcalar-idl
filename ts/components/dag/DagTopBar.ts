class DagTopBar {
    private static _instance: DagTopBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $topBar: JQuery;

    public setup(): void {
        this.$topBar = $("#dagViewBar");
        this._setupMode();
        this._addEventListeners();
    }

    public switchMode(): void {
        this._setupMode();
    }

    public reset(): void {
        this._checkZoom();
    }

    public lock(): void {
        this.$topBar.addClass("locked");
    }

    public unlock(): void {
        this.$topBar.removeClass("locked");
    }

    public setState(dagTab: DagTab): void {
        const $btns: JQuery = this.$topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
            return;
        }

        $btns.find(".topButton").removeClass("xc-disabled");

        const $userOnlyBtns: JQuery = $btns.find(".publish");
        if (dagTab instanceof DagTabUser) {
            $userOnlyBtns.removeClass("xc-disabled");
        } else {
            $userOnlyBtns.addClass("xc-disabled");
        }

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run, .optimizedRun, .duplicate");
        if (dagTab instanceof DagTabUser || dagTab instanceof DagTabPublished) {
            $userAndPublishOnlyBtns.removeClass("xc-disabled");
        } else {
            $userAndPublishOnlyBtns.addClass("xc-disabled");
        }

        const graph: DagGraph = dagTab.getGraph();
        if (graph != null && graph.getExecutor() != null) {
            $btns.find(".stop").removeClass("xc-disabled");
        } else {
            $btns.find(".stop").addClass("xc-disabled");
        }

        if (graph != null) {
            let scale = graph.getScale() * 100;
            this.$topBar.find(".zoomPercentInput").val(scale);
        }
    }

    private _setupMode(): void {
        const $btns: JQuery = this.$topBar.find(".topButtons");
        const $btnsToHideInSQLMode: JQuery = $btns.find(".optimizedRun, .publish");
        if (XVM.isSQLMode()) {
            $btnsToHideInSQLMode.addClass("xc-hidden");
        } else {
            $btnsToHideInSQLMode.removeClass("xc-hidden");
        }
    }

    private _addEventListeners(): void {
        const self = this;
        this.$topBar.find(".run").click(function() {
            DagViewManager.Instance.run();
        });

        this.$topBar.find(".optimizedRun").click(function() {
            DagViewManager.Instance.run(null, true);
        });

        this.$topBar.find(".stop").click(function() {
            DagViewManager.Instance.cancel();
        });

        this.$topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled") || DagViewManager.Instance.getActiveDag().isLocked()) {
                return;
            }
            Log.undo();
        });

        this.$topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled") || DagViewManager.Instance.getActiveDag().isLocked()) {
                return;
            }
            Log.redo();
        });

        this.$topBar.find(".zoomIn").click(function() {
            DagViewManager.Instance.zoom(true);
            let percent = DagViewManager.Instance.getActiveDag().getScale() * 100;
            $("#dagViewBar .zoomPercent input").val(percent);
            self._checkZoom();
        });

        this.$topBar.find(".zoomOut").click(function() {
            DagViewManager.Instance.zoom(false);
            let percent = DagViewManager.Instance.getActiveDag().getScale() * 100;
            $("#dagViewBar .zoomPercent input").val(percent);
            self._checkZoom();
        });

        this.$topBar.find(".zoomPercent").on('keyup', function(e) {
            if (e.which == 13) {
                e.preventDefault();
                let percent: number = $(this).find("input").val();
                if (percent <= 0 || percent > 200) {
                    StatusBox.show("Zoom must be between 0% and 200%",
                        $(this));
                    return;
                }
                DagViewManager.Instance.zoom(true, percent / 100)
                self._checkZoom();
            }
        });

        this.$topBar.find(".duplicate").click(() => {
            this._duplicateTab();
        });

        this.$topBar.find(".publish").click(() => {
            const tab: DagTab = DagViewManager.Instance.getActiveTab();
            DFPublishModal.Instance.show(<DagTabUser>tab);
        });

        this.$topBar.find(".download").click(() => {
            const tab: DagTab = DagViewManager.Instance.getActiveTab();
            DFDownloadModal.Instance.show(tab);
        });

        this.$topBar.find(".upload").click(() => {
            DFUploadModal.Instance.show();
        });

        // settings button
        this.$topBar.find(".setting").click(() => {
            DFSettingsModal.Instance.show();
        });
    }

    private _checkZoom(): void {
        const $zoomIn = this.$topBar.find(".zoomIn");
        const $zoomOut = this.$topBar.find(".zoomOut");
        $zoomIn.removeClass("disabled");
        $zoomOut.removeClass("disabled");
        const scale = DagViewManager.Instance.getActiveDag().getScale();
        let scaleIndex = DagView.zoomLevels.indexOf(scale);
        if (scaleIndex == -1) {
            if (scale < DagView.zoomLevels[0]) {
                scaleIndex = 0;
            } else {
                scaleIndex = 1;
            }
        }
        if (scaleIndex === 0) {
            $zoomOut.addClass("disabled");
        } else if (scaleIndex === DagView.zoomLevels.length - 1) {
            $zoomIn.addClass("disabled");
        }
    }

    private _duplicateTab(): void {
        const tab: DagTab = DagViewManager.Instance.getActiveTab();
        DagTabManager.Instance.duplicateTab(tab);
    }
}