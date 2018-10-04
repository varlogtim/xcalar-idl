class DagNodeFilter extends DagNode {
    protected input: DagNodeFilterInput;
    private _aggregates: string[];

    public constructor(options: DagNodeFilterInfo) {
        super(options);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
        this.minParents = 1;
        this._aggregates = options.aggregates || [];
        this.display.icon = "&#xe938;";
        const namedAggs = Aggregates.getNamedAggs();
        const self = this;
        let errorAggs = [];
        this._aggregates.forEach((aggregateName: string) => {
            if (!namedAggs[aggregateName.substring(1)]) {
                errorAggs.push(aggregateName);
            }
        });
        if (errorAggs.length) {
            self.beErrorState(StatusMessageTStr.AggregateNotExist + errorAggs);
        }
    }

        /**
     * @returns {string[]} used aggregates
     */
    public getAggregates(): string[] {
        return this._aggregates;
    }

    /**
     * Sets the aggregates for this node
     * @param aggregates
     */
    public setAggregates(aggregates: string[]): void {
        this._aggregates = aggregates;
        super.setAggregates(aggregates);
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

    protected _getSerializeInfo(): DagNodeFilterInfo {
        let info = super._getSerializeInfo();
        info['aggregates'] = this._aggregates;
        return info;
    }
}
