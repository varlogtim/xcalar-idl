window.UExtIMD = (function(UExtIMD) {
    UExtIMD.buttons = [{
        "buttonText": "Publish Table",
        "fnName": "publish",
        "instruction": "This function publishes a table and enables it to get updated.",
        "arrayOfFields": [{
            "type": "string",
            "name": "Published Table Name",
            "fieldClass": "pubTableName",
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
            "name": "Name of Published Table",
            "fieldClass": "updateTable",
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
    },
    {
        "buttonText": "Refresh Table",
        "fnName": "refresh",
        "arrayOfFields": [{
            "type": "string",
            "name": "Published Table Name",
            "fieldClass": "pubTableName",
        },
        {
            "type": "string",
            "name": "New Table Name",
            "fieldClass": "destTableName",
            "typeCheck": {
                "allowEmpty": true,
            }
        },
        {
            "type": "table",
            "name": "Replace Table (empty to add)",
            "fieldClass": "replaceTable",
            "typeCheck": {
                "allowEmpty": true,
            }
        },
        {
            "type": "number",
            "name": "Batch Id",
            "autofill": -1,
            "fieldClass": "batchId"
        },
        {
            "type": "boolean",
            "name": "Checkpoint",
            "autofill": false,
            "fieldClass": "checkpoint"
        }]
    }];

    UExtIMD.actionFn = function(functionName) {
        switch (functionName) {
            case ("publish"):
                return publish();
            case ("update"):
                return update();
            case ("refresh"):
                return refresh();
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
            } else {
                // convert prefix field of primitive type to derived
                var mapFn;
                if (col.type === 'integer' || col.type === 'float') {
                    // convert all numbers to float, since we cannot determine
                    // actual type of prefix fields
                    mapFn = "float";
                } else if (col.type === 'boolean') {
                    mapFn = "bool";
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
        for (var i = 0; i < cols.length; i++) {
            var col = cols[i];
            if (col.name === "DATA") {
                continue;
            }
            var colStruct = getDerivedCol(col);
            if (!colStruct) {
                deferred.reject("Cannot have arrays / structs");
            }
            tableInfo.colsToProject.push(colStruct.colName);
            mapArray.push(colStruct.mapStr);
        }

        var finalTableName;
        var prom;

        if (mapArray.length > 0) {
            prom = ext.map(mapArray, srcTableName, tableInfo.colsToProject);
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
                tableInfo.colsToProject = tableInfo.colsToProject.concat(extraCols);
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
                prom = ext.map(["int(1)", "int(1)"], srcTableName,
                    [opCode, roColName], mapTableName);
            } else {
                prom = rankOver(srcTableName, self);
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

    function rankOver(startTable, ext, useImm) {
        var self = ext;
        var deferred = jQuery.Deferred();
        var columns = ext.getTriggerTable().getColNamesAsArray()
                             .map(function(ele) {
                return xcHelper.parsePrefixColName(ele).name;
            });
        var keyColName = ext.getArgs().primaryKey.getName();
        var imdCol = ext.getArgs().imdCol.getName();
        var direction = XcSDK.Enums.SortType.Asc;
        columns = columns.concat(roColName);
        if (useImm) {
            keyColName = xcHelper.parsePrefixColName(keyColName).name;
            imdCol = xcHelper.parsePrefixColName(imdCol).name;
        }
        self.setAttribute("rank_over_col_name", roColName);
        function roGenRowNum(ext, srcTable, colName) {
            var deferred = XcSDK.Promise.deferred();
            var newColName = colName + Math.floor(Math.random() * 100);
            var dstTable = ext.createTableName();

            ext.genRowNum(srcTable, newColName, dstTable)
            .then(function(tableAfterGenRowNum) {
                deferred.resolve(tableAfterGenRowNum, newColName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function roSortTable(ext, srcTable, sortColNames, directions) {
            var deferred = XcSDK.Promise.deferred();
            var dstTable = ext.createTableName();
            ext.sort(directions, sortColNames, srcTable, dstTable)
            .then(deferred.resolve)
            .fail(function(error, sorted) {
                if (sorted) {
                    // when already sort correctly on the column
                    deferred.resolve(srcTable);
                } else {
                    deferred.reject(error);
                }
            });

            return deferred.promise();
        }

        function roGroupBy(ext, srcTable, keyColName, groupByColName) {
            var deferred = XcSDK.Promise.deferred();
            var aggOp = XcSDK.Enums.AggType.Min;
            var newGBColName = ext.createColumnName();
            var options = {
                "newTableName": ext.createTableName("GB.")
            };

            var prom;
            if (!useImm && xcHelper.getPrefixColName(keyColName).name != keyColName) {
                // Has prefix
                newKeyColName = keyColName.replace("::", "__");
                var keyColType = ext.getArgs().primaryKey.getType();
                var type = "string";
                switch (keyColType) {
                    case("float"):
                    case("number"):
                        type = "float";
                        break;
                    case("integer"):
                        type = "int";
                        break;
                    case("boolean"):
                        type = "bool";
                        break;
                    default:
                        type = "string";
                        break;
                }
                prom = ext.map([type + "(" + keyColName + ")"], srcTable,
                    [newKeyColName]);
                keyColName = newKeyColName;
            } else {
                prom = PromiseHelper.resolve(srcTable);
            }
            prom
            .then(function(tableName) {
                return ext.groupBy(aggOp, keyColName, groupByColName, tableName,
                                   newGBColName, options);
            })
            .then(function(tableAfterGroupBy, dstColumnsSDK) {
                var keyColNameAfterGroupBy;
                var keyColTypeAfterGroupBy;
                dstColumnsSDK.forEach(function(col) {
                    var name = col.getName();
                    if (name !== "DATA" && name !== newGBColName) {
                        keyColNameAfterGroupBy = name;
                        keyColTypeAfterGroupBy = col.getType();
                        return false;
                    }
                });
                deferred.resolve(tableAfterGroupBy, keyColNameAfterGroupBy, keyColTypeAfterGroupBy, newGBColName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function roJoinBack(ext, lTable, lColName, rTable, rColName, rColType) {
            var deferred = XcSDK.Promise.deferred();
            var joinType = XcSDK.Enums.JoinType.InnerJoin;
            var lTableInfo = {
                "tableName": lTable,
                "columns": [lColName],
            };

            // XXX rename failed here
            var rTableInfo = {
                "tableName": rTable,
                "columns": [rColName],
                "rename": [{
                    "new": "extraKeyCol",
                    "orig": rColName,
                    "type": DfFieldTypeT.DfUnknown
                }]
            };
            var joinOPs = {
                "clean": true,
                "newTableName": ext.createTableName()
            };

            ext.join(joinType, lTableInfo, rTableInfo, joinOPs)
            .then(function(tableAfterJoin) {
                deferred.resolve(tableAfterJoin);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        function roMap(ext, srcTable, orderColName, minColName) {
            var deferred = XcSDK.Promise.deferred();
            var newColName = ext.getAttribute("rank_over_col_name");
            var newTableName =  ext.createTableName();
            var mapStr = "int(add(sub(" + orderColName + ", " + minColName + "), 1))";
            ext.map(mapStr, srcTable, newColName, newTableName)
            .then(function(dstTable) {
                var table = ext.getTable(dstTable);
                var minCol = new XcSDK.Column(minColName, "integer");
                table.deleteCol(minCol);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        }

        roGenRowNum(self, startTable, "orig_order_")
        .then(function(tableWithRowNum, oriRowNumColName) {
            self.setAttribute("orig_order_col", oriRowNumColName);
            columns = columns.concat(oriRowNumColName);
            return roSortTable(self, tableWithRowNum,
                              [keyColName, oriRowNumColName],
                              [direction,direction]);
        })
        .then(function(tableAfterSort) {
            return roGenRowNum(self, tableAfterSort, "new_order_");
        })
        .then(function(tableWithNewRowNum, newRowNumColName) {
            self.setAttribute("new_order_col", newRowNumColName);
            self.setAttribute("table_to_group_by", tableWithNewRowNum);
            return roGroupBy(self, tableWithNewRowNum, keyColName,
                             newRowNumColName);
        })
        .then(function(groupByTableName, rkeyColName, rkeyType, rGBColName) {
            self.setAttribute("GBColName", rGBColName);
            return roJoinBack(self, self.getAttribute("table_to_group_by"),
                              keyColName, groupByTableName, rkeyColName,
                              rkeyType);
        })
        .then(function(tableAfterJoin) {
            return roMap(self, tableAfterJoin,
                         self.getAttribute("new_order_col"),
                         self.getAttribute("GBColName"));
        })
        .then(function(dstTable) {
            return ext.map(["int(" + imdCol + ")"], dstTable, [opCode]);
        })
        .then(function(finalTable) {
            deferred.resolve(finalTable);
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
            var srcTable = ext.getTriggerTable().getName();
            var finalTableName;

            finalizeTable(ext.getTriggerTable(), self)
            .then(function(tn) {
                return rankOver(tn, ext, true);
            })
            .then(function(mapTable) {
                pubTable = ext.getArgs().updateTable;
                finalTableName = mapTable;
                return XcalarUpdateTable(mapTable, pubTable);
            })
            .then(function() {
                var srcTableId = xcHelper.getTableId(srcTable);
                var newTable = ext.createNewTable(finalTableName);
                return addTableToWorksheet(srcTableId, newTable, srcTable);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };

        return ext;
    }

    function refresh() {
        var ext = new XcSDK.Extension();
        ext.start = function() {
            var self = this;
            var deferred = XcSDK.Promise.deferred();

            var pubTableName = ext.getArgs().pubTableName;
            var destTableName = ext.getArgs().destTableName;
            var replaceTable = ext.getArgs().replaceTable;
            var replaceTableName;
            if (replaceTable) {
                replaceTableName = replaceTable.getName();
            }

            var batchId = ext.getArgs().batchId;
            var checkpoint = ext.getArgs().checkpoint;

            if (destTableName === "" || !destTableName) {
                destTableName = ext.createTableName("", "",
                                    ext.getTriggerTable().getName());
            } else {
                destTableName = ext.createTableName(destTableName, "", "");
            }

            XcalarRefreshTable(pubTableName, destTableName, batchId,
                               checkpoint)
            .then(function() {
                // Find original table meta
                return XcalarListPublishedTables(pubTableName);
            })
            .then(function(ret) {
                var newTable = ext.createNewTable(destTableName);
                var origTableName = ret.tables[0].source.source;
                var tableId = xcHelper.getTableId(origTableName);
                return addTableToWorksheet(tableId, newTable, replaceTableName);
            })
            .then(deferred.resolve)
            .fail(deferred.reject);

            return deferred.promise();
        };
        return ext;
    }

    return (UExtIMD);
}({}));
