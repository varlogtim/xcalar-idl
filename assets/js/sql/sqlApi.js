window.SQLApi = (function() {
    var indexTableCache = {};
    var reverseIndexMap = {};

    function SQLApi() {
        return this;
    }

    // static function
    SQLApi.cacheIndexTable = function(tableName, colName, indexTable) {
        indexTableCache[tableName] = indexTableCache[tableName] || {};
        indexTableCache[tableName][colName] = indexTable;
        reverseIndexMap[indexTable] = {
            "tableName": tableName,
            "colName": colName
        };
    };

    SQLApi.getIndexTable = function(tableName, colName) {
        if (indexTableCache[tableName]) {
            return indexTableCache[tableName][colName];
        } else {
            return null;
        }
    };

    SQLApi.deleteIndexTable = function(indexTable) {
        if (reverseIndexMap[indexTable]) {
            var tableName = reverseIndexMap[indexTable].tableName;
            var colName = reverseIndexMap[indexTable].colName;
            delete indexTableCache[tableName][colName];
            delete reverseIndexMap[indexTable];
        }
    };

    SQLApi.clear = function() {
        indexTableCache = {};
        reverseIndexMap = {};
    };

    SQLApi.prototype = {
        _start: function() {
            var txId = Transaction.start({
                "operation": "SQL Simulate",
                "simulate": true
            });
            return txId;
        },

        _end: function(txId) {
            var query = Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            });
            console.log("query", query);
            return query;
        },

        _getColType: function(typeId) {
            // XXX TODO generalize it with setImmediateType()
            if (!DfFieldTypeTStr.hasOwnProperty(typeId)) {
                // error case
                console.error("Invalid typeId");
                return null;
            }

            switch (typeId) {
                case DfFieldTypeT.DfUnknown:
                    return ColumnType.unknown;
                case DfFieldTypeT.DfString:
                    return ColumnType.string;
                case DfFieldTypeT.DfInt32:
                case DfFieldTypeT.DfInt64:
                case DfFieldTypeT.DfUInt32:
                case DfFieldTypeT.DfUInt32:
                    return ColumnType.integer;
                case DfFieldTypeT.DfFloat32:
                case DfFieldTypeT.DfFloat64:
                    return ColumnType.float;
                case DfFieldTypeT.DfBoolean:
                    return ColumnType.boolean;
                case DfFieldTypeT.DfMixed:
                    return ColumnType.mixed;
                case DfFieldTypeT.DfFatptr:
                    return null;
                default:
                    return null;
            }
        },

        _getQueryTableCols: function(tableName) {
            var deferred = jQuery.Deferred();
            var self = this;

            XcalarGetTableMeta(tableName)
            .then(function(tableMeta) {
                if (tableMeta == null || tableMeta.valueAttrs == null) {
                    deferred.resolve([]);
                    return;
                }

                var valueAttrs = tableMeta.valueAttrs || [];
                var progCols = [];
                // XXX TODO: translate valueAttr.type to the type
                valueAttrs.forEach(function(valueAttr) {
                    var name = valueAttr.name;
                    var type = self._getColType(valueAttr.type);
                    // assume all is immediates
                    progCols.push(ColManager.newPullCol(name, name, type));
                });
                progCols.push(ColManager.newDATACol());
                deferred.resolve(progCols);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        run: function(query, tableName) {
            var deferred = jQuery.Deferred();
            var txId = Transaction.start({
                "operation": "Execute SQL"
            });
            var queryName = xcHelper.randName("sql");
            var worksheet = WSManager.getActiveWS();
            var self = this;

            XIApi.query(txId, queryName, query)
            .then(function() {
                return self._getQueryTableCols(tableName);
            })
            .then(function(tableCols) {
                return TblManager.refreshTable([tableName], tableCols,
                                            null, worksheet, txId, {
                                                "focusWorkspace": true
                                            });
            })
            .then(function() {
                Transaction.done(txId, {
                    "msgTable": xcHelper.getTableId(tableName)
                    // XXX TODO: add sql
                });
                deferred.resolve();
            })
            .fail(function(error) {
                Transaction.fail(txId, {
                    "failMsg": "Execute SQL faild",
                    "error": error
                });
                deferred.reject(error);
            });

            return deferred.promise();
        },

        // newTableName is operation
        filter: function(fltStr, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.filter(txId, fltStr, tableName, newTableName)
            .then(function(finalTable) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },
        // dstAggName is optional and can be left blank (will autogenerate)
        aggregate: function(aggOp, colName, tableName, dstAggName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName)
            .then(function(val, finalDstDagName) {
                var cli = self._end(txId);
                deferred.resolve({
                    "val": val,
                    "newTableName": finalDstDagName,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        sort: function(sortColsAndOrder, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            var def;
            if (sortColsAndOrder.length === 1) {
                def = XIApi.sort(txId, sortColsAndOrder[0].order,
                                 sortColsAndOrder[0].name, tableName,
                                 newTableName);
            } else {
                def = XIApi.multiSort(txId, sortColsAndOrder, tableName,
                                      newTableName);
            }
            def
            .then(function(ret) {
                var cli = self._end(txId);
                cli = cli.replace(/\\t/g, "\\\\t");
                if (typeof(ret) === "string") {
                    deferred.resolve({
                        "newTableName": ret,
                        "cli": cli,
                        "sortColName": sortColsAndOrder[0].name,
                        "order": sortColsAndOrder[0].order
                    });
                } else {
                    deferred.resolve({
                        "newTableName": ret.newTableName,
                        "cli": cli,
                        "sortColName": ret.sortColName,
                        "order": XcalarOrderingT.XcalarOrderingAscending
                    });
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        map: function(mapStr, tableName, newColName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.map(txId, mapStr, tableName, newColName, newTableName)
            .then(function(finalTable) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
            lTableInfo/rTableInfo: object with the following attrs:
                columns: array of back colum names to join
                pulledColumns: columns to pulled out (front col name)
                tableName: table's name
                reaname: array of rename object

            rename map: object generate by
            xcHelper.getJoinRenameMap(oldName, newName, type)
            if it's fat ptr, pass in DfFieldTypeT.DfFatptr, othewise, pass in null

                sample:
                    var lTableInfo = {
                        "tableName": "test#ab123",
                        "columns": ["test::colA", "test::colB"],
                        "pulledColumns": ["test::colA", "test::colB"],
                        "rename": [{
                            "new": "test2",
                            "old": "test",
                            "type": DfFieldTypeT.DfFatptr
                        }]
                    }

            options:
                newTableName: string, final table's name, optional
                clean: boolean, remove intermediate table if set true
        */
        join: function(joinType, lTableInfo, rTableInfo, options) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
            .then(function(dstTable, dstCols) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": dstTable,
                    "newColumns": dstCols,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
         * options:
         *  isIncSample: true/false, include sample or not,
         *               not specified is equal to false
         *  sampleCols: array of colNums, sampleColumns to keep,
         *              only used when isIncSample is true
         *  icvMode: true/false, icv mode or not
         *  newTableName: string, dst table name, optional
         *  clean: true/false, if set true, will remove intermediate tables
         */
        groupBy: function(groupByCols, gbArgs, tableName, options) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            options = options || {};
            options.icvMode = false;
            options.isIncSample = true;

            XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
            .then(function(finalTable, finalCols, renamedGroupByCols) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "newColumns": finalCols,
                    "renamedColumns": renamedGroupByCols,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
            columns: an array of column names (back column name)
            tableName: table's name
            newTableName(optional): new table's name
        */
        project: function(columns, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.project(txId, columns, tableName, newTableName)
            .then(function(finalTable) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        genRowNum: function(tableName, newColName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.genRowNum(txId, tableName, newColName, newTableName)
            .then(function(finalTable) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        deleteTable: function(tableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self._start();

            XIApi.deleteTable(txId, tableName)
            .then(function() {
                SQLApi.deleteIndexTable(tableName);
                var cli = self._end(txId);
                deferred.resolve({
                    "cli": cli
                });
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        // dstAggName is optional and can be left blank (will autogenerate)
        // aggregateWithEvalStr: function(evalStr, tableName, dstAggName) {
        //     var txId = this.txId;
        //     return XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName);
        // },

        // load: function(dsArgs, formatArgs, dsName) {
        //     // Important: dsName gets transformed. This promise returns new name.
        //     // If following this by an indexFromDataset, be sure to use
        //     // the transformed name.

        //     // dsArgs is as follows:
        //     // url, isRecur, maxSampleSize, skipRows, isRegex
        //     // formatArgs is as follows:
        //     // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
        //     // fieldDelim, recordDelim, hasHeader, quoteChar,
        //     // moduleName, funcName
        //     var deferred = jQuery.Deferred();
        //     var txId = this.txId;
        //     dsName = xcHelper.wrapDSName(dsName);

        //     XIApi.load(dsArgs, formatArgs, dsName, txId)
        //     .then(function() {
        //         deferred.resolve(dsName);
        //     })
        //     .fail(deferred.reject);

        //     return deferred.promise();
        // },

        // index: function(colToIndex, tableName) {
        //     return XIApi.index(this.txId, colToIndex, tableName);
        // },

        // indexFromDataset: function(datasetName, newTableName, prefix) {
        //     return XIApi.indexFromDataset(this.txId, datasetName,
        //                                   newTableName, prefix);
        // },

        // sortAscending: function(colName, tableName, newTableName) {
        //     var deferred = jQuery.Deferred();
        //     var self = this;
        //     var txId = self.txId;

        //     XIApi.sortAscending(txId, colName, tableName, newTableName)
        //     .then(function(dstTable) {
        //         self._addMeta(tableName, dstTable);
        //         deferred.resolve(dstTable);
        //     })
        //     .fail(deferred.reject);

        //     return deferred.promise();
        // },

        // sortDescending: function(colName, tableName, newTableName) {
        //     var deferred = jQuery.Deferred();
        //     var self = this;
        //     var txId = self.txId;

        //     XIApi.sortDescending(txId, colName, tableName, newTableName)
        //     .then(function(dstTable) {
        //         self._addMeta(tableName, dstTable);
        //         deferred.resolve(dstTable);
        //     })
        //     .fail(deferred.reject);

        //     return deferred.promise();
        // },
        // query: function(queryStr) {
        //     if (!this.__checkDstTableNameInQuery(queryStr)) {
        //         return PromiseHelper.reject(ExtTStr.InvalidTableName);
        //     }
        //     var txId = this.txId;
        //     var queryName = this.tableNameRoot + "_ext_query";
        //     // in case of query name conflict
        //     queryName = xcHelper.randName(queryName);
        //     return XIApi.query(txId, queryName, queryStr);
        // },
        // getNumRows: function(tableName, options) {
        //     var deferred = jQuery.Deferred();
        //     var self = this;
        //     var useConstant = options.useConstant;
        //     var isTempConstant = false;

        //     options = options || {};
        //     options.txId = this.txId;

        //     if (useConstant && options.constantName == null) {
        //         options.constantName = self.createTempConstant();
        //         isTempConstant = true;
        //     }

        //     XIApi.getNumRows(tableName, options)
        //     .then(function(res, dstAggName) {
        //         if (useConstant) {
        //             if (isTempConstant) {
        //                 self.tempAggs.push(dstAggName);
        //             }
        //             deferred.resolve(self.getConstant(dstAggName));
        //         } else {
        //             deferred.resolve(res);
        //         }
        //     })
        //     .fail(deferred.reject);

        //     return deferred.promise();
        // },
        // Row numbers start at 1
        // fetchData: function(tableName, startRowNum, rowsToFetch) {
        //     return XIApi.fetchData(tableName, startRowNum, rowsToFetch);
        // },

        // fetchDataAndParse: function(tableName, startRowNum, rowsToFetch) {
        //     return XIApi.fetchDataAndParse(tableName, startRowNum, rowsToFetch);
        // },

        // fetchColumnData: function(colName, tableName, startRowNum, rowsToFetch) {
        //     return XIApi.fetchColumnData(colName, tableName, startRowNum, rowsToFetch);
        // },
    };
    return SQLApi;
}());