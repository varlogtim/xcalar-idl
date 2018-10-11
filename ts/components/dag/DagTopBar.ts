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
        if (dagTab == null) {
            return;
        }

        const $btns: JQuery = this.$topBar.find(".topButtons");
        if (dagTab instanceof DagTabUser) {
            $btns.find(".share").removeClass("xc-disabled");
        } else {
            $btns.find(".share").addClass("xc-disabled");
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
            DagView.share();
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

}