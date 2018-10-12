class DagParamManager {
    private static _instance = null;
    private parameters = {};
    private paramTab;

    constructor() {}

    public static get Instance() {
        return  this._instance || (this._instance = new this());
    }

    public setup(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this.paramTab = new DagParamPopup($("#modelingDagPanel"), $("#dagViewBar").find(".parameters"));
        var key = KVStore.getKey("gDagParamKey");
        var kvStore = new KVStore(key, gKVScope.WKBK);
        kvStore.get()
        .then((info) => {
            if (info) {
                try {
                    this.parameters = JSON.parse(info);
                } catch (err) {
                    console.error(err);
                    this.parameters = {};
                }
            } else {
                this.parameters = {};
            }
            deferred.resolve();
        })
        .fail((err) => {
            console.error(err);
            deferred.reject();
        });
        return deferred.promise();
    }

    public getParamMap() {
        return this.parameters;
    }

    public updateParamMap(params: {paramName: string}): XDPromise<void> {
        this.parameters = params;
        let key: string = KVStore.getKey("gDagParamKey");
        const kvstore = new KVStore(key, gKVScope.WKBK);
        return kvstore.put(JSON.stringify(this.parameters), true, true);
    }

    public checkParamInUse(_paramName) {
        //XXX may not need to implement
    }
}