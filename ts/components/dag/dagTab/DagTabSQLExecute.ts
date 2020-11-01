// a read only tab to test SQL's execution plan
class DagTabSQLExecute extends DagTabExecuteOnly {
    public static readonly ID = "DF_SQLExecute";
    public static readonly Name = "SQL Graph";

    public constructor() {
        super(DagTabSQLExecute.ID, DagTabSQLExecute.Name, "noDagTabSQLExecuteAlert");
        this._type = DagTabType.SQLExecute;
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._loadFromKVStore()
        .then((ret) => {
            let { graph } = ret;
            this.setGraph(graph);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public getIcon(): string {
        return 'xi-menu-sql';
    }
}