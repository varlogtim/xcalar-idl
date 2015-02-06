// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gTableDirectionLookup = {};
var gWorksheetName = [];
var gTableOrderLookup = [];

function emptyAllStorage() {
    localStorage.removeItem("TILookup");
    localStorage.removeItem("TDLookup");
    localStorage.removeItem("WSName"); 
    localStorage.removeItem("TOLookup");
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

function getDirection(tName) {
    if (!gTableDirectionLookup) {
        console.log("Nothing has ever been stored ever!");
        gTableDirectionLookup = {};
    }
    if (tName in gTableDirectionLookup) {
        return (gTableDirectionLookup[tName]);
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

function setDirection(tName, order) {
    gTableDirectionLookup[tName] = order;
}

function commitToStorage() {
    setTableOrder();
    var stringed = JSON.stringify(gTableIndicesLookup);
    var stringed2 = JSON.stringify(gTableDirectionLookup);
    var stringed3 = JSON.stringify(gWorksheetName);
    var stringed4 = JSON.stringify(gTableOrderLookup);
    localStorage["TILookup"] = stringed;
    localStorage["TDLookup"] = stringed2;
    localStorage["WSName"] = stringed3;
    localStorage["TOLookup"] = stringed4;
}

function readFromStorage() {
    if (localStorage["TILookup"]) {
        gTableIndicesLookup = JSON.parse(localStorage["TILookup"]);
    }
    if (localStorage["TDLookup"]) {
        gTableDirectionLookup = JSON.parse(localStorage["TDLookup"]);
    }
    if (localStorage["WSName"]) {
        gWorksheetName = JSON.parse(localStorage["WSName"]);
    }
    if (localStorage["TOLookup"]) {
        gTableOrderLookup = JSON.parse(localStorage["TOLookup"]);
    }

    var datasets = XcalarGetDatasets();
    var numDatasets = datasets.numDatasets;
    // clear localStorage is no datasets are loaded
    if (numDatasets == 0 || numDatasets == null) {
        emptyAllStorage();
        gTableIndicesLookup = {};
        gTableDirectionLookup = {};
        gWorksheetName = [];
        gTableOrderLookup = [];
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

function setTableOrder() {
    if (gTables.length == 0) {
        return;
    }
    var tables = [];
    for (var i = 0; i < gTables.length; i++) {
        tables.push(gTables[i].frontTableName);
    }
    gTableOrderLookup = tables;
}