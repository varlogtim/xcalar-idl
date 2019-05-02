interface ServiceError {
    type: ErrorType,
    error: any
}

enum ErrorType {
    SERVICE, API
}

export { ServiceError, ErrorType };