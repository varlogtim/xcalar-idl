namespace DagNodeMenu {
    let position: Coordinate;
    let curNodeId: DagNodeId;
    let curParentNodeId: DagNodeId;
    let curConnectorIndex: number;

    export function setup() {
        _setupNodeMenu();
        _setupNodeMenuActions();
        _setupInstructionNodeCategories();

        const tooltipMap = {
            configureNode: "This action opens the operator's configuration panel",
            executeNode: "This action runs the configured operator's operation.",
            executeAllNodes: "This action runs all the operations in a module.",
            createNodeOptimized: "This action gives a preview of how your application will run in Production.<br>An optimized application contains no intermediate tables, which reduces memory consumption, creates a faster runtime, and provides optimal performance when used in your production platform.",
            reexecuteNode: "This action regenerates your intermediate table results for this operator.",
            deleteAllTables: "WARNING: This action deletes your intermediate table results for all functions in a module. All the operators configuration settings remain unchanged.",
            copyNodes: "This action copies the selected graph-node or graph-nodes, and connectors. Configuration settings remain but Intermediate table results are removed.",
            cutNodes: "This action removes the graph-node and its links. Unlike the Delete option, the graph-node is saved to the clip-board buffer.",
            pasteNodes: "This action pastes the copied graph-node or graph-nodes and connectors into a new or existing function of module. Configuration settings remain but intermediate table results are removed.",
            copyTableName: "This action copies the name of the selected table",
            duplicateDf: "This action creates a copy of the module, including configuration settings, in a new Module tab.",
            selectAll: "This action selects all the operators and comments within the module.",
            findOptimizedSource: "This action opens the Module Lineage window, which displays the name of the module that was used for the optimized application.",
            findSourceNode: "This action opens the Operator Lineage window, which displays the history of the selected graph-node, including the originating custom operator and the module that was used for the optimized application.",
            viewSchemaChanges: "This action opens the schema window and displays the current new, deleted, and updated columns and data types.",
            createCustom: "This action creates an operator from one or multiple graph-nodes for reuse. Custom operators keep their original configuration settings.<br>" +
                            "To create a Custom operator:<br>" +
                            "From a function, select the one or more graph-nodes that you require for a Custom operator and then right-click and select Create Custom Operator. Right-click again and select Save As a Custom Operator, which populates the Custom operator bar with the new Custom operator.<br>" +
                            "To name or rename the operator:<br>" +
                            "From the Custom operator bar, select the Custom operator and then click the Edit Name icon on the left of the Operator bar. In the Edit Name dialog box, enter a name for your Custom operator and click Save.",
            autoAlign: "This action rearranges the graph-nodes for each function in a straight line in your module.",
            description: "This action creates a description, which is displayed in the left planel when you select a graph-node.",
            newComment: "This action opens a text box for entering comments about your function or module.",
            inspectSQL: "This action provides debugging capabilities by inspecting your SQL statements within the SQL operator. When selected the original SQL graph-node stays in the module and a new SQL module tab is created containing the operators present in the SQL statement.",
            editCustom: "This action provides debugging capabilities by inspecting your Custom operator. When selected the original Custom graph-node stays in the module and a new Custom module tab is created containing the operators present in the Custom operator. Changes to the operations in this Custom module tab are reflected in the original Custom operator.",
            expandSQL: "Unlike Inspect, this action replaces the selected Custom or SQL operator in the module with individual graph-nodes for each operation.",
            removeNode: "This action permanently removes the graph-node.",
            removeAllNodes: "This action permanently removes the operators and functions from a module.",
            removeInConnection: "This action deletes the connection between two graph-nodes.",
            restoreSource: "This action regenerates the source table by reloading data from your source repository.",
            restoreAllSource: "This action regenerates all the source tables by reloading data from your source repository.",
            download: "Saves the module outside of Notebook as one of three formats: Xcalar module format, PNG, and JSON.",
            exitOp: "This action closes the operator’s configuration panel. IMPORTANT: There is no autosave or warning message for unsaved changes."
        };
        let $menus = _getDagNodeMenu().add(_getDagTableMenu());
        for (let key in tooltipMap) {
            let $li = $menus.find("." + key);
            if ($li.length) {
                xcTooltip.add($li, {
                    title: tooltipMap[key]
                });
            }
        }
    }

    export function updateExitOptions(name) {
        let $menu = _getDagNodeMenu();
        let $li = $menu.find(".exitOp");
        $li.attr("class", "exitOp");
        $li.find(".label").text('Exit ' + name + ' Configuration');
        $li.addClass('exit' + name.replace(/ /g,''));
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
                let lockedTable = DagViewManager.Instance.getActiveDag().checkForChildLocks(nodesToCheck);
                if (lockedTable) {
                    Alert.error(DFTStr.LockedTableWarning,
                        DFTStr.LockedTableMsg,
                        {detail: `Pinned Table: ${lockedTable}`}
                    );
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
        xcMenu.add(_getDagNodeMenu());
        xcMenu.add(_getDagTableMenu());
        xcMenu.add(_getInstructionMenu());

        let $dfWrap = _getDFWrap();
        let $dfWraps = $dfWrap;

        $dfWraps.on("contextmenu", ".operator.instruction", function(event) {
            _showNodeInstructionMenu(event);
        });

        $dfWraps.on("contextmenu", ".operator .main", function(event: JQueryEventObject) {
            let $operatorMain = $(this);
            if ($operatorMain.closest(".operator.instruction").length) {
                _showNodeInstructionMenu(event);
                return false;
            }
            _showNodeMenu(event, $operatorMain);
            return false; // prevent default browser's rightclick menu
        });

        $dfWraps.on("contextmenu", function(event: JQueryEventObject) {
            const $target = $(event.target);
            if ($target.closest(".operator.instruction").length) {
                _showNodeInstructionMenu(event);
                return false;
            }
            _showNodeMenu(event, null);
            return false;
        });

        $dfWraps.on("contextmenu", ".operator .table, .operator .tblIcon, .operator .nodeIcon", function(event: JQueryEventObject) {
            _showNodeMenu(event, $(this));
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

    function _setupInstructionNodeCategories(): void {
        updateCategories();
        $("#dagNodeInstructionSubMenu").on("mouseup", "li", function(event) {
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            const $li: JQuery = $(this);
            const opid: string = $li.data('opid');
            const newNodeInfo: DagNodeCopyInfo = DagCategoryBar.Instance.getOperatorInfo(opid);
            const type: DagNodeType = newNodeInfo.type;
            const subType: DagNodeSubType = newNodeInfo.subType;
            DagViewManager.Instance.removeInstructionNode({
                type: type,
                subType: subType
            });
        });
    }

    export function updateCategories() {
        const dagCategories = DagCategoryBar.Instance.getCategories();
        const iconMap = DagCategoryBar.Instance.getCategoryIconMap();
        let menuHtml: HTML = "";
        let subMenuHtml: HTML = "";
        dagCategories.getCategories().forEach((category: DagCategory) => {
            if (category.getType() === DagCategoryType.Hidden ||
                category.getType() === DagCategoryType.Custom) {
                return;
            }

            const categoryType: DagCategoryType = category.getType();
            const categoryName: string = category.getName();
            const description: string = category.getDescription();
            const icon: string = iconMap[categoryType];
            const operators: DagCategoryNode[] = category.getSortedOperators();
            let subMenuPart: HTML = "";

            operators.forEach((categoryNode: DagCategoryNode) => {
                if (categoryNode.isHidden()) {
                    return;
                }
                const operator: DagNode = categoryNode.getNode();
                const operatorName: string = categoryNode.getNodeType();
                let opDisplayName: string = categoryNode.getDisplayNodeType();
                const icon: string = categoryNode.getIcon();
                const description: string = categoryNode.getDescription();
                subMenuPart += `<li class="operator ${operatorName}" data-opid="${operator.getId()}"
                                ${xcTooltip.Attrs} data-delay="700" data-original-title="${description}">
                                    <i class="icon operatorIcon ${icon}">${icon}</i>
                                    <span class="label">${opDisplayName}</span>
                            </li>`;
            });
            if (subMenuPart.length) {
                subMenuHtml += `<ul class="category-${categoryType}">${subMenuPart}</ul>`;

                menuHtml += `<li class="category category-${categoryType} parentMenu"
                        data-submenu="category-${categoryType}"
                        ${xcTooltip.Attrs} data-delay="700" data-original-title="${description}" >
                            <i class="icon categoryIcon ${icon}"></i>
                            <span class="label">${categoryName}</span>
                        </li>`;
            }
        });
        _getInstructionMenu().find("ul").html(menuHtml);
        $("#dagNodeInstructionSubMenu").html(subMenuHtml);

        _getDagTableSubMenu().find("ul").html(menuHtml);
        $("#dagTableNodeSubSubMenu").html(subMenuHtml);
    }


    function _processMenuAction(
        action: string,
        options?: {
            node?: DagNode,
            autofillColumnNames?: string[],
            exitCallback?: Function, // when config panel is exited without saving
            bypassResetAlert?: boolean
        }
    ) {
        try {
            let nodeId: DagNodeId;
            let nodeIds: DagNodeId[];
            let dagNodeIds: DagNodeId[];
            let node: DagNode;
            options = options || {};
            if (options.node) {
                nodeId = options.node.getId();
                nodeIds = [options.node.getId()];
                dagNodeIds = [options.node.getId()];
            } else {
                nodeId = curNodeId;
                nodeIds = DagViewManager.Instance.getSelectedNodeIds(true, true); // includes comments
                dagNodeIds = DagViewManager.Instance.getSelectedNodeIds(true); // dag nodes only
            }
             // all selected nodes && comments
            const tabId = DagViewManager.Instance.getActiveDag().getTabId();
            const parentNodeId: DagNodeId = curParentNodeId
            const connectorIndex: number = curConnectorIndex;
            let dagTab: DagTab;
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
                case ("selectAll"):
                    DagViewManager.Instance.selectNodes(DagViewManager.Instance.getActiveDag().getTabId());
                    break;
                case ("findSourceNode"):
                    _findSourceNode(dagNodeIds[0], tabId);
                    break;
                case ("findOptimizedSource"):
                    _findOptimizedSource(tabId);
                    break;
                case ("download"):
                    dagTab = DagList.Instance.getDagTabById(tabId);
                    if (dagTab == null) {
                        // when it's sub tab
                        dagTab = DagTabManager.Instance.getTabById(tabId);
                    }
                    if (dagTab != null) {
                        DFDownloadModal.Instance.show(dagTab);
                    }
                    break;
                case ("duplicateDf"): {
                    dagTab = DagList.Instance.getDagTabById(tabId);
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
                    _handlePaste();
                    break;
                case ("copyTableName"):
                    _copyTableName(nodeId);
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
                case ("deleteTable"):
                    DagViewManager.Instance.reset(dagNodeIds, options.bypassResetAlert,
                                                  action === "deleteTable");
                    break;
                case ("deleteParentTable"):
                    DagViewManager.Instance.deleteParentTablesFromNode(dagNodeIds[0]);
                    break;
                case ("deleteAllTables"):
                    DagViewManager.Instance.reset(null, options.bypassResetAlert, true);
                    break;
                case ("reexecuteNode"):
                    DagViewManager.Instance.reset(dagNodeIds, true)
                    .then(() => {
                        DagViewManager.Instance.run(dagNodeIds);
                    });
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
                        if (!UserSettings.getPref("dfAutoPreview")) {
                            DagViewManager.Instance.viewResult(nodeToPreview);
                        }
                    });
                    break;
                case ("viewOptimizedDataflow"):
                    DagViewManager.Instance.viewOptimizedDataflow(_getNodeFromId(dagNodeIds[0]), tabId);
                    break;
                case ("viewUDFErrors"):
                    DagUDFErrorModal.Instance.show(dagNodeIds[0]);
                    break;
                case ("viewSkew"):
                    node = _getNodeFromId(dagNodeIds[0]);
                    const $dfArea = DagViewManager.Instance.getActiveArea();
                    let $statsTip = $dfArea.find('.runStats[data-id="' + node.getId() + '"]');
                    SkewInfoModal.Instance.show(null, {tableInfo: $statsTip.data("skewinfo")});
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
                case ("viewSchemaChanges"):
                    _showDagSchemaPopup(dagNodeIds[0], tabId);
                    break;
                case ("viewSchemaTable"):
                    _showDagSchemaPopup(dagNodeIds[0], tabId, true);
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
                case ("updateSQLQuery"):
                    DagViewManager.Instance.updateSQLQuery(dagNodeIds[0]);
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
                case ("pinTable"):
                    DagViewManager.Instance.getActiveDag().getNode(nodeId).pinTable();
                    break;
                case ("unpinTable"):
                    DagViewManager.Instance.getActiveDag().getNode(nodeId).unpinTable();
                    break;
                case ("restoreSource"):
                    _restoreSourceFromNode(DagViewManager.Instance.getActiveDag().getNode(dagNodeIds[0]));
                    break;
                case ("restoreAllSource"):
                    restoreAllSource();
                    break
                case ("editSQLGraph"):
                    dagTab = DagViewManager.Instance.getActiveTab();
                    if (dagTab instanceof DagTabSQLExecute) {
                        DagTabManager.Instance.convertNoEditableTab(dagTab);
                    }
                    break;
                case ("search"):
                    DagSearch.Instance.show();
                    break;
                default:
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _setupNodeMenuActions(): void {
        const $menu: JQuery = _getDagNodeMenu().add(_getDagTableMenu());
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
                case ("deleteAllTables"):
                case ("reexecuteNode"):
                case ("deleteTable"):
                case ("configureNode"):
                    const nodesToCheck = nodeIds.filter((nodeId) => {
                        return !nodeId.startsWith("comment");
                    });
                    let lockedTable = DagViewManager.Instance.getActiveDag().checkForChildLocks(nodesToCheck);
                    if (lockedTable) {
                        Alert.error(DFTStr.LockedTableWarning,
                            DFTStr.LockedTableMsg,
                            {detail: `Pinned Table: ${lockedTable}`}
                        );
                    } else {
                        _preProcessMenuAction(action);
                    }
                    break;
                default:
                    _preProcessMenuAction(action);
                    break;
            }
        });

        $("#dagTableNodeSubSubMenu").on("mouseup", "li", function(event) {
            if (event.which !== 1 || (isSystemMac && event.ctrlKey)) {
                return;
            }
            const $li: JQuery = $(this);
            const opid: string = $li.data('opid');
            const newNodeInfo: DagNodeCopyInfo = DagCategoryBar.Instance.getOperatorInfo(opid);
            const type: DagNodeType = newNodeInfo.type;
            const subType: DagNodeSubType = newNodeInfo.subType;
            const nodeId = DagViewManager.Instance.getSelectedNodeIds(true)[0];
            DagViewManager.Instance.autoAddNode(type, subType, nodeId);
        });
    }

    // check if config panel is open and show alert if so
    function _preProcessMenuAction(action) {
        if (FormHelper.activeForm) {
            switch(action) {
                case ("executeNode"):
                case ("executeAllNodes"):
                case ("executeNodeOptimized"):
                case ("createNodeOptimized"):
                case ("resetNode"):
                case ("deleteAllTables"):
                case ("deleteTable"):
                case ("cutNodes"):
                case ("createCustom"):
                case ("removeNode"):
                case ("removeAllNodes"):
                    Alert.show({
                        title: `Configuration Panel Open`,
                        msg: `This action cannot be performed while the ${FormHelper.activeFormName} configuration panel is open. Do you want to exit the panel and proceed?`,
                        onConfirm: () => {
                            DagConfigNodeModal.Instance.closeForms();
                            _processMenuAction(action, {bypassResetAlert: true});
                        }
                    });
                    break;
                default:
                    _processMenuAction(action);
                    break;
            }
        } else {
            _processMenuAction(action);
        }

    }

    function exitOpPanel(ignoreSQLChange?: boolean): void {
        if (!ignoreSQLChange && OldSQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    exitOpPanel(true);
                }
            });
        } else {
            DagConfigNodeModal.Instance.closeForms();
        }
    }

    function _getDFWrap(): JQuery {
        return $("#dagView").find(".dataflowWrap");
    }

    function _getDagNodeMenu(): JQuery {
        return $("#dagNodeMenu");
    }

    function _getDagTableMenu(): JQuery {
        return $("#dagTableNodeMenu");
    }

    function _getDagTableSubMenu(): JQuery {
        return $("#dagTableNodeSubMenu");
    }

    function _getInstructionMenu(): JQuery {
        return $("#dagNodeInstructionMenu");
    }

    function expandSQLNode(
        dagNodeId: DagNodeId,
        ignoreSQLChange?: boolean
    ): void {
        if (!ignoreSQLChange && OldSQLOpPanel.Instance.hasUnsavedChange()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.UnsavedSQL,
                onConfirm: () => {
                    expandSQLNode(dagNodeId, true);
                }
            });
        } else if (!OldSQLOpPanel.Instance.getAlertOff()) {
            Alert.show({
                title: "SQL",
                msg: SQLTStr.ExpandSQL,
                onConfirm: (checked) => {
                    OldSQLOpPanel.Instance.setAlertOff(checked);
                    DagViewManager.Instance.expandSQLNode(dagNodeId);
                    OldSQLOpPanel.Instance.close();
                },
                isCheckBox: true
            });
        } else {
            DagViewManager.Instance.expandSQLNode(dagNodeId);
            OldSQLOpPanel.Instance.close();
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
            OldSQLOpPanel.Instance.hasUnsavedChange()) {
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
        const tabId: string = DagViewManager.Instance.lockConfigNode(nodeId);
        const dagTab: DagTab = DagViewManager.Instance.getActiveTab();

        options = options || {};
        // when menu closes, regardless if it's saved, unlock the node
        options = $.extend(options, {
            closeCallback: function() {
                DagViewManager.Instance.unlockConfigNode(node.getId(), tabId);
                Log.unlockUndoRedo();
                DagGraphBar.Instance.unlock();
                DagTabManager.Instance.unlockTab(tabId);
            }
        });
        DagConfigNodeModal.Instance.closeForms(); // close opened forms first

        Log.lockUndoRedo();
        DagTabManager.Instance.lockTab(tabId);
        DagGraphBar.Instance.lock();

        // Nodes in SQL sub graph can't be configured
        if (dagTab instanceof DagTabSQL) {
            options.nonConfigurable = true;
        }
        if ([DagNodeType.Map, DagNodeType.GroupBy, DagNodeType.Filter,
            DagNodeType.Aggregate].indexOf(type) > -1) {
            options.udfDisplayPathPrefix = UDFFileManager.Instance.getCurrWorkbookDisplayPath();
        }

        DagConfigNodeModal.Instance.show(node, tabId, $node, options);
    }

    function _showEdgeMenu($edge: JQuery, event: JQueryEventObject): void {
        _resetMenu();
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
        curNodeId = nodeId;
        curParentNodeId = parentNodeId;
        curConnectorIndex = parseInt($edge.attr("data-connectorindex"));
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
        const nodeId: DagNodeId = $clickedEl.data("nodeid");
        let $menu = _getDagNodeMenu();
        curNodeId = nodeId;

        let classes: string = " commentMenu ";
        $menu.find("li").removeClass("unavailable");

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

        let tableNodeClicked: boolean = false;
        let nodeId: DagNodeId;
        if ($clickedEl && $clickedEl.length) {
            nodeId = $clickedEl.closest(".operator").data("nodeid");
            if ($clickedEl.closest(".table").length ||
                $clickedEl.closest(".tblIcon").length) {
                tableNodeClicked = true;
            }
        } else {
            nodeId = nodeIds[0];
            backgroundClicked = true;
        }

        let $menu: JQuery;
        if (tableNodeClicked || ($operators.length &&
            $operators.find(".selection-table").length === $operators.length)) {
            $menu = _getDagTableMenu();
        } else {
            $menu = _getDagNodeMenu();
        }

        curNodeId = nodeId;
        $menu.find("li").removeClass("unavailable");
        $menu.find(".resetNode").addClass("xc-hidden");

        let classes: string = "";
        if (DagViewManager.Instance.isDisableActions()) {
            // .nonEditableSubgraph hides all modification menu item
            classes += ' nonEditableSubgraph ';
        }
        if (DagViewManager.Instance.isViewOnly()) {
            classes += ' viewOnly ';
        }
        let activeTab: DagTab = DagViewManager.Instance.getActiveTab();
        if (activeTab instanceof DagTabSQLExecute) {
            classes += ' viewOnly SQLExecuteTab ';
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
        if (activeTab.getType() === DagTabType.User) {
            classes += " userTab ";
        }

        if ($dfArea.find(".comment.selected").length) {
            classes += " commentMenu ";
        }

        if (!DagViewManager.Instance.getAllNodes().length) {
            classes += " none ";
            $menu.find(".removeAllNodes, .deleteAllTables, .executeAllNodes, .selectAll, .autoAlign")
            .addClass("unavailable");
        }
        if ($dfArea.find(".comment").length) {
            $menu.find(".removeAllNodes").removeClass("unavailable");
        }

        if (nodeIds.length) {
            classes += " operatorMenu "
            if (nodeIds.length === 1) {
                classes += " single ";
                const extraClasses: string = _adjustMenuForSingleNode($menu, nodeIds[0]);
                classes += extraClasses + " ";
            } else {
                classes += " multiple ";
                $menu.find(".reexecuteNode").addClass("xc-hidden");
            }
        } else {
            classes += " backgroundMenu ";
        }
        if (backgroundClicked) {
            $menu.find(".autoAlign, .selectAll").removeClass("xc-hidden");
        } else {
            $menu.find(".autoAlign, .selectAll").addClass("xc-hidden");
        }

        for (let i = 0; i < nodeIds.length; i++) {
            if (DagViewManager.Instance.isNodeLocked(nodeIds[i])) {
                $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                      ".executeNodeOptimized, .createNodeOptimized," +
                      ".resetNode, .deleteTable, .cutNodes, .removeNode, " +
                      ".removeAllNodes, .editCustom, .createCustom")
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
            if (nodeIds.length === 1) {
                const dagGraph: DagGraph = DagViewManager.Instance.getActiveDag();
                const dagNode: DagNode = dagGraph.getNode(nodeId);
                const state: DagNodeState = (dagNode != null) ? dagNode.getState() : null;
                if (state === DagNodeState.Complete) {
                    $menu.find(".executeNode").addClass("xc-hidden");
                }
            }
        }

        if (DagViewManager.Instance.hasOptimizableNode(optNodeIds)) {
            $menu.find(".createNodeOptimized").removeClass("xc-hidden");
        } else {
            $menu.find(".createNodeOptimized").addClass("xc-hidden");
        }

        if (!nodeIds.length && DagViewManager.Instance.getActiveDag().isNoDelete()) {
            $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                        ".executeNodeOptimized, .createNodeOptimized" +
                        ".resetNode, .deleteTable, .cutNodes, .removeNode, " +
                        ".removeAllNodes, .editCustom")
                .addClass("unavailable");
        }

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

    function _adjustMenuForSingleNode($menu: JQuery, nodeId): string {
        const $dfArea: JQuery = DagViewManager.Instance.getActiveArea();
        const dagGraph: DagGraph = DagViewManager.Instance.getActiveDag();
        const dagNode: DagNode = dagGraph.getNode(nodeId);
        const state: DagNodeState = (dagNode != null) ? dagNode.getState() : null;
        let classes = "";

        // display viewResults or generateResult
        if (dagNode != null &&
            state === DagNodeState.Complete
        ) {
            const table: string = dagNode.getTable();
            const dagTab: DagTab = DagViewManager.Instance.getActiveTab();
            if (dagTab instanceof DagTabSQLExecute && dagNode.getChildren().length > 0) {
                // when it's SQL graph and is not the last node
                $menu.find(".viewResult, .generateResult, .viewSkew").addClass("xc-hidden");
            } else if (table != null && DagTblManager.Instance.hasTable(table)) {
                $menu.find(".generateResult").addClass("xc-hidden");
                $menu.find(".viewResult, .copyTableName").removeClass("xc-hidden unavailable");
                $menu.find(".viewSkew").removeClass("xc-hidden");
            } else {
                $menu.find(".viewResult, .viewSkew").addClass("xc-hidden");
                $menu.find(".generateResult").removeClass("xc-hidden unavailable");
                if (table == null) {
                    $menu.find(".copyTableName").addClass("unavailable");
                } else {
                    $menu.find(".copyTableName").removeClass("xc-hidden unavailable");
                }
            }
        } else {
            $menu.find(".viewResult, .viewSkew").addClass("xc-hidden");
            $menu.find(".generateResult").removeClass("xc-hidden");
            $menu.find(".generateResult, .copyTableName").addClass("unavailable");
        }
        // show skew option
        let $statsTip = $dfArea.find('.runStats[data-id="' + dagNode.getId() + '"]');
        if ($statsTip.length && $statsTip.data("skewinfo")) {
            $menu.find(".viewSkew").removeClass("xc-hidden");
        } else {
            $menu.find(".viewSkew").addClass("xc-hidden");
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
            $menu.find(".viewSkew").addClass("xc-hidden");
            $menu.find('.viewResult .label').text("View Aggregate Value");
            if (state === DagNodeState.Complete &&
                aggNode.getAggVal() != null
            ) {
                $menu.find(".viewResult").removeClass("unavailable");
            } else {
                $menu.find(".viewResult").addClass("unavailable");
            }
        } else {
            $menu.find('.viewResult .label').text("View Table");
        }
        // link node option
        if (dagNode != null && dagNodeType === DagNodeType.DFIn) {
            classes += " linkInMenu";
        }
        if (dagNode.isOutNode() || dagNode instanceof DagNodeSort) {
            classes += " noChildAllowed";
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
        }
        // table option
        if (dagNode != null && dagNodeType === DagNodeType.IMDTable) {
            classes += " imdTableMenu";
            const node: DagNodeIMDTable = <DagNodeIMDTable>dagNode;
            const tableName: string = node.getSource();
            if (node.getState() !== DagNodeState.Unused &&
                !PTblManager.Instance.hasTable(tableName)) {
                $menu.find(".restoreSource").removeClass("xc-hidden");
            } else {
                $menu.find(".restoreSource").addClass("xc-hidden");
            }
        }

        if (dagNode != null && (dagNodeType === DagNodeType.PublishIMD)) {
            classes += " publishMenu";
        }

        // lock/unlock option
        if (dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null && DagTblManager.Instance.hasLock(dagNode.getTable())
        ) {
            $menu.find(".pinTable").addClass("unavailable xc-hidden");
            $menu.find(".unpinTable").removeClass("unavailable xc-hidden");
        } else if (dagNode != null &&
            state === DagNodeState.Complete &&
            dagNode.getTable() != null &&
            DagTblManager.Instance.hasTable(dagNode.getTable())
        ) {
            $menu.find(".unpinTable").addClass("unavailable xc-hidden");
            $menu.find(".pinTable").removeClass("unavailable xc-hidden");
        } else {
            $menu.find(".pinTable").addClass("unavailable").removeClass("xc-hidden");
            $menu.find(".unpinTable").addClass("unavailable xc-hidden");
        }


        if (state === DagNodeState.Configured || state === DagNodeState.Error) {
            $menu.find(".executeNode, .executeNodeOptimized, .generateResult").removeClass("unavailable");
            $menu.find(".reexecuteNode").addClass("xc-hidden");
        } else {
            $menu.find(".executeNode, .executeNodeOptimized").addClass("unavailable");
        }
        if (state === DagNodeState.Complete) {
            $menu.find(".resetNode, .deleteTable, .reexecuteNode").removeClass("unavailable");
            $menu.find(".reexecuteNode").removeClass("xc-hidden");
            $menu.find(".executeNode").addClass("xc-hidden");
        } else {
            if (dagNode instanceof DagNodeOutOptimizable && (state === DagNodeState.Configured ||
                state === DagNodeState.Error)) {
                $menu.find(".resetNode, .deleteTable, .reexecuteNode").removeClass("unavailable");
            } else {
                $menu.find(".resetNode, .deleteTable").addClass("unavailable");
                $menu.find(".reexecuteNode").addClass("xc-hidden");
                $menu.find(".executeNode").removeClass("xc-hidden");
            }
        }
        if (dagNode instanceof DagNodeDFOut && dagNode.isOptimized()) {
            $menu.find(".resetNode").removeClass("xc-hidden");
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

        if (dagNode != null && dagNodeType === DagNodeType.SQLFuncOut) {
            $menu.find('.configureNode').addClass('unavailable');
        }

        if (dagNodeType === DagNodeType.SQL) {
            classes += ' SQLOpMenu';
            _checkSQLQuery(dagNode, $menu);
        } else {
            $menu.find(".updateSQLQuery").addClass("xc-hidden");
        }

        if (DagViewManager.Instance.isNodeLocked(nodeId)) {
            $menu.find(".configureNode, .executeNode, .executeAllNodes, " +
                      ".generateResult, .executeNodeOptimized, .createNodeOptimized," +
                      ".resetNode, .deleteTable, .cutNodes, .removeNode, .removeAllNodes, .editCustom")
                .addClass("unavailable");
        }
        return classes;
    }

    function _showNodeInstructionMenu(event: JQueryEventObject) {
        const $dfArea = DagViewManager.Instance.getActiveArea();
        if (!$dfArea.length || $dfArea.hasClass("largeHidden")) {
            return;
        }

        let $menu: JQuery = _getInstructionMenu();

        position = {x: event.pageX, y: event.pageY};

        MenuHelper.dropdownOpen($(event.target), $menu, {
            mouseCoors: {x: event.pageX, y: event.pageY},
            offsetY: 8,
            floating: true,
            classes: ""
        });
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

    // for optimized dataflows
    function _findSourceNode(nodeId: DagNodeId, tabId: string): void {
        DFNodeLineagePopup.Instance.show({nodeId, tabId});
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
                    isAlert: true,
                    isInfo: true
                });
            }
        } catch (e) {
            console.error(e);
        }
    }

    function _getNodeFromId(id: DagNodeId): DagNode {
        return DagViewManager.Instance.getActiveDag().getNode(id);
    }

    async function _handlePaste() {
        try {
            // will go to catch clause if .readText is not supported
            const text = await navigator["clipboard"].readText();
            DagViewManager.Instance.paste(text);
        } catch (e) {
            let pasteKey: string = isSystemMac ? "⌘V" : "\"CTRL\" + \"V\"";
            Alert.show({
                title: "Paste",
                msg: "You must use " + pasteKey + " to paste."
            });
        }
    }

    function _restoreSourceFromNode(node: DagNode): void {
        if (node instanceof DagNodeIMDTable) {
            _restoreTableFromNode(node);
        }
    }

    async function _restoreTableFromNode(node: DagNodeIMDTable): Promise<void> {
        try {
            await PTblManager.Instance.restoreTableFromNode(node);
            node.beConfiguredState();
        } catch (e) {
            console.error(e);
            let $node = DagViewManager.Instance.getNode(node.getId());
            StatusBox.show(e.message, $node);
        }
    }

    function restoreAllSource(ignoreWarnings?: boolean): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        try {
            let tab: DagTab = DagViewManager.Instance.getActiveTab();
            let graph: DagGraph = tab.getGraph();
            const tableNodes: DagNodeIMDTable[] = [];
            graph.getAllNodes().forEach((dagNode: DagNode) => {
                if (dagNode instanceof DagNodeIMDTable) {
                    tableNodes.push(dagNode);
                }
            });
            const promises: XDPromise<any>[] = tableNodes.map((node) => {
                const promise = PTblManager.Instance.restoreTableFromNode(node);
                return PromiseHelper.convertToJQuery(promise);
            });
            if (promises.length) {
                return PromiseHelper.when(...promises);
            } else {
                if (!ignoreWarnings) {
                    Alert.show({
                        title: AlertTStr.Title,
                        msg: DSTStr.NoSourcesToRestore,
                        isAlert: true
                    });
                }

                deferred.reject();
            }
        } catch (e) {
            deferred.reject();
            console.error(e);
        }
        return deferred.promise();
    }

    function _showDagSchemaPopup(nodeId, tabId, fromTable = false) {
        let dagNode = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        if (dagNode == null) {
            console.error("error case");
            return;
        }
        let dagView = DagViewManager.Instance.getActiveDagView();
        let oldPopup = dagView.getSchemaPopup(nodeId, fromTable);
        if (oldPopup) {
            oldPopup.bringToFront();
        } else {
            let schemaPopup = new DagSchemaPopup(nodeId, tabId, fromTable);
            dagView.addSchemaPopup(schemaPopup, fromTable);
        }
    }

    function _resetMenu() {
        curNodeId = null;
        curParentNodeId = null;
        curConnectorIndex = null;
    }

    function _checkSQLQuery(dagNode: DagNodeSQL, $menu: JQuery): void {
        const snippetId: string = dagNode.getParam().snippetId;
        const queryStr: string = dagNode.getParam().sqlQueryStr;
        let isQueryUpdated = false;
        if (snippetId) {
            let snippet = SQLSnippet.Instance.getSnippetObj(snippetId);
            if (snippet) {
                isQueryUpdated = (snippet.snippet === queryStr);
            } else {
                isQueryUpdated = true;
            }
        } else {
            isQueryUpdated = true;
        }
        if (isQueryUpdated) {
            $menu.find(".updateSQLQuery").addClass("xc-hidden");
        } else {
            $menu.find(".updateSQLQuery").removeClass("xc-hidden");
        }
    }

    function _copyTableName(nodeId) {
        const dagNode: DagNode = DagViewManager.Instance.getActiveDag().getNode(nodeId);
        const tableName: string = dagNode.getTable();
        xcUIHelper.copyToClipboard(tableName);
        xcUIHelper.showSuccess("Copied.");
    }
}