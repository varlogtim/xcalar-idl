// XXX TODO: rename or clean up this file
class Authentication {
    private static authInfo: XcAuth;
    private static kvStore: KVStore;
    // private static uid: XcUID;

    /**
     * Authentication.setup
     */
    public static setup(): XDPromise<void> {
        // Note that . and - is not good for HTML rendering reason
        // so here the choice is _
        // this.uid = new XcUID("t");
        // XXX TODO: use the comment out one after sql test can pass
        // this.uid.setGenerator((prefix: string, count: number): string => {
        //     return prefix + "_" + new Date().getTime() + "_" + count;
        // });
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

    // /**
    //  * Authentication.getCount
    //  */
    // public static getCount(): number {
    //     return this.uid.count;
    // }

    /**
     * Authentication.getHashId
     */
    public static getHashId(excludeHash?: boolean): string {
        let idCount: number = Authentication.authInfo.getIdCount();
        Authentication.authInfo.incIdCount();
        let orphIds = {};
        gOrphanTables.forEach(function(tableName: string) {
            let orphId = xcHelper.getTableId(tableName);
            if (orphId) {
                orphIds[orphId] = true;
            }
        });
        while (gTables.hasOwnProperty(idCount) ||
               orphIds.hasOwnProperty(idCount)) {
            console.warn('id', idCount, 'alreay exits');
            idCount = Authentication.authInfo.getIdCount();
            Authentication.authInfo.incIdCount();
        }

        Authentication.kvStore.put(JSON.stringify(Authentication.authInfo), true)
        .fail((error) => {
            console.error("Save Authentication fails", error);
        });
        // const idCount: string = this.uid.gen();
        if (excludeHash) {
            return (idCount + '');
        } else {
            return ("#" + idCount);
        }
    }
}