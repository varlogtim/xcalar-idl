var socketio = require("socket.io");

module.exports = function(server) {
    var io = socketio(server);
    var users = {};

    io.sockets.on("connection", function(socket) {
        /*  kinds of emit to use:
         *  1. socket.emit: emit to itself
         *  2. io.sockets.emit: emit to all
         *  3. socket.broadcast.emit: emit to all others
         */
        socket.on("registerUser", function(userName, callback) {
            socket.userName = userName;
            if (users.hasOwnProperty(userName)) {
                socket.broadcast.emit("userExisted", userName);
                users[userName]++;
            } else {
                users[userName] = 1;
            }
            callback();
            io.sockets.emit("system-allUsers", users);
        });

        socket.on("checkUser", function(userName, callback) {
            var exist = users.hasOwnProperty(userName);
            callback(exist);
        });

        socket.on("disconnect", function() {
            var userName = socket.userName;
            if (userName != null && users.hasOwnProperty(userName)) {
                users[userName]--;
                if (users[userName] <= 0) {
                    delete users[userName];
                }
                io.sockets.emit("system-allUsers", users);
            }
        });

        socket.on("refreshDataflow", function(dfName) {
            socket.broadcast.emit("refreshDataflow", dfName);
        });

        socket.on("refreshUDFWithoutClear", function(overwriteUDF) {
            socket.broadcast.emit("refreshUDFWithoutClear", overwriteUDF);
        });
        socket.on("refreshDSExport", function() {
            socket.broadcast.emit("refreshDSExport");
        });
        socket.on("adminAlert", function(alertOption) {
            socket.broadcast.emit("adminAlert", alertOption);
        });

        addDSSocketEvent(socket);
    });

    function addDSSocketEvent(socket) {
        var lockTimer = null;
        var dsInfo = {
            id: -1,
            lock: {}
        };

        var unlockDSInfo = function() {
            clearTimeout(lockTimer);
            dsInfo.lock = {};
        };

        var updateVersionId = function(versionId) {
            dsInfo.id = Math.max(dsInfo.id, versionId);
        };

        socket.on("ds", function(arg, calllback) {
            var versionId = arg.id;
            var success = true;

            switch ( arg.event) {
                case "updateVersionId":
                    updateVersionId(versionId);
                    break;
                case "changeStart":
                    if (versionId <= dsInfo.id || dsInfo.lock.id != null) {
                        success = false;
                    } else {
                        dsInfo.lock = {
                            id: versionId,
                            arg: arg
                        };
                    }

                    lockTimer = setTimeout(function() {
                        unlockDSInfo();
                    }, 100000); // 100s

                    if (calllback != null) {
                        calllback(success);
                    }
                    break;
                case "changeEnd":
                    if (versionId === dsInfo.lock.id) {
                        updateVersionId(versionId);
                        socket.broadcast.emit("ds.update", dsInfo.lock.arg);
                        unlockDSInfo();
                    } else {
                        success = false;
                    }

                    if (calllback != null) {
                        calllback(success);
                    }
                    break;
                case "changeError":
                    if (versionId === dsInfo.lock.id) {
                        unlockDSInfo();
                    }
                    break;
                default:
                    break;
            }
        });
    }
};