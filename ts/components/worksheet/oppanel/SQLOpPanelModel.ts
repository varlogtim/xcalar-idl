class SQLOpPanelModel {
    private _dagNode: DagNodeSQL;
    private _queryStr: string;
    private _newTableName: string;
    private _columns: {name: string, backName: string, type: ColumnType}[];
    private _jdbcCheckTime: number;
    private _sqlQueryString: string;
    private _identifiers: Map<number, string>;
    private _tableSrcMap: {};

    public constructor(dagNode: DagNodeSQL) {
        this._dagNode = dagNode;
        const params = this._dagNode.getParam();
        this._initialize(params);
        this._columns = dagNode.getColumns() || [];
        this._identifiers = dagNode.getIdentifiers() || new Map<number, string>();
        this._sqlQueryString = dagNode.getSqlQueryString() || "";
        this._tableSrcMap = dagNode.getTableSrcMap();
    }

    private _initialize(params: DagNodeSQLInputStruct): void {
        this._queryStr = params.queryStr;
        this._newTableName = params.newTableName;
        this._jdbcCheckTime = params.jdbcCheckTime;
    }

    public setDataModel(
        queryStr: string,
        newTableName: string,
        columns: SQLColumn[],
        sqlQueryString: string,
        identifiers: Map<number, string>,
        tableSrcMap: {},
        jdbcCheckTime?: number
    ): void {
        this._queryStr = queryStr;
        this._newTableName = newTableName;
        this._columns = this._getQueryTableCols(columns);
        this._jdbcCheckTime = jdbcCheckTime;
        this._sqlQueryString = sqlQueryString;
        this._identifiers = identifiers;
        this._tableSrcMap = tableSrcMap;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param = this._getParam();
        this._dagNode.setColumns(this._columns);
        this._dagNode.setSqlQueryString(this._sqlQueryString);
        this._dagNode.setIdentifiers(this._identifiers);
        this._dagNode.setTableSrcMap(this._tableSrcMap);
        this._dagNode.setParam(param);
        this._dagNode.updateSubGraph();
    }


    private _getParam(): DagNodeSQLInputStruct {
        return {
            queryStr: this._queryStr,
            newTableName: this._newTableName,
            jdbcCheckTime: this._jdbcCheckTime
        }
    }

    public getSqlQueryString(): string {
        return this._sqlQueryString;
    }
    public setSqlQueryString(sqlQueryString: string): void {
        this._sqlQueryString = sqlQueryString;
    }

    public getIdentifiers(): Map<number, string> {
        return this._identifiers;
    }
    public setIdentifiers(identifiers: Map<number, string>): void {
        this._identifiers = identifiers;
    }

    private _getQueryTableCols(allCols: SQLColumn[]) {
        const columns: {name: string, backName: string, type: ColumnType}[] = [];
        const colNameSet = new Set();
        for (let i = 0; i < allCols.length; i++) {
            if (colNameSet.has(allCols[i].colName)) {
                let k = 1;
                while (colNameSet.has(allCols[i].colName + "_" + k)) {
                    k++;
                }
                allCols[i].colName = allCols[i].colName + "_" + k;
            }
            colNameSet.add(allCols[i].colName);
            const colName = allCols[i].rename || allCols[i].colName;
            columns.push({name: allCols[i].colName,
                          backName: colName,
                          type: this._getColType(allCols[i].colType)});
        }
        return columns;
    }
    private _getColType(sqlType: string) {
        switch (sqlType) {
            case "float":
                return ColumnType.float;
            case "int":
                return ColumnType.integer;
            case "string":
                return ColumnType.string;
            case "bool":
                return ColumnType.boolean;
            case "timestamp":
                return ColumnType.timestamp;
            default:
                return null;
        }
    }
}