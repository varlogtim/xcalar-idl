// Auto run
var urlTableName = getUrlVars()["tablename"];
var tableName = urlTableName || "userId";
var resultSetId = XcalarGetTableId(tableName);

var resultSetCount = XcalarGetCount(tableName);
var numPages = Math.ceil(resultSetCount / numEntriesPerPage);
console.log(resultSetCount);

function freeAllResultSets() {
    XcalarSetFree(resultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
