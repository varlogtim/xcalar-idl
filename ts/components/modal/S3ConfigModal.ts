class S3ConfigModal {
    private static _instance: S3ConfigModal;
    private _modalHelper: ModalHelper;
    private _callback: Function;

    public static get Instance(): S3ConfigModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            sizeToDefault: true,
        });

       this._addEventListeners();
    }

    /**
     * S3ConfigModal.Instance.show
     */
    public show(callback: Function): void {
        let $modal = this._getModal();
        this._modalHelper.setup();
        this._callback = callback;

        $modal.addClass("loading");
        DSTargetManager.getTargetTypeList(true)
        .then(() => {
            this._render();
        })
        .fail((error) => {
            console.error(error);
            $modal.addClass("error");
        })
        .always(() => {
            $modal.removeClass("loading")
        });
    }

    private _getModal(): JQuery {
        return $("#s3ConfigModal");
    }

    private _getModalMain(): JQuery {
        return this._getModal().find(".modalMain");
    }

    private _getNameEl(): JQuery {
        return this._getModalMain().find(".formSection.name input");
    }

    private _getParamsEl(): JQuery {
        return this._getModalMain().find(".formContent");
    }

    private _render(): void {
        let html = DSTargetManager.renderS3Config();
        this._getParamsEl().html(html);
    }

    private _close(): void {
        this._modalHelper.clear();
        this._callback = null;
        this._getNameEl().val("");
        this._getParamsEl().empty();
        this._getModal().removeClass("loading")
                        .removeClass("error");
    }

    private _submitForm(): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        let $name = this._getNameEl();
        let $params = this._getParamsEl();
        let $submitBtn = this._getModal().find(".modalBottom .confirm");
        DSTargetManager.createS3Target($name, $params, $submitBtn)
        .then((targetName) => {
            if (typeof this._callback === "function") {
                this._callback(targetName);
            }
            this._close();
            deferred.resolve();
        })
        .fail((error) => {
            if (error != null) {
                StatusBox.show(FailTStr.Target, $submitBtn, false, {
                    detail: error.log
                });
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.find('.confirm').click(() => {
            this._submitForm();
        });
    }
}