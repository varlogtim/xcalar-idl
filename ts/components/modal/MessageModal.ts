class MessageModal {
    private static _instance: MessageModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            "noResize": true,
            "sizeToDefault": true
        });
        this._addEventListeners();
    }

    /**
     * MessageModal.Instance.show
     */
    public show(options: Alert.AlertOptions): void {
        this._setTitle(options.title);
        this._setMessage(options.msg);
        this._setCheckBox(options.isCheckBox);
        this._setButtons(options);
        this._modalHelper.setup();
    }

    private _getModal(): JQuery {
        return $("#messageModal");
    }

    private _getCheckboxSection(): JQuery {
        return this._getModal().find(".checkboxSection");
    }

    private _close(callback: Function): void {
        let $checkbox = this._getCheckboxSection().find(".checkbox");
        let hasChecked: boolean = $checkbox.hasClass("checked")

        this._modalHelper.clear();
        this._setTitle("");
        $checkbox.removeClass("checked");
        this._getModal().off(".messageModal");

        if (callback instanceof Function) {
            callback(hasChecked);
        }
    }

    private _setTitle(title: string): void {
        this._getModal().find(".title .text").text(title);
    }

    private _setMessage(message: string): void {
        this._getModal().find(".message").html(message);
    }

    private _setCheckBox(isCheckBox: boolean): void {
        let $modal = this._getModal();
        if (isCheckBox) {
            $modal.removeClass("noCheckbox");
        } else {
            $modal.addClass("noCheckbox");
        }
    }

    private _setButtons(options: Alert.AlertOptions): void {
        let $modal = this._getModal();
        let $confirmBtn = $modal.find(".confirm");
        
        if (options.isAlert) {
            $modal.find(".cancel").text(AlertTStr.Close);
            $confirmBtn.hide();
        } else {
            $modal.find(".cancel").text(AlertTStr.Cancel);
            $confirmBtn.show();
        }

        $modal.on("click.messageModal", ".close, .cancel", (e) => {
            e.stopPropagation();
            this._close(options.onCancel);
        });

        // set confirm button
        $modal.on("click.messageModal", ".confirm", (e) => {
            e.stopPropagation();
            this._close(options.onConfirm);
        });
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".checkboxSection", (e) => {
            e.stopPropagation();
            $(e.currentTarget).find(".checkbox").toggleClass("checked");
        });
    }
}