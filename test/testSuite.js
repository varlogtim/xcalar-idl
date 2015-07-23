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

    var fakeMouseup = {type: "mouseup",
                     which: 1};
    var fakeClick = {type: "click",
                     which: 1};
    var fakeMousedown = {type: "mousedown",
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
        TEST MUST BE DONE ON A CLEAN BACKEND!
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
                    }, 5000); // Index should be <2s
                }, 1000);
            }, 1000);
        }

        function flightTestPart3() {
            var $header = $($(".flexWrap.flex-mid input[value='ArrDelay']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .changeDataType");
            $colMenu.mouseover();
            $colMenu.find(".type-integer").trigger(fakeMouseup);
            setTimeout(function() {
                flightTestPart4();
            }, 4000);
        }

        function flightTestPart4() {
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='ArrDelay_integer']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .filter");
            $colMenu.trigger(fakeMouseup);
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
            var editor = RightSideBar.getEditor();
            editor.setValue('def ymd(year, month, day):\n'+
                            '    if int(month) < 10:\n'+
                            '        month = "0" + month\n'+
                            '    if int(day) < 10:\n'+
                            '        day = "0" + day\n'+
                            '    return year + month + day');
            $(".submitSection #udf-fnName").val("ymd");
            $("#udf-fnUpload").click();
            setTimeout(function() {
                flightTestPart6();
            }, 1000);
        }

        function flightTestPart6() {
            $("#alertActions .confirm").click();
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='Year']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .map");
            $colMenu.trigger(fakeMouseup);
            setTimeout(function() {
                $("#categoryList .dropdown .icon").trigger(fakeClick);
                $("#categoryMenu li[data-category='9']").trigger(fakeMouseup);
                $("#functionList .dropdown .icon").trigger(fakeClick);
                $("#functionsMenu li:contains('ymd:ymd')").trigger(fakeMouseup);
                $($(".argumentTable .argument")[0]).val("$Year");
                $($(".argumentTable .argument")[1]).val("$Month");
                $($(".argumentTable .argument")[2]).val("$DayofMonth");
                $($(".argumentTable .argument")[3]).val("YearMonthDay");
                $("#operationsModal .modalBottom .confirm").click();
                setTimeout(function() {
                    flightTestPart7();
                }, 2000);
            }, 1000);

        }

        function flightTestPart7() {
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='Dest']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .joinList");
            $colMenu.trigger(fakeMouseup);
            $("#rightJoin .tableLabel:contains('airport')").trigger(fakeClick);
            $("#rightJoin .columnTab:contains('iata')").trigger(fakeClick);
            setTimeout(function() {
                $("#joinTables").click();
                setTimeout(function() {
                    flightTestPart8();
                }, 2000);
            }, 500);
        }

        function flightTestPart8() {
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='ArrDelay_integer']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .groupby");
            $colMenu.trigger(fakeMouseup);
            $("#functionList .dropdown .icon").trigger(fakeClick);
            $($("#functionsMenu li")[0]).trigger(fakeMouseup);
            $($(".argumentTable .argument")[0]).val("$ArrDelay_integer");
            $($(".argumentTable .argument")[1]).val("$UniqueCarrier");
            $($(".argumentTable .argument")[2]).val("AvgDelay");
            setTimeout(function() {
                $("#operationsModal .modalBottom .confirm").click();
                setTimeout(function() {
                    flightTestPart9();
                }, 2000);
            }, 100);

        }

        function flightTestPart9() {
            var $header = $($("#xcTbodyWrap1 .flexWrap.flex-mid"+
                            " input[value='ArrDelay_integer']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu0 .aggregate");
            $colMenu.trigger(fakeMouseup);
            $("#functionList .dropdown .icon").trigger(fakeClick);
            $($("#functionsMenu li")[1]).trigger(fakeMouseup);
            setTimeout(function() {
                $("#operationsModal .modalBottom .confirm").click();
                TestSuite.pass(deferred, testName, currentTestNumber);
            }, 100);
        }
    }

// ================= ADD TESTS TO ACTIVATE THEM HERE ======================= //
    TestSuite.add(testCases, flightTest, "FlightTest", defaultTimeout,
                  TestCaseEnabled);

// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //
    return (TestSuite);
}(jQuery, {}));
