// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 2 functions:
// buttons
// actionFn
// buttons must return an array of structs. each struct must have a field
// called "buttonText" which populates the text in the button
// each struct must have a fnName field which contains the name of the function
// that will be triggered
// each struct must also have a field called arrayOfFields that is an array of
// requirements for each of the arguments that must be passed into the struct
// actionFn is a function that will get invoked once the user presses any of
// the buttons belonging to the extension
// undoActionFn is a function that will get invoked once the user tries to undo
// an action that belongs to this extension


window.UExtAppRunReap = (function(UExtAppRunReap) {
    UExtAppRunReap.buttons = [{
        "buttonText"   : "Run App",
        "fnName"       : "appRunReap",
        "arrayOfFields": [{
            "type"      : "string",
            "name"      : "App Name",
            "fieldClass": "appName",
            "autofill"  : "blank"
        },
        {
            "type"      : "boolean",
            "name"      : "Run App Globally (All Nodes)",
            "fieldClass": "isGlobal"
        },
        {
            "type"      : "string",
            "name"      : "Input String",
            "fieldClass": "inStr",
            "typeCheck" : {
                "allowEmpty": true
            }
        }]
    }];

    UExtAppRunReap.actionFn = function(funcName) {
        var ext;
        switch (funcName) {
            case "appRunReap":
                ext = new XcSDK.Extension();
                ext.start = appRunReap;
                return ext;
            default:
                return null;
        }
    };

    // This should be changed once support for in-place is added.
    UExtAppRunReap.configParams = {
        "notTableDependent": true
    };

    function appRunReap() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Arguments
        var appName = args.appName;
        var isGlobal = args.isGlobal;
        var inStr = args.inStr;

        // Uncomment when debugging
        // console.log(appName, isGlobal, inStr);

        // Uncomment the following line once full support is
        // added to xiApi.js and extensionApi_Operations.js
        // ext.appRun(appName, isGlobal, inStr)

        // Following line calls function in XcalarThrift
        XcalarAppRun(appName, isGlobal, inStr)
        .then(function(result) {
            var appGroupId = result.output.outputResult.appRunOutput.appGroupId;
            return XcalarAppReap(appName, appGroupId);
        })
        .then(function(result) {
            Alert.error("App Ran!",
                        "Ran and reaped app successfully. Output: " +
                       JSON.stringify(result.output.outputResult.appReapOutput.outStr));
            deferred.resolve();
        })
        .fail(function() {
            Alert.error("App Failed!",
                        "Failed to run or reap app. Error: " +
                       JSON.stringify(arguments));
            deferred.reject();
        });

        return deferred.promise();
    }
    return (UExtAppRunReap);
}({}));
