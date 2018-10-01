window.XcSDK = window.XcSDK || {};
// Do this becuase in prod build, the order of extensionApi.js
// and extensionApi_Operations.js is unknown(true?)
if (window.XcSDK.Extension == null) {
    window.XcSDK.Extension = function() {
        return this;
    };
}

window.XcSDK.Extension.prototype = (function() {
    var prototype = {
        // api for operations
        filter: function(fltStr, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.filter(txId, fltStr, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },
        // dstAggName is optional and can be left blank (will autogenerate)
        aggregate: function(aggOp, colName, tableName, dstAggName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = this.txId;
            XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName)
            .then(function(value, dstDagName, toDelete) {
                self._addAgg(value, tableName, colName, aggOp, dstAggName,
                    dstDagName);
                deferred.resolve(value, dstDagName, toDelete);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },
         // dstAggName is optional and can be left blank (will autogenerate)
        aggregateWithEvalStr: function(evalStr, tableName, dstAggName) {
            var txId = this.txId;
            return XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName);
        },

        load: function(dsArgs, formatArgs, dsName) {
            // Important: dsName gets transformed. This promise returns new name.
            // If following this by an indexFromDataset, be sure to use
            // the transformed name.

            // dsArgs is as follows:
            // url, isRecur, maxSampleSize, skipRows,
            // formatArgs is as follows:
            // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
            // fieldDelim, recordDelim, hasHeader, quoteChar,
            // moduleName, funcName
            var deferred = PromiseHelper.deferred();
            var txId = this.txId;
            dsName = xcHelper.wrapDSName(dsName);

            XIApi.load(dsArgs, formatArgs, dsName, txId)
            .then(function() {
                deferred.resolve(dsName);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        index: function(colToIndex, tableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;
            if (!(colToIndex instanceof Array)) {
                colToIndex = [colToIndex];
            }
            XIApi.index(txId, colToIndex, tableName)
            .then(function(dstTable, indexArgs) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable, indexArgs);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        indexFromDataset: function(datasetName, newTableName, prefix) {
            var self = this;
            var txId = self.txId;

            // No need to addMeta because this is the first table created
            // so we don't have the meta information anyway
            return XIApi.indexFromDataset(txId, datasetName, newTableName,
                                          prefix);
        },


        sort: function(orders, colNames, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            orders = (orders instanceof Array) ? orders : [orders];
            colNames = (colNames instanceof Array) ? colNames : [colNames];

            var colInfo = orders.map(function(order, index) {
                var colName = colNames[index];
                return {
                    name: colName,
                    ordering: order
                };
            });

            XIApi.sort(txId, colInfo, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject); // will return error, sorted when fail

            return deferred.promise();
        },

        sortAscending: function(colNames, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.sortAscending(txId, colNames, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        sortDescending: function(colNames, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.sortDescending(txId, colNames, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        map: function(mapStrs, tableName, newColNames, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.map(txId, mapStrs, tableName, newColNames, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
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
                            "orig": "test",
                            "type": DfFieldTypeT.DfFatptr
                        }]
                    }

            options:
                newTableName: string, final table's name, optional
                clean: boolean, remove intermediate table if set true
        */
        join: function(joinType, lTableInfo, rTableInfo, options) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
            .then(function(dstTable, tempCols, lRename, rRename) {
                var dstCols = xcHelper.createJoinedColumns(lTableInfo.tableName,
                    rTableInfo.tableName, lTableInfo.pulledColumns,
                    rTableInfo.pulledColumns, lRename, rRename);
                self._addMeta(null, dstTable, dstCols);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
            tableInofs: array of table info, each table info object has
                tableName: table's name
                columns an array of column infos which contains:
                   name: column's name
                   rename: rename
                   type: column's type
                   cast: need a cast to the type or not

            sample:
                    var tableInfos = [{
                        tableName: "test#ab123",
                        columns: [{
                            name: "test2",
                            rename: "test",
                            type: "string"
                            cast: true
                        }]
                    }]
        */
        union: function(tableInfos, dedup, newTableName, unionType) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.union(txId, tableInfos, dedup, newTableName, unionType)
            .then(function(dstTable, dstCols) {
                self._addMeta(null, dstTable, dstCols);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        getJoinRenameMap: function(oldName, newName, isPrefix) {
            var type = isPrefix
                       ? DfFieldTypeT.DfFatptr
                       : DfFieldTypeT.DfUnknown;
            return xcHelper.getJoinRenameMap(oldName, newName, type);
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
        groupBy: function(operator, groupByCols, aggColName, tableName, newColName, options) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;
            options = options || {};
            options.icvMode = false;
            var gbArgs = [{
                operator: operator,
                aggColName: aggColName,
                newColName: newColName
            }];
            if (!(groupByCols instanceof Array)) {
                groupByCols = [groupByCols];
            }
            var isIncSample = options.isIncSample;
            XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
            .then(function(dstTable) {
                var sampleCols = isIncSample ? options.columnsToKeep : null;
                var dstCols = xcHelper.createGroupByColumns(
                    tableName, groupByCols, gbArgs, sampleCols);
                self._addMeta(tableName, dstTable, dstCols);
                var dstColumnsSDK = dstCols.map(function(progcol) {
                    return new XcSDK.Column(progcol.getBackColName(),
                        progcol.getType());
                });
                deferred.resolve(dstTable, dstColumnsSDK);
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
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.project(txId, columns, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
            colInfos: an array of colInfo object, example:
                {
                    "orig": "prefix::col",
                    "new": "newCol",
                    "type": DfFieldTypeT.DfString
                }
            tableName: table's name
            newTableName(optional): new table's name
        */
        synthesize: function(colInfos, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.synthesize(txId, colInfos, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        query: function(queryStr) {
            if (!this.__checkDstTableNameInQuery(queryStr)) {
                return PromiseHelper.reject(ExtTStr.InvalidTableName);
            }
            var txId = this.txId;
            var queryName = this.tableNameRoot + "_ext_query";
            // in case of query name conflict
            queryName = xcHelper.randName(queryName);
            return XIApi.query(txId, queryName, queryStr);
        },

        __checkDstTableNameInQuery: function(queryStr) {
            // check --dsttable pattern
            var re1 = new RegExp("--dsttable", "g");
            // check --dsttable name#hastTagIdCount pattern
            var re2 = new RegExp("--dsttable \\w+#\\d+", "g");

            var res1 = queryStr.match(re1);
            var res2 = queryStr.match(re2);
            if (res1 == null && res2 == null) {
                return true;
            }
            if (res1 == null || res2 == null) {
                // must be some name don't match
                return false;
            }
            // the two patterns should match in length
            if (res1 == null || res2 == null) {
                return true;
            }

            return (res1.length === res2.length);
        },

        export: function(tableName, exportName, targetName, numCols,
                        backColumns, frontColumns, keepOrder, options) {
            var txId = this.txId;
            return XIApi.exportTable(txId, tableName, exportName, targetName, numCols,
                                backColumns, frontColumns, keepOrder, options);
        },

        genRowNum: function(tableName, newColName, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self.txId;

            XIApi.genRowNum(txId, tableName, newColName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        getNumRows: function(tableName, options) {
            options = options || {};
            var deferred = PromiseHelper.deferred();
            var self = this;
            var useConstant = options.useConstant;
            var isTempConstant = false;

            options.txId = this.txId;

            if (useConstant && options.constantName == null) {
                options.constantName = self.createTempConstant();
                isTempConstant = true;
            }

            XIApi.getNumRows(tableName, options)
            .then(function(res, dstAggName) {
                if (useConstant) {
                    if (isTempConstant) {
                        self.tempAggs.push(dstAggName);
                    }
                    deferred.resolve(self.getConstant(dstAggName));
                } else {
                    deferred.resolve(res);
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        // Row numbers start at 1
        fetchData: function(tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchData(tableName, startRowNum, rowsToFetch);
        },

        fetchDataAndParse: function(tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchDataAndParse(tableName, startRowNum, rowsToFetch);
        },

        fetchColumnData: function(colName, tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchColumnData(colName, tableName, startRowNum, rowsToFetch);
        },

        createDataTarget: function(targetType, targetName, targetParams) {
            return XIApi.createDataTarget(targetType, targetName, targetParams);
        },
        deleteDataTarget: function(targetName) {
            // Currently licenseMgr and tutorialsSetup are the only
            // extension that invokes this. We
            // restrict the name to avoid unintentionally deleting other targets
            if (targetName.startsWith("licenseMgr_")) {
                return XIApi.deleteDataTarget(targetName);
            } else if (targetName.startsWith("XcalarSample")) {
                return XIApi.deleteDataTarget(targetName);
            }
            else {
                var deferred = PromiseHelper.deferred();
                deferred.reject("Delete target operation is not supported yet");
                return deferred.promise();
            }
        },

        // private functions
        _addMeta: function(srcTable, dstTable, dstCols, options) {
            // XXX options is later used to customize tableCols
            options = options || {};
            var srcTableId = xcHelper.getTableId(srcTable);
            if (dstCols == null && srcTableId != null && gTables[srcTableId]) {
                dstCols = gTables[srcTableId].tableCols;
            }

            TblManager.setOrphanTableMeta(dstTable, dstCols);
            this.newTables.push(new XcSDK.Table(dstTable, this.worksheet, this.modelingMode));
        },

        _addAgg: function(value, tableName, colName, aggOp, dstAggName, dstDagName) {
            var origAggName = gAggVarPrefix + dstAggName;
            var tableId = xcHelper.getTableId(tableName);
            var aggRes = {
                "value": value,
                "dagName": dstDagName,
                "aggName": origAggName,
                "tableId": tableId,
                "backColName": colName,
                "op": aggOp
            };
            Aggregates.addAgg(aggRes, false);
        }
    };

    return jQuery.extend(XcSDK.Extension.prototype, prototype);
}());
