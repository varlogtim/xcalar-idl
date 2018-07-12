(function($) {
    console.log("dynamic patch 1.4.0 loaded");

    SupTicketModal.fetchLicenseInfo = function() {
        var deferred = PromiseHelper.deferred();
        adminTools.getLicense()
        .then(function(data) {
            var key = data.logs || "";
            jQuery.ajax({
                "type": "GET",
                "url": "https://x3xjvoyc6f.execute-api.us-west-2.amazonaws.com/production/license/api/v1.0/keyinfo/"
                        + adminTools.compressLicenseKey(key),
                success: function(data) {
                    if (data.hasOwnProperty("ExpirationDate")) {
                        deferred.resolve({"key": key,
                                          "expiration": data.ExpirationDate,
                                          "organization": data.LicensedTo});
                    } else {
                        deferred.reject();
                    }
                },
                error: function(error) {
                    deferred.reject(error);
                }
            });
        })
        .fail(function(err) {
            deferred.reject(err);
        });
        return deferred.promise();
    };
}(jQuery));