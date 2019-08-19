// Browser side (cloud.xcalar.com)
class CloudManager {
    private static _instance: CloudManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private clusterUrl: string;
    private cfnID: string;
    private userId: string;  // identity_id returned from cognito

    public setup(token: string): void {
        // TO-DO Get the credentials using the token, setup DynamoDB & CFN client
    }
    /**
     * Given a userId, return the running cluster url (if any),
     * previous/existing CloudFormation stack id (if any) and remaining credits
     */
    async getUserInfo(): Promise<{
        clusterUrl: string, // when there is no running cluster, return null
        cfnID: string // when there is no CloudFormation stack, return null
        credits: number
    }> {
        // TO-DO make an SDK call to AWS DynamoDB to read
        // if there is no record returned, write a new row
        // set this.clusterUrl & this.cfnID if needed
        return {clusterUrl: null, cfnID: null, credits: null};
    }

    /**
     * Start the cluster given a size
     * @param config 
     */
    async startCluster(config?: {}): Promise<any> {
        // TO-DO
        // 1. list all available CFN stacks and pick any
        // 2. translate config(if any) into CFN changeSet params, then update
        // stack with params to spawn EC2 instances
        // 3. change the owner of CFN stack (remove old if any)
        // 4. update dynamoDB with cluster_url & cfn_id change
        // 5. set this.clusterUrl & this.cfnId
        return null;
    }

        /**
     * Upload a file to an S3 bucket
     * @param file file to upload
     */
    async uploadToS3(file: File): Promise<string> {
        // TO-DO make an SDK call to S3 to remove old file, then upload new file
        // check but this.s3Url should have been set
        return ""; // the url to the object stored on S3
    }
}