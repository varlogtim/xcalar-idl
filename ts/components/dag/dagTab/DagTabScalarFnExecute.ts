// a read only tab to test SQL's execution plan
class DagTabScalarFnExecute extends DagTabExecuteOnly {
    public static readonly ID = "DF_ScalarFnExecute";
    public static readonly Name = "Scalar Fn Test";

    public constructor() {
        super(DagTabScalarFnExecute.ID, DagTabScalarFnExecute.Name, "noDagTabScalarFnExecuteAlert");
        this._type = DagTabType.SQLExecute;
    }

    // XXX test only
    // DagTabScalarFnExecute.test
    public static test() {
        const dagTab = new DagTabScalarFnExecute();
        const graph = dagTab.getGraph();
        const sqlNode = DagNodeFactory.create({type: DagNodeType.SQL});
        const mapNode = DagNodeFactory.create({type: DagNodeType.Map});
        graph.addNode(sqlNode);
        graph.addNode(mapNode);
        graph.connect(sqlNode.getId(), mapNode.getId());
        DagTabManager.Instance.openAndResetExecuteOnlyTab(dagTab);
        DagViewManager.Instance.autoAlign(dagTab.getId());
    }

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public load(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public save(): XDPromise<void> {
        return PromiseHelper.resolve();
    }

    public getIcon(): string {
        return 'xi-menu-udf';
    }

    protected _getViewOnlyMessage(): string {
        return "To change this test module, save it as a new module.";
    }
}