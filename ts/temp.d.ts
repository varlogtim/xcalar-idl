/**
 * XXX This for is for temp declare of the modules
 * that has not been rewritten to ts yet.
 * Please remove these delcaration after rewrite
 * is done
 */

/* ============== TYPES ======================== */
type XDPromise<T> = JQueryPromise<T>;
type XDDeferred<T> = JQueryDeferred<T>;
type TableId = string | number;
type XcCast = ColumnType | null;
type JoinType = JoinCompoundOperatorTStr | JoinOperatorT;

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
/* ============== GLOBAL VARIABLES ============= */
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
declare var global: any;
declare var expHost: string;
declare var sqlMode: boolean;

/* ============== GLOBAL FUNCTIONS ============= */
declare function setSessionName(sessionName: string): void;
declare function getUnsortedTableName(tableName: string, otherTableName: string, txId: number, colsToIndex: string[]): XDPromise<string>;
declare function XcalarGetTables(): XDPromise<any>;
declare function XcalarGetTableMeta(tableName: string): XDPromise<any>;
declare function XcalarDeleteTable(tableName: string, txId: number): XDPromise<void>;
declare function XcalarFilter(fltStr: string, tableName: string, newTableName: string, txId: number): XDPromise<any>;
declare function XcalarKeyLookup(key: string, scope: number): XDPromise<any>;
declare function XcalarKeyPut(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeyAppend(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeyDelete(key: string, scope: number): XDPromise<any>;
declare function XcalarSaveWorkbooks(wkbkName: string): XDPromise<void>;
declare function XcalarListXdfs(fnNamePattern: string, categoryPattern: string): XDPromise<any>;
declare function XcalarAggregate(evalStr: string, dstAggName: string, tableName: string, txId: number): XDPromise<string>;
declare function XcalarLoad(dsName: string, options: object, txId: number): XDPromise<void>;
declare function XcalarIndexFromDataset(dsName: string, indexCol: string, newTableName: string, prefix: string, txId: number): XDPromise<void>;
declare function XcalarIndexFromTable(tableName: string, keyInfos: object[], newTableName: string, txId: number): XDPromise<any>
declare function XcalarMap(colNames: string[], mapStrs: string[], tableName: string, newTableName: string, txId: number, doNotUnsort?: boolean, icvMode?: boolean): XDPromise<string>;
declare function XcalarJoin(lTable: string, rTable: string, newTableName: string, joinType: number, lRename: ColRenameInfo[], rRename: ColRenameInfo[], joinOptions: object, txId: number): XDPromise<any>;
declare function XcalarGroupByWithEvalStrings(newColNames: string[], evalStrs: string[], tableName: string, newTableName: string, incSample: boolean, icvMode: boolean, newKeyFieldName: string, groupAll: boolean, txId: number): XDPromise<any>;
declare function XcalarGroupBy(operators: string[], newColNames: string[], aggColNames: string[], tableName: string, newTableName: string, incSample: boolean, icvMode: boolean, newKeyFieldName: string, groupAll: boolean, txId: number): XDPromise<any>;
declare function XcalarUnion(tableNames: string[], newTableNmae: string, colInfos: object[], dedup: boolean, unionType: UnionOperatorT, txId: number): XDPromise<any>;
declare function XcalarProject(columns: string[], tableName: string, newTableName: string, txId: number): XDPromise<any>;
declare function XcalarQueryWithCheck(queryName: string, queryStr: string, txId: number, bailOnError: boolean): XDPromise<any>;
declare function XcalarExport(tableName: string, exportName: string, targetName: string, numCols: number, backColumns: string[], frontColumns: string[], keepOrder: boolean, options: ExportTableOptions, txId: number): XDPromise<void>;
declare function XcalarGenRowNum(tableName: string, newTableName: string, newColName: string, txId: number): XDPromise<void>;
declare function XcalarGetTableCount(tableName: string): XDPromise<number>;
declare function XcalarMakeResultSetFromTable(tableName): XDPromise<any>;
declare function XcalarFetchData(resultSetId: string, rowPosition: number, rowsToEach: number, totalRows: number, data: string[], tryCnt: number, maxNumRowsPerCall: number): XDPromise<string[]>;
declare function XcalarSetFree(resultSetId: string): XDPromise<void>;
declare function XcalarTargetCreate(targetType: string, targetName: string, targetParams: object[]): XDPromise<void>;
declare function XcalarTargetDelete(targetName: string): XDPromise<void>;
declare function XcalarGetVersion(connectionCheck: boolean): XDPromise<any>;
declare function XcalarGetLicense(): XDPromise<any>;
declare function XcalarRenameTable(oldTableName: string, newTableName: string, txId: number): XDPromise<void>;
declare function XcalarListWorkbooks(pattern: string): XDPromise<any>;
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
    StatusExportSFFileExists
}

declare enum FunctionCategoryT {
    FunctionCategoryAggregate
}

declare enum FunctionCategoryTStr {}

declare enum DgDagStateT {
    DgDagStateReady,
    DgDagStateDropped,
    DgDagStateError
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
}

declare namespace SuccessTStr{
    export var Copy: string;
}

declare namespace MonitorTStr {
    export var SupportTools: string;
    export var Monitor: string;
}

declare namespace AggTStr {
    export var AggTitle: string;
    export var AggInstr: string;
    export var AggName: string;
    export var AggMsg: string;
}

declare namespace ErrTStr {
    export var InvalidField: string;
    export var NoEmpty: string;
    export var InvalidTableName: string;
    export var TooLong: string;
    export var NoEmpty: string;
    export var PreservedName: string;
    export var PrefixStartsWithLetter: string;
    export var PrefixTooLong: string;
    export var LicenseExpire: string;
    export var Unknown: string;
    export var NameInUse: string;
}

declare namespace ColTStr {
    export var RenameStartInvalid: string;
    export var LongName: string;
    export var ColNameInvalidCharSpace: string;
    export var ColNameInvalidChar: string;
    export var RenameSpecialChar: string;
}

declare namespace AlertTStr {
    export var CANCEL: string;
    export var NoConnectToServer: string;
    export var UserOverLimit: string;
    export var UserOverLimitMsg: string;
    export var LicenseErr: string;
    export var LicenseErrMsg: string;
}

declare namespace ThriftTStr {
    export var Update: string;
    export var CCNBE: string;
}

declare namespace WSTStr {
    export var Ws: string;
}

declare namespace DFTStr {
    export var BatchDF: string;
}

declare namespace JupyterTStr {
    export var JupNotebook: string;
    export var NoSnippetOtherWkbk: string;
}

declare namespace IMDTStr {
    export var DelTable: string;
    export var DelTableMsg: string;
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
// declare namespace WSTStr {
//     export var Ws:
// }

/* ============== CLASSES ====================== */
declare class ProgressCircle {
    constructor(txId: number, iconNum: number);
}

declare class MouseEvents {
    public setMouseDownTarget($input: JQuery): void;
    public getLastMouseDownTime(): number;
}

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
    public getDecimal(): number;
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
}

declare class WKBK {
    public name: string;
    public modified: string;
    public sessionId: string;
}

declare class METAConstructor {
    public constructor(meta: object);
    public update(): void;
    public getQueryMeta(): object[];
    public getWSMeta(): object;
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

declare class Mutex {
    public constructor(key: string, scope: number);
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

declare class ScrollTableChecker {
    public checkScroll(): boolean;
}
/* ============== NAMESPACE ====================== */
declare namespace xcManager {
    export function removeUnloadPrompt(markUser: boolean): void;
    export function setup(): XDPromise<void>;
}

declare namespace XcSupport {
    export function setup(stripEmail: boolean): void;
    export function heartbeatCheck(): void;
    export function getUser(): string;
    export function setUser(userName: string): void;
    export function stopHeartbeatCheck(): void;
    export function restartHeartbeatCheck(): void;
    export function commitCheck(): XDPromise<any>;
}

declare namespace UserSettings {
    export function getPref(prop: string): any;
    export function commit(): XDPromise<void>;
    export function restore(oldMeta: UserInfoConstructor, gInfosSetting: object): XDPromise<void>;
    export function sync(): void;
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

declare namespace xcManager {
    export function unload();
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
    export function getLocalStorage(): string;
    export function getBackup(): string;
    export function commit(): XDPromise<void>;
    export function restore(oldLogCursor: number): void;
    export function upgrade(oldLog: string): string;
}

declare namespace SupTicketModal {
    export function show(): void;
}

declare namespace EULAModal {
    export function show(): XDPromise<void>;
}

declare namespace Alert {
    export function tempHide(): void;
    export function error(title: string, error: string, options?: object): void;
    export function show(options: {title: string, instr?: string, msg?: string, isAlert?: boolean, msgTemplate?: string, onConfirm?: Function}): string;
}

declare namespace MonitorGraph {
    export function stop(): void;
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
}

declare namespace TblManager {
    export function alignTableEls(): void;
    export function unHighlightCells(): void;
    export function restoreTableMeta(oldMeat: object): void;
    export function setOrphanTableMeta(tableName: string, tableCols: ProgCol[]): void;
    export function refreshTable(newTableNames: string[], tableCols: ProgCol[], oldTableNames: string[], worksheet: string, txId: number, options: object): XDPromise<void>;
    export function updateHeaderAndListInfo(tableId: TableId): void;
}

declare namespace TblMenu{
    export function showDagAndTableOptions($menu: JQuery, tableId: string | number): void;
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
}

declare namespace BottomMenu {
    export function unsetMenuCache(): void;
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
    export function focusOnWorksheet(): void;
}

declare namespace WorkbookManager {
    export function getActiveWKBK(): string;
    export function getWorkbooks(): WKBK[];
    export function commit(): XDPromise<void>;
    export function getWorkbook(wkbkId: string): WKBK;
    export function gotoWorkbook(workbookId: string | null, replaceURL: boolean): void;
    export function getWKBKsAsync(): XDPromise<any>;
    export function getKeysForUpgrade(sessionInfo: object[], version: number): object;
    export function upgrade(oldWkbks: object): object;
    export function updateWorkbooks(info: object): void;
}

declare namespace QueryManager{
    export function restore(oldMeta: object[]);
    export function addIndexTable(txId: number, tableName: string): void;
}

declare namespace Log {
    export function lockUndoRedo(): void;
    export function unlockUndoRedo(): void
}

declare namespace Dag {
    export function renameAllOccurrences(oldTableName: string, newTableName: string): void;
}

declare namespace DagPanel {
    export function adjustScrollBarPositionAndSize(): void;
}

declare namespace DagEdit {
    export function isEditMode(): boolean;
}

declare namespace DataflowPanel {
    export function refresh(dfName: string): void;
}

declare namespace xcMenu {
    export function add($menu: JQuery): void
    export function removeKeyboardNavigation(): void;
    export function close($menu?: JQuery): void;
    export function addKeyboardNavigation($menu: JQuery, $subMenu: JQuery, options: object): void;
}

declare namespace DS {
    export function getGrid(dsId: string): JQuery;
    export function updateDSInfo(arg: object): void;
    export function upgrade(oldDS: object): object;
}

declare namespace DSCart {
    export function restore(oldMeat: object): void;
}

declare namespace Profile {
    export function restore(oldMeat: object): void;
    export function copy(tableId: TableId, newTableId: TableId): void;
}

declare namespace DF {
    export function wasRestored(): boolean;
}

declare namespace DFCard {
    export function adjustScrollBarPositionAndSize(): void;
}

declare namespace Concurrency {
    export function tryLock(lock: Mutex): XDPromise<string>;
    export function unlock(lock: Mutex, lockString: string): XDPromise<void>;
    export function initLock(lock: Mutex): XDPromise<void>;
}

declare namespace JupyterUDFModal {
    export function show(type: string): void;
}

declare namespace JupyterPanel {
    export function appendStub(stubName: string, args?: object): void;
}

declare namespace UDF {
    export function refreshWithoutClearing(overWriteUDF: boolean): void;
    export function getCurrWorkbookPath(): string;
    export function edit(modulePath: string): void;
    export function download(moduleName: string): XDPromise<void>;
    export function del(moduleName: string): XDPromise<void>;
    export function refresh(): XDPromise<void>;
}

declare namespace DSExport {
    export function refresh(): void;
}

declare namespace Transaction {
    export function isSimulate(txId: number): boolean;
    export function isEdit(txId: number): boolean;
    export function start(options: object): number;
    export function done(txId: number, options: object): void;
    export function fail(txId: number, options: object): void;
    export function cancel(txId: number): void;
}

declare namespace SQLApi {
    export function getIndexTable(tableName: string, colNames: string[]): TableIndexCache;
    export function cacheIndexTable(tableName: string, colNames: string[], newTableName: string, newKeys: string[]): void;
}