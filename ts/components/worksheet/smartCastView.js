window.SmartCastView = (function($, SmartCastView) {
    var $castView; // $("#smartCastView")
    var $castTable; // $("#smartCast-table")

    var curTableId;
    var newColTypes = [];
    var colNames = [];
    var colTypes = [];
    var recTypes = [];
    var isOpen = false;
    var formHelper;

    var validTypes;

    SmartCastView.setup = function() {
        validTypes = [ColumnType.string, ColumnType.integer, ColumnType.float,
            ColumnType.boolean, ColumnType.mixed, ColumnType.timestamp]
        $castView = $("#smartCastView");
        $castTable = $("#smartCast-table");

        formHelper = new FormHelper($castView);

        $castView.on("click", ".cancel, .close", function() {
            SmartCastView.close();
        });

        $castView.on("click", ".clear", function() {
            clearCast();
        });

        $castView.on("click", ".confirm", function() {
            var isValid = xcHelper.validate([{
                "$ele": $castTable,
                "error": ErrTStr.NoCast,
                "check": function() {
                    return ($castTable.find(".row").length === 0);
                }
            }]);

            if (isValid) {
                submitForm();
            }
        });

        $castView.on("click", ".detect", function() {
            smartSuggest(curTableId);
        });

        $castView.on("click", ".colName", function(event) {
            if ($(event.target).is(".removeCol")) {
                return;
            }
            var colNum = $(this).closest(".row").data("col");
            formHelper.focusOnColumn(curTableId, colNum);
        });

        var $castMenu = $("#castMenu");
        xcMenu.add($castMenu);

        $castView.on("click", ".colType", function() {
            var $col = $(this);
            var $row = $col.closest(".row");
            var bound = this.getBoundingClientRect();
            var colNum = $row.data("col");
            var initialType = colTypes[colNum];

            $castMenu.width($col.width())
                    .data("col", colNum);

            xcHelper.dropdownOpen($col, $castMenu, {
                "mouseCoors": {"x": bound.left + 8, "y": bound.bottom},
                "classes": initialType,
                "floating": true,
                "toggle": true
            });
        });

        $castMenu.on("mouseup", "li", function() {
            var colNum = $castMenu.data("col");
            var colType = $(this).data("type");
            changeColType(colNum, colType);
        });

        $castView.on("click", ".removeCol", function() {
            var colNum = $(this).closest(".row").data("col");
            deSelectCol(colNum);
        });
    };

    SmartCastView.show = function(tableId) {
        formHelper.showView();

        curTableId = tableId;
        isOpen = true;

        initialSuggest(tableId);
        smartSuggest(tableId);

        var columnPicker = {
            "state": "smartCastState",
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

    SmartCastView.close = function() {
        if (!isOpen) {
            return;
        }

        isOpen = false;
        formHelper.hideView();

        clearCast();

        newColTypes = [];
        suggColFlags = [];
        colNames = [];
        colTypes = [];
        recTypes = [];
        curTableId = null;
        formHelper.clear();
    };

    SmartCastView.updateColumns = function(tableId) {
        if (!formHelper.isOpen()) {
            return;
        }
        if (tableId !== curTableId) {
            return;
        }

        initialSuggest(curTableId);
    };

    function clearCast() {
        var $table = $("#xcTable-" + curTableId);
        $table.find(".modalHighlighted").removeClass("modalHighlighted");

        $castTable.addClass("empty")
                .find(".tableContent").empty();
        newColTypes = [];
    }

    function submitForm() {
        var len = newColTypes.length;
        var colTypeInfos = [];
        // may be deleted
        if (!gTables.hasOwnProperty(curTableId)) {
            StatusBox.show(ErrTStr.TableNotExists, $castTable);
            return;
        }

        if (!gTables[curTableId].isActive()) {
            StatusBox.show(TblTStr.NotActive, $castTable);
            return;
        }

        for (var colNum = 1; colNum < len; colNum++) {
            var newType = newColTypes[colNum];

            if (newType == null || newType === colTypes[colNum]) {
                continue;
            }

            colTypeInfos.push({
                "colNum": colNum,
                "type": newType
            });
        }

        if (colTypeInfos.length > 0) {
            ColManager.changeType(colTypeInfos, curTableId);
            SmartCastView.close();
        } else {
            StatusBox.show(ErrTStr.NoTypeChange, $castTable);
        }
    }

    function selectCol(colNum) {
        var $table = $("#xcTable-" + curTableId);
        $table.find(".col" + colNum).addClass("modalHighlighted");
        var isInValidType = (recTypes[colNum] == null);
        var type = colTypes[colNum];
        var html = getRowHTML(colNum, type, true, isInValidType);

        $castTable.removeClass("empty")
            .find(".tableContent").append(html);

        newColTypes[colNum] = type;
        xcHelper.scrollToBottom($castView.find(".mainContent"));
    }

    function deSelectCol(colNum) {
        var $table = $("#xcTable-" + curTableId);
        $table.find(".col" + colNum).removeClass("modalHighlighted");
        newColTypes[colNum] = null;
        getRow(colNum).remove();

        if ($castTable.find(".row").length === 0) {
            $castTable.addClass("empty");
        }
    }

    function changeColType(colNum, colType) {
        if (colNum == null || validTypes.indexOf(colType) < 0) {
            console.error("error arguments");
            return;
        }

        var $col = getRow(colNum).find(".colType");
        $col.find(".text").text(colType);
        newColTypes[colNum] = colType;
        if (colType === colTypes[colNum]) {
            $col.addClass("initialType");
        } else {
            $col.removeClass("initialType");
        }
    }

    function getRow(colNum) {
        return $castTable.find(".row[data-col='" + colNum + "']");
    }

    function smartSuggest(tableId) {
        var html = "";
        var $table = $("#xcTable-" + tableId);
        $table.find(".modalHighlighted").removeClass("modalHighlighted");

        for (var colNum = 1, len = recTypes.length; colNum < len; colNum++) {
            var recType = recTypes[colNum];
            if (recType == null || recType === colTypes[colNum]) {
                newColTypes[colNum] = null;
                continue; // unselectable case
            }

            $table.find(".col" + colNum).addClass("modalHighlighted");

            newColTypes[colNum] = recType;

            html += getRowHTML(colNum, recType);
        }

        if (html === "") {
            $castTable.addClass("empty").find(".tableContent").empty();
        } else {
            $castTable.removeClass("empty")
                .find(".tableContent").html(html);
        }
    }

    function getRowHTML(colNum, type, isInitial, isInValidType) {
        var colTypeClass = "col colType clickable";
        if (isInitial) {
            colTypeClass += " initialType";
        }
        if (isInValidType) {
            colTypeClass += " xc-disabled";
        }

        var colName = xcHelper.escapeHTMLSpecialChar(colNames[colNum]);
        var html = '<div class="row" data-col="' + colNum + '">' +
                        '<div class="col colName ' +
                        'textOverflowOneLine tooltipOverflow" ' +
                        xcTooltip.Attrs +
                        'data-original-title="' +
                        xcHelper.escapeDblQuoteForHTML(
                            xcHelper.escapeHTMLSpecialChar(colName)) + '">' +
                            colName +
                        '<i class="icon xi-close xc-action removeCol"></i>' +
                        '</div>' +
                        '<div class="' + colTypeClass + '">' +
                            '<div class="text">' +
                                type +
                            '</div>' +
                            '<div class="dropdownBox xc-action">' +
                                '<div class="innerBox"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>';
        return html;
    }

    function suggestType($tbody, colNum, type) {
        if (type === ColumnType.float ||
            type === ColumnType.boolean ||
            type === ColumnType.mixed
        ) {
            return type;
        }

        var $tds = $tbody.find("td.col" + colNum);
        var datas = [];
        var val;

        $tds.each(function() {
            val = $(this).find('.originalData').text();
            datas.push(val);
        });
        return xcSuggest.suggestType(datas, type);
    }

    function initialSuggest(tableId) {
        var tableCols = gTables[tableId].tableCols;

        var $table = $("#xcTable-" + tableId);
        var $tbody = $table.find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();

        colNames = [];
        colTypes = [];
        recTypes = [];

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                continue;
            }

            var colName = progCol.getFrontColName(true);
            var type = progCol.getType();
            var colNum = i + 1;

            // cache colNames
            colNames[colNum] = colName;
            // cache colTypes
            colTypes[colNum] = type;

            if (type === ColumnType.object ||
                type === ColumnType.array ||
                type === ColumnType.undefined ||
                progCol.isEmptyCol())
            {
                // unselectable column
                recTypes[colNum] = null;
            } else {
                recTypes[colNum] = suggestType($tbody, colNum, type);
            }
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        SmartCastView.__testOnly__ = {};
        SmartCastView.__testOnly__.selectCol = selectCol;
        SmartCastView.__testOnly__.deSelectCol = deSelectCol;
        SmartCastView.__testOnly__.changeColType = changeColType;
        SmartCastView.__testOnly__.submitForm = submitForm;
        SmartCastView.__testOnly__.getInfo = function() {
            return {colNames: colNames, colTypes: colTypes, recTypes: recTypes};
        };
    }
    /* End Of Unit Test Only */

    return (SmartCastView);
}(jQuery, {}));
