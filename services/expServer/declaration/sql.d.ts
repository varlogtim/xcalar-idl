declare enum SQLStatus {
    Compiling = "Compiling",
    Running = "Running",
    Done = "Done",
    Cancelled = "Cancelled",
    Failed = "Failed",
    None = "None",
    Interrupted = "Interrupted"
}

declare enum SQLColumnType {
    "String" = "string",
    "Money" = "money",
    "Float" = "float",
    "Integer" = "int",
    "Boolean" = "bool",
    "Timestamp" = "timestamp"
}

interface SQLOptimizations {
    dropAsYouGo: boolean,
    randomCrossJoin: boolean,
    pushToSelect: boolean,
    dropSrcTables?: boolean,
    noOptimize?: boolean,
    deleteCompletely?: boolean,
    dedup?: boolean,
    combineProjectWithSynthesize?: boolean
}

interface SQLQueryInput {
    userName?: string,
    userId?: number,
    sessionName?: string,
    resultTableName?: string,
    queryString?: string,
    tablePrefix?: string,
    queryName?: string,
    optimizations?: SQLOptimizations,
    usePaging?: boolean,
    checkTime?: number,
    rowsToFetch?: number,
    execid?: number,
    limit?: any
}

interface SQLHistoryObj {
    queryId: string,
    status: SQLStatus,
    queryString?: string,
    startTime?: Date,
    endTime?: Date,
    tableName?: string
}

interface SQLWorkerData {
    sqlQueryObj: any,
    selectQuery: any,
    allSelects: any,
    params: SQLQueryInput,
    type: string
}

interface SQLAddPrefixReturnMsg {
    query: string,
    tableName: string
}

interface SQLColumn {
    colName?: string,
    colId?: number,
    rename?: string,
    colType?: SQLColumnType,
    udfColName?: string
}

interface SQLResult {
    tableName: string,
    columns: SQLColumn[]
}

interface SQLLoadInput {
    importTable: string,
    dsArgs: {
        url?: string;
        isRecur?: boolean;
        format?: string;
        maxSampleSize?: number;
        skipRows?: number;
        pattern?: string;
        targetName?: string;
    }
    formatArgs: {
        format?: string;
        fieldDelim?: string;
        recordDelim?: string;
        schemaMode?: number;
        quoteChar?: string;
        typedColumns?: object[];
        moduleName?: string;
        funcName?: string;
        udfQuery?: string;
    }
    txId: number,
    sqlDS: string
}

interface SQLLoadReturnMsg {
    tableName: string,
    xcTableName: string,
    schema: any
}

interface SQLPublishInput {
    importTable: string,
    publishName: string,
    txId?: number,
    sqlTable?: string,
    sessionInfo?: SessionInfo
}

interface SQLPublishReturnMsg {
    table: string,
    xcTableName: string,
    schema: any
}

interface SessionInfo {
    userName: string,
    userId: number,
    sessionName: string
}

interface XDTableInfo {
    pubTableName: string,
    tableName: string,
    isIMD: boolean,
    query?: XcalarSelectQuery,
    schema?: any,
    found?: boolean
}

interface TableInfo extends XcalarApiTableInfo {
    schema?: any
}