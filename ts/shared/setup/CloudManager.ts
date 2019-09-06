// Browser side (cloud.xcalar.com)
class CloudManager {
    private static _instance: CloudManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _username: string;
    private _apiUrl: string;
    private _s3Info: {bucket: string};

    public constructor() {
        // XXX TODO: remove the hard code stuff
        this._username = "test@xcalar.com";
        this._apiUrl = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/";
    }

    /**
     * CloudManager.Instance.getS3BucketInfo
     */
    public getS3BucketInfo(): XDPromise<{bucket: string}> {
        if (this._s3Info != null) {
            return PromiseHelper.resolve(this._s3Info);
        }

        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        this._sendRequest("s3/describe", {})
        .then((res: {bucketName: string}) => {
            this._s3Info = {
                bucket: res.bucketName
            };
            deferred.resolve(this._s3Info);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * CloudManager.Instance.uploadToS3
     * Upload a file to an S3 bucket
     * @param fileName the file's name
     * @param file file to upload
     */
    public uploadToS3(fileName: string, file: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this._readFile(file)
        .then((fileContent) => {
            return this._sendRequest("s3/upload",{
                "fileName": fileName,
                "data": fileContent
            });
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * CloudManager.Instance.deleteS3File
     * delete a file from s3 bucket
     * @param fileName
     */
    public deleteS3File(fileName: string): XDPromise<void> {
        return this._sendRequest("s3/delete", {
            "fileName": fileName
        });
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

    // XXX TODO: generalized it with the one in workbookManager
    private _readFile(file: File): XDPromise<any> {
        if (file == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<any> = PromiseHelper.deferred(); //string or array buffer
        const reader: FileReader = new FileReader();

        reader.onload = function(event: any) {
            deferred.resolve(event.target.result);
        };

        reader.onloadend = function(event: any) {
            const error: DOMException = event.target.error;
            if (error != null) {
                deferred.reject(error);
            }
        };

        reader.readAsBinaryString(file);

        return deferred.promise();
    }

    private _sendRequest(action: string, payload: object): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const url: string = `${this._apiUrl}${action}`;
        payload = {
            "username": this._username,
            ...payload
        }
        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        })
        .then(res => {
            if (res.status === httpStatus.OK) {
                return res.json();
            } else {
                return PromiseHelper.reject();
            }
        })
        .then((res: {status: number}) => {
            // XXX TODO: use a enum instead of 0
            if (res.status === 0) {
                deferred.resolve(res);
            } else {
                deferred.reject();
            }
        })
        .catch((e) => {
            deferred.reject(e);
        });

        return deferred.promise();
    }
}