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
    if (attrs) {
        this.attrs = attrs;
    } else {
        this.attrs = {};
    }
    /* initially, dataset count itself as one child,
       folder has no child;
     */
    if (isFolder) {
        this.eles = [];
        this.totalChildren = 0;
    } else {
        this.totalChildren = 1;
        gDSObj.datasetLookUpTable[name] = true;
    }

    gDSObj.lookUpTable[this.id] = this; // index into lookup table

    if (parentId >= 0) {
        var parent = DSObj.getById(parentId);
        parent.eles.push(this);
    
        // update totalChildren of all ancestors
        while (parent != undefined) {
            parent.totalChildren += this.totalChildren;
            $('grid-unit[data-dsId="' + parent.id + '"] > div.dsCount')
                .html(parent.totalChildren);
            parent = DSObj.getById(parent.parentId);
        }
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
    newName = jQuery.trim(newName);
    var parent = DSObj.getById(this.parentId);
    //check name confliction
    if (DSObj.isNameConflict(this.id, newName, parent, this.isFolder)) {
        var msg = 'Folder "' + newName + 
                '" already exists, please use another name!';
        $grid = $('grid-unit[data-dsId="' + this.id + '"]');
        // alert invalid name
        StatusBox.show(msg, $grid);
    } else {
        this.name = newName;
        commitDSObjToStorage(); // commit to local storage
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
    var parent = DSObj.getById(this.parentId);
    var index = parent.eles.indexOf(this);

    parent.eles.splice(index, 1);    // remove from parent
    // update totalChildren count of all ancestors
    while (parent != null) {
        parent.totalChildren -= this.totalChildren;
        $('grid-unit[data-dsId="' + parent.id + '"] > div.dsCount')
            .html(parent.totalChildren);
        parent = DSObj.getById(parent.parentId);
    }
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
        return (false);
    }

    // not append to same parent again, but can insert
    if (index < 0 && this.parentId == newParent.id) {
        return (false);
    }

    // not append or insert to its own child
    var ele = newParent;
    while (ele != null && ele != this) {
        ele = DSObj.getById(ele.parentId);
    }
    if (ele == this) {
        return (false);
    }

    // check name conflict
    if (DSObj.isNameConflict(this.id, this.name, newParent, this.isFolder)) {
        var msg;
        if (this.isFolder) {
            msg = 'Folder "' + this.name + 
                  '" already exists, cannot move!';
        } else {
            msg = 'Data Set "' + this.name + 
                  '" already exists, cannot move!';
        }
        $grid = $('grid-unit[data-dsId="' + this.id + '"]');
        StatusBox.show(msg, $grid);
        return (false);
    }

    this.removeFromParent();
    this.parentId = newParent.id;
    if ((index != undefined) && (index >= 0)) {
        newParent.eles.splice(index, 0, this);  // insert to parent
    } else {
        newParent.eles.push(this);  // append to parent
    }
    $('grid-unit[data-dsId="' + this.id + '"]')
        .attr('data-dsParentId', newParent.id);

    // update totalChildren of all ancestors
    while (newParent != null) {
        newParent.totalChildren += this.totalChildren;
        $('grid-unit[data-dsId="' + newParent.id + '"] > div.dsCount')
        .html(newParent.totalChildren);
        newParent = DSObj.getById(newParent.parentId);
    }
    commitDSObjToStorage(); // commit to local storage
    return (true);
}
/*** End of DSObj ***/

/*** Start of initializetion function **/

/**
* Initialize gDSObj
*
* @method gDSInitialization
* @property {number} homeId, home folder id, always be 0
* @property {number} curId, current folder id
* @property {Object} lookUpTable, to look up DSObj using DSObj.id
* @property {number} id, to assign new DSObj
* @property {DSObj} folder, home folder
* @property {number} dragDSId, dragged data set or folder
*/
function gDSInitialization() {
    gDSObj.homeId = 0;
    gDSObj.curId = gDSObj.homeId;
    gDSObj.lookUpTable = {};
    gDSObj.datasetLookUpTable = {};
    gDSObj.id = 0;
    gDSObj.folder = new DSObj(gDSObj.id++, "", -1, true);
    // for drag and drop
    gDSObj.dragDsId = undefined;
    gDSObj.dropDivId = undefined;
}

/**
* Button Initialization for data set left menu bar
*
* @method dsBtnInitizlize
* @param {Jquery} $gridView, place to append button
*/
function dsBtnInitizlize($gridViewBtnArea) {
    var html = "";
    html += '<div id="backFolderBtn"  class="disabled"' + 
                ' data-toggle="tooltip" data-placement="bottom"' +
                ' title="See previous folders"' + 
                ' ondrop="dsDropBack(event)"' + 
                ' ondragover="allowDSDrop(event)"' + 
                ' ondragenter="dsDragEnter(event)">' +
                '<div class="icon"></div>' +
                '<div class="label">' + 
                    '..' + 
                '</div>' + 
            '</div>';

    html += '<div id="addFolderBtn"'+ 
                ' data-toggle="tooltip" data-placement="bottom"'+
                ' title="Add New Folder">' + 
                '<div class="icon"></div>' +
                '<div class="label">' + 
                    'NEW' + 
                '</div>' + 
            '</div>';

    html += '<div id="deleteFolderBtn" class="disabled"' + 
            ' data-toggle="tooltip" data-placement="bottom"' +
            ' title="Delete Folder">' + 
                '<div class="icon"></div>' +
                '<div class="label">' + 
                    'DELETE' + 
                '</div>' + 
            '</div>';
    $gridViewBtnArea.append(html);

    // click "Add New Folder" button to add new folder
    $("#addFolderBtn").click(function() {
        DSObj.create(gDSObj.id++, "New Folder", gDSObj.curId, true);
        commitDSObjToStorage();
    });

    // click "Back Up" button to go back to parent folder
    $("#backFolderBtn").click(function() {
        if ($(this).hasClass('disabled')) {
            return;
        }
        DSObj.upDir();
    });

    // click "Delete Folder" button to delete folder
    $("#deleteFolderBtn").click(function() {
        if ($(this).hasClass('disabled')) {
             return;
        }
        var $folder = $('grid-unit.folder.active');
        var folderId = $folder.attr('data-dsId');
        if (DSObj.deleteById(folderId) === true) {
            $folder.remove();
        }
    });
}

/**
* Store gDSObjFolder to local storage
*
* @method commitDSObjToStorage
*/
function commitDSObjToStorage() {
    var stringed = JSON.stringify(gDSObjFolder);
    localStorage["gDSObj"] = stringed;
}

/**
* Restore dataset left menu bar from local storage
*
* @method restoreDSObj
* @param {Array} datasets, backend dataset
* @return {boolean} true or false
*/
function restoreDSObj(datasets) {
    // no gDSObjFolder from local storage
    if (jQuery.isEmptyObject(gDSObjFolder)) {
        gDSObjFolder = gDSObj.folder;
        return (false);
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
            DSObj.create(obj.id, obj.name, obj.parentId, 
                         obj.isFolder, obj.attrs);
        } else {
            if (obj.name in searchHash) {
                DSObj.create(obj.id, obj.name, obj.parentId, 
                            obj.isFolder, obj.attrs);
                dsCount ++;
            } else {
                // local storage not fit backend data, abort restore
                DSObj.clearAll();
                return (false);
            }
        }
        if (obj.eles != undefined) {
            jQuery.merge(cache, obj.eles);
        }
        gDSObj.id = Math.max(gDSObj.id, obj.id + 1);  // update id count
    }

    // local storage not fit backend data, abort restore
    if (dsCount != numDatasets) {
        DSObj.clearAll();
        return (false);
    }
    gDSObjFolder = gDSObj.folder;
    return (true);
}

/*** End of initializetion function **/

/*** Start of helper function ***/

// find dsObj in lookupTable
DSObj.getById = function (id) {
    return (gDSObj.lookUpTable[id]);
}

// delete dsObj in lookupTable
DSObj.clean = function (dsObj) {
    delete gDSObj.lookUpTable[dsObj.id];
    if (!dsObj.isFolder) {
        delete gDSObj.datasetLookUpTable[dsObj.name];
    }
    delete dsObj;
}

// check name conflict
DSObj.isNameConflict = function (id, name, parent, isFolder) {
    for (var i = 0; i <  parent.eles.length; i ++) {
        var dsEle = parent.eles[i];
        if ((dsEle.name == name) && (dsEle.isFolder == isFolder) 
                && (dsEle.id != id)) {
            return (true);
        }
    }
    return (false);
}

// check dataset name conflict
DSObj.isDataSetNameConflict = function (tableName) {
    if (tableName != undefined &&
         gDSObj.datasetLookUpTable[tableName] === true)
    {
        return true;
    }
    return false;
}

// create ds ele and ds folder ele
DSObj.create = function (id, name, parentId, isFolder, attrs) {
    name = jQuery.trim(name);
    var parent = DSObj.getById(parentId);
    var $parentEle;
    if (parentId == gDSObj.homeId) {  // in home directory
        $parentEle = $('#gridView');
    } else {
        $parentEle = $('#gridView grid-unit[data-dsId="' + parentId + '"]');
    }

    //way to rename may change later
    var i = 1;
    var curName = name;
    while (isFolder && DSObj.isNameConflict(id, curName, parent, isFolder)) {
        curName = name + ' (' + i + ')';
        i ++;
    }
    var ds = new DSObj(id, curName, parentId, isFolder, attrs);
    var html;
    if (isFolder) {
        html =  '<grid-unit class="folder display collapse" draggable="true"' + 
                    ' ondragstart="dsDragStart(event)"' + 
                    ' ondragend="dsDragEnd(event)"' + 
                    ' data-dsId=' + ds.id + 
                    ' data-dsParentId=' + parentId + '>' + 
                    '<div id=' + (ds.id + "leftWarp") +
                        ' class="dragWrap leftTopDragWrap"' +
                        ' ondragenter="dsDragEnter(event)"' +
                        ' ondragover="allowDSDrop(event)"' + 
                        ' ondrop="dsDrop(event)">' + 
                    '</div>' +
                    '<div  id=' + (ds.id + "midWarp") + 
                        ' class="dragWrap midDragWrap"' +
                        ' ondragenter="dsDragEnter(event)"' + 
                        ' ondragover="allowDSDrop(event)"' + 
                        ' ondrop="dsDrop(event)">' + 
                    '</div>' +
                    '<div  id=' + (ds.id + "rightWarp") + 
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
                        ds.name + 
                    '</div>' + 
                '</grid-unit>';
    } else {
        html = '<grid-unit id="dataset-' + ds.name + '" class="ds" draggable="true"' + 
                    ' ondragstart="dsDragStart(event)"' + 
                    ' ondragend="dsDragEnd(event)"' +
                    ' data-dsId=' + ds.id + 
                    ' data-dsParentId=' + parentId + '>' +
                    '<div  id=' + (ds.id + "leftWarp") + 
                        ' class="dragWrap leftTopDragWrap"' + 
                        ' ondragenter="dsDragEnter(event)"' + 
                        ' ondragover="allowDSDrop(event)"' + 
                        ' ondrop="dsDrop(event)">' + 
                    '</div>' +
                    '<div id=' + (ds.id + "rightWarp") + 
                        ' class="dragWrap rightBottomDragWrap"' + 
                        ' ondragenter="dsDragEnter(event)"' + 
                        ' ondragover="allowDSDrop(event)"' + 
                        ' ondrop="dsDrop(event)">' + 
                    '</div>' +
                    '<div class="gridIcon"></div>' + 
                    '<div class="listIcon">' + 
                        '<span class="icon"></span>' + 
                    '</div>' +
                    '<div class="label" data-dsname=' + ds.name + '>' + 
                        ds.name + 
                    '</div>' +
                '</grid-unit>';
    }

    $parentEle.append(html);
    if (isFolder) {
        $('grid-unit[data-dsId="' + ds.id + '"]').click()
                                                 .find('.label')
                                                 .focus();
    }
}

// rename DS Folder (later also rename ds file?)
DSObj.rename = function ($div) {
    var newName = $div.text();
    var $grid = $div.closest('grid-unit');
    var dsId = $grid.attr("data-dsId");
    var ds = gDSObj.lookUpTable[dsId].rename(newName);
    $div.text(ds.name);
}

// remove ds
DSObj.deleteById = function (dsId) {
    var ds = DSObj.getById(dsId);
    if (ds.isFolder && ds.eles.length > 0) {
        // alert('Not Empty, cannot delete');
        var options = {};
        options.title = 'DELETE FOLDER';
        options.instr = 'Please remove all the datasets ' + 
                              'in the folder first.';
        options.msg = 'Unable to delete non-empty folders. Please ensure'+
                      ' that all datasets have been removed from folders prior'+
                      ' to deletion.';
        options.isCheckBox = true;
        options.isAlert = true;
        Alert.show(options);
        return (false);
    }

    ds.removeFromParent();
    DSObj.clean(ds);
    commitDSObjToStorage();
    return (true);
}

// refresh css class
DSObj.display = function () {
    $('grid-unit').removeClass('display')
                  .addClass("hidden");
    $('grid-unit[data-dsParentId="' + gDSObj.curId + '"]').removeClass('hidden')
                                                          .addClass('display');
}

// clear data set
DSObj.clearAll = function () {
    $('#gridView grid-unit').remove();
    gDSInitialization();
    gDSObjFolder = {};
}

// clear both backend and front end
DSObj.reset = function() {
    var deferred = jQuery.Deferred();
    var promises = [];
    var queue = [];
    queue.push(gDSObj.folder);
    while (queue.length > 0) {
        var dsFolder = queue.shift();
        for (var i = 0; i < dsFolder.eles.length; i ++) {
            var dsObj = dsFolder.eles[i];
            if (dsObj.isFolder && dsObj.eles.length > 0) {
                queue.push(dsObj);
            } else if(!dsObj.isFolder) {
                promises.push(XcalarDestroyDataset.bind(this, dsObj.name));
            }
        }
    }
    chain(promises)
    .then(function() {
        console.log('Datasets deleted!');
        DSObj.clearAll();
        $('#importDataButton').click();
        deferred.resolve();
    })
    .fail(function() {
        console.log('Datasets fail to delete!');
        deferred.reject();
    });
    return (deferred.promise());
}

// change to another DS dir
DSObj.changeDir = function (curId) {
    gDSObj.curId = curId;
    if (gDSObj.curId == gDSObj.homeId) {
        $('#backFolderBtn').addClass("disabled");
    } else {
        $('#backFolderBtn').removeClass('disabled');
    }
    DSObj.display();
}

// go back to parent dir
DSObj.upDir = function () {
    var curId = gDSObj.curId;
    var parentId = gDSObj.lookUpTable[curId].parentId;
    DSObj.changeDir(parentId);
}
/*** End of helper function ***/

/*** Start of Drag and Drop Function for DSCart ***/
function dsDragStart(event) {
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.dropEffect = "copy";  
    event.stopPropagation();
    // must add datatransfer to support firefox drag drop
    event.dataTransfer.setData('text', '');
    $grid = $(event.target).closest('grid-unit');
    $('#deleteFolderBtn').addClass('disabled');
    gDSObj.dragDsId = $grid.attr('data-dsId');
    gDSObj.dropDivId = undefined;

    var $gridView = $('#gridView');
    $gridView.find('.active').removeClass('active');
    $gridView.addClass('drag');
    $gridView.on('dragenter', function(){
        gDSObj.dropDivId = undefined;
        $gridView.find('.active').removeClass('active');
        $('#backFolderBtn').removeClass('active');
    });

    $grid.find('> .dragWrap').css('display', 'none');
}

function dsDragEnd(event) {
    event.stopPropagation();
    // clearence
    $grid = $(event.target).closest('grid-unit');
    $grid.find('> .dragWrap').css('display', 'block');

    gDSObj.dragDsId = undefined;
    gDSObj.dropDivId = undefined;
    var $gridView = $('#gridView');

    $gridView.removeClass('drag');
    $gridView.off('dragenter');
    $gridView.find('.active').removeClass('active');
    $('#backFolderBtn').removeClass('active');
}

function dsDrop(event) {
    event.stopPropagation();
    var dropDivId = gDSObj.dropDivId;
    var dragDsId = gDSObj.dragDsId
    var $div = $('#' + dropDivId);
    var $target = $div.closest('grid-unit');

    var $grid = $('grid-unit[data-dsId="' + dragDsId + '"]');

    if (dropDivId != undefined) {
        if ($div.hasClass('midDragWrap')) {
            dsDropIn(dragDsId, $target);
        } else if ($div.hasClass('leftTopDragWrap')) {
            dsInsert(dragDsId, $target, true);
        } else {
            dsInsert(dragDsId, $target, false);
        }
    }
}

function dsDragEnter(event) {   
    event.preventDefault();
    event.stopPropagation();
    var $dragWrap = $(event.target);
    // var $grid = $drapWrap.closest('grid-unit');
    var id = $dragWrap.attr('id');
    // back up button
    if (id == 'backFolderBtn') {
        var $bacnFolderBtn = $('#backFolderBtn');
        if ($('#gridView').hasClass('listView') 
                || $bacnFolderBtn.hasClass('disabled')) {
            return;
        }
        $('#backFolderBtn').addClass('active');
    }else if (id != gDSObj.dropDivId) {
        $('grid-unit').removeClass('active');
        $('.dragWrap').removeClass('active');
        if ($dragWrap.hasClass('midDragWrap')) {
            $dragWrap.closest('grid-unit').addClass('active');
        } else {
            $dragWrap.addClass('active');
        }
        gDSObj.dropDivId = id;
    }
}

function allowDSDrop(event) {
    // call the event.preventDefault() method for the ondragover allows a drop
    event.preventDefault();
}

// drop ds into a folder
function dsDropIn(dragDsId, $target) {
    
    var ds = DSObj.getById(dragDsId);

    var targetId = $target.attr("data-dsId");
    if (dragDsId == targetId) {
        return;
    }
    var targetDS = DSObj.getById(targetId);

    var isMoveTo = ds.moveTo(targetDS, -1);

    if (isMoveTo) {
        var $grid = $('grid-unit[data-dsId="' + dragDsId + '"]');
        $grid.attr("data-dsParentId",targetId);
        $target.append($grid);
        DSObj.display();
    }
}

// Insert ds before or after another ds
function dsInsert(dragDsId, $sibling, isBefore) {
    var ds = DSObj.getById(dragDsId);

    var siblingId = $sibling.attr("data-dsId");
    if (dragDsId == siblingId) {
        return;
    }
    var siblingDs = DSObj.getById(siblingId);

    // parent
    var parentId = siblingDs.parentId;
    var parentDs = DSObj.getById(parentId);
    var $parent;
    if (parentId == gDSObj.homeId) {
        $parent = $('#gridView');
    } else {
        $parent = $('grid-unit[data-dsId="' + parentId + '"]');
    }

    var insertIndex = parentDs.eles.indexOf(siblingDs);
    var isMoveTo;
    if (isBefore) {
        isMoveTo = ds.moveTo(parentDs, insertIndex);
    } else {
        isMoveTo = ds.moveTo(parentDs, insertIndex + 1);
    }

    if (isMoveTo) {
        var $grid = $('grid-unit[data-dsId="' + dragDsId + '"]');
        $grid.attr("data-dsParentId", parentId);
        if (isBefore) {
            $sibling.before($grid);
        } else {
            $sibling.after($grid);
        }
        DSObj.display();
    }
}

function dsDropBack(event) {
    event.preventDefault(); // default is open as link on drop
    event.stopPropagation();

    if ($('#gridView').hasClass('listView') || 
            $('#backFolderBtn').hasClass('disabled')) {
        return;
    }
    var id = gDSObj.dragDsId;
    var ds = DSObj.getById(id);
    // target
    var grandPaId = DSObj.getById(ds.parentId).parentId;
    var grandPaDs = DSObj.getById(grandPaId);
    var $grandPa;
    if (grandPaId == gDSObj.homeId) {
        $grandPa = $('#gridView');
    } else {
        $grandPa = $('grid-unit[data-dsId="' + grandPaId + '"]');
    }

    var isMoveTo = ds.moveTo(grandPaDs, -1);

    if (isMoveTo) {
        var $grid = $('grid-unit[data-dsId="' + id + '"]');
        $grid.attr("data-dsParentId", grandPaId);
        $grandPa.append($grid);
        //         .trigger('click');  // focus on the folder
        // gDSObj.curId = grandPaId;
        // changeDSDir(grandPaId);
        DSObj.display();
    }
}
