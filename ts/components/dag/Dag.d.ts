type DagNodeId = string;
type CommentNodeId = string;

interface DagNodeInfo {
    type: DagNodeType;
    subType?: DagNodeSubType;
    id?: string;
    input? : object;
    description?: string;
    title?: string;
    table?: string;
    state?: DagNodeState;
    display? : Coordinate
    error?: string;
    parents?: string[];
    aggregates?: string[];
}

interface DagNodeDisplayInfo {
    coordinates: Coordinate;
    icon: string;
    description: string;
}

interface DagNodeCopyInfo extends DagNodeInfo {
    nodeId?: string;
}

interface DagNodeSQLInfo extends DagNodeInfo {
    sqlQueryString: string,
    identifiers: {},
    identifiersOrder: number[],
    tableSrcMap: {}, // {tableName: parentIdx}
    columns: {name: string, backName: string, type: ColumnType}[]
}

interface DagNodeCustomInfo extends DagNodeInfo {
    subGraph: DagGraphInfo,
    inPorts: NodeConnection[],
    outPorts: NodeConnection[],
    customName: string,
}

interface DagNodeInInfo extends DagNodeInfo {
    columns?: {name: string, type: ColumnType}[]
}

interface DagNodeIMDTableInfo extends DagNodeInfo {
    columns?: {name: string, type: ColumnType}[]
}

interface DagNodeExtensionInfo extends DagNodeInfo {
    newColumns: {name: string, type: ColumnType}[];
    droppedColumns: string[];
}

interface DagNodeMapInfo extends DagNodeInfo {
    aggregates?: string[]
}

interface DagNodeFilterInfo extends DagNodeInfo {
    aggregates?: string[]
}

interface DagNodeAggregateInfo extends DagNodeInfo {
    aggVal: number | string
}

interface DagLineageChange {
    columns: ProgCol[];
    changes: {from: ProgCol, to: ProgCol}[]
}

/* ==== Dag Node Input Intereface ==== */
interface DagNodeAggregateInputStruct {
    evalString: string;
    dest: string;
}

interface DagNodeDatasetInputStruct {
    source: string;
    prefix: string;
}

interface DagNodeIMDTableInputStruct {
    source: string;
    version: number;
    filterString: string;
    columns: string[];
}

interface DagNodePublishIMDInputStruct {
    pubTableName: string;
    primaryKey: string;
    operator: string;
}

interface DagNodeExportInputStruct {
    columns: string[];
    driver: string;
    driverArgs: ExportDriverArg[];
}

interface DagNodeFilterInputStruct {
    evalString: string;
}

interface DagNodeIndexInputStruct {
    columns: string[];
}

interface DagNodeGroupByInputStruct {
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
interface DagNodeJoinInputStruct {
    joinType: string;
    left: DagNodeJoinTableInput
    right: DagNodeJoinTableInput
    evalString?: string;
}

interface DagNodeMapInputStruct {
    eval: {evalString: string, newField: string}[];
    icv: boolean;
}

interface DagNodeProjectInputStruct {
    columns: string[]
}

interface DagNodeSetInputStruct {
    unionType: UnionType;
    columns: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[][];
    dedup: boolean;
}

interface DagNodeSQLInputStruct {
    queryStr: string,
    newTableName: string,
    jdbcCheckTime?: number
}

interface DagNodeRowNumInputStruct {
    newField: string
}

interface DagNodeExtensionInputStruct {
    moduleName: string,
    functName: string
    args: object
}

interface DagNodeDFInInputStruct {
    linkOutName: string;
    dataflowId: string;
    schema: {name: string, type: ColumnType}[];
}

interface DagNodeDFOutInputStruct {
    name: string;
    linkAfterExecution: boolean;
}

interface DagNodeSplitInputStruct {
    source: string,
    delimiter: string,
    dest: string[]
}

interface DagNodeJupyterInputStruct {
    numExportRows: number,
    renames: { sourceColumn: string, destColumn: string }[]
}

interface DagNodeRoundInputStruct {
    sourceColumn: string,
    numDecimals: number,
    destColumn: string
}
/* ==== End of Dag Node Input Intereface ==== */

/* ==== Interfaces related to Export Drivers (Used in export Node) ==== */
interface ExportParam {
    description: string,
    name: string,
    optional: boolean,
    secret: boolean,
    type: string
}

interface ExportDriver {
    name: string,
    params: ExportParam[]
}

interface ExportDriverArg {
    name: string,
    type: string,
    optional: boolean,
    value: string
}

/* ==== End of interfaces related to Export Drivers ==== */


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

interface PublishTable {
    updates: PublishTableUpdateInfo[];
    name: string;
    values: PublishTableCol[],
    oldestBatchId: number,
    active: boolean,
    sizeTotal: number,
    keys: XcalarApiColumnInfoT[]
}

interface PublishTableUpdateInfo {
    startTS: number;
    batchId: number;
    numRows: number;
    source: string;
}

interface PublishTableCol {
    name: string;
    type: string;
}

interface RefreshColInfo {
    sourceColumn: string,
    destColumn: string,
    columnType: string
}


interface DagTblCacheInfo {
    name: string;
    clockCount: number;
    locked: boolean;
    markedForDelete: boolean;
    markedForReset: boolean;
    timestamp: number;
}

interface DagTblManagerPromiseInfo {
    succeed: boolean;
    error: ThriftError;
}

interface CommentInfo {
    id?: string;
    text?: string;
    position : Coordinate;
    dimensions?: Dimensions;
}

interface DagCategoryNodeInfo {
    type: DagCategoryType,
    subType: string,
    node: DagNodeInfo,
    hidden: boolean
}

interface DagGraphInfo {
    nodes: DagNodeInfo[],
    comments: any[],
    display: Dimensions
}

declare type DagSubGraphConnectionInfo = {
    inner: NodeConnection[],
    in: NodeConnection[],
    out: NodeConnection[],
    openNodes: DagNodeId[],
    endSets: { in: Set<DagNodeId>, out: Set<DagNodeId> },
    dfIOSets: { in: Set<DagNodeId>, out: Set<DagNodeId> }
}

interface SQLColumn {
    colName: string,
    colId?: number,
    rename?: string,
    colType: string
}
