// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gTableOrderLookup = {};
var gWorksheetName = [];

function emptyAllStorage() {
    localStorage.removeItem("TILookup");
    localStorage.removeItem("DSName");
    localStorage.removeItem("TOLookup");
    localStorage.removeItem("WSName"); 
}

function getIndex(tName) {
    if (!gTableIndicesLookup) {
        console.log("Nothing has ever been stored ever!");
        gTableIndicesLookup = {};
    }
    if (tName in gTableIndicesLookup) {
        return (gTableIndicesLookup[tName]['columns']);
    } else {
        console.log("No such table has been saved before");
        return (null);
    }
    return (null);
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

// XXX Move these 2 functions away from here?
function getDsId(datasetName) {
    var datasetObj = XcalarGetDatasets();
    var numDatasets = datasetObj.numDatasets;
    for (var i = 0; i<datasetObj.numDatasets; i++) {
        if (datasetObj.datasets[i].name == datasetName) {
            return (datasetObj.datasets[i].datasetId);
        }
    }
    console.log("Couldn't find a dataset with name: "+datasetName);
    return (0);
}

function getDsName(datasetId) {
    var datasetObj = XcalarGetDatasets();
    var numDatasets = datasetObj.numDatasets;
    for (var i = 0; i<datasetObj.numDatasets; i++) {
        if (datasetObj.datasets[i].datasetId == datasetId) {
            return (datasetObj.datasets[i].name);
        }
    }
    console.log("Couldn't find a dataset with id: "+datasetId);
    return (0);
}


function setIndex(tName, index) {
    gTableIndicesLookup[tName] = {};
    gTableIndicesLookup[tName]['columns'] = index;
    gTableIndicesLookup[tName]['active'] = true;

}

function setOrder(tName, order) {
    gTableOrderLookup[tName] = order;
}

function commitToStorage() {
    var stringed = JSON.stringify(gTableIndicesLookup);
    var stringed3 = JSON.stringify(gTableOrderLookup);
    var stringed4 = JSON.stringify(gWorksheetName);
    localStorage["TILookup"] = stringed;
    localStorage["TOLookup"] = stringed3;
    localStorage["WSName"] = stringed4;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        gTableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    if (localStorage["TOLookup"]) {
        gTableOrderLookup = JSON.parse(localStorage["TOLookup"]);
    }
    if (localStorage["WSName"]) {
        gWorksheetName = JSON.parse(localStorage["WSName"]);
    }

    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    // clear localStorage is no datasets are loaded
    if (numDatasets == 0 || numDatasets == null) {
        emptyAllStorage();
        gTableIndicesLookup = {};
        gTableOrderLookup = {};
        gWorksheetName = [];
    } else {
        var tables = XcalarGetTables();
        var numTables = tables.numTables;
        for (i = 0; i<numTables; i++) {
            var tableName = tables.tables[i].tableName;
            if (!gTableIndicesLookup[tableName]) {
                //XXX user may not want all the tables to display
                // so we will need to fix this
                // setIndex(tableName, []);
            }
        }
    }   
    commitToStorage(); 
}

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
  
function setWorksheetName(index, name) {
    console.log(arguments, 'setWorksheetName');
    gWorksheetName[index] = name;
}

function removeWorksheetName(index) {
    gWorksheetName.splice(index-2, 1);
}
