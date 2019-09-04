class SQLOpPanelModel extends BaseOpPanelModel {
    protected _dagNode: DagNodeSQL;
    private _sqlQueryStr: string;
    private _newTableName: string;
    private _columns: SQLColumn[];
    private _xcQueryString: string;
    private _identifiers: Map<number, string>;
    private _tableSrcMap: {};
    private _dropAsYouGo: boolean;

    public constructor(dagNode: DagNodeSQL) {
        super();
        this._dagNode = dagNode;
        const params = this._dagNode.getParam();
        this._initialize(params);
        this._columns = [];
        this._identifiers = dagNode.getIdentifiers() || new Map<number, string>();
        this._tableSrcMap = dagNode.getTableSrcMap();
        this._newTableName = dagNode.getNewTableName() || "";
        this._dropAsYouGo = dagNode.getParam().dropAsYouGo;
    }

    private _initialize(params: DagNodeSQLInputStruct): void {
        this._sqlQueryStr = params.sqlQueryStr;
    }

    public setDataModel(
        sqlQueryStr: string,
        newTableName: string,
        columns: SQLColumn[],
        xcQueryString: string,
        identifiers: Map<number, string>,
        tableSrcMap: {},
        dropAsYouGo: boolean
    ): void {
        this._sqlQueryStr = sqlQueryStr;
        this._newTableName = newTableName;
        this._columns = columns;
        this._xcQueryString = xcQueryString;
        this._identifiers = identifiers;
        this._tableSrcMap = tableSrcMap;
        this._dropAsYouGo = dropAsYouGo;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(noAutoExecute?: boolean): void {
        const param = this._getParam();
        this._dagNode.setXcQueryString(this._xcQueryString);
        this._dagNode.setIdentifiers(this._identifiers);
        this._dagNode.setTableSrcMap(this._tableSrcMap);
        this._dagNode.setNewTableName(this._newTableName);
        this._dagNode.setParam(param, noAutoExecute);
    }


    private _getParam(): DagNodeSQLInputStruct {
        const identifiersOrder = [];
        const identifiers = {};
        this._identifiers.forEach(function(value, key) {
            identifiersOrder.push(key);
            identifiers[key] = value;
        });
        return {
            sqlQueryStr: this._sqlQueryStr,
            identifiers: identifiers,
            identifiersOrder: identifiersOrder,
            dropAsYouGo: this._dropAsYouGo
        }
    }

    public getSqlQueryString(): string {
        return this._sqlQueryStr;
    }

    public getIdentifiers(): Map<number, string> {
        return this._identifiers;
    }
    public setIdentifiers(identifiers: Map<number, string>): void {
        this._identifiers = identifiers;
    }

    public isDropAsYouGo(): boolean {
        return this._dropAsYouGo;
    }
}