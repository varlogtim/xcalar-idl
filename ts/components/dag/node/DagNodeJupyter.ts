class DagNodeJupyter extends DagNodeOut {
    protected input: DagNodeJupyterInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Jupyter;
        this.maxParents = 1;
        this.display.icon = "&#xe955;";
        this.input = new DagNodeJupyterInput(<DagNodeJupyterInputStruct>options.input);
    }

    public setParam(input: DagNodeJupyterInputStruct = <DagNodeJupyterInputStruct>{}) {
        this.input.setInput({
            numExportRows: input.numExportRows,
            renames: input.renames.map((v) => ({
                sourceColumn: v.sourceColumn,
                destColumn: v.destColumn
            }))
        });
        super.setParam();
    }

    public lineageChange(
        columns: ProgCol[], replaceParameters?: boolean
    ): DagLineageChange {
        return {
            columns: [],
            changes: []
        };
    }
}