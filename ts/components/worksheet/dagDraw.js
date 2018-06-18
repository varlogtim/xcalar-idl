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
    //
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

                    // adjust positions of nodes so that descendants will never be to
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
                dagImageHtml += drawMultiExportNodes(trees, storedInfo, drawn,
                                                     sets, exportsDrawn);

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
        postDagHtmlOperations($container, options);
    };

    function postDagHtmlOperations($dagWrap, options) {
        var datasets = $dagWrap.data("allDagInfo").datasets;
        for (var i in datasets) {
            var nodeId = datasets[i].dagNodeId;
            var $icon = Dag.getTableIcon($dagWrap, nodeId);
        }
        if (options.tableId != null || options.refresh) {
            styleDroppedTables($dagWrap);
            applyLockIfNeeded($dagWrap);
        }
    }

    function styleDroppedTables($dagWrap) {
        $dagWrap.find(".dagTable.Dropped").each(function() {
            var $dagTable = $(this);
            var tId = $dagTable.data("tableid");
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

    function applyLockIfNeeded($dagWrap) {
        var $table;
        var tId;
        var table;
        var isLocked;
        var noDelete;
        var needsIcon;
        var lockHTML = '<i class="lockIcon icon xi-lockwithkeyhole"></i>';
        $dagWrap.find(".dagTable").each(function() {
            $table = $(this);
            tId = $table.data('tableid');
            table = gTables[tId];
            if (!table) {
                return;
            }

            isLocked = table.hasLock();
            noDelete = table.isNoDelete();
            needsIcon = isLocked || noDelete;
            if (needsIcon) {
                $table.append(lockHTML);
                if (isLocked) {
                    $table.addClass("locked");
                }
                if (noDelete) {
                    $table.addClass("noDelete");
                }
            }
        });
    }

    // used for expanding / collapsing tagged group with "node" as header
    DagDraw.recreateDagImage = function($dagWrap, dagInfo, node) {
        // var tree = dagInfo.tree;
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
            positionMultiExportNodes(trees, yCoors, dagInfo.sets, exportsSeen,
                                     condenseSeen);
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
        if (!$dagWrap.length) {
            return;
        }
        var dagInfo = $dagWrap.data("allDagInfo");
        var nodeIdMap = dagInfo.nodeIdMap;
        var $dagTable;
        var node;
        var nodeId;
        for (var i = 0; i < tables.length; i++) {
            $dagTable = $dagWrap.find(".dagTable[data-tablename='" +
                                          tables[i] + "']");
            if (!$dagTable.length) {
                continue;
            }
            nodeId = $dagTable.data("nodeid");
            node = nodeIdMap[nodeId];
            if (node.value.tag) {
                node.value.tag += ",";
            }
            node.value.tag += tagName;
        }
        for (nodeId in nodeIdMap) {
            node = nodeIdMap[nodeId];
            node.value.display = {};
        }
        var options = {
            refresh: true
        };
        DagDraw.createDagImage(dagInfo, $dagWrap, options);
    };

    DagDraw.createSavableCanvas = function($dagWrap) {
        var deferred = PromiseHelper.deferred();
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
            var tdImage = new Image();
            var expandImage = new Image();
            var eTableImage = new Image();
            tableImage.src = paths.dTable;
            eTableImage.src = paths.eTable;
            tableGrayImage.src = paths.dTableGray;
            tableICVImage.src = paths.dTableICV;
            dbImage.src = paths.dbDiamond;
            tdImage.src = paths.tDiamond;
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
                                             dbImage, eTableImage, tdImage);
                    }
                });

                $dagWrap.find('.operationTypeWrap').each(function() {
                    var $operationTypeWrap = $(this);
                    if (!$operationTypeWrap.parent().hasClass('hidden') &&
                        !$operationTypeWrap.parent().hasClass("tagHidden")) {
                        var top = Math.floor($operationTypeWrap.parent().position().top) + 4;
                        var left = Math.floor($operationTypeWrap.parent().position().left);
                        promises.push(drawDagActionTypeToCanvas(
                                            $operationTypeWrap, ctx, top, left));
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
        var deferred = PromiseHelper.deferred();
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
        var deferred = PromiseHelper.deferred();
        var img = new Image();
        img.src = paths.dagBackground;
        img.onload = function() {
            var ptrn = ctx.createPattern(img, 'repeat');
            ctx.fillStyle = ptrn;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(canvasClone, -10, 50);
            ctx.save();
            var tableTitleText = $dagWrap.find('.tableTitleArea').text();
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

    // used when recreating image to save as png or view in new tab
    function drawDagTableToCanvas($dagTable, ctx, top, left, tImage, tGrayImage,
                                  tICVImage, dImage, eImage, tdImage) {
        left += 35;
        top += 50;
        var iconLeft = left;
        var iconTop = top + 6;
        var maxWidth = 200;
        var tableImage;
        var x;

        if ($dagTable.hasClass('rootNode')) {
            if ($dagTable.hasClass("retina") ||
                $dagTable.hasClass("synthesize") ||
                $dagTable.hasClass("refresh")) {
                tableImage = tdImage;
            } else {
                tableImage = dImage;
            }

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

    function drawDagActionTypeToCanvas($operationTypeWrap, ctx, top, left) {
        var deferred = PromiseHelper.deferred();
        left += 35;
        top += 50;
        var $dagIcon = $operationTypeWrap.find('.dagIcon');
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
            iconSource = "none";
        } else {
            iconSource = paths.dfIcons + iconSource;
        }

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
                    deferred.resolve();
                };
            }

            // first line text
            var maxWidth = 78;
            var lineHeight = 10;
            var x = left + 43;
            var y = top + 9;
            var text = $operationTypeWrap.find('.typeTitle').text();
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
            text = $operationTypeWrap.find('.opInfoText').text();
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
            if (tagId != null && tagId === tableId) {
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

    function saveTagGroup(groupId, tagGroup, storedInfo) {
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
            group[i].value.display.groupId = groupId;
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

    function setTagGroup(tagName, tagHeaderNode, storedInfo) {
        var group = [];
        var seen = {};
        var groupId = xcHelper.getTableId(tagName);
        addToGroup(tagHeaderNode);

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
                        parentNode.value.display.tagGroupId = groupId;
                        addToGroup(parentNode);
                    }
                }
            }
        }
        tagHeaderNode.value.display.tagHeader = true;
        tagHeaderNode.value.display.tagCollapsed = true;
        if (group.length) {
            tagHeaderNode.value.display.hasTagGroup = true;
            saveTagGroup(groupId, group, storedInfo);
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
    // adjust positions of nodes so that descendants will never be to the left
    // of their ancestors
    function adjustNodePositions(node, storedInfo) {
        var parents = node.getVisibleParents();
        for (var i = 0; i < parents.length; i++) {
            var parent = parents[i];
            if (!node.value.display.isHidden &&
                !node.value.display.isHiddenTag) {
                var expandDiff;
                var seen;
                if (node.value.display.depth > parent.value.display.depth - 1) {
                    var diff = node.value.display.depth -
                               parent.value.display.depth;
                    var condDiff = node.value.display.condensedDepth -
                                    parent.value.display.condensedDepth;
                    expandDiff = node.value.display.expandedDepth -
                                     parent.value.display.expandedDepth;
                    seen = {};
                    adjustNodePositionsHelper(parent, diff + 1,
                                              expandDiff + 1, condDiff + 1,
                                              storedInfo, seen);


                } else if (node.value.display.expandedDepth >
                    parent.value.display.expandedDepth - 1) {
                    expandDiff = node.value.display.expandedDepth -
                                     parent.value.display.expandedDepth;
                    seen = {};
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

            // "parentNode" (the one to the left of "node") needs to be at least
            // 1 depth unit greater than "node's" depth
            if (parentNode.value.display.depth >= (node.value.display.depth + 1)) {
                // no need to shift if "parentNode" already positioned at least
                // 1 depth unit to the left of "node"
                newAmount = 0;
            } else if (parentNode.value.display.depth + amount >
                                            node.value.display.depth + 1) {
                // did not pass the first if so
                // "parentNode" is less than 1 depth unit to the left of "node"
                // and may even be to the right of it. See what it's new position
                // would be (which is parentNode.depth + amount) and if it's
                // more than 1 depth unit to the left of "node", decrease the
                // amount of shift otherwise keeping the amount
                // shift would result in extra space
                newAmount = (node.value.display.depth + 1) -
                            parentNode.value.display.depth;
            } // otherwise keep shifting the same amount

            if (parentNode.value.display.condensedDepth >=
                        (node.value.display.condensedDepth + 1)) {
                newCondAmount = 0;
            } else if (parentNode.value.display.condensedDepth +
                    condAmount > node.value.display.condensedDepth + 1) {
                newCondAmount = (node.value.display.condensedDepth + 1) -
                                parentNode.value.display.condensedDepth;
            }

            if (parentNode.value.display.expandedDepth >=
                (node.value.display.expandedDepth + 1)) {
                newExpandAmount = 0;
            } else if (parentNode.value.display.expandedDepth +
                    expandAmount > node.value.display.expandedDepth + 1) {
                newExpandAmount = (node.value.display.expandedDepth + 1) -
                                  parentNode.value.display.expandedDepth;
            }

            if (newAmount > 0.1 || newCondAmount > 0.1 ||
                newExpandAmount > 0.1) {
                newAmount = Math.max(0, newAmount);
                newExpandAmount = Math.max(0, newExpandAmount);
                newCondAmount = Math.max(0, newCondAmount);
                adjustNodePositionsHelper(parentNode, newAmount,
                                        newExpandAmount,
                                      newCondAmount, storedInfo, seen);
            }
        }
    }

    // this function allows separate branches to share the same y coor as long
    // as none of the nodes overlap. We check to see if the left side of a
    // branch overlaps with the right side of an existing branch.
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
                    if (leafDepth + 1 >= coors[j]) {
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
        var $operation = $dagWrap.find('.operationTypeWrap[data-nodeid="' +
                                            node.value.dagNodeId + '"]');
        var key = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        var info = getDagNodeInfo(node, key, {noTooltipEscape: true});

        var tagIconTip;
        var tagId = xcHelper.getTableId(node.value.tag);
        var tagName = getOpFromTag(node.value.tag);
        var tagGroup = generalInfo.tagGroups[tagId].group;
        var numInGroup = tagGroup.length + 1; // include self + 1
        if (node.value.display.tagCollapsed) {
            $operation.removeClass("expanded").addClass("collapsed");
            if (numInGroup === 2) {
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTablesSingle,
                            {op: tagName[0].toUpperCase() + tagName.slice(1)});
            } else {
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTables,
                            {number: numInGroup - 1,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
            }

        } else {
            if (numInGroup === 2) {
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTablesSingle,
                            {op: tagName[0].toUpperCase() + tagName.slice(1)});
            } else {
                tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTables,
                            {number: numInGroup - 1,
                             op: tagName[0].toUpperCase() + tagName.slice(1)
                            });
            }
            $operation.removeClass("collapsed").addClass("expanded");
        }

        $operation.data("type", info.type);
        xcTooltip.changeText($operation.find(".operationType"),
                             info.tooltip, true);
        xcTooltip.changeText($operation.find(".groupTagIcon"), tagIconTip, true);
        $operation.find(".dagIcon").html(getIconHtml(info));
        $operation.find(".typeTitle").text(info.text);
        $operation.find(".opInfoText").text(info.opText);
    }

    function repositionAllNodes($dagWrap, nodeIdMap, storedInfo) {
        $dagWrap.find(".dagTableWrap").each(function() {
            var $tableWrap = $(this);
            var nodeId = $tableWrap.find(".dagTable").data("nodeid");
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
        if (node.value.api === XcalarApisT.XcalarApiBulkLoad &&
            node.value.state === DgDagStateT.DgDagStateDropped) {
            var name = node.value.name;
            var dsPrefixIndex = name.indexOf(gDSPrefix);
            if (dsPrefixIndex > -1) {
                name = name.substr(dsPrefixIndex + gDSPrefix.length);
            }
            if (DS.getDSObj(name)) {
                // if dataset has dropped state but dataset exists then
                // it's actually just unlocked and we can treat it as
                // being in a ready state
                node.value.state = DgDagStateT.DgDagStateReady;
            }
        }
        var key = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        var dagInfo = getDagNodeInfo(node, key);
        var tableName = node.value.name;

        if (node.value.display.isHidden) {
            outerClasses += "hidden ";
        }
        if (node.value.display.isHiddenTag) {
            outerClasses += "tagHidden tagged ";
        }
        if (node.children.length === 0) {
            outerClasses += " inWS ";
            tableClasses += " headerTable ";
        }

        var dagOpHtml = getDagOperationHtml(node, dagInfo, storedInfo);
        html += '<div class="dagTableWrap clearfix ' + outerClasses + '" ' +
                        'style="top:' + top + 'px;' +
                        'right: ' + right + 'px;">' +
                        dagOpHtml;

        if (dagInfo.state === DgDagStateTStr[DgDagStateT.DgDagStateDropped]) {
            if (node.value.api === XcalarApisT.XcalarApiBulkLoad) {
                tooltipTxt = xcHelper.replaceMsg(TooltipTStr.DroppedDS,
                        {"datasetname": tableName});
            } else {
                tooltipTxt = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                        {"tablename": tableName});
            }

        } else {
            tooltipTxt = CommonTxtTstr.ClickToOpts;
        }
        tableClasses += dagInfo.state + " ";


        // check for datasets
        if (dagOpHtml === "") {
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
                tableClasses += "dataStore ";
            } else if (node.value.api === XcalarApisT.XcalarApiSelect) {
                tableClasses += "refresh ";
                tId = xcHelper.getTableId(tableName);
                tableClasses += "dataStore ";
            } else if (node.value.api === XcalarApisT.XcalarApiBulkLoad) {
                dsText = "Dataset ";
                icon = 'xi_data';
                storedInfo.datasets[tableName] = dagInfo;
                dagInfo.dagNodeId = node.value.dagNodeId;
                tableClasses += "dataStore dataset ";
            } else if (node.value.api === XcalarApisT.XcalarApiSynthesize) {
                tId = xcHelper.getTableId(tableName);
                tableClasses += "synthesize ";
            } else {
                tableClasses += "dataStore ";
                console.error("unexpected node", "api: " + node.value.api);
                tableClasses += "unexpectedNode ";
                tId = xcHelper.getTableId(tableName);
            }
            tableClasses += "rootNode ";
            iconClasses += "dataStoreIcon ";
            var type = (dagInfo.type === "load") ? "dataStore" : dagInfo.type;
            dataAttrs += 'data-table="' + originalTableName + '" ' +
                        'data-type="' + type + '" ' +
                        'data-tableid="' + tId + '"';
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
            dataAttrs += 'data-tableid="' + tableId + '"';
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
                        xcTooltip.Attrs +
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

        var opText = xcHelper.escapeHTMLSpecialChar(info.opText);
        var classes = "";
        var dataAttr = "";
        var groupTagIcon = "";
        var commentIcon = "";
        var typeTitle = info.text;
        var resultTableName = node.value.name;
        var altName = info.altName || resultTableName;

        if (node.value.display.hasTagGroup) {
            var tagIconTip;
            var tagId = xcHelper.getTableId(node.value.tag);
            var tagName = getOpFromTag(node.value.tag);
            classes += " tagHeader tag-" + tagName.replace(/\s/g, "") + " ";
            var tagGroup = generalInfo.tagGroups[tagId].group;
            var numInGroup = tagGroup.length + 1; // include self + 1
            if (node.value.display.tagCollapsed) {
                classes += " collapsed ";
                if (numInGroup === 2) {
                    tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTablesSingle,
                                {op: tagName[0].toUpperCase() + tagName.slice(1)
                                });
                } else {
                    tagIconTip = xcHelper.replaceMsg(TooltipTStr.ShowGroupTables,
                                {number: numInGroup - 1,
                                 op: tagName[0].toUpperCase() + tagName.slice(1)
                                });
                }
            } else {
                classes += " expanded ";
                if (numInGroup === 2) {
                    tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTablesSingle,
                                {op: tagName[0].toUpperCase() + tagName.slice(1)
                                });
                } else {
                    tagIconTip = xcHelper.replaceMsg(TooltipTStr.HideGroupTables,
                                {number: numInGroup - 1,
                                 op: tagName[0].toUpperCase() + tagName.slice(1)
                                });
                }
            }
            dataAttr += " data-tag='" + node.value.tags[0] + "' ";
            groupTagIcon += '<div class="groupTagIcon" data-tagid="' + tagId +
                            '"' + xcTooltip.Attrs + 'data-original-title="' +
                            tagIconTip + '" ' +
                            '><i class="icon xi-ellipsis-h-circle">' +
                            '</i></div>';
        }
        var comment = node.value.comment.userComment;
        if (comment) {
            classes += " hasComment ";
            var commentStr = "Comments: " +
                            xcHelper.escapeDblQuoteForHTML(comment);
            commentIcon += '<div class="commentIcon" ' +
                            xcTooltip.Attrs + 'data-tiphtml="false" ' +
                            'data-original-title="' + commentStr + '" ' +
                            '><i class="icon xi-info-circle">' +
                            '</i></div>';
        }

        classes += " " + info.type + " ";

        originHTML += '<div class="operationTypeWrap dropdownBox ' + classes + '" ' +
                    dataAttr +
                    'data-type="' + info.type + '" ' +
                    'data-table="' + resultTableName + '"' +

                    'data-altname="' + altName + '" ' +
                    'data-nodeid="' + node.value.dagNodeId + '">' +
                        '<div class="operationType" ' +
                        xcTooltip.Attrs + 'data-original-title="' +
                        info.tooltip + '"' +'>' +
                            '<div class="dagIcon">' +
                                getIconHtml(info) +
                            '</div>' +
                            '<span class="typeTitle">' + typeTitle + '</span>' +
                            '<span class="opInfoText">' + opText + '</span>' +
                        '</div>' +
                        '<div class="tipIcons">' +
                            groupTagIcon + commentIcon +
                        '</div>' +
                    '</div>';

        return (originHTML);
    }

    function positionMultiExportNodes(trees, yCoors, sets, exportsSeen, seen) {
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
                    xcTooltip.Attrs +
                    'data-size=' + groupLength + ' ' +
                    'title="' + tooltip + '">...' +
                '</div>' +
                '<div class="groupOutline" ' +
                    'style="top:' + top + 'px;right:' +
                    outlineOffset +
                    'px;width:' + groupWidth + 'px;" ' +
                    'data-index="' + groupId + '">' +
                '</div>';

        return html;
    }

    function getIconHtml(info) {
        var operation = info.taggedType;
        var type = info.subType;
        var iconClass = "";
        var prefix = "xi-";
        var noIcon = false;
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
            case (SQLOps.Round):
                iconClass = "integer";
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
            case ("createTable"):
                iconClass = "index";
                break;
            case ("index"):
                iconClass = "index";
                break;
            case (SQLOps.Join):
                iconClass = getJoinIconClass(type);
                break;
            case (SQLOps.Union):
                iconClass = "union";
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
            case ("synthesize"):
                iconClass = "tables-columnsicon";
                break;
            case (SQLOps.Ext):
            case ("getRowNum"):
                iconClass = "menu-extension";
                break;
            case ("ExecuteSQL"):
                iconClass = "menu-sql2";
                break;
            default:
                noIcon = true;
                break;
        }
        if (noIcon) {
            return '<i class="icon"></i>';
        } else {
            return '<i class="icon ' + prefix + iconClass + '"></i>';
        }
    }

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
            case ("filterneq"):
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
            case ("cross"):
                iconClass = "join-outer";
                break;
            default:
                iconClass = "join-inner";
                break;
        }
        return iconClass;
    }

    function getDagNodeInfo(node, key, options) {
        options = options || {};
        var parenIndex;
        var evalStr = "";
        var struct = node.value.struct;
        var info = {
            type: "unknown",
            taggedType: "",
            subType: "",
            text: "",
            opText: "",
            tooltip: "",
            state: DgDagStateTStr[node.value.state]
        };
        var parentNames = node.getSourceNames(true);
        var taggedInfo;
        var isCollapsedTag = false;

        info.type = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
        info.type = info.type.slice(0, info.type.length - 5);
        info.text = info.type;
        info.subType = info.type;
        info.taggedType = info.type;

        if (node.value.display.tagHeader && node.value.display.tagCollapsed &&
            node.value.tags.length === 1 &&
            node.value.api !== XcalarApisT.XcalarApiSynthesize) {
            taggedInfo = setTaggedOpInfo(info, struct, node, parentNames);
            if (node.value.display.hasTagGroup) {
                isCollapsedTag = true;
            }
        }

        if (!taggedInfo) {
            switch (key) {
                case ('aggregateInput'):
                    evalStr = struct.eval[0].evalString;
                    info.subType = "aggregate" + evalStr.slice(0, evalStr.indexOf('('));
                    info.tooltip = "Aggregate: " + xcHelper.escapeHTMLSpecialChar(evalStr);
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('loadInput'):
                    var loadInfo = xcHelper.deepCopy(struct);
                    info.loadInfo = loadInfo;

                    loadInfo.format = xcHelper.parseDSFormat(loadInfo);
                    loadInfo.name = loadInfo.datasetName;
                    if (loadInfo.loadArgs) {
                        var udf = loadInfo.loadArgs.parseArgs.parserFnName;
                        if (loadInfo.format === "JSON" && udf !== "default:parseJson") {
                            loadInfo.loadArgs.udf = loadInfo.loadArgs.parseArgs.parserFnName;
                            delete loadInfo.loadArgs.parseArgs.parserFnName;
                        }
                    }
                    delete loadInfo.dataset;
                    delete loadInfo.dagNodeId;
                    break;
                case ('filterInput'):
                    info = getFilterInfo(info, struct.eval[0].evalString, parentNames);
                    break;
                case ('groupByInput'):
                    var sampleStr = "";
                    var groupedOn = getGroupedOnText(node);
                    if (struct.includeSrcTableSample) {
                        sampleStr = " (Sample included)";
                    } else {
                        sampleStr = " (Sample not included)";
                    }
                    var evalStrs = struct.eval;
                    evalStr = "";
                    for (var i = 0; i < evalStrs.length; i++) {
                        evalStr += evalStrs[i].evalString + ", ";
                    }
                    evalStr = evalStr.slice(0, -2);

                    parenIndex = evalStr.indexOf("(");
                    var type = evalStr.substr(0, parenIndex);
                    info.subType = "groupBy" + type;
                    info.tooltip = xcHelper.escapeHTMLSpecialChar(evalStr) +
                                   " Grouped by " + groupedOn + sampleStr;
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('indexInput'):
                    var keyNames = struct.key.map(function(key) {
                        return key.name;
                    });
                    var isSorted = false;
                    for (var i = 0; i < struct.key.length; i++) {
                        if (struct.key[i].ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingAscending] ||
                            struct.key[i].ordering ===
                            XcalarOrderingTStr[XcalarOrderingT.XcalarOrderingDescending]) {
                            isSorted = true;
                            break;
                        }
                    }
                    if (!node.parents[0] || node.parents[0].value.api ===
                        XcalarApisT.XcalarApiBulkLoad) {
                        info.tooltip = "Created Table";
                        info.subType = "createTable";
                        info.taggedType = "createTable";
                        info.opText = "";
                        info.text = "Create Table";
                    } else if (isSorted) {
                        info.taggedType = "sort";
                        info.subType = SQLOps.Sort;
                        info.order = struct.key[0].ordering.toLowerCase();
                        var order = "(" + info.order + ") ";
                        var keyNameStrs = struct.key.map(function(key) {
                            return key.ordering.toLowerCase() + " on " + key.name;
                        });
                        info.tooltip = "Sorted " + xcHelper.escapeHTMLSpecialChar(
                                           xcHelper.listToEnglish(keyNameStrs));
                        info.text = "Sort";
                        info.opText = keyNames.join(", ");
                    } else {

                        info.tooltip = "Indexed by " + xcHelper.escapeHTMLSpecialChar(
                                              xcHelper.listToEnglish(keyNames));
                        info.subType = "index";
                        info.taggedType = "index";
                        info.text = "Index";
                        info.opText = keyNames.join(", ");
                    }
                    break;
                case ('joinInput'):
                    info = getJoinInfo(info, node, struct, parentNames, isCollapsedTag);
                    break;
                case ('mapInput'):
                    var evalStrs = struct.eval;
                    var fieldNames = "New fields: ";
                    evalStr = "";
                    for (var i = 0; i < evalStrs.length; i++) {
                        evalStr += evalStrs[i].evalString + ", ";
                        fieldNames += evalStrs[i].newField + ", ";
                    }
                    evalStr = evalStr.slice(0, -2);
                    fieldNames = fieldNames.slice(0, -2);
                    info.subType = "map" + evalStr.slice(0, evalStr.indexOf('('));
                    info.tooltip = "Map: " + xcHelper.escapeHTMLSpecialChar(evalStr) + "<br>" +
                                    xcHelper.escapeHTMLSpecialChar(fieldNames);
                    info.opText = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    break;
                case ('projectInput'):
                    for (var i = 0; i < struct.columns.length; i++) {
                        info.opText += struct.columns[i] + ", ";
                    }

                    info.opText = info.opText.slice(0, info.opText.length - 2);
                    if (info.opText.length > 80) {
                        info.opText = info.opText.slice(0, 80) + "...";
                    }
                    info.tooltip = "Projected columns: " +
                                    xcHelper.escapeHTMLSpecialChar(info.opText);
                    break;
                case ('exportInput'):
                    // XXX fix url
                    info.url = struct.fileName || "";
                    info.opText = "";
                    info.altName = struct.dest;
                    break;
                case ('unionInput'):
                    var unionType = UnionTypeTStr[UnionOperatorT[xcHelper.capitalize(struct.unionType)]];
                    if (!struct.dedup) {
                        unionType += " All";
                    }
                    info.text = unionType;
                    node.value.indexedFields = getUnionSrcCols(node, isCollapsedTag);
                    info.tooltip = generateUnionTooltip(parentNames, node.value.indexedFields, unionType);
                    break;
                default:
                    var name;
                    if (key.slice(key.length - 5) === "Input") {
                        name = key.slice(0, key.length - 5);
                    } else {
                        name = key;
                    }
                    info.subType = name;
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

        if (!options.noTooltipEscape) {
            // column names are only being escaped once, so we need to
            // escape again. noTooltipEscpae is used when modifying the html
            // instead of building the html because we don't need to double
            // escape when modifying html
            info.tooltip = xcHelper.escapeHTMLSpecialChar(info.tooltip);
        }
        info.tooltip = xcHelper.escapeDblQuoteForHTML(info.tooltip);

        return (info);
    }

    function setTaggedOpInfo(info, struct, node, parentNames) {
        var taggedOp = getOpFromTag(node.value.tags[0]);
        var opFound = true;
        var evalStr;
        var ancestors;
        var opType = taggedOp;

        switch (taggedOp) {
            case (SQLOps.SplitCol):
                evalStr = struct.eval[0].evalString;
                info.text = "Split Column";
                info.opText = getFirstArgFromEvalStr(evalStr);
                var delimiter = xcHelper.escapeHTMLSpecialChar(getSecondArgFromEvalStr(evalStr));
                info.tooltip = "Split column " +
                                xcHelper.escapeHTMLSpecialChar(info.opText) + " by " +
                                delimiter;
                break;
            case (SQLOps.ChangeType):
                evalStr = struct.eval[0].evalString;
                info.text = "Change Type";
                if (struct.eval.length > 1) {
                    // multiple casts, show general info
                    info.tooltip = "Changed column type of multiple columns";
                    info.opText = "multiple columns";
                } else {
                    // only 1 cast so show specific info
                    info.opText = getFirstArgFromEvalStr(evalStr);
                    var castType = evalStr.slice(0, evalStr.indexOf("("));
                    if (castType === "bool") {
                        castType = "boolean";
                    } else if (castType === "int") {
                        castType = "integer";
                    }
                    info.tooltip = "Changed column " +
                                    xcHelper.escapeHTMLSpecialChar(info.opText) +
                                    " type to " + castType;
                    info.subType = opType + "-" + castType;
                }
                break;
            case (SQLOps.Round):
                evalStr = struct.eval[0].evalString;
                info.text = "Round";
                if (struct.eval.length > 1) {
                    // multiple casts, show general info
                    info.tooltip = "Rounded multiple columns";
                    info.opText = "multiple columns";
                } else {
                    // only 1 cast so show specific info
                    info.opText = getFirstArgFromEvalStr(evalStr);
                    var decimal = xcHelper.escapeHTMLSpecialChar(getSecondArgFromEvalStr(evalStr));
                    var decimalText = parseInt(decimal) > 1 ?
                    "decimal places" : "decimal place";
                    info.tooltip = "Round column " +
                                    xcHelper.escapeHTMLSpecialChar(info.opText) +
                                    " to " + decimal + " " + decimalText;
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
                tooltip = xcHelper.escapeHTMLSpecialChar(tooltip.slice(0, -2));
                tooltip += "<br>Grouped by: ";
                var tooltipPart2 = "";
                for (var col in gbOnCols) {
                    tooltipPart2 += col + ", ";
                    info.opText += col + ", ";
                }
                info.text = "Group by";
                info.opText = info.opText.slice(0, -2);
                tooltip += xcHelper.escapeHTMLSpecialChar(tooltipPart2.slice(0, -2)) + "<br>" + sampleStr;
                info.tooltip = tooltip;
                break;
            case (SQLOps.Join):
                var joinSubType = "";
                if (node.value.api !== XcalarApisT.XcalarApiJoin) {
                    if (node.value.api === XcalarApisT.XcalarApiFilter) {
                        joinSubType = "Left Anti Semi";
                    }
                    // cross join has a custom eval string we need to check for
                    ancestors = getTaggedAncestors(node);
                    for (var i = 0; i < ancestors.length; i++) {
                        var ancestor = ancestors[i];
                        if (ancestor.value.api === XcalarApisT.XcalarApiJoin) {
                            node = ancestor;
                            struct = node.value.struct;
                            break;
                        }
                    }
                }
                info = getJoinInfo(info, node, struct, parentNames, true,
                                    joinSubType);
                break;
            case (SQLOps.Union):
                var unionType = UnionTypeTStr[UnionOperatorT[xcHelper.capitalize(struct.unionType)]];
                if (!struct.dedup) {
                    unionType += " All";
                }
                info.text = unionType;
                node.value.indexedFields = getUnionSrcCols(node, true);
                info.tooltip = generateUnionTooltip(parentNames, node.value.indexedFields, unionType);
                break;
            case ("ExecuteSQL"):
                info.tooltip = xcHelper.escapeHTMLSpecialChar(node.value.comment.userComment);
                info.text = "SQL";
                info.opText = info.tooltip;
                info.subType = "ExecuteSQL";
                break;
            default:
                if (taggedOp.indexOf(SQLOps.Ext) === 0) {
                    info.tooltip = xcHelper.escapeHTMLSpecialChar(taggedOp);
                    info.text = taggedOp;
                    info.subType = SQLOps.Ext;
                    taggedOp = SQLOps.Ext;
                } else {
                    opFound = false;
                }
                break;
        }

        if (!info.subType) {
            info.subType = opType;
        }
        if (opFound) {
            info.taggedType = taggedOp;
            return info;
        } else {
            return null;
        }
    }

    function getFirstArgFromEvalStr(evalStr) {
        return evalStr.slice(evalStr.indexOf('(') + 1, evalStr.indexOf(','));
    }

    function getSecondArgFromEvalStr(evalStr) {
        return $.trim(evalStr.slice(
            evalStr.lastIndexOf(",") + 1,
            evalStr.lastIndexOf(")")));
    }

    function generateUnionTooltip(parentNames, fields, unionType) {
        var columns = "";
        for (var i = 0; i < fields[0].length; i++) {
            if (i > 0) {
                columns += ", ";
            }
            for (var j = 0; j < fields.length; j++) {
                if (j > 0) {
                    columns += " = ";
                }
                columns += fields[j][i];
            }
        }
        var tooltip = unionType + " between tables: <br>" +
                xcHelper.escapeHTMLSpecialChar(parentNames.join(", ")) +
                "<br>Columns : " + xcHelper.escapeHTMLSpecialChar(columns);
        return tooltip;
    }

    function getJoinInfo(info, node, value, parentNames, isCollapsedTag,
                        joinSubType) {
        var srcCols = getJoinSrcCols(node, isCollapsedTag);
        var taggedSrcCols;
        if (isCollapsedTag) {
            taggedSrcCols = srcCols;
        } else {
            taggedSrcCols = getJoinSrcCols(node, true);
        }
        node.value.indexedFields = taggedSrcCols;
        var lSrcCols = srcCols.left;
        var rSrcCols = srcCols.right;
        var joinText = "";
        info.text = "Join";
        if (joinSubType) {
            info.subType = joinSubType;
            joinText = joinSubType;
        } else {
            var joinType = value.joinType.slice(0, value.joinType.indexOf("Join"));
            info.subType = joinType;
            if (joinType.indexOf("Outer") > -1) {
                var firstPart = joinType.slice(0, joinType.indexOf("Outer"));
                firstPart = firstPart[0].toUpperCase() + firstPart.slice(1);
                joinText = firstPart + " Outer";
            } else {
                joinText = joinType[0].toUpperCase() + joinType.slice(1);
            }
        }

        info.tooltip = joinText + " Join between table \"" +
                       parentNames[0] + "\" and table \"" +
                       parentNames[1] + "\"";
        var invalidColFound = false;

        if (joinType === "cross") {
            if (value.evalString) {
                info.tooltip += "<br>Filter: " +
                                xcHelper.escapeHTMLSpecialChar(value.evalString);
            } else {
                invalidColFound = false;
            }
        } else {
            var additionalTooltip = " where ";
            for (var i = 0; i < lSrcCols.length; i++) {
                if (i > 0) {
                    additionalTooltip += ", " ;
                }
                additionalTooltip += lSrcCols[i] + " = " + rSrcCols[i];
                if (!lSrcCols[i] || !rSrcCols[i]) {
                    invalidColFound = true;
                    break;
                }
            }
            info.tooltip += xcHelper.escapeHTMLSpecialChar(additionalTooltip);
        }


        if (invalidColFound) {
            info.tooltip = joinText + " Join between table \"" +
                       parentNames[0] + "\" and table \"" +
                       parentNames[1] + "\"";
        }
        info.opText = parentNames[0] + ", " + parentNames[1];

        return info;
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
            } else if (parents[i].value.api === XcalarApisT.XcalarApiGroupBy ||
                       parents[i].value.api === XcalarApisT.XcalarApiJoin) {
                if (i === 0) {
                    lSrcCols.push(getSrcIndex(parents[i].parents[0]));
                } else {
                    rSrcCols.push(getSrcIndex(parents[i].parents[0]));
                }
            }
        }

        return {left: lSrcCols, right: rSrcCols};

        function getSrcIndex(node) {
            if (node.value.api === XcalarApisT.XcalarApiIndex) {
                return node.value.struct.key[0].keyFieldName;
            } else {
                if (!node.parents.length) {
                    // one case is when we reach a retina project node
                    return null;
                }
                return getSrcIndex(node.parents[0]);
            }
        }
    }

    function getUnionSrcCols(node, isCollapsedTag) {
        var srcColSets = [];
        var parents;
        if (isCollapsedTag) {
            parents = getGroupLeaves(node); // gets leaves within a tagged group
        } else {
            for (var i = 0; i < node.value.struct.columns.length; i++) {
                srcColSets[i] = node.value.struct.columns[i].map(function(colInfo) {
                    return colInfo.sourceColumn;
                });
            }

            return srcColSets;
        }

        for (var i = 0; i < parents.length; i++) {
            var parentIndex = i;
            if (parents[i].value.api === XcalarApisT.XcalarApiMap) {
                srcColSets[parentIndex] = parseConcatCols(parents[i]);
            } else if (parents[i].value.api === XcalarApisT.XcalarApiIndex) {
                var cols = [];
                for (var j = 0; j < parents[i].value.struct.key.length; j++) {
                    cols.push(parents[i].value.struct.key[j].name);
                }
                srcColSets[parentIndex] = cols;
            } else if (parents[i].value.api === XcalarApisT.XcalarApiUnion) {
                srcColSets[parentIndex] = parents[i].value.struct.columns[parentIndex].map(function(colInfo) {
                    return colInfo.sourceColumn;
                });
            }
            node.value.struct.columns[parentIndex].forEach(function(colInfo) {
                if (colInfo.sourceColumn === colInfo.destColumn && colInfo.sourceColumn.indexOf("XC_") !== 0) {
                    if (srcColSets[parentIndex].indexOf(colInfo.sourceColumn) === -1) {
                        srcColSets[parentIndex].push(colInfo.sourceColumn);
                    }
                }
            });
        }

        return srcColSets;
    }

    // made only for join, gets leaves within a tagged group
    function getGroupLeaves(node) {
        var tag = node.value.tags[0];
        var leaves = [];
        getLeaves(node);

        function getLeaves(node) {
            for (var i = 0; i < node.parents.length; i++) {
                var parentNode = node.parents[i];
                if (tag && parentNode.value.tags.indexOf(tag) !== -1) {
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
        var filterStrEsc = xcHelper.escapeHTMLSpecialChar(filterStr);

        info.subType = "filter" + abbrFilterType;
        filterType = "";
        var filterTypeMap = {
            "gt": "greater than",
            "ge": "greater than or equal to",
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
            info.tooltip = "Filtered table \"" + parentNames[0] +
                            "\": " + filterStrEsc;
        } else if (filterTypeMap[abbrFilterType]) {
            var filteredOn = filterStr.slice(parenIndex + 1,
                                             filterStr.indexOf(','));
            filteredOn = $.trim(filteredOn);
            filterType = filterTypeMap[abbrFilterType];
            var filterValue = filterStr.slice(filterStr.indexOf(',') + 1,
                                              filterStr.lastIndexOf(')'));
            filterValue = $.trim(filterValue);
            info.opText = filteredOn;
            if (filterType === "regex") {
                info.tooltip = "Filtered table \"" + parentNames[0] +
                               "\" using regex: \"" +
                               filterValue + "\" on " +
                               xcHelper.escapeHTMLSpecialChar(filteredOn) + ".";
            } else if (filterType === "not") {
                filteredOn = filteredOn.slice(filteredOn.indexOf("(") + 1);
                filterValue = filterValue
                                .slice(0, filterValue.lastIndexOf(')'));
                info.opText = filteredOn;
                if (filteredOn.indexOf(")") > -1) {
                    info.tooltip = "Filtered table \"" + parentNames[0] +
                               "\"; where " + xcHelper.escapeHTMLSpecialChar(filteredOn) +
                               " is " + filterType + " " +
                               xcHelper.escapeHTMLSpecialChar(filterValue) + ".";
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
                    info.tooltip = "Filtered table \"" + parentNames[0] +
                                    "\": " + filterStr;
                }

            } else {
                info.tooltip = "Filtered table \"" + parentNames[0] +
                               "\" where " + xcHelper.escapeHTMLSpecialChar(filteredOn) +
                               " is " + filterType + " " +
                               xcHelper.escapeHTMLSpecialChar(filterValue) + ".";
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
            info.tooltip = "Filtered table \"" + parentNames[0] +
                            "\": " + filterStrEsc;
        }

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
        text = xcHelper.escapeHTMLSpecialChar(text);
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
                var func = ColManager.parseFuncString(evals[i].evalString);
                cols = cols.concat(xcHelper.getNamesFromFunc(func));
            }
        }
        return cols;
    }

    /* Generation of dag elements and canvas lines */
    function createCanvas($dagWrap, full) {
        var dagWidth = $dagWrap.find('.dagImage').width() + 130;
        dagWidth = Math.max(400, dagWidth);
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
