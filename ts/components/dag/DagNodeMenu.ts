namespace DagNodeMenu {
    let $dagView: JQuery;
    let $dfWrap: JQuery;

    export function setup() {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        setupNodeMenu();
        setupNodeMenuActions();
    }

    function setupNodeMenu(): void {
        const $menu: JQuery = $("#dagNodeMenu");
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

        function _showEdgeMenu($edge: JQuery, event: JQueryEventObject): void {
            let classes: string = " edgeMenu ";
            xcHelper.dropdownOpen($edge, $menu, {
                mouseCoors: {x: event.pageX, y: event.pageY},
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
            // $operator.addClass("selected");
            let nodeIds = [];
            let $operators: JQuery = $operator.add($dfWrap.find(".operator.selected"));
            $operators.each(function() {
                nodeIds.push($(this).data("nodeid"));
            });
            const nodeId: DagNodeId = $operator.data("nodeid");
            $menu.data("nodeid", nodeId);
            $menu.data("nodeids", nodeIds);
    
            let classes: string = " operatorMenu ";
            if (nodeIds.length > 1) {
                classes += " multiple ";
            } else {
                classes += " single ";
            }
    
            xcHelper.dropdownOpen($clickedEl, $menu, {
                mouseCoors: {x: event.pageX, y: event.pageY},
                floating: true,
                classes: classes
            });
        }
    }

    function setupNodeMenuActions(): void {
        const $menu: JQuery = $("#dagNodeMenu");
        $menu.on("mouseup", "li", function(event) {
            if (event.which !== 1) {
                return;
            }
            const action: string = $(this).data('action');
            if (!action) {
                return;
            }
            const nodeId = $menu.data("nodeid"); // clicked node
            const nodeIds = $menu.data("nodeids"); // all selected nodes
            
            const parentNodeId = $menu.data("parentnodeid");
            const connectorIndex = $menu.data("connectorindex");

            switch (action) {
                case ("removeNode"):
                    DagView.removeNodes(0, nodeIds);
                    break;
                case ("removeInConnection"):
                    DagView.disconnectNodes(parentNodeId, nodeId, connectorIndex);
                    break;
                case ("cloneNode"):
                    DagView.cloneNodes(0, nodeIds);
                    break;
                case ("executeNode"):
                    break;
                case ("configureNode"):
                    const dagGraph = DagView.getActiveDag();
                    const node = dagGraph.getNode(nodeId);
                    if (node.getType() === DagNodeType.Project) {
                        console.log("open project form");
                        // ProjectOpPanel.show(node);
                    }
                    break;
                case ("comment"):
                    break;
                default:
                    break;
            }
        });
    }
}