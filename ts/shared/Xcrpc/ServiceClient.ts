namespace Xcrpc {
    import ApiClient = xce.XceClient;

    export class ServiceClient {
        private _apiClient: ApiClient;

        constructor(endpoint: string) {
            this._apiClient = new ApiClient(endpoint);
        }

        public getKVStoreService(): KVStoreService {
            return new Xcrpc.KVStoreService(this._apiClient);
        }

        public getLicenseService(): LicenseService {
            return new Xcrpc.LicenseService(this._apiClient);
        }

        public getQueryService(): QueryService {
            return new Xcrpc.QueryService(this._apiClient);
        }
    }
}

if (typeof exports !== 'undefined') {
    exports.ServiceClient = Xcrpc.ServiceClient;
}