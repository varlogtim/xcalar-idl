class StateMachine {
    constructor(verbosity, iterations) {
        this.iterations = iterations || 120;
        this.verbosity = verbosity;

        //Instantiate All states here
        this.workbookState = new WorkbookState(verbosity);

        this.currentState = this.workbookState;
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

    FuncTestSuite.run = function(testName, hasAnimation, toClean, noPopup, mode, withUndo, timeDilation, iterations) {
        console.log("FuncTest: " + userIdName + "::" + sessionName);
        console.log("arguments: " + testName + ", " + hasAnimation + ", " + toClean + ", " + noPopup + ", " + mode + ", " + withUndo + ", " + timeDilation);

        // If a state machine already exists, don't bother creating one
        if (!stateMachine) {
            stateMachine = new StateMachine(verbosity, iterations);
        }

        test = TestSuite.createTest();
        test.setMode(mode);
        initializeTests();
        test.run(hasAnimation, toClean, noPopup, withUndo, timeDilation);

    };

    function initializeTests() {
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
