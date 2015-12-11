window.Support = (function(Support, $) {
    var username;
    var commitFlag;
    var commitCheckTimer;
    var commitCheckInterval = 120000; // 2 mins each check
    var commitCheckError = "commit key not match";

    // constant
    var defaultCommitFlag = "commit-default";

    Support.setup = function() {
        username = sessionStorage.getItem("xcalar-username");

        // set up session variables
        userIdName = username;
        userIdUnique = getUserIdUnique(username);
        return username;
    };

    Support.getUser = function() {
        return username;
    };

    Support.holdSession = function() {
        return sessionHoldCheck();
    };

    Support.releaseSession = function() {
        var deferred = jQuery.Deferred();

        commitToStorage()
        .then(function() {
            sessionStorage.removeItem(KVStore.user);
            return XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // in case you are hold forever
    Support.forceReleaseSession = function() {
        // XXX this is old code for safeLiveSync
        // if (!safeMode) {
        //     return (promiseWrapper(null));
        // }
        sessionStorage.removeItem(KVStore.user);
        XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG)
        .then(function() {
            location.reload();
        })
        .fail(function(error) {
            console.error(error);
        });
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
            .fail(function(error) {
                if (error.status === StatusT.StatusSessionNotFound) {
                    deferred.reject(commitCheckError);
                } else {
                    deferred.reject(error);
                }
            });
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
                if (error === commitCheckError) {
                    clearInterval(commitCheckTimer);
                    // this browser tab does not hold any more
                    sessionStorage.removeItem(KVStore.user);
                    Alert.show({
                        "title"     : "Please Log out",
                        "msg"       : "You are logged in somewhere else!",
                        "lockScreen": true,
                        "logout"    : true
                    });
                }
            });

        }, commitCheckInterval);
    };

    function sessionHoldCheck() {
        var deferred = jQuery.Deferred();

        holdCheckHelper()
        .then(function() {
            commitFlag = randCommitFlag();
            // hold the session
            return XcalarKeyPut(KVStore.commitKey, commitFlag, false, gKVScope.FLAG);
        })
        .then(function() {
            // mark as hold in browser tab
            sessionStorage.setItem(KVStore.user, "hold");
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());

        function holdCheckHelper() {
            var innerDeferred = jQuery.Deferred();

            XcalarKeyLookup(KVStore.commitKey, gKVScope.FLAG)
            .then(function(val) {
                if (val == null || val.value === defaultCommitFlag) {
                    innerDeferred.resolve();
                } else if (sessionStorage.getItem(KVStore.user) === "hold") {
                    // when this browser tab hold the seesion and not release
                    console.error("Session not release last time...");
                    innerDeferred.resolve();
                } else {
                    // when seesion is hold by others
                    Alert.show({
                        "title"  : "Signed on elsewhere!",
                        "msg"    : "Please close your other session.",
                        "buttons": [
                            {
                                "name"     : "Force Release",
                                "className": "cancel",
                                "func"     : function() {
                                    Support.forceReleaseSession();
                                }
                            }
                        ],
                        "noCancel": true
                    });
                    innerDeferred.reject("Already in use!");
                }
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }
    }

    function randCommitFlag() {
        return "commit" + Math.floor((Math.random() * 10000) + 1);
    }

    function getUserIdUnique(name) {
        var len = Math.min(name.length, 5);
        var id = 0;

        for (var i = 0; i < len; i++) {
            id += name.charCodeAt(i);
        }

        return id;
    }

    return (Support);
}({}, jQuery));
