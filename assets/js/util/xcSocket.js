window.XcSocket = (function(XcSocket, $) {
    var socket = null;
    var connected = false;
    var enable = true;  // use it or not

    XcSocket.init = function() {
        if (!enable) {
            return;
        }

        var url = getExpServerUrl(hostname);
        var options = {
            "reconnectionAttempts": 50
        };
        socket = io.connect(url, options);
        addSocketEvent();
    };

    XcSocket.isConnected = function() {
        return connected;
    };

    XcSocket.sendMessage = function(msg, arg) {
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
            socket.emit("registerUser", Support.getUser(), function() {
                console.log("registerSuccess!");
            });
        });

        socket.on("userExisted", function(user) {
            console.log(user, "exists");
            if (user === Support.getUser()) {
                xcManager.forceLogout();
            }
        });

        socket.on("system-allUsers", function(users) {
            XVM.checkMaxUsers(users);
            Admin.updateLoggedInUsers(users);
        });

        socket.on("refreshDataflow", function(dfName) {
            // console.log("dataflow", dfName, "refreshed");
            DataflowPanel.refresh(dfName);
        });

        socket.on("refreshUDFWithoutClear", function(overwriteUDF) {
            // In the event that there's new UDF added or overwrite old UDF
            UDF.refreshWithoutClearing(overwriteUDF);
        });
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        XcSocket.__testOnly__ = {};
        XcSocket.__testOnly__.getExpServerUrl = getExpServerUrl;
    }
    /* End Of Unit Test Only */

    return XcSocket;
}({}, jQuery));