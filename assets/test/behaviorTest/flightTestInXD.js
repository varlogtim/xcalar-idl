window.FlightTestInXD = (function(FlightTestInXD, $) {
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

    FlightTestInXD.run = function(hasAnimation, toClean, noPopup, mode, withUndo,
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
        // test.add(newWorksheetTest, "NewWorksheetTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(multiGroupByTest, "MultiGroupByTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(multiJoinTest, "MultiJoinTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(columnRenameTest, "ColumnRenameTest",
        //               defaultTimeout, TestCaseDisabled); // disabled
        // test.add(tableRenameTest, "TableRenameTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(profileTest, "ProfileTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(corrTest, "CorrelationTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(aggTest, "QuickAggregateTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(schedTest, "ScheduleTest",
        //               defaultTimeout, TestCaseDisabled); // disabled
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
        // test.add(jsonModalTest, "JsonModalTest",
        //               defaultTimeout, TestCaseEnabled);
        // test.add(IMDPanelTest, "IMDPanelTest",
        //               defaultTimeout, TestCaseEnabled);
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

        const flightDS = "flight" + randInt();
        const airpotDS = "airport" + randInt();
        const flightPrefix = "flight" + randInt();
        const airportPrefix = "airport" + randInt();

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
            $("#dagButton").click();
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
            $("#udfSection .tab[data-tab='udf-fnSection']").click();
            test.checkExists(".editArea:visible")
            .then(() => {
                var udfPath = UDF.getCurrWorkbookPath() + "ymd";
                var selector = '#udf-manager .text[data-udf-path="' + udfPath + '"]';
                if (!$(selector).length) {
                    var editor = UDF.getEditor();
                    editor.setValue('def ymd(year, month, day):\n' +
                        '    if int(month) < 10:\n' +
                        '        month = "0" + str(month)\n' +
                        '    if int(day) < 10:\n' +
                        '        day = "0" + str(day)\n' +
                        '    return str(year) + str(month) + str(day)');
                    $("#udf-fnName").val("ymd");
                    $("#udf-fnUpload").click();
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
            const $panel = $("#mapOpPanel");
            test.assert($panel.hasClass("xc-hidden") === false);

            $panel.find(".categoryMenu li[data-category='9']")
                .trigger(fakeEvent.click);
            $panel.find(".functionsMenu li:contains('ymd:ymd')")
                .trigger(fakeEvent.click);
            const year = xcHelper.getPrefixColName(flightPrefix, "Year");
            const month = xcHelper.getPrefixColName(flightPrefix, "Month");
            const day = xcHelper.getPrefixColName(flightPrefix, "DayofMonth");
            const $args = $panel.find(".arg");
            fillArgInPanel($args.eq(0), gColPrefix + year);
            fillArgInPanel($args.eq(1), gColPrefix + month);
            fillArgInPanel($args.eq(2), gColPrefix + day);
            fillArgInPanel($args.eq(3), "YearMonthDay");
            $panel.find(".submit").click();

            test.hasNodeWithState(nodeId, DagNodeState.Configured)
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
            test.createDatasetNode(airpotDS, airportPrefix)
            .then((parentNodeId2) => {
                const parents = [parentNodeId, parentNodeId2];
                nodeId = test.createNodeAndOpenPanel(parents, DagNodeType.Join);
                const $panel = $("#joinOpPanel");
                test.assert($panel.hasClass("xc-hidden") === false);
                $panel.find('.mainTable [data-xcid="leftColDropdown"]')
                .find("li:contains(Dest)").trigger(fakeEvent.mouseup);

                $panel.find('.mainTable [data-xcid="rightColDropdown"]')
                .find("li:contains(iata)").trigger(fakeEvent.mouseup);
                
                $panel.find(".bottomSection .btn:contains(Next)").click();
                $panel.find(".bottomSection .btn:contains(Save)").click();
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
            const $node = DagView.getNode(finalNodeId);
            test.nodeMenuAction($node, "executeNode");

            test.hasNodeWithState(finalNodeId, DagNodeState.Complete)
            .then(() => {
                test.nodeMenuAction($node, "previewAgg");
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

    function IMDPanelTest(deferred, testName, currentTestNumber) {
        /** This test the main functionality of the IMD Panel (publish/update table,
         * get to the latest table, etc.)
        It does the following:
        2. Loads in one dataset (i.e., a-0.txt)
        3. Randomly generates table name
        4. Creates table
        5. Opens IMD extension
        6. Selects the right cols for Primary Key and Operator
        7. Publishes table
        8. Asserts existence of tables in the panel, # of rows, source name,
        batch ID
        9. Loads in another dataset (i.e., a-1.txt)
        10. Updates the published table and repeats 8.
        11. Clicks "Latest" on the IMD Panel to generate table in worksheets
        12. Asserts the # of rows and table name for the generated table
        */
        // Object.defineProperty(Array.prototype, '-1', {
        //     get() { return this[this.length - 1] }
        //   }); // used for negative indexing

        // test starts here
        createNewWs();

        function createNewWs() {
            // start running the IMDPanel test by working on a new worksheet
            console.log("start IMDPanelTest", "add new worksheet");
            var $menu = $("#workspaceMenu");
            if (!$menu.hasClass("active")) {
                // open workspace menu
                $("#workspaceTab .mainTab").click();
            }

            $("#addWorksheet").click();
            var wsId = WSManager.getWSByIndex(2);
            test.checkExists("#worksheetTab-" + wsId)
            .then(function() {
                importDataset();
            })
            .fail(function(error) {
                console.error(error, "add new worksheet");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function importDataset() {
            console.log("start IMDPanelTest", "import a-0.txt");
            $("#dataStoresTab").click();
            var a0Name = "a0-" + randInt();
            loada0(a0Name)
            .then(function() {
                sendToWorksheet(a0Name);
            })
            .fail(function(error) {
                console.error(error, "import a-0.txt");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function loada0(a0Name) {
            var a0check = "#previewTable td:eq(1):contains(Receipt0000)";
            var a0url = testDataLoc + "imd/" + test.mode + "a-0.txt";
            return test.loadDS(a0Name, a0url, a0check);
        }

        function sendToWorksheet(a0Name) {
            console.log("doing IMDPanelTest", "send a-0 to worksheet");
            test.createTable(a0Name)
            .then(function() {
                publishTable(a0Name);
            })
            .fail(function(error) {
                console.error(error, "send a-0 to worksheet");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function publishTable(a0Name) {
            console.log("doing IMDPanelTest", "publish a-0 to IMD");
            openIMDExtension("publish")
            .then(function() {
                $(".field [class='argument type-string focusable']")
                .eq(0).val(a0Name);

                var $args = $(".field [class='argument type-column focusable']");
                $args.eq(0).val(gColPrefix + a0Name + "::ScripNo");
                $args.eq(1).val(gColPrefix + a0Name + "::Op");
                $("#extension-ops-submit").click();

                return assertExistence(a0Name);
            })
            .then(function() {
                updatePubTable(a0Name);
            })
            .fail(function(error) {
                console.error(error, "publish a-0 to IMD");
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function openIMDExtension(action) {
            $("#extensionTab").click();

            test.assert(action === "publish" ||
            action === "update", "can't open extension");
            $("[class='xc-action func'][data-name='" + action + "'] .action").click();
            return PromiseHelper.resolve();
        }

        function assertExistence(a0Name) {
            var deferred = PromiseHelper.deferred();
            console.log("doing IMDPanelTest", "find a-0 publishing history");
            var $imdPanel = $("#imdView");
            $("#imdTab").click();
            test.checkExists("#imdView", null, {notExist: false})
            .then(function() {
                $imdPanel.find(".refreshList").click();
                return test.checkExists("#imdView .activeTablesList.tableList",
                null, {notExist: false});
            })
            .then(function() {
                var $section = $imdPanel.find(".activeTablesList.tableList");
                $section.find("div[data-name='" + a0Name + "']").mousedown();
                $imdPanel.find(".update-prompt").find(".close").click();
                return test.checkExists("#imdView .tableDetailRow .sourceName",
                    null, {notExist: false});
            })
            .then(function() {
                var originalName = $imdPanel.find(".tableDetailRow")
                    .find(".sourceName").attr("data-original-title");
                test.assert(originalName.substring(0, originalName.indexOf("#")) === a0Name,
            "published table name incompatible");
                var batchId = $imdPanel.find(".tableDetailRow").find(".batchId").text();
                test.assert(batchId === "0", "published table batchID incompatible");
                var colNum = $imdPanel.find(".tableDetailRow").find(".lastCol").text();
                test.assert(colNum === "1,000", "published table #col incompatible");
                return deferred.resolve();
            })
            .fail(function(error) {
                console.error(error, "finding a-0 publishing history");
                test.fail(deferred, testName, currentTestNumber, error);
                return deferred.fail();
            });

            return deferred.promise();
        }

        function updatePubTable(prevPubName) {
            var errMsg = "import a-1.txt";
            console.log("doing IMDPanelTest", errMsg);
            $("#dataStoresTab").click();
            var a1Name = "a1-" + randInt();
            var a1check = "#previewTable td:eq(1):contains(Receipt0000)";
            var a1url = testDataLoc + "imd/" + test.mode + "a-1.txt";
            var wsId = WSManager.getWSByIndex(2);
            var ws = WSManager.getWSById(wsId);
            var tableId = null;
            test.loadDS(a1Name, a1url, a1check)
            .then(function() {
                errMsg = "send a-1 to worksheet";
                console.log("doing IMDPanelTest", errMsg);
                return test.createTable(a1Name);
            })
            .then(function() {
                errMsg = "change column type 1";
                tableId = ws.tables[1];
                return changeTypeToInteger(tableId, "Cost");
            })
            .then(function() {
                errMsg = "change column type 2";
                tableId = ws.tables[1];
                return changeTypeToInteger(tableId, "Color");
            })
            .then(function() {
                errMsg = "change column type 3";
                tableId = ws.tables[1];
                return changeTypeToInteger(tableId, "Quantity");
            })
            .then(function() {
                errMsg = "open IMD extension";
                console.log("doing IMDPanelTest", errMsg);
                return openIMDExtension("update");
            })
            .then(function() {
                var deferred = PromiseHelper.deferred();
                errMsg = "update a-1 to IMD";
                console.log("doing IMDPanelTest", errMsg);

                $(".field [class='argument type-string focusable']")
                    .eq(0).val(prevPubName);

                var $args = $(".field [class='argument type-column focusable']");
                $args.eq(0).val(gColPrefix + a1Name + "::ScripNo");
                $args.eq(1).val(gColPrefix + a1Name + "::Op");
                $("#extension-ops-submit").click();

                return generateLatestInWorksheet(prevPubName, a1Name);
            })
            .fail(function(error) {
                console.error(error, errMsg);
                test.fail(deferred, testName, currentTestNumber, error);
            });
        }

        function generateLatestInWorksheet(prevPubName, a1Name) {
            var $imdPanel = $("#imdView");
            var errMsg = "generate the latest table";
            console.log("doing IMDPanelTest", errMsg);
            $("#imdTab").click();
            var $section = $("#imdView .activeTablesList.tableList");
            // $section.find(".checkbox"); used to click checkbox

            // wait for the imd panel to be visible
            test.checkExists("#imdView", null, {notExist: false})
            .then(function() {
                $imdPanel.find(".refreshList").click();
                return test.checkExists("#imdView .activeTablesList.tableList",
                null, {notExist: false});
            })
            .then(function() {
                // select the updated table
                $section.find("div[data-name='" + prevPubName + "']").mousedown();
                $imdPanel.find(".update-prompt").find(".close").click();
                // wait until the detailed content got updated
                return test.checkExists("#imdView .tableDetailContent" +
                    " .tableDetailRow:eq(1)", null, {notExist: false});
            })
            .then(function() {
                errMsg = "check detailed table info";
                console.log("doing IMDPanelTest", errMsg);
                var $updatedDetailRow = $imdPanel.find(".tableDetailContent" +
                    " .tableDetailRow").eq(0);
                var originalName = $updatedDetailRow.find(".sourceName")
                    .attr("data-original-title");
                test.assert(originalName.substring(0, originalName.indexOf("#"))
                === a1Name);
                var batchId = $updatedDetailRow.find(".batchId").text();
                test.assert(batchId === "1");
                var colNum = $updatedDetailRow.find(".lastCol").text();
                test.assert(colNum === "16");

                // send latest table to worksheet
                $section.find("div[data-name='" + prevPubName + "']").mousedown();
                $imdPanel.find(".update-prompt").find(".btn.latest").click();
                // is it necessary to refresh???
                $imdPanel.find(".refreshList").click();
                return PromiseHelper.resolve();
            })
            .then(function() {
                errMsg = "check imd worksheet info";
                console.log("doing IMDPanelTest", errMsg);
                var $menu = $("#workspaceMenu");
                if (!$menu.hasClass("active")) {
                    // open workspace menu
                    $("#workspaceTab .mainTab").click();
                }
                $("#worksheetButton").click();
                return PromiseHelper.resolve();
            })
            .then(function() {
                // the following behavior is used to make sure that the
                // table loads after clicking "Latest". However, it does
                // not truly mimic the user behavior and needs to be
                // rewritten in the future
                $("#worksheetListTab").click();
                $("#tableListTab").click();
                $(".tableListSectionTab:contains(Temporary)").click();
                return TableList.refreshOrphanList(true);
            })
            .then(function() {
                $(".tableListSectionTab:contains(Active)").click();
                // sub-optimal behavior ends here
                // check if the newly generated worksheet exists
                var wsId = WSManager.getWSByIndex(2);
                return test.checkExists(".xcTableWrap.worksheet-" + wsId +
                    " .tableName[value*='" + prevPubName + "']");
            })
            .then(function() {
                errMsg = "check table name and column info";
                console.log("doing IMDPanelTest", errMsg);
                test.assert($("#activeTablesList").find(".tableName").text()
                    .indexOf(prevPubName) > -1);
                test.assert($("#numPages").text().indexOf("998") > -1);
                test.pass(deferred, testName, currentTestNumber);
            })
            .fail(function(error) {
                console.error(error, errMsg);
                test.fail(deferred, testName, currentTestNumber,
                    "IMDPanelTest failed");
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
            var idCount = startTableId;
            var $li = $("#orphanedTablesList .tableInfo").filter(function () {
                try {
                    return $(this).data("id") == (idCount + 5);
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

    // XXX TODO use change type node
    function changeTypeToInteger(srcNodeId, colName) {
        var deferred = PromiseHelper.deferred();
        var destColName = xcHelper.parsePrefixColName(colName).name;
        var nodeId = test.createNodeAndOpenPanel([srcNodeId], DagNodeType.Map);
        var $panel = $("#mapOpPanel");
        test.assert($panel.hasClass("xc-hidden") === false);

        $panel.find(".categoryMenu li[data-category='8']")
            .trigger(fakeEvent.click);
        $panel.find(".functionsMenu li:contains('int')")
            .trigger(fakeEvent.click);
        
        var $args = $panel.find(".argsSection .arg");
        fillArgInPanel($args.eq(0), gColPrefix + colName);
        fillArgInPanel($args.eq(1), 10);
        fillArgInPanel($args.eq(2), destColName);
        $panel.find(".submit").click();

        test.hasNodeWithState(nodeId, DagNodeState.Configured)
        .then(() => {
            deferred.resolve(nodeId);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function fillArgInPanel($arg, val) {
        $arg.val(val).trigger("change");
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
            var innerDeferred = PromiseHelper.deferred();
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
        .then(function() {
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
        //     .find(".timePickerArea input").focus().focus().click()
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
        var params = DF.getParamMap();
        fileName = "file" + randInt();
        params[paramName] = {value: fileName, isEmpty: false};

        $("#dfParamModal .draggableParams.systemParams").addClass("hint");
        // Add parameter to export
        var $df = $('#dfViz .dagWrap[data-dataflowname="' + dfName +
                     '"]');
        $df.find(".operationTypeWrap.export").click();
        $dfViz.find(".createParamQuery").trigger(fakeEvent.mouseup);
        var $dfParamModal = $("#dfParamModal");
        test.checkExists("#dfParamModal:visible")
        .then(function() {
            return test.checkExists("#dfParamModal " +
                                    ".draggableParams.systemParams:not(.hint)");
        })
        .then(function() {
            $dfParamModal.find(".editableRow .defaultParam").click();
            var $draggablePill = $dfParamModal.find('.draggableDiv').eq(0);
            $dfParamModal.find("input.editableParamDiv").eq(0).val('export-' +
                "<" + paramName +'>.csv'
            );
            $dfParamModal.find("input.editableParamDiv").eq(0).trigger('input');
            $dfParamModal.find("input.editableParamDiv").eq(1).val("Default");

            console.log(dfName);

            $dfParamModal.find(".modalBottom .confirm").click();

            return test.checkExists(".operationTypeWrap.export.hasParam");
        })
        .then(function() {
            var $runNowBtn = $('.dagWrap[data-dataflowname="' + dfName + '"] .runNowBtn');
            if ($runNowBtn.hasClass("xc-disabled")) {
                var check = '.dagWrap[data-dataflowname="' + dfName + '"] .runNowBtn:not(.xc-disabled)';
                return test.checkExists(check);
            }
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
        $df.find(".operationTypeWrap.export").click();
        $dfViz.find(".createParamQuery").trigger(fakeEvent.mouseup);

        var $dfParamModal = $("#dfParamModal");

        var cancelFileName = fileName + fileName;
        test.checkExists("#dfParamModal:visible")
        .then(function() {
            var params = DF.getParamMap();
            params[paramName] = {value: cancelFileName, isEmpty: false};

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

    function getFirstTableInWS(worksheetIndex) {
        var wsId = WSManager.getWSByIndex(worksheetIndex);
        var tableId = WSManager.getWSById(wsId).tables[0];
        test.assert(tableId != null);
        return tableId;
    }

    return FlightTestInXD;
}({}, jQuery));