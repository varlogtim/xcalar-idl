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

    public beErrorState(error?: string, keepRetina?: boolean): void {
        this.error = error || this.error;
        this._setState(DagNodeState.Error);
        this._clearConnectionMeta(keepRetina);
    }

    protected _clearConnectionMeta(keepRetina?: boolean): void {
        if (!keepRetina) {
            this._removeRetina();
        }
        super._clearConnectionMeta();
    }

    private _removeRetina(): void {
        this.events.trigger(DagNodeEvents.RetinaRemove, {
            nodeId: this.getId(),
            node: this
        });
    }
}

if (typeof exports !== 'undefined') {
    exports.DagNodeOutOptimizable = DagNodeOutOptimizable;
};
