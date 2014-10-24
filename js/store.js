// Lookup table that translates between tablename and the indices that it should
// be holding

var tableIndicesLookup = {};
var dsToNameTrans = {};

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
    return (null);
}

function getDsName(datasetId) {
    if (!dsToNameTrans) {
        console.log("Nothing has ever been stored ever!");
        dsToNameTrans = {};
    }
    if (datasetId in dsToNameTrans) {
        return (dsToNameTrans[datasetId]);
    } else {
        console.log("No such datasetId has been saved before");
        return (null);
    }
    return (null);
}

function setIndex(tName, index) {
    tableIndicesLookup[tName] = index;
}

function setDsToName(name, datasetId) {
    dsToNameTrans[datasetId] = name;
}

function commitToStorage() {
    var stringed = JSON.stringify(tableIndicesLookup);
    var stringed2 = JSON.stringify(dsToNameTrans);
    localStorage["TILookup"] = stringed;
    localStorage["DSName"] = stringed2;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        tableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    if (localStorage["DSName"]) {
        dsToNameTrans = JSON.parse(localStorage["DSName"]);
    }
    // console.log(tableIndicesLookup);
}
