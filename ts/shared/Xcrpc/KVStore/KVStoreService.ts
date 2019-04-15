// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//      
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
namespace Xcrpc {
    import ApiKvStore = xce.KvStoreService;
    import ApiClient = xce.XceClient;
    import ProtoTypes = proto.xcalar.compute.localtypes;
    import ServiceError = Xcrpc.ServiceError;

    export class KVStoreService {
        public static readonly KVSCOPE = {
            GLOBAL: ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
            WORKBOOK: ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
        };

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
            keyName: string, kvScope: number, scopeInfo?: KVStoreService.ScopeInfo
        }): Promise<string> {
            try {
                // Deconstruct arguments
                const { keyName, kvScope, scopeInfo } = param;
                const { userName = null, workbookName = null } = scopeInfo || {};
        
                // Step #1: Construct xcrpc service input
                const scopeKey = new ProtoTypes.KvStore.ScopedKey();
                scopeKey.setName(keyName);
                
                const scope = new ProtoTypes.Workbook.WorkbookScope();
                if (kvScope === KVStoreService.KVSCOPE.GLOBAL) {
                    scope.setGlobl(new ProtoTypes.Workbook.GlobalSpecifier());
                } else if (kvScope === KVStoreService.KVSCOPE.WORKBOOK) {
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
                const kvService = new ApiKvStore(this._apiClient);
                const response = await PromiseHelper.convertToNative(kvService.lookup(request));

                // Step #3: Parse xcrpc service response
                return response.getValue().getText();
            } catch (e) {
                // XXX TODO: API error handling
                const error: ServiceError = {
                    type: ServiceError.ErrorType.SERVICE, error: e
                };
                throw error;
            }
        }
    }

    export namespace KVStoreService {
        export type ScopeInfo = {
            userName: string,
            workbookName: string
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.KVStoreService = Xcrpc.KVStoreService;
}