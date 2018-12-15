// General Class for Source Node
abstract class DagNodeIn extends DagNode {
    protected schema: ColSchema[];

    public constructor(options: DagNodeInInfo) {
        super(options);
        this.maxParents = 0;
        this.minParents = 0;
        if (options && options.schema) {
            this.setSchema(options.schema);
        } else {
            this.setSchema([]);
        }
    }

    public getSchema(): ColSchema[] {
        return this.schema;
    }

    public setSchema(schema: ColSchema[], refresh: boolean = false) {
        this.schema = schema;
        if (refresh) {
            // lineage reset is done in DagView
            this.events.trigger(DagNodeEvents.LineageSourceChange, {
                node: this
            });
        }
    }

    public lineageChange(_columns: ProgCol[]): DagLineageChange {
        const schema: ColSchema[] = this.getSchema(); // DagNodeDataset overide the function
        const columns: ProgCol[] = schema.map((colInfo) => {
            const colName: string = colInfo.name;
            const frontName: string = xcHelper.parsePrefixColName(colName).name;
            return ColManager.newPullCol(frontName, colName, colInfo.type);
        });
        return {
            columns: columns,
            changes: []
        };
    }

    protected _getSerializeInfo(includeStats?: boolean):DagNodeInInfo {
        const serializedInfo: DagNodeInInfo = <DagNodeInInfo>super._getSerializeInfo(includeStats);
        serializedInfo.schema = this.schema; // should save the schema directly, should not call getSchema
        return serializedInfo;
    }
}