class SQLOpPanelModel extends BaseOpPanelModel {
    protected _dagNode: DagNodeSQL;
    private _sqlQueryStr: string;
    private _identifiers: Map<number, string>;
    private _dropAsYouGo: boolean;
    private _outputTableName: string;

    public constructor(dagNode: DagNodeSQL) {
        super();
        this._dagNode = dagNode;
        const params = this._dagNode.getParam();
        this._initialize(params);
    }

    private _initialize(params: DagNodeSQLInputStruct): void {
        const self = this;
        self._sqlQueryStr = params.sqlQueryStr;
        self._identifiers = new Map<number, string>();
        if (params.identifiersOrder && params.identifiers) {
            params.identifiersOrder.forEach(function(idx) {
                self._identifiers.set(idx, params.identifiers[idx]);
            });
        }
        this._dropAsYouGo = params.dropAsYouGo;
        this._outputTableName = params.outputTableName;
    }

    public setDataModel(
        sqlQueryStr: string,
        identifiers: Map<number, string>,
        dropAsYouGo: boolean,
        outputTableName?: string
    ): void {
        this._sqlQueryStr = sqlQueryStr;
        this._identifiers = identifiers;
        this._dropAsYouGo = dropAsYouGo;
        this._outputTableName = outputTableName;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(noAutoExecute?: boolean): void {
        const param = this._getParam();
        this._dagNode.setIdentifiers(this._identifiers);
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
            dropAsYouGo: this._dropAsYouGo,
            outputTableName: this._outputTableName
        }
    }

    public getSqlQueryString(): string {
        return this._sqlQueryStr;
    }

    public getOutputTableName(): string {
        return this._outputTableName;
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