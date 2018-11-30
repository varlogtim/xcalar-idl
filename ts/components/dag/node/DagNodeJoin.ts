class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options?: DagNodeInfo) {
        options = options || <DagNodeInfo>{};
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
        this.minParents = 2;
        this.display.icon = "&#xe93e;";
        this.input = new DagNodeJoinInput(<DagNodeJoinInputStruct>options.input, this);
    }

    /**
     * Set join node's parameters
     * @param input {DagNodeJoinInputStruct}
     * @param input.joinType {string} Join type
     * @param input.columns column infos from left table and right table
     * @param input.evalString {string} Optional, eavlString in join
     */
    public setParam(input: DagNodeJoinInputStruct = <DagNodeJoinInputStruct>{}) {
        this.input.setInput({
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString
        });
        super.setParam();
    }

    // XXX TODO: verify it's correctness
    public lineageChange(
        _columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const param = this.input.getInput(replaceParameters);
        const parents: DagNode[] = this.getParents();
        const lCols: ProgCol[] = parents[0].getLineage().getColumns(replaceParameters);
        const lChanges: DagLineageChange = this._getColAfterJoin(lCols, this.input.getInput(replaceParameters).left);
        if (this._isSkipRightTable(param.joinType)) {
            return {
                columns: lChanges.columns,
                changes: lChanges.changes
            };
        } else {
            const rCols: ProgCol[] = parents[1].getLineage().getColumns(replaceParameters);
            const rChanges: DagLineageChange = this._getColAfterJoin(rCols, this.input.getInput(replaceParameters).right);
            return {
                columns: lChanges.columns.concat(rChanges.columns),
                changes: lChanges.changes.concat(rChanges.changes)
            };
        }
    }

    public applyColumnMapping(renameMap, index: number): {} {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        const input = this.input.getInput();
        try {
            let side: string;
            if (index === 0) {
                side = "left";
            } else {
                side = "right";
            }
            input.evalString = this._replaceColumnInEvalStr(input.evalString, renameMap.columns);
            input[side].columns.forEach((columnName, i) => {
                if (renameMap.columns[columnName]) {
                    input[side].columns[i] = renameMap.columns[columnName];
                }
            });
            input[side].rename.forEach((renameInfo) => {
                if (renameInfo.prefix) {
                    const originalPrefix = renameInfo.sourceColumn;
                    if (renameMap.prefixes[originalPrefix]) {
                        delete newRenameMap.prefixes[renameInfo.sourceColumn];
                        renameInfo.sourceColumn = renameMap.prefixes[originalPrefix];
                        const originalRenamedPrefix = renameInfo.destColumn;

                        // mapping: a::classid -> x::teacherId
                        // join renamed prefix "a" to "b"
                        // new mapping: b::classId -> b::teacherId

                        // go through each column that matches same prefix
                        // and updated the new renameMap with the
                        // renamed prefix
                        for (let oldColName in newRenameMap.columns) {
                            const oldParsedColName = xcHelper.parsePrefixColName(oldColName);
                            if (oldParsedColName.prefix === originalPrefix) {
                                const newParsedColName = xcHelper.parsePrefixColName(newRenameMap.columns[oldColName]);
                                const prevColName = xcHelper.getPrefixColName(originalRenamedPrefix, oldParsedColName.name);// "b::classId"
                                const newDestColName = xcHelper.getPrefixColName(originalRenamedPrefix, newParsedColName.name);// "b::teacherId"
                                delete newRenameMap.columns[oldColName];
                                newRenameMap.columns[prevColName] = newDestColName;
                            }
                        }
                    }
                } else {
                    if (renameMap.columns[renameInfo.sourceColumn]) {
                        const prevColName = renameInfo.sourceColumn;
                        renameInfo.sourceColumn = renameMap.columns[prevColName];
                        delete newRenameMap.columns[prevColName];
                    }
                }
            });
            this.input.setInput(input);
        } catch(err) {
            console.error(err);
        }

        super.setParam(null, true);
        return newRenameMap;
    }

    /**
     * Check if the joinType is converted from node subType
     */
    public isJoinTypeConverted(): boolean {
        return this.input.isJoinTypeConverted();
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeJoinInputStruct = this.getParam();
        if (input.joinType) {
            hint = xcHelper.capitalize(input.joinType);
            hint += " " + input.left.columns.join(", ") + "\n";
            hint += "with " + input.right.columns.join(", ") + "\n";
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const set: Set<string> = new Set();
        const input: DagNodeJoinInputStruct = this.getParam();
        this._getColumnsFromJoinTableInput(input.left, set);
        this._getColumnsFromJoinTableInput(input.right, set);
        return set;
    }

    private _isSkipRightTable(joinType: string) {
        const noRenameType: Set<string> = new Set([
            JoinCompoundOperatorTStr.LeftSemiJoin,
            JoinCompoundOperatorTStr.LeftAntiSemiJoin
        ]);
        return noRenameType.has(joinType);
    }

    private _getColAfterJoin(
        columns: ProgCol[],
        joinInput: DagNodeJoinTableInput
    ): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const colMap: Map<string, ProgCol> = new Map();
        const joinedColSet: Set<string> = new Set();

        columns.forEach((progCol) => {
            colMap.set(progCol.getBackColName(), progCol);
        });

        // 1. Get join cols
        const joinedCols: ProgCol[] = joinInput.columns.map((colName, index) => {
            joinedColSet.add(colName);
            const colType: ColumnType = joinInput.casts[index] || colMap.get(colName).getType();
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            return ColManager.newPullCol(frontName, colName, colType);
        });

        // 2, Get other cols
        const otherCols: ProgCol[] = columns.filter((progCol) => {
            return !joinedColSet.has(progCol.getBackColName());
        });

        // 3. combine joined cols and other cols
        let finalCols: ProgCol[] = joinedCols.concat(otherCols);

        // 4. rename columns
        for (let i = 0; i < finalCols.length; i++) {
            const progCol: ProgCol = finalCols[i];
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(progCol.getBackColName());
            for (let j = 0; j < joinInput.rename.length; j++) {
                const renameInfo = joinInput.rename[j];
                if (renameInfo.prefix) {
                    if (parsed.prefix === renameInfo.sourceColumn) {
                        const newName: string = xcHelper.getPrefixColName(renameInfo.destColumn, parsed.name);
                        const oldProgCol: ProgCol = finalCols[i];
                        const newProgCol: ProgCol = ColManager.newPullCol(parsed.name, newName, progCol.getType());
                        finalCols[i] = newProgCol;
                        changes.push({
                            from: oldProgCol,
                            to: newProgCol
                        });
                        break; // stop second-level loop
                    }
                } else {
                    if (!parsed.prefix && parsed.name === renameInfo.sourceColumn) {
                        const newName: string = renameInfo.destColumn;
                        const oldProgCol: ProgCol = finalCols[i];
                        const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, progCol.getType());
                        finalCols[i] = newProgCol;
                        changes.push({
                            from: oldProgCol,
                            to: newProgCol
                        });
                        break; // stop second-level loop
                    }
                }
            }
        }

        return {
            columns: finalCols,
            changes: changes
        };
    }

    private _getColumnsFromJoinTableInput(
        tableInput: DagNodeJoinTableInput,
        set: Set<string>
    ): void {
        if (tableInput == null) {
            return;
        }
        if (tableInput.columns != null) {
            tableInput.columns.forEach((colName) => {
                set.add(colName);
            });
        }
        
        if (tableInput.rename != null) {
            tableInput.rename.forEach((renameInfo) => {
                if (renameInfo != null && !renameInfo.prefix) {
                    set.add(renameInfo.sourceColumn);
                }
            });
        }
    }

}