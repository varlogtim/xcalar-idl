// This is the Typescript shape of xcrpc JS client code(assets/js/xcrpc/*)

// === Service definitions: Begin ===
declare module 'xcalar' {
    export class XceClient {
        constructor(endpoint: string);
    }

    export class KvStoreService {
        constructor(client: XceClient);
        lookup(request: proto.xcalar.compute.localtypes.KvStore.LookupRequest): Promise<proto.xcalar.compute.localtypes.KvStore.LookupResponse>;
        addOrReplace(request: proto.xcalar.compute.localtypes.KvStore.AddOrReplaceRequest): Promise<void>;
        deleteKey(request: proto.xcalar.compute.localtypes.KvStore.DeleteKeyRequest): Promise<void>;
    }

    export class LicenseService {
        constructor(client: XceClient);
        get(request: proto.xcalar.compute.localtypes.License.GetRequest): XDPromise<proto.xcalar.compute.localtypes.License.GetResponse>;
        update(request: proto.xcalar.compute.localtypes.License.UpdateRequest): XDPromise<void>;
    }

    export class QueryService {
        constructor(client: XceClient);
        list(request: proto.xcalar.compute.localtypes.Query.ListRequest): XDPromise<proto.xcalar.compute.localtypes.Query.ListResponse>;
    }

    export class ResultSetService {
        constructor(client: XceClient);
    }

    export class UserDefinedFunctionService {
        constructor(client: XceClient);
        getResolution(request: proto.xcalar.compute.localtypes.UDF.GetResolutionRequest): XDPromise<proto.xcalar.compute.localtypes.UDF.GetResolutionResponse>;
        get(request: proto.xcalar.compute.localtypes.UDF.GetRequest): XDPromise<proto.xcalar.compute.localtypes.UDF.GetResponse>;
        add(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): XDPromise<void>;
        update(request: proto.xcalar.compute.localtypes.UDF.AddUpdateRequest): XDPromise<void>;
        delete(request: proto.xcalar.compute.localtypes.UDF.DeleteRequest): XDPromise<void>;
    }
    export class PublishedTableService {
        constructor(client: XceClient)
        select(request: proto.xcalar.compute.localtypes.PublishedTable.SelectRequest): Promise<proto.xcalar.compute.localtypes.PublishedTable.SelectResponse>;
        listTables(request: proto.xcalar.compute.localtypes.PublishedTable.ListTablesRequest): Promise<proto.xcalar.compute.localtypes.PublishedTable.ListTablesResponse>;
    }

    export class TableService {
        constructor(client: XceClient);
        addIndex(request: proto.xcalar.compute.localtypes.Table.IndexRequest): XDPromise<proto.google.protobuf.Empty>;
    }

}
// === Service definitions: End ===

// === Data structure definitions: Begin ===
declare namespace proto.xcalar.compute.localtypes {
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

        export class QueryInfo {
            getName(): string;
            getMillisecondsElapsed(): number;
            getState(): string;
        }
    }

    export namespace PublishedTable {
        export class SelectRequest {
            setSource(value: string): void;
            setDest(value: string): void;
            setMinBatchId(value: number): void;
            setMaxBatchId(value: number): void;
            setFilterString(value: string): void;
            setMapsList(value: Operator.XcalarApiEval[]): void;
            setGroupbysList(value: Operator.XcalarApiEval[]): void;
            setGroupkeysList(value: string[]): void;
            setColumnsList(value: Operator.XcalarApiColumn[]): void;
        }

        export class SelectResponse {
            getTableName(): string;
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
        export class XcalarApiEval {
            setEvalString(value: string): void;
            setNewField(value: string): void;
        }

        export class XcalarApiColumn {
            setSourceColumn(value: string): void;
            setDestColumn(value: string): void;
            setColumnType(value: string): void;
        }

    }

    export namespace Table {
        export class IndexRequest {
            setKeyName(value: string): void;
            setTableName(value: string): void;
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
}

// === Data structure definitions: End ===

declare namespace proto.google.protobuf {
    export class Empty {}
}