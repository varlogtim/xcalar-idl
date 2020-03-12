import { callApiInSession } from './Api';
import { LoginUser, User } from './User';
import { Table } from './Table';
import { Dataset } from './Dataset';
import { PublishedTable } from './PublishedTable';

const {
    xcHelper, WorkbookManager,
    XcalarNewWorkbook, XcalarActivateWorkbook, XcalarDeactivateWorkbook, XcalarDeleteWorkbook,
    Xcrpc
} = global;


function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

class GlobalSession {
    constructor({ user }) {
        this.user = user;
    }
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

    async executeSql(sql) {
        // execute sql
        const xce = Xcrpc.xce;
        const client = new xce.XceClient(xcHelper.getApiUrl());
        const sqlService = new xce.SqlService(client);

        const optimization = new proto.xcalar.compute.localtypes.Sql.SQLQueryRequest.Optimizations();
        optimization.setDropasyougo(true);
        optimization.setDropsrctables(false);
        optimization.setRandomcrossjoin(false);
        optimization.setPushtoselect(true);
        const request = new proto.xcalar.compute.localtypes.Sql.SQLQueryRequest();
        request.setUsername(this.user.getUserName());
        request.setUserid(this.user.getUserId());
        request.setSessionname(this.sessionName);
        request.setQuerystring(sql);
        request.setQueryname(`XcalarLW-${Date.now()}`);
        request.setOptimizations(optimization);

        const response = await sqlService.executeSQL(request);

        const table = new Table({ session: this, tableName: response.getTablename() });
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
                return new PublishedTable({ name: name });
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
            user: new User(),
            sessionName: `${SESSION_PREFIX}_${randomName()}`
        });
    }
}

export { XDSession, RandomSession, GlobalSession };