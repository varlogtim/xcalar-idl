class DagNodeOutOptimizable extends DagNodeOut {
    protected optimized: boolean;

    public constructor(options: DagNodeInfo) {
        super(options);
    }

    public isOptimized(): boolean {
        return this.optimized;
    }

    protected _getColumnsUsedInInput() {
        return null;
    }

    protected _clearConnectionMeta(): void {
        this._removeRetina();
        super._clearConnectionMeta();
    }

    private _removeRetina(): void {
        this.events.trigger(DagNodeEvents.RetinaRemove, {
            nodeId: this.getId(),
            node: this
        });
    }
}