window.DFG = (function($, DFG) {
    var dfGroups = {};

    DFG.restore = function() {

        // This call now has to return a promise
        // JJJ handle parameters
        var deferred = jQuery.Deferred();
        var retArray = [];

        XcalarListRetinas()
        .then(function(list) {
            for (var i = 0; i<list.numRetinas; i++) {
                var retName = list.retinaDescs[i].retinaName;
                retArray.push(XcalarGetRetina(retName));
            }
            return PromiseHelper.when.apply({}, retArray);
        })
        .then(function() {
            var retStructs = arguments;
            console.log(arguments);
            for (var i = 0; i<arguments.length; i++) {
                var retName = arguments[i].retina.retinaDesc.retinaName;
                dfGroups[retName] = new DFGObj(retName);
                dfGroups[retName].retinaNodes = arguments[i].retina.retinaDag
                                                                   .node;
                var nodes = {};
                for (var j = 0; j<dfGroups[retName].retinaNodes.length; j++) {
                    nodes[dfGroups[retName].retinaNodes[j].name.name] =
                                     dfGroups[retName].retinaNodes[j].dagNodeId;
                }
                dfGroups[retName].nodeIds = nodes;
            }
            DFGCard.updateDFG();
        });

        return deferred.promise();
    };

    DFG.getAllGroups = function() {
        return (dfGroups);
    };

    DFG.getGroup = function(groupName) {
        return (dfGroups[groupName]);
    };

    DFG.setGroup = function(groupName, group, isNew, options) {
        var isUpload = false;
        var noClick = false;
        if (options) {
            isUpload = options.isUpload;
            noClick = options.noClick;
        }
        var deferred = jQuery.Deferred();
        dfGroups[groupName] = group;

        var innerDef;
        if (isUpload) {
            innerDef = PromiseHelper.resolve();
        } else {
            innerDef = createRetina(groupName, isNew);
        }

        innerDef
        .then(function() {
            return (XcalarGetRetina(groupName));
        })
        .then(function(retInfo) {
            updateDFGInfo(retInfo);
            // XXX TODO add sql
            DFGCard.updateDFG({"noClick": noClick});
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            delete dfGroups[groupName];
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DFG.removeGroup = function(groupName) {
        var deferred = jQuery.Deferred();
        XcalarDeleteRetina(groupName)
        .then(function() {
            delete dfGroups[groupName];
            DFGCard.updateDFG();
            return (KVStore.commit());
        })
        .then(function() {
            deferred.resolve();
        })
        .fail(function() {
            deferred.reject();
        });
        return deferred.promise();
    };

    DFG.hasGroup = function(groupName) {
        return dfGroups.hasOwnProperty(groupName);
    };

    DFG.getCanvasInfo = function($dagImage, withExport) {
        var tables = [];
        var operations = [];
        var expandIcons = [];
        var table;
        var tableName;
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
                "title"   : tableName,
                "index"   : $dagTable.data('index') + 1,
                "children": children,
                "type"    : $dagTable.data('type') || 'table',
                "top"     : parseInt($dagTable.parent().css('top')),
                "left"    : dagImageWidth -
                            parseInt($dagTable.parent().css('right')) - 50
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
            var left = dagImageWidth -
                        parseInt($operation.parent().css('right')) - 200;
            operations.push({
                "tooltip"    : tooltip,
                "type"       : $operation.data('type'),
                "column"     : $operation.data('column'),
                "info"       : $operation.data('info'),
                "table"      : $operation.data('table'),
                "parents"    : $operation.find('.parentsTitle').text(),
                "left"       : left,
                "top"        : parseInt($operation.parent().css('top')) + 4,
                "classes"    : $operation.find('.dagIcon').attr('class'),
                "iconClasses": $operation.find('.icon').attr('class')
            });
        });

        $dagImage.find('.expandWrap').each(function() {
            var $expandIcon = $(this);
            var tooltip = $expandIcon.attr('data-original-title') ||
                          $expandIcon.attr('title');
            tooltip = tooltip.replace(/"/g, '&quot');
            expandIcon = {
                "tooltip": tooltip,
                "left"   : dagImageWidth - parseInt($expandIcon.css('right')) - 30,
                "top"    : parseInt($expandIcon.css('top'))
            };
            expandIcons.push(expandIcon);
        });

        // insert new dfg into the main dfg object
        var canvasInfo = {
            "tables"     : tables,
            "operations" : operations,
            "expandIcons": expandIcons,
            "height"     : dagImageHeight,
            "width"      : dagImageWidth
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

        if (!nodeIds) {
            // This is the case where the retina is uploaded.
            // We really shouldn't do this here.. so XXX temp
            // JJJ Fixme. nodeIds doesn't exist for uploaded retinas
            group.retinaNodes = retInfo.retina.retinaDag.node;
            var nodes = {};
            for (var j = 0; j<group.retinaNodes.length; j++) {
                nodes[group.retinaNodes[j].name.name] =
                                                 group.retinaNodes[j].dagNodeId;
            }
            group.nodeIds = nodes;
            return;
        }
        for (var i = 0; i < numNodes; i++) {
            tableName = nodes[i].name.name;
            nodeIds[tableName] = nodes[i].dagNodeId;
        }
    }

    return (DFG);

}(jQuery, {}));
