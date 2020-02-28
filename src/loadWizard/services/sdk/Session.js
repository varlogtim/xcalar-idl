import { callApiInSession, hashFunc } from './Api';
import { Table } from './Table';

const {
    xcHelper,
    XcalarNewWorkbook, XcalarActivateWorkbook, XcalarDeactivateWorkbook, XcalarDeleteWorkbook,
    Xcrpc
} = global;

const SESSION_PREFIX = 'LWS';
const DEFAULT_USERNAME = "xcalar-lw-internal";

function randomName() {
    const pattern = 'xxxxxxxxxxxxxyyyy';
    return pattern.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16).toUpperCase();
    });
}

function computeUserId(userName) {
    return Number.parseInt("0x" + hashFunc(userName).substring(0, 5)) + 4000000;
};

class Session {
    constructor({
        userName = DEFAULT_USERNAME,
        sessionName = `${SESSION_PREFIX}_${randomName()}`
    } = {}) {
        this.userName = userName;
        this.userId = computeUserId(userName);
        this.sessionName = sessionName;
        this.sessionId = null;
        this._tables = new Array();
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
            await this.deactivate();
            await this.delete();
        } catch(e) {
            console.warn(`Destroy session ${this.sessionName} failed:`, e);
        }
    }

    callLegacyApi(apiCall) {
        return callApiInSession(this.sessionName, this.userName, this.userId, apiCall);
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
        request.setUsername(this.userName);
        request.setUserid(this.userId);
        request.setSessionname(this.sessionName);
        request.setQuerystring(sql);
        request.setQueryname(`XcalarLW-${Date.now()}`);
        request.setOptimizations(optimization);

        const response = await sqlService.executeSQL(request);

        const table = new Table({ session: this, tableName: response.getTablename() });
        this._tables.push(table);
        return table;
    }
}

export { Session };