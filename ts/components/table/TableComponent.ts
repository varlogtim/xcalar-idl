class TableComponent {
    private static menuManager: TableMenuManager;
    private static prefixManager: TablePrefixManager;

    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableComponent.menuManager = TableMenuManager.Instance;
            TableComponent.prefixManager = TablePrefixManager.Instance;
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

    /**
     * @returns {TablePrefixManager} return prefix manager
     */
    public static getPrefixManager(): TablePrefixManager {
        return TableComponent.prefixManager;
    }
}