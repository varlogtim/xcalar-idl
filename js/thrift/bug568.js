// Witness to bug 568
+function(undefined) {
    "use strict";

    Function.prototype.bind = function() {
        var fn = this
        ,   args = Array.prototype.slice.call(arguments)
        ,   obj = args.shift();

        return (function() {
            return (fn.apply(obj, 
                args.concat(Array.prototype.slice.call(arguments))));
        });
    };

    function promiseWrapper(value) {
        var deferred = $.Deferred();
        deferred.resolve(value);
        return (deferred.promise());
    }

    function chainPromises(funcs) {
        if (!funcs || 
            !Array.isArray(funcs) ||
            typeof funcs[0] !== "function") {
            return promiseWrapper(null);
        }
        var head = funcs[0]();
        for (var i = 1; i < funcs.length; i++) {
            head = head.then(funcs[i]);
        }
        return (head);
    }

    

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    function printTestBegin() {
        console.log("====================Test ", currentTestNumber, " Begin====================");
        console.log("                Testing: ", testName, "                     ");
    }

    function printResult(result) {
        console.log(JSON.stringify(result));
    }

    function pass(testName, currentTestNumber)
    {
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" passed");
    }

    function fail(testName, currentTestNumber)
    {
        console.log("not ok " + currentTestNumber + " - Test \"" + testName +
                    "\" failed");
    }

    function skip(testName, currentTestNumber)
    {
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" disabled # SKIP");
    }

    // Test related variables
    var currentTestNumber
    ,   testName
    ,   returnValue;

    var thriftHandle
    ,   loadArgs
    ,   origDataset
    ,   newTableOutput;

    (function initTests() {
        var deferred = $.Deferred();

        currentTestNumber = 0;
        testName          = null;
        returnValue       = 0;

        thriftHandle   = xcalarConnectThrift("localhost", 9090);
        loadArgs       = null;
        origDataset    = null;
        newTableOutput = null;

        deferred.resolve();

        return deferred.promise();
    })()
    .then(function testStartNodes() {
        var deferred = $.Deferred();

        currentTestNumber++;
        testName = "startNodes";

        printTestBegin();

        xcalarStartNodes(thriftHandle, 2)
        .done(function(result) {
            printResult(result);

            pass(testName, currentTestNumber);
            deferred.resolve();
        })
        .fail(function(reason) {
            console.log("testStartNodes failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
            deferred.reject();
        });

        return deferred.promise();
    })
    .then(function testLoad() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "load";

        printTestBegin();

        loadArgs = new XcalarApiDfLoadArgsT();
        loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
        loadArgs.csv.recordDelim = "";
        loadArgs.csv.fieldDelim = "";

        xcalarLoad(thriftHandle, "file:///var/tmp/qa/indexJoin/classes", "classes", DfFormatTypeT.DfTypeJson, 0, loadArgs)
        .done(function(result) {
            printResult(result);

            origDataset = result.dataset.name;

            pass(testName, currentTestNumber);
            deferred.resolve();
        })
        .fail(function(reason) {
            console.log("testLoad failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
            deferred.reject();
        });

        return deferred.promise();
    })
    
    .then(function testIndexDatasetClassId() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "index dataset (class_id)";

        printTestBegin();

        xcalarIndexDataset(thriftHandle,
                           origDataset, "class_id",
                           "classes/class_id")
        .done(function(syncIndexOutput) {
            printResult(syncIndexOutput);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testIndexDatasetClassId failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testJoin1() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "join1";

        printTestBegin();

        xcalarJoin(thriftHandle, "classes/class_id",
                   "classes/class_id",
                   "classes/class_id/nest1",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);

            newTableOutput = result;

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testJoin1 failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testJoin2() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "join2";

        printTestBegin();

        xcalarJoin(thriftHandle, "classes/class_id/nest1",
                   "classes/class_id/nest1",
                   "classes/class_id/nest2",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);

            newTableOutput = result;

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testJoin2 failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testJoin3() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "join3";

        printTestBegin();

        xcalarJoin(thriftHandle, "classes/class_id/nest2",
                   "classes/class_id/nest2",
                   "classes/class_id/nest3",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);

            newTableOutput = result;

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testJoin3 failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testJoin4() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "join4";

        printTestBegin();

        xcalarJoin(thriftHandle, "classes/class_id/nest3",
                   "classes/class_id/nest3",
                   "classes/class_id/nest4",
                   JoinOperatorT.InnerJoin)
        .done(function(result) {
            printResult(result);

            newTableOutput = result;

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testJoin4 failed:", reason);
            
            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testDag() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "dag";

        printTestBegin();

        var promises = [];

        for (var i = 0; i < 100; i ++) {
            promises.push(xcalarDag.bind(this, thriftHandle, newTableOutput.tableName));
        }

        chainPromises(promises)
        .done(function() {
            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testDag failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testBulkDeleteTables() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "bulk delete tables";

        printTestBegin();

        xcalarBulkDeleteTables(thriftHandle, "*")
        .done(function(deleteTablesOutput) {
            printResult(deleteTablesOutput);

            for (var i = 0, delTableStatus = null; i < deleteTablesOutput.numTables; i ++) {
                delTableStatus = deleteTablesOutput.statuses[i];
                console.log("\t" + delTableStatus.table.tableName + ": " +
                            StatusTStr[delTableStatus.status]);
            }

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testBulkDeleteTables failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testDestroyDataset() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "destroy dataset";

        printTestBegin();

        xcalarDestroyDataset(thriftHandle, origDataset)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testDestroyDataset failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });

        return deferred.promise();
    })
    .then(function testShutdown() {
        var deferred = $.Deferred();

        currentTestNumber ++;
        testName = "shutdown";

        printTestBegin();

        xcalarShutdown(thriftHandle)
        .done(function(status) {
            printResult(status);

            pass(testName, currentTestNumber);
        })
        .fail(function(reason) {
            console.log("testShutdown failed:", reason);

            returnValue = 1;
            fail(testName, currentTestNumber);
        })
        .always(function() {
            deferred.resolve();
        });
            
        return deferred.promise();
    })
    .done(function finishTests() {
        console.log("==========================================");

        console.log("1.." + currentTestNumber + "\n")
    })
    .fail(function(reason) {
        console.log("Test failed:", reason); 
    })
    .always(function() {
        phantom.exit(returnValue);
    });

}();