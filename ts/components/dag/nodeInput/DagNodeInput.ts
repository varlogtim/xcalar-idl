class DagNodeInput {
    protected input;

    constructor(inputStruct) {
        inputStruct = inputStruct || {};
        this.setInput(inputStruct);
    }

    public getInput() {
        return this.input;
    }

    public setInput(input) {
        this.input = input;
    }

    public isConfigured(): boolean {
        return (Object.keys(this.input).length > 0);
    }

    public validate(): {error: string} {
        return {error: null};
    }
}