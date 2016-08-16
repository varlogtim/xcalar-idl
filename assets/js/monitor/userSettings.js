window.UserSettings = (function($, UserSettings) {
    var userPrefs;
    var UserInfoKeys;
    var hasDSChange;
    var cachedPrefs = {};
    var memLimitSlider;
    var monIntervalSlider;

    UserSettings.restore = function() {
        var deferred = jQuery.Deferred();
        setup();

        KVStore.getAndParse(KVStore.gUserKey, gKVScope.USER)
        .then(function(res) {
            var result;
            if (res != null) {
                userPrefs = new UserPref(res[UserInfoKeys.PREF]);
                saveLastPrefs();
                result = res[UserInfoKeys.DS];
            } else {
                userPrefs = new UserPref();
                result = null;
            }
            restoreSettingsPanel();
            restoreMainTabs();
            var atStartup = true;
            return DS.restore(result, atStartup);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Restore user info failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UserSettings.commit = function() {
        if (!userPrefs) {
            // UserSettings.commit may be called when no workbook is created
            // and userPrefs has not been set up.
            return;
        }

        var deferred = jQuery.Deferred();

        userPrefs.update();
        updateMainTabs();

        var shouldCommit = hasDSChange || userPrefChangeCheck();

        if (shouldCommit) {
            hasDSChange = false;

            var userInfos = new UserInfoConstructor(UserInfoKeys, {
                "DS"  : DS.getHomeDir(),
                "PREF": userPrefs
            });

            KVStore.put(KVStore.gUserKey, JSON.stringify(userInfos), true, gKVScope.USER)
            .then(function() {
                saveLastPrefs();
                deferred.resolve();
            })
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

    UserSettings.getAllPrefs = function() {
        return userPrefs || new UserPref();
    };

    UserSettings.getPref = function(pref) {
        if (!userPrefs) {
            return null;
        }
        return userPrefs[pref];
    };

    UserSettings.setPref = function(pref, val) {
        userPrefs[pref] = val;
    };

    UserSettings.logDSChange = function() {
        hasDSChange = true;
        KVStore.logChange();
    };

    UserSettings.clear = function() {
        userPrefs = new UserPref();
    };

    function setup() {
        UserInfoKeys = getUserInfoKeys();
        userPrefs = new UserPref();
        hasDSChange = false;
        addEventListeners();
    }

    function saveLastPrefs() {
        cachedPrefs = xcHelper.deepCopy(userPrefs);
    }

    function userPrefChangeCheck() {
        var shouldCommit = false;
        if (userPrefs == null) {
            // in case commit is triggered at setup time
            if (!UserInfoKeys == null) {
                // this is a error case
                console.error("userPreference is null!");
            }

            return false;
        }

        for (var key in userPrefs) {
            if (cachedPrefs[key] == null && userPrefs[key] == null) {
                continue;
            } else if (cachedPrefs[key] !== userPrefs[key]) {
                if (typeof userPrefs[key] === "object") {
                    for (var pref in userPrefs[key]) {
                        if (cachedPrefs[key][pref] !== userPrefs[key][pref]) {
                            shouldCommit = true;
                            break;
                        }
                    }
                    if (shouldCommit) {
                        break;
                    }
                } else {
                    shouldCommit = true;
                }

                break;
            }
        }
        return shouldCommit;
    }

    function addEventListeners() {
        $('#showDataColBox').click(function() {
            var $checkbox = $(this); 
            $checkbox.toggleClass('checked'); 
            if ($checkbox.hasClass("checked")) {
                userPrefs.hideDataCol = false;
            } else {
                userPrefs.hideDataCol = true;
            }
        });

        memLimitSlider = new RangeSlider($('#memLimitSlider'), 'memoryLimit', {
            minVal: 50,
            maxVal: 99
        });
        monIntervalSlider = new RangeSlider($('#monitorIntervalSlider'), 'monitorGraphInterval', {
            minVal     : 1,
            maxVal     : 60,
            onChangeEnd: function(val) {
                MonitorGraph.updateInterval(val * 1000);
            }
        });
    }

    function restoreSettingsPanel() {
        if (!userPrefs.hideDataCol) {
            $('#showDataColBox').addClass('checked');
        }
       
        memLimitSlider.setSliderValue(userPrefs.memoryLimit);
        monIntervalSlider.setSliderValue(userPrefs.monitorGraphInterval);
    }

    function restoreMainTabs() {
        for (var tab in userPrefs.mainTabs) {
            var $button = $('#' + userPrefs.mainTabs[tab]).click();
            // need to mannually do this <->
            $button.siblings().removeClass("active");
            $button.addClass("active");
        }
        // XX xi2 hack for making worksheet initial screen
        $("#workspaceTab").click();
    }

    function updateMainTabs() {
        userPrefs.mainTabs.monitor = $('#monitorTopBar')
                                        .find('.buttonArea.active').attr('id');
        userPrefs.mainTabs.dataStores = $('#dataStoresTab')
                                        .find('.subTab.active').attr('id');
        userPrefs.mainTabs.scheduler = $('#schedulerTab')
                                        .find('.subTab.active').attr('id');
    }
    UserSettings.restoreMainTabs = restoreMainTabs;

    return (UserSettings);
}(jQuery, {}));
