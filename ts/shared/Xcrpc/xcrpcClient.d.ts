// This is the Typescript shape of xcrpc JS client code(assets/js/xcrpc/*)

// === Service definitions: Begin ===
declare module 'xcalar' {
    export class XceClient {
        constructor(endpoint: string);
    }

    export * from 'xcalarEnumMap';

    export class KvStoreService {
        constructor(client: XceClient);
        lookup(request: proto.xcalar.compute.localtypes.KvStore.LookupRequest): Promise<proto.xcalar.compute.localtypes.KvStore.LookupResponse>;
        addOrReplace(request: proto.xcalar.compute.localtypes.KvStore.AddOrReplaceRequest): Promise<void>;
        deleteKey(request: proto.xcalar.compute.localtypes.KvStore.DeleteKeyRequest): Promise<void>;
        append(request:proto.xcalar.compute.localtypes.KvStore.AppendRequest): Promise<void>;
        setIfEqual(request:proto.xcalar.compute.localtypes.KvStore.SetIfEqualRequest): Promise<{noKV:boolean}>;
        list(request: proto.xcalar.compute.localtypes.KvStore.ListRequest): Promise<proto.xcalar.compute.localtypes.KvStore.ListResponse>

    }

    export class LicenseService {
        constructor(client: XceClient);
        get(request: proto.xcalar.compute.localtypes.License.GetRequest): Promise<proto.xcalar.compute.localtypes.License.GetResponse>;
        update(request: proto.xcalar.compute.localtypes.License.UpdateRequest): Promise<void>;
    }

    export class QueryService {
        constructor(client: XceClient);
        list(request: proto.xcalar.compute.localtypes.Query.ListRequest): Promise<proto.xcalar.compute.localtypes.Query.ListResponse>;
        execute(request: proto.xcalar.compute.localtypes.Query.ExecuteRequest): Promise<proto.xcalar.compute.localtypes.Query.ExecuteResponse>;
    }

    export class ResultSetService {
        constructor(client: XceClient);
    }

    export class UserDefinedFunctionService {
        constructor(client: XceClient);
        getResolution(request: proto.xcalar.compute.localtypes.UDF.GetResolutionRequest): Promise<proto.xcalar.compute.localtypes.UDF.GetResolutionResponse>;
        get(request: proto.xcalar.compute.localtypes.UDF.GetRequest): Promise<proto.xcalar.compute.localtypes.UDF.GetResponse>;
        add(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): Promise<void>;
        update(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): Promise<void>;
        delete(request: proto.xcalar.compute.localtypes.UDF.DeleteRequest): Promise<void>;
    }

    export class PublishedTableService {
        constructor(client: XceClient)
        select(request: proto.xcalar.compute.localtypes.PublishedTable.SelectRequest): Promise<proto.xcalar.compute.localtypes.PublishedTable.SelectResponse>;
        listTables(request: proto.xcalar.compute.localtypes.PublishedTable.ListTablesRequest): Promise<proto.xcalar.compute.localtypes.PublishedTable.ListTablesResponse>;
    }

    export class OperatorService {
        constructor(client: XceClient);
        opBulkLoad(request: proto.xcalar.compute.localtypes.Operator.BulkLoadRequest): Promise<proto.xcalar.compute.localtypes.Operator.BulkLoadResponse>;
    }

    export class DataflowService {
        constructor(client: XceClient);
        execute(request: proto.xcalar.compute.localtypes.Dataflow.ExecuteRequest): Promise<proto.xcalar.compute.localtypes.Dataflow.ExecuteResponse>;
    }

    export class DataSetService {
        constructor(client: XceClient);
        create(request: proto.xcalar.compute.localtypes.Operator.BulkLoadRequest): Promise<proto.google.protobuf.Empty>;
    }

    export class TableService {
        constructor(client: XceClient);
        addIndex(request: proto.xcalar.compute.localtypes.Table.IndexRequest): Promise<proto.google.protobuf.Empty>;
    }

    export class TargetService {
        constructor(client: XceClient);
        run(request: proto.xcalar.compute.localtypes.Target.TargetRequest): proto.xcalar.compute.localtypes.Target.TargetResponse;
    }

    export class DagNodeService {
        constructor(client: XceClient);
        deleteObjects(request: proto.xcalar.compute.localtypes.DagNode.DeleteRequest): Promise<proto.xcalar.compute.localtypes.DagNode.DeleteResponse>;
    }
}
// === Service definitions: End ===

// === Data structure definitions: Begin ===
declare namespace proto.xcalar.compute.localtypes {
    export namespace XcalarEnumType {
        export enum QueryState {
            QR_NOT_STARTED,
            QR_PROCESSING,
            QR_FINISHED,
            QR_ERROR,
            QR_CANCELLED
        }

        export enum DfFieldType {
            DF_UNKNOWN,
            DF_STRING,
            DF_INT32,
            DF_U_INT32,
            DF_INT64,
            DF_U_INT64,
            DF_FLOAT32,
            DF_FLOAT64,
            DF_BOOLEAN,
            DF_TIMESPEC,
            DF_BLOB,
            DF_NULL,
            DF_MIXED,
            DF_FATPTR,
            DF_SCALAR_PTR,
            DF_SCALAR_OBJ,
            DF_OP_ROW_META_PTR,
            DF_ARRAY,
            DF_OBJECT,
            DF_MONEY
        }

        export enum XcalarOrdering {
            XCALAR_ORDERING_UNORDERED,
            XCALAR_ORDERING_ASCENDING,
            XCALAR_ORDERING_DESCENDING,
            XCALAR_ORDERING_PARTIAL_ASCENDING,
            XCALAR_ORDERING_PARTIAL_DESCENDING,
            XCALAR_ORDERING_RANDOM,
            XCALAR_ORDERING_INVALID
        }

        export enum JoinOperator {
            INNER_JOIN,
            LEFT_OUTER_JOIN,
            RIGHT_OUTER_JOIN,
            FULL_OUTER_JOIN,
            CROSS_JOIN,
            LEFT_SEMI_JOIN,
            LEFT_ANTI_JOIN
        }

        export enum UnionOperator {
            UNION_STANDARD,
            UNION_INTERSECT,
            UNION_EXCEPT
        }

        export enum XcalarApis {
            XCALAR_API_UNKNOWN,
            XCALAR_API_GET_VERSION,
            XCALAR_API_BULK_LOAD,
            XCALAR_API_INDEX,
            XCALAR_API_GET_TABLE_META,
            XCALAR_API_SHUTDOWN,
            XCALAR_API_GET_STAT,
            XCALAR_API_GET_STAT_BY_GROUP_ID,
            XCALAR_API_RESET_STAT,
            XCALAR_API_GET_STAT_GROUP_ID_MAP,
            XCALAR_API_LIST_DAG_NODE_INFO,
            XCALAR_API_LIST_DATASETS,
            XCALAR_API_SHUTDOWN_LOCAL,
            XCALAR_API_MAKE_RESULT_SET,
            XCALAR_API_RESULT_SET_NEXT,
            XCALAR_API_JOIN,
            XCALAR_API_PROJECT,
            XCALAR_API_GET_ROW_NUM,
            XCALAR_API_FILTER,
            XCALAR_API_GROUP_BY,
            XCALAR_API_RESULT_SET_ABSOLUTE,
            XCALAR_API_FREE_RESULT_SET,
            XCALAR_API_DELETE_OBJECTS,
            XCALAR_API_GET_TABLE_REF_COUNT,
            XCALAR_API_MAP,
            XCALAR_API_AGGREGATE,
            XCALAR_API_QUERY,
            XCALAR_API_QUERY_STATE,
            XCALAR_API_QUERY_CANCEL,
            XCALAR_API_QUERY_DELETE,
            XCALAR_API_ADD_EXPORT_TARGET,
            XCALAR_API_REMOVE_EXPORT_TARGET,
            XCALAR_API_LIST_EXPORT_TARGETS,
            XCALAR_API_EXPORT,
            XCALAR_API_GET_DAG,
            XCALAR_API_LIST_FILES,
            XCALAR_API_START_NODES,
            XCALAR_API_MAKE_RETINA,
            XCALAR_API_LIST_RETINAS,
            XCALAR_API_GET_RETINA,
            XCALAR_API_DELETE_RETINA,
            XCALAR_API_UPDATE_RETINA,
            XCALAR_API_LIST_PARAMETERS_IN_RETINA,
            XCALAR_API_EXECUTE_RETINA,
            XCALAR_API_IMPORT_RETINA,
            XCALAR_API_KEY_LOOKUP,
            XCALAR_API_KEY_ADD_OR_REPLACE,
            XCALAR_API_KEY_DELETE,
            XCALAR_API_GET_NUM_NODES,
            XCALAR_API_TOP,
            XCALAR_API_MEMORY,
            XCALAR_API_LIST_XDFS,
            XCALAR_API_RENAME_NODE,
            XCALAR_API_SESSION_NEW,
            XCALAR_API_SESSION_LIST,
            XCALAR_API_SESSION_RENAME,
            XCALAR_API_SESSION_SWITCH,
            XCALAR_API_SESSION_DELETE,
            XCALAR_API_SESSION_INFO,
            XCALAR_API_SESSION_INACT,
            XCALAR_API_SESSION_PERSIST,
            XCALAR_API_GET_QUERY,
            XCALAR_API_CREATE_DHT,
            XCALAR_API_KEY_APPEND,
            XCALAR_API_KEY_SET_IF_EQUAL,
            XCALAR_API_DELETE_DHT,
            XCALAR_API_SUPPORT_GENERATE,
            XCALAR_API_UDF_ADD,
            XCALAR_API_UDF_UPDATE,
            XCALAR_API_UDF_GET,
            XCALAR_API_UDF_DELETE,
            XCALAR_API_CANCEL_OP,
            XCALAR_API_GET_PER_NODE_OP_STATS,
            XCALAR_API_GET_OP_STATS,
            XCALAR_API_ERRORPOINT_SET,
            XCALAR_API_ERRORPOINT_LIST,
            XCALAR_API_PREVIEW,
            XCALAR_API_EXPORT_RETINA,
            XCALAR_API_START_FUNC_TESTS,
            XCALAR_API_LIST_FUNC_TESTS,
            XCALAR_API_DELETE_DATASETS,
            XCALAR_API_GET_CONFIG_PARAMS,
            XCALAR_API_SET_CONFIG_PARAM,
            XCALAR_API_APP_SET,
            XCALAR_API_GET_LICENSE,
            XCALAR_API_APP_RUN,
            XCALAR_API_APP_REAP,
            XCALAR_API_DEMO_FILE,
            XCALAR_API_UPDATE_LICENSE,
            XCALAR_API_LIST_FUNC_TEST,
            XCALAR_API_QUERY_NAME,
            XCALAR_API_START_FUNC_TEST,
            XCALAR_API_STAT,
            XCALAR_API_STAT_BY_GROUP_ID,
            XCALAR_API_TABLE,
            XCALAR_STRESS_SET_KEY_TYPE,
            XCALAR_API_DAG_TABLE_NAME,
            XCALAR_API_LICENSE_UPDATE,
            XCALAR_API_SESSION_LIST_SCALAR,
            XCALAR_API_SESSION_LIST_ARRAY,
            XCALAR_API_EX_EXPORT_TARGET,
            XCALAR_API_EX_EXPORT_TARGET_HDR,
            XCALAR_API_PACKED,
            XCALAR_API_DAG_NODE_NAME_PATTERN,
            XCALAR_API_DAG_NODE_NAME_PATTERN_DELETE,
            XCALAR_API_ADD_PARAMETER_TO_RETINA,
            XCALAR_API_GET_MEMORY_USAGE,
            XCALAR_API_LOG_LEVEL_SET,
            XCALAR_API_UPDATE_RETINA_EXPORT,
            XCALAR_API_GET_IP_ADDR,
            XCALAR_API_TAG_DAG_NODES,
            XCALAR_API_COMMENT_DAG_NODES,
            XCALAR_API_LIST_DATASET_USERS,
            XCALAR_API_LOG_LEVEL_GET,
            XCALAR_API_LOCK_DATASET,
            XCALAR_API_PER_NODE_TOP,
            XCALAR_API_KEY_LIST,
            XCALAR_API_GET_CURRENT_XEM_CONFIG,
            XCALAR_API_LIST_USER_DATASETS,
            XCALAR_API_UNION,
            XCALAR_API_TARGET,
            XCALAR_API_SYNTHESIZE,
            XCALAR_API_GET_RETINA_JSON,
            XCALAR_API_GET_DATASETS_INFO,
            XCALAR_API_ARCHIVE_TABLES,
            XCALAR_API_SESSION_DOWNLOAD,
            XCALAR_API_SESSION_UPLOAD,
            XCALAR_API_PUBLISH,
            XCALAR_API_UPDATE,
            XCALAR_API_SELECT,
            XCALAR_API_UNPUBLISH,
            XCALAR_API_LIST_TABLES,
            XCALAR_API_RESTORE_TABLE,
            XCALAR_API_COALESCE,
            XCALAR_API_USER_DETACH,
            XCALAR_API_SESSION_ACTIVATE,
            XCALAR_API_PT_CHANGE_OWNER,
            XCALAR_API_DRIVER,
            XCALAR_API_RUNTIME_SET_PARAM,
            XCALAR_API_RUNTIME_GET_PARAM,
            XCALAR_API_PT_SNAPSHOT,
            XCALAR_API_DATASET_CREATE,
            XCALAR_API_DATASET_DELETE,
            XCALAR_API_DATASET_UNLOAD,
            XCALAR_API_DATASET_GET_META,
            XCALAR_API_UDF_GET_RESOLUTION,
            XCALAR_API_CGROUP,
            XCALAR_API_QUERY_LIST,
            XCALAR_API_ADD_INDEX,
            XCALAR_API_REMOVE_INDEX,
            XCALAR_API_FUNCTION_INVALID
        }
    }

    export namespace Workbook {
        export class WorkbookScope {
            setGlobl(value: GlobalSpecifier): void;
            setWorkbook(value: WorkbookSpecifier): void;
        }

        export class GlobalSpecifier {}

        export class WorkbookSpecifier {
            setName(value: WorkbookSpecifier.NameSpecifier): void;
        }
        export namespace WorkbookSpecifier {
            export class NameSpecifier {
                setUsername(value: string): void;
                setWorkbookname(value: string): void;
            }
        }

        export const ScopeType: {
            GLOBALSCOPETYPE: number, WORKBOOKSCOPETYPE: number
        }
    }

    export namespace KvStore {
        export class LookupRequest {
            setKey(value: ScopedKey): void;
        }
        export class LookupResponse {
            getValue(): KeyValue;
        }
        export class KeyValue {
            setText(value: string): void;
            getText(): string;
        }
        export class ScopedKey {
            setName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class AddOrReplaceRequest {
            setKey(value: ScopedKey): void;
            setPersist(value: boolean): void;
            setValue(value: KeyValue): void;
        }

        export class DeleteKeyRequest {
            setKey(value: ScopedKey): void;
        }
        export class AppendRequest {
            setKey(value: ScopedKey): void;
            setSuffix(value: string):void;
        }

        export class SetIfEqualRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setPersist(value: boolean): void;
            setCountSecondaryPairs(value: number): void;
            setKeyCompare(value: string): void;
            setValueCompare(value: string); void;
            setValueReplace(value:string): void;
            setKeySecondary(value: string): void;
            setValueSecondary(value: string): void;
        }

        export class ListRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setKeyRegex(value: string):void;
        }

        export class ListResponse {
            getKeysList(): Array<string>;
        }
    }

    export namespace License {
        export class GetRequest {}
        export class GetResponse {
            getExpiration(): string;
            getNodecount(): number;
            getUsercount(): number;
            getLicensee(): string;
            getCompressedlicense(): string;
            getExpired(): boolean;
        }
        export class UpdateRequest {
            setLicensevalue(value: LicenseValue): void;
        }
        export class LicenseValue {
            setValue(value: string): void;
        }
    }

    export namespace ResultSet {
        export class ResultSetMakeRequest {
            setName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
            setErrorDataset(value: boolean): void;
        }
        export class ResultSetMakeResponse {
            getResultSetId(): number;
            getNumRows(): number;
            getTableMeta(): TableMeta.GetTableMetaProto;
        }
    }

    export namespace TableMeta {
        export class GetTableMetaProto {
        }
    }

    export namespace Query {
        export class ListRequest {
            setNamePattern(value: string): void;
        }
        export class ListResponse {
            getQueriesList(): QueryInfo[];
        }
        export class DeleteRequest{
            setQueryName(value: string): void;
        }
        export class DeleteResponse{
        }
        export class CancelRequest{
            setQueryName(value: string): void;
        }
        export class CancelResponse{
        }

        export class QueryInfo {
            getName(): string;
            getMillisecondsElapsed(): number;
            getState(): proto.xcalar.compute.localtypes.XcalarEnumType.QueryState;
        }

        export class ExecuteRequest {
            setSameSession(value: boolean): void;
            setQueryName(value: string): void;
            setQueryStr(value: string): void;
            setBailOnError(value: boolean): void;
            setSchedName(value: string): void;
            setIsAsync(value: boolean): void;
            setUdfUserName(value: string): void;
            setUdfSessionName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class ExecuteResponse {
            getQueryName(): string
        }
    }

    export namespace PublishedTable {
        export class SelectRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setMinBatchId(value: number): void;
            setMaxBatchId(value: number): void;
            setEval(value: SelectEvalArgs): void;
            setColumnsList(value: Operator.XcalarApiColumn[]): void;
            addColumns(value: Operator.XcalarApiColumn): void;
            setLimitRows(value: number): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class SelectResponse {
            getTableName(): string;
        }

        export class SelectGroupByEvalArg {
            setFunc(value: string): void;
            setArg(value: string): void;
            setNewField(value: string): void;
        }

        export class SelectEvalArgs {
            setMapList(value: Operator.XcalarApiEval[]): void;
            addMap(value: Operator.XcalarApiEval): void;
            setFilter(value: string): void;
            setGroupByKeyList(value: string[]): void;
            addGroupByKey(value: string): void;
            setGroupByList(value: SelectGroupByEvalArg[]): void;
            addGroupBy(value: SelectGroupByEvalArg): void;
        }

        export class ListTablesRequest {
            setNamePattern(value: string): void;
            setUpdateStartBatchId(value: number): void;
            setMaxUpdateCount(value: number): void;
            setMaxSelectCount(value: number): void;
        }

        export class ListTablesResponse {
            getTablesList(): Array<ListTablesResponse.TableInfo>
        }

        export namespace ListTablesResponse {
            export class UpdateInfo {
                getSrcTableName(): string;
                getBatchId(): number;
                getStartTs(): number;
                getNumRows(): number;
                getNumInserts(): number;
                getNumUpdates(): number;
                getNumDeletes(): number;
                getSize(): number;
            }

            export class SelectInfo {
                getDstTableName(): string;
                getMinBatchId(): number;
                getMaxBatchId(): number;
            }

            export class IndexInfo {
                getKey(): ColumnAttribute.ColumnAttributeProto;
                getUptimeMs(): number;
                getSizeEstimate(): number;
            }

            export class TableInfo {
                getName(): string;
                getNumPersistedUpdates(): number;
                getSizeTotal(): number;
                getNumRowsTotal(): number;
                getOldestBatchId(): number;
                getNextBatchId(): number;
                getSrcTableName(): string;
                getActive(): boolean;
                getRestoring(): boolean;
                getUserIdName(): string;
                getSessionName(): string;
                getKeysList(): Array<ColumnAttribute.ColumnAttributeProto>;
                getValuesList(): Array<ColumnAttribute.ColumnAttributeProto>;
                getUpdatesList(): Array<UpdateInfo>;
                getSelectsList(): Array<SelectInfo>;
                getIndexesList(): Array<IndexInfo>;
            }
        }
    }

    export namespace ColumnAttribute {
        export class ColumnAttributeProto {
            getName(): string;
            getType(): string;
            getValueArrayIdx(): number;
        }

    }

    export namespace Operator {
        // Requests & Responses
        export class AggRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalList(value: XcalarApiEval[]): void;
            addEval(value: XcalarApiEval): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class AggResponse {
            getTableName(): string;
            getJsonAnswer(): string;
        }
        export class IndexRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setKeyList(value: XcalarApiKey[]): void;
            addKey(value: XcalarApiKey): void;
            setPrefix(value: string): void;
            setDhtName(value: string): void;
            setDelaySort(value: boolean): void;
            setBroadcast(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class IndexResponse {
            getTableName(): string;
        }
        export class ProjectRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: string[]): void;
            addColumns(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class ProjectResponse {
            getTableName(): string;
        }
        export class GetRowNumRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setNewField(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class GetRowNumResponse {
            getTableName(): string;
        }
        export class FilterRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalList(value: XcalarApiEval[]): void;
            addEval(value: XcalarApiEval): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class FilterResponse {
            getTableName(): string;
        }
        export class JoinRequest {
            setSourceList(value: string[]): void;
            addSource(value: string): void;
            setDest(value: string): void;
            setJoinType(value: XcalarEnumType.JoinOperator): void;
            setColumnsList(value: Columns[]): void;
            addColumns(value: Columns): void;
            setEvalString(value: string): void;
            setKeepAllColumns(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class JoinResponse {
            getTableName(): string;
        }
        export class MapRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalsList(value: XcalarApiEval[]): void;
            addEvals(value: XcalarApiEval): void;
            setIcv(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class MapResponse {
            getTableName(): string;
        }
        export class GroupByRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setEvalsList(value: XcalarApiEval[]): void;
            addEvals(value: XcalarApiEval): void;
            setNewKeyField(value: string): void;
            setIncludeSample(value: boolean): void;
            setIcv(value: boolean): void;
            setGroupAll(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class GroupByResponse {
            getTableName(): string;
        }
        export class UnionRequest {
            setSourceList(value: string[]): void;
            addSource(value: string): void;
            setDest(value: string): void;
            setDedup(value: boolean): void;
            setColumnsList(value: Columns[]): void;
            addColumns(value: Columns): void;
            setUnionType(value: XcalarEnumType.UnionOperator): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class UnionResponse {
            getTableName(): string;
        }
        export class BulkLoadRequest {
            setScope(value: Workbook.WorkbookScope): void;
            setDest(value: string): void;
            setLoadArgs(value: DfLoadArgs): void;
            setDagNodeId(value: string): void;
        }
        export class BulkLoadResponse {
            getDataSet(): XcalarDataSet;
            getNumFiles(): number;
            getNumBytes(): number;
            getErrorString(): string;
            getErrorFile(): string;
        }
        export class ExportRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: XcalarApiExportColumn[]): void;
            addColumns(value: XcalarApiExportColumn): void;
            setDriverName(value: string): void;
            setDriverParams(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class ExportResponse {
        }
        export class SynthesizeRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setColumnsList(value: XcalarApiColumn[]): void;
            addColumns(value: XcalarApiColumn): void;
            setSameSession(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class SynthesizeResponse {
            getTableName(): string;
        }

        // Struct messages
        export class XcalarApiEval {
            setEvalString(value: string): void;
            setNewField(value: string): void;
        }
        export class XcalarApiKey {
            setName(value: string): void;
            setType(value: XcalarEnumType.DfFieldType): void;
            setKeyFieldName(value: string): void;
            setOrdering(value: XcalarEnumType.XcalarOrdering): void;
        }
        export class XcalarApiColumn {
            setSourceColumn(value: string): void;
            setDestColumn(value: string): void;
            setColumnType(value: XcalarEnumType.DfFieldType): void;
        }
        export class Columns {
            setColsList(value: XcalarApiColumn[]): void;
            addCols(value: XcalarApiColumn): void;
        }
        export class DataSourceArgs {
            setTargetName(value: string): void;
            getTargetName(): string;
            setPath(value: string): void;
            getPath(): string;
            setFileNamePattern(value: string): void;
            getFileNamePattern(): string;
            setRecursive(value: boolean): void;
            getRecursive(): boolean;
        }
        export class ParseArgs {
            setParserFnName(value: string): void;
            getParserFnName(): string;
            setParserArgJson(value: string): void;
            getParserArgJson(): string;
            setFileNameFieldName(value: string): void;
            getFileNameFieldName(): string;
            setRecordNumFieldName(value: string): void;
            getRecordNumFieldName(): string;
            setAllowRecordErrors(value: boolean): void;
            getAllowRecordErrors(): boolean;
            setAllowFileErrors(value: boolean): void;
            getAllowFileErrors(): boolean;
            setSchemaList(value: XcalarApiColumn[]): void;
            addSchema(value: XcalarApiColumn): void;
            getSchemaList(): XcalarApiColumn[];
        }
        export class DfLoadArgs {
            setSourceArgsListList(value: DataSourceArgs[]): void;
            addSourceArgsList(value: DataSourceArgs): void;
            getSourceArgsListList(): DataSourceArgs[];
            setParseArgs(value: ParseArgs): void;
            getParseArgs(): ParseArgs;
            setSize(value: number): void;
            getSize(): number;
        }
        export class XcalarDataSet {
            getLoadArgs(): DfLoadArgs;
            getDatasetId(): string;
            getName(): string;
            getLoadIsComplete(): boolean;
            getIsListable(): boolean;
            getUdfName(): string;
        }
        export class XcalarApiExportColumn {
            setColumnName(value: string): void;
            setHeaderName(value: string): void;
        }
    }

    export namespace Table {
        export class IndexRequest {
            setKeyName(value: string): void;
            setTableName(value: string): void;
        }
    }

    export namespace DagNode {
        export class XcalarApiDagNodeInfo {
            getName(): string;
            getDagNodeId(): string;
            getState(): string;
            getSize(): number;
            getApi(): string;
        }
        export class DagRef {
            getType(): string;
            getName(): string;
            getXid(): string;
        }
        export class XcalarApiDeleteDagNodeStatus {
            getNodeInfo(): XcalarApiDagNodeInfo;
            getStatus(): number;
            getNumRefs(): number;
            getRefsList(): DagRef[];
        }
        export class DeleteRequest {
            setNamePattern(value: string): void;
            setSrcType(value: number): void;
            setDeleteCompletely(value: boolean): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
        export class DeleteResponse {
            getNumNodes(): number;
            getStatusesList(): XcalarApiDeleteDagNodeStatus[];
        }
        export class RenameRequest {
            setOldName(value: string): void;
            setNewName(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }
    }

    export namespace Dataflow {
        export class Parameter {
            setName(value: string): void;
            setValue(value: string): void;
        }
        export class ExecuteRequest {
            setDataflowName(value: string): void;
            setQueryName(value: string): void;
            setScope(value: proto.xcalar.compute.localtypes.Workbook.WorkbookScope): void;
            setUdfUserName(value: string): void;
            setUdfSessionName(value: string): void;
            setIsAsync(value: boolean): void;
            setSchedName(value: string): void;
            setParametersList(value: Array<proto.xcalar.compute.localtypes.Dataflow.Parameter>): void;
            setExportToActiveSession(value: boolean): void;
            setDestTable(value: string): void;
        }

        export class ExecuteResponse {
            getQueryName(): string;
        }
    }

    export namespace UDF {
        export class UdfModule {
            setScope(scope: proto.xcalar.compute.localtypes.Workbook.WorkbookScope): void;
            setName(name: string): void;
            setType(type: UdfTypeT): void;
            setSourceCode(source: string): void;
        }
        export class UdfModuleSrc {
            getType(): string;
            getIsBuiltin(): boolean;
            getModuleName(): string;
            getModulePath(): string;
            getSourceSize(): number;
            getSource(): string;
        }
        export class FQname {
            getText(): string;
        }
        export class GetResolutionRequest {
            setUdfModule(value: UdfModule): void;
        }
        export class GetResolutionResponse {
            getFqModName(): FQname;
        }
        export class GetRequest {
            setUdfModule(value: UdfModule): void;
        }
        export class GetResponse {
            getUdfModuleSrc(): UdfModuleSrc;
        }
        export class AddUpdateRequest {
            setUdfModule(value: UdfModule): void;
            setType(value: string): void;
            setSource(value: string): void;
        }
        export class DeleteRequest {
            setUdfModule(value: UdfModule): void;
        }
    }

    export namespace Target {
        export class TargetRequest {
            setInputJson(value: string): void;
            setScope(value: Workbook.WorkbookScope): void;
        }

        export class TargetResponse {
            getOutputJson(): string;
        }
    }
}

// === Data structure definitions: End ===

declare namespace proto.google.protobuf {
    export class Empty {}
}
