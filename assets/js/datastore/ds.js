/*
 * Module for mamgement of dsObj
 */
window.DS = (function ($, DS) {
    var homeDirId; // DSObjTerm.homeDirId

    var curDirId;       // current folder id
    var folderIdCount;  // counter
    var dsLookUpTable;  // find DSObj by dsId
    var homeFolder;

    var $gridView;      // $("#dsListSection .gridItems")
    var $gridMenu;      // $("#gridViewMenu")

    var dirStack = []; // for go back and forward
    var $backFolderBtn;    //$("#backFolderBtn");
    var $forwardFolderBtn; // $("#forwardFolderBtn")
    var $dsListFocusTrakcer; // $("#dsListFocusTrakcer");
    // for DS drag n drop
    var $dragDS;
    var $dropTarget;

    DS.setup = function() {
        homeDirId = DSObjTerm.homeDirId;
        $gridView = $("#dsListSection .gridItems");
        $gridMenu = $("#gridViewMenu");

        $backFolderBtn = $("#backFolderBtn");
        $forwardFolderBtn = $("#forwardFolderBtn");
        $dsListFocusTrakcer = $("#dsListFocusTrakcer");

        setupGridViewButtons();
        setupGrids();
        addMenuBehaviors($gridMenu);
        setupMenuActions();
    };

    // Restore dsObj
    DS.restore = function(oldHomeFolder, atStartUp) {
        return restoreDS(oldHomeFolder, atStartUp);
    };

    DS.setupView = function() {
        // restore list view if saved and ellipsis the icon
        var preference = UserSettings.getPref('datasetListView');
        toggleDSView(preference, true);
    };

    // Get home folder
    DS.getHomeDir = function () {
        return (homeFolder);
    };

    // Get dsObj by dsId
    DS.getDSObj = function(dsId) {
        if (dsId == null) {
            return null;
        }
        return dsLookUpTable[dsId];
    };

    // Get grid element(folder/datasets) by dsId
    DS.getGrid = function(dsId) {
        if (dsId == null) {
            return null;
        } else if (dsId === homeDirId) {
            return $gridView;
        } else {
            return $gridView.find('.grid-unit[data-dsId="' + dsId + '"]');
        }
    };

    // create a new folder
    DS.newFolder = function() {
        if (!canCreateFolder(curDirId)) {
            // when cannot create folder in current dir
            return null;
        }

        var ds = createDS({
            "name"    : DSTStr.NewFolder,
            "isFolder": true
        });

        UserSettings.logDSChange();

        // forcus on folder's label for renaming
        DS.getGrid(ds.id).click()
                .find('.label').click();

        return ds;
    };

    DS.addCurrentUserDS = function(fullDSName, format, path) {
        var parsedRes = xcHelper.parseDSName(fullDSName);
        var user = parsedRes.user;
        var dsName = parsedRes.dsName;

        createDS({
            "id"        : fullDSName, // user the fulldsname as a unique id
            "name"      : dsName,
            "user"      : user,
            "fullName"  : fullDSName,
            "uneditable": false,
            "isFolder"  : false,
            "format"    : format,
            "path"      : path
        });
    };

    // refresh a new dataset and add it to grid view
    DS.addOtherUserDS = function(fullDSName, format, path) {
        var parsedRes = xcHelper.parseDSName(fullDSName);
        var user = parsedRes.user;
        var dsName = parsedRes.dsName;
        var mainFolderObj = DS.getDSObj(DSObjTerm.OtherUserFolderId);
        var userFolderObj = null;

        mainFolderObj.eles.some(function(dsObj) {
            if (dsObj.getName() === user) {
                userFolderObj = dsObj;
                return true;
            }
            return false;
        });

        if (userFolderObj === null) {
            userFolderObj = createDS({
                "id"        : user,
                "name"      : user,
                "user"      : user,
                "uneditable": true,
                "isFolder"  : true,
                "parentId"  : DSObjTerm.OtherUserFolderId
            });
        }

        createDS({
            "id"        : fullDSName, // user the fulldsname as a unique id
            "name"      : dsName,
            "user"      : user,
            "fullName"  : fullDSName,
            "uneditable": true,
            "isFolder"  : false,
            "format"    : format,
            "path"      : path,
            "parentId"  : userFolderObj.getId()
        });

        // SQL.add("Add Other User's Dataset", {
        //     "operation": SQLOps.AddOtherUserDS,
        //     "name"     : fullDSName,
        //     "format"   : format,
        //     "path"     : path
        // });
    };

    DS.focusOn = function($grid) {
        xcHelper.assert($grid != null && $grid.length !== 0, "error case");

        var deferred = jQuery.Deferred();
        var dsId = $grid.data("dsid");

        $gridView.find(".active").removeClass("active");
        $grid.addClass("active");
        $dsListFocusTrakcer.data("dsid", dsId).focus();
        // folder do not show anything
        if ($grid.hasClass("folder")) {
            return PromiseHelper.resolve();
        }

        var isLoading;
        if ($grid.find('.waitingIcon').length !== 0) {
            isLoading = true;
        } else {
            isLoading = false;
        }

        // when switch to a ds, should clear others' ref count first!!
        DSTable.show(dsId, isLoading)
        .then(function() {
            if (!isLoading) {
                Tips.refresh();
            }
            deferred.resolve(isLoading);
        })
        .fail(function(error) {
            console.error("Focus on ds fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    // Point to dataset, promise returns dsObj
    DS.point = function(pointArgs, options) {
        options = options || {};
        var createTable = options.createTable || false;
        var dsToReplace = options.dsToReplace || null;
        // Here null means the attr is a placeholder, will
        // be update when the sample table is loaded
        var curFolder = DS.getDSObj(curDirId);
        if (!curFolder.isEditable()) {
            // if in the uneditable folder, go to the home folder first
            DS.goToDir(homeDirId);
            clearDirStack();
        }

        var dsObj = createDS(pointArgs, dsToReplace);
        var sql = {
            "operation": SQLOps.DSPoint,
            "pointArgs": pointArgs,
            "options"  : options
        };

        return pointToHelper(dsObj, createTable, sql);
    };

    DS.reload = function(dsId, previewSize) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            return PromiseHelper.reject("no dsobj!");
        }

        var sql = {
            "operation"  : SQLOps.DSPoint,
            "dsName"     : dsObj.getName(),
            "previewSize": previewSize,
            "isRetry"    : true
        };

        dsObj.setPreviewSize(previewSize);
        return pointToHelper(dsObj, null, sql, true);
    };

    // Rename dsObj
    DS.rename = function(dsId, newName) {
        // now only for folders (later also rename datasets?)
        var dsObj = DS.getDSObj(dsId);
        var $label = DS.getGrid(dsId).find("> .label");
        var oldName = dsObj.getName();

        if (newName === oldName || newName === "") {
            $label.html(oldName);
            return false;
        } else {
            if (dsObj.rename(newName)) {
                // valid rename
                $label.html(newName)
                    .data("dsname", newName)
                    .attr("data-dsname", newName)
                    .attr("title", newName);

                UserSettings.logDSChange();
                return true;
            } else {
                $label.html(oldName);
                return false;
            }
        }
    };

    // helper function to find grid, mainly used in unit test
    DS.getGridByName = function(dsName) {
        if (dsName == null) {
            return null;
        }
        // now only check dataset name conflict
        var user = Support.getUser();
        var $grid = $gridView.find('.grid-unit[data-dsname="' + dsName + '"]');
        var $ds = $grid.filter(function() {
            // only check the dataset in user's namespace
            return $(this).data("user") === user;
        });

        if ($ds.length > 0) {
            return $ds;
        } else {
            return null;
        }
    };

    // Check if the ds's name already exists
    DS.has = function(dsName) {
        return (DS.getGridByName(dsName) != null);
    };

    // Remove dataset/folder
    DS.remove = function($grid) {
        xcHelper.assert(($grid != null && $grid.length !== 0));

        var dsId = $grid.data("dsid");
        var dsObj = DS.getDSObj(dsId);
        var dsName = dsObj.getName();
        var msg;

        if (!dsObj.isEditable()) {
            msg = xcHelper.replaceMsg(DSTStr.DelUneditable, {
                "ds": (dsObj.beFolder() ? "folder" : "dataset")
            });
            // add alert
            Alert.show({
                "title"   : AlertTStr.NoDel,
                "msg"     : msg,
                "isAlert" : true,
                "onCancel": focsueOnTracker
            });

            return;
        } else if ($grid.hasClass("ds")) {
            var txId = $grid.data("txid");
            var title;
            var callback;
            if (txId != null) {
                // when cancel ds
                title = DSTStr.CancalPoint;
                msg = xcHelper.replaceMsg(DSTStr.CancelPointMsg, {"ds": dsName});
                callback = function() {
                    cancelDSHelper(txId, $grid, dsObj);
                    focsueOnTracker();
                };
            } else {
                // when remove ds
                title = DSTStr.DelDS;
                msg = xcHelper.replaceMsg(DSTStr.DelDSConfirm, {"ds": dsName});
                callback = function() {
                    delDSHelper($grid, dsObj);
                    focsueOnTracker();
                };
            }

            // add alert
            Alert.show({
                "title"    : title,
                "msg"      : msg,
                "onConfirm": callback
            });
        } else if (removeDS($grid) === true) {
            UserSettings.logDSChange();
        }
    };

    // Change dir to parent folder
    DS.upDir = function() {
        var dirId = curDirId; // tmp cache
        var parentId = DS.getDSObj(curDirId).getParentId();
        DS.goToDir(parentId);
        pushDirStack(dirId);
    };

    // Change dir to another folder
    DS.goToDir = function(folderId) {
        if (folderId == null) {
            console.error("Error Folder to go");
            return;
        }

        curDirId = folderId;

        if (curDirId === homeDirId) {
            $backFolderBtn.addClass("xc-disabled");
            $gridMenu.find(".back, .moveUp").addClass("disabled");
        } else {
            $backFolderBtn.removeClass("xc-disabled");
            $gridMenu.find(".back, .moveUp").removeClass("disabled");
        }

        refreshDS();
    };

    DS.release = function() {
        var promises = [];

        $gridView.find(".grid-unit.ds").each(function() {
            var dsId = $(this).data("dsid");
            var def = DS.getDSObj(dsId).release();
            promises.push(def);
        });
        return PromiseHelper.when.apply(window, promises);
    };

    // Clear dataset/folder in gridView area
    DS.clear = function() {
        $gridView.find(".grid-unit").remove();
        $backFolderBtn.addClass("xc-disabled");
        clearDirStack();
        $gridMenu.find(".back, .moveUp").addClass("disabled");
        // reset home folder
        curDirId = homeDirId;
        folderIdCount = 0;
        dsLookUpTable = {};

        homeFolder = new DSObj({
            "id"        : homeDirId,
            "name"      : DSObjTerm.homeDir,
            "fullName"  : DSObjTerm.homeDir,
            "user"      : Support.getUser(),
            "parentId"  : DSObjTerm.homeParentId,
            "uneditable": false,
            "isFolder"  : true,
            "isRecur"   : false
        });

        dsLookUpTable[homeFolder.getId()] = homeFolder;
    };

    // Create dsObj for new dataset/folder
    function createDS(options, dsToReplace) {
        options = options || {};
        // validation check
        xcHelper.assert((options.name != null), "Invalid Parameters");

        // pre-process
        options.name = options.name.trim();
        options.user = options.user || Support.getUser();
        options.parentId = options.parentId || curDirId;
        options.isFolder = options.isFolder || false;
        options.uneditable = options.uneditable || false;

        var parent = DS.getDSObj(options.parentId);

        if (options.isFolder) {
            var i = 1;
            var name = options.name;
            var validName = name;
            // only check folder name as ds name cannot confilct
            while (parent.checkNameConflict(options.id, validName, true))
            {
                validName = name + ' (' + i + ')';
                ++i;
            }
            options.name = validName;
            options.fullName = options.fullName || options.name;
            options.id = options.id || getNewFolderId();
        } else {
            options.fullName = options.fullName ||
                                xcHelper.wrapDSName(options.name);
            // for dataset, use it's full name as id
            options.id = options.id || options.fullName;
        }

        var dsObj = new DSObj(options);
        var $ds = options.uneditable ? $(getUneditableDSHTML(dsObj)) :
                                       $(getDSHTML(dsObj));

        var dsObjToReplace = DS.getDSObj(dsToReplace);
        var $gridToReplace = null;
        if (dsObjToReplace != null) {
            // when replace ds
            $gridToReplace = DS.getGrid(dsToReplace);
        }

        if ($gridToReplace != null) {
            $gridToReplace.after($ds);
            // hide replaced grid first and then delete
            // use .xc-hidden is not good because refreshDS() may display it
            $gridToReplace.hide();
            delDSHelper($gridToReplace, dsObjToReplace, {
                // it fail, show it back
                "failToShow": true,
                "noDeFocus" : true
            });
        } else {
            $gridView.append($ds);
        }

        truncateDSName($ds.find(".label"));

        // cached in lookup table
        dsLookUpTable[dsObj.getId()] = dsObj;

        return dsObj;
    }

    function pointToHelper(dsObj, createTabe, sql, isRetry) {
        var deferred = jQuery.Deferred();
        var dsName = dsObj.getName();

        var $grid = DS.getGrid(dsObj.getId());
        $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);

        DataStore.update();

        var txId = Transaction.start({
            "msg"       : StatusMessageTStr.LoadingDataset + ": " + dsName,
            "operation" : SQLOps.DSPoint,
            "sql"       : sql,
            "steps"     : 1,
            "cancelable": false
        });

        $grid.data("txid", txId);

        // focus on grid before load
        DS.focusOn($grid)
        .then(function() {
            return cleanupHelper();
        })
        .then(function() {
            var args = dsObj.getPointArgs();
            args.push(txId);
            return XcalarLoad.apply(this, args);
        })
        .then(function(ret, error) {
            if (error != null) {
                dsObj.setError(error);
            }

            finishPoint();

            if (error == null && createTabe) {
                createTableHelper($grid, dsObj);
            } else if ($grid.hasClass("active")) {
                // re-focus to trigger DSTable.show()
                if (gMinModeOn) {
                    DS.focusOn($grid);
                } else {
                    $("#dsTableWrap").fadeOut(200, function() {
                        DS.focusOn($grid);
                        $(this).fadeIn();
                    });
                }
            }

            UserSettings.logDSChange();

            var msgOptions = {
                "newDataSet": true,
                "dataSetId" : dsObj.getId()
            };
            Transaction.done(txId, {
                msgOptions: msgOptions
            });
            deferred.resolve(dsObj);
        })
        .fail(function(error) {
            if (dsObj.getError() != null) {
                dsObj.setError(error);
            }
            finishPoint();
            DS.focusOn($grid);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.LoadFailed,
                "error"  : error
            });

            deferred.reject(error);
        });

        return deferred.promise();

        function finishPoint() {
            $grid.removeData("txid");
            $grid.removeClass("inactive").find(".waitingIcon").remove();
            // display new dataset
            refreshDS();
        }

        function cleanupHelper() {
            if (!isRetry) {
                return PromiseHelper.resolve();
            }

            var innerDeferred = jQuery.Deferred();

            dsObj.release()
            .then(function() {
                return XcalarDestroyDataset(dsObj.getFullName(), txId);
            })
            .then(innerDeferred.resolve)
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }
    }

    function cancelDSHelper(txId, $grid, dsObj) {
        $grid.removeClass("active").addClass("inactive deleting");
        // if cancel success, it will trigger fail in DS.point, so it's fine
        QueryManager.cancelQuery(txId)
        .fail(function(error) {
            console.error(error);
            // if cancel fails, might be a succesful load, try delete then
            delDSHelper($grid, dsObj);
        });
    }

    // Helper function for DS.remove()
    function delDSHelper($grid, dsObj, options) {
        options = options || {};
        var forceRemove = options.forceRemove || false;
        var noDeFocus = options.noDeFocus || false;
        var failToShow = options.failToShow || false;

        var deferred = jQuery.Deferred();

        $grid.removeClass("active")
             .addClass("inactive deleting")
             .append('<div class="waitingIcon"></div>');

        $grid.find(".waitingIcon").fadeIn(200);

        var dsName = dsObj.getFullName();
        var dsId = dsObj.getId();

        var sql = {
            "operation": SQLOps.DestroyDS,
            "dsName"   : dsName,
            "dsId"     : dsId
        };
        var txId = Transaction.start({
            "operation": SQLOps.DestroyDS,
            "sql"      : sql
        });

        dsObj.release()
        .then(function() {
            return XcalarDestroyDataset(dsName, txId);
        })
        .then(function() {
            //clear data cart
            DSCart.removeCart(dsId);
            // clear data table
            $("#dsTableWrap").empty();
            // remove ds obj
            removeDS($grid);
            DataStore.update();
            if (!noDeFocus) {
                focusOnFirstDS();
            }
            UserSettings.logDSChange();

            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            $grid.find('.waitingIcon').remove();
            $grid.removeClass("inactive")
                 .removeClass("deleting");

            var noAlert = false;
            if (forceRemove) {
                removeDS($grid);
                DataStore.update();
            } else if (failToShow) {
                $grid.show();
                noAlert = true;
            }

            Transaction.fail(txId, {
                "failMsg": DSTStr.DelDSFail,
                "error"  : error,
                "noAlert": noAlert
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    // Helper function to remove ds
    function removeDS($grid) {
        var dsId = $grid.data("dsid");
        var dsObj = DS.getDSObj(dsId);

        if (dsObj.beFolderWithDS()) {
            // add alert
            Alert.show({
                "title"   : DSTStr.DelFolder,
                "instr"   : DSTStr.DelFolderInstr,
                "msg"     : DSTStr.DelFolderMsg,
                "isAlert" : true,
                "onCancel": focsueOnTracker
            });

            return false;
        } else {
            dsObj.removeFromParent();
            // delete ds
            delete dsLookUpTable[dsId];
            $grid.remove();

            return true;
        }
    }

    // Refresh dataset/folder display in gridView area
    function refreshDS() {
        $gridView.find(".grid-unit").addClass("xc-hidden");
        $gridView.find('.grid-unit[data-dsParentId="' + curDirId + '"]')
                .removeClass("xc-hidden");

        var dirId = curDirId;
        var path = "";
        var count = 0;
        while (dirId !== homeDirId) {
            var dsObj = DS.getDSObj(dirId);
            // only the last two folder show the name
            var name;
            if (count < 2) {
                if (dirId === curDirId) {
                    name = dsObj.getName();
                } else {
                    name = '<span class="path" data-dir="' + dirId + '">' +
                                dsObj.getName() +
                            '</span>';
                }
            } else {
                name = '...';
            }

            path = name + " / " + path;
            dirId = dsObj.getParentId();
            count++;
        }

        if (curDirId === homeDirId) {
            path = DSTStr.Home + "/" + path;
        } else {
            path = '<span class="path" data-dir="' + homeDirId + '">' +
                        DSTStr.Home +
                    '</span>' +
                    " / " + path;
        }

        $("#dsListSection .pathSection").html(path);
    }

    // Focus on the first dataset in the folder
    function focusOnFirstDS() {
        var $curFolder = DS.getGrid(curDirId);
        var $datasets = $curFolder.find("> .grid-unit.ds").not(".xc-hidden");

        if ($datasets.length > 0) {
            DS.focusOn($datasets.eq(0));
        } else {
            DSForm.show();
        }
    }

    function canCreateFolder(dirId) {
        var dsObj = DS.getDSObj(dirId);

        if (dsObj.isEditable()) {
            return true;
        } else {
            Alert.show({
                "title"  : DSTStr.NoNewFolder,
                "msg"    : DSTStr.NoNewFolderMsg,
                "isAlert": true
            });
            return false;
        }
    }

    function restoreDS(oldHomeFolder, atStartUp) {
        var deferred = jQuery.Deferred();

        DS.clear();

        XcalarGetDatasets()
        .then(function(datasets) {
            restoreHelper(oldHomeFolder, datasets, atStartUp);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Restore DS fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function restoreHelper(oldHomeFolder, datasets, atStartUp) {
        var numDatasets = datasets.numDatasets;
        var searchHash = {};
        var userPrefix = xcHelper.wrapDSName("");

        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;

            if (atStartUp && dsName.endsWith(".preview") &&
                dsName.startsWith(userPrefix))
            {
                // deal with preview datasets,
                // if it's the current user's preview ds,
                // then we delete it on start up time
                var sql = {
                    "operation": SQLOps.DestroyPreviewDS,
                    "dsName"   : dsName
                };
                var txId = Transaction.start({
                    "operation": SQLOps.DestroyPreviewDS,
                    "sql"      : sql
                });

                XcalarDestroyDataset(dsName, txId)
                .then(function() {
                    Transaction.done(txId, {
                        "noCommit": true,
                        "noSql"   : true
                    });
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "error"  : error,
                        "noAlert": true
                    });
                });

                continue;
            }

            searchHash[dsName] = datasets.datasets[i];
        }

        var cache;

        if ($.isEmptyObject(oldHomeFolder)) {
            cache = [];
        } else {
            cache = oldHomeFolder.eles;
        }

        // always create the other user's folder first
        var otherUserFolder = createDS({
            "id"        : DSObjTerm.OtherUserFolderId,
            "name"      : DSObjTerm.OtherUserFolder,
            "parentId"  : homeDirId,
            "isFolder"  : true,
            "uneditable": true
        });

        // restore the ds and folder
        var ds;
        var format;

        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.uneditable) {
                // skip the restore of uneditable ds,
                // it will be handled by DS.addOtherUserDS()
                continue;
            }

            if (obj.isFolder) {
                // restore a folder
                createDS(obj);

                // update id count
                updateFolderIdCount(obj.id);

                if (obj.eles != null) {
                    $.merge(cache, obj.eles);
                }
            } else {
                if (searchHash.hasOwnProperty(obj.fullName)) {
                    // restore a ds
                    ds = searchHash[obj.fullName];
                    format = DfFormatTypeTStr[ds.formatType].toUpperCase();

                    obj = $.extend(obj, {
                        "format": format,
                        "path"  : ds.url
                    });

                    createDS(obj);
                    // mark the ds to be used
                    delete searchHash[obj.fullName];
                } else {
                    // when ds has front meta but no backend meta
                    // this is an error case since only this user can delete
                    // his own datasets
                    console.error(obj, "has meta but no backend info!");
                }
            }
        }

        // add ds that is not in oldHomeFolder
        for (var dsName in searchHash) {
            ds = searchHash[dsName];

            if (ds != null) {
                format = DfFormatTypeTStr[ds.formatType].toUpperCase();

                if (dsName.startsWith(userPrefix)) {
                    // XXX this case appears when same use switch workbook
                    // and lose the folder meta
                    // should change when we support user scope session
                    DS.addCurrentUserDS(ds.name, format, ds.url);
                } else {
                    DS.addOtherUserDS(ds.name, format, ds.url);
                }
            }
        }

        if (!otherUserFolder.beFolderWithDS()) {
            // when the other user folder has no children
            // remove this folder
            var otherUserFolderId = otherUserFolder.getId();
            removeDS(DS.getGrid(otherUserFolderId));
        }

        // UI update
        refreshDS();
        DataStore.update();
    }

    function createTableHelper($grid, dsObj) {
        var deferred = jQuery.Deferred();
        var colsToPull;

        dsObj.fetch(0, 40)
        .then(function(json, jsonKeys) {
            colsToPull = jsonKeys;
            return xcHelper.getUnusedTableName(dsObj.getName());
        })
        .then(function(tableName) {
            var cart = DSCart.addCart(dsObj.getId(), tableName, true);
            colsToPull.forEach(function(colName) {
                var item = {"value": colName};
                cart.addItem(item);
            });
            var worksheet = WSManager.getActiveWS();
            var noFocus = !$grid.hasClass("active");

            return DSCart.createTable(cart, worksheet, noFocus);
        })
        .then(function() {
            DS.focusOn($grid);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupGridViewButtons() {
        // click to toggle list view and grid view
        $("#dataViewBtn, #exportViewBtn").click(function() {
            var $btn = $(this);
            var isListView;

            if ($btn.hasClass("gridView")) {
                isListView = true;
            } else {
                isListView = false;
            }

            toggleDSView(isListView);
        });

         // click "Add New Folder" button to add new folder
        $("#addFolderBtn").click(function() {
            DS.newFolder();
        });

        // click "Back Up" button to go back to parent folder
        $backFolderBtn.click(function() {
            DS.upDir();
        });

        $forwardFolderBtn.click(function() {
            popDirStack();
        });
    }

    function setupGrids() {
        // refresh dataset
        $("#refreshDS").click(function() {
            refreshHelper();
        });

        $("#dsListSection .pathSection").on("click", ".path", function() {
            var dir = $(this).data("dir");
            goToDirHelper(dir);
        });

        // click empty area on gridView
        $("#dsListSection .gridViewWrapper").on("click", function() {
            // this hanlder is called before the following one
            $gridView.find(".active").removeClass("active");
            cleanDSSelect();
        });

        $dsListFocusTrakcer.on("keydown", function(event) {
            // pre-check if it's the grid that focusing on
            var dsid = $dsListFocusTrakcer.data("dsid");
            var $grid = DS.getGrid(dsid);
            if ($grid == null || !$grid.hasClass("active")) {
                return;
            }

            var isFolder = $grid.hasClass("folder");
            if (isFolder && $grid.find(".label").hasClass("active")) {
                // don't do anything when renaming
                return;
            }

            switch (event.which) {
                case keyCode.Delete:
                    DS.remove($grid);
                    break;
                case keyCode.Enter:
                    if (isFolder) {
                        goToDirHelper(dsid);
                    }
                    break;
                default:
                    break;
            }
        });

        // click a folder/ds
        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            cleanDSSelect();
            focusDSHelper($(this));
        });

        $gridView.on("click", ".grid-unit .delete", function() {
            var $grid = $(this).closest(".grid-unit");
            focusDSHelper($grid);
            DS.remove($grid);
            // stop event propogation
            return false;
        });

        $gridView.on("click", ".grid-unit .edit", function() {
            var $grid = $(this).closest(".grid-unit");
            focusDSHelper($grid);
            var $label = $grid.find(".label");
            renameHelper($label);
            // stop event propogation
            return false;
        });

        $gridView.on("dblclick", ".folder > .label", function() {
            renameHelper($(this));
            // stop event propogation
            return false;
        });

        // Input event on folder
        $gridView.on({
            // press enter to remove focus from folder label
            "keypress": function(event) {
                if (event.which === keyCode.Enter) {
                    event.preventDefault();
                    $(this).blur();
                }
            },
            // make textarea's height flexible
            "keyup": function() {
                var textarea = $(this).get(0);
                // with this, textarea can back to 15px when do delete
                textarea.style.height = "15px";
                textarea.style.height = (textarea.scrollHeight) + "px";
            },

            "click": function(event) {
                // make text are able to click
                event.stopPropagation();
            },

            "blur": function() {
                var $textarea = $(this);
                var $label = $textarea.closest(".label");

                if (!$label.hasClass("focused")) {
                    return;
                }

                var dsId = $label.closest(".grid-unit").data("dsid");
                var newName = $textarea.val().trim();
                DS.rename(dsId, newName);
                truncateDSName($label);

                $label.removeClass("focused");
                xcHelper.removeSelectionRange();
            }
        }, ".folder > .label textarea");

        // dbclick to open folder
        $gridView.on("dblclick", ".grid-unit.folder", function() {
            var $grid = $(this);
            goToDirHelper($grid.data("dsid"));
        });

        // click right menu
        $gridView.parent()[0].oncontextmenu = function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");
            var classes = "";
            cleanDSSelect();
            if ($grid.length) {
                // focusDSHelper($grid);
                $grid.addClass("selected");
                var dsId = $grid.data("dsid");
                var dsObj = DS.getDSObj(dsId);
                if (!dsObj.isEditable()) {
                    classes += " uneditable";
                } else if ($grid.hasClass("deleting")) {
                    // if it's deleting, also make it uneditable
                    classes += " uneditable";
                }

                $gridMenu.data("dsid", dsId);

                if (dsObj.beFolder()) {
                    classes += " folderOpts";
                } else {
                    classes += " dsOpts";
                }
            } else {
                classes += " bgOpts";
                $gridMenu.removeData("dsid");
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes"   : classes,
                "floating"  : true
            });
            return false;
        };
    }

    function setupMenuActions() {
        // bg opeartion
        $gridMenu.on("mouseup", ".newFolder", function() {
            DS.newFolder();
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".back", function() {
            if (!$(this).hasClass("disabled")) {
                DS.upDir();
            }
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".refresh", function() {
            refreshHelper();
            cleanDSSelect();
        });

        // folder/ds operation
        $gridMenu.on("mouseup", ".open", function() {
            goToDirHelper($gridMenu.data("dsid"));
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".moveUp", function() {
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            DS.dropToParent($grid);
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".rename", function() {
            renameHelper(null, $gridMenu.data("dsid"));
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".preview", function() {
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            focusDSHelper($grid);
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".delete", function() {
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            DS.remove($grid);
            cleanDSSelect();
        });
    }

    function focsueOnTracker() {
        $dsListFocusTrakcer.focus();
    }

    function refreshHelper() {
        xcHelper.showRefreshIcon($gridView);
        restoreDS(DS.getHomeDir())
        .then(KVStore.commit);
    }

    function renameHelper($label, dsId) {
        if ($label == null && dsId == null) {
            return;
        }

        if ($label == null) {
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            $label = $grid.find("> .label");
        }

        if (dsId == null) {
            dsId = $label.closest(".grid-unit").data("dsid");
        }

        var isEditable = DS.getDSObj(dsId).isEditable();
        if ($label.hasClass("focused") || !isEditable) {
            return;
        }
        $label.addClass("focused");
        var name = $label.data("dsname");
        var html = '<textarea spellcheck="false">' + name + '</textarea>';
        $label.html(html).focus();

        // select all text
        var $textarea = $label.find("textarea").select();
        var textarea = $textarea.get(0);
        textarea.style.height = (textarea.scrollHeight) + "px";
    }

    function goToDirHelper(dsid) {
        if (dsid == null) {
            // error case
            console.error("Invalid dsid");
        }

        $gridView.find(".active").removeClass("active");
        DS.goToDir(dsid);
        clearDirStack();
    }

    function pushDirStack(dirId) {
        dirStack.push(dirId);
        $forwardFolderBtn.removeClass("xc-disabled");
    }

    function popDirStack() {
        if (dirStack.length <= 0) {
            // this is error case
            return;
        }

        var dirId = dirStack.pop();
        DS.goToDir(dirId);

        if (dirStack.length <= 0) {
            $forwardFolderBtn.addClass("xc-disabled");
        }
    }

    function clearDirStack() {
        dirStack = [];
        $forwardFolderBtn.addClass("xc-disabled");
    }

    function focusDSHelper($grid) {
        // when is deleting the ds, do nothing
        if ($grid != null && !$grid.hasClass("deleting")) {
            DS.focusOn($grid);
        }
    }

    // toggle between list view and grid view
    function toggleDSView(isListView, noRefreshTooltip) {
        var $btn = $("#dataViewBtn, #exportViewBtn");
        var $allGrids = $gridView.add($("#dsExportListSection .gridItems"));
        // includes import and export grids
        xcHelper.toggleListGridBtn($btn, isListView, noRefreshTooltip);

        if (isListView) {
            // show list view
            $allGrids.removeClass("gridView").addClass("listView");
        } else {
            $allGrids.removeClass("listView").addClass("gridView");
        }

        var $labels = $allGrids.find(".label:visible");
        truncateDSName($labels, isListView);
    }

    function updateFolderIdCount(folderId) {
        var currentIdPointer = folderId.split("folder-")[1];
        folderIdCount = Math.max(folderIdCount, Number(currentIdPointer) + 1);
    }

    function getNewFolderId() {
        var newId = "folder-" + folderIdCount;
        folderIdCount++;
        return newId;
    }

    // Helper function for createDS()
    function getDSHTML(dsObj) {
        var id = dsObj.getId();
        var parentId = dsObj.getParentId();
        var name = dsObj.getName();
        var html;

        if (dsObj.beFolder()) {
            // when it's a folder
            html =
            '<div class="folder grid-unit" draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-dsId="' + id + '"' +
                ' data-dsParentId=' + parentId + '>' +
                '<div id="' + (id + "leftWarp") + '"' +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div  id="' + (id + "midWarp") + '"' +
                    ' class="dragWrap midDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div  id="' + (id + "rightWarp") + '"' +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<i class="gridIcon icon xi-folder"></i>' +
                '<div class="dsCount">0</div>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
                '<i class="icon xi-trash delete fa-15"></i>' +
                '<i class="icon xi-edit edit fa-15"></i>' +
            '</div>';
        } else {
            // when it's a dataset
            html =
            '<div class="ds grid-unit" ' +
                'draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-user="' + dsObj.getUser() + '"' +
                ' data-dsname="' + name + '"' +
                ' data-dsId="' + id + '"' +
                ' data-dsParentId="' + parentId + '"">' +
                '<div  id="' + (id + "leftWarp") + '"' +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div id="' + (id + "rightWarp") + '"' +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<i class="gridIcon icon xi_data"></i>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
                '<i class="icon xi-trash delete fa-15"></i>' +
            '</div>';
        }

        return (html);
    }

    // Helper function for createDS()
    function getUneditableDSHTML(dsObj) {
        var id = dsObj.getId();
        var parentId = dsObj.getParentId();
        var name = dsObj.getName();
        var html;
        if (dsObj.beFolder()) {
            // when it's a folder
            html =
            '<div class="folder grid-unit uneditable"' +
                ' data-dsId="' + id + '"' +
                ' data-dsParentId=' + parentId + '>' +
                '<i class="gridIcon icon xi-folder"></i>' +
                '<div class="dsCount">0</div>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
            '</div>';
        } else {
            // when it's a dataset
            html =
            '<div class="ds grid-unit uneditable" ' +
                ' data-user="' + dsObj.getUser() + '"' +
                ' data-dsname="' + name + '"' +
                ' data-dsId="' + id + '"' +
                ' data-dsParentId="' + parentId + '"">' +
                '<i class="gridIcon icon xi_data"></i>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
            '</div>';
        }

        return (html);
    }

    function truncateDSName($labels, isListView) {
        if (isListView == null) {
            isListView = $gridView.hasClass("listView");
        }

        var maxChar = isListView ? 18 : 8;
        var maxWidth = isListView ? 165 : 52;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $labels.each(function() {
            var $label = $(this);
            var name = $label.data("dsname");
            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                    !isListView, ctx);
        });
    }

    function cleanDSSelect() {
        $gridView.find(".selected").removeClass("selected");
    }

    /*** Drag and Drop API ***/
    // Helper function for drag start event
    DS.onDragStart = function(event) {
        var $grid = $(event.target).closest(".grid-unit");

        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        // must add datatransfer to support firefox drag drop
        event.dataTransfer.setData("text", "");

        setDragDS($grid);
        resetDropTarget();

        $grid.find("> .dragWrap").addClass("xc-hidden");
        $gridView.find(".active").removeClass("active");
        $gridView.addClass("drag");

        // when enter extra space in grid view
        $gridView.on("dragenter", function(){
            resetDropTarget();
            $gridView.find(".active").removeClass("active");
        });
    };

    // Helper function for drag end event
    DS.onDragEnd = function(event) {
        var $grid = $(event.target).closest(".grid-unit");

        event.stopPropagation();

        // clearence
        $grid.find("> .dragWrap").removeClass("xc-hidden");
        resetDropTarget();
        resetDragDS();

        $gridView.removeClass("drag");
        $gridView.off("dragenter");
        $gridView.find(".active").removeClass("active");
    };

    // Helper function for drag enter event
    DS.onDragEnter = function(event) {
        var $dragWrap = $(event.target);
        var targetId = $dragWrap.attr("id");
        var $curDropTarget = getDropTarget();

        event.preventDefault();
        event.stopPropagation();

        // back up button
        if (!$curDropTarget || targetId !== $curDropTarget.attr("id")) {
            // change drop target
            $(".grid-unit").removeClass("active");
            $(".dragWrap").removeClass("active");

            if ($dragWrap.hasClass("midDragWrap")) {
                // drop in folder case
                $dragWrap.closest(".grid-unit").addClass("active");
            } else {
                // insert case
                $dragWrap.addClass("active");
            }

            setDropTraget($dragWrap);
        }
    };

    // Helper function for drag over event
    DS.allowDrop = function(event) {
        // call the event.preventDefault() method for
        // the ondragover allows a drop
        event.preventDefault();
    };

    // Helper function for drop event
    DS.onDrop = function(event) {
        var $div = getDropTarget();
        var $target = $div.closest('.grid-unit');
        var $grid = getDragDS();

        event.stopPropagation();

        if ($div != null) {
            if ($div.hasClass('midDragWrap')) {
                DS.dropToFolder($grid, $target);
            } else if ($div.hasClass('leftTopDragWrap')) {
                DS.insert($grid, $target, true);
            } else {
                DS.insert($grid, $target, false);
            }
            var $labels = $gridView.find(".label:visible");
            truncateDSName($labels);
        }
    };

    // Helper function to drop ds into a folder
    DS.dropToFolder = function($grid, $target) {
        var dragDsId = $grid.data("dsid");
        var ds = DS.getDSObj(dragDsId);

        var targetId = $target.data("dsid");
        if (dragDsId === targetId) {
            return;
        }
        var targetDS = DS.getDSObj(targetId);

        if (ds.moveTo(targetDS, -1)) {
            $grid.attr("data-dsParentId", targetId)
                .data("dsParentId", targetId);
            refreshDS();

            UserSettings.logDSChange();
        }
    };

    // Helper function to insert ds before or after another ds
    DS.insert = function($grid, $sibling, isBefore) {
        var dragDsId = $grid.data("dsid");
        var ds = DS.getDSObj(dragDsId);

        var siblingId = $sibling.attr("data-dsId");
        if (dragDsId === siblingId) {
            return;
        }
        var siblingDs = DS.getDSObj(siblingId);

        // parent
        var parentId = siblingDs.parentId;
        var parentDs = DS.getDSObj(parentId);

        var insertIndex = parentDs.eles.indexOf(siblingDs);
        var isMoveTo;

        if (isBefore) {
            isMoveTo = ds.moveTo(parentDs, insertIndex);
        } else {
            isMoveTo = ds.moveTo(parentDs, insertIndex + 1);
        }

        if (isMoveTo) {
            $grid.attr("data-dsParentId", parentId)
                .data("dsParentId", parentId);
            if (isBefore) {
                $sibling.before($grid);
            } else {
                $sibling.after($grid);
            }
            refreshDS();

            UserSettings.logDSChange();
        }
    };

    DS.dropToParent = function($grid) {
        var dsId = $grid.data("dsid");
        var ds = DS.getDSObj(dsId);
        // target
        var grandPaId = DS.getDSObj(ds.parentId).parentId;
        var grandPaDs = DS.getDSObj(grandPaId);

        if (ds.moveTo(grandPaDs, -1)) {
            $grid.attr("data-dsParentId", grandPaId)
                    .data("dsParentId", grandPaId);
            refreshDS();

            UserSettings.logDSChange();
        }
    };

    // Get current dataset/folder in drag
    function getDragDS() {
        return $dragDS;
    }

    // Set current dataset/folder in drag
    function setDragDS($ds) {
        $dragDS = $ds;
    }

    // Reset drag dataset/folder
    function resetDragDS() {
        $dragDS = undefined;
    }

    // Get drop target
    function getDropTarget() {
        return $dropTarget;
    }

    // Set drop target
    function setDropTraget($target) {
        $dropTarget = $target;
    }

    // Reset drop target
    function resetDropTarget() {
        $dropTarget = undefined;
    }

    /* End of Drag and Drop API */

    /* Unit Test Only */
    if (window.unitTestMode) {
        DS.__testOnly__ = {};
        DS.__testOnly__.delDSHelper = delDSHelper;
        DS.__testOnly__.toggleDSView = toggleDSView;
        DS.__testOnly__.canCreateFolder = canCreateFolder;
        DS.__testOnly__.createDS = createDS;
        DS.__testOnly__.removeDS = removeDS;

        DS.__testOnly__.getDragDS = getDragDS;
        DS.__testOnly__.setDragDS = setDragDS;
        DS.__testOnly__.resetDragDS = resetDragDS;
        DS.__testOnly__.getDropTarget = getDropTarget;
        DS.__testOnly__.setDropTraget = setDropTraget;
        DS.__testOnly__.resetDropTarget = resetDropTarget;
    }
    /* End Of Unit Test Only */

    return (DS);
}(jQuery, {}));
