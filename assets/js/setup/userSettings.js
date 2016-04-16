window.UserSettings = (function($, UserSettings) {
    var userPreference;
    var UserInfoKeys;
    var hasDSChange;

    UserSettings.restore = function() {
        var deferred = jQuery.Deferred();
        setup();

        KVStore.getAndParse(KVStore.gUsreKey, gKVScope.USER)
        .then(function(res) {
            if (res != null) {
                userPreference = new UserPref(res[UserInfoKeys.PREF]);
                return DS.initialize(res[UserInfoKeys.DS]);
            } else {
                return DS.initialize(null);
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Restore user info failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UserSettings.commit = function() {
        var deferred = jQuery.Deferred();

        var curUserPref = new UserPref().update();
        var shouldCommit = hasDSChange || userPrefChangeCheck(curUserPref);

        if (shouldCommit) {
            userPreference = curUserPref;
            hasDSChange = false;

            var userInfos = new UserInfoConstructor(UserInfoKeys, {
                "DS"  : DS.getHomeDir(),
                "PREF": curUserPref
            });

            KVStore.put(KVStore.gUsreKey, JSON.stringify(userInfos), true, gKVScope.USER)
            .then(deferred.resolve)
            .fail(function(error) {
                console.error("Commit User Info failed", error);
                deferred.reject(error);
            });
        } else {
            // when no need to commit
            deferred.resolve();
        }

        return deferred.promise();
    };

    UserSettings.getPreference = function() {
        return userPreference || {};
    };

    UserSettings.logDSChange = function() {
        hasDSChange = true;
    };

    UserSettings.clear = function() {
        userPreference = new UserPref();
    };

    function setup() {
        UserInfoKeys = getUserInfoKeys();
        userPreference = {};
        hasDSChange = false;
    }

    function userPrefChangeCheck(curUserPref) {
        var shouldCommit = false;
        if (userPreference == null) {
            // in case commit is triggered at setup time
            if (!UserInfoKeys == null) {
                // this is a error case
                console.error("userPreference is null!");
            }

            return false;
        }

        for (var key in curUserPref) {
            if (curUserPref[key] == null && userPreference[key] == null) {
                continue;
            } else if (curUserPref[key] !== userPreference[key]) {
                shouldCommit = true;
                break;
            }
        }

        return shouldCommit;
    }

    return (UserSettings);
}(jQuery, {}));
