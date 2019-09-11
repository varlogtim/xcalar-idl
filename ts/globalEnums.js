var Status = {
    "Error": -1,
    "Unknown": 0,
    "Ok": 1,
    "Done": 2,
    "Running": 3,
    "Incomplete": 4
};

/** START DEBUG ONLY **/
// for XD dev which is on localhost, set to false by default
// for NON-XD dev which is on VMs,  set to true by default
var gLoginEnabled = (typeof window !== "undefined" && window.location.hostname === "localhost") ? false : true;
// enables/disables the usage of the "Update IMD" node.
// Since updating a published table doesnt quite fit with the
// methodology of dataflows, it should be limited to internal
// use only.
var gUpdateIMDAccess = false;
// Default Shared Root is disabled in cloud
// this flag will allow it to continues to use
/** END DEBUG ONLY **/