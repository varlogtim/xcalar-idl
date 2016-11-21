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
window.UExtTF = (function(UExtTF) {
    UExtTF.buttons = [{
        "buttonText"   : "TF Train",
        "fnName"       : "tfTrain",
        "arrayOfFields": [{
            "type"      : "string",
            "name"      : "Dataset Name",
            "fieldClass": "dsName",
            "autofill"  : "trainResults"
        },
        {
            "type"      : "string",
            "name"      : "Algorithm",
            "fieldClass": "algorithm",
            "autofill"  : "ImgRecCNN"
        },
        {
            "type"      : "string",
            "name"      : "Log Dir",
            "fieldClass": "logDir",
            "autofill"  : "/tmp/tensorflow/app/"
        },
        {
            "type"      : "number",
            "name"      : "Max Steps",
            "fieldClass": "maxSteps"
        },
        {
            "type"      : "string",
            "name"      : "Data Location",
            "fieldClass": "dataLoc",
            "autofill"  : "Ex: ~/catsdogscars-preproc/train/"
        }]
    },
    {

        "buttonText"   : "TF Test",
        "fnName"       : "tfTest",
        "arrayOfFields": [{
            "type"      : "string",
            "name"      : "Dataset Name",
            "fieldClass": "dsName",
            "autofill"  : "testResults"
        },
        {
            "type"      : "string",
            "name"      : "Algorithm",
            "fieldClass": "algorithm",
            "autofill"  : "ImgRecCNN"
        },
        {
            "type"      : "string",
            "name"      : "Log Dir",
            "fieldClass": "logDir",
            "autofill"  : "/tmp/tensorflow/app/"
        },
        {
            "type"      : "string",
            "name"      : "Data Location",
            "fieldClass": "dataLoc",
            "autofill"  : "Ex: ~/catsdogscars-preproc/test/"
        }]
    }];

    UExtTF.configParams = {
        "notTableDependent": true
    };

    UExtTF.actionFn = function(funcName) {
        var ext;
        switch (funcName) {
            case ("tfTrain"):
                ext = new XcSDK.Extension();
                ext.start = tfTrain;
                return ext;
            case ("tfTest"):
                ext = new XcSDK.Extension();
                ext.start = tfTest;
                return ext;
            default:
                return null;
        }
    };

    function tfTrain() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Hardcoded
        var isGlobal = true;
        var appName = "tfapp";
        var func = "tftrain";

        // Parsed
        var dsName = args.dsName;
        var algorithm = args.algorithm;
        var logDir = args.logDir;
        var resultFormat = args.resultFormat;
        var maxSteps = args.maxSteps;
        var dataDir = args.dataLoc;

        var inStrObj = {
            "func"        : func,
            "algorithm"   : algorithm,
            "logDir"      : logDir,
            "resultFormat": resultFormat,
            "maxSteps"    : maxSteps,
            "dataDir"     : dataDir
        };
        var inStr =  JSON.stringify(inStrObj);

        // console.log(appName, isGlobal, inStr);

        // Variables that will be set in the following promise handler
        // that need to be in this scope.
        var newTableName;

        // Kick off tensorflow call
        XcalarAppRun(appName, isGlobal, inStr)
        .then(function(result) {
            // Get tensorflow results
            var appGroupId = result.output.outputResult.appRunOutput.appGroupId;
            return XcalarAppReap(appName, appGroupId);
        })
        .then(function(result) {
            // Show tensorflow finished learning correctly
            // Kick off loading results as dataset and into XI
            var innerParsed;
            try {
                var outerParsed = JSON.parse(result.output.outputResult.appReapOutput.outStr);
                innerParsed = JSON.parse(outerParsed[0]);
            } catch (err) {
                deferred.reject("Failed to parse extension output.");
                // When debugging, uncomment following and comment above.
                // deferred.reject(err);
            }
            uniqueTag = innerParsed.uniqueTag;
            // Exposed results are here
            exposedLoc = innerParsed.exposedLoc;
            // Location of statefile for test is here
            logDir = innerParsed.logDir;

            // console.log(uniqueTag, exposedLoc, logDir);
            // console.log(JSON.stringify(result.output.outputResult.appReapOutput.outStr));

            Alert.error("Extension Ran!",
                        "Successfully trained model. Unique Tag:\n" + String(uniqueTag));

            // This one call uses the latest API
            var dsArgs = {
                "url"          : "nfs://" + exposedLoc,
                "isRecur"      : false,
                "maxSampleSize": 200000,
                "skipRows"     : false,
                "isRegex"      : false
            };

            var formatArgs = {
                "format"     : "CSV",
                "fieldDelim" : ",",
                "recordDelim": "\n",
                "hasHeader"  : true,
                "quoteChar"  : '"'
            };
            return ext.load(dsArgs, formatArgs, dsName);
        })
        .then(function() {
            newTableName = ext.createTableName(dsName);
            return ext.indexFromDataset(dsName, newTableName, "tf");
        })
        .then(function() {
            var newTable = ext.createNewTable(newTableName);
            newTable.addCol(new XcSDK.Column("tf::predicted_label",
                                             "string"));
            newTable.addCol(new XcSDK.Column("tf::actual_label",
                                             "string"));
            newTable.addCol(new XcSDK.Column("tf::file_name", "string"));
            return newTable.addToWorksheet();
        })
        .then(function() {
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


    function tfTest() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Hardcoded
        var isGlobal = true;
        var appName = "tfapp";
        var func = "tftest";

        // Parsed
        var dsName = args.dsName;
        var algorithm = args.algorithm;
        var logDir = args.logDir;
        var resultFormat = args.resultFormat;
        var dataDir = args.dataLoc;

        var inStrObj = {
            "func"        : func,
            "algorithm"   : algorithm,
            "logDir"      : logDir,
            "resultFormat": resultFormat,
            "dataDir"     : dataDir
        };
        var inStr = JSON.stringify(inStrObj);

        // console.log(appName, isGlobal, inStr);

        // Variables that will be set in the following promise handler
        var newTableName;

        // Kick off tensorflow call
        XcalarAppRun(appName, isGlobal, inStr)
        .then(function(result) {
            // Get tensorflow results
            var appGroupId = result.output.outputResult.appRunOutput.appGroupId;
            return XcalarAppReap(appName, appGroupId);
        })
        .then(function(result) {
            // Show tensorflow finished learning correctly
            // Kick off loading results as dataset and into XI
            var innerParsed;
            try {
                var outerParsed = JSON.parse(result.output.outputResult.appReapOutput.outStr);
                innerParsed = JSON.parse(outerParsed[0]);
            } catch (err) {
                deferred.reject("Failed to parse extension output.");
                // When debugging, uncomment following and comment above.
                // deferred.reject(err);
            }
            uniqueTag = innerParsed.uniqueTag;
            // Exposed results are here
            exposedLoc = innerParsed.exposedLoc;
            // Location of statefile for test is here
            logDir = innerParsed.logDir;

            // console.log(uniqueTag, exposedLoc, logDir);
            // console.log(JSON.stringify(result.output.outputResult.appReapOutput.outStr));
            Alert.error("Extension Ran!",
                        "Successfully tested model. Unique Tag:\n" + String(uniqueTag));

            // This one call uses the latest API
            var dsArgs = {
                "url"          : "nfs://" + exposedLoc,
                "isRecur"      : false,
                "maxSampleSize": 200000,
                "skipRows"     : false,
                "isRegex"      : false
            };

            var formatArgs = {
                "format"     : "CSV",
                "fieldDelim" : ",",
                "recordDelim": "\n",
                "hasHeader"  : true,
                "quoteChar"  : '"'
            };
            return ext.load(dsArgs, formatArgs, dsName);
        })
        .then(function() {
            newTableName = ext.createTableName(dsName);
            return ext.indexFromDataset(dsName, newTableName, "tf");
        })
        .then(function() {
            var newTable = ext.createNewTable(newTableName);
            newTable.addCol(new XcSDK.Column("tf::predicted_label",
                                             "string"));
            newTable.addCol(new XcSDK.Column("tf::actual_label",
                                             "string"));
            newTable.addCol(new XcSDK.Column("tf::file_name", "string"));
            return newTable.addToWorksheet();
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            Alert.error("Extension Failed!",
                        "Failed to run test extension. Error: " +
                       JSON.stringify(arguments));
            deferred.reject();
        });

        return deferred.promise();

    }

    return (UExtTF);
}({}));


