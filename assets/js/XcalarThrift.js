var tHandle;

function setupThrift() {
    setupHostName();
    if (!portNumber) {
        portNumber = 80;
    }
    tHandle = xcalarConnectThrift(hostname, portNumber.toString());
}

function setupHostName() {
    if (window.hostname == null || window.hostname === "") {
        try {
            var url = window.location.href;
            var lastBackSlash = url.lastIndexOf("/");
            url = url.substring(0, lastBackSlash);
            // XXX when backend support the split of "http://"("https://"),
            // we do not need the following code
            var hname = url.split("http://")[1];
            var hnamePort = hname.split(":");
            window.hostname = hnamePort[0];
            if (hnamePort.length > 1) {
                window.hostname = hnamePort[0];
                window.portNumber = hnamePort[1];
            }
        } catch(error) {
            console.error(error);
        }
    }
}
// for convenience, add the function list here and make them
// comment in deafult
var funcFailPercentage = {
    // "XcalarAggregateHelper": 0.2
};
var defaultFuncFailPercentage = 0.0;
var errorInjection = true;

function THandleDoesntExistError() {
    this.name = "THandleDoesntExistError";
    this.message = "tHandle does not exist yet.";
}
THandleDoesntExistError.prototype = Error.prototype;

function thriftLog() {
    var errorLists = [];
    var title = arguments[0] || "thrift call";
    // check all errors
    for (var i = 1, len = arguments.length; i < len; i++) {
        var errRes = arguments[i];
        if (errRes == null) {
            continue;
        }
        var type = typeof errRes;
        var thriftError = {};
        var error;
        var status;

        if (type === "number") {
            status = errRes;
            error = StatusTStr[status];
        } else if (type === "object") {
            status = errRes.status;
            error = StatusTStr[status];
        } else {
            // when error is string
            error = errRes;
        }

        // special case when error is Success
        if (status === StatusT.StatusOk) {
            error = "Unknown Error";
        }

        var msg;

        if (status != null) {
            msg = title + " failed with status " + status + ": " + error;
            thriftError.status = status;
        } else {
            msg = title + " failed: " + error;
        }

        thriftError.error = "Error: " + error;
        console.error('(╯°□°）╯︵ ┻━┻ ' + msg);
        errorLists.push(thriftError);

        var alertError;
        // XXX We might need to include connection status 502 (Proxy error)
        if (status === StatusT.StatusConnReset ||
            status === StatusT.StatusConnRefused) {
            // This is bad, connection was lost so UI cannot do anything
            // LOCK THE SCREEN
            alertError = {"error": ThriftTStr.CCNBE};
            Alert.error(ThriftTStr.CCNBEErr, alertError, {"lockScreen": true});

            return thriftError;
        }
    }

    // case other than connection reset and no mem,
    // return first error
    return errorLists[0];
}

function sleep(val) {
    function parse(str) {
        var timeStr = /^((?:\d+)?\.?\d+)*(ms|s|m|h)?$/i,
            s = 1000,
            m = s * 60,
            h = m * 60;

        var match = timeStr.exec(str);

        if (!match) {
            return (0);
        }

        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        var duration = null;

        switch (type) {
            case "ms":
                duration = n;

                break;
            case "s":
                duration = s * n;
                break;
            case "m":
                duration = m * n;
                break;
            case "h":
                duration = h * n;
                break;
            default:
                duration = 0;
                break;
        }
        return (duration);
    }

    var end = Date.now() + parse(val);

    while (Date.now() < end) {}
}

function parseDS(dsName) {
    return (".XcalarDS." + dsName);
}

// Should check if the function returns a promise
// but that would require an extra function call
window.Function.prototype.log = function() {
    var fn = this;
    var args = Array.prototype.slice.call(arguments);
    if (fn && typeof fn === "function") {
        var ret = fn.apply(fn, args);
        if (ret && typeof ret.promise === "function") {
            ret.then(function(result) {
                console.log(result);
            });
        } else {
            console.log(ret);
        }
    }
};

window.Function.prototype.bind = function() {
    var fn = this;
    var args = Array.prototype.slice.call(arguments);
    var obj = args.shift();
    return (function() {
        return (fn.apply(obj,
                args.concat(Array.prototype.slice.call(arguments))));
    });
};

// Jerene's debug function
function atos(func, args) {
    func.apply(this, args).then(
        function(retObj) {
            console.log(retObj);
        }
    );
}

// ======================== ERROR INJECTION TESTING =========================//
function getFailPercentage(funcName) {
    if (funcFailPercentage.hasOwnProperty(funcName)) {
        return (funcFailPercentage[funcName]);
    } else {
        return (defaultFuncFailPercentage);
    }
}

function insertError(argCallee, deferred) {
    if (errorInjection) {
        var functionName = argCallee.toString()
                           .substr('function '.length);
        functionName = functionName.substr(0, functionName.indexOf('('));
        var failPercent = getFailPercentage(functionName);
        if (Math.random() < failPercent) {
            // FAILED!
            var waitTime = Math.floor(Math.random() * 10000);
            console.log("WaitTime is ", waitTime, "ms");
            setTimeout(function() {
                deferred.reject(thriftLog(functionName,
                                          "Error Injection"));
            }, waitTime);
            return (true);
        }
    }
    return (false);
}

// ========================== HELPER FUNCTIONS ============================= //
function getUnsortedTableName(tableName, otherTableName) {
    var deferred = jQuery.Deferred();
    var deferred1 = XcalarGetDag(tableName);
    var parentChildMap;

    if (!otherTableName) {
        var srcTableName = tableName;
        deferred1
        .then(function(nodeArray) {
            // Check if the last one is a sort. If it is, then use the unsorted
            // one
            // If it isn't then just return the original
            if (XcalarApisTStr[nodeArray.node[0].api] === "XcalarApiIndex") {
                var indexInput = nodeArray.node[0].input.indexInput;
                if (indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingAscending ||
                    indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingDescending) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);

                    parentChildMap = Dag.getParentChildDagMap(nodeArray.node);
                    srcTableName = Dag.getDagSourceNames(parentChildMap, 0,
                                                             nodeArray.node)[0];

                    var hasReadyState = checkIfTableHasReadyState(
                                  nodeArray.node[parentChildMap[0].parents[0]]);

                    if (!hasReadyState) {
                        var newId = Authentication.getHashId().split("#")[1];
                        srcTableName = tableName.split("#")[0] + "#" + newId;
                        var key = indexInput.keyName;
                        var order = XcalarOrderingT.XcalarOrderingUnordered;
                        return (XcalarIndexFromTable(tableName, key,
                                                    srcTableName, order,
                                                    null, true));
                    } else {
                        return PromiseHelper.resolve(null);
                    }
                    console.log("Using unsorted table instead: " +
                                srcTableName);
                }
            }
            return PromiseHelper.resolve(null);
        })
        .then(function() {
            deferred.resolve(srcTableName);
        })
        .fail(deferred.reject);
    } else {
        var deferred2 = XcalarGetDag(otherTableName);
        var unsortedName1;
        var unsortedName2;
        PromiseHelper.when(deferred1, deferred2)
        .then(function(na1, na2) {
            unsortedName1 = tableName;
            unsortedName2 = otherTableName;
            var t1hasReadyState = true;
            var t2hasReadyState = true;
            var indexInput1;
            var indexInput2;
            var parentChildMap;

            if (XcalarApisTStr[na1.node[0].api] === "XcalarApiIndex") {
                indexInput1 = na1.node[0].input.indexInput;
                if (indexInput1.ordering ===
                    XcalarOrderingT.XcalarOrderingAscending ||
                    indexInput1.ordering ===
                    XcalarOrderingT.XcalarOrderingDescending) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput1.source.isTable);
                    parentChildMap = Dag.getParentChildDagMap(na1.node);
                    unsortedName1 = Dag.getDagSourceNames(parentChildMap, 0,
                                                             na1.node)[0];
                    t1hasReadyState = checkIfTableHasReadyState(
                                        na1.node[parentChildMap[0].parents[0]]);
                    console.log("Using unsorted table instead: " +
                                srcTableName);
                }
            }
            if (XcalarApisTStr[na2.node[0].api] === "XcalarApiIndex") {
                indexInput2 = na2.node[0].input.indexInput;
                if (indexInput2.ordering ===
                    XcalarOrderingT.XcalarOrderingAscending ||
                    indexInput2.ordering ===
                    XcalarOrderingT.XcalarOrderingDescending) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput2.source.isTable);
                    parentChildMap = Dag.getParentChildDagMap(na2.node);
                    unsortedName2 = Dag.getDagSourceNames(parentChildMap, 0,
                                                             na2.node)[0];
                    t2hasReadyState = checkIfTableHasReadyState(
                                       na2.node[parentChildMap[0].parents[0]]);
                    console.log("Using unsorted table instead: " +
                                srcTableName);
                }
            }
            var promise1;
            var promise2;
            var order = XcalarOrderingT.XcalarOrderingUnordered;
            if (!t1hasReadyState) {
                var newId   = Authentication.getHashId().split("#")[1];
                unsortedName1 = tableName.split("#")[0] + "#" + newId;
                var key = indexInput1.keyName;
                promise1 = XcalarIndexFromTable(tableName, key, unsortedName1,
                                                order, null, true);
            } else {
                promise1 = PromiseHelper.resolve(null);
            }
            if (!t2hasReadyState) {
                var newId   = Authentication.getHashId().split("#")[1];
                unsortedName2 = otherTableName.split("#")[0] + "#" + newId;
                var tableId = xcHelper.getTableId(otherTableName);
                var key = indexInput2.keyName;

                promise2 = XcalarIndexFromTable(oldTableName, key,
                                                unsortedName2, order, null,
                                                true);
            } else {
                promise2 = PromiseHelper.resolve(null);
            }

            return (PromiseHelper.when(promise1, promise2));
        })
        .then(function() {
            deferred.resolve(unsortedName1, unsortedName2);
        })
        .fail(deferred.reject);
    }
    return (deferred.promise());
}

function checkIfTableHasReadyState(node) {
    if (node.state !== DgDagStateT.DgDagStateReady) {
        return false;
    } else {
        return true;
    }
}

// ========================= MAIN FUNCTIONS  =============================== //
function XcalarGetVersion() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetVersion(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetVersion()", error));
    });

    return (deferred.promise());
}

function XcalarLoad(url, format, datasetName, fieldDelim, recordDelim,
                    hasHeader, moduleName, funcName, txId) {
    function checkForDatasetLoad(def, sqlString, dsName, txId) {
        // Using setInterval will have issues because of the deferred
        // GetDatasets call inside here. Do not use it.
        function checkIter(def1, sqlString1, dsName1, txId1) {
            XcalarGetDatasets(dsName1)
            .then(function(ret) {
                var loadDone = false;
                var nameNodeFound = false;
                ret = ret.datasets;
                for (var i = 0; i < ret.length; i++) {
                    if (ret[i].name === dsName1) {
                        nameNodeFound = true;
                        if (ret[i].loadIsComplete) {
                            loadDone = true;
                        } else {
                            break;
                        }
                    }
                }
                if (!nameNodeFound) {
                    // The load FAILED because the dag node is gone
                    var thriftError = thriftLog("XcalarLoad failed!");
                    def1.reject(thriftError);
                } else {
                    if (loadDone) {
                        Transaction.log(txId1, sqlString1);
                        def1.resolve();
                    } else {
                        setTimeout(checkIter.bind(null, def1, sqlString1,
                                                  dsName1, txId1), 1000);
                    }
                }
            });
        }

        setTimeout(checkIter.bind(null, def, sqlString, dsName, txId),
                   1000);
    }

    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var formatType;
    switch (format) {
        case ("JSON"):
            formatType = DfFormatTypeT.DfFormatJson;
            break;
        case ("rand"):
            formatType = DfFormatTypeT.DfFormatRandom;
            break;
        case ("raw"):
            recordDelim = "\n";
            fieldDelim = ""; // No Field delim
            // fallthrough
        case ("CSV"):
            formatType = DfFormatTypeT.DfFormatCsv;
            break;
        case ("Excel"):
            formatType = DfFormatTypeT.DfFormatCsv;
            fieldDelim = "\t";
            recordDelim = "\n";
            moduleName = "default";
            funcName = "openExcel";
            break;
        default:
            formatType = DfFormatTypeT.DfFormatUnknown;
            break;
    }

    var loadArgs = new XcalarApiDfLoadArgsT();
    loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
    loadArgs.csv.recordDelim = recordDelim;
    loadArgs.csv.fieldDelim = fieldDelim;
    loadArgs.csv.isCRLF = true;
    if (hasHeader) {
        loadArgs.csv.hasHeader = true;
    } else {
        loadArgs.csv.hasHeader = false;
    }
    if (moduleName !== "" && funcName !== "") {
        loadArgs.udfLoadArgs = new XcalarApiUdfLoadArgsT();
        loadArgs.udfLoadArgs.fullyQualifiedFnName = moduleName + ":" + funcName;
    }

    var maxSampleSize = gMaxSampleSize;
    if (gMaxSampleSize > 0) {
        console.log("Max sample size set to: "+maxSampleSize);
    }

    var workItem = xcalarLoadWorkItem(url, datasetName, formatType,
                                      maxSampleSize, loadArgs);

    var def1 = xcalarLoad(tHandle, url, datasetName, formatType, maxSampleSize,
                          loadArgs);
    var def2 = XcalarGetQuery(workItem);
    // We are using our .when instead of jQuery's because if load times out,
    // we still want to use the return for def2.
    PromiseHelper.when(def1, def2)
    .then(function(ret1, ret2) {
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        if (error1 && error1.status === 502) {
            // Thrift time out
            // Just pretend like nothing happened and quietly listDatasets
            // in intervals until the load is complete. Then do the ack/fail
            if (error2 == null) {
                // getQuery hasn't returned
                XcalarGetQuery(workItem)
                .then(function(ret) {
                    checkForDatasetLoad(deferred, ret, datasetName, txId);
                });
            } else if (typeof (error2) === "string") {
                checkForDatasetLoad(deferred, error2, datasetName, txId);
            }
        } else {
            var thriftError = thriftLog("XcalarLoad", error1, error2);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

// XXX Not tested!!
function XcalarAddODBCExportTarget(targetName, connStr, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var target = new ExExportTargetT();
    var specInput = new ExAddTargetSpecificInputT();
    target.name = targetName;
    target.type = ExTargetTypeT.ExTargetODBCType;
    specInput.odbcInput = new ExAddTargetODBCInputT();
    specInput.odbcInput.connectionString = connStr;

    var workItem = xcalarAddExportTargetWorkItem(target, specInput);
    var def1 = xcalarAddExportTarget(tHandle, target, specInput);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // XXX Add sql for this thing
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddODBCExportTarget", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// XXX: Not tested
function XcalarAddLocalFSExportTarget(targetName, path, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var target = new ExExportTargetT();
    var specInput = new ExAddTargetSpecificInputT();
    target.name = targetName;
    target.type = ExTargetTypeT.ExTargetSFType;
    specInput.sfInput = new ExAddTargetSFInputT();
    specInput.sfInput.url = path;

    var workItem = xcalarAddExportTargetWorkItem(target, specInput);
    var def1 = xcalarAddExportTarget(tHandle, target, specInput);
    // var def2 = XcalarGetQuery(workItem);
    var def2 = jQuery.Deferred().resolve().promise();
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // XXX Add sql for this thing
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddExportTarget", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarListExportTargets(typePattern, namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var workItem = xcalarListExportTargetsWorkItem(typePattern, namePattern);
    var def1 = xcalarListExportTargets(tHandle, typePattern, namePattern);
    // var def2 = XcalarGetQuery(workItem);
    var def2 = jQuery.Deferred().resolve().promise();
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListExportTargets", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarExport(tableName, exportName, targetName, numColumns,
                      backColName, frontColName, keepOrder, options, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var target = new ExExportTargetHdrT();
    target.type = ExTargetTypeT.ExTargetUnknownType;
    target.name = targetName;
    var specInput = new ExInitExportSpecificInputT();
    XcalarListExportTargets("*", targetName)
    .then(function(out) {
        if (out.numTargets < 1) {
            console.error("Export target does not exist!");
            deferred.reject(thriftLog("XcalarExport", "Export target is not" +
                            " on the target list"));
            return;
        }
        for (var i = 0; i < out.targets.length; i++) {
            if (out.targets[i].hdr.name === targetName) {
                target.type = out.targets[i].hdr.type;
                break;
            }
        }
        if (target.type === ExTargetTypeT.ExTargetUnknownType) {
            deferred.reject(thriftLog("XcalarExport", "Export target is not" +
                            " on the target list"));
            return;
        }
        switch (target.type) {
            case (ExTargetTypeT.ExTargetODBCType):
                specInput.odbcInput = new ExInitExportODBCInputT();
                specInput.odbcInput.tableName = exportName;
                break;
            case (ExTargetTypeT.ExTargetSFType):
                // XX this is not a good check, fix later
                if (options.splitType == null || options.headerType == null ||
                    options.format == null) {
                    deferred.reject(thriftLog("XcalarExport"),
                                              'Not all options were declared');
                    return;
                }
                specInput.sfInput = new ExInitExportSFInputT();
                specInput.sfInput.splitRule = new ExSFFileSplitRuleT();
                specInput.sfInput.splitRule.type = options.splitType;
                specInput.sfInput.headerType = options.headerType;
                specInput.sfInput.format = options.format;
                specInput.sfInput.formatArgs = new
                                            ExInitExportFormatSpecificArgsT();
                if (options.format === DfFormatTypeT.DfFormatCsv) {
                    exportName += ".csv";
                    specInput.sfInput.fileName = exportName;
                    specInput.sfInput.formatArgs.csv = new ExInitExportCSVArgsT();
                    specInput.sfInput.formatArgs.csv.fieldDelim = gExportFDelim;
                    specInput.sfInput.formatArgs.csv.recordDelim = gExportRDelim;
                } else if (options.format === DfFormatTypeT.DfFormatSql) {
                    exportName += ".sql";
                    specInput.sfInput.fileName = exportName;
                    specInput.sfInput.formatArgs.sql = new ExInitExportSQLArgsT();
                    specInput.sfInput.formatArgs.sql.tableName = exportName;
                    specInput.sfInput.formatArgs.sql.createTable = true;
                    if (options.createRule === ExExportCreateRuleT.ExExportCreateOnly) {
                        specInput.sfInput.formatArgs.sql.dropTable = false;
                    } else {
                        specInput.sfInput.formatArgs.sql.dropTable = true;
                    }
                } else {
                    deferred.reject(thriftLog("XcalarExport"),
                                                "Invalid export type");
                }

                break;
            default:
                deferred.reject(thriftLog("XcalarExport"));
                break;
        }
        var columns = [];
        for (var i = 0; i < backColName.length; i++) {
            var colNameObj = new ExColumnNameT();
            colNameObj.name = backColName[i];
            colNameObj.headerAlias = frontColName[i];
            columns.push(colNameObj);
        }

        var workItem = xcalarExportWorkItem(tableName, target, specInput,
                                  options.createRule, keepOrder, numColumns,
                                  columns);
        var def1 = xcalarExport(tHandle, tableName, target, specInput,
                                options.createRule, keepOrder, numColumns,
                                columns);
        // var def2 = XcalarGetQuery(workItem);
        var def2 = jQuery.Deferred().resolve().promise();
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarExport", error);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarDestroyDataset(dsName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }


    dsName = parseDS(dsName);
    var workItem = xcalarDeleteDagNodesWorkItem(dsName,
                                                SourceTypeT.SrcDataset);
    var def1 = xcalarDeleteDagNodes(tHandle, dsName, SourceTypeT.SrcDataset);
    var def2 = XcalarGetQuery(workItem);

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDestroyDataset", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarIndexFromDataset(datasetName, key, tablename, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    datasetName = parseDS(datasetName);
    var dhtName = ""; // XXX TODO fill in later
    // XXX TRUE IS WRONG, THIS IS JUST TEMPORARY TO GET STUFF TO WORK
    var workItem = xcalarIndexDatasetWorkItem(datasetName, key, tablename,
                                              dhtName,
                                      XcalarOrderingT.XcalarOrderingUnordered);
    var def1 = xcalarIndexDataset(tHandle, datasetName, key, tablename,
                                  dhtName,
                                  XcalarOrderingT.XcalarOrderingUnordered);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarIndexFromDataset", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarIndexFromTable(srcTablename, key, tablename, ordering,
                              txId, unsorted) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var dhtName = ""; // XXX TODO fill in later
    var promise;
    if (unsorted) {
        promise = PromiseHelper.resolve(srcTablename);
    } else {
        promise = getUnsortedTableName(srcTablename);
    }
    promise
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarIndexTableWorkItem(unsortedSrcTablename, tablename,
                                                key, dhtName, ordering);

        var def1 = xcalarIndexTable(tHandle, unsortedSrcTablename, key,
                                    tablename, dhtName, ordering);
        var def2 = XcalarGetQuery(workItem);

        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            if (!unsorted) {
                Transaction.log(txId, ret2);
            }
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarIndexFromTable", error1, error2);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarDeleteTable(tableName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarDeleteDagNodesWorkItem(tableName,
                                                SourceTypeT.SrcTable);
    var def1 = xcalarDeleteDagNodes(tHandle, tableName,
                                    SourceTypeT.SrcTable);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDeleteTable", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarRenameTable(oldTableName, newTableName, txId) {
    if (tHandle == null || oldTableName == null || oldTableName === "" ||
        newTableName == null || newTableName === "") {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarRenameNodeWorkItem(oldTableName, newTableName);
    var def1 = xcalarRenameNode(tHandle, oldTableName, newTableName);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarRenameTable", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarSample(datasetName, numEntries) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var totalEntries = 0;
    XcalarMakeResultSetFromDataset(datasetName)
    .then(function(result) {
        // console.log(result);
        var resultSetId = result.resultSetId;
        totalEntries = result.numEntries;
        gDatasetBrowserResultSetId = resultSetId;
        if (totalEntries === 0) {
            return (deferred.resolve());
        } else {
            return (XcalarGetNextPage(resultSetId, numEntries));
        }
    })
    .then(function(tableOfEntries) {
        deferred.resolve(tableOfEntries, totalEntries, gDatasetBrowserResultSetId);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSample", error);
        SQL.errorLog("Sample Table", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// Not being called. We just use make result set's output
function XcalarGetDatasetCount(dsName) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        xcalarGetDatasetCount(tHandle, dsName)
        .then(function(countOutput) {
            var totEntries = 0;
            var numNodes = countOutput.numCounts;
            for (var i = 0; i < numNodes; i++) {
                totEntries += countOutput.counts[i];
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarGetDatasetCount", error);
            SQL.errorLog("Get Dataset Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
}

// Not being called. We just use make result set's output
function XcalarGetTableCount(tableName) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        xcalarGetTableCount(tHandle, tableName)
        .then(function(countOutput) {
            var totEntries = 0;
            var numNodes = countOutput.numCounts;
            for (var i = 0; i < numNodes; i++) {
                totEntries += countOutput.counts[i];
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarGetTableCount", error);
            SQL.errorLog("Get Table Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
}

function XcalarGetDatasets() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListDatasets(tHandle)
    .then(function(listDatasetsOutput) {
        var prefixIndex = ".XcalarDS.".length;
        listDatasetsOutput.datasets =
            listDatasetsOutput.datasets.filter(function(d) {
            if (d.name.indexOf(".XcalarLRQ.") === 0) {
                return (false);
            }
            return (true);
        });

        var datasets = listDatasetsOutput.datasets;
        listDatasetsOutput.numDatasets = datasets.length;
        var len = listDatasetsOutput.numDatasets;

        for (var i = 0; i < len; i++) {
            datasets[i].name = datasets[i].name.substring(prefixIndex);
        }
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasets", error);
        SQL.errorLog("Get Datasets", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGetTables(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var patternMatch;

    if (tableName == null) {
        patternMatch = "*";
    } else {
        patternMatch = tableName;
    }
    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcTable)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetTables", error);
        SQL.errorLog("Get Tables", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarShutdown(force) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    if (force == null) {
        force = false;
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarShutdown(tHandle, force)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarShutdown", error);
        SQL.errorLog("Shutdown Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarStartNodes(numNodes) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarStartNodes(tHandle, numNodes)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarStartNodes", error);
        SQL.errorLog("Start Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetStats(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarGetStats(tHandle, nodeId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetStats", error);
        SQL.errorLog("Get Stats", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGetTableRefCount(tableName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetTableRefCount(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetTableRefCount", error);
        SQL.errorLog("GetTable Ref Count", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarMakeResultSetFromTable(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarMakeResultSetFromTable(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeResultSetFromTable", error);
        SQL.errorLog("MakeResultSetFromTable", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarMakeResultSetFromDataset(datasetName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeResultSetFromDataset", error);
        SQL.errorLog("MakeResultSetFromDataset", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());

}

function XcalarSetAbsolute(resultSetId, position) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetAbsolute(tHandle, resultSetId, position)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetAbsolute", error);
        SQL.errorLog("Set Absolute", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGetNextPage(resultSetId, numEntries) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetNext(tHandle, resultSetId, numEntries)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetNextPage", error);
        SQL.errorLog("Get Next Page", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarSetFree(resultSetId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarFreeResultSet(tHandle, resultSetId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetFree", error);
        SQL.errorLog("Set Free", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function generateFilterString(operator, value1, value2, value3) {
    var filterStr = "";
    //XX change this so it accepts any number of values
    switch (operator) {
        case ("Greater Than"):
            filterStr = "gt(" + value1 + ", " + value2 + ")";
            break;
        case ("Greater Than Equal To"):
            filterStr = "ge(" + value1 + ", " + value2 + ")";
            break;
        case ("Equals"):
            filterStr = "eq(" + value1 + ", " + value2 + ")";
             break;
        case ("Less Than"):
            filterStr = "lt(" + value1 + ", " + value2 + ")";
            break;
        case ("Less Than Equal To"):
            filterStr = "le(" + value1 + ", " + value2 + ")";
            break;
        case ("Exclude number"):
            filterStr = "not(eq(" + value1 + ", " + value2 + "))";
            break;
        case ("Exclude string"):
            filterStr = "not(like(" + value1 + ', "' + value2 + '"))';
            break;
        case ("regex"):
            filterStr = "regex(" + value1 + ', "' + value2 + '")';
            break;
        case ("like"):
            filterStr = "like(" + value1 + ', "' + value2 + '")';
            break;
        case ("Custom"):
            filterStr = value1;
            break;
        default:
            if (value3 != null) {
                filterStr = operator + "(" + value1 + ", " + value2 +
                            ", " + value3 + ")";
            } else if (value2 == null) {
                filterStr = operator + "(" + value1 + ")";
            } else {
                filterStr = operator + '(' + value1 + ', ' + value2 + ')';
            }
            break;
    }

    return (filterStr);
}

function XcalarFilter(evalStr, srcTablename, dstTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (evalStr === "") {
        console.error("Unknown op " + evalStr);
        deferred.reject("Unknown op " + evalStr);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen)
    {
        deferred.reject(thriftLog("XcalarFilter", "Eval string too long"));
        return (deferred.promise());
    }
    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarFilterWorkItem(unsortedSrcTablename, dstTablename,
                                            evalStr);

        var def1 = xcalarFilter(tHandle, evalStr, unsortedSrcTablename,
                                dstTablename);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarFilter", error1, error2);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename,
                   txId, doNotUnsort) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    var d;
    if (!doNotUnsort) {
        d = getUnsortedTableName(srcTablename);
    } else {
        d = jQuery.Deferred().resolve(srcTablename).promise();
        console.log("Using SORTED table for windowing!");
    }
    d
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarApiMapWorkItem(evalStr, unsortedSrcTablename,
                                            dstTablename, newFieldName);

        var def1 = xcalarApiMap(tHandle, newFieldName, evalStr,
                                unsortedSrcTablename, dstTablename);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarMap", error1, error2);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function generateAggregateString(fieldName, op) {
    var evalStr = "";

    switch (op) {
        case (AggrOp.Max):
            evalStr += "max(";
            break;
        case (AggrOp.Min):
            evalStr += "min(";
            break;
        case (AggrOp.Avg):
            evalStr += "avg(";
            break;
        case (AggrOp.Count):
            evalStr += "count(";
            break;
        case (AggrOp.Sum):
            evalStr += "sum(";
            break;
        // The following functions are not being called yet! GUI-1155
        case (AggrOp.MaxInteger): // Feel free to change these
            evalStr += "maxInteger(";
            break;
        case (AggrOp.MinInteger):
            evalStr += "minInteger(";
            break;
        case (AggrOp.SumInteger):
            evalStr += "sumInteger(";
            break;
        default:
            console.log("bug!:" + op);
    }

    evalStr += fieldName;
    evalStr += ")";
    return (evalStr);
}

function XcalarAggregate(evalStr, srcTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (evalStr === "") {
        deferred.reject("bug!:" + op);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStirngLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    var dstDagName = srcTablename.split("#")[0] + "-aggregate" +
                     Authentication.getHashId();

    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarAggregateWorkItem(unsortedSrcTablename,
                                               dstDagName, evalStr);

        var def1 = xcalarAggregate(tHandle, unsortedSrcTablename, dstDagName,
                                   evalStr);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1, dstDagName);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarAggregate", error1, error2);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarJoin(left, right, dst, joinType, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    getUnsortedTableName(left, right)
    .then(function(unsortedLeft, unsortedRight) {
        var workItem = xcalarJoinWorkItem(unsortedLeft, unsortedRight, dst,
                                          joinType);
        var def1 = xcalarJoin(tHandle, unsortedLeft, unsortedRight, dst,
                              joinType);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarJoin", error1, error2);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName, incSample, txId) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var evalStr = generateAggregateString(oldColName, operator);
    if (evalStr === "") {
        deferred.reject("Wrong operator! " + operator);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
        deferred.reject(thriftLog("XcalarGroupBy", "Eval string too long"));
        return (deferred.promise());
    }
    getUnsortedTableName(tableName)
    .then(function(unsortedTableName) {
        var workItem = xcalarGroupByWorkItem(unsortedTableName, newTableName,
                                             evalStr, newColName, incSample);
        var def1 = xcalarGroupBy(tHandle, unsortedTableName, newTableName,
                                 evalStr, newColName, incSample);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarGroupBy", error1, error2);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarProject(columns, tableName, dstTableName, txId) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    getUnsortedTableName(tableName)
    .then(function(unsortedTableName) {
        var workItem = xcalarProjectWorkItem(columns.length, columns,
                                             unsortedTableName, dstTableName);
        var def1 = xcalarProject(tHandle, columns.length, columns,
                                 unsortedTableName, dstTableName);
        var def2 = XcalarGetQuery(workItem); // XXX May not work? Have't tested
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarProject", error1, error2);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarGenRowNum(srcTableName, dstTableName, newFieldName, txId) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    // DO NOT GET THE UNSORTED TABLE NAMEEE! We actually want the sorted order
    var workItem = xcalarApiGetRowNumWorkItem(srcTableName, dstTableName,
                                              newFieldName);
    var def1 = xcalarApiGetRowNum(tHandle, newFieldName, srcTableName,
                                  dstTableName);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // XXX This part doesn't work yet
        Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarGenRowNum", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

// PSA!!! This place does not check for unsorted table. So the caller
// must make sure that the first table that is being passed into XcalarQuery
// is an unsorted table! Otherwise backend may crash
function XcalarQuery(queryName, queryString) {
    // XXX Now only have a simple output
    /* some test case :
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"

    */
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQuery(tHandle, queryName, queryString, true)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQuery", error);
        SQL.errorLog("XcalarQuery", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarQueryState(queryName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryState(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQueryState", error);
        SQL.errorLog("XcalarQueryState", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarQueryCheck(queryName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var checkTime = 1000; // 1s per check
    var timer = setInterval(function() {
        XcalarQueryState(queryName)
        .then(function(queryStateOutput) {
            var state = queryStateOutput.queryState;
            if (state === QueryStateT.qrFinished) {
                clearInterval(timer);
                deferred.resolve(queryStateOutput);
            } else if (state === QueryStateT.qrError) {
                clearInterval(timer);
                deferred.reject(queryStateOutput);
            }
        })
        .fail(function(error) {
            clearInterval(timer);
            deferred.reject(error);
        });
    }, checkTime);

    return (deferred.promise());
}

function XcalarQueryWithCheck(queryName, queryString) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    XcalarQuery(queryName, queryString)
    .then(function() {
        return (XcalarQueryCheck(queryName));
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return (deferred.promise());
}

function XcalarCancelOp(dstTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiCancelOp(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarCancelOp", error);
        SQL.errorLog("Cancel Op", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());

}

function XcalarGetDag(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDag(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDag", error);
        SQL.errorLog("Get Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarListFiles(url) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListFiles(tHandle, url)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListFiles", error);
        SQL.errorLog("List Files", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// XXX TODO THIS NEEDS TO HAVE A SQL.ADD
// This tableArray is an array of structs.
// Each struct is of the form: numColumns, tableName, columnNames
// TableName is of the form namedInput columnNames is just an array of strings
// that correspond to the column names
// If you have 2 DFs in your DFG, put the last table of both DFs into the
// tableArray
// When you call makeRetina, we duplicate the DAG, append an export DAG node,
// and give it all new DagNodeIds. So when you call updateRetina, make sure to
// pass in the DagNodeIds that are part of this new Retina instead of the
// original DAG
function XcalarMakeRetina(retName, tableArray, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1 ||
        retName === "" || retName == null ||
        tableArray == null || tableArray.length <= 0)
    {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarMakeRetinaWorkItem(retName, tableArray);
    var def1 = xcalarMakeRetina(tHandle, retName, tableArray);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarMakeRetina", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarListRetinas() {
    // XXX This function is wrong because it does not take in a tablename even
    // though it should. Hence we just assume that all retinas belong to the
    // leftmost table.
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListRetinas(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListRetinas", error);
        SQL.errorLog("List Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetRetina(retName) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetRetina", error);
        SQL.errorLog("Get Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// XXX TODO THIS NEEDS TO HAVE SQL.ADD

// paramType must be either of the following:
// XcalarApisT.XcalarApiBulkLoad,
// XcalarApisT.XcalarApiFilter,
// XcalarApisT.XcalarApiExport

// paramValue is what the parameterized part is called
// For example, in load, the datasetUrl is parameterizable, and your url can
// be something like "file:///<directory>/<subDir>/file<number>.csv" <- paramValue
// For eval string, you will pass in something like "filter(gt(column1, \"hello\""))"
// replaced with "filter(<opera>(<colName>, <val>))"
// val = \"hello\"
// <argument> is used to denote a parameter
function XcalarUpdateRetina(retName, dagNodeId, paramType, paramValue, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var workItem = xcalarUpdateRetinaWorkItem(retName, dagNodeId, paramType,
                                              paramValue);
    var def1 = xcalarUpdateRetina(tHandle, retName, dagNodeId, paramType,
                                  paramValue);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = xcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarUpdateRetina", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// XXX TODO SQL.ADD
// param has 2 string values: param.parameterName, param.parameterValue
// params is an array of param.
// For example, if my paramValue was "filter(<opera>(<colName>, <val>))"
// then, params = [{"parameterName":"opera", "parameterValue":"lt"},
// {"pN":"colName", "pV":"column5"}, {, "pV":"\"hello\""}]
function XcalarExecuteRetina(retName, params, txId) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var workItem = xcalarExecuteRetinaWorkItem(retName, params);
    var def1 = xcalarExecuteRetina(tHandle, retName, params);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = xcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarExecuteRetina", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarListParametersInRetina(retName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListParametersInRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListParametersInRetina", error);
        SQL.errorLog("ListParametersInRetina", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDeleteRetina(retName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarApiDeleteRetinaWorkItem(retName);
    var def1 = xcalarApiDeleteRetina(tHandle, retName);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = XcalarGetQuery(workItem);

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarApiDeleteRetina", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDeleteSched(schedName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarDeleteSchedTaskWorkItem(schedName);
    var def1 = xcalarDeleteSchedTask(tHandle, schedName);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDeleteSchedule", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// SchedInSec means number of seconds after schedule call is issued to run first
// iteration of schedule
// period means time in seconds between two runs
// recurCount means number of times to run this schedule
// type has only one possible parameter StQuery. This field is for future use
// arg is of type executeRetinaInputT, which has fields: retinaName, numParameters,
// and array of parameters
// struct XcalarApiExecuteRetinaInputT {
//  1: string retinaName
//  2: i64 numParameters
//  3: list<XcalarApiParameterT> parameters
// }
function XcalarCreateSched(schedName, schedInSec, period, recurCount, type, arg,
                           txId)
{
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarScheduleTaskWorkItem(schedName, schedInSec, period,
                                              recurCount, type, arg);
    var def1 = xcalarScheduleTask(tHandle, schedName, schedInSec, period,
                                  recurCount, type, arg);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = xcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // Transaction.log(txId, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarCreateSchedule", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// namePattern is just thge star based naming pattern that we use
function XcalarListSchedules(namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListSchedTask(tHandle, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        // TODO Handle 286 aka table or dataset not found aka no schedules
        var thriftError = thriftLog("XcalarListSchedule", error);
        SQL.errorLog("List Schedule", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarKeyLookup(key, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyLookup(tHandle, scope, key)
    .then(deferred.resolve)
    .fail(function(error) {
        // it's normal to find an unexisted key.
        if (error === StatusT.StatusKvEntryNotFound) {
            console.warn("Status", error, "Key, not found");
            deferred.resolve(null);
        } else if (error === StatusT.StatusKvStoreNotFound) {
            console.warn("Stataus", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            var thriftError = thriftLog("XcalarKeyLookup", error);
            SQL.errorLog("Key Lookup", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeyPut(key, value, persist, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (persist == null) {
        persist = false;
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyAddOrReplace(tHandle, scope, key, value, persist)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyPut", error);
        SQL.errorLog("Key Put", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarKeyDelete(key, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyDelete(tHandle, scope, key)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyDelete", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve();
        } else if (error === StatusT.StatusKvStoreNotFound) {
            console.warn("Stataus", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            SQL.errorLog("Key Delete", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeySetIfEqual(scope, persist, keyCompare, oldValue, newValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeySetIfEqual(tHandle, scope, persist, keyCompare, oldValue, newValue)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeySetIfEqual", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve(null);
        } else if (error === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            SQL.errorLog("Key Set If Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeySetBothIfEqual(scope, persist, keyCompare, oldValue, newValue,
                                 otherKey, otherValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeySetIfEqual(tHandle, scope, persist, keyCompare, oldValue, newValue,
                        otherKey, otherValue)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeySetBothIfEqual", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve();
        } else if (error === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            SQL.errorLog("Key Set If Both Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());

}

function XcalarKeyAppend(key, stuffToAppend, persist, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyAppend(tHandle, scope, key, stuffToAppend)
    .then(deferred.resolve)
    .fail(function(error) {
        if (error === StatusT.StatusKvEntryNotFound ||
            error === StatusT.StatusKvStoreNotFound)
        {
            console.info("Append fails as key or kvStore not found, put key instead");
            // if append fails because key not found, put value instead
            xcalarKeyAddOrReplace(tHandle, scope, key, stuffToAppend, persist)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            var thriftError = thriftLog("XcalarKeyAppend", error);
            SQL.errorLog("Key Append", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarGetStats(numNodes) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    // XXX This is fako hacked up random code

    var nodeStruct = [];
    for (var i = 0; i < numNodes; i++) {
        nodeStruct[i] = {};

        var totFlash = Math.floor(Math.random() * 1000) * GB;
        var usedFlash = Math.floor(Math.random() * totFlash);
        var totDisk = Math.floor(Math.random() * 30 * 1000) * GB;
        var usedDisk = Math.floor(Math.random() * totDisk);
        nodeStruct[i].totFlash = totFlash;
        nodeStruct[i].usedFlash = usedFlash;
        nodeStruct[i].totDisk = totDisk;
        nodeStruct[i].usedDisk = usedDisk;
    }
    return (deferred.resolve(nodeStruct));
}

function XcalarGetOpStats(dstTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetOpStats(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetOpStats", error);
        SQL.errorLog("XcalarGetOpStats", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarApiTop(measureIntervalInMs) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiTop(tHandle, XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiTop", error);
        SQL.errorLog("XcalarApiTop", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarListXdfs(fnNamePattern, categoryPattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiListXdfs(tHandle, fnNamePattern, categoryPattern)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListXdf", error);
        SQL.errorLog("List Xdf", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarUploadPython(moduleName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiUdfAdd(tHandle, UdfTypeT.UdfTypePython, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error, errorStruct) {
        if (error && jQuery.isNumeric(error)) {
            if (error === StatusT.StatusUdfModuleAlreadyExists) {
                XcalarUpdatePython(moduleName, pythonStr)
                .then(function() {
                    deferred.resolve();
                })
                .fail(function(error2, errorStuct2) {
                    if (errorStruct2 && errorStruct2.error.message.length > 0) {
                        error2 = errorStruct2.error.message;
                    }
                    var thriftError = thriftLog("XcalarUpdateAfterUpload",
                                      error2);
                    SQL.errorLog("Update of Upload Python", null, null,
                                 thriftError);
                    deferred.reject(thriftError);
                });
                return;
                // here do the update call
            } else if (error === StatusT.StatusUdfModuleEmpty) {
                // This is not an error because extensions may upload
                // empty udfs. So just go ahead and resolve
                deferred.resolve();
                return;
            }
        }

        // all other case

        if (errorStruct && errorStruct.error.message.length > 0) {
            error = errorStruct.error.message;
        }
        var thriftError = thriftLog("XcalarUploadPython", error);
        SQL.errorLog("Upload Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarUpdatePython(moduleName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiUdfUpdate(tHandle, UdfTypeT.UdfTypePython, moduleName,
                       pythonStr)
    .then(deferred.resolve)
    .fail(function(error, errorStruct) {
        if (errorStruct && errorStruct.error.message.length > 0) {
            error = errorStruct.error.message;
        }

        var thriftError = thriftLog("XcalarUpdatePython", error);
        SQL.errorLog("Update Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDeletePython(moduleName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiUdfDelete(tHandle, moduleName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeletePython", error);
        SQL.errorLog("Delete Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDownloadPython(moduleName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiUdfGet(tHandle, moduleName)
    .then(function(output) {
        deferred.resolve(output.source);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDownloadPython", error);
        SQL.errorLog("Download Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarMemory() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiMemory(tHandle, null)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMemory", error);
        SQL.errorLog("XcalarMemory", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetQuery(workItem) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarApiGetQuery(tHandle, workItem)
    .then(function(output) {
        deferred.resolve(output.query);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetQuery", error));
    });
    return (deferred.promise());
}

function XcalarNewWorkbook(newWorkbookName, isCopy, copyFromWhichWorkbook) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionNew(tHandle, newWorkbookName, isCopy,
                        copyFromWhichWorkbook)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarNewWorkbook", error);
        SQL.errorLog("New Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDeleteWorkbook(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionDelete(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeleteWorkbook", error);
        SQL.errorLog("Delete Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarInActiveWorkbook(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionInact(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarInActiveWorkbook", error);
        SQL.errorLog("InActive Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarListWorkbooks(pattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionList(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListWorkbooks", error);
        SQL.errorLog("List Workbooks", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarSaveWorkbooks(pattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionPersist(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSaveWorkbooks", error);
        SQL.errorLog("Save Workbooks", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarSwitchToWorkbook(toWhichWorkbook, fromWhichWorkbook) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionSwitch(tHandle, toWhichWorkbook, fromWhichWorkbook)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSwitchToWorkbook", error);
        SQL.errorLog("Switch Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarRenameWorkbook(newName, oldName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionRename(tHandle, newName, oldName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarRenameWorkbook", error);
        SQL.errorLog("Rename Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// XXX Currently this function does nothing. Ask Ken for more details
function XcalarSupportGenerate() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    xcalarApiSupportGenerate(tHandle)
    .then(function(ret) {
        deferred.resolve(ret.bundlePath, ret.supportId);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSupportGenerate", error);
        SQL.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

