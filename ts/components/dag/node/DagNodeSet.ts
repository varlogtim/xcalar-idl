class DagNodeSet extends DagNode {
    protected input: DagNodeSetInput;

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Set;
        this.maxParents = -1;
    }

    /**
     * @returns {DagNodeSetInput} Set(union/except/intersect) node parameters
     */
    public getParam(): DagNodeSetInput {
        return {
            unionType: this.input.unionType || UnionType.Union,
            columns: this.input.columns || [[{
                sourceColumn: "",
                destColumn: "",
                columnType: ColumnType.string,
                cast: false}
            ]],
            dedup: this.input.dedup || false
        };
    }

    /**
     * Set set(union/except/intersect) node's parameters
     * @param input {DagNodeSetInput}
     * @param input.unionType {string} Join't type
     * @param input.columns tables' column infos
     * @param input.dedup {boolean} Remove deduplicate rows or not
     */
    public setParam(input: DagNodeSetInput = <DagNodeSetInput>{}) {
        this.input = {
            unionType: input.unionType,
            columns: input.columns,
            dedup: input.dedup
        }
    }
}