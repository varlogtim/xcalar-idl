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
    Extension = "extension",
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
    Synthesize = "synthesize",
    UpdateIMD = "updateIMD",
    SQLFuncIn = "SQLFuncIn",
    SQLFuncOut = "SQLFuncOut",
    Deskew = "Deskew"
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
    NoGraph = "Cannot find linked graph",
    NoNode = "Invalid node that is not in the graph specified",
    NoAggNode = "Corresponding aggregate node either does not exist or has not been executed",
    AggNotExecute = "Must execute the aggregate manually before using it",
    CycleInLink = "Cycle In Link",
    LinkOutNotExecute = "The linked node only allow linking after execution",
    InvalidLinkOutColumns = "Link out node must export at least 1 column in order to create optimized dataflow",
    InvalidOptimizedOutNode = "Valid terminal nodes must be either Export or Link Out node",
    InvalidOptimizedOutNodeCombo = "Optimized dataflow cannot have both Export and Link Out nodes",
    InvalidOptimizedLinkOutCount = "Optimized dataflow cannot have multiple Link Out nodes",
    InvalidOptimizedLinkOutOptimizedCount = "Optimized dataflow cannot have multiple Link Out nodes",
    InvalidOptimizedDuplicateExport = "Optimized dataflow cannot have multiple export nodes originating from the same node",
    Disjoint = "Multiple disjoint dataflows detected. Optimized execution can only occur on 1 continuous dataflow.",
    NoColumn = "Invalid column in the schema:\n",
    NoColumns = "Invalid columns in the schema:\n",
    NoAccessToSource = "Dataset does not exist or you have no rights to access it. Please change the node configuration or restore the dastaset.",
    InvalidSQLFunc = "Invalid SQL Function",
}

enum DagNodeLinkInErrorType {
    NoGraph = "Cannot find linked graph",
    NoLinkInGraph = "Cannot find the linked node",
    MoreLinkGraph = "More than one link out node with the same name specified by the linked in node are found"
}

enum DagGraphEvents {
    LockChange = "GraphLockChange",
    TurnOffSave = "TurnOffSave",
    TurnOnSave = "TurnOnSave",
    Save = "Save",
    AddSQLFuncInput = "AddSQLFuncInput",
    RemoveSQLFucInput = "RemoveSQLFuncInput",
    AddBackSQLFuncInput = "AddBackSQLFuncInput",
    DeleteGraph = "DeleteGraph"
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
    TableLockChange = "DagNodeTableLockChange",
    TableRemove = "TableRemove",
    TitleChange = "TitleChange",
    AutoExecute = "AutoExecute",
    RetinaRemove = "RetinaRemove",
    StartSQLCompile = "StartSQLCompile",
    EndSQLCompile = "EndSQLCompile",
    UDFErrorChange = "UDFErrorChange"
}

enum DagCategoryType {
    Favorites = "favorites",
    In = "in",
    Out = "out",
    SQL = "SQL",
    ColumnOps = "columnOps",
    RowOps = "rowOps",
    Join = "join",
    Set = "set",
    Aggregates = "aggregates",
    Extensions = "extensions",
    Custom = "custom",
    Hidden = "hidden"
}


const DagNodeTooltip = {};

DagNodeTooltip[DagNodeType.Aggregate] = "Calculates the selected aggregate value of a column";
DagNodeTooltip[DagNodeType.Custom] = "These compound operators are user-defined";
// DagNodeTooltip[DagNodeType.CustomInput] = "customInput";
// DagNodeTooltip[DagNodeType.CustomOutput] = "customOutput";
DagNodeTooltip[DagNodeType.Dataset] = "Sources data from a dataset";
DagNodeTooltip[DagNodeType.DFIn] = "Sources data from another dataflow";
DagNodeTooltip[DagNodeType.DFOut] = "Exports the results of a dataflow to another dataflow";
DagNodeTooltip[DagNodeType.Explode] = "Separates a column into rows using a delimiter";
DagNodeTooltip[DagNodeType.Export] = "Exports the results of a dataflow via an export driver";
DagNodeTooltip[DagNodeType.Extension] = "Applies an extension on a result";
DagNodeTooltip[DagNodeType.Filter] = "Filters results using a selected function";
DagNodeTooltip[DagNodeType.GroupBy] = "Summarizes results using an aggregate function";
DagNodeTooltip[DagNodeType.IMDTable] = "Sources data from a published IMD Table";
// DagNodeTooltip[DagNodeType.Index] = "index";
DagNodeTooltip[DagNodeType.Join] = "Joins two tables on a set of common columns";
DagNodeTooltip[DagNodeType.Jupyter] = "Converts the results of a dataflow into a Pandas Dataframe inside a Jupyter Notebook";
DagNodeTooltip[DagNodeType.Map] = "Applies a selected function across a column";
DagNodeTooltip[DagNodeType.Project] = "Removes columns from the result set";
DagNodeTooltip[DagNodeType.PublishIMD] = "Publishes the results of the dataflow as a table and enables it for inserts, modifies and deletes";
DagNodeTooltip[DagNodeType.Round] = "Rounds a column of float numbers";
DagNodeTooltip[DagNodeType.RowNum] = "Adds a row number column";
// DagNodeTooltip[DagNodeType.Set] = "set";
DagNodeTooltip[DagNodeType.Sort] = "Sorts results according to a column";
// DagNodeTooltip[DagNodeType.Source] = "source";
DagNodeTooltip[DagNodeType.Split] = "Separates a column into columns using a delimiter";
DagNodeTooltip[DagNodeType.SQL] = "Runs a SQL query";
// DagNodeTooltip[DagNodeType.SQLSubInput] = "SQLSubInput";
// DagNodeTooltip[DagNodeType.SQLSubOutput] = "SQLSubOutput";
// DagNodeTooltip[DagNodeType.SubGraph] = "subGraph";
// DagNodeTooltip[DagNodeType.Placeholder] = "placeholder";
// DagNodeTooltip[DagNodeType.Synthesize] = "synthesize";
// DagNodeTooltip[DagNodeType.UpdateIMD] = "updateIMD";
// DagNodeTooltip[DagNodeType.SQLFuncIn] = "SQLFuncIn";
// DagNodeTooltip[DagNodeType.SQLFuncOut] = "SQLFuncOut";

DagNodeTooltip[DagNodeSubType.Cast] = "Changes the data type of a column";
DagNodeTooltip[DagNodeSubType.LookupJoin] = "Augments the rows on the left table with values from the right table based on common columns";
DagNodeTooltip[DagNodeSubType.FilterJoin] = "Filters the left table based on rows in the right table";
DagNodeTooltip[DagNodeSubType.Union] = "Returns all rows from input tables";
DagNodeTooltip[DagNodeSubType.Intersect] = "Returns rows in common between input tables";
DagNodeTooltip[DagNodeSubType.Except] = "Returns distinct rows that are in only one input table";
DagNodeTooltip[DagNodeSubType.ExportOptimized] = "Exports the results of an optimized dataflow via an export driver";
DagNodeTooltip[DagNodeSubType.DFOutOptimized] = "Exports the results of an optimized dataflow to another dataflow";



const DagCategoryTooltip = {};

// DagCategoryTooltip[DagCategoryType.Favorites] = "favorites";
DagCategoryTooltip[DagCategoryType.In] = "These operators input data to the dataflow";
DagCategoryTooltip[DagCategoryType.Out] = "These operators output data from the dataflow";
DagCategoryTooltip[DagCategoryType.SQL] = "These operators apply SQL";
DagCategoryTooltip[DagCategoryType.ColumnOps] = "These operators target columns";
DagCategoryTooltip[DagCategoryType.RowOps] = "These operators target rows";
DagCategoryTooltip[DagCategoryType.Join] = "These operators join tables";
DagCategoryTooltip[DagCategoryType.Set] = "These operators apply set operations";
DagCategoryTooltip[DagCategoryType.Aggregates] = "These operators compute results based on aggregate functions";
DagCategoryTooltip[DagCategoryType.Extensions] = "These operators apply extensions";
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
}