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

// userSettings.js
function SettingInfo(options) {
    options = options || {};
    this.datasetListView = options.datasetListView || false;
    this.browserListView = options.browserListView || false;
    this.lastRightSideBar = options.lastRightSideBar || null;

    return this;
}

// gTables

// Constructor for table meata data
function TableMeta(options) {
    options = options || {};

    if (!options.tableName || !options.tableId) {
        console.error("error table meta!");
    }

    this.tableName = options.tableName;
    this.tableId = options.tableId;
    this.isLocked = options.isLocked;

    if (options.active != null) {
        this.active = options.active;
    } else {
        this.active = true;
    }

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

    this.currentRowNumber = -1;
    this.resultSetId = -1;
    this.keyName = "";
    this.resultSetCount = -1;
    this.numPages = -1;
    this.bookmarks = [];
    this.rowHeights = {}; // a map

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

    beInActive: function() {
        this.active = false;
        return this;
    },

    beActive: function() {
        this.active = true;
        return this;
    },

    updateTimeStamp: function() {
        this.timeStamp = xcHelper.getTimeInMS();
        return this;
    }
};

function ProgCol(options) {
    options = options || {};
    if (options.index == null) {
        this.index = -1;
    } else {
        this.index = options.index;
    }

    if (options.isNewCol == null) {
        this.isNewCol = true;
    } else {
        this.isNewCol = options.isNewCol;
    }

    this.name = options.name || "";
    this.type = options.type || "undefined";
    this.func = new ColFunc(options.func);
    this.width = options.width || 0;
    this.sizeToHeader = options.sizeToHeader || true;
    this.userStr = options.userStr || "";
    this.textAlign = options.textAlign || "Center";

    return this;
}

function ColFunc(options) {
    options = options || {};
    this.func = options.func;
    this.args = options.args || [];

    return this;
}

// store.js
function METAConstructor(atStartUp) {
    // basic thing to store
    this[KVKeys.TI] = gTables;
    this[KVKeys.WS] = WSManager.getAllMeta();

    this[KVKeys.DS] = DS.getHomeDir();
    this[KVKeys.CLI] = CLIBox.getCli(); // string

    this[KVKeys.CART] = DataCart.getCarts();
    this[KVKeys.STATS] = Profile.getCache();
    this[KVKeys.DFG] = DFG.getAllGroups(); // a set of DFGObj
    this[KVKeys.SCHE] = Scheduler.getAllSchedules(); // list of SchedObj

    if (atStartUp) {
        this[KVKeys.USER] = UserSettings.getSettings();
    } else {
        this[KVKeys.USER] = UserSettings.setSettings();
    }

    return this;
}

// datastore.js
function Cart(options) {
    options = options || {};
    this.dsName = options.dsName;
    this.tableName = options.tableName;
    this.items = [];

    return this;
}

Cart.prototype = {
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
    this.max = options.max || null;
    this.min = options.min || null;
    this.count = options.count || null;
    this.sum = options.sum || null;
    this.average = options.average || null;

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
 * @property {number} parentId The parent folder's id
 * @property {boolean} isFolder Whether it's folder or dataset
 * @property {DSObj[]} [eles], An Array of child DSObjs
 * @property {number} totalChildren The total nummber of child
 * @property {string} format foramt of ds, ie. CSV, JSON, etc..
 * @property {string} path ds url
 * @property {string} fileSize size of ds
 * @property {number} numEntries number of ds records
 */
function DSObj(options) {
    options = options || {};
    this.id = options.id;
    this.name = options.name;
    this.parentId = options.parentId;
    this.isFolder = options.isFolder;

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

    if (this.parentId >= 0) {
        var parent = DS.getDSObj(this.parentId);
        parent.eles.push(this);
        // update totalChildren of all ancestors
        this.updateDSCount();
    }

    return (this);
}

DSObj.prototype = {
    // rename of dsObj
    rename: function(newName) {
        newName = newName.trim();

        if (newName === "") {
            // not allow empty name
            return (this);
        }

        var self   = this;
        var parent = DS.getDSObj(self.parentId);
        //check name confliction
        var isValid = xcHelper.validate([
            {
                "$selector": DS.getGrid(self.id),
                "text"     : ErrorTextTStr.NoSpecialChar,
                "check"    : function() {
                    return xcHelper.hasSpecialChar(newName, true);
                }
            },
            {
                "$selector": DS.getGrid(self.id),
                "text"     : ErrorTextWReplaceTStr.FolderConflict
                                .replace('<name>', newName),
                "check": function() {
                    return (parent.checkNameConflict(self.id, newName,
                                                     self.isFolder));
                }
            }
        ]);

        if (isValid) {
            this.name = newName;
        }

        return (this);
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
            StatusBox.show(ErrorTextTStr.MVFolderConflict, $grid);
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
