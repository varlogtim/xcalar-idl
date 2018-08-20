
class GroupByOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeGroupBy;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: OpPanelFunctionGroup[];
    protected icv: boolean;
    protected includeSample: boolean;
    protected groupAll: boolean;
    protected groupOnCols: string[];

    public constructor(dagNode: DagNodeGroupBy, event: Function) {
        super(dagNode, event,);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        groupOnCols: string[],
        groups: OpPanelFunctionGroup[],
        includeSample: boolean,
        icv: boolean,
        groupAll: boolean,
    } {
        return {
            groupOnCols: this.groupOnCols,
            groups: this.groups,
            includeSample: this.includeSample,
            icv: this.icv,
            groupAll: this.groupAll
        }
    }

    public addGroupOnArg(): void {
        this.groupOnCols.push("");
        this._update();
    }

    public removeGroupOnArg(index: number): void {
        this.groupOnCols.slice(index, 1);
        this._update();
    }

    public updateGroupOnArg(value: string, index: number): void {
        this.groupOnCols[index] = value;
    }

    public addGroup(): void {
        this.groups.push({
            operator: "",
            args: [],
            newFieldName: "",
            distinct: false
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
        const param: DagNodeGroupByInput = this._getParam();
        this.dagNode.setParam(param);
    }

    // return {
    //     groupBy: this.input.groupBy || [""],
    //     aggregate: this.input.aggregate || [{operator: "", sourceColumn: "", destColumn: "", distinct: false, cast: null}],
    //     includeSample: this.input.includeSample || false,
    //     icv: this.input.icv || false,
    //     groupAll: this.input.groupAll || false
    // }

    // interface OpPanelFunctionGroup {
    //     operator: string;
    //     args: OpPanelArg[];
    //     newFieldName?: string;
    // }

    // oppanelarg
    // private value: string;
    // private formattedValue: string;
    // private cast: XcCast;
    // private typeid: number;
    // private isValid: boolean;
    // private isNone: boolean = false;
    // private isEmptyString: boolean = false;
    // private isRegex: boolean = false;
    // private type: string; // ("value" | "column" | "function" | "regex")
    // private error: string;

    protected _initialize(paramsRaw, strictCheck?: boolean) {
        const self = this;
        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryAggregate];
        }
        let argGroups = [];

        for (let i = 0; i < paramsRaw.aggregate.length; i++) {
            argGroups.push(paramsRaw.aggregate[i]);
        }

        let groups = [];

        for (let i = 0; i < argGroups.length; i++) {
            let argGroup = argGroups[i];
            let args = [];
            const opInfo = this._getOperatorObj(argGroup.operator);
            if (!opInfo && argGroup.sourceColumn) {
                // XXX send to advanced mode
                if (argGroup.operator.length) {
                    throw({error: "\"" + argGroup.operator + "\" is not a" +
                            " valid group by function."});
                } else {
                    throw({error: "Function not selected."});
                }
            } else if (opInfo) {
                // XXX handle cast
                const argInfo: OpPanelArg = new OpPanelArg(argGroup.sourceColumn,
                                        opInfo.argDescs[0].typesAccepted, true);

                args.push(argInfo);
            }

            args.forEach((arg) => {
                const value = formatArgToUI(arg.getValue());
                arg.setValue(value);
                self._formatArg(arg);
                self._validateArg(arg);
            });

            groups.push({
                operator: argGroup.operator,
                args: args,
                newFieldName: argGroup.destColumn,
                distinct: argGroup.distinct
            });
        }

        this.groups = groups;
        this.icv = paramsRaw.icv;
        this.includeSample = paramsRaw.includeSample;
        this.groupAll = paramsRaw.groupAll;
        this.groupOnCols = paramsRaw.groupBy;

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

    protected _getParam(): DagNodeGroupByInput {
        const self = this;
        const aggregates = [];
        this.groups.forEach(group => {
            group.args.forEach(arg => {
                self._formatArg(arg);
            });


            aggregates.push({
                operator: group.operator,
                sourceColumn: group.args[0].getFormattedValue(),
                destColumn: group.newFieldName,
                distinct: group.distinct,
                cast: group.args[0].getCast()
            })

        });

        return {
            groupBy: this.groupOnCols,
            aggregate: aggregates,
            icv: this.icv,
            groupAll: this.groupAll,
            includeSample: this.includeSample
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
                error = this._validateNewFieldNames();
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

    private _validateNewFieldNames() {
        const groups = this.groups;
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
            if (match != null) {
                return {
                    error: "Duplicate field name",
                    group: i,
                    arg: -1,
                    type: "newField"
                };
            }
        }
        return  null;
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