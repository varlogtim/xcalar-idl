window.XcSDK = window.XcSDK || {};
window.XcSDK.Column = function(colName, colType) {
    if (colName == null) {
        colName = xcHelper.randName("randCol");
    }

    if (colType == null) {
        colType = "undefined";
    }

    this.colName = colName;
    this.colType = colType;

    return this;
};

window.XcSDK.Column.prototype = {
    getName: function() {
        return this.colName;
    },

    getType: function() {
        return this.colType;
    },

    getPrefix: function() {
        return xcHelper.parsePrefixColName(this.colName).prefix;
    },

    getParsedName: function() {
        return xcHelper.parsePrefixColName(this.colName).name;
    },
};
