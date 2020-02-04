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

    const MultiJoin = "Multi Join";
    const MultiGroupBy = "Multi GroupBy";

    let flightDS = "flight" + randInt();
    let airpotDS = "airport" + randInt();
    let flightPrefix = "flight" + randInt();
    let airportPrefix = "airport" + randInt();

    FlightTest.run = function(hasAnimation, toClean, noPopup, mode, timeDilation) {
        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        return  XVM.setMode(XVM.Mode.Advanced)
        .then(() => {
            return test.run(hasAnimation, toClean, noPopup, timeDilation);
        });
    };

    // =============== ADD TESTS TO ACTIVATE THEM HERE ===================== //
    function initializeTests() {
        test.add(flightTest, "FlightTest", defaultTimeout, TestCaseEnabled);
        test.add(linkInLinkOutTest, "Link In, Link Out Test", defaultTimeout, TestCaseEnabled);
        test.add(multiGroupByTest, "MultiGroupByTest", defaultTimeout, TestCaseEnabled);
        test.add(multiJoinTest, "MultiJoinTest", defaultTimeout, TestCaseEnabled);
        test.add(profileTest, "ProfileTest", defaultTimeout, TestCaseEnabled);
        test.add(corrTest, "CorrelationTest", defaultTimeout, TestCaseEnabled);
        test.add(aggTest, "QuickAggregateTest", defaultTimeout, TestCaseEnabled);
        test.add(jsonModalTest, "JsonModalTest", defaultTimeout, TestCaseEnabled);
        // test.add(dfTest, "DFTest",
        //               defaultTimeout, TestCaseEnabled);
        // // Temporarily disabled due to thrift change
        // test.add(retinaTest, "RetinaTest",
        //               defaultTimeout, TestCaseEnabled);
        // // interactive mode not run test
        // var retinaEnabled = (XVM.getLicenseMode() === XcalarMode.Mod) ?
        //                     TestCaseDisabled : TestCaseEnabled;
        // // XXX temporarily disable it because of the expotNode bug by json query change

        // test.add(runRetinaTest, "RunRetinaTest",
        //               defaultTimeout, retinaEnabled);
        // test.add(cancelRetinaTest, "CancelRetinaTest",
        //               defaultTimeout, retinaEnabled);
        // test.add(deleteRetinaTest, "DeleteRetinaTest",
        //               defaultTimeout, TestCaseDisabled); // disabled
        // test.add(addDFToSchedTest, "AddDFToScheduleTest",
        //               defaultTimeout, TestCaseDisabled); // disabled
        // test.add(IMDPanelTest, "IMDPanelTest",
        //               defaultTimeout, TestCaseEnabled);
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

        flightDS = "flight" + randInt();
        airpotDS = "airport" + randInt();
        flightPrefix = "flight" + randInt();
        airportPrefix = "airport" + randInt();

        flightTestPart1(flightDS, airpotDS);

        // Import dataset
        function flightTestPart1() {
            console.log("start flightTestPart1", "import dataset");
            $("#dataStoresTab").click(); // main menu tab

             // Import flight dataset
            flightTestPart1Load1(flightDS)
            .then(() => {
                // import airports dataset
                return flightTestPart1Load2();
            })
            .then(() => {
                flightTestPart2();
            })
            .fail(function(error) {
                console.error(error, "flightTestPart1");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function flightTestPart1Load1() {
            console.log("import flight dataset");
            const check = "#previewTable td:eq(1):contains(19403)";
            const url = testDataLoc + "flight/" + test.mode + "airlines";
            return test.loadDS(flightDS, url, check);
        }

        function flightTestPart1Load2() {
            console.log("import airport dataset");
            const check = "#previewTable td:eq(1):contains(00M)";
            const url = testDataLoc + "flight/" + test.mode + "airports.csv";
            return test.loadDS(airpotDS, url, check);
        }

        // create dataset node
        function flightTestPart2() {
            console.log("start flightTestPart2", "create dataset node");
            $("#sqlTab").click();
            // creat new tab
            $("#tabButton").click();

            test.createDatasetNode(flightDS, flightPrefix)
            .then((nodeId) => {
                flightTestPart3(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart2");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Change column type
        function flightTestPart3(parentNodeId) {
            console.log("start flightTestPart3", "change column type");
            const colName = xcHelper.getPrefixColName(flightPrefix, "ArrDelay");
            changeTypeToInteger(parentNodeId, colName)
            .then((nodeId) => {
                flightTestPart3_2(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart3");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Add genUnique (map to get uniqueNum)
        function flightTestPart3_2(parentNodeId) {
            console.log("start flightTestPart3_2", "map to get uniqueNum");
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Map);
            const $panel = $("#mapOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);

            $panel.find(".categoryMenu li[data-category='5']")
                .trigger(fakeEvent.click);
            $panel.find(".functionsMenu li:contains('genUnique')")
                .trigger(fakeEvent.click);

            fillArgInPanel($panel.find(".colNameSection .arg"), "uniqueNum");
            $panel.find(".submit").click();

            test.hasNodeWithState(nodeId, DagNodeState.Configured)
            .then(() => {
                flightTestPart4(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart3-2");
                test.fail(deferred, testName, currentTestNumber);
            });
        }

        // Filter flight table
        function flightTestPart4(parentNodeId) {
            console.log("start flightTestPart4", "filter flight table");
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Filter);
            const $panel = $("#filterOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);
            $panel.find(".functionsList input").val("gt")
                .trigger(fakeEvent.enterKeydown);

            const $args = $panel.find(".arg");
            fillArgInPanel($args.eq(0), "$ArrDelay");
            fillArgInPanel($args.eq(1), "0");
            $panel.find(".submit").click();

            test.hasNodeWithState(nodeId, DagNodeState.Configured)
            .then(() => {
                flightTestPart5(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart4");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Upload python script
        function flightTestPart5(parentNodeId) {
            console.log("start flightTestPart5", "upload python");
            $("#udfTab").click();
            test.checkExists("#udf-fnSection .xc-waitingBG", null, {notExist: true})
            .then(() => {
                var udfDisplayName = "ymd.py";
                var selector = '#dagListSection .udf.listWrap .udf .name:contains(' + udfDisplayName +')';
                if (!$(selector).length) {
                    $("#udfTabView .addTab").click();
                    var editor = UDFPanel.Instance.getEditor();
                    editor.setValue('def ymd(year, month, day):\n' +
                        '    if int(month) < 10:\n' +
                        '        month = "0" + str(month)\n' +
                        '    if int(day) < 10:\n' +
                        '        day = "0" + str(day)\n' +
                        '    return str(year) + str(month) + str(day)');
                        // XXX a temp hack to fix test
                        $("#udfSection .udf-fnName").val("New Module");
                        $("#udfSection").removeClass("sqlMode")
                        $("#udfSection").find(".saveFile").click();
                        $("#fileManagerSaveAsModal .saveAs input").val("ymd.py");
                        $("#fileManagerSaveAsModal .modalBottom .save").click();
                    return test.checkExists(selector);
                }
            })
            .then(() => {
                flightTestPart6(parentNodeId);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart5");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Map on flight table
        function flightTestPart6(parentNodeId) {
            console.log("start flightTestPart6", "map on flight table with udf");
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Map);
            test.wait(5000)
            .then(() => {
                const $panel = $("#mapOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);

                $panel.find(".categoryMenu li[data-category='9']")
                    .trigger(fakeEvent.click);
                $panel.find(".functionsMenu li:contains('ymd:ymd')")
                    .trigger(fakeEvent.click);
                const year = xcHelper.getPrefixColName(flightPrefix, "Year");
                const month = xcHelper.getPrefixColName(flightPrefix, "Month");
                const day = xcHelper.getPrefixColName(flightPrefix, "DayofMonth");
                let $args = $panel.find(".arg");
                fillArgInPanel($args.eq(0), gColPrefix + year);
                $args = $panel.find(".arg");
                fillArgInPanel($args.eq(1), gColPrefix + month);
                fillArgInPanel($args.eq(2), gColPrefix + day);
                fillArgInPanel($args.eq(3), "YearMonthDay");
                $panel.find(".submit").click();

                return test.hasNodeWithState(nodeId, DagNodeState.Configured);
            })
            .then(() => {
                flightTestPart7(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart6");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Join flight table with airport table
        function flightTestPart7(parentNodeId) {
            console.log("start flightTestPart7", "join flight and airport table");
            let nodeId;
            const $panel = $("#joinOpPanel");
            // XXX TODO: @Liang, I don't know why I have to do this dealy
            // but without it the column selection doesn't work

            // Liang: Init function of column dropdown is executed in async way(setTimout(0))
            // So we have to push the UI check to the next event loop
            // The in-depth reason is described in OpPanelComponentFactory.createHintDropdown()
            test.createDatasetNode(airpotDS, airportPrefix)
            .then((parentNodeId2) => {
                const parents = [parentNodeId, parentNodeId2];
                nodeId = test.createNodeAndOpenPanel(parents, DagNodeType.Join);
                test.assert($panel.hasClass("xc-hidden") === false);
                return dealyPromise(10);
            })
            .then(() => {
                return test.checkExists("#joinOpPanel #formWaitingBG", null, {notExist: true});
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-left .hintDropdown');
                // Open the dropdown, so that all LIs are filled
                $dropdown.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);

                return dealyPromise(10);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-left .hintDropdown');
                // Click a certain LI
                $dropdown.find("li:contains(Dest)").trigger(fakeEvent.mouseup);

                return dealyPromise(10);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-right .hintDropdown');
                // Open the dropdown, so that all LIs are filled
                $dropdown.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);

                return dealyPromise(10);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-right .hintDropdown');
                // Click a certain LI
                $dropdown.find("li:contains(iata)").trigger(fakeEvent.mouseup);

                return dealyPromise(10);
            })
            .then(() => {
                $panel.find(".bottomSection .btn:contains(Next)").click();
                $panel.find(".bottomSection .btn:contains(Save)").click();
                return dealyPromise(10);
            })
            .then(() => {
                return test.hasNodeWithState(nodeId, DagNodeState.Configured);
            })
            .then(() => {
                flightTestPart8(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart7");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Group by
        function flightTestPart8(parentNodeId) {
            console.log("start flightTestPart8", "groupby joined table");
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.GroupBy);
            const $panel = $("#groupByOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);

            const gbColName = xcHelper.getPrefixColName(flightPrefix, "UniqueCarrier");
            fillArgInPanel($panel.find(".gbOnArg"), gColPrefix + gbColName);
            $panel.find(".functionsList .functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);



            fillArgInPanel($panel.find(".colNameSection .arg"), "uniqueNum");
            const $args = $panel.find(".arg");
            fillArgInPanel($args.eq(1), gColPrefix + "ArrDelay");
            fillArgInPanel($panel.find(".colNameSection .arg"), "AvgDelay");
            $panel.find(".submit").click();

            test.hasNodeWithState(nodeId, DagNodeState.Configured)
            .then(() => {
                flightTestPart9(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart8");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // Aggregate
        function flightTestPart9(parentNodeId) {
            console.log("start flightTestPart9",
                        "aggregate the groupBy table on avg of ArrDelay");
            const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.Aggregate);
            const $panel = $("#aggOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);

            $panel.find(".functionsList .functionsInput").val("avg")
                        .trigger(fakeEvent.enterKeydown);
            const $args = $panel.find(".arg");
            fillArgInPanel($args.eq(0), gColPrefix + "AvgDelay");
            const aggName = gAggVarPrefix + xcHelper.randName("testAgg");
            fillArgInPanel($args.eq(1), aggName);
            $panel.find(".submit").click();

            test.hasNodeWithState(nodeId, DagNodeState.Configured)
            .then(() => {
                flightTestPart10(nodeId);
            })
            .fail((error) => {
                console.error(error, "flightTestPart9");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        // execute the dataflow
        function flightTestPart10(finalNodeId) {
            console.log("start flightTestPart10", "execute the dataflow");
            const $node = DagViewManager.Instance.getNode(finalNodeId);
            test.nodeMenuAction($node, "executeNode");

            test.executeNode(finalNodeId)
            .then(() => {
                let d = PromiseHelper.deferred();
                setTimeout(() => {
                    d.resolve(); // wait for aggregate to finish fetching
                }, 3000);
                return d.promise();
            })
            .then(() => {
                test.nodeMenuAction($node, "viewResult");
                return test.checkExists("#alertHeader:visible .text:contains(Agg)");
            })
            .then(function() {
                test.assert($("#alertContent .text").html().split(":")[1].trim()
                                            .indexOf("32.398") > -1);
                $("#alertActions .cancel").click();
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, "flightTestPart10");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }
    }

    function linkInLinkOutTest(deferred, testName, currentTestNumber) {
        // Tests add new dataflow and run using link in link out
        console.log("linkInLinkOutTest");

        console.log("find the map node before join")
        const $dagView = $("#dagView .dataflowArea.active");
        const $joinNode = $dagView.find("g.operator.join.state-Complete");
        test.assert($joinNode.length === 1);

        const joinNodeId = $joinNode.data("nodeid");
        const mapNode = DagViewManager.Instance.getActiveDag().getNode(joinNodeId).getParents()[0];
        const mapNodeId = mapNode.getId();
        const $mapNode = DagViewManager.Instance.getNode(mapNodeId);
        test.assert($mapNode.hasClass("map"));

        const dfName = $("#dagTabView .dagTab.active .name").text();
        let linkOutName;

        console.log("add link out node for map");
        createLinkOutNode(mapNodeId, "mapNodeId")
        .then((reslinkOutName) => {
            linkOutName = reslinkOutName;
            console.log("create new tab for multi join and link map node");
            $("#tabButton").click();
            return renameTab($("#dagTabView .dagTab.active"), MultiJoin);
        })
        .then(() => {
            return createLinkInNode(dfName, linkOutName);
        })
        .then(() => {
            console.log("create new tab for multi groupBy and link map node");
            $("#tabButton").click();
            return renameTab($("#dagTabView .dagTab.active"), MultiGroupBy);
        })
        .then(() => {
            return createLinkInNode(dfName, linkOutName);
        })
        .then(() => {
            console.log(testName, "passed");
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(() => {
            test.fail(deferred, testName, currentTestNumber, "linkInLinkOutTest failed");
        });
    }

    function multiGroupByTest(deferred, testName, currentTestNumber) {
        console.log("multi grouBy Test");
        // focus on multi groupBy Tab
        console.log("focus on multi groupBy Tab");
        const $tab = $("#dagTabView .dagTab").filter((_index, el) => {
            return $(el).find(".name").text() === MultiGroupBy;
        });
        test.assert($tab.length === 1);
        if (!$tab.hasClass("active")) {
            $tab.click();
        }

        console.log("find the link in node")
        const $dagView = $("#dagView .dataflowArea.active");
        const $linInNode = $dagView.find("g.operator.link.state-Complete");
        test.assert($linInNode.length === 1);
        const linkInNodeId = $linInNode.data("nodeid");

        console.log("create group by node");
        const nodeId = test.createNodeAndOpenPanel(linkInNodeId, DagNodeType.GroupBy);
        const $panel = $("#groupByOpPanel");
        console.log("choose Dest col as first group on field");

        const col1 = xcHelper.getPrefixColName(flightPrefix, "Dest");
        fillArgInPanel($panel.find(".gbOnRow.original input"), gColPrefix + col1);

        const col2 = xcHelper.getPrefixColName(flightPrefix, "AirTime");
        console.log("choose AirTime col as first group on field");
        $panel.find(".addGroupArg").click();
        fillArgInPanel($panel.find(".gbOnRow.extraArg input"), gColPrefix + col2);

        console.log("count on ArrDelay");
        $panel.find(".functionsList .functionsInput").val("count")
                        .trigger(fakeEvent.enterKeydown);
        fillArgInPanel($panel.find(".gbAgg"), gColPrefix + "ArrDelay");
        fillArgInPanel($panel.find(".colNameSection .arg"), "ArrDelay_count");
        $panel.find(".submit").click();

        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            console.log("execute group By");
            return test.executeNode(nodeId);
        })
        .then(() => {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail(() => {
            test.fail(deferred, testName, currentTestNumber, "MultiGroupBy failed");
        });
    }

    function multiJoinTest(deferred, testName, currentTestNumber) {
        console.log("multi join test");
        // import schedule dataset
        console.log("import schedule dataset");
        $("#dataStoresTab").click();
        const scheduleDS = "schedule" + Math.floor(Math.random() * 1000);
        const url = testDataLoc + "indexJoin/schedule/schedule.json";
        const check = "#previewTable td:eq(1):contains(1)";
        const schedulePrefix = "schedule" + randInt();
        let scheduleNodeId;
        let joinNodeId;

        test.loadDS(scheduleDS, url, check)
        .then(() => {
            // focus on the multi join tab
            $("#sqlTab").click();
            console.log("focus on the multi join tab");
            const $tab = $("#dagTabView .dagTab").filter((_index, el) => {
                return $(el).find(".name").text() === MultiJoin;
            });
            test.assert($tab.length === 1);
            if (!$tab.hasClass("active")) {
                $tab.click();
            }
            return test.createDatasetNode(scheduleDS, schedulePrefix);
        })
        .then((nodeId) => {
            scheduleNodeId = nodeId;

            console.log("find the link in node")
            const $dagView = $("#dagView .dataflowArea.active");
            const $linInNode = $dagView.find("g.operator.link.state-Complete");
            test.assert($linInNode.length === 1);
            const linkInNodeId = $linInNode.data("nodeid");

            console.log("cast DayOfMonth into integer");
            const col = xcHelper.getPrefixColName(flightPrefix, "DayofMonth");
            return changeTypeToInteger(linkInNodeId, col);
        })
        .then(function(castNodeId) {
            console.log("cast DayOfWeek into integer");
            const col = xcHelper.getPrefixColName(flightPrefix, "DayOfWeek");
            return changeTypeToInteger(castNodeId, col);
        })
        .then(function(flightNodeId) {
            console.log("multi join with schedule and flight");
            // join class_id, teancher_id with DayofMonth, DayOfWeek
            const lCol1 = xcHelper.getPrefixColName(schedulePrefix, "class_id");
            const lCol2 = xcHelper.getPrefixColName(schedulePrefix, "teacher_id");
            const lCols = [lCol1, lCol2];
            const rCols = ["DayofMonth", "DayOfWeek"];
            return mutiJoinHelper(scheduleNodeId, lCols, flightNodeId, rCols);
        })
        .then((nodeId) => {
            joinNodeId = nodeId;
            console.log("execute multi join");
            return test.executeNode(joinNodeId);
        })
        .then(() => {
            console.log("preview multi join result");
            const $node = DagViewManager.Instance.getNode(joinNodeId);
            test.nodeMenuAction($node, "viewResult");
            return test.checkExists("#sqlTableArea:visible .xcTableWrap");
        })
        .then(()  => {
            test.assert($("#sqlTableArea .totalRows").text().indexOf("1,953") > -1);
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail((error) => {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function mutiJoinHelper(lNodeId, lCols, rNodeId, rCols) {
        const deferred = PromiseHelper.deferred();
        const nodeId = test.createNodeAndOpenPanel([lNodeId, rNodeId], DagNodeType.Join);
        const $panel = $("#joinOpPanel");
        test.assert($panel.hasClass("xc-hidden") === false);

        console.log("add multi clause");
        for (let i = 1; i < lCols.length; i++) {
            $panel.find(".addClause button").click();
        }

        const selectDropdown = function(i) {
            return PromiseHelper.resolve()
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-left .hintDropdown').eq(i)
                $dropdown.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                return dealyPromise(0);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-left .hintDropdown').eq(i)
                $dropdown.find(`li:contains(${lCols[i]})`).trigger(fakeEvent.mouseup);
                return dealyPromise(0);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-right .hintDropdown').eq(i)
                $dropdown.find('.colNameMenuIcon').trigger(fakeEvent.mouseup);
                return dealyPromise(0);
            })
            .then(() => {
                const $dropdown = $panel.find('.mainTable .joinClause .col-right .hintDropdown').eq(i)
                $dropdown.find(`li:contains(${rCols[i]})`).trigger(fakeEvent.mouseup);
                return dealyPromise(0);
            })
        };

        const promises = [];
        for (let i = 0; i< lCols.length; i++) {
            promises.push(selectDropdown.bind(this, i));
        }

        PromiseHelper.chain(promises)
        .then(() => {
            $panel.find(".bottomSection .btn:contains(Next)").click();
            $panel.find(".bottomSection .btn:contains(Save)").click();
            return dealyPromise(0);
        })
        .then(() => {
            return test.hasNodeWithState(nodeId, DagNodeState.Configured);
        })
        .then(() => {
            deferred.resolve(nodeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function profileTest(deferred, testName, currentTestNumber) {
        console.log("Profile Test");
        const $table = $("#sqlTableArea .xcTable");
        const $header = $table.find(".flexWrap.flex-mid input[value='Month']");
        $header.parent().parent().find(".flex-right .innerBox").click();
        $("#colMenu .profile").trigger(fakeEvent.mouseup);
        test.checkExists([".modalHeader .text:contains('Profile')",
                         "#profileModal[data-state='finished']"], null,
                         {"asserts": [".barChart .area .xlabel:contains('205')"]})
        .then(() => {
            test.assert($(".barChart .area").length === 8);
            test.assert($(".barChart .area .xlabel:contains('205')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('207')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('193')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('626')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('163')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('134')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('153')").length > 0);
            test.assert($(".barChart .area .xlabel:contains('272')").length > 0);

            console.log("check genAgg")
            $("#profileModal .genAgg").click();
            return test.checkExists("#profileModal .genAgg:not(:visible)");
        })
        .then(() => {
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

            console.log("check sort");
            $("#profileModal .sortSection .asc").click();
            return test.checkExists("#profileModal[data-state='finished']", null, {
                "asserts": [".barChart .area:first-child .xlabel:contains('134')"]
            });
        })
        .then(() => {
            test.assert($(".barChart .area .xlabel").eq(0).text() === "134");
            test.assert($(".barChart .area .xlabel").eq(7).text() === "626");
            $("#profileModal .close").click();
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail((error) => {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function corrTest(deferred, testName, currentTestNumber) {
        console.log("Correlation Test");
        $("#sqlTableArea .tableMenu").click();
        $("#tableMenu .corrAgg").trigger(fakeEvent.mouseup);
        test.checkExists("#aggModal-corr[data-state='finished']",
                        null, {"asserts": [".aggTableField:contains('-0.4')"]})
        .then(() => {
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail((error) => {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function aggTest(deferred, testName, currentTestNumber) {
        console.log("Quick Aggreation Test");
        $("#aggTab").click();
        test.checkExists("#aggModal .spinny", null, {notExist: true})
        .then(() => {
            test.assert($(".aggTableField:contains('4574')").length);
            test.assert($(".aggTableField:contains('334')").length);
            $("#aggModal .close").click();
            test.pass(deferred, testName, currentTestNumber);
        })
        .fail((error) => {
            test.fail(deferred, testName, currentTestNumber, error);
        });
    }

    function jsonModalTest(deferred, testName, currentTestNumber) {
        if ($("#alertActions").is(":visible")) {
            $("#alertActions button:visible").click();
        }
        const $jsonModal = $("#jsonModal");
        const $activeTable = $("#sqlTableArea .xcTable");
        $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(0).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
        $activeTable.find('.jsonElement').eq(1).trigger(fakeEvent.mousedown);
        test.checkExists('.xcTable:visible')
        .then(() => {
            return test.checkExists(['#jsonModal .jsonWrap:eq(0)',
                                    '#jsonModal .jsonWrap:eq(1)']);
        })
        .then(() => {
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
            const $div = $jsonModal.find(".matched:eq(2) > div .jKey").eq(0);
            const clickedName = $div.text();
            $div.trigger(fakeEvent.click);
            const $newTh = $('.xcTable:visible').eq(0).find('.th.selectedCell');

            const colName = $newTh.find('.editableHead').val();
            test.assert(colName.length > 1, "assert colname exists");
            test.assert(clickedName.indexOf(colName) > -1, "assert colName match in json modal");

            test.pass(deferred, testName, currentTestNumber);
        })
        .fail((error) => {
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

    function fillArgInPanel($arg, val) {
        $arg.val(val).trigger("change");
    }

    function changeTypeToInteger(parentNodeId, colName) {
        const deferred = PromiseHelper.deferred();
        const nodeId = test.createNodeAndOpenPanel([parentNodeId], DagNodeType.Map, DagNodeSubType.Cast);
        const $panel = $("#castOpPanel");
        test.assert($panel.hasClass("xc-hidden") === false);

        // select column
        let $lists = $panel.find(".resultSection .lists");
        const $li = $panel.find(".candidateSection .listSection .lists").eq(0).find(".inputCol").filter(function() {
            return $(this).find(".colName").text() === colName;
        });

        test.assert($li.length === 1);
        $li.click();
        // select integer type
        $panel.find(".resultSection .typeList li:contains(integer)").trigger(fakeEvent.mouseup);
        $panel.find(".submit").click();

        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            deferred.resolve(nodeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function createLinkOutNode(parentNodeId, name) {
        const deferred = PromiseHelper.deferred();
        const nodeId = test.createNodeAndOpenPanel(parentNodeId, DagNodeType.DFOut);
        const $panel = $("#dfLinkOutPanel");
        const linkOutName = xcHelper.randName(name);
        $panel.find(".linkOutName input").val(linkOutName);
        $panel.find(".checkbox").click(); // check the checkbox
        $panel.find(".submit").click();
        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            return test.executeNode(nodeId);
        })
        .then(() => {
            deferred.resolve(linkOutName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function createLinkInNode(dfName, linkOutName) {
        const deferred = PromiseHelper.deferred();
        const nodeId = test.createNodeAndOpenPanel(null, DagNodeType.DFIn);
        const $panel = $("#dfLinkInPanel");
        fillArgInPanel($panel.find(".dataflowName input"), dfName);
        fillArgInPanel($panel.find(".linkOutNodeName input"), linkOutName);
        $panel.find(".bottomSection .submit").click();

        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            return test.executeNode(nodeId);
        })
        .then(() => {
            deferred.resolve(nodeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function renameTab($tab, newName) {
        // XXX TODO not sure why but run in sync way sometimes fail to rename
        // maybe related to the slowness of event propogation
        const deferred = PromiseHelper.deferred();
        $tab.find(".dragArea").dblclick();
        dealyPromise(500)
        .then(() => {
            $tab.find(".xc-input").text(newName);
            return dealyPromise(500);
        })
        .then(() => {
            $tab.find(".xc-input").focusout();
            return dealyPromise(500);
        })
        .then(() => {
            test.assert($tab.find(".name").text() === newName);
        })
        .always(() => {
            if (test.assert($tab.find(".name").text() === newName)) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        });
        return deferred.promise();
    }

    function dealyPromise(dealyTime) {
        const deferred = PromiseHelper.deferred();
        setTimeout(() => {
            deferred.resolve();
        }, dealyTime);
        return deferred.promise();
    }
    return FlightTest;
}({}, jQuery));
