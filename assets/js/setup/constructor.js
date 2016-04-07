// version.js
function VersionInfo(options) {
    options = options || {};
    this.version = options.version;
    this.SHA = options.SHA;

    return this;
}

// authentication.js
function AuthInfo(options) {
    options = options || {};
    this.idCount = options.idCount;
    this.hashTag = options.hashTag;

    return this;
}

// global MouseEvents
// useful to keep track of mousedown so when a blur happens, we know what
// element was clicked on to cause the blur
function MouseEvents() {
    var lastMouseDownTarget = $(document);
    var lastClickTarget = lastMouseDownTarget;
    var lastTime = (new Date()).getTime();

    this.setMouseDownTarget = function($element) {
        lastMouseDownTarget = $element;
        lastTime = (new Date()).getTime();
    };

    this.setClickTarget = function($element) {
        lastClickTarget = $element;
    };

    this.getLastMouseDownTarget = function() {
        return lastMouseDownTarget;
    };

    this.getLastClickTarget = function() {
        return lastClickTarget;
    };

    this.getLastMouseDownTime = function() {
        return lastTime;
    };
}

function SQLConstructor(args) {
    this.title = args.title;
    this.options = args.options || {};

    if (args.cli != null) {
        this.cli = args.cli;
    }

    if (args.error != null) {
        this.sqlType = SQLType.Error;
        this.error = args.error;
    }

    this.timestamp = args.timestamp || new Date().getTime();

    return this;
}

SQLConstructor.prototype = {
    "isError": function() {
        if (this.sqlType === SQLType.Error) {
            return true;
        } else {
            return false;
        }
    },

    "getOperation": function() {
        return this.options.operation;
    },

    "getTitle": function() {
        return this.title;
    },

    "getOptions": function() {
        return this.options;
    }
};
// gTables

// Constructor for table meata data
function TableMeta(options) {
    options = options || {};

    if (!options.tableName || !options.tableId) {
        console.error("error table meta!");
    }

    // xx start temp fix conversion used to apply table status
    if (options.hasOwnProperty('active')) {
        if (options.active) {
            options.status = TableType.Active;
        } else if (options.isOrphaned) {
            options.status = TableType.Orphan;
        } else {
            options.status = TableType.Archived;
        }
    } else if (options.hasOwnProperty('isOrphaned')) {
        if (options.isOrphaned) {
            options.status = TableType.Orphan;
        } else {
            options.status = TableType.Archived;
        }
    }
    // end temp fix

    this.tableName = options.tableName;
    this.tableId = options.tableId;
    this.isLocked = options.isLocked;
    this.isSortedArray = options.isSortedArray || false;
    this.status = options.status || TableType.Active;
    // reference enum TableType for possible types

    this.timeStamp = options.timeStamp || xcHelper.getTimeInMS();

    if (options.tableCols != null) {
        this.tableCols = [];
        var oldCols = options.tableCols;
        for (var i = 0, len = oldCols.length; i < len; i++) {
            var progCol = new ProgCol(oldCols[i]);
            this.tableCols[i] = progCol;
        }
    } else {
        this.tableCols = null;
    }

    this.bookmarks = options.bookmarks || [];
    this.rowHeights = options.rowHeights || {}; // a map

    this.currentRowNumber = -1;
    this.resultSetId = -1;
    this.keyName = "";
    this.resultSetCount = -1;
    this.numPages = -1;

    return this;
}

TableMeta.prototype = {
    updateFromResultset: function(resultSet) {
        this.resultSetId = resultSet.resultSetId;
        this.resultSetCount = resultSet.numEntries;
        this.resultSetMax = resultSet.numEntries;
        this.numPages = Math.ceil(this.resultSetCount / gNumEntriesPerPage);
        this.keyName = resultSet.keyAttrHeader.name;
        return this;
    },

    freeResultset: function() {
        var deferred = jQuery.Deferred();
        var self = this;

        if (self.resultSetId === -1) {
            deferred.resolve();
        } else {
            XcalarSetFree(self.resultSetId)
            .then(function() {
                self.resultSetId = -1;
                deferred.resolve();
            })
            .fail(function(error) {
                console.error("Free Result Fails!", error);
                deferred.reject(error);
            });
        }

        return deferred.promise();
    },

    getColDirection: function(backColName) {
        var deferred = jQuery.Deferred();
        var tableName = this.tableName;

        XcalarGetDag(tableName)
        .then(function(nodeArray) {
            if (XcalarApisTStr[nodeArray.node[0].api] === "XcalarApiIndex") {
                var indexInput = nodeArray.node[0].input.indexInput;
                if (indexInput.keyName === backColName) {
                    deferred.resolve(indexInput.ordering);
                    return;
                }
            }

            deferred.resolve(XcalarOrderingT.XcalarOrderingUnordered);
        })
        .fail(deferred.reject);

        return deferred.promise();
    },

    beInActive: function() {
        this.status = TableType.InActive;
        return this;
    },

    beArchived: function() {
        this.status = TableType.Archived;
        return this;
    },

    beActive: function() {
        this.status = TableType.Active;
        return this;
    },

    beOrphaned: function() {
        this.status = TableType.Orphan;
        return this;
    },

    beTrashed: function() {
        this.status = TableType.Trash;
        return this;
    },

    updateTimeStamp: function() {
        this.timeStamp = xcHelper.getTimeInMS();
        return this;
    },

    hasBackCol: function(backColName) {
        // this check if table has the backCol,
        // it does not check frontCol
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isNewCol || progCol.isDATACol()) {
                // skip new column and DATA column
                continue;
            } else if (progCol.getBackColName() === backColName) {
                return true;
            }
        }

        return false;
    },

    getBackColNum: function(backColName) {
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.getBackColName() === backColName) {
                return i;
            }
        }
        return -1;
    },

    hasCol: function(colName) {
        // check both fronName and backName
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (!progCol.isNewCol && progCol.getBackColName() === colName) {
                // check backColName
                return true;
            }

            if (progCol.name === colName) {
                // check fronColName
                return true;
            }
        }

        return false;
    },

    getProgCol: function(backColName) {
        // get progCol from backColName
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isNewCol || progCol.isDATACol()) {
                // skip new column and DATA column
                continue;
            } else if (progCol.getBackColName() === backColName) {
                return progCol;
            }
        }

        return null;
    }
};

function ProgCol(options) {
    options = options || {};

    if (options.isNewCol == null) {
        this.isNewCol = true;
    } else {
        this.isNewCol = options.isNewCol;
    }

    this.backName = options.backName || "";
    this.name = options.name || "";
    this.type = options.type || "undefined";
    this.func = new ColFunc(options.func);
    this.width = options.width || 0;
    this.sizeToHeader = options.sizeToHeader || false;
    this.userStr = options.userStr || "";
    this.textAlign = options.textAlign || "Center";
    this.decimals = options.decimals || -1;
    this.format = options.format || null;
    this.isSortedArray = options.isSortedArray || false;
    this.isHidden = options.isHidden || false;

    return this;
}

function ColFunc(options) {
    options = options || {};
    this.name = options.name;
    this.args = options.args || [];

    return this;
}

ProgCol.prototype = {
    "isDATACol": function() {
        if (this.name === "DATA" && this.func.name === "raw") {
            return true;
        } else {
            return false;
        }
    },

    "getFronColName": function() {
        return this.name;
    },

    "getBackColName": function() {
        return this.backName;
    },

    "getType": function() {
        return this.type;
    },

    "isNumberCol": function() {
        return (this.type === "integer" || this.type === "float");
    }
};

// store.js
function getMETAKeys() {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    return {
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
}

function METAConstructor(METAKeys) {
    METAKeys = METAKeys || {};
    // basic thing to store
    this[METAKeys.TI] = savegTables();
    this[METAKeys.WS] = WSManager.getAllMeta();
    this[METAKeys.CLI] = CLIBox.getCli(); // string
    this[METAKeys.CART] = DataCart.getCarts();
    this[METAKeys.STATS] = Profile.getCache();
    this[METAKeys.DFG] = DFG.getAllGroups(); // a set of DFGObj
    this[METAKeys.SCHE] = Scheduler.getAllSchedules(); // list of SchedObj

    return this;

    function savegTables() {
        var persistTables = xcHelper.deepCopy(gTables);

        for (var tableId in persistTables) {
            var table = persistTables[tableId];
            delete table.currentRowNumber;
            delete table.resultSetId;
            delete table.keyName;
            delete table.resultSetCount;
            delete table.numPages;
        }

        return persistTables;
    }
}

// userSettings.js
function getUserInfoKeys() {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    return {
        "DS"  : "gDSObj",
        "PREF": "userpreference"
    };
}

function UserPref(options) {
    options = options || {};
    this.datasetListView = options.datasetListView || false;
    this.browserListView = options.browserListView || false;
    this.lastRightSideBar = options.lastRightSideBar || null;
    this.activeWorksheet = options.activeWorksheet || null;

    return this;
}

UserPref.prototype = {
    'update': function() {
        this.datasetListView = $('#dataViewBtn').hasClass('listView');
        this.browserListView = $('#fileBrowserGridView').hasClass('listView');
        this.lastRightSideBar = $('#rightSideBar .rightBarSection.lastOpen').attr('id');
        this.activeWorksheet = WSManager.getActiveWS();

        return this;
    }
};

function UserInfoConstructor(UserInfoKeys, options) {
    options = options || {};
    this[UserInfoKeys.DS] = options.DS || null;
    this[UserInfoKeys.PREF] = options.PREF || null;

    return this;
}

// datastore.js
function Cart(options) {
    options = options || {};
    this.dsId = options.dsId;
    this.tableName = options.tableName;
    // items will be restored in DataCart.restore
    this.items = [];

    return this;
}

Cart.prototype = {
    "getId": function() {
        return this.dsId;
    },

    "getDSName": function() {
        var ds = DS.getDSObj(this.dsId);
        return ds.getFullName();
    },

    "getTableName": function() {
        return this.tableName;
    },

    "updateTableName": function(tableName) {
        this.tableName = tableName;
    },

    "addItem": function(options) {
        var cartItem = new CartItem(options);
        this.items.push(cartItem);
    },

    "removeItem": function(colNum) {
        var items = this.items;
        for (var i = 0, len = items.length; i < len; i++) {
            if (items[i].colNum === colNum) {
                items.splice(i, 1);
                break;
            }
        }
    },

    "emptyItem": function() {
        this.items = [];
    }
};

// inner part of DataCar
function CartItem(options) {
    options = options || {};
    this.colNum = options.colNum;
    this.value = options.value;

    return this;
}

// worksheet.js
function WSMETA(options) {
    options = options || {};
    this.wsInfos = options.wsInfos;
    this.wsOrder = options.wsOrder;
    this.hiddenWS = options.hiddenWS;
    this.noSheetTables = options.noSheetTables;
    this.aggInfos = options.aggInfos;

    return this;
}

// workbook.js
function WKBK(options) {
    options = options || {};

    if (options.name == null || options.id == null) {
        throw "Invalid workbook info!";
    }

    this.name = options.name;
    this.id = options.id;
    this.noMeta = options.noMeta;
    this.srcUser = options.srcUser;
    this.curUser = options.curUser;
    this.created = options.created;
    this.modified = options.modified;

    return this;
}

WKBK.prototype = {
    "update": function() {
        this.modified = xcHelper.getTimeInMS();  // store modified data
    }
};

function WKBKSet() {
    this.set = {};

    return this;
}

WKBKSet.prototype = {
    "get": function(wkbkId) {
        return this.set[wkbkId];
    },

    "getWithStringify": function() {
        return JSON.stringify(this.set);
    },

    "getAll": function() {
        return this.set;
    },

    "put": function(wkbkId, wkbk) {
        this.set[wkbkId] = wkbk;
    },

    "has": function(wkbkId) {
        return this.set.hasOwnProperty(wkbkId);
    }
};

// profileModal.js
function ProfileInfo(options) {
    options = options || {};
    this.modalId = options.modalId;
    this.colName = options.colName;
    this.type = options.type;

    this.aggInfo = new ProfileAggInfo(options.aggInfo);
    this.statsInfo = new ProfileStatsInfo(options.statsInfo);
    this.groupByInfo = new ProfileGroupbyInfo(options.groupByInfo);

    return this;
}

ProfileInfo.prototype = {
    "addBucket": function(bucketNum, options) {
        this.groupByInfo.buckets[bucketNum] = new ProfileBucketInfo(options);
    }
};

function ProfileAggInfo(options) {
    options = options || {};

    if (options.max != null) {
        this.max = options.max;
    }

    if (options.min != null) {
        this.min = options.min;
    }

    if (options.count != null) {
        this.count = options.count;
    }

    if (options.sum != null) {
        this.sum = options.sum;
    }

    if (options.average != null) {
        this.average = options.average;
    }

    return this;
}

function ProfileStatsInfo(options) {
    options = options || {};

    if (options.unsorted) {
        this.unsorted = options.unsorted;
    }

    if (options.zeroQuartile != null) {
        this.zeroQuartile = options.zeroQuartile;
    }

    if (options.lowerQuartile != null) {
        this.lowerQuartile = options.lowerQuartile;
    }

    if (options.median != null) {
        this.median = options.median;
    }

    if (options.upperQuartile != null) {
        this.upperQuartile = options.upperQuartile;
    }

    if (options.fullQuartile != null) {
        this.fullQuartile = options.fullQuartile;
    }

    return this;
}

function ProfileGroupbyInfo(options) {
    options = options || {};
    this.isComplete = options.isComplete || false;
    this.nullCount = options.nullCount || 0;
    this.buckets = {};

    var buckets = options.buckets || {};
    for (var bucketNum in buckets) {
        var bucketInfo = new ProfileBucketInfo(buckets[bucketNum]);
        this.buckets[bucketNum] = bucketInfo;
    }

    return this;
}

function ProfileBucketInfo(options) {
    options = options || {};
    this.bucketSize = options.bucketSize;
    this.table = options.table;
    this.ascTable = options.ascTable || null;
    this.descTable = options.descTable || null;
    this.colName = options.colName;
    this.max = options.max;
    this.sum = options.sum;

    return this;
}

/*** Start of DSObj ***/
/* datastore.js */
/**
 * @property {number} id A unique dsObj id, for reference use
 * @property {string} name The dataset/folder's name
 * @property {string} user The user that creates it
 * @property {string} fullName for ds, user.name, for folder, equal to name
 * @property {number} parentId The parent folder's id
 * @property {boolean} isFolder Whether it's folder or dataset
 * @property {boolean} uneditable Whether it's uneditable or not
 * @property {DSObj[]} [eles], An Array of child DSObjs
 * @property {number} totalChildren The total nummber of child
 * @property {string} format foramt of ds, ie. CSV, JSON, etc..
 * @property {string} mDate modify date
 * @property {string} path ds url
 * @property {string} fileSize size of ds
 * @property {number} numEntries number of ds records
 */
function DSObj(options) {
    options = options || {};
    this.id = options.id;
    this.name = options.name;
    this.user = options.user;
    this.fullName = options.fullName;
    this.parentId = options.parentId;
    this.isFolder = options.isFolder;
    this.uneditable = options.uneditable;
    this.mDate = options.mDate;

    // initially, dataset count itself as one child,
    // folder has no child;
    if (this.isFolder) {
        this.eles = [];
        this.totalChildren = 0;
    } else {
        this.totalChildren = 1;
        this.format = options.format;
        this.path = options.path;
        this.fileSize = options.fileSize;
        this.numEntries = options.numEntries;
    }

    if (this.parentId !== DSObjTerm.homeParentId) {
        var parent = DS.getDSObj(this.parentId);
        parent.eles.push(this);
        // update totalChildren of all ancestors
        this.updateDSCount();
    }

    return (this);
}

DSObj.prototype = {
    getId: function() {
        return this.id;
    },

    getParentId: function() {
        return this.parentId;
    },

    getName: function() {
        return this.name;
    },

    getUser: function() {
        return this.user;
    },

    getFullName: function() {
        return this.fullName;
    },

    getFormat: function() {
        return this.format;
    },

    getPath: function() {
        return this.path;
    },

    getNumEntries: function() {
        return this.numEntries;
    },

    getModifyDate: function() {
        // Get modify date, if not exist, fetch from backend and update it
        var deferred = jQuery.Deferred();
        var self = this;

        if (self.mDate != null) {
            deferred.resolve(self.mDate);
            return (deferred.promise());
        }

        var loadURL = self.path;
        var slashIndex = loadURL.lastIndexOf('/');
        var curFileName = null;

        if (slashIndex === loadURL.length - 1) {
            // when last char is '/', then the url is a folder
            // should remove the last '/' first
            loadURL = loadURL.substr(0, slashIndex);
            slashIndex = loadURL.lastIndexOf('/');
        }

        curFileName = loadURL.substr(slashIndex + 1);
        loadURL = loadURL.substr(0, slashIndex + 1);

        XcalarListFiles(loadURL)
        .then(function(res) {
            var numFiles = res.numFiles;
            var files = res.files;
            for (var i = 0; i < numFiles; i++) {
                var file = files[i];
                if (file.name === curFileName) {
                    self.mDate = xcHelper.timeStampTranslater(file.attr.mtime);
                    if (self.mDate == null) {
                        self.mDate = "N/A";
                    }

                    deferred.resolve(self.mDate);
                    return;
                }
            }

            console.error("Cannot find the file!");
            deferred.resolve("N/A");
        })
        .fail(function(error) {
            console.error("List file fails", error);
            deferred.resolve("N/A");
        });

        return (deferred.promise());
    },

    getFileSize: function() {
        // Get file size, if not exist, fetch from backend and update it
        var deferred = jQuery.Deferred();
        var self = this;

        if (self.fileSize != null) {
            deferred.resolve(self.fileSize);
            return (deferred.promise());
        }


        var loadURL = self.path;
        var slashIndex = loadURL.lastIndexOf('/');
        var dotIndex = loadURL.lastIndexOf('.');
        var curFileName = null;

        if (dotIndex > slashIndex) {
            curFileName = loadURL.substr(slashIndex + 1);
            loadURL = loadURL.substr(0, slashIndex + 1);
        }

        XcalarListFiles(loadURL)
        .then(function(files) {
            if (files.numFiles === 1 && files.files[0].name === "") {
                // this is a special case that loadURL=file:///a/b
                // and b is a file, not a folder
                slashIndex = loadURL.lastIndexOf('/');
                curFileName = loadURL.substr(slashIndex + 1);
                loadURL = loadURL.substr(0, slashIndex + 1);
                return XcalarListFiles(loadURL);
            } else {
                return promiseWrapper(files);
            }
        })
        .then(function(files) {
            self.fileSize = getFileSizeHelper(files, curFileName);
            deferred.resolve(self.fileSize);
        })
        .fail(function(error) {
            console.error("List file fails", error);
            self.fileSize = null;
            deferred.resolve(null);
        });

        return (deferred.promise());

        function getFileSizeHelper(files, fileName) {
            var size = 'N/A';
            var numFiles = 0;
            var isSingleFile = (fileName != null);
            var fileLists = files.files;

            for (var i = 0, len = files.numFiles; i < len; i++) {
                var file = fileLists[i];
                if (!file.attr.isDirectory) {
                    numFiles++;
                    if (numFiles > 1 && !isSingleFile) {
                        size = 'N/A';
                        break;
                    } else {
                        size = xcHelper.sizeTranslater(file.attr.size);
                        if (isSingleFile && fileName === file.name) {
                            break;
                        }
                    }
                }
            }

            return size;
        }
    },

    beFolder: function() {
        return this.isFolder;
    },

    beFolderWithDS: function() {
        return this.isFolder && this.eles.length > 0;
    },

    isEditable: function() {
        return !this.uneditable;
    },

    setNumEntries: function(num) {
        this.numEntries = num;
    },
    // rename of dsObj
    rename: function(newName) {
        newName = newName.trim();

        if (newName === "") {
            // not allow empty name
            return (this);
        }

        var self = this;
        var parent = DS.getDSObj(self.parentId);
        var error = xcHelper.replaceMsg(ErrWRepTStr.FolderConflict, {
            "name": newName
        });
        //check name confliction
        var isValid = xcHelper.validate([
            {
                "$selector": DS.getGrid(self.id),
                "text"     : ErrTStr.NoSpecialChar,
                "check"    : function() {
                    return /[^a-zA-Z\(\)\d\s:]/.test(newName);
                }
            },
            {
                "$selector": DS.getGrid(self.id),
                "text"     : error,
                "check"    : function() {
                    return (parent.checkNameConflict(self.id, newName,
                                                     self.isFolder));
                }
            },
            {
                "$selector": DS.getGrid(self.id),
                "text"     : ErrTStr.PreservedName,
                "check"    : function() {
                    return newName === DSObjTerm.OhterUserFolder;
                }
            }
        ]);

        if (isValid) {
            this.name = newName;
            this.fullName = newName;
            return true;
        } else {
            return false;
        }
    },

    // Remove dsObj from parent
    removeFromParent: function() {
        var parent = DS.getDSObj(this.parentId);
        var index  = parent.eles.indexOf(this);

        parent.eles.splice(index, 1);    // remove from parent
        // update totalChildren count of all ancestors
        this.updateDSCount(true);
        this.parentId = -1;

        return (this);
    },

    // Move dsObj to new parent (insert or append when index < 0)
    // return true/false: Whether move succeed
    moveTo: function(newParent, index) {
        // not append to itself
        if (this.id === newParent.id) {
            return false;
        }

        // not append to same parent again, but can insert
        if (index < 0 && this.parentId === newParent.id) {
            return false;
        }

        // not append or insert to its own child
        var ele = newParent;
        while (ele != null && ele !== this) {
            ele = DS.getDSObj(ele.parentId);
        }
        if (ele === this) {
            return false;
        }

        var $grid = DS.getGrid(this.id);
        // check name conflict
        if (newParent.checkNameConflict(this.id, this.name, this.isFolder)) {
            StatusBox.show(ErrTStr.MVFolderConflict, $grid);
            return false;
        }

        this.removeFromParent();
        this.parentId = newParent.id;

        if ((index != null) && (index >= 0)) {
            newParent.eles.splice(index, 0, this);  // insert to parent
        } else {
            newParent.eles.push(this);  // append to parent
        }

        $grid.attr('data-dsParentId', newParent.id);

        // update totalChildren of all ancestors
        this.updateDSCount();
        return true;
    },

    // Check if a dsObj's name has conflict in current folder
    checkNameConflict: function(id, name, isFolder) {
        // now only support check of folder

        // when this is not a folder
        if (!this.isFolder) {
            console.error("Error call, only folder can call this function");
            return false;
        }

        var eles = this.eles;

        for (var i = 0; i < eles.length; i++) {
            var dsObj = eles[i];

            if (dsObj.isFolder &&
                dsObj.name === name &&
                dsObj.id !== id &&
                dsObj.isFolder === isFolder) {
                return true;
            }
        }

        return false;
    },

    // update ancestors totlal children
    updateDSCount: function(isMinus) {
        var parent = DS.getDSObj(this.parentId);

        while (parent != null) {
            if (isMinus) {
                parent.totalChildren -= this.totalChildren;
            } else {
                parent.totalChildren += this.totalChildren;
            }
            DS.getGrid(parent.id).find("> div.dsCount")
                                    .text(parent.totalChildren);
            parent = DS.getDSObj(parent.parentId);
        }
    }
};
/* End of DSObj */

/* Start of DFGObj */
/* dataflow.js */
function DFGObj(name, options) {
    options = options || {};
    this.name = name;
    this.schedules = options.schedules || [];
    this.parameters = options.parameters || [];
    this.paramMap = options.paramMap || {}; // a map
    this.nodeIds = options.nodeIds || {}; // a map

    this.dataFlows = [];
    this.retinaNodes = {};

    var dataFlows = options.dataFlows || [];
    for (var i = 0, len = dataFlows.length; i < len; i++) {
        this.addDataFlow(dataFlows[i]);
    }

    if (options.retinaNodes != null) {
        for (var nodeId in options.retinaNodes) {
            var retinaNode = options.retinaNodes[nodeId];
            this.retinaNodes[nodeId] = new RetinaNode(retinaNode);
        }
    }

    return this;
}

// a inner part of DFGObj
function RetinaNode(options) {
    options = options || {};
    this.paramType = options.paramType;
    this.paramValue = options.paramValue;
    this.paramQuery = options.paramQuery;

    return this;
}

// a inner part of DFGObj
function DFGFlow(options) {
    options = options || {};
    this.name = options.name;
    this.columns = options.columns;
    this.canvasInfo = new CanvasInfo(options.canvasInfo);

    return this;
}

// a inner part of DFGFlow
function CanvasInfo(options) {
    options = options || {};
    this.height = options.height;
    this.width = options.width;

    this.tables = [];
    this.operations = [];

    var tables = options.tables || [];
    for (var i = 0, len = tables.length; i < len; i++) {
        var canvasTableInfo = new CanvasTableInfo(tables[i]);
        this.tables.push(canvasTableInfo);
    }

    var operations = options.operations || [];
    for (var i = 0, len = operations.length; i < len; i++) {
        var canvasOpsInfo = new CanvasOpsInfo(operations[i]);
        this.operations.push(canvasOpsInfo);
    }

    return this;
}

// a inner part of CanvasInfo
function CanvasTableInfo(options) {
    options = options || {};
    this.index = options.index;
    this.children = options.children;
    this.type = options.type;
    this.left = options.left;
    this.top = options.top;
    this.title = options.title;
    this.table = options.table;
    this.url = options.url;

    return this;
}

function CanvasOpsInfo(options) {
    options = options || {};

    this.tooltip = options.tooltip;
    this.type = options.type;
    this.column = options.column;
    this.info = options.info;
    this.table = options.table;
    this.parents = options.parents;
    this.left = options.left;
    this.top = options.top;
    this.classes = options.classes;

    return this;
}

DFGObj.prototype = {
    "addDataFlow": function(options) {
        var dfgFlow = new DFGFlow(options);
        this.dataFlows.push(dfgFlow);
    },

    "addRetinaNode": function(dagNodeId, paramInfo) {
        this.retinaNodes[dagNodeId] = new RetinaNode(paramInfo);
        // var numNodes = this.nodeIds.length;
        var tableName;
        for (var name in this.nodeIds) {
            if (this.nodeIds[name] === dagNodeId) {
                tableName = name;
                break;
            }
        }

        $('#schedulerPanel').find('[data-table="' + tableName + '"]')
                            .addClass('hasParam');
    },

    "getRetinaNode": function(dagNodeId) {
        return (this.retinaNodes[dagNodeId]);
    },

    "addParameter": function(name, val) {
        xcHelper.assert(!this.paramMap.hasOwnProperty(name), "Invalid name");

        this.parameters.push(name);
        this.paramMap[name] = val;
    },

    "getParameter": function(paramName) {
        return (this.paramMap[paramName]);
    },

    "getAllParameters": function() {
        var res = [];
        var paramMap = this.paramMap;
        for (var paramName in paramMap) {
            var param = new XcalarApiParameterT();
            param.parameterName = paramName;
            param.parameterValue = paramMap[paramName];
            res.push(param);
        }

        return (res);
    },

    "updateParameters": function(params) {
        var paramMap = this.paramMap;

        params.forEach(function(param) {
            var name = param.name;
            var val  = param.val;
            xcHelper.assert(paramMap.hasOwnProperty(name), "Invalid name");
            paramMap[name] = val;
        });
    },

    "checkParamInUse": function(paramName) {
        var str = "<" + paramName + ">";
        var retinsNodes = this.retinaNodes;

        for (var dagNodeId in retinsNodes) {
            var dagQuery = retinsNodes[dagNodeId].paramQuery;
            for (var i = 0, len = dagQuery.length; i < len; i++) {
                if (dagQuery[i].indexOf(str) >= 0) {
                    return (true);
                }
            }
        }

        return (false);
    },

    "removeParameter": function(name) {
        var index = this.parameters.indexOf(name);

        xcHelper.assert((index >= 0), "Invalid name");

        this.parameters.splice(index, 1);
        delete this.paramMap[name];
    },

    "addSchedule": function(scheduleName) {
        this.schedules.push(scheduleName);
    },

    "hasSchedule": function(scheduleName) {
        return (this.schedules.indexOf(scheduleName) >= 0);
    },

    "removeSchedule": function(scheduleName) {
        var index = this.schedules.indexOf(scheduleName);

        if (index < 0) {
            console.error("error schedule name", scheduleName);
        } else {
            this.schedules.splice(index, 1);
        }
    },

    "updateSchedule": function() {
        var promises = [];
        var dfgName = this.name;
        this.schedules.forEach(function(scheduleName) {
            promises.push(Scheduler.updateDFG.bind(this, scheduleName, dfgName));
        });

        return (chain(promises));
    }
};
/* End of SchedObj */

/* Start of Schedule */
/* schedule.js */
function SchedObj(options) {
    options = options || {};
    this.name = options.name;
    this.startTime = options.startTime;
    this.dateText = options.dateText;
    this.timeText = options.timeText;
    this.repeat = options.repeat;
    this.freq = options.freq;
    this.modified = options.modified;
    this.created = options.modified;
    this.recur = options.recur;
    this.DFGs = [];

    var DFGs = options.DFGs || [];
    for (var i = 0, len = DFGs.length; i < len; i++) {
        var dfgInfo = new SchedDFGInfo(DFGs[i]);
        this.DFGs.push(dfgInfo);
    }

    return this;
}

// inner meta for SchedObj
function SchedDFGInfo(options) {
    options = options || {};
    this.name = options.name;
    this.backSchedName = options.backSchedName;
    this.initialTime = options.initialTime;
    this.status = this.status || "normal";

    return this;
}

SchedObj.prototype = {
    "update": function(options) {
        options = options || {};
        this.startTime = options.startTime || this.startTime;
        this.dateText = options.dateText || this.dateText;
        this.timeText = options.timeText || this.timeText;
        this.repeat = options.repeat || this.repeat;
        this.freq = options.freq || this.freq;
        this.modified = options.modified || this.modified;
        this.recur = options.recur || this.recur;
        // not update name, created and DFGs
    },

    "getDFG": function(dfgName) {
        var dfgs = this.DFGs;
        for (var i = 0, len = dfgs.length; i < len; i++) {
            if (dfgs[i].name === dfgName) {
                return dfgs[i];
            }
        }

        return null;
    },

    "addDFG": function(options) {
        var dfgInfo = new SchedDFGInfo(options);
        this.DFGs.push(dfgInfo);
    },

    "updateDFG": function(dfgName, options) {
        var dfgInfo = this.getDFG(dfgName);
        options = options || {};
        dfgInfo.initialTime = options.initialTime || dfgInfo.initialTime;
        dfgInfo.status = options.status || dfgInfo.status;
        dfgInfo.backSchedName = options.backSchedName || dfgInfo.backSchedName;
    },

    "hasDFG": function(dfgName) {
        var dfgs = this.DFGs;
        for (var i = 0, len = dfgs.length; i < len; i++) {
            if (dfgs[i].name === dfgName) {
                return true;
            }
        }

        return false;
    },

    "removeDFG": function(dfgName) {
        var index = -1;
        var dfgs = this.DFGs;
        for (var i = 0, len = dfgs.length; i < len; i++) {
            if (dfgs[i].name === dfgName) {
                index = i;
                break;
            }
        }

        if (index >= 0) {
            this.DFGs.splice(index, 1);
        } else {
            console.error("error dfgName", dfgName);
        }
    }
};
/* End of SchedObj */

/* Corrector */
Corrector = function(words) {
    // traing texts
    // words = ["pull", "sort", "join", "filter", "aggreagte", "map"];
    var self = this;
    self.modelMap = {};
    self.model = transformAndTrain(words);

    return (self);
    // convert words to lowercase and train the word
    function transformAndTrain(features) {
        var res = {};
        var word;

        for (var i = 0, len = features.length; i < len; i++) {
            word = features[i].toLowerCase();
            if (word in res) {
                res[word] += 1;
            } else {
                res[word] = 2; // start with 2
                self.modelMap[word] = features[i];
            }
        }
        return (res);
    }
};

Corrector.prototype = {
    correct: function(word, isEdits2) {
        word = word.toLowerCase();
        var model = this.model;

        var edits1Res = edits1(word);
        var candidate;

        if (isEdits2) {
            candidate = known({word: true}) || known(edits1Res) ||
                        knownEdits2(edits1Res) || {word: true};
        } else {
            candidate = known({word: true}) || known(edits1Res) || {word: true};
        }

        var max = 0;
        var result;

        for (var key in candidate) {
            var count = getWordCount(key);

            if (count > max) {
                max = count;
                result = key;
            }
        }

        return (result);

        function getWordCount(w) {
            // smooth for no-exist word, model[word_not_here] = 1
            return (model[w] || 1);
        }

        function known(words) {
            var res = {};

            for (var w in words) {
                if (w in model) {
                    res[w] = true;
                }
            }

            return ($.isEmptyObject(res) ? null : res);
        }

        // edit distabnce of word;
        function edits1(w) {
            var splits = {};
            var part1;
            var part2;
            var wrongWord;

            for (var i = 0, len = w.length; i <= len; i++) {
                part1 = w.slice(0, i);
                part2 = w.slice(i, len);
                splits[part1] = part2;
            }

            var deletes    = {};
            var transposes = {};
            var replaces   = {};
            var inserts    = {};
            var alphabets  = "abcdefghijklmnopqrstuvwxyz".split("");

            for (part1 in splits) {
                part2 = splits[part1];

                if (part2) {
                    wrongWord = part1 + part2.substring(1);
                    deletes[wrongWord] = true;
                }

                if (part2.length > 1) {
                    wrongWord = part1 + part2.charAt(1) + part2.charAt(0) +
                                part2.substring(2);
                    transposes[wrongWord] = true;
                }

                for (var i = 0, len = alphabets.length; i < len; i++) {
                    if (part2) {
                        wrongWord = part1 + alphabets[i] + part2.substring(1);
                        replaces[wrongWord] = true;
                    }

                    wrongWord = part1 + alphabets[i] + part2;
                    inserts[wrongWord] = true;
                }
            }

            return $.extend({}, splits, deletes,
                            transposes, replaces, inserts);
        }

        function knownEdits2(e1Sets) {
            var res = {};

            for (var e1 in e1Sets) {
                var e2Sets = edits1(e1);
                for (var e2 in e2Sets) {
                    if (e2 in model) {
                        res[e2] = true;
                    }
                }
            }

            return ($.isEmptyObject() ? null : res);
        }
    },

    suggest: function(word, isEdits2) {
        word = word.toLowerCase();

        var startStrCandidate = [];
        var subStrCandidate   = [];

        for (var w in this.model) {
            if (w.startsWith(word)) {
                startStrCandidate.push(w);
            } else if (w.indexOf(word) > -1) {
                subStrCandidate.push(w);
            }
        }

        if (startStrCandidate.length >= 1) {
            // suggest the only candidate that start with word
            if (startStrCandidate.length === 1) {
                return (this.modelMap[startStrCandidate[0]]);
            }
        } else if (subStrCandidate.length === 1) {
            // no candidate start with word
            // but has only one substring with word
            return (this.modelMap[subStrCandidate[0]]);
        }

        var res = this.correct(word, isEdits2);
        return (this.modelMap[res]);
    }
};
/* End of Corrector */

/* SearchBar */
SearchBar = function($searchArea, options) {
    this.$searchArea = $searchArea;
    this.$searchInput = $searchArea.find('input');
    this.$counter = $searchArea.find('.counter');
    this.$position = this.$counter.find('.position');
    this.$total = this.$counter.find('.total');
    this.$arrows = $searchArea.find('.arrows');
    this.$upArrow = $searchArea.find('.upArrow');
    this.$downArrow = $searchArea.find('.downArrow');
    this.options = options || {};
    this.matchIndex = null;
    this.numMatches = 0;
    this.$matches = [];
    return (this);
};

SearchBar.prototype = {
    setup: function() {
        var searchBar = this;
        var options = searchBar.options || {};
        var $searchInput = searchBar.$searchInput;

        $searchInput.on({
            "keydown": function(event) {
                if (searchBar.numMatches === 0) {
                    return;
                }
                if (event.which === keyCode.Up ||
                    event.which === keyCode.Down ||
                    event.which === keyCode.Enter) {
                    // if ignore value exists in the input, do not search
                    if (options.ignore &&
                        $searchInput.val().trim()
                                    .indexOf(options.ignore) !== -1) {
                        return;
                    }

                    if (event.preventDefault) {
                        event.preventDefault();
                    }
                    var $matches = searchBar.$matches;

                    if (event.which === keyCode.Up) {
                        searchBar.matchIndex--;
                        if (searchBar.matchIndex < 0) {
                            searchBar.matchIndex = searchBar.numMatches - 1;
                        }

                    } else if (event.which === keyCode.Down ||
                               event.which === keyCode.Enter) {
                        searchBar.matchIndex++;
                        if (searchBar.matchIndex >= searchBar.numMatches) {
                            searchBar.matchIndex = 0;
                        }
                    }
                    if (options.removeSelected) {
                        options.removeSelected();
                    }
                    var $selectedMatch = $matches.eq(searchBar.matchIndex);
                    if (options.highlightSelected) {
                        options.highlightSelected($selectedMatch);
                    }
                    $selectedMatch.addClass('selected');
                    searchBar.$position.html(searchBar.matchIndex + 1);
                    if (options.scrollMatchIntoView) {
                        options.scrollMatchIntoView($selectedMatch);
                    }
                }
            }
        });
        searchBar.$arrows.mousedown(function(e) {
            e.preventDefault();
            e.stopPropagation();
        });

        searchBar.$downArrow.click(function() {
            var evt = {which: keyCode.Down, type: 'keydown'};
            $searchInput.trigger(evt);
        });

        searchBar.$upArrow.click(function() {
            var evt = {which: keyCode.Up, type: 'keydown'};
            $searchInput.trigger(evt);
        });
    },
    highlightSelected: function($match) {
        if (this.options.highlightSelected) {
            return (this.options.highlightSelected($match));
        } else {
            return (undefined);
        }
    },
    scrollMatchIntoView: function($match) {
        if (this.options.scrollMatchIntoView) {
            return (this.options.scrollMatchIntoView($match));
        } else {
            return (undefined);
        }
    },
    clearSearch: function(callback) {
        var searchBar = this;
        searchBar.$position.html("");
        searchBar.$total.html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = [];
        searchBar.numMatches = 0;
        if (typeof callback === "function") {
            callback();
        }
    }
};
/* End of SearchBar */

/* Modal Helper */
// an object used for global Modal Actions
ModalHelper = function($modal, options) {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open modal
     * noResize: if set true, will not reszie the modal
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc
     */
    this.$modal = $modal;
    this.options = options || {};
    this.id = $modal.attr("id");

    return (this);
};

ModalHelper.prototype = {
    setup: function(extraOptions) {
        var $modal  = this.$modal;
        var options = $.extend(this.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the modal
        $(".tooltip").hide();
        $(".selectedCell").removeClass("selectedCell");
        FnBar.clear();

        if (!options.noResize) {
            // resize modal
            var winWidth  = $(window).width();
            var winHeight = $(window).height();
            var minWidth  = options.minWidth || 0;
            var minHeight = options.minHeight || 0;
            var width  = $modal.width();
            var height = $modal.height();

            if (width > winWidth - 10) {
                width = Math.max(winWidth - 40, minWidth);
            }

            if (height > winHeight - 10) {
                height = Math.max(winHeight - 40, minHeight);
            }

            $modal.width(width).height(height);
            $modal.css({
                "minHeight": minHeight,
                "minWidth" : minWidth
            });
        }

        // center modal
        if (!options.noCenter) {
            centerPositionElement($modal, {limitTop: true,
                                           maxTop: options.maxTop});
        }

        // Note: to find the visiable btn, must show the modal first
        if (!options.noTabFocus) {
            var eleLists = [
                $modal.find(".btn"),     // buttons
                $modal.find("input")     // input
            ];

            var focusIndex  = 0;
            var $focusables = [];

            // make an array for all focusable element
            eleLists.forEach(function($eles) {
                $eles.each(function() {
                    $focusables.push($(this));
                });
            });

            for (var i = 0, len = $focusables.length; i < len; i++) {
                addFocusEvent($focusables[i], i);
            }

            // focus on the right most button
            if (this.options.focusOnOpen) {
                getEleToFocus();
            }
        }

        $(document).on("keydown.xcModal" + this.id, function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();

                if (!options.noTabFocus) {
                    getEleToFocus();
                }

                return false;
            } else if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                $modal.find(".modalHeader .close").click();
                return false;
            }
        });

        function addFocusEvent($focusable, index) {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcModal", function() {
                var $ele = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            // the current ele is not active, should no by focused
            if (!isActive($focusables[focusIndex])) {
                var start  = focusIndex;
                focusIndex = (focusIndex + 1) % len;

                while (focusIndex !== start &&
                        !isActive($focusables[focusIndex]))
                {
                    focusIndex = (focusIndex + 1) % len;
                }
                // not find any active ele that could be focused
                if (focusIndex === start) {
                    focusIndex = -1;
                }
            }

            if (focusIndex >= 0) {
                $focusables[focusIndex].focus();
            } else {
                focusIndex = 0; // reset
            }
        }

        function focusOn(index) {
            focusIndex = index;
            // go to next index
            focusIndex = (focusIndex + 1) % len;
        }

        function isActive($ele) {
            if ($ele == null) {
                console.error("undefined element!");
                throw "undefined element!";
            }
            return ($ele.is(":visible") && !$ele.is("[disabled]") &&
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable"));
        }
    },

    checkBtnFocus: function() {
        // check if any button is on focus
        return (this.$modal.find(".btn:focus").length > 0);
    },

    submit: function() {
        xcHelper.disableSubmit(this.$modal.find(".confirm"));
    },

    enableSubmit: function() {
        xcHelper.enableSubmit(this.$modal.find(".confirm"));
    },

    clear: function() {
        $(document).off("keydown.xcModal" + this.id);
        this.$modal.find(".focusable").off(".xcModal")
                                  .removeClass("focusable");
        this.enableSubmit();
        $("body").removeClass("no-selection");
    }
};
/* End of ModalHelper */
