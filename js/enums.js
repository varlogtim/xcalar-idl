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
}

var AfterStartup = {
    After: true,
    Before: false
}

var SelectUnit = {
    All: true,
    Single: false
}

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
}

var ArchiveTable = {
    Delete: true,
    Keep: false
}

var TableType = {
    "InActive": "inactive",
    "Active"  : "active",
    "Orphan"  : "orphaned",
    "Unknown" : "unknown source"
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
};

var SQLType = {
    Fail: "fail handler"
};

var SQLOps = {
    DSLoad : "loadDataSet",
    IndexDS: "indexFromDataset",
    Sort: "sort",
    Filter: "filter",
    Aggr: "aggregate",
    Map: "map",
    JoinMap: "multiJoinMap",
    GroupbyMap: "groupbyMap",
    CheckIndex: "checkIndex",
    Join: "join",
    GroupBy: "groupBy",
    GroupByIndex: "groupByIndex",
    RenameTable: "renameTable",
    RenameOrphanTable: "renameOrphanTable",
    DeleteTable: "deleteTable",
    PreviewDS: "previewDataSet",
    DestroyPreviewDS: "destroyPreviewDataSet",
    DestroyDS: "destroyDataSet",
    // XI operation
    AddDS: "addDataset",
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
    ArchiveTable: "archiveTable",
    TableBulkActions: "tableBulkActions",
    SortTableCols: "sortTableCols",
    HideTable: "hideTable",
    UnhideTable: "unhideTable",
    AddWS: "addWorksheet",
    RenameWS: "renameWorksheet",
    SwitchWS: "switchWorksheet",
    DelWS: "deleteWorksheet",
    MoveTableToWS: "moveTableToWorkSheet",
    AddNoSheetTables: "addNoSheetTables",
    CreateFolder: "createFolder",
    DSRename: "dsRename",
    DSDropIn: "dsDropIn",
    DSInsert: "dsInsert",
    DSToDir: "goToDir",
    DSDropBack: "dsBack",
    DelFolder: "deleteFolder",
    ProfileAction: "profileAction",
    Profile: "profile",
    ProfileSort: "profileSort",
    ProfileClose: "profileClose",
    QuickAggAction: "quickAggAction",
    QuickAgg: "quickAgg"
};
