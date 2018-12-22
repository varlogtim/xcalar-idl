class DagTopBar {
    private static _instance: DagTopBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $topBar: JQuery;

    public setup(): void {
        this.$topBar = $("#dagViewBar");
        this._addEventListeners();
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

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run, .duplicate");
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
    }

    private _addEventListeners(): void {
        const self = this;
        this.$topBar.find(".run").click(function() {
            DagView.run();
        });

        this.$topBar.find(".stop").click(function() {
            DagView.cancel();
        });

        this.$topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled") || DagView.getActiveDag().isLocked()) {
                return;
            }
            Log.undo();
        });

        this.$topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled") || DagView.getActiveDag().isLocked()) {
                return;
            }
            Log.redo();
        });

        this.$topBar.find(".zoomIn").click(function() {
            DagView.zoom(true);
            self._checkZoom();
        });

        this.$topBar.find(".zoomOut").click(function() {
            DagView.zoom(false);
            self._checkZoom();
        });

        this.$topBar.find(".duplicate").click(() => {
            this._duplicateTab();
        });

        this.$topBar.find(".publish").click(() => {
            const tab: DagTab = DagView.getActiveTab();
            DFPublishModal.Instance.show(<DagTabUser>tab);
        });

        this.$topBar.find(".download").click(() => {
            const tab: DagTab = DagView.getActiveTab();
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
        const scale = DagView.getActiveDag().getScale();
        const scaleIndex = DagView.zoomLevels.indexOf(scale);
        if (scaleIndex === 0) {
            $zoomOut.addClass("disabled");
        } else if (scaleIndex === DagView.zoomLevels.length - 1) {
            $zoomIn.addClass("disabled");
        }
    }

    private _duplicateTab(): void {
        const tab: DagTab = DagView.getActiveTab();
        DagTabManager.Instance.duplicateTab(tab);
    }
}