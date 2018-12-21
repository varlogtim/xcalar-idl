// sets up monitor panel and system menubar
window.MonitorPanel = (function($, MonitorPanel) {
    var graphIsActive = false;
    var $monitorPanel;

    MonitorPanel.setup = function() {
        $monitorPanel = $("#monitor-system");
        MonitorGraph.setup();
        MonitorDonuts.setup();
        QueryManager.setup();
        MonitorConfig.setup();

        populateNodeInformation();
        setupViewToggling();

        var $menus = $("#monitorMenu-sys").add($("#monitorMenu-setup"))
                                         .add($("#monitorMenu-settings"));
        $menus.on("click", ".listInfo .expand", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $("#monitor-genSub").click(function() {
            genSubHelper();
        });

        $("#monitor-delete").click(function() {
            $(this).blur();
            DeleteTableModal.show();
        });

        $("#monitorMenu-sys").find('.graphSwitch').click(function() {
            var $switch = $(this);
            var index = $(this).index();
            $switch.find(".switch").toggleClass("on");
            if (index === 1) {
                $monitorPanel.find(".graphSection").toggleClass("hideSwap");
            } else if (index === 2) {
                $monitorPanel.find(".graphSection").toggleClass("hideCPU");
            } else {
                $monitorPanel.find(".graphSection").toggleClass("hideRam");
            }

            // move graphs in front of others
            if ($switch.find(".switch").hasClass("on")) {
                var $graph = $monitorPanel.find('.line' + index +
                                                 ', .area' + index);
                $monitorPanel.find('.mainSvg').children()
                                              .append($graph, $graph);
            }
        });
    };

    MonitorPanel.active = function() {
        MonitorGraph.start();
        QueryManager.scrollToFocused();
        graphIsActive = true;
    };

    MonitorPanel.inActive = function() {
        MonitorGraph.clear();
        graphIsActive = false;
    };

    MonitorPanel.isGraphActive = function() {
        return (graphIsActive);
    };

    function setupViewToggling() {
        var $monitorPanel = $("#monitorPanel");

        // main menu
        $('#monitorTab').find('.subTab').click(function(event) {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }
            $monitorPanel.find(".monitorSection.active").removeClass("active");
            var title = MonitorTStr.System + ': ';
            var $menu = $("#monitorMenu");
            $menu.find(".menuSection").addClass("xc-hidden");
            var $extSearch = $("#extension-search").addClass("xc-hidden");
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
                    SqlQueryHistoryPanel.Card.getInstance().show();
                    $("#monitor-query-history").addClass("active");
                    $menu.find(".menuSection.queryHist").removeClass("xc-hidden");
                    title += MonitorTStr.SQLPanelTitle;
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
                case ("extensionSettingButton"):
                    $("#monitor-extension").addClass("active");
                    $extSearch.removeClass("xc-hidden");
                    $menu.find(".menuSection.extension").removeClass("xc-hidden");
                    ExtensionPanel.active();
                    title += MonitorTStr.Ext;
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

    function populateNodeInformation() {
        $("#phyNode").text(hostname);
        // Insert information here regarding virtual nodes next time
    }

    return (MonitorPanel);
}(jQuery, {}));
