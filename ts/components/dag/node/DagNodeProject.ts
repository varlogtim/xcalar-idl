class DagNodeProject extends DagNode {
    protected input: DagNodeProjectInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Project;
        this.minParents = 1;
    }

    /**
     * @returns {DagNodeProjectInput} Project node parameters
     */
    public getParam(): DagNodeProjectInput {
        return {
            columns: this.input.columns || [""]
        };
    }

    /**
     * Set project node's parameters
     * @param input {DagNodeProjectInput}
     * @param input.columns {string[]} An array of column names to project
     */
    public setParam(input: DagNodeProjectInput = <DagNodeProjectInput>{}) {
        this.input = {
            columns: input.columns
        }
        super.setParam();
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        const finalCols: ProgCol[] = [];
        const prefixSet: Set<string> = new Set();
        const derivedSet: Set<string> = new Set();

        this.input.columns.forEach((colName) => {
            const parsed: PrefixColInfo = xcHelper.parsePrefixColName(colName);
            if (parsed.prefix) {
                prefixSet.add(parsed.prefix);
            } else {
                derivedSet.add(colName);
            }
        });

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

        return {
            columns: finalCols,
            changes: changes
        }
    }
}