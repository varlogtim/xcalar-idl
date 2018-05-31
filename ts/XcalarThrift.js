var has_require = (typeof require !== "undefined" && typeof nw === "undefined");
var tHandle;

getTHandle = function() {
    return tHandle;
};

setupThrift = function(hostname) {
    if (typeof window !== 'undefined') {
        setupHostName();
        hostname = window.hostname;
    } else {
        hostname = hostname + ":9090";
    }
    tHandle = xcalarConnectThrift(hostname);
};

setupHostName = function() {
    /*
        href example:
            protocol:/host:port/index.html?workbook=a
            protocol:/host:port/subFolder/index.html?workbook=a
            protocol:/host:port/?workbook=a
            protocol:/host:port/subFolder/?workbook=a
    */
    if (window.hostname == null || window.hostname === "") {
        hostname = window.location.href;
        if (hostname.lastIndexOf(".html") > -1) {
            let index = hostname.lastIndexOf("/");
            hostname = hostname.substring(0, index);
        } else if (hostname.lastIndexOf("/?") > -1) {
            let index = hostname.lastIndexOf("/?");
            hostname = hostname.substring(0, index);
        }
    }
    // protocol needs to be part of hostname
    // If not it's assumed to be http://
    let protocol = window.location.protocol;

    // If you have special ports, it needs to be part of the hostname
    if (protocol.startsWith("http") && !hostname.startsWith(protocol)) {
        hostname = "https://" + hostname.split("://")[1];
    }

    // If host name ends with a trailing /, remove it because it gets added
    // later in XcalarApi.js
    if (hostname.charAt(hostname.length - 1) === "/") {
        hostname = hostname.substring(0, hostname.length-1);
    }

    if (window.planServer == null || window.planServer === "") {
        planServer = hostname + "/sql";
    }

    if (window.jupyterNotebooksPath == null || window.jupyterNotebooksPath === "") {
        // window.jupyterNotebooksPath = "var/opt/xcalar/jupyterNotebooks/";
        window.jupyterNotebooksPath = "jupyterNotebooks/";
    }
};
// for convenience, add the function list here and make them
// comment in default
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

// called if a XcalarThrift.js function returns an error
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
        var error = null;
        var status = null;      // Error from other thriftLog output or caused by Xcalar operation fails
        var log = null;         // Exist with xcalarStatus
        var httpStatus = null;  // Error caused by http connection fails
        var output = null;

        if (type === "number") {
            // case that didn't handled in xcalarApi.js
            status = errRes;
        } else if (type === "object") {
            // Return by other thriftLog output XcalarApi.js
            status = (errRes.status != null)
                     ? errRes.status
                     : errRes.xcalarStatus;
            if (status === StatusT.StatusUdfExecuteFailed) {
                log = parseUDFLog(errRes.log);
            } else {
                log = parseLog(errRes.log);
            }
            httpStatus = errRes.httpStatus;
            output = errRes.output;
        } else {
            // when error is string, Manually defined in xcalarThrift.js
            error = errRes;
        }


        if (status == null && httpStatus == null && error == null) {
            // console.log("not an error");
            // not an error
            continue;
        }

        var msg;

        if (status != null) {
            // special case when error is Success
            if (status === StatusT.StatusOk) {
                error = "Unknown Error";
            } else {
                error = StatusTStr[status];
            }
            msg = title + " failed with status " + status + " : " +
                  StatusTStr[status];
        } else if (httpStatus != null) {
            error = "Proxy Error with http status code: " + httpStatus;
            msg = title + " failed with network exception. Http status : " +
                  httpStatus;
        } else {
            msg = title + " failed: " + error;
        }

        if (status !== StatusT.StatusCanceled) {
            console.error('(╯°□°）╯︵ ┻━┻', msg);
        }

        thriftError.status = status;
        thriftError.httpStatus = httpStatus;
        thriftError.error = "Error: " + error;
        thriftError.log = log;
        thriftError.output = output;
        errorLists.push(thriftError);
        var alertError;

        if (has_require) {
            return thriftError;
        } else if (status === StatusT.StatusOk || httpStatus === 0) {
            XcSupport.checkConnection();
            return thriftError;
        } else {
            // XXX We might need to include connection status 502 (Proxy error)
            if (status === StatusT.StatusConnReset ||
                status === StatusT.StatusConnRefused) {
                // This is bad, connection was lost so UI cannot do anything
                // LOCK THE SCREEN
                if (!xcManager.isInSetup()) {
                    // set up time has it's own handler
                    alertError = {"error": ThriftTStr.CCNBE};
                    Alert.error(ThriftTStr.CCNBEErr, alertError, {
                        "lockScreen": true
                    });
                }

                Log.backup();
                return thriftError;
            }
        }
    }

    // case other than connection reset and no mem,
    // return first error
    return errorLists.length ? errorLists[0] : {};

    function parseLog(log) {
        if (!log) {
            return log;
        }
        var res = log;
        var splits = log.split(/Line \d+:/);
        if (splits.length === 2) {
            res = splits[1].trim();
        }
        return res;
    }

    function parseUDFLog(log) {
        var res = log;
        try {
            match = res.match(/ValueError:(.+)/);
            if (match && match.length >= 2) {
                res = match[1].trim();
                res = res.split('\\n')[0]; // strip ending unuseful chars
                if (res.endsWith("\\")) {
                    res = res.substring(0, res.length - 1);
                }
                return res;
            }
        } catch (e) {
            console.error("parse error", e);
        }

        return res;
    }
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

function fakeApiCall(ret) {
    ret = ret || {};
    return PromiseHelper.resolve(ret);
}

function parseDS(dsName) {
    return (gDSPrefix + dsName);
}


function indexKeyMap(keyInfo) {
    return new XcalarApiKeyT({
        name: keyInfo.name,
        type: DfFieldTypeTStr[keyInfo.type],
        keyFieldName: keyInfo.keyFieldName,
        ordering: XcalarOrderingTStr[keyInfo.ordering]
    });
}

function colInfoMap(colInfo) {
    var map = new XcalarApiColumnT();
    map.sourceColumn = colInfo.orig;
    map.destColumn = colInfo.new;
    map.columnType = DfFieldTypeTStr[colInfo.type];
    return map;
}

// Should check if the function returns a promise
// but that would require an extra function call
if (!has_require) {
    window.Function.prototype.log = function() {
        var fn = this;
        var args = Array.prototype.slice.call(arguments);
        if (fn && typeof fn === "function") {
            var ret = fn.apply(fn, args);
            if (ret && typeof ret.promise === "function") {
                ret.then(function(result) {
                    console.log(result);
                })
                .fail(function(result) {
                    console.error(result);
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
// colsToIndex is optional array of colnames
// if a new index table needs to be created, "colsToIndex" will be used
// as the keys for the new index table
getUnsortedTableName = function(tableName, otherTableName, txId, colsToIndex) {
    // XXX this may not right but have to this
    // or some intermediate table cannot be found
    if (txId != null && Transaction.isSimulate(txId)) {
        return PromiseHelper.resolve(tableName, otherTableName);
    }

    var getUnsortedTableHelper = function(table) {
        var deferred = PromiseHelper.deferred();
        var originalTableName = table;
        var srcTableName = table;

        XcalarGetDag(table)
        .then(function(nodeArray) {
            // Check if the last one is a sort. If it is, then use the unsorted
            // one
            // If it isn't then just return the original
            if (nodeArray.node[0].api === XcalarApisT.XcalarApiIndex) {
                var indexInput = nodeArray.node[0].input.indexInput;
                var primeKey = indexInput.key[0];
                // no matter it's sorted or multi sorted, first key must be sorted
                if (primeKey.ordering ===
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                    primeKey.ordering ===
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                    // Find parent and return parent's name
                    var node = DagFunction.construct(nodeArray.node).tree;
                    srcTableName = node.getSourceNames()[0];
                    var hasReadyState = checkIfTableHasReadyState(node
                                                                  .parents[0]);

                    if (!hasReadyState) {
                        srcTableName = xcHelper.getTableName(originalTableName) +
                                       Authentication.getHashId();
                        var keys;
                        if (!colsToIndex) {
                            keys = indexInput.key.map(function(keyAttr) {
                                return {
                                    name: keyAttr.name,
                                    ordering: XcalarOrderingT.XcalarOrderingUnordered
                                };
                            });
                        } else {
                            keys = colsToIndex.map(function(colName) {
                                return {
                                    name: colName,
                                    ordering: XcalarOrderingT.XcalarOrderingUnordered
                                };
                            });
                        }

                        return XcalarIndexFromTable(originalTableName, keys,
                                                    srcTableName, null, true);
                    } else {
                        return PromiseHelper.resolve(null);
                    }
                    console.log("Using unsorted table instead:", srcTableName);
                }
            } else if (nodeArray.node[0].api === XcalarApisT.XcalarApiExecuteRetina) {
                // if this is a sorted retina node, then it doesn't have
                // parents we can use to index on, so we index on the retina
                // node itself
                var innerDeferred = PromiseHelper.deferred();
                XcalarGetTableMeta(table)
                .then(function(ret) {
                    var keyAttrs = ret.keyAttr;
                    if (keyAttrs[0] &&
                        (keyAttrs[0].ordering ===
                        XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                        keyAttrs[0].ordering ===
                        XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending])) {

                        srcTableName = xcHelper.getTableName(originalTableName) +
                                       Authentication.getHashId();
                        var keys;
                        if (!colsToIndex) {
                            keys = keyAttrs.map(function(keyAttr) {
                                return {
                                    name: keyAttr.name,
                                    ordering: XcalarOrderingT.XcalarOrderingUnordered
                                };
                            });
                        } else {
                            keys = colsToIndex.map(function(colName) {
                                return {
                                    name: colName,
                                    ordering: XcalarOrderingT.XcalarOrderingUnordered
                                };
                            });
                        }
                        return XcalarIndexFromTable(originalTableName, keys,
                                                    srcTableName, txId, true);
                    } else {
                        return PromiseHelper.resolve();
                    }
                })
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);

                return innerDeferred.promise();
            } else {
                return PromiseHelper.resolve(null);
            }
        })
        .then(function() {
            deferred.resolve(srcTableName);
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    if (!otherTableName) {
        return getUnsortedTableHelper(tableName);
    } else {
        var def1 = getUnsortedTableHelper(tableName);
        var def2 = getUnsortedTableHelper(otherTableName);
        return PromiseHelper.when(def1, def2);
    }
};

function checkIfTableHasReadyState(node) {
    return (node.value.state === DgDagStateT.DgDagStateReady);
}

// ========================= MAIN FUNCTIONS  =============================== //
XcalarGetVersion = function(connectionCheck) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetVersion(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        if (connectionCheck) {
            // don't call thriftLog or else it may call XcalarGetVersion again
            deferred.reject("ConnectionCheck Failed", error);
        } else {
            deferred.reject(thriftLog("XcalarGetVersion()", error));
        }
    });

    return deferred.promise();
};

XcalarGetLicense = function() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetLicense(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        console.error("Your license has not been properly set up!");
        var thriftError = thriftLog("XcalarGetLicense", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarGetNodeName = function(nodeId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetIpAddr(tHandle, nodeId)
    .then(function(ret) {
        deferred.resolve(ret.ipAddr);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetNodeName", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUpdateLicense = function(newLicense) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarUpdateLicense(tHandle, newLicense)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUpdateLicense", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/*
 * sourceArgs:
 *  targetName: "Default Shared Root"
 *  path: some path
 *  fileNamePattern: ""
 *  recursive: false
 */
XcalarPreview = function(sourceArgs, numBytesRequested, offset) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (offset == null) {
        offset = 0;
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (sourceArgs.fileNamePattern == null) {
        sourceArgs.fileNamePattern = "";
    }
    if (!(sourceArgs.recursive === true)) {
        sourceArgs.recursive = false;
    }

    xcalarPreview(tHandle, sourceArgs, numBytesRequested, offset)
    .then(function(ret) {
        // previewOutput has a jsonOutput field which is a json formatted string
        // which has several fields of interest:
        // {"fileName" :
        //  "relPath" :
        //  "fullPath" :
        //  "base64Data" :
        //  "thisDataSize" :
        //  "totalDataSize" :
        //  }
        var retStruct;
        try {
            retStruct = JSON.parse(ret.outputJson);
            var decoded = Base64.decode(retStruct.base64Data);
            // var decoded = atob(retStruct.base64Data);
            retStruct.buffer = decoded;
            deferred.resolve(retStruct);
        } catch (error) {
            console.error(error.stack);
            var thriftError = thriftLog("XcalarPreview", error);
            deferred.reject(thriftError);
        }
    })
    .fail(function(error) {
        if (error && error.log) {
            error.log = error.log.replace(/\\n/g, "\n");
        }
        var thriftError = thriftLog("XcalarPreview", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

/*
 * options (example):
    {
        "sources": [{
            "targetName": "Default Shared Root",
            "path": "..",
            "recursive": false,
            "fileNamePattern": "Default Shared Root"
        }, ...],
        "format": "CSV",
        "fieldDelim": "",
        "recordDelim": "\n",
        "hasHeader": false, // Deprecated
        "schemaMode": CsvSchemaModeT.[CsvSchemaModeNoneProvided|CsvSchemaModeUseHeader|CsvSchemaModeUseLoadInput]
        "moduleName": udfModule,
        "funcName": udfFunc,
        "quoteChar": gDefaultQDelim,
        "skipRows": 0,
        "udfQuery": udfQuery,
        "typedColumns": [
            {
                "colName": "foo",
                "colType": [DfString|DfFloat64|DfInt64]
            }, ...
        ]
    }
 */
XcalarLoad = function(datasetName, options, txId) {
    options = options || {};

    var sources = options.sources;
    var format = options.format;
    var fieldDelim = options.fieldDelim;
    var recordDelim = options.recordDelim;
    var hasHeader = options.hasHeader === true ? true: false;
    var moduleName = options.moduleName;
    var funcName = options.funcName;
    var quoteChar = options.quoteChar;
    var skipRows = options.skipRows;
    var typedColumns = options.typedColumns || [];
    var schemaMode;

    if (format === "CSV" && typedColumns.length) {
        schemaMode = CsvSchemaModeT.CsvSchemaModeUseLoadInput;
        typedColumns = typedColumns.map(function(col) {
            var type = xcHelper.convertColTypeToFieldType(col.colType);
            return new XcalarApiColumnT({
                columnType: DfFieldTypeTStr[type],
                sourceColumn: col.colName,
                destColumn: col.colName
            });
        });

        if (hasHeader) {
            skipRows++;
        }
    } else if (options.hasOwnProperty("hasHeader")) {
        schemaMode = (options.hasHeader) ?
                     CsvSchemaModeT.CsvSchemaModeUseHeader :
                     CsvSchemaModeT.CsvSchemaModeNoneProvided;
    } else {
        schemaMode = options.schemaMode;
    }

    schemaMode = CsvSchemaModeTStr[schemaMode];

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
                        Transaction.log(txId1, sqlString1,
                                        parseDS(datasetName));
                        def1.resolve({});
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

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var parserFnName;
    var parserArgJson = {};
    if (moduleName !== "" && funcName !== "") {
        // udf case
        parserFnName = moduleName + ":" + funcName;
        if (options.udfQuery && typeof options.udfQuery === "object") {
            parserArgJson = options.udfQuery;
        }
    } else {
        // csv args
        // {
        //     "recordDelim": recordDelim,
        //     "quoteDelim": quoteDelim,
        //     "linesToSkip": linesToSkip,
        //     "fieldDelim": fieldDelim,
        //     "isCRLF": isCrlf,
        //     "hasHeader": hasHeader,
        // }
        switch (format) {
            case ("JSON"):
                parserFnName = "default:parseJson";
                break;
            case ("TEXT"):
                // recordDelim = "\n";
                // No field delim
                fieldDelim = ""; // jshint ignore:line
                // fallthrough
            case ("CSV"):
                if (recordDelim === "\r\n") {
                    // we already turn on CRLF
                    recordDelim = "\n";
                }
                parserFnName = "default:parseCsv";
                parserArgJson.recordDelim = recordDelim;
                parserArgJson.fieldDelim = fieldDelim;
                parserArgJson.isCRLF = true;
                parserArgJson.linesToSkip = skipRows;
                parserArgJson.quoteDelim = quoteChar;
                parserArgJson.hasHeader = hasHeader;
                parserArgJson.schemaFile = ""; // Not used yet. Wait for backend to implement;
                parserArgJson.schemaMode = schemaMode;
                break;
            default:
                return PromiseHelper.reject("Error Format");
        }
    }

    var sourceArgsList = sources.map(function(source) {
        var sourceArgs = new DataSourceArgsT();
        sourceArgs.targetName = source.targetName;
        sourceArgs.path = source.path;
        sourceArgs.fileNamePattern = source.fileNamePattern;
        sourceArgs.recursive = source.recursive;
        return sourceArgs;
    });

    var parseArgs = new ParseArgsT();
    parseArgs.parserFnName = parserFnName;
    parseArgs.parserArgJson = JSON.stringify(parserArgJson);
    if (options.advancedArgs) {
        parseArgs.allowRecordErrors = options.advancedArgs.allowRecordErrors;
        parseArgs.allowFileErrors = options.advancedArgs.allowFileErrors;
        parseArgs.fileNameFieldName = options.advancedArgs.fileName;
        parseArgs.recordNumFieldName = options.advancedArgs.rowNumName;
    }
    parseArgs.schema = typedColumns;

    var maxSampleSize = gMaxSampleSize;
    if (maxSampleSize > 0) {
        console.log("Max sample size set to: ", maxSampleSize);
    }

    var def;
    var workItem = xcalarLoadWorkItem(datasetName, sourceArgsList,
                                      parseArgs, maxSampleSize);
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarLoad(tHandle, datasetName, sourceArgsList,
                            parseArgs, maxSampleSize);
    }
    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, "Import Dataset",
                              parseDS(datasetName), query);
    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, parseDS(datasetName), ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        if (error && error.log) {
            error.log = error.log.replace(/\\n/g, "\n");
        }
        var thriftError = thriftLog("XcalarLoad", error);
        if (has_require) {
            deferred.reject(thriftError);
        } else if (thriftError.httpStatus != null) {
            // 502 = Bad Gateway server error
            // Thrift time out
            // Just pretend like nothing happened and quietly listDatasets
            // in intervals until the load is complete. Then do the ack/fail
            checkForDatasetLoad(deferred, query, datasetName, txId);
        } else {
            var loadError = null;
            if (thriftError.output && thriftError.output.errorString) {
                // This has a valid error struct that we can use
                console.error("error in import", thriftError.output);
                loadError = xcHelper.replaceMsg(DSTStr.LoadErr, {
                    "error": parseLoadError(thriftError.output)
                });

                if (thriftError.output.errorFile) {
                    loadError = xcHelper.replaceMsg(DSTStr.LoadErrFile, {
                        "file": thriftError.output.errorFile
                    }) + "\n" + loadError;
                }
            }
            deferred.reject(thriftError, loadError);
        }
    });

    return deferred.promise();

    function parseLoadError(error) {
        var res = error;
        try {
            res = error.errorString;
            // check  if has XcalarException
            var match = res.match(/XcalarException:(.+)/);
            if (match && match.length >= 2) {
                res = parseInt(match[1].trim());
                if (StatusTStr[res] != null) {
                    return StatusTStr[res];
                }
            }

            // check if has ValueError
            match = res.match(/ValueError:(.+)/);
            if (match && match.length >= 2) {
                res = match[1].trim();
                res = res.split('\n')[0]; // strip ending unuseful chars
                return res;
            }
        } catch (e) {
            console.error("parse error", e);
        }

        return res;
    }
};

XcalarAddLocalFSExportTarget = function(targetName, path, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var target = new ExExportTargetT();
    target.hdr = new ExExportTargetHdrT();
    target.hdr.name = targetName;
    target.hdr.type = ExTargetTypeT.ExTargetSFType;
    target.specificInput = new ExAddTargetSpecificInputT();
    target.specificInput.sfInput = new ExAddTargetSFInputT();
    target.specificInput.sfInput.url = "/" + path;

    xcalarAddExportTarget(tHandle, target)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarAddUDFExportTarget = function(targetName, path, udfName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var target = new ExExportTargetT();
    target.hdr = new ExExportTargetHdrT();
    target.hdr.name = targetName;
    target.hdr.type = ExTargetTypeT.ExTargetUDFType;
    target.specificInput = new ExAddTargetSpecificInputT();
    target.specificInput.udfInput = new ExAddTargetUDFInputT();
    target.specificInput.udfInput.url = "/" + path;
    target.specificInput.udfInput.appName = udfName;

    xcalarAddExportTarget(tHandle, target)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAddExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarRemoveExportTarget = function(targetName, targetType) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    var hdr = new ExExportTargetHdrT();
    hdr.name = targetName;
    hdr.type = targetType;

    xcalarRemoveExportTarget(tHandle, hdr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarRemoveExportTarget", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// typePattern: "*", "file", "udf"
XcalarListExportTargets = function(typePattern, namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    // var workItem = xcalarListExportTargetsWorkItem(typePattern, namePattern);
    xcalarListExportTargets(tHandle, typePattern, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListExportTargets", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarExport = function(tableName, exportName, targetName, numColumns,
                      backColName, frontColName, keepOrder, options, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var target = new ExExportTargetHdrT();
    target.type = ExTargetTypeT.ExTargetUnknownType;
    target.name = targetName;
    var specInput = new ExInitExportSpecificInputT();
    var query;

    XcalarListExportTargets("*", targetName)
    .then(function(out) {
        if (out.numTargets < 1) {
            console.error("Export target does not exist!");
            return PromiseHelper.reject("Export target is not on the target list");
        }

        for (var i = 0; i < out.targets.length; i++) {
            if (out.targets[i].hdr.name === targetName) {
                target.type = out.targets[i].hdr.type;
                break;
            }
        }
        if (target.type === ExTargetTypeT.ExTargetUnknownType) {
            return PromiseHelper.reject("Export target is not on the target list");
        }
        switch (target.type) {
            case (ExTargetTypeT.ExTargetSFType):
                // XX this is not a good check, fix later
                if (options.splitType == null || options.headerType == null ||
                    options.format == null) {
                    return PromiseHelper.reject("Not all options were declared");
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
                    specInput.sfInput.formatArgs.csv.fieldDelim =
                                                    options.csvArgs.fieldDelim;
                    specInput.sfInput.formatArgs.csv.recordDelim =
                                                    options.csvArgs.recordDelim;
                    specInput.sfInput.formatArgs.csv.quoteDelim = gDefaultQDelim;
                } else if (options.format === DfFormatTypeT.DfFormatSql) {
                    specInput.sfInput.fileName = exportName + ".sql";
                    specInput.sfInput.formatArgs.sql = new ExInitExportSQLArgsT();
                    // specInput.sfInput.formatArgs.sql.tableName = exportName;
                    specInput.sfInput.formatArgs.sql.tableName = exportName;
                    specInput.sfInput.formatArgs.sql.createTable = true;
                    if (options.createRule === ExExportCreateRuleT.ExExportCreateOnly) {
                        specInput.sfInput.formatArgs.sql.dropTable = false;
                    } else {
                        specInput.sfInput.formatArgs.sql.dropTable = true;
                    }
                } else {
                    return PromiseHelper.reject("Invalid export type");
                }

                break;
            case (ExTargetTypeT.ExTargetUDFType):
                specInput.udfInput = new ExInitExportUDFInputT();
                specInput.udfInput.fileName = exportName + ".csv";
                specInput.udfInput.format = options.format;
                specInput.udfInput.formatArgs = new ExInitExportFormatSpecificArgsT();
                if (options.format === DfFormatTypeT.DfFormatCsv) {
                    exportName += ".csv";
                    specInput.udfInput.fileName = exportName;
                    specInput.udfInput.formatArgs.csv = new ExInitExportCSVArgsT();
                    specInput.udfInput.formatArgs.csv.fieldDelim =
                                                    options.csvArgs.fieldDelim;
                    specInput.udfInput.formatArgs.csv.recordDelim =
                                                    options.csvArgs.recordDelim;
                    specInput.udfInput.formatArgs.csv.quoteDelim = gDefaultQDelim;
                } else if (options.format === DfFormatTypeT.DfFormatSql) {
                    exportName += ".sql";
                    specInput.udfInput.fileName = exportName;
                    specInput.udfInput.formatArgs.sql = new ExInitExportSQLArgsT();
                    specInput.udfInput.formatArgs.sql.tableName = exportName;
                    specInput.udfInput.formatArgs.sql.createTable = true;
                    if (options.createRule === ExExportCreateRuleT.ExExportCreateOnly) {
                        specInput.udfInput.formatArgs.sql.dropTable = false;
                    } else {
                        specInput.udfInput.formatArgs.sql.dropTable = true;
                    }
                } else {
                    return PromiseHelper.reject("Invalid export type");
                }
                specInput.udfInput.headerType = options.headerType;
                break;
            default:
                return PromiseHelper.reject("Invalid export type");
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
                                  columns, options.handleName);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarExport(tHandle, tableName, target, specInput,
                                options.createRule, keepOrder, numColumns,
                                columns, options.handleName);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'Export', options.handleName, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, options.handleName, ret.timeElapsed);
            // XXX There is a bug here that backend actually needs to fix
            // We must drop the export node on a successful export.
            // Otherwise you will not be able to delete your dataset
            xcalarDeleteDagNodes(tHandle, options.handleName,
                                 SourceTypeT.SrcExport)
            .always(function() {
                deferred.resolve(ret);
            });
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarExport", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarLockDataset = function(dsName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    dsName = parseDS(dsName);
    xcalarLockDataset(tHandle, dsName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarLockDataset", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUnlockDataset = function(dsName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    dsName = parseDS(dsName);

    var deferred = PromiseHelper.deferred();
    var srcType = SourceTypeT.SrcDataset;
    var workItem = xcalarDeleteDagNodesWorkItem(dsName, srcType);
    var def;
    if (txId != null && Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarDeleteDagNodes(tHandle, dsName, srcType);
    }

    var query = XcalarGetQuery(workItem);
    if (txId != null) {
        Transaction.startSubQuery(txId, 'delete dataset', dsName + "drop", query);
    }

    def
    .then(function(ret) {
        // txId may be null if performing a
        // deletion not triggered by the user (i.e. clean up)
        if (txId != null) {
            Transaction.log(txId, query, dsName + "drop", ret.timeElapsed);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUnlockDataset", error);
        if (thriftError.status === StatusT.StatusDagNodeNotFound) {
            // this error is allowed
            deferred.resolve();
        } else {
            deferred.reject(thriftError);
        }
    });

    return deferred.promise();
};

XcalarDestroyDataset = function(dsName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }

    var deferred = PromiseHelper.deferred();
    var dsNameBeforeParse = dsName;
    dsName = parseDS(dsName);

    releaseAllResultsets()
    .then(function() {
        return XcalarUnlockDataset(dsNameBeforeParse, txId);
    })
    .then(function() {
        return xcalarApiDeleteDatasets(tHandle, dsName);
    })
    .then(function() {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            deferred.resolve();
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDestroyDataset", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();

    function releaseAllResultsets() {
        // always resolve to continue the deletion
        var innerDeferred = PromiseHelper.deferred();

        XcalarGetDatasetMeta(dsNameBeforeParse)
        .then(function(res) {
            if (res && res.resultSetIds) {
                var resultSetIds = res.resultSetIds;
                var promises = [];
                for (var i = 0, len = resultSetIds.length; i < len; i++) {
                    promises.push(XcalarSetFree(resultSetIds[i]));
                }
                return PromiseHelper.when.apply(this, promises);
            }
        })
        .then(innerDeferred.resolve)
        .fail(innerDeferred.resolve);

        return innerDeferred.promise();
    }
};

XcalarIndexFromDataset = function(datasetName, key, tableName, prefix, txId) {
    // Note: datasetName must be of the form username.hashId.dsName
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    datasetName = parseDS(datasetName);
    var dhtName = ""; // XXX TODO fill in later

    var keyInfo = indexKeyMap({
        name: key,
        type: DfFieldTypeT.DfUnknown,
        keyFieldName: "",
        ordering: XcalarOrderingT.XcalarOrderingUnordered
    });
    var keyArray = [keyInfo];
    var workItem = xcalarIndexWorkItem(datasetName, tableName, keyArray,
                                        prefix, dhtName);
    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarIndex(tHandle, datasetName, tableName, keyArray,
                          prefix, dhtName);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, "index from DS", tableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, tableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarIndexFromDataset", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// keys example:
// [{name: "review_count", ordering: XcalarOrderingT.XcalarOrderingAscending}]
XcalarIndexFromTable = function(srcTablename, keys, dstTableName, txId, unsorted) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var promise;
    if (unsorted) {
        promise = PromiseHelper.resolve(srcTablename);
    } else {
        promise = getUnsortedTableName(srcTablename, null, txId);
    }
    var unsortedSrcTablename;
    var query;
    var newKeys = [];

    if (!(keys instanceof Array)) {
        keys = [keys];
    }

    promise
    .then(function(unsortedTablename) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        unsortedSrcTablename = unsortedTablename;
        return xcHelper.getKeyInfos(keys, unsortedTablename);
    })
    .then(function(keyInfos) {
        var keyArray = keyInfos.map(function(keyInfo) {
            newKeys.push(keyInfo.keyFieldName);
            return indexKeyMap(keyInfo);
        });
        if (Transaction.isSimulate(txId)) {
            newKeys = keyArray.map(function(key) {
                return key.keyFieldName;
            });
        }
        var workItem = xcalarIndexWorkItem(unsortedSrcTablename,
                                           dstTableName, keyArray, "", "");
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarIndex(tHandle, unsortedSrcTablename, dstTableName,
                              keyArray, "", "");
        }
        query = XcalarGetQuery(workItem);
        if (txId) {
            Transaction.startSubQuery(txId, "index", dstTableName, query);
        }
        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId) {
                Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            }
            deferred.resolve({
                ret: ret,
                newKeys: newKeys
            });
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarIndexFromTable", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarDeleteTable = function(tableName, txId, isRetry) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarDeleteDagNodesWorkItem(tableName,
                                                SourceTypeT.SrcTable);
    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarDeleteDagNodes(tHandle, tableName, SourceTypeT.SrcTable);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'drop table', tableName + "drop", query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            // txId may be null if deleting an undone table or performing a
            // deletion not triggered by the user (i.e. clean up)
            if (txId != null) {
                Transaction.log(txId, query, tableName + "drop", ret.timeElapsed);
            }
            MonitorGraph.tableUsageChange();
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeleteTable", error);
        if (!isRetry && thriftError.status === StatusT.StatusDgNodeInUse) {
            forceDeleteTable(tableName, txId)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else if (thriftError.status === StatusT.StatusDagNodeNotFound) {
            // if not found, then doesn't exist so it's essentially deleted
            deferred.resolve();
        } else {
            deferred.reject(thriftError);
        }
    });

    return deferred.promise();
};

XcalarDeleteConstants = function(constantPattern, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarDeleteDagNodesWorkItem(constantPattern,
                                                SourceTypeT.SrcConstant);
    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarDeleteDagNodes(tHandle, constantPattern,
                                    SourceTypeT.SrcConstant);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'drop constants',
                              constantPattern + "drop", query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId != null) {
                Transaction.log(txId, query, constantPattern + "drop",
                                ret.timeElapsed);
            }
            MonitorGraph.tableUsageChange();
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeleteConstants", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

function forceDeleteTable(tableName, txId) {
    var deferred = PromiseHelper.deferred();
    XcalarGetTableMeta(tableName)
    .then(function(res) {
        if (res && res.resultSetIds) {
            var promises = [];
            res.resultSetIds.forEach(function(resultSetId) {
                var def = XcalarSetFree(resultSetId);
                promises.push(def);
            });
            return PromiseHelper.when.apply(this, promises);
        }
    })
    .then(function() {
        // it must be a retry case
        return XcalarDeleteTable(tableName, txId, true);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

XcalarRenameTable = function(oldTableName, newTableName, txId) {
    if (tHandle == null || oldTableName == null || oldTableName === "" ||
        newTableName == null || newTableName === "") {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarRenameNodeWorkItem(oldTableName, newTableName);

    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarRenameNode(tHandle, oldTableName, newTableName);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'renameTable', newTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarRenameTable", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

function fetchDataHelper(resultSetId, rowPosition, rowsToFetch, totalRows,
                         data, tryCnt) {
    var deferred = PromiseHelper.deferred();
    // row position start with 0
    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function() {
        return XcalarGetNextPage(resultSetId, rowsToFetch);
    })
    .then(function(tableOfEntries) {
        var values = tableOfEntries.values;
        var numValues = tableOfEntries.numValues;
        var numStillNeeds = 0;

        if (numValues < rowsToFetch) {
            if (rowPosition + numValues >= totalRows) {
                numStillNeeds = 0;
            } else {
                numStillNeeds = rowsToFetch - numValues;
            }
        }

        values.forEach(function(value) {
            data.push(value);
        });

        if (numStillNeeds > 0) {
            console.info("fetch not finish", numStillNeeds);
            if (tryCnt >= 20) {
                console.warn("Too may tries, stop");
                return PromiseHelper.resolve();
            }

            var newPosition;
            if (numStillNeeds === rowsToFetch) {
                // fetch 0 this time
                newPosition = rowPosition + 1;
                console.warn("cannot fetch position", rowPosition);
            } else {
                newPosition = rowPosition + numValues;
            }

            return XcalarFetchData(resultSetId, newPosition, numStillNeeds,
                                totalRows, data, tryCnt + 1);
        }
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

XcalarFetchData = function(resultSetId, rowPosition, rowsToFetch, totalRows,
                           data, tryCnt, maxNumRowsPerCall) {
    var deferred = PromiseHelper.deferred();
    if (tryCnt == null) {
        tryCnt = 0;
    }

    if (data == null) {
        data = [];
    }

    if (!maxNumRowsPerCall) {
        maxNumRowsPerCall = rowsToFetch;
    }

    var promiseArray = [];
    for (var i = 0; i < Math.ceil(rowsToFetch / maxNumRowsPerCall); i++) {
        var numRows = maxNumRowsPerCall;
        if (i === Math.ceil(rowsToFetch / maxNumRowsPerCall) - 1) {
            numRows = rowsToFetch - i * maxNumRowsPerCall;
        }
        promiseArray.push(fetchDataHelper.bind({}, resultSetId,
                                            rowPosition + i * maxNumRowsPerCall,
                                               numRows, totalRows,
                                               data, tryCnt));
    }

    PromiseHelper.chain(promiseArray)
    .then(function() {
        deferred.resolve(data);
    })
    .fail(deferred.reject);

    return deferred.promise();
};

XcalarGetConfigParams = function() {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetConfigParams(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetConfigParams", error);
        Log.errorLog("Get Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSetConfigParams = function(pName, pValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarSetConfigParam(tHandle, pName, pValue)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetConfigParams", error);
        Log.errorLog("Set Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// XXX NOT TESTED
XcalarGetDatasetCount = function(dsName) {
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        XcalarGetDatasetMeta(dsName)
        .then(function(metaOut) {
            var totEntries = 0;
            for (var i = 0; i < metaOut.metas.length; i++) {
                totEntries += metaOut.metas[i].numRows;
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarGetDatasetCount", error);
            Log.errorLog("Get Dataset Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
};

XcalarGetDatasetMeta = function(dsName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    dsName = parseDS(dsName);

    xcalarGetDatasetMeta(tHandle, dsName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasetMeta", error);
        Log.errorLog("Get Dataset Meta", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTableMeta = function(tableName) {
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        var isPrecise = false; // Set to true if you are collecting stats from
                               // the backend about xdb pages and hashslots.
        xcalarGetTableMeta(tHandle, tableName, isPrecise)
        .then(deferred.resolve)
        .fail(function(error) {
            var thriftError = thriftLog("XcalarGetTableMeta", error);
            Log.errorLog("Get Table Meta", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }
    return deferred.promise();
};

// Not being called. We just use make result set's output
XcalarGetTableCount = function(tableName) {
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (tHandle == null) {
        deferred.resolve(0);
    } else {
        xcalarGetTableMeta(tHandle, tableName)
        .then(function(metaOut) {
            var totEntries = 0;
            for (var i = 0; i<metaOut.metas.length; i++) {
                totEntries += metaOut.metas[i].numRows;
            }
            deferred.resolve(totEntries);
        })
        .fail(function(error) {
            var thriftError = thriftLog("XcalarGetTableCount", error);
            Log.errorLog("Get Table Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
};

XcalarGetDatasets = function() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListDatasets(tHandle)
    .then(function(listDatasetsOutput) {
        var datasets = xcHelper.parseListDSOutput(listDatasetsOutput.datasets);
        listDatasetsOutput.datasets = datasets;
        listDatasetsOutput.numDatasets = datasets.length;
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasets", error);
        Log.errorLog("Get Datasets", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetDatasetUsers = function(dsName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    dsName = parseDS(dsName);
    xcalarListDatasetUsers(tHandle, dsName)
    .then(function(listDatasetUsersOutput) {
        deferred.resolve(listDatasetUsersOutput.user); // Array of users
        // Empty array if no users
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasetUsers", error);
        Log.errorLog("Get Dataset Users", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetUserDatasets = function(userName) {
    if (tHandle == null) {
        return PromiseHelper.reject();
    }
    return xcalarListUserDatasets(tHandle, userName);
};

XcalarGetDatasetsInfo = function(datasetsNamePattern) {
    if (tHandle == null) {
        return PromiseHelper.reject();
    }
    if (datasetsNamePattern == null) {
        datasetsNamePattern = "*";
    } else {
        datasetsNamePattern = parseDS(datasetsNamePattern);
    }
    return xcalarGetDatasetsInfo(tHandle, datasetsNamePattern);
};

XcalarGetConstants = function(constantName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var patternMatch;

    if (constantName == null) {
        patternMatch = "*";
    } else {
        patternMatch = constantName;
    }
    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcConstant)
    .then(function(ret) {
        deferred.resolve(ret.nodeInfo);
        // Return struct is an array of
        // {dagNodeId: integer, // Ignore
        //  name: string,     // Name of constant. Will start with gAggVarPrefix
        //  state: integer}     // State of dag node.Read with DgDagStateTStr[x]
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetConstants", error);
        Log.errorLog("Get Constants", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTables = function(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
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
        Log.errorLog("Get Tables", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetDSNode = function(datasetName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var patternMatch;
    if (datasetName == null) {
        patternMatch = "*";
    } else {
        patternMatch = datasetName;
    }

    xcalarListTables(tHandle, patternMatch, SourceTypeT.SrcDataset)
    .then(function(ret) {
        var nodeInfo = xcHelper.parseListDSOutput(ret.nodeInfo);
        ret.nodeInfo = nodeInfo;
        ret.numNodes = nodeInfo.length;
        deferred.resolve(ret);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDSNode", error);
        Log.errorLog("Get DS Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarShutdown = function(force) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    if (force == null) {
        force = false;
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarShutdown(tHandle, force)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarShutdown", error);
        Log.errorLog("Shutdown Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarStartNodes = function(numNodes) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarStartNodes(tHandle, numNodes)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarStartNodes", error);
        Log.errorLog("Start Nodes", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetStats = function(nodeId) {
    // Today we have no use for this call yet.
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    xcalarGetStats(tHandle, nodeId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetStats", error);
        Log.errorLog("Get Stats", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetTableRefCount = function(tableName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetTableRefCount(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetTableRefCount", error);
        Log.errorLog("GetTable Ref Count", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarMakeResultSetFromTable = function(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarMakeResultSetFromTable(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeResultSetFromTable", error);
        Log.errorLog("MakeResultSetFromTable", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarMakeResultSetFromDataset = function(datasetName, getErrorDataset) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    datasetName = parseDS(datasetName);
    xcalarMakeResultSetFromDataset(tHandle, datasetName, getErrorDataset)
    .then(function(ret) {
        if (ret.numEntries < 0) {
            ret.numEntries = 0;
        }
        deferred.resolve(ret);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeResultSetFromDataset", error);
        Log.errorLog("MakeResultSetFromDataset", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());

};

XcalarSetAbsolute = function(resultSetId, position) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetAbsolute(tHandle, resultSetId, position)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetAbsolute", error);
        Log.errorLog("Set Absolute", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGetNextPage = function(resultSetId, numEntries) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarResultSetNext(tHandle, resultSetId, numEntries)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetNextPage", error);
        Log.errorLog("Get Next Page", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSetFree = function(resultSetId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarFreeResultSet(tHandle, resultSetId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetFree", error);
        Log.errorLog("Set Free", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

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
            filterStr = "neq(" + value1 + ", " + value2 + ")";
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

XcalarFilter = function(evalStr, srcTablename, dstTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    var query;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr === "") {
        deferred.reject("Unknown op " + evalStr);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen)
    {
        deferred.reject(thriftLog("XcalarFilter", "Eval string too long"));
        return (deferred.promise());
    }
    getUnsortedTableName(srcTablename, null, txId)
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarFilterWorkItem(unsortedSrcTablename, dstTablename,
                                            evalStr);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarFilter(tHandle, evalStr, unsortedSrcTablename,
                                dstTablename);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'filter', dstTablename, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTablename, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarFilter", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarMapWithInput = function(txId, inputStruct) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarApiMapWorkItem([""], null, null, [""]);
    workItem.input.mapInput = inputStruct;

    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarApiMapWithWorkItem(tHandle, workItem);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'map', inputStruct.dest, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, inputStruct.dest,
                            ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMap", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarMap = function(newFieldNames, evalStrs, srcTablename, dstTablename,
                     txId, doNotUnsort, icvMode) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }
    if (!icvMode) {
        icvMode = false;
    }

    newFieldNames = (newFieldNames instanceof Array)
                    ? newFieldNames
                    : [newFieldNames];
    evalStrs = (evalStrs instanceof Array)
                ? evalStrs
                : [evalStrs];
    if (newFieldNames.length !== evalStrs.length) {
        return PromiseHelper.reject(thriftLog("XcalarMap", "invalid args"));
    }

    for (var i = 0, len = evalStrs.length; i < len; i++) {
        if (evalStrs[i].length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject(thriftLog("XcalarMap",
                                                  "Eval string too long"));
        }
    }

    var deferred = PromiseHelper.deferred();
    var d;
    var query;
    if (!doNotUnsort) {
        d = getUnsortedTableName(srcTablename, null, txId);
    } else {
        d = PromiseHelper.resolve(srcTablename);
        console.log("Using SORTED table for windowing!");
    }
    d
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarApiMapWorkItem(evalStrs, unsortedSrcTablename,
                                            dstTablename, newFieldNames,
                                            icvMode);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarApiMap(tHandle, newFieldNames, evalStrs,
                                unsortedSrcTablename, dstTablename,
                                icvMode);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'map', dstTablename, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTablename, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMap", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarAggregate = function(evalStr, dstAggName, srcTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    var query;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr === "") {
        deferred.reject("bug!:" + op);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStirngLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    getUnsortedTableName(srcTablename, null, txId)
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarAggregateWorkItem(unsortedSrcTablename,
                                               dstAggName, evalStr);

        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarAggregate(tHandle, unsortedSrcTablename, dstAggName,
                                   evalStr);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'aggregate', dstAggName, query);
        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstAggName, ret.timeElapsed);
            deferred.resolve(ret, dstAggName);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAggregate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};


/**
    leftColInfos/rightColInfos:
        example: [{orig: "sourcCol", new: "destCol", type: DfFieldTypeT.DfFloat64}]
    options contain
        evalString: filter string for cross joins
*/
XcalarJoin = function(left, right, dst, joinType, leftColInfos, rightColInfos,
                      options, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var coll = true;

    var deferred = PromiseHelper.deferred();
    var query;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var evalString = "";
    if (joinType === JoinOperatorT.CrossJoin && options) {
        evalString = options.evalString || "";
    }

    getUnsortedTableName(left, right, txId)
    .then(function(unsortedLeft, unsortedRight) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }

        var leftColumns = [];
        var rightColumns = [];

        if (leftColInfos) {
            leftColumns = leftColInfos.map(colInfoMap);
        }

        if (rightColInfos) {
            rightColumns = rightColInfos.map(colInfoMap);
        }

        var workItem = xcalarJoinWorkItem(unsortedLeft, unsortedRight, dst,
                                          joinType, leftColumns,
                                          rightColumns, evalString, coll);

        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarJoin(tHandle, unsortedLeft, unsortedRight, dst,
                             joinType, leftColumns, rightColumns,
                             evalString, coll);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'join', dst, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dst, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarJoin", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarGroupByWithInput = function(txId, inputStruct) {
    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarGroupByWorkItem("", "", [], []);
    workItem.input.groupByInput = inputStruct;

    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarGroupByWithWorkItem(tHandle, workItem);
    }

    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'groupBy',
                            inputStruct.dest, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, inputStruct.dest,
                            ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGroupBy", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarGroupByWithEvalStrings = function(newColNames, evalStrs, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName,
                       groupAll, txId) {
    if (Transaction.checkCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }
    newKeyFieldName = newKeyFieldName || "";
    incSample = incSample || false;
    icvMode = icvMode || false;

    var deferred = PromiseHelper.deferred();
    var query;

    newColNames = (newColNames instanceof Array) ? newColNames : [newColNames];
    evalStrs = (evalStrs instanceof Array) ? evalStrs : [evalStrs];

    if (evalStrs.length !== newColNames.length) {
        return PromiseHelper.reject("invalid args");
    }

    for (var i = 0; i < evalStrs.length; i++) {
        if (evalStrs[i].length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject("Eval string too long");
        }
    }

    getUnsortedTableName(tableName, null, txId)
    .then(function(unsortedTableName) {
        if (Transaction.checkCanceled(txId)) {
            return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
        }
        var workItem = xcalarGroupByWorkItem(unsortedTableName, newTableName,
                                             evalStrs, newColNames, incSample,
                                             icvMode, newKeyFieldName,
                                             groupAll);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall({
                "tableName": newTableName
            });
        } else {
            def = xcalarGroupBy(tHandle, unsortedTableName, newTableName,
                                 evalStrs, newColNames, incSample, icvMode,
                                 newKeyFieldName, groupAll);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, 'groupBy', newTableName, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, newTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGroupBy", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarGroupBy = function(operators, newColNames, aggColNames, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName,
                       groupAll, txId) {
    var evalStrs = [];

    operators = (operators instanceof Array) ? operators : [operators];
    newColNames = (newColNames instanceof Array) ? newColNames : [newColNames];
    aggColNames = (aggColNames instanceof Array) ? aggColNames : [aggColNames];
    if (operators.length !== newColNames.length ||
        operators.length !== aggColNames.length) {
        return PromiseHelper.reject("invalid args");
    }

    for (var i = 0, len = operators.length; i < len; i++) {
        var op = operators[i];
        if (!op) {
            // XXX to do, check if the operator is valid as XIApi.genAggStr
            return PromiseHelper.reject("Wrong operator! " + operator);
        }
        op = op.slice(0, 1).toLowerCase() + op.slice(1);
        var evalStr = op + "(" + aggColNames[i] + ")";
        evalStrs.push(evalStr);
    }
    return XcalarGroupByWithEvalStrings(newColNames, evalStrs, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName,
                       groupAll, txId);
};

XcalarProject = function(columns, tableName, dstTableName, txId) {
    var deferred = PromiseHelper.deferred();
    var query;
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    getUnsortedTableName(tableName, null, txId)
    .then(function(unsortedTableName) {
        if (Transaction.checkCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarProjectWorkItem(columns.length, columns,
                                             unsortedTableName, dstTableName);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarProject(tHandle, columns.length, columns,
                                 unsortedTableName, dstTableName);
        }
        query = XcalarGetQuery(workItem); // XXX May not work? Have't tested
        Transaction.startSubQuery(txId, 'project', dstTableName, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarProject", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// rename map is an arry of array
// if unionType is unionExcept or unionIntersect, it's actually the named
// operation and not union
// unionType is unionStandard, unionIntersect, unionExcept
XcalarUnion = function(tableNames, newTableName, colInfos, dedup, unionType,
                       txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    tableNames = (tableNames instanceof Array) ? tableNames : [tableNames];
    colInfos = (colInfos instanceof Array) ? colInfos : [colInfos];
    dedup = dedup || false;
    unionType = unionType || UnionOperatorT.UnionStandard;

    var query;
    var getUnsortedTablesInUnion = function() {
        var innerDeferred = PromiseHelper.deferred();
        var unsortedTables = [];

        var promises = tableNames.map(function(tableName, index) {
            return getUnsortedTableName(tableName, null, txId)
                    .then(function(unsortedTableName) {
                        unsortedTables[index] = unsortedTableName;
                    });
        });

        PromiseHelper.when.apply(this, promises)
        .then(function() {
            innerDeferred.resolve(unsortedTables);
        })
        .fail(innerDeferred.reject);

        return innerDeferred.promise();
    };

    getUnsortedTablesInUnion()
    .then(function(sources) {
        if (Transaction.checkCanceled(txId)) {
            return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
        }

        var columns = colInfos.map(function(renameListForOneTable) {
            return renameListForOneTable.map(colInfoMap);
        });
        var workItem = xcalarUnionWorkItem(sources, newTableName, columns,
                                           dedup, unionType);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarUnion(tHandle, sources, newTableName, columns, dedup,
                              unionType);
        }
        query = XcalarGetQuery(workItem); // XXX test
        Transaction.startSubQuery(txId, 'union', newTableName, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, newTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUnion", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};


XcalarGenRowNum = function(srcTableName, dstTableName, newFieldName, txId) {
    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // DO NOT GET THE UNSORTED TABLE NAMEEE! We actually want the sorted order
    var workItem = xcalarApiGetRowNumWorkItem(srcTableName, dstTableName,
                                              newFieldName);
    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarApiGetRowNum(tHandle, newFieldName, srcTableName,
                                  dstTableName);
    }
    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, 'genRowNum', dstTableName, query);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
             // XXX This part doesn't work yet
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGenRowNum", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarArchiveTable = function(srcTableNames) {
    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarArchiveTablesWorkItem(srcTableNames, true);
    xcalarArchiveTables(tHandle, srcTableNames)
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            // XXX This part doesn't work yet
            //Transaction.log(txId, query, srcTableNames, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarArchiveTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// PSA!!! This place does not check for unsorted table. So the caller
// must make sure that the first table that is being passed into XcalarQuery
// is an unsorted table! Otherwise backend may crash
// txId does not need to be passed in if xcalarquery not called inside a transaction
XcalarQuery = function(queryName, queryString, txId, bailOnError) {
    /* some test case :
        Old format(deprecated)
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"
        New Format:
            JSON.stringify([{"operation":"XcalarApiFilter",
                            "args":{"source":"gdelt#LR0",
                                    "dest":"test",
                                    "eval":[{"evalString":"eq(gdelt::column1, \"20080514\")","newField":null}]
                                    }
                            }])
    */
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        console.info('cancelation detected');
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    //Default behavior is true so if null or undefined, then should be set to true
    if (bailOnError == null) {
        bailOnError = true; // Stop running query on error
    }
    var latencyOptimized = false; // New backend flag
    xcalarQuery(tHandle, queryName, queryString, true, bailOnError,
                latencyOptimized)
    .then(function() {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId != null) {
                Transaction.startSubQuery(txId, queryName, null, queryString);
            }
            deferred.resolve();
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQuery", error);
        Log.errorLog("XcalarQuery", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// for queries or retinas
XcalarQueryState = function(queryName, statusesToIgnore) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryState(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = queryStateErrorStatusHandler(error, statusesToIgnore);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

function queryStateErrorStatusHandler(error, statusesToIgnore) {
    var thriftError;
    var status = error.xcalarStatus;
    if (statusesToIgnore && statusesToIgnore.indexOf(status) > -1) {
        thriftError = {status: status, error: "Error:" + StatusTStr[status]};
    } else {
        thriftError = thriftLog("XcalarQueryState", error);
        Log.errorLog("XcalarQueryState", null, null, thriftError);
    }

    return (thriftError);
}

// used to check when a query finishes or when a queryCancel finishes
XcalarQueryCheck = function(queryName, canceling) {
    // function getDagNodeStatuses(dagOutput) {
    //     var nodeStatuses = {};
    //     for (var i = 0; i < dagOutput.length; i++) {
    //         var tableName = dagOutput[i].name.name;
    //         if (tableName.indexOf(gDSPrefix) > -1) {
    //             tableName = tableName.substring(tableName.indexOf(gDSPrefix));
    //         }
    //         var state = dagOutput[i].state;
    //         nodeStatuses[tableName] = DgDagStateTStr[state];
    //     }
    //     return nodeStatuses;
    // }
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    var checkTime = 1000;// 1s per check
    if (canceling) {
        checkTime = 2000;
    }
    cycle();

    function cycle() {
        setTimeout(function() {
            XcalarQueryState(queryName)
            .then(function(queryStateOutput) {
                // var nodeStatuses =
                //         getDagNodeStatuses(queryStateOutput.queryGraph.node);
                var state = queryStateOutput.queryState;
                if (state === QueryStateT.qrFinished ||
                    state === QueryStateT.qrCancelled) {
                    // clean up query when done
                    XcalarQueryDelete(queryName)
                    .always(function() {
                        deferred.resolve(queryStateOutput);
                    });
                } else if (state === QueryStateT.qrError) {
                    // clean up query when done
                    XcalarQueryDelete(queryName)
                    .always(function() {
                        deferred.reject(queryStateOutput.queryStatus);
                    });
                } else {
                    cycle();
                }
            })
            .fail(function() {
                if (canceling) {
                    XcalarQueryDelete(queryName);
                }
                deferred.reject.apply(this, arguments);
            });
        }, checkTime);
    }

    return (deferred.promise());
};

XcalarQueryWithCheck = function(queryName, queryString, txId, bailOnError) {
    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    XcalarQuery(queryName, queryString, txId, bailOnError)
    .then(function() {
        return XcalarQueryCheck(queryName);
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            var timeElapsed = ret.elapsed.milliseconds;
            Transaction.log(txId, queryString, undefined, timeElapsed);
            deferred.resolve.apply(this, arguments);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQuery" + queryName, error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

function queryErrorStatusHandler(error, statusesToIgnore, opOrQuery) {
    var thriftError;
    if (statusesToIgnore && error
        && (error.xcalarStatus !== undefined)
        && statusesToIgnore.indexOf(error.xcalarStatus) > -1) {
        thriftError = {status: error.xcalarStatus, error: "Error:" + StatusTStr[error.xcalarStatus]};
    } else {
        thriftError = thriftLog("XcalarCancel" + opOrQuery, error);
        Log.errorLog("Cancel " + opOrQuery, null, null, thriftError);
    }

    return (thriftError);
}

XcalarQueryCancel = function(queryName, statusesToIgnore) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryCancel(tHandle, queryName)
    .then(function() {
        // will delete query when done checking
        XcalarQueryCheck(queryName, 2000);
        deferred.resolve.apply(this, arguments);
    })
    .fail(function(error) {
        var thriftError = queryErrorStatusHandler(error, statusesToIgnore,
                                                  "Query");
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarQueryDelete = function(queryName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryDelete(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQueryDelete" + queryName, error);
        Log.errorLog("Xcalar Query Delete " + queryName, null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/**
 * XcalarCancelOp
 * @param {Array} statusesToIgnore - array of status numbers to ignore
 *      (when attempting to cancel a query, we cancel all future subqueries
 *      even when the dstTableName doesn't exist yet -- this produces errors)
 */
XcalarCancelOp = function(dstTableName, statusesToIgnore) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiCancelOp(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = queryErrorStatusHandler(error, statusesToIgnore,
                                                  "Op");
        deferred.reject(thriftError);
    });

    return (deferred.promise());

};

XcalarGetDag = function(tableName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarDag(tHandle, tableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDag", error);
        Log.errorLog("Get Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarTagDagNodes = function(tagName, dagNodeNames) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (typeof(dagNodeNames) === "string") {
        dagNodeNames = [dagNodeNames];
    }

    var dagNodes = [];
    for (var i = 0; i < dagNodeNames.length; i++) {
        var namedInput = new XcalarApiNamedInputT();
        namedInput.name = dagNodeNames[i];
        // XXX can also use nodeId
        dagNodes.push(namedInput);
    }
    xcalarTagDagNodes(tHandle, tagName, dagNodes)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTagDagNodes", error);
        Log.errorLog("Tag Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarCommentDagNodes = function(comment, dagNodeNames) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (typeof(dagNodeNames) === "string") {
        dagNodeNames = [dagNodeNames];
    }

    xcalarCommentDagNodes(tHandle, comment, dagNodeNames.length, dagNodeNames)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarCommentDagNodes", error);
        Log.errorLog("Comment Dag", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/*
 * sourceArgs:
 *  targetname: "Default Shared Root",
 *  path: "/",
 *  fileNampattern: ""
 *  recursive: false
 */
XcalarListFiles = function(args) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var recursive = (args.recursive === true) ? true : false;
    // var namePatternArray = getNamePattern(path, recursive);
    var sourceArgs = new DataSourceArgsT();
    sourceArgs.targetName = args.targetName;
    sourceArgs.path = args.path;
    sourceArgs.fileNamePattern = args.fileNamePattern;
    sourceArgs.recursive = recursive;

    xcalarListFiles(tHandle, sourceArgs)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListFiles", error);
        Log.errorLog("List Files", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarSynthesize = function(srcTableName, dstTableName, columns, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    var query;

    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    getUnsortedTableName(srcTableName, null, txId)
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkCanceled(txId)) {
            return deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise();
        }

        var columnArray = columns.map(colInfoMap);
        var workItem = xcalarApiSynthesizeWorkItem(unsortedSrcTablename,
                                                    dstTableName,
                                                    columnArray);
        var def;
        if (Transaction.isSimulate(txId)) {
            def = fakeApiCall();
        } else {
            def = xcalarApiSynthesize(tHandle, unsortedSrcTablename,
                                        dstTableName, columnArray);
        }
        query = XcalarGetQuery(workItem);
        Transaction.startSubQuery(txId, "synthesize", dstTableName, query);

        return def;
    })
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, dstTableName, ret.timeElapsed);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSynthesize", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// XXX TODO THIS NEEDS TO HAVE A Log.add
// This tableArray is an array of structs.
// Each struct is of the form: numColumns, tableName, columnNames
// TableName is of the form namedInput columnNames is just an array of strings
// that correspond to the column names
// If you have 2 DFs in your DF, put the last table of both DFs into the
// tableArray
// When you call makeRetina, we duplicate the DAG, append an export DAG node,
// and give it all new DagNodeIds. So when you call updateRetina, make sure to
// pass in the DagNodeIds that are part of this new Retina instead of the
// original DAG
XcalarMakeRetina = function(retName, tableArray, srcTables, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1 ||
        retName === "" || retName == null ||
        tableArray == null || tableArray.length <= 0)
    {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarMakeRetinaWorkItem(retName, tableArray);
    xcalarMakeRetina(tHandle, retName, tableArray, srcTables)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeRetina", error);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListRetinas = function() {
    // XXX This function is wrong because it does not take in a tablename even
    // though it should. Hence we just assume that all retinas belong to the
    // leftmost table.
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListRetinas(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListRetinas", error);
        Log.errorLog("List Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetRetina = function(retName) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetRetina", error);
        Log.errorLog("Get Retinas", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetRetinaJson = function(retName) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetRetinaJson(tHandle, retName)
    .then(function(ret) {
        var json = JSON.parse(ret.retinaJson);
        deferred.resolve(json);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetRetinaJson", error);
        Log.errorLog("Get Retina Json", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

// XXX TODO THIS NEEDS TO HAVE Log.add

// paramType must be either of the following:
// XcalarApisT.XcalarApiBulkLoad,
// XcalarApisT.XcalarApiFilter,
// XcalarApisT.XcalarApiExport

// paramValue is what the parameterized part is called
// For example, in load, the path is parameterizable, and your url can
// be something like "file:///<directory>/<subDir>/file<number>.csv" <- paramValue
// For eval string, you will pass in something like "filter(gt(column1, \"hello\""))"
// replaced with "filter(<opera>(<colName>, <val>))"
// val = \"hello\"
// <argument> is used to denote a parameter
XcalarUpdateRetina = function(retName, tableName, paramValues, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    XcalarGetRetinaJson(retName)
    .then(function(retJson) {
        var queries = retJson.query;

        for (var i = 0; i < queries.length; i++) {
            var args = queries[i].args;
            if (args.dest === tableName) {
                queries[i].args = paramValues;
                break;
            }
        }

        return xcalarUpdateRetina(tHandle, retName, JSON.stringify(retJson));
    })
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUpdateRetina", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};



// Don't call this for now. When bohan's change for 8137 is fixed, we will
// no longer call updateRetina for export changes and instead switch to this
XcalarUpdateRetinaExport = function(retName, dagNodeId, target, specInput,
                                  createRule, sorted) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarUpdateRetinaExport(tHandle, retName, dagNodeId, target, specInput,
        createRule, sorted)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUpdateRetinaExport", error);
        Log.errorLog("Update Retina Export Node", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

// XXX TODO Log.add
// param has 2 string values: param.paramName, param.paramValue
// params is an array of param.
// For example, if my paramValue was "filter(<opera>(<colName>, <val>))"
// then, params = [{"paramName":"opera", "paramValue":"lt"},
// {"pN":"colName", "pV":"column5"}, {, "pV":"\"hello\""}]
XcalarExecuteRetina = function(retName, params, options, txId) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    options = options || {};
    // If activeSession is true, it exports to the
    // current active session and creates a table
    // with newTableName

    var activeSession = options.activeSession || false;
    var newTableName = options.newTableName || "";
    var queryName = options.queryName || undefined;

    var latencyOptimized = false; // This is for IMD, invoked via APIs.
    var workItem = xcalarExecuteRetinaWorkItem(retName, params, activeSession,
        newTableName, queryName, latencyOptimized);
    var def;
    if (Transaction.isSimulate(txId)) {
        def = fakeApiCall();
    } else {
        def = xcalarExecuteRetina(tHandle, retName, params, activeSession,
            newTableName, queryName, latencyOptimized);
    }

    var query = XcalarGetQuery(workItem);
    var transactionOptions = {
        retName: retName
    };
    Transaction.startSubQuery(txId, SQLOps.Retina, retName, query,
                                  transactionOptions);

    def
    .then(function(ret) {
        if (Transaction.checkCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, query, retName, ret.timeElapsed,
                            transactionOptions);
            deferred.resolve(ret);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarExecuteRetina", error);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListParametersInRetina = function(retName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarListParametersInRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListParametersInRetina", error);
        Log.errorLog("ListParametersInRetina", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeleteRetina = function(retName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarApiDeleteRetinaWorkItem(retName);
    xcalarApiDeleteRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiDeleteRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarImportRetina = function(retinaName, overwrite, retina, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarApiImportRetinaWorkItem(retinaName, overwrite,
    //                                              retina);
    xcalarApiImportRetina(tHandle, retinaName, overwrite, retina)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarImportRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarExportRetina = function(retName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (Transaction.checkCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarApiExportRetinaWorkItem(retName);
    xcalarApiExportRetina(tHandle, retName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarExportRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarDeleteSched = function(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deleteInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleDelete", true, JSON.stringify(deleteInput))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        var defRes;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        var thriftError = thriftLog("XcalarDeleteSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarCreateSched = function(scheduleKey, retName, substitutions, options, timingInfo)
{
    // Substitutions is the exact same format as the params argument to
    // xcalarExecuteRetina.  If that changes, this implementation will change
    // well to follow.
    // options is the same as the output of getAdvancedExportOption in dfCard
    // Additionally, options can also include "usePremadeCronString" : true
    // In which case there MUST also be a "premadeCronString" present in options
    // which MUST be of the form of a valid cron string:
    // e.g. "* * * * *". "1-2, */4 * 4,7 *", etc.
    // As of right now, activeSession and newTableName do nothing
    // Example:
    // var options = {
    //     "activeSession": false,
    //     "newTableName": "",
    //     "usePremadeCronString": true,
    //     "premadeCronString": "* * 3 * *"
    // }
    // timingInfo format is identical to a similar struct in scheduleView.js:
    //   var timingInfo = {
    //        "startTime": startTime, // In milliseconds
    //        "dateText": date, // String
    //        "timeText": time, // String
    //        "repeat": repeat, // element in scheduleFreq in Scheduler
    //        "modified": currentTime, // In milliseconds
    //    };

    var appInObj = {
        "scheduleKey": scheduleKey,
        "retName": retName,
        "substitutions": substitutions,
        "options": options,
        "timingInfo": timingInfo
    };
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleCreate", true, JSON.stringify(appInObj))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        var defRes;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else if (innerParsed === "-3") {
            // Schedule with that ID already exists
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        var thriftError = thriftLog("XcalarCreateSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUpdateSched = function(scheduleKey, retName, substitutions, options, timingInfo)
{
    // Substitutions is the exact same format as the params argument to
    // xcalarExecuteRetina.  If that changes, this implementation will change
    // well to follow.
    // options is the same as the output of getAdvancedExportOption in dfCard
    // Additionally, options can also include "usePremadeCronString" : true
    // In which case there MUST also be a "premadeCronString" present in options
    // which MUST be of the form of a valid cron string:
    // e.g. "* * * * *". "1-2, */4 * 4,7 *", etc.
    // As of right now, activeSession and newTableName do nothing
    // Example:
    // var options = {
    //     "activeSession": false,
    //     "newTableName": "",
    //     "usePremadeCronString": true,
    //     "premadeCronString": "* * 3 * *"
    // }
    // timingInfo format is identical to a similar struct in scheduleView.js:
    //   var timingInfo = {
    //        "startTime": startTime, // In milliseconds
    //        "dateText": date, // String
    //        "timeText": time, // String
    //        "repeat": repeat, // element in scheduleFreq in Scheduler
    //        "modified": currentTime, // In milliseconds
    //    };

    var appInObj = {
        "scheduleKey": scheduleKey,
        "retName": retName,
        "substitutions": substitutions,
        "options": options,
        "timingInfo": timingInfo
    };
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleUpdate", true, JSON.stringify(appInObj))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        var defRes;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else if (innerParsed === "-3") {
            // Schedule with that ID already exists
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error1) {
        var thriftError = thriftLog("XcalarUpdateSchedule", error1);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};


XcalarListSchedules = function(scheduleKey, hasRunResults) {
    // scheduleKey can be an *exact* schedule key,
    // or emptystring, in which case all schedules are listed
    // No support for patterns yet
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var listInput = {
        "scheduleKey": scheduleKey,
        "hasRunResults": hasRunResults
    };

    XcalarAppExecute("ScheduleList", true, JSON.stringify(listInput))
    // XcalarAppExecute("listschedule", true, JSON.stringify(listInput))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        // InnerParsed is an array of objects that have fields "scheduleMain"
        // and "scheduleResults".  "scheduleMain" is an object of the form
        // of the input obj to XcalarCreateSched.  "scheduleResults" is
        // an object of the form
        // resultObj = {
        //     "startTime" : milliseconds
        //     "parameters": parameters
        //     "status" : StatusT
        //     "endTime" : milliseconds
        //     "exportLoc" : "Default"
        // }
        deferred.resolve(innerParsed);
    })
    .fail(function(error1) {
        var thriftError = thriftLog("XcalarListSchedule", error1);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarPauseSched = function(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var pauseInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = PromiseHelper.deferred();
    XcalarAppExecute("SchedulePause", true, JSON.stringify(pauseInput))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        var defRes;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarPauseSched", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarResumeSched = function(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var resumeInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = PromiseHelper.deferred();
    XcalarAppExecute("ScheduleResume", true, JSON.stringify(resumeInput))
    .then(function(result) {
        var innerParsed;
        try {
            // App results are formatted this way
            var outerParsed = JSON.parse(result.outStr);
            innerParsed = JSON.parse(outerParsed[0]);
        } catch (err) {
            deferred.reject("Failed to parse extension output.");
        }
        var defRes;
        if (innerParsed === "0") {
            // Success
            defRes = true;
        } else if (innerParsed === "-1") {
            // Couldn't get lock
            defRes = false;
        } else if (innerParsed === "-2") {
            // Lost lock in the middle of operation, after editing cron
            // but before editing kv due to force unlock
            // best effort made to undo in cron, during this undo period
            // inconsistencies possible
            defRes = false;
        } else {
            defRes = false;
        }
        deferred.resolve(defRes);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarResumeSched", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
};

XcalarKeyLookup = function(key, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyLookup(tHandle, scope, key)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyLookup", error);
        // it's normal to find an unexisted key.
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            console.warn("Status", error, "Key, not found");
            deferred.resolve(null);
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Lookup", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeyList = function(keyRegex, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyList(tHandle, scope, keyRegex)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyList", error);
        Log.errorLog("Key List", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarKeyPut = function(key, value, persist, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
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
        Log.errorLog("Key Put", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarKeyDelete = function(key, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
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
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn(thriftError, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Delete", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeySetIfEqual = function(scope, persist, keyCompare, oldValue, newValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarKeySetIfEqual(tHandle, scope, persist, keyCompare, oldValue, newValue)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeySetIfEqual", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound) {
            deferred.resolve(null, true);
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null, true);
        } else {
            Log.errorLog("Key Set If Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarKeySetBothIfEqual = function(scope, persist, keyCompare, oldValue, newValue,
                                 otherKey, otherValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
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
        } else if (thriftError.status === StatusT.StatusKvStoreNotFound) {
            console.warn("Status", error, "kvStore, not found");
            deferred.resolve(null);
        } else {
            Log.errorLog("Key Set If Both Equal", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());

};

XcalarKeyAppend = function(key, stuffToAppend, persist, scope) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (scope == null) {
        scope = XcalarApiKeyScopeT.XcalarApiKeyScopeGlobal;
    }

    xcalarKeyAppend(tHandle, scope, key, stuffToAppend)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarKeyAppend", error);
        if (thriftError.status === StatusT.StatusKvEntryNotFound ||
            thriftError.status === StatusT.StatusKvStoreNotFound)
        {
            console.info("Append fails as key or kvStore not found, put key instead");
            // if append fails because key not found, put value instead
            xcalarKeyAddOrReplace(tHandle, scope, key, stuffToAppend, persist)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            Log.errorLog("Key Append", null, null, thriftError);
            deferred.reject(thriftError);
        }
    });

    return (deferred.promise());
};

XcalarGetOpStats = function(dstTableName) {
    if (!dstTableName) {
        console.warn('no dsttablename');
    }
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetOpStats(tHandle, dstTableName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetOpStats", error);
        Log.errorLog("XcalarGetOpStats", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarApiTop = function(measureIntervalInMs) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    measureIntervalInMs = measureIntervalInMs ||
                          XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs;

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiTop(tHandle, measureIntervalInMs, 0)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiTop", error);
        Log.errorLog("XcalarApiTop", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetMemoryUsage = function(userName, userId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetMemoryUsage(tHandle, userName, userId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiGetMemoryUsage", error);
        Log.errorLog("XcalarApiGetMemoryUsage", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetAllTableMemory = function() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    XcalarGetTables()
    .then(function(ret) {
        var tableArray = ret.nodeInfo;
        var totalSize = 0;
        for (var i = 0; i<tableArray.length; i++) {
            totalSize += ret.nodeInfo[i].size;
        }
        deferred.resolve(totalSize);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetAllMemory", error);
        Log.errorLog("XcalarGetAllMemory", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListXdfs = function(fnNamePattern, categoryPattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiListXdfs(tHandle, fnNamePattern, categoryPattern)
    .then(function(listXdfsOutput) {
        // xx remove findMinIdx until backend fixes crashes
        for (var i = 0; i < listXdfsOutput.fnDescs.length; i++) {
            if (listXdfsOutput.fnDescs[i].fnName === "findMinIdx") {
                listXdfsOutput.fnDescs.splice(i , 1);
                listXdfsOutput.numXdfs--;
                i--;
            } else {
                listXdfsOutput.fnDescs[i].displayName = listXdfsOutput.fnDescs[i]
                                                    .fnName.split("/").pop();
            }
        }
        deferred.resolve(listXdfsOutput);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListXdf", error);
        Log.errorLog("List Xdf", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUploadPythonRejectDuplicate = function(moduleName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfAdd(tHandle, UdfTypeT.UdfTypePython, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        if (error && error.output && error.output.error &&
            error.output.error.message &&
            error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        thriftError = thriftLog("XcalarUdfUpload", error);
        Log.errorLog("Upload Python", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUploadPython = function(moduleName, pythonStr, absolutePath) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName && !absolutePath) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }

    xcalarApiUdfAdd(tHandle, UdfTypeT.UdfTypePython, moduleName, pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUploadPython", error);
        if (thriftError.status === StatusT.StatusUdfModuleAlreadyExists) {
            XcalarUpdatePython(moduleName, pythonStr)
            .then(function() {
                deferred.resolve();
            })
            .fail(function(error2) {
                if (error2 && error2.output &&
                    error2.output.error &&
                    error2.output.error.message &&
                    error2.output.error.message.length > 0) {
                    error2 = error2.output.error.message;
                }
                thriftError = thriftLog("XcalarUpdateAfterUpload", error2);
                Log.errorLog("Update of Upload Python", null, null,
                             thriftError);
                deferred.reject(thriftError);
            });
            return;
            // here do the update call
        } else if (thriftError.status === StatusT.StatusUdfModuleEmpty) {
            // This is not an error because extensions may upload
            // empty udfs. So just go ahead and resolve
            deferred.resolve();
            return;
        }

        // all other case

        if (error && error.output && error.output.error &&
            error.output.error.message &&
            error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        thriftError = thriftLog("XcalarUdfUpload", error);
        Log.errorLog("Upload Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUpdatePython = function(moduleName, pythonStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfUpdate(tHandle, UdfTypeT.UdfTypePython, moduleName,
                       pythonStr)
    .then(deferred.resolve)
    .fail(function(error) {
        if (error && error.output
            && error.output.error
            && error.output.error.message
            && error.output.error.message.length > 0) {
            error = error.output.error.message;
        }
        var thriftError = thriftLog("XcalarUpdatePython", error);
        Log.errorLog("Update Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeletePython = function(moduleName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }
    if (moduleName) {
        moduleName = moduleName.split("/").pop(); // remove absolute path
    }
    xcalarApiUdfDelete(tHandle, moduleName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeletePython", error);
        Log.errorLog("Delete Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDownloadPython = function(moduleName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    // fromWhichWorkbook can be null

    xcalarApiUdfGet(tHandle, moduleName)
    .then(function(output) {
        deferred.resolve(output.source);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDownloadPython", error);
        Log.errorLog("Download Python", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarMemory = function() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiMemory(tHandle, null)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMemory", error);
        Log.errorLog("XcalarMemory", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetQuery = function(workItem) {
    return xcalarApiGetQuery(tHandle, workItem);
};

XcalarNewWorkbook = function(newWorkbookName, isCopy, copyFromWhichWorkbook) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionNew(tHandle, newWorkbookName, isCopy,
                        copyFromWhichWorkbook)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarNewWorkbook", error);
        Log.errorLog("New Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeleteWorkbook = function(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionDelete(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeleteWorkbook", error);
        Log.errorLog("Delete Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDeactivateWorkbook = function(workbookName, noCleanup) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionInact(tHandle, workbookName, noCleanup)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeactivateWorkbook", error);
        Log.errorLog("InActive Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarListWorkbooks = function(pattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionList(tHandle, pattern)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListWorkbooks", error);
        Log.errorLog("List Workbooks", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarSaveWorkbooks = function(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionPersist(tHandle, workbookName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSaveWorkbooks", error);
        Log.errorLog("Save Workbooks", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarSwitchToWorkbook = function(toWhichWorkbook, fromWhichWorkbook) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionSwitch(tHandle, toWhichWorkbook, fromWhichWorkbook,
                           gSessionNoCleanup)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSwitchToWorkbook", error);
        Log.errorLog("Switch Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

// XXX this function is temporarily using SessionSwitch to
// produce the multiple active workbook behavior
// switch this to use the correct API when Bug 11523 is ready
XcalarActivateWorkbook = function(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionSwitch(tHandle, workbookName, "notExists12345XYZ", true)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarActivateWorkbook", error);
        Log.errorLog("Activate Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

XcalarRenameWorkbook = function(newName, oldName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    // fromWhichWorkbook can be null
    xcalarApiSessionRename(tHandle, newName, oldName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarRenameWorkbook", error);
        Log.errorLog("Rename Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarUploadWorkbook = function(workbookName, workbookContent,
                                pathToAdditionalFiles) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionUpload(tHandle, workbookName, workbookContent, pathToAdditionalFiles)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUploadWorkbook", error);
        Log.errorLog("Upload Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarDownloadWorkbook = function(workbookName, pathToAdditionalFiles) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();

    xcalarApiSessionDownload(tHandle, workbookName, pathToAdditionalFiles)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDownloadWorkbook", error);
        Log.errorLog("Upload Workbook", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarGetStatGroupIdMap = function(nodeId, numGroupId) {
    // nodeId is the node (be 0, 1, 2, 3, 4)
    // numGroupId is the max number of statue you want to return
    if (tHandle == null) {
        return PromiseHelper.resolve();
    }

    var deferred = PromiseHelper.deferred();

    if (insertError(arguments.callee, deferred)) {
        return deferred.promise();
    }

    xcalarGetStatGroupIdMap(tHandle, nodeId, numGroupId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetStatGroupIdMap", error);
        Log.errorLog("Get StatGroupIdMap", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarSupportGenerate = function(miniBundle, supportId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    xcalarApiSupportGenerate(tHandle, miniBundle, supportId)
    .then(function(ret) {
        console.log("Support bundle path: " + ret.bundlePath);
        console.log("Support bundle id: " + ret.supportId);
        console.log("Support bundle set: " + ret.supportBundleSent);
        deferred.resolve(ret);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSupportGenerate", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppSet = function(name, hostType, duty, execStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    xcalarAppSet(tHandle, name, hostType, duty, execStr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAppSet", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppRun = function(name, isGlobal, inStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    xcalarAppRun(tHandle, name, isGlobal, inStr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAppRun", error);
        Log.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
};

XcalarAppReap = function(name, appGroupId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = PromiseHelper.deferred();
    xcalarAppReap(tHandle, appGroupId)
    .then(deferred.resolve)
    .fail(function(error) {
        var outError;
        if (typeof error === "object" && error.errStr) {
            try {
                outError = JSON.parse(error.errStr)[0][0];
            } catch (e) {
                outError = error;
            }
        } else {
            outError = thriftLog("XcalarAppReap", error);
        }
        Log.errorLog("App Reap", null, null, outError);
        deferred.reject(outError);
    });
    return (deferred.promise());
};

XcalarAppExecute = function(name, isGlobal, inStr) {
    var deferred = PromiseHelper.deferred();

    XcalarAppRun(name, isGlobal, inStr)
    .then(function(ret) {
        var appGroupId = ret.appGroupId;
        return XcalarAppReap(name, appGroupId);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
};

XcalarDemoFileCreate = function(fileName) {
    var deferred = PromiseHelper.deferred();

    xcalarDemoFileCreate(tHandle, fileName)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileCreate", retJson.error);
            Log.errorLog("Create Demo File", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileCreate", error);
        Log.errorLog("Create Demo File", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

// Max size 45MB
XcalarDemoFileAppend = function(fileName, fileContents) {
    var deferred = PromiseHelper.deferred();
    if (fileContents.length > gUploadChunkSize) {
        return PromiseHelper.reject("File chunk must be less than 45MB");
    }

    xcalarDemoFileAppend(tHandle, fileName, fileContents)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileAppend", retJson.error);
            Log.errorLog("Append to demo file", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileAppend", error);
        Log.errorLog("Append to demo file", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarDemoFileDelete = function(fileName) {
    var deferred = PromiseHelper.deferred();
    xcalarDemoFileDelete(tHandle, fileName)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileDelete", retJson.error);
            Log.errorLog("Delete demo file", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileDelete", error);
        Log.errorLog("Delete demo file", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarLogLevelGet = function() {
    var deferred = PromiseHelper.deferred();
    xcalarLogLevelGet(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarLogLevelGet", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

XcalarLogLevelSet = function(loglevel, logFlush) {
    var deferred = PromiseHelper.deferred();
    xcalarLogLevelSet(tHandle, loglevel, logFlush)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarLogLevelSet", error);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
};

/*
 * targetName: "mgmtdtest target";
 * targetType: "shared";
 * targetParams = {"mountpoint": "/netstore"};
 */
XcalarTargetCreate = function(targetType, targetName, targetParams) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    xcalarTargetCreate(tHandle, targetType, targetName, targetParams)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTargetCreate", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetDelete = function(targetName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    xcalarTargetDelete(tHandle, targetName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTargetDelete", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetList = function() {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    xcalarTargetList(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTargetList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarTargetTypeList = function() {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = PromiseHelper.deferred();
    xcalarTargetTypeList(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTargetTypeList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

// IMD APIs
XcalarListPublishedTables = function(pubPatternMatch) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    xcalarListPublishedTables(tHandle, pubPatternMatch)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListPublishedTables", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUnpublishTable = function(pubTableName, inactivateOnly) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    xcalarUnpublish(tHandle, pubTableName, inactivateOnly)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUnpublishTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarPublishTable = function(srcTableName, pubTableName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    var unixTS = 0; // TODO: Resolve whether XCE will stamp this instead
    xcalarApiPublish(tHandle, srcTableName, pubTableName, unixTS)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarPublishTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarUpdateTable = function(deltaTableNames, pubTableNames) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    var unixTS = 0;
    xcalarApiUpdate(tHandle, deltaTableNames, pubTableNames, unixTS)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarTargetTypeList", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarRefreshTable = function(pubTableName, dstTableName, minBatch, maxBatch, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    var workItem = xcalarApiSelectWorkItem(pubTableName, dstTableName,
                                           minBatch, maxBatch);
    var query = XcalarGetQuery(workItem);
    Transaction.startSubQuery(txId, SQLOps.RefreshTables, dstTableName, query);

    // Note max and min places are switched because the API is a little strange
    xcalarApiSelect(tHandle, pubTableName, dstTableName, maxBatch, minBatch)
    .then(function(ret) {
        Transaction.log(txId, query, dstTableName, ret.timeElapsed);
        deferred.resolve.apply(this, arguments);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarRefreshTable", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
};

XcalarRestoreTable = function(pubTableName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    xcalarRestoreTable(tHandle, pubTableName)
        .then(deferred.resolve)
        .fail(function (error) {
            var thriftError = thriftLog("XcalarRestoreTable", error);
            deferred.reject(thriftError);
        });

    return deferred.promise();
};

XcalarCoalesce = function(pubTableName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    xcalarCoalesce(tHandle, pubTableName)
        .then(deferred.resolve)
        .fail(function (error) {
            var thriftError = thriftLog("XcalarCoalesce", error);
            deferred.reject(thriftError);
        });

    return deferred.promise();
}
