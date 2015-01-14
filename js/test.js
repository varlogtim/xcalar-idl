// Do you want to do short circuit testing?
var shortCircuit = true;
// Enter in the names of all the test functions that you want to run. If
// the name of the function is not here, it will not be run.

// XXX: If the test results in the window loading into a new page, the remaining
// functions cannot be run. So right now we are avoiding this by getting the
// caller to call the next function in line. See load for more details.
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
    if ($("#xcTable tr").length < 1) {
        alert("Main did not load properly");
        console.log("Main did not load properly");
        if (shortCircuit) {
            return (false);
        }
    }
    if ($("#xcTable tr:first td").length != 2) {
        var string = "Main table has wrong number of columns. Should be 2";
        string += "Your value is";
        string += $("#xcTable tr:first td").length;
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }

    }
    if ($("#headcol0").text().indexOf("ID") < 0) { 
        var string = "Your first col heading should be ID.";
        string += "Your value is";
        string += $("#headcol0").text();
        alert(string);
        console.log(string); 
        if (shortCircuit) {
            return (false);
        }
    }

    if ($("#headcol1").text().indexOf("Value") < 0) { 
        var string = "Your second col heading should be Value.";
        string += "Your value is";
        string += $("#headcol1").text();
        alert(string);
        console.log(string); 
        if (shortCircuit) {
            return (false);
        }
    }

    var succeed = true;
    for (var i = 0; i < $("#xcTable tr:gt(0)").length; i++) {
        var row = $("#xcTable tr:gt(0)")[i];
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

function testLoadHelper() {
    if ($("#dataTypeSelector").height() <= 0 ||
        $("#dataTypeSelector").width() <= 0) {
        var string = "dataTypeSelector does not exist!";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    $("#dsTypeJSON").prop("checked", true);
    $("#selectDs").click();

    if ($("#dataTypeBox").width() <= $("#dataTypeSelector").width() ||
        $("#dataTypeBox").height() <= $("#dataTypeSelector").height()) {
        var string = "greyBox must be bigger than dataTypeBox";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    if ($("#filePathSelector").height() <= 0 ||
        $("#filePathSelector").width() <= 0) {
        var string = "dataTypeSelector does not exist!";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    $("#fileBrowser").val("file:///var/tmp/yelp/user");
    $("#selectFile").click();

    if ($("#filePathBox").width() <= $("#filePathSelector").width() ||
        $("#filePathBox").height() <= $("#filePathSelector").height()) {
        var string = "greyBox must be bigger than filePathBox";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    if ($("#keySelector").height() <= 0 ||
        $("#keySelector").width() <= 0) {
        var string = "keySelector does not exist!";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    $("#keyName").val("user_id");
    // Generate a random tablename so that it doesn't clash with existing ones
    var rand = Math.floor(Math.random() * 10000);
    var genTableName = "testTableUser"+rand;
    $("#tableName").val(genTableName);
    $("#selectName").click();

    if ($("#keySelectorBox").width() <= $("#keySelector").width() ||
        $("#keySelectorBox").height() <= $("#keySelector").height()) {
        var string = "greyBox must be bigger than keySelector";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }

    if ($("#uploadProgress").height() <= 0 ||
        $("#uploadProgress").width() <= 0) {
        var string = "uploadProgress does not exist!";
        alert(string);
        console.log(string);
        if (shortCircuit) {
            return (false);
        }
    }
}

function testLoad() {
    $(".menuItems:contains('Load')").click();
    setTimeout(testLoadHelper, 2000);
    return (true);
}

function testCat() {
    console.log("Starting cat test");
}

$(document).ready(
    setTimeout(
    function() {
        var redirect = $("td:contains('testTableUser')");
        if (redirect.length > 0) {
            console.log("Done with load test");
        } else {
            console.log("Starting test in 2 Sec");
            setTimeout(testStart, 2000);
        }
    }, 2000)
);
