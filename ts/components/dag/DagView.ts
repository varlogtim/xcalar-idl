namespace DagView {
    export const horzPadding = 200;
    export const vertPadding = 100;
    export const nodeHeight = 28;
    export const nodeWidth = 103;
    export const gridSpacing = 20;
    export const zoomLevels = [.25, .5, .75, 1, 1.5, 2];
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
    const lockedNodeIds = {};
    const dagEventNamespace = 'DagView';

    export function setup(): void {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        // XXX used for testing
        activeDag = null;
        activeDagTab = null;

        _addEventListeners();
        _setupDagSharedActionEvents();
        _setupMode();

        DagTopBar.Instance.setup();
        DagCategoryBar.Instance.setup();
        DagCategoryBar.Instance.loadCategories(); // Async call
        DagNodeMenu.setup();
        DagComment.Instance.setup();
        DagParamManager.Instance.setup();

        if (UserSettings.getPref("dfProgressTips")) {
            DagView.toggleProgressTips(true);
        }
        if (UserSettings.getPref("dfConfigInfo")) {
            DagView.toogleConfigInfo(true);
        }
    }

    /**
     * Called when dag panel becomes visible, listeners that are removed when
     * panel closes.
     */
    export function show(): void {
        $("#container").addClass("activePanel-modelingDagPanel");
        DagCategoryBar.Instance.showOrHideArrows();

        let resizeTimer;
        $(window).on("resize.dagViewResize", function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                DagCategoryBar.Instance.showOrHideArrows();
            }, 300);
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
                return;
            }

            const nodesStr = DagView.copyNodes(DagView.getSelectedNodeIds(true, true));
            e.originalEvent.clipboardData.setData("text/plain", nodesStr);
            e.preventDefault(); // default behaviour is to copy any selected text
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
                return;
            }

            const nodesStr = DagView.cutNodes(DagView.getSelectedNodeIds(true, true));
            e.originalEvent.clipboardData.setData("text/plain", nodesStr);
            e.preventDefault(); // default behaviour is to copy any selected text
        });

        $(document).on("paste.dataflowPanel", function (e: JQueryEventObject) {
            if (isDisableActions()) {
                return;
            }
            if ($(e.target).is("input") || $(e.target).is("textarea")) {
                return; // use default paste event
            }
            let parsed = false;
            try {
                let content = e.originalEvent.clipboardData.getData('text/plain');
                if (content) {
                    const nodesArray = JSON.parse(content);
                    parsed = true;
                    if (!Array.isArray(nodesArray)) {
                        throw ("Dataflow nodes must be in an array");
                    }
                    let nodeSchema = DagNode.getCopySchema();
                    let nodeSchemaValidateFn = (new Ajv()).compile(nodeSchema);
                    let commentSchema = CommentNode.getCopySchema();
                    let commentSchemaValidateFn = (new Ajv()).compile(commentSchema);
                    for (let i = 0; i < nodesArray.length; i++) {
                        const node = nodesArray[i];
                        let valid;
                        let validate;
                        if (node.hasOwnProperty("text")) {
                            validate = commentSchemaValidateFn;
                        } else {
                            validate = nodeSchemaValidateFn;
                        }
                        valid = validate(node);
                        if (!valid) {
                            // only saving first error message
                            const msg = DagNode.parseValidationErrMsg(node, validate.errors[0], node.hasOwnProperty("text"));
                            throw (msg);
                        }

                        if (!node.hasOwnProperty("text")) {
                           // validate based on node type
                            const nodeClass = DagNodeFactory.getNodeClass(node);
                            let nodeSpecificSchema;
                            if (node.type === DagNodeType.Custom) {
                                nodeSpecificSchema = DagNodeCustom.getCopySpecificSchema();
                            } else {
                                nodeSpecificSchema = nodeClass.specificSchema;
                            }
                            if (!nodeClass["validateFn"]) {
                                // cache the validation function within the nodeClass
                                let ajv = new Ajv();
                                nodeClass["validateFn"] = ajv.compile(nodeSpecificSchema);
                            }
                            valid = nodeClass["validateFn"](node);
                            if (!valid) {
                                // only saving first error message
                                const msg = DagNode.parseValidationErrMsg(node, validate.errors[0]);
                                throw (msg);
                            }
                        }
                    }
                    DagView.pasteNodes(nodesArray);
                }
            } catch (err) {
                console.error(err);
                let errStr: string;
                if (!parsed) {
                    errStr = "Cannot paste invalid format. Nodes must be in a valid JSON format."
                } else if (typeof err === "string") {
                    errStr = err;
                } else {
                    errStr = xcHelper.parseJSONError(err).error;
                }
                StatusBox.show(errStr, $dfWrap);
            }
        });

        $(document).on("keydown.dataflowPanel", function (e: JQueryEventObject) {
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
            if (FormHelper.activeForm ||
                !$('#modelingDagPanel').hasClass('active') ||
                $('#container').hasClass('columnPicker') ||
                $('.modalContainer:not(#aboutModal):visible').length ||
                $('textarea:focus').length ||
                $('input:focus').length
            ) {
                return;
            }

            event.preventDefault();
            xcMenu.close();
            // TblManager.unHighlightCells();

            if (event.which === keyCode.Y ||
                (event.which === keyCode.Z && event.shiftKey)) {
                if ($("#redo").hasClass("disabled")) {
                    Log.repeat();
                } else {
                    $('#redo').click();
                }
            } else if (event.which === keyCode.Z) {
                $('#undo').click();
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
        const $oldDfArea: JQuery = _getActiveArea();
        activeDagTab = dagTab;
        activeDag = dagTab.getGraph();
        DagView.reactivate();
        updateDagView();
        DagTable.Instance.switchTab(dagTab.getId());
        DagSearch.Instance.switchTab($oldDfArea);
        updateOperationTime();
    }

    /**
     * DagView.resetActiveDagTab
     */
    export function resetActiveDagTab(): void {
        activeDagTab = null;
        activeDag = null;
        updateDagView();
    }

    /**
     * DagView.switchMode
     */
    export function switchMode(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        _setupMode();
        DagTable.Instance.close();
        $dagView.find(".dataflowArea").remove();
        DagTopBar.Instance.switchMode();
        DagCategoryBar.Instance.switchMode()
        .then(() => {
            return DagList.Instance.swithMode();
        })
        .then(() => {
            return DagTabManager.Instance.switchMode();
        })
        .then(deferred.resolve)
        .fail(deferred.reject);

        return deferred.promise();
    }

    function _setupMode(): void {
        let $text: JQuery = $dagView.find(".dataflowWrapBackground .newTab span");
        if (XVM.isSQLMode()) {
            $dagView.addClass("sqlMode");
            $text.text(SQLTStr.CreateFunc);
        } else {
            $dagView.removeClass("sqlMode");
            $text.text(DFTStr.CreateDF);
        }
    }

    function updateDagView(): void {
        const $dfWrapBg: JQuery = $dagView.find(".dataflowWrapBackground");
        DagNodeInfoPanel.Instance.hide();
        if (activeDagTab == null) {
            $dfWrap.addClass("xc-hidden");
            $dfWrapBg.removeClass("xc-hidden");
            $dagView.find(".searchArea, .categoryWrap, .operatorWrap").addClass("xc-disabled");
        } else {
            $dfWrap.removeClass("xc-hidden");
            $dfWrapBg.addClass("xc-hidden");
            $dagView.find(".searchArea, .categoryWrap, .operatorWrap").removeClass("xc-disabled");
            _deselectAllNodes();
        }
        DagTopBar.Instance.setState(activeDagTab);
        _checkNodeValidation();
    }

    function updateOperationTime(isCurrent: boolean = false): void {
        const timeStr: string = getOperationTime();
        let text: string = "";
        if (timeStr != null) {
            let title: string = CommonTxtTstr.LastOperationTime;
            if (isCurrent || activeDag != null && activeDag.getExecutor() != null) {
                title = CommonTxtTstr.OperationTime;
            }
            text = title + ": " + timeStr;
        }
        StatusMessage.updateLocation(true, text); // update operation time
    }

    function getOperationTime(): string {
        if (activeDag == null) {
            return null;
        }
        const time: number = activeDag.getOperationTime();
        if (time === 0) {
            return null;
        } else {
            return xcHelper.getElapsedTimeStr(time);
        }
    }

    export function selectNodes(tabId: string, nodeIds?: DagNodeId[]): void {
        if (!nodeIds) {
            _selectNode(_getAreaByTab(tabId).find(".operator"));
        } else {
            nodeIds.forEach((nodeId) => {
                const $node: JQuery = DagView.getNode(nodeId, tabId);
                _selectNode($node);
            });
        }
    }

    export function deselectNodes(): void {
        const $selected = _getActiveArea().find(".selected");
        $selected.removeClass("selected");
        $selected.find(".selection").remove();
    }

    function _selectNode($node: JQuery): void {
        $node.addClass("selected");
        if ($node.hasClass("operator")) {
            _setSelectedStyle($node);
        }
    }

    function _deselectNode($node) {
        $node.removeClass("selected");
        $node.find(".selection").remove();
    }

    function _deselectAllNodes(): void {
        const $selected = $dfWrap.find(".selected");
        $selected.removeClass("selected");
        $selected.find(".selection").remove();
    }

    function _setSelectedStyle($operators: JQuery): void {
        $operators.each(function() {
            const $operator = $(this);
            if ($operator.find('.selection').length > 0) {
                return;
            }
            const rect = d3.select($operator[0]).insert('rect', ':first-child');
            rect.classed('selection', true);
            rect.attr('x', '-3')
            .attr('y', '-5')
            .attr('width', nodeWidth + 5)
            .attr('height', nodeHeight + 10)
            .attr('fill', 'rgba(150, 225, 255, 0.2)')
            .attr('stroke', 'rgba(0, 188, 255, 0.78)')
            .attr('stroke-width', '1')
            .attr('rx', '16')
            .attr('ry', '43');
        });
    }

    /**
     * DagView.reactivate
     *
     *  // restore/dredraw dataflow dimensions and nodes,
        // add connections separately after so all node elements already exist
        // adds event listeners
     */
    export function reactivate($dfArea?: JQuery, graph?: DagGraph): void {
        $dfArea = $dfArea || _getActiveArea();
        if ($dfArea.hasClass("rendered")) {
            return;
        }
        graph = graph || activeDag;
        const tabId = graph.getTabId();
        if (tabId === activeDag.getTabId()) {
            // when rerendering graph, need to reset activeDag to new graph
            activeDag = graph;
        }
        $dfArea.empty().html(
            '<div class="dataflowAreaWrapper">' +
            '<div class="commentArea"></div>' +
            '<svg class="edgeSvg"></svg>' +
            '<svg class="operatorSvg"></svg>' +
            '</div>'
        );
        const dimensions = graph.getDimensions();
        const scale = graph.getScale();
        const $wrapper: JQuery = $dfArea.find(".dataflowAreaWrapper");
        if (dimensions.width > -1) {
            $wrapper.css("min-height", dimensions.height * scale);
            $wrapper.css("min-width", dimensions.width * scale);
            $wrapper.css("background-size", gridLineSize * scale);
        }
        $wrapper.children().css("transform", "scale(" + scale + ")");

        const nodes: Map<DagNodeId, DagNode> = graph.getAllNodes();

        nodes.forEach((node: DagNode) => {
            _drawNode(node, $dfArea);
            _addProgressTooltipForNode(graph, node, $dfArea);
        });
        nodes.forEach((node: DagNode, nodeId: DagNodeId) => {
            node.getParents().forEach((parentNode, index) => {
                const parentId: DagNodeId = parentNode.getId();
                _drawConnection(parentId, nodeId, index, tabId, node.canHaveMultiParents());
            });
        });

        const comments: Map<CommentNodeId, CommentNode> = graph.getAllComments();

        comments.forEach((commentNode: CommentNode) => {
            DagComment.Instance.drawComment(commentNode, $dfArea);
        });

        _setupGraphEvents(graph);
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
        spliceInfo?,
        identifiers?
    ): XDPromise<void> {
        spliceInfo = spliceInfo || {};
        identifiers = identifiers || {};
        const $dfArea: JQuery = _getAreaByTab(tabId);
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        const graph: DagGraph = dagTab.getGraph();

        dagTab.turnOffSave();
        // need to add back nodes in the reverse order they were deleted
        DagView.deselectNodes();
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;
        const nodes = [];
        let hasLinkOut: boolean = false;
        graph.turnOnBulkStateSwitch();
        for (let i = nodeIds.length - 1; i >= 0; i--) {
            const nodeId: DagNodeId = nodeIds[i];
            let node;
            if (nodeId.startsWith("dag")) {
                node = graph.addBackNode(nodeId, spliceInfo[nodeId]);
                const childrenNodes = node.getChildren();
                childrenNodes.forEach((childNode) => {
                    childNode.setIdentifiers(identifiers[childNode.getId()]);
                });
                if (node instanceof DagNodeDFOut) {
                    hasLinkOut = true;
                }
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
        graph.turnOffBulkStateSwitch();
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

        if (hasLinkOut) {
            _checkLinkInNodeValidation(activeDag);
        }
        dagTab.turnOnSave();
        return dagTab.save();
    }
    /**
    * DagView.dawNodesAndConnections
    * @param nodes
    * @param tabId
    * requires an array of dagNodes that already have parents and children assigned
    */
    export function drawNodesAndConnections(nodes: DagNode[], tabId: string): XDPromise<void> {
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        dagTab.turnOffSave();
        _drawNodesAndConnectionsNoPersist(nodes, tabId);
        dagTab.turnOnSave();
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
        _setGraphDimensions({ x: maxXCoor, y: maxYCoor });

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
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId)
        dagTab.turnOffSave();
        _eraseNodesAndConnectionsNoPersist(nodes, tabId);
        dagTab.turnOnSave();
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
                $dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
                $dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                $dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
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
        const dagTab: DagTab = activeDagTab;
        dagTab.turnOffSave();

        const node: DagNode = activeDag.newNode(nodeInfo);
        _addNodeNoPersist(node);
        if (!MainMenu.isFormOpen()) {
            DagNodeInfoPanel.Instance.show(node);
        }

        dagTab.turnOnSave();
        dagTab.save();
        return node;
    }

    /**
     * DagView.newComment
     */
    export function newComment(
        commentInfo: CommentInfo,
        isFocus?: boolean
    ): XDPromise<void> {
        const dagTab: DagTab = activeDagTab;
        dagTab.turnOffSave();
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
            "dataflowId": dagTab.getId(),
            "commentId": commentNode.getId()
        });
        dagTab.turnOnSave();
        return dagTab.save();
    }

    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    export function removeNodes(nodeIds: DagNodeId[], tabId: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
        tab.turnOffSave();
        const nodeIdsMap = lockedNodeIds[tabId] || {};
        for (let i = 0; i < nodeIds.length; i++) {
            if (nodeIdsMap[nodeIds[i]]) {
                nodeIds.splice(i, 1);
                i--;
            }
        }
        _removeNodesNoPersist(nodeIds, tabId)
        .then((ret) => {
            let promise;
            if (ret == null) {
                tab.turnOnSave();
                promise = PromiseHelper.reject();
            } else {
                if (ret.retinaErrorNodeIds.length) {
                    StatusBox.show("Could not remove some nodes due to optimized dataflow in progress.", $dfWrap);
                }
                if (ret.hasLinkOut) {
                    if (activeDagTab != null && activeDagTab.getId() === tabId) {
                        _checkLinkInNodeValidation(activeDag);
                    }
                }
                tab.turnOnSave();
                promise = tab.save();
            }
            return promise;
        })
        .then(deferred.resolve)
        .then(deferred.reject);

        return deferred.promise();
    }

    /**
     * DagView.copyNodes
     * @param nodeIds
     */
    export function copyNodes(nodeIds: DagNodeId[]): string {
        if (!nodeIds.length) {
            return "";
        }
        return JSON.stringify(createNodeInfos(nodeIds, activeDag, {
            clearState: true,
            includeTitle: false
         }), null, 4);
    }

    /**
     * DagView.cutNodes
     * @param nodeIds
     */
    export function cutNodes(nodeIds: DagNodeId[]): string {
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

        const nodesStr = JSON.stringify(createNodeInfos(nodeIds, activeDag, {
            clearState: true,
            includeTitle: false
        }), null, 4);
        DagView.removeNodes(nodeIds, tabId);
        return nodesStr;
    }

    /**
     * DagView.pasteNodes
     *  finds new position for cloned nodes, adds to dagGraph and UI
     */
    export function pasteNodes(nodeInfos): XDPromise<void> {
        if (!nodeInfos.length) {
            return PromiseHelper.reject();
        }
        const tab: DagTab = activeDagTab;
        if (tab instanceof DagTabPublished) {
            // cannot modify shared dag
            return PromiseHelper.reject();
        }
        const tabId: string = tab.getId();
        tab.turnOffSave();
        const $dfArea: JQuery = _getActiveArea();
        DagView.deselectNodes();

        let minXCoor: number = $dfArea.width();
        let minYCoor: number = $dfArea.height();
        let maxXCoor: number = 0;
        let maxYCoor: number = 0;

        nodeInfos.forEach((nodeInfo) => {
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
        const allNewNodes = [];

        nodeInfos.forEach((nodeInfo) => {
            nodeInfo = xcHelper.deepCopy(nodeInfo);
            nodeInfo.display.x += xDelta;
            nodeInfo.display.y += yDelta;
            if (nodeInfo.hasOwnProperty("text")) {
                const commentInfo = {
                    text: nodeInfo.text,
                    position: nodeInfo.display,
                    dimensions: nodeInfo.dimensions
                };
                const commentNode = activeDag.newComment(commentInfo);
                allNewNodeIds.push(commentNode.getId());
                DagComment.Instance.drawComment(commentNode, $dfArea, true);
                allNewNodes.push(commentNode);
            } else if (nodeInfo.hasOwnProperty("input")) {
                // remove parents so that when creating
                // the new node, we don't provide a parent that doesn't exist or
                // the parentId of the original node
                // since this is a deep copy, nodeInfos still has the parents
                delete nodeInfo.parents;
                const newNode: DagNode = activeDag.newNode(nodeInfo);
                if (newNode.getType() == DagNodeType.Aggregate &&
                    newNode.getState() == DagNodeState.Configured) {
                    newNode.beErrorState(xcHelper.replaceMsg(ErrWRepTStr.AggConflict, {
                        name: newNode.getParam().dest,
                        aggPrefix: ""
                    }));
                }
                const newNodeId: DagNodeId = newNode.getId();
                oldNodeIdMap[nodeInfo.nodeId] = newNodeId;
                newNodeIds.push(newNodeId);
                allNewNodeIds.push(newNodeId);
                allNewNodes.push(newNode);
                _drawNode(newNode, $dfArea, true);
            }
        });
        if (!allNewNodeIds.length) {
            return;
        }

        // restore connection to parents
        const nodesMap: Map<DagNodeId, DagNode> = new Map();
        allNewNodeIds.forEach((newNodeId: DagNodeId, i) => {
            if (newNodeId.startsWith("comment")) {
                return;
            }
            if (nodeInfos[i].parents) {
                const newNode = allNewNodes[i];
                nodeInfos[i].parents.forEach((parentId, j) => {
                    if (parentId == null) {
                        return; // skip empty parent slots
                    }
                    const newParentId = oldNodeIdMap[parentId];
                    activeDag.connect(newParentId, newNodeId, j, false, false);
                    nodesMap.set(newNode.getId(), newNode);
                    _drawConnection(newParentId, newNodeId, j, tabId, newNode.canHaveMultiParents());
                });

                nodesMap.set(newNode.getId(), newNode);
            }
        });
        activeDag.checkNodesState(nodesMap);
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

    export function hasOptimizedNode(nodeIds?: DagNodeId[]): boolean {
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
        spliceIn?: boolean,
        identifiers?: Map<number, string>
    ): XDPromise<void> {
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId)
        if (dagTab instanceof DagTabPublished) {
            return PromiseHelper.reject();
        }

        dagTab.turnOffSave();
        _connectNodesNoPersist(parentNodeId, childNodeId, connectorIndex, tabId, {
            isReconnect: isReconnect,
            spliceIn: spliceIn,
            identifiers: identifiers
        });
        dagTab.turnOnSave();
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
        dagTab.turnOffSave();

        const $edge: JQuery = $dfArea.find('.edge[data-parentnodeid="' +
            parentNodeId +
            '"][data-childnodeid="' +
            childNodeId +
            '"][data-connectorindex="' +
            connectorIndex + '"]');

        // Currently only used by SQL node but can be extended for other nodes
        const childNode = graph.getNode(childNodeId);
        const identifiers = childNode.getIdentifiers();
        const wasSpliced = graph.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, $dfArea, childNodeId, tabId);
        Log.add(SQLTStr.DisconnectOperations, {
            "operation": SQLOps.DisconnectOperations,
            "dataflowId": tabId,
            "parentNodeId": parentNodeId,
            "childNodeId": childNodeId,
            "connectorIndex": connectorIndex,
            "wasSpliced": wasSpliced,
            "identifiers": identifiers
        });

        dagTab.turnOnSave();
        return dagTab.save();
    }

    // function _disconnectNodesNoPersist(
    //     parentNodeId: DagNodeId,
    //     childNodeId: DagNodeId,
    //     connectorIndex: number,
    //     tabId: string,
    //     isNoLog: boolean
    // ): LogParam {
    //     const $dfArea = DagView.getAreaByTab(tabId);
    //     const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
    //     const $edge: JQuery = $dfArea.find('.edge[data-parentnodeid="' +
    //         parentNodeId +
    //         '"][data-childnodeid="' +
    //         childNodeId +
    //         '"][data-connectorindex="' +
    //         connectorIndex + '"]');
    //     graph.disconnect(parentNodeId, childNodeId, connectorIndex);
    //     _removeConnection($edge, $dfArea, childNodeId, tabId);
    //     const logParam: LogParam = {
    //         title: SQLTStr.DisconnectOperations,
    //         options: {
    //             "operation": SQLOps.DisconnectOperations,
    //             "dataflowId": tabId,
    //             "parentNodeId": parentNodeId,
    //             "childNodeId": childNodeId,
    //             "connectorIndex": connectorIndex
    //         }
    //     };
    //     if (!isNoLog) {
    //         Log.add(logParam.title, Object.assign({}, logParam.options));
    //     }

    //     return logParam;
    // }

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
        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        if (dagTab instanceof DagTabPublished) {
            return;
        }
        dagTab.turnOffSave();
        _moveNodesNoPersist(tabId, nodeInfos, graphDimensions);
        dagTab.turnOnSave();
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
        maxY: number
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
                        x: ((maxDepth - nodes[j].depth) * horzNodeSpacing) + (gridSpacing * 2),
                        y: (nodes[j].width * vertNodeSpacing) + (gridSpacing * 2)
                    }
                });
            }
            startingWidth = (maxWidth + 1);
        }
        const graphHeight = vertNodeSpacing * (startingWidth - 1) + gridSpacing;
        const graphWidth = horzNodeSpacing * overallMaxDepth + gridSpacing;
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
        input?: object,
        x?: number,
        y?: number,
    ): DagNode {
        let parentNode: DagNode;
        let nextAvailablePosition: Coordinate;
        let connectToParent: boolean = false;
        const node: DagNode = DagView.newNode({
            type: newType,
            subType: subType,
            input: input
        });
        const graph = activeDag;
        const tabId = activeDag.getTabId();
        const dagTab: DagTab = activeDagTab;
        dagTab.turnOffSave();

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
            x = x || (position.x + horzNodeSpacing);
            y = y || (position.y + vertNodeSpacing * parentNode.getChildren().length);
        } else {
            const scale = graph.getScale();
            const $dfArea: JQuery = _getActiveArea();
            x = x || Math.round(($dfArea.scrollLeft() + ($dfArea.width() / 2)) /
                scale / gridSpacing) * gridSpacing;
            y = y || Math.round(($dfArea.scrollTop() + ($dfArea.height() / 2)) /
                scale / gridSpacing) * gridSpacing;
        }
        nextAvailablePosition = getNextAvailablePosition(graph, x, y);

        DagView.moveNodes(tabId, [{
            type: "dagNode", id: node.getId(), position: {
                x: nextAvailablePosition.x,
                y: nextAvailablePosition.y
            }
        }]);

        if (connectToParent) {
            DagView.connectNodes(parentNodeId, node.getId(), 0, tabId);
        }

        dagTab.turnOnSave();
        dagTab.save();
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
     * DagView.viewResult
     * @param dagNodeId
     */
    export function viewResult(dagNode: DagNode, tabId?: string): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            if (dagNode instanceof DagNodeJupyter) {
                dagNode.showJupyterNotebook();
                deferred.resolve();
            } else if (dagNode instanceof DagNodeAggregate) {
                _viewAgg(dagNode);
                deferred.resolve();
            } else {
                // all other nodes
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

    export function viewOptimizedDataflow(dagNode: DagNode, tabId: string): XDPromise<void> {
        if (!dagNode || !(dagNode instanceof DagNodeOutOptimizable)) {
            return PromiseHelper.reject("Invalid node");
        }
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        const retinaId = gRetinaPrefix + tabId + "_" + dagNode.getId();
        if (DagTabManager.Instance.getTabById(retinaId)) {
            DagTabManager.Instance.switchTab(retinaId);
            deferred.resolve();
        } else {
            const tabName = DagTabManager.Instance.getTabById(tabId).getName();
            let dfOutName: string = dagNode instanceof DagNodeDFOut ?
                            dagNode.getParam().name : "export";
            let newTabName: string = tabName + " " + dfOutName + " optimized";
            const retinaTab = new DagTabOptimized({id: retinaId, name: newTabName});
            DagTabManager.Instance.loadTab(retinaTab)
            .then(() => {
                DagTabManager.Instance.switchTab(retinaId);
                deferred.resolve();
            })
            .fail((e) => {
                Alert.error("Optimized Dataflow Unavailable", e);
                deferred.reject(e);
            });
        }

        return deferred.promise();
    }

    function _viewAgg(dagNode: DagNodeAggregate): void {
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
        const $dataflowArea: JQuery = _getActiveArea();

        _canRun(activeDagTab)
            .then(() => {
                return graph.execute(nodeIds, optimized);
            })
            .then(function () {
                if (UserSettings.getPref("dfAutoPreview") === true &&
                    nodeIds != null &&
                    nodeIds.length === 1 &&
                    !graph.getNode(nodeIds[0]).isOutNode()
                ) {
                    const node: DagNode = graph.getNode(nodeIds[0]);
                    if (node.getState() === DagNodeState.Complete) {
                        DagView.viewResult(node, currTabId);
                    }
                }
                deferred.resolve();
            })
            .fail(function (error) {
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
            });

        return deferred.promise();
    }

    function _canRun(dagTab: DagTab): XDPromise<void> {
        if (dagTab instanceof DagTabPublished) {
            const deferred: XDDeferred<void> = PromiseHelper.deferred();
            DagSharedActionService.Instance.checkExecuteStatus(dagTab.getId())
            .then((isExecuting) => {
                if (isExecuting) {
                    deferred.reject(DFTStr.InExecution);
                } else {
                    deferred.resolve();
                }
            })
            .fail(deferred.reject);

            return deferred.promise();
        } else {
            return PromiseHelper.resolve();
        }
    }

    /**
     *
     * @param nodeIds
     * if no nodeIds passed, will reset all
     */
    export function reset(nodeIds?: DagNodeId[]): void {
        const msg: string = nodeIds ? DagTStr.ResetMsg : DagTStr.ResetAllMsg;
        const dagTab: DagTab = activeDagTab;
        const dag: DagGraph = activeDag;
        Alert.show({
            title: DagTStr.Reset,
            msg: msg,
            onConfirm: () => {
                dagTab.turnOffSave();
                dag.reset(nodeIds);
                dagTab.turnOnSave();
                dagTab.save();
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
        const dagTab: DagTab = activeDagTab;
        const graph: DagGraph = activeDag;
        const node: DagNode = graph.getNode(nodeId);
        const oldText: string = node.getDescription();
        dagTab.turnOffSave();

        node.setDescription(text);
        // event will trigger a description UI

        Log.add(SQLTStr.EditDescription, {
            "operation": SQLOps.EditDescription,
            "dataflowId": graph.getTabId(),
            "oldDescription": oldText,
            "newDescription": text,
            "nodeId": nodeId
        });
        dagTab.turnOnSave();
        return dagTab.save();
    }

    /**
     *
     * @param nodeId
     * @param title
     */
    export function editNodeTitle(
        nodeId: DagNodeId,
        tabId: string,
        title: string
    ): XDPromise<void> {
        const dagTab = DagTabManager.Instance.getTabById(tabId);
        const graph = dagTab.getGraph();
        const node = graph.getNode(nodeId);
        const oldTitle = node.getTitle();
        const $node = DagView.getNode(nodeId, tabId);
        dagTab.turnOffSave();

        node.setTitle(title, true);
        _drawTitleText($node, node);

        // XXX TODO: update paramTitle's height
        Log.add(SQLTStr.EditNodeTitle, {
            "operation": SQLOps.EditNodeTitle,
            "dataflowId": tabId,
            "oldTitle": oldTitle,
            "newTitle": title,
            "nodeId": nodeId
        });

        dagTab.turnOnSave();
        return dagTab.save();
    }

    /**
     * DagView.cancel
     * // cancel entire run or execution
     */
    export function cancel() {
        activeDag.cancelExecute();
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
        if ((connectionInfo.out.length + connectionInfo.endSets.out.size) > 1) {
            // We only support one output for now
            const errNodeId = connectionInfo.out.length > 0
                ? connectionInfo.out[0].parentId
                : Array.from(connectionInfo.endSets.out)[0];
            StatusBox.show(DagTStr.CustomOpTooManyOutput, getNode(errNodeId));
            return PromiseHelper.reject('too many output');
        }
        const excludeNodeTypes = new Set([DagNodeType.DFIn, DagNodeType.DFOut]);
        for (const nodeId of nodeIds) {
            // Cannot wrap these types of nodes inside a custom operator
            if (excludeNodeTypes.has(activeDag.getNode(nodeId).getType()) ||
                activeDag.getNode(nodeId) instanceof DagNodeOutOptimizable) {
                StatusBox.show(DagTStr.CustomOpTypeNotSupport, getNode(nodeId));
                return PromiseHelper.reject('Type not support');
            }
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
            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            _removeNodesNoPersist(nodeIds, tabId,
                { isNoLog: true, isSwitchState: false }
            )
            .then((ret) => {
                const removeLogParam = ret.logParam;
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
            })
            .then(() => {
                deferred.resolve();
            })
            .fail(deferred.reject);

            return deferred.promise();
        } catch (e) {
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
        const dagTab: DagTab = activeDagTab;

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
            .then(() => dagTab.save())
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
    export function inspectSQLNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = activeDag.getNode(nodeId);
        if (dagNode == null || !(dagNode instanceof DagNodeSQL)) {
            return PromiseHelper.reject();
        }
        const self = this;
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        let subGraph = dagNode.getSubGraph();
        let promise = PromiseHelper.resolve();

        if (!subGraph) {
            const params: DagNodeSQLInputStruct = dagNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const paramterizedSQL = xcHelper.replaceMsg(params.sqlQueryStr,
                DagParamManager.Instance.getParamMap(), true);
            const queryId = xcHelper.randName("sql", 8);
            promise = dagNode.compileSQL(paramterizedSQL, queryId);
        }
        promise
            .then(function () {
                DagTabManager.Instance.newSQLTab(dagNode);
                self.autoAlign(activeDag.getTabId());
                deferred.resolve();
            })
            .fail(deferred.reject);
        return deferred.promise();
    }

    /**
     * Expand the SQL node into a sub graph in place for editing purpose
     * @param nodeId
     */
    export function expandSQLNode(nodeId: DagNodeId): XDPromise<void> {
        const dagNode = activeDag.getNode(nodeId);
        if (dagNode == null) {
            return PromiseHelper.reject(`${nodeId} not exist`);
        }
        if (dagNode instanceof DagNodeSQL) {
            DagView.expandSQLNodeInTab(dagNode, activeDagTab);
        } else {
            return PromiseHelper.reject(`${nodeId} is not a SQL operator`);
        }
    }

    /**
     * DagView.expandSQLNodeInTab
     */
    export function expandSQLNodeInTab(
        dagNode: DagNodeSQL,
        dagTab: DagTab
    ): XDPromise<void> {
        let promise = PromiseHelper.resolve();
        let subGraph = dagNode.getSubGraph();
        if (!subGraph) {
            const params: DagNodeSQLInputStruct = dagNode.getParam();
            if (!params.sqlQueryStr) {
                return PromiseHelper.reject(SQLErrTStr.NeedConfiguration);
            }
            const paramterizedSQL = xcHelper.replaceMsg(params.sqlQueryStr,
                DagParamManager.Instance.getParamMap(), true);
            const queryId = xcHelper.randName("sql", 8);
            promise = dagNode.compileSQL(paramterizedSQL, queryId);
        }
        return promise
            .then(function () {
                return _expandSubgraphNode({
                    dagNode: dagNode,
                    tabId: dagTab.getId(),
                    logTitle: SQLTStr.ExpandSQLOperation,
                    getInputParent: (node) => dagNode.getInputParent(node),
                    isInputNode: (node) => (node instanceof DagNodeSQLSubInput),
                    isOutputNode: (node) => (node instanceof DagNodeSQLSubOutput),
                    preExpand: () => {
                    },
                    isPreAutoAlign: true
                });
            });
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
    export function zoom(isZoomIn: boolean, newScale?: number) {
        const prevScale: number = activeDag.getScale();
        let scaleIndex: number = zoomLevels.indexOf(prevScale);
        let scale: number;
        if (scaleIndex == -1 && newScale == null) {
            for (let i = 0; i < zoomLevels.length; i++) {
                if (zoomLevels[i] > prevScale) {
                    if (isZoomIn) {
                        scaleIndex = i
                    } else {
                        scaleIndex = i-1;
                    }
                    break;
                }
            }
        }
        else if (isZoomIn) {
            scaleIndex++;
        } else {
            scaleIndex--;
        }

        if (newScale != null) {
            scale = newScale;
        }
        else if (scaleIndex < 0 || scaleIndex >= zoomLevels.length) {
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
        activeDag.getAllNodes().forEach((node) => {
            const nodeInfo = {
                position: node.getPosition()
            };
            _repositionRunStats($dfArea, nodeInfo, node.getId());
        });
    }

    /**
     * Check if modification to graph/nodes should be disabled, Ex. it's showing the subGraph of a customNode
     */
    export function isDisableActions(): boolean {
        const activeTab = getActiveTab();
        return (activeTab instanceof DagTabCustom ||
                activeTab instanceof DagTabSQL ||
                activeTab instanceof DagTabOptimized ||
                activeTab instanceof DagTabPublished);
    }

    export function isViewOnly(): boolean {
        return _getActiveArea().hasClass("viewOnly");
    }

    export function isLocked($dfArea): boolean {
        return $dfArea.hasClass("locked");
    }

    export function toggleProgressTips(show?: boolean): void {
        if (show) {
            $("#dagView").addClass("showProgressTips");
        } else {
            $("#dagView").removeClass("showProgressTips");
        }
    }

    export function toogleConfigInfo(show?: boolean): void {
        if (show) {
            $("#dagView").addClass("showConfigInfo");
        } else {
            $("#dagView").removeClass("showConfigInfo");
        }
        DagSearch.Instance.update();
    }

    /**
     * Cleanup job after a tab is closed
     * @param graph
     * @description
     * #1 Remove all event handlers listening on the DagGraph associated with the closed tab
     * #2 ...
     */
    export function cleanupClosedTab(graph: DagGraph) {
        try {
            if (graph != null) {
                graph.events.off(`.${dagEventNamespace}`);
            }
        } catch(e) {
            console.error(e);
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
        isPreAutoAlign?: boolean,
    }): XDPromise<void> {
        const {
            dagNode, tabId, logTitle, getInputParent, isInputNode, isOutputNode,
            preExpand = () => { }, isPreAutoAlign = false,
        } = args;

        let dagTab = DagTabManager.Instance.getTabById(tabId);
        if (dagTab == null) {
            return PromiseHelper.reject(`DagTab(${tabId}) not exist`);
        }
        const graphExpandTo = dagTab.getGraph();
        try {
            const $dfArea = _getAreaByTab(tabId);
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
            const dagInfoList = createNodeInfos(dagIds, subGraph, {includeStats: true});
            const oldNodeIdMap = {};
            const newAggregates: AggregateInfo[] = [];
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
                if (node.getType() == DagNodeType.Aggregate) {
                    // Add any aggregates we created
                    let aggParam = node.getParam();
                    if (aggParam.dest != "" && !DagAggManager.Instance.hasAggregate(aggParam.dest)) {
                        let agg: string = aggParam.dest;
                        newAggregates.push({
                            value: null,
                            dagName: agg,
                            aggName: agg,
                            tableId: null,
                            backColName: null,
                            op: null,
                            node: node.getId(),
                            graph: graphExpandTo.getTabId()
                        });
                    }
                }
                const addLogParam = _addNodeNoPersist(node, {
                    isNoLog: true,
                    tabId: tabId
                });
                expandLogParam.options.actions.push(addLogParam.options);
                _addProgressTooltipForNode(graphExpandTo, node, $dfArea);
            });

            const deferred: XDDeferred<void> = PromiseHelper.deferred();

            DagAggManager.Instance.bulkAdd(newAggregates);
            // remove the container node from graph
            _removeNodesNoPersist(
                [dagNode.getId()],
                tabId,
                { isNoLog: true, isSwitchState: false })
            .then((ret) => {
                const removeLogParam = ret.logParam;
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
            })
            .then(deferred.resolve)
            .fail(deferred.reject);
            return deferred.promise();
        } catch (e) {
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
                // move runStats if it has one
                _repositionRunStats($dfArea, nodeInfo, nodeId);
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
    ): XDPromise<{
        logParam: LogParam,
        retinaErrorNodeIds: string[],
        hasLinkOut: boolean
    }> {
        const { isSwitchState = true, isNoLog = false } = options || {};
        const deferred: XDDeferred<any> = PromiseHelper.deferred();
        if (!nodeIds.length) {
            return PromiseHelper.deferred();
        }
        const $dfArea = DagView.getAreaByTab(tabId);
        const graph = DagTabManager.Instance.getTabById(tabId).getGraph();
        let aggregates: string[] = [];
        const dagNodeIds: DagNodeId[] = [];
        const commentNodeIds: CommentNodeId[] = [];
        const allIdentifiers = {};
        const spliceInfos = {};
        const removedNodeIds: string[] = [];
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                dagNodeIds.push(nodeId);
            } else {
                commentNodeIds.push(nodeId);
            }
        });

        // XXX TODO: this remove retina is async
        // so may slow down the remove operation,
        // need to improve
        graph.removeRetinas(dagNodeIds)
        .always((ret) => {
            let hasLinkOut: boolean = false;
            // XXX TODO: check the slowness and fix the performance
            graph.turnOnBulkStateSwitch();
            nodeIds.forEach((nodeId) => {
                if (ret.errorNodeIds.indexOf(nodeId) > -1) {
                    return;
                }
                if (nodeId.startsWith("dag")) {
                    // Remove tabs for custom OP
                    const dagNode = graph.getNode(nodeId);
                    if (dagNode instanceof DagNodeCustom ||
                        dagNode instanceof DagNodeSQL
                    ) {
                        DagTabManager.Instance.removeTabByNode(dagNode);
                    } else if (dagNode instanceof DagNodeAggregate) {
                        let input: DagNodeAggregateInputStruct = dagNode.getParam();
                        if (input.dest != null) {
                            aggregates.push(input.dest);
                        }
                    }
                    dagNodeIds.push(nodeId);
                    const childrenNodes = dagNode.getChildren();
                    childrenNodes.forEach((childNode) => {
                        allIdentifiers[childNode.getId()] = childNode.getIdentifiers();
                    });
                    const spliceInfo = graph.removeNode(nodeId, isSwitchState);
                    const $node = DagView.getNode(nodeId, tabId);
                    if ($node.data("type") === DagNodeType.DFOut) {
                        hasLinkOut = true;
                    }
                    $node.remove();
                    $dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
                    $dfArea.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
                    $dfArea.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function () {
                        const childNodeId = $(this).attr("data-childnodeid");
                        _removeConnection($(this), $dfArea, childNodeId, tabId);
                    });
                    spliceInfos[nodeId] = spliceInfo;
                    if (DagNodeInfoPanel.Instance.getActiveNode() &&
                        DagNodeInfoPanel.Instance.getActiveNode().getId() === nodeId) {
                        DagNodeInfoPanel.Instance.hide();
                    }
                } else {
                    graph.removeComment(nodeId);
                    DagComment.Instance.removeComment(nodeId);
                }
                removedNodeIds.push(nodeId);
            });
            graph.turnOffBulkStateSwitch();
            DagAggManager.Instance.bulkNodeRemoval(aggregates);

            const logParam: LogParam = {
                title: SQLTStr.RemoveOperations,
                options: {
                    "operation": SQLOps.RemoveOperations,
                    "dataflowId": tabId,
                    "nodeIds": removedNodeIds,
                    "spliceInfo": spliceInfos,
                    "identifiers": allIdentifiers
                }
            };
            if (!isNoLog) {
                Log.add(logParam.title, Object.assign({}, logParam.options));
            }
            deferred.resolve({
                logParam: logParam,
                retinaErrorNodeIds: ret.errorNodeIds,
                hasLinkOut: hasLinkOut
            });
        });
        return deferred.promise();
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
            isNoLog?: boolean,
            identifiers?: Map<number, string>
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
        const childNode = graph.getNode(childNodeId);
        _drawConnection(parentNodeId, childNodeId, connectorIndex, tabId, childNode.canHaveMultiParents(), true);
        childNode.setIdentifiers(options.identifiers);

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
        expandNodeIds: (DagNodeId | CommentNodeId)[],
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

    function _nodeProgressTemplate(
        nodeId: DagNodeId,
        nodeX: number,
        nodeY: number,
        skewInfos: any[],
        times: number[]
    ): HTML {
        const tooltipMargin = 5;
        const tooltipPadding = 5;
        const rowHeight = 10;
        const scale = activeDag ? activeDag.getScale() : 1;
        const x = scale * (nodeX - 10);
        const y = Math.max(1, (scale * nodeY) - (rowHeight * 2 + tooltipPadding + tooltipMargin));
        let totalTime: number;
        if (times.length) {
            totalTime = times.reduce((total, num) => {
                return total + num;
            });
        } else {
            totalTime = 0;
        }

        const totalTimeStr = xcHelper.getElapsedTimeStr(totalTime);

        let hasSkewValue: boolean = false;
        let maxSkew: number | string = 0;
        skewInfos.forEach((skewInfo) => {
            const skew: number = skewInfo.value;
            if (!(skew == null || isNaN(skew))) {
                hasSkewValue = true;
                maxSkew = Math.max(skew, <number>maxSkew);
            }
        });
        if (!hasSkewValue) {
            maxSkew = "N/A";
        } else {
            maxSkew = String(maxSkew);
        }
        let skewColor: string = getSkewColor(maxSkew);
        let colorStyle = "";
        if (skewColor) {
            colorStyle = "color:" + skewColor;
        }
        let skewRows: string = "N/A";
        if (skewInfos.length) {
            skewRows = xcHelper.numToStr(skewInfos[skewInfos.length - 1].totalRows);
        }

        let html = `<div data-id="${nodeId}" class="runStats dagTableTip" style="left:${x}px;top:${y}px;">`;
        html += `<table>
                 <thead>
                    <th>Rows</th>
                    <th>Time</th>
                    <th>Skew</th>
                </thead>
                <tbody>
                    <tr>
                        <td>${skewRows}</td>
                        <td>${totalTimeStr}</td>
                        <td><span class="value" style="${colorStyle}">${maxSkew}</span></td>
                    </tr>
                </tbody>
                </table>
            </div>`;

        return html;
    }

    /**
     * DagView.newTab
     */
    export function newTab(): void {
        if (XVM.isSQLMode()) {
            SQLFuncSettingModal.Instance.show((numInput) => {
                _newSQLFunc(numInput);
            });
        } else {
            DagTabManager.Instance.newTab();
        }
    }

    function _newSQLFunc(numInput) {
        DagTabManager.Instance.newTab();
        // add input
        const base: number = 40;
        const inc: number = 80;
        for (let i = 0; i < numInput; i++) {
            let x: number = base;
            let y: number = base + i * inc;
            DagView.autoAddNode(DagNodeType.SQLFuncIn, null, null, null, x, y);
        }

        // add output
        const numIncSpace = 10;
        let x = base + inc * numIncSpace;
        let y = base + inc * (numInput - 1) / 2;
        DagView.autoAddNode(DagNodeType.SQLFuncOut, null, null, null, x, y);
    }

    function _addProgressTooltipForNode(
        graph: DagGraph,
        node: DagNode,
        $dfArea
    ): void {
        try {
            const nodeStats = node.getIndividualStats();
            if (nodeStats.length) {
                const skewInfos = [];
                const times: number[] = [];
                nodeStats.forEach((nodeStat) => {
                    const skewInfo = _getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                    skewInfos.push(skewInfo);
                    times.push(nodeStat.elapsedTime);
                });
                _addProgressTooltip(graph, node, $dfArea, skewInfos, times);
                const nodeInfo = { position: node.getPosition() };
                _repositionRunStats($dfArea, nodeInfo, node.getId());
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _addProgressTooltip(
        graph: DagGraph,
        node: DagNode,
        $dfArea: JQuery,
        skewInfos,
        times: number[]
    ): void {
        if (node instanceof DagNodeSQLSubInput ||
            node instanceof DagNodeSQLSubOutput ||
            node instanceof DagNodeCustomInput ||
            node instanceof DagNodeCustomOutput
        ) {
            return;
        }
        const pos = node.getPosition();
        let tip: HTML = _nodeProgressTemplate(node.getId(), pos.x, pos.y, skewInfos, times);
        const $tip = $(tip)
        $dfArea.append($tip);
        const width = Math.max($tip[0].getBoundingClientRect().width, 95);
        const nodeCenter = graph.getScale() * (pos.x + (DagView.nodeWidth / 2));
        $tip.css("left", nodeCenter - (width / 2));
    }

    function _repositionRunStats($dfArea, nodeInfo, nodeId: DagNodeId): void {
        const $runStats = $dfArea.find('.runStats[data-id="' + nodeId + '"]');
        if ($runStats.length) {
            $runStats.addClass("visible"); // in case we can't get the dimensions
            // because user is hiding tips by default
            const infoRect = $runStats[0].getBoundingClientRect();
            const rectWidth = Math.max(infoRect.width, 95); // width can be 0 if tab is not visible
            const rectHeight = Math.max(infoRect.height, 25);
            const scale = activeDag.getScale();
            const nodeCenter = nodeInfo.position.x + 1 + (DagView.nodeWidth / 2);
            $runStats.css({
                left: scale * nodeCenter - (rectWidth / 2),
                top: Math.max(1, (scale * nodeInfo.position.y) - (rectHeight + 5))
            });
            $runStats.removeClass("visible");
        }
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
                } else {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    if (!DagView.getNode(parentNodeId, null, $dfArea).length) {
                        // parent could be removed and this could be a second
                        // connection to it
                        return true;
                    }
                    $curEdge.remove();
                    _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, index, svg);
                }
            });
        } else if (graph.getNode(childNodeId).getNumParent() === 0) {
            $childConnector.removeClass("hasConnection")
                .addClass("noConnection");
        }
    }


    function _addEventListeners(): void {
        let mainAreaHeight;
        let $tableArea;
        let $parent;
        $dfWrap.resizable({
            handles: "n",
            containment: 'parent',
            minHeight: 40,
            start: function () {
                $parent = $dfWrap.parent();
                $parent.addClass("resizing");
                mainAreaHeight = $parent.height();
                $tableArea = $("#dagViewTableArea");
            },
            resize: function (_event, ui) {
                let pct = ui.size.height / mainAreaHeight;
                if (ui.position.top <= 100) {
                    // ui.position.top = 100;
                    pct = (mainAreaHeight - 100) / mainAreaHeight;
                    $dfWrap.height(mainAreaHeight - 100);
                    $dfWrap.css("top", 100);
                }

                $tableArea.height(100 * (1 - pct) + "%");
            },
            stop: function (_event, ui) {
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
            DagView.newTab();
        });

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main, .comment", function (event) {
            const $opMain = $(this);
            let $operator = $opMain.closest(".operator");
            let isDagNode = true;
            if (!$operator.length) {
                $operator = $opMain;
                isDagNode = false;
            }

            // if not shift clicking, deselect other nodes
            // if shiftx clicking, and this is selected, then deselect it
            // but don't allow dragging on deselected node
            if (!$operator.hasClass("selected") && !event.shiftKey) {
                DagView.deselectNodes();
            } else if ($operator.hasClass("selected") && event.shiftKey) {
                _deselectNode($operator);
                return;
            }
            _selectNode($operator);

            const nodeId: DagNodeId = $operator.data("nodeid");
            if (isDagNode && !MainMenu.isFormOpen()) {
                try {
                    const node: DagNode = activeDag.getNode(nodeId);
                    DagNodeInfoPanel.Instance.show(node);
                } catch (e) {
                    console.error(e);
                }
            }

            if (event.which !== 1) {
                return;
            }
            if ($(event.target).closest(".ui-resizable-handle").length ||
                $(event.target).is("textarea")) {
                if (!event.shiftKey) {
                    DagView.deselectNodes();
                    _selectNode($operator);
                }
                return;
            }
            if (activeDagTab instanceof DagTabPublished) {
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
                padding: gridSpacing,
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
                            _deselectAllNodes();
                            _selectNode($operator);
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
            if (activeDagTab instanceof DagTabPublished) {
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
                    $childNode.find('.connector.in').each((_index, elem) => {
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
            if (activeDagTab instanceof DagTabPublished) {
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
        $dfWrap.on("mousedown", function (event) {
            if (event.which !== 1 || activeDagTab == null) {
                return;
            }
            let $target = $(event.target);
            $dfArea = _getActiveArea();

            if ($target.closest(".dataflowAreaWrapper").length &&
                !$target.closest(".operator").length &&
                !$target.closest(".selection").length &&
                !$target.closest(".comment").length &&
                !$target.closest(".editableNodeTitle").length &&
                !$target.closest(".ui-resizable-handle").length) {
                new RectSelection(event.pageX, event.pageY, {
                    "id": "dataflow-rectSelection",
                    "$container": $dfArea.find(".dataflowAreaWrapper"),
                    "$scrollContainer": $dfArea,
                    "onStart": function () {
                        $dfArea.addClass("drawing");
                        $els = $dfArea.find(".operator");
                        $els = $els.add($dfArea.find(".comment"));
                        _deselectNode($els);
                    },
                    "onDraw": _drawRect,
                    "onEnd": _endDrawRect
                });
            } else if ($target.closest(".operator").length) {
                const $operator = $target.closest(".operator");
                if (!$operator.hasClass("selected")) {
                    _deselectAllNodes();
                    _selectNode($operator);
                    const nodeId: DagNodeId = $operator.data("nodeid");
                    if (!MainMenu.isFormOpen()) {
                        const node: DagNode = activeDag.getNode(nodeId);
                        DagNodeInfoPanel.Instance.show(node);
                    }
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

        $dfWrap.on("click", ".paramTitle", function () {
            if (activeDagTab == null || activeDag == null) {
                return; // error case
            }
            if (activeDagTab instanceof DagTabOptimized) {
                return; // invalid case
            }
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
                DagView.deselectNodes();
                DagNodeInfoPanel.Instance.hide();
            } else {
                $selectedEls.each(function () {
                    const $node = $(this);
                    $node.removeClass("selecting");
                    _selectNode($node);
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
        if (activeDag == null) {
            return;
        }
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
                _drawConnection(parentNode.getId(), nodeId, index, tabId, node.canHaveMultiParents());
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
                        _drawConnection(nodeId, childNode.getId(), index, tabId, childNode.canHaveMultiParents());
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
        let aggs: string[] = node.getAggregates();
        if (aggs.length) {
            addAggregates($node, aggs);
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
            _selectNode($node);
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

        // Update connector UI according to the number of I/O ports
        if (node instanceof DagNodeCustom) {
            const { input, output } = node.getNumIOPorts();
            _updateConnectorIn(node.getId(), input);
            _updateConnectorOut(node.getId(), output);

        }

        return $node;
    }

    function _updateTitleForNodes(nodes: DagNode[], tabId: string): void {
        nodes.forEach((node) => {
            const nodeId = node.getId();
            const $node = DagView.getNode(nodeId, tabId);
            _drawTitleText($node, node);
        });
    }

    function _drawTitleText($node: JQuery, node: DagNode): void {
        const g = d3.select($node.get(0));
        // draw node title
        let title: string = node.getTitle();
        if (title === "") {
            // if no title, use blank space so there's clickable width
            title = " ".repeat(20);
        }
        const titleLines: string[] = title.split("\n");
        const titleHeight: number = nodeHeight + 14;
        g.select(".nodeTitle").remove();

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
        g.select(".paramTitle").remove();
        const paramHintObj: { hint: string, fullHint: string } = node.getParamHint();
        const paramHint = paramHintObj.hint;
        const fullParamHint = paramHintObj.fullHint;
        const parmLines: string[] = paramHint.split("\n");
        const paramHeight: number = titleHeight + titleLines.length * titleLineHeight;
        const paramTextSvg: d3 = g.append("text")
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
        xcTooltip.add(<any>paramTextSvg, { title: fullParamHint, placement: "bottom auto" });
    }

    function _updateConnectorIn(nodeId: DagNodeId, numInputs: number) {
        const g = d3.select(getNode(nodeId)[0]);
        DagCategoryBar.Instance.updateNodeConnectorIn(numInputs, g);
    }

    function _updateConnectorOut(nodeId: DagNodeId, numberOutputs: number) {
        const g = d3.select(getNode(nodeId)[0]);
        DagCategoryBar.Instance.updateNodeConnectorOut(numberOutputs, g);
    }

    function _drawConnection(
        parentNodeId: DagNodeId,
        childNodeId: DagNodeId,
        connectorIndex: number,
        tabId: string,
        isMultiParent: boolean, // if childNode can have multiple (> 2) parents
        newConnection?: boolean
    ): void {
        const $dfArea = DagView.getAreaByTab(tabId);
        const $childNode: JQuery = DagView.getNode(childNodeId, null, $dfArea);
        const $childConnector: JQuery = _getChildConnector($childNode, connectorIndex);
        $childConnector.removeClass("noConnection")
            .addClass("hasConnection");

        const svg: d3 = d3.select('#dagView .dataflowArea[data-id="' + tabId + '"] .edgeSvg');

        if (isMultiParent) {
            // if re-adding an edge from a multichildnode then increment all
            // the edges that have a greater or equal index than the removed one
            // due to splice action on children array
            $dfArea.find('.edge[data-childnodeid="' + childNodeId + '"]').each(function () {
                const $curEdge: JQuery = $(this);
                const index: number = parseInt($curEdge.attr('data-connectorindex'));
                if (index >= connectorIndex) {
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, index + 1, svg);
                } else if (newConnection) {
                    // only need to readjust if doing a new connection, rather
                    // than restoring connections
                    const parentNodeId = $curEdge.attr("data-parentnodeid");
                    $curEdge.remove();
                    _drawLineBetweenNodes(tabId, parentNodeId, childNodeId, index, svg);
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
            numParents = childNode.getNumParent();
            isMulti = true;
        }

        const parentCoors: Coordinate = {
            x: parentNode.getPosition().x + nodeWidth,
            y: parentNode.getPosition().y + (nodeHeight / 2)
        };

        const childCoors: Coordinate = {
            x: childNode.getPosition().x,
            y: childNode.getPosition().y + 2 +
                ((nodeHeight - 4) / (numParents + 1) * (1 + numConnections))
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

    function _updateNodeState(nodeInfo: {
        id: DagNodeId,
        node: DagNode,
        tabId: string,
        oldState: DagNodeState,
        state: DagNodeState
    }): void {
        const nodeId: DagNodeId = nodeInfo.id;
        const $node: JQuery = DagView.getNode(nodeId, nodeInfo.tabId);
        for (let i in DagNodeState) {
            $node.removeClass("state-" + DagNodeState[i]);
        }
        $node.addClass("state-" + nodeInfo.state);
        if (nodeInfo.oldState === DagNodeState.Error ||
            nodeInfo.state === DagNodeState.Error
        ) {
            // when switch from error state to other state
            _setTooltip($node, nodeInfo.node);
        }

        if (nodeInfo.state !== DagNodeState.Complete &&
            !(nodeInfo.state === DagNodeState.Error &&
                nodeInfo.oldState === DagNodeState.Running)) {
            // don't remove tooltip upon completion or if the node went from
            // running to an errored state
            _getAreaByTab(nodeInfo.tabId).find('.runStats[data-id="' + nodeId + '"]').remove();
        }
        DagNodeInfoPanel.Instance.update(nodeId, "status");
    }

    function _lockUnlockHelper(info: {
        tabId: string,
        nodeIds: DagNodeId[],
        lock: boolean
    }): void {
        const tabId: string = info.tabId;
        const $dfArea = _getAreaByTab(tabId);
        if (info.lock) {
            $dfArea.addClass("locked");
            info.nodeIds.forEach((nodeId) => {
                DagView.lockNode(nodeId, tabId);
            });
        } else {
            $dfArea.removeClass("locked");
            info.nodeIds.forEach((nodeId) => {
                DagView.unlockNode(nodeId, tabId);
            });
        }
    }

    function _autoExecute(dagNode: DagNode): void {
        if (UserSettings.getPref("dfAutoExecute") === true) {
            if (dagNode.getState() == DagNodeState.Configured) {
                const optimized: boolean = (dagNode instanceof DagNodeOutOptimizable &&
                                           dagNode.isOptimized());
                DagView.run([dagNode.getId()], optimized);
            }
        }
    }

    function _registerGraphEvent(
        graph: DagGraph, event: DagGraphEvents|DagNodeEvents, handler: Function
    ): void {
        if (graph == null) {
            return;
        }
        graph.events.on(`${event}.${dagEventNamespace}`, handler);
    }

    /**
     * @description
     * listens events for 1 dag graph. This function is called for each dag graph.
     * Make sure all events listening are also registered in cleanupClosedTab !!!
     */
    function _setupGraphEvents(graph?: DagGraph): void {
        graph = graph || activeDag;

        // when a graph gets locked during execution
        _registerGraphEvent(graph, DagGraphEvents.LockChange, (info) => {
            const tabId: string = info.tabId;
            const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
            _lockUnlockHelper(info);
            if (tab instanceof DagTabPublished) {
                DagSharedActionService.Instance.broadcast(DagGraphEvents.LockChange, info);
            }
            DagTopBar.Instance.setState(activeDagTab); // refresh the stop button status
        });

        _registerGraphEvent(graph, DagNodeEvents.StateChange, function (info) {
            _updateNodeState(info);
            const dagTab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            if (info.state !== DagNodeState.Running) {
                // running state don't need to change
                dagTab.save();
            }
            if (dagTab instanceof DagTabPublished) {
                DagSharedActionService.Instance.broadcast(DagNodeEvents.StateChange, {
                    nodeId: info.id,
                    tabId: info.tabId,
                    state: info.state
                });
            }
        });

        _registerGraphEvent(graph, DagNodeEvents.ConnectionChange, function (info) {
            if (info.descendents.length) {
                // XXX TODO only update if nodes involved in form are affected
                FormHelper.updateColumns(info);
            }
        });

        _registerGraphEvent(graph, DagNodeEvents.ParamChange, function (info) {
            const $node: JQuery = DagView.getNode(info.id, info.tabId);

            _drawTitleText($node, info.node);
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
            if (info.node instanceof DagNodeDFOut) {
                _checkLinkInNodeValidation(activeDag);
            }
            DagNodeInfoPanel.Instance.update(info.id, "params");
            _getAreaByTab(info.tabId).find('.runStats[data-id="' + info.id + '"]').remove();

            const dagTab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            dagTab.save()
            .then(() => {
                if (dagTab instanceof DagTabPublished) {
                    DagSharedActionService.Instance.broadcast(DagNodeEvents.ParamChange, {
                        tabId: dagTab.getId()
                    });
                }
            });

            if (!info.noAutoExecute) {
                _autoExecute(info.node);
            }
        });

        _registerGraphEvent(graph, DagNodeEvents.AutoExecute, function (info) {
            _autoExecute(info.node);
        });

        _registerGraphEvent(graph, DagNodeEvents.LineageSourceChange, function (info) {
            const tabId: string = activeDagTab.getId();
            const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
            dagTab.save();
            if (tabId === activeDagTab.getId()) {
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
                        DagView.viewResult(nodeInPreview);
                    }
                }
            }
        });

        _registerGraphEvent(graph, DagNodeEvents.AggregateChange, function (info) {
            editAggregates(info.id, info.tabId, info.aggregates);
            DagNodeInfoPanel.Instance.update(info.id, "aggregates");
        });

        _registerGraphEvent(graph, DagNodeEvents.TableLockChange, function (info) {
            editTableLock(DagView.getNode(info.id, info.tabId), info.lock);
        });

        _registerGraphEvent(graph, DagNodeEvents.TableRemove, function (info) {
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

        _registerGraphEvent(graph, DagNodeEvents.RetinaRemove, function(info) {
            const retinaName: string = gRetinaPrefix + info.tabId + "_" + info.nodeId;
            XcalarDeleteRetina(retinaName)
            .then(() => {
                // remove optimized dataflow tab if opened
                DagTabManager.Instance.removeTab(retinaName);
            })
            .fail((error) => {
                if (error && error.status === StatusT.StatusRetinaInUse) {
                    StatusBox.show("Could not delete optimized dataflow.  " + error.error, $dfWrap);
                }
            });
        });

        _registerGraphEvent(graph, DagNodeEvents.TitleChange, function (info) {
            // update table preview if node's title changes
            if (DagTable.Instance.isTableFromTab(info.tabId)) {
                const tableId = DagTable.Instance.getBindNodeId();
                if (tableId === info.id) {
                    DagTable.Instance.updateTableName(info.tabId);
                }
            }
            DagNodeInfoPanel.Instance.update(info.id, "title");
        });

        _registerGraphEvent(graph, DagNodeEvents.DescriptionChange, (info) => {
            const $node: JQuery = DagView.getNode(info.id, info.tabId);
            $node.find(".descriptionIcon").remove();

            if (info.text.length) {
                addDescriptionIcon($node, info.text);
            } else {
                $node.removeClass("hasDescription");
            }
            DagNodeInfoPanel.Instance.update(info.id, "description");
        });

        _registerGraphEvent(graph, DagGraphEvents.TurnOffSave, (info) => {
            const tab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            if (tab != null) {
                tab.turnOffSave();
            }
        });

        _registerGraphEvent(graph, DagGraphEvents.TurnOnSave, (info) => {
            const tab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            if (tab != null) {
                tab.turnOnSave();
            }
        });

        _registerGraphEvent(graph, DagGraphEvents.Save, (info) => {
            const tab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            if (tab != null) {
                tab.save();
            }
        });

        _registerGraphEvent(graph, DagGraphEvents.AddSQLFuncInput, (info) => {
            const tab: DagTab = DagTabManager.Instance.getTabById(info.tabId);
            if (tab != null && tab instanceof DagTabSQLFunc) {
                tab.addInput(info.node);
            }
        });

        _registerGraphEvent(graph, DagGraphEvents.RemoveSQLFucInput, (info) => {
            const tabId: string = info.tabId;
            const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
            if (tab != null && tab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = tab.removeInput(info.order);
                _updateTitleForNodes(changedNodes, tabId);
            }
        });

        _registerGraphEvent(graph, DagGraphEvents.AddBackSQLFuncInput, (info) => {
            const tabId: string = info.tabId;
            const tab: DagTab = DagTabManager.Instance.getTabById(tabId);
            if (tab != null && tab instanceof DagTabSQLFunc) {
                const changedNodes: DagNodeSQLFuncIn[] = tab.addBackInput(info.order);
                _updateTitleForNodes(changedNodes, tabId);
            }
        });
    }

    function _setupDagSharedActionEvents(): void {
        const service = DagSharedActionService.Instance;
        service
            .on(DagNodeEvents.ProgressChange, (info) => {
                _updateSharedProgress(info);
            })
            .on(DagNodeEvents.StateChange, (info) => {
                _updateNodeState(info);
            })
            .on(DagNodeEvents.ParamChange, (info) => {
                const tabId: string = info.tabId;
                const tab: DagTab = info.tab;
                if (activeDagTab.getId() === tabId) {
                    Alert.show({
                        title: DFTStr.Refresh,
                        msg: DFTStr.RefreshMsg,
                        isAlert: true
                    });
                }
                const $dfArea: JQuery = _getAreaByTab(tabId);
                $dfArea.addClass("xc-disabled");
                const promise = DagTabManager.Instance.reloadTab(tab);
                xcHelper.showRefreshIcon($dfArea, true, promise);

                promise
                    .then(() => {
                        _getAreaByTab(tabId).removeClass("rendered");
                        if (activeDagTab.getId() === tabId) {
                            DagView.switchActiveDagTab(tab);
                        }
                    })
                    .always(() => {
                        $dfArea.removeClass("xc-disabled");
                    });
            })
            .on(DagGraphEvents.LockChange, (info) => {
                _lockUnlockHelper(info);
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
                if (!parents[i]) {
                    continue;
                }
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
            clearState?: boolean // true if we're copying nodes
            includeStats?: boolean,
            includeTitle?: boolean // indicates we're doing a cut/copy and paste
        } = {}
    ): any[] {
        // check why we need it
        const clearState: boolean = options.clearState || false;
        const includeStats: boolean = options.includeStats || false;
        const includeTitle: boolean = options.includeTitle == null ? true : options.includeTitle;
        let nodeInfos = [];
        nodeIds.forEach((nodeId) => {
            if (nodeId.startsWith("dag")) {
                const node: DagNode = dagGraph.getNode(nodeId);
                let parentIds: DagNodeId[] = [];
                let minParents: number = node.getMinParents();
                let parents = node.getParents();
                // if node requires at least 2 parents, and a parent isn't found
                // then we push in a null, but if the node requires 1 parent
                // we can just not push anything and keep parents == []
                for (let i = 0; i < parents.length; i++) {
                    const parent = parents[i];
                    if (parent) {
                        const parentId: DagNodeId = parent.getId();

                        if (nodeIds.indexOf(parentId) === -1) {
                            if (minParents > 1) {
                                parentIds.push(null);
                            }
                        } else {
                            parentIds.push(parentId);
                        }
                    } else {
                        if (minParents > 1) {
                            parentIds.push(null);
                        }
                    }
                }

                const nodeInfo = node.getNodeCopyInfo(clearState, includeStats, includeTitle);
                nodeInfo.parents = parentIds;
                nodeInfos.push(nodeInfo);
            } else if (nodeId.startsWith("comment")) {
                const comment: CommentNode = dagGraph.getComment(nodeId);
                nodeInfos.push({
                    nodeId: nodeId,
                    position: xcHelper.deepCopy(comment.getPosition()),
                    dimensions: comment.getDimensions(),
                    text: comment.getText()
                });
            }
        });

        return nodeInfos;
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
        updateOperationTime(true);
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

    // assumes every node in queryStateOuput corresponds to 1 UI node
    export function calculateAndUpdateProgress(
        queryStateOutput,
        nodeId: DagNodeId,
        tabId: string
    ): void {
        const progress: number = xcHelper.getQueryProgress(queryStateOutput);
        const pct: number = Math.round(100 * progress);
        if (isNaN(pct)) {
            return;
        }
        let tab: DagTab = <DagTab>DagTabManager.Instance.getTabById(tabId) ||
        SQLExecutor.getTab(tabId);
        if (tab == null) {
            return;
        }
        const graph: DagGraph = tab.getGraph();
        const node: DagNode = graph.getNode(nodeId);

        if (node.getType() === DagNodeType.SQL) {
            let subGraph = (<DagNodeSQL>node).getSubGraph();
            const subTabId: string = subGraph.getTabId();
            subGraph.updateProgress(xcHelper.deepCopy(queryStateOutput.queryGraph.node));

            if (subTabId) {
                subGraph.getAllNodes().forEach((node, nodeId) => {
                    const overallStats = node.getOverallStats();
                    const nodeStats = node.getIndividualStats();
                    const times: number[] = [];
                    const skewInfos = [];
                    nodeStats.forEach((nodeStat) => {
                        const skewInfo = _getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                        skewInfos.push(skewInfo);
                        times.push(nodeStat.elapsedTime);
                    });
                    updateNodeProgress(nodeId, subTabId, overallStats.pct, true, skewInfos, times);
                });
            }
        }

        updateGraphProgress(graph, nodeId, queryStateOutput.queryGraph.node);
        const nodeStats = node.getIndividualStats();
        const times: number[] = [];
        const skewInfos = [];
        nodeStats.forEach((nodeStat) => {
            const skewInfo = _getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
            skewInfos.push(skewInfo);
            times.push(nodeStat.elapsedTime);
        });

        DagNodeInfoPanel.Instance.update(nodeId, "stats");
        updateNodeProgress(nodeId, tabId, pct, true, skewInfos, times);
    }

    // update the node's stats in a graph
    function updateGraphProgress(graph: DagGraph, nodeId: DagNodeId, tableInfos): void {
        const node = graph.getNode(nodeId);
        let orderMap;
        if (node instanceof DagNodeSQL) {
            orderMap = {};
            // Use the original query to determine the order of operations.
            // Delete operation doesn't have "dest", so we use namePattern
            // and append xcDelete
            let query = JSON.parse(node.getXcQueryString());
            query.forEach((queryNode, i) => {
                if (queryNode.args.dest) {
                    orderMap[queryNode.args.dest] = i;
                } else if (queryNode.operation === XcalarApisTStr[XcalarApisT.XcalarApiDeleteObjects]) {
                    orderMap[queryNode.args.namePattern + "xcDelete"] = i;
                }
            });
        }
        const nodeIdInfos = {};
        tableInfos.forEach((tableInfo, i) => {
            // set the index of the operation
            if (orderMap) {
                let name;
                if (tableInfo.api === XcalarApisT.XcalarApiDeleteObjects) {
                    name = tableInfo.input.deleteDagNodeInput.namePattern + "xcDelete"
                } else {
                    name = tableInfo.name.name;
                }
                if (orderMap[name] != null) {
                    tableInfo.index = orderMap[name];
                }
            }
            if (tableInfo.index == null) {
                tableInfo.index = i;
            }

            const tableName = tableInfo.name.name;
            nodeIdInfos[tableName] = tableInfo;
        });

        node.updateProgress(nodeIdInfos, false, node instanceof DagNodeSQL);
        if (node instanceof DagNodeSQL) {
            node.updateSQLQueryHisory(true);
        }
    }

    /**
     * updateNodeProgress
     * @param nodeId
     * @param tabId
     * @param progress
     * @param _isOptimized
     * @param skewInfos
     * @param timeStrs
     * @param broadcast
     */
    function updateNodeProgress(
        nodeId: DagNodeId,
        tabId: string,
        progress: number,
        _isOptimized?: boolean,
        skewInfos?: any[],
        times?: number[],
        broadcast: boolean = true
    ): void {
        const $dfArea: JQuery = _getAreaByTab(tabId);
        const g = d3.select($dfArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        let opProgress = g.select(".opProgress");
        if (opProgress.empty()) {
            DagView.addProgress(nodeId, tabId);
            opProgress = g.select(".opProgress");
        }
        opProgress.text(progress + "%");

        const dagTab: DagTab = DagTabManager.Instance.getTabById(tabId);
        if (skewInfos) {
            $dfArea.find('.runStats[data-id="' + nodeId + '"]').remove();
            if (dagTab == null) {
                // sql graph may not have tab registered with dagTabManager
                return;
            }
            const graph: DagGraph = dagTab.getGraph()
            const node: DagNode = graph.getNode(nodeId);
            _addProgressTooltip(graph, node, $dfArea, skewInfos, times);

            if (progress === 100) {
                const totalTime: number = times.reduce((a, b) => a + b, 0);
                const graph: DagGraph = dagTab.getGraph()
                let shouldUpdate: boolean = false;
                if (node instanceof DagNodeCustom) {
                    // custom node need to update till all is done
                    let subNodeCnt: number = 0;
                    node.getSubGraph().getAllNodes().forEach((node) => {
                        if (!(node instanceof DagNodeCustomInput) &&
                            !(node instanceof DagNodeCustomOutput)
                        ) {
                            subNodeCnt++;
                        }
                    });
                    if (subNodeCnt === times.length) {
                        shouldUpdate = true;
                    }
                } else {
                    shouldUpdate = true;
                }
                if (shouldUpdate) {
                    graph.updateOperationTime(totalTime);
                    updateOperationTime(true);
                }
            }
        }

        if (broadcast && dagTab instanceof DagTabPublished) {
            DagSharedActionService.Instance.broadcast(DagNodeEvents.ProgressChange, {
                nodeId: nodeId,
                tabId: tabId,
                progress: progress,
                skewInfos: skewInfos,
                times: times
            });
        }
    }

    export function updateOptimizedDFProgress(queryName, queryStateOutput) {
        let tab: DagTabOptimized = <DagTabOptimized>DagTabManager.Instance.getTabById(queryName);
        if (!tab) {
            return;
        }
        let graph: DagSubGraph = tab.getGraph();
        graph.updateProgress(queryStateOutput.queryGraph.node);

        graph.getAllNodes().forEach((node, nodeId) => {
            DagNodeInfoPanel.Instance.update(nodeId, "stats");
            const overallStats = node.getOverallStats();
            const nodeStats = node.getIndividualStats();

            const times: number[] = [];
            const skewInfos = [];
            nodeStats.forEach((nodeStat) => {
                const skewInfo = _getSkewInfo("temp name", nodeStat.rows, nodeStat.skewValue, nodeStat.numRowsTotal, nodeStat.size);
                skewInfos.push(skewInfo);
                times.push(nodeStat.elapsedTime);
            });

            updateNodeProgress(nodeId, tab.getId(), overallStats.pct, true, skewInfos, times);
        });
    }

    function _updateSharedProgress(progressInfo: {
        nodeId: DagNodeId,
        tabId: string,
        progress: number,
        skewInfos: any[],
        times: number[]
    }): void {
        const nodeId: DagNodeId = progressInfo.nodeId;
        const tabId: string = progressInfo.tabId;
        updateNodeProgress(nodeId, tabId, progressInfo.progress,
            null, progressInfo.skewInfos, progressInfo.times, false);
        if (progressInfo.progress >= 100) {
            DagView.removeProgress(nodeId, tabId);
        }
    }

    function _getSkewInfo(name, rows, skew, totalRows, inputSize): {
        name: string,
        value: number,
        text: string,
        color: string,
        rows: number[],
        totalRows: number,
        size: number
    } {
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

    export function getSkewText(skew) {
        return ((skew == null || isNaN(skew))) ? "N/A" : String(skew);
    }

    export function getSkewColor(skewText: string) {
        if (skewText === "N/A") {
            return "";
        }
        const skew: number = Number(skewText);
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

    /**
     * DagView.removeProgress
     * @param nodeId
     * @param tabId
     */
    export function removeProgress(nodeId: DagNodeId, tabId: string): void {
        const $dataflowArea: JQuery = _getAreaByTab(tabId);
        const g = d3.select($dataflowArea.find('.operator[data-nodeid = "' + nodeId + '"]')[0]);
        g.selectAll(".opProgress")
            .remove();
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
            if (dagGraph != null) {
                dagGraph.unsetGraphNoDelete();
            }
        }
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
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
        DagNodeInfoPanel.Instance.update(nodeId, "lock");
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
                .text(function (_d) { return "\ue940" });
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

    function _addNodeNoPersist(
        node,
        options?: {
            isNoLog?: boolean,
            tabId?: string
        }
    ): LogParam {
        let { isNoLog = false, tabId = null } = options || {};

        _deselectAllNodes();
        const $dfArea = tabId ? _getAreaByTab(tabId) : _getActiveArea();

        const nodeId = node.getId();
        const $node = _drawNode(node, $dfArea);
        _selectNode($node);
        _setGraphDimensions(xcHelper.deepCopy(node.getPosition()))

        const logParam: LogParam = {
            title: SQLTStr.AddOperation,
            options: {
                "operation": SQLOps.AddOperation,
                "dataflowId": activeDagTab ? activeDagTab.getId() : null,
                "nodeId": nodeId
            }
        };
        if (!isNoLog) {
            Log.add(logParam.title, Object.assign({}, logParam.options));
        }

        return logParam;
    }

    function _nodeTitleEditMode($origTitle): void {
        if (activeDagTab instanceof DagTabPublished) {
            return;
        }
        const nodeId: DagNodeId = $origTitle.closest(".operator").data("nodeid");
        const node = DagView.getActiveDag().getNode(nodeId);
        if (node instanceof DagNodeSQLFuncIn && XVM.isSQLMode()) {
            // not allow modify input node in sql mode
            return;
        }
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
            DagView.editNodeTitle(nodeId, tabId, newVal);
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

    function _checkNodeValidation(): void {
        _checkLinkInNodeValidation(activeDag);
    }

    function _checkLinkInNodeValidation(graph: DagGraph): void {
        if (graph == null) {
            return;
        }
        graph.getAllNodes().forEach((node) => {
            if (node instanceof DagNodeDFIn) {
                const state: DagNodeState = node.getState();
                if (state === DagNodeState.Configured ||
                    state === DagNodeState.Error && node.isLinkingError()
                ) {
                    node.switchState();
                }
            }
        });
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