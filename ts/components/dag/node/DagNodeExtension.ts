// XXX this has not been implemented and is simply a clone of Filter
class DagNodeExtension extends DagNode {
    protected input: DagNodeExtensionInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Extension;
        this.allowAggNode = true;
        this.minParents = 1;
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
        super.setParam();
    }
}