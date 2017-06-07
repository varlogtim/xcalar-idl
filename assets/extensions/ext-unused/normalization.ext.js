// module name must start with "UExt"
window.UExtNormalization = (function(UExtNormalization) {

    UExtNormalization.buttons = [{
        "buttonText": "Normalize",
        "fnName": "normalize",
        "arrayOfFields": [{
            "type": "string",
            "name": "Dimension Table Names",
            "fieldClass": "groups",
            "variableArg": true
        },
        {
            "type": "column",
            "name": "Dimension's Columns",
            "fieldClass": "groupCols",
            "typeCheck": {
                "multiColumn": true
            },
            "variableArg": true
        },
        {
            "type": "column",
            "name": "Primary Keys",
            "fieldClass": "idCols",
            "variableArg": true,
            "typeCheck": {
                "allowEmpty": true,
            }
        }
        ],
    }];

    UExtNormalization.actionFn = function(functionName) {

        switch (functionName) {
            case "normalize":
                return normalize();
            default:
                return null;
        }
    };

    /*
        cutConcatCol: Parses a single original column from the concatenated
            column of all fields.

        columns: All columns of the particular group. Used to get original
            column type for appropriate cast.
        columnNames: New Column names for each original column in the group
        concatColName: column of all fields concatenated.
        fieldDelimiter: String that separates each field in concatenated column
    */

    function cutConcatCol(ext, cutConditionArgs, columns, columnNames,
        concatColName, fieldDelimeter, groupName) {

        var deferred = XcSDK.Promise.deferred();

        var colToExtract = columns[cutConditionArgs.cnt];
        var newColName = columnNames[cutConditionArgs.cnt];

        var colType = colToExtract.getType();

        // Xcalar indexes from 1, not 0
        var index = cutConditionArgs.cnt + 1;
        // cut the string and get element at the current index
        var cutMapStr = "cut(" + concatColName + ', ' +
            index + ', "' + fieldDelimeter + '")';

        switch (colType) {
            // cast back to original type
            case "integer":
                cutMapStr = 'int(' + cutMapStr + ')';
                break;
            case "float":
                cutMapStr = 'float(' + cutMapStr + ')';
                break;
            case "boolean":
                cutMapStr = 'bool(' + cutMapStr + ')';
                break;
            default:
                break;
        }

        var tableName;
        if (cutConditionArgs.cnt === cutConditionArgs.threshold - 1) {
            tableName = ext.createTableName(null, null, groupName);
        } else {
            tableName = ext.createTempTableName();
        }

        ext.map(cutMapStr, cutConditionArgs.latestTableName, newColName,
            tableName)
        .then(function(tableAfterCut){
            // update latestTableName so that all extracted columns are in
            // a single table
            cutConditionArgs.latestTableName = tableAfterCut;
            cutConditionArgs.cnt++;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();


    }

    /*
    createDimensionTable: Create a table with all concatenated columns, and a
        column of id's, which is then used to both add id's for the fact table
        and to create the actual dimension table with all fields.

    dimConditionArgs: Variables for loop conditions
    groups: Names of all dimension tables
    columnsPerGroup: array of columns in each dimension table
    idCols: array of id column of corresponding dimension table. undefined at
        positions where there is no id given.
    joinConditionArgs: To pass imp information when joining dimension tables to
        create fact tables
    */

    function createDimensionTable(ext, dimConditionArgs, groups,
        columnsPerGroup, srcTableName, idCols, joinConditionArgs) {

        // variables for loop conditions when extracting original columns from
        // concatenated column.
        var cutConditionArgs = {
            "cnt": 0,
            "threshold": 0,
            "latestTableName": ""
        };

        var deferred = XcSDK.Promise.deferred();

        var groupName = groups[dimConditionArgs.cnt];

        var columns = columnsPerGroup[dimConditionArgs.cnt];
        var columnNames = columns.map(function(col) {
            return col.getName();
        });
        var columnNamesNew = columnNames.map(function(name) {
            // get new column names as prefixed terms lose their prefixes
            // after group by
            splitName = name.split('::');
            return splitName[splitName.length - 1];
        });
        var colNamesCastToString = columns.map(function(col) {
            // when concatenating, non-string columns need to be cast as string
            if (col.getType() !== "string") {
                return "string(" + col.getName() + ")";
            } else {
                return col.getName();
            }
        });

        var concatColName = ext.createUniqueCol(srcTableName,
            groupName + '_concat');

        var concatMapStr = "";
        var lastIndex = colNamesCastToString.length - 1;

        var fieldDelimeter = (Math.random() + Math.random() + 1000).toString(36);
        if (lastIndex === 0) {
            // if the group only has one column, cast it to string to keep
            // consistent naming as this column is used for joins and groupbys
            concatMapStr = "string(" + colNamesCastToString[0] + ")";
        } else {
            // otherwise create a map string that concatenates all columns with
            // the delimiter between each one
            for (var i = 0; i < lastIndex; i++) {
                var currName = colNamesCastToString[i];
                concatMapStr += "concat(" + currName + ", " + 'concat("' +
                    fieldDelimeter + '", ';
            }
            var endStr = ")".repeat(2*lastIndex);
            concatMapStr += colNamesCastToString[lastIndex] + endStr;
        }

        // Id column, used in fact table to refer to element in star table
        var idCol = idCols[dimConditionArgs.cnt];
        var newColName;
        if (idCol) {
            // get name without prefix
            splitName = idCol.getName().split('::');
            newColName = splitName[splitName.length - 1];
        } else {
            newColName = ext.createUniqueCol(srcTableName, groupName + 'Id');
        }

        var groupByCol;
        var tableToExtractFrom;
        // get column of concatenated fields
        ext.map(concatMapStr, dimConditionArgs.latestTableName, concatColName,
            ext.createTempTableName())
        .then(function(tableAfterConcat) {
            // perform a groupBy with this concatenated column
            dimConditionArgs.latestTableName = tableAfterConcat;
            var operator = XcSDK.Enums.AggType.Count;
            groupByCol = ext.createUniqueCol(srcTableName,
                "Count_of_" + groupName);
            var options = {
                "newTableName": ext.createTempTableName(),
                "clean": true
            };
            return ext.groupBy(operator, [concatColName], concatColName,
                tableAfterConcat, groupByCol, options);
        })
        .then(function(tableAfterGroupBy) {
            function getTableWithIdCol(inputTable) {
                var tempDeferred = XcSDK.Promise.deferred();
                if (idCol) {
                    // if user provided idCol - extract it from concatenated
                    // column and check if it is unique.
                    tableToExtractFrom = inputTable;
                    var tableWithIdCol;
                    var tempColName;
                    var idColIndex = columnNames.indexOf(idCol.getName()) + 1;
                    var cutMapStr = "cut(" + concatColName + ', ' +
                        idColIndex + ', "' + fieldDelimeter + '")';
                    // get id column
                    ext.map(cutMapStr, inputTable, newColName,
                        ext.createTempTableName())
                    .then(function(tableAfterCut) {
                        // run a groupBy on Id column and count any field
                        tableWithIdCol = tableAfterCut;
                        var colToAdd = new XcSDK.Column(newColName);
                        ext.getTable(tableWithIdCol).addCol(colToAdd);
                        tempColName = "temp_" + groupName;
                        var opt = {"clean": true};
                        var operator = XcSDK.Enums.AggType.Count;
                        return ext.groupBy(operator, [newColName], groupByCol,
                            tableWithIdCol, tempColName, opt);
                    })
                    .then(function(tableWithCountOfId) {
                        // get the max in the field just created with the count
                        return ext.aggregate(XcSDK.Enums.AggType.Max,
                            tempColName, tableWithCountOfId);
                    })
                    .then(function(maxCount) {
                        if (maxCount > 1) {
                            // id column is not unique, return error
                            tempDeferred.reject(groupName + " ID Column not Unique");
                        } else {
                            // id column is unique
                            tempDeferred.resolve(tableWithIdCol);
                        }
                    })
                    .fail(tempDeferred.reject);

                } else {
                    // user did not provide id column, generate row numbers to
                    // serve as unique id's

                    ext.genRowNum(inputTable, newColName,
                        ext.createTempTableName())
                    .then(function(tableAfterRowNum) {
                        var currTable = ext.getTable(tableAfterRowNum);
                        var colToAdd = new XcSDK.Column(newColName);
                        currTable.addCol(colToAdd, 0);
                        tableToExtractFrom = tableAfterRowNum;
                        tempDeferred.resolve(tableAfterRowNum);
                    })
                    .fail(tempDeferred.reject);
                }

                return tempDeferred.promise();
            }
            return getTableWithIdCol(tableAfterGroupBy);
        })
        .then(function(tableWithValidId) {

            // Asynchronously extract original fields from this table to
            // create and display the dimesion table for this group
            cutConditionArgs.threshold = columns.length;
            cutConditionArgs.latestTableName = tableToExtractFrom;
            cutConditon = "args[1].cnt >= args[1].threshold";
            // extract each column one by one in this loop
            XcSDK.Promise.while(cutConcatCol, [ext, cutConditionArgs, columns,
                columnNamesNew, concatColName, fieldDelimeter, groupName],
                cutConditon, cutConditionArgs)
            .then(function() {
                // display all the newly created columns and remove the
                // the concatenated one
                var table = ext.getTable(cutConditionArgs.latestTableName);
                table.deleteAllCols();
                for (var i = 0; i < cutConditionArgs.threshold; i++) {
                    var colName = columnNamesNew[i];
                    var col = new XcSDK.Column(colName);
                    table.addCol(col);
                }
                if (!idCol) {
                    // if no id column was provided, the name will not be in
                    // columuns per group so add it separately
                    var colToAdd = new XcSDK.Column(newColName);
                    table.addCol(colToAdd, 0);
                }
                return table.addToWorksheet();
            })
            .fail(PromiseHelper.reject);

            var tableToJoin = ext.getTable(tableWithValidId);

            // keep track of this table with concatenated fields and idCol, as
            // it will be joined back to the main table with concatenated cols
            // to create the fact table
            joinConditionArgs.joinTables.push(tableToJoin);
            // The concatenated col on which join will happen
            joinConditionArgs.joinCols.push(concatColName);
            // A record of Id columns which will eventually be displayed
            joinConditionArgs.colsToKeep.push(newColName);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        dimConditionArgs.cnt++;


        return deferred.promise();
    }


    function joinDimTables(ext, joinConditionArgs, srcTableName, idCols) {

        var deferred = XcSDK.Promise.deferred();

        var currTable = joinConditionArgs.latestTable;
        var joinTable = joinConditionArgs.joinTables[joinConditionArgs.cnt];
        var colToJoin = joinConditionArgs.joinCols[joinConditionArgs.cnt];
        var colToAdd = joinConditionArgs.colsToKeep[joinConditionArgs.cnt];
        var idCol = idCols[joinConditionArgs.cnt];

        var renameMap = [];

        // since all group names are unique, the only potential clash is if the
        // provided id column is a derived field, as it will have same name in
        // dimension table
        if (idCol) {
            var idColName = idCol.getName();
            if (joinTable.hasCol(idColName)) {
                newIdColName = ext.createUniqueCol(srcTableName, idColName);
                renameMap.push(ext.getJoinRenameMap(idColName, newIdColName,
                    false));
            }
        }

        var leftTableInfo = {
            "tableName": currTable.getName(),
            "columns": colToJoin,
            "pulledColumns": currTable.getColNamesAsArray(),
            "rename": [ext.getJoinRenameMap(colToJoin,
                ext.createUniqueCol(colToJoin), false)]
            // concatenated column will always have the same name in both tables
        };

        var rightTableInfo = {
            "tableName": joinTable.getName(),
            "columns": colToJoin,
            "pulledColumns": [colToAdd],
            "rename": renameMap
        };

        options = {"clean": true};
        ext.join(XcSDK.Enums.JoinType.InnerJoin, leftTableInfo, rightTableInfo,
            options)
        .then(function(tableAfterJoin) {
            // update the table to join with so that all Id columns end up in
            // a single table
            joinConditionArgs.latestTable = ext.getTable(tableAfterJoin);
            joinConditionArgs.cnt++;
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();

    }

    /*
    groups: The title of each dimension table
    groupCols: The columns in each dimension table, given at the corresponding
        index in Groups. The length must be the same as Groups
    idCols: optional. Name of id column for corresponding dimension table,
        if any.
    */
    function normalize() {
        var ext = new XcSDK.Extension();

        // varaiables for loop conditions when creating dimension tables
        // latestTableName: when creating a concatenated column for multi-join
        //    and multi-groupBy for each group, this keeps track of the latest
        //    table so that each concatenated column is in one final table.
        var dimConditionArgs = {
            "threshold": 0,
            "cnt": 0,
            "latestTableName": ""
        };

        // joinConditionArgs: varaiables for loop conditions when joining
        // dimension tables to create fact table
        //
        // joinTables: array of tables that join to the denormalized table
        // joinCols: array of columns on which to join table at corresponding
        //     index in joinTables
        // colsToKeep: array of Id columns, i.e. a column to display and thus
        //     represent table at corresponding index in joinTables in final
        //     fact table
        // latestTable: Keep track of the latest table to join on so that
        //     all Id columns end up in the same table

        var joinConditionArgs = {
            "threshold": 0,
            "cnt": 0,
            "joinTables": [],
            "joinCols": [],
            "colsToKeep": [],
            "latestTable": {}
        };

        ext.beforeStart = function() {

            var self = this;
            var args = self.getArgs();
            var groups = args.groups;
            var groupCols = args.groupCols;
            var idCols = args.idCols;

            if (!Array.isArray(groups)) {
                groups = [groups];
            }

            if (!Array.isArray(groupCols[0])) {
                groupCols = [groupCols];
            }

            if (!Array.isArray(idCols)) {
                idCols = [idCols];
            }

            // make sure length of groups and groupCols
            if (groups.length !== groupCols.length) {
                return XcSDK.Promise.reject("The length of 'Dimension's Columns"
                    + " and 'Dimension Table Names' must be equal");
            }

            // make sure there are not more id columns than tables
            if (idCols.length > groups.length) {
                return XcSDK.Promise.reject("Cannot have more 'Primary keys'" +
                    "than 'Dimension Table Names'");
            }

            // make sure two groups do not have the same name
            var names = {};
            for (var i = 0; i <= groups.length; i++) {
                if (names[groups[i]]) {
                    return XcSDK.Promise.reject("Duplicate Dimension Table Name");
                }
                names[groups[i]] = true;
            }

            // check that provided ID column is also in corresponding
            // Columns Per Group
            for (var j = 0; j <= groups.length; j++) {
                var idCol = idCols[j];
                if (idCol) {
                    var idColIncluded = groupCols[j].some(function(col) {
                        return idCol.getName() === col.getName();
                    });

                    if (!idColIncluded) {
                        return XcSDK.Promise.reject("Primary key not in"
                            + " corresponding 'Dimension's Columns' at index " + j);
                    }
                }
            }

            return XcSDK.Promise.resolve();
        };

        ext.start = function() {

            var deferred = XcSDK.Promise.deferred();

            var self = this;

            var args = self.getArgs();
            // var inputStr = args.stringOfGroups;
            var srcTable = self.getTriggerTable();
            var srcTableName = srcTable.getName();
            // each element refers to a different star table
            // var groups = inputStr.split('|');
            var groups = args.groups;
            var columnsPerGroup = args.groupCols;
            var idCols = args.idCols;

            if (!Array.isArray(groups)) {
                groups = [groups];
            }

            if (!Array.isArray(columnsPerGroup[0])) {
                columnsPerGroup = [columnsPerGroup];
            }

            if (!Array.isArray(idCols)) {
                idCols = [idCols];
            }

            // one dimension table per group
            dimConditionArgs.threshold = groups.length;
            dimConditionArgs.latestTableName = srcTableName;
            var condition = "args[1].cnt >= args[1].threshold";
            // create dimesion tables
            XcSDK.Promise.while(createDimensionTable,
                [ext, dimConditionArgs, groups, columnsPerGroup, srcTableName,
                idCols, joinConditionArgs], condition, dimConditionArgs)
            .then(function() {
                // join each dimension table to original to create fact table
                joinConditionArgs.threshold = dimConditionArgs.threshold;
                joinConditionArgs.latestTable =
                    ext.getTable(dimConditionArgs.latestTableName);
                var joinCondition = "args[1].cnt >= args[1].threshold";
                return XcSDK.Promise.while(joinDimTables,
                    [ext, joinConditionArgs, srcTableName, idCols],
                    joinCondition, joinConditionArgs);

            })
            .then(function() {
                // project to remove the concatenated columns
                var projectTableName = joinConditionArgs.latestTable.getName();
                var projectCols = joinConditionArgs.colsToKeep;
                var finalTableName = ext.createTableName(null, null,
                    "factTable");
                return ext.project(
                    srcTable.getColNamesAsArray().concat(projectCols),
                    projectTableName, finalTableName);
            })
            .then(function(tableAfterProject) {
                var table = ext.getTable(tableAfterProject);
                // hide all columns in dimension tables in the fact Table
                for (var i = 0; i < columnsPerGroup.length; i++) {
                    var currGroup = columnsPerGroup[i];
                    for (var j = 0; j < currGroup.length; j++) {
                        var col = currGroup[j];
                        var idCol = idCols[i];
                        if (!idCol || col.getName() !== idCol.getName()) {
                            table.deleteCol(col);
                        } else {
                            var delCol = new XcSDK.Column(joinConditionArgs.colsToKeep[i]);
                            table.deleteCol(delCol);
                        }
                    }
                }
                return table.addToWorksheet();
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();

        };

        return ext;
    }

    return UExtNormalization;
}({}));