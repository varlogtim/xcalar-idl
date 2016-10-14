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
        "filter": function(fltStr, tableName, newTableName) {
            var deferred = jQuery.Deferred();
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
        "aggregate": function(aggOp, colName, tableName, dstAggName) {
            var txId = this.txId;
            return XIApi.aggregate(txId, aggOp, colName, tableName, dstAggName);
        },
         // dstAggName is optional and can be left blank (will autogenerate)
        "aggregateWithEvalStr": function(evalStr, tableName, dstAggName) {
            var txId = this.txId;
            return XIApi.aggregateWithEvalStr(txId, evalStr, tableName, dstAggName);
        },

        "index": function(colToIndex, tableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.index(txId, colToIndex, tableName)
            .then(function(dstTable, hasIndexed) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable, hasIndexed);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "sort": function(order, colName, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.sort(txId, order, colName, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject); // will return error, sorted when fail

            return deferred.promise();
        },

        "sortAscending": function(colName, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.sortAscending(txId, colName, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "sortDescending": function(colName, tableName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.sortDescending(txId, colName, tableName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "map": function(mapStr, tableName, newColName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.map(txId, mapStr, tableName, newColName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "join": function(joinType, lColNames, lTableName, rColNames, rTableName,
                         newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.join(txId, joinType, lColNames, lTableName, rColNames, rTableName,
                       newTableName)
            .then(function(dstTable, dstCols) {
                self._addMeta(null, dstTable, dstCols);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "groupBy": function(operator, groupByCols, aggColName,
                            isIncSample, tableName,
                            newColName, newTableName)
        {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.groupBy(txId, operator, groupByCols, aggColName,
                            isIncSample, tableName,
                            newColName, newTableName, false)
            .then(function(dstTable, dstCols) {
                self._addMeta(tableName, dstTable, dstCols);
                deferred.resolve(dstTable, dstCols);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "query": function(queryStr) {
            var txId = this.txId;
            var queryName = this.tableNameRoot + "_ext_query";
            // in case of query name conflict
            queryName = xcHelper.randName(queryName);
            return XIApi.query(txId, queryName, queryStr);
        },

        "getRowNum": function(tableName, newColName, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.getRowNum(txId, tableName, newColName, newTableName)
            .then(function(dstTable) {
                self._addMeta(tableName, dstTable);
                deferred.resolve(dstTable);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        "getNumRows": function(tableName) {
            return XIApi.getNumRows(tableName);
        },

        // Row numbers start at 1
        "fetchData": function(tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchData(tableName, startRowNum, rowsToFetch);
        },

        "fetchDataAndParse": function(tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchDataAndParse(tableName, startRowNum, rowsToFetch);
        },

        "fetchColumnData": function(colName, tableName, startRowNum, rowsToFetch) {
            return XIApi.fetchColumnData(colName, tableName, startRowNum, rowsToFetch);
        },

        // private function
        "_addMeta": function(srcTable, dstTable, dstCols, options) {
            // XXX options is later used to customize tableCols
            options = options || {};
            var srcTableId = xcHelper.getTableId(srcTable);
            if (dstCols == null && srcTableId != null) {
                dstCols = gTables[srcTableId].tableCols;
            }

            TblManager.setOrphanTableMeta(dstTable, dstCols);
            this.newTables.push(new XcSDK.Table(dstTable, this.worksheet));
        }
    };

    return jQuery.extend(XcSDK.Extension.prototype, prototype);
}());
