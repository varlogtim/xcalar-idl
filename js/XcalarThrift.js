var tHandle = xcalarConnectThrift(hostname, portNumber.toString());

function THandleDoesntExistError() {
    this.name = "THandleDoesntExistError";
    this.message = "tHandle does not exist yet.";
}
THandleDoesntExistError.prototype = Error.prototype;

function atos(func, args) {
    func.apply(this, args).done(
        function(retObj) {
            console.log(retObj);
        }
    );
}

Function.prototype.setContext = function() {
    var fn = this, args = Array.prototype.slice.call(arguments), 
        obj = args.shift();
    return function(){
        return fn.apply(obj, 
            args.concat(Array.prototype.slice.call(arguments)));
    };
};

function chain(funcs) {
    var head = funcs[0]();
    for (var i = 1; i < funcs.length; i++) {
        head = head.then(funcs[i]);
    }
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
    getDsId(dsName).then(function(id) {
        xcalarDestroyDataset(tHandle, id).done(function() {
            deferred.resolve();
        });
    });

    return (deferred.promise());
}

function XcalarIndexFromDataset(varDatasetId, key, tablename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarIndexDataset(tHandle, SyncOrAsync.Async, 
        varDatasetId, key, tablename));
}

function XcalarIndexFromTable(srcTablename, key, tablename) {
    if (tHandle == null) {
        return;
    }
    xcalarIndexTable(tHandle, SyncOrAsync.Sync, srcTablename, key, tablename);
}

function XcalarDeleteTable(backTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    
    return (xcalarDeleteTable(tHandle, backTableName));
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

function XcalarMakeResultSetFromTable(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(0));
    }

    return (xcalarMakeResultSetFromTable(tHandle, tableName));
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
        return (promiseWrapper(null));
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
    case ("Like"):
        filterStr = "like("+columnName+', "'+value+'")';
        break;
    case ("Others"):
        filterStr = value;
        break;
    default:
        console.log("Unknown op "+operator);
    }
    return (xcalarFilter(tHandle, filterStr, srcTablename, dstTablename));
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename) {
    if (tHandle == null) {
        return;
    }
    xcalarApiMap(tHandle, newFieldName, evalStr, srcTablename, dstTablename);
}   

function XcalarAggregate(fieldName, srcTablename, op) {
    if (tHandle == null) {
        return (promiseWrapper(null));
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

    return (xcalarAggregate(tHandle, srcTablename, aggregateOp, fieldName));
}

function XcalarJoin(left, right, dst) {
    if (tHandle == null) {
        return (null);
    }
    


    xcalarJoin(tHandle, left, right, dst, OperatorsOpT.OperatorsInnerJoin);
}

// XXX FIXME
// This function is problematic
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
    return (xcalarGroupBy(handle, tableName, newTableName, 
            op, oldColName, newColName));
}

function XcalarQuery(query) {
    // XXX Now only have a simple output
    /* some test case : 
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"
        
     */ 
    xcalarQuery(tHandle, query)
    .then(function(queryOutput) {
        console.log(queryOutput);
    })
}
