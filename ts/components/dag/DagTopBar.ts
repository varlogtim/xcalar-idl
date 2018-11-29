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
            $btns.hide();
            return;
        }

        $btns.show();
        if (dagTab instanceof DagTabUser) {
            $btns.find(".share").removeClass("xc-disabled");
        } else {
            $btns.find(".share").addClass("xc-disabled");
        }

        if (dagTab instanceof DagTabCustom || dagTab instanceof DagTabSQL) {
            $btns.find(".autoSave, .save").addClass("xc-disabled");
        } else {
            $btns.find(".autoSave, .save").removeClass("xc-disabled");
        }

        // set state for auto save and save button
        const $autoSave: JQuery = $btns.find(".autoSave");
        xcTooltip.remove($autoSave);
        if (dagTab instanceof DagTabUser) {
            this._toggleAutoSave(dagTab.isAutoSave());
        } else if (dagTab instanceof DagTabShared) {
            this._toggleAutoSave(false);
            xcTooltip.add($autoSave, {
                title: DFTStr.NoAutoSave,
                placement: "left"
            })
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
            // XXX need to remove original undo buttons first
            // Log.undo();
        });

        this.$topBar.find(".redo").click(function() {
            if ($(this).hasClass("disabled") || DagView.getActiveDag().isLocked()) {
                return;
            }

            // Log.redo();
        });

        this.$topBar.find(".zoomIn").click(function() {
            DagView.zoom(true);
            self._checkZoom();
        });

        this.$topBar.find(".zoomOut").click(function() {
            DagView.zoom(false);
            self._checkZoom();
        });

        this.$topBar.find(".share").click(() => {
            const tab: DagTab = DagView.getActiveTab();
            if (tab instanceof DagTabUser) {
                ShareDFModal.show(tab);
            }
        });

        this.$topBar.find(".download").click(() => {
            const tab: DagTab = DagView.getActiveTab();
            DFDownloadModal.Instance.show(tab);
        });

        this.$topBar.find(".upload").click(() => {
            DFUploadModal.Instance.show();
        });

        this.$topBar.find(".autoSave").click(() => {
            const dagTab: DagTab = DagView.getActiveTab();
            if (dagTab instanceof DagTabUser) {
                const $switch: JQuery = this.$topBar.find(".autoSave .switch");
                const autoSave: boolean = !$switch.hasClass("on");
                this._toggleAutoSave(autoSave);
                dagTab.setAutoSave(autoSave);
            }
        });

        this.$topBar.find(".save").click((event) => {
            const dagTab: DagTab = DagView.getActiveTab();
            if (!(dagTab instanceof DagTabCustom)) {
                const $btn: JQuery = $(event.currentTarget);
                xcHelper.disableSubmit($btn);

                dagTab.save(true)
                .then(() => {
                    xcHelper.showSuccess(SuccessTStr.Saved);
                })
                .fail((error) => {
                    Alert.error(AlertTStr.Error, error);
                })
                .always(() => {
                    xcHelper.enableSubmit($btn);
                });
            }
        });

        // settings button
        this.$topBar.find(".setting").click(() => {
            DFSettingsModal.Instance.show();
        });
    }

    private _checkZoom() {
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

    private _toggleAutoSave(autoSave: boolean): void {
        const $switch: JQuery = this.$topBar.find(".autoSave .switch");
        if (autoSave) {
            $switch.addClass("on");
            this.$topBar.find(".save").addClass("xc-disabled");
        } else {
            $switch.removeClass("on");
            this.$topBar.find(".save").removeClass("xc-disabled");
        }
    }
}