/* XXX TODO: The current extension node is a quick implementation
to fit the old extension architecture into DF 2.0.
In next step, Extension should combine with the custom node,
this will require the ability to anti comiple a xcalar query into
DF 2.0 operators. Once this is possible, extension(aka custome) can be
built by:
1. run Extension trigger function after parameter is configure
2. comiple the xcalarQuery into DF 2.0 operators
3. build the custome node
*/
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

    // XXX TODO: This is a hack now, should check if all the extension
    // we have can apply this, otherwise need to change
    public lineageChange(columns: ProgCol[]): DagLineageChange {
        const changes: {from: ProgCol, to: ProgCol}[] = [];
        // const args: object = this.input.args;
        // const isColumnArg = (arg: any): boolean => {
        //     return typeof arg === "object" && arg["triggerColumn"] != null;
        // };
        // const getCols = (arg: object): ProgCol[] => {
        //     const triggerColumn = arg["triggerColumn"]
        //     const cols: {name: string, type: ColumnType}[] = triggerColumn instanceof Array ?
        //     triggerColumn : [triggerColumn];
        //     return cols.map((col) => ColManager.newPullCol(col.name, col.name, col.type));
        // };

        // let progCols: ProgCol[] = [];
        // for (let key in args) {
        //     const val: any = args[key];
        //     if (val instanceof Array) {
        //         val.forEach((subArg) => {
        //             if (isColumnArg(subArg)) {
        //                 progCols = progCols.concat(getCols(subArg));
        //             }
        //         });
        //     } else if (isColumnArg(val)) {
        //         progCols = progCols.concat(getCols(val));
        //     }
        // }
        // progCols.forEach((progCol) => {
        //     columns.push(progCol);
        //     changes.push({
        //         from: null,
        //         to: progCol
        //     });
        // });
        return {
            columns: columns,
            changes: changes
        }
    }
}