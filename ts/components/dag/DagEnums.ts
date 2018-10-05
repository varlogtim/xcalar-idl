enum DagNodeType {
    SubGraph = "subGraph",
    Source = "source",
    Dataset = "dataset",
    DFIn = "link in",
    DFOut = "link out",
    Filter = "filter",
    Join = "join",
    Set = "set",
    Export = "export",
    Aggregate = "aggregate",
    Map = "map",
    GroupBy = "groupBy",
    Project = "project",
    SQL = "sql",
    Extension = "extension",
    Custom = "custom",
    CustomInput = "customInput",
    CustomOutput = "customOutput",
    IMDTable = "IMDTable",
    PublishIMD = "publishIMD"
}

enum DagNodeSubType {
    Cast = "cast",
    LookupJoin = "LookupJoin"
}

enum DagNodeState {
    Unused = "unused",
    Configured = "Configured",
    Running = "running",
    Complete = "Complete",
    Error = "Error"
}

enum DagNodeErrorType {
    Unconfigured = "Unconfigured",
    MissingSource = "Missing Source",
    Invalid = "Invalid Configuration",
    NoGraph = "Cannot find linked graph",
    NoLinkInGraph = "Cannot find the linked node",
    CycleInLink = "Cycle In Link"
}

enum DagNodeEvents {
    StateChange = "DagNodeStateChange",
    ParamChange = "DagNodeParamChange",
    AggregateChange = "DagNodeAggregateChange",
    TableRemove = "TableRemove",
    SubGraphError = "SubGraphError",
    SubGraphConfigured = "SubGraphConfigured",
    ConnectionChange = "ConnecdtionChange"
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