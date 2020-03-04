module.exports = {
    getDataflowInfo: function() {
        const execResult = {};
        const dagTabs = DagTabManager.Instance.getTabs();
        let i = 0;
        for (const dagTab of dagTabs) {
            i++;
            const sortedNodes = dagTab.getGraph().getSortedNodes()
                .map((node) => node.getNodeCopyInfo(true));
            execResult[dagTab.getName()] = {
                id: dagTab.getId(),
                nodes: sortedNodes,
                order: i
            };
        }
        return execResult; // dfName/tabName => { id: string, nodes: NodeCopyInfo[] }
    },

    getColumnIndex: function(columnName) {
        return ColManager.parseColNum($(".dataTable th input[value='" + columnName + "']").closest("th"))
    },

    getTabElements: function() {
        return DagViewManager.Instance.getActiveDag()._getDurable()
    },

    setAdvancedConfig: function(panelSelector, config) {
        const codeMirror = document.querySelectorAll(panelSelector + ' .advancedEditor .CodeMirror')[0].CodeMirror;
        if (config) {
            codeMirror.setValue(config);
        }
        const id = "#" + document.querySelector(panelSelector).id;
        return id;
    },

    getNodeFromCategoryBar: function(nodeInfo) {
        let type = nodeInfo.type.split(" ").join(".");
        let subType = nodeInfo.subType || "";
        let selector = "#dagView .operatorBar ." + type + '[data-subtype="' + subType + '"]';
        let el = document.querySelector(selector);
        let categoryClassName;
        el.classList.forEach(function(className) {
            if (className.startsWith("category-")) {
                categoryClassName = className;
                return false;
            }
        });
        return {categoryClass: categoryClassName, nodeSelector: selector};
    },

    pasteNode: function(nodeInfos) {
        const dagView = DagViewManager.Instance.getActiveDagView();
        dagView.pasteNodes(nodeInfos);
        const nodeIds = dagView.getSelectedNodeIds();
        return nodeIds;
    },

    getDagViewScroll: function() {
        const $dfArea = DagViewManager.Instance.getActiveArea();
        return {
            left: $dfArea.scrollLeft() + $dfArea.parent().scrollLeft(),
            top: $dfArea.scrollTop() + $dfArea.parent().scrollTop()
        };
    },

    scrollIntoView: function(selector) {
        $(selector).scrollintoview({duration: 0});
    },

    getFinalWorkbookName: function() {
        return $("#workbookPanel .workbookBox.noResource .subHeading input").val();
    },

    getFirstWorkbookName: function() {
        return $("#workbookPanel .workbookBox:first .subHeading input").val();
    },

    openOpPanel: function(nodeId) {
        const node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        throw new Error("Break code, fix it!");
        // SQLFuncOutOpPanel.Instance.show(node);
    },

    connectNodes: function(childId, parentId, idx) {
        if (idx == null) {
            idx = 0;
        }
        DagViewManager.Instance.getActiveDagView().connectNodes(parentId, childId, 0);
    },

    disableAutoExec: function() {
        UserSettings.setPref('dfAutoExecute', false, false);
    },

    executeAllNonOptimized: function() {
        let nodes = DagViewManager.Instance.getActiveDag().getAllNodes();
        let nodeIds = [];
        nodes.forEach(node => {
            if (node.subType !== "link out Optimized") {
                nodeIds.push(node.getId());
            }
        });
        DagViewManager.Instance.run(nodeIds);
    },

    downloadWorkbook: function(wkbkName) {
        WorkbookManager.downloadWKBK(wkbkName);
    },

    getTableNameFromOptimizedGraph: function() {
        const nodes = DagViewManager.Instance.getActiveDag().getSortedNodes();
        let tableName = nodes[nodes.length - 1].table;
        return tableName;
    },

    getRestoredDatasetId: function() {
        let $el = $("#dsListSection .grid-unit.ds:not(.xc-hidden).active");
        return $el.data("dsid");
    },

    clearConsole: function() {
        console.clear();
    },

    // change xcalarQueryCheck so that we console error query failures
    hackXcalarQueryCheck: function() {
        window.XcalarQueryCheck = function (queryName, canceling, txId, options) {
            if (tHandle == null) {
                return PromiseHelper.resolve(null);
            }
            const deferred = PromiseHelper.deferred();
            options = options || {};
            let noCleanup = options.noCleanup;
            let checkTime = options.checkTime || 1000; // 1s per check
            if (canceling) {
                checkTime = options.checkTime || 2000;
            }
            let origCheckTime = checkTime;
            cycle();
            function cycle() {
                setTimeout(function () {
                    XcalarQueryState(queryName)
                        .then(function (queryStateOutput) {
                        const state = queryStateOutput.queryState;
                        let numNodes = queryStateOutput.queryGraph.numNodes;
                        if (numNodes > 1000) {
                            // don't check as frequently if we have thousands of nodes
                            // add a maximum of 5 seconds per check
                            checkTime = origCheckTime + (Math.min(5, Math.floor(numNodes / 1000)) * 1000);
                        }
                        Transaction.update(txId, queryStateOutput);
                        if (state === QueryStateT.qrFinished ||
                            state === QueryStateT.qrCancelled) {
                            addThriftErrorLogToQueryOutput(queryStateOutput);
                            if (noCleanup) {
                                deferred.resolve(queryStateOutput);
                            }
                            else {
                                // clean up query when done
                                XcalarQueryDelete(queryName)
                                    .always(function () {
                                    deferred.resolve(queryStateOutput);
                                });
                            }
                        }
                        else if (state === QueryStateT.qrError) {
                            // clean up query when done
                            XcalarQueryDelete(queryName)
                                .always(function () {
                                deferred.reject(queryStateOutput.queryStatus, queryStateOutput);
                            });
                        }
                        else {
                            cycle();
                        }
                    })
                        .fail(function () {
                        if (canceling) {
                            XcalarQueryDelete(queryName);
                        }
                        deferred.reject.apply(this, arguments);
                    });
                }, checkTime);
            }
            function addThriftErrorLogToQueryOutput(queryStateOutput) {
                try {
                    let hasError = false;
                    queryStateOutput.queryGraph.node.forEach((node) => {
                        if (node.status != null && node.status !== StatusT.StatusOk &&
                            node.api !== XcalarApisTFromStr.XcalarApiDeleteObjects) {
                            hasError = true;
                            node.thriftError = thriftLog("XcalarQuery Node", node.status);
                        }
                    });
                    //XXX THIS IS THE HACK
                    if (hasError) {
                        console.error(JSON.stringify(queryStateOutput, null, 4));
                    }
                }
                catch (e) {
                    console.error(e);
                }
            }
            return (deferred.promise());
        };
    }
};