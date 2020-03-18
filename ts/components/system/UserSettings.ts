namespace UserSettings {
    let userInfos: UserInfo;
    let userPrefs: UserPref;
    let genSettings: GenSettings;
    let cachedPrefs = {};
    let monIntervalSlider;
    let commitIntervalSlider;
    let logOutIntervalSlider;
    let revertedToDefault = false;
    let modalHelper: ModalHelper;

    // oldUserInfos/userInfos contains settings such as if the user last had
    // list vs grid view on in the file browser, also contains general settings
    // which has the user's version of genSettings (ones editable in the
    // settings panel)
    // prevSettings/genSettings has the settings that are editable in the
    // settings panel such as monitor interval time
    /**
     * UserSettings.restore
     * @param oldUserInfos
     * @param prevSettings
     */
    export function restore(
        oldUserInfos: UserInfo,
        prevSettings: GenSettingsDurable
    ): XDPromise<void> {
        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        setup();
        userInfos = oldUserInfos;
        userPrefs = userInfos.getPrefInfo();

        saveLastPrefs();

        let dsInfo = userInfos.getDSInfo();
        genSettings = new GenSettings(<any>{}, prevSettings);
        DS.restore(dsInfo, true)
        .then(() => {
            restoreSettingsPanel();
            deferred.resolve();
        })
        .fail((error) => {
            console.error("Restore user info failed", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * when other workbook changes settings
     * UserSettings.sync
     */
    export function sync() {
        let oldUserInfos: UserInfo;

        KVStore.getUserInfo()
        .then((userMeta) => {
            oldUserInfos = new UserInfo(userMeta);
            return KVStore.getSettingInfo();
        })
        .then((prevSettings) => {
            userPrefs = new UserPref();
            userInfos = oldUserInfos;
            userPrefs = userInfos.getPrefInfo();
            saveLastPrefs();
            genSettings = new GenSettings(<any>{}, prevSettings);
            restoreSettingsPanel();
        });
    }

    /**
     * UserSettings.commit
     * @param showSuccess
     * @param hasDSChange
     * @param isPersonalChange
     */
    export function commit(
        showSuccess: boolean,
        hasDSChange: boolean = false,
        isPersonalChange: boolean = false,
        isGeneralChange: boolean = false,
    ): XDPromise<void> {
        if (!userPrefs) {
            // UserSettings.commit may be called when no workbook is created
            // and userPrefs has not been set up.
            return PromiseHelper.resolve();
        }

        let deferred: XDDeferred<void> = PromiseHelper.deferred();
        userPrefs.update();
        let userPrefHasChange = userPrefChangeCheck();
        let shouldCommit: boolean = hasDSChange || userPrefHasChange || revertedToDefault;
        if (shouldCommit) {
            userInfos.update();

            // if regular user, we will only commit userInfos with gUserKey.
            // if admin or xcSupport, we may commit userInfos/gUserKey
            // if there is a ds folder change, or we may commit genSettings
            // if there is a settings change, or both

            let dsPromise: XDPromise<void>;
            let userPrefPromise: XDPromise<void>;
            let userKey: string = KVStore.getKey("gUserKey");
            let userStore: KVStore = new KVStore(userKey, gKVScope.USER);
            let settingsKey: string = KVStore.getKey("gSettingsKey");
            let settingsStore: KVStore = new KVStore(settingsKey, gKVScope.GLOB);

            if (hasDSChange) {
                dsPromise = userStore.put(JSON.stringify(userInfos), true);
            } else {
                dsPromise = PromiseHelper.resolve();
            }

            if (userPrefHasChange || revertedToDefault) {
                if (Admin.isXcSupport() && !isPersonalChange) {
                    genSettings.updateXcSettings(UserSettings.getPref('general'));
                    userPrefPromise = settingsStore.putWithMutex(
                        JSON.stringify(genSettings.getAdminAndXcSettings()), true);
                } else if (Admin.isAdmin() && !isPersonalChange || isGeneralChange) {
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

            let $userSettingsSave = $("#userSettingsSave");
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
    }

    /**
     * UserSettings.getAllPrefs
     */
    export function getAllPrefs(): UserPref {
        return userPrefs || new UserPref();
    }

    /**
     * UserSettings.getPref
     * @param pref
     */
    export function getPref(pref: string): any {
        if (!userPrefs) {
            return null;
        }
        if (userPrefs.hasOwnProperty(pref)) {
            return userPrefs[pref];
        } else {
            for (let i in userPrefs) {
                if (userPrefs[i] != null &&
                    typeof userPrefs[i] === "object" &&
                    userPrefs[i].hasOwnProperty(pref)
                ) {
                    return userPrefs[i][pref];
                }
            }
        }
        // if not found in userPrefs, check general settings
        return genSettings.getPref(pref);
    }

    /**
     * UserSettings.setPref
     */
    export function setPref(
        pref: string,
        val: any,
        isGeneral: boolean
    ): void {
        if (isGeneral) {
            userPrefs.general[pref] = val;
        } else {
            userPrefs[pref] = val;
        }
    }

    /**
     * UserSettings.revertDefault
     */
    export function revertDefault(): void {
        let newPrefs: UserPref = new UserPref();
        userPrefs.general = newPrefs.general;
        if (Admin.isAdmin() && !XVM.isSingleUser()) {
            genSettings = new GenSettings();
        }
        restoreSettingsPanel();
        revertedToDefault = true;
    }

    export function show(): void {
        modalHelper.setup();
    }

    function close(): void {
        modalHelper.clear();
    }

    function setup(): void {
        const $modal = $("#userSettingsModal");
        modalHelper = new ModalHelper($modal, {
            sizeToDefault: true,
            noBackground: true
        });

        userPrefs = new UserPref();
        addEventListeners();

        if (XVM.isDataMart()) {
            // data mart options
            $("#userSettingsModal .optionSet:not(.dataMart)").remove();
        } else if (XVM.isCloud()) {
            // cloud options
            $("#userSettingsModal .optionSet:not(.cloud)").remove();
        } else {
            // remove cloud only settings
            $("#userSettingsModal .optionSet:not(.onPrem)").remove();
        }

        if (!Admin.isAdmin()) {
            // remove admin only settings
            $("#userSettingsModal .optionSet.admin").remove();
        }
    }

    function saveLastPrefs(): void {
        cachedPrefs = xcHelper.deepCopy(userPrefs);
    }

    function userPrefChangeCheck(): boolean {
        let shouldCommit: boolean = false;
        if (userPrefs == null) {
            // in case commit is triggered at setup time
            if (userInfos != null) {
                // this is a error case
                console.error("userPreference is null!");
            }

            return false;
        }
        for (let key in userPrefs) {
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
                    for (let pref in userPrefs[key]) {
                        if (!userPrefs[key].hasOwnProperty(pref)) {
                            continue;
                        }
                        if (cachedPrefs[key][pref] !== userPrefs[key][pref]) {
                            shouldCommit = true;
                            break;
                        }
                    }
                    if (!shouldCommit) {
                        for (let pref in cachedPrefs[key]) {
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

    function toggleSyntaxHighlight(on: boolean): void {
        SQLEditorSpace.Instance.toggleSyntaxHighlight(on);
        UDFPanel.Instance.toggleSyntaxHighlight(on);
    }

    function addEventListeners(): void {
        $("#showSyntaxHighlight").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("hideSyntaxHiglight", false, true);
                toggleSyntaxHighlight(true);
            } else {
                UserSettings.setPref("hideSyntaxHiglight", true, true);
                toggleSyntaxHighlight(false);
            }
        });

        $("#showDataColBox").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("hideDataCol", false, true);
            } else {
                UserSettings.setPref("hideDataCol", true, true);
            }
        });

        $("#hideSysOps").click(function() {
            let $checkbox = $(this);
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
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("disableDSShare", true, true);
                DS.toggleSharing(true);
            } else {
                UserSettings.setPref("disableDSShare", false, true);
                DS.toggleSharing(false);
            }
        });

        $("#enableInactivityCheck").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("enableInactivityCheck", true, true);
                XcUser.CurrentUser.enableIdleCheck();
            } else {
                UserSettings.setPref("enableInactivityCheck", false, true);
                XcUser.CurrentUser.disableIdleCheck();
            }
        });

        $("#enableXcalarSupport").click(function() {
            let $checkbox = $(this);
            $checkbox.toggleClass("checked");
            if ($checkbox.hasClass("checked")) {
                UserSettings.setPref("enableXcalarSupport", true, true);
            } else {
                UserSettings.setPref("enableXcalarSupport", false, true);
            }
            UserSettings.commit(false, false, false, true);
        });

        monIntervalSlider = new RangeSlider($('#monitorIntervalSlider'),
        'monitorGraphInterval', {
            minVal: 1,
            maxVal: 60,
            onChangeEnd: function(val) {
                MonitorPanel.updateSetting(val * 1000);
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

        const $colorThemeDropdown = _getColorThemeDropdown();
        new MenuHelper($colorThemeDropdown, {
            onSelect: ($li) => {
                const colorTheme = $li.data("option");
                UserSettings.setPref("colorTheme", colorTheme, true);
                _setColorTheme(colorTheme);
            },
            container: "#userSettingsModal",
            bounds: "#userSettingsModal"
        }).setupListeners();

        $("#userSettingsSave").click(function() {
            UserSettings.commit(true);
            close();
        });

        $("#userSettingsDefault").click(function() {
            // var sets = UserSettings;
            // var genSets = genSettings;
            UserSettings.revertDefault();
            UserSettings.commit(true);
            close();
        });

        $("#userSettingsModal").on("click", ".close, .cancel", () => {
            close();
        });
    }

    function restoreSettingsPanel(): void {
        const hideSyntaxHiglight = UserSettings.getPref("hideSyntaxHiglight")
        let hideDataCol = UserSettings.getPref("hideDataCol");
        let graphInterval = UserSettings.getPref("monitorGraphInterval");
        let commitInterval = UserSettings.getPref("commitInterval");
        let hideSysOps = UserSettings.getPref("hideSysOps");
        let disableDSShare = UserSettings.getPref("disableDSShare");
        let logOutInterval = UserSettings.getPref("logOutInterval");
        let enableInactivityCheck = UserSettings.getPref("enableInactivityCheck");
        let enableXcalarSupport: boolean = UserSettings.getPref("enableXcalarSupport") || false;
        const colorTheme = UserSettings.getPref("colorTheme") || CodeMirrorManager.DefaultColorTheme;

        if (!hideSyntaxHiglight) {
            $("#showSyntaxHighlight").addClass("checked");
        } else {
            $("#showSyntaxHighlight").removeClass("checked");
        }

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
        if (XVM.isCloud()) {
            if (enableInactivityCheck || enableInactivityCheck == null) {
                $("#enableInactivityCheck").addClass("checked");
                XcUser.CurrentUser.enableIdleCheck();
            } else {
                $("#enableInactivityCheck").removeClass("checked");
                XcUser.CurrentUser.disableIdleCheck();
            }

            if (enableXcalarSupport) {
                $("#enableXcalarSupport").addClass("checked");
            } else {
                $("#enableXcalarSupport").removeClass("checked");
                if (XVM.isCloud() && Admin.isAdmin()) {
                    // don't allow admin to login as user not allow
                    Alert.show({
                        "title": "Access Denied",
                        "msg": "The cloud user doesn't enable Xcalar support!",
                        // XXX TODO: enable it when auth work is done
                        // "lockScreen": true
                    });
                }
            }
        }

        _setColorTheme(colorTheme);
        DS.toggleSharing(disableDSShare);
        XcUser.CurrentUser.updateLogOutInterval(logOutInterval);

        monIntervalSlider.setSliderValue(graphInterval);
        commitIntervalSlider.setSliderValue(commitInterval);
        logOutIntervalSlider.setSliderValue(XcUser.CurrentUser.getLogOutTimeoutVal() / (1000 * 60));
    }

    function _getColorThemeDropdown(): JQuery {
        return $("#colorThemeSelector");
    }

    function _setColorTheme(colorTheme: string): void {
        colorTheme = colorTheme || CodeMirrorManager.Instance.getColorTheme();
        const $colorThemeDropdown = _getColorThemeDropdown();
        const $li = $colorThemeDropdown.find("li").filter((_index, e) => {
            return $(e).data("option") === colorTheme;
        });
        if ($li.length) {
            $colorThemeDropdown.find(".text").text($li.text());
        }
        CodeMirrorManager.Instance.setColorTheme(colorTheme);
    }
}
