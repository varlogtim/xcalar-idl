class DagTable {
    private static _instance: DagTable;
    private readonly _container: string = "dagViewTableArea";
    private _searchBar: TableSearchBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    // map key is dataflow tab id
    private _viewers: Map<string, XcViewer>;
    private _currentViewer: XcViewer;

    private constructor() {
        this._addEventListeners();
        this._searchBar = new TableSearchBar(this._container);
        this._viewers = new Map();
    }

    public previewTable(tabId: string, dagNode: DagNode): XDPromise<XcViewer> {
        const table: TableMeta = XcDagTableViewer.getTableFromDagNode(dagNode);
        const viewer: XcDagTableViewer = new XcDagTableViewer(tabId, dagNode, table);
        this._viewers.set(tabId, viewer);
        return this._show(viewer);
    }

    public previewDataset(dsId: string) {
        const viewer: XcDatasetViewer = new XcDatasetViewer(DS.getDSObj(dsId));
        return this._show(viewer);
    }

    public switchTab(tabId: string): void {
        if (this._currentViewer instanceof XcDatasetViewer) {
            // dataset viewer has higher priority
            return;
        }

        const viewer = this._viewers.get(tabId);
        if (viewer == null) {
            this._close();
        } else {
            this._show(viewer);
        }
    }

    public replaceTable(table: TableMeta): XDPromise<XcViewer> {
        if (this._currentViewer instanceof XcDatasetViewer) {
            return PromiseHelper.resolve(this._currentViewer); // invalid case
        }
        const currentViewer: XcDagTableViewer = <XcDagTableViewer>this._currentViewer;
        const viewer = currentViewer.replace(table);
        if (this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }
        this._viewers.set(currentViewer.getDataflowTabId(), viewer);
        return this._show(viewer);
    }

    public refreshTable() {
        const currentViewer: XcDagTableViewer = <XcDagTableViewer>this._currentViewer;
        if (!currentViewer || currentViewer instanceof XcDatasetViewer) {
            return PromiseHelper.resolve(); // invalid case
        }

        const table: TableMeta = XcDagTableViewer.getTableFromDagNode(currentViewer.getNode());
        const viewer = currentViewer.replace(table);
        this._viewers.set(currentViewer.getDataflowTabId(), viewer);
        this._show(currentViewer, true);
    }

    public getTable(): string {
        return this._currentViewer ? this._currentViewer.getId() : null;
    }

    public getView(): JQuery {
        return this._currentViewer ? this._currentViewer.getView() : null;
    }

    public getBindNode(): DagNode {
        if (this._currentViewer != null && this._currentViewer instanceof XcDagTableViewer) {
            return this._currentViewer.getNode();
        } else {
            return null;
        }
    }

    public getBindNodeId(): DagNodeId {
        if (this._currentViewer != null && this._currentViewer instanceof XcDagTableViewer) {
            return this._currentViewer.getNodeId();
        } else {
            return null;
        }
    }

    public getSearchBar(): TableSearchBar {
        return this._searchBar;
    }


    public closeDatasetPreview(): void {
        if (this._currentViewer instanceof XcDatasetViewer) {
            this._close();
        }
    }

    /**
     * close the preview
     */
    public close(): void {
        if (this._currentViewer instanceof XcDagTableViewer) {
            this._viewers.delete(this._currentViewer.getDataflowTabId());
        }
        this._close();
    }

    public isTableFromTab(tabId: string): boolean {
        return this._currentViewer instanceof XcDagTableViewer &&
                this._currentViewer.getDataflowTabId() === tabId;
    }

    public updateTableName(tabId: string): void {
        const viewer = this._viewers.get(tabId);
        if (viewer === this._currentViewer) {
            this._renderTableNameArea(viewer);
        }
    }

    private _show(viewer: XcViewer, isRefresh: boolean = false): XDPromise<XcViewer> {
        if (!isRefresh && this._isSameViewer(viewer)) {
            return PromiseHelper.resolve();
        }

        this._reset(isRefresh);
        this._currentViewer = viewer;
        return this._showViewer();
    }

    private _close(): void {
        this._getContainer().addClass("xc-hidden").parent().removeClass("tableViewMode").addClass("noPreviewTable");
        this._reset();
        Log.updateUndoRedoState(); // update the state to skip table related undo/redo
    }

    private _showViewer(): XDPromise<XcViewer> {
        const deferred: XDDeferred<XcViewer> = PromiseHelper.deferred();
        const $container: JQuery = this._getContainer();
        $container.parent().removeClass("noPreviewTable").addClass("tableViewMode");
        $container.removeClass("xc-hidden").addClass("loading");
        const viewer: XcViewer = this._currentViewer;
        if (viewer instanceof XcDatasetViewer) {
            $container.addClass("dataset");
        } else {
            $container.removeClass("dataset");
        }
        this._renderTableNameArea(viewer);
        viewer.render(this._getContainer())
        .then(() => {
            $container.removeClass("loading");
            TblFunc.alignScrollBar($container.find(".dataTable").eq(0));
            deferred.resolve(viewer);
        })
        .fail((error) => {
            this._error(error);
            deferred.reject(error);
        });

        const promise = deferred.promise();
        xcUIHelper.showRefreshIcon($container, true, promise);
        return promise;
    }

    private _addEventListeners(): void {
        const $container: JQuery = this._getContainer();
        $container.on("click", ".close", () => {
            this.close();
        });

        const $tableBar = $container.find(".tableBar");
        $tableBar.on("click", ".tableMenu", (event) => {
            const options: DropdownOptions = {
                classes: "tableMenu",
                offsetY: 3,
                tableId: xcHelper.getTableId(this.getTable())
            };
            const tableMenu: TableMenu = TableComponent.getMenu().getTableMenu();
            tableMenu.setUnavailableClasses();
            MenuHelper.dropdownOpen($(event.target), $("#tableMenu"), options);
        });
    }

    private _getContainer(): JQuery {
        return $("#" + this._container);
    }

    private _reset(isRefresh: boolean = false): void {
        this._resetViewer(isRefresh);
        this._clearTableNameArea();
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").removeClass("error");
        $container.find(".errorSection").empty();
    }

    private _resetViewer(isRefresh: boolean = false): void {
        if (this._currentViewer != null) {
            this._currentViewer.clear(isRefresh);
            this._currentViewer = null;
        }
    }

    private _error(error: any): void {
        const $container: JQuery = this._getContainer();
        $container.removeClass("loading").addClass("error");
        let errStr: string;
        if (typeof error === "object" && error.status === StatusT.StatusDsNotFound) {
            // speical case, the error message is not intuitive, so use XD's error str
            errStr = ErrTStr.DsNotFound;
        } else {
            errStr = (typeof error === "string") ?
            error : JSON.stringify(error);
        }
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

        if (viewer instanceof XcDagTableViewer && currentViewer instanceof XcDagTableViewer) {
            if (viewer.getDataflowTabId() !== currentViewer.getDataflowTabId()) {
                return false;
            }
            if (viewer.getNodeId() !== currentViewer.getNodeId()) {
                return false;
            }
        }
        return true;
    }

    private _getTableNameArea(): JQuery {
        return this._getContainer().find(".tableNameArea");
    }

    private _renderTableNameArea(viewer: XcViewer): void {
        const $nameArea: JQuery = this._getTableNameArea();
        $nameArea.removeClass("xc-hidden");
        const type: string = viewer instanceof XcDatasetViewer ?
        "Dataset" : "Table";
        $nameArea.find(".type").text(type);
        $nameArea.find(".name").text(": " + viewer.getTitle());
    }

    private _clearTableNameArea(): void {
        const $nameArea = this._getTableNameArea();
        $nameArea.addClass("xc-hidden");
        $nameArea.find(".type").empty();
        $nameArea.find(".name").empty();
    }
}