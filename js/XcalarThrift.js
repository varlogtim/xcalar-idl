var hostname = "heisenberg";
// var hostname = "10.1.1.158";
var portNumber = 9090;

$(document).ready(function(){
   $('table.XcalarApiService').attr('width', 500);
});

function transportLocation() {
    var str = "http://" + hostname + ":";
    str += portNumber.toString();
    str += "/thrift/service/XcalarApiService/";
    return (str);
}

function XcalarLoad(url, key, tablename, format) {
    console.log(format);
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.loadInput = new XcalarApiBulkLoadInputT();
    workItem.input.loadInput.srcTable = new XcalarApiTableT();
    workItem.input.loadInput.dstTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiBulkLoad;
    workItem.input.loadInput.loadFromPath = true;
    workItem.input.loadInput.path = url;
    workItem.input.loadInput.maxSize = 0;
    switch (format) {
    case ("JSON"):
        workItem.input.loadInput.dfType = DfFormatTypeT.DfTypeJSON;
        break;
    case ("rand"):
        workItem.input.loadInput.dfType = DfFormatTypeT.DfTypeRandom;
        break;
    case ("CSV"):
        workItem.input.loadInput.dfType = DfFormatTypeT.DfTypeCSV;
        break;
    default:
        workItem.input.loadInput.dfType = DfFormatTypeT.DfTypeUnknown;
    }  
    workItem.input.loadInput.keyName = key;
    workItem.input.loadInput.srcTable.tableName = "";
    workItem.input.loadInput.srcTable.handle = 0;
    workItem.input.loadInput.dstTable.tableName = tablename;
    workItem.input.loadInput.dstTable.handle = 0;

    try {
        result = client.queueWork(workItem);
        $('#LoadStatus').val(result.output.statusOutput);
        $('#LoadStatus').css('color', 'black');
    } catch(ouch) {
        $('#LoadStatus').val('fail');
        $('#LoadStatus').css('color', 'red');
    }
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
    workItem.input.tableInput.handle = 0;

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
    workItem.input.tableInput = new XcalarApiTableT();
    workItem.input.tableInput.tableName = tableName;
    workItem.input.tableInput.handle = 0;

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
    workItem.input.tableInput = new XcalarApiTableT();
    workItem.input.tableInput.tableName = tableName;
    workItem.input.tableInput.handle = 0;

    try {
        result = client.queueWork(workItem);
    } catch(ouch) {
        console.log(result.output.makeResultSetOutput.resultSetId);
        console.log("Failed to cat table");
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

function XcalarFilter() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.filterInput = new XcalarApiFilterInputT();
    workItem.input.filterInput.table = new XcalarApiTableT();
    workItem.input.filterInput.filterTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiFilter;
    workItem.input.filterInput.table.tableName = $('#FilterSrcTableName').val();
    workItem.input.filterInput.table.handle = 0;
    workItem.input.filterInput.filterTable.tableName = $('#FilterDstTableName').val();
    workItem.input.filterInput.filterTable.handle = 0;
    workItem.input.filterInput.filterOp = OperatorsOpT.OperatorsLessEqual;
    workItem.input.filterInput.compValue = 3255348558481219398;

    try {
        result = client.queueWork(workItem);
        $('#FilterTableStatus').val(result.output.statusOutput);
        $('#FilterTableStatus').css('color', 'black');
    } catch(ouch) {
        $('#FilterTableStatus').val('fail');
        $('#FilterTableStatus').css('color', 'red');
    }
}

function XcalarJoin() {
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
    workItem.input.joinInput.leftTable.tableName = $('#JoinLeftTableName').val();
    workItem.input.joinInput.leftTable.handle = 0;
    workItem.input.joinInput.rightTable.tableName = $('#JoinLeftTableName').val();
    workItem.input.joinInput.rightTable.handle = 0;
    workItem.input.joinInput.joinTable.tableName = $('#JoinDstTableName').val();
    workItem.input.joinInput.joinTable.handle = 0;
    workItem.input.joinInput.joinType = OperatorsOpT.OperatorsInnerJoin;

    try {
        result = client.queueWork(workItem);
        $('#JoinStatus').val(result.output.statusOutput);
        $('#JoinStatus').css('color', 'black');
    } catch(ouch) {
        $('#JoinStatus').val('fail');
        $('#JoinStatus').css('color', 'red');
    }
}

function XcalarGroupBy() {
    var transport = new Thrift.Transport(transportLocation());
    var protocol  = new Thrift.Protocol(transport);
    var client    = new XcalarApiServiceClient(protocol);

    var workItem = new XcalarApiWorkItemT();
    workItem.input = new XcalarApiInputT();
    workItem.input.groupByInput = new XcalarApiGroupByInputT();
    workItem.input.groupByInput.table = new XcalarApiTableT();
    workItem.input.groupByInput.groupByTable = new XcalarApiTableT();

    workItem.apiVersion = 0;
    workItem.api = XcalarApisT.XcalarApiGroupBy;
    workItem.input.groupByInput.table.tableName = $('#GroupSrcTableName').val();
    workItem.input.groupByInput.table.handle = 0;
    workItem.input.groupByInput.groupByTable.tableName = $('#GroupDstTableName').val();
    workItem.input.groupByInput.groupByTable.handle = 0;
    workItem.input.groupByInput.groupByOp = OperatorsOpT.OperatorsAverage;

    try {
        result = client.queueWork(workItem);
        $('#GroupStatus').val(result.output.statusOutput);
        $('#GroupStatus').css('color', 'black');
    } catch(ouch) {
        $('#GroupStatus').val('fail');
        $('#GroupStatus').css('color', 'red');
    }
}
