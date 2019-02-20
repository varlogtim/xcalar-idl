class DagTabOptimized extends DagTabProgress {
    public static readonly PATH = "Optimized Dataflows (SDK Use Only)/";

    constructor(options: {
        id: string,
        name: string,
        queryNodes?: any[],
        executor?: DagGraphExecutor
    }) {
        super(options);
        const {queryNodes, executor} = options;
        if (queryNodes) {
            const graph: DagSubGraph = this._constructGraphFromQuery(queryNodes);
            graph.startExecution(queryNodes, executor);
            this._inProgress = true;
        }
    }

    public getPath(): string {
        return DagTabOptimized.PATH + this.getName();
    }

    public load(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._isDoneExecuting = false;

        XcalarGetRetinaJson(this._queryName)
        .then((retina) => {
            this._dagGraph = this._constructGraphFromQuery(retina.query);
            this._dagGraph.startExecution(retina.query, null);
            this.setGraph(this._dagGraph);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public delete(): XDPromise<any> {
        const deferred = PromiseHelper.deferred();
        this._isDoneExecuting = false;
        this._isFocused = false;
        this._isDeleted = true;
        this._queryCheckId++;

        XcalarDeleteRetina(this._queryName)
        .then(deferred.resolve)
        .fail((error) => {
            this._isDeleted = false;
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public endStatusCheck(): XDPromise<any> {
        this._inProgress = false;
        return this._getAndUpdateStatuses();
    }
}