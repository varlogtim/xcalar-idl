// a read only tab to test SQL's execution plan
class DagTabSQLExecute extends DagTabUser {
    public static readonly ID = "DF_SQLExecute";
    public static readonly Name = "Console";

    /**
     * DagTabSQLExecute.viewOnlyAlert
     */
    public static viewOnlyAlert(): void {
        const title = `${DagTabSQLExecute.Name} is view only`;
        Alert.show({
            title: title,
            msg: "Please save it as a module and try again.",
            isAlert: true
        });
    }

    public constructor() {
        const options = {
            id: DagTabSQLExecute.ID,
            name: DagTabSQLExecute.Name,
            dagGraph: new DagGraph()
        };
        super(options);
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
}