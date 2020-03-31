class PublishedTable {
    constructor({ session, name, isActive = true }) {
        this._session = session;
        this._name = name;
        this._isActive = isActive;
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
}

export { PublishedTable };