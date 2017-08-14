window.Dag = (function($, Dag) {
    var $dagPanel;
    var scrollPosition = -1;
    var dagAdded = false;

    // constants
    var dagTableHeight = 40;
    var smallTableWidth = 26;
    var dagTableOuterHeight = dagTableHeight + 30;
    var dagTableWidth = 214; // includes the blue table and gray operation icon
    var dataStoreWidth = 64;
    var groupOutlineOffset = 20;
    var condenseLimit = 15; // number of tables wide before we allow condensing
    var condenseOffset = 0.3; // condense icon offsets table x-coor by 30%
    var canvasLimit = 32767; // browsers can't support more
    var canvasAreaLimit = 268435456; // browsers can't support more
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
    Dag.construct = function(tableId, tableToReplace, options) {
        var deferred = jQuery.Deferred();
        var table = gTables[tableId];
        var tableName = table.tableName;
        $dagPanel = $('#dagPanel');

        XcalarGetDag(tableName)
        .then(function(dagObj) {
            var oldTableId = xcHelper.getTableId(tableToReplace);
            var isWorkspacePanelVisible = $('#workspacePanel')
                                            .hasClass('active');
            var isDagPanelVisible = !$('#dagPanel').hasClass('xc-hidden');
            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').addClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').removeClass('xc-hidden');
            }

            var addDFTooltip = TooltipTStr.AddDataflow;

            var isTableInActiveWS = false;
            var targetWS;
            if (options.wsId) {
                targetWS = options.wsId;
            } else if (oldTableId) {
                targetWS = WSManager.getWSFromTable(oldTableId);
            } else {
                targetWS = WSManager.getActiveWS();
            }

            if (WSManager.getActiveWS() === targetWS) {
                isTableInActiveWS = true;
            }
            var dagClasses = isTableInActiveWS ? "" : "inActive";
            dagClasses += " worksheet-" + targetWS;
            var outerDag =
                '<div class="dagWrap clearfix ' + dagClasses +
                   '" id="dagWrap-' + tableId + '" data-id="' + tableId + '">' +
                '<div class="header clearfix">' +
                    '<div class="btn infoIcon">' +
                        '<i class="icon xi-info-rectangle"></i>' +
                    '</div>' +
                    '<div class="tableTitleArea">' +
                        '<span>Table: </span>' +
                        '<span class="tableName">' +
                            tableName +
                        '</span>' +
                    '</div>' +
                    '<div class="retinaArea" data-tableid="' +
                        tableId + '">' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" data-original-title="' +
                            addDFTooltip + '" ' +
                        'class="btn btn-small addDataFlow">' +
                            '<i class="icon xi-add-dataflow"></i>' +
                        '</div>' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" title="' +
                            TooltipTStr.NewTabQG + '" ' +
                        'class="btn btn-small newTabImageBtn">' +
                            '<i class="icon xi-open-img-newtab"></i>' +
                        '</div>' +
                        '<div data-toggle="tooltip" data-container="body" ' +
                        'data-placement="top" title="' +
                            TooltipTStr.SaveQG + '" ' +
                        'class="btn btn-small saveImageBtn">' +
                            '<i class="icon xi-save_img"></i>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '</div>';

            if (options.atStartUp) {
                $(".dagArea").append(outerDag);
            } else if (oldTableId) {
                var $oldDag =  $("#dagWrap-" + oldTableId);
                $oldDag.after(outerDag);
            } else {
                var position = xcHelper.getTableIndex(targetWS, options.position,
                                             '.dagWrap');
                if (position === 0) {
                    $(".dagArea").find(".legendArea").after(outerDag);
                } else {
                    var $prevDag = $(".dagWrap:not(.building)")
                                                    .eq(position - 1);
                    if ($prevDag.length) {
                        $prevDag.after(outerDag);
                    } else {
                        $(".dagArea").append(xcTableWrap); // shouldn't happen
                    }
                }
            }

            var $dagWrap = $('#dagWrap-' + tableId);

            Dag.createDagImage(dagObj.node, $dagWrap, {savable: true,
                                                       tableId: tableId});

            Dag.focusDagForActiveTable(tableId);

            // add lock icon to tables that should be locked or not dropped
            applyLockIfNeeded($dagWrap);

            if ($('#xcTableWrap-' + tableId).find('.tblTitleSelected').length) {
                $('.dagWrap.selected').removeClass('selected')
                                      .addClass('notSelected');
                $dagWrap.removeClass('notSelected')
                                        .addClass('selected');
            }

            Dag.addEventListeners($dagWrap);
            if (!dagAdded) {
                preventUnintendedScrolling();
            }

            dagAdded = true;

            if (!isWorkspacePanelVisible) {
                $('#workspacePanel').removeClass('active');
            }
            if (!isDagPanelVisible) {
                $('#dagPanel').addClass('xc-hidden');
            }
            $dagWrap.addClass("building");

            deferred.resolve();
        })
        .fail(function(error) {
            console.error('dag failed', error);
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    Dag.destruct = function(tableId) {
        $('#dagWrap-' + tableId).remove();
        DagFunction.destruct(tableId);
    };

    // options: {savable: boolean}
    Dag.createDagImage = function(nodes, $container, options) {
        options = options || {};
        var lineageStruct;
        var hasError = false;
        var tree;
        var dagDepth;
        var dagImageHtml = "";
        var nodeIdMap = {};
        var yCoors = [0]; // stores list of depths of branch nodes
        // [0, 3, 5] corresponds to these coordinates: {0, 0}, {1, 3}, {2, 5}
        try {
            var lineageStruct = DagFunction.construct(nodes, options.tableId);
            tree = lineageStruct.tree;
            nodeIdMap = lineageStruct.nodeIdMap;
        } catch (err) {
            console.error(err);
            hasError = true;
        }
        var initialY = 0.2;
        var storedInfo = {
            x: 0,
            y: 0,
            height: initialY,
            width: 0,
            heightsDrawn: {0.2: true},
            condensedWidth: 0,
            groups: {},
            datasets: {},
            drawn: {}
        };

        if (!hasError) {
            var depth = 0;
            var condensedDepth = 0;
            dagDepth = getDagDepth(tree);
            var dagOptions = {condensed: dagDepth > condenseLimit};
            var isChildHidden = false; // is parent node in a collapsed state
            var group = [];

            try {
                setNodePositions(tree, storedInfo, depth, condensedDepth,
                                isChildHidden, group, initialY, null,
                                dagOptions);
                if (!storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height--;
                }
                // adjust positions of nodes so that descendents will never be to
                // the left or parallel of their ancestors
                adjustNodePositions(tree, storedInfo);

                condenseHeight(tree, {}, yCoors, 0);
                // get new dagDepth after repositioning
                dagDepth = getDagDepth(tree);
                dagImageHtml += drawDagNode(tree, storedInfo, dagOptions, {});
            } catch (err) {
                console.error(err);
                hasError = true;
            }
        }

        var height = yCoors.length * dagTableOuterHeight + 30;
        var width = storedInfo.condensedWidth * dagTableWidth - 150;

        if (hasError) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.DFDrawError +
                            '</div>';
            $container.addClass('invalid error');
        } else if (height > canvasLimit || width > canvasLimit ||
            (height * width > canvasAreaLimit)) {
            dagImageHtml = '<div class="errorMsg">' + DFTStr.TooLarge +
                            '</div>';
            $container.addClass('tooLarge error');
        } else {
            dagImageHtml = '<div class="dagImageWrap"><div class="dagImage" ' +
                        'style="height: ' + height + 'px;width: ' + width +
                        'px;">' + dagImageHtml + '</div></div>';
        }

        $container.append(dagImageHtml);
        if ($container.find(".unexpectedNode").length) {
            $container.addClass("hasUnexpectedNode");
        }

        if (!$container.hasClass('error')) {
            var numNodes = Object.keys(nodeIdMap).length;
            drawAllLines($container, tree, numNodes, width, options);
        }

        var allDagInfo = {
            tree: tree,
            nodeIdMap: nodeIdMap,
            depth: dagDepth,
            groups: storedInfo.groups,
            condensedWidth: width,
            datasets: storedInfo.datasets
        };
        $container.data('allDagInfo', allDagInfo);
    };

    Dag.renameAllOccurrences = function(oldTableName, newTableName) {
        var $dagPanel = $('#dagPanel');

        $dagPanel.find('.tableName').filter(function() {
            return ($(this).text() === oldTableName);
        }).text(newTableName);

        var $dagTableTitles = $dagPanel.find('.tableTitle').filter(function() {
            return ($(this).text() === oldTableName);
        });
        $dagTableTitles.text(newTableName);
        xcTooltip.changeText($dagTableTitles, newTableName);
        $dagTableTitles.parent().data('tablename', newTableName);
        var $dagOpText = $dagPanel.find(".opInfoText").filter(function() {
            return ($(this).text().indexOf(oldTableName) > -1);
        });

        $dagOpText.text(newTableName);
        var $actionTypes = $dagOpText.closest('.actionType');
        $actionTypes.each(function() {
            var tooltipText = $(this).attr('data-original-title');
            var newText;
            if (tooltipText) {
                var re = new RegExp(oldTableName, "g");
                newText = tooltipText.replace(re, newTableName);
                xcTooltip.changeText($(this), newText);
            }
            var title = $(this).attr('title');
            if (title) {
                newText = title.replace(oldTableName, newTableName);
                $(this).attr('title', newText);
            }
        });
    };

    // nameProvided: boolean, if true, tableId arg is actually a tablename
    Dag.makeInactive = function(tableId, nameProvided) {
        var tableName;
        var $dags;
        $dagPanel = $('#dagPanel');
        if (nameProvided) {
            tableName = tableId;
            $dags = $dagPanel.find('.dagTable[data-tableName="' +
                                   tableName + '"]');
        } else {
            tableName = gTables[tableId].tableName;
            $dags = $dagPanel.find('.dagTable[data-id="' + tableId + '"]');
        }

        $dags.removeClass('Ready')
             .addClass('Dropped');
        var text = xcHelper.replaceMsg(TooltipTStr.DroppedTable,
                                        {"tablename": tableName});
        $dags.find(".dagTableIcon, .dataStoreIcon").each(function() {
            xcTooltip.changeText($(this), text);
        });
    };

    Dag.focusDagForActiveTable = function(tableId, tableFocused) {
        // tableId given only when initial dag is created
        var activeTableId;
        var $dagWrap;
        var $dag;
        $dagPanel = $('#dagPanel');
        if (tableId) {
            activeTableId = tableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');
            $dag.scrollLeft($dag.find('.dagImage').width());
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        } else {
            activeTableId = gActiveTableId;
            $dagWrap = $('#dagWrap-' + activeTableId);
            $dag = $dagWrap.find('.dagImageWrap');

            if (!$dag.length) {
                DagPanel.setScrollBarId($(window).height());
                DagPanel.adjustScrollBarPositionAndSize();
                return;
            }
            if (tableFocused) {
                if (checkIfDagWrapVisible($dagWrap)) {
                    DagPanel.setScrollBarId($(window).height());
                    DagPanel.adjustScrollBarPositionAndSize();
                    return;
                }
            }

            $dag.scrollLeft($dag.find('.dagImage').width());

            var scrollTop = $dagPanel.find('.dagArea').scrollTop();
            var dagTop = $dagWrap.position().top;

            if (dagTop - 95 + $dagPanel.scrollTop() === 0) {
                $dagPanel.scrollTop(0);
            } else {
                $dagPanel.find('.dagArea').scrollTop(scrollTop + dagTop - 16);
            }
            DagPanel.setScrollBarId($(window).height());
            DagPanel.adjustScrollBarPositionAndSize();
        }
    };

    Dag.createSavableCanvas = function($dagWrap) {
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
                    drawExpandIconToCanvas($expandIcon, ctx, top, left, expandImage);
                });

                PromiseHelper.when.apply(window, promises)
                .then(function() {
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

    Dag.expandAll = function($dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var idMap = allDagInfo.nodeIdMap;
        var tree = allDagInfo.tree;
        var groups = allDagInfo.groups;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var depth;
        var size;
        var right;
        var node;
        var groupWidth;
        var $groupOutline;
        var $expandWrap;

        // move the tables
        expandShiftTables(tree, $dagImage);

        // move the group outlines and icons
        for (var i in groups) {
            groups[i].collapsed = false;
            var node = idMap[i];
            depth = node.value.display.depth + 1;
            right = groups[i].group[0].value.display.x + 190;
            $expandWrap = $dagImage.find('.expandWrap[data-index="' + i + '"]');
            $expandWrap.css('right', right).data('depth', depth)
                                           .addClass('expanded');
            xcTooltip.changeText($expandWrap, TooltipTStr.ClickCollapse);
            size = $expandWrap.data('size');
            $groupOutline = $expandWrap.next();
            groupWidth = size * dagTableWidth + 11;
            $groupOutline.css('right', (right + 15) - groupWidth)
                         .addClass('expanded');

        }

        depth = allDagInfo.depth;
        var newWidth = (depth - 1) * dagTableWidth + dataStoreWidth;
        $dagImage.outerWidth(newWidth);

        var collapse = false;
        var all = true;
        updateCanvasAfterWidthChange($dagWrap, tree, newWidth, collapse, all);

        $dagImage.parent().scrollLeft(prevScrollLeft + (newWidth -
                                      dagImageWidth));
    };

    Dag.checkCanExpandAll = function($dagWrap) {
        var currentCanvasHeight = $dagWrap.find('canvas').height();
        var allDagInfo = $dagWrap.data('allDagInfo');
        var depth = allDagInfo.depth;
        var expectedWidth = (depth - 1) * dagTableWidth + dataStoreWidth + 100;

        if (expectedWidth > canvasLimit ||
            (expectedWidth * currentCanvasHeight) > canvasAreaLimit) {
            return (false);
        } else {
            return (true);
        }
    };

    Dag.collapseAll = function($dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var idMap = allDagInfo.nodeIdMap;
        var tree = allDagInfo.tree;
        var groups = allDagInfo.groups;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var depth;
        var size;
        var right;
        var node;
        var $groupOutline;
        var $expandWrap;
        var group;
        var $dagTableWrap;
        var tooltip;

        collapseShiftTables(tree, $dagImage);

        $dagImage.find('.dagTable.dataStore').parent().removeClass('hidden');

        for (var i in groups) {
            groups[i].collapsed = true;
            var node = idMap[i];
            depth = node.value.display.depth + 1;
            group = groups[i].group;
            right = group[0].value.display.x - dataStoreWidth;
            $expandWrap = $dagImage.find('.expandWrap[data-index="' + i + '"]');
            $expandWrap.css('right', right).data('depth', depth)
                                           .removeClass('expanded');

            size = $expandWrap.data('size');

            if (size === 1) {
                tooltip = TooltipTStr.CollapsedTable;
            } else {
                tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables, {
                    number: size + ""
                });
            }
            xcTooltip.changeText($expandWrap, tooltip);

            $groupOutline = $expandWrap.next();
            $groupOutline.css('right', (right - groupOutlineOffset))
                         .addClass('expanded');
            for (var j = 0; j < group.length; j++) {
                node = group[j];
                node.value.display.isHidden = true;
                $dagTableWrap = $dagImage.find('.dagTable[data-index="' +
                                                node.value.dagNodeId + '"]').parent();
                $dagTableWrap.addClass('hidden');
            }
        }

        $dagImage.outerWidth(allDagInfo.condensedWidth);

        var collapse = true;
        var all = true;
        updateCanvasAfterWidthChange($dagWrap, tree, allDagInfo.condensedWidth,
                                     collapse, all);
        $dagImage.parent().scrollLeft(prevScrollLeft +
                                    (allDagInfo.condensedWidth - dagImageWidth));
    };

    Dag.setupDagSchema = function() {
        var $dagSchema = $("#dagSchema");
        $dagSchema.on("mouseup", ".content li", function(event) {
            if (event.which !== 1) {
                return;
            }
            var $li = $(this);
            var $name = $li.find('.name');
            $dagSchema.find('li.selected').removeClass('selected');
            $li.addClass('selected');
            var tableId   = $dagSchema.data('tableid');
            var $dagTable = $dagSchema.data('$dagTable');
            var id        = parseInt($dagTable.data('index'));
            var $dagWrap  = $dagTable.closest('.dagWrap');
            var idMap     = $dagWrap.data('allDagInfo').nodeIdMap;
            var node = idMap[id];
            var name      = $name.text();
            var progCol = gTables[tableId].getColByFrontName(name);
            var backName  = $name.data('backname');
            if (!backName) {
                backName = name;
            }

            var sourceColNames = getSourceColNames(progCol.func);
            $('.columnOriginInfo').remove();
            $dagPanel.find('.highlighted').removeClass('highlighted');
            highlightColumnSource($dagWrap, node);
            var storedInfo = {
                foundTables: {},
                droppedTables: {}
            };

            findColumnSource(sourceColNames, $dagWrap, node, backName,
                            progCol.isEmptyCol(), true, node,
                            storedInfo);
            $(document).mousedown(closeDagHighlight);
        });

        $dagSchema.on("click", '.sort', function() {
            var tableId = $dagSchema.data("tableid");
            var table = gTables[tableId];
            var sortByNode = false;
            var reversed = false;
            var $btn = $(this);
            if ($btn.parent().hasClass("text")) {
                sortByNode = true;
            }
            $dagSchema.find(".subHeader").children().removeClass("active");
            $btn.parent().addClass("active");
            $btn.parent().toggleClass("reversed");
            if ($btn.parent().hasClass("reversed")) {
                reversed = true;
            }

            getSchemaNodeInfo($dagSchema, table, sortByNode, reversed);
        });

        $dagSchema.on("click", ".expand", function() {
            $dagSchema.toggleClass("expanded");
        });

        $dagSchema.find(".close").click(function() {
            hideSchema();
        });

        $dagSchema.draggable({
            handle: '#dagSchemaTitle',
            cursor: '-webkit-grabbing',
            containment: "window"
        });

        $dagSchema.resizable({
            handles: "n, e, s, w, se",
            minHeight: 200,
            minWidth: 200,
            containment: "document"
        });
    };

    Dag.showDataStoreInfo = function($dagTable) {
        var $schema = $('#dagSchema');
        $schema.addClass("loadInfo");
        var tableName = $dagTable.data("tablename");
        var schemaId = Math.floor(Math.random() * 100000);
        $schema.data("id", schemaId);

        $schema.find('.tableName').text(tableName);
        $schema.find('.numCols').text("");
        var datasets = $dagTable.closest(".dagWrap").data().allDagInfo.datasets;
        var loadInfo = datasets[tableName].loadInfo;
        if (loadInfo.format !== "csv") {
            delete loadInfo.loadArgs.csv;
        }
        if (loadInfo.loadArgs && loadInfo.loadArgs.csv) {
            loadInfo.loadArgs.csv.recordDelim =
                    loadInfo.loadArgs.csv.recordDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
            loadInfo.loadArgs.csv.quoteDelim =
                    loadInfo.loadArgs.csv.quoteDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
            loadInfo.loadArgs.csv.fieldDelim =
                    loadInfo.loadArgs.csv.fieldDelim
                    .replace(/\t/g, "\\t").replace(/\n/g, "\\n");
        }

        loadInfo.name = tableName;

        if (loadInfo.numEntries == null || loadInfo.size == null) {
            var dsObj = DS.getDSObj(tableName);
            loadInfo.numEntries = dsObj.getNumEntries();
            loadInfo.size = dsObj.getSize();
        }
        if (loadInfo.numEntries == null || loadInfo.size == null) {
            // XXX todo, this may be cached in DSOBj, and if not we can
            // cache it here
            XcalarGetDatasetMeta(tableName)
            .then(function(res) {
                // check if current schema
                if ($schema.data("id") !== schemaId) {
                    return;
                }
                if (res != null && res.metas != null) {
                    var metas = res.metas;
                    var size = 0;
                    var numRows = 0;
                    // sum up size from all nodes
                    for (var i = 0, len = metas.length; i < len; i++) {
                        size += metas[i].size;
                        numRows += metas[i].numRows;
                    }

                    loadInfo.numEntries = numRows;
                    loadInfo.size = xcHelper.sizeTranslator(size);
                    var html = prettify(loadInfo);
                    $schema.find(".content").html(html);
                }
            });
        }

        var html = prettify(loadInfo);

        $schema.find(".content").addClass("prettyJson").html(html);
        $schema.addClass("active");
        xcTooltip.hideAll();

        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchema').length === 0 &&
                $(event.target).closest('#dagScrollBarWrap').length === 0) {
                hideSchema();
            }
        });

        positionSchemaPopup($dagTable);
    };

    Dag.showSchema = function($dagTable) {
        var tableId = $dagTable.data('id');
        var table = gTables[tableId];
        var $schema = $('#dagSchema');
        $schema.removeClass("loadInfo");
        var tableName;
        var numCols;
        var numRows = CommonTxtTstr.Unknown;
        $schema.data('tableid', tableId);
        $schema.data('$dagTable', $dagTable);
        var schemaId = Math.floor(Math.random() * 100000);
        $schema.data("id", schemaId);
        $schema.find(".content").removeClass("prettyJson");
        if (!table) {
            tableName = $dagTable.find('.tableTitle').text();
            numCols = 1;
        } else {
            tableName = table.tableName;
            numCols = table.tableCols.length;
        }

        if (table) {
            var $sortedOn = $schema.find(".subHeader").children(".active");
            var sortByNode = false;
            var reversed = false;
            if ($sortedOn.hasClass("text")) {
                sortByNode = true;
            }
            if ($sortedOn.hasClass("reversed")) {
                reversed = true;
            }
            getSchemaNodeInfo($schema, table, sortByNode, reversed);
            if (table.resultSetCount > -1) {
                numRows = table.resultSetCount;
                numRows = xcHelper.numToStr(numRows);
            } else {
                numRows = "...";
                getSchemaNumRows($schema, schemaId, tableName, table);
            }
        } else {
            $schema.addClass("noNodeInfo");
            numRows = "...";
            getSchemaNumRows($schema, schemaId, tableName);
        }
        $schema.find('.tableName').text(tableName);
        $schema.find('.numCols').attr('title', CommonTxtTstr.NumCol)
                                   .text('[' + (numCols - 1) + ']');
        $schema.find('.rowCount .value').text(numRows);

        var html = "<ul>";

        for (var i = 0; i < numCols; i++) {
            if (numCols === 1) {
                continue;
            }
            var progCol = table.tableCols[i];
            if (progCol.isDATACol()) {
                continue;
            }
            var type = progCol.getType();
            var name = progCol.getFrontColName(true);
            var backName = progCol.getBackColName();
            html += '<li>' +
                        '<div>' +
                            '<span class="iconWrap">' +
                                '<i class="icon fa-13 xi-' + type + '"></i>' +
                            '</span>' +
                            '<span class="text">' + type + '</span>' +
                        '</div>' +
                        '<div title="' + name + '" class="name" ' +
                        'data-backname="' + backName + '">' +
                            name +
                        '</div>' +
                        // '<div>' +
                        // // XX SAMPLE DATA GOES HERE
                        // '</div>' +
                    '</li>';
        }
        if (numCols === 1) {
            html += '<span class="noFields">' + DFTStr.NoFields + '</span>';
        }
        html += "</ul>";

        $schema.find(".content").html(html);
        $schema.addClass("active");
        xcTooltip.hideAll();

        $(document).on('mousedown.hideDagSchema', function(event) {
            if ($(event.target).closest('#dagSchema').length === 0 &&
                $(event.target).closest('#dagScrollBarWrap').length === 0) {
                hideSchema();
            }
        });

        positionSchemaPopup($dagTable);
    };

    Dag.makeTableNoDelete = function(tableName) {
        var tableId = xcHelper.getTableId(tableName);
        var $dagTables = $("#dagPanel").find('.dagTable[data-id="' +
                                        tableId + '"]');
        $dagTables.addClass("noDelete");
        if (!$dagTables.hasClass("locked")) {
            var lockHTML = '<div class="lockIcon"></div>';
            $dagTables.append(lockHTML);
        }
    };

    Dag.removeNoDelete = function(tableId) {
        var $dagTables = $("#dagPanel").find('.dagTable[data-id="' +
                                        tableId + '"]');
        $dagTables.removeClass('noDelete');
        if (!$dagTables.hasClass("locked")) {
            $dagTables.find('.lockIcon').remove();
        }
    };

    Dag.addEventListeners = function($dagWrap) {
        $dagWrap.on('click', '.expandWrap', function() {
            var $expandIcon = $(this);
            var data = $expandIcon.data();
            var depth = data.depth;
            var index = data.index;
            var $dagWrap = $expandIcon.closest('.dagWrap');
            var groupInfo = $dagWrap.data('allDagInfo').groups[index];
            var group = groupInfo.group;
            var $groupOutline = $expandIcon.next();
            var expandIconRight;
            var newRight;

            if (!$expandIcon.hasClass('expanded')) {
                var canExpand = checkCanExpand(group, depth, index, $dagWrap);
                if (!canExpand) {
                    $dagWrap.addClass('unsavable');
                    xcTooltip.hideAll();
                    StatusBox.show(ErrTStr.DFNoExpand, $expandIcon, false, {
                        type: "info"
                    }) ;
                } else {
                    $expandIcon.addClass('expanded');
                    $groupOutline.addClass('expanded');

                    expandGroup(groupInfo, $dagWrap, $expandIcon);
                    xcTooltip.changeText($expandIcon, TooltipTStr.ClickCollapse);
                }
            } else {
                $expandIcon.removeClass('expanded');
                $groupOutline.removeClass('expanded');

                $groupOutline = $expandIcon.next();
                $groupOutline.removeClass('visible').hide();
                var size = $expandIcon.data('size');
                var tooltip;
                if (size === 1) {
                    tooltip = TooltipTStr.CollapsedTable;
                } else {
                    tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables, {
                        number: size + ""
                    });
                }
                xcTooltip.changeText($expandIcon, tooltip);
                collapseGroup(groupInfo, $dagWrap, $expandIcon);
            }
        });

        var groupOutlineTimeout;
        var $groupOutline = $();

        $dagWrap.on('mouseenter', '.expandWrap.expanded', function() {
            $groupOutline.hide();
            clearTimeout(groupOutlineTimeout);
            $groupOutline = $(this).next();
            $groupOutline.show();
            setTimeout(function() {
                $groupOutline.addClass('visible');
            });
        });
        $dagWrap.on('mouseleave', '.expandWrap.expanded', function() {
            $groupOutline = $(this).next();
            $groupOutline.removeClass('visible');
            groupOutlineTimeout = setTimeout(function() {
                $groupOutline.hide();
            }, 300);
        });

        dagScrollListeners($dagWrap.find('.dagImageWrap'));
    };

    function parseAggFromEvalStr(evalStr) {
        var tables = [];
        if (!evalStr) {
            return tables;
        }
        var func = {args: []};
        try {
            ColManager.parseFuncString(evalStr, func);
            tables = getAggNamesFromFunc(func);
        } catch (err) {
            console.error("could not parse eval str", evalStr);
        }
        return tables;
    }

    function getAggNamesFromFunc(func) {
        var names = [];

        getNames(func.args);

        function getNames(args) {
            for (var i = 0; i < args.length; i++) {
                if (typeof args[i] === "string") {
                    if (args[i][0] !== "\"" &&
                        args[i][args.length - 1] !== "\"" &&
                        names.indexOf(args[i]) === -1 &&
                        args[i][0] === gAggVarPrefix &&
                        args[i].length > 1) {
                        names.push(args[i].slice(1));
                    }
                } else if (typeof args[i] === "object") {
                    getNames(args[i].args);
                }
            }
        }

        return (names);
    }

    function prettify(loadInfo) {
        var html = xcHelper.prettifyJson(loadInfo);
        html = "{\n" + html + "}";
        return html;
    }

    function getSchemaNodeInfo($schema, table, sortByNode, sortReverse) {
        $schema.removeClass('heavySkew slightSkew');
        if (!table.backTableMeta) {
            $schema.addClass("noNodeInfo");
            return;
        }
        $schema.removeClass("noNodeInfo");
        var meta = table.backTableMeta;
        var html = "<ul>";
        var totalRows = table.resultSetCount;
        var infos = [];
        for (var i = 0; i < meta.numMetas; i++) {
            infos.push({
                index: i,
                numRows: meta.metas[i].numRows
            });
        }

        if (sortByNode) {
            if (sortReverse) {
                infos = infos.sort(function(a, b) {
                    return b.index - a.index;
                });
            }
        } else {
            if (sortReverse) {
                infos = infos.sort(function(a, b) {
                    return b.numRows - a.numRows;
                });
            } else {
                infos = infos.sort(function(a, b) {
                    return a.numRows - b.numRows;
                });
            }
        }

        var largest = 0;
        var largestIndex;
        var numMetas = meta.numMetas;
        for (var i = 0; i < numMetas; i++) {
            var numRows = infos[i].numRows;
            var pct = (100 * (numRows / totalRows));
            if (pct > largest) {
                largest = pct;
                largestIndex = i;
            }
            pct = pct.toFixed(1);
            if (pct[pct.length - 1] === "0") {
                pct = pct.slice(0, -2);
            }
            pct += "%";
            if (totalRows === 0) {
                pct = CommonTxtTstr.NA;
            }
            numRows = xcHelper.numToStr(numRows);
            html += '<li>' +
                        '<div>' +
                            infos[i].index +
                        '</div>' +
                        '<div>' +
                            numRows + " (" + pct + ")" +
                        '</div>' +
                    '</li>';
        }

        html += "</ul>";
        $schema.find(".nodeInfoContent").html(html);

        if ((largest - (100 / numMetas)) > (0.25 * 100 / numMetas)) {
            var $li = $schema.find(".nodeInfoContent li").eq(largestIndex);
            if ((largest - (100 / numMetas)) > (0.5 * 100 / numMetas)) {
                $li.addClass("heavy");
                xcTooltip.add($li.find("div").eq(0), {title: DFTStr.HeavySkew});
                xcTooltip.add($li.find("div").eq(1), {title: DFTStr.HeavySkew});
                $li.find("div").attr("data-tipClasses", "zIndex10000");
                $schema.addClass("heavySkew");
            } else {
                $li.addClass("slight");
                xcTooltip.add($li.find("div").eq(0), {title: DFTStr.SlightSkew});
                xcTooltip.add($li.find("div").eq(1), {title: DFTStr.SlightSkew});
                $li.find("div").attr("data-tipClasses", "zIndex10000");
                $schema.addClass("slightSkew");
            }
        }
    }

    function getSchemaNumRows($schema, schemaId, tableName, table) {
        var deferred = jQuery.Deferred();
        XcalarGetTableMeta(tableName)
        .then(function(meta) {
            if ($schema.data("id") !== schemaId) {
                return;
            }

            if (meta != null && meta.metas != null) {
                var metas = meta.metas;
                var numRows = 0;
                // sum up size from all nodes
                for (var i = 0, len = metas.length; i < len; i++) {
                    numRows += metas[i].numRows;
                }
                if (table) {
                    table.resultSetCount = numRows;
                }
                numRows = xcHelper.numToStr(numRows);
                $schema.find('.rowCount .value').text(numRows);
            }

        })
        .fail(function() {
            $schema.find('.rowCount .value').text(CommonTxtTstr.Unknown);
        })
        .always(deferred.resolve);
        return deferred.promise();
    }

    function positionSchemaPopup($dagTable) {
        var $schema = $('#dagSchema');
        var topMargin = 3;
        var top = $dagTable[0].getBoundingClientRect().top + topMargin;
        var left = $dagTable[0].getBoundingClientRect().left - 30;
        var defaultWidth = 300;
        var defaultHeight = 266;
        if ($schema.hasClass("loadInfo")) {
            defaultWidth = 500;
            defaultHeight = 530;
        }

        $schema.css("width", "auto");
        var width = Math.min(defaultWidth, $schema.outerWidth());
        width = Math.max(230, width);
        $schema.width(width);

        $schema.css("height", "auto");
        var height = Math.min(defaultHeight, $schema.outerHeight());
        height = Math.max(200, height);
        $schema.height(height);

        left = Math.max(2, left);
        top = Math.max(2, top - height); // at least 2px from the top

        $schema.css({'top': top, 'left': left});

        var rightBoundary = $(window).width() - 5;

        if ($schema[0].getBoundingClientRect().right > rightBoundary) {
            left = rightBoundary - $schema.width();
            $schema.css('left', left);
        }

        // ensure dropdown menu is above the bottom of the dag panel
        var dagPanelBottom = $('#workspacePanel')[0].getBoundingClientRect()
                                                    .bottom;
        var menuBottom = $schema[0].getBoundingClientRect().bottom;
        if (menuBottom > dagPanelBottom) {
            $schema.css('top', '-=' + ($schema.height() + 35));
        }
    }

    function hideSchema() {
        $('#dagSchema').removeClass("active");
        $(document).off('.hideDagSchema');
    }

    function applyLockIfNeeded($dagWrap) {
        var $table;
        var tId;
        var table;
        var isLocked;
        var noDelete;
        var needsIcon;
        var lockHTML = '<div class="lockIcon"></div>';
        $dagWrap.find(".dagTable").each(function() {
            $table = $(this);
            tId = $table.data('id');
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

    function loadImage(img) {
        var deferred = jQuery.Deferred();
        img.onload = function() {
            deferred.resolve();
        };
        img.onerror = img.onload;
        return (deferred.promise());
    }

    function expandGroup(groupInfo, $dagWrap, $expandIcon) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var tree = allDagInfo.tree;
        var group = groupInfo.group;
        var $dagImage = $dagWrap.find('.dagImage');
        var dagImageWidth = $dagImage.outerWidth();
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var numGroupNodes = group.length;
        var numHiddenTags = 0;
        for (var i = 0; i < numGroupNodes; i++) {
            if (group[i].value.display.isHiddenTag) {
                numHiddenTags++;
            }
        }
        var allAncestors = getAllAncestors(group[numGroupNodes - 1]);
        var storedInfo = {
            width: dagImageWidth,
            groupLen: numGroupNodes,
            numHiddenTags: numHiddenTags,
            groupParent: group[0].parents[0],
            seen: {},
            groupShift: numGroupNodes - numHiddenTags - condenseOffset,
            allAncestors: allAncestors
        };
        var horzShift = -(dagTableWidth * condenseOffset);
        var $collapsedTables = $();
        for (var i = 0; i < numGroupNodes; i++) {
            $collapsedTables = $collapsedTables.add(
                        $dagImage.find('.dagTable[data-index=' +
                                        group[i].value.dagNodeId + ']')
                        .parent());
        }

        groupInfo.collapsed = false;
        var groupCopy = [];
        for (var i = 0; i < group.length; i++) {
            groupCopy.push(group[i]);
        }

        expandGroupHelper(groupCopy, group[numGroupNodes - 1], $dagWrap,
                          horzShift, storedInfo);

        var newWidth = storedInfo.width;

        $dagImage.outerWidth(newWidth);
        $dagImage.parent().scrollLeft(prevScrollLeft);

        var collapse = false;
        var all = false;
        updateCanvasAfterWidthChange($dagWrap, tree, newWidth, collapse,
                                          all);

        var discoverTimeout;
        var glowTimeout = setTimeout(function() {
            $collapsedTables.removeClass('glowing');
            discoverTimeout = setTimeout(function() {
                $collapsedTables.removeClass('discovered');
            }, 4000);
            $expandIcon.data('discoverTimeout', discoverTimeout);
        }, 2000);

        clearTimeout($expandIcon.data('glowTimeout'));
        clearTimeout($expandIcon.data('discoverTimeout'));
        $expandIcon.data('glowTimeout', glowTimeout);

        var expandIconRight = parseFloat($expandIcon.css('right'));
        var newRight = expandIconRight + ((group.length - numHiddenTags) *
                                            dagTableWidth) - 24;
        $expandIcon.css('right', newRight);
    }

    // starting from the rightmost table in a hidden group, we increase the
    // x-coor for each table going from child to parent
    function expandGroupHelper(group, node, $dagWrap, horzShift, storedInfo) {
        if (storedInfo.seen[node.value.dagNodeId]) {
            return;
        }
        storedInfo.seen[node.value.dagNodeId] = true;
        var groupIndex = group.indexOf(node);
        var nodeX = node.value.display.x;
        var $dagTable = $dagWrap.find('.dagTable[data-index=' +
                                        node.value.dagNodeId + ']');
        if (groupIndex > -1) {
            $dagTable.parent().removeClass('hidden').addClass('discovered glowing');
            node.value.display.isHidden = false;

            if (!node.value.display.isHiddenTag) {
                nodeX += horzShift;
                horzShift += dagTableWidth;
                // adjust all execept right-most node
                if (!node.value.display.hiddenLeader) {
                    node.value.display.depth += (storedInfo.groupLen -
                                                group.length -
                                                condenseOffset);
                }
            }

            group.splice(groupIndex, 1);
        } else {
            nodeX += horzShift;
            if (node.value.display.isParentHidden) {
                var $expandIcon = $dagWrap.find('.expandWrap[data-index=' +
                                                node.value.dagNodeId + ']');
                var expandIconRight = parseFloat($expandIcon.css('right'));
                $expandIcon.css('right', (expandIconRight + horzShift));
                $expandIcon.data('depth', $expandIcon.data('depth') +
                                          storedInfo.groupShift);
                var $groupOutline = $expandIcon.next();
                var groupRight = parseFloat($groupOutline.css('right'));
                $groupOutline.css('right', (groupRight + horzShift));
            }
            node.value.display.depth += storedInfo.groupShift;
        }
        node.value.display.x = nodeX;
        $dagTable.parent().css('right', nodeX);
        storedInfo.width = Math.max(storedInfo.width, nodeX + dataStoreWidth);

        var numParents = node.parents.length;
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];

            // check if there's enough space for branch section to expand without
            // having to move parent table
            if (!group.length && parentNode.children.length > 1 &&
                !storedInfo.multiParentFound) {

                storedInfo.multiParentFound = true;
                var children = parentNode.children;
                var parallelBranchIsAncestor = false;
                for (var j = 0; j < children.length; j++) {
                    if (children[j] !== node &&
                        storedInfo.allAncestors[children[j].value.dagNodeId]) {
                        parallelBranchIsAncestor = true;
                        break;
                    }
                }
                if (!parallelBranchIsAncestor) {
                    var diff = node.value.display.depth + 1 -
                                parentNode.value.display.depth;

                    if (diff < 0) {
                        return;
                    } else {
                        storedInfo.groupShift = diff;
                        horzShift = diff * dagTableWidth;
                    }
                }
            }

            expandGroupHelper(group, parentNode, $dagWrap,
                               horzShift, storedInfo);
        }
    }

    function collapseGroup(groupInfo, $dagWrap, $expandIcon) {
        groupInfo.collapsed = true;
        var allDagInfo = $dagWrap.data('allDagInfo');
        var tree = allDagInfo.tree;
        var group = groupInfo.group;
        var $dagImage = $dagWrap.find('.dagImage');
        var prevScrollLeft = $dagImage.parent().scrollLeft();
        var numGroupNodes = group.length;
        var numHiddenTags = 0;
        for (var i = 0; i < numGroupNodes; i++) {
            if (group[i].value.display.isHiddenTag) {
                numHiddenTags++;
            }
        }
        var allAncestors = getAllAncestors(group[numGroupNodes - 1]);

        var storedInfo = {
            "width": 0,
            "groupLen": numGroupNodes,
            numHiddenTags: numHiddenTags,
            seen: {},
            groupParent: group[0].parents[0],
            groupShift: numGroupNodes - numHiddenTags - condenseOffset,
            allAncestors: allAncestors
        };

        var horzShift = (dagTableWidth * condenseOffset);
        var groupCopy = [];
        for (var i = 0; i < group.length; i++) {
            groupCopy.push(group[i]);
        }

        collapseGroupHelper(groupCopy, group[numGroupNodes - 1], $dagWrap,
                          horzShift, storedInfo);

        var newWidth = 0;
        $dagWrap.find('.dagTable.dataStore').each(function() {
            var right = parseFloat($(this).parent().css('right'));
            newWidth = Math.max(newWidth, right + dataStoreWidth);
        });

        $dagImage.outerWidth(newWidth);
        $dagImage.parent().scrollLeft(prevScrollLeft);
        var collapse = true;
        var all = false;
        updateCanvasAfterWidthChange($dagWrap, tree, newWidth, collapse, all);

        var expandIconRight = parseFloat($expandIcon.css('right'));
        var newRight = expandIconRight -
                           ((group.length - numHiddenTags) * dagTableWidth) +
                           Math.round(0.11 * dagTableWidth);
                $expandIcon.css('right', newRight);
    }

    function collapseGroupHelper(group, node, $dagWrap, horzShift, storedInfo) {
        if (storedInfo.seen[node.value.dagNodeId]) {
            return;
        }
        storedInfo.seen[node.value.dagNodeId] = true;
        var groupIndex = group.indexOf(node);
        var nodeX = node.value.display.x;
        var $dagTable = $dagWrap.find('.dagTable[data-index=' +
                                        node.value.dagNodeId + ']');
        // node is part of the collapsing group
        if (groupIndex > -1) {
            $dagTable.parent().addClass('hidden');
            node.value.display.isHidden = true;
            if (!node.value.display.isHiddenTag) {
                horzShift -= dagTableWidth;
                nodeX += (horzShift + dagTableWidth);

                if (!node.value.display.hiddenLeader) {
                    node.value.display.depth -= (storedInfo.groupLen -
                                                group.length -
                                                condenseOffset);
                }
            }

            group.splice(groupIndex, 1);

        } else {
            if (node.value.display.isParentHidden) {
                var $expandIcon = $dagWrap.find('.expandWrap[data-index=' +
                                                 node.value.dagNodeId + ']');
                var expandIconRight = parseFloat($expandIcon.css('right'));
                $expandIcon.css('right', (expandIconRight + horzShift));
                $expandIcon.data('depth', $expandIcon.data('depth') -
                                          (storedInfo.groupShift));
                var $groupOutline = $dagWrap.find('.groupOutline[data-index=' +
                                                    node.value.dagNodeId + ']');
                var groupRight = parseFloat($groupOutline.css('right'));
                $groupOutline.css('right', (groupRight + horzShift));

            }
            nodeX += horzShift;
            node.value.display.depth -= storedInfo.groupShift;
        }

        node.value.display.x = nodeX;
        $dagTable.parent().css('right', nodeX);

        var numParents = node.parents.length;
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];

            // prevent parent table from moving in if there's a parallel
            // branch that is not condensing
            if (!group.length && parentNode.children.length > 1) {
                for (var j = 0; j < parentNode.children.length; j++) {
                    var child = parentNode.children[j];
                    if (!storedInfo.allAncestors[child.value.dagNodeId]) {
                        var diff = parentNode.value.display.depth -
                                    storedInfo.groupShift -
                                   child.value.display.depth;
                        if (diff < 1) {
                            storedInfo.groupShift -= (1 - diff);
                            horzShift += ((1 - diff) * dagTableWidth);
                        }
                    }
                }
            }
            collapseGroupHelper(group, parentNode, $dagWrap,
                               horzShift, storedInfo);
        }
    }

    function expandShiftTables(node, $dagImage) {
        node.value.display.isHidden = false;
        if (node.value.display.x !==
            node.value.display.expandedDepth * dagTableWidth) {
            node.value.display.depth = node.value.display.expandedDepth;
            node.value.display.x = node.value.display.expandedDepth *
                                   dagTableWidth;
            $dagImage.find('.dagTable[data-index="' + node.value.dagNodeId + '"]')
                     .parent()
                     .css('right', node.value.display.x).removeClass('hidden');

        }
        for (var i = 0; i < node.parents.length; i++) {
            expandShiftTables(node.parents[i], $dagImage);
        }
    }

    function collapseShiftTables(node, $dagImage) {
        var newX;
        if (node.value.display.hiddenLeader) {
            newX = (node.value.display.condensedDepth + condenseOffset) * dagTableWidth;
        } else {
            newX = node.value.display.condensedDepth * dagTableWidth;
        }

        if (node.value.display.x !== newX) {
            node.value.display.x = newX;
            node.value.display.depth = node.value.display.condensedDepth;
            $dagTableWrap = $dagImage.find('.dagTable[data-index="' +
                                        node.value.dagNodeId + '"]').parent();
            $dagTableWrap.css('right', node.value.display.x);
        }
        for (var i = 0; i < node.parents.length; i++) {
            collapseShiftTables(node.parents[i], $dagImage);
        }
    }

    function updateCanvasAfterWidthChange($dagWrap, tree, newWidth, collapse,
                                          all) {
        var $dagImage = $dagWrap.find('.dagImage');
        $dagWrap.find('canvas').eq(0).remove();
        xcTooltip.hideAll();
        DagPanel.adjustScrollBarPositionAndSize();

        var canvas = createCanvas($dagWrap);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();

        if (collapse) {
            traverseAndDrawLines($dagImage, ctx, tree, newWidth, {});
        } else { // expanding
            traverseAndDrawLines($dagImage, ctx, tree, newWidth, {}, all);
        }

        ctx.stroke();
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
            iconLeft -= 2;
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
            if (iconSourceSplit[i].indexOf('xi-') === 0) {
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

    function drawExpandIconToCanvas($expandIcon, ctx, top, left, img) {
        ctx.drawImage(img, left + 35, top + 53);
        ctx.beginPath();
        ctx.lineWidth = strokeWidth;
        ctx.strokeStyle = lineColor;
        ctx.stroke();
    }

    function checkIfDagWrapVisible($dagWrap) {
        $dagPanel = $('#dagPanel');
        if (!$dagWrap.is(':visible')) {
            return (false);
        }
        if ($dagPanel.hasClass('hidden')) {
            return (false);
        }
        var $dagArea = $dagPanel.find('.dagArea');
        var dagHeight = $dagWrap.height();
        var dagAreaHeight = $dagArea.height();
        var dagTop = $dagWrap.position().top;

        if (dagTop + 30 > dagAreaHeight || dagTop + dagHeight < 50) {
            return (false);
        }
        return (true);
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

    function checkCanExpand(group, depth, id, $dagWrap) {
        var allDagInfo = $dagWrap.data('allDagInfo');
        var nodes = allDagInfo.tree;
        var currentCanvasWidth = $dagWrap.find('canvas').width();
        var currentCanvasHeight = $dagWrap.find('canvas').height();
        var savedInfo = {depth: depth};
        var node = allDagInfo.nodeIdMap[id];
        checkExpandHelper(node, id, nodes, savedInfo);
        var expectedWidth = (group.length + savedInfo.depth) * dagTableWidth +
                            100;
        expectedWidth = Math.max(currentCanvasWidth, expectedWidth);
        if (expectedWidth > canvasLimit ||
            (expectedWidth * currentCanvasHeight) > canvasAreaLimit) {
            return (false);
        } else {
            return (true);
        }
    }

    function checkExpandHelper(node, savedInfo) {
        if (node.parents.length === 0) {
            savedInfo.depth = Math.max(node.value.display.depth,
                                       savedInfo.depth);
        } else {
            for (var i = 0; i < node.parents.length; i++) {
                checkExpandHelper(node.parents[i], savedInfo);
            }
        }
    }

    function preventUnintendedScrolling() {
        var winHeight;
        var vertScrolling = false;
        var vertScrollingTimeout;
        $('.dagArea').scroll(function() {
            if (!vertScrolling) {
                if ($('#dagSchema').is(':visible') && scrollPosition > -1) {
                    $(this).scrollTop(scrollPosition);
                    return;
                }
                if ($('.menu').is(':visible')) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                }
                vertScrolling = true;
                winHeight = $(window).height();
            }
            clearInterval(vertScrollingTimeout);
            vertScrollingTimeout = setTimeout(function() {
                vertScrolling = false;
            }, 300);

            DagPanel.setScrollBarId(winHeight);
            DagPanel.adjustScrollBarPositionAndSize();
        });
    }

    function dagScrollListeners($dagImageWrap) {
        var winHeight;
        var horzScrolling = false;
        var horzScrollingTimeout;

        $dagImageWrap.scroll(function() {
            if (gMouseEvents.getLastMouseDownTarget().attr('id') ===
                "dagScrollBarWrap") {
                return;
            }
            if (!horzScrolling) {
                horzScrolling = true;
                winHeight = $(window).height();
                DagPanel.setScrollBarId(winHeight);
                if ($('.menu').is(':visible')) {
                    $('.menu').hide();
                    xcMenu.removeKeyboardNavigation();
                }
            }
            clearInterval(horzScrollingTimeout);
            horzScrollingTimeout = setTimeout(function() {
                horzScrolling = false;
            }, 300);

            DagPanel.adjustScrollBarPositionAndSize();
        });

        var wheeling = false;
        var wheelTimeout;
        $dagImageWrap.on('mousewheel', function() {
            if (!wheeling) {
                wheeling = true;
                gMouseEvents.setMouseDownTarget($(this));
            }
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(function() {
                wheeling = false;
            }, 100);
        });
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

    function getRenamedColName(colName, node) {
        if (node.value.struct.renameMap && node.value.struct.renameMap.length) {
            var renameMap = node.value.struct.renameMap;
            var parsedName = xcHelper.parsePrefixColName(colName);

            for (var i = 0; i < renameMap.length; i++) {
                if (renameMap[i].type === DfFieldTypeT.DfFatptr) {
                    if (parsedName.prefix &&
                        renameMap[i].newName === parsedName.prefix) {
                        return xcHelper.getPrefixColName(renameMap[i].oldName,
                                                         parsedName.name);
                    }
                } else if (renameMap[i].newName === colName) {
                    return renameMap[i].oldName;
                }
            }
        }
        return colName;
    }

    function closeDagHighlight(event) {
        var $target = $(event.target);
        if ($target.hasClass('dagImageWrap')) {
            var bottom = $target[0].getBoundingClientRect().bottom;
            if (event.pageY > (bottom - 20)) {
                // click is occuring on the scrollbar
                return;
            }
        } else if ($target.closest('#dagSchema').length) {
            return;
        } else if ($target.closest('#dagScrollBarWrap').length) {
            return;
        }

        $('.columnOriginInfo').remove();
        $dagPanel.find('.highlighted').removeClass('highlighted');
        $(document).off('mousedown', closeDagHighlight);
    }

    // sourceColNames is an array of the names we're searching for lineage
    // origNode is the last descendent node known to contain the col
    function findColumnSource(sourceColNames, $dagWrap, node,
                              curColName, isEmptyCol, prevFound, origNode,
                              storedInfo) {
        var parentNodes = getSourceTables(curColName, node);
        curColName = getRenamedColName(curColName, node);
        var parentNode;
        var parentName;
        var tableName;
        var isEmpty;
        var found = false;
        // look through the parent tables
        for (var i = 0; i < parentNodes.length; i++) {
            parentNode = parentNodes[i];
            parentName = parentNode.value.name;
            var table;

            // ignore endpoings
            if (parentNode.value.numParents > 0) {
                table = gTables[xcHelper.getTableId(parentName)];
            }

            if (table) {
                var cols = table.tableCols;
                var foundSameColName = false; // if found column with same
                // backName as curColName
                var colCreatedHere = false; // if this is the first place
                // where descendent column has no value

                // make a copy so we have original for every table iteration
                var sourceColNamesCopy = xcHelper.deepCopy(sourceColNames);
                for (var j = 0; j < cols.length; j++) {
                    // skip DATA COL
                    if (cols[j].isDATACol()) {
                        continue;
                    }
                    var srcNames;
                    var backColName = cols[j].getBackColName() ||
                                      cols[j].getFrontColName();
                    //XX backColName could be blank

                    // check if table has column of the same name
                    if (!foundSameColName && backColName === curColName) {
                        foundSameColName = true;
                        srcNames = getSourceColNames(cols[j].func);
                        found = true;
                        storedInfo.foundTables[parentNode.value.dagNodeId] = true;
                        isEmpty = cols[j].isEmptyCol();
                        findColumnSource(srcNames, $dagWrap, parentNode,
                                            backColName,
                                            isEmpty, found, origNode, storedInfo);

                        colCreatedHere = cols[j].isEmptyCol() && !isEmptyCol;
                        if (colCreatedHere) {
                            // this table is where the column became non-empty,
                             // continue and look through sourceColNames for
                             // the origin column
                        } else {
                            break;
                        }
                    } else {
                        // table doesn't have column of that name but check if
                        // table has column that matches target column's
                        // derivatives
                        var colNameIndex = sourceColNamesCopy
                                                        .indexOf(backColName);
                        if (colNameIndex > -1) {
                            srcNames = getSourceColNames(cols[j].func);

                            sourceColNamesCopy.splice(colNameIndex, 1);
                            isEmpty = cols[j].isEmptyCol();
                            found = true;
                            storedInfo.foundTables[parentNode.value.dagNodeId] = true;
                            findColumnSource(srcNames, $dagWrap, parentNode,
                                            backColName,
                                            isEmpty, found, origNode, storedInfo);

                        }
                    }

                    if (sourceColNamesCopy.length === 0 && colCreatedHere) {
                        break;
                    }
                }
            } else if (parentNode.value.numParents) {
                // gTable doesn't exist so we move on to its parent
                var $dagTable = $dagWrap.find('.dagTable[data-index="' +
                                            parentNode.value.dagNodeId + '"]');
                if ($dagTable.hasClass('Dropped')) {
                    var newOrigNode = origNode;
                    if (prevFound) {
                        newOrigNode = node;
                    }
                    storedInfo.droppedTables[parentNode.value.dagNodeId] = true;
                    findColumnSource(sourceColNames, $dagWrap, parentNode,
                                     curColName, false, false, newOrigNode,
                                     storedInfo);
                } else {
                    // table has no data, could be orphaned
                }
            } else if (!isEmptyCol && prevFound) {
                // has no parents, must be a dataset
                storedInfo.foundTables[parentNode.value.dagNodeId] = true;
                highlightAncestors($dagWrap, parentNode, origNode,
                            storedInfo.foundTables, storedInfo.droppedTables);
                found = true;
            }
        }
        if (!found && prevFound) {
            highlightAncestors($dagWrap, node, origNode,
                            storedInfo.foundTables, storedInfo.droppedTables);
        }
    }

    function getSourceTables(colName, node) {
        // only joins should have renameMap, will have 2 parents
        if (node.value.struct.renameMap && node.value.struct.renameMap.length) {
            var renameMap = node.value.struct.renameMap;
            var parents = node.parents;
            if (node.parents[0].value.name === node.parents[1].value.name) {
                return parents;
            }
            var parsedName = xcHelper.parsePrefixColName(colName);
            for (var i = 0; i < renameMap.length; i++) {
                if (renameMap[i].type === DfFieldTypeT.DfFatptr) {
                    if (parsedName.prefix) {
                        if (renameMap[i].newName === parsedName.prefix) {
                            if (i >= node.value.struct.numLeftColumns) {
                                return [parents[1]];
                            } else {
                                return [parents[0]];
                            }
                        } else if (renameMap[i].oldName === parsedName.prefix) {
                            if (i >= node.value.struct.numLeftColumns) {
                                return [parents[0]];
                            } else {
                                return [parents[1]];
                            }
                        }
                    }
                } else if (renameMap[i].newName === colName) {
                    if (i >= node.value.struct.numLeftColumns) {
                        return [node.parents[1]];
                    } else {
                        return [node.parents[0]];
                    }
                } else if (renameMap[i].oldName === colName) {
                    if (i >= node.value.struct.numLeftColumns) {
                        return [node.parents[0]];
                    } else {
                        return [node.parents[1]];
                    }
                }
            }
        }
        return node.parents;
    }

    // returns a map of ids
    function getAllAncestors(node) {
        var allAncestors = {};
        search(node);

        function search(node) {
            for (var i = 0; i < node.parents.length; i++) {
                search(node.parents[i]);
                allAncestors[node.parents[i].value.dagNodeId] = true;
            }
        }
        return allAncestors;
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
        var numChildren = node.children.length;
        if (numChildren === 1) {
            isHiddenTag = true;
        } else {
            isHiddenTag = true;
            for (var i = 0; i < numChildren; i++) {
                var child = node.children[i];
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

    function highlightColumnSource($dagWrap, node) {
        var $dagTable = $dagWrap.find('.dagTable[data-index="' +
                                        node.value.dagNodeId + '"]');
        $dagTable.addClass("highlighted");

        // XX showing column name on each table is disabled

        // var id = $dagTable.data('id');

        // var rect = $dagTable[0].getBoundingClientRect();
        // if ($dagWrap.find('.columnOriginInfo[data-id="' + id + '"]')
        //             .length === 0) {
        //     var top = rect.top - 15;
        //     var left = rect.left;
        //     top -= $('#dagPanel').offset().top;
        //     $dagWrap.append('<div class="columnOriginInfo " data-id="' + id +
        //         '" style="top: ' + top + 'px;left: ' + left + 'px">' +
        //         name + '</div>');
        // }
    }

    function highlightAncestors($dagWrap, node, origNode, allAncestors,
                                droppedTables) {
        if (node === origNode) {
            return;
        }

        highlightSources(node);

        function highlightSources(node) {
            if (!allAncestors[node.value.dagNodeId] &&
                !droppedTables[node.value.dagNodeId]) {
                return;
            }
            highlightColumnSource($dagWrap, node);
            for (var i = 0; i < node.children.length; i++) {
                highlightSources(node.children[i]);
            }
        }
    }

    // calculates position of nodes and if they're hidden
    function setNodePositions(node, storedInfo, depth, condensedDepth,
                             isChildHidden, group, yCoor, currTag, options) {
        var numParents = node.parents.length;
        var numChildren = node.children.length;
        var accumulatedDrawings = "";
        var newCondensedDepth = condensedDepth;
        var isTagHeader = false;
        var tags = getTags(node);
        var tagHeader = checkIsTagHeader(tags, node.value.name);
        node.value.tags = tags;
        node.value.display.isChildHidden = isChildHidden;

        if (tagHeader) {
            isTagHeader = true;
            currTag = tagHeader;
            node.value.display.tagHeader = true;
        } else if (tags.indexOf(currTag) === -1) {
            currTag = null;
        }

        if ((tags.indexOf(currTag) > -1) && !isTagHeader) {
            node.value.display.isHiddenTag = checkIsNodeHiddenTag(tags, node);
        } else {
            node.value.display.isHiddenTag = false;
        }

        // do not hide if child is hidden
        if (options.condensed && nodeShouldBeCondensed(node)) {
            node.value.display.isHidden = true;

            // first node in a group of hidden nodes
            if (!isChildHidden) {
                newCondensedDepth += condenseOffset;
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

        storedInfo.condensedWidth = Math.max(storedInfo.condensedWidth,
                                             newCondensedDepth);

        // recursive call of setNodePosition on node's parents
        for (var i = 0; i < numParents; i++) {
            var parentNode = node.parents[i];
            if (!storedInfo.drawn[parentNode.value.dagNodeId]) {
                if (i > 0 && storedInfo.heightsDrawn[storedInfo.height]) {
                    storedInfo.height++;
                }
                setNodePositions(parentNode, storedInfo, newDepth,
                               newCondensedDepth, node.value.display.isHidden,
                               group, storedInfo.height, currTag, options);
            }
        }

        storedInfo.drawn[node.value.dagNodeId] = true;


        node.value.display.x = Math.round(condensedDepth * dagTableWidth);
        node.value.display.y = Math.round(yCoor * dagTableOuterHeight);
        node.value.display.depth = condensedDepth;
        node.value.display.expandedDepth = depth;
        node.value.display.condensedDepth = condensedDepth;

        if (node.value.display.isHidden) {
            group.push(node); // push hidden node into group
            if (!isChildHidden) {
                // furthest to the right of all the hidden tables in its group
                node.value.display.hiddenLeader = true;
                node.value.display.x += (condenseOffset * dagTableWidth);
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
        }
    }

    // XXX can optimize this function
    // adjust positions of nodes so that descendents will never be to the left
    // or parallel of their ancestors
    function adjustNodePositions(node, storedInfo) {
        for (var i = 0; i < node.parents.length; i++) {
            var parent = node.parents[i];
            if (!node.value.display.isHidden &&
                !node.value.display.isHiddenTag &&
                node.value.display.depth > parent.value.display.depth - 1) {
                var diff = node.value.display.depth -
                           parent.value.display.depth;
                var expandDiff = node.value.display.expandedDepth -
                                 parent.value.display.expandedDepth;
                var seen = {};
                adjustNodePositionsHelper(parent, diff + 1,
                                          expandDiff + 1, storedInfo, seen);
            }
            adjustNodePositions(parent, storedInfo);
        }
    }


    function adjustNodePositionsHelper(node, amount, expandAmount, storedInfo,
                                       seen) {
        if (seen[node.value.dagNodeId]) {
            return;
        }
        seen[node.value.dagNodeId] = true;
        node.value.display.condensedDepth += amount;
        node.value.display.depth += amount;
        node.value.display.expandedDepth += expandAmount;
        node.value.display.x += (amount * dagTableWidth);

        storedInfo.condensedWidth = Math.max(storedInfo.condensedWidth,
                                             node.value.display.depth + 1);
        for (var i = 0; i < node.parents.length; i++) {
            adjustNodePositionsHelper(node.parents[i], amount, expandAmount,
                                      storedInfo, seen);
        }
    }

    // this function allows separate branches to share the same y coor as long
    // as none of the nodes overlap. We check to see if the left side of a
    // branch overlaps with the right side of an existing branch
    // "coors" stores list of depths of branch nodes
    // [0, 3, 5] corresponds to these coordinates: {0, 0}, {1, 3}, {2, 5}
    function condenseHeight(node, seen, coors, YCoor) {
        seen[node.value.dagNodeId] = true;
        node.value.display.y = Math.round((YCoor + 0.2) * dagTableOuterHeight);
        for (var i = 0; i < node.parents.length; i++) {
            var parentNode = node.parents[i];
            var nextYCoor = YCoor + i;
            if (!seen[parentNode.value.dagNodeId]) {
                if (i > 0) {
                    var branchDepth = getDagDepthPostPositioning(parentNode,
                                                                 seen);
                    var leafDepth = branchDepth + node.value.display.depth;
                    for (var j = coors.length - 1; j >= 0; j--) {
                        if (leafDepth + 1 > coors[j]) {
                            nextYCoor = j + 1;
                            break;
                        }
                    }
                    coors[nextYCoor] = parentNode.value.display.depth;
                }
                condenseHeight(parentNode, seen, coors, nextYCoor);
            }
        }
    }

    function drawDagNode(node, storedInfo, options, drawn) {
        var html = "";
        html += drawDagTable(node, node.value.display.isChildHidden, storedInfo,
                                node.value.display.y, node.value.display.x,
                                options);
        drawn[node.value.dagNodeId] = true;
        if (node.value.display.isHidden && !node.value.display.isChildHidden) {
            var groupId = node.children[0].value.dagNodeId;
            var group = storedInfo.groups[groupId];
            var numHidden = group.numHiddenTags;
            group = group.group;
            var right = node.value.display.x - (condenseOffset * dagTableWidth);
            html += getCollapsedHtml(group, node.value.display.y, right,
                                        node.value.display.condensedDepth,
                                         groupId, numHidden);
        }

        for (var i = 0; i < node.parents.length; i++) {
            var parent = node.parents[i];
            if (!drawn[parent.value.dagNodeId]) {
                html += drawDagNode(parent, storedInfo, options, drawn);
            }
        }

        return html;
    }

    function drawDagTable(node, isChildHidden, storedInfo, top, right, options)
    {
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

        if (options.condensed && node.value.display.isHidden) {
            outerClasses += "hidden ";
        }
        if (node.value.display.isHiddenTag) {
            outerClasses += "tagHidden ";
        }

        var dagOpHtml = getDagOperationHtml(node, dagInfo);
        html += '<div class="dagTableWrap clearfix ' + outerClasses + '" ' +
                        'style="top:' + top + 'px;' +
                        'right: ' + right + 'px;">'+
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
            var tId = dagInfo.id;
            var originalTableName = tableName;
            var dsText = "";
            if (tableName.indexOf(gDSPrefix) === 0) {
                tableName = tableName.substr(gDSPrefix.length);
            }
            if (node.value.api === XcalarApisT.XcalarApiExecuteRetina) {
                tableClasses += "retina ";
                tId = xcHelper.getTableId(tableName);
            } else if (node.value.api === XcalarApisT.XcalarApiBulkLoad) {
                dsText = "Dataset ";
                icon = 'xi_data';
                storedInfo.datasets[tableName] = dagInfo;
                pattern = dagInfo.loadInfo.loadArgs.fileNamePattern;
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
                        'data-url="' + encodeURI(dagInfo.url) + '" ' +
                        'data-pattern="' + encodeURI(pattern) + '"';
            tableTitle = dsText + tableName;
            tableTitleTip = tableName;
        } else {
            if (node.value.struct.icvMode) {
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
        tableTitleTip += " " + dagInfo.tag;

        html += '<div class="dagTable ' + tableClasses + '" ' +
                    'data-tablename="' + tableName + '" ' +
                    'data-index="' + node.value.dagNodeId + '" ' +
                    'data-nodeid="' + dagInfo.id + '" ' +
                    dataAttrs + '>' +
                        '<div class="' + iconClasses + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'title="' + tooltipTxt + '"' +
                        '></div>' +
                        extraIcon +
                        '<i class="icon ' + icon + '"></i>'+
                        '<span class="tableTitle ' + titleClasses + '" ' +
                            'data-toggle="tooltip" ' +
                            'data-placement="bottom" ' +
                            'data-container="body" ' +
                            'data-original-title="' + tableTitleTip + '">' +
                            tableTitle+
                        '</span>' +
                        extraTitle +
                    '</div>';
        html += '</div>';

        return (html);
    }

    function getDagOperationHtml(node, info) {
        var originHTML = "";
        var numParents = node.value.numParents;
        if (!numParents) {
            return originHTML;
        }

        var key = info.tag;
        var opText = info.opText;
        var operation = info.operation;

        var resultTableName = node.value.name;
        if (info.type === "sort") {
            operation = "sort";
        } else if (info.type === "createTable") {
            operation = "Create Table";
        }

        originHTML += '<div class="actionType dropdownBox ' + operation + '" ' +
                    'data-type="' + operation + '" ' +
                    'data-info="' + info.text + '" ' +
                    'data-column="' + info.column + '" ' +
                    'data-table="' + resultTableName + '"' +
                    'data-id="' + info.id + '" ' +
                    'data-toggle="tooltip" data-placement="top" ' +
                    'data-container="body" title="' + info.tooltip + '">' +
                        '<div class="actionTypeWrap" >' +
                            '<div class="dagIcon ' + operation + ' ' +
                                info.type + '">' +
                                getIconHtml(operation, info) +
                            '</div>' +
                            '<span class="typeTitle">' + operation + '</span>' +
                            '<span class="opInfoText">' + opText + '</span>' +
                        '</div>' +
                    '</div>';

        return (originHTML);
    }

    function getCollapsedHtml(group, top, right, depth, groupId, numHidden) {
        var html = "";
        var tooltip;
        var groupLength = group.length - numHidden;
        if (groupLength === 0) {
            return "";
        }

        if (groupLength === 1) {
            tooltip = TooltipTStr.CollapsedTable;
        } else {
            tooltip = xcHelper.replaceMsg(TooltipTStr.CollapsedTables,
                        {number: groupLength + ""});
        }

        var groupWidth = groupLength * dagTableWidth + 11;
        // condensedId comes from the index of the child of rightmost
        // hidden table
        html += '<div class="expandWrap horz" ' +
                        'style="top:' + (top + 5) + 'px;right:' + right +
                        'px;" ' +
                        'data-depth="' + depth + '" ' +
                        'data-index="' + groupId + '" ' +
                        'data-toggle="tooltip" ' +
                        'data-placement="top" ' +
                        'data-container="body" ' +
                        'data-size=' + groupLength + ' ' +
                        'title="' + tooltip + '">...</div>';
        html += '<div class="groupOutline" ' +
                        'style="top:' + top + 'px;right:' +
                            (right - groupOutlineOffset) +
                            'px;width:' + groupWidth + 'px;" ' +
                        'data-index="' + groupId + '"></div>';

        return html;
    }

    function getIconHtml(operation, info) {
        var type = info.type;
        var iconClass = "";
        switch (operation) {
            case ("map"):
            case (SQLOps.SplitCol):
            case (SQLOps.ChangeType):
                iconClass = "data-update";
                break;
            case ("filter"):
                iconClass = getFilterIconClass(type);
                break;
            case ("groupBy"):
                iconClass = "groupby";
                break;
            case ("aggregate"):
                iconClass = "aggregate";
                break;
            case ("Create Table"):
                iconClass = "index";
                break;
            case ("index"):
                iconClass = "index";
                break;
            case ("join"):
                iconClass = getJoinIconClass(type);
                break;
            case ("project"):
                iconClass = "delete-column";
                break;
            case ("sort"):
                if (info.order === "ascending") {
                    iconClass = "arrowtail-up";
                } else {
                    iconClass = "arrowtail-down";
                }
                break;
            case ("export"):
                iconClass="pull-all-field";
                break;
            default:
                iconClass = "unknown";
                break;
        }

        return '<i class="icon xi-' + iconClass + '"></i>';
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
        var commaIndex;
        var filterType;
        var evalStr;
        var value = node.value.struct;
        var info = {
            type: "unknown",
            text: "",
            opText: "",
            operation: "",
            tooltip: "",
            column: "",
            id: node.value.dagNodeId,
            state: DgDagStateTStr[node.value.state],
            tag: node.value.tag
        };
        var parentNames = node.getSourceNames(true);
        var taggedInfo;
        if (node.value.display.tagHeader && node.value.tags.length === 1) {
            taggedInfo = setTaggedOpInfo(info, value, node);
        } else {
            info.operation = DagFunction.getInputType(XcalarApisTStr[node.value.api]);
            info.operation = info.operation.slice(0, info.operation.length - 5);
        }

        if (!taggedInfo) {
            switch (key) {
                case ('aggregateInput'):
                    evalStr = value.evalStr;
                    info.type = "aggregate" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Aggregate: " + evalStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('loadInput'):
                    info.url = value.dataset.url;
                    var loadInfo = xcHelper.deepCopy(value);
                    info.loadInfo = loadInfo;
                    loadInfo.url = loadInfo.dataset.url;
                    loadInfo.format = DfFormatTypeTStr[loadInfo.dataset.formatType];
                    loadInfo.name = loadInfo.dataset.name;
                    if (loadInfo.loadArgs) {
                        loadInfo.loadArgs.udf = loadInfo.loadArgs.udfLoadArgs
                                                        .fullyQualifiedFnName;
                        delete loadInfo.loadArgs.udfLoadArgs;
                    }

                    delete loadInfo.dataset;
                    delete loadInfo.dagNodeId;
                    break;
                case ('filterInput'):
                    var filterStr = value.filterStr;
                    parenIndex = filterStr.indexOf("(");
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

                    if (filterTypeMap[abbrFilterType]) {
                        var filteredOn = filterStr.slice(parenIndex + 1,
                                                         filterStr.indexOf(','));
                        filterType = filterTypeMap[abbrFilterType];
                        var filterValue = filterStr.slice(filterStr.indexOf(',') + 2,
                                                          filterStr.lastIndexOf(')'));

                        info.column = filteredOn;
                        if (filterType === "regex") {
                            info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                           "&quot; using regex: &quot;" +
                                           filterValue + "&quot; " + "on " +
                                           filteredOn + ".";
                        } else if (filterType === "not") {
                            filteredOn = filteredOn.slice(filteredOn.indexOf("(") + 1);
                            filterValue = filterValue
                                            .slice(0, filterValue.lastIndexOf(')'));
                            info.column = filteredOn;
                            if (filteredOn.indexOf(")") > -1) {
                                info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                           "&quot; where " + filteredOn +
                                           " is " + filterType + " " +
                                           filterValue + ".";
                            } else {
                                commaIndex = filterStr.indexOf(',');
                                if (commaIndex !== -1) {
                                    info.column = filterStr
                                                  .slice(parenIndex + 1, commaIndex)
                                                  .trim();
                                } else {
                                    info.column = filterStr
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
                            info.column = filterStr
                                          .slice(parenIndex + 1, commaIndex)
                                          .trim();
                        } else {
                            info.column = filterStr
                                          .slice(parenIndex + 1,
                                                 filterStr.lastIndexOf(')'))
                                          .trim();
                        }
                        info.tooltip = "Filtered table &quot;" + parentNames[0] +
                                        "&quot;: " + filterStr;
                    }
                    info.opText = info.column;
                    break;
                case ('groupByInput'):
                    var sampleStr = "";
                    var groupedOn = getGroupedOnText(node);
                    if (value.includeSrcTableSample) {
                        sampleStr = " (Sample included)";
                    } else {
                        sampleStr = " (Sample not included)";
                    }
                    evalStr = value.evalStr;
                    parenIndex = evalStr.indexOf("(");
                    var type = evalStr.substr(0, parenIndex);
                    info.type = "groupBy" + type;
                    info.text = evalStr;
                    info.tooltip = evalStr + " Grouped by " + groupedOn + sampleStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('indexInput'):
                    info.type = "sort";
                    info.column = value.keyName;
                    if (value.ordering !== XcalarOrderingT.XcalarOrderingUnordered) {
                        var order = "";
                        if (value.ordering ===
                            XcalarOrderingT.XcalarOrderingAscending) {
                            order = "(ascending) ";
                            info.order = "ascending";
                        } else if (value.ordering ===
                                   XcalarOrderingT.XcalarOrderingDescending) {
                            order = "(descending) ";
                            info.order = "descending";
                        }
                        if (value.source.isTable) {
                            info.tooltip = "Sorted " + order + "by " +
                                           value.keyName;
                        } else {
                            info.tooltip = "Sorted " + order + "on " +
                                           value.keyName;
                        }
                        info.text = "sorted " + order + "on " + value.keyName;
                    } else {
                        if (value.source.isTable) {
                            info.tooltip = "Indexed by " + value.keyName;
                            info.type = "index";
                        } else {
                            info.tooltip = "Created Table";
                            info.type = "createTable";
                            info.column = "";
                        }
                        info.text = "indexed on " + value.keyName;
                    }
                    info.opText = info.column;
                    break;
                case ('joinInput'):

                    info.text = JoinOperatorTStr[value.joinType];

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
                                   parentNames[1] + "&quot;";
                    info.column = parentNames[0] + ", " + parentNames[1];
                    info.opText = info.column;
                    break;
                case ('mapInput'):
                    //XX there is a "newFieldName" property that stores the name of
                    // the new column. Currently, we are not using or displaying
                    // the name of this new column anywhere.
                    evalStr = value.evalStr;
                    info.type = "map" + evalStr.slice(0, evalStr.indexOf('('));
                    info.text = evalStr;
                    info.tooltip = "Map: " + evalStr;
                    info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                                evalStr.lastIndexOf(')'));
                    info.opText = info.column;
                    break;
                case ('projectInput'):
                    for (var i = 0; i < value.numColumns; i++) {
                        info.column += value.columnNames[i] + ", ";
                    }
                    info.column = info.column.slice(0, info.column.length - 2);
                    if (info.column.length > 80) {
                        info.column = info.column.slice(0, 80) + "...";
                    }
                    info.tooltip = "Projected columns: " + info.column;
                    info.text = info.tooltip;
                    info.type = "project";
                    info.opText = info.column;
                    break;
                case ('exportInput'):
                    info.type = "export";
                    try {
                        info.url = value.meta.specificInput.sfInput.fileName;
                    } catch (err) {
                        console.error('Could not find export filename');
                    }
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
        info.column = info.column.replace(/"/g, "&quot;");
        info.opText = info.opText.replace(/"/g, "&quot;");

        return (info);
    }

    function setTaggedOpInfo(info, value, node) {
        var taggedOp = getOpFromTag(node.value.tags[0]);
        var opFound = true;
        var evalStr;
        var parenIndex;
        info.operation = taggedOp;

        switch (taggedOp) {
            case (SQLOps.SplitCol):
                evalStr = value.evalStr;
                info.text = evalStr;
                info.column = evalStr.slice(evalStr.indexOf('(') + 1,
                                            evalStr.indexOf(','));
                var delimiter = $.trim(evalStr.slice(
                                              evalStr.lastIndexOf(",") + 1,
                                              evalStr.lastIndexOf(")")));

                info.tooltip = "Split column " + info.column + " by " +
                               delimiter;
                info.opText = info.column;
                break;
            case (SQLOps.ChangeType):
                var ancestors = getTaggedAncestors(node);
                evalStr = value.evalStr;
                info.text = evalStr;
                if (ancestors.length) {
                    // multiple casts, show general info
                    info.tooltip = "Changed column type of multiple columns";
                } else {
                    // only 1 cast so show specific info
                    info.column = evalStr.slice(evalStr.indexOf("(") + 1,
                                            evalStr.indexOf(","));
                    // XXX need to translate "bool" to "boolean" and "int"
                    // to "integer"
                    info.tooltip = "Changed column " + info.column +
                                    " type to " +
                                    evalStr.slice(0, evalStr.indexOf("("));
                    info.opText = info.column;
                }
                break;
            case (SQLOps.GroupBy):
                var ancestors = getTaggedAncestors(node, true);
                var key = DagFunction.getInputType(XcalarApisTStr[
                                                XcalarApisT.XcalarApiGroupBy]);
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
                        evalStr = gbNode.value.struct.evalStr;
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
                    info.column += col + ", ";
                }
                info.column = info.column.slice(0, -2);
                info.opText = info.column;
                tooltip = tooltip.slice(0, -2) + "<br>" + sampleStr;
                info.tooltip = tooltip;
                break;
            default:
                opFound = false;
                break;
        }

        if (opFound) {
            info.type = taggedOp;
            return info;
        } else {
            return null;
        }
    }

    function getGroupedOnText(node) {
        var text = "";
        var numParents = node.value.numParents;
        if (numParents === 1 &&
            node.parents[0].value.api === XcalarApisT.XcalarApiIndex) {
            var parent = node.parents[0];
            var keyName = parent.value.struct.keyName;

            // if indexed on a column named "multiGroupBy" then this may
            // have been xcalar-generated sort, so check this table's
            // parent to find the source columns

            if (keyName.indexOf("multiGroupBy") === 0) {
                var grandParent = parent.parents[0];
                var cols = parseConcatCols(grandParent);
                if (cols.length) {
                    text = "(";
                    for (var i = 0; i < cols.length; i++) {
                        text += cols[i] + ", ";
                    }
                    text = text.slice(0, -2);
                    text += ")";
                }
            }
            if (!text) {
                text = "(" + keyName + ")";
            }
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
            var keyName = parent.value.struct.keyName;

            // if indexed on a column named "multiGroupBy" then this may
            // have been xcalar-generated sort, so check this table's
            // parent to find the source columns

            if (keyName.indexOf("multiGroupBy") === 0) {
                var grandParent = parent.parents[0];
                cols = parseConcatCols(grandParent);
            }
            if (!cols.length) {
                cols = [keyName];
            }
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
    function parseConcatCols(node) {
        var cols = [];
        if (node.value.api === XcalarApisT.XcalarApiMap) {
            var evalStr = node.value.struct.evalStr;
            if (evalStr.indexOf("\".Xc.\"") > -1 &&
                evalStr.indexOf('concat') === 0) {
                var func = {args: []};
                ColManager.parseFuncString(evalStr, func);
                func = func.args[0];
                cols = getSourceColNames(func);
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

    // options: {savable: boolean}
    function drawAllLines($container, node, numNodes, width, options) {
        var $dagImage = $container.find('.dagImage');
        var canvas = createCanvas($container);
        var ctx = canvas.getContext('2d');
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = strokeWidth;
        ctx.beginPath();
        traverseAndDrawLines($dagImage, ctx, node, width, {});
        ctx.stroke();

        if (options.savable) {
            // if more than 1000 nodes, do not make savable, too much lag
            // also canvas limit is 32,767 pixels height  or width
            var canvasWidth = $(canvas).width();
            var canvasHeight = $(canvas).height();

            if (numNodes > 1000 || canvasWidth > canvasLimit ||
                canvasHeight > canvasLimit || (canvasWidth * canvasHeight) >
                canvasAreaLimit) {
                $dagImage.closest(".dagWrap").addClass('unsavable');
            }
        }
    }

    function traverseAndDrawLines($dagImage, ctx, node, width, drawn, all) {
        if (all ||
            !node.value.display.isHidden && !node.value.display.isHiddenTag) {
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

        // line from table to operation
        drawLine(ctx, tableX, tableY, tableX - 50, tableY);

        // line from child operation to upper parent table
        if (tableY === upperParentY) {
            drawLine(ctx, tableX - 108, tableY, upperParentX + smallTableWidth,
                     upperParentY);
        } else {
            var curvedLineCoor = {
                x1: tableX - 140,
                y1: tableY,
                x2: upperParentX + (smallTableWidth / 2), // middle of blue table
                y2: upperParentY
            };
            drawCurve(ctx, curvedLineCoor, true);
        }

        if (isJoinLineNeeded(node, parents)) {
            var lowerParent = parents[1];
            var lowerParentX = canvasWidth - lowerParent.value.display.x;
            var lowerParentY = lowerParent.value.display.y + dagTableHeight / 2;

            var curvedLineCoor = {
                x1: tableX - 102,
                y1: tableY,
                x2: lowerParentX + smallTableWidth, // right of blue table
                y2: lowerParentY
            };
            drawCurve(ctx, curvedLineCoor);

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
        if (node.value.display.tagHeader &&
            getOpFromTag(node.value.tags[0]) === SQLOps.GroupBy) {

            var sameParents = true;
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

    function drawCurve(ctx, coor, inverted) {
        var x1 = coor.x1; // upper table x
        var y1 = coor.y1; // upper table y
        var x2 = coor.x2; // child table x
        var y2 = coor.y2; // child table y
        var bendX1, bendY2, bendX2, bendY2;

        if (inverted) {
            // curve style option
            // bendX1 = x1 - ((x1 - x2) / 2);
            // bendY1 = y1;
            // bendY2 = y2 - ((y2 - y1) / 2);
            // bendY2 = y1;

            bendX1 = x2;
            bendY1 = y1;
            bendX2 = x2;
            bendY2 = y1;
        } else if (y1 === y2) {
            x1 -= 20;
            bendX1 = x1;
            bendY1 = y1 - 40;
            bendX2 = x2;
            bendY2 = y2 - 40;

        } else {
            bendX1 = x1;
            bendY1 = y1 + ((y2 - y1) / 2);
            bendX2 = x2 + ((x1 - x2) / 2);
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
    function drawExtraCurves(parents,  x1, y1, ctx, canvasWidth) {
        for (var i = 2; i < parents.length; i++) {
            var parent = parents[i];
            var x2 = canvasWidth - parent.value.display.x + smallTableWidth;
            var y2 = parent.value.display.y + dagTableHeight / 2;

            var bendY1 = y1 + ((y2 - y1) / 2);
            var bendX2 = x2 + ((x1 - x2) / 2);
            ctx.moveTo(x1, y1);
            ctx.bezierCurveTo(x1, bendY1,
                              bendX2, y2,
                              x2, y2);
        }
    }

    function drawLine(ctx, x1, y1, x2, y2) {
        // draw a straight line
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
    }

    if (window.unitTestMode) {
        Dag.__testOnly__ = {};
        Dag.__testOnly__.getSchemaNumRows = getSchemaNumRows;
        Dag.__testOnly__.findColumnSource = findColumnSource;
        Dag.__testOnly__.getIconHtml = getIconHtml;
        Dag.__testOnly__.getJoinIconClass = getJoinIconClass;
        Dag.__testOnly__.getDagNodeInfo = getDagNodeInfo;
        Dag.__testOnly__.getSourceTables = getSourceTables;
        Dag.__testOnly__.getRenamedColName = getRenamedColName;
        Dag.__testOnly__.getTaggedAncestors = getTaggedAncestors;
        Dag.__testOnly__.checkIsNodeHiddenTag = checkIsNodeHiddenTag;

    }

    return (Dag);

}(jQuery, {}));
