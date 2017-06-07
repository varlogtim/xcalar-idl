window.UExtUnionAll = (function(UExtUnionAll) {

    UExtUnionAll.buttons = [{
        "buttonText": "Union All",
        "fnName": "unionAll",
        "arrayOfFields": [{
            "type": "table",
            "name": "Bottom Table",
            "fieldClass": "tableTwo",
        }
        ],
    }];

    // UExtHello.actionFn must reutrn a XcSDK.Extension obj or null
    UExtUnionAll.actionFn = function(functionName) {
        // it's a good convention to use switch/case to handle
        // different function in the extension and handle errors.
        switch (functionName) {
            case "unionAll":
                return unionAll();
            default:
                return null;
        }
    };

    function unionAll() {
        var ext = new XcSDK.Extension();

        ext.beforeStart = function() {

            var self = this;
            var args = self.getArgs();
            var tableOne = ext.getTriggerTable();
            var tableTwo = args.tableTwo;

            // Same number of visible columns required for union
            if (tableOne.tableCols.length !== tableTwo.tableCols.length) {
                return XcSDK.Promise.reject("Both tables must have an equal number of Columns");
            }

            var nonMatchingTypes = [];

            // find all column types that do not correspond between the two
            var j = 0;
            var totalCols = tableOne.tableCols.length;
            for (var i = 0; i < totalCols; i++) {

                //as long as data
                if (tableOne.tableCols[i].name === 'DATA') continue;
                if (tableTwo.tableCols[j].name === 'DATA') j++;

                if (j >= totalCols) continue;

                var typeOne = tableOne.tableCols[i].getType();
                var typeTwo = tableTwo.tableCols[j].getType();

                if ((typeOne === 'string' && typeTwo !== 'string') ||
                    (typeTwo === 'string' && typeOne !== 'string')) {

                    nonMatchingTypes.push(i);
                }

                if (typeOne === 'array' || typeOne === 'object') {
                    return XcSDK.Promise.reject("Object or Array type in Top Table");
                }

                if (typeTwo === 'array' || typeTwo === 'object') {
                    return XcSDK.Promise.reject("Object or Array type in Bottom Table");
                }
                j++;
            }

            // if there are any non matching types, show appropriate error msg
            if (nonMatchingTypes.length !== 0) {
                var errorStr = 'indices ' + nonMatchingTypes;
                if (nonMatchingTypes.length === 1) {
                    errorStr = 'index ' + nonMatchingTypes[0];
                }
                return XcSDK.Promise.reject("Column types do not match at " +
                    errorStr);
            }

            return XcSDK.Promise.resolve();
        };


        function combineColumns(ext, errMapConditionArgs) {
            // this merges a single pair of columns from each table after the
            // join statement.

            var deferred = XcSDK.Promise.deferred();

            var currTable = ext.getTable(errMapConditionArgs.tableToUse);
            // table 1 column
            var currCol = currTable.tableCols[errMapConditionArgs.cnt];
            // length of both tables is equal to the threshold attribute
            // the corresponding column of the second table is thus at an
            // interval of threshold indices
            var secondCol = currTable.tableCols[errMapConditionArgs.cnt +
                errMapConditionArgs.threshold]; // corresponding table 2 column

            var currColName = currCol.backName;
            var secondColName = secondCol.backName;
            // if prefix field, this converts to a derived field name format
            var newColName = currColName.replace('::', '_');
            if (newColName === currColName) {
                // is derived field, strip the '_1'
                newColName = newColName.slice(0, newColName.length - 2);
            }
            var fnToUse;

            // choose the conditional depending on the data point
            if (currCol.getType() === 'string') {
                fnToUse = 'ifStr';
            } else {
                fnToUse = 'if';
            }

            // if exists(colA) => return colA else colB
            // colA and colB occupy unique rows, this merges them to form a
            // new complete column with no blanks
            var mapStr = fnToUse + '(' + 'exists(' + currColName +
                '), ' + currColName + ', ' + secondColName + ')';

            ext.map(mapStr, currTable.getName(), newColName)
            .then(function(tableAfterMap) {
                var colToAdd = new XcSDK.Column(newColName);
                var newTable = ext.getTable(tableAfterMap);
                newTable.addCol(colToAdd);

                //keep track of the latest table so we can modify it
                errMapConditionArgs.tableToUse = tableAfterMap;
                // the new column will eventually be projected
                errMapConditionArgs.colsToProject.push(newColName);
                return tableAfterMap;
                // return newTable.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            errMapConditionArgs.cnt++;

            return deferred.promise();

        }

        ext.start = function() {
            var deferred = XcSDK.Promise.deferred();

            // struct to hold opaque arguments in the promise while loop
            var errMapConditionArgs = {
                'threshold': 0,
                'cnt': 0,
                'tableToUse': '', //keeps track of the table we are updating
                'colsToProject': [] // columns to project in final table
            };


            // JS convention, rename this to self in case of scoping issue
            var self = this;

            var args = self.getArgs();
            var tableOne = ext.getTriggerTable();
            var tableOneName = tableOne.getName();
            var tableTwo = args.tableTwo;
            var tableTwoName = tableTwo.getName();
            var tableOneColNames = tableOne.getColNamesAsArray();
            var tableTwoColNames = tableTwo.getColNamesAsArray();

            var totalCols = tableOneColNames.length;

            var rowColOne = "ColumnOfOnes";
            var rowColTwo = "ColumnOfTwos";

            //generate Row numbers for table 1
            var tableOnePromise = ext.map('int(1)', tableOneName,
                rowColOne);

            var tableTwoPromise = ext.map('int(2)', tableTwoName,
                rowColTwo);

            XcSDK.Promise.when(tableOnePromise, tableTwoPromise)
            .then(function(tableOneUniqueRowNum, tableTwoUniqueRowNum) {
                // perform a full outer join to get the required number of rows
                // and and all data in one table

                // resolve naming conlicts
                // add '_+1 to every col in tableOne and '_+2' to every col in
                // tableTwo to get unique names.
                var renameMapOne = [];
                var renameMapTwo = [];
                var appendStrTableOne = '_1';
                var appendStrTableTwo = '_2';

                // change all derived fields
                tableOne.getImmediatesMeta().forEach(function(col) {
                    var colName = col.name;
                    var newName = colName + appendStrTableOne;
                    renameMapOne.push(ext.getJoinRenameMap(colName,
                        newName, false));
                });

                tableTwo.getImmediatesMeta().forEach(function(col) {
                    var colName = col.name;
                    var newName = colName + appendStrTableTwo;
                    renameMapTwo.push(ext.getJoinRenameMap(colName,
                        newName, false));
                });

                // change only clashing prefix fields
                var cache = new Set();
                tableTwo.getPrefixMeta().forEach(function(prefixField) {
                    cache.add(prefixField.name);
                });
                tableOne.getPrefixMeta().forEach(function(prefixField) {
                    var prefix = prefixField.name;
                    if (cache.has(prefix)) {
                        var newPrefix = prefix +
                            (Math.floor(Math.random() * 1000) + 1000);
                        renameMapTwo.push(ext.getJoinRenameMap(prefix,
                            newPrefix, true));
                    }
                });

                var leftTableInfo = {
                    "tableName": tableOneUniqueRowNum,
                    "columns": rowColOne,
                    "pulledColumns": tableOneColNames,
                    "rename": renameMapOne
                };


                var rightTableInfo = {
                    "tableName": tableTwoUniqueRowNum,
                    "columns": rowColTwo,
                    "pulledColumns": tableTwoColNames,
                    "rename": renameMapTwo
                };

                //can allow the user to enter whether to keep tables
                //options = {}

                return ext.join(XcSDK.Enums.JoinType.FullOuterJoin,
                    leftTableInfo, rightTableInfo, {});
            })
            .then(function(tableAfterJoin) {
                // exclude 'DATA' column
                errMapConditionArgs.threshold = totalCols - 1;
                errMapConditionArgs.tableToUse = tableAfterJoin;
                var stopCondition =
                    "args[1].cnt >= args[1].threshold";
                return XcSDK.Promise.while(combineColumns,
                    [ext, errMapConditionArgs], stopCondition,
                    errMapConditionArgs);
            })
            .then(function() {
                // can allow the user to enter optional argument for table name
                var newTableName = ext.createTableName(null, null,
                    ext.tableNameRoot + '_union_' + tableTwoName);
                return ext.project(errMapConditionArgs.colsToProject,
                    errMapConditionArgs.tableToUse, newTableName);
            })
            .then(function(tableAfterProject) {
                var table = ext.getTable(tableAfterProject);
                table.deleteAllCols();
                for (var i = 0; i < errMapConditionArgs.threshold; i++) {
                    var colName = errMapConditionArgs.colsToProject[i];
                    var col = new XcSDK.Column(colName);
                    table.addCol(col);
                }
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        // Do not forget to return the extension
        return ext;
    }

    return UExtUnionAll;
}({}));