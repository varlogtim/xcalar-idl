window.TestSuite = (function($, TestSuite) {

    if (!jQuery || typeof jQuery.Deferred !== "function") {
        throw "Requires jQuery 1.5+ to use asynchronous requests.";
    }

    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 2560000;
    var defaultCheckTimeout = 60000;
    var slowInternetFactor = gLongTestSuite || 1;
                        // Change this to 2, 3, etc if you have a slow
                        // internet
    var passes = 0;
    var fails = 0;
    var skips = 0;
    var disableIsPass = true;
    var startTime = 0;
    var totTime = 0;
    var testCases = [];
    var startTableId;
    var testDS = [];

    // For assert to use
    var curTestNumber;
    var curTestName;
    var curDeferred;


    // Globals
    var dfgName;
    var schedName;
    var paramName;
    var fileName;

    //var mode = "hundred/"; // "ten/" or "hundred" or "" (normal)
    var mode = "";
    if (mode === "ten/") {
        gLongTestSuite = 10 * 10;
    } else if (mode === "hundred/") {
        gLongTestSuite = 100 * 100;
    }

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

    TestSuite.run = function(hasAnimation, toClean, noPopup, mode) {
        console.info("If you are on VPN / slow internet, please set " +
                    "gLongTestSuite = 2");
        var finalDeferred = jQuery.Deferred();
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

        if (mode) {
            if (mode === "ten") {
                mode = "ten/";
                console.log("Running 10X dataset");
            } else if (mode === "hundred") {
                mode = "hundred/";
                console.log("Running 100X dataset");
            } else {
                mode = "";
                console.log('Running regular dataset');
            }
        } else {
            console.log('Running regular dataset');
        }


        // Start PromiseHelper.chaining the callbacks
        try {
            for (var ii = 0; ii < testCases.length; ii++) {
                deferred = deferred.then(
                    // Need to trap the value of testCase and ii
                    (function trapFn(testCase, currentTestNumber) {
                        return (function() {
                            var localDeferred = jQuery.Deferred();
                            if (testCase.testCaseEnabled) {
                                console.log("====================Test ",
                                currentTestNumber, " Begin====================");
                                console.log("Testing: ", testCase.testName);
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
        } catch(err) {
            if (err === "testSuite bug") {
                endRun();
            }
        }
        deferred.fail(function() {
            returnValue = 1;
        });

        deferred.always(endRun);

        function endRun() {
            if (toClean) {
                cleanup()
                .always(finish);
            } else {
                finish();
            }
        }

        function finish() {
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
            if (!noPopup) {
                alert(alertMsg);
            }
            gMinModeOn = minModeCache;
            finalDeferred.resolve({
                "pass": passes,
                "fail": fails,
                "skip": skips,
                "time": totTime / 1000
            });
        }

        // This starts the entire PromiseHelper.chain
        initialDeferred.resolve();
        return finalDeferred.promise();
    };

    function assert(statement) {
        if (mode) {
            return;
        }
        if (!statement) {
            console.log("Assert failed!");
            TestSuite.fail(curDeferred, curTestName, curTestNumber);
        }
    }

    // elemSelectors
    /**
     * checkExists
     * @param  {string or array} elemSelectors can be a string or array of
     *                                element selectors example: ".xcTable" or
     *                                ["#xcTable-ex1", "#xcTable-ex2"]
     *                                can use :contains for
     * @param  {integer} timeLimit    length of time to search for before giving
     *                                up
     * @param  {object} options       notExist - boolean, if true, we want to
     *                                check that this element doesn't exist
     *
     *                                optional - boolean, if true, existence of
     *                                element is optional and we return
     *                                deferred.resolve regardless
                                      (example: a confirm box that appears
                                      in some cases)

                                      noDilute - boolean, if true, does not
                                      dilute the time according to the
                                      gLongTestSuite factor

                                      asserts - array, for each value in the
                                      array, it asserts that the element exists
     *
     */
    function checkExists(elemSelectors, timeLimit, options) {
        var deferred = jQuery.Deferred();
        var noDilute = options && options.noDilute;
        if (noDilute) {
            timeLimit = timeLimit || defaultCheckTimeout;
        } else {
            timeLimit = timeLimit * slowInternetFactor || defaultCheckTimeout;
        }
        options = options || {};

        var intervalTime = 100;
        var timeElapsed = 0;
        var notExist = options.notExist; // if true, we're actualy doing a
        // check to make sure the element DOESN"T exist
        var optional = options.optional; // if true, existence of element is
        // optional and we return deferred.resolve regardless
        // (example: a confirm box that appears in some cases)
        // var text = options.text;


        if (typeof elemSelectors === "string") {
            elemSelectors = [elemSelectors];
        }
        // console.log(arguments);

        var caller = checkExists.caller.name;

        var interval = setInterval(function() {
            var numItems = elemSelectors.length;
            var allElemsPresent = true;
            var $elem;
            for (var i = 0; i < numItems; i++) {
                $elem = $(elemSelectors[i]);
                if (notExist) {
                    if ($elem.length !== 0) {
                        allElemsPresent = false;
                        break;
                    }
                } else if ($elem.length === 0) {
                    allElemsPresent = false;
                    break;
                } else if ($('#modalWaitingBG').length) {
                    allElemsPresent = false;
                }
            }
            if (allElemsPresent) {
                if (options.asserts) {
                    i = 0;
                    for (; i<options.asserts.length; i++) {
                        assert($(options.asserts[i]).length > 0);
                    }
                }
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

    function getColNameWithPrefix(tableId, colName) {
        var $header = $("#xcTable-" + tableId).find(".editableHead")
        .filter(function() {
            return $(this).val() === colName;
        }).closest(".header");
        var prefix = $header.find(".topHeader .prefix").text();
        return xcHelper.getPrefixColName(prefix, colName);
    }

    function getFirstTableInWS(worksheetIndex) {
        var wsId = WSManager.getWSByIndex(worksheetIndex);
        var tableId = WSManager.getWSById(wsId).tables[0];
        return tableId;
    }

    TestSuite.cleanup = cleanup;

    function cleanup() {
        var deferred = jQuery.Deferred();

        deleteTables()
        .then(function() {
            deleteWorksheets();
            return deleteDS();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        function deleteTables() {
            console.log("Delete Tables");
            var innerDeferred = jQuery.Deferred();

            var $workspaceMenu = $("#workspaceMenu");
            if (!$workspaceMenu.hasClass("active")) {
                $("#workspaceTab .mainTab").click();
            }

            if ($workspaceMenu.find(".tables").hasClass("xc-hidden")) {
                $("#tableListTab").click();
            }

            var $tabs = $("#tableListSectionTabs .tableListSectionTab");
            var tabeTypes = [TableType.Active, TableType.Archived, TableType.Orphan];
            var promises = [];

            TableList.refreshOrphanList()
            .then(function() {
                tabeTypes.forEach(function(tableType, index) {
                    $tabs.eq(index).click();
                    var $section = $("#tableListSections .tableListSection:visible");
                    $section.find(".selectAll").click();

                    if (tableType === TableType.Active) {
                        // to achive active tables
                        $section.find(".submit").click();
                    } else {
                        promises.push(TableList.tableBulkAction("delete",
                                                                tableType));
                    }
                });

                return PromiseHelper.when.apply(this, promises);
            })
            .then(function() {
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function deleteWorksheets() {
            console.log("Delete Worksheets");
            var wsId = WSManager.getWSIdByName("Multi group by");
            WSManager.delWS(wsId, DelWSType.Empty);
        }

        function deleteDS() {
            var deferred = jQuery.Deferred();
            var minModeCache = gMinModeOn;
            gMinModeOn = true;
            $("#dataStoresTab .mainTab").click();

            testDS.forEach(function(ds) {
                var $grid = DS.getGridByName(ds);
                DS.remove($grid);
                $("#alertModal .confirm").click();
            });

            setTimeout(function() {
                // wait for some time
                gMinModeOn = minModeCache;
                deferred.resolve();
            }, 2000);
        }

        return deferred.promise();
    }

// ========================= COMMON ACTION TRIGGERS ======================== //
    function trigOpModal(tableId, columnName, funcClassName, whichModal) {
        var $header = $("#xcTbodyWrap-" + tableId)
                       .find(".flexWrap.flex-mid input[value='" + columnName +
                       "']").eq(0);
        $header.closest(".flexContainer").find(".flex-right .innerBox").click();

        var $colMenu = $("#colMenu ." + funcClassName);
        $colMenu.trigger(fakeEvent.mouseup);

        if (whichModal === "join") {
            return checkExists("#joinView:not(.xc-hidden)");
        } else {
            return checkExists(["#operationsView:not(.xc-hidden)",
                '#operationsView .opSection:not(.tempDisabled)']);
        }
    }
// ======================== TEST DEFINITIONS GO HERE ======================= //
    function getDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:not(.inactive)';
    }

    function getFinishDSIcon(dsName) {
        return '#dsListSection .grid-unit[data-dsname="' +
                            dsName + '"]:not(.inactive.fetching)';
    }

    function createTable(dsName) {
        var $grid = $(getDSIcon(dsName));
        var dsId = $grid.data("dsid");
        var innerDeferred = jQuery.Deferred();
        var tableName;
        var header;

        checkExists(getFinishDSIcon(dsName))
        .then(function() {
            $grid.find(".gridIcon").click();
            return checkExists('#dsTable[data-dsid="' + dsId + '"]');
        })
        .then(function() {
            var dsName = $("#dsInfo-title").text();
            $("#selectDSCols").click();
            if (dsName.indexOf("flight") > -1) {
                return checkExists(".selectedTable li:eq(33)");
            } else if (dsName.indexOf("airport") > -1) {
                return checkExists(".selectedTable li:eq(7)");
            } else if (dsName.indexOf("schedule") > -1) {
                return checkExists(".selectedTable li:eq(5)");
            } else {
                // TODO for each new table, should add a test case here
                return PromiseHelper.resolve();
            }
        })
        .then(function() {
            var validCart = '.selectedTable[data-dsid="' + dsId + '"]:not(.updateName)';
            return checkExists(validCart);
        })
        .then(function() {
            tableName = $("#dataCart .tableNameEdit").val();
            header = ".tableTitle .tableName[value='" + tableName + "']";

            $("#dataCart-submit").click();
            return checkExists(header);
        })
        .then(function() {
            var $header = $(header);
            var hasName = $header.siblings(".hashName").text();
            var $prefix = $header.closest(".xcTableWrap")
                            .find(".xcTable .topHeader .prefix");
            var prefix = "";
            $prefix.each(function() {
                var text = $(this).text();
                if (text !== "") {
                    prefix = text;
                    return false; // stop loop
                }
            });

            innerDeferred.resolve(tableName + hasName, prefix);
        })
        .fail(innerDeferred.reject);

        return innerDeferred.promise();
    }

    function loadDS(dsName, url, check) {
        var innerDeferred = jQuery.Deferred();
        $("#importDataButton").click(); // button to initiate point to dataset
        $("#fileProtocol input").val(FileProtocol.nfs);
        $("#filePath").val(url);
        $("#dsForm-path").find(".confirm").click(); // go to the next step

        checkExists(check, 5000)
        .then(function() {
            $("#dsForm-dsName").val(dsName);
            // auto detect should fill in the form
            $("#importDataForm .buttonSection .confirm:not(.createTable)").click();

            var dsIcon = getDSIcon(dsName);
            return checkExists(dsIcon);
        })
        .then(function() {
            testDS.push(dsName);
            innerDeferred.resolve();
        })
        .fail(innerDeferred.reject);

        return innerDeferred.promise();
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
            console.log("start flightTestPart1", "point to dataset");
            $("#dataStoresTab").click(); // main menu tab

             // Import flight dataset
            flightTestPart1Load1(dsName1)
            .then(function() {
                // import airports dataset
                return flightTestPart1Load2(dsName2);
            })
            .then(function() {
                flightTestPart2(dsName1, dsName2);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart1");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function flightTestPart1Load1(dsName1) {
            console.log("point to airline dataset");
            var check = "#previewTable td:eq(1):contains(19403)";
            var url = testDataLoc + "flight/" + mode + "airlines";
            return loadDS(dsName1, url, check);
        }

        function flightTestPart1Load2(dsName2) {
            console.log("point to airport dataset");
            var check = "#previewTable td:eq(1):contains(00M)";
            var url = testDataLoc + "flight/" + mode + "airports.csv";
            return loadDS(dsName2, url, check);
        }

        // Select columns in dataset and send to worksheet
        function flightTestPart2(dsName1, dsName2) {
            console.log("start flightTestPart2", "send to worksheet");
            createTable(dsName1)
            .then(function() {
                $("#dataStoresTab").click();
                return createTable(dsName2);
            })
            .then(function() {
                var header = ".xcTable .flexWrap.flex-mid" +
                             " input[value='ArrDelay']:eq(0)";
                var $tableWrap = $(header).closest(".xcTable");
                if ($tableWrap.length > 1) {
                    TestSuite.fail(deferred, testName, currentTestNumber,
                                    "more tha one flight table in worksheet, cannot test");
                    return;
                }

                startTableId = xcHelper.parseTableId($tableWrap);
                flightTestPart3();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart2");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Change column type
        function flightTestPart3() {
            console.log("start flightTestPart3", "change column type");
            // var $header = $(".flexWrap.flex-mid input[value='ArrDelay']").eq(0);
            // $header.closest(".flexContainer").find(".flex-right .innerBox").click();

            // var $colMenu = $("#colMenu .changeDataType");
            // var $colSubMenu = $('#colSubMenu');
            // $colMenu.mouseover();
            // $colSubMenu.find(".changeDataType .type-integer")
            //            .trigger(fakeEvent.mouseup);
            // checkExists(".flexWrap.flex-mid" +
            //             " input[value='ArrDelay_integer']:eq(0)")

            changeTypeToInteger(null, "ArrDelay")
            .then(function() {
                flightTestPart3_2();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart3");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Add genUnique (map to get uniqueNum)
        function flightTestPart3_2() {
            console.log("start flightTestPart3_2", "map to get uniqueNum");
            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "ArrDelay_integer", "map")
            .then(function() {
                var $section = $("#operationsView .opSection.map");
                $section.find(".categoryMenu li[data-category='5']")
                        .trigger(fakeEvent.click);
                $section.find(".functionsMenu li:contains('genUnique')")
                        .trigger(fakeEvent.click);
                $section.find(".colNameSection .arg").val("uniqueNum");
                $("#operationsView .submit").click();
                return checkExists(".flexWrap.flex-mid" +
                                    " input[value='uniqueNum']:eq(0)");
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
            console.log("start flightTestPart4", "filter flight table");
            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "ArrDelay_integer", "filter")
            .then(function() {
                var $section = $("#operationsView .opSection.filter");
                $section.find(".functionsList input").val("gt")
                                .trigger(fakeEvent.enterKeydown);
                $section.find(".arg").eq(1).val("0");
                $("#operationsView .submit").click();

                return checkExists("#xcTable-" + tableId, null,
                                    {notExist: true});
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
            console.log("start flightTestPart5", "upload python");
            $("#udfTab").click();
            $("#udfSection .tab[data-tab='udf-fnSection']").click();
            checkExists(".editArea:visible")
            .then(function() {
                var editor = UDF.getEditor();
                editor.setValue('def ymd(year, month, day):\n' +
                                '    if int(month) < 10:\n' +
                                '        month = "0" + month\n' +
                                '    if int(day) < 10:\n' +
                                '        day = "0" + day\n' +
                                '    return year + month + day');
                $("#udf-fnName").val("ymd");
                $("#udf-fnUpload").click();

                return checkExists("#alertHeader:visible " +
                                   ".text:contains('Duplicate Module')",
                                   3000, {optional: true,
                                          noDilute: true});
            })
            .then(function(found) {
                if (found) {
                    $("#alertActions .confirm").click();
                }
                return checkExists("#udf-manager .udf .text:contains(ymd)");
            })
            .then(function() {
                flightTestPart6();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart5");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Map on flight table
        function flightTestPart6() {
            console.log("start flightTestPart6", "map on flight table with udf");

            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "Year", "map")
            .then(function() {
                var $section = $("#operationsView .opSection.map");
                $section.find(".categoryMenu li[data-category='9']")
                        .trigger(fakeEvent.click);
                $section.find(".functionsMenu li:contains('ymd:ymd')")
                        .trigger(fakeEvent.click);

                var $args = $section.find(".arg");
                $args.eq(0).val(gColPrefix + "Year");
                $args.eq(1).val(gColPrefix + "Month");
                $args.eq(2).val(gColPrefix + "DayofMonth");
                $args.eq(3).val("YearMonthDay");
                $("#operationsView .submit").click();

                return checkExists("#xcTable-" + tableId, null,
                                    {notExist: true});
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
            console.log("start flightTestPart7", "join flight and airport table");

            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "Dest", "joinList", "join")
            .then(function() {
                // fisrt step of join
                $("#joinRightTableList").find("li:contains('airport')")
                                        .trigger(fakeEvent.click);
                var rTableName = $("#joinRightTableList").find(".text").val();
                var rTableId = xcHelper.getTableId(rTableName);
                var rightClause = getColNameWithPrefix(rTableId, "iata");
                $("#mainJoin .rightClause").val(rightClause).change();
                var lTableName = $("#joinLeftTableList").find(".text").val();
                var newName = xcHelper.getTableName(lTableName) + '-' +
                              xcHelper.getTableName(rTableName);
                $("#joinView .btn.next").click();
                $("#joinTableNameInput").val(newName);
                $("#joinTables").click();
                return checkExists(".xcTableWrap .tableName[value*='" + newName +
                                    "']");
            })
            .then(function() {
                flightTestPart8();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart7");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Group by
        function flightTestPart8() {
            console.log("start flightTestPart8", "groupby joined table");

            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "UniqueCarrier", "groupby")
            .then(function() {
                // group on UniqueCarrier having avg ArrDely_integer
                var $section = $("#operationsView .opSection.groupby");
                // test input of the field
                $section.find(".functionsList .functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);
                $section.find(".arg").eq(1).val(gColPrefix + "ArrDelay_integer");
                $section.find(".colNameSection .arg").val("AvgDelay");
                var newTableName = 'GB' + randInt();
                $section.find('.newTableName').val(newTableName);
                $("#operationsView .submit").click();

                return checkExists(".xcTableWrap .tableName[value*='" +
                                    newTableName + "']");
            })
            .then(function() {
                flightTestPart9();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart8");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Aggregate
        function flightTestPart9() {
            console.log("start flightTestPart9",
                        "aggregate the joined table on avg of ArrDelay_integer");

            var tableId = getFirstTableInWS(0);
            trigOpModal(tableId, "ArrDelay_integer", "aggregate")
            .then(function() {
                var $section = $("#operationsView .opSection.aggregate");
                // XXX cannot trigger dropdown list for a bug
                // use this as a test of dropdown list when fixed

                // $section.find(".functionsList .iconWrapper").click();
                // $section.find(".functionsList li:contains('avg')")
                //         .trigger(fakeEvent.mouseup);

                $section.find(".functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);
                $("#operationsView .submit").click();

                return checkExists("#alertHeader:visible .text:contains(Agg)");
            })
            .then(function() {
                assert($("#alertContent .text").html().split(":")[1].trim()
                                               .indexOf("31.22") > -1);
                $("#alertActions .cancel").click();
                TestSuite.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart9");
                TestSuite.fail(deferred, testName, currentTestNumber, error);
            });
        }
    }

    function newWorksheetTest(deferred, testName, currentTestNumber) {
        // Tests add worksheet and rename new worksheet
        console.log("newWorksheetTest: add new worksheet");
        var $menu = $("#workspaceMenu");
        if (!$menu.hasClass("active")) {
            // open workspace menu
            $("#workspaceTab .mainTab").click();
        }

        $("#addWorksheet").click();
        var wsId = WSManager.getWSByIndex(1);
        checkExists("#worksheetTab-" + wsId)
        .then(function() {
            if ($menu.find(".tables").hasClass("xc-hidden")) {
                $("#tableListTab").click();
            }
            $(".tableListSectionTab:contains(Temporary)").click();
            $("#orphanedTableList .refresh").click();
            return checkExists("#orphanedTableList-search:visible");
        })
        .then(function() {
            // move the flight table (the one that has id startTableId + 5)
            console.log("send a orphaned flight table to worksheet");
            var idCount = parseInt(startTableId.substring(2));
            var $li = $("#orphanedTablesList .tableInfo").filter(function () {
                try {
                    return $(this).data("id").endsWith(idCount + 5);
                } catch (err) {
                    throw "testSuite bug";
                }
            });
            if (!$li.find(".tableName").text().startsWith("flight")) {
                throw "Wrong table";
            }
            $li.find(".addTableBtn").click();

            $("#orphanedTableList .submit.active").click();
            // switch back to worksheet list
            $("#worksheetListTab").click();
            $("#worksheetTabs .worksheetTab:first-child")
                                                .trigger(fakeEvent.mousedown);
            return checkExists(".xcTableWrap:eq(2) .tableTitle " +
                                ".dropdownBox .innerBox");
        })
        .then(function() {
            console.log("move table to another worksheet");
            $("#mainFrame").scrollLeft("10000");
            $(".xcTableWrap:eq(2) .tableTitle .dropdownBox .innerBox").click();
            $("#tableMenu .moveTable").trigger(fakeEvent.mouseenter);
            $("#tableSubMenu .wsName").click();
            $("#tableSubMenu .moveToWorksheet .list li").click();
            $("#tableSubMenu .moveToWorksheet .wsName")
                .trigger(fakeEvent.enter);

            return checkExists(".xcTableWrap.worksheet-" + wsId);
        })
        .then(function() {
            // rename worksheet
            console.log("rename worksheet");
            $("#worksheetTab-" + wsId + " .text").val("Multi group by")
                                        .trigger(fakeEvent.enter);
            assert($("#worksheetTab-" + wsId + " .text").val() ===
                        "Multi group by");
            // close workspace menu
            $("#workspaceTab .mainTab").click();
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber,
                           "newWorksheetTest failed");
        });
    }

    function multiGroupByTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getWSByIndex(1);
        var tableId = getFirstTableInWS(1);
        trigOpModal(tableId, "ArrDelay_integer", "groupby")
        .then(function() {
            var $section = $("#operationsView .opSection.groupby");
            $section.find(".addGroupArg").click();
            var prefix = null;
            $("#xcTable-" + tableId).find(".topHeader .prefix")
            .each(function() {
                var text = $(this).text();
                if (text) {
                    prefix = text;
                    return false;
                }
            });

            var col1 = xcHelper.getPrefixColName(prefix, "Dest");
            var col2 = xcHelper.getPrefixColName(prefix, "AirTime");

            $section.find(".gbOnArg").eq(0).val(gColPrefix + col1)
            .end()
            .eq(1).val(gColPrefix + col2);

            $section.find(".functionsList .functionsInput").val("count")
                        .trigger(fakeEvent.enterKeydown);
            $section.find(".arg").eq(2).val(gColPrefix + "ArrDelay_integer");
            var newTableName = 'GB' + randInt();
            $section.find('.newTableName').val(newTableName);
            $("#operationsView .submit").click();
            // need to check in this worksheet because
            // there is another groupby table
            return checkExists(".xcTableWrap.worksheet-" + wsId +
                               " .tableName[value*='" + newTableName + "']");
        })
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber,
                           "MultiGroupBy failed");
        });
    }

    function changeTypeToInteger(tableId, col) {
        var deferred = jQuery.Deferred();
        var $header;

        if (tableId == null) {
            $header = $(".flexWrap.flex-mid input[value='" + col + "']").eq(0);
        } else {
            var $table = $("#xcTable-" + tableId);
            $header = $table
            .find(".flexWrap.flex-mid input[value='" + col + "']").eq(0);
        }
        $header.closest(".flexContainer").find(".flex-right .innerBox").click();

        var $colMenu = $("#colMenu .changeDataType");
        var $colSubMenu = $('#colSubMenu');
        $colMenu.mouseover();
        $colSubMenu.find(".changeDataType .type-integer")
                   .trigger(fakeEvent.mouseup);
        checkExists(".flexWrap.flex-mid" +
                    " input[value='" + col + "_integer']:eq(0)")
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function multiJoinTest(deferred, testName, currentTestNumber) {
        // point to schedule dataset
        console.log("point to schedule dataset");
        $("#dataStoresTab").click();
        var dsName = "schedule" + Math.floor(Math.random() * 1000);
        var url = testDataLoc + "indexJoin/schedule/schedule.json";
        var check = "#previewTable td:eq(1):contains(1)";
        var wsId = WSManager.getWSByIndex(1);
        var ws = WSManager.getWSById(wsId);
        var lPrefix;

        loadDS(dsName, url, check)
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            // XXX there is a point to ds error when not do setTimeout
            // need to fix later
            setTimeout(function() {
                createTable(dsName)
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);
            }, 1000);

            return innerDeferred.promise();
        })
        .then(function(tableName, resPrefix) {
            lPrefix = resPrefix;
            var rightTableId = ws.tables[0];
            return changeTypeToInteger(rightTableId, "DayofMonth");
        })
        .then(function() {
            var rightTableId = ws.tables[0];
            return changeTypeToInteger(rightTableId, "DayOfWeek");
        })
        .then(function(){
            console.log("multi join with flight-airport table");
            var tableId = ws.tables[2];
            return trigOpModal(tableId, "class_id", "joinList", "join");
        })
        .then(function() {
            var rightTableId = ws.tables[0];
            $("#joinRightTableList").find("li[data-id='" + rightTableId + "']")
                                    .trigger(fakeEvent.click);
            var lCol1 = xcHelper.getPrefixColName(lPrefix, "class_id");
            var lCol2 = xcHelper.getPrefixColName(lPrefix, "teacher_id");

            $("#mainJoin .leftClause").eq(0).val(lCol1).change();
            $("#mainJoin .rightClause").eq(0).val("DayofMonth_integer").change();
            // add another clause
            $("#mainJoin .placeholder .btn").click();
            $("#mainJoin .leftClause").eq(1).val(lCol2).change();
            $("#mainJoin .rightClause").eq(1).val("DayOfWeek_integer").change();

            var lTableName = $("#joinLeftTableList").find(".text").val();
            var rTableName = $("#joinRightTableList").find(".text").val();
            var newName = xcHelper.getTableName(lTableName) + '-' +
                            xcHelper.getTableName(rTableName);
            $("#joinView .btn.next").click();
            $("#joinTableNameInput").val(newName);
            $("#joinTables").click();

            return checkExists(".xcTableWrap .tableName[value*='" +
                                newName + "']", 30000);
        })
        .then(function() {
            assert($("#numPages").text().indexOf("1,953") > -1);
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function columnRenameTest(deferred, testName, currentTestNumber) {
        $("#mainFrame").scrollLeft("0");
        var tableId = getFirstTableInWS(1);

        var $header = $("#xcTable-" + tableId +
                        " .flexWrap.flex-mid input[value='class_id']");
        $header.closest(".flexContainer").find(".flex-right .innerBox").click();
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
        var tableId = getFirstTableInWS(1);
        $("#xcTableWrap-" + tableId + " .tableName").val("NewTableName")
                                                    .trigger(fakeEvent.enter);
        checkExists(".xcTableWrap .tableName[value*='New']")
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
        var tableId = getFirstTableInWS(1);
        var $header = $("#xcTable-" + tableId +
                        " .flexWrap.flex-mid input[value='Month_integer']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        $("#colMenu .profile").trigger(fakeEvent.mouseup);
        checkExists([".modalHeader .text:contains('Profile')",
                     "#profileModal[data-state='finished']"], 30000,
                     {"asserts": [".barArea .xlabel:contains('205')"]})
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

            assert($(".infoSection .min").eq(0).text() ===
                    Number(1).toLocaleString());
            assert($(".infoSection .count").text() ===
                    Number(1953).toLocaleString());
            assert($(".infoSection .average").text() ===
                    Number(6.506912).toLocaleString());
            assert($(".infoSection .sum").text() ===
                    Number(12708).toLocaleString());
            assert($(".infoSection .max").eq(0).text() ===
                    Number(12).toLocaleString());

            $("#profileModal .sortSection .asc").click();
            return checkExists("#profileModal[data-state='finished']", 30000,
                               {"asserts": [
                              ".barArea:first-child .xlabel:contains('134')"]});
        })
        .then(function() {
            assert($(".barArea .xlabel").eq(0).text() === "134");
            assert($(".barArea .xlabel").eq(7).text() === "626");
            $("#profileModal .close").click();
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function corrTest(deferred, testName, currentTestNumber) {
        var tableId = getFirstTableInWS(1);
        $("#xcTheadWrap-" + tableId + " .dropdownBox .innerBox").click();
        $("#tableMenu .corrAgg").trigger(fakeEvent.mouseup);
        checkExists("#aggModal-corr[data-state='finished']",
                    20000, {"asserts": [".aggTableField:contains('-0.4')"]})
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    // Disabled due to new aggregate and correlation. Needs to be triggered
    // via toggle of tabs
    function aggTest(deferred, testName, currentTestNumber) {
        $("#aggTab").click();
        checkExists(".spinny", null, {notExist: true})
        .then(function() {
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
        $("#dataflowTab").click();
        var $subTab = $("#schedulesButton");
        if (!$subTab.hasClass("active")) {
            $subTab.click();
        }

        // on schedule form
        schedName = "testSched" + randInt(); // globals in the module

        $("#addSchedule").click();

        var $form = $("#newScheduleForm");
        $form.find(".name").val(schedName).blur()
            .end()
            .find(".datePickerPart input").focus().focus().click()
            .end()
            .find(".timePickerPart input").focus().focus().click()
            .end()
            .find(".freq1 .radioButton:eq(0)").click()
            .end()
            .find(".recurSection input").val(1);
        $("#newScheduleForm-save").click();

        checkExists("#scheduleLists .scheduleName:contains('" + schedName + "')")
        .then(function() {
            $("#modScheduleForm-edit").click();
            $("#scheduleDetail").find(".freq1 .radioButton:eq(1)").click();
            $("#modScheduleForm-save").click();
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
        var $worksheetTab = $(".worksheetTab.active");
        $("#dfgPanelSwitch").click();
        var worksheetId = $worksheetTab.attr("id").substring(13);
        var tId = WSManager.getAllMeta().wsInfos[worksheetId].tables[0];
        $("#dagWrap-" + tId + " .addDataFlow").click();

        // on dfgModal
        dfgName = "testDfg" + randInt(); // globals in the module
        $("#newDFNameInput").val(dfgName);

        var $section = $("#dfCreateView");
        $section.find(".selectAllWrap").click();
        $section.find("li .text:contains('class_id')")
                .siblings(".checkbox").click();

        $section.find("li .text:contains('teacher_id')")
                .siblings(".checkbox").click();
        $section.find(".confirm").click();

        // got to scheduler panel
        $("#dataflowTab").click();

        var selector = "#dfgMenu .dataFlowGroup .listBox " +
                        ".groupName:contains('" + dfgName + "')";
        checkExists(selector)
        .then(function() {
            // focus on that dfg
            $(selector).click();
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function retinaTest(deferred, testName, currentTestNumber) {
        // Create Parameter
        var $dfgViz = $('#dfgViz');
        // add param to retina
        var $retTab = $dfgViz.find(".retTab");
        var $retPopup = $dfgViz.find(".retPopUp");
        paramName = "param" + randInt();  // globals in the module

        $retTab.trigger(fakeEvent.mousedown);
        $retPopup.find(".newParam").val(paramName);
        $retPopup.find(".addParam").click();
        $retTab.trigger(fakeEvent.mousedown);

        // Add parameter to export
        var $dfg = $('#dfgViz .dagWrap[data-dataflowname="' + dfgName +
                     '"]');
        $dfg.find(".dagTable.export").click();
        $dfgViz.find(".createParamQuery").trigger(fakeEvent.mouseup);

        var $dfgParamModal = $("#dfgParameterModal");
        $dfgParamModal.find(".editableRow .defaultParam").click();
        var $draggablePill = $dfgParamModal.find('.draggableDiv').eq(0);
        $dfgParamModal.find("input.editableParamDiv").val('export-' +
            $draggablePill.text() +'.csv'
        );
        $dfgParamModal.find("input.editableParamDiv").trigger('input');

        fileName = "file" + randInt();

        console.log(dfgName);

        checkExists("#dagModleParamList .row:first .paramName:contains('" +
                    paramName + "')")
        .then(function() {
            $('#dagModleParamList').find('.row:first .paramVal').val(fileName);
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

    function runRetinaTest(deferred, testName, currentTestNumber) {
        $('.dagWrap[data-dataflowname="' + dfgName + '"] .runNowBtn').click();
        checkExists("#alertHeader .text:contains('Run')")
        .then(function() {
            // If text is "Successfully ran dataflow" or
            // "Export file already exists", then all's well
            if ($("#alertContent .text").text()
                  .indexOf("Successfully ran dataflow") > -1) {
                $("#alertActions .cancel").click();
                TestSuite.pass(deferred, testName, currentTestNumber);
            } else if ($("#alertContent .text").text()
                                  .indexOf("Export file already exists") > -1) {
                console.info("Export file already exists, retina test skipped");
                $("#alertActions .confirm").click();
                TestSuite.pass(deferred, testName, currentTestNumber);

            } else {
                TestSuite.fail(deferred, testName, currentTestNumber);
            }
        });
    }

    function cancelRetinaTest(deferred, testName, currentTestNumber) {
        // First parameterize the node so that there is no way to duplicate
        var $dfgViz = $("#dfgViz");
        var $dfg = $('#dfgViz .dagWrap[data-dataflowname="' + dfgName +
                     '"]');
        $dfg.find(".dagTable.export").click();
        $dfgViz.find(".createParamQuery").trigger(fakeEvent.mouseup);

        var $dfgParamModal = $("#dfgParameterModal");
        var cancelFileName = fileName + fileName;
        $('#dagModleParamList').find('.row:first .paramVal')
                               .val(cancelFileName);
        $dfgParamModal.find(".modalBottom .confirm").click();
        $dfg.find(".runNowBtn").click();
        setTimeout(function() {
            $dfg.find(".runNowBtn").click(); // Cancel
            checkExists("#alertModal:visible")
            .then(function() {
                if ($("#alertHeader .text").text()
                      .indexOf("Cancellation Successful") > -1) {
                    return PromiseHelper.resolve();
                } else if ($("#alertContent .text").text()
                                          .indexOf("Operation Canceled") > -1) {
                    return PromiseHelper.resolve();
                } else if ($("#alertContent .text").text()
                                   .indexOf("Successfully ran dataflow") > -1) {
                    console.info("Cancelled too late");
                    return PromiseHelper.resolve();
                } else if ($("#alertContent .text").text()
                            .indexOf("Operation has finished") > -1) {
                    return PromiseHelper.resolve();
                } else if ($("#alertContent .text").text()
                            .indexOf("Error occurs during Operation") > -1) {
                    // Failed to cancel. Must wait for dfg to finish running
                    // else deleteRetinaTest will fail
                    console.info("Cancel failed");
                    return PromiseHelper.reject();
                } else {
                    console.log("Some bug here:");
                    console.log($("#alertModal")[0]);
                    return PromiseHelper.resolve();
                    //TestSuite.fail(deferred, testName, currentTestNumber);
                }
            })
            .then(function() {
                // Noop here
                return PromiseHelper.resolve();
            }, function() {
                $("#alertActions .confirm").click();
                return checkExists("#alertModal:visible");
            })
            .then(function() {
                $("#alertActions .confirm").click();
                TestSuite.pass(deferred, testName, currentTestNumber);
            });
        }, 100);
    }

    function deleteRetinaTest(deferred, testName, currentTestNumber) {
        if ($("#alertActions").is(":visible")) {
            $("#alertActions button:visible").click();
        }
        checkExists("#alertModal:hidden")
        .then(function() {
            $("#dfgMenu .dataFlowGroup .listBox .groupName:contains('" +
              dfgName + "')").next(".deleteDataflow").click();
            return checkExists("#alertModal:visible");
        })
        .then(function() {
            $("#alertActions .confirm").click();
            $("#alertActions .cancel").click();
            // There's a change we will run into cannot delete due to
            // table in use
            return checkExists("#dfgMenu .dataFlowGroup .listBox " +
                               ".groupName:contains('" + dfgName + "')",
                               3000, {notExist: true,
                                      optional: true});
        })
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber);
        });

    }

    function addDFToSchedTest(deferred, testName, currentTestNumber) {
        // Attach schedule to dfg
        var $listBox = $("#dfgMenu .dataFlowGroup .listBox").filter(function() {
            return $(this).find(".groupName").text() === dfgName;
        });

        $listBox.find(".addGroup").click();

        // select schedule
        var $addScheduleCard = $("#addScheduleCard");
        var $schedList = $addScheduleCard.find(".scheduleList");
        $schedList.find(".iconWrapper").click()
                .end()
                .find("ul li:contains('" + schedName + "')").click();
        $addScheduleCard.find("button.confirm").click();

        var selector = "#dfgViz .schedulesList:contains('1')";
        checkExists(selector)
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            TestSuite.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function jsonModalTest(deferred, testName, currentTestNumber) {
        if ($("#alertActions").is(":visible")) {
            $("#alertActions button:visible").click();
        }
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
            $jsonModal.find('.compareIcon').eq(0).trigger(fakeEvent.click);
            $jsonModal.find('.compareIcon').eq(1).trigger(fakeEvent.click);
            assert($jsonModal.find('.matched').eq(0).text() ===
                   $jsonModal.find('.matched').eq(1).text());
            // click on a 3rd column and compare matches
            $activeTable.find('.jsonElement').eq(2).trigger("dblclick");
            $('#jsonModal .compareIcon').eq(2).trigger(fakeEvent.click);
            assert($jsonModal.find('.matched').eq(0).text() ===
                   $jsonModal.find('.matched').eq(2).text() &&
                   $jsonModal.find('.matched').eq(1).text() ===
                   $jsonModal.find('.matched').eq(2).text());
            assert($jsonModal.find('.partial:eq(0)').text() !==
                    $jsonModal.find('.partial:eq(1)').text());
            assert($jsonModal.find('.partial:eq(0) > div').length ===
                    $jsonModal.find('.partial:eq(1) > div').length);

            // generate new column in table
            $jsonModal.find(".matched:eq(2) > div .jKey").eq(0)
                      .trigger(fakeEvent.click);
            var $newTh = $('.xcTable:visible').eq(0).find('.th.selectedCell');
            // XXX Jerene sees different values everytime. Since this is a json
            // technically any of the keys are okay, so long as it comes from
            // the schedule prefix since all of them are matched
            assert($newTh.find('.editableHead').val().indexOf("days") > -1 ||
                   $newTh.find('.editableHead').val().indexOf("time") > -1 ||
                   $newTh.find('.editableHead').val().indexOf("student_ids") >
                   -1 ||
                   $newTh.find('.editableHead').val().indexOf("duration") >
                   -1 ||
                   $newTh.find('.editableHead').val().indexOf("teacher_id") >
                   -1 ||
                   $newTh.find('.editableHead').val().indexOf("class_id") > -1);
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
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(multiJoinTest, "MultiJoinTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(columnRenameTest, "ColumnRenameTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(tableRenameTest, "TableRenameTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(profileTest, "ProfileTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(corrTest, "CorrelationTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(aggTest, "QuickAggregateTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(schedTest, "ScheduleTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(dfgTest, "DFTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(retinaTest, "RetinaTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(runRetinaTest, "RunRetinaTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(cancelRetinaTest, "CancelRetinaTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(deleteRetinaTest, "DeleteRetinaTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(addDFToSchedTest, "AddDFToScheduleTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(jsonModalTest, "JsonModalTest",
                  defaultTimeout, TestCaseEnabled);
// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //

    /* Unit Test Only */
    if (window.unitTestMode) {
        TestSuite.__testOnly__ = {};
        TestSuite.__testOnly__.checkExists = checkExists;
        TestSuite.__testOnly__.loadDS = loadDS;
        TestSuite.__testOnly__.createTable = createTable;
    }
    /* End Of Unit Test Only */

    return (TestSuite);
}(jQuery, {}));
