window.xcTracker = (function(xcTracker, $) {
    var cache = "";

    xcTracker.commit = function() {
        if (hasCachedData()) {
            commitCachedData()
            .then(clearCachedData)
            .fail(function(error) {
                console.error("xcTracker commit fails", error);
            });
        }
    };

    // category is a string represnst which kind of data it is
    // example (menu switch, join key selection...)
    // data is a json foramt object
    xcTracker.track = function(category, data) {
        var id = getTrackId();
        var cachedData = {
            "id"      : id,
            "category": category || "",
            "data"    : data
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
        var deferred = jQuery.Deferred();
        // XXX TODO: add ajax call to expServer

        console.log(cache, "is commited");
        deferred.resolve();

        return deferred.promise();
    }

    return xcTracker;
}({}, jQuery));