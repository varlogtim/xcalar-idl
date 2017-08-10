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
    var tooltipOptions = {
        "trigger": "manual",
        "animation": false,
        "placement": "top",
        "container": "body",
        "html": true,
        "template": '<div class="bartip tooltip" role="tooltip">' +
                        '<div class="tooltip-arrow"></div>' +
                        '<div class="tooltip-inner"></div>' +
                    '</div>'
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
        $modal.on("mouseover", ".barArea", function(event) {
            event.stopPropagation();
            var rowToHover = null;
            if (!$modal.hasClass("drawing")) {
                rowToHover = d3.select(this).attr("data-rowNum");
            }
            resetTooltip(rowToHover);
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

        $modal.on("mouseover", ".arc", function(event) {
            event.stopPropagation();
            resetArcTooltip(this);
        });

        $modal.on("mouseout", ".arc", function() {
            resetArcTooltip();
        });

        // only trigger in padding area btw bars
        $modal.on("mouseover", ".groupbyChart", function(event) {
            event.stopPropagation();
        });

        $modal.on("mouseover", function() {
            resetTooltip();
        });

        var $groupbySection = $modal.find(".groupbyInfoSection");

        $groupbySection.on("click", ".arc",
        function(event) {
            if (event.which !== 1) {
                return;
            }

            if (filterDragging) {
                filterDragging = false;
                return;
            }
            percentageLabel = !percentageLabel;
            $(this).tooltip("hide");
            buildGroupGraphs(statsCol, true);
        });

        $groupbySection.on("click", ".bar-extra, .bar, .xlabel",
        function(event) {
            if (event.which !== 1) {
                return;
            }

            if (filterDragging) {
                filterDragging = false;
                return;
            }
            percentageLabel = !percentageLabel;
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

    function midAngle(d) {
        return d["startAngle"] + (d["endAngle"] - d["startAngle"]) / 2;
    }

    function maxLabelWidth(labels) {
        var maxWidth = 0;
        labels.each(function() {
            var labelWidth = this.getBoundingClientRect().width;
            if (maxWidth < labelWidth) {
                maxWidth = labelWidth;
            }
        });

        return maxWidth;
    }

    function moveOverlappingLabels(labels, labelPositions, usedPieData) {
        var prevRect;
        var currRect;
        var prevPos;
        var currPos;
        var intersectionLength;
        var maxWidth = maxLabelWidth(labels) * 2;
        var i = 0;
        // method could be cleaner,
        // some code in 'labels.each' should be moved to separate functions
        labels.each(function() {
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
            }
            else {
                prevRect = this;
                i++;
            }
        });
        return labels;
    }

    function getPieData(curStatsCol) {
        var gbd = groupByData.slice();

        var total = curStatsCol.groupByInfo.buckets[bucketNum]["sum"];
        var sum = 0;
        for (var i = 0; i < gbd.length; i++) {
            sum += gbd[i]["statsGroupBy"];
        }

        var otherSum = total - sum;

        if (otherSum > 0) {
            var other = {
                "column2": "Other",
                "statsGroupBy": otherSum,
                "section": "other"
            };
            gbd.push(other);
        }

        var yName = getYName();
        var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d[yName];
        });

        return pie(gbd);
    }

    function getYName() {
        var noBucket = (bucketNum === 0) ? 1 : 0;
        return noBucket ? statsColName : bucketColName;
    }

    function drawPieChart(svg) {
        var $section = $modal.find(".groupbyInfoSection");
        var width = $section.width();
        var height = $section.height();
        // var radius = (Math.min(width, height) / 2);

        svg = d3.select("#profileModal .groupbyChart")
            .attr("width", width)
            .attr("height", height)
            .attr("style", "")
            .append("g")
            .attr("transform", "translate(" + (width / 2) + "," + Math.min(width, height) / 2 + ")");

        return svg;
    }

    function buildGroupGraphs(curStatsCol, initial, resize) {
        if (chartType === "bar") {
            buildBarChart(curStatsCol, initial, resize);
        } else if (chartType === "pie") {
            buildPieChart(curStatsCol, initial, resize);
        }
    }

    // returns max number of labels that will fit
    function getMaxLabels(height) {
        var fontSize = 13;
        return Math.floor(height / (fontSize * 3));
    }

    // there should be a way to only only re-render the text/polylines
    // when a rezise happens, right now everything gets re-rendered during resize
    function buildPieChart(curStatsCol, initial, resize) {
        if (!isModalVisible(curStatsCol)) {
            return;
        }
        chartType = "pie";
        var nullCount = curStatsCol.groupByInfo.nullCount;
        var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
        var noBucket = (bucketNum === 0) ? 1 : 0;
        var noSort = (order === sortMap.origin);
        var xName = tableInfo.colName;
        var yName = getYName();
        var $section = $modal.find(".groupbyInfoSection");
        // var data = groupByData;
        // var dataLen = data.length;
        var sectionWidth = $section.width();
        // var marginBottom = 10;
        // var marginLeft = 20;
        var svg;
        var charLenToFit = 18;
        var piedata = getPieData(curStatsCol);
        radius = (Math.min(sectionWidth, $section.height()) / 2) * .9;
        var arc = d3.svg.arc()
            .innerRadius(0)
            .outerRadius(radius);
        var outerArc = d3.svg.arc()
            .innerRadius(radius * .8)
            .outerRadius(radius * .8);

        // could change to only regenerate/color piechart if initial
        $modal.find(".groupbyChart").empty();
        svg = drawPieChart(svg, arc);
        colorPieChart(svg, piedata, arc);

        // appends arcs to 'path' and colors them
        function colorPieChart(svg, piedata, arc) {
            var isFirstColor = true;
            var nextColor = 0;
            var path = svg.selectAll("path")
                .data(piedata)
                .enter()
                .append("path")
                .attr("d", arc)
                .attr("class", function(d, i) {
                    var className = getTooltipAndClass.apply(this, arguments) + " ";
                    if (nextColor === 10) {
                        nextColor = 0;
                    }
                    if (piedata[i].data["type"] === "nullVal") {
                        return className + "nullVal";
                    }
                    if (i === piedata.length - 1 && piedata[piedata.length - 1].data["section"] === "other") {
                        return className + "other";
                    }
                    if (!isFirstColor && nextColor === 0) {
                        return className + getColorClass(nextColor += 2);
                    }
                    isFirstColor = false;
                    return className + getColorClass(++nextColor);
                });

            return path;
        }

        function getColorClass(nextColor) {
            return "color-" + nextColor;
        }

        var labelPositions = [];

        var usedPieData = [];
        chooseAndAppendLabels(usedPieData);
        var labels = $(".pieLabel");
        // moves labels that overlap
        labels = moveOverlappingLabels(labels, labelPositions, usedPieData);

        // adds lines from pie chart to labels
        var arcCent;
        var outerArcCent;
        svg.selectAll("polyline")
            .data(usedPieData)
            .enter()
            .append("polyline")
            .attr("points", function(d, i) {
                arcCent = arc.centroid(d);
                outerArcCent = outerArc.centroid(d);
                arcCent[0] *= 1.1;
                arcCent[1] *= 1.1;
                labelPositions[i][1] += 3;
                outerArcCent[1] = labelPositions[i][1];
                if (labelPositions[i][0] > 0) {
                    labelPositions[i][0] += 3;
                } else {
                    labelPositions[i][0] -= 3;
                }

                return [arcCent, outerArcCent, labelPositions[i]];
            })
            .style("pointer-events", "none")
            .style("fill", "none")
            .style("stroke", "#4f4f4f")
            .style("stroke-width", "1px");

        svg.selectAll("circle")
            .data(usedPieData)
            .enter()
            .append("circle")
            .attr("cx", function(d) {
                arcCent = arc.centroid(d);
                return arcCent[0] *= 1.1;
            })
            .attr("cy", function(d) {
                arcCent = arc.centroid(d);
                return arcCent[1] *= 1.1;
            })
            .attr("r", 2)
            .attr("fill", "#4f4f4f")
            .style("pointer-events", "none");

        // chooses which labels to display
        function chooseAndAppendLabels(usedPieData) {
            var rightCount = 0;
            var leftCount = 0;
            for (var i = 0; i < piedata.length; i++) {
                if (piedata[i]["startAngle"] <= Math.PI) {
                    rightCount++;
                } else {
                    leftCount++;
                }
            }

            var maxLabels = getMaxLabels($section.height());
            var r = 0;
            var l = 0;
            var fontSize = 13;
            if (rightCount > maxLabels) {
                rightCount = maxLabels;
            }
            if (leftCount > maxLabels) {
                leftCount = maxLabels;
            }
            var rightArcDiv = Math.PI / rightCount;
            var leftArcDiv = Math.PI / leftCount;
            var lastUsedArc = piedata[0];
            var currMid;
            for (var i = 0; i < piedata.length; i++) {
                if (i > 0) {
                    if (!roomForLabel(lastUsedArc, piedata[i], rightArcDiv, leftArcDiv , i)) {
                        continue;
                    }
                }
                currMid = midAngle(piedata[i]);
                if ((currMid <= Math.PI && r < maxLabels) ||
                    (currMid > Math.PI && l < maxLabels)) {
                    var g = svg.append("g").classed("pieLabel", true);
                    addLabels(g, piedata[i], fontSize);
                    if (piedata[i]["startAngle"] <= Math.PI) {
                        r++;
                    } else {
                        l++;
                    }
                    lastUsedArc = piedata[i];
                    usedPieData.push(piedata[i]);
                }
            }
        }

        /*
            decides if there is room for a label on an arc
            based on where the last label was placed
        */
        function roomForLabel(lastUsedArc, currArc, rightArcDiv, leftArcDiv, i) {
            var lastMid = midAngle(lastUsedArc);
            var currMid = midAngle(currArc);

            if ((lastMid < Math.PI && currMid < Math.PI) ||
                (lastMid >= Math.PI && currMid >= Math.PI)) {
                var rightSpace = (lastMid + rightArcDiv);
                var leftSpace = (lastMid + leftArcDiv);

                if (currMid < Math.PI &&
                    i < piedata.length - 1 &&
                    piedata[i]["endAngle"] < rightSpace) {
                    return false;
                }
                if (currMid >= Math.PI &&
                    i < piedata.length - 1 &&
                    piedata[i]["endAngle"] < leftSpace) {
                    return false;
                }
            }
            return true;
        }

        // appends labels to 'g'
        // groups the 'value' and 'frequency' together
        function addLabels(g, arc, fontSize) {
            var mid = midAngle(arc);
            g.append("text")
                .style("font-size", fontSize + "px")
                .style("fill", "#4f4f4f")
                .attr("transform", function() {
                    var pos = outerArc.centroid(arc);
                    pos[0] = radius * (mid < Math.PI ? 1 : -1);
                    if (mid < Math.PI) {
                        pos[1] -= (fontSize * 1.7);
                    } else {
                        pos[1] -= fontSize * 1.7;
                    }
                    labelPositions.push(pos);

                    return "translate(" + pos + ")";
                })
                .text(function() {
                    if (arc.data["section"] === "other") {
                        return "Other";
                    }
                    return getXAxis(arc);
                });

            g.append("text")
                .style("font-size", (fontSize - 1) + "px")
                .style("fill", "#7b7b7b")
                .attr("transform", function() {
                    var pos = outerArc.centroid(arc);
                    pos[0] = radius * (mid < Math.PI ? 1 : -1);
                    if (mid < Math.PI) {
                        pos[1] -= fontSize * 1.5;
                    } else {
                        pos[1] -= fontSize * 1.5;
                    }
                    pos[1] += fontSize;

                    return "translate(" + pos + ")";
                })
                .text(function() {
                    return getLabel(arc);
                });
        }

        function getLabel(d) {
            var num = d.data[yName];

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
                num = formatNumber(d.data[yName]);
                if (num.length > charLenToFit) {
                    return (num.substring(0, charLenToFit) + "..");
                } else {
                    return num;
                }
            }
        }

        function getXAxis(d) {
            var isLogScale = (tableInfo.bucketSize < 0);
            var lowerBound = getLowerBound(d.data[xName], tableInfo.bucketSize);
            var name = formatNumber(lowerBound, isLogScale, decimalNum);

            if (!noBucket && !noSort && d.data["type"] !== "nullVal") {
                var upperBound = getUpperBound(d.data[xName], tableInfo.bucketSize);
                upperBound = formatNumber(upperBound, isLogScale, decimalNum);
                name = "[" + name + "-" + upperBound + "]";
            }

            if (name.length > charLenToFit) {
                return (name.substring(0, charLenToFit) + "..");
            } else {
                return name;
            }
        }

        function getTooltipAndClass(d) {
            // a little weird method to setup tooltip
            // may have better way
            var title;
            var isLogScale = (tableInfo.bucketSize < 0);
            var lowerBound = getLowerBound(d.data[xName], tableInfo.bucketSize);

            if (d.data["section"] === "other") {
                title = "Value: Other<br>";
            } else if (noBucket || d.data["type"] === "nullVal") {
                // xName is the backColName, may differenet with frontColName
                title = "Value: " +
                    formatNumber(lowerBound, isLogScale, decimalNum) +
                    "<br>";
            } else {
                var upperBound = getUpperBound(d.data[xName], tableInfo.bucketSize);
                title = "Value: [" +
                    formatNumber(lowerBound, isLogScale, decimalNum) +
                    ", " +
                    formatNumber(upperBound, isLogScale, decimalNum) +
                    ")<br>";
            }

            if (percentageLabel && tableInfo.sum !== 0) {
                var num = d.data[yName] / (tableInfo.sum + nullCount) * 100;
                var per = num.toFixed(3);

                if (num < 0.001) {
                    // when the percentage is too small
                    per = num.toExponential(2) + "%";
                } else {
                    per += "%";
                }
                title += "Percentage: " + per;
            } else {
                title += "Frequency: " + formatNumber(d.data[yName]);
            }
            var options = $.extend({}, tooltipOptions, {
                "title": title
            });
            $(this).tooltip("destroy");
            $(this).tooltip(options);
            return "arc";
        }
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
        chart.selectAll(".arc").each(function(d, i) {
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
        var arcToSelect = chart.selectAll(".arc.selecting");
        var arcs = chart.selectAll(".arc");
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

    function resetArcTooltip(arc) {
        $(".arc").tooltip("hide");
        if (arc != null) {
            $(arc).tooltip("show");
        }
    }

    function pieToggleFilterOption(isHidden) {
        var $filterOption = $("#profile-filterOption");
        var chart = d3.select("#profile-chart .groupbyChart");
        var bars = chart.selectAll(".arc.selected");
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

        chart.selectAll(".arc.selected").each(function(d) {
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

    function buildBarChart(curStatsCol, initial, resize) {
        if (!isModalVisible(curStatsCol)) {
            return;
        }

        var nullCount = curStatsCol.groupByInfo.nullCount;
        var tableInfo = curStatsCol.groupByInfo.buckets[bucketNum];
        var noBucket = (bucketNum === 0) ? 1 : 0;
        var noSort = (order === sortMap.origin);
        var xName = tableInfo.colName;
        var yName = noBucket ? statsColName : bucketColName;

        var $section = $modal.find(".groupbyInfoSection");
        var data = groupByData;
        var dataLen = data.length;

        var sectionWidth = $section.width();
        var marginBottom = 10;
        var marginLeft = 20;

        var maxRectW = Math.floor(sectionWidth / 706 * 70);
        var chartWidth = Math.min(sectionWidth, maxRectW * data.length + marginLeft * 2);
        var chartHeight = $section.height();

        var height = chartHeight - marginBottom;
        var width = chartWidth - marginLeft * 2;

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
        chartType = "bar";

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

        function getXAxis(d) {
            var isLogScale = (tableInfo.bucketSize < 0);
            var lowerBound = getLowerBound(d[xName], tableInfo.bucketSize);
            var name = formatNumber(lowerBound, isLogScale, decimalNum);

            if (!noBucket && !noSort && d.type !== "nullVal") {
                var upperBound = getUpperBound(d[xName], tableInfo.bucketSize);
                upperBound = formatNumber(upperBound, isLogScale, decimalNum);
                name = name + "-" + upperBound;
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
                         Math.abs(tableInfo.bucketSize);
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
            var isLogScale = (tableInfo.bucketSize < 0);
            var lowerBound = getLowerBound(d[xName], tableInfo.bucketSize);

            if (noBucket || d.type === "nullVal") {
                // xName is the backColName, may differenet with frontColName
                title = "Value: " +
                        formatNumber(lowerBound, isLogScale, decimalNum) +
                        "<br>";
            } else {
                var upperBound = getUpperBound(d[xName], tableInfo.bucketSize);
                title = "Value: [" +
                        formatNumber(lowerBound, isLogScale, decimalNum) +
                        ", " +
                        formatNumber(upperBound, isLogScale, decimalNum) +
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

    function getNumInScale(num, isLogScale) {
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
    }

    function getLowerBound(num, bucketSize) {
        var isLogScale = (bucketSize < 0);
        return getNumInScale(num, isLogScale);
    }

    function getUpperBound(num, bucketSize) {
        var isLogScale = (bucketSize < 0);
        return getNumInScale(num + Math.abs(bucketSize), isLogScale);
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

    function formatNumber(num, isLogScale, decimal) {
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
        chart.selectAll(".barArea").each(function() {
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
        var bars = chart.selectAll(".barArea.selected");
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
        Profile.__testOnly__.getResultSetId = function() {
            return resultSetId;
        };
        Profile.__testOnly__.getStatsCol = function() {
            return statsCol;
        };

        Profile.__testOnly__.fltExist = fltExist;
        Profile.__testOnly__.getBucketFltOpt = getBucketFltOpt;
        Profile.__testOnly__.getNumFltOpt = getNumFltOpt;
        Profile.__testOnly__.getNumInScale = getNumInScale;
        Profile.__testOnly__.addNullValue = addNullValue;
        Profile.__testOnly__.formatNumber = formatNumber;
    }
    /* End Of Unit Test Only */

    return (Profile);
}(jQuery, {}, d3));