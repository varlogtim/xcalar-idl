class DagNodeProject extends DagNode {
    protected input: DagNodeProjectInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Project;
        this.minParents = 1;
        this.display.icon = "&#xe9d7;";
        this.input = new DagNodeProjectInput(options.input);
    }

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInputStruct}
     * @param input.columns {string[]} An array of column names to project
     */
    public setParam(input: DagNodeProjectInputStruct = <DagNodeProjectInputStruct>{}) {
        this.input.setInput({
            columns: input.columns
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[],
        replaceParameters?: boolean
    ): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const finalCols: ProgCol[] = [];
        const prefixSet: Set<string> = new Set();
        const derivedSet: Set<string> = new Set();

        this.input.getInput(replaceParameters).columns.forEach((colName) => {
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix) {
                prefixSet.add(parsed.prefix);
            } else {
                derivedSet.add(colName);
            }
        });

        if (columns != null) {
            columns.forEach((progCol) => {
                const colName: string = progCol.getBackColName();
                const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
                const keep: boolean = parsed.prefix ?
                prefixSet.has(parsed.prefix) : derivedSet.has(colName);
                if (keep) {
                    finalCols.push(progCol);
                } else {
                    changes.push({
                        from: progCol,
                        to: null
                    });
                }
            });
        }

        return {
            columns: finalCols,
            changes: changes
        }
    }

    public applyColumnMapping(renameMap): void {
        const input = this.input.getInput();
        try {
            input.columns.forEach((columnName, i) => {
                if (renameMap.columns[columnName]) {
                    input.columns[i] = renameMap.columns[columnName];
                }
            });
            this.input.setColumns(input.columns);
        } catch(err) {
            console.error(err);
        }
        super.setParam();
    }
}