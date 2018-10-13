class DagNodeSetInput extends DagNodeInput {
    protected input: DagNodeSetInputStruct;
    private dagNode;

    constructor(inputStruct, dagNode) {
        super(inputStruct);
        this.dagNode = dagNode;
    }

    public getInput() {
        let columns = this.input.columns;
        if (columns == null) {
            columns = this.dagNode.getParents().map(() => {
                return [{
                    sourceColumn: "",
                    destColumn: "",
                    columnType: ColumnType.string,
                    cast: false
                }]
            });
        }
        return {
            unionType: this.input.unionType || UnionType.Union,
            columns: this.input.columns || columns,
            dedup: this.input.dedup || false
        };
    }
}