var SupportStatus = {
    "Error": -1,
    "OKLog": 0,
    "OKNoLog": 1,
    "OKUnknown": 2,
};

function getStatus(num) {
    var key = Object.keys(SupportStatus)[num + 1];
    return key;
}

exports.SupportStatus = SupportStatus;
exports.getStatus = getStatus;
