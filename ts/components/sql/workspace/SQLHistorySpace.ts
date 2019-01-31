class SQLHistorySpace {
    private static _instance: SQLHistorySpace;
    private _historyComponent: SqlQueryHistoryPanel.ExtCard;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._historyComponent = new SqlQueryHistoryPanel.ExtCard();
    }

    public setup(): void {
        const $histSection = $('#sqlWorkSpacePanel');
        this._historyComponent.setup({
            $container: $histSection,
            isShowAll: true,
            checkContainerVisible: () => {
                return $histSection.hasClass('active');
            }
        });
    }

    public update(updateInfo): XDPromise<void> {
        return this._historyComponent.update(updateInfo);
    }

    public refresh(): void {
        this._historyComponent.show(true);
    }

    /**
     * SQLHistorySpace.Instance.analyze
     * @param dataflowId
     */
    public analyze(queryInfo: SqlQueryHistory.QueryInfo): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        try {
            this._checkDataflowValidation(queryInfo)
            .then((dataflowId) => {
                return this._switchToAdvForAnalyze(dataflowId);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
            deferred.reject(e);
        }

        return deferred.promise();
    }

    public viewProgress(dataflowId: string): XDPromise<void> {
        const tab = DagTabManager.Instance.getTabById(dataflowId);
        if (tab) {
            const graph = tab.getGraph();
            const sqlNode = graph.getNodesByType(DagNodeType.SQL)[0];
            if (sqlNode) {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                DagView.inspectSQLNode(sqlNode.getId(), dataflowId, true)
                .then(() => {
                    SQLResultSpace.Instance.showProgressDataflow();
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            }
        }
        Alert.error(AlertTStr.Error, "The corresponding dataflow for sql could not be generated");
        return PromiseHelper.reject();
    }


    private _switchToAdvForAnalyze(dataflowId: string): XDPromise<void> {
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
            DagView.autoAlign(dataflowId);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $("#initialLoadScreen").hide();
        });

        return deferred.promise();
    }

    private _checkDataflowValidation(queryInfo: SqlQueryHistory.QueryExtInfo): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let dataflowId: string = queryInfo.dataflowId;

        DagTabUser.hasDataflowAsync(dataflowId)
        .then((exist) => {
            if (!exist) {
                let innerDeferred: XDDeferred<boolean> = PromiseHelper.deferred();
                Alert.show({
                    title: AlertTStr.Error,
                    msg: SQLTStr.DFDeleted,
                    onCancel: () => {
                        innerDeferred.reject();
                    },
                    buttons: [{
                        name: SQLTStr.RestoreDF,
                        className: "larger",
                        func: () => {
                            innerDeferred.resolve(true);
                        }
                    }],
                });
                return innerDeferred.promise();
            }
        })
        .then((shouldRestore) => {
            if (shouldRestore) {
                return this._restoreDataflow(queryInfo);
            } else {
                return PromiseHelper.resolve(dataflowId);
            }
        })
        .then((finalDataflowId: string) => {
            deferred.resolve(finalDataflowId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _restoreDataflow(queryInfo: SqlQueryHistory.QueryInfo): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred(); 
        let sql: string = queryInfo.queryString;
        let executor = new SQLExecutor(sql);
        executor.restoreDataflow()
        .then((dataflowId) => {
            let newQueryInfo = $.extend({}, queryInfo, {
                dataflowId: dataflowId
            });
            this.update(newQueryInfo);
            deferred.resolve(dataflowId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}