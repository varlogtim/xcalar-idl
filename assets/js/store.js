window.KVStore = (function($, KVStore) {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    var KVKeys = KVKeysInfo();

    KVStore.setup = function(gStorageKey, gLogKey) {
        KVStore.gStorageKey = gStorageKey;
        KVStore.gLogKey = gLogKey;
        KVStore.commitKey = gStorageKey + "-" + "commitkey";
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

        Support.commitCheck()
        .then(function() {
            return XcalarKeyPut(key, value, persist, scope);
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

        Support.commitCheck()
        .then(function() {
            return XcalarKeyAppend(key, value, persist, scope);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    };

    KVStore.delete = function(key, scope) {
        var deferred = jQuery.Deferred();

        XcalarKeyDelete(key, scope)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error("Delete in KV Store fails!");
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.commit = function(atStartUp) {
        var deferred = jQuery.Deferred();
        var storage = new METAConstructor(KVKeys, atStartUp);

        KVStore.put(KVStore.gStorageKey, JSON.stringify(storage), true, gKVScope.META)
        .then(function() {
            return SQL.commit();
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
            console.error("commit fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.restore = function() {
        var deferred = jQuery.Deferred();
        var gDSObjFolder;

        KVStore.getAndParse(KVStore.gStorageKey, gKVScope.META)
        .then(function(gInfos) {
            if (gInfos) {
                if (gInfos[KVKeys.TI]) {
                    TblManager.restoreTableMeta(gInfos[KVKeys.TI]);
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

                return SQL.restore();
            } else {
                console.info("KVStore is empty!");
                // this will help to reset all modules
                KVStore.emptyAll(true);
                return promiseWrapper(null);
            }
        })
        .then(function() {
            return DS.restore(gDSObjFolder, true);
        })
        .then(function() {
            KVStore.commit(true);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("KVStore restore fails!", error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    KVStore.emptyAll = function(localEmpty) {
        var deferred = jQuery.Deferred();

        // hide modal
        $("#modalBackground").hide();
        $(".modalContainer:visible").hide();

        gTables = {};
        WSManager.clear();
        DataStore.clear();
        UserSettings.clear();
        RightSideBar.clear();
        DagPanel.clear();
        // clear all table
        $("#mainFrame").find('.xcTableWrap').remove();

        if (localEmpty) {
            deferred.resolve();
        } else {
            // Note from Cheng: beacuse session do not delete in backend,
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
    };

    return (KVStore);
}(jQuery, {}));
