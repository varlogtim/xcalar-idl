class ExtensionUploadCard {
    private _id: string;
    private _file;
    private _extName;
    private _lockTimer;

    public constructor(id) {
        this._id = id;
        this._addEventListeners();
    }

    public show(): void {
        this._getCard().removeClass("xc-hidden");
        $("#monitorPanel").find(".mainContent").scrollTop(0);
    }

    private _getCard(): JQuery {
        return $(`#${this._id}`);
    }

    private _getExtPath(): JQuery {
        return this._getCard().find(".path");
    }

    private _getBrowserBtn(): JQuery {
        return this._getCard().find(".browse");
    }

    private _addEventListeners(): void {
        let $card = this._getCard();
        // click cancel or close button
        $card.on("click", ".close, .cancel", () => {
            event.stopPropagation();
            this._close();
        });

        // click upload button
        $card.on("click", ".confirm", () => {
            this._submitForm();
        });

        // click browse button
        $card.on("click", ".fakeBrowse", (event) => {
            $(event.currentTarget).blur();
            this._getBrowserBtn().click();
            return false;
        });

        // display the chosen file's path
        // NOTE: the .change event fires for chrome for both cancel and select
        // but cancel doesn't necessarily fire the .change event on other
        // browsers
        let $browserBtn = this._getBrowserBtn();
        $browserBtn.change((event) => {
            let $el = $(event.currentTarget);
            if ($el.val() === "") {
                // This is the cancel button getting clicked. Don't do anything
                event.preventDefault();
                return;
            }
            let path: string = $el.val().replace(/C:\\fakepath\\/i, '');
            this._file = (<any>$browserBtn[0]).files[0];
            this._extName = path.substring(0, path.indexOf(".")).replace(/ /g, "");
            
            let $extPath = this._getExtPath();
            $extPath.val(path);
            if (path.indexOf(".tar.gz") > 0) {
                $card.find(".confirm").removeClass("btn-disabled");
                xcTooltip.disable($card.find(".buttonTooltipWrap"));
            } else {
                $card.find(".confirm").addClass("btn-disabled");
                xcTooltip.enable($card.find(".buttonTooltipWrap"));
                StatusBox.show(ErrTStr.RetinaFormat, $extPath, false, {
                    "side": "bottom"
                });
            }
        });
    }

    private _submitForm(): void {
        this._lockCard();

        this._readAndUploadFile()
        .always(() => {
            this._unlockCard();
        });
    }

    private _close(): void {
        this._getCard().addClass("xc-hidden");
        this._clear();
        this._unlockCard();
    }

    private _clear(): void {
        this._file = "";
        this._extName = null;
        let $card = this._getCard();
        this._getExtPath().val("");
        $card.find(".confirm").addClass("btn-disabled");
        this._getBrowserBtn().val("");
        xcTooltip.enable($card.find(".buttonTooltipWrap"));
    }

    private _lockCard(): void {
        let $card = this._getCard();
        this._lockTimer = setTimeout(() => {
            $card.find(".cardLocked").show();
        }, 500);
        xcUIHelper.disableSubmit($card.find(".fakeBrowse, .confirm"));
    }

    private _unlockCard() {
        clearTimeout(this._lockTimer);
        let $card = this._getCard();
        $card.find(".cardLocked").hide();
        xcUIHelper.enableSubmit($card.find(".fakeBrowse, .confirm"));
    }

    private _readAndUploadFile(): XDPromise<void> {
        let reader = new FileReader();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let self = this;

        reader.readAsBinaryString(this._file);
        reader.onload = function(event: any) {
            let entireString: string;
            if (event) {
                entireString = event.target.result;
            } else {
                deferred.reject("Browser doesn't suppload upload!");
                return;
            }
            let base64Str = btoa(entireString);
            self._uploadExt(base64Str)
            .then(deferred.resolve)
            .fail(deferred.reject);
        };

        return deferred.promise();
    }

    private _uploadExt(str: string): XDPromise<void> {
        let url = xcHelper.getAppUrl();
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        
        ExtensionPanel.Instance.request({
            "type": "POST",
            "dataType": "JSON",
            "url": url + "/extension/upload",
            "data": {"targz": str, "name": this._extName},
        })
        .then(() => {
            this._clear();
            xcUIHelper.showSuccess(SuccessTStr.Upload);
            $("#refreshExt").click();
            deferred.resolve();
        })
        .fail((error) => {
            StatusBox.show(ErrTStr.ExtUploadFailed, this._getCard().find(".confirm"),
            false, {side: "left", detail: error});
            deferred.reject(error);
        });

        return deferred.promise();
    }
}