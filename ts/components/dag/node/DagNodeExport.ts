class DagNodeExport extends DagNodeOut {
    protected input: DagNodeExportInput;
    private optimized: boolean;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeExportInput(options.input);
        this.optimized = this.subType === DagNodeSubType.ExportOptimized;
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
}