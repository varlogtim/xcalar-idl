// XVM = Xcalar Version Manager
window.XVM = (function(XVM) {
    var majorVersion = "1";
    var minorVersion = "1";
    var revisionVersion = "0";
    var thriftInterfaceVersion = "18";
    var fullVersion = majorVersion + "." + minorVersion + "." +
                        revisionVersion + "." +
                        thriftInterfaceVersion;
    var kvVersion; // equal to currentVersion;
    var kvVersionKey;
    var backendVersion = "";
    var licenseKey = "";
    var licenseMode = "";
    var expirationDate = null;
    var numUsers = -1; // Set, but not used
    var numNodes = -1; // Set, but not used

    XVM.setup = function() {
        kvVersion = currentVersion;
        kvVersionKey = "xcalar-version-" + Support.getUser();
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
        //return (XcalarMode.Demo);
        // return (XcalarMode.Mod);
        return (licenseMode);
    };

    XVM.getMaxUsers = function() {
        return numUsers;
    };

    XVM.getMaxNodes = function() {
        return numNodes;
    };

    XVM.checkVersionMatch = function() {
        var deferred = jQuery.Deferred();

        var def1 = XcalarGetLicense();
        var def2 = XcalarGetVersion();
        PromiseHelper
        .when(def1, def2)
        .then(function(licKey, result) {
            try {
                var versionNum = result.apiVersionSignatureShort;
                backendVersion = result.version;

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
                if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                    console.log("Thrift version mismatch! Backend's thrift " +
                      "version is:" +
                      XcalarApiVersionT.XcalarApiVersionSignature);
                    console.log("Frontend's thrift version is: " + versionNum);
                    console.log("Frontend's git SHA is: " + gGitVersion);
                    deferred.reject({"error": ThriftTStr.Update});
                } else if (licKey.expired) {
                    console.log(licKey);
                    var error = xcHelper.replaceMsg(ErrTStr.LicenseExpire, {
                        "date": licenseKey
                    });
                    deferred.reject({"error": error});

                } else {
                    deferred.resolve();
                }
            } catch (error) {
                // code may go here if thrift changes
                console.error(error);
                deferred.reject({error: ThriftTStr.Update});
            }
        })
        .fail(function(ret) {
            if (ret && ret.status === StatusT.StatusSessionUsrActiveElsewhere) {
                deferred.reject(ret);
            } else {
                deferred.reject({error: ThriftTStr.CCNBE});
            }
        });

        return (deferred.promise());
    };

    // check KVStore's version to see if need upgrade
    XVM.checkKVVersion = function() {
        var deferred = jQuery.Deferred();
        var needUpgrade = false;
        var firstUser = false;

        KVStore.get(kvVersionKey, gKVScope.VER)
        .then(function(value) {
            if (value == null) {
                firstUser = true;
                // when it's a first time set up
                return XVM.commitKVVersion();
            }

            var version = Number(value);
            if (isNaN(version) || version > kvVersion) {
                xcConsole.error("Error of KVVersion", value);
            } else if (version < kvVersion) {
                needUpgrade = true;
            }
            if (needUpgrade) {
                return Upgrader.exec(version);
            }
        })
        .then(function() {
            deferred.resolve(firstUser);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

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
            $("#monitorDsSampleInput").closest(".optionSet").hide();
        }
    };

    return (XVM);
}({}));
