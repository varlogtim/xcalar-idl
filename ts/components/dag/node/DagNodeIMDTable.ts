class DagNodeIMDTable extends DagNode {
    protected input: DagNodeIMDTableInput;
    private columns: ProgCol[];

    public constructor(options: DagNodeIMDTableInfo) {
        super(options);
        this.type = DagNodeType.IMDTable;
        this.maxParents = 0;
        this.minParents = 0;
        if (options && options.columns) {
            this.columns = options.columns.map((column) => {
                const name: string = xcHelper.parsePrefixColName(column.name).name;
                return ColManager.newPullCol(name, column.name, column.type);
            });
        } else {
            this.columns = [];
        }
    }

    /**
     * @returns {DagNodeIMDTableInput} Dataset input params
     */
    public getParam(): DagNodeIMDTableInput {
        return {
            source: this.input.source || "",
            latest: this.input.latest || false,
            time: this.input.time || null
        };
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeIMDTableInput}

     */
    public setParam(input: DagNodeIMDTableInput = <DagNodeIMDTableInput>{}): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const source: string = input.source;
        const latest: boolean = input.latest;
        const time: Date = input.time;
        this.getSourceColumns(source)
        .then((columns: ProgCol[]) => {
            this.columns = columns;
            this.input = {
                source: source,
                latest: latest,
                time: time
            }
            super.setParam();
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    protected _getSerializeInfo(): DagNodeIMDTableInfo {
        const serializedInfo: DagNodeIMDTableInfo = super._getSerializeInfo();
        if (this.columns) {
            const columns = this.columns.map((progCol) => {
                return {name: progCol.getBackColName(), type: progCol.getType()};
            });
            serializedInfo.columns = columns;
        }
        return serializedInfo;
    }

    public getSourceColumns(source: string): XDPromise<ProgCol[]> {
        const deferred: XDDeferred<ProgCol[]> = PromiseHelper.deferred();
        // TODO: Implement this
        return deferred.resolve([]);
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: this.columns,
            changes: []
        };
    }
}