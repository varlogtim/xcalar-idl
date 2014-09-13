// Auto run
var tName = getUrlVars()["tablename"];
$("#searchBar").val('tablename = "'+tName+'"');
var tableName = tName;
var resultSetId = XcalarGetTableId(tableName);

var resultSetCount = XcalarGetCount(tableName);
console.log(resultSetCount);

function freeAllResultSets() {
    XcalarSetFree(resultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
