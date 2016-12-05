// some general class
function XcMap() {
    this.map = {};
    return this;
}

XcMap.prototype = {
    entries: function() {
        return this.map;
    },

    set: function(id, item) {
        this.map[id] = item;
    },

    get: function(id) {
        return this.map[id];
    },

    has: function(id) {
        return this.map.hasOwnProperty(id);
    },

    delete: function(id) {
        delete this.map[id];
    },

    clear: function() {
        this.map = {};
    }
};

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
    var $lastMouseDownTarget = $(document);
    var $lastClickTarget = $lastMouseDownTarget;
    var lastTime = (new Date()).getTime();
    // will store last 3 mousedowns (needed for undo)
    var lastMouseDownTargets = [$lastMouseDownTarget];

    this.setMouseDownTarget = function($element) {
        $lastMouseDownTarget = $element;
        lastTime = (new Date()).getTime();

        // store up to last 3 mousedowns
        if (lastMouseDownTargets.length === 3) {
            lastMouseDownTargets.splice(2, 1);
        }
        lastMouseDownTargets.unshift($element);
    };

    this.setClickTarget = function($element) {
        $lastClickTarget = $element;
    };

    this.getLastMouseDownTarget = function() {
        return $lastMouseDownTarget;
    };
    this.getLastMouseDownTargets = function() {
        return lastMouseDownTargets;
    };

    this.getLastClickTarget = function() {
        return $lastClickTarget;
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

    beChidOfArray: function() {
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
    "getPref": function(pref) {
        return this.baseSettings[pref];
    },
    "getBaseSettings": function() {
        return this.baseSettings;
    },
    "updateAdminSettings": function(settings) {
        var prevAdminSettings = this.adminSettings;
        this.adminSettings = $.extend({}, prevAdminSettings, settings);
    },
    "updateXcSettings": function(settings) {
        var prevXcSettings = this.xcSettings;
        this.xcSettings = $.extend({}, prevXcSettings, settings);
    },
    "getAdminAndXcSettings": function() {
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

// dsForm.js and fileBrowser.js
function DSFormAdvanceOption($section, container) {
    this.$section = $section;

    // add event listener
    $section.on("click", ".listInfo .expand, .listInfo .text", function() {
        $section.toggleClass("active");
        $(container).toggleClass("has-expand-list");
    });

    var $limit = $section.find(".option.limit");
    new MenuHelper($limit.find(".dropDownList"), {
        "onSelect": function($li) {
            var $input = $li.closest(".dropDownList").find(".unit");
            $input.val($li.text());
        },
        "container": container,
        "bounds"   : container
    }).setupListeners();

    xcHelper.optionButtonEvent($limit, function(option) {
        var $ele = $limit.find(".inputWrap, .dropDownList");
        if (option === "default") {
            $ele.addClass("xc-disabled");
        } else {
            $ele.removeClass("xc-disabled");
        }
    });

    var $pattern = $section.find(".option.pattern");
    $pattern.on("click", ".checkboxSection", function() {
        $(this).find(".checkbox").toggleClass("checked");
    });

    this.reset();

    return this;
}

DSFormAdvanceOption.prototype = {
    setMode: function() {
        var $section = this.$section;
        this.isInteractiveMod = (XVM.getLicenseMode() === XcalarMode.Mod);
        if (this.isInteractiveMod) {
            $section.addClass(XcalarMode.Mod);
            $section.find(".limit li:contains(TB)").hide();
        }
    },

    reset: function() {
        var $section = this.$section;
        $section.find("input").val("")
                .end()
                .find(".checked").removeClass("checked");

        this.set();
    },

    set: function(options) {
        options = options || {};

        var $section = this.$section;
        var $pattern = $section.find(".option.pattern");
        var $limit = $section.find(".option.limit");
        var hasSet;

        if (options.pattern != null && options.pattern !== "") {
            hasSet = true;
            $pattern.find("input").val(options.pattern);
        }

        if (options.isRecur) {
            hasSet = true;
            $pattern.find(".recursive .checkbox").addClass("checked");
        }

        if (options.isRegex) {
            hasSet = true;
            $pattern.find(".regex .checkbox").addClass("checked");
        }

        var previewSize = options.previewSize;
        if (previewSize != null && previewSize > 0) {
            hasSet = true;
            $limit.find(".radioButton[data-option='custom']").click();
        } else if (this.isInteractiveMod) {
            $limit.find(".radioButton[data-option='custom']").click();
            previewSize = UserSettings.getPref('DsDefaultSampleSize');
        } else {
            $limit.find(".radioButton[data-option='default']").click();
            previewSize = UserSettings.getPref('DsDefaultSampleSize');
        }

        this._changePreivewSize(previewSize);

        if (hasSet) {
            this._expandSection();
        }
    },

    modify: function(options) {
        options = options || {};
        var previewSize = options.previewSize;

        if (previewSize !== null && previewSize > 0) {
            this._changePreivewSize(previewSize);
        }
    },

    _changePreivewSize: function(previewSize) {
        var $limit = this.$section.find(".option.limit");
        var sizeArr = xcHelper.sizeTranslator(previewSize, true);

        if (!sizeArr) {
            $limit.find(".unit").val("GB");
            $limit.find(".size").val(10);
        } else {
            $limit.find(".unit").val(sizeArr[1]);
            $limit.find(".size").val(sizeArr[0]);
        }
    },

    _expandSection: function() {
        var $section = this.$section;
        if (!$section.hasClass("active")) {
            $section.find(".listInfo .expand").click();
        }
    },

    getArgs: function() {
        var $section = this.$section;
        var $limit = $section.find(".option.limit");
        var $customBtn = $limit.find(".radioButton[data-option='custom']");
        var previewSize = 0; // default size
        var size = "";
        var unit = "";

        if ($customBtn.hasClass("active")) {
            size = $limit.find(".size").val();
            var $unit = $limit.find(".unit");
            unit = $unit.val();
            // validate preview size
            if (size !== "" && unit === "") {
                this._expandSection();
                StatusBox.show(ErrTStr.NoEmptyList, $unit, false);
                return null;
            }
            previewSize = xcHelper.getPreviewSize(size, unit);

            var error = DataStore.checkSampleSize(previewSize);
            if (error != null) {
                this._expandSection();
                StatusBox.show(error, $unit, false);
                return null;
            }
        }

        var $pattern = $section.find(".option.pattern");
        var pattern = $pattern.find(".input").val().trim();
        var isRecur = $pattern.find(".recursive .checkbox").hasClass("checked");
        var isRegex = $pattern.find(".regex .checkbox").hasClass("checked");
        if (pattern === "") {
            pattern = null;
        }

        return {
            "pattern"    : pattern,
            "isRecur"    : isRecur,
            "isRegex"    : isRegex,
            "previewSize": previewSize
        };
    }
};

// dsPreview.js
function DSFormController() {
    return this;
}

DSFormController.prototype = {
    set: function(options) {
        optoins = options || {};

        if (options.path != null) {
            this.path = options.path;
        }

        if (options.format != null) {
            this.format = options.format;
        }
    },

    reset: function() {
        this.fieldDelim = "";
        this.lineDelim = "\n";
        this.hasHeader = false;
        this.quote = "\"";

        delete this.path;
        delete this.format;
    },

    getPath: function() {
        return this.path;
    },

    getFormat: function() {
        return this.format;
    },

    setFormat: function(format) {
        this.format = format;
    },

    useHeader: function() {
        return this.hasHeader;
    },

    setHeader: function(hasHeader) {
        if (hasHeader == null) {
            this.hasHeader = !this.hasHeader;
        } else {
            this.hasHeader = hasHeader;
        }
    },

    setFieldDelim: function(fieldDelim) {
        this.fieldDelim = fieldDelim;
    },

    getFieldDelim: function() {
        return this.fieldDelim;
    },

    setLineDelim: function(lineDelim) {
        this.lineDelim = lineDelim;
    },

    getLineDelim: function() {
        return this.lineDelim;
    },

    setQuote: function(quote) {
        this.quote = quote;
    },

    getQuote: function() {
        return this.quote;
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

function WorksheetScrollTracker() {
    this.positionMap = {};
    return this;
}

WorksheetScrollTracker.prototype = {
    cache: function(worksheetId) {
        this.positionMap[worksheetId] = $("#mainFrame").scrollLeft();
    },

    restore: function(worksheetId) {
        var leftPosition = this.positionMap[worksheetId];
        if (leftPosition != null) {
            $("#mainFrame").scrollLeft(leftPosition);
        }

        return leftPosition;
    }
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
        this.isRegex = options.isRegEx || false;
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
        // quoteChar, skipRows, isRegEx
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

                innerDeferred.resolve(jsons, jsonKeys);

            } catch (error) {
                console.error(error, value);
                innerDeferred.reject(error);
            }

            return innerDeferred.promise();
        }
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
    this.columns = options.columns; // Columns to export
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
    "addParameterizedNode": function(dagNodeId, oldParamNode, paramInfo) {
        this.parameterizedNodes[dagNodeId] = new RetinaNode(oldParamNode);
        this.updateParameterizedNode(dagNodeId, paramInfo);
    },

    "colorNodes": function(dagNodeId) {
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

    "updateParameterizedNode": function(dagNodeId, paramInfo) {
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

    "getParameterizedNode": function(dagNodeId) {
        return (this.parameterizedNodes[dagNodeId]);
    },

    "addParameter": function(name) {
        xcHelper.assert(!this.paramMap.hasOwnProperty(name), "Invalid name");

        this.parameters.push(name);
        this.paramMap[name] = null;
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

    "removeParameter": function(name) {
        var index = this.parameters.indexOf(name);

        xcHelper.assert((index >= 0), "Invalid name");

        this.parameters.splice(index, 1);
        delete this.paramMap[name];
    },

    // Function for modify schedule in the object
    "getSchedule": function() {
        return this.schedule;
    },

    "setSchedule": function(schedule) {
        this.schedule = schedule;
    },

    "removeSchedule": function() {
        this.schedule = null;
    },

    "hasSchedule": function() {
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
    "update": function(options) {
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
    this.$list = options.$list; // typically a ul element

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
                searchBar.scrollMatchIntoView($selectedMatch);
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
            return (this._scrollMatchIntoView($match));
        }
    },
    _scrollMatchIntoView: function($match) {
        var $list = this.$list;
        if (!$list || $list.length === 0) {
            return;
        }
        var listHeight = $list.height();
        var scrollTop = $list.scrollTop();
        var matchOffsetTop = $match.position().top;
        if (matchOffsetTop > (listHeight - 25)) {
            $list.scrollTop(matchOffsetTop + scrollTop - (listHeight / 2) + 30);
        } else if (matchOffsetTop < -5) {
            $list.scrollTop(scrollTop + matchOffsetTop - (listHeight / 2));
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

    "getOutputTableName": function() {
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
    if (options.exportFileName) {
        this.exportFileName = options.exportFileName;
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

/* Modal Helper */
// an object used for global Modal Actions
function ModalHelper($modal, options) {
    /* options include:
     * noResize: if set true, will not reszie the modal
     * noCenter: if set true, will not center the modal
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * noEnter: if set true, no event listener on key enter,
     * noBackground: if set true, no darkened modal background
     */
    this.$modal = $modal;
    this.options = options || {};
    this.id = $modal.attr("id");
    this.__init();
    return this;
}

ModalHelper.prototype = {
    __init: function() {
        var self = this;
        var $modal = self.$modal;
        var options = self.options;

        // full screen and exit full screen buttons
        var $fullScreenBtn = $modal.find('.fullScreen');
        var $exitFullScreenBtn = $modal.find('.exitFullScreen');
        if ($fullScreenBtn.length) {
            $fullScreenBtn.click(function() {
                var winWidth = $(window).width();
                var winHeight = $(window).height();
                $modal.width(winWidth - 14);
                $modal.height(winHeight - 9);
                $modal.css({
                    "top" : 0,
                    "left": Math.round((winWidth - $modal.width()) / 2)
                });
                if (options.resizeCallback) {
                    options.resizeCallback();
                }
            });

        }
        if ($exitFullScreenBtn.length) {
            // debugger;
            $exitFullScreenBtn.click(function() {
                // var winWidth = $(window).width();
                // var winHeight = $(window).height();
                var minWidth  = options.minWidth || 0;
                var minHeight = options.minHeight || 0;
                $modal.width(minWidth);
                $modal.height(minHeight);
                self.center();
                if (options.resizeCallback) {
                    options.resizeCallback();
                }
            });
        }
    },

    setup: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var $modal = this.$modal;
        var options = $.extend(this.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the modal
        $(".tooltip").hide();

        if (!options.keepFnBar) {
            FnBar.clear();
            $(".selectedCell").removeClass("selectedCell");
        }

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
            } else if (event.which === keyCode.Enter) {
                if (options.noEnter || $(":focus").hasClass('btn')) {
                    // let default behavior take over
                    return true;
                }
                var $btn = $modal.find('.modalBottom .btn:visible')
                                 .filter(function() {
                                    return (!$(this).hasClass('cancel') &&
                                            !$(this).hasClass('close'));
                                });
                if ($btn.length === 0) {
                    // no confirm button so treat as close
                    if (!$modal.hasClass('locked')) {
                        $modal.find(".modalHeader .close").click();
                    }
                } else if ($btn.length === 1) {
                    // trigger confirm
                    $btn.click();
                } else {
                    // multiple confirm buttons
                    StatusBox.show(ErrTStr.SelectOption,
                                    $modal.find('.modalBottom'), false,
                                    {type: "info", highZindex: true,
                                    offsetY: 12});
                }
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
                    $modalBg.css('display', 'block'); // when alert modal opens
                    // and drop table modal is open
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

    // This function prevents the user from clicking the submit button multiple
    // times
    disableSubmit: function() {
        xcHelper.disableSubmit(this.$modal.find(".confirm"));
    },

    // This function reenables the submit button after the checks are done
    enableSubmit: function() {
        xcHelper.enableSubmit(this.$modal.find(".confirm"));
    },

    clear: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var options = $.extend(this.options, extraOptions) || {};
        var $modal = this.$modal;
        var numModalsOpen = $('.modalContainer:visible').length;
        $(document).off("keydown.xcModal" + this.id);
        $(document).off("keydown.xcModalTabbing" + this.id);
        $modal.find(".focusable").off(".xcModal")
                                  .removeClass("focusable");
        this.enableSubmit();
        if (numModalsOpen) {
            $("body").removeClass("no-selection");
        }
        
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
                deferred.resolve();
            } else {
                if (numModalsOpen < 2) {
                    $modalBg.fadeOut(fadeOutTime, function() {
                        Tips.refresh();
                        deferred.resolve();
                    });
                } else {
                    Tips.refresh();
                    deferred.resolve();
                }
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
    // options:
    // time - fade out or fade in time in ms
    // opSection - if operations section is opening
    toggleBG: function(tableId, isHide, options) {
        var $modalBg = $("#modalBackground");
        var $mainFrame = $("#mainFrame");
        var $tableWrap;

        if (tableId === "all") {
            $tableWrap = $('.xcTableWrap:visible');
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

            if (tableId) {
                $('.xcTableWrap').not('#xcTableWrap-' + tableId)
                          .removeClass('tableDarkened tableOpSectionDarkened');
                $tableWrap.removeClass('modalOpen');
            }
        } else {
            // when open the modal
            if (tableId) {
                $tableWrap.addClass('modalOpen');
            }

            $mainFrame.addClass('modalOpen');
            var fadeInTime;
            if (options.time == null) {
                fadeInTime = 150;
            } else {
                fadeInTime = options.time;
            }
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
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
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
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden");
        }
    }
};

/* Export Helper */
function ExportHelper($view) {
    this.$view = $view;

    return this;
}

ExportHelper.getTableCols = function(tableId, validTypes) {
    // each li has data-colnum that will link it to the corresponding
    // xcTable header
    var html = "";
    var numBlanks = 10; // to take up flexbox space
    var allCols = gTables[tableId].getAllCols();

    allCols.forEach(function(progCol, index) {
        if (validTypes.indexOf(progCol.getType()) > -1) {
            var colName = progCol.getFrontColName(true);
            var colNum = (index + 1);
            html +=
                '<li class="checked" data-colnum="' + colNum + '">' +
                    '<span class="text tooltipOverflow" ' +
                    'data-original-title="' + colName + '" ' +
                    'data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body">' +
                        colName +
                    '</span>' +
                    '<div class="checkbox checked">' +
                        '<i class="icon xi-ckbox-empty fa-13"></i>' +
                        '<i class="icon xi-ckbox-selected fa-13"></i>' +
                    '</div>' +
                '</li>';
        }
    });

    for (var i = 0; i < numBlanks; i++) {
        html += '<div class="flexSpace"></div>';
    }
    return (html);
};

ExportHelper.prototype = {
    setup: function() {
        var self = this;
        var $renameSection = self.$view.find(".renameSection");
        $renameSection.on("click", ".renameIcon", function() {
            self._smartRename($(this).closest(".rename"));
        });
    },

    showHelper: function() {
        $('.xcTableWrap').addClass('exportMode');
    },

    clear: function() {
        this.$view.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
        $('.xcTableWrap').removeClass('exportMode');
    },

    clearRename: function() {
        this.$view.find(".renameSection").addClass("xc-hidden")
                    .find(".renamePart").empty();
    },

    getExportColumns: function() {
        var self = this;
        var colsToExport = [];
        var $colsToExport = self.$view.find('.columnsToExport');

        $colsToExport.find('.cols li.checked').each(function() {
            colsToExport.push($(this).text().trim());
        });

        return colsToExport;
    },

    checkColumnNames: function(columnNames) {
        if (columnNames == null) {
            return null;
        }

        var self = this;
        if (self.$view.find(".renameSection").hasClass("xc-hidden")) {
            // when need check name conflict
            return self._checkNameConflict(columnNames);
        } else {
            // when in rename step
            return self._checkRename(columnNames);
        }
    },

    _checkNameConflict: function(columnNames) {
        var self = this;
        var takenName = {};
        var invalidNames = [];
        var colNamesAfterCheck = [];

        columnNames.forEach(function(colName) {
            var parsedName = xcHelper.parsePrefixColName(colName).name;
            if (takenName.hasOwnProperty(parsedName)) {
                var nameWithConfilct = takenName[parsedName];
                // also need to include the name with conflict in rename
                if (!invalidNames.includes(nameWithConfilct)) {
                    invalidNames.push(nameWithConfilct);
                }
                invalidNames.push(colName);
            } else {
                takenName[parsedName] = colName;
                colNamesAfterCheck.push(parsedName);
            }
        });

        if (invalidNames.length > 0) {
            // when has name conflict
            self._addRenameRows(invalidNames);
            return null;
        } else {
            return colNamesAfterCheck;
        }
    },

    _checkRename: function(columnNames) {
        var self = this;
        var takenName = {};
        var renameMap = {};
        var invalid = false;

        // put all names first
        columnNames.forEach(function(colName) {
            takenName[colName] = true;
        });

        var $renameSection = self.$view.find(".renameSection");
        $renameSection.find(".rename").each(function() {
            var $row = $(this);
            var newName = $row.find(".newName").val();
            if (!newName) {
                StatusBox.show(ErrTStr.NoEmpty, $row);
                invalid = true;
                return false;
            }

            if (takenName.hasOwnProperty(newName)) {
                StatusBox.show(ErrTStr.NameInUse, $row);
                invalid = true;
                return false;
            }

            var origName = $row.find(".origName").val();
            renameMap[origName] = newName;
            takenName[newName] = true;
        });

        if (invalid) {
            return null;
        }

        var colNamesAfterCheck = [];
        columnNames.forEach(function(colName) {
            if (renameMap.hasOwnProperty(colName)) {
                colNamesAfterCheck.push(renameMap[colName]);
            } else {
                var parsedName = xcHelper.parsePrefixColName(colName).name;
                colNamesAfterCheck.push(parsedName);
            }
        });

        return colNamesAfterCheck;
    },

    _addRenameRows: function(columnsToRename) {
        var $renameSection = this.$view.find(".renameSection");
        var $renamePart = $renameSection.find(".renamePart");

        $renamePart.empty();

        for (var i = 0, len = columnsToRename.length; i < len; i++) {
            var $row = $(FormHelper.Template.rename);
            $row.find(".origName").val(columnsToRename[i]);
            $renamePart.append($row);
        }

        $renameSection.removeClass("xc-hidden");
    },

    _smartRename: function($colToRename) {
        var self = this;
        var origName = $colToRename.find(".origName").val();
        var currentColumNames = self.getExportColumns();
        var nameMap = {};

        // collect all existing names
        currentColumNames.forEach(function(columnName) {
            nameMap[columnName] = true;
        });

        $colToRename.siblings(".rename").each(function() {
            var columnName = $(this).find(".newName").val();
            if (columnName) {
                nameMap[columnName] = true;
            }
        });

        var parsedResult = xcHelper.parsePrefixColName(origName);
        var newName = parsedResult.prefix + "-" + parsedResult.name;
        var validName = newName;
        var tryCnt = 0;
        var maxTry = 20;

        while (nameMap.hasOwnProperty(validName) && tryCnt <= maxTry) {
            tryCnt++;
            validName = newName + tryCnt;
        }

        if (tryCnt > maxTry) {
            validName = xcHelper.randName(newName);
        }

        $colToRename.find(".newName").val(validName);
    }
};

/* Form Helper */
// an object used for global Form Actions
function FormHelper($form, options) {
    /* options include:
     * focusOnOpen: if set true, will focus on confirm btn when open form
     * noTabFocus: if set true, press tab will use browser's default behavior
     * noEsc: if set true, no event listener on key esc,
     * columnPicker: a object with column picker options, has attrs:
     *      state: the column picker's state
     *      mainMenuState: main menu's state before open the view
     *      noEvent: if set true, no picker event handler
     *      colCallback: called when click on column
     *      headCallback: called when click on table head
     */
    this.$form = $form;
    this.options = options || {};
    this.id = $form.attr("id");
    this.state = null;
    this.mainMenuState = null;

    this.init();

    return this;
}

FormHelper.Template = {
    "rename": '<div class="rename">' +
                '<input class="columnName origName arg" type="text" ' +
                'spellcheck="false" disabled/>' +
                '<div class="middleIcon">' +
                    '<div class="renameIcon iconWrapper">' +
                        '<i class="icon xi-play-circle fa-14"></i>' +
                    '</div>' +
                '</div>' +
                '<input class="columnName newName arg" type="text" ' +
                  'spellcheck="false"/>' +
            '</div>'
};

FormHelper.prototype = {
    // called only once per form upon creation
    init: function() {
        // tooltip overflow setup
        var self = this;
        var $form = self.$form;
        $form.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });
    },

    // called everytime the form opens
    setup: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var self = this;
        var $form = self.$form;
        var options = $.extend(self.options, extraOptions) || {};

        $("body").addClass("no-selection");
        xcHelper.removeSelectionRange();
        // hide tooltip when open the form
        $(".tooltip").hide();
        $(".selectedCell").removeClass("selectedCell");
        FnBar.clear();

        // Note: to find the visiable btn, must show the form first
        if (!options.noTabFocus) {
            self.refreshTabbing();
        }

        $(document).on("keydown.xcForm", function(event) {
            if (event.which === keyCode.Escape) {
                if (options.noEsc) {
                    return true;
                }
                $form.find(".close").click();
                return false;
            }
        });

        // setup columnPicker
        var columnPicker = options.columnPicker || {};
        self.state = "columnPicker";
        if (columnPicker.state != null) {
            self.state += " " + columnPicker.state;
            $("#container").addClass(self.state);
        }

        // see table.less of the class
        // it stop some default events
        $(".xcTableWrap").addClass('columnPicker');

        if (!columnPicker.noEvent) {
            var colSelector = ".xcTable .header, .xcTable td.clickable";
            $("#mainFrame").on("click.columnPicker", colSelector, function(event) {
                var callback = columnPicker.colCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                var $target = $(event.target);
                if ($target.closest('.dataCol').length ||
                    $target.closest('.jsonElement').length ||
                    $target.closest('.dropdownBox').length) {
                    return;
                }
                callback($target);
            });

            var headSelector = ".xcTheadWrap";
            $("#mainFrame").on("click.columnPicker", headSelector, function(event) {
                var callback = columnPicker.headCallback;
                if (callback == null || !(callback instanceof Function)) {
                    return;
                }
                var $eventTarget = $(event.target);
                if ($eventTarget.closest('.dropdownBox').length) {
                    return;
                }
                var $target = $eventTarget.closest('.xcTheadWrap');
                if ($target.length === 0) {
                    // error case
                    console.error("no header");
                    return;
                }
                callback($target);
            });
        }

        // this should be the last step
        if (options.open != null && options.open instanceof Function) {
            // if options.open is not a promise, make it a promise
            jQuery.when(options.open())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            $form.show();
            Tips.refresh();
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormOpen();
        }

        return deferred.promise();
    },

    showView: function() {
        this.mainMenuState = MainMenu.getState();
        $("#workspaceMenu").find(".menuSection").addClass("xc-hidden");
        this.$form.removeClass("xc-hidden");

        var wasMenuOpen = false;
        if (MainMenu.isMenuOpen("mainMenu")) {
            BottomMenu.close(true);
            wasMenuOpen = true;
        } else {
            MainMenu.open();
            // due to lag if many columns are present, do another table
            // alignment 600 ms after menu opens
            setTimeout(function() {
                if (MainMenu.isMenuOpen("mainMenu")) {
                    moveTableDropdownBoxes();
                    moveTableTitles();
                    moveFirstColumn(); 
                }
            }, 600);
        }

        return wasMenuOpen;
    },

    hideView: function() {
        this.$form.addClass('xc-hidden');
        if (this.mainMenuState != null) {
            MainMenu.restoreState(this.mainMenuState);
            this.mainMenuState = null;
        }
    },

    checkBtnFocus: function() {
        // check if any button is on focus
        return (this.$form.find(".btn:focus").length > 0);
    },

    // This function prevents the user from clicking the submit button multiple
    // times
    disableSubmit: function() {
        xcHelper.disableSubmit(this.$form.find(".confirm"));
    },

    // This function reenables the submit button after the checks are done
    enableSubmit: function() {
        xcHelper.enableSubmit(this.$form.find(".confirm"));
    },

    clear: function(extraOptions) {
        var deferred = jQuery.Deferred();
        var self = this;
        var options = $.extend(self.options, extraOptions) || {};
        var $form = self.$form;

        $(document).off("keydown.xcForm");
        $(document).off("keydown.xcFormTabbing");
        $form.find(".focusable").off(".xcForm")
                                  .removeClass("focusable");
        $(".xcTableWrap").removeClass("columnPicker");
        $("#mainFrame").off("click.columnPicker");
        $("#container").removeClass(self.state);
        self.state = null;
        self.enableSubmit();

        $("body").removeClass("no-selection");

        if (options.close != null && options.close instanceof Function) {
            jQuery.when(options.close())
            .then(deferred.resolve)
            .fail(deferred.reject)
            .always(function() {
                Tips.refresh();
            });
        } else {
            Tips.refresh();
            deferred.resolve();
        }

        if ($form.closest('#mainMenu').length) {
            MainMenu.setFormClose();
        }

        return deferred.promise();
    },

    addWaitingBG: function(options) {
        options = options || {};
        var heightAdjust = options.heightAdjust || 0;
        var transparent = options.transparent || false;
        var $form = this.$form;
        var waitingBg = '<div id="formWaitingBG">' +
                            '<div class="waitingIcon"></div>' +
                        '</div>';
        $form.append(waitingBg);
        var $waitingBg =  $('#formWaitingBG');
        if (transparent) {
            $waitingBg.addClass('transparent');
        } else {
            $waitingBg.removeClass('transparent');
        }
        var modalHeaderHeight = $form.children('header').height() || 0;
        var modalHeight = $form.height();

        $waitingBg.height(modalHeight + heightAdjust - modalHeaderHeight)
                  .css('top', modalHeaderHeight);
        setTimeout(function() {
            $waitingBg.find('.waitingIcon').fadeIn();
        }, 200);
    },

    removeWaitingBG: function() {
        if (gMinModeOn) {
            $('#formWaitingBG').remove();
        } else {
            $('#formWaitingBG').fadeOut(200, function() {
                $(this).remove();
            });
        }
    },

    refreshTabbing: function() {
        var $form = this.$form;

        $(document).off("keydown.xcFormTabbing");

        $form.find(".focusable").off(".xcForm")
                                 .removeClass("focusable");

        var eleLists = [
            $form.find("button.btn, input:visible")
        ];

        var $focusables = [];
        // make an array for all focusable element
        eleLists.forEach(function($eles) {
            $eles.each(function() {
                $focusables.push($(this));
            });
        });

        // check if element already has focus and set focusIndex;
        var focusIndex;
        if (eleLists[0].index($(':focus')) > -1) {
            focusIndex = eleLists[0].index($(':focus')) + 1;
        } else {
            focusIndex = 0;
        }

        for (var i = 0, len = $focusables.length; i < len; i++) {
            addFocusEvent($focusables[i], i);
        }

        // focus on the right most button
        if (this.options.focusOnOpen) {
            getEleToFocus();
        }

        $(document).on("keydown.xcFormTabbing", function(event) {
            if (event.which === keyCode.Tab) {
                 // for switch between modal tab using tab key
                event.preventDefault();
                getEleToFocus();

                return false;
            }
        });

        function addFocusEvent($focusable, index) {
            $focusable.addClass("focusable").data("tabid", index);
            $focusable.on("focus.xcForm", function() {
                var $ele = $(this);
                if (!isActive($ele)) {
                    return;
                }
                focusOn($ele.data("tabid"));
            });
        }

        // find the input or button that is visible and not disabled to focus
        function getEleToFocus() {
            if (!$focusables.length) {
                focusIndex = -1;
                return;
            }
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
                    !$ele.is("[readonly]") && !$ele.hasClass("unavailable") &&
                    !$ele.hasClass("btn-disabled") &&
                    $ele.css('visibility') !== "hidden");
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
            UserSettings.setPref(prefName, val, true);
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
        UserSettings.setPref(self.prefName, val, true);
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
        UserSettings.setPref(self.prefName, val, true);
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
    this.id = MenuHelper.counter;

    this.timer = {
        "fadeIn"           : null,
        "fadeOut"          : null,
        "setMouseMoveFalse": null,
        "hovering"         : null,
        "scroll"           : null,
        "mouseScroll"      : null
    };

    this.setupListScroller();
    MenuHelper.counter++;
}

MenuHelper.counter = 0; // used to give each menu a unique id

MenuHelper.prototype = {
    setupListeners: function() {
        var self = this;
        var options = self.options;
        var $dropDownList = self.$dropDownList;
        // toggle list section
        if (options.onlyClickIcon) {
            $dropDownList.on("click", ".iconWrapper", function(event) {
                event.stopPropagation();
                self.toggleList($(this).closest(".dropDownList"));
            });
        } else {
            $dropDownList.addClass('yesclickable');

            $dropDownList.on("click", function(event) {
                if (self.exclude &&
                    $(event.target).closest(self.exclude).length) {
                    return;
                }
                event.stopPropagation();
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
                // keep Open may return weird tings
                if (keepOpen === true) {
                    return;
                }

                self.hideDropdowns();
            },
            "mouseenter": function() {
                $(this).addClass("hover");

            },
            "mouseleave": function() {
                $(this).removeClass("hover");
            }
        }, ".list li");

        return this;
    },
    hideDropdowns: function() {
        var self = this;
        var $sections = self.$container.find(".dropDownList");
        $sections.find(".list").hide().removeClass("openList");
        $sections.removeClass("open");
        $(document).off('click.closeDropDown' + self.id);
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
            $(document).on('click.closeDropDown' + self.id, function() {
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

        var listHeight = offsetTop + $bounds.outerHeight() - $list.offset().top -
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
