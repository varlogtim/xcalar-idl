// Module for manageing table prefix
window.TPrefix = (function(TPrefix, $) {
    var colorMpas = {};

    TPrefix.setup = function() {
        addMenuActions();
    };

    TPrefix.getCache = function() {
        return colorMpas;
    };

    TPrefix.restore = function(oldMaps) {
        colorMpas = oldMaps || {};
    };

    TPrefix.getColor = function(prefix) {
        return colorMpas[prefix] || "";
    };

    TPrefix.markColor = function(prefix, newColor) {
        var oldColor = TPrefix.getColor(prefix);
        $(".th .topHeader").each(function() {
            var $topHeader = $(this);
            if ($topHeader.find(".prefix").text() === prefix) {
                $topHeader.attr("data-color", newColor)
                        .data("color", newColor);
            }
        });
        addColor(prefix, newColor);

        Log.add(SQLTStr.MarkPrefix, {
            "operation": SQLOps.MarkPrefix,
            "prefix": prefix,
            "oldColor": oldColor,
            "newColor": newColor,
        });
    };

    TPrefix.updateColor = function(tableId, colNum) {
        var table = gTables[tableId];
        var $topHeader = $("#xcTable-" + tableId).find(".th.col" + colNum +
                                                        " .topHeader");

        var prefix = table.getCol(colNum).getPrefix();
        if (prefix === "") {
            // displayed text
            prefix = CommonTxtTstr.Immediates;
        }

        $topHeader.find(".prefix").text(prefix);
        var color = TPrefix.getColor(prefix);
        $topHeader.attr("data-color", color).data("color", color);
    };

    function addColor(prefix, color) {
        colorMpas[prefix] = color;
    }

    function addMenuActions() {
        var $prefixColorMenu = $("#prefixColorMenu");
        $prefixColorMenu.on("mouseup", ".wrap", function(event) {
            if (event.which !== 1) {
                return;
            }

            var $wrap = $(this);
            var prefix = $prefixColorMenu.data("prefix");
            var color = $(this).data("color");

            $wrap.addClass("selected").siblings().removeClass("selected");
            TPrefix.markColor(prefix, color);
            xcMenu.close($prefixColorMenu);
        });
    }

    return (TPrefix);
}({}, jQuery));
