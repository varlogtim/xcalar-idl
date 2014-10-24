// Auto run
var urlTableName = getUrlVars()["tablename"];
var tableName = urlTableName || "userId";
var resultSetId = XcalarGetTableId(tableName);
// var resultSetId = 2342;

var resultSetCount = XcalarGetCount(tableName);
// var resultSetCount = 30;
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
