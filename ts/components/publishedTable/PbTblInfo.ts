class PbTblInfo {
    public batchId: number;
    public index: number;
    public keys: string[];
    public columns: ColSchema[];
    public name: string;
    public rows: number;
    public size: number;
    public createTime: number;
    public active: boolean;
    public updates: PublishTableUpdateInfo[];
    public state: PbTblState;
    public loadMsg: string;
    public dsName: string;

    private _cachedSelectResultSet: string;

    public constructor(options) {
        options = options || <PbTblInfo>{};
        this.batchId = options.batchId;
        this.index = options.index;
        this.keys = options.keys || [];
        this.columns = options.columns || [];
        this.name = options.name;
        this.rows = options.rows;
        this.size = options.size;
        this.createTime = options.createTime;
        this.active = options.active;
        this.updates = options.updates || [];
        this.state = options.state;
    }

    /**
     * Restore the table info from backend meta
     * @param table
     */
    public restoreFromMeta(table: PublishTable): void {
        try {
            this.name = table.name;
            this.active = table.active;
            this.rows = table.numRowsTotal;
            this.size = table.sizeTotal;
            this.createTime = table.updates[0] ? table.updates[0].startTS : null;
            this.columns = table.values.map((value) => {
                const type: DfFieldTypeT = <any>DfFieldTypeT[value.type];
                return {
                    name: value.name,
                    type: xcHelper.convertFieldTypeToColType(type)
                }
            });
            this.keys = table.keys.map((key) => key.name);
            this.updates = table.updates;
            let lastUpdate = table.updates[table.updates.length - 1];
            this.batchId = lastUpdate ? lastUpdate.batchId : null;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Get column schema
     */
    public getSchema(): PbTblColSchema[] {
        let columns: PbTblColSchema[] = [];
        try {
            const keySet: Set<string> = new Set();
            this.keys.forEach((key) => {
                keySet.add(key);
            });
            this.columns.forEach((col: ColSchema) => {
                const name: string = col.name;
                if (!PTblManager.InternalColumns.includes(name) &&
                    !name.startsWith(PTblManager.PKPrefix)
                ) {
                    columns.push({
                        name: xcHelper.escapeColName(name),
                        type: col.type,
                        primaryKey: keySet.has(name) ? "Y" : "N"
                    });
                }
            });
        } catch (e) {
            console.error(e);
        }
        return columns;
    }

    /**
     * View select result
     * @param numRows
     */
    public viewResultSet(numRows: number): XDPromise<string> {
        let cachedResult: string = this._cachedSelectResultSet;
        if (cachedResult == null) {
            return this._selectTable(numRows);
        } else {
            const deferred: XDDeferred<string> = PromiseHelper.deferred();
            XcalarGetTableMeta(cachedResult)
            .then(() => {
                // when result exist
                deferred.resolve(cachedResult);
            })
            .fail(() => {
                this._cachedSelectResultSet = undefined;
                this._selectTable(numRows)
                .then(deferred.resolve)
                .fail(deferred.reject);
            });

            return deferred.promise();
        }
    }

    /**
     * Delete Published Table
     */
    public delete(): XDPromise<void> {
        if (this.state === PbTblState.BeDataset) {
            return this._deleteDataset();
        } else {
            return this._delete();
        }
    }

    /**
     * Activate published table
     */
    public activate(): XDPromise<void> {
        this.state = PbTblState.Activating;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarRestoreTable(this.name)
        .then(() => {
            this.state = null;
            this.active = true;
            deferred.resolve();
        })
        .fail((error) => {
            // let canceled = typeof error === "object" && error.status === StatusT.StatusCanceled;
            // if (!canceled) {
            //     this.state = PbTblState.Error;
            // }
            deferred.reject(error);
        });
        return deferred.promise();
    }

    public cancelActivating(): XDPromise<void> {
        if (this.state !== PbTblState.Activating) {
            return PromiseHelper.resolve();
        }
        return XcalarUnpublishTable(this.name, true);
    }

    /**
     * Deactivate published table
     */
    public deactivate(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(this.name, true)
        .then(() => {
            this.active = false;
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * When be dataset state, it means it's a half load table
     * that is still a dataset
     * @param dsName
     */
    public beDatasetState(dsName: string): void {
        this.state = PbTblState.BeDataset;
        this.dsName = dsName;
    }

    private _selectTable(limitedRows: number): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const graph: DagGraph = new DagGraph();
        const node: DagNodeIMDTable = <DagNodeIMDTable>DagNodeFactory.create({
            type: DagNodeType.IMDTable
        });
        const tableName: string = this.name;
        graph.addNode(node);
        node.setParam({
            source: tableName,
            version: -1,
            schema: this.columns,
            limitedRows: limitedRows
        });
        graph.execute([node.getId()])
        .then(() => {
            let result = node.getTable();
            this._cachedSelectResultSet = result;
            deferred.resolve(result);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _delete(): XDPromise<void> {
        return XcalarUnpublishTable(this.name, false)
    }

    private _deleteDataset(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let txId = Transaction.start({
            "operation": SQLOps.DestroyPreviewDS,
            "track": true
        });
        XIApi.deleteDataset(txId, this.dsName, true)
        .then(() => {
            Transaction.done(txId, {
                "noCommit": true,
                "noSql": true
            });
            deferred.resolve();
        })
        .fail((error) => {
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });
            deferred.reject(error);
        });
        return deferred.promise();
    }
}