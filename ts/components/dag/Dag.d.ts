type DagNodeId = string;
type CommentNodeId = string;

interface DagNodeInfo {
    type: DagNodeType;
    subType?: DagNodeSubType;
    id?: string;
    input? : object;
    description?: string;
    table?: string;
    state?: DagNodeState;
    display? : Coordinate;
    error?: string;
}

interface DagNodeCustomInfo extends DagNodeInfo {
    subGraph: string,
    inPorts: NodeConnection[][],
    outPorts: NodeConnection[],
    customName: string,
}

interface DagNodeDatasetInfo extends DagNodeInfo {
    columns?: {name: string, type: ColumnType}[]
}

interface DagNodeAggregateInfo extends DagNodeInfo {
    aggVal: number | string
}

interface DagLineageChange {
    columns: ProgCol[];
    changes: {from: ProgCol, to: ProgCol}[]
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
    columns: {sourceColumn: string, destColumn: string}[];
    keepOrder: boolean;
    options: ExportTableOptions
}

interface DagNodeFilterInput {
    evalString: string;
}

interface DagNodeGroupByInput {
    groupBy: string[];
    aggregate: {operator: string, sourceColumn: string, destColumn: string, distinct: boolean, cast: string}[];
    includeSample: boolean;
    icv: boolean;
    groupAll: boolean;
    newKeys: string[];
}

declare type DagNodeJoinTableInput = {
    columns: string[],
    casts: ColumnType[],
    rename: {sourceColumn: string, destColumn: string, prefix: boolean}[]
}
interface DagNodeJoinInput {
    joinType: string;
    left: DagNodeJoinTableInput
    right: DagNodeJoinTableInput
    evalString?: string;
}

interface DagNodeMapInput {
    eval: {evalString: string, newField: string}[];
    icv: boolean;
}

interface DagNodeProjectInput {
    columns: string[]
}

interface DagNodeSetInput {
    unionType: UnionType;
    columns: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[][];
    dedup: boolean;
}

interface DagNodeSQLInput {
    evalString: string;
}

interface DagNodeExtensionInput {
    evalString: string;
}

/* ==== End of Dag Node Input Intereface ==== */

/* ==== Interfaces related to DagList and DagTabs ==== */
declare type NodeIOPort = {
    node: DagNode, portIdx: number
}

interface NodeConnection {
    parentId?: DagNodeId,
    childId?: DagNodeId,
    pos: number
}

interface RemovedNodeDetails {
    node: DagNode,
    childIndices: {}
}

interface DeserializedNode {
    node: DagNode,
    parents: DagNodeId[]
}

interface DagTabManagerJSON {
    dagKeys: string[]
}

interface DagTabJSON {
    name: string,
    id: string,
    key: string,
    dag: string
}

interface StoredDags {
    name: string,
    key: string
}

/* ==== End of interfaces related to DagList and DagTabs ==== */

interface CommentInfo {
    id?: string;
    text?: string;
    position : Coordinate;
    dimensions?: Dimensions;
}
