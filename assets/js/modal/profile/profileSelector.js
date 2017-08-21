window.ProfileSelector = (function(ProfileSelector, $) {
    var $modal;        // $("#profileModal");
    var filterDragging = false;
    var chartBuilder;
    var chartType;

    ProfileSelector.setup = function($modelEle) {
        $modal = $modelEle;
    };

    ProfileSelector.new = function(options) {
        options = options || {};
        chartBuilder = options.chartBuilder;
        chartType = options.type;
        createFilterSelection(options.x, options.y);
    };

    ProfileSelector.isOn = function() {
        return filterDragging;
    };

    ProfileSelector.off = function() {
        filterDragging = false;
    };

    ProfileSelector.clear = function() {
        toggleFilterOption(true);
        chartBuilder = null;
        chartType = null;
    };

    function getFilterOption() {
        return $("#profile-filterOption");
    }

    function createFilterSelection(startX, startY) {
        getFilterOption().fadeOut(200);
        $modal.addClass("drawing")
                .addClass("selecting");

        return new RectSelction(startX, startY, {
            "id": "profile-filterSelection",
            "$container": $("#profile-chart"),
            "onStart": function() { filterDragging = true; },
            "onDraw": drawFilterRect,
            "onEnd": endDrawFilterRect
        });
    }

    function drawFilterRect(bound, top, right, bottom, left) {
        var chart = getChart();
        var areasToSelect = getAreaToSelect(chartType, bound, top, right,
                                            bottom, left);
        chart.selectAll(".area").each(function(d, i) {
            var area = d3.select(this);
            area.classed("highlight", false);
            if (areasToSelect[i]) {
                area.classed("selecting", true);
            } else {
                area.classed("selecting", false);
            }
        });
    }

    function endDrawFilterRect() {
        $modal.removeClass("drawing").removeClass("selecting");
        var chart = getChart();
        var areaToSelect = chart.selectAll(".area.selecting");
        var areas = chart.selectAll(".area");
        if (areaToSelect.size() === 0) {
            areas.each(function() {
                d3.select(this)
                .classed("unselected", false)
                .classed("selected", false);
            });
        } else {
            areas.each(function() {
                var area = d3.select(this);
                if (area.classed("selecting")) {
                    area.classed("selecting", false)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else if (!area.classed("selected")) {
                    area.classed("unselected", true)
                        .classed("selected", false);
                }
            });
        }

        // allow click event to occur before setting filterdrag to false
        setTimeout(function() {
            filterDragging = false;
        }, 10);

        toggleFilterOption();
    }

    function toggleFilterOption(isHidden) {
        var $filterOption = getFilterOption();
        var chart = getChart();
        var bars = chart.selectAll(".area.selected");
        var barsSize = bars.size();

        if (barsSize === 0) {
            isHidden = true;
        } else if (barsSize === 1) {
            $filterOption.find(".filter .text").addClass("xc-hidden");
            $filterOption.find(".single").removeClass("xc-hidden");
        } else {
            $filterOption.find(".filter .text").addClass("xc-hidden");
            $filterOption.find(".plural").removeClass("xc-hidden");
        }

        if (isHidden) {
            bars.each(function() {
                d3.select(this)
                .classed("selected", false)
                .classed("unselected", false);
            });
            $filterOption.fadeOut(200);
        } else {
            var bound = $("#profile-chart").get(0).getBoundingClientRect();
            var barBound;
            bars.each(function(d, i) {
                if (i === barsSize - 1) {
                    barBound = this.getBoundingClientRect();
                }
            });

            var right = bound.right - barBound.right;
            var bottom = bound.bottom - barBound.bottom + 30;
            var w = $filterOption.width();

            if (w + 5 < right) {
                // when can move right,
                // move the option label as right as possible
                right -= (w + 5);
            }

            $filterOption.css({
                "right": right,
                "bottom": bottom
            }).show();
        }
    }

    function getAreaToSelect(type, bound, top, right, bottom, left) {
        switch (type) {
            case "bar":
                return getSelectedBars(bound, top, right, bottom, left);
            case "pie":
                return getSelectedArcs(bound, top, right, bottom, left);
            default:
                console.error("error case");
                return [];
        }
    }

    function getSelectedBars(bound, top, right, bottom, left) {
        var selectedBars = [];
        var chart = getChart();
        chart.selectAll(".area").each(function(d, i) {
            var barArea = this;
            var barBound = barArea.getBoundingClientRect();
            var barTop = barBound.top - bound.top;
            var barLeft = barBound.left - bound.left;
            var barRight = barBound.right - bound.left;
            var select;

            if (bottom < barTop || right < barLeft || left > barRight) {
                select = false;
            } else {
                select = true;
            }

            selectedBars[i] = select;
        });
        return selectedBars;
    }

    // main function for deciding which arcs are selected by the rectangle
    function getSelectedArcs(bound, top, right, bottom, left) {
        var pieData = chartBuilder.getPieData();
        var topLeftCorner = [left, top];
        var topRightCorner = [right, top];
        var bottomLeftCorner = [left, bottom];
        var bottomRightCorner = [right, bottom];
        var rectDimensions = [top, bottom, left, right];

        var corners = [topLeftCorner, topRightCorner,
                       bottomLeftCorner, bottomRightCorner];
        var circleCenter = getCenterOfCircle(bound);
        var intersectsWithRect = [];

        for (var i = 0; i < pieData.length; i++) {
            // initially set all indicies in array to false
            intersectsWithRect[i] = false;
            if (pieData[i].data.section === "other") {
                // XXX temp fix as "other" part's filter str is hard to built
                continue;
            }

            // checks if center of circle is selected
            if (left <= circleCenter[0] && right >= circleCenter[0] &&
                top <= circleCenter[1] && bottom >= circleCenter[1]) {
                intersectsWithRect[i] = true;
                continue;
            }
            var sectorPointsIntersect = checkSectorLines(rectDimensions,
                                                         pieData[i],
                                                         circleCenter);
            if (sectorPointsIntersect) {
                intersectsWithRect[i] = true;
                continue;
            }
            if (lineIsInArc(rectDimensions, circleCenter, pieData[i])) {
                intersectsWithRect[i] = true;
                continue;
            }
            for (var j = 0; j < corners.length; j++) {
                if (pointLiesInArc(corners[j], circleCenter, pieData[i])) {
                    intersectsWithRect[i] = true;
                    break;
                }
            }
        }
        return intersectsWithRect;
    }

    function getRadius() {
        return chartBuilder.getRadius();
    }

    // returns the quadrant of the pie that a point lies in
    function getCornerQuadrant(corner, circleCenter) {
        if (corner[0] > circleCenter[0] && corner[1] < circleCenter[1]) {
            return 1;
        } else if (corner[0] > circleCenter[0] && corner[1] > circleCenter[1]) {
            return 2;
        } else if (corner[0] < circleCenter[0] && corner[1] > circleCenter[1]) {
            return 3;
        }
        return 4;
    }

    // gets center of circle by calculating its position
    // relative to the 'graphBox'
    function getCenterOfCircle() {
        var profileChart = $("#profile-chart").get(0).getBoundingClientRect();
        var graphBox = $("#profileModal .groupbyChart").get(0).getBoundingClientRect();
        var circleBox = $(".groupbyInfoSection").get(0).getBoundingClientRect();
        var x = (circleBox.left - graphBox.left) + ((circleBox.right - circleBox.left) / 2);
        var y = ((graphBox.bottom + graphBox.top) / 2) - profileChart.top;

        return [x, y];
    }

    // checks if/where the side of the selection box intersects with the piechart
    function closestRectSideToCircle(rectDimensions, circleCenter) {
        var radius = getRadius();
        var topDistance = Math.abs(circleCenter[1] - rectDimensions[0]);
        var bottomDistance = Math.abs(circleCenter[1] - rectDimensions[1]);
        var leftDistance = Math.abs(circleCenter[0] - rectDimensions[2]);
        var rightDistance = Math.abs(circleCenter[0] - rectDimensions[3]);
        var cornerQuadrants = [getCornerQuadrant([rectDimensions[2], rectDimensions[0]], circleCenter),
                               getCornerQuadrant([rectDimensions[3], rectDimensions[0]], circleCenter),
                               getCornerQuadrant([rectDimensions[2], rectDimensions[1]], circleCenter),
                               getCornerQuadrant([rectDimensions[3], rectDimensions[1]], circleCenter)];

        if (rightDistance <= radius &&
            cornerQuadrants[1] === 4 &&
            cornerQuadrants[3] === 3)
        {
            return 3 * Math.PI / 2;
        } else if (leftDistance <= radius &&
                    cornerQuadrants[1] === 1 &&
                    cornerQuadrants[3] === 2)
        {
            return Math.PI / 2;
        } else if (topDistance <= radius &&
                    cornerQuadrants[0] === 3 &&
                    cornerQuadrants[1] === 2)
        {
            return Math.PI;
        } else if (bottomDistance <= radius &&
                    cornerQuadrants[2] === 4 &&
                    cornerQuadrants[3] === 1)
        {
            return 2 * Math.PI;
        }

        return -1;
    }

    // returns true if a side of the rectangle (a line) intersects with the arc
    function lineIsInArc(rectDimensions, circleCenter, currArc) {
        var closestRectSide = closestRectSideToCircle(rectDimensions, circleCenter);

        if (closestRectSide !== -1) {
            if (currArc["startAngle"] <= closestRectSide &&
                currArc["endAngle"] >= closestRectSide)
            {
                return true;
            }
        }

        return false;
    }

    // checks if a point (corner of selection box) lies in an arc
    function pointLiesInArc(corner, circleCenter, currArc) {
        var quadrant = getCornerQuadrant(corner, circleCenter);
        var xDistance = Math.abs(corner[0] - circleCenter[0]);
        var yDistance = Math.abs(corner[1] - circleCenter[1]);
        var distance = Math.sqrt(Math.pow(xDistance, 2) +
                       Math.pow(yDistance, 2));
        var radius = getRadius();
        var calcAngle;
        var actualAngle;

        if (quadrant === 4) {
            calcAngle = Math.abs(Math.atan(yDistance / xDistance));
            actualAngle = calcAngle + (3 * Math.PI / 2);
        } else if (quadrant === 3) {
            calcAngle = Math.abs(Math.atan(xDistance / yDistance));
            actualAngle = calcAngle + Math.PI;
        } else if (quadrant === 2) {
            calcAngle = Math.abs(Math.atan(yDistance / xDistance));
            actualAngle = calcAngle + (Math.PI / 2);
        } else {
            calcAngle = Math.abs(Math.atan(xDistance / yDistance));
            actualAngle = calcAngle;
        }
        if (distance <= radius && actualAngle >= currArc["startAngle"] &&
            actualAngle <= currArc["endAngle"])
        {
            return true;
        }

        return false;
    }

    // returns the quadrant the 'currArc' is in
    function getPointQuadrant(currArc) {
        if (currArc >= 3 * Math.PI / 2) {
            return 4;
        } else if (currArc >= Math.PI) {
            return 3;
        } else if (currArc >= Math.PI / 2) {
            return 2;
        } else {
            return 1;
        }
    }

    // sets a points location to be relative to the location of the circle on the page
    function accountForCircleCenter(point, currArc, circleCenter) {
        var quad = getPointQuadrant(currArc);

        if (quad === 1) {
            point[0] = Math.abs(circleCenter[0] + point[0]);
            point[1] = Math.abs(circleCenter[1] - point[1]);
        } else if (quad === 2) {
            point[0] += circleCenter[0];
            point[1] += circleCenter[1];
        } else if (quad === 3) {
            point[0] = Math.abs(circleCenter[0] - point[0]);
            point[1] = Math.abs(circleCenter[1] + point[1]);
        } else {
            point[0] = circleCenter[0] - point[0];
            point[1] = circleCenter[1] - point[1];
        }
        return point;
    }

    // checks if selection box intersects with sector lines
    function checkSectorLines(rectDimensions, currArc, circleCenter) {
        var radius = getRadius();
        var xPos1 = Math.abs(radius * Math.sin(currArc["startAngle"]));
        var yPos1 = Math.abs(radius * Math.cos(currArc["startAngle"]));
        var xPos2 = Math.abs(radius * Math.sin(currArc["endAngle"]));
        var yPos2 = Math.abs(radius * Math.cos(currArc["endAngle"]));
        var p1 = [xPos1, yPos1];
        var p2 = [xPos2, yPos2];

        p1 = accountForCircleCenter(p1, currArc["startAngle"], circleCenter);
        p2 = accountForCircleCenter(p2, currArc["endAngle"], circleCenter);
        if (checkAllLineIntersections(circleCenter, p1, p2, rectDimensions)) {
            return true;
        }
        return false;
    }

    // checks possible line intersections between sector lines and selection box lines
    function checkAllLineIntersections(circleCenter, p1, p2, rectDimensions) {
        var topLeft = [rectDimensions[2], rectDimensions[0]];
        var topRight = [rectDimensions[3], rectDimensions[0]];
        var bottomLeft = [rectDimensions[2], rectDimensions[1]];
        var bottomRight = [rectDimensions[3], rectDimensions[1]];

        var rectLines = [
            [topLeft, bottomLeft],
            [topLeft, topRight],
            [topRight, bottomRight],
            [bottomLeft, bottomRight]
        ];
        for (var i = 0; i < rectLines.length; i++) {
            if (lineSegmentsIntersect(circleCenter, p1, rectLines[i][0], rectLines[i][1]) ||
                lineSegmentsIntersect(circleCenter, p2, rectLines[i][0], rectLines[i][1])) {
                return true;
            }
        }
        return false;
    }

    // checks if two line segments intersect
    function lineSegmentsIntersect(p1, p2, p3, p4) {
        var xDifference1 = p2[0] - p1[0];
        var yDifference1 = p2[1] - p1[1];
        var xDifference2 = p4[0] - p3[0];
        var yDifference2 = p4[1] - p3[1];

        var s = (-yDifference1 * (p1[0] - p3[0]) + xDifference1 * (p1[1] - p3[1])) / (-xDifference2 * yDifference1 + xDifference1 * yDifference2);
        var t = (xDifference2 * (p1[1] - p3[1]) - yDifference2 * (p1[0] - p3[0])) / (-xDifference2 * yDifference1 + xDifference1 * yDifference2);

        return (s >= 0 && s <= 1 && t >= 0 && t <= 1);
    }

    function getChart() {
        return d3.select("#profile-chart .groupbyChart");
    }

    return ProfileSelector;
}({}, jQuery));