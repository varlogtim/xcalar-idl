window.Authentication = (function(jQuery, Authentication) {
    var authInfo;
    var kvStore;

    Authentication.setup = function() {
        var deferred = PromiseHelper.deferred();
        var key = KVStore.getKey("gAuthKey");
        kvStore = new KVStore(key, gKVScope.AUTH);

        kvStore.getAndParse()
        .then(function(oldAuthInfo) {
            if (oldAuthInfo == null) {
                authInfo = new XcAuth({
                    "idCount": 1
                });
                kvStore.put(JSON.stringify(authInfo), true);
            } else {
                delete oldAuthInfo.hashTag;
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

        kvStore.put(JSON.stringify(authInfo), true)
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });

        return ("#" + idCount);
    };

    /* Unit Test Only */
    if (window.unitTestMode) {
        Authentication.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (Authentication);
}(jQuery, {}));
