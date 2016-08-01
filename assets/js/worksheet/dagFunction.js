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
        lineageStruct.orderedPrintArray = getOrderedDedupedNodes(allEndPoints,
                                          "TreeNode");
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
    // Helpers for cloneTreeWithNewValue
    function findXidByDstTableName(valArray, dstName) {
        for (var i = 0; i<valArray.length; i++) {
            var cmpValue = "";
            if (valArray[i].value.api === XcalarApisT.XcalarApiBulkLoad) {
                cmpValue = valArray[i].value.struct.dataset.name; 
            } else if (valArray[i].value.api === XcalarApisT.XcalarApiJoin) {
                cmpValue = valArray[i].value.struct.joinTable.tableName;
            } else {
                cmpValue = valArray[i].value.struct.dstTable.tableName;
            }
            if (cmpValue === dstName) {
                // XXX Disallow parameterization of load nodes
                if (valArray[i].value.api === XcalarApisT.XcalarApiBulkLoad) {
                    console.info("Cannot parameterize load. You can do this " +
                                 "via retinas.");
                    return (-1);
                }
                return (valArray[i].value.dagNodeId);
            }
        }
        console.error("Cannot find xid!");
        return (-1);
    }

    function findTreeValueInValArray(dagId, valArray) {
        for (var i = 0; i<valArray.length; i++) {
            if (valArray[i].dagNodeId === dagId) {
                return (valArray[i]);
            }
        }
    }

    function findTreeNodeInNodeArray(dagId, nodeArray) {
        for (var i = 0; i<nodeArray.length; i++) {
            if (nodeArray[i].value.dagNodeId === dagId) {
                return (nodeArray[i]);
            }
        }
    }

    function getAllXidFromStart(tree, startTreeNodes) {
        // Recursively go down the tree of all descendents until we hit the end
        // Returns list of all xids that we have seen in this traversal
        // This terminates due to the graph being a DAG
        function recurHelper(node, listSoFar) {
            listSoFar[node.value.dagNodeId] = 1; // We are only using the key
            for (var i = 0; i<node.descendents.length; i++) {
                recurHelper(node.descendents[i], listSoFar);
            }
        }

        var listOfXids = {};
        for (var i = 0; i<startTreeNodes.length; i++) {
            recurHelper(startTreeNodes[i], listOfXids);
        }
        return listOfXids;

    }

    DagFunction.cloneTreeWithNewValue = function(tableName, paramNodes,
                                                 doNotRun) {
        function getConstructorName(inputName) {
            var input = inputName.substr(0, inputName.length-5);
            switch(input) {
                case ("load"):
                    consName = "BulkLoad";
                    break;
                case ("stat"):
                    consName = "GetStat";
                    break;
                case ("statByGroupId"):
                    consName = "GetStatByGroupId";
                    break;
                default:
                    consName = input[0].toUpperCase() + input.substr(1);
            }
            consName = "XcalarApi" + consName +"InputT()";

            return (consName);
        }

        function updateSourceName(structArray, translation) {
            for (var i = 0; i<structArray.length; i++) {
                if ("tableName" in structArray[i]) {
                    if (structArray[i].tableName in translation) {
                        structArray[i].tableName =
                                          translation[structArray[i].tableName];
                    }
                } else if ("name" in structArray[i]) {
                    if (structArray[i].name in translation) {
                        structArray[i].name = translation[structArray[i].name];
                    }
                }
            }
        }

        function updateDestinationName(struct, translation) {
            if (struct.tableName in translation) {
                struct.tableName = translation[struct.tableName];
            } else {
                var newTableName = "rerunQuery" +
                                   Math.ceil(Math.random()*10000) +
                                   Authentication.getHashId();     
                translation[struct.tableName] = newTableName;
                struct.tableName = newTableName;
            }
        }

        if (typeof(paramNodes) === "string") {
            paramNodes = [paramNodes];
        }
        var tableId = xcHelper.getTableId(tableName);
        if (!dagLineage[tableId]) {
            console.error("Currently not implemented. Please call printDagCli" +
                          "first");
            return;
        }
        var valueArray = getOrderedDedupedNodes(dagLineage[tableId].endPoints,
                                                "TreeValue");
        for (var i = 0; i<valueArray.length; i++) {
            var structName = getConstructorName(valueArray[i].inputName);
            var newStruct = {};
            try {
                // XXX Once we have a nice clean interface from the backend
                // we can algorithmically generate this rather than use eval
                newStruct = eval("new "+structName);
            } catch(error) {
                console.error(error);
                newStruct = {};
            }
            var struct = jQuery.extend(true, newStruct, valueArray[i].struct);
            valueArray[i] = xcHelper.deepCopy(valueArray[i]);
            // ^ Just the above is not enough due to prototype methods in
            // the thrift structs
            valueArray[i].struct = struct;
        }

        // Time to deep clone the tree. We cannot use deepCopy trick due to
        // references.
        var allEndPoints = [];
        var deepCopyTree = constructTree(valueArray[valueArray.length-1],
                                                    valueArray, {},
                                                    undefined, allEndPoints);
        var treeNodeArray = getOrderedDedupedNodes(allEndPoints,
                             "TreeNode");
        // Step 1. From deepCopied tree, get list of all xid for descendents of
        // start node (s)
        var startNodes = [];
        for (var i = 0; i<paramNodes.length; i++) {
            // Translate paramNodes from table names to nodes
            var xid = findXidByDstTableName(treeNodeArray, paramNodes[i]);
            if (xid === -1) {
                return;
            }
            startNodes[i] = findTreeNodeInNodeArray(xid, treeNodeArray);
        }
        if (doNotRun) {
            console.log(startNodes);
            return;
        }

        var involvedXids = getAllXidFromStart(deepCopyTree, startNodes);
        // Step 2. Remove nodes from treeNodeArray that is not in involvedXids
        var treeNodesToRerun = [];
        for (var i = 0; i<treeNodeArray.length; i++) {
            if (treeNodeArray[i].value.dagNodeId in involvedXids) {
                treeNodesToRerun.push(treeNodeArray[i]);
            }
        }
        console.log(treeNodesToRerun);

        // Step 3. From start of treeNodeArray, start renaming all nodes
        var translation = {};
        for (var i = 0; i<treeNodesToRerun.length; i++) {
            var destTableStruct = {};
            var originTableStruct = [];
            if (treeNodesToRerun[i].value.api === XcalarApisT.XcalarApiJoin) {
                destTableStruct = treeNodesToRerun[i].value.struct.joinTable;
                originTableStruct.push(treeNodesToRerun[i].value.struct.
                                       leftTable);
                originTableStruct.push(treeNodesToRerun[i].value.struct.
                                       rightTable);
            } else if (treeNodesToRerun[i].value.api ===
                                                   XcalarApisT.XcalarApiIndex) {
                destTableStruct = treeNodesToRerun[i].value.struct.dstTable;
                originTableStruct.push(treeNodesToRerun[i].value.struct.source);
            } else {
                destTableStruct = treeNodesToRerun[i].value.struct.dstTable;
                originTableStruct.push(treeNodesToRerun[i].value.struct.
                                       srcTable);
            }
            if (i > 0) {
                updateSourceName(originTableStruct, translation);
            }
            updateDestinationName(destTableStruct, translation);
        }

        var finalTableName = treeNodesToRerun[treeNodesToRerun.length-1].value.
                                                      struct.dstTable.tableName;
        var sql = {
                "operation"   : SQLOps.Query,
                "tableName"   : tableName,
                "tableId"     : tableId,
        };
        var txId = Transaction.start({
            "msg"      : 'Rerun: ' + tableName,
            "operation": SQLOps.Query,
            "sql"      : sql,
            "steps"    : 1
        });
        printArray(treeNodesToRerun)
        .then(handleFullQuery)
        .then(function(entireString) {
            var queryName = "Rerun" + tableName +
                            Math.ceil(Math.random()*10000);
            return XcalarQueryWithCheck(queryName, entireString, txId);
        })
        .then(function() {
            console.log(finalTableName);
            Transaction.done(txId);

            var worksheet = WSManager.getWSFromTable(tableId);
            var oldCols = xcHelper.deepCopy(gTables[tableId].tableCols);
            var tableCols = [];
            for (var i = 0, len = oldCols.length; i < len; i++) {
                var progCol = new ProgCol(oldCols[i]);
                tableCols[i] = progCol;
            }
            TblManager.refreshTable([finalTableName], tableCols, [tableName],
                                     worksheet);
        });
    };

    function handleFullQuery() {
        queryString = globalArray.join(";");
        console.log(queryString.replace(";", ";\n"));
        return (queryString);
    }    

    function printArray(orderedArray) {
        console.log(orderedArray);
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

    function getOrderedDedupedNodes(endPoints, type) {
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
        if (type === "TreeNode") {
            return printed;
        } else if (type === "TreeValue") {
            for (var i = 0; i<printed.length; i++) {
                printed[i] = printed[i].value;
            }
            return printed;
        } else {
            console.error("Invalid type");
            return [];
        }
    }

    function constructTree(node, valArray, alreadySeen, desc, endPoints) {
        var leftOrigin = null;
        var rightOrigin = null;
        var leftNode = null;
        var rightNode = null;
        var leftTree = null;
        var rightTree = null;

        var treeNode = new TreeNode(null, null, node);
        if (node.api === XcalarApisT.XcalarApiJoin) {
            // Join
            leftOrigin = node.struct.leftTable.tableId;
            rightOrigin = node.struct.rightTable.tableId;
        } else if (node.api === XcalarApisT.XcalarApiBulkLoad) {
            // Load
            leftOrigin = null;
            rightOrigin = null;
            endPoints.push(treeNode);
        } else if (node.api === XcalarApisT.XcalarApiIndex) {
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
                leftNode = findTreeValueInValArray(leftOrigin, valArray);
                leftTree = constructTree(leftNode, valArray, alreadySeen,
                                         treeNode, endPoints);
            }
        }

        if (rightOrigin) {
            if (rightOrigin in alreadySeen) {
                rightTree = alreadySeen[rightOrigin];
                rightTree.descendents.push(treeNode);
            } else {
                rightNode = findTreeValueInValArray(rightOrigin, valArray);
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