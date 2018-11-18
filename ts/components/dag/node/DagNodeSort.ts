class DagNodeSort extends DagNode {
    protected input: DagNodeSortInput;
    protected columns: ProgCol[];

    public constructor(options: DagNodeInfo) {
        super(options);
        this.minParents = 1;
        this.input = new DagNodeSortInput(options.input);
        this.display.icon = "&#xe921;";
    }

     /**
     * Set sort node's parameters
     * @param input {DagNodeMapInputStruct}
     */
    public setParam(input: DagNodeSortInputStruct = <DagNodeSortInputStruct>{}) {
        this.input.setInput({
            columns: input.columns
        });
        this._updateNewKeys();
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const input = this.input.getInput(replaceParameters);
        const allCols: ProgCol[] = [];
        const orderedCols: Map<string, string> = new Map();

        input.columns.forEach((col, index) => {
            orderedCols.set(col.columnName, input.newKeys[index]);
        });

        columns.forEach((progCol) => {
            const oldName: string = progCol.getBackColName();
            if (orderedCols.has(oldName)) {
                const newName: string = orderedCols.get(oldName);
                if (newName !== oldName) {
                    const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, progCol.getType());
                    allCols.push(newProgCol);
                    changes.push({
                        from: progCol,
                        to: newProgCol
                    });
                } else {
                    allCols.push(progCol);
                }
                orderedCols.delete(oldName);
            } else {
                allCols.push(progCol);
            }
        });

        // sorted columns that weren't found amongst existing columns
        // either through a new name or param
        orderedCols.forEach((newName, _oldName) => {
            const newProgCol: ProgCol = ColManager.newPullCol(newName, newName, ColumnType.unknown);
            allCols.push(newProgCol);
            changes.push({
                from: null,
                to: newProgCol
            });
        });

        return {
            columns: allCols,
            changes: changes
        }
    }

    public applyColumnMapping(renameMap): void {
        const newRenameMap = xcHelper.deepCopy(renameMap);
        try {
            const cols = this.input.getInput().columns;
            cols.forEach(col => {
                if (renameMap.columns[col.columnName]) {
                    col.columnName = renameMap.columns[col.columnName];
                    delete newRenameMap.columns[col.columnName];
                }
            });
            this.input.setColumns(cols);
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
        return newRenameMap;
    }


    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeSortInputStruct = this.getParam();
        if (input.columns.length) {
            const colInfos = input.columns.map((col) => col.columnName + ": " + col.ordering);
            hint = colInfos.join(", ");
        }
        return hint;
    }

    // loop through sort columns and make sure there's a corresponding
    // output name for each one that is not taken by another column
    private _updateNewKeys(): void {
        const takenNames: Set<string> = new Set();
        const input = <DagNodeSortInputStruct>this.input.getInput();
        const oldNewKeys = input.newKeys || [];
        oldNewKeys.forEach((key) => {
            takenNames.add(key);
        });

        const parsedCols: PrefixColInfo[] = input.columns.map((col) => {
            return xcHelper.parsePrefixColName(col.columnName);
        });
        parsedCols.forEach((parsedCol) => {
            if (!parsedCol.prefix) {
                takenNames.add(parsedCol.name);
            }
        });

        // don't allow existing column names to be reused in new keys
        const parents = this.getParents();
        if (parents != null) {
            for (const parent of parents) {
                if (parent == null) {
                    continue;
                }
                for (const col of parent.getLineage().getColumns()) {
                    takenNames.add(col.getBackColName());
                }
            }
        }

        const seen: Set<string> = new Set();
        const newKeys: string[] = parsedCols.map((parsedCol, index) => {
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
        this.input.setNewKeys(newKeys);
    }
}