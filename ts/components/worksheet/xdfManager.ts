class XDFManager {
    private static _instance = null;
    private _operatorsMap = {}; //stores all xdfs sorted by category, each
    // category is a map
    private _allUDFs = [];
    private _isSetup: boolean = false;
    private _setupDeferred: XDDeferred<any> = PromiseHelper.deferred();
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
            this._isSetup = true;
            this._setupDeferred.resolve();
            return PromiseHelper.resolve();
        } else {
            XcalarListXdfs("*", "*")
            .then((listXdfsObj: XcalarApiListXdfsOutputT) => {
                this._allUDFs = xcHelper.deepCopy(listXdfsObj.fnDescs.filter((xdf) => {
                    return xdf.category === FunctionCategoryT.FunctionCategoryUdf;
                }));
                const fns: any[] = xcHelper.filterUDFs(listXdfsObj.fnDescs);
                self._setupOperatorsMap(fns);

                this._setupDeferred.resolve();
            })
            .fail(function(error) {
                Alert.error("List XDFs failed", error.error);
                this._setupDeferred.reject(error);
            })
            .always(() => {
                this._isSetup = true;
            });
            return this._setupDeferred.promise();
        }
    }

    public isSetup(): boolean {
        return this._isSetup;
    }

    public waitForSetup(): XDPromise<void> {
        if (this._isSetup) {
            return PromiseHelper.resolve();
        }
        return this._setupDeferred.promise();
    }

    // returns a map of categories including all xdfs and
    // udfs from this workbook, including shared
    public getOperatorsMap() {
        return this._operatorsMap;
    }

    // updates all udfs with raw names
    public updateAllUDFs(listXdfsObj: XcalarApiListXdfsOutputT) {
        this._allUDFs = xcHelper.deepCopy(listXdfsObj.fnDescs);
    }

    // updates shared and current workbook udfs, with shortened names
    public updateUDFs(listXdfsObj: XcalarApiListXdfsOutputT) {
        this._operatorsMap[FunctionCategoryT.FunctionCategoryUdf] = {};
        listXdfsObj.fnDescs.forEach(op => {
            this._operatorsMap[FunctionCategoryT.FunctionCategoryUdf][op.displayName] = op;
        });
    }
    // gets all udfs: from shared and from every workbook
    public getAllUDFs(): XcalarEvalFnDescT[] {
        return this._allUDFs;
    }

    // given a workbook path, returns a map of categories including all xdfs and
    // udfs from that workbook, including shared
    public getOperatorsMapFromWorkbook(udfNSPathPrefix: string, sort?: boolean) {
        let opMap = xcHelper.deepCopy(this._operatorsMap);
        let udfs: XcalarEvalFnDescT[] = xcHelper.deepCopy(this._allUDFs);
        udfs = xcHelper.filterUDFs(udfs, udfNSPathPrefix);
        opMap[FunctionCategoryT.FunctionCategoryUdf] = {};
        if (udfs.length) {
            if (sort) {
                udfs.sort(sortFn);
                function sortFn(a, b) {
                    return (a.displayName) > (b.displayName) ? 1 : -1;
                }
            }
            udfs.forEach((udf) => {
                opMap[FunctionCategoryT.FunctionCategoryUdf][udf.displayName] = udf;
            });
        }

        return opMap;
    }

    private _setupOperatorsMap(opArray: any[]) {
        opArray.forEach((op) => {
            if (!this._operatorsMap[op.category]) {
                this._operatorsMap[op.category] = {};
            }
            this._operatorsMap[op.category][op.displayName] = op;
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.XDFManager = XDFManager;
};
