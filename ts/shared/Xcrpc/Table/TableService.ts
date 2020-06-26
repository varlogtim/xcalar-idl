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
        scopeInfo?: ScopeInfo,

    }): Promise<Array<string>> {
        try {
            const { namePattern = '*', scope, scopeInfo } = param;
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });

            // construct api request object
            const apiRequest = new ProtoTypes.Table.ListTablesRequest();
            apiRequest.setScope(apiScope);
            apiRequest.setPattern(namePattern);

            // Call api service
            const tableService = new ApiTable(this._apiClient);
            const apiResponse = await tableService.listTables(apiRequest);

            // Parse response
            return [...apiResponse.getTableNamesList()];
        } catch(e) {
            throw parseError(e);
        }
    }
}

export { TableService, SCOPE, ScopeInfo };