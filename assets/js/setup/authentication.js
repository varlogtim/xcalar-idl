window.Authentication = (function(jQuery, Authentication) {
    var authInfo;
    var authKey;

    Authentication.setup = function() {
        var deferred = jQuery.Deferred();
        authKey = Support.getUser() + "-authentication";

        KVStore.getAndParse(authKey, gKVScope.AUTH)
        .then(function(oldAuthInfo) {
            if (oldAuthInfo == null) {
                authInfo = new XcAuth({
                    "idCount": 0,
                    "hashTag": generateHashTag()
                });
                KVStore.put(authKey, JSON.stringify(authInfo), true, gKVScope.AUTH);
            } else {
                authInfo = new XcAuth(oldAuthInfo);
            }

            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Authentication setup fails", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    Authentication.getInfo = function() {
        return authInfo;
    };

    Authentication.getHashId = function() {
        var idCount = authInfo.getIdCount();
        authInfo.incIdCount();

        KVStore.put(authKey, JSON.stringify(authInfo), true, gKVScope.AUTH)
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });

        return ("#" + authInfo.getHashTag() + idCount);
    };

    Authentication.clear = function() {
        // this clear all users' info
        authInfo = null;
        return KVStore.delete(authKey, gKVScope.AUTH);
    };

    function generateHashTag() {
        // 2891 = 49 * 59, possibility
        // Caps and small O, caps I removed due to GUI-4256
        var str = "0123456789abcedfghijklmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
        // index1 should not include number
        // (if hashId="12", bind to data-id, it may return number 12)
        var numDigits = 2; // This number needs to increase as we have more
        // sessions to reduce the chance of collision
        var probability = [25, 190]; // Birthday Paradox
        var numUsers = 0; // XXX Ask Cheng
        for (var i = 0; i<probability.length; i++) {
            if (numUsers > probability[i]) {
                numDigits++;
            }
        }

        var hashTag = str.charAt(Math.floor(Math.random() * (str.length - 10)) +
                      10);
        for (var i = 0; i<numDigits-1; i++) {
            hashTag += str.charAt(Math.floor(Math.random() * str.length));
        }

        return (hashTag);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        Authentication.__testOnly__ = {};
        Authentication.__testOnly__.generateHashTag = generateHashTag;
    }
    /* End Of Unit Test Only */

    return (Authentication);
}(jQuery, {}));
