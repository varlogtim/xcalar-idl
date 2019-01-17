window.XcSDK = window.XcSDK || {};
window.XcSDK.Table = function(tableName, worksheet, modelingMode) {
    this.tableName = tableName;
    // private variable
    this.worksheet = worksheet;
    // mark if this table is shown or hidden
    this.active = false;
    this.tablesToReplace = null;

    var tableId = xcHelper.getTableId(tableName);
    if (tableId != null && gTables[tableId] != null) {
        this.tableCols = gTables[tableId].tableCols;
    }

    if (this.tableCols == null) {
        this.tableCols = [];
    }
    this.modelingMode = modelingMode || false;
    return this;
};

window.XcSDK.Table.prototype = {
    getName: function() {
        return this.tableName;
    },

    // XXX Comment it util it has any use case
    // getCopyOfColumns: function() {
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

    setCols: function(tableCols) {
        this.tableCols = tableCols
    },

    getColsAsArray: function() {
        var cols = [];
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];
            var col = new XcSDK.Column(progCol.getBackColName(),
                progCol.getType());
            cols.push(col);
        }
        return cols;
    },

    getColNamesAsArray: function() {
        var cols = [];
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];
            var colName = progCol.getBackColName();
            cols.push(colName);
        }

        return cols;
    },

    getColNum: function(col) {
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

    isInWorksheet: function() {
        return this.active;
    },

    getTablesToReplace: function() {
        return this.tablesToReplace;
    },

    // this is a function that should be deprecated
    addToWorksheet: function(tablesToReplace, txId) {
        this.active = true;
        return PromiseHelper.resolve();
    },

    addCol: function(col, position) {
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
        if (this.hasCol(colName)) {
            console.error(ErrTStr.ColumnConflict);
            return this;
        }

        var frontName = col.getFrontName();
        var progCol = ColManager.newPullCol(frontName, colName, col.getType());
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

    hasCol: function(colName) {
        var tableCols = this.tableCols;
        for (var i = 0, len = tableCols.length; i < len; i++) {
            var backColName = tableCols[i].getBackColName();
            if (colName === backColName) {
                return true;
            }
        }

        return false;
    },

    deleteCol: function(col) {
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

    deleteAllCols: function() {
        this.tableCols = [];
        return this;
    },

    getImmediatesMeta: function() {
        return this.__getColMeta(true);
    },

    getPrefixMeta: function() {
        return this.__getColMeta(false);
    },

    __getColMeta: function(isImmediate) {
        var tableName = this.tableName;
        var tableId = xcHelper.getTableId(tableName);
        if (tableId != null && gTables[tableId] != null
            && gTables[tableId].backTableMeta != null) {
            var res = [];
            gTables[tableId].backTableMeta.valueAttrs.forEach(function(attr) {
                var isTypeImmediate = (attr.type !== DfFieldTypeT.DfFatptr);
                var shouldAddMeta = (isImmediate && isTypeImmediate)
                                    || (!isImmediate && !isTypeImmediate);
                if (shouldAddMeta) {
                    res.push(attr);
                }
            });

            return res;
        }

        return null;
    },

    refreshIMDList: function() {
        IMDPanel.needsUpdate();
    }
};
