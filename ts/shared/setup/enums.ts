enum RowDirection {
    Top = 1,
    Bottom = 2
}

enum WSTableType {
    Active = "tables",
    TempHidden = "tempHiddenTables",
    Undo = "undoneTables",
    Lock = "lockedTables",
    Pending = "pendingTables"
}

enum DelWSType {
    Del = "drop tables",
    Empty = "empty sheet",
    Temp = "temp list"
}

enum TableType {
    Active = "active",
    Orphan = "orphaned",
    WSHidden = "hidden",
    Unknown = "unknown source",
    Trash = "trashed",
    Undone = "undone",
    Aggregate = "aggregate",
    Dropped = "dropped"
}

enum ColDir {
    Left = "L",
    Right = "R"
}

enum ColFormat {
    Default = "default",
    Percent = "percent"
}

enum ColTextAlign {
    Left = "Left",
    Right = "Right",
    Center = "Center",
    Wrap = "Wrap"
}

enum ColumnType {
    array = "array",
    boolean = "boolean",
    float = "float",
    integer = "integer",
    mixed = "mixed",
    number = "number",
    object = "object",
    string = "string",
    undefined = "undefined",
    unknown = "unknown"
}

enum ColumnSortType {
    name = "name",
    type = "type",
    prefix = "prefix"
}

enum ColumnSortOrder {
    ascending = -1,
    descending = 1
}

enum DSObjTerm {
    homeDir = ".",
    homeDirId = ".",
    homeParentId = ".parent",
    SharedFolder = "Shared",
    SharedFolderId = ".shared"
}

enum DSFormat {
    JSON ="JSON",
    SpecialJSON = "SpecialJSON",
    CSV = "CSV",
    XML = "XML"
}

enum FileProtocol {
    nfs = "file:///"
}

var fakeEvent: any = {
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

enum keyCode {
    Backspace = 8,
    Tab = 9,
    Enter = 13,
    Shift = 16,
    Ctrl = 17,
    Alt = 18,
    PauseBreak = 19,
    Caps = 20,
    Escape = 27,
    Space = 32,
    Left = 37,
    Up = 38,
    Right = 39,
    Down = 40,
    Insert = 45,
    Delete = 46,
    Zero = 48,
    One = 49,
    Two = 50,
    Three = 51,
    Four = 52,
    Five = 53,
    Six = 54,
    Seven = 55,
    Eight = 56,
    Nine = 57,
    Multiply = 106,
    Add = 107,
    Subtract = 109,
    DecimalPoint = 110,
    Divide = 111,
    SemiColon = 186,
    Equal = 187,
    Comma = 188,
    Dash = 189,
    Period = 190,
    SingleQuote = 222,
    PageDown = 34,
    PageUp = 33,
    Home = 36,
    End = 35,
    Y = 89, // for redo
    Z = 90
}

var letterCode: any = {
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

enum FltOp {
    Filter  = "Filter",
    Exclude = "Exclude"
}

enum AggrOp {
    Max = "Max",
    Min = "Min",
    Avg = "Avg",
    Count = "Count",
    Sum = "Sum",
    MaxInteger = "MaxInteger",
    MinInteger = "MinInteger",
    SumInteger = "SumInteger",
    ListAgg = "ListAgg"
}

enum QueryStatus {
    Run = "processing",
    Done = "done",
    Error = "error",
    Cancel = "canceled",
    RM = "removed"
}

enum PatternCategory {
    Dataset = "dataset",
    Export = "export",
    Dataflow = "dataflow",
    Folder = "folder",
    Param = "param",
    Prefix = "prefix",
    UDF = "udf",
    UDFFn = "udfFn",
    Workbook = "workbook",
    Target = "target"
}

enum PatternAction {
    Fix = "fix",
    Check = "check",
    Get = "get"
}

enum SQLType {
    Fail = "fail handler",
    Error = "error",
    Cancel = "cancel"
}

enum SQLOps {
    DSPoint = "importDataSource",
    IndexDS = "indexFromDataset",
    Sort = "sort",
    Filter = "filter",
    Aggr = "aggregate",
    Map = "map",
    Join = "join",
    Union = "union",
    GroupBy = "groupBy",
    Project = "project",
    RenameTable = "renameTable",
    RenameOrphanTable = "renameTemporaryTable",
    DeleteTable = "deleteTable",
    DeleteAgg = "deleteAggregate",
    PreviewDS = "previewDataSet",
    DestroyPreviewDS = "destroyPreviewDataSet",
    DestroyDS = "destroyDataSet",
    ExportTable = "exportTable",
    Query = "xcalarQuery",
    Retina = "runBatchDataflow",
    ListFiles = "listFiles",
    // XI operation
    AddNewCol = "addNewCol",
    HideCol = "hideCol",
    MinimizeCols = "minimizeCols",
    MaximizeCols = "unminimizeCols",
    TextAlign = "textAlign",
    ReorderCol = "reorderCol",
    ReorderTable = "reorderTable",
    RenameCol = "renameCol",
    PullCol = "pullCol",
    PullMultipleCols = "pullMultipleCols",
    ActiveTables = 'activeTables',
    SortTableCols = "sortTableCols",
    ResizeTableCols = "resizeTableCols",
    DragResizeTableCol = "dragResizeTableCol",
    DragResizeRow = "dragResizeRow",
    HideTable = "minimizeTable",
    UnhideTable = "unminimizeTable",
    AddWS = "addWorksheet",
    RenameWS = "renameWorksheet",
    SwitchWS = "switchWorksheet",
    ReorderWS = "reorderWorksheet",
    DelWS = "deleteWorksheet",
    HideWS = "hideWorksheet",
    UnHideWS = "unhideWorksheet",
    MakeTemp = "sendTableToTemporary",
    MoveTableToWS = "moveTableToWorkSheet",
    MoveTemporaryTableToWS = "moveTemporaryTableToWorksheet",
    RevertTable = "revertTable",
    CreateFolder = "createFolder",
    DSRename = "dsRename",
    DSDropIn = "dsDropIn",
    DSInsert = "dsInsert",
    DSToDir = "goToDir",
    DSDropBack = "dsBack",
    DelFolder = "deleteFolder",
    Profile = "profile",
    ProfileAgg = "profileAggregate",
    ProfileStats = "profileStatistics",
    ProfileSort = "profileSort",
    ProfileBucketing = "profileBucketing",
    QuickAgg = "quickAgg",
    Corr = "correlation",
    SplitCol = "splitCol",
    ChangeType = "changeType",
    ChangeFormat = "changeFormat",
    RoundToFixed = "roundToFixed",
    Finalize = "finalizeTable",
    Ext = "extension",
    MarkPrefix = "markPrefix",
    Replay = "Replay",
    DFRerun = "Dataflow Rerun",
    ExecSQL = "Execute SQL"
}

enum XcalarMode {
    Oper = "operational",
    Mod = "modeling",
    Unlic = "unlicensed",
}

enum MLSetting {
    SuggestJoinKey = "SuggestJoinKey"
}

// system Param
enum systemParams {
    N = 0,
}

// Global predefined keys
enum GlobalKVKeys {
    InitFlag = "alreadyInit",
    XdFlag = "xdGlobalKey"
}

enum InitFlagState {
    AlreadyInit = "inited",
    NotYetInit = "not inited"
}

enum ConcurrencyEnum {
    NoKey = "Key seems non-existent",
    NoLock = "Lock cannot be undefined",
    AlreadyInit = "Mutex already initialized",
    OverLimit = "Limit exceeded",
    NoKVStore = "kvStore / kvEntry not found"
}

enum JoinCompoundOperator {
    "Left Semi Join" = 10,
    "Right Semi Join" = 11,
    "Left Anti Semi Join" = 12,
    "Right Anti Semi Join" = 13,
    "Existence Join" = 14,
}

enum JoinCompoundOperatorTStr {
    LeftSemiJoin = "Left Semi Join",
    RightSemiJoin = "Right Semi Join",
    LeftAntiSemiJoin = "Left Anti Semi Join",
    RightAntiSemiJoin = "Right Anti Semi Join",
    ExistenceJoin = "Existence Join",
}

if (typeof global !== 'undefined') {
    global.RowDirection = RowDirection;
    global.WSTableType = WSTableType;
    global.DelWSType = DelWSType;
    global.TableType = TableType;
    global.ColDir = ColDir;
    global.ColFormat = ColFormat;
    global.ColTextAlign = ColTextAlign;
    global.ColumnType = ColumnType;
    global.ColumnSortType = ColumnSortType;
    global.ColumnSortOrder = ColumnSortOrder;
    global.DSObjTerm = DSObjTerm;
    global.DSFormat = DSFormat;
    global.FileProtocol = FileProtocol;
    global.keyCode = keyCode;
    global.FltOp = FltOp;
    global.AggrOp = AggrOp;
    global.QueryStatus = QueryStatus;
    global.PatternCategory = PatternCategory;
    global.PatternAction = PatternAction;
    global.SQLType = SQLType;
    global.SQLOps = SQLOps;
    global.XcalarMode = XcalarMode;
    global.MLSetting = MLSetting;
    global.systemParams = systemParams;
    global.GlobalKVKeys = GlobalKVKeys;
    global.InitFlagState = InitFlagState;
    global.ConcurrencyEnum = ConcurrencyEnum;
    global.JoinCompoundOperator = JoinCompoundOperator;
    global.JoinCompoundOperatorTStr = JoinCompoundOperatorTStr;
}