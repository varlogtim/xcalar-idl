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
    var curUrl;
    var totalSize = 0;
    var keys;
    var previewMeta;

    // const
    var previewApp = "ds_parser_preview";
    var notSameCardError = "current card id changed";

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
        setupRowInput();
        setupKeyBox();

        // XXX this should be removed later
        setApp();
    };

    function setApp() {
        var previewAppStr = "import sys, json, re, random\nfrom lxml import etree as ET\n\ndef findLongestLineLength(s):\n    maxLen = 0\n    curSum = 0\n    lineNo = 0\n    lineLengths = []\n    for line in s.split(\"\\n\"):\n        if lineNo % 100 == 0:\n            lineLengths.append(curSum)\n        lineLen = len(line)\n        curSum += lineLen + 1\n        if lineLen > maxLen:\n            maxLen = lineLen\n        lineNo += 1\n    return (lineNo, maxLen, lineLengths)\n\ndef prettyPrintJson(inp, tmpp):\n    structs = json.load(open(inp, \"rb\"))\n    prettyString = json.dumps(structs, indent=2)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    return findLongestLineLength(prettyString)\n\ndef prettyPrintXml(inp, tmpp):\n    parser = ET.XMLParser(remove_blank_text=True)\n    root = ET.parse(inp, parser).getroot()\n    prettyString = ET.tostring(root, pretty_print=True)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    return findLongestLineLength(prettyString)\n\ndef main(inBlob):\n    arguments = json.loads(inBlob)\n    outPath = \"/tmp/vp-\" + str(random.randint(0, 1000000)) + \".\" + arguments[\"format\"]\n    if (arguments[\"format\"] == \"xml\"):\n        (total, maxLen, lineLengths) = prettyPrintXml(arguments[\"path\"], outPath)\n    elif (arguments[\"format\"] == \"json\"):\n        (total, maxLen, lineLengths) = prettyPrintJson(arguments[\"path\"], outPath)\n    return json.dumps({\"maxLen\": maxLen, \"lineLengths\": lineLengths, \"tmpPath\": outPath, \"totalLines\": total})"
        XcalarAppSet(previewApp, "Python", "Import", previewAppStr);
    }

    DSParser.show = function(url) {
        DSForm.switchView(DSForm.View.Parser);
        resetView(url);
        previewContent(url, true, true);
    };

    function resetView(url) {
        $dataPreview.html("");
        $parserCard.find(".topSection .filename").text(url);
        $formatList.find("input").val("");
        $("#delimitersBox .boxBody ul").empty();
        offset = 0;
        buffer = null;
        totalRows = null;
        keys = [];
        previewMeta = null;
        cardId = xcHelper.randName("dsParser");
        curUrl = url;
        resetRowInput();
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

            var res = getSelectionCharOffsetsWithin($dataPreview[0]);
            if ($parserCard.hasClass("previewOnly")) {
                $menu.find("li").addClass("unavailable");
                $menu.removeData("tag");
                $menu.removeData("end");
            } else {
                $menu.find("li").removeClass("unavailable");
                $menu.data("tag", res.tag);
                $menu.data("end", res.end);

            }

            var $target = $(event.target);
            xcHelper.dropdownOpen($target, $menu, {
                "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                "floating": true
            });
        });

        // prevent browser's default menu
        $dataPreview.contextmenu(function() {
            return false;
        });

        $menu.on("click", "li", function() {
            var $li = $(this);
            if ($li.hasClass("unavailable")) {
                return;
            }

            var tag = $menu.data("tag");
            var type = $li.data("action");
            var keyOffset = offset + $menu.data("end");
            populateKey(tag, type, keyOffset);
        });
    }

    function setupKeyBox() {
        var $box = $("#delimitersBox");
        $box.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        $box.on("click", "li", function() {
            focusKey($(this));
        });

        $box.on("click", ".remove", function() {
            var $li = $(this).closest("li");
            removeKey($li);
        });
    }

    function setupRowInput() {
        var $input = $("#parserRowInput");
        $input.keypress(function(event) {
            if (event.which !== keyCode.Enter) {
                return;
            }
            if ($parserCard.hasClass("loading") ||
                $parserCard.hasClass("fetchingRows")) {
                return;
            }

            var prevVal = $input.data("val");
            var val = Number($input.val());
            if (isNaN(val) || val % 1 !== 0) {
                $input.val(prevVal);
                return;
            }

            val = Math.min(totalSize - 100, val);
            val = Math.max(0, val);

            $input.data("val", val).val(val);
            offset = val;
            previewContent(curUrl, offset);
        });

        $input.blur(function() {
            var val = $(this).data('val');
            $(this).val(val);
        });
    }

    function previewContent(url, detect, newContent) {
        $parserCard.removeClass("error");
        if (newContent) {
            $parserCard.addClass("loading");
        } else {
            $parserCard.addClass("fetchingRows");
        }
        

        var currentId = cardId;
        var promise = (detect) ? detectFormat(url) : PromiseHelper.resolve();

        promise
        .then(function() {
            if (currentId === cardId) {
                return beautifier(url);
            } else {
                return PromiseHelper.reject(notSameCardError);
            }
        })
        .then(function(meta) {
            if (currentId !== cardId) {
                return PromiseHelper.reject(notSameCardError);
            }

            previewMeta = meta;
            var numBytes = calculateNumBytes();
            var path = parseNoProtocolPath(meta.tmpPath);
            return XcalarPreview(path, null, false, numBytes, offset);
        })
        .then(function(res) {
            if (currentId === cardId) {
                $parserCard.removeClass("loading fetchingRows");
                showContent(res.buffer);
                if (newContent) {
                    updateTotalNumRows(res.totalDataSize);
                }
            }
        })
        .fail(function(error) {
            if (currentId === cardId) {
                handleError(error);
            }
        });
    }

    function beautifier(url) {
        var deferred = jQuery.Deferred();
        var path = url.split(/^.*:\/\//)[1];
        var options = {
            "format": getFormat().toLowerCase(),
            "path": path
        };
        var inputStr = JSON.stringify(options);
        XcalarAppExecute(previewApp, false, inputStr)
        .then(function(ret) {
            var error = parseAppRes(ret.errStr);
            if (error) {
                deferred.reject(error);
                return;
            }

            var metaStr = parseAppRes(ret.outStr);
            try {
                var meta = JSON.parse(metaStr);
                deferred.resolve(meta);
            } catch (error) {
                deferred.reject(error);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function parseNoProtocolPath(path) {
        var protocol = FileProtocol.file.slice(0, FileProtocol.file.length - 1);
        return (protocol + path);
    }

    function parseAppRes(res) {
        try {
            var out = JSON.parse(res)[0][0];
            return out;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function updateTotalNumRows(size) {
        // XXX translate bytes to number of rows
        totalSize = size;
        var inputWidth = 50;
        var numDigits = ("" + totalSize).length;
        inputWidth = Math.max(inputWidth, 10 + (numDigits * 8));
        
        $("#parserRowInput").width(inputWidth);
        $parserCard.find(".totalRows").text("of " + totalSize);
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
            return null;
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

        var end = e + 1;
        return {
            "start": s,
            "end": end,
            "tag": getSubStr(s, end)
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

        var end = s + 1;
        return {
            "start": s,
            "end": end,
            "tag": getSubStr(s, end)
        };
    }

    function populateKey(tag, type, keyOffset) {
        for (var i = 0, len = keys.length; i < len; i++) {
            if (keys[i].offset === keyOffset && keys[i].type === type) {
                // when key alreay exists
                var $li = $("#delimitersBox").find("li").eq(i);
                focusKey($li, true);
                // XXX the delay not work, will debug later...
                xcTooltip.transient($li, {
                    "title": TooltipTStr.KeyExists
                }, 1000);
                return;
            }
        }

        var key = {
            "key": generateKey(tag),
            "type": type,
            "offset": keyOffset
        };

        keys.push(key);
        addKeyItem(key);
    }

    function generateKey(tag) {
        var format = getFormat();
        if (format === "JSON") {
            // XXX will handle JSON populate tag later
            return tag;
        } else {
            return tag;
        }
    }

    function addKeyItem(key) {
        var tag = xcHelper.escapeHTMLSepcialChar(key.key);
        var li =
                '<li class="key">' +
                    '<div class="item">' +
                        '<span class="tag tooltipOverflow' +
                        ' textOverflowOneLine">' +
                            tag +
                        '</span>' +
                        '<span class="type">' +
                            key.type +
                        '</span>' +
                    '</div>' +
                    '<i class="remove icon xi-trash xc-action fa-15"></i>' +
                '</li>';
        var $li = $(li);
        // use this becuase tag may have <>, add
        // to html directly will not work
        xcTooltip.add($li.find(".tag"), {
            "title": tag
        });
        $("#delimitersBox").find(".boxBody ul").append($li);
        if (gMinModeOn) {
            focusKey($li, true);
        } else {
            $li.hide().slideDown(100, function() {
                focusKey($li, true);
            });
        }
    }

    function focusKey($li, scrollToView) {
        $li.addClass("active")
        .siblings().removeClass("active");

        if (scrollToView) {
            $li.get(0).scrollIntoView();
        }
    }

    function removeKey($li) {
        var $box = $("#delimitersBox");
        var index = $li.index();

        if (gMinModeOn) {
            $li.remove();
            keys.splice(index, 1);
        } else {
            $box.addClass("disabled");
            $li.slideUp(100, function() {
                $li.remove();
                keys.splice(index, 1);
                $box.removeClass("disabled");
            });
        }
    }

    function getBufferedCharLength() {
        // XXX later may change the implementation
        return buffer.length;
    }

    function getCharAt(pos) {
        // XXX later may change the implementation
        return buffer[pos];
    }

    function getSubStr(start, end) {
        return buffer.substring(start, end);
    }

    function calculateNumBytes() {
        // XXX implement it! Calculate based on the panel's size?
        return 4000;
    }

    function handleError(error) {
        $parserCard.removeClass("loading fetchingRows").addClass("error");
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
        $dataPreview.text(content);
    }

    function submitForm() {

    }

    function closeCard() {
        DSForm.switchView(DSForm.View.Preview);
        resetView();
    }

    function resetRowInput() {
        $parserCard.find(".totalRows").text("");
        $("#parserRowInput").val(0).data("val", 0);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSParser.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (DSParser);
}(jQuery, {}));
