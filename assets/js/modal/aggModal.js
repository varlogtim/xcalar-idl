window.AggModal = (function($, AggModal) {
    var $aggModal;     // $("#aggModal")
    var $quickAgg;     // $("#aggModal-quickAgg")
    var $corr;         // $("#aggModal-corr")

    var modalHelper;

    var aggFunctions;  // [AggrOp.Sum, AggrOp.Avg, AggrOp.Min, AggrOp.Max, AggrOp.Count]
    var aggCols = [];

    // UI cache, not saving to kvStore
    var aggCache  = {};
    var corrCache = {};
    var aggOpMap  = {};

    var cachedTableId = "";
    var cachedVertColNums;
    var cachedHorColNums;
    var cachedProfileColNum;

    AggModal.setup = function() {
        $aggModal = $("#aggModal");
        $quickAgg = $("#aggModal-quickAgg");
        $corr = $("#aggModal-corr");
        $backToProfile = $("#aggModal-backToProfile");

        aggFunctions = [AggrOp.Sum, AggrOp.Avg, AggrOp.Min,
                         AggrOp.Max, AggrOp.Count];

        aggOpMap[AggrOp.Sum] = 0;
        aggOpMap[AggrOp.Avg] = 1;
        aggOpMap[AggrOp.Min] = 2;
        aggOpMap[AggrOp.Max] = 3;
        aggOpMap[AggrOp.Count] = 4;

        var minWidth  = 580;
        var minHeight = 300;

        modalHelper = new ModalHelper($aggModal, {
            "minWidth": minWidth,
            "minHeight": minHeight
        });

        $aggModal.resizable({
            "handles": "n, e, s, w, se",
            "minHeight": minHeight,
            "minWidth": minWidth,
            "containment": "document"
        });

        $aggModal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing",
            "containment": "window"
        });

        $aggModal.on("click", ".close", function() {
            closeAggModal();
        });

        $quickAgg.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $aggModal.on("click", ".tab", function() {
            var mode = $(this).attr("id");
            if (mode === "aggTab") {
                AggModal.quickAgg(cachedTableId, cachedHorColNums);
            } else {
                AggModal.corrAgg(cachedTableId, cachedVertColNums,
                                 cachedHorColNums, cachedProfileColNum);
            }
        });

        $quickAgg.find(".aggContainer").scroll(function() {
            scrollHelper($(this), $quickAgg);
        });

        $corr.find(".aggContainer").scroll(function() {
            scrollHelper($(this), $corr);
        });

        $corr.on("mouseenter", ".aggTableFlex", function() {
            var $cell = $(this);
            highlightLabel($cell.data("row"), $cell.data("col"));
        });

        $corr.on("mouseleave", ".aggTableFlex", function() {
            var $cell = $(this);
            deHighlightLabel($cell.data("row"), $cell.data("col"));
        });

        $backToProfile.on("click", function() {
            $(this).hide();
            var tableId = cachedTableId;
            var colNum = cachedProfileColNum;
            var tmp = gMinModeOn;
            gMinModeOn = true;
            closeAggModal();
            Profile.show(tableId, colNum);
            gMinModeOn = tmp;

        });

        function scrollHelper($container, $mainAgg) {
            var scrollTop = $container.scrollTop();
            var scrollLeft = $container.scrollLeft();
            $mainAgg.find(".labelContainer").scrollTop(scrollTop);
            $mainAgg.find(".headerContainer").scrollLeft(scrollLeft);
        }
    };

    // use horColNums to match the horColumns in corr
    AggModal.quickAgg = function(tableId, horColNums) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.getName();

        cachedTableId = tableId;
        cachedHorColNums = horColNums;
        showAggModal(tableName, "aggTab");

        aggColsInitialize(tableId);
        aggTableInitialize();

        var sql = {
            "operation": SQLOps.QuickAgg,
            "tableId": tableId,
            "tableName": tableName,
            "horColNums": horColNums
        };
        var txId = Transaction.start({
            "operation": SQLOps.QuickAgg,
            "sql": sql
        });

        $quickAgg.attr("data-state", "pending");
        calcAgg(tableId, txId)
        .then(function() {
            $quickAgg.attr("data-state", "finished");
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            $quickAgg.attr("data-state", "failed");
            console.error("Quick Aggregate Fails", error);
            Transaction.fail(txId, {
                "noAlert": true,
                "error": error
            });
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    AggModal.corrAgg = function(tableId, vertColNums, horColNums, profileColNum) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.getName();
        // If this is triggered from a column profile then we want to track
        // this to be able to go back to the profile.
        // Else profileColNum is empty
        if (profileColNum != null) {
            $aggModal.addClass("profileMode");
            cachedProfileColNum = profileColNum;
        }

        cachedTableId = tableId;
        cachedVertColNums = vertColNums;
        cachedHorColNums = horColNums;
        showAggModal(tableName, "corrTab");

        aggColsInitialize(tableId);
        corrTableInitialize();

        var sql = {
            "operation": SQLOps.Corr,
            "tableId": tableId,
            "tableName": tableName,
            "vertColNums": vertColNums,
            "horColNums": horColNums
        };
        var txId = Transaction.start({
            "operation": SQLOps.Corr,
            "sql": sql
        });

        $corr.attr("data-state", "pending");
        calcCorr(tableId, txId)
        .then(function() {
            $corr.attr("data-state", "finished");
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            $corr.attr("data-state", "failed");
            console.error("Quick Aggregate Fails", error);
            Transaction.fail(txId, {
                "noAlert": true,
                "error": error
            });
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function showAggModal(tableName, mode) {
        if (mode === "aggTab") {
            // when it's quick aggregation
            $("#aggTab").addClass("active")
                    .siblings().removeClass("active");
            $quickAgg.show();
            $corr.hide();
        } else if (mode === "corrTab") {
            // when it's correlation
            $("#corrTab").addClass("active")
                    .siblings().removeClass("active");
            $quickAgg.hide();
            $corr.show();
        } else {
            // error case
            throw "Invalid mode in quick agg!";
        }

        $("#aggModal-tableName").find(".text").text(tableName);
        modalHelper.setup()
        .always(function() {
            $aggModal.find(".aggContainer")
                    .scrollTop(0)
                    .scrollLeft(0);
        });
    }

    function aggColsInitialize(tableId) {
        aggCols = [];

        var $table = $("#xcTable-" + tableId);
        var tableCols = gTables[tableId].tableCols;
        for (var i = 0, colLen = tableCols.length; i < colLen; i++) {
            var progCol = tableCols[i];
            // skip all columns that are not number
            if (progCol.isNumberCol()) {
                var colNum = i + 1;
                var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");
                aggCols.push({
                    "col": progCol,
                    "colNum": colNum,
                    "isChildOfArray": isChildOfArray
                });
            }
        }
    }

    function aggTableInitialize() {
        var colLen = aggCols.length;
        var funLen = aggFunctions.length;
        var wholeTable = "";
        var colLabels = [];

        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
            if (cachedHorColNums != null &&
                !cachedHorColNums.includes(aggCol.colNum))
            {
                continue;
            }

            var progCol = aggCol.col;
            var isChildOfArray = aggCol.isChildOfArray;
            var nameObj = {};
            nameObj.colName = progCol.getFrontColName();
            nameObj.prefix  = progCol.getPrefix() || CommonTxtTstr.Immediates;
            colLabels.push(nameObj);
            wholeTable += '<div class="aggCol">';

            for (var row = 0; row < funLen; row++) {
                wholeTable += '<div class="aggTableField cell" ' +
                               'data-col=' + col + ' data-row=' + row + '>';

                if (progCol.isNumberCol()) {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray) {
                        wholeTable += AggTStr.NoSupport;
                    } else {
                        wholeTable += '<div class="spinny"></div>';
                    }
                } else {
                    wholeTable += "N/A";
                }

                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        if (wholeTable === "") {
            wholeTable = '<div class="hint">' +
                                AggTStr.NoAgg +
                            '</div>';
        }

        $quickAgg.find(".headerContainer").html(getColLabelHTML(colLabels));
        $quickAgg.find(".labelContainer").html(getRowLabelHTML(aggFunctions));
        $quickAgg.find(".aggContainer").html(wholeTable);
    }

    function corrTableInitialize() {
        var colLen = aggCols.length;
        var wholeTable = '';

        // column's order is column0, column1...columnX
        // row's order is columnX, column(X-1).....column1
        var colLabels = [];

        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
            var progCol = aggCol.col;
            var isChildOfArray = aggCol.isChildOfArray;

            if (cachedVertColNums != null &&
                !cachedVertColNums.includes(aggCol.colNum))
            {
                continue;
            }

            var nameObj = {};
            nameObj.colName = progCol.getFrontColName();
            nameObj.prefix  = progCol.getPrefix() || CommonTxtTstr.Immediates;
            colLabels.push(nameObj);
            wholeTable += '<div class="aggCol">';

            for (var row = 0; row < colLen; row++) {
                var aggRow = aggCols[colLen - row - 1];

                if (cachedHorColNums != null &&
                    !cachedHorColNums.includes(aggRow.colNum))
                {
                    continue;
                }
                var cell = '<div class="aggTableField aggTableFlex cell" ' +
                            'data-col=' + col + ' data-row=' + row + '>';

                if (isChildOfArray || aggRow.isChildOfArray) {
                    // XXX now agg on child of array is not supported
                    wholeTable += cell + AggTStr.NoSupport;
                } else {
                    wholeTable += cell +
                                    '<div class="spinner">' +
                                        '<div class="bounce1"></div>' +
                                        '<div class="bounce2"></div>' +
                                        '<div class="bounce3"></div>' +
                                    '</div>';
                }
                wholeTable += "</div>";
            }
            wholeTable += "</div>";
        }

        var rowLabels = [];
        for (var i = colLen - 1; i >= 0; i--) {
            if (cachedHorColNums != null &&
                !cachedHorColNums.includes(aggCols[i].colNum))
            {
                continue;
            }

            var nameObj = {};
            nameObj.colName = aggCols[i].col.getFrontColName();
            nameObj.prefix  = aggCols[i].col.getPrefix() || CommonTxtTstr.Immediates;
            rowLabels.push(nameObj);
        }

        if (wholeTable === "") {
            wholeTable = '<div class="hint">' +
                                AggTStr.NoCorr +
                            '</div>';
        }

        $corr.find(".headerContainer").html(getColLabelHTML(colLabels));
        $corr.find(".labelContainer").html(getRowLabelHTML(rowLabels));
        $corr.find(".aggContainer").html(wholeTable);
    }

    function getRowLabelHTML(operations) {
        var html = '<div class="aggCol labels">';
        var prefixLabel = "";
        var name;
        for (var i = 0, len = operations.length; i < len; i++) {
            if (typeof operations[i] === "string") {
                name = operations[i];
            } else {
                var prefClass = "";
                if (operations[i].prefix === CommonTxtTstr.Immediates) {
                    prefClass = " derived";
                }
                prefixLabel = '<span data-original-title="' +
                                operations[i].prefix + '" ' +
                                'data-toggle="tooltip" data-placement="top" ' +
                                'data-container="body" ' +
                                'class="textOverflow tooltipOverflow prefix '
                                + prefClass + '">' +
                                operations[i].prefix +
                            '</span>';
                name = operations[i].colName;
            }
            html += '<div class="aggTableField rowLabel">' +
                        prefixLabel + 
                        '<span data-original-title="' + name + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="textOverflow tooltipOverflow">' +
                            name +
                        '</span>' +
                    '</div>';
        }

        html += '</div>';
        return html;
    }

    function getColLabelHTML(labels) {
        var html = '<div class="padding"></div>' +
                   '<div class="aggTableField colLabel blankSpace"></div>';
        var prefClass = "";
        for (var i = 0, len = labels.length; i < len; i++) {
            if (labels[i].prefix === CommonTxtTstr.Immediates) {
                prefClass = " derived";
            } else {
                prefClass = "";
            }
            html += '<div class="aggTableField colLabel">' +
                        '<span data-original-title="' + labels[i].prefix +
                        '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="prefix textOverflow tooltipOverflow ' +
                            prefClass + '">' +
                            labels[i].prefix +
                        '</span>' +
                        '<span data-original-title="' + labels[i].colName +
                        '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="textOverflow tooltipOverflow">' +
                            labels[i].colName +
                        '</span>' +
                    '</div>';
        }
        return html;
    }

    function calcCorr(tableId, txId) {
        var deferred = jQuery.Deferred();
        var promises = [];

        var colLen = aggCols.length;
        var dupCols = [];
        var total = $corr.find(".cell").length;
        var cellCount = 0;
        updateRunProgress(cellCount, total);
        // First we need to determine if this is a dataset-table
        // or just a regular table

        var corrString = "div(sum(mult(sub($arg1, avg($arg1)), sub($arg2," +
                         "avg($arg2)))), sqrt(mult(sum(pow(sub($arg1, " +
                         "avg($arg1)), 2)), sum(pow(sub($arg2, avg($arg2)), " +
                         "2)))))";

        // the display order is column's order is column0, column1...columnX
        // row's order is columnX, column(X-1).....column1
        // but for simplity to handle duplicate col case,
        // we assume row's order is still column0, column1...columnX, then do
        // the corr, and when display, use getCorrCell() to get the correct cell
        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
            var progCol = aggCol.col;
            // the diagonal is always 1
            cellCount += applyCorrResult(col, col, 1, []);

            if (dupCols[col]) {
                // for duplicated columns, no need to trigger thrift call
                continue;
            }

            var dups = checkDupCols(col);
            for (var t = 0; t < dups.length; t++) {
                var dupColNum = dups[t];
                dupCols[dupColNum] = true;

                if (dupColNum > col) {
                    cellCount += applyCorrResult(col, dupColNum, 1, []);
                }
            }
            updateRunProgress(cellCount, total);

            // XXX now agg on child of array is not supported
            if (!aggCol.isChildOfArray) {
                for (var row = 0; row < col; row++) {
                    var aggRow = aggCols[row];
                    var isValid = true;

                    if (cachedHorColNums != null) {
                        isValid = isValid &&
                                  (cachedHorColNums.includes(aggRow.colNum) ||
                                  cachedHorColNums.includes(aggCol.colNum));
                    }

                    if (cachedVertColNums != null) {
                        isValid = isValid &&
                                  (cachedVertColNums.includes(aggRow.colNum) ||
                                  cachedVertColNums.includes(aggCol.colNum));
                    }

                    if (!isValid) {
                        continue;
                    }

                    if (aggRow.isChildOfArray) {
                        continue;
                    }
                    var sub = corrString.replace(/[$]arg1/g,
                                                 progCol.getBackColName());
                    sub = sub.replace(/[$]arg2/g,
                                        aggRow.col.getBackColName());
                    // Run correlation function
                    var promise = runCorr(tableId, sub, row, col, dups, txId);
                    promise.then(function(numDone) {
                        cellCount += numDone;
                        updateRunProgress(cellCount, total);
                    });
                    promises.push(promise);
                }
            }
        }

        PromiseHelper.when.apply(window, promises)
        .then(deferred.resolve)
        .fail(function() {
            for (var i = 0, len = arguments.length; i < len; i++) {
                if (arguments[i] != null && arguments[i].error != null) {
                    deferred.reject(arguments[i]);
                    return;
                }
            }

            deferred.reject("Unknown Correlation Error");
        });

        return deferred.promise();
    }

    function updateRunProgress(curr, total) {
        $aggModal.find(".progressValue").text(curr + "/" + total);
    }

    function calcAgg(tableId, txId) {
        var promises = [];

        var colLen = aggCols.length;
        var funLen = aggFunctions.length;
        var total = $quickAgg.find(".cell").length;
        var cellCount = 0;
        updateRunProgress(cellCount, total);
        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];
        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
            if (cachedHorColNums != null &&
                !cachedHorColNums.includes(aggCol.colNum))
            {
                continue;
            }

            var progCol = aggCol.col;

            if (progCol.isNumberCol()) {
                // for duplicated columns, no need to trigger thrift call
                if (dupCols[col]) {
                    continue;
                }

                var dups = checkDupCols(col);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;
                }

                // XXX now agg on child of array is not supported
                if (!aggCol.isChildOfArray) {
                    for (var row = 0; row < funLen; row++) {
                        var promise = runAgg(tableId, progCol.getBackColName(),
                                            aggFunctions[row], row, col,
                                            dups, txId);
                        promise.then(function(numDone) {
                            cellCount += numDone;
                            updateRunProgress(cellCount, total);
                        });
                        promises.push(promise);
                    }
                }
            }
        }

        return PromiseHelper.when.apply(window, promises);
    }

    function checkDupCols(colNo) {
        var args = aggCols[colNo].col.getBackColName();
        var dups = [];

        for (var i = colNo + 1, len = aggCols.length; i < len; i++) {
            var cols = aggCols[i].col;
            if (cols.func.name !== "raw" && cols.getBackColName() === args) {
                dups.push(i);
            }
        }
        return (dups);
    }

    function runAgg(tableId, fieldName, opString, row, col, dups, txId) {
        var tableAgg;
        var colAgg;

        if (aggCache.hasOwnProperty(tableId)) {
            tableAgg = aggCache[tableId];
            if (tableAgg.hasOwnProperty(fieldName)) {
                colAgg = tableAgg[fieldName];
                var aggRes = colAgg[aggOpMap[opString]];
                if (aggRes != null) {
                    applyAggResult(aggRes);
                    return PromiseHelper.resolve(dups.length + 1);
                }
            }
        }

        var deferred = jQuery.Deferred();
        var tableName = gTables[tableId].getName();

        XIApi.aggregate(txId, opString, fieldName, tableName)
        .then(function(value) {
            // cache value
            aggCache[tableId] = aggCache[tableId] || {};
            tableAgg = aggCache[tableId];
            tableAgg[fieldName] = tableAgg[fieldName] || [];
            colAgg = tableAgg[fieldName];
            colAgg[aggOpMap[opString]] = value;
            // end of cache value

            applyAggResult(value);
            deferred.resolve(dups.length + 1);
        })
        .fail(function(error) {
            console.error("quick agg error", error);
            applyAggResult('<span class="dash">--</span>', error.error);
            // still resolve
            deferred.resolve(dups.length + 1);
        });

        function applyAggResult(value, error) {
            var title = (error == null) ? value : error;
            // error case force to have tooltip
            var spanClass = (error == null) ? "textOverflow tooltipOverflow" :
                                            "textOverflow";
            var html = '<span class="' + spanClass + '" ' +
                        'data-original-title="' + title +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                        (jQuery.isNumeric(value) ? value.toFixed(3) : value) +
                        '</span>';
            updateAggCell(row, col, html);

            dups.forEach(function(colNum) {
                updateAggCell(row, colNum, html);
            });
        }

        return (deferred.promise());
    }

    function runCorr(tableId, evalStr, row, col, colDups, txId) {
        if (corrCache.hasOwnProperty(tableId)) {
            var corrRes = corrCache[tableId][evalStr];

            if (corrRes != null) {
                var error = null;
                if (typeof(corrRes) === "string" &&
                    corrRes.indexOf("<span") > -1) {
                    error = "(" + AggTStr.DivByZeroExplain + ")";
                }
                var numDupCells = applyCorrResult(row, col, corrRes, colDups,
                                                  error);
                return PromiseHelper.resolve(numDupCells);
            }
        }

        var deferred = jQuery.Deferred();
        var tableName = gTables[tableId].getName();

        XIApi.aggregateWithEvalStr(txId, evalStr, tableName)
        .then(function(value) {
            // cache value
            corrCache[tableId] = corrCache[tableId] || {};
            corrCache[tableId][evalStr] = value;
            // end of cache value

            var numDupCells = applyCorrResult(row, col, value, colDups);
            deferred.resolve(numDupCells);
        })
        .fail(function(error) {
            console.error("Correlation Error", error);

            if (error.status === StatusT.StatusXdfDivByZero) {
                corrCache[tableId] = corrCache[tableId] || {};
                corrCache[tableId][evalStr] = '<span class="dash">--</span>';
                error.error += "(" + AggTStr.DivByZeroExplain + ")";
            }

            var numDupCells = applyCorrResult(row, col,
                                    '<span class="dash">--</span>', colDups,
                                    error.error);
            // still resolve
            deferred.resolve(numDupCells);
        });

        return (deferred.promise());
    }

    function applyCorrResult(row, col, value, colDups, error) {
        var isNumeric = jQuery.isNumeric(value);
        var bg;
        var $cells;
        var cellCount = 0;

        var title = (error == null) ? value : error;
        // error case force to have tooltip
        var spanClass = (error == null) ? "textOverflow tooltipOverflow" :
                                            "textOverflow";
        var html = '<span class="' + spanClass + '" ' +
                    'data-original-title="' + title +
                    '" data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body">' +
                        (isNumeric ? value.toFixed(3) : value) +
                    '</span>';
        $cells = getCorrCell(row, col);
        cellCount += updataCorrCell($cells, html);

        if (isNumeric) {
            value = parseFloat(value);
            // base color is hsl(197, 61%, 67%)
            var h = 197;
            var s = 61;
            var l = 67;

            if (value > 0) {
                // when value is 1, color is hsl(215, 49%, 29%),
                h = 197 + Math.round(18 * value, 2);
                s = 61 - Math.round(12 * value, 2);
                l = 67 - Math.round(38 * value, 2);
                // bg = "hsl(203, 75%, " + l + "%)";
            } else if (value < 0) {
                // when value is -1, color is hsl(197, 0, 40%),
                h = 197;
                s = 61 + Math.round(61 * value, 2);
                l = 67 + Math.round(17 * value, 2);
            }

            bg = "hsl(" + h + ", " + s + "%, " + l + "%)";
            $cells[0].css("background-color", bg);
            $cells[1].css("background-color", bg);
        }

        var rowDups = checkDupCols(row);
        var newCol;
        var newRow;
        rowDups.forEach(function(rowNum) {
            newRow = col;
            newCol = rowNum;

            if (newCol > newRow) {
                $cells = getCorrCell(newRow, newCol);
                cellCount += updataCorrCell($cells, html);

                if (isNumeric) {
                    $cells[0].css("background-color", bg);
                    $cells[1].css("background-color", bg);
                }
            }
        });

        var allRows = [row].concat(rowDups);
        colDups.forEach(function(colNum) {
            newCol = colNum;
            for (var i = 0, len = allRows.length; i < len; i++) {
                newRow = allRows[i];
                $cells = getCorrCell(newRow, colNum);
                cellCount += updataCorrCell($cells, html);

                if (isNumeric) {
                    $cells[0].css("background-color", bg);
                    $cells[1].css("background-color", bg);
                }
            }
        });

        return cellCount;
    }

    function updataCorrCell($cells, html) {
        var cellCount = 0;
        if ($cells[0].length) {
            $cells[0].html(html);
            cellCount++;
        }

        // if diagonal, $cells[2] === true
        if ($cells[1].length && !$cells[2]) {
            $cells[1].html(html);
            cellCount++;
        }

        return cellCount;
    }

    function getCorrCell(row, col) {
        var colNum = row;
        var rowNum = aggCols.length - 1 - col;

        var diagColNum = col;
        var digaRowNum = aggCols.length - 1 - row;
        var $cell = $corr.find('.cell[data-col=' + colNum + ']' +
                                '[data-row=' + rowNum + ']');
        // the diagonal one
        var $cell2 = $corr.find('.cell[data-col=' + diagColNum + ']' +
                                '[data-row=' + digaRowNum + ']');
        var isSameCell = (row === col);
        return [$cell, $cell2, isSameCell];
    }

    function updateAggCell(row, col, html) {
        var $cell = $quickAgg.find('.cell[data-col=' + col + ']' +
                                   '[data-row=' + row + ']');
        if ($cell.length) {
            $cell.html(html);
        }
    }

    function highlightLabel(row, col) {
        $corr.find(".rowLabel").eq(row).addClass("active");
        $corr.find(".colLabel:not(.blankSpace)").eq(col).addClass("active");
    }

    function deHighlightLabel(row, col) {
        $corr.find(".rowLabel").eq(row).removeClass("active");
        $corr.find(".colLabel:not(.blankSpace)").eq(col).removeClass("active");
    }

    function closeAggModal() {
        modalHelper.clear();
        $aggModal.removeClass('profileMode');
        $aggModal.width(920).height(670);
        cachedTableId = null;
        cachedVertColNums = null;
        cachedHorColNums = null;
        cachedProfileColNum = null;
    }


    /* Unit Test Only */
    if (window.unitTestMode) {
        AggModal.__testOnly__ = {};
        AggModal.__testOnly__.getAggCols = function() {
            return aggCols;
        };
        AggModal.__testOnly__.aggColsInitialize = aggColsInitialize;
        AggModal.__testOnly__.getRowLabelHTML = getRowLabelHTML;
        AggModal.__testOnly__.getColLabelHTML = getColLabelHTML;
        AggModal.__testOnly__.aggTableInitialize = aggTableInitialize;
        AggModal.__testOnly__.corrTableInitialize = corrTableInitialize;
        AggModal.__testOnly__.getCorrCell = getCorrCell;
        AggModal.__testOnly__.highlightLabel = highlightLabel;
        AggModal.__testOnly__.deHighlightLabel = deHighlightLabel;
        AggModal.__testOnly__.checkDupCols = checkDupCols;
        AggModal.__testOnly__.applyCorrResult = applyCorrResult;
    }
    /* End Of Unit Test Only */

    return (AggModal);
}(jQuery, {}));
