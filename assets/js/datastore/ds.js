/*
 * Module for mamgement of dsObj
 */
window.DS = (function ($, DS) {
    var homeDirId; // DSObjTerm.homeDirId

    var curDirId;       // current folder id
    var folderIdCount;  // counter
    var dsLookUpTable;  // find DSObj by dsId
    var homeFolder;
    var errorDSSet = {}; // UI cache only

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
        xcMenu.add($gridMenu);
        setupMenuActions();
    };

    // Restore dsObj
    DS.restore = function(oldHomeFolder, atStartUp) {
        return restoreDS(oldHomeFolder, atStartUp);
    };

    // recursive call to upgrade dsObj
    DS.upgrade = function(dsObj) {
        if (dsObj == null) {
            return null;
        }

        var newDSObj = KVStore.upgrade(dsObj, "DSObj");
        if (dsObj.isFolder && dsObj.eles.length > 0) {
            var len = dsObj.eles.length;
            for (var i = 0; i < len; i++) {
                newDSObj.eles[i] = DS.upgrade(dsObj.eles[i]);
            }
        }

        return newDSObj;
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
        return dsLookUpTable[dsId] || null;
    };

    DS.getErrorDSObj = function(dsId) {
        return errorDSSet[dsId] || null;
    };

    DS.removeErrorDSObj = function(dsId) {
        delete errorDSSet[dsId];
    };

    // Get grid element(folder/datasets) by dsId
    DS.getGrid = function(dsId) {
        if (dsId == null) {
            return null;
        } else if (dsId === homeDirId) {
            return $gridView;
        } else {
            return $gridView.find('.grid-unit[data-dsid="' + dsId + '"]');
        }
    };

    // create a new folder
    DS.newFolder = function() {
        if (!canCreateFolder(curDirId)) {
            // when cannot create folder in current dir
            return null;
        }

        var ds = createDS({
            "name": DSTStr.NewFolder,
            "isFolder": true
        });

        UserSettings.logChange();

        // forcus on folder's label for renaming
        DS.getGrid(ds.id).click()
                .find('.label').click();

        return ds;
    };

    DS.addCurrentUserDS = function(fullDSName, options) {
        var parsedRes = xcHelper.parseDSName(fullDSName);
        var user = parsedRes.user;
        var dsName = parsedRes.dsName;
        options = $.extend({}, options, {
            "id": fullDSName, // user the fulldsname as a unique id
            "name": dsName,
            "user": user,
            "fullName": fullDSName,
            "uneditable": false,
            "isFolder": false
        });

        return createDS(options);
    };

    // refresh a new dataset and add it to grid view
    DS.addOtherUserDS = function(fullDSName, options) {
        var parsedRes = xcHelper.parseDSName(fullDSName);
        var user = parsedRes.user;
        var dsName = parsedRes.dsName;
        var otherUserFolder = DS.getDSObj(DSObjTerm.OtherUserFolderId);
        var userFolderObj = null;

        if (otherUserFolder == null) {
            otherUserFolder = createOtherUserFolder();
        }

        otherUserFolder.eles.some(function(dsObj) {
            if (dsObj.getName() === user) {
                userFolderObj = dsObj;
                return true;
            }
            return false;
        });

        if (userFolderObj === null) {
            userFolderObj = createDS({
                "id": user,
                "name": user,
                "user": user,
                "uneditable": true,
                "isFolder": true,
                "parentId": DSObjTerm.OtherUserFolderId
            });
        }

        options = $.extend({}, options, {
            "id": fullDSName, // user the fulldsname as a unique id
            "name": dsName,
            "user": user,
            "fullName": fullDSName,
            "uneditable": true,
            "isFolder": false,
            "parentId": userFolderObj.getId(),
        });
        return createDS(options);
    };

    DS.focusOn = function($grid) {
        xcAssert($grid != null && $grid.length !== 0, "error case");
        if ($grid.hasClass("active") && $grid.hasClass("fetching")) {
            console.info("ds is fetching");
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var dsId = $grid.data("dsid");

        $gridView.find(".active").removeClass("active");
        $grid.addClass("active");
        $dsListFocusTrakcer.data("dsid", dsId).focus();
        // folder do not show anything
        if ($grid.hasClass("folder")) {
            return PromiseHelper.resolve();
        } else if ($grid.hasClass("unlistable")) {
            DSTable.showError(dsId, ErrTStr.MakrForDel, true);
            return PromiseHelper.resolve();
        }

        var isLoading;
        if ($grid.find('.waitingIcon').length !== 0) {
            isLoading = true;
        } else {
            isLoading = false;
        }

        $grid.addClass("fetching");
        // when switch to a ds, should clear others' ref count first!!
        DSTable.show(dsId, isLoading)
        .then(function() {
            deferred.resolve(isLoading);
        })
        .fail(function(error) {
            console.error("Focus on ds fails!", error);
            deferred.reject(error);
        })
        .always(function() {
            $grid.removeClass("fetching");
        });

        return deferred.promise();
    };

    /* Import dataset, promise returns dsObj
        options:
            createTable: if set true, will auto create the table
            dsToReplace: if set true, will replace the old ds
    */
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
            "options": options
        };

        return pointToHelper(dsObj, createTable, sql);
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

                UserSettings.logChange();
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
        var user = XcSupport.getUser();
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
    DS.remove = function($grids) {
        xcAssert($grids != null && $grids.length !== 0);
        var deferred = jQuery.Deferred();

        alertDSRemove($grids)
        .then(function() {
            var dsIds = [];
            $grids.each(function() {
                dsIds.push($(this).data("dsid"));
            });
            cleanDSSelect();
            return removeDSHandler(dsIds);
        })
        .then(deferred.resolve)
        .fail(function() {
            focsueOnTracker();
            deferred.reject();
        });

        return deferred.promise();
    };

    DS.cancel = function($grid) {
        xcAssert(($grid != null && $grid.length !== 0));
        var deferred = jQuery.Deferred();

        if ($grid.hasClass("active")) {
            focusOnForm();
        }
        $grid.removeClass("active").addClass("inactive deleting");
        var txId = $grid.data("txid");
        // if cancel success, it will trigger fail in DS.point, so it's fine
        QueryManager.cancelQuery(txId)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error(error);
            // if cancel fails, transaction fail handler will delete the ds
            deferred.reject(error);
        });

        return deferred.promise();
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

    DS.resize = function() {
        var $menu = $("#datastoreMenu");
        if ($menu.hasClass("active") && $gridView.hasClass("listView")) {
            var $allGrids = $gridView.add($("#dsExportListSection .gridItems"));
            var $labels = $allGrids.find(".label:visible");
            truncateDSName($labels, true);
        }
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
            "id": homeDirId,
            "name": DSObjTerm.homeDir,
            "fullName": DSObjTerm.homeDir,
            "user": XcSupport.getUser(),
            "parentId": DSObjTerm.homeParentId,
            "uneditable": false,
            "isFolder": true,
            "isRecur": false
        });

        dsLookUpTable[homeFolder.getId()] = homeFolder;
    };

    // Create dsObj for new dataset/folder
    function createDS(options, dsToReplace) {
        options = options || {};
        // validation check
        xcAssert((options.name != null), "Invalid Parameters");

        // pre-process
        options.name = options.name.trim();
        options.user = options.user || XcSupport.getUser();
        options.parentId = options.parentId || curDirId;
        options.isFolder = options.isFolder || false;
        options.uneditable = options.uneditable || false;

        var parent = DS.getDSObj(options.parentId);
        var unlistable = options.unlistable || false;
        delete options.unlistable; // unlistable is not part of ds attr

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
            options.locked = options.locked;
        }
        var dsObj = new DSObj(options);
        dsObj.addToParent();
        var $ds = options.uneditable ? $(getUneditableDSHTML(dsObj)) :
                                       $(getDSHTML(dsObj));

        if (unlistable && !options.isFolder) {
            $ds.addClass("unlistable noAction");
            xcTooltip.add($ds, {
                "title": DSTStr.Unlistable
            });
        }

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
                "noDeFocus": true
            });
        } else {
            $gridView.append($ds);
        }

        truncateDSName($ds.find(".label"));

        // cached in lookup table
        dsLookUpTable[dsObj.getId()] = dsObj;

        return dsObj;
    }

    function createOtherUserFolder() {
        var folder = createDS({
            "id": DSObjTerm.OtherUserFolderId,
            "name": DSObjTerm.OtherUserFolder,
            "parentId": homeDirId,
            "isFolder": true,
            "uneditable": true
        });

        var $grid = DS.getGrid(DSObjTerm.OtherUserFolderId);
        // grid should be the first on in grid view
        $grid.prependTo($gridView);
        return folder;
    }

    function pointToHelper(dsObj, createTabe, sql) {
        var deferred = jQuery.Deferred();
        var dsName = dsObj.getName();

        var $grid = DS.getGrid(dsObj.getId());
        $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);

        DataStore.update();

        var txId = Transaction.start({
            "msg": StatusMessageTStr.ImportDataset + ": " + dsName,
            "operation": SQLOps.DSPoint,
            "sql": sql,
            "steps": 1
        });

        $grid.data("txid", txId);

        // focus on grid before load
        DS.focusOn($grid)
        .then(function() {
            var args = dsObj.getPointArgs();
            args.push(txId);
            return XcalarLoad.apply(this, args);
        })
        .then(function(ret) {
            // if ret.numBytes doesn't exist, size will be set later by calling
            // XcalarGetDatasetMeta
            var bytes = null;
            if (ret != null) {
                bytes = ret.numBytes;
            }
            dsObj.setSize(bytes);
            finishPoint();

            if (createTabe) {
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
            dsObj.lock();
            $grid.addClass("locked");
            UserSettings.logChange();
            var msgOptions = {
                "newDataSet": true,
                "dataSetId": dsObj.getId()
            };
            Transaction.done(txId, {
                msgOptions: msgOptions
            });
            deferred.resolve(dsObj);
        })
        .fail(function(error, loadError) {
            if (typeof error === "object" &&
                error.status === StatusT.StatusCanceled)
            {
                removeDS(dsObj.getId());
                if ($grid.hasClass("active")) {
                    focusOnForm();
                }
            }
            // show loadError if has, otherwise show error message
            var displayError = loadError || error;
            handlePointError(displayError);

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ImportDSFailed,
                "error": displayError
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

        function handlePointError(error) {
            var dsId = dsObj.getId();
            if ($grid.hasClass("active")) {
                dsObj.setError(error);
                cacheErrorDS(dsId, dsObj);
                DSTable.showError(dsId, error);
                removeDS(dsId);
            }
        }
    }

    function delDSHelper($grid, dsObj, options) {
        options = options || {};
        var forceRemove = options.forceRemove || false;
        var dsName = dsObj.getFullName();
        var dsId = dsObj.getId();
        var isShowDSTable = (DSTable.getId() === dsId ||
                            $("#dsTableContainer").data("id") === dsId);
        var noDeFocus = (options.noDeFocus ||
                        !isShowDSTable ||
                        false);
        var failToShow = options.failToShow || false;

        var deferred = jQuery.Deferred();

        $grid.removeClass("active")
             .addClass("inactive deleting")
             .append('<div class="waitingIcon"></div>');

        $grid.find(".waitingIcon").fadeIn(200);

        var sql = {
            "operation": SQLOps.DestroyDS,
            "dsName": dsName,
            "dsId": dsId
        };
        var txId = Transaction.start({
            "operation": SQLOps.DestroyDS,
            "sql": sql,
            "steps": 1
        });

        checkDSUse(dsName)
        .then(function() {
            return destroyDataset(dsName, txId);
        })
        .then(function() {
            //clear data cart
            DSCart.removeCart(dsId);
            // clear data table
            if (isShowDSTable) {
                DSTable.clear();
            }
            // remove ds obj
            removeDS(dsId);
            if (!noDeFocus) {
                focusOnForm();
            }

            Transaction.done(txId, {
                "noSql": options.noSql,
                "noCommit": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            $grid.find('.waitingIcon').remove();
            $grid.removeClass("inactive")
                 .removeClass("deleting");

            var noAlert = options.noAlert || false;
            if (forceRemove) {
                removeDS(dsId);
            } else if (failToShow) {
                $grid.show();
                noAlert = true;
            }

            Transaction.fail(txId, {
                "failMsg": DSTStr.DelDSFail,
                "error": error,
                "noAlert": noAlert
            });
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function checkDSUse(dsName) {
        var deferred = jQuery.Deferred();
        var currentUser = XcSupport.getUser();

        XcalarGetDatasetUsers(dsName)
        .then(function(users) {
            var otherUsers = [];
            users.forEach(function(user) {
                var name = user.userId.userIdName;
                if (currentUser !== name) {
                    otherUsers.push(name);
                }
            });
            if (otherUsers.length > 0) {
                var error = xcHelper.replaceMsg(DSTStr.DSUsed, {
                    "users": otherUsers.join(",")
                });
                deferred.reject(error);
            } else {
                deferred.resolve();
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function cacheErrorDS(dsId, dsObj) {
        errorDSSet[dsId] = dsObj;
    }

    function alertDSRemove($grids) {
        var deferred = jQuery.Deferred();
        var title;
        var msg;
        var isAlert = false;

        if ($grids.length > 1) {
            // delete multiple ds/folder
            title = DSTStr.DelDS;
            msg = DSTStr.DelMultipleDS;
        } else {
            var $grid = $grids.eq(0);
            var txId = $grid.data("txid");
            var dsId = $grid.data("dsid");
            var dsObj = DS.getDSObj(dsId);
            var dsName = dsObj.getName();

            if (dsObj.beFolder()) {
                // skip folder case
                return PromiseHelper.resolve();
            } else if (dsObj.isLocked()) {
                title = AlertTStr.NoDel;
                msg = xcHelper.replaceMsg(DSTStr.DelLockedDS, {
                    "ds": dsName
                });
                isAlert = true;
            } else if (txId != null) {
                // cancel case
                title = DSTStr.CancalPoint;
                msg = xcHelper.replaceMsg(DSTStr.CancelPointMsg, {
                    "ds": dsName
                });
            } else {
                // when remove ds
                title = DSTStr.DelDS;
                msg = xcHelper.replaceMsg(DSTStr.DelDSConfirm, {
                    "ds": dsName
                });
            }
        }

        Alert.show({
            "title": title,
            "msg": msg,
            "onConfirm": deferred.resolve,
            "onCancel": deferred.reject,
            "isAlert": isAlert
        });

        return deferred.promise();
    }

    function hideUnlistableDS(dsSet) {
        var currentUser = XcSupport.getUser();
        for (var dsId in dsSet) {
            var dsObj = DS.getDSObj(dsId);
            var $grid = DS.getGrid(dsId);
            if (dsObj != null && dsObj.getUser() === currentUser) {
                // when it's the currentUser's ds, can try to delete it
                // tryRemoveUnlistableDS($grid, dsObj);
            } else {
                $grid.hide();
            }
        }
    }

    // function tryRemoveUnlistableDS($grid, dsObj) {
    //     var dsName = dsObj.getFullName();
    //     XcalarGetDatasetUsers(dsName)
    //     .then(function(users) {
    //         if (users == null || users.length === 0) {
    //             console.info("remove mark for deletion ds");
    //             // when no one use it
    //             delDSHelper($grid, dsObj, {
    //                 "noAlert": true,
    //                 "noSql": true
    //             });
    //         }
    //     });
    // }

    function destroyDataset(dsName, txId) {
        var deferred = jQuery.Deferred();

        XcalarDestroyDataset(dsName, txId)
        .then(deferred.resolve)
        .fail(function(error) {
            if (error.status === StatusT.StatusNsNotFound ||
                error.status === StatusT.StatusDsNotFound)
            {
                // this error means the ds is not created,
                // it's nomral when import ds fail but gui still has
                // the grid icon
                deferred.resolve();
            } else {
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function removeDSHandler(dsIds) {
        var deferred = jQuery.Deferred();
        var failures = [];
        var promises = [];
        var datasets = [];

        dsIds.forEach(function(dsId) {
            promises.push(removeOneDSHelper(dsId, failures, datasets));
        });

        PromiseHelper.when.apply(this, promises)
        .then(function() {
            if (failures.length) {
                Alert.show({
                    "title": AlertTStr.NoDel,
                    "msg": failures.join("\n"),
                    "isAlert": true,
                    "onCancel": focsueOnTracker
                });
            } else {
                focsueOnTracker();
            }

            if (datasets.length) {
                // when has delete datsets
                UserSettings.logChange();
                KVStore.commit();

                XcSupport.memoryCheck(true);
            }

            deferred.resolve();
        })
        .fail(deferred.reject); // should not have any reject case

        return deferred.promise();
    }

    function removeOneDSHelper(dsId, failures, datasets) {
        var dsObj = DS.getDSObj(dsId);
        var dsName = dsObj.getName();
        var err;

        if (dsObj.isLocked()) {
            // delete locked ds
            err = xcHelper.replaceMsg(DSTStr.DelLockedDS, {
                "ds": dsName
            });
            failures.push(err);
            return PromiseHelper.resolve();
        } else if (dsObj.beFolder()) {
            // delete folder
            if (!dsObj.isEditable()) {
                // delete uneditable folder/ds
                err = xcHelper.replaceMsg(DSTStr.DelUneditable, {
                    "ds": dsName
                });
                failures.push(err);
            } else if (!removeFolderRecursive(dsId)) {
                err = xcHelper.replaceMsg(DSTStr.FailDelFolder, {
                    "folder": dsName
                });
                failures.push(err);
            }

            return PromiseHelper.resolve();
        } else {
            var deferred = jQuery.Deferred();
            var $grid = DS.getGrid(dsId);
            var isCanel = ($grid.data("txid") != null);
            var def = isCanel
                      ? DS.cancel($grid)
                      : delDSHelper($grid, dsObj, {"noAlert": true});
            def
            .then(function() {
                datasets.push(dsId);
                deferred.resolve();
            })
            .fail(function(error) {
                if (typeof error === "object" && error.error) {
                    error = error.error;
                }
                var msg = isCanel ? DSTStr.FailCancelDS : DSTStr.FailDelDS;
                error = xcHelper.replaceMsg(msg, {
                    "ds": dsName,
                    "error": error
                });
                failures.push(error);
                // still resolve it
                deferred.resolve();
            });

            return deferred.promise();
        }
    }

    function removeFolderRecursive(dsId) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj.beFolderWithDS()) {
            return false;
        }

        var stack = dsObj.eles;
        while (stack.length !== 0) {
            var childDsObj = stack.pop();
            stack = stack.concat(childDsObj.eles);
            removeDS(childDsObj.getId());
        }

        removeDS(dsId);
        UserSettings.logChange();
        return true;
    }

    // Helper function to remove ds
    function removeDS(dsId) {
        var dsObj = DS.getDSObj(dsId);

        dsObj.removeFromParent();
        removeDSMeta(dsId);
        DataStore.update();
    }

    function removeDSMeta(dsId) {
        var $grid = DS.getGrid(dsId);
        // delete ds
        delete dsLookUpTable[dsId];
        $grid.remove();
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

    function focusOnForm() {
        DSForm.show();
    }

    function canCreateFolder(dirId) {
        var dsObj = DS.getDSObj(dirId);

        if (dsObj.isEditable()) {
            return true;
        } else {
            Alert.show({
                "title": DSTStr.NoNewFolder,
                "msg": DSTStr.NoNewFolderMsg,
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
        var userPrefix = xcHelper.getUserPrefix();
        var unlistableDS = {};
        var uneditableDS = {};

        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;

            if (dsName.endsWith("-xcalar-preview")) {
                if (!atStartUp) {
                    // if not the start up time, not deal with it
                    continue;
                }
                // other users don't deal with it
                if (xcHelper.parseDSName(dsName).user !== userPrefix) {
                    continue;
                }
                // deal with preview datasets,
                // if it's the current user's preview ds,
                // then we delete it on start up time
                var sql = {
                    "operation": SQLOps.DestroyPreviewDS,
                    "dsName": dsName
                };
                var txId = Transaction.start({
                    "operation": SQLOps.DestroyPreviewDS,
                    "sql": sql,
                    "steps": 1
                });

                destroyDataset(dsName, txId)
                .then(function() {
                    Transaction.done(txId, {
                        "noCommit": true,
                        "noSql": true
                    });
                })
                .fail(function(error) {
                    Transaction.fail(txId, {
                        "error": error,
                        "noAlert": true
                    });
                });

                continue;
            }

            if (!datasets.datasets[i].isListable) {
                unlistableDS[dsName] = true;
            }

            searchHash[dsName] = datasets.datasets[i];
        }

        var cache;

        if ($.isEmptyObject(oldHomeFolder)) {
            cache = [];
        } else {
            cache = oldHomeFolder.eles;
        }

        // restore the ds and folder
        var ds;
        var format;

        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.uneditable) {
                // skip the restore of uneditable ds,
                // it will be handled by DS.addOtherUserDS()
                if (obj.isFolder) {
                    if (obj.eles != null) {
                        $.merge(cache, obj.eles);
                    }
                } else {
                    uneditableDS[obj.fullName] = obj;
                }
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
                    format = parseDSFormat(ds);
                    obj = $.extend(obj, {
                        "format": format,
                        "path": ds.url,
                        "unlistable": !ds.isListable
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
                var options = uneditableDS[dsName];
                format = parseDSFormat(ds);
                options = $.extend({}, options, {
                    "format": format,
                    "path": ds.url,
                    "unlistable": !ds.isListable
                });
                if (xcHelper.parseDSName(dsName).user === userPrefix) {
                    // XXX this case appears when same use switch workbook
                    // and lose the folder meta
                    // should change when we support user scope session
                    DS.addCurrentUserDS(ds.name, options);
                } else {
                    // only when other user's ds is listable, show it
                    DS.addOtherUserDS(ds.name, options);
                }
            }
        }

        // UI update
        refreshDS();
        DataStore.update();
        checkUnlistableDS(unlistableDS);
    }

    function parseDSFormat(ds) {
        var format = DfFormatTypeTStr[ds.formatType].toUpperCase();
        if (format === "JSON" && (isExcelUDF(ds.udfName))) {
            format = "Excel";
        }
        return format;
    }

    function isExcelUDF(udfName) {
        return (udfName === "default:openExcelWithHeader")
                || (udfName === "default:openExcel");
    }

    function checkUnlistableDS(unlistableDS) {
        if ($.isEmptyObject(unlistableDS)) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        XcalarGetDSNode()
        .then(function(ret) {
            var numNodes = ret.numNodes;
            var nodeInfo = ret.nodeInfo;
            for (var i = 0; i < numNodes; i++) {
                var fullDSName = nodeInfo[i].name;
                if (unlistableDS.hasOwnProperty(fullDSName)) {
                    var $grid = DS.getGrid(fullDSName);
                    if ($grid != null) {
                        // this ds is unlistable but has table
                        // associate with it
                        $grid.removeClass("noAction");
                        $grid.find(".gridIcon").removeClass("xi_data")
                        .addClass("xi-data-warning-1");
                    }
                    delete unlistableDS[fullDSName];
                }
            }
            hideUnlistableDS(unlistableDS);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("check unlistable ds fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
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
        .fail(function(error) {
            DS.focusOn($grid);
            deferred.reject(error);
        });

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

        $dsListFocusTrakcer.on("keydown", function(event) {
            // pre-check if it's the grid that focusing on
            var dsid = $dsListFocusTrakcer.data("dsid");
            var $grid = DS.getGrid(dsid);
            var $selectedGrids = $gridView.find(".grid-unit.selected");
            if (event.which === keyCode.Delete && $selectedGrids.length) {
                DS.remove($selectedGrids);
                return;
            }

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
            // focusDSHelper($grid);
            DS.remove($grid);
            // stop event propogation
            return false;
        });

        $gridView.on("click", ".grid-unit .lock", function() {
            var $grid = $(this).closest(".grid-unit");
            lockDS($grid.data("dsid"));
            // stop event propogation
            return false;
        });

        $gridView.on("click", ".grid-unit .unlock", function() {
            var $grid = $(this).closest(".grid-unit");
            unlockDS($grid.data("dsid"));
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

            if ($grid.length &&
                $gridView.find(".grid-unit.selected").length > 1)
            {
                // multi selection
                $gridMenu.removeData("dsid");
                classes += " multiOpts";
            } else {
                cleanDSSelect();

                if ($grid.length) {
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

                        if (dsObj.isLocked()) {
                            classes += " dsLock";
                        }
                    }

                    if ($grid.hasClass("unlistable")) {
                        classes += " unlistable";

                        if ($grid.hasClass("noAction")) {
                            classes += " noAction";
                        }
                    }
                } else {
                    classes += " bgOpts";
                    $gridMenu.removeData("dsid");
                }
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        };

        $("#dsListSection .gridViewWrapper").on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $target = $(event.target);
            if (!$target.closest(".uneditable").length &&
                ($target.closest(".gridIcon").length ||
                $target.closest(".label").length))
            {
                // this part is for drag and drop
                return;
            }

            createRectSelection(event.pageX, event.pageY);
        });
    }

    function createRectSelection(startX, startY) {
        $gridMenu.hide();
        return new RectSelction(startX, startY, {
            "id": "gridView-rectSelection",
            "$container": $("#dsListSection .gridViewWrapper"),
            "onStart": function() { $gridView.addClass("drawing"); },
            "onDraw": drawRect,
            "onEnd": endDrawRect
        });
    }

    function drawRect(bound, rectTop, rectRight, rectBottom, rectLeft) {
        $gridView.find(".grid-unit:visible").each(function() {
            var grid = this;
            var $grid = $(grid);
            if ($grid.hasClass("uneditable") && $grid.hasClass("folder")
                || $grid.hasClass("noAction"))
            {
                // skip uneditable folder
                return;
            }

            var gridBound = grid.getBoundingClientRect();
            var gridTop = gridBound.top - bound.top;
            var gridLeft = gridBound.left - bound.left;
            var gridRight = gridBound.right - bound.left;
            var gridBottom = gridBound.bottom - bound.top;

            if (gridTop > rectBottom || gridLeft > rectRight ||
                gridRight < rectLeft || gridBottom < rectTop)
            {
                $grid.removeClass("selecting");
            } else {
                $grid.addClass("selecting");
            }
        });
    }

    function endDrawRect() {
        $gridView.removeClass("drawing");
        var $grids = $gridView.find(".grid-unit.selecting");
        if ($grids.length === 0) {
            $gridView.find(".grid-unit.selected").removeClass("selected");
        } else {
            $grids.each(function() {
                var $grid = $(this);
                $grid.removeClass("selecting")
                     .addClass("selected");
            });
        }
        focsueOnTracker();
    }

    function setupMenuActions() {
        // bg opeartion
        $gridMenu.on("mouseup", ".newFolder", function(event) {
            if (event.which !== 1) {
                return;
            }
            DS.newFolder();
        });

        $gridMenu.on("mouseup", ".back", function(event) {
            if (event.which !== 1) {
                return;
            }
            if (!$(this).hasClass("disabled")) {
                DS.upDir();
            }
        });

        $gridMenu.on("mouseup", ".refresh", function(event) {
            if (event.which !== 1) {
                return;
            }
            refreshHelper();
        });

        // folder/ds operation
        $gridMenu.on("mouseup", ".open", function(event) {
            if (event.which !== 1) {
                return;
            }
            goToDirHelper($gridMenu.data("dsid"));
        });

        $gridMenu.on("mouseup", ".moveUp", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            DS.dropToParent($grid);
        });

        $gridMenu.on("mouseup", ".rename", function(event) {
            if (event.which !== 1) {
                return;
            }
            renameHelper(null, $gridMenu.data("dsid"));
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".preview", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            focusDSHelper($grid);
            cleanDSSelect();
        });

        $gridMenu.on("mouseup", ".delete", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $grid = DS.getGrid($gridMenu.data("dsid"));
            DS.remove($grid);
        });

        $gridMenu.on("mouseup", ".multiDelete", function(event) {
            if (event.which !== 1) {
                return;
            }
            DS.remove($gridView.find(".grid-unit.selected"));
        });

        $gridMenu.on("mouseup", ".getInfo", function(event) {
            if (event.which !== 1) {
                return;
            }
            DSInfoModal.show($gridMenu.data("dsid"));
        });

        $gridMenu.on("mouseup", ".lockDS", function(event) {
            if (event.which !== 1) {
                return;
            }
            lockDS($gridMenu.data("dsid"));
        });

        $gridMenu.on("mouseup", ".unlockDS", function(event) {
            if (event.which !== 1) {
                return;
            }
            unlockDS($gridMenu.data("dsid"));
        });
    }

    function focsueOnTracker() {
        $dsListFocusTrakcer.focus();
    }

    function refreshHelper() {
        xcHelper.showRefreshIcon($gridView);
        DS.restore(DS.getHomeDir())
        .then(function() {
            cleanFocusedDSIfNecessary();
            KVStore.commit();
        });

        function cleanFocusedDSIfNecessary() {
            var dsId = DSTable.getId();
            if (dsId == null) {
                return;
            }

            var dsObj = DS.getDSObj(dsId);
            if (dsObj == null) {
                // when this ds is not there after refresh
                DSCart.removeCart(dsId);
                // clear data table
                $("#dsTableWrap").empty();
                focusOnForm();
            }
        }
    }

    function renameHelper($label, dsId) {
        if ($label == null && dsId == null) {
            return;
        }

        var $grid;
        if ($label == null) {
            $grid = DS.getGrid($gridMenu.data("dsid"));
            $label = $grid.find("> .label");
        } else {
            $grid = $label.closest(".grid-unit");
        }

        if (dsId == null) {
            dsId = $grid.data("dsid");
        }

        var dsObj = DS.getDSObj(dsId);
        var isEditable = dsObj.isEditable();
        if (!isEditable && dsObj.beFolder()) {
            // if not editable, then should open the folder
            $grid.trigger("dblclick");
            return;
        }

        if ($label.hasClass("focused")) {
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
        if ($grid != null &&
            !$grid.hasClass("deleting") &&
            !($grid.hasClass("unlistable") && $grid.hasClass("noAction")))
        {
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
                '<i class="action icon xi-trash delete fa-15"></i>' +
                '<i class="action icon xi-edit edit fa-15"></i>' +
            '</div>';
        } else {
            // when it's a dataset
            html =
            '<div class="ds grid-unit ' +
            (dsObj.isLocked() ? 'locked' : "") + '" ' +
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
                '<i class="action icon xi-trash delete fa-15"></i>' +
                '<i class="action icon xi-lock lock fa-15"></i>' +
                '<i class="action icon xi-unlock unlock fa-15"></i>' +
                (dsObj.isLocked() ? '<div class="lockIcon"></div>' : "") +
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
            '<div class="ds grid-unit uneditable ' +
            (dsObj.isLocked() ? 'locked' : "") + '" ' +
                ' data-user="' + dsObj.getUser() + '"' +
                ' data-dsname="' + name + '"' +
                ' data-dsId="' + id + '"' +
                ' data-dsParentId="' + parentId + '"">' +
                '<i class="gridIcon icon xi_data"></i>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
                '<i class="action icon xi-trash delete fa-15"></i>' +
                '<i class="action icon xi-lock lock fa-15"></i>' +
                '<i class="action icon xi-unlock unlock fa-15"></i>' +
                (dsObj.isLocked() ? '<div class="lockIcon"></div>' : "") +
            '</div>';
        }

        return (html);
    }

    function truncateDSName($labels, isListView) {
        if (isListView == null) {
            isListView = $gridView.hasClass("listView");
        }

        var maxChar = isListView ? 18 : 8;
        var canvas = document.createElement('canvas');
        var ctx = canvas.getContext('2d');
        ctx.font = isListView ? '700 12px Open Sans' : '700 9px Open Sans';

        $labels.each(function() {
            var $label = $(this);
            var name = $label.data("dsname");
            var maxWidth = isListView ? Math.max(165, $label.width()) : 52;

            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                    !isListView, ctx);
        });
    }

    function cleanDSSelect() {
        $gridView.find(".selected").removeClass("selected");
    }

    function lockDS(dsId) {
        var deferred = jQuery.Deferred();
        var dsObj = DS.getDSObj(dsId);
        var fullDSName = dsObj.getFullName();
        var lockHelper = function() {
            dsObj.lock();
            DS.getGrid(dsId).addClass("locked");
            // XXX Note: this is a temp solution, after backend support
            // we don't need to do it
            UserSettings.logChange();
            KVStore.commit();
        };

        XcalarLockDataset(fullDSName)
        .then(function() {
            lockHelper();
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.status === StatusT.StatusDatasetAlreadyLocked) {
                // if it's an older version that we don't have lock meta
                // may run into here
                lockHelper();
                deferred.resolve();
            } else {
                var errorMsg = xcHelper.replaceMsg(DSTStr.FailLockDS, {
                    "ds": dsObj.getName(),
                    "error": error.error
                });
                Alert.error(AlertTStr.Error, errorMsg);
                deferred.reject(error);
            }
        });

        return deferred.promise();
    }

    function unlockDS(dsId) {
        var deferred = jQuery.Deferred();
        var dsObj = DS.getDSObj(dsId);
        var fullDSName = dsObj.getFullName();

        XcalarUnlockDataset(fullDSName)
        .then(function() {
            dsObj.unlock();
            DS.getGrid(dsId).removeClass("locked");
            UserSettings.logChange();
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            var instr = (error.status === StatusT.StatusDsDatasetInUse)
                        ? DSTStr.InUseInstr
                        : null;
            var errorMsg = xcHelper.replaceMsg(DSTStr.FailUnlockDS, {
                "ds": dsObj.getName(),
                "error": error.error
            });
            Alert.show({
                "title": AlertTStr.Error,
                "instr": instr,
                "msg": errorMsg,
                "isAlert": true
            });

            deferred.reject(error);
        });

        return deferred.promise();
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
        $gridView.addClass("drag");

        // when enter extra space in grid view
        $gridView.on("dragenter", function(){
            resetDropTarget();
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

        $gridView.find(".entering").removeClass("entering");
        $gridView.removeClass("drag");
        $gridView.off("dragenter");
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
            $(".grid-unit.entering").removeClass("entering");
            $(".dragWrap").removeClass("active");

            if ($dragWrap.hasClass("midDragWrap")) {
                // drop in folder case
                $dragWrap.closest(".grid-unit").addClass("entering");
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
            UserSettings.logChange();
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

            UserSettings.logChange();
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
            UserSettings.logChange();
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
        DS.__testOnly__.canCreateFolder = canCreateFolder;
        DS.__testOnly__.createDS = createDS;
        DS.__testOnly__.removeDS = removeDS;
        DS.__testOnly__.cacheErrorDS = cacheErrorDS;
        DS.__testOnly__.checkUnlistableDS = checkUnlistableDS;
        DS.__testOnly__.createTableHelper = createTableHelper;

        DS.__testOnly__.getDragDS = getDragDS;
        DS.__testOnly__.setDragDS = setDragDS;
        DS.__testOnly__.resetDragDS = resetDragDS;
        DS.__testOnly__.getDropTarget = getDropTarget;
        DS.__testOnly__.setDropTraget = setDropTraget;
        DS.__testOnly__.resetDropTarget = resetDropTarget;
        DS.__testOnly__.lockDS = lockDS;
        DS.__testOnly__.unlockDS = unlockDS;
    }
    /* End Of Unit Test Only */

    return (DS);
}(jQuery, {}));
