(function() {
    var root = this;

    function SQLOptimizer() {
        this.aggregateNameMap = {}; // Depends on how the graph looks like (link from agg node to others or not)
        this.nodeHashMap = {};
        this.aggregates = [];
        return this;
    }

    SQLOptimizer.prototype = {
        logicalOptimize: function(queryString, options, prependQueryString) {
            let opArray;
            let prepArray;
            let opGraph;
            this.aggregateNameMap = {};
            this.nodeHashMap = {};
            try {
                opArray = JSON.parse(queryString);
                if (prependQueryString) {
                    prepArray = JSON.parse(prependQueryString);
                }
                // First traversal - build operator graph
                // the queryString is in mix order of BFS & DFS :(
                const opIdxMap = {};
                for (let i = 0; i < opArray.length; i++) {
                    opIdxMap[opArray[i].args.dest] = i;
                    addAggSource(opArray[i]);
                }
                for (let i = 0; i < prepArray.length; i++) {
                    addAggSource(prepArray[i]);
                }
                opGraph  = genOpGraph(opArray, opArray.length - 1,
                                                                  opIdxMap, {});
            } catch (e) {
                if (typeof SQLOpPanel !== "undefined") {
                    SQLUtil.throwError(e);
                }
                throw e;
            }

            // add synthesize to get minimum number of columns before prepending
            this.addMinSynthesize(opGraph);

            // Second (optional) traversal - add prepended operators to the correct place
            if (prepArray) {
                const prepIdxMap = {};
                for (let i = 0; i < prepArray.length; i++) {
                    prepIdxMap[prepArray[i].args.dest] = i;
                    if (prepArray[i].operation === "XcalarApiSynthesize") {
                        for (let j = 0; j < prepArray[i].args.columns.length; j++) {
                            if (prepArray[i].args.columns[j].destColumn !=
                                prepArray[i].args.columns[j].destColumn.toUpperCase()) {
                                prepArray[i].args.columns[j].destColumn =
                                prepArray[i].args.columns[j].destColumn.toUpperCase();
                                console.error("Lower case column found: " +
                                        prepArray[i].args.columns[j].destColumn);
                            }
                        }
                    }
                }
                const visitedMap = {};
                var nodesNeedReorder = [];
                insertOperators(opGraph, prepArray, prepIdxMap,
                                visitedMap, nodesNeedReorder);
                const nodeMap = {};
                for (var i = 0; i < nodesNeedReorder.length; i++) {
                    reorderChildren(nodesNeedReorder[i], nodesNeedReorder, nodeMap);
                }
            }
            // Optimize by augmenting the graph (value must be valid json format)
            // All optimizations go from here
            if (options.pushToSelect) {
                opGraph = pushToSelect(opGraph);
            }
            if (options.dedup !== false) {
                // Default optimizations
                const visitedMap = {};
                this.dedupPlan(opGraph, visitedMap);
                opGraph = this.combineLastSynthesize(opGraph);
            }
            if (options.randomCrossJoin) {
                const visitedMap = {};
                this.addIndexForCrossJoin(opGraph, visitedMap);
            }
            if (options.combineProjectWithSynthesize) {
                const visitedMap = {};
                opGraph = this.combineProjectWithSynthesize(opGraph, visitedMap);
            }
            if (!options.dropAsYouGo) {
                findAggs(this, opGraph);
            }
            // XXX Add more but make sure addDrops is at the correct place
            if (options.dropAsYouGo) {
                const visitedMap = {};
                if (options.backDAYG) {
                    this.addBackDrops(opGraph, visitedMap);
                } else {
                    const dependencyMap = {};
                    this.addDrops(opGraph, options.dropSrcTables, dependencyMap, visitedMap);
                }
            }
            let resCli = "";
            // Final traversal - get the result
            const cliArray = [];
            this.getCliFromOpGraph(opGraph, cliArray, options.deleteCompletely);
            const optimizedQueryString = "[" + cliArray.join(",") + "]";
            return optimizedQueryString;
        },
        addBackDrops: function(opNode, visitedMap) {
            if (visitedMap[opNode.name]) {
                return;
            }
            opNode.value.state = "Dropped";
            for (var i = 0; i < opNode.children.length; i++) {
                this.addBackDrops(opNode.children[i], visitedMap);
            }
            visitedMap[opNode.name] = true;
        },
        addDrops: function(opNode, dropSrcTables, dependencyMap, visitedMap) {
            if (visitedMap[opNode.name]) {
                return;
            }
            dependencyMap[opNode.name] = opNode.parents.length;
            for (let i = 0; i < opNode.children.length; i++) {
                this.addDrops(opNode.children[i], dropSrcTables, dependencyMap, visitedMap);
            }
            if (opNode.children.length === 0 && dropSrcTables) {
                assert(opNode.sources.length === 1);
                opNode.toDrop = [opNode.sources[0]];
            }
            if (opNode.children.length > 0) {
                for (let source of opNode.sources) {
                    dependencyMap[source] -= 1;
                    if (dependencyMap[source] === 0) {
                        if (!opNode.toDrop) {
                            opNode.toDrop = [];
                        }
                        opNode.toDrop.push(source);
                    }
                }
            }
            visitedMap[opNode.name] = true;
        },
        addMinSynthesize: function(opNode) {
            var visitedMap = [];
            var leafNodes = [];
            findLeafNodes(opNode, visitedMap, leafNodes);
            for (var i = 0; i < leafNodes.length; i++) {
                var colList = [];
                var createdColList = [];
                if (leafNodes[i].value.operation !== "XcalarApiSynthesize"
                    && getMinColumns(leafNodes[i], colList, createdColList)) {
                    // Add a synthesize node before leaf
                    // in most cases it will be combined to prepended synthesize or select later
                    var tempTableName = xcHelper.getTableName(leafNodes[i].value.args.source)
                                            + "_tmp" + Authentication.getHashId();
                    var synthesizeArgStruct = {source: leafNodes[i].value.args.source,
                                               dest: tempTableName,
                                               columns: colList.map(function(colName) {
                                                   return {sourceColumn: colName,
                                                           destColumn: colName};
                                               })};
                    var synthesizeNode = {name: tempTableName,
                                          value: {operation: "XcalarApiSynthesize",
                                                  args: synthesizeArgStruct},
                                          parents: [leafNodes[i]],
                                          children: [],
                                          sources: leafNodes[i].sources};
                    leafNodes[i].children = [synthesizeNode];
                    leafNodes[i].sources = [tempTableName];
                    leafNodes[i].value.args.source = tempTableName;
                }
            }
        },
        addIndexForCrossJoin: function(opNode, visitedMap) {
            if (visitedMap[opNode.name]) {
                return;
            }
            if (opNode.value.operation === "XcalarApiJoin" &&
                opNode.value.args.joinType === "crossJoin") {
                for (let i = 0; i < opNode.children.length; i++) {
                    const childNode = opNode.children[i];
                    if (childNode.value.args.operation !== XcalarApisT.XcalarApiIndex) {
                        // TODO: generate an object for index
                        const newTableName = xcHelper.getTableName(
                                             childNode.value.args.dest) +
                                             "_index" +
                                             Authentication.getHashId();
                        const indexObj = {
                            "operation": "XcalarApiIndex",
                            "args": {
                                "source": childNode.name,
                                "dest": newTableName,
                                "key": [
                                    {
                                        "name": "xcalarRecordNum",
                                        "keyFieldName": "xcalarRecordNum",
                                        "type": "DfInt64",
                                        "ordering": "Unordered"
                                    }
                                ],
                                "prefix": "",
                                "dhtName": "systemRandomDht",
                                "delaySort": false,
                                "broadcast": false
                            }
                        };
                        const indexNode = {
                            name: newTableName,
                            value: indexObj,
                            parents: [opNode],
                            children: [childNode],
                            sources: [childNode.value.args.dest]
                        };
                        childNode.parent = [indexNode];
                        opNode.children[i] = indexNode;
                        opNode.value.args.source[i] = newTableName;
                    }
                }
            }
            visitedMap[opNode.name] = true;
            for (let i = 0; i < opNode.children.length; i++) {
                this.addIndexForCrossJoin(opNode.children[i], visitedMap);
            }
        },
        getCliFromOpGraph: function(opNode, cliArray, deleteCompletely) {
            if (opNode.visited) {
                return;
            }
            for (let i = 0; i < opNode.children.length; i++) {
                this.getCliFromOpGraph(opNode.children[i], cliArray,
                                       deleteCompletely);
            }
            cliArray.push(JSON.stringify(opNode.value));
            if (opNode.toDrop) {
                opNode.toDrop.forEach(function(namePattern) {
                    const deleteObj = {
                        "operation": "XcalarApiDeleteObjects",
                        "args": {
                          "namePattern": namePattern,
                          "srcType": "Table",
                          "deleteCompletely": deleteCompletely || false
                        }
                    };
                    cliArray.push(JSON.stringify(deleteObj));
                });
            }
            opNode.visited = true;
        },
        combineLastSynthesize(node) {
            const self = this;
            if (node.parents.length === 0 &&
                node.value.operation === "XcalarApiSynthesize" &&
                node.children.length > 0) {
                // last node is synthesize
                const renameMap = {};
                for (let colStruct of node.value.args.columns) {
                    renameMap[colStruct.sourceColumn] = colStruct.destColumn;
                }
                const child = node.children[0];
                const operation = child.value.operation;
                let allColumns = [];
                switch (operation) {
                    case "XcalarApiSynthesize":
                        child.value.args.columns.forEach(function(col) {
                            if (renameMap[col.destColumn]) {
                                col.destColumn = renameMap[col.destColumn];
                                allColumns.push(col);
                            }
                        });
                        break;
                    case "XcalarApiUnion":
                    case "XcalarApiIntersect":
                    case "XcalarApiExcept":
                    case "XcalarApiJoin":
                        allColumns = child.value.args.columns;
                        if (operation === "XcalarApiJoin") {
                            child.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(child.value.args.evalString,
                                                    renameMap, {}, true);
                        }
                        for (let colList of allColumns) {
                            for (let colStruct of colList) {
                                if (renameMap.hasOwnProperty(colStruct.destColumn)) {
                                    colStruct.destColumn = renameMap[colStruct.destColumn];
                                }
                            }
                        }
                        break;
                    default:
                        return node;
                }
                child.parent = [];
                child.value.args.dest = node.value.args.dest;
                child.value.args.columns = allColumns;
                return child;
            } else {
                return node;
            }
        },
        dedupPlan: function(node, visitedMap) {
            const self = this;
            if (visitedMap[node.name]) {
                return;
            }
            // We probably don't need the level attribute as long as we have hash
            // Same hash means same source => same level
            for (var i = 0; i < node.children.length; i++) {
                self.dedupPlan(node.children[i], visitedMap);
            }

            // Fix column names in this node, should rename if that creates new collision
            replaceColName(self, node);

            // Check duplicate with hash
            var nodeHash = generateHash(node);
            if (node.value.operation === "XcalarApiJoin"
                && node.value.args.joinType === "crossJoin") {
                if (self.nodeHashMap[nodeHash]) {
                    var find = false;
                    for (var i = 0; i < self.nodeHashMap[nodeHash].length; i++) {
                        if (isSameCrossJoin(self.nodeHashMap[nodeHash][i], node)) {
                            node.dupOf = self.nodeHashMap[nodeHash][i];
                            node.colNameMap = jQuery.extend(true, {}, node.colNameMap[0],
                                                node.colNameMap[1], node.crossCheckMap);
                            find = true;
                            break;
                        }
                    }
                    if (!find) {
                        self.nodeHashMap[nodeHash].push(node);
                        updateColNameMap(node);
                    }
                } else {
                    self.nodeHashMap[nodeHash] = [node];
                    updateColNameMap(node);
                }
            } else if (self.nodeHashMap[nodeHash]) {
                generateColNameMap(self, self.nodeHashMap[nodeHash], node);
                node.dupOf = self.nodeHashMap[nodeHash];
            } else {
                self.nodeHashMap[nodeHash] = node;
                updateColNameMap(node);
            }
            pushupColNameMap(node);
            visitedMap[node.name] = true;
        },
        combineProjectWithSynthesize: function(opNode, visitedMap) {
            const self = this;
            var removeCurNode = false;
            if (visitedMap[opNode.name]) {
                return visitedMap[opNode.name];
            }
            var retNode = opNode;
            if (opNode.value.operation === "XcalarApiProject" &&
                opNode.children.length > 0 &&
                opNode.children[0].value.operation === "XcalarApiSynthesize") {
                if (opNode.children[0].parents.length === 1) {
                    var synList = opNode.children[0].value.args.columns;
                    var projectedList = [];
                    for (var i = 0; i < synList.length; i++) {
                        if (opNode.value.args.columns.indexOf(synList[i].destColumn) != -1) {
                            projectedList.push(synList[i]);
                        }
                    }
                    opNode.children[0].value.args.columns = projectedList;
                    opNode.children[0].value.args.numColumns = projectedList.length;
                    opNode.children[0].value.args.dest = opNode.value.args.dest;
                    opNode.children[0].name = opNode.value.args.dest;
                    opNode.children[0].parents = opNode.parents;
                    retNode = opNode.children[0];
                    removeCurNode = true;
                    if (retNode.children.length > 0) {
                        retNode.children[0] = self.combineProjectWithSynthesize(
                                                retNode.children[0], visitedMap);
                    }
                } else {
                    var synNodeCopy = {children: opNode.children[0].children,
                                       name: opNode.value.args.dest,
                                       parents: opNode.parents,
                                       sources: opNode.children[0].sources,
                                       value: jQuery.extend(true, {}, opNode.children[0].value)};
                    var synList = synNodeCopy.value.args.columns;
                    var projectedList = [];
                    for (var i = 0; i < synList.length; i++) {
                        if (opNode.value.args.columns.indexOf(synList[i].destColumn) != -1) {
                            projectedList.push(synList[i]);
                        }
                    }
                    synNodeCopy.value.args.columns = projectedList;
                    synNodeCopy.value.args.numColumns = projectedList.length;
                    synNodeCopy.value.args.dest = opNode.value.args.dest;
                    retNode = synNodeCopy;
                    opNode.children[0].parents.splice(opNode.children[0]
                                                    .parents.indexOf(opNode),1);
                    if (retNode.children.length > 0) {
                        retNode.children[0] = self.combineProjectWithSynthesize(
                                                retNode.children[0], visitedMap);
                    }
                }
            } else if (opNode.value.operation === "XcalarApiSynthesize" &&
                       opNode.children.length > 0 &&
                       opNode.children[0].value.operation === "XcalarApiSynthesize") {
                if (opNode.children[0].parents.length === 1) {
                    var synReverseMap = {};
                    var synTypeMap = {};
                    opNode.children[0].value.args.columns.forEach(function(col) {
                        synReverseMap[col.destColumn] = col.sourceColumn;
                        synTypeMap[col.destColumn] = col.columnType;
                    });
                    var synList = opNode.value.args.columns;
                    for (var i = 0; i < synList.length; i++) {
                        if (!synList[i].columnType && synTypeMap[synList[i].sourceColumn]) {
                            synList[i].columnType = synTypeMap[synList[i].sourceColumn];
                        }
                        synList[i].sourceColumn = synReverseMap[synList[i].sourceColumn]
                                                  || synList[i].sourceColumn;
                    }
                    opNode.children[0].value.args.columns = synList;
                    opNode.children[0].value.args.numColumns = synList.length;
                    opNode.children[0].value.args.dest = opNode.value.args.dest;
                    opNode.children[0].name = opNode.value.args.dest;
                    opNode.children[0].parents = opNode.parents;
                    removeCurNode = true;
                    retNode = self.combineProjectWithSynthesize(opNode.children[0], visitedMap);
                } else {
                    var synNodeCopy = {children: jQuery.extend([], opNode.children[0].children),
                                       name: opNode.value.args.dest,
                                       parents: opNode.parents,
                                       sources: jQuery.extend([], opNode.children[0].sources),
                                       value: jQuery.extend(true, {}, opNode.value)};
                    var synReverseMap = {};
                    var synTypeMap = {};
                    opNode.children[0].value.args.columns.forEach(function(col) {
                        synReverseMap[col.destColumn] = col.sourceColumn;
                        synTypeMap[col.destColumn] = col.columnType;
                    });
                    var synList = synNodeCopy.value.args.columns;
                    for (var i = 0; i < synList.length; i++) {
                        if (!synList[i].columnType && synTypeMap[synList[i].sourceColumn]) {
                            synList[i].columnType = synTypeMap[synList[i].sourceColumn];
                        }
                        synList[i].sourceColumn = synReverseMap[synList[i].sourceColumn]
                                                  || synList[i].sourceColumn;
                    }
                    synNodeCopy.value.args.columns = synList;
                    synNodeCopy.value.args.numColumns = synList.length;
                    synNodeCopy.value.args.dest = opNode.value.args.dest;
                    synNodeCopy.value.args.source = opNode.children[0].value.args.source;
                    retNode = self.combineProjectWithSynthesize(synNodeCopy, visitedMap);
                    opNode.children[0].parents.splice(opNode.children[0]
                                                    .parents.indexOf(opNode),1);
                }
            } else {
                for (var i = 0; i < opNode.children.length; i++) {
                    opNode.children[i] = self.combineProjectWithSynthesize(
                                                opNode.children[i], visitedMap);
                }
            }
            if (!removeCurNode) {
                visitedMap[opNode.name] = retNode;
            }
            return retNode;
        },
        getAggregates: function() {
            return this.aggregates;
        }
    };

    function assert(st, message) {
        if (!st) {
            console.error("ASSERTION FAILURE!");
            if (!message) {
                message = "Optimizer Error";
            }
            throw "Assertion Failure: " + message;
        }
    }

    function replaceColName(self, node) {
        // For operators that have only one child, simply replace name
        // If join node, need to detect extra collision
        var opName = node.value.operation;
        node.colNameMap = node.colNameMap || {};
        switch (opName) {
            case ("XcalarApiGroupBy"):
                node.value.args.newKeyField = node.colNameMap[node.value.args.newKeyField]
                                            || node.value.args.newKeyField;
            case ("XcalarApiMap"):
            case ("XcalarApiFilter"):
            case ("XcalarApiAggregate"):
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    node.value.args.eval[i].evalString = XDParser.XEvalParser
                                .replaceColName(node.value.args.eval[i].evalString,
                                node.colNameMap, self.aggregateNameMap, true);
                }
                break;
            case ("XcalarApiProject"):
                node.projectListCopy = node.value.args.columns;
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.value.args.columns[i] = node.colNameMap[node.value
                                .args.columns[i]] || node.value.args.columns[i];
                }
                break;
            case ("XcalarApiSynthesize"):
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.value.args.columns[i].sourceColumn = node.colNameMap
                                    [node.value.args.columns[i].sourceColumn] ||
                                        node.value.args.columns[i].sourceColumn;
                }
                break;
            case ("XcalarApiIndex"):
                for (var i = 0; i < node.value.args.key.length; i++) {
                    node.value.args.key[i].name = node.colNameMap[node.value
                        .args.key[i].name] || node.value.args.key[i].name;
                    node.value.args.key[i].keyFieldName = node.colNameMap[node.value
                        .args.key[i].keyFieldName] || node.value.args.key[i].keyFieldName;
                }
                break;
            case ("XcalarApiJoin"):
                // Depend on the assertion that we never have collision on
                // the temp columns/renames generated during compilation
                // and we never rename left table column
                // Here only replacing right table renames
                node.colNameMap[0] = node.colNameMap[0] || {};
                node.colNameMap[1] = node.colNameMap[1] || {};
                if (node.value.args.joinType === "leftSemiJoin" ||
                    node.value.args.joinType === "leftAntiJoin") {
                    node.colNameMap[1] = {};
                }
                var leftCols = [];
                // We don't always rename right table, so need to also check left rename
                for (var i = 0; i < node.value.args.columns[0].length; i++) {
                    if (node.colNameMap[0][node.value.args.columns[0][i].sourceColumn]) {
                        var rename = node.colNameMap[0][node.value.args.columns[0][i].sourceColumn];
                        delete node.colNameMap[0][node.value.args.columns[0][i].sourceColumn];
                        node.colNameMap[0][node.value.args.columns[0][i].destColumn]
                                    = node.value.args.columns[0][i].destColumn;
                        node.value.args.columns[0][i].sourceColumn = rename;
                    }
                }
                Object.keys(node.colNameMap[0]).forEach(function(col) {
                    leftCols.push(node.colNameMap[0][col]);
                })
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    if (node.colNameMap[1][node.value.args.columns[1][i].sourceColumn]) {
                        var rename = node.colNameMap[1][node.value.args.columns[1][i].sourceColumn];
                        delete node.colNameMap[1][node.value.args.columns[1][i].sourceColumn];
                        node.colNameMap[1][node.value.args.columns[1][i].destColumn]
                                    = node.value.args.columns[1][i].destColumn;
                        node.value.args.columns[1][i].sourceColumn = rename;
                    }
                }
                if (node.value.args.keepAllColumns) {
                    Object.keys(node.colNameMap[1]).forEach(function(col) {
                        if (leftCols.indexOf(node.colNameMap[1][col]) !== -1) {
                            var newColRename = node.colNameMap[1][col] +
                                            Authentication.getHashId().substring(2);
                            node.value.args.columns[1].push({
                                sourceColumn: node.colNameMap[1][col],
                                destColumn: newColRename
                            });
                            node.colNameMap[1][col] = newColRename;
                        }
                    })
                }
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMap[0], self.aggregateNameMap, true);
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMap[1], {}, true);
                break;
            case ("XcalarApiUnion"):
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.colNameMap[i] = node.colNameMap[i] || {};
                    for (var j = 0; j < node.value.args.columns[i].length; j++) {
                        node.value.args.columns[i][j].sourceColumn =
                            node.colNameMap[i][node.value.args.columns[i][j].sourceColumn]
                            || node.value.args.columns[i][j].sourceColumn;
                    }
                }
                break;
            case ("XcalarApiGetRowNum"):
                break;
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSelect"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    function isSameCrossJoin(crossNode, node) {
        var crossCheckMap = {};
        for (var i = 0; i < node.value.args.columns[1].length; i++) {
            if (node.value.args.columns[1][i].destColumn !=
                    crossNode.value.args.columns[1][i].destColumn) {
                crossCheckMap[node.value.args.columns[1][i].destColumn] =
                                    crossNode.value.args.columns[1][i].destColumn;
            }
        }
        node.crossCheckMap = crossCheckMap;
        return crossNode.value.args.evalString === XDParser.XEvalParser
                .replaceColName(node.value.args.evalString, crossCheckMap, {}, true);
    }

    function generateHash(node) {
        var value = jQuery.extend(true, {}, node.value);
        delete value.args.dest;
        var opName = value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
            case ("XcalarApiGroupBy"):
                for (var i = 0; i < value.args.eval.length; i++) {
                    delete value.args.eval[i].newField;
                }
                break;
            case ("XcalarApiSynthesize"):
                for (var i = 0; i < value.args.columns.length; i++) {
                    delete value.args.columns[i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                delete value.args.newField;
                break;
            case ("XcalarApiJoin"):
                delete value.args.columns;
                delete value.args.evalString;
                break;
            case ("XcalarApiUnion"):
                for (var i = 0; i < value.args.columns.length; i++) {
                    for (var j = 0; j < value.args.columns[i].length; j++) {
                        delete value.args.columns[i][j].destColumn;
                    }
                }
                break;
            case ("XcalarApiAggregate"):
            case ("XcalarApiProject"):
            case ("XcalarApiIndex"):
            case ("XcalarApiFilter"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
        return jQuery.md5(JSON.stringify(value));
    }

    function generateColNameMap(self, baseNode, node) {
        node.indexOn = baseNode.indexOn;
        var opName = node.value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
            case ("XcalarApiGroupBy"):
                var newColList = [];
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    newColList.push(node.value.args.eval[i].newField);
                }
                for (item in node.colNameMap) {
                    if (newColList.indexOf(item) != -1) {
                        delete node.colNameMap[item];
                    }
                }
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    node.colNameMap[node.value.args.eval[i].newField] =
                                            baseNode.value.args.eval[i].newField;
                }
                if (opName === "XcalarApiGroupBy") {
                    for (item in node.colNameMap) {
                        var find = false;
                        if (node.indexOn.indexOf(node.colNameMap[item]) != -1) {
                            find = true;
                        }
                        for (var j = 0; j < node.value.args.eval.length; j++) {
                            if (node.value.args.eval[j].newField === item) {
                                find = true;
                                break;
                            }
                        }
                        if (!find) {
                            delete node.colNameMap[item];
                        }
                    }
                }
                break;
            case ("XcalarApiProject"):
                node.colNameMap = {};
                for (var i = 0; i < node.projectListCopy.length; i++) {
                    if (node.projectListCopy[i] != baseNode.value.args.columns[i]) {
                        node.colNameMap[node.projectListCopy[i]] = baseNode.value.args.columns[i];
                    }
                }
                break;
            case ("XcalarApiSynthesize"):
                node.colNameMap = {};
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.colNameMap[node.value.args.columns[i].destColumn]
                                    = baseNode.value.args.columns[i].destColumn;
                }
                break;
            case ("XcalarApiAggregate"):
                node.colNameMap = {};
                self.aggregateNameMap["^" + node.value.args.dest] = "^" + baseNode.value.args.dest;
                break;
            case ("XcalarApiJoin"):
                // Here keep all from left because those in right with collision will be renamed
                node.colNameMap = jQuery.extend(true, {}, node.colNameMap[1], node.colNameMap[0]);
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    node.colNameMap[node.value.args.columns[1][i].destColumn] =
                                    baseNode.value.args.columns[1][i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                node.colNameMap[node.value.args.newField] = baseNode.value.args.newField;
                break;
            case ("XcalarApiUnion"):
                node.colNameMap = {};
                for (var i = 0; i < node.value.args.columns[0].length; i++) {
                    if (node.value.args.columns[0][i].destColumn !=
                                baseNode.value.args.columns[0][i].destColumn) {
                        node.colNameMap[node.value.args.columns[0][i].destColumn] =
                                        baseNode.value.args.columns[0][i].destColumn;
                    }
                }
            case ("XcalarApiIndex"):
            case ("XcalarApiFilter"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    function updateColNameMap(node) {
        if (!node.indexOn) {
            node.indexOn = [];
        }
        var opName = node.value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
                var newColList = [];
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    newColList.push(node.value.args.eval[i].newField);
                    node.colNameMap[node.value.args.eval[i].newField]
                                        = node.value.args.eval[i].newField;
                }
                for (item in node.colNameMap) {
                    if (newColList.indexOf(node.colNameMap[item]) != -1) {
                        delete node.colNameMap[item];
                    }
                }
                break;
            case ("XcalarApiGroupBy"):
                if (node.indexOn.length != 0 || node.value.args.groupAll) {
                    node.colNameMap = {};
                    for (var i = 0; i < node.indexOn.length; i++) {
                        node.colNameMap[node.indexOn[i]] = node.indexOn[i];
                    }
                }
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    node.colNameMap[node.value.args.eval[i].newField]
                                        = node.value.args.eval[i].newField;
                }
                break;
            case ("XcalarApiProject"):
                var colNameList = node.value.args.columns;
                var newIndexOn = [];
                for (item in node.colNameMap) {
                    if (colNameList.indexOf(item) === -1) {
                        delete node.colNameMap[item];
                    }
                }
                for (col in node.indexOn) {
                    if (colNameList.indexOf(col) != -1) {
                        newIndexOn.push(col);
                    }
                }
                node.indexOn = newIndexOn;
                break;
            case ("XcalarApiSelect"):
            case ("XcalarApiSynthesize"):
                var newColNameMap = {};
                var newIndexOn = [];
                node.value.args.columns.forEach(function(col) {
                    newColNameMap[col.destColumn] = col.destColumn;
                    if (node.indexOn.indexOf(col.sourceColumn) != -1) {
                        newIndexOn.push(col.destColumn);
                    }
                });
                node.colNameMap = newColNameMap;
                node.indexOn = newIndexOn;
                break;
            case ("XcalarApiAggregate"):
                node.colNameMap = {};
                node.indexOn = [];
                break;
            case ("XcalarApiJoin"):
                // Here keep all from left because those in right with collision will be renamed
                node.colNameMap = jQuery.extend(true, {}, node.colNameMap[1], node.colNameMap[0]);
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    node.colNameMap[node.value.args.columns[1][i].destColumn]
                                    = node.value.args.columns[1][i].destColumn;
                }
                break;
            case ("XcalarApiGetRowNum"):
                node.colNameMap[node.value.args.newField] = node.value.args.newField;
                break;
            case ("XcalarApiIndex"):
                node.indexOn = [];
                for (var i = 0; i < node.value.args.key.length; i++) {
                    node.indexOn.push(node.value.args.key[i].keyFieldName);
                }
                break;
            case ("XcalarApiFilter"):
            case ("XcalarApiUnion"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    function pushupColNameMap(node) {
        for (var i = 0; i < node.parents.length; i++) {
            var opName = node.parents[i].value.operation;
            if (!node.parents[i].colNameMap) {
                node.parents[i].colNameMap = {};
            }
            switch (opName) {
                case ("XcalarApiMap"):
                case ("XcalarApiGroupBy"):
                case ("XcalarApiAggregate"):
                case ("XcalarApiGetRowNum"):
                case ("XcalarApiProject"):
                case ("XcalarApiIndex"):
                case ("XcalarApiFilter"):
                case ("XcalarApiSynthesize"):
                    for (var j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            if (node.value.operation != "XcalarApiAggregate") {
                                if (node.dupOf) {
                                    node.parents[i].value.args.source = node.dupOf.value.args.dest;
                                }
                                node.parents[i].colNameMap = jQuery.extend(true, {}, node.colNameMap);
                            }
                            if (node.dupOf) {
                                node.parents[i].sources[j] = node.dupOf.name;
                                node.parents[i].children[j] = node.dupOf;
                            }
                        }
                    }
                    node.parents[i].indexOn = node.indexOn;
                    break;
                case ("XcalarApiJoin"):
                case ("XcalarApiUnion"):
                    for (var j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            node.parents[i].colNameMap[j] = jQuery.extend(true, {}, node.colNameMap);
                            if (node.dupOf) {
                                node.parents[i].children[j] = node.dupOf;
                                node.parents[i].sources[j] = node.dupOf.name;
                                if (node.value.operation != "XcalarApiAggregate") {
                                    node.parents[i].value.args.source[j] = node.dupOf.value.args.dest;
                                }
                            }
                        }
                    }
                    break;
                case ("XcalarApiExecuteRetina"):
                case ("XcalarApiRenameNode"):
                case ("XcalarApiSelect"):
                case ("XcalarApiBulkLoad"):
                case ("XcalarApiExport"):
                case ("XcalarApiDeleteObjects"):
                default:
                    console.error("Unexpected parent operation: " + opName
                                + " of node: " + node.value.operation);
                    break;
            }
        }
        if (node.dupOf) {
            for (var i = 0; i < node.children.length; i++) {
                node.children[i].parents.splice(node.children[i].parents.indexOf(node), 1);
            }
            node.dupOf.parents = node.dupOf.parents.concat(node.parents);
        }
    }

    function genOpNode(operator) {
        let sources = typeof operator.args.source === "string" ?
                        [operator.args.source] : operator.args.source;
        const dest = operator.args.dest;
        if (operator.args.aggSource) {
            sources = sources.concat(operator.args.aggSource);
            delete operator.args.aggSource;
        }
        return {
            name: dest,
            value: operator,
            parents: [],
            children: [],
            sources: sources
        }
    }

    function genOpGraph(opArray, index, opIdxMap, visitedMap, parent) {
        let newNode = genOpNode(opArray[index]);
        if (visitedMap[newNode.name]) {
            // replace with cached one
            newNode = visitedMap[newNode.name];
        }
        if (parent) {
            newNode.parents.push(parent);
        }
        if (visitedMap[newNode.name]) {
            return newNode;
        }
        for (let i = 0; i < newNode.sources.length; i++) {
            const index = opIdxMap[newNode.sources[i]];
            if (index >= 0) {
                const childNode = genOpGraph(opArray, index,
                                                 opIdxMap, visitedMap, newNode);
                newNode.children.push(childNode);
            }
        }
        visitedMap[newNode.name] = newNode;
        return newNode;
    }

    function insertOperators(opNode, prepArray, prepIdxMap, visitedMap, nodesNeedReorder) {
        if (visitedMap[opNode.name]) {
            return;
        }
        for (let i = 0; i < opNode.sources.length; i++) {
            if (opNode.children[i]) {
                insertOperators(opNode.children[i], prepArray,
                                prepIdxMap, visitedMap, nodesNeedReorder);
            }
            if (typeof prepIdxMap[opNode.sources[i]] === "object") {
                const prepNode = prepIdxMap[opNode.sources[i]];
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
                if (nodesNeedReorder.indexOf(opNode) === -1) {
                    nodesNeedReorder.push(opNode);
                }
            } else if (prepIdxMap[opNode.sources[i]] >= 0) {
                const prepNode = genOpNode(prepArray[prepIdxMap[opNode.sources[i]]]);
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
                prepIdxMap[opNode.sources[i]] = prepNode;
                if (nodesNeedReorder.indexOf(opNode) === -1) {
                    nodesNeedReorder.push(opNode);
                }
                insertOperators(prepNode, prepArray, prepIdxMap,
                                visitedMap, nodesNeedReorder);
            }
        }
        visitedMap[opNode.name] = true;
    }

    function reorderChildren(opNode, nodesNeedReorder, nodeMap) {
        if (nodeMap[opNode.name]) {
            return;
        }
        if (nodesNeedReorder.indexOf(opNode) === -1) {
            nodeMap[opNode.name] = opNode;
            return;
        }
        for (var i = 0; i < opNode.children.length; i++) {
            reorderChildren(opNode.children[i], nodesNeedReorder, nodeMap);
        }
        var reorderList = [];
        for (var i = 0; i < opNode.sources.length; i++) {
            if (nodeMap[opNode.sources[i]]) {
                reorderList.push(nodeMap[opNode.sources[i]]);
            }
        }
        opNode.children = reorderList;
        nodeMap[opNode.name] = opNode;
    }

    function pushToSelect(opGraph) {
        var selectNodes = [];
        var visitedMap = {};
        findSelects(opGraph, visitedMap, selectNodes);
        for (var i = 0; i < selectNodes.length; i++) {
            pushUpSelect(selectNodes[i], {});
        }
        if (opGraph.replaceWith) {
            opGraph = opGraph.replaceWith;
        }
        return opGraph;
    }

    function findLeafNodes(node, visitedMap, leafNodes) {
        if (visitedMap[node.name]) {
            return;
        } else if (node.children.length === 0) {
            leafNodes.push(node);
        } else {
            for (var i = 0; i < node.children.length; i++) {
                findLeafNodes(node.children[i], visitedMap, leafNodes);
            }
        }
        visitedMap[node.name] = true;
    }

    function getMinColumns(node, colList, createdColList) {
        if (node.parents.length > 1) {
            return false;
        }
        var opName = node.value.operation;
        switch (opName) {
            case "XcalarApiGroupBy":
            case "XcalarApiAggregate":
                var newCreatedCols = [];
                for (var evalStruct of node.value.args.eval) {
                    var evalColumnList = XDParser.XEvalParser.getAllColumnNames(
                                                    evalStruct.evalString, true);
                    for (var colName of evalColumnList) {
                        if (colList.indexOf(colName) === -1 &&
                            createdColList.indexOf(colName) === -1) {
                            colList.push(colName);
                        }
                    }
                    newCreatedCols.push(evalStruct.newField);
                }
                createdColList = createdColList.concat(newCreatedCols);
                if (node.value.args.includeSample && node.parents.length > 0) {
                    return getMinColumns(node.parents[0], colList, createdColList);
                } else if (node.value.args.includeSample) {
                    return false;
                } else {
                    return true;
                }
            case "XcalarApiGetRowNum":
                createdColList.push(node.value.args.newField);
                if (node.parents.length > 0) {
                    return getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            case "XcalarApiMap":
            case "XcalarApiFilter":
                var newCreatedCols = [];
                for (var evalStruct of node.value.args.eval) {
                    var evalColumnList = XDParser.XEvalParser.getAllColumnNames(
                                                    evalStruct.evalString, true);
                    for (var colName of evalColumnList) {
                        if (colList.indexOf(colName) === -1 &&
                            createdColList.indexOf(colName) === -1) {
                            colList.push(colName);
                        }
                    }
                    newCreatedCols.push(evalStruct.newField); // Might be undefined here but it doesn't matter
                }
                createdColList = createdColList.concat(newCreatedCols);
                if (node.parents.length > 0) {
                    return getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            case "XcalarApiIndex":
                for (var keyStruct of node.value.args.key) {
                    if (colList.indexOf(keyStruct.name) === -1 &&
                        createdColList.indexOf(keyStruct.name) === -1) {
                        colList.push(keyStruct.name);
                    }
                }
                if (node.parents.length > 0) {
                    return getMinColumns(node.parents[0], colList, createdColList);
                } else {
                    return false;
                }
            case "XcalarApiProject":
                for (var colName of node.value.args.columns) {
                    if (colList.indexOf(colName) === -1 &&
                        createdColList.indexOf(colName) === -1) {
                        colList.push(colName);
                    }
                }
                return true;
            case "XcalarApiSynthesize":
                for (var colStruct of node.value.args.columns) {
                    if (colList.indexOf(colStruct.sourceColumn) === -1 &&
                        createdColList.indexOf(colStruct.sourceColumn) === -1) {
                        colList.push(colStruct.sourceColumn);
                    }
                }
                return true;
            case "XcalarApiJoin":
            case "XcalarApiUnion":
                return false;
            case "XcalarApiBulkLoad":
            case "XcalarApiExecuteRetina":
            case "XcalarApiExport":
            case "XcalarApiDeleteObjects":
            case "XcalarApiSelect":
            default:
                console.error("Unexpected parent operation: " + opName
                              + " when adding minimum synthesize");
                return false;
        }
    }

    function findSelects(node, visitedMap, selectNodes) {
        if (visitedMap[node.name]) {
            return;
        } else if (node.value.operation === "XcalarApiSelect") {
            selectNodes.push(node);
        } else {
            for (var i = 0; i < node.children.length; i++) {
                findSelects(node.children[i], visitedMap, selectNodes);
            }
        }
        visitedMap[node.name] = true;
    }

    // For every group by parent, make a copy of current index node for pushing select
    function duplicateIndex(curNode) {
        var GBParents = [];
        var otherParents = [];
        for (var i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents[i].value.operation === "XcalarApiGroupBy") {
                // If there is only one parent, keep the node as it is
                if (i === curNode.parents.length - 1 && otherParents.length === 0) {
                    otherParents.push(curNode.parents[i]);
                } else {
                    GBParents.push(curNode.parents[i]);
                }
            } else {
                otherParents.push(curNode.parents[i]);
            }
        }
        if (GBParents.length === 0) {
            return;
        }
        for (var i = 0; i < GBParents.length; i++) {
            var indexStructCopy = jQuery.extend(true, {}, curNode.value);
            var indexTableCopyName = xcHelper.getTableName(curNode.name)
                                     + "_COPY_" + Authentication.getHashId();
            var indexNodeCopy = {name: indexTableCopyName,
                                 value: indexStructCopy,
                                 parents: [GBParents[i]],
                                 children: [curNode.children[0]],
                                 sources: [curNode.sources[0]]};
            indexNodeCopy.value.args.dest = indexTableCopyName;
            GBParents[i].children[GBParents[i].children.indexOf(curNode)] = indexNodeCopy;
            GBParents[i].sources[GBParents[i].sources.indexOf(curNode.name)] = indexNodeCopy.name;
            GBParents[i].value.args.source = indexNodeCopy.name;
            curNode.children[0].parents.push(indexNodeCopy);
        }
        curNode.parents = otherParents;
    }

    function pushGBHelper(curNode, selectStruct) {
        var indexCols = [];
        var gbNode;
        if (!selectStruct.args.eval) {
            selectStruct.args.eval = {};
        }
        var UniqueParents = [];
        for (var i = 0; i < curNode.parents.length; i++) {
            if (curNode.value.operation === "XcalarApiIndex" &&
                UniqueParents.indexOf(curNode.parents[i]) === -1) {
                UniqueParents.push(curNode.parents[i]);
            }
        }
        if (UniqueParents.length > 1) {
            return true;
        }
        if (curNode.value.operation === "XcalarApiGroupBy") {
            gbNode = curNode;
        } else if (curNode.parents.length === 0 ||
            curNode.parents[0].value.operation != "XcalarApiGroupBy") {
            return true;
        } else {
            gbNode = curNode.parents[0];
            indexCols = curNode.value.args.key.map(function(keyStruct) {
                return keyStruct.name;
            })
        }
        var valid = true;
        var hasAvg = false;
        // Change gb, add select gb, check & handle avg, create annotation
        var newEvals = jQuery.extend(true, [], gbNode.value.args.eval);
        var selectGBs = [];
        var extraMapEvals = [];
        var annotations = {columns: indexCols.map(function(colName) {
            return {sourceColumn: colName};
        })};
        var selectColumns = annotations.columns.map(function(col) {
            if (selectStruct[col.sourceColumn]) {
                return {sourceColumn: selectStruct[col.sourceColumn],
                        destColumn: col.sourceColumn};
            } else {
                return col;
            }
        })
        for (var j = 0; j < gbNode.value.args.eval.length; j++) {
            var curEval = gbNode.value.args.eval[j];
            if (curEval.evalString.indexOf("(") !== curEval.evalString.lastIndexOf("(")) {
                valid = false;
                break;
            }
            var opName = curEval.evalString.substring(0,curEval.evalString.indexOf("("));
            var aggColName = curEval.evalString.substring(
                curEval.evalString.indexOf("(") + 1, curEval.evalString.length - 1);
            if (opName === "listAgg") {
                console.warn("listAgg is not supported in push down group by to select");
                return true;
            } else if (opName === "avg" || opName === "avgNumeric") {
                hasAvg = true;
                var numericPart = "";
                var tempSelectCNTColName = "TMPSCNT_" + curEval.newField;
                var tempGBCNTColName = "TMPGCNT_" + curEval.newField;
                var tempSelectSUMColName = "TMPSSUM_" + curEval.newField;
                var tempGBSUMColName = "TMPGSUM_" + curEval.newField;
                newEvals[j].evalString = "sumInteger(" + tempSelectCNTColName + ")";
                newEvals[j].newField = tempGBCNTColName;
                if (opName === "avgNumeric") {
                    numericPart = "Numeric";
                }
                newEvals.push({evalString: "sum" + numericPart + "(" + tempSelectSUMColName + ")",
                               newField: tempGBSUMColName});
                selectGBs.push({func: "count", arg: selectStruct.colNameMap
                    [aggColName] || aggColName, newField: tempSelectCNTColName});
                selectGBs.push({func: "sum" + numericPart, arg: selectStruct.colNameMap
                    [aggColName] || aggColName, newField: tempSelectSUMColName});
                annotations.columns.push({sourceColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempSelectCNTColName});
                selectColumns.push({sourceColumn: tempSelectSUMColName});
                extraMapEvals.push({evalString: "div" + numericPart + "("
                                    + tempGBSUMColName + "," + tempGBCNTColName + ")",
                                    newField: curEval.newField});
            } else if (opName === "count") {
                var tempColName = "TMPCNT_" + curEval.newField;
                newEvals[j].evalString = "sumInteger(" + tempColName + ")";
                selectGBs.push({func: "count", arg: selectStruct.colNameMap
                        [aggColName] || aggColName, newField: tempColName});
                annotations.columns.push({sourceColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempColName});
            } else {
                var opNameTrunc = opName.substring(0,3);
                if (opNameTrunc === "max" || opNameTrunc === "min") {
                    opName = opNameTrunc;
                }
                var tempColName = "TMPGB_" + curEval.newField;
                newEvals[j].evalString = opName + "(" + tempColName + ")";
                selectGBs.push({func: opName, arg: selectStruct.colNameMap
                        [aggColName] || aggColName, newField: tempColName});
                annotations.columns.push({sourceColumn: curEval.newField});
                selectColumns.push({sourceColumn: tempColName});
            }
        }
        if (!valid) {
            return true;
        }
        if (hasAvg) {
            var newGBTableName = xcHelper.getTableName(gbNode.name)
                                    + "_GBCOPY_" + Authentication.getHashId();
            var newMapStruct = {source: newGBTableName,
                                dest: gbNode.name,
                                eval: extraMapEvals,
                                icv: false};
            var newMapNode = {name: gbNode.name,
                                value: {operation: "XcalarApiMap",
                                        args: newMapStruct,
                                        annotations: annotations},
                                parents: [],
                                children: [gbNode],
                                sources: [newGBTableName]};
            if (gbNode.parents.length === 0) {
                // GB node is root
                gbNode.replaceWith = newMapNode;
            } else {
                newMapNode.parents = gbNode.parents;
                newMapNode.parents.forEach(function(node) {
                    while (node.children.indexOf(gbNode) != -1) {
                        var index = node.children.indexOf(gbNode);
                        node.children[index] = newMapNode;
                    }
                });
            }
            gbNode.value.args.dest = newGBTableName;
            gbNode.parents = [newMapNode];
        }
        var newTableName = xcHelper.getTableName(curNode.name) + "_SELECTCOPY_"
                                + Authentication.getHashId();
        var newSelectStruct = jQuery.extend(true, {}, selectStruct);
        newSelectStruct.args.dest = newTableName;
        newSelectStruct.args.eval.GroupByKeys = indexCols.map(function(colName) {
            return selectStruct.colNameMap[colName] || colName;
        })
        newSelectStruct.args.eval.GroupBys = selectGBs;
        newSelectStruct.args.columns = selectColumns;
        delete newSelectStruct.colNameMap;
        var newSelectNode = {name: newTableName,
                                value: newSelectStruct,
                                parents: [],
                                children: [],
                                sources: [newSelectStruct.args.source]};
        gbNode.value.args.eval = newEvals;
        if (!hasAvg) {
            gbNode.value.annotations = annotations;
        }
        if (curNode.value.operation === "XcalarApiIndex") {
            var newIndexTableName = xcHelper.getTableName(curNode.name) + "_INDEXCOPY_"
                                    + Authentication.getHashId();
            var newIndexStruct = jQuery.extend(true, {}, curNode.value);
            newIndexStruct.args.dest = newIndexTableName;
            newIndexStruct.args.source = newTableName;
            var newIndexNode = {name: newIndexTableName,
                                value: newIndexStruct,
                                parents: [gbNode],
                                children: [newSelectNode],
                                sources: [newTableName]};
            newSelectNode.parents.push(newIndexNode);
            gbNode.children = [newIndexNode];
            gbNode.sources = [newIndexTableName];
            gbNode.value.args.source = newIndexTableName;
        } else {
            newSelectNode.parents.push(gbNode);
            gbNode.children = [newSelectNode];
            gbNode.sources = [newTableName];
            gbNode.value.args.source = newTableName;
        }
    }

    function pushUpSelect(curNode, selectStruct) {
        var newTableName;
        var newSelectStruct;
        var newSelectNode;
        if (curNode.children.length > 1) {
            return true;
        }
        if (!selectStruct.args) {
            selectStruct.args = {};
        }
        if (!selectStruct.args.eval) {
            selectStruct.args.eval = {};
        }
        if (curNode.value.operation === "XcalarApiSelect") {
            selectStruct = curNode.value;
            selectStruct.colNameMap = {};
            for (var i = 0; i < selectStruct.args.columns.length; i++) {
                selectStruct.colNameMap[selectStruct.args.columns[i].destColumn]
                                    = selectStruct.args.columns[i].sourceColumn;
            }
        } else if (curNode.value.operation === "XcalarApiFilter") {
            if (selectStruct.args.eval.Maps) {
                return true;
            }
            // XXX should re-enable it when Select supports UDF
            if (curNode.value.args.eval[0].evalString.indexOf("sql:") > -1) {
                return true;
            }
            var filterString = XDParser.XEvalParser.replaceColName(
                curNode.value.args.eval[0].evalString, selectStruct.colNameMap, true);
            if (selectStruct.args.eval.Filter && selectStruct.args.eval.Filter != "") {
                console.error("Multiple consecutive filters found!");
                selectStruct.args.eval.Filter = "and(" + selectStruct.args.eval.Filter
                                                + "," + filterString + ")";
            } else {
                selectStruct.args.eval.Filter = filterString;
            }
        } else if (curNode.value.operation === "XcalarApiMap") {
            if (selectStruct.args.eval.Maps) {
                console.error("Multiple consecutive maps found!");
                console.log(selectStruct.args.eval.maps);
                console.log(curNode.value.args.eval);
                return true;
            } else {
                var maps = jQuery.extend(true, [], curNode.value.args.eval);
                for (var i = 0; i < maps.length; i++) {
                    // XXX should re-enable it when Select supports UDF
                    if (maps[i].evalString.indexOf("sql:") > -1) {
                        return true;
                    }
                    maps[i].evalString = XDParser.XEvalParser.replaceColName(
                                maps[i].evalString, selectStruct.colNameMap, true);
                }
                for (var i = 0; i < maps.length; i++) {
                    if (selectStruct.colNameMap[maps[i].newField]) {
                        delete selectStruct.colNameMap[maps[i].newField];
                        for (var j = 0; j < selectStruct.args.columns.length; j++) {
                            if (selectStruct.args.columns[j].destColumn === maps[i].newField) {
                                selectStruct.args.columns[j].sourceColumn = maps[i].newField;
                                delete selectStruct.args.columns[j].destColumn;
                            }
                            break;
                        }
                    } else {
                        selectStruct.args.columns.push({sourceColumn: maps[i].newField});
                    }
                }
                selectStruct.args.eval.Maps = maps;
            }
        } else if (curNode.value.operation === "XcalarApiProject") {
            var columns = [];
            var newColNameMap = {};
            for (var i = 0; i < curNode.value.args.columns.length; i++) {
                if (selectStruct.colNameMap[curNode.value.args.columns[i]]) {
                    newColNameMap[curNode.value.args.columns[i]] =
                        selectStruct.colNameMap[curNode.value.args.columns[i]];
                    columns.push({sourceColumn: selectStruct.colNameMap[curNode.value.args.columns[i]],
                                  destColumn: curNode.value.args.columns[i]});
                } else {
                    columns.push({sourceColumn: curNode.value.args.columns[i]});
                }
            }
            selectStruct.colNameMap = newColNameMap;
            selectStruct.args.columns = columns;
        } else if (curNode.value.operation === "XcalarApiSynthesize") {
            var columns = [];
            var newColNameMap = {};
            for (var i = 0; i < curNode.value.args.columns.length; i++) {
                var curColumn = curNode.value.args.columns[i];
                if (selectStruct.colNameMap[curColumn.sourceColumn]) {
                    newColNameMap[curColumn.destColumn] =
                        selectStruct.colNameMap[curColumn.sourceColumn];
                    columns.push({sourceColumn: selectStruct.colNameMap[curColumn.sourceColumn],
                                  destColumn: curColumn.destColumn});
                } else {
                    columns.push({sourceColumn: curColumn.sourceColumn,
                                  destColumn: curColumn.destColumn});
                }
            }
            selectStruct.colNameMap = newColNameMap;
            selectStruct.args.columns = columns;
        } else {
            console.error("Invalid push up node: " + curNode.value.operation);
        }

        newTableName = xcHelper.getTableName(curNode.name) + Authentication.getHashId();
        newSelectStruct = jQuery.extend(true, {}, selectStruct);
        newSelectStruct.args.dest = newTableName;

        delete newSelectStruct.colNameMap;
        newSelectNode = {name: newTableName,
                         value: newSelectStruct,
                         parents: [],
                         children: [],
                         sources: newSelectStruct.args.source};

        if (curNode.parents.length === 0) {
            newSelectNode.value.args.dest = curNode.value.args.dest;
            curNode.replaceWith = newSelectNode;
            return;
        }

        var parentsAfterPush = [];
        for (var i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents[i].value.operation === "XcalarApiIndex") {
                duplicateIndex(curNode.parents[i]);
            }
        }
        for (var i = 0; i < curNode.parents.length; i++) {
            if (curNode.parents.indexOf(curNode.parents[i]) < i) {
                if (parentsAfterPush.indexOf(curNode.parents[i]) !== -1) {
                    parentsAfterPush.push(curNode.parents[i]);
                }
                continue;
            } else if (curNode.parents[i].value.operation === "XcalarApiIndex") {
                var innerStruct = jQuery.extend(true, {}, selectStruct);
                if (!pushGBHelper(curNode.parents[i], innerStruct)) {
                    continue;
                }
            } else if (curNode.parents[i].value.operation === "XcalarApiGroupBy"
                && curNode.parents[i].value.args.groupAll) {
                var innerStruct = jQuery.extend(true, {}, selectStruct);
                if (!pushGBHelper(curNode.parents[i], innerStruct)) {
                    continue;
                }
            } else if (curNode.parents[i].value.operation != "XcalarApiFilter"
                && curNode.parents[i].value.operation != "XcalarApiMap" &&
                curNode.parents[i].value.operation != "XcalarApiSynthesize"
                && curNode.parents[i].value.operation != "XcalarApiProject") {
                if (curNode.value.operation === "XcalarApiSelect") {
                    parentsAfterPush.push(curNode.parents[i]);
                    continue;
                }
            } else {
                var innerStruct = jQuery.extend(true, {}, selectStruct);
                if ((selectStruct.args.eval && selectStruct.args.eval.GroupBy)
                    || !pushUpSelect(curNode.parents[i], innerStruct)) {
                    continue;
                }
            }
            for (var j = 0; j < curNode.parents[i].children.length; j++) {
                if (curNode.parents[i].children[j] === curNode) {
                    if (typeof curNode.parents[i].value.args.source === "string") {
                        curNode.parents[i].value.args.source = newTableName;
                    } else {
                        curNode.parents[i].value.args.source[j] = newTableName;
                    }
                    curNode.parents[i].sources[j] = newTableName;
                    curNode.parents[i].children[j] = newSelectNode;
                    newSelectNode.parents.push(curNode.parents[i]);
                }
            }
        }
        curNode.parents = parentsAfterPush;
    }

    function addAggSource(cliStruct) {
        var opName = cliStruct.operation;
        switch (opName) {
            case ("XcalarApiGroupBy"):
            case ("XcalarApiMap"):
                cliStruct.args.aggSource = [];
                for (var i = 0; i < cliStruct.args.eval.length; i++) {
                    XDParser.XEvalParser.getAggNames(cliStruct.args.eval[i]
                        .evalString, true).forEach(function (aggName) {
                        if (cliStruct.args.aggSource.indexOf(aggName) === -1) {
                            cliStruct.args.aggSource.push(aggName);
                        }
                    })
                }
                break;
            case ("XcalarApiFilter"):
            case ("XcalarApiAggregate"):
                cliStruct.args.aggSource = XDParser.XEvalParser
                        .getAggNames(cliStruct.args.eval[0].evalString, true);
                break;
            case ("XcalarApiJoin"):
                cliStruct.args.aggSource = XDParser.XEvalParser
                                .getAggNames(cliStruct.args.evalString, true);
                break;
            case ("XcalarApiProject"):
            case ("XcalarApiIndex"):
            case ("XcalarApiUnion"):
            case ("XcalarApiGetRowNum"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSynthesize"):
            case ("XcalarApiSelect"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    function findAggs(self, node) {
        if (node.value.operation === "XcalarApiAggregate") {
            self.aggregates.push(node.value.args.dest);
        }
        for (var i = 0; i < node.children.length; i++) {
            findAggs(self, node.children[i]);
        }
    }

    if (typeof exports !== "undefined") {
        exports.SQLOptimizer = SQLOptimizer;
    } else {
        root.SQLOptimizer = SQLOptimizer;
    }
}());
