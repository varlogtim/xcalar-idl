class DagTable {
    private static _instance: DagTable;
    private readonly container: string = "dagViewTableArea";

    public static get Instance() {
        return this._instance || (this._instance = new this());
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

    public getTable(): string {
        return this.viewer ? this.viewer.getId() : null;
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