class XDFManager {
    private static _instance = null;
    private _operatorsMap = {}; //stores all xdfs sorted by category, each
    // category is a map
    public constructor() {}

    public static get Instance(): XDFManager {
        return  this._instance || (this._instance = new this());
    }

    /**
     * Setup the class
     * @param options If present, setup with specified userName and sessionId. Otherwise, use the current logged in userName and sessionId
     * @description
     * In XD, we can read userName and sessionId from the running env.
     * But in expServer, these kind of information has to be provided explicitly, as expServer is running in a stateless manner.
     */
    public setup(options?: {userName: string, sessionId: string, listXdfsObj}): XDPromise<void> {
        const self = this;

        if (options != null) {
            const { userName, sessionId, listXdfsObj} = options;
            const fns = xcHelper.filterUDFsByUserSession(
                listXdfsObj.fnDescs, userName, sessionId
            );
            for (const fn of fns) {
                if (fn.displayName == null) {
                    fn.displayName = fn.fnName.split('/').pop();
                }
            }
            self._setupOperatorsMap(fns);
            return PromiseHelper.resolve();
        } else {
            const deferred: XDDeferred<any> = PromiseHelper.deferred();
            XcalarListXdfs("*", "*")
            .then((listXdfsObj) => {
                const fns = xcHelper.filterUDFs(listXdfsObj.fnDescs);
                self._setupOperatorsMap(fns);
                deferred.resolve();
            })
            .fail(function(error) {
                Alert.error("List XDFs failed", error.error);
                deferred.reject(error);
            });
            return deferred.promise();
        }
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

if (typeof exports !== 'undefined') {
    exports.XDFManager = XDFManager;
};
