
import { UserDefinedFunctionService as ApiUDF, XceClient as ApiClient } from 'xcalar';
import { ServiceError, ErrorType } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class UDFService {
    public static readonly UDFSCOPE = {
        GLOBAL: ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
        WORKBOOK: ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
    };

    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get UDF resolution
     * @param
     * @description This function returns native promise
     */
    public async getRes(param: {
        udfScope: number,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            const udfModule = this.__createUdfModule(param);

            const request = new ProtoTypes.UDF.GetResolutionRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.getResolution(request);

            return response.getFqModName().getText();
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }
    /**
     * Get UDF
     * @param
     * @description This function returns native promise
     */
    public async get(param: {
        udfScope: number,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<string> {
        try {
            const udfModule = this.__createUdfModule(param);
            const request = new ProtoTypes.UDF.GetRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.get(request);

            return response.getUdfModuleSrc().getSource();
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }

    /**
     * Add UDF
     * @param newLicense the string representation of a license
     * @description This function returns native promise
     */
    public async add(param: {
        udfScope: number,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            const udfModule = this.__createUdfModule(param);
            const request = new ProtoTypes.UDF.AddUpdateRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.add(request);

            return response;
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }

    /**
     * Update UDF
     * @param
     * @description This function returns native promise
     */
    public async update(param: {
        udfScope: number,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            const udfModule = this.__createUdfModule(param);
            const request = new ProtoTypes.UDF.AddUpdateRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.update(request);

            return response;
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }

    /**
     * Delete UDF
     * @param
     * @description This function returns native promise
     */
    public async delete(param: {
        udfScope: number,
        moduleName: string,
        scopeInfo?: ScopeInfo
    }): Promise<void> {
        try {
            const udfModule = this.__createUdfModule(param);
            const request = new ProtoTypes.UDF.DeleteRequest();
            request.setUdfModule(udfModule);
            const udfService = new ApiUDF(this._apiClient);
            const response = await udfService.delete(request);

            return response;
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }

    private __createUdfModule(param: {
        udfScope: number,
        type?: UdfTypeT,
        moduleName: string,
        sourceCode?: string,
        scopeInfo?: ScopeInfo
    }): ProtoTypes.UDF.UdfModule {
        const { udfScope, moduleName, scopeInfo } = param;
        // XXX need to assing default value correctly
        const { userName = null, workbookName = null } = scopeInfo || {};

        const scope = new ProtoTypes.Workbook.WorkbookScope();
        if (udfScope === UDFService.UDFSCOPE.GLOBAL) {
            scope.setGlobl(new ProtoTypes.Workbook.GlobalSpecifier());
        } else if (udfScope === UDFService.UDFSCOPE.WORKBOOK) {
            const nameInfo = new ProtoTypes.Workbook.WorkbookSpecifier.NameSpecifier();
            nameInfo.setUsername(userName);
            nameInfo.setWorkbookname(workbookName);
            const workbookInfo = new ProtoTypes.Workbook.WorkbookSpecifier();
            workbookInfo.setName(nameInfo);
            scope.setWorkbook(workbookInfo);
        } else {
            throw new Error(`Invalid UDF Scope: ${udfScope}`);
        }
        const udfModule = new ProtoTypes.UDF.UdfModule();
        udfModule.setScope(scope);
        udfModule.setName(moduleName);
        return udfModule;
    }
}

type ScopeInfo = {
    userName: string,
    workbookName: string
}

enum UDFSCOPE {
    GLOBAL = ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
    WORKBOOK = ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
};

export { UDFService, ScopeInfo, UDFSCOPE };