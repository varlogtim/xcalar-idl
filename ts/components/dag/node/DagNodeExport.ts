class DagNodeExport extends DagNode {
    protected input: DagNodeExportInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeExportInput(options.input);
    }


    /**
     * Set export node's parameters
     * @param input {DagNodeExportInputStruct}
     * @param input.columns export columns's information
     * @param input.driver {string} Export driver name
     * @param input.driverArgs {ExportDriverArg[]} Driver arguments
     */
    public setParam(input: DagNodeExportInputStruct = <DagNodeExportInputStruct>{}) {
        this.input.setInput({
            columns: input.columns,
            driver: input.driver,
            driverArgs: input.driverArgs
        });
        super.setParam();
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [], // export node no need to know lineage
            changes: []
        }
    }
}