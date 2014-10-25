// Auto run
var urlTableName = getUrlVars()["tablename"];
var tableName = urlTableName || "userId";
var gResultSetId = XcalarGetTableId(tableName);

var resultSetCount = XcalarGetCount(tableName);
var numPages = Math.ceil(resultSetCount / gNumEntriesPerPage);
console.log(resultSetCount);

function freeAllResultSets() {
    XcalarSetFree(gResultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
