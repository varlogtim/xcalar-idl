import * as fs from "fs";
import * as xcConsole from "../utils/expServerXcConsole";
import { exec, ChildProcess } from "child_process";
import { Status } from "../utils/supportStatusFile";

interface S3Param {
    Bucket: string,
    Key: string,
    Body?: any
}

function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// Promise wrappers for exec and fs.writeFile
function execPromise(command: string, options?: any): Promise<void> {
    let deferred: any = jQuery.Deferred();

    exec(command, options, function(err) {
        if (err) {
            deferred.reject({"status": Status.Error, "logs": err});
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise();
}

function writeFilePromise(filePath: fs.PathLike | number, data: any): Promise<void> {
    let deferred: any = jQuery.Deferred();
    fs.writeFile(filePath, data, function(err) {
        if (err) {
            deferred.reject({"status": Status.Error, "logs": err});
        } else {
            deferred.resolve();
        }
    });

    return deferred.promise();
}

export function uploadContent(req: any, res): Promise<any> {
    let deferred: any = jQuery.Deferred();
    let awsTmp: any = require('aws-sdk');
    let s3Tmp: any = new awsTmp.S3({
        "accessKeyId": "AKIAIMI35A6P3BFJTDEQ",
        "secretAccessKey": "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"
    });

    let tmpPrefix: string = "/tmp/app" + getRandomInt(0, 1000) + "/";
    deleteFolderRecursive(tmpPrefix);
    xcConsole.log("Deleted local " + tmpPrefix);
    let name: string = req.body.name;
    let version: string = req.body.version;
    let jsFileText: string = req.body.jsFileText;
    let jsFilePath: string = req.body.jsFilePath;
    let jsFileName: string = name + '.ext.js';
    let jsFileObj: boolean = req.body.jsFileObj;
    let pyFileText: string = req.body.pyFileText;
    let pyFilePath: string = req.body.pyFilePath;
    let pyFileName: string = name + '.ext.py';
    let pyFileObj: boolean = req.body.pyFileObj;

    create(tmpPrefix)
    .then(function(): Promise<any> {
        let jsPromise;
        let pyPromise;

        // Prefer file upload over file path if both are provided
        if (jsFileObj) {
            jsPromise = writeFilePromise(tmpPrefix + jsFileName, jsFileText);
        } else {
            let copyJsFile = "cp " + jsFilePath + " " + tmpPrefix + jsFileName;
            jsPromise = execPromise(copyJsFile);
        }

        if (pyFileObj) {
            pyPromise = writeFilePromise(tmpPrefix + pyFileName, pyFileText);
        } else {
            let copyPyFile = "cp " + pyFilePath + " " + tmpPrefix + pyFileName;
            pyPromise = execPromise(copyPyFile);
        }

        return jQuery.when(jsPromise, pyPromise);
    })
    .then(function(): Promise<number> {
        return gzipAndUpload(name, version, tmpPrefix, s3Tmp);
    })
    .then(function(): Promise<any> {
        return uploadMeta(req, res, s3Tmp);
    })
    .then(function(data): void {
        deferred.resolve(data);
    })
    .fail(function(error): void {
        deferred.reject(error);
    });
    return deferred.promise();
}

function gzipAndUpload(name: string, version: string, tmpPrefix: string,
    s3Tmp: any): Promise<number> {
    let tmpTarGz: string = tmpPrefix+"tmp.tar.gz";
    let deferred: any = jQuery.Deferred();
    gzip(tmpTarGz, tmpPrefix)
    .then(function(): void {
        xcConsole.log("Succeeded to tar");
        fs.readFile(tmpTarGz, function(err: any, data) {
            upload('extensions/' + name + "/" + version + "/" + name + '-' +
                version + '.tar.gz', data, s3Tmp)
            .then(function() {
                xcConsole.log("Uploaded .tar.gz");
                deleteFolderRecursive(tmpPrefix);
                xcConsole.log("Deleted local " + tmpPrefix);
                deferred.resolve(Status.Done);
            });
        });
    });
    return deferred.promise();
}

function deleteFolderRecursive(path: fs.PathLike): void {
    if (fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file: fs.PathLike): void{
            let curPath: fs.PathLike = path + "/" + file;
            if (fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

function create(dir: fs.PathLike): Promise<void> {
    let deferred: any = jQuery.Deferred();
    fs.access(dir, function(err) {
        if (err) {
            fs.mkdirSync(dir);
            deferred.resolve();
        } else {
            deferred.resolve();
        }
    });
    return deferred.promise();
}

function gzip(fileName: string, tmpPrefix: string): Promise<number> {
    let deferred: any = jQuery.Deferred();
    let execString: string = "tar -czf " + fileName + " -C " + tmpPrefix +
        " . --exclude \"*.tar.gz\" --warning=no-file-changed";
    let out: ChildProcess = exec(execString);

    out.on('close', function(code: number): void {
        // code(1) means files were changed while being archived
        if (code === 0 || code === 1) {
            xcConsole.log("Success: tar gz");
            deferred.resolve(Status.Done);
        } else {
            xcConsole.log("Failure: tar gz with code " + code);
            deferred.reject();
        }
    });
    return deferred.promise();
}

export function uploadMeta(req: any, res: any, s3Tmp: any): Promise<any> {

    let name: string = req.body.name;
    let version: string = req.body.version;
    let imageUrl: string = req.body.imageUrl;
    let description: string = req.body.description;
    let main: string = req.body.main;
    let repository_type: string = req.body.repository_type;
    let repository_url: string = req.body.repository_url;
    let author: string = req.body.author;
    let category: string = req.body.category;
    let website: string = req.body.website;
    let imagePath: string = req.body.imgPath;
    let imageBinary: any = req.body.imgBinary;
    let dataToSend: any = {
        "appName": name,
        "version": version,
        "description": description,
        "main": main,
        "repository_type": repository_type,
        "repository_url": repository_url,
        "author": author,
        "category": category,
        "imageUrl": imageUrl,
        "website": website,
        "image": ""
    };

    let file: string = 'extensions/'+name+"/"+version+"/"+name+'.txt';
    let image: string;
    // Prefer file upload over file path if both are provided
    if (imageBinary) {
        dataToSend.image = imageBinary;
        return upload(file, JSON.stringify(dataToSend), s3Tmp);
    } else {
        let deferred: any = jQuery.Deferred();
        fs.readFile(imagePath, function(err, data) {
            if (err) {
                deferred.reject({"status": Status.Error, "logs": err});
            } else {
                image = data.toString("base64");
                dataToSend.image = image;
                upload(file, JSON.stringify(dataToSend), s3Tmp)
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        });
        return deferred.promise();
    }
}

function upload(file: string, content: any, s3Tmp: any): Promise<any> {
    let deferred: any = jQuery.Deferred();
    let params: S3Param = {
        Bucket: 'marketplace.xcalar.com',
        Key: file,
        Body: content
    };
    s3Tmp.putObject(params, function(err: any, data: any): void {
        if (err) xcConsole.log(err); // an error occurred
        else {
            deferred.resolve(data);
        }
    });
    return deferred.promise();
}

// Below part is only for unit test
function fakeUpload() {
    upload = function(file: string, content: any, s3Tmp: any): Promise<void> {
        return jQuery.Deferred().resolve().promise();
    }
}
function fakeUploadMeta() {
    uploadMeta = function(): Promise<string> {
        return jQuery.Deferred().resolve("upload success").promise();
    }
}
function fakeUploadContent() {
    uploadContent = function(req: any, res: any): Promise<string> {
        return jQuery.Deferred().resolve("success").promise();
    };
}
if (process.env.NODE_ENV === "test") {
    exports.getRandomInt = getRandomInt;
    exports.execPromise = execPromise;
    exports.writeFilePromise = writeFilePromise;
    exports.upload = upload;
    exports.create = create;
    exports.gzipAndUpload = gzipAndUpload;
    // Fake functions
    exports.fakeUpload = fakeUpload;
    exports.fakeUploadMeta = fakeUploadMeta;
    exports.fakeUploadContent = fakeUploadContent;
}