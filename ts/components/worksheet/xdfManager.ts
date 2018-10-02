class XDFManager {
    private static _instance = null;
    private _operatorsMap = {}; //stores all xdfs sorted by category, each
    // category is a map
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

    public updateUDFs(listXdfsObj) {
        this._operatorsMap[FunctionCategoryT.FunctionCategoryUdf] = {};
        listXdfsObj.fnDescs.forEach(op => {
            this._operatorsMap[FunctionCategoryT.FunctionCategoryUdf][op.displayName] = op;
        });
    }

    private _setupOperatorsMap(opArray) {
        const self = this;
        this._operatorsMap = {};
        opArray.forEach(function(op) {
            if (!self._operatorsMap[op.category]) {
                self._operatorsMap[op.category] = {};
            }
            self._operatorsMap[op.category][op.displayName] = op;
        });
    }


}