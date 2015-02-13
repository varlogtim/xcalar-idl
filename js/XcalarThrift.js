var tHandle = xcalarConnectThrift(hostname, portNumber.toString());

function THandleDoesntExistError() {
    this.name = "THandleDoesntExistError";
    this.message = "tHandle does not exist yet.";
}
THandleDoesntExistError.prototype = Error.prototype;

//I'll rewrite this function later
//Levi
function chain(arr) {
    var head = arr.reduce(function(prev, curr, index) {
        curr.prevPromise = prev;
        return prev.then(curr);
    });

    return (head);
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

    return (xcalarGetVersion(tHandle));
}

function XcalarLoad(url, format, datasetName, fieldDelim, recordDelim) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    if (fieldDelim == null) {
        fieldDelim = "";
    }
    if (recordDelim == null) {
        recordDelim = "";
    }

    var loadArgs = new XcalarApiDfLoadArgsT();
    loadArgs.csv = new XcalarApiDfCsvLoadArgsT();
    loadArgs.csv.recordDelim = recordDelim;
    loadArgs.csv.fieldDelim = fieldDelim;

    var formatType;
    switch (format) {
    case ("JSON"):
        formatType = DfFormatTypeT.DfTypeJson;
        break;
    case ("rand"):
        formatType = DfFormatTypeT.DfTypeRandom;
        break;
    case ("CSV"):
        formatType = DfFormatTypeT.DfTypeCsv;
        break;
    default:
        formatType = DfFormatTypeT.DfTypeUnknown;
    } 
    return (xcalarLoad(tHandle, url, datasetName, formatType, 0,
                       loadArgs));
}

function XcalarDestroyDataset(dsName) {
    var deferred = jQuery.Deferred();
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    getDsId(dsName)
    .done(function(id) {
        xcalarDestroyDataset(tHandle, id)
        .done(function() {
            deferred.resolve();
        })
        .fail(function(sts) {
            deferred.reject(sts);
        });
    });
    return (deferred.promise());
}

function XcalarIndexFromDataset(varDatasetId, key, tablename) {
    if (tHandle == null) {
        return;
    }
    xcalarIndexDataset(tHandle, SyncOrAsync.Async, varDatasetId,
                       key, tablename);
}

function XcalarIndexFromTable(srcTablename, key, tablename) {
    if (tHandle == null) {
        return;
    }
    xcalarIndexTable(tHandle, SyncOrAsync.Async, srcTablename, key, tablename);
}

function XcalarDeleteTable(backTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    
    xcalarDeleteTable(tHandle, backTableName)
    .done(function(sts) {
        console.log("Done deleting tables!", sts);
    })
    .fail(function(error) {
        console.log("Failed to delete tables!", error);
    });
}

function XcalarEditColumn(datasetId, currFieldName, newFieldName, newFieldType)
{
    if (tHandle == null) {
        return;
    }
    xcalarEditColumn(tHandle, datasetId, "", true, currFieldName, newFieldName,
                     newFieldType);  
}

function XcalarSample(datasetId, numEntries) {
    var resultSetId = xcalarMakeResultSetFromDataset(tHandle,
                                                     datasetId).resultSetId;
    return (XcalarGetNextPage(resultSetId, numEntries));
}

function XcalarGetCount(tableName) {
    if (tHandle == null) {
        return (0);
    }
    var countOutput = xcalarGetCount(tHandle, tableName);
    var totEntries = 0;
    var numNodes = countOutput.numCounts;
    for (var i = 0; i<numNodes; i++) {
        totEntries += countOutput.counts[i];
    }
    return (totEntries);
}

function XcalarGetDatasets() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarListDatasets(tHandle));
}

function XcalarGetTables() {
    if (tHandle == null) {
        return (null);
    }
    return (xcalarListTables(tHandle, "*"));
}

function XcalarShutdown() {
    xcalarShutdown(tHandle);
}

function XcalarGetStats(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return (null);
    }
    xcalarGetStats(tHandle, nodeId);
}

function XcalarGetTableRefCount(tableName) {
    if (tHandle == null) {
        return (0);
    }
    return (xcalarGetTableRefCount(tHandle, tableName).refCount);
}

function XcalarGetTableId(tableName) {
    if (tHandle == null) {
        return (0);
    }
    return (xcalarMakeResultSetFromTable(tHandle, tableName).resultSetId);
}

function XcalarSetAbsolute(resultSetId, position) {
    if (tHandle == null) {
        return (0);
    }
    return (xcalarResultSetAbsolute(tHandle, resultSetId, position));
}

function XcalarGetNextPage(resultSetId, numEntries) {
    if (tHandle == null) {
        return (null);
    }

    return (xcalarResultSetNext(tHandle, resultSetId, numEntries));
}

function XcalarSetFree(resultSetId) {
    if (tHandle == null) {
        return (null);
    }
    xcalarFreeResultSet(tHandle, resultSetId);
}

function XcalarFilter(operator, value, columnName, srcTablename, dstTablename) {
    if (tHandle == null) {
        return;
    }
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
    case ("Regex"):
        filterStr = "regex("+columnName+', "'+value+'")';
        break;
    case ("Others"):
        filterStr = value;
        break;
    default:
        console.log("Unknown op "+operator);
    }
    xcalarFilter(tHandle, filterStr, srcTablename, dstTablename);    
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename) {
    if (tHandle == null) {
        return;
    }
    xcalarApiMap(tHandle, newFieldName, evalStr, srcTablename, dstTablename);
}   

function XcalarAggregate(fieldName, srcTablename, op) {
    if (tHandle == null) {
        return (null);
    }
    var aggregateOp;
    switch (op) {
    case ("Max"):
        aggregateOp = OperatorsOpT.OperatorsMax;
        break;
    case ("Min"):
        aggregateOp = OperatorsOpT.OperatorsMin;
        break;
    case ("Avg"):
        aggregateOp = OperatorsOpT.OperatorsAverage;
        break;
    case ("Count"):
        aggregateOp = OperatorsOpT.OperatorsCountKeys;
        break;
    case ("Sum"):
        aggregateOp = OperatorsOpT.OperatorsSumKeys;
        break;
    default:
        console.log("bug!:"+op);
    }

    return (xcalarAggregate(tHandle, srcTablename, aggregateOp, fieldName)
                            .jsonAnswer);
}

function XcalarJoin(left, right, dst) {
    if (tHandle == null) {
        return (null);
    }
    


    xcalarJoin(tHandle, left, right, dst, OperatorsOpT.OperatorsInnerJoin);
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName) {
    var handle = xcalarConnectThrift(hostname, portNumber);
    var op;
    switch (operator) {
    case ("Average"):
        op = OperatorsOpT.OperatorsAverage;
        break;
    case ("Count"):
        op = OperatorsOpT.OperatorsCountKeys;
        break;
    case ("Sum"):
        op = OperatorsOpT.OperatorsSumKeys;
        break;
    case ("Max"):
        op = OperatorsOpT.OperatorsMax;
        break;
    case ("Min"):
        op = OperatorsOpT.OperatorsMin;
        break;
    default:
        console.log("Wrong operator! "+operator);
    }
    xcalarGroupBy(handle, tableName, newTableName, op, oldColName, newColName);
}
