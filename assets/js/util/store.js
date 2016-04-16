window.KVStore = (function($, KVStore) {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    var METAKeys;

    KVStore.setup = function(gStorageKey, gLogKey, gErrKey, gUsreKey) {
        METAKeys = getMETAKeys();

        KVStore.gStorageKey = gStorageKey;
        KVStore.gLogKey = gLogKey;
        KVStore.gErrKey = gErrKey;
        KVStore.gUsreKey = gUsreKey;
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
        var meta = new METAConstructor(METAKeys);

        KVStore.put(KVStore.gStorageKey, JSON.stringify(meta), true, gKVScope.META)
        .then(function() {
            return SQL.commit();
        })
        .then(function() {
            if (!atStartUp) {
                return UserSettings.commit();
            }
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

        KVStore.getAndParse(KVStore.gStorageKey, gKVScope.META)
        .then(function(gInfos) {
            if (gInfos) {
                if (gInfos[METAKeys.TI]) {
                    TblManager.restoreTableMeta(gInfos[METAKeys.TI]);
                }
                if (gInfos[METAKeys.WS]) {
                    WSManager.restore(gInfos[METAKeys.WS]);
                }
                if (gInfos[METAKeys.CLI]) {
                    CLIBox.restore(gInfos[METAKeys.CLI]);
                }
                if (gInfos[METAKeys.CART]) {
                    DataCart.initialize(gInfos[METAKeys.CART]);
                }
                if (gInfos[METAKeys.STATS]) {
                    Profile.restore(gInfos[METAKeys.STATS]);
                }
                if (gInfos[METAKeys.DFG]) {
                    DFG.restore(gInfos[METAKeys.DFG]);
                }
                if (gInfos[METAKeys.SCHE]) {
                    Scheduler.restore(gInfos[METAKeys.SCHE]);
                }

                return SQL.restore();
            } else {
                console.info("KVStore is empty!");
                // this will help to reset all modules
                // KVStore.emptyAll(true);
                return promiseWrapper(null);
            }
        })
        .then(function() {
            UserSettings.restore();
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
