// Lookup table that translates between tablename and the indices that it should
// be holding

var gTableIndicesLookup = {};

function emptyAllStorage(localEmpty) {
    var deferred = jQuery.Deferred();

    gTableIndicesLookup = {};
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
    var tableIndex = xcHelper.getTableId(tName);
    if (!gTableIndicesLookup) {
        console.log("Nothing has ever been stored ever!");
        gTableIndicesLookup = {};
    }
    if (tableIndex in gTableIndicesLookup) {
        return (gTableIndicesLookup[tableIndex].columns);
    } else {
        console.log("No such table has been saved before");
        return (null);
    }
    return (null);
}

function setIndex(tName, index, dsName, tableProperties) {
    var tableId = xcHelper.getTableId(tName);
    gTableIndicesLookup[tableId] = {};
    gTableIndicesLookup[tableId].columns = index;
    gTableIndicesLookup[tableId].active = true;
    gTableIndicesLookup[tableId].timeStamp = xcHelper.getTimeInMS();

    if (tableProperties) {
        gTableIndicesLookup[tableId].bookmarks = tableProperties.bookmarks || [];
        gTableIndicesLookup[tableId].rowHeights = tableProperties.rowHeights || {};
    } else {
        gTableIndicesLookup[tableId].bookmarks = [];
        gTableIndicesLookup[tableId].rowHeights = {};
    }

    gTableIndicesLookup[tableId].tableName = tName;
}

// the key should be as short as possible
// and when change the store key, change it here, it will
// apply to all places
var KVKeys = {
    "TI"   : "TILookup",
    "WS"   : "worksheets",
    "DS"   : "gDSObj",
    "HOLD" : "holdStatus",
    "SQL"  : "sql",
    "CLI"  : "scratchPad",
    "CART" : "datacarts",
    "STATS": "statsCols"
};

function commitToStorage(atStartup) {
    var deferred = jQuery.Deferred();
    var scratchPadText = $("#scratchPadSection textarea").val();

    // basic thing to store
    var storage = {};

    storage[KVKeys.TI] = gTableIndicesLookup;
    storage[KVKeys.WS] = WSManager.getWorksheets();

    storage[KVKeys.DS] = DS.getHomeDir();
    storage[KVKeys.SQL] = SQL.getHistory();
    storage[KVKeys.CLI] = CLIBox.getCli();

    storage[KVKeys.CART] = DataCart.getCarts();
    storage[KVKeys.HOLD] = KVStore.isHold();

    storage[KVKeys.STATS] = STATSManager.getStatsCols();

    KVStore.put(KVStore.gStorageKey, JSON.stringify(storage), false)
    .then(function() {
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
            if (gInfos[KVKeys.TI]) {
                gTableIndicesLookup = gInfos[KVKeys.TI];
            }
            if (gInfos[KVKeys.WS]) {
                WSManager.restoreWS(gInfos[KVKeys.WS]);
            }
            if (gInfos[KVKeys.DS]) {
                gDSObjFolder = gInfos[KVKeys.DS];
            }
            if (gInfos[KVKeys.SQL]) {
                SQL.restoreFromHistory(gInfos[KVKeys.SQL]);
            }
            if (gInfos[KVKeys.CLI]) {
                CLIBox.restore(gInfos[KVKeys.CLI]);
            }
            if (gInfos[KVKeys.CART]) {
                DataCart.restore(gInfos[KVKeys.CART]);
            }
            if (gInfos[KVKeys.STATS]) {
                STATSManager.restore(gInfos[KVKeys.STATS]);
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
        }
        var totalDS = DS.restore(gDSObjFolder, datasets);
        DataStore.updateInfo(totalDS);
        return (commitToStorage(AfterStartup.After));
    })
    // .then(function() {
        // var deferred2 = jQuery.Deferred();
        // var promises = [];
        // var failures = [];
        // var tableCount = 0;
        // var orphanedTables = {};
        // for (var table in gTableIndicesLookup) {
        //     promises.push((function(index, tableName) {
        //         var innerDeferred = jQuery.Deferred();
        //         setTableMeta(tableName)
        //         .then(function() {
        //             var lookupTable = gTableIndicesLookup[tableName];
        //             if (lookupTable.isLocked) {
        //                 lookupTable.isLocked = false;
        //                 lookupTable.active = false;
        //                 orphanedTables[newTableMeta.tableId] = newTableMeta;
        //             } else {
        //                 gTables2[newTableMeta.tableId] = newTableMeta;
        //             }
        //             innerDeferred.resolve();
        //         })
        //         .fail(function(thriftError) {
        //             failures.push("gTables initialization failed on " + tableName +
        //                          "fails: " + thriftError.error);
        //             innerDeferred.resolve(error);
        //         });

        //         return (innerDeferred.promise());
        //     }).bind(this, i, tableName));
        // }
       
        // chain(promises)
        // .then(function() {
        //     if (failures.length > 0) {
        //         for (var j = 0; j < failures.length; j++) {
        //             console.error(failures[j]);
        //         }

        //         if (failures.length === tableCount) {
        //             deferred2.reject("gTables setup fails!");
        //         } else {
        //             deferred2.resolve());
        //         }
        //     } else {
        //         return deferred2.resolve();
        //     }
        // })
        // .fail(function(error) {
        //     deferred2.reject(error);
        // });

        // return (deferred2.promise());
    // })
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("readFromStorage fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

window.KVStore = (function($, KVStore) {
    var isHold   = false;
    var safeMode = false;
    var safeTimer;

    KVStore.setup = function(usrname, gStorageKey, gLogKey) {
        KVStore.user = usrname;
        KVStore.gStorageKey = gStorageKey;
        KVStore.gLogKey = gLogKey;

        if (sessionStorage.getItem("xcalar.safe") != null) {
            safeMode = true;
        } else {
            safe = false;
        }

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

    KVStore.turnSaveMode = function(isTurnOn) {
        if (!isTurnOn) {
            sessionStorage.removeItem("xcalar.safe");
            return;
        }

        getWKBKLists()
        .then(function(wkbkLists) {
            Alert.show({
                "title"  : "Choose a Workbook",
                "optList": {
                    "label": "Workbook:",
                    "list" : wkbkLists
                },
                "confirm": function() {
                    var option = Alert.getOptionVal();
                    var wkbkId = option.split("id:")[1];

                    if (wkbkId != null) {
                        sessionStorage.setItem("xcalar.safe", wkbkId);
                        location.reload();
                    }
                }
            });
        });
    };

    KVStore.safeSetup = function() {
        if (!safeMode) {
            return;
        }
        // Not use addClass beacuse some code may clear it

        // invalid colMenu and tableMenu;
        $(".colMenu").attr("xc-safeMode", true);
        // invalid rename table
        $(".tableTitle .text").attr("xc-safeMode", true);
        // invalid drag and drop table
        $(".tableTitle .tableGrab").attr("xc-safeMode", true);

        // invalid functionBar
        $("#functionArea").attr("xc-safeMode", true);

        // invalid add worksheet
        $("#addWorksheet").attr("xc-safeMode", true);
        $(".worksheetTab .text").attr("xc-safeMode", true);

        // invalid workbook
        $("#workbookModal .confirm").attr("xc-safeMode", true);

        // invalid logout
        $("#userNameArea").attr("xc-safeMode", true);

        // invalid add to worksheet and delete table
        $("#archivedTableList .btn").attr("xc-safeMode", true);
        $("#orphanedTableList .btn").attr("xc-safeMode", true);

        // invalid upload UDF
        $("#udf-fnUpload").attr("xc-safeMode", true);
        $("#udf-fileUpload").attr("xc-safeMode", true);

        // invalid clean up
        $("#helpSubmit").attr("xc-safeMode", true);

        // invalid submit datastore form
        $("#importDataSubmit").attr("xc-safeMode", true);
        // invalid add folder
        $("#addFolderBtn").attr("xc-safeMode", true);
        // invalid delete folder and ds
        $("#deleteFolderBtn").attr("xc-safeMode", true);

        // XXX not sure if preview should be invalid
        $("#previewBtn").attr("xc-safeMode", true);

        $("#jsonWrap").attr("xc-safeMode", true);
    };

    KVStore.safeLiveSync = function(time) {
        if (!safeMode) {
            return;
        }

        // default is 30s
        time = time || 30000;

        clearInterval(safeTimer);

        safeTimer = setInterval(function() {
            KVStore.safeSync();
        }, time);
    };

    KVStore.stopSync = function() {
        if (!safeMode) {
            return;
        }

        clearInterval(safeTimer);
        console.log("Stop sync");
    };

    KVStore.safeSync = function() {
        if (!safeMode) {
            return;
        }

        console.log("Sync...");

        freeAllResultSetsSync()
        .then(function() {
            return (emptyAllStorage(true));
        })
        .then(function() {
            gActiveTableId = "";
            gLastClickTarget = $(window);
            // clear all tables
            $("#mainFrame").empty();
            // clear scrollers
            $(".rowScroller").remove();

            // clear rightSideBar
            $("#activeTablesList").empty();
            $("#inactiveTablesList").empty();
            $("#orphanedTablesList").empty();

            // clear dag
            $(".dagWrap").remove();

            // clear data store
            $("#gridView").empty();

            // XXX this should be changed after the gTable structure change
            gTables2 = {};

            return (readFromStorage());
        })
        .then(function() {
            return (initializeTable());
        })
        .then(function() {
            return (RightSideBar.initialize());
        })
        .then(function() {
            KVStore.safeSetup();
        })
        .fail(function(error) {
            console.error(error);
        });
    };

    KVStore.getAndParse = function(key) {
        var deferred = jQuery.Deferred();
        XcalarKeyLookup(key)
        .then(function(value) {
            // "" can not be JSO.parse
            if (value != null && value.value != null && value.value !== "") {
                try {
                    value = JSON.parse(value.value);
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

        if (safeMode) {
            deferred.resolve();
            return (deferred.promise());
        }

        XcalarKeyPut(key, value, persist)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Put to KV Store fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.delete = function(key) {
        var deferred = jQuery.Deferred();

        XcalarKeyDelete(key)
        .then(function() {
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
                if (gInfos[KVKeys.HOLD] === true &&
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
                    if (gInfos[KVKeys.HOLD] === true) {
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

        if (safeMode) {
            return;
        }

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

    function getWKBKLists() {
        var deferred = jQuery.Deferred();
        wkbkLists = "";

        WKBKManager.getUsersInfo()
        .then(function(userInfo) {
            userInfo = userInfo || {}; // in case userInfo is null

            var users = userInfo.users;
            for (var user in users) {
                var workbooks = users[user].workbooks;

                if (workbooks != null && workbooks.length > 0) {
                    for (var i = 0; i < workbooks.length; i++) {
                        var wkbk = workbooks[i];
                        var li = "name:" + wkbk.name + " user:" + user +
                                    " id:" + wkbk.id;
                        wkbkLists += "<li>" + li + "</li>";
                    }
                }
            }

            deferred.resolve(wkbkLists);

        })
        .fail(function(error) {
            console.error("Get Session Error", error);
            $datalist.html("");
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    return (KVStore);
}(jQuery, {}));
