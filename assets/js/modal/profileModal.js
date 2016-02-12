window.Profile = (function($, Profile, d3) {
    var $modal   = $("#profileModal");
    var $modalBg = $("#modalBackground");

    var $rangeSection = $modal.find(".rangeSection");
    var $rangeInput = $("#stats-step");

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
    var curTableId = null;
    var curColNum = null;
    var resultSetId = null;
    var totalRows = null;
    var groupByData = [];
    var bucketNum = 0;
    var order = sortMap.origin;
    var statsCol = null;
    var percentageLabel = false;

    var minHeight = 415;
    var minWidth  = 750;
    var modalHelper = new xcHelper.Modal($modal, {
       "minHeight": minHeight,
       "minWidth" : minWidth
    });

    Profile.setup = function() {
        $modal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document",
            "resize"     : function() {
                if (statsCol.groupByInfo &&
                    statsCol.groupByInfo.isComplete === true)
                {
                    buildGroupGraphs(null, true);
                }
            }
        });

        $modal.on("click", ".cancel, .close", function() {
            closeProfileModal();
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

        // show tootip in barArea and do not let in blink in padding
        $modal.on("mouseover", ".barArea", function(event) {
            event.stopPropagation();
            resetTooltip();
            // XXX FIXME g tag can not use addClass, fix it if it's not true
            $(this).attr("class", $(this).attr("class") + " hover")
                    .tooltip("show");
        });

        // only trigger in padding area btw bars
        $modal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $modal.on("mouseover", resetTooltip);

        $modal.on("click", ".bar-extra, .bar, .xlabel", function() {
            percentageLabel = !percentageLabel;
            buildGroupGraphs();
            highlightBar();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        // event on sort section
        var $sortSection = $modal.find(".sortSection");

        $sortSection.on("click", ".asc .clickable", function() {
            sortData(sortMap.asc, statsCol);
        });

        $sortSection.on("click", ".origin .clickable", function() {
            sortData(sortMap.origin, statsCol);
        });

        $sortSection.on("click", ".desc .clickable", function() {
            sortData(sortMap.desc, statsCol);
        });

        // event on range section
        $rangeSection.on("click", ".rangeBtn", function() {
            toggleRange();
        });

        $rangeSection.on("click", ".buttonSection .text", function() {
            var $span = $(this);
            if ($span.hasClass("range")) {
                // go to range
                toggleRange(true);
            } else {
                // go to single
                toggleRange(false);
            }
        });

        $rangeSection.on("click", ".inputSection .text, .inputSection input", function() {
            if ($rangeInput.hasClass("disabled")) {
                return;
            }

            toggleRange(true);
        });

        $rangeInput.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                var val = $rangeInput.val();
                var isValid = xcHelper.validate([
                    {
                        "$selector": $rangeInput,
                        "text"     : ErrorTextTStr.NoBucketOnStr,
                        "check"    : function() {
                            return (statsCol.type === "string");
                        }
                    },
                    {
                        "$selector": $rangeInput
                    },
                    {
                        "$selector": $rangeInput,
                        "text"     : ErrorTextTStr.OnlyPositiveNumber,
                        "check"    : function() {
                            return (Number(val) <= 0);
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }

                bucketData(val, statsCol);
            }
        });

        $modal.on("click", ".arrow", function() {
            var isLeft = $(this).hasClass("left-arrow");
            clickArrowEvent(isLeft);
        });
    };

    Profile.getCache = function() {
        return (statsInfos);
    };

    Profile.restore = function(oldInfos) {
        statsInfos = {};
        for (var tableId in oldInfos) {
            statsInfos[tableId] = {};
            var colInfos = oldInfos[tableId];
            for (var colName in colInfos) {
                statsInfos[tableId][colName] = new ProfileInfo(colInfos[colName]);
            }
        }
    };

    Profile.copy = function(oldTableId, newTableId) {
        if (statsInfos[oldTableId] == null) {
            return;
        }

        // XXX FIXME if the shallow copy is wrong and should do a deep copy
        // (in that case modal id should change!)
        statsInfos[newTableId] = statsInfos[oldTableId];
    };

    Profile.show = function(tableId, colNum) {
        var deferred = jQuery.Deferred();

        var table   = gTables[tableId];
        var progCol = table.tableCols[colNum - 1];
        var colName = progCol.getBackColName();

        if (colName == null) {
            deferred.reject("No backend col name!");
            return (deferred.promise());
        }

        curTableId = tableId;
        curColNum = colNum;

        statsInfos[tableId] = statsInfos[tableId] || {};
        statsCol = statsInfos[tableId][colName];

        if (statsCol == null) {
            statsCol = statsInfos[tableId][colName] = new ProfileInfo({
                "modalId": xcHelper.randName("stats"),
                "colName": colName,
                "type"   : progCol.type
            });
        } else if (statsCol.modalId === $modal.data("id")) {
            // when same modal open twice
            deferred.resolve();
            return (deferred.promise());
        }

        var curStatsCol = statsCol;

        generateStats(table)
        .then(function() {
            SQL.add("Profile", {
                "operation": SQLOps.Profile,
                "tableName": table.tableName,
                "tableId"  : tableId,
                "colNum"   : colNum,
                "colName"  : colName,
                "modalId"  : statsCol.modalId
            });

            commitToStorage();
            deferred.resolve();
        })
        .fail(function(error) {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function closeProfileModal() {
        var fadeOutTime = gMinModeOn ? 0 : 300;
        $modal.hide();
        $modalBg.fadeOut(fadeOutTime);

        $modal.find(".groupbyChart").empty();
        modalHelper.clear();
        resetScrollBar();
        freePointer();

        curTableId = null;
        curColNum = null;
        totalRows = null;
        groupByData = [];
        bucketNum = 0;
        order = sortMap.origin;
        statsCol = null;
        percentageLabel = false;
        $modal.removeData("id");

        $modal.find(".min-range .text").off();
        $modalBg.off("mouseover.profileModal");
        // turn off scroll bar event
        $modal.find(".scrollBar").off();
        $(document).off(".profileModal");
        $("#stats-rowInput").off();

        $modal.find(".rangeSection").removeClass("range")
                    .find("input").val("");
    }

    function generateStats(table) {
        var deferred  = jQuery.Deferred();
        var type      = statsCol.type;
        var tableName = table.tableName;
        var promises  = [];
        var promise;

        // do aggreagte
        for (var i = 0, len = aggKeys.length; i < len; i++) {
            var aggkey = aggKeys[i];
            if (statsCol.aggInfo[aggkey] == null) {
                // should do aggreagte
                if (type === "integer" || type === "float") {
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
            // use XcalarGetTables because XcalarSetAbsolute cannot
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

                showProfile();
            })
            .fail(function(error) {
                console.error(error);
                innerDeferred.reject(error);
            });

            promises.push(innerDeferred.promise());
        } else if (statsCol.groupByInfo.isComplete !== "running") {
            promise = runGroupby(table, statsCol, bucketNum);
            promises.push(promise);
            showProfile();
        } else {
            showProfile();
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

    function showProfile() {
        modalHelper.setup();
        setupScrollBar();

        // setup rangInput
        if (isValidTypeForRange(statsCol.type)) {
            $rangeInput.removeClass("disabled")
                        .prop("disabled", false)
                        .removeAttr("placeholder");
        } else {
            $rangeInput.addClass("disabled")
                        .prop("disabled", true)
                        .attr("placeholder", "Integer/Float Only");
        }

        if (gMinModeOn) {
            $modalBg.show();
            $modal.show().data("id", statsCol.modalId);
            refreshStats();
        } else {
            $modalBg.fadeIn(300, function() {
                $modal.fadeIn(180)
                        .data("id", statsCol.modalId);
                refreshStats();
            });
        }

        // hide scroll bar first
        $modal.addClass("noScrollBar");
        $modal.find(".scrollSection").hide();
        $modalBg.on("mouseover.profileModal", resetTooltip);
    }

    // refresh profile
    function refreshStats(resetRefresh) {
        var deferred = jQuery.Deferred();

        var $aggInfoSection = $modal.find(".aggInfoSection");
        var $loadingSection = $modal.find(".loadingSection");
        var $loadHiddens    = $modal.find(".loadHidden");
        var $loadDisables   = $modal.find(".loadDisable");

        var instruction = "Profile of <b>" + statsCol.colName + ".</b><br>";

        // update agg info
        aggKeys.forEach(function(aggkey) {
            var aggVal = statsCol.aggInfo[aggkey];
            if (aggVal == null) {
                // when aggregate is still running
                $aggInfoSection.find("." + aggkey).html("...")
                                    .attr("title", "...")
                                    .addClass("animatedEllipsis");
            } else {
                var text = aggVal.toLocaleString();
                $aggInfoSection.find("." + aggkey)
                            .removeClass("animatedEllipsis")
                            .attr("title", text)
                            .text(text);
            }
        });

        if (resetRefresh) {
            $loadHiddens.addClass("disabled");
        } else {
            $loadHiddens.addClass("hidden");
        }

        $loadDisables.addClass("disabled");
        $loadingSection.removeClass("hidden");

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
                return getResultSet(table);
            })
            .then(function(resultSet) {
                resultSetId = resultSet.resultSetId;
                totalRows = resultSet.numEntries;

                return fetchGroupbyData(0, numRowsToFetch);
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
                setArrows(1);
                deferred.resolve();
            })
            .fail(function(error) {
                failureHandler(statsCol, error);
                deferred.reject(error);
            });

            instruction += "Hover on the bar to see details. " +
                "Use scroll bar and input box to view more data.";
        } else {
            // the data is loading, show loadingSection and hide groupby section
            instruction += "Please wait for the data preparation, " +
                            "you can close the modal and view it later.";
            deferred.resolve();
        }

        $modal.find(".modalInstruction .text").html(instruction);

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
            res = "--";
            console.error(error);
            deferred.resolve();
        })
        .always(function() {
            curStatsCol.aggInfo[aggkey] = res;

            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                var text = res.toLocaleString();
                $modal.find(".aggInfoSection ." + aggkey)
                        .removeClass("animatedEllipsis")
                        .attr("title", text)
                        .text(text);
            }
        });

        return (deferred.promise());
    }

    function runGroupby(table, curStatsCol, curBucketNum) {
        var deferred  = jQuery.Deferred();
        if (curBucketNum !== 0) {
            console.error("Invalid bucket num");
            deferred.reject("Invalid bucket num");
            return (deferred.promise());
        }

        var tableName = table.tableName;
        var tableId   = table.tableId;

        var groupbyTable;
        var finalTable;
        var colName = curStatsCol.colName;
        var tableToDelete;
        var msg = StatusMessageTStr.Statistics + ' for ' + colName;
        var msgId = StatusMessage.addMsg({
            "msg"      : msg,
            "operation": "Profile"
        });

        curStatsCol.groupByInfo.isComplete = "running";
        checkTableIndex(tableId, tableName, colName)
        .then(function(indexedTableName, nullCount) {
            curStatsCol.groupByInfo.nullCount = nullCount;

            if (indexedTableName !== tableName) {
                tableToDelete = indexedTableName;
            }

            // here user old table name to generate table name
            groupbyTable = getNewName(tableName, ".profile.groupby", true);

            var operator    = AggrOp.Count;
            var newColName  = statsColName;
            var isIncSample = false;
            var sqlOptions  = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "groupby",
                "tableName"   : tableName,
                "colName"     : colName,
                "newTableName": groupbyTable
            };

            return XcalarGroupBy(operator, newColName, colName,
                                indexedTableName, groupbyTable,
                                isIncSample, sqlOptions);
        })
        .then(function() {
            finalTable = getNewName(tableName, ".profile.final", true);
            var sortCol = colName;

            // escaping colName like votes.funny
            if (colName.indexOf('.') > -1) {
                sortCol = colName.replace(/\./g, "\\\.");
            }

            sqlOptions = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "sort",
                "tableName"   : groupbyTable,
                "colName"     : sortCol,
                "newTableName": finalTable,
                "sorted"      : true
            };

            return XcalarIndexFromTable(groupbyTable, sortCol, finalTable,
                                        XcalarOrderingT.XcalarOrderingAscending,
                                        sqlOptions);
        })
        .then(function() {
            var def1 = getAggResult(statsColName, finalTable, aggMap.max);
            var def2 = getAggResult(statsColName, finalTable, aggMap.sum);
            return xcHelper.when(def1, def2);
        })
        .then(function(maxVal, sumVal) {
            curStatsCol.addBucket(0, {
                "max"    : maxVal,
                "sum"    : sumVal,
                "table"  : finalTable,
                "colName": colName
            });

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
                return refreshStats();
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

    function checkTableIndex(tableId, tableName, colName) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableKey = table.keyName;

        getUnsortedTableName(tableName)
        .then(function(unsorted) {
            var innerDeferred = jQuery.Deferred();
            var parentIndexedWrongly = false;

            if (unsorted !== tableName) {
                // this is sorted table, should index a unsorted one
                XcalarMakeResultSetFromTable(unsorted)
                .then(function(resultSet) {
                    resultSet = resultSet || {};
                    var parentKey = resultSet.keyAttrHeader.name;

                    if (parentKey !== colName) {
                        if (parentKey !== tableKey) {
                            // if current is sorted, the parent should also
                            // index on the column to remove "KNF", first
                            var indexTable = getNewName(tableName,
                                                    ".stats.indexParent", true);
                            var sqlOptions = {
                                "operation"   : SQLOps.ProfileAction,
                                "action"      : "index",
                                "tableName"   : unsorted,
                                "colName"     : tableKey,
                                "newTableName": indexTable,
                                "sorted"      : false
                            };

                            XcalarIndexFromTable(unsorted, tableKey, indexTable,
                                         XcalarOrderingT.XcalarOrderingUnordered,
                                         sqlOptions)
                            .then(function() {
                                if (tableKey === colName) {
                                    // when the parent has right index
                                    parentIndexedWrongly = false;
                                } else {
                                    // when parent need another index on colName
                                    parentIndexedWrongly = true;
                                }

                                innerDeferred.resolve(parentIndexedWrongly,
                                                        indexTable);
                            })
                            .fail(innerDeferred.reject);
                        } else {
                            // when parent is indexed on tableKey,
                            // still but need another index on colName
                            parentIndexedWrongly = true;
                            innerDeferred.resolve(parentIndexedWrongly, unsorted);
                        }
                    } else {
                        innerDeferred.resolve(parentIndexedWrongly, unsorted);
                    }
                })
                .fail(innerDeferred.reject);
            } else {
                // this is the unsorted table
                if (colName !== tableKey) {
                    parentIndexedWrongly = true;
                }

                innerDeferred.resolve(parentIndexedWrongly, tableName);
            }

            return (innerDeferred.promise());
        })
        .then(function(parentIndexedWrongly, unsortedTable) {
            if (!parentIndexedWrongly) {
                deferred.resolve(unsortedTable, 0);
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

                XcalarIndexFromTable(unsortedTable, colName, newTableName,
                                     XcalarOrderingT.XcalarOrderingUnordered,
                                     sqlOptions)
                .then(function() {
                    // Aggregate count on origingal already remove the null value!
                    return getAggResult(colName, unsortedTable, aggMap.count);
                })
                .then(function(val) {
                    // the gTables[tableId].resultSetCount should eqaul to the
                    // totalCount after right index, if not, a way to resolve
                    // is to get resulSetCount from the right src table
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

        var $section = $modal.find(".groubyInfoSection");
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
        var maxHeight = Math.max(tableInfo.max, nullCount);
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
                .style("left", left)
            .append("g")
                .attr("class", "barChart")
                .attr("transform", "translate(" + marginLeft + ", 0)");

            $(".bartip").remove();
        } else if (resize) {
            chart = d3.select("#profileModal .groupbyChart .barChart");

            d3.select("#profileModal .groupbyChart")
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

        chart = d3.select("#profileModal .groupbyChart .barChart");
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
            var name = formatNumber(d[xName]);
            if (!noBucket && !noSort) {
                var num2 = formatNumber(d[xName] + tableInfo.bucketSize);
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
                num = formatNumber(d[yName]);
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
                title = xName + ": " + formatNumber(d[xName]) + "<br>";
            } else {
                title = statsCol.colName + ": [" + formatNumber(d[xName]) +
                        ", " + formatNumber(d[xName] + tableInfo.bucketSize) +
                        ")<br>";
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
                title += "Frequency: " + formatNumber(d[yName]);
            }

            var options = $.extend({}, tooltipOptions, {
                "title": title
            });
            $(this).tooltip("destroy");
            $(this).tooltip(options);

            return "barArea";
        }
    }

    function formatNumber(num) {
        // if not speify maximumFractionDigits, 168711.0001 will be 168,711
        return num.toLocaleString("en", {"maximumFractionDigits": "5"});
    }

    function resetScrollBar() {
        var $section = $modal.find(".scrollSection");
        if (totalRows <= numRowsToFetch) {

            if (gMinModeOn) {
                $section.hide();
            } else {
                $section.slideUp(100);
            }

            $modal.addClass("noScrollBar");
            return;
        }

        $modal.removeClass("noScrollBar");

        if (gMinModeOn) {
            $section.show();
        } else {
            $section.slideDown(100);
        }

        var $scrollerArea = $section.find(".rowScrollArea");
        
        var $maxRange = $section.find(".max-range");
        var $rowInput = $("#stats-rowInput").val(1).data("rowNum", 1);
        $modal.find(".scroller").css("transform", "");

        // set width of elements
        $maxRange.text(totalRows.toLocaleString());
        $rowInput.width($maxRange.width() + 5); // 5 is for input padding

        var extraWidth = $section.find(".rowInput").outerWidth() + 1;
        $scrollerArea.css("width", "calc(100% - " + extraWidth + "px)");
    }

    function setupScrollBar() {
        var $section = $modal.find(".scrollSection");
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
            $modal.addClass("dragging");
        });

        $(document).on({
            "mouseup.profileModal": function(event) {
                if (isDragging === true) {
                    $scroller.removeClass("scrolling");
                    var mouseX = event.pageX - $scrollerBar.offset().left;
                    var rowPercent = mouseX / $scrollerBar.width();

                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));
                    positionScrollBar(rowPercent);
                    $modal.removeClass("dragging");
                }
                isDragging = false;
            },
            "mousemove.profileModal": function(event) {
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

                if (!isNaN(num)) {
                    clearTimeout(timer);
                    timer = setTimeout(function() {
                        num = Math.min(num, totalRows);
                        num = Math.max(num, 1);
                        positionScrollBar(null, num);
                    }, 100);
                } else {
                    // when input is invalid
                    $input.val($input.data("rowNum"));
                }
                $input.blur();
            }
        });
    }

    function getTranslate(percent) {
        return (Math.min(99.9, Math.max(0, percent * 100)));
    }

    function positionScrollBar(rowPercent, rowNum) {
        var translate;
        var isFromInput = false;

        var $section = $modal.find(".scrollSection");
        var $scroller = $section.find(".rowScrollArea .scroller");
        var $rowInput = $("#stats-rowInput");

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
            $rowInput.val(rowNum);
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

        var $loadingSection = $modal.find(".loadingSection");
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
            setArrows(tempRowNum);
        })
        .fail(function(error) {
            failureHandler(statsCol, error);
        })
        .always(function() {
            $section.removeClass("disabled");
        });
    }

    function setArrows(rowNum) {
        var $groupbySection = $modal.find(".groubyInfoSection");
        var $leftArrow = $groupbySection.find(".left-arrow");
        var $rightArrow = $groupbySection.find(".right-arrow");

        if (totalRows <= numRowsToFetch) {
            $leftArrow.hide();
            $rightArrow.hide();
        } else if (rowNum <= 1) {
            $leftArrow.hide();
            $rightArrow.show();
        } else if (rowNum > totalRows - numRowsToFetch) {
            $leftArrow.show();
            $rightArrow.hide();
        } else {
            $leftArrow.show();
            $rightArrow.show();
        }
    }

    function clickArrowEvent(isLeft) {
        var curRowNum = Number($("#stats-rowInput").val());

        if (isLeft) {
            curRowNum -= numRowsToFetch;
        } else {
            curRowNum += numRowsToFetch;
        }

        curRowNum = Math.max(1, curRowNum);
        curRowNum = Math.min(curRowNum, totalRows);

        positionScrollBar(null, curRowNum);
    }

    function resetSortSection() {
        $modal.find(".sortSection").find(".active").removeClass("active")
            .end()
            .find("." + order).addClass("active");
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
                "operation" : SQLOps.ProfileSort,
                "order"     : newOrder,
                "tableId"   : curTableId,
                "colNum"    : curColNum,
                "bucketSize": bucketNum,
                "modalId"   : statsCol.modalId
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
        var deferred  = jQuery.Deferred();
        var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];

        if (newOrder === sortMap.asc) {
            if (tableInfo.ascTable != null) {
                deferred.resolve();
            } else {
                // get a sort table
                sortHelper(newOrder)
                .then(function(sortedTable) {
                    tableInfo.ascTable = sortedTable;
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else if (newOrder === sortMap.desc) {
            if (tableInfo.descTable != null) {
                deferred.resolve();
            } else {
                // get a reverse sort table
                sortHelper(newOrder)
                .then(function(sortedTable) {
                    tableInfo.descTable = sortedTable;
                    deferred.resolve();
                })
                .fail(deferred.reject);
            }
        } else {
            deferred.resolve();
        }

        function sortHelper(sortOrder) {
            var innerDeferred = jQuery.Deferred();
            var tableName = tableInfo.table;
            var newTableName = getNewName(tableName, "." + sortOrder);
            var colName = (bucketNum === 0) ? statsColName : bucketColName;

            var sqlOptions = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "sort",
                "tableName"   : tableName,
                "colName"     : colName,
                "newTableName": newTableName,
                "sorted"      : true,
                "order"       : sortOrder
            };

            var xcOrder;
            if (sortOrder === sortMap.desc) {
                xcOrder = XcalarOrderingT.XcalarOrderingDescending;
            } else {
                xcOrder = XcalarOrderingT.XcalarOrderingAscending;
            }

            XcalarIndexFromTable(tableName, colName, newTableName, xcOrder, sqlOptions)
            .then(function() {
                innerDeferred.resolve(newTableName);
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }

        return (deferred.promise());
    }

    function toggleRange(isToRange) {
        var isRangeNow = $rangeSection.hasClass("range");
        var isSingleNow = !isRangeNow;

        if (isToRange == null) {
            // when has no args, and current status is single
            // we go to range
            isToRange = isSingleNow;
        }

        if (isToRange && isRangeNow || !isToRange && isSingleNow) {
            // when go to range but already in range
            // or go to single but already in single
            return;
        }

        if (isToRange) {
            // go to range
            $rangeSection.addClass("range");
            if (!isValidTypeForRange(statsCol.type)) {
                // when switch to range but type is not number, switch back
                setTimeout(function() {
                    $rangeSection.removeClass("range");
                }, 200);
            } else {
                bucketData($rangeInput.val(), statsCol);
            }
        } else {
            // go to single
            var curBucketNum = Number($rangeInput.val());
            if (isNaN(curBucketNum) || curBucketNum <= 0) {
                // for invalid case or original case(bucketNum = 0)
                // clear input
                $rangeInput.val("");
            }
            $rangeSection.removeClass("range");
            bucketData(0, statsCol);
        }
    }

    function bucketData(newBucketNum, curStatsCol) {
        newBucketNum = Number(newBucketNum);

        if (isNaN(newBucketNum) ||
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
            SQL.add("Profile Bucketing", {
                "operation" : SQLOps.ProfileBucketing,
                "bucketSize": newBucketNum,
                "tableId"   : curTableId,
                "colNum"    : curColNum,
                "modalId"   : statsCol.modalId
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
        var buckets   = curStatsCol.groupByInfo.buckets;
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
        var finalTable;

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
            indexTable = getNewName(mapTable, ".index", true);
            sqlOptions = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "index",
                "tableName"   : mapTable,
                "colName"     : mapCol,
                "newTableName": indexTable,
                "sorted"      : false
            };

            return XcalarIndexFromTable(mapTable, mapCol, indexTable,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        sqlOptions);
        })
        .then(function() {
            var operator    = AggrOp.Sum;
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
        .then(function() {
            finalTable = getNewName(mapTable, ".final", true);

            sqlOptions = {
                "operation"   : SQLOps.ProfileAction,
                "action"      : "sort",
                "tableName"   : groupbyTable,
                "colName"     : mapCol,
                "newTableName": finalTable,
                "sorted"      : true
            };

            return XcalarIndexFromTable(groupbyTable, mapCol, finalTable,
                                        XcalarOrderingT.XcalarOrderingAscending,
                                        sqlOptions);
        })
        .then(function() {
            var def1 = getAggResult(bucketColName, finalTable, aggMap.max);
            var def2 = getAggResult(bucketColName, finalTable, aggMap.sum);
            return (xcHelper.when(def1, def2));
        })
        .then(function(maxVal, sumVal) {
            curStatsCol.addBucket(newBucketNum, {
                "max"       : maxVal,
                "sum"       : sumVal,
                "table"     : finalTable,
                "colName"   : mapCol,
                "bucketSize": newBucketNum
            });
            curStatsCol.groupByInfo.isComplete = true;

            // delete intermediate table
            XcalarDeleteTable(mapTable, {
                "operation": SQLOps.ProfileAction,
                "action"   : "delete",
                "tableName": mapTable
            });

            XcalarDeleteTable(indexTable, {
                "operation": SQLOps.ProfileAction,
                "action"   : "delete",
                "tableName": indexTable
            });

            // Note that grouby table can not delete because when sort bucket table
            // it looks for the unsorted table, which is this one
            deferred.resolve();
        })
        .fail(deferred.reject);

        return (deferred.promise());
    }

    function highlightBar(rowNum) {
        if (rowNum == null) {
            rowNum = Number($("#stats-rowInput").val());
        }
        var $chart = $modal.find(".groubyInfoSection .groupbyChart .barChart");

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

    function isValidTypeForRange(type) {
        // only integer and float can do range
        if (type === "integer" || type === "float") {
            return true;
        } else {
            return false;
        }
    }

    function isModalVisible(curStatsCol) {
        return ($modal.is(":visible") &&
                $modal.data("id") === curStatsCol.modalId);
    }

    function failureHandler(curStatsCol, error) {
        console.error("Profile Fails", error);
        if (isModalVisible(curStatsCol)) {
            // turn gMinModeOn so that hide modalBg in clostStats()
            // has no delay affect to Alert.error()
            gMinModeOn = true;
            closeProfileModal();
            gMinModeOn = false;
            Alert.error("Profile Fails", error);
        }
    }

    return (Profile);
}(jQuery, {}, d3));
