/*
    Known Issues:
    - Cannot filter by 'Other' in piechart
    - How to handle Bucketing with 'Other'
*/
window.Profile = (function($, Profile, d3) {
    var $modal;        // $("#profileModal");
    var $rangeSection; // $modal.find(".rangeSection");
    var $rangeInput;   // $("#profile-range");
    var $skipInput;    // $("#profile-rowInput")

    var modalHelper;
    // constants
    var aggKeys = ["min", "average", "max", "count", "sum", "sd"];

    var statsKeyMap = {
        "zeroQuartile": "zeroQuartile",
        "lowerQuartile": "lowerQuartile",
        "median": "median",
        "upperQuartile": "upperQuartile",
        "fullQuartile": "fullQuartile"
    };
    var sortMap = {
        "asc": "asc",
        "origin": "origin",
        "desc": "desc",
        "ztoa": "ztoa"
    };

    var statsColName = "statsGroupBy";
    var bucketColName = "bucketGroupBy";
    var defaultRowsToFetch = 20;
    var minRowsToFetch = 10;
    var maxRowsToFetch = 100;
    var decimalLimit = 5;

    var statsInfos = {};
    var bucketCache = {};

    // data with initial value
    var curTableId = null;
    var curColNum = null;
    var groupByData = [];
    var bucketNum = 0;
    var decimalNum = -1;
    var order = sortMap.origin;
    var statsCol = null;
    var percentageLabel = false;
    var numRowsToFetch = defaultRowsToFetch;
    var filterDragging = false;
    var chartType = "bar";
    var radius;

    Profile.setup = function() {
        ProfileEngine.setup({
            "sortMap": sortMap,
            "aggKeys": aggKeys,
            "statsKeyMap": statsKeyMap,
            "statsColName": statsColName,
            "bucketColName": bucketColName
        });

        $modal = $("#profileModal");
        $rangeSection = $modal.find(".rangeSection");
        $rangeInput = $("#profile-range");
        $skipInput = $("#profile-rowInput");

        modalHelper = new ModalHelper($modal, {
            "resizeCallback": resizeChart,
            "noEnter": true
        });

        $modal.on("click", ".close", function() {
            closeProfileModal();
        });

        $modal.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        // show tootip in barArea and do not let in blink in padding
        $modal.on("mouseover", ".area", function(event) {
            event.stopPropagation();
            var rowToHover = null;
            if (!$modal.hasClass("drawing") && isBarChart()) {
                rowToHover = d3.select(this).attr("data-rowNum");
            }
            resetTooltip(this, rowToHover);
        });

        $modal.on("mouseout", ".pieChart .area", function() {
            resetTooltip();
        });

        $modal.on("mouseover", function() {
            resetTooltip();
        });

        // only trigger in padding area btw bars
        $modal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $modal.on("click", ".graphSwitch", function() {
            if ($(this).hasClass("on")) {
                $(this).removeClass("on");
            } else {
                $(this).addClass("on");
            }

            if (chartType === "bar") {
                chartType = "pie";
            } else if (chartType === "pie") {
                $("#profile-chart .groupbyChart")
                    .removeAttr("viewBox")
                    .removeAttr("preserveAspectRatio");
                chartType = "bar";
            }
            buildGroupGraphs(statsCol, true, false);
        });

        var $groupbySection = $modal.find(".groupbyInfoSection");

        $groupbySection.on("click", ".clickable", function(event) {
            if (event.which !== 1) {
                return;
            }

            if (filterDragging) {
                filterDragging = false;
                return;
            }
            percentageLabel = !percentageLabel;
            $(this).tooltip("hide");
            buildGroupGraphs(statsCol);
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
            if (chartType === "bar") {
                createFilterSelection(event.pageX, event.pageY);
            } else if (chartType === "pie") {
                pieCreateFilterSelection(event.pageX, event.pageY);
            }
        });

        // event on sort section
        var $sortSection = $modal.find(".sortSection");
        xcHelper.optionButtonEvent($sortSection, function(option) {
            if (option === "asc") {
                sortData(sortMap.asc, statsCol);
            } else if (option === "desc") {
                sortData(sortMap.desc, statsCol);
            } else if (option === "ztoa") {
                sortData(sortMap.ztoa, statsCol);
            } else {
                sortData(sortMap.origin, statsCol);
            }
        });

        var skipInputTimer;
        $skipInput.on("keypress", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var num = Number($input.val());
                var totalRows = ProfileEngine.getTableRowNum();

                if (!isNaN(num)) {
                    clearTimeout(skipInputTimer);
                    skipInputTimer = setTimeout(function() {
                        num = Math.min(num, totalRows);
                        num = Math.max(num, 1);
                        positionScrollBar(null, num)
                        .then(function(finalRowNum) {
                            highlightBar(finalRowNum);
                        });
                    }, 100);
                } else {
                    // when input is invalid
                    $input.val($input.data("rowNum"));
                }
                $input.blur();
            }
        });

        // event on displayInput
        $modal.find(".displayInput").on("click", ".action", function() {
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

        // event on decimalInput
        var $decimalInput = $modal.find(".decimalInput");
        $decimalInput.on("click", ".action", function() {
            if ($(this).hasClass("more")) {
                decimalNum++;
            } else {
                decimalNum--;
            }

            updateDecimalInput(decimalNum);
        });

        $decimalInput.on("keydown", "input", function(event) {
            if (event.which === keyCode.Enter) {
                var $input = $(this);
                var val = $input.val();
                if (val === "") {
                    decimalNum = -1;
                } else {
                    val = Number(val);
                    if (val < 0 || val > decimalLimit ||
                        !Number.isInteger(val)) {
                        var err = xcHelper.replaceMsg(ErrWRepTStr.IntInRange, {
                            "lowerBound": 0,
                            "upperBound": decimalLimit
                        });
                        StatusBox.show(err, $input, true);
                        return;
                    } else {
                        decimalNum = val;
                    }
                }
                updateDecimalInput(decimalNum);
            }
        });
        $("#profile-filterOption").on("mousedown", ".option", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $option = $(this);
            if (chartType === "bar") {
                if ($option.hasClass("filter")) {
                    filterSelectedValues(FltOp.Filter);
                } else if ($option.hasClass("exclude")) {
                    filterSelectedValues(FltOp.Exclude);
                } else {
                    toggleFilterOption(true);
                }
            } else if (chartType === "pie") {
                if ($option.hasClass("filter")) {
                    pieFilterSelectedValues(FltOp.Filter);
                } else if ($option.hasClass("exclude")) {
                    pieFilterSelectedValues(FltOp.Exclude);
                } else {
                    pieToggleFilterOption(true);
                }
            }
        });

        $("#profile-download").click(function() {
            var $btn = $(this);
            xcHelper.disableSubmit($btn);
            downloadProfileAsPNG()
            .always(function() {
                xcHelper.enableSubmit($btn);
            });
        });

        setupRangeSection();
        setupStatsSection();
    };

    Profile.restore = function(oldInfos) {
        statsInfos = oldInfos || {};
    };

    Profile.getCache = function() {
        return (statsInfos);
    };

    Profile.deleteCache = function(tableId) {
        delete statsInfos[tableId];
    };

    Profile.copy = function(oldTableId, newTableId) {
        if (statsInfos[oldTableId] == null) {
            return;
        }

        statsInfos[newTableId] = {};
        for (var colName in statsInfos[oldTableId]) {
            var options = statsInfos[oldTableId][colName];
            statsInfos[newTableId][colName] = new ProfileInfo(options);
        }
    };

    Profile.show = function(tableId, colNum) {
        var deferred = jQuery.Deferred();

        var table = gTables[tableId];
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
                "colName": colName,
                "type": progCol.getType()
            });
        } else if (statsCol.getId() === $modal.data("id")) {
            // when same modal open twice
            deferred.resolve();
            return (deferred.promise());
        }

        // update front col name
        statsCol.frontColName = progCol.getFrontColName(true);

        showProfile();
        $modal.attr("data-state", "pending");
        generateProfile(table)
        .then(function() {
            $modal.attr("data-state", "finished");
            deferred.resolve();
        })
        .fail(function(error) {
            $modal.attr("data-state", "failed");
            console.error("Profile failed", error);
            deferred.resolve();
        });

        return (deferred.promise());
    };

    Profile.getNumRowsToFetch = function() {
        return numRowsToFetch;
    };

    Profile.refreshAgg = function(profileInfo, aggkey) {
        // modal is open and is for that column
        if (isModalVisible(profileInfo)) {
            refreshAggInfo(aggkey, profileInfo);
        }
    };

    function setupRangeSection() {
        //set up dropdown for worksheet list
        new MenuHelper($rangeSection.find(".dropDownList"), {
            "onSelect": function($li) {
                var oldRange = $rangeSection.find(".dropDownList input").val();
                if ($li.text() === oldRange) {
                    return;
                }
                var option = $li.attr("name");
                toggleRange(option);
            },
            "container": "#profileModal",
            "bounds": "#profileModal"
        }).setupListeners();

        $rangeInput.keypress(function(event) {
            if (event.which === keyCode.Enter) {
                var val = Number($rangeInput.val());
                var rangeOption = getRangeOption();
                // Note that because the input type is number,
                // any no-numeric string in the input will get ""
                // when do $rangeInput.val()
                var isValid = xcHelper.validate([
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyPositiveNumber
                    },
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyPositiveNumber,
                        "check": function() {
                            return (Number(val) <= 0);
                        }
                    },
                    {
                        "$ele": $rangeInput,
                        "error": ErrTStr.OnlyInt,
                        "check": function() {
                            return (rangeOption !== "range" &&
                                    !Number.isInteger(val));
                        }
                    }
                ]);

                if (!isValid) {
                    return;
                }
                var bucketSize = (rangeOption === "range")
                                 ? val
                                 : -val;
                bucketData(bucketSize, statsCol);
                cacheBucket(bucketSize);
            }
        });
    }

    function restoreOldBucket() {
        if (bucketCache[curTableId] != null &&
            bucketCache[curTableId][curColNum] != null) {
            var oldBucket = bucketCache[curTableId][curColNum];
            $rangeInput.val(oldBucket);
        }
    }

    function cacheBucket(bucket) {
        bucketCache[curTableId] = bucketCache[curTableId] || {};
        bucketCache[curTableId][curColNum] = bucket;
    }

    function setupStatsSection() {
        var $statsSection = $("#profile-stats");
        $statsSection.on("click", ".popBar", function() {
            $modal.toggleClass("collapse");
            resizeChart();
        });

        // do agg
        $statsSection.on("click", ".genAgg", function() {
            var $btn = $(this);
            $btn.addClass("xc-disabled");
            generateAggs()
            .always(function() {
                $btn.removeClass("xc-disabled");
            });
        });

        // do stats
        $statsSection.on("click", ".genStats", function() {
            genStats(true);
        });

        // do correlation
        $("#profile-corr").click(function() {
            var tableId = curTableId;
            var colNum = curColNum;
            var tmp = gMinModeOn;
            // use gMinMode to aviod blink in open/close modal
            gMinModeOn = true;
            closeProfileModal();
            AggModal.corrAgg(tableId, null, [colNum], colNum);
            gMinModeOn = tmp;
        });
    }

    function closeProfileModal() {
        modalHelper.clear();
        $modal.find(".groupbyChart").empty();
        ProfileEngine.clear();

        curTableId = null;
        curColNum = null;
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
        resetDecimalInput();
    }

    function generateProfile(table) {
        var deferred = jQuery.Deferred();
        var promises = [];
        var curStatsCol = statsCol;

        checkAgg(curStatsCol);
        promises.push(genStats());

        // do group by
        if (curStatsCol.groupByInfo.isComplete === true) {
            // check if the groupbyTable is not deleted
            // use XcalarGetTables because XcalarSetAbsolute cannot
            // return fail if resultSetId is not free
            var innerDeferred = jQuery.Deferred();
            var groupbyTable = curStatsCol.groupByInfo.buckets[bucketNum].table;

            ProfileEngine.checkProfileTable(groupbyTable)
            .then(function(exist) {
                if (exist) {
                    refreshGroupbyInfo(curStatsCol);
                    innerDeferred.resolve();
                } else {
                    curStatsCol.groupByInfo.isComplete = false;
                    curStatsCol.groupByInfo.buckets[bucketNum] = {};

                    runGroupby(table, curStatsCol, bucketNum)
                    .then(innerDeferred.resolve)
                    .fail(innerDeferred.reject);
                }
            })
            .fail(function(error) {
                failureHandler(curStatsCol, error);
                innerDeferred.reject(error);
            });

            promises.push(innerDeferred.promise());
        } else if (curStatsCol.groupByInfo.isComplete !== "running") {
            promises.push(runGroupby(table, curStatsCol, bucketNum));
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
        $modal.removeClass("type-number")
              .removeClass("type-boolean")
              .removeClass("type-string");

        if (isTypeNumber(statsCol.type)) {
            $modal.addClass("type-number");
        } else if (isTypeBoolean(statsCol.type)) {
            $modal.addClass("type-boolean");
        } else if (isTypeString(statsCol.type)) {
            $modal.addClass("type-string");
        }

        // hide scroll bar first
        $modal.addClass("noScrollBar");
        $modal.data("id", statsCol.getId());

        modalHelper.setup();

        resetDecimalInput();
        refreshProfile();
        setupScrollBar();
        $("#modalBackground").on("mouseover.profileModal", function() {
            resetTooltip();
        });
    }

    // refresh profile
    function refreshProfile() {
        var instr = xcHelper.replaceMsg(ProfileTStr.Info, {
            "col": statsCol.frontColName,
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

        refreshAggInfo(aggKeys, statsCol, true);
        refreshStatsInfo(statsCol);
        resetGroupbySection();
        restoreOldBucket();
    }

    function resetGroupbySection(resetRefresh) {
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
    }

    function refreshGroupbyInfo(curStatsCol, resetRefresh) {
        var deferred = jQuery.Deferred();
        var $loadHiddens = $modal.find(".loadHidden");
        var $loadDisables = $modal.find(".loadDisabled");

        // This function never deferred.reject
        resetGroupbySection(resetRefresh);

        // update groupby info
        if (curStatsCol.groupByInfo.isComplete === true) {
            // data is ready
            groupByData = [];

            if (curStatsCol.groupByInfo.allNull) {
                $modal.addClass("allNull");
            }

            var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
            var tableName;

            if (order === sortMap.asc) {
                tableName = tableInfo.ascTable;
            } else if (order === sortMap.desc) {
                tableName = tableInfo.descTable;
            } else if (order === sortMap.ztoa) {
                tableName = tableInfo.ztoaTable;
            } else {
                tableName = tableInfo.table;
            }

            ProfileEngine.setProfileTable(tableName, numRowsToFetch)
            .then(function(data) {
                $modal.removeClass("loading");
                $loadHiddens.removeClass("hidden").removeClass("disabled");
                $loadDisables.removeClass("disabled");

                resetGroupbyInfo();

                groupByData = addNullValue(curStatsCol, data);
                buildGroupGraphs(curStatsCol, true);
                setArrows(1);
                deferred.resolve();
            })
            .fail(function(error) {
                failureHandler(curStatsCol, error);
                // Since we have already cleaned up here, we no longer need our
                // caller to clean up for us. So we can resolve here
                deferred.resolve();
            });
        } else {
            // the data is loading, show loadingSection and hide groupby section
            deferred.resolve();
        }

        return deferred.promise();
    }

    function refreshAggInfo(aggKeysToRefesh, curStatsCol, isStartUp) {
        // update agg info
        var $infoSection = $("#profile-stats");
        if (!(aggKeysToRefesh instanceof Array)) {
            aggKeysToRefesh = [aggKeysToRefesh];
        }

        aggKeysToRefesh.forEach(function(aggkey) {
            var aggVal = curStatsCol.aggInfo[aggkey];
            var $agg = $infoSection.find("." + aggkey);

            if (aggVal == null && !isStartUp) {
                // when aggregate is still running
                $agg.html("...")
                      .addClass("animatedEllipsis");
                xcTooltip.changeText($agg, "...");
            } else {
                var text = (aggVal != null) ? xcHelper.numToStr(aggVal) : "N/A";
                $agg.removeClass("animatedEllipsis")
                      .text(text);
                xcTooltip.changeText($agg, text);
            }
        });

        // update the section
        var notRunAgg = false;
        aggKeys.forEach(function(aggkey) {
            if (aggkey !== "count" && curStatsCol.aggInfo[aggkey] == null) {
                notRunAgg = true;
                return false; // end loop
            }
        });

        var $section = $("#profile-stats").find(".aggInfo");
        if (isStartUp) {
            $section.find(".genAgg").removeClass("xc-disabled");
        }

        if (notRunAgg) {
            $section.removeClass("hasAgg");
        } else {
            $section.addClass("hasAgg");
        }
    }

    function refreshStatsInfo(curStatsCol, forceShow) {
        // update stats info
        var $infoSection = $("#profile-stats");
        var $statsInfo = $infoSection.find(".statsInfo");

        if (curStatsCol.statsInfo.unsorted && !forceShow) {
            $statsInfo.removeClass("hasStats");
        } else {
            $statsInfo.addClass("hasStats");

            for (var key in statsKeyMap) {
                var statsKey = statsKeyMap[key];
                var statsVal = curStatsCol.statsInfo[statsKey];
                var $stats = $infoSection.find("." + statsKey);

                if (statsVal == null) {
                    // when stats is still running
                    $stats.html("...")
                          .addClass("animatedEllipsis");
                    xcTooltip.changeText($stats, "...");
                } else {
                    var text = xcHelper.numToStr(statsVal);
                    $stats.removeClass("animatedEllipsis")
                          .text(text);
                    xcTooltip.changeText($stats, text);
                }
            }
        }
    }

    function checkAgg(curStatsCol) {
        var isStr = isTypeString(curStatsCol.type);
        aggKeys.forEach(function(aggkey) {
            if (aggkey === "count") {
                if (curStatsCol.aggInfo[aggkey] == null &&
                    gTables.hasOwnProperty(curTableId) &&
                    gTables[curTableId].resultSetCount != null) {
                    var count = gTables[curTableId].resultSetCount;
                    curStatsCol.aggInfo[aggkey] = count;
                    refreshAggInfo(aggkey, curStatsCol);
                }
            } else if (isStr) {
                curStatsCol.aggInfo[aggkey] = "--";
                refreshAggInfo(aggkey, curStatsCol);
            }
        });
    }

    function generateAggs() {
        // show ellipsis as progressing
        refreshAggInfo(aggKeys, statsCol);
        var tableName = gTables[curTableId].getName();
        return ProfileEngine.genAggs(tableName, statsCol);
    }

    function genStats(sort) {
        var deferred = jQuery.Deferred();
        var curStatsCol = statsCol;
        var table = gTables[curTableId];
        var tableName = table.getName();

        if (sort) {
            // when trigger from button
            refreshStatsInfo(curStatsCol, true);
        }

        ProfileEngine.genStats(tableName, curStatsCol, sort)
        .then(function() {
            if (isModalVisible(curStatsCol)) {
                refreshStatsInfo(curStatsCol);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (isModalVisible(curStatsCol)) {
                xcHelper.showFail(FailTStr.ProfileStats);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function runGroupby(table, curStatsCol, curBucketNum) {
        if (curBucketNum !== 0) {
            return PromiseHelper.reject("Invalid bucket num");
        }

        var deferred = jQuery.Deferred();
        ProfileEngine.genProfile(curStatsCol, table)
        .then(function() {
            // modal is open and is for that column
            if (isModalVisible(curStatsCol)) {
                return refreshGroupbyInfo(curStatsCol);
            }
        })
        .then(deferred.resolve)
        .fail(function(error) {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    function addNullValue(curStatsCol, data) {
        // add col info for null value
        var nullCount = curStatsCol.groupByInfo.nullCount || 0;
        if (nullCount === 0) {
            return data;
        }

        var nullData = {
            "rowNum": 0,
            "type": "nullVal"
        };
        var colName = curStatsCol.groupByInfo.buckets[bucketNum].colName;
        nullData[colName] = "null";

        if (bucketNum === 0) {
            nullData[statsColName] = nullCount;
        } else {
            nullData[bucketColName] = nullCount;
        }

        data.unshift(nullData);
        return data;
    }

    function buildGroupGraphs(curStatsCol, initial, resize) {
        if (!isModalVisible(curStatsCol)) {
            return;
        }

        var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
        var resizeDelay = null;
        if (resize) {
            resizeDelay = 60 / defaultRowsToFetch * numRowsToFetch;
        }

        ProfileChart.build({
            "data": groupByData,
            "type": chartType,
            "bucketSize": bucketNum,
            "xName": getXName(tableInfo),
            "yName": getYName(),
            "noSort": isNoSort(),
            "nullCount": curStatsCol.groupByInfo.nullCount,
            "max": tableInfo.max,
            "sum": tableInfo.sum,
            "percentage": percentageLabel,
            "decimal": decimalNum,
            "initial": initial,
            "resize": resize,
            "resizeDelay": resizeDelay
        });
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

    // main function for deciding which arcs are selected by the rectangle
    function getSelectedArcs(bound, top, right, bottom, left, piedata) {
        var topLeftCorner = [left, top];
        var topRightCorner = [right, top];
        var bottomLeftCorner = [left, bottom];
        var bottomRightCorner = [right, bottom];
        var rectDimensions = [top, bottom, left, right];
        // var circleBox = $(".groupbyInfoSection").get(0).getBoundingClientRect();
        var corners = [topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner];
        var circleCenter = getCenterOfCircle(bound);
        var intersectsWithRect = [];

        // initially set all indicies in array to false
        for (var i = 0; i < piedata.length; i++) {
            intersectsWithRect.push(false);
        }
        for (var i = 0; i < piedata.length; i++) {
            // checks if center of circle is selected
            if (left <= circleCenter[0] && right >= circleCenter[0] &&
                top <= circleCenter[1] && bottom >= circleCenter[1]) {
                intersectsWithRect[i] = true;
                continue;
            }
            var sectorPointsIntersect = checkSectorLines(rectDimensions, piedata[i], circleCenter);
            if (sectorPointsIntersect) {
                intersectsWithRect[i] = true;
                continue;
            }
            if (lineIsInArc(rectDimensions, circleCenter, piedata[i])) {
                intersectsWithRect[i] = true;
                continue;
            }
            for (var j = 0; j < corners.length; j++) {
                if (pointLiesInArc(corners[j], circleCenter, piedata[i])) {
                    intersectsWithRect[i] = true;
                    break;
                }
            }
        }
        return intersectsWithRect;
    }

    // checks if/where the side of the selection box intersects with the piechart
    function closestRectSideToCircle(rectDimensions, circleCenter) {
        var topDistance = Math.abs(circleCenter[1] - rectDimensions[0]);
        var bottomDistance = Math.abs(circleCenter[1] - rectDimensions[1]);
        var leftDistance = Math.abs(circleCenter[0] - rectDimensions[2]);
        var rightDistance = Math.abs(circleCenter[0] - rectDimensions[3]);
        var cornerQuadrants = [getCornerQuadrant([rectDimensions[2], rectDimensions[0]], circleCenter),
                               getCornerQuadrant([rectDimensions[3], rectDimensions[0]], circleCenter),
                               getCornerQuadrant([rectDimensions[2], rectDimensions[1]], circleCenter),
                               getCornerQuadrant([rectDimensions[3], rectDimensions[1]], circleCenter)];

        if (rightDistance <= radius && cornerQuadrants[1] === 4 && cornerQuadrants[3] === 3) {
            return 3 * Math.PI / 2;
        } else if (leftDistance <= radius && cornerQuadrants[1] === 1 && cornerQuadrants[3] === 2) {
            return Math.PI / 2;
        } else if (topDistance <= radius && cornerQuadrants[0] === 3 && cornerQuadrants[1] === 2) {
            return Math.PI;
        } else if (bottomDistance <= radius && cornerQuadrants[2] === 4 && cornerQuadrants[3] === 1) {
            return 2 * Math.PI;
        }
        return -1;
    }

    // returns true if a side of the rectangle (a line) intersects with the arc
    function lineIsInArc(rectDimensions, circleCenter, currArc) {
        var closestRectSide = closestRectSideToCircle(rectDimensions, circleCenter);

        if (closestRectSide !== -1) {
            if (currArc["startAngle"] <= closestRectSide && currArc["endAngle"] >= closestRectSide) {
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
        var distance = Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
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
            actualAngle <= currArc["endAngle"]) {
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

    function pieCreateFilterSelection(startX, startY) {
        $("#profile-filterOption").fadeOut(200);
        $modal.addClass("drawing")
            .addClass("selecting");

        return new RectSelction(startX, startY, {
            "id": "profile-filterSelection",
            "$container": $("#profile-chart"),
            "onStart": function() {
                filterDragging = true;
            },
            "onDraw": pieDrawFilterRect,
            "onEnd": pieEndDrawFilterRect
        });
    }

    function pieDrawFilterRect(bound, top, right, bottom, left) {
        var chart = d3.select("#profile-chart .groupbyChart");
        var arcsToSelect = getSelectedArcs(bound, top, right, bottom, left, getPieData(statsCol));
        chart.selectAll(".area").each(function(d, i) {
            var arc = d3.select(this);
            if (arcsToSelect[i]) {
                arc.classed("selecting", true);
            } else {
                arc.classed("selecting", false);
            }
        });
    }

    function pieEndDrawFilterRect() {
        $modal.removeClass("drawing").removeClass("selecting");
        var chart = d3.select("#profile-chart .groupbyChart");
        var arcToSelect = chart.selectAll(".area.selecting");
        var arcs = chart.selectAll(".area");
        if (arcToSelect.size() === 0) {
            arcs.each(function() {
                d3.select(this)
                    .classed("unselected", false)
                    .classed("selected", false);
            });
        } else {
            arcs.each(function() {
                var arcs = d3.select(this);
                if (arcs.classed("selecting")) {
                    arcs.classed("selecting", false)
                        .classed("unselected", false)
                        .classed("selected", true);
                } else if (!arcs.classed("selected")) {
                    arcs.classed("unselected", true)
                        .classed("selected", false);
                }
            });
        }

        // allow click event to occur before setting filterdrag to false
        setTimeout(function() {
            filterDragging = false;
        }, 10);

        pieToggleFilterOption();
    }

    function pieToggleFilterOption(isHidden) {
        var $filterOption = $("#profile-filterOption");
        var chart = d3.select("#profile-chart .groupbyChart");
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

    function pieFilterSelectedValues(operator) {
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
        var chart = d3.select("#profile-chart .groupbyChart");
        var prevRowNum;
        var isContinuous = true;

        chart.selectAll(".area.selected").each(function(d) {
            var rowNum = d.data["rowNum"];
            if (isNaN(rowNum)) {
                console.error("invalid row num!");
            } else {
                if (d.type === "nullVal") {
                    isExist = true;
                } else {
                    var val = d.data[xName];
                    if (isString) {
                        val = JSON.stringify(val);
                    }

                    uniqueVals[val] = true;
                }

                if (prevRowNum == null) {
                    prevRowNum = rowNum;
                } else if (isContinuous) {
                    isContinuous = (rowNum - 1 === prevRowNum);
                    prevRowNum = rowNum;
                }
            }
        });

        var options;
        var isNumber = isTypeNumber(statsCol.type);
        if (isNumber && noSort && isContinuous) {
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

    function isNoBucket() {
        return (bucketNum === 0) ? 1 : 0;
    }

    function isNoSort() {
        return (order === sortMap.origin);
    }

    function getXName(tableInfo) {
        return tableInfo.colName;
    }

    function getYName() {
        var noBucket = isNoBucket();
        return noBucket ? statsColName : bucketColName;
    }

    function getChart() {
        return d3.select("#profile-chart .groupbyChart .barChart");
    }

    function resizeChart() {
        if (statsCol.groupByInfo &&
            statsCol.groupByInfo.isComplete === true) {
            buildGroupGraphs(statsCol, null, true);
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

    function resetScrollBar(updateRowInfo) {
        var totalRows = ProfileEngine.getTableRowNum();
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
        var totalRows = ProfileEngine.getTableRowNum();

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
                        var totalRows = ProfileEngine.getTableRowNum();
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
                    var left = getPosition(rowPercent);
                    $scroller.css("left", left);
                }
            }
        });
    }

    function getPosition(percent) {
        precent = Math.min(99.9, Math.max(0, percent * 100));

        var $section = $modal.find(".scrollSection");
        var $scrollBar = $section.find(".scrollBar");
        var $scroller = $scrollBar.find(".scroller");

        var barWidth = $scrollBar.width();
        var position = barWidth * percent;

        position = Math.max(0, position);
        position = Math.min(position, barWidth - $scroller.width());

        return (position + "px");
    }

    function positionScrollBar(rowPercent, rowNum, forceUpdate) {
        var deferred = jQuery.Deferred();
        var left;
        var isFromInput = false;
        var $section = $modal.find(".scrollSection");
        var $scrollBar = $section.find(".scrollBar");
        var $scroller = $scrollBar.find(".scroller");
        var totalRows = ProfileEngine.getTableRowNum();

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
            left = getPosition(rowPercent);
            $scroller.css("left", left);

            if (!forceUpdate) {
                return PromiseHelper.resolve(rowNum);
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

            var oldLeft = getPosition(rowPercent);
            if (isFromInput) {
                rowPercent = (totalRows === 1) ?
                                            0 : (rowNum - 1) / (totalRows - 1);

                left = getPosition(rowPercent);
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
            left = getPosition(rowPercent);
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
        setArrows(null, true);

        var curStatsCol = statsCol;
        ProfileEngine.fetchProfileData(rowPosition, rowsToFetch)
        .then(function(data) {
            toggleFilterOption(true);

            groupByData = addNullValue(curStatsCol, data);
            buildGroupGraphs(curStatsCol, forceUpdate);
            $modal.removeClass("loading");
            clearTimeout(loadTimer);
            setArrows(tempRowNum);
            deferred.resolve(tempRowNum);
        })
        .fail(function(error) {
            failureHandler(curStatsCol, error);
            deferred.reject(error);
        })
        .always(function() {
            $section.removeClass("disabled");
        });

        return deferred.promise();
    }

    function setArrows(rowNum, fetchingData) {
        var $groupbySection = $modal.find(".groupbyInfoSection");
        var $leftArrow = $groupbySection.find(".left-arrow");
        var $rightArrow = $groupbySection.find(".right-arrow");

        if (fetchingData) {
            $leftArrow.addClass("disabled");
            $rightArrow.addClass("disabled");
            return;
        }

        $leftArrow.removeClass("disabled");
        $rightArrow.removeClass("disabled");

        var totalRows = ProfileEngine.getTableRowNum();
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
        var totalRows = ProfileEngine.getTableRowNum();
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
        var $displayInput = $modal.find(".displayInput");
        var $activeRange = $rangeSection.find(".radioButton.active");
        var rowsToShow;
        var $moreBtn = $displayInput.find(".more").removeClass("xc-disabled");
        var $lessBtn = $displayInput.find(".less").removeClass("xc-disabled");
        var totalRows = ProfileEngine.getTableRowNum();

        if ($activeRange.data("option") === "fitAll" ||
            totalRows <= minRowsToFetch) {
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
                numRowsToFetch >= totalRows) {
                $moreBtn.addClass("xc-disabled");
            }

            rowsToShow = numRowsToFetch;
        }

        $displayInput.find(".numRows").val(rowsToShow);
    }

    function resetDecimalInput() {
        decimalNum = -1;
        updateDecimalInput(decimalNum, true);
    }

    function updateDecimalInput(decimal, isReset) {
        var $decimalInput = $modal.find(".decimalInput");
        var $moreBtn = $decimalInput.find(".more").removeClass("xc-disabled");
        var $lessBtn = $decimalInput.find(".less").removeClass("xc-disabled");
        var $input = $decimalInput.find("input");

        if (decimal < 0) {
            $lessBtn.addClass("xc-disabled");
            $input.val("");
        } else {
            $input.val(decimal);
            if (decimal >= decimalLimit) {
                $moreBtn.addClass("xc-disabled");
            }
        }

        if (!isReset) {
            buildGroupGraphs(statsCol);
        }
    }

    function resetRowInput() {
        // total row might be 0 in error case
        var totalRows = ProfileEngine.getTableRowNum();
        var rowNum = (totalRows <= 0) ? 0 : 1;
        $skipInput.val(rowNum).data("rowNum", rowNum);
        var $maxRange = $skipInput.siblings(".max-range");

        // set width of elements
        $maxRange.text(xcHelper.numToStr(totalRows));
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

        $modal.attr("data-state", "pending");

        var refreshTimer = setTimeout(function() {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshGroupbyInfo(curStatsCol, true);
            }
        }, 500);

        ProfileEngine.sort(newOrder, bucketNum, curStatsCol)
        .then(function() {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            if (!isModalVisible(curStatsCol)) {
                return PromiseHelper.reject("old data");
            }

            order = newOrder;
            return refreshGroupbyInfo(curStatsCol, true);
        })
        .then(function() {
            $modal.attr("data-state", "finished");
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            failureHandler(curStatsCol, error);
        });
    }

    function getRangeOption() {
        var $rangeOption = $rangeSection.find(".dropDownList input");
        var rangeOption = ($rangeOption.val().toLowerCase() === "range")
                          ? "range"
                          : "rangeLog";
        return rangeOption;
    }

    function toggleRange(rangeOption, reset) {
        var $dropdown = $rangeSection.find(".dropDownList");
        var $li = $dropdown.find('li[name="' + rangeOption + '"]');
        $dropdown.find("input").val($li.text());
        $rangeInput.addClass("xc-disabled");

        if (reset) {
            $rangeInput.val("");
            return;
        }

        var bucketSize;
        var isFitAll = false;
        var input = Number($rangeInput.val());

        switch (rangeOption) {
            case "range":
                // go to range
                bucketSize = input;
                $rangeInput.removeClass("xc-disabled");
                break;
            case "rangeLog":
                // $rangeInput.removeClass("xc-disabled");
                // if (!Number.isInteger(input)) {
                //     $rangeInput.val("");
                //     bucketSize = 0;
                // } else {
                //     bucketSize = -Number(input);
                // }
                // Note: as it's hard to explain what't range size in log
                // now only allow size to be 1
                $rangeInput.addClass("xc-disabled");
                bucketSize = -1;
                break;
            case "fitAll":
                // fit all
                // it need async all, will get it in bucketData
                bucketSize = null;
                isFitAll = true;
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
        bucketData(bucketSize, statsCol, isFitAll);
        if (!$rangeInput.hasClass("xc-disabled")) {
            $rangeInput.focus();
        }
    }

    // UDF for log scale bucketing
    function bucketData(newBucketNum, curStatsCol, fitAll) {
        if (newBucketNum === bucketNum) {
            return;
        }

        $modal.attr("data-state", "pending");
        var refreshTimer = setTimeout(function() {
            // refresh if not complete
            if (curStatsCol.groupByInfo.isComplete === "running") {
                refreshGroupbyInfo(curStatsCol, true);
            }
        }, 500);

        var tableName = gTables[curTableId].getName();
        ProfileEngine.bucket(newBucketNum, tableName, curStatsCol, fitAll)
        .then(function(bucketSize) {
            // remove timer as first thing
            clearTimeout(refreshTimer);
            bucketNum = bucketSize;

            if (!isModalVisible(curStatsCol)) {
                return PromiseHelper.reject("old data");
            }

            order = sortMap.origin; // reset to normal order
            return refreshGroupbyInfo(curStatsCol, true);
        })
        .then(function() {
            $modal.attr("data-state", "finished");
        })
        .fail(function(error) {
            clearTimeout(refreshTimer);
            failureHandler(curStatsCol, error);
        });
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
        chart.selectAll(".area")
        .each(function(d) {
            var bar = d3.select(this);
            if (d.rowNum === rowNum) {
                bar.classed("highlight", true);
            } else {
                bar.classed("highlight", false);
            }
        });
    }

    function isBarChart() {
        return (chartType === "bar");
    }

    function resetTooltip(area, rowToHover) {
        if (rowToHover != null) {
            rowToHover = Number(rowToHover);
        }

        $modal.find(".groupbyInfoSection .area").tooltip("hide");

        var chart = getChart();

        chart.selectAll(".area")
        .each(function(d) {
            var ele = d3.select(this);
            if (rowToHover != null && d.rowNum === rowToHover) {
                ele.classed("hover", true);
            } else {
                ele.classed("hover", false);
            }
        });

        if (area != null) {
            $(area).tooltip("show");
        }
    }

    function createFilterSelection(startX, startY) {
        $("#profile-filterOption").fadeOut(200);
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
        chart.selectAll(".area").each(function() {
            var barArea = this;
            var barBound = barArea.getBoundingClientRect();
            var barTop = barBound.top - bound.top;
            var barLeft = barBound.left - bound.left;
            var barRight = barBound.right - bound.left;
            var bar = d3.select(this);
            bar.classed("highlight", false);

            if (bottom < barTop || right < barLeft || left > barRight) {
                bar.classed("selecting", false);
            } else {
                bar.classed("selecting", true);
            }
        });
    }

    function endDrawFilterRect() {
        $modal.removeClass("drawing").removeClass("selecting");
        var chart = getChart();
        var barToSelect = chart.selectAll(".area.selecting");
        var barAreas = chart.selectAll(".area");
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
                } else if (!barArea.classed("selected")) {
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

    function toggleFilterOption(isHidden) {
        var $filterOption = $("#profile-filterOption");
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
        var prevRowNum;
        var isContinuous = true;

        chart.selectAll(".area.selected").each(function(d) {
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

                if (prevRowNum == null) {
                    prevRowNum = rowNum;
                } else if (isContinuous) {
                    isContinuous = (rowNum - 1 === prevRowNum);
                    prevRowNum = rowNum;
                }
            }
        });

        var options;
        var isNumber = isTypeNumber(statsCol.type);
        if (isNumber && noSort && isContinuous) {
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
        var lowerBound;
        var upperBound;
        var i;

        if (operator === FltOp.Filter) {
            if (len > 0) {
                for (i = 0; i < len - 1; i++) {
                    lowerBound = getLowerBound(colVals[i], bucketSize);
                    upperBound = getUpperBound(colVals[i], bucketSize);
                    str += "or(and(ge(" + colName + ", " + lowerBound + "), " +
                                  "lt(" + colName + ", " + upperBound + ")), ";
                }

                lowerBound = getLowerBound(colVals[i], bucketSize);
                upperBound = getUpperBound(colVals[i], bucketSize);
                str += "and(ge(" + colName + ", " + lowerBound + "), " +
                           "lt(" + colName + ", " + upperBound + ")";

                for (i = 0; i < len; i++) {
                    str += ")";
                }
            }
        } else if (operator === FltOp.Exclude) {
            if (len > 0) {
                for (i = 0; i < len - 1; i++) {
                    lowerBound = getLowerBound(colVals[i], bucketSize);
                    upperBound = getUpperBound(colVals[i], bucketSize);
                    str += "and(or(lt(" + colName + ", " + lowerBound + "), " +
                                  "ge(" + colName + ", " + upperBound + ")), ";
                }

                lowerBound = getLowerBound(colVals[i], bucketSize);
                upperBound = getUpperBound(colVals[i], bucketSize);
                str += "or(lt(" + colName + ", " + lowerBound + "), " +
                          "ge(" + colName + ", " + upperBound + ")";

                for (i = 0; i < len; i++) {
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
            "operator": operator,
            "filterString": str
        };
    }

    function getNumFltOpt(operator, colName, uniqueVals, isExist, bucketSize) {
        // this suit for numbers that are unsorted by count
        var min = Number.MAX_VALUE;
        var max = -Number.MAX_VALUE;
        var str = "";
        var count = 0;

        bucketSize = bucketSize || 0;

        for (var val in uniqueVals) {
            var num = Number(val);
            var lowerBound = getLowerBound(num, bucketSize);
            var upperBound = getUpperBound(num, bucketSize);
            min = Math.min(lowerBound, min);
            max = Math.max(upperBound, max);
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
                    str = "neq(" + colName + ", " + min + ")";
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
            "operator": operator,
            "filterString": str
        };
    }

    function isTypeNumber(type) {
        // boolean is also a num in backend
        return (type === "integer" || type === "float");
    }

    function isTypeBoolean(type) {
        return (type === "boolean");
    }

    function isTypeString(type) {
        return (type === "string");
    }

    function isModalVisible(curStatsCol) {
        return ($modal.is(":visible") &&
                curStatsCol != null &&
                $modal.data("id") === curStatsCol.getId());
    }

    function failureHandler(curStatsCol, error) {
        console.error("Profile error", error);
        curStatsCol.groupByInfo.isComplete = false;
        if (isModalVisible(curStatsCol)) {
            if (typeof error === "object") {
                error = error.error;
            }

            $modal.attr("data-state", "failed");
            $modal.removeClass("loading");
            $modal.find(".loadHidden").removeClass("hidden")
                                    .removeClass("disabled");
            $modal.find(".loadDisabled").removeClass("disabled");
            $modal.find(".groupbyInfoSection").addClass("hidden");
            $modal.find(".errorSection").removeClass("hidden")
                .find(".text").text(error);

            resetGroupbyInfo();
        }
    }

    function downloadProfileAsPNG() {
        var deferred = jQuery.Deferred();
        var node = $modal.get(0);

        domtoimage.toPng(node, {
            "width": $modal.width(),
            "height": $modal.height(),
            "style": {
                "left": 0,
                "top": 0
            }
        })
        .then(function(dataUrl) {
            var download = document.createElement("a");
            download.href = dataUrl;
            download.download = "profile.png";
            download.click();
            xcHelper.showSuccess(SuccessTStr.Profile);
            deferred.resolve();
        })
        .catch(function(error) {
            console.error(error);
            xcHelper.showFail(FailTStr.Profile);
            deferred.reject(error);
        });

        return deferred.promise();
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        Profile.__testOnly__ = {};
        // Profile.__testOnly__.getResultSetId = function() {
        //     return resultSetId;
        // };
        // Profile.__testOnly__.getStatsCol = function() {
        //     return statsCol;
        // };

        // Profile.__testOnly__.fltExist = fltExist;
        // Profile.__testOnly__.getBucketFltOpt = getBucketFltOpt;
        // Profile.__testOnly__.getNumFltOpt = getNumFltOpt;
        // Profile.__testOnly__.getNumInScale = getNumInScale;
        // Profile.__testOnly__.addNullValue = addNullValue;
        // Profile.__testOnly__.formatNumber = formatNumber;
    }
    /* End Of Unit Test Only */

    return (Profile);
}(jQuery, {}, d3));