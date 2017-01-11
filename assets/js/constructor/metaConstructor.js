// store.js
function getMETAKeys() {
    // the key should be as short as possible
    // and when change the store key, change it here, it will
    // apply to all places
    return {
        "TI"   : "TILookup",
        "WS"   : "worksheets",
        "AGGS" : "aggregates",
        "CART" : "datacarts",
        "STATS": "statsCols",
        "LOGC" : "sqlcursor",
        "TPFX" : "tablePrefix",
        "QUERY": "query"
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
    this[METAKeys.LOGC] = SQL.getCursor();
    this[METAKeys.TPFX] = TPrefix.getCache();
    this[METAKeys.QUERY] = QueryManager.getCache();
    return this;

    function savegTables() {
        var persistTables = xcHelper.deepCopy(gTables);

        for (var tableId in persistTables) {
            var table = persistTables[tableId];
            delete table.currentRowNumber;
            delete table.keyName;
            delete table.resultSetCount;
            delete table.numPages;
            delete table.ordering;
        }

        return persistTables;
    }
}

function getEMetaKeys() {
    return {
        "DF": "DF"
    };
}

function EMetaConstructor(EMetaKeys) {
    // This is a global key. All users see the same stuff
    EMetaKeys = EMetaKeys || {};
    this[EMetaKeys.DF] = DF.getAllCommitKeys(); // Only persist necessary stuff
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
    isError: function() {
        if (this.sqlType === SQLType.Error) {
            return true;
        } else {
            return false;
        }
    },

    getOperation: function() {
        return this.options.operation;
    },

    getTitle: function() {
        return this.title;
    },

    getOptions: function() {
        return this.options;
    }
};

// Constructor for table meta data
function TableMeta(options) {
    var self = this;
    options = options || {};

    if (!options.tableName || !options.tableId) {
        throw "error table meta!";
    }

    self.tableName = options.tableName;
    self.tableId = options.tableId;
    self.isLocked = options.isLocked || false;
    self.status = options.status || TableType.Active;

    self.timeStamp = options.timeStamp || xcHelper.getCurrentTimeStamp();

    if (options.tableCols != null) {
        self.tableCols = [];
        var oldCols = options.tableCols;
        for (var i = 0, len = oldCols.length; i < len; i++) {
            var progCol = new ProgCol(oldCols[i]);
            self.tableCols[i] = progCol;
        }
    } else {
        self.tableCols = null;
    }

    self.bookmarks = options.bookmarks || [];
    self.rowHeights = options.rowHeights || {}; // a map

    self.currentRowNumber = -1;
    if (options.resultSetId) {
        self.resultSetId = options.resultSetId;
    } else {
        self.resultSetId = -1;
    }

    self.keyName = "";
    self.resultSetCount = -1;
    self.numPages = -1;
    self.icv = options.icv || "";

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

    getMeta: function() {
        var deferred = jQuery.Deferred();
        var self = this;

        XcalarGetTableMeta(self.tableName)
        .then(function(tableMeta) {
            if (tableMeta == null || tableMeta.valueAttrs == null) {
                console.error("backend return error");
                deferred.resolve();
                return;
            }

            self.backTableMeta = tableMeta;
            self.ordering = tableMeta.ordering;
            self.keyName = xcHelper.getTableKeyFromMeta(tableMeta);

            // update immediates
            var valueAttrs = [];
            if (tableMeta.valueAttrs != null) {
                valueAttrs = tableMeta.valueAttrs;
            }

            valueAttrs.forEach(function(valueAttr) {
                if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                    // fat pointer
                    return;
                }
                var progCol = self.getColByBackName(valueAttr.name);
                if (progCol != null) {
                    progCol.setImmediateType(valueAttr.type);
                }
            });

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    },

    getAllCols: function() {
        return this.tableCols;
    },

    addCol: function(colNum, progCol) {
        var self = this;
        var index = colNum - 1;
        if (index < 0 || !progCol) {
            return;
        }

        self.tableCols.splice(index, 0, progCol);
        var backColName = progCol.getBackColName();
        if (self.backTableMeta != null) {
            var valueAttrs = self.backTableMeta.valueAttrs || [];
            valueAttrs.some(function(valueAttr) {
                if (valueAttr.name === backColName &&
                    valueAttr.type !== DfFieldTypeT.DfFatptr) {
                    progCol.setImmediateType(valueAttr.type);
                    // end loop
                    return true;
                }
            });
        } else {
            console.error("no table meta!");
        }
    },

    removeCol: function(colNum) {
        var index = colNum - 1;
        if (index < 0 || this.tableCols[index] == null) {
            return null;
        }

        var removed = this.tableCols[index];
        this.tableCols.splice(index, 1);
        return removed;
    },

    sortCols: function(order) {
        this.tableCols.sort(function(a, b) {
            var aName = a.getFrontColName();
            var bName = b.getFrontColName();
            return xcHelper.sortVals(aName, bName, order);
        });
    },

    updateResultset: function() {
        var deferred = jQuery.Deferred();
        var self = this;

        freeResultSetHelper()
        .then(function() {
            return XcalarMakeResultSetFromTable(self.tableName);
        })
        .then(function(resultSet) {
            // Note that this !== self in this scope
            self.resultSetId = resultSet.resultSetId;
            self.resultSetCount = resultSet.numEntries;
            self.resultSetMax = resultSet.numEntries;
            self.numPages = Math.ceil(self.resultSetCount / gNumEntriesPerPage);

            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();

        function freeResultSetHelper() {
            var innerDeferred = jQuery.Deferred();

            self.freeResultset()
            .always(innerDeferred.resolve);

            return innerDeferred.promise();
        }
    },

    getMetaAndResultSet: function() {
        var deferred = jQuery.Deferred();
        var self = this;

        self.updateResultset()
        .then(function() {
            return self.getMeta();
        })
        .then(deferred.resolve)
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
            .fail(deferred.reject);
        }

        return deferred.promise();
    },

    getType: function() {
        return this.status;
    },

    getKeyName: function() {
        return this.keyName;
    },

    getOrdering: function() {
        return this.ordering;
    },

    getImmediateNames: function() {
        if (!this.backTableMeta ||
            !("valueAttrs" in this.backTableMeta)) {
            return []; // Cannot test, just let it go.
        }
        var allVals = this.backTableMeta.valueAttrs;
        var finalArray = [];
        for (var i = 0; i < allVals.length; i++) {
            if (allVals[i].type !== DfFieldTypeT.DfFatptr) {
                finalArray.push(allVals[i].name);
            }
        }
        return finalArray;
    },

    showIndexStyle: function() {
        var order = this.ordering;
        if (!gEnableIndexStyle &&
            order !== XcalarOrderingT.XcalarOrderingAscending &&
            order !== XcalarOrderingT.XcalarOrderingDescending) {
            return false;
        } else {
            return true;
        }
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

    beUndone: function() {
        this.status = TableType.Undone;
        return this;
    },

    isActive: function() {
        return (this.status === TableType.Active);
    },

    getCol: function(colNum) {
        var tableCols = this.tableCols || [];
        if (colNum < 1 || colNum > tableCols.length) {
            return null;
        }

        return tableCols[colNum - 1];
    },

    getNumCols: function() {
        var tableCols = this.tableCols || [];
        return tableCols.length;
    },

    getColNumByBackName: function(backColName) {
        var tableCols = this.tableCols || [];
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
        var tableCols = this.tableCols || [];
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
        var tableCols = this.tableCols || [];
        var res = xcHelper.parsePrefixColName(frontColName);
        var prefix = res.prefix;
        var colName = res.name;

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (progCol.getPrefix() === prefix &&
                progCol.getFrontColName() === colName)
            {
                // check fronColName
                return progCol;
            }
        }
        return null;
    },

    hasColWithBackName: function(backColName) {
        // this check if table has the backCol,
        // it does not check frontCol
        var tableCols = this.tableCols || [];
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

    hasCol: function(colName, prefix, onlyCheckPulledCol) {
        // check both fronName and backName
        var self = this;
        var tableCols = this.tableCols || [];
        var hasBackMeta = (self.backTableMeta != null &&
                          self.backTableMeta.valueAttrs != null);
        if (!onlyCheckPulledCol && prefix === "" && hasBackMeta) {
            // when it's immediates, when use backMeta to check
            var found = self.backTableMeta.valueAttrs.some(function(valueAttr) {
                if (valueAttr.type === DfFieldTypeT.DfFatptr) {
                    // fat pointer
                    return false;
                }
                if (colName === valueAttr.name) {
                    return true;
                }
            });

            return found;
        }

        // when it's fatPtr or no back meta to check
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                // skip DATA column
                continue;
            }

            if (prefix != null && progCol.getPrefix() !== prefix) {
                continue;
            }

            if (!progCol.isNewCol && progCol.getBackColName() === colName) {
                // check backColName
                return true;
            }

            if (progCol.getFrontColName() === colName) {
                // check fronColName
                return true;
            }
        }

        return false;
    },

    addBookmark: function(rowNum) {
        xcHelper.assert(Number.isInteger(rowNum));

        if (this.bookmarks.indexOf(rowNum) < 0) {
            this.bookmarks.push(rowNum);
        } else {
            // error case
            console.error("Duplicate bookmark in", rowNum);
        }
    },

    removeBookmark: function(rowNum) {
        xcHelper.assert(Number.isInteger(rowNum));

        var index = this.bookmarks.indexOf(rowNum);
        if (index >= 0) {
            this.bookmarks.splice(index, 1);
        } else {
            // error case
            console.error("No bookmark in", rowNum);
        }
    },

    getColContents: function(colNum) {
        // Returns JSON array containing the current contents of the column
        // colName is front or back name
        // Returns null if column does not exist
        var self = this;
        var curId = self.getId();
        var $curTable = $('#xcTable-' + curId);
        if (self.getCol(colNum) === null) {
            return null;
        }

        var colContents = [];

        $curTable.find("td.col" + colNum).each(function() {
            var $textDiv = $(this).find(".originalData");
            colContents.push($textDiv.text());
        });

        return colContents;
    }
};

function ProgCol(options) {
    var defaultOptions = {
        childOfArray : false,
        decimal      : -1,
        format       : null,
        immediate    : false,
        knownType    : false,
        isHidden     : false,
        isNewCol     : true,
        name         : "",
        sizedToHeader: true,
        textAlign    : ColTextAlign.Left,
        type         : ColumnType.undefined,
        userStr      : "",
        width        : gNewCellWidth
    };
    options = $.extend(defaultOptions, options);
    for (var option in options) {
        if (option !== "backName" && option !== "func"
            && typeof options[option] !== "function") {
            this[option] = options[option];
        }
    }

    if (options.backName == null) {
        // this.backName = xcHelper.escapeColName(this.name.replace(/\./g, "\\."));
        this.backName = this.name;
    } else {
        this.backName = options.backName;
    }

    this.prefix = xcHelper.parsePrefixColName(this.backName).prefix;

    this.func = new ColFunc(options.func);

    return this;
}

ProgCol.prototype = {
    isDATACol: function() {
        if (this.name === "DATA" && this.func.name === "raw") {
            return true;
        } else {
            return false;
        }
    },

    isEmptyCol: function() {
        return this.isNewCol || this.name === "" || this.func.name === "";
    },

    isImmediate: function() {
        if (this.immediate === true) {
            return true;
        } else {
            return false;
        }
    },

    isKnownType: function() {
        if (!this.immediate) {
            return false;
        } else {
            return this.knownType;
        }
    },

    getFrontColName: function(includePrefix) {
        var name = this.name || "";
        if (includePrefix) {
            name = xcHelper.getPrefixColName(this.prefix, name);
        }

        return name;
    },

    setFrontColName: function(name) {
        xcHelper.assert(typeof name === "string" && name !== "");
        this.name = name;
    },

    getBackColName: function() {
        return this.backName;
    },

    setBackColName: function(backColName) {
        if (backColName == null) {
            return;
        }

        this.backName = backColName;
        this.prefix = xcHelper.parsePrefixColName(backColName).prefix;
    },

    setImmediateType: function(typeId) {
        if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
            // error case
            console.error("Invalid typeId");
            return;
        }

        var self = this;
        self.immediate = true;
        self.knownType = true;

        switch (typeId) {
            case DfFieldTypeT.DfUnknown:
                self.type = ColumnType.unknown;
                break;
            case DfFieldTypeT.DfString:
                self.type = ColumnType.string;
                break;
            case DfFieldTypeT.DfInt32:
            case DfFieldTypeT.DfInt64:
            case DfFieldTypeT.DfUInt32:
            case DfFieldTypeT.DfUInt32:
                self.type = ColumnType.integer;
                break;
            case DfFieldTypeT.DfFloat32:
            case DfFieldTypeT.DfFloat64:
                self.type = ColumnType.float;
                break;
            case DfFieldTypeT.DfBoolean:
                self.type = ColumnType.boolean;
                break;
            case DfFieldTypeT.DfMixed:
                self.type = ColumnType.mixed;
                break;
            case DfFieldTypeT.DfFatptr:
                console.error("Should not set fat pointer's type");
                self.immediate = false;
                self.knownType = false;
                break;
            default:
                // console.warn("Unsupported type");
                self.knownType = false;
                break;
        }
    },

    getPrefix: function() {
        return this.prefix;
    },

    getType: function() {
        return this.type;
    },

    updateType: function(val) {
        var self = this;
        if (self.isEmptyCol()) {
            return;
        } else if (self.isKnownType()) {
            // don't check for knownType
            return;
        } else {
            self.type = xcHelper.parseColType(val, self.type);
        }
    },

    getDisplayWidth: function() {
        if (this.isHidden) {
            return gHiddenColumnWidth;
        } else {
            return this.width;
        }
    },

    getWidth: function() {
        return this.width;
    },

    setWidth: function(width) {
        this.width = width;
    },

    getFormat: function() {
        if (this.format == null) {
            return ColFormat.Default;
        } else {
            return this.format;
        }
    },

    setFormat: function(format) {
        if (format === ColFormat.Default) {
            this.format = null;
        } else {
            this.format = format;
        }
    },

    getDecimal: function() {
        return this.decimal;
    },

    setDecimal: function(decimal) {
        this.decimal = decimal;
    },

    hide: function() {
        this.isHidden = true;
    },

    unhide: function() {
        this.isHidden = false;
    },

    hasHidden: function() {
        return this.isHidden;
    },

    getTextAlign: function() {
        return this.textAlign;
    },

    setTextAlign: function(alignment) {
        if (alignment == null) {
            return;
        }

        this.textAlign = alignment;
    },

    isNumberCol: function() {
        return (this.type === ColumnType.integer ||
                this.type === ColumnType.float);
    },

    isChildOfArray: function() {
        return this.childOfArray;
    },

    beChildOfArray: function() {
        this.childOfArray = true;
    },

    stringifyFunc: function() {
        var self = this;
        var str = "";

        parseFunc(self.func);

        function parseFunc(func) {
            if (func.name) {
                if (str !== "") {
                    str += "(";
                }
                str += func.name;
            }

            var args = func.args;
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] !== "object") {
                    if (i === 0) {
                        str += "(";
                    } else {
                        str += ",";
                    }
                    str += args[i];
                } else if (typeof args[i] === "object") {
                    parseFunc(args[i]);
                }
                if (i === func.args.length - 1) {
                    str += ")";
                }
            }
        }
        return str;
    },

    parseFunc: function() {
        var self = this;
        if (!self.userStr) {
            console.error("no userStr");
            return;
        }

        var funcString = self.userStr;
        // Everything must be in a "name" = function(args) format
        // var open = funcString.indexOf("\"");
        // var close = (funcString.substring(open + 1)).indexOf("\"") + open + 1;
        // var name = funcString.substring(open + 1, close);
        var funcSt = funcString.substring(funcString.indexOf("=") + 1);
        var func = {args: []};

        ColManager.parseFuncString(funcSt, func);
        self.func = new ColFunc(func.args[0]);
    },
};

function ColFunc(options) {
    options = options || {};
    this.name = options.name;
    this.args = options.args || [];

    return this;
}

function GenSettings(userConfigParms, options) {
    userConfigParms = userConfigParms || {};
    options = options || {};
    var defaultSettings = {
        hideDataCol         : false,
        monitorGraphInterval: 3, // in seconds
        commitInterval      : 120, // in seconds
        DsDefaultSampleSize : 10 * GB
    };
    defaultSettings = $.extend({}, defaultSettings, userConfigParms);

    var adminSettings = options.adminSettings || {};
    var xcSettings = options.xcSettings || {};
    this.adminSettings = adminSettings;
    this.xcSettings = xcSettings;

    // adminSettings have higher priority than xcSettings,
    // xcSettings (xcalar admin) has higher priority than defaultSettings

    this.baseSettings = $.extend({}, defaultSettings, xcSettings,
                                 adminSettings);
}

GenSettings.prototype = {
    getPref: function(pref) {
        return this.baseSettings[pref];
    },
    getBaseSettings: function() {
        return this.baseSettings;
    },
    updateAdminSettings: function(settings) {
        var prevAdminSettings = this.adminSettings;
        this.adminSettings = $.extend({}, prevAdminSettings, settings);
    },
    updateXcSettings: function(settings) {
        var prevXcSettings = this.xcSettings;
        this.xcSettings = $.extend({}, prevXcSettings, settings);
    },
    getAdminAndXcSettings: function() {
        return {
            adminSettings: this.adminSettings,
            xcSettings   : this.xcSettings
        };
    },
};

function UserPref(options) {
    options = options || {};
    this.datasetListView = options.datasetListView || false;
    this.browserListView = options.browserListView || false;
    this.keepJoinTables = options.keepJoinTables || false;
    this.activeMainTab = options.activeMainTab || "workspaceTab";
    this.general = options.general || {}; // holds general settings that can
    // be set by user but if a setting is not set, will default to those in
    // GenSettings

    return this;
}

UserPref.prototype = {
    'update': function() {
        this.datasetListView = $('#dataViewBtn').hasClass('listView');
        this.browserListView = $('#fileBrowserGridView').hasClass('listView');
        this.keepJoinTables = $('#joinModal').find('.keepTablesCBWrap')
                                             .find('.checkbox')
                                             .hasClass('checked');
        return this;
    }
};

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
    getId: function() {
        return this.dsId;
    },

    getDSName: function() {
        var ds = DS.getDSObj(this.dsId);
        return ds.getFullName();
    },

    getTableName: function() {
        return this.tableName;
    },

    setTableName: function(tableName) {
        this.tableName = tableName;
    },

    getPrefix: function() {
        if (this.prefix) {
            return this.prefix;
        } else {
            return null;
        }
    },

    setPrefix: function(prefix) {
        this.prefix = prefix;
    },

    addItem: function(options) {
        var cartItem = new CartItem(options);
        this.items.push(cartItem);
    },

    removeItem: function(colNum) {
        this.items = this.items.filter(function(item) {
            if (item.colNum === colNum) {
                // filter out the item
                return false;
            } else {
                return true;
            }
        });
    },

    emptyItem: function() {
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
    this.activeWS = options.activeWS;

    return this;
}

function WorksheetObj(options) {
    var self = this;

    for (var key in WSTableType) {
        var tableType = WSTableType[key];
        self[tableType] = options[tableType] || [];
    }

    self[WSTableType.Lock] = []; // should clear it when initialize
    self.id = options.id;
    self.name = options.name;
    self.date = options.date || xcHelper.getDate();
    return self;
}

WorksheetObj.prototype = {
    getId: function() {
        return this.id;
    },

    getName: function() {
        return this.name;
    },

    setName: function(name) {
        this.name = name;
    },

    addTable: function(tableId, tableType) {
        if (tableId == null) {
            return false;
        }

        var tableArray = this[tableType];
        if (tableArray == null) {
            return false;
        }

        if (tableArray.includes(tableId)) {
            console.error(tableId, "already in worksheets!");
            return false;
        }

        tableArray.push(tableId);
        return true;
    },
};

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
    this.numWorksheets = options.numWorksheets || 1;

    return this;
}

WKBK.prototype = {
    update: function() {
        // store modified data
        this.modified = xcHelper.getCurrentTimeStamp();
    },

    getId: function() {
        return this.id;
    },

    getName: function() {
        return this.name;
    },

    getCreateTime: function() {
        return this.created;
    },

    getModifyTime: function() {
        return this.modified;
    },

    getSrcUser: function() {
        return this.srcUser;
    },

    getNumWorksheets: function() {
        return this.numWorksheets;
    },

    isNoMeta: function() {
        return this.noMeta || false;
    }
};

function WKBKSet() {
    this.set = {};

    return this;
}

WKBKSet.prototype = {
    get: function(wkbkId) {
        return this.set[wkbkId];
    },

    getWithStringify: function() {
        return JSON.stringify(this.set);
    },

    getAll: function() {
        return this.set;
    },

    put: function(wkbkId, wkbk) {
        this.set[wkbkId] = wkbk;
    },

    has: function(wkbkId) {
        return this.set.hasOwnProperty(wkbkId);
    },

    delete: function(wkbkId) {
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
    if (options.allNull === true) {
        this.allNull = true;
    }
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
 * @property {string} path ds url
 * @property {string} fileSize size of ds
 * @property {number} numEntries number of ds records
 * XXX @property {array} headers temp fix to preserve CSV header order
 */
function DSObj(options) {
    options = options || {};
    this.id = options.id;
    this.name = options.name;
    this.user = options.user;
    this.fullName = options.fullName;
    this.parentId = options.parentId;
    this.isFolder = options.isFolder || false;
    this.uneditable = options.uneditable;

    if (options.headers != null) {
        this.headers = options.headers;
    }

    if (options.error != null) {
        this.error = options.error;
    }

    // initially, dataset count itself as one child,
    // folder has no child;
    if (this.isFolder) {
        this.eles = [];
        this.totalChildren = 0;
    } else {
        this.totalChildren = 1;
        this.format = options.format;
        this.path = options.path;
        this.size = options.size || null;
        this.numEntries = options.numEntries || null;
        this.resultSetId = options.resultSetId;

        // args to point to dataset
        this.pattern = options.pattern;
        this.fieldDelim = options.fieldDelim;
        this.lineDelim = options.lineDelim;
        this.hasHeader = options.hasHeader;
        this.moduleName = options.moduleName;
        this.funcName = options.funcName;
        this.isRecur = options.isRecur || false;
        this.previewSize = options.previewSize;
        this.quoteChar = options.quoteChar;
        this.skipRows = options.skipRows;
        this.isRegex = options.isRegex || false;
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

    getPathWithPattern: function() {
        var path = this.path;
        if (this.pattern) {
            // XXX not sure if it's right
            path += this.pattern;
        }

        return path;
    },

    getPointArgs: function() {
        // loadURL, format, fullName,
        // fieldDelim, lineDelim, hasHeader,
        // moduleName, funcName, isRecur, previewSize,
        // quoteChar, skipRows, isRegex
        var self = this;
        var path = self.getPathWithPattern();

        return [path, self.format, self.fullName,
                self.fieldDelim, self.lineDelim, self.hasHeader,
                self.moduleName, self.funcName, self.isRecur, self.previewSize,
                self.quoteChar, self.skipRows, self.isRegex];
    },

    getNumEntries: function() {
        return this.numEntries;
    },

    getSize: function() {
        return this.size;
    },

    setSize: function(size) {
        this.size = xcHelper.sizeTranslator(size);
    },

    // this calculte how much size the dataset actually taken
    // should be bigger than the size return from load
    getMemoryTakenSize: function() {
        var self = this;
        var deferred = jQuery.Deferred();
        var dsName = self.fullName;

        XcalarGetDatasetMeta(dsName)
        .then(function(res) {
            var size;
            if (res != null && res.metas != null) {
                var metas = res.metas;
                size = 0;
                // sum up size from all nodes
                for (var i = 0, len = metas.length; i < len; i++) {
                    size += metas[i].size;
                }
                size = xcHelper.sizeTranslator(size);
                if (self.size == null) {
                    // when not get the size
                    self.size = size;
                }
            }

            deferred.resolve(size);
        })
        .fail(deferred.reject);

        return deferred.promise();
    },

    getError: function() {
        return this.error;
    },

    setError: function(error) {
        this.error = error;
    },

    setPreviewSize: function(previewSize) {
        if (this.isFolder || isNaN(previewSize)) {
            console.error("error case!");
            return;
        }

        this.previewSize = previewSize;
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

        fetchHelper()
        .then(parseHelper)
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

        function makeResultSetHelper() {
            if (self.resultSetId != null) {
                return PromiseHelper.resolve();
            }

            return self.makeResultSet();
        }

        function fetchHelper() {
            var innerDeferred = jQuery.Deferred();

            makeResultSetHelper()
            .then(function() {
                if (self.numEntries <= 0) {
                    return PromiseHelper.resolve(null);
                }

                rowsToFetch = Math.min(self.numEntries, rowsToFetch);
                return XcalarFetchData(self.resultSetId, rowToGo, rowsToFetch,
                                        self.numEntries, []);
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                if (error.status === StatusT.StatusInvalidResultSetId) {
                    // when old result is invalid
                    self.makeResultSet()
                    .then(function() {
                        return XcalarFetchData(self.resultSetId, rowToGo, rowsToFetch,
                                    self.numEntries, []);
                    })
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                } else {
                    innerDeferred.reject(error);
                }
            });

            return innerDeferred.promise();
        }

        function parseHelper(data) {
            if (!data) {
                return PromiseHelper.reject({"error": DSTStr.NoRecords});
            }

            var innerDeferred = jQuery.Deferred();
            var value;
            var json;
            var uniqueJsonKey = {}; // store unique Json key
            var jsonKeys = [];
            var jsons = [];  // store all jsons

            try {
                for (var i = 0, len = data.length; i < len; i++) {
                    value = data[i].value;
                    json = jQuery.parseJSON(value);
                    // HACK: this is based on the assumption no other
                    // fields called recordNum, if more than one recordNum in
                    // json, only one recordNum will be in the parsed obj,
                    // which is incorrect behavior
                    delete json.recordNum;
                    jsons.push(json);
                    // get unique keys
                    for (var key in json) {
                        uniqueJsonKey[key] = true;
                    }
                }

                for (var uniquekey in uniqueJsonKey) {
                    jsonKeys.push(uniquekey);
                }

                jsonKeys = self._preserveHeaderOrder(jsonKeys);
                innerDeferred.resolve(jsons, jsonKeys);

            } catch (error) {
                console.error(error, value);
                innerDeferred.reject(error);
            }

            return innerDeferred.promise();
        }
    },

    // XXX temp fix to preserve CSV header order
    // Step 1. check if all headers exist in jsonKeys
    // Step 2. check if any extra headers in jsonKeys but not in headers
    _preserveHeaderOrder: function(jsonKeys) {
        if (!jsonKeys) {
            return jsonKeys;
        }

        var headers = this.headers;
        if (headers == null) {
            return jsonKeys;
        }

        var jsonKeyMap = {};
        var headerMap = {};
        var newHeaders = [];

        jsonKeys.forEach(function(key) {
            jsonKeyMap[key] = true;
        });

        // Step 1. check if all headers exist in jsonKeys
        headers.forEach(function(header) {
            if (jsonKeyMap.hasOwnProperty(header)) {
                newHeaders.push(header);
                headerMap[header] = true;
            }
        });

        // Step 2. check if any extra headers in jsonKeys but not in headers
        jsonKeys.forEach(function(key) {
            if (!headerMap.hasOwnProperty(key)) {
                newHeaders.push(key);
            }
        });

        return newHeaders;
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
            return false;
        }

        var self = this;
        var parent = DS.getDSObj(self.parentId);
        var error = xcHelper.replaceMsg(ErrWRepTStr.FolderConflict, {
            "name": newName
        });
        //check name confliction
        var isValid = xcHelper.validate([
            {
                "$ele" : DS.getGrid(self.id),
                "error": ErrTStr.NoSpecialChar,
                "check": function() {
                    return /[^a-zA-Z\(\)\d\s:]/.test(newName);
                }
            },
            {
                "$ele" : DS.getGrid(self.id),
                "error": error,
                "check": function() {
                    return (parent.checkNameConflict(self.id, newName,
                                                     self.isFolder));
                }
            },
            {
                "$ele" : DS.getGrid(self.id),
                "error": ErrTStr.PreservedName,
                "check": function() {
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

/* Start of Dataflow */
/* dataflow.js */
// a inner part of Dataflow
// Stores the original values for the parameterized node
function RetinaNode(options) {
    options = options || {};
    this.paramType = options.paramType;
    this.paramValue = options.paramValue;
    this.paramQuery = options.paramQuery;

    return this;
}

function Dataflow(name, options) {
    options = options || {};
    this.name = name; // Retina name
    this.tableName = options.tableName; // Original table name
    this.columns = options.columns || []; // Columns to export
    this.parameters = options.parameters || []; // Array of parameters in
                                                // Dataflow
    this.paramMap = options.paramMap || {}; // Map for parameters.
    // Map of dagNames and dagIds
    this.nodeIds = options.nodeIds || {};
    // Map of dagNodeIds to parameterized structs
    this.parameterizedNodes = {};

    this.retinaNodes = {};

    this.schedule = null; // Make schedule as one property of dataflow


    if (options.parameterizedNodes != null) {
        for (var nodeId in options.parameterizedNodes) {
            var parameterizedNodes = options.parameterizedNodes[nodeId];
            this.parameterizedNodes[nodeId]=new RetinaNode(parameterizedNodes);
        }
    }

    return this;
}

Dataflow.prototype = {
    addParameterizedNode: function(dagNodeId, oldParamNode, paramInfo) {
        this.parameterizedNodes[dagNodeId] = new RetinaNode(oldParamNode);
        this.updateParameterizedNode(dagNodeId, paramInfo);
    },

    colorNodes: function(dagNodeId) {
        var tableName;
        for (var name in this.nodeIds) {
            if (this.nodeIds[name] === dagNodeId) {
                tableName = name;
                break;
            }
        }

        if (!tableName) {
            console.info("update must be called after add. Noop.");
            return;
        }

        var $nodeOrAction = $('#dataflowPanel').find('[data-id="' + dagNodeId +
                                                     '"]');
        // Exception is for export. XXX Consider attaching the id to the table
        // node instead of the operation during draw dag. I think it will clean
        // up a lot of the exception cases here
        if ($nodeOrAction.hasClass("export")) {
            $nodeOrAction = $nodeOrAction.next(".dagTable");
        }
        $nodeOrAction.addClass('hasParam');
        return $nodeOrAction;
    },

    updateParameterizedNode: function(dagNodeId, paramInfo) {
        var $tableNode = this.colorNodes(dagNodeId);
        if (paramInfo.paramType === XcalarApisT.XcalarApiExport) {
            var $elem = $tableNode.find(".tableTitle");
            $elem.text(paramInfo.paramValue);
            xcTooltip.changeText($elem, xcHelper.convertToHtmlEntity(
                                                         paramInfo.paramValue));
        } else if (paramInfo.paramType === XcalarApisT.XcalarApiFilter) {
            $tableNode.find(".parentsTitle").text("<Parameterized>");
        }
        $tableNode.data('paramValue', encodeURI(paramInfo.paramValue));
    },

    getParameterizedNode: function(dagNodeId) {
        return (this.parameterizedNodes[dagNodeId]);
    },

    addParameter: function(name) {
        xcHelper.assert(!this.paramMap.hasOwnProperty(name), "Invalid name");

        this.parameters.push(name);
        this.paramMap[name] = null;
    },

    getParameter: function(paramName) {
        return (this.paramMap[paramName]);
    },

    getAllParameters: function() {
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

    updateParameters: function(params) {
        var paramMap = this.paramMap;

        params.forEach(function(param) {
            var name = param.name;
            var val  = param.val;
            xcHelper.assert(paramMap.hasOwnProperty(name), "Invalid name");
            paramMap[name] = val;
        });
    },

    checkParamInUse: function(paramName) {
        var str = "<" + paramName + ">";
        var paramNodes = this.parameterizedNodes;

        for (var dagNodeId in paramNodes) {
            var dagQuery = paramNodes[dagNodeId].paramQuery || [];
            for (var i = 0, len = dagQuery.length; i < len; i++) {
                if (dagQuery[i].indexOf(str) >= 0) {
                    return (true);
                }
            }
        }

        return (false);
    },

    removeParameter: function(name) {
        var index = this.parameters.indexOf(name);

        xcHelper.assert((index >= 0), "Invalid name");

        this.parameters.splice(index, 1);
        delete this.paramMap[name];
    },

    // Function for modify schedule in the object
    getSchedule: function() {
        return this.schedule;
    },

    setSchedule: function(schedule) {
        this.schedule = schedule;
    },

    removeSchedule: function() {
        this.schedule = null;
    },

    hasSchedule: function() {
        return this.schedule != null;
    },
};

/* End of SchedObj */

/* Start of Schedule */
/* schedule.js */
function SchedObj(options) {
    options = options || {};
    this.startTime = options.startTime;
    this.dateText = options.dateText;
    this.timeText = options.timeText;
    this.repeat = options.repeat;
    this.freq = options.freq;
    this.modified = options.modified;
    this.created = options.modified;
    this.recur = options.recur;
    return this;
}

SchedObj.prototype = {
    update: function(options) {
        options = options || {};
        this.startTime = options.startTime || this.startTime;
        this.dateText = options.dateText || this.dateText;
        this.timeText = options.timeText || this.timeText;
        this.repeat = options.repeat || this.repeat;
        this.freq = options.freq || this.freq;
        this.modified = options.modified || this.modified;
        this.recur = options.recur || this.recur;
    }
};
/* End of SchedObj */

/* Query */
// expects the following options:
// name, fullName, time, type, id, numSteps
function XcQuery(options) {
    options = options || {};
    this.name = options.name;
    this.time = options.time;
    this.elapsedTime = options.elapsedTime || 0;
    this.fullName = options.fullName; // real name for backend
    this.type = options.type;
    this.subQueries = [];
    this.id = options.id;
    this.numSteps = options.numSteps;
    this.currStep = 0;
    this.outputTableName = options.outputTableName || "";
    this.outputTableState = options.outputTableState || "";
    this.queryStr = options.queryStr || "";

    if (options.sqlNum != null) {
        this.sqlNum = options.sqlNum;
    } else {
        this.sqlNum = null;
    }

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
    getName: function() {
        return this.name;
    },

    getFullName: function() {
        return this.fullName;
    },

    getId: function() {
        return this.id;
    },

    getTime: function() {
        return this.time;
    },

    getElapsedTime: function() {
        return this.elapsedTime;
    },

    setElapsedTime: function() {
        this.elapsedTime = Date.now() - this.time;
    },

    getQuery: function() {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        if (this.queryStr) {
            return this.queryStr;
        }

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

    getOutputTableName: function() {
        if (this.state === "done") {
            if (this.outputTableName) {
                return this.outputTableName;
            }
            if (!this.subQueries.length) {
                console.warn('no subQueries were added to the mainQuery: ' +
                             this.name);
                return null;
            } else {
                var lastSubQuery = this.subQueries[this.subQueries.length - 1];
                if (this.outputTableState === "exported") {
                    this.outputTableName = lastSubQuery.exportFileName;
                } else {
                    this.outputTableName = lastSubQuery.dstTable;
                }
                return this.outputTableName;
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

    addSubQuery: function(subQuery) {
        this.subQueries.push(subQuery);
    },

    getState: function() {
        return this.state;
    },

    getStateString: function() {
        return QueryStateTStr[this.state];
    },

    check: function() {
        var self = this;
        var deferred = jQuery.Deferred();
        if (self.type === "xcQuery") {
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

    run: function() {
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
    if (options.exportFileName) {
        this.exportFileName = options.exportFileName;
    }

    return this;
}

XcSubQuery.prototype = {
    getName: function() {
        return this.name;
    },

    getId: function() {
        return this.id;
    },

    getTime: function() {
        return this.time;
    },

    getQuery: function() {
        // XXX XcalarQueryState also return the query,
        // so maybe not store it into backend?
        return this.query;
    },

    getState: function() {
        return this.state;
    },

    setState: function(state) {
        this.state = state;
    },

    getStateString: function() {
        return QueryStateTStr[this.state];
    },

    check: function() {
        var self = this;
        var deferred = jQuery.Deferred();
        if (!self.dstTable) {
            // XXX This happens if the call is a "drop"
            // Since we don't have a dstDag call, we will just return 50%
            deferred.resolve(50);
            xcHelper.assert(self.name === "drop", "Unexpected operation!");
        } else {
            XcalarGetOpStats(self.dstTable)
            .then(function(ret) {
                var stats = ret.opDetails;
                deferred.resolve(parseFloat((100 * (stats.numWorkCompleted /
                                             stats.numWorkTotal)).toFixed(2)));
            })
            .fail(function(error) {
                console.error(error);
                deferred.reject();
            });
        }

        return deferred.promise();
    }
};
/* End of Query */
