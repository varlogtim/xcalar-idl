window.DagFunction = (function($, DagFunction) {
    var dagLineage = {};
    var globalArray = []; // Place to store all the lines of xccli
    var TreeNode = function(left, right, value) {
        this.leftAncestor = left;
        this.rightAncestor = right;
        this.value = value;
        this.descendents = [];
        return (this);
    };

    var TreeValue = function(api, struct, dagNodeId, inputName) {
        this.api = api;
        this.struct = struct;
        this.dagNodeId = dagNodeId;
        this.inputName = inputName;
        return (this);
    };

    DagFunction.setup = function() {
        dagLineage = {};
    };

    DagFunction.construct = function(getDagOutput, tableId) {
        var valArray = [];
        for (var i = 0; i<getDagOutput.node.length; i++) {
            var apiString = XcalarApisTStr[getDagOutput.node[i].api];
            var inputName = DagFunction.getInputType(apiString);
            var inputStruct = getDagOutput.node[i].input[inputName];
            valArray.push(new TreeValue(getDagOutput.node[i].api, inputStruct,
                getDagOutput.node[i].dagNodeId, inputName));
        }
        var allEndPoints = [];
        var lineageStruct = {};
        lineageStruct.tree = constructTree(valArray[0], valArray, {},
                                           undefined, allEndPoints);
        lineageStruct.endPoints = allEndPoints;
        lineageStruct.orderedPrintArray = getOrderedDedupedNodes(allEndPoints);
        if (tableId) {
            dagLineage[tableId] = lineageStruct;
        }
        return lineageStruct;
    };

    DagFunction.destruct = function(tableId) {
        delete dagLineage[tableId];
    };

    DagFunction.getInputType = function(api) {
        var val = api.substr('XcalarApi'.length);
        var inputVal = "";
        switch (val) {
            case ('BulkLoad'):
                inputVal = 'load';
                break;
            case ('GetStat'):
                inputVal = 'stat';
                break;
            case ('GetStatByGroupId'):
                inputVal = 'statByGroupId';
                break;
            default:
                inputVal = val[0].toLowerCase() + val.substr(1);
                break;
        }
        inputVal += 'Input';
        return (inputVal);
    };

    DagFunction.getAll = function() {
        return (dagLineage);
    };

    DagFunction.printDagCli = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var toPrint;
        var deferred = jQuery.Deferred();
        if (dagLineage[tableId]) {
            printArray(dagLineage[tableId].orderedPrintArray)
            .then(handleFullQuery);
        } else {
            XcalarGetDag(tableName)
            .then(function(dagOutput) {
                var outStruct = DagFunction.construct(dagOutput);
                return printArray(outStruct.orderedPrintArray);
            })
            .then(handleFullQuery);
        }
    };

    function handleFullQuery() {
        console.log(globalArray.join(";\n"));
    }

    function printArray(orderedArray) {
        var promiseArray = [];
        globalArray = [];
        for (var i = 0; i<orderedArray.length; i++) {
            var nodeValue = orderedArray[i].value;
            var workItem = new WorkItem();
            workItem.input = new XcalarApiInputT();
            workItem.input[nodeValue.inputName] = nodeValue.struct;
            workItem.api = nodeValue.api;
            promiseArray.push(populateGlobalArray.bind(this, workItem));
        }
        return PromiseHelper.chain(promiseArray);
    }

    function populateGlobalArray(workItem) {
        return (XcalarGetQuery(workItem)
            .then(function(queryStr) {
                globalArray.push(queryStr);
            }));
    }


    function findNodeInValArray(dagId, valArray) {
        for (var i = 0; i<valArray.length; i++) {
            if (valArray[i].dagNodeId === dagId) {
                return (valArray[i]);
            }
        }
    }

    function getOrderedDedupedNodes(endPoints) {
        var queue = endPoints.slice();
        var printed = [];
        while (queue.length > 0) {
            var node = queue.shift();
            var allAncestorsPrinted = true;
            if ((node.leftAncestor && 
                (printed.indexOf(node.leftAncestor) === -1)) ||
                (node.rightAncestor && 
                (printed.indexOf(node.rightAncestor) === -1))) {
                allAncestorsPrinted = false;
            }
            if (allAncestorsPrinted) {
                printed.push(node);
                // Now add all descendents of node to queue
                for (var i = 0; i<node.descendents.length; i++) {
                    if (queue.indexOf(node.descendents[i]) === -1) {
                        queue.push(node.descendents[i]);
                    }
                }
            } else {
                // Move node to back to try to print again later
                queue.push(node);
            }
        }
        return printed;
    }

    function constructTree(node, valArray, alreadySeen, desc, endPoints) {
        var leftOrigin = null;
        var rightOrigin = null;
        var leftNode = null;
        var rightNode = null;
        var leftTree = null;
        var rightTree = null;

        var treeNode = new TreeNode(null, null, node);
        if (node.api === 15) {
            // Join
            leftOrigin = node.struct.leftTable.tableId;
            rightOrigin = node.struct.rightTable.tableId;
        } else if (node.api === 2) {
            // Load
            leftOrigin = null;
            rightOrigin = null;
            endPoints.push(treeNode);
        } else if (node.api === 3) {
            // Index
            leftOrigin = node.struct.source.xid;
            rightOrigin = null;
        } else {
            leftOrigin = node.struct.srcTable.tableId;
            rightOrigin = null;
        }

        if (leftOrigin) {
            if (leftOrigin in alreadySeen) {
                leftTree = alreadySeen[leftOrigin];
                leftTree.descendents.push(treeNode);
            } else {
                leftNode = findNodeInValArray(leftOrigin, valArray);
                leftTree = constructTree(leftNode, valArray, alreadySeen,
                                         treeNode, endPoints);
            }
        }

        if (rightOrigin) {
            if (rightOrigin in alreadySeen) {
                rightTree.descendents.push(treeNode);
                rightTree = alreadySeen[rightOrigin];
            } else {
                rightNode = findNodeInValArray(rightOrigin, valArray);
                rightTree = constructTree(rightNode, valArray, alreadySeen,
                                          treeNode, endPoints);
            }
        }

        treeNode.leftAncestor = leftTree;
        treeNode.rightAncestor = rightTree;
        if (desc) {
            treeNode.descendents = [desc];
        } else {
            treeNode.descendents = [];
        }
        alreadySeen[node.dagNodeId] = treeNode;
        return (alreadySeen[node.dagNodeId]);
    }

    return DagFunction;
}(jQuery, {}));