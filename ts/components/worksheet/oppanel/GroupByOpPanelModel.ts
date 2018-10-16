
class GroupByOpPanelModel extends GeneralOpPanelModel {
    protected dagNode: DagNodeGroupBy;
    protected tableColumns: ProgCol[];
    protected event: Function;
    protected groups: GroupByOpPanelFunctionGroup[];
    protected icv: boolean;
    protected includeSample: boolean;
    protected groupAll: boolean;
    protected groupOnCols: string[];

    public constructor(dagNode: DagNodeGroupBy, event: Function, options) {
        super(dagNode, event, options);
    }

    /**
     * Return the whole model info
     */
    public getModel(): {
        groupOnCols: string[],
        groups: GroupByOpPanelFunctionGroup[],
        includeSample: boolean,
        icv: boolean,
        groupAll: boolean,
    } {
        return {
            groupOnCols: this.groupOnCols,
            groups: this.groups,
            includeSample: this.includeSample,
            icv: this.icv,
            groupAll: this.groupAll,
        }
    }

    public addGroupOnArg(): void {
        this.groupOnCols.push("");
        this._update();
    }

    public removeGroupOnArg(index: number): void {
        this.groupOnCols.splice(index, 1);
        this._update();
    }

    public updateGroupOnArg(value: string, index: number): void {
        if (value[0] === gColPrefix) {
            value = value.slice(1);
        }
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
        } else {
            this.groups[index].args = [];
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

    public toggleIncludeSample(isIncludeSample: boolean): void {
        this.includeSample = isIncludeSample;
    }

    public toggleDistinct(distinct: boolean, groupIndex: number): void {
        this.groups[groupIndex].distinct = distinct;
    }

    public toggleGroupAll(groupAll: boolean): void {
        this.groupAll = groupAll;
    }

    /**
     * Submit the settings of Set op node params
     */
    public submit(): void {
        const param: DagNodeGroupByInputStruct = this._getParam();
        this.dagNode.setParam(param);
    }

    protected _initialize(paramsRaw, _strictCheck?: boolean) {
        const self = this;

        if (!this._opCategories.length) {
            this._opCategories = [FunctionCategoryT.FunctionCategoryAggregate];
        }
        let argGroups = [];
        // XXX check for all properties

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
                const argInfo: OpPanelArg = new OpPanelArg(argGroup.sourceColumn,
                                        opInfo.argDescs[0].typesAccepted, true);

                argInfo.setCast(argGroup.cast);
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

    protected _getParam(): DagNodeGroupByInputStruct {
        const self = this;
        const aggregates = [];
        this.groups.forEach(group => {
            group.args.forEach(arg => {
                self._formatArg(arg);
            });
            let sourceColumn: string;
            let cast: string;
            if (group.args[0]) {
                sourceColumn = group.args[0].getFormattedValue();
                cast = group.args[0].getCast();
            } else {
                sourceColumn = "";
                cast = null;
            }

            aggregates.push({
                operator: group.operator,
                sourceColumn: sourceColumn,
                destColumn: group.newFieldName,
                distinct: group.distinct,
                cast: cast
            });
        });

        this.groupOnCols.map((colName) => {
            if (colName[0] === gColPrefix) {
                return colName.slice(1);
            } else {
                return colName;
            }
        });

        return {
            groupBy: this.groupOnCols,
            aggregate: aggregates,
            icv: this.icv,
            groupAll: this.groupAll,
            includeSample: this.includeSample,
            newKeys: null
        }
    }

    public validateAdvancedMode(paramStr: string): {error: string} {
        let jsonError = true;
        try {
            const param: DagNodeMapInput = <DagNodeMapInput>JSON.parse(paramStr);
            jsonError = false;

            let error = this.dagNode.validateParam(param);
            if (error != null) {
                return error;
            }

            this._initialize(param, true);
            error = this.validateGroupOnCols();
            if (!error) {
                error = this.validateGroups();
            }
            if (!error) {
                error = this.validateNewFieldNames();
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

    public validateGroupOnCols() {
        if (this.groupAll) {
            return;
        }
        if (!this.groupOnCols.length) {
            return {
                error: "Please provide one or more fields to group by",
                group: 0,
                arg: 0,
                type: "groupOnCol"
            };
        }
        for (let i = 0; i < this.groupOnCols.length; i++) {
            const name = this.groupOnCols[i];
            if (name.indexOf(",") > -1) {
                return {
                    error: xcHelper.replaceMsg(ErrWRepTStr.InvalidCol, {
                                    "name": name
                            }),
                    group: 0,
                    arg: i,
                    type: "groupOnCol"
                };
            } else if (!name.trim().length) {
                return {
                    error: "Field to group by is empty",
                    group: 0,
                    arg: i,
                    type: "groupOnCol"
                };
            } else {
                const match = this.tableColumns.find((progCol) => {
                    return progCol.getBackColName() === name;
                });
                if (!match) {
                    // XXX if not found, let pass
                    console.log(name, "column not found");
                }
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
        return  null;
    }
}