class PublishedTable {
    constructor({ session, name, srcTable, isActive = true, preCreateQuery = [] }) {
        this._session = session;
        this._name = name;
        this._srcTable = srcTable;
        this._isActive = isActive;
        this._preCreateQuery = [...preCreateQuery];
    }

    getName() {
        return this._name;
    }

    async activate() {
        if (!this._isActive) {
            await this._session.callLegacyApi(
                () => XcalarRestoreTable(this._name)
            );
        }
    }

    /**
     * Persist the dataflow from which the table is created
     * @param {Array<Object>} query
     */
    async saveDataflowFromQuery(query) {
        try {
            const pbTblInfo = new PbTblInfo({name: this.getName()});
            await pbTblInfo.saveDataflowFromQuery(query.concat(this._preCreateQuery), true);
        } catch (e) {
            console.error('PublishedTable.saveDataflowFromQuery error:', e);
            throw e;
        }
    }

    async saveDataflow() {
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