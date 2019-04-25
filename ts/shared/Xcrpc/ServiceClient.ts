import { XceClient as ApiClient } from 'xcalar';
import { KVStoreService } from './KVStore/KVStoreService';
import { LicenseService } from './License/LicenseService';
import { QueryService } from './Query/QueryService';
import { UDFService} from './UDF/UDFService';

class ServiceClient {
    private _apiClient: ApiClient;

    constructor(endpoint: string) {
        this._apiClient = new ApiClient(endpoint);
    }

    public getKVStoreService(): KVStoreService {
        return new KVStoreService(this._apiClient);
    }

    public getLicenseService(): LicenseService {
        return new LicenseService(this._apiClient);
    }

    public getQueryService(): QueryService {
        return new QueryService(this._apiClient);
    }

    public getUDFService(): UDFService {
        return new UDFService(this._apiClient);
    }
}

export { ServiceClient };