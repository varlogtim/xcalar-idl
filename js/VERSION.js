// XVM = Xcalar Version Manager
window.XVM = (function(XVM) {
    var majorVersion = "0";
    var minorVersion = "9";
    var revisionVersion = "7";
    var thriftInterfaceVersion = "4";
    var kvVersion = "0";
    var fullVersion = majorVersion + "." + minorVersion + "." +
                        revisionVersion + "." +
                        thriftInterfaceVersion + "." + kvVersion;
    var versionKey = "xcalar-version";

    XVM.getVersion = function() {
        return (fullVersion);
    };

    XVM.getSHA = function() {
        return XcalarApiVersionTStr[XcalarApiVersionT.XcalarApiVersionSignature];
    };

    XVM.checkVersionMatch = function() {
        var deferred = jQuery.Deferred();

        XcalarGetVersion()
        .then(function(result) {
            var versionNum = result.output.outputResult.getVersionOutput
                                                       .apiVersionSignatureShort;
            if (versionNum !== XcalarApiVersionT.XcalarApiVersionSignature) {

                deferred.reject({error: 'Update required.'});
            } else {
                deferred.resolve();
            }
        })
        .fail(function() {
            deferred.reject({error: 'Connection could not be established.'});
        });

        return (deferred.promise());
    };

    XVM.commitVersionInfo = function() {
        var versionInfo;

        KVStore.get(versionKey, gKVScope.VER)
        .then(function(value) {
            if (value == null) {
                versionInfo = new VersionInfo();
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

    function VersionInfo() {
        this.version = XVM.getVersion();
        this.SHA = XVM.getSHA();

        return this;
    }

    return (XVM);
}({}));
