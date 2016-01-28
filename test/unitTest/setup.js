// setup should happen before load test files
mocha.setup("bdd");

// global
expect = chai.expect;
window.unitTestMode = true;

function setup() {    
    $(document).ready(function() {
        $("#xc").load("index.html", function() {
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
            window.location.href = "index.html";
        })
        .fail(function(error) {
            console.error(error);
        })
    });
}
