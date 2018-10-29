// General Class for Dest Node
abstract class DagNodeOut extends DagNode {
    public constructor(options: DagNodeInfo) {
        super(options);
        this.maxChildren = 0;
        this.minParents = 1;
    }

    public lineageChange(columns: ProgCol[]): DagLineageChange {
        return {
            columns: columns,
            changes: []
        }
    }
}