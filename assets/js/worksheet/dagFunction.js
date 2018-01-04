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
                    } else { // may produce duplicate parents on purpose
                        parents.push(parentNode);
                    }
                }
            }
            return parents;
        },

        getVisibleChildren: function() {
            var children = [];
            search(this);

            function search(node) {
                for (var i = 0; i < node.children.length; i++) {
                    var childNode = node.children[i];
                    if (childNode.value.display.isHiddenTag ||
                        childNode.value.display.isHidden) {
                        search(childNode);
                    } else { // may produce duplicate children on purpose
                        children.push(childNode);
                    }
                }
            }
            return children;
        },

        getSourceNames: function(excludeTags) {
            var parentNames = [];
            var node = this;

            if (excludeTags && node.value.display.hasTagGroup) {
                var parents = node.getVisibleParents();
                for (var i = 0; i < parents.length; i++) {
                    parentNames.push(parents[i].value.name);
                }
            } else {
                for (var i = 0; i < node.parents.length; i++) {
                    var parent = node.parents[i];
                    parentNames.push(parent.value.name);
                }
            }

            return parentNames;
        },

        getTagSourceNames: function() {
            var parentNames = [];
            var node = this;

            if (node.value.display.hasTagGroup) {
                var parents = [];
                search(node);

                function search(node) {
                    for (var i = 0; i < node.parents.length; i++) {
                        var parentNode = node.parents[i];
                        if (parentNode.value.display.isInTagGroup ||
                            parentNode.value.display.isHidden) {
                            search(parentNode);
                        } else { // may produce duplicate parents on purpose
                            parents.push(parentNode);
                        }
                    }
                }
                for (var i = 0; i < parents.length; i++) {
                    parentNames.push(parents[i].value.name);
                }
            } else {
                for (var i = 0; i < node.parents.length; i++) {
                    var parent = node.parents[i];
                    parentNames.push(parent.value.name);
                }
            }

            return parentNames;
        },

        getNonIndexSourceNames: function() {
            var parentNames = [];
            var node = this;

            search(node);

            function search(node) {
                for (var i = 0; i < node.parents.length; i++) {
                    if (node.parents[i].value.api !== XcalarApisT.XcalarApiIndex ||
                        node.parents[i].value.struct.source.indexOf(gDSPrefix) ===
                        0) {
                        parentNames.push(node.parents[i].value.name);
                    } else {
                        search(node.parents[i]);
                    }
                }
            }

            return parentNames;
        },

        getAllAncestorNodes: function() {
            var node = this;
            var ancestors = [];
            var seen = {};

            search(node);
            function search(node) {
                for (var i = 0; i < node.parents.length; i++) {
                    if (seen[node.parents[i].value.name]) {
                        continue;
                    }
                    seen[node.parents[i].value.name] = true;
                    ancestors.push(node.parents[i]);
                    search(node.parents[i]);
                }
            }

            return ancestors;
        },

        getAllDescendantNodes: function() {
            var node = this;
            var descendants = [];
            var seen = {};

            search(node);
            function search(node) {
                for (var i = 0; i < node.children.length; i++) {
                    if (seen[node.children[i].value.name]) {
                        continue;
                    }
                    seen[node.children[i].value.name] = true;
                    descendants.push(node.children[i]);
                    search(node.children[i]);
                }
            }

            return descendants;
        }
    };

    var TreeValue = function(api, struct, dagNodeId, inputName, name,
                             numParents, tag, comment, state) {
        this.api = api;
        this.struct = struct;
        this.dagNodeId = dagNodeId;
        this.inputName = inputName;
        this.name = name;
        this.numParents = numParents;
        this.indexedFields = [];
        this.tag = tag;
        this.tags = [];
        this.comment = comment;
        this.state = state;
        this.display = {};
        this.exportNode = null; // reference to export node if it has one
        return (this);
    };

    DagFunction.setup = function() {
        dagLineage = {};
    };

    DagFunction.construct = function(nodes, tableId) {
        var valArray = [];
        var startPoints = [];
        for (var i = 0; i < nodes.length; i++) {
            var apiString = XcalarApisTStr[nodes[i].api];
            var inputName = DagFunction.getInputType(apiString);
            var inputStruct = nodes[i].input[inputName];
            var dagNodeId = nodes[i].dagNodeId;
            var name = nodes[i].name.name;
            var numParents = nodes[i].numParent;
            var tag = nodes[i].tag;
            var comment = nodes[i].comment;
            var state = nodes[i].state;
            var treeNode = new TreeValue(nodes[i].api, inputStruct, dagNodeId,
                                    inputName, name, numParents, tag, comment, state);
            valArray.push(treeNode);
            if (nodes[i].api === XcalarApisT.XcalarApiExport && i !== 0) {
                startPoints.push(treeNode);
            }
        }
        var allEndPoints = [];
        var lineageStruct = {};
        var trees = [];
        var alreadySeen = {};
        var tree = constructTree(valArray[0], valArray, alreadySeen, null,
                                 allEndPoints);

        if (!tree) {
            console.info("No creatable tree");
            return;
        }
        trees.push(tree);

        for (var i = 0; i < startPoints.length; i++) {
            tree = constructTree(startPoints[i], valArray, alreadySeen, null,
                                 allEndPoints);
            trees.push(tree);
        }

        var nodeIdMap = getIdMap(trees);

        // move main treeNode to the front
        var mainTreeIndex = getIndexOfFullTree(trees);

        tree = trees[mainTreeIndex];
        trees.splice(mainTreeIndex, 1);
        trees.splice(0, 0, tree);
        var sets = getSets(trees);

        setIndexedFields(sets);

        lineageStruct.tree = tree;
        lineageStruct.trees = trees;
        lineageStruct.sets = sets;
        lineageStruct.endPoints = allEndPoints;
        lineageStruct.orderedPrintArray = getOrderedDedupedNodes(allEndPoints,
                                          "TreeNode");
        lineageStruct.nodeIdMap = nodeIdMap;
        if (tableId) {
            dagLineage[tableId] = lineageStruct;
        }
        return lineageStruct;
    };

    DagFunction.getAggsFromEvalStrs = function(evalStrs) {
        var allTables = [];
        // var tablesMap = {};
        if (!evalStrs) {
            return allTables;
        }
        for (var i = 0; i < evalStrs.length; i++) {
            var evalStr = evalStrs[i].evalString;
            var tables = [];
            try {
                var func = ColManager.parseFuncString(evalStr);
                tables = getAggNamesFromFunc(func);
            } catch (err) {
                console.error("could not parse eval str", evalStr);
            }
            for (var j = 0; j < tables.length; j++) {
                if (allTables.indexOf(tables[j]) === -1) {
                    allTables.push(tables[j]);
                }
            }
        }
        return allTables;
    };

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
    // only being used for group by
    function setIndexedFields(sets) {
        var seen = {};
        for (var i = 0; i < sets.length; i++) {
            var tree = sets[i];
            search(tree);
        }

        function search(node) {
            if (seen[node.value.name]) {
                return;
            }
            seen[node.value.name] = true;
            if (node.value.api === XcalarApisT.XcalarApiGroupBy) {
                node.value.indexedFields = getIndexedFields(node);
            } else if (node.value.api === XcalarApisT.XcalarApiJoin) {
                node.value.indexedFields = getJoinIndexedFields(node);
            }
            for (var i = 0; i < node.parents.length; i++) {
                search(node.parents[i]);
            }
        }
    }

    function getIndexedFields(node) {
        var cols = [];
        search(node);
        function search(node) {
            // if parent node is join, it's indexed by left parent, ignore right
            var numParents = Math.min(node.parents.length, 1);
            for (var i = 0; i < numParents; i++) {
                var parentNode = node.parents[i];
                if (parentNode.value.api === XcalarApisT.XcalarApiIndex) {
                    cols = parentNode.value.struct.key.map(function(key) {
                        return key.name;
                    });
                    return cols;
                } else {
                    search(parentNode);
                }
            }
        }

        return cols;
    }

    function getJoinIndexedFields(node) {
        var cols = {left: [], right: []};
        search(node.parents[0], true);
        search(node.parents[1]);

        function search(node, isLeft) {
            if (node.value.api === XcalarApisT.XcalarApiIndex) {
                var keys = node.value.struct.key.map(function(key) {
                    return key.name;
                });
                if (isLeft) {
                    cols.left = keys;
                } else {
                    cols.right = keys;
                }
                return;
            }
            // if parent node is join, it's indexed by left parent, ignore right
            var numParents = Math.min(node.parents.length, 1);
            for (var i = 0; i < numParents; i++) {
                search(node.parents[i], isLeft);
            }
        }

        return cols;
    }


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
            return (null);
        }
    };

    DagFunction.printDagCli = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        // var toPrint;
        // var deferred = jQuery.Deferred();
        if (dagLineage[tableId]) {
            getXcalarQueryCli(dagLineage[tableId].orderedPrintArray);
        } else {
            XcalarGetDag(tableName)
            .then(function(dagOutput) {
                var outStruct = DagFunction.construct(dagOutput);
                getXcalarQueryCli(outStruct.orderedPrintArray);
            });
        }
    };

    DagFunction.cloneDagNode = function(inputName, origInputStruct) {
        // We are looking for something like XcalarApiBLAHInputT
        var structName = getConstructorName(inputName);
        var newStruct = {};
        try {
            // XXX Once we have a nice clean interface from the backend
            // we can algorithmically generate this rather than use eval
            newStruct = eval("new " + structName);
        } catch (error) {
            console.error(error);
            console.error("Constructor doesn't eval to any known struct! " +
                          structName);
            return;
        }

        function getConstructorName(inputName) {
            var input = inputName.substr(0, inputName.length - 5);
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
            consName = "XcalarApi" + consName + "InputT()";

            return (consName);
        }

        return (jQuery.extend(true, newStruct, origInputStruct));
    };

    // oldTableName is a descendant/parent
    DagFunction.revertTable = function(tableId, newTableName, oldTableName) {
        var tableType = TableType.Orphan;
        var oldTableId = xcHelper.getTableId(oldTableName);
        var wsId = WSManager.getWSFromTable(oldTableId);
        var oldTableNames = [];
        if (oldTableName) {
            oldTableNames.push(oldTableName);
        }
        xcHelper.lockTable(tableId);
        xcHelper.lockTable(oldTableId);
        TblManager.refreshTable([newTableName], null, oldTableNames, wsId,
                                null)
        .then(function() {
            xcHelper.unlockTable(tableId);
            xcHelper.unlockTable(oldTableId);
            var newTableId = xcHelper.getTableId(newTableName);

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
                "worksheet": wsId,
                "worksheetIndex": WSManager.indexOfWS(wsId),
                "htmlExclude": ["tableType", "oldTableName", "worksheet",
                                "worksheetIndex"]
            });
        });
    };

    DagFunction.addTable = function(tableId) {
        var deferred = jQuery.Deferred();
        var wsId = WSManager.getActiveWS();
        var tableType = TableType.Orphan;

        WSManager.moveTemporaryTable(tableId, wsId, tableType)
        .then(function() {
            DFCreateView.updateTables(tableId);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    };

    DagFunction.focusTable = function(tableId) {
        var $dagPanel = $('#dagPanel');
        var wsId = WSManager.getWSFromTable(tableId);
        if (!wsId) {
            console.error('Cannot focus table due to no worksheet!');
            return;
        }

        var $wsListItem = $('#worksheetTab-' + wsId);
        if ($wsListItem.hasClass("hiddenTab")) {
            $wsListItem.find(".unhide").click();
        } else {
            $wsListItem.trigger(fakeEvent.mousedown);
        }

        if ($dagPanel.hasClass('full')) {
            $('#dagPulloutTab').click();
        }
        var $tableWrap = $('#xcTableWrap-' + tableId);
        xcHelper.centerFocusedTable($tableWrap);
        $tableWrap.mousedown();
        TblFunc.moveFirstColumn();
        Dag.focusDagForActiveTable(null, true);
    };


    // will always resolve
    // used after a transaction is complete and before constructing dag
    // finalTableId is optional
    DagFunction.tagNodes = function(txId, finalTableId) {
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

    function findTreeValueInValArray(name, valArray) {
        for (var i = 0; i < valArray.length; i++) {
            if (valArray[i].name === name) {
                return (valArray[i]);
            }
        }
    }

    function findTreeNodeInNodeArray(name, nodeArray) {
        for (var i = 0; i < nodeArray.length; i++) {
            if (nodeArray[i].value.name === name) {
                return (nodeArray[i]);
            }
        }
    }

    function getAllNamesFromStart(tree, startTreeNodes) {
        // Recursively go down the tree of all children until we hit the end
        // Returns list of all xids that we have seen in this traversal
        // This terminates due to the graph being a DAG
        var mapOfNames = {};
        for (var i = 0; i < startTreeNodes.length; i++) {
            recurHelper(startTreeNodes[i], mapOfNames);
        }

        return mapOfNames;

        function recurHelper(node, mapSoFar) {
            mapSoFar[node.value.name] = true; // We are only using the key
            for (var i = 0; i < node.children.length; i++) {
                recurHelper(node.children[i], mapSoFar);
            }
        }
    }

    function getNonInvolvedRerunNames(tree, startTreeNodes) {
        var seen = {};
        var mapOfNames = {};
        for (var i = 0; i < startTreeNodes.length; i++) {
            search(startTreeNodes[i]);
        }

        return mapOfNames;

        function search(node) {
            if (seen[node.value.name]) {
                return;
            }
            seen[node.value.name] = true;
            for (var i = 0; i < node.parents.length; i++) {
                mapOfNames[node.parents[i].value.name] = node.parents[i].value;
                search(node.parents[i]);
            }
        }
    }

    // function searchTreeForName(tree, name) {
    //     var foundNode;
    //     search(tree);
    //     function search(node) {
    //         if (node.value.name === name) {
    //             foundNode = node;
    //             return;
    //         }
    //         for (var i = 0; i < node.parents.length; i++) {
    //             if (!foundNode) {
    //                 search(node.parents[i]);
    //             } else {
    //                 break;
    //             }
    //         }
    //     }
    //     return foundNode;
    // }

    // if a startNode has a dropped parent, we need to search all of its parents
    // until we find one that is not dropped and add it to the startNodes list
    function includeDroppedNodesInStartNodes(startNodes) {
        var seen = {};
        for (var i = 0; i < startNodes.length; i++) {
            var node = startNodes[i];
            var parents = node.parents;
            for (var j = 0; j < parents.length; j++) {
                if (parents[j].value.state !== DgDagStateT.DgDagStateReady) {
                    findNonDroppedParent(parents[j], node);
                }
            }
        }

        function findNonDroppedParent(node, child) {
            if (seen[node.value.name]) {
                return;
            }
            seen[node.value.name] = true;
            if (node.value.state === DgDagStateT.DgDagStateReady) {
                startNodes.push(child);
                return;
            }
            for (var i = 0; i < node.parents.length; i++) {
                findNonDroppedParent(node.parents[i], node);
            }
        }
    }

    function modifyAggParents(node) {
        if (node.api === XcalarApisT.XcalarApiMap ||
            node.api === XcalarApisT.XcalarApiFilter) {
            var aggSources = DagFunction.getAggsFromEvalStrs(node.struct.eval);
            for (var i = 0; i < aggSources.length; i++) {
                if (node.aggSources.indexOf(aggSources[i]) === -1) {
                    aggSources.splice(i, 1);
                    i--;
                }
            }
            node.numParents = aggSources.length + 1;
            node.aggSources = aggSources;
        }
    }

    // DagFunction.runProcedureWithParams("students#p7304", {"students#p7303":{"eval": [{"evalString":"eq(students::student_id, 2)","newField":""}]}})
    DagFunction.runProcedureWithParams = function(tableName, params, newNodes, doNotRun) {
        // XXX need to handle old struct format
        if (doNotRun) {
            console.log("Sample Usage: ");
            console.log('DagFunction.runProcedureWithParams("yay#ar133",  ' +
                        '{"reviews1#ar132":{"evalStr":"add(stars, 2)"}, ' +
                        '"user#ar122":{"filterStr":"eq(fans, 8)"}})');
            console.log("schedule1#kU683", {"schedule1#kU682": {"eval": [{"evalString": "eq(schedule1::class_id, 2)","newField": ""}]}});
        }

        var paramNodes = Object.keys(params);

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
        for (var i = 0; i < valueArray.length; i++) {
            var struct = DagFunction.cloneDagNode(valueArray[i].inputName,
                                                  valueArray[i].struct);
            valueArray[i] = xcHelper.deepCopy(valueArray[i]);
            // ^ Just the above is not enough due to prototype methods in
            // the thrift structs
            valueArray[i].struct = struct;
            modifyAggParents(valueArray[i]);
        }

        if (!modifyValueArrayWithParameters(valueArray, params)) {
            return;
        }

        // create new index nodes into valueArray and modify it's child node
        var newNodesArray = [];
        insertNewNodesIntoValArray(newNodes, valueArray, newNodesArray);

        // Time to deep clone the tree. We cannot use deepCopy trick due to
        // constructor functions.
        var allEndPoints = [];
        var deepCopyTree = constructTree(valueArray[valueArray.length - 1],
                                                    valueArray, {},
                                                    null, allEndPoints);
        if (!deepCopyTree) {
            console.info("Tree Empty!");
            return;
        }

        var treeNodeArray = getOrderedDedupedNodes(allEndPoints, "TreeNode");
        if (treeNodeArray.length === 0) {
            console.info("Nothing to run!");
            return;
        }
        // Step 1. From deepCopied tree, get list of all xid for children of
        // start node (s)
        var startNodes = [];
        for (var i = 0; i < paramNodes.length; i++) {
            var newTreeNode = findTreeNodeInNodeArray(paramNodes[i], treeNodeArray);
            if (newTreeNode) {
                startNodes.push(newTreeNode);
            }
        }

        for (var i = 0; i < newNodesArray.length; i++) {
            var newTreeNode = findTreeNodeInNodeArray(newNodesArray[i], treeNodeArray);
            newTreeNode.value.tag = newTreeNode.children[0].value.tag;
            newTreeNode.value.tags = newTreeNode.value.tag.split(",");
            startNodes.push(newTreeNode);
        }

        if (doNotRun) {
            console.log(startNodes);
            return;
        }

        includeDroppedNodesInStartNodes(startNodes);

        var involvedNames = getAllNamesFromStart(deepCopyTree, startNodes);
        if (involvedNames.length === 0) {
            console.info("No involved xids.");
            return;
        }
        // returns map of name : value
        var nonInvolvedNames = getNonInvolvedRerunNames(deepCopyTree, startNodes);

        // Step 2. Remove nodes from treeNodeArray that is not in involvedNames
        var treeNodesToRerun = [];
        for (var i = 0; i < treeNodeArray.length; i++) {
            if (treeNodeArray[i].value.name in involvedNames) {
                treeNodesToRerun.push(treeNodeArray[i]);
            }
        }

        if (treeNodesToRerun.length === 0) {
            console.info("Nothing to rerun");
            return;
        }

        // Step 3. From start of treeNodeArray (left side of the graph), start renaming all nodes
        var translation = {};
        var tagHeaders = {}; // will store a map {tag#oldId: tag#newId}
        var aggRenames = {};
        for (var i = 0; i < treeNodesToRerun.length; i++) {
            var destTableValue = treeNodesToRerun[i].value;

            if (i > 0) {
                updateSourceName(destTableValue, translation);
            }

            updateDestinationName(destTableValue, translation, tagHeaders, aggRenames);
        }

        for (var i = 0; i < treeNodesToRerun.length; i++) {
            var value = treeNodesToRerun[i].value;
            if (value.api === XcalarApisT.XcalarApiMap ||
                value.api === XcalarApisT.XcalarApiFilter) {
                for (var j = 0; j < value.struct.eval.length; j++) {
                    var func = ColManager.parseFuncString(value.struct.eval[j].evalString);
                    replaceFuncStr(func, aggRenames);
                    var newEval = xcHelper.stringifyFunc(func);
                    value.struct.eval[j].evalString = newEval;
                }
            }
        }

        var finalTreeValue = treeNodesToRerun[treeNodesToRerun.length - 1].value;
        var finalTableName = finalTreeValue.struct.dest;

        // store the old tags so we can replace and add back with no tags after
        // query is run
        var nameToTagsMap = {};
        for (var i = 0; i < treeNodesToRerun.length; i++) {
            nameToTagsMap[treeNodesToRerun[i].value.struct.dest] = treeNodesToRerun[i].value.tags;
        }

        var commentsToNamesMap = {};
        for (var i = 0; i < treeNodesToRerun.length; i++) {
            var comment = treeNodesToRerun[i].value.comment;
            if (comment) {
                if (!commentsToNamesMap[comment]) {
                    commentsToNamesMap[comment] = [];
                }
                commentsToNamesMap[comment].push(
                                        treeNodesToRerun[i].value.struct.dest);
            }
        }

        var sql = {
            "operation": SQLOps.DFRerun,
            "tableName": tableName,
            "tableId": tableId,
            "newTableName": finalTableName
        };
        var txId = Transaction.start({
            "msg": 'Rerun: ' + tableName,
            "operation": SQLOps.DFRerun,
            "sql": sql,
            "steps": 1
        });

        var entireString =  getXcalarQueryCli(treeNodesToRerun);
        xcHelper.lockTable(tableId, txId);

        var queryName = "Rerun" + tableName + Math.ceil(Math.random() * 10000);
        var finalTableId = xcHelper.getTableId(finalTableName);

        $("#dagWrap-" + tableId).addClass("rerunning");
        var queryPassed = false;

        XcalarQueryWithCheck(queryName, entireString, txId)
        .then(function() {
            queryPassed = true;
            return tagNodesAfterEdit(nameToTagsMap, tagHeaders,
                                     nonInvolvedNames);
        })
        .then(function() {
            return recommentAfterEdit(commentsToNamesMap);
        })
        .then(function() {
            DagEdit.clearEdit();
            return setColumnsAfterEdit(finalTableName, gTables[tableId]);
        })
        .then(function(cols) {
            var worksheet = WSManager.getWSFromTable(tableId);
            return TblManager.refreshTable([finalTableName], cols, [tableName],
                                    worksheet, txId, {noTag: true,
                                        focusWorkspace: true});
        })
        .then(function() {
            xcHelper.unlockTable(tableId, txId);
            Transaction.done(txId, {
                "msgTable": xcHelper.getTableId(finalTableName),
                "sql": sql
            });
        })
        .fail(function(error) {
            xcHelper.unlockTable(tableId, txId);

            var noAlert;
            if (!queryPassed && DagEdit.checkCanRestore(tableId)) {
                noAlert = true;
                var msg;
                if (typeof error === "object") {
                    // if it's an try/catch error, code will also goes here
                    msg = error.error || AlertTStr.ErrorMsg;
                } else {
                    msg = error;
                }
                if (msg === undefined) {
                    msg = "Error: " + StatusMessageTStr.RerunFailed;
                }

               msg = "Would you like to try editing this dataflow?<br/>" + msg;

                Alert.error(StatusMessageTStr.RerunFailed, msg, {
                    buttons: [{
                        name: "EDIT",
                        func: function() {
                            DagEdit.restore(tableId);
                        }
                    }],
                    onCancel: function() {
                        DagEdit.off(null, true);
                    },
                    "msgTemplate": msg
                });
            } else {
                noAlert = false;
                DagEdit.off(null, true);
            }
            Transaction.fail(txId, {
                "failMsg": StatusMessageTStr.RerunFailed,
                "error": error,
                "noAlert": noAlert
            });
            $("#dagWrap-" + tableId).removeClass("rerunning");
        });

        function updateSourceName(value, translation) {
            var struct = value.struct;
            if ("source" in struct) {
                if (typeof struct.source === "string") {
                    if (translation[struct.source]) {
                        struct.source = translation[struct.source];
                    }
                } else {
                    for (var i = 0; i < struct.source.length; i++) {
                        if (translation[struct.source[i]]) {
                            struct.source[i] = translation[struct.source[i]];
                        }
                    }
                }
            }
        }

        function updateDestinationName(value, translation, tagHeaders, aggRenames) {
            if (value.struct.dest in translation) {
                value.struct.dest = translation[value.struct.dest];
            } else {
                var tableName = xcHelper.getTableName(value.struct.dest);
                var oldId = xcHelper.getTableId(value.struct.dest);
                var newId = Authentication.getHashId();
                var newTableName = tableName + newId;

                for (var i = 0; i < value.tags.length; i++) {
                    if (xcHelper.getTableId(value.tags[i]) === oldId) {
                        tagHeaders[value.tags[i]] = xcHelper.getTableName(value.tags[i]) + newId;
                    }
                }

                if (value.api === XcalarApisT.XcalarApiAggregate) {
                    aggRenames[gAggVarPrefix + value.struct.dest] = gAggVarPrefix + newTableName;
                } else {
                    translation[value.struct.dest] = newTableName;
                }

                value.struct.dest = newTableName;
            }
        }

        function modifyValueArrayWithParameters(valArray, params) {
            for (var p in params) {
                var tValue = findTreeValueInValArray(p, valArray);
                var struct = tValue.struct;
                var param = params[p];
                for (var key in param) {
                    var sub = param[key];
                    var keyArray = key.split(".");
                    var obj = struct;
                    for (var i = 0; i < keyArray.length; i++) {
                        if (keyArray[i] in obj) {
                            if (i === keyArray.length - 1) {
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
    };

    // for new index nodes
    function insertNewNodesIntoValArray(newNodes, valueArray, newNodesArray) {
        for (var name in newNodes) {
            var indexNodes = newNodes[name];
            for (var i = 0; i < indexNodes.length; i++) {
                var indexNode = indexNodes[i];
                var struct = new XcalarApiIndexInputT();
                struct.broadcast = false;
                struct.delaySort = false;
                struct.dhtName = "";
                struct.key = indexNode.keys;
                struct.prefix = ""; // XXX check what to use here
                struct.source = indexNode.src;
                struct.dest = xcHelper.getTableName(indexNode.src) + ".index" +
                              Authentication.getHashId();

                var node = new TreeValue(XcalarApisT.XcalarApiIndex, struct, 0,
                                    'indexInput',
                                    struct.dest, 1, "", DgDagStateT.DgDagStateReady);
                var dest;
                for (var j = 0; j < valueArray.length; j++) {
                    if (valueArray[j].name === name) {
                        dest = valueArray[j];
                        break;
                    }
                }
                if (typeof dest.struct.source === "string") {
                    dest.struct.source = struct.dest;
                } else {
                    for (var j = 0; j < dest.struct.source.length; j++) {
                        if (dest.struct.source[j] === struct.source) {
                            dest.struct.source[j] = struct.dest;
                        }
                    }
                }

                valueArray.unshift(node);
                newNodesArray.push(struct.dest);
            }
        }
    }

    function recommentAfterEdit(commentsToNamesMap) {
        var deferred = jQuery.Deferred();
        var promises = [];

        for (var comment in commentsToNamesMap) {
            var tables = commentsToNamesMap[comment];
            promises.push(XcalarCommentDagNodes(comment, tables));
        }

        PromiseHelper.when.apply(null, promises)
        .always(deferred.resolve);

        return deferred.promise();
    }

    function tagNodesAfterEdit(nameToTagsMap, tagHeaders, nonInvolvedNames) {
        //tagHeaders {tag#oldId: tag#newId}
        // nameToTagsMap {newTableName: [tag#oldId, otherTag#oldId2]}
        // nonInvolvedNames {oldTableName: valueStruct}
        var tagMap = {};
        var newTag;
        for (var name in nameToTagsMap) {
            newTag = "";
            var oldTags = nameToTagsMap[name];
            for (var i = 0; i < oldTags.length; i++) {
                var tag = tagHeaders[oldTags[i]];
                if (tag) {
                    if (newTag) {
                        newTag += ",";
                    }
                    newTag += tag;
                }
            }
            if (newTag) {
                if (!tagMap[newTag]) {
                    tagMap[newTag] = [];
                }
                tagMap[newTag].push(name);
            }
        }
        for (var name in nonInvolvedNames) {
            newTag = nonInvolvedNames[name].tag;
            var hasChange = false;
            for (var i = 0; i < nonInvolvedNames[name].tags.length; i++) {
                var tag = nonInvolvedNames[name].tags[i];
                if (tagHeaders[tag]) {
                    newTag += "," + tagHeaders[tag];
                    hasChange = true;
                }
            }
            if (hasChange) {
                if (!tagMap[newTag]) {
                    tagMap[newTag] = [];
                }
                tagMap[newTag].push(name);
            }
        }

        var deferred = jQuery.Deferred();
        var promises = [];
        for (var tag in tagMap) {
            promises.push(XcalarTagDagNodes(tag, tagMap[tag]));
        }
        PromiseHelper.when.apply(null, promises)
        .always(deferred.resolve);

        return deferred.promise();
    }

    function getXcalarQueryCli(orderedArray) {
        globalArray = [];

        for (var i = 0; i < orderedArray.length; i++) {
            var query = {
                "operation": XcalarApisTStr[orderedArray[i].value.api],
                "args": orderedArray[i].value.struct
            };
            globalArray.push(query);
        }
        return JSON.stringify(globalArray);
    }

    // function populateGlobalArray(workItem) {
    //     return (XcalarGetQuery(workItem)
    //         .then(function(queryStr) {
    //             globalArray.push(queryStr);
    //         }));
    // }

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
            parentNames.push(node.struct.source[0]);
            parentNames.push(node.struct.source[1]);
        } else if (node.api === XcalarApisT.XcalarApiUnion) {
            // union
            node.struct.source.forEach(function(src) {
                parentNames.push(src);
            });
        } else if (node.api === XcalarApisT.XcalarApiIndex) {
            // Index
            parentNames.push(node.struct.source);
        } else {
            parentNames.push(node.struct.source);
            if (node.numParents > 1) {
                var parsedParents = [];
                if (node.struct.eval) {
                    if (node.aggSources) {
                        parsedParents = node.aggSources;
                    } else {
                        parsedParents = DagFunction.getAggsFromEvalStrs(node.struct.eval);
                        if (parsedParents.length) {
                            node.aggSources = parsedParents;
                        }
                    }
                } else {
                    console.error("unexpected struct, could not find srsc tables");
                    console.error(node.struct);
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
                if (treeNode.value.api === XcalarApisT.XcalarApiExport) {
                    parentTree.value.exportNode = treeNode;
                }
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
            if (child.value.api === XcalarApisT.XcalarApiExport) {
                treeNode.value.exportNode = child;
            }
        }
        alreadySeen[node.name] = treeNode;
        return (alreadySeen[node.name]);
    }

    // cretes a map of dagNodIds: node
    function getIdMap(trees) {
        var idMap = {};
        for (var i = 0; i < trees.length; i++) {
            addToMap(trees[i]);
        }

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

    // for multiple exports, finds the real root
    function getIndexOfFullTree(trees) {
        if (trees.length === 1) {
            return 0;
        }
        // assumes all the root nodes are exports
        for (var i = 0; i < trees.length; i++) {
            var exportSrc = trees[i].parents[0];
            if (exportSrc.children.length === 1) {
                return i;
            }
        }

        return 0;
    }

    function getSets(trees) {
        var sets = [trees[0]];
        if (trees.length > 1) {
            for (var i = 1; i < trees.length; i++) {
                var exportSrc = trees[i].parents[0];
                if (exportSrc.children.length === 1) {
                    sets.push(trees[i]);
                }
            }
        }
        return sets;
    }

    // remove immediates that are not present in the new table, add new immediates
    // immediates that are present in before and after will change user string
    // to pull instead of map
    function setColumnsAfterEdit(finalTableName, table) {
        var deferred = jQuery.Deferred();
        var progCols = table.tableCols;

        XcalarGetTableMeta(finalTableName)
        .then(function(tableMeta) {
            var newCols = [];

            var values = tableMeta.valueAttrs;
            var immediates = {};
            var prefixes = {};
            var isDATAColLast = false;
            for (var i = 0; i < values.length; i++) {
                if (values[i].type === DfFieldTypeT.DfFatptr) {
                    prefixes[values[i].name] = true;
                } else {
                    immediates[values[i].name] = {used: false};
                }
            }

            for (var i = 0; i < progCols.length; i++) {
                if (progCols[i].prefix) {
                    if (prefixes[progCols[i].prefix]) {
                        newCols.push(ColManager.newCol(progCols[i]));
                    }
                } else {
                    if (progCols[i].isDATACol()) {
                        newCols.push(ColManager.newCol(progCols[i]));
                        if (i === progCols.length - 1) {
                            isDATAColLast = true;
                        }
                    } else if (immediates[progCols[i].name]) {
                        var newProgCol = ColManager.newCol(progCols[i]);
                        newProgCol.userStr = '"' + progCols[i].name + '" = pull(' + progCols[i].name + ')';
                        newCols.push(newProgCol);
                        immediates[progCols[i].name].used = true;
                    }
                }
            }

            if (table.backTableMeta) {
                var prevValues = table.backTableMeta.valueAttrs;
                for (var i = 0; i < prevValues.length; i++) {
                    if (prevValues[i].type !== DfFieldTypeT.DfFatptr) {
                        if (immediates[prevValues[i].name]) {
                            immediates[prevValues[i].name].used = true;
                        }
                    }
                }
            }

            for (var name in immediates) {
                var immediate = immediates[name];
                if (!immediate.used) {
                    var newProgCol = ColManager.newCol({
                        "backName": name,
                        "name": name,
                        "isNewCol": false,
                        "sizedTo": "header",
                        "width": xcHelper.getDefaultColWidth(name),
                        "userStr": '"' + name + '" = pull(' + name + ')'
                    });
                    if (isDATAColLast) {
                        newCols.splice(newCols.length - 1, 0, newProgCol);
                    } else {
                        newCols.push(ColManager.newCol(newProgCol));
                    }
                }
            }

            deferred.resolve(newCols);
        })
        .fail(function() {
            // just use original columns
            deferred.resolve(progCols);
        });
        return deferred.promise();
    }

    function replaceFuncStr(func, aggRenames) {
        for (var i = 0; i < func.args.length; i++) {
            var arg = func.args[i];
            if (typeof arg === "object") {
                replaceFuncStr(arg, aggRenames);
            } else {
                if (aggRenames[arg]) {
                    func.args[i] = aggRenames[arg];
                }
            }
        }
    }

    return DagFunction;
}(jQuery, {}));
