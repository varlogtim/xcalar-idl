window.XcSocket = (function(XcSocket) {
    var socket = null;
    var connected = false;
    var registered = false;
    var initDeferred;

    XcSocket.init = function() {
        var url = getExpServerUrl(hostname);
        var options = {
            "reconnectionAttempts": 10
        };
        initDeferred = PromiseHelper.deferred();
        socket = io.connect(url, options);
        addAuthenticationEvents();
    };

    XcSocket.addEventsAfterSetup = function() {
        addSocketEvent();
    };

    XcSocket.checkUserSessionExists = function(workbookId) {
        var deferred = PromiseHelper.deferred();
        // time out after 15s
        checkConnection(initDeferred, 15000);
        initDeferred.promise()
        .then(function() {
            var userOption = getUserOption(workbookId);
            socket.emit("checkUserSession", userOption, function(exist) {
                deferred.resolve(exist);
            });

            // time out after 20s
            var innerDeferred = PromiseHelper.deferred();
            checkConnection(innerDeferred, 20000);

            innerDeferred.promise()
            .fail(function(error) {
                console.error(error);
                deferred.resolve(false); // still reolve it
            });
        })
        .fail(deferred.reject);
        return deferred.promise();
    };

    XcSocket.registerUserSession = function(workbookId) {
        if (registered) {
            console.log("already registered");
            return false;
        }

        var userOption = getUserOption(workbookId);
        socket.emit("registerUserSession", userOption, function() {
            console.log("registerSuccess!");
            registered = true;
        });

        return true;
    };

    function getUserOption(workbookId) {
        return {
            user: XcSupport.getUser(),
            id: workbookId
        };
    }

    XcSocket.isConnected = function() {
        return connected;
    };

    XcSocket.isResigered = function() {
        return registered;
    };

    XcSocket.sendMessage = function(msg, arg, callback) {
        if (socket == null) {
            return;
        }

        socket.emit(msg, arg, callback);
    };

    function getExpServerUrl(host) {
        if (window.expHost) {
            return window.expHost;
        }
        return host;
    }

    function addAuthenticationEvents() {
        socket.on('error', function(error){
            console.log("error", error)
        });

        socket.on("connect", function() {
            connected = true;
            initDeferred.resolve();
        });

        socket.on("reconnect_failed", function() {
            console.error("connect failed");
            initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on("connect_timeout", function(timeout) {
            console.error("connect timeout", timeout);
            initDeferred.reject(AlertTStr.NoConnectToServer);
        });

        socket.on("useSessionExisted", function(userOption) {
            if (!registered) {
                return;
            }
            console.log(userOption, "exists");
            if (userOption.user === XcSupport.getUser() &&
                userOption.id === WorkbookManager.getActiveWKBK()) {
                WorkbookManager.gotoWorkbook(null, true);
            }
        });

        socket.on("system-allUsers", function(users) {
            if (!registered) {
                return;
            }
            XVM.checkMaxUsers(users);
            Admin.updateLoggedInUsers(users);
        });

        socket.on("adminAlert", function(alertOption) {
            if (!registered) {
                return;
            }
            Alert.show({
                "title": alertOption.title,
                "msg": alertOption.message,
                "isAlert": true
            });
        });
    }

    function addSocketEvent() {
        socket.on("refreshDataflow", function(dfName) {
            if (!registered) {
                return;
            }
            // console.log("dataflow", dfName, "refreshed");
            DataflowPanel.refresh(dfName);
        });

        socket.on("refreshUDFWithoutClear", function(overwriteUDF) {
            if (!registered) {
                return;
            }
            // In the event that there's new UDF added or overwrite old UDF
            UDF.refreshWithoutClearing(overwriteUDF);
        });

        socket.on("refreshDSExport", function() {
            if (!registered) {
                return;
            }
            DSExport.refresh();
        });

        socket.on("ds.update", function(arg) {
            DS.updateDSInfo(arg);
        });
    }

    function checkConnection(deferred, timeout) {
        setTimeout(function() {
            if (deferred.state() !== "resolved") {
                deferred.reject(AlertTStr.NoConnectToServer);
            }
        }, timeout);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        XcSocket.__testOnly__ = {};
        XcSocket.__testOnly__.getExpServerUrl = getExpServerUrl;
    }
    /* End Of Unit Test Only */

    return XcSocket;
}({}));