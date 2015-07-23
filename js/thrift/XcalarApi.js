var userIdUnique = 1;
var userIdName = "test";

var verbose = true;

ThriftHandle = function(args) {
    this.transport = null;
    this.protocol = null;
    this.client = null;
};

WorkItem = function() {
    var workItem = new XcalarApiWorkItemT();
    workItem.userIdUnique = userIdUnique;
    workItem.userIdName = userIdName;
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    return (workItem);
}

function xcalarConnectThrift(hostname, port) {
    var thriftUrl = "http://" + hostname + ":" + port.toString() +
        "/thrift/service/XcalarApiService/";

    console.log("xcalarConnectThrift(thriftUrl = " + thriftUrl + ")")

    var transport = new Thrift.Transport(thriftUrl);
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var thriftHandle = new ThriftHandle();
    thriftHandle.transport = transport;
    thriftHandle.protocol = protocol;
    thriftHandle.client = client;

    return (thriftHandle);
}

function xcalarGetVersionWorkItem() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiGetVersion;
    return (workItem);
}

function xcalarGetVersion(thriftHandle) {
    var deferred = jQuery.Deferred();
    
    if (verbose) {
        console.log("xcalarGetVersion()");
    }
    var workItem = xcalarGetVersionWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getVersionOutput = result.output.outputResult.getVersionOutput;
        // No status
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(result);
    })
    .fail(function(error) {
        console.log("xcalarGetVersion() caught exception:", error);

        error = new XcalarApiGetVersionOutputT();
        error.version = "<unknown>";
        error.apiVersionSignatureFull = "<unknown>";
        error.apiVersionSignatureShort = 0;

        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarLoadWorkItem(url, name, format, maxSampleSize, loadArgs) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.dataset = new XcalarApiDatasetT();

    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.dataset.url = url;
    workItem.input.loadInput.dataset.name = name;
    workItem.input.loadInput.dataset.formatType = format;
    workItem.input.loadInput.maxSize = maxSampleSize;
    workItem.input.loadInput.loadArgs = loadArgs;
    return (workItem);
}

function xcalarLoad(thriftHandle, url, name, format, maxSampleSize, loadArgs) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarLoad(url = " + url + ", name = " + name +
                    ", format = " +
                    DfFormatTypeTStr[format] + ", maxSampleSize = " +
                    maxSampleSize.toString() + ")");
    }

    var workItem = xcalarLoadWorkItem(url, name, format, maxSampleSize,
                                      loadArgs);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var loadOutput = result.output.outputResult.loadOutput;
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(loadOutput);
    })
    .fail(function(error) {
        console.log("xcalarLoad() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexDatasetWorkItem(datasetName, keyName, dstTableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = false;
    workItem.input.indexInput.source.name = datasetName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;
    return (workItem);
}

function xcalarIndexDataset(thriftHandle, datasetName, keyName, dstTableName) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarIndexDataset(datasetName = " + datasetName +
                    ", keyName = " + keyName + ", dstTableName = " +
                    dstTableName + ")");
    }

    var workItem = xcalarIndexDatasetWorkItem(datasetName, keyName, dstTableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.outputResult.indexOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexDataset() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexTableWorkItem(srcTableName, dstTableName, keyName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = true;
    workItem.input.indexInput.source.name = srcTableName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;
    return (workItem);
}

function xcalarIndexTable(thriftHandle, srcTableName, keyName, dstTableName) {
    var deferred = jQuery.Deferred();
    
    if (verbose) {
        console.log("xcalarIndexTable(srcTableName = " + srcTableName +
                   ", keyName = " + keyName + ", dstTableName = " +
                    dstTableName + ")");
    }
    
    var workItem = xcalarIndexTableWorkItem(srcTableName, dstTableName,
                                            keyName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.outputResult.indexOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetCountWorkItem(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.tableInput = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiCountUnique;
    workItem.input.tableInput.tableName = tableName;
    workItem.input.tableInput.tableId = XcalarApiTableIdInvalidT;
    return (workItem);
}

function xcalarGetCount(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetCount(tableName = " + tableName + ")");
    }

    var workItem = xcalarGetCountWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var countOutput = result.output.outputResult.countOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(countOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetCount() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarShutdownWorkItem(force) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiShutdown;
    workItem.input.shutdownInput = force;
    return (workItem);
}

function xcalarShutdown(thriftHandle, force) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarShutdown()");
    }

    var workItem = xcalarShutdownWorkItem(force);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarShutdown() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarStartNodesWorkItem(numNodes) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.startNodesInput = new XcalarApiStartNodesInputT();

    workItem.api = XcalarApisT.XcalarApiStartNodes;
    workItem.input.startNodesInput.numNodes = numNodes;
    return (workItem);
}

function xcalarStartNodes(thriftHandle, numNodes) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarStartNodes(numNodes = " + numNodes + ")");
    }

    var workItem = xcalarStartNodesWorkItem(numNodes);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarStartNodes() caught exception: "+error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStatsWorkItem(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiGetStat;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
}

function xcalarGetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    
    if (verbose) {
        console.log("xcalarGetStats(nodeId = " + nodeId.toString() + ")");
    }

    var workItem = xcalarGetStatsWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.outputResult.statOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarRenameNodeWorkItem(oldName, newName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.renameNodeInput = new XcalarApiRenameNodeInputT();
    workItem.input.renameNodeInput.oldName = oldName;
    workItem.input.renameNodeInput.newName = newName;

    workItem.api = XcalarApisT.XcalarApiRenameNode;
    return (workItem);
}

function xcalarRenameNode(thriftHandle, oldName, newName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarRenameNode(oldName = " + oldName +
                    ", newName = " + newName + ")");
    }

    var workItem = xcalarRenameNodeWorkItem(oldName, newName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        // statusOutput is a status
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarRenameNode() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStatsByGroupIdWorkItem(nodeId, groupIdList) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statByGroupIdInput = new XcalarApiStatByGroupIdInputT();

    workItem.api = XcalarApisT.XcalarApiGetStatByGroupId;
    workItem.input.statByGroupIdInput.nodeId = nodeId;
    workItem.input.statByGroupIdInput.numGroupId = groupIdList.length;
    workItem.input.statByGroupIdInput.groupId = groupIdList;
    return (workItem);
}

function xcalarGetStatsByGroupId(thriftHandle, nodeId, groupIdList) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetStatsByGroupId(nodeId = " + nodeId.toString() +
                    ", numGroupIds = ", + groupIdList.length.toString() +
                    ", ...)");
    }

    var workItem = xcalarGetStatsByGroupIdWorkItem(nodeId, groupIdList);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.outputResult.statOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatsByGroupId() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarResetStatsWorkItem(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiResetStat;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
}

function xcalarResetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarResetStats(nodeId = " + nodeId.toString() + ")");
    }

    var workItem = xcalarResetStatsWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStatGroupIdMapWorkItem(nodeId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.api = XcalarApisT.XcalarApiGetStatGroupIdMap;
    workItem.input.statInput.nodeId = nodeId;
    return (workItem);
}

function xcalarGetStatGroupIdMap(thriftHandle, nodeId, numGroupId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetStatGroupIdMap(nodeId = " + nodeId.toString() +
                    ", numGroupId = " + numGroupId.toString() + ")");
    }

    var workItem = xcalarGetStatGroupIdMapWorkItem(nodeId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statGroupIdMapOutput =
                                result.output.outputResult.statGroupIdMapOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(statGroupIdMapOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatGroupIdMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQueryWorkItem(queryName, queryStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryInput = new XcalarApiQueryInputT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiQuery;
    workItem.input.queryInput.queryName = queryName;
    workItem.input.queryInput.queryStr = queryStr;
    return (workItem);
}

function xcalarQuery(thriftHandle, queryName, queryStr) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQuery(query name= " + queryName +
                    " queryStr" + queryStr + ")");
    }
    var workItem = xcalarQueryWorkItem(queryName, queryStr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var queryOutput = result.output.outputResult.queryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(queryOutput);
    })
    .fail(function(error) {
        console.log("xcalarQuery() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQueryStateWorkItem(queryName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryStateInputT();

    workItem.api = XcalarApisT.XcalarApiQueryState;
    workItem.input.queryStateInput.queryName = queryName;
    return (workItem);
}

function xcalarQueryState(thriftHandle, queryName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarQueryState(query name = " + queryName + ")");
    }

    var workItem = xcalarQueryStateWorkItem(queryName);

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var queryStateOutput = result.output.outputResult.queryStateOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }

        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(queryStateOutput);
    })
    .fail(function(error) {
        console.log("xcalarQueryState() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDagWorkItem(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiGetDag;
    workItem.input.dagTableNameInput = tableName;
    return (workItem);
}

function xcalarDag(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDag(tableName = " + tableName + ")");
    }

    var workItem = xcalarDagWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var dagOutput = result.output.outputResult.dagOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(dagOutput);
    })
    .fail(function(error) {
        console.log("xcalarDag() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListTablesWorkItem(patternMatch) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListTables;
    workItem.input.listTablesInput = patternMatch;
    return (workItem);
}

function xcalarListTables(thriftHandle, patternMatch) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListTables(patternMatch = " + patternMatch + ")");
    }

    var workItem = xcalarListTablesWorkItem(patternMatch);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listTablesOutput = result.output.outputResult.listTablesOutput;

        // No job specific status
        if (result.jobStatus != StatusT.StatusOk) {
            listTablesOutput.numTables = 0;
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(listTablesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListDatasetsWorkItem() {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDatasets;
    return (workItem);
}

function xcalarListDatasets(thriftHandle) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListDatasets()");
    }

    var workItem = xcalarListDatasetsWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listDatasetsOutput = result.output.outputResult.listDatasetsOutput;
        // No job specific status
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(listDatasetsOutput);
    })
    .fail(function(error) {
        console.log("xcalarListDatasets() caught exception:", error);

        var listDatasetsOutput = new XcalarApiListDatasetsOutputT();
        // XXX FIXME should add StatusT.StatusThriftProtocolError
        listDatasetsOutput.numDatasets = 0;

        deferred.reject(listDatasetsOutput);
    });

    return (deferred.promise());
}

function xcalarMakeResultSetFromTableWorkItem(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = true;
    workItem.input.makeResultSetInput.name = tableName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;
    return (workItem);
}

function xcalarMakeResultSetFromTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeResultSetFromTable(tableName = " + tableName +
                    ")");
    }

    var workItem = xcalarMakeResultSetFromTableWorkItem(tableName);

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.outputResult.makeResultSetOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(makeResultSetOutput);
    })
    .fail(function(error) {
        console.log("xcalarMakeResultSetFromTable() caught exception:", error);

        makeResultSetOutput = new XcalarApiMakeResultSetOutputT();
        makeResultSetOutput.status = StatusT.StatusThriftProtocolError;

        deferred.reject(makeResultSetOutput);
    });

    return (deferred.promise());
}

function xcalarMakeResultSetFromDatasetWorkItem(datasetName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = false;
    workItem.input.makeResultSetInput.name = datasetName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;
    return (workItem);
}

function xcalarMakeResultSetFromDataset(thriftHandle, datasetName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeResultSetFromDataset(datasetName = " +
                    datasetName + ")");
    }

    var workItem = xcalarMakeResultSetFromDatasetWorkItem(datasetName);

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.outputResult.makeResultSetOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(makeResultSetOutput);
    })
    .fail(function(error) {
        console.log("xcalarMakeResultSetFromDataset() caught exception:",
                    error);

        makeResultSetOutput = new XcalarApiMakeResultSetOutputT();
        makeResultSetOutput.status = StatusT.StatusThriftProtocolError;

        deferred.reject(makeResultSetOutput);
    });

    return (deferred.promise());
}

function xcalarResultSetNextWorkItem(resultSetId, numRecords) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();

    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input.resultSetNextInput.resultSetId = resultSetId;
    workItem.input.resultSetNextInput.numRecords = numRecords;
    return (workItem);
}

function xcalarResultSetNext(thriftHandle, resultSetId, numRecords) {
    var deferred = jQuery.Deferred();

    if (verbose) {
        console.log("xcalarResultSetNext(resultSetId = " +
                    resultSetId.toString() +
                    ", numRecords = " + numRecords.toString() + ")");
    }

    var workItem = xcalarResultSetNextWorkItem(resultSetId, numRecords);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var resultSetNextOutput =
                                 result.output.outputResult.resultSetNextOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(resultSetNextOutput);
    })
    .fail(function(error) {
        console.log("xcalarResultSetNext() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarJoinWorkItem(leftTableName, rightTableName, joinTableName,
                            joinType) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.joinInput = new XcalarApiJoinInputT();
    workItem.input.joinInput.leftTable = new XcalarApiTableT();
    workItem.input.joinInput.rightTable = new XcalarApiTableT();
    workItem.input.joinInput.joinTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiJoin;
    workItem.input.joinInput.leftTable.tableName = leftTableName;
    workItem.input.joinInput.leftTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.rightTable.tableName = rightTableName;
    workItem.input.joinInput.rightTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinTable.tableName = joinTableName;
    workItem.input.joinInput.joinTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinType = joinType;
    return (workItem);
}

function xcalarJoin(thriftHandle, leftTableName, rightTableName, joinTableName,
                    joinType) {
    var deferred = jQuery.Deferred();
    
    if (verbose) {
        console.log("xcalarJoin(leftTableName = " + leftTableName +
                    ", rightTableName = " + rightTableName +
                    ", joinTableName = " + joinTableName + ", joinType = " +
                    JoinOperatorTStr[joinType] + ")");
    }

    var workItem = xcalarJoinWorkItem(leftTableName, rightTableName,
                                      joinTableName, joinType);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var joinOutput = result.output.outputResult.joinOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(joinOutput);
    })
    .fail(function(error) {
        console.log("xcalarJoin() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarFilterWorkItem(srcTableName, dstTableName, filterStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.srcTable = new XcalarApiTableT();
    workItem.input.filterInput.dstTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.srcTable.tableName = srcTableName;
    workItem.input.filterInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.dstTable.tableName = dstTableName;
    workItem.input.filterInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.filterStr = filterStr;
    return (workItem);
}

function xcalarFilter(thriftHandle, filterStr, srcTableName, dstTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarFilter(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ", filterStr = " +
                    filterStr + ")");
    }

    var workItem = xcalarFilterWorkItem(srcTableName, dstTableName, filterStr);

    var filterOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        filterOutput = result.output.outputResult.filterOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(filterOutput);
    })
    .fail(function(error) {
        console.log("xcalarFilter() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGroupByWorkItem(srcTableName, dstTableName, groupByEvalStr,
                               newFieldName, includeSrcSample) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.groupByInput = new XcalarApiGroupByInputT();
    workItem.input.groupByInput.srcTable = new XcalarApiTableT();
    workItem.input.groupByInput.dstTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiGroupBy;
    workItem.input.groupByInput.srcTable.tableName = srcTableName;
    workItem.input.groupByInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.dstTable.tableName = dstTableName;
    workItem.input.groupByInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.evalStr = groupByEvalStr;
    workItem.input.groupByInput.newFieldName = newFieldName;
    workItem.input.groupByInput.includeSrcTableSample = includeSrcSample;
    return (workItem);
}

function xcalarGroupBy(thriftHandle, srcTableName, dstTableName, groupByEvalStr,
                       newFieldName, includeSrcSample) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGroupBy(srcTableName = " + srcTableName +
                    ", dstTableName = " + dstTableName + ", groupByEvalStr = " +
                    groupByEvalStr + ", newFieldName = " + newFieldName + ")");
    }

    var workItem = xcalarGroupByWorkItem(srcTableName, dstTableName,
                                         groupByEvalStr, newFieldName,
                                         includeSrcSample);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var groupByOutput = result.output.outputResult.groupByOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(groupByOutput);
    })
    .fail(function(error) {
        console.log("xcalarGroupBy() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarResultSetAbsoluteWorkItem(resultSetId, position) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetAbsoluteInput =
        new XcalarApiResultSetAbsoluteInputT();

    workItem.api = XcalarApisT.XcalarApiResultSetAbsolute;
    workItem.input.resultSetAbsoluteInput.resultSetId = resultSetId;
    workItem.input.resultSetAbsoluteInput.position = position;
    return (workItem);
}

function xcalarResultSetAbsolute(thriftHandle, resultSetId, position) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarResultSetAbsolute(resultSetId = " +
                    resultSetId.toString() + ", position = " +
                    position.toString() + ")");
    }
    var workItem = xcalarResultSetAbsoluteWorkItem(resultSetId, position);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResultSetAbsolute() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarFreeResultSetWorkItem(resultSetId) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.freeResultSetInput = new XcalarApiFreeResultSetInputT();

    workItem.api = XcalarApisT.XcalarApiFreeResultSet;
    workItem.input.freeResultSetInput.resultSetId = resultSetId;
    return (workItem);
}

function xcalarFreeResultSet(thriftHandle, resultSetId) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarFreeResultSet(resultSetId = " +
                    resultSetId.toString() + ")");
    }
    var workItem = xcalarFreeResultSetWorkItem(resultSetId);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        // XXX FIXME bug 136
        var status = StatusT.StatusOk;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarResultSetAbsolute() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDeleteTableWorkItem(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.deleteTableInput =  new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiDeleteTable;
    workItem.input.deleteTableInput.tableName = tableName;
    workItem.input.deleteTableInput.tableId = XcalarApiTableIdInvalidT;
    return (workItem);
}

function xcalarDeleteTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDeleteTable(tableName = " + tableName + ")");
    }
    var workItem = xcalarDeleteTableWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarDeleteTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetTableRefCountWorkItem(tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableRefCountInput = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiGetTableRefCount;
    workItem.input.getTableRefCountInput.tableName = tableName;
    workItem.input.getTableRefCountInput.tableId = XcalarApiTableIdInvalidT;
    return (workItem);
}

function xcalarGetTableRefCount(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetTableRefCount(tableName = " + tableName + ")");
    }
    var workItem = xcalarGetTableRefCountWorkItem(tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getTableRefCountOutput =
                              result.output.outputResult.getTableRefCountOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getTableRefCountOutput);
    })
    .fail(function(error) {
        console.log("xcalarDeleteTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarBulkDeleteTablesWorkItem(tableNamePattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiBulkDeleteTables;
    workItem.input.bulkDeleteTablesInput = tableNamePattern;
    return (workItem);
}

function xcalarBulkDeleteTables(thriftHandle, tableNamePattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarBulkDeleteTables(tableNamePattern = " +
                    tableNamePattern + ")");
    }
    var workItem = xcalarBulkDeleteTablesWorkItem(tableNamePattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var deleteTablesOutput = result.output.outputResult.deleteTablesOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(deleteTablesOutput);
    })
    .fail(function(error) {
        console.log("xcalarBulkDeleteTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDestroyDatasetWorkItem(datasetName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiDestroyDataset;
    workItem.input.destroyDsInput = datasetName;
    return (workItem);
}

function xcalarDestroyDataset(thriftHandle, datasetName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarDestroyDataset(datasetName = " + datasetName + ")");
    }
    var workItem = xcalarDestroyDatasetWorkItem(datasetName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;
        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("xcalarDestroyDataset() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiMapWorkItem(evalStr, srcTableName, dstTableName,
                              newFieldName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.mapInput = new XcalarApiMapInputT();
    workItem.input.mapInput.srcTable = new XcalarApiTableT();
    workItem.input.mapInput.dstTable = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiMap;
    workItem.input.mapInput.evalStr = evalStr;
    workItem.input.mapInput.srcTable.tableName = srcTableName;
    workItem.input.mapInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.dstTable.tableName = dstTableName;
    workItem.input.mapInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.newFieldName = newFieldName;
    return (workItem);
}

function xcalarApiMap(thriftHandle, newFieldName, evalStr, srcTableName,
                      dstTableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiMap(newFieldName = " + newFieldName +
                    ", evalStr = " + evalStr + ", srcTableName = " +
                    srcTableName + ", dstTableName = " + dstTableName + ")");
    }

    var workItem = xcalarApiMapWorkItem(evalStr, srcTableName, dstTableName,
                                        newFieldName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result){
        var mapOutput = result.output.outputResult.mapOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(mapOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarAggregateWorkItem(srcTableName, aggregateEvalStr) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.aggregateInput = new XcalarApiAggregateInputT();
    workItem.input.aggregateInput.table = new XcalarApiTableT();

    workItem.api = XcalarApisT.XcalarApiAggregate;
    workItem.input.aggregateInput.table.tableName = srcTableName;
    workItem.input.aggregateInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.aggregateInput.evalStr = aggregateEvalStr;
    return (workItem);
}

function xcalarAggregate(thriftHandle, srcTableName, aggregateEvalStr) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAggregate(srcTableName = " + srcTableName +
                    ", aggregateEvalStr = " + aggregateEvalStr + ")");
    }

    var workItem = xcalarAggregateWorkItem(srcTableName, aggregateEvalStr);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var aggregateOutput = result.output.outputResult.aggregateOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(aggregateOutput.jsonAnswer);
    })
    .fail(function(error) {
        console.log("xcalarAggregate() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarExportWorkItem(tableName, fileName, isBQ) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.exportInput = new XcalarApiExportInputT();
    workItem.input.exportInput.srcTable = new XcalarApiTableT();
    workItem.input.exportInput.isBQ = isBQ;

    workItem.api = XcalarApisT.XcalarApiExport;
    workItem.input.exportInput.srcTable.tableName = tableName;
    workItem.input.exportInput.fileName = fileName;
    return (workItem);
}

function xcalarExport(thriftHandle, tableName, fileName, isBQ) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarExport(tableName = " + tableName + ", fileName = " +
                    fileName + ")");
    }

    var workItem = xcalarExportWorkItem(tableName, fileName, isBQ);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var exportOutput = result.output.outputResult.exportOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(exportOutput);
    })
    .fail(function(error) {
        console.log("xcalarExport() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListFilesWorkItem(url) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.listFilesInput = new XcalarApiListFilesInputT();

    workItem.api = XcalarApisT.XcalarApiListFiles;
    workItem.input.listFilesInput.url = url;
    return (workItem);
}

function xcalarListFiles(thriftHandle, url) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListFiles(url = " + url + ")");
    }

    var workItem = xcalarListFilesWorkItem(url);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listFilesOutput = result.output.outputResult.listFilesOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listFilesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListFiles() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarMakeRetinaWorkItem(retinaName, tableName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeRetinaInput = new XcalarApiMakeRetinaInputT();

    workItem.api = XcalarApisT.XcalarApiMakeRetina;
    workItem.input.makeRetinaInput.retinaName = retinaName;
    workItem.input.makeRetinaInput.tableName = tableName;
    return (workItem);
}

function xcalarMakeRetina(thriftHandle, retinaName, tableName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarMakeRetina(retinaName = " + retinaName +
                    ", tableName = " + tableName + ")");
    }
    var workItem = xcalarMakeRetinaWorkItem(retinaName, tableName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve();
    })
    .fail(function(error) {
        console.log("xcalarMakeRetina() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarListRetinasWorkItem() {
    var workItem = new WorkItem();
    workItem.api = XcalarApisT.XcalarApiListRetinas;
    return (workItem);
}

function xcalarListRetinas(thriftHandle) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListRetinas()");
    }
    var workItem = xcalarListRetinasWorkItem();

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listRetinasOutput = result.output.outputResult.listRetinasOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listRetinasOutput);
    })
    .fail(function(error) {
        console.log("xcalarListRetinas() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetRetinaWorkItem(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiGetRetina;
    workItem.input.getRetinaInput = retinaName;
    return (workItem);
}

function xcalarGetRetina(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarGetRetina(retinaName = " + retinaName + ")");
    }
    var workItem = xcalarGetRetinaWorkItem(retinaName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getRetinaOutput = result.output.outputResult.getRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(getRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetRetina() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarUpdateRetinaWorkItem(retinaName, dagNodeId, paramType,
                                    paramInput) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.updateRetinaInput = new XcalarApiUpdateRetinaInputT();

    workItem.api = XcalarApisT.XcalarApiUpdateRetina;
    workItem.input.updateRetinaInput.retinaName = retinaName;
    workItem.input.updateRetinaInput.dagNodeId = dagNodeId;
    workItem.input.updateRetinaInput.paramType = paramType;
    workItem.input.updateRetinaInput.paramInput = paramInput;
    return (workItem);
}

function xcalarUpdateRetina(thriftHandle, retinaName, dagNodeId,
                            paramType, paramInput) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarUpdateRetina(retinaName = " + retinaName + ", " +
                    "dagNodeId = " + dagNodeId + ", paramType = " + paramType +
                    ")");
    }
    var workItem = xcalarUpdateRetinaWorkItem(retinaName, dagNodeId, paramType,
                                              paramInput);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarUpdateRetina() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarExecuteRetinaWorkItem(retinaName, dstTableName, exportFileName,
                                     parameters) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.executeRetinaInput = new XcalarApiExecuteRetinaInputT();

    workItem.api = XcalarApisT.XcalarApiExecuteRetina;
    workItem.input.executeRetinaInput.retinaName = retinaName;
    workItem.input.executeRetinaInput.dstTableName = dstTableName;
    workItem.input.executeRetinaInput.exportToFile = (exportFileName != null);
    workItem.input.executeRetinaInput.exportFileName = exportFileName;
    workItem.input.executeRetinaInput.numParameters = parameters.length;
    workItem.input.executeRetinaInput.parameters = parameters;
    return (workItem);
}

function xcalarExecuteRetina(thriftHandle, retinaName, dstTableName,
                             exportFileName, parameters) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarExecuteRetina(retinaName = " + retinaName + ", " +
                    "dstTableName = " + dstTableName + ")");
        console.log(parameters);
    }
    var workItem = xcalarExecuteRetinaWorkItem(retinaName, dstTableName,
                                               exportFileName, parameters);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                    result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarExecuteRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarAddParameterToRetinaWorkItem(retinaName, parameterName,
                                            parameterValue) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.addParameterToRetinaInput =
                                     new XcalarApiAddParameterToRetinaInputT();
    workItem.input.addParameterToRetinaInput.parameter =
                                                     new XcalarApiParameterT();

    workItem.api = XcalarApisT.XcalarApiAddParameterToRetina;
    workItem.input.addParameterToRetinaInput.retinaName = retinaName;
    workItem.input.addParameterToRetinaInput.parameter.parameterName =
                                                                 parameterName;
    workItem.input.addParameterToRetinaInput.parameter.parameterValue =
                                                                parameterValue;
    return (workItem);
}

function xcalarAddParameterToRetina(thriftHandle, retinaName, parameterName,
                                    parameterValue) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarAddParameterToRetina(retinaName = " + retinaName +
                    ", parameterName = " + parameterName +
                    ", parameterValue = " + parameterValue + ")");
    }
    
    var workItem = xcalarAddParameterToRetinaWorkItem(retinaName, parameterName,
                                                      parameterValue);
    
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.hdr.status;
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarAddParameterToRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarListParametersInRetinaWorkItem(retinaName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiListParametersInRetina;
    workItem.input.listParametersInRetinaInput = retinaName;
    return (workItem);
}

function xcalarListParametersInRetina(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarListParametersInRetina(retinaName = " + retinaName +
                    ")");
    }

    var workItem = xcalarListParametersInRetinaWorkItem(retinaName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listParametersInRetinaOutput =
                        result.output.outputResult.listParametersInRetinaOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(listParametersInRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarListParametersInRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarKeyLookupWorkItem(key) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiKeyLookup;
    workItem.input.keyLookupInput = key;
    return (workItem);
}

function xcalarKeyLookup(thriftHandle, key) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarKeyLookup(key = " + key + ")");
    }

    var workItem = xcalarKeyLookupWorkItem(key);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var keyLookupOutput = result.output.outputResult.keyLookupOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(keyLookupOutput);
    })
    .fail(function(error) {
        console.log("xcalarKeyLookup() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarKeyAddOrReplaceWorkItem(persist, key, value) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyAddOrReplaceInput = new XcalarApiKeyAddOrReplaceInputT();
    workItem.input.keyAddOrReplaceInput.kvPair = new XcalarApiKeyValuePairT();

    workItem.api = XcalarApisT.XcalarApiKeyAddOrReplace;
    workItem.input.keyAddOrReplaceInput.persist = persist;
    workItem.input.keyAddOrReplaceInput.kvPair.key = key;
    workItem.input.keyAddOrReplaceInput.kvPair.value = value;
    return (workItem);
}

function xcalarKeyAddOrReplace(thriftHandle, key, value, persist) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarKeyAddOrReplace(key = " + key + ", value = " + value
                    + "persist = " + persist.toString() + ")");
    }

    var workItem = xcalarKeyAddOrReplaceWorkItem(persist, key, value);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeyAddOrReplace() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarKeyDeleteWorkItem(key) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiKeyDelete;
    workItem.input.keyDeleteInput = key;
    return (workItem);
}

function xcalarKeyDelete(thriftHandle, key) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarKeyDelete(key = " + key + ")");
    }

    var workItem = xcalarKeyDeleteWorkItem(key);
    
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarKeyLookup() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiTopWorkItem(measureIntervalInMs) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.topInput = new XcalarApiTopInputT();

    workItem.api = XcalarApisT.XcalarApiTop;
    workItem.input.topInput.measureIntervalInMs = measureIntervalInMs;
    return (workItem);
}

function xcalarApiTop(thriftHandle, measureIntervalInMs) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiTop(measureIntervalInMs = ", measureIntervalInMs,
                    ")");
    }

    var workItem = xcalarApiTopWorkItem(measureIntervalInMs);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var topOutput = result.output.outputResult.topOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            topOutput = new XcalarApiTopOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(topOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiTop() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiMemoryWorkItem(tagName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.memoryInput = new XcalarApiMemoryInputT();

    workItem.api = XcalarApisT.XcalarApiMemory;
    workItem.input.memoryInput.tagName = tagName;
    return (workItem);
}

function xcalarApiMemory(thriftHandle, tagName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiMemory(tagName = ", tagName, ")");
    }

    var workItem = xcalarApiMemoryWorkItem(tagName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var memOutput = result.output.outputResult.memoryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            memOutput = new XcalarApiMemoryOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(memOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMemory() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

/**
function xcalarApiSessionNewWorkItem(sessionName, fork, forkedSessionName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionNewInput = new XcalarApiSessionNewInputT();
    
    workItem.api = XcalarApisT.XcalarApiSessionNew;
    workItem.input.sessionNewInput.sessionName = sessionName;
    workItem.input.sessionNewInput.fork = fork;
    workItem.input.sessionNewInput.forkedSessionName = forkedSessionName;
    return (workItem);
}

function xcalarApiSessionNew(thriftHandle, sessionName, fork,
                             forkedSessionName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionNew(sessionName = ", sessionName, ", ",
                    "fork = ", fork, ", ",
                    "origSessionName = ", origSessionName")");
    }
    var workItem = xcalarApiSessionNewWorkItem(sessionName, fork,
                                               forkedSessionName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionGenericOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionNew() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiSessionDeleteWorkItem(pattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiSessionDelete;
    workItem.input.sessionDeleteInput = pattern;
    return (workItem);
}

function xcalarApiSessionDelete(thriftHandle, pattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionDelete(pattern = )", pattern);
    }
    var workItem = xcalarApiSessionDeleteWorkItem(pattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionGenericOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionDelete() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiSessionInactWorkItem(name) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiSessionInact;
    workItem.input.sessionDeleteInput = name;
    return (workItem);
}

function xcalarApiSessionInact(thriftHandle, name) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionInact(name = )", name);
    }
    var workItem = xcalarApiSessionIactWorkItem(name);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionGenericOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionInact() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiSessionListWorkItem(pattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();

    workItem.api = XcalarApisT.XcalarApiSessionList;
    workItem.input.sessionListInput = pattern;
    return (workItem);
}

function xcalarApiSessionList(thriftHandle, pattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionList(pattern = )", pattern);
    }
    var workItem = xcalarApiSessionListWorkItem(pattern);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var sessionListOutput = result.output.outputResult.sessionListOutput;

        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(sessionListOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionList() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiSessionSwitchWorkItem(sessionName, origSessionName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionSwitchInput = new XcalarApiSessionSwitchInputT();
    workItem.api = XcalarApisT.XcalarApiSessionSwitch;
    workItem.input.sessionSwitchInput.sessionName = sessionName;
    workItem.input.sessionSwitchInput.origSessionName = origSessionName;
    return (workItem);
}

function xcalarApiSessionSwitch(thriftHandle, sessionName, origSessionName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionSwitch(sessionName = ", sessionName, ", ",
                    "origSessionName = ", origSessionName")");
    }
    var workItem = xcalarApiSessionSwitchWorkItem(sessionName, origSessionName);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionGenericOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionSwitch() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiSessionRenameWorkItem(sessionName, origSessionName) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.sessionRenameInput = new XcalarApiSessionRenameInputT();

    workItem.api = XcalarApisT.XcalarApiSessionRename;
    workItem.input.sessionRenameInput.sessionName = sessionName;
    workItem.input.sessionRenameInput.origSessionName = origSessionName;
    return (workItem);
}

function xcalarApiSessionRename(thriftHandle, sessionName, origSessionName) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiSessionRename(sessionName = ", sessionName, ", ",
                    "origSessionName = ", origSessionName);
    }
    var workItem = xcalarApiSessionRenameWorkItem(sessionName, origSessionName);
    
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }
        deferred.resolve(sessionGenericOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiSessionRename() caught exception:",error);
        deferred.reject(error);
    });

    return (deferred.promise());
}
*/

function xcalarApiListXdfsWorkItem(fnNamePattern, categoryPattern) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.listXdfsInput = new XcalarApiListXdfsInputT();

    workItem.api = XcalarApisT.XcalarApiListXdfs;
    workItem.input.listXdfsInput.fnNamePattern = fnNamePattern;
    workItem.input.listXdfsInput.categoryPattern = categoryPattern;
    return (workItem);
}

function xcalarApiListXdfs(thriftHandle, fnNamePattern, categoryPattern) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiListXdfs(fnNamePattern = ", fnNamePattern, ", ",
                    "categoryPattern = ", categoryPattern, ")");
    }
    var workItem = xcalarApiListXdfsWorkItem(fnNamePattern, categoryPattern);
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listXdfsOutput = result.output.outputResult.listXdfsOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            listXdfsOutput = new XcalarApiListXdfsOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(listXdfsOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiListXdfs() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiUploadPythonWorkItem(moduleName, pythonSrc) {
    var workItem = new WorkItem();
    workItem.input = new XcalarApiInputT();
    workItem.input.uploadPythonInput = new XcalarApiUploadPythonInputT();

    workItem.api = XcalarApisT.XcalarApiUploadPython;
    workItem.input.uploadPythonInput.moduleName = moduleName;
    workItem.input.uploadPythonInput.pythonSrc = pythonSrc;
    return (workItem);
}

function xcalarApiUploadPython(thriftHandle, moduleName, pythonSrc) {
    var deferred = jQuery.Deferred();
    if (verbose) {
        console.log("xcalarApiUploadPython(pythonSrc = ", pythonSrc, ", ",
                    "moduleName = ", moduleName, ")");
    }
    var workItem = xcalarApiUploadPythonWorkItem(moduleName, pythonSrc);

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
	        status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(status);
    })
    .fail(function(error) {
        console.log("xcalarApiUploadPython() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarApiGetQuery(thriftHandle, workItem) {
    var deferred = jQuery.Deferred();
    workItem.origApi = workItem.api;
    workItem.api = XcalarApisT.XcalarApiGetQuery;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getQueryOutput = result.output.outputResult.getQueryOutput;
        var status = result.output.hdr.status;

        if (result.jobStatus != StatusT.StatusOk) {
            getQueryOutput = new XcalarApiGetQueryOutputT();
            status = result.jobStatus;
        }
        if (status != StatusT.StatusOk) {
            deferred.reject(status);
        }

        deferred.resolve(getQueryOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiGetQuery() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}
