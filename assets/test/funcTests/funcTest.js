/*
This file defines the base class for us to run the XD Func Test

Notice: activate a workbook will cause a hard-reloading and wipe all the
state info out. We use sessionStorage here to store the corresponding
test state info.

visit funTest.html
params:
    user: userName to use, default will be admin
    mode: nothing, ten or hundred - ds size
    animation: if testsuite should run with animation, y to show
    clean: if teststuite should clean table after finishing, y to clean
    noPopup: y to suppress alert with final results
    timeDilations: slow internet factor
    verbosity: "Verbose" to output the log
    iterations: iterations for the test
example:
    http://localhost:8888/funcTest.html?user=test&clean=y&close=y

*/
class StateMachine {
    constructor(verbosity, iterations, test) {
        //Retrieve the iterations from KVStore if it's being set
        this.iterations = iterations;
        this.verbosity = verbosity;
        this.test = test;

        //Instantiate workbook states here
        this.statesMap = new Map();
        this.statesMap.set("Workbook", new WorkbookState(this, verbosity));

        this.stateName = xcSessionStorage.getItem('xdFuncTestStateName') || "Workbook";
        // Only instantiate a AdvancedMode/SQLMode state when we're inside a active workbook
        if (this.stateName != "Workbook") {
            this.statesMap.set("AdvancedMode", new AdvancedModeState(this, verbosity));
            this.statesMap.set("SQLMode", new SQLModeState(this, verbosity));
        } else {
            $("#homeBtn").click(); // Go back to the workbook panel;
        }
        this.currentState = this.statesMap.get(this.stateName);
        xcSessionStorage.removeItem('xdFuncTestStateName');
    }

    async run() {
        await this.prepareData();
        let advancedModeMAXRun = Util.getRandomInt(60) + 30;
        let SQLModeMAXRun = Util.getRandomInt(40) + 20;
        while (this.iterations > 0) {
            this.currentState = await this.currentState.takeOneAction()
            if (this.currentState == null) { //WorkbookState hit the activate
                xcSessionStorage.setItem('xdFuncTestIterations', this.iterations-1);
                break;
            }

            // Mode Switch
            if (this.currentState.name == "AdvancedMode" && this.currentState.run >= advancedModeMAXRun) {
                this.currentState.run = 0;
                this.currentState = this.statesMap.get('SQLMode');
            }
            else if (this.currentState.name == "SQLMode" && this.currentState.run >= SQLModeMAXRun) {
                this.currentState.run = 0;
                this.currentState = this.statesMap.get(Util.pickRandom([...this.statesMap.keys()]));

                if (this.currentState.name == "Workbook") {
                    $("#homeBtn").click(); // Go back to the workbook panel;
                }
            }
            this.iterations -= 1;
            xcSessionStorage.setItem('xdFuncTestIterations', this.iterations);
        }
    }

    async prepareData() {
        // load some datasets for functests
        if (this.stateName != 'Workbook' && xcSessionStorage.getItem("xdFuncTestFirstTimeInit") == undefined) {
            XVM.setMode(XVM.Mode.Advanced); // Set it to advanced mode to load DS
            const nameBase = "AIRPORT" + Math.floor(Math.random() * 10000);
            const check = "#previewTable td:eq(1):contains(00M)";
            const url = "/netstore/datasets/" + "flight/" + this.test.mode + "airports.csv";
            const dsName = nameBase;
            await this.test.loadDS(dsName, url, check, true);

            // publish table

            // Need to append the suffix to publish table out from it
            const tmpDSName = nameBase + PTblManager.DSSuffix;
            await this.test.loadDS(tmpDSName, url, check, true);
            const tblName = nameBase;

            PTblManager.Instance.addDatasetTable(tmpDSName);
            let ds = DS.listDatasets().filter((ds) => {return ds.id.endsWith(tmpDSName)})[0];
            let dsSchema = await DS.getDSBasicInfo(ds.id);
            let schema = dsSchema[ds.id].columns;
            await PTblManager.Instance.createTableFromDataset(ds.id, tblName, schema);
            DS.refresh(); // refresh gridview area
            XVM.setMode(this.currentState.mode);
            xcSessionStorage.setItem('xdFuncTestFirstTimeInit', 'false');
        }
    }
}

window.FuncTestSuite = (function($, FuncTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var defaultTimeout = 72000000; // 1200min
    var verbosity = "Verbose"; // Verbose or Silent
    var stateMachine;

    FuncTestSuite.setup = function() {
        // console.log("FuncTest: " + userIdName + "::" + sessionName);
        // console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);
        var params = getUrlParameters();
        var user = params.user || 'admin';
        autoLogin(user);
        var iterations = getIterations(params);
        if (!xcSessionStorage.getItem('xdFuncTestTotalRun')) {
            xcSessionStorage.setItem('xdFuncTestTotalRun', iterations);
        }
        if (!xcSessionStorage.getItem('xdFuncTestStartTime')) {
            var d = new Date();
            xcSessionStorage.setItem('xdFuncTestStartTime', d.getTime());
        }
        if (verbosity) {
            this.verbosity = verbosity;
        }
        xcSessionStorage.setItem('xdFuncTestIterations', iterations);
    };

    FuncTestSuite.run = function() {
        var deferred = PromiseHelper.deferred();
        xcManager.setup()
        .then(function(){
            return runFuncTest();
        })
        .fail(function(err){
            if (err === WKBKTStr.NoWkbk) {
                // No workbook should be fine
                return runFuncTest();
            } else {
                err = wrapFailError(err);
                deferred.reject(err);
            }
        })
        return deferred.promise();
    }

    function runFuncTest() {
        var params = getUrlParameters();

        var clean = parseBooleanParam(params.cleanup);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var timeDilation = params.timeDilation;
        var verbosity = params.verbosity || "Verbose";

        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        var iterations = getIterations(params);
        if (!xcSessionStorage.getItem('xdFuncTestTotalRun')) {
            xcSessionStorage.setItem('xdFuncTestTotalRun', iterations);
        }
        if (!xcSessionStorage.getItem('xdFuncTestStartTime')) {
            var d = new Date();
            xcSessionStorage.setItem('xdFuncTestStartTime', d.getTime());
        }
        stateMachine = new StateMachine(verbosity, iterations, test);
        return test.run(animation, clean, noPopup, undefined, timeDilation);
    }

    function initializeTests() {
        // add tests
        test.add(funcTest, "XD Func Tests", defaultTimeout, TestCaseEnabled);
    }

    async function funcTest(deferred, testName, currentTestNumber) {
        try {
            await stateMachine.run();
            var currentRun = parseInt(xcSessionStorage.getItem('xdFuncTestIterations'));
            var totalRun = parseInt(xcSessionStorage.getItem('xdFuncTestTotalRun'));
            test.startTime = parseInt(xcSessionStorage.getItem('xdFuncTestStartTime'));
            if (currentRun == 0) {
                console.log("XD Functests passed with " + totalRun + " runs !!");
                totalRun = null;
                cleanupSessionStorage();
                test.pass(deferred, testName, totalRun);
            }
        } catch (error) {
            var currentRun = parseInt(xcSessionStorage.getItem('xdFuncTestIterations'));
            var totalRun = parseInt(xcSessionStorage.getItem('xdFuncTestTotalRun'));
            test.startTime = parseInt(xcSessionStorage.getItem('xdFuncTestStartTime'));
            console.log("XD Functests Failed!");
            console.log(error)
            cleanupSessionStorage();
            test.fail(deferred, testName, totalRun-currentRun, error);
        }
    }

    function wrapFailError(error) {
        if (typeof error !== "object") {
            error = {"error": error};
        }
        if (error.fail == null) {
            error.fail = 1;
        }
        if (error.pass == null) {
            error.pass = 0;
        }
        return error;
    }

    /* -------------------------------Helper Function------------------------------- */
    function getIterations(params) {
        var defaultIterations = 150;
        var iterations = xcSessionStorage.getItem('xdFuncTestIterations') || params.iterations;
        if (iterations) {
            return parseInt(iterations);
        }
        return defaultIterations;
    }

    function autoLogin(user) {
        xcSessionStorage.setItem("xcalar-username", user);
    }

    function getUrlParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
    }

    function parseBooleanParam(param) {
        if (param === "y") {
            return true;
        } else {
            return false;
        }
    }

    function transformToAssocArray(prmstr) {
        var params = {};
        var prmarr = prmstr.split("&");
        for ( var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params[tmparr[0]] = tmparr[1];
        }
        return params;
    }

    function cleanupSessionStorage() {
        xcSessionStorage.removeItem('xdFuncTestTotalRun');
        xcSessionStorage.removeItem('xdFuncTestIterations');
        xcSessionStorage.removeItem('xdFuncTestStartTime');
        xcSessionStorage.removeItem('xdFuncTestFirstTimeInit');
    }
    /* -------------------------------Helper Function------------------------------- */

    return (FuncTestSuite);
}(jQuery, {}));
