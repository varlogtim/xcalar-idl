// sets up monitor panel and donuts, not monitor graph
window.MonitorPanel = (function($, MonitorPanel) {
    var isGenSub = false;
    var diameter = 100; // for donuts
    var donutThickness = 6;
    var defDurationForD3Anim = 800;
    var graphIsActive = false;
    var $monitorPanel;

    MonitorPanel.setup = function() {
        $monitorPanel = $("#monitor-system");
        MonitorGraph.setup();
        QueryManager.setup();
        MonitorConfig.setup();

        initializeDonuts();
        populateNodeInformation();

        setupViewToggling();

        $("#monitorMenu-sys").on("click", ".listInfo", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $("#monitorMenu-setup").on("click", ".listInfo", function() {
            $(this).closest(".listWrap").toggleClass("active");
        });

        $("#monitor-genSub").click(function() {
            genSubHelper();
        });

        $("#monitor-delete").click(function() {
            $(this).blur();
            DeleteTableModal.show();
        });

        $('.statsHeadingBar').click(function() {
            if ($(this).hasClass('open')) {
                $(this).removeClass('open')
                       .next().children()
                       .slideUp(200)
                       .removeClass('open');
            } else {
                $(this).addClass('open')
                       .next().children()
                       .slideDown(200)
                       .addClass('open');
            }
        });

        $monitorPanel.find(".ramDonut .donut").click(function() {
            var $donutSection = $(this).closest(".donutSection");
            $donutSection.toggleClass("xdbMode");
            $monitorPanel.find(".graphSection").toggleClass("xdbMode");
            if ($donutSection.hasClass("xdbMode")) {
                $monitorPanel.find(".graphSwitches .row").eq(1).find(".text")
                             .text(MonitorTStr.XDB);
            } else {
                $monitorPanel.find(".graphSwitches .row").eq(1).find(".text")
                             .text(MonitorTStr.RAM);
            }
        });
    };

    MonitorPanel.active = function() {
        MonitorGraph.start();
        QueryManager.check();
        QueryManager.scrollToFocused();
        graphIsActive = true;
    };

    MonitorPanel.inActive = function() {
        MonitorGraph.clear();
        QueryManager.check(true);
        graphIsActive = false;
    };

    MonitorPanel.isGraphActive = function() {
        return (graphIsActive);
    };

    MonitorPanel.updateDonuts = function(allStats, numNodes) {
        $('.donut').each(function(index) {
            var el = this;
            var used;
            var total;

            if (index === 0) {
                used = allStats[index].sumUsed / numNodes;
                total = allStats[index].sumTot / numNodes;
            } else {
                used = allStats[index].sumUsed;
                total = allStats[index].sumTot;
            }
            if (index === 3) {
                updateDonutMidText('#donut3 .userSize .num',
                                allStats[index].sumUsed,
                                defDurationForD3Anim, index);

                updateDonutMidText('#donut3 .totalSize .num',
                                allStats[index].sumTot,
                                defDurationForD3Anim, index);
            } else {
                updateOneDonut(el, index, used, total);
            }
            updateDonutStatsSection(el, index, allStats[index]);
        });
    };

    function setupViewToggling() {
        var $monitorPanel = $("#monitorPanel");

        // main menu
        $('#monitorTab').find('.subTab').click(function() {
            var $button = $(this);
            if ($button.hasClass('active')) {
                return;
            }
            $monitorPanel.find(".monitorSection.active").removeClass("active");
            var title = MonitorTStr.Monitor + '/';
            var $menu = $("#monitorMenu");
            $menu.find(".menuSection").addClass("xc-hidden");
            var $extSearch = $("#extension-search").addClass("xc-hidden");

            switch ($button.attr("id")) {
                case ("systemButton"):
                    $("#monitor-system").addClass("active");
                    $menu.find(".menuSection.monitor").removeClass("xc-hidden");
                    title += MonitorTStr.System;
                    break;
                case ("queriesButton"):
                    $("#monitor-queries").addClass("active");
                    $menu.find(".menuSection.query").removeClass("xc-hidden");
                    title += MonitorTStr.Queries;
                    break;
                case ("setupButton"):
                    $("#monitor-setup").addClass("active");
                    $menu.find(".menuSection.setup").removeClass("xc-hidden");
                    if ($('#monitor-setup').hasClass('firstTouch')) {
                        var firstTouch = true;
                        $('#monitor-setup').removeClass('firstTouch');
                        MonitorConfig.refreshParams(firstTouch);
                    }
                    title += MonitorTStr.Setup;
                    break;
                case ("settingsButton"):
                    $("#monitor-settings").addClass("active");
                    $menu.find(".menuSection.settings").removeClass("xc-hidden");
                    title += MonitorTStr.Settings;
                    break;
                case ("supportToolsButton"):
                    $("#monitorSupportTools").addClass("active");
                    // $menu.find(".menuSection.settings").removeClass("xc-hidden");
                    title += MonitorTStr.SupportTools;
                    break;
                case ("extensionSettingButton"):
                    $("#monitor-extension").addClass("active");
                    $extSearch.removeClass("xc-hidden");
                    $menu.find(".menuSection.extension").removeClass("xc-hidden");
                    ExtensionPanel.active();
                    title += MonitorTStr.Ext;
                    break;
                default:
                    break;
            }
            $monitorPanel.find('.topBar .title:not(.wkbkTitle)').text(title);

            QueryManager.check();
        });
    }

    function initializeDonuts() {
        var numDonuts = 3;
        var radius = diameter / 2;
        var outerDonutRadius = radius + donutThickness;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - donutThickness);
        var outerArc = d3.svg.arc()
                        .innerRadius(outerDonutRadius)
                        .outerRadius(outerDonutRadius - donutThickness);
        var pie = d3.layout.pie()
                .sort(null);

        var svg;

        for (var i = 0; i < numDonuts; i++) {
            if (i === 2) {
                svg = makeSvg("#donut" + i, diameter + (donutThickness * 2), outerDonutRadius);
                drawPath(svg, pie, outerArc);
            } else {
                svg = makeSvg("#donut" + i, diameter, radius);
                drawPath(svg, pie, arc);
            }
        }
        var smallRadius = radius - 2;
        var outerSmallRadius = outerDonutRadius - 2;
        arc = d3.svg.arc()
                    .innerRadius(smallRadius)
                    .outerRadius(smallRadius - (donutThickness - 3));
        outerArc = d3.svg.arc()
                    .innerRadius(outerSmallRadius)
                    .outerRadius(outerSmallRadius - (donutThickness - 3));
        for (var i = 0; i < numDonuts; i++) {

            if (i === 2) {
                svg = makeSvg("#donut" + i, diameter + (donutThickness * 2), outerDonutRadius);
                drawPath(svg, pie, outerArc);
            } else {
                svg = makeSvg("#donut" + i, diameter, radius);
                drawPath(svg, pie, arc);
            }

        }

        function makeSvg (selector, diam, rad) {
            var svg = d3.select(selector).append("svg")
                        .attr("width", diam)
                        .attr("height", diam)
                        .append("g")
                        .attr("transform", "translate(" + rad + "," +
                               rad + ") rotate(180, 0,0)");
            return (svg);
        }

        function drawPath(svg, pie, arc2) {
            var data = [0, 100];
            svg.selectAll("path")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("d", arc2)
                .each(function(d) {
                    this._current = d; // store the initial angles
                });
        }
    }

    function updateOneDonut(el, index, val, total) {
        var duration = defDurationForD3Anim;
        var pie = d3.layout.pie().sort(null);
        var userSize = val;
        if (index === 0) {
            val = Math.min(100, val); // cpu percentage may be over 100%
        } else {
            val = Math.min(val, total);
        }

        var data = [val, total - val];
        var donut = d3.select(el);
        var paths = donut.selectAll("path").data(pie(data));
        var radius = diameter / 2;
        var rad = radius;
        if (index === 2) {
            rad = radius + donutThickness;
        }
        var arc = d3.svg.arc()
                    .innerRadius(rad)
                    .outerRadius(rad - donutThickness);

        paths.transition()
             .duration(duration)
             .attrTween("d", arcTween);


        updateDonutMidText("#donut" + index + " .userSize .num", userSize,
                            duration, index);

        if (index !== 0) {
            updateDonutMidText('#donut' + index + ' .totalSize .num', total,
                                duration, index);
        }

        function arcTween(a) {
            var i = d3.interpolate(this._current, a);
            this._current = i(0);
            return (function(t) {
                return (arc(i(t)));
            });
        }
    }

    // updates the large text in the middle of the donut
    function updateDonutMidText(selector, num, duration, index) {
        var $sizeType = $(selector).next();
        var type = $sizeType.text();

        d3.select(selector)
            .transition()
            .duration(duration)
            .tween("text", function() {
                var startNum = this.textContent;
                var size = xcHelper.sizeTranslator(num, true);
                var i;

                if (index !== 0) {
                    startNum = xcHelper.textToBytesTranslator(startNum + type);
                    i = d3.interpolate(startNum, num);
                } else {
                    i = d3.interpolate(startNum, size[0]);
                }

                return (function(t) {
                    var size = xcHelper.sizeTranslator(i(t), true);
                    num = parseFloat(size[0]).toFixed(1);
                    if (num >= 10 || index === 0) {
                        num = Math.round(num);
                    }
                    if (index !== 0) {
                        $sizeType.html(size[1]);
                    }
                    this.textContent = num;
                });
            });
    }

    function updateDonutStatsSection(el, index, stats) {
        //this is for the list of stats located below the donut
        var numNodes = stats.used.length;
        var $statsSection = $(el).next();
        var listHTML = "";

        if (index === 0) {
            var avgUsed = Math.round((stats.sumUsed / numNodes) * 100) / 100;
            $statsSection.find('.statsHeadingBar .avgNum').text(avgUsed);

            for (var i = 0; i < numNodes; i++) {
                listHTML += '<li>' +
                                '<span class="name">' +
                                    'Node ' + (i + 1) +
                                '</span>' +
                                '<span class="statsNum">' +
                                    stats.used[i] + '%' +
                                '</span>' +
                            '</li>';
            }
        } else {
            var sumTotal = xcHelper.sizeTranslator(stats.sumTot, true);
            var sumUsed = xcHelper.sizeTranslator(stats.sumUsed, true);

            if (index === 3) {
                $statsSection.find('.statsHeadingBar .totNum')
                             .text(sumTotal[0] + sumTotal[1] + "ps");
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + sumUsed[1] + "ps");
            } else {
                $statsSection.find('.statsHeadingBar .totNum')
                             .text(sumTotal[0] + sumTotal[1]);
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + sumUsed[1]);
            }

            for (var i = 0; i < numNodes; i++) {
                var total = xcHelper.sizeTranslator(stats.tot[i], true);
                var used = xcHelper.sizeTranslator(stats.used[i], true);
                var usedUnits;
                var totalUnits;

                if (index === 3) {
                    usedUnits = used[1] + "ps";
                    totalUnits = total[1] + "ps";
                } else {
                    usedUnits = used[1];
                    totalUnits = total[1];
                }

                listHTML += '<li>' +
                                '<span class="name">' +
                                    'Node ' + (i + 1) +
                                '</span>' +
                                '<span class="totalSize">' +
                                    total[0] + totalUnits +
                                '</span>' +
                                '<span class="userSize">' +
                                    used[0] + usedUnits +
                                '/</span>' +
                            '</li>';
            }
        }
        $statsSection.find('ul').html(listHTML);
    }

    function populateNodeInformation() {
        $("#phyNode").text(hostname);
        // Insert information here regarding virtual nodes next time
    }

    function genSubHelper() {
        if (isGenSub) {
            // it's generating
            return;
        }
        SupTicketModal.show();
        isGenSub = false;
    }

    return (MonitorPanel);
}(jQuery, {}));
