/*
 * Module for dataset parser card
 */
window.DSParser = (function($, DSParser) {
    var $parserCard;
    var $formatList;
    var $dataPreview;
    var offset;
    var buffer;
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
        buffer = null;
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

            var range = getSelectionCharOffsetsWithin($dataPreview[0]);
            var $target = $(event.target);
            if ($parserCard.hasClass("previewOnly")) {
                $menu.find("li").addClass("unavailable");
            } else {
                $menu.find("li").removeClass("unavailable");
            }

            $menu.data("range", range);
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
        $parserCard.removeClass("error").addClass("loading");

        var currentId = cardId;
        var promise = (detect) ? detectFormat(url) : PromiseHelper.resolve();

        promise
        .then(function() {
            if (currentId === cardId) {
                // XXX temporary use
                var numBytes = calculateNumBytes();
                return XcalarPreview(url, null, false, numBytes, offset);
            }
        })
        .then(function(res) {
            if (currentId === cardId) {
                $parserCard.removeClass("loading");
                showContent(res.buffer);
            }
        })
        .fail(function(error) {
            if (currentId === cardId) {
                handleError(error);
            }
        });
    }

    function getSelectionCharOffsetsWithin(element) {
        var start = 0;
        var end = 0;
        var sel;
        var range;
        var priorRange;
        var res;

        if (typeof window.getSelection !== "undefined") {
            sel = window.getSelection();
            range = sel.getRangeAt(0);
            priorRange = range.cloneRange();
            priorRange.selectNodeContents(element);
            priorRange.setEnd(range.startContainer, range.startOffset);
            start = priorRange.toString().length;
            end = start + range.toString().length;
        } else if (typeof document.selection !== "undefined" &&
                    document.selection.type !== "Control") {
            sel = document.selection;
            range = sel.createRange();
            priorRange = document.body.createTextRange();
            priorRange.moveToElementText(element);
            priorRange.setEndPoint("EndToStart", range);
            start = priorRange.text.length;
            end = start + range.text.length;
        }

        // XXX need to be tested in IE
        res = getRightSelection(start);
        if (res != null) {
            priorRange.setStart(range.startContainer, res.start);
            priorRange.setEnd(range.startContainer, res.end);
            sel.removeAllRanges();
            sel.addRange(priorRange);
            return res;
        } else {
            return {
                "start": start,
                "end": end
            };
        }
    }

    function getRightSelection(start) {
        var format = getFormat();
        if (format === "XML") {
            return findXMLOpenTag(start);
        } else if (format === "JSON") {
            return findJSONOpenTag(start);
        } else {
            return null;
        }
    }

    function findXMLOpenTag(start) {
        var s = start;
        var len = getBufferedCharLength();

        while (s >= 0 && getCharAt(s) !== "<") {
            s--;
        }
        // start from the open < and find the matched >
        var e = s;
        while (e < len - 1 && getCharAt(e) !== ">") {
            e++;
        }

        return {
            "start": s,
            "end": e + 1
        };
    }

    function findJSONOpenTag(start) {
        var s = start;
        if (getCharAt(s) === "[") {
            return {
                "start": s,
                "end": s + 1
            };
        }

        var cnt = 0;
        var ch;

        while (s >= 0) {
            ch = getCharAt(s);
            if (ch === "{") {
                if (cnt === 0) {
                    break;
                } else {
                    cnt--;
                }
            } else if (ch === "}") {
                cnt++;
            }

            s--;
        }

        return {
            "start": s,
            "end": s + 1
        };
    }

    function getBufferedCharLength() {
        // XXX later may change the implementation
        return buffer.length;
    }

    function getCharAt(pos) {
        // XXX later may change the implementation
        return buffer[pos];
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

    function detectFormat(url) {
        var deferred = jQuery.Deferred();
        var numBytes = 500;
        XcalarPreview(url, null, false, numBytes, 0)
        .then(function(res) {
            var content = res.buffer.trim();
            var $li;

            if (isXML(content)) {
                $li = $formatList.find('li[name="xml"]');
            } else if (isJSON(content)) {
                $li = $formatList.find('li[name="json"]');
            } else {
                $li = $formatList.find('li[name="text"]');
            }
            $li.trigger(fakeEvent.mouseup);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function getFormat() {
        return $formatList.find("input").val();
    }

    function isXML(str) {
        if (!str.startsWith("<")) {
            return false;
        }

        var xmlMatch = str.match(/<|>/g);
        var jsonMatch = str.match(/\{|\}/g);

        if (jsonMatch == null) {
            return true;
        } else if (xmlMatch.length > jsonMatch.length) {
            return true;
        } else {
            return false;
        }
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
        buffer = content;
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
