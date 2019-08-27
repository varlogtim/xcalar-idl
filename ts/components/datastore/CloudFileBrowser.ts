namespace CloudFileBrowser {
    let uploader: DragDropUploader;

    /**
     * CloudFileBrowser.setup
     */
    export function setup(): void {
        _addUploadEvent();
    }

    /**
     * CloudFileBrowser.show
     */
    export function show(path: string | null, restore: boolean): void {
        let targetName = "Default Shared Root"
        path = path || "/";

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

    function _addUploadEvent(): void {
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

    function _uploadFile(file?: File): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let path: string;
        path = file.name.replace(/C:\\fakepath\\/i, '').trim();
        let fileName: string = path.substring(0, path.indexOf(".")).trim()
                    .replace(/ /g, "");
        // wbName = <string>xcHelper.checkNamePattern(<PatternCategory>"Workbook", <PatternAction>"fix", wbName);

        // const workbooks: object = WorkbookManager.getWorkbooks();
        // wbName = wbDuplicateName(wbName, workbooks, 0);

        _fakeUpload(fileName, file)
        .then(deferred.resolve)
        .fail((error) => {
            _handleUploadError(error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function _fakeUpload(fileName, file): XDPromise<void> {
        console.log("fake upload", fileName, file);
        return PromiseHelper.resolve();
    }

    function _handleUploadError(error: string): void {
        Alert.error(ErrTStr.Error, error);
    }
}