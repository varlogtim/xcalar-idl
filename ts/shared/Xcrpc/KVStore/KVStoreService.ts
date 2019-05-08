import { KvStoreService as ApiKVStore, XceClient as ApiClient } from 'xcalar';
import { ServiceError, ErrorType } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class KVStoreService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get the stirng value of a KVStore key
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async lookup(param: {
        keyName: string, kvScope: number, scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            // Deconstruct arguments
            const { keyName, kvScope, scopeInfo } = param;
            const { userName = null, workbookName = null } = scopeInfo || {};

            // Step #1: Construct xcrpc service input
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = new ProtoTypes.Workbook.WorkbookScope();
            if (kvScope === KVSCOPE.GLOBAL) {
                scope.setGlobl(new ProtoTypes.Workbook.GlobalSpecifier());
            } else if (kvScope === KVSCOPE.WORKBOOK) {
                const nameInfo = new ProtoTypes.Workbook.WorkbookSpecifier.NameSpecifier();
                nameInfo.setUsername(userName);
                nameInfo.setWorkbookname(workbookName);
                const workbookInfo = new ProtoTypes.Workbook.WorkbookSpecifier();
                workbookInfo.setName(nameInfo);
                scope.setWorkbook(workbookInfo);
            } else {
                throw new Error(`Invalid kvScope: ${kvScope}`);
            }
            scopeKey.setScope(scope);

            const request = new ProtoTypes.KvStore.LookupRequest();
            request.setKey(scopeKey);

            // Step #2: Call xcrpc service
            const kvService = new ApiKVStore(this._apiClient);
            const response = await kvService.lookup(request);

            // Step #3: Parse xcrpc service response
            return response.getValue().getText();
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }
}

type ScopeInfo = {
    userName: string,
    workbookName: string
}

enum KVSCOPE {
    GLOBAL = ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
    WORKBOOK = ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
};

export { KVStoreService, ScopeInfo, KVSCOPE };