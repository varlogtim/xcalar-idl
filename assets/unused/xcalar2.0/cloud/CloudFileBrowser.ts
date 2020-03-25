namespace CloudFileBrowser {
    let uploader: DragDropUploader;
    /**
     * CloudFileBrowser.setup
     */
    export function setup(): void {
        _addEventListeners();
    }

    /**
     * CloudFileBrowser.show
     */
    export function show(restore: boolean): void {
        this.clear(); // necessary to reset first
        let targetName = DSTargetManager.getCloudS3Connector();
        let options = {
            cloud: true,
            backCB: () => DSSource.show()
        };
        FileBrowser.show(targetName, null, restore, options);
        _getFileBrowser().addClass("cloud");
        $("#fileBrowserPath .text").attr("readonly", "readonly");
        uploader.toggle(true);
    }

    /**
     * CloudFileBrowser.getCloudPath
     * @param path
     */
    export function getCloudPath(): XDPromise<string> {
        let deferred: XDDeferred<string> = PromiseHelper.deferred();
        CloudManager.Instance.getS3BucketInfo()
        .then((res) => {
            let path: string = "/" + res.bucket + "/";
            deferred.resolve(path);
        })
        .fail((e) => {
            console.error(e);
            deferred.reject();
        });

        return deferred.promise();
    }

    /**
     * CloudFileBrowser.clear
     */
    export function clear(): void {
        uploader.toggle(false);
        _getFileBrowser().removeClass("cloud");
        $("#fileBrowserPath .text").removeAttr("readonly");
    }

    function _getFileBrowser(): JQuery {
        return $("#fileBrowser");
    }

    function _overwriteCheck(fileName: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (FileBrowser.hasFile(fileName)) {
            Alert.show({
                "title": "Overwriting file",
                "msg": `File "${fileName}" alredy exists, do you want to overwrite it?`,
                "onConfirm": () => deferred.resolve(),
                "onCancel": () => deferred.reject()
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    }

    function _uploadFile(file?: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let fileName: string = file.name.replace(/C:\\fakepath\\/i, '').trim();
        if (fileName.endsWith(".xlsx")) {
            _handleUploadError("Upload xlsx file is not supported in this version, please convert the file to CSV.");
            return PromiseHelper.reject();
        }
        if (file.size && (file.size / MB) > 7) {
            _handleUploadError("Please ensure your file is under 6MB.");
            return PromiseHelper.reject();
        }
        let isChecking: boolean = true;
        _overwriteCheck(fileName)
        .then(() => {
            isChecking = false;
            FileBrowser.addFileToUpload(fileName);
            return CloudManager.Instance.uploadToS3(fileName, file);
        })
        .then(() => {
            FileBrowser.refresh();
            deferred.resolve();
        })
        .fail((error) => {
            if (!isChecking) {
                FileBrowser.removeFileToUpload(fileName);
                FileBrowser.refresh();
                console.error(error);
                _handleUploadError("Please ensure your file is under 6MB.");
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function _handleUploadError(error: string): void {
        Alert.error("Upload file failed", error);
    }

    function _addEventListeners(): void {
        let $section = _getFileBrowser();
        let $uploadInput = $("#dsForm-source-upload");

        $section.find(".cloudUploadSection .upload").click(() => {
            $uploadInput.click();
        });

        $uploadInput.change(() => {
            if ($uploadInput.val() !== "") {
                let file = (<HTMLInputElement>$uploadInput[0]).files[0];
                _uploadFile(file)
                .always(() => {
                    $uploadInput.val("");
                });
            }
        });

        uploader = new DragDropUploader({
            $container: $section,
            text: "Drop a file to upload",
            onDrop: (file) => {
                if (!_getFileBrowser().hasClass("errorMode")) {
                    _uploadFile(file);
                }
            },
            onError: (error) => {
                switch (error) {
                    case ('invalidFolder'):
                        Alert.error(UploadTStr.InvalidUpload,
                                    UploadTStr.InvalidFolderDesc);
                        break;
                    case ('multipleFiles'):
                        Alert.show({
                            title: UploadTStr.InvalidUpload,
                            msg: UploadTStr.OneFileUpload
                        });
                        break;
                    default:
                        break;
                }
            }
        });
    }
}