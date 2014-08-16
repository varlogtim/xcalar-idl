// Auto run
var tName = getUrlVars()["tablename"];
$("#searchBar").val('tablename = "'+tName+'"');
var tableName = tName;
var resultSetId = XcalarGetTableId(tableName);

function freeAllResultSets() {
    XcalarSetFree(resultSetId);    
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
