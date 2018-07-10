enum DagNodeType {
    SubGraph = "subGraph",
    Source = "source",
    Dataset = "dataset",
    Filter = "filter",
    Join = "join",
    Union = "union",
    Export = "export"
}

enum DagNodeState {
    Unused = "unused",
    Connected = "Connected",
    Running = "running",
    Complete = "Complete",
    Error = "Error"
}