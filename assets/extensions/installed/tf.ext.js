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
window.UExtTF  = (function(UExtTF) {
    UExtTF.buttons = [{
        // XXX the following fields are not really read into the py functions
        "buttonText"    : "Train",
        "fnName"        : "train",
        "arrayOfFields" : [{
            "type"        : "string",
            "name"        : "Data location",
            "fieldClass"  : "dataLoc"
        },
        {
            "type"        : "string",
            "name"        : "Model output location",
            "fieldClass"  : "logDir"
        },
        {
            "type"        : "number",
            "name"        : "Iterations to run",
            "fieldClass"  : "maxSteps",
            "typeCheck"   : {
                "integer" : true,
                "min"     : 2
            }
        },
        {
            "type"        : "number",
            "name"        : "Learning rate",
            "fieldClass"  : "learnRate",
            "typeCheck"   : {
                "integer" : false,
                "min"     : 0.0,
                "max"     : 1.0
            }

        }]
    },
    {
        "buttonText"    : "Test",
        "fnName"        : "test",
        "arrayOfFields"    : [{
            "type"        : "column",
            "name"        : "Column Name",
            "fieldClass"  : "modelLoc"
        }]
    }];

    UExtTF.configParams = {
        "notTableDependent": true
    };

    UExtTF.actionFn = function(funcName) {
        var ext;
        switch (funcName) {
            case ("train"):
                ext = new XcSDK.Extension();
                ext.start = train;
                return ext;
            case ("test"):
                ext = new XcSDK.Extension();
                ext.start = test;
                return ext;
            default:
                return null;
        }
    };

    function train() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Arguments
        var loc = args.dataLoc;
        var dir = args.logDir;
        var iter = args.maxSteps;
        var rate = args.learnRate;

        console.log(loc, dir, iter, rate);
        var newTableName;

        var dsName = ext.getUsername() + ".trainDS-" +
                     Math.ceil(Math.random()*10000);
        var loadArgs = {"url": "nfs:///netstore/datasets/sp500.csv"};
        var formatArgs = {"format": "CSV",
                          "fieldDelim": ",",
                          "hasHeader": true,
                          "moduleName": "tf",
                          "funcName": "tftrain"};
        ext.load(loadArgs, formatArgs, dsName)
        .then(function() {
            newTableName = ext.createTableName("trainTable");
            return ext.indexFromDataset(dsName, newTableName, "trained");
        })
        .then(function() {
            var newTable = ext.createNewTable(newTableName);
            newTable.addCol(new XcSDK.Column("trained::Predicted Label",
                                             "string"));
            newTable.addCol(new XcSDK.Column("trained::Actual Label",
                                             "string"));
            return newTable.addToWorksheet();
        })
        .then(function() {
            Alert.error("Training Done!",
                        "Training is done. Your model is located at: "+
                        "file:///tmp/tensorflow/logs/MNIST/trainLogs");
        })
        .fail(function() {
            Alert.error("Training Failed",
                        "Training failed. Error: " + JSON.stringify(arguments));
            deferred.reject();
        });

        return deferred.promise();

    }

    function test() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var args = ext.getArgs();

        // Arguments
        var modelLoc = args.modelLoc;

        var dsName = ext.getUsername() + ".testDS-" +
                     Math.ceil(Math.random() * 10000);

        var loadArgs = {"url": "nfs:///datasets/board/imgRec/houseOrNot-preproc/testHouses/splitSpec/split0"};
        var formatArgs = {"format": "CSV",
                          "fieldDelim": "|",
                          "hasHeader": true,
                          "moduleName": "tf",
                          "funcName": "testUDF"};
        ext.load(loadArgs, formatArgs, dsName)
        .then(function() {
            newTableName = ext.createTableName("tfTable");
            return ext.indexFromDataset(dsName, newTableName, "tf");
        })
        .then(function() {
            var newTable = ext.createNewTable(newTableName);
            newTable.addCol(new XcSDK.Column("tf::predicted_label",
                                             "string"));
            // newTable.addCol(new XcSDK.Column("tf::actual_label", "string"));
            newTable.addCol(new XcSDK.Column("tf::file_name", "string"));
            return newTable.addToWorksheet();
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            Alert.error("Testing Failed",
                        "Testing failed. Error: " + JSON.stringify(arguments));
            deferred.reject();
        });

        return deferred.promise();

    }

    return (UExtTF);
}({}));


