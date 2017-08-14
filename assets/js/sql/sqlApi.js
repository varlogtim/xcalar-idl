window.SQLApi = (function() {
    function SQLApi() {
        var txId = Transaction.start({
            "operation": "SQL Simulate",
            "simulate": true
        });
        this.txId = txId;
        return this;
    };

    SQLApi.prototype = {
        run: function() {
            var txId = this.txId;
            var query = Transaction.done(txId, {
                "noNotification": true,
                "noSql": true
            });
            console.log("query", query);
            return query;
        },

        // newTableName is operation
        filter: function(fltStr, tableName, newTableName) {
            return XIApi.filter(this.txId, fltStr, tableName, newTableName);
        },
        // dstAggName is optional and can be left blank (will autogenerate)
        aggregate: function(aggOp, colName, tableName, dstAggName) {
            var txId = this.txId;
            return XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName);
        },

        sort: function(order, colName, tableName, newTableName) {
            var txId = this.txId;
            return XIApi.sort(txId, order, colName, tableName, newTableName);
        },

        map: function(mapStr, tableName, newColName, newTableName) {
            var txId = this.txId;
            return XIApi.map(txId, mapStr, tableName, newColName, newTableName);
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
            var txId = this.txId;

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, options)
            .then(function(dstTable, dstCols) {
                deferred.resolve(dstTable);
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
        groupBy: function(operator, groupByCols, aggColName, tableName, newColName, options) {
            var txId = this.txId;
            options = options || {};
            options.icvMode = false;
            var gbArgs = [{
                operator: operator,
                aggColName: aggColName,
                newColName: newColName
            }];
            return XIApi.groupBy(txId, gbArgs, groupByCols, tableName, options);
        },

        /*
            columns: an array of column names (back column name)
            tableName: table's name
            newTableName(optional): new table's name
        */
        project: function(columns, tableName, newTableName) {
            return XIApi.project(this.txId, columns, tableName, newTableName);
        },

        genRowNum: function(tableName, newColName, newTableName) {
            var txId = this.txId;
            return XIApi.genRowNum(txId, tableName, newColName, newTableName);
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