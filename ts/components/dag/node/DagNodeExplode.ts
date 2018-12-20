class DagNodeExplode extends DagNodeMap {

    public constructor(options: DagNodeInfo) {
        super(options);
        this.type = DagNodeType.Explode;
        this.minParents = 1;
        this.maxParents = 1;
        this.display.icon = '&#xe9d7;';
    }
}