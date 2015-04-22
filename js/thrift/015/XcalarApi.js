ThriftHandle = function(args) {
    this.transport = null;
    this.protocol = null;
    this.client = null;
};

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

function xcalarGetVersion(thriftHandle) {
    var deferred = jQuery.Deferred();

    console.log("xcalarGetVersion()");

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetVersion;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getVersionOutput = result.output.getVersionOutput;
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

function xcalarLoad(thriftHandle, url, name, format, maxSampleSize, loadArgs) {
    var deferred = jQuery.Deferred();

    console.log("xcalarLoad(url = " + url + ", name = " + name + ", format = " +
                DfFormatTypeTStr[format] + ", maxSampleSize = " +
                maxSampleSize.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.dataset = new XcalarApiDatasetT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.dataset.url = url;
    workItem.input.loadInput.dataset.name = name;
    workItem.input.loadInput.dataset.formatType = format;
    workItem.input.loadInput.maxSize = maxSampleSize;
    workItem.input.loadInput.loadArgs = loadArgs;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var loadOutput = result.output.loadOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            loadOutput.status = result.jobStatus;
        }
        if (loadOutput.status != StatusT.StatusOk) {
            deferred.reject(loadOutput.status);
        }
        deferred.resolve(loadOutput);
    })
    .fail(function(error) {
        console.log("xcalarLoad() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexDataset(thriftHandle, datasetName, keyName, dstTableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarIndexDataset(datasetName = " + datasetName +
                ", keyName = " + keyName + ", dstTableName = " +
                dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = false;
    workItem.input.indexInput.source.name = datasetName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.indexOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            indexOutput.status = result.jobStatus;
        }
        if (indexOutput.status != StatusT.StatusOk) {
            deferred.reject(indexOutput.status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexDataset() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());

}

function xcalarIndexTable(thriftHandle, srcTableName, keyName, dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarIndexTable(srcTableName = " + srcTableName +
                ", keyName = " + keyName + ", dstTableName = " +
                dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.source = new XcalarApiNamedInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiIndex;
    workItem.input.indexInput.source.isTable = true;
    workItem.input.indexInput.source.name = srcTableName;
    workItem.input.indexInput.source.xid = XcalarApiXidInvalidT;
    workItem.input.indexInput.dstTable.tableName = dstTableName;
    workItem.input.indexInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.indexInput.keyName = keyName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var indexOutput = result.output.indexOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            indexOutput.status = result.jobStatus;
        }
        if (indexOutput.status != StatusT.StatusOk) {
            deferred.reject(indexOutput.status);
        }
        deferred.resolve(indexOutput);
    })
    .fail(function(error) {
        console.log("xcalarIndexTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetCount(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetCount(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.tableInput = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiCountUnique;
    workItem.input.tableInput.tableName = tableName;
    workItem.input.tableInput.tableId = XcalarApiTableIdInvalidT;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var countOutput = result.output.countOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            countOutput.status = result.jobStatus;
        }
        if (countOutput.status != StatusT.StatusOk) {
            deferred.reject(countOutput.status);
        }
        deferred.resolve(countOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetCount() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarShutdown(thriftHandle) {
    var deferred = jQuery.Deferred();
    console.log("xcalarShutdown()");

    var workItem = new XcalarApiWorkItemT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiShutdown;

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

function xcalarStartNodes(thriftHandle, numNodes) {
    var deferred = jQuery.Deferred();
    console.log("xcalarStartNodes(numNodes = " + numNodes + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.startNodesInput = new XcalarApiStartNodesInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiStartNodes;
    workItem.input.startNodesInput.numNodes = numNodes;
    
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

function xcalarGetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStats(nodeId = " + nodeId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStat;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.statOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statOutput.status = result.jobStatus;
        }
        if (statOutput.status != StatusT.StatusOk) {
            deferred.reject(statOutput.status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStats() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarEditColumn(thriftHandle, datasetName, tableName, isDataset,
                          currFieldName, newFieldName, newFieldType) {
    var deferred = jQuery.Deferred();
    console.log("xcalarEditColumn(datasetName = " + datasetName +
                ", tableName = " + tableName.toString() + ", isDataset = " +
                isDataset.toString() + ", currFieldName = " +
                currFieldName.toString() + ", newFieldName = " +
                newFieldName.toString() + ", newFieldType = " +
                newFieldType.toString());

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.editColInput = new XcalarApiEditColInputT();
    workItem.input.editColInput.source = new XcalarApiNamedInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiEditColumn;
    if (isDataset) {
        workItem.input.editColInput.source.isTable = false;
        workItem.input.editColInput.source.name = datasetName;
        workItem.input.editColInput.source.xid = XcalarApiXidInvalidT;
    } else {
        workItem.input.editColInput.source.isTable = true;
        workItem.input.editColInput.source.name = tableName;
        workItem.input.editColInput.source.xid = XcalarApiXidInvalidT;
    }
    workItem.input.editColInput.currFieldName = currFieldName;
    workItem.input.editColInput.newFieldName = newFieldName;
    workItem.input.editColInput.newFieldType = newFieldType;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        // statusOutput is a status
        var statusOutput = result.output.statusOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statusOutput = result.jobStatus;
        }
        if (statusOutput != StatusT.StatusOk) {
            deferred.reject(statOutput.status);
        }
        deferred.resolve(statusOutput);
    })
    .fail(function(error) {
        console.log("xcalarEditColumn() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetStatsByGroupId(thriftHandle, nodeId, groupIdList) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStatsByGroupId(nodeId = " + nodeId.toString() +
                ", numGroupIds = ", + groupIdList.length.toString() + ", ...)");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statByGroupIdInput = new XcalarApiStatByGroupIdInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStatByGroupId;
    workItem.input.statByGroupIdInput.nodeId = nodeId;
    workItem.input.statByGroupIdInput.numGroupId = groupIdList.length;
    workItem.input.statByGroupIdInput.groupId = groupIdList;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statOutput = result.output.statOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statOutput.status = result.jobStatus;
        }
        if (statOutput.status != StatusT.StatusOk) {
            deferred.reject(statOutput.status);
        }
        deferred.resolve(statOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatsByGroupId() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarResetStats(thriftHandle, nodeId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarResetStats(nodeId = " + nodeId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResetStat;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarGetStatGroupIdMap(thriftHandle, nodeId, numGroupId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetStatGroupIdMap(nodeId = " + nodeId.toString() +
                ", numGroupId = " + numGroupId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiStatInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetStatGroupIdMap;
    workItem.input.statInput.nodeId = nodeId;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var statGroupIdMapOutput = result.output.statGroupIdMapOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            statGroupIdMapOutput.status = result.jobStatus;
        }
        if (statGroupIdMapOutput.status != StatusT.StatusOk) {
            deferred.reject(statGroupIdMapOutput.status);
        }
        deferred.resolve(statGroupIdMapOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetStatGroupIdMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQuery(thriftHandle, query) {
    var deferred = jQuery.Deferred();

    console.log("xcalarQuery(query = " + query + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiQuery;
    workItem.input.queryInput = query;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var queryOutput = result.output.queryOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            queryOutput.status = result.jobStatus;
        }
        if (queryOutput.status != StatusT.StatusOk) {
            deferred.reject(queryOutput.status);
        }
        deferred.resolve(queryOutput);
    })
    .fail(function(error) {
        console.log("xcalarQuery() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarQueryState(thriftHandle, queryId) {
    var deferred = jQuery.Deferred();

    console.log("xcalarQueryState(queryId = " + queryId + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.queryStateInput = new XcalarApiQueryStateInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiQueryState;
    workItem.input.queryStateInput.queryId = queryId;

    thriftHandle.client.queueWorkAsync(workItem)
    .done(function(result) {
        var queryStateOutput = result.output.queryStateOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            deferred.reject(result.jobStatus);
        }
        deferred.resolve(queryStateOutput);
    })
    .fail(function(error) {
        console.log("xcalarQueryState() caught exception:", error);
        
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDag(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarDag(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetDag;
    workItem.input.dagTableNameInput = tableName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var dagOutput = result.output.dagOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            dagOutput.status = result.jobStatus;
        } 
        if (dagOutput.status != StatusT.StatusOk) {
            deferred.reject(dagOutput.status);
        }
        deferred.resolve(dagOutput);
    })
    .fail(function(error) {
        console.log("xcalarDag() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListTables(thriftHandle, patternMatch) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListTables(patternMatch = " + patternMatch + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListTables;
    workItem.input.listTablesInput = patternMatch;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listTablesOutput = result.output.listTablesOutput;
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

function xcalarListDatasets(thriftHandle) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListDatasets()");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDatasets;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listDatasetsOutput = result.output.listDatasetsOutput;
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

function xcalarMakeResultSetFromTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarMakeResultSetFromTable(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = true;
    workItem.input.makeResultSetInput.name = tableName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.makeResultSetOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            makeResultSetOutput.status = result.jobStatus;
        }
        if (makeResultSetOutput.status != StatusT.StatusOk) {
            deferred.reject(makeResultSetOutput.status);
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

function xcalarMakeResultSetFromDataset(thriftHandle, datasetName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarMakeResultSetFromDataset(datasetName = " +
                datasetName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiNamedInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input.makeResultSetInput.isTable = false;
    workItem.input.makeResultSetInput.name = datasetName;
    workItem.input.makeResultSetInput.xid = XcalarApiXidInvalidT;

    var makeResultSetOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        makeResultSetOutput = result.output.makeResultSetOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            makeResultSetOutput.status = result.jobStatus;
        }
        if (makeResultSetOutput.status != StatusT.StatusOk) {
            deferred.reject(makeResultSetOutput.status);
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

function xcalarResultSetNext(thriftHandle, resultSetId, numRecords) {
    var deferred = jQuery.Deferred();

    console.log("xcalarResultSetNext(resultSetId = " + resultSetId.toString() +
                ", numRecords = " + numRecords.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input.resultSetNextInput.resultSetId = resultSetId;
    workItem.input.resultSetNextInput.numRecords = numRecords;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var resultSetNextOutput = result.output.resultSetNextOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            resultSetNextOutput.status = result.jobStatus;
        }
        if (resultSetNextOutput.status != StatusT.StatusOk) {
            deferred.reject(resultSetNextOutput.status);
        }
        deferred.resolve(resultSetNextOutput);
    })
    .fail(function(error) {
        console.log("xcalarResultSetNext() caught exception:", error);

        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarJoin(thriftHandle, leftTableName, rightTableName, joinTableName,
                    joinType) {
    var deferred = jQuery.Deferred();
    console.log("xcalarJoin(leftTableName = " + leftTableName +
                ", rightTableName = " + rightTableName + ", joinTableName = " +
                joinTableName + ", joinType = " + JoinOperatorTStr[joinType] +
                ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.joinInput = new XcalarApiJoinInputT();
    workItem.input.joinInput.leftTable = new XcalarApiTableT();
    workItem.input.joinInput.rightTable = new XcalarApiTableT();
    workItem.input.joinInput.joinTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiJoin;
    workItem.input.joinInput.leftTable.tableName = leftTableName;
    workItem.input.joinInput.leftTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.rightTable.tableName = rightTableName;
    workItem.input.joinInput.rightTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinTable.tableName = joinTableName;
    workItem.input.joinInput.joinTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.joinInput.joinType = joinType;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var joinOutput = result.output.joinOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            joinOutput.status = result.jobStatus;
        }
        if (joinOutput.status != StatusT.StatusOk) {
            deferred.reject(joinOutput.status);
        }
        deferred.resolve(joinOutput);
    })
    .fail(function(error) {
        console.log("xcalarJoin() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarFilter(thriftHandle, filterStr, srcTableName, dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarFilter(srcTableName = " + srcTableName +
                ", dstTableName = " + dstTableName + ", filterStr = " +
                filterStr + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.srcTable = new XcalarApiTableT();
    workItem.input.filterInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.srcTable.tableName = srcTableName;
    workItem.input.filterInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.dstTable.tableName = dstTableName;
    workItem.input.filterInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.filterInput.filterStr = filterStr;

    var filterOutput;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        filterOutput = result.output.filterOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            filterOutput.status = result.jobStatus;
        }
        if (filterOutput.status != StatusT.StatusOk) {
            deferred.reject(filterOutput.status);
        }
        deferred.resolve(filterOutput);
    })
    .fail(function(error) {
        console.log("xcalarFilter() caught exception: " + error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGroupBy(thriftHandle, srcTableName, dstTableName, groupByOp,
                       fieldName, newFieldName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGroupBy(srcTableName = " + srcTableName +
                ", dstTableName = " + dstTableName + ", groupByOp = " +
                AggregateOperatorTStr[groupByOp] + ", fieldName = " + fieldName 
                + ", newFieldName = " + newFieldName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.groupByInput = new XcalarApiGroupByInputT();
    workItem.input.groupByInput.table = new XcalarApiTableT();
    workItem.input.groupByInput.groupByTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGroupBy;
    workItem.input.groupByInput.table.tableName = srcTableName;
    workItem.input.groupByInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.groupByTable.tableName = dstTableName;
    workItem.input.groupByInput.groupByTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.groupByInput.groupByOp = groupByOp;
    workItem.input.groupByInput.fieldName = fieldName;
    workItem.input.groupByInput.newFieldName = newFieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var groupByOutput = result.output.groupByOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            groupByOutput.status = result.jobStatus;
        }
        if (groupByOutput.status != StatusT.StatusOk) {
            deferred.reject(groupByOutput.status);
        }
        deferred.resolve(groupByOutput);
    })
    .fail(function(error) {
        console.log("xcalarGroupBy() caught exception: " + error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarResultSetAbsolute(thriftHandle, resultSetId, position) {
    var deferred = jQuery.Deferred();
    console.log("xcalarResultSetAbsolute(resultSetId = " +
                resultSetId.toString() + ", position = " +
                position.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetAbsoluteInput =
        new XcalarApiResultSetAbsoluteInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiResultSetAbsolute;
    workItem.input.resultSetAbsoluteInput.resultSetId = resultSetId;
    workItem.input.resultSetAbsoluteInput.position = position;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarFreeResultSet(thriftHandle, resultSetId) {
    var deferred = jQuery.Deferred();
    console.log("xcalarFreeResultSet(resultSetId = " +
                resultSetId.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.freeResultSetInput = new XcalarApiFreeResultSetInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiFreeResultSet;
    workItem.input.freeResultSetInput.resultSetId = resultSetId;

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

function xcalarDeleteTable(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarDeleteTable(tableName = " + tableName + ")");
    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.deleteTableInput =  new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiDeleteTable;
    workItem.input.deleteTableInput.tableName = tableName;
    workItem.input.deleteTableInput.tableId = XcalarApiTableIdInvalidT;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarGetTableRefCount(thriftHandle, tableName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarGetTableRefCount(tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableRefCountInput = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetTableRefCount;
    workItem.input.getTableRefCountInput.tableName = tableName;
    workItem.input.getTableRefCountInput.tableId = XcalarApiTableIdInvalidT;

    
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getTableRefCountOutput = result.output.getTableRefCountOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            getTableRefCountOutput.status = result.jobStatus;
        }
        if (getTableRefCountOutput.status != StatusT.StatusOk) {
            deferred.reject(getTableRefCountOutput.status);
        }
        deferred.resolve(getTableRefCountOutput);
    })
    .fail(function(error) {
        console.log("xcalarDeleteTable() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarBulkDeleteTables(thriftHandle, tableNamePattern) {
    var deferred = jQuery.Deferred();
    console.log("xcalarBulkDeleteTables(tableNamePattern = " +
                tableNamePattern + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiBulkDeleteTables;
    workItem.input.bulkDeleteTablesInput = tableNamePattern;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var deleteTablesOutput = result.output.deleteTablesOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            deleteTablesOutput.status = result.jobStatus;
        }
        if (deleteTablesOutput.status != StatusT.StatusOk) {
            deferred.reject(deleteTablesOutput.status);
        }
        deferred.resolve(deleteTablesOutput);
    })
    .fail(function(error) {
        console.log("xcalarBulkDeleteTables() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarDestroyDataset(thriftHandle, datasetName) {
    var deferred = jQuery.Deferred();

    console.log("xcalarDestroyDataset(datasetName = " + datasetName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiDestroyDataset;
    workItem.input.destroyDsInput = datasetName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarApiMap(thriftHandle, newFieldName, evalStr, srcTableName,
                      dstTableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarApiMap(newFieldName = " + newFieldName + ", evalStr = "
                + evalStr + ", srcTableName = " +
                srcTableName + ", dstTableName = " + dstTableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.mapInput = new XcalarApiMapInputT();
    workItem.input.mapInput.srcTable = new XcalarApiTableT();
    workItem.input.mapInput.dstTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMap;
    workItem.input.mapInput.evalStr = evalStr;
    workItem.input.mapInput.srcTable.tableName = srcTableName;
    workItem.input.mapInput.srcTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.dstTable.tableName = dstTableName;
    workItem.input.mapInput.dstTable.tableId = XcalarApiTableIdInvalidT;
    workItem.input.mapInput.newFieldName = newFieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result){
        var mapOutput = result.output.mapOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            mapOutput.status = result.jobStatus;
        }
        if (mapOutput.status != StatusT.StatusOk) {
            deferred.reject(mapOutput.status);
        }
        deferred.resolve(mapOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiMap() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarAggregate(thriftHandle, srcTableName, aggregateOp, fieldName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarAggregate(srcTableName = " + srcTableName +
                ", aggregateOp = " + AggregateOperatorTStr[aggregateOp] +
                ", fieldName = " + fieldName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.aggregateInput = new XcalarApiAggregateInputT();
    workItem.input.aggregateInput.table = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiAggregate;
    workItem.input.aggregateInput.table.tableName = srcTableName;
    workItem.input.aggregateInput.table.tableId = XcalarApiTableIdInvalidT;
    workItem.input.aggregateInput.aggregateOp = aggregateOp;
    workItem.input.aggregateInput.fieldName = fieldName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var aggregateOutput = result.output.aggregateOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            aggregateOutput.status = result.jobStatus;
        }
        if (aggregateOutput.status != StatusT.StatusOk) {
            deferred.reject(aggregateOutput.status);
        }
        deferred.resolve(aggregateOutput.jsonAnswer);
    })
    .fail(function(error) {
        console.log("xcalarAggregate() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarExport(thriftHandle, tableName, fileName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarExport(tableName = " + tableName + ", fileName = " +
                fileName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.exportInput = new XcalarApiExportInputT();
    workItem.input.exportInput.srcTable = new XcalarApiTableT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiExport;
    workItem.input.exportInput.srcTable.tableName = tableName;
    workItem.input.exportInput.fileName = fileName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var exportOutput = result.output.exportOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            exportOutput.status = result.jobStatus;
        }
        if (exportOutput.status != StatusT.StatusOk) {
            deferred.reject(exportOutput.status);
        }
        deferred.resolve(exportOutput);
    })
    .fail(function(error) {
        console.log("xcalarExport() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarListFiles(thriftHandle, url) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListFiles(url = " + url + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.listFilesInput = new XcalarApiListFilesInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiListFiles;
    workItem.input.listFilesInput.url = url;


    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listFilesOutput = result.output.listFilesOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listFilesOutput.status = result.jobStatus;
        }
        if (listFilesOutput.status != StatusT.StatusOk) {
            deferred.reject(listFilesOutput.status);
        }
        deferred.resolve(listFilesOutput);
    })
    .fail(function(error) {
        console.log("xcalarListFiles() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarMakeRetina(thriftHandle, retinaName, tableName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarMakeRetina(retinaName = " + retinaName +
                ", tableName = " + tableName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.makeRetinaInput = new XcalarApiMakeRetinaInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiMakeRetina;
    workItem.input.makeRetinaInput.retinaName = retinaName;
    workItem.input.makeRetinaInput.tableName = tableName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.statusOutput;
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

function xcalarListRetinas(thriftHandle) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListRetinas()");

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiListRetinas;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listRetinasOutput = result.output.listRetinasOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listRetinasOutput.status = result.jobStatus;
        }
        if (listRetinasOutput.status != StatusT.StatusOk) {
            deferred.reject(listRetinasOutput.status);
        }
        deferred.resolve(listRetinasOutput);
    })
    .fail(function(error) {
        console.log("xcalarListRetinas() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarGetRetina(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarGetRetina(retinaName = " + retinaName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiGetRetina;
    workItem.input.getRetinaInput = retinaName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var getRetinaOutput = result.output.getRetinaOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            getRetinaOutput.status = result.jobStatus;
        }
        if (getRetinaOutput.status != StatusT.StatusOk) {
            deferred.reject(getRetinaOutput.status);
        }
        deferred.resolve(getRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarGetRetina() caught exception: " + error);
        deferred.reject(error);    
    });
    return (deferred.promise());
}

function xcalarUpdateRetina(thriftHandle, retinaName, dagNodeId,
                            paramType, paramInput) {
    var deferred = jQuery.Deferred();
    console.log("xcalarUpdateRetina(retinaName = " + retinaName + ", " +
                "dagNodeId = " + dagNodeId + ", paramType = " + paramType +
                ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.updateRetinaInput = new XcalarApiUpdateRetinaInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiUpdateRetina;
    workItem.input.updateRetinaInput.retinaName = retinaName;
    workItem.input.updateRetinaInput.dagNodeId = dagNodeId;
    workItem.input.updateRetinaInput.paramType = paramType;
    workItem.input.updateRetinaInput.paramInput = paramInput;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.statusOutput;
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

function xcalarExecuteRetina(thriftHandle, retinaName, dstTableName,
                             exportFileName, parameters) {
    var deferred = jQuery.Deferred();
    console.log("xcalarExecuteRetina(retinaName = " + retinaName + ", " +
                "dstTableName = " + dstTableName + ")");
    console.log(parameters);
    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.executeRetinaInput = new XcalarApiExecuteRetinaInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiExecuteRetina;
    workItem.input.executeRetinaInput.retinaName = retinaName;
    workItem.input.executeRetinaInput.dstTableName = dstTableName;
    workItem.input.executeRetinaInput.exportToFile = (exportFileName != null);
    workItem.input.executeRetinaInput.exportFileName = exportFileName;
    workItem.input.executeRetinaInput.numParameters = parameters.length;
    workItem.input.executeRetinaInput.parameters = parameters;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                    result.jobStatus : result.output.statusOutput;
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

function xcalarAddParameterToRetina(thriftHandle, retinaName, parameterName,
                                    parameterValue) {
    var deferred = jQuery.Deferred();
    console.log("xcalarAddParameterToRetina(retinaName = " + retinaName +
                ", parameterName = " + parameterName + ", parameterValue = " +
                parameterValue + ")");
    
    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.addParameterToRetinaInput =
                                     new XcalarApiAddParameterToRetinaInputT();
    workItem.input.addParameterToRetinaInput.parameter = 
                                                     new XcalarApiParameterT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiAddParameterToRetina;
    workItem.input.addParameterToRetinaInput.retinaName = retinaName;
    workItem.input.addParameterToRetinaInput.parameter.parameterName =
                                                                 parameterName;
    workItem.input.addParameterToRetinaInput.parameter.parameterValue =
                                                                parameterValue;
    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = (result.jobStatus != StatusT.StatusOk) ?
                     result.jobStatus : result.output.statusOutput;
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

function xcalarListParametersInRetina(thriftHandle, retinaName) {
    var deferred = jQuery.Deferred();
    console.log("xcalarListParametersInRetina(retinaName = " + retinaName + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiListParametersInRetina;
    workItem.input.listParametersInRetinaInput = retinaName;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var listParametersInRetinaOutput =
                                    result.output.listParametersInRetinaOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            listParametersInRetinaOutput.status = result.jobStatus;
        }
        if (listParametersInRetinaOutput.status != StatusT.StatusOk) {
            deferred.reject(listParametersInRetinaOutput.status);
        }
        deferred.resolve(listParametersInRetinaOutput);
    })
    .fail(function(error) {
        console.log("xcalarListParametersInRetina() caught exception:", error);
        deferred.reject(error);
    });
    return (deferred.promise());
}

function xcalarKeyLookup(thriftHandle, key) {
    var deferred = jQuery.Deferred();
    console.log("xcalarKeyLookup(key = " + key + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiKeyLookup;
    workItem.input.keyLookupInput = key;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var keyLookupOutput = result.output.keyLookupOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            keyLookupOutput.status = result.jobStatus;
        }
        if (keyLookupOutput.status != StatusT.StatusOk) {
            deferred.reject(keyLookupOutput.status);
        }
        deferred.resolve(keyLookupOutput);
    })
    .fail(function(error) {
        console.log("xcalarKeyLookup() caught exception:", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}

function xcalarKeyAddOrReplace(thriftHandle, key, value, persist) {
    var deferred = jQuery.Deferred();
    console.log("xcalarKeyAddOrReplace(key = " + key + ", value = " + value +
        "persist = " + persist.toString() + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.keyAddOrReplaceInput = new XcalarApiKeyAddOrReplaceInputT();
    workItem.input.keyAddOrReplaceInput.kvPair = new XcalarApiKeyValuePairT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiKeyAddOrReplace;
    workItem.input.keyAddOrReplaceInput.persist = persist;
    workItem.input.keyAddOrReplaceInput.kvPair.key = key;
    workItem.input.keyAddOrReplaceInput.kvPair.value = value;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarKeyDelete(thriftHandle, key) {
    var deferred = jQuery.Deferred();
    console.log("xcalarKeyDelete(key = " + key + ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiKeyDelete;
    workItem.input.keyDeleteInput = key;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var status = result.output.statusOutput;
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

function xcalarApiTop(thriftHandle, measureIntervalInMs) {
    var deferred = jQuery.Deferred();
    console.log("xcalarApiTop(measureIntervalInMs = ", measureIntervalInMs, ")");

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.topInput = new XcalarApiTopInputT();

    workItem.apiVersionSignature = XcalarApiVersionT.XcalarApiVersionSignature;
    workItem.api = XcalarApisT.XcalarApiTop;
    workItem.input.topInput.measureIntervalInMs = measureIntervalInMs;

    thriftHandle.client.queueWorkAsync(workItem)
    .then(function(result) {
        var topOutput = result.output.topOutput;
        if (result.jobStatus != StatusT.StatusOk) {
            topOutput = new XcalarApiTopOutputT();
            topOutput.status = result.jobStatus;
        }
        if (topOutput.status != StatusT.StatusOk) {
            deferred.reject(topOutput.status);
        }

        deferred.resolve(topOutput);
    })
    .fail(function(error) {
        console.log("xcalarApiTop() caught exception: ", error);
        deferred.reject(error);
    });

    return (deferred.promise());
}
