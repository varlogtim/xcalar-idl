import { LicenseService as ApiLicense, XceClient as ApiClient } from 'xcalar';
import { parseError } from '../ServiceError';
import ProtoTypes = proto.xcalar.compute.localtypes;

class LicenseService {
    private _apiClient: ApiClient;

    constructor(apiClient: ApiClient) {
        this._apiClient = apiClient;
    }

    /**
     * Get the license struct
     * @param
     * @description This function returns native promise
     */
    public async getLicense(): Promise<ProtoTypes.License.GetResponse> {
        try {
            const request = new ProtoTypes.License.GetRequest();
            const licenseService = new ApiLicense(this._apiClient);
            const response = await licenseService.get(request);

            return response;
        } catch (e) {
            throw parseError(e);
        }
    }

    /**
     * Update license
     * @param newLicense the string representation of a license
     * @description This function returns native promise
     */
    public async updateLicense(param: {
        newLicense: string
    }): Promise<void> {
        try {
            const { newLicense } = param;
            const licenseValue = new ProtoTypes.License.LicenseValue();
            licenseValue.setValue(newLicense);
            const request = new ProtoTypes.License.UpdateRequest();
            request.setLicensevalue(licenseValue);

            const licenseService = new ApiLicense(this._apiClient);
            const response = await licenseService.update(request);

            return response;
        } catch (e) {
            throw parseError(e);
        }
    }
}

export { LicenseService };