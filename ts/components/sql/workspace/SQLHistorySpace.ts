class SQLHistorySpace {
    private static _instance: SQLHistorySpace;
    private _historyComponent: SqlQueryHistoryPanel.ExtCard;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._historyComponent = new SqlQueryHistoryPanel.ExtCard();
    }

    public setup(): void {
        const $histSection = $('#sqlWorkSpacePanel');
        this._historyComponent.setup({
            $container: $histSection,
            isShowAll: true,
            checkContainerVisible: () => {
                return $histSection.hasClass('active');
            }
        });
    }

    public refresh(): void {
        this._historyComponent.show(true);
    }
}