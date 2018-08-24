class TableManager {
    private static menuManager: TableMenuManager;

    /**
     * Setup the Table Manager
     */
    public static setup(): void {
        try {
            TableManager.menuManager = TableMenuManager.Instance;
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
}