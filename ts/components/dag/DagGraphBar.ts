class DagGraphBar {
    private static _instance: DagGraphBar;
    private _curDagTab: DagTab;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    /**
     * DagGraphBar.Instance.toggleDisable
     * @param disable
     */
    public toggleDisable(disable: boolean): void {
        // Not use this.$dagView as it's called before setup
        let $btns: JQuery = this._getGraphBar().find(".topButtons");
        if (disable) {
            $btns.addClass("xc-disabled");
        } else {
            $btns.removeClass("xc-disabled");
        }
    }

    public setup(): void {
        this._addEventListeners();
        this._setupActionMenu();
    }

    public reset(): void {
        this._checkZoom();
    }

    public lock(): void {
        this._getGraphBar().addClass("locked");
    }

    public unlock(): void {
        this._getGraphBar().removeClass("locked");
    }

    /**
     * DagGraphBar.Instance.setState
     * @param dagTab
     */
    public setState(dagTab: DagTab): void {
        let activeTab: DagTab = DagViewManager.Instance.getActiveTab();
        if (activeTab && dagTab !== activeTab) {
            return;
        }
        let $topBar = this._getGraphBar();
        const $btns: JQuery = $topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
            this._getMenu().find("li:not(.noTabRequired)").addClass("xc-disabled");
            return;
        }
        this._curDagTab = dagTab;

        $btns.find(".topButton").removeClass("xc-disabled");
        this._getMenu().find("li").removeClass("xc-disabled");

        const $userAndPublishOnlyBtns: JQuery = $btns.find(".run");
        if (dagTab instanceof DagTabUser || dagTab instanceof DagTabPublished) {
            $userAndPublishOnlyBtns.removeClass("xc-disabled");
        } else {
            $userAndPublishOnlyBtns.addClass("xc-disabled");
        }

        const isViewOnly: boolean = (dagTab instanceof DagTabProgress);
        if (isViewOnly) {
            $topBar.addClass("viewOnly");
        } else {
            $topBar.removeClass("viewOnly");
        }

        const graph: DagGraph = dagTab.getGraph();

        if (graph != null && graph.getExecutor() != null) {
            $topBar.addClass("running");
            $btns.find(".stop").removeClass("xc-disabled");
            $btns.find(".run, .stop").addClass("running");
        } else {
            $topBar.removeClass("running");
            $btns.find(".stop").addClass("xc-disabled");
            $btns.find(".run, .stop").removeClass("running");
        }

        if (graph != null) {
            let scale = Math.round(graph.getScale() * 100);
            $topBar.find(".zoomPercentInput").val(scale);
        }
        if (dagTab instanceof DagTabSQLFunc) {
            $topBar.addClass("sqlFunc");
        } else {
            $topBar.removeClass("sqlFunc");
        }
        this.updateNumNodes(dagTab);
    }

    public updateNumNodes(dagTab: DagTab): void {
        if (dagTab == null || dagTab !== this._curDagTab) {
            return;
        }
        const graph: DagGraph = dagTab.getGraph();
        if (!graph) {
            return;
        }
        const $topBar = this._getGraphBar();
        const numNodes: number = graph.getAllNodes().size;
        $topBar.find(".numNodes").text(xcStringHelper.numToStr(numNodes));
    }

    private _getGraphBar(): JQuery {
        return $("#dagGraphBar");
    }

    private _addEventListeners(): void {
        const self = this;
        let $topBar = this._getGraphBar();
        $topBar.find(".run").click(function() {
            DagViewManager.Instance.run();
        });

        $topBar.find(".stop").click(function() {
            DagViewManager.Instance.cancel();
        });

        $topBar.find(".useInSQL").click(function() {
            const dagTab = DagViewManager.Instance.getActiveTab();
            if (dagTab instanceof DagTabSQLFunc) {
                SQLWorkSpace.Instance.tableFuncQuery(dagTab.getName());
            }
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
            if (e.which == keyCode.Enter) {
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
    }

    private _updateZoom(): void {
        let dagTab = DagViewManager.Instance.getActiveDag();
        if (dagTab != null) {
            let percent = Math.round(dagTab.getScale() * 100);
            $("#dagGraphBar .zoomPercent input").val(percent);
            this._checkZoom();
        }
    }

    private _checkZoom(): void {
        let $topBar = this._getGraphBar();
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

    private _getMenu(): JQuery {
        return $("#dagView .optionsMenu");
    }


    private _setupActionMenu(): void {
        const $menu: JQuery = this._getMenu();
        xcMenu.add($menu);

        this._getGraphBar().find(".optionsBtn").click(function () {
            const $target = $(this);
            MenuHelper.dropdownOpen($target, $menu, {
                "offsetY": -1,
                "toggle": true
            });
        });

        $menu.on("click", ".settings", () => {
            DFSettingsModal.Instance.show();
        });
        // param and aggregates managed in DagAggManager and ParamAggManager
    }
}