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
var gLoginEnabled = (window.location.hostname === "localhost") ? false : true;
/** END DEBUG ONLY **/