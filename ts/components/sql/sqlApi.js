(function() {
    var indexTableCache = {};
    var reverseIndexMap = {};
    var root = this;

    function SQLApi() {
        // status: Running, Done, Failed, Cancelled
        this.status;
        this.runTxId = -1;
        this.sqlMode = false;
        this.queryName;
        this.queryId;
        this.errorMsg;
        this.startTime;
        this.endTime;
        this.queryString;
        this.newTableName;
        return this;
    }

    SQLApi.getCacheTable = function() {
        return indexTableCache;
    };

    // static function
    // This is order sensitive. When index is no longer index sensitive,
    // we can do colNames.sort and then do the toString
    SQLApi.cacheIndexTable = function(tableName, colNames, indexTable, indexKeys, tempCols) {
        var colKey = getIndexColKey(colNames);
        indexTableCache[tableName] = indexTableCache[tableName] || {};
        indexTableCache[tableName][colKey] = {
            tableName: indexTable,
            keys: indexKeys,
            tempCols: tempCols
        };
        reverseIndexMap[indexTable] = {
            "tableName": tableName,
            "colName": colKey
        };
    };

    SQLApi.getIndexTable = function(tableName, colNames) {
        if (typeof DagTblManager !== "undefined") {
            DagTblManager.Instance.resetTable(tableName);
        }
        var colKey = getIndexColKey(colNames);
        if (indexTableCache[tableName]) {
            return indexTableCache[tableName][colKey] || null;
        } else {
            return null;
        }
    };

    SQLApi.deleteIndexTable = function(indexTable) {
        if (reverseIndexMap[indexTable]) {
            var tableName = reverseIndexMap[indexTable].tableName;
            var colKey = reverseIndexMap[indexTable].colName;
            delete indexTableCache[tableName][colKey];
            delete reverseIndexMap[indexTable];
        }
    };

    SQLApi.clear = function() {
        indexTableCache = {};
        reverseIndexMap = {};
    };

    function getIndexColKey(colNames) {
        return colNames.toString();
    }
    function assert(st, message) {
        if (!st) {
            console.error("ASSERTION FAILURE!");
            if (!message) {
                message = "SQLApi Error";
            }
            if (typeof SQLOpPanel !== "undefined") {
                SQLOpPanel.throwError(message);
            }
            throw "Assertion Failure: " + message;
        }
    }

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
            // console.log("query", query);
            return query;
        },

        run: function(query, tableName, allCols, sqlQueryString, jdbcCheckTime) {
            var self = this;
            if (!self.sqlMode) {
                return PromiseHelper.reject(SQLErrTStr.NeedSQLMode);
            }
            if (typeof DagTblManager !== "undefined") {
                DagTblManager.Instance.resetTable(tableName);
            }
            var deferred = PromiseHelper.deferred();
            var queryName = self.queryName || xcHelper.randName("sql", 8);

            var txId = !self.sqlMode && Transaction.start({
                "operation": "Execute SQL",
                "track": true
            });
            self.runTxId = txId;
            // if (self.status === SQLStatus.Cancelled) {
            //     Transaction.cancel(txId);
            //     return PromiseHelper.reject(SQLErrTStr.Cancel);
            // }
            var options = {
                jdbcCheckTime: jdbcCheckTime
            };
            XIApi.query(txId, queryName, query, options)
            .then(function() {
                // jdbc will resolve with cancel status here
                if (arguments &&
                    arguments[0].queryState === QueryStateT.qrCancelled) {
                    return PromiseHelper.reject(SQLErrTStr.Cancel);
                }
            })
            .then(function() {
                deferred.resolve(tableName, allCols);
            })
            .fail(function(error) {
                deferred.reject(error);
            });

            return deferred.promise();
        },

        // newTableName is operation
        filter: function(fltStr, tableName, newTableName) {
            var deferred = PromiseHelper.deferred();
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
            var deferred = PromiseHelper.deferred();
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

        aggregateWithEvalStr: function(evalStr, tableName, dstAggName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();

            XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName)
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
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();
            sortColsAndOrder.forEach(function(col) {
                delete col.colId;
            })

            XIApi.sort(txId, sortColsAndOrder, tableName, newTableName)
            .then(function(ret) {
                var cli = self._end(txId);
                cli = cli.replace(/\\t/g, "\\\\t");
                if (typeof(ret) === "string") {
                    deferred.resolve({
                        "newTableName": ret,
                        "cli": cli,
                        "sortColName": sortColsAndOrder[0].name,
                        "order": sortColsAndOrder[0].ordering
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
            var deferred = PromiseHelper.deferred();
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
                            "orig": "test",
                            "type": DfFieldTypeT.DfFatptr
                        }]
                    }

            options:
                newTableName: string, final table's name, optional
                clean: boolean, remove intermediate table if set true
                evalString: for crossJoins only. filter string after crossjoin
        */
        join: function(joinType, lTableInfo, rTableInfo, options) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
            .then(function(dstTable, tempCols, lRename, rRename) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": dstTable,
                    "tempCols": tempCols,
                    "cli": cli
                });
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
            var txId = self._start();

            XIApi.union(txId, tableInfos, dedup, newTableName, unionType)
            .then(function(dstTable, dstCols) {
                var cli = self._end(txId);
                var newTableCols = dstCols.map((col) => {
                    return ColManager.newPullCol(col.rename, null, col.type);
                });
                newTableCols.push(ColManager.newDATACol());
                deferred.resolve({
                    "newTableName": dstTable,
                    "newColumns": newTableCols,
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
         *  icvMode: true/false, icv mode or not
         *  newTableName: string, dst table name, optional
         *  clean: true/false, if set true, will remove intermediate tables
         */
        groupBy: function(groupByCols, gbArgs, tableName, options) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();

            options = options || {};
            options.icvMode = false;
            if (groupByCols.length === 0) {
                options.groupAll = true;
            }

            XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
            .then(function(finalTable, tempCols, newKeyFieldName, newKeys) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "tempCols": tempCols,
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
            var deferred = PromiseHelper.deferred();
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
            var deferred = PromiseHelper.deferred();
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
            var deferred = PromiseHelper.deferred();
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

        getStatus: function() {
            return this.status;
        },

        setStatus: function(status) {
            if (this.status === SQLStatus.Done ||
                this.status === SQLStatus.Cancelled ||
                this.status === SQLStatus.Failed) {
                return PromiseHelper.resolve();
            }
            if (status === SQLStatus.Cancelled && this.status === SQLStatus.Running) {
                this.status = status;
                this.endTime = new Date();
                if (!this.sqlMode) {
                    return QueryManager.cancelQuery(this.runTxId);
                } else {
                    return XcalarQueryCancel(this.queryName);
                }
            }
            if (!this.status && status === SQLStatus.Running) {
                this.startTime = new Date();
            } else if (this.startTime && status === SQLStatus.Done ||
                status === SQLStatus.Cancelled ||
                status === SQLStatus.Failed) {
                this.endTime = new Date();
            }
            this.status = status;
            return PromiseHelper.resolve();
        },

        setSqlMode: function() {
            this.sqlMode = true;
        },

        getQueryName: function() {
            return this.queryName;
        },

        setQueryName: function(queryName) {
            this.queryName = queryName;
        },

        getQueryId: function() {
            return this.queryId;
        },

        setQueryId: function(queryId) {
            this.queryId = queryId;
        },

        getError: function() {
            return this.errorMsg;
        },

        setError: function(errorMsg) {
            this.errorMsg = errorMsg;
        },

        getQueryString: function() {
            return this.queryString;
        },

        setQueryString: function(queryString) {
            this.queryString = queryString;
        },

        getNewTableName: function() {
            return this.newTableName;
        },

        setNewTableName: function(newTableName) {
            this.newTableName = newTableName;
        }

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
        //     // url, isRecur, maxSampleSize, skipRows,s
        //     // formatArgs is as follows:
        //     // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
        //     // fieldDelim, recordDelim, hasHeader, quoteChar,
        //     // moduleName, funcName
        //     var deferred = PromiseHelper.deferred();
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

        // sortAscending: function(colNames, tableName, newTableName) {
        //     var deferred = PromiseHelper.deferred();
        //     var self = this;
        //     var txId = self.txId;

        //     XIApi.sortAscending(txId, colNames, tableName, newTableName)
        //     .then(function(dstTable) {
        //         self._addMeta(tableName, dstTable);
        //         deferred.resolve(dstTable);
        //     })
        //     .fail(deferred.reject);

        //     return deferred.promise();
        // },

        // sortDescending: function(colNames, tableName, newTableName) {
        //     var deferred = PromiseHelper.deferred();
        //     var self = this;
        //     var txId = self.txId;

        //     XIApi.sortDescending(txId, colNames, tableName, newTableName)
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
        //     var deferred = PromiseHelper.deferred();
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

    /* Unit Test Only */
    if (typeof window !== "undefined" && window.unitTestMode) {
        SQLApi.__testOnly__ = {};
        SQLApi.__testOnly__.indexTableCache = indexTableCache;
        SQLApi.__testOnly__.setIndexTableCache = function(input) {
            indexTableCache = input;
        };
        SQLApi.__testOnly__.reverseIndexMap = reverseIndexMap;
        SQLApi.__testOnly__.setReverseIndexMap = function(input) {
            reverseIndexMap = input;
        };
    }
    /* End Of Unit Test Only */

    if (typeof exports !== "undefined") {
        exports.SQLApi = SQLApi;
    } else {
        root.SQLApi = SQLApi;
    }
}());
