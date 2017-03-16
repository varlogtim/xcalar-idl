var socketio = require("socket.io");
module.exports = function(server) {
    var io = socketio(server);
    var users = {};

    io.sockets.on("connection", function(socket) {
        console.log("connected")
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
        });

        socket.on("disconnect", function() {
            var userName = socket.userName;
            if (userName != null && users.hasOwnProperty(userName)) {
                users[userName]--;
                if (users[userName] <= 0) {
                    delete users[userName];
                }
            }
        });
    });
}