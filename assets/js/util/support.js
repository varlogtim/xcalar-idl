window.Support = (function(Support, $) {
    var username;
    var commitFlag;
    var commitCheckTimer;
    var commitCheckInterval = 120000; // 2 mins each check
    var commitCheckError = "commit key not match";
    var memoryCheck = true;
    // constant
    var defaultCommitFlag = "commit-default";
    var defaultMemoryLimit = 90;

    Support.setup = function() {
        try {
            username = sessionStorage.getItem("xcalar-username");
            // set up session variables
            userIdName = username;
            userIdUnique = getUserIdUnique(username);
        } catch (error) {
            console.error(error);
        }
    };

    Support.getUser = function() {
        return username;
    };

    Support.config = function(options) {
        if (options.memoryCheck != null) {
            memoryCheck = options.memoryCheck;
        }
    };

    Support.holdSession = function() {
        return sessionHoldCheck();
    };

    Support.releaseSession = function() {
        var deferred = jQuery.Deferred();

        KVStore.commit()
        .then(function() {
            return XcalarKeyPut(KVStore.commitKey, defaultCommitFlag, false, gKVScope.FLAG);
        })
        .then(function() {
            sessionStorage.removeItem(username);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    // in case you are hold forever
    Support.forceReleaseSession = function() {
        sessionStorage.removeItem(username);
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
                    commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.resolve();
                }
            })
            .fail(function(error) {
                if (error.status === StatusT.StatusSessionNotFound) {
                    commitMismatchHandler();
                    deferred.reject(commitCheckError);
                } else {
                    deferred.reject(error);
                }
            });
        }

        return (deferred.promise());
    };

    Support.memoryCheck = function() {
        if (!memoryCheck) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();

        XcalarApiTop()
        .then(function(result) {
            var tops = result.topOutputPerNode;
            for (var i = 0, len = tops.length; i < len; i++) {
                if (tops[i].memUsageInPercent > defaultMemoryLimit) {
                    DeleteTableModal.show();
                    return;
                }
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    };

    Support.heartbeatCheck = function() {
        if (commitCheckTimer != null) {
            clearInterval(commitCheckTimer);
        }

        commitCheckTimer = setInterval(function() {
            if (KVStore.commitKey == null) {
                // when workbook is not set up yet or no workbook yet
                return;
            }

            Support.commitCheck()
            .then(function() {
                return Support.memoryCheck();
            })
            .fail(function(error) {
                console.error(error);
            });

        }, commitCheckInterval);
    };

    Support.stopHeartbeatCheck = function() {
        clearInterval(commitCheckTimer);
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
            sessionStorage.setItem(username, "hold");
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
                } else if (sessionStorage.getItem(username) === "hold") {
                    // when this browser tab hold the seesion and not release
                    console.warn("Session not release last time...");
                    innerDeferred.resolve();
                } else {
                    innerDeferred.reject(WKBKTStr.Hold);
                }
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }
    }

    function commitMismatchHandler() {
        Support.stopHeartbeatCheck();

        // hide all modal
        $(".modalContainer:not(.locked)").hide();
        // this browser tab does not hold any more
        sessionStorage.removeItem(username);
        // user should force to logout
        sessionStorage.removeItem("xcalar-username");

        Alert.show({
            "title"     : WKBKTStr.Expire,
            "msg"       : WKBKTStr.ExpireMsg,
            "lockScreen": true,
            "logout"    : true
        });
    }

    function randCommitFlag() {
        return "commit" + Math.floor((Math.random() * 10000) + 1);
    }

    function getUserIdUnique(name) {
        var hash = jQuery.md5(name);
        var len = 5;
        var id = parseInt("0x" + hash.substring(0, len)) + 4000000;
        return id;
    }

    return (Support);
}({}, jQuery));
