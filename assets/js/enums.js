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
    Eval: 2,
};

var AffectedEntryAction = {
    AddConnected: 1,
    DelConnected: 2,
    DelConnectedRemoveEntry: 3,
};

var SyncOrAsync = {
    Sync: true,
    Async: false
};

var ArchiveTable = {
    Delete: true,
    Keep: false
};

var DelWSType = {
    "Del": "delete tables",
    "Archive": "archive tables",
    "Empty": 'empty sheet'
};

var TableType = {
    "Active"  : "active",
    "Archived": "archived",
    "Agg"     : "aggregate",
    "Orphan"  : "orphaned",
    "WSHidden": "hidden",
    "Unknown" : "unknown source",
    "Trash"   : "trashed"
};

var DSObjTerm = {
    "homeDir": ".",
    "homeDirId": ".",
    "homeParentId": ".parent",
    "OtherUserFolder": "Other Users",
    "OtherUserFolderId": ".other"
};

var FileProtocol = {
    "file": "file:///",
    "nfs": "nfs:///",
    "hdfs": "hdfs://"
};

var fakeEvent = {
    "click"     : {"type": "click", "which": 1},
    "dblclick"  : {"type": "click", "which": 1},
    "mouseup"   : {"type": "mouseup", "which": 1},
    "mousedown" : {"type": "mousedown", "which": 1},
    "mouseenter": {"type": "mouseenter", "which": 1},
    "enter"     : {"type": "keypress", "which": 13},
    "enterKeydown": {"type": "keydown", "which": 13}
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

var SQLType = {
    Fail: "fail handler",
    Error: "error",
    Cancel: "cancel"
};

var SQLOps = {
    DSLoad : "loadDataSet",
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
    RenameOrphanTable: "renameOrphanTable",
    DeleteTable: "deleteTable",
    PreviewDS: "previewDataSet",
    DestroyPreviewDS: "destroyPreviewDataSet",
    DestroyDS: "destroyDataSet",
    ExportTable: "exportTable",
    // XI operation
    AddNewCol: "addNewCol",
    DeleteCol: "deleteCol",
    HideCols: "hideCols",
    UnHideCols: "unHideCols",
    TextAlign: "textAlign",
    DupCol: "duplicateCol",
    DelDupCol: "delDupCol",
    DelAllDupCols: "delAllDupCols",
    ReorderCol: "reorderCol",
    ReorderTable: "reorderTable",
    RenameCol: "renameCol",
    PullCol: "pullCol",
    PullAllCols: "pullAllCols",
    ArchiveTable: "archiveTable",
    ActiveTables: 'activeTables',
    SortTableCols: "sortTableCols",
    ResizeTableCols: "resizeTableCols",
    DragResizeTableCol: "dragResizeTableCol",
    DragResizeRow: "dragResizeRow",
    BookmarkRow: "bookmarkRow",
    RemoveBookmark: "removeBookmark",
    HideTable: "hideTable",
    UnhideTable: "unhideTable",
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
    ProfileSort: "profileSort",
    ProfileBucketing: "profileBucketing",
    QuickAgg: "quickAgg",
    Corr: "correlation",
    SplitCol: "splitCol",
    ChangeType: "changeType",
    ChangeFormat: "changeFormat",
    RoundToFixed: "roundToFixed",
    Ext: "extension"
};

var TooltipTemplate = {
    "Error": '<div class="tooltip error" role="tooltip">' +
                    '<div class="tooltip-arrow"></div>' +
                    '<div class="tooltip-inner"></div>' +
                '</div>'
};

