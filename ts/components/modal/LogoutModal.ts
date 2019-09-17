class LogoutModal {
    private static _instance: LogoutModal;
    private _modalHelper: ModalHelper;
    private _clusterStopCheckTime = 6 * 1000;
    private _progressBar: ProgressBar;

    public static get Instance(): LogoutModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        const $modal: JQuery = this._getModal();
        this._modalHelper = new ModalHelper($modal, {
            center: {verticalQuartile: true}
        });

        this._addEventListeners();
        this._progressBar = new ProgressBar({
            $container: $modal.find(".clusterStopProgress"),
            completionTime: 100,
            progressTexts: [
                'Beginning shut down',
                'Shutting down',
                'Finishing shut down'
            ],
            numVisibleProgressTexts: 3,
            startText: "Cluster shut down"
        });
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
                this._stopCluster();
            } else {
                XcUser.CurrentUser.logout();
                this._close();
            }
        });

        $modal.on("click", ".radioButton", function() {
            $modal.find(".radioButton").removeClass("active");
            $(this).addClass("active");
        });
    }

    private _stopCluster(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this._getModal().addClass("locked");

        xcHelper.sendRequest("POST", "/service/stopCloud")
        .then((res) => {
            this._getModal().addClass("clusterStop");
            this._progressBar.start();
            if (res && res.status === 0) {
                return this._checkClusterStopped();
            } else {
                return PromiseHelper.reject(res);
            }
        }).then(() => {
            XcUser.CurrentUser.logout();
            this._progressBar.end("Completed");
            this._close();
            deferred.resolve();
        })
        .fail((error) => {
            this._handleClusterStopFailure(error)
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(() => {
                this._close();
            });
        });

        return deferred.promise();
    }

    private _checkClusterStopped(): XDPromise<any> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const self = this;
        checkHelper();

        function checkHelper() {
            console.log("checking for cloud shutdown");
            xcHelper.sendRequest("GET", "/service/checkCloud")
            .then((ret) => {
                if (ret && (ret["isPending"] || ret["clusterUrl"])) {
                    console.log("cloud shutdown is pending");
                    setTimeout(() => {
                        checkHelper();
                    }, self._clusterStopCheckTime);
                } else if (ret && ret["status"] === 0) {
                    deferred.resolve();
                } else {
                    deferred.reject(ret);
                }
            })
            .fail((e) => {
                deferred.reject(e);
            });
        }

        return deferred.promise();
    }

    private _close() {
        this._modalHelper.clear();
        this._getModal().removeClass("clusterStop locked");
        this._progressBar.reset();
    }

    // a cluster stop failure might mean that it actually stopped and
    // wasn't able to return the message, or there was actually a failure and
    // it didn't stop
    private _handleClusterStopFailure(error): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        if (error && error.error) {
            error = error.error;
        }
        XVM.checkVersion(true)
        .then(() => {
            this._progressBar.reset();
            Alert.error("Stop Cluster Failed", error);
            deferred.reject(error);
        })
        .fail(() => {
            this._progressBar.end("Completed");
            // if checkVersion didn't work then cluster probably shut down
            XcUser.CurrentUser.logout();
            deferred.resolve();
        });

        return deferred.promise();
    }
}
