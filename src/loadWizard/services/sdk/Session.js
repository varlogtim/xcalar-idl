import { callApiInSession, randomName, createGlobalScope, createSessionScope } from './Api';
import { LoginUser, User } from './User';
import { Table } from './Table';
import { Dataset } from './Dataset';
import { PublishedTable } from './PublishedTable';

const {
    xcHelper, WorkbookManager,
    XcalarNewWorkbook, XcalarActivateWorkbook, XcalarDeactivateWorkbook, XcalarDeleteWorkbook,
    XcalarQueryWithCheck, XcalarImportRetina,
    Xcrpc
} = global;


class GlobalSession {
    constructor({ user }) {
        this.user = user;
    }
}

function replaceParams(query, params = new Map()) {
    let queryString = query;
    for (const [key, value] of params) {
        const replacementKey = `<${key}>`;
        queryString = queryString.replace(replacementKey, value);
    }
    return queryString;
}

class BaseSession {
    constructor({ user, sessionName }) {
        this.user = user;
        this.sessionName = sessionName;
        this.sessionId = null;
        this._tables = new Array();
        this._datasets = new Array();
    }

    async create() {
        this.sessionId = await PromiseHelper.convertToNative(XcalarNewWorkbook(this.sessionName));
    }

    async delete() {
        await PromiseHelper.convertToNative(XcalarDeleteWorkbook(this.sessionName));
    }

    async activate() {
        await PromiseHelper.convertToNative(XcalarActivateWorkbook(this.sessionName));
    }

    async deactivate() {
        await PromiseHelper.convertToNative(XcalarDeactivateWorkbook(this.sessionName, false));
    }

    async destroy() {
        try {
            // Cleanup tables
            while (this._tables.length > 0) {
                const table = this._tables.pop();
                await table.destroy();
            }
            // Cleanup datasets
            while (this._datasets.length > 0) {
                const dataset = this._datasets.pop();
                await dataset.destroy();
            }
            await this.deactivate();
            await this.delete();
        } catch(e) {
            console.warn(`Destroy session ${this.sessionName} failed:`, e);
        }
    }

    callLegacyApi(apiCall) {
        return callApiInSession(this.sessionName, this.user.getUserName(), this.user.getUserId(), apiCall, this.user.getHashFunc());
    }

    async executeSql(sql, tableName = null) {
        const resultTableName = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getSqlService().executeSql({
            sqlQuery: sql,
            tableName: tableName,
            queryName: `XcalarLW-${Date.now()}`,
            userName: this.user.getUserName(),
            userId: this.user.getUserId(),
            sessionName: this.sessionName
        });

        const table = new Table({ session: this, tableName: resultTableName });
        this._tables.push(table);
        return table;
    }

    async createDataset({ name, sourceArgs, parseArgs, size = 0 }) {
        const dataset = new Dataset({
            session: this,
            name: name,
            sourceArgs: sourceArgs,
            parseArgs: parseArgs,
            size: size
        });
        await dataset.load();
        this._datasets.push(dataset);

        return dataset;
    }

    async getPublishedTable({ name }) {
        const result = await PromiseHelper.convertToNative(XcalarListPublishedTables(name));
        if (result.tables.length === 0) {
            return null;
        }
        for (const tableInfo of result.tables) {
            if (tableInfo.name === name) {
                return new PublishedTable({
                    session: this,
                    name: name,
                    isActive: tableInfo.active
                });
            }
        }
    }

    async listTables({ namePattern = '*', isGlobal = false } = {}) {
        const scope = isGlobal
            ? Xcrpc.Table.SCOPE.GLOBAL
            : Xcrpc.Table.SCOPE.WORKBOOK;
        const scopeInfo = isGlobal
            ? null
            : { userName: this.user.getUserName(), workbookName: this.sessionName }

        // Call service
        const tableRes = await Xcrpc.getClient(Xcrpc.DEFAULT_CLIENT_NAME).getTableService().listTables({
            namePattern: namePattern,
            scope: scope,
            scopeInfo: scopeInfo
        });

        // Parse response
        const tableList = [];
        for (let tableName in tableRes) {
            tableList.push(new Table({session: this, tableName: tableName}));
        }
        return tableList;
    }

    async deleteTables({ namePattern }) {
        await this.callLegacyApi(() => XcalarDeleteTable(namePattern));
    }

    async executeQuery({ queryString, queryName, params = new Map() }) {
        return await this.callLegacyApi(() => XcalarQueryWithCheck(
            queryName,
            replaceParams(queryString, params)
        ));
    }

    async executeQueryOptimized({ queryStringOpt, queryName, tableName, params = new Map() }) {
        // XXX TODO: use DataflowService.execute instead
        const queryString = replaceParams(queryStringOpt, params);
        await this.callLegacyApi(() => XcalarImportRetina(
            queryName, true, null, queryString, this.user.getUserName(), this.sessionName
        ));
        const retinaParams = [];
        // for (const [key, value] of params) {
        //     retinaParams.push(new XcalarApiParameterT({
        //         paramName: key,
        //         paramValue: value
        //     }));
        // }
        try {
            await this.callLegacyApi(() => XcalarExecuteRetina(queryName, retinaParams, {
                activeSession: true,
                newTableName: tableName,
                udfUserName: this.user.getUserName(),
                udfSessionName: this.sessionName
            }));
        } finally {
            try {
                await this.callLegacyApi(() => XcalarDeleteRetina(queryName));
            } catch(e) {
                console.error('Session.executeQueryOptimized error: ', e);
                // Do nothing
            }
        }
    }
}

class XDSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: WorkbookManager.getXDInternalSessionName()
        });
    }

    async create() {}
    async delete() {}
    async activate() {}
    async deactivate() {}

    // callLegacyApi(apiCall) {
    //     WorkbookManager.switchToXDInternalSession();
    //     try {
    //         const result = PromiseHelper.convertToNative(apiCall());
    //         return result;
    //     } finally {
    //         WorkbookManager.resetXDInternalSession();
    //     }
    // }
}

const SESSION_PREFIX = 'LWS';
class RandomSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: `${SESSION_PREFIX}_${randomName()}`
        });
    }
}

class LoadSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: 'XcalarLoad'
        });
    }
}

class CurrentSession extends BaseSession {
    constructor() {
        super({
            user: new LoginUser(),
            sessionName: sessionName // XD's global sessionName
        });
    }
}

class LoginSession extends BaseSession {
    constructor({ sessionName }) {
        super({
            user: new LoginUser(),
            sessionName: sessionName
        });
    }
}

export { XDSession, RandomSession, GlobalSession, LoadSession, CurrentSession, LoginSession };