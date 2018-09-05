class DagNodeJoin extends DagNode {
    protected input: DagNodeJoinInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Join;
        this.maxParents = 2;
        this.minParents = 2;
    }

    /**
     * @returns {DagNodeJoinInput} Join node parameters
     */
    public getParam(): DagNodeJoinInput {
        return {
            joinType: this.input.joinType || JoinOperatorTStr[JoinOperatorT.InnerJoin],
            left: this.input.left || this._getDefaultTableInfo(),
            right: this.input.right || this._getDefaultTableInfo(),
            evalString: this.input.evalString || ""
        };
    }

    /**
     * Set join node's parameters
     * @param input {DagNodeJoinInput}
     * @param input.joinType {string} Join type
     * @param input.columns column infos from left table and right table
     * @param input.evalString {string} Optional, eavlString in join
     */
    public setParam(input: DagNodeJoinInput = <DagNodeJoinInput>{}) {
        this.input = {
            joinType: input.joinType,
            left: input.left,
            right: input.right,
            evalString: input.evalString
        }
        super.setParam();
    }

    // XXX TODO: verify it's correctness
    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const parents: DagNode[] = this.getParents();
        const lCols: ProgCol[] = parents[0].getLineage().getColumns();
        const rCols: ProgCol[] = parents[1].getLineage().getColumns();
        const lChanges: DagLineageChange = this._getColAfterJoin(lCols, this.input.left);
        const rChanges: DagLineageChange = this._getColAfterJoin(rCols, this.input.right);
        return {
            columns: lChanges.columns.concat(rChanges.columns),
            changes: lChanges.changes.concat(rChanges.changes)
        };
    }

    private _getDefaultTableInfo(): DagNodeJoinTableInput {
        return {
            columns: [""],
            casts: [null],
            rename: [{sourceColumn: "", destColumn: "", prefix: false}]
        }
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
}