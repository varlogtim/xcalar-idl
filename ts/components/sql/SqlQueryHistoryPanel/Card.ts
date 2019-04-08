namespace SqlQueryHistoryPanel {
    import QueryUpdateInfo = SqlQueryHistory.QueryUpdateInfo;

    export class Card extends BaseCard {
        private static _instance = null;
        public static getInstance(): Card {
            return this._instance || (this._instance = new this());
        }

        /**
         * Update/Add a query with partial data
         * @param updateInfo query update information
         */
        public update(updateInfo: QueryUpdateInfo): XDPromise<void> {
            return SqlQueryHistory.getInstance().upsertQuery(updateInfo)
                .then( () => {
                    this._updateTableUI(this.queryMap, false);
                });
        }
    }
}