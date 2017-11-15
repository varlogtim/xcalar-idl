window.DagDraw = (function($, DagDraw) {
    // DagDraw handles the initial drawing of tables and lines during
    // construction and drawing of lines during a collapse/expand, and drawing
    // during a save image action

    // constants
    var dagTableHeight = 40;
    var smallTableWidth = 26;
    var dagTableOuterHeight = dagTableHeight + 30;
    var condenseLimit = 15; // number of tables wide before we allow condensing
    // colors needed for drawing and saving canvas
    var lineColor = '#848484';
    var tableTitleColor = "#555555";
    var titleBorderColor = '#A5A5A5';
    var tableFontColor = '#6E6E6E';
    var operationFontColor = '#4D4D4D';
    var strokeWidth = 2; // 2px. make sure this is an even number. Or you have
                         // to start your path on a 0.5px thingy

    /* options:
        wsId: string, worksheet for dag image to belong to (used for placement)
        position: integer, used to place dag image
        atStartup: boolean, if true, will append instead of positioning image
    */
    // options: {savable: boolean,
    //          refresH: boolean, used for tagging
    // }
    DagDraw.createDagImage = function(nodes, $container, options) {
        options = options || {};
        var hasError = false;
        var tree;
        var trees;
        var nodeIdMap = {};
        var dagDepth = 0;
        var dagImageHtml = "";
        var drawn = {};
        var lineageStruct;
        var sets = [];
        var yCoors = []; // stores list of depths of branch nodes
        // [0, 3, 5] corresponds to these xy coordinates: {0, 0}, {3, 1}, {5, 2}
        // where {0, 0} is the right-top corner of the image
        if (options.refresh) {
            tree = nodes.tree;
            trees = nodes.trees; // XXX need to implement
            nodeIdMap = nodes.nodeIdMap;
            sets = nodes.sets;
        } else {
            try {
                lineageStruct = DagFunction.construct(nodes, options.tableId);
                tree = lineageStruct.tree;
                trees = lineageStruct.trees;
                nodeIdMap = lineageStruct.nodeIdMap;
                sets = lineageStruct.sets;
            } catch (err) {
                console.error(err);
                hasError = true;
            }
        }

        var initialY = 0.2;
        var curY = initialY;
        var storedInfo = {
            x: 0,
            y: 0,
            height: initialY,
            width: 0,
            heightsDrawn: {0.2: true},
            condensedDepth: 0,
            groups: {},
            tagGroups: {},
            datasets: {},
            drawn: {}
        };

        if (!hasError) {
            var depth = 0;
            var tempDepth = 0;
            var condensedDepth = 0;
            for (var i = 0; i < sets.length; i++) {
                tempDepth = Math.max(tempDepth, getDagDepth(sets[i]));
            }
            var dagOptions = {condensed: tempDepth > condenseLimit};
            var isChildHidden = false; // is parent node in a collapsed state
            var group = [];
            var tagGroup = [];
            var condenseSeen = {};
            var exportsPositioned = {};
            var exportsDrawn = {};
            try {
                for (var i = 0; i < sets.length; i++) {
                    setNodePositions(sets[i], storedInfo, depth, condensedDepth,
                                isChildHidden, group, tagGroup, curY,
                                dagOptions);

                    if (!storedInfo.heightsDrawn[storedInfo.height]) {
                        storedInfo.height--;
                    }
                    yCoors.push(0);

                    // adjust positions of nodes so that descendents will never be to
                    // the left or parallel of their ancestors
                    adjustNodePositions(sets[i], storedInfo);

                    condenseHeight(sets[i], condenseSeen, yCoors, curY - initialY);
                    // get new dagDepth after repositioning
                    positionMultiExportNodes(trees, yCoors, sets,
                                             exportsPositioned, condenseSeen);


                    curY = yCoors.length + initialY;
                }

                for (var i = 0; i < sets.length; i++) {
                    dagImageHtml += drawDagNode(sets[i], storedInfo, drawn);
                    dagDepth = Math.max(dagDepth, getDagDepth(sets[i]));

                }
                dagImageHtml += drawMultiExportNodes(trees, storedInfo,
                                                          drawn, sets, exportsDrawn);

            } catch (err) {
                console.error(err);
                hasError = true;
            }
        }

        var height = yCoors.length * dagTableOuterHeight + 30;
        var width = storedInfo.condensedDepth * Dag.tableWidth - 150;

        if (hasError) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.DFDrawError +
                            '</div>';
            $container.addClass('invalid error');
        } else if (height > Dag.canvasLimit || width > Dag.canvasLimit ||
            (height * width > Dag.canvasAreaLimit)) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.TooLarge +
                            '</div>';
            $container.addClass('tooLarge error');
        } else {
            dagImageHtml = '<div class="dagImageWrap"><div class="dagImage" ' +
                        'style="height: ' + height + 'px;width: ' + width +
                        'px;">' + dagImageHtml + '</div></div>';
            if (trees.length > 1) {
                $container.addClass("multiExport");
            }
        }

        if (options.refresh) {
            $container.find(".dagImageWrap").remove();
        }

        $container.append(dagImageHtml);
        if ($container.find(".unexpectedNode").length) {
            $container.addClass("hasUnexpectedNode");
        }

        if (!$container.hasClass('error')) {
            var numNodes = Object.keys(nodeIdMap).length;
            drawAllLines($container, trees, numNodes, width);
        }

        var allDagInfo = {
            tree: tree,
            trees: trees,
            nodeIdMap: nodeIdMap,
            depth: dagDepth,
            groups: storedInfo.groups,
            tagGroups: storedInfo.tagGroups,
            condensedWidth: width,
            datasets: storedInfo.datasets,
            sets: sets
        };
        $container.data('allDagInfo', allDagInfo);
        postDagHtmlOperations($container, options.tableId);
    };

    function postDagHtmlOperations($dagWrap, tableId) {
        // add url to data attribute after dagwrap created so we don't expose
        // url in the html
        var datasets = $dagWrap.data("allDagInfo").datasets;
        for (var i in datasets) {
            var url = datasets[i].url;
            var nodeId = datasets[i].dagNodeId;
            var $icon = Dag.getTableIcon($dagWrap, nodeId);
            $icon.data("url", encodeURI(url));
        }
        if (tableId) {
            styleDroppedTables($dagWrap);
        }
    }

    function styleDroppedTables($dagWrap, tableId) {
        $dagWrap.find(".dagTable.Dropped").each(function() {
            var $dagTable = $(this);
            var tId = $dagTable.data("id");
            if (gDroppedTables[tId]) {
                $dagTable.addClass("hasMeta");
            } else {
                xcTooltip.add($dagTable.find(".dagTableIcon"), {
                    title: xcHelper.replaceMsg(TooltipTStr.DroppedTableNoInfo, {
                        tablename: $dagTable.data("tablename")
                    })
                });
            }
        });
    }

    // used for expanding / collapsing tagged group with "node" as header
    DagDraw.recreateDagImage = function($dagWrap, dagInfo, node) {
        var tree = dagInfo.tree;
        var trees = dagInfo.trees;
        var sets = dagInfo.sets;
        var initialY = 0.2;
        var curY = initialY;
        var yCoors = []; // stores list of depths of branch nodes
        var storedInfo = {
            x: 0,
            y: 0,
            height: initialY,
            depth: 0,
            heightsDrawn: {0.2: true},
            condensedDepth: 0,
            drawn: {},
            datasets: {}
        };
        var condenseSeen = {};
        var exportsSeen = {};
        var dagDepth = 0;
        for (var i = 0; i < sets.length; i++) {
            var isChildHidden = false;
            resetNodePositions(sets[i], storedInfo, 0, 0, 0,
                                    isChildHidden, curY);
            if (!storedInfo.heightsDrawn[storedInfo.height]) {
                storedInfo.height--;
            }
            yCoors.push(0);
            adjustNodePositions(sets[i], storedInfo);
            condenseHeight(sets[i], condenseSeen, yCoors, curY - initialY);
            positionMultiExportNodes(trees, yCoors, dagInfo.sets, exportsSeen, condenseSeen);
            curY = yCoors.length + initialY;
            dagDepth = Math.max(dagDepth, getDagDepth(sets[i]));
        }

        storedInfo.groups = dagInfo.groups;

        var width = storedInfo.depth * Dag.tableWidth - 150;
        var height = yCoors.length * dagTableOuterHeight + 30;
        repositionAllNodes($dagWrap, dagInfo.nodeIdMap, storedInfo);
        refreshNodeInfo($dagWrap, node, dagInfo);
        // another option is to redrawDagNodee
        // dagImageHtml += drawDagNode(tree, storedInfo, {});

        $dagWrap.find(".dagImage").css({
            height: height,
            width: width
        });
        if ($dagWrap.find(".unexpectedNode").length) {
            $dagWrap.addClass("hasUnexpectedNode");
        }

        $dagWrap.find(".canvas").remove();
        var numNodes = Object.keys(dagInfo.nodeIdMap).length;
        drawAllLines($dagWrap, dagInfo.trees, numNodes, width);

        dagInfo.depth = dagDepth;
        dagInfo.condensedWidth = storedInfo.condensedDepth * Dag.tableWidth -
                                 150;
        styleDroppedTables($dagWrap);
    };

    // used to replace dagImage with tagged version
    DagDraw.refreshDagImage = function(tableId, tagName, tables) {
        var $dagWrap = $("#dagWrap-" + tableId);
        var dagInfo = $dagWrap.data("allDagInfo");
        var nodeIdMap = dagInfo.nodeIdMap;
        var $dagTable;
        var node;
        var id;
        for (var i = 0; i < tables.length; i++) {
            $dagTable = $dagWrap.find(".dagTable[data-tablename='" +
                                          tables[i] + "']");
            if (!$dagTable.length) {
                continue;
            }
            id = $dagTable.data("index");
            node = nodeIdMap[id];
            if (node.value.tag) {
                node.value.tag += ",";
            }
            node.value.tag += tagName;
        }
        for (id in nodeIdMap) {
            node = nodeIdMap[id];
            node.value.display = {};
        }
        var options = {
            refresh: true
        };
        DagDraw.createDagImage(dagInfo, $dagWrap, options);
    };

    DagDraw.createSavableCanvas = function($dagWrap) {
        var deferred = jQuery.Deferred();
        var promises = [];
        var fullCanvas = true;
        var canvasClone = $dagWrap.find('canvas')[0];
        var canvas = createCanvas($dagWrap, fullCanvas);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone)
        .then(function() {

            var tableImage = new Image();
            var tableGrayImage = new Image();
            var tableICVImage = new Image();
            var dbImage = new Image();
            var expandImage = new Image();
            var eTableImage = new Image();
            tableImage.src = paths.dTable;
            eTableImage.src = paths.eTable;
            tableGrayImage.src = paths.dTableGray;
            tableICVImage.src = paths.dTableICV;
            dbImage.src = paths.dbDiamond;
            expandImage.src = paths.expandIcon;

            PromiseHelper.when.apply(window, [loadImage(tableImage),
                                    loadImage(tableGrayImage),
                                    loadImage(tableICVImage),
                                    loadImage(dbImage), loadImage(expandImage),
                                    loadImage(eTableImage)])
            .then(function() {
                $dagWrap.find('.dagTable').each(function() {
                    var $dagTable = $(this);
                    if (!$dagTable.parent().hasClass('hidden') &&
                        !$dagTable.parent().hasClass("tagHidden")) {
                        var top = Math.floor($dagTable.parent().position().top);
                        var left = Math.floor($dagTable.parent().position().left +
                                          $dagTable.position().left);
                        drawDagTableToCanvas($dagTable, ctx, top, left,
                                             tableImage, tableGrayImage,
                                             tableICVImage,
                                             dbImage, eTableImage);
                    }
                });

                $dagWrap.find('.actionType').each(function() {
                    var $actionType = $(this);
                    if (!$actionType.parent().hasClass('hidden') &&
                        !$actionType.parent().hasClass("tagHidden")) {
                        var top = Math.floor($actionType.parent().position().top) + 4;
                        var left = Math.floor($actionType.parent().position().left);
                        promises.push(drawDagActionTypeToCanvas(
                                            $actionType, ctx, top, left));
                    }
                });

                $dagWrap.find('.expandWrap:not(.expanded)').each(function() {
                    var $expandIcon = $(this);
                    var top = Math.floor($expandIcon.position().top);
                    var left = Math.floor($expandIcon.position().left);
                    drawExpandIconToCanvas(ctx, top, left, expandImage);
                });

                PromiseHelper.when.apply(window, promises)
                .then(function() {
                    $dagWrap.find('.tagHeader.collapsed').each(function() {
                        var $wrap = $(this).parent();
                        var top = Math.floor($wrap.position().top) + 50;
                        var left = Math.floor($wrap.position().left) + 148;
                        ctx.drawImage(expandImage, left, top, 12, 12);
                    });
                    $(canvas).hide();
                    deferred.resolve();
                })
                .fail(function() {
                    deferred.reject("Image loading error");
                });
            });
        });

        return (deferred.promise());
    };

    DagDraw.updateCanvasAfterWidthChange = function($dagWrap, roots, newWidth, all) {
        var $dagImage = $dagWrap.find('.dagImage');
        $dagWrap.find('canvas').eq(0).remove();
        xcTooltip.hideAll();

        var canvas = createCanvas($dagWrap);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        var drawn = {};

        for (var i = 0; i < roots.length; i++) {
            traverseAndDrawLines($dagImage, ctx, roots[i], newWidth, drawn,
                                 all);
        }

        ctx.stroke();
        DagPanel.adjustScrollBarPositionAndSize();
    };

    function loadImage(img) {
        var deferred = jQuery.Deferred();
        img.onload = function() {
            deferred.resolve();
        };
        img.onerror = img.onload;
        return (deferred.promise());
    }

    function getDagDepth(node) {
        var maxDepth = 0;
        getDepthHelper(node, 0);

        function getDepthHelper(node, depth) {
            if (!node.value.display.isHiddenTag) {
                depth++;
            }

            maxDepth = Math.max(maxDepth, depth);
            for (var i = 0; i < node.parents.length; i++) {
                getDepthHelper(node.parents[i], depth);
            }
        }

        return (maxDepth);
    }

    // gets the depth of a branch after the initial positioning
    function getDagDepthPostPositioning(node, seen) {
        var origNode = node;
        var maxDepth = 0;
        var depth;
        getDepthHelper(node, 0);

        function getDepthHelper(node) {
            // this parent has already been seen but may be a lot further left
            // than its children so we take it's depth - 1 and subtract the
            // diff between the orig node's depth
            if (seen[node.value.dagNodeId]) {
                depth = node.value.display.depth - 1 -
                        (origNode.value.display.depth - 1);
                maxDepth = Math.max(maxDepth, depth);
                return;
            }

            for (var i = 0; i < node.parents.length; i++) {
                getDepthHelper(node.parents[i]);
            }

            // leaf node so we us the full expanded depth as the depth
            if (!node.parents.length) {
                depth = node.value.display.expandedDepth -
                        (origNode.value.display.expandedDepth - 1);
                maxDepth = Math.max(maxDepth, depth);
            }
        }

        return (maxDepth);
    }

    function drawSavableCanvasBackground(canvas, ctx, $dagWrap, canvasClone) {
        var deferred = jQuery.Deferred();
        var img = new Image();
        img.src = paths.dagBackground;
        img.onload = function() {
            var ptrn = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasClone, -10, 50);
            ctx.save();
            var tableTitleText = $dagWrap.find('.tableTitleArea')
                                         .text();
            ctx.font = '600 15px Open Sans';
            ctx.fillStyle = tableTitleColor;
            ctx.fillText(tableTitleText, 30, 22);
            ctx.restore();

            ctx.beginPath();
            ctx.moveTo(20, 33);
            ctx.lineTo(canvas.width - 40, 33);
            ctx.strokeStyle = titleBorderColor;
            ctx.stroke();
            deferred.resolve();
        };

        img.onerror = img.onload;

        return (deferred.promise());
    }

    function drawDagTableToCanvas($dagTable, ctx, top, left, tImage, tGrayImage,
                                  tICVImage, dImage, eImage) {
        left += 35;
        top += 50;
        var iconLeft = left;
        var iconTop = top + 6;
        var maxWidth = 200;
        var tableImage;
        var x;

        if ($dagTable.hasClass('dataStore')) {
            tableImage = dImage;
            iconLeft -= 6;
            iconTop -= 4;
            maxWidth = 120;
            x = left - 42;
        } else {
            if ($dagTable.find(".icv").length) {
                tableImage = tICVImage;
            } else if (gShowDroppedTablesImage && $dagTable.hasClass('Dropped')) {
                tableImage = tGrayImage;
            } else if ($dagTable.hasClass("export") &&
                $dagTable.attr("data-advancedopts") === "default") {
                tableImage = eImage;
            } else {
                tableImage = tImage;
            }
            x = left - 89;
        }

        ctx.drawImage(tableImage, iconLeft, iconTop);

        var lineHeight = 12;

        var y = top + 38;
        var text = $dagTable.find('.tableTitle:visible').text();

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, maxWidth, 26);
        ctx.clip();
        ctx.font = 'bold 10px Open Sans';
        ctx.fillStyle = tableFontColor;
        ctx.textAlign = 'center';

        wrapText(ctx, text, x + (maxWidth / 2), y + 10, maxWidth, lineHeight);
    }

    function drawDagActionTypeToCanvas($actionType, ctx, top, left) {
        var deferred = jQuery.Deferred();
        left += 35;
        top += 50;
        var $dagIcon = $actionType.find('.dagIcon');
        var iconSource = $dagIcon.find('.icon').attr('class');
        var iconSourceSplit = iconSource.split(" ");
        var iconFound = false;

        for (var i = 0; i < iconSourceSplit.length; i++) {
            if (iconSourceSplit[i].indexOf('xi-') === 0 ||
                iconSourceSplit[i].indexOf('xi_') === 0) {
                iconSource = iconSourceSplit[i] + ".png";
                iconFound = true;
                break;
            }
        }

        if (!iconFound) {
            iconSource = "xi-unknown.png";
        }

        iconSource = paths.dfIcons + iconSource;

        var rectImage = new Image();
        rectImage.src = paths.roundedRect;

        rectImage.onload = function() {
            ctx.drawImage(rectImage, left + 20, top);

            if (iconSource !== "none") {
                var dagIcon = new Image();
                var iconLeft = left + 23;
                var iconTop = top + 7;
                dagIcon.src = iconSource;

                dagIcon.onload = function() {
                    ctx.drawImage(dagIcon, iconLeft, iconTop);
                    deferred.resolve();
                };
                dagIcon.onerror = function() {
                    var otherIcon = new Image();
                    otherIcon.src = paths.dfIcons + "xi-unknown.png";

                    otherIcon.onload = function() {
                        console.log('backup image used');
                        ctx.drawImage(otherIcon, iconLeft, iconTop);
                        deferred.resolve();
                    };
                    otherIcon.onerror = function() {
                        deferred.resolve();
                    };
                };
            }

            // first line text
            var maxWidth = 78;
            var lineHeight = 10;
            var x = left + 43;
            var y = top + 9;
            var text = $actionType.find('.typeTitle').text();
            text = text[0].toUpperCase() + text.slice(1);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 10);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);

            // text regarding table origin / parents
            y = top + 19;
            text = $actionType.find('.opInfoText').text();
            ctx.save();
            ctx.beginPath();
            ctx.rect(x - 3, y - 6, 76, 20);
            ctx.clip();
            ctx.font = 'bold 8px Open Sans';
            ctx.fillStyle = operationFontColor;

            wrapText(ctx, text, x, y, maxWidth, lineHeight);
            if (iconSource === "none") {
                deferred.resolve();
            }
        };

        rectImage.onerror = rectImage.onload;
        return (deferred.promise());
    }

    function drawExpandIconToCanvas(ctx, top, left, img) {
        ctx.drawImage(img, left + 35, top + 53);
        ctx.beginPath();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        var words = text.split(/-| |\./);
        var line = '';
        var minLen = 20; // minimum text length needed for overflow;

        if (words.length === 1) {
            if (ctx.measureText(words[0]).width > maxWidth) {
                var textLen = xcHelper.getMaxTextLen(ctx, text, maxWidth - 7,
                                                     minLen, text.length);
                line = text.slice(0, textLen) + "...";
            } else {
                line = text;
            }
        } else {
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    ctx.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                } else {
                    line = testLine;
                }
            }
        }

        ctx.fillText(line, x, y);
        ctx.restore();
    }

    function getSourceColNames(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1) {
                        names.push(args[i]);
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    function getTags(node) {
        if (!node.value.tag) {
            return [];
        }
        return node.value.tag.split(",");
    }

    // returns tagName if one of tags id matches tableName's id
    function checkIsTagHeader(tags, tableName) {
        var tableId = xcHelper.getTableId(tableName);
        for (var i = 0; i < tags.length; i++) {
            var tagId = xcHelper.getTableId(tags[i]);
            if (tagId && tagId === tableId) {
                return tags[i];
            }
        }
        return null;
    }

    // if  node has multiple children and one of the children doesn't have a tag
    // that matches that node, that node will not be hidden tag
    function checkIsNodeHiddenTag(tags, node) {
        var isHiddenTag;
        if (!node.parents.length) {
            isHiddenTag = false;
        } else {
            var numChildren = node.children.length;
            if (numChildren === 1) {
                isHiddenTag = true;
            } else {
                isHiddenTag = true;
                for (var i = 0; i < numChildren; i++) {
                    var child = node.children[i];
                    if (child.value.api === XcalarApisT.XcalarApiExport) {
                        continue;
                    }
                    var childTags = getTags(child);
                    var matchFound = false;
                    for (var j = 0; j < childTags.length; j++) {
                        if (tags.indexOf(childTags[j]) > -1) {
                            matchFound = true;
                            break;
                        }
                    }
                    if (!matchFound) {
                        isHiddenTag = false;
                        break;
                    }
                }
            }
        }

        return isHiddenTag;
    }

    function getOpFromTag(tag) {
        return tag.split("#")[0];
    }

    function nodeShouldBeCondensed(node) {
        return (!node.value.display.isHiddenTag &&
            node.parents.length === 1 && node.children.length === 1 &&
            node.parents[0].children.length === 1 &&
            !node.children[0].value.display.isHiddenTag &&
            node.children[0].parents.length === 1);
    }

    function saveTagGroup(currTag, tagGroup, storedInfo) {
        var groupId = xcHelper.getTableId(currTag);
        var groupCopy = [];
        for (var i = 0; i < tagGroup.length; i++) {
            groupCopy.push(tagGroup[i]);
        }

        storedInfo.tagGroups[groupId] = {
            "collapsed": true,
            "group": groupCopy
        };
    }

    function saveCondensedGroup(node, group, storedInfo) {
        // furthest to the right of all the hidden tables in its group
        node.value.display.hiddenLeader = true;
        node.value.display.x += (Dag.condenseOffset * Dag.tableWidth);
        var groupId = node.children[0].value.dagNodeId;
        var groupCopy = [];
        var numHiddenTags = 0;
        for (var i = 0; i < group.length; i++) {
            groupCopy.push(group[i]);
            if (group[i].value.display.isHiddenTag) {
                numHiddenTags++;
            }
        }
        storedInfo.groups[groupId] = {
            "collapsed": true,
            "group": groupCopy,
            numHiddenTags: numHiddenTags
        };
        group.length = 0; // empty out group array
    }

    function setTagGroup(tagName, node, storedInfo) {
        var group = [];
        var seen = {};
        addToGroup(node);

        function addToGroup(node) {
            for (var i = 0; i < node.parents.length; i++) {
                var parentNode = node.parents[i];
                var tags = getTags(parentNode);
                if (!seen[parentNode.value.dagNodeId] &&
                    tags.indexOf(tagName) > -1) {
                    var isHiddenTag = checkIsNodeHiddenTag(tags, parentNode);
                    parentNode.value.display.isHiddenTag = isHiddenTag;
                    if (isHiddenTag) {
                        group.push(parentNode.value.dagNodeId);
                        seen[parentNode.value.dagNodeId] = true;
                        parentNode.value.display.isInTagGroup = true;
                        addToGroup(parentNode);
                    }
                }
            }
        }
        node.value.display.tagHeader = true;
        node.value.display.tagCollapsed = true;
        if (group.length) {
            node.value.display.hasTagGroup = true;
            saveTagGroup(tagName, group, storedInfo);
        }
    }

    // calculates position of nodes and if they're hidden
    function setNodePositions(node, storedInfo, depth, condensedDepth,
                             isChildHidden, group, tagGroup, yCoor, options) {
        var numParents = node.parents.length;
        var newCondensedDepth = condensedDepth;
        var tags = getTags(node);
        var tagHeader = checkIsTagHeader(tags, node.value.name);
        node.value.tags = tags;
        node.value.display.isChildHidden = isChildHidden;
        if (tagHeader) {
            setTagGroup(tagHeader, node, storedInfo);
        }

        // do not hide if child is hidden
        if (options.condensed && nodeShouldBeCondensed(node)) {
            node.value.display.isHidden = true;
            node.value.display.isCollapsible = true;

            // first node in a group of hidden nodes
            if (!isChildHidden) {
                newCondensedDepth += Dag.condenseOffset;
                for (var i = 0; i < node.children.length; i++) {
                    node.children[i].value.display.isParentHidden = true;
                }
            }
        } else if (!node.value.display.isHiddenTag) {
            newCondensedDepth++;
            node.value.display.isHidden = false;
        } //  if hiddenTag, do not increase depth

        var newDepth = depth;
        if (!node.value.display.isHiddenTag) {
            newDepth++;
            storedInfo.heightsDrawn[yCoor] = true;
        }

        storedInfo.condensedDepth = Math.max(storedInfo.condensedDepth,
                                             newCondensedDepth);

        // recursive call of setNodePosition on node's parents
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];
            if (!storedInfo.drawn[parentNode.value.dagNodeId]) {
                if (i > 0 && storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height++;
                }
                setNodePositions(parentNode, storedInfo, newDepth,
                               newCondensedDepth, node.value.display.isCollapsible,
                               group, tagGroup, storedInfo.height, options);
            }
        }

        storedInfo.drawn[node.value.dagNodeId] = true;


        node.value.display.x = Math.round(condensedDepth * Dag.tableWidth);
        node.value.display.y = Math.round(yCoor * dagTableOuterHeight);
        node.value.display.depth = condensedDepth;
        node.value.display.expandedDepth = depth;
        node.value.display.condensedDepth = condensedDepth;

        if (node.value.display.isHidden) {
            group.push(node); // push hidden node into group
            if (!isChildHidden) {
                saveCondensedGroup(node, group, storedInfo);
            }
        }
    }

    function resetNodePositions(node, storedInfo, expandedDepth, condensedDepth,
                             currDepth, isChildHidden, yCoor) {
        var numParents = node.parents.length;
        storedInfo.drawn[node.value.dagNodeId] = true;
        node.value.display.x = Math.round(currDepth * Dag.tableWidth);
        node.value.display.y = Math.round(yCoor * dagTableOuterHeight);
        node.value.display.depth = currDepth;
        node.value.display.expandedDepth = expandedDepth;
        node.value.display.condensedDepth = condensedDepth;

        if (node.value.display.isHidden) {
            if (!isChildHidden) {
                node.value.display.x += (Dag.condenseOffset * Dag.tableWidth);
                condensedDepth += Dag.condenseOffset;
                currDepth += Dag.condenseOffset;
            }
        } else if (!node.value.display.isHiddenTag) {
            if (node.value.display.isCollapsible) {
                if (!isChildHidden) {
                    condensedDepth += Dag.condenseOffset;
                }
            } else {
                condensedDepth++;
            }
            currDepth++;
        }//  if hiddenTag, do not increase depth

        if (!node.value.display.isHiddenTag) {
            expandedDepth++;
            storedInfo.heightsDrawn[yCoor] = true;
        }

        storedInfo.condensedDepth = Math.max(storedInfo.condensedDepth,
                                             condensedDepth);
        storedInfo.depth = Math.max(storedInfo.depth, currDepth);

        // recursive call of setNodePosition on node's parents
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];
            if (!storedInfo.drawn[parentNode.value.dagNodeId]) {
                if (i > 0 && storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height++;
                }
                resetNodePositions(parentNode, storedInfo, expandedDepth,
                               condensedDepth, currDepth,
                                node.value.display.isCollapsible,
                                storedInfo.height);
            }
        }
    }

    // XXX can optimize this function
    // adjust positions of nodes so that descendents will never be to the left
    // of their ancestors
    function adjustNodePositions(node, storedInfo) {
        var parents = node.getVisibleParents();
        for (var i = 0; i < parents.length; i++) {
            var parent = parents[i];
            if (!node.value.display.isHidden &&
                !node.value.display.isHiddenTag) {
                if (node.value.display.depth > parent.value.display.depth - 1) {
                    var diff = node.value.display.depth -
                               parent.value.display.depth;
                    var condDiff = node.value.display.condensedDepth -
                                    parent.value.display.condensedDepth;
                    var expandDiff = node.value.display.expandedDepth -
                                     parent.value.display.expandedDepth;
                    var seen = {};
                    adjustNodePositionsHelper(parent, diff + 1,
                                              expandDiff + 1, condDiff + 1,
                                              storedInfo, seen);


                } else if (node.value.display.expandedDepth >
                    parent.value.display.expandedDepth - 1) {
                    var expandDiff = node.value.display.expandedDepth -
                                     parent.value.display.expandedDepth;
                    var seen = {};
                    adjustNodePositionsHelper(parent, 0,
                                              expandDiff + 1, 0,
                                              storedInfo, seen);
                }
            }
            adjustNodePositions(parent, storedInfo);
        }
    }


    function adjustNodePositionsHelper(node, amount, expandAmount, condAmount,
                                        storedInfo, seen) {

        if (seen[node.value.dagNodeId]) {
            return;
        }
        seen[node.value.dagNodeId] = true;
        node.value.display.condensedDepth += condAmount;
        node.value.display.depth += amount;
        node.value.display.expandedDepth += expandAmount;
        node.value.display.x += (amount * Dag.tableWidth);

        storedInfo.condensedDepth = Math.max(storedInfo.condensedDepth,
                                        node.value.display.condensedDepth + 1);
        storedInfo.depth = Math.max(storedInfo.depth,
                                    node.value.display.depth + 1);

        // we calculate the amount of shifting needed for the depth,
        // expandedDepth, and condensedDepth values
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            var newAmount = amount;
            var newExpandAmount = expandAmount;
            var newCondAmount = condAmount;

            if (parentNode.value.display.depth >= node.value.display.depth +
                                                 newAmount) {
                // no need to shift if parentnode already positioned enough
                // to the left
                newAmount = 0;
            } else if (parentNode.value.display.depth + newAmount >
                                            node.value.display.depth + 1) {
                // decrease amount of shift if shift would result in extra
                // space
                newAmount = (node.value.display.depth + 1) -
                            parentNode.value.display.depth;
            }

            if (parentNode.value.display.condensedDepth >=
                        node.value.display.condensedDepth + newCondAmount) {
                newCondAmount = 0;
            } else if (parentNode.value.display.condensedDepth +
                    newCondAmount > node.value.display.condensedDepth + 1) {
                newCondAmount = (node.value.display.condensedDepth + 1) -
                                parentNode.value.display.condensedDepth;
            }

            if (parentNode.value.display.expandedDepth >=
                node.value.display.expandedDepth + newExpandAmount) {
                newExpandAmount = 0;
            } else if (parentNode.value.display.expandedDepth +
                    newExpandAmount > node.value.display.expandedDepth + 1) {
                newExpandAmount = (node.value.display.expandedDepth + 1) -
                                  parentNode.value.display.expandedDepth;
            }

            if (newAmount > 0.1 || newCondAmount > 0.1 ||
                newExpandAmount > 0.1) {
                newAmount = Math.max(0, newAmount);
                newExpandAmount = Math.max(0, newExpandAmount);
                newCondAmount = Math.max(0, newCondAmount);
                adjustNodePositionsHelper(node.parents[i], newAmount,
                                        newExpandAmount,
                                      newCondAmount, storedInfo, seen);
            }
        }
    }

    // this function allows separate branches to share the same y coor as long
    // as none of the nodes overlap. We check to see if the left side of a
    // branch overlaps with the right side of an existing branch
    // "coors" stores list of depths of branch nodes
    // [0, 3, 5] corresponds to these x,y coordinates: {0, 0}, {3, 1}, {5, 2}
    // where {0, 0} is the right-top corner of the image
    function condenseHeight(node, seen, coors, YCoor, searching) {
        seen[node.value.dagNodeId] = true;
        node.value.display.y = Math.round((YCoor + 0.2) * dagTableOuterHeight);
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            var nextYCoor = YCoor + i;
            if (seen[parentNode.value.dagNodeId]) {
                continue;
            }

            if (parentNode.value.display.isHiddenTag) {
                nextYCoor = YCoor;
                if (i > 0) {
                    searching = true;
                }
            } else if (i > 0 || searching) {
                searching = false;
                var branchDepth = getDagDepthPostPositioning(parentNode, seen);
                var leafDepth = branchDepth + node.value.display.depth;
                for (var j = coors.length - 1; j >= 0; j--) {
                    if (leafDepth >= coors[j]) {
                        nextYCoor = j + 1;
                        break;
                    }
                }
                var depth = node.value.display.depth;
                for (var j = 0; j < parentNode.children.length; j++) {
                    if (parentNode.children[j].value.display.depth <= depth) {
                        depth = parentNode.children[j].value.display.depth;
                        if (!node.value.display.isHiddenTag) {
                            depth++;
                        }
                    }
                }

                coors[nextYCoor] = depth;
            }
            condenseHeight(parentNode, seen, coors, nextYCoor, searching);
        }
    }

    function refreshNodeInfo($dagWrap, node, generalInfo) {
        var $operation = $dagWrap.find('.actionType[data-id="' +
                                            node.value.dagNodeId + '"]');
        var key = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        var info = getDagNodeInfo(node, key);
        var operation = info.operation;

        if (info.type === "sort") {
            operation = "sort";
        } else if (info.type === "createTable") {
            operation = "Create Table";
        }
        var classes = "actionType dropdownBox tagHeader " + info.opType;
        var tagIconTip;
        var tagId = xcHelper.getTableId(node.value.tag);
        var tagName = getOpFromTag(node.value.tag);
        var tagGroup = generalInfo.tagGroups[tagId].group;
        var numInGroup = tagGroup.length + 1; // include self + 1
        if (node.value.display.tagCollapsed) {
            classes += " collapsed ";
            tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTables,
                            {number: numInGroup,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
        } else {
            classes += " expanded ";
            tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTables,
                            {number: numInGroup,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
        }

        $operation.attr("class", classes);
        $operation.data("type", operation);
        $operation.data("info", info.text);
        xcTooltip.changeText($operation.find(".actionTypeWrap"),
                             info.tooltip, true);
        xcTooltip.changeText($operation.find(".groupTagIcon"), tagIconTip, true);
        $operation.find(".dagIcon").html(getIconHtml(info.opType, info));
        $operation.find(".typeTitle").text(operation);
        $operation.find(".opInfoText").text(info.opText);
    }

    function repositionAllNodes($dagWrap, nodeIdMap, storedInfo) {
        $dagWrap.find(".dagTableWrap").each(function() {
            var $tableWrap = $(this);
            var nodeId = $tableWrap.find(".dagTable").data("index");
            var node = nodeIdMap[nodeId];
            $tableWrap.css({
                "right": node.value.display.x,
                "top": node.value.display.y
            });
            if (node.value.display.isCollapsible &&
                !node.value.display.isChildHidden) {
                var groupId = node.children[0].value.dagNodeId;
                var $expandIcon = $dagWrap.find('.expandWrap[data-index="' +
                                                groupId + '"]');

                var top = node.value.display.y;
                var right;
                var outlineOffset;

                if (!node.value.display.isHidden) {
                    var group = storedInfo.groups[groupId].group;
                    right = group[0].value.display.x + 190;
                    outlineOffset = (right + 15) - (group.length *
                                                    Dag.tableWidth + 11);
                } else {
                    outlineOffset = right - Dag.groupOutlineOffset;
                    right = node.value.display.x - (Dag.condenseOffset *
                                                    Dag.tableWidth);
                }
                $expandIcon.css({
                    top: top + 5,
                    right: right
                });
                $expandIcon.next().css({
                    top: top,
                    right: outlineOffset
                });
            }
        });
    }

    function drawDagNode(node, storedInfo, drawn) {
        var html = "";
        html += drawDagTable(node, node.value.display.isChildHidden, storedInfo,
                                node.value.display.y, node.value.display.x);
        drawn[node.value.dagNodeId] = true;
        if (node.value.display.isCollapsible && !node.value.display.isChildHidden) {
            var groupId = node.children[0].value.dagNodeId;
            var group = storedInfo.groups[groupId];
            var numHidden = group.numHiddenTags;
            group = group.group;
            var right = node.value.display.x - (Dag.condenseOffset * Dag.tableWidth);
            html += getCollapsedHtml(group, node.value.display.y, right,
                                        node.value.display.condensedDepth,
                                         groupId, numHidden,
                                         node.value.display.isHidden);
        }

        for (var i = 0; i < node.parents.length; i++) {
            var parent = node.parents[i];
            if (!drawn[parent.value.dagNodeId]) {
                html += drawDagNode(parent, storedInfo, drawn);
            }
        }

        return html;
    }

    function drawDagTable(node, isChildHidden, storedInfo, top, right) {
        var key = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        var dagInfo = getDagNodeInfo(node, key);
        var tableName = node.value.name;
        var html = "";
        var outerClasses = "";
        var tableClasses = "";
        var iconClasses = "";
        var icon = "xi-table-2";
        var dataAttrs = "";
        var titleClasses = "";
        var tableTitle = "";
        var tableTitleTip = "";
        var extraIcon = "";
        var extraTitle = "";
        var tooltipTxt = "";

        if (node.value.display.isHidden) {
            outerClasses += "hidden ";
        }
        if (node.value.display.isHiddenTag) {
            outerClasses += "tagHidden tagged ";
        }

        var dagOpHtml = getDagOperationHtml(node, dagInfo, storedInfo);
        html += '<div class="dagTableWrap clearfix ' + outerClasses + '" ' +
                        'style="top:' + top + 'px;' +
                        'right: ' + right + 'px;">' +
                        dagOpHtml;

        if (dagInfo.state === DgDagStateTStr[DgDagStateT.DgDagStateDropped]) {
            tooltipTxt = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                        {"tablename": tableName});
        } else {
            tooltipTxt = CommonTxtTstr.ClickToOpts;
        }
        tableClasses += dagInfo.state + " ";

        // check for datastes
        if (dagOpHtml === "") {
            var pattern = "";
            var tId = node.value.dagNodeId;
            var originalTableName = tableName;
            var dsText = "";
            var dsPrefixIndex = tableName.indexOf(gDSPrefix);
            if (dsPrefixIndex > -1) {
                tableName = tableName.substr(dsPrefixIndex + gDSPrefix.length);
            }
            if (node.value.api === XcalarApisT.XcalarApiExecuteRetina) {
                tableClasses += "retina ";
                tId = xcHelper.getTableId(tableName);
            } else if (node.value.api === XcalarApisT.XcalarApiBulkLoad) {
                dsText = "Dataset ";
                icon = 'xi_data';
                storedInfo.datasets[tableName] = dagInfo;
                dagInfo.dagNodeId = node.value.dagNodeId;
                pattern = dagInfo.loadInfo.fileNamePattern;
            } else {
                console.error("unexpected node", "api: " + node.value.api);
                tableClasses += "unexpectedNode ";
                tId = xcHelper.getTableId(tableName);
            }
            tableClasses += "dataStore ";
            iconClasses += "dataStoreIcon ";
            dataAttrs += 'data-table="' + originalTableName + '" ' +
                        'data-type="dataStore" ' +
                        'data-id="' + tId + '" ' +
                        'data-pattern="' + encodeURI(pattern) + '"';
            tableTitle = dsText + tableName;
            tableTitleTip = tableName;
        } else {
            if (node.value.struct.icv) {
                iconClasses += "icv ";
                icon = "xi-table-error2";
            }
            tableClasses += "typeTable ";
            iconClasses += "dagTableIcon ";
            var tableId = xcHelper.getTableId(tableName);
            dataAttrs += 'data-id="' + tableId + '"';
            titleClasses += "exportFileName ";

            if (node.value.api === XcalarApisT.XcalarApiExport) {
                tableClasses += "export ";
                extraIcon = '<i class="icon xi-data-out"></i>';
                tableTitle = xcHelper.stripCSVExt(tableName);
                tableTitleTip = tableTitle;
                extraTitle = '<span class="tableTitle exportTableName" ' +
                                'data-toggle="tooltip" ' +
                                'data-placement="bottom" ' +
                                'data-container="body" ' +
                                'title="' + tableTitleTip + '">' +
                                tableTitle +
                                '</span>';
            } else {
                tableTitle = tableName;
                tableTitleTip = tableTitle;
            }
        }

        html += '<div class="dagTable ' + tableClasses + '" ' +
                    'data-tablename="' + tableName + '" ' +
                    'data-index="' + node.value.dagNodeId + '" ' +
                    'data-nodeid="' + node.value.dagNodeId + '" ' +
                    dataAttrs + '>' +
                        '<div class="' + iconClasses + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + tooltipTxt + '"' +
                        '></div>' +
                        extraIcon +
                        '<i class="icon ' + icon + '"></i>' +
                        '<span class="tableTitle ' + titleClasses + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'data-original-title="' + tableTitleTip + '">' +
                            tableTitle +
                        '</span>' +
                        extraTitle +
                    '</div>';
        html += '</div>';

        return (html);
    }

    function getDagOperationHtml(node, info, generalInfo) {
        var originHTML = "";
        var numParents = node.value.numParents;
        if (!numParents) {
            return originHTML;
        }

        var opText = info.opText;
        var operation = info.operation;
        var classes = "";
        var dataAttr = "";
        var groupTagIcon = "";

        var resultTableName = node.value.name;
        if (info.type === "sort") {
            operation = "sort";
        } else if (info.type === "createTable") {
            operation = "Create Table";
        }
        if (node.value.display.hasTagGroup) {
            classes += " tagHeader ";
            var tagIconTip;
            var tagId = xcHelper.getTableId(node.value.tag);
            var tagName = getOpFromTag(node.value.tag);
            var tagGroup = generalInfo.tagGroups[tagId].group;
            var numInGroup = tagGroup.length + 1; // include self + 1
            if (node.value.display.tagCollapsed) {
                classes += " collapsed ";
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTables,
                            {number: numInGroup,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
            } else {
                classes += " expanded ";
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTables,
                            {number: numInGroup,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
            }
            dataAttr += " data-tag='" + node.value.tags[0] + "' ";
            groupTagIcon += '<i data-tagid="' + tagId + '" ' +
                            'data-toggle="tooltip" data-placement="top" ' +
                            'data-container="body" data-original-title="' +
                            tagIconTip + '" ' +
                            'class="icon xi-ellipsis-h-circle groupTagIcon">' +
                            '</i>';
        }

        classes += " " + info.opType + " ";

        originHTML += '<div class="actionType dropdownBox ' + classes + '" ' +
                    dataAttr +
                    'data-type="' + operation + '" ' +
                    'data-info="' + info.text + '" ' +
                    'data-table="' + resultTableName + '"' +
                    'data-id="' + node.value.dagNodeId + '">' +
                        '<div class="actionTypeWrap" ' +
                        'data-toggle="tooltip" data-placement="top" ' +
                        'data-container="body" data-original-title="' +
                        info.tooltip + '"' +'>' +
                            '<div class="dagIcon">' +
                                getIconHtml(info.opType, info) +
                            '</div>' +
                            '<span class="typeTitle">' + operation + '</span>' +
                            '<span class="opInfoText">' + opText + '</span>' +
                        '</div>' +
                        groupTagIcon +
                    '</div>';

        return (originHTML);
    }

    function positionMultiExportNodes(trees, yCoors, sets, exportsSeen, seen) {
        var dagImageHtml = "";
        var exportNodes = [];
        for (var i = 1; i < trees.length; i++) {
            if (sets.indexOf(trees[i]) > -1 ||
                exportsSeen[trees[i].value.dagNodeId]) {
                continue;
            }
            exportNodes.push(trees[i]);
        }
        // sort rightmost to leftMost exportNode
        exportNodes.sort(function(a, b) {
            return b.parents[0].value.display.depth -
                   a.parents[0].value.display.depth;
        });

        for (var i = 0; i < exportNodes.length; i++) {
            var node = exportNodes[i];
            var parentNode = node.parents[0];
            if (!seen[parentNode.value.dagNodeId]) {
                continue;
            }
            var nodeDisp = node.value.display;
            var parentNodeDisp = parentNode.value.display;

            nodeDisp.condensedDepth = parentNodeDisp.condensedDepth - 1;
            nodeDisp.depth = parentNodeDisp.depth - 1;
            nodeDisp.expandedDepth = parentNodeDisp.expandedDepth - 1;
            nodeDisp.isHidden = parentNodeDisp.isHidden;
            nodeDisp.tagCollapsed = parentNodeDisp.tagCollapsed;
            nodeDisp.isInTagGroup = parentNodeDisp.isInTagGroup;
            nodeDisp.isHiddenTag = parentNodeDisp.isHiddenTag;
            nodeDisp.x = Math.round(nodeDisp.condensedDepth * Dag.tableWidth);
            nodeDisp.y = Math.round(parentNodeDisp.y + dagTableOuterHeight);

            var nextYCoor = yCoors[yCoors.length - 1];
            for (var j = yCoors.length - 1; j >= 0; j--) {
                if (nodeDisp.depth + 1 >= yCoors[j]) {
                    nextYCoor = j + 1;
                    break;
                }
            }
            nodeDisp.y = Math.round((nextYCoor + 0.2) * dagTableOuterHeight);
            if (!nodeDisp.isHiddenTag) {
                yCoors[nextYCoor] = nodeDisp.depth;
            }
            exportsSeen[node.value.dagNodeId] = true;
        }
    }

    function drawMultiExportNodes(trees, storedInfo, drawn, sets, exportsSeen) {
        var dagImageHtml = "";

        // make all sure positions get adjusted first before drawing all nodes
        for (var i = 1; i < trees.length; i++) {
            if (sets.indexOf(trees[i]) > -1 || exportsSeen[trees[i].value.dagNodeId] ||
                $.isEmptyObject(trees[i].value.display)) {
                continue;
            }

            dagImageHtml += drawDagNode(trees[i], storedInfo, drawn);
            exportsSeen[trees[i].value.dagNodeId] = true;
        }

        return dagImageHtml;
    }

    function getCollapsedHtml(group, top, right, depth, groupId, numHidden,
                             isHidden) {
        var html = "";
        var tooltip;
        var groupLength = group.length - numHidden;
        if (groupLength === 0) {
            return "";
        }
        var outlineOffset = right - Dag.groupOutlineOffset;
        var classes = "";

        if (!isHidden) {
            tooltip = TooltipTStr.ClickCollapse;
            right = group[0].value.display.x + 190;
            outlineOffset = (right + 15) - (group.length * Dag.tableWidth + 11);
            classes += " expanded ";
        } else if (groupLength === 1) {
            tooltip = TooltipTStr.CollapsedTable;
        } else {
            tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables,
                        {number: groupLength + ""});
        }

        var groupWidth = groupLength * Dag.tableWidth + 11;
        // condensedId comes from the index of the child of rightmost
        // hidden table
        html += '<div class="expandWrap horz' + classes + '" ' +
                        'style="top:' + (top + 5) + 'px;right:' + right +
                        'px;" ' +
                        'data-depth="' + depth + '" ' +
                        'data-index="' + groupId + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'data-size=' + groupLength + ' ' +
                        'title="' + tooltip + '">...</div>' +
                    '<div class="groupOutline" ' +
                        'style="top:' + top + 'px;right:' +
                            outlineOffset +
                            'px;width:' + groupWidth + 'px;" ' +
                        'data-index="' + groupId + '"></div>';

        return html;
    }

    function getIconHtml(operation, info) {
        var type = info.type;
        var iconClass = "";
        var prefix = "xi-";
        switch (operation) {
            case (SQLOps.Map):
                iconClass = "data-update";
                break;
            case (SQLOps.SplitCol):
                prefix = "xi_";
                iconClass = "split";
                break;
            case (SQLOps.ChangeType):
                iconClass = getCastIconClass(type);
                break;
            case (SQLOps.Filter):
                iconClass = getFilterIconClass(type);
                break;
            case (SQLOps.GroupBy):
                iconClass = "groupby";
                break;
            case (SQLOps.Aggr):
                iconClass = "aggregate";
                break;
            case ("Create Table"):
                iconClass = "index";
                break;
            case ("index"):
                iconClass = "index";
                break;
            case (SQLOps.Join):
                iconClass = getJoinIconClass(type);
                break;
            case (SQLOps.Project):
                iconClass = "delete-column";
                break;
            case (SQLOps.Sort):
                if (info.order === "ascending") {
                    iconClass = "arrowtail-up";
                } else {
                    iconClass = "arrowtail-down";
                }
                break;
            case ("export"):
                iconClass = "pull-all-field";
                break;
            case (SQLOps.Ext):
                iconClass = "menu-extension";
                break;
            default:
                iconClass = "unknown";
                break;
        }

        return '<i class="icon ' + prefix + iconClass + '"></i>';
    }

    /*
    icons we need

    gt, ge, lt, le
    regex
    not equal
    index should be like old icon
     */

    function getFilterIconClass(type) {
        var iconClass = "filter";
        switch (type) {
            case ("filtergt"):
                iconClass += "-greaterthan";
                break;
            case ("filterge"):
                iconClass += "-greaterthan-equalto";
                break;
            case ("filtereq"):
                iconClass += "-equal";
                break;
            case ("filterlt"):
                iconClass += "-lessthan";
                break;
            case ("filterle"):
                iconClass += "-lessthan-equalto";
                break;
            case ("filternot"):
                iconClass += "-not-equal";
                break;
            case ("filterregex"):
            case ("filterlike"):
            case ("filterothers"):
                break;
            default:
                break;
        }
        return iconClass;
    }

    function getCastIconClass(type) {
        var iconClass = "";
        switch (type) {
            case ("changeType-boolean"):
                iconClass = "boolean";
                break;
            case ("changeType-string"):
                iconClass = "string";
                break;
            case ("changeType-integer"):
            case ("changeType-float"):
                iconClass = "integer";
                break;
            default:
                iconClass = "data-update";
                break;
        }
        return iconClass;
    }

    function getJoinIconClass(type) {
        var iconClass = "";
        switch (type) {
            case ("inner"):
                iconClass = "join-inner";
                break;
            case ("fullOuter"):
                iconClass = "join-outer";
                break;
            case ("left"):
                iconClass = "oin-leftouter"; // icon name has mispelling
                break;
            case ("right"):
                iconClass = "join-rightouter";
                break;
            default:
                iconClass = "join-inner";
                break;
        }
        return iconClass;
    }

    function getDagNodeInfo(node, key) {
        var parenIndex;
        var evalStr = "";
        var value = node.value.struct;
        var info = {
            type: "unknown",
            text: "",
            opText: "",
            operation: "",
            opType: "",
            tooltip: "",
            state: DgDagStateTStr[node.value.state]
        };
        var parentNames = node.getSourceNames(true);
        var taggedInfo;
        var isCollapsedTag = false;
        if (node.value.display.tagHeader && node.value.display.tagCollapsed &&
            node.value.tags.length === 1) {
            taggedInfo = setTaggedOpInfo(info, value, node, parentNames);
            if (node.value.display.hasTagGroup) {
                isCollapsedTag = true;
            }
        }

        if (!taggedInfo) {
            info.operation = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
            info.operation = info.operation.slice(0, info.operation.length - 5);
            info.opType = info.operation;
            switch (key) {
                case ('aggregateInput'):
                    evalStr = value.eval[0].evalString;
                    info.type = "aggregate" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Aggregate: " + evalStr;
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('loadInput'):
                    info.url = value.url;
                    var loadInfo = xcHelper.deepCopy(value);
                    info.loadInfo = loadInfo;
                    loadInfo.name = loadInfo.dest;
                    delete loadInfo.dest;
                    delete loadInfo.dataset;
                    delete loadInfo.dagNodeId;
                    break;
                case ('filterInput'):
                    info = getFilterInfo(info, value.eval[0].evalString, parentNames);
                    break;
                case ('groupByInput'):
                    var sampleStr = "";
                    var groupedOn = getGroupedOnText(node);
                    if (value.includeSrcTableSample) {
                        sampleStr = " (Sample included)";
                    } else {
                        sampleStr = " (Sample not included)";
                    }
                    var evalStrs = value.eval;
                    evalStr = "";
                    for (var i = 0; i < evalStrs.length; i++) {
                        evalStr += evalStrs[i].evalString + ", ";
                    }
                    evalStr = evalStr.slice(0, -2);

                    parenIndex = evalStr.indexOf("(");
                    var type = evalStr.substr(0, parenIndex);
                    info.type = "groupBy" + type;
                    info.text = evalStr;
                    info.tooltip = evalStr + " Grouped by " + groupedOn + sampleStr;
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('indexInput'):
                    var keyNames = value.key.map(function(key) {
                        return key.name;
                    });
                    if (!node.parents[0] || node.parents[0].value.api ===
                        XcalarApisT.XcalarApiBulkLoad) {
                        info.tooltip = "Created Table";
                        info.type = "createTable";
                        info.opText = "";
                        info.text = "indexed on " + xcHelper.listToEnglish(keyNames);
                    } else if (value.ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                        value.ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                        info.type = "sort";
                        info.opType = SQLOps.Sort;
                        info.order = value.ordering.toLowerCase();
                        var order = "(" + info.order + ") ";
                        info.tooltip = "Sorted " + order + "on " +
                                      xcHelper.listToEnglish(keyNames);

                        info.text = "sorted " + order + "on " +
                                    xcHelper.listToEnglish(keyNames);
                        info.opText = keyNames.join(", ");
                    } else {
                        var indexFieldStr = "";
                        info.tooltip = "Indexed by " + xcHelper.listToEnglish(keyNames);
                        info.type = "index";
                        info.text = "indexed on " + xcHelper.listToEnglish(keyNames);
                        info.opText = keyNames.join(", ");
                    }
                    break;
                case ('joinInput'):
                    var srcCols = getJoinSrcCols(node, isCollapsedTag);
                    var lSrcCols = srcCols.left;
                    var rSrcCols = srcCols.right;
                    info.text = value.joinType;

                    var joinType = info.text.slice(0, info.text.indexOf("Join"));
                    info.type = joinType;
                    var joinText = "";
                    if (joinType.indexOf("Outer") > -1) {
                        var firstPart = joinType.slice(0, joinType.indexOf("Outer"));
                        firstPart = firstPart[0].toUpperCase() + firstPart.slice(1);
                        joinText = firstPart + " Outer";
                    } else {
                        joinText = joinType[0].toUpperCase() + joinType.slice(1);
                    }

                    info.tooltip = joinText + " Join between table &quot;" +
                                   parentNames[0] + "&quot; and table &quot;" +
                                   parentNames[1] + "&quot; where ";
                    var invalidColFound = false;
                    for (var i = 0; i < lSrcCols.length; i++) {
                        if (i > 0) {
                            info.tooltip += ", " ;
                        }
                        info.tooltip += lSrcCols[i] + " = " + rSrcCols[i];
                        if (!lSrcCols[i] || !rSrcCols[i]) {
                            invalidColFound = true;
                        }
                    }
                    if (invalidColFound) {
                        info.tooltip = joinText + " Join between table &quot;" +
                                   parentNames[0] + "&quot; and table &quot;" +
                                   parentNames[1] + "&quot;";
                    }
                    info.opText = parentNames[0] + ", " + parentNames[1];
                    break;
                case ('mapInput'):
                    var evalStrs = value.eval;
                    var fieldNames = "New fields: ";
                    evalStr = "";
                    for (var i = 0; i < evalStrs.length; i++) {
                        evalStr += evalStrs[i].evalString + ", ";
                        fieldNames += evalStrs[i].newField + ", ";
                    }
                    evalStr = evalStr.slice(0, -2);
                    fieldNames = fieldNames.slice(0, -2);
                    info.type = "map" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Map: " + evalStr + ".<br>" + fieldNames;
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('projectInput'):
                    for (var i = 0; i < value.columns.length; i++) {
                        info.opText += value.columns[i] + ", ";
                    }

                    info.opText = info.opText.slice(0, info.opText.length - 2);
                    if (info.opText.length > 80) {
                        info.opText = info.opText.slice(0, 80) + "...";
                    }
                    info.tooltip = "Projected columns: " + info.opText;
                    info.text = info.tooltip;
                    info.type = "project";
                    break;
                case ('exportInput'):
                    info.type = "export";
                    // XXX fix url
                    info.url = value.fileName || "";
                    info.opText = "";
                    break;
                default:
                    var name;
                    if (key.slice(key.length - 5) === "Input") {
                        name = key.slice(0, key.length - 5);
                    } else {
                        name = key;
                    }
                    info.type = name;
                    info.text = name;
                    info.tooltip = name[0].toUpperCase() + name.slice(1);
                    info.opText = "";
                    break;
            }

            if (parentNames.length > 1) {
                info.opText = parentNames[0];
                for (var i = 1; i < parentNames.length; i++) {
                    info.opText += ", " + parentNames[i];
                }
            }
        }

        info.tooltip = info.tooltip.replace(/"/g, "&quot;");
        info.text = info.text.replace(/"/g, "&quot;");
        info.opText = info.opText.replace(/"/g, "&quot;");

        return (info);
    }

    function setTaggedOpInfo(info, value, node, parentNames) {
        var taggedOp = getOpFromTag(node.value.tags[0]);
        var opFound = true;
        var evalStr;
        var ancestors;
        info.operation = taggedOp;

        switch (taggedOp) {
            case (SQLOps.SplitCol):
                evalStr = value.eval[0].evalString;
                info.text = evalStr;
                info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.indexOf(','));
                var delimiter = $.trim(evalStr.slice(
                                              evalStr.lastIndexOf(",") + 1,
                                              evalStr.lastIndexOf(")")));
                info.tooltip = "Split column " + info.opText + " by " +
                                delimiter;
                break;
            case (SQLOps.ChangeType):
                ancestors = getTaggedAncestors(node);
                evalStr = value.eval[0].evalString;
                info.text = evalStr;
                if (value.eval.length > 1) {
                    // multiple casts, show general info
                    info.tooltip = "Changed column type of multiple columns";
                    info.opText = "multiple columns";
                } else {
                    // only 1 cast so show specific info
                    info.opText = evalStr.slice(evalStr.indexOf("(") + 1,
                                            evalStr.indexOf(","));
                    var castType = evalStr.slice(0, evalStr.indexOf("("));
                    if (castType === "bool") {
                        castType = "boolean";
                    } else if (castType === "int") {
                        castType = "integer";
                    }
                    info.tooltip = "Changed column " + info.opText +
                                    " type to " + castType;
                    info.type = info.operation + "-" + castType;
                }
                break;
            case (SQLOps.GroupBy):
                ancestors = getTaggedAncestors(node, true);
                var gbOnCols = {};
                var aggs = [];
                var tooltip = "";
                var sampleStr = " (Sample not included)";
                for (var i = 0; i < ancestors.length; i++) {
                    var gbNode = ancestors[i];

                    if (gbNode.value.api === XcalarApisT.XcalarApiGroupBy) {
                        var cols = getGroupedOnCols(node);
                        for (var j = 0; j < cols.length; j++) {
                            gbOnCols[cols[j]] = true;
                        }
                        if (gbNode.value.struct.includeSrcTableSample) {
                            sampleStr = " (Sample included)";
                        }
                        var evalStrs = gbNode.value.struct.eval;
                        evalStr = "";
                        for (var j = 0; j < evalStrs.length; j++) {
                            evalStr += evalStrs[j].evalString + ", ";
                        }
                        evalStr = evalStr.slice(0, -2);
                        aggs.push(evalStr);
                    }
                }

                for (var i = 0; i < aggs.length; i++) {
                    tooltip += aggs[i] + ", ";
                }
                tooltip = tooltip.slice(0, -2);
                tooltip += "<br>Grouped by: ";
                for (var col in gbOnCols) {
                    tooltip += col + ", ";
                    info.opText += col + ", ";
                }
                info.opText = info.opText.slice(0, -2);
                tooltip = tooltip.slice(0, -2) + "<br>" + sampleStr;
                info.tooltip = tooltip;
                break;
            default:
                if (taggedOp.indexOf(SQLOps.Ext) === 0) {
                    info.tooltip = taggedOp;
                    info.text = taggedOp;
                    info.opType = SQLOps.Ext;
                } else {
                    opFound = false;
                }
                break;
        }

        if (!info.opType) {
            info.opType = info.operation;
        }
        if (opFound) {
            if (info.type === "unknown") {
                info.type = taggedOp;
            }
            return info;
        } else {
            return null;
        }
    }

    function getJoinSrcCols(node, isCollapsedTag) {
        var lSrcCols = [];
        var rSrcCols = [];
        var parents;
        if (isCollapsedTag) {
            parents = getGroupLeaves(node); // gets leaves within a tagged group
        } else {
            parents = node.parents;
        }

        for (var i = 0; i < parents.length; i++) {
            if (parents[i].value.api === XcalarApisT.XcalarApiMap) {
                if (i === 0) {
                    lSrcCols = parseConcatCols(parents[i]);
                } else {
                    rSrcCols = parseConcatCols(parents[i]);
                }
            } else if (parents[i].value.api === XcalarApisT.XcalarApiIndex) {
                if (i === 0) {
                    for (var j = 0; j < parents[i].value.struct.key.length; j++) {
                        lSrcCols.push(parents[i].value.struct.key[j].name);
                    }
                } else {
                    for (var j = 0; j < parents[i].value.struct.key.length; j++) {
                        rSrcCols.push(parents[i].value.struct.key[j].name);
                    }
                }
            } else if (parents[i].value.api === XcalarApisT.XcalarApiJoin) {
                if (i === 0) {
                    lSrcCols.push(getSrcIndex(parents[i].parents[i]));
                } else {
                    rSrcCols.push(getSrcIndex(parents[i].parents[i]));
                }
            }
        }

        return {left: lSrcCols, right: rSrcCols};

        function getSrcIndex(node) {
            if (node.value.api === XcalarApisT.XcalarApiIndex) {
                return node.value.struct.key[0].name;
            } else {
                if (!node.parents.length) {
                    // one case is when we reach a retina project node
                    return null;
                }
                return getSrcIndex(node.parents[0]);
            }
        }
    }

    // made only for join, gets leaves within a tagged group
    function getGroupLeaves(node) {
        var tag = node.value.tags[0];
        var leaves = [];
        getLeaves(node);

        function getLeaves(node) {
            for (var i = 0; i < node.parents.length; i++) {
                var parentNode = node.parents[i];
                if (tag && parentNode.value.tags[0] === tag) {
                    getLeaves(parentNode);
                } else {
                    leaves.push(node);
                }
            }
        }
        return leaves;
    }

    function getFilterInfo(info, filterStr, parentNames) {
        var parenIndex = filterStr.indexOf("(");
        var abbrFilterType = filterStr.slice(0, parenIndex);

        info.type = "filter" + abbrFilterType;
        info.text = filterStr;
        filterType = "";
        var filterTypeMap = {
            "gt": "greater than",
            "ge": "reater than or equal to",
            "eq": "equal to",
            "lt": "less than",
            "le": "less than or equal to",
            "regex": "regex",
            "like": "like",
            "not": "not"
        };
        if (parenIndex !== filterStr.lastIndexOf("(")) {
            // nested args, use general filterstr for tooltip
            info.opText = filterStr.slice(parenIndex + 1,
                                          filterStr.lastIndexOf(')')).trim();
            info.tooltip = "Filtered table &quot;" + parentNames[0] +
                            "&quot;: " + filterStr;
        } else if (filterTypeMap[abbrFilterType]) {
            var filteredOn = filterStr.slice(parenIndex + 1,
                                             filterStr.indexOf(','));
            filterType = filterTypeMap[abbrFilterType];
            var filterValue = filterStr.slice(filterStr.indexOf(',') + 2,
                                              filterStr.lastIndexOf(')'));

            info.opText = filteredOn;
            if (filterType === "regex") {
                info.tooltip = "Filtered table &quot;" + parentNames[0] +
                               "&quot; using regex: &quot;" +
                               filterValue + "&quot; on " +
                               filteredOn + ".";
            } else if (filterType === "not") {
                filteredOn = filteredOn.slice(filteredOn.indexOf("(") + 1);
                filterValue = filterValue
                                .slice(0, filterValue.lastIndexOf(')'));
                info.opText = filteredOn;
                if (filteredOn.indexOf(")") > -1) {
                    info.tooltip = "Filtered table &quot;" + parentNames[0] +
                               "&quot; where " + filteredOn +
                               " is " + filterType + " " +
                               filterValue + ".";
                } else {
                    commaIndex = filterStr.indexOf(',');
                    if (commaIndex !== -1) {
                        info.opText = filterStr
                                      .slice(parenIndex + 1, commaIndex)
                                      .trim();
                    } else {
                        info.opText = filterStr
                                      .slice(parenIndex + 1,
                                             filterStr.lastIndexOf(')'))
                                      .trim();
                    }
                    info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                    "&quot;: " + filterStr;
                }

            } else {
                info.tooltip = "Filtered table &quot;" + parentNames[0] +
                               "&quot; where " + filteredOn +
                               " is " + filterType + " " +
                               filterValue + ".";
            }
        } else {
            commaIndex = filterStr.indexOf(',');
            if (commaIndex !== -1) {
                info.opText = filterStr
                              .slice(parenIndex + 1, commaIndex)
                              .trim();
            } else {
                info.opText = filterStr
                              .slice(parenIndex + 1,
                                     filterStr.lastIndexOf(')'))
                              .trim();
            }
            info.tooltip = "Filtered table &quot;" + parentNames[0] +
                            "&quot;: " + filterStr;
        }
        info.opText = info.opText;
        return info;

    }

    function getGroupedOnText(node) {
        var text = "";
        var numParents = node.value.numParents;
        if (numParents === 1 &&
            node.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
            var parent = node.parents[0];
            var keyNames = parent.value.struct.key.map(function(key) {
                return key.name;
            });
            var keyNamesStr = keyNames.join(", ");

            text = "(" + keyNamesStr + ")";
        } else {
            text = "(See previous table index)";
        }
        return text;
    }

    function getGroupedOnCols(node) {
        var numParents = node.value.numParents;
        var cols = [];
        if (numParents === 1 &&
            node.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
            var parent = node.parents[0];
            cols = parent.value.struct.key.map(function(key) {
                return key.name;
            });
        } else {
            cols = ["(See previous table index)"];
        }
        return cols;
    }

    // returns nodes, not indices
    function getTaggedAncestors(node, withSelf) {
        var tag = node.value.tags[0];
        var ancestors = [];
        if (withSelf) {
            ancestors.push(node);
        }

        search(node);

        function search(node) {
            for (var i = 0; i < node.parents.length; i++) {
                var parent = node.parents[i];
                if (parent.value.display.isHiddenTag &&
                    parent.value.tags.indexOf(tag) > -1) {
                    ancestors.push(parent);
                    search(parent);
                }
            }
        }
        return ancestors;
    }

    // used only for parsing concated col names used for multi group by
    // and maps within multijoin
    function parseConcatCols(node) {
        var cols = [];
        if (node.value.api === XcalarApisT.XcalarApiMap) {
            var evals = node.value.struct.eval;
            for (var i = 0; i < evals.length; i++) {
                var func = {args: []};
                ColManager.parseFuncString(evals[i].evalString, func);
                func = func.args[0];
                cols = cols.concat(getSourceColNames(func));
            }
        }
        return cols;
    }

    /* Generation of dag elements and canvas lines */
    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage').width() + 130;
        var dagHeight = $dagWrap.find('.dagImage').height();
        var className = "";
        if (full) {
            dagHeight += 50;
            className = " full";
        }
        var canvasHTML = $('<canvas class="canvas' + className +
                            '" width="' + dagWidth +
                            '" height="' + (dagHeight) + '"></canvas>');
        $dagWrap.find('.dagImage').append(canvasHTML);
        return (canvasHTML[0]);
    }

    function drawAllLines($container, roots, numNodes, width) {
        var $dagImage = $container.find('.dagImage');
        var canvas = createCanvas($container);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        var drawn = {};
        // traverseAndDrawLines($dagImage, ctx, node, width, drawn);
        // for export
        for (var i = 0; i < roots.length; i++) {
            traverseAndDrawLines($dagImage, ctx, roots[i], width, drawn);
        }

        ctx.stroke();

        // if more than 1000 nodes, do not make savable, too much lag
        // also canvas limit is 32,767 pixels height  or width
        var canvasWidth = $(canvas).width();
        var canvasHeight = $(canvas).height();

        if (numNodes > 1000 || canvasWidth > Dag.canvasLimit ||
            canvasHeight > Dag.canvasLimit || (canvasWidth * canvasHeight) >
            Dag.canvasAreaLimit) {
            $dagImage.closest(".dagWrap").addClass('unsavable');
        }
    }

    function traverseAndDrawLines($dagImage, ctx, node, width, drawn, all) {
        if ((all || !node.value.display.isHidden) &&
            !node.value.display.isHiddenTag) {
            drawDagLines($dagImage, ctx, node, width);
        }
        drawn[node.value.dagNodeId] = true;
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            if (!drawn[parentNode.value.dagNodeId]) {
                traverseAndDrawLines($dagImage, ctx, parentNode, width, drawn);
            }
        }
    }

    function hasParentOnSameY(node, targetParent) {
        var targetDepth = targetParent.value.display.depth;
        var parents = node.getVisibleParents();
        for (var i = 0; i < parents.length; i++) {
            if (parents[i].value.display.y === node.value.display.y) {
                if (parents[i].value.display.depth < targetDepth) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        return false;
    }

    function hasChildOnSameY(node, targetChild) {
        var targetDepth = targetChild.value.display.depth;
        var children = node.getVisibleChildren();
        for (var i = 0; i < node.children.length; i++) {
            if (node.children[i].value.display.y === node.value.display.y) {
                if (children[i].value.display.depth > targetDepth) {
                    return true;
                } else {
                    return false;
                }
            }
        }
        return false;
    }

    // this function draws all the lines going into a blue table icon and its
    // corresponding gray operation rectangle
    function drawDagLines($dagImage, ctx, node, canvasWidth) {
        if (!node.parents.length) {
            // Should not draw for starting nodes with no parents
            // i.e. load nodes
            return;
        }

        var parents = node.getVisibleParents();
        var numParents = parents.length;

        if (!numParents) {
            return;
        }

        var tableX = canvasWidth - node.value.display.x + 6;
        var tableY = node.value.display.y + dagTableHeight / 2;
        var upperParent = parents[0];
        var upperParentX = canvasWidth - upperParent.value.display.x;
        var upperParentY = upperParent.value.display.y + dagTableHeight / 2;
        var curvedLineCoor;
        var parentOffset = 0;
        if (upperParent.value.api === XcalarApisT.XcalarApiBulkLoad) {
            parentOffset += 3;
        }
        // line from table to operation
        drawLine(ctx, tableX, tableY, tableX - 50, tableY);

        // line from child operation to upper parent table
        if (tableY === upperParentY) {
            drawLine(ctx, tableX - 108, tableY, upperParentX + smallTableWidth,
                     upperParentY);
        } else {
            curvedLineCoor = {
                x1: tableX - 140,
                y1: tableY,
                x2: upperParentX + (smallTableWidth / 2) + parentOffset, // middle of blue table
                y2: upperParentY
            };
            drawCurve(ctx, curvedLineCoor, true);
        }

        if (isJoinLineNeeded(node, parents)) {
            var lowerParent = parents[1];
            var lowerParentX = canvasWidth - lowerParent.value.display.x;
            var lowerParentY = lowerParent.value.display.y + dagTableHeight / 2;

            curvedLineCoor = {
                x1: tableX - 102,
                y1: tableY,
                x2: lowerParentX + smallTableWidth, // right of blue table
                y2: lowerParentY
            };
            var inverted = false;
            var duelInverted = false;
            if (lowerParentY < tableY) {
                if (hasChildOnSameY(lowerParent, node)) {
                    inverted = true;
                    if (hasParentOnSameY(node, lowerParent)) {
                        duelInverted = true;
                    }
                }
            } else if (lowerParentY > tableY) {
                if (hasChildOnSameY(lowerParent, node)) {
                    inverted = true;
                    if (hasParentOnSameY(node, lowerParent)) {
                        duelInverted = true;
                    }
                }
            }
            drawCurve(ctx, curvedLineCoor, inverted, duelInverted);

            // draw any additional curves if more than 2 parents
            if (numParents > 2) {
                drawExtraCurves(parents, tableX - 102, tableY, ctx,
                                 canvasWidth);
            }
        }

    }

    // do not draw join lines for groupbys
    function isJoinLineNeeded(node, parents) {
        if (parents.length < 2) {
            return false;
        }
        if (node.value.display.hasTagGroup &&
            getOpFromTag(node.value.tags[0]) === SQLOps.GroupBy) {

            for (var i = 1; i < parents.length; i++) {
                if (parents[i].value.dagNodeId !== parents[0].value.dagNodeId) {
                    return true;
                }
            }
            return false;
        } else {
            return true;
        }
    }

    function drawCurve(ctx, coor, inverted, duelInverted) {
        var x1 = coor.x1; // upper table x
        var y1 = coor.y1; // upper table y
        var x2 = coor.x2; // parent table x
        var y2 = coor.y2; // parent table y
        var bendX1, bendY1, bendX2, bendY2;

        if (inverted) {
            bendX1 = (x2 + x1) / 2;
            bendY1 = y1;
            bendX2 = x2;
            bendY2 = y1;

            if (duelInverted) {
                bendX1 = x1;
                bendY1 = (y2 * 9 + y1) / 10;// 90% horizontal
                bendY2 = (y1 * 9 + y2) / 10;
            }
        } else if (y1 === y2) {
            x1 -= 20;
            bendX1 = x1;
            bendY1 = y1 - 40;
            bendX2 = x2;
            bendY2 = y2 - 40;

        } else {
            // curve style option
            // bendX1 = x1;
            // bendY1 = y1 + ((y2 - y1) / 2);
            // bendX2 = x2 + ((x1 - x2) / 2);
            // bendY2 = y2;

            bendX1 = x1;
            bendY1 = y2;
            bendX2 = x1;
            bendY2 = y2;
        }
        bendX1 = Math.round(bendX1);
        bendY1 = Math.round(bendY1);
        bendX2 = Math.round(bendX2);
        bendY2 = Math.round(bendY2);

        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(bendX1, bendY1,
                          bendX2, bendY2,
                          x2, y2);
    }

    // for tables that have more than 2 parents
    function drawExtraCurves(parents, x1, y1, ctx, canvasWidth) {
        for (var i = 2; i < parents.length; i++) {
            var parent = parents[i];
            var x2 = canvasWidth - parent.value.display.x + smallTableWidth;
            var y2 = parent.value.display.y + dagTableHeight / 2;
            var bendX1 = x1;
            var bendY1 = y2;
            var bendX2 = x1;
            var bendY2 = y2;

            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(bendX1, bendY1,
                              bendX2, bendY2,
                              x2, y2);
        }
    }

    function drawLine(ctx, x1, y1, x2, y2) {
        // draw a straight line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }

    if (window.unitTestMode) {
        DagDraw.__testOnly__ = {};
        DagDraw.__testOnly__.getTaggedAncestors = getTaggedAncestors;
        DagDraw.__testOnly__.checkIsNodeHiddenTag = checkIsNodeHiddenTag;
        DagDraw.__testOnly__.getDagNodeInfo = getDagNodeInfo;
        DagDraw.__testOnly__.getIconHtml = getIconHtml;
        DagDraw.__testOnly__.getJoinIconClass = getJoinIconClass;
        DagDraw.__testOnly__.getFilterInfo = getFilterInfo;
    }

    return (DagDraw);

}(jQuery, {}));
