class LogoutModal {
    private static _instance: LogoutModal;
    private _modalHelper: ModalHelper;

    public static get Instance(): LogoutModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            center: {verticalQuartile: true}
        });

        this._addEventListeners();
    }

    public show(): void {
        this._modalHelper.setup();
    }

    private _getModal(): JQuery {
        return $("#logoutModal");
    }

    private _addEventListeners() {
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close, .cancel", () => {
            this._close();
        });

        $modal.on("click", ".confirm", () => {
            if ($modal.find(".shutDown").hasClass("active")) {
                xcHelper.sendRequest("POST", "/service/stopCloud")
                .then(() => {
                    XcUser.CurrentUser.logout();
                })
                .fail((e) => {
                    Alert.error("Stop Cluster Failed", e);
                });
            } else {
                XcUser.CurrentUser.logout();
            }
        });

        $modal.on("click", ".radioButton", function() {
            $modal.find(".radioButton").removeClass("active");
            $(this).addClass("active");
        });
    }

    private _close() {
        this._modalHelper.clear();
    }
}
