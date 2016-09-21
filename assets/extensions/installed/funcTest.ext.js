// module name must start with "UExt"

window.UExtFuncTest = (function(UExtFuncTest) {
    /*
     * Note of UExtFuncTest.buttons:
     * 1. it must be an array, each element is an object,
     *    which specify one function,
     *    one extension can have unlimited functions
     *
     * 2. Fields on object:
     *      buttonText: the extension function name that display on XI
     *      fnName: the function name, will pass into UExtFuncTest.actionFn
     *      arrayOfFields: an array to specify the buttons on the extension function
     *
     * 3. Fields on arrayOfFields attribute:
     *      type: type of the arg, can be column, string, number or boolean
     *      name: the button name, which will display on XI,
     *      fieldClass: Use this name to find the arg in ext obj
     *      typeCheck: object to specify how to check the arg
     *          if type is column, columnType can strict the column's type,
     *          if type is number, min and max can strict the range
     *          and integer attr can strict the number is integer only
     */
    UExtFuncTest.buttons = [{
        "buttonText"   : "Start Function Test",
        "fnName"       : "startFuncTest",
        "arrayOfFields": [{
            "type"      : "boolean",
            "name"      : "Parallel",
            "fieldClass": "parallel"
        },
        {
            "type"      : "boolean",
            "name"      : "Run All Tests",
            "fieldClass": "runAllTests"
        },
        {
            "type"      : "string",
            "name"      : "Name Pattern",
            "fieldClass": "namePattern"
        }]
    },
    {
        "buttonText"   : "List Function Test",
        "fnName"       : "listFuncTest",
        "arrayOfFields": [{
            "type"      : "string",
            "name"      : "Pattern List (comma seperated)",
            "fieldClass": "namePattern",
            "autofill"  : "*"
        }]
    }];

    // UExtFuncTest.actionFn must reutrn a XcSDK.Extension obj or null
    UExtFuncTest.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch(functionName) {
            case "startFuncTest":
                return (startFuncTest());
            case "listFuncTest":
                return (listFuncTest());
            default:
                return (null);
        }
    };

    UExtFuncTest.configParams = {
        "notTableDependent": true
    };

    // Thrift call wrappers
    function XcalarStartFuncTest(parallel, runAllTests, testNamePatterns) {
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return PromiseHelper.resolve(null);
        }
        var deferred = jQuery.Deferred();
        xcalarApiStartFuncTest(tHandle, parallel, runAllTests, testNamePatterns)
        .then(function(output) {
            deferred.resolve(output);
        })
        .fail(function(error) {
            console.error("Start func test failed");
            deferred.reject(thriftError);
        });
        return (deferred.promise());
    }

    function XcalarListFuncTests(namePattern) {
        if ([null, undefined].indexOf(tHandle) !== -1) {
            return PromiseHelper.resolve(null);
        }
        var deferred = jQuery.Deferred();

        xcalarApiListFuncTest(tHandle, namePattern)
        .then(function(output) {
            deferred.resolve(output);
        })
        .fail(function(error) {
            console.error("List func test failed");
            deferred.reject(error);
        });
        return (deferred.promise());
    }

    function startFuncTest() {
        var ext = new XcSDK.Extension();
        ext.start = function() {
            // seach "js promise" online if you do not understand it
            // check promiseApi.js to see the api.
            var deferred = XcSDK.Promise.deferred();

            // JS convention, rename this to self in case of scoping issue
            var self = this;
            var namePattern = self.getArgs().namePattern.split(",");
            var parallel = self.getArgs().parallel;
            var runAllTests = self.getArgs().runAllTests;

            namePattern = namePattern.map(function(e) {
                return e.trim();
            });

            // check extensionApi_Operations.js to see the api signature.
            XcalarStartFuncTest(parallel, runAllTests, namePattern)
            .then(function(ret) {
                console.log(ret);
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    function listFuncTest() {
        var ext = new XcSDK.Extension({"noTable": true});
        ext.start = function() {
            // seach "js promise" online if you do not understand it
            // check promiseApi.js to see the api.
            var deferred = XcSDK.Promise.deferred();

            // JS convention, rename this to self in case of scoping issue
            var self = this;
            var namePattern = self.getArgs().namePattern;

            // check extensionApi_Operations.js to see the api signature.
            XcalarListFuncTests(namePattern)
            .then(function(ret) {
                console.log(ret);
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtFuncTest;
}({}));