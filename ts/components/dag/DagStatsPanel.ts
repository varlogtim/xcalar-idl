class DagStatsPanel {
    private static _instance: DagStatsPanel;
    private _tableComponent;
    private _selectedQueryIds;
    private $dfWrap;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }


    constructor() {
        this.$dfWrap = $("#dagStatsPanel .dataflowWrap .innerDataflowWrap");
        this._tableComponent = new StatsTable({
            // columnsToShow: [SqlQueryHistoryPanel.TableColumnCategory.SELECT, SqlQueryHistoryPanel.TableColumnCategory.STATUS, SqlQueryHistoryPanel.TableColumnCategory.QUERY, SqlQueryHistoryPanel.TableColumnCategory.DURATION],
            columnsToShow: [
                SqlQueryHistoryPanel.TableColumnCategory.QUERY,
                SqlQueryHistoryPanel.TableColumnCategory.DURATION,
                SqlQueryHistoryPanel.TableColumnCategory.STARTTIME,
                SqlQueryHistoryPanel.TableColumnCategory.ROWS
            ],
            tableDef: this._getTableDefinition(),
            defaultSorting: {
                sortBy: SqlQueryHistoryPanel.TableColumnCategory.ROWS,
                sortOrder: 2
            },
            numRowsToShow: 100,
            enableAutoRefresh: () => true,
            msRefreshDuration: 2000,
            container:  $("#dagStatsPanel .queryList")[0]
        });
    }

    public setup() {
        this._setupResizing();
        let $toggleBtn = $("#dagViewBar .toggleStatsPanel");

        $toggleBtn.click(() => {
            if ($toggleBtn.hasClass("modelingView")) {
                this.show();

            } else {
                this.hide();

            }
        });

        $("#dataflowStatsBtn").click(() => {
            DataflowStatsModal.Instance.show();
        });

        this._showTable();

    }

    private _showTable() {
        let today = moment().format("YYYY-MM-DD");
        let yesterday = moment().subtract(1, "days").format("YYYY-MM-DD");
        let tomorrow = moment().add(1, "days").format("YYYY-MM-DD");
        let yesterdayJobs;
        let todayJobs;
        let tomorrowJobs;
        let listYesterday = () => {
            const deferred = PromiseHelper.deferred();
            XcalarListJobs(yesterday, userIdName)
            .always((jobs) => {
                try {
                    jobs = JSON.parse(jobs)[0][0];
                    yesterdayJobs = JSON5.parse(jobs);
                } catch (e) {
                    yesterdayJobs = [];
                }
                deferred.resolve();
            });
            return deferred.promise();
        }
        listYesterday()
        .then(() => {
            return XcalarListJobs(today, userIdName);
        }).then((jobs) => {
            jobs = JSON.parse(jobs)[0][0];
            todayJobs = JSON5.parse(jobs);

            return XcalarListJobs(tomorrow, userIdName);
        }).then((jobs) => {
            jobs = JSON.parse(jobs)[0][0];
            tomorrowJobs = JSON5.parse(jobs);
            jobs = [...tomorrowJobs, ...todayJobs, ...yesterdayJobs];
            jobs.forEach(job => {
                job.duration = job.job_end_timestamp_microsecs - job.job_start_timestamp_microsecs
            });
            this._tableComponent.show(jobs, { isClearSorting: true });
        });
    }

    private _getTableDefinition() {
        const tableDef = { columns: {} };
        // tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.STATUS] = {
        //     type: SqlQueryHistoryPanel.TableHeaderColumnType.SORTABLE,
        //     sortFunction: SqlQueryHistoryPanel.sortFunctions.sortStatus,
        //     convertFunc: (queryInfo) => {
        //         const prop = {
        //             category: SqlQueryHistoryPanel.TableColumnCategory.STATUS,
        //             status: queryInfo.state
        //         };
        //         return prop;
        //     }
        // };
        tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.QUERY] = {
            type: SqlQueryHistoryPanel.TableHeaderColumnType.REGULAR,
            sortFunction: (a, b) => (a.name - b.name),
            convertFunc: (queryInfo) => {
                let id = queryInfo.job_id;
                let dataflowName = this._getDataflowName(id);
                const prop = {
                    category: SqlQueryHistoryPanel.TableColumnCategory.QUERY,
                    text:  dataflowName,
                    onLinkClick: () => {
                        const queryTab = new DagTabStats({
                            id: id + Authentication.getHashId(),
                            name:  dataflowName,
                            queryName: id,
                            state: queryInfo.state,
                            fileName: queryInfo.file_path,
                            startTime: Math.round(queryInfo.job_start_timestamp_microsecs / 1000),
                            filePath: queryInfo.file_path
                        });

                        DagTabManager.Instance.newStatsTab(queryTab);
                    }
                };
                return prop;
            }
        };

        tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.DURATION] = {
            type: SqlQueryHistoryPanel.TableHeaderColumnType.SORTABLE,
            sortFunction: (a, b) => (a.duration - b.duration),
            convertFunc: (queryInfo) => {
                const prop = {
                    category: SqlQueryHistoryPanel.TableColumnCategory.DURATION,
                    isEllipsis: true,
                    text: xcTimeHelper.getElapsedTimeStr(Math.round(queryInfo.duration / 1000))
                };
                return prop;
            }
        };

        tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.STARTTIME] = {
            type: SqlQueryHistoryPanel.TableHeaderColumnType.SORTABLE,
            sortFunction: (a, b) => (a.job_start_timestamp_microsecs - b.job_start_timestamp_microsecs),
            convertFunc: (queryInfo) => {
                const prop = {
                    category: SqlQueryHistoryPanel.TableColumnCategory.STARTTIME,
                    isEllipsis: true,
                    text: moment(queryInfo.job_start_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY")
                };
                return prop;
            }
        };


        tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.ROWS] = {
            type: SqlQueryHistoryPanel.TableHeaderColumnType.SORTABLE,
            sortFunction: (a, b) => (a.job_end_timestamp_microsecs - b.job_end_timestamp_microsecs),
            convertFunc: (queryInfo) => {
                const prop = {
                    category: SqlQueryHistoryPanel.TableColumnCategory.ROWS,
                    isEllipsis: true,
                    text: moment(queryInfo.job_end_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY")
                };
                return prop;
            }
        };


        tableDef.columns[SqlQueryHistoryPanel.TableColumnCategory.SELECT] = {
            type: SqlQueryHistoryPanel.TableHeaderColumnType.SELECTABLE,
        };

        tableDef.getKeyFunction = (data) => data.job_id;
        tableDef.onSelectChange = (queryIdSet) => {
            this._selectedQueryIds = queryIdSet;
            this._updateActions();
        };

        return tableDef;
    }

    private _getDataflowName(name) {
        if (name.startsWith("xcRet")) {
            let id = name.slice("xcRet_".length);
            id = id.slice(0, id.indexOf("_dag"));
            let tab = DagList.Instance.getDagTabById(id);
            if (tab) {
                return tab.getName();
            }
        }

        return name;
    }

    private _updateActions() {
        console.log(this._selectedQueryIds);
        // let $header = this._$cardContainer.find(".cardHeader");
        // let $delete = $header.find(".delete");
        // // let queryMap = this.queryMap;
        // let selectedQueryIds = this._selectedQueryIds;
        // $delete.addClass("xc-disabled");
        // if (selectedQueryIds.size > 0) {
        //     $delete.removeClass("xc-disabled");
        // }
    }

    public show() {
        $("#dagSearch").find(".close").click();
        $("#dagStatsPanel").removeClass("xc-hidden");
        $("#dagView").addClass("xc-hidden");
        DagViewManager.Instance.toggleDagStats(true);
        DataflowInfoPanel.Instance.show();
        this._showTable();
        let $toggleBtn = $("#dagViewBar .toggleStatsPanel");
        $toggleBtn.text("Back to modules");
        $toggleBtn.removeClass("modelingView").addClass("statsView");
        $("#dagSearch").prependTo("#dagStatsPanel .dataflowWrap .innerDataflowWrap");

    }

    public hide() {
        $("#dagSearch").find(".close").click();
        DagViewManager.Instance.toggleDagStats(false);
        $("#dagStatsPanel").addClass("xc-hidden");
        $("#dagView").removeClass("xc-hidden");
        DataflowInfoPanel.Instance.hide();
        let $toggleBtn = $("#dagViewBar .toggleStatsPanel");
        $toggleBtn.text("View Optimized Application Stats");
        $toggleBtn.addClass("modelingView").removeClass("statsView");
        $("#dagSearch").prependTo("#dagView .dataflowWrap .innerDataflowWrap");
    }

    private _setupResizing() {
        let mainAreaHeight;
        let $tableArea;
        let $parent;

        this.$dfWrap.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 40,
            start: () => {
                $parent = this.$dfWrap.parent();
                $parent.addClass("resizing");
                mainAreaHeight = $parent.height();
                $tableArea = $("#dagStatsPanel .queryList");
            },
            resize: (_event, ui) => {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    // ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                    this.$dfWrap.height(mainAreaHeight - 100);
                    this.$dfWrap.css("top", 100);
                }

                $tableArea.height(100 * (1 - pct) + "%");
            },
            stop: (_event, ui) => {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                }
                let pctTop = ui.position.top / mainAreaHeight;

                this.$dfWrap.css("top", 100 * pctTop + "%");
                this.$dfWrap.height(100 * pct + "%");
                $tableArea.height(100 * (1 - pct) + "%");
                $parent.removeClass("resizing");
                $tableArea = null;
                $parent = null;
            }
        });
    }
}

class StatsTable extends SqlQueryHistoryPanel.DynaTable<any> {
    // protected _headerTitleMapping = {};

    constructor(data) {
        super(data)
    }

    protected _setupColumnMapping() {
        super._setupColumnMapping();
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

        // TableColumnCategory => header title
        this._headerTitleMapping[TableColumnCategory.QUERY] = "Application name";
        this._headerTitleMapping[TableColumnCategory.ROWS] = "End Time";

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
        // TableColumnCategory => resize definition
        this._columnResizeDef.set(TableColumnCategory.STATUS, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.QUERY, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.STARTTIME, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.DURATION, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.TABLE, { minWidth: 75 });
        this._columnResizeDef.set(TableColumnCategory.ROWS, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.SKEW, { minWidth: 50 });
        this._columnResizeDef.set(TableColumnCategory.ACTION, { minWidth: 50 });
    }

}