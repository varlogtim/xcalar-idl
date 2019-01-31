// TODO: Combine with DagGraph.convertQueryToDataflowGraph
let xcHelper;
let XEvalParser = require("./xEvalParser/index.js").XEvalParser;
require("../../assets/js/thrift/DataFormatEnums_types.js");
require("../../assets/js/thrift/UnionOpEnums_types.js");
require("../../assets/js/thrift/LibApisEnums_types.js");

require("jsdom/lib/old-api").env("", function(err, window) {
    global.jQuery = jQuery = require("jquery")(window);
    global.$ = $ = jQuery;
    // sqlHelpers.js exists in installer build but not dev build
    var sqlHelpers;
    try {
        sqlHelpers = require("./sqlHelpers/sqlHelpers.js");
    } catch(error) {
        sqlHelpers = null;
    }
    xcHelper = sqlHelpers ? sqlHelpers.xcHelper :
        require("./sqlHelpers/xcHelper.js").xcHelper;
});

const globalKVDatasetPrefix = "/globalKvsDataset/";
const workbookKVPrefix = "/workbookKvs/";
const gridSpacing = 20;
const horzNodeSpacing = 160;// spacing between nodes when auto-aligning
const vertNodeSpacing = 80;

let idCount = 0; // used to give ids to dataflow nodes
let dataflowCount = 0;
let currentDataflowId; // if retina, will use this dataflowId - we'll create it
// at the start so linkedIn nodes can point to it from the start
let currentUserName = "";
let originalInput;

// nestedPrefix is a retinaName to indicate if this dataflow is part of a recursive call
function convert(dataflowInfo, nestedPrefix, nodes) {
    try {
        return convertHelper(dataflowInfo, nestedPrefix, nodes);
    } catch (e) {
        console.log(e);
        return {error: e};
    }
}

function convertHelper(dataflowInfo, nestedPrefix, otherNodes) {
    if (!nestedPrefix) {
        currentDataflowId = "DF2_" + new Date().getTime() + "_" + dataflowCount++;
    }
    const nodes = new Map();
    const datasets = [];
    try {
        if (typeof dataflowInfo === "string") {
            dataflowInfo = JSON.parse(dataflowInfo);
        }
    } catch (e) {
        return "invalid dataflowInfo: " + dataflowInfo;
    }
    if (typeof dataflowInfo !== "object" || dataflowInfo == null || (dataflowInfo instanceof Array)) {
        return "invalid dataflowInfo: " + dataflowInfo;
    }
    modifyOriginalInput(dataflowInfo);
    if (!nestedPrefix) {
        originalInput = xcHelper.deepCopy(dataflowInfo);
    }

    // check for header indicating if the dataflow
    // is a regular workbook dataflow or retina dataflow
    let isRetina = false;
    if (dataflowInfo.workbookVersion == null && (!dataflowInfo.header || dataflowInfo.header.workbookVersion == null)) {
        isRetina = true;
    }
    let isChainedRetina = false;
    let query = dataflowInfo.query;
    let sourcePrefix = "";
    let udfPrefix = "";
    if (nestedPrefix) {
        sourcePrefix = nestedPrefix + ":";
        udfPrefix = nestedPrefix + "-";
    }
    let hasTableInfo = (!nestedPrefix && !isRetina && dataflowInfo["gInfo-1"] &&
                        dataflowInfo["gInfo-1"].worksheets && dataflowInfo["gInfo-1"].TILookup);
    let tables = {};
    if (hasTableInfo) {
        // loop through worksheets and add tables with worksheet name
        // these tables will have an "active" styling
        for (let i in dataflowInfo["gInfo-1"].worksheets.wsInfos) {
            let ws = dataflowInfo["gInfo-1"].worksheets.wsInfos[i];
            ws.tables.forEach((tId) => {
                if (dataflowInfo["gInfo-1"].TILookup[tId]) {
                    tables[tId] = {
                        worksheet: ws.name
                    }
                }
            });
        }
    }

    for (let i = 0; i < query.length; i++) {
        const rawNode = query[i];
        const args = rawNode.args;
        let name = sourcePrefix + args.dest;
        // name gets renamed and prefixed in the switch statement
        const node = {
            name: name,
            parents: [],
            children: [],
            realChildren: [],
            rawNode: rawNode,
            args: args,
            api: XcalarApisTFromStr[rawNode.operation],
            subGraph: {},
            indexedFields: []
        };

        if (hasTableInfo) {
            // this is the first layer of the workbook
            const tId = xcHelper.getTableId(args.dest);
            if (tId != null && tables[tId]) {
                node.isActive = true;
                node.worksheet = tables[tId].worksheet;
            }
        }

        // set up the parents and prefix the parent names if we're inside
        // an executeRetina
        switch (node.api) {
            case (XcalarApisT.XcalarApiIndex):
                if (args.source.startsWith(gDSPrefix)) {
                    if (currentUserName && nestedPrefix) {
                        // if we're in a nested executeRetina node, replace the
                        // old user name in the dataset with the proper user name
                        let oldParsedDSName = xcHelper.parseDSName(args.source);
                        let prevUserName = oldParsedDSName.user;
                        let re = new RegExp(prevUserName);
                        args.source = args.source.replace(re, currentUserName);
                    }
                    args.source = gDSPrefix + sourcePrefix + args.source.slice(gDSPrefix.length);
                } else {
                    args.source = sourcePrefix + args.source;
                }
                node.parents = [args.source];
                break;
            case (XcalarApisT.XcalarApiProject):
            case (XcalarApisT.XcalarApiGetRowNum):
            case (XcalarApisT.XcalarApiExport):
            case (XcalarApisT.XcalarApiAggregate):
            case (XcalarApisT.XcalarApiFilter):
            case (XcalarApisT.XcalarApiMap):
            case (XcalarApisT.XcalarApiGroupBy):
                args.source = sourcePrefix + args.source;
                node.parents = [args.source];
                break;
            case (XcalarApisT.XcalarApiSynthesize):
                // sometimes the synthesize node will point to itself for it's
                // source
                if (args.source === args.dest) {
                    if (query[i - 1] && query[i - 1].args) {
                        args.source = query[i - 1].args.dest;
                    } else {
                        args.source = "noSource" + Date.now() + Math.floor(Math.random() * 10000);
                    }
                }
                if (args.source) {
                    args.source = sourcePrefix + args.source;
                    node.parents = [args.source];
                } else {
                    node.parents = [];
                }
                break;
            case (XcalarApisT.XcalarApiJoin):
            case (XcalarApisT.XcalarApiUnion):
                args.source = args.source.map((source) => {
                    return sourcePrefix + source;
                });
                node.parents = xcHelper.deepCopy(args.source);
                break;
            case (XcalarApisT.XcalarApiSelect):
            case (XcalarApisT.XcalarApiExecuteRetina):
            case (XcalarApisT.XcalarApiBulkLoad):
                node.parents = [];
                break;
            default:
                break;
        }

        // prefix udfs and aggregates in eval strings
        switch (node.api) {
            case (XcalarApisT.XcalarApiIndex):
            case (XcalarApisT.XcalarApiProject):
            case (XcalarApisT.XcalarApiGetRowNum):
            case (XcalarApisT.XcalarApiExport):
            case (XcalarApisT.XcalarApiSynthesize):
            case (XcalarApisT.XcalarApiUnion):
            case (XcalarApisT.XcalarApiExecuteRetina):
            case (XcalarApisT.XcalarApiBulkLoad):
                break;
            case (XcalarApisT.XcalarApiSelect):
                if (node.args.filterString) {
                    node.args.filterString = _substitutePrefixInEval(node.args.filterString, udfPrefix);
                } else if (node.args.evalString) {
                    node.args.evalString = _substitutePrefixInEval(node.args.evalString, udfPrefix);
                }
                break;
            case (XcalarApisT.XcalarApiGroupBy):
            case (XcalarApisT.XcalarApiAggregate):
            case (XcalarApisT.XcalarApiFilter):
            case (XcalarApisT.XcalarApiMap):
                node.args.eval.forEach((evalStruct) => {
                    evalStruct.evalString = _substitutePrefixInEval(evalStruct.evalString, udfPrefix)
                });
                break;
            case (XcalarApisT.XcalarApiJoin):
                node.args.evalString = _substitutePrefixInEval(node.args.evalString, udfPrefix)
                break;
            default:
                break;
        }

        let isIgnoredApi = false;
        // set up the dest and aggregates and prefix if needed
        switch (node.api) {
            case (XcalarApisT.XcalarApiIndex):
            case (XcalarApisT.XcalarApiProject):
            case (XcalarApisT.XcalarApiGetRowNum):
            case (XcalarApisT.XcalarApiExport):
            case (XcalarApisT.XcalarApiUnion):
            case (XcalarApisT.XcalarApiSelect):
            case (XcalarApisT.XcalarApiSynthesize):
            case (XcalarApisT.XcalarApiExecuteRetina):
                args.dest = sourcePrefix + args.dest;
                break;
            case (XcalarApisT.XcalarApiAggregate):
                args.dest = gAggVarPrefix + udfPrefix + args.dest;
                node.aggregates = _getAggsFromEvalStrs(args.eval);
                break;
            case (XcalarApisT.XcalarApiFilter):
            case (XcalarApisT.XcalarApiMap):
            case (XcalarApisT.XcalarApiGroupBy):
                args.dest = sourcePrefix + args.dest;
                node.aggregates = _getAggsFromEvalStrs(args.eval);
                break;
            case (XcalarApisT.XcalarApiJoin):
                args.dest = sourcePrefix + args.dest;
                node.aggregates = _getAggsFromEvalStrs([args]);
                break;
            case (XcalarApisT.XcalarApiBulkLoad):
                if (!currentUserName && !nestedPrefix) {
                    let parsedDsName = xcHelper.parseDSName(args.dest);
                    currentUserName = parsedDsName.user;
                } else if (currentUserName && nestedPrefix) {
                    // if we're in a nested executeRetina node, replace the
                    // old user name in the dataset with the proper user name
                    let oldParsedDSName =  xcHelper.parseDSName(args.dest);
                    let prevUserName = oldParsedDSName.user;
                    let re = new RegExp(prevUserName);
                    args.dest = args.dest.replace(re, currentUserName);
                }

                if (args.dest.startsWith(gDSPrefix)) {
                    args.dest = gDSPrefix + sourcePrefix + args.dest.slice(gDSPrefix.length);
                } else {
                    args.dest = sourcePrefix + args.dest;
                }
                let datasetBeforeXDChange = xcHelper.deepCopy(rawNode);
                args.loadArgs = updateLoadArgsForXD(args);
                datasets.push(datasetBeforeXDChange);
                break;
            default:
                isIgnoredApi = true;
                break;
        }
        if (nestedPrefix && node.api === XcalarApisT.XcalarApiSynthesize &&
            args.sameSession === false) {
            isChainedRetina = true;
        }

        node.name = args.dest; // reset name because we've prefixed it
        if (!isIgnoredApi) {
            nodes.set(node.name, node);
        }
    }

    for (let [_name, node] of nodes) {
        _setParents(node, nodes, otherNodes);
    }

    for (let [_name, node] of nodes) {
        _setSubGraphs(node);
    }

    for (let [_name, node] of nodes) {
        _setIndexedFields(node);
    }

    for (let [_name, node] of nodes) {
        _collapseIndexNodes(node);
    }

    return _finalConvertIntoDagNodeInfoArray(nodes, datasets, isRetina, nestedPrefix, isChainedRetina);
}

function _finalConvertIntoDagNodeInfoArray(nodes, datasets, isRetina, nestedPrefix, isChainedRetina) {
    const dataflows = [];
    const dataflowsList = [];
    let treeGroups = {};
    let seen = {};
    let nodeCount = 0;
     // group nodes into separate trees
    for (let [_name, node] of nodes) {
        if (node.children.length === 0) {
            _splitIntoTrees(node, seen, treeGroups, nodeCount);
        }
        nodeCount++;
    }

    let allDagNodeInfos = {};
    let inactiveDagNodeInfos = {};
    for (let i in treeGroups) {
        const group = treeGroups[i];
        const endNodes = [];
        for (let j in group) {
            const node = group[j];
            if (node.children.length === 0) {
                endNodes.push(node);
            }
        }

        const dagNodeInfos = {};
        endNodes.forEach(node => {
            _recursiveGetDagNodeInfo(node, nodes, dagNodeInfos, isRetina, nestedPrefix);
        });
        let hasActiveNodeInTree = false;
        if (!isRetina && !nestedPrefix) {
            for (var j in dagNodeInfos) {
                const node = dagNodeInfos[j];
                if (node.isActive) {
                    hasActiveNodeInTree = true;
                    break;
                }
            }
        }

        if (!isRetina && !nestedPrefix && !hasActiveNodeInTree) {
            inactiveDagNodeInfos = $.extend(inactiveDagNodeInfos, dagNodeInfos);
        } else {
            allDagNodeInfos = $.extend(allDagNodeInfos, dagNodeInfos);
        }
    }
    if (nestedPrefix) {
        return {
            nodes: allDagNodeInfos,
            isChainedRetina: isChainedRetina
        }
    } else {
        const graphDimensions = _setPositions(allDagNodeInfos);
        const nodes = [];
        const comments = [];
        for (var j in allDagNodeInfos) {
            const node = allDagNodeInfos[j];
            node.parents = node.parentIds;
            // should not persist .parentIds and .children
            delete node.parentIds;
            delete node.children;
            nodes.push(node);
            if (node.isActive) {
                comment = {
                    "id": "comment_" + new Date().getTime() + "_" + idCount++,
                    "position": {
                        "x": node.display.x - 40,
                        "y": node.display.y - 40
                    },
                    "dimensions": {
                        "width": 180,
                        "height": 60
                    },
                    "text": "Active in worksheet: " + node.worksheet
                };
                comment.nodeId = comment.id;
                comments.push(comment);
                delete node.isActive;
                delete node.worksheet;
            }
        }
        let name;
        if (isRetina) {
            name = xcHelper.randName(".temp/rand") + "/" + "Dataflow " + dataflowCount;
        } else {
            name = "Dataflow " + dataflowCount;
            dataflowsList.push({
                name: name,
                id: currentDataflowId,
                createdTime: Date.now()
            });
        }

        const dataflow = {
            id: currentDataflowId,
            name: name,
            dag: {
                "nodes": nodes,
                "comments": comments,
                "display": {
                    "width": graphDimensions.maxX,
                    "height": graphDimensions.maxY,
                    "scale": 1
                }
            }
        }
        if (!isRetina) {
            dataflow.autosave = true;
        }

        dataflows.push(dataflow);

        // graphs that contain only inactive tables
        if (!$.isEmptyObject(inactiveDagNodeInfos)) {
            const graphDimensions = _setPositions(inactiveDagNodeInfos);
            const nodes = [];
            for (var j in inactiveDagNodeInfos) {
                const node = inactiveDagNodeInfos[j];
                node.parents = node.parentIds;
                // should not persist .parentIds and .children
                delete node.parentIds;
                delete node.children;
                nodes.push(node);
            }
            let name = "Inactive Nodes";
            dataflowsList.push({
                name: name,
                id: currentDataflowId + "_0",
                createdTime: Date.now()
            });

            const dataflow = {
                id: currentDataflowId + "_0",
                name: name,
                dag: {
                    "nodes": nodes,
                    "comments": [],
                    "display": {
                        "width": graphDimensions.maxX,
                        "height": graphDimensions.maxY,
                        "scale": 1
                    }
                },
                autosave: true
            }
            dataflows.push(dataflow);
        }
    }

    return _createKVStoreKeys(dataflows, dataflowsList, datasets, isRetina);
}

function _createKVStoreKeys(dataflows, dataflowsList, datasets, isRetina) {
    const kvPairs = {};
    if (isRetina) {
        kvPairs[workbookKVPrefix + "DF2Optimized"] = JSON.stringify({
            retinaName: "retina-" + Date.now(),
            retina: JSON.stringify({
                tables: originalInput.tables,
                query: JSON.stringify(originalInput.query)
            }),
            userName: "",
            sessionName: ""
        });
        kvPairs[workbookKVPrefix + "DF2"] = JSON.stringify(dataflows[0]);
    } else {
        dataflows.forEach((dataflow) => {
            kvPairs[workbookKVPrefix + dataflow.id] = JSON.stringify(dataflow);
        });
         // add key for daglist
        kvPairs[workbookKVPrefix + "gDagListKey-1"] = JSON.stringify({
            dags: dataflowsList
        });
        datasets.forEach(dataset => {
            kvPairs[globalKVDatasetPrefix + "sys/datasetMeta/" + dataset.args.dest] = JSON.stringify(dataset, null, 4);
        });
    }

    return JSON.stringify(kvPairs, null, 4);
}

// sets node positions and returns graph dimensions
function _setPositions(nodeMap) {
    const nodesArray = [];
    for (let i in nodeMap) {
        nodesArray.push(nodeMap[i]);
    }

    let treeGroups = {};
    let seen = {};
    for (let i = nodesArray.length - 1; i >= 0; i--) {
        if (nodesArray[i].children.length === 0) {
            // group nodes into trees
            _splitIntoTrees(nodesArray[i], seen, treeGroups, i);
        }
    }
    let startingWidth = 0;
    let overallMaxDepth = 0;

    for (let i in treeGroups) {
        const group = treeGroups[i];
        const nodeInfos = {};

        for (let j in group) {
            if (group[j].children.length === 0) {
                _alignNodes(group[j], nodeInfos, startingWidth);
                break;
            }
        }

        for (let j in group) {
             if (group[j].parents.length === 0) {
                // adjust positions of nodes so that children will never be
                // to the left of their parents
                _adjustPositions(group[j], nodeInfos, {});
            }
        }

        let maxDepth = 0;
        let maxWidth = 0;
        let minDepth = 0;
        for (let j in nodeInfos) {
            maxDepth = Math.max(nodeInfos[j].depth, maxDepth);
            minDepth = Math.min(nodeInfos[j].depth, minDepth);
            maxWidth = Math.max(nodeInfos[j].width, maxWidth);
        }
        overallMaxDepth = Math.max(maxDepth - minDepth, overallMaxDepth);

        for (let j in nodeInfos) {
            const node = nodeInfos[j].node;
            node.display = {
                x: ((maxDepth - nodeInfos[j].depth) * horzNodeSpacing) + (gridSpacing * 2),
                y: (nodeInfos[j].width * vertNodeSpacing) + (gridSpacing * 2)
            }
        }
        startingWidth = (maxWidth + 1);
    }
    const graphHeight = vertNodeSpacing * (startingWidth - 1) + (vertNodeSpacing * 3);
    const graphWidth = horzNodeSpacing * overallMaxDepth + horzNodeSpacing + (gridSpacing * 2);

    return {
        maxX: graphWidth,
        maxY: graphHeight
    };
}

  // groups individual nodes into trees and joins branches with main tree
  // the node passed in will be an end node (no children)
function _splitIntoTrees(node, seen, treeGroups, groupId) {
    let treeGroup = {};
    formTreesHelper(node);

    function formTreesHelper(node) {
        let id = node.id;
        if (id == null) {
            id = node.name;
        }
        if (treeGroup[id]) { // already done
            return;
        }
        if (seen[id] != null) { // we've encountered this node and it's
            // part of another group so lets join its children to that group
            const mainGroupId = seen[id];
            if (groupId === mainGroupId) {
                // already part of the same tree
                return;
            }
            let mainGroup = treeGroups[mainGroupId];

            for (let i in treeGroup) {
                seen[i] = mainGroupId; // reassigning nodes from current
                // group to the main group that has the id of "mainGroupId"
                mainGroup[i] = treeGroup[i];
            }

            delete treeGroups[groupId];

            groupId = mainGroupId;
            treeGroup = mainGroup;
            return;
        }
        treeGroup[id] = node;
        seen[id] = groupId;

        if (!treeGroups[groupId]) {
            treeGroups[groupId] = {};
        }
        treeGroups[groupId][id] = node;

        const parents = node.parents;
        for (let i = 0; i < parents.length; i++) {
            if (parents[i] != null) {
                formTreesHelper(parents[i]);
            }
        }
    }
}

 // sets endpoint to have depth:0, width:0. If endpoint is a join,
// then left parent will have depth:1, width:0 and right parent will have
// depth: 1, width: 1 and so on.
function _alignNodes(node, seen, width) {
    let greatestWidth = width;
    _alignHelper(node, 0, width);

    function _alignHelper(node, depth, width) {
        const nodeId = node.id;
        if (seen[nodeId] != null) {
            return;
        }
        seen[nodeId] = {
            depth: depth,
            width: width,
            node: node
        };

        greatestWidth = Math.max(width, greatestWidth);
        const parents = node.parents;

        let numParentsDrawn = 0;
        for (let i = 0; i < parents.length; i++) {
            if (seen[parents[i].id] != null) {
                numParentsDrawn++;
            }
        }

        for (let i = 0; i < parents.length; i++) {
            if (parents[i] != null &&
                seen[parents[i].id] == null) {
                let newWidth;
                if (numParentsDrawn === 0) {
                    newWidth = width;
                } else {
                    newWidth = greatestWidth + 1;
                }
                _alignHelper(parents[i], depth + 1, newWidth);
                numParentsDrawn++;
            }
        }
        const children = node.children;

        let numChildrenDrawn = 0;
        for (let i = 0; i < children.length; i++) {
            if (seen[children[i].id] != null) {
                numChildrenDrawn++;
            }
        }

        for (let i = 0; i < children.length; i++) {
            if (seen[children[i].id] == null) {
                let newWidth;
                if (numChildrenDrawn === 0) {
                    newWidth = width;
                } else {
                    newWidth = greatestWidth + 1;
                }
                _alignHelper(children[i], depth - 1, newWidth);
                numChildrenDrawn++;
            }
        }
    }
}

// adjust positions of nodes so that children will never be
// to the left of their parents
function _adjustPositions(node, nodes, seen) {
    seen[node.id] = true;
    const children = node.children;
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        let diff = nodes[node.id].depth - nodes[child.id].depth;
        let adjustmentNeeded = false;
        if (diff <= 0) {
            let adjustment = diff - 1;
            nodes[child.id].depth += adjustment;
            adjustmentNeeded = true;
        }
        if (adjustmentNeeded || seen[child.id] == null) {
            _adjustPositions(child, nodes, seen);
        }
    }
}

function _recursiveGetDagNodeInfo(node, nodes, dagNodeInfos, isRetina, nestedPrefix) {
    if (dagNodeInfos[node.name]) {
        return dagNodeInfos[node.name];
    }
    let dagNodeInfo = _getDagNodeInfo(node, nodes, dagNodeInfos, isRetina, nestedPrefix);
    dagNodeInfos[node.name] = dagNodeInfo;

    if (dagNodeInfo.name === "Execute Retina") {
        for (let i in dagNodeInfo.nodes) {
            // reconnect retina with the parents of the dfout node
            if (dagNodeInfo.nodes[i].type === DagNodeType.DFOut) {
                dagNodeInfo.parentIds = dagNodeInfo.nodes[i].parentIds;
                dagNodeInfo.parents = dagNodeInfo.nodes[i].parents;
                dagNodeInfo.nodes[i].parents.forEach((parent) => {
                    parent.children.forEach((child, j) => {
                        if (child.id === dagNodeInfo.nodes[i].id) {
                            parent.children[j] = dagNodeInfo;
                        }
                    })
                });
            }
        }
        delete dagNodeInfo.nodes; // we're done with this
    }

    node.parents.forEach(child => {
        const childInfo = _recursiveGetDagNodeInfo(child, nodes, dagNodeInfos, isRetina, nestedPrefix);
        let targetDagNodeInfo = dagNodeInfo;
        if (dagNodeInfo.linkOutNode) {
            // if node is a dfIn (synthesize), assign it's children to the dfOut node
            targetDagNodeInfo = dagNodeInfo.linkOutNode
        }

        targetDagNodeInfo.parentIds.push(childInfo.id);
        targetDagNodeInfo.parents.push(childInfo);
        childInfo.children.push(targetDagNodeInfo);
    });
    return dagNodeInfo;
}

// does the main conversion of a xcalarQueryStruct into a dataflow2 node
function _getDagNodeInfo(node, nodes, dagNodeInfos, isRetina, nestedPrefix) {
    let dagNodeInfo;
    let linkOutNode = null;

    switch (node.api) {
        case (XcalarApisT.XcalarApiIndex):
            if (node.createTableInput) {
                dagNodeInfo = {
                    type: DagNodeType.Dataset,
                    input: node.createTableInput,
                };
                if (node.schema) {
                    dagNodeInfo.schema = node.schema;
                }
            } else {
                // probably a sort node
                dagNodeInfo = {
                    type: DagNodeType.Index,
                    input: {columns: []}
                }
                // need to use real columns
            }
            break;
        case (XcalarApisT.XcalarApiAggregate):
            dagNodeInfo = {
                type: DagNodeType.Aggregate,
                input: {
                    evalString: node.args.eval[0].evalString,
                    dest: node.name
                }
            };
            break;
        case (XcalarApisT.XcalarApiProject):
            dagNodeInfo = {
                type: DagNodeType.Project,
                input: {
                   columns: node.args.columns
                }
            };
            break;
        case (XcalarApisT.XcalarApiGroupBy):
            const aggs = node.args.eval.map((evalStruct) => {
                const evalStr = evalStruct.evalString;
                const parenIndex = evalStr.indexOf("(");
                return {
                    operator: evalStr.substring(0, parenIndex),
                    sourceColumn: evalStr.substring(parenIndex + 1, evalStr.length - 1),
                    destColumn: evalStruct.newField,
                    distinct: false,
                    cast: null
                }
            });
            let groupBy = node.indexedFields[0].map(key => {
                return key.name;
            });

            let newKeys = node.indexedFields[0].map(key => {
                return key.keyFieldName;
            });
            if (!groupBy.length && node.args.key) {
                groupBy = node.args.key.map((key) => {
                    return key.name || key.keyFieldName;
                });
                newKeys = node.args.key.map((key) => {
                    return key.keyFieldName || key.name;
                });
            }
            dagNodeInfo = {
                type: DagNodeType.GroupBy,
                input: {
                    groupBy: groupBy,
                    newKeys: newKeys,
                    aggregate: aggs,
                    includeSample: node.args.includeSample,
                    icv: node.args.icv,
                    groupAll: node.args.groupAll,
                    dhtName: ""
                }
            };
            break;
        case (XcalarApisT.XcalarApiGetRowNum):
            dagNodeInfo = {
                type: DagNodeType.RowNum,
                input: {
                    newField: node.args.newField
                }
            };
            break;
        case (XcalarApisT.XcalarApiFilter):
            dagNodeInfo = {
                type: DagNodeType.Filter,
                input: {
                    evalString: node.args.eval[0].evalString
                }
            };
            break;
        case (XcalarApisT.XcalarApiMap):
            dagNodeInfo = {
                type: DagNodeType.Map,
                input: {
                    eval: node.args.eval,
                    icv: node.args.icv
                }
            };
            break;
        case (XcalarApisT.XcalarApiJoin):
            const leftRenames = node.args.columns[0].map(colInfo => {
                return {
                    sourceColumn: colInfo.sourceColumn,
                    destColumn: colInfo.destColumn,
                    prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                }
            });
            const rightRenames = node.args.columns[1].map(colInfo => {
                return {
                    sourceColumn: colInfo.sourceColumn,
                    destColumn: colInfo.destColumn,
                    prefix: colInfo.columnType === DfFieldTypeTStr[DfFieldTypeTFromStr.DfFatptr]
                }
            });
            dagNodeInfo = {
                type: DagNodeType.Join,
                input: {
                    joinType: node.args.joinType,
                    "left": {
                        "columns": node.indexedFields[0].map(key => {
                            return key.name;
                        }),
                        "casts": node.indexedFields[0].filter(key => {
                            if (DfFieldTypeTFromStr[key.type] ===
                                DfFieldTypeT.DfUnknown) {
                                return false;
                            }
                            return true;
                        }).map(key => {
                            return xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[key.type]);
                        }),
                        "rename": leftRenames
                    },
                    "right": {
                        "columns": node.indexedFields[1].map(key => {
                            return key.name;
                        }),
                        "casts": node.indexedFields[1].filter(key => {
                            if (DfFieldTypeTFromStr[key.type] ===
                                DfFieldTypeT.DfUnknown) {
                                return false;
                            }
                            return true;
                        }).map(key => {
                            return xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[key.type]);
                        }),
                        "rename": rightRenames
                    },
                    evalString: node.args.evalString
                }
            };
            break;
        case (XcalarApisT.XcalarApiUnion):
            const setType = xcHelper.unionTypeToXD(node.args.unionType) || "union";
            const columns = _getUnionColumns(node.args.columns);
            dagNodeInfo = {
                type: DagNodeType.Set,
                subType: xcHelper.capitalize(setType),
                input: {
                    columns: columns,
                    dedup: node.args.dedup
                }
            };
            break;
        case (XcalarApisT.XcalarApiExport):
            if (nestedPrefix) {
                dagNodeInfo = {
                    type: DagNodeType.DFOut,
                    subType: "link out Optimized",
                    input: {
                        name: node.args.dest,
                        linkAfterExecution: true,
                        columns: node.args.columns.map((col) => {
                            return {
                                "sourceName": col.columnName,
                                "destName": col.headerName
                            }
                        })
                    }
                };
            } else { // would only occur in a retina
                let driverArgs;
                try {
                    driverArgs = JSON.parse(node.args.driverParams);
                } catch (e) {
                    console.log(e);
                    driverArgs = node.args.driverParams || "";
                }
                dagNodeInfo = {
                    type: DagNodeType.Export,
                    subType: "Export Optimized",
                    description: JSON.stringify(node.args),
                    input: {
                        columns: node.args.columns.map(col => col.columnName),
                        driver: node.args.driverName,
                        driverArgs: driverArgs
                    }
                };
            }

            break;
        case (XcalarApisT.XcalarApiExecuteRetina):
            let retinaName = node.args.retinaName.replace(/#/g, "$");
            const nestedRetInfo = convert(node.args.retinaBuf, retinaName, nodes);
            dagNodeInfos = $.extend(dagNodeInfos, nestedRetInfo.nodes);

            if (nestedRetInfo.isChainedRetina) {
                // use a placeholder for the case that retina has parents
                dagNodeInfo = {
                    type: DagNodeType.Placeholder,
                    name: "Execute Retina",
                    title: "Execute Retina",
                    input: {
                        args: node.args
                    },
                    nodes: nestedRetInfo.nodes
                };
            } else {
            // executeRetina contains a subGraph, so we create the nodes
            // and assign the linkout node's name to current node's linkOutName property
                for (let name in nestedRetInfo.nodes) {
                    let nestedDagNodeInfo = nestedRetInfo.nodes[name];
                    if (nestedDagNodeInfo.type === DagNodeType.DFOut) {
                        linkOutNode = nestedDagNodeInfo;
                        break;
                    }
                }
                dagNodeInfo = {
                    type: DagNodeType.DFIn,
                    input: {
                        dataflowId: currentDataflowId,
                        linkOutName: linkOutNode.input.name
                    },
                    linkOutNode: linkOutNode
                };
            }

            break;
        case (XcalarApisT.XcalarApiSynthesize):
            if (isRetina || nestedPrefix) {
                // create dfOut node (this node doesn't really exist in the original query)
                linkOutNode = {
                    type: DagNodeType.DFOut,
                    subType: "link out Optimized",
                    input: {
                        name: node.args.source,
                        linkAfterExecution: true,
                        columns: node.args.columns.map((col) => {
                            return {
                                "sourceName": col.sourceColumn,
                                "destName": col.destColumn
                            }
                        })
                    }
                };
                const comment = parseUserComment(node.rawNode.comment);
                linkOutNode.description = comment.userComment || "";
                linkOutNode.table = node.args.source;
                linkOutNode.id = "dag_" + new Date().getTime() + "_" + idCount++;
                linkOutNode.nodeId = linkOutNode.id;
                linkOutNode.parents = [];
                linkOutNode.parentIds = [];
                linkOutNode.children = [];
                linkOutNode.state =  "Configured";
                linkOutNode.configured = true;
                // need to create a new name as this node doesn't exist in query
                dagNodeInfos[node.args.source + "_" + idCount++] = linkOutNode;
            }

            let linkOutDataflowId = null;
            // if synthesize node doesn't have parents because they
            // are in another dataflow, then linkOutDataflowId will be null
            // and XD will try to find it
            if (node.parents.length) {
                linkOutDataflowId = currentDataflowId;
            }
            dagNodeInfo = {
                type: DagNodeType.DFIn,
                input: {
                    dataflowId: linkOutDataflowId,
                    linkOutName: node.args.source
                },
                linkOutNode: linkOutNode
            };

            break;
        case (XcalarApisT.XcalarApiSelect):
            dagNodeInfo = {
                type: DagNodeType.IMDTable,
                input: {
                    source: node.args.source,
                    version: node.args.minBatchId,
                    filterString: node.args.filterString || node.args.evalString,
                    columns: node.args.columns
                }
            };
            break;
        case (XcalarApisT.XcalarApiBulkLoad): // should not have any
        // as the "createTable" index node should take it's place

            let loadArgs = node.args.loadArgs;
            if (typeof loadArgs === "object") {
                loadArgs = JSON.stringify(loadArgs);
            }
            let createTableInput = {
                source: xcHelper.stripPrefixFromDSName(node.args.dest),
                prefix: "",
                synthesize: false,
                loadArgs: loadArgs
            }

            dagNodeInfo = {
                type: DagNodeType.Dataset,
                input: createTableInput
            };
            let schema = getSchemaFromLoadArgs(loadArgs);
            if (schema) {
                dagNodeInfo.schema = schema;
            }

            break;
        default:
            dagNodeInfo = {
                type: DagNodeType.Placeholder,
                name: XcalarApisTStr[node.api],
                title: XcalarApisTStr[node.api],
                input: {
                    args: node.args
                }
            };
            break;
    }

    const comment = parseUserComment(node.rawNode.comment);
    dagNodeInfo.description = dagNodeInfo.description || comment.userComment || "";
    dagNodeInfo.aggregates = node.aggregates;
    dagNodeInfo.table = node.name;
    dagNodeInfo.title = node.name.slice(node.name.lastIndexOf(":") + 1); // slice out retina prefix
    dagNodeInfo.id = "dag_" + new Date().getTime() + "_" + idCount++;
    dagNodeInfo.nodeId = dagNodeInfo.id;
    dagNodeInfo.children = [];
    dagNodeInfo.parents = [];
    dagNodeInfo.parentIds = [];
    dagNodeInfo.state =  "Configured";
    dagNodeInfo.configured = true;
    if (node.isActive) {
        dagNodeInfo.isActive = true;
        dagNodeInfo.worksheet = node.worksheet;
    }
    return dagNodeInfo;
}

// return {userComment: string, meta: object}
function parseUserComment(comment) {
    let commentObj;
    try {
        commentObj = JSON.parse(comment);
        if (typeof commentObj !== "object") {
            commentObj = {
                userComment: commentObj,
                meta: {}
            };
        }
    } catch (e) {
        commentObj = {
            userComment: comment || "",
            meta: {}
        };
    }
    return commentObj;
};

function _substitutePrefixInEval(oldEvalStr, prefix) {
    if (!oldEvalStr || !prefix) {
        return oldEvalStr;
    }
    let parsedEval = XEvalParser.parseEvalStr(oldEvalStr);
    _replace(parsedEval);
    let evalStr = _rebuild(parsedEval);

    // inserts prefixes in udfs: udfName:udfModule -> prefix-udfName:udfModule
    // also prefixes aggs: ^myAgg -> ^prefix-myAgg
    function _replace(parsedEval) {
        if (parsedEval.fnName && parsedEval.fnName.includes(":")) {
            parsedEval.fnName = prefix + parsedEval.fnName;
        } else if (parsedEval.value && parsedEval.value.startsWith(gAggVarPrefix)) {
            parsedEval.value =  gAggVarPrefix+ prefix + parsedEval.value.slice(1);
        }
        if (parsedEval.args) {
            parsedEval.args.forEach((arg) => {
                _replace(arg);
            });
        }
    }

    // turns evalStruct into a string
    function _rebuild(parsedEval) {
        let str = "";
        if (parsedEval.fnName) {
            str += parsedEval.fnName + "(";
        }
        parsedEval.args.forEach((arg, i) => {
            if (i > 0) {
                str += ",";
            }
            if (arg.type === "fn") {
                str += _rebuild(arg);
            } else {
                str += arg.value;
            }
        });
        if (parsedEval.fnName) {
            str += ")";
        }
        return str;
    }

    return evalStr;
}

// turns    filter->index->join    into   filter->join
// and setups up a "create table" node to be a dataset node
function _collapseIndexNodes(node) {
    if (node.api === XcalarApisT.XcalarApiIndex) {
        const parent = node.parents[0];
        if (parent && parent.api === XcalarApisT.XcalarApiBulkLoad) {
            let loadArgs = parent.args.loadArgs;
            if (typeof loadArgs === "object") {
                loadArgs = JSON.stringify(loadArgs);
            }
            node.createTableInput = {
                source: xcHelper.stripPrefixFromDSName(node.args.source),
                prefix: node.args.prefix,
                synthesize: false,
                loadArgs: loadArgs
            }
            node.schema = getSchemaFromLoadArgs(loadArgs);
            node.parents = [];
        }
        return;
    }
    for (let i = 0; i < node.parents.length; i++) {
        const parent = node.parents[i];
        if (parent.api !== XcalarApisT.XcalarApiIndex) {
            continue;
        }
        // parent is an index

        if (!parent.parents.length ||
            parent.parents[0].api === XcalarApisT.XcalarApiBulkLoad) {
            // if parent.createTableInput exists, then we've already taken care of
            // this index node
            if (!parent.createTableInput && parent.args.source.startsWith(gDSPrefix)) {
                // if index resulted from dataset
                // then that index needs to take the role of the dataset node
                let loadArgs= "";
                if (parent.parents.length) {
                    loadArgs = parent.parents[0].args.loadArgs;
                    if (typeof loadArgs === "object") {
                        loadArgs = JSON.stringify(loadArgs);
                    }
                }
                parent.createTableInput = {
                    source: xcHelper.stripPrefixFromDSName(parent.args.source),
                    prefix: parent.args.prefix,
                    synthesize: false,
                    loadArgs: loadArgs,
                    schema: schema
                }

                parent.schema = getSchemaFromLoadArgs(loadArgs);
                parent.parents = [];
            }
            continue;
        }

        const indexParents = [parent];
        const nonIndexParent = getNonIndexParent(parent, indexParents);
        if (!nonIndexParent) {
            node.parents.splice(i, 1);
            i--;
            continue;
        }
        if (!node.indexParents) {
            node.indexParents = indexParents;
        } else {
            node.indexParents = node.indexParents.concat(indexParents);
        }
        node.parents[i] = nonIndexParent;

        // remove indexed children and push node
        nonIndexParent.children = nonIndexParent.children.filter((child) => {
            return child.api !== XcalarApisT.XcalarApiIndex;
        });
        nonIndexParent.children.push(node);
    }

    function getNonIndexParent(node, indexParents) {
        const parentOfIndex = node.parents[0];
        if (!parentOfIndex) {
            return null;
        } else if (parentOfIndex.api === XcalarApisT.XcalarApiIndex) {
            // if source is index but that index resulted from dataset
            // then that index needs to take the role of the dataset node
            if (parentOfIndex.args.source.includes(gDSPrefix)) {
                return parentOfIndex;
            }

            indexParents.push(parentOfIndex);
            return getNonIndexParent(parentOfIndex, indexParents);
        } else {
            return parentOfIndex;
        }
    }
}

function _setParents(node, nodes, otherNodes) {
    node.realParents = [];
    for (let i = 0; i < node.parents.length; i++) {
        let parent = nodes.get(node.parents[i]);
        if (!parent && otherNodes) {
            parent = otherNodes.get(node.parents[i]);
        }
        if (parent) {
            parent.children.push(node);
            parent.realChildren.push(node);
            node.parents[i] = parent;
            node.realParents[i] = parent;
        } else {
            console.log(node.parents[i] + " not found");
            console.log(node.rawNode.operation);
            node.parents.splice(i, 1);
            i--;
        }
    }
}

function _setSubGraphs(node) {
    if (!node.rawNode.tag) {
        return;
    }
    node.tags = _getTags(node.rawNode.tag);
    const tagHeader = _checkIsTagHeader(node.tags, node.name);

    if (tagHeader) {
        node.isOperationHeader = true;
        setSubGraph(tagHeader, node);
    }

    function setSubGraph(tagName, headerNode) {
        const subGraphNodes = {};
        const seen = {};
        const leaves = [];
        const endNodes = [];
        let hasSubGraph = false;
        let isFullyEncapsulated = true;
        addToSubGraph(headerNode);

        function addToSubGraph(node) {
            for (let i = 0; i < node.parents.length; i++) {
                var parentNode = node.parents[i];
                var tags = _getTags(parentNode.rawNode.tag);

                // checkNodeHasNonTaggedChildren
                if (parentNode.api === XcalarApisT.XcalarApiSynthesize) {
                    leaves.push(parentNode);
                    endNodes.push(parentNode);
                    if (tags.indexOf(tagName) !== -1) {
                        hasSubGraph = true;
                    }
                } else if (tags.indexOf(tagName) === -1) {
                    leaves.push(parentNode);
                    endNodes.push(node);
                } else if (!seen[parentNode.name]) {
                    seen[parentNode.name] = true;
                    parentNode.isInSubGraph = true;
                    subGraphNodes[parentNode.name] = parentNode;
                    hasSubGraph = true;
                    if (_checkNodeHasNonTaggedChildren(tagName, parentNode)) {
                        isFullyEncapsulated = false;
                    }
                    addToSubGraph(parentNode);
                }
            }
        }
        headerNode.subGraph = {
            nodes: subGraphNodes,
            leaves: leaves,
            endNodes: endNodes
        }
        headerNode.hasSubGraph = hasSubGraph;
        headerNode.isFullyEncapsulated = isFullyEncapsulated;
    }
}

function _setIndexedFields(node) {
    if (node.api === XcalarApisT.XcalarApiGroupBy) {
        node.indexedFields = _getIndexedFields(node);
    } else if (node.api === XcalarApisT.XcalarApiJoin) {
        node.indexedFields = getJoinSrcCols(node);
    } else if (node.api === XcalarApisT.XcalarApiUnion) {
        // node.indexedFields = getUnionSrcCols(node);
        return;
    } else {
        return;
    }

    // TODO
    function getUnionSrcCols(node) {
        let srcColSets = [];
        let parents;

        return node.args.columns;

        // the following is disabled

        if (!node.hasSubGraph || !node.isFullyEncapsulated) {
            return node.args.columns;
        } else {
           parents = node.subGraph.endNodes;
        }

        for (let i = 0; i < parents.length; i++) {
            let parentIndex = i;
            let api = parents[i].api;
            if (api === XcalarApisT.XcalarApiMap) {
                // this is deprecated after we use synthesize in Chronos Patch Set 1
                srcColSets[parentIndex] = parseMapCols(parents[i]);

            } else if (api === XcalarApisT.XcalarApiSynthesize) {
                srcColSets[parentIndex] = parseMapCols(parents[i]);
            } else if (api === XcalarApisT.XcalarApiIndex) {
                var cols = [];
                for (var j = 0; j < parents[i].args.key.length; j++) {
                    cols.push(parents[i].args.key[j]);
                }
                srcColSets[parentIndex] = cols;
            } else if (api === XcalarApisT.XcalarApiUnion) {
                srcColSets[parentIndex] = parents[i].args.columns[parentIndex].map(function(colInfo) {
                    return colInfo;
                });
            } else {
                console.warn(api, 'should not be included in union');
            }

            srcColSets[parentIndex].forEach((colInfo, i) => {
                if (!colInfo.columnType) {
                    const unionCol = node.args.columns[parentIndex][i];
                    if (unionCol) {
                        colInfo.destColumn = unionCol.destColumn;
                        colInfo.columnType =  xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[unionCol.columnType]);
                        colInfo.cast = true;
                    }
                }
            });
        }

        return srcColSets;
    }

    function getJoinSrcCols(node) {
        let lSrcCols = [];
        let rSrcCols = [];
        let parents = node.parents;

        if (node.args.joinType === JoinOperatorTStr[JoinOperatorT.CrossJoin]) {
            return [lSrcCols, rSrcCols];
        }

        for (let i = 0; i < parents.length; i++) {
            if (i === 0) {
                lSrcCols = getSrcIndex(parents[i]);
            } else {
                rSrcCols = getSrcIndex(parents[i]);
            }
        }

        return [lSrcCols, rSrcCols];

        function getSrcIndex(node) {
            if (node.api === XcalarApisT.XcalarApiIndex) {
                return node.args.key;
            } else {
                if (!node.parents.length) {
                    // one case is when we reach a retina project node
                    return [];
                }
                return getSrcIndex(node.parents[0]);
            }
        }
    }

    // used only for parsing concated col names used for multi group by
    // and maps within multijoin
    function parseMapCols(node) {
        var cols = [];

        var api = node.api;
        if (api === XcalarApisT.XcalarApiMap) {
            var evals = node.args.eval;
            for (var i = 0; i < evals.length; i++) {
                var parsedEval = XEvalParser.parseEvalStr(evals[i].evalString);
                const newCols = [];
                getCols(parsedEval, newCols);

                newCols.forEach(newCol => {
                    cols.push({
                        sourceColumn: newCol,
                        destColumn: evals[i].newField
                    });
                });
            }
        } else if (api === XcalarApisT.XcalarApiSynthesize) {
            var columns = node.args.columns;
            cols = columns.map(function(column) {
                return column; // XXX returning full column info here
            });
        }
        return cols;
    }

    function getCols(parsedEval, cols) {
        parsedEval.args.forEach((arg) => {
            if (arg.type === "columnArg") {
                if (cols.indexOf(arg.value) === -1) {
                    cols.push(arg.value);
                }
            } else if (arg.type === "fn") {
                getCols(arg, cols);
            }
        });
    }
}

function getSchemaFromLoadArgs(loadArgs) {
    if (!loadArgs) {
        return null;
    }
    try {
        loadArgs = JSON.parse(loadArgs);
        if (loadArgs.args && loadArgs.args.loadArgs) {
            loadArgs = loadArgs.args.loadArgs;
            if (loadArgs.parseArgs  && loadArgs.parseArgs.schema &&
                Array.isArray(loadArgs.parseArgs.schema)) {
                const schema = loadArgs.parseArgs.schema.map((col) => {
                    return {
                        name: col.destColumn,
                        type: xcHelper.convertFieldTypeToColType(DfFieldTypeTFromStr[col.columnType])
                    }
                });
                return schema;
            }
        }

        return null;
    } catch (e) {
        console.log(e);
        return null;
    }
}

// remove isCRLF from loadArgs.parseArgs.parserArgJson
function removeCRLF(node) {
    let originalLoadArgs = node.args.loadArgs;
    let loadArgs = originalLoadArgs;
    if (!loadArgs) {
        return originalLoadArgs;
    }
    try {
        let parsed = false;
        if (typeof loadArgs === "string") {
            loadArgs = JSON.parse(loadArgs);
            parsed = true;
        }
        if (loadArgs.parseArgs && loadArgs.parseArgs.parserArgJson) {
            const parserArgJson = JSON.parse(loadArgs.parseArgs.parserArgJson);
            delete parserArgJson.isCRLF;
            loadArgs.parseArgs.parserArgJson = JSON.stringify(parserArgJson);
        }

        if (parsed) {
            loadArgs = JSON.stringify(loadArgs);
        }
        return loadArgs;
    } catch (e) {
        console.log(e);
        return originalLoadArgs;
    }
}
// format loadArgs into the way dataflow 2.0 dataset node expects
function updateLoadArgsForXD(args) {
    let originalLoadArgs = args.loadArgs;
    let loadArgs = originalLoadArgs;
    if (!loadArgs) {
        return originalLoadArgs;
    }
    try {
        let parsed = false;
        if (typeof loadArgs === "string") {
            loadArgs = JSON.parse(loadArgs);
            parsed = true;
        }
        loadArgs = {
            operation: XcalarApisTStr[XcalarApisT.XcalarApiBulkLoad],
            args: {
                dest: args.dest,
                loadArgs: loadArgs
            }
        }
        return JSON.stringify(loadArgs);
    } catch (e) {
        console.log(e);
        return originalLoadArgs;
    }
}

function modifyOriginalInput(originalInput) {
    let query = originalInput.query;

    for (let i = 0; i < query.length; i++) {
        const rawNode = query[i];
        if (XcalarApisTFromStr[rawNode.operation] === XcalarApisT.XcalarApiBulkLoad) {
            let loadArgs = rawNode.args.loadArgs;
            rawNode.args.loadArgs = removeCRLF(rawNode);
        }
    }
}

function _getAggsFromEvalStrs(evalStrs) {
    const aggs = [];
    for (let i = 0; i < evalStrs.length; i++) {
        const parsedEval = XEvalParser.parseEvalStr(evalStrs[i].evalString);
        if (!parsedEval.args) {
            parsedEval.args = [];
        }
        getAggs(parsedEval);
    }
    function getAggs(parsedEval) {
        for (let i = 0; i < parsedEval.args.length; i++) {
            if (parsedEval.args[i].type === "aggValue") {
                aggs.push(parsedEval.args[i].value);
            } else if (parsedEval.args[i].type === "fn") {
                getAggs(parsedEval.args[i]);
            }
        }
    }
    return aggs;
}

function _getTags(tag) {
    if (!tag) {
        return [];
    }
    return tag.split(",");
}

 // returns tagName if one of tags id matches tableName's id
function _checkIsTagHeader(tags, tableName) {
    var tableId = xcHelper.getTableId(tableName);
    for (var i = 0; i < tags.length; i++) {
        var tagId = xcHelper.getTableId(tags[i]);
        if (tagId != null && tagId === tableId) {
            return tags[i];
        }
    }
    return null;
}

 // if  node has multiple children and one of the children doesn't have a tag
// that matches that node, that node will not be hidden tag
function _checkNodeHasNonTaggedChildren(tag, node) {
    const numChildren = node.realChildren.length;
    if (numChildren === 1) {
        return false;
    } else {
        for (var i = 0; i < numChildren; i++) {
            const child = node.realChildren[i];
            const childTags = _getTags(child.rawNode.tag);
            let matchFound = false;
            for (var j = 0; j < childTags.length; j++) {
                if (tag === childTags[j]) {
                    matchFound = true;
                    break;
                }
            }
            if (!matchFound) {
                return true;
            }
        }
    }

    return false;
}

function _getIndexedFields(node) {
    var cols = [];
    search(node);
    function search(node) {
        // if parent node is join, it's indexed by left parent, ignore right
        var numParents = Math.min(node.realParents.length, 1);
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.realParents[i];
            if (parentNode.api === XcalarApisT.XcalarApiIndex) {
                cols = parentNode.args.key;
            } else {
                search(parentNode);
            }
        }
    }

    return [cols];
}

function _getUnionColumns(columns) {
    let maxLength = 0;
    let maxColSet;
    const newCols = columns.map((colSet, i) => {
        const newColSet = colSet.map((col) => {
            return {
                "sourceColumn": col.sourceColumn,
                "destColumn": col.destColumn,
                "cast": false,
                "columnType": xcHelper.getDFFieldTypeToString(DfFieldTypeTFromStr[col.columnType])
            }
        });
        if (newColSet.length > maxLength) {
            maxLength = newColSet.length;
            maxColSet = newColSet;
        }
        return newColSet;
    });

    newCols.forEach((colSet) => {
        const currLen = colSet.length;
        const diff = maxLength - currLen;
        if (diff > 0) {
            for (let i = 0; i < diff; i++) {
                colSet.push({
                    "sourceColumn": null,
                    "destColumn": maxColSet[currLen + i].destColumn,
                    "cast": false,
                    "columnType": maxColSet[currLen + i].columnType
                });
            }
        }
    })

    return newCols;
}


var DagNodeType;
(function (DagNodeType) {
    DagNodeType["Aggregate"] = "aggregate";
    DagNodeType["Custom"] = "custom";
    DagNodeType["CustomInput"] = "customInput";
    DagNodeType["CustomOutput"] = "customOutput";
    DagNodeType["Dataset"] = "dataset";
    DagNodeType["DFIn"] = "link in";
    DagNodeType["DFOut"] = "link out";
    DagNodeType["Explode"] = "explode";
    DagNodeType["Export"] = "export";
    DagNodeType["Extension"] = "extension";
    DagNodeType["Filter"] = "filter";
    DagNodeType["GroupBy"] = "groupBy";
    DagNodeType["IMDTable"] = "IMDTable";
    DagNodeType["Index"] = "index";
    DagNodeType["Join"] = "join";
    DagNodeType["Jupyter"] = "Jupyter";
    DagNodeType["Map"] = "map";
    DagNodeType["Project"] = "project";
    DagNodeType["PublishIMD"] = "publishIMD";
    DagNodeType["Round"] = "round";
    DagNodeType["RowNum"] = "rowNum";
    DagNodeType["Set"] = "set";
    DagNodeType["Sort"] = "sort";
    DagNodeType["Source"] = "source";
    DagNodeType["Split"] = "split";
    DagNodeType["SQL"] = "sql";
    DagNodeType["SQLSubInput"] = "SQLSubInput";
    DagNodeType["SQLSubOutput"] = "SQLSubOutput";
    DagNodeType["SubGraph"] = "subGraph";
    DagNodeType["Placeholder"] = "placeholder";
})(DagNodeType || (DagNodeType = {}));

exports.convert = convert;