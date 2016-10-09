window.DFG = (function($, DFG) {
    var dataflows = {};

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
            for (var i = 0; i<arguments.length; i++) {
                if (arguments[i] == null) {
                    continue;
                }
                var retName = arguments[i].retina.retinaDesc.retinaName;
                dataflows[retName] = new Dataflow(retName);
                dataflows[retName].retinaNodes = arguments[i].retina.retinaDag
                                                                   .node;
                var nodes = {};
                for (var j = 0; j<dataflows[retName].retinaNodes.length; j++) {
                    nodes[dataflows[retName].retinaNodes[j].name.name] =
                                     dataflows[retName].retinaNodes[j].dagNodeId;
                }
                dataflows[retName].nodeIds = nodes;
            }
            // JJJ Draw dataflows and hide
            // JJJ Make updateDFG instead of draw, to do show
            DFGCard.updateDFG();
        });

        return deferred.promise();
    };

    DFG.getAllDataflows = function() {
        return (dataflows);
    };

    DFG.getDataflow = function(dataflowName) {
        return (dataflows[dataflowName]);
    };

    DFG.addDataflow = function(dataflowName, dataflow, options) {
        var isUpload = false;
        var noClick = false;
        if (options) {
            isUpload = options.isUpload;
            noClick = options.noClick;
        }
        var deferred = jQuery.Deferred();
        dataflows[dataflowName] = dataflow;

        var innerDef;
        if (isUpload) {
            innerDef = PromiseHelper.resolve();
        } else {
            innerDef = createRetina(dataflowName);
        }

        innerDef
        .then(function() {
            return (XcalarGetRetina(dataflowName));
        })
        .then(function(retInfo) {
            updateDFGInfo(retInfo);
            // XXX TODO add sql
            DFGCard.updateDFG({"noClick": noClick});
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            delete dataflows[dataflowName];
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DFG.removeDataflow = function(groupName) {
        var deferred = jQuery.Deferred();
        XcalarDeleteRetina(groupName)
        .then(function() {
            delete dataflows[groupName];
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

    DFG.hasDataflow = function(groupName) {
        return dataflows.hasOwnProperty(groupName);
    };

    function createRetina(retName) {
        var deferred = jQuery.Deferred();
        var df = dataflows[retName];
        var tableName = df.tableName;
        var columns = [];

        var tableArray = [];

        df.columns.forEach(function(colInfo) {
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

        return (XcalarMakeRetina(retName, tableArray));
    }

    // called after retina is created or updated in order to update
    // the ids of dag nodes
    function updateDFGInfo(retInfo) {
        var retina = retInfo.retina;
        var retName = retina.retinaDesc.retinaName;
        var group = dataflows[retName];
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
