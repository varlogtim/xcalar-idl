
class MapOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeMap;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[];
    protected icv: boolean;

    public constructor(dagNode: DagNodeMap, event: Function) {
        super(dagNode, event,);
    }

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
            if (value === "regex" && numArgs === 2) {
                this.groups[index].args[1].setRegex(true);
            }
        } else {
            this.groups[index].args = [];
        }

        this._update();
    }

    public updateArg(
        value: string,
        groupIndex: number,
        argIndex: number,
        options?: any
    ): void {
        options = options || {};
        const group = this.groups[groupIndex];
        while (group.args.length <= argIndex) {
            group.args.push(new OpPanelArg("", -1));
        }
        // no arg if boolean is not true
        if ((options.boolean && value === "") || options.isEmptyArg) {
            group.args.splice(argIndex, 1);
        } else {
            const arg: OpPanelArg = group.args[argIndex];
            arg.setValue(value);
            if (options.typeid != null) {
                arg.setTypeid(options.typeid);
            }
            this._formatArg(arg);
            this._validateArg(arg);
        }
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

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeMapInput = this._getParam();
        this.dagNode.setParam(param);
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
                    parsedEval = {fnName:"", args: [], type: "fn"};
                }
            }
            argGroups.push(parsedEval);
            newFieldNames.push(paramsRaw.eval[i].newField);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args = [];
            const opInfo = this._getOperatorObj(argGroup.fnName);
            if (!opInfo && argGroup.args.length) {
                // XXX send to advanced mode
                if (argGroup.fnName.length) {
                    throw({error: "\"" + argGroup.fnName + "\" is not a" +
                            " valid map function."});
                } else {
                    throw({error: "Function not selected."});
                }
            }
            if (argGroup.args.length &&
                (!opInfo || (argGroup.args.length > opInfo.argDescs.length))) {
                throw ({error: "\"" + argGroup.fnName + "\" only accepts " +
                        opInfo.argDescs.length + " arguments."})
            }
            for (var j = 0; j < argGroup.args.length; j++) {
                let arg = argGroup.args[j].value;
                if (argGroup.args[j].type === "fn") {
                    arg = xcHelper.stringifyEval(argGroup.args[j]);
                }

                const argInfo: OpPanelArg = new OpPanelArg(arg,
                                        opInfo.argDescs[j].typesAccepted, true);
                args.push(argInfo);
            }
            args.forEach((arg) => {
                const value = formatArgToUI(arg.getValue());
                arg.setValue(value);
                if (argGroup.fnName === "regex" && args.length === 2) {
                    arg.setRegex(true);
                }
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
            icv: this.icv
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
                error = this._validateNewFieldName();
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

    private _validateNewFieldName() {
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
}