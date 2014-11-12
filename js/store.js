// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gDsToNameTrans = {};
var gTableOrderLookup = {};
var gWorksheetName = [];

function getWorksheet(index) {
    if (!gWorksheetName) {
        console.log("Nothing has ever been stored ever!");
        gWorksheetName = [];
    }
    if (gWorksheetName.length <= index) {
        console.log("No such index");
        return (null);
    }
    return (gWorksheetName[index]);
}

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

function getDsId(datasetName) {
    if (!gDsToNameTrans) {
        console.log("Nothing has ever been stored ever!");
        gDsToNameTrans = {};
    }
    for (var key in gDsToNameTrans) {
        if (gDsToNameTrans[key] == datasetName) {
            return (key);
        }
    }

    console.log("No such datasetId has been saved before");
    return (0);
}

function getOrder(tName) {
    if (!gTableOrderLookup) {
        console.log("Nothing has ever been stored ever!");
        gTableOrderLookup = {};
    }
    if (tName in gTableOrderLookup) {
        return (gTableOrderLookup[tName]);
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

function setOrder(tName, order) {
    gTableOrderLookup[tName] = order;
}

function setWorksheetName(index, name) {
    gWorksheetName[index] = name;
}

function commitToStorage() {
    var stringed = JSON.stringify(gTableIndicesLookup);
    var stringed2 = JSON.stringify(gDsToNameTrans);
    var stringed3 = JSON.stringify(gTableOrderLookup);
    var stringed4 = JSON.stringify(gWorksheetName);
    localStorage["TILookup"] = stringed;
    localStorage["DSName"] = stringed2;
    localStorage["TOLookup"] = stringed3;
    localStorage["WSName"] = stringed4;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        gTableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    if (localStorage["DSName"]) {
        gDsToNameTrans = JSON.parse(localStorage["DSName"]);
    }
    if (localStorage["TOLookup"]) {
        gTableOrderLookup = JSON.parse(localStorage["TOLookup"]);
    }
    if (localStorage["WSName"]) {
        gWorksheetName = JSON.parse(localStorage["WSName"]);
    }
}
