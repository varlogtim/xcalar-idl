window.DFG = (function($, DFG) {
    var dfGroups = {};

    DFG.restore = function(groups) {
        groups = groups || {};
        dfGroups = {};

        for (var name in groups) {
            dfGroups[name] = new DFGObj(name, groups[name]);
        }

        DFGPanel.updateDFG();
    };

    DFG.getAllGroups = function() {
        return (dfGroups);
    };

    DFG.getGroup = function(groupName) {
        return (dfGroups[groupName]);
    };

    DFG.setGroup = function(groupName, group, isNew) {
        var deferred = jQuery.Deferred();
        dfGroups[groupName] = group;

        createRetina(groupName, isNew)
        .then(function() {
            return (XcalarGetRetina(groupName));
        })
        .then(function(retInfo) {
            updateDFGInfo(retInfo);
            // XXX TODO add sql
            DFGPanel.updateDFG();
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            delete dfGroups[groupName];
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DFG.hasGroup = function(groupName){
        return dfGroups.hasOwnProperty(groupName);
    };

    DFG.drawCanvas = function($dagImage, isSchedulerPanel) {
        var dagImageWidth = $dagImage.width();
        var dagImageHeight = $dagImage.height();
        var canvas = $('<canvas class="previewCanvas" width="' +
                        dagImageWidth + '" height="' + dagImageHeight +
                        '">')[0];
        $dagImage.append(canvas);

        var ctx = canvas.getContext('2d');

        ctx.strokeStyle = '#999999';

        var $dagTables = $dagImage.find('.dagTable');
        var numTables = $dagTables.length;
        for (var i = 0; i < numTables; i++) {
            var $dagTable = $dagTables.eq(i);

            // var index = $dagTable.data('index');
            var children = ($dagTable.data('children') + "").split(",");
            var numChildren = children.length;
            var child;
            if (isSchedulerPanel) {
                child = children;
            } else {
                child = children[numChildren - 2];
            }

            var dagMidHeight = 21;
            var dagMidWidth = 20;
            if (child !== undefined) {
                child = $dagImage.find('.dagTable[data-index=' + child + ']');
                var top1, left1, top2, left2;
                if (isSchedulerPanel) {
                    top1 = parseInt($dagTable.css('top')) + dagMidHeight;
                    left1 = parseInt($dagTable.css('left')) + dagMidWidth;
                    top2 = parseInt(child.css('top')) + dagMidHeight;
                    left2 = parseInt(child.css('left')) + 10;
                    // console.log('scheduler panel');
                } else {
                    top1 = parseInt($dagTable.parent().css('top')) + dagMidHeight;
                    left1 = dagImageWidth -
                            parseInt($dagTable.parent().css('right')) - 32;
                    top2 = parseInt(child.parent().css('top')) + dagMidHeight;
                    left2 = dagImageWidth -
                            parseInt(child.parent().css('right')) - 42;
                    // console.log('not scheduler panel');
                }

                ctx.beginPath();
                ctx.moveTo(left1, top1);

                if (top1 !== top2) {
                    var xoffset = 0;
                    var vertDist = Math.abs(top2 - top1);
                    if (vertDist < 60) {
                        xoffset = 2000 / vertDist;
                    }
                    var midLeft = left2 - 190 + xoffset;
                    ctx.lineTo(midLeft, top1);
                    var endX = left2 - 100;
                    var endY = top2;
                    if (top1 < top2) {
                        ctx.bezierCurveTo(midLeft, top1,
                            endX, top1,
                            endX, endY);
                    } else {
                        ctx.bezierCurveTo(midLeft, top1,
                            endX, top1,
                            endX, endY);
                    }

                    ctx.lineTo(left2 + dagMidWidth, top2);
                } else {
                    ctx.lineTo(left2, top2);
                }
                ctx.stroke();
            }
        }

        var $expandIcons = $dagImage.find('.expandWrap');
        var numExpandIcons = $expandIcons.length;
        for  (var i = 0; i < numExpandIcons; i++) {
            var $expandIcon = $expandIcons.eq(i);
            var x, y, dist;
            if (isSchedulerPanel) {
                x = parseInt($expandIcon.css('left')) + 200;
                y = parseInt($expandIcon.css('top')) + 15;
                dist = 250;
            } else {
                x = dagImageWidth - parseInt($expandIcon.css('right')) - 33;
                y = parseInt($expandIcon.css('top')) + 16;
                dist = 8;
            }
            console.log(x, y);
            ctx.moveTo(x, y);
            ctx.lineTo(x - dist, y);
        }
        ctx.stroke();
    };

    DFG.getCanvasInfo = function($dagImage, withExport) {
        var tables = [];
        var operations = [];
        var expandIcons = [];
        var table;
        var tableName;
        var operation;
        var expandIcon;
        var firstDagTable;
        var dagImageHeight = $dagImage.height();
        var dagImageWidth = $dagImage.width();
        // put each blue table icon into an object, recording position and info
        $dagImage.find('.dagTable').each(function() {
            var $dagTable = $(this);
            if ($dagTable.parent().hasClass('hidden')) {
                return;
            }

            var children = ($dagTable.data('children') + "").split(",");
            children = parseInt(children[children.length - 2]) + 1 + "";
            if (children === "NaN") {
                children = 0;
            }
            tableName = $dagTable.find('.tableTitle').text();
            table = {
                "index"   : $dagTable.data('index') + 1,
                "children": children,
                "type"    : $dagTable.data('type') || 'table',
                "left"    : dagImageWidth -
                            parseInt($dagTable.parent().css('right')) - 50,
                "top"     : parseInt($dagTable.parent().css('top')),
                "title"   : tableName
            };

            if ($dagTable.data('index') === 0) {
                firstDagTable = table;
            }

            if ($dagTable.hasClass('dataStore')) {
                table.url = $dagTable.data('url');
                table.table = $dagTable.data('table');
            }
            tables.push(table);
        });

        if (!withExport) {
            // create the export table
            table = {
                "index"   : 0,
                "children": undefined,
                "type"    : 'export',
                "left"    : firstDagTable.left + 130,
                "top"     : firstDagTable.top,
                "title"   : "export-" + firstDagTable.title + ".csv",
                "table"   : "export-" + firstDagTable.title + ".csv",
                "url"     : "export-" + firstDagTable.title + ".csv"
            };
            tables.push(table);
        }
        // put each gray operation icon into an object,
        // recording position and info
        $dagImage.find('.actionType').each(function() {
            var $operation = $(this);
            if ($operation.parent().hasClass('hidden')) {
                return;
            }
            var tooltip = $operation.attr('data-original-title') ||
                                     $operation.attr('title');
            tooltip = tooltip.replace(/"/g, '&quot');
            operation = {
                "tooltip": tooltip,
                "type"   : $operation.data('type'),
                "column" : $operation.data('column'),
                "info"   : $operation.data('info'),
                "table"  : $operation.data('table'),
                "parents": $operation.find('.parentsTitle').text(),
                "left"   : dagImageWidth -
                           parseInt($operation.parent().css('right')) - 200,
                "top"    : parseInt($operation.parent().css('top')) + 4,
                "classes": $operation.find('.dagIcon').attr('class')
            };
            operations.push(operation);
        });

        $dagImage.find('.expandWrap').each(function() {
            var $expandIcon = $(this);
            var tooltip = $expandIcon.attr('data-original-title') ||
                          $expandIcon.attr('title');
            tooltip = tooltip.replace(/"/g, '&quot');
            expandIcon = {
                "tooltip": tooltip,
                "left": dagImageWidth - parseInt($expandIcon.css('right')) - 30,
                "top": parseInt($expandIcon.css('top'))
            };
            expandIcons.push(expandIcon);
        });

        // insert new dfg into the main dfg object
        var canvasInfo = {
            "tables"    : tables,
            "operations": operations,
            "expandIcons": expandIcons,
            "height"    : dagImageHeight,
            "width"     : dagImageWidth
        };
        if (!withExport) {
            canvasInfo.width += 180;
        }
        return ({canvasInfo: canvasInfo, tableName: tableName});
    };

    function createRetina(retName, isNew) {
        var deferred = jQuery.Deferred();
        var dfg = dfGroups[retName];

        var tableArray = [];
        dfg.dataFlows.forEach(function(dataFlow) {
            var tableName = dataFlow.name;
            var columns = [];

            dataFlow.columns.forEach(function(colInfo) {
                var col = new ExColumnNameT();
                col.name = colInfo.backCol; // Back col name
                col.headerAlias = colInfo.frontCol; // Front col name
                columns.push(col);
            });

            var retinaDstTable = new XcalarApiRetinaDstT();
            retinaDstTable.numColumns = columns.length;
            retinaDstTable.target = new XcalarApiNamedInputT();
            retinaDstTable.target.isTable = true;
            retinaDstTable.target.name = tableName;
            retinaDstTable.columns = columns;
            tableArray.push(retinaDstTable);
        });

        makeRetinaHelper()
        .then(deferred.resolve)
        .fail(deferred.reject);

        return (deferred.promise());

        function makeRetinaHelper() {
            var innerDeferred = jQuery.Deferred();
            if (isNew) {
                return (XcalarMakeRetina(retName, tableArray));
            } else {
                XcalarDeleteRetina(retName)
                .then(function() {
                    return (XcalarMakeRetina(retName, tableArray));
                })
                .then(function() {
                    var promises = [];
                    var retinaNodes = dfg.retinaNodes;
                    for (var dagNodeId in retinaNodes) {
                        var node = retinaNodes[dagNodeId];
                        console.log(node);
                        promises.push(XcalarUpdateRetina.bind(this, retName,
                                dagNodeId, node.paramType, node.paramValue));
                    }

                    return (PromiseHelper.chain(promises));
                })
                .then(innerDeferred.resolve)
                .fail(innerDeferred.reject);
            }

            return (innerDeferred.promise());
        }
    }

    // called after retina is created or updated in order to update
    // the ids of dag nodes
    function updateDFGInfo(retInfo) {
        var retina = retInfo.retina;
        var retName = retina.retinaDesc.retinaName;
        var group = dfGroups[retName];
        var nodes = retina.retinaDag.node;
        var numNodes = retina.retinaDag.numNodes;
        var nodeIds = group.nodeIds;
        var tableName;

        for (var i = 0; i < numNodes; i++) {
            tableName = nodes[i].name.name;
            nodeIds[tableName] = nodes[i].dagNodeId;
        }
    }

    return (DFG);

}(jQuery, {}));
