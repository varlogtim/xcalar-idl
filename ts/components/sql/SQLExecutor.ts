class SQLExecutor {
    private static _tabs: Map<string, DagTabUser> = new Map();

    public static getTab(tabId: string): DagTabUser {
        return SQLExecutor._tabs.get(tabId);
    }

    public static setTab(tabId: string, dagTab: DagTabUser): void {
        SQLExecutor._tabs.set(tabId, dagTab);
    }

    public static deleteTab(tabId: string): void {
        SQLExecutor._tabs.delete(tabId);
    }

    private _sql: string;
    private _sqlNode: DagNodeSQL;
    private _IMDNodes: DagNodeIMDTable[];
    private _tempTab: DagTabUser;
    private _tempGraph: DagGraph;
    private _identifiers: {};
    private _identifiersOrder: number[];
    private _schema: {};
    private _status: SQLStatus;

    public constructor(sql: string) {
        this._sql = sql.replace(/;+$/, "");
        this._IMDNodes = [];
        this._identifiersOrder = [];
        this._identifiers = {};
        this._schema = {};
        this._status = SQLStatus.None;
        const tables: string[] = Array.from(XDParser.SqlParser.getTableIdentifiers(sql));
        const tableMap = PTblManager.Instance.getTableMap();
        tables.forEach((identifier, idx) => {
            const pubTableName = identifier.toUpperCase();
            if (tableMap.has(pubTableName)) {
                const columns = [];
                tableMap.get(pubTableName).columns.forEach((column) => {
                    const upperName = column.name.toUpperCase();
                    if (!upperName.startsWith("XCALARRANKOVER") &&
                        !upperName.startsWith("XCALAROPCODE") &&
                        !upperName.startsWith("XCALARBATCHID") &&
                        !upperName.startsWith("XCALARROWNUMPK")) {
                        columns.push(column);
                    }
                });
                this._schema[pubTableName] = columns;
            } else {
                throw "Cannot find published table: " + pubTableName;
            }
            const IMDNode = <DagNodeIMDTable>DagNodeFactory.create({
                type: DagNodeType.IMDTable
            });
            this._IMDNodes.push(IMDNode);
            this._identifiersOrder.push(idx + 1);
            this._identifiers[idx + 1] = identifier;
        });

        this._sqlNode = <DagNodeSQL>DagNodeFactory.create({
            type: DagNodeType.SQL
        });
        this._createDataflow();
    }

    public getStatus(): SQLStatus {
        return this._status;
    }

    public setStatus(status: SQLStatus): void {
        if (this._status === SQLStatus.Done ||
            this._status === SQLStatus.Failed ||
            this._status === SQLStatus.Cancelled) {
            return;
        }
        if (status === SQLStatus.Cancelled && this._status === SQLStatus.Running) {
            this._tempGraph.cancelExecute();
        }
        this._status = status;
    }

    public execute(callback): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let tabId: string = this._tempTab.getId();
        SQLExecutor.setTab(tabId, this._tempTab);
        const publishedTableNodes: DagNodeIMDTable[] = this._IMDNodes;
        this._addPublishedTableNodes(publishedTableNodes);

        let finalTableName;
        let succeed: boolean = false;
        let columns: {name: string, backName: string, type: ColumnType}[];
        let finish = () => {
            SQLExecutor.deleteTab(tabId);
            if (this._status === SQLStatus.Done) {
                this._updateStatus(SQLStatus.Done);
            } else if (this._status === SQLStatus.Cancelled) {
                this._updateStatus(SQLStatus.Cancelled);
            } else {
                this._status = SQLStatus.Failed;
                this._updateStatus(SQLStatus.Failed);
            }
            if (typeof callback === "function") {
                callback(finalTableName, succeed, {columns: columns});
            }
        };

        this._configurePublishedTableNode()
        .then(() => {
            return this._configureSQLNode();
        })
        .then(() => {
            if (this._status === SQLStatus.Cancelled) {
                return PromiseHelper.reject(SQLStatus.Cancelled);
            }
            this._status = SQLStatus.Running;
            return this._tempGraph.execute([this._sqlNode.getId()]);
        })
        .then(() => {
            finalTableName = this._sqlNode.getTable();
            columns = this._sqlNode.getColumns();
            this._status = SQLStatus.Done;
            return this._expandSQLNode();
        })
        .then(() => {
            DagTabManager.Instance.removeSQLTabCache(this._tempTab);
            let promise = this._tempTab.save();
            return PromiseHelper.alwaysResolve(promise);
        })
        .then(() => {
            succeed = true;
            finish();
            deferred.resolve();
        })
        .fail((err) => {
            this._expandSQLNode()
            .always(() => {
                finish();
                deferred.reject(err);
            });
        });

        return deferred.promise();
    }

    private _createDataflow(): void {
        this._tempGraph = new DagGraph();
        const id: string = DagTab.generateId() + ".sql";
        const name: string = "SQL " + moment(new Date()).format("h:mm:ss A ll")
        this._tempTab = new DagTabUser(name, id, this._tempGraph, false, xcTimeHelper.now());
        this._tempGraph.addNode(this._sqlNode);
    }

    private _addPublishedTableNodes(nodes: DagNodeIMDTable[]): void {
        const sqlNodeId: DagNodeId = this._sqlNode.getId();
        nodes.forEach((node, index) => {
            this._tempGraph.addNode(node);
            this._tempGraph.connect(node.getId(), sqlNodeId, index);
        });
    }

    private _configurePublishedTableNode(): XDPromise<void> {
        const promiseArray = [];
        this._IMDNodes.forEach((IMDNode, idx) => {
            const pubTableName = this._identifiers[idx + 1].toUpperCase();
            const schema: ColSchema[] = this._schema[pubTableName];
            const dagNodeIMDInput: DagNodeIMDTableInputStruct = {
                source: pubTableName,
                version: -1,
                schema: schema
            }
            promiseArray.push(IMDNode.setParam(dagNodeIMDInput));
        });
        return PromiseHelper.when.apply(window, promiseArray);
    }

    private _configureSQLNode(): XDPromise<any> {
        this._sqlNode.setParam({
            sqlQueryStr: this._sql,
            identifiers: this._identifiers,
            identifiersOrder: this._identifiersOrder
        }, true);
        const queryId = xcHelper.randName("sqlQuery", 8);
        const identifiers = new Map<number, string>();
        this._identifiersOrder.forEach((idx) => {
            identifiers.set(idx, this._identifiers[idx]);
        });
        const sqlMode = true;
        this._status = SQLStatus.Compiling;
        this._updateStatus(SQLStatus.Compiling);
        this._sqlNode.setIdentifiers(identifiers);
        return this._sqlNode.compileSQL(this._sql, queryId, identifiers, sqlMode);
    }

    private _updateStatus(
        status: SQLStatus,
        startTime?: Date,
        endTime?: Date
    ): void {
        const queryObj = {
            queryString: this._sql,
            dataflowId: this._tempTab.getId(),
            status: status
        }
        if (startTime) {
            queryObj["startTime"] = startTime;
        }
        if (endTime) {
            queryObj["endTime"] = endTime;
        }
        this._sqlNode.setSQLQuery(queryObj);
        this._sqlNode.updateSQLQueryHisory();
    }

    private _expandSQLNode(): XDPromise<void> {
        DagTabManager.Instance.addSQLTabCache(this._tempTab);
        let promise = DagView.expandSQLNodeInTab(this._sqlNode, this._tempTab);
        return PromiseHelper.alwaysResolve(promise);
    }
}