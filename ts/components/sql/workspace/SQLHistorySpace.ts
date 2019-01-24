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
            DagView.autoAlign(dataflowId);
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            $("#initialLoadScreen").hide();
        });

        return deferred.promise();
    }

    public viewProgress(dataflowId: string): void {
        const tab = DagTabManager.Instance.getTabById(dataflowId);
        if (tab) {
            const graph = tab.getGraph();
            const sqlNode = graph.getNodesByType(DagNodeType.SQL)[0];
            if (sqlNode) {
                DagView.inspectSQLNode(sqlNode.getId(), dataflowId, true)
                .then(() => {
                    SQLResultSpace.Instance.showProgressDataflow();
                });
                return;
            }
        }
        Alert.error(AlertTStr.Error, "The corresponding dataflow for sql could not be generated");
    }
}