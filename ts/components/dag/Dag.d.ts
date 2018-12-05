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
    subGraphNodes?: string[];
    stats?: any,
    configured?: boolean
}

interface DagNodeDisplayInfo {
    coordinates: Coordinate;
    icon: string;
    description: string;
}

interface DagNodeCopyInfo extends DagNodeInfo {
    nodeId?: string;
    retina?: string;
}

interface DagNodeSQLInfo extends DagNodeInfo {
    tableSrcMap: {}, // {tableName: parentIdx}
    columns: {name: string, backName: string, type: ColumnType}[]
}

interface DagNodeCustomInfo extends DagNodeInfo {
    subGraph: DagGraphInfo,
    inPorts: NodeConnection[],
    outPorts: NodeConnection[],
    customName: string,
}

interface DagNodeIndexInfo extends DagNodeInfo {
    columns: ColSchema[];
}

interface DagNodePlaceholderInfo extends DagNodeInfo {
    name: string;
}

interface DagNodeInInfo extends DagNodeInfo {
    schema: ColSchema[]
}

interface DagNodeExtensionInfo extends DagNodeInfo {
    newColumns: {name: string, type: ColumnType}[];
    droppedColumns: string[];
}

interface DagNodeAggregateInfo extends DagNodeInfo {
    aggVal: number | string;
    graph?: DagGraph;
}

interface DagNodeOutOptimizableInfo extends DagNodeInfo {
    retina?: string
}

interface DagLineageChange {
    columns: ProgCol[];
    changes: {from: ProgCol, to: ProgCol}[]
}

interface BackTraceInfo {
    map: Map<DagNodeId, DagNode>,
    startingNodes: DagNodeId[],
    error?: string
}

/* ==== Dag Node Input Intereface ==== */
interface DagNodeAggregateInputStruct {
    evalString: string;
    dest: string;
    mustExecute: boolean;
}

interface DagNodeDatasetInputStruct {
    source: string;
    prefix: string;
    synthesize: boolean;
    loadArgs: string;
}

interface DagNodeIMDTableInputStruct {
    source: string;
    version: number;
    columns: string[];
    filterString?: string;
}

interface DagNodePublishIMDInputStruct {
    pubTableName: string;
    primaryKeys: string[];
    operator: string;
}

interface DagNodeUpdateIMDInputStruct {
    pubTableName: string;
    operator: string;
}

interface DagNodeExportInputStruct {
    columns: string[];
    driver: string;
    driverArgs: {[key: string]: string};
}

interface DagNodeOptimizeInputStruct {
    columns: string[];
    driver: string;
    driverArgs: ExportDriverArg[];
}

interface DagNodeFilterInputStruct {
    evalString: string;
}

interface DagNodeIndexInputStruct {
    columns: string[];
    dhtName: string;
}

interface DagNodePlaceholderInputStruct {
    args: any;
}

interface DagNodeSortInputStruct {
    columns: {columnName: string, ordering: string}[];
    newKeys: string[];
}

interface DagNodeGroupByInputStruct {
    groupBy: string[];
    aggregate: {operator: string, sourceColumn: string, destColumn: string, distinct: boolean, cast: string}[];
    includeSample: boolean;
    icv: boolean;
    groupAll: boolean;
    newKeys: string[];
    dhtName: string;
}

declare type DagNodeJoinTableInput = {
    columns: string[],
    casts: ColumnType[],
    keepColumns: string[],
    rename: {sourceColumn: string, destColumn: string, prefix: boolean}[]
}
interface DagNodeJoinInputStruct {
    joinType: string;
    left: DagNodeJoinTableInput
    right: DagNodeJoinTableInput
    evalString?: string;
    keepAllColumns: boolean;
}

interface DagNodeMapInputStruct {
    eval: {evalString: string, newField: string}[];
    icv: boolean;
}

interface DagNodeProjectInputStruct {
    columns: string[]
}

interface DagNodeSetInputStruct {
    columns: {sourceColumn: string, destColumn: string, columnType: ColumnType, cast: boolean}[][];
    dedup: boolean;
}

interface DagNodeSQLInputStruct {
    sqlQueryStr: string,
    identifiers: {},
    identifiersOrder: number[]
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
}

interface DagNodeDFOutInputStruct {
    name: string;
    linkAfterExecution: boolean;
    columns?: {sourceName: string, destName: string}[]
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

interface DagNodeExplodeInputStruct {
    sourceColumn: string,
    delimiter: string,
    destColumn: string
}

interface DagNodeRoundInputStruct {
    sourceColumn: string,
    numDecimals: number,
    destColumn: string
}

interface DagNodeSynthesizeInputStruct {
    colsInfo: {sourceColumn: string, destColumn: string, columnType: string}[]
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
    numDeletes: number;
    numInserts: number;
    numUpdates: number;
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
    key: string,
    type: DagCategoryType,
    subType: string,
    node: DagNodeInfo,
    hidden: boolean
}

interface DagGraphInfo {
    nodes: DagNodeInfo[],
    comments: CommentInfo[],
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

interface TableRunStats {
    state: DgDagStateT,
    startTime: number,
    pct: number,
    numRowsTotal: number,
    numWorkCompleted: number,
    numWorkTotal: number,
    skewValue: number,
    elapsedTime: number,
    size: number,
    rows: number[],
    hasStats: boolean
    name?: string,
    index?: number,
    type?: number
}

interface LogParam {
    title: string,
    options: any
}

declare type NodeMoveInfo = {
    id: DagNodeId | CommentNodeId,
    type: string,
    position: Coordinate,
    oldPosition?: Coordinate
}

declare type SubgraphContainerNode = DagNodeCustom | DagNodeSQL
