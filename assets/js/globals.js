/**
    This file is where all the global variables go
*/

var has_require = typeof require !== 'undefined';
// =================================== Globals =================================
KB = 1024;
MB = 1024 * KB;
GB = 1024 * MB;
TB = 1024 * GB;
PB = 1024 * TB;
// ========================================================================== //
gNumEntriesPerPage = 20;
gMaxEntriesPerPage = 60;
gMinRowsPerScreen = 60;
gFirstRowPositionTop = 60;
gNewCellWidth = 125;
gMouseStatus = null;
gPrefixLimit = 31;

if (!has_require) {
    gMouseEvents = new MouseEvents();
    gLastClickTarget = $(window); // track which element was last clicked
}

gRescol = {
    "minCellHeight": 25,
    "cellMinWidth": 15,
    "clicks": 0,
    "delay": 500,
    "timer": null
};

gMinTableWidth = 30;
// XXX TODOS(bug 2319): this part should change to right scope after backend fix
/*
  "AUTH": Authentication info (should be XcalarApiKeyScopeSession)
  "USER": user infos like ds info and preference (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "WKBK": Workbook info (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "META": all meta data need for UI (XXX this should be XcalarApiKeyScopeSession, no support yet!)
  "LOG" : Log (this use append) (XXX this should be XcalarApiKeyScopeSession, no support yet!)
  "Err" : Error log (this use append) (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "FLAG": special commitFlag to make sure UI have right to write (should be XcalarApiKeyScopeSession),
  "VER" : For KVVersion (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "GLOB": general global
 */
gKVScope = {
    "AUTH": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "USER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "WKBK": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "META": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "EPHM": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "LOG": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "ERR": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "FLAG": XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
    "VER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "GLOB": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "XD": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "INIT": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal
};
gTables = {}; // This is the main global array containing structures
                  // Stores TableMeta structs
gOrphanTables = [];
gDroppedTables = {};
gActiveTableId = "";
gIsTableScrolling = false;
gMinModeOn = false;
gMutePromises = true; // mutes .when() console logs
gAggVarPrefix = "^";
gColPrefix = '$';
gPrefixSign = '::';
gRetSign = ":";
gDSPrefix = '.XcalarDS.';
gHiddenColumnWidth = 15;
gTurnOnPrefix = true;
gUploadChunkSize = 45 * MB;
gDefaultSharedRoot = "Default Shared Root";

// ======== Support Parameters ======== //
gExportNoCheck = false;
gAlwaysDelete = false;
gEnableCopyCols = false;
gShowDroppedTablesImage = false;
gDefaultFDelim = "\t";
gDefaultRDelim = "\n";
gDefaultQDelim = '"';
gLongTestSuite = 1;
gMaxDSColsSpec = 127; // Max num of columns that can be ordered, renamed, or
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
gEnableLocalFiles = false;
gDemoMemory = false;
gCollab = false; // if strip / in username or not

// Shut up the console logs
verbose = false;
superVerbose = false;
