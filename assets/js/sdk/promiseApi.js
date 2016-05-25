window.XcSDK = window.XcSDK || {};
window.XcSDK.Promise = {
    "deferred": function() {
        return jQuery.Deferred();
    },

    "resolve": function() {
        var deferred = jQuery.Deferred();
        deferred.resolve.apply(this, arguments);
        return deferred.promise();
    },

    "reject": function() {
        var deferred = jQuery.Deferred();
        deferred.reject.apply(this, arguments);
        return deferred.promise();
    },

    "chain": function(promises) {
        return PromiseHelper.chain(promises);
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
