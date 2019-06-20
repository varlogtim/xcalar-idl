import { OperatorService as ApiOperator, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
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
            throw parseError(e);
        }
    }
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

export { OperatorService, SCOPE as LOADSCOPE, ScopeInfo as LoadScopeInfo };