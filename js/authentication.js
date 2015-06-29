window.Authentication = (function($, Authentication) {
    var user;
    var authectionKey = "userAuthentication";

    Authentication.setup = function() {
        var username = WKBKManager.getUser();

        KVStore.getAndParse(authectionKey)
        .then(function(users) {
            users = users || {};

            if (!users[username]) {
                // 3844 = 62 * 62, see Authentication.getHashId
                users[username] = {
                    "username": username,
                    "userId"  : Math.floor(Math.random() * 3844),
                    "pointer" : 0
                };

                users[username].hashId = generateHashId(users[username].userId);
                KVStore.put(authectionKey, JSON.stringify(users));
            }

            user = users[username];

            // console.warn("user", user);
        })
        .fail(function(error) {
            console.error("Authentication setup fails", error);
        });
    };

    Authentication.getUsers = function() {
        return (user);
    };

    Authentication.fetchHashTag = function() {
        var pointer = user.pointer;

        user.pointer += 1;

        KVStore.getAndParse(authectionKey)
        .then(function(users) {
            users[user.username] = user;
            return (KVStore.put(authectionKey, JSON.stringify(users)));
        })
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });

        return ("#" + user.hashId + pointer);
    };

    Authentication.clear = function() {
        userId = null;
        hashId = null;

        return (KVStore.delete(authectionKey));
    };

    function generateHashId(id) {
        var str =  "0123456789" +
                    "abcedfghijklmnopqrstuvwxyz" +
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        return (str.charAt(id / 62) + str.charAt(id % 62));
    }

    return (Authentication);
}(jQuery, {}));
