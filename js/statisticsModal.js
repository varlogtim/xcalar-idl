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
    var sortMap = {
        "asc"   : "asc",
        "origin": "origin",
        "desc"  : "desc"
    };
    var tooltipOptions = {
        "trigger"  : "manual",
        "placement": "top",
        "container": "body",
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

        // show tootip in barArea and do not let in blink in padding
        $statsModal.on("mouseover", ".barArea", function(event) {
            event.stopPropagation();
            $(".barArea").tooltip("hide")
                        .attr("class", "barArea");
            // XXX g tag can not use addClass, fix it if it's not true
            $(this).attr("class", "barArea hover")
                    .tooltip("show");
        });

        // only trigger in padding area btw bars
        $statsModal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $statsModal.on("mouseover", function() {
            $(".barArea").tooltip("hide")
                        .attr("class", "barArea");
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
            // check if the groupbyTable is not deleted
            // XXX use XcalarGetTables because XcalarSetAbsolute cannot
            // return fail if resultSetId is not free
            XcalarGetTables(statsCol.groupByInfo.groupbyTable)
            .then(function(tableInfo) {
                if (tableInfo == null || tableInfo.numTables === 0) {
                    // XXX use XcalarSetFree will crash backend...
                    // XcalarSetFree(statsCol.groupByInfo.resultSetId);
                    statsCol.groupByInfo = {
                        "data"      : [],
                        "isComplete": false,
                        "order"     : sortMap.origin
                    };

                    generateStats(table.tableName, table.statsCols[colName],
                            table.keyName);
                } else {
                    showStats(statsCol);
                }
            })
            .fail(function(error) {
                console.error(error);
            });
        } else {
            table.statsCols[colName] = {
                "modalId"    : xcHelper.randName("stats"),
                "colName"    : colName,
                "type"       : col.type,
                "aggInfo"    : {},
                "groupByInfo": {
                    "data"      : [],
                    "isComplete": false,
                    "order"     : sortMap.origin
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
        $modalBg.off("mouseover.statsModal");
        // turn off scroll bar event
        $statsModal.find(".scrollBar").off();
        $(document).off(".statsModal");
        $("#stats-rowInput").off();
        resetScrollBar();
        // turn off sort section event
        $statsModal.find(".sortSection").off();
    }

    function showStats(statsCol) {
        centerPositionElement($statsModal);
        $modalBg.fadeIn(300);
        $statsModal.removeClass("hidden").data("id", statsCol.modalId);

        $modalBg.on("mouseover.statsModal", function() {
            $(".barArea").tooltip("hide")
                        .attr("class", "barArea");
        });

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
    function refreshStats(statsCol, sortRefresh) {
        var $aggInfoSection = $statsModal.find(".aggInfoSection");
        var $loadingSection = $statsModal.find(".loadingSection");
        var $loadHiddens    = $statsModal.find(".loadHidden");
        var instruction;

        if (sortRefresh) {
            $loadHiddens.addClass("disabled");
        } else {
            $loadHiddens.addClass("hidden");
        }

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
                $loadHiddens.removeClass("hidden").removeClass("disabled");

                if (sortRefresh) {
                    resetScrollBar();
                } else {
                    setupScrollBar(statsCol);
                }
                setupSortSection(statsCol, sortRefresh);
                buildGroupGraphs(statsCol, true);
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
            statsCol.groupByInfo.groupbyTable = groupbyTable;
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
            // lock the table when do index
            xcHelper.lockTable(null, tableName);
            XcalarIndexFromTable(tableName, colName, newTableName)
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject)
            .always(function() {
                xcHelper.unlockTable(tableName, false);
            });
        }

        return (deferred.promise());
    }

    function fetchGroupbyData(groupByInfo, rowPosition, rowsToFetch) {
        var deferred = jQuery.Deferred();
        var resultSetId;
        var order = groupByInfo.order;

        if (order === sortMap.asc) {
            resultSetId = groupByInfo.ascId;
        } else if (order === sortMap.desc) {
            resultSetId = groupByInfo.descId;
        } else {
            resultSetId = groupByInfo.resultSetId;
        }

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
                    console.error(error, kvPairs[i].value);
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

    function buildGroupGraphs(statsCol, initial) {
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
                        .rangeRoundBands([0, width], .1, 0)
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
    }

    function resetScrollBar() {
        // reset scroller's position
        $("#stats-rowInput").val(1).data("rowNum", 1);
        $statsModal.find(".scroller").css("transform", "");
    }

    function setupScrollBar(statsCol) {
        var totalNum = statsCol.groupByInfo.numEntries;

        var $section = $statsModal.find(".scrollSection");
        var $scrollerArea = $section.find(".rowScrollArea");
        
        var $maxRange = $section.find(".max-range");
        var $rowInput = $("#stats-rowInput").val(1).data("rowNum", 1);

        // set width of elements
        $maxRange.text(totalNum.toLocaleString("en"));
        $rowInput.width($maxRange.width() + 5); // 5 is for input padding

        var width = $section.width() -
                    $section.find(".rowInput").outerWidth() - 1;
        $scrollerArea.outerWidth(width);

        // move scroll bar event, setup it here since we need statsCol info
        var $scrollerBar = $scrollerArea.find(".scrollBar");
        var $scroller = $scrollerArea.find(".scroller");
        var isDragging = false;

        // this use mousedown and mouseup to mimic click
        $scrollerBar.on("mousedown", function() {
            isDragging = true;
        });

        // mimic move of scroller
        $scrollerBar.on("mousedown", ".scroller", function(event) {
            event.stopPropagation();
            isDragging = true;
            $scroller.addClass("scrolling");
            $statsModal.addClass("dragging");
        });

        $(document).on({
            "mouseup.statsModal": function() {
                if (isDragging === true) {
                    $scroller.removeClass("scrolling");
                    var mouseX = event.pageX - $scrollerBar.offset().left;
                    var rowPercent = mouseX / $scrollerBar.width();

                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));
                    positionScrollBar(rowPercent);
                    $statsModal.removeClass("dragging");
                }
                isDragging = false;
            },
            "mousemove.statsModal": function(event) {
                if (isDragging) {
                    var mouseX = event.pageX - $scrollerBar.offset().left;
                    var rowPercent = mouseX / $scrollerBar.width();
                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));
                    var translate = getTranslate(rowPercent);
                    $scroller.css("transform", "translate(" + translate + "%, 0)");
                }
            }
        });

        var timer;
        $rowInput.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var num = Number($input.val());

                if (!isNaN(num) && num >= 1 && num <= totalNum) {
                    clearTimeout(timer);
                    timer = setTimeout(function() {
                        positionScrollBar(null, num);
                    }, 100);
                } else {
                    // when input is invalid
                    $input.val($input.data("rowNum"));
                }
                $input.blur();
            }
        });

        function positionScrollBar(rowPercent, rowNum) {
            var translate;

            if (rowNum != null) {
                rowPercent = (totalNum === 1) ?
                                            0 : (rowNum - 1) / (totalNum - 1);
            } else {
                rowNum = Math.ceil(rowPercent * (totalNum - 1)) + 1;
            }

            if ($rowInput.data("rowNum") === rowNum) {
                // go to same row
                return;
            }

            var rowsToFetch = totalNum - rowNum + 1;

            if (rowsToFetch < numRowsToFetch) {
                if (numRowsToFetch < totalNum) {
                    // when can fetch numRowsToFetch
                    rowNum = totalNum - numRowsToFetch + 1;
                    rowsToFetch = numRowsToFetch;
                } else {
                    // when can only fetch totalNum
                    rowNum = 1;
                    rowsToFetch = totalNum;
                }

                var oldTranslate = getTranslate(rowPercent);
                rowPercent = (totalNum === 1) ?
                                            0 : (rowNum - 1) / (totalNum - 1);

                translate = getTranslate(rowPercent);
                $scroller.addClass("scrolling")
                    .css("transform", "translate(" + oldTranslate + "%, 0)");

                // use setTimout to have the animation
                setTimeout(function() {
                    $scroller.removeClass("scrolling")
                        .css("transform", "translate(" + translate + "%, 0)");
                }, 1);
            } else {
                translate = getTranslate(rowPercent);
                $scroller.css("transform", "translate(" + translate + "%, 0)");

                rowsToFetch = numRowsToFetch;
            }

            $rowInput.val(rowNum).data("rowNum", rowNum);

            statsCol.groupByInfo.data = [];
            // disable another fetching data event till this one done
            $section.addClass("disabled");

            var $loadingSection = $statsModal.find(".loadingSection");
            var loadTimer = setTimeout(function() {
                // if the loading time is long, show the waiting icon
                $loadingSection.removeClass("hidden");
            }, 500);

            var rowPosition = rowNum - 1;
            fetchGroupbyData(statsCol.groupByInfo, rowPosition, rowsToFetch)
            .then(function() {
                buildGroupGraphs(statsCol);
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

        function getTranslate(percent) {
            return (Math.min(99.9, Math.max(0, percent * 100)));
        }
    }

    function setupSortSection(statsCol, sortRefresh) {
        var $section = $statsModal.find(".sortSection");

        $section.find(".active").removeClass("active")
                .end()
                .find("." + statsCol.groupByInfo.order + " .iconWrapper")
                    .addClass("active");

        if (!sortRefresh) {
            $section.on("click", ".asc .iconWrapper", function() {
                sortData(statsCol, sortMap.asc);
            });

            $section.on("click", ".origin .iconWrapper", function() {
                sortData(statsCol, sortMap.origin);
            });

            $section.on("click", ".desc .iconWrapper", function() {
                sortData(statsCol, sortMap.desc);
            });
        }
    }

    function sortData(statsCol, order) {
        if (statsCol.groupByInfo.order === order) {
            return;
        }

        statsCol.groupByInfo.isComplete = false;

        runSort(statsCol, order)
        .then(function() {
            statsCol.groupByInfo.order = order;
            statsCol.groupByInfo.isComplete = true;
            refreshStats(statsCol, true);
        })
        .fail(function(error) {
            statsCol.groupByInfo.isComplete = true;
            console.error(error);
        });
    }

    function runSort(statsCol, order) {
        var deferred = jQuery.Deferred();
        var groupByInfo = statsCol.groupByInfo;
        var tableName;
        var newTableName;

        if (order === sortMap.asc) {
            if (groupByInfo.ascId != null) {
                deferred.resolve();
            } else {
                // get a sort table
                tableName = groupByInfo.groupbyTable;
                newTableName = tableName + ".asc";

                XcalarIndexFromTable(tableName, statsColName, newTableName)
                .then(function() {
                    return (getResultSet(newTableName));
                })
                .then(function(resultSet) {
                    groupByInfo.ascTable = newTableName;
                    groupByInfo.ascId = resultSet.resultSetId;
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else if (order === sortMap.desc) {
            if (groupByInfo.descId != null) {
                deferred.resolve();
            } else {
                // get a reverse sort table
            }
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    return (STATSManager);
}(jQuery, {}));
