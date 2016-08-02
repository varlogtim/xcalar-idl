// version.js
function XcVersion(options) {
    options = options || {};
    this.version = options.version;
    this.SHA = options.SHA;

    return this;
}

// authentication.js
function XcAuth(options) {
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

// sql.js
function XcLog(args) {
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

XcLog.prototype = {
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

    this.tableName = options.tableName;
    this.tableId = options.tableId;
    this.isLocked = options.isLocked || false;
    this.isSortedArray = options.isSortedArray || false;
    this.status = options.status || TableType.Active;
    // reference enum TableType for possible types

    this.timeStamp = options.timeStamp || xcHelper.getCurrentTimeStamp();

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
    getId: function() {
        return this.tableId;
    },

    getName: function() {
        return this.tableName;
    },

    getTimeStamp: function() {
        return this.timeStamp;
    },

    updateTimeStamp: function() {
        this.timeStamp = xcHelper.getCurrentTimeStamp();
        return this;
    },

    lock: function() {
        this.isLocked = true;
    },

    unlock: function() {
        this.isLocked = false;
    },

    hasLock: function() {
        return this.isLocked;
    },

    updateResultset: function() {
        var deferred = jQuery.Deferred();
        var self = this;

        XcalarMakeResultSetFromTable(self.tableName)
        .then(function(resultSet) {
            // Note that this !== self in this scope
            self.resultSetId = resultSet.resultSetId;
            self.resultSetCount = resultSet.numEntries;
            self.resultSetMax = resultSet.numEntries;
            self.numPages = Math.ceil(self.resultSetCount / gNumEntriesPerPage);
            self.keyName = resultSet.keyAttrHeader.name;

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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

    getType: function() {
        return this.status;
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

    "isActive": function() {
        return (this.status === TableType.Active);
    },

    getCol: function(colNum) {
        var tableCols = this.tableCols;
        if (colNum < 1 || colNum > tableCols.length) {
            return null;
        }

        return tableCols[colNum - 1];
    },

    getColNumByBackName: function(backColName) {
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.getBackColName() === backColName) {
                return (i + 1);
            }
        }
        return -1;
    },

    getColByBackName: function(backColName) {
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
    },

    getColByFrontName: function(frontColName) {
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (progCol.name === frontColName) {
                // check fronColName
                return progCol;
            }
        }
        return null;
    },

    hasColWithBackName: function(backColName) {
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
    }
};

function ProgCol(options) {
    options = options || {};

    if (options.isNewCol == null) {
        this.isNewCol = true;
    } else {
        this.isNewCol = options.isNewCol;
    }

    this.name = options.name || "";

    if (options.backName == null) {
        // xx kinda crazy but the backend returns a lot of \ slashes
        // this.backName = xcHelper.escapeColName(this.name.replace(/\./g, "\\."));
        this.backName = this.name;
    } else {
        this.backName = options.backName;
    }

    this.type = options.type || "undefined";
    this.func = new ColFunc(options.func);
    this.width = options.width || 0;
    this.sizeToHeader = options.sizeToHeader || false;
    this.userStr = options.userStr || "";
    this.textAlign = options.textAlign || "Center";

    if (options.decimals == null) {
        this.decimals = -1;
    } else {
        this.decimals = options.decimals;
    }

    this.format = options.format || null;
    this.isSortedArray = options.isSortedArray || false;
    this.isHidden = options.isHidden || false;

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

    "isEmptyCol": function() {
        return this.isNewCol;
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

function ColFunc(options) {
    options = options || {};
    this.name = options.name;
    this.args = options.args || [];

    return this;
}

// store.js
function getMETAKeys() {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    return {
        "TI"   : "TILookup",
        "WS"   : "worksheets",
        "AGGS" : 'aggregates',
        // "CLI"  : "scratchPad",
        "CART" : "datacarts",
        "STATS": "statsCols"
        //"DFG"  : "DFG",
        //"SCHE" : "schedule"
    };
}

function METAConstructor(METAKeys) {
    METAKeys = METAKeys || {};
    // basic thing to store
    this[METAKeys.TI] = savegTables();
    this[METAKeys.WS] = WSManager.getAllMeta();
    this[METAKeys.AGGS] = Aggregates.getAggs();
    // this[METAKeys.CLI] = CLIBox.getCli(); // string
    this[METAKeys.CART] = DSCart.getCarts();
    this[METAKeys.STATS] = Profile.getCache();
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

function getEMetaKeys() {
    return {
        "DFG" : "DFG",
        "SCHE": "schedule"
    };
}

function EMetaConstructor(EMetaKeys) {
    EMetaKeys = EMetaKeys || {};
    this[EMetaKeys.DFG] = DFG.getAllGroups(); // a set of DFGObj
    this[EMetaKeys.SCHE] = Scheduler.getAllSchedules(); // list of SchedObj
    return this;
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

function UserInfoConstructor(UserInfoKeys, options) {
    options = options || {};
    this[UserInfoKeys.DS] = options.DS || null;
    this[UserInfoKeys.PREF] = options.PREF || null;

    return this;
}

function UserPref(options) {
    options = options || {};
    this.datasetListView = options.datasetListView || false;
    this.browserListView = options.browserListView || false;
    this.activeWorksheet = options.activeWorksheet || null;
    this.keepJoinTables = options.keepJoinTables || false;
    this.hideDataCol = options.hideDataCol || false;
    this.memoryLimit = options.memoryLimit || 70;
    this.monitorGraphInterval = options.monitorGraphInterval || 3;
    this.mainTabs = options.mainTabs || {
        monitor   : 'systemButton',
        dataStores: 'inButton',
        scheduler : 'dataflowButton',
        extensions: 'xcExtensionButton'
    };
    this.activeMainTab = options.activeMainTab || "workspaceTab";

    return this;
}

UserPref.prototype = {
    'update': function() {
        this.datasetListView = $('#dataViewBtn').hasClass('listView');
        this.browserListView = $('#fileBrowserGridView').hasClass('listView');
        this.activeWorksheet = WSManager.getActiveWS();
        this.keepJoinTables = $('#joinModal').find('.keepTablesCBWrap')
                                             .find('.checkbox')
                                             .hasClass('checked');
        return this;
    }
};

// datastore.js
function Cart(options) {
    options = options || {};
    this.dsId = options.dsId;
    this.tableName = options.tableName;
    // items will be restored in DSCart.initialize
    this.items = [];

    var items = options.items;
    if (items != null) {
        for (var i = 0, len = items.length; i < len; i++) {
            this.items[i] = new CartItem(items[i]);
        }
    }

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
    this.type = options.type;

    return this;
}

// worksheet.js
function WSMETA(options) {
    options = options || {};
    this.wsInfos = options.wsInfos;
    this.wsOrder = options.wsOrder;
    this.hiddenWS = options.hiddenWS;
    this.noSheetTables = options.noSheetTables;

    return this;
}

// workbook.js
function WKBK(options) {
    options = options || {};

    if (options.name == null || options.id == null) {
        throw "Invalid workbook info!";
    }

    var time = xcHelper.getCurrentTimeStamp();

    this.name = options.name;
    this.id = options.id;
    this.noMeta = options.noMeta;
    this.srcUser = options.srcUser;
    this.curUser = options.curUser;
    this.created = options.created || time;
    this.modified = options.modified || time;

    return this;
}

WKBK.prototype = {
    "update": function() {
        // store modified data
        this.modified = xcHelper.getCurrentTimeStamp();
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
    },

    "delete": function(wkbkId) {
        delete this.set[wkbkId];
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

    if (options.sd != null) {
        this.sd = options.sd;
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
    this.isRecur = options.isRecur || false;
    this.error = options.error || null;

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
        this.resultSetId = options.resultSetId;
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
        // var curFileName = null;

        if (slashIndex === loadURL.length - 1) {
            // when last char is '/', then the url is a folder
            // should remove the last '/' first
            loadURL = loadURL.substr(0, slashIndex);
            slashIndex = loadURL.lastIndexOf('/');
        }

        XcalarListFiles(loadURL, self.isRecur)
        .then(function(res) {
            if (res.numFiles >= 1) { // More than one just take the first
                self.mDate = xcHelper.timeStampTranslater(
                                                       res.files[0].attr.mtime);
                if (self.mDate == null) {
                    self.mDate = "N/A";
                }

                deferred.resolve(self.mDate);
                return;
            } else {
                console.error("Cannot find the file!");
                deferred.resolve("N/A");
            }
        })
        .fail(function(error) {
            console.error("Cannot find file or list file failed", error);
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
        } else if (self.isRecur) {
            self.fileSize = "N/A";
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

        XcalarListFiles(loadURL, self.isRecur)
        .then(function(files) {
            if (files.numFiles === 1 && files.files[0].name === "") {
                // this is a special case that loadURL=nfs:///a/b
                // and b is a file, not a folder
                slashIndex = loadURL.lastIndexOf('/');
                curFileName = loadURL.substr(slashIndex + 1);
                loadURL = loadURL.substr(0, slashIndex + 1);
                return XcalarListFiles(loadURL);
            } else {
                return PromiseHelper.resolve(files);
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
                        size = xcHelper.sizeTranslator(file.attr.size);
                        if (isSingleFile && fileName === file.name) {
                            break;
                        }
                    }
                }
            }

            return size;
        }
    },

    getError: function() {
        return this.error;
    },

    setError: function(error) {
        this.error = error;
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

    makeResultSet: function() {
        var self = this;
        var deferred = jQuery.Deferred();

        self.release()
        .then(function() {
            return XcalarMakeResultSetFromDataset(self.fullName);
        })
        .then(function(result) {
            self.resultSetId = result.resultSetId;
            self.numEntries = result.numEntries;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    },

    fetch: function(rowToGo, rowsToFetch) {
        // rowToGo stats from 0
        var self = this;
        var deferred = jQuery.Deferred();

        makeResultSetHelper()
        .then(function() {
            if (self.numEntries <= 0) {
                return PromiseHelper.resolve(null);
            }
            return XcalarFetchData(self.resultSetId, rowToGo, rowsToFetch,
                                    self.numEntries, []);
        })
        .then(deferred.resolve)
        .fail(function(error) {
            if (error.status === StatusT.StatusInvalidResultSetId) {
                // when old result is invalid
                self.makeResultSet()
                .then(function() {
                    return XcalarFetchData(self.resultSetId, rowToGo, rowsToFetch,
                                self.numEntries, []);
                })
                .then(deferred.resolve)
                .fail(deferred.reject);
            } else {
                deferred.reject(error);
            }
        });

        function makeResultSetHelper() {
            if (self.resultSetId != null) {
                return PromiseHelper.resolve();
            }

            return self.makeResultSet();
        }

        return deferred.promise();
    },

    release: function() {
        var self = this;
        var resultSetId = self.resultSetId;
        if (resultSetId == null) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        XcalarSetFree(resultSetId)
        .then(function() {
            self.resultSetId = null;
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
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
                    return newName === DSObjTerm.OtherUserFolder;
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
    this.expandIcons = [];

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

    var expandIcons = options.expandIcons || [];
    for (var i = 0, len = expandIcons.length; i < len; i++) {
        var canvasExpandInfo = new CanvasExpandInfo(expandIcons[i]);
        this.expandIcons.push(canvasExpandInfo);
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

function CanvasExpandInfo(options) {
    options = options || {};

    this.tooltip = options.tooltip;
    this.left = options.left;
    this.top = options.top;

    return this;
}

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

        return (PromiseHelper.chain(promises));
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
function Corrector(words) {
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
}

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
/*
 * options:
 * ignore: string or number, if ignore value is present in input, searching
 *         will not occur
 * removeSelected: function, callback for removing highlighted text
 * highlightSelected: function, callback for highlighted text
 * scrollMatchIntoView: function, callback for scrolling to a highlighted match
 * arrowsPreventDefault: boolean, if true, preventDefault & stopPropagation will
                         be applied to the search arrows
 * codeMirror: codeMirror object
 * $input: jquery input, will search for 'input' in $searchArea by default
 */

function SearchBar($searchArea, options) {
    this.$searchArea = $searchArea;
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

    if (options.codeMirror) {
        this.$searchInput = options.$input;
        this.codeMirror = options.codeMirror;
    } else {
        this.$searchInput = $searchArea.find('input');
    }



    return this;
}

SearchBar.prototype = {
    setup: function() {
        var searchBar = this;
        var options = searchBar.options || {};
        var $searchInput;
        if (options.codeMirror) {
            $searchInput = searchBar.codeMirror;
        } else {
            $searchInput = searchBar.$searchInput;
        }

        // secondaryEvent is the event passed in by codemirror
        function handleKeyDownEvent(event, secondaryEvent) {
            if (searchBar.numMatches === 0) {
                return;
            }
            var e;
            if (searchBar.codeMirror) {
                e = secondaryEvent;
            } else {
                e = event;
            }

            if (e.which === keyCode.Up ||
                e.which === keyCode.Down ||
                e.which === keyCode.Enter) {
                var val;
                if (searchBar.codeMirror) {
                    val = searchBar.codeMirror.getValue();
                } else {
                    val = $searchInput.val();
                }
                val = val.trim();
                // if ignore value exists in the input, do not search
                if (options.ignore && val.indexOf(options.ignore) !== -1) {
                    return;
                }

                if (e.preventDefault) {
                    e.preventDefault();
                }
                var $matches = searchBar.$matches;

                if (e.which === keyCode.Up) {
                    searchBar.matchIndex--;
                    if (searchBar.matchIndex < 0) {
                        searchBar.matchIndex = searchBar.numMatches - 1;
                    }

                } else if (e.which === keyCode.Down ||
                           e.which === keyCode.Enter) {
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
        // secondaryEvent is the event passed in by codemirror
        $searchInput.on("keydown", function(event, secondaryEvent) {
            handleKeyDownEvent(event, secondaryEvent);
        });

        searchBar.$downArrow.click(function() {
            var evt = {which: keyCode.Down, type: 'keydown'};
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                $searchInput.trigger(evt);
            }

        });

        searchBar.$upArrow.click(function() {
            var evt = {which: keyCode.Up, type: 'keydown'};
            if (searchBar.codeMirror) {
                handleKeyDownEvent(evt, evt);
            } else {
                $searchInput.trigger(evt);
            }
        });

        if (options.arrowsPreventDefault) {
            searchBar.$arrows.mousedown(function(e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }
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
    updateResults: function($matches) {
        var searchBar = this;
        searchBar.$matches = $matches;
        searchBar.numMatches = $matches.length;
        searchBar.$matches.eq(0).addClass('selected');
        var position = Math.min(1, searchBar.numMatches);
        searchBar.matchIndex = position - 1;
        searchBar.$position.text(position);
        searchBar.$total.text("of " + searchBar.numMatches);

    },
    clearSearch: function(callback, options) {
        var searchBar = this;
        searchBar.$position.html("");
        searchBar.$total.html("");
        searchBar.matchIndex = 0;
        searchBar.$matches = [];
        searchBar.numMatches = 0;
        if (!options || !options.keepVal) {
            if (searchBar.codeMirror) {
                searchBar.codeMirror.setValue("");
            } else {
                searchBar.$searchInput.val("");
            }
        }

        if (typeof callback === "function") {
            callback();
        }
    }
};
/* End of SearchBar */

/* Query */
// expects the following options:
// name, fullName, time, type, id, numSteps
function XcQuery(options) {
    options = options || {};
    this.name = options.name;
    this.time = options.time;
    this.elapsedTime = 0;
    this.fullName = options.fullName; // real name for backend
    this.type = options.type;
    this.subQueries = [];
    this.id = options.id;
    this.numSteps = options.numSteps;
    this.currStep = 0;
    this.outputTableName = "";
    this.outputTableState = "";

    if (options.state == null) {
        this.state = QueryStateT.qrNotStarted;
    } else {
        this.state = options.state;
    }
    if (options.cancelable == null) {
        this.cancelable = true;
    } else {
        this.cancelable = options.cancelable;
    }

    return this;
}

XcQuery.prototype = {
    "getName": function() {
        return this.name;
    },

    "getFullName": function() {
        return this.fullName;
    },

    "getId": function() {
        return this.id;
    },

    "getTime": function() {
        return this.time;
    },

    "getElapsedTime": function() {
        return this.elapsedTime;
    },

    "setElapsedTime": function() {
        this.elapsedTime = Date.now() - this.time;
    },

    "getQuery": function() {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        if (this.subQueries.length) {
            var queries = "";
            for (var i = 0; i < this.subQueries.length; i++) {
                queries += this.subQueries[i].query + ";";
            }
            return queries;
        } else {
            return null;
        }
    },

    "getOutputTableName": function() {
        if (this.state === "done") {
            if (!this.subQueries.length) {
                console.warn('no subQueries were added to the mainQuery: ' +
                             this.name);
                return null;
            } else {
                return (this.subQueries[this.subQueries.length - 1].dstTable);
            }
        } else {
            return null;
        }
    },

    "getOutputTableState": function() {
        if (this.state === "done") {
            return this.outputTableState;
        } else {
            return null;
        }
    },

    "addSubQuery": function(subQuery) {
        this.subQueries.push(subQuery);
    },

    "getState": function() {
        return this.state;
    },

    getStateString: function() {
        return QueryStateTStr[this.state];
    },

    "check": function() {
        var self = this;
        var deferred = jQuery.Deferred();
        if (this.type === "xcQuery") {
            XcalarQueryState(self.fullName)
            .then(function(res) {
                // self.state = res.queryState;
                deferred.resolve(res);
            })
            .fail(deferred.reject);
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    },

    "run": function() {
        if (this.state === QueryStateT.qrNotStarted) {
            return XcalarQuery(this.fullName, this.getQuery());
        } else {
            var error = "cannot run query that with state:" +
                        this.getStateString();
            return PromiseHelper.reject({
                "error": error,
                "state": this.state
            });
        }
    },
};

function XcSubQuery(options) {
    options = options || {};
    this.name = options.name;
    this.time = options.time;
    this.query = options.query;
    this.dstTable = options.dstTable;
    this.id = options.id;
    this.index = options.index;
    this.queryName = options.queryName;

    if (options.state == null) {
        this.state = QueryStateT.qrNotStarted;
    } else {
        this.state = options.state;
    }

    return this;
}

XcSubQuery.prototype = {
    "getName": function() {
        return this.name;
    },

    "getId": function() {
        return this.id;
    },

    "getTime": function() {
        return this.time;
    },

    "getQuery": function() {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        return this.query;
    },

    "getState": function() {
        return this.state;
    },

    "setState": function(state) {
        this.state = state;
    },

    getStateString: function() {
        return QueryStateTStr[this.state];
    },

    "check": function() {
        var self = this;
        var deferred = jQuery.Deferred();
        XcalarGetOpStats(self.dstTable)
        .then(function(ret) {
            var stats = ret.opDetails;
            deferred.resolve(parseFloat((100 * (stats.numWorkCompleted /
                                         stats.numWorkTotal)).toFixed(2)));
        })
        .fail(function(error) {
            
        });

        return deferred.promise();
    }
};

/* End of Query */

/* Modal Helper */
// an object used for global Modal Actions
function ModalHelper($modal, options) {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open modal
     * noResize: if set true, will not reszie the modal
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noBackground: if set true, no darkened modal background
     */
    this.$modal = $modal;
    this.options = options || {};
    this.id = $modal.attr("id");

    return this;
}

ModalHelper.prototype = {
    setup: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var $modal = this.$modal;
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
            var centerOptions = options.center || {};
            this.center(centerOptions);
        }

        // Note: to find the visiable btn, must show the modal first
        if (!options.noTabFocus) {
            this.refreshTabbing();
        }

        $(document).on("keydown.xcModal" + this.id, function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                $modal.find(".modalHeader .close").click();
                return false;
            }
        });

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else if (!options.noBackground) {
            var $modalBg = $("#modalBackground");

            if (gMinModeOn) {
                $modalBg.show();
                $modal.show();
                Tips.refresh();
                deferred.resolve();
            } else {
                $modal.fadeIn(180);
                $modalBg.fadeIn(300, function() {
                    Tips.refresh();
                    deferred.resolve();
                });
            }
        } else {
            $modal.show();
            Tips.refresh();
            deferred.resolve();
        }

        return deferred.promise();
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

    clear: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var options = $.extend(this.options, extraOptions) || {};
        var $modal = this.$modal;

        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.find(".focusable").off(".xcModal")
                                  .removeClass("focusable");
        this.enableSubmit();
        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            var $modalBg = $("#modalBackground");
            var fadeOutTime = gMinModeOn ? 0 : 300;
            $modal.hide();
            if (options.noBackground) {
                Tips.refresh();
                if (options.afterClose != null &&
                    options.afterClose instanceof Function) {
                    options.afterClose();
                }
                deferred.resolve();
            } else {
                $modalBg.fadeOut(fadeOutTime, function() {
                    Tips.refresh();
                    if (options.afterClose != null &&
                        options.afterClose instanceof Function) {
                        options.afterClose();
                    }
                    deferred.resolve();
                });
            }
        }

        return deferred.promise();
    },

    center: function(options) {
        /*
         * to position modal in the center of the window
         * options:
         * horizontalOnly: if true, only horizontal cenater
         * verticalQuartile: if true, vertical top will be 1/4
         * maxTop: max top it could be
         * noLimitTop: if true, it will always center
                    with equal space on top and bottom,
                    if false, top will be minimum 0 and bottom will overfolw
                    when modal height is larger then window height
         */
        options = options || {};

        var $window = $(window);
        var $modal = this.$modal;
        var winWidth = $window.width();
        var modalWidth = $modal.width();
        var left = (winWidth - modalWidth) / 2;

        if (options.horizontalOnly) {
            $modal.css({"left": left});
            return;
        }

        var winHeight = $window.height();
        var modalHeight = $modal.height();
        var top;

        if (options.verticalQuartile) {
            top = (winHeight - modalHeight) / 4;
        } else {
            top = (winHeight - modalHeight) / 2;
        }

        if (options.maxTop && top < options.maxTop) {
            top = options.maxTop;
            var bottom = top + modalHeight;
            if (bottom > winHeight) {
                top -= (bottom - winHeight);
            }
        }

        if (!options.noLimitTop) {
            top = Math.max(top, 0);
        }

        $modal.css({
            "left": left,
            "top" : top
        });
    },

    toggleBG: function(tableId, isHide, options) {
        var $modalBg = $("#modalBackground");
        var $mainFrame = $("#mainFrame");
        var $sideBarModal = $("#sideBarModal");
        var $menuPanel = $("#bottomMenu");
        var $tableWrap;

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
        } else {
            $tableWrap = $("#xcTableWrap-" + tableId);
        }

        options = options || {};

        if (isHide) {
            var fadeOutTime;
            if (options.time == null) {
                fadeOutTime = 150;
            } else {
                fadeOutTime = options.time;
            }
            
            // when close the modal
            $modalBg.fadeOut(fadeOutTime, function() {
                $modalBg.removeClass('light');
                $mainFrame.removeClass('modalOpen');
            });

            $sideBarModal.fadeOut(fadeOutTime, function() {
                $(this).removeClass('light');
                $menuPanel.removeClass('modalOpen');
            });

            $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                             .removeClass('tableDarkened');

            $tableWrap.removeClass('modalOpen');
        } else {
            // when open the modal
            $tableWrap.addClass('modalOpen');
            if (tableId !== "all") {
                $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                                 .addClass('tableDarkened');
            }

            $menuPanel.addClass('modalOpen');
            $mainFrame.addClass('modalOpen');
            var fadeInTime;
            if (options.time == null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
            $sideBarModal.addClass('light').fadeIn(fadeInTime);
            $modalBg.addClass('light').fadeIn(fadeInTime);
        }
    },

    addWaitingBG: function() {
        var $modal = this.$modal;
        var waitingBg = '<div id="modalWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $modal.append(waitingBg);
        var $waitingBg =  $('#modalWaitingBG');
        var modalHeaderHeight = $modal.find('.modalHeader').height();
        var modalHeight = $modal.height();

        $waitingBg.height(modalHeight - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    },

    removeWaitingBG: function() {
        if (gMinModeOn) {
            $('#modalWaitingBG').remove();
        } else {
            $('#modalWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    },

    refreshTabbing: function() {
        var $modal = this.$modal;

        $(document).off("keydown.xcModalTabbing" + this.id);

        $modal.find(".focusable").off(".xcModal")
                                 .removeClass("focusable");

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

        $(document).on("keydown.xcModalTabbing" + this.id, function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

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
    }
};

function RangeSlider($rangeSliderWrap, prefName, options) {
    options = options || {};
    var self = this;
    this.minVal = options.minVal || 0;
    this.maxVal = options.maxVal || 0;
    this.halfSliderWidth = Math.round($rangeSliderWrap.find('.slider').width() / 2);
    this.minWidth = options.minWidth || this.halfSliderWidth;
    this.maxWidth = options.maxWidth || $rangeSliderWrap.find('.rangeSlider').width();
    this.valRange = this.maxVal - this.minVal;
    this.widthRange = this.maxWidth - this.minWidth;
    this.$rangeSliderWrap = $rangeSliderWrap;
    this.$rangeInput = $rangeSliderWrap.find('input');
    this.prefName = prefName;
    this.options = options;

    $rangeSliderWrap.find('.leftArea').resizable({
        "handles" : "e",
        "minWidth": self.minWidth,
        "maxWidth": self.maxWidth,
        "stop"    : function(event, ui) {
            var val = self.updateInput(ui.size.width);
            UserSettings.setPref(prefName, val);
            if (options.onChangeEnd) {
                options.onChangeEnd(val);
            }
        },
        "resize": function(event, ui) {
            self.updateInput(ui.size.width);
        }
    });


    $rangeSliderWrap.find('.leftArea').on('mousedown', function(event) {
        if (!$(event.target).hasClass('leftArea')) {
            // we don't want to respond to slider button being clicked
            return;
        }
        self.handleClick(event);
        
    });

    $rangeSliderWrap.find('.rightArea').on('mousedown', function(event) {
        self.handleClick(event);
    });

    $rangeSliderWrap.find('input').on('input', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        self.updateSlider(val);
    });

    $rangeSliderWrap.find('input').on('change', function() {
        var val = $(this).val();
        val = Math.min(self.maxVal, Math.max(val, self.minVal));
        $(this).val(val);
        UserSettings.setPref(self.prefName, val);
        if (options.onChangeEnd) {
            options.onChangeEnd(val);
        }
    });

    $rangeSliderWrap.find('input').on('keydown', function(event) {
        if (event.which === keyCode.Enter) {
            $(this).blur();
        }
    });
}

RangeSlider.prototype = {
    updateInput: function(uiWidth) {
        var width = uiWidth - this.minWidth;
        var val = (width / this.widthRange) * this.valRange + this.minVal;
        val = Math.round(val);
        this.$rangeInput.val(val);
        return val;
    },
    updateSlider: function(val) {
        var width = ((val - this.minVal) / this.valRange) * this.widthRange +
                    this.minWidth;
   
        width = Math.max(this.minWidth, Math.min(this.maxWidth, width));
        this.$rangeSliderWrap.find('.leftArea').width(width);
    },
    handleClick: function(event) {
        var self = this;
        var $rangeSlider = $(event.target).closest('.rangeSlider');
        var mouseX = event.pageX - $rangeSlider.offset().left +
                     self.halfSliderWidth;
        mouseX = Math.min(self.maxWidth, Math.max(self.minWidth, mouseX));
        var val = self.updateInput(mouseX);
        self.updateSlider(val);
        UserSettings.setPref(self.prefName, val);
        if (self.options.onChangeEnd) {
            self.options.onChangeEnd(val);
        }
    },
    setSliderValue: function(val) {
        this.updateSlider(val);
        this.$rangeInput.val(val);
    }
};

/* End of ModalHelper */

/*
* options include:
    onlyClickIcon: if set true, only toggle dropdown menu when click
                     dropdown icon, otherwise, toggle also on click
                     input section
    onSelect: callback to trigger when select an item on list, $li will
              be passed into the callback
    onOpen: callback to trigger when list opens/shows
    container: will hide all other list in the container when focus on
               this one. Default is $dropDownList.parent()
    bounds: restrain the dropdown list size to this element
    bottomPadding: integer for number of pixels of spacing between
                   bottom of list and $bounds,
    exclude: selector for an element to exclude from default click
             behavior
 *
    $menu needs to have the following structure:
        <div class="menu/list">
            <ul></ul>
            <div class="scrollArea top"></div>
            <div class="scrollArea bottom"></div>
        </div>
    where the outer div has the same height as the ul

*/
function MenuHelper($dropDownList, options) {
    options = options || {};
    this.options = options;

    this.$container = options.container ? $(options.container) :
                                          $dropDownList.parent();
    var $list;
    if ($dropDownList.is('.list,.menu')) {
        $list = $dropDownList;
    } else {
        $list = $dropDownList.find('.list, .menu');
    }

    this.$list = $list;
    this.$dropDownList = $dropDownList;
    this.$ul = $list.children('ul');
    this.$scrollAreas = $list.find('.scrollArea');
    this.numScrollAreas = this.$scrollAreas.length;
    this.$subList = options.$subList;
    this.$bounds = options.bounds ? $(options.bounds) : $(window);
    this.bottomPadding = options.bottomPadding || 0;
    this.exclude = options.exclude ? options.exclude : false;
    this.isMouseInScroller = false;

    this.timer = {
        "fadeIn"           : null,
        "fadeOut"          : null,
        "setMouseMoveFalse": null,
        "hovering"         : null,
        "scroll"           : null,
        "mouseScroll"      : null
    };

    this.setupListScroller();
}

MenuHelper.prototype = {
    setupListeners: function() {
        var self = this;
        var options = self.options;
        var $dropDownList = self.$dropDownList;
        // toggle list section
        if (options.onlyClickIcon) {
            $dropDownList.on("click", ".icon", function(event) {
                event.stopPropagation();
                if (options.onOpen) {
                    options.onOpen();
                }
                self.toggleList($(this).closest(".dropDownList"));
            });
        } else {
            $dropDownList.on("click", function(event) {
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                event.stopPropagation();
                if (options.onOpen) {
                    options.onOpen();
                }
                self.toggleList($(this));
            });
        }

        $dropDownList.on("mousedown", function(event) {
            if (event.which === 1) {
                // stop propagation of left mousedown
                // because hide dropdown is triggered by it
                // should invalid that when mousedown on dropDownList
                event.stopPropagation();
                var mousedownTarget;
                if ($(this).find('input').length === 1) {
                    mousedownTarget = $(this).find('input');
                } else {
                    mousedownTarget = $(this);
                }
                gMouseEvents.setMouseDownTarget(mousedownTarget);
            }
        });

        // on click a list
        $dropDownList.on({
            "click": function(event) {
                var keepOpen = false;

                event.stopPropagation();
                if (options.onSelect) {    // trigger callback
                    // keepOpen be true, false or undefined
                    keepOpen = options.onSelect($(this));
                }

                if (!keepOpen) {
                    self.hideDropdowns();
                }
            },
            "mouseenter": function() {
                $(this).addClass("hover");

            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");
    },
    hideDropdowns: function() {
        var $sections = this.$container.find(".dropDownList");
        $sections.find(".list").hide().removeClass("openList");
        $sections.removeClass("open");
        $(document).off('click.closeDropDown');
    },
    toggleList: function($curlDropDownList) {
        var self = this;
        var $list = self.$list;
        if ($curlDropDownList.hasClass("open")) {    // close dropdown
            this.hideDropdowns($curlDropDownList);
        } else {
            // hide all other dropdowns that are open on the page
            var $currentList;
            if ($list.length === 1) {
                $currentList = $list;
            } else {
                // this is triggered when $list contains more that one .list
                // such as the xcHelper.dropdownlist in mulitiCastModal.js
                $currentList = $curlDropDownList.find(".list");
            }

            if (!$list.parents('.list, .menu').length) {
                $('.list, .menu').not($currentList)
                                .hide()
                                .removeClass('openList')
                                .parent('.dropDownList')
                                .removeClass('open');
            }

            // open dropdown
            var $lists = $curlDropDownList.find(".list");
            if ($lists.children().length === 0) {
                return;
            }
            $curlDropDownList.addClass("open");
            $lists.show().addClass("openList");
            $(document).on('click.closeDropDown', function() {
                self.hideDropdowns();
            });
            if (typeof self.options.onOpen === "function") {
                self.options.onOpen($curlDropDownList);
            }
            self.showOrHideScrollers();
            $('.selectedCell').removeClass('selectedCell');
            FnBar.clear();
        }
        $('.tooltip').hide();
    },
    setupListScroller: function() {
        if (this.numScrollAreas === 0) {
            return;
        }
        var self = this;
        var $list = this.$list;
        var $ul = this.$ul;
        var $scrollAreas = this.$scrollAreas;
        var timer = this.timer;
        var isMouseMoving = false;
        var $subList = this.$subList;
        var outerHeight;
        var innerHeight;
        $list.mouseleave(function() {
            clearTimeout(timer.fadeIn);
            $scrollAreas.removeClass('active');
        });

        $list.mouseenter(function() {
            outerHeight = $list.height();
            innerHeight = $ul[0].scrollHeight;
            isMouseMoving = true;
            fadeIn();
        });

        $list.mousemove(function() {
            clearTimeout(timer.fadeOut);
            clearTimeout(timer.setMouseMoveFalse);
            isMouseMoving = true;

            timer.fadeIn = setTimeout(fadeIn, 200);

            timer.fadeOut = setTimeout(fadeOut, 800);

            timer.setMouseMoveFalse = setTimeout(setMouseMoveFalse, 100);
        });

        $scrollAreas.mouseenter(function() {
            self.isMouseInScroller = true;
            $(this).addClass('mouseover');

            if ($subList) {
                $subList.hide();
            }
            var scrollUp = $(this).hasClass('top');
            scrollList(scrollUp);
        });

        $scrollAreas.mouseleave(function() {
            self.isMouseInScroller = false;
            clearTimeout(timer.scroll);

            var scrollUp = $(this).hasClass('top');

            if (scrollUp) {
                $scrollAreas.eq(1).removeClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
            }

            timer.hovering = setTimeout(hovering, 200);
        });

        $ul.scroll(function() {
            clearTimeout(timer.mouseScroll);
            timer.mouseScroll = setTimeout(mouseScroll, 300);
        });

        function fadeIn() {
            if (isMouseMoving) {
                $scrollAreas.addClass('active');
            }
        }

        function fadeOut() {
            if (!isMouseMoving) {
                clearTimeout(timer.fadeIn);
                $scrollAreas.removeClass('active');
            }
        }

        function scrollList(scrollUp) {
            var top;
            var scrollTop = $ul.scrollTop();

            if (scrollUp) { // scroll upwards
                if (scrollTop === 0) {
                    $scrollAreas.eq(0).addClass('stopped');
                    return;
                }
                timer.scroll = setTimeout(function() {
                    top = scrollTop - 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            } else { // scroll downwards
                if (outerHeight + scrollTop >= innerHeight) {
                    $scrollAreas.eq(1).addClass('stopped');
                    return;
                }

                timer.scroll = setTimeout(function() {
                    top = scrollTop + 7;
                    $ul.scrollTop(top);
                    scrollList(scrollUp);
                }, 30);
            }
        }

        function mouseScroll() {
            var scrollTop = $ul.scrollTop();
            if (scrollTop === 0) {
                $scrollAreas.eq(0).addClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            } else if (outerHeight + scrollTop >= innerHeight) {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).addClass('stopped');
            } else {
                $scrollAreas.eq(0).removeClass('stopped');
                $scrollAreas.eq(1).removeClass('stopped');
            }
        }

        function setMouseMoveFalse() {
            isMouseMoving = false;
        }

        function hovering() {
            if (!self.isMouseInScroller) {
                $scrollAreas.removeClass('mouseover');
            }
        }
    },
    showOrHideScrollers: function($newUl) {
        if (this.numScrollAreas === 0) {
            return;
        }
        var $list = this.$list;
        var $bounds = this.$bounds;
        var bottomPadding = this.bottomPadding;
        if ($newUl) {
            this.$ul = $newUl;
        }
        var $ul = this.$ul;

        var offset = $bounds.offset();
        var offsetTop;
        if (offset) {
            offsetTop = offset.top;
        } else {
            offsetTop = 0;
        }

        var listHeight = offsetTop + $bounds.height() - $list.offset().top -
                         bottomPadding;
        listHeight = Math.min($(window).height() - $list.offset().top,
                              listHeight);
        listHeight = Math.max(listHeight - 1, 40);
        $list.css('max-height', listHeight);
        $ul.css('max-height', listHeight).scrollTop(0);

        var ulHeight = $ul[0].scrollHeight;

        if (ulHeight > $list.height()) {
            $ul.css('max-height', listHeight);
            $list.find('.scrollArea').show();
            $list.find('.scrollArea.bottom').addClass('active');
        } else {
            $ul.css('max-height', 'auto');
            $list.find('.scrollArea').hide();
        }
        // set scrollArea states
        $list.find('.scrollArea.top').addClass('stopped');
        $list.find('.scrollArea.bottom').removeClass('stopped');
    }
};

/* Extension Panel */
function ExtItem(options) {
    options = options || {};
    this.name = options.name;
    this.version = options.version;
    this.description = options.description;
    this.main = options.main;
    this.repository = options.repository;
    this.author = options.author;
    this.devDependencies = options.devDependencies;
    this.category = options.category;
    this.imageUrl = options.imageUrl;
    this.website = options.website;
    this.installed = options.installed || false;
}

ExtItem.prototype = {
    "getName": function() {
        return this.name;
    },

    "getCategory": function() {
        return this.category;
    },

    "getAuthor": function() {
        return this.author || "N/A";
    },

    "getDescription": function() {
        return this.description || "";
    },

    "getVersion": function() {
        return this.version || "N/A";
    },

    "getWebsite": function() {
        return this.website;
    },

    "getImage": function() {
        if (this.imageUrl == null) {
            return "";
        }

        return this.imageUrl;
    },

    "getUrl": function() {
        if (this.repository != null) {
            return this.repository.url;
        }

        return null;
    },

    "setImage": function(newImage) {
        this.imageUrl = newImage;
    },

    "isInstalled": function() {
        return this.installed;
    }
};


function ExtCategory(categoryName) {
    this.name = categoryName;
    this.extensions = {};

    return this;
}

ExtCategory.prototype = {
    "getName": function() {
        return this.name;
    },

    "getExtension": function(extName) {
        return this.extensions[extName];
    },

    "hasExtension": function(extName) {
        return this.extensions.hasOwnProperty(extName);
    },

    "addExtension": function(extension) {
        var extName = extension.name;
        if (extName == null || this.hasExtension(extName)) {
            console.error("Duplicated extension");
            return false;
        }

        this.extensions[extName] = new ExtItem(extension);
        return true;
    },

    "getExtensionList": function(searchKey) {
        searchKey = searchKey || "";
        var extensions = this.extensions;
        var listToSort = [];
        var regExp = new RegExp(searchKey, "i");
        for (var extName in extensions) {
            if (!regExp.test(extName)) {
                continue;
            }
            listToSort.push([extensions[extName], extName]);
        }

        // sort by extension name
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        var resList = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    },

    "getInstalledExtensionList": function() {
        var list = this.getExtensionList();
        var resList = [];
        for (var i = 0, len = list.length; i < len; i++) {
            var extension = list[i];
            if (extension.isInstalled()) {
                resList.push(extension);
            }
        }
        return resList;
    }
};

function ExtCategorySet() {
    this.set = {};
    return this;
}

ExtCategorySet.prototype = {
    "get": function(categoryName) {
        return this.set[categoryName];
    },

    "has": function(categoryName) {
        return this.set.hasOwnProperty(categoryName);
    },

    "addExtension": function(extension) {
        var categoryName = extension.category;
        // var isCustom = true;
        // if (extension.repository && extension.repository.type === "market") {
        //     isCustom = false;
        // }

        var extCategory;

        if (this.has(categoryName)) {
            extCategory = this.get(categoryName);
        } else {
            extCategory = new ExtCategory(categoryName);
            this.set[categoryName] = extCategory;
        }
        extCategory.addExtension(extension);
    },

    "getExtension": function(categoryName, extensionName) {
        if (!this.has(categoryName)) {
            return null;
        }

        var category = this.get(categoryName);
        return category.getExtension(extensionName);
    },

    "getList": function() {
        var set = this.set;
        var listToSort = [];
        for (var categoryName in set) {
            listToSort.push([set[categoryName], categoryName]);
        }

        // sort by category
        listToSort.sort(function(a, b) {
            return (a[1].localeCompare(b[1]));
        });

        var resList = [];
        listToSort.forEach(function(res) {
            resList.push(res[0]);
        });

        return resList;
    }
};
/* End of Extension Panel */
