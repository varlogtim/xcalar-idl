class DagNodeAggregate extends DagNode {
    protected input: DagNodeAggregateInput;
    private aggVal: string | number; // non-persistent
    private graph: DagGraph; // non-persistent

    public constructor(options: DagNodeAggregateInfo) {
        super(options);
        this.type = DagNodeType.Aggregate;
        this.allowAggNode = true;
        this.aggVal = options.aggVal || null;
        this.graph = options.graph || null;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe939;";
        this.input = new DagNodeAggregateInput(options.input);
    }

    /**
     * Set aggregate node's parameters
     * @param input {DagNodeAggregateInputStruct}
     * @param input.evalString {string} The aggregate eval string
     */
    public setParam(input: DagNodeAggregateInputStruct = <DagNodeAggregateInputStruct>{}) {
        this.input.setInput({
            evalString: input.evalString,
            dest: input.dest
        });
        let promise = PromiseHelper.resolve();
        let oldAggName = this.getParam().dest;
        if (oldAggName != null && oldAggName != input.dest &&
                DagAggManager.Instance.hasAggregate(oldAggName)) {
            let oldAgg = DagAggManager.Instance.getAggregate(oldAggName);
            if (oldAgg.value != null) {
                promise = DagAggManager.Instance.removeNode(this.aggVal);
            } else {
                // We never ran it
                promise = DagAggManager.Instance.removeAgg(this.aggVal);
            }
        }
        PromiseHelper.alwaysResolve(promise)
        .then(() => {
            return DagAggManager.Instance.addAgg(input.dest, {
                value: null,
                dagName: input.dest,
                aggName: input.dest,
                tableId: null,
                backColName: null,
                op: null,
                node: this.getId(),
                graph: this.graph.getTabId()
            });
        })

        super.setParam();
    }

    /**
     *
     * @param aggVal {string | number} Set the aggregate result
     */
    public setAggVal(aggVal: string | number): void {
        this.aggVal = aggVal;
    }

    /**
     * @returns {string | number} Return the aggreate result
     */
    public getAggVal(): string | number {
        return this.aggVal;
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [],
            changes: []
        };
    }

    public applyColumnMapping(renameMap): void {
        try {
            this.input.setEval(this._replaceColumnInEvalStr(this.input.getInput().evalString,
                                                            renameMap.columns));
        } catch(err) {
            console.error(err);
        }
        super.setParam(null, true);
    }

    protected _clearConnectionMeta(): void {
        super._clearConnectionMeta();
        this.setAggVal(null);
    }

    protected _getSerializeInfo():DagNodeAggregateInfo {
        const serializedInfo: DagNodeAggregateInfo = <DagNodeAggregateInfo>super._getSerializeInfo();
        if (this.aggVal != null) {
            serializedInfo.aggVal = this.aggVal;
        }
        return serializedInfo;
    }

    /**
     * @override
     */
    protected _genParamHint(): string {
        let hint: string = "";
        const input: DagNodeAggregateInputStruct = this.getParam();
        if (input.evalString && input.dest) {
            hint = `${input.dest}: ${input.evalString}`;
        }
        return hint;
    }
}