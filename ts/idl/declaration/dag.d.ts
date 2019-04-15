/* ==== Dag Node Interface ==== */
interface DagNodeInfo {
    version?: number;
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

/** Dag Node Interface  */
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
/* ==== End of Dag Node Inteface ==== */

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

interface DagGraphInfo {
    version?: number;
    nodes: DagNodeInfo[],
    comments: CommentInfo[],
    display: Dimensions,
    operationTime: number
}

interface DagTabDurable {
    name: string,
    id: string,
    dag: DagGraphInfo
}

interface DagTabPublishedDurable extends DagTabDurable {
    editVersion: number
}

interface DagListTabDurable {
    name: string,
    id: string,
    reset: boolean,
    createdTime: number
}

interface DagListDurable {
    version: number,
    dags: DagListTabDurable[]
}