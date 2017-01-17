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

    // returns name of cast function for colType
    getTypeForCast: function() {
        if (this.colType == "integer") {
            return "int"
        } else if (this.colType == "boolean") {
            return "bool"
        } else {
            // string and float
            return this.colType
        }
    },

    // returns "" if no prefix
    getPrefix: function() {
        return xcHelper.parsePrefixColName(this.colName).prefix;
    },

    getParsedName: function() {
        return xcHelper.parsePrefixColName(this.colName).name;
    },
};
