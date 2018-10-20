class DagNodeIMDTable extends DagNodeIn {
    protected input: DagNodeIMDTableInput;
    protected columns: ProgCol[];

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
        this.display.icon = "&#xea55;";
        this.input = new DagNodeIMDTableInput(options.input);
    }

    /**
     * Set dataset node's parameters
     * @param input {DagNodeIMDTableInputStruct}

     */
    public setParam(input: DagNodeIMDTableInputStruct = <DagNodeIMDTableInputStruct>{}): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const source: string = input.source;
        const version: number = input.version;
        const filterString: string = input.filterString;
        const inputColumns: string[] = input.columns;
        this.getSourceColumns(source, input.columns)
        .then((columns: ProgCol[]) => {
            this.columns = columns;
            this.input.setInput({
                source: source,
                version: version,
                filterString: filterString,
                columns: inputColumns
            });
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

    public getSourceColumns(source: string, columns: string[]): XDPromise<ProgCol[]> {
        const deferred: XDDeferred<ProgCol[]> = PromiseHelper.deferred();
        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            let tables: PublishTable[] = result.tables;
            let table: PublishTable =
                tables.find((pubTab: PublishTable) => {
                    return (pubTab.name ==source);
                });
            if (table == null) {
                return deferred.reject("Publish Table does not exist: " + source);
            }
            let cols: ProgCol[] =
            columns.map((name: string) => {
                let col: PublishTableCol = table.values.find((col) => {
                    return (col.name == name);
                });
                if (col == null) {
                    return;
                }
                let dftype: DfFieldTypeT = DfFieldTypeT[col.type];
                let type: ColumnType = xcHelper.convertFieldTypeToColType(dftype);
                return ColManager.newPullCol(name, name, type);
            });
            return deferred.resolve(cols);
        })
        return deferred.promise();
    }
}