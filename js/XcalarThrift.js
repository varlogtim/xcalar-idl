var tHandle = xcalarConnectThrift(hostname, portNumber.toString());

function THandleDoesntExistError() {
    this.name = "THandleDoesntExistError";
    this.message = "tHandle does not exist yet.";
}
THandleDoesntExistError.prototype = Error.prototype;

function thriftLog(action, status) {
    var thriftError = {};
    var msg;
    var error;

    if (action == undefined) {
        action = "thrift call";
    }
    if (typeof status === "number") {
        thriftError.statusCode = status;
        msg = action + " failed with status " + status;
        error = StatusTStr[status];
        if (status) {
            msg += ": " + error;
        }
        console.log(msg);
    } else {
        error = status;
    }

    thriftError.error = "Error: " + error;
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

        switch(type) {
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

    while(Date.now() < end);
}

// Should check if the function returns a promise
// but that would require an extra function call 
Function.prototype.log = function() {
    var fn = this
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
}

Function.prototype.bind = function() {
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
    })

    return (deferred.promise());
}

function XcalarLoad(url, format, datasetName, fieldDelim, recordDelim) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    if (fieldDelim == null || fieldDelim == undefined
        || fieldDelim == "") {
        fieldDelim = XcalarApiDefaultFieldDelimT;
        console.log(fieldDelim);
    } 
    if (recordDelim == null || recordDelim == undefined
        || recordDelim == "") {
        recordDelim = XcalarApiDefaultRecordDelimT;
        console.log(recordDelim);
    }

    var deferred = jQuery.Deferred();
    var loadArgs = new XcalarApiDfLoadArgsT();

    loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
    loadArgs.csv.recordDelim = recordDelim;
    loadArgs.csv.fieldDelim = fieldDelim;
    loadArgs.csv.isCRLF = true;

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
    } 
    xcalarLoad(tHandle, url, datasetName, formatType, 0, loadArgs)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarLoad", error));
    });

    return (deferred.promise());
}

function XcalarExport(tablename, filename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarExport(tHandle, tablename, filename)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarExport", error));
    });

    return (deferred.promise());
}

function XcalarDestroyDataset(dsName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarDestroyDataset(tHandle, dsName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarDestroyDataset", error));
    });

    return (deferred.promise());
}

function XcalarIndexFromDataset(datasetName, key, tablename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarIndexDataset(tHandle, datasetName, key, tablename)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarIndexFromDataset", error));
    });

    return (deferred.promise());
}

function XcalarIndexFromTable(srcTablename, key, tablename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarIndexTable(tHandle, srcTablename, key, tablename)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarIndexFromTable", error));
    });

    return (deferred.promise());
}

function XcalarDeleteTable(backTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarDeleteTable(tHandle, backTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarDeleteTable", error));
    });

    return (deferred.promise());
}

function XcalarEditColumn(datasetName, currFieldName, newFieldName,
                          newFieldType) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarEditColumn(tHandle, datasetName, "", true, 
                        currFieldName, newFieldName, newFieldType)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarEditColumn", error));
    });

    return (deferred.promise());
}

function XcalarSample(datasetName, numEntries) {
    var deferred = jQuery.Deferred();
    var totalEntries = 0;
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(function(result) {
        var resultSetId = result.resultSetId;
        totalEntries = result.numEntries;
        gDatasetBrowserResultSetId = resultSetId;
        return (XcalarGetNextPage(resultSetId, numEntries));
    })
    .then(function(tableOfEntries) {
        deferred.resolve(tableOfEntries, totalEntries);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSample", error));
    });

    return (deferred.promise());
}

function XcalarGetMetaTable(datasetName, numEntries) {
    var deferred = jQuery.Deferred();

    var resultSetId;
    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(function(result) {
        resultSetId = result.resultSetId;
        return (XcalarGetNextPage(resultSetId, numEntries));
    })
    .then(function(tableOfEntries) {
        deferred.resolve(resultSetId, tableOfEntries);
    })
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarSampleTable", error));
    });

    return (deferred.promise());
}

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
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGetDatasets", error));
    });

    return (deferred.promise());
}

function XcalarGetTables() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarListTables(tHandle, "*")
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
    if (force == undefined) {
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

function generateFilterString(operator, value, columnName) {
    var filterStr = "";
    switch (operator) {
    case ("Greater Than"):
        filterStr = "gt("+columnName+", "+value+")";
        break;
    case ("Greater Than Equal To"):
        filterStr = "ge("+columnName+", "+value+")";
        break;
    case ("Equals"):
        filterStr = "eq("+columnName+", "+value+")";
         break;
    case ("Less Than"):
        filterStr = "lt("+columnName+", "+value+")";
        break;
    case ("Less Than Equal To"):
        filterStr = "le("+columnName+", "+value+")";
        break;
    case ("Exclude number"):
        filterStr = "not(eq("+columnName+", "+value+"))";
        break;
    case ("Exclude string"):
        filterStr = "not(like("+columnName+', "'+value+'"))';
        break;
    case ("Regex"):
        filterStr = "regex("+columnName+', "'+value+'")';
        break;
    case ("Like"):
        filterStr = "like("+columnName+', "'+value+'")';
        break;
    case ("Custom"):
        filterStr = value;
        break;
    default:
        break;
    }
    return (filterStr);
}

function XcalarFilter(operator, value, columnName, srcTablename, dstTablename) {
    var deferred = jQuery.Deferred();

    var filterStr = generateFilterString(operator, value, columnName);
    XcalarFilterHelper(filterStr, srcTablename, dstTablename).
    then(deferred.resolve);

    return (deferred.promise());
}

function XcalarFilterHelper(filterStr, srcTablename, dstTablename) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    if (filterStr === "") {
        console.log("Unknown op "+operator);
        deferred.reject("Unknown op "+operator);
        return (deferred.promise());
    }

    xcalarFilter(tHandle, filterStr, srcTablename, dstTablename)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarFilter", error));
    });

    return (deferred.promise());
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    xcalarApiMap(tHandle, newFieldName, evalStr, srcTablename, dstTablename)
    .then(deferred.resolve)
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
    case ("Average"):
        evalStr += "avg(";
        break;
    case ("Count"):
        evalStr += "count(";
        break;
    case ("Sum"):
        evalStr += "sum(";
        break;
    // The following functions are not being called yet! GUI-1155
    case ("MaxInt"): // Feel free to change these
        evalStr += "maxInteger(";
        break;
    case ("MinInt"):
        evalStr += "minInteger(";
        break;
    case ("SumInt"):
        evalStr += "sumInteger(";
        break;
    default:
        console.log("bug!:"+op);
    }
    
    evalStr += fieldName;
    evalStr += ")";
    return (evalStr);
}


function XcalarAggregate(fieldName, srcTablename, op) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var evalStr = generateAggregateString(fieldName, op);
    if (evalStr === "") {
        deferred.reject("bug!:"+op);
        return (deferred.promise());
    }
    xcalarAggregate(tHandle, srcTablename, evalStr)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarAggregate", error));
    });

    return (deferred.promise());
}

function XcalarJoin(left, right, dst, joinType) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    // XXX We actually have the join type. We just are not passing it in
    xcalarJoin(tHandle, left, right, dst, joinType)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarJoin", error));
    });

    return (deferred.promise());
}

// XXX FIXME
// This function is problematic
function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName) {
    var deferred = jQuery.Deferred();
    var evalStr = generateAggregateString(oldColName, operator);
    if (evalStr === "") {
        deferred.reject("Wrong operator! "+operator);
        return (deferred.promise());
    }

    xcalarGroupBy(tHandle, tableName, newTableName, evalStr, newColName)
    .then(deferred.resolve)
    .fail(function(error) {
        deferred.reject(thriftLog("XcalarGroupBy", error));
    });

    return (deferred.promise());
}

function XcalarQuery(query) {
    // XXX Now only have a simple output
    /* some test case : 
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"
        
     */ 
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();

    xcalarQuery(tHandle, query)
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

function XcalarMakeRetina(retName, tableName) {
    if (retName == "" || retName === undefined ||
        tableName == "" || tableName === undefined ||
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
    if (retName == "" || retName === undefined ||
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

function XcalarAddParameterToRetina(retName, varName, defaultVal) {
    if (retName == "" || retName === undefined ||
        varName == "" || varName === undefined ||
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

function XcalarExecuteRetina(retName, params) {
    if (retName == "" || retName === undefined ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    var deferred = jQuery.Deferred();
    var randomTableName = "table"+Math.floor(Math.random()*1000000000 + 1);

    xcalarExecuteRetina(tHandle, retName, randomTableName,
                        retName+".csv", params)
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
        var thriftError = thriftLog("XcalarKeyLookup", error);
        // it's normal to find an unexisted key.
        if (thriftError.statusCode === StatusT.StatusKvEntryNotFound) {
            deferred.resolve(null);
        } else {
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

    if (persist == undefined || persist == null) {
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
        if (thriftError.statusCode === StatusT.StatusKvEntryNotFound) {
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
    for (var i = 0; i<numNodes; i++) {
        nodeStruct[i] = {};

        var totFlash = Math.floor(Math.random()*1000)*GB;
        var usedFlash = Math.floor(Math.random() * totFlash);
        var totDisk = Math.floor(Math.random()*30*1000)*GB;
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
        deferred.reject(thriftLog("XcalarApiTop", error));
    });
    return (deferred.promise());
}
