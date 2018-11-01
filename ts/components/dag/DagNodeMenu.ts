namespace DagNodeMenu {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $menu: JQuery;
    let position: Coordinate;

    export function setup() {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $menu = $("#dagNodeMenu");
        _setupNodeMenu();
        _setupNodeMenuActions();
    }

    export function updateExitOptions(name) {
        var $li = $menu.find(".exitOp");
        $li.attr("class", "exitOp");

        var nameUpper = xcHelper.capitalize(name);
        var label = nameUpper;
        switch (name) {
            case ('groupby'):
                label = 'Group By';
                break;
            default:
                break;
        }
        $li.find(".label").text('Exit ' + label);
        $li.addClass('exit' + nameUpper.replace(/ /g,''));
    }

    export function execute(action, options) {
        switch (action) {
            case("configureNode"):
                configureNode(options.node, options);
                break;
            default:
                break;
        }
    }

    function _setupNodeMenu(): void {
        position = {x: 0, y: 0};
        xcMenu.add($menu);

        $dfWrap.on("contextmenu", ".operator .main", function(event: JQueryEventObject) {
            _showNodeMenu($(this), event);
            return false; // prevent default browser's rightclick menu
        });

        // XXX undecided if we want menu to open on a regular click or just rightclick
        // $dfWrap.on("click", ".operator .main", function(event: JQueryEventObject) {
        //     _showNodeMenu($(this), event);
        // });

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

        $dfWrap.on("contextmenu", function(event: JQueryEventObject) {
            _showBackgroundMenu(event);
            return false;
        });
    }

    function _processMenuAction(action: string) {
        const $menu: JQuery = $("#dagNodeMenu");
        const nodeId: DagNodeId = $menu.data("nodeid"); // clicked node
        const nodeIds: DagNodeId[] = DagView.getSelectedNodeIds(true, true);
        const operatorIds: DagNodeId[] = DagView.getSelectedNodeIds(true);
        // all selected nodes && comments

        const parentNodeId: DagNodeId = $menu.data("parentnodeid");
        const connectorIndex: number = parseInt($menu.data("connectorindex"));

        switch (action) {
            case ("removeNode"):
                DagView.removeNodes(nodeIds);
                break;
            case ("removeAllNodes"):
                Alert.show({
                    title: DagTStr.RemoveAllOperators,
                    msg: DagTStr.RemoveAllMsg,
                    onConfirm: function() {
                        const nodes: Map<DagNodeId, DagNode> = DagView.getActiveDag().getAllNodes();
                        let nodeIdsToRemove: DagNodeId[] = [];
                        nodes.forEach((_node: DagNode, nodeId: DagNodeId) => {
                            nodeIdsToRemove.push(nodeId);
                        });
                        const comments: Map<CommentNodeId, CommentNode> = DagView.getActiveDag().getAllComments();
                        comments.forEach((_node: CommentNode, nodeId: CommentNodeId) => {
                            nodeIdsToRemove.push(nodeId);
                        });
                        DagView.removeNodes(nodeIdsToRemove);
                    }
                });
                break;
            case ("selectAllNodes"):
                DagView.selectNodes();
                break;
            case ("removeInConnection"):
                DagView.disconnectNodes(parentNodeId, nodeId, connectorIndex);
                break;
            case ("copyNodes"):
                DagView.copyNodes(nodeIds);
                break;
            case ("cutNodes"):
                DagView.cutNodes(nodeIds);
                break;
            case ("pasteNodes"):
                DagView.pasteNodes();
                break;
            case ("executeNode"):
                DagView.run(operatorIds);
                break;
            case ("executeAllNodes"):
                DagView.run();
                break;
            case ("executeNodeOptimized"):
                DagView.run(operatorIds, true);
                break;
            case ("executeAllNodesOptimized"):
                DagView.run(null, true);
                break;
            case ("resetNode"):
                DagView.reset(operatorIds);
                break;
            case ("resetAllNodes"):
                DagView.reset();
                break;
            case ("configureNode"):
                const node: DagNode = DagView.getActiveDag().getNode(operatorIds[0]);
                configureNode(node);
                break;
            case ("previewTable"):
                DagView.previewTable(operatorIds[0]);
                break;
            case ("previewAgg"):
                DagView.previewAgg(nodeIds[0]);
                break;
            case ("generateTable"):
                DagView.run(operatorIds).then(() => {
                    DagView.previewTable(operatorIds[0]);
                });
                break;
            case ("description"):
                DagDescriptionModal.Instance.show(operatorIds[0]);
                break;
            case ("newComment"):
                const scale = DagView.getActiveDag().getScale();
                const rect = $dfWrap.find(".dataflowArea.active .dataflowAreaWrapper")[0].getBoundingClientRect();
                const x = (position.x - rect.left - DagView.gridSpacing) / scale;
                const y = (position.y - rect.top - DagView.gridSpacing) / scale;
                DagView.newComment({
                    position: {x: x, y: y}
                }, true);
                break;
            case ("autoAlign"):
                DagView.autoAlign();
                break;
            case ("viewSchema"):
                DagSchemaPopup.Instance.show(nodeIds[0]);
                break;
            case ("exitOpPanel"):
                MainMenu.closeForms();
                break;
            case ("createCustom"):
                DagView.wrapCustomOperator(nodeIds);
                break;
            case ("editCustom"):
                DagView.editCustomOperator(operatorIds[0]);
                break;
            case ("shareCustom"):
                DagView.shareCustomOperator(operatorIds[0]);
                break;
            case ("inspectSQL"):
                DagView.inspectSQLNode(operatorIds[0]);
                break;
            case ("expandSQL"):
                DagView.expandSQLNode(operatorIds[0]);
                break;
            case ("zoomIn"):
                DagView.zoom(true);
                break;
            case ("zoomOut"):
                DagView.zoom(false);
                break;
            case ("findLinkOut"):
                DagView.findLinkOutNode(nodeId);
                break;
            case ("lockTable"):
                DagView.getActiveDag().getNode(operatorIds[0]).setTableLock();
                break;
            case ("unlockTable"):
                DagView.getActiveDag().getNode(operatorIds[0]).setTableLock();
                break;
            default:
                break;
        }
    }

    function _setupNodeMenuActions(): void {
        const $menu: JQuery = $("#dagNodeMenu");
        $menu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            const $li: JQuery = $(this);
            const action: string = $li.data('action');
            if ($li.hasClass("unavailable") || !action) {
                return;
            }
            const nodeIds: DagNodeId[] = DagView.getSelectedNodeIds(true, true);

            // Alert for locking tables
            switch (action) {
                case ("removeNode"):
                case ("removeAllNodes"):
                case ("removeInConnection"):
                case ("resetNode"):
                case ("resetAllNodes"):
                case ("configureNode"):
                    const nodesToCheck = nodeIds.filter((nodeId) => {
                        return nodeId.startsWith("dag");
                    });
                    if (DagView.getActiveDag().checkForChildLocks(nodesToCheck)) {
                        Alert.show({
                            title: DFTStr.LockedTableWarning,
                            msg: xcHelper.replaceMsg(DFTStr.LockedTableMsg, {action: action}),
                            onConfirm: () => {
                                _processMenuAction(action);
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

    function configureNode(node: DagNode, options?) {
        const nodeId: string = node.getId();
        if (DagView.isNodeLocked(nodeId)) {
            return;
        }
        const type: DagNodeType = node.getType();
        const subType: DagNodeSubType = node.getSubType();
        options = options || {};
        options = $.extend(options, {
           closeCallback: function() {
               unlock();
           }
        });

        DagView.lockNode(nodeId);
        Log.lockUndoRedo();
        DagTopBar.Instance.lock();
        MainMenu.closeForms(); // close opened forms first
        // Nodes in SQL sub graph can't be configured
        if (DagView.getActiveTab() instanceof DagTabSQL) {
            options.nonConfigurable = true;
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
            default:
                unlock();
                throw new Error("Unsupported type");
        }

        function unlock() {
            DagView.unlockNode(node.getId());
            Log.unlockUndoRedo();
            DagTopBar.Instance.unlock();
        }
    }

    function _showEdgeMenu($edge: JQuery, event: JQueryEventObject): void {
        if (DagView.isDisableActions()) {
            return;
        }
        let classes: string = " edgeMenu ";
        xcHelper.dropdownOpen($edge, $menu, {
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
    }

    function _showNodeMenu($clickedEl: JQuery, event: JQueryEventObject): void {
        const $operator: JQuery = $clickedEl.closest(".operator");
        let nodeIds = [];
        let $operators: JQuery = $operator.add(DagView.getSelectedNodes());
        $operators.each(function() {
            nodeIds.push($(this).data("nodeid"));
        });
        const nodeId: DagNodeId = $operator.data("nodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);

        let classes: string = " operatorMenu ";
        if (DagView.isDisableActions()) {
            // .nonEditableSubgraph hides all modification menu item
            classes += ' nonEditableSubgraph ';
        }
        if (DagView.isViewOnly()) {
            classes += ' viewOnly ';
        }
        $menu.find("li").removeClass("unavailable");

        if (nodeIds.length === 1) {
            classes += " single ";
            const extraClasses: string = adjustMenuForSingleNode(nodeIds[0]);
            classes += extraClasses + " ";
        }  else {
            classes += " multiple ";
        }
        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment.selected").length) {
            classes += " commentMenu ";
        }
        if (!DagView.hasOptimizedNode(nodeIds)) {
            $menu.find(".executeNodeOptimized, .executeAllNodesOptimized").addClass("unavailable");
        }
        adjustMenuForOpenForm();

        xcHelper.dropdownOpen($clickedEl, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function _showCommentMenu($clickedEl: JQuery, event: JQueryEventObject): void {
        let nodeIds = DagView.getSelectedNodeIds();
        const nodeId: DagNodeId = $(this).data("nodeid");
        $menu.data("nodeid", nodeId);
        $menu.data("nodeids", nodeIds);

        let classes: string = " commentMenu ";
        $menu.find("li").removeClass("unavailable");
        adjustMenuForOpenForm();

        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }

        xcHelper.dropdownOpen($clickedEl, $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function _showBackgroundMenu(event: JQueryEventObject) {
        let classes: string = "";
        if (DagView.isDisableActions()) {
            // .nonEditableSubgraph hides all modification menu item
            classes += ' nonEditableSubgraph ';
        }
        let operatorIds = DagView.getSelectedNodeIds();
        $menu.find("li").removeClass("unavailable");
        if (!DagView.getAllNodes().length) {
            classes += " none ";
            $menu.find(".removeAllNodes, .executeAllNodes, .executeAllNodesOptimized, .selectAllNodes, .autoAlign")
            .addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment").length) {
            $menu.find(".removeAllNodes").removeClass("unavailable");
        }

        $menu.data("nodeids", operatorIds);

        if (operatorIds.length) {
            classes += " operatorMenu "
            if (operatorIds.length === 1) {
                classes += " single ";
                const extraClasses: string = adjustMenuForSingleNode(operatorIds[0]);
                classes += extraClasses + " ";
            } else {
                classes += " multiple ";
            }
        } else {
            classes += " backgroundMenu ";
        }
        if (DagView.isViewOnly()) {
            classes += ' viewOnly ';
        }
        if (!DagView.hasClipboard()) {
            $menu.find(".pasteNodes").addClass("unavailable");
        }
        if ($("#dagView .dataflowArea.active .comment.selected").length) {
            classes += " commentMenu ";
        }
        if (!DagView.hasOptimizedNode(operatorIds)) {
            $menu.find(".executeNodeOptimized, .executeAllNodesOptimized").addClass("unavailable");
        }
        adjustMenuForOpenForm();

        position = {x: event.pageX, y: event.pageY};

        xcHelper.dropdownOpen($(event.target), $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: classes
        });
    }

    function adjustMenuForSingleNode(nodeId): string {
        const dagGraph: DagGraph = DagView.getActiveDag();
        const dagNode: DagNode = dagGraph.getNode(nodeId);
        const state: DagNodeState = (dagNode != null) ? dagNode.getState() : null;
        const $node: JQuery = DagView.getNode(dagNode.getId());
        let classes = "";
        if (dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null &&
            !$node.find(".tableIcon").length
        ) {
            if (DagTblManager.Instance.hasTable(dagNode.getTable())) {
                $menu.find(".generateTable").addClass("xc-hidden");
                $menu.find(".previewTable").removeClass("xc-hidden");
                $menu.find(".previewTable").removeClass("unavailable");
            } else {
                $menu.find(".previewTable").addClass("xc-hidden");
                $menu.find(".generateTable").removeClass("xc-hidden");
                $menu.find(".generateTable").removeClass("unavailable");
            }
        } else {
            $menu.find(".previewTable").addClass("unavailable");
            $menu.find(".generateTable").addClass("unavailable");
        }
        if (dagNode != null && dagNode.getDescription()) {
            $menu.find(".description .label").text(DagTStr.EditDescription);
        } else {
            $menu.find(".description .label").text(DagTStr.AddDescription);
        }
        const dagNodeType: DagNodeType = dagNode.getType();
        if (dagNode != null && dagNodeType === DagNodeType.Aggregate) {
            const aggNode = <DagNodeAggregate>dagNode;
            classes = "agg";
            if (state === DagNodeState.Complete &&
                aggNode.getAggVal() != null
            ) {
                $menu.find(".previewAgg").removeClass("unavailable");
            } else {
                $menu.find(".previewAgg").addClass("unavailable");
            }
        }
        // link node option
        if (dagNode != null && dagNodeType === DagNodeType.DFIn) {
            classes += " linkInMenu";
            if (state === DagNodeState.Configured ||
                state === DagNodeState.Complete
            ) {
                $menu.find(".findLinkOut").removeClass("unavailable");
            } else {
                $menu.find(".findLinkOut").addClass("unavailable");
            }
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
            dagNode.getTable() != null
        ) {
            $menu.find(".unlockNodeTable").addClass("unavailable");
            $menu.find(".unlockNodeTable").addClass("xc-hidden");
            $menu.find(".lockNodeTable").removeClass("unavailable");
            $menu.find(".lockNodeTable").removeClass("xc-hidden");
        }

        if (state === DagNodeState.Configured || state === DagNodeState.Error) {
            $menu.find(".executeNode, .executeNodeOptimized").removeClass("unavailable");
        } else {
            $menu.find(".executeNode, .executeNodeOptimized").addClass("unavailable");
        }
        if (state === DagNodeState.Complete) {
            $menu.find(".resetNode").removeClass("unavailable");
        } else {
            $menu.find(".resetNode").addClass("unavailable");
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
        if (DagView.isNodeLocked(nodeId)) {
            $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                      ".executeNodeOptimized, .executeAllNodesOptimized, " +
                      ".resetNode, .cutNodes, .removeNode, .removeAllNodes")
                .addClass("unavailable");
        }
        return classes;
    }

    function adjustMenuForOpenForm() {
        if (!FormHelper.activeForm) {
            return;
        }
        $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                    ".executeNodeOptimized, .executeAllNodesOptimized, " +
                    ".resetNode, .resetAllNodes, .cutNodes, .createCustom")
            .addClass("unavailable");
    }
}