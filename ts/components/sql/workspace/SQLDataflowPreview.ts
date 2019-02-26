class SQLDataflowPreview {
    private static _instance: SQLDataflowPreview;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private readonly _container: string = "sqlDataflowArea";
    private _sql: string;

    private constructor() {
        this._addEventListeners();
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _getTopSection(): JQuery {
        return this._getContainer().find(".topSection");
    }

    public show(inProgress: boolean, sql?: string) {
        this._sql = sql || null;
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
        this._sql = null;
    }

    private _addEventListeners(): void {
        const $topSection = this._getTopSection();

        $topSection.find(".analyze").click(() => {
            this.analyze(this._sql);
        });
    }

    public analyze(sql: string): XDPromise<void> {
        if (sql == null) {
            Alert.error(AlertTStr.Error, "The corresponding dataflow for sql has been deleted");
            return PromiseHelper.reject();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let dagTab: DagTabUser;

        this._alertAnalyze()
        .then(() => {
            $("#initialLoadScreen").show();
            return this._restoreDataflow(sql);
        })
        .then((resultTab) => {
            dagTab = resultTab;
            return XVM.setMode(XVM.Mode.Advanced);
        })
        .then(() => {
            MainMenu.openPanel("dagPanel");
            return DagTabManager.Instance.loadTab(dagTab);
        })
        .then(() => {
            deferred.resolve();
        })
        .fail((error) => {
            if (error != null &&
                error !== "canceled" &&
                !Alert.isOpen()
            ) {
                Alert.error(ErrTStr.Error, error);
            }
            deferred.reject(error);
        })
        .always(() => {
            $("#initialLoadScreen").hide();
        });

        return deferred.promise();
    }

    private _alertAnalyze(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        Alert.show({
            title: SQLTStr.EditAdvanced,
            msg: SQLTStr.EditAdvancedInstr,
            onConfirm: () => {
                deferred.resolve();
            },
            onCancel: () => {
                deferred.reject("canceled");
            },
        })

        return deferred.promise();
    }

    private _restoreDataflow(sql: string): XDPromise<DagTabUser> {
        try {
            const deferred: XDDeferred<DagTabUser> = PromiseHelper.deferred();
            SQLUtil.Instance.getSQLStruct(sql)
            .then((sqlStruct) => {
                let executor = new SQLExecutor(sqlStruct, true);
                return executor.restoreDataflow();
            })
            .then((_dataflowId, dagTab: DagTabUser) => {
                deferred.resolve(dagTab);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject(e.message);
        }
    }
}