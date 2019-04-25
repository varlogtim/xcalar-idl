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
    }): Promise<Value> {
        try {
            // Deconstruct arguments
            const { keyName, kvScope, scopeInfo } = param;

            // Step #1: Construct xcrpc service input
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = this._setScopeKey({kvScope: kvScope, scopeInfo:scopeInfo});
            const request = new ProtoTypes.KvStore.LookupRequest();
            scopeKey.setScope(scope);
            request.setKey(scopeKey);


            // Step #2: Call xcrpc service
            const kvService = new ApiKVStore(this._apiClient);
            const response = await kvService.lookup(request);

            // Step #3: Parse xcrpc service response
            const value:Value = {
                value: response.getValue().getText()
            }
            return value;
        } catch (e) {
            // XXX TODO: API error handling)
            if(this._parseError(e, "lookup")){
                return null;
            }

        }
    }

    public async addOrReplace(param: {
        key: string, value: string, persis: boolean, kvScope: number,
        scopeInfo?: ScopeInfo
    }):Promise<void> {
        try {
            const {key, value, persis, kvScope, scopeInfo} = param;

            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(key);

            const scope = this._setScopeKey({kvScope: kvScope, scopeInfo:scopeInfo});
            scopeKey.setScope(scope);

            const keyValue = new ProtoTypes.KvStore.KeyValue();
            keyValue.setText(value);

            const request = new ProtoTypes.KvStore.AddOrReplaceRequest();
            request.setKey(scopeKey);
            request.setPersist(persis);
            request.setValue(keyValue);

            const kvService = new ApiKVStore(this._apiClient);
            return await kvService.addOrReplace(request);

        } catch (e) {
            this._parseError(e, "addOrReplace");
        }
    }

    public async deleteKey(param:{
        keyName: string, kvScope: number, scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            const { keyName, kvScope, scopeInfo } = param;
            // Step #1: Construct xcrpc service input
            const scopeKey = new ProtoTypes.KvStore.ScopedKey();
            scopeKey.setName(keyName);

            const scope = this._setScopeKey({kvScope: kvScope, scopeInfo:scopeInfo});
            scopeKey.setScope(scope);

            const request = new ProtoTypes.KvStore.DeleteKeyRequest();
            request.setKey(scopeKey);

            const kvService = new ApiKVStore(this._apiClient);
            await kvService.deleteKey(request);
        } catch (e) {
            this._parseError(e, "deleteKey");
        }
    }

    private _parseError(error:any, method:string):boolean {
        switch(method) {
            case "lookup":
            case "deleteKey": {
                if (error.status === Status.StatusKvEntryNotFound) {
                    console.warn("Status", error, "Key, not found");
                    return true;
                } else if (error.status === Status.StatusKvStoreNotFound) {
                    console.warn(error, "kvStore, not found");
                    return true;
                }
            }
        }
        const e: ServiceError = {
            type: ErrorType.SERVICE, error: error
        };
        throw e;
    }

    private _setScopeKey(param:{kvScope: number,
        scopeInfo?: ScopeInfo
    }): ProtoTypes.Workbook.WorkbookScope {
            const {kvScope, scopeInfo } = param;
            const { userName = null, workbookName = null } = scopeInfo || {};

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
            return scope;


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

type Value = {
    value: string
};

//For now, we use the internal error status for kvstore service
//to handle some error.
//In the future, we will add error status for xcrpc, then we
//can remove it.
enum Status {
    StatusKvEntryNotFound = 294,
    StatusKvStoreNotFound = 355
}

export { KVStoreService, ScopeInfo, KVSCOPE, Value};