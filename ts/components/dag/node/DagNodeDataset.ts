class DagNodeDataset extends DagNodeIn {
    protected input: DagNodeDatasetInput;
    protected columns: ProgCol[];

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.Dataset;
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
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const source: string = input.source;
        const prefix: string = input.prefix;
        this.getSourceColumns(source, prefix)
        .then((columns: ProgCol[]) => {
            this.columns = columns;
            this.input = {
                source: source,
                prefix: prefix
            }
            super.setParam();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getSourceColumns(
        source: string,
        prefix: string
    ): XDPromise<ProgCol[]> {
        const deferred: XDDeferred<ProgCol[]> = PromiseHelper.deferred();
        const ds: DSObj = DS.getDSObj(source);
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

                const columns = jsonKeys.map((key, index) => {
                    const colName: string = xcHelper.getPrefixColName(prefix, key);
                    return ColManager.newPullCol(key, colName, colTypes[index]);
                });
                deferred.resolve(columns);
            })
            .fail(deferred.reject);
        } else {
            deferred.reject();
        }

        return deferred.promise();
    }
}