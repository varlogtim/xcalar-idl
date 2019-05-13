import request = require("request")
let jQuery: any;
let $: any;
let SqlUtil: any;
require("jsdom/lib/old-api").env("", function(err, window) {
    console.log("initting jQuery");
    if (err) {
        console.error(err);
        return;
    }
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    jQuery.md5 = require('../../../3rd/jQuery-MD5-master/jquery.md5.js');
    SqlUtil = require("../utils/sqlUtils.js").SqlUtil;
});
let sqlQueryObjects: any = {};
const workerFlag: boolean = process.env.EXP_WORKER != null &&
                 process.env.EXP_WORKER.toUpperCase() !== "FALSE" ?
                 true : false;
let sqlWorkerPool: any;
if (workerFlag) {
    const Pool = require("./worker/workerPool.js");
    sqlWorkerPool = new Pool({fileName: './sqlWorker.js', max: 9});
}

let idNum: number = 0;
let gTurnSelectCacheOn: boolean = false;

export interface SessionInfo {
    userName: string,
    userId: number,
    sessionName: string
}

interface TableInfo extends XcalarApiTableInfo {
    schema?: any
}

interface XDTableInfo {
    pubTableName: string,
    tableName: string,
    isIMD: boolean,
    query?: XcalarSelectQuery,
    schema?: any,
    found?: boolean
}

// Start a worker for CPU intensive jobs
function startWorker(data: SQLWorkerData): JQueryPromise<any> {
    if (sqlWorkerPool) {
        let deferred: any = PromiseHelper.deferred();
        sqlWorkerPool.submit(deferred, data);
        return deferred.promise();
    }
}

function generateTablePrefix(userName: string, wkbkName: string): string {
    let curNum = idNum;
    idNum++;
    // Avoid # symbol in table name, cause it might be potential table publish issue
    // return userName + "-wkbk-" + wkbkName + "-" + Date.now() + "#" + curNum;
    return userName + "_wkbk_" + wkbkName + "_" + Date.now() + "_" + curNum;
}

function getUserIdUnique(name: string, hashFunc: any) {
    // XXX This should be removed when we don't need userIdUnique after xcrpc migration
    const hash = hashFunc(name);
    const len = 5;
    const id = parseInt("0x" + hash.substring(0, len)) + 4000000;
    return id;
}

export function connect(hostname: string, username?: string, id?: number):
    JQueryPromise<XcalarApiGetVersionOutput> {
    if (!username) {
        username = "xcalar-internal-sql";
        id = 4193719;
    }
    if (!id) {
        id = getUserIdUnique(username, jQuery.md5);
    }
    xcalarApi.setUserIdAndName(username, id, jQuery.md5);
    if (getTHandle() == null) {
        setupThrift(hostname);
        Admin.addNewUser(username);
    }
    const url = "https://" + hostname + "/app/service/xce";
    Xcrpc.createClient(Xcrpc.DEFAULT_CLIENT_NAME, url);
    return XcalarGetVersion();
};

function activateWkbk(activeSessionNames: string[], wkbkName: string):
    JQueryPromise<any> {
    const deferred = PromiseHelper.deferred();
    if (activeSessionNames.indexOf(wkbkName) < 0) {
        XcalarActivateWorkbook(wkbkName)
        .then(() => {
            deferred.resolve("newly activated");
        })
        .fail(() => {
            deferred.reject("activation failed");
        });
    } else {
        deferred.resolve("already activated");
    }
    return deferred.promise();
}

function goToSqlWkbk(workbook?: string): JQueryPromise<any> {
    let wkbkName: string = workbook || "sql-workbook";
    let deferred: any = PromiseHelper.deferred();
    let activeSessionNames: string[] = [];
    let sqlSession: any = null;

    XcalarListWorkbooks("*", true)
    .then(function(res: XcalarApiSessionListOutput): any {
        res.sessions.forEach(function(session) {
            if (session.name === wkbkName) {
                sqlSession = session;
            }
            if (session.state === "Active") {
                activeSessionNames.push(session.name);
            }
        });
        if (sqlSession == null) {
            return XcalarNewWorkbook(wkbkName, false);
        }
    })
    .then(function() {
        return activateWkbk(activeSessionNames, wkbkName);
    }, function(error: any): any {
        if (error.status === StatusT.StatusSessionExists) {
            return activateWkbk(activeSessionNames, wkbkName);
        } else {
            return PromiseHelper.reject(error);
        }
    })
    .then(function(ret: any): void {
        xcConsole.log("Activated workbook " + wkbkName + ": ", ret);
        setSessionName(wkbkName);
        deferred.resolve(ret);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
}

export function setupConnection(userIdName?: string, userIdUnique?: string | number,
    wkbkName?: string): JQueryPromise<any> {
    let deferred: any = jQuery.Deferred();
    connect("localhost", userIdName, userIdUnique)
    .then(function() {
        xcConsole.log("connected  to localhost");
        return goToSqlWkbk(wkbkName);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);
    return deferred.promise();
}

export function executeSqlWithExtPlan(execid: string, planStr: string,
    rowsToFetch: number, sessionPrefix: string, checkTime: number,
    queryName: string): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    if (rowsToFetch == null) {
        rowsToFetch = 10; // default to be 10
    }
    let finalTable: string;
    let orderedColumns: string[];
    let option: any = {
        prefix: sessionPrefix,
        checkTime: checkTime,
        sqlMode: true,
        queryString: ""
    };
    queryName = queryName || xcHelper.randName("sql");
    let compilerObject: any = new SQLCompiler();
    sqlQueryObjects[name] = compilerObject;

    setupConnection()
    .then(function(): JQueryPromise<any> {
        return compilerObject.compile(queryName, planStr, true, option);
    })
    .then(function(xcQueryString: string, newTableName: string,
        colNames: string[], toCache: any): JQueryPromise<any> {
        xcConsole.log("Compilation finished!");
        finalTable = newTableName;
        orderedColumns = colNames;
        return compilerObject.execute(xcQueryString, finalTable, orderedColumns,
                                      "", undefined, option);
    })
    .then(function(): JQueryPromise<any> {
        xcConsole.log("Execution finished!");
        if (compilerObject.getStatus() === SQLStatus.Cancelled) {
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        return SqlUtil.getResults(finalTable, orderedColumns, rowsToFetch);
    })
    .then(deferred.resolve)
    .fail(function(err): void {
        let retObj: any = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    })
    .always(function(): void {
        XIApi.deleteTable(1, params.sessionPrefix + "*");
    });

    return deferred.promise();
};

function listAllTables(pattern: string, pubTables: Map<string, string>,
    xdTables: Map<string, string>): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    let patternMatch: string = pattern || "*";
    let tableListPromiseArray: JQueryPromise<any>[] = [];
    tableListPromiseArray.push(XcalarListPublishedTables(patternMatch));
    tableListPromiseArray.push(XcalarGetTables(patternMatch));
    PromiseHelper.when.apply(this, tableListPromiseArray)
    .then(function(res: any): void {
        let pubTablesRes: XcalarApiListTablesOutput = res[0];
        let xdTablesRes: any = res[1];
        pubTablesRes.tables.forEach(function(table: any): void {
            if (table.active) {
                pubTables.set(table.name.toUpperCase(), table.name);
            }
        });
        xdTablesRes.nodeInfo.forEach(function(node: any): void {
            xdTables.set(node.name.toUpperCase(), node.name);
        });
        deferred.resolve({pubTablesRes: pubTablesRes});
    })
    .fail(function(): void {
        let args: IArguments = arguments;
        let error: any = null;
        for (let i: number = 0; i < args.length; i++) {
            if (args[i] && (args[i].error ||
                args[i] === StatusTStr[StatusT.StatusCanceled])) {
                error = args[i];
                break;
            }
        }
        deferred.reject(error);
    });
    return deferred.promise();
}

export function listPublishedTables(pattern: string): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    let pubPatternMatch: string = pattern || "*";
    XcalarListPublishedTables(pubPatternMatch)
    .then(function(res: XcalarApiListTablesOutput): void {
        let publishedTables: string[] = [];
        for (let i: number = 0; i < res.tables.length; i++) {
            if (res.tables[i].active) {
                var table = res.tables[i];
                publishedTables.push(table.name);
            }
        }
        deferred.resolve({pubTablesRes: res, publishedTables: publishedTables});
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function sendToPlanner(sessionPrefix: string, requestStruct: RequestInput,
    username: string, wkbkName: string): JQueryPromise<any> {
    let type: string = requestStruct.type;
    let method: string = requestStruct.method;
    let data: any = requestStruct.data;
    if (!username) {
        username = "xcalar-internal-sql";
        wkbkName = "sql-workbook";
    }
    let deferred: any = PromiseHelper.deferred();
    let url: string = "http://localhost:27000/xcesql/" + type;
    if (type !== "sqlparse") {
        url += "/" + encodeURIComponent(encodeURIComponent(sessionPrefix +
               username + "-wkbk-" + wkbkName));
        if (type === "sqlquery") {
            url += "/true/true"
        }
    }

    request({
        method: method,
        url: url,
        json: true,
        body: data
        },
        function (error: any, response: any, body: any): void {
            if (!error && response.statusCode == 200) {
                if (type === "sqlquery") {
                    deferred.resolve(JSON.parse(body.sqlQuery));
                } else {
                    deferred.resolve(body);
                }
            } else {
                if(body && body.exceptionName && body.exceptionMsg) {
                    error = {errorType: body.exceptionName, errorMsg: body.exceptionMsg};
                }
                deferred.reject(error);
            }
        }
    );
    return deferred.promise();
}

function getTablesFromParserResult(identifiers: string[],
    setOfPubTables: Map<string, string>,
    setOfXDTables: Map<string, string>): string[][] | string  {
    let imdTables: string[] = [];
    let xdTables: string[] = [];
    let errorTables: string[] = [];
    setOfXDTables = setOfXDTables || new Map();
    identifiers.forEach(function(identifier) {
        identifier = identifier.toUpperCase();
        let slicedIdentifier: string = identifier.slice(1, -1);
        if (setOfXDTables.has(identifier)){
            xdTables.push(setOfXDTables.get(identifier));
        }
        else if (identifier[0] === "`" && identifier[identifier.length - 1] === "`"
            && setOfXDTables.has(slicedIdentifier)) {
                xdTables.push(setOfXDTables.get(slicedIdentifier));
        }
        else if(setOfPubTables.has(identifier)){
            imdTables.push(setOfPubTables.get(identifier));
        }
        else if (identifier[0] === "`" && identifier[identifier.length - 1] === "`"
            && setOfPubTables.has(slicedIdentifier)) {
                imdTables.push(setOfPubTables.get(slicedIdentifier));
        }
        else {
            errorTables.push(identifier);
        }
    });
    if (errorTables.length > 0) {
        return "Tables not found: " +
            JSON.stringify(errorTables);
    }
    return [imdTables, xdTables];
}

export function getInfoForPublishedTable(pubTableReturn: any,
    pubTableName: string): TableInfo {

    function findPubTableByName(pubList: XcalarApiListTablesOutput,
        pubName: string): XcalarApiTableInfo {
        for (let pubTable of pubList.tables) {
            if (pubTable.name === pubName) {
                return pubTable;
            }
        }
    }
    let tableStruct: TableInfo=
        findPubTableByName(pubTableReturn, pubTableName);

    let columns: XcalarApiColumnInfo[] = tableStruct.values;
    let schema: any = [];
    for (var i = 0; i < columns.length; i++) {
        let colStruct: any = {};
        let column: XcalarApiColumnInfo = columns[i];
        let type: ColumnType = xcHelper.convertFieldTypeToColType(
            DfFieldTypeTFromStr[column.type]);
        colStruct[column.name] = type;
        schema.push(colStruct);
    }
    tableStruct.schema = schema;

    return tableStruct;
}

function getInfoForXDTable(tableName: string, sessionInfo: SessionInfo):
    JQueryPromise<XDTableInfo> {
    let deferred: any = PromiseHelper.deferred();
    let {userName, userId, sessionName} = sessionInfo;
    SqlUtil.setSessionInfo(userName, userId, sessionName);
    XcalarGetTableMeta(tableName)
    .then(function(ret: XcalarApiGetTableMetaOutput) {
        let columns: DfFieldAttrHeader[] = ret.valueAttrs;
        let schema: any = [];
        let colInfos: ColRenameInfo[] = columns.map((column) => {
            let colStruct: any = {};
            let columnName: string = column.name.toUpperCase();
            let colType: ColumnType
                = xcHelper.convertFieldTypeToColType(column.type);
            if (colType !== 'integer' && colType !== 'float' &&
                colType !== 'boolean' && colType !== 'timestamp' &&
                colType !== "string" && colType !== 'money') {
                // can't handle other types in SQL
                return deferred.reject("Invalid column type, cannot handle " + colType);
            }
            colStruct[columnName] = colType;
            schema.push(colStruct);
            return xcHelper.getJoinRenameMap(column.name,
                    columnName, column.type);
        });
        let txId: number = Transaction.start({"simulate": true});
        XIApi.synthesize(txId, colInfos, tableName)
        .then(function(finalizedTableName: string): JQueryPromise<XDTableInfo> {
            let query: string = Transaction.done(txId);
            if(query.slice(-1) === ','){
                query = query.slice(0, -1);
            }
            let jsonQuery: any = JSON.parse(query);
            return deferred.resolve({
                    "pubTableName": tableName,
                    "tableName": finalizedTableName,
                    "query": jsonQuery,
                    "schema":schema,
                    "isIMD": false
                });
        })
        .fail(deferred.reject)
    })
    .fail(deferred.reject);
    return deferred.promise();
};

function selectPublishedTables(args: SQLPublishInput[], allSchemas: any,
    batchIdMap?: any): XcalarSelectQuery[] {
    let queryArray: XcalarSelectQuery[] = [];
    for (let i: number = 0; i < args.length; i++) {
        let renameMap: XcalarTableColumn[] = [];
        for(let j: number = 0; j < allSchemas[args[i].publishName].length;) {
            let obj = allSchemas[args[i].publishName][j];
            var colName = Object.keys(obj)[0];
            var upColName = colName.toUpperCase();
            if (!upColName.startsWith("XCALARRANKOVER") &&
                !upColName.startsWith("XCALAROPCODE") &&
                !upColName.startsWith("XCALARBATCHID") &&
                !upColName.startsWith("XCALARROWNUMPK")) {
                renameMap.push({sourceColumn: colName, destColumn: upColName,
                                columnType: DfFieldTypeTStr[xcHelper
                                    .convertColTypeToFieldType(obj[colName])]});
                var newColObj = {};
                newColObj[upColName] = obj[colName];
                allSchemas[args[i].publishName][j] = newColObj;
                j++;
            } else {
                allSchemas[args[i].publishName].splice(j, 1);
            }
        }
        let query: XcalarSelectQuery = {
            "operation": "XcalarApiSelect",
            "args": {
                "source": args[i].publishName,
                "dest": args[i].importTable,
                "minBatchId": -1,
                // "maxBatchId": batchIdMap ? batchIdMap[args[i].publishName] : -1,
                "maxBatchId": -1,
                "columns": renameMap
            }
        }
        queryArray.push(query);
    }
    return queryArray;
}

function collectTablesMetaInfo(queryStr: string, tablePrefix: string,
    type: string, sessionInfo: SessionInfo): JQueryPromise<any> {
    let {userName, userId, sessionName} = sessionInfo;

    function findValidLastSelect(selects: XcalarApiSelectInput[],
        nextBatchId: number): string {
            for (let select of selects) {
                if (select.maxBatchId + 1 === nextBatchId &&
                    select.minBatchId === 0) {
                    return select.dest;
                }
            }
    }

    function tableValid(pubTableName: string, tableName: string):
        JQueryPromise<XDTableInfo> {
        let deferred = jQuery.Deferred();
        if (!gTurnSelectCacheOn) {
            return PromiseHelper.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": false,
                "isIMD": true
            });
        }
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        XcalarGetTableMeta(tableName)
        .then(function() {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": true,
                "isIMD": true
            });
        })
        .fail(function() {
            deferred.resolve({
                "pubTableName": pubTableName,
                "tableName": tableName,
                "found": false,
                "isIMD": true
            });
        });
        return deferred.promise();
    }

    let allSchemas: any = {};
    let allSelects: any = {};
    let deferred: any = jQuery.Deferred();
    let batchIdMap: any = {};
    let pubTablesMap: Map<string, string> = new Map();
    let xdTablesMap: Map<string, string> = new Map();
    let pubTableRes: any;

    let prom: any;
    let whenCallSent: boolean = false;
    let whenCallReturned: boolean = false;
    //XXX Doing this not to mess up with odbc calls
    // but works without doing this for odbc, need to remove
    // this when we unify sdk and odbc code paths
    if (type === 'odbc') {
        prom = listPublishedTables('*');
    }
    else {
        prom = listAllTables('*', pubTablesMap, xdTablesMap);
    }
    prom
    .then(function(ret: any) {
        //XXX converting pubTables array to Map
        // making xdTables to empty Map
        pubTableRes = ret.pubTablesRes;
        if (type === 'odbc') {
            const retPubTables: string[] = ret.publishedTables;
            for (let pubTable of retPubTables) {
                pubTablesMap.set(pubTable.toUpperCase(), pubTable);
            }
        }
        let requestStruct: RequestInput = {
            type: "sqlparse",
            method: "POST",
            data: {
                sqlQuery: queryStr,
                ops: ["identifier"],
                isMulti: false
            }
        }
        return sendToPlanner(tablePrefix, requestStruct, userName, sessionName);
    })
    .then(function(data: any): JQueryPromise<any> {
        let retStruct: any[] = data.ret;
        if (retStruct.length > 1) {
            return PromiseHelper.reject("Multiple queries not supported yet");
        }
        let identifiers: string[] = retStruct[0].identifiers;
        if (identifiers.length === 0) {
            return PromiseHelper.reject("Failed to get identifiers from invalid SQL");
        }
        let allTables: any =
            getTablesFromParserResult(identifiers, pubTablesMap, xdTablesMap);
        if (typeof(allTables) !== "object") {
            console.log(allTables);
            return PromiseHelper.reject(SQLErrTStr.NoPublishedTable);
        }
        let imdTables: string[] = allTables[0];
        let xdTables: string[] = allTables[1];
        console.log("IMD tables are", imdTables);
        console.log("XD tables are", xdTables);
        let tableValidPromiseArray: JQueryPromise<XDTableInfo>[] = [];
        for (let imdTable of imdTables) {
            let tableStruct: TableInfo =
                getInfoForPublishedTable(pubTableRes, imdTable);
            // schema must exist because getListOfPublishedTables ensures
            // that it exists
            allSchemas[imdTable] = tableStruct.schema;
            batchIdMap[imdTable] = tableStruct.nextBatchId - 1;
            let candidateSelectTable: string =
                findValidLastSelect(tableStruct.selects, tableStruct.nextBatchId);
            allSelects[imdTable] = candidateSelectTable;
            tableValidPromiseArray.push(tableValid(imdTable, candidateSelectTable));
        }

        for (let xdTable of xdTables) {
            tableValidPromiseArray.push(getInfoForXDTable(xdTable, sessionInfo));
        }
        whenCallSent = true;
        return PromiseHelper.when(...tableValidPromiseArray);
    })
    .then(function(res: any): void {
        let returns: any = res;
        whenCallReturned = true;
        // XXX FIX ME We need to make sure from when we check to when we run
        // this call, that the table still exists and that no one has dropped
        // it in the meantime. Alternatively, we can just put in a backup clause
        let xdTableReturns: XDTableInfo[] = [];
        for (let retStruct of returns) {
            if (retStruct.isIMD && !retStruct.found) {
                allSelects[retStruct.pubTableName] = undefined;
            }
            else if (!retStruct.isIMD) {
                xdTableReturns.push(retStruct);
            }
        }
        //imd tables information gathering
        let toSelect: SQLPublishInput[] = [];
        for (let pubTable in allSelects) {
            if (!allSelects[pubTable]) {
                let xcalarTableName: string = xcHelper.randName(tablePrefix) +
                    Authentication.getHashId();
                toSelect.push({
                    importTable: xcalarTableName,
                    publishName: pubTable
                });
                allSelects[pubTable] = xcalarTableName;
            }
        }
        let query_array: XcalarQuery[] =
            selectPublishedTables(toSelect, allSchemas, batchIdMap);

        //xd tables information gathering
        xdTableReturns.forEach(function(xdTableStruct) {
            let xdTable: string = xdTableStruct.tableName;
            let pubTable: string = xdTableStruct.pubTableName;
            allSelects[pubTable] = xdTable;
            query_array.push(xdTableStruct.query);
            allSchemas[pubTable] = xdTableStruct.schema;
        });

        deferred.resolve(query_array, allSchemas, allSelects);
    })
    .fail(function() {
        if (whenCallSent && !whenCallReturned) {
            let args: IArguments = arguments;
            let error: any = null;
            for (let i: number = 0; i < args.length; i++) {
                if (args[i] && (args[i].error ||
                    args[i] === StatusTStr[StatusT.StatusCanceled])) {
                    error = args[i];
                    break;
                }
            }
            deferred.reject(error);
        } else {
            deferred.reject.apply(this, arguments);
        }
    });
    return deferred.promise();
}

export function executeSql(params: SQLQueryInput, type?: string) {
    let deferred: any = PromiseHelper.deferred();
    let optimizations: SQLOptimizations = params.optimizations;
    let tablePrefix: string = params.tablePrefix ||
                        generateTablePrefix(params.userName, params.sessionName);
    tablePrefix = SqlUtil.cleansePrefix(tablePrefix);
    params.usePaging = params.usePaging || false;
    let allSelects: any = {};
    let queryId: string = params.queryName || xcHelper.randName("sql");

    let selectQuery: string | XcalarSelectQuery[] = "";

    let sqlHistoryObj: SQLHistoryObj = {
        queryId: queryId,
        status: SQLStatus.Compiling,
        queryString: params.queryString
    };
    let sqlQueryObj: any;

    setupConnection(params.userName, params.userId, params.sessionName)
    .then(function () {
        sqlHistoryObj["startTime"] = new Date();
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        let sessionInfo: SessionInfo = {
            "userName": params.userName,
            "userId": params.userId,
            "sessionName": params.sessionName
        };
        return collectTablesMetaInfo(params.queryString, tablePrefix, type, sessionInfo);
    })
    .then(function(sqlQuery: XcalarSelectQuery[], schemas: any, selects: any):
        JQueryPromise<any> {
        allSelects = selects;
        selectQuery = sqlQuery;
        let schemasToSendToSqlDf: any[] = [];
        for (let pubTable in schemas) {
            schemasToSendToSqlDf.push({
                tableName: pubTable,
                tableColumns: schemas[pubTable],
                xcTableName: selects[pubTable]
            });
        }
        let requestStruct: RequestInput = {
            type: "schemasupdate",
            method: "put",
            data: schemasToSendToSqlDf
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (): JQueryPromise<any> {
        // get logical plan
        let requestStruct: RequestInput = {
            type: "sqlquery",
            method: "post",
            data: {"sqlQuery": params.queryString}
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (plan: string): JQueryPromise<any> {
        sqlQueryObj = new SQLQuery(queryId, params.queryString, plan, optimizations);
        sqlQueryObj.tablePrefix = tablePrefix;
        sqlQueryObj.fromExpServer = true;
        if (type === "odbc") {
            sqlQueryObj.checkTime = params.checkTime;
        }
        sqlQueryObjects[queryId] = sqlQueryObj;
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        if (workerFlag) {
            let workerData: SQLWorkerData = {
                sqlQueryObj: sqlQueryObj,
                selectQuery: selectQuery,
                allSelects: allSelects,
                params: params,
                type: type
            }
            return startWorker(workerData);
        } else {
            return SQLCompiler.compile(sqlQueryObj);
        }
    })
    .then(function(compiledObj: any): JQueryPromise<any> {
        xcConsole.log("Compilation finished");
        sqlQueryObj = compiledObj;
        sqlQueryObjects[queryId] = sqlQueryObj;
        if (!workerFlag) {
            if (optimizations.noOptimize) {
                let selectString: string = JSON.stringify(selectQuery);
                sqlQueryObj.xcQueryString =
                            selectString.substring(0, selectString.length - 1) +
                            "," + sqlQueryObj.xcQueryString.substring(1);
            } else {
                try {
                    sqlQueryObj.xcQueryString = LogicalOptimizer.optimize(
                                                    sqlQueryObj.xcQueryString,
                                                    optimizations,
                                                    JSON.stringify(selectQuery))
                                                    .optimizedQueryString;
                } catch(e) {
                    deferred.reject(e);
                }
            }
            // Auto-generate a name for the final table if not specified
            if(type !== "odbc" && !params.usePaging && !params.resultTableName) {
                params.resultTableName = xcHelper.randName("res_") + Authentication.getHashId();
            }
            let prefixStruct: SQLAddPrefixReturnMsg = SqlUtil.addPrefix(
                JSON.parse(sqlQueryObj.xcQueryString),
                allSelects,
                sqlQueryObj.newTableName,
                tablePrefix,
                params.usePaging,
                params.resultTableName);
            sqlQueryObj.xcQueryString = prefixStruct.query;
            sqlQueryObj.newTableName = prefixStruct.tableName;
        }
        // To show better performance, we only display duration of execution
        sqlHistoryObj["startTime"] = new Date();
        sqlHistoryObj["status"] = SQLStatus.Running;
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        return SQLExecutor.execute(sqlQueryObj);
    })
    .then(function(): JQueryPromise<any> {
        xcConsole.log("Execution finished!");
        sqlHistoryObj["status"] = SQLStatus.Done;
        sqlHistoryObj["endTime"] = new Date();
        sqlHistoryObj["tableName"] = sqlQueryObj.newTableName;
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        // Drop schemas and nuke session on planner
        let requestStruct: RequestInput = {
            type: "schemasdrop",
            method: "delete"
        }
        return sendToPlanner(tablePrefix, requestStruct, params.userName, params.sessionName)
    })
    .then(function(): JQueryPromise<SQLResult> {
        if (sqlQueryObj.status === SQLStatus.Cancelled) {
            // Query is done already
            return PromiseHelper.reject(SQLErrTStr.Cancel);
        }
        if (type === "odbc") {
            let sessionInfo: SessionInfo = {
                userName: params.userName,
                userId: params.userId,
                sessionName: params.sessionName
            };
            return SqlUtil.getResults(sqlQueryObj.newTableName,
                                      sqlQueryObj.allColumns, params.rowsToFetch,
                                      params.execid, params.usePaging, sessionInfo);
        } else {
            let result: SQLResult = {
                tableName: sqlQueryObj.newTableName,
                columns: sqlQueryObj.allColumns
            }
            return PromiseHelper.resolve(result);
        }
    })
    .then(function(res: SQLResult): void {
        xcConsole.log("sql query finishes.");
        deferred.resolve(res);
    })
    .fail(function(err: any): any {
        xcConsole.log("sql query error: ", err);
        sqlHistoryObj["endTime"] = new Date();
        let retObj: any = {error: err};
        if (err === SQLErrTStr.Cancel) {
            sqlHistoryObj["status"] = SQLStatus.Cancelled;
            retObj.isCancelled = true;
        } else {
            sqlHistoryObj["status"] = SQLStatus.Failed;
            sqlHistoryObj["errorMsg"] = err;
        }
        SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
        SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
        deferred.reject(retObj);
    })
    .always(function(): void {
        if (type == "odbc" || optimizations.dropAsYouGo) {
            SqlUtil.setSessionInfo(params.userName, params.userId, params.sessionName);
            var deleteCompletely = true;
            XIApi.deleteTable(1, tablePrefix + "*", undefined, deleteCompletely);
        }
    });

    return deferred.promise();
};

function loadDatasets(args: SQLLoadInput): JQueryPromise<string> {
    let dsArgs: SQLLoadInput["dsArgs"] = args.dsArgs;
    let formatArgs: SQLLoadInput["formatArgs"] = args.formatArgs;
    let txId: SQLLoadInput["txId"] = args.txId;
    let importTable: SQLLoadInput["importTable"] = args.importTable;
    let sqlDS: SQLLoadInput["sqlDS"] = args.sqlDS;

    let deferred: any = PromiseHelper.deferred();
    XIApi.load(dsArgs, formatArgs, sqlDS, txId)
    .then(function(): JQueryPromise<string> {
        xcConsole.log("load dataset");
        return XIApi.indexFromDataset(txId, sqlDS, importTable, "p");
    })
    .then(deferred.resolve)
    .fail(deferred.reject);
    return deferred.promise();
}

function getDerivedCol(txId: number, tableName: string, schema: any,
    dstTable: string): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    let newSchema: any[] = [];
    let mapStrs: string[] = [];
    let newColNames: string[] = [];
    let newTableName: string =
        xcHelper.randName("tempTable") + Authentication.getHashId();
    schema.forEach(function(cell: any): void {
        let colName: string = Object.keys(cell)[0];
        let type: string = cell[colName];
        let newColName: string =
            xcHelper.parsePrefixColName(colName).name.toUpperCase();
        let mapFn: string;
        if (type === "number" || type === "float") {
            type = "float";
            mapFn = "float";
        } else if (type === "boolean") {
            mapFn = "bool";
        } else {
            mapFn = type;
        }

        let newCell: any = {};
        newCell[newColName] = type;
        newSchema.push(newCell);

        mapStrs.push(mapFn + "(" + colName + ")");
        newColNames.push(newColName);
    });

    XIApi.map(txId, mapStrs, tableName, newColNames, newTableName)
    .then(function(): JQueryPromise<string> {
        return XIApi.project(txId, newColNames, newTableName, dstTable);
    })
    .then(function(): void {
        XIApi.deleteTable(txId, tableName);
        XIApi.deleteTable(txId, newTableName);
        deferred.resolve(newSchema);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function convertToDerivedColAndGetSchema(txId: number, tableName: string,
    dstTable: string): JQueryPromise<any> {
    let deferred: any = PromiseHelper.deferred();
    SqlUtil.getSchema(tableName)
    .then(function(res: any): JQueryPromise<any> {
        return getDerivedCol(txId, tableName, res.schema, dstTable);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

export function sqlLoad(path: string): JQueryPromise<SQLLoadReturnMsg> {
    let sqlTable: string = xcHelper.randName("SQL") + Authentication.getHashId();
    let sqlTableAlias: string = "sql";

    let deferred: any = PromiseHelper.deferred();
    let args: SQLLoadInput;
    args.importTable = xcHelper.randName("importTable") + Authentication.getHashId();
    args.dsArgs = {
        url: path,
        targetName: "Default Shared Root",
        maxSampleSize: 0
    };
    args.formatArgs = {
        format: "JSON"
    };
    args.txId = 1;
    args.sqlDS = xcHelper.randName("sql.12345.ds");

    connect("localhost")
    .then(function(): JQueryPromise<any> {
        xcConsole.log("connected");
        return goToSqlWkbk();
    })
    .then(function(): JQueryPromise<string> {
        return loadDatasets(args);
    })
    .then(function(): JQueryPromise<any> {
        xcConsole.log("create table");
        return convertToDerivedColAndGetSchema(args.txId, args.importTable, sqlTable);
    })
    .then(function(schema: any): void {
        let res: SQLLoadReturnMsg = {
            tableName: sqlTableAlias,
            schema: schema,
            xcTableName: sqlTable
        };
        xcConsole.log("get schema", schema);
        deferred.resolve(res);
    })
    .fail(function(err) {
        deferred.reject(err);
    });

    return deferred.promise();
};

export function getXCquery(params: SQLQueryInput, type: string) {
    let deferred: any = PromiseHelper.deferred();
    let optimizations: SQLOptimizations = params.optimizations;
    let tablePrefix: string = params.tablePrefix ||
                        generateTablePrefix(params.userName, params.sessionName);
    params.usePaging = params.usePaging || false;
    let option: any = {
        prefix: tablePrefix,
        checkTime: params.checkTime,
        sqlMode: true,
        queryString: params.queryString
    };
    let allSelects: any = {};
    let queryId: string = params.queryName || xcHelper.randName("sql");
    let sqlQueryObj: any;

    let selectQuery: string | XcalarSelectQuery[] = "";

    setupConnection(params.userName, params.userId, params.sessionName)
    .then(function (): JQueryPromise<any> {
        let sessionInfo: SessionInfo = {"userName": params.userName,
            "userId": params.userId, "sessionName": params.sessionName};
        return collectTablesMetaInfo(params.queryString, tablePrefix,
            type, sessionInfo);
    })
    .then(function(sqlQuery: XcalarSelectQuery[], schemas: any, selects: any):
        JQueryPromise<any> {
        allSelects = selects;
        selectQuery = sqlQuery;
        let schemasToSendToSqlDf: any[] = [];
        for (var pubTable in schemas) {
            schemasToSendToSqlDf.push({
                tableName: pubTable,
                tableColumns: schemas[pubTable],
                xcTableName: selects[pubTable]
            });
        }
        var requestStruct: RequestInput = {
            type: "schemasupdate",
            method: "put",
            data: schemasToSendToSqlDf
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (): JQueryPromise<any> {
        // get logical plan
        let requestStruct: RequestInput = {
            type: "sqlquery",
            method: "post",
            data: {"sqlQuery": params.queryString}
        }
        return sendToPlanner(tablePrefix, requestStruct,
                             params.userName, params.sessionName);
    })
    .then(function (plan: string): JQueryPromise<any> {
        sqlQueryObj = new SQLQuery(queryId, params.queryString, plan, optimizations);
        sqlQueryObj.tablePrefix = tablePrefix;
        sqlQueryObj.fromExpServer = true;
        if (type === "odbc") {
            sqlQueryObj.checkTime = params.checkTime;
        }
        sqlQueryObjects[queryId] = sqlQueryObj;
        return SQLCompiler.compile(sqlQueryObj);
    })
    .then(function(compiledObj: any): JQueryPromise<any> {
        xcConsole.log("Compilation finished");
        sqlQueryObj = compiledObj;
        sqlQueryObjects[queryId] = sqlQueryObj;
        try {
            sqlQueryObj.xcQueryString = LogicalOptimizer.optimize(
                                                sqlQueryObj.xcQueryString,
                                                sqlQueryObj.optimizations,
                                                JSON.stringify(selectQuery))
                                                .optimizedQueryString;
        } catch(e) {
            deferred.reject(e);
        }
        let prefixStruct: SQLAddPrefixReturnMsg = SqlUtil.addPrefix(
            JSON.parse(sqlQueryObj.xcQueryString),
            allSelects,
            sqlQueryObj.newTableName,
            tablePrefix,
            params.usePaging,
            params.resultTableName);
        sqlQueryObj.xcQueryString = prefixStruct.query;
        deferred.resolve({"prefixedQuery": sqlQueryObj.xcQueryString,
                          "orderedColumns": sqlQueryObj.allColumns});
    })
    .fail(function(err) {
        xcConsole.log("sql query error: ", err);
        let retObj: any = {error: err};
        if (err === SQLErrTStr.Cancel) {
            retObj.isCancelled = true;
        }
        deferred.reject(retObj);
    })

    return deferred.promise();
};

export function cancelQuery(queryName: string): any {
    let deferred: any = PromiseHelper.deferred();
    let sqlQueryObj = sqlQueryObjects[queryName];
    if (sqlQueryObj) {
        return sqlQueryObj.setStatus(SQLStatus.Cancelled);
    } else {
        XcalarQueryCancel(queryName)
        .then(function() {
            let sqlHistoryObj: SQLHistoryObj = {
                queryId: queryName,
                status: SQLStatus.Cancelled,
                endTime: new Date()
            };
            SqlQueryHistory.getInstance().upsertQuery(sqlHistoryObj);
            deferred.resolve();
        })
        .fail(function(error) {
            deferred.reject({error: error});
        });
        return deferred.promise();
    }
}

// Below is for unit test
function fakeSqlLoad(func: any): void {
    sqlLoad = func;
}
function fakeListPublishTables(func: any): void {
    listPublishedTables = func;
}

if (process.env.NODE_ENV === "test") {
    exports.fakeSqlLoad = fakeSqlLoad;
    exports.fakeListPublishTables = fakeListPublishTables;
}