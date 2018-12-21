/*
 * Module for mamgement of dsObj
 */
window.DS = (function ($, DS) {
    var homeDirId; // DSObjTerm.homeDirId

    var curDirId;       // current folder id
    var dsLookUpTable;  // find DSObj by dsId
    var homeFolder;
    var dsInfoMeta;
    var errorDSSet = {}; // UI cache only

    var $gridView;      // $("#dsListSection .gridItems")
    var $gridMenu;      // $("#gridViewMenu")

    var dirStack = []; // for go back and forward
    var $backFolderBtn;    //$("#backFolderBtn");
    var $forwardFolderBtn; // $("#forwardFolderBtn")
    var $dsListFocusTrakcer; // $("#dsListFocusTrakcer");
    var sortKey = null;
    var disableShare = false;
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
        setupGridMenu();
    };

    // Restore dsObj
    DS.restore = function(oldHomeFolder, atStartUp) {
        restoreSortKey();
        return restoreDS(oldHomeFolder, atStartUp);
    };

    DS.restoreSourceFromDagNode = function(dagNodes, share) {
        const deferred = PromiseHelper.deferred();
        const failures = [];
        const nameToDagMap = new Map();

        dagNodes.forEach((dagNode) => {
            if (!(dagNode instanceof DagNodeDataset)) {
                return;
            }
            const dsName = dagNode.getDSName();
            if (DS.getDSObj(dsName) != null) {
                return;
            }
            const loadArgs = dagNode.getLoadArgs();
            if (loadArgs == null) {
                return;
            }
            const key = dsName + ".Xcalar." + loadArgs; // a unique key
            if (!nameToDagMap.has(key)) {
                nameToDagMap.set(key, []);
            }
            const nodeArray = nameToDagMap.get(key);
            nodeArray.push(dagNode);
        });

        const promises = [];
        nameToDagMap.forEach((dagNodes) => {
            var promise = restoreSourceFromDagNodeHelper(dagNodes, share, failures);
            promises.push(promise);
        });

        if (promises.length > 0) {
            // go to dataset panel to restore
            MainMenu.openPanel("datastorePanel", "inButton");
        }

        PromiseHelper.when(...promises)
        .then(() => {
            if (failures.length) {
                // XXX TODO: make it a helper function
                const errMsg = failures.map((error) => {
                    if (typeof error === "string") {
                        return error;
                    } else if (typeof error === "object" && error.error) {
                        return error.error;
                    } else {
                        return JSON.stringify(error);
                    }
                });
                Alert.error(ErrTStr.RestoreDS, errMsg);
                deferred.reject(errMsg);
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function loadArgsAdapter(loadArgsStr) {
        try {
            if (loadArgsStr == null) {
                return null;
            }

            if (typeof loadArgsStr !== "string") {
                // we don't support any invalid loadArgsStr
                return null;
            }

            var parsed = JSON.parse(loadArgsStr);
            if (parsed.sourceArgsList != null) {
                // a old kind of format. to be deprecated
                loadArgsStr = JSON.stringify({
                    operation: XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad],
                    args: {
                        loadArgs: parsed
                    }
                });
            }
            return loadArgsStr;
        } catch (e) {
            console.error(e);
            return null;
        }
    }

    // restore a set of dataset who share the same dsName and loadArgs
    function restoreSourceFromDagNodeHelper(dagNodes, share, failures) {
        const deferred = PromiseHelper.deferred();
        const oldDSName = dagNodes[0].getDSName();
        const newDSName = getNewDSName(oldDSName);
        let loadArgs = dagNodes[0].getLoadArgs();
        loadArgs = loadArgsAdapter(loadArgs);
        if (loadArgs == null) {
            return PromiseHelper.reject({"error": "Invalid load args"});
        }

        const cachedInfo = {};
        dagNodes.forEach((dagNode) => {
            const param = xcHelper.deepCopy(dagNode.getParam());
            const error = dagNode.getError();
            param.source = newDSName;
            param.loadArgs = loadArgs.replace(oldDSName, newDSName);
            dagNode.setParam(param);
            cachedInfo[dagNode.getId()] = {
                param: param,
                error: error
            };
        });
        restoreDatasetFromLoadArgs(newDSName, loadArgs)
        .then((dsObj) => {
            if (share) {
                const dsId = dsObj.getId();
                const newName = getSharedName(dsObj.getName());
                const innerDeferred = PromiseHelper.deferred();
                shareAndUnshareHelper(dsId, newName, true)
                .then(innerDeferred.resolve)
                .fail((error) => {
                    failures.push(error);
                    innerDeferred.resolve(); // still resolve
                });
                return innerDeferred.promise();
            }
        })
        .then(deferred.resolve)
        .fail((error) => {
            dagNodes.forEach((dagNode) => {
                const info = cachedInfo[dagNode.getId()] || {};
                if (dagNode.getState() === DagNodeState.Configured &&
                    JSON.stringify(dagNode.getParam()) === JSON.stringify(info.param)
                ) {
                    // when still in configure state and param has not changed
                    dagNode.beErrorState(info.error);
                }
            });

            failures.push(error);
            deferred.resolve(); // still reolsve it
        });

        return deferred.promise();
    }

    function restoreDatasetFromLoadArgs(fullDSName, loadArgsStr) {
        var deferred = PromiseHelper.deferred();
        restoreDatasetHelper(fullDSName, loadArgsStr)
        .then(deferred.resolve)
        .fail((error) => {
            Alert.error(ErrTStr.RestoreDS, error.error);
            deferred.reject(error);
        });

        return deferred.promise();
    };

    function restoreDatasetHelper(fullDSName, loadArgsStr) {
        if (DS.getDSObj(fullDSName) != null) {
            return PromiseHelper.reject({
                error: "Dataset already exists"
            });
        }
        var deferred = PromiseHelper.deferred();
        try {
            var loadArgs = JSON.parse(loadArgsStr).args.loadArgs;
            var parsedName = xcHelper.parseDSName(fullDSName);
            var dsArgs = {
                name: parsedName.dsName,
                user: parsedName.user,
                fullName: fullDSName,
                sources: loadArgs.sourceArgsList
            };
            return DS.import(dsArgs, {
                restoreArgs: loadArgs
            });
        } catch (e) {
            console.error(e);
            deferred.reject({
                error: e.message
            });
        }

        return deferred.promise();
    }

    function getNewDSName(oldDSName) {
        var parsedName = xcHelper.parseDSName(oldDSName);
        var dsName = DS.getUniqueName(parsedName.dsName);
        return xcHelper.wrapDSName(dsName, parsedName.randId);
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

    DS.isAccessible = function(dsName) {
        var parsedRes = xcHelper.parseDSName(dsName);
        if (parsedRes.user === XcUser.getCurrentUserName()) {
            return true;
        }
        // if not the user, the dataset need to be shared
        var dsObj = DS.getDSObj(dsName);
        if (dsObj == null) {
            return false;
        }
        return isInSharedFolder(dsObj.getId());
    };

    DS.isSharingDisabled = function() {
        return disableShare;
    };

    DS.toggleSharing = function(disable) {
        disableShare = disable || false;
        if (disableShare) {
            $gridView.addClass("disableShare");
            xcTooltip.add($gridMenu.find(".share"), {
                title: DSTStr.DisableShare
            });
        } else {
            $gridView.removeClass("disableShare");
        }
    };

    // Get home folder
    DS.getHomeDir = function(toPersist) {
        if (toPersist) {
            var copy = removeNonpersistDSObjAttributes(homeFolder);
            for (var i = 0, len = copy.eles.length; i < len; i++) {
                if (copy.eles[i].id === DSObjTerm.SharedFolderId) {
                    copy.totalChildren -= copy.eles[i].totalChildren;
                    copy.eles.splice(i, 1);
                    break;
                }
            }
            return copy;
        } else {
            return homeFolder;
        }
    };

    DS.getSharedDir = function(toPersist) {
        var sharedFolder = DS.getDSObj(DSObjTerm.SharedFolderId);
        if (toPersist) {
            return removeNonpersistDSObjAttributes(sharedFolder);
        } else {
            return sharedFolder;
        }
    };

    DS.getLoadArgsFromDS = function(dsName) {
        var dsObj = DS.getDSObj(dsName);
        if (dsObj == null) {
            return PromiseHelper.reject();
        }

        if (dsObj.cachedLoadArgs) {
            return PromiseHelper.resolve(dsObj.cachedLoadArgs);
        }

        var deferred = PromiseHelper.deferred();
        var datasetName = dsObj.getFullName();
        XcalarDatasetGetLoadArgs(datasetName)
        .then(function(loadArgs) {
            dsObj.cachedLoadArgs = loadArgs;
            deferred.resolve(loadArgs);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function removeNonpersistDSObjAttributes(folder) {
        var folderCopy = xcHelper.deepCopy(folder);
        var cache = [folderCopy];
        // restore the ds and folder
        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj == null) {
                console.error("error case");
                continue;
            } else if (obj.isFolder) {
                if (obj.eles != null) {
                    $.merge(cache, obj.eles);
                }
            } else {
                // remove non-persisted attr in dsObj
                delete obj.activated;
                delete obj.columns;
            }
        }
        return folderCopy;
    }

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
        var ds = createDS({
            "name": DSTStr.NewFolder,
            "isFolder": true
        });
        changeDSInfo(curDirId, {
            action: "add",
            ds: ds
        });

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
            "isFolder": false
        });

        return createDS(options);
    };

    DS.addOtherUserDS = function(fullDSName, options) {
        // 1. add as shared ds
        // 3. notify the owner of the ds to refresh
        var deferred = PromiseHelper.deferred();
        var parsedRes = xcHelper.parseDSName(fullDSName);
        var user = parsedRes.user;
        var dsName = parsedRes.dsName;
        var dsOptions = $.extend({}, options, {
            "id": fullDSName, // user the fulldsname as a unique id
            "name": dsName,
            "user": user,
            "fullName": fullDSName,
            "isFolder": false,
            "parentId": DSObjTerm.SharedFolderId
        });
        var dsObj = createDS(dsOptions);
        var arg = {
            dir: DSObjTerm.SharedFolderId,
            action: "add",
            ds: dsObj
        };

        commitSharedFolderChange(arg, true)
        .always(function() {
            // always resolve it
            deferred.resolve(dsObj);
        });

        return deferred.promise();
    };

    DS.focusOn = function($grid) {
        xcAssert($grid != null && $grid.length !== 0, "error case");
        if ($grid.hasClass("active") && $grid.hasClass("fetching")) {
            console.info("ds is fetching");
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
        var dsId = $grid.data("dsid");

        $gridView.find(".active").removeClass("active");
        $grid.addClass("active");
        $dsListFocusTrakcer.data("dsid", dsId).focus();
        var isLoading = $grid.hasClass('loading');
        // folder do not show anything
        if ($grid.hasClass("folder")) {
            return PromiseHelper.resolve();
        } else if ($grid.hasClass("unlistable")) {
            DSTable.showError(dsId, ErrTStr.MakrForDel, true);
            return PromiseHelper.resolve();
        } else if ($grid.hasClass("inActivated") && !isLoading) {
            DSTable.showError(dsId, ErrTStr.InactivateDS, false, true);
            return PromiseHelper.resolve();
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
            if (!isLoading) {
                $grid.removeClass("notSeen");
            }
        });

        return deferred.promise();
    };

    /* Import dataset, promise returns dsObj
        options:
            dsToReplace: if set true, will replace the old ds
            restoreArgs: if exist, will use it t restore the ds
    */
    DS.import = function(dsArgs, options) {
        options = options || {};
        var dsToReplace = options.dsToReplace || null;
        // Here null means the attr is a placeholder, will
        // be update when the sample table is loaded
        if (isInSharedFolder(curDirId)) {
            // if in the uneditable folder, go to the home folder first
            DS.goToDir(homeDirId);
            clearDirStack();
        }
        dsArgs.date = new Date().getTime();
        if (options.restoreArgs != null) {
            // restore from loadArgs case
            curDirId = homeDirId;
            dsArgs.parentId = curDirId;
        }
        var dsObj = createDS(dsArgs, dsToReplace);
        var sql = {
            "operation": SQLOps.DSImport,
            "args": dsArgs,
            "options": options
        };

        sortDS(curDirId);
        return importHelper(dsObj, sql, options.restoreArgs);
    };

    DS.getSchema = function(source) {
        const dsObj = DS.getDSObj(source);
        if (dsObj == null) {
            return {
                error: "Dataset not found"
            };
        }
        const sourceHasParams = xcHelper.checkValidParamBrackets(source, true);
        if (sourceHasParams) {
            return {
                schema: []
            };
        }

        const columns = dsObj.getColumns();
        if (columns == null) {
            return {
                error: "Cannot get schema from the dataset"
            };
        } else {
            return {
                schema: columns
            };
        }
    }

    // Rename dsObj
    DS.rename = function(dsId, newName) {
        // now only for folders (later also rename datasets?)
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            console.error("error case");
            return false;
        }
        var $label = DS.getGrid(dsId).find("> .label");
        var oldName = dsObj.getName();
        var hasRename = false;

        if (newName === oldName || newName === "") {
            $label.html(oldName);
            hasRename = false;
        } else if (dsObj.rename(newName)) {
            // valid rename
            $label.html(newName)
                .data("dsname", newName)
                .attr("data-dsname", newName)
                .attr("title", newName);
            hasRename = true;
        } else {
            $label.html(oldName);
            hasRename = false;
        }

        truncateDSName($label);
        return hasRename;
    };

    // helper function to find grid, mainly used in unit test
    DS.getGridByName = function(dsName, user) {
        if (dsName == null) {
            return null;
        }
        // now only check dataset name conflict
        user = user || getCurrentUserName();
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

    DS.getUniqueName = function(name) {
        var originalName = name;
        var tries = 1;
        var validNameFound = false;
        while (!validNameFound && tries < 20) {
            if (DS.has(name)) {
                validNameFound = false;
            } else {
                validNameFound = true;
            }

            if (!validNameFound) {
                name = originalName + tries;
                tries++;
            }
        }

        if (!validNameFound) {
            while (DS.has(name) && tries < 100) {
                name = xcHelper.randName(name, 4);
                tries++;
            }
        }
        return name;
    };

    // Check if the ds's name already exists
    DS.has = function(dsName) {
        return (DS.getGridByName(dsName) != null);
    };

    // Remove dataset/folder
    DS.remove = function($grids) {
        xcAssert($grids != null && $grids.length !== 0);
        var deferred = PromiseHelper.deferred();

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
        var deferred = PromiseHelper.deferred();

        if ($grid.hasClass("active")) {
            focusOnForm();
        }
        if (!$grid.hasClass("inActivated")) {
            $grid.removeClass("active").addClass("inactive deleting");
        }

        var txId = $grid.data("txid");
        // if cancel success, it will trigger fail in DS.import, so it's fine
        QueryManager.cancelQuery(txId)
        .then(deferred.resolve)
        .fail(function(error) {
            console.error(error);
            // if cancel fails, transaction fail handler will delete the ds
            deferred.reject(error);
        });

        return deferred.promise();
    };

    DS.activate = function(dsIds, noAlert) {
        return activateDS(dsIds, noAlert);
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
        var $labels = $gridView.find(".label:visible");
        truncateDSName($labels);
    };

    DS.resize = function() {
        var $menu = $("#datastoreMenu");
        if ($menu.hasClass("active") && $gridView.hasClass("listView")) {
            var $allGrids = $gridView.add($("#dsTarget-list .gridItems"));
            var $labels = $allGrids.find(".label:visible");
            truncateDSName($labels, true);
        }
    };

    DS.getSortKey = function() {
        return sortKey;
    };

    // returns an array of all visible datasets
    // {
    //    path,
    //    suffix (userName if shared),
    //    id
    // }
    DS.listDatasets = function(sharedOnly) {
        var list = [];
        var path = [];
        var folder = sharedOnly ? DS.getDSObj(DSObjTerm.SharedFolderId) : homeFolder;
        populate(folder, path);

        function populate(el, path) {
            if (el.isFolder) {
                var name = el.name;
                if (el.name === ".") {
                    name = "";
                }
                path.push(name);
                el.eles.forEach(function(el) {
                    populate(el, path);
                });
                path.pop();
            } else {
                var suffix = "";
                if (path[1] === DSObjTerm.SharedFolder) {
                    suffix = el.user;
                }
                var listObj = {
                    path: path.join("/") + "/" + el.name,
                    suffix: suffix,
                    id: el.id,
                    options: {
                        inActivated: !el.isActivated()
                    }
                }
                list.push(listObj);
            }
        }
        return list;
    };

    // Clear dataset/folder in gridView area
    DS.clear = function() {
        $gridView.find(".grid-unit").remove();
        $backFolderBtn.addClass("xc-disabled");
        clearDirStack();
        $gridMenu.find(".back, .moveUp").addClass("disabled");
        // reset home folder
        curDirId = homeDirId;
        dsLookUpTable = {};

        homeFolder = createHomeFolder();
        dsLookUpTable[homeFolder.getId()] = homeFolder;
    };

    // Create dsObj for new dataset/folder
    function createDS(options, dsToReplace) {
        // this will make sure option is a diffent copy of old option
        options = $.extend({}, options);
        // validation check
        xcAssert((options.name != null), "Invalid Parameters");

        // pre-process
        options.name = options.name.trim();
        options.user = options.user || getCurrentUserName();
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
            options.activated = options.activated || false;
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

    function createHomeFolder() {
        return new DSObj({
            "id": homeDirId,
            "name": DSObjTerm.homeDir,
            "fullName": DSObjTerm.homeDir,
            "user": getCurrentUserName(),
            "parentId": DSObjTerm.homeParentId,
            "uneditable": false,
            "isFolder": true
        });
    }

    function createSharedFolder() {
        var folder = createDS({
            "id": DSObjTerm.SharedFolderId,
            "name": DSObjTerm.SharedFolder,
            "parentId": homeDirId,
            "isFolder": true,
            "uneditable": true,
            "user": DSObjTerm.SharedFolder
        });
        var $grid = DS.getGrid(DSObjTerm.SharedFolderId);
        // grid should be the first on in grid view
        $grid.prependTo($gridView);
        return folder;
    }

    function isInSharedFolder(dirId) {
        var dsObj;
        while (dirId !== homeDirId && dirId !== DSObjTerm.SharedFolderId) {
            dsObj = DS.getDSObj(dirId);
            dirId = dsObj.getParentId();
        }
        return (dirId === DSObjTerm.SharedFolderId);
    }

    // XXX TODO, imporve it to accept multiple dsIds,
    // and only commit once
    DS.shareDS = function(dsId) {
        return shareDS(dsId, true);
    };

    function shareDS(dsId, noAlert) {
        if (disableShare) {
            return PromiseHelper.resolve();
        }
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // invalid id
            return PromiseHelper.resolve();
        }
        if (isInSharedFolder(dsObj.getParentId())) {
            // already in share folder
            return PromiseHelper.resolve();
        }
        var name = dsObj.getName();
        var msg = xcHelper.replaceMsg(DSTStr.ShareDSMsg, {name: name});
        var sharedName = getSharedName(name);

        if (name !== sharedName) {
            // in case this name is taken
            name = sharedName;
            msg += " " + xcHelper.replaceMsg(DSTStr.RenameMsg, {name: name});
        }

        var alertDeferred = PromiseHelper.deferred();
        if (!noAlert) {
            Alert.show({
                title: DSTStr.ShareDS,
                msg: msg,
                onConfirm: function() {
                    alertDeferred.resolve()
                },
                onCancel: function() {
                    alertDeferred.reject();
                }
            });
        } else {
            alertDeferred.resolve();
        }

        var deferred = PromiseHelper.deferred();
        alertDeferred.promise()
        .then(function() {
            return shareAndUnshareHelper(dsId, name, true);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getSharedName(dsId, name) {
        var $sharedDS = $gridView.find('.grid-unit.shared[data-dsname="' + name + '"]');
        if ($sharedDS.length) {
            // in case this name is taken
            var uniqueId = dsId.split(".")[1];
            name = DS.getUniqueName(name + uniqueId);
        }
        return name;
    }

    function unshareDS(dsId) {
        var dsObj = DS.getDSObj(dsId);
        var name = dsObj.getName();
        var msg = xcHelper.replaceMsg(DSTStr.UnshareDSMsg, {
            name: name
        });
        var $unsharedDS = $gridView.find('.grid-unit:not(.shared)' +
                                         '[data-dsname="' + name + '"]');
        if ($unsharedDS.length) {
            // in case this name is taken
            name = DS.getUniqueName(name);
            msg += " " + xcHelper.replaceMsg(DSTStr.RenameMsg, {name: name});
        }

        Alert.show({
            title: DSTStr.UnshareDS,
            msg: msg,
            onConfirm: function() {
                // XXX TODO: check if it's still necessary
                // unshare case need to check if ds is used by others
                checkDSUser(dsObj.getFullName())
                .then(function() {
                    shareAndUnshareHelper(dsId, name, false);
                })
                .fail(function(error) {
                    if (error.status === StatusT.StatusDsNotFound) {
                        // that's a normal case
                        shareAndUnshareHelper(dsId, name, false);
                    } else {
                        Alert.error(DSTStr.UnshareFail, error.error);
                    }
                });
            }
        });
    }

    function shareAndUnshareHelper(dsId, newName, isShare) {
        var deferred = PromiseHelper.deferred();
        var dirId = isShare ? DSObjTerm.SharedFolderId : DSObjTerm.homeDirId;
        var dsObj = DS.getDSObj(dsId);
        removeDS(dsId);

        var options = $.extend(dsObj, {
            name: newName,
            parentId: dirId
        });
        var newDSObj = createDS(options);
        var arg;

        if (isShare) {
            arg = {
                dir: DSObjTerm.SharedFolderId,
                action: "add",
                ds: newDSObj
            };
        } else {
            arg = {
                dir: DSObjTerm.SharedFolderId,
                action: "delete",
                dsIds: [dsId]
            };
        }

        sortDS(dirId);
        DataStore.update();

        commitSharedFolderChange(arg)
        .then(function() {
            UserSettings.commit(false, true);

            var $grid = DS.getGrid(dsId);
            goToDirHelper(dirId);
            DS.focusOn($grid);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function syncVersionId() {
        var versionId = dsInfoMeta.getVersionId();
        var xcSocket = XcSocket.Instance;
        xcSocket.sendMessage("ds", {
            event: "updateVersionId",
            id: versionId
        });
    }

    function startChangeSharedDSInfo(versionId, arg) {
        var deferred = PromiseHelper.deferred();
        var callback = function(success) {
            if (success) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        };

        arg = $.extend({
            event: "changeStart",
            id: versionId
        }, arg);
        var xcSocket = XcSocket.Instance;
        xcSocket.sendMessage("ds", arg, callback);
        return deferred.promise();
    }

    function endChangeSharedDSInfo(versionId) {
        var deferred = PromiseHelper.deferred();
        var callback = function(success) {
            if (success) {
                deferred.resolve();
            } else {
                deferred.reject();
            }
        };

        var arg = {
            event: "changeEnd",
            id: versionId
        };
        var xcSocket = XcSocket.Instance;
        xcSocket.sendMessage("ds", arg, callback);
        return deferred.promise();
    }

    function errorChangeSharedDSInfo(versionId) {
        var deferred = PromiseHelper.deferred();
        var xcSocket = XcSocket.Instance;
        xcSocket.sendMessage("ds", {
            event: "changeError",
            id: versionId
        });
        return deferred.promise();
    }

    function commitSharedFolderChange(arg, noRefresh) {
        var deferred = PromiseHelper.deferred();
        var versionId = dsInfoMeta.updateVersionId();
        var sharedDir = DS.getSharedDir(true);
        var hasCommit = false;
        dsInfoMeta.updateDSInfo(sharedDir);

        startChangeSharedDSInfo(versionId, arg)
        .then(function() {
            var key = KVStore.getKey("gSharedDSKey");
            var kvStore = new KVStore(key, gKVScope.GLOB);
            return kvStore.put(JSON.stringify(dsInfoMeta), true);
        })
        .then(function() {
            hasCommit = true;
            return endChangeSharedDSInfo(versionId);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            console.error(error);
            if (!hasCommit) {
                errorChangeSharedDSInfo(versionId);
            }
            if (!noRefresh) {
                // when fail, force to refresh
                refreshHelper();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function changeDSInfo(chanedDirId, arg) {
        sortDS(chanedDirId);
        if (isInSharedFolder(chanedDirId)) {
            arg = $.extend({dir: chanedDirId}, arg);
            commitSharedFolderChange(arg);
        } else {
            UserSettings.commit(false, true);
        }
    }

    DS.updateDSInfo = function(arg) {
        switch (arg.action) {
            case "add":
                var dsObj = DS.getDSObj(arg.ds.id);
                if (dsObj != null) {
                    var msg = xcHelper.replaceMsg(DSTStr.ForceShareMsg, {
                        name: dsObj.getName()
                    });
                    removeDS(dsObj.getId());
                    Alert.show({
                        title: DSTStr.ShareDS,
                        msg: msg,
                        isAlert: true
                    });
                }
                createDS(arg.ds);
                refreshDS();
                break;
            case "rename":
                DS.rename(arg.dsId, arg.newName);
                break;
            case "drop":
                dropHelper(arg.dsId, arg.targetId);
                refreshDS();
                break;
            case "delete":
                var dsIds = arg.dsIds || [];
                dsIds.forEach(removeDS);
                cleanFocusedDSIfNecessary();
                break;
            case "activate":
                var dsIds = arg.dsIds || [];
                dsIds.forEach(function(dsId) {
                    var dsObj = DS.getDSObj(dsId);
                    if (dsObj != null) {
                        activateDSObj(dsObj);
                    }
                });
                break;
            case "deactivate":
                var dsIds = arg.dsIds || [];
                dsIds.forEach(deactivateDSObj);
                break;
            default:
                console.error("Unspported action!");
                return;
        }

        sortDS(arg.dir);
        dsInfoMeta.setVersionId(arg.id);
    };

    function createDSHelper(txId, dsObj, restoreArgs) {
        var datasetName = dsObj.getFullName();
        var def;
        if (restoreArgs) {
            def = XcalarDatasetRestore(datasetName, restoreArgs);
        } else {
            var options = dsObj.getImportOptions();
            def = XcalarDatasetCreate(datasetName, options);
        }
        var hasCreate = false;
        var deferred = PromiseHelper.deferred();

        def
        .then(() => {
            hasCreate = true;
            // only when there is active workbook will activate the ds
            if (WorkbookManager.getActiveWKBK() != null) {
                return activateHelper(txId, dsObj);
            }
        })
        .then(deferred.resolve)
        .fail((error1, error2) => {
            deferred.reject(error1, error2, hasCreate);
        });

        return deferred.promise();
    }

    function importHelper(dsObj, sql, restoreArgs) {
        var deferred = PromiseHelper.deferred();
        var dsName = dsObj.getName();
        var $grid = DS.getGrid(dsObj.getId());
        var updateDSMeta = function(dsMeta, ds, $ds) {
            dsMeta = dsMeta || {};
            ds.setSize(dsMeta.size);
            ds.setColumns(dsMeta.columns);
            ds.setNumErrors(dsMeta.totalNumErrors);
            $ds.find(".size").text(ds.getDisplaySize());
        };
        var datasetName = dsObj.getFullName();

        $grid.addClass('inactive').append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        $grid.addClass('loading');

        DataStore.update();

        var txId = Transaction.start({
            "msg": StatusMessageTStr.ImportDataset + ": " + dsName,
            "operation": SQLOps.DSImport,
            "sql": sql,
            "track": true,
            "steps": 1
        });

        $grid.data("txid", txId);

        // focus on grid before load
        DS.focusOn($grid)
        .then(function() {
            return createDSHelper(txId, dsObj, restoreArgs);
        })
        .then(function() {
            return getDSBasicInfo(datasetName);
        })
        .then(function(dsInfos) {
            var dsInfo = dsInfos[datasetName];
            updateDSMeta(dsInfo, dsObj, $grid);
            finishImport($grid);

            if ($grid.hasClass("active")) {
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

            if (dsInfo && dsInfo.downSampled === true) {
                alertSampleSizeLimit(datasetName);
            }

            UserSettings.commit(false, true);
            var msgOptions = {
                "newDataSet": true,
                "dataSetId": dsObj.getId()
            };
            Transaction.done(txId, {
                msgOptions: msgOptions
            });
            deferred.resolve(dsObj);
        })
        .fail(function(error, loadError, created) {
            if (typeof error === "object" &&
                error.status === StatusT.StatusCanceled)
            {
                if (!created) {
                    removeDS(dsObj.getId());
                }
                if ($grid.hasClass("active")) {
                    focusOnForm();
                }
            } else {
                // show loadError if has, otherwise show error message
                var displayError = loadError || error;
                handleImportError(dsObj, displayError, created);
            }

            if (created) {
                finishImport($grid);
            }

            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.ImportDSFailed,
                "error": displayError
            });

            deferred.reject(error);
        })
        .always(function() {
            $("#dsTableContainer").find('.lockedTableIcon[data-txid="' +
                                        txId + '"]').remove();
            xcTooltip.hideAll();
        });

        return deferred.promise();
    }

    function alertSampleSizeLimit(dsName) {
        var msg = xcHelper.replaceMsg(DSTStr.OverSampleSize , {
            name: dsName,
            size: xcHelper.sizeTranslator(gMaxSampleSize)
        })
        Alert.show({
            msg: msg,
            isAlert: true
        });
    }

    function finishImport($grid) {
        $grid.removeData("txid");
        $grid.removeClass("inactive").find(".waitingIcon").remove();
        $grid.removeClass("loading");
        $grid.addClass("notSeen");
        // display new dataset
        refreshDS();
    }

    function handleImportError(dsObj, error, created) {
        var dsId = dsObj.getId();
        var $grid = DS.getGrid(dsId);
        if ($grid.hasClass("active")) {
            dsObj.setError(error);
            cacheErrorDS(dsId, dsObj);
            DSTable.showError(dsId, error);
        }
        if (!created) {
            removeDS(dsId);
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

        var deferred = PromiseHelper.deferred();

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
            "track": true,
            "steps": 1
        });

        destroyDataset(dsName, txId)
        .then(function() {
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

    function checkDSUser(dsName) {
        var deferred = PromiseHelper.deferred();
        var currentUser = getCurrentUserName();

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
                deferred.reject({error: error});
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
        var deferred = PromiseHelper.deferred();
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
            } else if (dsObj.isActivated()) {
                title = AlertTStr.NoDel;
                msg = xcHelper.replaceMsg(DSTStr.DelActivatedDS, {
                    "ds": dsName
                });
                isAlert = true;
            } else if (txId != null) {
                // cancel case
                title = DSTStr.CancelPoint;
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
        var currentUser = getCurrentUserName();
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

    function restoreSortKey() {
        sortKey = UserSettings.getPref("dsSortKey");
        highlighSortKey(sortKey);
    }

    function highlighSortKey(key) {
        key = key || "none";
        var $sortOptions = $("#dsListSection .sortSection .sortOption");
        $sortOptions.removeClass("key");
        $sortOptions.filter(function() {
            return $(this).data("key") === key;
        }).addClass("key");
    }

    function setSortKey(key) {
        if (key === sortKey) {
            return;
        }
        if (key === "none") {
            sortKey = null;
        } else {
            sortKey = key;
            sortDS();
        }
        highlighSortKey(sortKey);
        UserSettings.commit(false, true);
    }

    function sortDS(dirId) {
        if (!sortKey) {
            // already sorted
            return;
        }

        if (dirId != null) {
            // sort only when folder
            var folderObj = DS.getDSObj(dirId);
            sortOneFolder(folderObj);
        } else {
            // sort all folders
            var queue = [homeFolder];
            while (queue.length) {
                var folder = queue.shift();
                var childFolders = sortOneFolder(folder);
                queue = queue.concat(childFolders);
            }
        }
    }

    function sortOneFolder(folderObj) {
        var childFolders = [];
        var childDatasets = [];
        var reorderEles = [];
        var sharedFolder = null;

        folderObj.eles.forEach(function(dsObj) {
            var dsId = dsObj.getId();
            if (dsId === DSObjTerm.SharedFolderId) {
                sharedFolder = dsObj;
            } else {
                reorderEles.push(dsObj);
            }
        });

        // sort by name first
        reorderEles.sort(function(dsObj1, dsObj2) {
            var name1 = dsObj1.getName().toLowerCase();
            var name2 = dsObj2.getName().toLowerCase();
            return (name1 < name2 ? -1 : (name1 > name2 ? 1 : 0));
        });

        if (sortKey === "type" || sortKey === "size") {
            reorderEles.forEach(function(dsObj) {
                if (dsObj.beFolder()) {
                    childFolders.push(dsObj);
                } else {
                    childDatasets.push(dsObj);
                }
            });

            if (sortKey === "type") {
                reorderEles = childFolders.concat(childDatasets);
            } else if (sortKey === "size") {
                childDatasets.sort(function(dsObj1, dsObj2) {
                    var size1 = dsObj1.getSize();
                    var size2 = dsObj2.getSize();
                    return (size1 < size2 ? -1 : (size1 > size2 ? 1 : 0));
                });
                reorderEles = childFolders.concat(childDatasets);
            }
        }

        if (sharedFolder != null) {
            reorderEles.unshift(sharedFolder);
            childFolders.unshift(sharedFolder);
        }

        // reorder the grids and ds meta
        reorderEles.forEach(function(dsObj) {
            var $grid = DS.getGrid(dsObj.getId());
            $gridView.append($grid);
        });
        folderObj.eles = reorderEles;
        return childFolders;
    }

    function destroyDataset(dsName, txId) {
        var deferred = PromiseHelper.deferred();

        XcalarDatasetDelete(dsName, txId)
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
        var deferred = PromiseHelper.deferred();
        var failures = [];
        var promises = [];
        var datasets = [];
        var folders = [];
        var dirId = curDirId;

        dsIds.forEach(function(dsId) {
            promises.push(removeOneDSHelper(dsId, failures, datasets, folders));
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

            var removedDSIds = datasets.concat(folders);
            if (datasets.length) {
                // when has delete datsets
                changeDSInfo(dirId, {
                    action: "delete",
                    dsIds: removedDSIds
                });
                UserSettings.commit(false, true);
                MemoryAlert.Instance.check(true);
            } else if (folders.length) {
                changeDSInfo(dirId, {
                    action: "delete",
                    dsIds: removedDSIds
                });
            }

            deferred.resolve();
        })
        .fail(deferred.reject); // should not have any reject case

        return deferred.promise();
    }

    function removeOneDSHelper(dsId, failures, datasets, folders) {
        var dsObj = DS.getDSObj(dsId);
        var dsName = dsObj.getName();
        var err;

        if (dsObj.isActivated()) {
            // delete activated ds
            err = xcHelper.replaceMsg(DSTStr.DelActivatedDS, {
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
            } else {
                folders.push(dsId);
            }

            return PromiseHelper.resolve();
        } else {
            var deferred = PromiseHelper.deferred();
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
        return true;
    }

    // Helper function to remove ds
    function removeDS(dsId) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // error case;
            return;
        }
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
        $gridView.find('.grid-unit[data-dsparentid="' + curDirId + '"]')
                .removeClass("xc-hidden");

        var dirId = curDirId;
        var path = "";
        var count = 0;
        while (dirId !== homeDirId) {
            var dsObj = DS.getDSObj(dirId);
            if (dsObj == null) {
                // handle error case
                console.error("error case");
                return;
            }
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

    function restoreDS(oldHomeFolder, atStartUp) {
        var deferred = PromiseHelper.deferred();
        var datasets;
        var dsBasicInfo;

        DS.clear();

        XcalarGetDatasets()
        .then(function(res) {
            datasets = res;
            return getDSBasicInfo();
        })
        .then(function(res) {
            dsBasicInfo = res;
            var key = KVStore.getKey("gSharedDSKey");
            var sharedDSKV = new KVStore(key, gKVScope.GLOB);
            return sharedDSKV.getInfo(true);
        })
        .then(function(res) {
            var oldSharedDSInfo = res;
            var datasetsSet = getDSBackendMeta(datasets, dsBasicInfo, atStartUp);
            // XXX 1.4 must upgrade from 1.3.1, so this code is deprecated
            // and it will bring issues if a new clean user upload
            // if (atStartUp && oldSharedDSInfo == null) {
            //     // it's first time that upgrade from 1.30 to 1.3.1
            //     oldSharedDSInfo = rebuildOldDSInfo(datasetsSet);
            // }
            restoreHelper(oldHomeFolder, oldSharedDSInfo, datasetsSet);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Restore DS fails!", error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function getDSBasicInfo(datasetName) {
        var deferred = PromiseHelper.deferred();
        XcalarGetDatasetsInfo(datasetName)
        .then(function(res) {
            try {
                var dsInfos = {};
                res.datasets.forEach(function(dataset) {
                    var fullName = dataset.datasetName;
                    if (fullName.startsWith(gDSPrefix)) {
                        var name = fullName.substring(gDSPrefix.length);
                        dsInfos[name] = {
                            size: dataset.datasetSize,
                            columns: getSchemaMeta(dataset.columns),
                            totalNumErrors: dataset.totalNumErrors,
                            downSampled: dataset.downSampled
                        };
                    }
                });
                deferred.resolve(dsInfos);
            } catch (e) {
                console.error(e);
                deferred.resolve({}); // still resolve
            }
        })
        .fail(function(error) {
            console.error(error);
            deferred.resolve({}); // still resolve
        });

        return deferred.promise();
    }

    function getSchemaMeta(schemaArray) {
        const columns = [];
        const indexMap = {};
        schemaArray.forEach((colInfo) => {
            // if the col name is a.b, in XD it should be a\.b
            const name = xcHelper.escapeColName(colInfo.name);
            const type = xcHelper.convertFieldTypeToColType(DfFieldTypeT[colInfo.type]);
            let index = indexMap[name];
            if (index == null) {
                // new columns
                index = columns.length;
                indexMap[name] = index;
                columns.push({
                    name: name,
                    type: type
                });
            } else {
                // that's a mixed column
                columns[index].type = ColumnType.mixed;
            }
        });
        return columns;
    }

    function getDSBackendMeta(datasets, basicDSInfo, atStartUp) {
        var numDatasets = datasets.numDatasets;
        var userPrefix = xcHelper.getUserPrefix();
        var datasetsSet = {};

        for (var i = 0; i < numDatasets; i++) {
            var dataset = datasets.datasets[i];
            var dsName = dataset.name;

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
                    "track": true,
                    "steps": 1
                });

                XIApi.deleteDataset(txId, dsName, true)
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

            if (!dataset.isListable) {
                // skip unlistable ds
                continue;
            }

            dataset.activated = dataset.loadIsComplete;

            if (basicDSInfo.hasOwnProperty(dsName)) {
                dataset.size = basicDSInfo[dsName].size;
                dataset.columns = basicDSInfo[dsName].columns;
                dataset.numErrors = basicDSInfo[dsName].totalNumErrors;
            }

            datasetsSet[dsName] = dataset;
        }
        return datasetsSet;
    }

    function restoreDir(oldFolder, datasetsSet) {
        var cache = $.isEmptyObject(oldFolder) ? [] : oldFolder.eles;
        // restore the ds and folder
        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj == null) {
                console.error("error case");
                continue;
            }
            if (obj.id === DSObjTerm.SharedFolderId) {
                // restore of shared folder will be taken cared by
                // restoreSharedDS
                continue;
            }
            if (obj.id === ".other") {
                // old structure, not restore
                continue;
            }

            if (obj.isFolder) {
                // restore a folder
                createDS(obj);
                if (obj.eles != null) {
                    $.merge(cache, obj.eles);
                }
            } else {
                if (datasetsSet.hasOwnProperty(obj.fullName)) {
                    // restore a ds
                    var ds = datasetsSet[obj.fullName];
                    obj = $.extend(obj, getDSOptions(ds));
                    createDS(obj);
                    // mark the ds to be used
                    delete datasetsSet[obj.fullName];
                } else {
                    // when ds has front meta but no backend meta
                    // this is a case when front end meta not sync with
                    // backend meta correctly
                    console.error(obj, "has meta but no backend info!");
                }
            }
        }

        return datasetsSet;
    }

    function getDSOptions(ds) {
        return {
            // format should come from kvStore, not from backend
            "sources": ds.loadArgs.sourceArgsList,
            "unlistable": !ds.isListable,
            "activated": ds.activated,
            "size": ds.size,
            "columns": ds.columns,
            "numErrors": ds.numErrors
        };
    }

    function getUnListableDS(datasetsSet) {
        var unlistableDS = {};
        for (var dsName in datasetsSet) {
            var ds = datasetsSet[dsName];
            if (!ds.isListable) {
                unlistableDS[dsName] = true;
            }
        }
        return unlistableDS;
    }

    function restoreHelper(oldHomeFolder, oldSharedDSInfo, datasetsSet) {
        var unlistableDS = getUnListableDS(datasetsSet);
        datasetsSet = restoreSharedDS(oldSharedDSInfo, datasetsSet);
        datasetsSet = restoreDir(oldHomeFolder, datasetsSet);
        // add ds that is not in oldHomeFolder
        restoreNoMetaDS(datasetsSet);

        // UI update
        sortDS();
        refreshDS();
        DataStore.update();
        checkUnlistableDS(unlistableDS);
    }

    function restoreNoMetaDS(datasetsSet) {
        var userPrefix = xcHelper.getUserPrefix();
        var promises = [];
        for (var dsName in datasetsSet) {
            var ds = datasetsSet[dsName];
            if (ds != null) {
                var options = getDSOptions(ds);
                if (xcHelper.parseDSName(dsName).user === userPrefix) {
                    DS.addCurrentUserDS(ds.name, options);
                }
                // if it's not this user's ds, don't handle it
            }
        }
        PromiseHelper.chain(promises);
    }

    function restoreSharedDS(oldSharedDSInfo, datasetsSet) {
        dsInfoMeta = new DSInfoConstructor(oldSharedDSInfo);
        var oldSharedFolder = dsInfoMeta.getDSInfo();
        var sharedFolder = createSharedFolder();
        datasetsSet = restoreDir(oldSharedFolder, datasetsSet);
        dsInfoMeta.updateDSInfo(sharedFolder);
        syncVersionId();
        return datasetsSet;
    }

    function rebuildOldDSInfo(datasetsSet) {
        var tempDSInfoMeta = new DSInfoConstructor();
        var sharedFolder = createSharedFolder();

        for (var fullDSName in datasetsSet) {
            var ds = datasetsSet[fullDSName];
            if (ds != null) {
                var format = xcHelper.parseDSFormat(ds);
                var parsedRes = xcHelper.parseDSName(fullDSName);
                var user = parsedRes.user;
                var dsName = parsedRes.dsName;

                var options = $.extend({
                    "id": fullDSName, // user the fulldsname as a unique id
                    "parentId": DSObjTerm.SharedFolderId,
                    "name": dsName,
                    "user": user,
                    "fullName": fullDSName,
                    "isFolder": false,
                    "format": format
                }, getDSOptions(ds));

                createDS(options);
            }
        }

        tempDSInfoMeta.updateDSInfo(sharedFolder);
        DS.clear();

        var key = KVStore.getKey("gSharedDSKey");
        var kvStore = new KVStore(key, gKVScope.GLOB);
        kvStore.putWithMutex(JSON.stringify(tempDSInfoMeta), true);
        return tempDSInfoMeta;
    }

    function checkUnlistableDS(unlistableDS) {
        if ($.isEmptyObject(unlistableDS)) {
            return PromiseHelper.resolve();
        }

        var deferred = PromiseHelper.deferred();
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
        .fail(deferred.reject);

        return deferred.promise();
    }

    function setupGridViewButtons() {
        // click to toggle list view and grid view
        $("#dataViewBtn, #dsTarget-view").click(function() {
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

        $("#dsListSection .sortSection").on("click", ".sortOption", function() {
            var key = $(this).data("key");
            setSortKey(key);
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
                        renameHelper($grid.find(".label"), dsid);
                        event.preventDefault();
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

        $gridView.on("click", ".grid-unit .share", function() {
            var $grid = $(this).closest(".grid-unit");
            shareDS($grid.data("dsid"));
            // stop event propogation
            return false;
        });

        $gridView.on("click", ".grid-unit .unshare", function() {
            var $grid = $(this).closest(".grid-unit");
            unshareDS($grid.data("dsid"));
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

        // $gridView.on("dblclick", ".folder > .label", function() {
        //     renameHelper($(this));
        //     // stop event propogation
        //     return false;
        // });

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
                var hasRename = DS.rename(dsId, newName);
                if (hasRename) {
                    changeDSInfo(curDirId, {
                        action: "rename",
                        dsId: dsId,
                        newName: newName
                    });
                }

                $label.removeClass("focused");
                xcHelper.removeSelectionRange();
                // still focus on the grid-unit
                $dsListFocusTrakcer.data(dsId);
                focsueOnTracker();
            }
        }, ".folder > .label textarea");

        // dbclick to open folder
        $gridView.on("dblclick", ".grid-unit.folder", function() {
            var $grid = $(this);
            goToDirHelper($grid.data("dsid"));
        });

        $("#dsListSection .gridViewWrapper").on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $target = $(event.target);
            if (!$target.closest(".uneditable").length &&
                ($target.closest(".gridIcon").length ||
                $target.closest(".label").length ||
                $target.closest(".dsCount").length))
            {
                // this part is for drag and drop
                return;
            }

            createRectSelection(event.pageX, event.pageY);
        });

        $gridView.on("mouseenter", ".grid-unit.folder", function() {
            if ($gridView.hasClass("listView")) {
                var $folder = $(this);
                var folderId = $folder.data("dsid");
                var dsObj = DS.getDSObj(folderId);
                if (dsObj && dsObj.beFolderWithDS()) {
                    $folder.find(".delete").addClass("xc-disabled");
                } else {
                    $folder.find(".delete").removeClass("xc-disabled");
                }
            }
        });
    }

    function createRectSelection(startX, startY) {
        $gridMenu.hide();
        return new RectSelection(startX, startY, {
            "id": "gridView-rectSelection",
            "$container": $("#dsListSection .gridItems"),
            "$scrollContainer": $("#dsListSection .gridViewWrapper"),
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
        var $subMenu = $("#gridViewSubMenu");
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

        $gridMenu.on("mouseup", ".share", function(event) {
            if (event.which !== 1) {
                return;
            }
            if (disableShare) {
                return false;
            }
            var dsId = $gridMenu.data("dsid");
            shareDS(dsId);
        });

        $gridMenu.on("mouseup", ".unshare", function(event) {
            if (event.which !== 1) {
                return;
            }
            var dsId = $gridMenu.data("dsid");
            unshareDS(dsId);
        });

        $gridMenu.on("mouseup", ".getInfo", function(event) {
            if (event.which !== 1) {
                return;
            }
            DSInfoModal.show($gridMenu.data("dsid"));
        });

        $gridMenu.on("mouseup", ".activate", function(event) {
            if (event.which !== 1) {
                return;
            }
            activateDSAction([$gridMenu.data("dsid")]);
        });

        $gridMenu.on("mouseup", ".multiActivate", function(event) {
            if (event.which !== 1) {
                return;
            }
            var dsIds = [];
            $gridView.find(".grid-unit.selected.ds").each(function() {
                dsIds.push($(this).data("dsid"));
            });
            activateDSAction(dsIds);
        });

        $gridMenu.on("mouseup", ".deactivate", function(event) {
            if (event.which !== 1) {
                return;
            }
            deactivateDSAction([$gridMenu.data("dsid")]);
        });

        $gridMenu.on("mouseup", ".multiDeactivate", function(event) {
            if (event.which !== 1) {
                return;
            }
            var dsIds = [];
            $gridView.find(".grid-unit.selected.ds").each(function() {
                dsIds.push($(this).data("dsid"));
            });
            deactivateDSAction(dsIds);
        });

        $gridMenu.on("mouseenter", ".sort", function() {
            var key = sortKey || "none";
            var $lis = $subMenu.find(".sort li");
            $lis.removeClass("select");
            $lis.filter(function() {
                return $(this).attr("name") === key;
            }).addClass("select");
        });

        $subMenu.on("mouseup", ".sort li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var key = $(this).attr("name");
            setSortKey(key);
        });
    }

    function setupGridMenu() {
        xcMenu.add($gridMenu);
        // set up click right menu
        $gridView.parent()[0].oncontextmenu = function(event) {
            var $target = $(event.target);
            var $grid = $target.closest(".grid-unit");
            var classes = "";
            var totalSelected = $gridView.find(".grid-unit.selected").length;
            if (WorkbookManager.getActiveWKBK() == null) {
                $gridMenu.find(".multiActivate, .multiDeactivate, .activate").addClass("disabled");
            } else {
                $gridMenu.find(".multiActivate, .multiDeactivate, .activate").removeClass("disabled");
            }

            if ($grid.length && totalSelected > 1) {
                // multi selection
                $gridMenu.removeData("dsid");
                classes += " multiOpts";

                $gridMenu.find(".multiActivate, .multiDeactivate").show();
                $gridMenu.find(".multiDelete").removeClass("disabled");
                var numDS = $gridView.find(".grid-unit.selected.ds").length;
                var numInActivatedDS = $gridView.find(".grid-unit.selected.inActivated").length;
                if (numDS === 0) {
                    // when no ds
                    $gridMenu.find(".multiActivate, .multiDeactivate").hide();
                } else if (numInActivatedDS === 0) {
                    // when all ds are activated
                    $gridMenu.find(".multiActivate").hide();
                    if (numDS === totalSelected) {
                        // when only have ds
                        $gridMenu.find(".multiDelete").addClass("disabled");
                    }
                } else if (numDS === numInActivatedDS) {
                    // when all ds are inactivated
                    $gridMenu.find(".multiDeactivate").hide();
                }
            } else {
                cleanDSSelect();
                $gridMenu.find(".multiActivate, .multiDeactivate").hide();
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
                        if (dsObj.beFolderWithDS()) {
                            classes += " hasDS";
                        }
                    } else {
                        classes += " dsOpts";

                        if (dsObj.isActivated()) {
                            classes += " dsActivated";
                        }
                    }

                    if ($grid.hasClass("unlistable")) {
                        classes += " unlistable";

                        if ($grid.hasClass("noAction")) {
                            classes += " noAction";
                        }
                    }

                    if ($grid.hasClass("loading")) {
                        classes += " loading";
                    }

                    if (isInSharedFolder(curDirId)) {
                        classes += " sharedDir";
                        if (curDirId === DSObjTerm.SharedFolderId) {
                            classes += " sharedHomeDir";
                        }
                        if (dsObj.getUser() !== getCurrentUserName()) {
                            classes += " noUnshare";
                        }
                    }
                } else {
                    classes += " bgOpts";
                    $gridMenu.removeData("dsid");
                }
            }

            if (disableShare) {
                classes += " disableShare";
            }

            xcHelper.dropdownOpen($target, $gridMenu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "classes": classes,
                "floating": true
            });
            return false;
        };

        setupMenuActions();
    }

    function focsueOnTracker() {
        $dsListFocusTrakcer.focus();
    }

    function refreshHelper() {
        var dir = curDirId;
        var promise = DS.restore(DS.getHomeDir(true));
        xcHelper.showRefreshIcon($gridView, false, promise);

        promise
        .then(function() {
            cleanFocusedDSIfNecessary();
            curDirId = dir;
            refreshDS();
            UserSettings.commit(false, true);
        });
    }

    function cleanFocusedDSIfNecessary() {
        var dsId = DSTable.getId();
        if (dsId == null) {
            return;
        }

        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // clear data table
            $("#dsTableWrap").empty();
            focusOnForm();
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
            if ($grid.hasClass("notSeen")) {
                $grid.removeClass("notSeen");
            }
        }
    }

    // toggle between list view and grid view
    function toggleDSView(isListView, noRefreshTooltip) {
        var $btn = $("#dataViewBtn, #dsTarget-view");
        var $allGrids = $gridView.add($("#dsTarget-list .gridItems"));
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

    function getNewFolderId() {
        return getCurrentUserName() + "-folder-" + (new Date().getTime());
    }

    // Helper function for createDS()
    function getDSHTML(dsObj) {
        var id = dsObj.getId();
        var parentId = dsObj.getParentId();
        var name = dsObj.getName();
        var html;
        var tooltip = 'data-toggle="tooltip" data-container="body" data-placement="top"';
        var deleteIcon = '<i class="action icon xi-trash delete fa-15" ' +
                        tooltip + 'data-title="' + DSTStr.DelDS + '"></i>';
        var deactivateIcon = '<div class="deactivatingIcon xc-hidden" >' +
            '<i class="icon xi-forbid deactivating fa-15" ' +
            tooltip + 'data-title="' + DSTStr.DSDeactivating + '"></i></div>';
        if (dsObj.beFolder()) {
            var editIcon = '<i class="action icon xi-edit edit fa-15" ' +
                            tooltip + 'data-title="' + CommonTxtTstr.Rename +
                            '"></i>';
            // when it's a folder
            html =
            '<div class="folder grid-unit" draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-dsid="' + id + '"' +
                ' data-dsparentid=' + parentId + '>' +
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
                // deleteIcon +
                // editIcon +
            '</div>';
        } else {
            var checkMarkIcon = '<i class="gridIcon icon xi-dataset-checkmark"></i>';
            var shareIcon;
            var user = dsObj.getUser();
            var shared = isInSharedFolder(parentId);
            var title = name;
            if (shared) {
                if (dsObj.getUser() === getCurrentUserName()) {
                    shareIcon = '<i class="action icon xi-disabled-share-icon unshare fa-15" ' +
                                tooltip + 'data-title="' + DSTStr.UnshareDS + '"></i>';
                } else {
                    shareIcon = ""; // cannot unshare
                }
                title = name + "(" + user + ")";
            } else {
                shareIcon = '<i class="action icon xi-activated-share-icon share fa-15" ' +
                              tooltip + 'data-title="' + DSTStr.ShareDS + '"></i>';
            }
            // when it's a dataset
            html =
            '<div class="ds grid-unit' +
            (dsObj.isActivated() ? '' : ' inActivated') +
            (shared ? ' shared' : '') + '"' +
                ' draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-user="' + user + '"' +
                ' data-dsname="' + name + '"' +
                ' data-dsid="' + id + '"' +
                ' data-dsparentid="' + parentId + '"">' +
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
                checkMarkIcon +
                '<div title="' + title + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
                '<div class="size">' +
                    dsObj.getDisplaySize() +
                '</div>' +
                deactivateIcon +
                // deleteIcon +
                // shareIcon +
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
                ' data-dsid="' + id + '"' +
                ' data-dsparentid=' + parentId + '>' +
                '<i class="gridIcon icon xi-folder"></i>' +
                '<div class="dsCount">0</div>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
            '</div>';
        } else {
            var tooltip = 'data-toggle="tooltip" data-container="body" data-placement="top"';
            var deleteIcon = '<i class="action icon xi-trash delete fa-15" ' +
                            tooltip + 'data-title="' + DSTStr.DelDS + '"></i>';
            // when it's a dataset
            html =
            '<div class="ds grid-unit uneditable' +
            (dsObj.isActivated() ? '' : " inActivated") + '" ' +
                ' data-user="' + dsObj.getUser() + '"' +
                ' data-dsname="' + name + '"' +
                ' data-dsid="' + id + '"' +
                ' data-dsparentid="' + parentId + '"">' +
                '<i class="gridIcon icon xi_data"></i>' +
                '<div title="' + name + '" class="label"' +
                    ' data-dsname="' + name + '">' +
                    name +
                '</div>' +
                '<div class="size">' +
                    dsObj.getDisplaySize() +
                '</div>' +
                deleteIcon +
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
            var $grid = $label.closest(".grid-unit");
            var name = $label.data("dsname");
            var shared = $grid.hasClass("shared");
            var maxWidth = isListView ? Math.max(165, $label.width()) : 52;
            var multiLine = !isListView && !shared;

            xcHelper.middleEllipsis(name, $label, maxChar, maxWidth,
                                    multiLine, ctx);
            if (shared) {
                $label.html($label.text() +
                            (isListView ? "" : "<br/>") +
                            "<b>(" + $grid.data("user") + ")</b>");
            }
        });
    }

    function cleanDSSelect() {
        $gridView.find(".selected").removeClass("selected");
    }

    function activateDSAction(dsIds) {
        Alert.show({
            title: DSTStr.ActivateDS,
            msg: DSTStr.ActivateDSMsg,
            onConfirm: function() {
                activateDS(dsIds);
            }
        });
    }

    function activateDS(dsIds, noAlert) {
        var deferred = PromiseHelper.deferred();
        var failures = [];
        var datasets = [];
        var dirId = curDirId;

        var promises = dsIds.map(function(dsId) {
            return activateOneDSHelper(dsId, failures, datasets, noAlert);
        });

        PromiseHelper.when.apply(this, promises)
        .then(function() {
            if (failures.length && !noAlert) {
                Alert.show({
                    "title": AlertTStr.Error,
                    "msg": failures.join("\n"),
                    "isAlert": true,
                    "onCancel": focsueOnTracker
                });
            }

            if (datasets.length) {
                changeDSInfo(dirId, {
                    action: "activate",
                    dsIds: dsIds
                });
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function activateOneDSHelper(dsId, failures, datasets, noAlert) {
        var deferred = PromiseHelper.deferred();
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null || dsObj.beFolder()) {
            return PromiseHelper.resolve();
        }
        var sql = {
            "operation": SQLOps.DSImport,
            "created": true, // flag to distint if ds is created or not
        };
        // when noAlert is true, it's from DagNodeExecutor, no need to track
        var txId = noAlert ? null : Transaction.start({
            "operation": SQLOps.DSImport,
            "track": true,
            "steps": 1
        });
        if (!noAlert) {
            DS.getGrid(dsObj.getId()).data("txid", txId);
            DS.getGrid(dsObj.getId()).addClass("loading");
            DSTable.setupViewBeforeLoading(dsObj);
        }

        activateHelper(txId, dsObj)
        .then(function() {
            datasets.push(dsId);
            if (txId != null) {
                Transaction.done(txId, {});
            }
            deferred.resolve();
        })
        .fail(function(error) {
            var errorMsg = xcHelper.replaceMsg(DSTStr.FailActivateDS, {
                "ds": dsObj.getName(),
                "error": error.error
            });
            failures.push(errorMsg);
            if (txId != null) {
                Transaction.fail(txId, {
                    error: error,
                    noAlert: true
                });
            }
            deferred.resolve(); // still resolve it
        });

        return deferred.promise();
    }

    function activateHelper(txId, dsObj) {
        var deferred = PromiseHelper.deferred();
        var datasetName = dsObj.getFullName();

        XcalarDatasetActivate(datasetName, txId)
        .then(function() {
            activateDSObj(dsObj);
            deferred.resolve();
        })
        .fail(function(error) {
            if (typeof error === "string") {
                error = {error: error}
            }
            DS.getGrid(dsObj.getId()).removeClass("loading");
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function activateDSObj(dsObj) {
        dsObj.activate();
        DS.getGrid(dsObj.getId()).removeClass("inActivated loading");
        var dsId = dsObj.getId();
        var $grid = DS.getGrid(dsId);
        if ($grid.hasClass("active")) {
            // re-focus on the dataset
            $grid.removeClass("active");
            DS.focusOn($grid);
        }
    }

    function deactivateDSAction(dsIds) {
        Alert.show({
            title: DSTStr.DeactivateDS,
            msg: DSTStr.DeactivateDSMsg,
            onConfirm: function() {
                deactivateDS(dsIds);
            }
        });
    }

    function deactivateDS(dsIds) {
        var deferred = PromiseHelper.deferred();
        var failures = [];
        var datasets = [];
        var dsInUse = [];
        var dirId = curDirId;
        var promises = dsIds.map(function(dsId) {
            return deactivateOneDSHelper(dsId, failures, datasets, dsInUse);
        });

        PromiseHelper.when.apply(this, promises)
        .then(function() {
            if (failures.length) {
                Alert.show({
                    "title": AlertTStr.Error,
                    "instr": (dsInUse.length) ? DSTStr.InUseInstr : null,
                    "msg": failures.join("\n"),
                    "isAlert": true,
                    "onCancel": focsueOnTracker
                });
            }
            if (datasets.length) {
                changeDSInfo(dirId, {
                    action: "deactivate",
                    dsIds: dsIds
                });
            }
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function deactivateOneDSHelper(dsId, failures, datasets, dsInUse) {
        var deferred = PromiseHelper.deferred();
        var dsObj = DS.getDSObj(dsId);
        if (dsObj.beFolder()) {
            return PromiseHelper.resolve();
        }

        var $grid = DS.getGrid(dsId);
        $grid.find(".deactivatingIcon").removeClass("xc-hidden");
        var fullDSName = dsObj.getFullName();

        clearLoadNodeInAllWorkbooks(fullDSName)
        .then(() => {
            return checkDSUser(fullDSName);
        })
        .then(function() {
            return XcalarDatasetDeactivate(fullDSName);
        })
        .then(function() {
            datasets.push(dsId);
            deactivateDSObj(dsId);
            deferred.resolve();
        })
        .fail(function(error) {
            // XXX TODO: use the correct status
            if (error.status === StatusT.StatusDsDatasetInUse) {
                dsInUse.push(dsId);
            }
            var errorMsg = xcHelper.replaceMsg(DSTStr.FailDeactivateDS, {
                "ds": dsObj.getName(),
                "error": error.error
            });
            failures.push(errorMsg);
            // still resolve it
            deferred.resolve();
        })
        .always(function() {
            $grid.find(".deactivatingIcon").addClass("xc-hidden");
        });

        return deferred.promise();
    }

    function deactivateDSObj(dsId) {
        var dsObj = DS.getDSObj(dsId);
        if (dsObj == null) {
            // when it's not in
            return;
        }
        var $grid = DS.getGrid(dsId);
        dsObj.deactivate();
        $grid.addClass("inActivated");
        var isShowDSTable = (DSTable.getId() === dsId ||
                            $("#dsTableContainer").data("id") === dsId);
        if (isShowDSTable) {
            $grid.removeClass("active");
            DS.focusOn($grid); // re-focus on the ds
        }
    }

    // XXX TODO: this is a try to remove all the load nodes
    // across a user's all workbooks,
    // but finally backend should remove the load node and
    // we should not use this workaround
    function clearLoadNodeInAllWorkbooks(datasetName) {
        var clearLoadNodeHelper = function(dsName, wkbkName) {
            var deferred = PromiseHelper.deferred();
            XcalarDatasetDeleteLoadNode(dsName, wkbkName)
            .then(deferred.resolve)
            .fail((error) => {
                if (error.status === StatusT.StatusDsDatasetInUse) {
                    var msg = xcHelper.replaceMsg(DSTStr.InUseErr, {
                        name: wkbkName
                    });
                    error.error = msg
                }
                deferred.reject(error);
            });

            return deferred.promise();
        }
        var workbooks = WorkbookManager.getWorkbooks();
        var promises = [];
        for (var id in workbooks) {
            var wkbk = workbooks[id];
            if (wkbk.hasResource()) {
                // when it's active workbook
                promises.push(clearLoadNodeHelper.bind(this, datasetName, wkbk.getName()));
            }
        }
        return PromiseHelper.chain(promises);
    }

    function getCurrentUserName() {
        return XcUser.getCurrentUserName();
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
        $gridView.find(".grid-unit.active").removeClass("active");

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
            } else if (!isInSharedFolder(curDirId)) {
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
        var dsId = $grid.data("dsid");
        var targetId = $target.data("dsid");
        var hasMoved = dropHelper(dsId, targetId);

        if (hasMoved) {
            refreshDS();
            changeDSInfo(targetId, {
                action: "drop",
                dsId: dsId,
                targetId: targetId
            });
        }
    };

    // Helper function to insert ds before or after another ds
    DS.insert = function($grid, $sibling, isBefore) {
        if (sortKey != null) {
            // cannot change order when has sort key
            return;
        } else if (isInSharedFolder(curDirId)) {
            // shared folder don't allow insert
            return;
        }
        var dragDsId = $grid.data("dsid");
        var ds = DS.getDSObj(dragDsId);

        var siblingId = $sibling.attr("data-dsid");
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
            $grid.attr("data-dsparentid", parentId)
                .data("dsparentid", parentId);
            if (isBefore) {
                $sibling.before($grid);
            } else {
                $sibling.after($grid);
            }
            refreshDS();
            UserSettings.commit(false, true);
        }
    };

    DS.dropToParent = function($grid) {
        var dsId = $grid.data("dsid");
        var ds = DS.getDSObj(dsId);
        // target
        var grandPaId = DS.getDSObj(ds.parentId).parentId;
        var hasMoved = dropHelper(dsId, grandPaId);

        if (hasMoved) {
            refreshDS();
            changeDSInfo(grandPaId, {
                action: "drop",
                dsId: dsId,
                targetId: grandPaId
            });
        }
    };

    function dropHelper(dsId, targetId) {
        var ds = DS.getDSObj(dsId);
        var targetDS = DS.getDSObj(targetId);
        if (dsId === targetId || ds == null || targetDS == null) {
            return false;
        }
        var $grid = DS.getGrid(dsId);
        if (ds.moveTo(targetDS, -1)) {
            $grid.attr("data-dsparentid", targetId)
                    .data("dsparentid", targetId);
            return true;
        }
        return false;
    }

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
        DS.__testOnly__.createDS = createDS;
        DS.__testOnly__.removeDS = removeDS;
        DS.__testOnly__.cacheErrorDS = cacheErrorDS;
        DS.__testOnly__.checkUnlistableDS = checkUnlistableDS;

        DS.__testOnly__.getDragDS = getDragDS;
        DS.__testOnly__.setDragDS = setDragDS;
        DS.__testOnly__.resetDragDS = resetDragDS;
        DS.__testOnly__.getDropTarget = getDropTarget;
        DS.__testOnly__.setDropTraget = setDropTraget;
        DS.__testOnly__.resetDropTarget = resetDropTarget;
        DS.__testOnly__.activateDS = activateDS;
        DS.__testOnly__.deactivateDS = deactivateDS;
        DS.__testOnly__.setSortKey = setSortKey;
        DS.__testOnly__.getSortKey = function() {
            return sortKey;
        };
        DS.__testOnly__.shareDS = shareDS;
        DS.__testOnly__.unshareDS = unshareDS;
        DS.__testOnly__.shareAndUnshareHelper = shareAndUnshareHelper;
        DS.__testOnly__.alertSampleSizeLimit = alertSampleSizeLimit;
    }
    /* End Of Unit Test Only */

    return (DS);
}(jQuery, {}));
