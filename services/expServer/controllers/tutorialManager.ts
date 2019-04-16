import * as xcConsole from "../utils/expServerXcConsole";
import { Status } from "../utils/supportStatusFile";

try {
    let aws: any = require("aws-sdk");
    aws.config.update({
        accessKeyId: 'AKIAJIVAAB7VSKQBZ6VQ',
        secretAccessKey: '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',
        region: 'us-west-2'
    });
    // have to use var here
    var s3: any = new aws.S3();
} catch (error) {
    xcConsole.error("Failure: set up AWS! " + error);
}

export function s3Initialize(): boolean {
    return Boolean(s3);
}

export function downloadTutorial(tutName: string, version: string): Promise<any> {
    let deferred = jQuery.Deferred();
    let params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Key: 'tutorials/' + tutName + "/" + version + "/" + tutName +
             '-' + version + '.xlrwb.tar.gz'
    };
    s3.getObject(params, function(err, data) {
        if (err) {
            let error = "Download tutorial failed with error: " + err;
            xcConsole.error(error);
            deferred.reject(error);
        } else {
            let ret = {
                status: Status.Ok,
                data: data.Body.toString('base64')
            };
            deferred.resolve(ret);
        }
    });
    return deferred.promise();
}

export function processItem(ret: any[], fileName: string): Promise<any> {
    let deferredOnProcessItem = jQuery.Deferred();
    let getTutorial = function(file: string): Promise<string> {
        let deferredOnGetFile = jQuery.Deferred();
        let params = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Key: file
        };
        s3.getObject(params, function(err, data) {
            if (err) {
                deferredOnGetFile.reject(err);
            } else {
                deferredOnGetFile.resolve(data.Body.toString('utf8'));
            }
        });
        return deferredOnGetFile.promise();
    };
    if (fileName.endsWith(".txt")) {
        getTutorial(fileName)
        .then(function(data) {
            ret.push(JSON.parse(data));
            deferredOnProcessItem.resolve("processItem succeeds");
        })
        .fail(function(err) {
            deferredOnProcessItem.reject(err);
        });
    } else {
        deferredOnProcessItem.resolve("processItem succeeds");
    }
    return deferredOnProcessItem.promise();
}

export function fetchAllTutorials(): Promise<any> {
    let deferredOnFetch = jQuery.Deferred();
    let params = {
        Bucket: 'marketplace.xcalar.com', /* required */
        Prefix: 'tutorials/'
    };
    let processItemsDeferred = [];
    s3.listObjects(params, function(err, data) {
        if (err) {
            xcConsole.error('fetch tutorials', err); // an error occurred
            deferredOnFetch.reject(err);
        } else {
            let ret = [];
            let items = data.Contents;
            items.forEach(function(item) {
                let fileName = item.Key;
                processItemsDeferred.push(processItem(ret, fileName));
            });
            jQuery.when.apply(jQuery, processItemsDeferred)
            .then(function() {
                deferredOnFetch.resolve(ret);
            })
            .fail(function(err) {
                xcConsole.error('fetch tutorials', JSON.stringify(arguments));
                deferredOnFetch.reject(err);
            });
        }
    });
    return deferredOnFetch.promise();
}

// Below part is only for Unit Test
export const getObject = s3.getObject;

export function fakeProcessItem(func) {
    processItem = func;
}
export function fakeDownloadTutorial(func) {
    downloadTutorial = func;
}
export function fakeFetchAllTutorials(func) {
    fetchAllTutorials = func;
}
export function fakeGetObject(func) {
    s3.getObject = func;
}