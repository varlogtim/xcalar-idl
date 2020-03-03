class PublishedTable {
    constructor({ name }) {
        this._name = name;
    }

    getName() {
        return this._name;
    }
}

export { PublishedTable };