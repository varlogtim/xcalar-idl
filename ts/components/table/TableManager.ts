class TableManager {
    private static menuManager: TableMenuManager;
    private static prefixManager: TablePrefixManager;

    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableManager.menuManager = TableMenuManager.Instance;
            TableManager.prefixManager = TablePrefixManager.Instance;
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * @returns {TableMenuManager} return menu manager
     */
    public static getMenu(): TableMenuManager {
        return TableManager.menuManager;
    }

    /**
     * @returns {TablePrefixManager} return prefix manager
     */
    public static getPrefixManager(): TablePrefixManager {
        return TableManager.prefixManager;
    }
}