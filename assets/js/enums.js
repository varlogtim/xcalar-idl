var SortDirection = {
    Forward: 1,
    Backward: 2
};

var RowDirection = {
    Top: 1,
    Bottom: 2
};

var KeepOriginalTables = {
    Keep: true,
    DontKeep: false
};

var IsActive = {
    Active: true,
    Inactive: false
};

var AfterStartup = {
    After: true,
    Before: false
};

var SelectUnit = {
    All: true,
    Single: false
};

var SPMode = {
    Normal: 1,
    Selected: 2,
    Equation: 3,
    Type: 4
};

var ExecuteAction = {
    Update: 1,
    Eval: 2
};

var JoinKeySuggestion = {
    KeySuggested: 1,
    KeyUnsure: 2,
    KeyNotFound: 3
};

var AffectedEntryAction = {
    AddConnected: 1,
    DelConnected: 2,
    DelConnectedRemoveEntry: 3
};

var SyncOrAsync = {
    Sync: true,
    Async: false
};

var ArchiveTable = {
    Delete: true,
    Keep: false
};

var WSTableType = {
    "Active"    : "tables",
    "Archive"   : "archivedTables",
    "TempHidden": "tempHiddenTables",
    "Orphan"    : "orphanedTables",
    "Undo"      : "undoneTables",
    "Lock"      : "lockedTables"
};

var DelWSType = {
    "Del": "drop tables",
    "Archive": "archive tables",
    "Empty": 'empty sheet'
};

var TableType = {
    "Active"  : "active",
    "Archived": "archived",
    "Orphan"  : "orphaned",
    "WSHidden": "hidden",
    "Unknown" : "unknown source",
    "Trash"   : "trashed",
    "Undone"  : "undone",
    "Aggregate": "aggregate"
};

var ColDir = {
    "Left" : "L",
    "Right": "R"
};

var ColFormat = {
    "Default": "default",
    "Percent": "percent"
};

var ColTextAlign = {
    "Left"  : "Left",
    "Right" : "Right",
    "Center": "Center",
    "Wrap"  : "Wrap"
};

var ColumnType = {
    "array"    : "array",
    "boolean"  : "boolean",
    "float"    : "float",
    "integer"  : "integer",
    "mixed"    : "mixed",
    "number"   : "number",
    "object"   : "object",
    "string"   : "string",
    "undefined": "undefined",
    "unknown"  : "unknown"
};

var ColumnSortType = {
    "name": "name",
    "type": "type",
    "prefix": "prefix"
};

var ColumnSortOrder = {
    "ascending" : -1,
    "descending": 1
};

var DSObjTerm = {
    "homeDir": ".",
    "homeDirId": ".",
    "homeParentId": ".parent",
    "OtherUserFolder": "Other Users",
    "OtherUserFolderId": ".other"
};

var DSFormat = {
    "JSON": "JSON",
    "SpecialJSON": "SpecialJSON",
    "CSV": "CSV",
    "XML": "XML"
};

var FileProtocol = {
    "nfs": "file:///",
    "hdfs": "hdfs://",
    "file": "localfile:///",
    "s3": "s3://",
    "mapR": "mapr://",
    "azblob": "azblob://"
};

var fakeEvent = {
    "click"     : {"type": "click", "which": 1},
    "dblclick"  : {"type": "click", "which": 1},
    "mouseup"   : {"type": "mouseup", "which": 1},
    "mousedown" : {"type": "mousedown", "which": 1},
    "mouseenter": {"type": "mouseenter", "which": 1},
    "mouseleave": {"type": "mouseleave", "which": 1},
    "enter"     : {"type": "keypress", "which": 13},
    "enterKeydown": {"type": "keydown", "which": 13},
    "enterKeyup": {"type": "keyup", "which": 13},
    "input": {"type": "input"}
};

var keyCode = {
    Backspace: 8,
    Tab: 9,
    Enter: 13,
    Shift: 16,
    Ctrl: 17,
    Alt: 18,
    PauseBreak: 19,
    Caps: 20,
    Escape: 27,
    Space: 32,
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
    Insert: 45,
    Delete: 46,
    Zero: 48,
    One: 49,
    Two: 50,
    Three: 51,
    Four: 52,
    Five: 53,
    Six: 54,
    Seven: 55,
    Eight: 56,
    Nine: 57,
    Multiply: 106,
    Add: 107,
    Subtract: 109,
    DecimalPoint: 110,
    Divide: 111,
    SemiColon: 186,
    Equal: 187,
    Comma: 188,
    Dash: 189,
    Period: 190,
    SingleQuote: 222,
    PageDown: 34,
    PageUp: 33,
    Home: 36,
    End: 35,
    Y: 89, // for redo
    Z: 90
};

var letterCode = {
    "65": "a",
    "66": "b",
    "67": "c",
    "68": "d",
    "69": "e",
    "70": "f",
    "71": "g",
    "72": "h",
    "73": "i",
    "74": "j",
    "75": "k",
    "76": "l",
    "77": "m",
    "78": "n",
    "79": "o",
    "80": "p",
    "81": "q",
    "82": "r",
    "83": "s",
    "84": "t",
    "85": "u",
    "86": "v",
    "87": "w",
    "88": "x",
    "89": "y",
    "90": "z"
};

var FltOp = {
    "Filter" : "Filter",
    "Exclude": "Exclude"
};

var AggrOp = {
    "Max"       : "Max",
    "Min"       : "Min",
    "Avg"       : "Avg",
    "Count"     : "Count",
    "Sum"       : "Sum",
    "MaxInteger": "MaxInteger",
    "MinInteger": "MinInteger",
    "SumInteger": "SumInteger",
    "ListAgg"   : "ListAgg"
};

var SetupStatus = {
    "Success": "Success",
    "Fail": "Fail",
    "Setup": "Setup"
};

var QueryStatus = {
    "Run": "processing",
    "Done": "done",
    "Error": "error",
    "Cancel": "canceled",
    "RM": "removed"
};

var SQLType = {
    Fail: "fail handler",
    Error: "error",
    Cancel: "cancel"
};

var SQLOps = {
    DSPoint: "importDataSource",
    IndexDS: "indexFromDataset",
    AddOtherUserDS: "addOtherUserDS",
    Sort: "sort",
    Filter: "filter",
    Aggr: "aggregate",
    Map: "map",
    Join: "join",
    GroupBy: "groupBy",
    Project: "project",
    RenameTable: "renameTable",
    RenameOrphanTable: "renameTemporaryTable",
    DeleteTable: "deleteTable",
    DeleteAgg: "deleteAggregate",
    PreviewDS: "previewDataSet",
    DestroyPreviewDS: "destroyPreviewDataSet",
    DestroyDS: "destroyDataSet",
    ExportTable: "exportTable",
    Query: "xcalarQuery",
    Retina: "runBatchDataflow",
    // XI operation
    AddNewCol: "addNewCol",
    HideCol: "hideCol",
    MinimizeCols: "minimizeCols",
    MaximizeCols: "maximizeCols",
    TextAlign: "textAlign",
    ReorderCol: "reorderCol",
    ReorderTable: "reorderTable",
    RenameCol: "renameCol",
    PullCol: "pullCol",
    PullMultipleCols: "pullMultipleCols",
    ArchiveTable: "hideTable",
    ActiveTables: 'activeTables',
    SortTableCols: "sortTableCols",
    ResizeTableCols: "resizeTableCols",
    DragResizeTableCol: "dragResizeTableCol",
    DragResizeRow: "dragResizeRow",
    BookmarkRow: "bookmarkRow",
    RemoveBookmark: "removeBookmark",
    HideTable: "minimizeTable",
    UnhideTable: "maximizeTable",
    AddWS: "addWorksheet",
    RenameWS: "renameWorksheet",
    SwitchWS: "switchWorksheet",
    ReorderWS: "reorderWorksheet",
    DelWS: "deleteWorksheet",
    HideWS: "hideWorksheet",
    UnHideWS: "unhideWorksheet",
    MoveTableToWS: "moveTableToWorkSheet",
    MoveInactiveTableToWS: "moveInactiveTableToWorksheet",
    RevertTable: "revertTable",
    CreateFolder: "createFolder",
    DSRename: "dsRename",
    DSDropIn: "dsDropIn",
    DSInsert: "dsInsert",
    DSToDir: "goToDir",
    DSDropBack: "dsBack",
    DelFolder: "deleteFolder",
    Profile: "profile",
    ProfileAgg: "profileAggregate",
    ProfileStats: "profileStatistics",
    ProfileSort: "profileSort",
    ProfileBucketing: "profileBucketing",
    QuickAgg: "quickAgg",
    Corr: "correlation",
    SplitCol: "splitCol",
    ChangeType: "changeType",
    ChangeFormat: "changeFormat",
    RoundToFixed: "roundToFixed",
    Finalize: "finalizeTable",
    Ext: "extension",
    MarkPrefix: "markPrefix",
    Replay: "Replay"
};

var XcalarMode = {
    Oper: "operational",
    Mod: "modeling",
    Demo: "demo",
    Unlic: "unlicensed",
};

var MLSetting = {
    SuggestJoinKey: "SuggestJoinKey",
    SuggestType: "SuggestType",
    DetectDelim: "DetectDelim",
};

// Should be a superset of MLSetting
var XCTrackerCategory = {
    SuggestJoinKey: "SuggestJoinKey",
};

// system Param
var systemParams = {
    "N": 0,
};

// Global predefined keys
var GlobalKVKeys = {
    InitFlag: "alreadyInit",
    XdFlag: "xdGlobalKey"
};

var InitFlagState = {
    AlreadyInit: "inited",
    NotYetInit: "not inited"
};

var ConcurrencyEnum = {
    NoKey: "Key seems non-existent",
    NoLock: "Lock cannot be undefined",
    AlreadyInit: "Mutex already initialized",
    OverLimit: "Limit exceeded",
    NoKVStore: "kvStore / kvEntry not found"
};

var JoinCompoundOperator = {
    "Left Semi Join": 10,
    "Right Semi Join": 11,
    "Left Anti Semi Join": 12,
    "Right Anti Semi Join": 13,
    "Cross Join": 14,
};

var JoinCompoundOperatorTStr = {
    LeftSemiJoin: "Left Semi Join",
    RightSemiJoin: "Right Semi Join",
    LeftAntiSemiJoin: "Left Anti Semi Join",
    RightAntiSemiJoin: "Right Anti Semi Join",
    CrossJoin: "Cross Join"
};
