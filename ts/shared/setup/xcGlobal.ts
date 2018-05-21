// This file is where all the global variables
namespace xcGlobal {
    declare var nw: any;
    const has_require: boolean = typeof require !== 'undefined';
    // nw obj exists when nwjs running browser
    const has_nw: boolean = typeof nw !== 'undefined';

    /**
     * xcGlobal.setup
     */
    export function setup(): void {
        // =========================== Globals ============================== //
        KB = 1024;
        MB = 1024 * KB;
        GB = 1024 * MB;
        TB = 1024 * GB;
        PB = 1024 * TB;
        // ================================================================== //
        gNumEntriesPerPage = 20;
        gMaxEntriesPerPage = 60;
        gMinRowsPerScreen = 60;
        gFirstRowPositionTop = 60;
        gNewCellWidth = 125;
        gMouseStatus = null;
        gPrefixLimit = 31;

        if (!has_require || has_nw) {
            if (typeof MouseEvents !== 'undefined') {
                gMouseEvents = new MouseEvents();
            }
        }

        gRescol = {
            "minCellHeight": 25,
            "cellMinWidth": 15,
            "clicks": 0,
            "delay": 500,
            "timer": null
        };

        // XXX TODOS(bug 2319): this part should change to right scope after backend fix
        /**
         * "GLOB": global scope
         * keys inculding: gEphStorageKey, gSharedDSKey, gUserListKey,
         * gSettingsKey, GlobalKVKeys Enum
         *
         * "USER": (XXX this should be XcalarApiKeyScopeUser, no support yet!),
         * keys including: gUserKey, wokrbook set infos key,
         * and kvVersion info
         *
         * "WKBK": workbook scope
         * keys including: gStorageKey, gLogKey, gErrKey,
         * gAuthKey, gOverwrittenLogKey, gNotebookKey, commitKey(non-persistent)
         */
        gKVScope = {
            "GLOB": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
            "USER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
            "WKBK": XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
        };

        gTables = {}; // This is the main global structure that stores TableMeta
        gOrphanTables = [];
        gDroppedTables = {};
        gActiveTableId = '';
        gIsTableScrolling = false;
        gMinModeOn = false;
        gMutePromises = true; // mutes .when() console logs
        gAggVarPrefix = '^';
        gColPrefix = '$';
        gPrefixSign = '::';
        gRetSign = ':';
        gDSPrefix = '.XcalarDS.';
        gHiddenColumnWidth = 15;
        gTurnOnPrefix = true;
        gUploadChunkSize = 45 * MB;
        gDefaultSharedRoot = 'Default Shared Root';
        gJoinLookup = {
            "Inner Join": JoinOperatorT.InnerJoin,
            "Left Outer Join": JoinOperatorT.LeftOuterJoin,
            "Right Outer Join": JoinOperatorT.RightOuterJoin,
            "Full Outer Join": JoinOperatorT.FullOuterJoin,
            "Cross Join": JoinOperatorT.CrossJoin,
            "Left Semi Join": JoinCompoundOperatorTStr.LeftSemiJoin,
            "Right Semi Join": JoinCompoundOperatorTStr.RightSemiJoin,
            "Left Anti Semi Join": JoinCompoundOperatorTStr.LeftAntiSemiJoin,
            "Right Anti Semi Join": JoinCompoundOperatorTStr.RightAntiSemiJoin,
        };
    

        // ======================== Support Parameters ====================== //
        gExportNoCheck = false;
        gAlwaysDelete = false;
        gShowDroppedTablesImage = false;
        gDefaultQDelim = '"';
        gLongTestSuite = 1;
        gMaxDSColsSpec = 1023; // Max num of columns that can be ordered, renamed, or
        // casted from a dataset
        gMaxColToPull = 200; // Max num of column can create directly from preview.
        gMaxSampleSize = 0; // Max Sample Size for datasets. If this is set, all
        // datasets will abide by this limit. If you don't want
        // to use it anymore, just set it back to 0
        gUdfDefaultNoCheck = false; // when set true, allow update default udf
        gSessionNoCleanup = false;
        gIcvMode = false;
        gEnableIndexStyle = false;
        gXcSupport = false; // if xcalar support user
        gCollab = false; // if strip / in username or not
        gXcalarRecordNum = "xcalarRecordNum";

        // Shut up the console logs
        verbose = false;
        superVerbose = false;
    };
}

if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = xcGlobal;
    }
    exports.xcGlobal = xcGlobal;
}
