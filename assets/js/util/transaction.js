window.Transaction = (function(Transaction, $) {
    var txCache = {};
    var canceledTxCache = {};
    var disabledCancels = {};
    var txIdCount = 0;
    var isDeleting = false;

    Transaction.start = function(options) {
        options = options || {};
        var msgId;
        var operation = options.operation;

        if (options.msg != null) {
            msgId = StatusMessage.addMsg({
                "msg": options.msg,
                "operation": operation
            });
        }

        var curId = txIdCount;
        var txLog = new TXLog({
            "msgId": msgId,
            "operation": operation,
            "sql": options.sql
        });

        txCache[curId] = txLog;

        var numSubQueries;
        if (options.steps != null) {
            if (!isNaN(options.steps) || options.steps < 1) {
                numSubQueries = options.steps;
            } else {
                numSubQueries = -1;
            }
            if (options.functionName) {
                operation += " " + options.functionName;
            }
            var queryOptions = {
                numSteps: numSubQueries,
                cancelable: options.cancelable,
                exportName: options.exportName,
                srcTables: getSrcTables(options.sql)
            };

            QueryManager.addQuery(curId, operation, queryOptions);
        }

        txIdCount++;
        return curId;
    };

    Transaction.done = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            // if canceled, Transaction.cancel already took care of the cleanup
            // and messages
            QueryManager.cleanUpCanceledTables(txId);
            return;
        }

        options = options || {};

        var txLog = txCache[txId];
        // add success msg
        var msgId = txLog.getMsgId();

        if (msgId != null) {
            var noNotification = options.noNotification || false;
            var tableId = options.msgTable;
            var msgOptions = options.msgOptions;

            StatusMessage.success(msgId, noNotification, tableId, msgOptions);
        }

        // add sql
        var willCommit = !options.noCommit;
        var queryNum;
        if (options.noSql) {
            queryNum = null;
        } else {
            var cli = txLog.getCli();
            // if has new sql, use the new one, otherwise, use the cached one
            var sql = options.sql || txLog.getSQL();
            var title = options.title || txLog.getOperation();
            title = xcHelper.capitalize(title);
            SQL.add(title, sql, cli, willCommit);
            queryNum = SQL.getCursor();
        }

        QueryManager.queryDone(txId, queryNum);

        // remove transaction
        removeTX(txId);

        // commit
        if (willCommit) {
            KVStore.commit();
        }

        transactionCleaner();
    };

    Transaction.fail = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            // transaction failed due to a cancel
            QueryManager.cleanUpCanceledTables(txId);
            return;
        }

        options = options || {};

        var txLog = txCache[txId];
        // add fail msg
        var msgId = txLog.getMsgId();
        var failMsg = options.failMsg;

        if (msgId != null) {
            var srcTableId = null;
            if (options && options.sql && options.sql.tableId) {
                srcTableId = options.sql.tableId;
            }
            StatusMessage.fail(failMsg, msgId, srcTableId);
        }

        // add error sql
        var error = options.error;
        var sql = options.sql || txLog.getSQL();
        var cli = txLog.getCli(); //
        var title = options.title || failMsg;
        if (!title) {
            title = txLog.getOperation();
        }
        title = xcHelper.capitalize(title);

        SQL.errorLog(title, sql, cli, error);
        QueryManager.fail(txId, error);

        // add alert(optional)
        if (!options.noAlert) {
            var alertTitle = failMsg || CommonTxtTstr.OpFail;
            Alert.error(alertTitle, error);
        }

        transactionCleaner();
        removeTX(txId);
    };

    Transaction.disableCancel = function(txId) {
        // when a replaceTable is called in the worksheet, we disable the
        // ability to cancel because it's too late at this point
        if (isValidTX(txId)) {
            disabledCancels[txId] = true;
            // this is used in Transaction.isCancelable to check if a transaction
            // can be canceled
        }
    };

    Transaction.isCancelable = function(txId) {
        return (isValidTX(txId) && !disabledCancels.hasOwnProperty(txId));
    };

    Transaction.cancel = function(txId, options) {
        if (!isValidTX(txId)) {
            return;
        }
        if (txId in canceledTxCache) {
            console.error("cancel on transaction " + txId + " already done.");
            return;
        }
        options = options || {};

        var txLog = txCache[txId];
        // cancel msg
        var msgId = txLog.getMsgId();
        if (msgId != null) {
            StatusMessage.cancel(msgId);
        }

        // add sql
        var cli = txLog.getCli();

        if (cli !== "") {
            // if cli is empty, no need to log
            var sql = options.sql || txLog.getSQL();
            var title = options.title || txLog.getOperation();
            title = xcHelper.capitalize(title);

            SQL.errorLog(title, sql, cli, SQLType.Cancel);
        }

        cancelTX(txId);
        removeTX(txId);

        QueryManager.confirmCanceledQuery(txId);
        transactionCleaner();
    };

    // dstTableName is optional - only needed to trigger subQueryDone
    Transaction.log = function(txId, cli, dstTableName, timeObj) {
        if (!isValidTX(txId)) {
            return;
        }
        if (canceledTxCache[txId]) {
            return;
        }

        var tx = txCache[txId];
        tx.addCli(cli);

        if (dstTableName || timeObj != null) {
            QueryManager.subQueryDone(txId, dstTableName, timeObj);
        }
    };

    Transaction.startSubQuery = function(txId, name, dstTable, query) {
        var subQueries = xcHelper.parseQuery(query);
        if (dstTable && subQueries.length === 1) {
            var options = {
                exportFileName: subQueries[0].exportFileName
            };
            QueryManager.addSubQuery(txId, name, dstTable, query, null,
                                    options);
        } else if (subQueries.length) {
            for (var i = 0; i < subQueries.length; i++) {
                QueryManager.addSubQuery(txId, subQueries[i].name,
                                            subQueries[i].dstTable,
                                            subQueries[i].query, name);
            }
        }
    };

    Transaction.checkCanceled = function(txId) {
        return (txId in canceledTxCache);
    };

    Transaction.cleanUpCanceledTables = function(txId) {
        QueryManager.cleanUpCanceledTables(txId);
    };

    Transaction.getCache = function() {
        return txCache;
    };

    // Transaction.errorLog = function(txId) {
    //     if (!isValidTX(txId)) {
    //         console.warn("transaction does't exist!");
    //         return;
    //     }
    // };

    function isValidTX(txId) {
        if (txId == null) {
            console.error("transaction does't exist!");
            return false;
        }
        if (!txCache.hasOwnProperty(txId) &&
            !canceledTxCache.hasOwnProperty(txId)) {
            console.error("transaction does't exist!");
            return false;
        }

        return true;
    }

    function cancelTX(txId) {
        canceledTxCache[txId] = true;
    }

    function removeTX(txId) {
        delete disabledCancels[txId];
        delete txCache[txId];
    }

    function transactionCleaner() {
        if (gAlwaysDelete && !isDeleting) {
            isDeleting = true;

            TableList.refreshOrphanList(false)
            .then(function() {
                console.info("drop", gOrphanTables);
                return TblManager.deleteTables(gOrphanTables, TableType.Orphan, true);
            })
            .fail(function(error) {
                console.error("drop table failed", error);
            })
            .always(function() {
                isDeleting = false;
            });
        }
    }

    // only used to determine which tables to unlock when canceling
    function getSrcTables(sql) {
        var tables = [];
        if (!sql) {
            return tables;
        }
        if (sql.srcTables) {
            for (var i = 0; i < sql.srcTables.length; i++) {
                tables.push(sql.srcTables[i]);
            }
        } else if (sql.tableName) {
            tables.push(sql.tableName);
        } else if (sql.tableId && gTables[sql.tableId]) {
            tables.push(gTables[sql.tableId].getName());
        } else if (sql.lTableName) {
            tables.push(sql.lTableName);
            if (sql.rTableName && sql.rTableName !== sql.lTableName) {
                tables.push(sql.rTableName);
            }
        }
        return tables;
    }

    // tx is short for transaction
    function TXLog(options) {
        this.msgId = options.msgId || null;
        this.operation = options.operation;
        this.cli = "";
        this.sql = options.sql || null;

        return this;
    }

    TXLog.prototype = {
        "getMsgId": function() {
            return this.msgId;
        },

        "getCli": function() {
            return this.cli;
        },

        "getSQL": function() {
            return this.sql;
        },

        "getOperation": function() {
            return this.operation;
        },

        "addCli": function(cli) {
            // XXX the ";" should be remove after backend change!
            this.cli += cli;
            if (cli.slice(-1) !== ";") {
                this.cli += ";";
            }
        }
    };


    return (Transaction);
}({}, jQuery));
