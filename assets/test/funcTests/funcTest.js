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

        // Only instantiate a AdvancedMode state when we're inside a active workbook
        if (this.stateName == 'AdvancedMode' && this.statesMap.get('AdvancedMode') === undefined) {
            this.statesMap.set("AdvancedMode", new AdvancedModeState(this, verbosity));
        }
        this.currentState = this.statesMap.get(this.stateName);
        xcSessionStorage.removeItem('xdFuncTestStateName');
    }

    async run() {
        // load some datasets for functests
        if (this.stateName == 'AdvancedMode' && xcSessionStorage.getItem("xdFuncTestFirstTimeInit") == undefined) {
            const airpotDS = "airport" + Math.floor(Math.random() * 10000);
            const check = "#previewTable td:eq(1):contains(00M)";
            const url = "/netstore/datasets/" + "flight/" + this.test.mode + "airports.csv";
            await this.test.loadDS(airpotDS, url, check);
            xcSessionStorage.setItem('xdFuncTestFirstTimeInit', 'false');
        }
        while (this.iterations > 0) {
            this.currentState = await this.currentState.takeOneAction()
            if (this.currentState == null) { //WorkbookState hit the activate
                xcSessionStorage.setItem('xdFuncTestIterations', this.iterations-1);
                break;
            }
            this.iterations -= 1;
            xcSessionStorage.setItem('xdFuncTestIterations', this.iterations);
        }
    }
}

window.FuncTestSuite = (function($, FuncTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var hasUser = true;
    var defaultIterations = 120;
    var defaultTimeout = 72000000; // 1200min
    var verbosity = "Verbose"; // Verbose or Silent
    var stateMachine;

    FuncTestSuite.setup = function() {
        // console.log("FuncTest: " + userIdName + "::" + sessionName);
        // console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);
        var params = getUrlParameters();
        var user = params.user;
        if (user == null) {
            hasUser = false;
        } else {
            autoLogin(user);
        }
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

    function getIterations(params) {
        var iterations = xcSessionStorage.getItem('xdFuncTestIterations') || params.iterations;
        if (iterations) {
            return parseInt(iterations);
        }
        return defaultIterations;
    }

    function runFuncTest() {
        var params = getUrlParameters();

        var clean = parseBooleanParam(params.cleanup);
        var animation = parseBooleanParam(params.animation);
        var noPopup = parseBooleanParam(params.noPopup);
        var mode = params.mode;
        var timeDilation = params.timeDilation;

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
        stateMachine = new StateMachine(this.verbosity, iterations, test);
        return test.run(animation, clean, noPopup, undefined, timeDilation);
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

    function initializeTests() {
        // add tests
        test.add(funcTest, "XD Func Tests", defaultTimeout, TestCaseEnabled);
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

    return (FuncTestSuite);
}(jQuery, {}));
