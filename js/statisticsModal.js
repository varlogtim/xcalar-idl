window.STATSManager = (function($, STATSManager, d3) {
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

    var statsInfos = {};

    // data with initial value
    var resultSetId = null;
    var totalRows = null;
    var groupByData = [];
    var order = sortMap.origin;
    var statsCol = null;
    var percentageLabel = false;

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

        $statsModal.on("click", ".bar-extra, .bar, .xlabel", function() {
            percentageLabel = !percentageLabel;
            buildGroupGraphs();
        });

        // event on sort section
        var $sortSection = $statsModal.find(".sortSection");

        $sortSection.on("click", ".asc .iconWrapper", function() {
            sortData(sortMap.asc, statsCol);
        });

        $sortSection.on("click", ".origin .iconWrapper", function() {
            sortData(sortMap.origin, statsCol);
        });

        $sortSection.on("click", ".desc .iconWrapper", function() {
            sortData(sortMap.desc, statsCol);
        });
    };

    STATSManager.getStatsCols = function() {
        return (statsInfos);
    };

    STATSManager.restore = function(oldInfos) {
        statsInfos = oldInfos;
    };

    STATSManager.copy = function(oldTableId, newTableId) {
        if (statsInfos[oldTableId] == null) {
            return;
        }

        // XXX it reference to the same statsInfo obj, fix me if
        // the shallow copy is wrong and should do a deep copy
        // (in that case modal id should change!)
        statsInfos[newTableId] = statsInfos[oldTableId];
    };

    STATSManager.run = function(tableId, colNum) {
        var table = xcHelper.getTableFromId(tableId);
        var col   = table.tableCols[colNum - 1];

        if (!col.func.args) {
            console.error("No backend col name!");
            return;
        }

        var colName = col.func.args[0];
        statsInfos[tableId] = statsInfos[tableId] || {};

        statsCol = statsInfos[tableId][colName];

        if (statsCol == null) {
            statsCol = statsInfos[tableId][colName] = {
                "modalId"    : xcHelper.randName("stats"),
                "colName"    : colName,
                "type"       : col.type,
                "aggInfo"    : {},
                "groupByInfo": {
                    "isComplete": false
                }
            };
        }

        generateStats(table);
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

        resultSetId = null;
        totalRows = null;
        groupByData = [];
        order = sortMap.origin;
        statsCol = null;
        percentageLabel = false;

        freePointer();
    }

    function generateStats(table) {
        var type = statsCol.type;
        var tableName = table.tableName;

        // do aggreagte
        statsCol.aggInfo = statsCol.aggInfo || {};

        for (var i = 0, len = aggKeys.length; i < len; i++) {
            var aggkey = aggKeys[i];
            if (statsCol.aggInfo[aggkey] == null) {
                // should do aggreagte
                if (type === "integer" || type === "decimal") {
                    runAgg(tableName, aggkey, statsCol);
                } else {
                    statsCol.aggInfo[aggkey] = "N/A";
                }
            }
        }

        // do group by
        if (statsCol.groupByInfo.isComplete) {
            // check if the groupbyTable is not deleted
            // XXX use XcalarGetTables because XcalarSetAbsolute cannot
            // return fail if resultSetId is not free
            XcalarGetTables(statsCol.groupByInfo.groupbyTable)
            .then(function(tableInfo) {
                if (tableInfo == null || tableInfo.numTables === 0) {
                    // XXX use XcalarSetFree will crash backend...
                    statsCol.groupByInfo = {
                        "isComplete": false
                    };

                    runGroupby(table, statsCol);
                }

                showStats();
            })
            .fail(function(error) {
                console.error(error);
            });
        } else {
            runGroupby(table, statsCol);
            showStats();
        }
    }

    function showStats() {
        centerPositionElement($statsModal);
        $modalBg.fadeIn(300);
        $statsModal.removeClass("hidden").data("id", statsCol.modalId);

        $modalBg.on("mouseover.statsModal", function() {
            $(".barArea").tooltip("hide")
                        .attr("class", "barArea");
        });

        refreshStats();
    }

    // refresh stats
    function refreshStats(sortRefresh) {
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

        var groupByInfo = statsCol.groupByInfo;
        // update groupby info
        if (groupByInfo.isComplete) {
            // data is ready
            groupByData = [];

            freePointer()
            .then(function() {
                var table;

                if (order === sortMap.asc) {
                    table = groupByInfo.ascTable;
                } else if (order === sortMap.desc) {
                    table = groupByInfo.descTable;
                } else {
                    table = groupByInfo.groupbyTable;
                }
                return getResultSet(table);
            })
            .then(function(resultSet) {
                resultSetId = resultSet.resultSetId;
                totalRows = resultSet.numEntries;

                return (fetchGroupbyData(0, numRowsToFetch));
            })
            .then(function() {
                $loadingSection.addClass("hidden");
                $loadHiddens.removeClass("hidden").removeClass("disabled");

                if (sortRefresh) {
                    resetScrollBar();
                } else {
                    setupScrollBar();
                }
                resetSortSection();
                buildGroupGraphs(true);
            })
            .fail(function(error) {
                closeStats();
                Alert.error("Stats Analysis Fails", error);
                console.error(error);
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

    function freePointer() {
        var deferred = jQuery.Deferred();

        if (resultSetId == null) {
            deferred.resolve();
        } else {
            XcalarSetFree(resultSetId)
            .then(function() {
                resultSetId = null;
                deferred.resolve();
            })
            .fail(deferred.reject);
        }

        return (deferred.promise());
    }

    function runAgg(tableName, aggkey, curStatsCol) {
        // pass in statsCol beacuse close modal may clear the global statsCol
        var fieldName = curStatsCol.colName;
        var opString  = aggMap[aggkey];

        XcalarAggregate(fieldName, tableName, opString)
        .then(function(value) {
            var val;
            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;

                curStatsCol.aggInfo[aggkey] = val;

                // modal is open and is for that column
                if (!$statsModal.hasClass("hidden") &&
                    $statsModal.data("id") === curStatsCol.modalId)
                {
                    $statsModal.find(".aggInfoSection ." + aggkey)
                            .removeClass("animatedEllipsis").text(val);
                }
            } catch (error) {
                console.error(error, obj);
                val = "";
            }
        })
        .fail(function(error) {
            closeStats();
            Alert.error("Stats Analysis Fails", error);
            console.error(error);
        });
    }

    function runGroupby(table, curStatsCol) {
        var tableName = table.tableName;
        var keyName   = table.keyName;
        var tableId   = table.tableId;

        var groupbyTable;
        var colName = curStatsCol.colName;
        var tableToDelete;
        var msg = StatusMessageTStr.Statistics + ' for ' + colName;
        var msgObj = {
            "msg"      : msg,
            "operation": "Statistical analysis"
        };
        var msgId = StatusMessage.addMsg(msgObj);

        checkTableIndex(tableId, tableName, colName, keyName)
        .then(function(indexedTableName) {
            var operator    = "Count";
            var newColName  = statsColName;
            var isIncSample = false;

            if (indexedTableName !== tableName) {
                tableToDelete = indexedTableName;
            }

            // here user old table name to generate table name
            groupbyTable = getNewName(tableName, ".stats.groupby", true);


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

                curStatsCol.groupByInfo.max = val;
                return (XcalarAggregate(statsColName, groupbyTable,
                        aggMap.sum));
            } catch (error) {
                console.error(error, val);
                return (jQuery.Deferred().reject(error));
            }
        })
        .then(function(value) {
            var val;
            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;

                curStatsCol.groupByInfo.sum = val;
            } catch (error) {
                console.error(error, val);
                return (jQuery.Deferred().reject(error));
            }

            curStatsCol.groupByInfo.groupbyTable = groupbyTable;
            curStatsCol.groupByInfo.isComplete = true;

            // modal is open and is for that column
            if (!$statsModal.hasClass("hidden") &&
                $statsModal.data("id") === curStatsCol.modalId)
            {
                refreshStats();
            }

            // XXX this can be removed if we do not want indexed table to be del
            if (tableToDelete != null) {
                // delete the indexed table if exist
                XcalarDeleteTable(tableToDelete);
            }
            var noNotification = true;
            StatusMessage.success(msgId, noNotification);
            commitToStorage();
        })
        .fail(function(error) {
            closeStats();
            Alert.error("Stats Analysis Fails", error);
            StatusMessage.fail(StatusMessageTStr.StatisticsFailed, msgId);
            console.error(error);
        });
    }

    function checkTableIndex(tableId, tableName, colName, keyName) {
        var deferred = jQuery.Deferred();
        if (colName === keyName) {
            deferred.resolve(tableName);
        } else {
            var newTableName = getNewName(tableName, ".stats.index", true);
            // lock the table when do index
            xcHelper.lockTable(tableId);
            XcalarIndexFromTable(tableName, colName, newTableName)
            .then(function() {
                deferred.resolve(newTableName);
            })
            .fail(deferred.reject)
            .always(function() {
                xcHelper.unlockTable(tableId, false);
            });
        }

        return (deferred.promise());
    }

    function fetchGroupbyData(rowPosition, rowsToFetch) {
        var deferred = jQuery.Deferred();

        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(function() {
            return (XcalarGetNextPage(resultSetId, rowsToFetch));
        })
        .then(function(tableOfEntries) {
            var kvPairs = tableOfEntries.kvPair;
            var numKvPairs = tableOfEntries.numKvPairs;
            var numStillNeeds = 0;

            if (numKvPairs < rowsToFetch) {
                if (rowPosition + numKvPairs >= totalRows) {
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
                    groupByData.push(value);
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

                return (fetchGroupbyData(newPosition, numStillNeeds));
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function buildGroupGraphs(initial) {
        var xName = statsCol.colName;
        var yName = statsColName;
        var groupByInfo = statsCol.groupByInfo;

        var $section = $statsModal.find(".groubyInfoSection");
        var data = groupByData;
        var maxRectW = 70;

        var sectionWidth = $section.width();
        var chartWidth   = Math.min(sectionWidth, maxRectW * data.length);
        var chartHeight  = $section.height();

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
        var xWidth = x.rangeBand();
        // 5.1 is the width of a char in .xlabel
        var charLenToFit = Math.floor(xWidth / 5.1);

        var chart;
        if (initial) {
            $statsModal.find(".groupbyChart").empty();

            var left = (sectionWidth - chartWidth) / 2;
            chart = d3.select("#statsModal .groupbyChart")
                .attr("width", chartWidth)
                .attr("height", chartHeight)
                .attr("style", "position:relative; left:" + left + "px;")
            .append("g")
                .attr("class", "barChart")
                .attr("transform", "translate(0, 0)");
        } else {
            chart = d3.select("#statsModal .groupbyChart .barChart");
        }


        // rect bars
        var barAreas = chart.selectAll(".barArea").data(data);

        // update
        barAreas.attr("class", getTooltipAndClass);

        barAreas.select(".bar")
                .transition()
                .duration(150)
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) { return height - y(d[yName]); });

        barAreas.select(".tick")
                .text(getXAxis);

        barAreas.select(".xlabel")
                .text(getLabel);

        // enter
        var newbars = barAreas.enter().append("g")
                        .attr("class", getTooltipAndClass);

        // gray area
        newbars.append("rect")
            .attr("class", "bar-extra")
            .attr("x", function(d) { return x(d[xName]); })
            .attr("y", 0)
            .attr("height", height)
            .attr("width", xWidth);

        // bar area
        newbars.append("rect")
            .attr("class", "bar")
            .attr("x", function(d) { return x(d[xName]); })
            .attr("y", function(d) { return y(d[yName]); })
            .attr("height", function(d) { return height - y(d[yName]); })
            .attr("width", xWidth);

        // xAxis
        newbars.append("text")
            .attr("class", "tick")
            .attr("width", xWidth)
            .attr("x", function(d) { return x(d[xName]) + xWidth / 2; })
            .attr("y", chartHeight)
            .text(getXAxis);

        // label
        newbars.append("text")
            .attr("class", "xlabel")
            .attr("width", xWidth)
            .attr("x", function(d) { return x(d[xName]) + xWidth / 2; })
            .attr("y", 11)
            .text(getLabel);

        // exit
        barAreas.exit().remove();

        function getXAxis(d) {
            var name = d[xName];
            if (name.length > 4) {
                return (name.substring(0, 4) + "..");
            } else {
                return name;
            }
        }

        function getLabel(d) {
            var num = d[yName];

            if (percentageLabel && groupByInfo.sum !== 0) {
                // show percentage
                num = (num / groupByInfo.sum * 100).toFixed(1) + "%";
                return (num);
            } else {
                num = d[yName].toLocaleString("en");
                if (num.length > charLenToFit) {
                    return (num.substring(0, charLenToFit) + "..");
                } else {
                    return num;
                }
            }
        }

        function getTooltipAndClass(d) {
            // a little weird method to setup tooltip
            // may have better way
            var title;

            if (percentageLabel && groupByInfo.sum !== 0) {
                var num = d[yName] / groupByInfo.sum * 100;
                var per = num.toFixed(2);

                if (per === "0.00") {
                    // when the percentage is too small
                    per = num.toExponential(2) + "%";
                } else {
                    per += "%";
                }
                title = xName + ": " + d[xName] + "\r\n" +
                        "Percentage: " + per;
            } else {
                title = xName + ": " + d[xName] + "\r\n" +
                    "Frequency: " + d[yName].toLocaleString("en");
            }

            var options = $.extend({}, tooltipOptions, {
                "title": title
            });
            $(this).tooltip("destroy");
            $(this).tooltip(options);
            return ("barArea");
        }
    }

    function resetScrollBar() {
        // reset scroller's position
        $("#stats-rowInput").val(1).data("rowNum", 1);
        $statsModal.find(".scroller").css("transform", "");
    }

    function setupScrollBar() {
        var totalNum = totalRows;

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

            // disable another fetching data event till this one done
            $section.addClass("disabled");

            var $loadingSection = $statsModal.find(".loadingSection");
            var loadTimer = setTimeout(function() {
                // if the loading time is long, show the waiting icon
                $loadingSection.removeClass("hidden");
            }, 500);

            var rowPosition = rowNum - 1;
            groupByData = [];

            fetchGroupbyData(rowPosition, rowsToFetch)
            .then(function() {
                buildGroupGraphs();
                $loadingSection.addClass("hidden");
                clearTimeout(loadTimer);
            })
            .fail(function(error) {
                closeStats();
                Alert.error("Stats Analysis Fails", error);
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

    function resetSortSection() {
        $statsModal.find(".sortSection").find(".active").removeClass("active")
                    .end()
                    .find("." + order + " .iconWrapper").addClass("active");
    }

    function sortData(newOrder, curStatsCol) {
        if (order === newOrder) {
            return;
        }

        statsCol.groupByInfo.isComplete = false;

        runSort(newOrder)
        .then(function() {
            order = newOrder;
            curStatsCol.groupByInfo.isComplete = true;
            refreshStats(true);
        })
        .fail(function(error) {
            curStatsCol.groupByInfo.isComplete = true;
            closeStats();
            Alert.error("Stats Analysis Fails", error);
            console.error(error);
        });
    }

    function runSort(newOrder) {
        var deferred = jQuery.Deferred();
        var groupByInfo = statsCol.groupByInfo;
        var tableName;
        var newTableName;

        if (newOrder === sortMap.asc) {
            if (groupByInfo.ascTable != null) {
                deferred.resolve();
            } else {
                // get a sort table
                tableName = groupByInfo.groupbyTable;
                newTableName = getNewName(tableName, ".asc");

                XcalarIndexFromTable(tableName, statsColName, newTableName)
                .then(function() {
                    groupByInfo.ascTable = newTableName;
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else if (newOrder === sortMap.desc) {
            if (groupByInfo.descTable != null) {
                deferred.resolve();
            } else {
                // get a reverse sort table
            }
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function getNewName(tableName, affix, rand) {
        // XXX Should simplify it when gTables store short tName
        var name = xcHelper.getTableName(tableName);

        name = name + affix;

        if (rand) {
            name = xcHelper.randName(name);
        }

        name += Authentication.fetchHashTag();

        return (name);
    }

    return (STATSManager);
}(jQuery, {}, d3));
