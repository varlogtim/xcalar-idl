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

    setAdvancedConfig: function(panelSelector, config) {
        const codeMirror = document.querySelectorAll(panelSelector + ' .advancedEditor .CodeMirror')[0].CodeMirror;
        codeMirror.setValue(config);
        const id = "#" + document.querySelector(panelSelector).id;
        return id;
    },

    getNodeFromCategoryBar: function(nodeInfo) {
        let type = nodeInfo.type.split(" ").join(".");
        let selector = "#dagView .operatorBar ." + type;
        if (nodeInfo.subType) {
            selector += '[data-subtype="' + nodeInfo.subType + '"]';
        }
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

    getDagViewScroll: function() {
        const $dfArea = DagViewManager.Instance.getActiveArea();
        return {
            left: $dfArea.scrollLeft() + $dfArea.parent().scrollLeft(),
            top: $dfArea.scrollTop() + $dfArea.parent().scrollTop()
        };
    }
};