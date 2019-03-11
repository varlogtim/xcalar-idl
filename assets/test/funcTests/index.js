class StateMachine {
    constructor(verbosity, iterations) {
        this.iterations = iterations || 120;
        this.verbosity = verbosity;

        //Instantiate All states here
        this.statesMap = new Map();
        this.statesMap.set("Workbook", new WorkbookState(this, verbosity));
        this.statesMap.set("AdvancedMode", new AdvancedModeState(this, verbosity));

        this.currentState = this.statesMap.get("AdvancedMode"); // change to workbook state
    }

    async run() {
        while (this.iterations > 0) {
            this.currentState = await this.currentState.takeOneAction()
            this.iterations -= 1;
        }
    }
}

window.FuncTestSuite = (function($, FuncTestSuite) {
    var test;
    var TestCaseEnabled = true;
    var TestCaseDisabled = false;
    var defaultTimeout = 72000000; // 1200min
    var verbosity = "Verbose"; // Verbose or Silent
    var stateMachine = undefined;

    FuncTestSuite.run = async function(testName, hasAnimation, toClean, noPopup, mode, withUndo, timeDilation, iterations) {
        console.log("FuncTest: " + userIdName + "::" + sessionName);
        console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);

        test = TestSuite.createTest();
        test.setMode(mode);
        await initializeTests();
        // If a state machine already exists, don't bother creating one
         if (!stateMachine) {
            stateMachine = new StateMachine(verbosity, iterations);
        }
        test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);

    };

    async function initializeTests() {
        // load some datasets for functests
        // #1 airlines
        const airpotDS = "airport" + Math.floor(Math.random() * 10000);
        const check = "#previewTable td:eq(1):contains(00M)";
        const url = "/netstore/datasets/" + "flight/" + test.mode + "airports.csv";
        await test.loadDS(airpotDS, url, check);

        // #2 some other

        // add tests
        test.add(funcTest, "XD Func Tests", defaultTimeout, TestCaseEnabled);
    }

    async function funcTest(deferred, testName, currentTestNumber) {
        try {
            await stateMachine.run();
            console.log("XD Functests passed!!")
            test.pass(deferred, testName, currentTestNumber);
        } catch (error) {
            console.log("XD Functests Failed!");
            console.log(error)
            test.fail(deferred, testName, currentTestNumber, error);
        }
    }

    return (FuncTestSuite);
}(jQuery, {}));
