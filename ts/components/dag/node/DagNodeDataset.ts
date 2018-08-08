class DagNodeDataset extends DagNode {
    protected input: DagNodeDatasetInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
        this.maxParents = 0;
        this.minParents = 0;
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

    private _getSourceColumns(): XDPromise<void> {
        // XXXX this is a wrong implementation
        // wait for https://bugs.int.xcalar.com/show_bug.cgi?id=12870
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const ds: DSObj = DS.getDSObj(this.input.source);
        const lineage: DagLineage = this.lineage;
        const prefix: string = this.input.prefix;
        ds.fetch(0, 50)
            .then((_json, jsonKeys) => {
                const columns: ProgCol[] = jsonKeys.map((key) => {
                    const colName: string = xcHelper.getPrefixColName(prefix, key);
                    return ColManager.newPullCol(colName, null, ColumnType.string);
                });
                lineage.setColumns(columns);
                deferred.resolve();
            })
            .fail(deferred.reject);

        return deferred.promise();
    }
}