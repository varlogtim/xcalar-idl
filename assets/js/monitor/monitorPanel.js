// sets up monitor panel and donuts, not monitor graph
window.MonitorPanel = (function($, MonitorPanel) {
    var failCount = 0;

    MonitorPanel.setup = function() {
        MonitorGraph.setup();
        QueryManager.setup();
        MonitorConfig.setup();

        var $monitorPanel = $("#monitorPanel");

        initializeDonuts();
        populateNodeInformation();
        $monitorPanel = $('#monitorPanel');

        $("#monitorTopBar").on("click", ".buttonArea", function() {
            var $btn = $(this);

            if ($btn.hasClass("active")) {
                return;
            }

            $btn.siblings(".active").removeClass("active");
            $monitorPanel.find(".monitorSection.active").removeClass("active");

            $btn.addClass("active");

            switch ($btn.attr("id")) {
                case ("systemButton"):
                    $("#monitor-system").addClass("active");
                    break;
                case ("queriesButton"):
                    $("#monitor-queries").addClass("active");
                    break;
                case ("setupButton"):
                    $("#monitor-setup").addClass("active");
                    break;
                case ("settingsButton"):
                    $("#monitor-settings").addClass("active");
                    break;
                default:
                    break;
            }

            QueryManager.check();
        });


        $('#asupBtn').click(function() {
            var $target = $(this);

            if ($target.hasClass('off')) {
                $target.removeClass('off');
            } else {
                $target.addClass('off');
            }
        });

        $("#subBtn").click(function() {
            var $btn = $(this).blur();
            xcHelper.toggleBtnInProgress($btn);

            xcHelper.genSub()
            .always(function() {
                xcHelper.toggleBtnInProgress($btn);
            });
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

        var cpu = new StatsObj();
        var ram = new StatsObj();
        var flash = new StatsObj();
        var disk = new StatsObj();
        for (var i = 0; i < numNodes; i++) {
            var cpuPct = apiTopResult.topOutputPerNode[i].cpuUsageInPercent;
            cpuPct = Math.round(cpuPct * 100) / 100;
            cpu.used.push(cpuPct);
            cpu.sumUsed += cpuPct;
            cpu.sumTot += 100;

            var ramUsed = apiTopResult.topOutputPerNode[i].memUsedInBytes;
            var ramTot =
                apiTopResult.topOutputPerNode[i].totalAvailableMemInBytes;
            ramUsed = ramUsed;
            ramTot = ramTot;
            ram.used.push(ramUsed);
            ram.tot.push(ramTot);
            ram.sumUsed += ramUsed;
            ram.sumTot += ramTot;

            var flashUsed = nodes[i].usedFlash;
            var flashTot = nodes[i].totFlash;
            flash.used.push(flashUsed);
            flash.tot.push(flashTot);
            flash.sumUsed += flashUsed;
            flash.sumTot += flashTot;

            var diskUsed = nodes[i].usedDisk * 5;
            var diskTot = nodes[i].totDisk * 5;
            disk.used.push(diskUsed);
            disk.tot.push(diskTot);
            disk.sumUsed += diskUsed;
            disk.sumTot += diskTot;
        }
        var allStats = [cpu, ram, disk, flash];

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

            updateOneDonut(el, used, total);
            updateDonutStatsSection(el, index, allStats[index]);
        });
    };

    function initializeDonuts() {
        var numDonuts = 3;
        var blueOuter = '#20a7eb';
        var greenOuter = '#90c591';
        var brownOuter = '#bbae84';
        var grayOuter = '#cecece';
        var colors = [blueOuter, greenOuter, brownOuter];
        var diameter = 180;
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - 40);
        var pie = d3.layout.pie()
                .sort(null);

        var color;
        var svg;
        for (var i = 0; i < numDonuts; i++) {
            color = d3.scale.ordinal().range([colors[i], grayOuter]);
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
        var duration = 800;
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
        var diameter = 180;
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - 40);

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

                if (index === 1) {
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
                    if (index === 1) {
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
            if (index !== 2) {
                $statsSection.find('.statsHeadingBar .totNum')
                         .text(sumTotal[0] + " " + sumTotal[1]);
                $statsSection.find('.statsHeadingBar .avgNum')
                         .text(sumUsed[0] + " " + sumUsed[1]);
            }
            

            for (var i = 0; i < numNodes; i++) {
                var total = xcHelper.sizeTranslator(stats.tot[i], true);
                var used = xcHelper.sizeTranslator(stats.used[i], true);
                var usedUnits;
                var totalUnits;

                if (index === 2) {
                    usedUnits = totalUnits = "Mbps";
                } else {
                    usedUnits = used[1];
                    totalUnits = total[1];
                }

                listHTML += '<li>' +
                                '<span class="name">' +
                                    'Node ' + (i + 1) +
                                '</span>' +
                                '<span class="userSize">' +
                                    used[0] + " " + usedUnits +
                                '</span>' +
                                '<span class="totalSize">' +
                                    total[0] + " " + totalUnits +
                                '</span>' +
                            '</li>';
            }
        }
        $statsSection.find('ul').html(listHTML);
    }

    function populateNodeInformation() {
        $("#phyNode").text(hostname);
        // Insert information here regarding virtual nodes next time
    }


    return (MonitorPanel);
}(jQuery, {}));
