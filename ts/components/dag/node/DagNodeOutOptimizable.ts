class DagNodeOutOptimizable extends DagNodeOut {
    protected optimized: boolean;
    private retina: string;

    public constructor(options: DagNodeOutOptimizableInfo) {
        super(options);
        this.retina = options.retina;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

      /**
     * if optimized node, stores a retina name so we can view the query on demand
     * @param retinaName
     */
    public setRetina(retinaName: string) {
        this.retina = retinaName;
    }

    /**
     * @returns {retinaName} return retinaName associated with optimized node
     */
    public getRetina(): string {
        return this.retina;
    }

    public beRunningState(): void {
        super.beRunningState();
        this._removeRetina();
    }

    /**
     * Generate JSON representing this node(w/o ids), for use in copying a node
     */
    public getNodeCopyInfo(clearState: boolean = false): DagNodeCopyInfo {
        const nodeInfo = super.getNodeCopyInfo(clearState);
        if (clearState) {
            delete nodeInfo.retina;
        }
        return nodeInfo;
    }

      /**
     *
     */
    protected _clearConnectionMeta(): void {
        this._removeRetina();
        super._clearConnectionMeta();
    }

    protected _getSerializeInfo(includeStats?: boolean): DagNodeOutOptimizableInfo {
        const serializedInfo: DagNodeOutOptimizableInfo = <DagNodeOutOptimizableInfo>super._getSerializeInfo(includeStats);
        if (this.retina != null) {
            serializedInfo.retina = this.retina;
        }
        return serializedInfo;
    }

    private _removeRetina(): void {
        if (this.retina) {
            this.events.trigger(DagNodeEvents.RetinaRemove, {
                retina: this.retina,
                nodeId: this.getId(),
                node: this
            });
            delete this.retina;
        }
    }
}