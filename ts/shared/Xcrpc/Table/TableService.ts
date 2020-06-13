// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
// import ApiTable = xce.TableService;
// import ApiClient = xce.XceClient;
// import ProtoTypes = proto.xcalar.compute.localtypes;
// import ServiceError = Xcrpc.ServiceError;

import { TableService as ApiTable, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import {
    ScopeInfo,
    SCOPE,
    createScopeMessage
} from '../Common/Scope';
import ProtoTypes = proto.xcalar.compute.localtypes;

class TableService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get an array of queryInfos which include name, timeElapsed, and state
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async addIndex(tableName: string, keyName: string): Promise<proto.google.protobuf.Empty> {
        try {
            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Table.IndexRequest();
            request.setTableName(tableName);
            request.setKeyName(keyName);

            // Step #2: Call xcrpc service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.addIndex(request);

            // Step #3: Parse xcrpc service response
            return response;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * List session/shared tables
     * @param param
     */
    public async listTables(param: {
        namePattern?: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
    }): Promise<any> {
        try {
            const { namePattern = '*', scope, scopeInfo } = param;
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });

            // Construct api request object
            const request = new ProtoTypes.Table.ListTablesRequest();
            request.setPattern(namePattern);
            request.setScope(apiScope);

            // Call api service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.listTables(request);

            // Parse response
            return this.parseTableList(response);
        } catch (e) {
            throw parseError(e);
        }
    }

    private parseTableList(
        response: ProtoTypes.Table.ListTablesResponse
    ): any {
        const res = {};
        const tableNames = response.getTableNamesList();
        for (let tableName of tableNames) {
            const tableMeta = response.getTableMetaMapMap().get(tableName);
            res[tableName] = this.parseTableMeta(tableMeta);
        }
        return res;
    }

    private parseTableMeta(
        tableMeta: ProtoTypes.Table.TableMetaResponse
    ): any {
        const tableStruct: any = {};
        const retAttributes: any = {};
        const tableAttributes = tableMeta.getAttributes();
        retAttributes.tableName = tableAttributes.getTableName();
        retAttributes.tableId = tableAttributes.getTableId();
        retAttributes.xdbId = tableAttributes.getXdbId();
        retAttributes.state = tableAttributes.getState();
        retAttributes.pinned = tableAttributes.getPinned();
        retAttributes.shared = tableAttributes.getShared();
        retAttributes.datasets = tableAttributes.getDatasetsList();
        retAttributes.resultSetIds = tableAttributes.getResultSetIdsList();
        tableStruct.attributes = retAttributes;

        const retSchema: any = {};
        const tableSchema = tableMeta.getSchema();
        retSchema.columnAttributes = [];
        for (let column of tableSchema.getColumnAttributesList()) {
            retSchema.columnAttributes.push({
                name: column.getName(),
                type: column.getType(),
                valueArrayIdx: column.getValueArrayIdx()
            });
        }
        retSchema.keyAttributes = [];
        for (let key of tableSchema.getKeyAttributesList()) {
            retSchema.keyAttributes.push({
                name: key.getName(),
                type: key.getType(),
                valueArrayIdx: key.getValueArrayIdx(),
                ordering: key.getOrdering()
            });
        }
        tableStruct.schema = retSchema;

        const retAggregatedStats: any = {};
        const tableAggregatedStats = tableMeta.getAggregatedStats();
        retAggregatedStats.totalRecordsCount = tableAggregatedStats.getTotalRecordsCount();
        retAggregatedStats.totalSizeInBytes = tableAggregatedStats.getTotalSizeInBytes();
        retAggregatedStats.rowsPerNode = tableAggregatedStats.getRowsPerNodeList();
        retAggregatedStats.sizeInBytesPerNode = tableAggregatedStats.getSizeInBytesPerNodeList();
        tableStruct.aggregatedStats = retAggregatedStats;

        const retStatsPerNode: any = {};
        const tableStatsPerNodeMap = tableMeta.getStatsPerNodeMap();
        for (let node of tableStatsPerNodeMap.keys()) {
            const nodeStats = tableStatsPerNodeMap.get(node);
            const retStats: any = {};
            retStats.status = nodeStats.getStatus();
            retStats.numRows = nodeStats.getNumRows();
            retStats.numPages = nodeStats.getNumPages();
            retStats.numSlots = nodeStats.getNumSlots();
            retStats.sizeInBytes = nodeStats.getSizeInBytes();
            retStats.pagesConsumedInBytes = nodeStats.getPagesConsumedInBytes();
            retStats.pagesAllocatedInBytes = nodeStats.getPagesAllocatedInBytes();
            retStats.pagesSent = nodeStats.getPagesSent();
            retStats.pagesReceived = nodeStats.getPagesReceived();
            retStats.rowsPerSlot = {};
            retStats.pagesPerSlot = {};
            for (let slot of nodeStats.getRowsPerSlotMap().keys()) {
                retStats.rowsPerNode[slot] = nodeStats.getRowsPerSlotMap().get(slot);
            }
            for (let slot of nodeStats.getPagesPerSlotMap().keys()) {
                retStats.rowsPerNode[slot] = nodeStats.getPagesPerSlotMap().get(slot);
            }
            retStatsPerNode[node] = retStats;
        }
        tableStruct.statsPerNode = retStatsPerNode;

        tableStruct.status = tableMeta.getStatus();
        return tableStruct;
    }

    /**
     * Make a table shared, for test only, comment out before stage 1 release
     * @param tableName, name of the target table
     * @param scope, scope code of this call
     * @param scopeInfo, scope detail of this call
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
    public async publishTable(
        tableName: string,
        scope: SCOPE,
        scopeInfo?: ScopeInfo
        ): Promise<string> {
        try {
            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Table.PublishRequest();
            request.setTableName(tableName);
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo}));

            // Step #2: Call xcrpc service
            const tableService = new ApiTable(this._apiClient);
            const response = await tableService.publishTable(request);

            // Step #3: Parse xcrpc service response
            return response.getFullyQualTableName();
        } catch (e) {
            throw parseError(e);
        }
    }
     */
}

export { TableService, SCOPE, ScopeInfo };