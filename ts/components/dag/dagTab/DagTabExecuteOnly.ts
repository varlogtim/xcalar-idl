// a read only tab to test execution
abstract class DagTabExecuteOnly extends DagTabUser {
    private _storageKey: string;

    public constructor(id, name, storageKey) {
        super({
            id,
            name,
            dagGraph: new DagGraph()
        });
        this._storageKey = storageKey;
    }

    public abstract getIcon(): string;
    protected abstract _getViewOnlyMessage(): string;

    /**
     * @override
     */
    public isEditable(): boolean {
        return false;
    }

    public viewOnlyAlert(): XDPromise<void> {
        try {
            const noAlert = xcLocalStorage.getItem(this._storageKey) === "true";
            if (noAlert) {
                DagTabManager.Instance.convertNoEditableTab(this);
                return PromiseHelper.resolve();
            }
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            const writeChecked = (hasChecked) => {
                if (hasChecked) {
                    xcLocalStorage.setItem(this._storageKey, "true");
                }
            };
            Alert.show({
                title: `${this._name} is view only`,
                msg: this._getViewOnlyMessage(),
                isCheckBox: true,
                buttons: [{
                    name: "Create new module",
                    className: "larger",
                    func: (hasChecked) => {
                        writeChecked(hasChecked);
                        DagTabManager.Instance.convertNoEditableTab(this);
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
}