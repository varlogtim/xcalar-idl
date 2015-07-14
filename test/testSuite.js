window.TestSuite = (function($, TestSuite) {

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 2560000;
    var passes = 0;
    var fails = 0;
    var skips = 0;
    var testCases = new Array();
    var disableIsPass = true;

    TestSuite.start = function(deferred, testNameLocal, currentTestNumberLocal,
                               timeout) {
    }

    TestSuite.printResult = function(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    }

    TestSuite.pass = function(deferred, testName, currentTestNumber)
    {
        if (deferred.state() == "pending") {
            passes++;
            console.log("ok " + currentTestNumber + " - Test \"" + testName +
                        "\" passed");
            deferred.resolve();
        }
    }

    TestSuite.fail = function(deferred, testName, currentTestNumber, reason)
    {
        if (deferred.state() == "pending") {
            fails++;
            console.log("Test " + testName + " failed -- " + reason);
            console.log("not ok " + currentTestNumber + " - Test \"" + testName +
                        "\" failed (" + reason + ")");
            deferred.reject();
        }
    }

    TestSuite.skip = function(deferred, testName, currentTestNumber)
    {
        console.log("====== Skipping " + testName + " ======");
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" disabled # SKIP");
        skips++;
        if (disableIsPass) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    }

    TestSuite.add = function(testCases, testFn, testName, timeout, testCaseEnabled)
    {
        testCases[testCases.length] = {"testFn": testFn,
                                       "testName": testName,
                                       "timeout": timeout,
                                       "testCaseEnabled": testCaseEnabled};
    }

    TestSuite.run = function()
    {
        var initialDeferred = $.Deferred();
        var ii;
        var deferred;
        deferred = initialDeferred;

        // Start chaining the callbacks
        for (ii = 0; ii < testCases.length; ii++) {
            deferred = deferred.then(
                // Need to trap the value of testCase and ii
                (function trapFn(testCase, currentTestNumber) {
                    return function() {
                        var localDeferred = $.Deferred();
                        if (testCase.testCaseEnabled) {
                            console.log("====================Test ", currentTestNumber, " Begin====================");
                            console.log("Testing: ", testCase.testName, "                     ");
                            setTimeout(function() {
                                if (localDeferred.state() == "pending") {
                                    var reason = "Timed out after " + (testCase.timeout / 1000) + " seconds";
                                    TestSuite.fail(localDeferred, testCase.testName, currentTestNumber, reason);
                                }
                            }, testCase.timeout);

                            testCase.testFn(localDeferred, testCase.testName, currentTestNumber);
                        } else {
                            TestSuite.skip(localDeferred, testCase.testName, currentTestNumber);
                        }

                        return localDeferred.promise();
                    }
                })(testCases[ii], ii + 1) // Invoking trapFn
            );
        }

        deferred.fail(function() {
            returnValue = 1;
        });

        deferred.always(function() {
            console.log("# pass", passes);
            console.log("# fail", fails);
            console.log("# skips", skips);
            console.log("==========================================");
            console.log("1.." + testCases.length + "\n");
        });

        // This starts the entire chain
        initialDeferred.resolve();
    }
// ==================== TEST DEFINITIONS GO HERE =========================== //
    function flightTest(deferred, testName, currentTestNumber) {
        /** This test replicates a simple version of Cheng's flight demo
        This tests all major functionality
        It does the following:
        2. Loads 2 datasets (flight and airports)
        3. Maps flight:delay str to int
        4. Filter delay_int by > 0
        5. Upload custom n clause cat pyExec
        6. Run pyExec on year month and day columnes
        7. Join with airports table
        8. Index on airlines
        9. GroupBy average on delay
        10. Aggregate on groupBy table to count number of unique airlines
        */

        var dsName = "flight"+Math.floor(Math.random()*100);
 
        flightTestPart1(dsName);
        function flightTestPart1(dsName) {
            $("#dataStoresTab").click();
            $("#importDataButton").click();
            $("#filePath").val("file:///netstore/users/jerene/flight"+
                               "/airlines_2007.log");
            $("#fileName").val(dsName);
            $("#fileFormat .iconWrapper .icon").click();
            $("#fileFormat li[name='CSV']").click();
            $("#csvPromoteCheckbox .icon").click();
            $("#fieldDelim .icon").click();
            $("#fieldDelim .list li[name='comma']").click();
            $("#importDataSubmit").click();
            setTimeout(function() {
                flightTestPart2(dsName);
            }, 2000); // Load should be <2s
        }
        
        function flightTestPart2(dsName) {
            $("#dataset-"+dsName+" .gridIcon").click();
            $("#selectDSCols .icon").click();
            $("#selectedTable-"+dsName+" li .closeIcon")[0].click();
            $("#selectedTable-"+dsName+" li .closeIcon")[0].click();
            $("#selectedTable-"+dsName+" li .closeIcon")[0].click();
            $("#selectedTable-"+dsName+" li .closeIcon")[0].click();
            $("#selectedTable-"+dsName+" li .closeIcon")[0].click();
            $("#submitDSTablesBtn").click();
            setTimeout(function() {
                flightTestPart3(dsName);
            }, 2000); // Index should be <2s
        }

        function flightTestPart3(dsName) {
            TestSuite.pass(deferred, testName, currentTestNumber);
        }
    }

// ================= ADD TESTS TO ACTIVATE THEM HERE ======================= //
    TestSuite.add(testCases, flightTest, "FlightTest", defaultTimeout,
                  TestCaseEnabled);

// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //
    return (TestSuite);
}(jQuery, {}));
