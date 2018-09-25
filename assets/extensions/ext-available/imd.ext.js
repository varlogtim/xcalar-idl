// XXX This extension needs to be rewritten. The behavior has changed since this
// extension's creation, and it's been patched too many times. The code doesn't
// really make sense anymore.

window.UExtIMD = (function(UExtIMD) {
    UExtIMD.buttons = [{
        "buttonText": "Publish Table",
        "fnName": "publish",
        "instruction": "This function publishes a table and enables it to get updated.",
        "arrayOfFields": [{
            "type": "string",
            "name": "Published Table Name",
            "fieldClass": "pubTableName",
            "typeCheck": {
                "newTableName": true
            }
        },
        {
            "type": "column",
            "name": "Primary Key",
            "fieldClass": "primaryKey"
        },
        {
            "type": "column",
            "name": "IMD Operator",
            "fieldClass": "imdCol",
            "typeCheck": {
                "allowEmpty": true,
            }
        }]
    },
    {
        "buttonText": "Update Table",
        "fnName": "update",
        "instruction": "This function updates an already published table with another table that contains the changes",
        "arrayOfFields": [{
            "type": "string",
            "name": "Published Table Name",
            "fieldClass": "updateTable",
            "typeCheck": {
                "newTableName": true
            }
        },
        {
            "type": "column",
            "name": "Primary Key",
            "fieldClass": "primaryKey"
        },
        {
            "type": "column",
            "name": "IMD Operator",
            "fieldClass": "imdCol",
            "typeCheck": {
                "columnType": ["number"]
            },
        }]
    }];

    UExtIMD.actionFn = function(functionName) {
        switch (functionName) {
            case ("publish"):
                return publish();
            case ("update"):
                return update();
            default:
                return null;
        }
    };

    var roColName = "XcalarRankOver";
    var opCode = "XcalarOpCode";
    function finalizeTable(srcTable, ext, extraCols) {
        function getDerivedColName(colName) {
            if (colName.indexOf("::") > 0) {
                colName = colName.split("::")[1];
            }
            if (colName.endsWith("_integer") || colName.endsWith("_float") ||
                colName.endsWith("_boolean") || colName.endsWith("_string")) {
                colName = colName.substring(0, colName.lastIndexOf("_"));
            }
            return colName;
        }

        function getDerivedCol(col) {

            if (col.type === 'array' || col.type === 'object') {
                // array and object columns will be projected away at the end
                // this case also handles 'DATA' column, and leaves table unchanged
                return;
            } else if (col.backName === roColName ||
                       col.backName === opCode) {
                return {colName: col.backName};
            } else {
                // convert prefix field of primitive type to derived
                var mapFn;
                if (col.type === 'integer' || col.type === 'float') {
                    // convert all numbers to float, since we cannot determine
                    // actual type of prefix fields
                    mapFn = "float";
                } else if (col.type === 'boolean') {
                    mapFn = "bool";
                } else if (col.type === 'timestamp') {
                    mapFn = "timestamp";
                } else {
                    mapFn = "string";
                }
                var mapStr = mapFn + "(" + col.backName + ")";
                var newColName = getDerivedColName(col.backName);

                return {colName: newColName, mapStr: mapStr};
            }

        }
        var deferred = jQuery.Deferred();
        var cols = srcTable.tableCols;
        var promises = [];
        var srcTableName = srcTable.getName();
        var tableInfo = {"name": srcTableName, "colsToProject": []};
        var table;

        var mapArray = [];
        var mapNewNamesArray = [];
        var invalidColumns = "";
        for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            if (col.name === "DATA") {
                continue;
            }
            var colStruct = getDerivedCol(col);
            if (!colStruct) {
                invalidColumns += col.name + ", ";
                continue;
            }
            if(!invalidColumns) {
                tableInfo.colsToProject.push(colStruct.colName);
                if (colStruct.mapStr) {
                    mapNewNamesArray.push(colStruct.colName);
                    mapArray.push(colStruct.mapStr);
                }
            }
        }

        if (invalidColumns) {
            invalidColumns = invalidColumns.slice(0, -2);
            return deferred.reject("Table cannot have arrays / structs. \n Invalid Columns: " + invalidColumns);
        }

        var imdCol;
        if (ext.getArgs().imdCol) {
            imdCol = ext.getArgs().imdCol.getName();
        }

        mapNewNamesArray.push(opCode);
        if (!imdCol) {
            mapArray.push("int(1)");
        } else {
            mapArray.push("int(" + imdCol + ")")
        }

        var finalTableName;
        var prom;

        if (mapArray.length > 0) {
            prom = ext.map(mapArray, srcTableName, mapNewNamesArray);
        } else {
            prom = PromiseHelper.resolve(srcTableName);
        }
        prom
        .then(function(derivedTable) {
            // project the processed prefix columns and the original
            // original derived columns
            var newTableName = ext.createTableName(null, null, srcTableName);
            var hashIdx = newTableName.lastIndexOf("#");
            var tableNamePart = newTableName.substring(0, hashIdx);
            var hashPart = newTableName.substring(hashIdx);
            newTableName = tableNamePart + hashPart;
            if (extraCols) {
                tableInfo.colsToProject = tableInfo.colsToProject.concat(
                    extraCols); // May contain duplicates
            }
            return ext.project(tableInfo.colsToProject, derivedTable,
                newTableName);
        })
        .then(function(projectedTable) {
            // hide all columns and display only the one's projected
            deferred.resolve(projectedTable);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function addTableToWorksheet(srcTableId, newTable, replaceTableName,
                                 extraCols) {
        var colInfo = gTables[srcTableId].tableCols.map(function(ele) {
                    return ele.getBackColName();
             });
        newTable.deleteAllCols();
        colInfo.forEach(function(colName) {
            colName = xcHelper.parsePrefixColName(colName).name;
            if (colName === "DATA") {
                return;
            }
            newTable.addCol(new XcSDK.Column(colName));
        });

        if (extraCols) {
            extraCols.forEach(function(colName) {
                newTable.addCol(new XcSDK.Column(colName));
            });
        }
        newTable.refreshIMDList();
        return newTable.addToWorksheet(replaceTableName);
    }

    function publish() {
        var ext = new XcSDK.Extension();
        ext.start = function() {
            var self = this;
            var deferred = XcSDK.Promise.deferred();
            console.log("Publish table");
            var pubTableName = ext.getArgs().pubTableName;
            var primaryKey = ext.getArgs().primaryKey.getName();
            var srcTable = ext.getTriggerTable();
            var srcTableName = srcTable.getName();
            var imdCol;
            if (ext.getArgs().imdCol) {
                imdCol = ext.getArgs().imdCol.getName();
            }
            primaryKey = xcHelper.parsePrefixColName(primaryKey).name;
            var indexTableName = ext.createTableName("", "", srcTableName);
            var mapTableName = ext.createTableName("", "", srcTableName);
            var finalTableName;

            var prom;
            if (!imdCol) {
                prom = ext.map(["int(1)"], srcTableName,
                    [roColName], mapTableName);
            } else {
                prom = roGenRowNum(srcTableName, self, roColName)
            }

            prom
            .then(function(table) {
                var newTableStruct = ext.createNewTable(table);
                newTableStruct.tableCols = srcTable.tableCols; //XXX FIXME this is a shallow copy
                return finalizeTable(newTableStruct, self, [opCode, roColName]);
            })
            .then(function(tableName) {
                return XcalarIndexFromTable(tableName, [{name: primaryKey,
                            ordering: XcalarOrderingT.XcalarOrderingUnordered}],
                                            indexTableName, undefined, true);
            })
            .then(function() {
                finalTableName = indexTableName;
                // For rankOver, it resolves the pubName as 2nd arg. Ignored.
                return XcalarPublishTable(indexTableName, pubTableName);
            })
            .then(function() {
                var newTable = ext.createNewTable(finalTableName);
                var srcTableId = xcHelper.getTableId(srcTableName);
                return addTableToWorksheet(srcTableId, newTable, srcTableName,
                                           [roColName, opCode]);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };
        return ext;
    }

    function roGenRowNum(srcTable, ext, colName) {
        var deferred = XcSDK.Promise.deferred();
        var dstTable = ext.createTableName();

        ext.genRowNum(srcTable, colName, dstTable)
        .then(function(tableAfterGenRowNum) {
            deferred.resolve(tableAfterGenRowNum);
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function update() {
        var ext = new XcSDK.Extension();
        console.log("updating");
        ext.start = function() {
            var self = this;
            // 0. Finalize table
            // 1. Generate Rank
            // 2. Change opCode colName to XcalarOpCode
            // 3. Call UpdateTable on this table dest

            var deferred = XcSDK.Promise.deferred();
            var srcTable = ext.getTriggerTable();
            var srcTableName = srcTable.getName();
            var primaryKey = ext.getArgs().primaryKey.getName();
            primaryKey = xcHelper.parsePrefixColName(primaryKey).name;
            var indexTableName = ext.createTableName("", "", srcTableName);
            var finalTableName;
            var indexTableName = ext.createTableName("", "", srcTableName);

            roGenRowNum(srcTableName, self, roColName)
            .then(function(table) {
                var newTableStruct = ext.createNewTable(table);
                newTableStruct.tableCols = srcTable.tableCols;
                return finalizeTable(newTableStruct, self, [opCode, roColName]);
            })
            .then(function(tableName) {
                return XcalarIndexFromTable(tableName, [{name: primaryKey,
                            ordering: XcalarOrderingT.XcalarOrderingUnordered}],
                                            indexTableName, undefined, true);
            })
            .then(function(indexTable) {
                pubTable = ext.getArgs().updateTable;
                finalTableName = indexTableName;
                return XcalarUpdateTable(indexTableName, pubTable);
            })
            .then(function() {
                var srcTableId = xcHelper.getTableId(srcTableName);
                var newTable = ext.createNewTable(finalTableName);
                return addTableToWorksheet(srcTableId, newTable, srcTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    return (UExtIMD);
}({}));
