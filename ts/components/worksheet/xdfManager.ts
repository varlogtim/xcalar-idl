class XDFManager {
    private static _instance = null;
    private _operatorsMap = {}; //stores all xdfs sorted by category

    public constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): XDPromise<void> {
        const self = this;
        const deferred: XDDeferred<any> = PromiseHelper.deferred();

        XcalarListXdfs("*", "*")
        .then((listXdfsObj) => {
            var fns = xcHelper.filterUDFs(listXdfsObj.fnDescs);
            FnBar.updateOperationsMap(fns);
            self._setupOperatorsMap(fns);
            deferred.resolve();
        })
        .fail(function(error) {
            Alert.error("List XDFs failed", error.error);
            deferred.reject(error);
        });
        return deferred.promise();
    }

    public getOperatorsMap() {
        return this._operatorsMap;
    }

    private _setupOperatorsMap(opArray) {
        const self = this;
        this._operatorsMap = {};
        opArray.forEach(function(op) {
            if (!self._operatorsMap[op.category]) {
                self._operatorsMap[op.category] = [];
            }
            self._operatorsMap[op.category].push(op);
        });

        // sort each set of operators by name
        for (let i in this._operatorsMap) {
            this._operatorsMap[i].sort(sortFn);
        }

        function sortFn(a, b){
            return (a.displayName) > (b.displayName) ? 1 : -1;
        }
    }
}