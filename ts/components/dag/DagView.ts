namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;
    let activeDagTab: DagTab;
    const autoHorzSpacing = 140; // spacing between nodes when auto-aligning
    const autoVertSpacing = 60;
    const horzPadding = 200;
    const vertPadding = 100;
    const nodeHeight = 28;
    const nodeWidth = 102;
    const gridSpacing = 20;
    let clipboard = null;

    export function setup(): void {
        if (gDionysus) {
            $("#dagButton").attr("style", "");
        }
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        // XXX used for testing
        activeDag = null;
        activeDagTab = null;

        _setupSelectingAndDragDrop();
        DagTopBar.Instance.setup();
        DagCategoryBar.Instance.setup();
        DagNodeMenu.setup();
        DagDatasetModal.setup();
    }

    /**
     * Called when dag panel becomes visible, listeners that are removed when
     * panel closes.
     */
    export function show(): void {
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
            DagView.copyNodes(DagView.getSelectedNodeIds(true));
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
            DagView.cutNodes(DagView.getSelectedNodeIds(true));
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
                    DagView.removeNodes(DagView.getSelectedNodeIds(true));
                    break;
                default:
                    break;
            }
        });
    }

    /**
     * Called when navigating away from dag panel
     */
    export function hide(): void {
        $(window).off(".dagViewResize");
        $(document).off(".dataflowPanel");
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
        if (dimensions.width > -1) {
            $dfArea.css("min-height", dimensions.height);
            $dfArea.find(".sizer").css("min-width", dimensions.width);
            $dfArea.css("min-width", dimensions.width);
        }

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
        $dfArea.find(".operator").removeClass("selected");
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            const node: DagNode = activeDag.addBackNode(nodeId);
            _drawNode(node, $dfArea);

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
            DagView.getNode(nodeId).addClass("selected");
        }
        _setGraphDimensions({x: maxXCoor, y: maxYCoor});
        return activeDagTab.saveTab();
    }

    /**
     * DagView.addNode
     * @param dagId
     * @param nodeInfo
     */
    export function addNode(nodeInfo: DagNodeInfo): XDPromise<void> {
        $dfWrap.find(".operator").removeClass("selected");
        const $dfArea = $dfWrap.find(".dataflowArea.active");

        const node = activeDag.newNode(nodeInfo);
        const nodeId = node.getId();
        const $node = _drawNode(node, $dfArea);
        $node.addClass("selected");
        _setGraphDimensions(nodeInfo.display);

        Log.add(SQLTStr.AddOperation, {
            "operation": SQLOps.AddOperation,
            "dataflowId": activeDagTab.getId(),
            "nodeId": nodeId
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
        if (!nodeIds.length) {
            return PromiseHelper.reject();
        }
        nodeIds.forEach(function(nodeId) {
            activeDag.removeNode(nodeId);
            DagView.getNode(nodeId).remove();
            $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
            $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                const childNodeId = $(this).attr("data-childnodeid");
                _removeConnection($(this), childNodeId);
            });
        });

        Log.add(SQLTStr.RemoveOperations, {
            "operation": SQLOps.RemoveOperations,
            "dataflowId": activeDagTab.getId(),
            "nodeIds": nodeIds
        });
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
            const $operators = $dfArea.find(".operator");
            $operators.removeClass("selected");

            let positions = {};
            let minXCoor: number = $dfArea.width();
            let minYCoor: number = $dfArea.height();
            let maxXCoor: number = 0;
            let maxYCoor: number = 0;

            $operators.each(function() {
                const nodeId: DagNodeId = $(this).data("nodeid");
                const pos: Coordinate = activeDag.getNode(nodeId).getPosition();
                if (!positions[pos.x]) {
                    positions[pos.x] = {};
                }
                positions[pos.x][pos.y] = true;
            });

            clipboard.nodeInfos.forEach((nodeInfo) => {
                minYCoor = Math.min(nodeInfo.display.y, minYCoor);
                if (nodeInfo.display.y === minYCoor) {
                    minXCoor = Math.min(nodeInfo.display.x, minXCoor);
                }
                maxXCoor = Math.max(nodeInfo.display.x, maxXCoor);
                maxYCoor = Math.max(nodeInfo.display.y, maxYCoor);
            });

            let origMinXCoor = minXCoor;
            let origMinYCoor = minYCoor;
            minXCoor += (gridSpacing * 5);
            minYCoor += (gridSpacing * 2);

            let positionConflict = true;
            while (positionConflict) {
                positionConflict = false;
                if (positions[minXCoor] && positions[minXCoor][minYCoor]) {
                    positionConflict = true;
                    minYCoor += gridSpacing;
                    minXCoor += gridSpacing;
                }
            }

            let xDelta = minXCoor - origMinXCoor;
            let yDelta = minYCoor - origMinYCoor;
            maxXCoor += xDelta;
            maxYCoor += yDelta;

            const newNodeIds: DagNodeId[] = [];
            const newNodes: DagNode[] = [];
            const oldNodeIdMap = {};
            clipboard.nodeInfos.forEach((nodeInfo) => {
                nodeInfo = xcHelper.deepCopy(nodeInfo);
                nodeInfo.display.x += xDelta;
                nodeInfo.display.y += yDelta;
                const newNode: DagNode = activeDag.newNode(nodeInfo);
                newNodes.push(newNode);


                const newNodeId: DagNodeId = newNode.getId();
                oldNodeIdMap[nodeInfo.nodeId] = newNodeId;
                newNodeIds.push(newNodeId);
                _drawNode(newNode, $dfArea, true);
            });

            // restore connection to parents
            newNodeIds.forEach((newNodeId, i) => {
                clipboard.nodeInfos[i].parentIds.forEach((parentId, j) => {
                    if (parentId == null) {
                        return; // skip empty parent slots
                    }
                    const newParentId = oldNodeIdMap[parentId];
                    activeDag.connect(newParentId, newNodeId, j);
                    _drawConnection(newParentId, newNodeId, j);
                });
            });

            // XXX scroll to selection if off screen

            _setGraphDimensions({x: maxXCoor, y: maxYCoor});

            Log.add(SQLTStr.CopyOperations, {
                "operation": SQLOps.CopyOperations,
                "dataflowId": activeDagTab.getId(),
                "nodeIds": newNodeIds
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
     * connects 2 nodes and draws line
     */
    export function connectNodes(
        parentNodeId,
        childNodeId,
        connectorIndex
    ): XDPromise<void> {
        activeDag.connect(parentNodeId, childNodeId, connectorIndex);

        _drawConnection(parentNodeId, childNodeId, connectorIndex);

        Log.add(SQLTStr.ConnectOperations, {
            "operation": SQLOps.ConnectOperations,
            "dataflowId": activeDagTab.getId(),
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex
        });
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
        Log.add(SQLTStr.DisconnectOperation, {
            "operation": SQLOps.DisconnectOperation,
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
    export function moveNodes(nodeIds: DagNodeId[], positions: Coordinate[], graphDimensions?: Coordinate): XDPromise<void> {
        let svg = d3.select("#dagView .dataflowArea.active .mainSvg");
        let oldPositions = [];
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;

        nodeIds.forEach((nodeId, i) => {
            const $el = DagView.getNode(nodeId);
            oldPositions.push(xcHelper.deepCopy(activeDag.getNode(nodeId)
                                                         .getPosition()));
            activeDag.moveNode(nodeId, {
                x: positions[i].x,
                y: positions[i].y
            });

            $el.css({
                left: positions[i].x,
                top: positions[i].y
            });

            maxXCoor = Math.max(positions[i].x, maxXCoor);
            maxYCoor = Math.max(positions[i].y, maxYCoor);

            // positions this element in front
            $el.appendTo($dfWrap.find(".dataflowArea.active"));

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
        });
        if (graphDimensions) {
            _setGraphDimensions(graphDimensions, true);
        } else {
            _setGraphDimensions({x: maxXCoor, y: maxYCoor});
        }


        Log.add(SQLTStr.MoveOperations, {
            "operation": SQLOps.MoveOperations,
            "dataflowId": activeDagTab.getId(),
            "nodeIds": nodeIds,
            "oldPositions": oldPositions,
            "newPositions": positions
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
        const allNodeIds: DagNodeId[] = [];
        const allCoors: Coordinate[] = [];
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
                allNodeIds.push(j);
                allCoors.push({
                    x: ((maxDepth - nodes[j].depth) * autoHorzSpacing) + gridSpacing,
                    y: (nodes[j].width * autoVertSpacing) + gridSpacing
                });
            }
            startingWidth = (maxWidth + 1);
        }
        const graphHeight = autoVertSpacing * (startingWidth - 1) + vertPadding;
        const graphWidth = autoHorzSpacing * overallMaxDepth  + horzPadding;
        DagView.moveNodes(allNodeIds, allCoors, {
            x: graphWidth,
            y: graphHeight
        });
    }

    export function getAllNodes(): JQuery {
        return $dfWrap.find(".dataflowArea.active .operator");
    }

    export function getSelectedNodes(includeSelecting?: boolean): JQuery {
        let selector = ".operator.selected";
        if (includeSelecting) {
            selector += ", .operator.selecting";
        }
        return $dfWrap.find(".dataflowArea.active").find(selector);
    }

    export function getSelectedNodeIds(includeSelecting?: boolean): DagNodeId[] {
        const $nodes: JQuery = DagView.getSelectedNodes(includeSelecting);
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
            DagTable.Instance.show(viewer)
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
     * DagView.cancel
     * // cancel entire run or execution
     */
    export function cancel() {

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
            $dagView.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function() {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index > connectorIndex) {
                    $curEdge.attr("data-connectorindex", index - 1);
                }
            })
        } else if (activeDag.getNode(childNodeId).isSourceNode()) {
             $childConnector.removeClass("hasConnection")
                            .addClass("noConnection");
        }
        activeDagTab.saveTab();
    }


    function _setupSelectingAndDragDrop(): void {

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main", function(event) {
            const $opMain = $(this);
            const $operator = $opMain.closest(".operator");

            // if not shift clicking, deselect other nodes
            // if shift clicking, and this is selected, then deselect it
            // but don't allow dragging on deselected node
            if (!$operator.hasClass("selected") && !event.shiftKey) {
                $dfWrap.find(".operator").removeClass("selected");
            } else if ($operator.hasClass("selected") && event.shiftKey) {
                $operator.removeClass("selected");
                return;
            }
            $operator.addClass("selected");
            if (event.which !== 1) {
                return;
            }
            const $dfArea = $dfWrap.find(".dataflowArea.active");

            new DragHelper({
                event: event,
                $element: $operator,
                $elements: $operator.add($dfArea.find(".operator.selected")),
                $container: $dagView,
                $dropTarget: $dfArea,
                round: gridSpacing,
                onDragStart: function(_$els) {
                },
                onDragEnd: function($els, _event, data) {
                    let nodeIds: DagNodeId[] = [];
                    $els.each(function() {
                        const nodeId = $(this).data("nodeid");
                        nodeIds.push(nodeId);
                    });
                    DagView.moveNodes(nodeIds, data.coors);
                },
                onDragFail: function() {
                    // did not drag
                    if (!event.shiftKey) {
                        $dfWrap.find(".operator").removeClass("selected");
                        $operator.addClass("selected");
                    }
                    // if no drag, treat as right click and open menu
                    let contextMenuEvent = $.Event("contextmenu", {
                        pageX: event.pageX,
                        pageY: event.pageY
                    });
                    $opMain.trigger(contextMenuEvent);
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

            new DragHelper({
                event: event,
                $element: $parentConnector,
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
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
                        x: rect.right + offset.left - 1,
                        y: rect.top + offset.top + 6
                    };
                    // setup svg for temporary line
                    $dfArea.append('<svg class="secondarySvg"></svg>');
                    const svg = d3.select("#dagView .dataflowArea.active .secondarySvg");

                    const edge = svg.append("g")
                                    .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function(coors) {
                    const offset = _getDFAreaOffset();
                    const childCoors = {
                        x: coors.x + offset.left,
                        y: coors.y + offset.top + 5
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
                        StatusBox.show(DagTStr.CycleConnection, $childNode)

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
            if ($childConnector.hasClass("hasConnection") &&
                !$childConnector.hasClass("multi")) {
                return;
            }
            const $childNode = $childConnector.closest(".operator");
            const childNodeId: DagNodeId = $childNode.data("nodeid");
            const $dfArea = $dfWrap.find(".dataflowArea.active");
            let $candidates: JQuery;
            let path;
            let childCoors;
            let connectorIndex = activeDag.getNode(childNodeId).getNextOpenConnectionIndex();

            new DragHelper({
                event: event,
                $element: $childConnector,
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
                noCursor: true,
                onDragStart: function(_$el: JQuery, _e: JQueryEventObject) {
                    const $operators: JQuery = $dfArea.find(".operator");
                    $candidates = $operators.filter(function() {
                        const parentNodeId = $(this).data("nodeid");
                        if (childNodeId === parentNodeId) {
                            return false;
                        }

                        return activeDag.canConnect(parentNodeId, childNodeId, connectorIndex, true);
                    });
                    $operators.addClass("noDrop");
                    $candidates.removeClass("noDrop").addClass("dropAvailable");
                    const offset = _getDFAreaOffset();
                    const rect = $childConnector[0].getBoundingClientRect();
                    childCoors = {
                        x: rect.right + offset.left - 1,
                        y: rect.top + offset.top + 6
                    };
                    // setup svg for temporary line
                    $dfArea.append('<svg class="secondarySvg"></svg>');
                    const svg = d3.select("#dagView .dataflowArea.active .secondarySvg");

                    const edge = svg.append("g")
                                    .attr("class", "edge tempEdge");

                    path = edge.append("path");
                    path.attr("class", "visibleLine");
                },
                onDrag: function(coors) {
                    const offset = _getDFAreaOffset();
                    const parentCoors = {
                        x: coors.x + offset.left,
                        y: coors.y + offset.top + 5
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
                        return;
                    }

                    const parentNodeId: DagNodeId = $parentNode.data("nodeid");

                    if (!activeDag.canConnect(parentNodeId, childNodeId, connectorIndex)) {
                        StatusBox.show(DagTStr.CycleConnection, $childNode)
                        return;
                    }

                    DagView.connectNodes(parentNodeId, childNodeId, connectorIndex);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        // drag select multiple nodes
        let $dfArea;
        let $operators;
        $dfWrap.on("mousedown", function(event) {
            if (event.which !== 1) {
                return;
            }
            let $target = $(event.target);
            $dfArea = $dfWrap.find(".dataflowArea.active");

            if ($target.is(".dataflowArea") || $target.is(".dataflowWrap") ||
                 $target.is(".mainSvg")) {

                new RectSelction(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfWrap,
                    "onStart": function() {
                        $dfArea.addClass("drawing");
                        $operators = $dfArea.find(".operator");
                        $operators.removeClass("selected");
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            }
        });

        function _drawRect(
            bound: DOMRect,
            selectTop: number,
            selectRight: number,
            selectBottom: number,
            selectLeft: number
        ): void {
            $operators.each(function() {
                const $operator = $(this);
                const opRect = this.getBoundingClientRect();
                const opTop = opRect.top - bound.top;
                const opLeft = opRect.left - bound.left;
                const opRight = opRect.right - bound.left;
                const opBottom = opRect.bottom - bound.top;
                if (opTop > selectBottom || opLeft > selectRight ||
                    opRight < selectLeft || opBottom < selectTop)
                {
                    $operator.removeClass("selecting");
                } else {
                    $operator.addClass("selecting");
                }
            });
        }
        function _endDrawRect(_event: JQueryEventObject): void {
            $dfArea.removeClass("drawing");
            const $ops = $dfArea.find(".operator.selecting");
            if ($ops.length === 0) {
                $dfArea.find(".operator.selected").removeClass("selected");
            } else {
                $ops.each(function() {
                    $(this).removeClass("selecting")
                           .addClass("selected");
                });
            }
            $dfArea = null;
            $operators = null;
        }
    }

    function _getDFAreaOffset() {
        const containerRect = $dfWrap[0].getBoundingClientRect();
        const offsetTop = $dfWrap.scrollTop() - containerRect.top;
        const offsetLeft = $dfWrap.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }

    function _getChildConnector($childNode: JQuery, index: number): JQuery {
        let $childConnector: JQuery;
        let $childConnectors = $childNode.find(".connector.in");
        if ($childConnectors.hasClass(".multi")) {
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

    function _setGraphDimensions(elCoors: Coordinate, force?: boolean) {
        const $dfArea = $dagView.find(".dataflowArea.active");
        if (force) {
            activeDag.setDimensions(elCoors.x, elCoors.y);
            $dfArea.css("min-width", elCoors.x);
            $dfArea.css("min-height", elCoors.y);
            $dfArea.find(".sizer").css("min-width", elCoors.x);
        } else {
            const dimensions: Dimensions = activeDag.getDimensions();

            let newWidth: number = Math.max(elCoors.x + horzPadding,
                                            dimensions.width);
            let newHeight: number = Math.max(elCoors.y + vertPadding,
                                            dimensions.height);

            activeDag.setDimensions(newWidth, newHeight);
            $dfArea.css("min-width", newWidth);
            $dfArea.css("min-height", newHeight);
        }
    }

    function _drawNode(node: DagNode, $dfArea: JQuery, select?: boolean): JQuery {
        const pos = node.getPosition();
        const type = node.getType();
        const nodeId = node.getId();
        const $node = $operatorBar.find('.operator[data-type="' + type + '"]')
                                  .first().clone();

        $node.css({
            left: pos.x,
            top: pos.y
        });

        xcTooltip.add($node.find(".main"), {
            title: JSON.stringify(node.getParam(), null, 2)
        });

        let abbrId = nodeId.slice(nodeId.indexOf(".") + 1);
        abbrId = abbrId.slice(abbrId.indexOf(".") + 1);

        // show id next to node
        // $node.append('<div class="nodeid">' + abbrId + '</div>');

        // use .attr instead of .data so we can grab by selector
        $node.attr("data-nodeid", nodeId);
        $node.addClass("state-" + node.getState());
        if (select) {
            $node.addClass("selected");
        }
        $node.appendTo($dfArea);
        return $node;
    }

    function _drawConnection(parentNodeId, childNodeId, connectorIndex) {
        const $childNode: JQuery = DagView.getNode(childNodeId);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
                       .addClass("hasConnection");

        const svg: d3 = d3.select("#dagView .dataflowArea.active .mainSvg");

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
        if (numParents === -1) {
            numParents = 1;
            numConnections = 0;
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
    }

    function _setupGraphEvents(): void {
        activeDag.events.on(DagNodeEvents.StateChange, function(info) {
            const $node: JQuery = DagView.getNode(info.id);
            let stateClasses = "";
            for (let i in DagNodeState) {
                stateClasses += "state-" + DagNodeState[i] + " ";
            }
            $node.removeClass(stateClasses);
            $node.addClass("state-" + info.state);

            activeDagTab.saveTab();
        });

        activeDag.events.on(DagNodeEvents.ParamChange, function(info) {
            const $node: JQuery = DagView.getNode(info.id);

            xcTooltip.add($node.find(".main"), {
                title: JSON.stringify(info.params, null, 2)
            });
            activeDagTab.saveTab();
        });

        activeDag.events.on(DagNodeEvents.TableRemove, function(info) {
            if (DagTable.Instance.getTable() === info.table) {
                DagTable.Instance.close();
            }
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

    function cutOrCopyNodesHelper(nodeIds: DagNodeId[]): void {
        xcHelper.copyToClipboard(" "); // need to have content to overwrite current clipboard
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
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

                    if (nodeIds.indexOf(parentId) === -1) {
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

            const nodeInfo = {
                type: node.getType(),
                input: xcHelper.deepCopy(node.getParam()),
                comment: node.getComment(),
                display: xcHelper.deepCopy(node.getPosition()),
                nodeId: nodeId,
                parentIds: parentIds
            };
            nodeInfos.push(nodeInfo);
        });

        clipboard = {
            type: "dagNodes",
            nodeInfos: nodeInfos
        };
    }
}