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
            var dagNodeId = getDagOutput.node[i].dagNodeId;
            if (getDagOutput.node[i].api === XcalarApisT.XcalarApiBulkLoad) {
                dagNodeId = getDagOutput.node[i].input.loadInput.dataset
                                                                .datasetId;
            }
            valArray.push(new TreeValue(getDagOutput.node[i].api, inputStruct,
                                        dagNodeId, inputName));
        }
        var allEndPoints = [];
        var lineageStruct = {};
        var tree = constructTree(valArray[0], valArray, {}, undefined,
                                 allEndPoints);
        if (!tree) {
            console.info("No creatable tree");
            return;
        }
        lineageStruct.tree = tree;
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

    DagFunction.get = function(tableId) {
        if (tableId in dagLineage) {
            return (dagLineage[tableId]);
        } else {
            return (undefined);
        }
    };

    DagFunction.printDagCli = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        // var toPrint;
        // var deferred = jQuery.Deferred();
        if (dagLineage[tableId]) {
            getXcalarQueryCli(dagLineage[tableId].orderedPrintArray)
            .then(concatAllCli);
        } else {
            XcalarGetDag(tableName)
            .then(function(dagOutput) {
                var outStruct = DagFunction.construct(dagOutput);
                return getXcalarQueryCli(outStruct.orderedPrintArray);
            })
            .then(concatAllCli);
        }
    };

    DagFunction.cloneDagNode = function(inputName, origInputStruct) {
        function getConstructorName(inputName) {
            var input = inputName.substr(0, inputName.length-5);
            switch (input) {
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
        // We are looking for something like XcalarApiBLAHInputT
        var structName = getConstructorName(inputName);
        var newStruct = {};
        try {
            // XXX Once we have a nice clean interface from the backend
            // we can algorithmically generate this rather than use eval
            newStruct = eval("new "+structName);
        } catch (error) {
            console.error(error);
            console.error("Constructor doesn't eval to any known struct! "+
                          structName);
            return;
        }
        return (jQuery.extend(true, newStruct, origInputStruct));
    };

    DagFunction.revertTable = function(tableId, newTableName, oldTableName) {
        var wsId;
        var worksheet;
        if (WSManager.getWSFromTable(tableId) == null || !gTables[tableId])
        {
            tableType = "noSheet";
            wsId = WSManager.getActiveWS();
            worksheet = wsId;
        } else if (gTables[tableId] && gTables[tableId].status ===
                    TableType.Orphan) {
            tableType = TableType.Orphan;
            wsId = null;
            worksheet = WSManager.getWSFromTable(tableId);
        } else {
            tableType = TableType.Archived;
            wsId = null;
            worksheet = WSManager.getWSFromTable(tableId);
        }

        var oldTableId = xcHelper.getTableId(oldTableName);
        var oldTableNames = [];
        if (oldTableName) {
            oldTableNames.push(oldTableName);
        }
        xcHelper.lockTable(tableId);
        xcHelper.lockTable(oldTableId);
        TblManager.refreshTable([newTableName], undefined, oldTableNames, wsId,
                                null)
        .then(function() {
            xcHelper.unlockTable(tableId);
            xcHelper.unlockTable(oldTableId);
            var newTableId = xcHelper.getTableId(newTableName);

            var $tableWrap = $('#xcTableWrap-' + newTableId).mousedown();
            Dag.focusDagForActiveTable();
            xcHelper.centerFocusedTable($tableWrap, true);

            SQL.add("Revert Table", {
                "operation": SQLOps.RevertTable,
                "tableName": newTableName,
                "oldTableName": oldTableName,
                "oldTableId": oldTableId,
                "tableId": newTableId,
                "tableType": tableType,
                "worksheet": worksheet,
                "worksheetIndex": WSManager.indexOfWS(worksheet),
                "htmlExclude": ["tableType", "oldTableName", "worksheet",
                                "worksheetIndex"]
            });
        });
    };

    DagFunction.addTable = function(tableId) {
        var wsId = WSManager.getActiveWS();
        var tableType;

        if (WSManager.getWSFromTable(tableId) == null || !gTables[tableId])
        {
            tableType = TableType.Orphan;
        } else if (gTables[tableId].status === TableType.Orphan) {
            tableType = TableType.Orphan;
        } else {
            tableType = TableType.Archived;
        }

        WSManager.moveInactiveTable(tableId, wsId, tableType);
    };

    DagFunction.focusTable = function(tableId) {
        var $dagPanel = $('#dagPanel');
        var wsId = WSManager.getWSFromTable(tableId);
        if (!wsId) {
            console.error('Cannot focus table due to no worksheet!');
            return;
        }
        $('#worksheetTab-' + wsId).trigger(fakeEvent.mousedown);

        if ($dagPanel.hasClass('full')) {
            $('#dagPulloutTab').click();
        }
        var $tableWrap = $('#xcTableWrap-' + tableId);
        xcHelper.centerFocusedTable($tableWrap);
        $tableWrap.mousedown();
        moveFirstColumn();
        Dag.focusDagForActiveTable(undefined, true);
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

    function findTreeValueInValArrayByName(tableName, valArray) {
        for (var i = 0; i<valArray.length; i++) {
            if (valArray[i].api === XcalarApisT.XcalarApiJoin) {
                if (valArray[i].struct.joinTable.tableName === tableName) {
                    return (valArray[i]);
                }
            } else if (valArray[i].api === XcalarApisT.XcalarApiBulkLoad) {
                // Cannot parameterize bulk load
                // A later function catches this and errors out
                continue;
            } else {
                if (valArray[i].struct.dstTable.tableName === tableName) {
                    return (valArray[i]);
                }
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

    DagFunction.runProcedureWithParams = function(tableName, param, doNotRun) {
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
            // Note: Inability to find "tableName" or "name" here is not an
            // error. It just means that one of the input is not parameterized
        }

        function updateDestinationName(struct, translation, randomQueryNum) {
            if (struct.tableName in translation) {
                struct.tableName = translation[struct.tableName];
            } else {
                var newTableName = "rerunQuery" +
                                   randomQueryNum +
                                   Authentication.getHashId();
                translation[struct.tableName] = newTableName;
                struct.tableName = newTableName;
            }
        }

        function modifyValueArrayWithParameters(valArray, param) {
            for (var p in param) {
                var tValue = findTreeValueInValArrayByName(p, valArray);
                var struct = tValue.struct;
                for (var key in param[p]) {
                    var sub = param[p][key];
                    var keyArray = key.split(".");
                    var obj = struct;
                    for (var i = 0; i<keyArray.length; i++) {
                        if (keyArray[i] in obj) {
                            if (i === keyArray.length-1) {
                                obj[keyArray[i]] = sub;
                            } else {
                                obj = obj[keyArray[i]];
                            }
                        } else {
                            console.error("No such param!");
                            return (false);
                        }
                    }
                }
            }
            return (true);
        }

        if (doNotRun) {
            console.log("Sample Usage: ");
            console.log('DagFunction.runProcedureWithParams("yay#ar133",  ' +
                        '{"reviews1#ar132":{"evalStr":"add(stars, 2)"}, ' +
                        '"user#ar122":{"filterStr":"eq(fans, 8)"}})');
        }

        var paramNodes = Object.keys(param);

        var tableId = xcHelper.getTableId(tableName);
        if (!dagLineage[tableId]) {
            console.error("Your table is not active. Please make it active!");
            return;
        }
        var valueArray = getOrderedDedupedNodes(dagLineage[tableId].endPoints,
                                                "TreeValue");
        if (valueArray.length === 0) {
            console.info("There is nothing to rerun.");
            return;
        }
        for (var i = 0; i<valueArray.length; i++) {
            var struct = DagFunction.cloneDagNode(valueArray[i].inputName,
                                                  valueArray[i].struct);
            valueArray[i] = xcHelper.deepCopy(valueArray[i]);
            // ^ Just the above is not enough due to prototype methods in
            // the thrift structs
            valueArray[i].struct = struct;
        }

        if (!modifyValueArrayWithParameters(valueArray, param)) {
            return;
        }

        // Time to deep clone the tree. We cannot use deepCopy trick due to
        // constructor functions.
        var allEndPoints = [];
        var deepCopyTree = constructTree(valueArray[valueArray.length-1],
                                                    valueArray, {},
                                                    undefined, allEndPoints);
        if (!deepCopyTree) {
            console.info("Tree Empty!");
            return;
        }
        var treeNodeArray = getOrderedDedupedNodes(allEndPoints,
                             "TreeNode");
        if (treeNodeArray.length === 0) {
            console.info("Nothing to run!");
            return;
        }
        // Step 1. From deepCopied tree, get list of all xid for descendents of
        // start node (s)
        var startNodes = [];
        for (var i = 0; i<paramNodes.length; i++) {
            // Translate paramNodes from table names to nodes
            var xid = findXidByDstTableName(treeNodeArray, paramNodes[i]);
            if (xid === -1) {
                console.error("Parameterized table not found!");
                return;
            }
            // The following call cannot fail due to the previous call suceeding
            startNodes[i] = findTreeNodeInNodeArray(xid, treeNodeArray);
        }
        if (doNotRun) {
            console.log(startNodes);
            return;
        }

        var involvedXids = getAllXidFromStart(deepCopyTree, startNodes);
        if (involvedXids.length === 0) {
            console.info("No involved xids.");
            return;
        }
        // Step 2. Remove nodes from treeNodeArray that is not in involvedXids
        var treeNodesToRerun = [];
        for (var i = 0; i<treeNodeArray.length; i++) {
            if (treeNodeArray[i].value.dagNodeId in involvedXids) {
                treeNodesToRerun.push(treeNodeArray[i]);
            }
        }
        
        if (treeNodesToRerun.length === 0) {
            console.info("Nothing to rerun");
            return;
        }

        // Step 3. From start of treeNodeArray, start renaming all nodes
        var translation = {};
        var randomQueryNum = Math.ceil(Math.random()*10000);
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

            updateDestinationName(destTableStruct, translation, randomQueryNum);
        }

        var finalTreeValue = treeNodesToRerun[treeNodesToRerun.length-1].value;
        if (finalTreeValue.api === XcalarApisT.XcalarApiJoin) {
            finalTableName = finalTreeValue.struct.joinTable.tableName;
        } else {
            finalTableName = finalTreeValue.struct.dstTable.tableName;
        }
        var sql = {
            "operation": SQLOps.Query,
            "tableName": tableName,
            "tableId": tableId,
            "newTableName": finalTableName
        };
        var txId = Transaction.start({
            "msg": 'Rerun: ' + tableName,
            "operation": SQLOps.Query,
            "sql": sql,
            "steps": 1
        });
        xcHelper.lockTable(tableId, txId);
        getXcalarQueryCli(treeNodesToRerun)
        .then(concatAllCli)
        .then(function(entireString) {
            var queryName = "Rerun" + tableName +
                            Math.ceil(Math.random()*10000);
            return XcalarQueryWithCheck(queryName, entireString, txId);
        })
        .then(function() {
            console.log(finalTableName);
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql": sql
            });

            var worksheet = WSManager.getWSFromTable(tableId);
            xcHelper.unlockTable(tableId);
            TblManager.refreshTable([finalTableName],
                                    gTables[tableId].tableCols, [tableName],
                                    worksheet, txId);
        })
        .fail(function(error) {
            console.error(error);
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.StoredProcFailed,
                "error": error
            });
        });
    };

    function concatAllCli() {
        queryString = globalArray.join(";");
        console.log(queryString.replace(";", ";\n"));
        return (queryString);
    }

    function getXcalarQueryCli(orderedArray) {
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
        if (!node) {
            return; // xx temporarily muting
            console.error(valArray);
            console.error(alreadySeen);
            console.error(desc);
            console.error(endPoints);
            // debugger;
            return;
        }

        var treeNode = new TreeNode(null, null, node);
        if (node.api === XcalarApisT.XcalarApiJoin) {
            // Join
            leftOrigin = node.struct.leftTable.tableId;
            rightOrigin = node.struct.rightTable.tableId;
        } else if (node.api === XcalarApisT.XcalarApiBulkLoad ||
                   node.api === XcalarApisT.XcalarApiExecuteRetina) {
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
