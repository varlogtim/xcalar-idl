/*
 * Module for dataset parser card
 */
window.DSParser = (function($, DSParser) {
    var $parserCard;
    var $formatList;
    var $dataPreview;
    var $previewContent;
    var buffer;
    var buffers = [];
    var curUrl;
    var totalSize = 0;
    var keys;
    var previewMeta; // will have lineLengths, maxLen, tmpPath, totalLines
    var lineHeight = 18;
    var linesPerPage = 100;
    var pageHeight = lineHeight * linesPerPage;
    var containerPadding = 10;
    var isMouseDown = false;
    var fetchId = 0; // used to detect stale requests

    // const
    var previewApp = "ds_parser_preview";
    var xmlApp = "ds_parser_xml";
    var jsonApp = "ds_parser_json";
    var notSameCardError = "current card id changed";
    var cancelError = "cancel submit";

    DSParser.setup = function() {
        $parserCard = $("#dsParser");
        $formatList = $parserCard.find(".fileFormat");
        $dataPreview = $parserCard.find('.dataPreview');
        $previewContent = $parserCard.find('.previewContent');

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

        var $previewBox = $("#previewModeBox");
        var $keysBox = $("#delimitersBox");

        $previewBox.mousedown(function() {
            $previewBox.css({"z-index": 1});
            $keysBox.css({"z-index": 0});
        });

        $keysBox.mousedown(function() {
            $previewBox.css({"z-index": 0});
            $keysBox.css({"z-index": 1});
        });

        // TODO change z-index of dragged box so it's higher than other box
        // handle window resizing
        $previewBox.draggable({
            handle: ".boxHeader", // #previewModeBox .boxHeader doesn't work =(
            cursor: "-webkit-grabbing",
            containment: "#dsParser .cardMain",
            stop: rightAlignBox
        });

        $keysBox.draggable({
            handle: ".boxHeader",
            cursor: "-webkit-grabbing",
            containment: "#dsParser .cardMain",
            stop: rightAlignBox
        });

        function rightAlignBox(e, obj) {
            var $box = obj.helper;
            var cardWidth = $parserCard.width();
            var right = cardWidth - (obj.position.left +
                                        $box.outerWidth() +
                                        parseInt($box.css("margin-right")));
            $box.css({"left": "auto", "right": right});
        }

        $parserCard.find(".parserBox").on("click", ".resize", function() {
            toggleBoxResize($(this));
        });

        $parserCard.on("click", ".confirm", function() {
            submitForm();
        });

        $parserCard.on("click", ".cardHeader .close", function() {
            closeCard();
        });

        $parserCard.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        setupMenu();
        setupRowInput();
        setupInfScroll();
        setupKeyBox();

        // XXX this should be removed later
        setApp();
        
    };

    // XXX for testing, remove soon
    DSParser.getMeta = function() {
        return previewMeta;
    }

    function setApp() {
        var previewAppStr = "import sys, json, re, random, hashlib\nfrom lxml import etree as ET\n\ndef getMeta(s, ssf, isArray):\n    for k in s:\n        if isArray:\n            value = k\n        else:\n            value = s[k]\n        if isinstance(value, str) or isinstance(value, unicode):\n            if isArray:\n                if \"String\" not in ssf:\n                    ssf[\"String\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"String\"] = True\n        elif isinstance(value, float):\n            if isArray:\n                if \"Float\" not in ssf:\n                    ssf[\"Float\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Float\"] = True\n        elif isinstance(value, int):\n            if isArray:\n                if \"Integer\" not in ssf:\n                    ssf[\"Integer\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Integer\"] = True\n        elif isinstance(value, bool):\n            if isArray:\n                if \"Boolean\" not in ssf:\n                    ssf[\"Boolean\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Boolean\"] = True\n        elif isinstance(value, dict):\n            if isArray:\n                if \"Object\" not in ssf:\n                    ssf[\"Object\"] = {}\n                getMeta(value, ssf[\"Object\"], False)\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                if \"Object\" not in ssf[k]:\n                    ssf[k][\"Object\"] = {}\n                getMeta(value, ssf[k][\"Object\"], False)\n        elif isinstance(value, list):\n            if isArray:\n                if \"Array\" not in ssf:\n                    ssf[\"Array\"] = {}\n                getMeta(value, ssf[\"Array\"], True)\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                if \"Array\" not in ssf[k]:\n                    ssf[k][\"Array\"] = {}\n                getMeta(value, ssf[k][\"Array\"], True)\n        else:\n            print value\n            print type(value)\n\ndef getMetaWrapper(s):\n    d = {}\n    if isinstance(s, list):\n        getMeta(s, d, True)\n    else:\n        getMeta(s, d, False)\n    return d\n\ndef findLongestLineLength(s):\n    maxLen = 0\n    curSum = 0\n    lineNo = 0\n    lineLengths = []\n    for line in s.split(\"\\n\"):\n        if lineNo % 100 == 0:\n            lineLengths.append(curSum)\n        lineLen = len(line)\n        curSum += lineLen + 1\n        if lineLen > maxLen:\n            maxLen = lineLen\n        lineNo += 1\n    return (lineNo, maxLen, lineLengths)\n\ndef prettyPrintJson(inp, tmpp, metap):\n    structs = json.load(open(inp, \"rb\"))\n    prettyString = json.dumps(structs, indent=2)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    metaPrettyString = json.dumps(getMetaWrapper(structs), indent=2)\n    fout = open(metap, \"wb\")\n    fout.write(metaPrettyString)\n    fout.close()\n    return (findLongestLineLength(prettyString), findLongestLineLength(\n            metaPrettyString))\n\ndef constructXml(elements, root):\n    for e in elements:\n        elems = root.findall(\"./[\" + e.tag + \"]\")\n        if len(elems) == 0:\n            newElem = ET.SubElement(root, e.tag)\n        else:\n            newElem = elems[0]\n        constructXml(e.findall(\"./\"), newElem)\n\ndef constructXmlMeta(root):\n    prettyRoot = ET.Element(root.tag)\n    constructXml(root.findall(\"./\"), prettyRoot)\n    return prettyRoot\n\ndef prettyPrintXml(inp, tmpp, metap):\n    parser = ET.XMLParser(remove_blank_text=True)\n    try:\n        root = ET.parse(inp, parser).getroot()\n    except:\n        parser.feed(\"<xcRecord>\")\n        parser.feed(open(inp).read().decode(\"utf-8\", \"ignore\").encode(\"utf-8\"))\n        parser.feed(\"</xcRecord>\")\n        root = parser.close()\n    prettyString = ET.tostring(root, pretty_print=True)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    prettyRoot = constructXmlMeta(root)\n    metaPrettyString = ET.tostring(prettyRoot, pretty_print=True)\n    fout = open(metap, \"wb\")\n    fout.write(metaPrettyString)\n    fout.close()\n    return (findLongestLineLength(prettyString), findLongestLineLength(\n            metaPrettyString))\n\ndef main(inBlob):\n    arguments = json.loads(inBlob)\n    userName = arguments[\"user\"]\n    sessionName = arguments[\"session\"]\n    hashName = hashlib.md5(userName + \"-\" + sessionName).hexdigest()\n    outPath = \"/tmp/vp-\" + str(hashName)\n    metaOutPath = \"/tmp/mvp-\" + str(hashName)\n    if (arguments[\"format\"] == \"xml\"):\n         ((total, maxLen, lineLengths),\n         (metaTotalLines, metaMaxLen, metaLineLengths)) = prettyPrintXml(\n                                                          arguments[\"path\"],\n                                                          outPath, metaOutPath)\n    elif (arguments[\"format\"] == \"json\"):\n        ((total, maxLen, lineLengths),\n         (metaTotalLines, metaMaxLen, metaLineLengths)) = prettyPrintJson(\n                                                          arguments[\"path\"],\n                                                          outPath, metaOutPath)\n    return json.dumps({\"maxLen\": maxLen, \"lineLengths\": lineLengths,\n                       \"tmpPath\": outPath, \"totalLines\": total, \"meta\":{\n            \"path\": metaOutPath, \"lineLengths\": metaLineLengths,\n            \"totalLines\":metaTotalLines, \"maxLen\": metaMaxLen\n        }})"
        XcalarAppSet(previewApp, "Python", "Import", previewAppStr);

        var xmlAppStr = "import sys, json, re\nfrom lxml import etree as ET\nimport xmltodict\n\ndef findFullXmlPath(keyArray, inp):\n    #keyArray must be of the form [(\"key\", characterOffset)]\n    sortedArray = sorted(keyArray, key=lambda (key, offset): offset)\n    initialFile = open(inp, \"r\").read()\n    segments = []\n    prevIndex = 0\n    for (keyPartialName, charOffset) in sortedArray:\n        #explode initialFile at the correct places\n        segments.append(initialFile[prevIndex:charOffset])\n        prevIndex = charOffset\n    segments.append(initialFile[prevIndex:])\n    withXcTags = \"\"\n    for idx in xrange(len(segments)-1):\n        withXcTags += segments[idx]\n        withXcTags += \"<xctag></xctag>\"\n        #print str(idx) + \": >>\" + segments[idx][-20:] + \"<xctag></xctag>\" + segments[idx + 1][:20]\n    withXcTags += segments[-1]\n    root = ET.fromstring(withXcTags)\n    allObj = root.findall(\".//xctag\")\n    paths = []\n    tree = ET.ElementTree(root)\n    for obj in allObj:\n        path = tree.getpath(obj.getparent())\n        path = re.sub(r\"[\\[0-9+\\]]\", \"\", path)\n        paths.append(path)\n    return paths\n\ndef constructRecords(keyArray, prettyIn):\n    # keyArray must be of the form [(key, characterOffset, type)]\n    # where type == \"full\" or \"partial\"\n    fullKeyArray = []\n    partialPaths = []\n    fullPaths = []\n    partialElements = []\n    fullElements = []\n    for k, o, t in keyArray:\n        if t == \"full\":\n            fullKeyArray.append((k, o))\n        else:\n            partialPaths.append(k)\n    fullPaths = findFullXmlPath(fullKeyArray, prettyIn)\n    return \"\"\"\nimport sys, json, re\nfrom lxml import etree as ET\nimport xmltodict\ndef parser(inp, ins):\n    # Find all partials\n    root = ET.fromstring(ins.read())\n    tree = ET.ElementTree(root)\n\n    partialPaths = \"\"\" + json.dumps(partialPaths) + \"\"\"\n    fullPaths = \"\"\" + json.dumps(fullPaths) + \"\"\"\n\n    if len(partialPaths):\n        eString = \".//*[self::\" + \" or self::\".join(partialPaths) + \"]\"\n        print eString\n        partialElements = root.xpath(eString)\n        for element in partialElements:\n            elementDict = xmltodict.parse(ET.tostring(element))\n            elementDict[\"xcXmlPath\"] = tree.getpath(element)\n            elementDict[\"xcMethod\"] = \"partial\"\n            yield elementDict\n\n    for fullPath in fullPaths:\n        fullElements = root.xpath(fullPath)\n        for element in fullElements:\n            elementDict = xmltodict.parse(ET.tostring(element))\n            elementDict[\"xcXmlPath\"] = tree.getpath(element)\n            elementDict[\"xcMethod\"] = \"full\"\n            yield elementDict\n\"\"\"\n\ndef adjust(array):\n    adjustedArray = []\n    for entry in array:\n        key = entry[\"key\"]\n        offset = entry[\"offset\"]\n        type = entry[\"type\"]\n        nkey = key.strip()[1:-1]\n        if nkey[0] == \"/\":\n            # this is a closing tag. Set offset to be 1 char before <\n            offset = offset - len(key)\n            nkey = nkey[1:]\n        adjustedArray.append((nkey, offset, type))\n    return adjustedArray\n\ndef main(inBlob):\n    args = json.loads(inBlob)\n    adjustedArray = adjust(args[\"keys\"])\n    udf = constructRecords(adjustedArray, args[\"prettyPath\"])\n    return json.dumps({\"udf\": udf})"
        XcalarAppSet(xmlApp, "Python", "Import", xmlAppStr);

        var jsonAppStr = "import jsonpath_rw, json\n\ndef findJsonPath(keyArray, inp):\n    #keyArray must be of the form [(\"key\", characterOffset)]\n    sortedArray = sorted(keyArray, key=lambda (key, offset, type): offset)\n    initialFile = open(inp, \"r\").read()\n    segments = []\n    prevIndex = 0\n    for (keyPartialName, charOffset, type) in sortedArray:\n        #explode initialFile at the correct places\n        segments.append(initialFile[prevIndex:charOffset])\n        prevIndex = charOffset\n    segments.append(initialFile[prevIndex:])\n    withXcTags = \"\"\n    for idx in xrange(len(segments)-1):\n        withXcTags += segments[idx]\n        key, offset, type = sortedArray[idx]\n        if key == \"{\":\n            withXcTags += '\"xctag\": {\"type\": \"'+ type + '\"},'\n        else:\n            if type == \"partial\":\n                # This is not allowed\n                type = \"full\"\n            withXcTags += '{\"xctag\": {\"array\": true, \"type\": \"' + type + '\"}},'\n    withXcTags += segments[-1]\n    fout = open(\"tmp.txt\", \"wb\")\n    fout.write(withXcTags)\n    fout.close()\n    objects = json.loads(withXcTags)\n    jsonPath = jsonpath_rw.parse(\"$..xctag\")\n    allObj = []\n    if isinstance(objects, list):\n        for obj in objects:\n            allObj += jsonPath.find(obj)\n    else:\n        allObj += jsonPath.find(objects)\n    fullPaths = []\n    partialPaths = []\n    for obj in allObj:\n        isArray = \"array\" in obj.value\n        type = obj.value[\"type\"]\n        if isinstance(obj.full_path, jsonpath_rw.jsonpath.Fields):\n            # special case for top level\n            fullPaths.append(\"*\")\n            continue\n        path = obj.full_path.left\n        if (isArray):\n            path = path.left\n        fragments = []\n        indexPart = \"\"\n        if type == \"full\":\n            while hasattr(path, \"left\"):\n                if isinstance(path.right, jsonpath_rw.jsonpath.Index):\n                    indexPart += str(path.right)\n                else:\n                    fragments.append(\"'\" + str(path.right) + \"'\" + indexPart)\n                    indexPart = \"\"\n                path = path.left\n            fragments.append(\"'\" + str(path) + \"'\" + indexPart)\n            fullPaths.append(\".\".join(reversed(fragments)))\n        else:\n            partialPaths.append(\"'\" + str(path.right) + \"'\")\n    return (fullPaths, partialPaths)\n\ndef constructRecords(keyArray, prettyIn):\n\n    (fullPaths, partialPaths) = findJsonPath(keyArray, prettyIn)\n    return \"\"\"\nimport json, objectpath\ndef parser(inp, ins):\n    # Find all partials\n    roots = json.load(ins)\n    if (not isinstance(roots, list)):\n        roots = [roots]\n    partialPaths = \"\"\" + json.dumps(partialPaths) + \"\"\"\n    fullPaths = \"\"\" + json.dumps(fullPaths) + \"\"\"\n\n    for root in roots:\n        tree = objectpath.Tree(root)\n        for partialPath in partialPaths:\n            partialElements = tree.execute(\"$..\" + partialPath)\n            #if not isinstance(partialElements, list):\n            #    partialElements = [partialElements]\n            for element in partialElements:\n                # XXX This package unfortunately cannot give the full path.\n                # In order to get this information, we will have to add\n                # the xctag struct to every element here and then trace as per\n                # full path\n                #element[\"xcXmlPath\"] = element.full_path\n                element[\"xcMethod\"] = \"partial\"\n                yield element\n        for fullPath in fullPaths:\n            element = tree.execute(\"$.\" + fullPath)\n            if (not isinstance(element, list)):\n                element = [element]\n            for ele in element:\n                ele[\"xcXmlPath\"] = fullPath\n                ele[\"xcMethod\"] = \"full\"\n                yield ele\n\"\"\"\n\ndef adjust(array):\n    adjustedArray = []\n    for entry in array:\n        key = entry[\"key\"]\n        offset = entry[\"offset\"]\n        type = entry[\"type\"]\n        nkey = key.strip()\n        adjustedArray.append((nkey, offset, type))\n    return adjustedArray\n\ndef main(inBlob):\n    args = json.loads(inBlob)\n    adjustedArray = adjust(args[\"keys\"])\n    udf = constructRecords(adjustedArray, args[\"prettyPath\"])\n    return json.dumps({\"udf\": udf})"
        XcalarAppSet(jsonApp, "Python", "Import", jsonAppStr);
    }

    DSParser.show = function(url) {
        DSForm.switchView(DSForm.View.Parser);
        resetView(url);
        var startPage = 0;
        var numPages = 1;
        previewContent(startPage, numPages);
        resetScrolling();
        resetWinResize();
    };

    function resetView(url) {
        $previewContent.html("");
        var $fileName = $parserCard.find(".topSection .filename");
        $fileName.text(url);
        xcTooltip.changeText($fileName, url);
        $formatList.find("input").val("");
        $("#previewModeBox .boxBody").empty();
        $("#delimitersBox .boxBody ul").empty();
        buffer = null;
        buffers = [];
        totalRows = null;
        keys = [];
        previewMeta = null;
        fetchId++;
        curUrl = url;
        resetRowInput();
        $dataPreview.find(".sizer").height(0);
        $previewContent.parent().height("auto");
        $dataPreview.scrollTop(0);
    }

    // called after clicking next OR close
    function cleanupCard() {
        $dataPreview.off("mousedown.dsparser");
        $(document).off("mouseup.dsparser");
        isMouseDown = false;
        $(window).off("resize.dsparser");
    }

    function resetWinResize() {
        var timeout;
        $(window).on("resize.dsparser", function() {
            clearTimeout(timeout);
            timeout = setTimeout(repositionBoxes, 100);
        });

        repositionBoxes();
    }

    function repositionBoxes() {
        $parserCard.find(".parserBox").each(function() {
            var $box = $(this);
            if ($box.position().left < 0) {
                // var width = $box.width();
                var right = $parserCard.width() - ($box.outerWidth() +
                    parseInt($box.css("margin-right")));
                $box.css({"right": right});
            }
            var cardMainHeight = $parserCard.find(".cardMain").height();
            var boxHeight = $box.outerHeight();
            if ($box.position().top + boxHeight > cardMainHeight) {
                $box.css({"top": cardMainHeight - boxHeight});
            }
        });
    }

    function resetScrolling() {
        $dataPreview.on("mousedown.dsparser", function() {
            isMouseDown = true;
        });
        $(document).on("mouseup.dsparser", function() {
            if (isMouseDown) {
                checkIfScrolled();
                isMouseDown = false;
            }
        });
    }

    function toggleBoxResize($icon) {
        var $box = $icon.closest(".parserBox");
        if ($box.hasClass("minimized")) {
            $box.removeClass("minimized");
            var $sibling = $box.siblings(".parserBox");
            if (isBoxCoveringSibling($box, $sibling)) {
                $sibling.css({"top": $box.position().top + $box.outerHeight()});
                repositionBoxes();
            }
        } else {
            $box.addClass("minimized");
        }
    }

    function isBoxCoveringSibling($box, $sibling) {
        var boxTop = $box.position().top;
        var siblingTop = $sibling.position().top;
        if ((boxTop < siblingTop) && (boxTop + $box.height() > siblingTop)) {
            if (($box.position().left + $box.width() >
                $sibling.position().left) &&
                $box.position().left <
                ($sibling.position().left +$sibling.width())) {
                return true;
            }
        }
        return false;
    }

    function setupMenu() {
        var $menu = $("#parserMenu");
        addMenuBehaviors($menu);

        $previewContent.mouseup(function(event) {

            // timeout because deselecting may not take effect until after
            // mouse up
            setTimeout(function() {
                if (!hasSelection()) { // no selection made
                    return;
                }

                var res = getSelectionCharOffsetsWithin($previewContent[0]);
                res.end += previewMeta.lineLengths[previewMeta.startPage];
                var $target = $(event.target);
                if ($parserCard.hasClass("previewOnly") || res.tag == null) {
                    $menu.find("li").addClass("unavailable");
                    $menu.removeData("tag");
                    $menu.removeData("end");
                } else {
                    $menu.find("li").removeClass("unavailable");
                    $menu.data("tag", res.tag);
                    $menu.data("end", res.end);
                }

                xcHelper.dropdownOpen($target, $menu, {
                    "mouseCoors": {"x": event.pageX, "y": event.pageY + 10},
                    "floating": true
                });
            });
        });

        // prevent browser's default menu if text selected
        $previewContent.contextmenu(function() {
            if (hasSelection()) {
                return false;
            }
        });

        function hasSelection() {
            var selection;
            if (window.getSelection) {
                selection = window.getSelection();
            } else if (document.selection) {
                selection = document.selection.createRange();
            }
            return (selection.toString().length > 0);
        }

        $menu.on("click", "li", function() {
            var $li = $(this);
            if ($li.hasClass("unavailable")) {
                return;
            }

            var tag = $menu.data("tag");
            var type = $li.data("action");
            var keyOffset = $menu.data("end");
            populateKey(tag, type, keyOffset);
        });
    }

    function setupKeyBox() {
        var $box = $("#delimitersBox");
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

            val = Math.min(previewMeta.totalLines, val);
            val = Math.max(0, val);
            $input.data("val", val).val(val);
            
            var page = Math.floor(val / linesPerPage);
            var padding = containerPadding;
            if (val === 0) {
                padding = 0;
            }
            var newScrollTop = val * lineHeight + padding;
            var numPages = 1;
            var numVisibleLines = Math.ceil($dataPreview.outerHeight() /
                                            lineHeight);
            if (Math.floor((val + numVisibleLines) / linesPerPage) !== page) {
                numPages++;
            }

            previewContent(page, numPages, newScrollTop);
        });

        $input.blur(function() {
            var val = $(this).data('val');
            $(this).val(val);
        });
    }

    function setupInfScroll() {
        var prevScrollPos = 0;
        var scrollTop = 0;
        // var $container = $previewContent.parent();

        var scrollTimer;
        $dataPreview.scroll(function() {
            getScrollLineNum();
            clearTimeout(scrollTimer);
            if (isMouseDown) {
                return;
            }

            // when scrolling stops, will check position and see if we need
            // to fetch rows
            scrollTimer = setTimeout(checkIfScrolled, 300);

            if ($parserCard.hasClass("fetchingRows")) {
                return;
            }
            scrollTop = $dataPreview.scrollTop();
            if (scrollTop !== prevScrollPos) {
                if (scrollTop > prevScrollPos) {
                    checkIfNeedFetch();
                } else if (scrollTop < prevScrollPos) {
                    checkIfNeedFetch(true);
                }
                prevScrollPos = scrollTop;
            } else {
                // could be scrolling horizontally
                return;
            }
        });
    }

    function checkIfNeedFetch(up) {
        if (!previewMeta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var scrollTop = Math.max(0, $dataPreview.scrollTop() -
                                    containerPadding);

        if (up) {
            var startPage = Math.floor(scrollTop / pageHeight);
            if (startPage < previewMeta.startPage) {
                fetchRows(previewMeta.lineLengths[startPage], up);
            }
        } else {
            var scrollBottom = scrollTop + $dataPreview[0].offsetHeight;
            var endPage = Math.floor(scrollBottom / pageHeight);
            if (endPage > previewMeta.endPage) {
                fetchRows(previewMeta.lineLengths[endPage]);
            }
        }
    }

    function checkIfScrolled() {
        if (!previewMeta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var scrollTop = Math.max(0, $dataPreview.scrollTop() -
                                    containerPadding);
        var topPage = Math.floor(scrollTop / pageHeight);
        var botPage = Math.floor((scrollTop + $dataPreview[0].offsetHeight) /
                                 pageHeight);

        if (previewMeta.startPage === topPage &&
            previewMeta.endPage === botPage) {
            return;
        } else {
            // XXX need to do a better check of which pages to fetch
            var numPages = 1;
            if (topPage !== botPage) {
                numPages = 2;
            }
            previewContent(topPage, numPages, $dataPreview.scrollTop());
        }
    }

    function getScrollHeight() {
        var numRows = previewMeta.totalLines;
        var scrollHeight = Math.max(lineHeight * numRows,
                                    $previewContent.height());
                                    // $previewContent.height() - 10);

        return (scrollHeight);
    }

    function previewContent(pageNum, numPages, scrollTop) {
        var deferred = jQuery.Deferred();
        var newContent = (previewMeta == null);

        $parserCard.removeClass("error");
        if (newContent) {
            $parserCard.addClass("loading");
        } else {
            $parserCard.addClass("fetchingRows");
        }

        var url = curUrl;
        var promise = newContent ? detectFormat(url) : PromiseHelper.resolve();
        fetchId++;
        var curFetchId = fetchId;

        promise
        .then(function() {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }

            if (newContent) {
                return beautifier(url);
            } else {
                return PromiseHelper.resolve();
            }
        })
        .then(function(meta) {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }

            var offset;
            if (newContent) {
                setPreviewMeta(meta);
                updateTotalNumRows();
                showPreviewMode();
                offset = 0;
            } else {
                offset = previewMeta.lineLengths[pageNum];
            }
            var numBytes = calculateNumBytes(pageNum, numPages);

            return XcalarPreview(previewMeta.parsedPath, null, false, numBytes,
                                 offset);
        })
        .then(function(res) {
            if (curFetchId !== fetchId) {
                deferred.reject();
                return;
            }
            if (newContent) {
                totalSize = res.totalDataSize;
            } else {
                previewMeta.startPage = pageNum;
                previewMeta.endPage = pageNum + numPages - 1;
            }
            showContent(res.buffer, numPages, scrollTop);
            $parserCard.removeClass("loading fetchingRows");

            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId !== fetchId) {
                handleError(error);
            }
            deferred.reject();
        });

        return deferred.promise();
    }


    function setPreviewMeta(meta) {
        previewMeta = meta;
        previewMeta.startPage = 0; // first visible page
        previewMeta.endPage = 0; // last visible page
        previewMeta.numPages = meta.lineLengths.length;
        previewMeta.parsedPath = parseNoProtocolPath(meta.tmpPath);
        if (meta.meta) {
            previewMeta.meta.parsedPath = parseNoProtocolPath(meta.meta.path);
        }

        console.log(previewMeta);
    }

    // used for scrolling and appending or prepending 1 block
    function fetchRows(newOffset, up) {
        var deferred = jQuery.Deferred();

        fetchId++;
        var curFetchId = fetchId;
        var numBytes;
        if (up) {
            numBytes = calculateNumBytes(previewMeta.startPage - 1, 1);
        } else {
            numBytes = calculateNumBytes(previewMeta.endPage + 1, 1);
        }

        if (newOffset >= totalSize || newOffset < 0) {
            return PromiseHelper.resolve();
        }

        $parserCard.addClass("fetchingRows");

        XcalarPreview(previewMeta.parsedPath, null, false, numBytes, newOffset)
        .then(function(res) {
            if (curFetchId === fetchId) {
                addContent(res.buffer, up);
            }
        })
        .fail(function() {
            if (curFetchId === fetchId) {
                $parserCard.removeClass("fetchingRows");
                // handleError or different error handler for scrolling errors
            }
        })
        .always(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    function showPreviewMode() {
        var deferred = jQuery.Deferred();
        var promise = deferred.promise();

        if (!previewMeta.meta) {
            console.error("error case");
            handlePreviewModeError(ErrTStr.Unknown);
            return PromiseHelper.reject(ErrTStr.Unknown);
        }

        var $box = $("#previewModeBox");
        $box.removeClass("error");
        var parsedPath = previewMeta.meta.parsedPath;
        var curFetchId = fetchId;

        var numBytes = 4000; // XXX hard coded
        var newOffset = 0; // XXX hard coded

        XcalarPreview(parsedPath, null, false, numBytes, newOffset)
        .then(function(res) {
            if (curFetchId === fetchId) {
                addPreviewModeContent(res.buffer);
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId === fetchId) {
                handlePreviewModeError(error);
            }
            deferred.reject(error);
        });

        xcHelper.showRefreshIcon($box.find(".boxBody"), promise);
        return promise;
    }

    function addPreviewModeContent(content, up) {
        var $box = $("#previewModeBox");
        $box.find(".boxBody").text(content);
    }

    function handlePreviewModeError(error) {
        var $box = $("#previewModeBox");
        $box.addClass("error");
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }
        $box.find(".boxBody").text(error);
    }

    function beautifier(url) {
        var deferred = jQuery.Deferred();
        var path = url.split(/^.*:\/\//)[1];
        var options = {
            "format": getFormat().toLowerCase(),
            "path": path,
            "user": Support.getUser(),
            "session": WorkbookManager.getActiveWKBK()
        };
        var inputStr = JSON.stringify(options);
        XcalarAppExecute(previewApp, false, inputStr)
        .then(function(ret) {
            var parsedRet = parseAppRes(ret);
            if (parsedRet.error) {
                deferred.reject(parsedRet.error);
            } else {
                deferred.resolve(parsedRet.out);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function parseNoProtocolPath(path) {
        var protocol = FileProtocol.file.slice(0, FileProtocol.file.length - 1);
        return (protocol + path);
    }

    function parseAppRes(ret) {
        var error = parseAppResHelper(ret.errStr);
        if (error.out) {
            return {"error": error.out};
        }

        var parsed = parseAppResHelper(ret.outStr);
        if (parsed.error) {
            return {"error": parsed.error};
        }
        try {
            // parsed.out is a string, need another parse
            var parsedRet = JSON.parse(parsed.out);
            return {"out": parsedRet};
        } catch (error) {
            return {"error": error.toString()};
        }
    }

    function parseAppResHelper(appRes) {
        try {
            var out = JSON.parse(appRes)[0][0];
            return {"out": out};
        } catch (error) {
            console.error(error);
            return {"error": error};
        }
    }

    function updateTotalNumRows() {
        // XXX translate bytes to number of rows
        var inputWidth = 50;
        var numDigits = ("" + previewMeta.totalLines).length;
        inputWidth = Math.max(inputWidth, 20 + (numDigits * 9));

        $("#parserRowInput").outerWidth(inputWidth);
        $parserCard.find(".totalRows").text("of " + previewMeta.totalLines);
    }

    function getSelectionCharOffsetsWithin(element) {
        var start = 0;
        // var end = 0;
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
            // end = start + range.toString().length;
        } else if (typeof document.selection !== "undefined" &&
                    document.selection.type !== "Control") {
            sel = document.selection;
            range = sel.createRange();
            priorRange = document.body.createTextRange();
            priorRange.moveToElementText(element);
            priorRange.setEndPoint("EndToStart", range);
            start = priorRange.text.length;
            // end = start + range.text.length;
        }

        // XXX need to be tested in IE
        res = getRightSelection(start);
        if (res != null && res.start > -1) {
            var nodes = getTextNodes(element);
            range = document.createRange();

            // check if start is on 1st or 2nd page
            if (res.start < buffers[0].length) {
                range.setStart(nodes[0], res.start);
            } else {
                range.setStart(nodes[1], res.start - buffers[0].length);
            }

            if (res.end < buffers[0].length) {
                range.setEnd(nodes[0], res.end);
            } else {
                range.setEnd(nodes[1], res.end - buffers[0].length);
            }

            sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            return res;
        } else {
            return null;
        }
    }

    function getTextNodes(node) {
        var textNodes = [];
        if (node.nodeType === 3) {
            textNodes.push(node);
        } else {
            var children = node.childNodes;
            for (var i = 0, len = children.length; i < len; ++i) {
                textNodes.push.apply(textNodes, getTextNodes(children[i]));
            }
        }
        return textNodes;
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
        var cnt = 0;
        var ch = getCharAt(s);

        if (ch !== "[") {
            while (s >= 0) {
                ch = getCharAt(s);
                if (ch === "{") {
                    if (cnt === 0) {
                        break;
                    } else {
                        cnt--;
                    }
                } else if (ch === "}" && s !== start) {
                    cnt++;
                }

                s--;
            }
        }

        // check if it's a valid tag
        var tag = null;
        if (cnt === 0 && (ch === "{" || ch === "[")) {
            tag = getSubStr(s, s + 1);
        }

        return {
            "start": s,
            "end": s + 1,
            "tag": tag
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

        // offset start with 1, cursor start with 0
        var displayKey = (getFormat() === "JSON")
                         ? getJSONPath(keyOffset - 1)
                         : tag;
        keys.push({
            "key": tag,
            "type": type,
            "offset": keyOffset
        });
        addKeyItem(displayKey, type);
    }

    function getJSONPath(cursor) {
        var isChildOfArray = true;
        var p = cursor - 1;
        var ch;
        var jsonPath;

        // detect it's child of array or not
        while (p >= 0) {
            ch = getCharAt(p);
            if (ch === ":") {
                isChildOfArray = false;
                break;
            } else if (ch === "[" || ch === ",") {
                isChildOfArray = true;
                break;
            }
            p--;
            // other case will be the empty space
        }

        if (isChildOfArray) {
            var eleCnt = 0;
            var bracketCnt = 0;

            while (p >= 0) {
                ch = getCharAt(p);
                if (ch === "[") {
                    break;
                } else if (ch === "," && bracketCnt === 0) {
                    eleCnt++;
                } else if (ch === "}") {
                    bracketCnt++;
                } else if (ch === "{") {
                    bracketCnt--;
                }
                p--;
            }
            // find the first colon before [
            while (p >= 0 && getCharAt(p) !== ":") {
                p--;
            }
        }

        if (getCharAt(p) !== ":") {
            console.warn("cannot parse due to lack of data");
            jsonPath = "..." + getCharAt(cursor);
        } else {
            jsonPath = retrieveJSONKey(p - 1);
            if (isChildOfArray) {
                jsonPath += "[" + eleCnt + "]";
            }
        }

        return jsonPath;
    }

    function retrieveJSONKey(cursor) {
        var ch;
        var start = null;
        var end = null;

        while (cursor >= 0) {
            ch = getCharAt(cursor);
            if (ch === "\"") {
                if (cursor === 0 || getCharAt(cursor - 1) !== "\\") {
                    if (end == null) {
                        end = cursor;
                    } else {
                        start = cursor;
                        break;
                    }
                }
            }
            cursor--;
        }
        return getSubStr(start + 1, end);
    }

    function addKeyItem(displayKey, type) {
        var tag = xcHelper.escapeHTMLSepcialChar(displayKey);
        var li =
                '<li class="key">' +
                    '<div class="item">' +
                        '<span class="tag tooltipOverflow' +
                        ' textOverflowOneLine">' +
                            tag +
                        '</span>' +
                        '<span class="type">' +
                            type +
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
            // $li.get(0).scrollIntoView(); // causes whole page to move
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

    function calculateNumBytes(page, numPages) {
        var lineLengths = previewMeta.lineLengths;
        var numBytes  = 0;

        for (var i = 0; i < numPages; i++) {
            if (page + 1 >= lineLengths.length) {
                numBytes += (totalSize - lineLengths[page]);
                break;
            } else {
                numBytes += (lineLengths[page + 1] - lineLengths[page]);
                page++;
            }
        }
        return numBytes;
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

    function submitForm() {
        if (!validateSubmit()) {
            return PromiseHelper.reject();
        }
        var deferred = jQuery.Deferred();
        var promise = deferred.promise();
        var udfName;

        alertHelper()
        .then(function() {
            $parserCard.addClass("submitting");
            xcHelper.showRefreshIcon($dataPreview, false, promise);
            return parseHelper();
        })
        .then(function(udfStr) {
            udfName = xcHelper.randName("_xcalar_visual_parser");
            return XcalarUploadPython(udfName, udfStr);
        })
        .then(function() {
            return PromiseHelper.alwaysResolve(UDF.refresh());
        })
        .then(function() {
            DSPreview.backFromParser(udfName);
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.error !== cancelError) {
                Alert.error(DSParserTStr.Fail, error.error);
            }
            if (udfName != null) {
                // has update the udf
                XcalarDeletePython(udfName);
            }

            deferred.reject(error);
        })
        .always(function() {
            $parserCard.removeClass("submitting");
            cleanupCard();
        });

        return promise;
    }

    // called when jumping to a line via input, dragging scrollbar, or on first
    // fetch
    function showContent(content, numPages, scrollTop) {
        buffers = [];
        buffer = content;
        var $page;
        var firstContent = content;
        var secondContent = ""; // in case numPages === 2
        $previewContent.empty();

        if (numPages === 2) {
            var firstPageSize = calculateNumBytes(previewMeta.startPage, 1);
            firstContent = buffer.substr(0, firstPageSize);
            secondContent = buffer.substr(firstPageSize);
            buffers = [firstContent, secondContent];
        } else {
            buffers = [firstContent];
        }

        $page = $(getPageHtml(previewMeta.startPage));
        $page.text(firstContent);
        $previewContent.append($page);

        if (secondContent.length) {
            $page = $(getPageHtml(previewMeta.startPage + 1));
            $page.text(secondContent);
            $previewContent.append($page);
        }

        $dataPreview.find(".sizer").height(previewMeta.startPage * pageHeight);
        var padding;
        if (previewMeta.startPage === 0) {
            padding = 0;
        } else {
            padding = containerPadding;
        }
        if (scrollTop != null) {
            $dataPreview.scrollTop(scrollTop);
        } else {
            $dataPreview.scrollTop(previewMeta.startPage * pageHeight +
                                    padding);
        }

        $previewContent.parent().height(getScrollHeight());
        getScrollLineNum();
    }

    function getPageHtml(pageNum) {
        return '<span class="page page' + pageNum + '"></span>';
    }

    function addContent(content, up) {
        var pageClass = "";
        if (up) {
            previewMeta.startPage--;
            pageClass = "page" + previewMeta.startPage;
            buffers.unshift(content);
        } else {
            previewMeta.endPage++;
            pageClass = "page" + previewMeta.endPage;
            buffers.push(content);
        }
        
        var scrollTop = $dataPreview.scrollTop();
        var color = "rgba(" + Math.round(Math.random() * 255) + "," + Math.round(Math.random() * 255) + "," + Math.round(Math.random() * 255) + ", 0.5)";
        var $page = $('<span class="page ' + pageClass + '" style="background:' + color + ';"></span>');
        $page.text(content);
        if (up) {
            $previewContent.prepend($page);
        } else {
            $previewContent.append($page);
        }

        if (previewMeta.endPage - previewMeta.startPage > 1) { // no more than 2 pages visible at a time
            if (up) {
                $previewContent.find(".page").last().remove();
                buffers.pop();
                previewMeta.endPage--;
            } else {
                $previewContent.find(".page").eq(0).remove();
                buffers.shift();
                previewMeta.startPage++;
            }
        }
        var sizerHeight = (previewMeta.startPage) * pageHeight;
        $dataPreview.find(".sizer").height(sizerHeight);
        $dataPreview.scrollTop(scrollTop);
        $parserCard.removeClass("fetchingRows");
        buffer = buffers[0];
        if (buffers[1]) {
            buffer += buffers[1];
        }
    }


    function validateSubmit() {
        var isValid = xcHelper.validate([
            {
                "$ele": $("#delimitersBox"),
                "error": DSParserTStr.NoKey,
                "side": "left",
                "check": function() {
                    return (keys.length === 0);
                }
            }
        ]);
        return isValid;
    }

    function alertHelper() {
        var deferred = jQuery.Deferred();
        Alert.show({
            "title": DSParserTStr.Submit,
            "msg": DSParserTStr.SubmitMsg,
            "onConfirm": function() { deferred.resolve(); },
            "onCancel": function() { deferred.reject(cancelError); }
        });
        return deferred.promise();
    }

    function parseHelper() {
        var deferred = jQuery.Deferred();
        var format = getFormat();
        var app;

        if (format === "XML") {
            app = xmlApp;
        } else if (format === "JSON") {
            app = jsonApp;
        } else {
            return PromiseHelper.reject({"error": DSParserTStr.NotSupport});
        }

        var options = {
            "prettyPath": previewMeta.tmpPath,
            "keys": keys
        };
        var inputStr = JSON.stringify(options);

        XcalarAppExecute(app, false, inputStr)
        .then(function(ret) {
            var parsedRet = parseAppRes(ret);
            if (parsedRet.error) {
                deferred.reject({"error": parsedRet.error});
            } else {
                deferred.resolve(parsedRet.out.udf);
            }
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    function closeCard() {
        DSForm.switchView(DSForm.View.Preview);
        resetView();
        cleanupCard();
    }

    function resetRowInput() {
        $parserCard.find(".totalRows").text("");
        $("#parserRowInput").val(0).data("val", 0);
    }

    function updateRowInput(lineNum) {
        $("#parserRowInput").val(lineNum).data("val", lineNum);
    }
    
    function getScrollLineNum() {
        var lineNum = Math.floor(($dataPreview.scrollTop() - containerPadding) /
                                  lineHeight);
        lineNum = Math.max(0, lineNum);
        updateRowInput(lineNum);
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSParser.__testOnly__ = {};
    }
    /* End Of Unit Test Only */

    return (DSParser);
}(jQuery, {}));
