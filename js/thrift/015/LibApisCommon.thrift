# Copyright 2014 - 2015 Xcalar, Inc. All rights reserved.
#
# No use, or distribution, of this source code is permitted in any form or
# means without a valid, written license agreement with Xcalar, Inc.
# Please refer to the included "COPYING" file for terms and conditions
# regarding the use and redistribution of this software.
#
# ******************************************************************
# *********** MUST BE KEPT IN SYNC WITH LibApisCommon.h ***********
# ******************************************************************
#

include "Status.thrift"
include "DataFormatEnums.thrift"
include "LibApisEnums.thrift"
include "LibApisConstants.thrift"
include "JoinOpEnums.thrift"
include "AggregateOpEnums.thrift"
include "XcalarApiVersionSignature.thrift"
include "GenericTypesEnums.thrift"
include "QueryStateEnums.thrift"

exception XcalarApiException {
  1: Status.StatusT status
}

// ****** do not update DfFieldAttrHeaderT without also updating ******
// ****** DataFormatTypes.h                                      ******
struct DfFieldAttrHeaderT {
  1: string name
  2: DataFormatEnums.DfFieldTypeT type
}

// ****** do not update XcalarApiDsDatasetIdT without also updating ******
// ****** DatasetTypes.h                                            ******
typedef i64 XcalarApiDsDatasetIdT

struct OperatorsMetaT {
  1: i32 entryType
  2: DfFieldAttrHeaderT keysAttrHeader
  3: i64 dataset
}

typedef i64 XcalarApiDagNodeIdT
const i64 XcalarApiDagNodeIdInvalidT = 0

// ****** do not update KeyValuePair*T without also updating ******
// ****** GenericTypes.h                                     ******
struct KeyValuePairFixedT {
  1: i64 key
  2: i64 value
}

struct KeyValuePairVariableT {
  1: i64 key
  2: i64 valueSize
  3: string value
}

union KeyValuePairT {
  1: KeyValuePairFixedT kvPairFixed
  2: KeyValuePairVariableT kvPairVariable
}

struct KeyValuePairsT {
  1: GenericTypesEnums.GenericTypesRecordTypeT recordType
  2: i64 totalRecordsSize
  3: i32 numRecords
  4: list<KeyValuePairT> records
}

struct XcalarApiFileAttrT {
  1: bool isDirectory
  2: i64 size
}

struct XcalarApiFileT {
  1: XcalarApiFileAttrT attr
  2: string name
}

struct XcalarApiListFilesInputT {
  1: string url
}

struct XcalarApiListFilesOutputT {
  1: Status.StatusT status
  2: i64 numFiles
  3: list<XcalarApiFileT> files
}

typedef i64 XcalarApiTableIdT

const i64 XcalarApiTableIdInvalidT = 0

typedef i64 XcalarApiDatasetIdT

struct XcalarApiTableT {
  1: string tableName
  2: XcalarApiTableIdT tableId
}

struct XcalarApiDatasetT {
  1: string url
  2: XcalarApiDatasetIdT datasetId
  3: DataFormatEnums.DfFormatTypeT formatType
  4: string name
  5: bool loadIsComplete
  6: i32 refCount
}

struct XcalarApiDfCsvLoadArgsT {
  1: string recordDelim
  2: string fieldDelim
}
struct XcalarApiDfLoadArgsT {
  1: XcalarApiDfCsvLoadArgsT csv
}

struct XcalarApiExportInputT {
  1: XcalarApiTableT srcTable
  2: string fileName
}

struct XcalarApiExportOutputT {
  1: Status.StatusT status
  2: string outputPath
}

struct XcalarApiBulkLoadInputT {
  1: XcalarApiDatasetT dataset
  2: i64 maxSize
  3: XcalarApiDfLoadArgsT loadArgs
}

struct XcalarApiIndexInputT {
  1: bool isTableBacked
  2: XcalarApiTableT srcTable
  3: XcalarApiDatasetIdT datasetId
  4: string keyName
  5: XcalarApiTableT dstTable
}

struct XcalarApiStatInputT {
  1: i64 nodeId
}

struct XcalarApiMakeRetinaInputT {
  1: string retinaName
  2: string tableName
}

struct XcalarApiFilterInputT {
  1: string filterStr
  2: XcalarApiTableT srcTable
  3: XcalarApiTableT dstTable
}

struct XcalarApiGroupByInputT {
  1: XcalarApiTableT table
  2: XcalarApiTableT groupByTable
  3: AggregateOpEnums.AggregateOperatorT groupByOp
  4: string fieldName
  5: string newFieldName
}

struct XcalarApiAggregateInputT {
  1: XcalarApiTableT table
  2: AggregateOpEnums.AggregateOperatorT aggregateOp
  3: string fieldName
}

struct XcalarApiEditColInputT {
  1: XcalarApiDatasetIdT datasetId
  2: XcalarApiTableT table
  3: bool isDataset
  4: string currFieldName
  5: string newFieldName
  6: DataFormatEnums.DfFieldTypeT newFieldType
}

struct XcalarApiMakeResultSetInputT {
  1: bool fromTable
  2: XcalarApiTableT table
  3: XcalarApiDatasetIdT datasetId
}

struct XcalarApiResultSetNextInputT {
  1: i64 resultSetId
  2: i64 numRecords
}

struct XcalarApiFreeResultSetInputT {
  1: i64 resultSetId
}

struct XcalarApiStatT {
  1: string threadName
  2: string statName
  3: i64 statValue
  4: i32 statType
  5: i32 statLife
  6: i64 groupId
}

struct XcalarApiJoinInputT {
  1: XcalarApiTableT leftTable
  2: XcalarApiTableT rightTable
  3: XcalarApiTableT joinTable
  4: JoinOpEnums.JoinOperatorT joinType
}

struct XcalarApiResultSetAbsoluteInputT {
  1: i64 resultSetId
  2: i64 position
}

struct XcalarApiDestroyDatasetInputT {
  1: XcalarApiDsDatasetIdT datasetId
}

struct XcalarApiParameterT {
  1: string parameterName
  2: string parameterValue
}

struct XcalarApiParamLoadT {
  1: string datasetUrl
}

struct XcalarApiParamFilterT {
  1: string filterStr
}

union XcalarApiParamInputT {
  1: XcalarApiParamLoadT   paramLoad
  2: XcalarApiParamFilterT paramFilter
}

struct XcalarApiUpdateRetinaInputT {
  1: string retinaName
  2: XcalarApiDagNodeIdT dagNodeId
  3: LibApisEnums.XcalarApisT paramType
  4: XcalarApiParamInputT paramInput
}

struct XcalarApiAddParameterToRetinaInputT {
  1: string retinaName
  2: XcalarApiParameterT parameter
}

struct XcalarApiListParametersInRetinaOutputT {
  1: Status.StatusT status
  2: i64 numParameters
  3: list<XcalarApiParameterT> parameters
}

struct XcalarApiExecuteRetinaInputT {
  1: string retinaName
  2: bool exportToFile
  3: string dstTableName
  4: string exportFileName
  5: i64 numParameters
  6: list<XcalarApiParameterT> parameters
}

struct XcalarApiGetStatOutputT {
  1: Status.StatusT status
  2: i64 numStats
  3: list<XcalarApiStatT> stats
}

struct XcalarApiStatByGroupIdInputT {
  1: i64 nodeId
  2: i64 numGroupId
  3: list<i64> groupId
}

struct XcalarApiMapInputT {
  1: string evalStr
  2: XcalarApiTableT srcTable
  3: XcalarApiTableT dstTable
  4: string newFieldName
}

struct XcalarApiQueryStateInputT {
  1: i64 queryId;
}

// the index in groupName represents the group id; the range is guaranteed to
// be monotonically increasing and contiguous beginning from 0
struct XcalarApiGetStatGroupIdMapOutputT {
    1: Status.StatusT status;
    2: i64 numGroupNames
    3: list<string> groupName
}

struct XcalarApiCountOutputT {
  1: Status.StatusT status
  2: i64 numCounts
  3: list<i64> counts
}

struct XcalarApiMakeResultSetOutputT {
  1: Status.StatusT status
  2: i64 resultSetId
  3: i64 numEntries
}

struct XcalarApiResultSetNextOutputT {
  1: Status.StatusT status
  2: DfFieldAttrHeaderT keysAttrHeader
  3: KeyValuePairsT kvPairs
}

// XXX FIXME should add Status.StatusT status field
struct XcalarApiListTablesOutputT {
  1: i64 numTables
  2: list<XcalarApiTableT> tables
}

// XXX FIXME should add Status.StatusT status field
struct XcalarApiListDatasetsOutputT {
  1: i32 numDatasets
  2: list<XcalarApiDatasetT> datasets
}

struct XcalarApiDeleteTableStatusT {
  1: XcalarApiTableT table
  2: Status.StatusT status
}

struct XcalarApiBulkDeleteTablesOutputT {
  1: i32 numTables
  2: Status.StatusT status
  3: list<XcalarApiDeleteTableStatusT> statuses
}

struct XcalarApiNewTableOutputT {
  1: Status.StatusT status
  2: string tableName
}

struct XcalarApiGetTableRefCountOutputT {
  1: Status.StatusT status
  2: i64 refCount
}

struct XcalarApiQueryOutputT {
  1: Status.StatusT status
  2: i64 queryId
  3: i64 nodeId
}

struct XcalarApiBulkLoadOutputT {
  1: Status.StatusT status
  2: XcalarApiDsDatasetIdT datasetId
}

struct XcalarApiGetVersionOutputT {
  1: string version
  2: string apiVersionSignatureFull
  3: XcalarApiVersionSignature.XcalarApiVersionT apiVersionSignatureShort
}

struct XcalarApiAggregateOutputT {
  1: Status.StatusT status
  2: string jsonAnswer
}

struct XcalarApiSingleQueryT {
  1: string  singleQuery
  2: Status.StatusT status
}

struct XcalarApiQueryStateOutputT {
  1: QueryStateEnums.QueryStateT queryState
  2: Status.StatusT queryStatus
  3: string query;
  4: i64 numQueuedWorkItem
  5: i64 numRunningWorkItem
  6: i64 numCompletedWorkItem
  7: i64 numFailedWorkItem
  8: list<XcalarApiSingleQueryT> failedSingleQueryArray
}

union XcalarApiInputT {
  1: XcalarApiBulkLoadInputT      loadInput
  2: XcalarApiIndexInputT         indexInput
  3: XcalarApiStatInputT          statInput
  4: XcalarApiTableT              tableInput
  5: XcalarApiResultSetNextInputT resultSetNextInput
  6: XcalarApiJoinInputT          joinInput
  7: XcalarApiFilterInputT        filterInput
  8: XcalarApiGroupByInputT       groupByInput
  10: XcalarApiEditColInputT       editColInput
  11: XcalarApiResultSetAbsoluteInputT resultSetAbsoluteInput
  12: XcalarApiFreeResultSetInputT freeResultSetInput
  13: XcalarApiTableT             deleteTableInput
  14: XcalarApiTableT             getTableRefCountInput
  15: string                      listTablesInput
  16: string                      bulkDeleteTablesInput
  17: string                      queryInput
  18: XcalarApiDestroyDatasetInputT destroyDsInput
  19: XcalarApiStatByGroupIdInputT statByGroupIdInput
  20: XcalarApiMakeResultSetInputT makeResultSetInput
  21: XcalarApiMapInputT          mapInput
  22: XcalarApiAggregateInputT    aggregateInput
  23: XcalarApiQueryStateInputT   queryStateInput
  24: XcalarApiExportInputT       exportInput
  25: string                      dagTableNameInput
  26: XcalarApiListFilesInputT    listFilesInput
  27: XcalarApiMakeRetinaInputT   makeRetinaInput
  28: string                      getRetinaInput
  29: XcalarApiExecuteRetinaInputT executeRetinaInput
  30: XcalarApiUpdateRetinaInputT updateRetinaInput
  31: XcalarApiAddParameterToRetinaInputT addParameterToRetinaInput
  32: string                      listParametersInRetinaInput
}

struct XcalarApiDagNodeT {
    1: XcalarApiDagNodeIdT dagNodeId
    2: LibApisEnums.XcalarApisT api
    3: XcalarApiInputT input
}

struct XcalarApiDagOutputT {
    1: Status.StatusT status
    2: i64 numNodes
    3: list<XcalarApiDagNodeT> node
}

struct XcalarApiRetinaDescT {
    1: string retinaName
}

struct XcalarApiRetinaT {
    1: XcalarApiRetinaDescT retinaDesc
    2: XcalarApiDagOutputT retinaDag
}

struct XcalarApiListRetinasOutputT {
    1: Status.StatusT status
    2: i64 numRetinas
    3: list<XcalarApiRetinaDescT> retinaDescs
}

struct XcalarApiGetRetinaOutputT {
    1: Status.StatusT status
    2: XcalarApiRetinaT retina
}

union XcalarApiOutputT {
  1: XcalarApiGetVersionOutputT    getVersionOutput
  2: Status.StatusT                statusOutput
  3: XcalarApiGetStatOutputT       statOutput
  4: XcalarApiListTablesOutputT    listTablesOutput
  5: XcalarApiMakeResultSetOutputT makeResultSetOutput
  6: XcalarApiResultSetNextOutputT resultSetNextOutput
  7: XcalarApiCountOutputT         countOutput
  8: XcalarApiNewTableOutputT      indexOutput
  9: XcalarApiBulkLoadOutputT      loadOutput
  10: XcalarApiGetTableRefCountOutputT getTableRefCountOutput
  11: XcalarApiBulkDeleteTablesOutputT deleteTablesOutput
  12: XcalarApiNewTableOutputT     joinOutput
  13: XcalarApiGetStatGroupIdMapOutputT statGroupIdMapOutput
  14: XcalarApiListDatasetsOutputT    listDatasetsOutput
  15: XcalarApiNewTableOutputT     mapOutput
  16: XcalarApiAggregateOutputT    aggregateOutput
  17: XcalarApiNewTableOutputT     filterOutput
  18: XcalarApiQueryOutputT        queryOutput
  19: XcalarApiQueryStateOutputT   queryStateOutput
  20: XcalarApiExportOutputT       exportOutput
  21: XcalarApiDagOutputT          dagOutput
  22: XcalarApiListFilesOutputT    listFilesOutput
  23: XcalarApiNewTableOutputT     groupByOutput
  24: XcalarApiListRetinasOutputT  listRetinasOutput
  25: XcalarApiGetRetinaOutputT    getRetinaOutput
  26: XcalarApiListParametersInRetinaOutputT listParametersInOutput
}

struct XcalarApiWorkItemT {
  1: XcalarApiVersionSignature.XcalarApiVersionT apiVersionSignature
  2: LibApisEnums.XcalarApisT api
  3: XcalarApiInputT input
}

struct XcalarApiWorkItemResult {
 # equivalent to libapis_common.h:XcalarWorkItem.status
  1: Status.StatusT jobStatus
  2: XcalarApiOutputT output
}

service XcalarApiService {
    XcalarApiWorkItemResult queueWork(1:XcalarApiWorkItemT workItem) throws (1:XcalarApiException err)
}
