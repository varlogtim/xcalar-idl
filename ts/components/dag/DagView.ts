namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;
    let activeDagTab: DagTab;
    const horzNodeSpacing = 140;// spacing between nodes when auto-aligning
    const vertNodeSpacing = 60;
    const gridLineSize = 12;
    const titleLineHeight = 12;
    const inConnectorWidth = 6;
    let clipboard = null;
    export const horzPadding = 200;
    export const vertPadding = 100;
    export const nodeHeight = 28;
    export const nodeWidth = 103;
    export const gridSpacing = 20;
    export const zoomLevels = [.25, .5, .75, 1, 1.5, 2];
    const lockedNodeIds = {};

    export function setup(): void {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        // XXX used for testing
        activeDag = null;
        activeDagTab = null;

        _addEventListeners();

        DagTopBar.Instance.setup();
        DagCategoryBar.Instance.setup();
        DagCategoryBar.Instance.loadCategories(); // Async call
        DagNodeMenu.setup();
        DagComment.Instance.setup();
        DagParamManager.Instance.setup();
    }

    /**
     * Called when dag panel becomes visible, listeners that are removed when
     * panel closes.
     */
    export function show(): void {
        $("#container").addClass("activePanel-modelingDagPanel");
        DagCategoryBar.Instance.showOrHideArrows();

        $(window).on("resize.dagViewResize", function () {
            DagCategoryBar.Instance.showOrHideArrows();
        });

        $(document).on("copy.dataflowPanel", function (e) {
            if ($(e.target).is("body")) {
                // proceed
            } if ($(e.target).is(".xcClipboardArea")) {
                return;
            } else if (window.getSelection().toString().length &&
                window.getSelection().toString() !== " ") {
                // if an actual target is selected,
                // then let the natural event occur
                clipboard = null;
                return;
            }

            e.preventDefault(); // default behaviour is to copy any selected text
            DagView.copyNodes(DagView.getSelectedNodeIds(true, true));
        });

        $(document).on("cut.dataflowPanel", function (e) {
            if (isDisableActions()) {
                return;
            }
            if ($(e.target).is("body")) {
                // proceed
            } if ($(e.target).is(".xcClipboardArea")) {
                return;
            } else if (window.getSelection().toString().length &&
                window.getSelection().toString() !== " ") {
                // if an actual target is selected,
                // then let the natural event occur
                clipboard = null;
                return;
            }

            e.preventDefault(); // default behaviour is to copy any selected text
            DagView.cutNodes(DagView.getSelectedNodeIds(true, true));
        });

        $(document).on("paste.dataflowPanel", function (e: JQueryEventObject) {
            if (isDisableActions()) {
                return;
            }
            if (clipboard === null || $(e.target).is("input") ||
                $(e.target).is("textarea")) {
                return; // use default paste event
            }
            if (clipboard.type === "dagNodes") {
                DagView.pasteNodes();
            }
        });

        $(document).on("keydown.dataflowPanel", function(e: JQueryEventObject) {
            if (activeDag == null ||
                activeDag.isLocked() ||
                $("#container").hasClass("formOpen") ||
                $("input:focus").length || $("textarea:focus").length ||
                $('[contentEditable="true"]').length
            ) {
                return;
            }
            switch (e.which) {
                case (keyCode.Backspace):
                case (keyCode.Delete):
                    if (isDisableActions()) {
                        break;
                    }
                    const tabId: string = DagView.getActiveDag().getTabId();
                    DagView.removeNodes(DagView.getSelectedNodeIds(true, true), tabId);
                    break;
                case (keyCode.Y):
                case (keyCode.Z):
                    checkUndoRedo(e);
                    break;
                default:
                    break;
            }
        });

        function checkUndoRedo(event: JQueryEventObject): void {
            if (!(isSystemMac && event.metaKey) &&
                !(!isSystemMac && event.ctrlKey)) {
                return;
            }
            if (FormHelper.activeForm) {
                return;
            }
            event.preventDefault();
            if (event.which === keyCode.Z) {
                $('#undo').click();
            } else if (event.which === keyCode.Y) {
                if ($("#redo").hasClass("disabled")) {
                    Log.repeat();
                } else {
                    $('#redo').click();
                }
            }
        }
    }

    /**
     * Called when navigating away from dag panel
     */
    export function hide(): void {
        $(window).off(".dagViewResize");
        $(document).off(".dataflowPanel");
        $("#container").removeClass("activePanel-modelingDagPanel");
    }

    /**
     * Returns the current activeDag
     * @returns {DagGraph}
     */
    export function getActiveDag(): DagGraph {
        return activeDag;
    }

    export function getActiveTab(): DagTab {
        return activeDagTab;
    }

    /**
     * DagView.switchActiveDagTab
     * Switches the current active tab, updating activeDag and activeDagTab
     * @param dagTab The tab we want to make active.
     */
    export function switchActiveDagTab(dagTab: DagTab) {
        activeDagTab = dagTab;
        activeDag = dagTab.getGraph();
        DagView.reactivate();
        updateDagView();
        DagTable.Instance.switchTab(dagTab.getId());
    }

    /**
     * DagView.resetActiveDagTab
     */
    export function resetActiveDagTab(): void {
        activeDagTab = null;
        activeDag = null;
        updateDagView();
    }

    function updateDagView(): void {
        const $dfWrapBg: JQuery = $dagView.find(".dataflowWrapBackground");
        if (activeDagTab == null) {
            $dfWrap.addClass("xc-hidden");
            $dfWrapBg.removeClass("xc-hidden");
            $dagView.find(".searchArea, .categoryWrap, .operatorWrap").addClass("xc-disabled");
        } else {
            $dfWrap.removeClass("xc-hidden");
            $dfWrapBg.addClass("xc-hidden");
            $dagView.find(".searchArea, .categoryWrap, .operatorWrap").removeClass("xc-disabled");
        }
        DagTopBar.Instance.setState(activeDagTab);
    }

    export function selectNodes(tabId: string, nodeIds?: DagNodeId[]) {
        if (!nodeIds) {
            _getAreaByTab(tabId).find(".operator").addClass("selected");
        } else {
            nodeIds.forEach((nodeId) => {
                const $node: JQuery = DagView.getNode(nodeId, tabId);
                $node.addClass("selected");
            });
        }
    }

    /**
     * DagView.reactivate
     *
     *  // restore/dredraw dataflow dimensions and nodes,
        // add connections separately after so all node elements already exist
        // adds event listeners
     */
    export function reactivate(): void {
        const $dfArea = _getActiveArea();
        if ($dfArea.hasClass("rendered")) {
            return;
        }
        const tabId = activeDag.getTabId();
        $dfArea.empty().html(
            '<div class="dataflowAreaWrapper">' +
            '<div class="commentArea"></div>' +
            '<svg class="edgeSvg"></svg>' +
            '<svg class="operatorSvg"></svg>' +
            '</div>'
        );
        const dimensions = activeDag.getDimensions();
        const scale = activeDag.getScale();
        const $wrapper: JQuery = $dfArea.find(".dataflowAreaWrapper");
        if (dimensions.width > -1) {
            $wrapper.css("min-height", dimensions.height * scale);
            $wrapper.css("min-width", dimensions.width * scale);
            $wrapper.css("background-size", gridLineSize * scale);
        }
        $wrapper.children().css("transform", "scale(" + scale + ")");

        const nodes: Map<DagNodeId, DagNode> = activeDag.getAllNodes();

        nodes.forEach((node: DagNode) => {
            _drawNode(node, $dfArea);
        });
        nodes.forEach((node: DagNode, nodeId: DagNodeId) => {
            node.getParents().forEach((parentNode, index) => {
                const parentId: DagNodeId = parentNode.getId();
                _drawConnection(parentId, nodeId, index, tabId);
            });
        });

        const comments: Map<CommentNodeId, CommentNode> = activeDag.getAllComments();

        comments.forEach((commentNode: CommentNode) => {
            DagComment.Instance.drawComment(commentNode, $dfArea);
        });

        _setupGraphEvents();
        $dfArea.addClass("rendered");
    }

    export function newGraph(): void {
        _setupGraphEvents();
    }

    /**
     * DagView.addBackNodes
     * @param nodeIds
     * @param tabId
     * @param sliceInfo?
     * used for undoing/redoing operations
     */
    export function addBackNodes(
        nodeIds: DagNodeId[],
        tabId: string,
        spliceInfo?
    ): XDPromise<void> {
        spliceInfo = spliceInfo || {};
        const $dfArea: JQuery = _getAreaByTab(tabId);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        const graph: DagGraph = dagTab.getGraph();
        // need to add back nodes in the reverse order they were deleted
        $dfArea.find(".selected").removeClass("selected");
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const nodes = [];
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            let node;
            if (nodeId.startsWith("dag")) {
                node = graph.addBackNode(nodeId, spliceInfo[nodeId]);
                const coors = node.getPosition();
                maxXCoor = Math.max(coors.x, maxXCoor);
                maxYCoor = Math.max(coors.y, maxYCoor);
            } else if (nodeId.startsWith("comment")) {
                node = graph.addBackComment(nodeId);
                const coors = node.getPosition();
                const dimensions = node.getDimensions();
                maxXCoor = Math.max(coors.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(coors.y + dimensions.height, maxYCoor);
            }
            nodes.push(node);
        }

        const dagNodes = nodes.filter(node => {
            return node.getId().startsWith("dag");
        });

        const comments = nodes.filter(node => {
            return node.getId().startsWith("comment");
        });

        _drawAndConnectNodes(dagNodes, $dfArea, tabId);

        for (let i = 0; i < comments.length; i++) {
            DagComment.Instance.drawComment(comments[i], $dfArea, true);
        }

        _setGraphDimensions({ x: maxXCoor, y: maxYCoor });
        return dagTab.save();
    }
     /**
     * DagView.dawNodesAndConnections
     * @param nodes
     * @param tabId
     * requires an array of dagNodes that already have parents and children assigned
     */
    export function drawNodesAndConnections(nodes: DagNode[], tabId: string): XDPromise<void> {
        _drawNodesAndConnectionsNoPersist(nodes, tabId);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        return dagTab.save();
    }

    function _drawNodesAndConnectionsNoPersist(
        nodes: DagNode[],
        tabId: string,
        options?: { isNoLog?: boolean }
    ): LogParam {
        const { isNoLog = false } = options || {};
        const $dfArea: JQuery = _getAreaByTab(tabId);
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        let nodeIds = [];
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        // add node to graph
        for (let i = 0; i < nodes.length; i++) {
            const node: DagNode = nodes[i];
            graph.addNode(node);
            nodeIds.push(node.getId());
            const coors = node.getPosition();
            maxXCoor = Math.max(coors.x, maxXCoor);
            maxYCoor = Math.max(coors.y, maxYCoor);
        }
        _drawAndConnectNodes(nodes, $dfArea, tabId);
        _setGraphDimensions({x: maxXCoor, y: maxYCoor});

        const logParam: LogParam = {
            title: SQLTStr.DrawNodesAndConnections,
            options: {
                "operation": SQLOps.DrawNodesAndConnections,
                "dataflowId": tabId,
                "nodeIds": nodeIds
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }
        return logParam;
    }
     /**
     * DagView.eraseNodesAndConnections
     * @param nodes
     * @param tabId
     * requires an array of dagNodes that already have parents and children assigned
     */
    export function eraseNodesAndConnections(nodes: DagNode[], tabId: string): XDPromise<void> {
        _eraseNodesAndConnectionsNoPersist(nodes, tabId);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId)
        return dagTab.save();
    }

    function _eraseNodesAndConnectionsNoPersist(
        nodes: DagNode[],
        tabId: string,
        options?: { isNoLog?: boolean }
    ): LogParam {
        const { isNoLog = false } = options || {};
        const $dfArea: JQuery = _getAreaByTab(tabId);
        let nodeIds = [];
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        nodes.forEach(function (node) {
            const nodeId = node.getId();
            nodeIds.push(nodeId);
            if (nodeId.startsWith("dag")) {
                // Remove tabs for custom OP
                DagView.getNode(nodeId, null, $dfArea).remove();
                $dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                $dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                    const childNodeId = $(this).attr("data-childnodeid");
                    _removeConnection($(this), $dfArea, childNodeId, tabId);
                });
            } else if (nodeId.startsWith("comment")) {
                graph.removeComment(nodeId);
                DagComment.Instance.removeComment(nodeId);
            }
        });

        const logParam: LogParam = {
            title: SQLTStr.EraseNodesAndConnections,
            options: {
                "operation": SQLOps.EraseNodesAndConnections,
                "dataflowId": tabId,
                "nodeIds": nodeIds
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }
        return logParam;
    }
    /**
     * DagView.newNode
     * @param dagId
     * @param nodeInfo
     */
    export function newNode(nodeInfo: DagNodeInfo): DagNode {
        const node: DagNode = activeDag.newNode(nodeInfo);
        _addNodeNoPersist(node);
        activeDagTab.save();
        return node;
    }

    export function newComment(
        commentInfo: CommentInfo,
        isFocus?: boolean
    ): XDPromise<void> {
        commentInfo.position.x = Math.max(0,
            Math.round(commentInfo.position.x / gridSpacing) * gridSpacing);
        commentInfo.position.y = Math.max(0,
            Math.round(commentInfo.position.y / gridSpacing) * gridSpacing);
        const commentNode = activeDag.newComment(commentInfo);
        const $dfArea = _getActiveArea();
        let isSelect = false;
        if (isFocus) {
            isSelect = true;
        }
        DagComment.Instance.drawComment(commentNode, $dfArea, isSelect, isFocus);
        const dimensions = {
            x: commentNode.getPosition().x + commentNode.getDimensions().width,
            y: commentNode.getPosition().y + commentNode.getDimensions().height
        };
        _setGraphDimensions(dimensions);
        Log.add(SQLTStr.NewComment, {
            "operation": SQLOps.NewComment,
            "dataflowId": activeDagTab.getId(),
            "commentId": commentNode.getId()
        });
        return activeDagTab.save();
    }

    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    export function removeNodes(nodeIds: DagNodeId[], tabId: string): XDPromise<void> {
        const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
        tab.turnOffSave();
        const nodeIdsMap = lockedNodeIds[tabId] || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        if (_removeNodesNoPersist(nodeIds, tabId) == null) {
            tab.turnOnSave();
            return PromiseHelper.reject();
        } else {
            tab.turnOnSave();
            return tab.save();
        }
    }

    /**
     * DagView.copyNodes
     * @param nodeIds
     */
    export function copyNodes(nodeIds: DagNodeId[]): void {
        if (!nodeIds.length) {
            return;
        }
        cutOrCopyNodesHelper(nodeIds);
    }

    /**
     * DagView.cutNodes
     * @param nodeIds
     */
    export function cutNodes(nodeIds: DagNodeId[]): void {
        const tabId: string = activeDagTab.getId();
        const nodeIdsMap = lockedNodeIds[tabId] || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        if (!nodeIds.length) {
            return;
        }

        cutOrCopyNodesHelper(nodeIds);
        DagView.removeNodes(nodeIds, tabId);
    }

    /**
     * DagView.pasteNodes
     *  finds new position for cloned nodes, adds to dagGraph and UI
     */
    export function pasteNodes(): XDPromise<void> {
        if (!clipboard) {
            return PromiseHelper.reject();;
        }
        if (clipboard.type === "dagNodes") {
            if (!clipboard.nodeInfos.length) {
                return PromiseHelper.reject();
            }
            const tab: DagTab = activeDagTab;
            const tabId: string = tab.getId();
            tab.turnOffSave();
            const $dfArea: JQuery = _getActiveArea();
            $dfArea.find(".selected").removeClass("selected");

            let minXCoor: number = $dfArea.width();
            let minYCoor: number = $dfArea.height();
            let maxXCoor: number = 0;
            let maxYCoor: number = 0;

            clipboard.nodeInfos.forEach((nodeInfo) => {
                minYCoor = Math.min(nodeInfo.display.y, minYCoor);
                if (nodeInfo.display.y === minYCoor) {
                    minXCoor = Math.min(nodeInfo.display.x, minXCoor);
                }
                if (nodeInfo.dimensions) {
                    const dimensions = nodeInfo.dimensions;
                    maxXCoor = Math.max(nodeInfo.display.x + dimensions.width, maxXCoor);
                    maxYCoor = Math.max(nodeInfo.display.y + dimensions.height, maxYCoor);
                } else {
                    maxXCoor = Math.max(nodeInfo.display.x, maxXCoor);
                    maxYCoor = Math.max(nodeInfo.display.y, maxYCoor);
                }
            });

            let origMinXCoor = minXCoor;
            let origMinYCoor = minYCoor;
            minXCoor += (gridSpacing * 5);
            minYCoor += (gridSpacing * 2);

            const nextAvailablePosition = getNextAvailablePosition(activeDag, minXCoor,
                minYCoor);
            minXCoor = nextAvailablePosition.x;
            minYCoor = nextAvailablePosition.y;

            let xDelta = minXCoor - origMinXCoor;
            let yDelta = minYCoor - origMinYCoor;
            maxXCoor += xDelta;
            maxYCoor += yDelta;

            const newNodeIds: DagNodeId[] = [];
            const allNewNodeIds: DagNodeId[] = [];
            const oldNodeIdMap = {};

            clipboard.nodeInfos.forEach((nodeInfo) => {
                nodeInfo = xcHelper.deepCopy(nodeInfo);
                nodeInfo.display.x += xDelta;
                nodeInfo.display.y += yDelta;
                if (nodeInfo.nodeId.startsWith("dag")) {
                    const newNode: DagNode = activeDag.newNode(nodeInfo);
                    const newNodeId: DagNodeId = newNode.getId();
                    oldNodeIdMap[nodeInfo.nodeId] = newNodeId;
                    newNodeIds.push(newNodeId);
                    allNewNodeIds.push(newNodeId);
                    _drawNode(newNode, $dfArea, true);
                } else if (nodeInfo.nodeId.startsWith("comment")) {
                    const commentInfo = {
                        text: nodeInfo.text,
                        position: nodeInfo.display,
                        dimensions: nodeInfo.dimensions
                    };
                    const commentNode = activeDag.newComment(commentInfo);
                    allNewNodeIds.push(commentNode.getId());
                    DagComment.Instance.drawComment(commentNode, $dfArea, true);
                }
            });

            // restore connection to parents
            newNodeIds.forEach((newNodeId, i) => {
                if (clipboard.nodeInfos[i].parentIds) {
                    clipboard.nodeInfos[i].parentIds.forEach((parentId, j) => {
                        if (parentId == null) {
                            return; // skip empty parent slots
                        }
                        const newParentId = oldNodeIdMap[parentId];
                        // we do this because we're sure there is no cycle
                        // in copy paste case and skip the check can help on performance
                        const allowCyclic: boolean = true;
                        activeDag.connect(newParentId, newNodeId, j, allowCyclic);
                        _drawConnection(newParentId, newNodeId, j, tabId);
                    });
                }
            });
            // XXX scroll to selection if off screen

            _setGraphDimensions({ x: maxXCoor, y: maxYCoor });

            Log.add(SQLTStr.CopyOperations, {
                "operation": SQLOps.CopyOperations,
                "dataflowId": tab.getId(),
                "nodeIds": allNewNodeIds
            });
            tab.turnOnSave();
            return tab.save();
        }
        return PromiseHelper.reject();
    }

    /**
     * DagView.hasClipboard
     */
    export function hasClipboard(): boolean {
        return clipboard !== null;
    }

    export function hasOptimizedNode(nodeIds? : DagNodeId[]): boolean {
        const $dfArea = _getActiveArea();
        if (nodeIds) {
            for (let i = 0; i < nodeIds.length; i++) {
                const $node = DagView.getNode(nodeIds[i], null, $dfArea);
                if ($node.data("subtype") === DagNodeSubType.DFOutOptimized ||
                    $node.data("subtype") === DagNodeSubType.ExportOptimized) {
                        return true;
                }
            }
        } else {
            if ($dfArea.find('.operator[data-subtype="' + DagNodeSubType.DFOutOptimized + '"]').length) {
                return true;
            }
            if ($dfArea.find('.operator[data-subtype="' + DagNodeSubType.ExportOptimized + '"]').length) {
                return true;
            }
        }

        return false;
    }

    /**
     * DagView.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * @param tabId
     * @param isReconnect
     * connects 2 nodes and draws line
     */
    export function connectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string,
        isReconnect?: boolean,
        spliceIn?: boolean
    ): XDPromise<void> {
        _connectNodesNoPersist(parentNodeId, childNodeId, connectorIndex, tabId, {
            isReconnect: isReconnect,
            spliceIn: spliceIn
        });
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId)
        return dagTab.save();
    }

    /**
   * DagView.disconnect
   * @param parentNodeId
   * @param childNodeId
   * removes connection from DagGraph, connection line, updates connector classes
   */
    export function disconnectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string
    ): XDPromise<void> {
        const $dfArea = DagView.getAreaByTab(tabId);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        const graph: DagGraph = dagTab.getGraph();
        const $edge: JQuery = $dfArea.find('.edge[data-parentnodeid="' +
            parentNodeId +
            '"][data-childnodeid="' +
            childNodeId +
            '"][data-connectorindex="' +
            connectorIndex + '"]');
        const wasSpliced = graph.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, $dfArea, childNodeId, tabId);
        Log.add(SQLTStr.DisconnectOperations, {
            "operation": SQLOps.DisconnectOperations,
            "dataflowId": tabId,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex,
            "wasSpliced": wasSpliced
        });

        return dagTab.save();
    }

    function _disconnectNodesNoPersist(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string,
        isNoLog: boolean
    ): LogParam {
        const $dfArea = DagView.getAreaByTab(tabId);
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        const $edge: JQuery = $dfArea.find('.edge[data-parentnodeid="' +
            parentNodeId +
            '"][data-childnodeid="' +
            childNodeId +
            '"][data-connectorindex="' +
            connectorIndex + '"]');
        graph.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, $dfArea, childNodeId, tabId);
        const logParam: LogParam = {
            title: SQLTStr.DisconnectOperations,
            options: {
                "operation": SQLOps.DisconnectOperations,
                "dataflowId": tabId,
                "parentNodeId": parentNodeId,
                "childNodeId": childNodeId,
                "connectorIndex": connectorIndex
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    /**
     * DagView.getNode
     * @param nodeId
     * @param tabId?
     * @param $dataflowArea?
     * returns $(".operator") element
     */
    export function getNode(
        nodeId: DagNodeId,
        tabId?: string,
        $dataflowArea?: JQuery
    ): JQuery {
        if (tabId) {
            $dataflowArea = _getAreaByTab(tabId);
        }
        $dataflowArea = $dataflowArea || _getActiveArea();
        return $dataflowArea.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    /**
     * DagView.moveNodes
     * @param dagId
     * @param nodeInfos
     * @param graphDimensions
     */
    export function moveNodes(
        tabId: string,
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate
    ): XDPromise<void> {
        _moveNodesNoPersist(tabId, nodeInfos, graphDimensions);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        return dagTab.save();
    }

    /**
     *
     * @param tabId
     */
    export function autoAlign(tabId: string): void {
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        const nodePositionInfo = this.getAutoAlignPositions(graph);

        DagView.moveNodes(tabId, nodePositionInfo.nodeInfos, {
            x: nodePositionInfo.maxX + horzPadding,
            y: nodePositionInfo.maxY + vertPadding
        });
    }

    export function getAutoAlignPositions(graph: DagGraph): {
        nodeInfos: NodeMoveInfo[],
        maxX: number,
        maxY:number
    } {
        const nodes: DagNode[] = graph.getSortedNodes();
        let treeGroups = {};
        let seen = {};
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].getChildren().length === 0) {
                // group nodes into trees
                _splitIntoTrees(nodes[i], seen, treeGroups, i);
            }
        }

        let startingWidth: number = 0;
        const allNodeInfos = [];
        let overallMaxDepth = 0;

        for (let i in treeGroups) {
            const group = treeGroups[i];
            const nodes = {};
            _alignNodes(group[0], nodes, startingWidth);
            for (let j = 0; j < group.length; j++) {
                if (group[j].getParents().length === 0) {
                    // adjust positions of nodes so that children will never be
                    // to the left of their parents
                    _adjustPositions(group[j], nodes, {});
                }
            }
            let maxDepth = 0;
            let maxWidth = 0;
            let minDepth = 0;
            for (let j in nodes) {
                maxDepth = Math.max(nodes[j].depth, maxDepth);
                minDepth = Math.min(nodes[j].depth, minDepth);
                maxWidth = Math.max(nodes[j].width, maxWidth);
            }
            overallMaxDepth = Math.max(maxDepth - minDepth, overallMaxDepth);

            for (let j in nodes) {
                allNodeInfos.push({
                    type: "dagNode",
                    id: j,
                    position: {
                        x: ((maxDepth - nodes[j].depth) * horzNodeSpacing) + gridSpacing,
                        y: (nodes[j].width * vertNodeSpacing) + gridSpacing
                    }
                });
            }
            startingWidth = (maxWidth + 1);
        }
        const graphHeight = vertNodeSpacing * (startingWidth - 1);
        const graphWidth = horzNodeSpacing * overallMaxDepth;
        let maxX = graphWidth;
        let maxY = graphHeight;
        const comments = graph.getAllComments();
        comments.forEach((comment) => {
            const pos = comment.getPosition();
            const dimensions = comment.getDimensions();
            maxX = Math.max(maxX, pos.x + dimensions.width);
            maxY = Math.max(maxY, pos.y + dimensions.height);
        });
        return {
            nodeInfos: allNodeInfos,
            maxX: maxX,
            maxY: maxY
        }
    }

    /**
     * DagView.autoAddNode
     * @param parentNodeId
     * @param newType
     * @description
     * adds node to dataflow graph by automatically determining position
     * 1. get parent node to determine position of new node
     * 2. use DagView.newNode to create the new node
     * 3. connect new node to parent node
     */
    export function autoAddNode(
        newType: DagNodeType,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
        input?: object
    ): DagNode {
        let parentNode: DagNode;
        let x: number;
        let y: number;
        let nextAvailablePosition: Coordinate;
        let connectToParent: boolean = false;
        const node: DagNode = DagView.newNode({
            type: newType,
            subType: subType,
            input: input
        });
        const graph = activeDag;
        const tabId = activeDag.getTabId();
        if (parentNodeId) {
            parentNode = graph.getNode(parentNodeId);
            if (parentNode.getMaxChildren() !== 0 && !node.isSourceNode()) {
                connectToParent = true;
            }
            if (parentNode.getType() === DagNodeType.Sort &&
                (newType !== DagNodeType.Export &&
                newType !== DagNodeType.PublishIMD)) {
                // do not encourage connecting to sort node if next node
                // is not an export or publish
                connectToParent = false;
            }
        }


        if (connectToParent) {
            const position: Coordinate = parentNode.getPosition();
            x = position.x + horzNodeSpacing;
            y = position.y + vertNodeSpacing * parentNode.getChildren().length;
        } else {
            const scale = graph.getScale();
            const $dfArea: JQuery = _getActiveArea();
            x = Math.round(($dfArea.scrollLeft() + ($dfArea.width() / 2)) /
                scale / gridSpacing) * gridSpacing;
            y = Math.round(($dfArea.scrollTop() + ($dfArea.height() / 2)) /
                scale / gridSpacing) * gridSpacing;
        }
        nextAvailablePosition = getNextAvailablePosition(graph, x, y);

        DagView.moveNodes(tabId, [{type: "dagNode", id: node.getId(), position: {
            x: nextAvailablePosition.x,
            y: nextAvailablePosition.y
        }}]);

        if (connectToParent) {
            DagView.connectNodes(parentNodeId, node.getId(), 0, tabId);
        }

        return node;
    }

    export function getAllNodes(includeComments?: boolean): JQuery {
        const $dfArea = _getActiveArea();
        let $nodes = $dfArea.find(".operator");
        if (includeComments) {
            $nodes = $nodes.add($dfArea.find(".comment"));
        }
        return $nodes;
    }

    export function getSelectedNodes(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): JQuery {
        let selector = ".operator.selected";
        if (includeSelecting) {
            selector += ", .operator.selecting";
        }
        if (includeComments) {
            selector += ", .comment.selected";
            if (includeSelecting) {
                selector += ", .comment.selecting";
            }
        }
        return _getActiveArea().find(selector);
    }

    export function getSelectedNodeIds(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): DagNodeId[] {
        const $nodes: JQuery = DagView.getSelectedNodes(includeSelecting,
            includeComments);
        const nodeIds = [];
        $nodes.each(function () {
            nodeIds.push($(this).data("nodeid"));
        });
        return nodeIds;
    }

    /**
     * DagView.previewTable
     * @param dagNodeId
     */
    export function previewTable(dagNode: DagNode, tabId?: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            if (dagNode.getType() === DagNodeType.Jupyter) {
                // Show Jupyter Notebook instead of preivew table
                (<DagNodeJupyter>dagNode).showJupyterNotebook();
                deferred.resolve();
            } else {
                // const $node: JQuery = DagView.getNode(dagNode.getId(), null, $dataflowArea);
                tabId = tabId || activeDagTab.getId();
                DagTable.Instance.previewTable(tabId, dagNode)
                .then(deferred.resolve)
                .fail((error) => {
                    Alert.error(AlertTStr.Error, error);
                    deferred.reject(error);
                });
            }
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
            deferred.reject(e);
        }

        return deferred.promise();
    }

    export function previewAgg(dagNode: DagNodeAggregate): void {
        try {
            const aggVal: string | number = dagNode.getAggVal();
            const evalStr: string = dagNode.getParam().evalString;
            const op: string = evalStr.substring(0, evalStr.indexOf("("));
            const title: string = xcHelper.replaceMsg(AggTStr.AggTitle, {
                op: op
            });
            const msg: string = xcHelper.replaceMsg(AggTStr.AggMsg, {
                val: xcHelper.numToStr(<number>aggVal)
            });
            Alert.show({
                title: title,
                msg: msg,
                isAlert: true
            });
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
        }
    }

    /**
     * DagView.run
     * // run the entire dag,
     * // if no nodeIds passed in then it will execute all the nodes
     */
    export function run(nodeIds?: DagNodeId[], optimized?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const graph: DagGraph = activeDag;
        const currTabId: string = graph.getTabId();
        const lockedIds = [];
        const $dataflowArea: JQuery = _getActiveArea();

        graph.execute(nodeIds, optimized)
        .then(function() {
            if (UserSettings.getPref("dfAutoPreview") === true &&
                nodeIds != null &&
                nodeIds.length === 1 &&
                graph.getNode(nodeIds[0]).getType() != DagNodeType.Aggregate &&
                graph.getNode(nodeIds[0]).getType() != DagNodeType.Export
            ) {
                const node: DagNode = graph.getNode(nodeIds[0]);
                if (node.getState() === DagNodeState.Complete) {
                    if (node.getType() === DagNodeType.Aggregate) {
                        DagView.previewAgg(<DagNodeAggregate>node);
                    } else {
                        DagView.previewTable(node, currTabId);
                    }
                }
            }
            deferred.resolve();
        })
        .fail(function(error) {
            if (error && error.hasError && error.node) {
                const nodeId: DagNodeId = error.node.getId();
                const $node: JQuery = DagView.getNode(nodeId, null, $dataflowArea);
                DagTabManager.Instance.switchTab(currTabId);
                StatusBox.show(error.type, $node);
            } else if (error) {
                DagTabManager.Instance.switchTab(currTabId);
                Alert.error(null, error);
            }
            deferred.reject(error);
        })
        .always(function() {
            lockedIds.forEach((nodeId) => {
                DagView.unlockNode(nodeId, currTabId);
            });
        });

        return deferred.promise();
    }

    /**
     *
     * @param nodeIds
     * if no nodeIds passed, will reset all
     */
    export function reset(nodeIds?: DagNodeId[]): void {
        const msg: string = nodeIds ? DagTStr.ResetMsg : DagTStr.ResetAllMsg;
        Alert.show({
            title: DagTStr.Reset,
            msg: msg,
            onConfirm: () => {
                activeDagTab.turnOffSave();
                activeDag.reset(nodeIds);
                activeDagTab.turnOnSave();
            }
        });
    };

    /**
     *
     * @param $node
     * @param text
     */
    export function editDescription(
        nodeId: DagNodeId,
        text: string
    ): XDPromise<void> {
        const graph = activeDag
        const node = graph.getNode(nodeId);
        const oldText = node.getDescription();
        const $node = DagView.getNode(nodeId);

        node.setDescription(text);

        $node.find(".descriptionIcon").remove();

        if (text.length) {
            addDescriptionIcon($node, text);
        } else {
            $node.removeClass("hasDescription");
        }

        Log.add(SQLTStr.EditDescription, {
            "operation": SQLOps.EditDescription,
            "dataflowId": graph.getTabId(),
            "oldDescription": oldText,
            "newDescription": text,
            "nodeId": nodeId
        });
        return activeDagTab.save();
    }

    /**
     *
     * @param nodeId
     * @param title
     */
    export function editTitle(
        nodeId: DagNodeId,
        tabId: string,
        title: string
    ): XDPromise<void> {
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();
        const node = graph.getNode(nodeId);
        const oldTitle = node.getTitle();
        const $node = DagView.getNode(nodeId, tabId);

        node.setTitle(title);
        _drawTitleText($node, node);
        // XXX TODO: update paramTitle's height
        Log.add(SQLTStr.EditNodeTitle, {
            "operation": SQLOps.EditNodeTitle,
            "dataflowId": tabId,
            "oldTitle": oldTitle,
            "newTitle": title,
            "nodeId": nodeId
        });

        return dagTab.save();
    }

    /**
     * DagView.cancel
     * // cancel entire run or execution
     */
    export function cancel() {

    }

    export function highlightLineage(nodeId: DagNodeId, childNodeId?: DagNodeId, type?: string): void {
        const $dfArea = _getActiveArea();
        const $node = DagView.getNode(nodeId, null, $dfArea);
        $node.addClass("lineageSelected");
        if (childNodeId) {
            const $edge: JQuery = $dfArea.find('.edge[data-parentnodeid="' +
                nodeId +
                '"][data-childnodeid="' +
                childNodeId +
                '"]');
            $edge.addClass("lineageSelected");
        }
        const node = activeDag.getNode(nodeId);
        let tipText = "";
        if (type === "rename") {
            tipText = CommonTxtTstr.Renamed;
        } else if (type === "add" || node.getNumParent() === 0) {
            tipText = CommonTxtTstr.Created;
        } else if (type === "remove") {
            tipText = CommonTxtTstr.Removed;
        }
        if (tipText) {
            const pos = node.getPosition();
            const x = pos.x + 31;
            const y = Math.max(1, pos.y - 25);
            let tip: HTML = _dagLineageTipTemplate(x, y, tipText);
            $dfArea.append(tip);
        }
    }

    /**
     * Replace a group of nodes with a custom operator
     * @param nodeIds list of nodeIds need to be nested in the custom operator
     * @returns Promise with void
     * @description
     * 1. Create a custom operator with deep copies of the selected nodes
     * 2. Delete the selected nodes from current graph
     * 3. Add the custom operator to current graph
     * 4. Restore the connections
     * 5. Position the custom operator & update UI
     * 6. Persist the change to KVStore
     */
    export function wrapCustomOperator(nodeIds: DagNodeId[]): XDPromise<void> {
        const connectionInfo: DagSubGraphConnectionInfo
            = activeDag.getSubGraphConnection(nodeIds);
        // Validate the sub graph
        if (connectionInfo.openNodes.length > 0) {
            // The selected node set cannot build a close sub graph
            const errNodeId = connectionInfo.openNodes[0];
            StatusBox.show(DagTStr.CustomOpIncomplete, getNode(errNodeId));
            return PromiseHelper.reject('Selected operator set is open');
        }
        if (connectionInfo.in.length === 0 && connectionInfo.endSets.in.size === 0) {
            // No input edges && No nodes, which have no parents while supposed to
            // Source custom node not supported for now
            let errNodeId = nodeIds[0];
            for (const nodeId of nodeIds) {
                if (activeDag.getNode(nodeId).getNumParent() === 0) {
                    errNodeId = nodeId;
                    break;
                }
            }
            StatusBox.show(DagTStr.CustomOpNoInput, getNode(errNodeId));
            return PromiseHelper.reject('No input');
        }
        if (connectionInfo.out.length === 0 && connectionInfo.endSets.out.size === 0) {
            // We don't support custom Op w/o an output for now
            let errNodeId = nodeIds[0];
            for (const nodeId of nodeIds) {
                if (activeDag.getNode(nodeId).getChildren().length === 0) {
                    errNodeId = nodeId;
                    break;
                }
            }
            StatusBox.show(DagTStr.CustomOpNoOutput, getNode(errNodeId));
            return PromiseHelper.reject('no output');
        }
        if ((connectionInfo.out.length + connectionInfo.endSets.out.size) > 1) {
            // We only support one output for now
            const errNodeId = connectionInfo.out.length > 0
                ? connectionInfo.out[0].parentId
                : Array.from(connectionInfo.endSets.out)[0];
            StatusBox.show(DagTStr.CustomOpTooManyOutput, getNode(errNodeId));
            return PromiseHelper.reject('too many output');
        }

        const dagTab: DagTab = activeDagTab;
        const tabId = dagTab.getId();
        try {
            // Turn off KVStore saving for better performance
            dagTab.turnOffSave();

            // Create customNode from selected nodes
            const nodeInfos = createNodeInfos(nodeIds, activeDag);
            const {
                node: customNode,
                connectionIn: newConnectionIn,
                connectionOut: newConnectionOut
            } = _createCustomNode(nodeInfos, connectionInfo);

            // Position custom operator
            const nodePosList = nodeInfos.map((nodeInfo) => ({
                x: nodeInfo.display.x,
                y: nodeInfo.display.y
            }));
            const geoInfo = _getGeometryInfo(nodePosList);
            customNode.setPosition(geoInfo.centroid);
            // Position custom OP input nodes
            for (const inputNode of customNode.getInputNodes()) {
                const childGeoInfo = _getGeometryInfo(
                    inputNode.getChildren().map((child) => child.getPosition())
                );
                inputNode.setPosition({
                    x: childGeoInfo.min.x - horzNodeSpacing,
                    y: childGeoInfo.centroid.y
                });
            }
            // Position custom OP output nodes
            for (const outputNode of customNode.getOutputNodes()) {
                const parentGeoInfo = _getGeometryInfo(
                    outputNode.getParents().reduce((res, parent) => {
                        if (parent != null) {
                            res.push(parent.getPosition());
                        }
                        return res;
                    }, [])
                );
                outputNode.setPosition({
                    x: parentGeoInfo.max.x + horzNodeSpacing,
                    y: parentGeoInfo.centroid.y
                });
            }
            // Re-position all nodes in sub graph
            const subNodeGeoInfo = _getGeometryInfo(customNode.getSubNodePositions());
            const deltaPos = {
                x: gridSpacing * 2 - subNodeGeoInfo.min.x,
                y: gridSpacing * 2 - subNodeGeoInfo.min.y
            };
            customNode.changeSubNodePostions(deltaPos);

            // Re-calculate sub graph dimensions
            let graphDimensions = customNode.getSubGraph().getDimensions();
            for (const nodePos of customNode.getSubNodePositions()) {
                graphDimensions = _calculateDimensions(graphDimensions, nodePos);
            }
            customNode.getSubGraph().setDimensions(
                graphDimensions.width, graphDimensions.height);

            // Add customNode to DagView
            const customLogParam: LogParam = {
                title: SQLTStr.CreateCustomOperation,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: tabId
                }
            };
            activeDag.addNode(customNode);
            const addLogParam = _addNodeNoPersist(customNode, { isNoLog: true });
            customLogParam.options.actions.push(addLogParam.options);

            // Delete selected nodes
            const removeLogParam = _removeNodesNoPersist(
                nodeIds,
                tabId,
                { isNoLog: true, isSwitchState: false }
            );
            customLogParam.options.actions.push(removeLogParam.options);

            // Connections to customNode
            for (const { parentId, childId, pos } of newConnectionIn) {
                const connectLogParam = _connectNodesNoPersist(
                    parentId,
                    childId,
                    pos,
                    tabId,
                    { isNoLog: true, isSwitchState: false }
                );
                customLogParam.options.actions.push(connectLogParam.options);
            }
            for (const { parentId, childId, pos } of newConnectionOut) {
                const connectLogParam = _connectNodesNoPersist(
                    parentId,
                    childId,
                    pos,
                    tabId,
                    { isNoLog: true, isSwitchState: false }
                );
                customLogParam.options.actions.push(connectLogParam.options);
            }

            // Restore the state
            const nodeStates: Map<string, number> = new Map();
            for (const nodeInfo of nodeInfos) {
                const state = nodeInfo.state || DagNodeState.Unused;
                const count = nodeStates.get(state) || 0;
                nodeStates.set(state, count + 1);
            }
            const completeCount = nodeStates.get(DagNodeState.Complete) || 0;
            if (completeCount > 0 && completeCount === nodeInfos.length) {
                // All nodes are in complete state, so set the CustomNode to complete
                customNode.beCompleteState();
            } else {
                customNode.switchState();
            }

            Log.add(customLogParam.title, customLogParam.options);

            // Turn on KVStore saving
            dagTab.turnOnSave();
            return dagTab.save();
        } catch(e) {
            dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

    /**
     * Share a custom operator(node). Called by the node popup menu.
     * @param nodeId
     * @description
     * 1. Find the DagNode needs to be shared in the active DagGraph
     * 2. Make a deep copy of the node
     * 3. Call DagCategoryBar to add the copy to the category bar(and extra actions, such as persisting)
     * 4. Change the display name of the node
     * 5. Persist the tab to KVStore
     */
    export function shareCustomOperator(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = activeDag.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`Node(${nodeId}) not found`);
        }
        const newNode = DagNodeFactory.create(dagNode.getNodeCopyInfo());
        if (newNode instanceof DagNodeCustom) {
            newNode.getSubGraph().reset();
        }

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagCategoryBar.Instance.addOperator({
            categoryName: DagCategoryType.Custom,
            dagNode: newNode,
            isFocusCategory: true
        })
            .then((newName) => {
                if (dagNode instanceof DagNodeCustom) {
                    dagNode.setCustomName(newName);
                    const $opTitle = getNode(dagNode.getId()).find('.opTitle');
                    $opTitle.text(dagNode.getCustomName());
                }
            })
            .then(() => activeDagTab.save())
            .then(() => deferred.resolve())
            .fail(deferred.reject);

        return deferred.promise();
    }

    /**
     * Open a tab to show customOp's sub graph for editing
     * @param nodeId
     */
    export function editCustomOperator(nodeId: DagNodeId): void {
        const dagNode = activeDag.getNode(nodeId);
        if (dagNode == null) {
            return;
        }
        if (dagNode instanceof DagNodeCustom) {
            DagTabManager.Instance.newCustomTab(dagNode);
        }
    }

    /**
     * Open a tab to show SQL sub graph for viewing purpose
     * @param nodeId
     */
    export function inspectSQLNode(nodeId: DagNodeId): void {
        const dagNode = activeDag.getNode(nodeId);
        if (dagNode == null) {
            return;
        }
        if (dagNode instanceof DagNodeSQL) {
            if (!dagNode.getSubGraph()) {
                dagNode.updateSubGraph();
            }
            DagTabManager.Instance.newSQLTab(dagNode);
            this.autoAlign(activeDag.getTabId());
        }
    }

    /**
     * Expand the SQL node into a sub graph in place for editing purpose
     * @param nodeId
     */
    export function expandSQLNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = activeDag.getNode(nodeId);
        const tabId = activeDag.getTabId();
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeSQL) {
            return _expandSubgraphNode({
                dagNode: dagNode,
                tabId: tabId,
                logTitle: SQLTStr.ExpandSQLOperation,
                getInputParent: (node) => dagNode.getInputParent(node),
                isInputNode: (node) => (node instanceof DagNodeSQLSubInput),
                isOutputNode: (node) => (node instanceof DagNodeSQLSubOutput),
                preExpand: () => {
                    if (!dagNode.getSubGraph()) {
                        dagNode.updateSubGraph();
                    }
                },
                isPreAutoAlign: true
            });
        } else {
            return PromiseHelper.reject(`${nodeId} is not a SQL operator`);
        }
    }

    /**
     * Expand the Custom node into a sub graph in place for editing purpose
     * @param nodeId
     */
    export function expandCustomNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = activeDag.getNode(nodeId);
        const tabId = activeDag.getTabId();
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeCustom) {
            return _expandSubgraphNode({
                dagNode: dagNode,
                tabId: tabId,
                logTitle: SQLTStr.ExpandCustomOperation,
                getInputParent: (node) => dagNode.getInputParent(node),
                isInputNode: (node) => (node instanceof DagNodeCustomInput),
                isOutputNode: (node) => (node instanceof DagNodeCustomOutput)
            });
        } else {
            return PromiseHelper.reject(`${nodeId} is not a Custom operator`);
        }
    }

    /**
     * Change the zoom level (scale) of the active graph
     * @param isZoomIn
     * @description
     * 1. find the next zoom level
     * 2. store the change in scale
     * 3. set the scale in graph
     * 4. adjust dataflowAreaWrapper min-height and min-width
     * 5. adjust scrollbar
     */
    export function zoom(isZoomIn: boolean) {
        const prevScale: number = activeDag.getScale();
        let scaleIndex: number = zoomLevels.indexOf(prevScale);
        let scale: number;
        if (isZoomIn) {
            scaleIndex++;
        } else {
            scaleIndex--;
        }
        if (scaleIndex < 0 || scaleIndex >= zoomLevels.length) {
            return;
        } else {
            scale = zoomLevels[scaleIndex];
        }

        activeDag.setScale(scale);
        const deltaScale: number = scale / prevScale;
        const $dfArea: JQuery = _getActiveArea();
        const $dfAreaWrap: JQuery = $dfArea.find(".dataflowAreaWrapper");
        const prevScrollTop: number = $dfArea.scrollTop();
        const prevScrollLeft: number = $dfArea.scrollLeft();
        const prevMidHeight: number = $dfArea.height() / 2;
        const prevMidWidth: number = $dfArea.width() / 2;

        $dfAreaWrap.children().css("transform", "scale(" + scale + ")");
        const dimensions = activeDag.getDimensions();
        if (dimensions.width > -1) {
            $dfAreaWrap.css("min-width", dimensions.width * scale);
            $dfAreaWrap.css("min-height", dimensions.height * scale);
        }
        $dfAreaWrap.css("background-size", gridLineSize * scale);
        // do not adjust scrolltop or scrollLeft if at 0
        if ($dfArea.scrollTop()) {
            const midHeight = $dfArea.height() / 2;
            const scrollTop = deltaScale * (prevScrollTop + prevMidHeight) -
                midHeight;
            $dfArea.scrollTop(scrollTop);
        }
        if ($dfArea.scrollLeft()) {
            const midWidth = $dfArea.width() / 2;
            const scrollLeft = deltaScale * (prevScrollLeft + prevMidWidth) -
                midWidth;
            $dfArea.scrollLeft(scrollLeft);
        }
    }

    export function findLinkOutNode(nodeId: DagNodeId): void {
        try {
            const dagNode: DagNodeDFIn = <DagNodeDFIn>activeDag.getNode(nodeId);
            const res = dagNode.getLinedNodeAndGraph();
            const graph: DagGraph = res.graph;
            if (graph !== activeDag) {
                // swith to the graph
                DagTabManager.Instance.switchTab(graph.getTabId());
            }
            // focus on the node
            DagView.selectNodes(graph.getTabId(), [res.node.getId()]);
        } catch (e) {
            Alert.error(AlertTStr.Error, e.message);
        }
    }

    /**
     * Check if modification to graph/nodes should be disabled, Ex. it's showing the subGraph of a customNode
     */
    export function isDisableActions(): boolean {
        const activeTab = getActiveTab();
        return (activeTab instanceof DagTabCustom ||
                activeTab instanceof DagTabSQL ||
                activeTab instanceof DagTabOptimized);
    }

    export function isViewOnly(): boolean {
        return _getActiveArea().hasClass("viewOnly");
    }

    export function isLocked($dfArea): boolean {
        return $dfArea.hasClass("locked");
    }

    function _createCustomNode(
        dagNodeInfos,
        connection: DagSubGraphConnectionInfo
    ): {
            node: DagNodeCustom,
            connectionIn: NodeConnection[],
            connectionOut: NodeConnection[]
        } {
        const customNode = new DagNodeCustom();
        const nodeIdMap = new Map<DagNodeId, DagNodeId>();

        // Create sub graph
        const dagNodes = dagNodeInfos.map((nodeInfo) => {
            nodeInfo = xcHelper.deepCopy(nodeInfo);
            const newNode = customNode.getSubGraph().newNode(nodeInfo);
            nodeIdMap.set(nodeInfo.nodeId, newNode.getId());
            return newNode;
        });

        const dagMap = new Map<string, DagNode>();
        for (const dagNode of dagNodes) {
            dagMap.set(dagNode.getId(), dagNode);
        }

        // Restore internal connections
        const newInnerConnection = connection.inner.map((connection) => {
            return {
                parentId: nodeIdMap.get(connection.parentId),
                childId: nodeIdMap.get(connection.childId),
                pos: connection.pos
            };
        });
        customNode.getSubGraph().restoreConnections(newInnerConnection);

        // Setup input
        const inputConnection: NodeConnection[] = [];
        for (const connectionInfo of connection.in) {
            const inPortIdx = customNode.addInputNode({
                node: dagMap.get(nodeIdMap.get(connectionInfo.childId)),
                portIdx: connectionInfo.pos
            });
            if (connectionInfo.parentId != null) {
                // parentId could be null, in case the connection has been deleted
                inputConnection.push({
                    parentId: connectionInfo.parentId,
                    childId: customNode.getId(),
                    pos: inPortIdx
                });
            }
        }
        // Assign input ports to input ends. One port per parent.
        for (const inNodeId of connection.endSets.in) {
            const node = dagMap.get(nodeIdMap.get(inNodeId));
            // if multi-parents case, assign one port by default
            const numMaxParents = node.getMaxParents() < 0 ? 1 : node.getMaxParents();
            let pos = node.getNextOpenConnectionIndex();
            while (pos >= 0 && pos < numMaxParents) {
                customNode.addInputNode({
                    node: node,
                    portIdx: pos
                });
                pos = node.getNextOpenConnectionIndex();
            }
        }

        // Setup output
        const outputConnection: NodeConnection[] = [];
        if (connection.out.length > 0) {
            // Output nodes with children outside
            const outConnection = connection.out[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(outConnection.parentId)),
                0 // We dont support multiple output now, so set to zero
            );
            outputConnection.push({
                parentId: customNode.getId(),
                childId: outConnection.childId,
                pos: outConnection.pos
            });
        } else if (connection.endSets.out.size > 0) {
            // Potential output nodes without child
            const nodeId = Array.from(connection.endSets.out)[0]; // We dont support multiple outputs now
            customNode.addOutputNode(
                dagMap.get(nodeIdMap.get(nodeId)),
                0 // We dont support multiple output now, so set to zero
            );
        }

        return {
            node: customNode,
            connectionIn: inputConnection,
            connectionOut: outputConnection
        };
    }

    function _expandSubgraphNode(args: {
        dagNode: SubgraphContainerNode,
        tabId: string,
        logTitle: string,
        getInputParent: (node: any) => DagNode,
        isInputNode: (node: DagNode) => boolean,
        isOutputNode: (node: DagNode) => boolean
        preExpand?: () => void,
        isPreAutoAlign?: boolean
    }): XDPromise<void> {
        const {
            dagNode, tabId, logTitle, getInputParent, isInputNode, isOutputNode,
            preExpand = ()=>{}, isPreAutoAlign = false
        } = args;

        const dagTab = DagTabManager.Instance.getTabById(tabId);
        if (dagTab == null) {
            return PromiseHelper.reject(`DagTab(${tabId}) not exist`);
        }
        const graphExpandTo = dagTab.getGraph();

        try {
            dagTab.turnOffSave();
            preExpand();
            const subGraph = dagNode.getSubGraph();
            const allSubNodes = subGraph.getAllNodes();
            const expandNodeIds: string[] = [];
            const expandLogParam: LogParam = {
                title: logTitle,
                options: {
                    operation: SQLOps.DagBulkOperation,
                    actions: [],
                    dataflowId: tabId
                }
            };
            const dagIds = [];
            allSubNodes.forEach(dagNode => {
                dagIds.push(dagNode.getId());
            });
            const connections: NodeConnection[] = [];
            const dagInfoList = createNodeInfos(dagIds, subGraph);
            const oldNodeIdMap = {};
            dagInfoList.forEach((dagNodeInfo: DagNodeInfo) => {
                const parents: DagNodeId[] = dagNodeInfo.parents;
                const oldNodeId = dagNodeInfo["nodeId"];
                const node: DagNode = DagNodeFactory.create(dagNodeInfo);
                const nodeId: string = node.getId();
                oldNodeIdMap[oldNodeId] = nodeId;
                // Figure out connections
                if (isInputNode(node)) {
                    return;
                } else if (isOutputNode(node)) {
                    dagNode.getChildren().forEach((child) => {
                        child.findParentIndices(dagNode).forEach((i) => {
                            connections.push({
                                parentId: parents[0],
                                childId: child.getId(),
                                pos: i
                            });
                        });
                    });
                    return;
                } else {
                    for (let i = 0; i < parents.length; i++) {
                        let parentNode = subGraph.getNode(parents[i]);
                        if (isInputNode(parentNode)) {
                            parentNode = getInputParent(parentNode);
                        }
                        if (parentNode == null) {
                            continue;
                        }
                        connections.push({
                            parentId: parentNode.getId(),
                            childId: nodeId,
                            pos: i
                        });
                    }
                }
                // Add sub nodes to graph
                expandNodeIds.push(nodeId);
                graphExpandTo.addNode(node);
                const addLogParam = _addNodeNoPersist(node, {isNoLog: true});
                expandLogParam.options.actions.push(addLogParam.options);
            });
            // remove the container node from graph
            const removeLogParam = _removeNodesNoPersist(
                [dagNode.getId()],
                tabId,
                { isNoLog: true, isSwitchState: false });
            expandLogParam.options.actions.push(removeLogParam.options);
            // restore edges
            for (const { parentId, childId, pos } of connections) {
                const newParentId = oldNodeIdMap[parentId] || parentId;
                const connectLogParam = _connectNodesNoPersist(
                    newParentId,
                    childId,
                    pos,
                    tabId,
                    { isNoLog: true, spliceIn: true, isSwitchState: false }
                );
                expandLogParam.options.actions.push(connectLogParam.options);
            }

            // Stretch the graph to fit the expanded nodes
            const autoAlignPos: Map<string, Coordinate> = new Map();
            if (isPreAutoAlign) {
                for (const posInfo of getAutoAlignPositions(subGraph).nodeInfos) {
                    const nodeId = oldNodeIdMap[posInfo.id];
                    if (nodeId != null) {
                        autoAlignPos.set(nodeId, Object.assign({}, posInfo.position));
                    }
                }
            }
            const moveInfo = _getExpandPositions(
                dagNode.getPosition(),
                expandNodeIds,
                graphExpandTo,
                autoAlignPos
            );
            const moveLogParam = _moveNodesNoPersist(
                tabId,
                moveInfo.nodePosInfos,
                null,
                { isNoLog: true }
            );
            expandLogParam.options.actions.push(moveLogParam.options);

            Log.add(expandLogParam.title, expandLogParam.options);
            dagTab.turnOnSave();
            return dagTab.save();
        } catch(e) {
            console.error(e);
            dagTab.turnOnSave();
            return PromiseHelper.reject(e);
        }
    }

    function _moveNodesNoPersist(
        tabId: string,
        nodeInfos: NodeMoveInfo[],
        graphDimensions?: Coordinate,
        options?: {
            isNoLog?: boolean
        }
    ): LogParam {
        const { isNoLog = false } = (options || {});
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const $dfArea = DagView.getAreaByTab(tabId);
        let svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .edgeSvg');
        const $operatorArea = $dfArea.find(".operatorSvg");
        const $commentArea: JQuery = $dfArea.find(".commentArea");
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();

        nodeInfos.forEach((nodeInfo, i) => {
            if (nodeInfo.type === "dagNode") {
                const nodeId = nodeInfo.id;
                const $el = DagView.getNode(nodeId, null, $dfArea);

                nodeInfos[i].oldPosition = xcHelper.deepCopy(graph.getNode(nodeId)
                    .getPosition())
                graph.moveNode(nodeId, {
                    x: nodeInfo.position.x,
                    y: nodeInfo.position.y,
                });

                $el.attr("transform", "translate(" + nodeInfo.position.x + "," +
                    nodeInfo.position.y + ")");

                maxXCoor = Math.max(nodeInfo.position.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y, maxYCoor);

                // positions this element in front
                $el.appendTo($operatorArea);

                // redraw all paths that go out from this node
                $dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                    const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                    let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    _drawLineBetweenNodes(tabId, nodeId, childNodeId, connectorIndex, svg);
                });

                // redraw all paths that lead into this node
                $dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').each(function () {
                    const parentNodeId = $(this).attr("data-parentnodeid");
                    let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    _drawLineBetweenNodes(tabId, parentNodeId, nodeId, connectorIndex, svg);
                });
            } else {
                // comment node
                const id = nodeInfo.id;
                const comment = graph.getComment(id);
                nodeInfos[i].oldPosition = xcHelper.deepCopy(comment.getPosition());
                comment.setPosition(nodeInfo.position);
                const $el = $dfArea.find('.comment[data-nodeid="' + id + '"]');
                $el.css({
                    left: nodeInfo.position.x,
                    top: nodeInfo.position.y
                });
                const dimensions = comment.getDimensions();
                maxXCoor = Math.max(nodeInfo.position.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(nodeInfo.position.y + dimensions.height, maxYCoor);

                $el.appendTo($commentArea);
            }
        });

        if (graphDimensions) {
            _setGraphDimensions(graphDimensions, true);
        } else {
            _setGraphDimensions({ x: maxXCoor, y: maxYCoor });
        }

        const logParam: LogParam = {
            title: SQLTStr.MoveOperations,
            options: {
                "operation": SQLOps.MoveOperations,
                "dataflowId": tabId,
                "nodeInfos": nodeInfos
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, logParam.options);
        }

        return logParam;
    }

    function _removeNodesNoPersist(
        nodeIds: DagNodeId[],
        tabId: string,
        options?: {
            isSwitchState?: boolean,
            isNoLog?: boolean
        }
    ): LogParam {
        const { isSwitchState = true, isNoLog = false } = options || {};

        if (!nodeIds.length) {
            return null;
        }
        const $dfArea = DagView.getAreaByTab(tabId);
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        const spliceInfos = {};
        // XXX TODO: check the slowness and fix the performance
        nodeIds.forEach(function (nodeId) {
            if (nodeId.startsWith("dag")) {
                // Remove tabs for custom OP
                const dagNode = graph.getNode(nodeId);
                if (dagNode instanceof DagNodeCustom ||
                    dagNode instanceof DagNodeSQL
                ) {
                    DagTabManager.Instance.removeTabByNode(dagNode);
                }

                const spliceInfo = graph.removeNode(nodeId, isSwitchState);
                DagView.getNode(nodeId, tabId).remove();
                $dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                $dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                    const childNodeId = $(this).attr("data-childnodeid");
                    _removeConnection($(this), $dfArea, childNodeId, tabId);
                });
                spliceInfos[nodeId] = spliceInfo;
            } else if (nodeId.startsWith("comment")) {
                graph.removeComment(nodeId);
                DagComment.Instance.removeComment(nodeId);
            }
        });

        const logParam: LogParam = {
            title: SQLTStr.RemoveOperations,
            options: {
                "operation": SQLOps.RemoveOperations,
                "dataflowId": tabId,
                "nodeIds": nodeIds,
                "spliceInfo": spliceInfos
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    // force connect can be true if undoing an operation where we are connecting
    // to an index that is currently taken, in which case we have to move the
    // other indices
    function _connectNodesNoPersist(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string,
        options?: {
            isReconnect?: boolean,
            spliceIn?: boolean,
            isSwitchState?: boolean,
            isNoLog?: boolean
        }
    ): LogParam {
        const {
            isReconnect = false, isSwitchState = true, isNoLog = false,
            spliceIn = false
        } = options || {};
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        const $dfArea = DagView.getAreaByTab(tabId);
        let prevParentId = null;
        if (isReconnect) {
            const $curEdge = $dfArea.find('.edge[data-childnodeid="' +
                childNodeId +
                '"][data-connectorindex="' +
                connectorIndex + '"]');
            prevParentId = $curEdge.data("parentnodeid");
            graph.disconnect(prevParentId, childNodeId, connectorIndex);

            _removeConnection($curEdge, $dfArea, childNodeId, tabId);
        }

        graph.connect(parentNodeId, childNodeId, connectorIndex, false, isSwitchState,
        spliceIn);

        _drawConnection(parentNodeId, childNodeId, connectorIndex, tabId);

        const logParam: LogParam = {
            title: SQLTStr.ConnectOperations,
            options: {
                "operation": SQLOps.ConnectOperations,
                "dataflowId": tabId,
                "parentNodeId": parentNodeId,
                "childNodeId": childNodeId,
                "connectorIndex": connectorIndex,
                "prevParentNodeId": prevParentId
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    function _getExpandPositions(
        sourceNodeCoord: Coordinate,
        expandNodeIds: (DagNodeId|CommentNodeId)[],
        graphToAdjust: DagGraph,
        prePositionMap: Map<string, Coordinate> = new Map()
    ): {
        nodePosInfos: NodeMoveInfo[], maxX: number, maxY: number
    } {
        const result = { nodePosInfos: [], maxX: 0, maxY: 0 };
        const expandNodeIdSet = new Set(expandNodeIds);

        // Get all the nodes' position info in the target graph
        const allNodePosInfos: NodeMoveInfo[] = [];
        const origNodePositions: Coordinate[] = [];
        const expandNodePositions: Coordinate[] = [];
        graphToAdjust.getAllNodes().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'dagNode',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });
        graphToAdjust.getAllComments().forEach((node) => {
            const nodeId = node.getId();
            const nodePos = prePositionMap.has(nodeId)
                ? Object.assign({}, prePositionMap.get(nodeId))
                : Object.assign({}, node.getPosition());

            allNodePosInfos.push({
                id: nodeId,
                type: 'comment',
                position: nodePos
            });
            if (expandNodeIdSet.has(nodeId)) {
                expandNodePositions.push(nodePos);
            } else {
                origNodePositions.push(nodePos);
            }
        });

        // Calculate geometry information before expanding
        const origGeoInfo = _getGeometryInfo(
            [sourceNodeCoord].concat(origNodePositions)
        );

        // Calculate geometry infomation of expanded nodes
        const expandGeoInfo = _getGeometryInfo(expandNodePositions);

        const expandDimensions: Dimensions = {
            width: expandGeoInfo.max.x - expandGeoInfo.min.x,
            height: expandGeoInfo.max.y - expandGeoInfo.min.y
        };

        // Calculate the new positions
        const expandDeltaX = sourceNodeCoord.x - expandGeoInfo.centroid.x;
        const expandDeltaY = sourceNodeCoord.y - expandGeoInfo.centroid.y;
        const deltaX = Math.floor(expandDimensions.width / 2);
        const deltaY = Math.floor(expandDimensions.height / 2);
        for (const posInfo of allNodePosInfos) {
            const newPosInfo: NodeMoveInfo = {
                id: posInfo.id, type: posInfo.type, position: {
                    x: 0, y: 0
                }
            };
            if (expandNodeIdSet.has(posInfo.id)) {
                // Position the expand nodes according to the position of source node
                newPosInfo.position.x = posInfo.position.x + expandDeltaX;
                newPosInfo.position.y = posInfo.position.y + expandDeltaY;
            } else {
                // Position other nodes according to the geometry size of expaned nodes
                if (posInfo.position.x >= sourceNodeCoord.x) {
                    newPosInfo.position.x = posInfo.position.x + deltaX;
                } else {
                    newPosInfo.position.x = posInfo.position.x - deltaX;
                }
                if (posInfo.position.y >= sourceNodeCoord.y) {
                    newPosInfo.position.y = posInfo.position.y + deltaY;
                } else {
                    newPosInfo.position.y = posInfo.position.y - deltaY;
                }
            }
            result.nodePosInfos.push(newPosInfo);
        }

        // Shift the positions, so that nobody is out of bound
        const newGeoInfo = _getGeometryInfo(result.nodePosInfos.map((info) => info.position));
        const shiftDeltaX = origGeoInfo.min.x - newGeoInfo.min.x;
        const shiftDeltaY = origGeoInfo.min.y - newGeoInfo.min.y;
        for (const posInfo of result.nodePosInfos) {
            posInfo.position.x += shiftDeltaX;
            posInfo.position.y += shiftDeltaY;
        }

        // Calculate the screen dimension
        result.maxX = newGeoInfo.max.x + shiftDeltaX;
        result.maxY = newGeoInfo.max.y + shiftDeltaY;

        return result;
    }

    function _getGeometryInfo(posList: Coordinate[]): {
        centroid: Coordinate,
        max: Coordinate,
        min: Coordinate
    } {
        const centroid = { x: 0, y: 0 };
        const max = { x: 0, y: 0 };
        const min = { x: null, y: null };

        if (posList == null || posList.length === 0) {
            return {
                centroid: centroid, max: max, min: min
            };
        }

        let sumX = 0;
        let sumY = 0;
        for (const { x, y } of posList) {
            max.x = Math.max(max.x, x);
            max.y = Math.max(max.y, y);
            min.x = min.x == null ? x : Math.min(min.x, x);
            min.y = min.y == null ? y : Math.min(min.y, y);
            sumX += x;
            sumY += y;
        }
        const len = posList.length;
        centroid.x = Math.floor(sumX / len);
        centroid.y = Math.floor(sumY / len);

        return {
            centroid: centroid, max: max, min: min
        }
    }

    function _dagLineageTipTemplate(x, y, text): HTML {
        return '<div class="dagTableTip lineageTip" ' +
            'style="left:' + x + 'px;top:' + y + 'px;">' +
            '<div>' + text + '</div>' +
            '</div>';
    }

    function _removeConnection(
        $edge: JQuery,
        $dfArea: JQuery,
        childNodeId: DagNodeId,
        tabId: string
    ): void {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();
        const $childNode: JQuery = DagView.getNode(childNodeId, null, $dfArea);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        const dagTab = DagTabManager.Instance.getTabById(tabId)
        const graph = dagTab.getGraph();
        if ($childConnector.hasClass("multi")) {
            // if removing an edge from a multichildnode then decrement all
            // the edges that have a greater index than the removed one
            // due to splice action on children array
            const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .edgeSvg');
            $dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!DagView.getNode(parentNodeId, null, $dfArea).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        $curEdge.attr("data-connectorindex", index - 1);
                        return true;
                    }
                    $curEdge.remove();

                    _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, index - 1, svg);
                    $curEdge.attr("data-connectorindex", index - 1);
                }
            });
        } else if (graph.getNode(childNodeId).getNumParent() === 0) {
            $childConnector.removeClass("hasConnection")
                .addClass("noConnection");
        }
        dagTab.save();
    }


    function _addEventListeners(): void {
        let mainAreaHeight;
        let $tableArea;
        let $parent;
        $dfWrap.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 40,
            start: function() {
                $parent = $dfWrap.parent();
                $parent.addClass("resizing");
                mainAreaHeight = $parent.height();
                $tableArea = $("#dagViewTableArea");
            },
            resize: function(_event, ui) {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    // ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                    $dfWrap.height(mainAreaHeight - 100);
                    $dfWrap.css("top", 100);
                }

                $tableArea.height(100 * (1 - pct) + "%");
            },
            stop: function(_event, ui) {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                }
                let pctTop = ui.position.top / mainAreaHeight;

                $dfWrap.css("top", 100 * pctTop + "%");
                $dfWrap.height(100 * pct + "%");
                $tableArea.height(100 * (1 - pct) + "%");
                $parent.removeClass("resizing");
                $tableArea = null;
                $parent = null;
            }
        });


        $dagView.find(".dataflowWrapBackground").on("click", ".newTab", () => {
            DagTabManager.Instance.newTab();
        });

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main, .comment", function (event) {
            const $opMain = $(this);
            let $operator = $opMain.closest(".operator");
            if (!$operator.length) {
                $operator = $opMain;
            }

            // if not shift clicking, deselect other nodes
            // if shift clicking, and this is selected, then deselect it
            // but don't allow dragging on deselected node
            if (!$operator.hasClass("selected") && !event.shiftKey) {
                $dfWrap.find(".selected").removeClass("selected");
            } else if ($operator.hasClass("selected") && event.shiftKey) {
                $operator.removeClass("selected");
                return;
            }
            $operator.addClass("selected");
            if (event.which !== 1) {
                return;
            }
            if ($(event.target).closest(".ui-resizable-handle").length ||
                $(event.target).is("textarea")) {
                if (!event.shiftKey) {
                    $dfWrap.find(".selected").removeClass("selected");
                    $operator.addClass("selected");
                }
                return;
            }
            const $dfArea = _getActiveArea();
            const tabId = activeDag.getTabId();
            const $elements = $operator.add($dfArea.find(".selected"));

            // the description icon and large node title cause the
            // desired dimensions of the operator element to be altered so we
            // undo its effects by using offsets
            const elOffsets = [];
            $elements.each(function () {
                const $el = $(this);
                const elOffset = { x: 0, y: 0 };
                if ($el.is(".operator")) {
                    if ($el.find(".descriptionIcon").length) {
                        elOffset.y = 4;
                    }
                    const outerLeft = this.getBoundingClientRect().left;
                    const innerLeft = $(this).find('.main')[0].getBoundingClientRect().left;
                    elOffset.x = (innerLeft - inConnectorWidth) - outerLeft;
                }
                elOffsets.push(elOffset);
            });

            new DragHelper({
                event: event,
                $element: $operator,
                $elements: $elements,
                $container: $dagView,
                $dropTarget: $dfArea.find(".dataflowAreaWrapper"),
                round: gridSpacing,
                scale: activeDag.getScale(),
                elOffsets: elOffsets,
                onDragStart: function (_$els) {
                },
                onDragEnd: function ($els, _event, data) {
                    let nodeInfos = [];
                    $els.each(function (i) {
                        const id = $(this).data("nodeid");
                        if ($(this).hasClass("operator")) {
                            nodeInfos.push({
                                type: "dagNode",
                                id: id,
                                position: data.coors[i]
                            });
                        } else if ($(this).hasClass("comment")) {
                            nodeInfos.push({
                                type: "comment",
                                id: id,
                                position: data.coors[i]
                            });
                        }
                    });
                    DagView.moveNodes(tabId, nodeInfos);
                },
                onDragFail: function (wasDragged: boolean) {
                    if (!wasDragged) {
                        // did not drag
                        if (!event.shiftKey) {
                            $dfWrap.find(".selected").removeClass("selected");
                            $operator.addClass("selected");
                        }
                        // if no drag, treat as right click and open menu

                        if (!$opMain.hasClass("comment") && !event.shiftKey) {
                            let contextMenuEvent = $.Event("contextmenu", {
                                pageX: event.pageX,
                                pageY: event.pageY
                            });
                            $opMain.trigger(contextMenuEvent);
                        }
                    }
                },
                move: true
            });
        });

        // connecting 2 nodes dragging the parent's connector
        $dfWrap.on("mousedown", ".operator .connector.out", function (event) {
            if (event.which !== 1) {
                return;
            }
            const $parentConnector = $(this);
            const $parentNode = $parentConnector.closest(".operator");
            const parentNodeId: DagNodeId = $parentNode.data("nodeid");
            const $dfArea = _getActiveArea();
            let $candidates: JQuery;
            let path;
            let parentCoors;
            let scale: number = activeDag.getScale();
            const tabId = activeDag.getTabId();

            new DragHelper({
                event: event,
                $element: $parentConnector,
                $container: $dagView,
                $dropTarget: $dfArea.find(".dataflowAreaWrapper"),
                offset: {
                    x: 0,
                    y: -2
                },
                scale: scale,
                noCursor: true,
                onDragStart: function (_$el: JQuery, _e: JQueryEventObject) {
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function () {
                        const childNodeId = $(this).data("nodeid");
                        if (childNodeId === parentNodeId) {
                            return false;
                        }
                        let index = activeDag.getNode(childNodeId).getNextOpenConnectionIndex();
                        if (index === -1) {
                            return false;
                        } else {
                            return activeDag.canConnect(parentNodeId, childNodeId, index, true);
                        }
                    });
                    $operators.addClass("noDrop");
                    $candidates.removeClass("noDrop").addClass("dropAvailable");
                    const offset = _getDFAreaOffset();
                    const rect = $parentConnector[0].getBoundingClientRect();
                    parentCoors = {
                        x: (rect.right + offset.left) - 1,
                        y: (rect.top + offset.top) + 6
                    };
                    // setup svg for temporary line
                    $dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                    const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .secondarySvg');

                    const edge: d3 = svg.append("g")
                        .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function (coors) {
                    const offset = _getDFAreaOffset();
                    const childCoors = {
                        x: (coors.x + offset.left),
                        y: (coors.y + offset.top) + 5
                    };
                    path.attr("d", lineFunction([parentCoors, childCoors]));
                },
                onDragEnd: function (_$el, event) {
                    let $childNode: JQuery;
                    $candidates.removeClass("dropAvailable noDrop");

                    $dfArea.find(".secondarySvg").remove();
                    // check if location of drop matches position of a valid
                    // $operator
                    $candidates.each(function () {
                        const rect: ClientRect = this.getBoundingClientRect();
                        const left: number = rect.left;
                        const right: number = rect.right;
                        const top: number = rect.top;
                        const bottom: number = rect.bottom;
                        if (event.pageX >= left && event.pageX <= right &&
                            event.pageY >= top && event.pageY <= bottom) {
                            $childNode = $(this);
                            return false;
                        }
                    });

                    if (!$childNode) {
                        console.log("invalid connection");
                        return;
                    }

                    // Figure out the connectorIn element of the child node
                    let $childConnectorIn: JQuery = null;
                    $childNode.find('.connector.in').each((index, elem) => {
                        const rect: ClientRect = elem.getBoundingClientRect();
                        if (event.pageX >= rect.left && event.pageX <= rect.right &&
                            event.pageY >= rect.top && event.pageY <= rect.bottom) {
                            $childConnectorIn = $(elem);
                            return false;
                        }
                    });

                    const childNodeId: DagNodeId = $childNode.data("nodeid");
                    const childNode: DagNode = activeDag.getNode(childNodeId);
                    const connectorIndex: number = $childConnectorIn == null
                        ? childNode.getNextOpenConnectionIndex() // drop in the area other than connectors, connect to the next available input
                        : (childNode.canHaveMultiParents() // drop in one of the connectors
                            ? childNode.getNextOpenConnectionIndex() // it's a multi-connection(such as Set) node, connect to the next available input
                            : parseInt($childConnectorIn.data('index'))); // it's a normal node, connect to the corresponding input
                    if (!activeDag.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode);
                        return;
                    }
                    const warning = _connectionWarning(childNodeId, parentNodeId);
                    if (warning) {
                        Alert.show({
                            title: warning.title,
                            msg: warning.msg,
                            onConfirm: () => {
                                DagView.connectNodes(parentNodeId, childNodeId, connectorIndex, tabId);
                            }
                        });
                    } else {
                        DagView.connectNodes(parentNodeId, childNodeId,
                                            connectorIndex, tabId);
                    }
                },
                onDragFail: function (wasDragged: boolean) {
                    if (wasDragged) {
                        $candidates.removeClass("dropAvailable noDrop");
                        $dfArea.find(".secondarySvg").remove();
                    }
                },
                copy: true
            });
        });

        // connecting 2 nodes dragging the child's connector
        $dfWrap.on("mousedown", ".operator .connector.in", function (event) {
            if (event.which !== 1) {
                return;
            }

            const $childConnector = $(this);
            const $childNode = $childConnector.closest(".operator");
            const childNodeId: DagNodeId = $childNode.data("nodeid");
            const $dfArea = _getActiveArea();
            let $candidates: JQuery;
            let path;
            let childCoors;
            let otherParentId;
            const tabId = activeDag.getTabId();

            const childNode = activeDag.getNode(childNodeId);
            const connectorIndex = childNode.canHaveMultiParents()
                ? childNode.getNextOpenConnectionIndex()
                : parseInt($childConnector.data("index"));
            // if child connector is in use, when drag finishes we will remove
            // this connection and replace with a new one
            const isReconnecting = childNode.getParents()[connectorIndex] != null;

            let scale = activeDag.getScale();
            new DragHelper({
                event: event,
                $element: $childConnector,
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
                scale: scale,
                noCursor: true,
                onDragStart: function (_$el: JQuery, _e: JQueryEventObject) {
                    if (isReconnecting) {
                        // connection already taken, temporarily remove connection
                        // and create a new one when drop finishes or add it back
                        // if drop fails
                        const $curEdge = $dfArea.find('.edge[data-childnodeid="' +
                            childNodeId +
                            '"][data-connectorindex="' +
                            connectorIndex + '"]');
                        otherParentId = $curEdge.data("parentnodeid");
                        activeDag.disconnect(otherParentId, childNodeId,
                            connectorIndex);
                    }
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function () {
                        const parentNodeId = $(this).data("nodeid");
                        if (childNodeId === parentNodeId) {
                            return false;
                        }

                        return activeDag.canConnect(parentNodeId, childNodeId,
                            connectorIndex, true);
                    });

                    $operators.addClass("noDrop");
                    $candidates.removeClass("noDrop").addClass("dropAvailable");
                    const offset = _getDFAreaOffset();
                    const rect = $childConnector[0].getBoundingClientRect();
                    childCoors = {
                        x: (rect.left + offset.left) - 1,
                        y: (rect.top + offset.top) + 4
                    };
                    // setup svg for temporary line
                    $dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                    const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .secondarySvg');

                    const edge = svg.append("g")
                        .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function (coors) {
                    const offset = _getDFAreaOffset();
                    const parentCoors = {
                        x: (coors.x + offset.left) + 2,
                        y: (coors.y + offset.top) + 4
                    };
                    path.attr("d", lineFunction([childCoors, parentCoors]));
                },
                onDragEnd: function (_$el, event) {
                    let $parentNode: JQuery;
                    $candidates.removeClass("dropAvailable noDrop");

                    $dfArea.find(".secondarySvg").remove();
                    // check if location of drop matches position of a valid
                    // $operator
                    $candidates.each(function () {
                        const rect: ClientRect = this.getBoundingClientRect();
                        const left: number = rect.left;
                        const right: number = rect.right;
                        const top: number = rect.top;
                        const bottom: number = rect.bottom;
                        if (event.pageX >= left && event.pageX <= right &&
                            event.pageY >= top && event.pageY <= bottom) {
                            $parentNode = $(this);
                            return false;
                        }
                    });

                    if (!$parentNode) {
                        if (isReconnecting) {
                            activeDag.connect(otherParentId, childNodeId,
                                connectorIndex, true, false);
                        }
                        return;
                    }

                    const parentNodeId: DagNodeId = $parentNode.data("nodeid");

                    if (!activeDag.canConnect(parentNodeId, childNodeId,
                        connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode);
                        if (isReconnecting) {
                            activeDag.connect(otherParentId, childNodeId,
                                connectorIndex, true, false);
                        }
                        return;
                    }
                    if (isReconnecting) {
                        activeDag.connect(otherParentId, childNodeId,
                            connectorIndex, true, false);
                    }

                    const warning = _connectionWarning(childNodeId, parentNodeId);
                    if (warning) {
                        Alert.show({
                            title: warning.title,
                            msg: warning.msg,
                            onConfirm: () => {
                                DagView.connectNodes(parentNodeId, childNodeId, connectorIndex, tabId, isReconnecting);
                            }
                        });
                    } else {
                        DagView.connectNodes(parentNodeId, childNodeId,
                                            connectorIndex, tabId, isReconnecting);

                    }
                },
                onDragFail: function (wasDragged: boolean) {
                    if (wasDragged) {
                        $candidates.removeClass("dropAvailable noDrop");
                        $dfArea.find(".secondarySvg").remove();
                        if (isReconnecting) {
                            activeDag.connect(otherParentId, childNodeId,
                                connectorIndex, true, false);
                        }
                    }
                },
                copy: true
            });
        });

        // drag select multiple nodes
        let $dfArea;
        let $els;
        $dfWrap.on("mousedown", function(event) {
            if (event.which !== 1 || activeDagTab == null) {
                return;
            }
            let $target = $(event.target);
            $dfArea = _getActiveArea();

            if ($target.closest(".dataflowAreaWrapper").length &&
                !$target.closest(".operator").length &&
                !$target.closest(".comment").length &&
                !$target.closest(".editableNodeTitle").length &&
                !$target.closest(".ui-resizable-handle").length) {
                new RectSelction(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfArea.find(".dataflowAreaWrapper"),
                    "$scrollContainer": $dfArea,
                    "onStart": function () {
                        $dfArea.addClass("drawing");
                        $els = $dfArea.find(".operator");
                        $els = $els.add($dfArea.find(".comment"));
                        $els.removeClass("selected");
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            } else if ($target.closest(".operator").length) {
                const $operator = $target.closest(".operator");
                if (!$operator.hasClass("selected")) {
                    $dfWrap.find(".selected").removeClass("selected");
                    $operator.addClass("selected");
                }
            }
        });

        $dfWrap.on("click", ".descriptionIcon", function () {
            const nodeId: DagNodeId = $(this).closest(".operator")
                .data("nodeid");
            DagDescriptionModal.Instance.show(nodeId);
        });

        $dfWrap.on("dblclick", ".nodeTitle", function () {
            _nodeTitleEditMode($(this));
        });

        $dfWrap.on("dblclick", ".paramTitle", function() {
            const $node: JQuery = $(this).closest(".operator");
            const node: DagNode = activeDag.getNode($node.data("nodeid"));
            if (node != null) {
                DagNodeMenu.execute("configureNode", {
                    node: node
                });
            }
        });

        function _drawRect(
            bound: ClientRect,
            selectTop: number,
            selectRight: number,
            selectBottom: number,
            selectLeft: number
        ): void {
            $els.each(function () {
                const $el = $(this);
                const opRect: ClientRect = this.getBoundingClientRect();
                const opTop = opRect.top - bound.top;
                const opLeft = opRect.left - bound.left;
                const opRight = opRect.right - bound.left;
                const opBottom = opRect.bottom - bound.top;
                if (opTop > selectBottom || opLeft > selectRight ||
                    opRight < selectLeft || opBottom < selectTop) {
                    $el.removeClass("selecting");
                } else {
                    $el.addClass("selecting");
                }
            });
        }
        function _endDrawRect(_event: JQueryEventObject): void {
            $dfArea.removeClass("drawing");
            const $selectedEls = $dfArea.find(".selecting");
            if ($selectedEls.length === 0) {
                $dfArea.find(".selected").removeClass("selected");
            } else {
                $selectedEls.each(function () {
                    $(this).removeClass("selecting")
                        .addClass("selected");
                });
            }
            $dfArea = null;
            $els = null;
        }
    }

    function _connectionWarning(childNodeId: DagNodeId, parentNodeId: DagNodeId): {
        title: string,
        msg: string
    } {
        const childNode = activeDag.getNode(childNodeId);
        const parentNode = activeDag.getNode(parentNodeId);
        const childType = childNode.getType();

        if (parentNode.getType() === DagNodeType.Sort &&
            (childType !== DagNodeType.Export &&
            childType !== DagNodeType.PublishIMD)) {
            return {
                title: DagTStr.SortConnectWarningTitle,
                msg: DagTStr.SortConnectWarning
            }
        } else {
            return null;
        }
    }

    function _getDFAreaOffset() {
        const $dfArea = _getActiveArea();
        const containerRect = $dfArea[0].getBoundingClientRect();
        const offsetTop = $dfArea.scrollTop() - containerRect.top;
        const offsetLeft = $dfArea.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }

    function _getChildConnector($childNode: JQuery, index: number): JQuery {
        let $childConnector: JQuery;
        let $childConnectors = $childNode.find(".connector.in");
        if ($childConnectors.hasClass("multi")) {
            $childConnector = $childConnectors.eq(0);
        } else {
            $childConnector = $childConnectors.eq(index);
            if (!$childConnector.length) {
                // in case more connections exist than number of connection
                // divs
                $childConnector = $childConnectors.last();
            }
        }
        return $childConnector;
    }

    function _calculateDimensions(
        dimensions: Dimensions, elCoors: Coordinate
    ): Dimensions {
        return {
            width: Math.max(elCoors.x + horzPadding, dimensions.width),
            height: Math.max(elCoors.y + vertPadding, dimensions.height)
        };
    }

    function _setGraphDimensions(elCoors: Coordinate, force?: boolean) {
        const $dfArea = _getActiveArea();
        let height: number;
        let width: number;

        if (force) {
            activeDag.setDimensions(elCoors.x, elCoors.y);
            width = elCoors.x;
            height = elCoors.y;
        } else {
            const dimensions = _calculateDimensions(activeDag.getDimensions(), elCoors);
            width = dimensions.width;
            height = dimensions.height;
            activeDag.setDimensions(width, height);
        }

        const scale = activeDag.getScale();
        $dfArea.find(".dataflowAreaWrapper").css("min-width", width * scale);
        $dfArea.find(".dataflowAreaWrapper").css("min-height", height * scale);
        $dfArea.find(".dataflowAreaWrapper").css("background-size", gridLineSize * scale);
    }

    // for param tooltip
    function _formatTooltip(param): string {
        let title = xcHelper.escapeHTMLSpecialChar(JSON.stringify(param, null, 2));
        if (title === "{}") {
            title = "empty";
        } else {
            if (title.indexOf("{\n") === 0 && title.lastIndexOf("}") === title.length - 1) {
                title = title.slice(2, -1);
            }
        }
        return title;
    }

    function _setTooltip($node: JQuery, node: DagNode): void {
        if (node.getState() !== DagNodeState.Error) {
            xcTooltip.remove($node.find(".main"));
        } else {
            const title: string = (node.getState() === DagNodeState.Error) ?
            node.getError() : _formatTooltip(node.getParam());

            xcTooltip.add($node.find(".main"), {
                title: title,
                classes: "preWrap leftAlign wide"
            });
        }

        $node.find(".paramIcon").remove();
        if (node.hasParameters()) {
            d3.select($node.get(0)).append("text")
                    .attr("class", "paramIcon")
                    .attr("fill", "#44515C")
                    .attr("font-size", 10)
                    .attr("transform", "translate(" + (nodeWidth - 28) + "," +
                            (nodeHeight) + ")")
                    .attr("text-anchor", "middle")
                    .attr("font-family", "Open Sans")
                    .text("<>");
        }
    }

    function _drawAndConnectNodes(
        nodes: DagNode[],
        $dfArea: JQuery,
        tabId: string
    ): void {
        for (let i = 0; i < nodes.length; i++) {
            _drawNode(nodes[i], $dfArea);
        }
        _drawAllNodeConnections(nodes, tabId);
    }

    function _drawAllNodeConnections(nodes: DagNode[], tabId: string): void {
        const drawnConnections = {};

        nodes.forEach((node) => {
            const nodeId = node.getId();
            node.getParents().forEach((parentNode, index) => {
                const connectionId = parentNode.getId() + "-" + nodeId + "-" + index;
                if (drawnConnections[connectionId]) {
                    return;
                }
                drawnConnections[connectionId] = true;
                _drawConnection(parentNode.getId(), nodeId, index, tabId);
            });

            const seen = {};
            node.getChildren().forEach((childNode) => {
                const childNodeId = childNode.getId();
                if (seen[childNodeId]) {
                    // node's child will connect to all indices of parent
                    // so don't repeat if we see this child again
                    return;
                }
                seen[childNodeId] = true;
                childNode.getParents().forEach((parent, index) => {
                    if (parent === node) {
                        const connectionId = nodeId + "-" + childNode.getId() + "-" + index;
                        if (drawnConnections[connectionId]) {
                            return;
                        }
                        drawnConnections[connectionId] = true;
                        _drawConnection(nodeId, childNode.getId(), index, tabId);
                    }
                });
            });
        });
    }

    function _drawNode(node: DagNode, $dfArea: JQuery, select?: boolean): JQuery {
        const pos = node.getPosition();
        const type = node.getType();
        const subType = node.getSubType() || "";
        const nodeId = node.getId();

        const $node = $operatorBar.find('.operator[data-type="' + type + '"]' +
            '[data-subtype="' + subType + '"]')
            .first().clone();

        $node.attr("transform", "translate(" + pos.x + "," + pos.y + ")");
        _setTooltip($node, node);
        const description = node.getDescription();
        if (description) {
            addDescriptionIcon($node, description);
        }
        if (type == DagNodeType.Map || type == DagNodeType.Filter) {
            // Create a fake node for the purpose of getting aggregates
            let fakeNode: DagNodeMap = <DagNodeMap>node;
            let aggs: string[] = fakeNode.getAggregates();
            if (aggs.length) {
                addAggregates($node, aggs);
            }
        }

        if (DagTblManager.Instance.hasLock(node.getTable())) {
            editTableLock($node, true);
        }

        let abbrId = nodeId.slice(nodeId.indexOf(".") + 1);
        abbrId = abbrId.slice(abbrId.indexOf(".") + 1);

        _drawTitleText($node, node);

        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("state-" + node.getState());
        if (select) {
            $node.addClass("selected");
        }
        // Set the node display title
        const $opTitle = $node.find('.opTitle');
        $node.removeClass("xc-hidden");
        if (node instanceof DagNodeCustom) {
            $opTitle.text(node.getCustomName());
            // The custom op is hidden in the category bar, so show it in the diagram
        } else if (node instanceof DagNodeCustomInput ||
                   node instanceof DagNodeCustomOutput ||
                   node instanceof DagNodeSQLSubInput ||
                   node instanceof DagNodeSQLSubOutput
        ) {
            $opTitle.text(node.getPortName());
            // The custom input/output is hidden in the category bar, so show it in the diagram
        }

        $node.appendTo($dfArea.find(".operatorSvg"));

        // Update connectorIn according to the number of input ports
        if (node instanceof DagNodeCustom) {
            _updateConnectorIn(node.getId(), node.getNumIOPorts().input);
        }

        return $node;
    }

    function _drawTitleText($node: JQuery, node: DagNode): void {
        // draw node title
        const title: string = node.getTitle();
        const titleLines: string[] = title.split("\n");
        const titleHeight: number = nodeHeight + 12;
        const g = d3.select($node.get(0));
        g.select(".nodeTitle").remove();
        g.select(".paramTitle").remove();
        const textSvg = g.append("text")
            .attr("class", "nodeTitle")
            .attr("fill", "#44515C")
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((nodeWidth / 2) + 1) + "," +
            titleHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        titleLines.forEach((line, i) => {
            textSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * titleLineHeight);
        });

        // draw param title
        const paramHint: string = node.getParamHint();
        const parmLines: string[] = paramHint.split("\n");
        const paramHeight: number = titleHeight + titleLines.length * titleLineHeight;
        const paramTextSvg = g.append("text")
            .attr("class", "paramTitle")
            .attr("fill", "#44515C")
            .attr("font-size", 10)
            .attr("transform", "translate(" + ((nodeWidth / 2) + 1) + "," +
            paramHeight + ")")
            .attr("text-anchor", "middle")
            .attr("font-family", "Open Sans");
        parmLines.forEach((line, i) => {
            paramTextSvg.append("tspan")
                .text(line)
                .attr("x", 0)
                .attr("y", i * titleLineHeight);
        });
    }

    function _updateConnectorIn(nodeId: DagNodeId, numInputs: number) {
        const g = d3.select(getNode(nodeId)[0]);
        DagCategoryBar.Instance.updateNodeConnectorIn(numInputs, g);
    }

    function _drawConnection(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string
    ): void {
        const $dfArea = DagView.getAreaByTab(tabId);
        const $childNode: JQuery = DagView.getNode(childNodeId, null, $dfArea);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
                      .addClass("hasConnection");

        const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .edgeSvg');

        // if re-adding an edge from a multichildnode then increment all
        // the edges that have a greater or equal index than the removed one
        // due to splice action on children array
        if ($dfArea.find('.edge[data-childnodeid="' + childNodeId +
                         '"][data-connectorindex="' + connectorIndex + '"]').length) {
            $dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index >= connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, index + 1, svg);
                    $curEdge.attr("data-connectorindex", index + 1);
                }
            });

        }
        _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, connectorIndex, svg);
    }

    const lineFunction: Function = d3.svg.line()
        .x(function (d) { return d.x; })
        .y(function (d) { return d.y; })
        .interpolate("cardinal");

    function _drawLineBetweenNodes(
        tabId: string,
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        svg: d3
    ): void {
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        const parentNode: DagNode = graph.getNode(parentNodeId);
        const childNode: DagNode = graph.getNode(childNodeId);
        let numParents = childNode.getMaxParents();
        let numConnections = connectorIndex;
        let isMulti = false;
        if (numParents === -1) {
            numParents = 1;
            numConnections = 0;
            isMulti = true;
        }

        const parentCoors: Coordinate = {
            x: parentNode.getPosition().x + nodeWidth,
            y: parentNode.getPosition().y + (nodeHeight / 2)
        };

        const childCoors: Coordinate = {
            x: childNode.getPosition().x,
            y: childNode.getPosition().y +
                (nodeHeight / (numParents + 1) * (1 + numConnections))
        };

        const edge = svg.append("g")
            .attr("class", "edge")
            .attr("data-childnodeid", childNodeId)
            .attr("data-parentnodeid", parentNodeId)
            .attr("data-connectorindex", connectorIndex.toString());

        edge.append("path")
            .attr("class", "visibleLine")
            .attr("d", lineFunction([parentCoors, childCoors]));

        edge.append("path")
        .attr("class", "invisibleLine")
        .attr("d", lineFunction([parentCoors, childCoors]));
        if (isMulti || childNode.getType() === DagNodeType.Custom) {
            // stagger the numbers
            const midX = ((3 * parentCoors.x + ((connectorIndex + 1) *
                childCoors.x)) / (4 + connectorIndex));
            const midY = (2 * parentCoors.y + ((connectorIndex * .5 + 1) *
                childCoors.y)) / (3 + (connectorIndex * .5));
            edge.append("text")
                .attr("class", "connectorIndex")
                .attr("fill", "#627483")
                .attr("font-size", "12px")
                .attr("letter-spacing", "-2")
                .attr("x", midX + "px")
                .attr("y", (midY - 2) + "px")
                .text("#" + (connectorIndex + 1))
        }
    }

    /**
     * @description
     * listens events for 1 dag graph. This function is called for each dag graph
     */
    function _setupGraphEvents(): void {
        const graph: DagGraph = activeDag;

        // when a graph gets locked during execution
        graph.events.on(DagGraphEvents.LockChange, (info) => {
            const $dfArea = _getAreaByTab(info.tabId);
            if (info.lock) {
                $dfArea.addClass("locked");
                info.nodeIds.forEach((nodeId) => {
                    DagView.lockNode(nodeId, info.tabId);
                });
            } else {
                $dfArea.removeClass("locked");
                info.nodeIds.forEach((nodeId) => {
                    DagView.unlockNode(nodeId, info.tabId);
                });
            }
        });

        graph.events.on(DagNodeEvents.StateChange, function (info) {
            const $node: JQuery = DagView.getNode(info.id, info.tabId);
            for (let i in DagNodeState) {
                $node.removeClass("state-" + DagNodeState[i]);
            }
            $node.addClass("state-" + info.state);
            if (info.oldState === DagNodeState.Error ||
                info.state === DagNodeState.Error
            ) {
                // when switch from error state to other state
                _setTooltip($node, info.node);
            }
            const dagTab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            dagTab.save();
        });

        graph.events.on(DagNodeEvents.ConnectionChange, function (info) {
            if (info.descendents.length) {
                // XXX TODO only update if nodes involved in form are affected
                FormHelper.updateColumns(info);
            }
        });

        graph.events.on(DagNodeEvents.ParamChange, function (info) {
            const $node: JQuery = DagView.getNode(info.id, info.tabId);
            _drawTitleText($node, info.node);
            // const title = _formatTooltip(info.params);
            // xcTooltip.add($node.find(".main"), {
            //     title: title,
            //     classes: "preWrap leftAlign wide"
            // });
            $node.find(".paramIcon").remove();
            if (info.hasParameters) {
                d3.select($node.get(0)).append("text")
                    .attr("class", "paramIcon")
                    .attr("fill", "#44515C")
                    .attr("font-size", 10)
                    .attr("transform", "translate(" + (nodeWidth - 28) + "," +
                            (nodeHeight) + ")")
                    .attr("text-anchor", "middle")
                    .attr("font-family", "Open Sans")
                    .text("<>");

            }
            const dagTab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            dagTab.save();
            if (!info.noAutoExecute && UserSettings.getPref("dfAutoExecute") === true) {
                const dagNode: DagNode = info.node;
                if (dagNode.getState() == DagNodeState.Configured) {
                    DagView.run([info.id]);
                }
            }
        });

        graph.events.on(DagNodeEvents.LineageSourceChange, function(info) {
            const tabId: string = activeDagTab.getId();
            if (info.tabId === tabId) {
                activeDagTab.save();
                if (DagTable.Instance.isTableFromTab(tabId)) {
                    const node: DagNode = info.node;
                    const set = activeDag.traverseGetChildren(node);
                    set.add(node);

                    const bindNodeId: DagNodeId = DagTable.Instance.getBindNodeId();
                    let nodeInPreview: DagNode = null;
                    set.forEach((dagNode) => {
                        dagNode.getLineage().reset(); // reset all columns' lineage
                        if (dagNode.getId() === bindNodeId) {
                            nodeInPreview = dagNode;
                        }
                    });
                    // XXX TODO use better way to refresh the viewer
                    if (nodeInPreview != null) {
                        DagTable.Instance.close();
                        DagView.previewTable(nodeInPreview);
                    }
                }
            }
        });

        graph.events.on(DagNodeEvents.AggregateChange, function (info) {
            editAggregates(info.id, info.tabId, info.aggregates);
        });

        graph.events.on(DagNodeEvents.TableLockChange, function(info) {
            editTableLock(DagView.getNode(info.id, info.tabId), info.lock);
        })

        graph.events.on(DagNodeEvents.TableRemove, function(info) {
            const tableName: string = info.table;
            const nodeId: DagNodeId = info.nodeId;
            if (DagTable.Instance.getBindNodeId() === nodeId) {
                DagTable.Instance.close();
            }
            const node: DagNode = info.node;
            const nodeType: DagNodeType = node.getType();
            // When not link in or link out node
            if (nodeType !== DagNodeType.DFIn && nodeType !== DagNodeType.DFOut) {
                let generalTableName = tableName;
                if (tableName.includes("#")) {
                    generalTableName = tableName.split("#")[0] + "*";
                }
                DagTblManager.Instance.deleteTable(generalTableName, true, true);
                // Delete the node's table now
                var sql = {
                    "operation": SQLOps.DeleteTable,
                    "tables": [tableName],
                    "tableType": TableType.Unknown
                };
                var txId = Transaction.start({
                    "operation": SQLOps.DeleteTable,
                    "sql": sql,
                    "steps": 1,
                    "track": true
                });
                let deleteQuery: {}[] = [{
                    operation: "XcalarApiDeleteObjects",
                    args: {
                        namePattern: tableName,
                        srcType: "Table"
                    }
                }]
                XIApi.deleteTables(txId, deleteQuery, null)
                .then(() => {
                    Transaction.done(txId, null);
                })
                .fail((error) => {
                    Transaction.fail(txId, {
                        "failMsg": "Deleting Tables Failed",
                        "error": error,
                        "noAlert": true,
                        "title": "DagView"
                    });
                });
            }
        });
    }

    // groups individual nodes into trees and joins branches with main tree
    function _splitIntoTrees(node, seen, treeGroups, groupId) {
        const treeGroup = {};
        formTreesHelper(node);
        function formTreesHelper(node) {
            const id = node.getId();
            if (treeGroup[id]) { // already done
                return;
            }

            if (seen[id] != null) { // we've encountered this node and it's
                // part of another group so lets join its children to that group
                const mainGroupId = seen[id];
                if (groupId === mainGroupId) {
                    // already part of the same tree
                    return;
                }
                for (let i in treeGroup) {
                    seen[i] = mainGroupId; // reassigning nodes from current
                    // group to the main group that has the id of "mainGroupId"
                    let mainGroup = treeGroups[mainGroupId];
                    mainGroup.push(treeGroup[i]);
                }
                delete treeGroups[groupId];
                groupId = mainGroupId;
                return;
            }
            treeGroup[id] = node;
            seen[id] = groupId;
            if (!treeGroups[groupId]) {
                treeGroups[groupId] = [];
            }
            treeGroups[groupId].push(node);

            const parents = node.getParents();
            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null) {
                    formTreesHelper(parents[i]);
                }
            }
        }
    }

    // sets endpoint to have depth:0, width:0. If endpoint is a join,
    // then left parent will have depth:1, width:0 and right parent will have
    // depth: 1, width: 1 and so on.
    function _alignNodes(node, seen, width) {
        let greatestWidth = width;
        _alignHelper(node, 0, width);

        function _alignHelper(node, depth, width) {
            const nodeId = node.getId();
            if (seen[nodeId] != null) {
                return;
            }
            seen[nodeId] = {
                depth: depth,
                width: width
            };

            greatestWidth = Math.max(width, greatestWidth);
            const parents = node.getParents();

            let numParentsDrawn = 0;
            for (let i = 0; i < parents.length; i++) {
                if (seen[parents[i].getId()] != null) {
                    numParentsDrawn++;
                }
            }

            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null &&
                    seen[parents[i].getId()] == null) {
                    let newWidth;
                    if (numParentsDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(parents[i], depth + 1, newWidth);
                    numParentsDrawn++;
                }
            }
            const children = node.getChildren();

            let numChildrenDrawn = 0;
            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].getId()] != null) {
                    numChildrenDrawn++;
                }
            }

            for (let i = 0; i < children.length; i++) {
                if (seen[children[i].getId()] == null) {
                    let newWidth;
                    if (numChildrenDrawn === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    _alignHelper(children[i], depth - 1, newWidth);
                    numChildrenDrawn++;
                }
            }
        }
    }

    // adjust positions of nodes so that children will never be
    // to the left of their parents
    function _adjustPositions(node, nodes, seen) {
        seen[node.getId()] = true;
        const children = node.getChildren();
        for (let i = 0; i < children.length; i++) {
            let diff = nodes[node.getId()].depth - nodes[children[i].getId()].depth;
            let adjustmentNeeded = false;
            if (diff <= 0) {
                let adjustment = diff - 1;
                nodes[children[i].getId()].depth += adjustment;
                adjustmentNeeded = true;
            }
            if (adjustmentNeeded || seen[children[i].getId()] == null) {
                _adjustPositions(children[i], nodes, seen);
            }
        }
    }

    function createNodeInfos(
        nodeIds: DagNodeId[],
        dagGraph: DagGraph,
        options: {
            isSkipOutParent?: boolean,
            clearState?: boolean
        } = {}
    ): any[] {
        // check why we need it
        const isSkipOutParent: boolean = options.isSkipOutParent || true;
        const clearState: boolean = options.clearState || false;
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                const node: DagNode = dagGraph.getNode(nodeId);
                let parentIds: DagNodeId[] = [];
                let numParents: number = node.getMaxParents();
                let isMulti = false;
                if (numParents === -1) {
                    isMulti = true;
                }
                let parents = node.getParents();
                // for each loop skips over empty parents
                for (let i = 0; i < parents.length; i++) {
                    const parent = parents[i];
                    if (parent) {
                        const parentId: DagNodeId = parent.getId();

                        if (nodeIds.indexOf(parentId) === -1 && isSkipOutParent) {
                            // XXX TODO check if this affects order of union input
                            if (numParents > 1 && !isMulti) {
                                parentIds.push(null);
                            }
                        } else {
                            parentIds.push(parentId);
                        }
                    } else {
                        if (numParents > 1 && !isMulti) {
                            parentIds.push(null);
                        }
                    }
                }

                const nodeInfo = node.getNodeCopyInfo(clearState);
                nodeInfo['parentIds'] = parentIds;
                nodeInfos.push(nodeInfo);
            } else if (nodeId.startsWith("comment")) {
                const comment: CommentNode = dagGraph.getComment(nodeId);
                nodeInfos.push({
                    nodeId: nodeId,
                    display: xcHelper.deepCopy(comment.getPosition()),
                    dimensions: comment.getDimensions(),
                    text: comment.getText()
                });
            }
        });

        return nodeInfos;
    }

    function cutOrCopyNodesHelper(nodeIds: DagNodeId[]): void {
        xcHelper.copyToClipboard(" "); // need to have content to overwrite current clipboard

        clipboard = {
            type: "dagNodes",
            nodeInfos: createNodeInfos(nodeIds, activeDag, {clearState: true})
        };
    }

    function addDescriptionIcon($node: JQuery, text: string): void {
        $node.addClass("hasDescription");
        const g = d3.select($node.get(0)).append("g")
            .attr("class", "descriptionIcon")
            .attr("transform", "translate(84, 1)");
        g.append("circle")
            .attr("cx", 5)
            .attr("cy", 0)
            .attr("r", 5)
            .style("fill", "#378CB3");
        g.append("text")
            .attr("font-family", "icomoon")
            .attr("font-size", 6)
            .attr("fill", "white")
            .attr("x", 2)
            .attr("y", 2.5)
            .text(function (_d) { return "\ue966" });

        xcTooltip.add($node.find(".descriptionIcon"), {
            title: xcHelper.escapeDblQuoteForHTML(text)
        });
    }

    function addAggregates($node: JQuery, aggregates: string[]): void {
        $node.addClass("hasAggregates");
        const g = d3.select($node.get(0)).append("g")
            .attr("class", "aggregateIcon")
            .attr("transform", "translate(20, 30)");
        g.append("circle")
            .attr("cx", 5)
            .attr("cy", 0)
            .attr("r", 10)
            .style("fill", "#627483");
        g.append("text")
            .attr("font-family", "icomoon")
            .attr("font-size", 9)
            .attr("fill", "white")
            .attr("x", 0)
            .attr("y", 3)
            .text(function (_d) { return "\ue939" });

        xcTooltip.add($node.find(".aggregateIcon"), {
            title: xcHelper.escapeDblQuoteForHTML(aggregates.toString())
        });
    }

    /**
     *
     * @param nodeId
     * @param aggregates
     */
    export function editAggregates(
        nodeId: DagNodeId,
        tabId: string,
        aggregates: string[]
    ): void {
        const $node = DagView.getNode(nodeId, tabId);
        $node.find(".aggregateIcon").remove();

        if (aggregates.length) {
            addAggregates($node, aggregates);
        } else {
            $node.removeClass("hasAggregate");
        }
    }

    export function addProgress(nodeId: DagNodeId, tabId: string): void {
        const $dataflowArea: JQuery = _getAreaByTab(tabId);
        const g = d3.select($dataflowArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        g.selectAll(".opProgress")
            .remove(); // remove old progress
        g.append("text")
            .attr("class", "opProgress")
            .attr("font-family", "Open Sans")
            .attr("font-size", "11")
            .attr("fill", "#44515c")
            .attr("x", "105")
            .attr("y", "31")
            .text("0%");
    }

    export function calculateAndUpdateProgress(
        queryStateOutput,
        nodeId: DagNodeId,
        tabId: string
    ): void {
        const progress: number = xcHelper.getQueryProgress(queryStateOutput);
        const pct: number = Math.round(100 * progress);
        if (!isNaN(pct)) {
            DagView.updateProgress(nodeId, tabId, pct);
        } else {
            return;
        }

        let tab: DagTab = <DagTab>DagTabManager.Instance.getTabById(tabId);
        let graph: DagGraph = tab.getGraph();
        const node: DagNode = graph.getNode(nodeId);
        if (node.getType() === DagNodeType.SQL) {
            let subGraph = (<DagNodeSQL>node).getSubGraph();
            const subTabId: string = subGraph.getTabId();
            subGraph.updateProgress(queryStateOutput.queryGraph.node);

            subGraph.getAllNodes().forEach((node, nodeId) => {
                const nodeStats = node.getOverallStats();
                const timeStr: string = xcHelper.getElapsedTimeStr(nodeStats.time);
                const skewInfo = _getSkewInfo("temp name", nodeStats.rows, nodeStats.skewValue, nodeStats.totalRows, nodeStats.size);
                DagView.updateProgress(nodeId, subTabId, nodeStats.pct, true, skewInfo, timeStr);
            });
        }
    }

    export function updateProgress(
        nodeId: DagNodeId,
        tabId: string,
        progress: number,
        _isOptimized?: boolean,
        _skew?,
        _timeStr?: string
    ): void {
        const $dataflowArea: JQuery = _getAreaByTab(tabId);
        const g = d3.select($dataflowArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        let opProgress = g.select(".opProgress");
        if (opProgress.empty()) {
            DagView.addProgress(nodeId, tabId);
            opProgress = g.select(".opProgress");
        }
        opProgress.text(progress + "%");
    }

    export function updateOptimizedDFProgress(queryName, queryStateOutput) {
        let tab: DagTabOptimized = <DagTabOptimized>DagTabManager.Instance.getTabById(queryName);
        if (!tab) {
            return;
        }
        let graph: DagSubGraph = tab.getGraph();
        graph.updateProgress(queryStateOutput.queryGraph.node);

        graph.getAllNodes().forEach((node, nodeId) => {
            const nodeStats = node.getOverallStats();
            const timeStr: string = xcHelper.getElapsedTimeStr(nodeStats.time);
            const skewInfo = _getSkewInfo("temp name", nodeStats.rows, nodeStats.skewValue, nodeStats.totalRows, nodeStats.size);
            DagView.updateProgress(nodeId, tab.getId(), nodeStats.pct, true, skewInfo, timeStr);
        });
    }

    function _getSkewInfo(name, rows, skew, totalRows, inputSize) {
        const skewText = getSkewText(skew);
        const skewColor = getSkewColor(skewText);
        return {
            name: name,
            value: skew,
            text: skewText,
            color: skewColor,
            rows: rows,
            totalRows: totalRows,
            size: inputSize
        };
    }

    function getSkewText(skew) {
        return ((skew == null || isNaN(skew))) ? "N/A" : String(skew);
    }

    function getSkewColor(skew) {
        if (skew === "N/A") {
            return "";
        }
        skew = Number(skew);
        /*
            0: hsl(104, 100%, 33)
            25%: hsl(50, 100%, 33)
            >= 50%: hsl(0, 100%, 33%)
        */
        let h = 104;
        if (skew <= 25) {
            h = 104 - 54 / 25 * skew;
        } else if (skew <= 50) {
            h = 50 - 2 * (skew - 25);
        } else {
            h = 0;
        }
        return 'hsl(' + h + ', 100%, 33%)';
    }

    export function removeProgress(nodeId: DagNodeId, tabId: string, queryStateOutput?): void {
        const $dataflowArea: JQuery = _getAreaByTab(tabId);
        const g = d3.select($dataflowArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        g.selectAll(".opProgress")
            .remove();

        let tab: DagTab = <DagTab>DagTabManager.Instance.getTabById(tabId);
        if (!tab) {
            return;
        }
        let graph: DagGraph = tab.getGraph();
        const node: DagNode = graph.getNode(nodeId);
        if (queryStateOutput && node.getType() === DagNodeType.SQL) {
            let subGraph = (<DagNodeSQL>node).getSubGraph();
            const subTabId: string = subGraph.getTabId();
            subGraph.updateProgress(queryStateOutput.queryGraph.node);

            subGraph.getAllNodes().forEach((node, nodeId) => {
                const nodeStats = node.getOverallStats();
                const timeStr: string = xcHelper.getElapsedTimeStr(nodeStats.time);
                const skewInfo = _getSkewInfo("temp name", nodeStats.rows, nodeStats.skewValue, nodeStats.totalRows, nodeStats.size);
                DagView.updateProgress(nodeId, subTabId, nodeStats.pct, true, skewInfo, timeStr);
                DagView.removeProgress(nodeId, subTabId, queryStateOutput);
            });
            subGraph.endProgress(queryStateOutput.queryState, queryStateOutput.elapsed.milliseconds);
        }
    }

    export function endOptimizedDFProgress(queryName: string, queryStateOutput) {
        let tab: DagTabOptimized = <DagTabOptimized>DagTabManager.Instance.getTabById(queryName);
        let graph: DagSubGraph;
        if (!tab) {
            return;
        }
        DagView.updateOptimizedDFProgress(queryName, queryStateOutput);
        graph = tab.getGraph();
        graph.endProgress(queryStateOutput.queryState, queryStateOutput.elapsed.milliseconds);
        // TODO display finished state
    }

    /**
     * DagView.unlockNode
     * @param nodeId
     */
    export function unlockNode(nodeId: DagNodeId, tabId: string): void {
        DagView.getNode(nodeId, tabId).removeClass("locked");
        delete lockedNodeIds[tabId][nodeId];
        let hasLockedSiblings = false;
        if (Object.keys(lockedNodeIds[tabId]).length) {
            hasLockedSiblings = true;
        }
        if (!hasLockedSiblings) {
            const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
            const dagGraph: DagGraph = dagTab.getGraph();
            dagGraph.unsetGraphNoDelete();
        }
    }

    /**
     * DagView.lockNode
     * @param nodeId
     */
    export function lockNode(nodeId: DagNodeId, tabId?: string): string {
        if (!tabId) {
            tabId = activeDagTab.getId();
        }
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        DagView.getNode(nodeId, tabId).addClass("locked");
        lockedNodeIds[tabId] = lockedNodeIds[tabId] || {};
        lockedNodeIds[tabId][nodeId] = true;
        graph.setGraphNoDelete();
        return tabId;
    }

    /**
     * DagView.isNodeLocked
     * @param nodeId
     * @param tabId
     */
    export function isNodeLocked(nodeId: DagNodeId, tabId?: string): boolean {
        tabId = tabId || activeDagTab.getId();
        return lockedNodeIds[tabId] && lockedNodeIds[tabId][nodeId];
    }

    /**
     * Adds or removes a lock icon to the node
     * @param $node: JQuery node
     * @param lock: true if we add a lock, false otherwise
     */
    export function editTableLock(
        $node: JQuery, lock: boolean
    ): void {
        if (lock) {
            const g = d3.select($node.get(0)).append("g")
                        .attr("class", "lockIcon")
                        .attr("transform", "translate(05, 05)");
            g.append("text")
                .attr("font-family", "icomoon")
                .attr("font-size", 13)
                .attr("fill", "black")
                .attr("x", 0)
                .attr("y", 3)
                .text(function(_d) {return "\ue940"});
        } else {
            $node.find(".lockIcon").remove();
        }
        return;
    }

    function getNextAvailablePosition(graph: DagGraph, x: number, y: number): Coordinate {
        let positions = {};
        let positionConflict = true;

        graph.getAllNodes().forEach(node => {
            const pos: Coordinate = node.getPosition();
            if (!positions[pos.x]) {
                positions[pos.x] = {};
            }
            positions[pos.x][pos.y] = true;
        });

        while (positionConflict) {
            positionConflict = false;
            if (positions[x] && positions[x][y]) {
                positionConflict = true;
                y += gridSpacing;
                x += gridSpacing;
            }
        }
        return {
            x: x,
            y: y
        }
    }

    function _addNodeNoPersist(node, options?: { isNoLog?: boolean }): LogParam {
        const { isNoLog = false } = options || {};

        $dfWrap.find(".selected").removeClass("selected");
        const $dfArea = _getActiveArea();

        const nodeId = node.getId();
        const $node = _drawNode(node, $dfArea);
        $node.addClass("selected");
        _setGraphDimensions(xcHelper.deepCopy(node.getPosition()))

        const logParam: LogParam = {
            title: SQLTStr.AddOperation,
            options: {
                "operation": SQLOps.AddOperation,
                "dataflowId": activeDagTab.getId(),
                "nodeId": nodeId
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    function _nodeTitleEditMode($origTitle) {
        const nodeId: DagNodeId = $origTitle.closest(".operator").data("nodeid");
        const node = DagView.getActiveDag().getNode(nodeId);
        const tabId = DagView.getActiveDag().getTabId();
        const rect = $origTitle[0].getBoundingClientRect();
        const offset = _getDFAreaOffset();
        const left = rect.left + offset.left;
        const top = rect.top + offset.top;
        const center = left + (rect.width / 2);
        const minWidth = 90;
        const origVal = node.getTitle();
        let html: HTML = '<textarea class="editableNodeTitle" spellcheck="false" style="top:' +
            top + 'px;left:' + center + 'px;">' +
            origVal +
            '</textarea>';
        let $textArea = $(html);
        $origTitle.closest(".dataflowAreaWrapper").append($textArea);
        sizeInput();
        $textArea.focus().caret(origVal.length);
        $origTitle.hide();

        $textArea.blur(() => {
            const newVal: string = $textArea.val().trim();
            if (newVal !== origVal) {
                DagView.editTitle(nodeId, tabId, newVal);
            }
            $textArea.remove();
            $origTitle.show();
        });

        $textArea.on("input", sizeInput);
        function sizeInput() {
            $textArea.height(titleLineHeight);
            $textArea.width(minWidth);
            if ($textArea[0].scrollWidth > $textArea.width()) {
                $textArea.width($textArea[0].scrollWidth + 1);
            }
            if ($textArea[0].scrollHeight > $textArea.height()) {
                $textArea.height($textArea[0].scrollHeight);
            }
        }
    }

    function _getActiveArea(): JQuery {
        return $dfWrap.find(".dataflowArea.active");
    }

    export function getActiveArea(): JQuery {
        return _getActiveArea();
    }

    function _getAreaByTab(tabId: string): JQuery {
        const index: number = DagTabManager.Instance.getTabIndex(tabId);
        if (index < 0) {
            return $();
        }
        return $dfWrap.find(".dataflowArea").eq(index);
    }

    export function getAreaByTab(tabId: string): JQuery {
        return _getAreaByTab(tabId);
    }
}