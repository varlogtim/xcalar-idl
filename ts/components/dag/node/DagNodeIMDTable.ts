class DagNodeIMDTable extends DagNodeIn {
    protected input: DagNodeIMDTableInput;
    protected columns: ProgCol[];

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.type = DagNodeType.IMDTable;
        this.maxParents = 0;
        this.minParents = 0;
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
        this._fetchSchema(source, input.columns)
        .then(() => {
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

    private _fetchSchema(source: string, columns: string[]): XDPromise<ProgCol[]> {
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
            const schema: ColSchema[] = columns.map((name: string) => {
                let col: PublishTableCol = table.values.find((col) => {
                    return (col.name == name);
                });
                if (col == null) {
                    return;
                }
                let dftype: DfFieldTypeT = DfFieldTypeT[col.type];
                let type: ColumnType = xcHelper.convertFieldTypeToColType(dftype);
                return {
                    name: name,
                    type: type
                };
            });
            this.setSchema(schema);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }
}