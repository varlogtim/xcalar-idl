// ExpServer side
import * as xcConsole from "../utils/expServerXcConsole.js";
import socket from "./socket";
var request = require('request-promise-native');

class CloudManager {
    private clusterUrl: string;
    private s3Url: string;
    private cfnId: string;
    private userId: string;  // identity_id returned from cognito
    private _numCredits: number = null;
    private _updateCreditsInterval: NodeJS.Timer;
    private _updateCreditsTime: number = 5 * 60 * 1000; // check every 5 minutes
    private _userName: string = "";
    private _awsURL: string = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod"; // XXX temporary
    private _stopClusterMessageSent: boolean;

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
    public async getUserInfo(): Promise<{
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
    public async stopCluster(): Promise<any> {
        xcConsole.log("stop cluster");
        // TO-DO
        // 1. update stack with params to stop any EC2 instances
        // 2. update dynamoDB to remove cluster_url
        try {
            const data: {status: number} = await request.post({
                url: this._awsURL + "/cluster/stop",
                body: {"username": this._userName},
                json: true
            });
            xcConsole.log("cluster shutting down");
            return data;
        } catch (e) {
            return {error: e};
        }
    }

    /**
     * used to check status, isPending,and clusterUrl properties
     */
    public async checkCluster(): Promise<any> {
        try {
            const data = request.post({
                    url: this._awsURL + "/cluster/get",
                    body: {"username": this._userName},
                    json: true
            });
            return data;
        } catch (e) {
            return {error: e};
        }
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
        if (!this._userName) {
            this._updateCredits();
            return;
        }
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
        this._updateCredits();
    }

    private async _fetchCredits(): Promise<number> {
        try {
            const data: {status: number, credits: number} = await request.post({
                url: this._awsURL + "/billing/get",
                body: {"username": this._userName},
                json: true
            });
            let credits: number = null;
            if (data && data.credits != null) {
                credits = data.credits;
            }
            this._numCredits = credits;
            if (this._numCredits <= 0 && !this._stopClusterMessageSent) {
                this._stopClusterMessageSent = true;
                socket.logoutMessage({
                    type: "noCredits"
                });
                cloudManager.stopCluster();
            } else {
                this._stopClusterMessageSent = false;
            }
            return credits;
        } catch (e) {
            return null;
        }
    }

    private async _deductCredits(): Promise<void> {
        return await request.post({
                url: this._awsURL + "/billing/deduct",
                body: {"username": this._userName},
                json: true
        });
    }

    /* HACK TO SET USER NAME */
    public setUserName(name) {
        this._userName = name;
        this._fetchCredits();
        return this._userName;
    }
}

export default new CloudManager();