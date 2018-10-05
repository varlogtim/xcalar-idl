namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;
    let activeDagTab: DagTab;
    const horzPadding = 200;
    const vertPadding = 100;
    const nodeHeight = 28;
    const nodeWidth = 102;
    const horzNodeSpacing = 140;// spacing between nodes when auto-aligning
    const vertNodeSpacing = 60;
    const gridLineSize = 12;
    let clipboard = null;
    export const gridSpacing = 20;
    export const zoomLevels = [.25, .5, .75, 1, 1.5, 2];


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
    }

    /**
     * Called when dag panel becomes visible, listeners that are removed when
     * panel closes.
     */
    export function show(): void {
        $("#container").addClass("activePanel-modelingDagPanel");
        DagCategoryBar.Instance.showOrHideArrows();

        $(window).on("resize.dagViewResize", function() {
            DagCategoryBar.Instance.showOrHideArrows();
        });

        $(document).on("copy.dataflowPanel", function(e) {
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

        $(document).on("cut.dataflowPanel", function(e) {
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

         $(document).on("paste.dataflowPanel", function(e: JQueryEventObject){
            if (clipboard === null || $(e.target).is("input") ||
                $(e.target).is("textarea")) {
                return; // use default paste event
            }
            if (clipboard.type === "dagNodes") {
                DagView.pasteNodes();
            }
        });

        $(document).on("keydown.dataflowPanel", function(e: JQueryEventObject) {
            if (activeDag.isLocked() || $("#container").hasClass("formOpen") ||
                $("input:focus").length || $("textarea:focus").length) {
                return;
            }
            switch (e.which) {
                case (keyCode.Backspace):
                case (keyCode.Delete):
                    DagView.removeNodes(DagView.getSelectedNodeIds(true, true));
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
                !(!isSystemMac && event.ctrlKey))
            {
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
     * Switches the current active tab, updating activeDag and activeDagTab
     * @param dagTab The tab we want to make active.
     */
    export function switchActiveDagTab(dagTab: DagTab) {
        activeDagTab = dagTab;
        activeDag = dagTab.getGraph();
    }

    export function selectNodes(nodeIds?: DagNodeId[]) {
        if (!nodeIds) {
            $dfWrap.find(".dataflowArea.active").find(".operator")
                                            .addClass("selected");
        } else {
            nodeIds.forEach((nodeId) => {
                const $node: JQuery = DagView.getNode(nodeId);
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
        const $dfArea = $dfWrap.find(".dataflowArea.active");
        const dimensions = activeDag.getDimensions();
        const scale = activeDag.getScale();
        if (dimensions.width > -1) {
            $dfArea.find(".dataflowAreaWrapper").css("min-height", dimensions.height * scale);
            $dfArea.find(".dataflowAreaWrapper").css("min-width", dimensions.width * scale);
            $dfArea.find(".dataflowAreaWrapper").css("background-size", gridLineSize * scale);
        }
        $dfArea.find(".dataflowAreaWrapper").children().css("transform", "scale(" + scale + ")");

        const nodes: Map<DagNodeId, DagNode> = activeDag.getAllNodes();

        nodes.forEach((node: DagNode) => {
            _drawNode(node, $dfArea);
        });
        nodes.forEach((node: DagNode, nodeId: DagNodeId) => {
            node.getParents().forEach((parentNode, index) => {
                const parentId: DagNodeId = parentNode.getId();
                _drawConnection(parentId, nodeId, index);
            });
        });

        const comments: Map<CommentNodeId, CommentNode> = activeDag.getAllComments();

        comments.forEach((commentNode: CommentNode) => {
            DagComment.Instance.drawComment(commentNode, $dfArea);
        });

        _setupGraphEvents();
    }

    export function newGraph(): void {
        _setupGraphEvents();
    }

    /**
     * DagView.addBackNodes
     * @param _dagId
     * @param nodeIds
     * used for undoing/redoing operations
     */
    export function addBackNodes(nodeIds: DagNodeId[]): XDPromise<void>  {
        const $dfArea: JQuery = $dfWrap.find(".dataflowArea.active")
        // need to add back nodes in the reverse order they were deleted
        $dfArea.find(".selected").removeClass("selected");
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            if (nodeId.startsWith("dag")) {
                const node: DagNode = activeDag.addBackNode(nodeId);
                _drawNode(node, $dfArea, true);

                node.getParents().forEach((parentNode, index) => {
                    _drawConnection(parentNode.getId(), nodeId, index);
                });

                node.getChildren().forEach((childNode) => {
                    childNode.getParents().forEach((parent, index) => {
                        if (parent === node) {
                            _drawConnection(nodeId, childNode.getId(), index);
                        }
                    });
                });
                const coors = node.getPosition();
                maxXCoor = Math.max(coors.x, maxXCoor);
                maxYCoor = Math.max(coors.y, maxYCoor);
            } else if (nodeId.startsWith("comment")) {
                const comment = activeDag.addBackComment(nodeId);
                DagComment.Instance.drawComment(comment, $dfArea, true);
                const coors = comment.getPosition();
                const dimensions = comment.getDimensions();
                maxXCoor = Math.max(coors.x + dimensions.width, maxXCoor);
                maxYCoor = Math.max(coors.y + dimensions.height, maxYCoor);
            }
        }
        _setGraphDimensions({x: maxXCoor, y: maxYCoor});
        return activeDagTab.saveTab();
    }

    /**
     * DagView.addNode
     * @param dagId
     * @param nodeInfo
     */
    export function addNode(nodeInfo: DagNodeInfo): DagNode {
        const node = DagNodeFactory.create(nodeInfo);
        _addNodeNoPersist(node);
        activeDagTab.saveTab();
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
        const $dfArea = $dfWrap.find(".dataflowArea.active");
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
        return activeDagTab.saveTab();
    }

    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    export function removeNodes(nodeIds: DagNodeId[]): XDPromise<void> {
        if (!_removeNodesNoPersist(nodeIds)) {
            return PromiseHelper.reject();
        }
        return activeDagTab.saveTab();
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

    export function cutNodes(nodeIds: DagNodeId[]): void {
        if (!nodeIds.length) {
            return;
        }
        cutOrCopyNodesHelper(nodeIds);

        DagView.removeNodes(nodeIds);
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
            const $dfArea: JQuery = $dagView.find(".dataflowArea.active");
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

            const nextAvailablePosition = getNextAvailablePosition(minXCoor,
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
                        activeDag.connect(newParentId, newNodeId, j);
                        _drawConnection(newParentId, newNodeId, j);
                    });
                }
            });

            // XXX scroll to selection if off screen

            _setGraphDimensions({x: maxXCoor, y: maxYCoor});

            Log.add(SQLTStr.CopyOperations, {
                "operation": SQLOps.CopyOperations,
                "dataflowId": activeDagTab.getId(),
                "nodeIds": allNewNodeIds
            });
            return activeDagTab.saveTab();
        }
        return PromiseHelper.reject();
    }

    /**
     * DagView.hasClipboard
     */
    export function hasClipboard(): boolean {
        return clipboard !== null;
    }

    /**
     * DagView.connectNodes
     * @param parentNodeId
     * @param childNodeId
     * @param connectorIndex
     * @param isReconnect
     * connects 2 nodes and draws line
     */
    export function connectNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isReconnect?: boolean,
    ): XDPromise<void> {
        _connectNodesNoPersist(parentNodeId, childNodeId, connectorIndex, isReconnect);
        return activeDagTab.saveTab();
    }

      /**
     * DagView.disconnect
     * @param parentNodeId
     * @param childNodeId
     * removes connection from DagGraph, connection line, updates connector classes
     */
    export function disconnectNodes(
        parentNodeId,
        childNodeId,
        connectorIndex
    ): XDPromise<void> {
        const $edge: JQuery = $dagView.find('.edge[data-parentnodeid="' +
                                            parentNodeId +
                                            '"][data-childnodeid="' +
                                            childNodeId +
                                            '"][data-connectorindex="' +
                                            connectorIndex + '"]');
        activeDag.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, childNodeId);
        Log.add(SQLTStr.DisconnectOperations, {
            "operation": SQLOps.DisconnectOperations,
            "dataflowId": activeDagTab.getId(),
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex
        });
        return activeDagTab.saveTab();
    }

    /**
     * DagView.getNode
     * @param nodeId
     * returns $(".operator") element
     */
    export function getNode(nodeId: DagNodeId): JQuery {
        return $dagView.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    /**
     * DagView.moveNodes
     * @param dagId
     * @param nodeIds
     */
    export function moveNodes(
        nodeInfos,
        graphDimensions?: Coordinate
    ): XDPromise<void> {
        let svg = d3.select("#dagView .dataflowArea.active .edgeSvg");
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const $operatorArea = $dfWrap.find(".dataflowArea.active .operatorSvg");
        const $commentArea: JQuery = $("#dagView .dataflowArea.active .commentArea");

        nodeInfos.forEach((nodeInfo, i) => {
            if (nodeInfo.type === "dagNode") {
                const nodeId = nodeInfo.id;
                const $el = DagView.getNode(nodeId);

                nodeInfos[i].oldPosition = xcHelper.deepCopy(activeDag.getNode(nodeId)
                                                            .getPosition())
                activeDag.moveNode(nodeId, {
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
                $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                    const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                    let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    _drawLineBetweenNodes(nodeId, childNodeId, connectorIndex, svg);
                });

                // redraw all paths that lead into this node
                $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').each(function() {
                    const parentNodeId = $(this).attr("data-parentnodeid");
                    let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                    $(this).remove();

                    _drawLineBetweenNodes(parentNodeId, nodeId, connectorIndex, svg);
                });
            } else {
                // comment node
                const id = nodeInfo.id;
                const comment = activeDag.getComment(id);
                nodeInfos[i].oldPosition = xcHelper.deepCopy(comment.getPosition());
                comment.setPosition(nodeInfo.position);
                const $el = $("#dagView").find('.comment[data-nodeid="' + id + '"]');
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
            _setGraphDimensions({x: maxXCoor, y: maxYCoor});
        }

        Log.add(SQLTStr.MoveOperations, {
            "operation": SQLOps.MoveOperations,
            "dataflowId": activeDagTab.getId(),
            "nodeInfos": nodeInfos
        });
        return activeDagTab.saveTab();
    }

    export function autoAlign() {
        const nodes: DagNode[] = activeDag.getSortedNodes();
        let treeGroups = {};
        let seen = {};
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (nodes[i].getChildren().length === 0) {
                // group nodes into trees
                splitIntoTrees(nodes[i], seen, treeGroups, i);
            }
        }

        let startingWidth: number = 0;
        const allNodeInfos = [];
        let overallMaxDepth = 0;

        for (let i in treeGroups) {
            const group = treeGroups[i];
            const nodes = {};
            alignNodes(group[0], nodes, startingWidth);
            for (let j = 0; j < group.length; j++) {
                if (group[j].getParents().length === 0) {
                    // adjust positions of nodes so that children will never be
                    // to the left of their parents
                    adjustPositions(group[j], nodes, {});
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
        const comments = activeDag.getAllComments();
        comments.forEach((comment) => {
            const pos = comment.getPosition();
            const dimensions = comment.getDimensions();
            maxX = Math.max(maxX, pos.x + dimensions.width);
            maxY = Math.max(maxY, pos.y + dimensions.height);
        });
        DagView.moveNodes(allNodeInfos, {
            x: maxX + horzPadding,
            y: maxY + vertPadding
        });
    }

    /**
     * DagView.autoAddNode
     * @param parentNodeId
     * @param newType
     * @description
     * adds node to dataflow graph by automatically determining position
     * 1. get parent node to determine position of new node
     * 2. use DagView.addNode to create the new node
     * 3. connect new node to parent node
     */
    export function autoAddNode(
        newType: DagNodeType,
        subType?: DagNodeSubType,
        parentNodeId?: DagNodeId,
    ): DagNode {
        let node: DagNode;
        let parentNode: DagNode;
        let x: number;
        let y: number;
        let nextAvailablePosition: Coordinate;

        if (parentNodeId) {
            parentNode = DagView.getActiveDag().getNode(parentNodeId);
            const position: Coordinate = parentNode.getPosition();
            x = position.x + horzNodeSpacing;
            y = position.y + vertNodeSpacing * parentNode.getChildren().length;
        } else {
            const scale = activeDag.getScale();
            const $dfArea: JQuery = $dfWrap.find(".dataflowArea.active");
            x = Math.round(($dfArea.scrollLeft() + ($dfArea.width() / 2)) /
                            scale / gridSpacing) * gridSpacing;
            y = Math.round(($dfArea.scrollTop() + ($dfArea.height() / 2)) /
                            scale / gridSpacing) * gridSpacing;
        }
        nextAvailablePosition = getNextAvailablePosition(x, y);

        node = DagView.addNode({
            type: newType,
            subType: subType,
            display: {
                x: nextAvailablePosition.x,
                y: nextAvailablePosition.y
            }
        });

        if (parentNode && parentNode.getMaxChildren() !== 0) {
            DagView.connectNodes(parentNodeId, node.getId(), 0);
        }

        return node;
    }

    export function getAllNodes(includeComments?: boolean): JQuery {
        let $nodes = $dfWrap.find(".dataflowArea.active .operator");
        if (includeComments) {
            $nodes = $nodes.add($dfWrap.find(".dataflowArea.active .comment"));
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
        return $dfWrap.find(".dataflowArea.active").find(selector);
    }

    export function getSelectedNodeIds(
        includeSelecting?: boolean,
        includeComments?: boolean
    ): DagNodeId[] {
        const $nodes: JQuery = DagView.getSelectedNodes(includeSelecting,
                                                        includeComments);
        const nodeIds = [];
        $nodes.each(function() {
            nodeIds.push($(this).data("nodeid"));
        });
        return nodeIds;
    }

    export function previewTable(dagNodeId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            const dagNode: DagNode = activeDag.getNode(dagNodeId);
            const tableName: string = dagNode.getTable();
            // XXX this code should be change after refine the table meta structure
            const tableId: TableId = xcHelper.getTableId(tableName);
            let table: TableMeta = gTables[tableId];
            if (!table) {
                table = new TableMeta({
                    tableName: tableName,
                    tableId: tableId,
                    tableCols: [ColManager.newDATACol()]
                });
                gTables[tableId] = table;
            }
            const columns: ProgCol[] = dagNode.getLineage().getColumns();
            if (columns != null && columns.length > 0) {
                table.tableCols = columns.concat(ColManager.newDATACol());
            }
            const viewer: XcTableViewer = new XcTableViewer(table);
            const $node: JQuery = DagView.getNode(dagNodeId);
            DagTable.Instance.show(viewer, $node)
            .then(deferred.resolve)
            .fail((error) => {
                Alert.error(AlertTStr.Error, error);
                deferred.reject(error);
            })
        } catch (e) {
            console.error(e);
            Alert.error(AlertTStr.Error, ErrTStr.Unknown);
            deferred.reject(e);
        }

        return deferred.promise();
    }

    export function previewAgg(dagNodeId: string): void {
        try {
            const dagNode: DagNodeAggregate = <DagNodeAggregate>activeDag.getNode(dagNodeId);
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
     * // run the entire dag
     */
    export function run(nodeIds?: DagNodeId[]): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const currTabId: string = activeDagTab.getId();

        activeDag.execute(nodeIds)
        .then(function() {
            deferred.resolve();
        })
        .fail(function(error) {
            if (error.hasError) {
                const nodeId: DagNodeId = error.node.getId();
                const $node: JQuery = DagView.getNode(nodeId)
                DagTabManager.Instance.switchTabId(currTabId);
                StatusBox.show(error.type, $node);
            }
            deferred.reject(error);
        });

        return deferred.promise();
    }
    /**
     *
     * @param nodeIds
     */
    export function reset(nodeIds?: DagNodeId[]): void {
        Alert.show({
            title: DagTStr.Reset,
            msg: DagTStr.ResetMsg,
            onConfirm: () => {
                activeDag.reset(nodeIds);
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
        const node = activeDag.getNode(nodeId);
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
            "dataflowId": activeDagTab.getId(),
            "oldDescription": oldText,
            "newDescription": text,
            "nodeId": nodeId
        });
        return activeDagTab.saveTab();
    }

    /**
     * DagView.cancel
     * // cancel entire run or execution
     */
    export function cancel() {

    }

    export function highlightLineage(nodeId: DagNodeId, childNodeId?: DagNodeId, type?: string): void {
        const $node = DagView.getNode(nodeId);
        $node.addClass("lineageSelected");
        if (childNodeId) {
            const $edge: JQuery = $dagView.find('.edge[data-parentnodeid="' +
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
            $dfWrap.find(".dataflowArea.active").append(tip);
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

        // Create customNode from selected nodes
        const nodeInfos = createNodeInfos(nodeIds);
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
        _addNodeNoPersist(customNode);

        // Delete selected nodes
        _removeNodesNoPersist(nodeIds);

        // Connections to customNode
        for (const {parentId, childId, pos} of newConnectionIn) {
            _connectNodesNoPersist(parentId, childId, pos);
        }
        for (const {parentId, childId, pos} of newConnectionOut) {
            _connectNodesNoPersist(parentId, childId, pos);
        }

        return activeDagTab.saveTab();
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

        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        DagCategoryBar.Instance.addOperator({
            categoryName: DagCategoryType.Custom,
            dagNode: DagNodeFactory.create(dagNode.getNodeCopyInfo()),
            isFocusCategory: true
        })
        .then((newName) => {
            if (dagNode instanceof DagNodeCustom) {
                dagNode.setCustomName(newName);
                const $opTitle = getNode(dagNode.getId()).find('.opTitle');
                $opTitle.text(dagNode.getCustomName());
            }
        })
        .then(() => activeDagTab.saveTab())
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
        let scaleIndex = zoomLevels.indexOf(prevScale);
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
        const $dfArea = $dfWrap.find(".dataflowArea.active");
        const $dfAreaWrap = $dfArea.find(".dataflowAreaWrapper");
        const prevScrollTop = $dfArea.scrollTop();
        const prevScrollLeft = $dfArea.scrollLeft();
        const prevMidHeight = $dfArea.height() / 2;
        const prevMidWidth = $dfArea.width() / 2;

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
        const dagNodes = dagNodeInfos.map( (nodeInfo) => {
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
        const newInnerConnection = connection.inner.map( (connection) => {
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

    function _addNodeNoPersist(node: DagNode) {
        $dfWrap.find(".selected").removeClass("selected");
        const $dfArea = $dfWrap.find(".dataflowArea.active");

        activeDag.addNode(node);
        const nodeId = node.getId();
        const $node = _drawNode(node, $dfArea);
        $node.addClass("selected");
        _setGraphDimensions(xcHelper.deepCopy(node.getPosition()))

        Log.add(SQLTStr.AddOperation, {
            "operation": SQLOps.AddOperation,
            "dataflowId": activeDagTab.getId(),
            "nodeId": nodeId
        });
    }

    function _removeNodesNoPersist(nodeIds: DagNodeId[]): boolean {
        if (!nodeIds.length) {
            return false;
        }
        nodeIds.forEach(function(nodeId) {
            if (nodeId.startsWith("dag")) {
                // Remove tabs for custom OP
                const dagNode = activeDag.getNode(nodeId);
                if (dagNode instanceof DagNodeCustom) {
                    DagTabManager.Instance.removeCustomTabByNode(dagNode);
                }

                activeDag.removeNode(nodeId);
                DagView.getNode(nodeId).remove();
                $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                    const childNodeId = $(this).attr("data-childnodeid");
                    _removeConnection($(this), childNodeId);
                });
            } else if (nodeId.startsWith("comment")) {
                activeDag.removeComment(nodeId);
                DagComment.Instance.removeComment(nodeId);
            }
        });

        Log.add(SQLTStr.RemoveOperations, {
            "operation": SQLOps.RemoveOperations,
            "dataflowId": activeDagTab.getId(),
            "nodeIds": nodeIds
        });
        return true;
    }

    function _connectNodesNoPersist(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        isReconnect?: boolean,
    ) {
        let prevParentId = null;
        if (isReconnect) {
            const $curEdge = $dagView.find('.edge[data-childnodeid="' +
                                            childNodeId +
                                            '"][data-connectorindex="' +
                                            connectorIndex + '"]');
            prevParentId = $curEdge.data("parentnodeid");
            activeDag.disconnect(prevParentId, childNodeId, connectorIndex);
            _removeConnection($curEdge, childNodeId);
        }

        activeDag.connect(parentNodeId, childNodeId, connectorIndex);

        _drawConnection(parentNodeId, childNodeId, connectorIndex);

        Log.add(SQLTStr.ConnectOperations, {
            "operation": SQLOps.ConnectOperations,
            "dataflowId": activeDagTab.getId(),
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex,
            "prevParentNodeId": prevParentId
        });
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

    function _removeConnection($edge, childNodeId) {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();

        const $childNode: JQuery = DagView.getNode(childNodeId);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);

        if ($childConnector.hasClass("multi")) {
            // if removing an edge from a multichildnode then decrement all
            // the edges that have a greater index than the removed one
            // due to splice action on children array
            const svg: d3 = d3.select("#dagView .dataflowArea.active .edgeSvg");
            $dagView.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function() {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    _drawLineBetweenNodes(parentNodeId, childNodeId, index - 1, svg);
                    // _drawLineBetweenNodes(parentNodeId, childNodeId, connectorIndex, svg);
                    $curEdge.attr("data-connectorindex", index - 1);
                }
            })
        } else if (activeDag.getNode(childNodeId).isSourceNode()) {
             $childConnector.removeClass("hasConnection")
                            .addClass("noConnection");
        }
        activeDagTab.saveTab();
    }


    function _addEventListeners(): void {

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main, .comment", function(event) {
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
            const $dfArea = $dfWrap.find(".dataflowArea.active");

            new DragHelper({
                event: event,
                $element: $operator,
                $elements: $operator.add($dfArea.find(".selected")),
                $container: $dagView,
                $dropTarget: $dfArea.find(".dataflowAreaWrapper"),
                round: gridSpacing,
                scale: activeDag.getScale(),
                onDragStart: function(_$els) {
                },
                onDragEnd: function($els, _event, data) {
                    let nodeInfos = [];
                    $els.each(function(i) {
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
                    DagView.moveNodes(nodeInfos);
                },
                onDragFail: function() {
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
                },
                move: true
            });
        });

        // connecting 2 nodes dragging the parent's connector
        $dfWrap.on("mousedown", ".operator .connector.out", function(event) {
            if (event.which !== 1) {
                return;
            }
            const $parentConnector = $(this);
            const $parentNode = $parentConnector.closest(".operator");
            const parentNodeId: DagNodeId = $parentNode.data("nodeid");
            const $dfArea = $dfWrap.find(".dataflowArea.active");
            let $candidates: JQuery;
            let path;
            let parentCoors;
            let scale: number = activeDag.getScale();

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
                onDragStart: function(_$el: JQuery, _e: JQueryEventObject) {
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function() {
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
                        x: ((rect.right + offset.left) / scale) - 1,
                        y: ((rect.top + offset.top) / scale) + 6
                    };
                    // setup svg for temporary line
                    $dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                    const svg = d3.select("#dagView .dataflowArea.active .secondarySvg");

                    const edge = svg.append("g")
                                    .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function(coors) {
                    const offset = _getDFAreaOffset();
                    const childCoors = {
                        x: (coors.x  + offset.left) / scale,
                        y: ((coors.y + offset.top) / scale) + 5
                    };
                    path.attr("d", lineFunction([parentCoors, childCoors]));
                },
                onDragEnd: function(_$el, event) {
                    let $childNode: JQuery;
                    $candidates.removeClass("dropAvailable noDrop");

                    $dfArea.find(".secondarySvg").remove();
                    // check if location of drop matches position of a valid
                    // $operator
                    $candidates.each(function() {
                        const rect: DOMRect = this.getBoundingClientRect();
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

                    const childNodeId: DagNodeId = $childNode.data("nodeid");
                    const childNode: DagNode = activeDag.getNode(childNodeId);
                    const connectorIndex: number = childNode.getNextOpenConnectionIndex();
                    if (!activeDag.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode);
                        return;
                    }

                    DagView.connectNodes(parentNodeId, childNodeId, connectorIndex);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        // connecting 2 nodes dragging the child's connector
        $dfWrap.on("mousedown", ".operator .connector.in", function(event) {
            if (event.which !== 1) {
                return;
            }

            const $childConnector = $(this);
            const $childNode = $childConnector.closest(".operator");
            const childNodeId: DagNodeId = $childNode.data("nodeid");
            const $dfArea = $dfWrap.find(".dataflowArea.active");
            let $candidates: JQuery;
            let path;
            let childCoors;
            let connectorIndex: number = activeDag.getNode(childNodeId)
                                                .getNextOpenConnectionIndex();
            let isReconnecting = false;
            let otherParentId;

            // if child connector is in use, when drag finishes we will remove
            // this connection and replace with a new one
            if (connectorIndex === -1) {
                isReconnecting = true;
                connectorIndex = parseInt($childConnector.data("index"));
            }
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
                onDragStart: function(_$el: JQuery, _e: JQueryEventObject) {
                    if (isReconnecting) {
                        // connection already taken, temporarily remove connection
                        // and create a new one when drop finishes or add it back
                        // if drop fails
                        const $curEdge = $dagView.find('.edge[data-childnodeid="' +
                                            childNodeId +
                                            '"][data-connectorindex="' +
                                            connectorIndex + '"]');
                        otherParentId = $curEdge.data("parentnodeid");
                        activeDag.disconnect(otherParentId ,childNodeId,
                                            connectorIndex);
                    }
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function() {
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
                        x: ((rect.left + offset.left) / scale) - 1,
                        y: ((rect.top + offset.top) / scale) + 4
                    };
                    // setup svg for temporary line
                    $dfArea.find(".dataflowAreaWrapper").append('<svg class="secondarySvg"></svg>');
                    const svg = d3.select("#dagView .dataflowArea.active .secondarySvg");

                    const edge = svg.append("g")
                                    .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function(coors) {
                    const offset = _getDFAreaOffset();
                    const parentCoors = {
                        x: ((coors.x + offset.left) / scale) + 2,
                        y: ((coors.y + offset.top) / scale) + 4
                    };
                    path.attr("d", lineFunction([childCoors, parentCoors]));
                },
                onDragEnd: function(_$el, event) {
                    let $parentNode: JQuery;
                    $candidates.removeClass("dropAvailable noDrop");

                    $dfArea.find(".secondarySvg").remove();
                    // check if location of drop matches position of a valid
                    // $operator
                    $candidates.each(function() {
                        const rect: DOMRect = this.getBoundingClientRect();
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
                        console.log("invalid connection");
                        if (isReconnecting) {
                            activeDag.connect(otherParentId ,childNodeId,
                                              connectorIndex, true, false);
                        }
                        return;
                    }

                    const parentNodeId: DagNodeId = $parentNode.data("nodeid");

                    if (!activeDag.canConnect(parentNodeId, childNodeId,
                                              connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode);
                        if (isReconnecting) {
                            activeDag.connect(otherParentId ,childNodeId,
                                              connectorIndex, true, false);
                        }
                        return;
                    }
                    if (isReconnecting) {
                        activeDag.connect(otherParentId ,childNodeId,
                                          connectorIndex, true, false);
                    }

                    DagView.connectNodes(parentNodeId, childNodeId,
                                         connectorIndex, isReconnecting);
                },
                onDragFail: function() {
                    if (isReconnecting) {
                        activeDag.connect(otherParentId ,childNodeId,
                                            connectorIndex, true, false);
                    }
                },
                copy: true
            });
        });

        // drag select multiple nodes
        let $dfArea;
        let $els;
        $dfWrap.on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            let $target = $(event.target);
            $dfArea = $dfWrap.find(".dataflowArea.active");

            if ($target.is(".dataflowAreaWrapper") ||
                $target.is(".dataflowArea") || $target.is(".dataflowWrap") ||
                $target.is(".edgeSvg") || $target.is(".operatorSvg") ||
                $target.is(".commentArea")) {

                new RectSelction(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfArea.find(".dataflowAreaWrapper"),
                    "$scrollContainer": $dfArea,
                    "onStart": function() {
                        $dfArea.addClass("drawing");
                        $els = $dfArea.find(".operator");
                        $els = $els.add($dfArea.find(".comment"));
                        $els.removeClass("selected");
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            }
        });

        $dfWrap.on("click", ".descriptionIcon", function() {
            const nodeId: DagNodeId = $(this).closest(".operator")
                                             .data("nodeid");
            DagDescriptionModal.Instance.show(nodeId);
        });

        function _drawRect(
            bound: DOMRect,
            selectTop: number,
            selectRight: number,
            selectBottom: number,
            selectLeft: number
        ): void {
            $els.each(function() {
                const $el = $(this);
                const opRect = this.getBoundingClientRect();
                const opTop = opRect.top - bound.top;
                const opLeft = opRect.left - bound.left;
                const opRight = opRect.right - bound.left;
                const opBottom = opRect.bottom - bound.top;
                if (opTop > selectBottom || opLeft > selectRight ||
                    opRight < selectLeft || opBottom < selectTop)
                {
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
                $selectedEls.each(function() {
                    $(this).removeClass("selecting")
                           .addClass("selected");
                });
            }
            $dfArea = null;
            $els = null;
        }
    }

    function _getDFAreaOffset() {
        const $dfArea = $dfWrap.find(".dataflowArea.active");
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
        const $dfArea = $dagView.find(".dataflowArea.active");
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

    function _setTooltip($node: JQuery, node: DagNode): void {
        const title: string = (node.getState() === DagNodeState.Error) ?
        node.getError() : JSON.stringify(node.getParam(), null, 2);
        xcTooltip.add($node.find(".main"), {
            title: title
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

        let abbrId = nodeId.slice(nodeId.indexOf(".") + 1);
        abbrId = abbrId.slice(abbrId.indexOf(".") + 1);

        // show id next to node
        // d3.select($node.get(0)).append("text")
        //    .attr("fill", "black")
        //    .attr("font-size", 8)
        //    .attr("x", 10)
        //    .attr("y", 38)
        //    .text(abbrId);

        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("state-" + node.getState());
        if (select) {
            $node.addClass("selected");
        }
        // Set the node display title
        const $opTitle = $node.find('.opTitle');
        if (node instanceof DagNodeCustom) {
            $opTitle.text(node.getCustomName());
            // The custom op is hidden in the category bar, so show it in the diagram
            $node.removeClass('xc-hidden');
        } else if (node instanceof DagNodeCustomInput
            || node instanceof DagNodeCustomOutput
        ) {
            $opTitle.text(node.getPortName());
            // The custom input/output is hidden in the category bar, so show it in the diagram
            $node.removeClass('xc-hidden');
        }

        $node.appendTo($dfArea.find(".operatorSvg"));
        return $node;
    }



    function _drawConnection(parentNodeId, childNodeId, connectorIndex) {
        const $childNode: JQuery = DagView.getNode(childNodeId);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
                       .addClass("hasConnection");

        const svg: d3 = d3.select("#dagView .dataflowArea.active .edgeSvg");

        _drawLineBetweenNodes(parentNodeId, childNodeId, connectorIndex, svg);
    }

    const lineFunction: Function = d3.svg.line()
                                        .x(function(d) {return d.x;})
                                        .y(function(d) {return d.y;})
                                        .interpolate("cardinal");

    function _drawLineBetweenNodes(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        svg: d3
    ): void {
        const parentNode: DagNode = activeDag.getNode(parentNodeId);
        const childNode: DagNode = activeDag.getNode(childNodeId);
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
        if (isMulti) {
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

    function _setupGraphEvents(): void {
        activeDag.events.on(DagNodeEvents.StateChange, function(info) {
            const $node: JQuery = DagView.getNode(info.id);
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
            activeDagTab.saveTab();
        });

        activeDag.events.on(DagNodeEvents.ParamChange, function(info) {
            const $node: JQuery = DagView.getNode(info.id);

            xcTooltip.add($node.find(".main"), {
                title: JSON.stringify(info.params, null, 2)
            });
            activeDagTab.saveTab();
        });

        activeDag.events.on(DagNodeEvents.AggregateChange, function(info) {
            editAggregates(info.id,info.aggregates);
        });

        activeDag.events.on(DagNodeEvents.TableRemove, function(info) {
            const tableName: string = info.table;
            const nodeId: DagNodeId = info.nodeId;
            if (DagTable.Instance.getBindNodeId() === nodeId) {
                DagTable.Instance.close();
            }
            // XXX TODO: this is just a temp solution, refine it
            TblManager.deleteTables([tableName], TableType.Orphan, true, true);
        });
    }

      // groups individual nodes into trees and joins branches with main tree
    function splitIntoTrees(node, seen, treeGroups, groupId) {
        const treeGroup = {};
        formTreesHelper(node);
        function formTreesHelper(node) {
            const id = node.getId();
            if (treeGroup[id]) { // already done
                return;
            }

            if (seen[id] != null) { // we've encountered this node and it's
            // part of another group so lets join its children to that group
                const mainGroupId  = seen[id];
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
    function alignNodes(node, seen, width) {
        let greatestWidth = width;
        alignHelper(node, 0, width);

        function alignHelper(node, depth, width) {
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

            for (let i = 0; i < parents.length; i++) {
                if (parents[i] != null &&
                    seen[parents[i].getId()] == null) {
                    let newWidth;
                    if (i === 0) {
                        newWidth = width;
                    } else {
                        newWidth = greatestWidth + 1;
                    }
                    alignHelper(parents[i], depth + 1, newWidth);
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
                    alignHelper(children[i], depth - 1,
                                    newWidth);
                    numChildrenDrawn++;
                }
            }
        }
    }

    // adjust positions of nodes so that children will never be
    // to the left of their parents
    function adjustPositions(node, nodes, seen) {
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
                adjustPositions(children[i], nodes, seen);
            }
        }
    }

    function createNodeInfos(
        nodeIds: DagNodeId[], options?: { isSkipOutParent?: boolean }
    ): any[] {
        const { isSkipOutParent = true } = options || {};
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                const node: DagNode = activeDag.getNode(nodeId);
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
                            // XXX check if this affects order of union input
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

                const nodeInfo = node.getNodeCopyInfo();
                nodeInfo['parentIds'] = parentIds;
                nodeInfos.push(nodeInfo);
            } else if (nodeId.startsWith("comment")) {
                const comment: CommentNode = activeDag.getComment(nodeId);
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
            nodeInfos: createNodeInfos(nodeIds)
        };
    }

    function addDescriptionIcon($node: JQuery, text:string): void {
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
            .text(function(_d) {return "\ue966"});

        xcTooltip.add($node.find(".descriptionIcon"), {
            title:  xcHelper.escapeDblQuoteForHTML(text)
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
            .text(function(_d) {return "\ue939"});

        xcTooltip.add($node.find(".aggregateIcon"), {
            title:  xcHelper.escapeDblQuoteForHTML(aggregates.toString())
        });
    }

    /**
     *
     * @param nodeId
     * @param aggregates
     */
    export function editAggregates(
        nodeId: DagNodeId,
        aggregates: string[]
    ): void {
        const $node = DagView.getNode(nodeId);
        $node.find(".aggregateIcon").remove();

        if (aggregates.length) {
            addAggregates($node, aggregates);
        } else {
            $node.removeClass("hasAggregate");
        }
    }

    export function addProgress(nodeId: DagNodeId): void {
        const g = d3.select('#dagView .operator[data-nodeid = "' + nodeId + '"]');
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

    export function updateProgress(nodeId: DagNodeId, progress: number): void {
        const g = d3.select('#dagView .operator[data-nodeid = "' + nodeId + '"]');
        g.select(".opProgress")
        .text(progress + "%");
    }

    export function removeProgress(nodeId: DagNodeId): void {
        const g = d3.select('#dagView .operator[data-nodeid = "' + nodeId + '"]');
        g.selectAll(".opProgress")
        .remove();
    }

    function getNextAvailablePosition(x: number, y: number): Coordinate {
        let positions = {};
        let positionConflict = true;

        activeDag.getAllNodes().forEach(node => {
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
                y+= gridSpacing;
                x += gridSpacing;
            }
        }
        return {
            x: x,
            y: y
        }
    }
}