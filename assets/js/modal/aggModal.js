window.AggModal = (function($, AggModal) {
    var $modalBg;      // $("#modalBackground")
    var $aggModal;     // $("#aggModal")

    var $aggInstr;     // $("#aggModal-instr")
    var $aggTableName; // $("#aggModal-tableName")

    var $quickAgg;     // $("#aggModal-quickAgg")
    var $corr;         // $("#aggModal-corr")
    var modalHelper;

    var aggFunctions;  // [AggrOp.Sum, AggrOp.Avg, AggrOp.Min, AggrOp.Max, AggrOp.Count]
    var aggCols = [];

    // UI cahce, not save to KVStore
    var aggCache  = {};
    var corrCache = {};
    var aggOpMap  = {};

    // constant
    var minWidth  = 580;
    var minHeight = 300;

    AggModal.setup = function() {
        $modalBg = $("#modalBackground");
        $aggModal = $("#aggModal");

        $aggInstr = $("#aggModal-instr");
        $aggTableName = $("#aggModal-tableName");

        $quickAgg = $("#aggModal-quickAgg");
        $corr = $("#aggModal-corr");

        modalHelper = new ModalHelper($aggModal, {
            "minWidth" : minWidth,
            "minHeight": minHeight
        });

        aggFunctions = [AggrOp.Sum, AggrOp.Avg, AggrOp.Min,
                         AggrOp.Max, AggrOp.Count];

        aggOpMap[AggrOp.Sum] = 0;
        aggOpMap[AggrOp.Avg] = 1;
        aggOpMap[AggrOp.Min] = 2;
        aggOpMap[AggrOp.Max] = 3;
        aggOpMap[AggrOp.Count] = 4;

        $aggModal.draggable({
            "handle"     : ".modalHeader",
            "cursor"     : "-webkit-grabbing",
            "containment": "window"
        });

        $aggModal.resizable({
            "handles"    : "n, e, s, w, se",
            "minHeight"  : minHeight,
            "minWidth"   : minWidth,
            "containment": "document"
        });

        $aggModal.on("click", ".close", function() {
            closeAggModel();
        });

        $aggModal.on("mouseenter", ".tooltipOverflow", function() {
            xcHelper.autoTooltip(this);
        });


        $quickAgg.find(".aggContainer").scroll(function() {
            scrollHelper($(this), $quickAgg);
        });

        $corr.find(".aggContainer").scroll(function() {
            scrollHelper($(this), $corr);
        });

        function scrollHelper($container, $mainAgg) {
            var scrollTop = $container.scrollTop();
            var scrollLeft = $container.scrollLeft();
            $mainAgg.find(".labelContainer").scrollTop(scrollTop);
            $mainAgg.find(".headerContainer").scrollLeft(scrollLeft);
        }
    };

    AggModal.quickAgg = function(tableId) {
        var deferred = jQuery.Deferred();

        var table     = gTables[tableId];
        var tableName = table.tableName;

        showAggModal(tableName, "quickAgg");

        aggColsInitialize(tableId);
        aggTableInitialize();

        var sql = {
            "operation": SQLOps.QuickAgg,
            "tableId"  : tableId,
            "tableName": tableName
        };
        var txId = Transaction.start({
            "operation": SQLOps.QuickAgg,
            "sql"      : sql
        });

        calcAgg(tableName, tableId, txId)
        .then(function() {
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Quick Aggregate Fails", error);
            Transaction.fail(txId, {
                "noAlert": true,
                "error"  : error
            });
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    AggModal.corr = function(tableId) {
        var deferred = jQuery.Deferred();

        var table     = gTables[tableId];
        var tableName = table.tableName;
        showAggModal(tableName, "corr");

        aggColsInitialize(tableId);
        corrTableInitialize();

        var sql = {
            "operation": SQLOps.Corr,
            "tableId"  : tableId,
            "tableName": tableName
        };
        var txId = Transaction.start({
            "operation": SQLOps.Corr,
            "sql"      : sql
        });

        calcCorr(tableName, tableId, txId)
        .then(function() {
            Transaction.done(txId);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Quick Aggregate Fails", error);
            Transaction.fail(txId, {
                "noAlert": true,
                "error"  : error
            });
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    function showAggModal(tableName, mode) {
        var $header = $aggModal.find(".modalHeader .text");

        if (mode === "quickAgg") {
            // when it's quick aggregation
            $quickAgg.show();
            $corr.hide();
            $header.text(AggTStr.QuickAggTitle);
            $aggInstr.text(AggTStr.QuickAggInstr);
        } else if (mode === "corr") {
            // when it's correlation
            $quickAgg.hide();
            $corr.show();
            $header.text(AggTStr.CorrTitle);
            $aggInstr.text(AggTStr.CorrInstr);
        } else {
            // error case
            throw "Invalid mode in quick agg!";
        }

        $aggTableName.find(".text").text(tableName);
        modalHelper.setup();

        if (gMinModeOn) {
            $modalBg.show();
            $aggModal.show();
            showHandler();
        } else {
            $modalBg.fadeIn(300, function() {
                $aggModal.fadeIn(180);
                showHandler();
            });
        }

        function showHandler() {
            Tips.refresh();
            $aggModal.find(".aggContainer")
                    .scrollTop(0)
                    .scrollLeft(0);
        }
    }

    function aggColsInitialize(tableId) {
        aggCols = [];

        var $table = $("#xcTable-" + tableId);
        var tableCols = gTables[tableId].tableCols;
        for (var i = 0, colLen = tableCols.length; i < colLen; i++) {
            var progCol = tableCols[i];
            // Skip DATA!
            if (progCol.isDATACol()) {
                continue;
            } else {
                var colNum = i + 1;
                var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");
                aggCols.push({
                    "col"           : progCol,
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
            var progCol = aggCol.col;
            var isChildOfArray = aggCol.isChildOfArray;

            colLabels.push(progCol.getFronColName());
            wholeTable += '<div class="aggCol">';

            for (var row = 0; row < funLen; row++) {
                wholeTable += '<div class="aggTableField">';

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

        $quickAgg.find(".headerContainer").html(getColLabelHTML(colLabels));
        $quickAgg.find(".labelContainer").html(getRowLabelHTML(aggFunctions));
        $quickAgg.find(".aggContainer").html(wholeTable);
    }

    function corrTableInitialize() {
        var colLen = aggCols.length;
        var wholeTable = '';
        var blankCell = '<div class="aggTableField aggTableFlex blankSpace">';
        var normalCell = '<div class="aggTableField aggTableFlex">';


        // column's order is column0, column1...columnX
        // row's order is columnX, column(X-1).....column1
        var colLabels = [];

        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
            var progCol = aggCol.col;
            var isChildOfArray = aggCol.isChildOfArray;

            colLabels.push(progCol.getFronColName());

            wholeTable += '<div class="aggCol">';

            for (var row = 0; row < colLen; row++) {
                var aggRow  = aggCols[colLen - row - 1];
                var vertCol = aggRow.col;

                if (row + col + 1 >= colLen) {
                    // blank case
                    wholeTable += blankCell;
                } else if (progCol.isNumberCol() && vertCol.isNumberCol()) {
                    // XXX now agg on child of array is not supported
                    if (isChildOfArray || aggRow.isChildOfArray) {
                        wholeTable += normalCell + AggTStr.NoSupport;
                    } else {
                        wholeTable += normalCell +
                                        '<div class="spinner">' +
                                            '<div class="bounce1"></div>' +
                                            '<div class="bounce2"></div>' +
                                            '<div class="bounce3"></div>' +
                                        '</div>';
                    }
                } else {
                    wholeTable += normalCell + 'N/A';
                }
                wholeTable += "</div>";
            }

            wholeTable += "</div>";
        }

        var vertLabels = [];
        for (var i = colLen - 1; i >= 0; i--) {
            vertLabels.push(aggCols[i].col.getFronColName());
        }

        $corr.find(".headerContainer").html(getColLabelHTML(colLabels));
        $corr.find(".labelContainer").html(getRowLabelHTML(vertLabels));
        $corr.find(".aggContainer").html(wholeTable);
    }

    function getRowLabelHTML(operations) {
        var html = '<div class="aggCol labels">';

        for (var i = 0, len = operations.length; i < len; i++) {
            html += '<div class="aggTableField rowLabel">' +
                        '<span title="' + operations[i] + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="textOverflow tooltipOverflow">' +
                            operations[i] +
                        '</span>' +
                    '</div>';
        }

        html += '</div>';
        return (html);
    }

    function getColLabelHTML(labels) {
        var html = '<div class="padding"></div>' +
                    '<div class="aggTableField colLabel blankSpace"></div>';

        for (var i = 0, len = labels.length; i < len; i++) {
            html += '<div class="aggTableField colLabel">' +
                        '<span title="' + labels[i] + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="textOverflow tooltipOverflow">' +
                            labels[i] +
                        '</span>' +
                    '</div>';
        }

        html += '</div>';
        return (html);
    }

    function calcCorr(tableName, tableId, txId) {
        var deferred = jQuery.Deferred();
        var promises = [];

        var colLen  = aggCols.length;
        var dupCols = [];
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

            if (progCol.isNumberCol()) {
                if (dupCols[col]) {
                    // for duplicated columns, no need to trigger thrift call
                    continue;
                }

                var dups = checkDupCols(col);
                for (var t = 0; t < dups.length; t++) {
                    var dupColNum = dups[t];
                    dupCols[dupColNum] = true;

                    if (dupColNum > col) {
                        applyCorrResult(col, dupColNum, 1, []);
                    }
                }

                // XXX now agg on child of array is not supported
                if (!aggCol.isChildOfArray) {
                    for (var row = 0; row < col; row++) {
                        var aggRow = aggCols[row];
                        var vertCol = aggRow.col;
                        if (!vertCol.isNumberCol() || aggRow.isChildOfArray) {
                            continue;
                        }
                        var sub = corrString.replace(/[$]arg1/g,
                                                     progCol.getBackColName());
                        sub = sub.replace(/[$]arg2/g,
                                            vertCol.getBackColName());
                        // Run correlation function
                        var promise = runCorr(tableId, tableName,
                                              sub, row, col, dups, txId);
                        promises.push(promise);
                    }
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

            deferred.reject("Unknow Correlation Error");
        });

        return deferred.promise();
    }

    function calcAgg(tableName, tableId, txId) {
        var promises = [];

        var colLen = aggCols.length;
        var funLen = aggFunctions.length;
        // First we need to determine if this is a dataset-table
        // or just a regular table
        var dupCols = [];
        for (var col = 0; col < colLen; col++) {
            var aggCol = aggCols[col];
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
                        var promise = runAgg(tableId, tableName,
                                            progCol.getBackColName(),
                                            aggFunctions[row], row, col,
                                            dups, txId);
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

    function runAgg(tableId, tableName, fieldName, opString, row, col, dups, txId) {
        var deferred = jQuery.Deferred();
        var tableAgg;
        var colAgg;

        if (aggCache.hasOwnProperty(tableId)) {
            tableAgg = aggCache[tableId];
            if (tableAgg.hasOwnProperty(fieldName)) {
                colAgg = tableAgg[fieldName];
                var aggRes = colAgg[aggOpMap[opString]];
                if (aggRes != null) {
                    applyAggResult(aggRes);
                    deferred.resolve();
                    return (deferred.promise());
                }
            }
        }

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
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("quick agg error", error);
            applyAggResult("--", error.error);
            // still resolve
            deferred.resolve();
        });

        function applyAggResult(value, error) {
            var title = (error == null) ? value : error;
            // error case force to have tooltip
            var spanClass = (error == null) ? "textOverflow tooltipOverflow" :
                                            "textOverflow";
            var html = '<span class="' + spanClass + '" ' + 'title="' + title +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body">' +
                        (jQuery.isNumeric(value) ? value.toFixed(3) : value) +
                        '</span>';
            $quickAgg.find(".aggCol:not(.labels)").eq(col)
                .find(".aggTableField:not(.colLabel)").eq(row).html(html);

            dups.forEach(function(colNum) {
                $quickAgg.find(".aggCol:not(.labels)").eq(colNum)
                    .find(".aggTableField:not(.colLabel)").eq(row).html(html);
            });
        }

        return (deferred.promise());
    }

    function runCorr(tableId, tableName, evalStr, row, col, colDups, txId) {
        var deferred = jQuery.Deferred();

        if (corrCache.hasOwnProperty(tableId)) {
            var corrRes = corrCache[tableId][evalStr];

            if (corrRes != null) {
                applyCorrResult(row, col, corrRes, colDups);
                deferred.resolve();
                return (deferred.promise());
            }
        }

        XIApi.aggregateWithEvalStr(txId, evalStr, tableName)
        .then(function(value) {
            // cache value
            corrCache[tableId] = corrCache[tableId] || {};
            corrCache[tableId][evalStr] = value;
            // end of cache value

            applyCorrResult(row, col, value, colDups);
            deferred.resolve();
        })
        .fail(function(error) {
            console.error("Correlation Error", error);

            if (error.status === StatusT.StatusXdfDivByZero) {
                error.error += "(" + AggTStr.DivByZeroExplain + ")";
            }

            applyCorrResult(row, col, "--", colDups, error.error);
            // still resolve
            deferred.resolve();
        });

        return (deferred.promise());
    }

    function applyCorrResult(row, col, value, colDups, error) {
        var isNumeric = jQuery.isNumeric(value);
        var bg;
        var $cell;

        var title = (error == null) ? value : error;
        // error case force to have tooltip
        var spanClass = (error == null) ? "textOverflow tooltipOverflow" :
                                            "textOverflow";
        var html = '<span class="' + spanClass + '" ' + 'title="' + title +
                    '" data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body">' +
                        (isNumeric ? value.toFixed(3) : value) +
                    '</span>';

        $cell = getCorrCell(row, col);
        $cell.html(html);

        if (isNumeric) {
            value = parseFloat(value);
            var l;

            if (value > 0) {
                // when value is 1, color is rgb(105, 183, 233),
                // which is hsl(203, 75%, 66%)
                l = 100 - Math.round(34 * value, 2);
                bg = "hsl(203, 75%, " + l + "%)";
            } else if (value === 0) {
                bg = "rgb(255,255,255)";
            } else {
                // when value is -1, color is rgb(200, 200, 200),
                // which is hsl(0, 0%, 78%)
                l = 100 - Math.round(-22 * value, 2);
                bg = "hsl(0, 0%, " + l + "%)";
            }

            $cell.css("background-color", bg);
        }

        var rowDups = checkDupCols(row);
        var newCol;
        var newRow;
        rowDups.forEach(function(rowNum) {
            newRow = col;
            newCol = rowNum;

            if (newCol > newRow) {
                $cell = getCorrCell(newRow, newCol);
                $cell.html(html);

                if (isNumeric) {
                    $cell.css("background-color", bg);
                }
            }
        });

        var allRows = [row].concat(rowDups);
        colDups.forEach(function(colNum) {
            newCol = colNum;
            for (var i = 0, len = allRows.length; i < len; i++) {
                newRow = allRows[i];
                $cell = getCorrCell(newRow, colNum);
                $cell.html(html);

                if (isNumeric) {
                    $cell.css("background-color", bg);
                }
            }
        });
    }

    function getCorrCell(row, col) {
        var colNum = row;
        var rowNum = aggCols.length - 1 - col;

        return $corr.find(".aggCol:not(.labels)")
                    .eq(colNum)
                    .find(".aggTableField:not(.colLabel)")
                    .eq(rowNum);
    }

    function closeAggModel() {
        var fadeOutTime = gMinModeOn ? 0 : 300;

        $aggModal.hide();
        $modalBg.fadeOut(fadeOutTime, function() {
            Tips.refresh();
        });
        $aggModal.width(920).height(670);
        modalHelper.clear();
    }

    return (AggModal);
}(jQuery, {}));
