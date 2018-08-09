class DagTable {
    private static _instance: DagTable;
    private readonly container: string = "dagViewTableArea";

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // XXX test only, this code should be triggered when click the dag preview button
    public static testTable(tableId) {
        const dagNode: DagNode = DagNodeFactory.create({type: DagNodeType.Filter});
        dagNode.setTable(tableId);
        const table: TableMeta = gTables[tableId];
        const columns: ProgCol[] = dagNode.getLineage().getColumns();
        if (columns != null && columns.length > 0) {
            table.tableCols = columns.concat(ColManager.newDATACol());
        }
        const viewer: XcTableViewer = new XcTableViewer(table);
        return DagTable.Instance.show(viewer);
    }

    // XXX TODO as next setp
    public static testDataset(dsName) {
        const viewer: XcDatasetViewer = new XcDatasetViewer(DS.getDSObj(dsName));
        return DagTable.Instance.show(viewer);
    }

    private viewer: XcViewer;

    private constructor() {
        this._addEventListeners();
    }

    /**
     * Show view of data
     * @param viewer {XcViewer} viewer to add to the component
     */
    public show(viewer: XcViewer): XDPromise<void> {
        if (this.viewer != null && this.viewer.getId() == viewer.getId()) {
            return PromiseHelper.resolve();
        }

        this._reset();
        this.viewer = viewer;

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.removeClass("xc-hidden").addClass("loading");
        if (viewer instanceof XcDatasetViewer) {
            $container.addClass("dataset");
        } else {
            $container.removeClass("dataset");
        }

        this.viewer.render(this._getContainer())
        .then(() => {
            $container.removeClass("loading");
            deferred.resolve();
        })
        .fail((error) => {
            this._error(error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /**
     * close the preview
     */
    public close(): void {
        this._getContainer().addClass("xc-hidden");
        this._reset();
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        $container.on("click", ".close", () => {
            this.close();
        });
    }

    private _getContainer(): JQuery {
        return $("#" + this.container);
    }

    private _reset(): void {
        if (this.viewer != null) {
            this.viewer.clear();
            this.viewer = null;
        }

        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").removeClass("error");
        $container.find(".errorSection").empty();
    }

    // XXX TODO
    private _error(error: any): void {
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").addClass("error");
        const errStr: string = typeof error === "string" ? error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }
}