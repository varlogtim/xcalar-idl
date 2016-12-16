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
            "autofill"  : "LogRegCSV",
            "enums"     : [
                "ImgRecCNN",
                "LogRegCSV"
            ]
        },
        {
            "type"      : "number",
            "name"      : "Max Steps",
            "fieldClass": "maxSteps",
            "autofill"  : 12
        },
        {
            "type"      : "string",
            "name"      : "Data Location",
            "fieldClass": "dataLoc",
            "autofill"  : "/home/disenberg/datasets/breastCancer/train"
            //"autofill"  : "/home/disenberg/datasets/imgRec/catsdogscars-preproc/train/"
            //"autofill"  : "Ex: /home/USERNAME/catsdogscars-preproc/train/"
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
            "autofill"  : "LogRegCSV",
            "enums"     : [
                "ImgRecCNN",
                "LogRegCSV"
            ]
        },
        {
            "type"      : "string",
            "name"      : "Unique Train Tag",
            "fieldClass": "uniqueTag",
            "autofill"  : function() {
                return loadLocalTag();
            }
        },
        {
            "type"      : "string",
            "name"      : "Data Location",
            "fieldClass": "dataLoc",
            "autofill"  : "/home/disenberg/datasets/breastCancer/train"
            //"autofill"  : "/home/disenberg/datasets/imgRec/catsdogscars-preproc/test/"
            //"autofill"  : "Ex: /home/USERNAME/catsdogscars-preproc/test/"
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

    function getUniqueTagParams() {
        // TODO: Expose this via API?
        var wb = WorkbookManager.getWorkbook(WorkbookManager.getActiveWKBK());
        var wbId = wb.id;
        // TODO: curUser vs srcUser?
        var curUser = wb.curUser;
        var curTime = Date.now();
        var uniqueObj = {
            "wbId"   : wbId,
            "curUser": curUser,
            "curTime": curTime
        };
        return uniqueObj;
    }

    function isOutputEmpty() {
        //TODO: Fill out
        return true;
    }

    function saveLocalStorage(resultObj) {
        localStorage.setItem("MRuniqueTag", resultObj.uniqueTag);
        localStorage.setItem("MRexposedLoc", resultObj.exposedLoc);
        localStorage.setItem("MRlogDir", resultObj.logDir);
        localStorage.setItem("MRcurTime", resultObj.uniqueObj.curTime);
        localStorage.setItem("MRcurUser", resultObj.uniqueObj.curUser);
        localStorage.setItem("MRwbId", resultObj.uniqueObj.wbId);
        return undefined;
    }

    function loadLocalStorage() {
        var resultObj = {
            "uniqueTag" : localStorage.getItem("MRuniqueTag"),
            "exposedLoc": localStorage.getItem("MRexposedLoc"),
            "logDir"    : localStorage.getItem("MRlogDir"),
            "uniqueObj" : {
                "curTime": localStorage.getItem("MRcurTime"),
                "curUser": localStorage.getItem("MRcurUser"),
                "wbId"   : localStorage.getItem("MRwbId")
            }
        };
        return resultObj;
    }

    function loadLocalTag() {
        return localStorage.getItem("MRuniqueTag");
    }


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
        var resultFormat = args.resultFormat;
        var maxSteps = args.maxSteps;
        var dataDir = args.dataLoc;
        var uniqueObj = getUniqueTagParams();

        var inStrObj = {
            "func"        : func,
            "algorithm"   : algorithm,
            "resultFormat": resultFormat,
            "maxSteps"    : maxSteps,
            // In the streaming version, dataDir will be changed to
            // srcTable or similar
            "dataDir"     : dataDir,
            "uniqueObj"   : uniqueObj
        };
        var inStr =  JSON.stringify(inStrObj);

        // Variables that will be set in the following promise handler
        // that need to be in this scope.
        var newTableName;

        // Kick off tensorflow call
        XcalarAppRun(appName, isGlobal, inStr)
        .then(function(result) {
            // Get tensorflow results
            // var appGroupId = result.appGroupId;
            var appGroupId = result.appGroupId;
            return XcalarAppReap(appName, appGroupId);
        })
        .then(function(result) {
            // Show tensorflow finished learning correctly
            // Kick off loading results as dataset and into XI
            var innerParsed;
            try {
                var outerParsed = JSON.parse(result.outStr);
                // TODO: implement and test master node specification,
                // e.g. if outerParsed[0] isn't the one we want.
                innerParsed = JSON.parse(outerParsed[0]);
            } catch (err) {
                deferred.reject("Failed to parse extension output.");
                // When debugging, uncomment following and comment above.
                // deferred.reject(err);
            }
            var uniqueTag = innerParsed.uniqueTag;
            // Exposed results are here
            var exposedLoc = innerParsed.exposedLoc;
            // Location of statefile for test is here
            var logDir = innerParsed.logDir;

            // console.log(JSON.stringify(result.outStr));

            Alert.error("Extension Ran!",
                        "Successfully trained model. Unique Tag:\n" + String(uniqueTag));

            saveLocalStorage(innerParsed);

            console.log(innerParsed);

            // This one call uses the latest API
            var dsArgs = {
                "url"          : "file://" + exposedLoc + "/",
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
        .then(function(dsNameLoaded) {
            newTableName = ext.createTableName(dsNameLoaded);
            return ext.indexFromDataset(dsNameLoaded, newTableName, "tf");
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
        var resultFormat = args.resultFormat;
        var dataDir = args.dataLoc;
        var uniqueTag = args.uniqueTag;

        var inStrObj = {
            "func"        : func,
            "algorithm"   : algorithm,
            "resultFormat": resultFormat,
            "dataDir"     : dataDir,
            "uniqueTag"   : uniqueTag
        };
        var inStr = JSON.stringify(inStrObj);

        // console.log(appName, isGlobal, inStr);

        // Variables that will be set in the following promise handler
        var newTableName;

        // Kick off tensorflow call
        XcalarAppRun(appName, isGlobal, inStr)
        .then(function(result) {
            // Get tensorflow results
            // var appGroupId = result.appGroupId;
            var appGroupId = result.appGroupId;
            return XcalarAppReap(appName, appGroupId);
        })
        .then(function(result) {
            // Show tensorflow finished learning correctly
            // Kick off loading results as dataset and into XI
            var innerParsed;
            try {
                // var outerParsed = JSON.parse(result.outStr);
                var outerParsed = JSON.parse(result.outStr);
                // TODO: ensure that if some node has empty output,
                // continue to search around until find node w/ full output
                // Not necessary until set up tf app scheduler
                innerParsed = JSON.parse(outerParsed[0]);
            } catch (err) {
                deferred.reject("Failed to parse extension output.");
                // When debugging, uncomment following and comment above.
                // deferred.reject(err);
            }
            var uniqueTag = innerParsed.uniqueTag;
            // Exposed results are here
            var exposedLoc = innerParsed.exposedLoc;
            // Location of statefile for test is here
            var logDir = innerParsed.logDir;

            // This denotes whether or not deployment is all nodes on 1 machine
            // or one node per machine.  Load must be called differently
            var isGlobalVisible = innerParsed.isGlobalVisible;
            //TODO: check if this is undefined or merely false
            var prefix;

            if (isGlobalVisible) {
                prefix = "nfs://";
            }
            else {
                prefix = "file://";
            }

            // console.log(uniqueTag, exposedLoc, logDir);
            // console.log(JSON.stringify(result.outStr));
            Alert.error("Extension Ran!",
                        "Successfully tested model. Unique Tag:\n" + String(uniqueTag));

            // This one call uses the latest API
            var dsArgs = {
                "url"          : prefix + exposedLoc,
                "isRecur"      : true,
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
        .then(function(dsNameLoaded) {
            newTableName = ext.createTableName(dsNameLoaded);
            return ext.indexFromDataset(dsNameLoaded, newTableName, "tf");
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


