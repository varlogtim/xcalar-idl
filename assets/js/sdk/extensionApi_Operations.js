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

        "load": function(dsArgs, formatArgs, dsName) {
            // Important: dsName gets transformed. This promise returns new name.
            // If following this by an indexFromDataset, be sure to use
            // the transformed name.

            // dsArgs is as follows:
            // url, isRecur, maxSampleSize, skipRows, isRegex
            // formatArgs is as follows:
            // format("CSV", "JSON", "Excel", "raw"), if "CSV", then
            // fieldDelim, recordDelim, hasHeader, quoteChar,
            // moduleName, funcName
            var deferred = jQuery.Deferred();
            var txId = this.txId;
            dsName = xcHelper.wrapDSName(dsName);

            XIApi.load(dsArgs, formatArgs, dsName, txId)
            .then(function() {
                deferred.resolve(dsName);
            })
            .fail(deferred.reject);

            return deferred.promise();
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

        "indexFromDataset": function(datasetName, newTableName, prefix) {
            var self = this;
            var txId = self.txId;

            // No need to addMeta because this is the first table created
            // so we don't have the meta information anyway
            return XIApi.indexFromDataset(txId, datasetName, newTableName,
                                          prefix);
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
                    "tableName"    : "test#ab123",
                    "columns"      : ["test::colA", "test::colB"],
                    "pulledColumns": ["test::colA", "test::colB"],
                    "rename"       : [{
                        "new" : "test2",
                        "orig" : "test",
                        "type": DfFieldTypeT.DfFatptr
                    }]
                }

        */
        "join": function(joinType, lTableInfo, rTableInfo, newTableName) {
            var deferred = jQuery.Deferred();
            var self = this;
            var txId = self.txId;

            XIApi.join(txId, joinType, lTableInfo, rTableInfo, newTableName)
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
            var indexTableName;
            if (newTableName.startsWith(".temp")) {
                indexTableName = self.createTempTableName();
            }

            XIApi.groupBy(txId, operator, groupByCols, aggColName,
                            isIncSample, tableName,
                            newColName, newTableName, indexTableName, false)
            .then(function(dstTable, dstCols) {
                self._addMeta(tableName, dstTable, dstCols);
                deferred.resolve(dstTable, dstCols);
            })
            .fail(deferred.reject);

            return deferred.promise();
        },

        /*
            columns: an array of column names (back column name)
            tableName: table's name
            newTableName(optional): new table's name
        */
        "project": function(columns, tableName, newTableName) {
            var deferred = jQuery.Deferred();
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

        "query": function(queryStr) {
            var txId = this.txId;
            var queryName = this.tableNameRoot + "_ext_query";
            // in case of query name conflict
            queryName = xcHelper.randName(queryName);
            return XIApi.query(txId, queryName, queryStr);
        },

        "genRowNum": function(tableName, newColName, newTableName) {
            var deferred = jQuery.Deferred();
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

        "appSet": function(name, hostType, duty, execStr) {
            var self = this;
            var txId = self.txId;

            return XIApi.appSet(txId, name, hostType, duty, execStr);
        },

        "appRun": function(name, isGlobal, inStr) {
            var self = this;
            var txId = self.txId;

            return XIApi.appRun(txId, name, isGlobal, inStr);
        },

        "appReap": function(name, appGroupId) {
            var self = this;
            var txId = self.txId;

            return XIApi.appReap(txId, name, appGroupId);
        },

        "appExecute": function(name, isGlobal, inStr) {
            var self = this;
            var txId = self.txId;

            return XIApi.appExecute(txId, name, isGlobal, inStr);
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
