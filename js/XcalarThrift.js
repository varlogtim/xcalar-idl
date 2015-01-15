function transportLocation() {
    var str = "http://" + hostname + ":";
    str += portNumber.toString();
    str += "/thrift/service/XcalarApiService/";
    return (str);
}

function XcalarLoad(url, format, datasetName) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.dataset = new XcalarApiDatasetT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.maxSize = 0; // Load everything
    workItem.input.loadInput.dataset.url = url;
    workItem.input.loadInput.dataset.name = datasetName;
    
    switch (format) {
    case ("JSON"):
        workItem.input.loadInput.dataset.formatType = DfFormatTypeT.DfTypeJson;
        break;
    case ("rand"):
        workItem.input.loadInput.dataset.formatType = DfFormatTypeT.DfTypeRandom;
        break;
    case ("CSV"):
        workItem.input.loadInput.dataset.formatType = DfFormatTypeT.DfTypeCsv;
        break;
    default:
        workItem.input.loadInput.dataset.formatType = DfFormatTypeT.DfTypeUnknown;
    }  

    try {
        result = client.queueWork(workItem);
        console.log(result);
        if (result.output.loadOutput.status != StatusT.StatusOk) {
            return (null);
        }
        return (result.output.loadOutput.datasetId);
    } catch(ouch) {
        console.log(ouch);
        console.log("Load Failed");
    }
    return (null);
}

function XcalarIndexFromDataset(varDatasetId, key, tablename) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiIndex;
    
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.dstTable = new XcalarApiTableT();
    workItem.input.indexInput.dstTable.tableName = tablename;
    workItem.input.indexInput.datasetId = varDatasetId;
    workItem.input.indexInput.keyName = key;
    workItem.input.indexInput.isTableBacked = false;

    try {
        console.log(workItem);
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Load from index failed");
    }
}

function XcalarIndexFromTable(srcTablename, key, tablename) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiIndex;
    
    workItem.input = new XcalarApiInputT();
    workItem.input.indexInput = new XcalarApiIndexInputT();
    workItem.input.indexInput.srcTable = new XcalarApiTableT();
    workItem.input.indexInput.srcTable.tableName = srcTablename;
    workItem.input.indexInput.dstTable = new XcalarApiTableT();
    workItem.input.indexInput.dstTable.tableName = tablename;
    workItem.input.indexInput.keyName = key;
    workItem.input.indexInput.isTableBacked = true;
    workItem.input.indexInput.datasetId = 0;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Load from index failed");
    }
}

function XcalarEditColumn(datasetId, currFieldName, newFieldName, newFieldType)
{
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiEditColumn;
    
    workItem.input = new XcalarApiInputT();
    workItem.input.editColInput = new XcalarApiEditColInputT();
    workItem.input.editColInput.isDataset = true;
    workItem.input.editColInput.datasetId = datasetId;
    workItem.input.editColInput.currFieldName = currFieldName;
    workItem.input.editColInput.newFieldName = newFieldName;
    workItem.input.editColInput.newFieldType = newFieldType;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Load from index failed");
    }
}

function XcalarSample(datasetId, numEntries) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiMakeResultSetInputT();
    workItem.input.makeResultSetInput.fromTable = false;
    workItem.input.makeResultSetInput.datasetId = datasetId;
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(result.output.makeResultSetOutput.resultSetId);
        console.log("Failed to make sample set");
        return;
    }
    
    var resultSetId = result.output.makeResultSetOutput.resultSetId;
    return (XcalarGetNextPage(resultSetId, numEntries));
}

function XcalarGetCount(tableName) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiCountUnique;
    workItem.input = new XcalarApiInputT();
    workItem.input.tableInput = new XcalarApiTableT();
    workItem.input.tableInput.tableName = tableName;

    var totEntries = 0;
    try {
        result = client.queueWork(workItem);
        var numNodes = result.output.countOutput.numCounts;
        for (var i = 0; i<numNodes; i++) {
            totEntries += result.output.countOutput.counts[i];
        }
    } catch(ouch) {
        console.log("Failed to get count");
        console.log(ouch.status);
    }
    return (totEntries);
}

function XcalarGetDatasets() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListDatasets;

    console.log(workItem.api);
    try {
        result = client.queueWork(workItem);
        return (result.output.listDatasetsOutput);
    } catch (ouch) {
        console.log(ouch);
        console.log("Couldn't get table names");
        return (0);
    }
}

function XcalarGetTables() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiListTables;
    workItem.input.listTablesInput = "*";

    console.log(workItem.api);
    try {
        result = client.queueWork(workItem);
        return (result.output.listTablesOutput);
    } catch (ouch) {
        console.log(ouch);
        console.log("Couldn't get table names");
        return (0);
    }
}

function XcalarGetStats() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.statInput = new XcalarApiGetStatInputT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiGetStat;
    workItem.input.statInput.nodeId = 0;
    workItem.input.statInput.threadNamePattern = $('#GetStatThreadPattern').val();
    workItem.input.statInput.statNamePattern = $('#GetStatNamePattern').val();

    try {
        result = client.queueWork(workItem);
        $('#GetStatStatus').val(result.output.statOutput.status);
        $('#GetStat0Thread').val(result.output.statOutput.stats[0].threadName);
        $('#GetStat0Name').val(result.output.statOutput.stats[0].statName);
        $('#GetStat0Val').val(result.output.statOutput.stats[0].statValue);

        $('#GetStatStatus').css('color', 'black');
        $('#GetStat0Thread').css('color', 'black');
        $('#GetStat0Name').css('color', 'black');
        $('#GetStat0Val').css('color', 'black');
    } catch(ouch) {
        $('#GetStatStatus').val('fail');
        $('#GetStatStatus').css('color', 'red');
    }
}

function XcalarShutdown() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiShutdown;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
    }
}

function XcalarGetNumEntries(tableName, numEntries) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiMakeResultSetInputT();
    workItem.input.makeResultSetInput.fromTable = true;
    workItem.input.makeResultSetInput.table = new XcalarApiTableT();
    workItem.input.makeResultSetInput.table.tableName = tableName;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log("Failed to cat table");
        return;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to cat table2");
      return;
    }

    if (result.output.makeResultSetOutput.status != StatusT.StatusOk) {
      console.log("Failed to cat table3");
      return;
    }
    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();
    workItem.input.resultSetNextInput.resultSet =
        result.output.makeResultSetOutput.resultSet;
    workItem.input.resultSetNextInput.numRecords = numEntries;
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
      console.log("Failed to cat table4");
      return;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to cat table5");
      return;
    }

    return (result.output.resultSetNextOutput.numRecords);
}

function XcalarGetTableRefCount(tableName) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiGetTableRefCount;
    workItem.input = new XcalarApiInputT();
    workItem.input.getTableRefCountInput = new XcalarApiTableT();
    workItem.input.getTableRefCountInput.tableName = tableName;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log("Failed to getRefCount");
        return;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to getRefCount2");
      return;
    }

    if (result.output.getTableRefCountOutput.status != StatusT.StatusOk) {
        console.log(result.output.getTableRefCountOutput.status);
        console.log(StatusT.StatusNoSuchTable);
        console.log(result.output);
        console.log("Failed to getRefCount3");
        return;
    }

    return (result.output.getTableRefCountOutput.refCount);
}

function XcalarGetTableId(tableName) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiMakeResultSet;
    workItem.input = new XcalarApiInputT();
    workItem.input.makeResultSetInput = new XcalarApiMakeResultSetInputT();
    workItem.input.makeResultSetInput.fromTable = true;
    workItem.input.makeResultSetInput.table = new XcalarApiTableT();
    console.log(tableName);
    workItem.input.makeResultSetInput.table.tableName = tableName;
    workItem.input.makeResultSetInput.datasetId = 0;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(result.output.makeResultSetOutput.resultSetId);
        console.log("Failed to make result set");
        return;
    }
    return result.output.makeResultSetOutput.resultSetId;
}

function XcalarSetAbsolute(resultSetId, position) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.api = XcalarApisT.XcalarApiResultSetAbsolute;
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetAbsoluteInput = new XcalarApiResultSetAbsoluteInputT();
    workItem.input.resultSetAbsoluteInput.resultSetId = resultSetId;
    workItem.input.resultSetAbsoluteInput.position = position;
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
      console.log("Failed to cat table4");
      return false;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to cat table5");
      return false;
    }

    return true;
}

function XcalarGetNextPage(resultSetId, numEntries) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.api = XcalarApisT.XcalarApiResultSetNext;
    workItem.input = new XcalarApiInputT();
    workItem.input.resultSetNextInput = new XcalarApiResultSetNextInputT();
    workItem.input.resultSetNextInput.resultSetId = resultSetId;
    workItem.input.resultSetNextInput.numRecords = numEntries;
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
      console.log("Failed to cat table4");
      return;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to cat table5");
      return;
    }

    return (result.output.resultSetNextOutput);
}

function XcalarSetFree(resultSetId) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.api = XcalarApisT.XcalarApiFreeResultSet;
    workItem.input = new XcalarApiInputT();
    workItem.input.freeResultSetInput = new XcalarApiFreeResultSetInputT();
    workItem.input.freeResultSetInput.resultSetId = resultSetId;
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
      console.log("Failed to free1");
      return false;
    }

    if (result.jobStatus != StatusT.StatusOk) {
      console.log("Failed to free2");
      return false;
    }

    return true;
}

function XcalarFilter(operator, value, columnName, srcTablename, dstTablename) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.srcTable = new XcalarApiTableT();
    workItem.input.filterInput.dstTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.srcTable.tableName = srcTablename;
    workItem.input.filterInput.dstTable.tableName = dstTablename;
    switch (operator) {
    case ("Greater Than"):
        workItem.input.filterInput.filterStr = "gt("+columnName+", "+value+")";
        break;
    case ("Greater Than Equal To"):
        workItem.input.filterInput.filterStr = "ge("+columnName+", "+value+")";
        break;
    case ("Equals"):
        workItem.input.filterInput.filterStr = "eq("+columnName+", "+value+")";
         break;
    case ("Less Than"):
        workItem.input.filterInput.filterStr = "lt("+columnName+", "+value+")";
        break;
    case ("Less Than Equal To"):
        workItem.input.filterInput.filterStr = "le("+columnName+", "+value+")";
        break;
    case ("Regex"):
        workItem.input.filterInput.filterStr = "regex("+columnName+', "'+value+
                                               '")';
        break;
    case ("Others"):
        workItem.input.filterInput.filterStr = value;
        break;
    default:
        console.log("Unknown op "+operator);
    }
    
    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Filter bug");
    }
}

function XcalarMap(evalStr, srcTablename, dstTablename) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.mapInput = new XcalarApiMapInputT();
    workItem.input.mapInput.srcTable = new XcalarApiTableT();
    workItem.input.mapInput.dstTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiMap;
    workItem.input.mapInput.srcTable.tableName = srcTablename;
    workItem.input.mapInput.dstTable.tableName = dstTablename;
    workItem.input.mapInput.evalStr = evalStr;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Map bug");
    }
}   

function XcalarAggregate(fieldName, srcTablename, op) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.aggregateInput = new XcalarApiAggregateInputT();
    workItem.input.aggregateInput.table = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiAggregate;
    workItem.input.aggregateInput.table.tableName = srcTablename;
    workItem.input.aggregateInput.fieldName = fieldName;

    switch (op) {
    case ("Max"):
        workItem.input.aggregateInput.aggregateOp =
            OperatorsOpT.OperatorsMax;
        break;
    case ("Min"):
        workItem.input.aggregateInput.aggregateOp = 
            OperatorsOpT.OperatorsMin;
        break;
    case ("Avg"):
        workItem.input.aggregateInput.aggregateOp = 
            OperatorsOpT.OperatorsAverage;
        break;
    case ("Count"):
        workItem.input.aggregateInput.aggregateOp = 
            OperatorsOpT.OperatorsCountKeys;
        break;
    case ("Sum"):
        workItem.input.aggregateInput.aggregateOp = 
            OperatorsOpT.OperatorsSumKeys;
        break;
    default:
        console.log("bug!:"+op);
    }

    try {
        result = client.queueWork(workItem);
        console.log(result);
        return (result.output.aggregateOutput.jsonAnswer);
    } catch(ouch) {
        console.log(ouch);
        console.log("Aggregate bug");
    }
}

function XcalarJoin(left, right, dst) {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.joinInput = new XcalarApiJoinInputT();
    workItem.input.joinInput.leftTable = new XcalarApiTableT();
    workItem.input.joinInput.rightTable = new XcalarApiTableT();
    workItem.input.joinInput.joinTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiJoin;
    workItem.input.joinInput.leftTable.tableName = left;
    workItem.input.joinInput.rightTable.tableName = right;
    workItem.input.joinInput.joinTable.tableName = dst;
    workItem.input.joinInput.joinType = OperatorsOpT.OperatorsInnerJoin;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(ouch);
        console.log("Join failed");
    }
}

// THIS FUNCTION CALLES XcalarApi.js!!

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
    default:
        console.log("Wrong operator! "+operator);
    }
    xcalarGroupBy(handle, tableName, newTableName, op, oldColName, newColName);
}
