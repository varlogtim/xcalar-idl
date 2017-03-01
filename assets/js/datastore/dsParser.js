/*
 * Module for dataset parser card
 */
window.DSParser = (function($, DSParser) {
    var $parserCard;
    var $formatList;
    var $dataPreview;
    var offset;
    var cardId;

    DSParser.setup = function() {
        $parserCard = $("#dsParser");
        $formatList = $parserCard.find(".fileFormat");
        $dataPreview = $parserCard.find('.dataPreview');

        new MenuHelper($formatList, {
            "onSelect": function($li) {
                var format = $li.attr("name");
                var text = $li.text();
                $formatList.find(".text").val(text);

                if (format === "text") {
                    $parserCard.addClass("previewOnly");
                } else {
                    $parserCard.removeClass("previewOnly");
                }
            }
        }).setupListeners();

        // TODO change z-index of dragged box so it's higher than other box
        // handle window resizing
        $("#previewModeBox").draggable({
            handle: ".boxHeader", // #previewModeBox .boxHeader doesn't work =(
            cursor: "-webkit-grabbing",
            containment: "#dsParser .cardMain"
        });

        $("#delimitersBox").draggable({
            handle: ".boxHeader",
            cursor: "-webkit-grabbing",
            containment: "#dsParser .cardMain"
        });

        $parserCard.find(".parserBox").on("click", ".resize", function() {
            toggleBoxResize($(this));
        });

        $parserCard.on("click", ".confirm", function() {
            submitForm();
        });

        $parserCard.on("click", ".cardHeader .close", function() {
            closeCard();
        });

        setupMenu();
    };

    DSParser.show = function(url) {
        DSForm.switchView(DSForm.View.Parser);
        resetView(url);
        previewContent(url, true);
    };

    function resetView(url) {
        $parserCard.find(".topSection .filename").text(url);
        offset = 0;
        cardId = xcHelper.randName("dsParser");
    }

    function toggleBoxResize($icon) {
        var $box = $icon.closest(".parserBox");
        if ($box.hasClass("minimized")) {
            $box.removeClass("minimized");
        } else {
            $box.addClass("minimized");
        }
    }

    function setupMenu() {
        var $menu = $("#parserMenu");
        addMenuBehaviors($menu);

        $dataPreview.mouseup(function(event) {
            var selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if (document.selection) {
                selection = document.selection.createRange();
            }

            if (!selection.toString().length) { // no selection made
                return false;
            }

            var $target = $(event.target);
            if ($parserCard.hasClass("previewOnly")) {
                $menu.find("li").addClass("unavailable");
            } else {
                $menu.find("li").removeClass("unavailable");
            }

            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "floating": true
            });
        });

        // prevent browser's default menu
        $dataPreview.contextmenu(function() {
            return false;
        });
    }

    function previewContent(url, detect) {
        var numBytes = calculateNumBytes();
        $parserCard.removeClass("error").addClass("loading");

        var currentId = cardId;
        // XXX temporary use list
        XcalarPreview(url, null, false, numBytes, offset)
        .then(function(res) {
            if (currentId === cardId) {
                $parserCard.removeClass("loading");
                if (detect) {
                    detectFormat(res.buffer);
                }
                showContent(res.buffer);
            }
        })
        .fail(function(error) {
            if (currentId === cardId) {
                handleError(error);
            }
        });
    }

    function calculateNumBytes() {
        // XXX implement it! Calculate based on the panel's size?
        return 4000;
    }

    function handleError(error) {
        $parserCard.removeClass("loading").addClass("error");
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }
        $parserCard.find(".errorSection").text(error);
    }

    function detectFormat(content) {
        content = content.trim();
        var $li;

        if (isXML(content)) {
            $li = $formatList.find('li[name="xml"]');
        } else if (isJSON(content)) {
            $li = $formatList.find('li[name="json"]');
        } else {
            $li = $formatList.find('li[name="text"]');
        }
        $li.trigger(fakeEvent.mouseup);
    }

    function isXML(str) {
        return str.startsWith("<") && str.endsWith(">");
    }

    function isJSON(str) {
        if (str.startsWith("[") || str.startsWith("{")) {
            if (/{(.|[\r\n])+:(.|[\r\n])+},?/.test(str)) {
                return true;
            }
        }

        return false;
    }

    function showContent(content) {
        $parserCard.find(".dataPreview").text(content);
    }

    function submitForm() {

    }

    function closeCard() {
        DSForm.switchView(DSForm.View.Preview);
        offset = 0;
        cardId = null;
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSParser.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (DSParser);
}(jQuery, {}));
