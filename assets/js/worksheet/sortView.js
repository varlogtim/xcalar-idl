window.SortView = (function($, SortView) {
    var $sortView; // $("#sortView")
    var $sortTable; // $("#sortView-table")

    var curTableId;
    var newColOrders = [];
    var colNames = [];
    var colTypes = [];
    var colOrders = [];
    var formHelper;

    // constant
    var validTypes = ["string", "integer", "float", "boolean"];

    SortView.setup = function() {
        $sortView = $("#sortView");
        $sortTable = $("#sortView-table");

        formHelper = new FormHelper($sortView);

        $sortView.on("click", ".cancel, .close", function() {
            SortView.close();
        });

        $sortView.on("click", ".clear", function() {
            clearSort();
        });

        $sortView.on("click", ".confirm", function() {
            var isValid = xcHelper.validate([{
                "$ele": $sortTable,
                "error": ErrTStr.NoSort,
                "check": function() {
                    return ($sortTable.find(".row").length === 0);
                }
            }]);

            if (isValid) {
                submitForm();
            }
        });

        $sortView.on("click", ".colName", function() {
            var colNum = $(this).closest(".row").data("col");
            scrollToColumn(colNum);
        });

        var $sortMenu = $("#sortViewMenu");
        xcMenu.add($sortMenu);

        $sortView.on("click", ".colOrder", function() {
            var $col = $(this);
            var $row = $col.closest(".row");
            var bound = this.getBoundingClientRect();
            var colNum = $row.data("col");
            var initialOrder = colOrders[colNum];
            if (initialOrder) {
                initialOrder = initialOrder.toLowerCase();
            } else {
                initialOrder = "noInitialOrder";
            }

            $sortMenu.width($col.width())
                    .data("col", colNum);

            xcHelper.dropdownOpen($col, $sortMenu, {
                "mouseCoors": {"x": bound.left + 1, "y": bound.bottom},
                "classes": initialOrder,
                "floating": true,
                "toggle": true
            });
        });

        $sortMenu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var colNum = $sortMenu.data("col");
            var colOrder = $(this).data("order");
            colOrder = colOrder[0].toUpperCase() + colOrder.slice(1);
            changeColOrder(colNum, colOrder);
        });
    };

    SortView.show = function(colNums, tableId, options) {
        options = options || {};
        if (options.restoreTime &&
            options.restoreTime !== formHelper.getOpenTime()) {
            return;
        }
        formHelper.showView();

        curTableId = tableId;

        if (options.restore) {
            restoreHighlightedCols();
        } else {
            resetForm();
            setColumnCache(tableId);
            for (var i = 0; i < colNums.length; i++) {
                selectCol(colNums[i], true);
            }
        }

        var columnPicker = {
            "state": "sortViewState",
            "validColTypes": validTypes,
            "colCallback": function($target) {
                var id = $target.closest(".xcTable").data("id");
                if (id !== curTableId) {
                    return;
                }

                var $cell;
                if ($target.closest("th").length > 0) {
                    $cell = $target.closest("th");
                } else {
                    $cell = $target.closest("td");
                }
                var colNum = xcHelper.parseColNum($cell);
                if ($cell.hasClass("modalHighlighted")) {
                    deSelectCol(colNum);
                } else {
                    selectCol(colNum);
                }
            }
        };
        formHelper.setup({"columnPicker": columnPicker});
    };

    SortView.close = function() {
        if (!formHelper.isOpen()) {
            return;
        }

        formHelper.hideView();
        formHelper.clear();
        clearSort(true);
        curTableId = null;
    };

    function resetForm() {
        colNames = [];
        colTypes = [];
        colOrders = [];
        clearSort();
    }

    function clearSort(keepData) {
        var $table = $("#xcTable-" + curTableId);
        $table.find(".modalHighlighted").removeClass("modalHighlighted");
        $(".xcTable").find(".formColNum").remove();

        if (!keepData) {
            $sortTable.addClass("empty")
                .find(".tableContent").empty();
            newColOrders = [];
        }
    }

    function submitForm() {
        // var len = newColOrders.length;
        var colInfos = [];
        // may be deleted
        if (!gTables.hasOwnProperty(curTableId)) {
            StatusBox.show(ErrTStr.TableNotExists, $sortTable);
            return;
        }

        for (var i = 0; i < newColOrders.length; i++) {
            var colNum = newColOrders[i].colNum;
            var newOrder = newColOrders[i].order;
            if (newOrder === colOrders[colNum] && newColOrders.length === 1) {
                break;
            }
            newOrder = (newOrder === XcalarOrderingTStr[XcalarOrderingT
                                                    .XcalarOrderingAscending]) ?
                        XcalarOrderingT.XcalarOrderingAscending :
                        XcalarOrderingT.XcalarOrderingDescending;

            colInfos.push({
                "colNum": colNum,
                "order": newOrder,
                "typeToCast": null
            });
        }


        if (colInfos.length > 0) {
            var options = {
                "formOpenTime": formHelper.getOpenTime()
            };

            xcFunction.sort(curTableId, colInfos, options);
            SortView.close();
        } else {
            StatusBox.show(ErrTStr.NoSortChange, $sortTable);
        }
    }

    function selectCol(colNum, firstTime) {
        var type = colTypes[colNum];
        var isInValidType = validTypes.indexOf(type) === -1;
        if (firstTime && isInValidType) {
            return;
        }
        var $table = $("#xcTable-" + curTableId);
        $table.find(".col" + colNum).addClass("modalHighlighted");
        var order = colOrders[colNum] ||
                    XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending];
        var isInitialOrder = (order === colOrders[colNum]);
        var html = getRowHTML(colNum, order, isInitialOrder, isInValidType);

        $sortTable.removeClass("empty")
            .find(".tableContent").append(html);
        newColOrders.push({
            colNum: colNum,
            order: order
        });
        xcHelper.scrollToBottom($sortView.find(".mainContent"));
        updateColHeaderNums($table);
    }


    function updateColHeaderNums($table) {
        $(".xcTable").find(".formColNum").remove();
        for (var i = 0; i < newColOrders.length; i++) {
            var colNum = newColOrders[i].colNum;
            $table.find("th.col" + colNum + ' .header')
                 .append('<span class="formColNum">' + (i + 1) + '</span>');
        }
    }

    function restoreHighlightedCols() {
        var $table = $("#xcTable-" + curTableId);
        for (var i = 0; i < newColOrders.length; i++) {
            $table.find(".col" + newColOrders[i].colNum)
                  .addClass("modalHighlighted");
        }
        updateColHeaderNums($table);
    }

    function deSelectCol(colNum) {
        var $table = $("#xcTable-" + curTableId);
        $table.find(".col" + colNum).removeClass("modalHighlighted");
        for (var i = 0; i < newColOrders.length; i++) {
            if (newColOrders[i].colNum === colNum) {
                newColOrders.splice(i, 1);
                break;
            }
        }
        getRow(colNum).remove();

        if ($sortTable.find(".row").length === 0) {
            $sortTable.addClass("empty");
        }
        updateColHeaderNums($table);
    }

    function changeColOrder(colNum, colOrder) {
        if (colNum == null) {
            console.error("error arguments");
            return;
        }

        var $col = getRow(colNum).find(".colOrder");
        $col.find(".text").text(colOrder);
        for (var i = 0; i < newColOrders.length; i++) {
            if (newColOrders[i].colNum === colNum) {
                newColOrders[i].order = colOrder;
                break;
            }
        }
        if (colOrder === colOrders[colNum]) {
            $col.addClass("initialOrder");
        } else {
            $col.removeClass("initialOrder");
        }
    }

    function getRow(colNum) {
        return $sortTable.find(".row[data-col='" + colNum + "']");
    }

    function getRowHTML(colNum, order, isInitial, isInValidType) {
        var colTypeClass = "col colOrder clickable";
        if (isInitial) {
            colTypeClass += " initialOrder";
        }
        if (isInValidType) {
            colTypeClass += " xc-disabled";
        }

        var colName = colNames[colNum];
        var html = '<div class="row" data-col="' + colNum + '">' +
                        '<div class="col colName ' +
                        'textOverflowOneLine tooltipOverflow" ' +
                        'data-toggle="tooltip" data-placement="top"' +
                        'data-container="body" ' +
                        'data-original-title="' + colName + '">' +
                            colName +
                        '</div>' +
                        '<div class="' + colTypeClass + '">' +
                            '<div class="text">' +
                                order +
                            '</div>' +
                            '<div class="dropdownBox xc-action">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
        return html;
    }

    function scrollToColumn(colNum) {
        if (colNum == null) {
            // error case
            return;
        }

        var ws = WSManager.getWSFromTable(curTableId);
        if (ws !== WSManager.getActiveWS()) {
            WSManager.focusOnWorksheet(ws, true);
        }

        xcHelper.centerFocusedColumn(curTableId, colNum, true);

        var $th = $("#xcTable-" + curTableId).find("th.col" + colNum);
        xcTooltip.transient($th, {
            "title": TooltipTStr.FocusColumn,
            "container": "#container",
        }, 1000);
    }

    function setColumnCache(tableId) {
        var table = gTables[tableId];
        var tableCols = table.tableCols;
        var tableKeys = table.getKeyName();
        var tableOrder = table.backTableMeta.ordering;

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                continue;
            }

            var colName = progCol.getFrontColName(true);
            var isSorted = tableKeys.includes(progCol.getBackColName());
            var type = progCol.getType();
            var colNum = i + 1;

            // cache colNames
            colNames[colNum] = colName;
            // cache colTypes
            colTypes[colNum] = type;
            if (isSorted) {
                if (tableOrder === XcalarOrderingT.XcalarOrderingAscending) {
                    colOrders[colNum] = XcalarOrderingTStr[XcalarOrderingT
                                                     .XcalarOrderingAscending];
                } else if (tableOrder === XcalarOrderingT.XcalarOrderingDescending) {
                    colOrders[colNum] = XcalarOrderingTStr[XcalarOrderingT
                                                     .XcalarOrderingDescending];
                } else {
                    colOrders[colNum] = null;
                }
            } else {
                colOrders[colNum] = null;
            }
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SortView.__testOnly__ = {};
        SortView.__testOnly__.selectCol = selectCol;
        SortView.__testOnly__.deSelectCol = deSelectCol;
        SortView.__testOnly__.changeColOrder = changeColOrder;
        SortView.__testOnly__.scrollToColumn = scrollToColumn;
        SortView.__testOnly__.submitForm = submitForm;
    }
    /* End Of Unit Test Only */

    return (SortView);
}(jQuery, {}));
