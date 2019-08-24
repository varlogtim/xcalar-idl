// ExpServer side
import * as xcConsole from "../utils/expServerXcConsole.js";
var request = require('request-promise-native');

class CloudManager {
    private clusterUrl: string = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod";
    private s3Url: string;
    private cfnId: string;
    private userId: string;  // identity_id returned from cognito
    private _numCredits: number = null;
    private _updateCreditsInterval;
    private _updateCreditsTime: number = 1 * 60 * 1000; // check every minute
    private _userName: string = "test@xcalar.com"; // XXX temporary

    public constructor() {
        this._fetchCredits();
        this._updateCredits();
    }

    public setup(token: string): void {
        // TO-DO Get the credentials using the token, setup DynamoDB & CFN client
    }
    /**
     * Given a userId, return the running cluster url (if any),
     * previous/existing CloudFormation stack id (if any) and remaining credits
     */
    async getUserInfo(): Promise<{
        clusterUrl: string, // running expServer means running cluster
        cfnId: string // running expServer means running CFN stack
        credits: number
    }> {
        // TO-DO make an SDK call to AWS DynamoDB to read
        // set this.clusterUrl and this.s3Url
        return {clusterUrl: "", cfnId: "", credits: null};
    }

    /**
     * Stop the running cluster
     * @param cfnId
     */
    async stopCluster(): Promise<any> {
        // TO-DO
        // 1. update stack with params to stop any EC2 instances
        // 2. update dynamoDB to remove cluster_url

        return null;
    }

    public getNumCredits(): number {
        return this._numCredits;
    }

    // should only be called once in constructor and then recursively, otherwise
    // user's credits will be deducted unnecessarily
    private async _updateCredits(): Promise<any> {
        clearTimeout(this._updateCreditsInterval);

        this._updateCreditsInterval = setTimeout(() => {
            this._updateCreditsHelper();
        }, this._updateCreditsTime);

        return this._numCredits;
    }

    // deducts credits, gets credits, and calls _updateCredits which calls itself
    private async _updateCreditsHelper(): Promise<void> {
        try {
            await this._deductCredits();
        } catch (e) {
            xcConsole.error(e.error);
        }

        try {
            await this._fetchCredits();
        } catch (e) {
            xcConsole.error(e);
        }
        this.updateCredits();
    }

    private async _fetchCredits(): Promise<number> {
        try {
            const data: {status: number, credits: number} = await request.post({
                url: this.clusterUrl + "/billing/get",
                body: {"userName": this._userName},
                json: true
            });
            let credits: number = null;
            if (data && data.credits != null) {
                credits = data.credits;
            }
            this._credits = credits;
            return credits;
        } catch (e) {
            return null;
        }
    }

    private async _deductCredits(): Promise<void> {
        return await request.post({
                url: this.clusterUrl + "/billing/deduct",
                body: {"userName": this._userName},
                json: true
            });
    }
}

export default new CloudManager();