var versionV1 = 1;
// kvStore.js
var METAConstructorV1 = (function() {
    var METAKeys = {
        "TI"   : "TILookup",
        "WS"   : "worksheets",
        "AGGS" : "aggregates",
        "CART" : "datacarts",
        "STATS": "statsCols",
        "LOGC" : "sqlcursor",
        "TPFX" : "tablePrefix",
        "QUERY": "query"
    };

    /* Attr:
        version: 1
        METAKeys.TI: (obj) table meta
        METAKeys.WS: (obj) worksheet meta
        METAKeys.AGGS: (obj) agg meta
        METAKeys.CART: (obj) cart meta
        METAKeys.STATS: (obj) profile meta
        METAKeys.LOGC: (integer) log cursor position
        METAKeys.TPFX: (obj) table prefix meta
        METAKeys.QUERY: (obj) query meta
    */
    function METAConstructorV1() {
        this.version = versionV1;
        return this;
    }

    METAConstructorV1.prototype = {
        getMetaKeys: function() {
            return METAKeys;
        }
    };

    return METAConstructorV1;
}());

// kvStore.js
var EMetaConstructorV1 = (function() {
    var EMetaKeys = {
        "DF": "DF"
    };

    /* Attr:
        version: 1
        EMetaKeys.DF: (obj) dataflow meta
    */
    function EMetaConstructorV1() {
        this.version = versionV1;
        return this;
    }

    EMetaConstructorV1.prototype = {
        getMetaKeys: function() {
            return EMetaKeys;
        }
    };

    return EMetaConstructorV1;
}());

// userSettings.js
var UserInfoConstructorV1 = (function() {
    var UserInfoKeys = {
        "DS"  : "gDSObj",
        "PREF": "userpreference"
    };

    /* Attr:
        version: 1
        UserInfoKeys.DS: (obj) datasets meta
        UserInfoKeys.PREF: (obj) user preference meta
    */
    function UserInfoConstructorV1() {
        this.version = versionV1;
        return this;
    }

    UserInfoConstructorV1.prototype = {
        getMetaKeys: function() {
            return UserInfoKeys;
        }
    };

    return UserInfoConstructorV1;
}());

// version.js
var XcVersionV1 = (function() {
    /* Attr:
        version: 1,
        fullVersion: (string) full version of GUI
        SHA: (string) SHA key
    */
    function XcVersionV1(options) {
        options = options || {};

        this.version = versionV1;
        this.fullVersion = options.fullVersion;
        this.SHA = options.SHA;
        return this;
    }

    return XcVersionV1;
}());

// authentication.js
var XcAuthV1 = (function() {
    /* Attr:
        version: 1,
        idCount: (integer) current id num,
        hasTag: (string) 2 characters string
    */
    function XcAuthV1(options) {
        options = options || {};

        this.version = versionV1;
        this.idCount = options.idCount || 0;
        this.hashTag = options.hashTag;

        return this;
    }

    return XcAuthV1;
}());

// sql.js
var XcLogV1 = (function() {
    /* Attr:
        version: 1,
        title: (string) log's title,
        options: (obj) log's options
        cli: (string, optional) cli log
        error: (any, optional) error log
        sqlType: (string, optional) log's type
        timestamp: (date) time
    */
    function XcLogV1(args) {
        this.version = versionV1;
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

    return XcLogV1;
}());

// Constructor for table meta data
var TableMetaV1 = (function() {
    /* Attr
        version: 1,
        tableName: (string) table's name
        tableId: (string) table's id
        isLocked: (boolean) if table is locked
        status: (string) enums of TableType
        timeStamp: (date) last change time
        tableCols: (array) ProgCols
        bookmarks: (array) row bookmark cache
        rowHeights: (obj) row height cache
        currentRowNumber: (integer, not persist) current row number
        resultSetId: (string) result id
        icv: (string), icv table

        keyName: (string, not persist) column on index
        resultSetCount: (integer, not persist) total row num
        resultSetMax: (integer, not persist) ?
        numPages: (integer, not persist) num of pages
        backTableMeta: (obj, not persist) backTableMeta
    */
    function TableMetaV1(options) {
        var self = this;
        options = options || {};

        if (!options.tableName || !options.tableId) {
            throw "error table meta!";
        }

        self.version = versionV1;
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


        self.icv = options.icv || "";
        self.keyName = ""; // placeholder
        self.ordering = null; // placeholder
        self.backTableMeta = null; // placeholder
        self.resultSetCount = -1; // placeholder
        self.resultSetMax = -1; // placeholder
        self.numPages = -1; // placeholder

        return this;
    }

    return TableMetaV1;
}());

var ColFuncV1 = (function() {
    /* Attr
        version: 1,
        name: (string) col func's name
        args: (array) col func's arguments
    */
    function ColFuncV1(options) {
        options = options || {};

        this.version = versionV1;
        this.name = options.name;
        this.args = options.args || [];

        return this;
    }

    return ColFuncV1;
}());

var ProgColV1 = (function() {
    /* Attr
        version: 1
        name: (string) front column name
        backName: (string) back column name,
        prefix: (string, not persist) striped from backName
        immediate: (boolean) immdiate or fat ptr
        type: (string) enums in ColumnType
        knownType: (boolean) if the type is known or just a guess
        childOfArray: (boolean) if is child of array
        isNewCol: (boolean) if is new column
        isHidden: (boolean) columns is hidden or not
        width: (number) column width
        format: (string) enums in ColFormat
        decimal: (integer) num of decimals
        sizedToHeader: (boolean) if size to header
        textAlign: (string) enums in ColTextAlign
        userStr: (string) user string
        func: (ColFunc) func info
    */
    function ProgColV1(options) {
        var defaultOptions = {
            "childOfArray" : false,
            "decimal"      : -1,
            "format"       : null,
            "immediate"    : false,
            "knownType"    : false,
            "isHidden"     : false,
            "isNewCol"     : true,
            "name"         : "",
            "sizedToHeader": true,
            "textAlign"    : ColTextAlign.Left,
            "type"         : ColumnType.undefined,
            "userStr"      : "",
            "width"        : gNewCellWidth
        };
        options = $.extend(defaultOptions, options);

        this.version = versionV1;
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

    return ProgColV1;
}());

// userSettings.js
var GenSettingsV1 = (function() {
    /* Attr
        version: 1
        adminSettins: (obj) admin settings
        xcSettings: (obj) xcSttings
        baseSettings: (obj) baseSettings
    */
    function GenSettingsV1(userConfigParms, options) {
        userConfigParms = userConfigParms || {};
        options = options || {};
        var defaultSettings = {
            "hideDataCol"         : false,
            "monitorGraphInterval": 3, // in seconds
            "commitInterval"      : 120, // in seconds
            "DsDefaultSampleSize" : 10 * GB
        };
        defaultSettings = $.extend({}, defaultSettings, userConfigParms);

        this.version = versionV1;

        var adminSettings = options.adminSettings || {};
        var xcSettings = options.xcSettings || {};
        this.adminSettings = adminSettings;
        this.xcSettings = xcSettings;

        // adminSettings have higher priority than xcSettings,
        // xcSettings (xcalar admin) has higher priority than defaultSettings
        this.baseSettings = $.extend({}, defaultSettings, xcSettings,
                                     adminSettings);
    }

    return GenSettingsV1;
}());

// userSettings.js
var UserPrefV1 = (function() {
    /* Attr
        version: 1
        datasetListView: (boolean) ds use list/grid view
        browserListView: (boolean) browser use list/grid view
        keepJoinTables: (boolean) keep tables to join or hide them
        activeMainTab: (string) which tab is in active
        general: (obj) holds general settings
    */
    function UserPrefV1(options) {
        options = options || {};

        this.version = versionV1;
        this.datasetListView = options.datasetListView || false;
        this.browserListView = options.browserListView || false;
        this.keepJoinTables = options.keepJoinTables || false;
        this.activeMainTab = options.activeMainTab || "workspaceTab";
        this.general = options.general || {}; // holds general settings that can
        // be set by user but if a setting is not set, will default to those in
        // GenSettings

        return this;
    }

    return UserPrefV1;
}());

// dsCart.js
// inner part of Cart
var CartItemV1 = (function() {
    /* Attr:
        version: 1
        colNum: (integer) column num
        value: (string) column name,
        type: (string) column type
    */
    function CartItemV1(options) {
        options = options || {};

        this.version = versionV1;
        this.colNum = options.colNum;
        this.value = options.value;
        this.type = options.type;

        return this;
    }
    return CartItemV1;
}());

// dsCart.js
var CartV1 = (function() {
    /* Attr:
        version: 1
        dsId: (string) dataset id,
        tableName: (string) tableName
        items: (array) list of CartItem
    */
    function CartV1(options) {
        options = options || {};

        this.version = versionV1;
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

    return CartV1;
}());

// worksheet.js
var WSMETAV1 = (function() {
    /* Attr:
        version: 1
        wsInfos: (obj) set of WorksheetObj
        wsOrder: (array) worksheet order
        hiddenWS: (array) list of hidden worksheet
        noSheetTables: (array) list of tables not in any worksheets
        activeWS: (string) current active worksheet
    */
    function WSMETAV1(options) {
        options = options || {};

        this.version = versionV1;
        this.wsInfos = options.wsInfos;
        this.wsOrder = options.wsOrder;
        this.hiddenWS = options.hiddenWS;
        this.noSheetTables = options.noSheetTables;
        this.activeWS = options.activeWS;

        return this;
    }

    return WSMETAV1;
}());

// worksheet.js
var WorksheetObjV1 = (function() {
    /* Attr
        version: 1
        id: (string) worksheet id
        name: (string) worksheet name
        date: (string) create date
        tables: (array) list of active tables in the sheet
        archivedTables: (array) list of archived tables in the sheet
        orphanedTables: (array) list of orphaned tables in the sheet
        tempHiddenTables: (array) list of temp hidden tables
        undoneTables: (array) list of undone tables in the list
        lockedTables: (array, not persist) list of locked table in the sheet
    */
    function WorksheetObjV1(options) {
        var self = this;

        self.version = versionV1;
        self.id = options.id;
        self.name = options.name;
        self.date = options.date || xcHelper.getDate();

        for (var key in WSTableType) {
            var tableType = WSTableType[key];
            self[tableType] = options[tableType] || [];
        }

        self[WSTableType.Lock] = []; // should clear it when initialize
        return self;
    }

    return WorksheetObjV1;
}());

// workbook.js
var WKBKV1 = (function() {
    /* Attr:
        version: 1
        name: (string) workbook name
        id: (string) workbook id
        noMeta: (boolean) has meta or not
        srcUser: (string) who create the workbook
        curUser: (string) who is using the workbook
        created: (date) create time
        modified: (date) last modified time
        numWorksheets: (integer) num of worksheets in the workbook
    */
    function WKBKV1(options) {
        options = options || {};

        if (options.name == null || options.id == null) {
            throw "Invalid workbook info!";
        }

        var time = xcHelper.getCurrentTimeStamp();

        this.version = versionV1;
        this.name = options.name;
        this.id = options.id;
        this.noMeta = options.noMeta || false;
        this.srcUser = options.srcUser;
        this.curUser = options.curUser;
        this.created = options.created || time;
        this.modified = options.modified || time;
        this.numWorksheets = options.numWorksheets || 1;

        return this;
    }

    return WKBKV1;
}());

// profile.js
var ProfileAggInfoV1 = (function() {
    /* Attr:
        version: 1
        max: (number/string) agg max
        min: (number/string) agg min
        count: (integer/string) agg count
        sum: (number/string) agg sum
        average: (number/string) agg average
        sd: (number/string) agg sd
    */
    function ProfileAggInfoV1(options) {
        options = options || {};

        this.version = versionV1;
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

    return ProfileAggInfoV1;
}());

// profile.js
var ProfileStatsInfoV1 = (function() {
    /* Attr:
        version: 1
        unsorted: (boolean) if columns is sorted or not
        zeroQuartile: (number, optional): 0% row (first row)
        lowerQuartile: (number, optional): 25% row
        median: (number, optional): 50% row
        upperQuartile: (number, optional): 75% row
        fullQuartile: (number, optional): 100% row (last row)
    */
    function ProfileStatsInfoV1(options) {
        options = options || {};

        this.version = versionV1;
        if (options.unsorted != null) {
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

    return ProfileStatsInfoV1;
}());

// profile.js
var ProfileGroupbyInfoV1 = (function() {
    /* Attr:
        version: 1
        isComplete: (boolean/string) true/false/running
        nullCount: (integer) how many null values
        allNull: (boolean) if all values are null
        buckes: (obj) a set of ProfileBucketInfo
    */
    function ProfileGroupbyInfoV1(options) {
        options = options || {};

        this.version = versionV1;
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

    return ProfileGroupbyInfoV1;
}());

// profile.js
var ProfileBucketInfoV1 = (function() {
    /* Attr:
        version: 1
        bucketSize: (number) size of the bucket
        table: (string) bucketing result table
        ascTable: (string) asc sort of table
        descTable: (string) desc sort of table
        colName: (string) column name
        max: (integer) max count
        sum: (integer) total row of table
    */
    function ProfileBucketInfoV1(options) {
        options = options || {};

        this.version = versionV1;
        this.bucketSize = options.bucketSize;
        this.table = options.table;
        this.ascTable = options.ascTable || null;
        this.descTable = options.descTable || null;
        this.colName = options.colName;
        this.max = options.max;
        this.sum = options.sum;

        return this;
    }

    return ProfileBucketInfoV1;
}());

// profile.js
var ProfileInfoV1 = (function() {
    /* Attr
        version: 1
        id: (string) uniquely identify the obj
        colName: (string) column's name
        frontColName: (string, not persist) column's front name
        type: (string) column's type
        aggInfo: (ProfileAggInfo) agg info
        statsInfo: (ProfileStatsInfo) stats info
        groupByInfo: (ProfileGroupbyInfo) groupBy info
    */
    function ProfileInfoV1(options) {
        options = options || {};

        this.version = versionV1;
        this.id = options.id || xcHelper.randName("stats");
        this.colName = options.colName;
        this.frontColName = options.frontColName || null; // placeholder
        this.type = options.type;

        this.aggInfo = new ProfileAggInfo(options.aggInfo);
        this.statsInfo = new ProfileStatsInfo(options.statsInfo);
        this.groupByInfo = new ProfileGroupbyInfo(options.groupByInfo);

        return this;
    }

    return ProfileInfoV1;
}());

// ds.js
var DSObjV1 = (function() {
    /* Attr:
        version: 1
        id: (number/string) uniquely identify dsObj
        names: (string) ds/folder's name
        user: (string) the user that creates it
        fullName: (string) fullName for ds, user.name, for folder, equal to name
        parentId: (number) parent folder's id
        isFolder (boolean) folder or ds
        uneditable: (boolean) if set true, no action for it
        eles: (array) its children DSObj
        totalChildren: (integer) total nummber of children
    */
    /* ds only attr:
        format: (string) data foramt of ds
        path: (string) point url of ds
        size: (string) ds's size
        numEntries: (integer) total records in ds
        resultSetId: (string) ds' resultId
        pattern: (string) path's pattern
        fieldDelim: (string) field delim
        lineDelim: (string) line delim
        hasHeader: (boolean) promote header or not
        moduleName: (string) udf's module
        funcName: (string) udf's func
        isRecur: (boolean) recursive or not
        previewSize: (integer) ds's previewSize
        quoteChar: (string) ds's quoteChar
        skipRows: (integer) how many rows to skip
        isRegex: (boolean) path is using regEx or not;
        headers: (array, optional) XXX temp fix to preserve CSV header order
        error: (string, optional) ds's error
    */
    function DSObjV1(options) {
        options = options || {};

        this.version = versionV1;
        this.id = options.id;
        this.name = options.name;
        this.user = options.user;
        this.fullName = options.fullName;
        this.parentId = options.parentId;
        this.isFolder = options.isFolder || false;
        this.uneditable = options.uneditable;

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
        
            if (options.headers != null) {
                this.headers = options.headers;
            }

            if (options.error != null) {
                this.error = options.error;
            }
        }

        if (this.parentId !== DSObjTerm.homeParentId) {
            var parent = DS.getDSObj(this.parentId);
            parent.eles.push(this);
            // update totalChildren of all ancestors
            this.updateDSCount();
        }

        return this;
    }

    return DSObjV1;
}());

// a inner part of Dataflow
// Stores the original values for the parameterized node
var RetinaNodeV1 = (function() {
    /* Attr:
        version: 1
        paramType: (string) param's type
        paramValue: (string) param's value
        paramQuery: (array) list of param's query
    */
    function RetinaNodeV1(options) {
        options = options || {};

        this.version = versionV1;
        this.paramType = options.paramType;
        this.paramValue = options.paramValue;
        this.paramQuery = options.paramQuery;

        return this;
    }

    return RetinaNodeV1;
}());

var DataflowV1 = (function() {
    /* Attr
        version: 1
        name: (string) Retina name
        tableName: (string) Original table name
        columns: (array) Columns to export
        parameters: (array) array of parameters in Dataflow
        paramMap: (obj) map for parameters
        nodeIds: (obj) map of dagNames and dagIds
        parameterizedNodes: (obj) map of dagNodeIds to parameterized structs
        retinaNodes: (obj)
        schedule: (SchedObj) schedule of the dataflow
    */
    function DataflowV1(name, options) {
        options = options || {};

        this.version = versionV1;
        this.name = name;
        this.tableName = options.tableName;
        this.columns = options.columns || [];
        this.parameters = options.parameters || [];
        this.paramMap = options.paramMap || {};
        this.nodeIds = options.nodeIds || {};
        this.parameterizedNodes = {};
        this.retinaNodes = {};
        this.schedule = null;

        if (options.parameterizedNodes != null) {
            for (var nodeId in options.parameterizedNodes) {
                var parameterizedNodes = options.parameterizedNodes[nodeId];
                this.parameterizedNodes[nodeId] = new RetinaNode(parameterizedNodes);
            }
        }

        return this;
    }

    return DataflowV1;
}());

/* Start of Schedule */
var SchedObjV1 = (function() {
    /* Attr:
        version: 1
        startTime: (date) schedule start time
        dateText: (string) date text
        timeText: (string) time text
        repeat: (string) repate frequency
        freq: (number) ?
        modified: (date) modified time
        created: (date) created time
        recur: (number) number of runs
    */
    function SchedObjV1(options) {
        options = options || {};

        this.version = versionV1;
        this.startTime = options.startTime;
        this.dateText = options.dateText;
        this.timeText = options.timeText;
        this.repeat = options.repeat;
        this.modified = options.modified;
        this.created = options.modified;
        this.recur = options.recur;
        return this;
    }

    return SchedObjV1;
}());
/* End of SchedObj */

/* Query */
var XcQueryV1 = (function() {
    /* Attr:
        version: 1
        name: (string) queryName
        fullName: (string) fullName
        time: (date)
        elapsedTime: (integer) time used
        type: (sring) query type
        subQueries: (array) list of XcSubQuery
        id:  (integer) query id
        numSteps: (integer) total steps in query
        currStep: (integer) current step
        outputTableName: (string) output table
        outputTableState: (string) output table state
        queryStr: (string) query string
        sqlNum: sql's id
        state: (string) enums in QueryStateT
        cancelable: (boolean) can cancel or not
    */
    function XcQueryV1(options) {
        options = options || {};

        this.version = versionV1;
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

    return XcQueryV1;
}());

var XcSubQueryV1 = (function() {
    /* Attr:
        version: 1
        name: (string) subQuery's name
        time: (date) craeted time
        query: (string) query
        dstTable: (string) dst table
        id: (integer) subQuery's id
        index: (integer) subQuery's index
        queryName: (string) query name
        state: (string) enums in QueryStateT
        exportFileName: (string, optional) export's file
    */
    function XcSubQueryV1(options) {
        options = options || {};

        this.version = versionV1;
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

    return XcSubQueryV1;
}());
/* End of Query */