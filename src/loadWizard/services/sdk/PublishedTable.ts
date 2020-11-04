import { IXcalarSession } from './Session'

class PublishedTable {
    private _session: IXcalarSession;
    private _name: string;
    private _srcTable: any;
    private _isActive: boolean;
    private _preCreateQuery: Array<any>;

    constructor(params: {
        session?: IXcalarSession,
        name: string,
        srcTable?: any,
        isActive?: boolean,
        preCreateQuery?: Array<any>
    }) {
        const { session, name, srcTable, isActive = true, preCreateQuery = [] } = params;
        this._session = session || srcTable.getSession();
        this._name = name;
        this._srcTable = srcTable;
        this._isActive = isActive;
        this._preCreateQuery = [...preCreateQuery];
    }

    public getName() {
        return this._name;
    }

    public async activate() {
        if (!this._isActive) {
            await this._session.callLegacyApi(
                () => XcalarRestoreTable(this._name)
            );
        }
    }

    public isActive() {
        return this._isActive;
    }

    /**
     * Persist the dataflow from which the table is created
     * @param {Array<Object>} query
     */
    public async saveDataflowFromQuery(query: Array<any>, options?: {
        isConvertQuery?: boolean
    }) {
        try {
            const { isConvertQuery = true } = options || {};
            const pbTblInfo = new PbTblInfo({name: this.getName()});
            const dfQuery = query.concat(this._preCreateQuery);
            if (isConvertQuery) {
                await pbTblInfo.saveDataflowFromQuery(dfQuery, true);
            } else {
                await pbTblInfo.saveXcalarQuery(dfQuery);
            }
        } catch (e) {
            console.error('PublishedTable.saveDataflowFromQuery error:', e);
            throw e;
        }
    }

    public async saveDataflow() {
        try {
            const pbTblInfo = new PbTblInfo({name: this.getName()});
            await pbTblInfo.saveDataflow(this._srcTable.getName(), true);
        } catch (e) {
            console.error('PublishedTable.saveDataflow error:', e);
            throw e;
        }
    }
}

export { PublishedTable };