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
            isAlert: true,
            isCheckBox: true,
            onCancel: (notShow) => {
                this._setNotShow(notShow);
            }
        });
    }

    private _getTitle(): string {
        let modeTitle: string = XVM.isSQLMode() ? ModeTStr.SQL : ModeTStr.Advanced;
        return `Alert! You are switching to ${modeTitle}`;
    }

    private _getMessage(): string {
        return 'To switch between SQL and Dataflow mode, use the <b>blue</b> toggle button at the top right hand corner of the screen.';
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