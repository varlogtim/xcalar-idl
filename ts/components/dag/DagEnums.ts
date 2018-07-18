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
    Project = "project"
}

enum DagNodeState {
    Unused = "unused",
    Connected = "Connected",
    Running = "running",
    Complete = "Complete",
    Error = "Error"
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
    SQL = "SQL"
}