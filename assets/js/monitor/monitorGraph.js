window.MonitorGraph = (function($, MonitorGraph) {
    var intervalTime = 3000; // update interval in milliseconds
    var xGridWidth = 60; // space between each x-axis grid line
    var height = 210;
    var yAxis;
    var yScale;
    var datasets;
    var xGridVals;
    var svg;
    var graphCycle;

    var pointsPerGrid = 10;
    var shiftWidth = xGridWidth / pointsPerGrid;
    var count = 0;
    var gridRight;
    var newWidth;
    var svgWrap;
    var firstTime;
    var numXGridMarks;
    var $graphWrap;
    var timeStamp;
    var failCount = 0;
    var curIteration = 0;

    MonitorGraph.setup = function() {
        var $monitorPanel = $('#monitorPanel');
        $monitorPanel.find('.graphSwitch').click(function() {
            var $switch = $(this);
            var index = $(this).parent().index();

            if (index > 1) {
                return;
            }

            if ($switch.hasClass('on')) {
                $switch.removeClass('on');
                $monitorPanel.find('.line' + index).hide();
                $monitorPanel.find('.area' + index).hide();
                $monitorPanel.find(".yAxis").eq(index).hide();
            } else {
                $switch.addClass('on');
                var $area = $monitorPanel.find('.area' + index);
                var $line = $monitorPanel.find('.line' + index);

                $area.show();
                $line.show();
                $monitorPanel.find(".yAxis").eq(index).show();

                // bring this line and area in front of the others
                $monitorPanel.find('.mainSvg').children().append($line, $area);
            }
        });

        $('#graph').on('click', '.area', function() {
            var $area = $(this);
            var $line = $(this).prev();

            if ($area.css('opacity') > 0.6) {
                $area.css('opacity', 0.4);
            } else {
                $area.css('opacity', 0.8);
            }

            $('.mainSvg').children().append($line, $area);
        });
    };

    MonitorGraph.start = function() {
        datasets = [[0], [0]];

        $('#ramTab, #cpuTab').addClass('on');

        setupLabelsPathsAndScales();

        setTimeout(function() {
            //XX Hack - the graph refuses to move unless I change more
            // of its attributes
            var rand = Math.random() * 0.1;
            svgWrap.attr("height", height + rand);
        }, 300);

        createTempGrid(); // initial grid that gets pushed off
        startCycle();
    };

    MonitorGraph.clear = function() {
        var $graph = $('#graph');
        $graph.find('svg').remove();
        $graph.find('.xLabels').empty();
        $('#rightYAxis').empty();
        curIteration++;
        clearTimeout(graphCycle);
    };

    MonitorGraph.stop = function() {
        curIteration++;
        clearTimeout(graphCycle);
    };

    MonitorGraph.updateInterval = function(time) {
        intervalTime = time;
        curIteration++;
        clearTimeout(graphCycle);
        cycle();
    };

    function startCycle() {
        count = 0;
        newWidth = xGridWidth + shiftWidth;
        numXGridMarks = 5;
        gridRight = shiftWidth;
        $graphWrap = $('#graphWrap');
        svgWrap = svg.select(function() {
            return (this.parentNode);
        });
        firstTime = true;

        intervalTime = (UserSettings.getPref('monitorGraphInterval') * 1000) ||
                        intervalTime;

        curIteration++;
        clearTimeout(graphCycle);
        var prevIteration = curIteration;
        var startTime = Date.now();

        getStatsAndUpdateGraph()
        .always(function() {
            if (prevIteration === curIteration) {
                var elapsedTime = Date.now() - startTime;
                cycle(elapsedTime);
            }
        });
    }

    // ajustTime is the time to subtract from the interval time due to the
    // length of time it takes for the backend call to return
    function cycle(adjustTime) {
        var prevIteration = curIteration;
        var intTime = intervalTime;
        if (adjustTime) {
            intTime = Math.max(200, intervalTime - adjustTime);
        }
        graphCycle = setTimeout(function() {
            var startTime = Date.now();
            getStatsAndUpdateGraph()
            .always(function() {
                if (prevIteration === curIteration) {
                    var elapsedTime = Date.now() - startTime;
                    cycle(elapsedTime);
                }
            }) 
        }, intTime);
    }

    function getStatsAndUpdateGraph() {
        var deferred = jQuery.Deferred();

        if (count % 10 === 0) {
            xGridVals.push(numXGridMarks * xGridWidth);
            numXGridMarks++;

            if (count % 40 === 0) {
                var time = xcHelper.getTime();
                time = time.substr(0, (time.length - 3));
                timeStamp = '<span>' + time + '</span>';
            }
        }
        var d = new Date();
        var date = xcHelper.getDate("-", d);
        var donutTime = xcHelper.getTime(d);
        $("#graphTime").text(date + " " + donutTime);

        var numNodes;
        var apiTopResult;
        var prevIteration = curIteration;

        XcalarApiTop()
        .then(function(result) {
            if (prevIteration !== curIteration) {
                return PromiseHelper.resolve();
            }
            apiTopResult = result;
            numNodes = result.numNodes;
            return xcHelper.getMemUsage();
        })
        .then(function(memInfos) {
            if (prevIteration !== curIteration) {
                deferred.resolve();
                return;
            }
            var allStats = processNodeStats(memInfos, apiTopResult, numNodes);
            updateGraph(allStats, numNodes);
            MonitorPanel.updateDonuts(allStats, numNodes);
            failCount = 0;
            toggleErrorScreen();
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("get status fails", error);
            failCount++;
            // if it fails 2 times in a row, we show error screen
            if (failCount === 2) {
                console.error("failed to get stats twice in a row");
                toggleErrorScreen(true, error);
            }
            deferred.reject();
        });

        count++;

        setTimeout(function() {
            //XX Hack - the graph refuses to move unless I change more
            // of its attributes
            var rand = Math.random() * 0.1;
            svgWrap.attr("height", height + rand);
        }, 150);

        return deferred.promise();
    }

    function processNodeStats(memInfos, apiTopResult, numNodes) {
        var StatsObj = function() {
            this.used = [];
            this.tot = [];
            this.sumUsed = 0;
            this.sumTot = 0;
            return this;
        };

        var cpu = new StatsObj();
        var ram = new StatsObj();
        var network = new StatsObj(); // For network, send is used, recv is tot

        for (var i = 0; i < numNodes; i++) {
            var node = apiTopResult.topOutputPerNode[i];
            var cpuPct = node.cpuUsageInPercent;
            cpuPct = Math.round(cpuPct * 100) / 100;
            cpu.used.push(cpuPct);
            cpu.sumUsed += cpuPct;
            cpu.sumTot += 100;

            if (memInfos[i] != null && memInfos[i].sys != null) {
                var ramUsed = memInfos[i].sys.used;
                var ramTot = memInfos[i].sys.total;
                ram.used.push(ramUsed);
                ram.tot.push(ramTot);
                ram.sumUsed += ramUsed;
                ram.sumTot += ramTot;
            }

            var networkUsed = node.networkSendInBytesPerSec;
            var networkTot = node.networkRecvInBytesPerSec;
            network.used.push(networkUsed);
            network.tot.push(networkTot);
            network.sumUsed += networkUsed;
            network.sumTot += networkTot;
        }

        var allStats = [cpu, ram, network];
        return (allStats);
    }

    function updateGraph(allStats, numNodes) {
        var numGraphs = 2;
        var rightYMaxUnit;
        for (var i = 0; i < numGraphs; i++) {
            var xVal = allStats[i].sumUsed;

            if (i === 0) { // cpu %
                xVal /= numNodes;
                xVal = Math.min(100, xVal);
            }

            if (i === 1) {
                rightYMaxUnit = xcHelper.sizeTranslator(allStats[i].sumTot,
                                                        true)[1];
                xVal = xcHelper.sizeTranslator(xVal, true, rightYMaxUnit)[0];
            }
            datasets[i].push(xVal);
        }
        var yMax = xcHelper.sizeTranslator(allStats[1].sumTot, true)[0];
        yMax = [100, yMax];

        redraw(newWidth, gridRight, numGraphs, yMax, rightYMaxUnit);

        $('.xLabelsWrap').width(newWidth);
        svgWrap.attr("width", newWidth);
        newWidth += shiftWidth;
        gridRight += shiftWidth;

        if (timeStamp) {
            $('.xLabels').append(timeStamp);
            timeStamp = null;
        }

        if ($graphWrap.scrollLeft() >=
            (newWidth - $graphWrap.width() - xGridWidth))
        {
            $graphWrap.scrollLeft(newWidth);
        }
    }

    // monitor graph is made up of 2 grids, with "tempGrid" being one of them.
    // tempGrid is the initial grid you see, it is later pushed out by a new
    // grid that contains the colored graphs
    function createTempGrid() {
        var maxScreenSize = 4020; // grid has static size so we pick 4020
        // because it's wide enough to accomodate most screens
        var tempGridWrap = d3.select('#grids').append("svg");
        var gridSvg = tempGridWrap.attr("width", maxScreenSize)
                                .attr("height", height)
                                .attr("class", "gridSvg")
                                .append("g");
        var tempXGridVals = [];
        for (var i = 0; i < maxScreenSize; i += 60) {
            tempXGridVals.push(i);
        }

        var xScale = d3.scale.linear()
                          .domain([0, maxScreenSize])
                          .range([0, maxScreenSize]);

        var tempXAxis = d3.svg.axis()
                        .scale(xScale)
                        .orient("bottom")
                        .innerTickSize(-height)
                        .tickValues(tempXGridVals);

        gridSvg.append("g")
               .attr("class", "x axis")
               .attr("transform", "translate(0," + height + ")")
               .call(tempXAxis);

        yAxis.innerTickSize(-maxScreenSize);

        gridSvg.append("g")
               .attr("class", "y axis")
               .call(yAxis);
    }

    function setupLabelsPathsAndScales() {
        var numGraphs = datasets.length;
        var xAxis;

        xGridVals = [];
        for (var i = 0; i < 300; i += 60) {
            xGridVals.push(i);
        }

        xScale = d3.scale.linear()
                   .domain([0, 10])
                   .range([0, xGridWidth]);

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
                    .innerTickSize(-xGridWidth);

        svg = d3.select("#graph .svgWrap").append("svg")
                    .attr("width", xGridWidth)
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
                        .x(function(d, j) {
                            return (xScale(j));
                        })
                        .y(function(d) {
                            return (yScale(d));
                        });

            var area = d3.svg.area()
                        .x(function(d, j) {
                            return (xScale(j));
                        })
                        .y0(height)
                        .y1(function(d) {
                            return (yScale(d));
                        });

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "line line" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", line);

            svg.append("path")
               .data([datasets[i]])
               .attr("class", "area area" + i)
               .attr("transform", "translate(60, 0)")
               .attr("d", area);
        }
    }

    function drawRightYAxis(yMax, unit) {
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
                                .attr("height", height + 30)
                                .attr("class", "rightYAxisWrap")
                                .append("g")
                                .attr("transform",
                                      "translate(-2,8)")
                                .call(yAxis);
        $('#rightYAxis').append("<span>0 (" + unit + ")</span>");
    }

    function redraw(newWidth, gridRight, numGraphs, yMax, unit) {
        if (firstTime) {
            drawRightYAxis(yMax, unit);
            firstTime = false;
        }

        for (var i = 0; i < numGraphs; i++) {

            var tempYScale = d3.scale
                            .linear()
                            .domain([0, yMax[i]])
                            .range([height, 0]);

            var line = d3.svg.line()
                            .x(function(d, j) {
                                return (xScale(j));
                            })
                            .y(function(d) {
                                return (tempYScale(d));
                            });

            var area = d3.svg.area()
                            .x(function(d, j) {
                                return (xScale(j));
                            })
                            .y0(height)
                            .y1(function(d) {
                                return (tempYScale(d));
                            });

            svg.selectAll(".line" + i)
               .data([datasets[i]])
               .attr("d", line);

            svg.selectAll(".area" + i)
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

        $('.gridSvg').css('right', gridRight + 'px');
    }

    function toggleErrorScreen(show, error) {
        var $errorScreen = $("#monitor-graphCard").find(".statsErrorContainer");
        if (show) {
            $errorScreen.removeClass("xc-hidden");
            var msg;
            // if no error, or error.error doesn't exist, or error.error is
            // udf execute failed, change msg to custom message
            if (!error || (!error.error ||
                error.status === StatusT.StatusUdfExecuteFailed)) {
                msg = MonitorTStr.StatsFailed;
            } else {
                msg = error.error;
            }
            $errorScreen.text(msg);
        } else { // hide the error screen
            $errorScreen.empty().addClass("xc-hidden");
        }
    }

    return (MonitorGraph);

}(jQuery, {}));
