class DagNodeFilter extends DagNode {
    protected input: DagNodeFilterInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Filter;
        this.allowAggNode = true;
        this.minParents = 1;
        this.display.icon = "&#xe938;";
        this.input = new DagNodeFilterInput(options.input);
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
        super.setParam(null, true);
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeFilterInputStruct = this.getParam();
        if (input.evalString) {
            hint = input.evalString;
        }
        return hint;
    }

    protected _getColumnsUsedInInput(): Set<string> {
        const evalString: string = this.input.getInput().evalString;
        const arg = XDParser.XEvalParser.parseEvalStr(evalString);
        const set: Set<string> = new Set();
        this._getColumnFromEvalArg(arg, set);
        return set;
    }
}
