
class MapOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeMap;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[];
    protected icv: boolean;

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        icv: boolean
    } {
        return {
            groups: this.groups,
            icv: this.icv
        }
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: [],
            newFieldName: ""
        });

        this._update();
    }

    public enterFunction(value: string, opInfo, index: number): void {
        this.groups[index].operator = value;
        if (opInfo) {
            const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
            this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                                            return new OpPanelArg("",
                                            opInfo.argDescs[i].typesAccepted);
                                        });
            if (this.baseColumns && index === 0) {
                this.updateArg(this.baseColumns[0].getBackColName(), 0, 0);
            }
            if (value === "regex" && numArgs === 2) {
                this.groups[index].args[1].setRegex(true);
            }
        } else {
            this.groups[index].args = [];
        }

        if (this.baseColumns && index === 0) {
            let autoGenColName: string = xcHelper.parsePrefixColName(this.baseColumns[0].getBackColName()).name;
            if (opInfo.displayName.indexOf(":") > -1) {
                autoGenColName += "_udf";
            } else {
                autoGenColName += "_" + opInfo.displayName;
            }

            autoGenColName = xcHelper.stripColName(autoGenColName);
            autoGenColName = this._getAutoGenColName(autoGenColName);
            this.updateNewFieldName(autoGenColName, 0);
        }

        this._update();
    }

    public getColumnTypeFromArg(value): string {
        const self = this;
        let colType: string;

        const progCol: ProgCol = self.tableColumns.find((progCol) => {
            return progCol.getBackColName() === value;
        });
        if (progCol == null) {
            console.error("cannot find col", value);
            return;
        }

        colType = progCol.getType();
        if (colType === ColumnType.integer && !progCol.isKnownType()) {
            // for fat potiner, we cannot tell float or integer
            // so for integer, we mark it
            colType = ColumnType.number;
        }
        return colType;
    }

    public updateNewFieldName(newFieldName: string, groupIndex: number): void {
        this.groups[groupIndex].newFieldName = newFieldName;
    }

    public toggleICV(isICV: boolean): void {
        this.icv = isICV;
    }

    protected _initialize(paramsRaw, strictCheck?: boolean) {
        const self = this;
        if (!this._opCategories.length) {
            const operatorsMap = XDFManager.Instance.getOperatorsMap();
            for (let i in operatorsMap) {
                if (parseInt(i) !== FunctionCategoryT.FunctionCategoryAggregate) {
                    this._opCategories.push(parseInt(i));
                }
            }
        }
        let argGroups = [];
        let newFieldNames = [];
        for (let i = 0; i < paramsRaw.eval.length; i++) {
            let parsedEval: ParsedEval = XDParser.XEvalParser.parseEvalStr(
                paramsRaw.eval[i].evalString);

            if (parsedEval["error"]) {
                if (strictCheck) {
                    throw(parsedEval);
                } else {
                    parsedEval = {fnName:"", args: [], type: "fn", error: null};
                }
            }
            argGroups.push(parsedEval);
            newFieldNames.push(paramsRaw.eval[i].newField);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args: OpPanelArg[] = [];
            const opInfo = this._getOperatorObj(argGroup.fnName);
            let lastArg;
            let hasVariableArg = false;
            if (argGroup.args.length) {
                if (!opInfo) {
                    // XXX send to advanced mode
                    if (argGroup.fnName.length) {
                        throw({error: "\"" + argGroup.fnName + "\" is not a" +
                                " valid map function."});
                    } else {
                        throw({error: "Function not selected."});
                    }
                } else if (argGroup.args.length > opInfo.argDescs.length) {
                    lastArg = opInfo.argDescs[opInfo.argDescs.length - 1];
                    if (lastArg.argType === XcalarEvalArgTypeT.VariableArg ||
                        (lastArg.argDesc.indexOf("*") === 0 &&
                        lastArg.argDesc.indexOf("**") === -1)) {
                        hasVariableArg = true;
                    } else {
                        throw ({error: "\"" + argGroup.fnName + "\" only accepts " +
                            opInfo.argDescs.length + " arguments."});
                    }
                }
            }

            for (var j = 0; j < argGroup.args.length; j++) {
                let arg = argGroup.args[j].value;
                if (argGroup.args[j].type === "fn") {
                    arg = xcHelper.stringifyEval(argGroup.args[j]);
                }
                let typesAccepted;
                if (hasVariableArg) {
                    typesAccepted = lastArg.typesAccepted
                } else {
                    typesAccepted = opInfo.argDescs[j].typesAccepted;
                }
                const argInfo: OpPanelArg = new OpPanelArg(arg, typesAccepted,
                                                           true);
                args.push(argInfo);
            }
            args.forEach((arg, index) => {
                const rawValue = arg.getValue();
                let value = formatArgToUI(rawValue);
                if (argGroup.fnName === "regex" && args.length === 2 &&
                    index === 1) {
                    arg.setRegex(true);
                }
                if (rawValue === "\"\"") {
                    arg.setIsEmptyString(true);
                }
                if (rawValue === "None") {
                    value = "";
                    arg.setIsNone(true);
                }
                arg.setValue(value);
                self._formatArg(arg);
                self._validateArg(arg);
            });

            groups.push({
                operator: argGroup.fnName,
                args: args,
                newFieldName: newFieldNames[i]
            });
        }

        this.groups = groups;
        this.icv = paramsRaw.icv;

        function formatArgToUI(arg) {
            if (arg.charAt(0) !== ("'") && arg.charAt(0) !== ('"')) {
                if (self._isArgAColumn(arg)) {
                    // it's a column
                    if (arg.charAt(0) !== gAggVarPrefix) {
                        // do not prepend colprefix if has aggprefix
                        arg = gColPrefix + arg;
                    }
                }
            } else {
                const quote = arg.charAt(0);
                if (arg.lastIndexOf(quote) === arg.length - 1) {
                    arg = arg.slice(1, -1); // remove surrounding quotes
                }
            }
            return arg;
        }
    }

    protected _update(all?: boolean): void {
        if (this.event != null) {
            this.event(all);
        }
    }

    protected _getParam(): DagNodeMapInput {
        const self = this;
        const evals = [];
        this.groups.forEach(group => {
            group.args.forEach(arg => {
                self._formatArg(arg);
            });
            const evalString: string = xcHelper.formulateMapFilterString([group]);
            evals.push({
                evalString: evalString,
                newField: group.newFieldName
            });
        });

        return {
            eval: evals,
            icv: this.icv,
        }
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        let jsonError = true;
        try {
            const param: DagNodeMapInput = <DagNodeMapInput>JSON.parse(paramStr);
            jsonError = false;
            this._initialize(param, true);
            let error = this.validateGroups();
            if (!error) {
                error = this.validateNewFieldNames();
            }
            if (!error) {
                error = this._validateICV();
            }
            if (error == null) {
                return null;
            } else {
                return this._translateAdvancedErrorMessage(error);
            }
        } catch (e) {
            if (jsonError) {
                return {error: xcHelper.parseJSONError(e)};
            } else {
                return e;
            }
        }
    }

    public validateNewFieldNames() {
        const groups = this.groups;
        const nameMap = {};
        // new field name
        for (let i = 0; i < groups.length; i++) {
            const name = this.groups[i].newFieldName;
            let error = xcHelper.validateColName(name, true);
            if (error) {
                return {error: error, group: i, arg: -1, type: "newField"};
            }
            const match = this.tableColumns.find((col) => {
                return col.getBackColName() === name;
            });
            if (match != null || nameMap[name]) {
                return {
                    error: "Duplicate field name",
                    group: i,
                    arg: -1,
                    type: "newField"
                };
            }
            nameMap[name] = true;
        }
    }

    private _validateICV() {
        if (this.icv !== true && this.icv !== false) {
            return {
                error: "ICV only accepts booleans.",
                group: -1,
                arg: -1,
                type: "icv"
            };
        } else {
            return null;
        }
    }

    public submit() {
        const aggs: string[] = this.getAggregates();
        this.dagNode.setAggregates(aggs);
        super.submit();
    }
}