type DagNodeId = string;

interface DagNodeInfo {
    type: DagNodeType;
    id?: string;
    input? : DagNodeInput;
    comment?: string;
    table?: string;
    state?: DagNodeState;
    display? : Coordinate;
}

interface DagNodeInput {

}

interface DagNodeDatasetInput extends DagNodeInput {
    source: string;
    prefix: string;
}

interface DagNodeFilterInput extends DagNodeInput {
    eval: string[];
}
