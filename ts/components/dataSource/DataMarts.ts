interface DataMart {
    name: string;
    tables: string[];
    active: boolean;
}

class DataMarts {
    private _dataMarts: Map<string, DataMart>;
    private _restored: boolean;

    public constructor() {
        this._dataMarts = new Map();
        this._restored = false;
    }

    /**
     * Check if has data mart with the same name
     * @param name
     */
    public has(name: string): boolean {
        return this._dataMarts.has(name);
    }

    /**
     * get a data mart by name
     * @param name
     */
    public get(name: string): DataMart {
        return this._dataMarts.get(name);
    }

    /**
     * get the list of all data marts
     * that is sorted by name
     */
    public getAllList(): DataMart[] {
        let dataMarts: DataMart[] = [];
        this._dataMarts.forEach((mart) => {
            dataMarts.push(mart);
        });

        // sort by name first
        dataMarts.sort(function(mart1, mart2) {
            let name1 = mart1.name || "";
            name1 = name1.toLowerCase();
            let name2 = mart2.name || "";
            name2 = name2.toLowerCase();
            return (name1 < name2 ? -1 : (name1 > name2 ? 1 : 0));
        });

        return dataMarts;
    }

    /**
     * Restore data mart from KVStore
     */
    public async restore(forceRestore: boolean): Promise<void> {
        try {
            if (!forceRestore && this._restored) {
                return;
            }
            const dataMatsJSON: {[key: string]: DataMart} = await this._getKVStore().getAndParse();
            if (dataMatsJSON != null) {
                this._dataMarts.clear();
                for (let name in dataMatsJSON) {
                    const dataMart = {
                        ...dataMatsJSON[name],
                        active: false
                    };
                    this._dataMarts.set(name, dataMart);
                }
            }
            this._restored = true;
        } catch (e) {
            console.error("restore data mart failed", e);
        }
    }

    /**
     * Sync up with the tables list
     * @param pbTables
     */
    public sync(pbTables: PbTblInfo[]): void {
        const set: Set<string> = new Set();
        pbTables.forEach((pbTable) => set.add(pbTable.name));

        this._dataMarts.forEach((dataMart) => {
            dataMart.tables = dataMart.tables.filter((tableName) => {
                if (set.has(tableName)) {
                    set.delete(tableName);
                    return true;
                } else {
                    // when a table in data mart meta doesn't exist in backend
                    console.warn("table " + tableName + " doesn't exist");
                    return false;
                }
            });
        });

        // check any left table that are not in any data mart
        set.forEach((tableName) => {
            console.error("table " + tableName + " is not in any data mart");
        });
    }

    public async create(name: string): Promise<void> {
        if (this._dataMarts.has(name)) {
            throw new Error(DataMartTStr.AlredyExist);
        }

        const dataMart: DataMart = {
            name,
            tables: [],
            active: false
        };
        this._dataMarts.set(name, dataMart);

        try {
            await this._commit();
        } catch (e) {
            this._dataMarts.delete(name); // rollback
            const error: string = xcStringHelper.replaceMsg(DataMartTStr.CreateFailed, e);
            throw new Error(error);
        }
    }

    public async delete(name: string): Promise<void> {
        const dataMart = this._dataMarts.get(name);
        if (!dataMart) {
            console.error("Data Mart " + name + " not exist");
            return;
        }
        if (dataMart.tables.length > 0) {
            throw new Error(DataMartTStr.DeleteNoEmpty);
        }
        this._dataMarts.delete(name);

        try {
           await this._commit();
        } catch (e) {
            this._dataMarts.set(name, dataMart); // rollback
            const error: string = xcStringHelper.replaceMsg(DataMartTStr.DeleteFailed, e);
            throw new Error(error);
        }
    }

    public async addTable(dataMartName: string, tableName: string): Promise<void> {
        try {
            const dataMart = this.get(dataMartName);
            if (!dataMart.tables.includes(tableName)) {
                dataMart.tables.push(tableName);
                dataMart.tables.sort();
                await this._commit();
            }
        } catch (e) {
            console.error("add table to data mart failed", e);
        }
    }

    public async deleteTable(dataMartName: string, tableName: string): Promise<void> {
        try {
            const dataMart = this.get(dataMartName);
            dataMart.tables = dataMart.tables.filter((name) => name !== tableName);
            await this._commit();
        } catch (e) {
            console.error("delete table to data mart failed", e);
        }
    }

     /**
     * Commit data mart structure to KVStore
     */
    private async _commit(): Promise<void> {
        const serializedStr = this._getSeriazble();
        return this._getKVStore().put(serializedStr, true);
    }

    private _getKVStore(): KVStore {
        const key: string = KVStore.getKey("gDataMartKey");
        return new KVStore(key, gKVScope.GLOB);
    }

    private _getSeriazble(): string {
        const json: {[key: string]: DataMart} = {};
        this._dataMarts.forEach((dataMart) => {
            json[dataMart.name] = dataMart;
        });
        return JSON.stringify(json);
    }
}