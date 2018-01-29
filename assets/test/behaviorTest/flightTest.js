window.FlightTest = (function(FlightTest, $) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 720000; // 12min

    // Globals
    var startTableId;
    var dfName;
    var schedName;
    var paramName;
    var fileName;

    FlightTest.run = function(hasAnimation, toClean, noPopup, mode, withUndo,
                                timeDilation) {
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        initializeForms();
        return test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);
    };

    // =============== ADD TESTS TO ACTIVATE THEM HERE ===================== //
    function initializeTests() {
        test.add(flightTest, "FlightTest", defaultTimeout, TestCaseEnabled);
        test.add(newWorksheetTest, "NewWorksheetTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(multiGroupByTest, "MultiGroupByTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(multiJoinTest, "MultiJoinTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(columnRenameTest, "ColumnRenameTest",
                      defaultTimeout, TestCaseDisabled); // disabled
        test.add(tableRenameTest, "TableRenameTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(profileTest, "ProfileTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(corrTest, "CorrelationTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(aggTest, "QuickAggregateTest",
                      defaultTimeout, TestCaseEnabled);
        test.add(schedTest, "ScheduleTest",
                      defaultTimeout, TestCaseDisabled); // disabled
        test.add(dfTest, "DFTest",
                      defaultTimeout, TestCaseEnabled);
        // Temporarily disabled due to thrift change
        test.add(retinaTest, "RetinaTest",
                      defaultTimeout, TestCaseDisabled);
        // interactive mode not run test
        var retinaEnabled = (XVM.getLicenseMode() === XcalarMode.Demo ||
                             XVM.getLicenseMode() === XcalarMode.Mod) ?
                            TestCaseDisabled : TestCaseEnabled;
        // XXX temporarily disable it because of the expotNode bug by json query change
        retinaEnabled = TestCaseDisabled;
        test.add(runRetinaTest, "RunRetinaTest",
                      defaultTimeout, retinaEnabled);
        test.add(cancelRetinaTest, "CancelRetinaTest",
                      defaultTimeout, retinaEnabled);
        test.add(deleteRetinaTest, "DeleteRetinaTest",
                      defaultTimeout, TestCaseDisabled); // disabled
        test.add(addDFToSchedTest, "AddDFToScheduleTest",
                      defaultTimeout, TestCaseDisabled); // disabled
        test.add(jsonModalTest, "JsonModalTest",
                      defaultTimeout, TestCaseEnabled);
    }

    function initializeForms() {
        $("#operationsView").find(".keepTable").click(); // keep gb table
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
            console.log("start flightTestPart1", "import dataset");
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
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function flightTestPart1Load1(dsName1) {
            console.log("import airline dataset");
            var check = "#previewTable td:eq(1):contains(19403)";
            var url = testDataLoc + "flight/" + test.mode + "airlines";
            return test.loadDS(dsName1, url, check);
        }

        function flightTestPart1Load2(dsName2) {
            console.log("import airport dataset");
            var check = "#previewTable td:eq(1):contains(00M)";
            var url = testDataLoc + "flight/" + test.mode + "airports.csv";
            return test.loadDS(dsName2, url, check);
        }

        // Select columns in dataset and send to worksheet
        function flightTestPart2(dsName1, dsName2) {
            console.log("start flightTestPart2", "send to worksheet");
            test.createTable(dsName1)
            .then(function() {
                $("#dataStoresTab").click();
                return test.createTable(dsName2);
            })
            .then(function() {
                var header = ".xcTable .flexWrap.flex-mid" +
                             " input[value='ArrDelay']:eq(0)";
                var $tableWrap = $(header).closest(".xcTable");
                if ($tableWrap.length > 1) {
                    test.fail(deferred, testName, currentTestNumber,
                                    "more tha one flight table in worksheet, cannot test");
                    return;
                }

                startTableId = xcHelper.parseTableId($tableWrap);
                flightTestPart3();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart2");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Change column type
        function flightTestPart3() {
            console.log("start flightTestPart3", "change column type");

            changeTypeToInteger(null, "ArrDelay")
            .then(function() {
                flightTestPart3_2();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart3");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Add genUnique (map to get uniqueNum)
        function flightTestPart3_2() {
            console.log("start flightTestPart3_2", "map to get uniqueNum");
            var tableId = getFirstTableInWS(0);

            test.trigOpModal(tableId, "ArrDelay", "map")
            .then(function() {
                var $section = $("#operationsView .opSection.map");
                $section.find(".categoryMenu li[data-category='5']")
                        .trigger(fakeEvent.click);
                $section.find(".functionsMenu li:contains('genUnique')")
                        .trigger(fakeEvent.click);
                $section.find(".colNameSection .arg").val("uniqueNum");
                $("#operationsView .submit").click();
                return test.checkExists(".flexWrap.flex-mid" +
                                        " input[value='uniqueNum']:eq(0)");
            })
            .then(function() {
                return test.checkExists("#xcTable-" + tableId, null,
                                        {notExist: true});
            })
            .then(function() {
                flightTestPart4();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart3-2");
                test.fail(deferred, testName, currentTestNumber);
            });
        }

        // Filter flight table
        function flightTestPart4() {
            console.log("start flightTestPart4", "filter flight table");
            var tableId = getFirstTableInWS(0);

            test.trigOpModal(tableId, "ArrDelay", "filter")
            .then(function() {
                var $section = $("#operationsView .opSection.filter");
                $section.find(".functionsList input").val("gt")
                                .trigger(fakeEvent.enterKeydown);
                $section.find(".arg").eq(1).val("0");
                $("#operationsView .submit").click();

                return test.checkExists("#xcTable-" + tableId, null,
                                        {notExist: true});
            })
            .then(function() {
                flightTestPart5();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart4");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Upload python script
        function flightTestPart5() {
            console.log("start flightTestPart5", "upload python");
            $("#udfTab").click();
            $("#udfSection .tab[data-tab='udf-fnSection']").click();
            test.checkExists(".editArea:visible")
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

                return test.checkExists("#alertHeader:visible " +
                                       ".text:contains('Duplicate Module'), " +
                                       "#alertContent:visible .text:contains" +
                                       "('already exists')",
                                       null, {optional: true,
                                              noDilute: true});
            })
            .then(function(found) {
                if (found) {
                    if (!$("#alertContent:visible .text:contains" +
                        "('UDF module currently in use')").length) {
                        // remove to make sure the check is after upload is done
                        $("#udf-manager .udf .text:contains(ymd)").remove();
                    }
                    $("#alertActions .confirm").click();
                }
                return test.checkExists("#udf-manager .udf .text:contains(ymd)");
            })
            .then(function() {
                flightTestPart6();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart5");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Map on flight table
        function flightTestPart6() {
            console.log("start flightTestPart6", "map on flight table with udf");

            var tableId = getFirstTableInWS(0);
            test.trigOpModal(tableId, "Year", "map")
            .then(function() {
                var $section = $("#operationsView .opSection.map");
                $section.find(".categoryMenu li[data-category='9']")
                        .trigger(fakeEvent.click);
                $section.find(".functionsMenu li:contains('ymd:ymd')")
                        .trigger(fakeEvent.click);
                // Code below assumes only 1 fatPtr. If more than one, please
                // augment check accordingly
                var fatPtrPrefix = gTables[tableId].backTableMeta.valueAttrs
                .filter(function(element) {
                    return (element.type === DfFieldTypeT.DfFatptr);
                })[0].name;

                var $args = $section.find(".arg");
                $args.eq(0).val(gColPrefix + fatPtrPrefix + "::Year");
                $args.eq(1).val(gColPrefix + fatPtrPrefix + "::Month");
                $args.eq(2).val(gColPrefix + fatPtrPrefix + "::DayofMonth");
                $args.eq(3).val("YearMonthDay");

                $("#operationsView .submit").click();

                return test.checkExists("#xcTable-" + tableId, null,
                                        {notExist: true});
            })
            .then(function() {
                flightTestPart7();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart6");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Join flight table with airport table
        function flightTestPart7() {
            console.log("start flightTestPart7", "join flight and airport table");

            var tableId = getFirstTableInWS(0);
            test.trigOpModal(tableId, "Dest", "join", "join")
            .then(function() {
                // fisrt step of join
                $("#joinRightTableList").find("li:contains('airport')")
                                        .trigger(fakeEvent.mouseup);
                var rTableName = $("#joinRightTableList").find(".text").val();
                var rTableId = xcHelper.getTableId(rTableName);
                var rightClause = getColNameWithPrefix(rTableId, "iata");
                $("#mainJoin .rightClause").val(rightClause).change();
                var lTableName = $("#joinLeftTableList").find(".text").val();
                console.log($('.leftClause').val(), $('.rightClause').val());
                var newName = xcHelper.getTableName(lTableName) + '-' +
                              xcHelper.getTableName(rTableName);
                $("#joinView .btn.next").click();
                $("#joinTableNameInput").val(newName);
                $("#joinTables").click();
                return test.checkExists(".xcTableWrap .tableName[value*='" +
                                        newName + "']");
            })
            .then(function() {
                return test.checkExists("#xcTable-" + tableId,
                                        null, {notExist: true});
            })
            .then(function() {
                flightTestPart8();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart7");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Group by
        function flightTestPart8() {
            console.log("start flightTestPart8", "groupby joined table");

            var tableId = getFirstTableInWS(0);
            test.trigOpModal(tableId, "UniqueCarrier", "groupby")
            .then(function() {
                // group on UniqueCarrier having avg ArrDely_integer
                var $section = $("#operationsView .opSection.groupby");
                // test input of the field
                $section.find(".functionsList .functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);
                // $section.find(".arg").eq(1).val(gColPrefix + "ArrDelay_integer");
                $section.find(".arg").eq(1).val(gColPrefix + "ArrDelay");
                $section.find(".colNameSection .arg").val("AvgDelay");
                var newTableName = 'GB' + randInt();
                $section.find('.newTableName').val(newTableName);
                $("#operationsView .submit").click();

                return test.checkExists(".xcTableWrap .tableName[value*='" +
                                        newTableName + "']");
            })
            .then(function() {
                flightTestPart9();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart8");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Aggregate
        function flightTestPart9() {
            console.log("start flightTestPart9",
                        "aggregate the joined table on avg of ArrDelay");

            var tableId = getFirstTableInWS(0);
            test.trigOpModal(tableId, "ArrDelay", "aggregate")
            .then(function() {
                var $section = $("#operationsView .opSection.aggregate");
                $section.find(".functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);
                $("#operationsView .submit").click();

                return test.checkExists("#alertHeader:visible .text:contains(Agg)");
            })
            .then(function() {
                test.assert($("#alertContent .text").html().split(":")[1].trim()
                                               .indexOf("31.22") > -1);
                $("#alertActions .cancel").click();
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart9");
                test.fail(deferred, testName, currentTestNumber, error);
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
        test.checkExists("#worksheetTab-" + wsId)
        .then(function() {
            if ($menu.find(".tables").hasClass("xc-hidden")) {
                $("#tableListTab").click();
            }
            $(".tableListSectionTab:contains(Temporary)").click();
            return TableList.refreshOrphanList(true);
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
                console.warn($li.length, idCount + 5);
                throw "Wrong table";
            }
            $li.find(".addTableBtn").click();

            $("#orphanedTableListSection .submit.active").click();
            // switch back to worksheet list
            $("#worksheetListTab").click();
            $("#worksheetTabs .worksheetTab:first-child")
                                                .trigger(fakeEvent.mousedown);
            return test.checkExists(".xcTableWrap:eq(2) .tableTitle " +
                                    ".dropdownBox .innerBox");
        })
        .then(function() {
            console.log("move table to another worksheet");
            $("#mainFrame").scrollLeft("10000");
            $(".xcTableWrap:eq(2) .tableTitle .dropdownBox .innerBox").click();
            $("#tableMenu .moveTable").trigger(fakeEvent.mouseenter);
            $("#tableSubMenu .wsName").trigger(fakeEvent.mouseup);
            $("#tableSubMenu .moveToWorksheet .list li")
                                                .trigger(fakeEvent.mouseup);
            $("#tableSubMenu .moveToWorksheet .wsName")
                .trigger(fakeEvent.enter);

            return test.checkExists(".xcTableWrap.worksheet-" + wsId);
        })
        .then(function() {
            // rename worksheet
            console.log("rename worksheet");
            $("#worksheetTab-" + wsId + " .text").val("Multi group by")
                                        .trigger(fakeEvent.enter);
            test.assert($("#worksheetTab-" + wsId + " .text").val() ===
                        "Multi group by");
            // close workspace menu
            $("#workspaceTab .mainTab").click();
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            test.fail(deferred, testName, currentTestNumber,
                           "newWorksheetTest failed");
        });
    }

    function multiGroupByTest(deferred, testName, currentTestNumber) {
        var wsId = WSManager.getWSByIndex(1);
        var tableId = getFirstTableInWS(1);
        var newTableName;

        test.trigOpModal(tableId, "ArrDelay", "groupby")
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
            $section.find(".arg").eq(2).val(gColPrefix + "ArrDelay");
            $section.find(".arg").eq(3).val("ArrDelay_count");
            newTableName = 'GB' + randInt();
            $section.find('.newTableName').val(newTableName);
            $("#operationsView .submit").click();
            // need to check in this worksheet because
            // there is another groupby table
            return test.checkExists(".xcTableWrap.worksheet-" + wsId +
                                    " .tableName[value*='" + newTableName + "']");
        })
        .then(function() {
            var tId = $(".xcTableWrap.worksheet-" + wsId +
                    " .tableName[value*='" + newTableName + "']")
                    .closest(".xcTableWrap").data('id');
            return test.checkExists(('#dagWrap-' + tId));
        })
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function() {
            test.fail(deferred, testName, currentTestNumber,
                        "MultiGroupBy failed");
        });
    }

    function changeTypeToInteger(tableId, col) {
        var deferred = jQuery.Deferred();
        var $header;

        if (tableId == null) {
            $header = $(".flexWrap.flex-mid input[value='" + col + "']").eq(0);
            tableId = $header.closest(".xcTable").data('id');
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

        test.checkExists(".type-integer .flexWrap.flex-mid" +
                        " input[value='" + col + "']:eq(0)")
        .then(function() {
            if (tableId) {
                return test.checkExists("#xcTable-" + tableId, null,
                                        {notExist: true});
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function multiJoinTest(deferred, testName, currentTestNumber) {
        // import schedule dataset
        console.log("import schedule dataset");
        $("#dataStoresTab").click();
        var dsName = "schedule" + Math.floor(Math.random() * 1000);
        var url = testDataLoc + "indexJoin/schedule/schedule.json";
        var check = "#previewTable td:eq(1):contains(1)";
        var wsId = WSManager.getWSByIndex(1);
        var ws = WSManager.getWSById(wsId);
        var lPrefix;
        var oldTableId;

        test.loadDS(dsName, url, check)
        .then(function() {
            var innerDeferred = jQuery.Deferred();
            // XXX there is a import ds error when not do setTimeout
            // need to fix later
            setTimeout(function() {
                test.createTable(dsName)
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
            return test.trigOpModal(tableId, "class_id", "join", "join");
        })
        .then(function() {
            var rightTableId = ws.tables[0];
            oldTableId = rightTableId;
            $("#joinRightTableList").find("li[data-id='" + rightTableId + "']")
                                    .trigger(fakeEvent.mouseup);
            var lCol1 = xcHelper.getPrefixColName(lPrefix, "class_id");
            var lCol2 = xcHelper.getPrefixColName(lPrefix, "teacher_id");

            $("#mainJoin .leftClause").eq(0).val(lCol1).change();
            // $("#mainJoin .rightClause").eq(0).val("DayofMonth_integer").change();
            $("#mainJoin .rightClause").eq(0).val("DayofMonth").change();
            // add another clause
            $("#mainJoin .placeholder .btn").click();
            $("#mainJoin .leftClause").eq(1).val(lCol2).change();
            // $("#mainJoin .rightClause").eq(1).val("DayOfWeek_integer").change();
            $("#mainJoin .rightClause").eq(1).val("DayOfWeek").change();

            var lTableName = $("#joinLeftTableList").find(".text").val();
            var rTableName = $("#joinRightTableList").find(".text").val();
            var newName = xcHelper.getTableName(lTableName) + '-' +
                            xcHelper.getTableName(rTableName);
            $("#joinView .btn.next").click();
            $("#joinTableNameInput").val(newName);
            $("#joinTables").click();
            return test.checkExists(".xcTableWrap .tableName[value*='" +
                                    newName + "']");
        })
        .then(function() {
            return test.checkExists("#xcTable-" + oldTableId, null,
                                    {notExist: true});
        })
        .then(function() {
            test.assert($("#numPages").text().indexOf("1,953") > -1);
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
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
        test.checkExists(".tooltip")
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
            return (test.checkExists(".flexWrap.flex-mid" +
                                    " input[value='newclassid_string']:eq(0)"));

        })
        .then(function() {
            console.log("This test is witness to GUI-1900");
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function tableRenameTest(deferred, testName, currentTestNumber) {
        var tableId = getFirstTableInWS(1);
        $("#xcTableWrap-" + tableId + " .tableName").val("NewTableName")
                                                    .trigger(fakeEvent.enter);
        test.checkExists(".xcTableWrap .tableName[value*='New']")
        .then(function() {
            var $header = $("#xcTable-" + tableId +
                            " .flexWrap.flex-mid input[value='Month']");
            $header.parent().parent().find(".flex-right .innerBox").click();
            var $colMenu = $("#colMenu .changeDataType");
            var $colSubMenu = $('#colSubMenu');
            $colMenu.mouseover();
            $colSubMenu.find(".changeDataType .type-integer")
                .trigger(fakeEvent.mouseup);

            return test.checkExists(".type-integer .flexWrap.flex-mid" +
                                    " input[value='Month']:eq(0)");
        })
        .then(function() {
            return test.checkExists(("#xcTable-" + tableId),
                                    null, {notExist: true});
        })
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function profileTest(deferred, testName, currentTestNumber) {
        var tableId = getFirstTableInWS(1);
        // var $header = $("#xcTable-" + tableId +
        //                 " .flexWrap.flex-mid input[value='Month_integer']");
        var $header = $("#xcTable-" + tableId +
                        " .flexWrap.flex-mid input[value='Month']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        $("#colMenu .profile").trigger(fakeEvent.mouseup);
        test.checkExists([".modalHeader .text:contains('Profile')",
                         "#profileModal[data-state='finished']"], null,
                         {"asserts": [".barChart .area .xlabel:contains('205')"]})
        .then(function() {
            test.assert($(".barChart .area").length === 8);
            test.assert($(".barChart .area .xlabel:contains('205')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('207')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('193')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('626')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('163')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('134')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('153')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('272')").length > 0);
            $("#profileModal .genAgg").click();
            return test.checkExists("#profileModal .genAgg:not(:visible)");
        })
        .then(function() {
            test.assert($("#profileModal .infoSection .min").eq(0).text() ===
                        Number(1).toLocaleString());
            test.assert($("#profileModal .infoSection .count").text() ===
                        Number(1953).toLocaleString());
            test.assert($("#profileModal .infoSection .average").text() ===
                        Number(6.506912).toLocaleString());
            test.assert($("#profileModal .infoSection .sum").text() ===
                        Number(12708).toLocaleString());
            test.assert($("#profileModal .infoSection .max").eq(0).text() ===
                        Number(12).toLocaleString());

            $("#profileModal .sortSection .asc").click();
            return test.checkExists("#profileModal[data-state='finished']", null, {
                "asserts": [".barChart .area:first-child .xlabel:contains('134')"]
            });
        })
        .then(function() {
            test.assert($(".barChart .area .xlabel").eq(0).text() === "134");
            test.assert($(".barChart .area .xlabel").eq(7).text() === "626");
            $("#profileModal .close").click();
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function corrTest(deferred, testName, currentTestNumber) {
        var tableId = getFirstTableInWS(1);
        $("#xcTheadWrap-" + tableId + " .dropdownBox .innerBox").click();
        $("#tableMenu .corrAgg").trigger(fakeEvent.mouseup);
        test.checkExists("#aggModal-corr[data-state='finished']",
                        null, {"asserts": [".aggTableField:contains('-0.4')"]})
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    // Disabled due to new aggregate and correlation. Needs to be triggered
    // via toggle of tabs
    function aggTest(deferred, testName, currentTestNumber) {
        $("#aggTab").click();
        test.checkExists("#aggModal .spinny", null, {notExist: true})
        .then(function() {
            test.assert($(".aggTableField:contains('4574')").length);
            test.assert($(".aggTableField:contains('334')").length);
            $("#aggModal .close").click();
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    // XXX this is obsolote and need to be rewritten
    function schedTest(deferred, testName, currentTestNumber) {
        // // Create a schedule
        // $("#dataflowTab").click();
        // var $subTab = $("#schedulesButton");
        // if (!$subTab.hasClass("active")) {
        //     $subTab.click();
        // }

        // // on schedule form
        // schedName = "testSched" + randInt(); // globals in the module

        // $("#addSchedule").click();

        // var $form = $("#newScheduleForm");
        // $form.find(".name").val(schedName).blur()
        //     .end()
        //     .find(".datePickerPart input").focus().focus().click()
        //     .end()
        //     .find(".timePickerPart input").focus().focus().click()
        //     .end()
        //     .find(".freq1 .radioButton:eq(0)").click()
        //     .end()
        //     .find(".recurSection input").val(1);
        // $("#newScheduleForm-save").click();

        // test.checkExists("#scheduleLists .scheduleName:contains('" + schedName + "')")
        // .then(function() {
        //     $("#modScheduleForm-edit").click();
        //     $("#scheduleDetail").find(".freq1 .radioButton:eq(1)").click();
        //     $("#modScheduleForm-save").click();
        //     test.assert($("#scheduleInfos .scheduleInfo.frequency .text").text() === "hourly");
        //     test.pass(deferred, testName, currentTestNumber);
        // })
        // .fail(function(error) {
        //     test.fail(deferred, testName, currentTestNumber, error);
        // });
    }

    function dfTest(deferred, testName, currentTestNumber) {
        // Create a dataflow
        $("#workspaceTab").click();
        var $worksheetTab = $(".worksheetTab.active");
        $("#dfPanelSwitch").click();
        var worksheetId = $worksheetTab.attr("id").substring(13);
        var tId = WSManager.getAllMeta().wsInfos[worksheetId].tables[0];
        $("#dagWrap-" + tId + " .addDataFlow").click();

        // on dfModal
        dfName = "testDf" + randInt(); // globals in the module
        $("#newDFNameInput").val(dfName);


        var $section = $("#dfCreateView");
        $section.find(".selectAllWrap").click();
        $section.find("li .text:contains('class_id')")
                .siblings(".checkbox").click();

        $section.find("li .text:contains('teacher_id')")
                .siblings(".checkbox").click();
        $section.find(".confirm").click();

        var selector;

        $("#dataflowTab").click();

        test.checkExists(".dfList.disabled", null, {notExist: true})
        .then(function() {
            selector = "#dfMenu .dataFlowGroup .listBox " +
                            ".groupName:contains('" + dfName + "')";
            return test.checkExists(selector);
        })
        .then(function() {
            // focus on that df
            $(selector).click();
            selector = '.dagWrap[data-dataflowname="' + dfName +
                        '"] .dagImage';
            return test.checkExists(selector);
        })
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function retinaTest(deferred, testName, currentTestNumber) {
        // Create Parameter
        var $dfViz = $('#dfViz');
        // add param to retina
        paramName = "param" + randInt();  // globals in the module

        $("#dfParamModal .draggableParams.systemParams").addClass("hint");
        // Add parameter to export
        var $df = $('#dfViz .dagWrap[data-dataflowname="' + dfName +
                     '"]');
        $df.find(".dagTable.export").click();
        $dfViz.find(".createParamQuery").trigger(fakeEvent.mouseup);
        var $dfParamModal = $("#dfParamModal");
        test.checkExists("#dfParamModal:visible")
        .then(function() {
            $dfParamModal.find(".addParam").click();
            $dfParamModal.find(".newParam").val(paramName);
            $dfParamModal.find(".newParam").focus().focusout();
            return test.checkExists("#dfParamModal " +
                                    ".draggableParams.systemParams:not(.hint)");
        })
        .then(function() {
            $dfParamModal.find(".editableRow .defaultParam").click();
            var $draggablePill = $dfParamModal.find('.draggableDiv').eq(0);
            $dfParamModal.find("input.editableParamDiv").eq(0).val('export-' +
                $draggablePill.text() +'.csv'
            );
            $dfParamModal.find("input.editableParamDiv").eq(0).trigger('input');
            $dfParamModal.find("input.editableParamDiv").eq(1).val("Default");
            fileName = "file" + randInt();

            console.log(dfName);

            return test.checkExists("#dagModleParamList .row:first .paramName:contains('" +
                                    paramName + "')");
        })
        .then(function() {
            $('#dagModleParamList').find('.row:first .paramVal').val(fileName);
            $dfParamModal.find(".modalBottom .confirm").click();

            return test.checkExists(".dagTable.export.hasParam");
        })
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function runRetinaTest(deferred, testName, currentTestNumber) {
        $('.dagWrap[data-dataflowname="' + dfName + '"] .runNowBtn').click();
        test.checkExists("#alertHeader .text:contains('Run')")
        .then(function() {
            // If text is "Successfully ran dataflow" or
            // "Export file already exists", then all's well
            if ($("#alertContent .text").text()
                  .indexOf("Successfully ran dataflow") > -1) {
                $("#alertActions .cancel").click();
                test.pass(deferred, testName, currentTestNumber);
            } else if ($("#alertContent .text").text()
                                  .indexOf("Export file already exists") > -1) {
                console.info("Export file already exists, retina test skipped");
                $("#alertActions .confirm").click();
                test.pass(deferred, testName, currentTestNumber);

            } else {
                test.fail(deferred, testName, currentTestNumber);
            }
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function cancelRetinaTest(deferred, testName, currentTestNumber) {
        // First parameterize the node so that there is no way to duplicate
        var $dfViz = $("#dfViz");
        var $df = $('#dfViz .dagWrap[data-dataflowname="' + dfName +
                     '"]');
        $df.find(".dagTable.export").click();
        $dfViz.find(".createParamQuery").trigger(fakeEvent.mouseup);

        var $dfParamModal = $("#dfParamModal");

        var cancelFileName = fileName + fileName;
        test.checkExists("#dfParamModal:visible")
        .then(function() {
            $('#dagModleParamList').find('.row:first .paramVal')
                               .val(cancelFileName);
            $dfParamModal.find(".modalBottom .confirm").click();
            $df.find(".runNowBtn").click();
            setTimeout(function() {
                $df.find(".runNowBtn").click(); // Cancel
                test.checkExists("#alertModal:visible")
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
                        // Failed to cancel. Must wait for df to finish running
                        // else deleteRetinaTest will fail
                        console.info("Cancel failed");
                        return PromiseHelper.reject();
                    } else {
                        console.log("Some bug here:");
                        console.log($("#alertContent .text").text(), $("#alertModal")[0]);
                        return PromiseHelper.resolve();
                    }
                })
                .then(function() {
                    // Noop here
                    return PromiseHelper.resolve();
                }, function() {
                    $("#alertActions .confirm").click();
                    return test.checkExists("#alertModal:visible");
                })
                .then(function() {
                    $("#alertActions .confirm").click();
                    test.pass(deferred, testName, currentTestNumber);
                })
                .fail(function(error) {
                    test.fail(deferred, testName, currentTestNumber, error);
                });
            }, 100);
        });
    }

    function deleteRetinaTest(deferred, testName, currentTestNumber) {
        if ($("#alertActions").is(":visible")) {
            $("#alertActions button:visible").click();
        }
        test.checkExists("#alertModal:hidden")
        .then(function() {
            $("#dfMenu .dataFlowGroup .listBox .groupName:contains('" +
              dfName + "')").next(".deleteDataflow").click();
            return test.checkExists("#alertModal:visible");
        })
        .then(function() {
            $("#alertActions .confirm").click();
            $("#alertActions .cancel").click();
            // There's a change we will run into cannot delete due to
            // table in use
            return test.checkExists("#dfMenu .dataFlowGroup .listBox " +
                                    ".groupName:contains('" + dfName + "')",
                                    null, {notExist: true,
                                    optional: true});
        })
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function addDFToSchedTest(deferred, testName, currentTestNumber) {
        // Attach schedule to dataflow
        var $listBox = $("#dfMenu .dataFlowGroup .listBox").filter(function() {
            return $(this).find(".groupName").text() === dfName;
        });

        $listBox.find(".addGroup").click();

        // select schedule
        var $addScheduleCard = $("#addScheduleCard");
        var $schedList = $addScheduleCard.find(".scheduleList");
        $schedList.find(".iconWrapper").click()
                .end()
                .find("ul li:contains('" + schedName + "')")
                .trigger(fakeEvent.mouseup);
        $addScheduleCard.find("button.confirm").click();

        var selector = "#dfViz .schedulesList:contains('1')";
        test.checkExists(selector)
        .then(function() {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
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
        $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
        test.checkExists('.xcTable:visible')
        .then(function() {
            return test.checkExists(['#jsonModal .jsonWrap:eq(0)',
                                    '#jsonModal .jsonWrap:eq(1)']);
        })
        .then(function() {
            // compare matches on 2 data browser columns
            $jsonModal.find('.compareIcon').eq(0).trigger(fakeEvent.click);
            $jsonModal.find('.compareIcon').eq(1).trigger(fakeEvent.click);
            test.assert($jsonModal.find('.matched').eq(0).text() ===
                        $jsonModal.find('.matched').eq(1).text());
            // click on a 3rd column and compare matches
            $activeTable.find('.jsonElement').eq(2).trigger(fakeEvent.mousedown);
            $activeTable.find('.jsonElement').eq(2).trigger(fakeEvent.mousedown);
            $('#jsonModal .compareIcon').eq(2).trigger(fakeEvent.click);
            test.assert($jsonModal.find('.matched').eq(0).text() ===
                        $jsonModal.find('.matched').eq(2).text() &&
                        $jsonModal.find('.matched').eq(1).text() ===
                        $jsonModal.find('.matched').eq(2).text());
            test.assert($jsonModal.find('.partial:eq(0)').text() !==
                        $jsonModal.find('.partial:eq(1)').text());
            test.assert($jsonModal.find('.partial:eq(0) > div').length ===
                        $jsonModal.find('.partial:eq(1) > div').length);

            // generate new column in table
            var $div = $jsonModal.find(".matched:eq(2) > div .jKey").eq(0);
            var clickedName = $div.text();
            $div.trigger(fakeEvent.click);
            var $newTh = $('.xcTable:visible').eq(0).find('.th.selectedCell');

            var colName = $newTh.find('.editableHead').val();
            test.assert(colName.length > 1, "assert colname exists");
            test.assert(clickedName.indexOf(colName) > -1, "assert colName match in json modal");

            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(function(error) {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    // ================ HELPER FUNCTION =====================================//
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
        test.assert(tableId != null);
        return tableId;
    }

    return FlightTest;
}({}, jQuery));