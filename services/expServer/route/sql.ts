import { Router } from "express"
export const router = Router()

import sqlManager from "../controllers/sqlManager"
import sqlManagerDeprecated from "../controllers/sqlManagerDeprecated"
import * as support from "../utils/expServerSupport"
import { SqlUtil } from "../utils/sqlUtils"

// set default timeout to 20 min
const defaultSQLTimeout: number = process.env.EXP_SQL_TIMEOUT &&
                        !isNaN(parseInt(process.env.EXP_SQL_TIMEOUT)) ?
                        parseInt(process.env.EXP_SQL_TIMEOUT) : 1200000;

router.post("/xcedf/load", function(req, res) {
    let path: string = req.body.path;
    xcConsole.log("load sql path", path);
    sqlManager.sqlLoad(path)
    .then(function(output: any): void {
        xcConsole.log("sql load finishes");
        res.send(output);
    })
    .fail(function(error: any): void {
        xcConsole.log("sql load error", error);
        res.status(500).send(error);
    });
})

router.post("/deprecated/select", function(req, res) {
    let publishNames: string[];
    try {
        publishNames = JSON.parse(req.body.names);
    } catch (err) {
        res.status(500).send("Invalid table names.");
        return;
    }
    let sessionPrefix: string = req.body.sessionId;
    let cleanup: boolean = (req.body.cleanup === "true");
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionPrefix = "src" + sessionPrefix.replace(/-/g, "") + "_";
    xcConsole.log("load from published table: ", publishNames);
    sqlManagerDeprecated.sqlSelect(publishNames, sessionPrefix, cleanup, checkTime)
    .then(function(output) {
        xcConsole.log("sql load published table finishes");
        res.send(output);
    })
    .fail(function(error) {
        xcConsole.log("sql load error", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/query", function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        dropSrcTables: !req.body.keepOri,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    }
    let params: SQLQueryInput = {
        userName: req.body.userIdName,
        userId: req.body.userIdUnique,
        sessionName: req.body.wkbkName,
        resultTableName: req.body.newSqlTableName,
        queryString: req.body.queryString,
        tablePrefix: req.body.queryTablePrefix,
        queryName: req.body.queryTablePrefix,
        optimizations: optimizations
    }
    sqlManager.executeSql(params)
    .then(function(executionOutput) {
        xcConsole.log("Sent schema for resultant table");
        res.send(executionOutput);
    })
    .fail(function(error) {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

// XXX Some parameters need to be renamed
// apply similar code to /sql/query, or even simply merge them into one router
// Only difference is they take different parameters
router.post("/xcsql/queryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    req.setTimeout(defaultSQLTimeout);
    let tablePrefix: string = req.body.sessionId;
    let usePaging: boolean = req.body.usePaging === "true";
    // jdbc only passes string to us
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    const type: string = "odbc";
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect,
        dedup: req.body.dedup,
        noOptimize: req.body.noOptimize
    };
    optimizations.dropAsYouGo =
        optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin =
        optimizations.randomCrossJoin == undefined ?
        false : optimizations.randomCrossJoin;
    optimizations.pushToSelect =
        optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    let params: SQLQueryInput = {
        userName: req.body.userName,
        sessionName: req.body.wkbkName,
        execid: req.body.execid,
        queryString: req.body.queryString,
        limit: req.body.limit,
        tablePrefix: req.body.sessionId,
        checkTime: checkTime,
        queryName: req.body.queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    sqlManager.executeSql(params, type)
    .then(function(output): void {
        res.send(output);
    })
    .fail(function(error): void {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/getXCqueryWithPublishedTables", [support.checkAuth],
    function(req, res) {
    let tablePrefix: string = req.body.sessionId;
    let usePaging: boolean = req.body.usePaging === "true";
    // jdbc only passes string to us
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    tablePrefix = "sql" + tablePrefix.replace(/-/g, "") + "_";
    let type: string = "odbc";
    let optimizations: SQLOptimizations = {
        dropAsYouGo: req.body.dropAsYouGo,
        deleteCompletely: true,
        randomCrossJoin: req.body.randomCrossJoin,
        pushToSelect: req.body.pushToSelect
    };
    optimizations.dropAsYouGo =
        optimizations.dropAsYouGo == undefined ? true : optimizations.dropAsYouGo;
    optimizations.randomCrossJoin =
        optimizations.randomCrossJoin == undefined ?
        false: optimizations.randomCrossJoin;
    optimizations.pushToSelect =
        optimizations.pushToSelect == undefined ? true : optimizations.pushToSelect;
    let params: SQLQueryInput = {
        userName: req.body.userName,
        sessionName: req.body.wkbkName,
        execid: req.body.execid,
        queryString: req.body.queryString,
        limit: req.body.limit,
        tablePrefix: req.body.sessionId,
        checkTime: checkTime,
        queryName: req.body.queryName,
        usePaging: usePaging,
        optimizations: optimizations
    }
    sqlManager.getXCquery(params, type)
    .then(function(output: any): void {
        xcConsole.log("get xcalar query finishes");
        res.send(output);
    })
    .fail(function(error: any): void {
        xcConsole.log("get xcalar query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/result", [support.checkAuth], function(req, res) {
    let resultSetId = req.body.resultSetId;
    let rowPosition: number = parseInt(req.body.rowPosition);
    let rowsToFetch: number = parseInt(req.body.rowsToFetch);
    let totalRows: number = parseInt(req.body.totalRows);
    let schema: any = JSON.parse(req.body.schema);
    let renameMap: SQLColumn = JSON.parse(req.body.renameMap);
    let sessionInfo: SessionInfo = {
        userName: req.body.userName,
        userId: req.body.userId,
        sessionName: req.body.sessionName
    }
    const {userName, userId, sessionName} = sessionInfo;
    sqlManager.setupConnection(userName, userId, sessionName)
    .then(function() {
        return SqlUtil.fetchData(resultSetId, rowPosition, rowsToFetch,
                            totalRows, [], 0, 0, sessionInfo);
    })
    .then(function(data: any): void {
        let result: any = SqlUtil.parseRows(data, schema, renameMap);
        let endRow: number = rowPosition + rowsToFetch;
        xcConsole.log("fetched data from " + rowPosition + " to " + endRow);
        res.send(result);
    })
    .fail(function(error): void {
        xcConsole.log("fetching data error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/getTable", [support.checkAuth], function (req, res) {
    let tableName: string = req.body.tableName;
    let rowsToFetch: number = parseInt(req.body.rowsToFetch);
    let rowPosition: number = parseInt(req.body.rowPosition); // 1 indexed
    let userName: string = req.body.userName;
    let userId: number = req.body.userId;
    let sessionName: string = req.body.sessionName;
    sqlManager.setupConnection(userName, userId, sessionName)
    .then(function(): JQueryPromise<any> {
        return SqlUtil.getRows(tableName, rowPosition, rowsToFetch, false,
            {userName: userName, userId: userId, sessionName: sessionName});
    })
    .then(function(data: any): void {
        let cleanedData: any[] = [];
        for (let row of data) {
            cleanedData.push(JSON.parse(row));
        }
        res.send(cleanedData);
    })
    .fail(function(error: any): void {
        xcConsole.log("getTable error: ", error);
        res.status(500).send(error);
    });
});

router.post("/xcsql/clean", [support.checkAuth], function(req, res) {
    let tableName: string = req.body.tableName;
    let resultSetId: string = req.body.resultSetId;
    let userName: string = req.body.userName;
    let userId: string = req.body.userId;
    let sessionName: string = req.body.sessionName;
    sqlManager.setupConnection(userName, userId, sessionName)
    .then(function() {
        if (resultSetId) {
            SqlUtil.setSessionInfo(userName, userId, sessionName);
            return XcalarSetFree(resultSetId);
        } else {
            return PromiseHelper.resolve();
        }
    })
    .then(function(): JQueryPromise<void> {
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        let deleteCompletely: boolean = true;
        return XIApi.deleteTable(1, tableName, undefined, deleteCompletely);
    })
    .then(function(): void {
        xcConsole.log("cleaned table and free result set for: ", tableName);
        res.send({sucess: true});
    })
    .fail(function(error): void {
        xcConsole.log("failed to drop table: ", tableName, error);
        res.status(500).send(error);
    });
})

router.post("/xdh/query", [support.checkAuth], function(req, res) {
    let execid: string = req.body.execid;
    let queryName: string = req.body.queryName;
    let plan: string = req.body.plan;
    let limit: any = req.body.limit;
    let sessionPrefix: string = req.body.sessionId;
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    sessionPrefix = "sql" + sessionPrefix.replace(/-/g, "") + "_";
    sqlManager.executeSqlWithExtPlan(execid, plan, limit, sessionPrefix,
        checkTime, queryName)
    .then(function (output: any): void {
        xcConsole.log("sql query finishes");
        res.send(output);
    })
    .fail(function (error: any): void {
        xcConsole.log("sql query error: ", error);
        res.status(500).send(error);
    });
})

router.post("/xcsql/list", [support.checkAuth], function(req, res) {
    let pattern: string = req.body.pattern;
    sqlManager.connect("localhost")
    .then(function(): JQueryPromise<any> {
        xcConsole.log("connected");
        return sqlManager.listPublishedTables(pattern);
    })
    .then(function(ret: any) {
        const results: XcalarApiListTablesOutput = ret.pubTablesRes;
        const tables: string[] = ret.publishedTables;
        let retStruct: any[] = [];

        for (let pubTable of tables) {
            let pubTableMeta: any = {};
            pubTableMeta["tableName"] = pubTable;
            pubTableMeta["tableColumns"] =
                sqlManager.getInfoForPublishedTable(results, pubTable).schema;
            retStruct.push(pubTableMeta);
        }

        xcConsole.log("List published tables schema");
        res.send(retStruct);
    })
    .fail(function(error) {
        xcConsole.log("get published tables error: ", error);
        res.status(500).send(error);
    });
})


router.post("/xcsql/cancel", [support.checkAuth], function(req, res) {
    let queryName: string = req.body.queryName;
    let userName: string = req.body.userName;
    let userId: string = req.body.userId;
    let sessionName: string = req.body.sessionName;
    sqlManager.setupConnection(userName, userId, sessionName)
    .then(function() {
        SqlUtil.setSessionInfo(userName, userId, sessionName);
        return sqlManager.cancelQuery(queryName)
    })
    .then(function(): void {
        xcConsole.log("query cancelled");
        res.send({log: "query cancel issued: " + queryName});
    })
    .fail(function(error: any): void {
        xcConsole.log("cancel query error: ", error);
        res.send(error);
    });
})

router.post("/deprecated/clean", [support.checkAuth], function(req, res) {
    let sessionPrefix: string = req.body.sessionId;
    let type: string = req.body.type;
    let checkTime: number = parseInt(req.body.checkTime);
    checkTime = isNaN(checkTime) ? undefined : checkTime;
    let srcId: string = "src" + sessionPrefix.replace(/-/g, "") + "_";
    let otherId: string = "sql" + sessionPrefix.replace(/-/g, "") + "_";
    let allIds: string[] = [];
    if (type === "select") {
        allIds.push(srcId);
    } else if (type === "other") {
        allIds.push(otherId);
    } else if (type === "all") {
        allIds.push(srcId);
        allIds.push(otherId);
    } else {
        res.status(500).send("Invalid type provided");
    }
    sqlManagerDeprecated.cleanAllTables(allIds, checkTime)
    .then(function(output: any): void {
        xcConsole.log("all temp and result tables deleted");
        res.send(output);
    })
    .fail(function(error: any): void {
        xcConsole.log("clean tables error: ", error);
        res.send("Some tables are not deleted because: " + JSON.stringify(error));
    });
})