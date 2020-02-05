class TableComponent {
    private static menuManager: TableMenuManager;
    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableComponent.menuManager = TableMenuManager.Instance;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @returns {TableMenuManager} return menu manager
     */
    public static getMenu(): TableMenuManager {
        return TableComponent.menuManager;
    }

    public static empty(): void {
        gActiveTableId = null;
        TableComponent.update();
    }

    // XXX TODO: remove it
    public static update(): void {
        return;
        // const $rowInputArea: JQuery = $("#rowInputArea");
        // const viewer: XcTableInWSViewer = this.viewersMap.get(gActiveTableId);
        // const table: TableMeta = gTables[gActiveTableId];
        // if (viewer == null || table == null) {
        //     $rowInputArea.empty();
        //     this._emptySkew();
        // } else {
        //     const rowInput: RowInput = viewer.getRowInput();
        //     rowInput.render($rowInputArea);

        //     const skew: TableSkew = viewer.getSkew();
        //     skew.render($("#skewInfoArea").addClass("active"));
        // }
    }
}