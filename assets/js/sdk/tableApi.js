window.XcSDK = window.XcSDK || {};
window.XcSDK.Table = function(tableName, worksheet) {
    this.tableName = tableName;
    // private variable
    this.worksheet = worksheet;
    // mark if this table is shown or hidden
    this.active = false;

    var tableId = xcHelper.getTableId(tableName);
    if (tableId != null && gTables[tableId] != null) {
        this.tableCols = gTables[tableId].tableCols;
    }

    if (this.tableCols == null) {
        this.tableCols = [];
    }

    return this;
};

window.XcSDK.Table.prototype = {
    "getName": function() {
        return this.tableName;
    },

    // XXX Comment it util it has any use case
    // "getCopyOfColumns": function() {
    //     // to check columns
    //     // XXX not test yet
    //     var cols = [];
    //     var tableCols = this.tableCols;
    //     for (var i = 0, len = tableCols.length; i < len; i++) {
    //         var progCol = tableCols[i];
    //         var colName = progCol.getBackColName();
    //         var colType = progCol.getType();
    //         var col = new XcSDK.Column(colName, colType, (i + 1));
    //         cols.push(col);
    //     }

    //     return cols;
    // },

    "getColNum": function(col) {
        if (!(col instanceof XcSDK.Column)) {
            console.error("column must be of type XcSDK.Column");
            return -1;
        }
        // colNum start with 1
        var colName = col.getName();
        var tableCols = this.tableCols;

        for (var i = 0, len = tableCols.length; i < len; i++) {
            if (colName === tableCols[i].getBackColName()) {
                return (i + 1);
            }
        }

        return -1;
    },

    "isInWorksheet": function() {
        return this.active;
    },

    "addToWorksheet": function() {
        var tableName = this.tableName;
        var ws = this.worksheet;
        var tableCols = this.tableCols;

        var hasDataCol = false;
        // Performance: usually data col is the last col
        for (var i = tableCols.length - 1; i >= 0; i--) {
            if (tableCols[i].isDATACol()) {
                hasDataCol = true;
                break;
            }
        }

        if (!hasDataCol) {
            // add data col if does not exist
            tableCols.push(ColManager.newDATACol());
        }

        var tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] != null) {
            // extension's FASJ will create table meta and add it to gTables,
            // should delete first in case of conflict
            delete gTables[tableId];
        }

        this.active = true;
        return TblManager.refreshTable([tableName], tableCols, [], ws);
    },

    "addCol": function(col, position) {
        if (!(col instanceof XcSDK.Column)) {
            console.error("column must be of type XcSDK.Column");
            return this;
        }

        var tableCols = this.tableCols;
        var len = tableCols.length;
        if (position == null) {
            // default position
            position = len;
        }

        if (position < 0 || position > len) {
            console.error("You must insert between 0 and ", len);
            return this;
        }

        var colName = col.getName();
        var progCol = ColManager.newCol({
            "name"    : colName,
            "type"    : col.getType(),
            "width"   : gNewCellWidth,
            "isNewCol": false,
            "userStr" : '"' + colName + '" = pull(' + colName + ')',
            "func"    : {
                "func": "pull",
                "args": [colName]
            }
        });

        if (len === 0) {
            tableCols.push(progCol);
            return this;
        }

        if (position === len && tableCols[position - 1].isDATACol()) {
            // when insert after data col
            position = len - 1;
        }
        tableCols.splice(position, 0, progCol);
        return this;
    },

    "deleteCol": function(col) {
        if (!(col instanceof XcSDK.Column)) {
            console.error("column must be of type XcSDK.Column");
            return false;
        }

        var colName = col.getName();
        var tableCols = this.tableCols;

        for (var i = 0, len = tableCols.length; i < len; i++) {
            if (colName === tableCols[i].getBackColName()) {
                tableCols.splice(i, 1);
                return true;
            }
        }
        // when cannot find the col
        return false;
    },

    "deleteAllCols": function() {
        this.tableCols = [];
        return this;
    }
};
