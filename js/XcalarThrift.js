var tHandle = xcalarConnectThrift(hostname, portNumber.toString());

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

    var msg = title + " failed with status " + status;

    if (status) {
        msg += ": " + error;
        thriftError.status = status;
    }

    thriftError.error = "Error: " + error;
    console.error(msg);

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

function XcalarGetVersion() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

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
        loadArgs.pyLoadArgs.moduleName = moduleName;
        loadArgs.pyLoadArgs.funcName = funcName.substring(0, funcName.length - 2);
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

function XcalarExport(tablename, filename, isBQ, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var workItem = xcalarExportWorkItem(tablename, filename, isBQ);

    var def1 = xcalarExport(tHandle, tablename, filename, isBQ);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Export Table", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarExport", error));
    });

    return (deferred.promise());
}

function XcalarDestroyDataset(dsName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
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
    datasetName = parseDS(datasetName);
    var workItem = xcalarIndexDatasetWorkItem(datasetName, key, tablename);
    
    var def1 = xcalarIndexDataset(tHandle, datasetName, key, tablename);
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

function XcalarIndexFromTable(srcTablename, key, tablename, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var workItem = xcalarIndexTableWorkItem(srcTablename, tablename, key);

    var def1 = xcalarIndexTable(tHandle, srcTablename, key, tablename);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Index Table", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarIndexFromTable", error));
    });

    return (deferred.promise());
}

function XcalarDeleteTable(tableName, sqlOptions) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
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
    var totalEntries = 0;

    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(function(result) {
        console.log(result);
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

// function XcalarGetMetaTable(datasetName, numEntries) {
//     var deferred = jQuery.Deferred();

//     var resultSetId;
//     xcalarMakeResultSetFromDataset(tHandle, datasetName)
//     .then(function(result) {
//         resultSetId = result.resultSetId;
//         return (XcalarGetNextPage(resultSetId, numEntries));
//     })
//     .then(function(tableOfEntries) {
//         deferred.resolve(resultSetId, tableOfEntries);
//     })
//     .fail(function(error) {
//         deferred.reject(thriftLog("XcalarSampleTable", error));
//     });

//     return (deferred.promise());
// }

function XcalarGetCount(tableName) {
    var deferred = jQuery.Deferred();

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        xcalarGetCount(tHandle, tableName)
        .then(function(countOutput) {
            var totEntries = 0;
            var numNodes = countOutput.numCounts;
            for (var i = 0; i < numNodes; i++) {
                totEntries += countOutput.counts[i];
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            deferred.reject(thriftLog("XcalarGetCount", error));
        });
    }

    return (deferred.promise());
}

function XcalarGetDatasets() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

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
    if (tableName == null) {
        var patternMatch = "*";
    } else {
        var patternMatch = tableName;
    }
    xcalarListTables(tHandle, patternMatch)
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
    return (xcalarStartNodes(tHandle, numNodes));
}

function XcalarGetStats(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

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

    if (filterStr === "") {
        console.error("Unknown op " + filterStr);
        deferred.reject("Unknown op " + filterStr);
        return (deferred.promise());
    }

    var workItem = xcalarFilterWorkItem(srcTablename, dstTablename, filterStr);

    var def1 = xcalarFilter(tHandle, filterStr, srcTablename, dstTablename);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Filter", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarFilter", error));
    });

    return (deferred.promise());
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename,
                   sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var workItem = xcalarApiMapWorkItem(evalStr, srcTablename, dstTablename,
                                        newFieldName);

    var def1 = xcalarApiMap(tHandle, newFieldName, evalStr, srcTablename,
                            dstTablename);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Map", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarMap", error));
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
    if (evalStr === "") {
        deferred.reject("bug!:" + op);
        return (deferred.promise());
    }
    var workItem = xcalarAggregateWorkItem(srcTablename, evalStr);

    var def1 = xcalarAggregate(tHandle, srcTablename, evalStr);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Aggregate", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarAggregate", error));
    });

    return (deferred.promise());
}

function XcalarJoin(left, right, dst, joinType, sqlOptions) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var workItem = xcalarJoinWorkItem(left, right, dst, joinType);

    var def1 = xcalarJoin(tHandle, left, right, dst, joinType);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Join", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarJoin", error));
    });

    return (deferred.promise());
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName, incSample, sqlOptions) {
    var deferred = jQuery.Deferred();
    var evalStr = generateAggregateString(oldColName, operator);
    if (evalStr === "") {
        deferred.reject("Wrong operator! " + operator);
        return (deferred.promise());
    }
    var workItem = xcalarGroupByWorkItem(tableName, newTableName, evalStr,
                                         newColName, incSample);
    var def1 = xcalarGroupBy(tHandle, tableName, newTableName, evalStr,
                             newColName, incSample);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        SQL.add("Group By", sqlOptions, ret2);
        deferred.resolve(ret1);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGroupBy", error));
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

    xcalarQuery(tHandle, queryName, queryString)
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

    if (persist == null || persist == null) {
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

    xcalarApiListXdfs(tHandle, fnNamePattern, categoryPattern)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarListXdf", error));
    });
    return (deferred.promise());
}

function XcalarUploadPython(moduleName, funcName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var deferred = jQuery.Deferred();

    xcalarApiUploadPython(tHandle, moduleName, funcName, pythonStr)
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
    xcalarApiGetQuery(tHandle, workItem)
    .then(function(output) {
        deferred.resolve(output.query);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetQuery", error));
    });
    return (deferred.promise());
}
