// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gTableDirectionLookup = {};
var gWorksheetName = [];
var gTableOrderLookup = [];

// data set folder structure
var gDSObjFolder = {};

function emptyAllStorage() {
    localStorage.removeItem("TILookup");
    localStorage.removeItem("TDLookup");
    localStorage.removeItem("WSName"); 
    localStorage.removeItem("TOLookup");
    localStorage.removeItem("gDSObj");
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
    var deferred = jQuery.Deferred();

    XcalarGetDatasets()
    .done(function(datasetObj) {
        var numDatasets = datasetObj.numDatasets;
        for (var i = 0; i<datasetObj.numDatasets; i++) {
            if (datasetObj.datasets[i].name === datasetName) {
                return (deferred.resolve(datasetObj.datasets[i].datasetId));
            }
        }
        console.log("Couldn't find a dataset with name: "+datasetName);
        return (deferred.resolve(0));
    });

    return (deferred.promise());
}

function getDsName(datasetId) {
    var deferred = jQuery.Deferred();

    XcalarGetDatasets()
    .done(function(datasetObj) {
        var numDatasets = datasetObj.numDatasets;
        for (var i = 0; i<datasetObj.numDatasets; i++) {
            if (datasetObj.datasets[i].datasetId === datasetId) {
                return (deferred.resolve(datasetObj.datasets[i].name));
            }
        }
        console.log("Couldn't find a dataset with id: "+datasetId);
        return (deferred.resolve(0));
    });

    return (deferred.promise());
}


function setIndex(tName, index) {
    gTableIndicesLookup[tName] = {};
    gTableIndicesLookup[tName]['columns'] = index;
    gTableIndicesLookup[tName]['active'] = true;
    gTableIndicesLookup[tName]['timeStamp'] = (new Date()).getTime();
}

function setDirection(tName, order) {
    gTableDirectionLookup[tName] = order;
}

function commitToStorage(atStartup) {
    setTableOrder(atStartup);
    var stringed = JSON.stringify(gTableIndicesLookup);
    var stringed2 = JSON.stringify(gTableDirectionLookup);
    var stringed3 = JSON.stringify(gWorksheetName);
    var stringed4 = JSON.stringify(gTableOrderLookup);
    var stringed5 = JSON.stringify(gDSObjFolder);
    localStorage["TILookup"] = stringed;
    localStorage["TDLookup"] = stringed2;
    localStorage["WSName"] = stringed3;
    localStorage["TOLookup"] = stringed4;
    localStorage["gDSObj"] = stringed5;
}

function readFromStorage() {
    var deferred = jQuery.Deferred();

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
    if (localStorage["gDSObj"]) {
        gDSObjFolder = JSON.parse(localStorage["gDSObj"]);
    }

    XcalarGetDatasets()
    .done(function(datasets) {
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
        commitToStorage(AfterStartup.After); 

        deferred.resolve();
    });

    return (deferred.promise());
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

function setTableOrder(atStartup) {
    if (atStartup) {
        return;
    }
    var tables = [];
    for (var i = 0; i < gTables.length; i++) {
        tables.push(gTables[i].frontTableName);
    }
    gTableOrderLookup = tables;
}
