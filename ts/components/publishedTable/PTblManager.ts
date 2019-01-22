class PTblManager {
    private static _instance: PTblManager;
    public static readonly DSSuffix: string = "-xcalar-ptable";
    public static readonly InternalColumns: string[] = ["XcalarRankOver", "XcalarOpCode", "XcalarBatchId"];
    public static readonly PKPrefix: string = "XcalarRowNumPk";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _tableMap: Map<string, PbTblInfo>;
    private _tables: PbTblInfo[];
    private _initizlied: boolean;
    private _loadingTables: {[key: string]: PbTblInfo};
    private _datasetTables: {[key: string]: PbTblInfo};
    private _cachedTempTableSet: Set<string>; // holds a set of publishTables
    // created through dataflow but that are not yet in the tableMap list
    // because we haven't fetched the table info. When the tableMap is refreshed
    // by making a backend call, we clear this cachedTempTableSet because it
    // should now be part of the refresh table map

    public constructor() {
        this._tableMap = new Map();
        this._tables = [];
        this._initizlied = false;
        this._loadingTables = {};
        this._datasetTables = {};
        this._cachedTempTableSet = new Set();
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

    public getTableMap(): Map<string, PbTblInfo> {
        return this._tableMap;
    }

    public getTables(): PbTblInfo[] {
        let tables: PbTblInfo[] = this._tables.map((table) => table);
        for (let table in this._loadingTables) {
            tables.push(this._loadingTables[table]);
        }
        for (let table in this._datasetTables) {
            tables.push(this._datasetTables[table]);
        }
        return tables;
    }

    public hasTable(tableName, checkCache?: boolean): boolean {
        if (this._tableMap.has(tableName) ||
            this._loadingTables[tableName] ||
            this._datasetTables[tableName]) {
                return true;
        }
        if (checkCache && this._cachedTempTableSet.has(tableName)) {
            return true;
        }
        return false;
    }

    public cacheTempTable(tableName) {
        this._cachedTempTableSet.add(tableName);
    }

    public getTablesAsync(refresh?: boolean): XDPromise<PbTblInfo[]> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let promise: XDPromise<PublishTable[]>;
        if (this._initizlied && !refresh) {
            promise = PromiseHelper.resolve(this._tables);
        } else {
            promise = this._listTables();
        }

        promise
        .then(() => {
            this._initizlied = true;
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

    /**
     * PTblManager.Instance.getSchemaArrayFromDataset
     * @param dsName
     */
    public getSchemaArrayFromDataset(dsName): XDPromise<ColSchema[][]> {
        return this._getSchemaArrayFromDataset(dsName);
    }

    /**
     * PTblManager.Instance.createTableFromSource
     * @param tableInfo
     * @param args
     * @param primaryKeys
     */
    public createTableFromSource(
        tableInfo: PbTblInfo,
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
        let tableName: string = tableInfo.name;
        let dsName: string = this._getDSNameFromTableName(tableName);
        dsOptions.name = tableName + PTblManager.DSSuffix;
        dsOptions.fullName = dsName;
        let dsObj = new DSObj(dsOptions);
        let sourceArgs = dsObj.getImportOptions();

        const totalStep: number = 3;
        let txId = Transaction.start({
            "msg": TblTStr.Create + ": " + tableName,
            "operation": SQLOps.TableFromDS,
            "track": true,
            "steps": totalStep
        });

        let hasDataset: boolean = false;
        let schema: ColSchema[] = args.schema;
        this._loadingTables[tableName] = tableInfo;

        let currentStep: number = 1;
        let currentMsg: string = TblTStr.Importing;
        this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);

        this._createDataset(txId, dsName, sourceArgs)
        .then(() => {
            hasDataset = true;
            currentStep = 2;
            currentMsg = TblTStr.CheckingSchema;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._checkSchemaInDatasetCreation(dsName, schema);
        })
        .then((finalSchema) => {
            currentStep = 3;
            currentMsg = TblTStr.Creating;
            this._refreshTblView(tableInfo, currentMsg, currentStep, totalStep);
            return this._createTable(txId, dsName, tableName, finalSchema, primaryKeys);
        })
        .then(() => {
            Transaction.done(txId, {
                noNotification: true,
                noCommit: true
            });
            delete this._loadingTables[tableName];
            deferred.resolve(tableName);
        })
        .fail((error, isSchemaError) => {
            let noAlert: boolean = false;
            delete this._loadingTables[tableName];
            if (hasDataset) {
                if (isSchemaError) {
                    noAlert = true;
                    this.addDatasetTable(dsName);
                } else {
                    XIApi.deleteDataset(txId, dsName);
                }
            }
            Transaction.fail(txId, {
                noAlert: noAlert,
                noNotification: true,
                error: error
            });
            deferred.reject(error, hasDataset);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.createTableFromDataset
     * @param dsName
     * @param tableName
     * @param schema
     * @param primaryKeys
     */
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
            delete this._loadingTables[tableName];
            Transaction.done(txId, {
                noCommit: true,
                noNotification: true
            });
            deferred.resolve();
        })
        .fail((error) => {
            delete this._loadingTables[tableName];
            this._datasetTables[tableName] = tableInfo;
            Transaction.fail(txId, {
                error: error,
                noNotification: true,
                noAlert: true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * PTblManager.Instance.createTableFromView
     * @param pks
     * @param columns
     * @param viewName
     * @param tableName
     */
    public createTableFromView(
        pks: string[],
        columns: ProgCol[],
        viewName: string,
        tableName: string
    ): XDPromise<void> {
        const deferred:XDDeferred<void> = PromiseHelper.deferred();
        const txId: number = Transaction.start({
            operation: "publishIMD",
            track: true,
        });

        this.createTableInfo(tableName);
        this._loadingTables[tableName] = name;
        XIApi.publishTable(txId, pks, viewName, tableName,
            xcHelper.createColInfo(columns))
        .then(() => {
            // need to update the status and activated tables
            return PromiseHelper.alwaysResolve(this._listTables());
        })
        .then(() => {
            delete this._loadingTables[tableName];
            Transaction.done(txId, {
                noCommit: true
            });
            deferred.resolve();
        })
        .fail((error) => {
            delete this._loadingTables[tableName];
            Transaction.fail(txId, {
                noAlert: true,
                noNotification: true
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    public addDatasetTable(dsName: string): void {
        if (!dsName.endsWith(PTblManager.DSSuffix)) {
            return;
        }
        let tableName: string = this._getTableNameFromDSName(dsName);
        let tableInfo: PbTblInfo = PTblManager.Instance.createTableInfo(tableName);
        tableInfo.state = PbTblState.BeDataset;
        tableInfo.dsName = dsName;
        this._datasetTables[tableName] = tableInfo;
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

    /**
     * PTblManager.Instance.selectTable
     */
    public selectTable(tableInfo: PbTblInfo): XDPromise<string> {
        return this._selectTable(tableInfo);
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
                return this._deleteOneTable(tableName, failures);
            }
        });
        return PromiseHelper.chain(promises);
    }

    private _deleteOneTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._tableMap.get(tableName);
        if (tableInfo == null) {
            return this._deleteDSTable(tableName, failures);
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        XcalarUnpublishTable(tableName, false)
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

    private _deleteDSTable(tableName: string, failures: string[]): XDPromise<void> {
        let tableInfo: PbTblInfo = this._datasetTables[tableName];
        if (tableInfo == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let txId = Transaction.start({
            "operation": SQLOps.DestroyPreviewDS,
            "track": true
        });
        XIApi.deleteDataset(txId, tableInfo.dsName, true)
        .then(() => {
            delete this._datasetTables[tableName];
            Transaction.done(txId, {
                "noCommit": true,
                "noSql": true
            });
            deferred.resolve();
        })
        .fail((error) => {
            failures.push(error.error);
            Transaction.fail(txId, {
                "error": error,
                "noAlert": true
            });
            deferred.resolve(); // still resolve it
        });
        return deferred.promise();
    }

    private _selectTable(tableInfo: PbTblInfo): XDPromise<string> {
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        const graph: DagGraph = new DagGraph();
        const node: DagNodeIMDTable = <DagNodeIMDTable>DagNodeFactory.create({
            type: DagNodeType.IMDTable
        });
        graph.addNode(node);
        node.setParam({
            source: tableInfo.name,
            version: -1,
            schema: tableInfo.columns
        });
        graph.execute([node.getId()])
        .then(() => {
            deferred.resolve(node.getTable());
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getDSNameFromTableName(tableName: string): string {
        return xcHelper.wrapDSName(tableName) + PTblManager.DSSuffix;
    }

    private _getTableNameFromDSName(dsName: string): string {
        let parseRes = xcHelper.parseDSName(dsName);
        let tableName: string = parseRes.dsName;
        // remove the suffix
        if (tableName.endsWith(PTblManager.DSSuffix)) {
            tableName = tableName.substring(0, tableName.length - PTblManager.DSSuffix.length);
        }
        return tableName;
    }

    private _createDataset(txId: number, dsName: string, sourceArgs: any): XDPromise<void> {
        return XIApi.loadDataset(txId, dsName, sourceArgs);
    }

    private _checkSchemaInDatasetCreation(
        dsName: string,
        schema: ColSchema[]
    ): XDPromise<ColSchema[]> {
        if (schema != null) {
            return PromiseHelper.resolve(schema, false);
        }
        const deferred: XDDeferred<ColSchema[]> = PromiseHelper.deferred();
        this._getSchemaArrayFromDataset(dsName)
        .then((schemaArray, hasMultipleSchema) => {
            if (hasMultipleSchema) {
                let error: string = xcHelper.replaceMsg(TblTStr.MultipleSchema, {
                    name: this._getTableNameFromDSName(dsName)
                })
                deferred.reject({
                    error: error
                }, true);
            } else {
                let schema: ColSchema[] = schemaArray.map((schemas) => schemas[0]);
                deferred.resolve(schema);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    // XXX TODO combine with getSchemaMeta in ds.js
    private _getSchemaArrayFromDataset(
        dsName: string,
    ): XDPromise<ColSchema[][]> {
        const deferred: XDDeferred<ColSchema[][]> = PromiseHelper.deferred();
        XcalarGetDatasetsInfo(dsName)
        .then((res) => {
            try {
                let hasMultipleSchema: boolean = false;
                let schemaArray: ColSchema[][] = [];
                let dataset = res.datasets[0];
                let indexMap: {[key: string]: number} = {};
                dataset.columns.forEach((colInfo) => {
                    // if the col name is a.b, in XD it should be a\.b
                    const name = xcHelper.escapeColName(colInfo.name);
                    const type = xcHelper.convertFieldTypeToColType(<any>DfFieldTypeT[colInfo.type]);
                    let index = indexMap[name];
                    if (index == null) {
                        // new columns
                        index = schemaArray.length;
                        indexMap[name] = index;
                        schemaArray[index] = [{
                            name: name,
                            type: type
                        }];
                    } else {
                        // has multiple schema
                        hasMultipleSchema = true;
                        schemaArray[index].push({
                            name: name,
                            type: type
                        });
                    }
                });
                deferred.resolve(schemaArray, hasMultipleSchema);
            } catch (e) {
                console.error(e);
                deferred.reject({
                    error: "Parse Schema Error"
                });
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
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
        const validTypes: ColumnType[] = BaseOpPanel.getBasicColTypes();
        schema = schema.filter((colInfo) => {
            return validTypes.includes(colInfo.type);
        });

        const colInfos: ColRenameInfo[] = xcHelper.getColRenameInfosFromSchema(schema);
        const pbColInfos: ColRenameInfo[] = [];
        colInfos.forEach((colInfo) => {
            // make sure column is uppercase
            let upperCaseCol: string = colInfo.new.toUpperCase();
            colInfo.new = upperCaseCol
            pbColInfos.push({
                orig: upperCaseCol,
                new: upperCaseCol,
                type: colInfo.type
            });
        });
        const parsedDsName = parseDS(dsName);
        let synthesizeTable: string = tableName + Authentication.getHashId();
        let tempTables: string[] = [];
        XIApi.synthesize(txId, colInfos, parsedDsName, synthesizeTable)
        .then((resTable) => {
            tempTables.push(resTable);
            if (primaryKeys == null || primaryKeys.length === 0) {
                let newColName = PTblManager.PKPrefix + Authentication.getHashId();
                primaryKeys = [newColName];
                pbColInfos.push({
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
            if (resTable != tempTables[0]) {
                tempTables.push(resTable);
            }
            // final check, if tableName is used
            if (this._tableMap.has(tableName)) {
                console.info("dup table name");
                tableName = xcHelper.uniqueName(tableName, (name) => {
                    return !this._tableMap.has(name);
                }, null);
            }
            return XIApi.publishTable(txId, primaryKeys, resTable, tableName, pbColInfos);
        })
        .then(() => {
            XIApi.deleteDataset(txId, dsName);
            XIApi.deleteTableInBulk(txId, tempTables, true);
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
        this._cachedTempTableSet.clear();
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

    private _refreshTblView (
        tableInfo: PbTblInfo,
        text: string,
        step: number,
        totalStep: number
    ): void {
        let msg: string = `Step ${step}/${totalStep}: ${text}`;
        tableInfo.loadMsg = msg;
        TblSourcePreview.Instance.refresh(tableInfo);
    }
}