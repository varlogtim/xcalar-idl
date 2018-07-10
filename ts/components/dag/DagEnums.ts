enum DagNodeType {
    SubGraph = "subGraph",
    Source = "source",
    Dataset = "dataset",
    Filter = "filter",
    Join = "join",
    Union = "union",
    Export = "export",
    Aggregate = "aggregate",
    Map = "map"
}

enum DagNodeState {
    Unused = "unused",
    Connected = "Connected",
    Running = "running",
    Complete = "Complete",
    Error = "Error"
}

enum DagCategoryType {
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