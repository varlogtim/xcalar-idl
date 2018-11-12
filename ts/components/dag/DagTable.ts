class DagTable {
    private static _instance: DagTable;
    private readonly _container: string = "dagViewTableArea";
    private _searchBar: DagTableSearchBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private viewer: XcViewer;
    private $node: JQuery;

    private constructor() {
        this._addEventListeners();
        this._searchBar = new DagTableSearchBar(this._container);
    }

    /**
     * Show view of data
     * @param viewer {XcViewer} viewer to add to the component
     */
    public show(viewer: XcViewer, $node?: JQuery): XDPromise<void> {
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }

        this._reset();
        this.viewer = viewer;
        this.$node = $node;
        this._showTableIcon();
        return this._showViewer();
    }

    public replace(viewer: XcViewer): XDPromise<void> {
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }
        this._resetViewer();
        this.viewer = viewer;
        return this._showViewer();
    }

    public getTable(): string {
        return this.viewer ? this.viewer.getId() : null;
    }

    public getView(): JQuery {
        return this.viewer ? this.viewer.getView() : null;
    }

    public getBindNodeId(): DagNodeId {
        return this.$node ? this.$node.data("nodeid") : null;
    }

    public getSearchBar(): DagTableSearchBar {
        return this._searchBar;
    }

    /**
     * close the preview
     */
    public close(): void {
        this._getContainer().addClass("xc-hidden").parent().removeClass("tableViewMode").addClass("noPreviewTable");
        this._reset();
    }

    public isTableFromTab(tabId: string): boolean {
        const tableName: string = this.getTable();
        return tableName != null && tableName.includes(tabId);
    }

    private _showViewer(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.parent().removeClass("noPreviewTable").addClass("tableViewMode");
        $container.removeClass("xc-hidden").addClass("loading");
        if (this.viewer instanceof XcDatasetViewer) {
            $container.addClass("dataset");
        } else {
            $container.removeClass("dataset");
        }
        this._showTableIcon();
        xcHelper.showRefreshIcon($container, true,
            this.viewer.render(this._getContainer())
            .then(() => {
                $container.removeClass("loading");
                TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
                deferred.resolve();
            })
            .fail((error) => {
                this._error(error);
                deferred.reject(error);
        }));

        return deferred.promise();
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        $container.on("click", ".close", () => {
            this.close();
        });

        const $tableBar = $container.find(".tableBar");
        $tableBar.on("click", ".tableMenu", (event) => {
            const options: xcHelper.DropdownOptions = {
                classes: "tableMenu",
                tableId: xcHelper.getTableId(this.getTable())
            };

            xcHelper.dropdownOpen($(event.target), $("#tableMenu"), options);
        });
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _reset(): void {
        this._resetViewer();
        this._removeTableIcon();
        this.$node = null;

        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").removeClass("error");
        $container.find(".errorSection").empty();
    }

    private _resetViewer(): void {
        if (this.viewer != null) {
            this.viewer.clear();
            this.viewer = null;
        }
    }

    // XXX TODO
    private _error(error: any): void {
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").addClass("error");
        const errStr: string = (typeof error === "string") ?
        error : JSON.stringify(error);
        $container.find(".errorSection").text(errStr);
    }

    private _showTableIcon(): void {
        if (this.$node != null) {
            const g = d3.select(this.$node.get(0)).append("g")
                    .attr("class", "tableIcon")
                    .attr("transform", "translate(65, 2)");
            g.append("rect")
                .attr("x", 0)
                .attr("y", -8)
                .attr("width", 15)
                .attr("height", "13")
                .style("fill", "#378CB3");
            g.append("text")
                .attr("font-family", "icomoon")
                .attr("font-size", 8)
                .attr("fill", "white")
                .attr("x", 3)
                .attr("y", 2)
                .text(function(_d) {return "\uea07"});
        }
    }

    private _removeTableIcon(): void {
        if (this.$node != null) {
            d3.select(this.$node.get(0)).selectAll(".tableIcon").remove();
        }
    }

    private _isSameViewer(viewer: XcViewer): boolean {
        return this.viewer != null && this.viewer.getId() == viewer.getId();
    }
}