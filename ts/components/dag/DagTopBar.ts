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

    /**
     * DagTopBar.Instance.setState
     * @param dagTab
     */
    public setState(dagTab: DagTab): void {
        let $topBar = this._getTopBar();
        const $btns: JQuery = $topBar.find(".topButtons");
        if (dagTab == null) {
            $btns.find(".topButton:not(.noTabRequired)").addClass("xc-disabled");
        } else {
            $btns.find(".topButton").removeClass("xc-disabled");
        }
    }

    private _getTopBar(): JQuery {
        return $("#dagViewBar");
    }
}