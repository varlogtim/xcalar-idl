window.xcTracker = (function(xcTracker) {
    var cache = "";

    xcTracker.commit = function() {
        var deferred = PromiseHelper.deferred();

        if (hasCachedData()) {
            commitCachedData()
            .then(clearCachedData)
            .then(deferred.resolve)
            .fail(function(error) {
                console.error("xcTracker commit fails", error);
                deferred.reject(error);
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    };

    // category is a string represnst which kind of data it is
    // example (menu switch, join key selection...)
    // data is a json foramt object
    xcTracker.track = function(category, data) {
        var id = getTrackId();
        var cachedData = {
            "id": id,
            "category": category || "",
            "data": data
        };

        cache += ", " + JSON.stringify(cachedData);

        return id;
    };

    function getTrackId() {
        return new Date().getTime();
    }


    function hasCachedData() {
        return (cache.length !== 0);
    }

    function clearCachedData() {
        cache = "";
    }

    function commitCachedData() {
        var deferred = PromiseHelper.deferred();
        // XXX TODO: add ajax call to expServer

        console.log(cache, "is commited");
        deferred.resolve();

        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        xcTracker.__testOnly__ = {};
        xcTracker.__testOnly__.getCache = function() {
            return cache;
        };
    }
    /* End Of Unit Test Only */

    return xcTracker;
}({}));