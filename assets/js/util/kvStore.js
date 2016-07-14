window.KVStore = (function($, KVStore) {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    var METAKeys;
    var EMetaKeys; // Ephemeral meta data keys

    KVStore.setup = function(gStorageKey, gEphStorageKey, gLogKey, gErrKey, gUserKey) {
        METAKeys = getMETAKeys();
        EMetaKeys = getEMetaKeys();
        KVStore.gStorageKey = gStorageKey;
        KVStore.gEphStorageKey = gEphStorageKey;
        KVStore.gLogKey = gLogKey;
        KVStore.gErrKey = gErrKey;
        KVStore.gUserKey = gUserKey;
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
                } catch (err) {
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
        var ephMeta = new EMetaConstructor(EMetaKeys);

        KVStore.put(KVStore.gStorageKey, JSON.stringify(meta), true,
                    gKVScope.META)
        .then(function() {
            return KVStore.put(KVStore.gEphStorageKey, JSON.stringify(ephMeta),
                               false, gKVScope.EPHM);
        })
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

        var gInfos = {};

        // If the ephmeral datastructure is corrupt, we move ahead with the
        // rest of the restore since ephemeral isn't that important
        KVStore.getAndParse(KVStore.gEphStorageKey, gKVScope.EPHM)
        .then(getPersistentKeys, getPersistentKeys);

        function getPersistentKeys(gInfosE) {
            if (typeof(gInfosE) === "object") {
                for (var key in gInfosE) {
                    gInfos[key] = gInfosE[key];
                }
            } else {
                console.error("Expect gInfosE to be an object but it's a " +
                              typeof(gInfosE) + " instead. Not restoring.");
            }
            return UserSettings.restore()
            .then(function() {
                return KVStore.getAndParse(KVStore.gStorageKey, gKVScope.META);
            })
            .then(function(gInfosPart) {
                var isEmpty = (gInfosPart == null);
                gInfosPart = gInfosPart || {};

                for (var key in gInfosPart) {
                    gInfos[key] = gInfosPart[key];
                }

                try {
                    WSManager.restore(gInfos[METAKeys.WS]);
                    Aggregates.restore(gInfos[METAKeys.AGGS]);
                    TblManager.restoreTableMeta(gInfos[METAKeys.TI]);
                    DSCart.restore(gInfos[METAKeys.CART]);
                    Profile.restore(gInfos[METAKeys.STATS]);
                    CLIBox.restore(gInfos[METAKeys.CLI]);

                    DFG.restore(gInfos[EMetaKeys.DFG]);
                    Scheduler.restore(gInfos[EMetaKeys.SCHE]);

                    if (isEmpty) {
                        console.info("KVStore is empty!");
                    } else {
                        return SQL.restore();
                    }
                } catch (error) {
                    console.error(error);
                    return PromiseHelper.reject(error);
                }
            })
            .then(function() {
                // KVStore.commit(true);
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("KVStore restore fails!", error);
                deferred.reject(error);
            });
        }

        return (deferred.promise());
    };

    KVStore.emptyAll = function(localEmpty) {
        var deferred = jQuery.Deferred();

        // hide modal
        $("#modalBackground").hide();
        $(".modalContainer:visible").hide();

        gTables = {};
        WSManager.clear();
        Aggregates.clear();
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
