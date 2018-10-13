class DagNodeAggregateInput extends DagNodeInput {
    protected input: DagNodeAggregateInputStruct;

    public getInput() {
        return {
            evalString: this.input.evalString || "",
            dest: this.input.dest || ""
        };
    }

    public setEval(evalString) {
        this.input.evalString = evalString;
    }
}