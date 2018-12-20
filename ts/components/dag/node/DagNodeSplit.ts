class DagNodeSplit extends DagNodeMap {

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Split;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = "&#xe993;"
    }
}