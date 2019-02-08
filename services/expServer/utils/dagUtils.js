global.Thrift = Thrift = require("../../../assets/js/thrift/thrift.js").Thrift;
global.hackFunction = require("./hackFunction.js").hackFunction;

hackFunction();

require("../dagHelper/enums.js");
require("../../../assets/js/thrift/XcalarApiService.js");
require("../../../assets/js/thrift/XcalarApiVersionSignature_types.js");
require("../../../assets/js/thrift/XcalarApiServiceAsync.js");
require("../../../assets/js/thrift/XcalarEvalEnums_types.js");
require("../../../assets/js/thrift/OrderingEnums_types.js");

global.xcalarApi = xcalarApi = require("../../../assets/js/thrift/XcalarApi.js");

global.PromiseHelper = PromiseHelper = require("../../../assets/js/promiseHelper.js");
require("../../../assets/js/XcalarThrift.js");

// Added for KVS to query conversion
global.Ajv = require("../../../3rd/AJV/ajv.js");
global.XcUID = require("../dagHelper/XcUID.js").XcUID;

// The order of these is needed as there's dependancies between the files.
global.DagHelper = require("../DagHelperIndex.js").DagHelper
global.DagNodeType = require("../dagHelper/DagEnums.js").DagNodeType
global.DagNodeSubType = require("../dagHelper/DagEnums.js").DagNodeSubType
global.DagNodeState = require("../dagHelper/DagEnums.js").DagNodeState
global.DagNodeEvents = require("../dagHelper/DagEnums.js").DagNodeEvents
global.DagNodeFactory = require("../dagHelper/DagNodeFactory.js").DagNodeFactory
global.DagNode = require("../dagHelper/node/DagNode.js").DagNode
global.DagNodeIn = require("../dagHelper/node/DagNodeIn.js").DagNodeIn
global.DagNodeDataset = require("../dagHelper/node/DagNodeDataset.js").DagNodeDataset
global.DagParamManager = require("../dagHelper/DagParamManager.js").DagParamManager
global.DagNodeInput = require("../dagHelper/nodeInput/DagNodeInput.js").DagNodeInput
global.DagLineage = require("../dagHelper/DagLineage.js").DagLineage
global.DagNodeDatasetInput = require("../dagHelper/nodeInput/DagNodeDatasetInput.js").DagNodeDatasetInput
global.XDFManager = require("../dagHelper/xdfManager.js").XDFManager
global.DagNodeMap = require("../dagHelper/node/DagNodeMap.js").DagNodeMap
global.DagNodeMapInput = require("../dagHelper/nodeInput/DagNodeMapInput.js").DagNodeMapInput
global.DagNodeOut = require("../dagHelper/node/DagNodeOut.js").DagNodeOut
global.DagNodeOutOptimizable = require("../dagHelper/node/DagNodeOutOptimizable.js").DagNodeOutOptimizable
global.DagNodeExport = require("../dagHelper/node/DagNodeExport.js").DagNodeExport
 global.DagNodeExportInput = require("../dagHelper/nodeInput/DagNodeExportInput.js").DagNodeExportInput
global.DagNodeSQLFuncIn = require("../dagHelper/node/DagNodeSQLFuncIn.js").DagNodeSQLFuncIn
global.CommentNode = require("../dagHelper/node/CommentNode.js").CommentNode
// XXX: Needed by DagGraph.getQuery()
global.DagTab = require("../dagHelper/DagTab.js").DagTab
// global.DagList = require("../dagHelper/DagList.js").DagList
// XXX: Needed by DagNodeExecutor
global.DagTblManager = require("../dagHelper/DagTblManager.js").DagTblManager
global.DagNodeExecutor = require("../dagHelper/DagNodeExecutor.js").DagNodeExecutor
global.DagGraphExecutor = require("../dagHelper/DagGraphExecutor.js").DagGraphExecutor
global.DagNodeFilter = require("../dagHelper/node/DagNodeFilter.js").DagNodeFilter
global.DagNodeFilterInput = require("../dagHelper/nodeInput/DagNodeFilterInput.js").DagNodeFilterInput

// Ordering may not yet be determined.

global.DagNodeAggregateInput = require("../dagHelper/nodeInput/DagNodeAggregateInput.js").DagNodeAggregateInput
global.DagNodeAggregate = require("../dagHelper/node/DagNodeAggregate.js").DagNodeAggregate
global.DagNodeCustom = require("../dagHelper/node/DagNodeCustom.js").DagNodeCustom
global.DagNodeCustomInput = require("../dagHelper/node/DagNodeCustomInput.js").DagNodeCustomInput
global.DagNodeCustomOutput = require("../dagHelper/node/DagNodeCustomOutput.js").DagNodeCustomOutput
global.DagNodeDFIn = require("../dagHelper/node/DagNodeDFIn.js").DagNodeDFIn
global.DagNodeDFInInput = require("../dagHelper/nodeInput/DagNodeDFInInput.js").DagNodeDFInInput
global.DagNodeDFOut = require("../dagHelper/node/DagNodeDFOut.js").DagNodeDFOut
global.DagNodeDFOutInput = require("../dagHelper/nodeInput/DagNodeDFOutInput.js").DagNodeDFOutInput
global.DagNodeExplode = require("../dagHelper/node/DagNodeExplode.js").DagNodeExplode
global.DagNodeExtension = require("../dagHelper/node/DagNodeExtension.js").DagNodeExtension
global.DagNodeExtensionInput = require("../dagHelper/nodeInput/DagNodeExtensionInput.js").DagNodeExtensionInput
global.DagNodeGroupBy = require("../dagHelper/node/DagNodeGroupBy.js").DagNodeGroupBy
global.DagNodeGroupByInput = require("../dagHelper/nodeInput/DagNodeGroupByInput.js").DagNodeGroupByInput
global.DagNodeIMDTable = require("../dagHelper/node/DagNodeIMDTable.js").DagNodeIMDTable
global.DagNodeIMDTableInput = require("../dagHelper/nodeInput/DagNodeIMDTableInput.js").DagNodeIMDTableInput

global.DagNodeIndex = require("../dagHelper/node/DagNodeIndex.js").DagNodeIndex
global.DagNodeIndexInput = require("../dagHelper/nodeInput/DagNodeIndexInput.js").DagNodeIndexInput
global.DagNodeJoinInput = require("../dagHelper/nodeInput/DagNodeJoinInput.js").DagNodeJoinInput
global.DagNodeJoin = require("../dagHelper/node/DagNodeJoin.js").DagNodeJoin
global.DagNodeJupyter = require("../dagHelper/node/DagNodeJupyter.js").DagNodeJupyter
global.DagNodeJupyterInput = require("../dagHelper/nodeInput/DagNodeJupyterInput.js").DagNodeJupyterInput
global.DagNodePlaceholder = require("../dagHelper/node/DagNodePlaceholder.js").DagNodePlaceholder
global.DagNodePlaceholderInput = require("../dagHelper/nodeInput/DagNodePlaceholderInput.js").DagNodePlaceholderInput
global.DagNodeProject = require("../dagHelper/node/DagNodeProject.js").DagNodeProject
global.DagNodeProjectInput = require("../dagHelper/nodeInput/DagNodeProjectInput.js").DagNodeProjectInput
global.DagNodePublishIMD = require("../dagHelper/node/DagNodePublishIMD.js").DagNodePublishIMD
global.DagNodePublishIMDInput = require("../dagHelper/nodeInput/DagNodePublishIMDInput.js").DagNodePublishIMDInput
global.DagNodeRound = require("../dagHelper/node/DagNodeRound.js").DagNodeRound
global.DagNodeRowNum = require("../dagHelper/node/DagNodeRowNum.js").DagNodeRowNum
global.DagNodeRowNumInput = require("../dagHelper/nodeInput/DagNodeRowNumInput.js").DagNodeRowNumInput
global.DagNodeSQL = require("../dagHelper/node/DagNodeSQL.js").DagNodeSQL
global.DagNodeSQLFuncOut = require("../dagHelper/node/DagNodeSQLFuncOut.js").DagNodeSQLFuncOut
global.DagNodeSQLSubInput = require("../dagHelper/node/DagNodeSQLSubInput.js").DagNodeSQLSubInput
global.DagNodeSQLSubOutput = require("../dagHelper/node/DagNodeSQLSubOutput.js").DagNodeSQLSubOutput
global.DagNodeSet = require("../dagHelper/node/DagNodeSet.js").DagNodeSet
global.DagNodeSetInput = require("../dagHelper/nodeInput/DagNodeSetInput.js").DagNodeSetInput
global.DagNodeSort = require("../dagHelper/node/DagNodeSort.js").DagNodeSort
global.DagNodeSortInput = require("../dagHelper/nodeInput/DagNodeSortInput.js").DagNodeSortInput
global.DagNodeSplit = require("../dagHelper/node/DagNodeSplit.js").DagNodeSplit
global.DagNodeSynthesize = require("../dagHelper/node/DagNodeSynthesize.js").DagNodeSynthesize
global.DagNodeSynthesizeInput = require("../dagHelper/nodeInput/DagNodeSynthesizeInput.js").DagNodeSynthesizeInput
global.DagNodeUpdateIMD = require("../dagHelper/node/DagNodeUpdateIMD.js").DagNodeUpdateIMD

// Call init routines
global.DagNode.setup();
global.DagTab.setup();