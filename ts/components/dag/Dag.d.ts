type DagNodeId = string;

interface DagNodeInfo {
    type: DagNodeType;
    id?: string;
    input? : object;
    comment?: string;
    table?: string;
    state?: DagNodeState;
    display? : Coordinate;
}

/* ==== Dag Node Input Intereface ==== */
interface DagNodeAggregateInput {
    evalString: string;
    dest: string;
}

interface DagNodeDatasetInput {
    source: string;
    prefix: string;
}

interface DagNodeExportInput {
    exportName: string;
    targetName: string;
    columns: [{sourceColumn: string, destColumn: string}];
    keepOrder: boolean;
    options: ExportTableOptions
}

interface DagNodeFilterInput {
    evalString: string;
}

interface DagNodeGroupByInput {
    keys: string[];
    eval: [{evalString: string, newField: string}];
    includeSample: boolean;
}

interface DagNodeJoinInput {
    joinType: string;
    columns: [[{sourceColumn: string, destColumn: string, columnType: string}]];
    evalString?: string;
}

interface DagNodeMapInput {
    eval: [{evalString: string, newFieldName: string}]
}

interface DagNodeProjectInput {
    columns: string[]
}

interface DagNodeSetInput {
    unionType: string;
    columns: [[{sourceColumn: string, destColumn: string, columnType: string}]];
    dedup: boolean;
}

/* ==== End of Dag Node Input Intereface ==== */
