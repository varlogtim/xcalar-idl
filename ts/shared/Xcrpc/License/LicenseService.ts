import { LicenseService as ApiLicense, XceClient as ApiClient } from 'xcalar';
import { ServiceError, ErrorType } from '../ServiceError';
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
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }

    /**
     * Update license
     * @param newLicense the string representation of a license
     * @description This function returns native promise
     */
    public async updateLicense(newLicense: string): Promise<void> {
        try {
            const licenseValue = new ProtoTypes.License.LicenseValue();
            licenseValue.setValue(newLicense);
            const request = new ProtoTypes.License.UpdateRequest();
            request.setLicensevalue(licenseValue);

            const licenseService = new ApiLicense(this._apiClient);
            const response = await licenseService.update(request);

            return response;
        } catch (e) {
            // XXX TODO: API error handling
            const error: ServiceError = {
                type: ErrorType.SERVICE, error: e
            };
            throw error;
        }
    }
}

export { LicenseService };