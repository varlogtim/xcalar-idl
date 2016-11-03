window.DF = (function($, DF) {
    var dataflows = {};

    DF.restore = function(ret) {
        // This call now has to return a promise
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
                var j = 0;
                // Populate node information
                var retName = arguments[i].retina.retinaDesc.retinaName;
                dataflows[retName] = new Dataflow(retName);
                dataflows[retName].retinaNodes = arguments[i].retina.retinaDag
                                                                    .node;
                var nodes = {};
                for (j = 0; j<dataflows[retName].retinaNodes.length; j++) {
                    nodes[dataflows[retName].retinaNodes[j].name.name] =
                                    dataflows[retName].retinaNodes[j].dagNodeId;
                }
                dataflows[retName].nodeIds = nodes;

                // Populate export column information
                dataflows[retName].columns = [];
                for (j = 0; j<dataflows[retName].retinaNodes.length; j++) {
                    if (dataflows[retName].retinaNodes[j].api ===
                        XcalarApisT.XcalarApiExport) {
                        var exportCols = dataflows[retName].retinaNodes[j].input
                                                      .exportInput.meta.columns;
                        for (var k = 0; k<exportCols.length; k++) {
                            var newCol = {};
                            newCol.frontCol = exportCols[k].headerAlias;
                            newCol.backCol = exportCols[k].name;
                            dataflows[retName].columns.push(newCol);
                        }
                        break;
                    }
                }
            }

            DFCard.drawDags();

            // restore old parameterized data
            // updateParameterizedNode requires dag to be printed since it
            // directly modifies the css for the node
            if (ret) {
                for (var i = 0; i<arguments.length; i++) {
                    if (arguments[i] == null) {
                        continue;
                    }
                    var retinaName = arguments[i].retina.retinaDesc.retinaName;

                    if (retinaName in ret) {
                        jQuery.extend(dataflows[retinaName], ret[retinaName]);
                        for (var nodeId in ret[retinaName].parameterizedNodes) {
                            var $tableNode =
                                       dataflows[retinaName].colorNodes(nodeId);
                            var type = ret[retinaName]
                                           .parameterizedNodes[nodeId]
                                           .paramType;
                            if (type === XcalarApisT.XcalarApiFilter) {
                                $tableNode.find(".parentsTitle")
                                          .text("<Parameterized>");
                            }
                        }
                        if (ret[retinaName].schedule) {
                            dataflows[retinaName].schedule = new SchedObj(ret[retinaName].schedule);
                        }
                    }
                }
            }
            DFCard.updateDF();
        });

        return deferred.promise();
    };

    DF.getAllDataflows = function() {
        return (dataflows);
    };

    DF.getAllCommitKeys = function() {
        // Only commit stuff that we cannot recreate
        var deepCopy = xcHelper.deepCopy(dataflows);
        for (var df in deepCopy) {
            delete deepCopy[df].nodeIds;
            delete deepCopy[df].retinaNodes;
        }
        return deepCopy;
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
            DFCard.deleteDF(dataflowName);
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

    // For addining. modifying and removing the schedule
     DF.getSchedule = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if(dataflow) {
            return dataflow.schedule;
        }
    };

    DF.addScheduleToDataflow = function(dataflowName, options) {
        var dataflow = dataflows[dataflowName];
        if(dataflow) {
            if(!dataflow.schedule) {
                dataflow.schedule = new SchedObj(options);
            } else {
                var schedule = dataflow.schedule;
                schedule.update(options);
            }
            console.log("Add it successfully!")
        } else {
            console.log("No such dataflow exist!");
        }
        KVStore.commit();
    };

    DF.removeScheduleFromDataflow = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if(dataflow) {
            dataflow.schedule = null;
            console.log("Remove it successfully!")
        } else {
            console.log("No such dataflow exist!");
        }
        KVStore.commit();
    };

    DF.hasSchedule = function(dataflowName) {
        var dataflow = dataflows[dataflowName];
        if(dataflow) {
            return dataflow.hasSchedule();
        } else {
            console.log("No such dataflow exist!");
            return false;
        }
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
