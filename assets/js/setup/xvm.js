// XVM = Xcalar Version Manager
window.XVM = (function(XVM) {
    var majorVersion = "0";
    var minorVersion = "9";
    var revisionVersion = "12";
    var thriftInterfaceVersion = "12";
    var kvVersion = "0"; // Currently unused
    var fullVersion = majorVersion + "." + minorVersion + "." +
                        revisionVersion + "." +
                        thriftInterfaceVersion;
    var versionKey = "xcalar-version";
    var backendVersion = "";
    var licenseKey = "";

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

    XVM.checkVersionMatch = function() {
        var deferred = jQuery.Deferred();

        XcalarGetVersion()
        .then(function(result) {
            try {
                var versionNum = result.apiVersionSignatureShort;
                backendVersion = result.version;
                licenseKey = result.licenseKey;
                if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {
                    console.log("Thrift version mismatch! Backend's thrift " +
                      "version is:" +
                      XcalarApiVersionT.XcalarApiVersionSignature);
                    console.log("Frontend's thrift version is: " + versionNum);
                    console.log("Frontend's git SHA is: " + gGitVersion);
                    deferred.reject({error: ThriftTStr.Update});
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
