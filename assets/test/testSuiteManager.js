window.TestSuiteManager = (function(TestSuiteManager) {

    var windowRefs = [];
    var checkInterval;

    TestSuiteManager.setup = function() {
        $(".run").click(function() {
            startRun();
        });

        $(".clear").click(function() {
            clearForm();
        });

        $(".closeAll").click(function() {
            closeAll();
        });

        $(".closeAll").hide();
    };

    TestSuiteManager.reportResults = function(id, results) {
        console.log(id, results);
        $(".results .row").eq(id).find(".rightCol").html("Fail: " +
            results.fail + ", Pass: " + results.pass + ", Skip: " +
            results.skip + ", Time: " + results.time + "s");
        if (results.fail > 0) {
            $(".results .row").eq(id).addClass("fail");
        } else {
            var cur = $(".overall").text();
            var nums = cur.split("/");
            $(".overall").text((parseInt(nums[0]) + 1) + "/" + nums[1]);
            $(".results .row").eq(id).addClass("pass");
        }
    };

    TestSuiteManager.getAllWindowRefs = function() {
        return windowRefs;
    };

    TestSuiteManager.clearInterval = function() {
        clearInterval(checkInterval);
        checkInterval = undefined;
    };

    function startRun() {
        // Check arguments are valid. If not, populate with defaults
        var $inputs = $(".input");
        var numUsers = parseInt($inputs.eq(0).val());
        if (isNaN(numUsers)) {
            numUsers = 1;
            $inputs.eq(0).val(1);
        }
        var delay = parseInt($inputs.eq(1).val());
        if (isNaN(delay)) {
            delay = 0;
            $inputs.eq(1).val(0);
        }
        var animate = $inputs.eq(2).val();
        if (animate !== "y" && animate !== "n") {
            animate = "y";
            $inputs.eq(2).val("y");
        }
        var cleanup = $inputs.eq(3).val();
        if (cleanup !== "y" && cleanup !== "n" && cleanup !== "force") {
            cleanup = "y";
            $inputs.eq(3).val("y");
        }
        var close = $inputs.eq(4).val();
        if (close !== "y" && close !== "n") {
            close = "y";
            $inputs.eq(4).val("y");
        }
        var hostname = $inputs.eq(5).val();
        if ($.trim(hostname).length === 0) {
            hostname = "http://localhost";
            $inputs.eq(5).val(hostname);
        }

        var mode = $inputs.eq(6).val();
        if (mode !== "ten" && mode !== "hundred") {
            mode = "";
            $inputs.eq(6).val(mode);
        }

        // Disable the start button
        $(".run").addClass("inactive");
        $(".input").attr("disabled", true);
        $(".closeAll").show();
        $(".results").html("");

        // Start the run
        windowRefs = [];
        var i = 0;
        var curDelay = 0;
        for (i = 0; i<numUsers; i++) {
            var urlString = hostname + "/testSuite.html?test=y&noPopup=y";
            if (delay > 0) {
                urlString += "&delay=" + curDelay;
            }
            if (animate === "y") {
                urlString += "&animation=y";
            }
            if (cleanup !== "n") {
                urlString += "&cleanup=" + cleanup;
            }
            if (close !== "n") {
                urlString += "&close=" + close;
            }
            if (mode !== "") {
                urlString += "&mode=" + mode;
            }
            // Generate a random username
            var username = "ts-" + Math.ceil(Math.random() * 1000000);
            urlString += "&user=" + username;
            urlString += "&id=" + i;
            var ref = window.open(urlString);
            windowRefs.push(ref);

            curDelay += delay;
            $(".results").append('<div class="row">' +
              '<div class="leftCol">Instance ' + i + '</div>' +
              '<div class="rightCol">Running...</div>' +
            '</div>');
        }
        $(".overall").html("0/"+numUsers);
        startCloseCheck(numUsers);

    }

    function clearForm() {
        $(".input").val("");
    }

    function closeAll() {
        TestSuiteManager.clearInterval();
        var i = 0;
        for (i = 0; i<windowRefs.length; i++) {
            windowRefs[i].close();
        }
        $(".input").attr("disabled", false);
        $(".run").removeClass("inactive");
    }

    function startCloseCheck(numUsers) {
        clearInterval(checkInterval);
        checkInterval = setInterval(function() {
            closeCheckReported(numUsers);
        }, 500);
    }

    function closeCheckReported(numUsers) {
        var id = 0;
        for (id = 0; id<numUsers; id++) {
            if (windowRefs[id].closed && $(".results .row").eq(id)
                               .find(".rightCol").text().indexOf("Run") === 0) {
                $(".results .row").eq(id).find(".rightCol")
                                  .text("Closed by user prior to completion");
                $(".results .row").eq(id).addClass("close");
            }
        }
        var allDone = true;
        for (id = 0; id<numUsers; id++) {
            if (!$(".results .row").eq(id).hasClass("pass") &&
                !$(".results .row").eq(id).hasClass("fail") &&
                !$(".results .row").eq(id).hasClass("close")) {
                allDone = false;
            }
        }
        if (allDone) {
            TestSuiteManager.clearInterval();
            $(".input").attr("disabled", false);
            $(".run").removeClass("inactive");
        }
    }

    return (TestSuiteManager);
}({}));

$(document).ready(function() {
    TestSuiteManager.setup();
});

function reportResults(id, results) {
    TestSuiteManager.reportResults(id, results);
}