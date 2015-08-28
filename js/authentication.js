window.Authentication = (function($, Authentication) {
    var user;
    var authKey = "userAuthentication";

    Authentication.setup = function() {
        var username = WKBKManager.getUser();

        KVStore.getAndParse(authKey)
        .then(function(users) {
            users = users || {};

            if (!users[username]) {
                users[username] = {
                    "username": username,
                    "idCount" : 0
                };

                users[username].hashTag = generateHashTag();
                KVStore.put(authKey, JSON.stringify(users));
            }

            user = users[username];
        })
        .fail(function(error) {
            console.error("Authentication setup fails", error);
        });
    };

    Authentication.getUsers = function() {
        return (user);
    };

    Authentication.getHashId = function() {
        var idCount = user.idCount;

        user.idCount += 1;

        KVStore.getAndParse(authKey)
        .then(function(users) {
            users[user.username] = user;
            return (KVStore.put(authKey, JSON.stringify(users)));
        })
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });

        return ("#" + user.hashTag + idCount);
    };

    Authentication.clear = function() {
        // this clear all users' info
        user = null;
        return (KVStore.delete(authKey));
    };

    function generateHashTag() {
        // 3844 = 52 * 62, possibility
        var str = "0123456789" +
                    "abcedfghijklmnopqrstuvwxyz" +
                    "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        // index1 should not include number
        // (if hashId="12", bind to data-id, it may return number 12)
        var index1 = Math.floor(Math.random() * 52) + 10;
        var index2 = Math.floor(Math.random() * 62);

        return (str.charAt(index1) + str.charAt(index2));
    }

    return (Authentication);
}(jQuery, {}));
