window.MultiCastModal = (function($, MultiCastModal) {
    var $modal = $("#multiCastModal");
    var $modalBg = $("#modalBackground");
    var $table = $("#multiCast-table");
    var $resultSection = $("#multiCast-result");
    var $castBtn = $("#multiCast-cast");

    var minHeight = 500;
    var minWidth  = 1000;

    var curTableId;
    var newColTypes = [];
    var colNames = [];
    var colTypes = [];
    var recTypes = [];

    MultiCastModal.setup = function() {
        $modal.resizable({
            handles    : "n, e, s, w, se",
            minHeight  : minHeight,
            minWidth   : minWidth,
            maxHeight  : 782,
            containment: "document"
        });

        $modal.draggable({
            "handle": ".modalHeader",
            "cursor": "-webkit-grabbing"
        });

        $modal.on("click", ".cancel, .close", function() {
            closeMultiCastModal();
        });

        $modal.on("click", ".confirm", function() {
            var len = newColTypes.length;
            var colTypeInfos = [];

            for (var colNum = 1; colNum < len; colNum++) {
                var newType = newColTypes[colNum];

                if (newType == null || newType === colTypes[colNum]) {
                    continue;
                }

                colTypeInfos.push({
                    "colNum": colNum,
                    "type"  : newType
                });
            }

            if (colTypeInfos.length > 0) {
                ColManager.changeType(colTypeInfos, curTableId);
            }
            closeMultiCastModal();
        });

        $modal.on("click", "th", function() {
            var $th = $(this);

            if ($th.hasClass("unselectable")) {
                return;
            }

            if ($th.hasClass("colSelected")) {
                deSelectCols($th);
            } else {
                selectCols($th);
            }
        });

        $modal.on("click", ".selectAll", function() {
            var $ths = $table.find("th:not(.unselectable):not(.colSelected)");
            selectCols($ths);
        });

        $modal.on("click", ".deSelectAll", function() {
            var $ths = $table.find("th.colSelected");
            deSelectCols($ths);
        });

        $castBtn.click(function() {
            updateTypeInfo(true);
        });

        $modal.on("click", ".area", function() {
            var colNum = $(this).data("col");
            if (colNum != null) {
                scrollToColumn($table.find("th.col" + colNum));
            }
        });

        $modal.on("mouseenter", ".tooltipTag", function(){
            var $this = $(this);
            if (this.offsetWidth < this.scrollWidth){
                $this.attr({
                    "data-container": "body",
                    "data-toggle"   : "tooltip"
                });
            } else {
                $this.removeAttr('title data-container data-toggle');
            }
        });
    };

    MultiCastModal.show = function(tableId) {
        curTableId = tableId;
        centerPositionElement($modal);

        if (gMinModeOn) {
            $modalBg.show();
            $modal.show();
        } else {
            $modalBg.fadeIn(300, function() {
                $modal.fadeIn(180);
            });
        }

        buildTable(tableId);

        var $lists = $table.find(".header:not(.unselectable) .listSection");

        xcHelper.dropdownList($lists, {
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                // var colNum = parseInt($list.data("col"));
                var type   = $li.text();

                $input.val(type);
                selectCols($list.closest("th"));
            },
            "container": "#multiCastModal"
        });

        $(document).on("mousedown.multiCastModal", function() {
            xcHelper.hideDropdowns($modal);
        });
    };

    function closeMultiCastModal() {
        var fadeOutTime = gMinModeOn ? 0 : 300;
        $modal.hide();
        $modalBg.fadeOut(fadeOutTime);
        $table.html("");
        $resultSection.html("");

        $(document).off(".multiCastModal");

        newColTypes = [];
        colNames = [];
        colTypes = [];
        recTypes = [];
        curTableId = null;
    }

    function selectCols($ths) {
        var colNum;
        var $th;
        var newColType;

        $ths.each(function() {
            $th = $(this);
            colNum = parseInt($th.data("col"));
            $table.find(".col" + colNum).addClass("colSelected");

            newColType = $th.find(".listSection input").val();
            newColTypes[colNum] = newColType;
        });

        updateTypeInfo();
    }

    function deSelectCols($ths) {
        var colNum;
        var $th;

        $ths.each(function() {
            $th = $(this);
            colNum = parseInt($th.data("col"));
            $table.find(".col" + colNum).removeClass("colSelected");
            newColTypes[colNum] = null;
        });

        updateTypeInfo();
    }

    function updateTypeInfo(isSmart) {
        var html = "";
        var len = newColTypes.length;
        var count = 0;
        var newType;
        var newTypeClass;

        for (var colNum = 1; colNum < len; colNum++) {
            newType = newColTypes[colNum];
            if (newType == null) {
                continue;
            }

            newTypeClass = "newType";

            if (isSmart && newType !== recTypes[colNum]) {
                newType = newColTypes[colNum] = recTypes[colNum];
                newTypeClass += " highlight";
                $table.find("th.col" + colNum).addClass("highlight")
                        .find(".text").val(newType);
            } else {
                $table.find("th.col" + colNum).removeClass("highlight");
            }

            html += '<div title="' + colNames[colNum] + " : " +
                        colTypes[colNum] + " -> " + newType +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body" ' +
                        'class="area textOverflow tooltipTag" ' +
                        'data-col="' + colNum + '">' +
                        colNames[colNum] + " : " +
                        '<span class="oldType">' +
                            colTypes[colNum] +
                        '</span>' +
                        ' -> ' +
                        '<span class="' + newTypeClass + '">' +
                            newType +
                        '</span>' +
                    '</div>';
            count++;
        }

        if (isSmart && count === 0) {
            $castBtn.tooltip({
                "title"    : "Please select the column you want to cast",
                "placement": "right",
                "animation": "true",
                "container": "#multiCastModal",
                "trigger"  : "manual",
                "template" : '<div class="tooltip error" role="tooltip">' +
                                '<div class="tooltip-arrow"></div>' +
                                '<div class="tooltip-inner"></div>' +
                            '</div>'
            });

            $castBtn.tooltip("show");
            setTimeout(function() {
                $castBtn.tooltip("destroy");
            }, 1000);
        }

        // padding part
        len = (3 - count % 3) % 3;
        for (var i = 0; i < len; i++) {
            html += '<div class="area textOverflow"></div>';
        }

        $resultSection.html(html);
    }

    function suggestType($tbody, colNum, type) {
        if (type === "decimal" || type === "boolean") {
            return type;
        }

        var $tds = $tbody.find("td.col" + colNum + "");
        var isNumber;
        var isInteger;
        var isDecimal;
        var isOnly10;
        var isBoolean;

        $tds.each(function() {
            var text = $(this).text().trim().toLowerCase();
            if (text === "") {
                // skip this one
                return true;
            }

            if (isNumber == null || isNumber) {
                var num = Number(text);
                if (isNaN(num)) {
                    isNumber = false;
                    isInteger = false;
                    isDecimal = false;
                } else {
                    isNumber = true;
                    if ((isInteger == null || isInteger) &&
                        Number.isInteger(num))
                    {
                        isInteger = true;
                        isDecimal = false;

                        if ((isOnly10 == null || isOnly10) &&
                            (num === 0 || num === 1))
                        {
                            isOnly10 = true;
                        } else {
                            isOnly10 = false;
                        }
                    } else {
                        isDecimal = true;
                        isInteger = false;
                    }
                }
            } else if (isBoolean == null || isBoolean) {
                isBoolean = (text === "true" || text === "false" || text === "t" || text === "f");
            }
        });

        if (type === "integer" || isInteger) {
            if (isOnly10) {
                return "boolean";
            }
            return "integer";
        } else if (isDecimal) {
            return "decimal";
        } else if (isBoolean) {
            return "boolean";
        }

        return "string";
    }

    function scrollToColumn($th) {
        if (!$th || $th.length === 0) {
            return;
        }
        var $tableArea = $th.closest('.tableSection');
        $tableArea.scrollLeft(0);
        var tableOffset = $tableArea.offset().left;
        var tableAreaWidth = $tableArea.width();
        var thWidth = $th.width();
        var thOffset = $th.offset().left;
        var position = (thOffset - tableOffset) - (tableAreaWidth * 0.5) +
                           (thWidth * 0.5);
        $tableArea.scrollLeft(position);

        // use .colPading because .columnTab already have tooltip
        var $colPadding = $th.find(".colPadding");
        $colPadding.tooltip({
            "title"    : "Focused Column",
            "placement": "top",
            "animation": "true",
            "container": "#multiCastModal",
            "trigger"  : "manual"
        });

        $colPadding.tooltip("show");
        setTimeout(function() {
            $colPadding.tooltip("destroy");
        }, 1000);
    }

    function buildTable(tableId) {
        var tableCols = gTables[tableId].tableCols;
        var html = '<thead>' +
                        '<tr>';

        var $tbody = $("#xcTable-" + tableId).find("tbody").clone(true);
        $tbody.find("tr:gt(14)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();
        $tbody.find(".indexedColumn").removeClass('indexedColumn');
        $tbody.find(".addedBarTextWrap.clickable").removeClass("clickable");

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var colName = tableCols[i].name;


            if (colName === "DATA") {
                continue;
            }

            var type    = tableCols[i].type;
            var colNum  = i + 1;
            var thClass = "col" + colNum + " type-" + type;

            colNames[colNum] = colName; // cache colNames
            colTypes[colNum] = type;    // cache colTypes

            if (type === "object" ||
                type === "array" ||
                type === "undefined")
            {
                thClass += " unselectable";
            } else {
                recTypes[colNum] = suggestType($tbody, colNum, type);
            }

            html += '<th class="' + thClass + '" data-col="' + colNum + '">' +
                        '<div class="header">' +
                            '<div class="listSection">' +
                                '<input class="text no-selection" ' +
                                'value="' + type + '" disabled>' +
                                '<div class="iconWrapper dropdown">' +
                                    '<span class="icon"></span>' +
                                '</div>' +
                                '<ul class="list" data-col="' + colNum + '">' +
                                    '<li>string</li>' +
                                    '<li>integer</li>' +
                                    '<li>decimal</li>' +
                                '</ul>' +
                            '</div>' +
                            '<div class="colPadding"></div>' +
                            '<div title="' + colName +
                            '" data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="columnTab textOverflow tooltipTag">' +
                                colName +
                                '<span class="tick icon"></span>' +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead>';
        html += $tbody.html();

        $table.html(html);
    }

    return (MultiCastModal);
}(jQuery, {}));
