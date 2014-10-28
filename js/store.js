// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gDsToNameTrans = {};

function getIndex(tName) {
    if (!gTableIndicesLookup) {
        console.log("Nothing has ever been stored ever!");
        gTableIndicesLookup = {};
    }
    if (tName in gTableIndicesLookup) {
        return (gTableIndicesLookup[tName]);
    } else {
        console.log("No such table has been saved before");
        return (null);
    }
    return (null);
}

function getDsName(datasetId) {
    if (!gDsToNameTrans) {
        console.log("Nothing has ever been stored ever!");
        gDsToNameTrans = {};
    }
    if (datasetId in gDsToNameTrans) {
        return (gDsToNameTrans[datasetId]);
    } else {
        console.log("No such datasetId has been saved before");
        return (null);
    }
    return (null);
}

function setIndex(tName, index) {
    gTableIndicesLookup[tName] = index;
}

function setDsToName(name, datasetId) {
    gDsToNameTrans[datasetId] = name;
}

function commitToStorage() {
    var stringed = JSON.stringify(gTableIndicesLookup);
    var stringed2 = JSON.stringify(gDsToNameTrans);
    localStorage["TILookup"] = stringed;
    localStorage["DSName"] = stringed2;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        gTableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    if (localStorage["DSName"]) {
        gDsToNameTrans = JSON.parse(localStorage["DSName"]);
    }
    // console.log(gTableIndicesLookup);
}
