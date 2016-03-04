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
    var disableIsPass = true;
    var startTime = 0;
    var totTime = 0;
    var testCases = [];

    // For assert to use
    var curTestNumber;
    var curTestName;
    var curDeferred;


    // Globals
    var dfgName;
    var schedName;
    var paramName;
    var fileName;

    TestSuite.printResult = function(result) {
        if (result) {
            console.log(JSON.stringify(result));
        }
    };

    TestSuite.pass = function(deferred, testName, currentTestNumber) {
        if (deferred.state() === "pending") {
            passes++;
            var d = new Date();
            var milli = d.getTime() - startTime;

            console.log("ok ", currentTestNumber + " - Test \"" + testName +
                        "\" passed");
            console.log("Time taken: " + milli / 1000 + "s");
            totTime += milli;
            deferred.resolve();
        } else {
            console.error("Invalid state", deferred.state());
        }
    };

    TestSuite.fail = function(deferred, testName, currentTestNumber, reason) {
        if (deferred.state() === "pending") {
            fails++;
            console.warn("Test " + testName + " failed -- " + reason);
            console.warn("not ok " + currentTestNumber + " - Test \"" +
                         testName + "\" failed (" + reason + ")");
            deferred.reject();
        } else {
            console.error("Invalid state", deferred.state());
        }
    };

    TestSuite.skip = function(deferred, testName, currentTestNumber) {
        console.log("====== Skipping " + testName + " ======");
        console.log("ok " + currentTestNumber + " - Test \"" + testName +
                    "\" disabled # SKIP");
        skips++;

        if (disableIsPass) {
            deferred.resolve();
        } else {
            deferred.reject();
        }
    };

    TestSuite.add = function(testFn, testName, timeout, testCaseEnabled) {
        testCases.push({
            "testFn"         : testFn,
            "testName"       : testName,
            "timeout"        : timeout,
            "testCaseEnabled": testCaseEnabled
        });
    };

    // this is for unit test
    TestSuite.unitTest = function() {
        // free this session and then run unit test
        freeAllResultSetsSync()
        .then(Support.releaseSession)
        .then(function() {
            removeUnloadPrompt();
            window.location.href = paths.testAbsolute;
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    TestSuite.run = function(hasAnimation) {
        var initialDeferred = jQuery.Deferred();
        var deferred = initialDeferred;
        var minModeCache = gMinModeOn;

        // XXX use min mode for testing to get around of
        // animation crash test problem
        // may have better way
        if (hasAnimation) {
            gMinModeOn = false;
        } else {
            gMinModeOn = true;
        }

        // Start chaining the callbacks
        for (var ii = 0; ii < testCases.length; ii++) {
            deferred = deferred.then(
                // Need to trap the value of testCase and ii
                (function trapFn(testCase, currentTestNumber) {
                    return (function() {
                        var localDeferred = jQuery.Deferred();
                        if (testCase.testCaseEnabled) {
                            console.log("====================Test ",
                            currentTestNumber, " Begin====================");
                            console.log("Testing: ", testCase.testName, "                     ");
                            setTimeout(function() {
                                if (localDeferred.state() === "pending") {
                                    var reason = "Timed out after " +
                                         (testCase.timeout / 1000) + " seconds";
                                    TestSuite.fail(localDeferred,
                                                   testCase.testName,
                                                   currentTestNumber,
                                                   reason);
                                }
                            }, testCase.timeout);

                            startTime = new Date().getTime();
                            curDeferred = localDeferred;
                            curTestName = testCase.testName;
                            curTestNumber = currentTestNumber;

                            testCase.testFn(localDeferred, testCase.testName,
                                            currentTestNumber);
                        } else {
                            TestSuite.skip(localDeferred, testCase.testName,
                                           currentTestNumber);
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
            var timeMsg = "";
            var oldTime = "";
            if (fails === 0 && passes > 5) {
                var bestTime = localStorage.time || 1000;
                bestTime = parseFloat(bestTime);
                if ((totTime / 1000) < bestTime) {
                    localStorage.time = totTime / 1000;
                    timeMsg = " New best time!";
                    if (bestTime === 1000) {
                        oldTime = " Old time: N/A";
                    } else {
                        oldTime = " Old time: " + bestTime + "s.";
                    }
                } else {
                    if (bestTime !== 1000) {
                        oldTime = " Current best time: " + bestTime +
                                  "s";
                    }
                }
            }
            var alertMsg = "Passes: " + passes + ", Fails: " + fails +
                            ", Time: " +
                            totTime / 1000 + "s." + timeMsg + oldTime;
            console.log(alertMsg); // if pop ups are disabled
            alert(alertMsg);
            gMinModeOn = minModeCache;
        });

        // This starts the entire chain
        initialDeferred.resolve();
    };

    function assert(statement) {
        if (!statement) {
            console.log("Assert failed!");
            TestSuite.fail(curDeferred, curTestName, curTestNumber);
        }
    }

    // elemSelectors can be a string or array of element selectors
    // example: ".xcTable" or ["#xcTable-ex1", "#xcTable-ex2"]
    function checkExists(elemSelectors, timeLimit, options) {
        var deferred = jQuery.Deferred();
        timeLimit = timeLimit || 10000;
        options = options || {};

        var intervalTime = 100;
        var timeElapsed = 0;
        var notExists = options.notExists; // if true, we're actualy doing a
        // check to make sure the element DOESN"T exist
        var optional = options.optional; // if true, existence of element is
        // optional and we return deferred.resolve regardless

        if (typeof elemSelectors === "string") {
            elemSelectors = [elemSelectors];
        }

        var caller = checkExists.caller.name;

        var interval = setInterval(function() {
            var numItems = elemSelectors.length;
            var allElemsPresent = true;
            var $elem;
            for (var i = 0; i < numItems; i++) {
                $elem = $(elemSelectors[i]);
                if (options.notExist) {
                    if ($elem.length !== 0) {
                        allElemsPresent = false;
                        break;
                    }
                } else if ($elem.length === 0) {
                    allElemsPresent = false;
                    break;
                }
            }
            if (allElemsPresent) {
                clearInterval(interval);
                deferred.resolve(true);
            } else if (timeElapsed >= timeLimit) {
                var error = "time limit of " + timeLimit +
                            "ms exceeded in function: " + caller;
                clearInterval(interval);
                if (!optional) {
                    console.log(elemSelectors, options);
                    console.warn(error);
                    deferred.reject(error);
                } else {
                    deferred.resolve();
                }
            }
            timeElapsed += intervalTime;
        }, intervalTime);

        return (deferred.promise());
    }

    function randInt(numDigits) {
        if (numDigits) {
            return (Math.floor(Math.random() * Math.pow(10, numDigits)));
        }
        return (Math.floor(Math.random() * 10000));
    }
// ========================= COMMON ACTION TRIGGERS ======================== //
    function trigOpModal(tableId, columnName, funcClassName, whichModal) {
        var $header = $("#xcTbodyWrap-" + tableId)
                       .find(".flexWrap.flex-mid input[value='" + columnName +
                       "']").eq(0);
        $header.parent().parent().find(".flex-right .innerBox").click();

        var $colMenu = $("#colMenu ." + funcClassName);
        $colMenu.trigger(fakeEvent.mouseup);

        if (whichModal === "join") {
            return (checkExists("#joinModal:visible"));
        } else {
            return (checkExists("#operationsModal:visible"));
        }
    }
// ======================== TEST DEFINITIONS GO HERE ======================= //
    function getDSIcon(dsName) {
        return '#exploreView .grid-unit[data-dsname="' +
                            dsName + '"]:not(.inactive)';
    }

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

        var dsName1 = "flight" + randInt();
        var dsName2 = "airport" + randInt();

        flightTestPart1(dsName1, dsName2);

        // Import dataset
        function flightTestPart1(dsName1, dsName2) {
            $("#dataStoresTab").click();

            // Import flight dataset
            $("#importDataButton").click();
            $("#fileBrowserModal .close").click();
            $("#filePath").val("file://"+testDataLoc+"flight" +
                               "/airlines_2007.csv");
            $("#fileName").val(dsName1);
            $("#fileFormat .iconWrapper .icon").click();
            $("#fileFormat li[name='CSV']").click();
            $("#promoteHeaderCheckbox .icon").click();
            $("#fieldDelim .icon").click();
            $("#fieldDelim .list li[name='comma']").click();
            $("#importDataSubmit").click();
            
            // import airports dataset
            $("#importDataButton").click();
            $("#fileBrowserModal .close").click();
            $("#filePath").val("file://"+testDataLoc+"flight" +
                               "/airports.csv");
            $("#fileName").val(dsName2);
            $("#fileFormat .iconWrapper .icon").click();
            $("#fileFormat li[name='CSV']").click();
            $("#fieldDelim .icon").click();
            $("#fieldDelim .list li[name='comma']").click();
            $("#importDataSubmit").click();

            var ds1Icon = getDSIcon(dsName1);
            var ds2Icon = getDSIcon(dsName2);

            checkExists([ds1Icon, ds2Icon])
            .then(function() {
                flightTestPart2(dsName1, dsName2);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart1");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Select columns in dataset and send to worksheet
        function flightTestPart2(dsName1, dsName2) {
            var $grid1 = $(getDSIcon(dsName1));
            var dsId1  = $grid1.data("dsid");
            var $grid2 = $(getDSIcon(dsName2));
            var dsId2  = $grid2.data("dsid");

            $grid2.find(".gridIcon").click();
            checkExists('#worksheetTable[data-dsid="' + dsId2 + '"]')
            .then(function() {
                $("#selectDSCols .icon").click();
                $grid1.find(".gridIcon").click();
                return (checkExists('#worksheetTable[data-dsid="' +
                                    dsId1 + '"]'));
            })
            .then(function() {
                $("#selectDSCols .icon").click();
                // click on closeIcon on datacart not work
                // since it has animation that dealy the display
                $("#worksheetTable th .header .editableHead").slice(0, 5)
                                                             .click();
                $("#submitDSTablesBtn").click();

                var header = ".xcTable .flexWrap.flex-mid" +
                             " input[value='ArrDelay']:eq(0)";
                return (checkExists(header));
            })
            .then(function() {
                flightTestPart3();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart2");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Change column type
        function flightTestPart3() {

            var $header = $($(".flexWrap.flex-mid input[value='ArrDelay']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();

            var $colMenu = $("#colMenu .changeDataType");
            var $colSubMenu = $('#colSubMenu');
            $colMenu.mouseover();
            $colSubMenu.find(".changeDataType .type-integer")
                       .trigger(fakeEvent.mouseup);
            checkExists(".flexWrap.flex-mid" +
                        " input[value='ArrDelay_integer']:eq(0)")
            .then(function() {
                flightTestPart3_2();
                // flightTestPart4();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart3");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Add genRand (map to get uniqueNum)
        function flightTestPart3_2() {
            var wsId = WSManager.getOrders()[0];
            var tableId = WSManager.getWSById(wsId).tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "map")
            .then(function() {
                $("#categoryList .dropdown .icon").trigger(fakeEvent.click);
                $("#categoryMenu li[data-category='5']")
                        .trigger(fakeEvent.mouseup);
                $("#functionList .dropdown .icon").trigger(fakeEvent.click);
                $("#functionsMenu li:contains('genUnique')")
                        .trigger(fakeEvent.mouseup);
                $($(".argumentTable .argument")[0]).val("uniqueNum");
                $("#operationsModal .modalBottom .confirm").click();
                return (checkExists(".flexWrap.flex-mid" +
                        " input[value='uniqueNum']:eq(0)"));
            })
            .then(function() {
                flightTestPart4();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart3-2");
                TestSuite.fail(deferred, testName, currentTestNumber);
            });
        }
        
        // Filter flight table
        function flightTestPart4() {
            var wsId = WSManager.getOrders()[0];
            var tableId = WSManager.getWSById(wsId).tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "filter")
            .then(function() {
                $("#functionList input").val("gt");
                $("#functionList input").trigger(fakeEvent.enter);
                $($(".argumentTable tr")[1]).find("input").val("0");
                $("#operationsModal .modalBottom .confirm").click();
                // var tableId = $(".xcTable:eq(0)").data("id");
                return (checkExists("#xcTable-" + tableId, null,
                                    {notExist: true}));
            })
            .then(function() {
                flightTestPart5();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart4");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Upload python script
        function flightTestPart5() {
            $("#udfBtn").click();
            $("#udf-tabs div[data-tab='udf-fnSection'] .label").click();
            var editor = UDF.getEditor();
            editor.setValue('def ymd(year, month, day):\n' +
                            '    if int(month) < 10:\n' +
                            '        month = "0" + month\n' +
                            '    if int(day) < 10:\n' +
                            '        day = "0" + day\n' +
                            '    return year + month + day');
            $(".submitSection #udf-fnName").val("ymd");
            $("#udf-fnUpload").click();

            checkExists("#alertHeader:visible " +
                        ".text:contains('Duplicate Module')",
                        3000, {optional: true})
            .then(function(found) {
                if (found) {
                    $("#alertActions .confirm").click();
                }
                checkExists("#alertHeader:visible .text:contains('Success')")
                .then(function() {
                    flightTestPart6();
                })
                .fail(function(error) {
                    console.error(error, "flightTestPart5");
                    TestSuite.fail(deferred, testName, currentTestNumber, error);
                });
            });
        }

        // Map on flight table
        function flightTestPart6() {
            $("#alertActions .confirm").click();
            var wsId = WSManager.getOrders()[0];
            var tableId = WSManager.getWSById(wsId).tables[0];

            trigOpModal(tableId, "Year", "map")
            .then(function() {
                $("#categoryList .dropdown .icon").trigger(fakeEvent.click);
                $("#categoryMenu li[data-category='9']")
                    .trigger(fakeEvent.mouseup);
                $("#functionList .dropdown .icon").trigger(fakeEvent.click);
                $("#functionsMenu li:contains('ymd:ymd')")
                    .trigger(fakeEvent.mouseup);
                $($(".argumentTable .argument")[0]).val("$Year");
                $($(".argumentTable .argument")[1]).val("$Month");
                $($(".argumentTable .argument")[2]).val("$DayofMonth");
                $($(".argumentTable .argument")[3]).val("YearMonthDay");
                $("#operationsModal .modalBottom .confirm").click();

                // var tableId = $('.xcTable:eq(0)').data('id');
                return (checkExists("#xcTable-" + tableId, null,
                                    {notExist: true}));
            })
            .then(function() {
                flightTestPart7();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart6");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Join flight table with airport table
        function flightTestPart7() {
            var $header = $(".flexWrap.flex-mid input[value='Dest']").eq(0);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu .joinList");
            $colMenu.trigger(fakeEvent.mouseup);
            setTimeout(function() {
                $("#rightJoin .tableLabel:contains('airport')")
                    .trigger(fakeEvent.click);
                var $th = $("#rightJoin .columnTab:contains('iata')");
                if (!$th.parent().hasClass("colSelected")) {
                    $th.trigger(fakeEvent.click);
                }

                setTimeout(function() {
                    
                    var lTableName = $("#leftJoin").find(".tableLabel.active")
                                                   .text();
                    var rTableName = $("#rightJoin").find(".tableLabel.active")
                                                   .text();
                    var newName = xcHelper.getTableName(lTableName) + '-' +
                          xcHelper.getTableName(rTableName);
                    $('#joinRoundedInput').val(newName);
                    $("#joinTables").click();
                    checkExists(".xcTableWrap .tableName[value*=" + newName +
                                "]")
                    .then(function() {
                        flightTestPart8();
                    })
                    .fail(function(error) {
                        console.error(error, "flightTestPart7");
                        TestSuite.fail(deferred, testName, currentTestNumber,
                                       error);
                    });
                }, 500);
            }, 500);
        }

        // Group by
        function flightTestPart8() {
            var wsId = WSManager.getOrders()[0];
            var tableId = WSManager.getWSById(wsId).tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "groupby")
            .then(function() {
                $("#functionList .dropdown .icon").trigger(fakeEvent.click);
                $($("#functionsMenu li")[0]).trigger(fakeEvent.mouseup);
                $($(".argumentTable .argument")[0]).val("$ArrDelay_integer");
                $($(".argumentTable .argument")[1]).val("$UniqueCarrier");
                $($(".argumentTable .argument")[2]).val("AvgDelay");
                $("#operationsModal .modalBottom .confirm").click();

                return (checkExists(".xcTableWrap " +
                                    ".tableName[value*=GB]"));
            })
            .then(function() {

                //if ($("#numPages").text().indexOf("17") > -1) {
                    flightTestPart9();
                //} else {
                //    TestSuite.fail(deferred, testName, currentTestNumber,
                //                    "num pages not 17");
                //}
            })
            .fail(function(error) {
                console.error(error, "flightTestPart8");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Aggregate
        function flightTestPart9() {
            var wsId = WSManager.getOrders()[0];
            var tableId = WSManager.getWSById(wsId).tables[0];

            trigOpModal(tableId, "ArrDelay_integer", "aggregate")
            .then(function() {
                $("#functionList .dropdown .icon").trigger(fakeEvent.click);
                $("#functionsMenu li").eq(0).trigger(fakeEvent.mouseup);
                $("#operationsModal .modalBottom .confirm").click();

                return checkExists("#alertHeader:visible .text:contains(Agg)");
            })
            .then(function() {
                if ($("#alertContent .text").html().split(": ")[1]
                    .indexOf("31.229") > -1) {
                    $("#alertActions .cancel").click();
                    TestSuite.pass(deferred, testName, currentTestNumber);
                } else {
                    console.log(error, "Average value wrong");
                    TestSuite.fail(deferred, testName, currentTestNumber,
                                    "Average value wrong");
                }
            })
            .fail(function(error) {
                console.error(error, "flightTestPart9");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }
    }

    function newWorksheetTest(deferred, testName, currentTestNumber) {
        // Tests add worksheet and rename new worksheet
        $("#addWorksheet .icon").click();
        var wsId = WSManager.getOrders()[1];
        checkExists("#worksheetTab-" + wsId)
        .then(function() {
            $("#tableListBtn").click();
            $(".tableListSectionTab").eq(1).click();
            return (checkExists("#inactiveTablesList"));
        })
        .then(function() {
            // move the flight table (the one that has id #XX5)
            var $li = $("#inactiveTablesList .tableInfo").filter(function () {
                return $(this).data("id").endsWith("5");
            });
            if (!$li.find(".tableName").text().startsWith("flight")) {
                throw "Wrong table";
            }
            $li.find(".addTableBtn").click();

            $("#submitTablesBtn").click();
            $("#rightSideBar .iconClose").click();
            $("#worksheetTabs .worksheetTab:first-child")
                                                .trigger(fakeEvent.mousedown);
            return (checkExists(".xcTableWrap:eq(2) .tableTitle " +
                                ".dropdownBox .innerBox"));
        })
        .then(function() {
            $("#mainFrame").scrollLeft("10000");
            $(".xcTableWrap .tableTitle .dropdownBox .innerBox").eq(2).click();
            $("#tableMenu .moveToWorksheet").trigger(fakeEvent.mouseenter);
            $("#tableSubMenu .wsName").click();
            $("#tableSubMenu .moveToWorksheet .list li").click();
            $("#tableSubMenu .moveToWorksheet .wsName")
                .trigger(fakeEvent.enter);

            return (checkExists(".xcTableWrap.worksheet-" + wsId));
        })
        .then(function() {
            // rename
            $("#worksheetTab-" + wsId + " .text").val("Multi group by")
                                        .trigger(fakeEvent.enter);
            assert($("#worksheetTab-" + wsId + " .text").val() ===
                        "Multi group by");

            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber,
                           "newWorksheetTest failed");
        });
    }

    function multiGroupByTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];
        // var tableId = (WSManager.getWorksheets())[1].tables[0];

        trigOpModal(tableId, "ArrDelay_integer", "groupby")
        .then(function() {
            $("#functionsMenu li").eq(2).trigger(fakeEvent.mouseup);
            $(".argumentTable .argument").eq(1).val("$Dest, $AirTime");
            $("#operationsModal .modalBottom .confirm").click();
            return (checkExists(".xcTableWrap " +
                                ".tableName[value*=GB]"));
        })
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber,
                           "MultiGroupBy failed");
        });
    }

    function multiJoinTest(deferred, testName, currentTestNumber) {
        var dsName = "schedule" + Math.floor(Math.random() * 1000);
        // Import schedule dataset
        $("#dataStoresTab").click();
        $("#importDataButton").click();
        $("#fileBrowserModal .close").click();
        $("#filePath").val("file://"+testDataLoc+
                           "indexJoin/schedule/schedule.json");
        $("#fileName").val(dsName);
        $("#fileFormat .iconWrapper .icon").click();
        $("#fileFormat li[name='JSON']").click();
        $("#importDataSubmit").click();

        var dsIcon = getDSIcon(dsName);
        checkExists(dsIcon)
        .then(function() {
            var $grid = $(dsIcon);
            var dsId = $grid.data("dsid");
            return (checkExists('#worksheetTable[data-dsid="' + dsId + '"]'));
        }).then(function(){
            $(".contentViewTable .flexContainer").eq(0).click();
            $(".contentViewTable .flexContainer").eq(5).click();
            $("#submitDSTablesBtn").click();
            return (checkExists(".xcTable .flexWrap.flex-mid input[value=" +
                                "'class_id']:eq(0)"));
        }).then(function() {
            var wsId = WSManager.getOrders()[1];
            var tableId = WSManager.getWSById(wsId).tables[1];
            return (trigOpModal(tableId, "class_id", "joinList", "join"));
        }).then(function() {
            $("#multiJoinBtn .onBox").click();
            return (checkExists("#multiJoin .title"));
        }).then(function() {
            $(".joinClause").eq(1).click();
            $(".tableLabel").eq(6).click();
            $(".leftClause").eq(0).val("class_id");
            $(".leftClause").eq(1).val("teacher_id");
            $(".rightClause").eq(0).val("DayofMonth");
            $(".rightClause").eq(1).val("DayOfWeek");
            
            var lTableName = $("#leftJoin").find(".tableLabel.active").text();
            var rTableName = $("#rightJoin").find(".tableLabel.active").text();
            var newName = xcHelper.getTableName(lTableName) + '-' +
                          xcHelper.getTableName(rTableName);
            $('#joinRoundedInput').val(newName);
            $("#joinTables").click();
            return (checkExists(".xcTableWrap .tableName[value*=" +
                                newName + "]",
                    30000));
        }).then(function() {
            if ($("#numPages").text().indexOf("1,953") > -1) {
                TestSuite.pass(deferred, testName, currentTestNumber);
            } else {
                TestSuite.fail(deferred, testName, currentTestNumber,
                                'Num pages is not 1,953');
            }
        }).fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function columnRenameTest(deferred, testName, currentTestNumber) {
        $("#mainFrame").scrollLeft("0");
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];

        var $header = $("#xcTable-" + tableId +
                        " .flexWrap.flex-mid input[value='class_id']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        var $colMenu = $("#colMenu .renameCol");
        var $colSubMenu = $('#colSubMenu');
        $colMenu.mouseover();
        $colSubMenu.find(".colName").val("class id").trigger(fakeEvent.enter);
        checkExists(".tooltip")
        .then(function() {
            $colMenu.mouseout();
            $colSubMenu.find(".colName").val("newclassid");
            $colSubMenu.find(".colName").trigger(fakeEvent.enter);
            // Now do something with this newly renamed column
            var $header = $("#xcTable-" + tableId +
                            " .flexWrap.flex-mid input[value='newclassid']");
            $header.parent().parent().find(".flex-right .innerBox").click();
            $colMenu = $("#colMenu .changeDataType");
            $colMenu.mouseover();
            $colSubMenu.find(".changeDataType .type-string")
                .trigger(fakeEvent.mouseup);
            return (checkExists(".flexWrap.flex-mid" +
                                " input[value='newclassid_string']:eq(0)"));

        })
        .then(function() {
            console.log("This test is witness to GUI-1900");
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function tableRenameTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];
        $("#xcTableWrap-" + tableId + " .tableName").val("NewTableName")
                                                    .trigger(fakeEvent.enter);
        checkExists(".xcTableWrap .tableName[value*=New]")
        .then(function() {
            var $header = $("#xcTable-" + tableId +
                            " .flexWrap.flex-mid input[value='Month']");
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu .changeDataType");
            var $colSubMenu = $('#colSubMenu');
            $colMenu.mouseover();
            $colSubMenu.find(".changeDataType .type-integer")
                .trigger(fakeEvent.mouseup);
            return (checkExists(".flexWrap.flex-mid" +
                                " input[value='Month_integer']:eq(0)"));
        })
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function profileTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];
        var $header = $("#xcTable-" + tableId +
                        " .flexWrap.flex-mid input[value='Month_integer']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        $("#colMenu .profile").trigger(fakeEvent.mouseup);
        checkExists([".modalHeader .text:contains('Profile')",
                     ".barArea .xlabel:contains('205')"], 30000)
        .then(function() {
            assert($(".barChart .barArea").length === 8);
            assert($(".barArea .xlabel:contains('205')").length > 0);
            assert($(".barArea .xlabel:contains('207')").length > 0);
            assert($(".barArea .xlabel:contains('193')").length > 0);
            assert($(".barArea .xlabel:contains('626')").length > 0);
            assert($(".barArea .xlabel:contains('163')").length > 0);
            assert($(".barArea .xlabel:contains('134')").length > 0);
            assert($(".barArea .xlabel:contains('153')").length > 0);
            assert($(".barArea .xlabel:contains('272')").length > 0);

            assert($(".aggInfoSection .min").text() ===
                    Number(1).toLocaleString());
            assert($(".aggInfoSection .count").text() ===
                    Number(1953).toLocaleString());
            assert($(".aggInfoSection .average").text() ===
                    Number(6.506912).toLocaleString());
            assert($(".aggInfoSection .sum").text() ===
                    Number(12708).toLocaleString());
            assert($(".aggInfoSection .max").text() ===
                    Number(12).toLocaleString());

            $(".sort.asc .icon").click();
            setTimeout(function() {
                assert($(".barArea .xlabel").eq(0).text() === "134");
                assert($(".barArea .xlabel").eq(7).text() === "626");
                $("#profileModal .modalBottom button").click();
                TestSuite.pass(deferred, testName, currentTestNumber);
            }, 1000);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function corrTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];
        $("#xcTheadWrap-" + tableId + " .dropdownBox .innerBox").click();
        $("#tableSubMenu .correlation").trigger(fakeEvent.mouseup);
        checkExists(".aggTableField:contains('-0.4')", 20000)
        .then(function() {
            $("#aggModal .close").click();
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function aggTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getOrders()[1];
        var tableId = WSManager.getWSById(wsId).tables[0];
        $("#xcTheadWrap-" + tableId + " .dropdownBox .innerBox").click();
        $("#tableSubMenu .aggregates").trigger(fakeEvent.mouseup);
        checkExists(".spinny", null, {notExist: true})
        .then(function() {
            assert($(".aggTableField:contains('N/A')").not(".aggTableFlex").
                    length === 145);
            assert($(".aggTableField:contains('4574')"));
            assert($(".aggTableField:contains('334')"));
            $("#aggModal .close").click();
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function schedTest(deferred, testName, currentTestNumber) {
        // Create a schedule
        $("#schedulerTab").click();
        $("#schedulesButton").click();

        // on schedule form
        schedName = "testSched" + randInt(); // globals in the module

        $("#addSchedule").click();

        var $form = $("#scheduleForm");
        $form.find(".name").val(schedName)
            .end()
            .find(".datePickerPart input").focus().focus().click()
            .end()
            .find(".timePickerPart input").focus().focus().click()
            .end()
            .find(".freq1 .radioWrap:eq(0)").click()
            .end()
            .find(".recurSection input").val(1);
        $("#scheduleForm-save").click();

        checkExists("#scheduleLists .scheduleName:contains('" + schedName + "')")
        .then(function() {
            $("#scheduleForm-edit").click();
            $form.find(".freq1 .radioWrap:eq(1)").click();
            $("#scheduleForm-save").click();
            assert($("#scheduleInfos .scheduleInfo.frequency .text").text() === "hourly");
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function dfgTest(deferred, testName, currentTestNumber) {
        // Create a dfg
        $("#workspaceTab").click();

        var $worksheetTab = $(".worksheetTab:not(.inActive)");
        $worksheetTab.find(".dagTab").click();
        var worksheetId = $worksheetTab.attr("id").substring(13);
        var tId = WSManager.getAllMeta().wsInfos[worksheetId].tables[0];
        $("#dagWrap-" + tId + " .addDataFlow").click();

        // on dfgModal
        dfgName = "testDfg" + randInt(); // globals in the module
        $("#newGroupNameInput").val(dfgName);
        $("#dataFlowModalConfirm").click();
        $("#dataFlowModal .clear.modifyDSButton").click();
        $("#dataFlowTable .header:contains('newclassid_string')").click();
        $("#dataFlowTable .header:contains('teacher_id')").click();
        $("#dataFlowModalConfirm").click();

        // got to scheduler panel
        $("#schedulerTab").click();
        $("#dataflowButton").click();

        var selector = "#dataflowView .dataFlowGroup .listBox " +
                        ".label:contains('" + dfgName + "')";
        checkExists(selector)
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function retinaTest(deferred, testName, currentTestNumber) {
        // Create Parameter
        var $dataflowView = $("#dataflowView");

        // select dfg
        $dataflowView.find(".listBox .label:contains('" + dfgName + "')").click();

        // add param to retina
        var $retTab = $dataflowView.find(".retTab");
        var $retPopup = $dataflowView.find(".retPopUp");
        paramName = "param" + randInt();  // globals in the module

        $retTab.trigger(fakeEvent.mousedown);
        $retPopup.find(".newParam").val(paramName);
        $retPopup.find(".addParam").click();
        $retTab.trigger(fakeEvent.mousedown);

        // Add parameter to export
        $dataflowView.find(".dagTable.export").click();
        $dataflowView.find(".createParamQuery").trigger(fakeEvent.mouseup);

        var $dfgParamModal = $("#dfgParameterModal");
        $dfgParamModal.find(".editableRow .defaultParam").click();
        var $draggablePill = $dfgParamModal.find('.draggableDiv').eq(0);
        $dfgParamModal.find("input.editableParamDiv").val('export-' +
            $draggablePill.text() +'.csv'
        );
        $dfgParamModal.find("input.editableParamDiv").trigger('input');

        var $row = $("#dagModleParamList").find(".unfilled:first");
        fileName = "file" + randInt();

        checkExists("#dagModleParamList tr:first .paramName:contains('" +
                    paramName + "')")
        .then(function() {
            $('#dagModleParamList').find('tr:first .paramVal').val(fileName);
            $dfgParamModal.find(".modalBottom .confirm").click();

            checkExists(".dagTable.export.hasParam")
            .then(function() {
                TestSuite.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function addDFGToSchedTest(deferred, testName, currentTestNumber) {
        // Attach schedule to dfg
        var $listBox = $("#dataflowView .dataFlowGroup .listBox").filter(function() {
            return $(this).find(".label").text() === dfgName;
        });

        $listBox.find(".addGroup").click();

        // select schedule
        var $addSchedModal = $("#addScheduleModal");
        var $schedList = $addSchedModal.find(".scheduleList");
        $schedList.find(".iconWrapper").click()
                .end()
                .find("ul li:contains('" + schedName + "')").click();
        $addSchedModal.find(".modalBottom .confirm").click();

        var selector = "#dataflowView .midContentHeader " +
                    ".schedulesList:contains('schedules: " + schedName + "')";
        checkExists(selector)
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function jsonModalTest(deferred, testName, currentTestNumber) {
        var $jsonModal = $('#jsonModal');
        $('#workspaceTab').click();
        $('.worksheetTab').eq(1).trigger(fakeEvent.mousedown);
        $activeTable = $('.xcTable:visible').eq(0);
        $activeTable.find('.jsonElement').eq(0).trigger("dblclick");
        $activeTable.find('.jsonElement').eq(1).trigger("dblclick");
        checkExists(['#jsonModal .jsonWrap:eq(0)',
                    '#jsonModal .jsonWrap:eq(1)'])
        .then(function() {
            // compare matches on 2 data browser columns
            $jsonModal.find('.checkMark').eq(0).trigger(fakeEvent.click);
            $jsonModal.find('.checkMark').eq(1).trigger(fakeEvent.click);
            assert($jsonModal.find('.matched').eq(0).text() ===
                   $jsonModal.find('.matched').eq(1).text());

            // click on a 3rd column and compare matches
            $activeTable.find('.jsonElement').eq(2).trigger("dblclick");
            $('#jsonModal .checkMark').eq(2).trigger(fakeEvent.click);
            assert($jsonModal.find('.matched').eq(0).text() ===
                   $jsonModal.find('.matched').eq(2).text() && 
                   $jsonModal.find('.matched').eq(1).text() ===
                   $jsonModal.find('.matched').eq(2).text());
            assert($jsonModal.find('.partial:eq(0)').text() !=
                    $jsonModal.find('.partial:eq(1)').text());
            assert($jsonModal.find('.partial:eq(0) > div').length ===
                    $jsonModal.find('.partial:eq(1) > div').length);

            // generate new column in table
            $jsonModal.find(".matched:eq(2) > div .jKey")
                      .trigger(fakeEvent.click);
            var $newTh = $('.xcTable:visible').eq(0).find('.th.selectedCell');
            assert($newTh.find('.editableHead').val() === "class_id");
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    // function addSche
// ================= ADD TESTS TO ACTIVATE THEM HERE ======================= //
    TestSuite.add(flightTest, "FlightTest", defaultTimeout, TestCaseEnabled);
    TestSuite.add(newWorksheetTest, "NewWorksheetTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(multiGroupByTest, "MultiGroupByTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(multiJoinTest, "MultiJoinTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(columnRenameTest, "ColumnRenameTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(tableRenameTest, "TableRenameTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(profileTest, "ProfileTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(corrTest, "CorrelationTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(aggTest, "QuickAggregateTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(schedTest, "ScheduleTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(dfgTest, "DFGTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(retinaTest, "RetinaTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(addDFGToSchedTest, "AddDFGToScheduleTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(jsonModalTest, "JsonModalTest",
                  defaultTimeout, TestCaseEnabled);
// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //
    
    /* Unit Test Only */
    if (window.unitTestMode) {
        TestSuite.__testOnly__ = {};
        TestSuite.__testOnly__.checkExists = checkExists;
    }
    /* End Of Unit Test Only */

    return (TestSuite);
}(jQuery, {}));
