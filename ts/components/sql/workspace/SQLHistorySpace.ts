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

    /**
     * SQLHistorySpace.Instance.update
     * @param updateInfo
     */
    public update(updateInfo): XDPromise<void> {
        return this._historyComponent.update(updateInfo);
    }

    public refresh(): void {
        // Refresh = false to trigger query status recovery
        this._historyComponent.show(false);
    }

    /**
     * renders a view-only dataflow graph
     * @param queryInfo
     */
    public previewDataflow(queryInfo: SqlQueryHistory.QueryInfo): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            if (!DagPanel.hasSetup()) {
                throw new Error(DFTStr.NotSetup);
            }

            this._checkDataflowValidation(queryInfo)
            .then((dataflowId) => {
                return this._previewDataflow(dataflowId, queryInfo.queryString);
            })
            .then(deferred.resolve)
            .fail((error) => {
                // DagNodeSQL has the alert
                if (error != null) {
                    Alert.show({
                        title: AlertTStr.Error,
                        msg: SQLTStr.PreviewError,
                        isAlert: true,
                        detail: xcHelper.parseError(error)
                    });
                }
                deferred.reject(error);
            });
        } catch (e) {
            console.error(e);
            Alert.show({
                title: AlertTStr.Error,
                msg: SQLTStr.PreviewError,
                isAlert: true,
                detail: xcHelper.parseError(e.message)
            });
            deferred.reject(e);
        }

        return deferred.promise();
    }

    // renders a view-only dataflow while it's running
    public viewProgress(dataflowId: string): XDPromise<void> {
        const tab = DagTabManager.Instance.getTabById(dataflowId);
        if (tab) {
            const graph = tab.getGraph();
            const sqlNode = graph.getNodesByType(DagNodeType.SQL)[0];
            if (sqlNode) {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                DagViewManager.Instance.inspectSQLNode(sqlNode.getId(), dataflowId, true)
                .then(() => {
                    SQLResultSpace.Instance.showProgressDataflow(true);
                    deferred.resolve();
                })
                .fail(deferred.reject);
                return deferred.promise();
            }
        }
        Alert.error(AlertTStr.Error, "The corresponding plan for sql could not be generated");
        return PromiseHelper.reject();
    }

     /**
     * renders a view-only dataflow graph after it's done running
     * @param queryInfo
     */
    private _previewDataflow(dataflowId: string, sql: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        const name: string = "SQL " + moment(new Date()).format("HH:mm:ss ll");
        const dagTab: DagTabUser = new DagTabUser({
            name: name,
            id: dataflowId,
            dagGraph: null,
            reset: false,
            createdTime: xcTimeHelper.now()
        });

        dagTab.load()
        .then(() => {
            try {
                const $container = $("#sqlDataflowArea .dataflowWrap .innerDataflowWrap");
                $container.empty();
                DagViewManager.Instance.addDataflowHTML($container, dataflowId, true, false)
                DagViewManager.Instance.renderSQLPreviewDag(<DagTab>dagTab);
                DagViewManager.Instance.autoAlign(dataflowId);
                SQLResultSpace.Instance.showProgressDataflow(false, sql);
                deferred.resolve();
            } catch (e) {
                console.error(e);
                return PromiseHelper.reject(e.message);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _checkDataflowValidation(queryInfo: SqlQueryHistory.QueryExtInfo): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let dataflowId: string = queryInfo.dataflowId;

        DagTabUser.hasDataflowAsync(dataflowId)
        .then((exist) => {
            if (!exist) {
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
        try {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            let sql: string = queryInfo.queryString;
            SQLUtil.getSQLStruct(sql)
            .then((sqlStruct) => {
                try {
                    let executor = new SQLDagExecutor(sqlStruct);
                    return executor.restoreDataflow();
                } catch (e) {
                    return PromiseHelper.reject(e.message);
                }
            })
            .then((dataflowId: string) => {
                let newQueryInfo = $.extend({}, queryInfo, {
                    dataflowId: dataflowId
                });
                this.update(newQueryInfo);
                deferred.resolve(dataflowId);
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.reject(e.message);
        }
    }
}