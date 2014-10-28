// Auto run
var gUrlTableName = getUrlVars()["tablename"];
var gTableName = gUrlTableName || "userId";
// var gResultSetId = XcalarGetTableId(gTableName);
// var gResultSetId = 2342;

// var resultSetCount = XcalarGetCount(gTableName);
var resultSetCount = 400000;

var gNumPages = Math.ceil(resultSetCount / gNumEntriesPerPage);

function freeAllResultSets() {
    XcalarSetFree(gResultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
