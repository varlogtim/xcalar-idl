namespace SqlQueryHistoryPanel {

    export enum SortOrder {
        NONE,
        ASC,
        DESC
    }

    import QueryInfo = SqlQueryHistory.QueryInfo;
    import QueryUpdateInfo = SqlQueryHistory.QueryUpdateInfo;

    const SQLStatusString  = {};
    SQLStatusString[SQLStatus.Running] = SQLTStr.queryHistStatusRun;
    SQLStatusString[SQLStatus.Done] = SQLTStr.queryHistStatusDone;
    SQLStatusString[SQLStatus.Failed] = SQLTStr.queryHistStatusFail;
    SQLStatusString[SQLStatus.Cancelled] = SQLTStr.queryHistStatusCancel;
    SQLStatusString[SQLStatus.Compiling] = SQLTStr.queryHistStatusCompile;
    SQLStatusString[SQLStatus.None] = SQLTStr.queryHistStatusNone;
    SQLStatusString[SQLStatus.Interrupted] = SQLTStr.queryHistStatusInterrupt;

    export interface CardOptions {
        isShowAll?: boolean,
        isAutoRefresh?: boolean    
    }

    export class Card {
        private static _instance = null;
        public static getInstance(): Card {
            return this._instance || (this._instance = new this());
        }

        private _$cardContainer: JQuery = null;
        private _tableComponent: Table = null;
        private _isShowAll: boolean = false;
        private static _sortFunctions = {
            sortStartTime: (a: QueryInfo, b: QueryInfo) => (
                a.startTime - b.startTime
            ),
            sortDuration: (a: QueryInfo, b: QueryInfo) => {
                const now = Date.now();
                const aEndTime = a.endTime || now;
                const bEndTime = b.endTime || now;
                return (aEndTime - a.startTime) - (bEndTime - b.startTime);
            },
            sortStatus: (a: QueryInfo, b: QueryInfo) => (
                a.status > b.status? 1: (a.status < b.status? -1: 0)
            )
        };

        public setup({
            isShowAll = false,
            isAutoRefresh = true 
        }: CardOptions = {} ) {
            this._$cardContainer = $('#queryHistCard');
            this._isShowAll = isShowAll;

            // Event binding for sorting
            const $sortElementList: JQuery[] = [];
            this._$cardContainer.off('.QueryHist');
            // Sort by startTime
            const sortStartTime = Card._sortFunctions.sortStartTime;
            const $elemSortTime = findXCElement(this._$cardContainer, 'sortStartTime');
            $elemSortTime.on('click.QueryHist', this._onClickSort(
                $elemSortTime.find('.icon'),
                this._sortQueryList.bind(this, SortOrder.ASC, sortStartTime),
                this._sortQueryList.bind(this, SortOrder.DESC, sortStartTime),
                $sortElementList
            ));
            // Sort by duration
            const sortDuration = Card._sortFunctions.sortDuration;
            const $elemSortDuration = findXCElement(this._$cardContainer, 'sortDuration');
            $elemSortDuration.on('click.QueryHist', this._onClickSort(
                $elemSortDuration.find('.icon'),
                this._sortQueryList.bind(this, SortOrder.ASC, sortDuration),
                this._sortQueryList.bind(this, SortOrder.DESC, sortDuration),
                $sortElementList
            ));
            // Sort by status
            const sortStatus = Card._sortFunctions.sortStatus;
            const $elemSortStatus = findXCElement(this._$cardContainer, 'sortStatus');
            $elemSortStatus.on('click.QueryHist', this._onClickSort(
                $elemSortStatus.find('.icon'),
                this._sortQueryList.bind(this, SortOrder.ASC, sortStatus),
                this._sortQueryList.bind(this, SortOrder.DESC, sortStatus),
                $sortElementList
            ));

            // Child components setup
            this._tableComponent = new Table(
                this._$cardContainer,
                { isAutoRefresh: isAutoRefresh }
            );

            // Refresh
            const $refreshicon = $("#refreshQueryHist");
            $refreshicon.on('click', () => {
                    this.show(true);
                }
            );
            SqlQueryHistModal.getInstance().setup();
        }

        /**
         * Show the history table
         * @param refresh if this is a manual refresh triggered by click on icon
         * @description
         * If the queryMap is not null, the table is shown with existing data
         */
        public show(
            refresh: boolean
        ): XDPromise<any> {
            if (SqlQueryHistory.getInstance().isLoaded() && !refresh) {
                return PromiseHelper.resolve();
            } else {
                const deferred: XDDeferred<void> = PromiseHelper.deferred();
                SqlQueryHistory.getInstance().readStore(refresh)
                .then( () => {
                    const sortIndex = this._getSortIndex(
                        SortOrder.DESC,
                        Card._sortFunctions.sortStartTime
                    ); // Default sorting
                    this._updateTableUI(sortIndex);
                    deferred.resolve();
                })
                .fail( () => {
                    Alert.show({
                        title: AlertTStr.queryHistoryReadErrorTitle,
                        msg: SQLErrTStr.InvalidSQLQuery,
                        isAlert: true,
                        align: 'left',
                        preSpace: true,
                        sizeToText: true
                    });
                    deferred.resolve();
                });
                return deferred.promise();
            }
        }

        /**
         * Update/Add a query with partial data
         * @param updateInfo query update information
         */
        public update(updateInfo: QueryUpdateInfo): XDPromise<void> {
            return SqlQueryHistory.getInstance().upsertQuery(updateInfo)
                .then( ({isNew, queryInfo}) => {
                    if (isNew) {
                        this._tableComponent.addOneQuery(
                            queryInfo,
                            this._onClickQuery,
                            this._onClickTable,
                            this._onClickError,
                            false // Add as the first row
                        )
                    } else {
                        this._tableComponent.updateOneQuery(queryInfo);
                    }
                });
        }

        private get queryMap(): SqlQueryMap {
            return SqlQueryHistory.getInstance().getQueryMap();
        }

        private _getSortIndex(
            order: SortOrder = SortOrder.NONE,
            sortFunction: (a: QueryInfo, b: QueryInfo) => number
        ): string[] {
            const queryMap = this.queryMap;
            const sortList = Object.keys(queryMap);
            if (order !== SortOrder.NONE) {
                sortList.sort( (a, b) => {
                    const gt = sortFunction(queryMap[a], queryMap[b]);
                    return order === SortOrder.ASC? gt: -gt;
                });
            }
            if (this._isShowAll) {
                return sortList;
            } else {
                const numOfRows = 200;
                return sortList.slice(0, numOfRows);
            }
        }

        private _sortQueryList(
            order: SortOrder,
            sortFunction: (a: QueryInfo, b: QueryInfo) => number
        ): void {
            const sortIndex = this._getSortIndex(order, sortFunction);
            this._updateTableUI(sortIndex);
        }

        private _updateTableUI(sortIndex: string[]): void {
            this._tableComponent.updateUI(
                this.queryMap,
                sortIndex,
                this._onClickQuery,
                this._onClickTable,
                this._onClickError
            );
        }

        // Event handler for sort
        private _onClickSort(
            $elemIcon: JQuery,
            sortAsc: () => any,
            sortDesc: () => any,
            $elemList: JQuery[]
        ): () => any {
            // Order state transition table
            const stateTransit = {};
            stateTransit[SortOrder.NONE] = {
                nextState: SortOrder.ASC,
                action: () => {
                    $elemIcon.addClass('xi-arrow-up');
                    sortAsc();
                }
            };
            stateTransit[SortOrder.ASC] = {
                nextState: SortOrder.DESC,
                action: () => {
                    $elemIcon.addClass('xi-arrow-down');
                    sortDesc();
                }
            };
            stateTransit[SortOrder.DESC] = {
                nextState: SortOrder.ASC,
                action: () => {
                    $elemIcon.addClass('xi-arrow-up');
                    sortAsc();
                }
            };
            
            // Store all sortable columns
            $elemList.push($elemIcon);
            return () => {
                let order = SortOrder.NONE;
                // Current order
                if ($elemIcon.hasClass('xi-arrow-up')) {
                    order = SortOrder.ASC;
                } else if ($elemIcon.hasClass('xi-arrow-down')) {
                    order = SortOrder.DESC;
                }
                // Clear the sorting
                for(const $elem of $elemList) {
                    $elem.removeClass('xi-arrow-up');
                    $elem.removeClass('xi-arrow-down');
                }
                // Toggle between orders
                const { nextState, action } = stateTransit[order];
                order = nextState;
                action();
            }
        }

        // Event handler for query click
        private _onClickQuery(query: string): () => void {
            return () => {
                // Show the query modal
                SqlQueryHistModal.getInstance().show({query: query});
            };
        }

        private _onClickError(
            {title, errorMsg}: {title: string, errorMsg: string}
        ): () => void {
            return () => {
                Alert.show({
                    title: title,
                    msg: errorMsg,
                    isAlert: true,
                    align: 'left',
                    preSpace: true,
                    sizeToText: true
            });
            }
        }

        // Event handler for table click
        private _onClickTable(tableId: string): () => void {
            return () => {
                // Show the table
                TblManager.findAndFocusTable(`#${tableId}`)
                .fail(function() {
                    Alert.show({
                        title: SQLErrTStr.Err,
                        msg: SQLErrTStr.TableDropped,
                        isAlert: true
                    });
                });
            };
        }

    }

    interface TableOptions {
        isAutoRefresh?: boolean;
    }

    class Table {
        private _$tableContainer: JQuery = null;
        private _$bodyContainer: JQuery = null;
        private _templateRow: string = '';
        private _statusMapping: { [key: string]: string } = {};
        private _updateHandlers: { [key: string]: (queryInfo: QueryInfo) => any } = {};
        private _changeDurationHandlers: { [key: string]: () => void} = {};
        private _refreshTimer = null;
        
        constructor($parent: JQuery, options: TableOptions = {}) {
            this._$tableContainer = findXCElement($parent, 'queryTable');
            this._$bodyContainer = findXCElement(this._$tableContainer, 'queryBody');
            this._templateRow = readTemplate(this._$tableContainer, 'xctemp-row');
            // Mapping: query status => icon class name
            this._statusMapping[SQLStatus.Cancelled] = 'icon-cancel';
            this._statusMapping[SQLStatus.Compiling] = 'icon-compile';
            this._statusMapping[SQLStatus.Done] = 'icon-done';
            this._statusMapping[SQLStatus.Failed] = 'icon-fail';
            this._statusMapping[SQLStatus.Running] = 'icon-run';
            this._statusMapping[SQLStatus.Interrupted] = 'icon-cancel';
            // Setup refresh timer
            if (options.isAutoRefresh) {
                this._setupTimer();
            }
        }

        public updateUI(
            queryMap: { [key: string]: QueryInfo },
            orderIndex: string[],
            onClickQuery: (query: string) => any,
            onClickTable: (tableName: string) => any,
            onClickError: ({title, errorMsg}: {title: string, errorMsg: string}) => any
        ): void {
            // Cleanup
            this._$bodyContainer.empty();
            this._updateHandlers = {};

            // Rebuild the UI
            for (const sqlId of orderIndex) {
                const queryInfo = queryMap[sqlId];
                if (queryInfo == null) {
                    console.error(`SqlQUeryHistory.Table.updateUI: slqId(${sqlId}) not exists`);
                    continue;
                }
                this.addOneQuery(queryInfo, onClickQuery, onClickTable, onClickError);
            }
        }

        public updateOneQuery(queryInfo: QueryInfo): boolean {
            const update = this._updateHandlers[queryInfo.queryId];
            if (update != null) { // Existing query
                update(queryInfo);
                return true;
            } else { // New query
                // This should never happend
                console.error(`SQLQueryHisory.Table.updateOneQuery: sqlId(${queryInfo.queryId} not exists)`);
                return false;
            }
        }

        public addOneQuery(
            queryInfo: QueryInfo,
            onClickQuery: (query: string) => any,
            onClickTable: (tableName: string) => any,
            onClickError: ({title, errorMsg}: {title: string, errorMsg: string}) => any,
            isAppend: boolean = true
        ): boolean {
            if (this._updateHandlers[queryInfo.queryId] != null) {
                // This should never happend
                console.log(`SQLQueryHisory.Table.addOneQuery: sqlId(${queryInfo.queryId} already exists)`);
                return false;
            }

            // Create DOM element
            const $rowElement = this._createRowFromTemplate(
                queryInfo,
                onClickQuery,
                onClickTable,
                onClickError
            );
            // Register update handler
            this._updateHandlers[queryInfo.queryId] = this._createUpdateHandler(
                $rowElement,
                onClickQuery,
                onClickTable,
                onClickError
            );
            // Add row element to history table
            if (isAppend) {
                this._$bodyContainer.append($rowElement);
            } else {
                this._$bodyContainer.prepend($rowElement);
            }
        }

        /**
         * Create a row DOM element from template
         * @param queryInfo QueryInfo object for this row
         * @param onClickQuery onClick handler when clicking the query cell
         * @param onClickTable onClick handler when clicking the table cell
         * @param onClickError onClick handler when clicking the error message
         * @return The DOM element
         * @description
         * 1. Replace the placeholders in template with query information
         * 2. Attach the events handlers
         */
        private _createRowFromTemplate(
            queryInfo: QueryInfo,
            onClickQuery: (query: string) => any,
            onClickTable: (tableName: string) => any,
            onClickError: ({title, errorMsg}: {title: string, errorMsg: string}) => any
        ): JQuery {
            // Create DOM from template
            let duration;
            if (queryInfo.endTime != null) {
                duration = queryInfo.endTime - queryInfo.startTime;
            } else if (queryInfo.status === SQLStatus.Interrupted) {
                duration = "N/A";
            } else {
                duration = Date.now() - queryInfo.startTime
            }
            const rowHTML = this._templateRow
            .replace('{{status}}', SQLStatusString[queryInfo.status])
            .replace('{{query}}', queryInfo.queryString)
            .replace(
                '{{startTime}}',
                formatDateTime(queryInfo.startTime)
            )
            .replace(
                '{{duration}}',
                duration === "N/A" ? duration :
                xcHelper.getElapsedTimeStr(duration, (queryInfo.endTime == null))
            )
            .replace(
                '{{table}}',
                queryInfo.status === SQLStatus.Failed? queryInfo.errorMsg: queryInfo.tableName
            )
            .replace(
                '{{statusClass}}',
                this._getStatusCSSClass(queryInfo.status)
            );
            const $rowElement = htmlToElement(rowHTML);
            
            // Event binding for query
            const $elemQuery = findXCElement($rowElement, 'query');
            $elemQuery.on('click', onClickQuery(queryInfo.queryString));
            // Event binding for view result
            const $elemTable = findXCElement($rowElement, 'table');
            if (queryInfo.status === SQLStatus.Failed) {
                $elemTable.on('click', onClickError({
                    title: AlertTStr.queryHistorySQLErrorTitle,
                    errorMsg: queryInfo.errorMsg
                }));
            } else {
                const tableId = (xcHelper.getTableId(queryInfo.tableName)||'').toString();
                if (tableId.length > 0) {
                    $elemTable.on('click', onClickTable(tableId));
                }
            }
    
            // Register change duration handler
            delete this._changeDurationHandlers[queryInfo.queryId];
            if (queryInfo.endTime == null && queryInfo.status !== SQLStatus.Interrupted) {
                // Only queries w/o endTime, aka still running/compiling, need to show realtime duration
                const $elemDuration = findXCElement($rowElement, 'duration');
                this._changeDurationHandlers[queryInfo.queryId] =
                    this._createDurationHandler($elemDuration, queryInfo.startTime);
            }

            return $rowElement;
        }

        private _createUpdateHandler(
            $elem: JQuery,
            onClickQuery: (query: string) => any,
            onClickTable: (tableName: string) => any,
            onClickError: ({title, errorMsg}: {title: string, errorMsg: string}) => any
        ): (queryInfo: QueryInfo) => void {
            return (queryInfo: QueryInfo) => {
                const $newElement = this._createRowFromTemplate(
                    queryInfo,
                    onClickQuery,
                    onClickTable,
                    onClickError
                );
                $elem.empty();
                $elem.append($newElement.children());
            };
        }

        private _createDurationHandler(
            $elem: JQuery,
            startTime: number
        ): () => void {
            return () => {
                const duration = Date.now() - startTime;
                $elem.text(xcHelper.getElapsedTimeStr(duration, true));
            }
        }

        private _setupTimer() {
            const msDuration = 2000;
            if (this._refreshTimer == null) {
                const $elemSqlPanel = $('#monitor-query-history');
                const isPanelVisible = () => $elemSqlPanel.hasClass('active');
                this._refreshTimer = setInterval( () => {
                    if (isPanelVisible()) {
                        for (const sqlId in this._changeDurationHandlers) {
                            const changeDuration = this._changeDurationHandlers[sqlId];
                            changeDuration();
                        }
                    }
                }, msDuration);
            }
        }

        private _getStatusCSSClass(status: SQLStatus): string {
            return this._statusMapping[status];
        } 
    }

    function findXCElement($container: JQuery, xcid: string): JQuery {
        return $container.find(`[data-xcid="${xcid}"]`);
    }

    function readTemplate($container: JQuery, xcid: string): string {
        return findXCElement($container, xcid).html();
    }

    function htmlToElement(html: string): JQuery {
        return $($.trim(html));
    }

    function formatDateTime(dateTime: Date|number): string {
        const dt = new Date(dateTime);
        const dateString = xcHelper.getDate('-', dt, null);
        const timeString = xcHelper.getTime(dt, null, false);
        return `${dateString} ${timeString}`;
    }
}