window.MultiCastModal = (function($, MultiCastModal) {
    var $modal; // $("#multiCastModal")
    var $multiCastTable; // $("#multiCast-table")

    var modalHelper;
    var curTableId;
    var newColTypes = [];
    var suggColFlags = [];
    var colNames = [];
    var colTypes = [];
    var recTypes = [];

    MultiCastModal.setup = function() {
        $modal = $("#multiCastModal");
        $multiCastTable = $("#multiCast-table");

        // constant
        var minHeight = 500;
        var minWidth  = 600;

        modalHelper = new ModalHelper($modal, {
            "minHeight": minHeight,
            "minWidth" : minWidth
        });

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
            var isValid = xcHelper.validate([{
                "$selector": $("#multiCast-result"),
                "text"     : MultiCastTStr.NoCast,
                "check"    : function() {
                    return ($("#multiCast-result .row").length === 0);
                }
            }]);

            if (isValid) {
                submitForm();
            }
        });

        $("#multiCast-clear").click(function() {
            var $ths = $multiCastTable.find("th.colSelected");
            deSelectCols($ths);
        });

        $("#multiCast-cast").click(function() {
            $(this).blur();
            smartSuggest();
        });

        $multiCastTable.on("click", ".columnTab", function(event) {
            var $th = $(this).closest("th");
            if ($th.hasClass("unselectable")) {
                return;
            }

            if ($th.hasClass("colSelected")) {
                deSelectCols($th);
            } else {
                // open dropdown list
                var $dropdown = $th.find(".dropDownList");
                if (!$dropdown.hasClass("open")) {
                    $dropdown.find(".iconWrapper").click();
                    // prevent global listener to close the dropdown
                    event.stopPropagation();
                }
            }
        });

        $modal.on("click", ".row", function() {
            var colNum = $(this).data("col");
            if (colNum != null) {
                scrollToColumn($multiCastTable.find("th.col" + colNum));
            }
        });

        $modal.on("mouseenter", ".tooltipOverflow", function(){
            xcHelper.autoTooltip(this);
        });
    };

    MultiCastModal.show = function(tableId) {
        curTableId = tableId;

        buildTable(tableId);
        smartSuggest();
        modalHelper.setup();

        var $lists = $multiCastTable.find("th:not(.unselectable) .dropDownList");
        var list = new MenuHelper($lists, {
            "onSelect": function($li) {
                var $list  = $li.closest(".list");
                var $input = $list.siblings(".text");
                var type   = $li.text();

                $input.val(type);
                selectCols($list.closest("th"));
            },
            "container": "#multiCastModal"
        });
        list.setupListeners();
    };

    function closeMultiCastModal() {
        modalHelper.clear();

        $multiCastTable.html("");
        $("#multiCast-result").html("");
        $(document).off(".multiCastModal");

        newColTypes = [];
        suggColFlags = [];
        colNames = [];
        colTypes = [];
        recTypes = [];
        curTableId = null;
    }

    function submitForm() {
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
    }

    function selectCols($ths) {
        $ths.each(function() {
            var $th = $(this);
            var colNum = parseInt($th.data("col"));
            var $input = $th.find(".dropDownList input");
            var newColType = $input.val();

            if (newColType === colTypes[colNum]) {
                newColTypes[colNum] = null;
                $multiCastTable.find(".col" + colNum).removeClass("colSelected");
                $input.addClass("initialType");
            } else {
                newColTypes[colNum] = newColType;
                $multiCastTable.find(".col" + colNum).addClass("colSelected");
                $input.removeClass("initialType");
            }

            suggColFlags[colNum] = false;
        });
        updateTypeInfo();
    }

    function deSelectCols($ths) {
        $ths.each(function() {
            var $th = $(this);
            var colNum = parseInt($th.data("col"));

            $multiCastTable.find(".col" + colNum).removeClass("colSelected");
            $th.find(".dropDownList input").val(colTypes[colNum])
                                        .addClass("initialType");
            newColTypes[colNum] = null;
        });

        updateTypeInfo();
    }

    function smartSuggest() {
        var newType;
        var $th;
        var $input;

        for (var colNum = 1, len = recTypes.length; colNum < len; colNum++) {
            newType = recTypes[colNum];
            if (newType == null) {
                continue; // unselectable case
            }

            $th = $multiCastTable.find("th.col" + colNum);
            $input = $th.find(".dropDownList input").val(newType);

            if (newType === colTypes[colNum]) {
                $multiCastTable.find(".col" + colNum).removeClass("colSelected");
                $input.addClass("initialType");
                newColTypes[colNum] = null;
                suggColFlags[colNum] = false;
            } else {
                $multiCastTable.find(".col" + colNum).addClass("colSelected");
                $input.removeClass("initialType");
                newColTypes[colNum] = newType;
                suggColFlags[colNum] = true;
            }
        }

        updateTypeInfo(true);
    }

    function updateTypeInfo(isFromSmartSugg) {
        var html = "";
        var len = newColTypes.length;
        var count = 0;
        var colName;
        var oldType;
        var newType;
        var newTypeClass;

        for (var colNum = 1; colNum < len; colNum++) {
            newType = newColTypes[colNum];
            if (newType == null) {
                continue;
            }

            newTypeClass = "newType";

            if (suggColFlags[colNum]) {
                newTypeClass += " highlight";
                $multiCastTable.find("th.col" + colNum).addClass("highlight")
                        .find(".text").val(newType);
            } else {
                $multiCastTable.find("th.col" + colNum).removeClass("highlight");
            }

            colName = colNames[colNum];
            oldType = colTypes[colNum];
            html += '<div class="row" data-col="' + colNum + '">' +
                        '<div title="' + colName + '" ' +
                        '" data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body" ' +
                        'class="colName tooltipOverflow">' +
                            colName +
                        '</div>' +
                        '<div class="oldType">' +
                            oldType +
                        '</div>' +
                        '<div class="' + newTypeClass + '">' +
                            newType +
                        '</div>' +
                    '</div>';
            count++;
        }

        if (count === 0) {
            html += '<div class="instruction">';
            if (isFromSmartSugg) {
                html += MultiCastTStr.NoRec + ',<br>';
            }

            html += MultiCastTStr.SelectCol + '</div>';
        }

        var $label = $modal.find(".resultContainer .title .label");
        if (isFromSmartSugg) {
            $label.text(MultiCastTStr.SmartRes);
        } else {
            $label.text(MultiCastTStr.CastRes);
        }

        var $resultSection = $("#multiCast-result");
        if (gMinModeOn) {
            $resultSection.html(html);
        } else {
            // make it blink to get user's attention
            $resultSection.hide().html(html).fadeIn(100);
        }
    }

    function suggestType($tbody, colNum, type) {
        if (type === "float" || type === "boolean") {
            return type;
        }

        var $tds = $tbody.find("td.col" + colNum);
        var datas = [];
        var val;

        $tds.each(function() {
            val = $(this).find('.originalData').text();
            datas.push(val);
        });
        return xcHelper.suggestType(datas, type);
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
            "title"    : TooltipTStr.FocusColumn,
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
        var validTyps = ["string", "integer", "float", "boolean"];
        var tableCols = gTables[tableId].tableCols;
        var list;
        var html = '<thead>' +
                        '<tr>';

        var $table = $("#xcTable-" + tableId);
        var $tbody = $table.find("tbody").clone(true);
        $tbody.find("tr:gt(17)").remove();
        $tbody.find(".col0").remove();
        $tbody.find(".jsonElement").remove();
        $tbody.find(".indexedColumn").removeClass('indexedColumn');
        $tbody.find(".tdText.clickable").removeClass("clickable");

        for (var i = 0, len = tableCols.length; i < len; i++) {
            var progCol = tableCols[i];

            if (progCol.isDATACol()) {
                continue;
            }

            var colName = progCol.getFronColName();
            var type = progCol.getType();
            var colNum = i + 1;
            var thClass = "col" + colNum + " type-" + type;
            var isChildOfArray = $table.find(".th.col" + colNum + " .header")
                                        .hasClass("childOfArray");

            if (isChildOfArray) {
                type = CommonTxtTstr.ArrayVal;
            }

            // cache colNames
            colNames[colNum] = colName;
            // cache colTypes
            colTypes[colNum] = type;

            if (type === "object" ||
                type === "array" ||
                type === "mixed" ||
                type === "undefined" ||
                progCol.isEmptyCol() ||
                isChildOfArray)
            {
                thClass += " unselectable";
                recTypes[colNum] = null;
            } else {
                recTypes[colNum] = suggestType($tbody, colNum, type);
            }

            list = "";
            for (var j = 0; j < validTyps.length; j++) {
                if (validTyps[j] === type) {
                    list += '<li class="initialType">';
                } else {
                    list += '<li>';
                }

                list += validTyps[j] + '</li>';
            }

            html += '<th class="' + thClass + '" data-col="' + colNum + '">' +
                        '<div class="header">' +
                            '<div class="dropDownList">' +
                                '<input class="text no-selection initialType" ' +
                                'value="' + type + '" disabled>' +
                                '<div class="iconWrapper dropdown">' +
                                    '<i class="icon xi-arrow-down"></i>' +
                                '</div>' +
                                '<ul class="list" data-col="' + colNum + '">' +
                                    list +
                                '</ul>' +
                            '</div>' +
                            '<div class="colPadding"></div>' +
                            '<div title="' + colName +
                            '" data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" ' +
                            'class="columnTab textOverflow tooltipOverflow">' +
                                colName +
                            '</div>' +
                        '</div>' +
                    '</th>';
        }

        html += '</tr></thead>';
        html += $tbody.html();

        $multiCastTable.html(html);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        MultiCastModal.__testOnly__ = {};
        MultiCastModal.__testOnly__.setNewColType = function(args) {
            newColTypes = args;
        };

        MultiCastModal.__testOnly__.setSuggColFlags = function(args) {
            suggColFlags = args;
        };

        MultiCastModal.__testOnly__.setColNames = function(args) {
            colNames = args;
        };

        MultiCastModal.__testOnly__.setColTypes = function(args) {
            colTypes = args;
        };

        MultiCastModal.__testOnly__.setRecTypes = function(args) {
            recTypes = args;
        };

        MultiCastModal.__testOnly__.closeMultiCastModal = closeMultiCastModal;
        MultiCastModal.__testOnly__.selectCols = selectCols;
        MultiCastModal.__testOnly__.deSelectCols = deSelectCols;
        MultiCastModal.__testOnly__.updateTypeInfo = updateTypeInfo;
        MultiCastModal.__testOnly__.suggestType = suggestType;
    }
    /* End Of Unit Test Only */

    return (MultiCastModal);
}(jQuery, {}));
