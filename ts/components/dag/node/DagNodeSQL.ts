class DagNodeSQL extends DagNode {
    protected input: DagNodeSQLInput;
    protected columns: {name: string, backName: string, type: ColumnType}[];
    protected sqlQueryString: string;
    protected identifiers: Map<number, string>;
    protected srcTableMap: {};

    public constructor(options: DagNodeSQLInfo) {
        super(options);
        this.type = DagNodeType.SQL;
        this.setSqlQueryString(options.sqlQueryString);
        const identifiers = new Map<number, string>();
        if (options.identifiersOrder && options.identifiers) {
            options.identifiersOrder.forEach(function(idx) {
                identifiers.set(idx, options.identifiers[idx]);
            });
        }
        this.setIdentifiers(identifiers);
        this.setSrcTableMap(options.srcTableMap);
        this.setColumns(options.columns)
        this.maxParents = -1;
        this.minParents = 1;
        this.display.icon = "&#xe957;";
        this.input = new DagNodeSQLInput(options.input);
    }

    public getColumns(): {name: string, backName: string, type: ColumnType}[] {
        return this.columns;
    }
    public setColumns(columns: {name: string, backName: string, type: ColumnType}[]): void {
        this.columns = columns;
    }
    public getSqlQueryString(): string {
        return this.sqlQueryString;
    }
    public setSqlQueryString(sqlQueryString: string): void {
        this.sqlQueryString = sqlQueryString;
    }
    public getIdentifiers(): Map<number, string> {
        return this.identifiers;
    }
    public setIdentifiers(identifiers: Map<number, string>): void {
        this.identifiers = identifiers;
    }
    public getSrcTableMap(): {} {
        return this.srcTableMap;
    }
    public setSrcTableMap(srcTableMap: {}): void {
        this.srcTableMap = srcTableMap;
    }

    /**
     * Set sql node's parameters
     * @param input {DagNodeProjectSQLStruct}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeSQLInputStruct = <DagNodeSQLInputStruct>{}) {
        this.input.setInput({
            queryStr: input.queryStr,
            newTableName: input.newTableName,
            jdbcCheckTime: input.jdbcCheckTime
        });
        super.setParam();
    }

    public lineageChange(): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const finalCols: ProgCol[] = this.columns.map((column) => {
            return ColManager.newPullCol(column.name, column.backName, column.type);
        });
        const parents: DagNode[] = this.getParents();
        parents.forEach((parent) => {
            parent.getLineage().getColumns().forEach((parentCol) => {
                changes.push({
                    from: parentCol,
                    to: null
                });
            })
        });
        finalCols.forEach((column) => {
            changes.push({
                from: null,
                to: column
            });
        });

        return {
            columns: finalCols,
            changes: changes
        };
    }

    protected _getSerializeInfo(): DagNodeSQLInfo {
        const nodeInfo = super._getSerializeInfo() as DagNodeSQLInfo;
        nodeInfo.sqlQueryString = this.sqlQueryString;
        nodeInfo.identifiersOrder = [];
        nodeInfo.identifiers = {};
        this.identifiers.forEach(function(value, key) {
            nodeInfo.identifiersOrder.push(key);
            nodeInfo.identifiers[key] = value;
        });
        nodeInfo.srcTableMap = this.srcTableMap;
        nodeInfo.columns = this.columns;
        return nodeInfo;
    }
}