window.XcSocket = (function(XcSocket, $) {
    var socket = null;
    var connected = false;
    var enable = true;  // use it or not

    XcSocket.init = function() {
        if (!enable) {
            return;
        }

        var url = getExpServerUrl();
        socket = io.connect(url);
        addSocketEvent();
    };

    XcSocket.isConnected = function() {
        return connected;
    };

    function getExpServerUrl() {
        var host = hostname;
        var port = "12124"; // XXX this is hard coded now
        if (/.*:\/\/.*:.*/.test(host)) {
            var index = host.lastIndexOf(":");
            host = host.substring(0, index) + ":" + port;
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
                Support.forceLogout();
            }
        });
    }

    return XcSocket;
}({}, jQuery));