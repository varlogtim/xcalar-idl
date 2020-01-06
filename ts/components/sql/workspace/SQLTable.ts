class SQLTable {
    private _container: string;
    private _searchBar: TableSearchBar;

    private _currentViewer: XcTableViewer;

    public constructor(container: string) {
        this._container = container;
        this._addEventListeners();
        this._searchBar = new TableSearchBar(this._container);
    }

    public show(
        table: TableMeta,
        columns: {name: string, backName: string, type: ColumnType}[],
        callback?: Function
    ): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        table.allImmediates = true;

        if (columns) {
            let tableCols: ProgCol[] = [];
            columns.forEach((col) => {
                tableCols.push(ColManager.newPullCol(col.name,
                                     col.backName, col.type));
            });
            tableCols.push(ColManager.newDATACol());
            table.addAllCols(tableCols);
        }

        const viewer: XcTableViewer = new XcTableViewer(table);

        this._show(viewer)
        .then(deferred.resolve)
        .fail((error) => {
            if (typeof error === "object" &&
                error.status === StatusT.StatusDsNotFound &&
                typeof callback === "function"
            ) {
                callback();
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

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
    }

    private _showViewer(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.removeClass("xc-hidden").addClass("loading");
        this._addLoadingText();
        const viewer = this._currentViewer;
        const $tableSection: JQuery = $container.find(".tableSection");
        viewer.setContainer($container);
        this._renderTableNameArea(viewer);
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
        xcUIHelper.showRefreshIcon($tableSection, true, promise);
        return promise;
    }

    private _addLoadingText(): void {
        let html: HTML =
            '<div class="animatedEllipsisWrapper">' +
                '<div class="text">Loading</div>' +
                '<div class="animatedEllipsis">' +
                    '<div>.</div>' +
                    '<div>.</div>' +
                    '<div>.</div>' +
                '</div>' +
            '</div>';
        const $container: JQuery = this._getContainer();
        $container.find(".loadingSection").html(html);
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

    private _renderTableNameArea(viewer: XcViewer) {
        const $nameArea: JQuery = this._getContainer().find(".tableNameArea");
        $nameArea.find(".name").text(viewer.getId());
    }
}