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
    public txId: number;

    private _cachedSelectResultSet: string;

    public constructor(options) {
        options = options || <any>{};
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
        if (cachedResult != null) {
            XIApi.deleteTable(null, cachedResult);
            this._cachedSelectResultSet = undefined;
        }

        return this._selectTable(numRows);
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
        let oldState = this.state;
        this.state = PbTblState.Activating;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarRestoreTable(this.name)
        .then(() => {
            this.beActivated();
            deferred.resolve();
        })
        .fail((error) => {
            this.state = oldState;
            deferred.reject(error);
        });
        return deferred.promise();
    }

    public beActivated(): void {
        this.state = null;
        this.active = true;
    }

    public cancel(): XDPromise<void> {
        if (this.state === PbTblState.Activating) {
            return XcalarUnpublishTable(this.name, true);
        } else if (this.loadMsg &&
            this.loadMsg.includes(TblTStr.Importing) &&
            this.txId != null
        ) {
            // when it's creating dataset
            return QueryManager.cancelQuery(this.txId);
        } else {
            return PromiseHelper.reject();
        }
    }

    /**
     * Deactivate published table
     */
    public deactivate(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(this.name, true)
        .then(() => {
            this.beDeactivated();
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    public beDeactivated(): void {
        this.state = null;
        this.active = false;
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

    public getRowCountStr(): string {
        let rows: string;
        if (this.active && this.rows != null) {
            rows = xcStringHelper.numToStr(this.rows);
            if (this.updates && this.updates.length > 1) {
                rows = "~" + rows;
            }
        } else {
            rows = "N/A";
        }
        return rows;
    }

    public getColCountStr(): string {
        let cols: string;
        if (this.active && this.columns != null) {
            let columns = this.columns.filter((col) => {
                return !PTblManager.InternalColumns.includes(col.name);
            });
            cols = xcStringHelper.numToStr(columns.length);
        } else {
            cols = "N/A";
        }
        return cols;
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
                "noLog": true
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