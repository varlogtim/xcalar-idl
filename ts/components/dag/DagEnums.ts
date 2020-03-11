enum DagNodeType {
    Aggregate = "singleValue",
    Custom = "custom",
    CustomInput = "customInput",
    CustomOutput = "customOutput",
    Dataset = "dataset",
    DFIn = "link in",
    DFOut = "link out",
    Explode = "explode",
    Export = "export",
    Filter = "filter",
    GroupBy = "groupBy",
    IMDTable = "IMDTable",
    Index = "index",
    Join = "join",
    Jupyter = "Jupyter",
    Map = "map",
    Project = "project",
    PublishIMD = "publishIMD",
    Round = "round",
    RowNum = "rowNum",
    Set = "set",
    Sort = "sort",
    Source = "source",
    Split = "split",
    SQL = "sql",
    SQLSubInput = "SQLSubInput",
    SQLSubOutput = "SQLSubOutput",
    SubGraph = "subGraph",
    Placeholder = "placeholder",
    Instruction = "instruction",
    Synthesize = "synthesize",
    SQLFuncIn = "SQLFuncIn",
    SQLFuncOut = "SQLFuncOut",
    Deskew = "Deskew",
    Module = "Module"
}

enum DagNodeSubType {
    Cast = "cast",
    LookupJoin = "LookupJoin",
    FilterJoin = "FilterJoin",
    Union = "Union",
    Intersect = "Intersect",
    Except = "Except",
    ExportOptimized = "Export Optimized",
    DFOutOptimized = "link out Optimized",
}

enum DagNodeState {
    Unused = "Unused",
    Configured = "Configured",
    Running = "Running",
    Complete = "Complete",
    Error = "Error"
}

enum DagNodeErrorType {
    Unconfigured = "Unconfigured",
    MissingSource = "Missing Source",
    Invalid = "Invalid Configuration",
    NoGraph = "Cannot find linked function",
    NoNode = "Invalid operator that is not in the graph specified",
    NoAggNode = "Corresponding aggregate operator either does not exist or has not been executed",
    AggNotExecute = "Must execute the aggregate manually before using it",
    CycleInLink = "Cycle In Link",
    LinkOutNotExecute = "The linked operator only allow linking after execution",
    InvalidLinkOutColumns = "Function outut operator must export at least 1 column in order to create optimized application",
    InvalidOptimizedOutNode = "Valid terminal operators must be either Export or Function Output",
    InvalidOptimizedOutNodeCombo = "Optimized application cannot have both Export and Function Output operators",
    InvalidOptimizedLinkOutCount = "Optimized application cannot have multiple Function Output operators",
    InvalidOptimizedLinkOutOptimizedCount = "Optimized application cannot have multiple Function Output operators",
    InvalidOptimizedDuplicateExport = "Optimized application cannot have multiple export operators originating from the same operator",
    Disjoint = "Multiple disjoint modules detected. Optimized execution can only occur on 1 continuous module.",
    NoColumn = "Invalid column in the schema:\n",
    NoColumns = "Invalid columns in the schema:\n",
    NoAccessToSource = "Dataset does not exist or you have no rights to access it. Please change the configuration or restore the dastaset.",
    InvalidSQLFunc = "Invalid Table Function",
    SQLFuncOutDupCol = "Table function's output has duplicate column name (the output's column name is case insensitivie)"
}

enum DagNodeLinkInErrorType {
    NoGraph = "Cannot find linked function",
    NoLinkInGraph = "Cannot find the linked operator",
    MoreLinkGraph = "More than one function output with the same name specified by the function input operator are found"
}

enum DagGraphEvents {
    LockChange = "GraphLockChange",
    TurnOffSave = "TurnOffSave",
    TurnOnSave = "TurnOnSave",
    Save = "Save",
    AddSQLFuncInput = "AddSQLFuncInput",
    RemoveSQLFucInput = "RemoveSQLFuncInput",
    AddBackSQLFuncInput = "AddBackSQLFuncInput",
    DeleteGraph = "DeleteGraph",
    NewNode = "NewNode",
    RemoveNode = "RemoveNode",
}

enum DagNodeEvents {
    AggregateChange = "DagNodeAggregateChange",
    ConnectionChange = "ConnectionChange",
    DescriptionChange = "DescriptionChange",
    LineageSourceChange = "DagNodeLineageSourceChange",
    LineageChange = "DagNodeLineageChange",
    LineageReset = "DagNodeLineageReset",
    ParamChange = "DagNodeParamChange",
    StateChange = "DagNodeStateChange",
    ResultSetChange = "DagNodeResultSetChange",
    ProgressChange = "DagNodeProgressChange",
    SubGraphConfigured = "SubGraphConfigured",
    SubGraphError = "SubGraphError",
    TableRemove = "TableRemove",
    TitleChange = "TitleChange",
    HeadChange = "HeadChange",
    AutoExecute = "AutoExecute",
    RetinaRemove = "RetinaRemove",
    StartSQLCompile = "StartSQLCompile",
    EndSQLCompile = "EndSQLCompile",
    UDFErrorChange = "UDFErrorChange",
    PreTablePin = "PreTablePin",
    PostTablePin = "PostTablePin",
    PreTableUnpin = "PreTableUnpin",
    PostTableUnpin = "PostTableUnpin",
    Hide = "Hide",
    Save = "Save",
    UpdateProgress = "DagNodeUpdateProgress"
}

enum DagCategoryType {
    In = "in",
    Out = "out",
    SQL = "SQL",
    ColumnOps = "columnOps",
    RowOps = "rowOps",
    Join = "join",
    Set = "set",
    Aggregates = "aggregates",
    Custom = "custom",
    Hidden = "hidden"
}

enum DagTabType {
    User = "Normal",
    SQLFunc = "Table Function",
    Custom = "Custom",
    Optimized = "Optimized",
    Query = "Query",
    SQL = "SQL",
    SQLExecute = "SQL Execute Graph",
    Stats = "Stats",
    Main = "Main"
}

const DagNodeTooltip = {};

DagNodeTooltip[DagNodeType.Aggregate] = "Calculates the selected aggregate value of a column";
DagNodeTooltip[DagNodeType.Custom] = "These compound operators are user-defined";
// DagNodeTooltip[DagNodeType.CustomInput] = "customInput";
// DagNodeTooltip[DagNodeType.CustomOutput] = "customOutput";
DagNodeTooltip[DagNodeType.Dataset] = "Sources data from a dataset";
DagNodeTooltip[DagNodeType.DFIn] = "Sources data from another module";
DagNodeTooltip[DagNodeType.DFOut] = "Exports the results of a module to another module";
DagNodeTooltip[DagNodeType.Explode] = "Separates a column into rows using a delimiter";
DagNodeTooltip[DagNodeType.Export] = "Exports the results of a module via an export driver";
DagNodeTooltip[DagNodeType.Filter] = "Filters tables using a selected function";
DagNodeTooltip[DagNodeType.GroupBy] = "Summarizes tables using an aggregate function";
DagNodeTooltip[DagNodeType.IMDTable] = "Sources data from a published IMD Table";
// DagNodeTooltip[DagNodeType.Index] = "index";
DagNodeTooltip[DagNodeType.Join] = "Joins two tables on a set of common columns";
DagNodeTooltip[DagNodeType.Jupyter] = "Converts the results of a module into a Pandas Dataframe inside a Jupyter Notebook";
DagNodeTooltip[DagNodeType.Map] = "Applies a selected function across a column";
DagNodeTooltip[DagNodeType.Project] = "Removes columns from the table";
DagNodeTooltip[DagNodeType.PublishIMD] = "Publishes the results of the module as a published table and enables it for inserts, modifies and deletes";
DagNodeTooltip[DagNodeType.Round] = "Rounds a column of float numbers";
DagNodeTooltip[DagNodeType.RowNum] = "Adds a row number column";
// DagNodeTooltip[DagNodeType.Set] = "set";
DagNodeTooltip[DagNodeType.Sort] = "Sorts tables according to a column";
// DagNodeTooltip[DagNodeType.Source] = "source";
DagNodeTooltip[DagNodeType.Split] = "Separates a column into columns using a delimiter";
DagNodeTooltip[DagNodeType.SQL] = "Runs a SQL query";
DagNodeTooltip[DagNodeType.Deskew] = "Reduce the data skew by resharding the data on the selected column";
// DagNodeTooltip[DagNodeType.SQLSubInput] = "SQLSubInput";
// DagNodeTooltip[DagNodeType.SQLSubOutput] = "SQLSubOutput";
// DagNodeTooltip[DagNodeType.SubGraph] = "subGraph";
// DagNodeTooltip[DagNodeType.Placeholder] = "placeholder";
// DagNodeTooltip[DagNodeType.Synthesize] = "synthesize";
// DagNodeTooltip[DagNodeType.SQLFuncIn] = "SQLFuncIn";
// DagNodeTooltip[DagNodeType.SQLFuncOut] = "SQLFuncOut";

DagNodeTooltip[DagNodeSubType.Cast] = "Changes the data type of a column";
DagNodeTooltip[DagNodeSubType.LookupJoin] = "Augments the rows on the left table with values from the right table based on common columns";
DagNodeTooltip[DagNodeSubType.FilterJoin] = "Filters the left table based on rows in the right table";
DagNodeTooltip[DagNodeSubType.Union] = "Returns all rows from input tables";
DagNodeTooltip[DagNodeSubType.Intersect] = "Returns rows in common between input tables";
DagNodeTooltip[DagNodeSubType.Except] = "Returns distinct rows that are in only one input table";
DagNodeTooltip[DagNodeSubType.ExportOptimized] = "Exports the results of an optimized application via an export driver";
DagNodeTooltip[DagNodeSubType.DFOutOptimized] = "Exports the results of an optimized application to another module";



const DagCategoryTooltip = {};

DagCategoryTooltip[DagCategoryType.In] = "These operators input data to the module";
DagCategoryTooltip[DagCategoryType.Out] = "These operators output data from the module";
DagCategoryTooltip[DagCategoryType.SQL] = "These operators apply SQL";
DagCategoryTooltip[DagCategoryType.ColumnOps] = "These operators target columns";
DagCategoryTooltip[DagCategoryType.RowOps] = "These operators target rows";
DagCategoryTooltip[DagCategoryType.Join] = "These operators join tables";
DagCategoryTooltip[DagCategoryType.Set] = "These operators apply set operations";
DagCategoryTooltip[DagCategoryType.Aggregates] = "These operators compute results based on aggregate functions";
DagCategoryTooltip[DagCategoryType.Custom] = "These compound operators are user-defined";

enum DagColumnChangeType {
    Hide = "hide",
    Pull = "pull",
    Resize = "resize",
    TextAlign = "textAlign",
    Reorder = "reorder"
}


if (typeof exports !== 'undefined') {
    exports.DagNodeType = DagNodeType;
    exports.DagNodeSubType = DagNodeSubType;
    exports.DagNodeState = DagNodeState;
    exports.DagNodeEvents = DagNodeEvents;
    exports.DagGraphEvents = DagGraphEvents;
    exports.DagNodeErrorType = DagNodeErrorType;
    exports.DagNodeLinkInErrorType = DagNodeLinkInErrorType;
    exports.DagNodeTooltip = DagNodeTooltip;
    exports.DagTabType = DagTabType;
}