
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

    public getColumns() {
        return this.tableColumns;
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: []
        });
        this._update();
    }

    public removeGroup(index: number): void {
        this.groups.splice(index, 1);
        this._update();
    }

    public clearFunction(index: number): void {
        this.groups[index].operator = "";
        this.groups[index].args = [];
        this._update();
    }

    public enterFunction(value: string, opInfo, index: number): void {
        this.groups[index].operator = value;
        if (opInfo) {
            const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
            this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                                            return new OpPanelArg("", opInfo.argDescs[i].typesAccepted);
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

        // console.log(JSON.stringify(this.groups, null, 2));
        // this._update(); // causes focus/blur issues
    }

    public updateCast(
        type: ColumnType,
        groupIndex: number,
        argIndex: number
    ): void {
        const arg: OpPanelArg = this.groups[groupIndex].args[argIndex];
        arg.setCast(type);
        this._validateArg(arg);
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

        // const backName = progCol.getBackColName();
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

    protected _initialize(paramsRaw) {
        const self = this;
        const params: xcHelper.OpAndArgsObject = xcHelper.extractOpAndArgs(
                                                        paramsRaw.evalString);
        const operator = params.op;
        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryCondition];
        }

        const opInfo = this._getOperatorObj(operator);
        if (!opInfo && params.args.length) {
            // XXX send to advanced mode
            if (operator.length) {
                throw({error: "\"" + operator + "\" is not a valid filter function."});
            } else {
                throw({error: "Function not selected."});
            }

        }
        if (params.args.length &&
            (!opInfo || (params.args.length > opInfo.argDescs.length)) {
            throw ({error: "\"" + operator + "\" only accepts " + opInfo.argDescs.length + " arguments."})
        }
        const args = params.args.map((arg, i) => {
            const argInfo: OpPanelArg = new OpPanelArg(arg, opInfo.argDescs[i].typesAccepted, true);
            return argInfo;
        });
        args.forEach((arg) => {
            const value = formatArgToUI(arg.getValue());
            arg.setValue(value);
            if (operator === "regex" && args.length === 2) {
                arg.setRegex(true);
            }
            self._formatArg(arg);
            self._validateArg(arg);
        });

        this.groups = [{operator: params.op, args: args}];
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

    protected _update(all?: boolean): void {
        // console.log(JSON.stringify(this.tableColumns), JSON.stringify(this.getModel(), null, 2));
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
            this._initialize(param);
            return this.validateGroups();
        } catch (e) {
            if (jsonError) {
                return {error: xcHelper.parseJSONError(e)};
            } else {
                return e;
            }
        }
    }

    public validateGroups() {
        const self = this;
        const groups = this.groups;

        // function name error
        for (let i = 0; i < groups.length; i++) {
            if (!self._isOperationValid(i)) {
                return {error: ErrTStr.NoSupportOp, group: i, arg: -1, type: "function"};
            }
        }

        // blank inputs
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() && arg.getError() === "No value") {
                    return {error: arg.getError(), group: i, arg: j, type: "blank"};
                }
            }
        }

        // other errors aside from wrong type
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() && !arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    return {error: arg.getError(), group: i, arg: j, type: "other"};
                }
            }
        }

        // wrong type on column
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() && arg.getType() === "column" && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    return {error: arg.getError(), group: i, arg: j, type: "columnType"};
                }
            }
        }

        // wrong type on value
        for (let i = 0; i < groups.length; i++) {
            const group = groups[i];
            for (let j = 0; j < group.args.length; j++) {
                const arg = group.args[j];
                if (!arg.checkIsValid() && arg.getError().includes(ErrWRepTStr.InvalidOpsType.substring(0, 20))) {
                    return {error: arg.getError(), group: i, arg: j, type: "valueType"};
                }
            }
        }

        return null;
    }
}