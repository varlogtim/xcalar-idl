class DagNodeExtension extends DagNode {
    protected input: DagNodeExtensionInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Extension;
        this.allowAggNode = true;
    }

    /**
     * @returns {DagNodeExtensionInput} Extension node parameters
     */
    public getParam(): DagNodeExtensionInput {
        return {
            evalString: this.input.evalString || ""
        };
    }

    /**
     * Set Extension node's parameters
     * @param input {DagNodeExtensionInput}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeExtensionInput = <DagNodeExtensionInput>{}) {
        this.input = {
            evalString: input.evalString
        }
        this.beConfiguredState();
    }
}