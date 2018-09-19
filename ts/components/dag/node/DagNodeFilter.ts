class DagNodeFilter extends DagNode {
    protected input: DagNodeFilterInput;
    private _aggregates: Map<number, string>;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
        this.minParents = 1;
        this._aggregates = new Map<number,string>();
    }

        /**
     * @returns {Map<number, string>} used aggregates
     */
    public getAggregates(): Map<number, string> {
        return this._aggregates;
    }

    /**
     * Sets the aggregates for this node
     * @param aggregates 
     */
    public setAggregates(aggregates: Map<number, string>): void {
        this._aggregates = aggregates;
        // TODO: Update how used aggregates are shown
    }

    /**
     * @returns {DagNodeFilterInput} Filter node parameters
     */
    public getParam(): DagNodeFilterInput {
        return {
            evalString: this.input.evalString || "",
        };
    }

    /**
     * Set filter node's parameters
     * @param input {DagNodeFilterInput}
     * @param input.evalString {string} The filter eval string
     */
    public setParam(input: DagNodeFilterInput = <DagNodeFilterInput>{}) {
        this.input = {
            evalString: input.evalString,
        }
        super.setParam();
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            this.input.evalString = this._replaceColumnInEvalStr(this.input.evalString,
                                                            renameMap.columns);
        } catch(err) {
            console.error(err);
        }
        super.setParam();
    }
}
