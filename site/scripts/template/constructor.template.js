<% v = ctorVersion %>
(function createConstructorsV<%= v %>(win) {
    var parentVersion = <%= v - 1 %>;
    var version = <%= v %>;
    var __isParentVersion = function(options) {
        return __isOldVersion(options, version);
    };

    // kvStore.js
    win.METAConstructorV<%= v %> = (function() {
        var _super = __getConstructor("METAConstructor", parentVersion);
        /* Attr:
            version: <%= v %>
            METAKeys.TI: (obj) table meta
            METAKeys.WS: (obj) worksheet meta
            METAKeys.AGGS: (obj) agg meta
            METAKeys.CART: (obj) cart meta
            METAKeys.STATS: (obj) profile meta
            METAKeys.LOGC: (integer) log cursor position
            METAKeys.TPFX: (obj) table prefix meta
            METAKeys.QUERY: (obj) query meta
        */
        function METAConstructorV<%= v %>(oldMeta) {
            oldMeta = oldMeta || {};

            var self = _super.call(this, oldMeta);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                METAConstructorV<%= v %>.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(METAConstructorV<%= v %>, _super);

        return METAConstructorV<%= v %>;
    }());

    // kvStore.js
    win.EMetaConstructorV<%= v %> = (function() {
        var _super = __getConstructor("EMetaConstructor", parentVersion);
        /* Attr:
            version: <%= v %>
            EMetaKeys.DF: (obj) dataflow meta
        */
        function EMetaConstructorV<%= v %>(oldMeta) {
            oldMeta = oldMeta || {};

            var self = _super.call(this);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                EMetaConstructorV<%= v %>.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(EMetaConstructorV<%= v %>, _super);

        return EMetaConstructorV<%= v %>;
    }());

    // userSettings.js
    win.UserInfoConstructorV<%= v %> = (function() {
        var _super = __getConstructor("UserInfoConstructor", parentVersion);
        /* Attr:
            version: <%= v %>
            UserInfoKeys.DS: (obj) datasets meta
            UserInfoKeys.PREF: (obj) user preference meta
        */
        function UserInfoConstructorV<%= v %>(oldMeta) {
            oldMeta = oldMeta || {};
            var self = _super.call(this);
            self.version = version;

            if (__isParentVersion(oldMeta)) {
                UserInfoConstructorV<%= v %>.restore(self, oldMeta, version);
            }
            return self;
        }

        __extends(UserInfoConstructorV<%= v %>, _super);

        return UserInfoConstructorV<%= v %>;
    }());

    // authentication.js
    win.XcAuthV<%= v %> = (function() {
        var _super = __getConstructor("XcAuth", parentVersion);
        /* Attr:
            version: <%= v %>,
            idCount: (integer) current id num,
            hasTag: (string) 2 characters string
        */
        function XcAuthV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcAuthV<%= v %>, _super);

        return XcAuthV<%= v %>;
    }());

    // sql.js
    win.XcLogV<%= v %> = (function() {
        var _super = __getConstructor("XcLog", parentVersion);
        /* Attr:
            version: <%= v %>,
            title: (string) log's title,
            options: (obj) log's options
            cli: (string, optional) cli log
            error: (any, optional) error log
            sqlType: (string, optional) log's type
            timestamp: (date) time
        */
        function XcLogV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcLogV<%= v %>, _super);

        return XcLogV<%= v %>;
    }());

    // Constructor for table meta data
    win.TableMetaV<%= v %> = (function() {
        var _super = __getConstructor("TableMeta", parentVersion);
        /* Attr
            version: <%= v %>,
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
        function TableMetaV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;

            if (__isParentVersion(options)) {
                self.tableCols = TableMetaV<%= v %>.restoreProgCol(options.tableCols,
                                                            version);
            }

            return self;
        }

        __extends(TableMetaV<%= v %>, _super);

        return TableMetaV<%= v %>;

    }());

    // inner part of progCol
    win.ColFuncV<%= v %> = (function() {
        var _super = __getConstructor("ColFunc", parentVersion);
        /* Attr
            version: <%= v %>,
            name: (string) col func's name
            args: (array) col func's arguments
        */
        function ColFuncV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ColFuncV<%= v %>, _super);

        return ColFuncV<%= v %>;
    }());

    win.ProgColV<%= v %> = (function() {
        var _super = __getConstructor("ProgCol", parentVersion);
        /* Attr
            version: <%= v %>
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
        function ProgColV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.func = new ColFuncV<%= v %>(options.func);
            }
            return self;
        }

        __extends(ProgColV<%= v %>, _super);

        return ProgColV<%= v %>;
    }());

    // aggregates.js
    win.AggV<%= v %> = (function() {
        var _super = __getConstructor("Agg", parentVersion);
        /* Attr
            version: <%= v %>
            op: (string) agg operation name
            value: (number/string) agg result
            tableId: (string) source table id
            backColName: (string) source column name
            dagName: (string) dst dag name
            aggname: aggregate name
        */
        function AggV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(AggV<%= v %>, _super);

        return AggV<%= v %>;
    }());

    // userSettings.js
    win.GenSettingsV<%= v %> = (function() {
        var _super = __getConstructor("GenSettings", parentVersion);
        /* Attr
            version: <%= v %>
            adminSettins: (obj) admin settings
            xcSettings: (obj) xcSttings
            baseSettings: (obj) baseSettings
        */
        function GenSettingsV<%= v %>(userConfigParms, options) {
            var self = _super.call(this, userConfigParms, options);
            self.version = version;
            return self;
        }

        __extends(GenSettingsV<%= v %>, _super);

        return GenSettingsV<%= v %>;
    }());

    // userSettings.js
    win.UserPrefV<%= v %> = (function() {
        var _super = __getConstructor("UserPref", parentVersion);
        /* Attr
            version: <%= v %>
            datasetListView: (boolean) ds use list/grid view
            browserListView: (boolean) browser use list/grid view
            keepJoinTables: (boolean) keep tables to join or hide them
            activeMainTab: (string) which tab is in active
            general: (obj) holds general settings
        */
        function UserPrefV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(UserPrefV<%= v %>, _super);

        return UserPrefV<%= v %>;
    }());

    // dsCart.js
    // inner part of Cart
    win.CartItemV<%= v %> = (function() {
        var _super = __getConstructor("CartItem", parentVersion);
        /* Attr:
            version: <%= v %>
            colNum: (integer) column num
            value: (string) column name,
            type: (string) column type
        */
        function CartItemV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(CartItemV<%= v %>, _super);

        return CartItemV<%= v %>;
    }());

    // dsCart.js
    win.CartV<%= v %> = (function() {
        var _super = __getConstructor("Cart", parentVersion);
        /* Attr:
            version: <%= v %>
            dsId: (string) dataset id,
            tableName: (string) tableName
            items: (array) list of CartItem
        */
        function CartV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.items = CartV<%= v %>.restoreItem(options.items, version);
            }
            return self;
        }

        __extends(CartV<%= v %>, _super);

        return CartV<%= v %>;
    }());

    win.WorksheetObjV<%= v %> = (function() {
        var _super = __getConstructor("WorksheetObj", parentVersion);
        /* Attr
            version: <%= v %>
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
        function WorksheetObjV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(WorksheetObjV<%= v %>, _super);

        return WorksheetObjV<%= v %>;
    }());

    // worksheet.js
    win.WSMETAV<%= v %> = (function() {
        var _super = __getConstructor("WSMETA", parentVersion);
        /* Attr:
            version: <%= v %>
            wsInfos: (obj) set of WorksheetObj
            wsOrder: (array) worksheet order
            hiddenWS: (array) list of hidden worksheet
            noSheetTables: (array) list of tables not in any worksheets
            activeWS: (string) current active worksheet
        */
        function WSMETAV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.wsInfos = WSMETAV<%= v %>.restoreWSInfos(options.wsInfos, version);
            }
            return self;
        }

        __extends(WSMETAV<%= v %>, _super);

        return WSMETAV<%= v %>;
    }());

    // workbook.js
    win.WKBKV<%= v %> = (function() {
        var _super = __getConstructor("WKBK", parentVersion);
        /* Attr:
            version: <%= v %>
            name: (string) workbook name
            id: (string) workbook id
            noMeta: (boolean) has meta or not
            srcUser: (string) who create the workbook
            curUser: (string) who is using the workbook
            created: (date) create time
            modified: (date) last modified time
            numWorksheets: (integer) num of worksheets in the workbook
        */
        function WKBKV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(WKBKV<%= v %>, _super);

        return WKBKV<%= v %>;
    }());

    // profile.js
    win.ProfileAggInfoV<%= v %> = (function() {
        var _super = __getConstructor("ProfileAggInfo", parentVersion);
        /* Attr:
            version: <%= v %>
            max: (number/string) agg max
            min: (number/string) agg min
            count: (integer/string) agg count
            sum: (number/string) agg sum
            average: (number/string) agg average
            sd: (number/string) agg sd
        */
        function ProfileAggInfoV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileAggInfoV<%= v %>, _super);

        return ProfileAggInfoV<%= v %>;
    }());

    // profile.js
    win.ProfileStatsInfoV<%= v %> = (function() {
        var _super = __getConstructor("ProfileStatsInfo", parentVersion);
        /* Attr:
            version: <%= v %>
            unsorted: (boolean) if columns is sorted or not
            zeroQuartile: (number, optional): 0% row (first row)
            lowerQuartile: (number, optional): <%= v %>5% row
            median: (number, optional): 50% row
            upperQuartile: (number, optional): 75% row
            fullQuartile: (number, optional): 100% row (last row)
        */
        function ProfileStatsInfoV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileStatsInfoV<%= v %>, _super);

        return ProfileStatsInfoV<%= v %>;
    }());

    // profile.js
    win.ProfileGroupbyInfoV<%= v %> = (function() {
        var _super = __getConstructor("ProfileGroupbyInfo", parentVersion);
        /* Attr:
            version: <%= v %>
            isComplete: (boolean/string) true/false/running
            nullCount: (integer) how many null values
            allNull: (boolean) if all values are null
            buckes: (obj) a set of ProfileBucketInfo
        */
        function ProfileGroupbyInfoV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;
            if (__isParentVersion(options)) {
                self.buckets = ProfileGroupbyInfoV<%= v %>.restoreBuckets(options.buckets,
                                                                    version);
            }
            return self;
        }

        __extends(ProfileGroupbyInfoV<%= v %>, _super);

        return ProfileGroupbyInfoV<%= v %>;
    }());

    // profile.js
    win.ProfileBucketInfoV<%= v %> = (function() {
        var _super = __getConstructor("ProfileBucketInfo", parentVersion);
        /* Attr:
            version: <%= v %>
            bucketSize: (number) size of the bucket
            table: (string) bucketing result table
            ascTable: (string) asc sort of table
            descTable: (string) desc sort of table
            colName: (string) column name
            max: (integer) max count
            sum: (integer) total row of table
        */
        function ProfileBucketInfoV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(ProfileBucketInfoV<%= v %>, _super);

        return ProfileBucketInfoV<%= v %>;
    }());

    // profile.js
    win.ProfileInfoV<%= v %> = (function() {
        var _super = __getConstructor("ProfileInfo", parentVersion);
        /* Attr
            version: <%= v %>
            id: (string) uniquely identify the obj
            colName: (string) column's name
            frontColName: (string, not persist) column's front name
            type: (string) column's type
            aggInfo: (ProfileAggInfo) agg info
            statsInfo: (ProfileStatsInfo) stats info
            groupByInfo: (ProfileGroupbyInfo) groupBy info
        */
        function ProfileInfoV<%= v %>(options) {
            options = options || {};
            var self = _super.call(this, options);

            self.version = version;

            if (__isParentVersion(options)) {
                var restoreInfos = ProfileInfoV<%= v %>.restoreInfos(options, version);
                self.aggInfo = restoreInfos.aggInfo;
                self.statsInfo = restoreInfos.statsInfo;
                self.groupByInfo = restoreInfos.groupByInfo;
            }
            return self;
        }

        __extends(ProfileInfoV<%= v %>, _super);

        return ProfileInfoV<%= v %>;
    }());

    /*** Start of DSObj ***/
    /* datastore.js */
    win.DSObjV<%= v %> = (function() {
        var _super = __getConstructor("DSObj", parentVersion);
        /* Attr:
            version: <%= v %>
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
        function DSObjV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(DSObjV<%= v %>, _super);

        return DSObjV<%= v %>;
    }());
    /* End of DSObj */

    /* Start of Dataflow */
    /* dataflow.js */
    // a inner part of Dataflow
    // Stores the original values for the parameterized node
    win.RetinaNodeV<%= v %> = (function() {
        var _super = __getConstructor("RetinaNode", parentVersion);
        /* Attr:
            version: <%= v %>
            paramType: (string) param's type
            paramValue: (string) param's value
            paramQuery: (array) list of param's query
        */
        function RetinaNodeV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(RetinaNodeV<%= v %>, _super);

        return RetinaNodeV<%= v %>;
    }());

    win.DataflowV<%= v %> = (function() {
        var _super = __getConstructor("Dataflow", parentVersion);
        /* Attr
            version: <%= v %>
            name: (string) Retina name
            columns: (array, not persist) Columns to export
            parameters: (array) array of parameters in Dataflow
            paramMap: (obj) map for parameters
            nodeIds: (obj, not pesist) map of dagNames and dagIds
            retinaNodes: (obj, not persist) retina node info from backend
            parameterizedNodes: (obj) map of dagNodeIds to parameterized structs
            schedule: (SchedObj) schedule of the dataflow
        */
        function DataflowV<%= v %>(name, options) {
            options = options || {};
            var self = _super.call(this, name, options);

            self.version = version;
            if (__isParentVersion(options)) {
                var restoreInfos = DataflowV<%= v %>.restoreInfos(options, version);
                self.parameterizedNodes = restoreInfos.parameterizedNodes;
                self.schedule = restoreInfos.schedule;
            }
            return self;
        }

        __extends(DataflowV<%= v %>, _super);

        return DataflowV<%= v %>;
    }());
    /* End of Dataflow */

    /* Start of Schedule */
    win.SchedObjV<%= v %> = (function() {
        var _super = __getConstructor("SchedObj", parentVersion);
        /* Attr:
            version: <%= v %>
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
        function SchedObjV<%= v %>(options) {
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

        __extends(SchedObjV<%= v %>, _super);

        return SchedObjV<%= v %>;
    }());
    /* End of SchedObj */

    /* Query */
    win.XcQueryV<%= v %> = (function() {
        var _super = __getConstructor("XcQuery", parentVersion);
        /* Attr:
            version: <%= v %>
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
        function XcQueryV<%= v %>(options) {
            var self = _super.call(this, options);
            self.version = version;
            return self;
        }

        __extends(XcQueryV<%= v %>, _super);

        return XcQueryV<%= v %>;
    }());
    /* End of Query */
}(window));
