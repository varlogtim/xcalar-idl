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

    var fakeClick = {type: "mouseup",
                     which: 1};
    var fakeEnter = {type: "keypress",
                     which: 13};

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
                    return (function() {
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
                    });
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
        TEST MUST BE DONE ON A CLEAN WORKSHEET!
        It does the following:
        2. Loads 2 datasets (flight and airports)
        3. Maps flight:delay str to int
        4. Filter delay_int by > 0
        5. Upload custom n clause cat pyExec
        6. Run pyExec on year month and day columns
        7. Join with airports table
        8. Index on airlines
        9. GroupBy average on delay
        10. Aggregate on groupBy table to count number of unique airlines
        */

        var dsName1 = "flight"+Math.floor(Math.random()*100);
        var dsName2 = "airport"+Math.floor(Math.random()*100);

        flightTestPart1(dsName1, dsName2);
        function flightTestPart1(dsName1, dsName2) {
            $("#dataStoresTab").click();

            // Import flight dataset
            $("#importDataButton").click();
            $("#filePath").val("file:///netstore/users/jerene/flight"+
                               "/airlines_2007.log");
            $("#fileName").val(dsName1);
            $("#fileFormat .iconWrapper .icon").click();
            $("#fileFormat li[name='CSV']").click();
            $("#csvPromoteCheckbox .icon").click();
            $("#fieldDelim .icon").click();
            $("#fieldDelim .list li[name='comma']").click();
            $("#importDataSubmit").click();
            
            $("#importDataButton").click();
            $("#filePath").val("file:///netstore/users/jerene/flight"+
                               "/airports.csv");
            $("#fileName").val(dsName2);
            $("#fileFormat .iconWrapper .icon").click();
            $("#fileFormat li[name='CSV']").click();
            $("#fieldDelim .icon").click();
            $("#fieldDelim .list li[name='comma']").click();
            $("#importDataSubmit").click();
            setTimeout(function() {
                flightTestPart2(dsName1, dsName2);
            }, 6000); // Load should be <2s
         }
        
         function flightTestPart2(dsName1, dsName2) {
            $("#dataset-"+dsName2+" .gridIcon").click();
            setTimeout(function() {
                $("#selectDSCols .icon").click();
                $("#dataset-"+dsName1+" .gridIcon").click();
                setTimeout(function() {
                    $("#selectDSCols .icon").click();
                    console.log(dsName1);
                    $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                    $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                    $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                    $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                    $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                    $("#submitDSTablesBtn").click();
                    setTimeout(function() {
                        flightTestPart3();
                    }, 2000); // Index should be <2s
                }, 1000);
            }, 1000);
        }

        function flightTestPart3() {
            var $header = $($(".flexWrap.flex-mid input[value='ArrDelay']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").mousedown();
            var $colMenu = $("#colMenu0 .changeDataType");
            $colMenu.mouseover();
            $colMenu.find(".type-integer").trigger(fakeClick);
            setTimeout(function() {
                flightTestPart4();
            }, 4000);
        }

        function flightTestPart4() {
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='ArrDelay_integer']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").mousedown();
            var $colMenu = $("#colMenu0 .filter");
            $colMenu.trigger(fakeClick);
            setTimeout(function() {
                $("#functionList input").val("gt");
                $("#functionList input").trigger(fakeEnter);
                $($(".argumentTable tr")[2]).find("input").val("0");
                $("#operationsModal .modalBottom .confirm").click();
                setTimeout(function() {
                    flightTestPart5();
                }, 5000);
            }, 1000);
        }

       function flightTestPart5() {
            $("#udfBtn").click();
            $("#udf-tabs div[data-tab='udf-fnSection'] .label").click();
            var textArea = $("#udf-codeArea")[0];
            var editor = CodeMirror.fromTextArea(textArea);
            editor.setValue('def ymd(year, month, day):\n'+
                            '    if int(month) < 10:\n'+
                            '        month = "0" + month\n'+
                            '    if int(day) < 10:\n'+
                            '        day = "0" + day\n'+
                            '    return year + month + day');

            TestSuite.pass(deferred, testName, currentTestNumber);
        }
    }

// ================= ADD TESTS TO ACTIVATE THEM HERE ======================= //
    TestSuite.add(testCases, flightTest, "FlightTest", defaultTimeout,
                  TestCaseEnabled);

// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //
    return (TestSuite);
}(jQuery, {}));
