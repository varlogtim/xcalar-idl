// Lookup table that translates between tablename and the indices that it should
// be holding

function emptyAllStorage(localEmpty) {
    var deferred = jQuery.Deferred();

    // hide modal
    $("#modalBackground").hide();
    $(".modalContainer:visible").hide();

    gTables = {};
    WSManager.clear();
    SQL.clear();
    CLIBox.clear();
    DataStore.clear();
    UserSettings.clear();
    RightSideBar.clear();
    DagPanel.clear();
    // clear all table
    $("#mainFrame").find('.xcTableWrap').remove();

    if (localEmpty) {
        deferred.resolve();
    } else {
        // XXX beacuse session do not delete in backend,
        // when can not delete KVStore, otherwise we lose UI infos
        // but session is still there
        deferred.resolve();

        // WKBKManager.emptyAll()
        // .then(function() {
        //     return (Authentication.clear());
        // })
        // .then(deferred.resolve)
        // .fail(deferred.reject);
    }

    return (deferred.promise());
}

function getIndex(tName) {
    var tableIndex = xcHelper.getTableId(tName);
    if (!gTables) {
        console.log("Nothing has ever been stored ever!");
        gTables = {};
    }

    if (tableIndex in gTables) {
        return (gTables[tableIndex].tableCols);
    } else {
        console.log("No such table has been saved before");
        return (null);
    }
    return (null);
}

function setgTable(tName, tableCols, dsName, tableProperties) {
    var deferred = jQuery.Deferred();
    var tableId = xcHelper.getTableId(tName);

    gTables[tableId] = new TableMeta({
        "tableName": tName,
        "tableCols": tableCols
    });

    if (tableProperties) {
        gTables[tableId].bookmarks = tableProperties.bookmarks || [];
        gTables[tableId].rowHeights = tableProperties.rowHeights || {};
    }

    setTableMeta(tName)
    .then(deferred.resolve)
    .fail(function(error) {
        console.error("setTableMetaFails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

// the key should be as short as possible
// and when change the store key, change it here, it will
// apply to all places
var KVKeys = {
    "TI"   : "TILookup",
    "WS"   : "worksheets",
    "DS"   : "gDSObj",
    "CLI"  : "scratchPad",
    "CART" : "datacarts",
    "STATS": "statsCols",
    "USER" : "userSettings",
    "DFG"  : "DFG",
    "SCHE" : "schedule"
};

function commitToStorage(atStartUp) {
    var deferred = jQuery.Deferred();
    var storage = new METAConstructor(atStartUp);

    KVStore.put(KVStore.gStorageKey, JSON.stringify(storage), true, gKVScope.META)
    .then(function() {
        return (SQL.commit());
    })
    .then(function() {
        var d = new Date();
        var t = xcHelper.getDate("-", d) + " " + d.toLocaleTimeString();
        $("#autoSavedInfo").text(t);

        // save workbook
        return XcalarSaveWorkbooks("*");
    })
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
    var tableIndicesLookup;

    KVStore.getAndParse(KVStore.gStorageKey, gKVScope.META)
    .then(function(gInfos) {
        if (gInfos) {
            if (gInfos[KVKeys.TI]) {
                tableIndicesLookup = gInfos[KVKeys.TI];
            }
            if (gInfos[KVKeys.WS]) {
                WSManager.restore(gInfos[KVKeys.WS]);
            }
            if (gInfos[KVKeys.DS]) {
                gDSObjFolder = gInfos[KVKeys.DS];
            }
            if (gInfos[KVKeys.CLI]) {
                CLIBox.restore(gInfos[KVKeys.CLI]);
            }
            if (gInfos[KVKeys.CART]) {
                DataCart.restore(gInfos[KVKeys.CART]);
            }
            if (gInfos[KVKeys.STATS]) {
                Profile.restore(gInfos[KVKeys.STATS]);
            }
            if (gInfos[KVKeys.USER]) {
                UserSettings.restore(gInfos[KVKeys.USER]);
            }
            if (gInfos[KVKeys.DFG]) {
                DFG.restore(gInfos[KVKeys.DFG]);
            }
            if (gInfos[KVKeys.SCHE]) {
                Scheduler.restore(gInfos[KVKeys.SCHE]);
            }

            return (SQL.restore());
        } else {
            console.info("KVStore is empty!");
            emptyAllStorage(true);
            return (promiseWrapper(null));
        }
    })
    .then(function() {
        return (XcalarGetDatasets());
    })
    .then(function(datasets) {
        var numDatasets = datasets.numDatasets;
        // clear KVStore if no datasets are loaded
        if (numDatasets === 0 || numDatasets == null) {
            tableIndicesLookup = {};
        }
        var atStartUp = true;
        DS.restore(gDSObjFolder, datasets, atStartUp);
    })
    .then(function() {
        var deferred2 = jQuery.Deferred();
        var promises = [];
        var failures = [];
        var tableCount = 0;

        for (var tableId in tableIndicesLookup) {
            var oldMeta = tableIndicesLookup[tableId];
            ++tableCount;
            promises.push(restoreTableMeta.bind(this, tableId, oldMeta, failures));
        }

        chain(promises)
        .then(function() {
            if (failures.length > 0) {
                for (var j = 0; j < failures.length; j++) {
                    console.error(failures[j]);
                }

                if (failures.length === tableCount) {
                    deferred2.reject("gTables setup fails!");
                } else {
                    deferred2.resolve();
                }
            } else {
                return deferred2.resolve();
            }
        })
        .fail(function(error) {
            deferred2.reject(error);
        });

        return (deferred2.promise());
    })
    .then(function() {
        var atStartUp = true;
        commitToStorage(atStartUp);
        deferred.resolve();
    })
    .fail(function(error) {
        console.error("readFromStorage fails!", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function restoreTableMeta(tableId, oldMeta, failures) {
    var deferred = jQuery.Deferred();
    var table = new TableMeta(oldMeta);
    var tableName = table.tableName;

    getResultSet(tableName)
    .then(function(resultSet) {
        table.resultSetId = resultSet.resultSetId;

        table.resultSetCount = resultSet.numEntries;
        table.resultSetMax = resultSet.numEntries;
        table.numPages = Math.ceil(table.resultSetCount /
                                      gNumEntriesPerPage);
        table.keyName = resultSet.keyAttrHeader.name;

        if (table.isLocked) {
            table.isLocked = false;
            table.active = false;
        }

        gTables[tableId] = table;
        deferred.resolve();
    })
    .fail(function(thriftError) {
        var error = "gTables initialization failed on " +
                    tableName + "fails: " + thriftError.error;
        failures.push(error);
        deferred.resolve(error);
    });

    return (deferred.promise());
}

window.KVStore = (function($, KVStore) {
    var safeMode = false;
    var safeTimer;

    KVStore.setup = function(gStorageKey, gLogKey) {
        KVStore.gStorageKey = gStorageKey;
        KVStore.gLogKey = gLogKey;
        KVStore.commitKey = gStorageKey + "-" + "commitkey";

        if (sessionStorage.getItem("xcalar.safe") != null) {
            safeMode = true;
        } else {
            safe = false;
        }
    };

    KVStore.get = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyLookup(key, scope)
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
        $(".menu").attr("xc-safeMode", true);
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

        $(".jsonWrap").attr("xc-safeMode", true);
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
            $(".gridItems").empty();

            // XXX this should be changed after the gTable structure change
            gTables = {};

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

    KVStore.getAndParse = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyLookup(key, scope)
        .then(function(value) {
            // "" can not be JSO.parse
            if (value != null && value.value != null && value.value !== "") {
                try {
                    value = JSON.parse(value.value);
                    deferred.resolve(value);
                } catch(err) {
                    console.error(err, value, key);
                    deferred.reject(err);
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

    KVStore.put = function(key, value, persist, scope) {
        var deferred = jQuery.Deferred();

        if (safeMode) {
            deferred.resolve();
            return (deferred.promise());
        }

        Support.commitCheck()
        .then(function() {
            return (XcalarKeyPut(key, value, persist, scope));
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Put to KV Store fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.append = function(key, value, persist, scope) {
        var deferred = jQuery.Deferred();

        if (safeMode) {
            deferred.resolve();
            return (deferred.promise());
        }

        Support.commitCheck()
        .then(function() {
            return (XcalarKeyAppend(key, value, persist, scope));
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    KVStore.delete = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyDelete(key, scope)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Delete in KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function getWKBKLists() {
        var deferred = jQuery.Deferred();
        wkbkLists = "";

        var workbooks = WKBKManager.getWKBKS();
        for (var wkbkId in workbooks) {
            var wkbk = workbooks[wkbkId];
            var li = "name:" + wkbk.name +
                    " id:" + wkbk.id;
            wkbkLists += "<li>" + li + "</li>";
        }

        return (deferred.promise());
    }

    return (KVStore);
}(jQuery, {}));
