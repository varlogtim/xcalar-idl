window.STATSManager = (function($, STATSManager) {
    var $statsModal = $("#statsModal");
    var $modalBg    = $("#modalBackground");

    // constants
    var aggKeys = ["min", "average", "max", "count", "sum"];
    var aggMap = {
        "min"    : "Min",
        "average": "Avg",
        "max"    : "Max",
        "count"  : "Count",
        "sum"    : "Sum"
    };
    var tooltipOptions = {
        "trigger"  : "hover",
        "placement": "top",
        "container": "body",
        "animation": false,
        "template" : '<div class="bartip tooltip" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"></div>' +
                     '</div>'
    };
    var statsColName = "statsGroupBy";
    var numRowsToFetch = 20;

    STATSManager.setup = function() {
        $statsModal.on("click", ".cancel, .close", function() {
            closeStats();
        });

        $statsModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });
    };

    STATSManager.run = function(tableNum, colNum) {
        var table = gTables[tableNum];
        var col   = table.tableCols[colNum - 1];

        if (!col.func.args) {
            console.error("No backend col name!");
            return;
        }

        var colName = col.func.args[0];
        table.statsCols = table.statsCols || {};

        var statsCol = table.statsCols[colName];

        if (statsCol != null) {
            showStats(statsCol);
        } else {
            table.statsCols[colName] = {
                "modalId"    : xcHelper.randName("stats"),
                "colName"    : colName,
                "type"       : col.type,
                "aggInfo"    : {},
                "groupByInfo": {
                    "data"      : [],
                    "isComplete": false
                }
            };
            generateStats(table.tableName, table.statsCols[colName],
                            table.keyName);
        }
    };

    function closeStats() {
        $modalBg.fadeOut(300);
        $statsModal.addClass("hidden").removeData("id");
        $statsModal.find(".min-range .text").off();
    }

    function showStats(statsCol) {
        centerPositionElement($statsModal);
        $modalBg.fadeIn(300);
        $statsModal.removeClass("hidden").data("id", statsCol.modalId);

        refreshStats(statsCol);
    }

    function generateStats(tableName, statsCol, keyName) {
        var type = statsCol.type;

        // do aggreagte
        if (type === "integer" || type === "decimal") {
            // should do aggreagte
            aggKeys.forEach(function(aggkey) {
                runAgg(tableName, statsCol, aggkey);
            });
        } else {
            var aggs = {};
            for (var i = 0, len = aggKeys.length; i < len; i++) {
                aggs[aggKeys[i]] = "N/A";
            }
            statsCol.aggInfo = aggs;
        }

        // do group by
        runGroupby(tableName, statsCol, keyName);

        showStats(statsCol);
    }

    // refresh stats
    function refreshStats(statsCol) {
        var $aggInfoSection = $statsModal.find(".aggInfoSection");
        var $loadingSection = $statsModal.find(".loadingSection");
        var $loadHiddens    = $statsModal.find(".loadHidden");
        var instruction;

        $loadHiddens.addClass("hidden");
        $loadingSection.removeClass("hidden");
        // update agg info
        aggKeys.forEach(function(aggkey) {
            var aggVal = statsCol.aggInfo[aggkey];
            if (aggVal == null) {
                // when XcalarAggregate is still running
                $aggInfoSection.find("." + aggkey).html("...")
                                    .addClass("animatedEllipsis");
            } else {
                $aggInfoSection.find("." + aggkey)
                            .removeClass("animatedEllipsis").text(aggVal);
            }
        });

        // update groupby info
        if (statsCol.groupByInfo.isComplete) {
            // data is ready
            statsCol.groupByInfo.data = [];
            fetchGroupbyData(statsCol.groupByInfo, 0, numRowsToFetch)
            .then(function() {
                $loadingSection.addClass("hidden");
                $loadHiddens.removeClass("hidden");
                buildGroupGraphs(statsCol, false, true);
            });

            instruction = "Hover on the bar to see details. " +
                "Use scroll bar and input box to view more data";
        } else {
            // the data is loading, show loadingSection and hide groupby section
            instruction = "Please wait for the data preparation, " +
                            "you can close the modal and view it later";
        }

        $statsModal.find(".modalInstruction .text").text(instruction);
    }

    function runAgg(tableName, statsCol, aggkey) {
        var fieldName = statsCol.colName;
        var opString  = aggMap[aggkey];

        XcalarAggregate(fieldName, tableName, opString)
        .done(function(value) {
            var val;
            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;

                statsCol.aggInfo[aggkey] = val;

                // modal is open and is for that column
                if (!$statsModal.hasClass("hidden") &&
                    $statsModal.data("id") === statsCol.modalId)
                {
                    $statsModal.find(".aggInfoSection ." + aggkey)
                            .removeClass("animatedEllipsis").text(val);
                }
            } catch (error) {
                console.error(error, obj);
                val = "";
            }
        });
    }

    function runGroupby(tableName, statsCol, keyName) {
        var groupbyTable;
        var colName = statsCol.colName;
        var tableToDelete;

        checkTableIndex(tableName, colName, keyName)
        .then(function(indexedTableName) {
            var operator    = "Count";
            var newColName  = statsColName;
            var isIncSample = false;

            if (indexedTableName !== tableName) {
                tableToDelete = indexedTableName;
            }

            // here user old table name to generate table name
            groupbyTable = xcHelper.randName(tableName + ".stats.groupby");


            return (XcalarGroupBy(operator, newColName, colName,
                                    indexedTableName, groupbyTable,
                                    isIncSample));
        })
        .then(function() {
            statsCol.groupByInfo.groupbyTable = groupbyTable;

            return (XcalarAggregate(statsColName, groupbyTable, aggMap.max));
        })
        .then(function(value) {
            var val;
            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;

                statsCol.groupByInfo.max = val;

                return (getResultSet(groupbyTable));
            } catch (error) {
                console.error(error, val);
                deferred.reject(error);
            }
        })
        .then(function(resultSet) {
            statsCol.groupByInfo.resultSetId = resultSet.resultSetId;
            statsCol.groupByInfo.numEntries = resultSet.numEntries;
            statsCol.groupByInfo.isComplete = true;
            refreshStats(statsCol);

            // XXX this can be removed if we do not want indexed table to be del
            if (tableToDelete != null) {
                // delete the indexed table if exist
                XcalarDeleteTable(tableToDelete);
            }
        })
        .fail(function(error) {
            console.error(error);
        });
    }

    function checkTableIndex(tableName, colName, keyName) {
        var deferred = jQuery.Deferred();
        if (colName === keyName) {
            deferred.resolve(tableName);
        } else {
            var newTableName = xcHelper.randName(tableName + ".stats.index");
            XcalarIndexFromTable(tableName, colName, newTableName)
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    function fetchGroupbyData(groupByInfo, rowPosition, rowsToFetch) {
        var deferred = jQuery.Deferred();
        var resultSetId = groupByInfo.resultSetId;

        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(function() {
            return (XcalarGetNextPage(resultSetId, rowsToFetch));
        })
        .then(function(tableOfEntries) {
            var kvPairs = tableOfEntries.kvPair;
            var numKvPairs = tableOfEntries.numKvPairs;
            var numStillNeeds = 0;

            if (numKvPairs < rowsToFetch) {
                if (rowPosition + numKvPairs >= groupByInfo.numEntries) {
                    numStillNeeds = 0;
                } else {
                    numStillNeeds = rowsToFetch - numKvPairs;
                }
            }

            var numRows = Math.min(rowsToFetch, numKvPairs);
            var value;

            for (var i = 0; i < numRows; i++) {
                try {
                    value = $.parseJSON(kvPairs[i].value);
                    groupByInfo.data.push(value);
                } catch (error) {
                    console.log(error, kvPairs[i].value);
                    deferred.reject(error);
                    return (null);
                }
            }

            if (numStillNeeds > 0) {
                var newPosition;
                if (numStillNeeds === rowsToFetch) {
                    // fetch 0 this time
                    newPosition = rowPosition + 1;
                    console.warn("cannot fetch position", rowPosition);
                } else {
                    newPosition = rowPosition + numRows;
                }

                return (fetchGroupbyData(groupByInfo, newPosition,
                                            numStillNeeds));
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function buildGroupGraphs(statsCol, notDrawScrollBar, initial) {
        var xName = statsCol.colName;
        var yName = statsColName;
        var groupByInfo = statsCol.groupByInfo;

        var $section = $statsModal.find(".groubyInfoSection");
        var data = groupByInfo.data;

        var chartWidth  = $section.width();
        var chartHeight = $section.height();

        var marginBottom = 10;
        var height = chartHeight - marginBottom;
        var width  = chartWidth;
        // x range and y range
        var x = d3.scale.ordinal()
                        .rangeRoundBands([0, width], .1)
                        .domain(data.map(function(d) { return d[xName]; }));
        var y = d3.scale.linear()
                        .range([height, 0])
                        .domain([-(groupByInfo.max * .02), groupByInfo.max]);

        var chart;
        if (initial) {
            $statsModal.find(".groupbyChart").empty();
            chart = d3.select("#statsModal .groupbyChart")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
            .append("g")
                .attr("class", "barChart")
                .attr("transform", "translate(0, 0)");
        } else {
            chart = d3.select("#statsModal .groupbyChart .barChart");
        }

        // rect bars
        var barAreas = chart.selectAll(".barArea").data(data);

        // update
        barAreas.attr("class", function(d) {
                    // a little weird method to setup tooltip
                    // may have better way
                    var title = xName + ": " + d[xName] + "\r\n" +
                                "Frequency: " + d[yName];
                    var options = $.extend({}, tooltipOptions, {
                        "title": title
                    });
                    $(this).tooltip("destroy");
                    $(this).tooltip(options);
                    return ("barArea");
                });

        barAreas.select(".bar")
                .transition()
                .duration(150)
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) { return height - y(d[yName]); });

        barAreas.select(".tick")
                .attr("width", x.rangeBand())
                .attr("x", function(d) {
                    return x(d[xName]) + x.rangeBand() / 2;
                })
                .text(function(d) {
                    var name =  d[xName];
                    if (name.length > 4) {
                        return (name.substring(0, 4) + "..");
                    } else {
                        return name;
                    }
                });

        // enter
        var newbars = barAreas
            .enter().append("g")
                .attr("class", function(d) {
                    // a little weird method to setup tooltip
                    // may have better way
                    var title = xName + ": " + d[xName] + "\r\n" +
                                "Frequency: " + d[yName];
                    var options = $.extend({}, tooltipOptions, {
                        "title": title
                    });
                    $(this).tooltip(options);
                    return ("barArea");
                });

        // gray area
        newbars.append("rect")
                .attr("class", "bar-extra")
                .attr("x", function(d) { return x(d[xName]); })
                .attr("y", 0)
                .attr("height", height)
                .attr("width", x.rangeBand());

        // bar area
        newbars.append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d[xName]); })
            .attr("y", function(d) { return y(d[yName]); })
            .attr("height", function(d) { return height - y(d[yName]); })
            .attr("width", x.rangeBand());

        // xAxis
        newbars.append("text")
            .attr("class", "tick")
            .attr("width", x.rangeBand())
            .attr("x", function(d) {
                return x(d[xName]) + x.rangeBand() / 2;
            })
            .attr("y", chartHeight)
            .text(function(d) {
                var name =  d[xName];
                if (name.length > 4) {
                    return (name.substring(0, 4) + "..");
                } else {
                    return name;
                }
            });

        barAreas.exit().remove();

        if (!notDrawScrollBar) {
            drawScrollBar(statsCol);
        }
    }

    function drawScrollBar(statsCol) {
        var $section = $statsModal.find(".scrollSection");
        $section.find(".scrollChart").empty();

        var $minRange = $section.find(".min-range");
        var $maxRange = $section.find(".max-range");
        var $input    = $minRange.find(".text").val(1).data("rowNum", 1);

        var totalNum = statsCol.groupByInfo.numEntries;

        $maxRange.text(totalNum.toLocaleString("en"));
        $minRange.width($maxRange.width() + 5); // 5 is for input padding

        var includeMargin = true;
        var width = $section.width() -
                        $minRange.outerWidth(includeMargin) -
                        $maxRange.outerWidth(includeMargin);
        var height = $section.height();
        var gHeight = height / 2;
        var barWidth = 10;

        var svg = d3.select("#statsModal .scrollSection .scrollChart")
                        .attr("width", width)
                        .attr("height", height);
        var chart = svg.append("g");

        chart.append("line")
                .attr("class", "scroll-bar")
                .attr("x1", 0)
                .attr("y1", gHeight)
                .attr("x2", width)
                .attr("y2", gHeight);

        var rect = chart.append("rect")
                .attr("class", "scroll-thumb")
                .attr("width", barWidth)
                .attr("height", 15)
                .attr("x", 0)
                .attr("y", 2);

        // move scroll bar event
        svg.on("click", function() {
            positionScrollBar(this);
            $input.data("rowNum", $input.val());
        });

        var timer;
        $input.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                var $e = $(this);
                var num = Number($e.val());

                if (!isNaN(num) && num >= 1 && num <= totalNum) {
                    clearTimeout(timer);
                    timer = setTimeout(function() {
                        positionScrollBar(null, num);
                        $e.data("rowNum", $e.val());
                    }, 100);
                } else {
                    $e.val($e.data("rowNum"));
                }
                $e.blur();
            }
        });

        function positionScrollBar(e, num) {
            var x;
            if (num != null) {
                x = (num - 1) / totalNum * width;
            } else {
                var m = d3.mouse(e);
                // make mouse at the middle of rect
                x = m[0] - barWidth / 2;
                if (x < 0) {
                    x = 0;
                } else if (x + barWidth > width) {
                    x = width - barWidth;
                }
            }

            if (rect.attr("x") === x) {
                return;
            }

            var rowPosition = Math.floor(x / width * totalNum);
            var rowNum   = rowPosition + 1;
            var rowsToFetch = totalNum - rowNum + 1;

            if (rowsToFetch < numRowsToFetch) {
                if (numRowsToFetch < totalNum) {
                    // when can fetch numRowsToFetch
                    rowNum = totalNum - numRowsToFetch + 1;
                    rowPosition = rowNum - 1;
                    rowsToFetch = numRowsToFetch;
                } else {
                    // when can only fetch totalNum
                    rowNum = 1;
                    rowPosition = 0;
                    rowsToFetch = totalNum;
                }
                var oldX = x;
                x = (rowNum - 1) / totalNum * width;
                rect.attr("x", oldX)
                    .transition()
                    .attr("x", x);
            } else {
                rect.transition()
                    .attr("x", x);
                rowsToFetch = numRowsToFetch;
            }

            $input.val(rowNum);

            statsCol.groupByInfo.data = [];
            // disable another fetching data event till this one done
            $section.addClass("disabled");

            var $loadingSection = $statsModal.find(".loadingSection");
            var loadTimer = setTimeout(function() {
                // if the loading time is long, show the waiting icon
                $loadingSection.removeClass("hidden");
            }, 500);

            fetchGroupbyData(statsCol.groupByInfo, rowPosition, rowsToFetch)
            .then(function() {
                var notDrawScrollBar = true;
                buildGroupGraphs(statsCol, notDrawScrollBar);
                $loadingSection.addClass("hidden");
                clearTimeout(loadTimer);
            })
            .fail(function(error) {
                console.error(error);
            })
            .always(function() {
                $section.removeClass("disabled");
            });
        }
    }

    return (STATSManager);
}(jQuery, {}));
