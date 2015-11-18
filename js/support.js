window.Support = (function(Support, $) {
    var commitFlag;
    var commitCheckTimer;
    var commitCheckInterval = 120000; // 2 mins each check
    var commitCheckError = "commit key not match";

    Support.setup = function() {
        var deferred = jQuery.Deferred();

        // set up commit flag
        commitFlag = "commit" + Math.floor((Math.random() * 10000) + 1);
        // not persist, only store in memory as a flag,
        // when the flag matches, current UI can commit
        XcalarKeyPut(KVStore.commitKey, commitFlag, false, gKVScope.FLAG)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    Support.commitCheck = function() {
        var deferred = jQuery.Deferred();
        if (KVStore.commitKey == null) {
            // when workbook is not set up yet or no workbook yet
            deferred.resolve();
        } else {
            XcalarKeyLookup(KVStore.commitKey, gKVScope.FLAG)
            .then(function(val) {
                if (val == null || val.value !== commitFlag) {
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    };

    Support.heartbeatCheck = function() {
        commitCheckTimer = setInterval(function() {
            if (KVStore.commitKey == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            Support.commitCheck()
            .then(function() {
                // commitToStorage();
            })
            .fail(function(error) {
                console.error(error);
                clearInterval(commitCheckTimer);

                if (error === commitCheckError) {
                    Alert.show({
                        "title"   : "Please Log out",
                        "msg"     : "You are logged in somewhere else!",
                        "noCancel": true,
                        "buttons" : [{
                            "name": "Log Out",
                            "func": function() {
                                $("#signout").click();
                            }
                        }]
                    });
                }
            });

        }, commitCheckInterval);
    };

    return (Support);
}({}, jQuery));
