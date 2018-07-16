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
            const $operator: JQuery = $(this).closest(".operator");
            let classes = " operatorMenu ";
            xcHelper.dropdownOpen($(this), $menu, {
                mouseCoors: {x: event.pageX, y: event.pageY},
                floating: true,
                classes: classes
            });

            $operator.addClass("selected");
            $(document).on("mousedown.menuClose", function() {
                $operator.removeClass("selected");
                $(document).off("mousedown.menuClose");
            });

            const nodeId = $(this).closest(".operator").data("nodeid");
            $menu.data("nodeid", nodeId);
            return false; // prevent default browser's rightclick menu
        });

        // $dfWrap.on("contextmenu", ".operator .connector.in", function(event: JQueryEventObject) {
        //     let classes = " connectorMenu in ";
        //     xcHelper.dropdownOpen($(this), $menu, {
        //         mouseCoors: {x: event.pageX, y: event.pageY},
        //         floating: true,
        //         classes: classes
        //     });
        //     return false;
        // });

        $dfWrap.on("click", ".edge", function(event) {
            const $edge: JQuery = $(this);
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

            return false;
        });

        $dfWrap.on("contextmenu", ".edge", function(event) {
            const e: JQueryEventObject = {
                type: "click",
                pageX: event.pageX,
                pageY: event.pageY
            };
            $(event.target).trigger(e);
            return false;
        });
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
            var nodeId = $menu.data("nodeid");
            var parentNodeId = $menu.data("parentnodeid");
            var connectorIndex = $menu.data("connectorindex");

            switch (action) {
                case ("removeNode"):
                    DagView.removeNodes(0, [nodeId]);
                    break;
                case ("removeInConnection"):
                    DagView.disconnect(parentNodeId, nodeId, connectorIndex);
                    break;
                case ("cloneNode"):
                    DagView.cloneNode(nodeId);
                    break;
                case ("executeNode"):
                    break;
                case ("configureNode"):
                    break;
                case ("comment"):
                    break;
                default:
                    break;
            }
        });
    }
}