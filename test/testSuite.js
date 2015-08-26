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
    var fakeMouseenter = {type: "mouseenter",
                          which: 1};

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

    // elemSelectors can be a string or array of element selectors 
    // example: ".xcTable" or ["#xcTable-ex1", "#xcTable-ex2"]
    function checkExists(elemSelectors, timeLimit, options) {
        var deferred = jQuery.Deferred();
        var intervalTime = 200;
        var timeLimit = timeLimit || 10000;
        var timeElapsed = 0;
        if (typeof elemSelectors === "string") {
            var elemSelectors = [elemSelectors];
        }

        var interval = setInterval(function() {
            var numItems = elemSelectors.length;
            var allElemsPresent = true;
            var $elem;
            for (var i = 0; i < numItems; i++) {
                $elem = $(elemSelectors[i]);
                if (options && options.notExist) {
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
                setTimeout(deferred.resolve, 100);
            } else if (timeElapsed >= timeLimit) {
                console.log(elemSelectors, options);
                var error = 'time limit of ' + timeLimit +
                            'ms exceeded';
                console.warn(error);
                clearInterval(interval);
                deferred.reject(error);
            }
            timeElapsed += intervalTime;
        }, intervalTime);

        return (deferred.promise());
    }

    function insertText($input, textToInsert) {
        var value  = $input.val();
        var valLen = value.length;
        var newVal;
       
        var currentPos = $input[0].selectionStart;
        var selectionEnd = $input[0].selectionEnd;
        var numCharSelected = selectionEnd - currentPos;
        var strLeft;

        if (valLen === 0) {
            // add to empty input box
            newVal = textToInsert;
            currentPos = newVal.length;
        } else if (numCharSelected > 0) {
            // replace a column
            strLeft = value.substring(0, currentPos);
            newVal = textToInsert;
            currentPos = strLeft.length + newVal.length;
        } else if (currentPos === valLen) {
            // append a column
            newVal = ", " + textToInsert;
            currentPos = value.length + newVal.length;
        } else if (currentPos === 0) {
            // prepend a column
            newVal = textToInsert + ", ";
            currentPos = newVal.length; // cursor at the start of value
        } else {
            // insert a column. numCharSelected == 0
            strLeft = value.substring(0, currentPos);

            newVal = textToInsert + ", ";
            currentPos = strLeft.length + newVal.length;
        }

        $input.focus();
        if (!document.execCommand("insertText", false, newVal+"\n")) {
            $input.val($input.val() + newVal);
        }
    }
// ========================= COMMON ACTION TRIGGERS ======================== //
    function trigOpModal(tableId, columnName, funcClassName, whichModal) {
        var $header = $("#xcTbodyWrap-"+tableId)
                       .find(".flexWrap.flex-mid input[value='"+columnName+"']")
                       .eq(0);
        $header.parent().parent().find(".flex-right .innerBox").click();
        var $colMenu = $("#xcTableWrap-"+tableId)
                       .find(".colMenu:not(.tableMenu) ."+funcClassName);
        $colMenu.trigger(fakeMouseup);
        if (whichModal === "join") {
            return (checkExists("#joinModal:visible"));
        } else {
            return (checkExists("#operationsModal:visible"));
        }
    }
// ======================== TEST DEFINITIONS GO HERE ======================= //
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
            var ds1Icon = '#dataset-'+dsName1+':not(.inactive)';
            var ds2Icon = '#dataset-'+dsName2+':not(.inactive)';
            checkExists([ds1Icon, ds2Icon])
            .then(function() {
                flightTestPart2(dsName1, dsName2);
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart1');
            });
         }
        
        function flightTestPart2(dsName1, dsName2) {
            $("#dataset-"+dsName2+" .gridIcon").click();
            checkExists('#worksheetTable[data-dsname=' + dsName2)
            .then(function() {
                $("#selectDSCols .icon").click();
                $("#dataset-"+dsName1+" .gridIcon").click();
                return (checkExists('#worksheetTable[data-dsname=' +
                                     dsName1));
            })
            .then(function() {
                $("#selectDSCols .icon").click();
                $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                $("#selectedTable-"+dsName1+" li .closeIcon")[0].click();
                $("#submitDSTablesBtn").click();

                var header = ".xcTable .flexWrap.flex-mid" +
                             " input[value='ArrDelay']:eq(0)";
                return(checkExists(header));
            })
            .then(function() {
                flightTestPart3();
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart2');
            });
        }

        function flightTestPart3() {
            var $header = $($(".flexWrap.flex-mid input[value='ArrDelay']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $(".xcTableWrap").eq(0)
                            .find(".colMenu:not(.tableMenu) .changeDataType");
            $colMenu.mouseover();
            $colMenu.find(".type-integer").trigger(fakeMouseup);
            checkExists(".flexWrap.flex-mid"+
                              " input[value='ArrDelay_integer']:eq(0)")
            .then(function() {
                flightTestPart4();
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart3');
            });
        }

        function flightTestPart4() {
            var tableId = (WSManager.getWorksheets())[0].tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "filter")
            .then(function() {
                $("#functionList input").val("gt");
                $("#functionList input").trigger(fakeEnter);
                $($(".argumentTable tr")[2]).find("input").val("0");
                $("#operationsModal .modalBottom .confirm").click();
                var tableId = $('.xcTable:eq(0)').data('id');
                return (checkExists("#xcTable-" + tableId, null,
                                    {notExist: true}));
            })
            .then(function() {
                flightTestPart5();
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart4');
            });
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
            checkExists("#alertHeader:visible .text:contains('SUCCESS')")
            .then(function() {
                flightTestPart6();
            })
            .fail(function(error) {
                 console.error(error, 'flightTestPart5');
            });
        }

        function flightTestPart6() {
            $("#alertActions .confirm").click();
            var tableId = (WSManager.getWorksheets())[0].tables[0];
            trigOpModal(tableId, "Year", "map")
            .then(function() {
                $("#categoryList .dropdown .icon").trigger(fakeClick);
                $("#categoryMenu li[data-category='9']").trigger(fakeMouseup);
                $("#functionList .dropdown .icon").trigger(fakeClick);
                $("#functionsMenu li:contains('ymd:ymd')").trigger(fakeMouseup);
                $($(".argumentTable .argument")[0]).val("$Year");
                $($(".argumentTable .argument")[1]).val("$Month");
                $($(".argumentTable .argument")[2]).val("$DayofMonth");
                $($(".argumentTable .argument")[3]).val("YearMonthDay");
                $("#operationsModal .modalBottom .confirm").click();

                var tableId = $('.xcTable:eq(0)').data('id');
                return (checkExists("#xcTable-" + tableId, null,
                                    {notExist: true}));
            })
            .then(function() {
                flightTestPart7();
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart6');
            });
        }

        function flightTestPart7() {
            var $header = $($(".flexWrap.flex-mid"+
                              " input[value='Dest']")[0]);
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $(".xcTableWrap").eq(0)
                            .find(".colMenu:not(.tableMenu) .joinList");
            $colMenu.trigger(fakeMouseup);
                $("#rightJoin .tableLabel:contains('airport')")
                .trigger(fakeClick);
                $("#rightJoin .columnTab:contains('iata')").trigger(fakeClick);
                setTimeout(function() {
                    $("#joinTables").click();
                    checkExists(".xcTableWrap .tableTitle:contains(join)")
                    .then(function() {
                        flightTestPart8();
                    })
                    .fail(function(error) {
                        console.error(error, 'flightTestPart7');
                    });
                }, 500);
        }

        function flightTestPart8() {
            var tableId = (WSManager.getWorksheets())[0].tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "groupby")
            .then(function() {
                $("#functionList .dropdown .icon").trigger(fakeClick);
                $($("#functionsMenu li")[0]).trigger(fakeMouseup);
                $($(".argumentTable .argument")[0]).val("$ArrDelay_integer");
                $($(".argumentTable .argument")[1]).val("$UniqueCarrier");
                $($(".argumentTable .argument")[2]).val("AvgDelay");
                $("#operationsModal .modalBottom .confirm").click();

                var tableId = $('.xcTable:eq(0)').data('id');
                return (checkExists(".xcTableWrap " +
                                    ".tableTitle:contains(GroupBy)"));
            })
            .then(function() {
                flightTestPart9();
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart8');
            });
        }

        function flightTestPart9() {
            var tableId = (WSManager.getWorksheets())[0].tables[0];
            trigOpModal(tableId, "ArrDelay_integer", "aggregate")
            .then(function() {
                $("#functionList .dropdown .icon").trigger(fakeClick);
                $($("#functionsMenu li")[0]).trigger(fakeMouseup);
                $("#operationsModal .modalBottom .confirm").click();

                return(checkExists("#alertHeader:visible .text:contains(Agg)"));
            })
            .then(function() {
                 if ($("#alertContent .text").html().split(": ")[1]
                     .indexOf("31.229") > -1) {
                     $("#alertActions .cancel").click();
                     TestSuite.pass(deferred, testName, currentTestNumber);
                 } else {
                     console.log(error, 'Average value wrong');
                     TestSuite.fail(deferred, testName, currentTestNumber,
                                    "Average value wrong");
                 }
            })
            .fail(function(error) {
                console.error(error, 'flightTestPart9');
            });
        }
    }

    function newWorksheetTest(deferred, testName, currentTestNumber) {
        // Tests add worksheet and rename new worksheet
        $("#addWorksheet .icon").click();
        checkExists("#worksheetTab-1")
        .then(function() {
            $("#tableListBtn").click();
            $(".tableListSectionTab").eq(1).click();
            return (checkExists("#inactiveTablesList"))
        })
        .then(function() {
            $("#inactiveTablesList .addTableBtn").eq(0).click();
            $("#submitTablesBtn").click();
            $("#rightSideBar .iconClose").click();
            $("#worksheetTab-0 .label").click();
            return (checkExists(".xcTableWrap .tableTitle .dropdownBox "+
                                ".innerBox"));
        })
        .then(function() {
            $("#mainFrame").scrollLeft("10000");
            $(".xcTableWrap .tableTitle .dropdownBox .innerBox").eq(2).click();
            $(".xcTableWrap .moveToWorksheet").eq(2).trigger(fakeMouseenter);
            $(".xcTableWrap .moveToWorksheet .wsName").eq(2).click();
            $(".xcTableWrap .moveToWorksheet .list li").click();
            $(".xcTableWrap .moveToWorksheet .wsName").eq(2).trigger(fakeEnter);
            $("#worksheetTab-1 .text").text("Multi group by");
            return (checkExists("#worksheetTab-1 .text:contains('Multi ')"));
        })
        .then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        });
    }

    function multiGroupByTest(deferred, testName, currentTestNumber) {
        var tableId = (WSManager.getWorksheets())[1].tables[0];
        trigOpModal(tableId, "ArrDelay_integer", "groupby")
        .then(function() {
            $("#functionsMenu li").eq(2).trigger(fakeMouseup);
            $(".argumentTable .argument").eq(1).val("$Dest, $AirTime");
            $("#operationsModal .modalBottom .confirm").click();
            return (checkExists(".xcTableWrap "+
                                ".tableTitle:contains(GroupBy)"));
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
        var dsName = "schedule"+Math.floor(Math.random()*100);
        // Import schedule dataset
        $("#dataStoresTab").click();
        $("#importDataButton").click();
        $("#filePath").val("file:///var/tmp/qa/indexJoin/schedule/schedule.json"
                          );
        $("#fileName").val(dsName);
        $("#fileFormat .iconWrapper .icon").click();
        $("#fileFormat li[name='JSON']").click();
        $("#importDataSubmit").click();
        checkExists("#dataset-"+dsName+":not(.inactive)")
        .then(function() {
            $("#contentViewTable .flexContainer").eq(0).click();
            $("#contentViewTable .flexContainer").eq(5).click();
            $("#submitDSTablesBtn").click();
            return (checkExists(".xcTable .flexWrap.flex-mid input[value="+
                                "'class_id']:eq(0)"));
        }).then(function() {
            var tableId = (WSManager.getWorksheets())[1].tables[1];
            return (trigOpModal(tableId, "class_id", "joinList", "join"));
        }).then(function() {
            $("#multiJoinBtn .onBox").click();
            return (checkExists("#multiJoin .title"));
        }).then(function() {
            $("#joinRoundedInput").val("multiJoin");
            $(".joinClause").eq(1).click();
            $(".tableLabel").eq(6).click();
            $(".leftClause").eq(0).val("class_id");
            $(".leftClause").eq(1).val("teacher_id");
            $(".rightClause").eq(0).val("DayofMonth");
            $(".rightClause").eq(1).val("DayOfWeek");
            $("#joinTables").click();
            return (checkExists(".xcTableWrap .tableTitle:contains(multiJoin)"
                               ));
        }).then(function() {
            TestSuite.pass(deferred, testName, currentTestNumber);
        });
    }

    function columnRenameTest(deferred, testName, currentTestNumber) {
        $("#mainFrame").scrollLeft("0");
        var tableId = (WSManager.getWorksheets())[1].tables[0];
        var $header = $("#xcTable-"+tableId+
                        " .flexWrap.flex-mid input[value='class_id']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        var $colMenu = $("#xcTableWrap-"+tableId)
                        .find(".colMenu:not(.tableMenu) .renameCol");
        $colMenu.mouseover();
        // XXX TODO add check for disallowing spaces in col name
        $colMenu.find(".colName").val("newclassid");
        $colMenu.find(".colName").trigger(fakeEnter);
        // Now do something with this newly renamed column
        var $header = $("#xcTable-"+tableId+
                        " .flexWrap.flex-mid input[value='newclassid']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        $colMenu = $("#xcTableWrap-"+tableId)
                    .find(".colMenu:not(.tableMenu) .changeDataType");
        $colMenu.mouseover();
        $colMenu.find(".type-string").trigger(fakeMouseup);
        checkExists(".flexWrap.flex-mid"+
                    " input[value='newclassid_integer']:eq(0)")
        .then(function() {
            console.log("This test is witness to GUI-1900");
            TestSuite.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            TestSuite.fail(deferred, testName, currentTestNumber);
        });

    }
// ================= ADD TESTS TO ACTIVATE THEM HERE ======================= //
    TestSuite.add(testCases, flightTest, "FlightTest", defaultTimeout,
                  TestCaseEnabled);
    TestSuite.add(testCases, newWorksheetTest, "NewWorksheetTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(testCases, multiGroupByTest, "MultiGroupByTest",
                  defaultTimeout, TestCaseDisabled);
    TestSuite.add(testCases, multiJoinTest, "MultiJoinTest",
                  defaultTimeout, TestCaseEnabled);
    TestSuite.add(testCases, columnRenameTest, "TableRenameTest",
                  defaultTimeout, TestCaseEnabled);

// =========== TO RUN, OPEN UP CONSOLE AND TYPE TestSuite.run() ============ //
    return (TestSuite);
}(jQuery, {}));
