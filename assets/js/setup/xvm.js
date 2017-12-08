// XVM = Xcalar Version Manager
window.XVM = (function(XVM) {
    var majorVersion = "1";
    var minorVersion = "3";
    var revisionVersion = "0";
    if (!window.gBuildNumber) {
        gBuildNumber = "git";
    }
    var fullVersion = majorVersion + "." + minorVersion + "." +
                        revisionVersion + "-" + gBuildNumber;
                        // build number is generated during the build process by
                        // Makefile and jenkins
    var kvVersion;
    var kvVersionKey;
    var backendVersion = "";
    var licenseKey = "";
    var licenseMode = "";
    var expirationDate = null;
    var numUsers = -1; // Set, but not used
    var numNodes = -1; // Set, but not used

    XVM.setup = function() {
        kvVersionKey = "xcalar-version-" + XcSupport.getUser();
    };

    XVM.getVersion = function() {
        return (fullVersion);
    };

    XVM.getSHA = function() {
        return XcalarApiVersionTStr[XcalarApiVersionT.XcalarApiVersionSignature];
    };

    XVM.getBackendVersion = function() {
        return (backendVersion);
    };

    XVM.getLicenseKey = function() {
        return (licenseKey);
    };

    XVM.getLicenseMode = function() {
        // If you want to test file uploader, uncomment line below
        // return (XcalarMode.Oper);
        // return (XcalarMode.Demo);
        // return (XcalarMode.Mod);
        return (licenseMode);
    };

    XVM.getMaxUsers = function() {
        return numUsers;
    };

    XVM.getMaxNodes = function() {
        return numNodes;
    };

    XVM.checkMaxUsers = function(users) {
        if (users == null) {
            console.error("wrong args, cannot check");
            return;
        }

        if (Admin.isAdmin()) {
            // admin skip the check
            return;
        } else if (typeof numUsers !== "number" || numUsers <= 0) {
            console.error("license not set up correctly!");
            return;
        }

        var curNumUsers = Object.keys(users).length;
        if (curNumUsers >= (numUsers * 2)) {
            Alert.error(AlertTStr.UserOverLimit, AlertTStr.UserOverLimitMsg, {
                "lockScreen": true
            });
        } else if (curNumUsers >= numUsers) {
            console.warn("concurrent users is more than max users in license");
        }
    };

    XVM.checkVersion = function(connectionCheck) {
        var deferred = jQuery.Deferred();

        XcalarGetVersion(connectionCheck)
        .then(function(result) {
            var versionMatch = true;
            try {
                var versionNum = result.apiVersionSignatureShort;
                backendVersion = result.version;

                if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                    console.log("Thrift version mismatch! Backend's thrift " +
                      "version is:" +
                      XcalarApiVersionT.XcalarApiVersionSignature);
                    console.log("Frontend's thrift version is: " + versionNum);
                    console.log("Frontend's git SHA is: " + gGitVersion);

                    versionMatch = false;
                }
            } catch (error) {
                // code may go here if thrift changes
                versionMatch = false;
                console.error(error);
            }
            deferred.resolve(versionMatch);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    function showInvalidLicenseAlert(err) {
        Alert.show({title: "License Error",
                    isAlert: true,
                    msg: err + "\nPlease contact your administrator to " +
                               "acquire a new license key."});
    }

    XVM.checkVersionAndLicense = function() {
        var deferred = jQuery.Deferred();
        var err;

        var passed = true;

        XVM.checkVersion()
        .then(function(versionMatch) {
            try {
                if (!versionMatch) {
                    err = {"error": ThriftTStr.Update};
                    passed = false;
                }
            } catch (error) {
                // code may go here if thrift changes
                err = {"error": ThriftTStr.Update};
                console.error(error);
                passed = false;
            }

            if (passed) {
                return XcalarGetLicense();
            } else {
                deferred.reject(err);
            }
        }, function(ret) {
            passed = false;
            if (ret && ret.status === StatusT.StatusSessionUsrAlreadyExists) {
                deferred.reject(ret);
            } else {
                deferred.reject({error: ThriftTStr.CCNBE});
            }
        })
        .then(function(licKey) {
            if (!passed) {
                return;
            }
            try {
                if (typeof(licKey) === "string") {
                    // This is an error. Otherwise it will be an object
                    licenseKey = "Unlicensed";
                } else {
                    var utcSeconds = parseInt(licKey.expiration);
                    var d = new Date(0);
                    d.setUTCSeconds(utcSeconds);
                    expirationDate = d;

                    licenseKey = d.toDateString();
                    licenseMode = XcalarMode.Mod;
                    if (licKey.product === "XceMod") {
                        licenseMode = XcalarMode.Mod;
                    } else if (licKey.product === "XceOper") {
                        licenseMode = XcalarMode.Oper;
                    } else if (licKey.product === "XceDemo") {
                        licenseMode = XcalarMode.Demo;
                    } else if (licKey.product === "Xce") {
                        licenseMode = XcalarMode.Oper;
                    } else {
                        console.error("Illegal op mode");
                        licenseMode = XcalarMode.Mod;
                    }
                }
                numNodes = licKey.nodeCount;
                numUsers = licKey.userCount;
                if (licKey.expired) {
                    console.log(licKey);
                    var error = xcHelper.replaceMsg(ErrTStr.LicenseExpire, {
                        "date": licenseKey
                    });
                    err = {"error": error};
                    passed = false;
                }
            } catch (error) {
                // code may go here if thrift changes
                err = {"error": ThriftTStr.Update};
                console.error(error);
                passed = false;
            }
            if (passed) {
                deferred.resolve();
            } else {
                showInvalidLicenseAlert(err.error);
                deferred.resolve();
            }
        }, function(err) {
            if (!passed) {
                return;
            }
            licenseKey = "Unlicensed";
            licenseMode = XcalarMode.Unlic;
            showInvalidLicenseAlert(err.error);
            deferred.resolve();
        });

        return (deferred.promise());
    };

    // check KVStore's version to see if need upgrade
    XVM.checkKVVersion = function() {
        var deferred = jQuery.Deferred();
        var needUpgrade = false;
        var firstUser = false;
        KVStore.get(kvVersionKey, gKVScope.VER)
        .then(function(res) {
            var versionInfo = parseKVStoreVersionInfo(res);
            checkVersionInfo(versionInfo);
            if (versionInfo == null) {
                // when it's a first time set up
                firstUser = true;
                return firstUserCheck();
            }
            var version = versionInfo.version;
            if (isNaN(version) || version > currentVersion) {
                xcConsole.error("Error of KVVersion", res);
            } else if (version < currentVersion) {
                needUpgrade = true;
            }

            if (needUpgrade) {
                return Upgrader.exec(version);
            } else if (versionInfo.needCommit) {
                return XVM.commitKVVersion();
            }
        })
        .then(function() {
            deferred.resolve(firstUser);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    function firstUserCheck() {
        var isFreeTrail = false;
        var deferred = jQuery.Deferred();
        var promise = isFreeTrail ? EULAModal.show() : PromiseHelper.resolve();

        promise
        .then(XVM.commitKVVersion)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function parseKVStoreVersionInfo(info) {
        if (info == null) {
            return null;
        }

        var versionInfo;
        try {
            versionInfo = JSON.parse(info);
            if (typeof versionInfo !== "object") {
                // an old version of versionInfo
                versionInfo = {
                    "version": Number(versionInfo),
                    "stripEmail": true,
                    "needCommit": true
                };
            }
        } catch (error) {
            console.error("parse error", error);
            return null;
        }
        return versionInfo;
    }

    function checkVersionInfo(versionInfo) {
        kvVersion = new KVVersion(versionInfo);
        if (kvVersion.stripEmail) {
            // need to redo the username setup
            XcSupport.setup(true);
        }
    }

    // XXX it's not used anywhere, just for testing upgrade
    XVM.rmKVVersion = function() {
        return KVStore.delete(kvVersionKey, gKVScope.VER);
    };

    // commit kvVersion
    XVM.commitKVVersion = function() {
        var version = JSON.stringify(kvVersion);
        return KVStore.put(kvVersionKey, version, true, gKVScope.VER);
    };

    XVM.alertLicenseExpire = function() {
        // for demo mode only
        if (XVM.getLicenseMode() !== XcalarMode.Demo) {
            return;
        }

        var currentTime = new Date().getTime();
        var expireTime = expirationDate.getTime();

        if (expireTime <= currentTime) {
            // this is an error case, should not happen
            var msg = xcHelper.replaceMsg(ErrTStr.LicenseExpire, {
                "date": licenseKey
            });

            Alert.show({
                "title": DemoTStr.title,
                "msg": msg,
                "lockScreen": true,
                "expired": true
            });
        } else {
            Alert.show({
                "title": DemoTStr.title,
                "msg": getExpireCountDownMsg(expireTime - currentTime),
                "isAlert": true
            });
        }

        function getExpireCountDownMsg(diff) {
            var oneMinute = 1000 * 60;
            var oneHour = oneMinute * 60;
            var oneDay = oneHour * 24;

            var dayDiff = Math.floor(diff / oneDay);
            diff -= dayDiff * oneDay;
            var hourDiff = Math.floor(diff / oneHour);
            diff -= hourDiff * oneHour;
            var minuteDiff = Math.floor(diff / oneMinute);

            var words = [];
            words.push(getWord(dayDiff, DemoTStr.day, DemoTStr.days));
            words.push(getWord(hourDiff, DemoTStr.hour, DemoTStr.hours));
            words.push(getWord(minuteDiff, DemoTStr.minute, DemoTStr.minutes));

            return DemoTStr.msg + " " + words.join(", ");
        }

        function getWord(num, singular, plural) {
            if (num <= 1) {
                return num + " " + singular;
            } else {
                return num + " " + plural;
            }
        }
    };

    XVM.initMode = function() {
        // This function hides all the stuff that's not supposed to be there
        // according to the modes
        // This function is the last to be called in the initialize phase
        if (licenseMode === XcalarMode.Demo) {
            $("#dataStoresTab #outButton").addClass("xc-hidden");
            xcTooltip.changeText($("#importDataButton"), TooltipTStr.PointDemo);
        }
    };

    return (XVM);
}({}));
