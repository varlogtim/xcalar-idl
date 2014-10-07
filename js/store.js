// Lookup table that translates between tablename and the indices that it should
// be holding

var tableIndicesLookup = {};

function getIndex(tName) {
    if (!tableIndicesLookup) {
        console.log("Nothing has ever been stored ever!");
        tableIndicesLookup = {};
    }
    if (tName in tableIndicesLookup) {
        return (tableIndicesLookup[tName]);
    } else {
        console.log("No such table has been saved before");
        return (null);
    }
}

function setIndex(tName, index) {
    tableIndicesLookup[tName] = index;
}

function commitToStorage() {
    var stringed = JSON.stringify(tableIndicesLookup);
    localStorage["TILookup"] = stringed;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        tableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    console.log(tableIndicesLookup);
}
