(function createCurrentConstructors(win) {
    var parentVersion = currentVersion;
    var version = null;
    var __isCurrentVersion = function(options) {
        return (options == null ||
                options.version == null ||
                options.version === currentVersion);
    };
    // kvStore.js
    win.METAConstructor = (function() {
        var _super = __getConstructor("METAConstructor", parentVersion);
        var METAKeys = new _super().getMetaKeys();

        function METAConstructor(oldMeta) {
            oldMeta = oldMeta || {};
            xcAssert(__isCurrentVersion(oldMeta));
            var self = _super.call(this, oldMeta);

            METAConstructor.restore(self, oldMeta, version);
            return self;
        }

        __extends(METAConstructor, _super, {
            update: function() {
                // basic thing to store
                this[METAKeys.TI] = savegTables();
                this[METAKeys.WS] = WSManager.getAllMeta();
                this[METAKeys.AGGS] = Aggregates.getAggs();
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
                        delete table.resultSetMax;
                        delete table.numPages;
                        delete table.ordering;
                        delete table.backTableMeta;
                    }

                    return persistTables;
                }
            },

            getTableMeta: function() {
                return this[METAKeys.TI];
            },

            getWSMeta: function() {
                return this[METAKeys.WS];
            },

            getAggMeta: function() {
                return this[METAKeys.AGGS];
            },

            getCartMeta: function() {
                return this[METAKeys.CART];
            },

            getStatsMeta: function() {
                return this[METAKeys.STATS];
            },

            getLogCMeta: function() {
                return this[METAKeys.LOGC];
            },

            getTpfxMeta: function() {
                return this[METAKeys.TPFX];
            },

            getQueryMeta: function() {
                return this[METAKeys.QUERY];
            }
        });

        return METAConstructor;
    }());

    // kvStore.js
    win.EMetaConstructor = (function() {
        var _super = __getConstructor("EMetaConstructor", parentVersion);
        var EMetaKeys = new _super().getMetaKeys();

        function EMetaConstructor(oldMeta) {
            oldMeta = oldMeta || {};
            xcAssert(__isCurrentVersion(oldMeta));
            var self = _super.call(this);

            EMetaConstructor.restore(self, oldMeta, version);
            return self;
        }

        __extends(EMetaConstructor, _super, {
            update: function() {
                // update
                this[EMetaKeys.DF] = DF.getAllCommitKeys();
                return this;
            },

            getDFMeta: function() {
                return this[EMetaKeys.DF];
            }
        });

        return EMetaConstructor;
    }());

    // userSettings.js
    win.UserInfoConstructor = (function() {
        var _super = __getConstructor("UserInfoConstructor", parentVersion);
        var UserInfoKeys = new _super().getMetaKeys();

        function UserInfoConstructor(oldMeta) {
            oldMeta = oldMeta || {};
            xcAssert(__isCurrentVersion(oldMeta));
            var self = _super.call(this);

            UserInfoConstructor.restore(self, oldMeta, version);
            return self;
        }

        __extends(UserInfoConstructor, _super, {
            update: function() {
                this[UserInfoKeys.DS] = DS.getHomeDir();
                this[UserInfoKeys.PREF] = UserSettings.getAllPrefs();
            },

            getPrefInfo: function() {
                return this[UserInfoKeys.PREF];
            },

            getDSInfo: function() {
                return this[UserInfoKeys.DS];
            }
        });

        return UserInfoConstructor;
    }());

    // authentication.js
    win.XcAuth = (function() {
        var _super = __getConstructor("XcAuth", parentVersion);
        function XcAuth(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(XcAuth, _super, {
            getHashTag: function() {
                return this.hashTag;
            },

            getIdCount: function() {
                return this.idCount;
            },

            incIdCount: function() {
                this.idCount++;
                return this.idCount;
            }
        });

        return XcAuth;
    }());

    // sql.js
    win.XcLog = (function() {
        var _super = __getConstructor("XcLog", parentVersion);
        function XcLog(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(XcLog, _super, {
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
        });

        return XcLog;
    }());

    // Constructor for table meta data
    win.TableMeta = (function() {
        var _super = __getConstructor("TableMeta", parentVersion);
        function TableMeta(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));
            var self = _super.call(this, options);

            // TableMeta.initializeProgCol is inherited from super class
            self.tableCols = TableMeta.restoreProgCol(options.tableCols,
                                                      version);

            return self;
        }

        __extends(TableMeta, _super, {
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

            addNoDelete: function() {
                this.noDelete = true;
            },

            removeNoDelete: function() {
                this.noDelete = false;
            },

            isNoDelete: function() {
                return this.noDelete;
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

            sortCols: function(sortKey, order) {
                sortKey = sortKey || ColumnSortType.name;

                this.tableCols.sort(function(a, b) {
                    if (sortKey === ColumnSortType.type) {
                        aVal = a.getType();
                        bVal = b.getType();
                    } else if (sortKey === ColumnSortType.prefix) {
                        aVal = a.getPrefix();
                        bVal = b.getPrefix();
                    } else {
                        // sort by name
                        aVal = a.getFrontColName();
                        bVal = b.getFrontColName();
                    }

                    var res = xcHelper.sortVals(aVal, bVal, order);
                    if (res === 0 && sortKey !== ColumnSortType.name) {
                        // when equal, sort by name
                        aVal = a.getFrontColName();
                        bVal = b.getFrontColName();
                        res = xcHelper.sortVals(aVal, bVal, order);
                    }

                    return res;
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
                    self.numPages = Math.ceil(self.resultSetCount /
                                                gNumEntriesPerPage);

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

            __getColMeta: function(isImmediate, meta) {
                var res = [];
                if (this.backTableMeta != null &&
                    this.backTableMeta.hasOwnProperty("valueAttrs"))
                {
                    this.backTableMeta.valueAttrs.forEach(function(attr) {
                        var isTypeImmediate = (attr.type !== DfFieldTypeT.DfFatptr);
                        var shouldAddMeta = (isImmediate && isTypeImmediate)
                                            || (!isImmediate && !isTypeImmediate);
                        if (shouldAddMeta) {
                            if (meta == null) {
                                res.push(attr);
                            } else {
                                res.push(attr[meta]);
                            }
                        }
                    });
                }

                return res;
            },

            getImmediates: function() {
                return this.__getColMeta(true);
            },

            getFatPtr: function() {
                return this.__getColMeta(false);
            },

            getImmediateNames: function() {
                return this.__getColMeta(true, "name");
            },

            getFatPtrNames: function() {
                return this.__getColMeta(false, "name");
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
                    var valueAttrs = self.backTableMeta.valueAttrs;
                    var found = valueAttrs.some(function(valueAttr) {
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
                xcAssert(Number.isInteger(rowNum));

                if (this.bookmarks.indexOf(rowNum) < 0) {
                    this.bookmarks.push(rowNum);
                } else {
                    // error case
                    console.error("Duplicate bookmark in", rowNum);
                }
            },

            removeBookmark: function(rowNum) {
                xcAssert(Number.isInteger(rowNum));

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
                var $curTable = $("#xcTable-" + curId);
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
        });

        return TableMeta;

    }());

    // inner part of progCol
    win.ColFunc = (function() {
        var _super = __getConstructor("ColFunc", parentVersion);
        function ColFunc(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(ColFunc, _super);

        return ColFunc;
    }());

    win.ProgCol = (function() {
        var _super = __getConstructor("ProgCol", parentVersion);
        function ProgCol(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));
            var self = _super.call(this, options);

            self.func = new ColFunc(options.func);
            return self;
        }

        __extends(ProgCol, _super, {
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
                xcAssert(typeof name === "string" && name !== "");
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
                if (this.isMinimized) {
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

            minimize: function() {
                this.isMinimized = true;
            },

            maximize: function() {
                this.isMinimized = false;
            },

            hasMinimized: function() {
                return this.isMinimized;
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
        });

        return ProgCol;
    }());

    // aggregates.js
    win.Agg = (function() {
        var _super = __getConstructor("Agg", parentVersion);
        function Agg(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(Agg, _super);

        return Agg;
    }());

    // userSettings.js
    win.GenSettings = (function() {
        var _super = __getConstructor("GenSettings", parentVersion);
        function GenSettings(userConfigParms, options) {
            var self = _super.call(this, userConfigParms, options);
            return self;
        }

        __extends(GenSettings, _super, {
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
                return new GenSettings(null, {
                    "adminSettings": this.adminSettings,
                    "xcSettings": this.xcSettings
                });
            }
        });

        return GenSettings;
    }());

    // userSettings.js
    win.UserPref = (function() {
        var _super = __getConstructor("UserPref", parentVersion);
        function UserPref(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(UserPref, _super, {
            update: function() {
                this.datasetListView = $("#dataViewBtn").hasClass("listView");
                this.browserListView = $("#fileBrowserGridView")
                                        .hasClass("listView");
                this.keepJoinTables = $("#joinView").find(".keepTablesCBWrap")
                                                     .find(".checkbox")
                                                     .hasClass("checked");
                return this;
            }
        });

        return UserPref;
    }());

    // dsCart.js
    // inner part of Cart
    win.CartItem = (function() {
        var _super = __getConstructor("CartItem", parentVersion);
        function CartItem(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(CartItem, _super);

        return CartItem;
    }());

    // dsCart.js
    win.Cart = (function() {
        var _super = __getConstructor("Cart", parentVersion);
        function Cart(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));
            var self = _super.call(this, options);

            self.items = Cart.restoreItem(options.items, version);
            return self;
        }

        __extends(Cart, _super, {
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
        });

        return Cart;
    }());

    win.WorksheetObj = (function() {
        var _super = __getConstructor("WorksheetObj", parentVersion);
        function WorksheetObj(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(WorksheetObj, _super, {
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
            }
        });

        return WorksheetObj;
    }());

    // worksheet.js
    win.WSMETA = (function() {
        var _super = __getConstructor("WSMETA", currentVersion);
        function WSMETA(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));

            var self = _super.call(this, options);

            self.wsInfos = WSMETA.restoreWSInfos(options.wsInfos, version);
            return self;
        }

        __extends(WSMETA, _super);

        return WSMETA;
    }());

    // workbook.js
    win.WKBK = (function() {
        var _super = __getConstructor("WKBK", parentVersion);
        function WKBK(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(WKBK, _super, {
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
                return this.noMeta;
            }
        });

        return WKBK;
    }());

    // profile.js
    win.ProfileAggInfo = (function() {
        var _super = __getConstructor("ProfileAggInfo", parentVersion);
        function ProfileAggInfo(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(ProfileAggInfo, _super);

        return ProfileAggInfo;
    }());

    // profile.js
    win.ProfileStatsInfo = (function() {
        var _super = __getConstructor("ProfileStatsInfo", parentVersion);
        function ProfileStatsInfo(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(ProfileStatsInfo, _super);

        return ProfileStatsInfo;
    }());

    // profile.js
    win.ProfileGroupbyInfo = (function() {
        var _super = __getConstructor("ProfileGroupbyInfo", parentVersion);
        function ProfileGroupbyInfo(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));
            var self = _super.call(this, options);

            self.buckets = ProfileGroupbyInfo.restoreBuckets(options.buckets,
                                                             version);
            return self;
        }

        __extends(ProfileGroupbyInfo, _super);

        return ProfileGroupbyInfo;
    }());

    // profile.js
    win.ProfileBucketInfo = (function() {
        var _super = __getConstructor("ProfileBucketInfo", parentVersion);
        function ProfileBucketInfo(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(ProfileBucketInfo, _super);

        return ProfileBucketInfo;
    }());

    // profile.js
    win.ProfileInfo = (function() {
        var _super = __getConstructor("ProfileInfo", parentVersion);
        function ProfileInfo(options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));
            var self = _super.call(this, options);

            var restoreInfos = ProfileInfo.restoreInfos(options, version);
            self.aggInfo = restoreInfos.aggInfo;
            self.statsInfo = restoreInfos.statsInfo;
            self.groupByInfo = restoreInfos.groupByInfo;
            return self;
        }

        __extends(ProfileInfo, _super, {
            addBucket: function(bucketNum, options) {
                this.groupByInfo.buckets[bucketNum] = new ProfileBucketInfo(options);
            },

            getId: function() {
                return this.id;
            }
        });

        return ProfileInfo;
    }());

    /*** Start of DSObj ***/
    /* datastore.js */
    win.DSObj = (function() {
        var _super = __getConstructor("DSObj", parentVersion);
        function DSObj(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(DSObj, _super, {
            addToParent: function() {
                if (this.parentId !== DSObjTerm.homeParentId) {
                    var parent = DS.getDSObj(this.parentId);
                    parent.eles.push(this);
                    // update totalChildren of all ancestors
                    this.updateDSCount();
                }
            },

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
                // quoteChar, skipRows, pattern
                var self = this;
                var pattern = xcHelper.getFileNamePattern(self.pattern,
                                                          self.isRegex);

                return [self.path, self.format, self.fullName,
                    self.fieldDelim, self.lineDelim, self.hasHeader,
                    self.moduleName, self.funcName, self.isRecur, self.previewSize,
                    self.quoteChar, self.skipRows, pattern];
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
                        return XcalarFetchData(self.resultSetId, rowToGo,
                                                rowsToFetch,
                                                self.numEntries, []);
                    })
                    .then(innerDeferred.resolve)
                    .fail(function(error) {
                        if (error.status === StatusT.StatusInvalidResultSetId) {
                            // when old result is invalid
                            self.makeResultSet()
                            .then(function() {
                                return XcalarFetchData(self.resultSetId, rowToGo,
                                                        rowsToFetch,
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
                            // fields called recordNum, if more than one recordNum
                            // in json, only one recordNum will be in the
                            // parsed obj, which is incorrect behavior
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
                        "$ele": DS.getGrid(self.id),
                        "error": ErrTStr.NoSpecialChar,
                        "check": function() {
                            return !xcHelper.checkNamePattern("folder", "check",
                                                              newName);
                        }
                    },
                    {
                        "$ele": DS.getGrid(self.id),
                        "error": error,
                        "check": function() {
                            return (parent.checkNameConflict(self.id, newName,
                                                             self.isFolder));
                        }
                    },
                    {
                        "$ele": DS.getGrid(self.id),
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
                var index = parent.eles.indexOf(this);

                parent.eles.splice(index, 1);    // remove from parent
                // update totalChildren count of all ancestors
                this.updateDSCount(true);
                this.parentId = -1;

                return this;
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

                $grid.attr("data-dsParentId", newParent.id);

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
        });

        return DSObj;
    }());
    /* End of DSObj */

    /* Start of Dataflow */
    /* dataflow.js */
    // a inner part of Dataflow
    // Stores the original values for the parameterized node
    win.RetinaNode = (function() {
        var _super = __getConstructor("RetinaNode", parentVersion);
        function RetinaNode(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(RetinaNode, _super);

        return RetinaNode;
    }());

    win.Dataflow = (function() {
        var _super = __getConstructor("Dataflow", parentVersion);
        function Dataflow(name, options) {
            options = options || {};
            xcAssert(__isCurrentVersion(options));

            var self = _super.call(this, name, options);

            var restoreInfos = Dataflow.restoreInfos(options, version);
            self.parameterizedNodes = restoreInfos.parameterizedNodes;
            self.schedule = restoreInfos.schedule;
            return self;
        }

        __extends(Dataflow, _super, {
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

                var $nodeOrAction = $("#dataflowPanel")
                                    .find('[data-id="' + dagNodeId + '"]');
                // Exception is for export.
                // XXX Consider attaching the id to the table
                // node instead of the operation during draw dag.
                // I think it will clean
                // up a lot of the exception cases here
                if ($nodeOrAction.hasClass("export")) {
                    $nodeOrAction = $nodeOrAction.next(".dagTable");
                }
                $nodeOrAction.addClass("hasParam");
                return $nodeOrAction;
            },

            updateParameterizedNode: function(dagNodeId, paramInfo) {
                var $tableNode = this.colorNodes(dagNodeId);
                if (paramInfo.paramType === XcalarApisT.XcalarApiExport) {
                    var $elem = $tableNode.find(".tableTitle");
                    $elem.text(paramInfo.paramValue);
                    var text = xcHelper.convertToHtmlEntity(paramInfo.paramValue);
                    xcTooltip.changeText($elem, text);
                } else if (paramInfo.paramType === XcalarApisT.XcalarApiFilter) {
                    $tableNode.find(".parentsTitle").text("<Parameterized>");
                }
                $tableNode.data("paramValue", encodeURI(paramInfo.paramValue));
            },

            getParameterizedNode: function(dagNodeId) {
                return this.parameterizedNodes[dagNodeId];
            },

            addParameter: function(name) {
                xcAssert(!this.paramMap.hasOwnProperty(name), "Invalid name");
                this.parameters.push(name);
                this.paramMap[name] = null;
            },

            getParameter: function(paramName) {
                return this.paramMap[paramName];
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

                return res;
            },

            updateParameters: function(params) {
                var paramMap = this.paramMap;

                params.forEach(function(param) {
                    var name = param.name;
                    var val  = param.val;
                    xcAssert((paramMap.hasOwnProperty(name) ||
                        systemParams.hasOwnProperty(name)), "Invalid name");
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
                            return true;
                        }
                    }
                }

                return false;
            },

            removeParameter: function(name) {
                var index = this.parameters.indexOf(name);

                xcAssert((index >= 0), "Invalid name");

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
            }
        });

        return Dataflow;
    }());
    /* End of Dataflow */

    /* Start of Schedule */
    win.SchedObj = (function() {
        var _super = __getConstructor("SchedObj", parentVersion);
        function SchedObj(options) {
            var self = _super.call(this, options);

            // XXX should be removed when bump to version 2
            if (currentVersion === 1) {
                console.log("please remove it in version 2")
                delete self.recur;
                self.created = options.created;
                self.activeSession = options.activeSession;
                self.newTableName = options.newTableName;
                self.usePremadeCronString = options.usePremadeCronString;
                self.premadeCronString = options.premadeCronString;
            }

            return self;
        }

        __extends(SchedObj, _super, {
            update: function(options) {
                options = options || {};
                this.startTime = options.startTime;
                this.dateText = options.dateText;
                this.timeText = options.timeText;
                this.repeat = options.repeat;
                this.modified = options.modified;
                this.activeSession = options.activeSession;
                this.newTableName = options.newTableName;
                this.usePremadeCronString = options.usePremadeCronString;
                this.premadeCronString = options.premadeCronString;
            }
        });

        return SchedObj;
    }());
    /* End of SchedObj */

    /* Query */
    win.XcQuery = (function() {
        var _super = __getConstructor("XcQuery", parentVersion);
        function XcQuery(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(XcQuery, _super, {
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
                    return "";
                }
            },

            getOutputTableName: function() {
                var subQueries = this.subQueries;
                if (this.state === "done") {
                    if (this.outputTableName) {
                        return this.outputTableName;
                    }
                    if (!subQueries.length) {
                        console.warn("no subQueries were added to the mainQuery:",
                                     this.name);
                        return null;
                    } else {
                        var lastSubQuery = subQueries[subQueries.length - 1];
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

            getOutputTableState: function() {
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
        });

        return XcQuery;
    }());
    /* End of Query */
}(window));
