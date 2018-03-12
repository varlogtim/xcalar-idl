window.XcSDK = window.XcSDK || {};
window.XcSDK.Promise = {
    "deferred": function() {
        return PromiseHelper.deferred();
    },

    "resolve": function() {
        var deferred = PromiseHelper.deferred();
        deferred.resolve.apply(this, arguments);
        return deferred.promise();
    },

    "reject": function() {
        var deferred = PromiseHelper.deferred();
        deferred.reject.apply(this, arguments);
        return deferred.promise();
    },

    "chain": function(promises) {
        // Takes an array of promise *generators*.
        // This means that promisearray[i]() itself calls a promise.
        // Reason for this being, promises start executing the moment they are
        // called, so you need to prevent them from being called in the first place.
        return PromiseHelper.chain(promises);
    },

    "chainHelper": function(promiseFunction, valueArr) {
        // Takes a function that returns a promise, and an array of values
        // to pass to that promise in a chain order.
        return PromiseHelper.chainHelper(promiseFunction, valueArr);
    },

    "when": function() {
        return PromiseHelper.when.apply(this, arguments);
    },

    "doWhile": function(oneIter, args, condition, opaqueArgs) {
        return PromiseHelper.doWhile(oneIter, args, condition, opaqueArgs);
    },

    "while": function(oneIter, args, condition, opaqueArgs) {
        return PromiseHelper.while(oneIter, args, condition, opaqueArgs);
    }
};
