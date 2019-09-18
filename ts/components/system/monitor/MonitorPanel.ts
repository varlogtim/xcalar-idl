// sets up monitor panel and system menubar
namespace MonitorPanel {
    let monitorDonuts: MonitorDonuts;
    let monitorGraph: MonitorGraph;

    /**
     * MonitorPanel.setup
     */
    export function setup(): void {
        monitorDonuts = new MonitorDonuts("monitor-donuts");
        _setupMonitorGraph();

        QueryManager.setup();

        _renderNodeInformation();
        _setupViewToggling();
        _addEventListeners();   
    }

    /**
     * MonitorPanel.getGraph
     */
    export function getGraph(): MonitorGraph {
        return monitorGraph;
    }

    /**
     * MonitorPanel.getDounts
     */
    export function getDounts(): MonitorDonuts {
        return monitorDonuts;
    }

    // XXX move to system panel
    /**
     * MonitorPanel.active
     */
    export function active(): void {
        monitorGraph.start();
        QueryManager.scrollToFocused();
    }

    // XXX move to system panel
    /**
     * MonitorPanel.inActive
     */
    export function inActive(): void {
        monitorGraph.clear();
    }

    /**
     * MonitorPanel.stop
     */
    export function stop(): void {
        monitorGraph.stop();
    }

    /**
     * MonitorPanel.updateSetting
     * @param graphInterval
     */
    export function updateSetting(graphInterval: number): void {
        monitorGraph.updateInterval(graphInterval);
    }

    /**
     * MonitorPanel.tableUsageChange
     */
    export function tableUsageChange(): void {
        monitorGraph.tableUsageChange();
    }

    function _getPanel(): JQuery {
        return $("#monitor-system");
    }

    function _setupMonitorGraph(): void {
        monitorGraph = new MonitorGraph("monitor-graphCard");
        monitorGraph
        .on("update", function(allStats, apiTopResult) {
            monitorDonuts.update(allStats);
            MemoryAlert.Instance.detectUsage(apiTopResult);
        });
    }

    function _renderNodeInformation(): void {
        if (typeof hostname !== "undefined") {
            $("#phyNode").text(hostname);
        }
        // Insert information here regarding virtual nodes next time
    }

    function _setupViewToggling() {
        let $monitorPanel = $("#monitorPanel");

        // main menu
        $('#monitorTab').find('.subTab').click(function() {
            let $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }
            $monitorPanel.find(".monitorSection.active").removeClass("active");
            let title = MonitorTStr.System + ': ';
            let $menu = $("#monitorMenu");
            $menu.find(".menuSection").addClass("xc-hidden");
            $monitorPanel.find(".mainContent").scrollTop(0);
            $("#container").removeClass("activePanel-FileManagerPanel");
            $monitorPanel.removeClass("fileManagerMainPanel");

            switch ($button.attr("id")) {
                case ("systemButton"):
                    $("#monitor-system").addClass("active");
                    $menu.find(".menuSection.monitor").removeClass("xc-hidden");
                    title += MonitorTStr.Monitor;
                    break;
                case ("queriesButton"):
                    $("#monitor-queries").addClass("active");
                    $menu.find(".menuSection.query").removeClass("xc-hidden");
                    title += MonitorTStr.Queries;
                    QueryManager.scrollToFocused();
                    break;
                case ("setupButton"):
                    $("#monitor-setup").addClass("active");
                    $menu.find(".menuSection.setup").removeClass("xc-hidden");
                    title += MonitorTStr.Setup;
                    break;
                case ("queryHistButton"):
                    // SqlQueryHistoryPanel.Card.getInstance().show();
                    // $("#monitor-query-history").addClass("active");
                    // $menu.find(".menuSection.queryHist").removeClass("xc-hidden");
                    // title += MonitorTStr.SQLPanelTitle;
                    break;
                case ("logButton"):
                    $("#monitor-xd-log").addClass("active");
                    $menu.find(".menuSection.xdLog").removeClass("xc-hidden");
                    title += MonitorTStr.Logs;
                    let $section = $("#logSection");
                    if ($section.hasClass("firstTouch")) {
                        $section.removeClass("firstTouch");
                        Log.scrollToBottom();
                    }
                    break;
                case ("settingsButton"):
                    $("#monitor-settings").addClass("active");
                    $menu.find(".menuSection.settings").removeClass("xc-hidden");
                    title += MonitorTStr.Settings;
                    break;
                case ("fileManagerButton"):
                    $("#monitor-file-manager").addClass("active");
                    $menu.find(".menuSection.fileManager").removeClass("xc-hidden");
                    title += MonitorTStr.FileManagerTitle;
                    // TODO: hack until UI is finalized.
                    if ($("#udfSection").hasClass("switching")) {
                        $("#container").addClass("activePanel-FileManagerPanel");
                        $monitorPanel.addClass("fileManagerMainPanel");
                    }
                    break;
                default:
                    break;
            }
            $monitorPanel.find('.topBar .title:not(.wkbkTitle)').text(title);
        });
    }

    function _addEventListeners(): void {
        xcUIHelper.expandListEvent($("#monitorMenu-sys"));

        $("#monitorMenu-sys").find('.graphSwitch').click((e) => {
            let $switch = $(e.currentTarget);
            let index = $switch.index();
            $switch.find(".switch").toggleClass("on");
            let $monitorPanel = _getPanel();
            if (index === 1) {
                $monitorPanel.find(".graphSection").toggleClass("hideSwap");
            } else if (index === 2) {
                $monitorPanel.find(".graphSection").toggleClass("hideCPU");
            } else {
                $monitorPanel.find(".graphSection").toggleClass("hideRam");
            }

            // move graphs in front of others
            if ($switch.find(".switch").hasClass("on")) {
                let $graph = $monitorPanel.find('.line' + index + ', .area' + index);
                $monitorPanel.find('.mainSvg').children()
                            .append($graph, $graph);
            }
        });
    }
}
