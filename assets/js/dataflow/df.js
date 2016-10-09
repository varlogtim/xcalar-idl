window.DF = (function($, DF) {
    var dataflows = {};

    DF.restore = function() {

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
            // JJJ Make updateDF instead of draw, to do show
            DFCard.updateDF();
            DFCard.drawDags();
        });

        return deferred.promise();
    };

    DF.getAllDataflows = function() {
        return (dataflows);
    };

    DF.getDataflow = function(dataflowName) {
        return (dataflows[dataflowName]);
    };

    DF.addDataflow = function(dataflowName, dataflow, options) {
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
            updateDFInfo(retInfo);
            // XXX TODO add sql
            DFCard.drawOneDag(dataflowName);
            DFCard.updateDF();
            KVStore.commit();
            deferred.resolve();
        })
        .fail(function(error) {
            delete dataflows[dataflowName];
            deferred.reject(error);
        });

        return (deferred.promise());
    };

    DF.removeDataflow = function(dataflowName) {
        var deferred = jQuery.Deferred();
        XcalarDeleteRetina(dataflowName)
        .then(function() {
            delete dataflows[dataflowName];
            DFCard.updateDF();
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

    DF.hasDataflow = function(dataflowName) {
        return dataflows.hasOwnProperty(dataflowName);
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

    // called after retina is created to update the ids of dag nodes
    function updateDFInfo(retInfo) {
        var retina = retInfo.retina;
        var retName = retina.retinaDesc.retinaName;
        var dataflow = dataflows[retName];
        var nodes = retina.retinaDag.node;

        dataflow.retinaNodes = nodes;

        for (var i = 0; i < retina.retinaDag.numNodes; i++) {
            var tableName = nodes[i].name.name;
            dataflow.nodeIds[tableName] = nodes[i].dagNodeId;
        }
    }

    return (DF);

}(jQuery, {}));
