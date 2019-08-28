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
        let targetName = DSTargetManager.getCloudFileTarget();
        let path: string = "/" + CloudManager.Instance.getS3BucketInfo().bucket + "/";
        let options = {
            cloud: true,
            backCB: () => DSSource.show()
        };
        FileBrowser.show(targetName, path, restore, options);
        _getFileBrowser().addClass("cloud");
        uploader.toggle(true);
    }

    /**
     * CloudFileBrowser.clear
     */
    export function clear(): void {
        uploader.toggle(false);
        _getFileBrowser().removeClass("cloud");
    }

    function _getFileBrowser(): JQuery {
        return $("#fileBrowser");
    }

    function _uploadFile(file?: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let fileName: string = file.name.replace(/C:\\fakepath\\/i, '').trim();
        FileBrowser.addFileToUpload(fileName);

        CloudManager.Instance.uploadToS3(fileName, file)
        .then(() => {
            FileBrowser.refresh();
            deferred.resolve();
        })
        .fail((error) => {
            _handleUploadError(error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function _handleUploadError(error: string): void {
        Alert.error(ErrTStr.Error, error);
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
                _uploadFile(file);
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