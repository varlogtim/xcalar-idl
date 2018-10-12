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
        this.input = new DagNodeFilterInput(options.input);
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
     * Set filter node's parameters
     * @param input {DagNodeFilterInputStruct}
     * @param input.evalString {string} The filter eval string
     */
    public setParam(input: DagNodeFilterInputStruct = <DagNodeFilterInputStruct>{}) {
        this.input.setInput({
            evalString: input.evalString,
        });
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
            const evalStr = this.input.getInput().evalString;
            this.input.setEvalStr(this._replaceColumnInEvalStr(evalStr,
                                                            renameMap.columns));
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
