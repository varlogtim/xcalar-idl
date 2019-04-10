window.UserSettings = (function($, UserSettings) {
    var userPrefs;
    var userInfos;
    var cachedPrefs = {};
    var monIntervalSlider;
    var commitIntervalSlider;
    var logOutIntervalSlider;
    var genSettings;
    var revertedToDefault = false;

    // oldUserInfos/userInfos contains settings such as if the user last had
    // list vs grid view on in the file browser, also contains general settings
    // which has the user's version of genSettings (ones editable in the
    // settings npanel)
    // prevSettings/genSettings has the settings that are editable in the
    // settings panel such as monitor interval time
    UserSettings.restore = function(oldUserInfos, prevSettings) {
        var deferred = PromiseHelper.deferred();
        setup();
        userInfos = oldUserInfos;
        userPrefs = userInfos.getPrefInfo();

        saveLastPrefs();

        var dsInfo = userInfos.getDSInfo();
        genSettings = new GenSettings({}, prevSettings);
        var atStartup = true;
        DS.restore(dsInfo, atStartup)
        .then(function() {
            restoreSettingsPanel();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Restore user info failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // when other workbook changes settings
    UserSettings.sync = function() {
        var oldUserInfos;

        KVStore.getUserInfo()
        .then(function(userMeta) {
            oldUserInfos = new UserInfo(userMeta);
            return KVStore.getSettingInfo();
        })
        .then(function(prevSettings) {
            userPrefs = new UserPref();
            userInfos = oldUserInfos;
            userPrefs = userInfos.getPrefInfo();
            saveLastPrefs();
            var dsInfo = userInfos.getDSInfo();
            genSettings = new GenSettings({}, prevSettings);
            restoreSettingsPanel();
        });
    }

    UserSettings.commit = function(showSuccess, hasDSChange, isPersonalChange) {
        var deferred = PromiseHelper.deferred();
        if (!userPrefs) {
            // UserSettings.commit may be called when no workbook is created
            // and userPrefs has not been set up.
            return PromiseHelper.resolve();
        }

        userPrefs.update();
        var userPrefHasChange = userPrefChangeCheck();
        var shouldCommit = hasDSChange || userPrefHasChange ||
                           revertedToDefault;
        if (shouldCommit) {
            userInfos.update();

            // If regular user, we will only commit userInfos with gUserKey.
            // If admin or xcSupport, we may commit userInfos/gUserKey
            // if there's a ds folder change, or we may commit genSettings
            // if there's a settings change, or both

            var dsPromise;
            var userPrefPromise;
            var userKey = KVStore.getKey("gUserKey");
            var userStore = new KVStore(userKey, gKVScope.USER);
            var settingsKey = KVStore.getKey("gSettingsKey");
            var settingsStore = new KVStore(settingsKey, gKVScope.GLOB);

            if (hasDSChange) {
                dsPromise = userStore.put(JSON.stringify(userInfos), true);
            } else {
                dsPromise = PromiseHelper.resolve();
            }

            if (userPrefHasChange || revertedToDefault) {
                if (gXcSupport && !isPersonalChange) {
                    genSettings.updateXcSettings(UserSettings.getPref('general'));
                    userPrefPromise = settingsStore.putWithMutex(
                        JSON.stringify(genSettings.getAdminAndXcSettings()), true);
                } else if (Admin.isAdmin() && !isPersonalChange) {
                    genSettings.updateAdminSettings(UserSettings.getPref('general'));
                    userPrefPromise = settingsStore.putWithMutex(
                        JSON.stringify(genSettings.getAdminAndXcSettings()), true);
                } else if (!hasDSChange) {
                    userPrefPromise = userStore.put(JSON.stringify(userInfos), true);
                } else {
                    // if has dsChange, dsPromise will take care of it
                    userPrefPromise = PromiseHelper.resolve();
                }
            } else {
                userPrefPromise = PromiseHelper.resolve();
            }

            const $userSettingsSave = $("#userSettingsSave");
            xcUIHelper.disableSubmit($userSettingsSave);

            dsPromise
            .then(function() {
                return userPrefPromise;
            })
            .then(function() {
                revertedToDefault = false;
                saveLastPrefs();
                XcSocket.Instance.sendMessage("refreshUserSettings", {});
                if (showSuccess) {
                    xcUIHelper.showSuccess(SuccessTStr.SaveSettings);
                }
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("Commit User Info failed", error);
                if (showSuccess) {
                    xcUIHelper.showFail(FailTStr.SaveSettings);
                }
                deferred.reject(error);
            })
            .always(function() {
                xcUIHelper.enableSubmit($userSettingsSave);
            });
        } else {
            if (showSuccess) {
                xcUIHelper.showSuccess(SuccessTStr.SaveSettings);
            }
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
        if (userPrefs.hasOwnProperty(pref)) {
            return userPrefs[pref];
        } else {
            for (var i in userPrefs) {
                if (userPrefs[i] != null &&
                    typeof userPrefs[i] === "object" &&
                    userPrefs[i].hasOwnProperty(pref)) {
                    return userPrefs[i][pref];
                }
            }
        }
        // if not found in userPrefs, check general settings
        return genSettings.getPref(pref);
    };

    UserSettings.setPref = function(pref, val, isGeneral) {
        if (isGeneral) {
            userPrefs.general[pref] = val;
        } else {
            userPrefs[pref] = val;
        }
    };

    UserSettings.revertDefault = function() {
        var newPrefs = new UserPref();
        userPrefs.general = newPrefs.general;
        if (Admin.isAdmin()) {
            genSettings = new GenSettings();
        }
        restoreSettingsPanel();
        revertedToDefault = true;
    };

    function setup() {
        userPrefs = new UserPref();
        addEventListeners();
        if (!Admin.isAdmin()) { // remove admin only settings
            $("#monitorGenSettingsCard .optionSet.admin").remove();
        }
    }

    function saveLastPrefs() {
        cachedPrefs = xcHelper.deepCopy(userPrefs);
    }

    function userPrefChangeCheck() {
        var shouldCommit = false;
        if (userPrefs == null) {
            // in case commit is triggered at setup time
            if (userInfos != null) {
                // this is a error case
                console.error("userPreference is null!");
            }

            return false;
        }
        for (var key in userPrefs) {
            if (!userPrefs.hasOwnProperty(key)) {
                continue;
            }
            if (cachedPrefs[key] == null && userPrefs[key] == null) {
                continue;
            } else if (cachedPrefs[key] == null || userPrefs[key] == null) {
                shouldCommit = true;
                break;
            } else if (cachedPrefs[key] !== userPrefs[key]) {
                if (typeof userPrefs[key] === "object") {
                    for (var pref in userPrefs[key]) {
                        if (!userPrefs[key].hasOwnProperty(pref)) {
                            continue;
                        }
                        if (cachedPrefs[key][pref] !== userPrefs[key][pref]) {
                            shouldCommit = true;
                            break;
                        }
                    }
                    if (!shouldCommit) {
                        for (var pref in cachedPrefs[key]) {
                            if (cachedPrefs[key][pref] !== userPrefs[key][pref])
                            {
                                shouldCommit = true;
                                break;
                            }
                        }
                    }
                    if (shouldCommit) {
                        break;
                    }
                } else if (typeof userPrefs[key] !== "function") {
                    shouldCommit = true;
                    break;
                }
            }
        }
        return shouldCommit;
    }

    function addEventListeners() {
        $("#showDataColBox").click(function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("hideDataCol", false, true);
            } else {
                UserSettings.setPref("hideDataCol", true, true);
            }
        });

        $("#hideSysOps").click(function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("hideSysOps", true, true);
                QueryManager.toggleSysOps(true);
            } else {
                UserSettings.setPref("hideSysOps", false, true);
                QueryManager.toggleSysOps(false);
            }
        });

        $("#disableDSShare").click(function() {
            var $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("disableDSShare", true, true);
                DS.toggleSharing(true);
            } else {
                UserSettings.setPref("disableDSShare", false, true);
                DS.toggleSharing(false);
            }
        });

        monIntervalSlider = new RangeSlider($('#monitorIntervalSlider'),
        'monitorGraphInterval', {
            minVal: 1,
            maxVal: 60,
            onChangeEnd: function(val) {
                MonitorGraph.updateInterval(val * 1000);
            }
        });

        commitIntervalSlider = new RangeSlider($('#commitIntervalSlider'),
        'commitInterval', {
            minVal: 10,
            maxVal: 600,
            onChangeEnd: function() {
                XcSupport.heartbeatCheck();
            }
        });

        logOutIntervalSlider = new RangeSlider($('#logOutIntervalSlider'),
        'logOutInterval', {
            minVal: 10,
            maxVal: 120,
            onChangeEnd: function(val) {
                // here update the logout timeout value
                XcUser.CurrentUser.updateLogOutInterval(val);
            }
        });

        $("#userSettingsSave").click(function() {
            UserSettings.commit(true);
        });

        $("#userSettingsDefault").click(function() {
            // var sets = UserSettings;
            // var genSets = genSettings;
            UserSettings.revertDefault();
            UserSettings.commit(true);
        });
    }

    function restoreSettingsPanel() {
        var hideDataCol = UserSettings.getPref("hideDataCol");
        var graphInterval = UserSettings.getPref("monitorGraphInterval");
        var commitInterval = UserSettings.getPref("commitInterval");
        var hideSysOps = UserSettings.getPref("hideSysOps");
        var disableDSShare = UserSettings.getPref("disableDSShare");
        var logOutInterval = UserSettings.getPref("logOutInterval");

        if (!hideDataCol) {
            $("#showDataColBox").addClass("checked");
        } else {
            $("#showDataColBox").removeClass("checked");
        }

        if (hideSysOps) {
            $("#hideSysOps").addClass("checked");
        } else {
            $("#hideSysOps").removeClass("checked");
        }

        if (disableDSShare) {
            $("#disableDSShare").addClass("checked");
        } else {
            $("#disableDSShare").removeClass("checked");
        }
        DS.toggleSharing(disableDSShare);
        XcUser.CurrentUser.updateLogOutInterval(logOutInterval);
        monIntervalSlider.setSliderValue(graphInterval);
        commitIntervalSlider.setSliderValue(commitInterval);
        logOutIntervalSlider.setSliderValue(XcUser
            .CurrentUser.getLogOutTimeoutVal() / (1000 * 60));
    }

    return (UserSettings);
}(jQuery, {}));
