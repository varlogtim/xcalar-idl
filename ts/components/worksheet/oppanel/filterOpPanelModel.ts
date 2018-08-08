
class FilterOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeFilter;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[]; // TODO fix
    protected andOrOperator: string;

    public constructor(dagNode: DagNodeFilter, event: Function) {
        super(dagNode, event);
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
        const numArgs = Math.max(Math.abs(opInfo.numArgs),
                                opInfo.argDescs.length);
        this.groups[index].args = Array(numArgs).fill("").map((_o, i) => {
                                        return {
                                            value: "",
                                            formattedValue: "",
                                            cast: null,
                                            typeid: opInfo.argDescs[i].typesAccepted,
                                            isValid: false,
                                            error: "No value",
                                            type: "value"
                                        }});
        if (value === "regex" && numArgs === 2) {
            this.groups[index].args[1].isRegex = true;
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
            group.args.push({
                value: "",
                formattedValue: "",
                cast: null,
                typeid: -1,
                isValid: false
            });
        }
        // no arg if boolean is not true
        if ((options.boolean && value === "") || options.isEmptyArg) {
            group.args.splice(argIndex, 1);
        } else {
            const arg: OpPanelArg = group.args[argIndex];
            arg.value = value;
            if (options.typeid != null) {
                arg.typeid = options.typeid;
            }
            if (options.isNone) {
                arg.isNone = true;
            } else if (arg.hasOwnProperty("isNone")) {
                arg.isNone = false;
            }
            if (options.isEmptyString) {
                arg.isEmptyString = true;
            } else if (arg.hasOwnProperty("isEmptyString")) {
                arg.isEmptyString = false;
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
        arg.cast = type;
        this._validateArg(arg);
    }

    public toggleAndOr(wasAnd) {
        this.andOrOperator = wasAnd ? "or" : "and";
        this._update();
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeFilterInput = this._getParam();
        this.dagNode.setParam(param);
    }

    protected _initialize() {
        const self = this;
        // initialize all columns
        this.tableColumns = this.dagNode.getParents().map((parentNode) => {
            return parentNode.getLineage().getColumns();
        })[0];
        if (!this.tableColumns) {
            this.tableColumns = [];
        }
        const paramsRaw: DagNodeFilterInput = this.dagNode.getParam();
        const params: xcHelper.OpAndArgsObject = xcHelper.extractOpAndArgs(
                                                        paramsRaw.evalString);
        const func = params.op;
        let args = [];
        if (func) {
            const categoryNum = FunctionCategoryT.FunctionCategoryCondition;
            const ops = XDFManager.Instance.getOperatorsMap()[categoryNum];
            const opInfo = ops.find((op) => {
                return op.displayName === func;
            });

            args = params.args.map((arg, i) => {
                const argInfo: OpPanelArg = {
                                    value: arg,
                                    formattedValue: arg,
                                    cast: null,
                                    typeid: opInfo.argDescs[i].typesAccepted,
                                    isValid: true
                                };
                return argInfo;
            });
            args.forEach((arg) => {
                const value = formatArgToUI(arg.value);
                arg.value = value;
                if (func === "regex" && args.length === 2) {
                    arg.isRegex = true;
                }
                self._formatArg(arg);
                self._validateArg(arg);
            });
        }

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

    protected _update(): void {
        // console.log(JSON.stringify(this.tableColumns), JSON.stringify(this.getModel(), null, 2));
        if (this.event != null) {
            this.event();
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

    protected _parseType(typeId: number): ColumnType[] {
        const types: ColumnType[] = [];
        let typeShift: number;

        // string
        typeShift = 1 << DfFieldTypeT.DfString;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.string);
        }

        // integer
        typeShift = (1 << DfFieldTypeT.DfInt32) |
                    (1 << DfFieldTypeT.DfUInt32) |
                    (1 << DfFieldTypeT.DfInt64) |
                    (1 << DfFieldTypeT.DfUInt64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.integer);
        }

        // float
        typeShift = (1 << DfFieldTypeT.DfFloat32) |
                    (1 << DfFieldTypeT.DfFloat64);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.float);
        }

        // boolean
        typeShift = 1 << DfFieldTypeT.DfBoolean;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.boolean);
        }

        // mixed
        typeShift = 1 << DfFieldTypeT.DfMixed;
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.mixed);
        }

        // undefined/unknown
        typeShift = (1 << DfFieldTypeT.DfNull) |
                    (1 << DfFieldTypeT.DfUnknown);
        if ((typeId & typeShift) > 0) {
            types.push(ColumnType.undefined);
        }

        return (types);
    }
}