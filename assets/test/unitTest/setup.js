// setup should happen before load test files
// --badil: will stop when first test fails
mocha.setup({
    "ui": "bdd",
    "bail": true
});

// global
expect = chai.expect;
assert = chai.assert
window.unitTestMode = true;

function setup() {    
    $(document).ready(function() {
        $("#xc").load("../../../index.html", function() {
            // after load the index.html, run mocha
            mocha.run();
        });
    });

    $("#hideXC").click(function() {
        $("#xc").hide();
    });

    $("#showXC").click(function() {
        $("#xc").show();
    });

    $('#backXC').click(function() {
        freeAllResultSetsSync()
        .then(Support.releaseSession)
        .then(function() {
            removeUnloadPrompt();
            window.location.href = "../../../index.html";
        })
        .fail(function(error) {
            console.error(error);
        });
    });

    $('#toggleTestSize').click(function() {
        $('#mocha').toggleClass('small');
    });

    $('#toggleXCSize').click(function() {
        $('#xc').toggleClass('large');
    });
}
