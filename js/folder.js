/*** Start of DSObj ***/

/**
* DSObj is a structure to store dataset and folder structure
*
* @class: DSObj
* @constructor
* @property {number} id, used for reference
* @property {string} name, front name
* @property {number} parentId, reference of its parent folder
* @property {boolean} isFolder
* @property {Array} eles, store pointers of children DSObj
* @property {number} totalChildren
* @property {string} dsName, dataset name
*/
function DSObj(id, name, parentId, isFolder, attrs) {
    this.id = id;
    this.name = name;
    this.parentId = parentId;     // parent directory
    this.isFolder = isFolder;
    this.attrs = attrs == null ? {} : attrs;

    /* initially, dataset count itself as one child,
       folder has no child;
     */
    if (isFolder) {
        this.eles = [];
        this.totalChildren = 0;
    } else {
        this.totalChildren = 1;
    }

    if (parentId >= 0) {
        var parent = DS.getDSObj(parentId);
        parent.eles.push(this);
    
        // update totalChildren of all ancestors
        DS.updateCount(this);
    }

    return (this);
}

/**
* Update name of DSObj when it is renamed 
*
* @method rename
* @param {string} newName, new name to be updated
* @return {DSObj} this
*/
DSObj.prototype.rename = function(newName) {
    var parent = DS.getDSObj(this.parentId);
    //check name confliction
    if (parent.checkNameConflict(this.id, newName, this.isFolder)) {
        var msg = 'Folder "' + newName + 
                '" already exists, please use another name!';
        var $grid = DS.getGrid(this.id);
        // alert invalid name
        StatusBox.show(msg, $grid);
    } else {
        this.name = newName;
        // commitToStorage();
    }

    return (this);
}

/**
* Remove DSObj from its parent
*
* @method removeFromParent
* @return {DSObj} this
*/
DSObj.prototype.removeFromParent = function() {
    var parent = DS.getDSObj(this.parentId);
    var index = parent.eles.indexOf(this);

    parent.eles.splice(index, 1);    // remove from parent
    // update totalChildren count of all ancestors
    DS.updateCount(this, true);
    this.parentId = -1;

    return (this);
}

/**
* Move DSObj to new parent (insert or append)
*
* @method moveTo
* @param {DSObj} newParent
* @param {number} index, index where to insert or append when index < 0
* @return {boolean} true or false
*/
DSObj.prototype.moveTo = function(newParent, index) {
    // not append to itself
    if (this.id == newParent.id) {
        return false;
    }

    // not append to same parent again, but can insert
    if (index < 0 && this.parentId == newParent.id) {
        return false;
    }

    // not append or insert to its own child
    var ele = newParent;
    while (ele != null && ele != this) {
        ele = DS.getDSObj(ele.parentId);
    }
    if (ele == this) {
        return false;
    }

    var $grid = DS.getGrid(this.id);
    // check name conflict
    if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
        var msg;
        if (this.isFolder) {
            msg = 'Folder "' + this.name + 
                  '" already exists, cannot move!';
        } else {
            msg = 'Data Set "' + this.name + 
                  '" already exists, cannot move!';
        }
        StatusBox.show(msg, $grid);
        return false;
    }

    this.removeFromParent();
    this.parentId = newParent.id;

    if ((index != undefined) && (index >= 0)) {
        newParent.eles.splice(index, 0, this);  // insert to parent
    } else {
        newParent.eles.push(this);  // append to parent
    }

    $grid.attr('data-dsParentId', newParent.id);

    // update totalChildren of all ancestors
    DS.updateCount(this);
    // commitToStorage();
    return true;
}

DSObj.prototype.checkNameConflict = function(id, name, isFolder) {
    if (!this.isFolder) {
        console.error("Error call", "only folder can call this function");
        return false;
    }

    var eles = this.eles;

    for (var i = 0; i <  eles.length; i ++) {
        var dsObj = eles[i];

        if (dsObj.isFolder && 
            dsObj.name === name && 
            dsObj.id !== id && 
            dsObj.isFolder === isFolder) {
            return true;
        }
    }

    return false;
}
/*** End of DSObj ***/

window.DS = (function($, DS) {
    /**
    * private property
    *
    * @property {number} homeDirId, home folder id, always be 0
    * @property {number} curDirId, current folder id
    * @property {number} dsObjId, dsid that assigns to DSObj
    * @property {Object} dsLookUpTable, look up DSObj via dsid
    * @property {DSObj} homeFolder, home folder
    * @property {jQuery} dragDS, dragged dataset or folder element
    * @property {jQuery} $dropTarget, target element for drop
    */

    var homeDirId = 0;  // constant

    var curDirId;
    var dsObjId;
    var dsLookUpTable;
    var homeFolder;
    // for DS drag n drop
    var $dragDS;
    var $dropTarget;

    // initialization
    DS.setup = function() {
        curDirId = homeDirId;
        dsObjId = 0;
        dsLookUpTable = {};

        homeFolder = new DSObj(dsObjId++, "", -1, true);
        dsLookUpTable[homeFolder.id] = homeFolder;

        // for drag and drop
        dragDSId = undefined;
        dropTargetDSId = undefined;
    }

    // get dsObj in lookupTable vi dsId
    DS.getDSObj = function (dsId) {
        return (dsLookUpTable[dsId]);
    }

    // get grid element related to dsId
    DS.getGrid = function(dsId) {
        if (dsId === homeDirId) {
            return ($("#gridView"));
        } else {
            return ($('grid-unit[data-dsId="' + dsId + '"]'));
        }
    }

    // create datasets or folder
    DS.create = function (options) {
        if (!options || !options.name) {
            return (undefined);
        }

        var id = options.id || (dsObjId++);
        var name = jQuery.trim(options.name);
        var parentId = options.parentId || curDirId;
        var isFolder = options.isFolder ? true : false;
        var attrs = options.attrs;

        var parent = DS.getDSObj(parentId);
        var $parentFolder = DS.getGrid(parentId);

        // XXX the way to rename may change later
        var i = 1;
        var validName = name;

        while (isFolder && parent.checkNameConflict(id, validName, isFolder)) {
            validName = name + ' (' + i + ')';
            i ++;
        }

        var ds = new DSObj(id, validName, parentId, isFolder, attrs);

        $parentFolder.append(getDSHTML_helper(ds));
        if (isFolder) {
            DS.getGrid(id).click()
                        .find('.label').focus();
        }
        // index into lookup table
        dsLookUpTable[ds.id] = ds;

        return (ds);
    }

    // load dataset from backend
    DS.load = function(dsName, dsFormat, loadURL, fieldDelim, lineDelim) {
        var deferred = jQuery.Deferred();

        console.log(dsName, dsFormat, loadURL, fieldDelim, lineDelim);
        $("#gridView").append(getTempDSHTML_helper(dsName));
        $("#waitingIcon").fadeIn(200);

        XcalarLoad(loadURL, dsFormat, dsName, fieldDelim, lineDelim)
        .then(function(result) {

            $("#tempDSIcon").remove();
            // add cli
            Cli.add('Load dataset', {
                "operation": "loadDataSet",
                "dsName": dsName,
                "dsFormat": dsFormat
            });
            // display new dataset
            DS.create({
                "name": dsName,
                "isFolder": false,
                "attrs": {"format": dsFormat}
            });
            // commitToStorage();
            DS.refresh();

            $("#dataset-" + dsName).click();

            deferred.resolve();
        })
        .fail(function(result) {
            $('#tempDSIcon').remove();
            deferred.reject(result);
        });

        return (deferred.promise());
    }

    // update totalChildren of all ancestors
    DS.updateCount = function(dsObj, isMinus) {
        var parentObj = DS.getDSObj(dsObj.parentId);

        while (parentObj != null) {
            if (isMinus) {
                parentObj.totalChildren -= dsObj.totalChildren;
            } else {
                parentObj.totalChildren += dsObj.totalChildren;
            }
            DS.getGrid(parentObj.id).find("> div.dsCount")
                                    .text(parentObj.totalChildren);
            parentObj = DS.getDSObj(parentObj.parentId);
        }
    }

    // restore from storage
    DS.restore = function(gDSObjFolder, datasets) {
        var isRestore = restoreDSObj_helper(gDSObjFolder, datasets);

        if (!isRestore) {
            var numDatasets = datasets.numDatasets;

            console.log("Construct directly from backend");

            for (var i = 0; i < numDatasets; i++) {
                var dataset =  datasets.datasets[i];
                var format = DfFormatTypeTStr[dataset.formatType]
                                .toUpperCase();
                DS.create({
                    "name": dataset.name,
                    "isFolder": false,
                    "attrs": {"format": format}
                });
            }
        }
        // commitToStorage(AfterStartup.After);
        DS.refresh();
    }

    // now only support rename DS Folder (later also rename ds file?)
    DS.rename = function ($label) {
        var newName = jQuery.trim($label.text());
        var $grid = $label.closest('grid-unit');
        var dsId = $grid.data("dsid");
        var ds = DS.getDSObj(dsId).rename(newName);

        $label.text(ds.name);
    }

    // now only check dataset name conflict
    DS.has = function (dsName) {
        if (dsName != undefined && $("#dataset-" + dsName).length > 0) {
            return true;
        } else {
            return false;
        }
    }


    // remove datasset or folder
    DS.remove = function($grid) {
        if ($grid == undefined || $grid.length === 0) {
            return;
        }

        if ($grid.hasClass("ds")) {
            // delete a ds
            var dsName = $grid.attr("id").split("dataset-")[1];
            var msg = "Are you sure you want to delete dataset " + dsName + "?";
            // add alert
            Alert.show({
                "title": "DELETE DATASET",
                "msg": msg,
                "isCheckBox": true,
                "confirm": function() {
                    deleteDataSet_helper($grid, dsName);
                }
            });
        } else if (deleteDSObj_helper($grid.data("dsid")) === true) {
            // delete a folder
            $grid.remove();
        }
    }

    // go back to parent folder
    DS.upDir = function() {
        var parentId =  DS.getDSObj(curDirId).parentId;
        DS.goToDir(parentId);
    }

    // change to another folder
    DS.goToDir = function(folderId) {
        curDirId = folderId;

        if (curDirId === homeDirId) {
            $('#backFolderBtn').addClass("disabled");
        } else {
            $('#backFolderBtn').removeClass('disabled');
        }

        DS.refresh();
    }

    // refresh css class
    DS.refresh = function () {
        $("grid-unit").removeClass("display").addClass("hidden");
        $('grid-unit[data-dsParentId="' + curDirId + '"]')
            .removeClass("hidden").addClass("display");
    }

    DS.clear = function() {
        $("#gridView grid-unit").remove();
        DS.setup();
    }

    DS.getCurrentState = function() {
        return (homeFolder);
    }

    // for drag and drop
    DS.getDragDS = function() {
        return ($dragDS);
    }

    DS.setDragDS = function($ds) {
        $dragDS = $ds;
    }

    DS.getDropTarget = function() {
        return ($dropTarget);
    }

    DS.setDropTraget = function($target) {
        $dropTarget = $target;
    }

    DS.resetDropTarget = function() {
        $dropTarget = undefined;
    }

    DS.resetDragDS = function() {
        $dragDS = undefined;
    }

    function deleteDataSet_helper($grid, dsName) {
        $grid.removeClass("active");
        $grid.addClass("inactive");
        $grid.append('<div id="waitingIcon" class="waitingIcon"></div>');

        $("#waitingIcon").fadeIn(200);

        XcalarSetFree(gDatasetBrowserResultSetId)
        .then(function() {
            gDatasetBrowserResultSetId = 0;
            return (XcalarDestroyDataset(dsName));
        })
        .then(function() {
            //clear data cart
            $("#selectedTable-" + dsName).remove();
            // clear data table
            $("#dataSetTableWrap").empty();
            // remove ds obj
            deleteDSObj_helper($grid.data("dsid"));
            $grid.remove();

            // add cli
            Cli.add("Delete DateSet", {
                "operation": "destroyDataSet",
                "dsName": dsName
            });

            $("#waitingIcon").remove();

            DataStore.updateNumDatasets();
            focusOnFirstDS_helper();
            commitToStorage();
        })
        .fail(function(error) {

            $("#waitingIcon").remove();
            $grid.removeClass("inactive");
            Alert.error("Delete Dataset Fails", error);
        });
    }
    // remove dsObj
    function deleteDSObj_helper(dsId) {
        var ds = DS.getDSObj(dsId);

        if (ds.isFolder && ds.eles.length > 0) {
            var instr = "Please remove all the datasets in the folder first.";
            var msg = "Unable to delete non-empty folders. Please ensure" +
                    " that all datasets have been removed from folders prior" +
                    " to deletion.";
            // add alert
            Alert.show({
                "title": "DELETE FOLDER",
                "instr": instr,
                "msg": msg,
                "isCheckBox": true,
                "isAlert": true
            });

            return false;
        } else {
            ds.removeFromParent();
            // delete ds
            delete dsLookUpTable[ds.id];
            delete ds;
            // commitToStorage();

            return true;
        }
    }

    function focusOnFirstDS_helper() {
        var $curFolder = DS.getGrid(curDirId);
        var $datasets = $curFolder.find("> grid-unit.ds");

        if ($datasets.length > 0) {
            $datasets.eq(0).click();
        } else {
            $("#importDataButton").click();
        }
    }

    function restoreDSObj_helper(gDSObjFolder, datasets) {
        // no gDSObjFolder from backend
        if (jQuery.isEmptyObject(gDSObjFolder)) {
            return false;
        }

        var numDatasets = datasets.numDatasets;
        var searchHash = {};
        // store all data set name to searchHash for lookup
        for (var i = 0; i < numDatasets; i++) {
            var dsName = datasets.datasets[i].name;
            searchHash[dsName] = true;
        }

        var dsCount = 0;
        var cache = gDSObjFolder.eles;
        // restore
        while (cache.length > 0) {
            var obj = cache.shift();
            if (obj.isFolder) {
                DS.create(obj);
            } else {
                if (obj.name in searchHash) {
                    DS.create(obj);
                    dsCount ++;
                } else {
                    // stored data not fit backend data, abort restore
                    DS.clear();
                    return false;
                }
            }
            if (obj.eles != undefined) {
                jQuery.merge(cache, obj.eles);
            }
            // update id count
            dsObjId = Math.max(dsObjId, obj.id + 1);
        }

        // stored data not fit backend data, abort restore
        if (dsCount != numDatasets) {
            DS.clear();
            return false;
        }

        return true;
    }

    function getDSHTML_helper(dsObj) {
        var id = dsObj.id;
        var parentId = dsObj.parentId;
        var name = dsObj.name;
        var isFolder = dsObj.isFolder;
        var html;

        if (isFolder) {
            html = 
            '<grid-unit class="folder display collapse" draggable="true"' + 
                ' ondragstart="dsDragStart(event)"' + 
                ' ondragend="dsDragEnd(event)"' + 
                ' data-dsId=' + id + 
                ' data-dsParentId=' + parentId + '>' + 
                '<div id=' + (id + "leftWarp") +
                    ' class="dragWrap leftTopDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' +
                    ' ondragover="allowDSDrop(event)"' + 
                    ' ondrop="dsDrop(event)">' + 
                '</div>' +
                '<div  id=' + (id + "midWarp") + 
                    ' class="dragWrap midDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' + 
                    ' ondragover="allowDSDrop(event)"' + 
                    ' ondrop="dsDrop(event)">' + 
                '</div>' +
                '<div  id=' + (id + "rightWarp") + 
                    ' class="dragWrap rightBottomDragWrap"' +
                    ' ondragenter="dsDragEnter(event)"' + 
                    ' ondragover="allowDSDrop(event)"' + 
                    ' ondrop="dsDrop(event)">' + 
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
            '</grid-unit>';
        } else {
            html = 
            '<grid-unit id="dataset-' + name + '" class="ds" draggable="true"' + 
                ' ondragstart="dsDragStart(event)"' + 
                ' ondragend="dsDragEnd(event)"' +
                ' data-dsId=' + id + 
                ' data-dsParentId=' + parentId + '>' +
                '<div  id=' + (id + "leftWarp") + 
                    ' class="dragWrap leftTopDragWrap"' + 
                    ' ondragenter="dsDragEnter(event)"' + 
                    ' ondragover="allowDSDrop(event)"' + 
                    ' ondrop="dsDrop(event)">' + 
                '</div>' +
                '<div id=' + (id + "rightWarp") + 
                    ' class="dragWrap rightBottomDragWrap"' + 
                    ' ondragenter="dsDragEnter(event)"' + 
                    ' ondragover="allowDSDrop(event)"' + 
                    ' ondrop="dsDrop(event)">' + 
                '</div>' +
                '<div class="gridIcon"></div>' + 
                '<div class="listIcon">' + 
                    '<span class="icon"></span>' + 
                '</div>' +
                '<div class="label" data-dsname=' + name + '>' + 
                    name + 
                '</div>' +
            '</grid-unit>';
        }

        return (html);
    }

    function getTempDSHTML_helper(dsName) {
        var html = 
            '<grid-unit id="tempDSIcon" class="ds display inactive">' +
                '<div class="gridIcon"></div>' + 
                '<div class="listIcon">' + 
                    '<span class="icon"></span>' + 
                '</div>' + 
                '<div id="waitingIcon" class="waitingIcon"></div>' + 
                '<div class="label">' + dsName + '</div>' + 
            '</grid-unit>';

        return (html);
    }

    return (DS);
}(jQuery, {}));

/*** Start of Drag and Drop Function for DSCart ***/
function dsDragStart(event) {
    var $grid = $(event.target).closest("grid-unit");
    var $gridView = $("#gridView");

    event.stopPropagation();
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.dropEffect = "copy";  
    // must add datatransfer to support firefox drag drop
    event.dataTransfer.setData("text", "");

    $("#deleteFolderBtn").addClass("disabled");

    DS.setDragDS($grid);
    DS.resetDropTarget();

    $grid.find("> .dragWrap").hide();
    $gridView.find(".active").removeClass("active");
    $gridView.addClass("drag");
    //when anter extra space in grid view
    $gridView.on("dragenter", function(){
        DS.resetDropTarget();
        $gridView.find(".active").removeClass("active");
        $("#backFolderBtn").removeClass("active");
    });

}

function dsDragEnd(event) {
    var $gridView = $("#gridView");
    var $grid = $(event.target).closest("grid-unit");

    event.stopPropagation();

    // clearence
    $grid.find("> .dragWrap").show();
    DS.resetDropTarget();
    DS.resetDragDS();

    $gridView.removeClass("drag");
    $gridView.off("dragenter");
    $gridView.find(".active").removeClass("active");
    $("#backFolderBtn").removeClass("active");
}

function dsDragEnter(event) {
    var $dragWrap = $(event.target);
    var targetId = $dragWrap.attr("id");
    var $dropTarget = DS.getDropTarget();

    event.preventDefault();
    event.stopPropagation();

    // back up button
    if (targetId == "backFolderBtn") {
        var $bacnFolderBtn = $("#backFolderBtn");

        if ($("#gridView").hasClass('listView') || 
            $bacnFolderBtn.hasClass("disabled")) {
            return;
        }
        $bacnFolderBtn.addClass("active");

    } else if (!$dropTarget || targetId !== $dropTarget.attr("id")) {
        // change drop target
        $("grid-unit").removeClass("active");
        $(".dragWrap").removeClass("active");

        if ($dragWrap.hasClass("midDragWrap")) {
            // drop in folder case
            $dragWrap.closest("grid-unit").addClass("active");
        } else {
            // insert case
            $dragWrap.addClass("active");
        }

        DS.setDropTraget($dragWrap);
    }
}

function dsDrop(event) {
    var $div = DS.getDropTarget();
    var $target = $div.closest('grid-unit');
    var $grid = DS.getDragDS();

    event.stopPropagation();

    if ($div != undefined) {
        if ($div.hasClass('midDragWrap')) {
            dsDropIn($grid, $target);
        } else if ($div.hasClass('leftTopDragWrap')) {
            dsInsert($grid, $target, true);
        } else {
            dsInsert($grid, $target, false);
        }
    }
}

function allowDSDrop(event) {
    // call the event.preventDefault() method for the ondragover allows a drop
    event.preventDefault();
}

// drop ds into a folder
function dsDropIn($grid, $target) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var targetId = $target.data("dsid");
    if (dragDsId === targetId) {
        return;
    }
    var targetDS = DS.getDSObj(targetId);

    if (ds.moveTo(targetDS, -1)) {
        $grid.attr("data-dsParentId",targetId);
        $target.append($grid);
        DS.refresh();
    }
}

// Insert ds before or after another ds
function dsInsert($grid, $sibling, isBefore) {
    var dragDsId = $grid.data("dsid");
    var ds = DS.getDSObj(dragDsId);

    var siblingId = $sibling.attr("data-dsId");
    if (dragDsId == siblingId) {
        return;
    }
    var siblingDs = DS.getDSObj(siblingId);

    // parent
    var parentId = siblingDs.parentId;
    var parentDs = DS.getDSObj(parentId);
    var $parent = DS.getGrid(parentId);

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
    }
}

function dsDropBack(event) {
    event.preventDefault(); // default is open as link on drop
    event.stopPropagation();

    if ($('#gridView').hasClass('listView') || 
        $('#backFolderBtn').hasClass('disabled')) {
        return;
    }

    var $grid = DS.getDragDS();
    var ds = DS.getDSObj($grid.data("dsid"));
    // target
    var grandPaId = DS.getDSObj(ds.parentId).parentId;
    var grandPaDs = DS.getDSObj(grandPaId);
    var $grandPa = DS.getGrid(grandPaId);

    if (ds.moveTo(grandPaDs, -1)) {
        $grid.attr("data-dsParentId", grandPaId);
        $grandPa.append($grid);
        DS.refresh();
    }
}
