namespace DSSource {
    /**
     * DSSource.setup
     */
    export function setup(): void {
        _addEventListeners();
    }
    
    /**
     * DSSource.show
     */
    export function show(): void {
        if (!XVM.isCloud()) {
            // on-prem will rediret to the old import screen
            DSForm.show();
            return;
        }
        DataSourceManager.switchView(DataSourceManager.View.Source);
    }

    function _getCard() {
        return $("#dsForm-source");
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

    function _addEventListeners(): void {
        let $card = _getCard();
        _addUploadEvent();

        $card.find(".location.s3").click(() => {
            DSS3Config.show();
        });

        $card.find(".location.database").click(() => {
            // XXX TODO: implement it
            Alert.show({
                "title": "New Feature",
                "msg": "This feature is coming soon",
                "isAlert": true
            });
        });

        $card.find(".more").click(() => {
            DSForm.show();
        });
    }

    function _addUploadEvent(): void {
        let $card = _getCard();
        let $section = $card.find(".location.file");
        let $uploadInput = $("#dsForm-source-upload");
        $section.click(() => {
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

        new DragDropUploader({
            $container: $card,
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