import * as xcConsole from "../utils/expServerXcConsole";
import * as fs from "fs";
import { exec, ChildProcess } from "child_process";
import { Status } from "../utils/supportStatusFile";

interface S3Param {
    Bucket: string,
    Key?: string,
    Prefix?: string
}

interface ReturnMsg {
    status: number,
    data: string
}

export default class ExtensionManager {
    private static _instance = null;
    public static get getInstance(): ExtensionManager {
        return this._instance || (this._instance = new this());
    }

    public basePath: string;
    private _guiDir: string;
    private _s3: any;

    private constructor() {
        this._guiDir = (process.env.XCE_HTTP_ROOT ?
            process.env.XCE_HTTP_ROOT : "/var/www") + "/xcalar-gui";
        this.basePath = this._guiDir + "/assets/extensions/";

        try {
            let aws: any = require("aws-sdk");
            aws.config.update({
                accessKeyId: 'AKIAJIVAAB7VSKQBZ6VQ',
                secretAccessKey: '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',
                region: 'us-west-2'
            });
            this._s3 = new aws.S3();
        } catch (error) {
            this._s3 = {};
            xcConsole.error("Failure: set up AWS! " + error);
        }
    }

    s3Initialize(): boolean {
        return Boolean(this._s3);
    }

    writeTarGz(targz: string, name: string, version: string): Promise<string> {
        let deferred: any = jQuery.Deferred();
        let zipFile: Buffer = Buffer.from(targz, 'base64');
        let zipPath: string = this.basePath + "ext-available/" + name + "-" +
                                version + ".tar.gz";
        let tarCommand: string = "tar -zxf '" + zipPath + "' -C " + this.basePath +
                        "ext-available/";
        xcConsole.log("Adding extension to " + zipPath);
        fs.writeFile(zipPath, zipFile, (error) => {
            if (error) {
                deferred.reject("Adding Extension failed with error: " + error);
            }
            xcConsole.log("untar extension with: ", tarCommand);
            let out: ChildProcess = exec(tarCommand);
            out.stderr.on('data', (data) => {
                xcConsole.error('stderr from command ' + tarCommand + ': ' + data);
            });
            out.on('close', (code) => {
                // Code is either 0, which means success, or 1, which means error.
                if (code) {
                    xcConsole.log("Failure: Untar failed");
                    deferred.reject("Adding Extension failed with error: " +
                                        "Unable to untar the extension");
                } else {
                    xcConsole.log("Success: Untar finishes");
                    deferred.resolve("writeTarGz succeeds");
                }
            });
        });
        return deferred.promise();
    }

    writeTarGzWithCleanup(targz: string, name: string, version: string):
        Promise<string> {
        let deferred: any = jQuery.Deferred();
        this.writeTarGz(targz, name, version)
        .then(() => {
            // Remove the tar.gz
            fs.unlink(this.basePath + "ext-available/" + name + "-" + version +
            ".tar.gz", (err) => {
                // regardless of status, this is a successful install.
                // we simply console log if the deletion went wrong.
                if (err) {
                    xcConsole.error("Failure: Failed to delete .tar.gz with err: "
                                + err);
                } else {
                    xcConsole.log("Success: Removed .tar.gz finishes. ");
                }
                deferred.resolve("writeTarGzWithCleanup succeeds");
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    downloadExtension(extName: string, version: string): Promise<ReturnMsg> {
        let deferred: any = jQuery.Deferred();
        let params: S3Param = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Key: 'extensions/' + extName + "/" + version + "/" + extName +
                '-' + version + '.tar.gz'
        };
        this._s3.getObject(params, (err, data) => {
            if (err) {
                let error: string = "Download extension failed with error: " + err;
                xcConsole.error(error);
                deferred.reject(error);
            } else {
                let ret: ReturnMsg = {
                    status: Status.Ok,
                    data: data.Body.toString('base64')
                };
                deferred.resolve(ret);
            }
        });
        return deferred.promise();
    }

    // type == "enabled" || type == "available"
    getExtensionFiles(extName: string, type: string): Promise<string[]> {
        let deferred: any = jQuery.Deferred();
        fs.readdir(this.basePath + "ext-" + type + "/", (err, files) => {
            let extFiles: string[] = [];
            if (err) {
                let error: string = "Getting extension files failed with error: "
                                        + err;
                xcConsole.error(error);
                deferred.reject(error);
            }
            for (let i: number = 0; i < files.length; i++) {
                if (extName === "") {
                    extFiles.push(files[i]);
                } else {
                    if (files[i].indexOf(extName + ".ext") === 0) {
                        extFiles.push(files[i]);
                    }
                }
            }
            deferred.resolve(extFiles);
        });
        return deferred.promise();
    }

    enableExtension(extName: string): Promise<string> {
        let deferred: any = jQuery.Deferred();
        let filesToEnable: string[] = [];
        // List files in ext-available
        this.getExtensionFiles(extName, "available")
        .then((files) => {
            filesToEnable = files;
            if (filesToEnable.length === 0) {
                xcConsole.log('extension', extName, 'is not available');
                return jQuery.Deferred().reject("No such extension found in " +
                                                "ext-available.");
            }
            return this.getExtensionFiles(extName, "enabled");
        })
        .then((files) => {
            let filesRemaining: string[] = [];
            let i: number;
            // Check whether the extension is already enabled
            for (i = 0; i < filesToEnable.length; i++) {
                if (files.indexOf(filesToEnable[i]) === -1) {
                    filesRemaining.push(filesToEnable[i]);
                }
            }
            if (filesRemaining.length === 0) {
                let error: string = "Extension " + extName + " already enabled";
                xcConsole.error(error);
                deferred.reject(error);
                return;
            }
            // Create symlinks in the ext-enabled folder
            let str: string = "";
            for (i = 0; i < filesRemaining.length; i++) {
                str += "ln -s " + "../ext-available/" + filesRemaining[i] +
                    " " + this.basePath + "ext-enabled/" + filesRemaining[i] + ";";
            }
            let out: ChildProcess = exec(str);
            out.on('close', (code) => {
                // Code is either 0, which means success, or 1, which means error.
                if (code) {
                    let error: string = "Enable extension " + extName +
                    " failed when creating link";
                    xcConsole.error(error);
                    deferred.reject(error);
                } else {
                    xcConsole.log('enable Extension succeeds');
                    deferred.resolve("enableExtension succeeds");
                }
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    disableExtension(extName: string): Promise<string> {
        let deferred: any = jQuery.Deferred();
        this.getExtensionFiles(extName, "enabled")
        .then((files) => {
            let toRemove: string[] = [];
            let i: number;
            for (i = 0; i < files.length; i++) {
                if (files[i].indexOf(extName + ".ext") === 0) {
                    toRemove.push(files[i]);
                }
            }
            if (toRemove.length === 0) {
                let error: string = "Extension " + extName +  " was not enabled";
                xcConsole.error(error);
                return deferred.reject(error);
            }
            xcConsole.log('disable', toRemove);
            let str: string = "";
            for (i = 0; i < toRemove.length; i++) {
                str += "rm " + this.basePath + "ext-enabled/" + toRemove[i] + ";";
            }
            let out: ChildProcess = exec(str);
            out.on('close', (code) => {
                if (code) {
                    let error: string = 'Disable extension ' + extName +
                    ' failed with code: ' + code;
                    xcConsole.error(error);
                    deferred.reject(error);
                } else {
                    xcConsole.log('disable extension', extName, 'succeed');
                    deferred.resolve("disableExtension succeeds");
                }
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    removeExtension(extName: string): Promise<string> {
        let deferred: any = jQuery.Deferred();
        this.getExtensionFiles(extName, "enabled")
        .then((files) => {
            if (files.length > 0) {
                let error: string = "Extension " + extName +
                                        " must be disabled first";
                xcConsole.error(error);
                return jQuery.Deferred().reject(error);
            } else {
                return this.getExtensionFiles(extName, "available");
            }
        })
        .then((files) => {
            if (files.length === 0) {
                let error: string = "Extension " + extName + " does not exist";
                xcConsole.error(error);
                return deferred.reject(error);
            }
            // Remove all the files (symlinks are removed during disable)
            let str: string = "";
            for (let i: number = 0; i < files.length; i++) {
                str += "rm " + this.basePath + "ext-available/" + files[i] + ";";
            }
            let out: ChildProcess = exec(str);
            out.on("close", (code) => {
                if (code) {
                    let error = "Remove extension " + extName +
                    " failed with error code: " + code;
                    xcConsole.error(error);
                    deferred.reject(error);
                } else {
                    xcConsole.log('remove extension', extName, 'succeeds');
                    deferred.resolve("removeExtension succeeds");
                }
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    processItem(ret: any[], fileName: string): Promise<string> {
        let deferredOnProcessItem: any = jQuery.Deferred();
        let getExtension: (file: string) => Promise<string> =
            function(file: string): Promise<string> {
                let deferredOnGetFile = jQuery.Deferred();
                let params: S3Param = {
                    Bucket: 'marketplace.xcalar.com', /* required */
                    Key: file
                };
                let self = ExtensionManager.getInstance;
                self._s3.getObject(params, (err, data) => {
                    if (err) {
                        deferredOnGetFile.reject(err);
                    } else {
                        deferredOnGetFile.resolve(data.Body.toString('utf8'));
                    }
                });
                return deferredOnGetFile.promise();
        };
        if (fileName.endsWith(".txt")) {
            getExtension(fileName)
            .then((data) => {
                ret.push(JSON.parse(data));
                deferredOnProcessItem.resolve("processItem succeeds");
            })
            .fail((err) => {
                deferredOnProcessItem.reject(err);
            });
        } else {
            deferredOnProcessItem.resolve("processItem succeeds");
        }
        return deferredOnProcessItem.promise();
    }

    fetchAllExtensions(): Promise<any[]> {
        let deferredOnFetch: any = jQuery.Deferred();
        let params: S3Param = {
            Bucket: 'marketplace.xcalar.com', /* required */
            Prefix: 'extensions/'
        };
        let processItemsDeferred: Promise<string>[] = [];
        this._s3.listObjects(params, (err, data) => {
            if (err) {
                xcConsole.error('fetch extensions', err); // an error occurred
                deferredOnFetch.reject(err);
            } else {
                let ret: any[] = [];
                let items: any = data.Contents;
                items.forEach((item) => {
                    let fileName: string = item.Key;
                    processItemsDeferred.push(this.processItem(ret, fileName));
                });
                jQuery.when.apply(jQuery, processItemsDeferred)
                .then(() => {
                    deferredOnFetch.resolve(ret);
                })
                .fail((err) => {
                    xcConsole.error('fetch extensions', JSON.stringify(arguments));
                    deferredOnFetch.reject(err);
                });
            }
        });
        return deferredOnFetch.promise();
    }

}
