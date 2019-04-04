class MetaInfo extends Durable {
    private TILookup: {[key: string]: TableDurable}; // table meta
    private statsCols: any; // profile meta
    private sqlcursor: number; // log cursor position
    private tablePrefix: object; // table prefix meta
    private query: XcQueryDurable[]; // query meta

    constructor(options?: MetaInfDurable) {
        options = options || <MetaInfDurable>{};
        super(options.version);

        this.TILookup = options.TILookup || {};
        this.statsCols = options.statsCols;
        this.query = options.query || [];
        // a simple key,value paris, no constructor
        this.tablePrefix = options.tablePrefix;
        // a number, no constructor
        this.sqlcursor = options.sqlcursor;
    }

    public getTableMeta() {
        return this.TILookup;
    }

    public getStatsMeta() {
        return this.statsCols;
    }

    public getLogCMeta(): number {
        return this.sqlcursor;
    }

    public getTpfxMeta() {
        return this.tablePrefix;
    }

    public getQueryMeta() {
        return this.query;
    }

    public serialize(): string {
        let json = this._getDurable();
        return JSON.stringify(json);
    }

    protected _getDurable(): MetaInfDurable {
        return {
            "version": this.version,
            "TILookup": this._saveTables(),
            "statsCols": Profile.getCache(),
            "sqlcursor": Log.getCursor(),
            "tablePrefix": TableComponent.getPrefixManager().getCache(),
            "query": QueryManager.getCache()
        }
    }

    // XXX TODO: use serialize function in TableMeta
    private _saveTables() {
        let persistTables = xcHelper.deepCopy(gTables);
        for (var tableId in persistTables) {
            var table = persistTables[tableId];
            delete table.currentRowNumber;
            delete table.keyName;
            delete table.keys;
            delete table.resultSetMax;
            delete table.numPages;
            delete table.ordering;
            delete table.scrollMeta;
            if (table.backTableMeta) {
                var metas = table.backTableMeta.metas;
                for (var i = 0; i < metas.length; i++) {
                    delete metas[i].numPagesPerSlot;
                    delete metas[i].numRowsPerSlot;
                }
            }
            delete table.colTypeCache;
            delete table.hiddenSortCols;
        }

        $.extend(persistTables, gDroppedTables);
        return persistTables;
    }
} 