enum DagNodeType {
    SubGraph = "subGraph",
    Source = "source",
    Dataset = "dataset",
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
    CustomInput = "customInput"
}

enum DagNodeSubType {
    Cast = "cast",
}

enum DagNodeState {
    Unused = "unused",
    Configured = "Configured",
    Running = "running",
    Complete = "Complete",
    Error = "Error"
}

enum DagNodeErrorType {
    Unconfigured  = "Unconfigured",
    MissingSource = "MissingSource"
}

enum DagNodeEvents {
    StateChange = "DagNodeStateChange",
    ParamChange = "DagNodeParamChange",
    TableRemove = "TableRemove",
    SubGraphError = "SubGraphError",
    SubGraphConfigured = "SubGraphConfigured"
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