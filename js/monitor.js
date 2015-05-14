window.MonitorPanel = (function($, MonitorPanel) {
    MonitorPanel.setup = function () {
        initializeDonuts();
        populateNodeInformation()

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
            MonitorPanel.updateDonuts();
            graphInterval = setInterval(function() {
                MonitorPanel.updateDonuts();
            }, refreshTime);
        }

        MonitorGraph.setup();
    };

    MonitorPanel.updateDonuts = function() {
        if (!$('#monitorTab').hasClass('active')) {
            return;
        }
        var d = new Date();
        var date = xcHelper.getDate("-", d);
        var time = xcHelper.getTime(d);
        $("#graphTime").text(date + " " + time);
        var numNodes = 0;
        var apiTopResult;

        XcalarApiTop()
        .then(function(result) {
            apiTopResult = result;
            numNodes = result.numNodes;
            return (XcalarGetStats(numNodes));
        })
        .then(function(nodes) {
            var allStats = MonitorPanel.processNodeStats(nodes, apiTopResult, 
                                                         numNodes);
            updateDonutSection(allStats, numNodes);
        })
        .fail(function() {
            console.log('XcalarGetStats failed');
        });

    }

    MonitorPanel.processNodeStats = function(nodes, apiTopResult, numNodes) {
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
            // console.log(ramUsed)
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

        ram.sumUsed = Math.round(ram.sumUsed*10) /10;
        ram.sumTot = Math.round(ram.sumTot*10) /10;
        var allStats = [cpu, ram, flash, disk];

        return (allStats);
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

    function updateDonutSection(allStats, numNodes) {
        $('.donut').each(function(index) {
            var el = this;
            if (index == 0) {
                var used = allStats[index].sumUsed / numNodes;
                var total = allStats[index].sumTot / numNodes;
            } else {
                var used = allStats[index].sumUsed;
                var total = allStats[index].sumTot;
            }
            
            updateOneDonut(el, used, total);
            updateDonutStatsSection(el, index, allStats[index]);
        });
    }

    function updateOneDonut(el, val, total) {
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

        updateDonutNums('#donut'+index+' .userSize .num', data[0], duration,
                        index);
        updateDonutNums('#donut'+index+' .totalSize .num', total, duration, 
                        index);
        
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

    function updateDonutStatsSection(el, index, stats) {
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

    function populateNodeInformation() {
        $("#phyNode").text(hostname);
        // Insert information here regarding virtual nodes next time
    }      


    return (MonitorPanel);
}(jQuery, {}));


window.MonitorGraph = (function($, MonitorGraph) {
    var width = 60;
    var height = 210;
    var xAxis;
    var yAxis;
    var yScale;
    var datasets;
    var xGridVals;
    var svg; 
    var graphCycle;
    
    MonitorGraph.setup = function() {
        var $monitorPanel = $('#monitorPanel');
        $monitorPanel.find('.sideTab').click(function() {
            if ($(this).index() > 1) {
                return;
            }
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                var index = $(this).index();
                $monitorPanel.find('.line'+index).hide();
                $monitorPanel.find('.area'+index).hide();
            } else {
                $(this).addClass('active');
                var index = $(this).index();
                var $area = $monitorPanel.find('.area'+index);
                var $line = $monitorPanel.find('.line'+index);
                
                $area.show();
                $line.show();
                $('.mainSvg').children().append($line, $area);
            }
        });

        $('#graph').on('click', '.area', function() {
            var $area = $(this);
            var $line = $(this).prev();

            if ($area.css('opacity') > 0.5) {
                $area.css('opacity', 0.2);
            } else {
                $area.css('opacity', 0.6);
            }

            $('.mainSvg').children().append($line, $area);
        });
    }

    MonitorGraph.start = function() {
        datasets = [[0], [0]];
        var numGraphs = datasets.length;
        $('#ramTab, #cpuTab').addClass('active');
        
        xGridVals = [];
        for (var i = 0; i < 300; i += 60) {
            xGridVals.push(i);
        }

        xScale = d3.scale.linear()
                   .domain([0, 10])
                   .range([0, width]); 

        yScale = d3.scale.linear()
                    .range([height, 0]);

        xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .innerTickSize(-height)
                    .ticks(1);

        yAxis = d3.svg.axis()
                    .scale(yScale)
                    .orient("left")
                    .innerTickSize(-width);

        var svgWrap = d3.select("#graph").insert("svg", ".separator");
        
        svg = svgWrap.attr("width", width)
                     .attr("height", height)
                     .attr("class", "mainSvg")
                     .append("g");

        svg.append("g")
           .attr("class", "x axis")
           .attr("transform", "translate(0," + height + ")")
           .call(xAxis);

        svg.append("g")
           .attr("class", "y axis")
           .call(yAxis);

        for (var i = 0; i < numGraphs; i++) {

            var line = d3.svg.line()
                        .x(function(d,j) { 
                            return (xScale(j)); 
                        })
                        .y(function(d) { 
                            return (yScale(d)); 
                        });

            var area = d3.svg.area()
                        .x(function(d,j) { 
                            return (xScale(j)); 
                        })
                        .y0(height)
                        .y1(function(d) { 
                            return (yScale(d)); 
                        });

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "line line"+i)
               .attr("transform", "translate(60, 0)")
               .attr("d", line);

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "area area"+i)
               .attr("transform", "translate(60, 0)")
               .attr("d", area);
        }

        createTempGrid();
        startCycle();
    }

    MonitorGraph.clear = function() {
        var $graph = $('#graph');
        $graph.find('svg').remove();
        $graph.find('.xLabels').empty();
        clearInterval(graphCycle);
    }

    function startCycle() {
        var gridWidth = 60;
        var pointsPerGrid = 10;
        var count = 0;
        var interval = 3000; // in milliseconds
        var shiftWidth = gridWidth / pointsPerGrid;
        var newWidth = width + shiftWidth;
        var numXGridMarks = 5;
        var gridRight = shiftWidth;
        var $graphWrap = $('#graphWrap');
        var svgWrap = svg.select(function() {return this.parentNode});
        var timeStamp;
        var firstTime = true;
        getStatsAndUpdateGraph(firstTime);
        graphCycle = setInterval(getStatsAndUpdateGraph, interval);

        function getStatsAndUpdateGraph(firstTime) {
            if (count % 10 == 0) {
                xGridVals.push(numXGridMarks*gridWidth);
                numXGridMarks++;    

                if (count % 40 == 0) {
                    var time = xcHelper.getTime();
                    time = time.substr(0, (time.length - 3));
                    timeStamp = '<span>'+time+'</span>';
                }
            }

            XcalarApiTop()
            .then(function(result) {
                apiTopResult = result;
                numNodes = result.numNodes;
                return (XcalarGetStats(numNodes));
            })
            .then(function(nodes) {
                var allStats = MonitorPanel.processNodeStats(nodes, 
                                                        apiTopResult, numNodes);
                var numGraphs = 2;
                for (var i = 0; i < numGraphs; i++) {
                    datasets[i].push(allStats[i].sumUsed);
                    // datasets[i].push(50);
                }
                var yMax = [100, allStats[1].sumTot];
                redraw(newWidth, gridRight, numGraphs, yMax, firstTime);
                $('.xLabelsWrap').width(newWidth);
                svgWrap.attr("width", newWidth);
                newWidth += shiftWidth;
                gridRight += shiftWidth;

                if (timeStamp) {
                    $('.xLabels').append(timeStamp);
                    timeStamp = null;
                }

                if ($graphWrap.scrollLeft() >= 
                    (newWidth - $graphWrap.width() - gridWidth)) {
                        $graphWrap.scrollLeft(newWidth);
                }
                
            })
            .fail(function() {
                console.log('XcalarGetStats failed');
            });

            count++;
        }
    }
    
    function createTempGrid() {
        var tempGridWrap = d3.select('#grids').append("svg");
        var gridSvg = tempGridWrap.attr("width", 4020)
                                .attr("height", height)
                                .attr("class", "gridSvg")
                                .append("g");
        var tempXGridVals = [];
        for (var i = 0; i < 4020; i += 60) {
            tempXGridVals.push(i);
        }

        var xScale = d3.scale.linear()
                          .domain([0, 4020])
                          .range([0, 4020]); 

        var tempXAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .innerTickSize(-height)
                        .tickValues(tempXGridVals);

        gridSvg.append("g")
               .attr("class", "x axis")
               .attr("transform", "translate(0," + height + ")")
               .call(tempXAxis);

        yAxis.innerTickSize(-4020);

        gridSvg.append("g")
               .attr("class", "y axis")
               .call(yAxis);
    }

    function drawRightYAxis(yMax) {
            var yScale = d3.scale.linear()
                                .domain([0, yMax[1]])
                                .range([height, 0]);

            var yAxisStart = yMax[1] / 5;
            var yAxisMax = yMax[1] + 1;
            var yAxisSteps = yMax[1] / 5;

            var yAxis = d3.svg.axis()
                            .scale(yScale)
                            .orient("right")
                            .innerTickSize(0)
                            .tickValues(d3.range(yAxisStart, 
                                                 yAxisMax, yAxisSteps));

            d3.select("#rightYAxis").append("svg")
                                    .attr("width", 40)
                                    .attr("height", height+30)
                                    .attr("class", "rightYAxisWrap")
                                    .append("g")
                                    .attr("transform", 
                                          "translate(-2,8)")
                                    .call(yAxis);
    }

    function redraw(newWidth, gridRight, numGraphs, yMax, firstTime) {
        if (firstTime) {
            drawRightYAxis(yMax);
        }

        for (var i = 0; i < numGraphs; i++) {

            var tempYScale = d3.scale
                            .linear()
                            .domain([0, yMax[i]])
                            .range([height, 0]);
   
            var line = d3.svg.line()
                            .x(function(d,j) { 
                                return (xScale(j)); 
                            })
                            .y(function(d) { 
                                return (tempYScale(d)); 
                            });

            var area = d3.svg.area()
                            .x(function(d,j) { 
                                return (xScale(j)); 
                            })
                            .y0(height)
                            .y1(function(d) { 
                                return (tempYScale(d)); 
                            });

            svg.selectAll(".line"+i)
               .data([datasets[i]]) 
               .attr("d", line);

            svg.selectAll(".area"+i)
               .data([datasets[i]])
               .attr("d", area);
        }

        var timeScale = d3.scale.linear()
                          .domain([0, newWidth])
                          .range([0, newWidth]); 


        var xAxis = d3.svg.axis()
                          .scale(timeScale)
                          .orient("bottom")
                          .innerTickSize(-height)
                          .tickValues(xGridVals);

        svg.selectAll(".x")
            .call(xAxis); 

        var yAxis = d3.svg.axis()
                          .scale(yScale)
                          .orient("left")
                          .innerTickSize(-newWidth);

        svg.selectAll(".y")
           .call(yAxis);

        $('.gridSvg').css('right', gridRight+'px');;
    }

    return (MonitorGraph);

}(jQuery, {}));