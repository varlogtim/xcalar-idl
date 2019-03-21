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
    stats?: any;
    configured?: boolean;
    name?: string;
    hasTitleChange?: boolean;
    graph?: DagGraph;
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
}

interface DagNodeDFInInfo extends DagNodeInfo {
    graph?: DagGraph;
}

interface DagNodeSQLFuncInInfo extends DagNodeInInfo {
    order: number;
}

interface DagLineageChange {
    columns: ProgCol[];
    changes: {from: ProgCol, to: ProgCol, parentIndex?: number}[]
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

interface DagNodeSQLFuncInInputStruct {
    source: string;
}

interface DagNodeSQLFuncOutInputStruct {
    schema: ColSchema[];
}

interface DagNodeIMDTableInputStruct {
    source: string;
    version: number;
    schema: ColSchema[];
    filterString?: string;
    limitedRows?: number;
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
    columns: {sourceColumn: string, destColumn: string}[];
    driver: string;
    driverArgs: {[key: string]: string};
}

interface DagNodeOptimizeInputStruct {
    columns: {sourceColumn: string, destColumn: string}[];
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
    joinBack?: boolean;
    icv: boolean;
    groupAll: boolean;
    newKeys: string[];
    dhtName: string;
}

declare type DagNodeJoinTableInput = {
    columns: string[],
    // We don't support type casting in Join for now, but keep the code in case we wanna re-enable it
    // also, cast is supported when upgrading a dataflow from 1.4.1
    // casts?: ColumnType[],
    keepColumns: string[], // Any columns not in this list will be dropped(including those in the joinOn clause)!
    rename: {sourceColumn: string, destColumn: string, prefix: boolean}[]
}
interface DagNodeJoinInputStruct {
    joinType: string;
    left: DagNodeJoinTableInput
    right: DagNodeJoinTableInput
    evalString?: string;
    keepAllColumns: boolean;
    nullSafe: boolean;
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
    identifiersOrder: number[],
    dropAsYouGo: boolean
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

interface DagNodeJupyterInputStruct {
    numExportRows: number,
    renames: { sourceColumn: string, destColumn: string }[]
}

interface DagNodeSynthesizeInputStruct {
    colsInfo: {sourceColumn: string, destColumn: string, columnType: ColumnType | string}[]
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
    description: string
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
    keys: XcalarApiColumnInfoT[],
    numRowsTotal: number
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
    display?: {x: number, y: number, height?: number, width?: number}
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
    display: Dimensions,
    operationTime: number
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

interface SQLSchema {
    tableName: string,
    tableColumns: {}[], // {column: type}[]
    xcTableName: string
}

interface SQLParserStruct {
    sql: string,
    command?: {type: string, args: string[]},
    identifiers?: string[],
    functions?: {},
    newSql?: string,
    nonQuery?: boolean
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

interface DagRuntimeAccessible {
    getRuntime: () => DagRuntime;
}