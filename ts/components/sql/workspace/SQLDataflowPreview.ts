class SQLDataflowPreview {
    private static _instance: SQLDataflowPreview;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private readonly _container: string = "sqlDataflowArea";

    private constructor() {
        this._addEventListeners();
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    public show(inProgress?: boolean) {
        let $container = this._getContainer();
        $container.removeClass("xc-hidden");
        if (inProgress) {
            $container.addClass("inProgress");
        } else {
            $container.removeClass("inProgress");
        }
    }

    public close() {
        const $dfArea = this._getContainer().find(".dataflowArea");
        if ($dfArea.length) {
            DagViewManager.Instance.cleanupClosedTab(null, $dfArea.data("id"));
        }
        this._getContainer().addClass("xc-hidden");
    }

    private _addEventListeners(): void {
        const $topSection = this._getTopSection();

        $topSection.find(".analyze").click(() => {
            const dataflowId: string = this._getContainer().find(".dataflowArea").data("id");
            this.analyze(dataflowId);
        });
    }

    public analyze(dataflowId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XVM.setMode(XVM.Mode.Advanced)
        .then(() => {
            $("#initialLoadScreen").show();
            MainMenu.openPanel("dagPanel");
            let dagTab: DagTab = DagList.Instance.getDagTabById(dataflowId);
            if (dagTab == null) {
                Alert.error(AlertTStr.Error, "The corresponding dataflow for sql has been deleted");
                return PromiseHelper.reject();
            }
            return DagTabManager.Instance.loadTab(dagTab);
        })
        .then(() => {
            DagViewManager.Instance.autoAlign(dataflowId);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $("#initialLoadScreen").hide();
        });

        return deferred.promise();
    }
}