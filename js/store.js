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
    CLIBox.clear();

    if (localEmpty) {
        deferred.resolve();
    } else {
        WKBKManager.emptyAll()
        .then(function() {
            return (Authentication.clear());
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
        return (gTableIndicesLookup[tName].columns);
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

function setIndex(tName, index, dsName, tableProperties) {
    gTableIndicesLookup[tName] = {};
    gTableIndicesLookup[tName].columns = index;
    gTableIndicesLookup[tName].active = true;
    gTableIndicesLookup[tName].timeStamp = xcHelper.getTimeInMS();

    if (tableProperties) {
        gTableIndicesLookup[tName].bookmarks = tableProperties.bookmarks || [];
        gTableIndicesLookup[tName].rowHeights = tableProperties.rowHeights || {};
        gTableIndicesLookup[tName].statsCols = tableProperties.statsCols || {};
    } else {
        gTableIndicesLookup[tName].bookmarks = [];
        gTableIndicesLookup[tName].rowHeights = {};
        gTableIndicesLookup[tName].statsCols = {};
    }

    gTableIndicesLookup[tName].tableName = tName;
}

function setDirection(tName, order) {
    gTableDirectionLookup[tName] = order;
}

function commitToStorage(atStartup) {
    var deferred = jQuery.Deferred();
    var scratchPadText = $("#scratchPadSection textarea").val();

    setTableOrder(atStartup);
    // basic thing to store
    storage = {
        "TILookup"  : gTableIndicesLookup,
        "TDLookup"  : gTableDirectionLookup,
        "worksheets": WSManager.getWorksheets(),
        "TOLookup"  : gTableOrderLookup,
        "gDSObj"    : DS.getHomeDir(),
        "holdStatus": KVStore.isHold(),
        "sql"       : SQL.getHistory(),
        "scratchPad": CLIBox.getCli(),
        "datacarts" : DataCart.getCarts()
    };

    KVStore.put(KVStore.gStorageKey, JSON.stringify(storage), false)
    .then(function() {
        // console.log("commitToStorage done!");
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("commitToStorage fails!", error);
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
            if (gInfos.TILookup) {
                gTableIndicesLookup = gInfos.TILookup;
            }
            if (gInfos.TDLookup) {
                gTableDirectionLookup = gInfos.TDLookup;
            }
            if (gInfos.worksheets) {
                WSManager.restoreWS(gInfos.worksheets);
            }
            if (gInfos.TOLookup) {
                gTableOrderLookup = gInfos.TOLookup;
            }
            if (gInfos.gDSObj) {
                gDSObjFolder = gInfos.gDSObj;
            }
            if (gInfos.sql) {
                SQL.restoreFromHistory(gInfos.sql);
            }
            if (gInfos.scratchPad) {
                CLIBox.restore(gInfos.scratchPad);
            }
            if (gInfos.datacarts) {
                DataCart.restore(gInfos.datacarts);
            }
        } else {
            emptyAllStorage(true);
        }

        return (XcalarGetDatasets());
    })
    .then(function(datasets) {
        var numDatasets = datasets.numDatasets;
        // clear KVStore if no datasets are loaded
        if (numDatasets === 0 || numDatasets == null) {
            gTableIndicesLookup = {};
            gTableDirectionLookup = {};
            gTableOrderLookup = [];
        }
        var totalDS = DS.restore(gDSObjFolder, datasets);
        DataStore.updateInfo(totalDS);
        return (commitToStorage(AfterStartup.After));
    })
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("readFromStorage fails!", error);
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
        gTableOrderLookup.push(gTables[i].tableName);
    }
}

window.KVStore = (function($, KVStore) {
    var isHold = false;

    KVStore.setup = function(usrname, gStorageKey, gLogKey) {
        KVStore.user = usrname;
        KVStore.gStorageKey = gStorageKey;
        KVStore.gLogKey = gLogKey;

        // console.log("You are assigned keys", gStorageKey, gLogKey);
    };

    KVStore.get = function(key) {
        var deferred = jQuery.Deferred();

        XcalarKeyLookup(key)
        .then(function(value) {
            if (value != null && value.value != null) {
                deferred.resolve(value.value);
            } else {
                deferred.resolve(null);
            }
        })
        .fail(function(error) {
            console.error("Get from KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.getAndParse = function(key) {
        var deferred = jQuery.Deferred();
        XcalarKeyLookup(key)
        .then(function(value) {
            // "" can not be JSO.parse
            if (value != null && value.value != null && value.value !== "") {
                try {
                    value = JSON.parse(value.value);
                    // console.log("Parsed result", value);
                    deferred.resolve(value);
                } catch(err) {
                    console.error(err, value);
                    // KVStore.delete(key);
                    KVStore.log(err.message);
                    deferred.resolve(null);
                }
            } else {
                deferred.resolve(null);
            }
        })
        .fail(function(error) {
            console.error("Get And Parse from KV Store fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.put = function(key, value, persist) {
        var deferred = jQuery.Deferred();
        XcalarKeyPut(key, value, persist)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Put to KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.delete = function(key) {
        var deferred = jQuery.Deferred();

        XcalarKeyDelete(key)
        .then(function() {
            // console.log("Delete in KV Store succeed!");
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Delete in KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.hold = function() {
        var deferred = jQuery.Deferred();
        KVStore.getAndParse(KVStore.gStorageKey)
        .then(function(gInfos) {
            if (!gInfos) {
                console.log("KVStore is empty!");
                isHold = true;
                deferred.resolve(null);
            } else {
                if (gInfos.holdStatus === true &&
                    sessionStorage.getItem(KVStore.user) !== "hold") {
                    Alert.show({
                        "title"  : "Signed on elsewhere!",
                        "msg"    : "Please close your other session.",
                        "buttons": [
                            {
                                "name"     : "Force Release",
                                "className": "cancel",
                                "func"     : function() {
                                    KVStore.forceRelease();
                                }
                            }
                        ],
                        "noCancel": true
                    });
                    deferred.reject("Already in use!");
                } else {
                    if (gInfos.holdStatus === true) {
                        console.error("KVStore not release last time...");
                    }
                    isHold = true;
                    sessionStorage.setItem(KVStore.user, "hold");
                    deferred.resolve(gInfos);
                }
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    KVStore.release = function() {
        if (!isHold) {
            return (promiseWrapper(null));
        }
        isHold = false;

        return (commitToStorage());
    };

    // XXX in case you are hold forever
    KVStore.forceRelease = function() {
        isHold = false;
        XcalarKeyLookup(KVStore.gStorageKey)
        .then(function(output) {
            if (output) {
                var gInfos = JSON.parse(output.value);
                gInfos.holdStatus = false;
                return (XcalarKeyPut(KVStore.gStorageKey,
                                     JSON.stringify(gInfos), false));
            } else {
                console.error("Output is empty");
                return (promiseWrapper(null));
            }
        })
        .then(function() {
            location.reload();
        });
    };

    KVStore.isHold = function() {
        return (isHold);
    };

    KVStore.log = function(error) {
        var log = {};
        log.error = error;
        KVStore.put(KVStore.gLogKey, JSON.stringify(log));
    };

    return (KVStore);
}(jQuery, {}));
