/*
 * Module for dataset parser card
 */
window.DSParser = (function($, DSParser) {
    var $parserCard;
    var $formatList;
    var $dataPreview;
    var $previewContent;
    var buffers = [];
    var curUrl;
    var keys;
    var previewMeta; // will have lineLengths, maxLen, tmpPath, totalLines, numChar
    var lineHeight = 18;
    var boxLineHeight = 15;
    var linesPerPage = 100;
    var containerPadding = 10;
    var isMouseDown = false;
    var isBoxMouseDown = false;
    var fetchId = 0; // used to detect stale requests
    var boxFetchId = 0;
    var boxMin = 300;
    var $miniPreview;
    var $miniContent;

    // const
    var previewApp = "vpFormatter";
    var xmlApp = "vpXmlSudfGen";
    var jsonApp = "vpJsonSudfGen";
    var notSameCardError = "current card id changed";
    var cancelError = "cancel submit";

    DSParser.setup = function() {
        $parserCard = $("#dsParser");
        $formatList = $parserCard.find(".fileFormat");
        $dataPreview = $parserCard.find('.dataPreview');
        $previewContent = $parserCard.find('.previewContent');
        $miniPreview = $("#previewModeBox").find(".boxBody");
        $miniContent = $miniPreview.find('.boxContent');

        new MenuHelper($formatList, {
            "onSelect": function($li) {
                changeFormat($li);
                refreshFormat();
            }
        }).setupListeners();

        $parserCard.on("click", ".confirm", function() {
            submitForm();
        });

        $parserCard.on("click", ".cardHeader .close", function() {
            closeCard();
        });

        $parserCard.on("mouseenter", ".tooltipOverflow", function() {
            xcTooltip.auto(this);
        });

        setupBoxes();
        setupMenu();
        setupRowInput();
        setupInfScroll($dataPreview);
        setupInfScroll($miniPreview);
        setupKeyBox();

        // XXX this should be removed later
        setApp();
    };

    function setApp() {
        var previewAppStr = "import sys, json, re, random, hashlib\nfrom lxml import etree as ET\n\ndef getMeta(s, ssf, isArray):\n    for k in s:\n        if isArray:\n            value = k\n        else:\n            value = s[k]\n        if isinstance(value, str) or isinstance(value, unicode):\n            if isArray:\n                if \"String\" not in ssf:\n                    ssf[\"String\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"String\"] = True\n        elif isinstance(value, float):\n            if isArray:\n                if \"Float\" not in ssf:\n                    ssf[\"Float\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Float\"] = True\n        elif isinstance(value, int):\n            if isArray:\n                if \"Integer\" not in ssf:\n                    ssf[\"Integer\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Integer\"] = True\n        elif isinstance(value, bool):\n            if isArray:\n                if \"Boolean\" not in ssf:\n                    ssf[\"Boolean\"] = True\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                ssf[k][\"Boolean\"] = True\n        elif isinstance(value, dict):\n            if isArray:\n                if \"Object\" not in ssf:\n                    ssf[\"Object\"] = {}\n                getMeta(value, ssf[\"Object\"], False)\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                if \"Object\" not in ssf[k]:\n                    ssf[k][\"Object\"] = {}\n                getMeta(value, ssf[k][\"Object\"], False)\n        elif isinstance(value, list):\n            if isArray:\n                if \"Array\" not in ssf:\n                    ssf[\"Array\"] = {}\n                getMeta(value, ssf[\"Array\"], True)\n            else:\n                if k not in ssf:\n                    ssf[k] = {}\n                if \"Array\" not in ssf[k]:\n                    ssf[k][\"Array\"] = {}\n                getMeta(value, ssf[k][\"Array\"], True)\n        else:\n            # error\n            print value\n            print type(value)\n\ndef getMetaWrapper(s):\n    d = {}\n    if isinstance(s, list):\n        getMeta(s, d, True)\n        d = [d]\n    else:\n        getMeta(s, d, False)\n    return d\n\ndef reformatMeta(s, indent, step, array):\n    out = \"\"\n    for ss in s:\n        # must be a key name\n        if not array and len(s[ss]) == 1:\n            if list(s[ss])[0] != \"Object\" and list(s[ss])[0] != \"Array\":\n                out += \" \" * indent + json.dumps(ss) + \": <\" + list(s[ss])[0]\\\n                       + \">,\\n\"\n            else:\n                out += \" \" * indent + json.dumps(ss) + \": \"\n                if list(s[ss])[0] == \"Object\":\n                    out += \"{\\n\"\n                    out += reformatMeta(s[ss][\"Object\"], indent + step, step,\n                                    False)\n                    out += \" \" * indent + \"},\\n\"\n                else:\n                    out += \"[\\n\"\n                    out += reformatMeta(s[ss][\"Array\"], indent + step, step,\n                                    True)\n                    out += \" \" * indent + \"],\\n\"\n        elif not array and len(s[ss]) == 0:\n            # This is actually a bug\n            out += \" \" * indent + json.dumps(ss) + \": <Unknown>,\\n\"\n        else:\n            if not array:\n                out += \" \" * indent + json.dumps(ss) + \":(\\n\"\n                iterObj = s[ss]\n            else:\n                iterObj = s\n            if \"String\" in iterObj:\n                out += \" \" * (indent + step) + \"<String>,\\n\"\n            if \"Integer\" in iterObj:\n                out += \" \" * (indent + step) + \"<Integer>,\\n\"\n            if \"Float\" in iterObj:\n                out += \" \" * (indent + step) + \"<Float>,\\n\"\n            if \"Boolean\" in iterObj:\n                out += \" \" * (indent + step) + \"<Boolean>,\\n\"\n            if \"Object\" in iterObj:\n                out += \" \" * (indent + step) + \"{\\n\"\n                out += reformatMeta(iterObj[\"Object\"], indent + step, step,\n                                    False)\n                out += \" \" * (indent + step) + \"},\\n\"\n            if \"Array\" in iterObj:\n                out += \" \" * (indent + step) + \"[\\n\"\n                out += reformatMeta(iterObj[\"Array\"], indent + step, step,\n                                    True)\n                out += \" \" * (indent + step) + \"],\\n\"\n            if not array:\n                out += \" \" * indent + \")\\n\"\n            else:\n                break\n    return out\n\ndef reformat(struct):\n    if isinstance(struct, list):\n        return reformatMeta(struct[0][\"Object\"], 0, 2, False)\n    else:\n        return reformatMeta(struct, 0, 2, False)\n\ndef findLongestLineLength(s):\n    maxLen = 0\n    curSum = 0\n    lineNo = 0\n    lineLengths = []\n    for line in s.split(\"\\n\"):\n        if lineNo % 100 == 0:\n            lineLengths.append(curSum)\n        lineLen = len(line)\n        curSum += lineLen + 1\n        if lineLen > maxLen:\n            maxLen = lineLen\n        lineNo += 1\n    return (lineNo, maxLen, lineLengths, len(s))\n\ndef prettyPrintJson(inp, tmpp, metap):\n    try:\n        structs = json.load(open(inp, \"rb\"))\n    except:\n        structs = json.loads(\"[\" +\n                             \",\".join(open(inp, \"rb\").read().split(\"\\n\")) +\n                             \"]\")\n    prettyString = json.dumps(structs, indent=2)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    metaPrettyString = reformat(getMetaWrapper(structs))\n    fout = open(metap, \"wb\")\n    fout.write(metaPrettyString)\n    fout.close()\n    return (findLongestLineLength(prettyString), findLongestLineLength(\n            metaPrettyString))\n\ndef constructXml(elements, root):\n    for e in elements:\n        elems = root.findall(\"./[\" + e.tag + \"]\")\n        if len(elems) == 0:\n            newElem = ET.SubElement(root, e.tag)\n        else:\n            newElem = elems[0]\n        constructXml(e.findall(\"./\"), newElem)\n\ndef constructXmlMeta(root):\n    prettyRoot = ET.Element(root.tag)\n    constructXml(root.findall(\"./\"), prettyRoot)\n    return prettyRoot\n\ndef prettyPrintXml(inp, tmpp, metap):\n    parser = ET.XMLParser(remove_blank_text=True, huge_tree=True)\n    try:\n        parser.feed(open(inp).read().decode(\"utf-8\", \"ignore\").encode(\"utf-8\"))\n        root = parser.close()\n    except:\n        parser = ET.XMLParser(remove_blank_text=True, huge_tree=True)\n        parser.feed(\"<xcRecord>\")\n        parser.feed(open(inp).read().decode(\"utf-8\", \"ignore\").encode(\"utf-8\"))\n        parser.feed(\"</xcRecord>\")\n        root = parser.close()\n    prettyString = ET.tostring(root, pretty_print=True)\n    fout = open(tmpp, \"wb\")\n    fout.write(prettyString)\n    fout.close()\n    prettyRoot = constructXmlMeta(root)\n    metaPrettyString = ET.tostring(prettyRoot, pretty_print=True)\n    fout = open(metap, \"wb\")\n    fout.write(metaPrettyString)\n    fout.close()\n    return (findLongestLineLength(prettyString), findLongestLineLength(\n            metaPrettyString))\n\ndef prettyPrintText(inp):\n    return findLongestLineLength(open(inp, \"rb\").read())\n\ndef main(inBlob):\n    arguments = json.loads(inBlob)\n    userName = arguments[\"user\"]\n    sessionName = arguments[\"session\"]\n    hashName = hashlib.md5(userName + \"-\" + sessionName).hexdigest()\n    outPath = \"/tmp/vp-\" + str(hashName)\n    metaOutPath = \"/tmp/mvp-\" + str(hashName)\n    if (arguments[\"format\"] == \"xml\"):\n         ((total, maxLen, lineLengths, numChar),\n         (metaTotalLines, metaMaxLen, metaLineLengths,\n                                      metaNumChar)) = prettyPrintXml(\n                                                      arguments[\"path\"],\n                                                      outPath, metaOutPath)\n    elif (arguments[\"format\"] == \"json\"):\n        ((total, maxLen, lineLengths, numChar),\n         (metaTotalLines, metaMaxLen, metaLineLengths,\n                                      metaNumChar)) = prettyPrintJson(\n                                                      arguments[\"path\"],\n                                                      outPath, metaOutPath)\n    elif (arguments[\"format\"] == \"text\"):\n        (total, maxLen, lineLengths, numChar) = prettyPrintText(\n                                                arguments[\"path\"])\n    if arguments[\"format\"] == \"xml\" or arguments[\"format\"] == \"json\":\n        metaStruct = {\"tmpPath\": metaOutPath, \"lineLengths\": metaLineLengths,\n                      \"totalLines\": metaTotalLines, \"maxLen\": metaMaxLen,\n                      \"numChar\": metaNumChar}\n    else:\n        metaStruct = {}\n    return json.dumps({\"maxLen\": maxLen, \"lineLengths\": lineLengths,\n                       \"tmpPath\": outPath, \"totalLines\": total,\n                       \"numChar\": numChar,\n                       \"meta\": metaStruct})\n\n"
        XcalarAppSet(previewApp, "Python", "Import", previewAppStr);

        var xmlAppStr = "# This app is part of the visual parser. It takes in a bunch of offsets of\n# xml tags and outputs a stream UDF that will be then applied to the dataset\n# to extract the relevant tags out as records.\nimport sys, json, re, xmltodict\nfrom lxml import etree as ET\n\ndef findFullXmlPath(keyArray, inp):\n    #keyArray must be of the form [(\"key\", characterOffset)]\n    sortedArray = sorted(keyArray, key=lambda (key, offset): offset)\n    initialFile = open(inp, \"r\").read()\n    segments = []\n    prevIndex = 0\n    for (keyPartialName, charOffset) in sortedArray:\n        #explode initialFile at the correct places\n        segments.append(initialFile[prevIndex:charOffset])\n        prevIndex = charOffset\n    segments.append(initialFile[prevIndex:])\n    withXcTags = \"\"\n    for idx in xrange(len(segments)-1):\n        withXcTags += segments[idx]\n        withXcTags += \"<xctag></xctag>\"\n        #print str(idx) + \": >>\" + segments[idx][-20:] + \"<xctag></xctag>\" + segments[idx + 1][:20]\n    withXcTags += segments[-1]\n    root = ET.fromstring(withXcTags)\n    allObj = root.findall(\".//xctag\")\n    paths = []\n    tree = ET.ElementTree(root)\n    for obj in allObj:\n        path = tree.getpath(obj.getparent())\n        path = re.sub(r\"[\\[0-9+\\]]\", \"\", path)\n        paths.append(path)\n    return paths\n\ndef constructRecords(keyArray, prettyIn):\n    # keyArray must be of the form [(key, characterOffset, type)]\n    # where type == \"full\" or \"partial\"\n    fullKeyArray = []\n    partialPaths = []\n    fullPaths = []\n    partialElements = []\n    fullElements = []\n    for k, o, t in keyArray:\n        if t == \"full\":\n            fullKeyArray.append((k, o))\n        else:\n            partialPaths.append(k)\n    fullPaths = findFullXmlPath(fullKeyArray, prettyIn)\n    return \"\"\"\nimport sys, json, re\nfrom lxml import etree as ET\nimport xmltodict\ndef parser(inp, ins):\n    # Find all partials\n    parser = ET.XMLParser(huge_tree=True)\n    try:\n        parser.feed(ins.read().decode(\"utf-8\", \"ignore\").encode(\"utf-8\"))\n        root = parser.close()\n    except:\n        parser = ET.XMLParser(huge_tree=True)\n        parser.feed(\"<xcRecord>\")\n        parser.feed(open(inp).read().decode(\"utf-8\", \"ignore\").encode(\"utf-8\"))\n        parser.feed(\"</xcRecord>\")\n        root = parser.close()\n    tree = ET.ElementTree(root)\n    tree = ET.ElementTree(root)\n\n    partialPaths = \"\"\" + json.dumps(partialPaths) + \"\"\"\n    fullPaths = \"\"\" + json.dumps(fullPaths) + \"\"\"\n\n    if len(partialPaths):\n        eString = \".//*[self::\" + \" or self::\".join(partialPaths) + \"]\"\n        print eString\n        partialElements = root.xpath(eString)\n        for element in partialElements:\n            elementDict = xmltodict.parse(ET.tostring(element))\n            elementDict[\"xcXmlPath\"] = tree.getpath(element)\n            elementDict[\"xcMethod\"] = \"partial\"\n            yield elementDict\n\n    for fullPath in fullPaths:\n        fullElements = root.xpath(fullPath)\n        for element in fullElements:\n            elementDict = xmltodict.parse(ET.tostring(element))\n            elementDict[\"xcXmlPath\"] = tree.getpath(element)\n            elementDict[\"xcMethod\"] = \"full\"\n            yield elementDict\n\"\"\"\n\ndef adjust(array):\n    adjustedArray = []\n    for entry in array:\n        key = entry[\"key\"]\n        offset = entry[\"offset\"]\n        type = entry[\"type\"]\n        nkey = key.strip()[1:-1]\n        if nkey[0] == \"/\":\n            # this is a closing tag. Set offset to be 1 char before <\n            offset = offset - len(key)\n            nkey = nkey[1:]\n        adjustedArray.append((nkey, offset, type))\n    return adjustedArray\n\ndef main(inBlob):\n    args = json.loads(inBlob)\n    adjustedArray = adjust(args[\"keys\"])\n    udf = constructRecords(adjustedArray, args[\"prettyPath\"])\n    return json.dumps({\"udf\": udf})"
        XcalarAppSet(xmlApp, "Python", "Import", xmlAppStr);

        var jsonAppStr = "# This app is part of the visual parser. It takes in a bunch of offsets of\n# json { or [ and outputs a stream UDF that will be then applied to the dataset\n# to extract the relevant keys out as records.\nimport jsonpath_rw, json\n\ndef findJsonPath(keyArray, inp):\n    # keyArray must be of the form [(\"key\", characterOffset)]\n    sortedArray = sorted(keyArray, key=lambda (key, offset, type): offset)\n    initialFile = open(inp, \"r\").read()\n    segments = []\n    prevIndex = 0\n    for (keyPartialName, charOffset, type) in sortedArray:\n        #explode initialFile at the correct places\n        segments.append(initialFile[prevIndex:charOffset])\n        prevIndex = charOffset\n    segments.append(initialFile[prevIndex:])\n    withXcTags = \"\"\n    for idx in xrange(len(segments)-1):\n        withXcTags += segments[idx]\n        key, offset, type = sortedArray[idx]\n        if key == \"{\":\n            tagToAppend = '\"xctag\": {\"type\": \"'+ type + '\"}'\n            if not segments[idx+1][0] == \"}\":\n                tagToAppend += \",\" #only add if it was not originally empty\n            withXcTags += tagToAppend\n        else:\n            if type == \"partial\":\n                # This is not allowed\n                type = \"full\"\n            tagToAppend = '{\"xctag\": {\"array\": true, \"type\": \"' + type + '\"}}'\n            if not segments[idx+1][0] == \"]\":\n                tagToAppend += \",\"\n            withXcTags += tagToAppend\n    withXcTags += segments[-1]\n    objects = json.loads(withXcTags)\n    jsonPath = jsonpath_rw.parse(\"$..xctag\")\n    allObj = []\n    if isinstance(objects, list):\n        for obj in objects:\n            allObj += jsonPath.find(obj)\n    else:\n        allObj += jsonPath.find(objects)\n    fullPaths = []\n    partialPaths = []\n    for obj in allObj:\n        isArray = \"array\" in obj.value\n        type = obj.value[\"type\"]\n        if isinstance(obj.full_path, jsonpath_rw.jsonpath.Fields):\n            # special case for top level\n            fullPaths.append(\"*\")\n            continue\n        path = obj.full_path.left\n        if (isArray):\n            path = path.left\n        fragments = []\n        indexPart = \"\"\n        if type == \"full\":\n            while hasattr(path, \"left\"):\n                if isinstance(path.right, jsonpath_rw.jsonpath.Index):\n                    indexPart += str(path.right)\n                else:\n                    fragments.append(\"'\" + str(path.right) + \"'\" + indexPart)\n                    indexPart = \"\"\n                path = path.left\n            fragments.append(\"'\" + str(path) + \"'\" + indexPart)\n            fullPaths.append(\".\".join(reversed(fragments)))\n        else:\n            partialPaths.append(\"'\" + str(path.right) + \"'\")\n    return (fullPaths, partialPaths)\n\ndef constructRecords(keyArray, prettyIn):\n    (fullPaths, partialPaths) = findJsonPath(keyArray, prettyIn)\n    return \"\"\"\nimport json, objectpath\ndef parser(inp, ins):\n    # Find all partials\n    try:\n        roots = json.load(ins)\n    except:\n        roots = json.loads(\"[\" + \",\".join(ins.read().split(\"\\\\n\")) + \"]\")\n    if (not isinstance(roots, list)):\n        roots = [roots]\n    partialPaths = \"\"\" + json.dumps(partialPaths) + \"\"\"\n    fullPaths = \"\"\" + json.dumps(fullPaths) + \"\"\"\n    error = {} # Stores all errors\n    for root in roots:\n        tree = objectpath.Tree(root)\n        for partialPath in partialPaths:\n            partialElements = tree.execute(\"$..\" + partialPath)\n            #if not isinstance(partialElements, list):\n            #    partialElements = [partialElements]\n            for element in partialElements:\n                # XXX This package unfortunately cannot give the full path.\n                # In order to get this information, we will have to add\n                # the xctag struct to every element here and then trace as per\n                # full path\n                #element[\"xcXmlPath\"] = element.full_path\n                if isinstance(element, dict):\n                    element[\"xcMethod\"] = \"partial\"\n                    yield element\n                else:\n                    error[\"$..\" + partialPath] = True\n        for fullPath in fullPaths:\n            element = tree.execute(\"$.\" + fullPath)\n            if (not isinstance(element, list)):\n                element = [element]\n            for ele in element:\n                if isinstance(ele, dict):\n                    ele[\"xcXmlPath\"] = fullPath\n                    ele[\"xcMethod\"] = \"full\"\n                    yield ele\n                else:\n                    error[\"$.\" + fullPath] = True\n    for e in error:\n        yield {\"xcParserError\": True, \"path\": e}\n\"\"\"\n\ndef adjust(array):\n    adjustedArray = []\n    for entry in array:\n        key = entry[\"key\"]\n        offset = entry[\"offset\"]\n        type = entry[\"type\"]\n        nkey = key.strip()\n        adjustedArray.append((nkey, offset, type))\n    return adjustedArray\n\ndef main(inBlob):\n    args = json.loads(inBlob)\n    adjustedArray = adjust(args[\"keys\"])\n    udf = constructRecords(adjustedArray, args[\"prettyPath\"])\n    return json.dumps({\"udf\": udf})"
        XcalarAppSet(jsonApp, "Python", "Import", jsonAppStr);
    }

    DSParser.show = function(url) {
        DSForm.switchView(DSForm.View.Parser);
        resetView(url);
        return refreshView();
    };

    function refreshView(noDetect) {
        var promise = previewContent(0, 1, null, noDetect);
        resetScrolling();
        return promise;
    }

    function resetView(url, isChangeFormat) {
        $previewContent.html("");
        var $fileName = $parserCard.find(".topSection .filename");
        $fileName.text(url);
        xcTooltip.changeText($fileName, url);
        if (!isChangeFormat) {
            $formatList.find("input").val("");
        }
        $miniContent.empty();
        $("#delimitersBox .boxBody ul").empty();
        buffers = [];
        totalRows = null;
        keys = [];
        previewMeta = null;
        fetchId++;
        boxFetchId++;
        curUrl = url;
        resetRowInput();
        $dataPreview.find(".sizer").height(0);
        $previewContent.parent().height("auto");
        $miniContent.parent().height("auto");
        $dataPreview.scrollTop(0);
    }

    function changeFormat($li) {
        var format = $li.attr("name");
        var text = $li.text();
        $formatList.find(".text").val(text);

        if (format === "text") {
            $parserCard.addClass("previewOnly");
        } else {
            $parserCard.removeClass("previewOnly");
        }
    }

    function refreshFormat() {
        resetView(curUrl, true);
        return refreshView(true);
    }

    // called after clicking next OR close
    function cleanupCard() {
        $dataPreview.off("mousedown.dsparser");
        $miniPreview.off("mousedown.dsparser");
        $(document).off("mouseup.dsparser");
        isMouseDown = false;
        isBoxMouseDown = false;
        $(window).off("resize.dsparser");
    }

    function resetScrolling() {
        $dataPreview.on("mousedown.dsparser", function() {
            isMouseDown = true;
        });

        $miniPreview.on("mousedown.dsparser", function() {
            isBoxMouseDown = true;
        });

        $(document).on("mouseup.dsparser", function() {
            if (isMouseDown) {
                checkIfScrolled($dataPreview, previewMeta);
                isMouseDown = false;
            } else if (isBoxMouseDown) {
                if (previewMeta) {
                    checkIfScrolled($miniPreview, previewMeta.meta);
                }
                isBoxMouseDown = false;
            }
        });
    }

    function setupBoxes() {
        var $boxes = $parserCard.find(".parserBox");

        $boxes.mousedown(function() {
            $(this).css({"z-index": 1});
            $(this).siblings(".parserBox").css({"z-index": 0});
        });

        $boxes.on("click", ".resize", function() {
            var $box = $(this).closest(".parserBox");
            $box.removeClass("minimized");
            if ($box.hasClass("maximized")) {
                $box.removeClass("maximized");
            } else {
                $box.addClass("maximized");
                if ($box.is("#previewModeBox") && previewMeta) {
                    checkIfScrolled($miniPreview, previewMeta.meta);
                }
            }
        });

        $boxes.on("click", ".boxHeader", function(event) {
            if ($(event.target).closest(".resize").length ||
                gMouseEvents.getLastMouseDownTarget().closest(".resize").length)
            {
                return;
            }
            var $box = $(this).closest(".parserBox");
            if ($box.hasClass("maximized")) {
                return;
            }
            if ($box.hasClass("minimized")) {
                $box.removeClass("minimized");
            } else {
                $box.addClass("minimized");
            }
        });
    }

    function setupMenu() {
        var $menu = $("#parserMenu");
        addMenuBehaviors($menu);

        $dataPreview.mouseup(function(event) {

            // timeout because deselecting may not take effect until after
            // mouse up
            setTimeout(function() {
                if (!hasSelection()) { // no selection made
                    return;
                }

                var res = getSelectionCharOffsetsWithin($previewContent[0]);
                var $target = $(event.target);
                if ($parserCard.hasClass("previewOnly") || !res || 
                    res.tag == null) {
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
            var bufferOffset = $menu.data("end");
            populateKey(tag, type, bufferOffset);
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

    function setupInfScroll($preview) {
        var prevScrollPos = 0;
        var scrollTop;
        var scrollTimer;
        var $container;
        var isBox = false;

        if ($preview.hasClass("boxBody")) {
            $container = $preview;
            isBox = true;
        } else {
            $container = $parserCard;
        }

        $preview.scroll(function() {
            if (!isBox) {
                getScrollLineNum();
            }

            clearTimeout(scrollTimer);
            if (isMouseDown || isBoxMouseDown) {
                return;
            }

            // when scrolling stops, will check position and see if we need
            // to fetch rows
            scrollTimer = setTimeout(function() {
                if (!previewMeta) {
                    return;
                }
                var meta;
                if (isBox) {
                    meta = previewMeta.meta;
                } else {
                    meta = previewMeta;
                }

                checkIfScrolled($preview, meta);
            }, 300);

            if ($container.hasClass("fetchingRows")) {
                return;
            }
            scrollTop = $preview.scrollTop();
            if (scrollTop !== prevScrollPos) {
                if (scrollTop > prevScrollPos) {
                    checkIfNeedFetch($preview);
                } else if (scrollTop < prevScrollPos) {
                    checkIfNeedFetch($preview, true);
                }
                prevScrollPos = scrollTop;
            } else {
                // could be scrolling horizontally
                return;
            }
        });
    }

    // called on scroll to see if needs block appended or prepended
    function checkIfNeedFetch($preview, up) {
        if (!previewMeta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var meta;
        if ($preview.hasClass("boxBody")) {
            meta = previewMeta.meta;
        } else {
            meta = previewMeta;
        }

        var scrollTop = Math.max(0, $preview.scrollTop() -
                                    containerPadding);

        if (up) {
            var startPage = Math.floor(scrollTop / meta.pageHeight);
            if (startPage < meta.startPage) {
                fetchRows(meta, meta.lineLengths[startPage], up);
            }
        } else {
            var scrollBottom = scrollTop + $preview[0].offsetHeight;
            var endPage = Math.floor(scrollBottom / meta.pageHeight);
            if (endPage > meta.endPage) {
                fetchRows(meta, meta.lineLengths[endPage]);
            }
        }
    }

    // called after pressing mousedown on scrollbar, scrolling and releasing
    // also called at a timeout after a scrollevent to check if new content is
    // needed
    function checkIfScrolled($preview, meta) {
        if (!previewMeta || !previewMeta.meta) {
            return; // scroll may be triggered when refreshing with new data
        }
        var scrollTop = Math.max(0, $preview.scrollTop() - containerPadding);
        var topPage = Math.floor(scrollTop / meta.pageHeight);
        var botPage = Math.floor((scrollTop + $preview[0].offsetHeight) /
                                 meta.pageHeight);

        if (meta.startPage === topPage &&
            meta.endPage === botPage) {
            return;
        } else {
            var numPages = 1;
            if (topPage === botPage) {
                numPages = 1;
                if (meta.startPage === topPage || meta.endPage === topPage) {
                    // fetch not needed, needed page is already visible 
                    return;
                }
            } else {
                numPages = 2;
            }
            if (meta.meta) {
                previewContent(topPage, numPages, $preview.scrollTop());
            } else {
                showPreviewMode(topPage, numPages, $preview.scrollTop());
            }
        }
    }


    function previewContent(pageNum, numPages, scrollTop, noDetect) {
        var deferred = jQuery.Deferred();
        var newContent = (previewMeta == null);

        $parserCard.removeClass("error");
        if (newContent) {
            $parserCard.addClass("loading");
        } else {
            $parserCard.addClass("fetchingRows");
        }

        var url = curUrl;
        var promise = (newContent && !noDetect)
                      ? detectFormat(url)
                      : PromiseHelper.resolve();
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
                updateTotalNumLines();
                var prom = showPreviewMode(0, 1, 0);
                xcHelper.showRefreshIcon($miniPreview, false, prom);

                offset = 0;
            } else {
                offset = previewMeta.lineLengths[pageNum];
            }
            var numBytes = calculateNumBytes(pageNum, numPages, previewMeta);

            return XcalarPreview(previewMeta.parsedPath, null, false, numBytes,
                                 offset);
        })
        .then(function(res) {
            if (curFetchId !== fetchId) {
                return PromiseHelper.reject(notSameCardError);
            }
            if (!newContent) {
                previewMeta.startPage = pageNum;
                previewMeta.endPage = pageNum + numPages - 1;
            }

            showContent(res.buffer, numPages, $dataPreview, previewMeta,
                        scrollTop);
            $parserCard.removeClass("loading fetchingRows");

            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId === fetchId) {
                handleError(error);
            } else {
                $parserCard.removeClass("loading fetchingRows");
            }
            deferred.reject();
        });

        return deferred.promise();
    }


    function setPreviewMeta(meta, innerMeta) {
        if (!innerMeta) {
            previewMeta = meta;
        }

        var format = getFormat();
        var isText = (format === "PLAIN TEXT");
        meta.startPage = 0; // first visible page
        meta.endPage = 0; // last visible page
        meta.numPages = meta.lineLengths.length;
        meta.parsedPath = isText ? curUrl : parseNoProtocolPath(meta.tmpPath);
        meta.lineHeight = lineHeight;
        meta.pageHeight = lineHeight * linesPerPage;

        if (meta.meta && !isText) {
            setPreviewMeta(meta.meta, true);
            meta.meta.lineHeight = boxLineHeight;
            meta.meta.pageHeight = boxLineHeight * linesPerPage;
        }
    }

    // used for scrolling and appending or prepending 1 block
    function fetchRows(meta, newOffset, up) {
        var deferred = jQuery.Deferred();

        if (newOffset >= meta.numChar || newOffset < 0) {
            return PromiseHelper.resolve();
        }

        var curFetchId;
        if (meta.meta) {
            fetchId++;
            curFetchId = fetchId;
        } else {
            boxFetchId++;
            curFetchId = boxFetchId;
        }

        var numBytes;
        if (up) {
            numBytes = calculateNumBytes(meta.startPage - 1, 1, meta);
        } else {
            numBytes = calculateNumBytes(meta.endPage + 1, 1, meta);
        }

        if (meta.meta) {
            $parserCard.addClass("fetchingRows");
        } else {
            $miniPreview.addClass("fetchingRows");
        }

        XcalarPreview(meta.parsedPath, null, false, numBytes, newOffset)
        .then(function(res) {
            if (meta.meta) {
                if (curFetchId === fetchId) {
                    addContent(res.buffer, $dataPreview, meta, up);
                }
            } else {
                if (curFetchId === boxFetchId) {
                    addContent(res.buffer, $miniPreview, meta, up);
                }
            }
        })
        .fail(function() {
            if (curFetchId === fetchId) {
                if (meta.meta) {
                    $parserCard.removeClass("fetchingRows");
                } else {
                    $miniPreview.removeClass("fetchingRows");
                }
                // handleError or different error handler for scrolling errors
            }
        })
        .always(function() {
            deferred.resolve();
        });
        return deferred.promise();
    }

    function showPreviewMode(pageNum, numPages, scrollTop) {
        var deferred = jQuery.Deferred();
        var promise = deferred.promise();
        var format = getFormat();
        var $box = $("#previewModeBox");
        var $delimBox = $("#delimitersBox");

        if (!previewMeta || !previewMeta.meta) {
            console.error("error case");
            handlePreviewModeError(ErrTStr.Unknown);
            return PromiseHelper.reject(ErrTStr.Unknown);
        } else if (format === "PLAIN TEXT") {
            $box.addClass("xc-hidden");
            $delimBox.addClass("xc-hidden");
            return PromiseHelper.resolve();
        }

        $miniPreview.addClass("fetchingRows");
        $box.removeClass("error").removeClass("xc-hidden");
        $delimBox.removeClass("xc-hidden");

        var parsedPath = previewMeta.meta.parsedPath;
        boxFetchId++;
        var curFetchId = boxFetchId;

        var numBytes = calculateNumBytes(pageNum, numPages, previewMeta.meta);
        var newOffset = previewMeta.meta.lineLengths[pageNum];

        XcalarPreview(parsedPath, null, false, numBytes, newOffset)
        .then(function(res) {
            if (curFetchId === boxFetchId) {
                previewMeta.meta.startPage = pageNum;
                previewMeta.meta.endPage = pageNum + numPages - 1;
                showContent(res.buffer, numPages, $miniPreview,
                            previewMeta.meta, scrollTop);
                $miniPreview.removeClass("loading fetchingRows");
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (curFetchId === boxFetchId) {
                handlePreviewModeError(error);
            }
            deferred.reject(error);
        });
        return promise;
    }

    // after scroll, wipes content and replaces with new content
    function showContent(content, numPages, $preview, meta, scrollTop) {
        if (meta.meta) {
            buffers = [];
        }

        var $page;
        var firstContent = content;
        var secondContent = ""; // in case numPages === 2
        var $content = $preview.find(".content");
        $content.empty();

        if (numPages === 2) {
            var firstPageSize = calculateNumBytes(meta.startPage, 1, meta);
            firstContent = content.substr(0, firstPageSize);
            secondContent = content.substr(firstPageSize);
            if (meta.meta) {
                buffers = [firstContent, secondContent];
            }
        } else if (meta.meta) {
            buffers = [firstContent];
        }

        $page = $(getPageHtml(meta.startPage));

        var pretty = shouldPrettyPrint(meta);
        if (pretty) {
            var $splitContent = parseContent(firstContent);
            $page.append($splitContent);
        } else {
            $page.text(firstContent);
        }

        $content.append($page);

        if (secondContent.length) {
            $page = $(getPageHtml(meta.startPage + 1));
            if (pretty) {
                var $splitContent = parseContent(secondContent);
                $page.append($splitContent);
            } else {
                $page.text(secondContent);
            }
            $content.append($page);
        }

        adjustSizer($preview, meta);

        var padding;
        if (meta.startPage === 0) {
            padding = 0;
        } else {
            padding = containerPadding;
        }
        if (scrollTop != null) {
            $preview.scrollTop(scrollTop);
        } else {
            $preview.scrollTop(meta.startPage * meta.pageHeight + padding);
        }

        setScrollHeight($content, meta);
        if (meta.meta) {
            getScrollLineNum();
        }
    }

    function handlePreviewModeError(error) {
        var $box = $("#previewModeBox");
        $box.addClass("error");
        if (typeof error === "object") {
            error = JSON.stringify(error);
        }
        $box.find(".boxContent").text(error);
    }

    function beautifier(url) {
        var deferred = jQuery.Deferred();
        var path = url.split(/^.*:\/\//)[1];
        var format = getFormat().toLowerCase();
        if (format === "plain text") {
            format = "text";
        }

        var options = {
            "format": format,
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

    function updateTotalNumLines() {
        var inputWidth = 50;
        var numDigits = ("" + previewMeta.totalLines).length;
        inputWidth = Math.max(inputWidth, 20 + (numDigits * 9));

        $("#parserRowInput").outerWidth(inputWidth);
        var numLines = xcHelper.numToStr(previewMeta.totalLines);
        $parserCard.find(".totalRows").text("of " + numLines);
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

            var startNode = 0;
            var curLen = 0;
            var startIndex;
            var endIndex;
            var endNode;
            for (var i = 0; i < nodes.length; i++) {
                var len = nodes[i].length;
                if (curLen + len >= res.start) {
                    startNode = i;
                    startIndex = (res.start - curLen);
                    break;
                }
                curLen += len;
            }

            for (var i = startNode; i < nodes.length; i++) {
                var len = nodes[i].length;
                if (curLen + len >= res.end) {
                    endNode = i;
                    endIndex = (res.end - curLen);
                    break;
                }
                curLen += len;
            }

            range.setStart(nodes[startNode], startIndex);
            range.setEnd(nodes[endNode], endIndex);
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

    function populateKey(tag, type, bufferOffset) {
        var keyOffset = bufferOffset +
                        previewMeta.lineLengths[previewMeta.startPage];
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
                         ? getJSONPath(bufferOffset - 1)
                         : tag;
        keys.push({
            "key": tag,
            "type": type,
            "offset": keyOffset
        });
        addKeyItem(displayKey, type);
    }

    function getJSONPath(cursor) {
        var isChildOfArray = (getCharAt(cursor) === "[");
        var isFirstLevelChild = false;
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
                if (ch === "[" && bracketCnt === 0) {
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

            if (previewMeta.startPage === 0 && p === 0 &&
                ch === "[" && bracketCnt === 0)
            {
                isFirstLevelChild = true;
            } else {
                // find the first colon before [
                while (p >= 0 && getCharAt(p) !== ":") {
                    p--;
                }
            }
        }
        if (isFirstLevelChild) {
            jsonPath = "...[" + eleCnt + "]";
        } else if (getCharAt(p) !== ":") {
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
            $("#delimitersBox").mousedown(); // triggers bring to front
            xcHelper.scrollIntoView($li, $li.closest(".boxBody"));
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
        var charLen = 0;
        for (var i = 0; i < buffers.length; i++) {
            charLen += buffers[i].length;
        }
        return charLen;
    }

    function getCharAt(pos) {
        // XXX later may change the implementation
        var firstBuffLen = buffers[0].length;
        if (pos < firstBuffLen) {
            return buffers[0][pos];
        } else {
            return buffers[1][pos - firstBuffLen];
        }
    }

    function getSubStr(start, end) {
        var firstBuffLen = buffers[0].length;
        if (end < firstBuffLen) {
            return buffers[0].substring(start, end);
        } else if (start >= firstBuffLen) {
            return buffers[1].substring(start - firstBuffLen,
                                        end - firstBuffLen);
        } else {
            // between 2 buffers
            var part1 = buffers[0].substring(start);
            var part2 = buffers[1].substring(0, end - firstBuffLen);
            return part1 + part2;
        }
    }

    function calculateNumBytes(page, numPages, meta) {
        var lineLengths = meta.lineLengths;
        var numBytes  = 0;

        for (var i = 0; i < numPages; i++) {
            if (page + 1 >= lineLengths.length) {
                numBytes += (meta.numChar - lineLengths[page]);
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
            changeFormat($li);
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
            if (/{(.|[\r\n])+:(.|[\r\n])+}?,?/.test(str)) {
                return true;
            }
        }

        return false;
    }

    function submitForm() {
        if (!validateSubmit()) {
            return PromiseHelper.reject("invalid submit");
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
            DSPreview.backFromParser(curUrl, udfName);
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

    function setScrollHeight($content, meta) {
        var numRows = meta.totalLines;
        var scrollHeight = Math.max(meta.lineHeight * numRows,
                                    $content.height());
                                    // $previewContent.height() - 10);

        $content.parent().height(scrollHeight);
    }

    function getPageHtml(pageNum) {
        return '<span class="page page' + pageNum + '"></span>';
    }

    // called after scroll, appends or prepends and removes 1 block if needed
    function addContent(content, $preview, meta, up) {
        var pageNum;
        if (up) {
            meta.startPage--;
            pageNum = meta.startPage;
            if (meta.meta) {
                buffers.unshift(content);
            }
        } else {
            meta.endPage++;
            pageNum = meta.endPage;
            if (meta.meta) {
                buffers.push(content);
            }
        }
        var $content = $preview.find(".content");
        var scrollTop = $preview.scrollTop();
        var $page = $(getPageHtml(pageNum));
        var pretty = shouldPrettyPrint(meta);

        if (pretty) {
            var $splitContent = parseContent(content);
            $page.append($splitContent);
        } else {
            $page.text(content);
        }

        if (up) {
            $content.prepend($page);
        } else {
            $content.append($page);
        }

        if (meta.endPage - meta.startPage > 1) { // no more than 2 pages visible at a time
            if (up) {
                $content.find(".page").last().remove();
                meta.endPage--;
                if (meta.meta) {
                    buffers.pop();
                }
            } else {
                $content.find(".page").eq(0).remove();
                meta.startPage++;
                if (meta.meta) {
                    buffers.shift();
                }
            }
        }

        adjustSizer($preview, meta);
        $preview.scrollTop(scrollTop);
        if (meta.meta) {
            $parserCard.removeClass("fetchingRows");
        } else {
            $preview.removeClass("fetchingRows");
        }
    }

    function parseContent(content) {
        var html = "";
        var lines = content.split("\n");
        var $line;
        var $lines = $();
        var line;
        var ch;
        var specialChars = ["{", "}", "[", "]", ","];
        // ignore the last element because it's an empty string
        var linesLen = Math.min(linesPerPage, lines.length - 1);
        
        for (var i = 0; i < linesLen; i++) {
            line = lines[i];
            var inQuotes = false;
            var isEscaped = false;
            var html = "";
            var isObj = false;
            var valFound = false;
            var nonStrVal = false;
            var lineLen = line.length;
            for (var j = 0; j < lineLen; j++) {
                ch = line[j];
                if (isEscaped) {
                    html += ch;
                    isEscaped = false;
                    continue;
                }

                if (ch === "\\") {
                    isEscaped = true;
                    html += ch;
                } else if (ch === " ") {
                    html += ch;
                } else if (ch === '"') {
                    if (!inQuotes) {
                        inQuotes = true;
                        valFound = true;
                        if (isObj) {
                            html += ch + '<span class="quotes objValue">';
                        } else {
                            html += ch + '<span class="quotes">';
                        }
                    } else {
                        inQuotes = false;
                        html += '</span>' + ch;
                    } 
                } else {
                    if (inQuotes) {
                        html += ch;
                    } else {
                        if (ch === ":") {
                            isObj = true;
                            html += ch;
                        } else {
                            if (nonStrVal) {
                                if (ch === ",") {
                                    html += '</span>' + ch;
                                    nonStrVal = false;
                                } else if (j === lineLen - 1) {
                                    html += ch + '</span>';
                                } else {
                                    html += ch;
                                }
                            } else {
                                if (specialChars.indexOf(ch) === -1) {
                                    html += '<span class="other">';
                                    nonStrVal = true;
                                    valFound = true;
                                }
                                html += ch;
                            }               
                        }
                    }
                }
            }
            if (!isObj && valFound) {
                $line = $('<span class="line array"></span>');
            } else {
                $line = $('<span class="line"></span>');
            }
            
            $line.append(html + "\n");
            $lines = $lines.add($line);
        }
        return $lines;
    }

    function adjustSizer($preview, meta) {
        $preview.find(".sizer").height(meta.startPage * meta.pageHeight);
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
            "onCancel": function() { deferred.reject({"error": cancelError}); }
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

    function shouldPrettyPrint(meta) {
        var format = getFormat();
        if (meta && meta.meta && format === "JSON") {
            return true;
        } else {
            return false;
        }
    }

    /* Unit Test Only */
    if (window.unitTestMode) {
        DSParser.__testOnly__ = {};
        DSParser.__testOnly__.setBuffers = function(newBuffers) {
            buffers = newBuffers;
        };

        DSParser.__testOnly__.getBuffers = function() {
            return buffers;
        };

        DSParser.__testOnly__.setMeta = function(meta) {
            previewMeta = meta;
        };
        DSParser.__testOnly__.resetView = resetView;
        DSParser.__testOnly__.beautifier = beautifier;
        DSParser.__testOnly__.parseNoProtocolPath = parseNoProtocolPath;
        DSParser.__testOnly__.parseAppResHelper = parseAppResHelper;
        DSParser.__testOnly__.parseAppRes = parseAppRes;
        DSParser.__testOnly__.detectFormat = detectFormat;
        DSParser.__testOnly__.getFormat = getFormat;
        DSParser.__testOnly__.getRightSelection = getRightSelection;
        DSParser.__testOnly__.showPreviewMode = showPreviewMode;
        DSParser.__testOnly__.getJSONPath = getJSONPath;
        DSParser.__testOnly__.submitForm = submitForm;
        DSParser.__testOnly__.fetchRows = fetchRows;
        DSParser.__testOnly__.addContent = addContent;
    }
    /* End Of Unit Test Only */

    return (DSParser);
}(jQuery, {}));
