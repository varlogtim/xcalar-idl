(function() {
    var root = this;

    function SQLOptimizer() {
        this.aggregateNameMap = {}; // Depends on how the graph looks like (link from agg node to others or not)
        this.nodeHashMap = {};
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
                }
                opGraph  = genOpGraph(opArray, opArray.length - 1,
                                                                  opIdxMap, {});
            } catch (e) {
                if (typeof SQLOpPanel !== "undefined") {
                    SQLOpPanel.throwError(e);
                }
                throw e;
            }
            const visitedMap = {};
            this.dedupPlan(opGraph, visitedMap);
            // Second (optional) traversal - add prepended operators to the correct place
            if (prepArray) {
                const prepIdxMap = {};
                for (let i = 0; i < prepArray.length; i++) {
                    prepIdxMap[prepArray[i].args.dest] = i;
                }
                const visitedMap = {};
                insertOperators(opGraph, prepArray, prepIdxMap, visitedMap);
            }
            // Optimize by augmenting the graph (value must be valid json format)
            // All optimizations go from here
            if (options.randomCrossJoin) {
                const visitedMap = {};
                this.addIndexForCrossJoin(opGraph, visitedMap);
            }
            // XXX Add more but make sure addDrops is at the correct place
            if (options.dropAsYouGo) {
                const visitedMap = {};
                const dependencyMap = {};
                this.addDrops(opGraph, options.dropSrcTables, dependencyMap, visitedMap);
            }
            let resCli = "";
            // Final traversal - get the result
            const cliArray = [];
            this.getCliFromOpGraph(opGraph, cliArray);
            const optimizedQueryString = "[" + cliArray.join(",") + "]";
            return optimizedQueryString;
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
        addIndexForCrossJoin: function(opNode, visitedMap) {
            if (visitedMap[opNode.name]) {
                return;
            }
            const indexMap = {};
            if (opNode.value.operation === "XcalarApiJoin" &&
                opNode.value.args.joinType === "crossJoin") {
                for (let i = 0; i < opNode.children.length; i++) {
                    const childNode = opNode.children[i];
                    if (childNode.value.args.operation !== XcalarApisT.XcalarApiIndex) {
                        // TODO: generate an object for index
                        const indexObj = {
                            "operation": "XcalarApiIndex",
                            "args": {
                                "source": childNode.name,
                                "dest": xcHelper.getTableName(tableName) +
                                        "_index" + Authentication.getHashId(),
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
                        const childCopy = jQuery.extend(true, {}, childNode);
                        childCopy.parent = [childNode]
                        childNode.children = [childCopy];
                        childNode.value = indexObj;
                    }
                }
            }
            visitedMap[opNode.name] = true;
            for (let i = 0; i < opNode.children.length; i++) {
                this.addIndexForCrossJoin(opNode.children[0], visitedMap);
            }
        },
        getCliFromOpGraph: function(opNode, cliArray) {
            if (opNode.visited) {
                return;
            }
            for (let i = 0; i < opNode.children.length; i++) {
                this.getCliFromOpGraph(opNode.children[i], cliArray);
            }
            cliArray.push(JSON.stringify(opNode.value));
            if (opNode.toDrop) {
                opNode.toDrop.forEach(function(namePattern) {
                    const deleteObj = {
                        "operation": "XcalarApiDeleteObjects",
                        "args": {
                          "namePattern": namePattern,
                          "srcType": "Table"
                        }
                    };
                    cliArray.push(JSON.stringify(deleteObj));
                });
            }
            opNode.visited = true;
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
                            node.colNameMap = jQuery.extend(true, {},node.colNameMap[0],
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
        }
    };

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
                                node.colNameMap, self.aggregateNameMap);
                }
                break;
            case ("XcalarApiProject"):
                node.projectListCopy = node.value.args.columns;
                for (var i = 0; i < node.value.args.columns.length; i++) {
                    node.value.args.columns[i] = node.colNameMap[node.value
                                .args.columns[i]] || node.value.args.columns[i];
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
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    if (node.colNameMap[1][node.value.args.columns[1][i].sourceColumn]) {
                        var rename = node.colNameMap[1][node.value.args.columns[1][i].sourceColumn];
                        delete node.colNameMap[1][node.value.args.columns[1][i].sourceColumn];
                        node.value.args.columns[1][i].sourceColumn = rename;
                    }
                }
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMap[0], self.aggregateNameMap);
                node.value.args.evalString = XDParser.XEvalParser
                                    .replaceColName(node.value.args.evalString,
                                    node.colNameMap[1], {});
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
                .replaceColName(node.value.args.evalString, crossCheckMap, {});
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
            case ("XcalarApiSynthesize"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
        return jQuery.md5(JSON.stringify(value));
    }

    function generateColNameMap(self, baseNode, node) {
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
                    if (node.value.args.eval[i].newField != baseNode.value.args.eval[i].newField) {
                        node.colNameMap[node.value.args.eval[i].newField] =
                                            baseNode.value.args.eval[i].newField;
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
            case ("XcalarApiAggregate"):
                node.colNameMap = {};
                self.aggregateNameMap["^" + node.value.args.dest] = "^" + baseNode.value.args.dest;
                break;
            case ("XcalarApiJoin"):
                // TODO
                node.colNameMap = jQuery.extend(true, {}, node.colNameMap[0], node.colNameMap[1]);
                for (var i = 0; i < node.value.args.columns[1].length; i++) {
                    if (node.value.args.columns[1][i].destColumn !=
                                baseNode.value.args.columns[1][i].destColumn) {
                        node.colNameMap[node.value.args.columns[1][i].destColumn] =
                                        baseNode.value.args.columns[1][i].destColumn;
                    }
                }
                break;
            case ("XcalarApiGetRowNum"):
                if (node.value.args.newField != baseNode.value.args.newField) {
                    node.colNameMap[node.value.args.newField] = baseNode.value.args.newField;
                }
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
            case ("XcalarApiSynthesize"):
            case ("XcalarApiSelect"):
                break;
            default:
                console.error("Unexpected operation: " + opName);
                break;
        }
    }

    function updateColNameMap(node) {
        var opName = node.value.operation;
        switch (opName) {
            case ("XcalarApiMap"):
                var newColList = [];
                for (var i = 0; i < node.value.args.eval.length; i++) {
                    newColList.push(node.value.args.eval[i].newField);
                }
                for (item in node.colNameMap) {
                    if (newColList.indexOf(node.colNameMap[item]) != -1) {
                        delete node.colNameMap[item];
                    }
                }
                break;
            case ("XcalarApiProject"):
                var colNameList = node.value.args.columns;
                for (item in node.colNameMap) {
                    if (colNameList.indexOf(item) === -1) {
                        delete node.colNameMap[item];
                    }
                }
                break;
            case ("XcalarApiAggregate"):
                node.colNameMap = {};
                break;
            case ("XcalarApiJoin"):
                node.colNameMap = jQuery.extend(true, {}, node.colNameMap[0], node.colNameMap[1]);
                break;
            case ("XcalarApiFilter"):
            case ("XcalarApiGroupBy"):
            case ("XcalarApiIndex"):
            case ("XcalarApiGetRowNum"):
            case ("XcalarApiUnion"):
            case ("XcalarApiBulkLoad"):
            case ("XcalarApiExecuteRetina"):
            case ("XcalarApiExport"):
            case ("XcalarApiDeleteObjects"):
            case ("XcalarApiRenameNode"):
            case ("XcalarApiSynthesize"):
            case ("XcalarApiSelect"):
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
                    for (var j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            if (node.value.operation != "XcalarApiAggregate") {
                                if (node.dupOf) {
                                    node.parents[i].value.args.source = node.dupOf.value.args.dest;
                                }
                                node.parents[i].colNameMap = node.colNameMap;
                            }
                            if (node.dupOf) {
                                node.parents[i].children[j] = node.dupOf;
                            }
                        }
                    }
                    break;
                case ("XcalarApiJoin"):
                case ("XcalarApiUnion"):
                    for (var j = 0; j < node.parents[i].children.length; j++) {
                        if (node.parents[i].children[j] === node) {
                            node.parents[i].colNameMap[j] = node.colNameMap;
                            if (node.dupOf) {
                                node.parents[i].children[j] = node.dupOf;
                                if (node.value.operation != "XcalarApiAggregate") {
                                    node.parents[i].value.args.source[j] = node.dupOf.value.args.dest;
                                }
                            }
                        }
                    }
                    break;
                case ("XcalarApiExecuteRetina"):
                case ("XcalarApiRenameNode"):
                case ("XcalarApiSynthesize"):
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

    function insertOperators(opNode, prepArray, prepIdxMap, visitedMap) {
        if (visitedMap[opNode.name]) {
            return;
        }
        for (let i = 0; i < opNode.sources.length; i++) {
            if (opNode.children[i]) {
                insertOperators(opNode.children[i], prepArray, prepIdxMap, visitedMap);
            }
            if (typeof prepIdxMap[opNode.sources[i]] === "object") {
                const prepNode = prepIdxMap[opNode.sources[i]];
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
            } else if (prepIdxMap[opNode.sources[i]] >= 0) {
                const prepNode = genOpNode(prepArray[prepIdxMap[opNode.sources[i]]]);
                opNode.children.push(prepNode);
                prepNode.parents.push(opNode);
                prepIdxMap[opNode.sources[i]] = prepNode;
                insertOperators(prepNode, prepArray, prepIdxMap, visitedMap);
            }
        }
        visitedMap[opNode.name] = true;
    }

    if (typeof exports !== "undefined") {
        exports.SQLOptimizer = SQLOptimizer;
    } else {
        root.SQLOptimizer = SQLOptimizer;
    }
}());