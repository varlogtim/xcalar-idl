window.STATSManager = (function($, STATSManager, d3) {
    var $statsModal = $("#statsModal");
    var $modalBg    = $("#modalBackground");

    // constants
    var aggKeys = ["min", "average", "max", "count", "sum"];
    var aggMap = {
        "min"    : AggrOp.Min,
        "average": AggrOp.Avg,
        "max"    : AggrOp.Max,
        "count"  : AggrOp.Count,
        "sum"    : AggrOp.Sum
    };
    var sortMap = {
        "asc"   : "asc",
        "origin": "origin",
        "desc"  : "desc"
    };
    var tooltipOptions = {
        "trigger"  : "manual",
        "animation": false,
        "placement": "top",
        "container": "body",
        "html"     : true,
        "template" : '<div class="bartip tooltip" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"></div>' +
                     '</div>'
    };
    var statsColName = "statsGroupBy";
    var bucketColName = "bucketGroupBy";
    var numRowsToFetch = 20;

    var statsInfos = {};

    // data with initial value
    var resultSetId = null;
    var totalRows = null;
    var groupByData = [];
    var bucketNum = 0;
    var order = sortMap.origin;
    var statsCol = null;
    var percentageLabel = false;

    var minHeight = 440;
    var minWidth  = 750;
    var modalHelper = new xcHelper.Modal($statsModal, {
       "minHeight": minHeight,
       "minWidth" : minWidth
    });

    STATSManager.setup = function() {
        $statsModal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            containment: "document",
            resize     : function() {
                if (statsCol.groupByInfo &&
                    statsCol.groupByInfo.isComplete === true)
                {
                    buildGroupGraphs(null, true);
                }
            }
        });

        $statsModal.on("click", ".cancel, .close", function() {
            closeStats();
            SQL.add("Close Profile", {
                "operation": SQLOps.ProfileClose
            });
        });

        $statsModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

        // show tootip in barArea and do not let in blink in padding
        $statsModal.on("mouseover", ".barArea", function(event) {
            event.stopPropagation();
            resetTooltip();
            // XXX g tag can not use addClass, fix it if it's not true
            $(this).attr("class", $(this).attr("class") + " hover")
                    .tooltip("show");
        });

        // only trigger in padding area btw bars
        $statsModal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $statsModal.on("mouseover", resetTooltip);

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
            // XXX invalid it now, coming soon!
            return;
            sortData(sortMap.desc, statsCol);
        });

        // event on range section
        var $rangeSection = $statsModal.find(".rangeSection");
        var $rangeInput = $("#stats-step");
        $rangeSection.on("click", ".rangeBtn", function() {
            $rangeSection.toggleClass("range");
            if ($rangeSection.hasClass("range")) {
                bucketData($rangeInput.val(), statsCol);
            } else {
                bucketData(0, statsCol);
            }
        });

        $rangeSection.on("click", ".buttonSection .text", function() {
            if ($(this).hasClass("range")) {
                // go to rangle
                if ($rangeSection.hasClass("range")) {
                    return;
                }
                $rangeSection.addClass("range");
                bucketData($rangeInput.val(), statsCol);
            } else {
                // go to single
                if (!$rangeSection.hasClass("range")) {
                    return;
                }
                $rangeSection.removeClass("range");
                bucketData(0, statsCol);
            }
        });

        $rangeInput.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                var val = $rangeInput.val();
                var isValid = xcHelper.validate([
                    {
                        "$selector": $rangeInput,
                        "check"    : function() {
                            return (statsCol.type === "string");
                        },
                        "text": "Column type is string, cannot bucket into range."
                    },
                    {
                        "$selector": $rangeInput
                    },
                    {
                        "$selector": $rangeInput,
                        "check"    : function() {
                            return (Number(val) <= 0);
                        },
                        "text": "Cannot bucket into range less or equal to 0"
                    }
                ]);

                if (!isValid) {
                    return;
                }

                bucketData(val, statsCol);
            }
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
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
        var col   = table.tableCols[colNum - 1];

        if (!col.func.args) {
            console.error("No backend col name!");
            deferred.reject("No backend col name!");
            return (deferred.promise());
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
                    "isComplete": false,
                    "nullCount" : 0,
                    "buckets"   : {}
                }
            };
        }

        var curStatsCol = statsCol;
        generateStats(table)
        .then(function() {
            SQL.add("Profile", {
                "operation": SQLOps.Profile,
                "tableName": table.tableName,
                "tableId"  : tableId,
                "colNum"   : colNum,
                "colName"  : colName
            });

            deferred.resolve();
            commitToStorage();

        })
        .fail(function(error) {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function closeStats() {
        var fadeOutTime = gMinModeOn ? 0 : 300;
        $statsModal.hide();
        $modalBg.fadeOut(fadeOutTime);

        $statsModal.find(".groupbyChart").empty();
        modalHelper.clear();
        resetScrollBar();
        freePointer();

        totalRows = null;
        groupByData = [];
        bucketNum = 0;
        order = sortMap.origin;
        statsCol = null;
        percentageLabel = false;
        $statsModal.removeData("id");

        $statsModal.find(".min-range .text").off();
        $modalBg.off("mouseover.statsModal");
        // turn off scroll bar event
        $statsModal.find(".scrollBar").off();
        $(document).off(".statsModal");
        $("#stats-rowInput").off();

        $statsModal.find(".rangeSection").removeClass("range")
                    .find("input").val("");
    }

    function generateStats(table) {
        var deferred  = jQuery.Deferred();
        var type      = statsCol.type;
        var tableName = table.tableName;
        var promises  = [];
        var promise;

        // do aggreagte
        statsCol.aggInfo = statsCol.aggInfo || {};

        for (var i = 0, len = aggKeys.length; i < len; i++) {
            var aggkey = aggKeys[i];
            if (statsCol.aggInfo[aggkey] == null) {
                // should do aggreagte
                if (type === "integer" || type === "decimal") {
                    promise = runAgg(tableName, aggkey, statsCol);
                    promises.push(promise);
                } else {
                    statsCol.aggInfo[aggkey] = "N/A";
                }
            }
        }

        // do group by
        if (statsCol.groupByInfo.isComplete === true) {
            // check if the groupbyTable is not deleted
            // XXX use XcalarGetTables because XcalarSetAbsolute cannot
            // return fail if resultSetId is not free
            var innerDeferred = jQuery.Deferred();
            var groupbyTable = statsCol.groupByInfo.buckets[bucketNum].table;

            XcalarGetTables(groupbyTable)
            .then(function(tableInfo) {
                if (tableInfo == null || tableInfo.numNodes === 0) {
                    // XXX use XcalarSetFree will crash backend...
                    statsCol.groupByInfo.isComplete = false;
                    statsCol.groupByInfo.buckets[bucketNum] = {};

                    runGroupby(table, statsCol, bucketNum)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                } else {
                    innerDeferred.resolve();
                }

                showStats();
            })
            .fail(function(error) {
                console.error(error);
                innerDeferred.reject(error);
            });

            promises.push(innerDeferred.promise());
        } else if (statsCol.groupByInfo.isComplete !== "running") {
            promise = runGroupby(table, statsCol, bucketNum);
            promises.push(promise);
            showStats();
        } else {
            showStats();
        }

        xcHelper.when.apply(window, promises)
        .then(deferred.resolve)
        .fail(function() {
            var error;
            console.error(arguments);
            for (var t = 0; t < arguments.length; t++) {
                error = error || arguments[t];
            }
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function showStats() {
        modalHelper.setup();
        setupScrollBar();

        if (gMinModeOn) {
            $modalBg.show();
            $statsModal.show().data("id", statsCol.modalId);
            refreshStats();
        } else {
            $modalBg.fadeIn(300, function() {
                $statsModal.fadeIn(180)
                        .data("id", statsCol.modalId);
                refreshStats();
            });
        }

        // hide scroll bar first
        $statsModal.addClass("noScrollBar");
        $statsModal.find(".scrollSection").hide();
        $modalBg.on("mouseover.statsModal", resetTooltip);
    }

    // refresh stats
    function refreshStats(resetRefresh) {
        var deferred = jQuery.Deferred();

        var $aggInfoSection = $statsModal.find(".aggInfoSection");
        var $loadingSection = $statsModal.find(".loadingSection");
        var $loadHiddens    = $statsModal.find(".loadHidden");
        var $loadDisables   = $statsModal.find(".loadDisable");

        var instruction = "Profile of <b>" + statsCol.colName + ".</b><br>";

        // update agg info
        aggKeys.forEach(function(aggkey) {
            var aggVal = statsCol.aggInfo[aggkey];
            if (aggVal == null) {
                // when aggregate is still running
                $aggInfoSection.find("." + aggkey).html("...")
                                    .addClass("animatedEllipsis");
            } else {
                $aggInfoSection.find("." + aggkey)
                            .removeClass("animatedEllipsis")
                            .text(aggVal.toLocaleString());
            }
        });

        // update groupby info
        if (statsCol.groupByInfo.isComplete === true) {
            // data is ready
            groupByData = [];

            freePointer()
            .then(function() {
                var tableInfo = statsCol.groupByInfo.buckets[bucketNum];
                var table;

                if (order === sortMap.asc) {
                    table = tableInfo.ascTable;
                } else if (order === sortMap.desc) {
                    table = tableInfo.descTable;
                } else {
                    table = tableInfo.table;
                }
                return (getResultSet(table));
            })
            .then(function(resultSet) {
                resultSetId = resultSet.resultSetId;
                totalRows = resultSet.numEntries;

                return (fetchGroupbyData(0, numRowsToFetch));
            })
            .then(function() {
                $loadingSection.addClass("hidden");
                $loadHiddens.removeClass("hidden").removeClass("disabled");
                $loadDisables.removeClass("disabled");

                resetScrollBar();
                resetSortSection();

                groupByData = addNullValue(groupByData);
                buildGroupGraphs(true);
                highlightBar(1);
                deferred.resolve();
            })
            .fail(function(error) {
                failureHandler(statsCol, error);
                deferred.reject(error);
            });

            instruction += "Hover on the bar to see details. " +
                "Use scroll bar and input box to view more data.";
        } else {
            if (resetRefresh) {
                $loadHiddens.addClass("disabled");
            } else {
                $loadHiddens.addClass("hidden");
            }

            $loadDisables.addClass("disabled");
            $loadingSection.removeClass("hidden");

            // the data is loading, show loadingSection and hide groupby section
            instruction += "Please wait for the data preparation, " +
                            "you can close the modal and view it later.";
            deferred.resolve();
        }

        $statsModal.find(".modalInstruction .text").html(instruction);

        return (deferred.promise());
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
        var deferred  = jQuery.Deferred();
        var fieldName = curStatsCol.colName;
        var aggrOp    = aggMap[aggkey];
        var res;

        getAggResult(fieldName, tableName, aggrOp)
        .then(function(val) {
            res = val;
            deferred.resolve();
        })
        .fail(function(error) {
            // XXX aggreate and fail the profile
            // if this behavior is incorrect, change it
            res = "--";
            console.error(error);
            deferred.resolve();
        })
        .always(function() {
            curStatsCol.aggInfo[aggkey] = res;

            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                $statsModal.find(".aggInfoSection ." + aggkey)
                        .removeClass("animatedEllipsis")
                        .text(res.toLocaleString());
            }
        });

        return (deferred.promise());
    }

    function runGroupby(table, curStatsCol, curBucketNum) {
        var deferred  = jQuery.Deferred();
        if (curBucketNum !== 0) {
            consoel.error("Invalid bucket num");
            deferred.reject("Invalid bucket num");
            return (deferred.promise());
        }

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

        var sqlOptions = {
            "operation": SQLOps.ProfileAction,
            "action"   : "groupby",
            "tableName": tableName,
            "colName"  : colName
        };

        curStatsCol.groupByInfo.isComplete = "running";
        checkTableIndex(tableId, tableName, colName, keyName)
        .then(function(indexedTableName, nullCount) {
            curStatsCol.groupByInfo.nullCount = nullCount;

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
                                    isIncSample, sqlOptions));
        })
        .then(function() {
            var def1 = getAggResult(statsColName, groupbyTable, aggMap.max);
            var def2 = getAggResult(statsColName, groupbyTable, aggMap.sum);
            return (xcHelper.when(def1, def2));
        })
        .then(function(maxVal, sumVal) {
            curStatsCol.groupByInfo.buckets[curBucketNum] = {
                "max"    : maxVal,
                "sum"    : sumVal,
                "table"  : groupbyTable,
                "colName": colName
            };

            curStatsCol.groupByInfo.isComplete = true;

            if (tableToDelete != null) {
                // delete the indexed table if exist
                XcalarDeleteTable(tableToDelete, {
                    "operation": SQLOps.ProfileAction,
                    "action"   : "delete",
                    "tableName": tableToDelete
                });
            }

            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                return (refreshStats());
            }

        })
        .then(function() {
            var noNotification = true;
            StatusMessage.success(msgId, noNotification);
            deferred.resolve();
        })
        .fail(function(error) {
            StatusMessage.fail(StatusMessageTStr.StatisticsFailed, msgId);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function checkTableIndex(tableId, tableName, colName, keyName) {
        var deferred = jQuery.Deferred();

        getUnsortedTableName(tableName)
        .then(function(unsorted) {
            var innerDeferred = jQuery.Deferred();
            var parentIndexedWrongly = false;

            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XcalarMakeResultSetFromTable(unsorted)
                .then(function(resultSet) {
                    if (resultSet && resultSet.keyAttrHeader.name !== colName) {
                        parentIndexedWrongly = true;
                    }

                    innerDeferred.resolve(parentIndexedWrongly);
                })
                .fail(innerDeferred.reject);
            } else {
                // this is the unsorted table
                if (colName !== keyName) {
                    parentIndexedWrongly = true;
                }

                innerDeferred.resolve(parentIndexedWrongly);
            }

            return (innerDeferred.promise());
        })
        .then(function(parentIndexedWrongly) {
            if (!parentIndexedWrongly) {
                deferred.resolve(tableName, 0);
            } else {
                var newTableName = getNewName(tableName, ".stats.index", true);
                // lock the table when do index
                xcHelper.lockTable(tableId);

                var sqlOptions = {
                    "operation"   : SQLOps.ProfileAction,
                    "action"      : "index",
                    "tableName"   : tableName,
                    "tableId"     : tableId,
                    "colName"     : colName,
                    "newTableName": newTableName,
                    "sorted"      : false
                };

                XcalarIndexFromTable(tableName, colName, newTableName, false,
                                     sqlOptions)
                .then(function() {
                    // Aggregate count on origingal already remove the null value!
                    return (getAggResult(colName, tableName, aggMap.count));
                })
                .then(function(val) {
                    var nullCount = gTables[tableId].resultSetCount - val;
                    deferred.resolve(newTableName, nullCount);
                })
                .fail(deferred.reject)
                .always(function() {
                    xcHelper.unlockTable(tableId, false);
                });
            }
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function getAggResult(colName, tableName, aggrOp) {
        var deferred   = jQuery.Deferred();
        var sqlOptions = {
            "operation": SQLOps.ProfileAction,
            "action"   : "aggregate",
            "tableName": tableName,
            "colName"  : colName,
            "aggrOp"   : aggrOp
        };

        XcalarAggregate(colName, tableName, aggrOp, sqlOptions)
        .then(function(value) {
            var val;
            try {
                var obj = jQuery.parseJSON(value);
                val = obj.Value;

                deferred.resolve(val);
            } catch (error) {
                console.error(error, val);
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

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
                    value.rowNum = rowPosition + 1 + i;
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

    function addNullValue(data) {
        // add col info for null value
        var nullCount = statsCol.groupByInfo.nullCount || 0;

        if (nullCount === 0) {
            return (data);
        }

        var nullData = {
            "rowNum": 0
        };
        var colName = statsCol.groupByInfo.buckets[bucketNum].colName;
        nullData[colName] = "null";

        if (bucketNum === 0) {
            nullData[statsColName] = nullCount;
        } else {
            nullData[bucketColName] = nullCount;
        }

        nullData.type = "nullVal";
        data.unshift(nullData);

        return (data);
    }

    function buildGroupGraphs(initial, resize) {
        var nullCount = statsCol.groupByInfo.nullCount;
        var tableInfo = statsCol.groupByInfo.buckets[bucketNum];
        var noBucket  = (bucketNum === 0) ? 1 : 0;
        var noSort    = (order === sortMap.origin);

        var xName = tableInfo.colName;
        var yName = noBucket ? statsColName : bucketColName;

        var $section = $statsModal.find(".groubyInfoSection");
        var data = groupByData;
        var dataLen = data.length;

        var sectionWidth = $section.width();
        var marginBottom = 10;
        var marginLeft = 20;

        var maxRectW = Math.floor(sectionWidth / 706 * 70);
        var chartWidth  = Math.min(sectionWidth, maxRectW * data.length + marginLeft * 2);
        var chartHeight = $section.height();

        var height = chartHeight - marginBottom;
        var width  = chartWidth - marginLeft * 2;

        // x range and y range
        var x = d3.scale.ordinal()
                        .rangeRoundBands([0, width], .1, 0)
                        .domain(data.map(function(d) { return d[xName]; }));
        var y = d3.scale.linear()
                        .range([height, 0])
                        .domain([-(tableInfo.max * .02), tableInfo.max]);
        var xWidth = x.rangeBand();
        // 5.1 is the width of a char in .xlabel
        var charLenToFit = Math.floor(xWidth / 5.1);
        var left = (sectionWidth - chartWidth) / 2;
        var chart;
        var barAreas;

        if (initial) {
            $statsModal.find(".groupbyChart").empty();

            chart = d3.select("#statsModal .groupbyChart")
                .attr("width", chartWidth)
                .attr("height", chartHeight + 2)
                .style("position", "relative")
                .style("left", left)
            .append("g")
                .attr("class", "barChart")
                .attr("transform", "translate(" + marginLeft + ", 0)");

            $(".bartip").remove();
        } else if (resize) {
            chart = d3.select("#statsModal .groupbyChart .barChart");

            d3.select("#statsModal .groupbyChart")
                .attr("width", chartWidth)
                .attr("height", chartHeight + 2)
                .style("left", left);

            var time = 60;
            barAreas = chart.selectAll(".barArea");

            barAreas.select(".bar")
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) { return height - y(d[yName]); })
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
                .attr("x", function(d) { return x(d[xName]) + xWidth / 2; })
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
                    .attr("x", function(d) { return x(d[xName]) + xWidth; })
                    .attr("width", xWidth)
                    .text(getLastBucketTick);
            }

            return;
        }

        chart = d3.select("#statsModal .groupbyChart .barChart");
        // rect bars
        barAreas = chart.selectAll(".barArea").data(data);
        // update
        barAreas.attr("class", getTooltipAndClass)
                .attr("data-rowNum", function(d) { return d.rowNum; });

        barAreas.select(".bar")
                .transition()
                .duration(150)
                .attr("y", function(d) { return y(d[yName]); })
                .attr("height", function(d) { return height - y(d[yName]); })
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
                        .attr("data-rowNum", function(d) { return d.rowNum; });

        // gray area
        newbars.append("rect")
            .attr("class", "bar-extra")
            .attr("x", function(d) { return x(d[xName]); })
            .attr("y", 0)
            .attr("height", height)
            .attr("width", xWidth);

        // bar area
        newbars.append("rect")
            .attr("class", function(d, i) {
                if (i === 0 && d.type === "nullVal") {
                    return "bar bar-nullVal";
                }
                return "bar";
            })
            .attr("x", function(d) { return x(d[xName]); })
            .attr("height", 0)
            .attr("y", height)
            .transition()
            .delay(function(d, index) { return 25 * index; })
            .duration(250)
            .attr("y", function(d) { return y(d[yName]); })
            .attr("height", function(d) { return height - y(d[yName]); })
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
            .attr("class", "xlabel")
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
            newbars.filter(function(d, i){ return i === dataLen - 1; })
                .append("text")
                .attr("class", "tick last")
                .attr("width", xWidth)
                .attr("x", function(d) { return x(d[xName]) + xWidth; })
                .attr("y", chartHeight)
                .text(getLastBucketTick);
        }

        // exit
        barAreas.exit().remove();

        function getXAxis(d) {
            var name = d[xName].toLocaleString();
            if (!noBucket && !noSort) {
                var num2 = (d[xName] + tableInfo.bucketSize).toLocaleString();
                name = name + "-" + num2;
            }

            if (name.length > charLenToFit) {
                return (name.substring(0, charLenToFit) + "..");
            } else {
                return name;
            }
        }

        function getLastBucketTick() {
            var obj = {};
            obj[xName] = data[dataLen - 1][xName] +
                            tableInfo.bucketSize;
            return getXAxis(obj);
        }

        function getLabel(d) {
            var num = d[yName];

            if (percentageLabel && tableInfo.sum !== 0) {
                // show percentage
                num = (num / (tableInfo.sum + nullCount) * 100);

                var intLenth = String(Math.floor(num)).length;
                // charFit - integer part - dot - % - 1charPadding
                var fixLen = Math.max(1, charLenToFit - intLenth - 3);
                fixLen = Math.min(fixLen, 3);
                return (num.toFixed(fixLen) + "%");
            } else {
                num = d[yName].toLocaleString();
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

            if (noBucket) {
                title = xName + ": " + d[xName].toLocaleString() + "<br>";
            } else {
                title = statsCol.colName + ": [" + d[xName].toLocaleString() +
                        ", " + (d[xName] + tableInfo.bucketSize).toLocaleString()
                        + ")<br>";
            }

            if (percentageLabel && tableInfo.sum !== 0) {
                var num = d[yName] / (tableInfo.sum + nullCount) * 100;
                var per = num.toFixed(3);

                if (num < 0.001) {
                    // when the percentage is too small
                    per = num.toExponential(2) + "%";
                } else {
                    per += "%";
                }
                title += "Percentage: " + per;
            } else {
                title += "Frequency: " + d[yName].toLocaleString();
            }

            var options = $.extend({}, tooltipOptions, {
                "title": title
            });
            $(this).tooltip("destroy");
            $(this).tooltip(options);

            return "barArea";
        }
    }

    function resetScrollBar() {
        var $section = $statsModal.find(".scrollSection");
        if (totalRows <= numRowsToFetch) {

            if (gMinModeOn) {
                $section.hide();
            } else {
                $section.slideUp(100);
            }

            $statsModal.addClass("noScrollBar");
            return;
        }

        $statsModal.removeClass("noScrollBar");

        if (gMinModeOn) {
            $section.show();
        } else {
            $section.slideDown(100);
        }

        var $scrollerArea = $section.find(".rowScrollArea");
        
        var $maxRange = $section.find(".max-range");
        var $rowInput = $("#stats-rowInput").val(1).data("rowNum", 1);
        $statsModal.find(".scroller").css("transform", "");

        // set width of elements
        $maxRange.text(totalRows.toLocaleString());
        $rowInput.width($maxRange.width() + 5); // 5 is for input padding

        var extraWidth = $section.find(".rowInput").outerWidth() + 1;
        $scrollerArea.css("width", "calc(100% - " + extraWidth + "px)");
    }

    function setupScrollBar() {
        var $section = $statsModal.find(".scrollSection");
        var $scrollerArea = $section.find(".rowScrollArea");
        // move scroll bar event, setup it here since we need statsCol info
        var $scrollerBar = $scrollerArea.find(".scrollBar");
        var $scroller    = $scrollerArea.find(".scroller");
        var isDragging   = false;

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
        var $rowInput = $("#stats-rowInput");
        $rowInput.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var num = Number($input.val());

                if (!isNaN(num) && num >= 1 && num <= totalRows) {
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
            var isFromInput = false;

            if (rowNum != null) {
                isFromInput = true;
                rowPercent = (totalRows === 1) ?
                                            0 : (rowNum - 1) / (totalRows - 1);
            } else {
                rowNum = Math.ceil(rowPercent * (totalRows - 1)) + 1;
            }

            var tempRowNum = rowNum;

            if ($rowInput.data("rowNum") === rowNum) {
                // case of going to same row
                // put the row scoller in right place
                translate = getTranslate(rowPercent);
                $scroller.css("transform", "translate(" + translate + "%, 0)");
                return;
            }

            var rowsToFetch = totalRows - rowNum + 1;

            if (rowsToFetch < numRowsToFetch) {
                if (numRowsToFetch < totalRows) {
                    // when can fetch numRowsToFetch
                    rowNum = totalRows - numRowsToFetch + 1;
                    rowsToFetch = numRowsToFetch;
                } else {
                    // when can only fetch totalRows
                    rowNum = 1;
                    rowsToFetch = totalRows;
                }

                var oldTranslate = getTranslate(rowPercent);
                if (isFromInput) {
                    rowPercent = (totalRows === 1) ?
                                            0 : (rowNum - 1) / (totalRows - 1);

                    translate = getTranslate(rowPercent);
                    $scroller.addClass("scrolling")
                        .css("transform", "translate(" + oldTranslate + "%, 0)");

                    // use setTimout to have the animation
                    setTimeout(function() {
                        $scroller.removeClass("scrolling")
                            .css("transform", "translate(" + translate + "%, 0)");
                    }, 1);
                } else {
                    $scroller.css("transform", "translate(" + oldTranslate + "%, 0)");
                }
            } else {
                translate = getTranslate(rowPercent);
                $scroller.css("transform", "translate(" + translate + "%, 0)");

                rowsToFetch = numRowsToFetch;
            }

            $rowInput.val(tempRowNum).data("rowNum", tempRowNum);

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
                groupByData = addNullValue(groupByData);
                buildGroupGraphs();
                $loadingSection.addClass("hidden");
                clearTimeout(loadTimer);
                highlightBar(tempRowNum);
            })
            .fail(function(error) {
                failureHandler(statsCol, error);
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

        curStatsCol.groupByInfo.isComplete = "running";

        var refreshTimer = setTimeout(function() {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshStats(true);
            }
        }, 500);

        runSort(newOrder, curStatsCol)
        .then(function() {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            order = newOrder;
            curStatsCol.groupByInfo.isComplete = true;
            refreshStats(true);
            SQL.add("Profile Sort", {
                "operation": SQLOps.ProfileSort,
                "order"    : newOrder
            });
            commitToStorage();
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            curStatsCol.groupByInfo.isComplete = true;
            failureHandler(curStatsCol, error);
        });
    }

    function runSort(newOrder, curStatsCol) {
        var deferred = jQuery.Deferred();
        var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
        var tableName;
        var newTableName;
        var colName;

        if (newOrder === sortMap.asc) {
            if (tableInfo.ascTable != null) {
                deferred.resolve();
            } else {
                // get a sort table
                tableName = tableInfo.table;
                newTableName = getNewName(tableName, ".asc");
                colName = (bucketNum === 0) ? statsColName : bucketColName;

                var sqlOptions = {
                    "operation"   : SQLOps.ProfileAction,
                    "action"      : "sort",
                    "tableName"   : tableName,
                    "colName"     : colName,
                    "newTableName": newTableName,
                    "sorted"      : true
                };

                XcalarIndexFromTable(tableName, colName, newTableName,
                                        true, sqlOptions)
                .then(function() {
                    tableInfo.ascTable = newTableName;
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else if (newOrder === sortMap.desc) {
            if (tableInfo.descTable != null) {
                deferred.resolve();
            } else {
                // get a reverse sort table
            }
        } else {
            deferred.resolve();
        }

        return (deferred.promise());
    }

    function bucketData(newBucketNum, curStatsCol) {
        newBucketNum = Number(newBucketNum);

        if (curStatsCol.type === "string" ||
            isNaN(newBucketNum) ||
            newBucketNum < 0 ||
            newBucketNum === bucketNum)
        {
            return;
        }

        curStatsCol.groupByInfo.isComplete = "running";

        var refreshTimer = setTimeout(function() {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshStats(true);
            }
        }, 500);

        runBucketing(newBucketNum, curStatsCol)
        .then(function() {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            bucketNum = newBucketNum;
            order = sortMap.origin; // reset to normal order
            curStatsCol.groupByInfo.isComplete = true;

            refreshStats(true);
            SQL.add("Profile Sort", {
                "operation" : SQLOps.ProfileBucketing,
                "bucketSize": newBucketNum
            });
            commitToStorage();
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            curStatsCol.groupByInfo.isComplete = true;
            failureHandler(curStatsCol, error);
        });
    }

    function runBucketing(newBucketNum, curStatsCol) {
        var deferred = jQuery.Deferred();
        var buckets   = statsCol.groupByInfo.buckets;
        var curBucket = buckets[newBucketNum];

        if (curBucket != null && curBucket.table != null) {
            deferred.resolve();
            return (deferred.promise());
        }

        // bucket based on original groupby table
        var tableName = buckets[0].table;
        var mapTable  = getNewName(tableName, ".bucket");
        var indexTable;
        var groupbyTable;
        var tableToDelete;

        var colName = curStatsCol.colName;
        // escaping colName like votes.funny
        if (colName.indexOf('.') > -1) {
            colName = colName.replace(/\./g, "\\\.");
        }
        var mapCol = xcHelper.randName("bucketMap", 4);

        // example map(mult(floor(div(review_count, 10)), 10))
        var mapString = "mult(floor(div(" + colName + ", " + newBucketNum +
                        ")), " + newBucketNum + ")";

        var sqlOptions = {
            "operation"   : SQLOps.ProfileAction,
            "action"      : "map",
            "tableName"   : tableName,
            "newTableName": mapTable,
            "fieldName"   : mapCol,
            "mapString"   : mapString
        };

        XcalarMap(mapCol, mapString, tableName, mapTable, sqlOptions)
        .then(function() {
            tableToDelete = indexTable = getNewName(mapTable, ".index", true);
            sqlOptions = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "index",
                "tableName"   : mapTable,
                "colName"     : mapCol,
                "newTableName": indexTable,
                "sorted"      : false
            };

            return XcalarIndexFromTable(mapTable, mapCol, indexTable,
                                        false, sqlOptions);
        })
        .then(function() {
            var operator    = "Sum";
            var newColName  = bucketColName;
            var isIncSample = false;

            groupbyTable = getNewName(mapTable, ".groupby", true);
            sqlOptions = {
                "operation": SQLOps.ProfileAction,
                "action"   : "groupby",
                "tableName": groupbyTable,
                "colName"  : newColName
            };

            return (XcalarGroupBy(operator, newColName, statsColName,
                                    indexTable, groupbyTable,
                                    isIncSample, sqlOptions));
        })
        .then(function () {
            var def1 = getAggResult(bucketColName, groupbyTable, aggMap.max);
            var def2 = getAggResult(bucketColName, groupbyTable, aggMap.sum);
            return (xcHelper.when(def1, def2));
        })
        .then(function(maxVal, sumVal) {
            buckets[newBucketNum] = {
                "max"       : maxVal,
                "sum"       : sumVal,
                "table"     : groupbyTable,
                "colName"   : mapCol,
                "bucketSize": newBucketNum
            };

            curStatsCol.groupByInfo.isComplete = true;

            if (tableToDelete != null) {
                // delete the indexed table if exist
                XcalarDeleteTable(tableToDelete, {
                    "operation": SQLOps.ProfileAction,
                    "action"   : "delete",
                    "tableName": tableToDelete
                });
            }

            deferred.resolve();

        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function highlightBar(rowNum) {
        var $chart = $statsModal.find(".groubyInfoSection .groupbyChart .barChart");

        $chart.find(".barArea.highlight").removeClass("highlight");
        var $barArea = $chart.find(".barArea[data-rowNum=" + rowNum + "]");
        $barArea.attr("class", $barArea.attr("class") + " highlight");
    }

    function resetTooltip() {
        $(".barArea").tooltip("hide");
        $(".barArea.hover").attr("class", function(index, d) {
            return d.split(" hover").join("");
        });
    }

    function getNewName(tableName, affix, rand) {
        // XXX Should simplify it when gTables store short tName
        var name = xcHelper.getTableName(tableName);

        name = name + affix;

        if (rand) {
            name = xcHelper.randName(name);
        }

        name += Authentication.getHashId();

        return (name);
    }

    function isModalVisible(curStatsCol) {
        return ($statsModal.is(":visible") &&
                $statsModal.data("id") === curStatsCol.modalId);
    }

    function failureHandler(curStatsCol, error) {
        console.error("Profile Fails", error);
        if (isModalVisible(curStatsCol)) {
            // turn gMinModeOn so that hide modalBg in clostStats()
            // has no delay affect to Alert.error()
            gMinModeOn = true;
            closeStats();
            gMinModeOn = false;
            Alert.error("Profile Fails", error);
        }
    }

    return (STATSManager);
}(jQuery, {}, d3));
