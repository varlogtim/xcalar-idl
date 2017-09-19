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
    var chartType = "bar";
    var chartBuilder;

    Profile.setup = function() {
        $modal = $("#profileModal");
        $rangeSection = $modal.find(".rangeSection");
        $rangeInput = $("#profile-range");
        $skipInput = $("#profile-rowInput");

        ProfileEngine.setup({
            "sortMap": sortMap,
            "aggKeys": aggKeys,
            "statsKeyMap": statsKeyMap,
            "statsColName": statsColName,
            "bucketColName": bucketColName
        });

        ProfileSelector.setup($modal);

        var modalWidth;
        var statsWidth;
        modalHelper = new ModalHelper($modal, {
            beforeResize: function() {
                modalWidth = $modal.width();
                statsWidth = $("#profile-stats").width();
            },
            resizeCallback: function(event, ui) {
                if ($modal.hasClass("collapse")) {
                    resizeChart();
                    return;
                }

                var minWidth = getMinStatsPanelWidth();
                var width = minWidth;
                if (statsWidth > minWidth) {
                    width = ui.size.width / modalWidth * statsWidth;
                }
                width = Math.min(width, getMaxStatsPanelWidth());
                width = Math.max(width, minWidth);
                adjustStatsPanelWidth(width);
            },
            noEnter: true
        });
        addEventListeners();
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

    function addEventListeners() {
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
            ProfileSelector.clear();
            buildGroupGraphs(statsCol, true, false);
        });

        var $groupbySection = $modal.find(".groupbyInfoSection");

        $groupbySection.on("click", ".clickable", function(event) {
            if (event.which !== 1) {
                return;
            }

            if (ProfileSelector.isOn()) {
                ProfileSelector.off();
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
            ProfileSelector.new({
                "chartBuilder": chartBuilder,
                "x": event.pageX,
                "y": event.pageY
            });
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
            if ($option.hasClass("filter")) {
                filterSelectedValues(FltOp.Filter);
            } else if ($option.hasClass("exclude")) {
                filterSelectedValues(FltOp.Exclude);
            } else {
                ProfileSelector.clear();
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
    }

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
            if ($modal.hasClass("collapse")) {
                // when collapse
                $modal.removeClass("collapse");
                $statsSection.width(getMinStatsPanelWidth());
            } else {
                // expand
                $statsSection.css("width", "");
                $modal.find(".modalLeft").css("width", "");
                $modal.addClass("collapse");
            }
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

        $statsSection.resizable({
            handles: "w",
            minWidth: getMinStatsPanelWidth(),
            containment: "#profileModal",
            resize: function(event, ui) {
                var width = Math.min(ui.size.width, getMaxStatsPanelWidth());
                adjustStatsPanelWidth(width);
            }
        });
    }

    function getMaxStatsPanelWidth() {
        // left part need 555px at least
        return ($modal.width() - 555);
    }

    function getMinStatsPanelWidth() {
        return parseFloat($("#profile-stats").css("minWidth"));
    }

    function adjustStatsPanelWidth(width) {
        $("#profile-stats").width(width)
                           .css("left", "");
        $modal.find(".modalLeft").width($modal.width() - width);
        resizeChart();
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
        ProfileSelector.clear();
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

        chartBuilder = ProfileChart.new({
            "data": groupByData,
            "type": chartType,
            "bucketSize": bucketNum,
            "xName": tableInfo.colName,
            "yName": getYName(),
            "sorted": (order !== sortMap.origin),
            "nullCount": curStatsCol.groupByInfo.nullCount,
            "max": tableInfo.max,
            "sum": tableInfo.sum,
            "percentage": percentageLabel,
            "decimal": decimalNum,
            "initial": initial,
            "resize": resize,
            "resizeDelay": resizeDelay
        });
        chartBuilder.build();
    }

    function getYName() {
        var noBucket = (bucketNum === 0) ? 1 : 0;
        return noBucket ? statsColName : bucketColName;
    }

    function getChart() {
        return d3.select("#profile-chart .groupbyChart");
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
            ProfileSelector.clear();

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
        ProfileSelector.clear();
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

    function filterSelectedValues(operator) {
        // in case close modal clear curTableId
        var filterTableId = curTableId;
        var colName = statsCol.colName;
        var options = ProfileSelector.filter(operator, statsCol);
        if (options != null) {
            var colNum = gTables[filterTableId].getColNumByBackName(colName);
            closeProfileModal();
            xcFunction.filter(colNum, filterTableId, options);
        }
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
        Profile.__testOnly__.getStatsCol = function() {
            return statsCol;
        };
        Profile.__testOnly__.addNullValue = addNullValue;
    }
    /* End Of Unit Test Only */

    return (Profile);
}(jQuery, {}, d3));