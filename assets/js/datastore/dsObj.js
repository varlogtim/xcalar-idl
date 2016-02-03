/*
 * Module for mamgement of dsObj
 */
window.DS = (function ($, DS) {
    var homeDirId = 0;  // home folder id, constant

    var curDirId;       // current folder id
    var dsObjId;        // counter
    var dsLookUpTable;  // find DSObj by dsId
    var homeFolder;

    var $explorePanel = $("#exploreView");
    var $backFolderBtn = $("#backFolderBtn");
    var $deleteFolderBtn = $("#deleteFolderBtn");
    var $gridView = $explorePanel.find(".gridItems");

    // for DS drag n drop
    var $dragDS;
    var $dropTarget;

    DS.setup = function() {
        setupGridViewButtons();
        setupGrids();
    };

    // Get dsObj by dsId
    DS.getDSObj = function(dsId) {
        return dsLookUpTable[dsId];
    };

    // Get grid element(folder/datasets) by dsId
    DS.getGrid = function(dsId) {
        if (dsId === homeDirId) {
            return ($explorePanel.find(".gridItems"));
        } else {
            return ($explorePanel.find('.grid-unit[data-dsId="' + dsId + '"]'));
        }
    };

    // Get datasets element by dsName
    DS.getGridByName = function(dsName) {
        if (!dsName) {
            return (null);
        }

        var $ds = $("#dataset-" + dsName);
        if ($ds.length > 0) {
            return ($("#dataset-" + dsName));
        } else {
            return (null);
        }
    };

    // create a new folder
    DS.newFolder = function() {
        var ds = DS.create({
            "name"    : "New Folder",
            "isFolder": true
        });

        SQL.add("Create folder", {
            "operation": SQLOps.CreateFolder,
            "dsName"   : ds.name,
            "dsId"     : ds.id
        });

        // forcus on folder's label for renaming
        DS.getGrid(ds.id).click()
                    .find('.label').focus();

        return ds;
    };

    // Create dsObj for new dataset/folder
    DS.create = function(options) {
        options = options || {};
        // validation check
        xcHelper.assert((options.name != null), "Invalid Parameters");

        // pre-process
        options.id = options.id || (dsObjId++);
        options.name = options.name.trim();
        options.parentId = options.parentId || curDirId;
        options.isFolder = options.isFolder || false;

        var parent = DS.getDSObj(options.parentId);
        var $parent = DS.getGrid(options.parentId);

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
        }

        var dsObj = new DSObj(options);
        $parent.append(getDSHTML(dsObj));
        // cached in lookup table
        dsLookUpTable[dsObj.getId()] = dsObj;

        return dsObj;
    };

    // refresh a new dataset and add it to grid view
    DS.addDS = function(name, format, path) {
        DS.create({
            "name"    : name,
            "isFolder": false,
            "format"  : format,
            "path"    : path
        });

        DS.refresh();

        SQL.add("Add dataset", {
            "operation": SQLOps.AddDS,
            "name"     : name,
            "format"   : format,
            "path"     : path
        });
    };

    DS.focusOn = function($grid) {
        xcHelper.assert($grid != null && $grid.length !== 0, "error case");

        var deferred = jQuery.Deferred();

        $gridView.find(".active").removeClass("active");
        $grid.addClass("active");
        $deleteFolderBtn.removeClass("disabled");

        // folder do not show anything
        if ($grid.hasClass("folder")) {
            deferred.resolve();
            return deferred.promise();
        }

        var isLoading;
        if ($grid.find('.waitingIcon').length !== 0) {
            isLoading = true;
        } else {
            isLoading = false;
        }

        // when switch to a ds, should clear others' ref count first!!
        DataPreview.clear()
        .then(function() {
            return DS.release();
        })
        .then(function() {
            return DataSampleTable.show($grid.data("dsid"), isLoading);
        })
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

        return deferred.resolve();
    };

    // Load dataset
    // promise returns $grid element
    DS.load = function(dsName, dsFormat, loadURL, fieldDelim, lineDelim,
                        hasHeader, moduleName, funcName) {
        var deferred = jQuery.Deferred();

        // Here null means the attr is a placeholder, will
        // be update when the sample table is loaded
        DS.create({
            "name"      : dsName,
            "isFolder"  : false,
            "format"    : dsFormat,
            "path"      : loadURL,
            "fileSize"  : null,
            "numEntries": null
        });

        var $grid = DS.getGridByName(dsName);
        $grid.addClass('display inactive');
        $grid.append('<div class="waitingIcon"></div>');
        $grid.find('.waitingIcon').fadeIn(200);
        DS.focusOn($grid); // focus on grid before load
        DataStore.update();
        // the class will be removed in DataSampleTable.show()
        $("#datasetWrap").addClass("loading");
        var sqlOptions = {
            "operation" : SQLOps.DSLoad,
            "loadURL"   : loadURL,
            "dsName"    : dsName,
            "dsFormat"  : dsFormat,
            "hasHeader" : hasHeader,
            "fieldDelim": fieldDelim,
            "lineDelim" : lineDelim,
            "moduleName": moduleName,
            "funcName"  : funcName
        };

        XcalarLoad(loadURL, dsFormat, dsName,
                   fieldDelim, lineDelim, hasHeader,
                   moduleName, funcName, sqlOptions)
        .then(function() {
            // sample the dataset to see if it can be parsed
            return XcalarSample(dsName, 1);
        })
        .then(function(result) {
            if (!result) {
                // if dataset cannot be parsed produce a load fail
                var msg = {
                    "error"    : 'Cannot parse data set "' + dsName + '".',
                    "dsCreated": true
                };
                return jQuery.Deferred().reject(msg);
            } else {
                $grid.removeClass("inactive")
                    .find('.waitingIcon').remove();
            }

            // display new dataset
            DS.refresh();
            if ($grid.hasClass('active')) {
                // re-focus to trigger DataSampleTable.show()
                if (gMinModeOn) {
                    DS.focusOn($grid);
                } else {
                    $('#dataSetTableWrap').fadeOut(200, function() {
                        DS.focusOn($grid);
                        $(this).fadeIn();
                    });
                }
            }

            commitToStorage();
            deferred.resolve($grid);
        })
        .fail(function(error) {
            rmDSHelper($grid);
            DataStore.update();

            if ($('#dsInfo-title').text() === dsName) {
                // if loading page is showing, remove and go to import form
                $("#importDataView").show();
                $explorePanel.find(".contentViewMid").addClass('hidden');
                $explorePanel.find(".gridItems").find(".active")
                                               .removeClass("active");
                $("#dataSetTableWrap").empty();
            }
            if (error.dsCreated) {
                // if a data set was loaded but cannot be parsed, destroy it
                XcalarSetFree(gDatasetBrowserResultSetId)
                .then(function() {
                    gDatasetBrowserResultSetId = 0;
                    return (XcalarDestroyDataset(dsName, {
                        "operation": "destroyDataSet",
                        "dsName"   : dsName,
                        "sqlType"  : SQLType.Fail
                    }));
                })
                .fail(function(deferredError) {
                    Alert.error("Delete Dataset Fails", deferredError);
                });
            }

            deferred.reject(error);
        });

        return (deferred.promise());
    };

    // Get home folder
    DS.getHomeDir = function () {
        return (homeFolder);
    };

    // Restore dsObj
    DS.restore = function(oldHomeFolder, datasets, atStartUp) {
        var numDatasets = datasets.numDatasets;
        var totolDS = 0;
        var searchHash = {};

        DS.clear();

        // put all datasets' name into searchHash for lookup
        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;

            if (dsName.endsWith(".preview")) {
                // deal with preview datasets
                if (atStartUp) {
                    // preview ds is deleted on start up time!!
                    var sqlOptions = {
                        "operation": SQLOps.DestroyPreviewDS,
                        "dsName"   : dsName
                    };
                    XcalarDestroyDataset(dsName, sqlOptions);
                }
                continue;
            }

            ++totolDS;
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
        var orphanedDS = [];

        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.isFolder) {
                // restore a folder
                DS.create(obj);
            } else {
                if (searchHash.hasOwnProperty(obj.name)) {
                    // restore a ds
                    ds = searchHash[obj.name];
                    format = DfFormatTypeTStr[ds.formatType].toUpperCase();

                    obj = $.extend(obj, {
                        "format": format,
                        "path"  : ds.url
                    });

                    DS.create(obj);
                    // mark the ds to be used
                    delete searchHash[obj.name];
                } else {
                    // some ds is deleted by other users
                    // restore it first and then delete(for Replay, need the sql)
                    ds = DS.create(obj);
                    orphanedDS.push(ds);
                    delete searchHash[obj.name];
                }
            }

            if (obj.eles != null) {
                $.merge(cache, obj.eles);
            }
            // update id count
            dsObjId = Math.max(dsObjId, obj.id + 1);
        }

        // add ds that is not in oldHomeFolder
        for (dsName in searchHash) {
            ds = searchHash[dsName];
            if (ds != null) {
                format = DfFormatTypeTStr[ds.formatType].toUpperCase();
                DS.addDS(ds.name, format, ds.url);
            }
        }

        // delete ds that is orphaned
        var isOrphaned = true;
        var $grid;
        for (var i = 0, len = orphanedDS.length; i < len; i++) {
            dsName = orphanedDS[i].name;
            $grid = DS.getGridByName(dsName);
            DS.remove($grid, isOrphaned);
        }

        // UI update
        DS.refresh();
        DataStore.update(totolDS);

        if (atStartUp) {
            // restore list view if saved
            var settings = UserSettings.getSettings();
            toggleDSView(settings.datasetListView);
        } else {
            // if user trigger the restore, save!
            commitToStorage();
        }
    };

    // Rename dsObj
    DS.rename = function(dsId, newName) {
        // now only for folders (later also rename datasets?)
        var dsObj   = DS.getDSObj(dsId);
        var $label  = DS.getGrid(dsId).find("> .label");
        var oldName = dsObj.getName();

        if (newName === oldName) {
            return;
        } else {
            if (dsObj.rename(newName)) {
                // valid rename
                SQL.add("Rename Folder", {
                    "operation": SQLOps.DSRename,
                    "dsId"     : dsId,
                    "oldName"  : oldName,
                    "newName"  : newName
                });

                $label.text(newName);
                commitToStorage();
            } else {
                $label.text(oldName);
            }
        }
    };

    // Check if the ds's name already exists
    DS.has = function(dsName) {
        // now only check dataset name conflict
        if (DS.getGridByName(dsName) != null) {
            return true;
        } else {
            return false;
        }
    };

    // Remove dataset/folder
    DS.remove = function($grid, isOrphaned) {
        xcHelper.assert(($grid != null && $grid.length !== 0),
                        "Invalid remove of ds");

        var dsId   = $grid.data("dsid");
        var dsObj  = DS.getDSObj(dsId);
        var dsName = dsObj.getName();

        if ($grid.hasClass("ds")) {
            // when remove ds
            if (isOrphaned) {
                rmDSHelper($grid);

                SQL.add("Delete Dataset", {
                    "operation" : SQLOps.DestroyDS,
                    "dsName"    : dsName,
                    "isOrphaned": true
                });
                return;
            }
            // delete a ds
            var msg = "Are you sure you want to delete dataset " + dsName + "?";
            // add alert
            Alert.show({
                "title"  : "DELETE DATASET",
                "msg"    : msg,
                "confirm": function () {
                    delDSHelper($grid, dsName);
                }
            });
        } else if (rmDSHelper($grid) === true) {
            // when remove folder
            SQL.add("Delete Folder", {
                "operation": SQLOps.DelFolder,
                "dsName"   : dsName,
                "dsId"     : dsId
            });
        }
    };

    // Change dir to parent folder
    DS.upDir = function() {
        var parentId = DS.getDSObj(curDirId).getParentId();
        DS.goToDir(parentId);
    };

    // Change dir to another folder
    DS.goToDir = function(folderId) {
        curDirId = folderId;

        if (curDirId === homeDirId) {
            $('#backFolderBtn').addClass("disabled");
        } else {
            $('#backFolderBtn').removeClass('disabled');
        }

        DS.refresh();

        SQL.add("Go to folder", {
            "operation" : SQLOps.DSToDir,
            "folderId"  : folderId,
            "folderName": DS.getDSObj(folderId).getName()
        });
    };

    // Refresh dataset/folder display in gridView area
    DS.refresh = function() {
        $explorePanel.find(".gridItems .grid-unit").removeClass("display")
                                                  .addClass("hidden");
        $explorePanel.find('.gridItems .grid-unit[data-dsParentId="' +
                            curDirId + '"]')
            .removeClass("hidden").addClass("display");
    };


    DS.release = function() {
        var deferred = jQuery.Deferred();

        if (gDatasetBrowserResultSetId === 0) {
            deferred.resolve();
        } else {
            XcalarSetFree(gDatasetBrowserResultSetId)
            .then(function() {
                gDatasetBrowserResultSetId = 0;
                deferred.resolve();
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    };

    // Clear dataset/folder in gridView area
    DS.clear = function() {
        $explorePanel.find(".gridItems .grid-unit").remove();
        dsSetupHelper();
    };


    // Helper function for setup
    function dsSetupHelper() {
        curDirId = homeDirId;
        dsObjId = 0;
        dsLookUpTable = {};

        homeFolder = new DSObj({
            "id"      : dsObjId,
            "name"    : ".",
            "parentId": -1,
            "isFolder": true
        });

        dsObjId++;
        dsLookUpTable[homeFolder.getId()] = homeFolder;
    }

    // Helper function for DS.remove()
    function delDSHelper($grid, dsName) {
        var deferred = jQuery.Deferred();

        $grid.removeClass("active");
        $grid.addClass("inactive");
        $grid.append('<div class="waitingIcon"></div>');

        $grid.find(".waitingIcon").fadeIn(200);

        var sqlOptions = {
            "operation": SQLOps.DestroyDS,
            "dsName"   : dsName
        };

        XcalarSetFree(gDatasetBrowserResultSetId)
        .then(function() {
            gDatasetBrowserResultSetId = 0;
            return (XcalarDestroyDataset(dsName, sqlOptions));
        })
        .then(function() {
            //clear data cart
            $("#selectedTable-" + dsName).remove();
            // clear data table
            $("#dataSetTableWrap").empty();
            // remove ds obj
            rmDSHelper($grid);
            DataStore.update();

            focusOnFirstDS();
            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            $grid.find('.waitingIcon').remove();
            $grid.removeClass("inactive");
            Alert.error("Delete Dataset Fails", error);
            deferred.reject();
        });

        return deferred.promise();
    }

    // Helper function to remove ds
    function rmDSHelper($grid) {
        var dsId  = $grid.data("dsid");
        var dsObj = DS.getDSObj(dsId);

        if (dsObj.beFolderWithDS()) {
            var instr = "Please remove all the datasets in the folder first.";
            var msg = "Unable to delete non-empty folders. Please ensure\r\n" +
                    " that all datasets have been removed from folders prior" +
                    " to deletion.";
            // add alert
            Alert.show({
                "title"  : "DELETE FOLDER",
                "instr"  : instr,
                "msg"    : msg,
                "isAlert": true
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

    // Focus on the first dataset in the folder
    function focusOnFirstDS() {
        var $curFolder = DS.getGrid(curDirId);
        var $datasets = $curFolder.find("> .grid-unit.ds");

        if ($datasets.length > 0) {
            DS.focusOn($datasets.eq(0));
        } else {
            DatastoreForm.show();
        }
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
        $("#backFolderBtn").click(function() {
            if (!$(this).hasClass("disabled")) {
                DS.upDir();
            }
        });

        // click "Delete Folder" button to delete folder
        $deleteFolderBtn.click(function() {
            if ($(this).hasClass("disabled")) {
                return;
            }

            DS.remove($(".grid-unit.active"));
        });
    }

    function setupGrids() {
        // refresh dataset
        $("#refreshDS").click(function() {
            xcHelper.showRefreshIcon($explorePanel.find('.gridViewWrapper'));

            XcalarGetDatasets()
            .then(function(datasets) {
                DS.restore(DS.getHomeDir(), datasets);
            })
            .fail(function(error) {
                console.error("Refresh DS failed", error);
            });
        });

        // click empty area on gridView
        $explorePanel.find(".gridViewWrapper").on("click", function() {
            // this hanlder is called before the following one
            $gridView.find(".active").removeClass("active");
            $deleteFolderBtn.addClass("disabled");
        });

        // click a folder/ds
        $gridView.on("click", ".grid-unit", function(event) {
            event.stopPropagation(); // stop event bubbling
            var $grid = $(this);
            DS.focusOn($grid);
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
            // select all on focus
            "focus": function() {
                var div = $(this).get(0);
                // without setTimeout cannot select all for some unknow reasons
                setTimeout(function() {
                    xcHelper.createSelection(div);
                }, 1);
            },
            "blur": function() {
                var $label  = $(this);
                var dsId    = $label.closest(".grid-unit").data("dsid");
                var newName = $label.text().trim();
                DS.rename(dsId, newName);
                this.scrollLeft = 0;    //scroll to the start of text;
                xcHelper.removeSelectionRange();
            }
        }, ".folder .label");

        // dbclick grid view folder
        $gridView.on("dblclick", ".folder > .gridIcon, .folder > .dsCount",
            function() {
                var $grid = $(this).closest(".folder");
                $gridView.find(".active").removeClass("active");
                $deleteFolderBtn.addClass("disabled");

                if ($gridView.hasClass("gridView")) {
                    DS.goToDir($grid.data("dsid"));
                }
            }
        );

        // click list view folder
        $gridView.on("click", ".folder > .listIcon, .folder > .dsCount",
            function() {
                var $grid = $(this).closest(".folder");
                if ($gridView.hasClass("listView")) {
                    $grid.toggleClass("collapse");
                }
            }
        );
    }

    // toggle between list view and grid view
    function toggleDSView(isListView) {
        var $btn = $("#dataViewBtn, #exportViewBtn");
        var $allGrids = $gridView.add($('#exportView').find('.gridItems'));
        // includes import and export grids
        if (isListView) {
            // show list view
            $btn.removeClass("gridView").addClass("listView");
            $allGrids.removeClass("gridView").addClass("listView");
            $btn.attr('data-original-title', 'Switch to Grid view');
            $allGrids.find('.label').removeAttr('data-toggle');
        } else {
            $btn.removeClass("listView").addClass("gridView");
            $allGrids.removeClass("listView").addClass("gridView");
            $btn.attr('data-original-title', 'Switch to List view');
            $allGrids.find('.label').attr('data-toggle', 'tooltip');
        }

        // refresh tooltip
        $btn.mouseenter();
        $btn.mouseover();
    }

    // Helper function for DS.create()
    function getDSHTML(dsObj) {
        var id = dsObj.getId();
        var parentId = dsObj.getParentId();
        var name = dsObj.getName();
        var html;

        if (dsObj.beFolder()) {
            // when it's a folder
            html =
            '<div class="folder display collapse grid-unit" draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "midWarp") +
                    ' class="dragWrap midDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div  id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="dsCount">0</div>' +
                '<div title="Click to rename"' +
                    ' class="label" contentEditable="true">' +
                    name +
                '</div>' +
            '</div>';
        } else {
            // when it's a dataset
            html =
            '<div id="dataset-' + name + '" class="ds grid-unit" draggable="true"' +
                ' ondragstart="DS.onDragStart(event)"' +
                ' ondragend="DS.onDragEnd(event)"' +
                ' data-dsId=' + id +
                ' data-dsParentId=' + parentId + '>' +
                '<div  id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div id=' + (id + "rightWarp") +
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="DS.onDragEnter(event)"' +
                    ' ondragover="DS.allowDrop(event)"' +
                    ' ondrop="DS.onDrop(event)">' +
                '</div>' +
                '<div class="gridIcon"></div>' +
                '<div class="listIcon">' +
                    '<span class="icon"></span>' +
                '</div>' +
                '<div class="label" data-dsname=' + name + '>' +
                    name +
                '</div>' +
            '</div>';
        }

        return (html);
    }

    /*** Drag and Drop API ***/
    // Helper function for drag start event
    DS.onDragStart = function(event) {
        var $grid = $(event.target).closest(".grid-unit");

        event.stopPropagation();
        event.dataTransfer.effectAllowed = "copyMove";
        event.dataTransfer.dropEffect = "copy";
        // must add datatransfer to support firefox drag drop
        event.dataTransfer.setData("text", "");

        $deleteFolderBtn.addClass("disabled");

        setDragDS($grid);
        resetDropTarget();

        $grid.find("> .dragWrap").hide();
        $gridView.find(".active").removeClass("active");
        $gridView.addClass("drag");

        // when enter extra space in grid view
        $gridView.on("dragenter", function(){
            resetDropTarget();
            $gridView.find(".active").removeClass("active");
            $backFolderBtn.removeClass("active");
        });
    };

    // Helper function for drag end event
    DS.onDragEnd = function(event) {
        var $grid = $(event.target).closest(".grid-unit");

        event.stopPropagation();

        // clearence
        $grid.find("> .dragWrap").show();
        resetDropTarget();
        resetDragDS();

        $gridView.removeClass("drag");
        $gridView.off("dragenter");
        $gridView.find(".active").removeClass("active");
        $backFolderBtn.removeClass("active");
    };

    // Helper function for drag enter event
    DS.onDragEnter = function() {
        var $dragWrap = $(event.target);
        var targetId = $dragWrap.attr("id");
        var $curDropTarget = getDropTarget();

        event.preventDefault();
        event.stopPropagation();

        // back up button
        if (targetId === "backFolderBtn") {
            var $bacnFolderBtn = $("#backFolderBtn");

            if ($('#exploreView').find(".gridItems").hasClass('listView') ||
                $bacnFolderBtn.hasClass("disabled")) {
                return;
            }
            $bacnFolderBtn.addClass("active");

        } else if (!$curDropTarget || targetId !== $curDropTarget.attr("id")) {
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
        // call the event.preventDefault() method for the ondragover allows a drop
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
        }
    };

    // Helper function to drop ds back to parent folder
    DS.onDropBack = function(event) {
        event.preventDefault(); // default is open as link on drop
        event.stopPropagation();

        if ($gridView.hasClass("listView") ||
            $backFolderBtn.hasClass("disabled"))
        {
            return;
        }

        var $grid = getDragDS();
        DS.dropToParent($grid);
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
            $grid.attr("data-dsParentId", targetId);
            $target.append($grid);
            DS.refresh();

            SQL.add("Drop dataset/folder", {
                "operation"   : SQLOps.DSDropIn,
                "dsId"        : dragDsId,
                "dsName"      : ds.getName(),
                "targetDSId"  : targetId,
                "targetDSName": targetDS.getName()
            });
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
            $grid.attr("data-dsParentId", parentId);
            if (isBefore) {
                $sibling.before($grid);
            } else {
                $sibling.after($grid);
            }
            DS.refresh();

            SQL.add("Insert dataset/folder", {
                "operation"    : SQLOps.DSInsert,
                "dsId"         : dragDsId,
                "dsName"       : ds.getName(),
                "siblingDSId"  : siblingId,
                "siblingDSName": siblingDs.getName(),
                "isBefore"     : isBefore
            });
        }
    };

    DS.dropToParent = function($grid) {
        var dsId = $grid.data("dsid");
        var ds = DS.getDSObj(dsId);
        // target
        var grandPaId = DS.getDSObj(ds.parentId).parentId;
        var grandPaDs = DS.getDSObj(grandPaId);
        var $grandPa = DS.getGrid(grandPaId);

        if (ds.moveTo(grandPaDs, -1)) {
            $grid.attr("data-dsParentId", grandPaId);
            $grandPa.append($grid);
            DS.refresh();

            SQL.add("Drop dataset/folder back", {
                "operation"    : SQLOps.DSDropBack,
                "dsId"         : dsId,
                "dsName"       : ds.getName(),
                "newFolderId"  : grandPaId,
                "newFolderName": grandPaDs.getName()
            });
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

    // Set drap target
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
    }
    /* End Of Unit Test Only */

    return (DS);
}(jQuery, {}));
