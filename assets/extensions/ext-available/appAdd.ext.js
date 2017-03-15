// The problem: app needs to be provided in string format
// however can't provide filepath to run, (security risk)
// So rawstrings it is.

// This is not actually tested, but should serve as a skeleton
// for adding applications until the frontend provides a UDF-like
// function loading interface.

window.UExtAppAdd = (function(UExtAppAdd) {
    UExtAppAdd.buttons = [{
        "buttonText"    : "Add App",
        "fnName"        : "appAdd",
        "arrayOfFields" : [{
            "type"       : "string",
            "name"       : "App Name",
            "fieldClass" : "appName"
        },
        {
            "type"       : "string",
            "name"       : "Host Type",
            "fieldClass" : "hostType",
            // Uncomment below when cpp apps are implemented.
            // "enums"       : ["python","cpp"]
            "enums"       : ["python"]
        },
        {
            "type"       : "string",
            "name"       : "Duty",
            "fieldClass" : "duty",
            // Uncomment below when export duty is implemented.
            // "enums"       : ["load", "export"]
            "enums"       : ["load"]
        },
        {
            "type"       : "string",
            "name"       : "App File Path",
            "fieldClass" : "appFilePath"
        }]
    }];

    UExtAppAdd.actionFn = function(funcName) {
        var ext;
        switch (funcName) {
            case "appAdd":
                ext = new XcSDK.Extension();
                ext.start = appAdd;
            default:
                return null;
        }
    };

    UExtAppAdd.configParams = {
        "notTableDependent": true
    };

    function appAdd() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Arguments
        var appName = args.appName;
        var hostType = args.hostType;
        var duty = args.duty;
        var appFilePath = args.appFilePath;

        // The problem: app needs to be provided in string format
        // however can't provide filepath to run, (security risk)
        // So this whole thing needs to be ported to an "add udf"
        // type interface for front end

        // Temporary solution: change execStr below or hack add UDF
        // panel to add apps instead of UDFs (see jerene)
        execStr = String.raw`import xcalar

import io

# SDK:
# xcalar.getNodeId()
# xcalar.getNodeCount()
# xcalar.getOutputBuffer(size, label)
# xcalar.spawn(appName, inStr)
# xcalar.barrierWait()
# xcalar.getGlobalScratchpad()


def main(inStr):


    result = "Hello wurld" + str(inStr)


    return result# string output`;

        // Debugging
        // console.log(appName, hostType, duty, appFilePath);

        ext.appSet(appName, hostType, duty, execStr)
        .done(function() {
            xcHelper.showSuccess("Upload App Successful!");
            deferred.resolve();
        })
        .fail(function() {
            Alert.error("App Load Error.",
                        "App failed to load. Error: " +
                        JSON.stringify(arguments));
            deferred.reject();
        });

        return deferred.promise();
    }
    return (UExtAppAdd);
}({}))
