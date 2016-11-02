// setup should happen before load test files
// --badil: will stop when first test fails
mocha.setup({
    "ui"  : "bdd",
    "bail": true,
    // must include Setup Test and optionally include other test
    // e.g. /Mocha Setup Test|Workbook Test/
    // defulat:
    // "grep": /Mocha Setup Test|.*/
    "grep": /Mocha Setup Test|Worksheet Test.*/
});
// global
expect = chai.expect;
assert = chai.assert;

function setup() {
    $(document).ready(function() {
        mocha.run();
        console.log("Setup coder coverage!!!");
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
            window.location = paths.indexAbsolute;
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

function findTestTableId(tableName) {
    if (tableName == null) {
        // this is generated in dsTableSpec.js,
        // which is the basic table we use
        tableName = 'unitTestFakeYelp';
    }

    var tableId;

    $('.xcTableWrap').each(function() {
        if ($(this).find('.tableName').val().indexOf('unitTestFakeYelp') > -1) {
            tableId = $(this).find('.hashName').text().slice(1);
            return false;
        }
    });

    if (tableId == null) {
        throw "Cannot find table: " + tableName;
    }

    return tableId;
}

function testChecker(checkFunc) {
    var deferred = jQuery.Deferred();
    var checkTime = 200;
    var outCnt = 20;
    var timeCnt = 0;

    var timer = setInterval(function() {
        var res = checkFunc();
        if (res === true) {
            // make sure graphisc shows up
            clearInterval(timer);
            deferred.resolve();
        } else if (res === null) {
            clearInterval(timer);
            deferred.reject("Check Error!");
        } else {
            console.info("check not pass yet!");
            timeCnt += 1;
            if (timeCnt > outCnt) {
                clearInterval(timer);
                console.error("Time out!");
                deferred.reject("Time out");
            }
        }
    }, checkTime);

    return deferred.promise();
}

var testDatasets = {
    "sp500": {
        "path"      : "nfs:///netstore/datasets/sp500.csv",
        "url"       : "netstore/datasets/sp500.csv",
        "format"    : "CSV",
        "fieldDelim": "\t",
        "lineDelim" : "\n",
        "hasHeader" : false,
        "moduleName": "",
        "funcName"  : "",
        "pointCheck": "#previewTable td:contains(20041101)"
    },

    "schedule": {
        "path"      : "nfs:///var/tmp/qa/indexJoin/schedule/",
        "url"       : "var/tmp/qa/indexJoin/schedule/",
        "format"    : "JSON",
        "moduleName": "",
        "funcName"  : "",
        "pointCheck": "#previewTable td:contains(1)"
    },

    "fakeYelp": {
        "path"      : "nfs:///netstore/datasets/unittest/test_yelp.json",
        "url"       : "netstore/datasets/unittest/test_yelp.json",
        "format"    : "JSON",
        "moduleName": "",
        "funcName"  : "",
        "pointCheck": "#previewTable th:eq(1):contains(yelping_since)"
    }
};
