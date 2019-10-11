class DagStatsModal {
    private static _instance: DagStatsModal;

    private _modalHelper: ModalHelper;
    private _activeTable: TableMeta;
    private _percentageLabel: boolean = false;
    private _instanceOptions;
    private _chart;

    public static get Instance(): DagStatsModal {
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
    public show(nodeId: DagNodeId, tabId, options?) {
        let dagTab: DagTabStats = <DagTabStats>DagTabManager.Instance.getTabById(tabId);
        let stats = dagTab.getStatsNodesFromDagNode(nodeId);
        let dagGraph = dagTab.getGraph();
        let node = dagGraph.getNode(nodeId);
        let title = xcStringHelper.capitalize(node.getDisplayNodeType()) + " Node Stats";
        $("#dagStatsModal").find(".modalHeader .text").text(title);

        this._modalHelper.setup();

        stats = xcHelper.deepCopy(stats);
        let html = "";
        stats.forEach((node) => {
            let libstats;
            if (node.libstats) {
                libstats = this._processLibStats(node.libstats);
            }
            // node.node_start_timestamp = moment(node.node_start_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY");
            // node.node_end_timestamp = moment(node.node_end_timestamp_microsecs / 1000).format("HH:mm:ss MM/DD/YYYY");
            node.node_time_elapsed = xcTimeHelper.getElapsedTimeStr(node.node_time_elapsed_millisecs);
            delete node.node_time_elapsed_millisecs;
            delete node.node_start_timestamp_microsecs;
            delete node.node_end_timestamp_microsecs;
            delete node.input_parameters;
            delete node.libstats;
            delete node.input_tables;
            delete node.output_tables;
            delete node.operator_status;
            html += '<div class="dagNodeGroup">';
            html += '<div class="dagNodeGroupHeading">'  + node.operator_name + '</div>';
            // html += '<div class="prettyJson">' + xcUIHelper.prettifyJson(node, undefined, undefined, undefined, undefined)  + '</div>';
            html += '<div class="regStats">' + this._getNodeTable(node)  + '</div>';
            if (libstats) {
                html += '<div class="libStats">';
                html += '<div class="libStatsHeading">Xcalar Internal Stats</div>';
                html += '<table>';
                let firstRow = true;
                for (let group in libstats) {

                    // html += '<div class="col groupCol">' + group + '</div>';
                    // html += '<div class="col indCol">';
                    let count = 0;
                    for (let indStat in libstats[group]) {
                        if (firstRow) {
                            html += '<thead>';
                            html += '<tr>';
                            html += '<th>StatGroup</th>';
                            html += '<th>Stat</th>';
                            libstats[group][indStat].forEach((stat, i) => {
                                html += '<th class="nodeVal">Node ' + i  + '</th>';
                            });
                            html += '</tr>';
                            html += '</thead>';
                        }
                        firstRow = false;
                        if (count === 0) {
                            html += '<tr class="row indRow first">';
                            html += '<td class="groupHeading">' + group + '</td>';
                        } else {
                            html += '<tr class="row indRow">';
                            html += '<td></td>';
                        }
                        html += '<td class="indStatName">' + indStat + '</td>';
                        libstats[group][indStat].forEach(val => {
                            html += '<td class="nodeVal">' + val + '</td>';
                        });
                        html += '</tr>'; // end indvRow
                        count++;
                    }
                    // html +=  '</div>'; // end indvCol

                    // html += '</tr>'; // end groupRow

                }
                html += '</table>';
                html += '</div>'; // end lib stats
            }


            html += '</div>'; // end dagnodegroup
        });



        setTimeout(() => {
            $("#dagStatsModal .statsDisplay").html(html);
        });

        // this._showTableInfo();
        // this._drawDistributionGraph();
    }

    private _getNodeTable(node) {
        let html = '<table class="regStatsTable">';
        for (let prop in node) {
            let val = node[prop];
            let tdClass = "";
            if (typeof val === "number") {
                tdClass += " number ";
            }
            html += '<tr><td>' + prop + '</td><td class="' + tdClass + '">' + node[prop] + ' </td></tr>';
        }
        html += "</table>";
        return html;
    }

    private _getModal(): JQuery {
        return $("#dagStatsModal");
    }

    private _close(): void {
        this._modalHelper.clear();
        this._activeTable = null;
        $("#dagStatsModal .statsDisplay").empty();
    }

    private _processLibStats(libstats) {
        // let nodes = [];
        let statsMap = {};
        libstats.forEach((node, i) => {
            for (let statsGroup in node) {
                let group;
                if (statsMap[statsGroup]) {
                    group = statsMap[statsGroup];
                } else {
                    group = {};
                    statsMap[statsGroup] = group;
                }
                for (let indStat in node[statsGroup]) {
                    if (!group[indStat]) {
                        group[indStat] = [];
                    }
                }
            }
        });
        for (let statsGroup in statsMap) {
            for (let indStat in statsMap[statsGroup]) {
                libstats.forEach((node, i) => {
                    if (node[statsGroup] && node[statsGroup][indStat]) {
                        statsMap[statsGroup][indStat].push(node[statsGroup][indStat]);
                    } else {
                        statsMap[statsGroup][indStat].push(0);
                    }
                });
                // statsMap[statsGroup][indStat] = statsMap[statsGroup][indStat].join(",")
            }

        }
        return statsMap;
    }


    private _resetTooltip($ele): void {
        this._getModal().find(".bar").tooltip("hide");
        if ($ele != null) {
            $ele.tooltip("show");
        }
    }

    private _addEventListeners() {
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

        $modal.on("click", ".chart", () => {
            this._percentageLabel = !this._percentageLabel;
            xcTooltip.hideAll();
        });
    }
}