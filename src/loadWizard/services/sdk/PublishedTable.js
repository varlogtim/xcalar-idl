class PublishedTable {
    constructor({ session, name, isActive = true, preCreateQuery = [] }) {
        this._session = session;
        this._name = name;
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
    async saveDataflow(query) {
        try {
            const pbTblInfo = new PbTblInfo({name: this.getName()});
            await pbTblInfo.saveDataflowFromQuery(query.concat(this._preCreateQuery), true);
        } catch (e) {
            console.error('PublishedTable.saveDataflow error:', e);
            throw e;
        }
    }
}

export { PublishedTable };