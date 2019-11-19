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
            confirmButtonText: "Take a tour",
            cancelButtonText: AlertTStr.Close,
            isCheckBox: true,
            onConfirm: () => {
                TooltipWalkthroughs.startWalkthrough(this._getModeTitle())
            },
            onCancel: (notShow) => {
                this._setNotShow(notShow);
            }
        });
    }

    private _getModeTitle(): string {
        return XVM.isSQLMode() ? ModeTStr.SQL : ModeTStr.Advanced;
    }

    private _getTitle(): string {
        return `You are switching to the ${this._getModeTitle()} workspace`;
    }

    private _getMessage(): string {
        return XVM.isSQLMode()
        ? 'Use the SQL Mode workspace if you prefer to use SQL to build your execution plan.'
        : 'Use the Developer Mode workspace if you prefer to use visual tools to build your application.';
    }

    private _isNotShow(): boolean {
        if (typeof xcLocalStorage === "undefined") {
            return false;
        } else if (!xcLocalStorage.getItem("xcalar-noModeSwitchAlert")) {
            return window["unitTestMode"];
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