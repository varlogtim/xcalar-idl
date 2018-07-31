class DagCategoryNode {
    protected categoryType: DagCategoryType;
    protected nodeType: DagNodeType;
    private node;
    public constructor(node: DagNode) {
        this.categoryType = DagCategoryType.In;
        this.node = node;
        this.nodeType = node.getType();
    }

    public getCategoryType(): DagCategoryType {
        return this.categoryType;
    }

    public getNode(): DagNode {
        return this.node;
    }

    public getNodeType(): DagNodeType {
        return this.nodeType;
    }
}

class DagCategoryNodeIn extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.In;
    }
}

class DagCategoryNodeOut extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Out;
    }
}

class DagCategoryNodeValue extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Value;
    }
}

class DagCategoryNodeOperations extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Operations;
    }
}

class DagCategoryNodeColumn extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Column;
    }
}

class DagCategoryNodeJoin extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Join;
    }
}

class DagCategoryNodeSet extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Set;
    }
}

class DagCategoryNodeExtensions extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.Extensions;
    }
}

class DagCategoryNodeSQL extends DagCategoryNode {
    protected categoryType: DagCategoryType;
    public constructor(node: DagNode) {
        super(node);
        this.categoryType = DagCategoryType.SQL;
    }
}