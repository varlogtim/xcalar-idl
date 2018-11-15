
let xcHelper;
let XEvalParser = require("./xEvalParser/index.js").XEvalParser;
// DagNodeType = require("../../assets/js/components/dag/DagEnums.js").DagNodeType;
// DagNodeType = require("../../assets/js/components/dag.js").DagNodeType;
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

    // TEMPORARY FUNCTIONS
    xcHelper.unionTypeToXD = function(type) {
        switch (type) {
            case UnionOperatorTStr[UnionOperatorT.UnionStandard]:
                return "union";
            case UnionOperatorTStr[UnionOperatorT.UnionIntersect]:
                return "intersect";
            case UnionOperatorTStr[UnionOperatorT.UnionExcept]:
                return "except";
            default:
                console.error("error case");
                return "";
        }
    }
});

const globalKVPrefix = "/globalKvs/";
const globalKVDatasetPrefix = "/globalKvsDataset/";
const workbookKVPrefix = "/workbookKvs/";
let idCount = 0; // used to give ids to dataflow nodes
const gridSpacing = 20;
const horzNodeSpacing = 140;// spacing between nodes when auto-aligning
const vertNodeSpacing = 60;

function convert(query) {
    const nodes = new Map();
    const datasets = [];
    try {
        if (typeof query === "string") {
            query = JSON.parse(query);
        }
    } catch (e) {
        return "invalid query: " + query;
    }
    if (!(query instanceof Array)) {
        return "invalid query: " + query;
    }

    for (let rawNode of query) {
        const args = rawNode.args;
        const node =
        {   name: args.dest,
            parents: [],
            children: [],
            realChildren: [],
            rawNode: rawNode,
            args: args,
            api: XcalarApisTFromStr[rawNode.operation],
            subGraph: {},
            indexedFields: []
        };

        let isIgnoredApi = false;
        switch (node.api) {
            case (XcalarApisT.XcalarApiIndex):
            case (XcalarApisT.XcalarApiAggregate):
            case (XcalarApisT.XcalarApiProject):
            case (XcalarApisT.XcalarApiGroupBy):
            case (XcalarApisT.XcalarApiGetRowNum):
                node.parents = [args.source];
                break;
            case (XcalarApisT.XcalarApiFilter):
            case (XcalarApisT.XcalarApiMap):
                node.parents = [args.source];
                node.aggregates = _getAggsFromEvalStrs(args.eval);
                break;
            case (XcalarApisT.XcalarApiJoin):
            case (XcalarApisT.XcalarApiUnion):
                node.parents = xcHelper.deepCopy(args.source);
                break;
            case (XcalarApisT.XcalarApiSelect):
            case (XcalarApisT.XcalarApiSynthesize):
                node.parents = [];
                break;
            case (XcalarApisT.XcalarApiBulkLoad):
                node.parents = [];
                datasets.push(rawNode);
                break;
            default:
                isIgnoredApi = true;
                break;
        }
        if (!isIgnoredApi) {
            nodes.set(node.name, node);
        }
    }

    for (let [_name, node] of nodes) {
        _setParents(node, nodes);
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

    return _finalConvertIntoDagNodeInfoArray(nodes, datasets);
}

function _finalConvertIntoDagNodeInfoArray(nodes, datasets) {
    const dataflows = [];
    const dataflowsList = [];
    let treeGroups = {};
    let seen = {};
    let count = 0;
    let nodeCount = 0;
     // group nodes into separate trees
    for (let [_name, node] of nodes) {
        if (node.children.length === 0) {
            _splitIntoTrees(node, seen, treeGroups, nodeCount);
        }
        nodeCount++;
    }

    for (let i in treeGroups) {

        const group = treeGroups[i];
        const endNodes = [];
        for (let j = 0; j < group.length; j++) {
            const node = group[j];
            if (node.children.length === 0) {
                endNodes.push(node);
            }
        }

        const dagNodeInfos = {};
        endNodes.forEach(node => {
            _recursiveGetDagNodeInfo(node, dagNodeInfos);
        });

        const graphDimensions = _setPositions(dagNodeInfos);

        const nodes = [];
        for (var j in dagNodeInfos) {
            const node = dagNodeInfos[j];
            node.parents = node.parentIds;
            // should not persist .parentIds and .children
            delete node.parentIds;
            delete node.children;
            nodes.push(node);
        }

        const tabId = "DF2_" + new Date().getTime() + "_" + count;
        dataflowsList.push({
            name: "Dataflow " + (count + 1),
            id: tabId
        });

        const dataflow = {
            autosave: true,
            id: tabId,
            name: "Dataflow " + (count + 1),
            dag: {
                "nodes": nodes,
                "comments":[],
                "display": {
                    "width": graphDimensions.maxX,
                    "height": graphDimensions.maxY,
                    "scale": 1
                }
            }
        }

        dataflows.push(dataflow);
        count++;
    }

    return _createKVStoreKeys(dataflows, dataflowsList, datasets);
}

function _createKVStoreKeys(dataflows, dataflowsList, datasets) {
    const kvPairs = {};
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
        _alignNodes(group[0], nodeInfos, startingWidth);

        for (let j = 0; j < group.length; j++) {
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
                x: ((maxDepth - nodeInfos[j].depth) * horzNodeSpacing) + gridSpacing,
                y: (nodeInfos[j].width * vertNodeSpacing) + gridSpacing
            }
        }
        startingWidth = (maxWidth + 1);
    }
    const graphHeight = vertNodeSpacing * (startingWidth - 1) + (vertNodeSpacing * 2);
    const graphWidth = horzNodeSpacing * overallMaxDepth + horzNodeSpacing + gridSpacing;

    return {
        maxX: graphWidth,
        maxY: graphHeight
    };
}

  // groups individual nodes into trees and joins branches with main tree
function _splitIntoTrees(node, seen, treeGroups, groupId) {
    const treeGroup = {};
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

            for (let i in treeGroup) {
                seen[i] = mainGroupId; // reassigning nodes from current
                // group to the main group that has the id of "mainGroupId"
                let mainGroup = treeGroups[mainGroupId];
                mainGroup.push(treeGroup[i]);
            }
            delete treeGroups[groupId];
            groupId = mainGroupId;
            return;
        }
        treeGroup[id] = node;
        seen[id] = groupId;
        if (!treeGroups[groupId]) {
            treeGroups[groupId] = [];
        }
        treeGroups[groupId].push(node);

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

function _recursiveGetDagNodeInfo(node, dagNodeInfos) {
    if (dagNodeInfos[node.name]) {
        return dagNodeInfos[node.name];
    }
    const dagNodeInfo = _getDagNodeInfo(node);
    dagNodeInfos[node.name] = dagNodeInfo;

    node.parents.forEach(child => {
        const childInfo = _recursiveGetDagNodeInfo(child, dagNodeInfos);
        dagNodeInfo.parentIds.push(childInfo.id);
        dagNodeInfo.parents.push(childInfo);
        childInfo.children.push(dagNodeInfo);
    });
    return dagNodeInfo;
}

function _getDagNodeInfo(node) {
    let dagNodeInfo;
    switch (node.api) {
        case (XcalarApisT.XcalarApiIndex):
            //
            if (node.createTableInput) {
                dagNodeInfo = {
                    type: DagNodeType.Dataset,
                    input: node.createTableInput
                }; // need to get columns
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
            const groupBy = node.indexedFields[0].map(key => {
                return key.name;
            });
            const newKeys = node.indexedFields[0].map(key => {
                return key.keyFieldName;
            });
            dagNodeInfo = {
                type: DagNodeType.GroupBy,
                input: {
                    groupBy: groupBy,
                    newKeys: newKeys,
                    aggregate: aggs,
                    includeSample: node.args.includeSample,
                    icv: node.args.icv,
                    groupAll: node.args.groupAll
                }
            };
            break;
        case (XcalarApisT.XcalarApiGetRowNum):
            dagNodeInfo = {
                type: DagNodeType.GetRowNum,
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
                },
                aggregates: node.aggregates
            };
            break;
        case (XcalarApisT.XcalarApiMap):
            dagNodeInfo = {
                type: DagNodeType.Map,
                input: {
                    eval: node.args.eval,
                    icv: node.args.icv
                },
                aggregates: node.aggregates
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
                },
            };
            break;
        case (XcalarApisT.XcalarApiUnion):
            const setType = xcHelper.unionTypeToXD(node.args.unionType);
            dagNodeInfo = {
                type: DagNodeType.Set,
                subType: xcHelper.capitalize(setType),
                input: {
                    unionType: setType,
                    columns: node.args.columns,
                    dedup: node.args.dedup
                }
            };
            break;
        case (XcalarApisT.XcalarApiSelect):
        case (XcalarApisT.XcalarApiSynthesize):
        case (XcalarApisT.XcalarApiBulkLoad): // should not have any
        // as the "createTable" index node should take it's place
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

    dagNodeInfo.description = node.rawNode.comment || "";
    dagNodeInfo.table = node.name;
    dagNodeInfo.id = "dag_" + new Date().getTime() + "_" + idCount;
    dagNodeInfo.parents = [];
    dagNodeInfo.parentIds = [];
    dagNodeInfo.children = [];
    dagNodeInfo.state =  "Configured";
    idCount++;
    return dagNodeInfo;
}

// turns    filter->index->join    into   filter->join
// and setups up a "create table" node to be a dataset node
function _collapseIndexNodes(node) {
    if (node.api === XcalarApisT.XcalarApiIndex) {
        const parent = node.parents[0];
        if (parent && parent.api === XcalarApisT.XcalarApiBulkLoad) {
            node.createTableInput = {
                source: xcHelper.stripPrefixFromDSName(node.args.source),
                prefix: node.args.prefix
            }
            node.parents = [];
        }
        return;
    }
    for (let i = 0; i < node.parents.length; i++) {
        const parent = node.parents[i];
        if (parent.api !== XcalarApisT.XcalarApiIndex) {
            continue;
        }
        if (!parent.parents.length ||
            parent.parents[0].api === XcalarApisT.XcalarApiBulkLoad) {
            if (parent.args.source.startsWith(gDSPrefix)) {
                // if index resulted from dataset
                // then that index needs to take the role of the dataset node
                parent.createTableInput = {
                    source: xcHelper.stripPrefixFromDSName(parent.args.source),
                    prefix: parent.args.prefix
                }
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
            if (parentOfIndex.args.source.startsWith(gDSPrefix)) {
                return parentOfIndex;
            }

            indexParents.push(parentOfIndex);
            return getNonIndexParent(parentOfIndex, indexParents);
        } else {
            return parentOfIndex;
        }
    }
}

function _setParents(node, nodes) {
    node.realParents = [];
    for (let i = 0; i < node.parents.length; i++) {
        const parent = nodes.get(node.parents[i]);
        if (parent) {
            parent.children.push(node);
            parent.realChildren.push(node);
            node.parents[i] = parent;
            node.realParents[i] = parent;
        } else {
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