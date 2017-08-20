window.DagFunction = (function($, DagFunction) {
    var dagLineage = {};
    var globalArray = []; // Place to store all the lines of xccli
    var TreeNode = function(value) {
        this.value = value;
        this.parents = [];
        this.children = [];
        return (this);
    };

    TreeNode.prototype = {
        getVisibleParents: function() {
            var parents = [];
            search(this);

            function search(node) {
                for (var i = 0; i < node.parents.length; i++) {
                    var parentNode = node.parents[i];
                    if (parentNode.value.display.isHiddenTag ||
                        parentNode.value.display.isHidden) {
                        search(parentNode);
                    } else {
                        parents.push(parentNode);
                    }
                }
            }
            return parents;
        },

        getSourceNames: function(excludeTags) {
            var parentNames = [];
            var node = this;

            if (excludeTags && node.value.display.tagHeader) {
                var parents = node.getVisibleParents();
                for (var i = 0; i < parents.length; i++) {
                    parentNames.push(parents[i].value.name);
                }
            } else {
                for (var i = 0; i < node.parents.length; i++) {
                    var parent = node.parents[i];
                    var parentName = parent.value.name;
                    parentNames.push(parentName);
                }
            }

            return parentNames;
        }
    };

    var TreeValue = function(api, struct, dagNodeId, inputName, name, numParents, tag, state) {
        this.api = api;
        this.struct = struct;
        this.dagNodeId = dagNodeId;
        this.inputName = inputName;
        this.name = name;
        this.numParents = numParents;
        this.tag = tag;
        this.state = state;
        this.display = {};
        return (this);
    };

    DagFunction.setup = function() {
        dagLineage = {};
    };

    DagFunction.construct = function(nodes, tableId) {
        var valArray = [];
        for (var i = 0; i < nodes.length; i++) {
            var apiString = XcalarApisTStr[nodes[i].api];
            var inputName = DagFunction.getInputType(apiString);
            var inputStruct = nodes[i].input[inputName];
            var dagNodeId = nodes[i].dagNodeId;
            var name = nodes[i].name.name;
            var numParents = nodes[i].numParent;
            var tag = nodes[i].tag;
            var state = nodes[i].state;

            // XXX this sometimes has an id of "0", why do we use this method?
            // if (nodes[i].api === XcalarApisT.XcalarApiBulkLoad) {
            //     dagNodeId = nodes[i].input.loadInput.dataset.datasetId;
            // }
            valArray.push(new TreeValue(nodes[i].api, inputStruct, dagNodeId,
                                    inputName, name, numParents, tag, state));
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
        lineageStruct.nodeIdMap = getIdMap(tree);
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
            WSManager.addNoSheetTables([tableId], wsId);
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
            if (tableType === TableType.Archived || tableType === "noSheet") {
                TableList.removeTable(tableId, TableType.Archived);
            }

            var $tableWrap = $('#xcTableWrap-' + newTableId).mousedown();
            Dag.focusDagForActiveTable();
            xcHelper.centerFocusedTable($tableWrap, true);

            Log.add(SQLTStr.RevertTable, {
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

        if (WSManager.getWSFromTable(tableId) == null || !gTables[tableId]) {
            tableType = TableType.Orphan;
        } else if (gTables[tableId].status === TableType.Orphan) {
            tableType = TableType.Orphan;
        } else {
            tableType = TableType.Archived;
        }

        return WSManager.moveInactiveTable(tableId, wsId, tableType);
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
        TblFunc.moveFirstColumn();
        Dag.focusDagForActiveTable(undefined, true);
    };

    // will always resolve
    // used after a transaction is complete and before constructing dag
    // finalTableId is optional
    DagFunction.tagNodes = function(txId, finalTableId) {
        return PromiseHelper.resolve(); // temporarily disabling tagging
        var deferred = jQuery.Deferred();
        var tables = QueryManager.getAllDstTables(txId, true);

        if (!tables.length) {
            return PromiseHelper.resolve();
        }

        var tagName = QueryManager.getQuery(txId).getName();
        var tId;
        if (finalTableId) {
            tId = finalTableId;
        } else {
            tId = xcHelper.getTableId(tables[0]);
        }
        if (tId) {
            tagName += "#" + tId;
        }
        tagName = tagName.replace(/ /g, "");
        retagIndexedTables(txId, tagName)
        .then(function() {
            return XcalarTagDagNodes(tagName, tables);
        })
        .then(function() {
            deferred.resolve({
                                tagName: tagName,
                                tables: tables
                             });
        })
        .fail(deferred.resolve);

        return deferred.promise();
    };

    // will always resolve
    // get indexed tables that were used but not logged in a transaction
    // and append tagName
    function retagIndexedTables(txId, tagName) {
        var deferred = jQuery.Deferred();
        var indexTables = QueryManager.getIndexTables(txId);
        var promises = [];
        for (var i = 0; i < indexTables.length; i++) {
            promises.push(XcalarGetDag(indexTables[i]));
        }

        PromiseHelper.when.apply(null, promises)
        .then(function() {
            var rets = arguments;
            promises = [];
            for (var i = 0; i < rets.length; i++) {
                var nodes = rets[i];
                if (nodes && nodes.node) {
                    var tag = nodes.node[0].tag;
                    var newTag;
                    if (tag) {
                        newTag = tag + "," + tagName;
                    } else {
                        newTag = tagName;
                    }
                    promises.push(XcalarTagDagNodes(newTag, indexTables[i]));
                }
            }
            PromiseHelper.when.apply(null, promises)
            .always(deferred.resolve);
        })
        .fail(deferred.resolve);

        return deferred.promise();
    }

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

    function findTreeValueInValArray(name, valArray) {
        for (var i = 0; i < valArray.length; i++) {
            if (valArray[i].name === name) {
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
        // Recursively go down the tree of all children until we hit the end
        // Returns list of all xids that we have seen in this traversal
        // This terminates due to the graph being a DAG
        function recurHelper(node, listSoFar) {
            listSoFar[node.value.dagNodeId] = 1; // We are only using the key
            for (var i = 0; i < node.parents.length; i++) {
                recurHelper(node.parents[i], listSoFar);
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
        // Step 1. From deepCopied tree, get list of all xid for children of
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
            workItem.input = new XcalarApiTableInputT();
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
            var allParentsPrinted = true;
            if ((node.parents[0] &&
                (printed.indexOf(node.parents[0]) === -1)) ||
                (node.parents[1] &&
                (printed.indexOf(node.parents[1]) === -1))) {
                allParentsPrinted = false;
            }
            if (allParentsPrinted) {
                printed.push(node);
                // Now add all parents of node to queue
                for (var i = 0; i < node.children.length; i++) {
                    if (queue.indexOf(node.children[i]) === -1) {
                        queue.push(node.children[i]);
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
            for (var i = 0; i < printed.length; i++) {
                printed[i] = printed[i].value;
            }
            return printed;
        } else {
            console.error("Invalid type");
            return [];
        }
    }

    function constructTree(node, valArray, alreadySeen, child, endPoints) {
        var parentTree = null;
        var parentNames = [];
        if (!node) {
            return; // xx temporarily muting
            console.error(valArray);
            console.error(alreadySeen);
            console.error(child);
            console.error(endPoints);
            return;
        }

        var treeNode = new TreeNode(node);
        if (node.numParents === 0) {
            endPoints.push(treeNode);
        } else if (node.api === XcalarApisT.XcalarApiJoin) {
            // Join
            parentNames.push(node.struct.leftTable.tableName);
            parentNames.push(node.struct.rightTable.tableName);
        } else if (node.api === XcalarApisT.XcalarApiIndex) {
            // Index
            parentNames.push(node.struct.source.name);
        } else {
            parentNames.push(node.struct.srcTable.tableName);
            if (node.numParents > 1) {
                var parsedParents;
                if (node.struct.evalStr) {
                    parsedParents = parseAggFromEvalStr(node.struct.evalStr);
                } else {
                    parsedParents =
                        parseAggFromEvalStrs(node.struct.evalStrs);
                }
                for (var i = 0; i < parsedParents.length; i++) {
                    parentNames.push(parsedParents[i]);
                }
            }
        }

        var parents = [];

        for (var i = 0; i < parentNames.length; i++) {
            var parentName = parentNames[i];
            if (parentName in alreadySeen) {
                parentTree = alreadySeen[parentName];
                parentTree.children.push(treeNode);
            } else {
                parentNode = findTreeValueInValArray(parentName, valArray);
                parentTree = constructTree(parentNode, valArray, alreadySeen,
                                            treeNode, endPoints);
            }
            parents.push(parentTree);
        }

        treeNode.parents = parents;

        if (child) {
            treeNode.children.push(child);
        }
        alreadySeen[node.name] = treeNode;
        return (alreadySeen[node.name]);
    }

    // cretes a map of dagNodIds: node
    function getIdMap(node) {
        var idMap = {};
        addToMap(node);

        function addToMap(node) {
            idMap[node.value.dagNodeId] = node;
            for (var i = 0; i < node.parents.length; i++) {
                if (!idMap[node.parents[i].value.dagNodeId]) {
                    addToMap(node.parents[i]);
                }
            }
        }
        return idMap;
    }

    function parseAggFromEvalStr(evalStr) {
        var tables = [];
        if (!evalStr) {
            return tables;
        }
        var func = {args: []};
        try {
            ColManager.parseFuncString(evalStr, func);
            tables = getAggNamesFromFunc(func);
        } catch (err) {
            console.error("could not parse eval str", evalStr);
        }
        return tables;
    }

    function parseAggFromEvalStrs(evalStrs) {
        var allTables = [];
        var tablesMap = {};
        if (!evalStrs) {
            return allTables;
        }
        for (var i = 0; i < evalStrs.length; i++) {
            var evalStr = evalStrs[i];
            var func = {args: []};
            var tables = [];
            try {
                ColManager.parseFuncString(evalStr, func);
                tables = getAggNamesFromFunc(func);
            } catch (err) {
                console.error("could not parse eval str", evalStr);
            }
            for (var j = 0; j < tables.length; j++) {
                tablesMap[tables] = true;
            }
        }
        for (var table in tablesMap) {
            allTables.push(table);
        }
        return allTables;
    }

    function getAggNamesFromFunc(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1 &&
                        args[i][0] === gAggVarPrefix &&
                        args[i].length > 1) {
                        names.push(args[i].slice(1));
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    return DagFunction;
}(jQuery, {}));
