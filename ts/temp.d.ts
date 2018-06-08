/**
 * XXX This for is for temp declare of the modules
 * that has not been rewritten to ts yet.
 * Please remove these delcaration after rewrite
 * is done
 */
/// <reference path="../3rd/bower_components/moment/moment.d.ts" />
/* ============== TYPES ======================== */
type XDPromise<T> = JQueryPromise<T>;
type XDDeferred<T> = JQueryDeferred<T>;
type TableId = string | number;
type XcCast = ColumnType | null;
type JoinType = JoinCompoundOperatorTStr | JoinOperatorT;
type HTML = string;


/* ============== INTERFACE ======================== */
interface PrefixColInfo {
    prefix: string;
    name: string;
}

interface TableIndexCache {
    tableName: string;
    keys: string[];
}


interface TableIndexResult {
    indexTable: string;
    indexKeys: string[];
    tempTables: string[];
    hasIndexed: boolean;
    isCache?: boolean;
}

interface SortColInfo {
    type?: ColumnType;
    colNum?: number;
    name: string;
    ordering: number;
}

interface ColRenameInfo {
    orig: string;
    new: string;
    type: DfFieldTypeT;
}

interface JoinTableInfo {
    columns: string[]; // array of back colum names to join
    casts?: XcCast[]; // array of cast types ["string", "boolean", null] etc
    pulledColumns?: string[]; // columns to pulled out (front col name)
    tableName: string; // table's name
    rename?: ColRenameInfo[]; // array of rename object
    allImmediates?: string[]; // array of all immediate names for collision resolution
    removeNulls?: boolean; // sql use
}

interface JoinOptions {
    newTableName?: string; // final table's name, optional
    clean?: boolean; // remove intermediate table if set true
    evalString?: string; // cross join filter's eval string
    existenceCol?: string;
}

interface AggColInfo {
    operator: string;
    aggColName: string;
    newColName: string;
    isDistinct?: boolean;
}

interface GroupByOptions {
    isIncSample?: boolean; // include sample or not
    sampleCols?: number[]; // sampleColumns to keep, only used when isIncSample is true
    icvMode?: boolean; // icv mode or not
    newTableName?: string; // dst table name, optional
    clean?: boolean; // remove intermediate table if set true
    groupAll?: boolean; // group by all rows to create single row if set true
}

interface UnionColInfo {
    name: string;
    rename: string;
    type: ColumnType;
    cast: boolean;
}

interface UnionTableInfo {
    tableName: string;
    columns: UnionColInfo[];
}

interface ExportTableOptions {
    splitType: string;
    headerType: string;
    format: string;
    createRule: string;
    handleName: string;
}

interface GetNumRowsOptions {
    useConstant: boolean;
    txId: number;
    colName: string;
    constantName: string;
}

interface GlobalKVKeySet {
    gEphStorageKey: string;
    gSettingsKey: string;
    gSharedDSKey: string;
}

interface UserKVKeySet {
    gUserKey: string;
    wkbkKey: string;
}

interface WkbkKVKeySet {
    gStorageKey: string;
    gLogKey: string;
    gErrKey: string;
    gOverwrittenLogKey: string;
    gAuthKey: string;
    gNotebookKey: string;
    gIMDKey: string;
}

interface UDFInfo {
    displayName: string;
    fnName: string;
}

interface SQLInfo {
    retName?: string,
    tableId?: TableId,
    srcTables?: string[],
    tableName?: string,
    lTableName?: string,
    rTableName?: string
}

interface XCThriftError {
    error: string
}

interface DFProgressData {
    pct: number,
    curOpPct: number,
    opTime: number,
    numCompleted: number
}

interface XcLogOptions {
    operation: string,
    func: string,
    retName?: string
}

interface DatepickerOptions {
    format?: string;
    weekStart?: number;
    startDate?: Date;
    endDate?: Date;
    autoclose?: boolean;
    startView?: number;
    todayBtn?: boolean;
    todayHighlight?: boolean;
    keyboardNavigation?: boolean;
    language?: string;
    dateFormat?: string,
    beforeShow?: Function
}
interface JQuery {
    datepicker(): JQuery;
    datepicker(methodName: string): JQuery;
    datepicker(methodName: string, params: any): JQuery;
    datepicker(options: DatepickerOptions): JQuery;
    sort(fn?: Function): JQuery;
}

interface LocalStorage {
    setItem(key: string, value: string): void;
    getItem(key: string): string | null;
    removeItem(key: string): string | null;
}

interface JQueryEventObject {
     keyTriggered: boolean;
 }

interface OpStatsDetails {
    numWorkCompleted: number,
    numWorkTotal: number
}
interface OpStatsOutput {
    opDetails: OpStatsDetails;
}
/* ============== GLOBAL VARIABLES ============= */
declare var nw: any; // nw js for XD CE
interface Window {
    FnBar: any;
    gMinModeOn: boolean;
    xcLocalStorage: any;
    xcSessionStorage: any;
}

declare var isBrowserIE: boolean;
declare var KB: number
declare var MB: number;
declare var GB: number;
declare var TB: number;
declare var PB: number;
declare var gNumEntriesPerPage: number;
declare var gMaxEntriesPerPage: number;
declare var gMinRowsPerScreen: number;
declare var gFirstRowPositionTop: number;
declare var gNewCellWidth: number;
declare var gPrefixLimit: number;
declare var gMouseEvents: MouseEvents;
declare var gMouseStatus: string;
declare var gRescol: object;
declare var gKVScope: {
    GLOB: number,
    USER: number,
    WKBK: number
};
declare var gTables: object;
declare var gOrphanTables: string[];
declare var gDroppedTables: object;
declare var gActiveTableId: TableId;
declare var gIsTableScrolling: boolean;
declare var gMinModeOn: boolean;
declare var gMutePromises: boolean;
declare var gAggVarPrefix: string;
declare var gColPrefix: string;
declare var gPrefixSign: string;
declare var gRetSign: string;
declare var gDSPrefix: string;
declare var gHiddenColumnWidth: number;
declare var gTurnOnPrefix: boolean;
declare var gUploadChunkSize: number;
declare var gDefaultSharedRoot: string;
declare var gJoinLookup: object;
declare var gExportNoCheck: boolean;
declare var gAlwaysDelete: boolean;
declare var gShowDroppedTablesImage: boolean;
declare var gDefaultQDelim: string;
declare var gLongTestSuite: number;
declare var gMaxDSColsSpec: number;
declare var gMaxColToPull: number;
declare var gMaxSampleSize: number;
declare var gUdfDefaultNoCheck: boolean;
declare var gSessionNoCleanup: boolean;
declare var gIcvMode: boolean;
declare var gEnableIndexStyle: boolean;
declare var gXcSupport: boolean;
declare var gCollab: boolean;
declare var gXcalarRecordNum: string;

declare var gBuildNumber: string;
declare var gGitVersion: number;
declare var XcalarApisTStr: object;
declare var StatusTStr: object;
declare var currentVersion: number;
declare var xcLocalStorage: XcStorage;
declare var xcSessionStorage: XcStorage;
declare var global: any;
declare var expHost: string;
declare var sqlMode: boolean;

declare var skRFPredictor: any;

declare var isBrowserSafari: boolean;
declare var isSystemMac: boolean;
/* ============== GLOBAL FUNCTIONS ============= */
declare function setSessionName(sessionName: string): void;
declare function getUnsortedTableName(tableName: string, otherTableName: string, txId: number, colsToIndex: string[]): XDPromise<string>;
declare function XcalarNewWorkbook(wkbkName: string, isCopy: boolean, copySrcName: string): XDPromise<void>;
declare function XcalarActivateWorkbook(wkbkName: string): XDPromise<void>;
declare function XcalarDownloadWorkbook(workbookName: string, jupyterFolderPath: string): XDPromise<any>;
declare function XcalarUploadWorkbook(workbookName: string, parsedWorkbookContent: any, jupyterFolderPath: string): XDPromise<void>;
declare function XcalarDeactivateWorkbook(workbookName: string): XDPromise<void>;
declare function XcalarRenameWorkbook(newName: string, srcName: string): XDPromise<void>
declare function XcalarDeleteWorkbook(workbookName: string): XDPromise<void>;
declare function XcalarQueryCancel(queryName: string): XDPromise<{}>;
declare function XcalarDownloadPython(fnName: string): XDPromise<any>;
declare function XcalarUploadPython(moduleName: string, pythonStr: string, absolutePath: boolean): XDPromise<void>;
declare function XcalarGetTables(tableName?: string): XDPromise<any>;
declare function XcalarGetDag(tableName: string, workbookName: string): XDPromise<any>;
declare function XcalarGetTableMeta(tableName: string): XDPromise<any>;
declare function XcalarAggregate(evalStr: string, dstAggName: string, tableName: string, txId: number): XDPromise<string>;
declare function XcalarApiTop(measureIntervalInMs?: any): XDPromise<any>;
declare function XcalarCancelOp(dstTableName: string, statusesToIgnore?: number[]): XDPromise<any>;
declare function XcalarDeleteTable(tableName: string, txId?: number, isRetry?: boolean): XDPromise<void>;
declare function XcalarDestroyDataset(dsName: string, txId: number): XDPromise<any>;
declare function XcalarExport(tableName: string, exportName: string, targetName: string, numCols: number, backColumns: string[], frontColumns: string[], keepOrder: boolean, options: ExportTableOptions, txId: number): XDPromise<void>;
declare function XcalarExportRetina(retinaName: string): XDPromise<any>;
declare function XcalarFetchData(resultSetId: string, rowPosition: number, rowsToEach: number, totalRows: number, data: string[], tryCnt: number, maxNumRowsPerCall: number): XDPromise<string[]>;
declare function XcalarFilter(fltStr: string, tableName: string, newTableName: string, txId: number): XDPromise<any>;
declare function XcalarGenRowNum(tableName: string, newTableName: string, newColName: string, txId: number): XDPromise<void>;
declare function XcalarGetLicense(): XDPromise<any>;
declare function XcalarGetMemoryUsage(username: string, userId: number): XDPromise<any>;
declare function XcalarGetOpStats(dstTable: string): XDPromise<any>;
declare function XcalarGetStatGroupIdMap(nodeId: number, numGroupId: number): XDPromise<any>;
declare function XcalarGetTableCount(tableName: string): XDPromise<number>;
declare function XcalarGetTableMeta(tableName: string): XDPromise<any>;
declare function XcalarGetTables(): XDPromise<any>;
declare function XcalarGetVersion(connectionCheck: boolean): XDPromise<any>;
declare function XcalarGroupBy(operators: string[], newColNames: string[], aggColNames: string[], tableName: string, newTableName: string, incSample: boolean, icvMode: boolean, newKeyFieldName: string, groupAll: boolean, txId: number): XDPromise<any>;
declare function XcalarGroupByWithEvalStrings(newColNames: string[], evalStrs: string[], tableName: string, newTableName: string, incSample: boolean, icvMode: boolean, newKeyFieldName: string, groupAll: boolean, txId: number): XDPromise<any>;
declare function XcalarIndexFromDataset(dsName: string, indexCol: string, newTableName: string, prefix: string, txId: number): XDPromise<void>;
declare function XcalarIndexFromTable(tableName: string, keyInfos: object[], newTableName: string, txId: number): XDPromise<any>
declare function XcalarJoin(lTable: string, rTable: string, newTableName: string, joinType: number, lRename: ColRenameInfo[], rRename: ColRenameInfo[], joinOptions: object, txId: number): XDPromise<any>;
declare function XcalarKeyAppend(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeyDelete(key: string, scope: number): XDPromise<any>;
declare function XcalarKeyLookup(key: string, scope: number): XDPromise<any>;
declare function XcalarKeyPut(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeySetIfEqual(scope: number, persist: boolean, keyCompare: string, oldValue: string, newValue: string): XDPromise<any>;
declare function XcalarListFiles(args: object): XDPromise<any>;
declare function XcalarListPublishedTables(pattern: string): XDPromise<any>;
declare function XcalarListWorkbooks(pattern: string): XDPromise<any>;
declare function XcalarListXdfs(fnNamePattern: string, categoryPattern: string): XDPromise<any>;
declare function XcalarLoad(dsName: string, options: object, txId: number): XDPromise<void>;
declare function XcalarMakeResultSetFromTable(tableName): XDPromise<any>;
declare function XcalarMap(colNames: string[], mapStrs: string[], tableName: string, newTableName: string, txId: number, doNotUnsort?: boolean, icvMode?: boolean): XDPromise<string>;
declare function XcalarProject(columns: string[], tableName: string, newTableName: string, txId: number): XDPromise<any>;
declare function XcalarQueryCancel(queryName: string, statusesToIgnore?: number[]): XDPromise<any>;
declare function XcalarQueryState(queryName: string): XDPromise<any>;
declare function XcalarQueryWithCheck(queryName: string, queryStr: string, txId: number, bailOnError: boolean): XDPromise<any>;
declare function XcalarRefreshTable(pubTableName: string, dstTableName: string, minBatch: number, maxBatch: number, txId: number): XDPromise<any>;
declare function XcalarRenameTable(oldTableName: string, newTableName: string, txId: number): XDPromise<void>;
declare function XcalarRestoreTable(tableName: string): XDPromise<any>;
declare function XcalarSaveWorkbooks(wkbkName: string): XDPromise<void>;
declare function XcalarSetFree(resultSetId: string): XDPromise<void>;
declare function XcalarSynthesize(tableName: string, newTableName: string, colInfos: ColRenameInfo[], txId: number): XDPromise<any>;
declare function XcalarTargetCreate(targetType: string, targetName: string, targetParams: object[]): XDPromise<void>;
declare function XcalarTargetDelete(targetName: string): XDPromise<void>;
declare function XcalarUnion(tableNames: string[], newTableNmae: string, colInfos: object[], dedup: boolean, unionType: UnionOperatorT, txId: number): XDPromise<any>;
declare function XcalarUnpublishTable(tableName: string): XDPromise<any>;
declare function XcalarRefreshTable(pubTableName: string, dstTableName: string, minBatch: number, maxBatch: number, txId: number): XDPromise<any>;
declare function XcalarApiTop(measureIntervalInMs?: any): XDPromise<any>;
declare function XcalarGetStatGroupIdMap(nodeId: number, numGroupId: number): XDPromise<any>;
declare function XcalarExportRetina(retinaName: string): XDPromise<any>;
declare function XcalarQueryState(queryName: string): XDPromise<any>;
declare function XcalarGetMemoryUsage(username: string, userId: number): XDPromise<any>;
declare function XcalarQueryCancel(queryName: string, statusesToIgnore?: number[]): XDPromise<any>;
declare function XcalarCancelOp(dstTableName: string, statusesToIgnore?: number[]): XDPromise<any>;
declare function XcalarDestroyDataset(dsName: string, txId: number): XDPromise<any>;
declare function XcalarCoalesce(tableName: string): XDPromise<any>;
declare function getUnsortedTableName(tableName: string, otherTableName: string, txId: number, colsToIndex: string[]): XDPromise<string>;
declare function setSessionName(sessionName: string): void;
/* ============= THRIFT ENUMS ================= */
declare enum DfFieldTypeT {
    DfString,
    DfInt32,
    DfInt64,
    DfUInt32,
    DfUInt64,
    DfFloat32,
    DfFloat64,
    DfBoolean,
    DfUnknown,
    DfFatptr,
}

declare enum XcalarApiKeyScopeT {
    XcalarApiKeyScopeGlobal,
    XcalarApiKeyScopeSession
}

declare enum XcalarApisT {
    XcalarApiJoin = 15,
    XcalarApiBulkLoad = 2,
    XcalarApiExport = 33
}

declare enum StatusT {
    StatusCanceled,
    StatusAlreadyIndexed,
    StatusCannotReplaceKey,
    StatusSessionUsrAlreadyExists,
    StatusDsODBCTableExists,
    StatusExist,
    StatusExportSFFileExists,
    StatusSessionNotFound,
    StatusKvEntryNotEqual,
    StatusOperationHasFinished,
    StatusQrQueryNotExist,
    StatusDagNodeNotFound
}

declare enum FunctionCategoryT {
    FunctionCategoryAggregate
}

declare enum FunctionCategoryTStr {}

declare enum DgDagStateT {
    DgDagStateReady,
    DgDagStateDropped,
    DgDagStateError,
    DgDagStateProcessing
}
declare enum DgDagStateTStr {}

declare enum CsvSchemaModeT {
    CsvSchemaModeNoneProvided
}

declare var XcalarOrderingTStr: object;
declare enum XcalarOrderingT {
    XcalarOrderingUnordered,
    XcalarOrderingInvalid,
    XcalarOrderingAscending,
    XcalarOrderingDescending
}

declare namespace XcalarApisConstantsT {
    export var XcalarApiMaxTableNameLen: number;
    export var XcalarApiMaxFieldNameLen: number;
}

declare enum JoinOperatorTStr {
    LeftAntiSemiJoin = 'Left Anti Semi Join'
}

// Order doesn't matter since this is just a header file.
declare enum JoinOperatorT {
    InnerJoin,
    LeftOuterJoin,
    RightOuterJoin,
    FullOuterJoin,
    CrossJoin
}

declare enum UnionOperatorT {
    UnionStandard,
    UnionIntersect,
    UnionExcept
}

declare enum XcalarApiVersionTStr{}
declare enum XcalarApiVersionT{
    XcalarApiVersionSignature
}

declare enum QueryStateT{
    qrNotStarted,
    qrProcessing,
    qrFinished,
    qrError,
    qrCancelled
}

declare enum QueryStateTStr {

}
/* ============= JSTSTR ==================== */
declare namespace DSTStr {
    export var UnknownUser: string;
    export var UnknownId: string;
    export var DS: string;
}

declare namespace CommonTxtTstr {
    export var Immediates: string;
    export var CopyLog: string;
    export var GenTicket: string;
    export var LogOut: string;
    export var NA: string;
    export var Upgrading: string;
    export var Back: string;
    export var HighXcalarMemUsage: string;
    export var XcalarMemUsage: string;
    export var OpFail: string;
    export var StartTime: string;
    export var HoldToDrag: string;
    export var Preview: string;
    export var NoResult: string;
}

declare namespace ExtTStr {
    export var XcCategory: string;
}

declare namespace IndexTStr {
    export var Sorted: string;
    export var SortedErr: string;
}

declare namespace StatusMessageTStr {
    export var ActionSuccess: string;
    export var ActionFailed: string;
    export var Loading: string;
    export var Completed: string;
    export var Error: string;
    export var EditingDF: string;
    export var Viewing: string;
    export var FilterFailed: string;
    export var Aggregate: string;
    export var OnColumn: string;
    export var Filter: string;
    export var AggregateFailed: string;
    export var Sort: string;
    export var SortFailed: string;
    export var Join: string;
    export var JoinFailed: string;
    export var Union: string;
    export var UnionFailed: string;
    export var GroupBy: string;
    export var GroupByFailed: string;
    export var Map: string;
    export var MapFailed: string;
    export var ExportTable: string;
    export var ExportFailed: string;
    export var Project: string;
    export var ProjectFailed: string;
    export var PleaseWait: string;
    export var Canceling: string;
    export var CurrReplay: string;
    export var CompReplay: string;
}

declare namespace ExportTStr {
    export var SuccessInstr: string;
    export var FolderName: string;
    export var TargetName: string;
    export var Success: string;
}

declare namespace TooltipTStr {
    export var ToGridView: string;
    export var ToListView: string;
    export var CopyLog: string;
    export var GenTicket: string;
    export var CancelQuery: string;
    export var CannotDropLocked: string;
    export var ViewAllWS: string;
    export var Saved: string;
    export var CloseQG: string;
    export var OpenQG: string;
    export var OnlyInOpMode: string;
    export var LowMemInDS: string;
    export var LowMemInTable: string;
    export var SystemGood: string;
    export var SysOperation: string;
    export var RemoveQuery: string;
    export var FocusColumn: string;
    export var CancelSearch: string;
}

declare namespace SuccessTStr{
    export var Copy: string;
}

declare namespace MonitorTStr {
    export var SupportTools: string;
    export var Monitor: string;
    export var LowMemInstr: string;
    export var LowMem: string;
    export var LowMemMsg: string;
}

declare namespace AggTStr {
    export var AggTitle: string;
    export var AggInstr: string;
    export var AggName: string;
    export var AggMsg: string;
}

declare namespace ErrTStr {
    export var InUsedNoDelete: string;
    export var InvalidField: string;
    export var InvalidTableName: string;
    export var LicenseExpire: string;
    export var NameInUse: string;
    export var NoEmpty: string;
    export var NoEmpty: string;
    export var NoSpecialCharOrSpace: string;
    export var OutputNotFoundMsg: string;
    export var InvalidWBName: string;
    export var WorkbookExists: string;
    export var NoWKBKErr: string;
    export var MultipleWKBKErr: string;
    export var ParamInUse: string;
    export var PrefixStartsWithLetter: string;
    export var PrefixTooLong: string;
    export var PreservedName: string;
    export var SelectOption: string;
    export var TooLong: string;
    export var Unknown: string;

}

declare namespace ErrWRepTStr {
    export var SystemParamConflict: string;
    export var ParamConflict: string;
    export var OutputNotFound: string;
    export var OutputNotExists: string;
    export var LargeFileUpload: string;
}

declare namespace ColTStr {
    export var RenameStartInvalid: string;
    export var LongName: string;
    export var ColNameInvalidCharSpace: string;
    export var ColNameInvalidChar: string;
    export var RenameSpecialChar: string;
    export var NoOperateArray: string;
    export var NoOperateObject: string;
    export var NoOperateGeneral: string;
}

declare namespace AlertTStr {
    export var CANCEL: string;
    export var NoConnectToServer: string;
    export var UserOverLimit: string;
    export var UserOverLimitMsg: string;
    export var LicenseErr: string;
    export var LicenseErrMsg: string;
    export var NoConnect: string;
    export var Connecting: string;
    export var TryConnect: string;
    export var Title: string;
    export var CLOSE: string;
    export var ErrorMsg: string;
    export var CONFIRM: string;
}

declare namespace ThriftTStr {
    export var Update: string;
    export var CCNBE: string;
    export var CCNBEErr: string;
    export var SetupErr: string;
}

declare namespace FailTStr {
    export var RmPublishedTable: string;
}

declare namespace WSTStr {
    export var Ws: string;
}

declare namespace DFTStr {
    export var BatchDF: string;
    export var DownloadErr: string;
    export var DFDrawError: string;
}

declare namespace JupyterTStr {
    export var JupNotebook: string;
    export var NoSnippetOtherWkbk: string;
}

declare namespace IMDTStr {
    export var DelTable: string;
    export var DelTableMsg: string;
    export var Activating: string;
}

declare namespace WKBKTStr {
    export var Hold: string;
    export var HoldMsg: string;
    export var Release: string;
    export var Expire: string;
    export var ExpireMsg: string;
    export var WaitActivateFinish: string;
    export var NoActive: string;
    export var Updating: string;
    export var Creating: string;
    export var Delete: string;
    export var DeleteMsg: string;
    export var Deactivate: string;
    export var DeactivateMsg: string;
    export var NewWKBKInstr: string;
    export var CurWKBKInstr: string;
    export var CreateErr: string;
    export var Activate: string;
    export var ActivateInstr: string;
    export var SwitchWarn: string;
    export var Conflict: string;
    export var ReturnWKBK: string;
    export var Inactive: string;
    export var Delete: string;
    export var MoreActions: string;
    export var WS: string;
    export var State: string;
    export var Active: string;
    export var NoMeta: string;
    export var NoWkbk: string;
    export var Refreshing: string;
    export var DeactivateErr: string;
    export var DelErr: string;
    export var CancelTitle: string;
    export var CancelMsg: string;
    export var WkbkNameRequired: string;
}

declare namespace TblTStr {
    export var ActiveStatus: string;
    export var TempStatus: string;
}

declare namespace UDFTStr {
    export var DelTitle: string;
    export var DelMsg: string;
    export var Edit: string;
    export var View: string;
    export var Download: string;
    export var Del: string;
    export var MyUDFS: string;
    export var MYOTHERUDFS: string;
    export var OtherUDFS: string;
    export var DFUDFS: string;
}

declare namespace UploadTStr {
    export var InvalidUpload: string;
    export var InvalidFolderDesc: string;
    export var OneFileUpload: string;
}

declare namespace TimeTStr {
    export var Created: string;
    export var LastSaved: string;
}
// declare namespace WSTStr {
//     export var Ws:
// }

/* ============== CLASSES ====================== */

declare class ColFunc {
    public name: string;
    public args: any[];
}

declare class ProgCol {
    constructor(options: object);
    public type: string;
    public name: string;
    public backName: string;
    public width: number;
    public sizedTo: string;
    public immediate: boolean;
    public prefix: string;
    public userStr: string;
    public func: ColFunc;
    public isDATACol(): boolean;
    public isEmptyCol(): boolean;
    public getFrontColName(includePrefix: boolean): string;
    public isKnownType(): boolean;
    public getFormat(): string;
    public getType(): ColumnType;
    public getBackColName(): string;
}

declare class TableMeta {
    public tableName: string;
    public tableCols: ProgCol[];
    public backTableMeta: any;
    public highlightedCells: object;
    public getAllCols(onlyValid?: boolean): ProgCol[]
    public getCol(colNum: number): ProgCol;
    public hasCol(colName: string, prefix: string): boolean;
    public hasColWithBackName(colName: string): boolean;
    public getKeys(): object[];
    public getOrdering(): number;
    public getIndexTable(colNames: string[]): TableIndexCache;
    public removeIndexTable(colNames: string[]): void;
    public setIndexTable(colNames: string[], newTableName: string, newKeys: string[]): void;
    public getColNumByBackName(name: string): number;
    public getName(): string;
    public hasLock(): boolean;
}

declare class XcStorage {
    public getItem(key: string): string;
    public setItem(key: string, value: string): boolean;
    public removeItem(key: string): boolean;
}

declare class WKBK {
    public name: string;
    public id: string;
    public modified: string;
    public sessionId: string;
    public numWorksheets: number;
    public jupyterFolder: string;
    public description: string;
    public created: string;
    public srcUser: string;
    public curUser: string;
    public resource: boolean;
    public getName(): string;
    public getDescription(): string;
    public getCreateTime(): string;
    public getModifyTime(): string;
    public getNumWorksheets(): number;
    public isNoMeta(): boolean;
    public hasResource(): boolean;
    public getId(): string;
    public update(): void;
    public setSessionId(sessionId: string): void;
    public setResource(resource: boolean): void;
    public constructor(params: object);
}

declare class WorksheetObj {
}

declare class WSMETA {
    public constructor();
    public wsInfos: Set<WorksheetObj>
}

declare class METAConstructor {
    public constructor(meta: object);
    public update(): void;
    public getQueryMeta(): QueryManager.XcQueryAbbr[];
    public getWSMeta(): WSMETA;
    public getTpfxMeta(): object;
    public getAggMeta(): object;
    public getTableMeta(): object;
    public getCartMeta(): object;
    public getStatsMeta(): object;
    public getLogCMeta(): number;
}

declare class EMetaConstructor {
    public constructor(meta: object);
    public update(): void;
}

declare class UserInfoConstructor {
    public gDSObj: string;
    public constructor(meta?: object);
    public getMetaKeys(): {DS: 'gDSObj'};
}

declare class XcAuth {
    constructor(options: object);
    getIdCount(): number;
    incIdCount(): void;
}

declare class KVVersion {
    public version: number;
    public stripEmail: boolean;
    public needCommit: boolean;
    public constructor(options: object);
}

declare class XcQuery {
    public state: QueryStatus | QueryStateT;
    public sqlNum: number;
    public queryStr: string;
    public name: string;
    public fullName: string;
    public time: number;
    public elapsedTime: number;
    public opTime: number;
    public opTimeAdded: boolean;
    public outputTableName: string;
    public outputTableState: string;
    public error: string;
    public subQueries: XcSubQuery[];
    public currStep: number;
    public numSteps: number;
    public type: string;
    public cancelable: boolean;
    public id: number;
    public srcTables: string[];

    public constructor(options: object);
    public getState(): QueryStatus | QueryStateT;
    public getOpTime(): number;
    public getOutputTableName(): string;
    public getName(): string;
    public addSubQuery(XcSubQuery);
    public getQuery(): string;
    public setElapsedTime(): void;
    public getTime(): number;
    public getElapsedTime(): number;
    public setOpTime(number): void;
    public addOpTime(number): void;
    public getId(): number;
    public getAllTableNames(force?: boolean): string[];
    public addIndexTable(tableName: string): void;
    public getIndexTables(): string[];
    public getOutputTableState(): string;
}

declare class XcLog {
    public options: XcLogOptions;
    public cli: string;
}

declare class d3 {
    public select(selector: string): d3;
    public selectAll(selector: string): d3;
    public data(callback: Function);
    public transition(): d3;
    public interpolateNumber(num: number, step: number): Function;
    public duration(time: number): d3;
    public ease(type: string): d3;
    public tween(type: string, callback: Function): d3;
    public append(selector: string): d3;
    public attr(options: object | string, options2?: string): d3;
}

/* ============== NAMESPACE ====================== */
declare namespace xcManager {
    export function removeUnloadPrompt(markUser: boolean): void;
    export function setup(): XDPromise<void>;
    export function unload();
    export function isStatusFail(): boolean;
}

declare namespace UserSettings {
    export function getPref(prop: string): any;
    export function commit(): XDPromise<void>;
    export function restore(oldMeta: UserInfoConstructor, gInfosSetting: object): XDPromise<void>;
    export function sync(): void;
    export function setPref(name: string, val: string | number, something?: boolean): void;
}

declare namespace ColManager {
    export function newCol(colInfo: object): ProgCol;
    export function newDATACol(): ProgCol;
    export function newPullCol(frontName: string, backName?: string, type?: ColumnType): ProgCol;
}

declare namespace Admin {
    export function showSupport();
    export function updateLoggedInUsers(userInfos: object): void;
    export function isAdmin(): boolean;
}

declare namespace PromiseHelper {
    export function deferred<T>(): XDDeferred<T>;
    export function reject<T>(...args): XDPromise<T>;
    export function resolve<T>(...args): XDPromise<T>;
    export function alwaysResolve<T>(...args): XDPromise<T>;
    export function when<T>(...args): XDPromise<T>;
    export function chain<T>(...args): XDPromise<T>;
}

declare namespace Log {
    export function getAllLogs(): object[];
    export function getErrorLogs(): XcLog[];
    export function getLogs(): XcLog[];
    export function getLocalStorage(): string;
    export function getBackup(): string;
    export function commit(): XDPromise<void>;
    export function restore(oldLogCursor: number): void;
    export function upgrade(oldLog: string): string;
    export function hasUncommitChange(): boolean;
    export function lockUndoRedo(): void;
    export function unlockUndoRedo(): void;
    export function backup(): void;
    export function add(title: string, options: object | null, cli: string, willCommit: boolean): void;
    export function getCursor(): number;
    export function errorLog(title: string, sql: object, cli: string, error: string);
}

declare namespace SupTicketModal {
    export function show(): void;
}

declare namespace EULAModal {
    export function show(): XDPromise<void>;
}

declare namespace MonitorGraph {
    export function stop(): void;
    export function tableUsageChange(): void;
}

declare namespace TblFunc {
    export function moveTableTitles(): void;
    export function focusTable(tableId: TableId): void;
    export function hideOffScreenTables(options: object): void;
    export function moveTableTitles($tableWraps: JQuery | null, options: object): void;
    export function unhideOffScreenTables(): void;
    export function hideOffScreenTables(): void;
}

declare namespace TableList {
    export function lockTable(tableId: TableId): void;
    export function unlockTable(tableId: TableId): void;
    export function refreshConstantList(): void;
    export function refreshOrphanList(prettyPrint: boolean): XDPromise<void>;
    export function removeTable(tableIdOrName: TableId | string, type?: string, lock?: boolean): void;
    export function addToCanceledList(tableName: string): void;
    export function removeFromCanceledList(tableName: string): void;
}

declare namespace TblManager {
    export function alignTableEls(): void;
    export function unHighlightCells(): void;
    export function restoreTableMeta(oldMeat: object): void;
    export function setOrphanTableMeta(tableName: string, tableCols: ProgCol[]): void;
    export function refreshTable(newTableNames: string[], tableCols: ProgCol[], oldTableNames: string[], worksheet: string, txId: number, options: object): XDPromise<void>;
    export function updateHeaderAndListInfo(tableId: TableId): void;
    export function deleteTables(tables: TableId[], tableType: string, noAlert?: boolean, noLog?: boolean, options?: object);
    export function findAndFocusTable(tableName: string, noAnimate?: boolean): XDPromise<any>;
    export function freeAllResultSetsSync(): XDPromise<void>;
}

declare namespace TblMenu{
    export function showDagAndTableOptions($menu: JQuery, tableId: string | number): void;
    export function updateExitOptions(id: string, name?: string): void;
}

declare namespace TPrefix {
    export function restore(oldMeat: object): void;
}

declare namespace Aggregates {
    export function restore(oldMeat: object): void;
    export function getAgg(tableId: TableId, backColName: string, aggrOp: string): any
    export function addAgg(aggRes: object, isTemp: boolean): void;
}

declare namespace MainMenu {
    export function getOffset(): number;
    export function openPanel(panelId: string, subTabId: string, options?: object): void;
    export function tempNoAnim(): void;
    export function close(noAnim: boolean): void;
    export function setFormOpen(): void;
    export function setFormClose(): void;
    export function isMenuOpen(type: string): boolean;
    export function open(noAnim?: boolean): void;
    export function getState(): object;
    export function restoreState(state: object, ignoreClose?: boolean): void;
}

declare namespace BottomMenu {
    export function unsetMenuCache(): void;
    export function close(something: boolean): void;
}

declare namespace WSManager {
    export function lockTable(tableId: TableId): void;
    export function unlockTable(tableId: TableId): void;
    export function getWSFromTable(tableId: TableId): string;
    export function getActiveWS(): string;
    export function switchWS(wsId: string): void;
    export function indexOfWS(ws: string): number;
    export function getWSList(): string[];
    export function getNumOfWS(): number;
    export function getTableRelativePosition(tableId: TableId): number;
    export function getWorksheets(): object;
    export function getWSLists(isAll: boolean): string;
    export function getWSName(ws: string): string;
    export function restore(oldMeat: object): void;
    export function focusOnWorksheet(ws?: string, something?: boolean): void;
    export function addWS(wsId: string, wsName: string, wsIndex?: number): string;
    export function getAllMeta(): WSMETA;
}

declare namespace Dag {
    export function addEventListeners($dagWrap: JQuery): void;
}

declare namespace DagDraw {
    export function createDagImage(node: any, $dagWrap: JQuery): void;
}

declare namespace Dag {
    export function renameAllOccurrences(oldTableName: string, newTableName: string): void;
}

declare namespace DagPanel {
    export function adjustScrollBarPositionAndSize(): void;
    export function updateExitMenu(name?: string): void;
}

declare namespace DagEdit {
    export function isEditMode(): boolean;
    export function exitForm(): void;
}

declare namespace DataflowPanel {
    export function refresh(dfName: string): void;
}

declare namespace DS {
    export function getGrid(dsId: string): JQuery;
    export function updateDSInfo(arg: object): void;
    export function upgrade(oldDS: object): object;
    export function cancel($grid: JQuery): XDPromise<any>;
    export function restore(oldHomeFolder: object, atStartup?: boolean): XDPromise<any>;
    export function getHomeDir(toPersist?: boolean): object;
    export function getDSObj(dsId: number | string): DSObj | null;
    export function goToDir(foldderId: string): void;
    export function focusOn($grid: JQuery): XDPromise<any>;

    interface DSObj {
        parentId: string
    }
}

declare namespace DSCart {
    export function restore(oldMeat: object): void;
    export function queryDone(id: number, isCancel?: boolean): void;
    export function addQuery(XcQuery);
}

declare namespace Profile {
    export function restore(oldMeat: object): void;
    export function copy(tableId: TableId, newTableId: TableId): void;
}

declare namespace DF {
    export function wasRestored(): boolean;
    export function getDataflow(dfName: string): any;
    export function getParamMap(): object;
    export function updateParamMap(paramMap: object): void;
}

declare namespace DFCard {
    export function adjustScrollBarPositionAndSize(): void;
    export function getCurrentDF(): string;
    export function cancelDF(retName: string, txId: number): XDPromise<any>;
    export function getProgress(queryName: string): DFProgressData;

}

declare namespace JupyterUDFModal {
    export function show(type: string): void;
}

declare namespace JupyterPanel {
    export function appendStub(stubName: string, args?: object): void;
    export function newWorkbook(workbookName: string): XDPromise<string>;
    export function renameWorkbook(jupyterFolder: string, newName: string): XDPromise<string>;
    export function deleteWorkbook(workbookId: string): void;
    export function updateFolderName(newFoldername: string): void;
    export function copyWorkbook(oldJupyterFolder: string, newJupyterFolder: string): void;
}

declare namespace UDF {
    export function refreshWithoutClearing(overWriteUDF: boolean): void;
    export function getCurrWorkbookPath(): string;
    export function edit(modulePath: string): void;
    export function download(moduleName: string): XDPromise<void>;
    export function del(moduleName: string): XDPromise<void>;
    export function refresh(): XDPromise<void>;
    export function getDefaultUDFPath(): string;
    export function getUDFs(): any;
}

declare namespace DSExport {
    export function refresh(): void;
}

declare namespace SQLApi {
    export function getIndexTable(tableName: string, colNames: string[]): TableIndexCache;
    export function cacheIndexTable(tableName: string, colNames: string[], newTableName: string, newKeys: string[]): void;
}

declare namespace DeleteTableModal {
    export function show();
}

declare namespace MonitorPanel {
    export function inActive(): void;
    export function active(): void;
    export function isGraphActive(): boolean;
}

declare namespace MonitorConfig {
    export function refreshParams(firstTouch: boolean): XDPromise<{}>;
}
declare namespace DFCreateView {
    export function updateTables(tableId: TableId, something: boolean);
}
declare namespace ProjectView {
    export function updateColumns(): void;
}
declare namespace OperationsView {
    export function updateColumns(): void;
}
declare namespace JoinView {
    export function updateColumns(): void;
}
declare namespace ExportView {
    export function updateColumns(): void;
}
declare namespace SmartCastView {
    export function updateColumns(tableId: TableId): void;
}
declare namespace UnionView {
    export function updateColumns(tableId: TableId): void;
}
declare namespace SortView {
    export function updateColumns(tableId: TableId): void;
}
declare namespace FnBar {
    export function clear(): void;
}

declare namespace d3 {
    export function interpolate(current: any, a: any);
    export function interpolateNumber(num: number, step: number): Function;
    export function select(selector: string): d3;
    export function transition(): d3;
    export function duration(): d3;
    export function append(selector: string): d3;
    export var svg;
    export var layout;

}
