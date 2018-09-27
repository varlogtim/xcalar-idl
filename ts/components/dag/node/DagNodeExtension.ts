// XXX this has not been implemented and is simply a clone of Filter
class DagNodeExtension extends DagNode {
    protected input: DagNodeExtensionInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Extension;
        this.allowAggNode = true;
        this.maxParents = -1;
        this.minParents = 1;
    }

    /**
     * @returns {DagNodeExtensionInput} Extension node parameters
     */
    public getParam(): DagNodeExtensionInput {
        return {
            moduleName: this.input.moduleName || "",
            functName: this.input.functName || "",
            args: this.input.args || {}
        };
    }

    /**
     * Set Extension node's parameters
     * @param input {DagNodeExtensionInput}
     * @param input.evalString {string}
     */
    public setParam(input: DagNodeExtensionInput = <DagNodeExtensionInput>{}) {
        this.input = {
            moduleName: input.moduleName,
            functName: input.functName,
            args: input.args
        }
        super.setParam();
    }

    // XXX TODO
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: [],
            changes: []
        }
    }
}