function setupMonitorPanel() {
    initializeDonuts();

    $('#refreshGraph').click(function() {
        toggleRefresh();
    });

    $('#refreshBtn').click(function() {
        toggleRefresh();
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

    function toggleRefresh() {
        var $refreshBtn = $('#refreshBtn');
        if ($refreshBtn.hasClass('off')) {
            $refreshBtn.removeClass('off');
            turnOnAutoRefresh();
        } else {
            $refreshBtn.addClass('off');
            clearInterval(graphInterval);
        }
    }

    var graphInterval;
    var refreshTime = 4000;
    function turnOnAutoRefresh() {
        updateMonitorGraphs();
        graphInterval = setInterval(function() {
            updateMonitorGraphs();
        }, refreshTime);
    }
}

function initializeDonuts() {
    var numDonuts = 4;
    var blueOuter = '#20a7eb';
    var greenOuter = '#90c591';
    var brownOuter = '#bbae84';
    var tealOuter = '#1193b8';
    var grayOuter = '#cecece';
    var colors = [blueOuter, greenOuter, brownOuter, tealOuter];
    var diameter = 180;
    var radius = diameter/2;
    var arc = d3.svg.arc()
                .innerRadius(radius)
                .outerRadius(radius - 40);
    var pie = d3.layout.pie()
            .sort(null);

    var color;
    var svg;
    for (var i = 0; i < numDonuts; i++) {
        color = d3.scale.ordinal().range([colors[i], grayOuter]);
        svg = makeSvg('#donut'+i+' .donut');
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

    function drawPath(svg, color) {
        var data = [0, 100];
        svg.selectAll("path")
            .data(pie(data))
            .enter().append("path")
            .attr("fill", function(d, i) { 
                return (color(i)); 
            })
            .attr("d", arc)
            .each(function(d) {
                this._current = d; // store the initial angles
            });
    }
}         


function updateDonut(el, val, total) {
    var duration = 750;
    var index = $(el).closest('.donutSection').attr('id').substring(5);
    var pie = d3.layout.pie().sort(null);
    var data = [val, total - val];
    var donut = d3.select(el);
    var paths = donut.selectAll("path").data(pie(data));
    var diameter = 180;
    var radius = diameter/2;
    var arc = d3.svg.arc()
                .innerRadius(radius)
                .outerRadius(radius - 40);

    paths.transition()
         .duration(duration)
         .attrTween("d", arcTween); 

    updateDonutNums('#donut'+index+' .userSize .num', data[0], index);
    updateDonutNums('#donut'+index+' .totalSize .num', total, index);
    
    function updateDonutNums(selector, num) {
        var $sizeType = $(selector).next();
        var type = $sizeType.text();
        d3.select(selector)
          .transition()
          .duration(duration)
          .tween("text", function() {
                var startNum = this.textContent;
                if (type == "TB") {
                  startNum *= 1024;
                }
                var i = d3.interpolate(startNum, num);
                return (function(t) {
                    var num = Math.round(i(t));
                    if (index == 0) {
                        this.textContent = num;
                        return;
                    }
                    if (index != 3) {
                        if (num > 1023) {
                            num = Math.round(num / 102.4) / 10;
                            $sizeType.html('TB');
                        } else {
                            $sizeType.html('GB');
                        }
                    }
                    
                    this.textContent = num;
                });
          });
    }

    function arcTween(a) {
        var i = d3.interpolate(this._current, a);
        this._current = i(0);
        return (function(t) {
            return (arc(i(t)));
        });
    }
}

function updateMonitorGraphs() {
    if (!$('#monitorTab').hasClass('active')) {
        return;
    }
    var d = new Date();
    var date = d.toLocaleDateString().replace(/\//g,'-');
    var time = d.toLocaleTimeString();
    $("#graphTime").text(date+" "+time);
    var numNodes = 0;
    var apiTopResult;

    XcalarApiTop()
    .then(function(result) {
        apiTopResult = result;
        numNodes = result.numNodes;
        return (XcalarGetStats(numNodes));
    })
    .then(function(nodes) {
        processNodeStats(nodes, apiTopResult, numNodes);
    })
    .fail(function() {
        console.log('XcalarGetStats failed');
    });

    function processNodeStats(nodes, apiTopResult, numNodes) {
        var StatsObj = function() {
            this.used = [];
            this.tot = [];
            this.sumUsed = 0;
            this.sumTot = 0;
        }

        var cpu = new StatsObj();
        var ram = new StatsObj();
        var flash = new StatsObj();
        var disk = new StatsObj();
        for (var i = 0; i < numNodes; i++) {
            var cpuPct = apiTopResult.topOutputPerNode[i].cpuUsageInPercent;
            cpuPct = Math.round(cpuPct*100) / 100;
            cpu.used.push(cpuPct);
            cpu.sumUsed += cpuPct;
            cpu.sumTot += 100;

            var ramUsed = apiTopResult.topOutputPerNode[i].memUsedInBytes / GB;
            var ramTot = 
                apiTopResult.topOutputPerNode[i].totalAvailableMemInBytes / GB;
            ramUsed = Math.round(ramUsed*10) / 10;
            ramTot = Math.round(ramTot*10) / 10;
            ram.used.push(ramUsed);
            ram.tot.push(ramTot);
            ram.sumUsed += ramUsed;
            ram.sumTot += ramTot;

            var flashUsed = Math.ceil(nodes[i].usedFlash / GB);
            var flashTot = nodes[i].totFlash / GB;
            flash.used.push(flashUsed);
            flash.tot.push(flashTot);
            flash.sumUsed += flashUsed;
            flash.sumTot += flashTot;

            var diskUsed = Math.ceil(nodes[i].usedDisk / TB)*5;
            var diskTot = Math.ceil(nodes[i].totDisk / TB)*5;
            disk.used.push(diskUsed);
            disk.tot.push(diskTot);
            disk.sumUsed += diskUsed;
            disk.sumTot += diskTot;
        }
        var allStats = [cpu, ram, flash, disk];

        $('.donut').each(function(index) {
            var el = this;
            if (index == 0) {
                var used = allStats[index].sumUsed / numNodes;
                var total = allStats[index].sumTot / numNodes;
            } else {
                var used = allStats[index].sumUsed;
                var total = allStats[index].sumTot;
            }
            
            updateDonut(el, used, total);
            updateStatsSection(el, index, allStats[index]);
        });
    }
}

function updateStatsSection(el, index, stats) {
    //this is for the list of stats located below the donut
    var numNodes = stats.used.length;
    var $statsSection = $(el).next();
    var listHTML = "";
    
    if (index == 0) {
        var avgUsed = Math.round((stats.sumUsed / numNodes)*100)/100;
        $statsSection.find('.statsHeadingBar .avgNum').text(avgUsed);

        for (var i = 0; i < numNodes; i++) {
            listHTML += '<li>' +
                            '<span class="name">Node '+(i+1)+'</span>' +
                            '<span class="statsNum">'+stats.used[i]+'%</span>' +
                        '</li>';
        }
    } else {
        $statsSection.find('.statsHeadingBar .totNum').text(stats.sumTot);
        $statsSection.find('.statsHeadingBar .avgNum').text(stats.sumUsed);
        if (index == 3) {
            var units = " Mbps";
        } else {
            var units = " GB";
        }
        for (var i = 0; i < numNodes; i++) {
            listHTML += '<li>' +
                            '<span class="name">Node '+(i+1)+'</span>' +
                            '<span class="userSize">'+
                                stats.used[i]+units+
                            '</span>' +
                            '<span class="totalSize">'
                                +stats.tot[i]+units+
                            '</span>' +
                        '</li>';
        }
    }
    $statsSection.find('ul').html(listHTML);
}
