class SQLTable {
    private static _instance: SQLTable;
    private readonly _container: string = "sqlTableArea";
    private _searchBar: TableSearchBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private _currentViewer: XcTableViewer;

    private constructor() {
        this._addEventListeners();
        this._searchBar = new TableSearchBar(this._container);
    }

    public show(table: TableMeta): XDPromise<void> {
        const viewer: XcTableViewer = new XcTableViewer(table);
        return this._show(viewer);
    }

    // public replaceTable(table: TableMeta): XDPromise<void> {
    //     if (this._currentViewer instanceof XcDatasetViewer) {
    //         return PromiseHelper.resolve(); // invalid case
    //     }
    //     const currentViewer: XcDagTableViewer = <XcDagTableViewer>this._currentViewer;
    //     const viewer = currentViewer.replace(table);
    //     if (this._isSameViewer(viewer)) {
    //         return PromiseHelper.resolve();
    //     }
    //     this._viewers.set(currentViewer.getDataflowTabId(), viewer);
    //     return this._show(viewer);
    // }

    public getTable(): string {
        return this._currentViewer ? this._currentViewer.getId() : null;
    }

    public getView(): JQuery {
        return this._currentViewer ? this._currentViewer.getView() : null;
    }

    public getSearchBar(): TableSearchBar {
        return this._searchBar;
    }

    /**
     * close the preview
     */
    public close(): void {
        this._close();
    }

    private _show(viewer: XcTableViewer): XDPromise<void> {
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }
        this._reset();
        this._currentViewer = viewer;
        return this._showViewer();
    }

    private _close(): void {
        this._getContainer().addClass("xc-hidden");
        this._reset();
        // Log.updateUndoRedoState(); // update the state to skip table related undo/redo
    }

    private _showViewer(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.removeClass("xc-hidden").addClass("loading");
        const viewer = this._currentViewer;
        const $tableSection: JQuery = $container.find(".tableSection");
        viewer.setContainer($container);
        viewer.render($tableSection, true)
        .then(() => {
            $container.removeClass("loading");
            TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            deferred.resolve();
        })
        .fail((error) => {
            this._error(error);
            deferred.reject(error);
        });

        const promise = deferred.promise();
        xcHelper.showRefreshIcon($tableSection, true, promise);
        return promise;
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        $container.on("click", ".close", () => {
            this.close();
        });
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _reset(): void {
        this._resetViewer();
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").removeClass("error");
        $container.find(".errorSection").empty();
    }

    private _resetViewer(): void {
        if (this._currentViewer != null) {
            this._currentViewer.clear();
            this._currentViewer = null;
        }
    }

    private _error(error: any): void {
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").addClass("error");
        const errStr: string = (typeof error === "string") ?
        error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }

    private _isSameViewer(viewer: XcViewer): boolean {
        const currentViewer = this._currentViewer;
        if (currentViewer == null) {
            return false;
        }
        if (currentViewer.getId() != viewer.getId()) {
            return false;
        }
        return true;
    }
}