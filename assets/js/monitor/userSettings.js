window.UserSettings = (function($, UserSettings) {
    var userPrefs;
    var UserInfoKeys;
    var hasDSChange; // becomes true if ds.js detected settings change
    var cachedPrefs = {};
    var memLimitSlider;
    var monIntervalSlider;
    var genSettings;

    UserSettings.restore = function() {
        var deferred = jQuery.Deferred();
        var userConfigParams;
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
            restoreMainTabs();

            var atStartup = true;
            return (DS.restore(result, atStartup));
        })
        .then(function() {
            return (XcalarGetConfigParams());
        })
        .then(function(res) {
            userConfigParams = getUserConfigParams(res);
            return (KVStore.getAndParse(KVStore.gSettingsKey, gKVScope.GLOB));
        })
        .then(function(res) {
            genSettings = new GenSettings(userConfigParams, res);
            restoreSettingsPanel();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Restore user info failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    UserSettings.commit = function(showSuccess) {

        var deferred = jQuery.Deferred();
        if (!userPrefs) {
            // UserSettings.commit may be called when no workbook is created
            // and userPrefs has not been set up.
            return deferred.resolve().promise();
        }

        userPrefs.update();
        var shouldCommit = hasDSChange || userPrefChangeCheck();
        if (shouldCommit) {
            var userInfos = new UserInfoConstructor(UserInfoKeys, {
                "DS"  : DS.getHomeDir(),
                "PREF": userPrefs
            });

            var kvKey;
            var kvScope;
            var info;

            if (gXcSupport) {
                kvKey = KVStore.gSettingsKey;
                kvScope = KVStore.GLOB;
                genSettings.updateXcSettings(UserSettings.getPref('general'));
                info = genSettings.getAdminAndXcSettings();
            } else if (Admin.isAdmin()) {
                kvKey = KVStore.gSettingsKey;
                kvScope = KVStore.GLOB;
                genSettings.updateAdminSettings(
                                        UserSettings.getPref('general'));
                info = genSettings.getAdminAndXcSettings();
            } else {
                kvKey = KVStore.gUserKey;
                kvScope = gKVScope.USER;
                info = userInfos;
            }

            KVStore.put(kvKey, JSON.stringify(info), true, kvScope)
            .then(function() {
                hasDSChange = false;
                saveLastPrefs();
                if (showSuccess) {
                    xcHelper.showSuccess();
                }
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("Commit User Info failed", error);
                deferred.reject(error);
            });
        } else {
            // when no need to commit
            if (showSuccess) {
                xcHelper.showSuccess();
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
        if (userPrefs[pref]) {
            return userPrefs[pref];
        } else if (!userPrefs[pref]) {
            for (var i in userPrefs) {
                if (typeof userPrefs[i] === "object" &&
                    userPrefs[i][pref]) {
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

    function getUserConfigParams(params) {
        var numParams = params.numParams;
        params = params.parameter;
        var paramsObj = {};
        for (var i = 0; i < numParams; i++) {
            if (params[i].paramName === "DsDefaultSampleSize") {
                paramsObj[params[i].paramName] = parseInt(params[i].paramValue);
            }
        }
        return paramsObj;
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
                UserSettings.setPref('hideDataCol', false, true);
            } else {
                UserSettings.setPref('hideDataCol', true, true);
            }
        });

        var $dsSampleLimit = $('#monitorDsSampleInput');
        new MenuHelper($dsSampleLimit.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".unit");
                $input.val($li.text());
                var size = getDsSampleLimitValue();
                UserSettings.setPref("DsDefaultSampleSize", size, true);
            },
            "container": $("#monitorGenSettingsCard"),
            "bounds"   : $("#monitor-settings")
        }).setupListeners();

        $dsSampleLimit.on('change', '.size', function() {
            var size = getDsSampleLimitValue();
            UserSettings.setPref("DsDefaultSampleSize", size, true);
        });

        memLimitSlider = new RangeSlider($('#memLimitSlider'), 'memoryLimit', {
            minVal: 50,
            maxVal: 99
        });
        monIntervalSlider = new RangeSlider($('#monitorIntervalSlider'),
            'monitorGraphInterval', {
            minVal     : 1,
            maxVal     : 60,
            onChangeEnd: function(val) {
                MonitorGraph.updateInterval(val * 1000);
            }
        });

        $("#userSettingsSave").click(function() {
            var dsSampleLimit = UserSettings.getPref('DsDefaultSampleSize');
            XcalarSetConfigParams('DsDefaultSampleSize', dsSampleLimit)
            .then(function() {
                $("#autoSaveBtn").click();
            })
            .fail(function(err) {
                Alert.error(MonitorTStr.SavingSettingsFailed, err);
            });
            
        });
    }

    function restoreSettingsPanel() {
        var hideDataCol = UserSettings.getPref('hideDataCol');
        var memoryLimit = UserSettings.getPref('memoryLimit');
        var graphInterval = UserSettings.getPref('monitorGraphInterval');
        var dsSampleLimit = UserSettings.getPref('DsDefaultSampleSize');
        if (!hideDataCol) {
            $('#showDataColBox').addClass('checked');
        }
       
        memLimitSlider.setSliderValue(memoryLimit);
        monIntervalSlider.setSliderValue(graphInterval);
        setDsSampleLimitValue(dsSampleLimit);
    }

    function getDsSampleLimitValue() {
        var $dsSampleLimit = $('#monitorDsSampleInput');
        var $sizeInput = $dsSampleLimit.find('.size');
        var $unitInput = $dsSampleLimit.find('.dropDownList').find('.unit');
        var sizeVal = $sizeInput.val() || 0;
        var unitVal = $unitInput.val();

        return xcHelper.getPreviewSize(sizeVal, unitVal);
    }

    function setDsSampleLimitValue(fullVal) {
        var size = xcHelper.sizeTranslator(fullVal, true);
        $('#monitorDsSampleInput').find(".size").val(size[0]);
        $('#monitorDsSampleInput').find(".unit").val(size[1]);
    }

    function restoreMainTabs() {
        // XX xi2 hack for making worksheet initial screen
        $("#workspaceTab").click();
    }

    UserSettings.restoreMainTabs = restoreMainTabs;

    return (UserSettings);
}(jQuery, {}));
