class DagCategoryNode {
    protected categoryType: DagCategoryType;
    protected nodeSubType: string | null;
    protected node;
    public constructor(node: DagNode, categoryType: DagCategoryType) {
        this.node = node;
        this.categoryType = categoryType;
    }

    public getCategoryType(): DagCategoryType {
        return this.categoryType;
    }

    public getNode(): DagNode {
        return this.node;
    }

    public getNodeType(): string {
        return this.node.getType();
    }

    public getDisplayNodeType(): string {
        const nodeType: string = this.getNodeType();
        let disaplNodeType = xcHelper.capitalize(nodeType);
        if (disaplNodeType === "Sql") {
            disaplNodeType = "SQL";
        }
        return disaplNodeType;
    }

    public getNodeSubType(): string {
        return this.node.getSubType() || "";
    }

    public getDisplayNodeSubType(): string {
        const nodeSubType: string = this.getNodeSubType();
        return xcHelper.capitalize(nodeSubType);
    }
}

class DagCategoryNodeIn extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node,  DagCategoryType.In);
    }
}

class DagCategoryNodeOut extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Out);
    }
}

class DagCategoryNodeValue extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Value);
    }
}

class DagCategoryNodeOperations extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Operations);
    }
}

class DagCategoryNodeColumn extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Column);
    }
}

class DagCategoryNodeJoin extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Join);
    }
}

class DagCategoryNodeSet extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Set);
    }
}

class DagCategoryNodeExtensions extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Extensions);
    }
}

class DagCategoryNodeSQL extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node, DagCategoryType.SQL);
    }
}