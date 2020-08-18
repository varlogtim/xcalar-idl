// Browser side (cloud.xcalar.com)
class CloudManager {
    private static _instance: CloudManager;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _apiUrl: string;
    private _s3Info: {bucket: string};

    public constructor() {}

    /**
     * CloudManager.Instance.setup
     */
    public setup(): XDPromise<void> {
        if (!XVM.isCloud()) {
            return PromiseHelper.resolve();
        }
        CloudFileBrowser.setup();
        this._removeNonCloudFeature();
        this.checkCloud();
        return this.setApiUrl();
    }

    public setApiUrl(): XDPromise<void> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        xcHelper.sendRequest("GET", "/service/getApiUrl")
        .then((apiUrl) => {
            this._apiUrl = apiUrl;
            deferred.resolve();
        })
        .fail((e) => {
            console.error("Failed to set cloud api url.", e);
            // always resolve as cloud setup failure shouldn't block other components
            deferred.resolve();
        });
        return deferred.promise();
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

        xcHelper.readFile(file)
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
     * CloudManager.Instance.multiUploadToS3
     * Upload a file to an S3 bucket with multipart api
     * @param fileName the file's name
     * @param file file to upload
     */
    public multiUploadToS3(fileName: string, file: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let allData: string;
        let stringifyData: string;
        let uploadId: string;
        const partList: any = [];
        const partSize: number = 6000000;

        xcHelper.readFile(file)
        .then((fileContent) => {
            allData = fileContent;
            stringifyData = JSON.stringify(allData);
            return this._sendRequest("s3/multipart/start", {
                "fileName": fileName
            });
        })
        .then((res: {uploadId: string}) => {
            uploadId = res.uploadId;
            let promises: XDPromise<any>[] = [];
            let cur: number = 0;
            let i: number = 1;
            while  (cur < stringifyData.length) {
                if (i > 10000) {
                    return PromiseHelper.reject("Part number exceeds limit");
                }
                let partEnd: number = cur + partSize;
                // Catch case a part ends with "\"
                try {
                    JSON.parse(stringifyData.substring(cur, partEnd));
                } catch (e) {
                    partEnd--;
                }
                promises.push(this._uploadPart(
                    fileName,
                    uploadId,
                    JSON.parse(stringifyData.substring(cur, partEnd)),
                    i,
                    partList));
                cur = partEnd;
                i++;
            }
            return PromiseHelper.when(...promises);
        })
        .then(() => {

            return this._sendRequest("s3/multipart/complete", {
                "fileName": fileName,
                "uploadId": uploadId,
                "uploadInfo": {
                    "Parts": partList
                }
            });
        })
        .then(deferred.resolve)
        .fail((err) => {
            console.error("S3 multi part upload failed: ", err);
            this._sendRequest("s3/multipart/abort", {
                "fileName": fileName,
                "uploadId": uploadId
            })
            .then(() => {
                deferred.reject(err);
            })
            .fail((err2) => {
                // Not sure what we should do here because if abort fail,
                // the existing parts will keep being charged
                deferred.reject(err2);
            });
        });

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

    public checkCloud(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (!XVM.isCloud()) {
            return PromiseHelper.resolve();
        }
        xcHelper.sendRequest("GET", "/service/checkCloud")
        .then((ret) => {
            if (!ret || ret.status !== 0 || !ret.clusterUrl) {
                // deferred.resolve();return; // XXX temporary
                if (ret.error) {
                    deferred.reject(ret.error);
                } else {
                    deferred.reject("Cluster is not started.");
                }
            } else {
                XcUser.setClusterPrice(ret.clusterPrice);
                deferred.resolve();
            }
        })
        .fail((e) => {
            deferred.reject(e);
        });
        return deferred.promise();
    }

    private _removeNonCloudFeature(): void {
        $("#shellPanel").remove();
        $("#debugViewContainer .tab[data-tab=console]").remove();
    }

    // XXX TODO: check if the implementation is correct
    private _getUserName(): string {
        return XcUser.CurrentUser.getFullName();
    }

    private _uploadPart(
        fileName: string,
        uploadId: string,
        data: string,
        partNumber: number,
        partList: any): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._sendRequest("s3/multipart/upload", {
            "fileName": fileName,
            "uploadId": uploadId,
            "data": data,
            "partNumber": partNumber
        })
        .then((ret) => {
            partList[partNumber - 1] = {
                "PartNumber": partNumber,
                "ETag": ret.ETag.substring(1, ret.ETag.length - 1)};
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _sendRequest(action: string, payload: object): XDPromise<any> {
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        const url: string = `${this._apiUrl}/${action}`;
        payload = {
            "username": this._getUserName(),
            ...payload
        }
        fetch(url, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(payload),
        })
        .then(res => {
            if (res.status === httpStatus.OK) {
                return res.json();
            } else {
                return PromiseHelper.reject(res.statusText);
            }
        })
        .then((res: {status: number}) => {
            // XXX TODO: use a enum instead of 0
            if (res.status === 0) {
                deferred.resolve(res);
            } else {
                deferred.reject(res);
            }
        })
        .catch((e) => {
            deferred.reject(e);
        });

        return deferred.promise();
    }
}