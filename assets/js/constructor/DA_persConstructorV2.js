(function createConstructorsV2(win) {
    var parentVersion = 1;
    var version = 2;
    var __isParentVersion = function(options) {
        return __isOldVersion(options, version);
    };

    // kvStore.js
    win.METAConstructorV2 = (function() {
        var _super = __getConstructor("METAConstructor", parentVersion);
        /* Attr:
            version: 2
            METAKeys.TI: (obj) table meta
            METAKeys.WS: (obj) worksheet meta
            METAKeys.AGGS: (obj) agg meta
            METAKeys.CART: (obj) cart meta
            METAKeys.STATS: (obj) profile meta
            METAKeys.LOGC: (integer) log cursor position
            METAKeys.TPFX: (obj) table prefix meta
            METAKeys.QUERY: (obj) query meta
        */
        function METAConstructorV2(oldMeta) {
            oldMeta = oldMeta || {};

            var self = _super.call(this, oldMeta);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                METAConstructorV2.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(METAConstructorV2, _super);

        return METAConstructorV2;
    }());

    // kvStore.js
    win.EMetaConstructorV2 = (function() {
        var _super = __getConstructor("EMetaConstructor", parentVersion);
        /* Attr:
            version: 2
            EMetaKeys.DF: (obj) dataflow meta
        */
        function EMetaConstructorV2(oldMeta) {
            oldMeta = oldMeta || {};

            var self = _super.call(this);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                EMetaConstructorV2.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(EMetaConstructorV2, _super);

        return EMetaConstructorV2;
    }());

    // userSettings.js
    win.UserInfoConstructorV2 = (function() {
        var _super = __getConstructor("UserInfoConstructor", parentVersion);
        /* Attr:
            version: 2
            UserInfoKeys.DS: (obj) datasets meta
            UserInfoKeys.PREF: (obj) user preference meta
        */
        function UserInfoConstructorV2(oldMeta) {
            oldMeta = oldMeta || {};
            var self = _super.call(this);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                UserInfoConstructorV2.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(UserInfoConstructorV2, _super);

        return UserInfoConstructorV2;
    }());

    // authentication.js
    win.XcAuthV2 = (function() {
        var _super = __getConstructor("XcAuth", parentVersion);
        /* Attr:
            version: 2,
            idCount: (integer) current id num,
            hasTag: (string) 2 characters string
        */
        function XcAuthV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcAuthV2, _super);

        return XcAuthV2;
    }());

    // sql.js
    win.XcLogV2 = (function() {
        var _super = __getConstructor("XcLog", parentVersion);
        /* Attr:
            version: 2,
            title: (string) log's title,
            options: (obj) log's options
            cli: (string, optional) cli log
            error: (any, optional) error log
            sqlType: (string, optional) log's type
            timestamp: (date) time
        */
        function XcLogV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcLogV2, _super);

        return XcLogV2;
    }());

    // Constructor for table meta data
    win.TableMetaV2 = (function() {
        var _super = __getConstructor("TableMeta", parentVersion);
        /* Attr
            version: 2,
            tableName: (string) table's name
            tableId: (string) table's id
            isLocked: (boolean) if table is locked
            noDelete: (boolean) if table should not be deleted
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
        function TableMetaV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;

            if (__isParentVersion(options)) {
                self.tableCols = TableMetaV2.restoreProgCol(options.tableCols,
                                                            version);
            }

            return self;
        }

        __extends(TableMetaV2, _super);

        return TableMetaV2;

    }());

    // inner part of progCol
    win.ColFuncV2 = (function() {
        var _super = __getConstructor("ColFunc", parentVersion);
        /* Attr
            version: 2,
            name: (string) col func's name
            args: (array) col func's arguments
        */
        function ColFuncV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ColFuncV2, _super);

        return ColFuncV2;
    }());

    win.ProgColV2 = (function() {
        var _super = __getConstructor("ProgCol", parentVersion);
        /* Attr
            version: 2
            name: (string) front column name
            backName: (string) back column name,
            prefix: (string, not persist) striped from backName
            immediate: (boolean) immdiate or fat ptr
            type: (string) enums in ColumnType
            knownType: (boolean) if the type is known or just a guess
            childOfArray: (boolean) if is child of array
            isNewCol: (boolean) if is new column
            isMinimized: (boolean) columns is hidden or not
            width: (number) column width
            format: (string) enums in ColFormat
            decimal: (integer) num of decimals
            sizedToHeader: (boolean) if size to header
            textAlign: (string) enums in ColTextAlign
            userStr: (string) user string
            func: (ColFunc) func info
        */
        function ProgColV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.func = new ColFuncV2(options.func);
            }
            return self;
        }

        __extends(ProgColV2, _super);

        return ProgColV2;
    }());

    // aggregates.js
    win.AggV2 = (function() {
        var _super = __getConstructor("Agg", parentVersion);
        /* Attr
            version: 2
            op: (string) agg operation name
            value: (number/string) agg result
            tableId: (string) source table id
            backColName: (string) source column name
            dagName: (string) dst dag name
            aggname: aggregate name
        */
        function AggV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(AggV2, _super);

        return AggV2;
    }());

    // userSettings.js
    win.GenSettingsV2 = (function() {
        var _super = __getConstructor("GenSettings", parentVersion);
        /* Attr
            version: 2
            adminSettins: (obj) admin settings
            xcSettings: (obj) xcSttings
            baseSettings: (obj) baseSettings
        */
        function GenSettingsV2(userConfigParms, options) {
            var self = _super.call(this, userConfigParms, options);
            self.version = version;
            return self;
        }

        __extends(GenSettingsV2, _super);

        return GenSettingsV2;
    }());

    // userSettings.js
    win.UserPrefV2 = (function() {
        var _super = __getConstructor("UserPref", parentVersion);
        /* Attr
            version: 2
            datasetListView: (boolean) ds use list/grid view
            browserListView: (boolean) browser use list/grid view
            keepJoinTables: (boolean) keep tables to join or hide them
            activeMainTab: (string) which tab is in active
            general: (obj) holds general settings
        */
        function UserPrefV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(UserPrefV2, _super);

        return UserPrefV2;
    }());

    // dsCart.js
    // inner part of Cart
    win.CartItemV2 = (function() {
        var _super = __getConstructor("CartItem", parentVersion);
        /* Attr:
            version: 2
            colNum: (integer) column num
            value: (string) column name,
            type: (string) column type
        */
        function CartItemV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(CartItemV2, _super);

        return CartItemV2;
    }());

    // dsCart.js
    win.CartV2 = (function() {
        var _super = __getConstructor("Cart", parentVersion);
        /* Attr:
            version: 2
            dsId: (string) dataset id,
            tableName: (string) tableName
            items: (array) list of CartItem
        */
        function CartV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.items = CartV2.restoreItem(options.items, version);
            }
            return self;
        }

        __extends(CartV2, _super);

        return CartV2;
    }());

    win.WorksheetObjV2 = (function() {
        var _super = __getConstructor("WorksheetObj", parentVersion);
        /* Attr
            version: 2
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
        function WorksheetObjV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(WorksheetObjV2, _super);

        return WorksheetObjV2;
    }());

    // worksheet.js
    win.WSMETAV2 = (function() {
        var _super = __getConstructor("WSMETA", parentVersion);
        /* Attr:
            version: 2
            wsInfos: (obj) set of WorksheetObj
            wsOrder: (array) worksheet order
            hiddenWS: (array) list of hidden worksheet
            noSheetTables: (array) list of tables not in any worksheets
            activeWS: (string) current active worksheet
        */
        function WSMETAV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.wsInfos = WSMETAV2.restoreWSInfos(options.wsInfos, version);
            }
            return self;
        }

        __extends(WSMETAV2, _super);

        return WSMETAV2;
    }());

    // workbook.js
    win.WKBKV2 = (function() {
        var _super = __getConstructor("WKBK", parentVersion);
        /* Attr:
            version: 2
            name: (string) workbook name
            id: (string) workbook id
            noMeta: (boolean) has meta or not
            srcUser: (string) who create the workbook
            curUser: (string) who is using the workbook
            created: (date) create time
            modified: (date) last modified time
            numWorksheets: (integer) num of worksheets in the workbook
        */
        function WKBKV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(WKBKV2, _super);

        return WKBKV2;
    }());

    // profile.js
    win.ProfileAggInfoV2 = (function() {
        var _super = __getConstructor("ProfileAggInfo", parentVersion);
        /* Attr:
            version: 2
            max: (number/string) agg max
            min: (number/string) agg min
            count: (integer/string) agg count
            sum: (number/string) agg sum
            average: (number/string) agg average
            sd: (number/string) agg sd
        */
        function ProfileAggInfoV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileAggInfoV2, _super);

        return ProfileAggInfoV2;
    }());

    // profile.js
    win.ProfileStatsInfoV2 = (function() {
        var _super = __getConstructor("ProfileStatsInfo", parentVersion);
        /* Attr:
            version: 2
            unsorted: (boolean) if columns is sorted or not
            zeroQuartile: (number, optional): 0% row (first row)
            lowerQuartile: (number, optional): 25% row
            median: (number, optional): 50% row
            upperQuartile: (number, optional): 75% row
            fullQuartile: (number, optional): 100% row (last row)
        */
        function ProfileStatsInfoV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileStatsInfoV2, _super);

        return ProfileStatsInfoV2;
    }());

    // profile.js
    win.ProfileGroupbyInfoV2 = (function() {
        var _super = __getConstructor("ProfileGroupbyInfo", parentVersion);
        /* Attr:
            version: 2
            isComplete: (boolean/string) true/false/running
            nullCount: (integer) how many null values
            allNull: (boolean) if all values are null
            buckes: (obj) a set of ProfileBucketInfo
        */
        function ProfileGroupbyInfoV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.buckets = ProfileGroupbyInfoV2.restoreBuckets(options.buckets,
                                                                    version);
            }
            return self;
        }

        __extends(ProfileGroupbyInfoV2, _super);

        return ProfileGroupbyInfoV2;
    }());

    // profile.js
    win.ProfileBucketInfoV2 = (function() {
        var _super = __getConstructor("ProfileBucketInfo", parentVersion);
        /* Attr:
            version: 2
            bucketSize: (number) size of the bucket
            table: (string) bucketing result table
            ascTable: (string) asc sort of table
            descTable: (string) desc sort of table
            colName: (string) column name
            max: (integer) max count
            sum: (integer) total row of table
        */
        function ProfileBucketInfoV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileBucketInfoV2, _super);

        return ProfileBucketInfoV2;
    }());

    // profile.js
    win.ProfileInfoV2 = (function() {
        var _super = __getConstructor("ProfileInfo", parentVersion);
        /* Attr
            version: 2
            id: (string) uniquely identify the obj
            colName: (string) column's name
            frontColName: (string, not persist) column's front name
            type: (string) column's type
            aggInfo: (ProfileAggInfo) agg info
            statsInfo: (ProfileStatsInfo) stats info
            groupByInfo: (ProfileGroupbyInfo) groupBy info
        */
        function ProfileInfoV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;

            if (__isParentVersion(options)) {
                var restoreInfos = ProfileInfoV2.restoreInfos(options, version);
                self.aggInfo = restoreInfos.aggInfo;
                self.statsInfo = restoreInfos.statsInfo;
                self.groupByInfo = restoreInfos.groupByInfo;
            }
            return self;
        }

        __extends(ProfileInfoV2, _super);

        return ProfileInfoV2;
    }());

    /*** Start of DSObj ***/
    /* datastore.js */
    win.DSObjV2 = (function() {
        var _super = __getConstructor("DSObj", parentVersion);
        /* Attr:
            version: 2
            id: (number/string) uniquely identify dsObj
            names: (string) ds/folder's name
            user: (string) the user that creates it
            fullName: (string) fullName for ds, user.name,
                                        for folder, equal to name
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
        function DSObjV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(DSObjV2, _super);

        return DSObjV2;
    }());
    /* End of DSObj */

    /* Start of Dataflow */
    /* dataflow.js */
    // a inner part of Dataflow
    // Stores the original values for the parameterized node
    win.RetinaNodeV2 = (function() {
        var _super = __getConstructor("RetinaNode", parentVersion);
        /* Attr:
            version: 2
            paramType: (string) param's type
            paramValue: (string) param's value
            paramQuery: (array) list of param's query
        */
        function RetinaNodeV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(RetinaNodeV2, _super);

        return RetinaNodeV2;
    }());

    win.DataflowV2 = (function() {
        var _super = __getConstructor("Dataflow", parentVersion);
        /* Attr
            version: 2
            name: (string) Retina name
            columns: (array, not persist) Columns to export
            parameters: (array) array of parameters in Dataflow
            paramMap: (obj) map for parameters
            nodeIds: (obj, not pesist) map of dagNames and dagIds
            retinaNodes: (obj, not persist) retina node info from backend
            parameterizedNodes: (obj) map of dagNodeIds to parameterized structs
            schedule: (SchedObj) schedule of the dataflow
        */
        function DataflowV2(name, options) {
            options = options || {};
            var self = _super.call(this, name, options);

            self.version = version;
            if (__isParentVersion(options)) {
                var restoreInfos = DataflowV2.restoreInfos(options, version);
                self.parameterizedNodes = restoreInfos.parameterizedNodes;
                self.schedule = restoreInfos.schedule;
            }
            return self;
        }

        __extends(DataflowV2, _super);

        return DataflowV2;
    }());
    /* End of Dataflow */

    /* Start of Schedule */
    win.SchedObjV2 = (function() {
        var _super = __getConstructor("SchedObj", parentVersion);
        /* Attr:
            version: 2
            startTime: (date) schedule start time
            dateText: (string) date text
            timeText: (string) time text
            repeat: (string) repate frequency
            modified: (date) the latest time when this schedule is modified
        * new attrs:
            created: (date) the time when this schedule is created
            activeSession: (boolean)
            newTableName: (String)
            usePremadeCronString: (boolean) whether to use user defined cron
            premadeCronString: (String) cron defined by the user
        * removed attrs:
            recur
        */
        function SchedObjV2(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                delete self.recur;
            }

            self.created = options.created;
            self.activeSession = options.activeSession;
            self.newTableName = options.newTableName;
            self.usePremadeCronString = options.usePremadeCronString;
            self.premadeCronString = options.premadeCronString;

            return self;
        }

        __extends(SchedObjV2, _super);

        return SchedObjV2;
    }());
    /* End of SchedObj */

    /* Query */
    win.XcQueryV2 = (function() {
        var _super = __getConstructor("XcQuery", parentVersion);
        /* Attr:
            version: 2
            name: (string) queryName
            fullName: (string) fullName
            time: (date)
            elapsedTime: (integer) time used
            type: (sring) query type
            id:  (integer) query id
            numSteps: (integer) total steps in query
            currStep: (integer) current step
            outputTableName: (string) output table
            outputTableState: (string) output table state
            queryStr: (string) query string
            sqlNum: sql's id
            state: (string) enums in QueryStateT
            cancelable: (boolean) can cancel or not
            subQueries: (array, not persist) list of XcSubQuery
        */
        function XcQueryV2(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcQueryV2, _super);

        return XcQueryV2;
    }());
    /* End of Query */
}(window));
