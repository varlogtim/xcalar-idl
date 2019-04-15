namespace Xcrpc {
    export interface ServiceError {
        type: ServiceError.ErrorType,
        error: any
    }

    export namespace ServiceError {
        export enum ErrorType {
            SERVICE, API
        }
    }
}