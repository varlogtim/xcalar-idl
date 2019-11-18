namespace DagNodeMenu {
    let position: Coordinate;

    export function setup() {
        _setupNodeMenu();
        _setupNodeMenuActions();
    }

    export function updateExitOptions(name) {
        let $menu = _getDagNodeMenu();
        let $li = $menu.find(".exitOp");
        $li.attr("class", "exitOp");

        let nameUpper = xcStringHelper.capitalize(name);
        let label = nameUpper;
        switch (name) {
            case ('groupby'):
                label = 'Group By';
                break;
            default:
                break;
        }
        $li.find(".label").text('Exit ' + label + ' Configuration');
        $li.addClass('exit' + nameUpper.replace(/ /g,''));
    }

    // options must include nod
    export function execute(action: string, options: {
        node: DagNode,
        autofillColumnNames?: string[],
        exitCallback?: Function // when config panel is exited without saving
    }) {
        switch (action) {
            case("configureNode"):
                const nodeIds = [options.node.getId()];
                const nodesToCheck = nodeIds.filter((nodeId) => {
                    return !nodeId.startsWith("comment");
                });
                if (DagViewManager.Instance.getActiveDag().checkForChildLocks(nodesToCheck)) {
                    Alert.show({
                        title: DFTStr.LockedTableWarning,
                        msg: xcStringHelper.replaceMsg(DFTStr.LockedTableMsg, {action: action}),
                        onConfirm: () => {
                            _processMenuAction(action, options);
                        }
                    });
                } else {
                    _processMenuAction(action, options);
                }
                break;
            default:
                _processMenuAction(action, options);
                break;
        }
    }

    export function close() {
        $(document).trigger(fakeEvent.mousedown);
    }

    function _setupNodeMenu(): void {
        position = {x: 0, y: 0};
        let $menu = _getDagNodeMenu();
        xcMenu.add($menu);

        let $dfWrap = _getDFWrap();
        $dfWrap.on("contextmenu", ".operator .main", function(event: JQueryEventObject) {
            _showNodeMenu(event, $(this));
            return false; // prevent default browser's rightclick menu
        });

        $dfWrap.on("contextmenu", function(event: JQueryEventObject) {
            _showNodeMenu(event, null);
            return false;
        });

        $dfWrap.on("click", ".edge", function(event) {
            _showEdgeMenu($(this), event);
        });

        $dfWrap.on("contextmenu", ".edge", function(event) {
            _showEdgeMenu($(this), event);
            return false;
        });

        $dfWrap.on("contextmenu", ".comment", function(event: JQueryEventObject) {
            _showCommentMenu($(this), event);
            return false; // prevent default browser's rightclick menu
        });
    }

    function _processMenuAction(
        action: string,
        options?: {
            node?: DagNode,
            autofillColumnNames?: string[],
            exitCallback?: Function, // when config panel is exited without saving
            bypassAlert?: boolean
        }
    ) {
        try {
            const $menu: JQuery = $("#dagNodeMenu");
            let nodeId: DagNodeId;
            let nodeIds: DagNodeId[];
            let dagNodeIds: DagNodeId[];
            options = options || {};
            if (options.node) {
                nodeId = options.node.getId();
                nodeIds = [options.node.getId()];
                dagNodeIds = [options.node.getId()];
            } else {
                nodeId = $menu.data("nodeid"); // clicked node
                nodeIds = DagViewManager.Instance.getSelectedNodeIds(true, true); // includes comments
                dagNodeIds = DagViewManager.Instance.getSelectedNodeIds(true); // dag nodes only
            }
             // all selected nodes && comments
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            const parentNodeId: DagNodeId = $menu.data("parentnodeid");
            const connectorIndex: number = parseInt($menu.data("connectorindex"));
            switch (action) {
                case ("removeNode"):
                    DagViewManager.Instance.removeNodes(nodeIds, tabId);
                    break;
                case ("removeAllNodes"):
                    Alert.show({
                        title: DagTStr.RemoveAllOperators,
                        msg: DagTStr.RemoveAllMsg,
                        onConfirm: function() {
                            const nodes: Map<DagNodeId, DagNode> = DagViewManager.Instance.getActiveDag().getAllNodes();
                            let nodeIdsToRemove: DagNodeId[] = [];
                            nodes.forEach((_node: DagNode, nodeId: DagNodeId) => {
                                nodeIdsToRemove.push(nodeId);
                            });
                            const comments: Map<CommentNodeId, CommentNode> = DagViewManager.Instance.getActiveDag().getAllComments();
                            comments.forEach((_node: CommentNode, nodeId: CommentNodeId) => {
                                nodeIdsToRemove.push(nodeId);
                            });
                            DagViewManager.Instance.removeNodes(nodeIdsToRemove, tabId);
                        }
                    });
                    break;
                case ("selectAllNodes"):
                    DagViewManager.Instance.selectNodes(DagViewManager.Instance.getActiveDag().getTabId());
                    break;
                case ("focusRunning"):
                    _focusRunningNode();
                    break;
                case ("findSourceNode"):
                    _findSourceNode(dagNodeIds[0], tabId);
                    break;
                case ("findOptimizedSource"):
                    _findOptimizedSource(tabId);
                    break;
                case ("download"):
                    let dagTab: DagTab = DagList.Instance.getDagTabById(tabId);
                    if (dagTab == null) {
                        // when it's sub tab
                        dagTab = DagTabManager.Instance.getTabById(tabId);
                    }
                    if (dagTab != null) {
                        DFDownloadModal.Instance.show(dagTab);
                    }
                    break;
                case ("duplicateDf"): {
                    const dagTab: DagTab = DagList.Instance.getDagTabById(tabId);
                    DagTabManager.Instance.duplicateTab(dagTab);
                    break;
                }
                case ("removeInConnection"):
                    DagViewManager.Instance.disconnectNodes(parentNodeId, nodeId, connectorIndex, tabId);
                    break;
                case ("copyNodes"):
                    DagViewManager.Instance.triggerCopy();
                    break;
                case ("cutNodes"):
                    DagViewManager.Instance.triggerCut();
                    break;
                case ("pasteNodes"):
                    _showPasteAlert();
                    break;
                case ("executeNode"):
                    DagViewManager.Instance.run(dagNodeIds);
                    break;
                case ("executeAllNodes"):
                    DagViewManager.Instance.run();
                    break;
                case ("executeNodeOptimized"):
                    DagViewManager.Instance.run(dagNodeIds, true);
                    break;
                case ("createNodeOptimized"):
                    if (dagNodeIds.length === 0) {
                        dagNodeIds = null;
                    }
                    DagViewManager.Instance.generateOptimizedDataflow(dagNodeIds);
                    break;
                case ("resetNode"):
                    DagViewManager.Instance.reset(dagNodeIds, options.bypassAlert);
                    break;
                case ("resetAllNodes"):
                    DagViewManager.Instance.reset(null, options.bypassAlert);
                    break;
                case ("configureNode"):
                    configureNode(_getNodeFromId(dagNodeIds[0]), options);
                    break;
                case ("viewResult"):
                    DagViewManager.Instance.viewResult(_getNodeFromId(dagNodeIds[0]));
                    break;
                case ("generateResult"):
                    const nodeToPreview: DagNode = _getNodeFromId(dagNodeIds[0]);
                    DagViewManager.Instance.run(dagNodeIds).then(() => {
                        DagViewManager.Instance.viewResult(nodeToPreview);
                    });
                    break;
                case ("viewOptimizedDataflow"):
                    DagViewManager.Instance.viewOptimizedDataflow(_getNodeFromId(dagNodeIds[0]), tabId);
                    break;
                case ("viewUDFErrors"):
                    DagUDFErrorModal.Instance.show(dagNodeIds[0]);
                    break;
                case ("description"):
                    DagDescriptionModal.Instance.show(dagNodeIds[0]);
                    break;
                case ("newComment"):
                    const scale = DagViewManager.Instance.getActiveDag().getScale();
                    const rect = _getDFWrap().find(".dataflowArea.active .dataflowAreaWrapper")[0].getBoundingClientRect();
                    const x = (position.x - rect.left - DagView.gridSpacing) / scale;
                    const y = (position.y - rect.top - DagView.gridSpacing) / scale;
                    DagViewManager.Instance.newComment({
                        display: {x: x, y: y}
                    }, true);
                    break;
                case ("autoAlign"):
                    DagViewManager.Instance.autoAlign(tabId);
                    break;
                case ("viewSchema"):
                    _showDagSchemaPopup(dagNodeIds[0], tabId);
                    break;
                case ("exitOpPanel"):
                    exitOpPanel();
                    break;
                case ("createCustom"):
                    DagViewManager.Instance.wrapCustomOperator(dagNodeIds);
                    break;
                case ("editCustom"):
                    DagViewManager.Instance.editCustomOperator(dagNodeIds[0]);
                    break;
                case ("shareCustom"):
                    DagViewManager.Instance.shareCustomOperator(dagNodeIds[0]);
                    break;
                case ("inspectSQL"):
                    DagViewManager.Instance.inspectSQLNode(dagNodeIds[0], tabId);
                    break;
                case ("expandSQL"):
                    expandSQLNode(dagNodeIds[0]);
                    break;
                case ("expandCustom"):
                    DagViewManager.Instance.expandCustomNode(dagNodeIds[0]);
                    break;
                case ("findLinkOut"):
                    _findLinkOutNode(nodeId);
                    break;
                case ("lockTable"):
                    DagViewManager.Instance.getActiveDag().getNode(nodeId).pinTable();
                    break;
                case ("unlockTable"):
                    DagViewManager.Instance.getActiveDag().getNode(nodeId).unpinTable();
                    break;
                case ("restoreDataset"):
                    const node: DagNodeDataset = <DagNodeDataset>DagViewManager.Instance.getActiveDag().getNode(dagNodeIds[0]);
                    _restoreDatasetFromNode(node);
                    break;
                case ("restoreAllDataset"):
                    _restoreAllDatasets();
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _setupNodeMenuActions(): void {
        const $menu: JQuery = $("#dagNodeMenu");
        $menu.on("mouseup", "li", function(event) {
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            const $li: JQuery = $(this);
            const action: string = $li.data('action');
            if ($li.hasClass("unavailable") || !action) {
                return;
            }
            const nodeIds: DagNodeId[] = DagViewManager.Instance.getSelectedNodeIds(true, true);

            // Alert for locking tables
            switch (action) {
                case ("removeNode"):
                case ("removeAllNodes"):
                case ("removeInConnection"):
                case ("resetNode"):
                case ("resetAllNodes"):
                case ("configureNode"):
                    const nodesToCheck = nodeIds.filter((nodeId) => {
                        return !nodeId.startsWith("comment");
                    });
                    if (DagViewManager.Instance.getActiveDag().checkForChildLocks(nodesToCheck)) {
                        Alert.show({
                            title: DFTStr.LockedTableWarning,
                            msg: xcStringHelper.replaceMsg(DFTStr.LockedTableMsg, {action: action}),
                            onConfirm: () => {
                                _processMenuAction(action, {bypassAlert: true});
                            }
                        });
                    } else {
                        _processMenuAction(action);
                    }
                    break;
                default:
                    _processMenuAction(action);
                    break;
            }
        });
    }

    function exitOpPanel(ignoreSQLChange?: boolean): void {
        if (!ignoreSQLChange && SQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    exitOpPanel(true);
                }
            });
        } else {
            MainMenu.closeForms();
        }
    }

    function _getDFWrap(): JQuery {
        return $("#dagView").find(".dataflowWrap");
    }

    function _getDagNodeMenu(): JQuery {
        return $("#dagNodeMenu");
    }

    function expandSQLNode(
        dagNodeId: DagNodeId,
        ignoreSQLChange?: boolean
    ): void {
        if (!ignoreSQLChange && SQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    expandSQLNode(dagNodeId, true);
                }
            });
        } else if (!SQLOpPanel.Instance.getAlertOff()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.ExpandSQL,
                onConfirm: (checked) => {
                    SQLOpPanel.Instance.setAlertOff(checked);
                    DagViewManager.Instance.expandSQLNode(dagNodeId);
                    SQLOpPanel.Instance.close();
                },
                isCheckBox: true
            });
        } else {
            DagViewManager.Instance.expandSQLNode(dagNodeId);
            SQLOpPanel.Instance.close();
        }
    }

    function configureNode(node: DagNode, options?: {
        node?: DagNode,
        autofillColumnNames?: string[],
        exitCallback?: Function,  // when config panel is exited without saving
        nonConfigurable?: boolean,
        udfDisplayPathPrefix?: string,
        ignoreSQLChange?: boolean
    }) {
        if ((!options || !options.ignoreSQLChange) &&
            SQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    options = options || {};
                    options.ignoreSQLChange = true;
                    configureNode(node, options);
                }
            });
            return;
        }
        const nodeId: string = node.getId();
        if (DagViewManager.Instance.isNodeLocked(nodeId) ||
            DagViewManager.Instance.isNodeConfigLocked(nodeId)) {
            return;
        }
        const $node = DagViewManager.Instance.getNode(nodeId);
        if ($node.hasClass("configDisabled")) {
            StatusBox.show("No panels available. To edit, copy node and paste into a text editor. Then copy the edited JSON and paste it here.",
                                $node);
            return;
        }

        const type: DagNodeType = node.getType();
        const subType: DagNodeSubType = node.getSubType();
        const tabId: string = DagViewManager.Instance.lockConfigNode(nodeId);
        const dagTab: DagTab = DagViewManager.Instance.getActiveTab();

        options = options || {};
        // when menu closes, regardless if it's saved, unlock the node
        options = $.extend(options, {
            closeCallback: function() {
               unlock(tabId);
            }
        });
        Log.lockUndoRedo();
        DagTabManager.Instance.lockTab(tabId);
        DagTopBar.Instance.lock();
        MainMenu.closeForms(); // close opened forms first
        // Nodes in SQL sub graph can't be configured
        if (dagTab instanceof DagTabSQL) {
            options.nonConfigurable = true;
        }
        if ([DagNodeType.Map, DagNodeType.GroupBy, DagNodeType.Filter,
            DagNodeType.Aggregate].indexOf(type) > -1) {
            options.udfDisplayPathPrefix =
                dagTab instanceof DagTabPublished ?
                    dagTab.getUDFDisplayPathPrefix() :
                    UDFFileManager.Instance.getCurrWorkbookDisplayPath();
        }

        switch (type) {
            case (DagNodeType.Dataset):
                DatasetOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Aggregate):
                AggOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Export):
                ExportOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Filter):
                FilterOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Join):
                JoinOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Map):
                if (subType === DagNodeSubType.Cast) {
                    CastOpPanel.Instance.show(node, options);
                } else {
                    MapOpPanel.Instance.show(node, options);
                }
                break;
            case (DagNodeType.Split):
                SplitOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Round):
                RoundOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.GroupBy):
                GroupByOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Project):
                ProjectOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Explode):
                ExplodeOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Set):
                SetOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.DFIn):
                DFLinkInOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.DFOut):
                DFLinkOutOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.PublishIMD):
                PublishIMDOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.UpdateIMD):
                UpdateIMDOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Jupyter):
                JupyterOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Extension):
                ExtensionOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.IMDTable):
                IMDTableOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.SQL):
                SQLOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.RowNum):
                RowNumOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Sort):
                SortOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.SQLFuncIn):
                SQLFuncInOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.SQLFuncOut):
                SQLFuncOutOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Synthesize):
                SynthesizeOpPanel.Instance.show(node, options);
                break;
            case (DagNodeType.Deskew):
                DeskewOpPanel.Instance.show(node, options);
                break;
            default:
                unlock(tabId);
                StatusBox.show("No panels available. To edit, copy node and paste into a text editor. Then copy the edited JSON and paste it here.",
                                $node);
                return;
        }

        function unlock(tabId: string) {
            DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
            Log.unlockUndoRedo();
            DagTopBar.Instance.unlock();
            DagTabManager.Instance.unlockTab(tabId);
        }
    }

    function _showEdgeMenu($edge: JQuery, event: JQueryEventObject): void {
        if (DagViewManager.Instance.isDisableActions() || $edge.closest(".largeHidden").length) {
            return;
        }
        let classes: string = " edgeMenu ";
        let $menu = _getDagNodeMenu();
        MenuHelper.dropdownOpen($edge, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });

        // toggle selected class when menu is open
        $edge.attr("class", "edge selected");
        $(document).on("mousedown.menuClose", function() {
            $edge.attr("class", "edge");
            $(document).off("mousedown.menuClose");
        });
        const nodeId: DagNodeId = $edge.attr("data-childnodeid");
        const parentNodeId: DagNodeId = $edge.attr("data-parentnodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("parentnodeid", parentNodeId);
        $menu.data("connectorindex", $edge.attr("data-connectorindex"));
        const childNodeId: DagNodeId = $edge.attr("data-childnodeid");
        $menu.find("li").removeClass("unavailable");
        if (DagViewManager.Instance.isNodeLocked(childNodeId)) {
            $menu.find(".removeInConnection").addClass("unavailable");
        }
    }

    function _showCommentMenu($clickedEl: JQuery, event: JQueryEventObject): void {
        if ($clickedEl.closest("largeHidden").length) {
            return;
        }
        let nodeIds = DagViewManager.Instance.getSelectedNodeIds();
        const nodeId: DagNodeId = $(this).data("nodeid");
        let $menu = _getDagNodeMenu();
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);

        let classes: string = " commentMenu ";
        $menu.find("li").removeClass("unavailable");
        adjustMenuForOpenForm();

        MenuHelper.dropdownOpen($clickedEl, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    // called when node is clicked or background is clicked
    function _showNodeMenu(event: JQueryEventObject, $clickedEl?: JQuery) {
        const $dfArea = DagViewManager.Instance.getActiveArea();
        if (!$dfArea.length || $dfArea.hasClass("largeHidden")) {
            return;
        }
        const $operators = DagViewManager.Instance.getSelectedNodes();
        let backgroundClicked = false; // whether the node was clicked or the background
        let nodeIds = [];
        $operators.each(function() {
            nodeIds.push($(this).data("nodeid"));
        });

        let nodeId: DagNodeId;
        if ($clickedEl && $clickedEl.length) {
            nodeId = $clickedEl.closest(".operator").data("nodeid");
        } else {
            nodeId = nodeIds[0];
            backgroundClicked = true;
        }

        let $menu = _getDagNodeMenu();
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);
        $menu.find("li").removeClass("unavailable");

        let classes: string = "";
        if (DagViewManager.Instance.isDisableActions()) {
            // .nonEditableSubgraph hides all modification menu item
            classes += ' nonEditableSubgraph ';
        }
        if (DagViewManager.Instance.isViewOnly()) {
            classes += ' viewOnly ';
        }
        let activeTab: DagTab = DagViewManager.Instance.getActiveTab();
        if (activeTab instanceof DagTabPublished) {
            classes += ' published ';
        }
        if (activeTab instanceof DagTabSQL) {
            classes += ' viewOnly SQLTab ';
        }
        if (activeTab instanceof DagTabSQLFunc) {
            classes += ' SQLFuncTab '
        }
        if (activeTab instanceof DagTabCustom) {
            classes += ' customTab ';
        }
        if (activeTab instanceof DagTabOptimized) {
            classes += " optimizedTab ";
        }
        if ($dfArea.find(".comment.selected").length) {
            classes += " commentMenu ";
        }

        if (!DagViewManager.Instance.getAllNodes().length) {
            classes += " none ";
            $menu.find(".removeAllNodes, .resetAllNodes, .executeAllNodes, .selectAllNodes, .autoAlign")
            .addClass("unavailable");
        }
        if ($dfArea.find(".comment").length) {
            $menu.find(".removeAllNodes").removeClass("unavailable");
        }

        if (nodeIds.length) {
            classes += " operatorMenu "
            if (nodeIds.length === 1) {
                classes += " single ";
                const extraClasses: string = adjustMenuForSingleNode(nodeIds[0]);
                classes += extraClasses + " ";
            } else {
                classes += " multiple ";
            }
        } else {
            classes += " backgroundMenu ";
            adjustMenuForBackground();
        }
        if (backgroundClicked) {
            $menu.find(".autoAlign, .selectAllNodes").removeClass("xc-hidden");
        } else {
            $menu.find(".autoAlign, .selectAllNodes").addClass("xc-hidden");
        }

        for (let i = 0; i < nodeIds.length; i++) {
            if (DagViewManager.Instance.isNodeLocked(nodeIds[i]) ||
                DagViewManager.Instance.isNodeConfigLocked(nodeIds[i])
            ) {
                $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                      ".executeNodeOptimized, .createNodeOptimized," +
                      ".resetNode, .cutNodes, .removeNode, .removeAllNodes, .editCustom, .createCustom")
                .addClass("unavailable");
                break;
            }
        }

        // if no nodes selected, don't display executeAll if an optimized node is found
        // if some nodes are selected, don't display executeAll if those nodes
        // contain at least 1 optimized node
        const optNodeIds = (nodeIds.length > 0) ? nodeIds : null;
        if (DagViewManager.Instance.hasOptimizedNode(optNodeIds)) {
            $menu.find(".executeNode, .executeAllNodes").addClass("xc-hidden");
            $menu.find(".executeNodeOptimized, .executeAllNodesOptimized").removeClass("xc-hidden");
        } else {
            $menu.find(".executeNode, .executeAllNodes").removeClass("xc-hidden");
            $menu.find(".executeNodeOptimized, .executeAllNodesOptimized").addClass("xc-hidden");
        }

        if (DagViewManager.Instance.hasOptimizableNode(optNodeIds)) {
            $menu.find(".createNodeOptimized").removeClass("xc-hidden");
        } else {
            $menu.find(".createNodeOptimized").addClass("xc-hidden");
        }

        if (!nodeIds.length && DagViewManager.Instance.getActiveDag().isNoDelete()) {
            $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                        ".executeNodeOptimized, .createNodeOptimized" +
                        ".resetNode, .cutNodes, .removeNode, .removeAllNodes, .editCustom")
                .addClass("unavailable");
        }

        // if graph is not in execution and currently selected node is not locked
        // then open the form
        const enableConfig = (!DagViewManager.Instance.isLocked($dfArea) &&
                              nodeIds.length === 1 &&
                              !DagViewManager.Instance.isNodeLocked(nodeIds[0]) &&
                              !DagViewManager.Instance.isNodeConfigLocked(nodeIds[0]) );
        adjustMenuForOpenForm(enableConfig);

        position = {x: event.pageX, y: event.pageY};

        MenuHelper.dropdownOpen($(event.target), $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
        if ($menu.find("li:visible").length === 0) {
            xcMenu.close($menu);
        }
    }

    function adjustMenuForSingleNode(nodeId): string {
        const dagGraph: DagGraph = DagViewManager.Instance.getActiveDag();
        const dagNode: DagNode = dagGraph.getNode(nodeId);
        const state: DagNodeState = (dagNode != null) ? dagNode.getState() : null;
        const $node: JQuery = DagViewManager.Instance.getNode(dagNode.getId());
        let classes = "";
        let $menu = _getDagNodeMenu();

        // display viewResults or generateResult
        if (dagNode != null &&
            state === DagNodeState.Complete &&
            !$node.find(".tableIcon").length
        ) {
            const table: string = dagNode.getTable();
            if (dagNode instanceof DagNodeExport) {
                $menu.find(".generateResult").addClass("xc-hidden");
                $menu.find(".viewResult").addClass("xc-hidden");
            } else if (table != null && DagTblManager.Instance.hasTable(table)) {
                $menu.find(".generateResult").addClass("xc-hidden");
                $menu.find(".viewResult").removeClass("xc-hidden");
                $menu.find(".viewResult").removeClass("unavailable");
            } else {
                $menu.find(".viewResult").addClass("xc-hidden");
                $menu.find(".generateResult").removeClass("xc-hidden");
                $menu.find(".generateResult").removeClass("unavailable");
            }
        } else {
            $menu.find(".viewResult").addClass("unavailable");
            $menu.find(".generateResult").addClass("xc-hidden");
        }

        // view optimized dataflow
        if (dagNode instanceof DagNodeOutOptimizable &&
            dagNode.isOptimized() &&
            (dagNode.getState() === DagNodeState.Complete ||
            dagNode.getState() === DagNodeState.Running ||
            dagNode.getState() === DagNodeState.Configured ||
            dagNode.getState() === DagNodeState.Error)) {
            $menu.find(".viewOptimizedDataflow").removeClass("xc-hidden");
        } else {
            $menu.find(".viewOptimizedDataflow").addClass("xc-hidden");
        }

        // view udf error details
        if (dagNode instanceof DagNodeMap && dagNode.hasUDFError()) {
            $menu.find(".viewUDFErrors").removeClass("xc-hidden");
            if (DagUDFErrorModal.Instance.isOpen()) {
                $menu.find(".viewUDFErrors").addClass("unavailable");
            } else {
                $menu.find(".viewUDFErrors").removeClass("unavailable");
            }
        } else {
            $menu.find(".viewUDFErrors").addClass("xc-hidden");
        }


        // view description
        if (dagNode != null && dagNode.getDescription()) {
            $menu.find(".description .label").text(DagTStr.EditDescription);
        } else {
            $menu.find(".description .label").text(DagTStr.AddDescription);
        }
        // view agg result
        const dagNodeType: DagNodeType = dagNode.getType();
        if (dagNode != null && dagNodeType === DagNodeType.Aggregate) {
            const aggNode = <DagNodeAggregate>dagNode;
            classes = "agg";
            $menu.find(".viewResult").removeClass("xc-hidden");
            if (state === DagNodeState.Complete &&
                aggNode.getAggVal() != null
            ) {
                $menu.find(".viewResult").removeClass("unavailable");
            } else {
                $menu.find(".viewResult").addClass("unavailable");
            }
        }
        // link node option
        if (dagNode != null && dagNodeType === DagNodeType.DFIn) {
            classes += " linkInMenu";
        }
        if ((dagNode instanceof DagNodeDFOut || dagNode instanceof DagNodeExport) &&
            !dagNode.isOptimized()
        ) {
            classes += " optimizableMenu";
            if (state === DagNodeState.Unused) {
                $menu.find(".createNodeOptimized").addClass("unavailable");
            } else {
                $menu.find(".createNodeOptimized").removeClass("unavailable");
            }
        }
        // dataset option
        if (dagNode != null && dagNodeType === DagNodeType.Dataset) {
            classes += " datasetMenu";
            const node: DagNodeDataset = <DagNodeDataset>dagNode;
            const dsName: string = node.getDSName();
            if (dsName != null && DS.getDSObj(dsName) == null) {
                $menu.find(".restoreDataset").removeClass("xc-hidden");
            } else {
                $menu.find(".restoreDataset").addClass("xc-hidden");
            }
        }

        if (dagNode != null && (dagNodeType === DagNodeType.PublishIMD ||
                dagNodeType == DagNodeType.UpdateIMD)) {
            classes += " publishMenu";
        }

        // lock/unlock option
        if (dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null && DagTblManager.Instance.hasLock(dagNode.getTable())
        ) {
            $menu.find(".lockNodeTable").addClass("unavailable");
            $menu.find(".lockNodeTable").addClass("xc-hidden");
            $menu.find(".unlockNodeTable").removeClass("unavailable");
            $menu.find(".unlockNodeTable").removeClass("xc-hidden");
        }
        else if ( dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null &&
            DagTblManager.Instance.hasTable(dagNode.getTable())
        ) {
            $menu.find(".unlockNodeTable").addClass("unavailable");
            $menu.find(".unlockNodeTable").addClass("xc-hidden");
            $menu.find(".lockNodeTable").removeClass("unavailable");
            $menu.find(".lockNodeTable").removeClass("xc-hidden");
        } else {
            $menu.find(".lockNodeTable").addClass("unavailable");
            $menu.find(".lockNodeTable").addClass("xc-hidden");
            $menu.find(".unlockNodeTable").addClass("unavailable");
            $menu.find(".unlockNodeTable").addClass("xc-hidden");
        }

        if (state === DagNodeState.Configured || state === DagNodeState.Error) {
            $menu.find(".executeNode, .executeNodeOptimized").removeClass("unavailable");
        } else {
            $menu.find(".executeNode, .executeNodeOptimized").addClass("unavailable");
        }
        if (state === DagNodeState.Complete) {
            $menu.find(".resetNode").removeClass("unavailable");
        } else {
            if (dagNode instanceof DagNodeOutOptimizable && (state === DagNodeState.Configured ||
                state === DagNodeState.Error)) {
                $menu.find(".resetNode").removeClass("unavailable");
            } else {
                $menu.find(".resetNode").addClass("unavailable");
            }
        }
        if (dagNodeType === DagNodeType.Custom) {
            classes += ' customOpMenu';
        }
        // CustomIn & Out
        if (dagNode != null && (
            dagNodeType === DagNodeType.CustomInput ||
            dagNodeType === DagNodeType.CustomOutput ||
            dagNodeType === DagNodeType.SQLSubInput ||
            dagNodeType === DagNodeType.SQLSubOutput)
        ) {
            $menu.find('.configureNode, .executeNode').addClass('unavailable');
        }

        if (dagNodeType === DagNodeType.SQL) {
            classes += ' SQLOpMenu';
        }

        if (DagViewManager.Instance.isNodeLocked(nodeId) ||
            DagViewManager.Instance.isNodeConfigLocked(nodeId) ) {
            $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                      ".executeNodeOptimized, .createNodeOptimized," +
                      ".resetNode, .cutNodes, .removeNode, .removeAllNodes, .editCustom")
                .addClass("unavailable");
        }
        return classes;
    }

    function adjustMenuForOpenForm(enableConfig?: boolean) {
        let $menu = _getDagNodeMenu();
        let $lis: JQuery = $menu.find(".executeNode, .executeAllNodes, " +
                        ".executeNodeOptimized, .createNodeOptimized," +
                        ".resetNode, .resetAllNodes, .cutNodes, " +
                        ".createCustom, .removeNode, .removeAllNodes");
        xcTooltip.remove($lis.add($menu.find(".configureNode")));

        if (!FormHelper.activeForm) {
            return;
        }

        if (!enableConfig) {
            $menu.find(".configureNode").addClass("unavailable");
            xcTooltip.add($menu.find(".configureNode"), {title: TooltipTStr.CloseConfigForm});
        }
        $lis.addClass("unavailable");
        xcTooltip.add($lis, {title: TooltipTStr.CloseConfigForm});
    }

    function adjustMenuForBackground() {
        const $view: JQuery = DagViewManager.Instance.getActiveArea();
        let $menu = _getDagNodeMenu();
        if ($view.find(".operator.state-" + DagNodeState.Running).length) {
            $menu.find(".focusRunning").removeClass("unavailable");
        } else {
            $menu.find(".focusRunning").addClass("unavailable");
        }
    }

    function _findLinkOutNode(nodeId: DagNodeId): void {
        try {
            const activeDag: DagGraph = DagViewManager.Instance.getActiveDag();
            const dagNode: DagNodeDFIn = <DagNodeDFIn>activeDag.getNode(nodeId);
            const res = dagNode.getLinkedNodeAndGraph();
            const graph: DagGraph = res.graph;
            const tabId: string = graph.getTabId();
            if (graph !== activeDag) {
                // swith to the graph
                DagTabManager.Instance.switchTab(tabId);
            }
            // focus on the node
            const linkOutNodeId: DagNodeId = res.node.getId();
            const $node: JQuery = DagViewManager.Instance.getNode(linkOutNodeId);
            const $container: JQuery = DagViewManager.Instance.getAreaByTab(tabId);
            DagUtil.scrollIntoView($node, $container)
            DagViewManager.Instance.deselectNodes();
            DagViewManager.Instance.selectNodes(tabId, [linkOutNodeId]);
        } catch (e) {
            Alert.error(AlertTStr.Error, e.message);
        }
    }

    function _focusRunningNode(): void {
        try {
            const $container: JQuery = DagViewManager.Instance.getActiveArea();
            let $node: JQuery;
            let $tip = $container.find(".runStats." + DgDagStateTStr[DgDagStateT.DgDagStateProcessing]);
            if ($tip.length) {
                $node =  DagViewManager.Instance.getNode($tip.data("id"));
            }
            if (!$node || !$node.length) {
                throw({message: "Running node could not be found"});
            }
            DagUtil.scrollIntoView($node, $container)
            DagViewManager.Instance.deselectNodes();
            const tabId: string = DagViewManager.Instance.getActiveTab().getId();
            const nodeId: DagNodeId = $node.data("nodeid");
            DagViewManager.Instance.selectNodes(tabId, [nodeId]);
        } catch (e) {
            Alert.error(AlertTStr.Error, e.message);
        }
    }

    // for optimized dataflows
    function _findSourceNode(nodeId: DagNodeId, tabId: string): void {
        try {
            let statsDagTab = DagTabManager.Instance.getTabById(tabId);
            if (statsDagTab) {
                let id = statsDagTab.getId();
                let node = DagViewManager.Instance.getActiveDag().getNode(nodeId);
                let tag = node.getTag();
                let parentNode;
                let parentTab;
                // try to get source node from tag
                if (tag) {
                    let parentNodeIds = tag || [];
                    for (let i = parentNodeIds.length - 1; i >= 0; i--) {
                        let parentNodeId = parentNodeIds[i];
                        let res = DagViewManager.Instance.getNodeAndTabById(parentNodeId);
                        if (res.node && res.tab) {
                            parentNode = res.node;
                            parentTab = res.tab;
                            break;
                        }
                    }
                }
                // if tag didn't work, try using retina name
                if ((!parentNode || !parentTab) && id.startsWith("xcRet")) {
                    id = id.slice("xcRet_".length);
                    id = id.slice(0, id.indexOf("_dag"));
                    parentTab = DagTabManager.Instance.getTabById(id);
                }
                if (parentTab) {
                    let sourceTabId = parentTab.getId();
                    DagTabManager.Instance.switchTab(sourceTabId);
                    if (parentNode) {
                        let $node = DagViewManager.Instance.selectNodes(sourceTabId, [parentNode.getId()]);
                        $node.scrollintoview({duration: 0});
                    } else {
                        Alert.error("Warning", "The original module is \"" + parentTab.getName() + "\" but the source node could not be found.");
                    }
                } else {
                    Alert.error("Warning", "Source node could not be found.");
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _findOptimizedSource(tabId: string): void {
        try {
            let dagTab: DagTabOptimized = <DagTabOptimized>DagList.Instance.getDagTabById(tabId);
            let srcTab = dagTab.getSourceTab();
            if (srcTab == null) {
                Alert.error(AlertTStr.Error, "Cannot find the original source of the optimized dataflow");
            } else {
                Alert.show({
                    title: "Original source for optimized application",
                    msg: `The original module is: "${srcTab.getName()}"`,
                    isAlert: true
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _getNodeFromId(id: DagNodeId): DagNode {
        return DagViewManager.Instance.getActiveDag().getNode(id);
    }

    function _showPasteAlert() {
        let pasteKey: string = isSystemMac ? "⌘V" : "\"CTRL\" + \"V\"";
        Alert.show({
            title: "Paste",
            msg: "You must use " + pasteKey + " to paste."
        });
    }

    function _restoreDatasetFromNode(node: DagNodeDataset): void {
        try {
            const lodArgs = node.getLoadArgs();
            if (!lodArgs) {
                let $node = DagViewManager.Instance.getNode(node.getId());
                StatusBox.show(ErrTStr.RestoreDSNoLoadArgs, $node);
            } else {
                const shareDS: boolean = DagViewManager.Instance.getActiveTab() instanceof DagTabPublished;
                DS.restoreSourceFromDagNode([node], shareDS)
                .then(() => {
                    node.beConfiguredState();
                });
            }
        } catch (e) {
            console.error(e);
            let $node = DagViewManager.Instance.getNode(node.getId());
            StatusBox.show(e.message, $node);
        }
    }

    function _restoreAllDatasets(): void {
        try {
            let tab: DagTab = DagViewManager.Instance.getActiveTab();
            let graph: DagGraph = tab.getGraph();
            let dagNodes: DagNodeDataset[] = [];
            graph.getAllNodes().forEach((dagNode: DagNode) => {
                if (dagNode instanceof DagNodeDataset) {
                    let dsName = dagNode.getDSName();
                    if (DS.getDSObj(dsName) == null) {
                        dagNodes.push(dagNode);
                    }
                }
            });
            if (dagNodes.length) {
                let shareDS: boolean = (tab instanceof DagTabPublished);
                DS.restoreSourceFromDagNode(dagNodes, shareDS);
            } else {
                Alert.show({
                    title: AlertTStr.Title,
                    msg: DSTStr.NoSourcesToRestore,
                    isAlert: true
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _showDagSchemaPopup(nodeId, tabId) {
        let dagNode = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        if (dagNode == null) {
            console.error("error case");
            return;
        }
        let dagView = DagViewManager.Instance.getActiveDagView();
        let oldPopup = dagView.getSchemaPopup(nodeId);
        if (oldPopup) {
            oldPopup.bringToFront();
        } else {
            let schemaPopup = new DagSchemaPopup(nodeId, tabId);
            dagView.addSchemaPopup(schemaPopup);
        }
    }

}