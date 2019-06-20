import ProtoTypes = proto.xcalar.compute.localtypes;

type ServiceError = NetworkError | XcalarError | XcalarLoadError | UnknownError;

interface NetworkError {
    type: ErrorType, httpStatus: number
}
interface XcalarError {
    type: ErrorType, status: number, error: string
}
interface XcalarLoadError extends XcalarError {
    errorString: string, errorFile?: string
}
interface UnknownError {
    type: ErrorType, error: any
}

enum ErrorType {
    SERVICE, // Deprecated, will be replaced by UNKNOWN
    UNKNOWN, XCALAR, XCALARLOAD, NETWORK
}

function parseError(err: any): ServiceError {
    if (rawErrorCheck.isApiError(err)) {
        const serviceError = {
            type: ErrorType.XCALAR,
            status: err.status, error: err.error,
        };
        if (rawErrorCheck.isApiLoadError(err)) {
            const [errorString, errorFile] =
                [err.response.getErrorString(), err.response.getErrorFile()];
            if (errorString != null && errorString.length > 0) {
                serviceError['errorString'] = errorString;
            }
            if (errorFile != null && errorFile.length > 0) {
                serviceError['errorFile'] = errorFile;
            }
        }
        return serviceError;
    } else if (rawErrorCheck.isNetworkError(err)) {
        return { type: ErrorType.NETWORK, httpStatus: err.statusCode };
    } else {
        return { type: ErrorType.UNKNOWN, error: err };
    }
}

const rawErrorCheck = {
    isApiError: function(err: Object): err is { status: number, error: string } {
        return err != null && err.hasOwnProperty('status') && err.hasOwnProperty('error');
    },
    isApiLoadError: function(err: Object): err is { response: ProtoTypes.Operator.BulkLoadResponse } {
        return err != null &&
            err.hasOwnProperty('response') &&
            (err['response'] instanceof ProtoTypes.Operator.BulkLoadResponse);
    },
    isNetworkError: function(err: Object): err is { statusCode: number } {
        return err != null &&
            (err.hasOwnProperty('name') && err['name'] === 'statusCode') &&
            err.hasOwnProperty('statusCode');
    }
};

function isNetworkError(error: ServiceError): error is NetworkError {
    return error != null && error.type === ErrorType.NETWORK;
}

function isXcalarError(error: ServiceError): error is XcalarError {
    return error != null && error.type === ErrorType.XCALAR;
}

function isXcalarLoadError(error: ServiceError): error is XcalarLoadError {
    return error != null && error.type === ErrorType.XCALAR && error.hasOwnProperty('errorString');
}

export { ServiceError, ErrorType, parseError, isNetworkError, isXcalarError, isXcalarLoadError };