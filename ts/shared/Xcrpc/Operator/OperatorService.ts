// Note about Promise:
// We are using native JS promise(async/await) in the Xcrpc code.
// However, in order to incorporate with other code which still use JQuery promise,
// we need to convert promises between different types.
// 1. xcrpc JS client returns JQuery promise, which can be converted to native promise by PromiseHelper.convertToNative()
//
// 2. The code invoking Xcrpc may expect JQuery promise, so use PromiseHelper.convertToJQuery() as needed.
// import ApiQuery = xce.QueryService;
// import ApiClient = xce.XceClient;
// import ProtoTypes = proto.xcalar.compute.localtypes;
// import ServiceError = Xcrpc.ServiceError;

import { OperatorService as ApiOperator, XceClient as ApiClient } from 'xcalar';
import {
    ScopeInfo as OperatorScopeInfo,
    SCOPE as OPERATORSCOPE
} from '../Common/Scope';
import { parseError } from '../ServiceError';
import * as queryInput from './XcalarProtoQueryInput';
import { XcalarApiDfLoadArgs as BulkLoadArgs } from './XcalarProtoQueryInput';
import ProtoTypes = proto.xcalar.compute.localtypes;

class OperatorService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    public async opBulkLoad(param: {
        datasetName: string,
        loadArgs?: BulkLoadArgs,
        scope: SCOPE,
        scopeInfo: ScopeInfo
    }): Promise<{}> {
        try {
            const {
                datasetName, loadArgs,
                scope, scopeInfo
            } = param;

            const request = new ProtoTypes.Operator.BulkLoadRequest();
            request.setDest(datasetName);
            if (loadArgs != null) {
                const { sourceArgsList, parseArgs, size } = loadArgs;
                const loadArgMsg = new ProtoTypes.Operator.DfLoadArgs();
                if (sourceArgsList != null) {
                    const sourceArgsListMsg: Array<ProtoTypes.Operator.DataSourceArgs> =
                        sourceArgsList.map((arg) => {
                            const argMsg = new ProtoTypes.Operator.DataSourceArgs();
                            argMsg.setFileNamePattern(arg.fileNamePattern);
                            argMsg.setPath(arg.path);
                            argMsg.setRecursive(arg.recursive);
                            argMsg.setTargetName(arg.targetName);
                            return argMsg;
                        });
                    loadArgMsg.setSourceArgsListList(sourceArgsListMsg);
                }
                if (parseArgs != null) {
                    const parseArgsMsg = new ProtoTypes.Operator.ParseArgs();
                    parseArgsMsg.setAllowFileErrors(parseArgs.allowFileErrors);
                    parseArgsMsg.setAllowRecordErrors(parseArgs.allowRecordErrors);
                    parseArgsMsg.setFileNameFieldName(parseArgs.fileNameFieldName);
                    parseArgsMsg.setParserArgJson(parseArgs.parserArgJson);
                    parseArgsMsg.setParserFnName(parseArgs.parserFnName);
                    parseArgsMsg.setRecordNumFieldName(parseArgs.recordNumFieldName);
                    parseArgsMsg.setSchemaList(parseArgs.schema.map((colArgs) => {
                        const colMsg = new ProtoTypes.Operator.XcalarApiColumn();
                        colMsg.setSourceColumn(colArgs.sourceColumn);
                        colMsg.setDestColumn(colArgs.destColumn);
                        colMsg.setColumnType(colArgs.columnType); // XXX TODO: validate the number is in enum
                        return colMsg;
                    }));
                    loadArgMsg.setParseArgs(parseArgsMsg);
                }
                if (size != null) {
                    loadArgMsg.setSize(size);
                }
                request.setLoadArgs(loadArgMsg);
            }
            request.setScope(createScopeMessage({ scope: scope, scopeInfo: scopeInfo }));

            const opService = new ApiOperator(this._apiClient);
            const response = await opService.opBulkLoad(request);

            return {};
        } catch(e) {
            throw parseError(e, (resp: Object): BulkLoadErrorResponse => {
                if (resp != null && (resp instanceof ProtoTypes.Operator.BulkLoadResponse)) {
                    return {
                        errorString: resp.getErrorString() || '',
                        errorFile: resp.getErrorFile() || ''
                    };
                } else {
                    return null;
                }
            });
        }
    }

    /**
     * Export xcalar table to target
     * @param param
     * @description
     * This function returns native promise!
     * Use PromiseHelper.
     */
    public async export(param: {
        tableName: string,
        driverName: string,
        driverParams: {},
        columns: queryInput.XcalarApiExportColumn[],
        exportName: string,
        scope: OPERATORSCOPE,
        scopeInfo?: OperatorScopeInfo
    }): Promise<any> {
        try {
            // Deconstruct arguments
            const { tableName, driverName, driverParams, columns, exportName, scope, scopeInfo } = param;
            let columnInfo: ProtoTypes.Operator.XcalarApiExportColumn[] = columns.map(function(col) {
                let ret = new ProtoTypes.Operator.XcalarApiExportColumn;
                ret.setColumnName(col.columnName);
                ret.setHeaderName(col.headerName);
                return ret;
            });

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Operator.ExportRequest();
            request.setSource(tableName);
            request.setDest(exportName);
            request.setDriverName(driverName);
            request.setDriverParams(JSON.stringify(driverParams));
            request.setColumnsList(columnInfo);
            const apiScope = createScopeMessage({
                scope: scope,
                scopeInfo: scopeInfo
            });
            request.setScope(apiScope);

            // Step #2: Call xcrpc service
            const operatorService = new ApiOperator(this._apiClient);
            const response = await operatorService.opExport(request);

            // Step #3: Parse xcrpc service response
            // For export there is no response value, just need to get status
            return {status: ProtoTypes.XcalarEnumType.Status.STATUS_OK};
        } catch (e) {
            throw parseError(e);
        }
    }
}

type BulkLoadErrorResponse = {
    errorString: string, errorFile: string
};
function isBulkLoadErrorResponse(errorResp: Object): errorResp is BulkLoadErrorResponse {
    return errorResp != null &&
        errorResp.hasOwnProperty('errorString') &&
        errorResp.hasOwnProperty('errorFile');
}

// Temporary solution for scope, will be removed once Common/Scope.ts is in
type ScopeInfo = {
    userName: string,
    workbookName: string
};

enum SCOPE {
    GLOBAL = ProtoTypes.Workbook.ScopeType.GLOBALSCOPETYPE,
    WORKBOOK = ProtoTypes.Workbook.ScopeType.WORKBOOKSCOPETYPE
};

/**
 * Create xcrpc WorkbookScope message
 * @param param
 */
function createScopeMessage(param: {
    scope: SCOPE, scopeInfo: ScopeInfo
}): ProtoTypes.Workbook.WorkbookScope {

    const { scope, scopeInfo } = param;
    const { userName = null, workbookName = null } = scopeInfo || {};

    const scopeObj = new ProtoTypes.Workbook.WorkbookScope();
    if (scope === SCOPE.GLOBAL) {
        scopeObj.setGlobl(new ProtoTypes.Workbook.GlobalSpecifier());
    } else if (scope === SCOPE.WORKBOOK) {
        const nameInfo = new ProtoTypes.Workbook.WorkbookSpecifier.NameSpecifier();
        nameInfo.setUsername(userName);
        nameInfo.setWorkbookname(workbookName);
        const workbookInfo = new ProtoTypes.Workbook.WorkbookSpecifier();
        workbookInfo.setName(nameInfo);
        scopeObj.setWorkbook(workbookInfo);
    } else {
        throw new Error(`Invalid Scope: ${scope}`);
    }

    return scopeObj;
}

export { OperatorService, SCOPE as OPERATORSCOPE, ScopeInfo as OperatorScopeInfo, isBulkLoadErrorResponse };