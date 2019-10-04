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
    private _updateCreditsTime: number = 1 * 60 * 1000; // check every minute
    // XXX do not change _updateCreditsTime - it is synced with AWS Lambda
    private _userName: string = "";
    private _awsURL: string = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod"; // XXX temporary
    private _stopClusterMessageSent: boolean = false;
    private _lowCreditWarningSent: boolean = false;
    private _clusterPrice: number = null;

    public constructor() {
        this.checkCluster(); // to get cluster price
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
    public async stopCluster(repeatTry?: boolean): Promise<any> {
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
            xcConsole.log("cluster shutting down", data);
            if (!repeatTry && (!data || data.status !== 0)) {
                return this.stopCluster(true);
            } else {
                return data;
            }
        } catch (e) {
            if (!repeatTry) {
                return this.stopCluster(true);
            }
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
            if (data && data.clusterPrice) {
                this._clusterPrice = data.clusterPrice;
            }
            return data;
        } catch (e) {
            return {error: e};
        }
    }

    public getNumCredits(): number {
        return this._numCredits;
    }

    public async logout(): Promise<any> {
        try {
            let logoutResult = await request.get("https://1jqb965i1d.execute-api.us-west-2.amazonaws.com/prod/logout");
            return logoutResult
        } catch (e) {
            return {error: e};
        }
    }

    // should only be called once in constructor and then recursively, otherwise
    // user's credits will be deducted unnecessarily
    // deducts credits, gets credits, and calls _updateCredits which calls itself
    private async _updateCredits(): Promise<void> {
        clearTimeout(this._updateCreditsInterval);
        if (!this._userName) {
            this._updateCreditsInterval = setTimeout(() => {
                this._updateCredits();
            }, this._updateCreditsTime);
            return;
        }
        try {
            await this._deductCredits();
        } catch (e) {
            xcConsole.error("deduct credits error", e.error);
        }

        try {
            await this._fetchCredits();
        } catch (e) {
            xcConsole.error("fetch credits error", e);
        }
        this._updateCreditsInterval = setTimeout(() => {
            this._updateCredits();
        }, this._updateCreditsTime);
    }

    private async _deductCredits(): Promise<void> {
        try {
           let res =  await request.post({
                url: this._awsURL + "/billing/deduct",
                body: {"username": this._userName},
                json: true
            });
            if (res && res.status !== 0) {
                xcConsole.error("deduct credits error", res);
            }
            return res;
        } catch (e) {
            xcConsole.error(e);
            return e;
        }
    }

    private async _fetchCredits(): Promise<number> {
        try {
            const data: {status: number, credits: number} = await request.post({
                url: this._awsURL + "/billing/get",
                body: {"username": this._userName},
                json: true
            });
            let credits: number = null;
            if (data && data.status !== 0) {
                xcConsole.error("fetch credits error", data);
            } else if (data && data.credits != null) {
                credits = data.credits;
            }
            this._numCredits = credits;
            this._checkCreditsWarning();
            return credits;
        } catch (e) {
            xcConsole.error(e);
            return null;
        }
    }
    // shuts down cluster if credits == 0, or sends socket warning if
    // 1.5 minutes remain
    private _checkCreditsWarning(): void {
        if (this._isOutOfCredits() && !this._stopClusterMessageSent) {
            this._stopClusterMessageSent = true;
            socket.logoutMessage({
                type: "noCredits"
            });
            this.stopCluster();
            this.logout();
        } else {
            this._stopClusterMessageSent = false;
            if (this._isLowOnCredits() && !this._lowCreditWarningSent) {
                this._lowCreditWarningSent = true;
                socket.lowCreditWarning();
            } else {
                this._lowCreditWarningSent = false;
            }
        }
    }

    private _isLowOnCredits(): boolean {
        return (!isNaN(this._numCredits) &&
                this._clusterPrice &&
                this._numCredits < (1.5 * this._clusterPrice));
    }

    private _isOutOfCredits(): boolean {
        return (!isNaN(this._numCredits) &&
                (typeof this._numCredits === "number") &&
                this._numCredits <= 0);
    }

    /* HACK TO SET USER NAME */
    public setUserName(name) {
        this._userName = name;
        this._fetchCredits();
        return this._userName;
    }
}

export default new CloudManager();