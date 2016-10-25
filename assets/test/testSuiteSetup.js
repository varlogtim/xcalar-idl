/* visit testSuite.html
 *  params:
 *      user: userName to use, default will be testSuite + random suffix
 *      test: only set to true then can we trigger teststuite
 *      delay:  dealy time before running test suite
 *      animation: if testsuite should run with animation
 *      clean if teststuite should clean table after finishing
 * example: 
 *  http://localhost:8888/testSuite.html?test=true&delay=2000&user=test&clean=true
 */
window.TestSuiteSetup = (function(TestSuiteSetup) {
    var testSuiteKey = "autoTestsuite";

    TestSuiteSetup.setup = function() {
        var params = getSearchParameters();
        autoLogin(params["user"]);
    };

    TestSuiteSetup.initialize = function() {
        // in case another trigger of Shortcuts.createWorkbook
        localStorage.autoLogin = false;
        Shortcuts.setup();

        var params = getSearchParameters();
        var runTest = parseBooleanParam(params["test"]);

        StartManager.setup()
        .then(function() {
            if (!runTest) {
                return;
            }

            var toTest = sessionStorage.getItem(testSuiteKey);
            if (toTest != null) {
                // next time not auto run it
                sessionStorage.removeItem(testSuiteKey);
                return autoRunTestSuite();
            } else {
                return autoCreateWorkbook();
            }
        })
        .fail(function(error) {
            if (runTest && error === WKBKTStr.NoWkbk) {
                return autoCreateWorkbook();
            }
        });
    };

    function autoLogin(user) {
        if (user == null) {
            var suffixNum = Math.ceil(Math.random() * 1000);
            user = "testSuite" + suffixNum;
        }
        // XXX this may need to be replace after we have authentiaction
        sessionStorage.getItem("xcalar-fullUsername", user);
        sessionStorage.setItem("xcalar-username", user);
    }

    function autoCreateWorkbook() {
        var activeWorksheet = WSManager.getActiveWS();
        if (activeWorksheet != null) {
            console.warn("This user is used to test before");
            Workbook.show(true);
        }

        sessionStorage.setItem(testSuiteKey, "true");
        return Shortcuts.createWorkbook();
    }

    function autoRunTestSuite() {
        var params = getSearchParameters();
        var delay = Number(params["timeout"]);

        if (isNaN(delay)) {
            delay = 0;
        }

        var clean = parseBooleanParam(params["clean"]);
        var animation = parseBooleanParam(params["animation"]);

        // console.log("delay", delay, "clean", clean, "animation", animation)
        setTimeout(function() {
            TestSuite.run(animation, clean)
            .then(function(res) {
                console.info(res);
            });
        }, delay);
    }

    function parseBooleanParam(param) {
        if (param === "true") {
            return true;
        } else {
            return false;
        }
    }

    function getSearchParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
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

    return (TestSuiteSetup);
}({}));
