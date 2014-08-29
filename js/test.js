// Do you want to do short circuit testing?
var shortCircuit = true;
// Enter in the names of all the test functions that you want to run. If
// the name of the function is not here, it will not be run.
var testFns = [testMainScreen, testLoad];


function testStart() {
    // List all tests to be conducted here in order.
    // If you want to run all the tests even if there are failures, uncomment
    shortCircuit = false;
    for (var i = 0; i<testFns.length; i++) {
        var f = testFns[i];
        var result = f();
        if (shortCircuit && !result) {
            break;
        }
    }
}

function testMainScreen() {
    // Make sure that we have a table with id and value on the main screen
    if ($("#autoGenTable tr").length < 1) {
        alert("Main did not load properly");
        console.log("Main did not load properly");
        if (shortCircuit) {
            return (false);
        }
    }
    if ($("#autoGenTable tr:first td").length != 2) {
        var string = "Main table has wrong number of columns. Should be 2";
        string += "Your value is";
        string += $("#autoGenTable tr:first td").length;
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }

    }
    if ($("#headCol1").text().indexOf("ID") < 0) { 
        var string = "Your first col heading should be ID.";
        string += "Your value is";
        string += $("#headCol1").text();
        alert(string);
        console.log(string); 
        if (shortCircuit) {
            return (false);
        }
    }

    if ($("#headCol2").text().indexOf("Value") < 0) { 
        var string = "Your second col heading should be Value.";
        string += "Your value is";
        string += $("#headCol2").text();
        alert(string);
        console.log(string); 
        if (shortCircuit) {
            return (false);
        }
    }

    var succeed = true;
    for (var i = 0; i < $("#autoGenTable tr:gt(0)").length; i++) {
        var row = $("#autoGenTable tr:gt(0)")[i];
        if ($(row).find("td").length != 2) {
            var string = "You should have 2 entries per row.";
            string += "You have";
            string += $(row).find("td").length;
            alert(string);
            console.log(string);
            succeed = false;
        }
        if ($(row).find("td:first").text() != (i+1)) {
             var string = "Your first col should have index"+(i+1);
            string += "You have";
            string += $(row).find("td:first").text();
            alert(string);
            console.log(string);
            succeed = false;
        }
    }
    if (!succeed && shortCircuit) {
        return (false);
    }

    return (true);
    
}
function testLoad() {
    $(".menuItems:contains('Load')").click();
    setTimeout(function() { 
    if ($("#dataTypeSelector").height() <= 0 ||
        $("#dataTypeSelector").width() <= 0) {
        var string = "dataTypeSelector does not exist!";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }
    }, 2000);
    return (true);
     
}

$(document).ready(
    function() {
        console.log("Starting test in 2 Sec");
        setTimeout(function() {
            testStart();
        }, 2000);
    }
);
