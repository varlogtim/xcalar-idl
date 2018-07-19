class HTTPService {
    private static _instance: HTTPService;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {}

    public ajax(options: any): XDPromise<any> {
        return jQuery.ajax(options)
                .fail((error) => this._errorHandler(error));
    }

    private _errorHandler(error) {
        console.error(error);
        try {
            if (error.status === httpStatus.Unauthorized) {
                if (typeof xcManager !== 'undefined') {
                    // index.html case
                    xcManager.forceLogout();
                }
            }
        } catch (e) {
            // skip
        }
    }
}