var Status = {
    "Error": -1,
    "Unknown": 0,
    "OK": 1,
    "Done"   : 2,
    "Running": 3
}

function getStatus(num) {
    var key = Object.keys(Status)[num + 1];
    return key;
}

exports.Status = Status;
exports.getStatus = getStatus;
