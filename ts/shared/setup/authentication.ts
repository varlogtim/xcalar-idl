class Authentication {
    private static authInfo: XcAuth;
    private static kvStore: KVStore;

    /**
     * Authentication.setup
     */
    public static setup(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const key: string = KVStore.getKey("gAuthKey");
        Authentication.kvStore = new KVStore(key, gKVScope.WKBK);

        Authentication.kvStore.getAndParse()
        .then(function(oldAuthInfo) {
            if (oldAuthInfo == null) {
                Authentication.authInfo = new XcAuth({
                    "idCount": 1
                });
                Authentication.kvStore.put(JSON.stringify(Authentication.authInfo), true);
            } else {
                delete oldAuthInfo.hashTag;
                Authentication.authInfo = new XcAuth(oldAuthInfo);
            }

            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Authentication setup fails", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * Authentication.getInfo
     */
    public static getInfo(): XcAuth {
        return Authentication.authInfo;
    }

    /**
     * Authentication.getHashId
     */
    public static getHashId(): String {
        let idCount: number = Authentication.authInfo.getIdCount();
        Authentication.authInfo.incIdCount();
        while (gTables.hasOwnProperty(idCount)) {
            console.warn('id', idCount, 'alreay exits');
            idCount = Authentication.authInfo.getIdCount();
            Authentication.authInfo.incIdCount();
        }

        Authentication.kvStore.put(JSON.stringify(Authentication.authInfo), true)
        .fail(function(error) {
            console.error("Save Authentication fails", error);
        });
        return ("#" + idCount);
    }
}