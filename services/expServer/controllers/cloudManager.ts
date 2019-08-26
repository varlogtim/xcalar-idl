import * as xcConsole from "../utils/expServerXcConsole.js";
// ExpServer side
class CloudManager {
    private clusterUrl: string;
    private s3Url: string;
    private cfnId: string;
    private userId: string;  // identity_id returned from cognito
    private jQuery: any;

    public constructor() {
        require("jsdom/lib/old-api").env("", (err, window) => {
            if (err) {
                xcConsole.error('require in expServerSupport', err);
                return;
            }
            this.jQuery = require("jquery")(window);
        });
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

    async updateCredits(): Promise<any> {
        // TO-DO update dynamoDB by periodically deducting the credit.
        // Using the returned value (updated field) to do isLowCredit() validation

        // XXX not working, possibly due to CORS?
        this.jQuery.ajax({
            "type": "POST",
            "data": JSON.stringify({"userName": "wlu@xcalar.com"}),
            "contentType": "application/json",
            "url": "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/billing/get",
            "cache": false,
            success: (data: string) => {
                xcConsole.log('get credits', data);
                // deferredOut.resolve({
                //     "status": httpStatus.OK,
                //     "logs": JSON.stringify(data)
                // });
            },
            error: (err) => {
                xcConsole.error('get credits failed', err);
                // deferredOut.reject(err);
                return;
            }
        });
        return null;
    }
}

export default new CloudManager();