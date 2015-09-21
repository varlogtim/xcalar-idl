var tHandle = xcalarConnectThrift(hostname, portNumber.toString());
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

function thriftLog(title, errRes) {
    var thriftError = {};
    var status;
    var error;
    var type = typeof errRes;

    if (title == null) {
        title = "thrift call";
    }

    if (type === "number") {
        status = errRes;
        error = StatusTStr[status];
    } else if (type === "object") {
        status = errRes.status;
        error = StatusTStr[status];
    } else {
        error = errRes;
    }

    // special case when error is Success
    if (status === StatusT.StatusOk) {
        error = "Unknown Error";
    }

    var msg = title + " failed with status " + status;

    if (status) {
        msg += ": " + error;
        thriftError.status = status;
    }

    thriftError.error = "Error: " + error;
    console.error(msg);

    if (status === StatusT.StatusConnReset) {
        // The shit has hit the fan
        var alertError = {"error": 'Connection could not be established.'};
        var options    = {"lockScreen": true};

        Alert.error("Connection error", alertError, options);
    }

    return (thriftError);
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
                if (indexInput.preserveOrder === true) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    deferred.resolve(indexInput.source.name);
                    return;
                }
            }
            deferred.resolve(tableName);
        });
    } else {
        var deferred2 = XcalarGetDag(otherTableName);
        xcHelper.when(deferred1, deferred2)
        .then(function(na1, na2) {
            var unsortedName1 = tableName;
            var unsortedName2 = otherTableName;
            if (XcalarApisTStr[na1.node[0].api] === "XcalarApiIndex") {
                var indexInput = na1.node[0].input.indexInput;
                if (indexInput.preserveOrder === true) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    unsortedName1 = indexInput.source.name;
                }
            }
            if (XcalarApisTStr[na2.node[0].api] === "XcalarApiIndex") {
                var indexInput = na2.node[0].input.indexInput;
                if (indexInput.preserveOrder === true) {
                    // Find parent and return parent's name
                    xcHelper.assert(indexInput.source.isTable);
                    console.log("Using unsorted table instead: " +
                                indexInput.source.name);
                    unsortedName2 = indexInput.source.name;
                }
            }
            deferred.resolve(unsortedName1, unsortedName2);
        });
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

    var formatType;
    switch (format) {
        case ("JSON"):
            formatType = DfFormatTypeT.DfFormatJson;
            break;
        case ("rand"):
            formatType = DfFormatTypeT.DfFormatRandom;
            break;
        case ("raw"):
            loadArgs.csv.fieldDelim = ""; // No Field delim
            // fallthrough
        case ("CSV"):
            formatType = DfFormatTypeT.DfFormatCsv;
            break;
        default:
            formatType = DfFormatTypeT.DfFormatUnknown;
            break;
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
        deferred.reject(thriftLog("XcalarLoad", error1, error2));
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
        deferred.reject(thriftLog("XcalarAddExportTarget", error));
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
        deferred.reject(thriftLog("XcalarAddExportTarget", error));
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
        deferred.reject(thriftLog("XcalarListExportTargets", error));
    });

    return (deferred.promise());
}

function XcalarExport(tableName, exportName, targetName, numColumns, columns,
                      sqlOptions) {
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
        // var def2 = XcalarGetQuery(workItem);
        var def2 = jQuery.Deferred().resolve().promise();
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            // SQL.add("Export Table", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarExport", error));
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
    var workItem = xcalarDestroyDatasetWorkItem(dsName);
    var def1 = xcalarDestroyDataset(tHandle, dsName);
    var def2 = XcalarGetQuery(workItem);

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Destroy Dataset", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error1, error2) {
        deferred.reject(thriftLog("XcalarDestroyDataset", error1, error2));
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
                                              dhtName, false);
    var def1 = xcalarIndexDataset(tHandle, datasetName, key, tablename,
                                  dhtName, false);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Index Dataset", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarIndexFromDataset", error));
    });

    return (deferred.promise());
}

function XcalarIndexFromTable(srcTablename, key, tablename, preserveOrder,
                              sqlOptions) {
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
                                                key, dhtName, preserveOrder);
    
        var def1 = xcalarIndexTable(tHandle, unsortedSrcTablename, key,
                                    tablename, dhtName, preserveOrder);
        var def2 = XcalarGetQuery(workItem);

        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            SQL.add("Index Table", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarIndexFromTable", error));
        });
    });
    return (deferred.promise());
}

function XcalarDeleteTable(tableName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var workItem = xcalarDeleteTableWorkItem(tableName);
    var def1 = xcalarDeleteTable(tHandle, tableName);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Delete Table", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarDeleteTable", error));
    });

    return (deferred.promise());
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
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarRenameTable", error));
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

function XcalarFilterHelper(filterStr, srcTablename, dstTablename,
                            sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (filterStr === "") {
        console.error("Unknown op " + filterStr);
        deferred.reject("Unknown op " + filterStr);
        return (deferred.promise());
    }
    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        var workItem = xcalarFilterWorkItem(unsortedSrcTablename, dstTablename,
                                            filterStr);

        var def1 = xcalarFilter(tHandle, filterStr, unsortedSrcTablename,
                                dstTablename);
        var def2 = XcalarGetQuery(workItem);
        jQuery.when(def1, def2)
        .then(function(ret1, ret2) {
            SQL.add("Filter", sqlOptions, ret2);
            deferred.resolve(ret1);
        })
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarFilter", error));
        });
    });

    return (deferred.promise());
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename,
                   sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
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
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarMap", error));
        });
    });
    return (deferred.promise());
}   

function generateAggregateString(fieldName, op) {
    var evalStr = "";

    switch (op) {
    case ("Max"):
        evalStr += "max(";
        break;
    case ("Min"):
        evalStr += "min(";
        break;
    case ("Avg"):
        evalStr += "avg(";
        break;
    case ("Count"):
        evalStr += "count(";
        break;
    case ("Sum"):
        evalStr += "sum(";
        break;
    // The following functions are not being called yet! GUI-1155
    case ("MaxInteger"): // Feel free to change these
        evalStr += "maxInteger(";
        break;
    case ("MinInteger"):
        evalStr += "minInteger(";
        break;
    case ("SumInteger"):
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
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarAggregate", error));
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
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarJoin", error));
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
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarGroupBy", error));
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

    xcalarQuery(tHandle, queryName, queryString, false, "")
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarQuery", error));
    });

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
function XcalarMakeRetina(retName, tableName) {
    if (retName === "" || retName == null ||
        tableName === "" || tableName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarMakeRetina(tHandle, retName, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarMakeRetina", error));
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

// XXX TODO THIS NEEDS TO HAVE SQL.ADD
function XcalarUpdateRetina(retName, dagNodeId, funcApiEnum,
                            parameterizedInput) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarUpdateRetina(tHandle, retName, dagNodeId, funcApiEnum,
                        parameterizedInput)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarUpdateRetina", error));
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

    xcalarGetRetina(retName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetRetina", error));
    });

    return (deferred.promise());
}

// XXX TODO SQL.ADD
function XcalarAddParameterToRetina(retName, varName, defaultVal) {
    if (retName === "" || retName == null ||
        varName === "" || varName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarAddParameterToRetina(tHandle, retName, varName, defaultVal)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarAddParameterToRetina", error));
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

// XXX TODO SQL.ADD
function XcalarExecuteRetina(retName, params) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var randomTableName = "table" + Math.floor(Math.random() * 1000000000 + 1);

    xcalarExecuteRetina(tHandle, retName, randomTableName,
                        retName + ".csv", params)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarExecuteRetina", error));
    });

    return (deferred.promise());
}

function XcalarKeyLookup(key) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeyLookup(tHandle, key)
    .then(deferred.resolve)
    .fail(function(error) {
        // it's normal to find an unexisted key.
        if (error === StatusT.StatusKvEntryNotFound) {
            console.warn("Stataus", error, "Key, not found");
            deferred.resolve(null);
        } else {
            var thriftError = thriftLog("XcalarKeyLookup", error);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
}

function XcalarKeyPut(key, value, persist) {
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
    xcalarKeyAddOrReplace(tHandle, key, value, persist)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarKeyPut", error));
    });

    return (deferred.promise());
}

function XcalarKeyDelete(key) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeyDelete(tHandle, key)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyDelete", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve();
        } else {
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

function XcalarForceRelease(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();
    
    xcalarApiSessionInact(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarForceRelease", error));
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
