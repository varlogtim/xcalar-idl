// Auto run
var gUrlTableName;
var gTableName;
// XXX: Hack for faster testing
// autoLoad();
var gResultSetId;
var resultSetCount;
var gNumPages;

function setCatGlobals(table) {
    gUrlTableName = getUrlVars()["tablename"];
    gTableName = gUrlTableName || table;
    // XXX: Hack for faster testing
    // autoLoad();
    gResultSetId = XcalarGetTableId(gTableName);
    resultSetCount = XcalarGetCount(gTableName);

    gNumPages = Math.ceil(resultSetCount / gNumEntriesPerPage);
}


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
