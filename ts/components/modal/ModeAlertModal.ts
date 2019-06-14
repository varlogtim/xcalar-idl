class ModeAlertModal {
    private static _instance: ModeAlertModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _modalHelper: ModalHelper;
    private _notShow: boolean;

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            noResize: true
        });
        this._notShow = this._isNotShow();
        this._addEventListeners();
    }

    /**
     * ModeAlertModal.Instance.show
     */
    public show(): void {
        if (this._notShow) {
            return;
        }
        this._modalHelper.setup();
        this._fillModeText();
    }

    private _getModal(): JQuery {
        return $("#modeAlertModal");
    }

    private _close(): void {
        this._notShow = this._getModal().find(".checkbox").hasClass("checked");
        if (this._notShow) {
            this._setNotShow();
        }
        this._modalHelper.clear();
    }

    private _fillModeText(): void {
        let text: string = XVM.isSQLMode() ? ModeTStr.SQL : ModeTStr.Advanced;
        this._getModal().find(".mode").text(text);
    }

    private _isNotShow(): boolean {
        if (typeof xcLocalStorage === "undefined") {
            return false;
        } else {
            return xcLocalStorage.getItem("xcalar-noModeSwitchAlert") === "true";
        }
    }

    private _setNotShow(): void {
        if (typeof xcLocalStorage === "undefined") {
            return;
        }

        if (this._notShow) {
            xcLocalStorage.setItem("xcalar-noModeSwitchAlert", "true");
        } else {
            xcLocalStorage.removeItem("xcalar-noModeSwitchAlert");
        }
    }

    private _addEventListeners(): void {
        let $modal = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".checkboxSection", (e) => {
            e.stopPropagation();
            $(e.currentTarget).find(".checkbox").toggleClass("checked");
        });
    }
}