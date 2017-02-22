window.UserSettings = (function($, UserSettings) {
    var userPrefs;
    var userInfos;
    var hasDSChange; // becomes true if ds.js detected settings change
    var cachedPrefs = {};
    var monIntervalSlider;
    var commitIntervalSlider;
    var genSettings;

    UserSettings.restore = function(oldUserInfos, gInfosSetting) {
        var deferred = jQuery.Deferred();
        setup();

        userInfos = oldUserInfos;
        userPrefs = userInfos.getPrefInfo();

        saveLastPrefs();
        restoreMainTabs();

        var dsInfo = userInfos.getDSInfo();
        var atStartup = true;
        DS.restore(dsInfo, atStartup)
        .then(function() {
            genSettings = new GenSettings({}, gInfosSetting);
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
            userInfos.update();

            var kvKey;
            var kvScope;
            var info;

            if (gXcSupport) {
                kvKey = KVStore.gSettingsKey;
                kvScope = gKVScope.GLOB;
                genSettings.updateXcSettings(UserSettings.getPref('general'));
                info = genSettings.getAdminAndXcSettings();
            } else if (Admin.isAdmin()) {
                kvKey = KVStore.gSettingsKey;
                kvScope = gKVScope.GLOB;
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
                    xcHelper.showSuccess(SuccessTStr.SaveSettings);
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
                xcHelper.showSuccess(SuccessTStr.SaveSettings);
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
                if (typeof userPrefs[i] === "object" &&
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

    UserSettings.logDSChange = function() {
        hasDSChange = true;
        KVStore.logChange();
    };

    UserSettings.clear = function() {
        userPrefs = new UserPref();
    };

    function setup() {
        userPrefs = new UserPref();
        hasDSChange = false;
        addEventListeners();

        if (XVM.getLicenseMode() === XcalarMode.Mod) {
            $("#monitorDsSampleInput").find("li:contains(TB)").hide();
        }
    }

    // not used but may be in the future
    // function getUserConfigParams(params) {
    //     var numParams = params.numParams;
    //     params = params.parameter;
    //     var paramsObj = {};
    //     for (var i = 0; i < numParams; i++) {
    //         if (params[i].paramName === "DsDefaultSampleSize") {
    //             paramsObj[params[i].paramName] = parseInt(params[i].paramValue);
    //         }
    //     }
    //     return paramsObj;
    // }

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

        $('#skipSplashBox').click(function() {
            var $checkbox = $(this);
            $checkbox.toggleClass('checked');
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref('skipSplash', true, true);
                xcLocalStorage.setItem("noSplashLogin", true);
            } else {
                UserSettings.setPref('skipSplash', false, true);
                xcLocalStorage.setItem("noSplashLogin", false);
            }
        });

        var $dsSampleLimit = $('#monitorDsSampleInput');
        new MenuHelper($dsSampleLimit.find(".dropDownList"), {
            "onSelect": function($li) {
                var $input = $li.closest(".dropDownList").find(".unit");
                $input.val($li.text());
                updateDsPreviewLimitInput();
            },
            "container": $("#monitorGenSettingsCard"),
            "bounds": $("#monitor-settings")
        }).setupListeners();

        $dsSampleLimit.on('change', '.size', function() {
            updateDsPreviewLimitInput();
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
                Support.heartbeatCheck();
            }
        });

        $("#userSettingsSave").click(function() {
            $("#autoSaveBtn").click();
        });
    }

    function updateDsPreviewLimitInput() {
        var $dsSampleLimit = $('#monitorDsSampleInput');
        var size = getDsSampleLimitValue();
        var error = DataStore.checkSampleSize(size);
        if (error != null) {
            StatusBox.show(error, $dsSampleLimit, false);

            var dsSampleLimit = UserSettings.getPref('DsDefaultSampleSize');
            setDsSampleLimitValue(dsSampleLimit);
        } else {
            UserSettings.setPref("DsDefaultSampleSize", size, true);
            var advanceOption = DSPreview.getAdvanceOption();
            advanceOption.modify({
                previewSize: size
            });
        }
    }
           
    function restoreSettingsPanel() {
        var hideDataCol = UserSettings.getPref('hideDataCol');
        var skipSplash = UserSettings.getPref('skipSplash');
        var graphInterval = UserSettings.getPref('monitorGraphInterval');
        var commitInterval = UserSettings.getPref('commitInterval');
        var dsSampleLimit = UserSettings.getPref('DsDefaultSampleSize');
        
        if (!hideDataCol) {
            $('#showDataColBox').addClass('checked');
        }
        if (!window.hasFlash) {
            $('#skipSplashBox').closest('.optionSet').addClass('xc-hidden');
        } else if (skipSplash) {
            $('#skipSplashBox').addClass('checked');
        }

        monIntervalSlider.setSliderValue(graphInterval);
        commitIntervalSlider.setSliderValue(commitInterval);
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
