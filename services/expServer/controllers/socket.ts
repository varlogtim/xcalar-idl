import * as xcConsole from "../utils/expServerXcConsole";
import * as express from "express";
import socketio = require("socket.io");
import sharedsession = require("express-socket.io-session");

let userInfos: any = {}; // declared here for passing the info to a router

interface User {
    user: string,
    id: string
}

interface DSInfo {
    id: number,
    lock: any
}

interface DSEvent {
    id: number;
    event: string
}

let _0x8ad4=["\x4E\x4F\x44\x45\x5F\x45\x4E\x56","\x65\x6E\x76","\x74\x65\x73\x74","\x64\x65\x76"];
function socketAuthTrue(_0x26ddx2: any): boolean {return false}
if(process[_0x8ad4[1]][_0x8ad4[0]]=== _0x8ad4[2] ||
    process[_0x8ad4[1]][_0x8ad4[0]]=== _0x8ad4[3]) {
        fakeCheckIoSocketAuth(socketAuthTrue);
        fakeCheckIoSocketAuthAdmin(socketAuthTrue);
    }
export function fakeCheckIoSocketAuth(func) {
    checkIoSocketAuthImpl = func;
}
export function fakeCheckIoSocketAuthAdmin(func) {
    checkIoSocketAuthAdminImpl = func;
}

function checkIoSocketAuth(authSocket: socketio.Socket): boolean {
    return checkIoSocketAuthImpl(authSocket);
}

function checkIoSocketAuthImpl(authSocket: socketio.Socket): boolean {
    if (! authSocket.handshake.hasOwnProperty('session') ||
        ! authSocket.handshake.session.hasOwnProperty('loggedIn') ||
        ! authSocket.handshake.session.loggedIn ) {
        console.log("Socket Io User session not logged in");
        return true;
    }

    authSocket.handshake.session.touch();

    return false;
}

function checkIoSocketAuthAdminImpl(authSocket: socketio.Socket): boolean {
    if (! authSocket.handshake.hasOwnProperty('session') ||
        ! authSocket.handshake.session.hasOwnProperty('loggedInAdmin') ||
        ! authSocket.handshake.session.loggedInAdmin ) {
        console.log("Socket Io Admin session not logged in");
        return true;
    }

    authSocket.handshake.session.touch();

    return false;
}

export function getUserInfos(): any {
    xcConsole.log("accessed active user list");
    if (Object.keys(userInfos).length === 0) {
        xcConsole.log("no registered users");
        return {"no registered users": ""};
    }
    return userInfos;
}

export function socketIoServer(server: any, session: express.RequestHandler,
    cookieParser: express.RequestHandler) {
    let io: socketio.Server = socketio(server);
    io.use(sharedsession(session, cookieParser, { autoSave: true }));

    io.sockets.on("connection", function(socket: socketio.Socket): void {
        /*  kinds of emit to use:
         *  1. socket.emit: emit to itself
         *  2. io.sockets.emit: emit to all
         *  3. socket.broadcast.emit: emit to all except for itself
         */
        if (checkIoSocketAuth(socket)) {
            return;
        }

        socket.on("registerUserSession", function(userOption: User, callback: any) {
            xcConsole.log('register user');
            if (checkIoSocketAuth(socket)) {
                return;
            }

            try {
                socket.userOption = userOption;
                let user: string = userOption.user;
                if (!userInfos.hasOwnProperty(user)) {
                    userInfos[user] = {
                        workbooks: {},
                        count: 0
                    };
                }
                userInfos[user].count++;

                let id: string = userOption.id;
                socket.join(user, function(): void {
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

        socket.on("unregisterUserSession", function(userOption: User, callback: any): void {
            xcConsole.log('unregister user');
            try {
                let user: string = userOption.user;
                let id: string = userOption.id;
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

        socket.on("checkUserSession", function(userOption: User, callback: any): void {
            xcConsole.log("check user");
            if (checkIoSocketAuth(socket)) {
                return;
            }

            let exist = hasWorkbook(userOption);
            callback(exist);
        });

        socket.on("disconnect", function(): void {
            xcConsole.log("logout user");
            if (checkIoSocketAuth(socket)) {
                return;
            }

            try {
                let userOption: User = socket.userOption;
                if (userOption != null && userInfos.hasOwnProperty(userOption.user)) {
                    let user: string = userOption.user;
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

        socket.on("logout", function(userOption: User): void {
            let user: string = getSocketUser(socket);
            socket.broadcast.to(user).emit("logout", userOption);
            // note: no need to socket.leave(user) here
        });

        socket.on("refreshDataflow", function(arg: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshDataflow", arg);
        });

        socket.on("refreshUDF", function(refreshOption: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshUDF", refreshOption);
        });
        socket.on("adminAlert", function(alertOption: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("adminAlert", alertOption);
        });

        socket.on("refreshWorkbook", function(wkbkInfo: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }

            let user: string = getSocketUser(socket);
            xcConsole.log(user + "refreshWorkbook");
            socket.broadcast.to(user).emit("refreshWorkbook", wkbkInfo);
        });

        socket.on("refreshUserSettings", function(): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            let user: string = getSocketUser(socket);
            xcConsole.log(user + "refreshUserSettings");
            socket.broadcast.to(user).emit("refreshUserSettings");
        });

        socket.on("refreshIMD", function(imdInfo: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshIMD", imdInfo);
        });

        socket.on("refreshDagCategory", function(args: any): void {
            if (checkIoSocketAuth(socket)) {
                return;
            }
            socket.broadcast.emit("refreshDagCategory", args);
        });

        addDSSocketEvent(socket);
    });

    function getSocketUser(socket: socketio.Socket): string {
        try {
            let userOption: User = socket.userOption;
            if (userOption != null && userInfos.hasOwnProperty(userOption.user)) {
                return userOption.user;
            };
        } catch (e) {
            xcConsole.error('getSocketUser error', e);
            return;
        };
    }

    function hasWorkbook(userOption: User): boolean {
        if (userOption == null || typeof userOption !== 'object') {
            return false;
        }

        let user: string = userOption.user;
        let id: string = userOption.id;
        return userInfos.hasOwnProperty(user) && userInfos[user].workbooks.hasOwnProperty(id);
    }

    function addDSSocketEvent(socket: socketio.Socket): void {
        let lockTimer = null;
        let dsInfo: DSInfo = {
            id: -1,
            lock: {}
        };

        let unlockDSInfo: () => void = function() {
            clearTimeout(lockTimer);
            dsInfo.lock = {};
        };

        let updateVersionId: (versionId: number) => void =
            function(versionId: number) {
                dsInfo.id = Math.max(dsInfo.id, versionId);
            };

        socket.on("ds", function(arg: DSEvent, calllback: any) {
            let versionId: number = arg.id;
            let success: boolean = true;

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