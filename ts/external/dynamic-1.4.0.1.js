(function($) {
    console.log("dynamic patch 1.4.0.1 loaded");

    // hot patch XcalarKeyPut GUI-13239
    XcalarKeyPut = function (key, value, persist, scope) {
        if (tHandle == null) {
            return PromiseHelper.resolve(null);
        }
        if (key == null) {
            return PromiseHelper.reject("key is not defined");
        }
        const deferred = PromiseHelper.deferred();
        if (insertError(arguments.callee, deferred)) {
            return (deferred.promise());
        }
        if (persist == null) {
            persist = false;
        }
        if (scope == null) {
            scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
        }
        if (key === "gEphInfo-1") { // hot patch to persist df parameters
            persist = true;
        }
        xcalarKeyAddOrReplace(tHandle, scope, key, value, persist)
            .then(deferred.resolve)
            .fail(function (error) {
            const thriftError = thriftLog("XcalarKeyPut", error);
            Log.errorLog("Key Put", null, null, thriftError);
            deferred.reject(thriftError);
        });
        return (deferred.promise());
    };

}(jQuery));