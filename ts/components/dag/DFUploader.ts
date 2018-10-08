class DFUploader {
    private static _file: File;

    /**
     * DFUploader.setup
     */
    public static setup(): void {
        this._addEventListeners();
        this._setupDragDrop();
    }

    /**
     * DFUploader.show
     */
    public static show(): void {
        this._getPanel().show();
    }

    private static _getPanel(): JQuery {
        return $("#dataflowUploadCard");
    }

    private static _getNameInput(): JQuery {
        return this._getPanel().find(".nameArea .name");
    }

    private static _getBrowseButton(): JQuery {
        return this._getPanel().find("input.browse");
    }

    private static _close() {
        const $panel: JQuery = this._getPanel();
        $panel.hide();
        this._file = null;
        $panel.find("input").val("");
        $panel.find(".confirm").addClass("btn-disabled");
        xcTooltip.enable($panel.find(".buttonTooltipWrap"));
    }

    private static _validate(): {tab: DagTabShared} {
        const $nameInput: JQuery = this._getNameInput();
        const dfName: string = $nameInput.val().trim();
        const uploadTab: DagTabShared = new DagTabShared(dfName);
        const isValid: boolean = xcHelper.validate([{
            $ele: $nameInput
        }, {
            $ele: $nameInput,
            error: ErrTStr.DFNameIllegal,
            check: () => {
                return !xcHelper.checkNamePattern(PatternCategory.Dataflow,
                    PatternAction.Check, dfName);
            }
        }, {
            $ele: $nameInput,
            error: DFTStr.DupDataflowName,
            check: () => {
                return !DagList.Instance.isUniqueName(uploadTab.getName());
            }
        }])

        if (!isValid) {
            return null;
        }

        return {
            tab: uploadTab
        };
    }

    private static _submitForm(): XDPromise<void> {
        const res: {tab: DagTabShared} = this._validate();
        if (res == null) {
            return PromiseHelper.reject();
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $confirmBtn: JQuery = this._getPanel().find(".confirm");
        xcHelper.disableSubmit($confirmBtn);

        const tab: DagTabShared = res.tab;
        const file: File = this._file;
        let timer: number = null;

        this._checkFileSize(file)
        .then(() => {
            timer = window.setTimeout(() => {
                this._lockCard();
            }, 1000);
            return this._readFile(file);
        })
        .then((fileContent) => {
            return tab.upload(fileContent);
        })
        .then(() => {
            xcHelper.showSuccess(SuccessTStr.Upload);
            this._close();
            DagList.Instance.refresh();
            deferred.resolve();
        })
        .fail(deferred.reject)
        .always(() => {
            clearTimeout(timer);
            this._unlockCard();
            xcHelper.enableSubmit($confirmBtn);
        });

        return deferred.promise();
    }

    private static _lockCard() {
        this._getPanel().find(".cardLocked").show();
    }

    private static _unlockCard() {
        this._getPanel().find(".cardLocked").hide();
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookPanel.ts
    private static _checkFileSize(file: File): XDPromise<void> {
        if (file == null) {
            return PromiseHelper.resolve();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const size: number = file.size;
        const sizeLimit: number = 5 * MB; // 5MB
        if (size <= sizeLimit) {
            deferred.resolve();
        } else {
            const msg: string = xcHelper.replaceMsg(ErrWRepTStr.LargeFileUpload, {
                size: xcHelper.sizeTranslator(sizeLimit)
            });
            Alert.show({
                title: null,
                msg: msg,
                onConfirm: deferred.resolve,
                onCancel: function() {
                    deferred.reject(null, null, true);
                }
            });
        }
        return  deferred.promise();
    }

    // XXX TODO: generalize the file uploader of this one and the one
    // in workbookManager.ts
    private static _readFile(file: File): XDPromise<any> {
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


    private static _addEventListeners() {
        const $panel: JQuery = this._getPanel();
        // click cancel or close button
        $panel.on("click", ".close, .cancel", (event) => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $panel.on("click", ".confirm", () => {
            this._submitForm();
        });

        // hit enter on name input submits form
        this._getNameInput().on("keypress", (event) => {
            if (event.which === keyCode.Enter) {
                this._submitForm();
            }
        });

        // click browse button
        const $browseBtn: JQuery = this._getBrowseButton();
        this._getPanel().find("button.browse").click((event) => {
            $(event.currentTarget).blur();
            $browseBtn.click();
            return false;
        });

        $panel.find("input.path").mousedown(() => {
            $browseBtn.click();
            return false;
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        $browseBtn.change((event) => {
            const path: string = $(event.currentTarget).val();
            if (path === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            this._changeFilePath(path);
        });
    }

    private static _changeFilePath(path: string, fileInfo?: File) {
        path = path.replace(/C:\\fakepath\\/i, '');
        this._file = fileInfo || (<any>this._getBrowseButton()[0]).files[0];
        let fileName: string = path.substring(0, path.indexOf("."))
        .toLowerCase().replace(/ /g, "");
        fileName = <string>xcHelper.checkNamePattern(PatternCategory.Dataflow,
            PatternAction.Fix, fileName);

        const $panel: JQuery = this._getPanel();
        const $pathInput: JQuery = $panel.find("input.path");
        $pathInput.val(path);
        this._getNameInput().val(fileName);

        const $confirmBtn: JQuery = $panel.find(".confirm");
        const $tooltipWrap: JQuery = $panel.find(".buttonTooltipWrap");
        if (path.indexOf(".tar.gz") > 0) {
            $confirmBtn.removeClass("btn-disabled");
            xcTooltip.disable($tooltipWrap);
        } else {
            $confirmBtn.addClass("btn-disabled");
            xcTooltip.enable($tooltipWrap);
            StatusBox.show(ErrTStr.RetinaFormat, $pathInput, false, {
                side: "bottom"
            });
        }
    }

    private static _setupDragDrop(): void {
        new DragDropUploader({
            $container: this._getPanel(),
            text: "Drop a dataflow file to upload",
            onDrop: (file) => {
                this._changeFilePath(file.name, file);
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

    // /* Unit Test Only */
    // if (window.unitTestMode) {
    //     UploadDataflowCard.__testOnly__ = {};
    //     UploadDataflowCard.__testOnly__.changeFilePath = changeFilePath;
    //     UploadDataflowCard.__testOnly__.submitForm = submitForm;
    //     UploadDataflowCard.__testOnly__.setFile = function(f) {
    //         file = f;
    //     };
    //     UploadDataflowCard.__testOnly__.readRetinaFromFile = readRetinaFromFile;
    // }
    // /* End Of Unit Test Only */
}
