var tHandle;

function setupThrift() {
    setupHostName();
    tHandle = xcalarConnectThrift(hostname);
}

function setupHostName() {
    if (window.hostname == null || window.hostname === "") {
        hostname = window.location.href;
        // remove path
        if (hostname.lastIndexOf(".html") > -1) {
            var index = hostname.lastIndexOf("/");
            hostname = hostname.substring(0, index);
        }
    }
    // protocol needs to be part of hostname
    // If not it's assumed to be http://
    var protocol = window.location.protocol;

    // If you have special ports, it needs to be part of the hostname
    if (!hostname.startsWith(protocol)) {
        hostname = "https://" + hostname;
    }
}
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
        if (status !== StatusT.StatusCanceled) {
            console.error('(╯°□°）╯︵ ┻━┻ ' + msg);
            xcConsole.log(msg);
        }

        errorLists.push(thriftError);
        var alertError;

        if (status === StatusT.StatusOk) {
            Support.checkConnection();
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

                SQL.backup();
                return thriftError;
            }
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
    return (gDSPrefix + dsName);
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

// will only make a backend call if unsorted source table is found but is inactive
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
                    xcAssert(indexInput.source.isTable);

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
                    xcAssert(indexInput1.source.isTable);
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
                    xcAssert(indexInput2.source.isTable);
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
            var newId;
            var key;

            if (!t1hasReadyState) {
                newId = Authentication.getHashId().split("#")[1];
                unsortedName1 = tableName.split("#")[0] + "#" + newId;
                key = indexInput1.keyName;
                promise1 = XcalarIndexFromTable(tableName, key, unsortedName1,
                                                order, null, true);
            } else {
                promise1 = PromiseHelper.resolve(null);
            }

            if (!t2hasReadyState) {
                newId = Authentication.getHashId().split("#")[1];
                unsortedName2 = otherTableName.split("#")[0] + "#" + newId;
                key = indexInput2.keyName;

                promise2 = XcalarIndexFromTable(otherTableName, key,
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
function XcalarGetVersion(connectionCheck) {
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
        if (connectionCheck) {
            // don't call thriftLog or else it may call XcalarGetVersion again
            deferred.reject("ConnectionCheck Failed", error);
        } else {
            deferred.reject(thriftLog("XcalarGetVersion()", error));
        }
    });

    return deferred.promise();
}

function XcalarGetLicense() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetLicense(tHandle)
    .then(deferred.resolve)
    .fail(function(ret) {
        console.error("Your license has not been properly set up!");
        deferred.resolve(StatusTStr[ret]);
    });

    return deferred.promise();
}

function XcalarUpdateLicense(newLicense) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
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
}

// Call this exactly with the url and isRecur that you
function XcalarPreview(url, fileNamePattern, isRecur, numBytesRequested, offset) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    url = xcHelper.encodeURL(url);

    if (offset == null) {
        offset = 0;
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    if (fileNamePattern == null) {
        fileNamePattern = "";
    }

    xcalarPreview(tHandle, url, fileNamePattern, isRecur,
                    numBytesRequested, offset)
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
        var thriftError = thriftLog("XcalarPreview", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

/*
 * options (example):
    {
        "fieldDelim": "",
        "recordDelim": "\n",
        "hasHeader": false,
        "moduleName": udfModule,
        "funcName": udfFunc,
        "isRecur": isRecur,
        "maxSampleSize": previewSize,
        "quoteChar": gDefaultQDelim,
        "skipRows": 0,
        "fileNamePattern": pattern,
        "udfQuery": udfQuery
    }
 */
function XcalarLoad(url, format, datasetName, options, txId) {
    options = options || {};
    var fieldDelim = options.fieldDelim;
    var recordDelim = options.recordDelim;
    var hasHeader = options.hasHeader;
    var moduleName = options.moduleName;
    var funcName = options.funcName;
    var isRecur = options.isRecur;
    var maxSampleSize = options.maxSampleSize;
    var quoteChar = options.quoteChar;
    var skipRows = options.skipRows;
    var fileNamePattern = options.fileNamePattern;

    url = xcHelper.encodeURL(url);

    if (options.udfQuery && typeof options.udfQuery === "object") {
        var queryData = encodeQueryData(options.udfQuery);
        if (queryData) {
            url += "?" + queryData;
        }
    }

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
                    Transaction.checkAndSetCanceled(txId);
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

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var formatType;
    switch (format) {
        case ("JSON"):
            formatType = DfFormatTypeT.DfFormatJson;
            break;
        case ("rand"):
            console.error("No longer supported");
            return PromiserHelper.reject("Rand format no longer supported");
        case ("raw"):
            // recordDelim = "\n";
            // No field delim
            fieldDelim = ""; // jshint ignore:line
            // fallthrough
        case ("CSV"):
            formatType = DfFormatTypeT.DfFormatCsv;
            break;
        case ("Excel"):
            formatType = DfFormatTypeT.DfFormatJson;
            fieldDelim = "\t";
            recordDelim = "\n";
            moduleName = "default";
            funcName = hasHeader ? "openExcelWithHeader" : "openExcel";
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
    loadArgs.csv.linesToSkip = skipRows;
    loadArgs.csv.quoteDelim = quoteChar;
    loadArgs.recursive = isRecur;
    loadArgs.fileNamePattern = fileNamePattern;

    if (hasHeader) {
        loadArgs.csv.hasHeader = true;
    } else {
        loadArgs.csv.hasHeader = false;
    }
    if (moduleName !== "" && funcName !== "") {
        loadArgs.udfLoadArgs = new XcalarApiUdfLoadArgsT();
        loadArgs.udfLoadArgs.fullyQualifiedFnName = moduleName + ":" + funcName;
    }

    if (maxSampleSize == null) {
        maxSampleSize = gMaxSampleSize;
    }

    if (maxSampleSize > 0) {
        console.log("Max sample size set to: ", maxSampleSize);
    }

    if (gDemoMemory) {
        url = url.replace("localfile:///", "memory://");
        url = url.replace("file:///", "memory://");
    } else if (gEnableLocalFiles) {
        url = url.replace("file:///", "localfile:///");
    }

    var workItem = xcalarLoadWorkItem(url, datasetName, formatType,
                                      maxSampleSize, loadArgs);

    var def1 = xcalarLoad(tHandle, url, datasetName, formatType, maxSampleSize,
                          loadArgs);
    var def2 = XcalarGetQuery(workItem);

    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'Import Dataset',
                                  parseDS(datasetName), query);
    });
    // We are using our .when instead of jQuery's because if load times out,
    // we still want to use the return for def2.
    PromiseHelper.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, parseDS(datasetName), ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        // 502 = Bad Gateway server error
        if (error1 && typeof(error1) === "object" &&
            (("status" in error1 && error1.status === 502) ||
            (error1.length > 0 && error1[0].status === 502))) {
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
            } else {
                Transaction.checkAndSetCanceled(txId);
                var thriftError = thriftLog("XcalarLoad", error1, error2);
                deferred.reject(thriftError);
            }
        } else {
            Transaction.checkAndSetCanceled(txId);
            var loadError = null;
            if (error1 && typeof(error1) === "object" && error1.length === 2) {
                // This has a valid error struct that we can use
                console.error("error in point", error1[1]);
                loadError = xcHelper.replaceMsg(DSTStr.LoadErr, {
                    "error": parseLoadError(error1[1])
                });

                if (error1[1].errorFile) {
                    loadError += " " + xcHelper.replaceMsg(DSTStr.LoadErrFile, {
                        "file": error1[1].errorFile
                    });
                }
            }
            var thriftError = thriftLog("XcalarLoad", error1[0], error2);
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
                res = res.split("\\n")[0]; // strip ending unuseful chars
                return res;
            }
        } catch (e) {
            console.error("parse error", e);
        }

        return res;
    }

    function encodeQueryData(data) {
        return Object.keys(data).map(function(key) {
            return [key, data[key]].map(encodeURIComponent).join("=");
        }).join("&");
    }
}

function XcalarAddLocalFSExportTarget(targetName, path, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
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
}

function XcalarAddUDFExportTarget(targetName, path, udfName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
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
}

function XcalarRemoveExportTarget(targetName, targetType) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
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
}

// typePattern: "*", "file", "udf"
function XcalarListExportTargets(typePattern, namePattern) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
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
}

function XcalarExport(tableName, exportName, targetName, numColumns,
                      backColName, frontColName, keepOrder, options, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var target = new ExExportTargetHdrT();
    target.type = ExTargetTypeT.ExTargetUnknownType;
    target.name = targetName;
    var specInput = new ExInitExportSpecificInputT();

    // var exportHandleName = options.handleName;

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
        var def1 = xcalarExport(tHandle, tableName, target, specInput,
                                options.createRule, keepOrder, numColumns,
                                columns, options.handleName);

        var def2;
        if (target.type === ExTargetTypeT.ExTargetSFType &&
            options.format === DfFormatTypeT.DfFormatCsv) {
            def2 = XcalarGetQuery(workItem);
            def2.then(function(query) {
                Transaction.startSubQuery(txId, 'Export', options.handleName,
                                          query);
            });
        } else {
            def2 = PromiseHelper.resolve("N/A");
        }

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, options.handleName, ret1.timeElapsed);
            // XXX There is a bug here that backend actually needs to fix
            // We must drop the export node on a successful export.
            // Otherwise you will not be able to delete your dataset
            xcalarDeleteDagNodes(tHandle, options.handleName,
                                 SourceTypeT.SrcExport)
            .always(function() {
                deferred.resolve(ret1);
            });
        }
    })
    .fail(function(error) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarExport", error);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarDestroyDataset(dsName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    if (Transaction.checkAndSetCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }

    var deferred = jQuery.Deferred();
    var dsNameBeforeParse = dsName;
    dsName = parseDS(dsName);

    releaseAllResultsets()
    .then(function() {
        return deleteDagNodeHelper();
    })
    .then(function() {
        return xcalarApiDeleteDatasets(tHandle, dsName);
    })
    .then(function() {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            deferred.resolve();
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarDestroyDataset", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();

    function deleteDagNodeHelper() {
        var innerDeferred = jQuery.Deferred();
        var workItem = xcalarDeleteDagNodesWorkItem(dsName,
                                                SourceTypeT.SrcDataset);
        var def1 = xcalarDeleteDagNodes(tHandle, dsName, SourceTypeT.SrcDataset);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'delete dataset', dsName + "drop",
                                      query);
        });

        jQuery.when(def1, def2)
        .then(function(delDagNodesRes, query) {
            // txId may be null if performing a
            // deletion not triggered by the user (i.e. clean up)
            console.log(txId, delDagNodesRes);
            if (txId != null) {
                Transaction.log(txId, query, dsName + "drop",
                                delDagNodesRes.timeElapsed);
            }
            innerDeferred.resolve();
        })
        .fail(function(error1, error2) {
            if (error1 === StatusT.StatusDagNodeNotFound) {
                // this error is allowed
                innerDeferred.resolve();
            } else {
                if (typeof error2 !== "number") {
                    error2 = null;
                }
                innerDeferred.reject(error1, error2);
            }
        });

        return innerDeferred.promise();
    }

    function releaseAllResultsets() {
        // always resolve to continue the deletion
        var innerDeferred = jQuery.Deferred();

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
}

function XcalarIndexFromDataset(datasetName, key, tablename, prefix, txId) {
    // Note: datasetName must be of the form username.hashId.dsName
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    datasetName = parseDS(datasetName);
    var dhtName = ""; // XXX TODO fill in later
    // XXX TRUE IS WRONG, THIS IS JUST TEMPORARY TO GET STUFF TO WORK
    var ordering = XcalarOrderingT.XcalarOrderingUnordered;
    var workItem = xcalarIndexDatasetWorkItem(datasetName, key, tablename,
                                              dhtName, prefix, ordering);
    var def1 = xcalarIndexDataset(tHandle, datasetName, key, tablename,
                                  dhtName, ordering, prefix);
    var def2 = XcalarGetQuery(workItem);

    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'index from DS', tablename, query);
    });

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, tablename, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
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
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var dhtName = ""; // XXX TODO fill in later
    var promise;
    if (unsorted) {
        promise = PromiseHelper.resolve(srcTablename);
    } else {
        promise = getUnsortedTableName(srcTablename);
    }
    var unsortedSrcTablename;

    promise
    .then(function(unsortedTablename) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        unsortedSrcTablename = unsortedTablename;
        return xcHelper.getKeyType(key, unsortedTablename);
    })
    .then(function(keyType) {
        var workItem = xcalarIndexTableWorkItem(unsortedSrcTablename,
                                                    tablename,
                                                key, dhtName, ordering,
                                                keyType);

        var def1 = xcalarIndexTable(tHandle, unsortedSrcTablename, key,
                                    tablename, dhtName, ordering, keyType);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            if (!unsorted) {
                Transaction.startSubQuery(txId, 'index', tablename, query);
            }
        });
        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (!unsorted) {
                Transaction.log(txId, ret2, tablename, ret1.timeElapsed);
            }
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarIndexFromTable", error1, error2);
        deferred.reject(thriftError);
    });
    return deferred.promise();
}

function XcalarDeleteTable(tableName, txId, isRetry) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarDeleteDagNodesWorkItem(tableName,
                                                SourceTypeT.SrcTable);
    var def1 = xcalarDeleteDagNodes(tHandle, tableName,
                                    SourceTypeT.SrcTable);
    var def2 = XcalarGetQuery(workItem);

    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'drop table', tableName + "drop", query);
    });

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            // txId may be null if deleting an undone table or performing a
            // deletion not triggered by the user (i.e. clean up)
            if (txId != null) {
                Transaction.log(txId, ret2, tableName + "drop", ret1.timeElapsed);
            }
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);

        if (!isRetry && error1 === StatusT.StatusDgNodeInUse) {
            forceDeleteTable(tableName, txId)
            .then(deferred.resolve)
            .fail(deferred.reject);
        } else {
            var thriftError = thriftLog("XcalarDeleteTable", error1, error2);
            deferred.reject(thriftError);
        }
    });

    return deferred.promise();
}

function forceDeleteTable(tableName, txId) {
    var deferred = jQuery.Deferred();
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

function XcalarRenameTable(oldTableName, newTableName, txId) {
    if (tHandle == null || oldTableName == null || oldTableName === "" ||
        newTableName == null || newTableName === "") {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarRenameNodeWorkItem(oldTableName, newTableName);
    var def1 = xcalarRenameNode(tHandle, oldTableName, newTableName);
    var def2 = XcalarGetQuery(workItem);
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarRenameTable", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarFetchData(resultSetId, rowPosition, rowsToFetch, totalRows, data, tryCnt) {
    var deferred = jQuery.Deferred();
    if (tryCnt == null) {
        tryCnt = 0;
    }

    if (data == null) {
        data = [];
    }

    // row position start with 0
    XcalarSetAbsolute(resultSetId, rowPosition)
    .then(function() {
        return XcalarGetNextPage(resultSetId, rowsToFetch);
    })
    .then(function(tableOfEntries) {
        var kvPairs = tableOfEntries.kvPair;
        var numKvPairs = tableOfEntries.numKvPairs;
        var numStillNeeds = 0;

        if (numKvPairs < rowsToFetch) {
            if (rowPosition + numKvPairs >= totalRows) {
                numStillNeeds = 0;
            } else {
                numStillNeeds = rowsToFetch - numKvPairs;
            }
        }

        kvPairs.forEach(function(kvPair) {
            data.push(kvPair);
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
                newPosition = rowPosition + numKvPairs;
            }

            return XcalarFetchData(resultSetId, newPosition, numStillNeeds,
                                    totalRows, data, tryCnt + 1);
        }
    })
    .then(function() {
        deferred.resolve(data);
    })
    .fail(deferred.reject);

    return deferred.promise();
}

function XcalarGetConfigParams() {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarGetConfigParams(tHandle)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetConfigParams", error);
        SQL.errorLog("Get Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarSetConfigParams(pName, pValue) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarSetConfigParam(tHandle, pName, pValue)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarSetConfigParams", error);
        SQL.errorLog("Set Config Params", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// XXX NOT TESTED
function XcalarGetDatasetCount(dsName) {
    var deferred = jQuery.Deferred();
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
            SQL.errorLog("Get Dataset Count", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }

    return (deferred.promise());
}

function XcalarGetDatasetMeta(dsName) {
    if (tHandle == null) {
        return PromiseHelper.resolve(0);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    dsName = parseDS(dsName);

    xcalarGetDatasetMeta(tHandle, dsName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasetMeta", error);
        SQL.errorLog("Get Dataset Meta", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGetTableMeta(tableName) {
    var deferred = jQuery.Deferred();
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
            SQL.errorLog("Get Table Meta", null, null, thriftError);
            deferred.reject(thriftError);
        });
    }
    return deferred.promise();
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
        var datasets = xcHelper.parseListDSOutput(listDatasetsOutput.datasets);
        listDatasetsOutput.datasets = datasets;
        listDatasetsOutput.numDatasets = datasets.length;
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetDatasets", error);
        SQL.errorLog("Get Datasets", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGetConstants(constantName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
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
        SQL.errorLog("Get Constants", null, null, thriftError);
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

function XcalarGetDSNode(datasetName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
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
        SQL.errorLog("Get DS Nodes", null, null, thriftError);
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
    .then(function(ret) {
        if (ret.numEntries < 0) {
            ret.numEntries = 0;
        }
        deferred.resolve(ret);
    })
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

function XcalarFilter(evalStr, srcTablename, dstTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
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
    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarFilterWorkItem(unsortedSrcTablename, dstTablename,
                                            evalStr);

        var def1 = xcalarFilter(tHandle, evalStr, unsortedSrcTablename,
                                dstTablename);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'filter', dstTablename, query);
        });

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, dstTablename, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarFilter", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarMapWithInput(txId, inputStruct) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarApiMapWorkItem();
    workItem.input.mapInput = inputStruct;
    var def1 = xcalarApiMapWithWorkItem(tHandle, workItem);
    var def2 = XcalarGetQuery(workItem);
    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'map', inputStruct.dstTable.tableName,
                                  query);
    });
    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, inputStruct.dstTable.tableName,
                            ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarMap", error1, error2);
        deferred.reject(thriftError);
    });
    return deferred.promise();
}

function XcalarMap(newFieldName, evalStr, srcTablename, dstTablename,
                   txId, doNotUnsort, icvMode) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();

    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    var d;
    if (!doNotUnsort) {
        d = getUnsortedTableName(srcTablename);
    } else {
        d = PromiseHelper.resolve(srcTablename);
        console.log("Using SORTED table for windowing!");
    }
    d
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarApiMapWorkItem(evalStr, unsortedSrcTablename,
                                            dstTablename, newFieldName,
                                            icvMode);

        var def1 = xcalarApiMap(tHandle, newFieldName, evalStr,
                                unsortedSrcTablename, dstTablename,
                                icvMode);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'map', dstTablename, query);
        });

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, dstTablename, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarMap", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarAggregate(evalStr, dstAggName, srcTablename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    if (evalStr === "") {
        deferred.reject("bug!:" + op);
        return (deferred.promise());
    } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStirngLen) {
        deferred.reject(thriftLog("XcalarMap", "Eval string too long"));
        return (deferred.promise());
    }

    getUnsortedTableName(srcTablename)
    .then(function(unsortedSrcTablename) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarAggregateWorkItem(unsortedSrcTablename,
                                               dstAggName, evalStr);

        var def1 = xcalarAggregate(tHandle, unsortedSrcTablename, dstAggName,
                                   evalStr);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'aggregate', dstAggName, query);
        });
        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, dstAggName, ret1.timeElapsed);
            deferred.resolve(ret1, dstAggName);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarAggregate", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarJoin(left, right, dst, joinType, leftRename, rightRename, txId) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    var coll = true;

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    getUnsortedTableName(left, right)
    .then(function(unsortedLeft, unsortedRight) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }

        var leftRenameMap = [];
        var rightRenameMap = [];
        var map;
        if (leftRename) {
            for (var i = 0; i < leftRename.length; i++) {
                map = new XcalarApiRenameMapT();
                map.oldName = leftRename[i].orig;
                map.newName = leftRename[i].new;
                map.type = leftRename[i].type;
                leftRenameMap.push(map);
            }
        }

        if (rightRename) {
            for (var i = 0; i < rightRename.length; i++) {
                map = new XcalarApiRenameMapT();
                map.oldName = rightRename[i].orig;
                map.newName = rightRename[i].new;
                map.type = rightRename[i].type;
                rightRenameMap.push(map);
            }
        }

        var workItem = xcalarJoinWorkItem(unsortedLeft, unsortedRight, dst,
                                          joinType, leftRenameMap,
                                          rightRenameMap, coll);
        var def1 = xcalarJoin(tHandle, unsortedLeft, unsortedRight, dst,
                              joinType, leftRenameMap, rightRenameMap, coll);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'join', dst, query);
        });

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, dst, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarJoin", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarGroupByWithInput(txId, inputStruct) {
    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    var workItem = xcalarGroupByWorkItem();
    workItem.input.groupByInput = inputStruct;

    var def1 = xcalarGroupByWithWorkItem(tHandle, workItem);
    var def2 = XcalarGetQuery(workItem);

    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'groupBy',
                                  inputStruct.dstTable.tableName, query);
    });

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, inputStruct.dstTable.tableName,
                            ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarGroupBy", error1, error2);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarGroupBy(operator, newColName, oldColName, tableName,
                       newTableName, incSample, icvMode, newKeyFieldName,
                       txId) {
    if (Transaction.checkAndSetCanceled(txId)) {
        return PromiseHelper.reject(StatusTStr[StatusT.StatusCanceled]);
    }

    var deferred = jQuery.Deferred();
    var evalStr;

    XIApi.genAggStr(oldColName, operator)
    .then(function(res) {
        evalStr = res;
        if (evalStr === "") {
            return PromiseHelper.reject("Wrong operator! " + operator);
        } else if (evalStr.length > XcalarApisConstantsT.XcalarApiMaxEvalStringLen) {
            return PromiseHelper.reject("Eval string too long");
        }

        return getUnsortedTableName(tableName);
    })
    .then(function(unsortedTableName) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarGroupByWorkItem(unsortedTableName, newTableName,
                                             evalStr, newColName, incSample,
                                             icvMode, newKeyFieldName);
        var def1 = xcalarGroupBy(tHandle, unsortedTableName, newTableName,
                                 evalStr, newColName, incSample, icvMode,
                                 newKeyFieldName);
        var def2 = XcalarGetQuery(workItem);
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'groupBy', newTableName, query);
        });

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, newTableName, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarGroupBy", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarProject(columns, tableName, dstTableName, txId) {
    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    getUnsortedTableName(tableName)
    .then(function(unsortedTableName) {
        if (Transaction.checkAndSetCanceled(txId)) {
            return (deferred.reject(StatusTStr[StatusT.StatusCanceled])
                            .promise());
        }
        var workItem = xcalarProjectWorkItem(columns.length, columns,
                                             unsortedTableName, dstTableName);
        var def1 = xcalarProject(tHandle, columns.length, columns,
                                 unsortedTableName, dstTableName);
        var def2 = XcalarGetQuery(workItem); // XXX May not work? Have't tested
        def2.then(function(query) {
            Transaction.startSubQuery(txId, 'project', dstTableName, query);
        });

        return jQuery.when(def1, def2);
    })
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, dstTableName, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarProject", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarGenRowNum(srcTableName, dstTableName, newFieldName, txId) {
    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // DO NOT GET THE UNSORTED TABLE NAMEEE! We actually want the sorted order
    var workItem = xcalarApiGetRowNumWorkItem(srcTableName, dstTableName,
                                              newFieldName);
    var def1 = xcalarApiGetRowNum(tHandle, newFieldName, srcTableName,
                                  dstTableName);
    var def2 = XcalarGetQuery(workItem);
    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'genRowNum', dstTableName, query);
    });

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
             // XXX This part doesn't work yet
            Transaction.log(txId, ret2, dstTableName, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarGenRowNum", error1, error2);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

// PSA!!! This place does not check for unsorted table. So the caller
// must make sure that the first table that is being passed into XcalarQuery
// is an unsorted table! Otherwise backend may crash
// txId does not need to be passed in if xcalarquery not called inside a transaction
function XcalarQuery(queryName, queryString, txId) {
    // XXX Now only have a simple output
    /* some test case :
        "load --url file:///var/tmp/gdelt --format csv --name test"
        "filter yelpUsers 'regex(user_id,\"--O\")'"

    */
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        console.info('cancelation detected');
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    xcalarQuery(tHandle, queryName, queryString, true)
    .then(function() {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            if (txId != null) {
                Transaction.startSubQuery(txId, queryName, null, queryString);
            }
            deferred.resolve();
        }
    })
    .fail(function(error) {
        Transaction.checkAndSetCanceled(txId);
        var thriftError = thriftLog("XcalarQuery", error);
        SQL.errorLog("XcalarQuery", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// for queries or retinas
function XcalarQueryState(queryName, statusesToIgnore) {
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
        var thriftError = queryStateErrorStatusHandler(error, statusesToIgnore);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function queryStateErrorStatusHandler(error, statusesToIgnore) {
    var thriftError;
    if (statusesToIgnore && statusesToIgnore.indexOf(error) > -1) {
        thriftError = {status: error, error: "Error:" + StatusTStr[error]};
    } else {
        thriftError = thriftLog("XcalarQueryState", error);
        SQL.errorLog("XcalarQueryState", null, null, thriftError);
    }

    return (thriftError);
}

// used to check when a query finishes or when a queryCancel finishes
function XcalarQueryCheck(queryName, canceling) {
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

    var deferred = jQuery.Deferred();

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
}

function XcalarQueryWithCheck(queryName, queryString, txId) {
    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    XcalarQuery(queryName, queryString, txId)
    .then(function() {
        return XcalarQueryCheck(queryName);
    })
    .then(function() {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, queryString);
            deferred.resolve();
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQuery" + queryName, error);
        Transaction.checkAndSetCanceled(txId);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function queryErrorStatusHandler(error, statusesToIgnore, opOrQuery) {
    var thriftError;
    if (statusesToIgnore && statusesToIgnore.indexOf(error) > -1) {
        thriftError = {status: error, error: "Error:" + StatusTStr[error]};
    } else {
        thriftError = thriftLog("XcalarCancel" + opOrQuery, error);
        SQL.errorLog("Cancel " + opOrQuery, null, null, thriftError);
    }

    return (thriftError);
}

function XcalarQueryCancel(queryName, statusesToIgnore) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
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
}

function XcalarQueryDelete(queryName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarQueryDelete(tHandle, queryName)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarQueryDelete" + queryName, error);
        SQL.errorLog("Xcalar Query Delete " + queryName, null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

/**
 * XcalarCancelOp
 * @param {Array} statusesToIgnore - array of status numbers to ignore
 *      (when attempting to cancel a query, we cancel all future subqueries
 *      even when the dstTableName doesn't exist yet -- this produces errors)
 */
function XcalarCancelOp(dstTableName, statusesToIgnore) {
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
        var thriftError = queryErrorStatusHandler(error, statusesToIgnore,
                                                  "Op");
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

function XcalarListFilesWithPattern(url, isRecur, namePattern) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }
    url = xcHelper.encodeURL(url);

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return deferred.promise();
    }

    xcalarListFiles(tHandle, url, isRecur, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListFiles", error);
        SQL.errorLog("List Files", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarListFiles(url, isRecur) {
    if (tHandle == null) {
        return PromiseHelper.resolve(null);
    }

    url = xcHelper.encodeURL(url);

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var namePatternArray = getNamePattern(url, isRecur);
    url = namePatternArray[0];
    var namePattern = namePatternArray[1];

    xcalarListFiles(tHandle, url, isRecur, namePattern)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarListFiles", error);
        SQL.errorLog("List Files", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());

    function getNamePattern(userUrl, isRecur) {
        // XXX Test: folder loading ending with / and without
        // XXX test: single file
        // XXX test: folder with *, file with *
        // Find location of first *
        var star = userUrl.indexOf("*");
        if (star === -1 && !isRecur) {
            return [userUrl, ""];
        }

        if (star === -1) {
            star = userUrl.length - 1;
        }

        for (var i = star; i >= 0; i--) {
            if (userUrl[i] === "/") {
                return [userUrl.substring(0, i + 1),
                        userUrl.substring(i + 1, userUrl.length)];
            }
        }

        // if code goes here, error case
        console.error("error case!");
        return [userUrl, ""];
    }
}

// XXX TODO THIS NEEDS TO HAVE A SQL.ADD
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
function XcalarMakeRetina(retName, tableArray, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1 ||
        retName === "" || retName == null ||
        tableArray == null || tableArray.length <= 0)
    {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }
    // var workItem = xcalarMakeRetinaWorkItem(retName, tableArray);
    xcalarMakeRetina(tHandle, retName, tableArray)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarMakeRetina", error);
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
function XcalarUpdateRetina(retName, dagNodeId, paramType, paramValues, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    var paramStruct = {};
    switch (paramType) {
        case (XcalarApisT.XcalarApiBulkLoad):
            paramStruct = new XcalarApiParamLoadT();
            paramStruct.datasetUrl = paramValues.datasetUrl;
            paramStruct.namePattern = paramValues.namePattern;
            // XXX Handle name pattern
            break;
        case (XcalarApisT.XcalarApiFilter):
            paramStruct = new XcalarApiParamFilterT();
            paramStruct.filterStr = paramValues.filterStr;
            break;
        case (XcalarApisT.XcalarApiExport):
            paramStruct = new XcalarApiParamExportT();
            paramStruct.fileName = paramValues.fileName;
            paramStruct.targetName = paramValues.targetName;
            paramStruct.targetType = paramValues.targetType;
            break;
    }

    // var workItem = xcalarUpdateRetinaWorkItem(retName, dagNodeId,
    //                                           paramType, paramValue);
    xcalarUpdateRetina(tHandle, retName, dagNodeId, paramType, paramStruct)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUpdateRetina", error);
        deferred.reject(thriftError);
    });
    return deferred.promise();
}

// Don't call this for now. When bohan's change for 8137 is fixed, we will
// no longer call updateRetina for export changes and instead switch to this
function XcalarUpdateRetinaExport(retName, dagNodeId, target, specInput,
                                  createRule, sorted) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarUpdateRetinaExport(tHandle, retName, dagNodeId, target, specInput,
        createRule, sorted)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarUpdateRetinaExport", error);
        SQL.errorLog("Update Retina Export Node", null, null, thriftError);
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
function XcalarExecuteRetina(retName, params, options, txId) {
    if (retName === "" || retName == null ||
        [null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
        return (deferred.reject(StatusTStr[StatusT.StatusCanceled]).promise());
    }

    options = options || {};
    // If activeSession is true, it exports to the
    // current active session and creates a table
    // with newTableName

    var activeSession = options.activeSession || false;
    var newTableName = options.newTableName || "";
    var queryName = options.queryName || undefined;

    var workItem = xcalarExecuteRetinaWorkItem(retName, params, activeSession,
                                               newTableName, queryName);
    var def1 = xcalarExecuteRetina(tHandle, retName, params, activeSession,
                                   newTableName, queryName);
    var def2 = XcalarGetQuery(workItem);
    def2.then(function(query) {
        Transaction.startSubQuery(txId, 'executeRetina', retName, query);
    });

    jQuery.when(def1, def2)
    .then(function(ret1, ret2) {
        if (Transaction.checkAndSetCanceled(txId)) {
            deferred.reject(StatusTStr[StatusT.StatusCanceled]);
        } else {
            Transaction.log(txId, ret2, retName, ret1.timeElapsed);
            deferred.resolve(ret1);
        }
    })
    .fail(function(error1, error2) {
        Transaction.checkAndSetCanceled(txId);
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
    if (Transaction.checkAndSetCanceled(txId)) {
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
}

function XcalarImportRetina(retinaName, overwrite, retina, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
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
}

function XcalarExportRetina(retName, txId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (Transaction.checkAndSetCanceled(txId)) {
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
}

function XcalarDeleteSched(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deleteInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = jQuery.Deferred();
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
}

function XcalarCreateSched(scheduleKey, retName, substitutions, options, timingInfo)
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

    var deferred = jQuery.Deferred();
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
}

function XcalarUpdateSched(scheduleKey, retName, substitutions, options, timingInfo)
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

    var deferred = jQuery.Deferred();
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
}


function XcalarListSchedules(scheduleKey) {
    // scheduleKey can be an *exact* schedule key,
    // or emptystring, in which case all schedules are listed
    // No support for patterns yet
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    var listInput = {
        "scheduleKey": scheduleKey
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
}

function XcalarPauseSched(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var pauseInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = jQuery.Deferred();
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
}

function XcalarResumeSched(scheduleKey) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var resumeInput = {
        "scheduleKey": scheduleKey
    };

    var deferred = jQuery.Deferred();
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

function XcalarGetOpStats(dstTableName) {
    if (!dstTableName) {
        console.warn('no dsttablename');
    }
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

    measureIntervalInMs = measureIntervalInMs ||
                          XcalarApisConstantsT.XcalarApiDefaultTopIntervalInMs;

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiTop(tHandle, measureIntervalInMs)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiTop", error);
        SQL.errorLog("XcalarApiTop", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetMemoryUsage(userName, userId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
    if (insertError(arguments.callee, deferred)) {
        return (deferred.promise());
    }

    xcalarApiGetMemoryUsage(tHandle, userName, userId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarApiGetMemoryUsage", error);
        SQL.errorLog("XcalarApiGetMemoryUsage", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetAllTableMemory() {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }

    var deferred = jQuery.Deferred();
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
        SQL.errorLog("XcalarGetAllMemory", null, null, thriftError);
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
    .then(function(listXdfsOutput) {
        // xx remove findMinIdx until backend fixes crashes
        for (var i = 0; i < listXdfsOutput.fnDescs.length; i++) {
            if (listXdfsOutput.fnDescs[i].fnName === "findMinIdx") {
                listXdfsOutput.fnDescs.splice(i , 1);
                break;
            }
        }
        deferred.resolve(listXdfsOutput);
    })
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
                .fail(function(error2, errorStruct2) {
                    if (errorStruct2 && errorStruct2.error &&
                        errorStruct2.error.message &&
                        errorStruct2.error.message.length > 0) {
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

function XcalarDeactivateWorkbook(workbookName, noCleanup) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionInact(tHandle, workbookName, noCleanup)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDeactivateWorkbook", error);
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
    xcalarApiSessionSwitch(tHandle, toWhichWorkbook, fromWhichWorkbook,
                           gSessionNoCleanup)
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

// XXX Not used since listworkbooks return the information needed
function XcalarWorkbookInfo(workbookName) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();

    xcalarApiSessionInfo(tHandle, workbookName)
    .then(function(output) {
        deferred.resolve(output);
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarWorkbookInfo", error);
        SQL.errorLog("Workbook Info", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarGetStatGroupIdMap(nodeId, numGroupId) {
    // nodeId is the node (be 0, 1, 2, 3, 4)
    // numGroupId is the max number of statue you want to return
    if (tHandle == null) {
        return PromiseHelper.resolve();
    }

    var deferred = jQuery.Deferred();

    if (insertError(arguments.callee, deferred)) {
        return deferred.promise();
    }

    xcalarGetStatGroupIdMap(tHandle, nodeId, numGroupId)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetStatGroupIdMap", error);
        SQL.errorLog("Get StatGroupIdMap", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

function XcalarGetStatsByGroupId(nodeId, groupIdList) {
    // nodeId is the node (be 0, 1, 2, 3, 4)
    // groupIdList is an array of groupId return from XcalarGetStatGroupIdMap
    if (tHandle == null) {
        return PromiseHelper.resolve();
    }

    var deferred = jQuery.Deferred();

    if (insertError(arguments.callee, deferred)) {
        return deferred.promise();
    }

    xcalarGetStatsByGroupId(tHandle, nodeId, groupIdList)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarGetStatsByGroupId", error);
        SQL.errorLog("Get StatsByGroupId", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return deferred.promise();
}

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

function XcalarAppSet(name, hostType, duty, execStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    xcalarAppSet(tHandle, name, hostType, duty, execStr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAppSet", error);
        SQL.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarAppRun(name, isGlobal, inStr) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
    xcalarAppRun(tHandle, name, isGlobal, inStr)
    .then(deferred.resolve)
    .fail(function(error) {
        var thriftError = thriftLog("XcalarAppRun", error);
        SQL.errorLog("Support Generate", null, null, thriftError);
        deferred.reject(thriftError);
    });
    return (deferred.promise());
}

function XcalarAppReap(name, appGroupId) {
    if ([null, undefined].indexOf(tHandle) !== -1) {
        return PromiseHelper.resolve(null);
    }
    var deferred = jQuery.Deferred();
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
        SQL.errorLog("App Reap", null, null, outError);
        deferred.reject(outError);
    });
    return (deferred.promise());
}

function XcalarAppExecute(name, isGlobal, inStr) {
    var deferred = jQuery.Deferred();

    XcalarAppRun(name, isGlobal, inStr)
    .then(function(ret) {
        var appGroupId = ret.appGroupId;
        return XcalarAppReap(name, appGroupId);
    })
    .then(deferred.resolve)
    .fail(deferred.reject);

    return deferred.promise();
}

function XcalarDemoFileCreate(fileName) {
    var deferred = jQuery.Deferred();

    xcalarDemoFileCreate(tHandle, fileName)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileCreate", retJson.error);
            SQL.errorLog("Create Demo File", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileCreate", error);
        SQL.errorLog("Create Demo File", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

// Max size 45MB
function XcalarDemoFileAppend(fileName, fileContents) {
    var deferred = jQuery.Deferred();
    if (fileContents.length > gUploadChunkSize) {
        return PromiseHelper.reject("File chunk must be less than 45MB");
    }

    xcalarDemoFileAppend(tHandle, fileName, fileContents)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileAppend", retJson.error);
            SQL.errorLog("Append to demo file", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileAppend", error);
        SQL.errorLog("Append to demo file", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}

function XcalarDemoFileDelete(fileName) {
    var deferred = jQuery.Deferred();
    xcalarDemoFileDelete(tHandle, fileName)
    .then(function(retJson) {
        if (retJson && retJson.error && retJson.error.length > 0) {
            var thriftError = thriftLog("XcalarDemoFileDelete", retJson.error);
            SQL.errorLog("Delete demo file", null, null, thriftError);
            deferred.reject(thriftError);
        } else {
            deferred.resolve(retJson);
        }
    })
    .fail(function(error) {
        var thriftError = thriftLog("XcalarDemoFileDelete", error);
        SQL.errorLog("Delete demo file", null, null, thriftError);
        deferred.reject(thriftError);
    });

    return (deferred.promise());
}
