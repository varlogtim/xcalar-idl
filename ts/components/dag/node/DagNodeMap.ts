class DagNodeMap extends DagNode {
    protected input: DagNodeMapInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Map;
        this.allowAggNode = true;
        this.minParents = 1;
        this.display.icon = "&#xe9da;";
        this.input = new DagNodeMapInput(options.input);
    }

    /**
     * Set map node's parameters
     * @param input {DagNodeMapInputStruct}
     * @param input.eval {Array} array of {evalString, newFieldName}
     */
    public setParam(input: DagNodeMapInputStruct = <DagNodeMapInputStruct>{}) {
        this.input.setInput({
            eval: input.eval,
            icv: input.icv,
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const params = this.input.getInput(replaceParameters);
        params.eval.forEach((evalInput) => {
            const colName: string = evalInput.newField;
            if (xcHelper.parsePrefixColName(colName).prefix) {
                throw new Error("columns generated by map cannot have prefix");
            }

            const func = XDParser.XEvalParser.parseEvalStr(evalInput.evalString);
            if (func.error) {
                console.error(func.error);
                return;
            }
            const colType: ColumnType = this._getOpType(func);
            const progCol = ColManager.newPullCol(colName, colName, colType);
            let fromCol = null;
            if (this.subType === DagNodeSubType.Cast) {
                const fromColName = (<ParsedEvalArg>func.args[0]).value;
                for (let i = 0; i < columns.length; i++) {
                    if (columns[i].getBackColName() === fromColName) {
                        fromCol = columns.splice(i, 1)[0];
                        break;
                    }
                }
            }
            columns.push(progCol);
            changes.push({
                from: fromCol,
                to: progCol
            });
        });


        return {
            columns: columns,
            changes: changes
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            const evals = this.input.getInput().eval;
            evals.forEach(evalObj => {
                evalObj.evalString = this._replaceColumnInEvalStr(evalObj.evalString, renameMap.columns);
            });
            this.input.setEvals(evals);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
    }

    /**
     * Get the used UDF modules in the node
     */
    public getUsedUDFModules(): Set<string> {
        const set: Set<string> = new Set();
        this.input.getInput().eval.forEach((evalArg) => {
            try {
                const arg = XDParser.XEvalParser.parseEvalStr(evalArg.evalString);
                this._getUDFFromArg(arg, set);
            } catch (e) {
                console.error(e);
            }
        });
        return set;
    }

    /**
     * Get the resolutions of used UDF modules
     */
    public getModuleResolutions(): XDPromise<Map<string, string>> {
        const taskList = [];
        this.getUsedUDFModules().forEach((moduleName) => {
            taskList.push(
                XcalarUdfGetRes(
                    XcalarApiWorkbookScopeT.XcalarApiWorkbookScopeSession,
                    moduleName
                ).then((ret) => ({
                    name: moduleName, resolution: ret
                })).fail(() => null)
            );
        });

        return PromiseHelper.when(...taskList)
        .then((...rets) => {
            const result: Map<string, string> = new Map();
            for (const ret of rets) {
                if (ret != null) {
                    result.set(ret.name, ret.resolution);
                }
            }
            return result;
        });
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeMapInputStruct = this.getParam();
        if (input.eval.length) {
            const evalStrs: string[] = input.eval.map((evalInfo) => evalInfo.evalString);
            hint = evalStrs.join(",");
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        this.input.getInput().eval.forEach((evalArg) => {
            const arg = XDParser.XEvalParser.parseEvalStr(evalArg.evalString);
            this._getColumnFromEvalArg(arg, set);
        });
        return set;
    }

    private _getOpType(func: ParsedEval): ColumnType {
        const operator: string = func.fnName;
        let colType: ColumnType = null;
        const opsMap = XDFManager.Instance.getOperatorsMap();
        for (let category in opsMap) {
            const ops = opsMap[category];
            const opInfo = ops[operator];
            if (opInfo) {
                colType = xcHelper.convertFieldTypeToColType(opInfo.outputType);
                break;
            }
        }
        return colType;
    }

    private _getUDFFromArg(arg: object, set: Set<string>): void {
        const fnName: string = arg["fnName"];
        if (fnName == null) {
            return;
        }
        const splits: string[] = fnName.split(":");
        if (splits.length === 1) {
            return;
        }
        const moduleName: string = splits[0];
        set.add(moduleName);
        // recusrive check the arg
        if (arg["args"] != null) {
            arg["args"].forEach((subArg) => {
                this._getUDFFromArg(subArg, set);
            });
        }
    }
}