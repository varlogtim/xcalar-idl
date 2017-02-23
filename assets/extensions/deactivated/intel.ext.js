// Every extension must be named UExt<EXTENSIONNAME>
// Every extension must be named after the file which will be
// <EXTENSIONNAME>.ext.js
// Extensions are case INSENSITIVE
// Every extension must have 2 functions:
// buttons
// actionFn
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
window.UExtIntel = (function(UExtIntel) {
    UExtIntel.buttons = [{
        "buttonText"   : "Last Touch",
        "fnName"       : "lastTouch",
        "arrayOfFields": []
    },
    {
        "buttonText"   : "Final PT",
        "fnName"       : "genFinalPT",
        "arrayOfFields": []
    },
    {
        "buttonText"   : "Line Item PT",
        "fnName"       : "genLineItemPT",
        "arrayOfFields": []
    },
    {
        "buttonText"   : "No Of Days Since",
        "fnName"       : "genNoOfDays",
        "arrayOfFields": []
    }];

    UExtIntel.actionFn = function(functionName) {
        var ext = new XcSDK.Extension();

        switch (functionName) {
            case ("lastTouch"):
                // colName should be the string column Date in AuditTrail
                ext.start = genLastTouch;
                return ext;
                // This will generate a groupByTable with 2 cols and the a map
            case ("genFinalPT"):
                // TableName should be optyLineItem. We will look for pdt type
                // or line item pdt type
                ext.start = genFinalPT;
                return ext;
            case ("genLineItemPT"):
                // TableName should be optyLineItem. We will look for
                // the 3 columns
                // This will generate a groupby table
                ext.start = genLineItemPT;
                return ext;
            case ("genNoOfDays"):
                // This must be run on the last_modified_latest col
                ext.start = genNoOfDays;
                return ext;
            default:
                return null;
        }
    };

    function genLastTouch() {
        // Steps:
        // Step 1: We convert Date column to UTS (also convert to int)
        // Step 2: We do a groupBy on Record ID with max UTS
        // Step 3: We do a map on max UTS to convert back to %m/%d/%Y
        // Step 4: We add table to current worksheet
        var deferred = XcSDK.Promise.deferred();
        var ext = this;

        var tableName = ext.getTriggerTable().getName();
        var mapStr = "int(default:convertToUnixTS(Date, \"%m/%d/%Y\"))";
        var dateCol = "Date_UTS";
        var finalCol = "Final_Touch";
        var mapTable = ext.createTempTableName();

        ext.map(mapStr, tableName, dateCol, mapTable)
        .then(function(tableAfterMap) {
            var operator = XcSDK.Enums.AggType.Max;
            var newTable = ext.createTempTableName();
            return ext.groupBy(operator, "Record ID", dateCol,
                            false, null, tableAfterMap, "Max_Date", newTable);
        })
        .then(function(tableAfterGroupby) {
            var map = "default:convertFromUnixTS(Max_Date, \"%m/%d/%Y\")";
            var newTable = ext.createTableName();
            return ext.map(map, tableAfterGroupby, finalCol, newTable);
        })
        .then(function(finalTable) {
            var table = ext.getTable(finalTable);
            var colNum = getColNum("Max_Date", table);
            var newCol = new XcSDK.Column(finalCol, "string");
            table.addCol(newCol, colNum);

            return table.addToWorksheet();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function genFinalPT() {
        var deferred = XcSDK.Promise.deferred();
        var ext = this;
        var tableName = ext.getTriggerTable().getName();

        var mapStr = "intel:genFinalPT(Product Type, Line Item Product Type)";
        var newColName = "Final PT";

        ext.map(mapStr, tableName, newColName)
        .then(function(tableAfterMap) {
            var table = ext.getTable(tableAfterMap);
            var colNum = getColNum("Line Item Product Type", table);
            var newCol = new XcSDK.Column(newColName, "string");
            table.addCol(newCol, colNum);

            return table.addToWorksheet();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function genLineItemPT() {
        // Step 1: Change Forecasted Detail Actual Dollar Amount to float
        // Step 2: groupBy on "ROW_ID,Product Type", sum "Forecasted_float"
        // Step 3: groupBy on "ROW_ID", max "SumByPdt"
        // Step 4: multi join ROW ID, SumByPdt == ROW_ID, MaxForRow
        // Step 5: GroupBy Row_ID count inc sample to randomly pick
        var deferred = XcSDK.Promise.deferred();
        var ext = this;

        var tableName = ext.getTriggerTable().getName();
        var mapStr = "float(Forecasted Detail Actual Dollar Amount)";
        var mapTable = ext.createTempTableName();
        var lTable;
        var rTable;

        ext.map(mapStr, tableName, "Forecasted_float", mapTable)
        .then(function(tableAfterMap) {
            var newTable = ext.createTempTableName();

            var operator = XcSDK.Enums.AggType.Sum;
            var groupByCols = ["ROW_ID", "Product Type"];
            return ext.groupBy(operator, groupByCols, "Forecasted_float",
                                false, null, tableAfterMap, "SumByPdt", newTable);
        })
        .then(function(tableAfterGroupby) {
            var newTable = ext.createTempTableName();
            lTable = tableAfterGroupby;

            var operator = XcSDK.Enums.AggType.Max;
            return ext.groupBy(operator, "ROW_ID", "SumByPdt",
                            false, null, tableAfterGroupby, "MaxForRow", newTable);
        })
        .then(function(tableAfterGroupby) {
            var newTable = ext.createTempTableName();
            rTable = tableAfterGroupby;

            var joinType = XcSDK.Enums.JoinType.InnerJoin;
            var lTableInfo = {
                "tableName": lTable,
                "columns"  : ["ROW_ID", "SumByPdt"]
            };
            var rTableInfo = {
                "tableName": rTable,
                "columns"  : ["ROW_ID", "MaxForRow"]
            };
            return ext.join(joinType, lTableInfo, rTableInfo, newTable);
        })
        .then(function(tableAfterJoin) {
            var newTable = ext.createTableName();
            var operator = XcSDK.Enums.AggType.Count;
            return ext.groupBy(operator, "ROW_ID", "ROW_ID",
                                true, [], tableAfterJoin, "NumOccur", newTable);
        })
        .then(function(finalTable) {
            var table = ext.getTable(finalTable);
            table.deleteAllCols();
            table.addCol(new XcSDK.Column("ROW_ID"));
            table.addCol(new XcSDK.Column("Product Type"));
            table.addCol(new XcSDK.Column("NumOccur"));
            table.addCol(new XcSDK.Column("SumByPdt"));

            return table.addToWorksheet();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function genNoOfDays() {
        // Step 1: Create column Modified No Blank
        // Step 2: Create column Last_Modified_Latest by doing ifelse on
        // Final Date and ModifiedNoBlank
        // Step 3: Create No Days since col
        // Step 4: Change col to float
        // Step 5: Map <= 60
        var deferred = XcSDK.Promise.deferred();
        var ext = this;

        var tableName = ext.getTriggerTable().getName();
        var mapStr = "intel:ifElse(Last Modified, Created Date)";
        var mapTable = ext.createTempTableName();

        ext.map(mapStr, tableName, "Last Modified_NoBlank", mapTable)
        .then(function(tableAfterMap) {
            var map = "intel:convertDateValueToUTS(Last Modified_NoBlank)";
            var newTable = ext.createTempTableName();
            return ext.map(map, tableAfterMap, "LastModified_UTS", newTable);
        })
        .then(function(tableAfterMap) {
            var map = "default:convertFromUnixTS(LastModified_UTS," +
                                                "\"%m/%d/%Y %H:%S\")";
            var newTable = ext.createTempTableName();
            return ext.map(map, tableAfterMap, "LastModified_readable",
                            newTable);
        })
        .then(function(tableAfterMap) {
            var map = "intel:ifElse(Final Touch, LastModified_readable)";
            var newTable = ext.createTempTableName();
            return ext.map(map, tableAfterMap, "Last_Modified_Latest",
                            newTable);
        })
        .then(function(tableAfterMap) {
            var map = "intel:noOfDays(Last_Modified_Latest)";
            var newTable = ext.createTempTableName();
            return ext.map(map, tableAfterMap, "DaysSince", newTable);
        })
        .then(function(tableAfterMap) {
            var map = "float(DaysSince)";
            var newTable = ext.createTableName();
            return ext.map(map, tableAfterMap, "No of Days since last modified",
                            newTable);
        })
        .then(function(finalTable) {
            var table = ext.getTable(finalTable);
            table.deleteAllCols();
            table.addCol(new XcSDK.Column("No of Days since last modified"));
            table.addCol(new XcSDK.Column("Last_Modified_Latest"));

            return table.addToWorksheet();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getColNum(colName, table) {
        var col = new XcSDK.Column(colName);
        return table.getColNum(col);
    }

    return (UExtIntel);
}({}));

