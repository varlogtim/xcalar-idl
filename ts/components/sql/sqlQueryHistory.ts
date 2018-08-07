type SqlQueryMap = { [key: string]: SqlQueryHistory.QueryInfo };

class SqlQueryHistory {
    private static _instance = null;
    public static getInstance(): SqlQueryHistory {
        return this._instance || (this._instance = new this());
    }

    private _sqlQueryKvStore: KVStore = null;
    private _queryMap: SqlQueryMap = {};
    private _isLoaded: boolean = false;

    private constructor() {
        const queryKey = KVStore.getKey("gSQLQuery") || "gSQLQuery-1";
        // sqlQueryKvStore stores all queryIds
        this._sqlQueryKvStore = new KVStore(queryKey, gKVScope.WKBK);
    }

    public isLoaded(): boolean {
        return this._isLoaded;
    }

    /**
     * Get a copy of queryMap
     */
    public getQueryMap(): SqlQueryMap {
        return xcHelper.deepCopy(this._queryMap);
    }

    /**
     * Get the copy of a query from queryMap
     * @param queryId QueryID
     * @returns The QueryInfo associated with QueryID. null if the QueryID doesn't exist in the queryMap
     */
    public getQuery(queryId: string): SqlQueryHistory.QueryInfo {
        const query = this._queryMap[queryId];
        if (query != null) {
            return xcHelper.deepCopy(this._queryMap[queryId]);
        }
        return null;
    }

    /**
     * Add/Set a query in queryMap
     * @param queryInfo QueryInfo object
     * @returns true: new query; false: existing query
     */
    public setQuery(queryInfo: SqlQueryHistory.QueryInfo): boolean {
        const isNewQuery = (this.getQuery(queryInfo.queryId) == null);
        this._queryMap[queryInfo.queryId] = xcHelper.deepCopy(queryInfo);
        return isNewQuery;
    }

    /**
     * Read query map from KV Store, and cache in the class
     * @param refresh if this is a manual refresh triggered by click on icon
     * @returns The copy of queryMap
     */
    public readStore(refresh: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._sqlQueryKvStore.get()
        .then( (ret) => {
            let promiseArray = [];
            if (ret) {
                for (const queryId of ret.split(",")) {
                    if (queryId) {
                        let kvStore = new KVStore(queryId, gKVScope.WKBK);
                        let queryInfo;
                        let promise = kvStore.get()
                            .then( (ret) => {
                                try {
                                    queryInfo = JSON.parse(ret);
                                    if (!refresh &&
                                        (queryInfo.status === SQLStatus.Compiling ||
                                         queryInfo.status === SQLStatus.Running)
                                        ) {
                                        queryInfo.status = SQLStatus.Cancelled;
                                        this._queryMap[queryId] = queryInfo;
                                        return kvStore.put(JSON.stringify(queryInfo), true);
                                    }
                                    this._queryMap[queryId] = queryInfo;
                                } catch(e) {
                                    deferred.reject();
                                }
                            })
                            .fail(deferred.reject);
                        promiseArray.push(promise);
                    }
                }
                return PromiseHelper.when.apply(this, promiseArray);
            } else {
                // Key doesn't exist for first time user
                this._isLoaded = true;
                deferred.resolve();
            }
        })
        .then( () => {
            this._isLoaded = true;
            deferred.resolve();
        })
        .fail(deferred.reject);
        // return PromiseHelper.resolve().then( () => {
        //     this._queryMap = SqlQueryHistory.getQueryList();
        //     this._isLoaded = true;
        // });

        return deferred.promise();
    }

    /**
     * Serialize one query and write to KV Store
     */
    public writeQueryStore(
        queryId: string,
        updateInfo: SqlQueryHistory.QueryInfo
    ): XDPromise<void> {
        const queryKvStore = new KVStore(queryId, gKVScope.WKBK);
        return queryKvStore.put(JSON.stringify(updateInfo), true);
    }

    /**
     * Add/Set a query in queryMap, and persist in KV Store
     * @param updateInfo 
     */
    public upsertQuery(
        updateInfo: SqlQueryHistory.QueryUpdateInfo
    ): XDPromise<{isNew: boolean, queryInfo: SqlQueryHistory.QueryInfo}> {
        let queryInfo = this.getQuery(updateInfo.queryId);
        const isNewQuery = (queryInfo == null);
        if (isNewQuery) {
            queryInfo = new SqlQueryHistory.QueryInfo();
        }
        SqlQueryHistory.mergeQuery(queryInfo, updateInfo);
        this.setQuery(queryInfo);

        // update KVStore
        return this.writeQueryStore(queryInfo.queryId, queryInfo)
        .then( () => {
            if (isNewQuery) {
                return this._sqlQueryKvStore.append(queryInfo.queryId + ",", true);
            }
        })
        .then( () => ({
            isNew: isNewQuery,
            queryInfo: queryInfo
        }));
    }

    // TODO: For test only, should be deleted!!!
    public clearStore() {
        return this._sqlQueryKvStore.get()
        .then( (ret) => {
            const tasks = ret.split(',').map( (queryId) => {
                let kvStore = new KVStore(queryId, gKVScope.WKBK);
                return kvStore.delete();
            })
            return Promise.all(tasks);
        })
        .then( () => {
            return this._sqlQueryKvStore.delete();
        })
        .then(()=>console.log('clear done'))
        .fail(()=>console.log('clear fail'));
    }
}

namespace SqlQueryHistory {

    export interface QueryUpdateInfo {
        queryId: string;
        status?: SQLStatus;
        queryString?: string;
        startTime?: number | Date;
        endTime?: number | Date;
        newTableName?: string;
        errorMsg?: string;
    }

    export class QueryInfo {
        public queryId: string = '';
        public status: SQLStatus = SQLStatus.None;
        public queryString: string = '';
        public startTime: number = Date.now();
        public endTime: number = null;
        public tableName: string = '';
        public errorMsg: string = '';
    }

    export function mergeQuery(
        mergeTo: SqlQueryHistory.QueryInfo,
        updateInfo: QueryUpdateInfo
    ) {
        mergeTo.queryId = updateInfo.queryId;
        if (updateInfo.endTime != null) {
            mergeTo.endTime = (new Date(updateInfo.endTime)).getTime();
        }
        if (updateInfo.queryString != null) {
            mergeTo.queryString = updateInfo.queryString;
        }
        if (updateInfo.startTime != null) {
            mergeTo.startTime = (new Date(updateInfo.startTime)).getTime();
        }
        if (updateInfo.status != null) {
            mergeTo.status = updateInfo.status;
        }
        if (updateInfo.newTableName != null) {
            mergeTo.tableName = updateInfo.newTableName;
        }
        if (updateInfo.errorMsg != null) {
            mergeTo.errorMsg = updateInfo.errorMsg;
        }
    }

    // export function getQueryList() {
    //     const statusList = [
    //         SQLStatus.Running,
    //         SQLStatus.Compiling,
    //         SQLStatus.Failed,
    //         SQLStatus.Done,
    //         SQLStatus.Cancelled,
    //     ];
    //     const queryMap = {};
    //     for (let i = 0; i < 200; i ++) {
    //         const queryInfo = new QueryInfo();
    //         queryInfo.queryId = `${i}`;
    //         queryInfo.status = statusList[i % statusList.length];
    //         queryInfo.queryString = `SELECT * FROM table${i} WHERE 1 = 1;`;
    //         queryInfo.startTime = Date.now() - 1000*i;
    //         if (queryInfo.status !== SQLStatus.Running && queryInfo.status !== SQLStatus.Compiling) {
    //             queryInfo.endTime = queryInfo.startTime + 1000 * i;
    //         }
    //         if (queryInfo.status === SQLStatus.Failed) {
    //             queryInfo.errorMsg = `Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error Error #${i}`;
    //         } else {
    //             queryInfo.tableName = `Table#${i}`;
    //         }

    //         queryMap[queryInfo.queryId] = queryInfo;
    //     }
    //     return queryMap;
    // }
}
if (typeof exports !== "undefined") {
    exports.SqlQueryHistory = SqlQueryHistory;
}