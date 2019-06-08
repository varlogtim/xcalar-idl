class FilterPushUp {
    static pushFromJoin(
        opNode: XcOpNode,
        visitedMap: {[name: string]: XcOpNode}
    ): XcOpNode {
        if (visitedMap[opNode.name]) {
            return visitedMap[opNode.name];
        }
        for (let i = 0; i < opNode.children.length; i++) {
            FilterPushUp.pushFromJoin(opNode.children[i], visitedMap);
        }
        if (opNode.value.operation === "XcalarApiJoin" &&
            FilterPushUp.__findUDFInEvalString(opNode.value.args.evalString)) {
            const newEvalStruct = {
                "evalString": opNode.value.args.evalString,
                "newField": null
            };
            const newTableName = xcHelper.getTableName(opNode.value.args.dest) +
                                 "_filter" + Authentication.getHashId();
            const filterObj = {
                "operation": "XcalarApiFilter",
                "args": {
                    "source": opNode.name,
                    "dest": newTableName,
                    "eval": [newEvalStruct]
                }
            };
            const filterNode = new XcOpNode(newTableName, filterObj,
                                            [opNode.name]);
            filterNode.parents = opNode.parents;
            filterNode.children = [opNode];
            for (let i = 0; i < opNode.parents.length; i++) {
                const parent = opNode.parents[i];
                parent.children[parent.children.indexOf(opNode)] = filterNode;
                parent.sources[parent.sources.indexOf(opNode.name)] = newTableName;
                if (typeof parent.value.args.source === "string") {
                    parent.value.args.source = newTableName;
                } else {
                    const idx = parent.value.args.source.indexOf(opNode.name);
                    parent.value.args.source[idx] = newTableName;
                }
            }
            opNode.value.args.evalString = "";
            opNode.parents = [filterNode];
        }
        visitedMap[opNode.name] = opNode;
        return opNode;
    }

    static __findUDFInEvalString(evalString: string): boolean {
        if (!evalString) return false;
        const evalStruct = XDParser.XEvalParser.parseEvalStr(evalString);
        return dfs(evalStruct);

        function dfs(evalStruct): boolean {
            if (evalStruct.type === "fn" &&
                evalStruct.fnName.startsWith("sql:")) return true;
            if (evalStruct.args) {
                for (const arg of evalStruct.args) {
                    if (dfs(arg)) {
                        return true;
                    }
                }
            }
            return false;
        }
    }
}
if (typeof exports !== "undefined") {
    exports.FilterPushUp = FilterPushUp;
}