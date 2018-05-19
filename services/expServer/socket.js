var socketio = require("socket.io");

module.exports = function(server) {
    var io = socketio(server);
    var userInfos = {};

    io.sockets.on("connection", function(socket) {
        /*  kinds of emit to use:
         *  1. socket.emit: emit to itself
         *  2. io.sockets.emit: emit to all
         *  3. socket.broadcast.emit: emit to all others
         */
        socket.on("registerUserSession", function(userOption, callback) {
            try {
                socket.userOption = userOption;
                var user = userOption.user;
                if (!userInfos.hasOwnProperty(user)) {
                    userInfos[user] = {
                        workbooks: {},
                        count: 0
                    };
                }
                userInfos[user].count++;

                var id = userOption.id;
                if (userInfos[user].workbooks.hasOwnProperty(id)) {
                    socket.broadcast.emit("useSessionExisted", userOption);
                    userInfos[user].workbooks[id]++;
                } else {
                    userInfos[user].workbooks[id] = 1;
                }
                console.log("userInfos", JSON.stringify(userInfos, null, 2));
            } catch(e) {
                console.error(e);
            }
            callback();
            io.sockets.emit("system-allUsers", userInfos);
        });

        socket.on("unregisterUserSession", function(userOption, callback) {
            try {
                var user = userOption.user;
                var id = userOption.id;
                console.log(userInfos, userOption);
                if (userInfos[user].workbooks.hasOwnProperty(id)) {
                    userInfos[user].workbooks[id]--;
                }
                if (!userInfos[user].workbooks[id]) {
                    delete userInfos[user].workbooks[id];
                }
                console.log("userInfos", JSON.stringify(userInfos, null, 2));
            } catch(e) {
                console.error(e);
            }
            callback();
        });

        socket.on("checkUserSession", function(userOption, callback) {
            console.log("check", userOption, "in", JSON.stringify(userInfos, null, 2));
            var exist = hasWorkbook(userOption);
            callback(exist);
        });

        socket.on("disconnect", function() {
            try {
                var userOption = socket.userOption;
                if (userOption != null && userInfos.hasOwnProperty(userOption.user)) {
                    userInfos[userOption.user].count--;
                    if (userInfos[userOption.user].count <= 0) {
                        delete userInfos[userOption.user];
                    } else {
                        userInfos[userOption.user].workbooks[userOption.id]--;
                        if (userInfos[userOption.user].workbooks[userOption.id] <= 0) {
                            delete userInfos[userOption.user].workbooks[userOption.id];
                        }
                    }
                    console.log("logout", userOption, JSON.stringify(userInfos, null, 2))
                    io.sockets.emit("system-allUsers", userInfos);
                }
            } catch (e) {
                console.error(e);
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

        socket.on("refreshWorkbook", function(wkbkName) {
            socket.broadcast.emit("refreshWorkbook", wkbkName);
        });

        socket.on("refreshUserSettings", function() {
            socket.broadcast.emit("refreshUserSettings");
        });

        socket.on("refreshIMD", function(imdInfo) {
            socket.broadcast.emit("refreshIMD", imdInfo);
        });

        addDSSocketEvent(socket);
    });

    function hasWorkbook(userOption) {
        if (userOption == null || typeof userOption !== 'object') {
            return false;
        }

        var user = userOption.user;
        var id = userOption.id;
        return userInfos.hasOwnProperty(user) && userInfos[user].workbooks.hasOwnProperty(id);
    }

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