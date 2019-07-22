module.exports = {
    getDataflowInfo: function() {
        const execResult = {};
        const dagTabs = DagTabManager.Instance.getTabs();
        for (const dagTab of dagTabs) {
            const sortedNodes = dagTab.getGraph().getSortedNodes()
                .map((node) => node.getNodeCopyInfo(true));
            execResult[dagTab.getName()] = {
                id: dagTab.getId(),
                nodes: sortedNodes
            };
        }
        return execResult; // dfName/tabName => { id: string, nodes: NodeCopyInfo[] }
    },

    getNodes: function() {
        const dagTabs = DagTabManager.Instance.getTabs();
        const dagTab = dagTabs[0];
        const sortedNodes = dagTab.getGraph().getSortedNodes()
            .map((node) => node.getNodeCopyInfo(true));
        return sortedNodes; // NodeCopyInfo[]
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

    getFinalWorkbookName: function() {
        return $("#workbookPanel .workbookBox.noResource .subHeading input").val();
    },

    openOpPanel: function(nodeId) {
        const node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        SQLFuncOutOpPanel.Instance.show(node);
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
    }
};