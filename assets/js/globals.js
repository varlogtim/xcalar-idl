/**
    This file is where all the global variables go
*/

// =================================== Globals =================================
var KB = 1024;
var MB = 1024 * KB;
var GB = 1024 * MB;
var TB = 1024 * GB;
var PB = 1024 * TB;
// ========================================================================== //
var gNumEntriesPerPage = 20;
var gMaxEntriesPerPage = 60;
var gMinRowsPerScreen = 60;
var gFirstRowPositionTop = 60;
var gNewCellWidth = 125;
var gMouseStatus = null;
var gPrefixLimit = 20;
var gMouseEvents = new MouseEvents();
var gRescol = {
    "minCellHeight": 25,
    "cellMinWidth": 15,
    "clicks": 0,
    "delay": 500,
    "timer": null
};

var gMinTableWidth = 30;
// XXX TODOS(bug 2319): this part should change to right scope after backend fix
/*
  "AUTH": Authentication info (should be XcalarApiKeyScopeSession)
  "USER": user infos like ds info and preference (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "WKBK": Workbook info (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "META": all meta data need for UI (XXX this should be XcalarApiKeyScopeSession, no support yet!)
  "LOG" : SQL Log (this use append) (XXX this should be XcalarApiKeyScopeSession, no support yet!)
  "Err" : SQL Error (this use append) (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "FLAG": special commitFlag to make sure UI have right to write (should be XcalarApiKeyScopeSession),
  "VER" : For KVVersion (XXX this should be XcalarApiKeyScopeUser, no support yet!)
  "GLOB": general global
 */
var gKVScope = {
    "AUTH": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "USER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "WKBK": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "META": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "EPHM": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "LOG": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "ERR": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "FLAG": XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
    "VER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "GLOB": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal
};
var gTables = {}; // This is the main global array containing structures
                  // Stores TableMeta structs
var gOrphanTables = [];
var gActiveTableId = "";
var gLastClickTarget = $(window); // track which element was last clicked
var gIsTableScrolling = false;
var gMinModeOn = false;
var gMutePromises = true; // mutes .when() console logs
var gAggVarPrefix = "^";
var gColPrefix = '$';
var gPrefixSign = '::';
var gDSPrefix = '.XcalarDS.';
var gHiddenColumnWidth = 15;
var gTurnOnPrefix = true;
var gUploadChunkSize = 45 * MB;

// ======== Support Parameters ======== //
var gExportNoCheck = false;
var gAlwaysDelete = false;
var gEnableCopyCols = false;
var gEnableJoinKeyCheck = false;
var gShowDroppedTablesImage = false;
var gDefaultFDelim = "\t";
var gDefaultRDelim = "\n";
var gDefaultQDelim = '"';
var gLongTestSuite = 1;
var gMaxColToPull = 300; // Max num of column can create directly from preview.
var gMaxSampleSize = 0; // Max Sample Size for datasets. If this is set, all
                        // datasets will abide by this limit. If you don't want
                        // to use it anymore, just set it back to 0
var gUdfDefaultNoCheck = false; // when set true, allow update default udf
var gSessionNoCleanup = false;
var gIcvMode = false;
var gEnableIndexStyle = false;
var gAdmin = false; // if admin user
var gXcSupport = false; // if xcalar support user


// Shut up the console logs
var verbose = false;
var superVerbose = false;
