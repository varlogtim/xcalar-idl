window.Authentication = (function(jQuery, Authentication) {
    var authInfo;
    var authKey;

    Authentication.setup = function() {
        var deferred = jQuery.Deferred();
        authKey = Support.getUser() + "-authentication";

        KVStore.getAndParse(authKey, gKVScope.AUTH)
        .then(function(oldAuthInfo) {
            if (oldAuthInfo == null) {
                authInfo = new AuthInfo({
                    "idCount": 0,
                    "hashTag": generateHashTag()
                });
                KVStore.put(authKey, JSON.stringify(authInfo), true, gKVScope.AUTH);
            } else {
                authInfo = new AuthInfo(oldAuthInfo);
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
        var idCount = authInfo.idCount;

        authInfo.idCount += 1;

        KVStore.put(authKey, JSON.stringify(authInfo), true, gKVScope.AUTH)
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });

        return ("#" + authInfo.hashTag + idCount);
    };

    Authentication.clear = function() {
        // this clear all users' info
        authInfo = null;
        return KVStore.delete(authKey, gKVScope.AUTH);
    };

    function generateHashTag() {
        // 3844 = 52 * 62, possibility
        var str = "0123456789abcedfghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        // index1 should not include number
        // (if hashId="12", bind to data-id, it may return number 12)
        var index1 = Math.floor(Math.random() * 52) + 10;
        var index2 = Math.floor(Math.random() * 62);

        return (str.charAt(index1) + str.charAt(index2));
    }

    return (Authentication);
}(jQuery, {}));
