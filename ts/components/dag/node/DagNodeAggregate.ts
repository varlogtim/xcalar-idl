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
        let dest = this.input.getInput().dest;
        if (dest != "" &&
                !DagAggManager.Instance.hasAggregate(dest) &&
                !dest.startsWith("^XC_SUBQ_")) {
            // If we upload a dataflow we need to add the relevant aggregates to the agg manager
            // We make sure to not add sql aggregates
            let dest: string = this.input.getInput().dest;
            DagAggManager.Instance.addAgg(dest, {
                value: null,
                dagName: dest,
                aggName: dest,
                tableId: null,
                backColName: null,
                op: null,
                node: this.getId(),
                graph: this.graph.getTabId()
            });
        }
    }

    public static readonly specificSchema = {
        "definitions": {},
        "$schema": "http://json-schema.org/draft-07/schema#",
        "$id": "http://example.com/root.json",
        "type": "object",
        "additionalProperties": true,
        "required": [
          "parents"
        ],
        "properties": {
          "parents": {
            "$id": "#/properties/parents",
            "type": "array",
            "maxItems": 1,
            "items": {
              "$id": "#/properties/parents/items",
              "type": "string",
              "pattern": "^(.*)$"
            }
          }
        }
    };

    /**
     * Set aggregate node's parameters
     * @param input {DagNodeAggregateInputStruct}
     * @param input.evalString {string} The aggregate eval string
     */
    public setParam(input: DagNodeAggregateInputStruct = <DagNodeAggregateInputStruct>{}) {
        this.input.setInput({
            evalString: input.evalString,
            dest: input.dest,
            mustExecute: input.mustExecute
        });
        let promise = PromiseHelper.resolve();
        let oldAggName = this.getParam().dest;
        if (oldAggName != null && oldAggName != input.dest &&
                DagAggManager.Instance.hasAggregate(oldAggName)) {
            let oldAgg = DagAggManager.Instance.getAgg(oldAggName);
            if (oldAgg.value != null) {
                promise = DagAggManager.Instance.removeNode(oldAggName);
            } else {
                // We never ran it
                promise = DagAggManager.Instance.removeAgg(oldAggName);
            }
        } else if (oldAggName != null && oldAggName == input.dest &&
                DagAggManager.Instance.hasAggregate(oldAggName)) {
            let oldAgg = DagAggManager.Instance.getAgg(oldAggName);
            if (oldAgg.value != null) {
                // We're replacing the value so we need to delete it
                promise = DagAggManager.Instance.removeAgg(oldAggName, true);
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

    protected _getSerializeInfo(includeStats?: boolean):DagNodeAggregateInfo {
        const serializedInfo: DagNodeAggregateInfo = <DagNodeAggregateInfo>super._getSerializeInfo(includeStats);
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

    protected _getColumnsUsedInInput(): Set<string> {
        const evalString: string = this.input.getInput().evalString;
        const arg = XDParser.XEvalParser.parseEvalStr(evalString);
        const set: Set<string> = new Set();
        this._getColumnFromEvalArg(arg, set);
        return set;
    }
}