// sets up monitor panel and donuts, not monitor graph
window.MonitorPanel = (function($, MonitorPanel) {
    var isGenSub = false;
    var diameter = 100; // for donuts
    var donutThickness = 6;
    var defDurationForD3Anim = 800;

    MonitorPanel.setup = function() {
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

        $("#monitor-asup").click(function() {
            var $target = $(this);

            if ($target.hasClass("on")) {
                $target.removeClass("on");
            } else {
                $target.addClass("on");
            }
        });

        $("#monitor-genSub").click(function() {
            genSubHelper();
        });

        $("#monitor-delete").click(function() {
            $(this).blur();
            DeleteTableModal.show();
        });

        $("#monitor-genSubCard").on("click", ".close", function() {
            $("#monitor-genSubCard").addClass("xc-hidden");
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
    };

    MonitorPanel.active = function() {
        MonitorGraph.start();
        QueryManager.check();
    };

    MonitorPanel.inActive = function() {
        MonitorGraph.clear();
        QueryManager.check(true);
    };

    MonitorPanel.processNodeStats = function(nodes, apiTopResult, numNodes) {
        var StatsObj = function() {
            this.used = [];
            this.tot = [];
            this.sumUsed = 0;
            this.sumTot = 0;
        };

        var cpu     = new StatsObj();
        var ram     = new StatsObj();
        var network = new StatsObj(); // For network, send is used, recv is tot
        var disk    = new StatsObj();
        for (var i = 0; i < numNodes; i++) {
            var cpuPct = apiTopResult.topOutputPerNode[i].cpuUsageInPercent;
            cpuPct = Math.round(cpuPct * 100) / 100;
            cpu.used.push(cpuPct);
            cpu.sumUsed += cpuPct;
            cpu.sumTot += 100;

            var ramUsed = apiTopResult.topOutputPerNode[i].memUsedInBytes;
            var ramTot =
                apiTopResult.topOutputPerNode[i].memUsedInBytes*100/
                apiTopResult.topOutputPerNode[i].memUsageInPercent;
            ramUsed = ramUsed;
            ramTot = ramTot;
            ram.used.push(ramUsed);
            ram.tot.push(ramTot);
            ram.sumUsed += ramUsed;
            ram.sumTot += ramTot;

            var networkUsed = apiTopResult.topOutputPerNode[i]
                                          .networkSendInBytesPerSec;
            var networkTot = apiTopResult.topOutputPerNode[i]
                                         .networkRecvInBytesPerSec;
            network.used.push(networkUsed);
            network.tot.push(networkTot);
            network.sumUsed += networkUsed;
            network.sumTot += networkTot;

            var diskUsed = nodes[i].usedDisk * 5;
            var diskTot = nodes[i].totDisk * 5;
            disk.used.push(diskUsed);
            disk.tot.push(diskTot);
            disk.sumUsed += diskUsed;
            disk.sumTot += diskTot;
        }
        var allStats = [cpu, ram, network, disk];

        return (allStats);
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
            if (index !== 2) {
                updateOneDonut(el, used, total);
            } else {
                updateDonutNums('#donut' + index + ' .userSize .num', 
                                allStats[index].sumUsed,
                                defDurationForD3Anim, index);

                updateDonutNums('#donut' + index + ' .totalSize .num', 
                                allStats[index].sumTot,
                                defDurationForD3Anim, index);
    
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
                    title += MonitorTStr.Setup;
                    break;
                case ("settingsButton"):
                    $("#monitor-settings").addClass("active");
                     $menu.find(".menuSection.settings").removeClass("xc-hidden");
                    title += MonitorTStr.Settings;
                    break;
                default:
                    break;
            }
            $monitorPanel.find('.topBar .title').text(title);

            QueryManager.check();
        });
    }

    function initializeDonuts() {
        var numDonuts = 2;
        var blue1= '#B4DCD5';
        var blue2 = '#5DB9C4';
        var blue3 = '#5A9FC8';
        var grayOuter = '#eeeeee';
        var transparent = 'rgba(0,0,0,0)';
        var colors = [blue1, blue2, blue3];
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - donutThickness);
        var pie = d3.layout.pie()
                .sort(null);

        var color;
        var svg;
        for (var i = 0; i < numDonuts; i++) {
            color = d3.scale.ordinal().range([colors[i], transparent]);
            svg = makeSvg('#donut' + i + ' .donut');
            drawPath(svg, color, pie, arc);
        }
        var smallRadius = radius - 2;
        arc = d3.svg.arc()
                    .innerRadius(smallRadius)
                    .outerRadius(smallRadius - (donutThickness - 3));
        for (var i = 0; i < numDonuts; i++) {
            color = d3.scale.ordinal().range([grayOuter, grayOuter]);
            svg = makeSvg('#donut' + i + ' .donut');
            drawPath(svg, color, pie, arc);
        }

        function makeSvg (selector) {
            var svg = d3.select(selector).append("svg")
                        .attr("width", diameter)
                        .attr("height", diameter)
                        .append("g")
                        .attr("transform", "translate(" + radius + "," +
                               radius + ") rotate(180, 0,0)");
            return (svg);
        }

        function drawPath(svg, color, pie, arc) {
            var data = [0, 100];
            svg.selectAll("path")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("fill", function(d, i) {
                    return (color(i));
                })
                .attr("d", arc)
                .each(function(d) {
                    this._current = d; // store the initial angles
                });
        }
    }

    function updateOneDonut(el, val, total) {
        var duration = defDurationForD3Anim;
        var index = parseInt($(el).closest('.donutSection')
                                  .attr('id').substring(5));
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
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - donutThickness);

        paths.transition()
             .duration(duration)
             .attrTween("d", arcTween);

        updateDonutNums('#donut' + index + ' .userSize .num', userSize,
                        duration, index);
        if (index !== 0) {
            updateDonutNums('#donut' + index + ' .totalSize .num', total,
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

    function updateDonutNums(selector, num, duration, index) {
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

            if (index === 2) {
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

                if (index === 2) {
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
        var $card = $("#monitor-genSubCard");
        $card.removeClass("done").removeClass("fail").removeClass("xc-hidden");

        isGenSub = true;
        XcalarSupportGenerate()
        .then(function(filePath, bid) {
            var msg = xcHelper.replaceMsg(CommonTxtTstr.SupportBundleMsg, {
                "id"  : bid,
                "path": filePath
            });
            $card.addClass("done")
                .find(".infoSection").text(msg);
        })
        .fail(function(error) {
            $card.addClass("fail")
                .find("errorSection").text(error);
        })
        .always(function () {
            isGenSub = false;
        });
    }

    return (MonitorPanel);
}(jQuery, {}));
