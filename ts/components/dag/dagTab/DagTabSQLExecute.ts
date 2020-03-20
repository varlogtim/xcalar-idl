// a read only tab to test SQL's execution plan
class DagTabSQLExecute extends DagTabUser {
    public static readonly ID = "DF_SQLExecute";
    public static readonly Name = "SQL Graph";

    /**
     * DagTabSQLExecute.viewOnlyAlert
     */
    public static viewOnlyAlert(dagTab: DagTabSQLExecute): XDPromise<void> {
        try {
            const key: string = "noDagTabSQLExecuteAlert";
            const noAlert = xcLocalStorage.getItem(key) === "true";
            if (noAlert) {
                DagTabManager.Instance.convertNoEditableTab(dagTab);
                return PromiseHelper.resolve();
            }
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const title = `${DagTabSQLExecute.Name} is view only`;
            const writeChecked = (hasChecked) => {
                if (hasChecked) {
                    xcLocalStorage.setItem(key, "true");
                }
            };
            Alert.show({
                title: title,
                msg: "To change this SQL graph, save the graph as a new module.",
                isCheckBox: true,
                buttons: [{
                    name: "Create new module",
                    className: "larger",
                    func: (hasChecked) => {
                        writeChecked(hasChecked);
                        DagTabManager.Instance.convertNoEditableTab(dagTab);
                        deferred.resolve();
                    }
                }],
                onCancel: (hasChecked) => {
                    writeChecked(hasChecked);
                    deferred.reject();
                }
            });

            return deferred.promise();
        } catch (e) {
            console.error(e);
            return PromiseHelper.resolve();
        }
    }

    public constructor() {
        const options = {
            id: DagTabSQLExecute.ID,
            name: DagTabSQLExecute.Name,
            dagGraph: new DagGraph()
        };
        super(options);
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
}