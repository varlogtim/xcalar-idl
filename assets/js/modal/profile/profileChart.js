window.ProfileChart = (function(ProfileChart, $, d3) {
    var __extends = (this && this.__extends) || function (d, b, methods) {
        for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        for (var method in methods) {
            d.prototype[method] = methods[method];
        }
    };

    var tooltipOptions = {
        "trigger": "manual",
        "animation": false,
        "placement": "top",
        "container": "body",
        "html": true,
        "template": '<div class="chartTip tooltip" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"></div>' +
                    '</div>'
    };

    /* abstract chart builder class */
    var ChartBuilder = function(options) {
        this.options = options || {};
        return this;
    };

    ChartBuilder.prototype = {
        _getOptions: function() {
            return this.options;
        },

        _getModal: function() {
            return $("#profileModal");
        },

        _getLabel: function(d, charLenToFit) {
            var options = this._getOptions();
            var nullCount = options.nullCount;
            var sum = options.sum;
            var yName = options.yName;
            var num = d[yName];
            var percentageLabel = options.percentage;

            if (percentageLabel && sum !== 0) {
                // show percentage
                num = (num / (sum + nullCount) * 100);

                var intLenth = String(Math.floor(num)).length;
                // charFit - integer part - dot - % - 1charPadding
                var fixLen = Math.max(1, charLenToFit - intLenth - 3);
                // XXX that's for Citi's request to have maxium 2 digits
                // in decimal, used to be 3, can change back
                fixLen = Math.min(fixLen, 2);
                return (num.toFixed(fixLen) + "%");
            } else {
                num = this._formatNumber(d[yName]);
                if (num.length > charLenToFit) {
                    return (num.substring(0, charLenToFit) + "..");
                } else {
                    return num;
                }
            }
        },

        _getXAxis: function(d, charLenToFit) {
            var options = this._getOptions();
            var bucketSize = options.bucketSize;
            var noBucket = this._isNoBucket(bucketSize);
            var noSort = options.noSort;
            var xName = options.xName;
            var decimalNum = options.decimal;

            var isLogScale = (bucketSize < 0);
            var lowerBound = this._getLowerBound(d[xName], bucketSize);
            var name = this._formatNumber(lowerBound, isLogScale, decimalNum);

            if (!noBucket && !noSort && d.type !== "nullVal") {
                var upperBound = this._getUpperBound(d[xName], bucketSize);
                upperBound = this._formatNumber(upperBound, isLogScale, decimalNum);
                name = name + "-" + upperBound;
            }

            if (name.length > charLenToFit) {
                return (name.substring(0, charLenToFit) + "..");
            } else {
                return name;
            }
        },

        _getTooltpAndClass: function(ele, d) {
            // a little weird method to setup tooltip
            // may have better way
            var options = this._getOptions();
            var nullCount = options.nullCount;
            var bucketSize = options.bucketSize;
            var noBucket = this._isNoBucket(bucketSize);
            var xName = options.xName;
            var yName = options.yName;
            var sum = options.sum;
            var decimalNum = options.decimal;
            var percentageLabel = options.percentage;

            var title;
            var isLogScale = (bucketSize < 0);
            var lowerBound = this._getLowerBound(d[xName], bucketSize);

            if (d.section === "other") {
                title = "Value: Other<br>";
            } else if (noBucket || d.type === "nullVal") {
                // xName is the backColName, may differenet with frontColName
                title = "Value: " +
                        this._formatNumber(lowerBound, isLogScale, decimalNum) +
                        "<br>";
            } else {
                var upperBound = getUpperBound(d[xName], bucketSize);
                title = "Value: [" +
                        this._formatNumber(lowerBound, isLogScale, decimalNum) +
                        ", " +
                        this._formatNumber(upperBound, isLogScale, decimalNum) +
                        ")<br>";
            }

            if (percentageLabel && sum !== 0) {
                var num = d[yName] / (sum + nullCount) * 100;
                var per = num.toFixed(3);

                if (num < 0.001) {
                    // when the percentage is too small
                    per = num.toExponential(2) + "%";
                } else {
                    per += "%";
                }
                title += "Percentage: " + per;
            } else {
                title += "Frequency: " + this._formatNumber(d[yName]);
            }
            var tipOptions = $.extend({}, tooltipOptions, {
                "title": title
            });
            $(ele).tooltip("destroy");
            $(ele).tooltip(tipOptions);
            return "area";
        },

        _getNumInScale: function(num, isLogScale) {
            if (!isLogScale) {
                return num;
            }
            // log scale;
            if (num === 0) {
                return 0;
            }

            var absNum = Math.abs(num);
            absNum = Math.pow(10, absNum - 1);
            return (num > 0) ? absNum : -absNum;
        },

        _getLowerBound: function(num, bucketSize) {
            var isLogScale = (bucketSize < 0);
            return this._getNumInScale(num, isLogScale);
        },

        _getUpperBound: function(num, bucketSize) {
            var isLogScale = (bucketSize < 0);
            return this._getNumInScale(num + Math.abs(bucketSize), isLogScale);
        },

        _formatNumber: function(num, isLogScale, decimal) {
            if (num == null) {
                console.warn("cannot format empty or null value");
                return "";
            } else if (typeof(num) === "string") {
                return "\"" + num + "\"";
            } else if (typeof(num) === "boolean") {
                return num;
            } else if (isNaN(num)) {
                return num;
            } else if (isLogScale) {
                if (num <= 1 && num >= -1) {
                    return num;
                } else {
                    return num.toExponential();
                }
            } else if (decimal != null && decimal > -1) {
                return num.toFixed(decimal);
            }
            // if not speify maximumFractionDigits, 168711.0001 will be 168,711
            return xcHelper.numToStr(num, 5);
        },

        _isNoBucket: function(bucketSize) {
            return (bucketSize === 0) ? 1 : 0;
        }
    };
    /* end of abstract chart builder class */

    /* bar chart builder class */
    var BarChartBuilder = (function(_super) {
        function BarChartBuilder(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(BarChartBuilder, _super, {
            build: function() {
                var self = this;
                var $modal = self._getModal();
                var options = self._getOptions();
                var initial = options.initial;
                var resize = options.resize;

                var xName = options.xName;
                var yName = options.yName;

                var nullCount = options.nullCount;
                var bucketSize = options.bucketSize;

                var max = options.max;

                var noSort = options.noSort;
                var noBucket = self._isNoBucket(bucketSize);

                var data = options.data;

                var $section = $modal.find(".groupbyInfoSection");
                var dataLen = data.length;

                var sectionWidth = $section.width();
                var marginBottom = 10;
                var marginLeft = 20;

                var maxRectW = Math.floor(sectionWidth / 706 * 70);
                var chartWidth = Math.min(sectionWidth, maxRectW * data.length
                                          + marginLeft * 2);
                var chartHeight = $section.height();

                var height = chartHeight - marginBottom;
                var width = chartWidth - marginLeft * 2;

                // x range and y range
                var maxHeight = Math.max(max, nullCount);
                var x = d3.scale.ordinal()
                            .rangeRoundBands([0, width], 0.1, 0)
                            .domain(data.map(function(d) { return d[xName]; }));
                var y = d3.scale.linear()
                            .range([height, 0])
                            .domain([-(maxHeight * 0.02), maxHeight]);

                var xWidth = x.rangeBand();
                // 6.2 is the width of a char in .xlabel
                var charLenToFit = Math.max(1, Math.floor(xWidth / 6.2) - 1);
                var left = (sectionWidth - chartWidth) / 2;
                var chart;
                var barAreas;

                if (initial) {
                    $modal.find(".groupbyChart").empty();

                    chart = d3.select("#profileModal .groupbyChart")
                        .attr("width", chartWidth)
                        .attr("height", chartHeight + 2)
                        .style("position", "relative")
                        .style("left", left + "px")
                        .style("overflow", "visible")
                    .append("g")
                        .attr("class", "barChart")
                        .attr("transform", "translate(" + marginLeft + ", 0)");

                    $(".chartTip").remove();
                } else if (resize) {
                    chart = d3.select("#profileModal .groupbyChart .barChart");

                    d3.select("#profileModal .groupbyChart")
                        .attr("width", chartWidth)
                        .attr("height", chartHeight + 2)
                        .style("left", left);

                    var time = options.resizeDelay || 0;
                    barAreas = chart.selectAll(".area");

                    barAreas.select(".bar")
                        .attr("y", function(d) { return y(d[yName]); })
                        .attr("height", function(d) {
                            return height - y(d[yName]);
                        })
                        .transition()
                        .duration(time)
                        .attr("x", function(d) { return x(d[xName]); })
                        .attr("width", xWidth);

                    barAreas.select(".bar-extra")
                        .attr("height", height)
                        .transition()
                        .duration(time)
                        .attr("x", function(d) { return x(d[xName]); })
                        .attr("width", xWidth);

                    barAreas.select(".bar-border")
                        .attr("height", height)
                        .transition()
                        .duration(time)
                        .attr("x", function(d) { return x(d[xName]); })
                        .attr("width", xWidth);

                    // label
                    barAreas.select(".xlabel")
                        .transition()
                        .duration(time)
                        .attr("x", function(d) {
                            return x(d[xName]) + xWidth / 2;
                        })
                        .attr("width", xWidth)
                        .text(getLabel);

                    // tick
                    barAreas.select(".tick")
                        .attr("y", chartHeight)
                        .transition()
                        .duration(time)
                        .attr("x", function(d) {
                            if (!noBucket && noSort) {
                                return x(d[xName]);
                            } else {
                                return x(d[xName]) + xWidth / 2;
                            }
                        })
                        .attr("width", xWidth)
                        .text(getXAxis);

                    if (!noBucket && noSort) {
                        barAreas.select(".tick.last")
                            .attr("y", chartHeight)
                            .transition()
                            .duration(time)
                            .attr("x", function(d) {
                                return x(d[xName]) + xWidth;
                            })
                            .attr("width", xWidth)
                            .text(getLastBucketTick);
                    }

                    return;
                }

                chart = d3.select("#profileModal .groupbyChart .barChart");
                // rect bars
                barAreas = chart.selectAll(".area").data(data);
                // update
                barAreas.attr("class", getTooltipAndClass)
                        .attr("data-rowNum", function(d) { return d.rowNum; });

                barAreas.select(".bar")
                        .transition()
                        .duration(150)
                        .attr("y", function(d) { return y(d[yName]); })
                        .attr("height", function(d) {
                            return height - y(d[yName]);
                        })
                        .attr("width", xWidth);

                barAreas.select(".xlabel")
                        .text(getLabel);

                barAreas.select(".tick")
                        .text(getXAxis);

                if (!noBucket && noSort) {
                    barAreas.select(".tick.last")
                        .text(getLastBucketTick);
                }
                // enter
                var newbars = barAreas.enter().append("g")
                            .attr("class", getTooltipAndClass)
                            .attr("data-rowNum", function(d) {
                                return d.rowNum;
                            });

                // gray area
                newbars.append("rect")
                    .attr("class", "bar-extra clickable")
                    .attr("x", function(d) { return x(d[xName]); })
                    .attr("y", 0)
                    .attr("height", height)
                    .attr("width", xWidth);

                // bar area
                newbars.append("rect")
                    .attr("class", function(d, i) {
                        if (i === 0 && d.type === "nullVal") {
                            return "bar bar-nullVal clickable";
                        }
                        return "bar clickable";
                    })
                    .attr("x", function(d) { return x(d[xName]); })
                    .attr("height", 0)
                    .attr("y", height)
                    .transition()
                    .delay(function(d, index) { return 25 * index; })
                    .duration(250)
                    .attr("y", function(d) { return y(d[yName]); })
                    .attr("height", function(d) {
                        return height - y(d[yName]);
                    })
                    .attr("width", xWidth);

                // for bar border
                newbars.append("rect")
                    .attr("class", "bar-border")
                    .attr("x", function(d) { return x(d[xName]); })
                    .attr("y", 0)
                    .attr("height", height)
                    .attr("width", xWidth);

                // label
                newbars.append("text")
                    .attr("class", "xlabel clickable")
                    .attr("width", xWidth)
                    .attr("x", function(d) { return x(d[xName]) + xWidth / 2; })
                    .attr("y", 11)
                    .text(getLabel);

                // xAxis
                newbars.append("text")
                    .attr("class", "tick")
                    .attr("width", xWidth)
                    .attr("x", function(d) {
                        if (!noBucket && noSort) {
                            return x(d[xName]);
                        } else {
                            return x(d[xName]) + xWidth / 2;
                        }
                    })
                    .attr("y", chartHeight)
                    .text(getXAxis);

                if (!noBucket && noSort) {
                    newbars.filter(function(d, i) { return i === dataLen - 1; })
                        .append("text")
                        .attr("class", "tick last")
                        .attr("width", xWidth)
                        .attr("x", function(d) { return x(d[xName]) + xWidth; })
                        .attr("y", chartHeight)
                        .text(getLastBucketTick);
                }

                // exit
                barAreas.exit().remove();

                function getLastBucketTick() {
                    var obj = {};
                    obj[xName] = data[dataLen - 1][xName] +
                                 Math.abs(bucketSize);
                    return getXAxis(obj);
                }

                function getXAxis(d) {
                    return self._getXAxis(d, charLenToFit);
                }

                function getLabel(d) {
                    return self._getLabel(d, charLenToFit);
                }

                function getTooltipAndClass(d) {
                    var ele = this;
                    return self._getTooltpAndClass(ele, d);
                }
            }
        });

        return BarChartBuilder;
    }(ChartBuilder));
    /* bar chart builder class */

    /* pie chart builder class */
    var PieChartBuilder = (function(_super) {
        function PieChartBuilder(options) {
            var self = _super.call(this, options);
            return self;
        }

        __extends(PieChartBuilder, _super, {
            // there should be a way to only only re-render the text/polylines
            // when a rezie happens, right now everything gets
            // re-rendered during resize
            build: function() {
                var self = this;
                var $modal = self._getModal();
                var $section = $modal.find(".groupbyInfoSection");
                var sectionWidth = $section.width();
                var sectionHeight = $section.height();
                var pieData = self._getPieData();
                var radius = (Math.min(sectionWidth, sectionHeight) / 2) * 0.9;

                // could change to only regenerate/color piechart if initial
                $modal.find(".groupbyChart").empty();

                var transform = "translate(" + (sectionWidth / 2) + "," +
                                Math.min(sectionWidth, sectionHeight) / 2 + ")";
                var chart = d3.select("#profileModal .groupbyChart")
                            .attr("width", sectionWidth)
                            .attr("height", sectionHeight)
                            .attr("style", "")
                            .append("g")
                                .attr("class", "pieChart")
                                .attr("transform", transform);

                self._addPathToChart(chart, pieData, radius);
                self._addTextToChart(chart, pieData, radius);
            },

            _getPieData: function() {
                var options = this._getOptions();
                var data = options.data;
                var total = options.sum;
                var yName = options.yName;
                var gbd = data.slice(); // make a deepCopy

                var sum = 0;
                for (var i = 0; i < gbd.length; i++) {
                    sum += gbd[i][yName];
                }

                var otherSum = total - sum;
                if (otherSum > 0) {
                    var other = {
                        "column2": "Other",
                        "section": "other"
                    };
                    other[yName] = otherSum;
                    gbd.push(other);
                }

                var pie = d3.layout.pie()
                            .sort(null)
                            .value(function(d) {
                                return d[yName];
                            });
                return pie(gbd);
            },

            // appends arcs to 'path' and colors them
            _addPathToChart: function(chart, pieData, radius) {
                var self = this;
                var arc = self._getArc(radius);
                var isFirstColor = true;
                var nextColor = 0;
                var path = chart.selectAll("path")
                    .data(pieData)
                    .enter()
                    .append("path")
                    .attr("d", arc)
                    .attr("class", function(d, i) {
                        var ele = this;
                        var className = self._getTooltpAndClass(ele, d.data);
                        className += " clickable ";
                        if (nextColor === 10) {
                            nextColor = 0;
                        }
                        if (pieData[i].data.type === "nullVal") {
                            return className + "nullVal";
                        } else if (i === pieData.length - 1 &&
                            pieData[i].data.section === "other")
                        {
                            return className + "other";
                        } else if (!isFirstColor && nextColor === 0) {
                            return className +
                                   self._getColorClass(nextColor += 2);
                        } else {
                            isFirstColor = false;
                            return className + self._getColorClass(++nextColor);
                        }
                    });

                return path;
            },

            // chooses which labels to display
            _addTextToChart: function(chart, pieData, radius) {
                var self = this;
                var maxLabels = self._getMaxLabels();

                var labelPositions = [];
                var usedPieData = [];

                var rightCount = 0;
                var leftCount = 0;

                pieData.forEach(function(d) {
                    if (d.startAngle <= Math.PI) {
                        rightCount++;
                    } else {
                        leftCount++;
                    }
                });

                if (rightCount > maxLabels) {
                    rightCount = maxLabels;
                }
                if (leftCount > maxLabels) {
                    leftCount = maxLabels;
                }
                var rightArcDiv = Math.PI / rightCount;
                var leftArcDiv = Math.PI / leftCount;
                var lastArc = pieData[0];

                var r = 0;
                var l = 0;
                for (var i = 0; i < pieData.length; i++) {
                    if (i > 0 &&
                        !self._roomForLabel(lastArc, rightArcDiv,
                                            leftArcDiv, pieData, i))
                    {
                        continue;
                    }
                    var currMid = self._midAngle(pieData[i]);
                    if ((currMid <= Math.PI && r < maxLabels) ||
                        (currMid > Math.PI && l < maxLabels)) {
                        var pos = self._addLabels(chart, pieData[i], radius);
                        labelPositions.push(pos);
                        if (pieData[i].startAngle <= Math.PI) {
                            r++;
                        } else {
                            l++;
                        }
                        lastArc = pieData[i];
                        usedPieData.push(pieData[i]);
                    }
                }

                var labelInfo = self._moveOverlappingLabels(labelPositions,
                                                            usedPieData);
                self._addLineToLabel(chart, labelInfo, radius);
            },

            _addLineToLabel: function(chart, labelInfo, radius) {
                var positions = labelInfo[0];
                var data = labelInfo[1];
                var arc = this._getArc(radius);
                var outerArc = this._getOuterArc(radius);
                this._addPolyLine(chart, positions, data, arc, outerArc);
                this._addCircle(chart, data, arc);
            },

            _addPolyLine: function(chart, positions, data, arc, outerArc) {
                // adds lines from pie chart to labels
                chart.selectAll("polyline")
                    .data(data)
                    .enter()
                    .append("polyline")
                    .attr("points", function(d, i) {
                        var arcCent = arc.centroid(d);
                        var outerArcCent = outerArc.centroid(d);
                        arcCent[0] *= 1.1;
                        arcCent[1] *= 1.1;
                        positions[i][1] += 3;
                        outerArcCent[1] = positions[i][1];
                        if (positions[i][0] > 0) {
                            positions[i][0] += 3;
                        } else {
                            positions[i][0] -= 3;
                        }

                        return [arcCent, outerArcCent, positions[i]];
                    });
            },

            _addCircle: function(chart, data, arc) {
                chart.selectAll("circle")
                    .data(data)
                    .enter()
                    .append("circle")
                    .attr("cx", function(d) {
                        var arcCent = arc.centroid(d);
                        return arcCent[0] *= 1.1;
                    })
                    .attr("cy", function(d) {
                        var arcCent = arc.centroid(d);
                        return arcCent[1] *= 1.1;
                    })
                    .attr("r", 2);
            },

            /*
                appends labels to 'g'
                groups the 'value' and 'frequency' together
            */
            _addLabels: function(chart, data, radius) {
                var self = this;
                var fontSize = 13;
                var charLenToFit = 18;

                var g = chart.append("g").classed("pieLabel", true);
                var labelPos;

                g.append("text")
                    .style("font-size", fontSize + "px")
                    .attr("class", "tick")
                    .attr("transform", function() {
                        var pos = self._getLabelPosition(data, radius,
                                                         fontSize, 1.7);
                        labelPos = pos;
                        return "translate(" + pos + ")";
                    })
                    .text(function() {
                        if (data.data.section === "other") {
                            return "Other";
                        }
                        return self._getXAxis(data.data, charLenToFit);
                    });

                g.append("text")
                    .style("font-size", (fontSize - 1) + "px")
                    .attr("class", "xlabel")
                    .attr("transform", function() {
                        var pos = self._getLabelPosition(data, radius,
                                                         fontSize, 1.5, true);
                        return "translate(" + pos + ")";
                    })
                    .text(function() {
                        return self._getLabel(data.data, charLenToFit);
                    });

                return labelPos;
            },

            /*
                decides if there is room for a label on an arc
                based on where the last label was placed
            */
            _roomForLabel: function(lastArc, rightArcDiv, leftArcDiv, pieData, i) {
                var currArc = pieData[i];
                var lastMid = this._midAngle(lastArc);
                var currMid = this._midAngle(currArc);

                if ((lastMid < Math.PI && currMid < Math.PI) ||
                    (lastMid >= Math.PI && currMid >= Math.PI)) {
                    var rightSpace = (lastMid + rightArcDiv);
                    var leftSpace = (lastMid + leftArcDiv);

                    if (currMid < Math.PI &&
                        i < pieData.length - 1 &&
                        currArc.endAngle < rightSpace) {
                        return false;
                    }
                    if (currMid >= Math.PI &&
                        i < pieData.length - 1 &&
                        currArc.endAngle < leftSpace) {
                        return false;
                    }
                }
                return true;
            },

            // moves labels that overlap
            _moveOverlappingLabels: function(labelPositions, usedPieData) {
                var $modal = this._getModal();
                var $section = $modal.find(".groupbyInfoSection");
                var $labels = $section.find(".pieLabel");

                var prevRect;
                var currRect;
                var prevPos;
                var currPos;
                var intersectionLength;
                var maxWidth = this._maxLabelWidth($labels) * 2;
                var i = 0;
                // method could be cleaner,
                // some code in 'labels.each' should be moved to separate functions
                $labels.each(function() {
                    var move;
                    currRect = this;
                    currPos = labelPositions[i];

                    if (currPos[0] > 0) {
                        move = [maxWidth, 0];
                        labelPositions[i][0] += maxWidth;
                        d3.select(this)
                            .attr("transform", "translate(" + move + ")")
                            .attr("text-anchor", "end");
                    } else if (currPos[0] < 0) {
                        move = [-1 * maxWidth, 0];
                        labelPositions[i][0] -= maxWidth;
                        d3.select(this)
                            .attr("transform", "translate(" + move + ")")
                            .attr("text-anchor", "start");
                    }
                    var groupByBox = $(".groupbyChart").get(0).getBoundingClientRect();
                    if (i > 0) {
                        prevPos = labelPositions[i - 1];
                        currRectXPos = d3.select(this).attr("transform");

                        // getting location of top and bottom of current and previous text labels
                        var prevBottom = prevRect.getBoundingClientRect().bottom;
                        var prevTop = prevRect.getBoundingClientRect().top;
                        var currBottom = currRect.getBoundingClientRect().bottom;
                        var currTop = currRect.getBoundingClientRect().top;

                        if (currPos[0] > 0 && prevPos[0] > 0 && prevBottom > currTop) {
                            intersectionLength = currTop - prevBottom;
                            currPos[1] -= intersectionLength;
                            move = [maxWidth, -1 * intersectionLength];
                            d3.select(this)
                                .attr("transform", "translate(" + move + ")");
                            // updates position value in array
                            labelPositions[i] = currPos;
                        } else if (currPos[0] < 0 && prevPos[0] < 0 && prevTop < currBottom) {
                            intersectionLength = currBottom - prevTop;
                            currPos[1] -= intersectionLength;
                            move = [-1 * maxWidth, -1 * intersectionLength];
                            d3.select(this)
                                .attr("transform", "translate(" + move + ")");
                            // updates position value in array
                            labelPositions[i] = currPos;
                        }
                    }
                    if (this.getBoundingClientRect().top < groupByBox.top) {
                        this.remove();
                        labelPositions.splice(i, 1);
                        usedPieData.splice(i, 1);
                    } else {
                        prevRect = this;
                        i++;
                    }
                });
                return [labelPositions, usedPieData];
            },

            _midAngle: function(d) {
                return d.startAngle + (d.endAngle - d.startAngle) / 2;
            },

            _getColorClass: function(num) {
                return "color-" + num;
            },

            _getArc: function(radius) {
                return d3.svg.arc()
                        .innerRadius(0)
                        .outerRadius(radius);
            },

            _getOuterArc: function(radius) {
                return d3.svg.arc()
                        .innerRadius(radius * 0.8)
                        .outerRadius(radius * 0.8);
            },

            // returns max number of labels that will fit
            _getMaxLabels: function() {
                var $modal = this._getModal();
                var height = $modal.find(".groupbyInfoSection").height();
                var fontSize = 13;
                return Math.floor(height / (fontSize * 3));
            },

            _getLabelPosition: function(data, radius, fontSize, zoom, padding) {
                var mid = this._midAngle(data);
                var outerArc = this._getOuterArc(radius);
                var pos = outerArc.centroid(data);
                pos[0] = radius * (mid < Math.PI ? 1 : -1);
                if (mid < Math.PI) {
                    pos[1] -= (fontSize * zoom);
                } else {
                    pos[1] -= fontSize * zoom;
                }

                if (padding) {
                    pos[1] += fontSize;
                }
                return pos;
            },

            _maxLabelWidth: function($labels) {
                var maxWidth = 0;
                $labels.each(function() {
                    var labelWidth = this.getBoundingClientRect().width;
                    maxWidth = Math.max(maxWidth, labelWidth);
                });
                return maxWidth;
            }

        });

        return PieChartBuilder;
    }(ChartBuilder));
    /* pie chart builder class */

    /* ProfileChart Api */
    ProfileChart.build = function(options) {
        options = options || {};
        var chartType = options.type;
        var chartBuilder;

        switch (chartType) {
            case "bar":
                chartBuilder = new BarChartBuilder(options);
                break;
            case "pie":
                chartBuilder = new PieChartBuilder(options);
                break;
            default:
                console.warn("unsupported chart!");
                return;
        }

        chartBuilder.build();
        return;
    };

    /* end of ProfileChart Api */

    return ProfileChart;
}({}, jQuery, d3));