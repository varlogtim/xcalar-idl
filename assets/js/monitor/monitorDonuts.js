window.MonitorDonuts = (function($, MonitorDonuts) {
    var diameter = 110; // for donuts
    var donutThickness = 20;
    var defDurationForD3Anim = 800;
    var $monitorPanel;
    var memIndex = 0; // the index of the ram or memUsed donut
    // var swapIndex = 1;
    var cpuIndex = 2;
    var networkIndex = 3;
    var numDonuts = 3;
    var ramData = [];
    var ramTotal = 0;
    var numMemItems = 5;
    // var sortOrder = "name"; // by "name" or "size"

    MonitorDonuts.setup = function() {
        $monitorPanel = $("#monitor-system");

        initializeDonuts();

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

        $monitorPanel.find(".donut").click(function() {
            $(this).closest(".donutSection").toggleClass("pctMode");
        });

        $monitorPanel.find(".statsSection .listWrap").click(function() {
            $(this).closest(".donutSection").toggleClass("pctMode");
        });

        $monitorPanel.find(".ramDonut").on("mouseenter", ".legend li", function() {
            var $li = $(this);
            var index = $li.index();
            index = numMemItems - 1 - index;
            var val = ramData[index];
            var rawVal = val;
            var sizeOption = {base2: true};
            val = xcHelper.sizeTranslator(val, true, null,
                                                    sizeOption);
            $monitorPanel.find(".donutLegendInfo").removeClass("xc-hidden");
            $monitorPanel.find(".donutLegendInfo .unitSize .num").text(val[0]);
            $monitorPanel.find(".donutLegendInfo .unitSize .unit").text(val[1]);
            var pct = Math.round(rawVal * 100 / ramTotal);
            $monitorPanel.find(".donutLegendInfo .pctSize .num").text(pct);

            if (index === numMemItems - 1) {
                $monitorPanel.find(".ramDonut").find("svg").eq(1).find("path")
                                                .eq(1).attr("class", "hover");
            } else {
                $monitorPanel.find(".ramDonut").find("svg").eq(0).find("path")
                                             .eq(index).attr("class", "hover");
            }
            // visibility:hidden
            $monitorPanel.find(".ramDonut").find(".donutInfo").addClass("hidden");
        });

        $monitorPanel.find(".ramDonut").on("mouseleave", ".legend li", function() {
            $monitorPanel.find(".donutLegendInfo").addClass("xc-hidden");
            $monitorPanel.find(".ramDonut").find("path").attr("class", "");
            $monitorPanel.find(".ramDonut").find(".donutInfo").removeClass("hidden");
        });

        $monitorPanel.find(".ramDonut").on("mouseenter", ".thick path", function() {
            var $path = $(this);
            var index = $path.index();
            index = numMemItems - 1 - index;
            $monitorPanel.find(".ramDonut").find(".legend li").eq(index)
            .addClass("hover");
        });
        $monitorPanel.find(".ramDonut").on("mouseleave", ".thick path", function() {
            $monitorPanel.find(".ramDonut").find(".legend li")
                                            .removeClass("hover");
        });
    };

    MonitorDonuts.update = function(allStats) {
        $('.donut').each(function(index) {
            if (index === networkIndex) {
                updateDonutMidText('#donut3 .userSize .num',
                                allStats[index].used,
                                defDurationForD3Anim, index);

                updateDonutMidText('#donut3 .totalSize .num',
                                allStats[index].total,
                                defDurationForD3Anim, index);
            } else {
                updateOneDonut(this, index, allStats[index]);
            }

            updateDonutStatsSection(this, index, allStats[index]);
        });
    };

    function initializeDonuts() {
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - donutThickness);

        var pie = d3.layout.pie()
                .sort(null);

        var svg;

        for (var i = 0; i < numDonuts; i++) {
            svg = makeSvg("#donut" + i, diameter, radius, "thick");
            drawPath(svg, pie, arc, i);
        }
        // gray background donut
        var smallRadius = radius - 2;

        arc = d3.svg.arc()
                    .innerRadius(smallRadius)
                    .outerRadius(smallRadius - 6);

        for (var i = 0; i < numDonuts; i++) {
            svg = makeSvg("#donut" + i, diameter, radius, "thin");
            drawPath(svg, pie, arc);
        }

        function makeSvg (selector, diam, rad, className) {
            var svg = d3.select(selector).append("svg")
                        .attr("width", diam)
                        .attr("height", diam)
                        .attr("class", className)
                        .append("g")
                        .attr("transform", "translate(" + rad + "," +
                               rad + ") rotate(180, 0,0)");
            return (svg);
        }

        function drawPath(svg, pie, arc2, index) {
            if (index === memIndex) {
                data = [0, 0, 0, 0, 100];
                ramData = data;
            } else {
                data = [0, 100];
            }
            svg.selectAll("path")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("d", arc2)
                .each(function(d) {
                    this._current = d; // store the initial angles
                });
            if (index === memIndex) {
                $("#donut" + memIndex).find("path").each(function(i) {
                    xcTooltip.add($(this), {
                        title: "donut " + i
                    });
                });
            }
        }
    }

    function updateOneDonut(el, index, stats) {
        var duration = defDurationForD3Anim;
        var pie = d3.layout.pie().sort(null);
        var data;
        if (index === memIndex) {
            data = [stats.datasetUsage, stats.userTableUsage,
                    stats.otherTableUsage, stats.xdbFree, stats.free];
            ramData = data;
            ramTotal = stats.total;
        } else {
            data = [stats.used, stats.total - stats.used];
        }
        var donut = d3.select(el);
        var paths = donut.selectAll("path").data(pie(data));
        var radius = diameter / 2;
        var arc = d3.svg.arc()
                    .innerRadius(radius)
                    .outerRadius(radius - donutThickness);

        paths.transition()
             .duration(duration)
             .attrTween("d", arcTween);


        if (index === memIndex) {
            var tooltips = [MonitorTStr.Datasets, MonitorTStr.YourTables,
                            MonitorTStr.OtherUsers, MonitorTStr.FreeXcalarMem,
                            MonitorTStr.FreeRAM];
            $("#donut" + memIndex).find("svg").first().find("path").each(function(i) {
                xcTooltip.add($(this), {
                    title: tooltips[i] + "<br/>" +
                    xcHelper.sizeTranslator(data[i], null, null, {space: true})
                });
            });
        }

        var used = stats.used;

        updateDonutMidText("#donut" + index + " .userSize .num", used,
                            duration, index);

        if (index !== cpuIndex) {
            updateDonutMidText('#donut' + index + ' .totalSize .num', stats.total,
                                duration, index);
            updateDonutMidText("#donut" + index + " .pctSize .num",
                                Math.round(used * 100 / stats.total),
                                            duration, index, true);
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
    function updateDonutMidText(selector, num, duration, index, pct) {
        var $sizeType = $(selector).next();
        var type = $sizeType.text();
        var sizeOption = {base2: true};
        d3.select(selector)
            .transition()
            .duration(duration)
            .tween("text", function() {
                var startNum = this.textContent;
                var size = xcHelper.sizeTranslator(num, true, null, sizeOption);
                var i;

                if (index !== cpuIndex && !pct) {
                    startNum = xcHelper.textToBytesTranslator(startNum + type,
                                                              sizeOption);
                    i = d3.interpolate(startNum, num);
                } else {
                    i = d3.interpolate(startNum, size[0]);
                }

                return (function(t) {
                    var size = xcHelper.sizeTranslator(i(t), true, null,
                                                        sizeOption);
                    num = parseFloat(size[0]).toFixed(1);
                    if (num >= 10 || index === cpuIndex || pct) {
                        num = Math.round(num);
                    }
                    if (index !== cpuIndex && !pct) {
                        $sizeType.html(size[1]);
                    }
                    this.textContent = num;
                });
            });
    }

    function updateDonutStatsSection(el, index, stats) {
        // this is for the list of stats located below the donut
        var numNodes = stats.nodes.length;
        var $statsSection = $(el).next();
        var listHTML = "";

        if (index === cpuIndex) {
            var avgUsed = Math.round(stats.used * 100) / 100;
            $statsSection.find('.statsHeadingBar .avgNum').text(avgUsed);

            for (var i = 0; i < numNodes; i++) {
                var bars = getPctBarHtml(stats.nodes[i].used);
                listHTML += '<li>' + bars +
                                '<span class="name">' +
                                    'Node ' + i +
                                '</span>' +
                                '<span class="statsNum">' +
                                    stats.nodes[i].used + '%' +
                                '</span>' +
                            '</li>';
            }
        } else {
            var sizeOption = {base2: true};
            var usedRaw = stats.used;

            var sumTotal = xcHelper.sizeTranslator(stats.total, true, null,
                                                    sizeOption);
            var sumUsed = xcHelper.sizeTranslator(usedRaw, true, null,
                                                    sizeOption);
            var separator = "";

            if (index === networkIndex) {
                $statsSection.find('.statsHeadingBar .totNum')
                             .text(sumTotal[0] + " " + sumTotal[1] + "/s");
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + " " + sumUsed[1] + "/s");
                separator = "&nbsp;";
            } else {
                $statsSection.find('.statsHeadingBar .totNum')
                         .text(sumTotal[0] + " " + sumTotal[1]);
                $statsSection.find('.statsHeadingBar .avgNum')
                             .text(sumUsed[0] + " " + sumUsed[1]);
                separator = "/";
            }

            var max = 0;
            for (var i = 0; i < stats.nodes.length; i++) {
                max = Math.max(stats.nodes[i].total, max);
            }

            for (var i = 0; i < numNodes; i++) {
                var usedNum = stats.nodes[i].used;
                var total = xcHelper.sizeTranslator(stats.nodes[i].total, true, null,
                                                        sizeOption);
                var used = xcHelper.sizeTranslator(usedNum, true, null,
                                                    sizeOption);

                if (index === networkIndex) {
                    usedUnits = used[1] + "/s";
                    totalUnits = total[1] + "/s";
                } else {
                    usedUnits = used[1];
                    totalUnits = total[1];
                }

                var pct = Math.round(usedNum / max * 100);
                var bars = getPctBarHtml(pct);

                listHTML += '<li>' + bars +
                        '<div class="name">' +
                            'Node ' + stats.nodes[i].node +
                        '</div>' +
                        '<div class="values">' +
                            '<span class="userSize">' +
                                used[0] + " " + usedUnits +
                            '</span>' +
                            '<span class="separator">&nbsp;' + separator +
                                                    '&nbsp;</span>' +
                            '<span class="totalSize">' +
                                total[0] + " " + totalUnits +
                            '</span>' +
                            '<span class="pct">' + pct + '%</span>' +
                        '</div>' +
                    '</li>';

            }
        }
        $statsSection.find('ul').html(listHTML);
    }

    function getPctBarHtml(pct) {
        var bars = '<div class="bars">' +
                        '<div class="bar" style="width:' + pct + '%;"></div>' +
                    '</div>';
        return bars;
    }

    // function sortStats(a, b) {
    //     if (a.used > b.used) return 1;
    //     if (a.used < b.used) return -1;
    //     return 0;
    // }

    return (MonitorDonuts);
}(jQuery, {}));
