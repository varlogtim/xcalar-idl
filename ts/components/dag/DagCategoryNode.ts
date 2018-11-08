class DagCategoryNode {
    protected categoryType: DagCategoryType;
    protected nodeSubType: string | null;
    protected node: DagNode;
    protected hidden: boolean;
    protected color: string = "#F8A296";

    public constructor(node: DagNode, categoryType: DagCategoryType, isHidden: boolean = false) {
        this.node = node;
        this.categoryType = categoryType;
        this.hidden = isHidden;
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
        const node = this.getNode();
        let displayNodeType = xcHelper.capitalize(nodeType);
        if (displayNodeType === "Sql") {
            displayNodeType = "SQL";
        }
        if (node instanceof DagNodeCustom) {
            displayNodeType = node.getCustomName();
        } else if (node instanceof DagNodeCustomInput) {
            displayNodeType = node.getPortName();
        }
        return displayNodeType;
    }

    public getNodeSubType(): string {
        return this.node.getSubType() || "";
    }

    public getDisplayNodeSubType(): string {
        const nodeSubType: string = this.getNodeSubType();
        return xcHelper.capitalize(nodeSubType);
    }

    public isHidden(): boolean {
        return this.hidden;
    }

    public getColor(): string {
        return this.color;
    }

    public getIcon(): string {
        return this.node.getIcon();
    }

    public getDescription(): string {
        return this.node.getNodeDescription();
    }

    /**
     * Create the representing JSON data. Override in child classes for extra data.
     */
    public getJSON(): DagCategoryNodeInfo {
        return {
            type: this.categoryType,
            subType: this.getNodeSubType(),
            node: this.node.getSerializableObj(),
            hidden: this.hidden
        };
    }

    /**
     * Initialize the class instance with JSON data. Override in child classes for extra data.
     * @param json
     */
    public initFromJSON(json: DagCategoryNodeInfo) {
        this.categoryType = json.type;
        this.nodeSubType = json.subType;
        this.hidden = json.hidden;
        this.node = DagNodeFactory.create(json.node);
    }

    /**
     * Check if the category node needs to be persisted. Override it for customized behavior in child classes.
     */
    public isPersistable(): boolean {
        return false;
    }
}

class DagCategoryNodeIn extends DagCategoryNode {
    protected color: string = "#F4B48A";
    public constructor(node: DagNode) {
        super(node,  DagCategoryType.In);
    }
}

class DagCategoryNodeOut extends DagCategoryNode {
    protected color: string = "#E7DC98";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Out);
    }
}

class DagCategoryNodeValue extends DagCategoryNode {
    protected color: string = "#AACE8F";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Value);
    }
}

class DagCategoryNodeOperations extends DagCategoryNode {
    protected color: string = "#7FD4B5";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Operations);
    }
}

class DagCategoryNodeColumn extends DagCategoryNode {
    protected color: string = "#89D0E0";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Column);
    }
}

class DagCategoryNodeJoin extends DagCategoryNode {
    protected color: string = "#92B1DA";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Join);
    }
}

class DagCategoryNodeSet extends DagCategoryNode {
    protected color: string = "#CCAADD";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Set);
    }
}

class DagCategoryNodeExtensions extends DagCategoryNode {
    protected color: string = "#F896A9";
    public constructor(node: DagNode) {
        super(node, DagCategoryType.Extensions);
    }
}

class DagCategoryNodeSQL extends DagCategoryNode {
    protected color: string = "#EAABD3";
    public constructor(node: DagNode, isHidden: boolean = false) {
        super(node, DagCategoryType.SQL, isHidden);
    }
}

class DagCategoryNodeCustom extends DagCategoryNode {
    protected color: string = "#F8A296";
    public constructor(node: DagNode, isHidden: boolean = false) {
        super(node, DagCategoryType.Custom, isHidden);
    }
    /**
     * @override
     * Overriding the base class, so that custom operator can be persisted.
     */
    public isPersistable(): boolean {
        return true;
    }
}

class DagCategoryNodeFactory {
    /**
     * Create DagCategoryNodes from their constructor
     * @param options
     */
    public static create(options: {
        dagNode: DagNode, categoryType: DagCategoryType, isHidden: boolean
    }): DagCategoryNode {
        const { dagNode, categoryType, isHidden = false } = options;
        switch (categoryType) {
            case DagCategoryType.Custom:
                return new DagCategoryNodeCustom(dagNode, isHidden);
            default:
                throw new Error(`Category type ${categoryType} not supported`);
        }
    }

    /**
     * Create DagCategoryNodes from JSON
     * @param json
     */
    public static createFromJSON(json: DagCategoryNodeInfo): DagCategoryNode {
        let node: DagCategoryNode;
        switch (json.type) {
            case DagCategoryType.Custom:
                node = new DagCategoryNodeCustom(null);
                break;
            default:
                throw new Error("Category type " + json.type + " not supported");
        }

        node.initFromJSON(json);
        return node;
    }
}