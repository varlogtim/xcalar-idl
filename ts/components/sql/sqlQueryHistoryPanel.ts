namespace SqlQueryHistoryPanel {

    export enum SortOrder {
        NONE,
        ASC,
        DESC
    }

    import QueryInfo = SqlQueryHistory.QueryInfo;
    import QueryExtInfo = SqlQueryHistory.QueryExtInfo;
    import QueryUpdateInfo = SqlQueryHistory.QueryUpdateInfo;

    export interface CardOptions {
        isShowAll?: boolean,
        $container: JQuery,
        checkContainerVisible?: () => boolean // Set to null, if dont need auto-refresh
    }

    export class BaseCard {
        protected _$cardContainer: JQuery = null;
        protected _tableComponent: DynaTable<QueryInfo> = null;

        public setup({
            isShowAll = false,
            checkContainerVisible,
            $container
        }: CardOptions = <CardOptions>{} ) {
            this._$cardContainer = $container.find('.selQueryHistCard');

            this._tableComponent = this._createTableComponent({
                checkContainerVisible: checkContainerVisible,
                numRowToShow: isShowAll ? -1 : 200
            });

            // Title
            const $title = this._$cardContainer.find('.cardHeader .title');
            $title.html(this.getTitle());

            // Refresh
            const $refreshicon = this._$cardContainer.find(".selRefreshQueryHist");
            $refreshicon.on('click', () => {
                this.show(true);
            });

            // Cancel
            const $cancelicon = this._$cardContainer.find(".selCancelQueryHist");
            $cancelicon.on("click", () => {
                SQLEditorSpace.Instance.cancelExecution();
            });

            SqlQueryHistModal.getInstance().setup();
        }

        protected getTitle(): string {
            return SQLTStr.queryHistCardTitle;
        }

        protected getColumnsToShow(): TableColumnCategory[] {
            return [
                TableColumnCategory.STATUS,
                TableColumnCategory.QUERY,
                TableColumnCategory.STARTTIME,
                TableColumnCategory.DURATION,
                TableColumnCategory.TABLE
            ];
        }

        protected getTableDefinition(): TableDefinition<QueryInfo> {
            const tableDef: TableDefinition<QueryInfo> = { columns: {} };
            tableDef.columns[TableColumnCategory.STATUS] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortStatus,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnStatusProp = {
                        category: TableColumnCategory.STATUS,
                        status: queryInfo.status
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.QUERY] = {
                type: TableHeaderColumnType.REGULAR,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextLinkProp = {
                        category: TableColumnCategory.QUERY,
                        text: queryInfo.queryString,
                        onLinkClick: () => this._onClickQuery(queryInfo.queryString)
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.STARTTIME] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortStartTime,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.STARTTIME,
                        isEllipsis: false,
                        text: formatDateTime(queryInfo.startTime),
                        tooltip: formatDateTime(queryInfo.startTime, true)
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.DURATION] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortDuration,
                convertFunc: (queryInfo) => {
                    let duration;
                    if (queryInfo.endTime != null) {
                        duration = queryInfo.endTime - queryInfo.startTime;
                    } else if (queryInfo.status === SQLStatus.Interrupted) {
                        duration = "N/A";
                    } else {
                        duration = Date.now() - queryInfo.startTime
                    }
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.DURATION,
                        isEllipsis: true,
                        text: duration === "N/A"
                            ? duration
                            : xcHelper.getElapsedTimeStr(
                                duration < 0 ? 0 : duration,
                                (queryInfo.endTime == null)
                            )
                    };
                    return prop;
                }
            };
            tableDef.columns[TableColumnCategory.TABLE] = {
                type: TableHeaderColumnType.REGULAR,
                convertFunc: (queryInfo) => {
                    let text = "";
                    if (queryInfo.status === SQLStatus.Failed) {
                        text = queryInfo.errorMsg;
                    } else if (queryInfo.status === SQLStatus.Done) {
                        text = "View";
                    }
                    const prop: TableBodyColumnTextLinkProp = {
                        category: TableColumnCategory.TABLE,
                        text: text,
                        onLinkClick: () => {
                            if (queryInfo.status === SQLStatus.Failed) {
                                this._onClickError({
                                    title: AlertTStr.queryHistorySQLErrorTitle,
                                    errorMsg: queryInfo.errorMsg
                                });
                            } else if (queryInfo.status === SQLStatus.Done) {
                                this._onClickTable(queryInfo.tableName,
                                                   {columns: queryInfo.columns});
                            }
                        }
                    };
                    return prop;
                }
            };
            return tableDef;
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
                    this._updateTableUI(this.queryMap, true);
                    this._checkRunningQuery(this.queryMap);
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

        protected get queryMap(): SqlQueryMap {
            return SqlQueryHistory.getInstance().getQueryMap();
        }

        protected _createTableComponent(props: {
            numRowToShow: number,
            checkContainerVisible?: () => boolean
        }): DynaTable<QueryInfo> {
            const { numRowToShow, checkContainerVisible } = props;

            return new DynaTable<QueryInfo>({
                columnsToShow: this.getColumnsToShow(),
                tableDef: this.getTableDefinition(),
                defaultSorting: {
                    sortBy: TableColumnCategory.STARTTIME,
                    sortOrder: SortOrder.DESC
                },
                numRowsToShow: numRowToShow,
                enableAutoRefresh: checkContainerVisible,
                msRefreshDuration: 2000,
                container: this._$cardContainer.find('.cardMain')[0]
            });
        }

        protected _checkRunningQuery(queryMap: SqlQueryMap): void {
            let runningQueryMap: SqlQueryMap = {};
            let hasRunningQuery: boolean = false;
            for (let id in queryMap) {
                let queryInfo = queryMap[id];
                if (queryInfo && queryInfo.status === SQLStatus.Running) {
                    runningQueryMap[id] = queryInfo;
                    hasRunningQuery = true;
                }
            }

            if (hasRunningQuery) {
                XcalarQueryList(DagNodeSQL.PREFIX + "*")
                .then((res) => {
                    try {
                        let set: Set<string> = new Set();
                        res.queries.forEach((query) => {
                            set.add(query.name);
                        });

                        for (let id in runningQueryMap) {
                            if (!set.has(id)) {
                                // the query is finishing running but we somehow lose meta
                                let queryInfo = runningQueryMap[id];
                                queryInfo.status = SQLStatus.Done;
                                SQLHistorySpace.Instance.update(queryInfo);
                            } else {
                                // XXX TODO add a checking for running status
                                // if it's not tracked yet (like a refresh case)
                            }
                        }
                    } catch (e) {
                        console.error(e);
                    }
                })
            }
        }

        protected _updateTableUI(queryMap: SqlQueryMap, isResetSorting: boolean): void {
            this._tableComponent.show(
                Object.keys(queryMap).map((sqlId) => queryMap[sqlId]),
                { isClearSorting: isResetSorting }
            );
        }

        // Event handler for query click
        protected _onClickQuery(query: string): void {
            // Show the query modal
            SqlQueryHistModal.getInstance().show({query: query});
        }

        protected _onClickError(
            {title, errorMsg}: {title: string, errorMsg: string}
        ): void {
            Alert.show({
                title: title,
                msg: errorMsg,
                isAlert: true,
                align: 'left',
                preSpace: true,
                sizeToText: true
            });
        }

        // Event handler for table click
        protected _onClickTable(tableName: string, options: any): void {
            // Show the table
            let tableId = xcHelper.getTableId(tableName);
            if (!tableId) {
                // invalid case
                Alert.show({
                    title: SQLErrTStr.Err,
                    msg: SQLErrTStr.TableDropped,
                    isAlert: true
                });
                return;
            }
            let table = new TableMeta({
                tableId: tableId,
                tableName: tableName
            });
            if (options && options.columns) {
                table.tableCols = [];
                options.columns.forEach((col) => {
                    table.tableCols.push(ColManager.newPullCol(col.name,
                                         col.backName, col.type));
                });
                table.tableCols.push(ColManager.newDATACol());
            }
            SQLResultSpace.Instance.viewTable(table);
        }
    }

    export class ExtCard extends BaseCard {
        protected _selectedQueryIds = new Set<string>();

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

        /**
         * Get a set of query IDs selected in the table
         */
        public getSelectedQueryIds(): Set<string> {
            return new Set(this._selectedQueryIds);
        }

        protected getTitle(): string {
            return SQLTStr.queryHistExtCardTitle;
        }
        protected getColumnsToShow(): TableColumnCategory[] {
            return [
                TableColumnCategory.SELECT,
                TableColumnCategory.STATUS,
                TableColumnCategory.QUERY,
                TableColumnCategory.STARTTIME,
                TableColumnCategory.DURATION,
                TableColumnCategory.ROWS,
                TableColumnCategory.SKEW,
                TableColumnCategory.ACTION,
                TableColumnCategory.TABLE
            ];
        }

        protected getTableDefinition(): TableDefinition<QueryExtInfo> {
            const tableDef = <TableDefinition<QueryExtInfo>>super.getTableDefinition();

            tableDef.getKeyFunction = (data: QueryExtInfo) => data.queryId;
            tableDef.onSelectChange = (queryIdSet: Set<string>) => {
                this._selectedQueryIds = queryIdSet;
            }

            tableDef.columns[TableColumnCategory.ROWS] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortRows,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.ROWS,
                        isEllipsis: false,
                        text: `${formatNumber(queryInfo.rows)}`
                    };
                    return prop;
                }
            };

            tableDef.columns[TableColumnCategory.SKEW] = {
                type: TableHeaderColumnType.SORTABLE,
                sortFunction: sortFunctions.sortSkew,
                convertFunc: (queryInfo) => {
                    const prop: TableBodyColumnTextProp = {
                        category: TableColumnCategory.SKEW,
                        isEllipsis: false,
                        text: `${formatNumber(queryInfo.skew)}`,
                        style: genSkewStyle(queryInfo.skew)
                    };
                    return prop;
                }
            };

            tableDef.columns[TableColumnCategory.ACTION] = {
                type: TableHeaderColumnType.REGULAR,
                convertFunc: (queryInfo) => {
                    let text = "";
                    let iconClass = "";
                    let isValidStatus = queryInfo.status === SQLStatus.Done ||
                    queryInfo.status === SQLStatus.Failed;
                    if (isValidStatus) {
                        text = SQLTStr.queryTableBodyTextAnalyze;
                        iconClass = 'xi-dataflow';
                    } else if (queryInfo.status === SQLStatus.Running) {
                        text = SQLTStr.queryTableBodyTextProgress;
                        iconClass = 'xi-system2';
                    }
                    const prop: TableBodyColumnIconLinkProp = {
                        category: TableColumnCategory.ACTION,
                        text: text,
                        iconClass: iconClass,
                        onLinkClick: () => {
                            if (isValidStatus) {
                                SQLHistorySpace.Instance.analyze(queryInfo);
                            } else if (queryInfo.status === SQLStatus.Running) {
                                SQLHistorySpace.Instance.viewProgress(queryInfo.dataflowId);
                            }
                        }
                    };
                    return prop;
                }
            };

            tableDef.columns[TableColumnCategory.SELECT] = {
                type: TableHeaderColumnType.SELECTABLE,
            };

            return tableDef;
        }
    }

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

    enum TableHeaderColumnType {
        REGULAR, SORTABLE, SELECTABLE
    }

    enum TableColumnCategory {
        SELECT = 'SELECT',
        STATUS = 'STATUS',
        QUERY = 'QUERY',
        STARTTIME = 'STARTTIME',
        DURATION = 'DURATION',
        TABLE = 'TABLE',
        ROWS = 'ROWS',
        SKEW = 'SKEW',
        ACTION = 'ACTION'
    }

    interface TableSortMethod {
        sortBy: TableColumnCategory,
        sortOrder: SortOrder
    }

    interface TableHeaderColumnProp {
        type: TableHeaderColumnType, // Basic
        category: TableColumnCategory, // Basic
        sortOrder?: SortOrder, // SORT
        onClickSort?: (currentOrder: SortOrder) => void, // SORT
        isSelected?: boolean, // SELECTABLE
        onClickSelect?: () => void // SELECTABLE
    }

    interface TableBodyColumnProp {
        category: TableColumnCategory
    }

    interface TableBodyColumnCheckboxProp extends TableBodyColumnProp {
        isChecked: boolean,
        onClickCheck: () => void
    }

    interface TableBodyColumnStatusProp extends TableBodyColumnProp {
        // cssClass: string,
        status: SQLStatus
    }

    interface TableBodyColumnTextProp extends TableBodyColumnProp {
        isEllipsis: boolean,
        text: string,
        tooltip?: string,
        style?: string
    }

    interface TableBodyColumnTextLinkProp extends TableBodyColumnProp {
        // cssClass: string,
        text: string,
        onLinkClick: () => void
    }

    interface TableBodyColumnIconLinkProp extends TableBodyColumnProp {
        text: string,
        iconClass: string,
        onLinkClick: () => void,
    }

    type TableDefinition<TData> = {
        onSelectChange?: (keySet: Set<string>) => void, // Callback function when selected rows being changed
        getKeyFunction?: (data: TData) => string, // The function the get the key of data
        columns: { [key: string]: { // Key is TableColumnCategory
            type: TableHeaderColumnType, // Type of the column (sortable, selectable, regular)
            sortFunction?: (a: TData, b: TData) => number, // The function to help sorting the data(similar to the compare function of Array.sort)
            convertFunc?: (data: TData) => TableBodyColumnProp // The function to convert the data to the value shown in the table
        }}
    }

    class DynaTable<TData> {
        protected _container: HTMLElement;
        protected _columnsToShow: TableColumnCategory[];
        protected _tableDef: TableDefinition<TData>;
        protected _defaultSorting: TableSortMethod;
        protected _numRowsToShow: number;
        protected _enableAutoRefresh: () => boolean;
        protected _msRefreshDuration: number;

        protected _data: TData[] = [];
        protected _selectSet: Set<string> = new Set();
        protected _currentSorting: TableSortMethod;
        protected _refreshTimer;

        protected _templateMgr = new OpPanelTemplateManager();
        protected _templates = {
            table:
                `<div class="flexTable">
                    <APP-HEADER></APP-HEADER>
                    <APP-BODY></APP-BODY>
                </div>`,
            headerColumnRegular:
                `<div class="col {{cssClass}}"><span class="label">{{title}}</span></div>`,
            headerColumnSortable:
                `<div class="col col-sort {{cssClass}}" (click)="onClickSort"><span class="label">{{title}}</span><div class="sort"><i class="icon fa-8 {{sortOrderClass}}"></i></div></div>`,
            headerColumnCheckbox:
                `<div class="col {{cssClass}}">
                    <div class="checkbox {{cssChecked}}" (click)="onClick">
                        <i class="icon xi-ckbox-empty fa-15"></i>
                        <i class="icon xi-ckbox-selected fa-15"></i>
                    </div>
                </div>`,
            headerColumnSortableNoSort:
                `<div class="col col-sort {{cssClass}}" (click)="onClickSort"><span class="label">{{title}}</span><div class="sort sort-none">
                    <span class="sortIconWrap"><i class="icon fa-8 xi-arrow-up"></i></span>
                    <span class="sortIconWrap"><i class="icon fa-8 xi-arrow-down"></i></span>
                </div></div>`,
            header:
                `<div class="row row-header"><APP-HEADERCOLUMNS></APP-HEADERCOLUMNS></div>`,
            bodyColumnStatus:
                `<div class="col {{cssClass}}"><i class="icon xi-solid-circle {{iconClass}}"></i>{{text}}</div>`,
            bodyColumnText:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">{{text}}</div>`,
            bodyColumnTextTooltip:
                `<div class="col {{cssClass}}" style="{{cssStyle}}">
                    <span data-toggle="tooltip" data-placement="top" data-container="body" data-original-title="{{tooltip}}">{{text}}</span>
                </div>`,
            bodyColumnElpsText:
                `<div class="col {{cssClass}}" style="{{cssStyle}}"><span class="elps-text">{{text}}</span></div>`,
            bodyColumnElpsTextTooltip:
                `<div class="col {{cssClass}}">
                    <span class="elps-text" style="{{cssStyle}}" data-toggle="tooltip" data-placement="top" data-container="body" data-original-title="{{tooltip}}">{{text}}</span>
                </div>`,
            bodyColumnElpsTextLink:
                `<div class="col link {{cssClass}}"><span class="elps-text" (click)="onLinkClick">{{text}}</span></div>`,
            bodyColumnIconLink:
                `<div class="col link {{cssClass}}">
                    <span class="iconLinkWrap" (click)="onLinkClick" data-toggle="tooltip" data-placement="top" data-container="body" data-original-title="{{text}}"><i class="icon {{iconClass}}"></i></span>
                </div>`,
            bodyColumnCheckbox:
                `<div class="col {{cssClass}}">
                    <div class="checkbox {{cssChecked}}" (click)="onClick">
                        <i class="icon xi-ckbox-empty fa-15"></i>
                        <i class="icon xi-ckbox-selected fa-15"></i>
                    </div>
                </div>`,
            bodyRow:
                `<div class="row"><APP-BODYCOLUMNS></APP-BODYCOLUMNS></div>`,
            body:
                `<div class="body"><APP-BODYROWS></APP-BODYROWS></div>`
        };

        protected _sortOrderMapping = {};
        protected _headerTitleMapping = {};
        protected _headerCssMapping = {};
        protected _statusMapping = {};
        protected _bodyColumnBuilder = {};
        protected _sqlStatusString = {};

        /**
         * Constructor
         * @param columnsToShow Columns will be shown in the list order
         * @param tableDef Definition of each columns(such as how to sort a column, how to convert the data to the value being shown in the table ...)
         * @param defaultSorting
         * @param numRowsToShow Number of rows to show in the table. -1 = no limit
         * @param container The container HTML element in which the table will be rendered
         */
        constructor(props: {
            columnsToShow: TableColumnCategory[],
            tableDef: TableDefinition<TData>,
            defaultSorting: TableSortMethod,
            numRowsToShow?: number,
            enableAutoRefresh?: () => boolean,
            msRefreshDuration?: number,
            container: HTMLElement
        }) {
            this._setupStaticMapping();
            this._setupColumnMapping();

            const {
                columnsToShow, tableDef, container, defaultSorting,
                numRowsToShow = 200, enableAutoRefresh, msRefreshDuration = 2000
            } = props;
            this._columnsToShow = columnsToShow;
            this._tableDef = tableDef;
            this._defaultSorting = defaultSorting;
            this._currentSorting = defaultSorting;
            this._numRowsToShow = numRowsToShow;
            this._enableAutoRefresh = enableAutoRefresh;
            this._msRefreshDuration = msRefreshDuration;

            this._container = container;
        }

        /**
         * Show the table UI according to the data passed in
         * @param data A list of data to be shown in the table
         * @param options
         */
        public show(data: TData[], options?: {
            isClearSorting?: boolean
        }) {
            const { isClearSorting = false } = options || {};

            // Setup the sorting
            if (isClearSorting) {
                this._currentSorting = this._defaultSorting;
            }

            // Store the raw data
            this._data = data.filter((v) => (data != null))
                .map((v) => xcHelper.deepCopy(v));

            // Update the UI
            this._updateUI();

            // Setup auto refresh
            if (this._enableAutoRefresh != null) {
                // if (this._refreshTimer == null) {
                //     this._refreshTimer = setInterval( () => {
                //         if (this._enableAutoRefresh()) {
                //             this._updateUI();
                //         }
                //     }, this._msRefreshDuration);
                // }
            }
        }

        protected _updateUI() {
            // Determine sort order of each columns, according to the current sorting
            const sorting = this._currentSorting;
            const columnSortOrders = this._getColumnSortOrders(sorting, this._columnsToShow);

            // Create sort index (a index list of this._data)
            // Ex. [3,2,4,1]
            const sortIndex = this._getSortIndex(
                this._data,
                sorting.sortOrder,
                this._tableDef.columns[sorting.sortBy].sortFunction,
                this._numRowsToShow
            );

            // Update the selected list
            const newSelectSet = this._removeSelectNotShown(
                this._data, sortIndex, this._tableDef.getKeyFunction , this._selectSet
            );
            this._setSelectSet(newSelectSet);

            // Create table header model
            const headerProp: TableHeaderColumnProp[] = this._columnsToShow.map((category) => {
                const columnDef = this._tableDef.columns[category];
                const prop: TableHeaderColumnProp = {
                    type: columnDef.type,
                    category: category
                };
                if (columnDef.type === TableHeaderColumnType.SORTABLE) {
                    prop.sortOrder = columnSortOrders.get(category);
                    prop.onClickSort = (currentOrder: SortOrder) => {
                        this._currentSorting = this._getNextSorting(
                            currentOrder,
                            category
                        );
                        this._updateUI();
                    };
                } else if (columnDef.type === TableHeaderColumnType.SELECTABLE) {
                    const isSelectAll = newSelectSet.size === sortIndex.length;
                    prop.isSelected = isSelectAll;
                    prop.onClickSelect = () => {
                        if (isSelectAll) {
                            this._setSelectSet(new Set());
                        } else {
                            this._setSelectSet(new Set(
                                sortIndex.map((dataIndex) => this._tableDef.getKeyFunction(this._data[dataIndex]))
                            ));
                        }
                        this._updateUI();
                    };
                }
                return prop;
            });

            // Create table body model
            const bodyProp: TableBodyColumnProp[][] = [];
            for (const dataIndex of sortIndex) {
                const data = this._data[dataIndex];
                if (data == null) {
                    continue;
                }
                const rowProp: TableBodyColumnProp[] = this._columnsToShow.map((category) => {
                    const colDef = this._tableDef.columns[category];
                    if (colDef.type === TableHeaderColumnType.SELECTABLE) {
                        const dataKey = this._tableDef.getKeyFunction(data);
                        const isSelected = this._selectSet.has(dataKey);
                        const columnProp: TableBodyColumnCheckboxProp = {
                            category: category,
                            isChecked: isSelected,
                            onClickCheck: () => {
                                this._selectRow(dataKey, !isSelected);
                                this._updateUI();
                            }
                        }
                        return columnProp;
                    } else {
                        return colDef.convertFunc(data);
                    }
                });
                bodyProp.push(rowProp);
            }

            // Create component DOM
            const tableElement = this._createTable({
                headerProp: headerProp,
                bodyProp: bodyProp
            });

            // Call templateMgr to update UI
            this._templateMgr.updateDOM(this._container, tableElement);
        }

        protected _createTable(props: {
            headerProp: TableHeaderColumnProp[],
            bodyProp: TableBodyColumnProp[][]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { headerProp, bodyProp } = props;

            const templateId = 'table';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                'APP-HEADER': this._createHeader({ columnProps: headerProp }),
                'APP-BODY': this._createBody({ rowProps: bodyProp })
            });
        }

        protected _createHeader(props?: {
            columnProps: TableHeaderColumnProp[]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { columnProps } = props;

            const templateId = 'header';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const columns = [];
            for (const {type, category, sortOrder, onClickSort, isSelected, onClickSelect } of columnProps) {
                let elems = null;
                if (type === TableHeaderColumnType.REGULAR) {
                    // Regular header column
                    elems = this._createHeaderRegularColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        title: this._getHeaderColumnTitle(category)
                    });
                } else if (type === TableHeaderColumnType.SORTABLE) {
                    // Sortable header column
                    elems = this._createHeaderSortableColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        title: this._getHeaderColumnTitle(category),
                        sortOrder: sortOrder,
                        onClickSort: onClickSort
                    });
                } else if (type === TableHeaderColumnType.SELECTABLE) {
                    // Checkbox header column
                    elems = this._createHeaderCheckboxColumn({
                        cssClass: this._getHeaderColumnCss(category),
                        isChecked: isSelected,
                        onClick: onClickSelect
                    });
                } else {
                    console.error(`Unsupported column type ${type}`);
                }

                if (elems != null) {
                    elems.forEach((e) => {
                        columns.push(e);
                    });
                }
            }

            return this._templateMgr.createElements(templateId, {
                'APP-HEADERCOLUMNS': columns
            });
        }

        protected _createBody(props?: {
            rowProps: TableBodyColumnProp[][]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { rowProps } = props;

            const templateId = 'body';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const bodyRows = [];
            rowProps.forEach((columnProps) => {
                const rowElems = this._createBodyRow({
                    columnProps: columnProps
                });
                if (rowElems != null) {
                    rowElems.forEach((elem) => {
                        bodyRows.push(elem);
                    });
                }
            });

            return this._templateMgr.createElements(templateId, {
                'APP-BODYROWS': bodyRows
            });
        }

        protected _createBodyRow(props: {
            columnProps: TableBodyColumnProp[]
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { columnProps } = props;

            const templateId = 'bodyRow';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            const columns = [];
            columnProps.forEach((columnProp) => {
                const elems = this._getBodyColumnBuilder(columnProp.category)(columnProp);
                if (elems != null) {
                    elems.forEach((e) => {
                        columns.push(e);
                    })
                }
            });
            return this._templateMgr.createElements(templateId, {
                'APP-BODYCOLUMNS': columns
            });

        }

        protected _createBodyColumnCheckbox(
            props?: TableBodyColumnCheckboxProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, isChecked, onClickCheck } = props;

            const templateId = 'bodyColumnCheckbox';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                cssChecked: isChecked ? 'checked': '',
                onClick: onClickCheck
            });
        }

        protected _createBodyColumnStatus(
            props?: TableBodyColumnStatusProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, status } = props;

            const templateId = 'bodyColumnStatus';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                iconClass: this._getBodyColumnStatusIconCss(status),
                text: this._getBodyColumnStatusText(status)
            });
        }

        protected _createBodyColumnText(
            props?: TableBodyColumnTextProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { isEllipsis, tooltip, category, text, style = '' } = props;

            const templateId = isEllipsis
                ? (tooltip != null ? 'bodyColumnElpsTextTooltip' : 'bodyColumnElpsText')
                :  (tooltip != null ? 'bodyColumnTextTooltip' : 'bodyColumnText');
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                text: text,
                tooltip: tooltip,
                cssStyle: style.length === 0 ? null : style
            });
        }

        protected _createBodyColumnTextLink(
            props?: TableBodyColumnTextLinkProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, text, onLinkClick = () => {} } = props;

            const templateId = 'bodyColumnElpsTextLink';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                text: text,
                onLinkClick: onLinkClick
            });
        }

        protected _createBodyColumnIconLink(
            props?: TableBodyColumnIconLinkProp
        ): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { category, text, iconClass, onLinkClick = () => {} } = props;

            const templateId = 'bodyColumnIconLink';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: this._getBodyColumnCss(category),
                iconClass: iconClass,
                text: text,
                onLinkClick: onLinkClick
            });
        }

        protected _createHeaderRegularColumn(props?: {
            cssClass: string,
            title: string
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, title } = props;

            const templateId = 'headerColumnRegular';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: cssClass,
                title: title
            });
        }

        protected _createHeaderCheckboxColumn(props?: {
            cssClass: string,
            isChecked: boolean,
            onClick: () => void
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, isChecked, onClick = () => {} } = props;

            const templateId = 'headerColumnCheckbox';
            this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

            return this._templateMgr.createElements(templateId, {
                cssClass: cssClass,
                cssChecked: isChecked ? 'checked': '',
                onClick: onClick
            });
        }

        protected _createHeaderSortableColumn(props?: {
            cssClass: string,
            title: string,
            sortOrder: SortOrder,
            onClickSort: (currnetOrder: SortOrder) => void
        }): NodeDefDOMElement[] {
            if (props == null) {
                return null;
            }

            // Deconstruct parameters
            const { cssClass, title, sortOrder, onClickSort = () => {} } = props;

            const currentOrder = sortOrder;
            if (sortOrder == SortOrder.NONE) {
                const templateId = 'headerColumnSortableNoSort';
                this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

                return this._templateMgr.createElements(templateId, {
                    cssClass: cssClass,
                    title: title,
                    onClickSort: () => {
                        onClickSort(currentOrder);
                    }
                });

            } else {
                const templateId = 'headerColumnSortable';
                this._templateMgr.loadTemplateFromString(templateId, this._templates[templateId]);

                return this._templateMgr.createElements(templateId, {
                    cssClass: cssClass,
                    title: title,
                    sortOrderClass: this._getSortOrderClass(sortOrder),
                    onClickSort: () => {
                        onClickSort(currentOrder);
                    }
                });
            }
        }

        // *** Mapping functions - start ***
        protected _setupColumnMapping() {
            // TableColumnCategory => header title
            this._headerTitleMapping[TableColumnCategory.STATUS] = SQLTStr.queryTableColumnStatus;
            this._headerTitleMapping[TableColumnCategory.QUERY] = SQLTStr.queryTableColumnQuery;
            this._headerTitleMapping[TableColumnCategory.STARTTIME] = SQLTStr.queryTableColumnSTime;
            this._headerTitleMapping[TableColumnCategory.DURATION] = SQLTStr.queryTableColumnDuration;
            this._headerTitleMapping[TableColumnCategory.TABLE] = SQLTStr.queryTableColumnTable;
            this._headerTitleMapping[TableColumnCategory.ROWS] = SQLTStr.queryTableColumnNumRows;
            this._headerTitleMapping[TableColumnCategory.SKEW] = SQLTStr.queryTableColumnSkew;
            this._headerTitleMapping[TableColumnCategory.ACTION] = SQLTStr.queryTableColumnAction;
            // TableColumnCategory => header css
            this._headerCssMapping[TableColumnCategory.SELECT] = 'col-select';
            this._headerCssMapping[TableColumnCategory.STATUS] = 'col-status';
            this._headerCssMapping[TableColumnCategory.QUERY] = 'col-query';
            this._headerCssMapping[TableColumnCategory.STARTTIME] = 'col-time';
            this._headerCssMapping[TableColumnCategory.DURATION] = 'col-duration';
            this._headerCssMapping[TableColumnCategory.TABLE] = 'col-table';
            this._headerCssMapping[TableColumnCategory.ROWS] = 'col-rows';
            this._headerCssMapping[TableColumnCategory.SKEW] = 'col-skew';
            this._headerCssMapping[TableColumnCategory.ACTION] = 'col-action';
            // TableColumnCategory => DOM builder for body column
            this._bodyColumnBuilder[TableColumnCategory.SELECT] = this._createBodyColumnCheckbox.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.STATUS] = this._createBodyColumnStatus.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.QUERY] = this._createBodyColumnTextLink.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.STARTTIME] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.DURATION] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.TABLE] = this._createBodyColumnTextLink.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.ROWS] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.SKEW] = this._createBodyColumnText.bind(this);
            this._bodyColumnBuilder[TableColumnCategory.ACTION] = this._createBodyColumnIconLink.bind(this);
        }

        protected _setupStaticMapping() {
            // SortOrder => sort icon
            this._sortOrderMapping[SortOrder.ASC] = 'xi-arrow-up';
            this._sortOrderMapping[SortOrder.DESC] = 'xi-arrow-down';
            this._sortOrderMapping[SortOrder.NONE] = '';
            // SQLStatus => status icon
            this._statusMapping[SQLStatus.Cancelled] = 'icon-cancel';
            this._statusMapping[SQLStatus.Compiling] = 'icon-compile';
            this._statusMapping[SQLStatus.Done] = 'icon-done';
            this._statusMapping[SQLStatus.Failed] = 'icon-fail';
            this._statusMapping[SQLStatus.Running] = 'icon-run';
            this._statusMapping[SQLStatus.Interrupted] = 'icon-cancel';
            // SQL Status => status string
            this._sqlStatusString[SQLStatus.Running] = SQLTStr.queryHistStatusRun;
            this._sqlStatusString[SQLStatus.Done] = SQLTStr.queryHistStatusDone;
            this._sqlStatusString[SQLStatus.Failed] = SQLTStr.queryHistStatusFail;
            this._sqlStatusString[SQLStatus.Cancelled] = SQLTStr.queryHistStatusCancel;
            this._sqlStatusString[SQLStatus.Compiling] = SQLTStr.queryHistStatusCompile;
            this._sqlStatusString[SQLStatus.None] = SQLTStr.queryHistStatusNone;
            this._sqlStatusString[SQLStatus.Interrupted] = SQLTStr.queryHistStatusInterrupt;
        }

        protected _getSortOrderClass(sortOrder: SortOrder): string {
            return this._sortOrderMapping[sortOrder] || '';
        }

        protected _getHeaderColumnTitle(category: TableColumnCategory): string {
            return this._headerTitleMapping[category] || '';
        }

        protected _getHeaderColumnCss(category: TableColumnCategory): string {
            return this._headerCssMapping[category] || '';
        }

        protected _getBodyColumnCss(category: TableColumnCategory): string {
            return this._headerCssMapping[category] || '';
        }

        protected _getBodyColumnStatusText(status: SQLStatus): string {
            return this._sqlStatusString[status] || '';
        }

        protected _getBodyColumnStatusIconCss(status: SQLStatus): string {
            return this._statusMapping[status] || '';
        }

        protected _getBodyColumnBuilder(category: TableColumnCategory): (any) => any {
            return this._bodyColumnBuilder[category] || (() => null);
        }
        // *** Mapping functions - end ***

        // *** Helper functions - start ***
        protected _getColumnSortOrders(
            currentSorting: TableSortMethod,
            columns: TableColumnCategory[]
        ): Map<TableColumnCategory, SortOrder> {
            const sortOrders: Map<TableColumnCategory, SortOrder> = new Map();
            for (const column of columns) {
                if (currentSorting == null || currentSorting.sortBy !== column) {
                    sortOrders.set(column, SortOrder.NONE);
                } else {
                    sortOrders.set(column, currentSorting.sortOrder);
                }
            }
            return sortOrders;
        }

        protected _getSortIndex(
            data: TData[],
            order: SortOrder = SortOrder.NONE,
            sortFunction: (a: TData, b: TData) => number,
            numRows: number
        ): number[] {
            const sortList = data.map((_, i) => i);
            if (order !== SortOrder.NONE) {
                sortList.sort( (a, b) => {
                    let gt = sortFunction(data[a], data[b]);
                    return order === SortOrder.ASC? gt: -gt;
                });
            }
            if (numRows < 0) {
                return sortList;
            } else {
                return sortList.slice(0, numRows);
            }
        }

        protected _getNextSorting(
            currentOrder: SortOrder,
            currentColumn: TableColumnCategory,
        ): TableSortMethod {
            const stateTransit = {};
            stateTransit[SortOrder.NONE] = SortOrder.ASC;
            stateTransit[SortOrder.ASC] = SortOrder.DESC;
            stateTransit[SortOrder.DESC] = SortOrder.NONE;

            return {
                sortBy: currentColumn, sortOrder: stateTransit[currentOrder]
            };
        }

        protected _removeSelectNotShown(
            dataList: TData[],
            dataIndexShown: number[],
            getKeyFunc: (data: TData) => string,
            selectSet: Set<string>
        ): Set<string> {
            const allRowsSet = new Set();
            for (const dataIndex of dataIndexShown) {
                allRowsSet.add(getKeyFunc(dataList[dataIndex]));
            }
            const newSelectSet: Set<string> = new Set();
            for (const key of selectSet) {
                if (allRowsSet.has(key)) {
                    newSelectSet.add(key);
                }
            }
            return newSelectSet;
        }

        protected _setSelectSet(newSelectSet: Set<string>): void {
            let isChanged = newSelectSet.size !== this._selectSet.size;
            if (!isChanged) {
                for (const key of newSelectSet.keys()) {
                    if (!this._selectSet.has(key)) {
                        isChanged = true;
                        break;
                    }
                }
            }
            if (isChanged) {
                this._selectSet = newSelectSet;
                this._tableDef.onSelectChange(new Set(newSelectSet));
            }
        }

        protected _selectRow(dataKey: string, isSelect: boolean): void {
            if (isSelect) {
                if (!this._selectSet.has(dataKey)) {
                    this._selectSet.add(dataKey);
                    this._tableDef.onSelectChange(new Set(this._selectSet));
                }
            } else {
                if (this._selectSet.has(dataKey)) {
                    this._selectSet.delete(dataKey);
                    this._tableDef.onSelectChange(new Set(this._selectSet));
                }
            }
        }
        // *** Helper functions - end ***
    }

    export const sortFunctions = {
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
        ),
        sortRows: (a: QueryExtInfo, b: QueryExtInfo) => {
            const aValue = a.rows || Number.MAX_VALUE;
            const bValue = b.rows || Number.MAX_VALUE;
            return aValue - bValue;
        },
        sortSkew: (a: QueryExtInfo, b: QueryExtInfo) => {
            const aValue = a.skew || Number.MAX_VALUE;
            const bValue = b.skew || Number.MAX_VALUE;
            return aValue - bValue;
        }
    };

    export function formatDateTime(dateTime: Date|number, includeDate = false): string {
        const dt = new Date(dateTime);
        const dateString = includeDate ? xcHelper.getDate('-', dt, null) : '';
        const timeString = xcHelper.getTime(dt, null, false);
        const sep = includeDate ? ' ': '';
        return `${dateString}${sep}${timeString}`;
    }

    export function formatNumber(number: Number): string {
        const strNA = 'N/A';
        if (number == null) {
            return strNA;
        }
        const n = Number(number);
        return Number.isNaN(n) ? strNA : n.toLocaleString();
    }

    function genSkewStyle(skew: number): string {
        const color = TableSkew.getSkewColorStyle(skew);
        return color.length > 0 ? `color:${color};` : '';
    }
}