class DagTopBar {
    private static _instance: DagTopBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * DagTopBar.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        // Not use this.$dagView as it's called before setup
        let $btns: JQuery = this._getTopBar().find(".topButtons");
        if (disable) {
            $btns.addClass("xc-disabled");
        } else {
            $btns.removeClass("xc-disabled");
        }
    }

    public setup(): void {
        this._addEventListeners();
    }

    public reset(): void {
        this._checkZoom();
    }

    public lock(): void {
        this._getTopBar().addClass("locked");
    }

    public unlock(): void {
        this._getTopBar().removeClass("locked");
    }

    /**
     * DagTopBar.Instance.setState
     * @param dagTab
     */
    public setState(dagTab: DagTab): void {
        let $topBar = this._getTopBar();
        const $btns: JQuery = $topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
            return;
        }

        $btns.find(".topButton").removeClass("xc-disabled");

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run");
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
            let scale = Math.round(graph.getScale() * 100);
            $topBar.find(".zoomPercentInput").val(scale);
        }
    }

    private _getTopBar(): JQuery {
        return $("#dagViewBar");
    }

    private _addEventListeners(): void {
        const self = this;
        let $topBar = this._getTopBar();
        $topBar.find(".run").click(function() {
            DagViewManager.Instance.run();
        });

        $topBar.find(".stop").click(function() {
            DagViewManager.Instance.cancel();
        });

        $topBar.find(".undo").click(function() {
            if ($(this).hasClass("disabled") || $(this).hasClass("locked")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.undo();
        });

        $topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled") || $(this).hasClass("locked")) {
                return;
            }
            let dagTab = DagViewManager.Instance.getActiveDag();
            if (!dagTab || dagTab.isLocked()) {
                return;
            }
            Log.redo();
        });

        $topBar.find(".zoomIn").click(function() {
            DagViewManager.Instance.zoom(true);
            self._updateZoom();
        });

        $topBar.find(".zoomOut").click(function() {
            DagViewManager.Instance.zoom(false);
            self._updateZoom();
        });

        $topBar.find(".zoomPercentInput").on('keyup', function(e) {
            if (e.which == 13) {
                e.preventDefault();
                let percent: number = $(this).val();
                if (percent <= 0 || percent > 200) {
                    StatusBox.show("Zoom must be between 1% and 200%",
                        $(this));
                    return;
                }
                percent = Math.round(percent) || 1;
                $(this).val(percent);
                DagViewManager.Instance.zoom(true, percent / 100)
                self._checkZoom();
            }
        });

        $topBar.find(".zoomPercentInput").blur(() => {
            // if user types without saving, we should reset the zoom to the
            // last saved zoom
            this._updateZoom();
        });

        // settings button
        $topBar.find(".setting").click(() => {
            DFSettingsModal.Instance.show();
        });
    }

    private _updateZoom(): void {
        let dagTab = DagViewManager.Instance.getActiveDag();
        if (dagTab != null) {
            let percent = Math.round(dagTab.getScale() * 100);
            $("#dagViewBar .zoomPercent input").val(percent);
            this._checkZoom();
        }
    }

    private _checkZoom(): void {
        let $topBar = this._getTopBar();
        const $zoomIn = $topBar.find(".zoomIn");
        const $zoomOut = $topBar.find(".zoomOut");
        $zoomIn.removeClass("disabled");
        $zoomOut.removeClass("disabled");
        let dagTab = DagViewManager.Instance.getActiveDag();
        if (dagTab == null) {
            return;
        }
        const scale = dagTab.getScale();
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
}