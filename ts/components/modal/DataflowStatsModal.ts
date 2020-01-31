class DataflowStatsModal {
    private static _instance: DataflowStatsModal;

    private _modalHelper: ModalHelper;
    private _percentageLabel: boolean = false;
    private _instanceOptions;
    private _chart;

    public static get Instance(): DataflowStatsModal {
        return this._instance || (this._instance = new this());
    }

    private constructor() {
        this._modalHelper = new ModalHelper(this._getModal(), {
            sizeToDefault: true,
            resizeCallback: () => {
                if (this._chart) {
                    this._chart.reflow();
                }
            }
        });

       this._addEventListeners();
    };

    /**
     * SkewInfoModal.Instance.show
     * @param tableId
     */
    public show(options?) {
        const tabId = DagViewManager.Instance.getActiveDag().getTabId();
        const dagTab: DagTabStats = <DagTabStats>DagTabManager.Instance.getTabById(tabId);
        if (!dagTab || !dagTab.getDataflowStats) {
            return false;
        }
        this._modalHelper.setup();
        this._drawBarChart();
    }

    private _drawTimeline() {
        const tabId = DagViewManager.Instance.getActiveDag().getTabId();
        const dagTab: DagTabStats = <DagTabStats>DagTabManager.Instance.getTabById(tabId);
        const dagGraph = dagTab.getGraph();

        let stats = dagTab.getDataflowStats(true);
        // const nodes = stats.node_execution_times_sorted;
        const nodes = stats.nodes;
        const data = [];
        let time = 0;
        nodes.forEach((node) => {
            const destTable = node.node_name;
            const dagNodeId = dagGraph._tableNameToDagIdMap[destTable];
            const dagNode = dagGraph.getNode(dagNodeId);
            let nodeStats = dagTab._queryNodeMap.get(destTable);
            nodeStats = xcHelper.deepCopy(nodeStats);
            delete nodeStats.input_parameters;
            const nodeStatsString =  JSON.stringify(nodeStats, null, 2);
            let labelName = dagNode.getDisplayNodeType();
            if (dagNode.getTitle()) {
                labelName += " (" + dagNode.getTitle() + " )";
            }
            labelName += " - " + nodeStats.operator_name;
            let duration = node.node_end_timestamp_microsecs - node.node_start_timestamp_microsecs;
            duration = Math.round(duration / 1000);
            time += duration;
            data.push({
                x: time,
                name: labelName,
                label: xcTimeHelper.getElapsedTimeStr(duration),
                description: nodeStatsString
            });
        });
        let totalTime = xcTimeHelper.getElapsedTimeStr(time);


        this._chart = Highcharts.chart('dataflowStatsModalChart', {
            chart: {
                type: 'timeline'
            },
            xAxis: {
                visible: false
            },
            yAxis: {
                visible: false
            },
            title: {
                text: 'Timeline of Application Execution'
            },
            subtitle: {
                text: 'Total time: ' + totalTime
            },
            colors: [
                '#4185F3',
                '#427CDD',
                '#406AB2',
                '#3E5A8E',
                '#3B4A68',
                '#363C46'
            ],
            series: [{
                data: data
            }]
        });
    }

    private _drawBarChart() {
        const tabId = DagViewManager.Instance.getActiveDag().getTabId();
        const dagTab: DagTabStats = <DagTabStats>DagTabManager.Instance.getTabById(tabId);
        const dagGraph = dagTab.getGraph();

        let stats = dagTab.getDataflowStats(true);
        // const nodes = stats.node_execution_times_sorted;
        const nodes = stats.nodes;
        const data = [];
        let time = 0;
        let categories = [];
        let times = [];
        nodes.forEach((node) => {
            const destTable = node.node_name;
            const dagNodeId = dagGraph._tableNameToDagIdMap[destTable];
            const dagNode = dagGraph.getNode(dagNodeId);
            let nodeStats = dagTab._queryNodeMap.get(destTable);
            nodeStats = xcHelper.deepCopy(nodeStats);
            delete nodeStats.input_parameters;
            const nodeStatsString =  JSON.stringify(nodeStats, null, 2);
            let labelName = dagNode.getDisplayNodeType();
            if (dagNode.getTitle()) {
                labelName += " (" + dagNode.getTitle() + " )";
            }
            labelName += " - " + nodeStats.operator_name;
            let duration = node.node_end_timestamp_microsecs - node.node_start_timestamp_microsecs;
            duration = Math.round(duration / 1000);
            time += duration;
            data.push({
                x: time,
                name: labelName,
                label: xcTimeHelper.getElapsedTimeStr(duration),
                description: nodeStatsString
            });
            categories.push(labelName);
            times.push(duration);
        });
        let totalTime = xcTimeHelper.getElapsedTimeStr(time);

        this._chart = Highcharts.chart('dataflowStatsModalChart', {
            chart: {
                type: 'column'
            },
            title: {
                text: 'Application Execution'
            },
            subtitle: {
                text: 'Total time: ' + totalTime
            },
            xAxis: {
                categories: categories,
                crosshair: true
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Duration (ms)'
                }
            },
            tooltip: {
                headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
                pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                    '<td style="padding:0"><span class="semibold">{point.y:.1f} ms</span></td></tr>',
                footerFormat: '</table>',
                shared: true,
                useHTML: true
            },
            plotOptions: {
                column: {
                    pointPadding: 0.2,
                    borderWidth: 0
                }
            },
            series: [{
                name: 'Operations',
                data: times

            }]
        });
    }

    private _getModal(): JQuery {
        return $("#dataflowStatsModal");
    }

    private _close(): void {
        this._modalHelper.clear();
        $("#dataflowStatsModal .statsDisplay").empty();
    }


    private _resetTooltip($ele): void {
        this._getModal().find(".bar").tooltip("hide");
        if ($ele != null) {
            $ele.tooltip("show");
        }
    }

    private _addEventListeners() {
        const self = this;
        const $modal: JQuery = this._getModal();
        $modal.on("click", ".close", () => {
            this._close();
        });

        $modal.on("mouseover", ".bar", (event) => {
            event.stopPropagation();
            this._resetTooltip($(event.currentTarget));
        });

        $modal.on("mouseover", () => {
            this._resetTooltip(null);
        });


        $modal.find(".leftArea li").click(function() {
            let action = $(this).data("action");
            switch(action) {
                case ("timeline"):
                    self._drawTimeline();
                    break;
                case ("barChart"):
                    self._drawBarChart();
                    break;
                default:
                    break;
            }
        });
    }
}