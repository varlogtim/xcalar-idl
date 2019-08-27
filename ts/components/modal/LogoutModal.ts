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
                .then((res) => {
                    if (res && res.status === 0) {
                        XcUser.CurrentUser.logout();
                    } else {
                        let error = res;
                        if (error && error.error) {
                            error = error.error;
                        }
                        this._handleClusterStopFailure(error);
                    }
                })
                .fail((e) => {
                    this._handleClusterStopFailure(e);
                });
            } else {
                XcUser.CurrentUser.logout();
            }
            this._close();
        });

        $modal.on("click", ".radioButton", function() {
            $modal.find(".radioButton").removeClass("active");
            $(this).addClass("active");
        });
    }

    private _close() {
        this._modalHelper.clear();
    }

    // a cluster stop failure might mean that it actually stopped and
    // wasn't able to return the message, or there was actually a failure and
    // it didn't stop
    private _handleClusterStopFailure(error) {
        XVM.checkVersion(true)
        .then(() => {
            Alert.error("Stop Cluster Failed", error);
        })
        .fail(() => {
            // if checkVersion didn't work then cluster probably shut down
            XcUser.CurrentUser.logout();
        });
    }
}
