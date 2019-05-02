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

import { QueryService as ApiQuery, XceClient as ApiClient } from 'xcalar';
import { ServiceError, ErrorType } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class QueryService {
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
    public async list(param: {
        namePattern: string
    }): Promise<QueryInfo[]> {
        try {
            // Deconstruct arguments
            const { namePattern } = param;

            // Step #1: Construct xcrpc service input
            const request = new ProtoTypes.Query.ListRequest();
            request.setNamePattern(namePattern);

            // Step #2: Call xcrpc service
            const queryService = new ApiQuery(this._apiClient);
            const response = await queryService.list(request);

            // Step #3: Parse xcrpc service response
            return response.getQueriesList().map((queryInfo) => {
                return {
                    name: queryInfo.getName(),
                    millisecondsElapsed: queryInfo.getMillisecondsElapsed(),
                    state: queryInfo.getState()
                };
            });
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }
}

type QueryInfo = {
    name: string,
    millisecondsElapsed: number,
    state: string
}

export { QueryService, QueryInfo };