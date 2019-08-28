// Browser side (cloud.xcalar.com)
class CloudManager {
    private static _instance: CloudManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _username: string;
    private _apiUrl: string;
    private _s3Info: {access_key: string, secret_access_key: string, bucket: string};

    public constructor() {
        // XXX TODO: remove the hard code stuff
        this._username = "test@xcalar.com";
        this._apiUrl = "https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/";
    }

    /**
     * CloudManager.Instance.getS3BucketInfoAsync
     */
    public getS3BucketInfoAsync(): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        let url = this._getRESTUrl("s3/describe");
        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "user_name": this._username
            })
        })
        .then(res => res.json())
        .then((res: {status: number, access_key: string, secret_key: string, bucket_name: string}) => {
            // XXX TODO: use a enum instead of 0
            if (res.status === 0) {
                this._s3Info = {
                    access_key: res.access_key,
                    secret_access_key: res.secret_key,
                    bucket: res.bucket_name
                };
                deferred.resolve();
            } else {
                deferred.reject();
            }
        })
        .catch((e) => deferred.reject(e));

        return deferred.promise();
    }

    /**
     * CloudManager.Instance.getS3BucketInfo
     */
    public getS3BucketInfo(): {
        access_key: string,
        secret_access_key: string,
        bucket: string
    } {
        return this._s3Info;
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
            return this._fakeUpload(fileName, fileContent);
            let data = {
                fileName,
                fileContent
            };
            return xcHelper.sendRequest("POST", "/service/uploadCloud", data);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _getRESTUrl(action: string): string {
        return this._apiUrl + action;
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

    // XXX TODO: remove the fake api
    private _fakeUpload(fileName, fileContent) {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        fetch('https://g6sgwgkm1j.execute-api.us-west-2.amazonaws.com/Prod/s3/upload', {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                "user_name": "test@xcalar.com",
                "file_name": fileName,
                "data": fileContent
            }),
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
                deferred.resolve();
            } else {
                deferred.reject();
            }
        })
        .catch((e) => deferred.reject(e));

        return deferred.promise();
    }
}