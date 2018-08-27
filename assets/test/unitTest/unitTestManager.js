var allResults = [];
var testsTriggered = [];
window.UnitTestManager = (function(UnitTestManager, $) {
    var allTestNames = ["Test Test", "Authentication Test","Ephemeral Constructor Test","Persistent Constructor Test", "XVM Test", "Dataflow Panel Test","DFCard Test","DF Test","Schedule related Test","Upload Dataflow Test","Dataset-Datastore Module Test","Dataset-DSCart Test","Dataset-DSExport Test","Dataset-DSForm Test","Dataset-DSObj Test","Dataset-DSPreview Test","Dataset-DSTable Test","Datastore-DSTargetManger Test","Dataset-File Browser Test","Dataset-File Previewer Test","UExtTF","InstallerCommon Common Test","Bottom Menu Test","Help Test","Xcalar Log Test","Main Menu Test","UDF Test","About Modal Test","Agg Modal Test","Alert Modal Test","Delete Table Modal Test","DFParamModal Test","DSInfoModal Test","ExtModal Test","FileInfoModal Test","License Modal Test","LiveHelp Modal Test","Profile-Profile Chart Test","Profile-Profile Engins Test","Profile-Profile Selector Test","Profile-Profile Test","SkewInfoModal Test","SupTicketModal Test","Workbook Info Modal Test","Workbook Preview Test","Admin Alert Card Test","Admin Test","MonitorConfig Test","Monitor Graph Test","MonitorLog Test","Monitor Panel Test","QueryManager Test","User Setting Test","xcManager Test","SQL-SQlApi Test","SQL-SQLEditor Test","skRFPredictor","xcSuggest","Concurrency Test","PromiseHelper Test","Repeat Test","XcalarThrift Test","XcAssert Test","xcFunction Test","xcHelper Test","XcMenu Test","xcSocket Test","xcTooltip Test", "XcSupport Test", "XcTracker","adminTools Test","WorkbookManager Test","Workbook- Workbook Pane Test","Aggregates Test","ColManager Test","DagEdit Test","Dag Panel Test","DFCreateView Test","ExportView Test","FnBar Test","JoinView Test","JsonModal Test","OperationsView Test","ProjectView Test","RowManager Test","RowScroller Test","Smart Cast View Test","Sort View Test","TableList Test","TblAnim Test","TableManager Test","TableMenu Test","TablePrefixManager Test","Union View Test","Worksheet Test", "XIApi Test", "XcUser Test", "Memory Alert Test"];
    var numTests = allTestNames.length;
    var username;
    var wkbkName;

    function modifyTestResult(struct) {
        console.log(struct);
        allResults.push(struct);
        return struct.fail === 0;
    }

    UnitTestManager.setup = function() {
        window.addEventListener("message", function(event) {
            var struct = event.data;
            try {
                var s = JSON.parse(struct);
                // testId, testName, pass, fail, time
                var success = modifyTestResult(s);
                // start next test
                var nextTest = parseInt(s.testId) + 1;

                if (!success) {
                    finishTest("Test Fails!");
                } else if (nextTest >= numTests) {
                    finishTest("All tests done!");
                } else {
                    runTest(nextTest);
                }
            } catch (e) {
                finishTest(e);
            }
        });

        username = "unitTestUser" + Math.ceil(Math.random()*100000);
        wkbkName = "WB" + Math.ceil(Math.random() * 1000);
    };

    function runTest(testNum) {
        testsTriggered.push(testNum);
        console.log("Running test:" + allTestNames[testNum]);
        var url = new URL("unitTest.html", window.location.href);
        url.searchParams.set("type", "unitTest");
        url.searchParams.set("test", allTestNames[testNum]);
        url.searchParams.set("testId", testNum);
        url.searchParams.set("createWorkbook", wkbkName);
        url.searchParams.set("user", username);
        url.searchParams.set("workbook", wkbkName);

        $("#unitTestFrame").attr("src", url.href);
    }

    function finishTest(msg) {
        // used for puppeteer
        $("body").append('<div id="testFinish">Test Fnish</div>');
        alert(msg);
    }

    UnitTestManager.startTest = function() {
        runTest(0);
    };

    return (UnitTestManager);
}({}, jQuery));
