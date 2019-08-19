// ExpServer side
class CloudManager {
    private clusterUrl: string;
    private s3Url: string;
    private cfnId: string;
    private userId: string;  // identity_id returned from cognito

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
    }
}

export default new CloudManager();