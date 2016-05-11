// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 3 functions:
// buttons
// actionFn
// undoActionFn
// buttons must return an array of structs. each struct must have a field
// called "buttonText" which populates the text in the button
// each struct must have a fnName field which contains the name of the function
// that will be triggered
// each struct must also have a field called arrayOfFields that is an array of
// requirements for each of the arguments that must be passed into the struct
// actionFn is a function that will get invoked once the user presses any of
// the buttons belonging to the extension
// undoActionFn is a function that will get invoked once the user tries to undo
// an action that belongs to this extension
window.UExtIntel = (function(UExtIntel, $) {
    UExtIntel.buttons = [{
        "buttonText"    : "Last Touch",
         "fnName"       : "lastTouch",
         "arrayOfFields": []
    },
    {
        "buttonText"   : "Final PT",
        "fnName"       : "genFinalPT",
        "arrayOfFields": []
    },
    {
        "buttonText"    : "Line Item PT",
        "fnName"        : "genLineItemPT",
         "arrayOfFields": []
    },
    {
        "buttonText"   : "No Of Days Since",
        "fnName"       : "genNoOfDays",
        "arrayOfFields": []
    }];

    UExtIntel.undoActionFn = undefined;
    UExtIntel.actionFn = function(txId, colNum, tableId, functionName, argList) {
        var table = gTables[tableId];
        var colName = table.tableCols[colNum - 1].name;
        var tableName = table.tableName;
        var tableNameRoot = tableName.split("#")[0];
        switch (functionName) {
            case ("lastTouch"):
                // colName should be the string column Date in AuditTrail
                return genLastTouch(colName, tableName);
                // This will generate a groupByTable with 2 cols and the a map
            case ("genFinalPT"):
                // TableName should be optyLineItem. We will look for pdt type or
                // line item pdt type
                return genFinalPT(tableName);
            case ("genLineItemPT"):
                // TableName should be optyLineItem. We will look for the 3 columns
                return genLineItemPT(tableName);
                // This will generate a groupby table
            case ("genNoOfDays"):
                // This must be run on the last_modified_latest col
                return genNoOfDays(colName, tableName);
            default:
                return PromiseHelper.reject("Invalid Function");
        }

        function genLastTouch(colName, tableName) {
            // Steps:
            // Step 1: We convert colName to UTS
            // Step 2: We do a groupBy on Record ID with max UTS
            // Step 3: We do a map on max UTS to convert back to %m/%d/%Y
            // Step 4: We add table to current worksheet
            var deferred = jQuery.Deferred();
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "default:convertToUnixTS(Date, \"%m/%d/%Y\")";
            var newColName = "Date_UTS";
            var srcTable = tableName;
            var tableId = xcHelper.getTableId(tableName);
            var worksheet = WSManager.getWSFromTable(tableId);

            XcalarMap(newColName, mapStr, srcTable, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Date", tableId);
                newCols.splice(idx+1, 0, ColManager.newPullCol("Date_UTS"));

                return (TblManager.refreshTable([newTableName], newCols,
                                                [srcTable], worksheet));
            })
            .then(function() {
                srcTable = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                newColName = "Date_UTS_integer";
                mapStr = "int(Date_UTS)";
                return (XcalarMap(newColName, mapStr, srcTable, newTableName,
                                  null, false));
            })
            .then(function() {
                tableId = xcHelper.getTableId(srcTable);
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Date_UTS", tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Date_UTS_integer"));

                return (TblManager.refreshTable([newTableName], newCols,
                                                [srcTable], worksheet));
            })
            .then(function() {
                srcTable = newTableName;
                tableId = xcHelper.getTableId(srcTable);
                return (xcFunction.groupBy(AggrOp.Max, tableId,
                                           "Record ID", "Date_UTS_integer",
                                           false, "Max_Date"));
            })
            .then(function(tn) {
                srcTable = tn;
                newTableName = tableNameRoot + Authentication.getHashId();
                newColName = "Final Touch";
                mapStr = "default:convertFromUnixTS(Max_Date, \"%m/%d/%Y\")";
                return (XcalarMap(newColName, mapStr, srcTable, newTableName,
                                  null, false)
                        .then(function() {
                            tableId = xcHelper.getTableId(srcTable);
                            var newCols = xcHelper.deepCopy(gTables[tableId].
                                                            tableCols);
                            var idx = getColNum("Max_Date", tableId);
                            newCols.splice(idx+1, 0,
                                          (ColManager.newPullCol("Final Touch",
                                                                 "string")));
                            return (TblManager.refreshTable([newTableName],
                                                            newCols,
                                                            [srcTable],
                                                            worksheet));
                        }));
            })
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function genFinalPT(tableName) {
            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "intel:genFinalPT(Product Type, Line Item Product Type)";
            var worksheet = WSManager.getWSFromTable(tableId);
            XcalarMap("Final PT", mapStr, tableName, newTableName, null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Line Item Product Type", tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Final PT", "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function genLineItemPT(tableName) {
            // Step 1: Change Forecasted Detail Actual Dollar Amount to float
            // Step 2: xcFunction.groupBy(sum, tableId, indexedCols,
            // aggColName, false, newColName)
            // Step 3: single groupBy(max
            // Step 4: multi join ROW ID, max == forecasted_float
            // Step 5: GroupBy Row_ID count inc sample to randomly pick
            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "float(Forecasted Detail Actual Dollar Amount)";
            var worksheet = WSManager.getWSFromTable(tableId);
            var tableNameStore = [];

            XcalarMap("Forecasted_float", mapStr, tableName, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                var idx = getColNum("Forecasted Detail Actual Dollar Amount",
                                    tableId);
                newCols.splice(idx+1, 0,
                               ColManager.newPullCol("Forecasted_float",
                                                     "float"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Sum, tableId,
                                           "ROW_ID,Product Type",
                                        "Forecasted_float", false, "SumByPdt"));
            })
            .then(function(tn) {
                tableNameStore.push(tn);
                newTableName = tn;
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Max, tableId, "ROW_ID",
                                           "SumByPdt", false, "MaxForRow"));
            })
            .then(function(tn) {
                tableNameStore.push(tn);
                newTableName = tn;
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                // Let's get the column numbers for the left table
                var lId = xcHelper.getTableId(tableNameStore[0]);
                var rId = xcHelper.getTableId(tableNameStore[1]);
                tableNameStore.unshift(newTableName);
                var lColNums = [getColNum("ROW_ID", lId),
                                getColNum("SumByPdt", lId)];
                var rColNums = [getColNum("ROW_ID", rId),
                                getColNum("MaxForRow", rId)];
                return (xcFunction.join(lColNums, lId, rColNums, rId,
                                        "Inner Join", newTableName));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                return (xcFunction.groupBy(AggrOp.Count, tableId, "ROW_ID",
                                           "ROW_ID", true, "NumOccur"));
            })
            .then(function(tn) {
                // XXX Why is delCol 1-indexed? Leftover from last time?
                ColManager.delCol([1, 4, 5, 6], xcHelper.getTableId(tn));
                TblManager.archiveTable(xcHelper.getTableId(tableNameStore[0]));
            })
            .then(function() {
                deferred.resolve(tableNameStore);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
        // TODO this should be in xcHelper
        function getColNum(colName, tableId) {
            var table = gTables[tableId];
            var cols = table.tableCols;
            for (var i = 0; i<cols.length; i++) {
                if (cols[i].name == colName) {
                    return (i);
                }
            }
            return (-1);
        }

        function genNoOfDays(colName, tableName) {
            // Step 1: Create column Modified No Blank
            // Step 2: Create column Last_Modified_Latest by doing ifelse on
            // Final Date and ModifiedNoBlank
            // Step 3: Create No Days since col
            // Step 4: Change col to float
            // Step 5: Map <= 60
            var deferred = jQuery.Deferred();
            var tableId = xcHelper.getTableId(tableName);
            var table = gTables[tableId];
            var newTableName = tableNameRoot + Authentication.getHashId();
            var mapStr = "intel:ifElse(Last Modified, Created Date)";
            var worksheet = WSManager.getWSFromTable(tableId);

            XcalarMap("Last Modified_NoBlank", mapStr, tableName, newTableName,
                      null, false)
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("Last Modified_NoBlank",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:convertDateValueToUTS(Last Modified_NoBlank)";
                return (XcalarMap("LastModified_UTS", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("LastModified_UTS",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "default:convertFromUnixTS(LastModified_UTS,"+
                                                    "\"%m/%d/%Y %H:%S\")";
                return (XcalarMap("LastModified_readable", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("LastModified_readable",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                               [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:ifElse(Final Touch, LastModified_readable)";
                return (XcalarMap("Last_Modified_Latest", mapStr, tableName,
                                  newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("Last_Modified_Latest",
                                                      "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "intel:noOfDays(Last_Modified_Latest)";
                return (XcalarMap("DaysSince",
                                  mapStr, tableName, newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol("DaysSince", "string"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                tableName = newTableName;
                newTableName = tableNameRoot + Authentication.getHashId();
                mapStr = "float(DaysSince)";
                return (XcalarMap("No of Days since last modified", mapStr,
                                  tableName, newTableName, null, false));
            })
            .then(function() {
                var newCols = xcHelper.deepCopy(gTables[tableId].tableCols);
                newCols.unshift(ColManager.newPullCol(
                "No of Days since last modified", "float"));
                return (TblManager.refreshTable([newTableName], newCols,
                                                [tableName], worksheet));
            })
            .then(function() {
                tableId = xcHelper.getTableId(newTableName);
                ColManager.delCol([2, 3, 4, 5, 6], tableId);
                $("#xcTable-"+tableId).find("th.col1 .flexContainer")
                                      .mousedown() ;
            })
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }
    };
    return (UExtIntel);
}({}, jQuery));

