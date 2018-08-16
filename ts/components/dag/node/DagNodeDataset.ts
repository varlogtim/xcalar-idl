class DagNodeDataset extends DagNode {
    protected input: DagNodeDatasetInput;
    private columns: ProgCol[];

    public constructor(options: DagNodeDatasetInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.maxParents = 0;
        this.minParents = 0;
        if (options && options.columns) {
            this.columns = options.columns.map((column) => {
                return ColManager.newPullCol(column.name, column.name, column.type);
            });
            this.lineage.setColumns(this.columns);
        }
    }

    /**
     * @returns {DagNodeDatasetInput} Dataset input params
     */
    public getParam(): DagNodeDatasetInput {
        return {
            source: this.input.source || "",
            prefix: this.input.prefix || ""
        };
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeDatasetInput}
     * @param input.source {string} Dataset source path
     * @param intpu.prefix {string} Prefix for the created table
     */
    public setParam(input: DagNodeDatasetInput = <DagNodeDatasetInput>{}): XDPromise<void> {
        this.input = {
            source: input.source,
            prefix: input.prefix
        }
        super.setParam();
        return this._getSourceColumns();
    }

    protected _getSerializeInfo():DagNodeDatasetInfo {
        const serializedInfo: DagNodeDatasetInfo = super._getSerializeInfo();
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }

    private _getSourceColumns(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const ds: DSObj = DS.getDSObj(this.input.source);
        const prefix: string = this.input.prefix;
        if (ds != null && prefix != null) {
            // XXXX this is a wrong implementation
            // wait for https://bugs.int.xcalar.com/show_bug.cgi?id=12870
            ds.fetch(0, 50)
            .then((jsons, jsonKeys) => {
                let colTypes: ColumnType[] = [];
                jsons.forEach((json) => {
                    colTypes = jsonKeys.map((key, index) => {
                        return xcHelper.parseColType(json[key], colTypes[index]);
                    });
                });

                this.columns = jsonKeys.map((key, index) => {
                    const colName: string = xcHelper.getPrefixColName(prefix, key);
                    return ColManager.newPullCol(colName, colName, colTypes[index]);
                });
                this.lineage.setColumns(this.columns);
                deferred.resolve();
            })
            .fail(deferred.reject);
        } else {
            deferred.reject();
        }

        return deferred.promise();
    }
}