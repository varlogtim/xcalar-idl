class DagNodeGroupBy extends DagNode {
    protected input: DagNodeGroupByInput;
    protected joinRenames: any[];

    public constructor(options: DagNodeInfo, runtime?: DagRuntime) {
        super(options, runtime);
        this.type = DagNodeType.GroupBy;
        this.minParents = 1;
        this.display.icon = "&#xe937;";
        this.input = this.getRuntime().accessible(new DagNodeGroupByInput(options.input));
        this.joinRenames = [];
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInputStruct}
     * @param input.keys {string[]} An array of column names to group on
     * @param input.eval an array of column eval info
     * @param includeSample {boolean} include sample columns or not
     */
    public setParam(input: DagNodeGroupByInputStruct = <DagNodeGroupByInputStruct>{}, noAutoExecute?: boolean) {
        if (input.joinBack) {
            input.includeSample = false;
        }
        this.input.setInput({
            groupBy: input.groupBy,
            aggregate: input.aggregate,
            includeSample: input.includeSample,
            joinBack: input.joinBack,
            icv: input.icv,
            groupAll: input.groupAll,
            newKeys: input.newKeys,
            dhtName: input.dhtName
        });
        super.setParam(null, noAutoExecute);
    }

    // XXX TODO: verify it's correctness
    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: DagColumnChange[] = [];
        const aggCols: ProgCol[] = [];
        let finalCols: ProgCol[] = [];
        const input = this.input.getInput(replaceParameters);
        input.aggregate.forEach((aggInfo) => {
            const colName: string = aggInfo.destColumn;
            if (xcHelper.parsePrefixColName(colName).prefix) {
                throw new Error("columns generated by map cannot have prefix");
            }
            const colType: ColumnType = this._getAggColType(aggInfo.operator);
            const progCol: ProgCol = ColManager.newPullCol(colName, colName, colType);
            aggCols.push(progCol);
            changes.push({
                from: null,
                to: progCol
            });
        });

        if (input.includeSample) {
            finalCols = aggCols.concat(columns);
        } else {
            const colMap: Map<string, ProgCol> = new Map();
            columns.forEach((progCol) => {
                const colName: string = progCol.getBackColName();
                colMap.set(colName, progCol);
            });
            const groupCols: ProgCol[] = [];
            const newKeys: string[] = this.updateNewKeys(input.newKeys);

            input.groupBy.forEach((colName, index) => {
                const oldProgCol: ProgCol = colMap.get(colName);
                let colType: ColumnType;
                if (oldProgCol == null) {
                    // if newly parameterized, won't show up in colMap
                    colType = ColumnType.unknown;
                    if (colName.indexOf("<") === -1) {
                        return;
                    }
                } else {
                    colType = oldProgCol.getType();
                }
                const newKey: string = newKeys[index];
                if (colName !== newKey) {
                    const progCol: ProgCol = ColManager.newPullCol(newKey, newKey, colType);
                    groupCols.push(progCol);
                    changes.push({
                        from: oldProgCol,
                        to: progCol
                    });
                } else {
                    groupCols.push(oldProgCol);
                }
                colMap.delete(colName);
            });
            finalCols = aggCols.concat(groupCols);
            for (let progCol of colMap.values()) {
                if (input.joinBack) {
                    finalCols.push(progCol);
                } else {
                    changes.push({
                        from: progCol,
                        to: null
                    });
                }
            }

            if (!input.joinBack) {
                let hiddenColumns = this.lineage.getHiddenColumns();
                hiddenColumns.forEach((progCol, colName) => {
                    hiddenColumns.delete(colName);
                    changes.push({
                        from: progCol,
                        to: null,
                        hidden: true
                    });
                });
            }
        }

        return {
            columns: finalCols,
            changes: changes
        }
    }

    // loop through groupby columns and make sure there's a corresponding
    // new key name for each one that is not taken by another column
    public updateNewKeys(keys: string[]): string[] {
        const takenNames: Set<string> = new Set();
        const input = this.input.getInput();
        const oldNewKeys = keys || [];
        oldNewKeys.forEach((key) => {
            takenNames.add(key);
        });

        input.aggregate.forEach((aggInfo) => {
            takenNames.add(aggInfo.destColumn);
        });
        const parsedGroupByCols: PrefixColInfo[] = input.groupBy.map(xcHelper.parsePrefixColName);
        parsedGroupByCols.forEach((parsedCol) => {
            if (!parsedCol.prefix) {
                takenNames.add(parsedCol.name);
            }
        });

        const seen: Set<string> = new Set();
        const newKeys: string[] = parsedGroupByCols.map((parsedCol, index) => {
            if (oldNewKeys[index] && !seen.has(oldNewKeys[index])) {
                seen.add(oldNewKeys[index]);
                return oldNewKeys[index];
            }
            if (!parsedCol.prefix && !seen.has(parsedCol.name)) {
                // immediate
                seen.add(parsedCol.name);
                return parsedCol.name;
            } else {
                // prefix
                let name: string = xcHelper.stripColName(parsedCol.name, false);
                if (!takenNames.has(name) && !seen.has(name)) {
                    seen.add(name);
                    return name;
                }

                name = xcHelper.convertPrefixName(parsedCol.prefix, name);
                let newName: string = name;
                if (!takenNames.hasOwnProperty(newName) && !seen.has(newName)) {
                    seen.add(newName);
                    return newName;
                }
                const finalName = xcHelper.randName(name);
                seen.add(finalName);
                return finalName;
            }
        });

        this.joinRenames = [];
        if (input.joinBack) {
            newKeys.forEach((newKey) => {
                if (input.groupBy.indexOf(newKey) > -1) {
                    const newName: string = xcHelper.randName(newKey + "_GB", 5);
                    const renameMap: ColRenameInfo = xcHelper.getJoinRenameMap(newKey, newName);
                    this.joinRenames.push(renameMap);
                }
            });
        }
        return newKeys;
    }

    public getJoinRenames() {
        return this.joinRenames;
    }

    /**
     * @override
     * @returns {string}
     */
    public getDisplayNodeType(): string {
        return "Group By";
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeGroupByInputStruct = this.getParam();
        if (input.groupBy.length) {
            hint += "Group by " + input.groupBy.join(",") + "\n";
        }
        if (input.aggregate.length) {
            hint += "having ";
            hint += input.aggregate.map((agg) => {
                return `${agg.operator}(${agg.sourceColumn})`;
            }).join(", ");
        }
        return hint;
    }

    // provided a renameMap, change the name of columns used in arguments
    public applyColumnMapping(renameMap): void {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        const input = this.input.getInput();
        try {
            input.groupBy.forEach((val, i) => {
                if (renameMap.columns[val]) {
                    input.groupBy[i] = renameMap.columns[val];
                    delete newRenameMap.columns[val];
                    // this column gets renamed so we don't need to map it
                    // anymore
                    // XXX decide if we want to rename the newKey as well
                } else {
                    input.groupBy[i] = this._replaceColumnInEvalStr(val,
                                                renameMap.columns);
                }
            });
            this.input.setGroupBy(input.groupBy);
            input.aggregate.forEach((agg, i) => {
                if (renameMap.columns[agg.sourceColumn]) {
                    input.aggregate[i].sourceColumn = renameMap.columns[agg.sourceColumn];
                } else {
                    input.aggregate[i].sourceColumn = this._replaceColumnInEvalStr(agg.sourceColumn,
                                                renameMap.columns);
                }
            });
            this.input.setAggregate(input.aggregate);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
        return newRenameMap;
    }

    // used for validating lineage
    protected _getColumnsUsedInInput(): Set<string> {
        const input: DagNodeGroupByInputStruct = this.input.getInput();
        const set: Set<string> = new Set();
        input.groupBy.forEach((colName) => {
            set.add(colName);
        });
        const aggArgs: AggColInfo[] = input.aggregate.map((aggInfo) => {
            return {
                operator: aggInfo.operator,
                aggColName: aggInfo.sourceColumn,
                newColName: aggInfo.destColumn,
                isDistinct: aggInfo.distinct
            }
        });
        aggArgs.forEach((aggInfo) => {
            const evalString: string = DagNode.getGroupByAggEvalStr(aggInfo);
            const arg = XDParser.XEvalParser.parseEvalStr(evalString);
            this._getColumnFromEvalArg(arg, set);
        });
        return set;
    }

    private _getAggColType(operator: string): ColumnType {
        let colType: ColumnType = null;
        const opsMap = this.getRuntime().getXDFService().getOperatorsMap();
        const ops = opsMap[FunctionCategoryT.FunctionCategoryAggregate];
        // XXX: SDK needs this
        if (typeof ops === 'undefined') {
            return colType;
        }
        const opInfo = ops[operator];
        if (opInfo) {
            colType = xcHelper.convertFieldTypeToColType(opInfo.outputType);
        }
        return colType;
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeGroupBy = DagNodeGroupBy;
};
