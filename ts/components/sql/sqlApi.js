(function() {
    var indexTableCache = {};
    var reverseIndexMap = {};
    var root = this;

    function SQLApi() {
        // status: -2: canceled, -1: error, 0: finished, 1: created-idle, 2: compile, 3: run, 4: post-run
        this.status = 1;
        this.runTxId = -1;
        this.sqlMode = false;
        return this;
    }

    SQLApi.getCacheTable = function() {
        return indexTableCache;
    };

    // static function
    // This is order sensitive. When index is no longer index sensitive,
    // we can do colNames.sort and then do the toString
    SQLApi.cacheIndexTable = function(tableName, colNames, indexTable, indexKeys) {
        var colKey = getIndexColKey(colNames);
        indexTableCache[tableName] = indexTableCache[tableName] || {};
        indexTableCache[tableName][colKey] = {
            tableName: indexTable,
            keys: indexKeys
        };
        reverseIndexMap[indexTable] = {
            "tableName": tableName,
            "colName": colKey
        };
    };

    SQLApi.getIndexTable = function(tableName, colNames) {
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
                case DfFieldTypeT.DfUInt64:
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

        _getQueryTableCols: function(tableName, allCols, isImmediate) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            XcalarGetTableMeta(tableName)
            .then(function(tableMeta) {
                if (tableMeta == null || tableMeta.valueAttrs == null) {
                    deferred.resolve([]);
                    return;
                }

                var valueAttrs = tableMeta.valueAttrs || [];
                var progCols = [];
                if (!isImmediate) {
                    var colNameSet = new Set();
                    for (var i = 0; i < allCols.length; i++) {
                        var found = false;
                        if (colNameSet.has(allCols[i].colName)) {
                            var k = 1;
                            while (colNameSet.has(allCols[i].colName + "_" + k)) {
                                k++;
                            }
                            allCols[i].colName = allCols[i].colName + "_" + k;
                        }
                        colNameSet.add(allCols[i].colName);
                        var colName = allCols[i].rename || allCols[i].colName;
                        var prefix = colName;
                        if (colName.indexOf("::") > 0) {
                            prefix = colName.split("::")[0];
                            colName = colName.split("::")[1];
                        }
                        for (var j = 0; j < valueAttrs.length; j++) {
                            var name = valueAttrs[j].name;
                            if (name === colName || name === prefix) {
                                found = true;
                                var type = self._getColType(valueAttrs[j].type);
                                progCols.push(ColManager.newPullCol(
                                               allCols[i].colName, name, type));
                                break;
                            }
                        }
                        assert(found);
                    }
                } else {
                    valueAttrs.forEach(function(valueAttr) {
                        var name = valueAttr.name;
                        var type = self._getColType(valueAttr.type);
                        progCols.push(ColManager.newPullCol(name, name, type));
                    });
                }
                assert(progCols.length > 0);
                // If progCols doesn't have elements, it could be due to:
                // 1. allCols is empty
                // 2. valueAttrs has no match colName
                // Both of which should never happen. If did, it should crash
                progCols.push(ColManager.newDATACol());
                deferred.resolve(progCols);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        _refreshTable: function(txId, tableName, allCols, allTables) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            self._getQueryTableCols(tableName, allCols)
            .then(function(tableCols) {
                var worksheet = WSManager.getActiveWS();
                return TblManager.refreshTable([tableName], tableCols,
                                            null, worksheet, txId, {
                                                "focusWorkspace": true
                                            });
            })
            .then(function() {
                return XcalarGetDag(tableName);
            })
            .then(function(dagNodes) {
                var allTables = [];
                var tableIds = [];
                var constantNameSet = new Set();
                var constants = [];
                for (var i = 0; i < dagNodes.node.length; i++) {
                    var tableName = dagNodes.node[i].name.name;
                    var tableId = xcHelper.getTableId(tableName);
                    if (tableId && !gTables[tableId]) {
                        allTables.push(tableName);
                    }
                    if (dagNodes.node[i].numRowsTotal === 0 &&
                        dagNodes.node[i].numParents != 0 &&
                        tableName.indexOf("#") === -1 &&
                        !constantNameSet.has(tableName)) {
                        constantNameSet.add(tableName);
                        constants.push({name: tableName,
                                input: dagNodes.node[i].input.aggregateInput});
                    }
                }
                return self._addMetaForImmediates(allTables, constants);
            })
            .then(deferred.resolve)
            .fail(function () {
                var ret = "";
                for (var i = 0; i < arguments.length; i++) {
                    if (i > 0) {
                        ret += "\n";
                    }
                    ret += JSON.stringify(arguments[i]);
                };
                deferred.reject(ret);
            });

            return deferred.promise();
        },

        _addMetaForImmediates: function(allTables, constants) {
            var self = this;
            var promiseArray = [];
            allTables.forEach(function(tableName) {
                var deferred = PromiseHelper.deferred();
                var promise = self._getQueryTableCols(tableName, null, true)
                    .then(function(progCols) {
                        TblManager.setOrphanTableMeta(tableName, progCols);
                        deferred.resolve();
                    })
                    .fail(deferred.resolve); // always resolve
                promiseArray.push(deferred.promise());
            });
            constants.forEach(function(constant) {
                var deferred = PromiseHelper.deferred();
                var constantName = constant.name;
                var resultSetId;
                var promise = XcalarMakeResultSetFromTable(constantName)
                    .then(function(ret) {
                        resultSetId = ret.resultSetId;
                        return XcalarGetNextPage(resultSetId, ret.numEntries);
                    })
                    .then(function(ret) {
                        try {
                            var value = JSON.parse(ret.values[0]).constant;
                        } catch (e) {
                            deferred.reject(SQLErrTStr.InvalidPageInfo);
                            return;
                        }
                        var aggRes = {
                            value: value,
                            dagName: constantName,
                            aggName: constantName,
                            tableId: constant.input.source.split("#")[1],
                            backColName: constant.input.eval[0].evalString
                                         .slice(constant.input.eval[0]
                                         .evalString.indexOf("("),-1),
                            op: constant.input.eval[0].evalString.split("(")[0]
                        };
                        Aggregates.addAgg(aggRes, false);
                        TableList.refreshConstantList();
                    })
                    .always(function() {
                        if (resultSetId) {
                            return XcalarSetFree(resultSetId);
                        }
                        return PromiseHelper.resolve();
                    })
                    .then(deferred.resolve)
                    .fail(deferred.resolve);
                promiseArray.push(deferred.promise());
            });
            return PromiseHelper.when.apply(window, promiseArray);
        },

        run: function(query, tableName, allCols, sqlQueryString, jdbcCheckTime) {
            var self = this;
            var deferred = PromiseHelper.deferred();
            var queryName = xcHelper.randName("sql");

            var txId = !self.sqlMode && Transaction.start({
                "operation": "Execute SQL",
                "track": true
            });
            self.runTxId = txId;
            if (self.status === -2) {
                Transaction.cancel(txId);
                return PromiseHelper.reject(SQLErrTStr.Cancel);
            }
            self.status = 3;
            XIApi.query(txId, queryName, query, jdbcCheckTime)
            .then(function() {
                self.status = 4;
                if (!self.sqlMode) {
                    DagFunction.commentDagNodes([tableName], sqlQueryString);
                    return self._refreshTable(txId, tableName, allCols);
                }
            })
            .then(function() {
                if (!self.sqlMode) {
                    var sql = {
                        "operation": "Execute SQL",
                        "query": query,
                        "tableName": tableName
                    };
                    Transaction.done(txId, {
                        "msgTable": xcHelper.getTableId(tableName),
                        "sql": sql
                    });
                }
                deferred.resolve(tableName);
            })
            .fail(function(error) {
                if (error === SQLErrTStr.Cancel) {
                    self.status = -2;
                }
                if (!self.sqlMode) {
                    Transaction.fail(txId, {
                        "failMsg": "Execute SQL failed",
                        "error": error
                    });
                }
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
            .then(function(dstTable, dstCols, tempCols) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": dstTable,
                    "newColumns": dstCols,
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
        union: function(tableInfos, dedup, newTableName) {
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();

            XIApi.union(txId, tableInfos, dedup, newTableName)
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
            var deferred = PromiseHelper.deferred();
            var self = this;
            var txId = self._start();

            options = options || {};
            options.icvMode = false;
            if (groupByCols.length === 0) {
                options.groupAll = true;
            }

            XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options)
            .then(function(finalTable, finalCols, renamedGroupByCols,
                           tempCols) {
                var cli = self._end(txId);
                deferred.resolve({
                    "newTableName": finalTable,
                    "newColumns": finalCols,
                    "renamedColumns": renamedGroupByCols,
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

        setStatus: function(st) {
            if (st === -2 && this.status === 3) {
                QueryManager.cancelQuery(this.runTxId);
                // $queryList.find(".query.active .cancelIcon").click();
                this.status = -2;
            } else if (st === -2 && this.status === 4) {
                console.error("operation is done, cannot cancel");
            } else if (this.status > 0) {
                this.status = st;
            }
        },

        setSqlMode: function() {
            this.sqlMode = true;
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

        // sortAscending: function(colName, tableName, newTableName) {
        //     var deferred = PromiseHelper.deferred();
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
        //     var deferred = PromiseHelper.deferred();
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
        if (typeof module !== "undefined" && module.exports) {
            exports = module.exports = SQLApi;
        }
    } else {
        root.SQLApi = SQLApi;
    }
}());
