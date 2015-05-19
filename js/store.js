// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};
var gTableDirectionLookup = {};
var gTableOrderLookup = [];

function emptyAllStorage(localEmpty) {
    var deferred = jQuery.Deferred();

    gTableIndicesLookup = {};
    gTableDirectionLookup = {};
    gTableOrderLookup = [];
    WSManager.clear();
    DS.clear();
    SQL.clear();
    DataCart.clear();
    $("#scratchPadSection textarea").val("");

    if (localEmpty) {
        deferred.resolve();
    } else {
        KVStore.delete(KVStore.gStorageKey)
        .then(function() {
            return (KVStore.delete(KVStore.gLogKey));
        })
        .then(deferred.resolve)
        .fail(deferred.reject);
    }

    return (deferred.promise());
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
        console.log("No such table has been saved before");
        return (null);
    }
    return (null);
}

function setIndex(tName, index, dsName, tableProperties, backTableName) {
    gTableIndicesLookup[tName] = {};
    gTableIndicesLookup[tName]['columns'] = index;
    gTableIndicesLookup[tName]['active'] = true;
    gTableIndicesLookup[tName]['timeStamp'] = xcHelper.getTimeInMS();
    if (dsName) {
        gTableIndicesLookup[tName]['datasetName'] = dsName;
        gTableIndicesLookup[tName]['isTable'] = false;
    } else {
        gTableIndicesLookup[tName]['isTable'] = true;
    }

    if (tableProperties) {
        gTableIndicesLookup[tName]['bookmarks'] = tableProperties.bookmarks;
        gTableIndicesLookup[tName]['rowHeights'] = tableProperties.rowHeights;
        
    } else {
        gTableIndicesLookup[tName]['bookmarks'] = [];
        gTableIndicesLookup[tName]['rowHeights'] = {};
    }

    if (backTableName) {
        gTableIndicesLookup[tName]['backTableName'] = backTableName;
    } else {
        gTableIndicesLookup[tName]['backTableName'] = tName;
    }
}

function setDirection(tName, order) {
    gTableDirectionLookup[tName] = order;
}

function commitToStorage(atStartup) {
    var deferred = jQuery.Deferred();
    var scratchPadText = $("#scratchPadSection textarea").val();

    setTableOrder(atStartup);
    // basic thing to store
    storage = {"TILookup": gTableIndicesLookup,
                "TDLookup": gTableDirectionLookup,
                "worksheets": WSManager.getWorksheets(),
                "TOLookup": gTableOrderLookup,
                "gDSObj": DS.getCurrentState(),
                "holdStatus": KVStore.isHold(),
                "sql": SQL.getHistory(),
                "scratchPad": scratchPadText,
                "datacarts": DataCart.getCarts(),
                "helpStatusOff" : HelpController.isOff()
            };

    KVStore.put(KVStore.gStorageKey, JSON.stringify(storage), false)
    .then(function() {
        console.log("commitToStorage done!");
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("commitToStorage fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function readFromStorage() {
    var deferred = jQuery.Deferred();
    var gDSObjFolder;

    KVStore.hold()
    .then(function(gInfos) {
        if (gInfos) {
            if (gInfos["TILookup"]) {
                gTableIndicesLookup = gInfos["TILookup"];
            }
            if (gInfos["TDLookup"]) {
                gTableDirectionLookup = gInfos["TDLookup"];
            }
            if (gInfos["worksheets"]) {
                WSManager.restoreWorksheets(gInfos["worksheets"]);
            }
            if (gInfos["TOLookup"]) {
                gTableOrderLookup = gInfos["TOLookup"];
            }
            if (gInfos["gDSObj"]) {
                gDSObjFolder = gInfos["gDSObj"];
            }
            if (gInfos["sql"]) {
                SQL.restoreFromHistory(gInfos["sql"]);
            }
            if (gInfos["scratchPad"]) {
                $("#scratchPadSection textarea").val(gInfos["scratchPad"]);
            }
            if (gInfos["datacarts"]) {
                DataCart.restore(gInfos["datacarts"]);
            }
            if (gInfos["helpStatusOff"]) {
                HelpController.tooltipOff();
            }
        } else {
            emptyAllStorage(true);
        }

        return (XcalarGetDatasets());
    })
    .then(function(datasets) {
        var numDatasets = datasets.numDatasets;
        // clear KVStore if no datasets are loaded
        if (numDatasets == 0 || numDatasets == null) {
            gTableIndicesLookup = {};
            gTableDirectionLookup = {};
            gTableOrderLookup = [];
        }
        DS.restore(gDSObjFolder, datasets);
        DataStore.updateInfo(numDatasets);
        return (commitToStorage(AfterStartup.After));
    })
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("readFromStorage fails!");
        deferred.reject(error);
    });

    return (deferred.promise());
}

function setTableOrder(atStartup) {
    if (atStartup) {
        return;
    }
    gTableOrderLookup = [];
    for (var i = 0; i < gTables.length; i++) {
        gTableOrderLookup.push(gTables[i].frontTableName);
    }
}

window.KVStore = (function($, KVStore) {
    var isHold = false;

    var username = sessionStorage.getItem("xcalar-username");

    if (username) {
        KVStore.gStorageKey = generateKey_helper(username, "gInfo");
        KVStore.gLogKey = generateKey_helper(username, "gLog");
    } else {
        KVStore.gStorageKey = generateKey_helper(hostname, portNumber, "gInfo");
        KVStore.gLogKey = generateKey_helper(hostname, portNumber, "gLog");
    }

    console.log("You are assigned keys", KVStore.gStorageKey, KVStore.gLogKey);

    KVStore.get = function(key) {
        var deferred = jQuery.Deferred();
        XcalarKeyLookup(key)
        .then(function(value) {
            if (value != null && value.value != null) {
                try {
                    value = JSON.parse(value.value);
                    console.log("Parsed result", value);
                    deferred.resolve(value);
                } catch(err) {
                    console.log(err, value);
                    KVStore.delete(key);
                    KVStore.log(err.message);
                    deferred.resolve(null);
                }
            } else {
                deferred.resolve(null);
            }
        })
        .fail(function(error) {
            console.log("Get from KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    KVStore.put = function(key, value, persist) {
        var deferred = jQuery.Deferred();
        XcalarKeyPut(key, value, persist)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("Put to KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    KVStore.delete = function(key, value) {
        var deferred = jQuery.Deferred();
        XcalarKeyDelete(key)
        .then(function() {
            console.log("Delete in KV Store succeed!");
            deferred.resolve();
        })
        .fail(function(error) {
            console.log("Delete in KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    KVStore.hold = function() {
        var deferred = jQuery.Deferred();
        KVStore.get(KVStore.gStorageKey)
        .then(function(gInfos) {
            if (!gInfos) {
                console.log("KVStore is empty!");
                isHold = true;
                deferred.resolve(null);
            } else {
                if (gInfos["holdStatus"] === true && 
                    sessionStorage.getItem(KVStore.gStorageKey) !== "hold") {
                    Alert.error("Signed on elsewhere!",
                                "Please close your other session.",
                                true);
                    deferred.reject("Already in use!");
                } else {
                    if (gInfos["holdStatus"] === true) {
                        console.error("KVStore not release last time...");
                    }
                    isHold = true;
                    sessionStorage.setItem(KVStore.gStorageKey, "hold");
                    deferred.resolve(gInfos);
                }
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    KVStore.release = function() {
        if (!isHold) {
            return (promiseWrapper(null));
        }
        isHold = false;

        return (commitToStorage());
    }

    // XXX in case you are hold forever
    KVStore.forceRelease = function() {
        isHold = false;
        XcalarKeyLookup(KVStore.gStorageKey)
        .then(function(output) {
            if (output) {
                var gInfos = JSON.parse(output.value);
                gInfos["holdStatus"] = false;
                XcalarKeyPut(KVStore.gStorageKey, JSON.stringify(gInfos), false);
            }
        });
    }

    KVStore.isHold = function() {
        return (isHold);
    }

    KVStore.log = function(error) {
        var log = {};
        log.error = error;
        KVStore.put(KVStore.gLogKey, JSON.stringify(log));
    }

    function generateKey_helper() {
        // currently just cat all arguments as a key
        var key;
        for (var i = 0; i < arguments.length; i ++) {
            if (arguments[i]) {
                if (!key) {
                    key = arguments[i];
                } else {
                    key += "-" + arguments[i];
                }
            }
        }
        return (key);
    }

    return (KVStore);
}(jQuery, {}));
