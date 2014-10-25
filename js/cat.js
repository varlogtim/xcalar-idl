// Auto run
var gUrlTableName = getUrlVars()["tablename"];
var gTableName = gUrlTableName || "userId";
var gResultSetId = XcalarGetTableId(gTableName);
var resultSetCount = XcalarGetCount(gTableName);
var gNumPages = Math.ceil(resultSetCount / gNumEntriesPerPage);

function freeAllResultSets() {
    XcalarSetFree(gResultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
