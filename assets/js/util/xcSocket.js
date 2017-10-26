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
        initDeferred = jQuery.Deferred();
        socket = io.connect(url, options);
        addSocketEvent();
    };

    XcSocket.checkUserExists = function() {
        var deferred = jQuery.Deferred();
        // time out after 15s
        checkConnection(initDeferred, 15000);
        initDeferred.promise()
        .then(function() {
            socket.emit("checkUser", XcSupport.getUser(), function(exist) {
                deferred.resolve(exist);
            });
            // time out after 20s
            checkConnection(deferred, 20000);
        })
        .fail(deferred.reject);
        return deferred.promise();
    };

    XcSocket.registerUser = function() {
        if (registered) {
            console.log("already registered");
            return;
        }

        socket.emit("registerUser", XcSupport.getUser(), function() {
            console.log("registerSuccess!");
            registered = true;
        });
    };

    XcSocket.isConnected = function() {
        return connected;
    };

    XcSocket.isResigered = function() {
        return registered;
    };

    XcSocket.sendMessage = function(msg, arg) {
        if (socket == null) {
            return;
        }

        socket.emit(msg, arg, function() {
            console.log("Send " + msg + " to all clients");
        });
    };

    function getExpServerUrl(host) {
        if (window.expHost) {
            return window.expHost;
        }
        return host;
    }

    function addSocketEvent() {
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

        socket.on("userExisted", function(user) {
            if (!registered) {
                return;
            }
            console.log(user, "exists");
            if (user === XcSupport.getUser()) {
                xcManager.forceLogout();
            }
        });

        socket.on("system-allUsers", function(users) {
            if (!registered) {
                return;
            }
            XVM.checkMaxUsers(users);
            Admin.updateLoggedInUsers(users);
        });

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