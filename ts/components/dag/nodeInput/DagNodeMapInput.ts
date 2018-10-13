class DagNodeMapInput extends DagNodeInput {
    protected input: DagNodeMapInputStruct;

    public getInput() {
        return {
            eval: this.input.eval || [{evalString: "", newField: ""}],
            icv: this.input.icv || false,
        };
    }
}