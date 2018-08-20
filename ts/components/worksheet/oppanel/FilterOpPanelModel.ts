
class FilterOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeFilter;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[]; // TODO fix
    protected andOrOperator: string;

    public constructor(dagNode: DagNodeFilter, event: Function) {
        super(dagNode, event,);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        groups: OpPanelFunctionGroup[],
        andOrOperator: string
    } {
        return {
            groups: this.groups,
            andOrOperator: this.andOrOperator
        }
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
            this._update();
            return;
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
            if (options.isNone) {
                arg.setIsNone(true);
            } else if (arg.hasOwnProperty("isNone")) {
                arg.setIsNone(false);
            }
            if (options.isEmptyString) {
                arg.setIsEmptyString(true);
            } else if (arg.hasOwnProperty("isEmptyString")) {
                arg.setIsEmptyString(false);
            }
            this._formatArg(arg);
            this._validateArg(arg);
        }
    }

    public toggleAndOr(wasAnd) {
        this.andOrOperator = wasAnd ? "or" : "and";
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

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeFilterInput = this._getParam();
        this.dagNode.setParam(param);
    }

    protected _initialize(paramsRaw, strictCheck?: boolean) {
        const self = this;
        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryCondition];
        }
        const params: xcHelper.ParsedEval = xcHelper.parseEvalString(
                                                    paramsRaw.evalString);
        if (strictCheck && params.error) {
            throw({error: params.error});
        }
        let groups = [];
        let argGroups = [];

        if (self._isValidAndOr(params, "and")) {
            detectAndOr(params, "and");
        } else {
            detectAndOr(params, "or");
        }
        if (self._isValidAndOr(params, "or")) {
            this.andOrOperator = "or";
        } else {
            this.andOrOperator = "and";
        }

        function detectAndOr(func, operator) {
            let split = self._isValidAndOr(func, operator);
            if (split) {
                detectAndOr(func.args[0], operator);
                detectAndOr(func.args[1], operator);
            } else {
                argGroups.push(func);
            }
        }

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args = [];
            const opInfo = this._getOperatorObj(argGroup.fnName);
            if (!opInfo && argGroup.args.length) {
                // XXX send to advanced mode
                if (argGroup.fnName.length) {
                    throw({error: "\"" + argGroup.fnName + "\" is not a" +
                            " valid filter function."});
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
                let arg = argGroup.args[j];
                if (typeof arg === "object") {
                    arg = xcHelper.stringifyEval(arg);
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

            groups.push({operator: argGroup.fnName, args: args});
        }

        this.groups = groups;
        this.andOrOperator = "and";

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

    private _isValidAndOr(func, operator) {
        return (func.fnName === operator &&
                func.args.length === 2 &&
                typeof func.args[0] === "object" &&
                typeof func.args[1] === "object");
    }

    protected _update(all?: boolean): void {
        if (this.event != null) {
            this.event(all);
        }
    }

    protected _getParam(): DagNodeFilterInput {
        const self = this;
        this.groups.forEach(group => {
            group.args.forEach(arg => {
                self._formatArg(arg);
            });
        });
        const evalString = xcHelper.formulateMapFilterString(this.groups,
                                                             this.andOrOperator);
        return {
            evalString: evalString
        }
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        let jsonError = true;
        try {
            const param: DagNodeFilterInput = <DagNodeFilterInput>JSON.parse(paramStr);
            jsonError = false;
            this._initialize(param, true);
            let error = this.validateGroups();
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
}