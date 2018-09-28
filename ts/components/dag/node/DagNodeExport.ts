class DagNodeExport extends DagNode {
    protected input: DagNodeExportInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.maxChildren = 0;
        this.minParents = 1;
        this.display.icon = "&#xe955;";
    }

    /**
     * @returns {DagNodeExportInput} Export node parameters
     */
    public getParam(): DagNodeExportInput {
        return {
            columns: this.input.columns || [],
            driver: this.input.driver || "",
            driverArgs: this.input.driverArgs || null
        };
    }

    /**
     * Set export node's parameters
     * @param input {DagNodeExportInput}
     * @param input.columns export columns's information
     * @param input.driver {string} Export driver name
     * @param input.driverArgs {ExportDriverArg[]} Driver arguments
     */
    public setParam(input: DagNodeExportInput = <DagNodeExportInput>{}) {
        this.input = {
            columns: input.columns,
            driver: input.driver,
            driverArgs: input.driverArgs
        }
        super.setParam();
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        return {
            columns: [], // export node no need to know lineage
            changes: []
        }
    }
}