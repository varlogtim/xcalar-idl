var tHandle = xcalarConnectThrift(hostname, portNumber.toString());

function THandleDoesntExistError() {
    this.name = "THandleDoesntExistError";
    this.message = "tHandle does not exist yet.";
}
THandleDoesntExistError.prototype = Error.prototype;

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
            ret.done(function(result) {
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
    func.apply(this, args).done(
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

function XcalarExport(tablename, filename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarExport(tHandle, tablename, filename));
}

function XcalarDestroyDataset(dsName) {
    var deferred = jQuery.Deferred();
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    xcalarDestroyDataset(tHandle, dsName)
    .done(function() {
        deferred.resolve();
    })
    .fail(function(error) {
        deferred.reject(error);
    });

    return (deferred.promise());
}

function XcalarIndexFromDataset(datasetName, key, tablename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarIndexDataset(tHandle, datasetName, key, tablename));
}

function XcalarIndexFromTable(srcTablename, key, tablename) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarIndexTable(tHandle, srcTablename, key, tablename));
}

function XcalarDeleteTable(backTableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    
    return (xcalarDeleteTable(tHandle, backTableName));
}

function XcalarEditColumn(datasetName, currFieldName, newFieldName,
                          newFieldType) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    return (xcalarEditColumn(tHandle, datasetName, "", true, 
                             currFieldName, newFieldName, newFieldType));
}

function XcalarSample(datasetName, numEntries) {
    var deferred = jQuery.Deferred();

    xcalarMakeResultSetFromDataset(tHandle, datasetName)
    .then(function(result){
        var resultSetId = result.resultSetId;

        return (XcalarGetNextPage(resultSetId, numEntries));
    })
    .done(function(tableOfEntries) {
        deferred.resolve(tableOfEntries);
    })
    .fail(function(error) {
        console.log("XcalarSample fails");
        deferred.reject(error);
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
            deferred.reject(error);
        });
    }
    return (deferred.promise());
}

function XcalarGetDatasets() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarListDatasets(tHandle));
}

function XcalarGetTables() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarListTables(tHandle, "*"));
}

function XcalarShutdown() {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    return (xcalarShutdown(tHandle));
}

function XcalarGetStats(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return (promiseWrapper(null));
    }
    return (xcalarGetStats(tHandle, nodeId));
}

function XcalarGetTableRefCount(tableName) {
    if (tHandle == null) {
        return (promiseWrapper(0));
    }

    return (xcalarGetTableRefCount(tHandle, tableName));
}

function XcalarMakeResultSetFromTable(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(0));
    }

    return (xcalarMakeResultSetFromTable(tHandle, tableName));
}

function XcalarSetAbsolute(resultSetId, position) {
    if (tHandle == null) {
        return (promiseWrapper(0));
    }
    return (xcalarResultSetAbsolute(tHandle, resultSetId, position));
}

function XcalarGetNextPage(resultSetId, numEntries) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }

    return (xcalarResultSetNext(tHandle, resultSetId, numEntries));
}

function XcalarSetFree(resultSetId) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }
    return (xcalarFreeResultSet(tHandle, resultSetId));
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
        return (promiseWrapper(null));
    }
    return (xcalarApiMap(tHandle, newFieldName, evalStr, 
            srcTablename, dstTablename));
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

function XcalarJoin(left, right, dst, joinType) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }
    
    // XXX We actually have the join type. We just are not passing it in
    return (xcalarJoin(tHandle, left, right, 
            dst, joinType));
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
    if (tHandle == null) {
        return (promiseWrapper(null));
    }

    return (xcalarQuery(tHandle, query));
}

function XcalarGetDag(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarDag(tHandle, tableName));
}

function XcalarListFiles(url) {
    if (tHandle == null) {
        return (promiseWrapper(null));
    }
    return (xcalarListFiles(tHandle, url));
}

function XcalarMakeRetina(retName, tableName) {
    if (retName == "" || retName === undefined ||
        tableName == "" || tableName === undefined ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarMakeRetina(tHandle, retName, tableName));
}
        
function XcalarListRetinas() {
    // XXX This function is wrong because it does not take in a tablename even
    // though it should. Hence we just assume that all retinas belong to the 
    // leftmost table.
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarListRetinas(tHandle));
}

function XcalarUpdateRetina(retName, dagNodeId, funcApiEnum,
                            parameterizedInput) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarUpdateRetina(tHandle, retName, dagNodeId, funcApiEnum,
                                  parameterizedInput));
}

function XcalarGetRetina(retName) {
    if (retName == "" || retName === undefined ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    // return (xcalarGetRetina(retName));
}

function XcalarAddParameterToRetina(retName, varName, defaultVal) {
    if (retName == "" || retName === undefined ||
        varName == "" || varName === undefined ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarAddParameterToRetina(tHandle, retName, varName,
                                          defaultVal));
}

function XcalarListParametersInRetina(retName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    return (xcalarListParametersInRetina(tHandle, retName));
}

function XcalarExecuteRetina(retName, params) {
    if (retName == "" || retName === undefined ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return (promiseWrapper(null));
    }
    var randomTableName = "table"+Math.floor(Math.random()*1000000000 + 1);
    return (xcalarExecuteRetina(tHandle, retName, randomTableName,
                                retName+".csv", params));
}
