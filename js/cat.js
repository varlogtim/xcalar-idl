// Auto run
var gUrlTableName = getUrlVars()["tablename"];
var gTableName = gUrlTableName || "userId";
// XXX: Hack for faster testing
// autoLoad();
var gResultSetId = XcalarGetTableId(gTableName);
var resultSetCount = XcalarGetCount(gTableName);
var gNumPages = Math.ceil(resultSetCount / gNumEntriesPerPage);

function freeAllResultSets() {
    XcalarSetFree(gResultSetId);    
}

function autoLoad() {
    if (XcalarGetTables().numTables == 0) {
        var id = XcalarLoad("file:///var/tmp/yelp/user", "JSON");
        setTimeout(function() {
            XcalarIndexFromDataset(id, "user_id", "userId");
        }, 3000);
    setTimeout(function() {
        console.log("Done indexing");
    }, 10000);
    }
}

$(window).unload(
    function() {
        freeAllResultSets();
    }
);
