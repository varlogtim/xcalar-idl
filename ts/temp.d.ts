/**
 * XXX This for is for temp declare of the modules
 * that has not been rewritten to ts yet.
 * Please remove these delcaration after rewrite
 * is done
 */
/// <reference path="../3rd/bower_components/moment/moment.d.ts" />
/// <reference path="../3rd/bower_components/CodeMirror/codemirror-custom.d.ts" />
/// <reference path="../node_modules/@types/codemirror/codemirror-showhint.d.ts" />
/* ============== TYPES ======================== */
type XDPromise<T> = JQueryPromise<T>;
type XDDeferred<T> = JQueryDeferred<T>;
type TableId = string | number;
type JoinType = JoinCompoundOperatorTStr | JoinOperatorT;
type HTML = string;
/* ============== INTERFACE ======================== */
interface Coordinate {
    x: number;
    y: number;
}

interface Dimensions {
    width: number,
    height: number,
    scale?: number
}

interface PrefixColInfo {
    prefix: string;
    name: string;
}

interface TableIndexCache {
    tableName: string;
    keys: string[];
}

interface ColRenameInfo {
    orig: string;
    new: string;
    type: DfFieldTypeT;
}

interface JoinTableInfo {
    columns: string[]; // array of back colum names to join
    casts?: ColumnType[]; // array of cast types ["string", "boolean", null] etc
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
    groupAll?: boolean; // group by all rows to create single row if set true,
    newKeys?: string[]; // specify the new group by keys' name
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
    splitType: number;
    headerType: number;
    format: number;
    createRule: ExExportCreateRuleT;
    handleName: string;
    csvArgs: { fieldDelim: string, recordDelim: string };
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
    gDagManagerKey: string;
    gDagListKey: string;
    gSQLTablesKey: string;
    gSQLQueryKey: string;
    gSQLEditorKey: string;
    gSQLEditorQueryKey: string;
}

interface UDFInfo {
    displayName?: string;
    fnName: string;
}

interface SQLInfo {
    retName?: string,
    tableId?: TableId,
    srcTables?: string[],
    tableName?: string,
    tableNames?: string[],
    lTableName?: string,
    rTableName?: string,
    operation?: string
}

interface XCThriftError {
    error: string,
    log: string
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

interface ParsedEval {
    fnName: string,
    args: ParsedEvalArg[] | ParsedEval[],
    type: string,
    error: string
}

interface ParsedEvalArg {
    value: string,
    type: string
}

interface ExtensionTypeCheck {
    columnType?: string[];
    integer?: boolean;
    min?: number;
    max?: number;
    multiColumn?: boolean;
    newAggName?: boolean;
    allowEmpty?: boolean;
    tableField?: string;
    newColumnName?: boolean;
    newTableName?: boolean;
}

interface ExtensionFieldInfo {
    type: string;
    name: string;
    fieldClass: string;
    autofill?: any;
    enums?: string[];
    typeCheck?: ExtensionTypeCheck;
    variableArg?: boolean;
}

interface ExtensionFuncInfo {
    fnName: string;
    buttonText: string;
    arrayOfFields: ExtensionFieldInfo[];
    instruction: string;
}

interface ExtensionInfo {
    name: string;
    buttons: ExtensionFuncInfo[];
    actionFn: Function;
    _configParams: {notTableDependent: boolean};
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
    public attr(options: object | string, options2?: string | number): d3;
    public style(options: string, options2: string): d3;
    public text(text: string | Function): d3;
    public remove(): d3;
    public interpolate(current: any, a: any);
    public interpolateNumber(num: number, step: number): Function;
    public transition(): d3;
    public duration(): d3;
    public insert(type: string | Function, before?: string | HTMLElement): d3;
    public classed(names: string, value?: boolean | Function): boolean;
    public svg;
    public layout;
}

declare namespace d3 {
    export function interpolate(current: any, a: any);
    export function interpolateNumber(num: number, step: number): Function;
    export function select(selector: string | HTMLElement): d3;
    export function transition(): d3;
    export function duration(): d3;
    export function append(selector: string): d3;
    export var svg;
    export var layout;
}


interface JQueryStatic {
    md5(str: string): string;
}

declare namespace pako {
    export function gzip(key: string, options: object): string;
}

interface CanvasRenderingContext2D {
    webkitBackingStorePixelRatio: number;
    mozBackingStorePixelRatio: number;
    msBackingStorePixelRatio: number;
    oBackingStorePixelRatio: number;
    backingStorePixelRatio: number;
}

interface Array<T> {
    includes(...args: any[]): boolean;
}

interface OpStatsDetails {
    numWorkCompleted: number,
    numWorkTotal: number
}
interface OpStatsOutput {
    opDetails: OpStatsDetails;
}

interface DatasetBrowseItem {
    name: string;
    id: string;
}

interface DatasetBrowseFolder{
    folders: {}; // to contain multitudes of folders
    datasets: DatasetBrowseItem[];
}

interface ListDSInfo {
    path: string,
    suffix: string,
    id: string
}

interface FileManagerPathNode {
    pathName: string;
    isDir: boolean;
    timestamp: number;
    size: number;
    isSelected: boolean;
    sortBy: FileManagerField;
    sortDescending: boolean;
    isSorted: boolean;
    parent: FileManagerPathNode;
    children: Map<string, FileManagerPathNode>;
}

interface FileManagerHistoryNode {
    path: string;
    prev: FileManagerHistoryNode;
    next: FileManagerHistoryNode;
}

declare namespace Base64 {
    function encode(input: string): string;
    function decode(input: string): string;
    function _utf8_encode(input: string): string;
    function _utf8_decode(input: string): string;
}
/* ============== GLOBAL VARIABLES ============= */
declare var nw: any; // nw js for XD CE
interface Window {
    FnBar: any;
    gMinModeOn: boolean;
    xcLocalStorage: any;
    xcSessionStorage: any;
}

declare var unitTestMode: boolean;
declare var isBrowserIE: boolean;
declare var isBrowserChrome: boolean;
declare var KB: number
declare var MB: number;
declare var GB: number;
declare var TB: number;
declare var PB: number;
declare var gScrollbarWidth: number;
declare var gMaxDivHeight: number;
declare var gNumEntriesPerPage: number;
declare var gMaxEntriesPerPage: number;
declare var gMinRowsPerScreen: number;
declare var gFirstRowPositionTop: number;
declare var gNewCellWidth: number;
declare var gPrefixLimit: number;
declare var gMouseEvents: MouseEvents;
declare var gMouseStatus: string;
declare var gRescol: {
    minCellHeight: number
    cellMinWidth: number
    clicks: number
    delay: number
    timer: number
};
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
declare var gHiddenColumnWidth: number | string;
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

declare var gBuildNumber: number;
declare var gGitVersion: number;
declare var XcalarApisTStr: object;
declare var StatusTStr: { [key: string]: string };
declare var currentVersion: number;
declare var xcLocalStorage: XcStorage;
declare var xcSessionStorage: XcStorage;
declare var global: any;
declare var expHost: string;
declare var sqlMode: boolean;
declare var gPatchVersion: string;

declare var skRFPredictor: any;

declare var isBrowserSafari: boolean;
declare var isBrowserFirefox: boolean;
declare var isSystemMac: boolean;

declare var getTHandle: any;
declare var setupThrift: any;
declare var setupHostName: any;
declare var XcalarGetVersion: any;
declare var XcalarGetLicense: any;
declare var XcalarGetNodeName: any;
declare var XcalarUpdateLicense: any;
declare var XcalarPreview: any;
declare var XcalarLoad: any;
declare var XcalarAddLocalFSExportTarget: any;
declare var XcalarAddUDFExportTarget: any;
declare var XcalarRemoveExportTarget: any;
declare var XcalarListExportTargets: any;
declare var XcalarExport: any;
declare var XcalarDriverCreate: any;
declare var XcalarDriverDelete: any;
declare var XcalarDriverList: any;
declare var XcalarLockDataset: any;
declare var XcalarUnlockDataset: any;
declare var XcalarDestroyDataset: any;
declare var XcalarIndexFromDataset: any;
declare var XcalarIndexFromTable: any;
declare var XcalarDeleteTable: any;
declare var XcalarDeleteConstants: any;
declare var XcalarRenameTable: any;
declare var XcalarFetchData: any;
declare var XcalarGetConfigParams: any;
declare var XcalarSetConfigParams: any;
declare var XcalarGetDatasetCount: any;
declare var XcalarGetDatasetMeta: any;
declare var XcalarGetTableMeta: any;
declare var XcalarGetTableCount: any;
declare var XcalarGetDatasets: any;
declare var XcalarGetDatasetUsers: any;
declare var XcalarGetUserDatasets: any;
declare var XcalarGetDatasetsInfo: any;
declare var XcalarGetConstants: any;
declare var XcalarGetTables: any;
declare var XcalarGetDSNode: any;
declare var XcalarShutdown: any;
declare var XcalarGetStats: any;
declare var XcalarMakeResultSetFromTable: any;
declare var XcalarMakeResultSetFromDataset: any;
declare var XcalarSetAbsolute: any;
declare var XcalarGetNextPage: any;
declare var XcalarSetFree: any;
declare var XcalarFilter: any;
declare var XcalarMapWithInput: any;
declare var XcalarMap: any;
declare var XcalarAggregate: any;
declare var XcalarJoin: any;
declare var XcalarGroupByWithInput: any;
declare var XcalarGroupByWithEvalStrings: any;
declare var XcalarGroupBy: any;
declare var XcalarProject: any;
declare var XcalarUnion: any;
declare var XcalarGenRowNum: any;
declare var XcalarArchiveTable: any;
declare var XcalarQuery: any;
declare var XcalarQueryState: any;
declare var XcalarQueryCheck: any;
declare var XcalarQueryWithCheck: any;
declare var XcalarQueryCancel: any;
declare var XcalarQueryDelete: any;
declare var XcalarCancelOp: any;
declare var XcalarGetDag: any;
declare var XcalarTagDagNodes: any;
declare var XcalarCommentDagNodes: any;
declare var XcalarListFiles: any;
declare var XcalarSynthesize: any;
declare var XcalarMakeRetina: any;
declare var XcalarListRetinas: any;
declare var XcalarGetRetina: any;
declare var XcalarGetRetinaJson: any;
declare var XcalarUpdateRetina: any;
declare var XcalarExecuteRetina: any;
declare var XcalarListParametersInRetina: any;
declare var XcalarDeleteRetina: any;
declare var XcalarImportRetina: any;
declare var XcalarExportRetina: any;
declare var XcalarDeleteSched: any;
declare var XcalarCreateSched: any;
declare var XcalarUpdateSched: any;
declare var XcalarListSchedules: any;
declare var XcalarPauseSched: any;
declare var XcalarResumeSched: any;
declare var XcalarKeyLookup: any;
declare var XcalarKeyList: any;
declare var XcalarKeyPut: any;
declare var XcalarKeyDelete: any;
declare var XcalarKeySetIfEqual: any;
declare var XcalarKeySetBothIfEqual: any;
declare var XcalarKeyAppend: any;
declare var XcalarGetOpStats: any;
declare var XcalarApiTop: any;
declare var XcalarGetMemoryUsage: any;
declare var XcalarGetAllTableMemory: any;
declare var XcalarListXdfs: any;
declare var XcalarUploadPythonRejectDuplicate: any;
declare var XcalarUploadPython: any;
declare var XcalarUpdatePython: any;
declare var XcalarDeletePython: any;
declare var XcalarDownloadPython: any;
declare var XcalarGetQuery: any;
declare var XcalarNewWorkbook: any;
declare var XcalarDeleteWorkbook: any;
declare var XcalarDeactivateWorkbook: any;
declare var XcalarListWorkbooks: any;
declare var XcalarSaveWorkbooks: any;
declare var XcalarActivateWorkbook: any;
declare var XcalarRenameWorkbook: any;
declare var XcalarUploadWorkbook: any;
declare var XcalarDownloadWorkbook: any;
declare var XcalarDetachWorkbook: any;
declare var XcalarGetStatGroupIdMap: any;
declare var XcalarSupportGenerate: any;
declare var XcalarAppSet: any;
declare var XcalarAppRun: any;
declare var XcalarAppReap: any;
declare var XcalarAppExecute: any;
declare var XcalarLogLevelGet: any;
declare var XcalarLogLevelSet: any;
declare var XcalarRuntimeSetParam: any;
declare var XcalarRuntimeGetParam: any;
declare var XcalarTargetCreate: any;
declare var XcalarTargetDelete: any;
declare var XcalarTargetList: any;
declare var XcalarTargetTypeList: any;
declare var XcalarListPublishedTables: any;
declare var XcalarUnpublishTable: any;
declare var XcalarPublishTable: any;
declare var XcalarPublishTableChangeOwner: any;
declare var XcalarUpdateTable: any;
declare var XcalarRefreshTable: any;
declare var XcalarRestoreTable: any;
declare var XcalarCoalesce: any;
declare var XcalarDriverList: any;
declare var XcalarDriverCreate: any;
declare var XcalarDriverDelete: any;
declare var XcalarGetTableRefCount: any;

declare var isBrowserMicrosoft: boolean;

declare var mixpanel: object;
/* ============== GLOBAL FUNCTIONS ============= */
// Declaration of XcalarApi moved to IXcalarApi.ts
/* ============= THRIFT ENUMS ================= */
declare enum XcalarApiKeyScopeT {
    XcalarApiKeyScopeGlobal,
    XcalarApiKeyScopeSession
}

// declare enum XcalarApisT {
//     XcalarApiJoin = 15,
//     XcalarApiBulkLoad = 2,
//     XcalarApiExport = 33
// }

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
    StatusDagNodeNotFound,
    StatusUdfExecuteFailed,
    StatusOk,
    StatusConnReset,
    StatusConnRefused,
    StatusDgNodeInUse,
    StatusKvEntryNotFound,
    StatusKvStoreNotFound,
    StatusUdfModuleAlreadyExists,
    StatusUdfModuleEmpty,
    StatusQrQueryAlreadyExists,
    StatusInvalidResultSetId,
    StatusNoBufs,
    StatusUdfModuleNotFound
}

declare enum FunctionCategoryT {
    FunctionCategoryAggregate,
    FunctionCategoryCondition,
    FunctionCategoryUdf
}

declare enum FunctionCategoryTStr {}

declare enum DgDagStateT {
    DgDagStateReady,
    DgDagStateDropped,
    DgDagStateError,
    DgDagStateProcessing
}
declare enum DgDagStateTStr {}

// declare enum CsvSchemaModeT {
//     CsvSchemaModeNoneProvided
// }

declare namespace XcalarApisConstantsT {
    export var XcalarApiMaxTableNameLen: number;
    export var XcalarApiMaxFieldNameLen: number;
    export var XcalarApiMaxEvalStringLen: number;
    export var XcalarApiMaxEvalStirngLen: number;
    export var XcalarApiDefaultTopIntervalInMs: number;
    export var XcalarApiMaxUdfModuleNameLen: number;
    export var XcalarApiMaxUdfSourceLen: number;
    export var XcalarApiMaxDagNodeCommentLen: number;
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

declare enum UnionOperatorTStr {

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

declare var XcalarOrderingTFromStr: any;
/* ============= JSTSTR ==================== */
declare namespace XcalarEvalArgTypeT {
    export var OptionalArg: number;
    export var VariableArg: number;
}

declare namespace UploadDataflowCard {
    export function show(): void;
}

/* ============== CLASSES ====================== */
declare class ColFunc {
    constructor(obj);
    public name: string;
    public args: any[];
}

declare class ProgCol {
    constructor(options: object);
    public type: string;
    public name: string;
    public backName: string;
    public width: number | string;
    public sizedTo: string;
    public immediate: boolean;
    public prefix: string;
    public userStr: string;
    public func: ColFunc;
    public format: string;
    public textAlign: string;
    public isDATACol(): boolean;
    public isEmptyCol(): boolean;
    public getFrontColName(includePrefix: boolean): string;
    public isKnownType(): boolean;
    public getFormat(): string;
    public getType(): ColumnType;
    public getBackColName(): string;
    public hasMinimized(): boolean;
    public setBackColName(name: string): void;
    public isNumberCol(): boolean;
    public getPrefix(): string;
    public getFrontColName(): string;
    public getWidth(): number;
    public maximize(): void;
    public minimize(): void;
}

declare class TableMeta {
    public tableName: string;
    public tableId: TableId;
    public tableCols: ProgCol[];
    public backTableMeta: any;
    public status: string;
    public highlightedCells: object;
    public currentRowNumber: number;
    public resultSetCount: number;
    public resultSetMax: number;
    public resultSetId: number;
    public rowHeights: any;
    public modelingMode: boolean;
    public scrollMeta: {isTableScrolling: boolean, isBarScrolling: boolean, base: number, scale: number};
    public getAllCols(onlyValid?: boolean): ProgCol[]
    public getCol(colNum: number): ProgCol;
    public hasCol(colName: string, prefix: string): boolean;
    public hasColWithBackName(colName: string): boolean;
    public removeCol(colNum: number): ProgCol;
    public getNumCols(): number;
    public sortCols(sortKey: string, order: ColumnSortOrder): void;
    public addCol(colNum: number, progCol: ProgCol);
    public getKeys(): {name: string, ordering: string}[];
    public getOrdering(): number;
    public getIndexTable(colNames: string[]): TableIndexCache;
    public removeIndexTable(colNames: string[]): void;
    public setIndexTable(colNames: string[], newTableName: string, newKeys: string[]): void;
    public getColNumByBackName(name: string): number;
    public getName(): string;
    public hasLock(): boolean;
    public unlock(): void;
    public isActive(): boolean;
    public isDropped(): boolean;
    public beDropped(): void;
    public getId(): string;
    public getType(): TableType;
    public beOrphaned(): void;
    public getName(): string;
    public freeResultset(): XDPromise<void>;
    public getMetaAndResultSet(): XDPromise<void>;
    public getImmediateNames(): string[];
    public beUndone(): void;
    public updateTimeStamp(): void;
    public addNoDelete(): void;
    public removeNoDelete(): void;
    public showIndexStyle(): void;
    public getKeyName(): string[];
    public getSkewness(): number;
    public updateResultset(): XDPromise<void>;
    public constructor(options: object);
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
    public constructor(info: any);
}

declare class WSMETA {
    public constructor(info: any);
    public wsInfos: Set<WorksheetObj>
}

declare class METAConstructor {
    public constructor(meta: object);
    public update(): void;
    public getQueryMeta(): QueryManager.XcQueryAbbr[];
    public getWSMeta(): WSMETA;
    public getTpfxMeta(): object;
    public getAggMeta(): object;
    public getTableMeta(): TableMeta[];
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
    public nodes: DagNodeId[];
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
declare class XEvalParser {
    public parseEvalStr(evlStr: string): ParsedEval;
}

/* ============== NAMESPACE ====================== */
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
    export function checkColName($nameInput: JQuery, tableId: TableId, colNum: number, options?: any): boolean;
    export function addNewCol(colNum: number, tableId: TableId, direction: ColDir): void;
    export function hideCol(colNums: number[], tableId: TableId): void;
    export function renameCol(colNum: number, tableId: TableId, colName: string): void;
    export function format(colNums: number[], tableId: TableId, formats: string[]): void;
    export function round(colNums: number[], tableId: TableId, decimal: number);
    export function splitCol(colNum: number, tableId: TableId, delim: string, numColToGet: number, colNames: string[], isAlertOn: boolean): XDPromise<void>;
    export function minimizeCols(colNums: number[], tableId: TableId): void;
    export function maximizeCols(colNums: number[], tableId: TableId): void;
    export function textAlign(colNums: number[], tableId: TableId, classes: string): void;
    export function changeType(colTypeInfos: object, tableId: TableId): XDPromise<void>;
    export function unnest(tableId: TableId, colNum: number, rowNum: number): void;
    export function sortColumn(colNums: number[], tableId: TableId, order: XcalarOrderingT): XDPromise<void>;
    export function pullAllCols(startIndex: number, jsonData: string[], tableId: TableId, direction: RowDirection, rowToPrependTo: number): JQuery;
    export function getCellType($td: JQuery, tableId: TableId): ColumnType;
}

declare namespace Admin {
    export function initialize(): void;
    export function showSupport();
    export function updateLoggedInUsers(userInfos: object): void;
    export function isAdmin(): boolean;
    export function addNewUser(): void;
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
    export function restore(oldLogCursor: number): XDPromise<void>;
    export function upgrade(oldLog: string): string;
    export function hasUncommitChange(): boolean;
    export function lockUndoRedo(): void;
    export function unlockUndoRedo(): void;
    export function backup(): void;
    export function add(title: string, options: object | null, cli?: string, willCommit?: boolean): void;
    export function getCursor(): number;
    export function errorLog(title: string, sql: object, cli: string, error: string | object);
    export function commitErrors(): void;
    export function repeat(): void;
    export function undo(): void;
    export function redo(): void;
    export function isRedo(): boolean;
    export function isUndo(): boolean;
    export function viewLastAction(): string;
}

declare namespace SupTicketModal {
    export function setup(): void;
    export function show(): void;
}

declare namespace MonitorGraph {
    export function stop(): void;
    export function tableUsageChange(): void;
}

declare namespace TableList {
    export function lockTable(tableId: TableId): void;
    export function unlockTable(tableId: TableId): void;
    export function refreshConstantList(): void;
    export function refreshOrphanList(prettyPrint?: boolean): XDPromise<void>;
    export function removeTable(tableIdOrName: TableId | string, type?: string, lock?: boolean): void;
    export function addToCanceledList(tableName: string): void;
    export function removeFromCanceledList(tableName: string): void;
    export function reorderTable(tableId: TableId): void;
    export function updatePendingState(flag: boolean): void;
    export function addTables(tables: TableMeta[], flag: boolean): void;
    export function addToOrphanList(tableName: string): void;
    export function makeTableNoDelete(tableId: TableId);
    export function removeTableNoDelete(tableId: TableId): void;
    export function updateTableInfo(tableId: TableId): void;
    export function setup(): void;
    export function initialize(): void;
    export function clear(): void;
    export function tablesToHiddenWS(wsIds: string[]);
    export function tableBulkAction(action: string, type: TableType, wsId: string, arg?: any, waitForAnim?: boolean, noAnim?: boolean): XDPromise<void>;
}

declare namespace TblAnim {
    export function startRowResize($el: JQuery, event: JQueryMouseEventObject): void;
    export function startColResize($el: JQuery, event: JQueryMouseEventObject, options: object): void;
    export function startTableDrag($el: JQuery, event: JQueryMouseEventObject): void
    export function startColDrag($headCol: JQuery, event: JQueryEventObject): void;
}

declare namespace TPrefix {
    export function restore(oldMeat: object): void;
    export function setup(): void;
}

declare namespace Aggregates {
    export function restore(oldMeat: object): void;
    export function getAgg(tableId: TableId, backColName: string, aggrOp: string): any
    export function addAgg(aggRes: object, isTemp: boolean): void;
    export function getNamedAggs(): any[];
}

declare namespace MainMenu {
    export function setup(): void;
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
    export function closeForms(): void;
    export function registerPanels(panels: BaseOpPanel): void;
}

declare namespace BottomMenu {
    export function setup(): void;
    export function initialize(): void;
    export function unsetMenuCache(): void;
    export function close(something?: boolean): void;
}

declare namespace Dag {
    export function addEventListeners($dagWrap: JQuery): void;
    export function removeNoDelete(tableId: TableId): void;
    export function renameAllOccurrences(oldTableName: string, newTableName: string): void;
    export function makeTableNoDelete(tableName: string): void;
    export function generateIcvTable(tableId: TableId, tableName: string): void;
    export function generateComplementTable(tableName: string): void
    export function getTableInfo(tableId: TableId, $dagTable: JQuery): {isIcv: boolean, generatingIcv: boolean, canBeIcv: boolean, hasDroppedParent: boolean, generatingComplement: boolean, type: string};
    export function focusDagForActiveTable(tableId: TableId, tableFocused: boolean);
    export function construct(tableId: TableId, tableToReplace: string, options: object): XDPromise<void>;
    export function destruct(tableId: TableId): void;
    export function makeInactive(tableIdOrName: string | TableId, nameProvided: boolean): void;
}

declare namespace DagDraw {
    export function createDagImage(node: any, $dagWrap: JQuery): void;
}

declare namespace DagPanel {
    export function setup(): void;
    export function adjustScrollBarPositionAndSize(): void;
    export function updateExitMenu(name?: string): void;
    export function setScrollBarId(winHeight: number): void;
    export function focusOnWorksheet(ws: string): void;
}

declare namespace DagEdit {
    export function isEditMode(): boolean;
    export function exitForm(): void;
    export function off(): void;
}

declare namespace DataflowPanel {
    export function setup(): void;
    export function initialize(): void;
    export function refresh(dfName: string): void;
}

declare namespace DataStore {
    export function setup(): void;
}

declare namespace DS {
    export function getGrid(dsId: string): JQuery;
    export function getGridByName(dsName: string, user?: string): JQuery;
    export function updateDSInfo(arg: object): void;
    export function upgrade(oldDS: object): object;
    export function cancel($grid: JQuery): XDPromise<any>;
    export function restore(oldHomeFolder: object, atStartup?: boolean): XDPromise<any>;
    export function getHomeDir(toPersist?: boolean): object;
    export function getDSObj(dsId: number | string): DSObj | null;
    export function goToDir(foldderId: string): void;
    export function focusOn($grid: JQuery): XDPromise<any>;
    export function listDatasets(): ListDSInfo[];
}


declare class DSObj {
    public parentId: string;
    public getFullName(): string;
    public getName(): string;
    public fetch(startRow: number, rowsToFetch: number): XDPromise<any>
    public getError(): string;
    public getId(): string;
    public getNumEntries(): number;
}

declare namespace DSCart {
    export function restore(oldMeat: object): void;
    export function queryDone(id: number, isCancel?: boolean): void;
    export function addQuery(XcQuery);
    export function resize(): void;
}

declare namespace Profile {
    export function setup(): void;
    export function restore(oldMeat: object): void;
    export function copy(tableId: TableId, newTableId: TableId): void;
    export function show(tableId: TableId, colNum: number): void;
    export function deleteCache(tableId: TableId): void;
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
    export function setup(): void;
    export function show(type: string): void;
}

declare namespace JupyterPanel {
    export function setup(): void;
    export function appendStub(stubName: string, args?: object): void;
    export function newWorkbook(workbookName: string): XDPromise<string>;
    export function renameWorkbook(jupyterFolder: string, newName: string): XDPromise<string>;
    export function deleteWorkbook(workbookId: string): void;
    export function updateFolderName(newFoldername: string): void;
    export function copyWorkbook(oldJupyterFolder: string, newJupyterFolder: string): void;
    export function initialize(noRestore?: boolean): void;
    export function publishTable(tableName: string, numRows?: number): void;
}

declare namespace DSExport {
    export function refresh(): void;
    export function refreshUDF(listXdfsObj: any): void;
}

declare namespace SQLApi {
    export function getIndexTable(tableName: string, colNames: string[]): TableIndexCache;
    export function cacheIndexTable(tableName: string, colNames: string[], newTableName: string, newKeys: string[]): void;
}

declare namespace DeleteTableModal {
    export function setup(): void;
    export function show(): void;
}

declare namespace MonitorPanel {
    export function setup(): void;
    export function inActive(): void;
    export function active(): void;
    export function isGraphActive(): boolean;
}

declare namespace MonitorConfig {
    export function refreshParams(firstTouch: boolean): XDPromise<{}>;
}

declare namespace ProjectView {
    export function updateColumns(): void;
    export function setup(): void;
    export function show(tableId: TableId, colNums: number[]): void;
}
declare namespace OperationsView {
    export function updateColumns(): void;
    export function setup(): void;
    export function restore(): void;
    export function show(tableId: TableId, colNums: number[], func: string, options: object): void;
    export function updateOperationsMap(listXdfsObj: any)
}
declare namespace JoinView {
    export function updateColumns(): void;
    export function setup(): void;
    export function restore(): void;
    export function show(tableId: TableId, colNums: number[]): void
}
declare namespace ExportView {
    export function updateColumns(): void;
    export function show(tableId: TableId): void;
}
declare namespace SmartCastView {
    export function updateColumns(tableId: TableId): void;
    export function show(tableId: TableId): void;
}
declare namespace UnionView {
    export function updateColumns(tableId: TableId): void;
    export function setup(): void;
    export function show(tableId: TableId, colNums: number[]): void;
}
declare namespace SortView {
    export function updateColumns(tableId: TableId): void;
    export function setup(): void;
    export function show(colNums: number[], tableId: TableId): void;
}
declare namespace FnBar {
    export function updateOperationsMap(fns: UDFInfo[], isOnlyUDF?: boolean): void;
    export function unlock(): void;
    export function setup(): void;
    export function clear(): void;
    export function updateColNameCache(): void;
    export function focusOnCol($head: JQuery, tableId: TableId, colNum: number): void;
}

declare namespace DagFunction {
    interface TreeNode {
        value: any, // TODO: figure out the type
        parents: TreeNode[],
        children: TreeNode[],

        getSourceNames(excludeTags?: boolean): string[]
    }

    interface LineageStruct {
        tree: TreeNode,
        trees: TreeNode[],
        sets: TreeNode[],
        endPoints: TreeNode[],
        orderedPrintArray: TreeNode[],
        nodeIdMap: object
    }

    export function construct(nodes: XcalarApiDagNodeT[], tableId?: string): LineageStruct;
    export function tagNodes(txId: number): XDPromise<void>;
}

declare namespace TutorialsSetup {
    export function setup(): void;
}

declare namespace xcMixpanel {
    export function setup(): void;
}

declare namespace DSPreview {
    export function update(ListXdfsObj: any);
}

declare namespace DSTargetManager {
    export function getAllTargets(): object[];
    export function refreshTargets(noWaitIcon: boolean): object[];
    export function updateUDF(listXdfsObj: any);
}

declare namespace JSONModal {
    export function setup(): void;
    export function show($td: JQuery, options: object): void
    export function rehighlightTds($table: JQuery): void;
}

declare namespace ExportView {
    export function setup(): void;
}

declare namespace AggModal {
    export function setup(): void;
    export function corrAgg(tableId: TableId, vertColNums?: number[], horColNums?: number[]): void;
}

declare namespace DFCreateView {
    export function setup(): void;
    export function updateTables(tableId: TableId, something: boolean);
    export function show($dagWrap: JQuery): void
}

declare namespace DFParamModal {
    export function setup(): void;
    export function updateDraggableInputs(): void;
}

declare namespace SmartCastView {
    export function setup(): void;
}

declare namespace FileBrowser {
    export function restore(): void;
}

declare namespace ExtensionManager {
    export function setup(): XDPromise<void>;
    export function openView(colNum: number, tableId: TableId): void;
    export function triggerFromDF(moduleName: string, funcName: string, args: object): XDPromise<string>;
}

declare namespace ExtensionPanel {
    export function setup(): void;
}

declare namespace ExtModal {
    export function setup(): void;
}
declare namespace LicenseModal {
    export function setup(): void;
}

declare namespace AboutModal {
    export function setup(): void;
    export function show(): void;
}

declare namespace FileInfoModal {
    export function setup(): void;
}

declare namespace DSInfoModal {
    export function setup(): void;
}

declare namespace SkewInfoModal {
    export function setup(): void;
    export function show(tableId: TableId): void;
}

declare namespace LoginConfigModal {
    export function setup(): void;
}

declare namespace LiveHelpModal {
    export function setup(): void;
    export function show(): void;
    export function userLeft(): void;
}

declare namespace JupyterFinalizeModal {
    export function setup(): void;
}

declare namespace DFCommentModal {
    export function setup(): void;
}

declare namespace FileListModal {
    export function setup(): void;
}

declare namespace DSImportErrorModal {
    export function setup(): void;
}

declare namespace MonitorLog {
    export function adjustTabNumber(): void;
}

declare namespace SQLEditor {
    export function initialize(): void;
    export function storeQuery(): void;
    export function dropAllSchemas(wkbkId: string): void;
    export function deleteSchemas(tableName: string, tableIds: TableId[]): XDPromise<void>;
}

declare namespace Msal {
    export class UserAgentApplication {
        public constructor(clientID: string, authority: any, authCallback: Function, options: object);
        public getUser(): string;
        public logout(): void;
    }
    export class Logger{
        public constructor(callback: Function, options: object);
    }
}

declare namespace XDParser {
    export var SQLParser: any;
    export var XEvalParser: XEvalParser;
}

declare namespace ExtensionManager {
    export function getEnabledExtensions(): ExtensionInfo[]
}

declare namespace XcSDK {
    class Table {
        public constructor(tableName: string, worksheet: string, modelingMode: boolean);
        public getName(): string;
    }
    class Column {
        public constructor(colName: string, colType: ColumnType);
        public getName(): string;
        public getType(): ColumnType;
    }
}
