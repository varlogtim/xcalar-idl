// XVM = Xcalar Version Manager
window.XVM = (function(XVM) {
    var majorVersion = "1";
    var minorVersion = "0";
    var revisionVersion = "1";
    var thriftInterfaceVersion = "15";
    var kvVersion = "0"; // Currently unused
    var fullVersion = majorVersion + "." + minorVersion + "." +
                        revisionVersion + "." +
                        thriftInterfaceVersion;
    var versionKey = "xcalar-version";
    var backendVersion = "";
    var licenseKey = "";
    var licenseMode = "";
                     // interactive or operational
    //var licenseMode = XcalarMode.Oper;

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
        return (licenseMode);
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
                    licenseKey = d.toDateString();
                    licenseMode = XcalarMode.Mod;
                    if (licKey.product === "XceMod") {
                        licenseMode = XcalarMode.Mod;
                    } else if (licKey.product === "XceOper") {
                        licenseMode = XcalarMode.Oper;
                    } else if (licKey.product === "Xce") {
                        licenseMode = XcalarMode.Oper;
                    } else {
                        console.error("Illegal op mode");
                        licenseMode = XcalarMode.Mod;
                    }
                }
                if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                    console.log("Thrift version mismatch! Backend's thrift " +
                      "version is:" +
                      XcalarApiVersionT.XcalarApiVersionSignature);
                    console.log("Frontend's thrift version is: " + versionNum);
                    console.log("Frontend's git SHA is: " + gGitVersion);
                    deferred.reject({error: ThriftTStr.Update});
                } else if (licKey.expired) {
                    console.log(licKey);
                    deferred.reject({error: "Your license has expired on " +
                                            licenseKey+"!"});

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
            if (ret && ret.status === StatusT.StatusSessionActiveElsewhere) {
                deferred.reject(ret);
            } else {
                deferred.reject({error: ThriftTStr.CCNBE});
            }
        });

        return (deferred.promise());
    };

    XVM.commitVersionInfo = function() {
        // the reason to put version info into kvStore
        // is: when upgrade, we need to know the version
        var versionInfo;

        KVStore.get(versionKey, gKVScope.VER)
        .then(function(value) {
            if (value == null) {
                versionInfo = new XcVersion({
                    "version": fullVersion,
                    "SHA"    : XVM.getSHA()
                });
                return KVStore.put(versionKey, JSON.stringify(versionInfo),
                                    true, gKVScope.VER);
            } else {
                console.info("Current Version", value);
            }
        })
        .then(function() {
            if (versionInfo != null) {
                // when can commit the version info
                console.info("Commit Version Info", versionInfo);
            }
        })
        .fail(function(error) {
            console.error("Commit Version Info fails!", error);
        });
    };

    // upgrdae the version info, do not implement yet!
    XVM.upgrade = function() {

    };

    return (XVM);
}({}));
