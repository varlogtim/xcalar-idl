class SQLDataflowPreview {
    private _container: string;
    private _sql: string;

    public constructor(container: string) {
        this._container = container;
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
            Alert.error(AlertTStr.Error, "The corresponding plan for sql has been deleted");
            return PromiseHelper.reject();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let dagTab: DagTabUser;

        this._alertAnalyze()
        .then((tabName) => {
            $("#initialLoadScreen").show();
            return SQLDataflowPreview.restoreDataflow(sql, tabName);
        })
        .then((resultTab) => {
            dagTab = resultTab;
            return XVM.setMode(XVM.Mode.Advanced);
        })
        .then(() => {
            DagViewManager.Instance.toggleSqlPreview(false);
            return DagTabManager.Instance.loadTab(<DagTab>dagTab);
        })
        .then(() => {
            // add to log to prevent this operation from being undone
            // undoing causes a bug when we reload this graph from kvstore
            Log.add(SQLTStr.DebugPlan, {
                "operation": SQLOps.DebugPlan,
                "noUndo": true
            });
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

    private _alertAnalyze(): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        SQLDebugConfirmModal.Instance.show({
            onSubmit: (name) => {
                deferred.resolve(name);
            },
            onCancel: () => {
                deferred.reject("canceled");
            },
        });

        return deferred.promise();
    }

    public static restoreDataflow(sql: string, tabName: string): XDPromise<DagTabUser> {
        try {
            const deferred: XDDeferred<DagTabUser> = PromiseHelper.deferred();
            SQLUtil.getSQLStruct(sql)
            .then((sqlStruct) => {
                try {
                    let executor = new SQLDagExecutor(sqlStruct, tabName);
                    return executor.restoreDataflow();
                } catch (e) {
                    return PromiseHelper.reject(e.message);
                }
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

    // being used by column menu to create dataflow nodes
    public static restoreDataflow2(sql: string, tabName: string): XDPromise<DagNode[]> {
        try {
            const deferred: XDDeferred<DagNode[]> = PromiseHelper.deferred();
            SQLUtil.getSQLStruct(sql)
            .then((sqlStruct) => {
                try {
                    let executor = new SQLDagExecutor(sqlStruct, tabName);
                    return executor.restoreDataflow2();
                } catch (e) {
                    return PromiseHelper.reject(e.message);
                }
            })
            .then((dagNodes: DagNode[]) => {
                deferred.resolve(dagNodes);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject(e.message);
        }
    }
}