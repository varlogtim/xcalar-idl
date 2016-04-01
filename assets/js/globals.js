/**
    This file is where all the global variables go
*/

// =================================== Globals =================================
var gNumEntriesPerPage = 20;
var gMaxEntriesPerPage = 60;
var gMinRowsPerScreen = 60;
var gFirstRowPositionTop = 71;
var gNewCellWidth = 125;
var gMouseStatus = null;
var gMouseEvents = new MouseEvents();
var gRescol = {
    "minCellHeight": 25,
    "cellMinWidth" : 15,
    "clicks"       : 0,
    "delay"        : 500,
    "timer"        : null
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
  "FLAG": special commitFlag to make sure UI have right to write (should be XcalarApiKeyScopeSession)
 */
var gKVScope = {
    "AUTH": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "USER": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "WKBK": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "META": XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "LOG" : XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "ERR" : XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal,
    "FLAG": XcalarApiKeyScopeT.XcalarApiKeyScopeSession,
    "VER" : XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal
};
var gTables = {}; // This is the main global array containing structures
                    // Stores TableMeta structs
var gOrphanTables = [];
var gActiveTableId = "";
var gDSObj = {};    //obj for DS folder structure
var gRetinaObj = {}; //obj for retina modal
var gLastClickTarget = $(window); // track which element was last clicked
var gDatasetBrowserResultSetId = 0; // resultSetId for currently viewed
var gIsTableScrolling = false;
var gMinModeOn = false;
var gExportNoCheck = false;
var gExportFDelim = "\t";
var gExportRDelim = "\n";
var KB = 1024;
var MB = 1024 * KB;
var GB = 1024 * MB;
var TB = 1024 * GB;
var PB = 1024 * TB;

// Shut up the console logs
var verbose = false;
var superVerbose = false;
