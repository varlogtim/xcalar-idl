class ModeAlertModal {
    private static _instance: ModeAlertModal;
    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _notShow: boolean;

    private constructor() {
        this._notShow = this._isNotShow();
    }

    /**
     * ModeAlertModal.Instance.show
     */
    public show(): void {
        if (this._notShow) {
            return;
        }
        MessageModal.Instance.show({
            title: this._getTitle(),
            msg: this._getMessage(),
            isInfo: true,
            isAlert: true,
            isCheckBox: true,
            onCancel: (notShow) => {
                this._setNotShow(notShow);
            }
        });
    }

    private _getTitle(): string {
        let modeTitle: string = XVM.isSQLMode() ? ModeTStr.SQL : ModeTStr.Advanced;
        return `You are switching to the ${modeTitle}`;
    }

    private _getMessage(): string {
        let backMode: string = XVM.isSQLMode() ? ModeTStr.Advanced : ModeTStr.SQL;
        return `To switch back to the ${backMode}, click on the <b>blue</b> toggle button again.`;
    }

    private _isNotShow(): boolean {
        if (typeof xcLocalStorage === "undefined") {
            return false;
        } else {
            return xcLocalStorage.getItem("xcalar-noModeSwitchAlert") === "true";
        }
    }

    private _setNotShow(notShow: boolean): void {
        this._notShow = notShow;
        if (typeof xcLocalStorage === "undefined") {
            return;
        }

        if (this._notShow) {
            xcLocalStorage.setItem("xcalar-noModeSwitchAlert", "true");
        } else {
            xcLocalStorage.removeItem("xcalar-noModeSwitchAlert");
        }
    }
}