window.Undo = (function($, Undo) {

    Undo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (undoFuncs.hasOwnProperty(operation)) {
            undoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                 deferred.reject("undo failed");
            });
        } else {
            console.error("Unknown operation", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };

    var undoFuncs = {};

    undoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return(TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return(TblManager.refreshTable([options.tableName], null,
                                       [options.newTableName],
                                       worksheet, {isUndo: true}));
    };

    undoFuncs[SQLOps.Join] = function(options) {
        var deferred = jQuery.Deferred();

        var currTableId = xcHelper.getTableId(options.newTableName);
        var currTableWorksheet = WSManager.getWSFromTable(currTableId);

        var lTableWorksheet = WSManager.getWSFromTable(options.lTableId);
        var rTableWorksheet = WSManager.getWSFromTable(options.rTableId);

        var leftTable = {
            name: options.lTableName,
            id: options.lTableId,
            position: options.lTablePos,
            worksheet: lTableWorksheet
        };

        var rightTable = {
            name: options.rTableName,
            id: options.rTableId,
            position: options.rTablePos,
            worksheet: rTableWorksheet
        };

        var isSelfJoin = false;
        if (leftTable.id === rightTable.id) {
            isSelfJoin = true;
        }

        var firstTable = {};
        var secondTable = {};

        if (!isSelfJoin) {
            if (leftTable.worksheet === rightTable.worksheet) {
                if (leftTable.position > rightTable.position) {
                    var temp = rightTable;
                    rightTable = leftTable;
                    leftTable = temp;
                }
            }
        }

        if (currTableWorksheet !== leftTable.worksheet  &&
            currTableWorksheet !== rightTable.worksheet) {
            firstTable = leftTable;
            secondTable = rightTable;
        } else if (currTableWorksheet === leftTable.worksheet) {
            firstTable = leftTable;
            firstTable.position = null; // we will rely on newTable's position
            secondTable = rightTable;
        } else if (!isSelfJoin && currTableWorksheet === rightTable.worksheet) {
            firstTable = rightTable;
            firstTable.position = null; // we will rely on newTable's position
            secondTable = leftTable;
        }


        TblManager.refreshTable([firstTable.name], null,
                                [options.newTableName],
                                firstTable.worksheet,
                                {isUndo: true,
                                 position: firstTable.position})
        .then(function() {
            if (isSelfJoin) {
                deferred.resolve();
            } else {
                TblManager.refreshTable([secondTable.name], null, [],
                                         secondTable.worksheet,
                                         {isUndo: true,
                                          position: secondTable.position})
                .then(deferred.resolve)
                .fail(deferred.reject);
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    };

    undoFuncs[SQLOps.HideCols] = function(options) {
        ColManager.unhideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    undoFuncs[SQLOps.UnHideCols] = function(options) {
        ColManager.hideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    return (Undo);
}(jQuery, {}));

