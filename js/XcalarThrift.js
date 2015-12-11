var tHandle;

function setupThrift() {
    setupHostName();
    tHandle = xcalarConnectThrift(hostname, portNumber.toString());
}

function setupHostName() {
    if (hostname == null || hostname === "") {
        var url = window.location.href;
        var lastBackSlash = url.lastIndexOf("/");
        url = url.substring(0, lastBackSlash);
        // XXX when backend support the split of "http://"("https://"),
        // we do not need the following code
        hostname = url.split("http://")[1];
    }
}
// for convenience, add the function list here and make them
// comment in deafult
var funcFailPercentage = {
    // "XcalarGetDatasets": -1,
    // "XcalarGetTables": -1
};
var defaultFuncFailPercentage = 0.5;
var errorInjection = false;

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
        console.error(msg);

        errorLists.push(thriftError);

        var alertError;
        if (status === StatusT.StatusConnReset) {
            // This is bad, connection was lost so UI cannot do anything
            // LOCK THE SCREEN
            alertError = {"error": "Connection could not be established."};
            Alert.error("Connection error", alertError, {"lockScreen": true});

            return thriftError;
        } else if (status === StatusT.StatusNoMem) {
            // This is bad, out of memory so UI cannot do anything
            // LOCK THE SCREEN
            alertError = {"error": "Out of Memory."};
            Alert.error("Error", alertError, {"lockScreen": true});

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

function chain(funcs) {
    if (!funcs || 
        !Array.isArray(funcs) ||
        typeof funcs[0] !== "function") {
        return promiseWrapper(null);
    }
    var head = funcs[0]();
    for (var i = 1; i < funcs.length; i++) {
        head = head.then(funcs[i]);
    }
    return (head);
}

// Jerene's debug function
function atos(func, args) {                                               
    func.apply(this, args).then(
        function(retObj) {
            console.log(retObj);
        }
    );
}

function promiseWrapper(value) {
    var deferred = jQuery.Deferred();
    deferred.resolve(value);
    return (deferred.promise());
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
    if (!otherTableName) {
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
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    deferred.resolve(indexInput.source.name);
                    return;
                }
            }
            deferred.resolve(tableName);
        })
        .fail(deferred.reject);
    } else {
        var deferred2 = XcalarGetDag(otherTableName);
        xcHelper.when(deferred1, deferred2)
        .then(function(na1, na2) {
            var unsortedName1 = tableName;
            var unsortedName2 = otherTableName;
            var indexInput;

            if (XcalarApisTStr[na1.node[0].api] === "XcalarApiIndex") {
                indexInput = na1.node[0].input.indexInput;
                if (indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingAscending ||
                    indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingDescending) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    unsortedName1 = indexInput.source.name;
                }
            }
            if (XcalarApisTStr[na2.node[0].api] === "XcalarApiIndex") {
                indexInput = na2.node[0].input.indexInput;
                if (indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingAscending ||
                    indexInput.ordering ===
                    XcalarOrderingT.XcalarOrderingDescending) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    unsortedName2 = indexInput.source.name;
                }
            }
            deferred.resolve(unsortedName1, unsortedName2);
        })
        .fail(deferred.reject);
    }
    return (deferred.promise());
}

// ========================= MAIN FUNCTIONS  =============================== //
function XcalarGetVersion() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
                    hasHeader, moduleName, funcName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        loadArgs.pyLoadArgs = new XcalarApiPyLoadArgsT();
        loadArgs.pyLoadArgs.fullyQualifiedFnName = moduleName + ":" + funcName;
    }

    var workItem = xcalarLoadWorkItem(url, datasetName, formatType, 0,
                                      loadArgs);

    var def1 = xcalarLoad(tHandle, url, datasetName, formatType, 0, loadArgs);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Load Dataset", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarLoad", error1, error2);
        SQL.errorLog("Load Dataset", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarAddODBCExportTarget(targetName, connStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var target = new DsExportTargetT();
    var specInput = new DsAddTargetSpecificInputT();
    target.name = targetName;
    target.type = DsTargetTypeT.DsTargetODBCType;
    specInput.odbcInput = new DsAddTargetODBCInputT();
    specInput.odbcInput.connectionString = connStr;
         
    var workItem = xcalarAddExportTargetWorkItem(target, specInput);
    var def1 = xcalarAddExportTarget(tHandle, target, specInput);
    var def2 = jQuery.Deferred().resolve().promise();
    // var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // XXX Add sql for this thing
        // SQL.add("Add Export Target", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddExportTarget", error);
        // SQL.errorLog("Add Export Target", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarAddLocalFSExportTarget(targetName, path) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var target = new DsExportTargetT();
    var specInput = new DsAddTargetSpecificInputT();
    target.name = targetName;
    target.type = DsTargetTypeT.DsTargetSFType;
    specInput.sfInput = new DsAddTargetSFInputT();
    specInput.sfInput.url = path;
         
    var workItem = xcalarAddExportTargetWorkItem(target, specInput);
    var def1 = xcalarAddExportTarget(tHandle, target, specInput);
    // var def2 = XcalarGetQuery(workItem);
    var def2 = jQuery.Deferred().resolve().promise();
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        // XXX Add sql for this thing
        // SQL.add("Add Export Target", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddExportTarget", error);
        // SQL.errorLog("Add Export Target", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarListExportTargets(typePattern, namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        // XXX Add sql for this thing
        // SQL.add("List Export Targets", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListExportTargets", error);
        // SQL.errorLog("Add Export Target", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarExport(tableName, exportName, targetName, numColumns, columns, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var target = new DsExportTargetT();
    target.type = DsTargetTypeT.DsTargetUnknownType;
    target.name = targetName;
    var specInput = new DsInitExportSpecificInputT();
    XcalarListExportTargets("*", targetName)
    .then(function(out) {
        if (out.numTargets < 1) {
            console.error("Export target does not exist!");
            deferred.reject(thriftLog("XcalarExport", "Export target is not" +
                            " on the target list"));
            return;
        }
        for (var i = 0; i < out.targets.length; i++) {
            if (out.targets[i].name === targetName) {
                target.type = out.targets[i].type;
                break;
            }
        }
        if (target.type === DsTargetTypeT.DsTargetUnknownType) {
            deferred.reject(thriftLog("XcalarExport", "Export target is not" +
                            " on the target list"));
            return;
        }
        switch (target.type) {
            case (DsTargetTypeT.DsTargetODBCType):
                specInput.odbcInput = new DsInitExportODBCInputT();
                specInput.odbcInput.tableName = exportName;
                break;
            case (DsTargetTypeT.DsTargetSFType):
                specInput.sfInput = new DsInitExportSFInputT();
                specInput.sfInput.fileName = exportName + ".csv";
                specInput.sfInput.format = DfFormatTypeT.DfFormatCsv;
                specInput.sfInput.formatArgs = new
                                            DsInitExportFormatSpecificArgsT();
                specInput.sfInput.formatArgs.csv = new DsInitExportCSVArgsT();
                specInput.sfInput.formatArgs.csv.fieldDelim = ",";
                specInput.sfInput.formatArgs.csv.recordDelim = "\n";
                break;
            default:
                deferred.reject(thriftLog("XcalarExport"));
                break;
        }
        var workItem = xcalarExportWorkItem(tableName, target, specInput,
                                  DsExportCreateRuleT.DsExportCreateOnly,
                                            columns.length, columns);
        var def1 = xcalarExport(tHandle, tableName, target, specInput,
                                DsExportCreateRuleT.DsExportCreateOnly,
                                numColumns, columns);
        var def2 = XcalarGetQuery(workItem);
        // var def2 = jQuery.Deferred().resolve().promise();
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            SQL.add("Export Table", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarExport", error);
            SQL.errorLog("Add Export Target", sqlOptions, null, thriftError);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarDestroyDataset(dsName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        SQL.add("Destroy Dataset", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDestroyDataset", error1, error2);
        SQL.errorLog("Destroy Dataset", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarIndexFromDataset(datasetName, key, tablename, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        SQL.add("Index Dataset", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarIndexFromDataset", error1, error2);
        SQL.errorLog("Index Dataset", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarIndexFromTable(srcTablename, key, tablename, ordering, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var dhtName = ""; // XXX TODO fill in later
    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarIndexTableWorkItem(unsortedSrcTablename, tablename,
                                                key, dhtName, ordering);
    
        var def1 = xcalarIndexTable(tHandle, unsortedSrcTablename, key,
                                    tablename, dhtName, ordering);
        var def2 = XcalarGetQuery(workItem);

        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            if (ordering !== XcalarOrderingT.XcalarOrderingUnordered) {
                // XXX TODO: Add sort asc or desc
                SQL.add("Sort Table", sqlOptions, ret2);
            } else {
                SQL.add("Index Table", sqlOptions, ret2);
            }
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarIndexFromTable", error1, error2);
            if (ordering !== XcalarOrderingT.XcalarOrderingUnordered) {
                SQL.errorLog("Sort Table", sqlOptions, null, thriftError);
            } else {
                SQL.errorLog("Index Table", sqlOptions, null, thriftError);
            }
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarDeleteTable(tableName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (promiseWrapper(null));
    /** XXX Temporary commented out because this causes crash
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
        SQL.add("Delete Table", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDeleteTable", error1, error2);
        SQL.errorLog("Delete Table", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise()); */
}

function XcalarRenameTable(oldTableName, newTableName, sqlOptions) {
    if (tHandle == null || oldTableName == null || oldTableName === "" ||
        newTableName == null || newTableName === "") {
        return (promiseWrapper(null));
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
        SQL.add("Rename Table", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarRenameTable", error1, error2);
        SQL.errorLog("Rename Table", sqlOptions, null, thriftError);
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
    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
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
        deferred.resolve(tableOfEntries, totalEntries);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSample", error));
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
            deferred.reject(thriftLog("XcalarGetDatasetCount", error));
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
            deferred.reject(thriftLog("XcalarGetTableCount", error));
        });
    }

    return (deferred.promise());
}

function XcalarGetDatasets() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListDatasets(tHandle)
    .then(function(listDatasetsOutput) {
        var len = listDatasetsOutput.numDatasets;
        var datasets = listDatasetsOutput.datasets;
        var prefixIndex = ".XcalarDS.".length;

        for (var i = 0; i < len; i++) {
            datasets[i].name = datasets[i].name.substring(prefixIndex);
        }
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetDatasets", error));
    });

    return (deferred.promise());
}

function XcalarGetTables(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        deferred.reject(thriftLog("XcalarGetTables", error));
    });

    return (deferred.promise());
}

function XcalarShutdown(force) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
        deferred.reject(thriftLog("XcalarShutdown", error));
    });

    return (deferred.promise());
}

function XcalarStartNodes(numNodes) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarStartNodes(tHandle, numNodes)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarStartNodes", error));
    });
    return (deferred.promise());
}

function XcalarGetStats(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarGetStats(tHandle, nodeId)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetStats", error));
    });

    return (deferred.promise());
}

function XcalarGetTableRefCount(tableName) {
    if (tHandle == null) {
        return (promiseWrapper(0));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetTableRefCount(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetTableRefCount", error));
    });

    return (deferred.promise());
}

function XcalarMakeResultSetFromTable(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(0));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarMakeResultSetFromTable(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarMakeResultSetFromTable", error));
    });

    return (deferred.promise());
}

function XcalarMakeResultSetFromDataset(datasetName) {
    if (tHandle == null) {
        return (promiseWrapper(0));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarMakeResultSetFromDataset", error));
    });

    return (deferred.promise());
    
}

function XcalarSetAbsolute(resultSetId, position) {
    if (tHandle == null) {
        return (promiseWrapper(0));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetAbsolute(tHandle, resultSetId, position)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSetAbsolute", error));
    });

    return (deferred.promise());
}

function XcalarGetNextPage(resultSetId, numEntries) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetNext(tHandle, resultSetId, numEntries)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetNextPage", error));
    });

    return (deferred.promise());
}

function XcalarSetFree(resultSetId) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarFreeResultSet(tHandle, resultSetId)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSetFree", error));
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

function XcalarFilter(evalStr, srcTablename, dstTablename, sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            SQL.add("Filter", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarFilter", error1, error2);
            SQL.errorLog("Filter", sqlOptions, null, thriftError);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename, sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    
    if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarApiMapWorkItem(evalStr, unsortedSrcTablename,
                                            dstTablename, newFieldName);

        var def1 = xcalarApiMap(tHandle, newFieldName, evalStr,
                                unsortedSrcTablename, dstTablename);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            SQL.add("Map", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarMap", error1, error2);
            SQL.errorLog("Map", sqlOptions, null, thriftError);
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

function XcalarAggregate(fieldName, srcTablename, op, sqlOptions) {
    var evalStr = generateAggregateString(fieldName, op);
    return (XcalarAggregateHelper(srcTablename, evalStr, sqlOptions));
}

function XcalarAggregateHelper(srcTablename, evalStr, sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (evalStr === "") {
        deferred.reject("bug!:" + op);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStirngLen)
    {
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
            SQL.add("Aggregate", sqlOptions, ret2);
            deferred.resolve(ret1, dstDagName);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarAggregate", error1, error2);
            SQL.errorLog("Aggregate", sqlOptions, null, thriftError);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarJoin(left, right, dst, joinType, sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            SQL.add("Join", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarJoin", error1, error2);
            SQL.errorLog("Join", sqlOptions, null, thriftError);
            deferred.reject(thriftError);
        });
    });

    return (deferred.promise());
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName, incSample, sqlOptions) {
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var evalStr = generateAggregateString(oldColName, operator);
    if (evalStr === "") {
        deferred.reject("Wrong operator! " + operator);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen)
    {
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
            SQL.add("Group By", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error1, error2) {
            var thriftError = thriftLog("XcalarGroupBy", error1, error2);
            SQL.errorLog("Group By", sqlOptions, null, thriftError);
            deferred.reject(thriftError);
        });
    });
    return (deferred.promise());
}

function XcalarQuery(queryName, queryString) {
    // XXX Now only have a simple output
    /* some test case :
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"
        
     */
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQuery(tHandle, queryName, queryString, false, "", true)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarQuery", error));
    });

    return (deferred.promise());
}

function XcalarQueryCheck(queryName) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var checkTime = 1000; // 1s per check
    var timer = setInterval(function() {
        xcalarQueryState(tHandle, queryName)
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

function XcalarGetDag(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDag(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetDag", error));
    });

    return (deferred.promise());
}

function XcalarListFiles(url) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListFiles(tHandle, url)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListFiles", error));
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
function XcalarMakeRetina(retName, tableArray, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1 ||
        retName === "" || retName == null ||
        tableArray == null || tableArray.length <= 0)
    {
        return (promiseWrapper(null));
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
        // SQL.add("Create Retina", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarMakeRetina", error1, error2);
        SQL.errorLog("Make Retina", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}
        
function XcalarListRetinas() {
    // XXX This function is wrong because it does not take in a tablename even
    // though it should. Hence we just assume that all retinas belong to the
    // leftmost table.
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListRetinas(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListRetinas", error));
    });
    return (deferred.promise());
}

function XcalarGetRetina(retName) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetRetina", error));
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
function XcalarUpdateRetina(retName, dagNodeId, paramType, paramValue, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        // SQL.add("Update Retina", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarUpdateRetina", error1, error2);
        SQL.errorLog("Update Retina", sqlOptions, null, thriftError);
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
function XcalarExecuteRetina(retName, params, sqlOptions) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        // SQL.add("Execute Retina", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarExecuteRetina", error1, error2);
        SQL.errorLog("Execute Retina", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarListParametersInRetina(retName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListParametersInRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListParametersInRetina", error));
    });
    return (deferred.promise());
}

function XcalarDeleteRetina(retName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        // SQL.add("Delete Retina", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarApiDeleteRetina", error1, error2);
        SQL.errorLog("Delete Retina", error1, error2);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarDeleteSched(schedName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        SQL.add("Delete Schedule", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarDeleteSchedule", error1, error2);
        SQL.errorLog("Delete Schedule", sqlOptions, null, thriftError);
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
function XcalarCreateSched(schedName, schedInSec, period, recurCount, type, arg
                           , sqlOptions)
{
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        // SQL.add("Create Schedule", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        var thriftError = thriftLog("XcalarCreateSchedule", error1, error2);
        SQL.errorLog("Create Schedule", sqlOptions, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

// namePattern is just thge star based naming pattern that we use
function XcalarListSchedules(namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListSchedTask(tHandle, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        // TODO Handle 286 aka table or dataset not found aka no schedules
        deferred.reject(thriftLog("XcalarListSchedule", error));
    });
    return (deferred.promise());
}

function XcalarKeyLookup(key, scope) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeyPut(key, value, persist, scope) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
        deferred.reject(thriftLog("XcalarKeyPut", error));
    });

    return (deferred.promise());
}

function XcalarKeyDelete(key, scope) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeySetIfEqual(scope, persist, keyCompare, oldValue, newValue) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeySetBothIfEqual(scope, persist, keyCompare, oldValue, newValue,
                                 otherKey, otherValue) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());

}

function XcalarKeyAppend(key, stuffToAppend, persist, scope) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarGetStats(numNodes) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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

function XcalarApiTop(measureIntervalInMs) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiTop(tHandle, XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarApiTop", error));
    });
    return (deferred.promise());
}

function XcalarListXdfs(fnNamePattern, categoryPattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiListXdfs(tHandle, fnNamePattern, categoryPattern)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListXdf", error));
    });
    return (deferred.promise());
}

function XcalarUploadPython(moduleName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiUploadPython(tHandle, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarUploadPython", error));
    });
    return (deferred.promise());
}

function XcalarMemory() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        deferred.reject(thriftLog("XcalarMemory", error));
    });
    return (deferred.promise());
}

function XcalarGetQuery(workItem) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
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
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionNew(tHandle, newWorkbookName, isCopy,
                        copyFromWhichWorkbook)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarNewWorkbook", error));
    });
    return (deferred.promise());
}

function XcalarDeleteWorkbook(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionDelete(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarDeleteWorkbook", error));
    });
    return (deferred.promise());
}

function XcalarInActiveWorkbook(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionInact(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarInActiveWorkbook", error));
    });
    return (deferred.promise());
}

function XcalarListWorkbooks(pattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionList(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListWorkbooks", error));
    });
    return (deferred.promise());
}

function XcalarSaveWorkbooks(pattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionPersist(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSaveWorkbooks", error));
    });
    return (deferred.promise());
}

function XcalarSwitchToWorkbook(toWhichWorkbook, fromWhichWorkbook) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionSwitch(tHandle, toWhichWorkbook, fromWhichWorkbook)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSwitchToWorkbook", error));
    });
    return (deferred.promise());
}

function XcalarRenameWorkbook(newName, oldName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionRename(tHandle, newName, oldName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarRenameWorkbook", error));
    });
    return (deferred.promise());
}

// XXX Currently this function does nothing. Ask Ken for more details
function XcalarSupportSend() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    xcalarApiSupportSend(tHandle)
    .then(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSupportSend", error));
    });
    return (deferred.promise());
}

function XcalarDownloadPython(moduleName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    // fromWhichWorkbook can be null
    xcalarApiDownloadPython(tHandle, moduleName)
    .then(function(output) {
        deferred.resolve(output.pythonSrc);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarDownloadPython", error));
    });
    return (deferred.promise());
}

