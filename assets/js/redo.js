window.Redo = (function($, Redo) {


    Redo.run = function(sql) {
        xcHelper.assert((sql != null), "invalid sql");

        var deferred = jQuery.Deferred();

        var options = sql.getOptions();
        var operation = sql.getOperation();

        if (redoFuncs.hasOwnProperty(operation)) {
            redoFuncs[operation](options)
            .then(deferred.resolve)
            .fail(function() {
                // XX do we do anything with the cursor?
                deferred.reject("redo failed");
            });
        } else {
            console.error("Unknown operation", operation);
            deferred.reject("Unknown operation");

        }

        return (deferred.promise());
    };

    var redoFuncs = {};

    redoFuncs[SQLOps.Filter] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
    };

    redoFuncs[SQLOps.Map] = function(options) {
        var worksheet = WSManager.getWSFromTable(options.tableId);
        return (TblManager.refreshTable([options.newTableName], null,
                                            [options.tableName],
                                            worksheet, {isRedo: true}));
    };

    redoFuncs[SQLOps.Join] = function(options) {
        var deferred = jQuery.Deferred();
            TblManager.refreshTable([options.newTableName], null,
                                    [options.lTableName, options.rTableName],
                                     options.worksheet,
                                     {isRedo: true})
            .then(deferred.resolve)
            .fail(deferred.fail);

        return (deferred.promise());
    };

    redoFuncs[SQLOps.HideCols] = function(options) {
        ColManager.hideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    redoFuncs[SQLOps.UnHideCols] = function(options) {
        ColManager.unhideCols(options.colNums, options.tableId);
        return (promiseWrapper(null));
    };

    return (Redo);
}(jQuery, {}));
