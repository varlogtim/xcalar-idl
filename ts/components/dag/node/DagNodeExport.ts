class DagNodeExport extends DagNode {
    protected input: DagNodeExportInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Export;
        this.maxChildren = 0;
        this.minParents = 1;
    }

    /**
     * @returns {DagNodeExportInput} Export node parameters
     */
    public getParam(): DagNodeExportInput {
        const options: ExportTableOptions = this.input.options || {
            splitType: 2,
            headerType: 1,
            format: 2,
            createRule: 1,
            handleName: "",
            csvArgs: {fieldDelim: "\t", recordDelim: "\n"}
        };
        return {
            exportName: this.input.exportName || "",
            targetName: this.input.targetName || "",
            columns: this.input.columns || [{sourceColumn: "", destColumn: ""}],
            keepOrder: this.input.keepOrder || false,
            options: options
        };
    }

    /**
     * Set export node's parameters
     * @param input {DagNodeExportInput}
     * @param input.exportName {string} Export file/folder's name
     * @param input.targetName {string} Target for exporting
     * @param input.columns export columns's information
     * @param input.keepOrder {boolean} keep the record's order or not
     * @param input.options advanced options for export
     */
    public setParam(input: DagNodeExportInput = <DagNodeExportInput>{}) {
        this.input = {
            exportName: input.exportName,
            targetName: input.targetName,
            columns: input.columns,
            keepOrder: input.keepOrder,
            options: input.options
        }
        super.setParam();
    }
}