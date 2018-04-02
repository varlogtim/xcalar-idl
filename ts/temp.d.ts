/**
 * XXX This for is for temp declare of the modules
 * that has not been rewritten to ts yet.
 * Please remove these delcaration after rewrite
 * is done
 */

/* ============== TYPES ======================== */
type XDPromise<T> = JQueryPromise<T>;
type XDDeferred<T> = JQueryDeferred<T>;

/* ============== GLOBAL VARIABLES ============= */
declare var gDSPrefix: string;
declare var gDroppedTables: object;
declare var gPrefixSign: string;
declare var gPrefixLimit: number;
declare var gTables: object;
declare var gMinModeOn: boolean;
declare var gMouseEvents: MouseEvents;
declare var gColPrefix: string;
declare var XcalarApisTStr: object;
declare var StatusTStr: object;
declare var gExportNoCheck: boolean;
declare var gAggVarPrefix: string;
declare var gActiveTableId: string;
declare var currentVersion: number;
declare var xcLocalStorage: XcStorage;
declare var gKVScope: {
    META: number,
    EPHM: number,
    USER: number,
    GLOB: number
};

/* ============== GLOBAL FUNCTIONS ============= */
declare function XcalarGetTables(): XDPromise<any>;
declare function XcalarGetTableMeta(tableName: string): XDPromise<any>;
declare function XcalarKeyLookup(key: string, scope: number): XDPromise<any>;
declare function XcalarKeyPut(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeyAppend(key: string, value: string, persist: boolean, scope: number): XDPromise<any>;
declare function XcalarKeyDelete(key: string, scope: number): XDPromise<any>;
declare function XcalarSaveWorkbooks(wkbkName: string): XDPromise<void>;
/* ============= THRIFT ENUMS ================= */
declare enum DfFieldTypeT {
    DfString = 1,
    DfInt32 = 2,
    DfInt64 = 4,
    DfUInt32 = 3,
    DfUInt64 = 5,
    DfFloat32 = 6,
    DfFloat64 = 7,
    DfBoolean = 8,
    DfUnknown = 0,
}

declare enum XcalarApisT {
    XcalarApiJoin = 15,
    XcalarApiBulkLoad = 2,
    XcalarApiExport = 33
}

declare enum StatusT {
    StatusCanceled = 124
}

declare namespace XcalarApisConstantsT {
    export var XcalarApiMaxTableNameLen: number;
    export var XcalarApiMaxFieldNameLen: number;
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
}

declare namespace StatusMessageTStr {
    export var ActionSuccess: string;
    export var ActionFailed: string;
    export var Loading: string;
    export var Completed: string;
    export var Error: string;
    export var EditingDF: string;
    export var Viewing: string;
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
}

declare namespace SuccessTStr{
    export var Copy: string;
}

declare namespace MonitorTStr {
    export var SupportTools: string;
    export var Monitor: string;
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

// declare namespace WSTStr {
//     export var Ws:
// }

/* ============== CLASSES ====================== */
declare class ProgressCircle {
    constructor(txId: string, iconNum: number);
}

declare class MouseEvents {
    public setMouseDownTarget($input: JQuery): void;
}

declare class ColFunc {
    public name: string;
    public args: any[];
}

declare class ProgCol {
    public type: string;
    public backName: string;
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
    public tableCols: ProgCol[];
    public backTableMeta: any;
    public highlightedCells: object;
    public getAllCols(onlyValid?: boolean): ProgCol[]
    public getCol(colNum: number): ProgCol;
    public hasColWithBackName(colName: string): boolean;
}

declare class XcStorage {
    public getItem(key: string): string;
}

declare class WKBK {
    public name: string;
    public modified: string;
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

declare class UserInfoConstructor{
    public constructor(meta: object);
}

declare class Mutex {
    public constructor(key: string, scope: number);
}
/* ============== NAMESPACE ====================== */
declare namespace xcManager {
    export function removeUnloadPrompt(markUser: boolean): void;
}

declare namespace XcSupport {
    export function heartbeatCheck(): void;
    export function getUser(): string;
    export function stopHeartbeatCheck(): void;
    export function restartHeartbeatCheck(): void;
    export function commitCheck(): XDPromise<any>;
}

declare namespace UserSettings {
    export function getPref(prop: string): any;
    export function commit(): XDPromise<void>;
    export function restore(oldMeta: UserInfoConstructor, gInfosSetting: object): XDPromise<void>;
}

declare namespace ColManager {
    export function newCol(colInfo: object): object;
}

declare namespace Admin {
    export function showSupport();
}

declare namespace xcManager {
    export function unload();
}

declare namespace PromiseHelper {
    export function deferred<T>(): XDDeferred<T>;
    export function reject<T>(...args): XDPromise<T>;
    export function resolve<T>(...args): XDPromise<T>;
}

declare namespace Log {
    export function getAllLogs(): object[];
    export function getLocalStorage(): string;
    export function getBackup(): string;
    export function commit(): XDPromise<void>;
    export function restore(oldLogCursor: number): void;
}

declare namespace SupTicketModal {
    export function show(): void;
}

declare namespace Alert {
    export function tempHide(): void;
    export function error(title: string, error: string): void;
}

declare namespace MonitorGraph {
    export function stop(): void;
}

declare namespace TblFunc {
    export function moveTableTitles(): void;
    export function focusTable(tableId: string): void;
    export function hideOffScreenTables(options: object): void;
    export function moveTableTitles($tableWraps: JQuery | null, options: object): void;
    export function unhideOffScreenTables(): void;
}

declare namespace TableList {
    export function lockTable(tableId: string): void;
    export function unlockTable(tableId: string): void;
}

declare namespace TblManager {
    export function alignTableEls(): void;
    export function unHighlightCells(): void;
    export function restoreTableMeta(oldMeat: object): void;
}

declare namespace TblMenu{
    export function showDagAndTableOptions($menu: JQuery, tableId: string): void;
}

declare namespace TPrefix {
    export function restore(oldMeat: object): void;
}

declare namespace Aggregates {
    export function restore(oldMeat: object): void;
}

declare namespace MainMenu {
    export function getOffset(): number;
}

declare namespace WSManager {
    export function lockTable(tableId: string): void;
    export function unlockTable(tableId: string): void;
    export function getWSFromTable(tableId: string): string;
    export function getActiveWS(): string;
    export function switchWS(wsId: string): void;
    export function indexOfWS(ws: string): number;
    export function getWSList(): string[];
    export function getNumOfWS(): number;
    export function getTableRelativePosition(tableId: string): number;
    export function getWorksheets(): object;
    export function getWSLists(isAll: boolean): string;
    export function getWSName(ws: string): string;
    export function restore(oldMeat: object): void;
}

declare namespace WorkbookManager {
    export function getActiveWKBK(): string;
    export function getWorkbooks(): WKBK[];
    export function commit(): XDPromise<void>;
    export function getWorkbook(wkbkId: string): WKBK;
}

declare namespace QueryManager{
    export function restore(oldMeta: object[]);
}

declare namespace Log {
    export function lockUndoRedo(): void;
    export function unlockUndoRedo(): void
}

declare namespace DagPanel {
    export function adjustScrollBarPositionAndSize(): void;
}

declare namespace DagEdit {
    export function isEditMode(): boolean;
}

declare namespace xcMenu {
    export function add($menu: JQuery): void
    export function removeKeyboardNavigation(): void;
    export function close($menu?: JQuery): void;
    export function addKeyboardNavigation($menu: JQuery, $subMenu: JQuery, options: object): void;
}

declare namespace DS {
    export function getGrid(dsId: string): JQuery;
}

declare namespace DSCart {
    export function restore(oldMeat: object): void;
}

declare namespace Profile {
    export function restore(oldMeat: object): void;
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