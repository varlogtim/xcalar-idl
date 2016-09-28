window.Profile = (function($, Profile, d3) {
    var $modal;        // $("#profileModal");
    var $rangeSection; // $modal.find(".rangeSection");
    var $rangeInput;   // $("#profile-range");
    var $skipInput;    // $("#profile-rowInput")

    var modalHelper;
    // constants
    var aggKeys = ["min", "average", "max", "count", "sum", "sd"];
    var aggMap = {
        "min"    : AggrOp.Min,
        "average": AggrOp.Avg,
        "max"    : AggrOp.Max,
        "count"  : AggrOp.Count,
        "sum"    : AggrOp.Sum,
        "sd"     : "sd"
    };
    var statsKeyMap = {
        "zeroQuartile" : "zeroQuartile",
        "lowerQuartile": "lowerQuartile",
        "median"       : "median",
        "upperQuartile": "upperQuartile",
        "fullQuartile" : "fullQuartile"
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
    var defaultRowsToFetch = 20;
    var minRowsToFetch = 10;
    var maxRowsToFetch = 60;

    var statsInfos = {};

    // data with initial value
    var curTableId = null;
    var curColNum = null;
    var resultSetId = null;
    var totalRows = 0;
    var groupByData = [];
    var bucketNum = 0;
    var order = sortMap.origin;
    var statsCol = null;
    var percentageLabel = false;
    var numRowsToFetch = defaultRowsToFetch;
    var filterDragging = false;

    Profile.setup = function() {
        $modal = $("#profileModal");
        $rangeSection = $modal.find(".rangeSection");
        $rangeInput = $("#profile-range");
        $skipInput = $("#profile-rowInput");

        // constant
        var minHeight = 425;
        var minWidth  = 750;

        modalHelper = new ModalHelper($modal, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

        $modal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document",
            "resize"     : resizeChart
        });

        $modal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $modal.on("click", ".close", function() {
            closeProfileModal();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });

        // show tootip in barArea and do not let in blink in padding
        $modal.on("mouseover", ".barArea", function(event) {
            event.stopPropagation();
            var rowToHover = null;
            if (!$modal.hasClass("drawing")) {
                rowToHover = d3.select(this).attr("data-rowNum");
            }
            resetTooltip(rowToHover);
        });

        // only trigger in padding area btw bars
        $modal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $modal.on("mouseover", function() {
            resetTooltip();
        });

        var $groupbySection = $modal.find(".groubyInfoSection");

        $groupbySection.on("click", ".bar-extra, .bar, .xlabel", function(event) {
            if (event.which !== 1) {
                return;
            }

            if (filterDragging) {
                filterDragging = false;
                return;
            }
            percentageLabel = !percentageLabel;
            buildGroupGraphs();
            highlightBar();
        });

        $groupbySection.on("mousedown", ".arrow", function(event) {
            if (event.which !== 1) {
                return;
            }

            var isLeft = $(this).hasClass("left-arrow");
            clickArrowEvent(isLeft);
            return false;
        });

        $("#profile-chart").on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            createFilterSelection(event.pageX, event.pageY);
        });

        // event on sort section
        var $sortSection = $modal.find(".sortSection");
        xcHelper.optionButtonEvent($sortSection, function(option) {
            if (option === "asc") {
                sortData(sortMap.asc, statsCol);
            } else if (option === "desc") {
                sortData(sortMap.desc, statsCol);
            } else {
                sortData(sortMap.origin, statsCol);
            }
        });

        // event on range section
        xcHelper.optionButtonEvent($rangeSection, function(option) {
            toggleRange(option);
        });

        $rangeInput.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                var val = $rangeInput.val();
                // Note that because the input type is number,
                // any no-numeric string in the input will get ""
                // when do $rangeInput.val()
                var isValid = xcHelper.validate([
                    {
                        "$selector": $rangeInput,
                        "text"     : ErrTStr.OnlyPositiveNumber
                    },
                    {
                        "$selector": $rangeInput,
                        "text"     : ErrTStr.OnlyPositiveNumber,
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

        var skipInputTimer;
        $skipInput.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var num = Number($input.val());

                if (!isNaN(num)) {
                    clearTimeout(skipInputTimer);
                    skipInputTimer = setTimeout(function() {
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

        // event on disaplyInput
        var $disaplyInput = $modal.find(".disaplyInput");
        $disaplyInput.on("click", ".action", function() {
            var diff = 10;
            var newRowsToFetch;

            if ($(this).hasClass("more")) {
                // 52 should return 60, 50 should reutrn 60
                newRowsToFetch = (Math.floor(numRowsToFetch / diff) + 1) * diff;
            } else {
                // 52 should return 50, 50 should return 40
                newRowsToFetch = (Math.ceil(numRowsToFetch / diff) - 1) * diff;
            }

            updateRowsToFetch(newRowsToFetch);
        });

        $("#profile-filterOption").on("mousedown", ".option", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $option = $(this);
            if ($option.hasClass("filter")) {
                filterSelectedValues(FltOp.Filter);
            } else if ($option.hasClass("exclude")) {
                filterSelectedValues(FltOp.Exclude);
            } else {
                toggleFilterOption(true);
            }
        });

        $("#profile-stats").on("click", ".popBar", function() {
            $modal.toggleClass("collapse");
            resizeChart();
        });

        // do correlation
        $("#profile-corr").click(function() {
            var tableId = curTableId;
            var colNum = curColNum;
            var tmp = gMinModeOn;
            // use gMinMode to aviod blink in open/close modal
            gMinModeOn = true;
            closeProfileModal();
            AggModal.corrAgg(tableId, colNum);
            gMinModeOn = tmp;
        });
    };

    Profile.restore = function(oldInfos) {
        oldInfos = oldInfos || {};
        statsInfos = {};
        for (var tableId in oldInfos) {
            statsInfos[tableId] = {};
            var colInfos = oldInfos[tableId] || {};
            for (var colName in colInfos) {
                statsInfos[tableId][colName] = new ProfileInfo(colInfos[colName]);
            }
        }
    };

    Profile.getCache = function() {
        return (statsInfos);
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

        // update front col name
        statsCol.frontColName = progCol.getFrontColName();

        var sql = {
            "operation": SQLOps.Profile,
            "tableName": table.getName(),
            "tableId"  : tableId,
            "colNum"   : colNum,
            "colName"  : colName,
            "modalId"  : statsCol.modalId
        };
        var txId = Transaction.start({
            "msg"      : StatusMessageTStr.Profile + " " + colName,
            "operation": SQLOps.Profile,
            "sql"      : sql
        });

        showProfile();

        generateProfile(table, txId)
        .then(function() {
            Transaction.done(txId, {
                "noNotification": true
            });
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Profile failed", error);
            deferred.resolve();
        });

        return (deferred.promise());
    };

    function closeProfileModal() {
        modalHelper.clear();
        $modal.find(".groupbyChart").empty();
        freePointer();

        curTableId = null;
        curColNum = null;
        totalRows = 0;
        groupByData = [];
        bucketNum = 0;
        order = sortMap.origin;
        statsCol = null;
        percentageLabel = false;
        $modal.removeData("id");
        toggleRange("single", true); // reset the range

        $modal.find(".min-range .text").off();
        $("#modalBackground").off("mouseover.profileModal");
        // turn off scroll bar event
        $modal.find(".scrollBar").off();
        $(document).off(".profileModal");

        numRowsToFetch = defaultRowsToFetch;
        toggleFilterOption(true);
        resetRowsInfo();
    }

    function generateProfile(table, txId) {
        var deferred = jQuery.Deferred();
        var promises = [];
        var isNum = isTypeNumber(statsCol.type);

        for (var i = 0, len = aggKeys.length; i < len; i++) {
            var aggkey = aggKeys[i];
            if (aggkey !== "count" && !isNum) {
                statsCol.aggInfo[aggkey] = "--";
                refreshAggInfo(aggkey);
            } else {
                promises.push(runAgg(table, aggKeys[i], statsCol, txId));
            }
        }

        promises.push(runStats(table, statsCol));

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

                    runGroupby(table, statsCol, bucketNum, txId)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                } else {
                    innerDeferred.resolve();
                }
            })
            .fail(function(error) {
                failureHandler(statsCol, error, txId);
                innerDeferred.reject(error);
            });

            promises.push(innerDeferred.promise());
        } else if (statsCol.groupByInfo.isComplete !== "running") {
            promises.push(runGroupby(table, statsCol, bucketNum, txId));
        }

        PromiseHelper.when.apply(window, promises)
        .then(deferred.resolve)
        .fail(function() {
            var error;
            for (var t = 0; t < arguments.length; t++) {
                error = error || arguments[t];
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function showProfile() {
        if (isTypeNumber(statsCol.type)) {
            $modal.addClass("type-number");
        } else {
            $modal.removeClass("type-number");
        }

        // hide scroll bar first
        $modal.addClass("noScrollBar");
        $modal.data("id", statsCol.modalId);

        modalHelper.setup();

        refreshProfile();
        setupScrollBar();
        $("#modalBackground").on("mouseover.profileModal", function() {
            resetTooltip();
        });
    }

    // refresh profile
    function refreshProfile() {
        var instr = xcHelper.replaceMsg(ProfileTStr.Info, {
            "col" : statsCol.frontColName,
            "type": statsCol.type
        });

        instr += "<br>";

        // update instruction
        if (statsCol.groupByInfo.isComplete === true) {
            instr += ProfileTStr.Instr;
        } else {
            instr += ProfileTStr.LoadInstr;
        }

        $modal.find(".modalInstruction .text").html(instr);

        refreshAggInfo();
        refreshStatsInfo();

        return refreshGroupbyInfo();
    }

    function refreshGroupbyInfo(resetRefresh) {
        var deferred = jQuery.Deferred();

        $modal.addClass("loading");

        var $loadHiddens = $modal.find(".loadHidden");
        var $loadDisables = $modal.find(".loadDisabled");
        var $errorSection = $modal.find(".errorSection");

        if (resetRefresh) {
            $loadHiddens.addClass("disabled");
        } else {
            $loadHiddens.addClass("hidden");
        }

        $modal.removeClass("allNull");
        $loadDisables.addClass("disabled");
        $errorSection.addClass("hidden").find(".text").text("");

        // update groupby info
        if (statsCol.groupByInfo.isComplete === true) {
            // data is ready
            groupByData = [];

            if (statsCol.groupByInfo.allNull) {
                $modal.addClass("allNull");
            }

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
                return XcalarMakeResultSetFromTable(table);
            })
            .then(function(resultSet) {
                resultSetId = resultSet.resultSetId;
                totalRows = resultSet.numEntries;

                return fetchGroupbyData(0, numRowsToFetch);
            })
            .then(function() {
                $modal.removeClass("loading");
                $loadHiddens.removeClass("hidden").removeClass("disabled");
                $loadDisables.removeClass("disabled");

                resetGroupbyInfo();

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
        } else {
            // the data is loading, show loadingSection and hide groupby section
            deferred.resolve();
        }

        return deferred.promise();
    }

    function refreshAggInfo(aggKeysToRefesh) {
        // update agg info
        var $infoSection = $("#profile-stats");
        aggKeysToRefesh = aggKeysToRefesh || aggKeys;
        if (!(aggKeysToRefesh instanceof Array)) {
            aggKeysToRefesh = [aggKeysToRefesh];
        }

        aggKeysToRefesh.forEach(function(aggkey) {
            var aggVal = statsCol.aggInfo[aggkey];
            if (aggVal == null) {
                // when aggregate is still running
                $infoSection.find("." + aggkey).html("...")
                            .attr("data-origina-title", "...")
                            .addClass("animatedEllipsis");
            } else {
                var text = aggVal.toLocaleString();
                $infoSection.find("." + aggkey)
                            .removeClass("animatedEllipsis")
                            .attr("data-original-title", text)
                            .text(text);
            }
        });
    }

    function refreshStatsInfo() {
        // update stats info
        var $infoSection = $("#profile-stats");
        var $statsInfo = $infoSection.find(".statsInfo");

        if (statsCol.statsInfo.unsorted) {
            $statsInfo.find(".info").hide()
                    .end()
                    .find(".instruction").show();
        } else {
            $statsInfo.find(".instruction").hide()
                    .end()
                    .find(".info").show();

            for (var key in statsKeyMap) {
                var statsKey = statsKeyMap[key];
                var statsVal = statsCol.statsInfo[statsKey];
                if (statsVal == null) {
                    // when stats is still running
                    $infoSection.find("." + statsKey).html("...")
                                .attr("data-original-title", "...")
                                .addClass("animatedEllipsis");
                } else {
                    var text = statsVal.toLocaleString();
                    $infoSection.find("." + statsKey)
                                .removeClass("animatedEllipsis")
                                .attr("data-original-title", text)
                                .text(text);
                }
            }
        }
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

    function runAgg(table, aggkey, curStatsCol, txId) {
        // pass in statsCol beacuse close modal may clear the global statsCol
        if (curStatsCol.aggInfo[aggkey] != null) {
            // when already have cached agg info
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();
        var fieldName = curStatsCol.colName;
        var aggrOp = aggMap[aggkey];
        var res;

        getAggResult(fieldName, table.getName(), aggrOp, txId)
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
                refreshAggInfo(aggkey);
            }
        });

        return deferred.promise();
    }

    function runStats(table, curStatsCol) {
        var deferred = jQuery.Deferred();
        var hasStatsInfo = true;

        if (!curStatsCol.statsInfo.unsorted) {
            for (var key in statsKeyMap) {
                var curStatsKey = statsKeyMap[key];
                if (curStatsCol.statsInfo[curStatsKey] === '--') {
                    // when it's caused by fetch error
                    curStatsCol.statsInfo[curStatsKey] = null;
                }

                if (curStatsCol.statsInfo[curStatsKey] == null) {
                    hasStatsInfo = false;
                    break;
                }
            }
        }

        if (hasStatsInfo) {
            return deferred.resolve().promise();
        }

        var isNum = isTypeNumber(curStatsCol.type);
        var tableName = table.getName();
        XIApi.checkOrder(tableName)
        .then(getStats)
        .then(function() {
            if (isModalVisible(curStatsCol)) {
                refreshStatsInfo();
            }
            deferred.resolve();
        })
        .fail(deferred.reject);


        return deferred.promise();

        function getStats(tableOrder, tableKey) {
            var innerDeferred = jQuery.Deferred();

            var zeroKey = statsKeyMap.zeroQuartile;
            var lowerKey = statsKeyMap.lowerQuartile;
            var medianKey = statsKeyMap.median;
            var upperKey = statsKeyMap.upperQuartile;
            var fullKey = statsKeyMap.fullQuartile;
            var resultId;

            if (tableOrder === XcalarOrderingT.XcalarOrderingUnordered ||
                tableKey !== curStatsCol.colName) {
                // when table is unsorted
                curStatsCol.statsInfo.unsorted = true;
                return innerDeferred.resolve().promise();
            }

            XcalarMakeResultSetFromTable(tableName)
            .then(function(res) {
                resultId = res.resultSetId;
                var promises = [];
                var numEntries = res.numEntries;
                var lowerRowEnd;
                var upperRowStart;

                if (numEntries % 2 !== 0) {
                    // odd rows or not number
                    lowerRowEnd = (numEntries + 1) / 2;
                    upperRowStart = lowerRowEnd;
                } else {
                    // even rows
                    lowerRowEnd = numEntries / 2;
                    upperRowStart = lowerRowEnd + 1;
                }

                promises.push(getMedian.bind(this, resultId, 1, 1, zeroKey));
                promises.push(getMedian.bind(this, resultId, 1, numEntries,
                                             medianKey));
                promises.push(getMedian.bind(this, resultId, 1, lowerRowEnd,
                                             lowerKey));
                promises.push(getMedian.bind(this, resultId, upperRowStart,
                                             numEntries, upperKey));
                promises.push(getMedian.bind(this, resultId, numEntries,
                                             numEntries, fullKey));

                return PromiseHelper.chain(promises);
            })
            .then(function() {
                XcalarSetFree(resultId);
                innerDeferred.resolve();
            })
            .fail(innerDeferred.reject);

            return innerDeferred.promise();
        }

        function getMedian(resultId, startRow, endRow, statsKey) {
            var innerDeferred = jQuery.Deferred();
            var numRows = endRow - startRow + 1;
            var rowNum;
            var rowsToFetch;

            if (!isNum) {
                rowsToFetch = 1;
                rowNum = (numRows % 2 === 0) ? startRow + numRows / 2 - 1 :
                                         startRow + (numRows + 1) / 2 - 1;
            } else if (numRows % 2 !== 0) {
                // odd rows or not number
                rowNum = startRow + (numRows + 1) / 2 - 1;
                rowsToFetch = 1;
            } else {
                // even rows
                rowNum = startRow + numRows / 2 - 1;
                rowsToFetch = 2;
            }

            // row position start with 0
            XcalarSetAbsolute(resultId, rowNum - 1)
            .then(function() {
                return XcalarGetNextPage(resultId, rowsToFetch);
            })
            .then(function(tableOfEntries) {
                var numKvPairs = tableOfEntries.numKvPairs;
                var kvPairs = tableOfEntries.kvPair;

                if (numKvPairs === rowsToFetch) {
                    if (isNum) {
                        var sum = 0;
                        for (var i = 0; i < rowsToFetch; i++) {
                            sum += Number(kvPairs[i].key);
                        }

                        var median = sum / rowsToFetch;
                        if (isNaN(rowsToFetch)) {
                            // handle case
                            console.warn("Invalid median");
                            curStatsCol.statsInfo[statsKey] = '--';
                        } else {
                            curStatsCol.statsInfo[statsKey] = median;
                        }
                    } else {
                        curStatsCol.statsInfo[statsKey] = kvPairs[0].key;
                    }
                } else {
                    // when the data not return correctly, don't recursive try.
                    console.warn("Not fetch correct rows");
                    curStatsCol.statsInfo[statsKey] = '--';
                }
            })
            .then(innerDeferred.resolve)
            .fail(function(error) {
                console.error("Run stats failed", error);
                curStatsCol.statsInfo[statsKey] = '--';
                innerDeferred.resolve();
            });

            return innerDeferred.promise();
        }
    }

    function runGroupby(table, curStatsCol, curBucketNum, txId) {
        var deferred  = jQuery.Deferred();
        if (curBucketNum !== 0) {
            return deferred.reject("Invalid bucket num").promise();
        }

        var tableName = table.getName();

        var groupbyTable;
        var finalTable;
        var colName = curStatsCol.colName;
        var tableToDelete;

        curStatsCol.groupByInfo.isComplete = "running";

        XIApi.index(txId, colName, tableName)
        .then(function(indexedTableName, hasIndexed) {
            var innerDeferred = jQuery.Deferred();

            if (indexedTableName !== tableName) {
                tableToDelete = indexedTableName;
            }

            if (hasIndexed) {
                XIApi.getNumRows(indexedTableName)
                .then(function(val) {
                    // the table.resultSetCount should eqaul to the
                    // totalCount after right index, if not, a way to resolve
                    // is to get resulSetCount from the right src table
                    var nullCount = table.resultSetCount - val;
                    var allNull = (val === 0);
                    innerDeferred.resolve(indexedTableName, nullCount, allNull);
                })
                .fail(innerDeferred.reject);
            } else {
                innerDeferred.resolve(indexedTableName, 0);
            }

            return innerDeferred.promise();
        })
        .then(function(indexedTableName, nullCount, allNull) {
            curStatsCol.groupByInfo.nullCount = nullCount;
            if (allNull) {
                curStatsCol.groupByInfo.allNull = true;
            }

            // here user old table name to generate table name
            groupbyTable = getNewName(tableName, ".profile.GB", true);

            var operator = AggrOp.Count;
            var newColName  = statsColName;
            var isIncSample = false;

            return XcalarGroupBy(operator, newColName, colName,
                                indexedTableName, groupbyTable,
                                isIncSample, false, txId);
        })
        .then(function() {
            if (curStatsCol.groupByInfo.allNull) {
                finalTable = groupbyTable;
                return PromiseHelper.resolve(0, 0);
            }

            finalTable = getNewName(tableName, ".profile.final", true);
            return sortGroupby(groupbyTable, colName, finalTable, txId);
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
                var innerDeferred = jQuery.Deferred();
                // delete the indexed table if exist
                XcalarDeleteTable(tableToDelete, txId)
                .always(innerDeferred.resolve);

                return innerDeferred.promise();
            }
        })
        .then(function() {
            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                refreshGroupbyInfo();
            }

            deferred.resolve();
        })
        .fail(function(error) {
            failureHandler(curStatsCol, error, txId);
            deferred.reject(error);
        });

        return (deferred.promise());
    }

    function sortGroupby(srcTable, colName, finalTable, txId) {
        var deferred = jQuery.Deferred();
        // both "a\.b" and "a.b" will become "a\.b" after groupby
        var sortCol = xcHelper.unescapeColName(colName);
        sortCol = xcHelper.escapeColName(sortCol);

        XcalarIndexFromTable(srcTable, sortCol, finalTable,
                            XcalarOrderingT.XcalarOrderingAscending, txId)
        .then(function() {
            var def1 = getAggResult(statsColName, finalTable, aggMap.max, txId);
            var def2 = getAggResult(statsColName, finalTable, aggMap.sum, txId);
            return PromiseHelper.when(def1, def2);
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getAggResult(colName, tableName, aggOp, txId) {
        if (aggOp === "sd") {
            // standard deviation
            var totalNum = gTables[curTableId].resultSetCount;
            var evalStr = "sqrt(div(sum(pow(sub(" + colName + ", avg(" +
                          colName + ")), 2)), " + totalNum + "))";

            return XIApi.aggregateWithEvalStr(txId, evalStr, tableName);
        } else {
            return XIApi.aggregate(txId, aggOp, colName, tableName);
        }
    }

    function fetchGroupbyData(rowPosition, rowsToFetch) {
        if (totalRows === 0) {
            return PromiseHelper.resolve();
        }

        var deferred = jQuery.Deferred();

        XcalarSetAbsolute(resultSetId, rowPosition)
        .then(function() {
            return XcalarGetNextPage(resultSetId, rowsToFetch);
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

                return fetchGroupbyData(newPosition, numStillNeeds);
            }
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function addNullValue(data) {
        // add col info for null value
        var nullCount = statsCol.groupByInfo.nullCount || 0;

        if (nullCount === 0) {
            return (data);
        }

        var nullData = {
            "rowNum": 0,
            "type"  : "nullVal"
        };
        var colName = statsCol.groupByInfo.buckets[bucketNum].colName;
        nullData[colName] = "null";

        if (bucketNum === 0) {
            nullData[statsColName] = nullCount;
        } else {
            nullData[bucketColName] = nullCount;
        }

        data.unshift(nullData);

        return (data);
    }

    function buildGroupGraphs(initial, resize) {
        var nullCount = statsCol.groupByInfo.nullCount;
        var tableInfo = statsCol.groupByInfo.buckets[bucketNum];
        var noBucket  = (bucketNum === 0) ? 1 : 0;
        var noSort    = (order === sortMap.origin);
        // both "a\.b" and "a.b" will become "a\.b" after groupby
        var xName = xcHelper.unescapeColName(tableInfo.colName);
        xName = xcHelper.escapeColName(xName);
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
                .style("overflow", "visible")
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

            var time = 60 / defaultRowsToFetch * numRowsToFetch;
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
            if (!noBucket && !noSort && d.type !== "nullVal") {
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
                // XXX that's for Citi's request to have maxium 2 digits
                // in decimal, used to be 3, can change back
                fixLen = Math.min(fixLen, 2);
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

            if (noBucket || d.type === "nullVal") {
                // xName is the backColName, may differenet with frontColName
                title = statsCol.frontColName + ": " +
                        formatNumber(d[xName]) + "<br>";
            } else {
                title = statsCol.frontColName + ": [" + formatNumber(d[xName]) +
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

    function getChart() {
        return d3.select("#profile-chart .groupbyChart .barChart");
    }


    function resizeChart() {
        if (statsCol.groupByInfo &&
            statsCol.groupByInfo.isComplete === true)
        {
            buildGroupGraphs(null, true);
            var $scroller = $modal.find(".scrollSection .scroller");
            resizeScroller();
            var curRowNum = Number($skipInput.val());
            // if not add scolling class,
            // will have a transition to cause a lag
            $scroller.addClass("scrolling");
            positionScrollBar(null, curRowNum);
            // without setTimout will still have lag
            setTimeout(function() {
                $scroller.removeClass("scrolling");
            }, 1);
        }
    }

    function formatNumber(num) {
        if (num == null) {
            console.warn("cannot format empty or null value");
            return "";
        } else if (isNaN(num)) {
            return num;
        }
        // if not speify maximumFractionDigits, 168711.0001 will be 168,711
        return num.toLocaleString("en", {"maximumFractionDigits": "5"});
    }

    function resetScrollBar(updateRowInfo) {
        if (totalRows <= numRowsToFetch) {
            $modal.addClass("noScrollBar");
        } else {
            $modal.removeClass("noScrollBar");
        }

        if (!updateRowInfo) {
            $modal.find(".scroller").css("left", 0);
        }

        resizeScroller();
    }

    function resizeScroller() {
        var $section = $modal.find(".scrollSection");
        var $scrollBar = $section.find(".scrollBar");
        var $scroller = $scrollBar.find(".scroller");

        // the caculation is based on: if totalRows === numRowsToFetch,
        // then scrollerWidth == scrollBarWidth
        var scrollBarWidth = $scrollBar.width();
        var scrollerWidth = Math.floor(scrollBarWidth * numRowsToFetch / totalRows);
        scrollerWidth = Math.min(scrollerWidth, scrollBarWidth);
        scrollerWidth = Math.min(scrollBarWidth - 10, scrollerWidth);
        scrollerWidth = Math.max(25, scrollerWidth);
        $scroller.width(scrollerWidth);
    }

    function setupScrollBar() {
        var $section = $modal.find(".scrollSection");
        var $scrollerArea = $section.find(".rowScrollArea");
        // move scroll bar event, setup it here since we need statsCol info
        var $scrollerBar = $scrollerArea.find(".scrollBar");
        var $scroller = $scrollerArea.find(".scroller");
        var isDragging = false;
        var xDiff = 0;

        // this use mousedown and mouseup to mimic click
        $scrollerBar.on("mousedown", function() {
            isDragging = true;
            xDiff = 0;
        });

        // mimic move of scroller
        $scrollerBar.on("mousedown", ".scroller", function(event) {
            event.stopPropagation();
            isDragging = true;
            $scroller.addClass("scrolling");
            $modal.addClass("dragging");
            // use xDiff to get the position of the most left of scroller
            xDiff = event.pageX - $scroller.offset().left;
        });

        $(document).on({
            "mouseup.profileModal": function(event) {
                if (isDragging === true) {
                    $scroller.removeClass("scrolling");
                    var mouseX = event.pageX - $scrollerBar.offset().left - xDiff;
                    var rowPercent = mouseX / $scrollerBar.width();
                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));

                    if (xDiff !== 0) {
                        // when it's dragging the scroller,
                        // not clicking on scrollbar
                        var scrollerRight = $scroller.offset().left +
                                            $scroller.width();
                        var scrollBarRight = $scrollerBar.offset().left +
                                             $scrollerBar.width();
                        if (scrollerRight >= scrollBarRight) {
                            rowPercent = 1 - numRowsToFetch / totalRows;
                        }
                    }

                    positionScrollBar(rowPercent);
                    $modal.removeClass("dragging");
                }
                isDragging = false;
            },
            "mousemove.profileModal": function(event) {
                if (isDragging) {
                    var mouseX = event.pageX - $scrollerBar.offset().left - xDiff;
                    var rowPercent = mouseX / $scrollerBar.width();
                    // make sure rowPercent in [0, 1]
                    rowPercent = Math.min(1, Math.max(0, rowPercent));
                    var left = getPosition(rowPercent, $scroller, $scrollerBar);
                    $scroller.css("left", left);
                }
            }
        });
    }

    function getPosition(percent, $scroller, $scrollerBar) {
        precent = Math.min(99.9, Math.max(0, percent * 100));
        var barWidth =  $scrollerBar.width();
        var position = barWidth * percent;

        position = Math.max(0, position);
        position = Math.min(position, barWidth - $scroller.width());

        return (position + "px");
    }

    function positionScrollBar(rowPercent, rowNum, forceUpdate) {
        var left;
        var isFromInput = false;
        var $section = $modal.find(".scrollSection");
        var $scrollBar = $section.find(".scrollBar");
        var $scroller = $scrollBar.find(".scroller");

        if (rowNum != null) {
            isFromInput = true;
            rowPercent = (totalRows === 1) ?
                                        0 : (rowNum - 1) / (totalRows - 1);
        } else {
            rowNum = Math.ceil(rowPercent * (totalRows - 1)) + 1;
        }
        var tempRowNum = rowNum;

        if ($skipInput.data("rowNum") === rowNum) {
            // case of going to same row
            // put the row scoller in right place
            $skipInput.val(rowNum);
            left = getPosition(rowPercent, $scroller, $scrollBar);
            $scroller.css("left", left);

            if (!forceUpdate) {
                return;
            }
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

            var oldLeft = getPosition(rowPercent, $scroller, $scrollBar);
            if (isFromInput) {
                rowPercent = (totalRows === 1) ?
                                        0 : (rowNum - 1) / (totalRows - 1);

                left = getPosition(rowPercent, $scroller, $scrollBar);
                $scroller.addClass("scrolling")
                    .css("left", oldLeft);

                // use setTimout to have the animation
                setTimeout(function() {
                    $scroller.removeClass("scrolling")
                        .css("left", left);
                }, 1);
            } else {
                $scroller.css("left", oldLeft);
            }
        } else {
            left = getPosition(rowPercent, $scroller, $scrollBar);
            $scroller.css("left", left);

            rowsToFetch = numRowsToFetch;
        }

        $skipInput.val(tempRowNum).data("rowNum", tempRowNum);

        // disable another fetching data event till this one done
        $section.addClass("disabled");

        var loadTimer = setTimeout(function() {
            // if the loading time is long, show the waiting icon
            $modal.addClass("loading");
        }, 500);

        var rowPosition = rowNum - 1;
        groupByData = [];

        setArrows(null, true);
        fetchGroupbyData(rowPosition, rowsToFetch)
        .then(function() {
            toggleFilterOption(true);
            groupByData = addNullValue(groupByData);
            buildGroupGraphs(forceUpdate);
            $modal.removeClass("loading");
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

    function setArrows(rowNum, fetchingData) {
        var $groupbySection = $modal.find(".groubyInfoSection");
        var $leftArrow = $groupbySection.find(".left-arrow");
        var $rightArrow = $groupbySection.find(".right-arrow");

        if (fetchingData) {
            $leftArrow.addClass("disabled");
            $rightArrow.addClass("disabled");
            return;
        }

        $leftArrow.removeClass("disabled");
        $rightArrow.removeClass("disabled");

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
        var curRowNum = Number($skipInput.val());

        if (isLeft) {
            curRowNum -= numRowsToFetch;
        } else {
            curRowNum += numRowsToFetch;
        }

        curRowNum = Math.max(1, curRowNum);
        curRowNum = Math.min(curRowNum, totalRows);

        positionScrollBar(null, curRowNum);
    }

    function updateRowsToFetch(newRowsToFetch) {
        newRowsToFetch = Math.max(newRowsToFetch, minRowsToFetch);
        newRowsToFetch = Math.min(newRowsToFetch, maxRowsToFetch);

        numRowsToFetch = newRowsToFetch;

        var curRowNum = Number($skipInput.val());
        resetRowsInfo();
        resetScrollBar(true);
        positionScrollBar(null, curRowNum, true);
    }

    function resetGroupbyInfo() {
        resetScrollBar();
        resetRowInput();
        resetSortInfo();
        toggleFilterOption(true);
        resetRowsInfo();
    }

    function resetRowsInfo() {
        var $disaplyInput = $modal.find(".disaplyInput");
        var $activeRange = $rangeSection.find(".radioButton.active");
        var rowsToShow;
        var $moreBtn = $disaplyInput.find(".more").removeClass("xc-disabled");
        var $lessBtn = $disaplyInput.find(".less").removeClass("xc-disabled");

        if ($activeRange.data("option") === "fitAll" ||
            totalRows <= minRowsToFetch)
        {
            // case that cannot show more or less results
            rowsToShow = totalRows;
            $moreBtn.addClass("xc-disabled");
            $lessBtn.addClass("xc-disabled");
        } else {
            numRowsToFetch = Math.min(numRowsToFetch, totalRows);

            if (numRowsToFetch <= minRowsToFetch) {
                $lessBtn.addClass("xc-disabled");
            }

            if (numRowsToFetch >= maxRowsToFetch ||
                numRowsToFetch >= totalRows)
            {
                $moreBtn.addClass("xc-disabled");
            }

            rowsToShow = numRowsToFetch;
        }

        $disaplyInput.find(".numRows").val(rowsToShow);
    }

    function resetRowInput() {
        // total row might be 0 in error case
        var rowNum = (totalRows <= 0) ? 0 : 1;
        $skipInput.val(rowNum).data("rowNum", rowNum);
        var $maxRange = $skipInput.siblings(".max-range");

        // set width of elements
        $maxRange.text(totalRows.toLocaleString());
        $skipInput.width($maxRange.width() + 5); // 5 is for input padding
    }

    function resetSortInfo() {
        var $sortSection = $modal.find(".sortSection");
        var $activeSort = $sortSection.find(".active");
        $activeSort.removeClass("active");

        $sortSection.find("." + order).addClass("active");
    }

    function sortData(newOrder, curStatsCol) {
        if (order === newOrder) {
            return;
        }

        curStatsCol.groupByInfo.isComplete = "running";

        var refreshTimer = setTimeout(function() {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshGroupbyInfo(true);
            }
        }, 500);

        var sql = {
            "operation" : SQLOps.ProfileSort,
            "order"     : newOrder,
            "tableId"   : curTableId,
            "colNum"    : curColNum,
            "bucketSize": bucketNum,
            "modalId"   : statsCol.modalId
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileSort,
            "sql"      : sql
        });

        runSort(newOrder, curStatsCol, txId)
        .then(function() {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            order = newOrder;
            curStatsCol.groupByInfo.isComplete = true;
            refreshGroupbyInfo(true);

            Transaction.done(txId);
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            curStatsCol.groupByInfo.isComplete = true;
            failureHandler(curStatsCol, error, txId);
        });
    }

    function runSort(newOrder, curStatsCol, txId) {
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

            var xcOrder;
            if (sortOrder === sortMap.desc) {
                xcOrder = XcalarOrderingT.XcalarOrderingDescending;
            } else {
                xcOrder = XcalarOrderingT.XcalarOrderingAscending;
            }

            XcalarIndexFromTable(tableName, colName, newTableName, xcOrder, txId)
            .then(function() {
                innerDeferred.resolve(newTableName);
            })
            .fail(innerDeferred.reject);

            return (innerDeferred.promise());
        }

        return (deferred.promise());
    }

    function toggleRange(rangeOption, reset) {
        var bucketSize;

        switch (rangeOption) {
            case "range":
                // go to range
                bucketSize = $rangeInput.val();
                break;
            case "fitAll":
                // fit all
                // if max = 100, min = 0, numRowsToFetch = 20,
                // (max - min) / numRowsToFetch will get bucketSize 5
                // but range [100, 105) is the 21th size,
                // so we should do (max + min + numRowsToFetch) / numRowsToFetch
                bucketSize = (statsCol.aggInfo.max - statsCol.aggInfo.min +
                              numRowsToFetch) / numRowsToFetch;
                if (bucketSize >= 0.01) {
                    // have mostly two digits after decimal
                    bucketSize = Math.round(bucketSize * 100) / 100;
                }
                break;
            case "single":
                // go to single
                var curBucketNum = Number($rangeInput.val());
                if (isNaN(curBucketNum) || curBucketNum <= 0) {
                    // for invalid case or original case(bucketNum = 0)
                    // clear input
                    $rangeInput.val("");
                }
                bucketSize = 0;
                break;
            default:
                console.error("Error Case");
                return;
        }

        if (!reset) {
            bucketData(bucketSize, statsCol);
        } else {
            $rangeSection.find(".active").removeClass("active")
                        .end()
                        .find(".single").addClass("active");
            $rangeInput.val("");
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
                refreshGroupbyInfo(true);
            }
        }, 500);

        var sql = {
            "operation" : SQLOps.ProfileBucketing,
            "bucketSize": newBucketNum,
            "tableId"   : curTableId,
            "colNum"    : curColNum,
            "modalId"   : statsCol.modalId
        };
        var txId = Transaction.start({
            "operation": SQLOps.ProfileBucketing,
            "sql"      : sql
        });

        runBucketing(newBucketNum, curStatsCol, txId)
        .then(function() {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            bucketNum = newBucketNum;
            order = sortMap.origin; // reset to normal order
            curStatsCol.groupByInfo.isComplete = true;

            refreshGroupbyInfo(true);
            Transaction.done(txId);
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            curStatsCol.groupByInfo.isComplete = true;
            failureHandler(curStatsCol, error, txId);
        });
    }

    function runBucketing(newBucketNum, curStatsCol, txId) {
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
        // both "a\.b" and "a.b" will become "a\.b" after groupby
        colName = xcHelper.unescapeColName(colName);
        colName = xcHelper.escapeColName(colName);
        var mapCol = xcHelper.randName("bucketMap", 4);

        // example map(mult(floor(div(review_count, 10)), 10))
        var mapString = "mult(floor(div(" + colName + ", " + newBucketNum +
                        ")), " + newBucketNum + ")";

        XIApi.map(txId, mapString, tableName, mapCol, mapTable)
        .then(function() {
            indexTable = getNewName(mapTable, ".index", true);
            return XcalarIndexFromTable(mapTable, mapCol, indexTable,
                                        XcalarOrderingT.XcalarOrderingUnordered,
                                        txId);
        })
        .then(function() {
            var operator    = AggrOp.Sum;
            var newColName  = bucketColName;
            var isIncSample = false;

            groupbyTable = getNewName(mapTable, ".groupby", true);

            return XcalarGroupBy(operator, newColName, statsColName,
                                    indexTable, groupbyTable,
                                    isIncSample, false, txId);
        })
        .then(function() {
            finalTable = getNewName(mapTable, ".final", true);
            return XcalarIndexFromTable(groupbyTable, mapCol, finalTable,
                                        XcalarOrderingT.XcalarOrderingAscending,
                                        txId);
        })
        .then(function() {
            var def1 = getAggResult(bucketColName, finalTable, aggMap.max, txId);
            var def2 = getAggResult(bucketColName, finalTable, aggMap.sum, txId);
            return PromiseHelper.when(def1, def2);
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
            var def1 = XcalarDeleteTable(mapTable, txId);
            var def2 = XcalarDeleteTable(indexTable, txId);

            // Note that grouby table can not delete because when
            // sort bucket table it looks for the unsorted table,
            // which is this one

            PromiseHelper.when(def1, def2)
            .always(function() {
                deferred.resolve();
            });
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function highlightBar(rowNum) {
        if (rowNum == null) {
            rowNum = Number($skipInput.val());
        }
        if (rowNum < 1) {
            // 0 is nullVal, < 0 is invalid value
            return;
        }

        var chart = getChart();
        chart.selectAll(".barArea")
        .each(function(d) {
            var bar = d3.select(this);
            if (d.rowNum === rowNum) {
                bar.classed("highlight", true);
            } else {
                bar.classed("highlight", false);
            }
        });
    }

    function resetTooltip(rowToHover) {
        if (rowToHover != null) {
            rowToHover = Number(rowToHover);
        }

        $(".barArea").tooltip("hide");

        var chart = getChart();
        var barArea = null;
        chart.selectAll(".barArea")
        .each(function(d) {
            var bar = d3.select(this);
            if (rowToHover != null && d.rowNum === rowToHover) {
                barArea = this;
                bar.classed("hover", true);
            } else {
                bar.classed("hover", false);
            }
        });

        if (barArea != null) {
            $(barArea).tooltip("show");
        }
    }

    function createFilterSelection(startX, startY) {
        var bound = $("#profile-chart").get(0).getBoundingClientRect();

        function FilterSelection(x, y) {
            var self = this;
            // move it 1px so that the filterSelection
            // not stop the click event to toggle percertageLabel
            // to be trigger
            self.x = x + 1;
            self.y = y;

            var left = self.x - bound.left;
            var top = self.y - bound.top;

            var html = '<div id="profile-filterSelection" style="left:' + left +
                        'px; top:' + top + 'px; width:0; height:0;"></div>';

            $("#profile-filterSelection").remove();
            $("#profile-filterOption").fadeOut(200);
            $("#profile-chart").append(html);
            $modal.addClass("drawing")
                .addClass("selecting");
            addSelectRectEvent(self);

            return self;
        }

        function addSelectRectEvent(selectRect) {
            $(document).on("mousemove.checkMovement", function(event) {
                // check for mousemovement before actually calling draw
                selectRect.checkMovement(event.pageX, event.pageY);
            });

            $(document).on("mouseup.selectRect", function() {
                selectRect.end();
                $(document).off(".selectRect");
                $(document).off("mousemove.checkMovement");
                $modal.removeClass("selecting");
            });
        }

        FilterSelection.prototype = {
            "checkMovement": function (x, y) {
                var self = this;
                if (Math.abs(x - self.x) > 0 || Math.abs(y - self.y) > 0) {
                    filterDragging = true;
                    $(document).off('mousemove.checkMovement');
                    $(document).on("mousemove.selectRect", function(event) {
                        self.draw(event.pageX, event.pageY);
                    });
                }
            },
            "draw": function(x, y) {
                // x should be within bound.left and bound.right
                x = Math.max(bound.left, Math.min(bound.right, x));
                // y should be within boud.top and bound.bottom
                y = Math.max(bound.top, Math.min(bound.bottom, y));

                // update rect's position
                var left;
                var top;
                var w = x - this.x;
                var h = y - this.y;
                var $rect = $("#profile-filterSelection");

                if (w >= 0) {
                    left = this.x - bound.left;
                } else {
                    left = x - bound.left;
                    w = -w;
                }

                if (h >= 0) {
                    top = this.y - bound.top;
                } else {
                    top = y - bound.top;
                    h = -h;
                }

                var bottom = top + h;
                var right = left + w;

                $rect.css("left", left)
                    .css("top", top)
                    .width(w)
                    .height(h);

                var chart = getChart();
                chart.selectAll(".barArea").each(function() {
                    var barArea = this;
                    var barBound = barArea.getBoundingClientRect();
                    var barTop = barBound.top - bound.top;
                    var barLeft = barBound.left - bound.left;
                    var barRight = barBound.right - bound.left;

                    if (bottom < barTop || right < barLeft || left > barRight) {
                        d3.select(this).classed("selecting", false);
                    } else {
                        d3.select(this).classed("selecting", true);
                    }
                });
            },

            "end": function() {
                $("#profile-filterSelection").remove();
                $modal.removeClass("drawing");

                var chart = getChart();
                var barToSelect = chart.selectAll(".barArea.selecting");
                var barAreas = chart.selectAll(".barArea");
                if (barToSelect.size() === 0) {
                    barAreas.each(function() {
                        d3.select(this)
                        .classed("unselected", false)
                        .classed("selected", false);
                    });
                } else {
                    barAreas.each(function() {
                        var barArea = d3.select(this);
                        if (barArea.classed("selecting")) {
                            barArea
                            .classed("selecting", false)
                            .classed("unselected", false)
                            .classed("selected", true);
                        } else {
                            barArea
                            .classed("unselected", true)
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
        };

        return new FilterSelection(startX, startY);
    }

    function toggleFilterOption(isHidden) {
        var $filterOption = $("#profile-filterOption");
        var chart = getChart();
        var bars = chart.selectAll(".barArea.selected");
        var barsSize = bars.size();
        // var $bars = $modal.find(".groupbyChart .barArea.selected");

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
                // move the optoin label as right as possible
                right -= (w + 5);
            }

            $filterOption.css({
                "right" : right,
                "bottom": bottom
            }).show();
        }
    }

    function filterSelectedValues(operator) {
        var noBucket = (bucketNum === 0) ? 1 : 0;
        var noSort = (order === sortMap.origin);
        var tableInfo = statsCol.groupByInfo.buckets[bucketNum];
        var bucketSize = tableInfo.bucketSize;
        var xName = tableInfo.colName;
        var uniqueVals = {};
        var isExist = false;

        var colName = statsCol.colName;
        // in case close modal clear curTableId
        var filterTableId = curTableId;
        var isString = (statsCol.type === "string");
        var chart = getChart();

        chart.selectAll(".barArea.selected").each(function(d) {
            var rowNum = d.rowNum;
            if (isNaN(rowNum)) {
                console.error("invalid row num!");
            } else {
                if (d.type === "nullVal") {
                    isExist = true;
                } else {
                    var val = d[xName];
                    if (isString) {
                        val = JSON.stringify(val);
                    }

                    uniqueVals[val] = true;
                }
            }
        });

        var options;
        var isNumber = isTypeNumber(statsCol.type);
        if (isNumber && noSort) {
            // this suit for numbers
            options = getNumFltOpt(operator, colName,
                                    uniqueVals, isExist, bucketSize);
        } else if (noBucket) {
            options = xcHelper.getFilterOptions(operator, colName,
                                                    uniqueVals, isExist);
        } else {
            options = getBucketFltOpt(operator, colName, uniqueVals,
                                      isExist, bucketSize);
        }

        if (options != null) {
            var colNum = gTables[filterTableId].getColNumByBackName(colName);
            closeProfileModal();
            xcFunction.filter(colNum, filterTableId, options);
        }
    }

    function fltExist(operator, colName, fltStr) {
        if (operator === FltOp.Filter) {
            if (fltStr === "" || fltStr == null) {
                fltStr = "not(exists(" + colName + "))";
            } else {
                fltStr = "or(" + fltStr + ", not(exists(" + colName + ")))";
            }
        } else if (operator === FltOp.Exclude) {
            if (fltStr === "" || fltStr == null) {
                fltStr = "exists(" + colName + ")";
            } else {
                fltStr = "and(" + fltStr + ", exists(" + colName + "))";
            }
        }

        return fltStr;
    }

    function getBucketFltOpt(operator, colName, uniqueVals, isExist, bucketSize) {
        var colVals = [];

        for (var val in uniqueVals) {
            colVals.push(Number(val));
        }

        var str = "";
        var len = colVals.length;

        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "or(and(ge(" + colName + ", " + colVals[i] + "), " +
                                  "lt(" + colName + ", " +
                                    (colVals[i] + bucketSize) + ")), ";
                }

                str += "and(ge(" + colName + ", " + colVals[i] + "), " +
                           "lt(" + colName + ", " +
                            (colVals[i] + bucketSize) + ")";

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }
        } else if (operator === FltOp.Exclude){
            if (len > 0) {
                for (var i = 0; i < len - 1; i++) {
                    str += "and(or(lt(" + colName + ", " + colVals[i] + "), " +
                                    "ge(" + colName + ", " +
                                    (colVals[i] + bucketSize) + ")), ";
                }

                str += "or(lt(" + colName + ", " + colVals[i] + "), " +
                          "ge(" + colName + ", " +
                            (colVals[i] + bucketSize) + ")";

                for (var i = 0; i < len; i++) {
                    str += ")";
                }
            }
        } else {
            console.error("error case");
            return null;
        }

        if (isExist) {
            if (len > 0) {
                str = fltExist(operator, colName, str);
            } else {
                str = fltExist(operator, colName);
            }
        }

        return {
            "operator"    : operator,
            "filterString": str
        };
    }

    function getNumFltOpt(operator, colName, uniqueVals, isExist, bucketSize) {
        // this suit for numbers that are unsorted by count
        var min = Number.MAX_VALUE;
        var max = Number.MIN_VALUE;
        var str = "";
        var count = 0;

        bucketSize = bucketSize || 0;

        for (var val in uniqueVals) {
            var num = Number(val);
            min = Math.min(num, min);
            max = Math.max(num + bucketSize, max);
            count++;
        }

        if (bucketSize === 0) {
            if (operator === FltOp.Filter) {
                if (count > 1) {
                    // [min, max]
                    str = "and(ge(" + colName + ", " + min + "), " +
                              "le(" + colName + ", " + max + "))";
                } else if (count === 1) {
                    str = "eq(" + colName + ", " + min + ")";
                }
            } else if (operator === FltOp.Exclude) {
                if (count > 1) {
                    // exclude [min, max]
                    str = "or(lt(" + colName + ", " + min + "), " +
                             "gt(" + colName + ", " + max + "))";
                } else if (count === 1) {
                    str = "not(eq(" + colName + ", " + min + "))";
                }
            } else {
                return null;
            }
        } else {
            // bucket case
            if (operator === FltOp.Filter) {
                if (count > 0) {
                    // should be [min, max)
                    str = "and(ge(" + colName + ", " + min + "), " +
                              "lt(" + colName + ", " + max + "))";
                }
            } else if (operator === FltOp.Exclude) {
                // should exclude [min, max)
                if (count > 0) {
                    str = "or(lt(" + colName + ", " + min + "), " +
                             "ge(" + colName + ", " + max + "))";
                }
            } else {
                return null;
            }
        }

        if (isExist) {
            if (count > 0) {
                str = fltExist(operator, colName, str);
            } else {
                str = fltExist(operator, colName);
            }
        }

        return {
            "operator"    : operator,
            "filterString": str
        };
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

    function isTypeNumber(type) {
        return (type === "integer" || type === "float");
    }

    function isModalVisible(curStatsCol) {
        return ($modal.is(":visible") &&
                $modal.data("id") === curStatsCol.modalId);
    }

    function failureHandler(curStatsCol, error, txId) {
        console.error("Profile error", error);
        curStatsCol.groupByInfo.isComplete = false;
        if (isModalVisible(curStatsCol)) {
            if (txId != null) {
                Transaction.fail(txId, {
                    "failMsg": StatusMessageTStr.ProfileFailed,
                    "noAlert": true
                });
            }

            if (typeof error === "object") {
                error = error.error;
            }

            $modal.removeClass("loading");
            $modal.find(".loadHidden").removeClass("hidden")
                                    .removeClass("disabled");
            $modal.find(".loadDisabled").removeClass("disabled");
            $modal.find(".groubyInfoSection").addClass("hidden");
            $modal.find(".errorSection").removeClass("hidden")
                .find(".text").text(error);

            resetGroupbyInfo();
        }
    }

    return (Profile);
}(jQuery, {}, d3));
