enum DagNodeType {
    Aggregate = "aggregate",
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
    NoLinkInGraph = "Cannot find the linked node",
    NoAggNode = "Cannot find the aggregate node",
    CycleInLink = "Cycle In Link",
    LinkOutNotExecute = "The linked node only allow linking after execution",
    InvalidOptimizedOutNode = "Valid terminal nodes must be either Export optimized or Link out optimized",
    InvalidOptimizedOutNodeCombo = "Optimized dataflow cannot have both Export and Link Out nodes",
    InvalidOptimizedLinkOutCount = "Optimized dataflow cannot have multiple Link Out nodes",
    Disjoint = "Multiple disjoint dataflows detected. Optimized execution can only occur on 1 continuous dataflow.",
}

enum DagGraphEvents {
    LockChange = "GraphLockChange"
}

enum DagNodeEvents {
    AggregateChange = "DagNodeAggregateChange",
    ConnectionChange = "ConnectionChange",
    DescriptionChange = "DescriptionChange",
    LineageSourceChange = "DagNodeLineageSourceChange",
    ParamChange = "DagNodeParamChange",
    StateChange = "DagNodeStateChange",
    SubGraphConfigured = "SubGraphConfigured",
    SubGraphError = "SubGraphError",
    TableLockChange = "DagNodeTableLockChange",
    TableRemove = "TableRemove",
    TitleChange = "TitleChange"
}

enum DagCategoryType {
    Favorites = "favorites",
    In = "in",
    Out = "out",
    Value = "value",
    Operations = "operations",
    Column = "column",
    Join = "join",
    Set = "set",
    Extensions = "extensions",
    SQL = "SQL",
    Custom = "custom",
}

if (typeof exports !== 'undefined') {
    exports.DagNodeType = DagNodeType;
    exports.DagNodeSubType = DagNodeSubType;
}