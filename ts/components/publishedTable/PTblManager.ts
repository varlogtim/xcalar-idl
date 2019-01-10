class PTblManager {
    private static _instance: PTblManager;
    public static readonly DSPrefix: string = "temp.table.";
    public static readonly InternalColumns: string[] = ["XcalarRankOver", "XcalarOpCode", "XcalarBatchId"];
    public static readonly PKPrefix: string = "XcalarRowNumPk";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tableMap: Map<string, PbTblInfo>;
    private _tables: PbTblInfo[];
    private _loadingTables: {[key: string]: PbTblInfo};
    private _datasetTables: {[key: string]: PbTblInfo};

    public constructor() {
        this._tableMap = new Map();
        this._tables = null;
        this._loadingTables = {};
        this._datasetTables = {};
    }

    public createTableInfo(name: string): PbTblInfo {
        return {
            name: name,
            index: null,
            keys: null,
            size: 0,
            createTime: null,
            active: true,
            columns: null,
            rows: 0
        }
    }

    public getTables(): PbTblInfo[] {
        if (this._tables == null) {
            return [];
        }
        let tables: PbTblInfo[] = this._tables.map((table) => table);
        for (let table in this._loadingTables) {
            tables.push(this._loadingTables[table]);
        }
        for (let table in this._datasetTables) {
            tables.push(this._datasetTables[table]);
        }
        return tables;
    }

    public getTablesAsync(refresh?: boolean): XDPromise<PbTblInfo[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let promise: XDPromise<PublishTable[]>;
        if (this._tables != null && !refresh) {
            promise = PromiseHelper.resolve(this._tables);
        } else {
            promise = this._listTables();
        }

        promise
        .then(() => {
            deferred.resolve(this.getTables());
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public getTableDisplayInfo(tableInfo: PbTblInfo): PbTblDisplayInfo {
        let tableDisplayInfo: PbTblDisplayInfo = {
            index: null,
            name: null,
            rows: "N/A",
            size: "N/A",
            createTime: "N/A",
            status: null
        };

        try {
            tableDisplayInfo.index = tableInfo.index;
            tableDisplayInfo.name = tableInfo.name;

            let active: boolean = tableInfo.active;
            tableDisplayInfo.status = active ? "Active" : "Inactive";
            tableDisplayInfo.rows = active && tableInfo.rows ? xcHelper.numToStr(tableInfo.rows) : "N/A";
            tableDisplayInfo.size = active && tableInfo.size ? <string>xcHelper.sizeTranslator(tableInfo.size) : "N/A";
            tableDisplayInfo.createTime = active && tableInfo.createTime ? moment(tableInfo.createTime * 1000).format("h:mm:ss A ll") : "N/A";
        } catch (e) {
            console.error(e);
        }
        return tableDisplayInfo;
    }

    public getTableSchema(tableInfo: PbTblInfo): PbTblColSchema[] {
        if (!tableInfo || !tableInfo.active) {
            return [];
        }

        let columns: PbTblColSchema[] = [];
        try {
            const keySet: Set<string> = new Set();
            tableInfo.keys.forEach((key) => {
                keySet.add(key);
            });
            tableInfo.columns.forEach((col: ColSchema) => {
                const name: string = col.name;
                if (!PTblManager.InternalColumns.includes(name) &&
                    !name.startsWith(PTblManager.PKPrefix)
                ) {
                    columns.push({
                        name: xcHelper.escapeColName(name),
                        type: col.type,
                        primaryKey: keySet.has(name) ? "Y" : "N"
                    });
                }
            });
        } catch (e) {
            console.error(e);
        }

        return columns;
    }

    public createTableFromSource(
        tableName: string,
        args: {
            name: string,
            sources: {
                targetName: string,
                path: string,
                recursive: boolean,
                fileNamePattern: string
            }[],
            typedColumns: any[],
            moduleName: string,
            funcName: string,
            udfQuery: object,
            schema: ColSchema[]
        },
        primaryKeys: string[],
    ): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        let dsOptions = $.extend({}, args);
        let dsName: string = this._getDSNameFromTableName(tableName);
        dsOptions.name = PTblManager.DSPrefix + tableName;
        dsOptions.fullName = dsName;
        let dsObj = new DSObj(dsOptions);
        let sourceArgs = dsObj.getImportOptions();

        let hasDataset: boolean = false;
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": 3
        });

        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        let schema: ColSchema[] = args.schema;
        this._loadingTables[tableName] = tableInfo;
        this._createDataset(txId, dsName, sourceArgs)
        .then(() => {
            hasDataset = true;
            return this._createTable(txId, dsName, tableName, schema, primaryKeys);
        })
        .then(() => {
            Transaction.done(txId, {});
            delete this._loadingTables[tableName];
            deferred.resolve(tableName);
        })
        .fail((error) => {
            Transaction.fail(txId, {
                error: error
            });
            delete this._loadingTables[tableName];
            if (hasDataset) {
                this._datasetTables[tableName] = tableInfo;
            }
            deferred.reject(error, hasDataset);
        });
    
        return deferred.promise();
    }

    public createTableFromDataset(
        dsName: string,
        tableName: string,
        schema: ColSchema[],
        primaryKeys: string[]
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": 2
        });
        const tableInfo: PbTblInfo = this._datasetTables[tableName];
        delete this._datasetTables[tableName];
        this._loadingTables[tableName] = tableInfo;
        this._createTable(txId, dsName, tableName, schema, primaryKeys)
        .then(() => {
            this._loadingTables[tableName] = tableInfo;
            Transaction.done(txId, {});
            deferred.resolve();
        })
        .fail((error) => {
            this._datasetTables[tableName] = tableInfo;
            Transaction.fail(txId, {
                error: error
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.activateTables
     * @param tableNames
     */
    public activateTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let failures: string[] = [];
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._activateOneTable(tableName, failures);
            }
        });

        PromiseHelper.chain(promises)
        .then(() => {
            // need to update the status and activated tables
            return PromiseHelper.alwaysResolve(this._listTables());
        })
        .then(() => {
            if (failures.length > 0) {
                let error: string = failures.map((msg, index) => {
                    return tableNames[index] + ": " + msg;
                }).join("/n");
                Alert.error(IMDTStr.ActivatingFail, error);
            }
            XcSocket.Instance.sendMessage("refreshIMD", {
                "action": "activate"
            }, null);
            deferred.resolve();
        })
        .fail((error) => {
            Alert.error(IMDTStr.ActivatingFail, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // XXX TODO, combine with deactivateTables in IMDPanel
    /**
     * PTblManager.Instance.deactivateTables
     * @param tableNames
     */
    public deactivateTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let failures: string[] = [];
        Alert.show({
            'title': IMDTStr.DeactivateTable,
            'msg': xcHelper.replaceMsg(IMDTStr.DeactivateTablesMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this._deactivateTables(tableNames, failures)
                .then(() => {
                    if (failures.length > 0) {
                        let error: string = failures.map((msg, index) => {
                            return tableNames[index] + ": " + msg;
                        }).join("/n");
                        Alert.error(IMDTStr.DeactivateTableFail, error);
                    }
                    XcSocket.Instance.sendMessage("refreshIMD", {
                        "action": "deactivate"
                    }, null);
                    deferred.resolve();
                })
                .fail((error) => {
                    Alert.error(IMDTStr.DeactivateTableFail, error);
                    deferred.reject(error);
                });
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.deleteTables
     * @param tableNames
     */
    public deleteTables(tableNames: string[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let failures: string[] = [];
        Alert.show({
            'title': IMDTStr.DelTable,
            'msg': xcHelper.replaceMsg(IMDTStr.DelTableMsg, {
                "tableName": tableNames.join(", ")
            }),
            'onConfirm': () => {
                this._deleteTables(tableNames, failures)
                .then(() => {
                    if (failures.length > 0) {
                        let error: string = failures.map((msg, index) => {
                            return tableNames[index] + ": " + msg;
                        }).join("/n");
                        Alert.error(IMDTStr.DelTableFail, error);
                    }
                    XcSocket.Instance.sendMessage("refreshIMD", {
                        "action": "delete"
                    }, null);
                    deferred.resolve();
                })
                .fail((error) => {
                    Alert.error(IMDTStr.DelTableFail, error);
                    deferred.reject(error);
                });
            },
            'onCancel': () => {
                deferred.reject();
            }
        });

        return deferred.promise();
    }

    private _deactivateTables(tableNames: string[], failures: string[]): XDPromise<void> {
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deactivateOneTable(tableName, failures);
            }
        });
        return PromiseHelper.chain(promises);
    }

    private _deactivateOneTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || !tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(tableName, true)
        .then(() => {
            tableInfo.active = false;
            deferred.resolve();
        })
        .fail((error) => {
            failures.push(error.error);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _activateOneTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo || tableInfo.active) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarRestoreTable(tableName)
        .then(() => {
            tableInfo.active = true;
            deferred.resolve();
        })
        .fail((error) => {
            failures.push(error.error);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _deleteTables(tableNames: string[], failures: string[]): XDPromise<void> {
        const promises = tableNames.map((tableName) => {
            return (): XDPromise<void> => {
                return this._deletOneTable(tableName, failures);
            }
        });
        return PromiseHelper.chain(promises);
    }

    private _deletOneTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (!tableInfo) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(tableName, true)
        .then(() => {
            this._tableMap.delete(tableName);
            for (let i = 0; i < this._tables.length; i++) {
                if (this._tables[i] === tableInfo) {
                    this._tables.splice(i, 1);
                }
            }
            deferred.resolve();
        })
        .fail((error) => {
            failures.push(error.error);
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _getDSNameFromTableName(tableName: string): string {
        return xcHelper.wrapDSName(PTblManager.DSPrefix + tableName);
    }

    private _createDataset(txId: number, dsName: string, sourceArgs: any): XDPromise<void> {
        return XIApi.loadDataset(txId, dsName, sourceArgs);
    }

    /**
     * Step 1: synthesize dataset to xcalar table
     * Step 2: generate row num as primary key if not specified
     * Step 3: Create publish table
     */
    private _createTable(
        txId: number,
        dsName: string,
        tableName: string,
        schema: ColSchema[],
        primaryKeys: string[]
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        dsName = parseDS(dsName);
        let synthesizeTable: string = tableName + Authentication.getHashId();
        XIApi.synthesize(txId, colInfos, dsName, synthesizeTable)
        .then((resTable) => {
            if (primaryKeys == null || primaryKeys.length === 0) {
                let newColName = PTblManager.PKPrefix + Authentication.getHashId();
                primaryKeys = [newColName];
                colInfos.push({
                    orig: newColName,
                    new: newColName,
                    type: DfFieldTypeT.DfInt64
                });
                return XIApi.genRowNum(txId, resTable, newColName);
            } else {
                return PromiseHelper.resolve(resTable);
            }
        })
        .then((resTable: string) => {
            return XIApi.publishTable(txId, primaryKeys, resTable, tableName, colInfos);
        })
        .then(() => {
            XIApi.deleteDataset(txId, dsName);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _listTables(): XDPromise<PublishTable[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        XcalarListPublishedTables("*", false, true)
        .then((result) => {
            this._tables = result.tables.map(this._tableInfoAdapter);
            this._updateTableMap();
            deferred.resolve(this._tables);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _updateTableMap(): void {
        this._tableMap.clear();
        this._tables.forEach((tableInfo) => {
            this._tableMap.set(tableInfo.name, tableInfo);
        });
    }

    private _tableInfoAdapter(table: PublishTable, index: number): PbTblInfo {
        let tableInfo: PbTblInfo = {
            index: index,
            name: null,
            active: null,
            rows: null,
            size: null,
            createTime: null,
            columns: [],
            keys: [],
        };
        try {
            tableInfo.name = table.name;
            tableInfo.active = table.active;
            tableInfo.rows = table.numRowsTotal;
            tableInfo.size = table.sizeTotal;
            tableInfo.createTime = table.updates[0] ? table.updates[0].startTS : null;
            tableInfo.columns = table.values.map((value) => {
                const type: DfFieldTypeT = <any>DfFieldTypeT[value.type];
                return {
                    name: value.name,
                    type: xcHelper.convertFieldTypeToColType(type)
                }
            });
            tableInfo.keys = table.keys.map((key) => key.name);
        } catch (e) {
            console.error(e);
        }

        return tableInfo;
    }
}