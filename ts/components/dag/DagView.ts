namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;

    export function setup(): void {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        setupDragDrop();
        setupCategoryBar();

        // XXX used for testing
        activeDag = new DagGraph();
    }

    // XXX test function
    export function getActiveDag(): DagGraph {
        return activeDag;
    }

    function setupDragDrop(): void {
        // dragging operator bar node into dataflow area
        $operatorBar.on("mousedown", ".operator .main", function(event) {
            var $operator = $(this).closest(".operator");
            new DragHelper({
                event: event,
                $element: $operator,
                $container: $dagView,
                $dropTarget: $dfWrap.find(".dataflowArea.active"),
                onDragEnd: function($newNode, _event, data) {
                    const newNode = new DagNode({
                        type: $operator.data("type"),
                        display: {x: data.coors[0].x, y: data.coors[0].y}
                    });
                    activeDag.addNode(newNode);
                    // use .attr instead of .data so we can grab by selector
                    $newNode.attr("data-nodeid", newNode.getId());

                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        // moving node in dataflow area to another position
        $dfWrap.on("mousedown", ".operator .main", function(event) {
            const self = this;
            const $operator = $(this).closest(".operator");
            var $dfArea = $dfWrap.find(".dataflowArea.active");

            new DragHelper({
                event: event,
                $element: $operator,
                $elements: $operator.add($dfArea.find(".operator.selected")),
                $container: $dagView,
                $dropTarget: $dfArea,
                onDragEnd: function($els, _event, data) {
                    $els.each(function(i: number) {
                        const $el = $(this);
                        const nodeId = $el.data("nodeid");
                        activeDag.moveNode(nodeId, {
                            x: data.coors[i].x,
                            y: data.coors[i].y
                        });

                        const containerRect = $dfWrap[0].getBoundingClientRect();
                        const offset = {
                            top: $dfWrap.scrollTop() - containerRect.top,
                            left: $dfWrap.scrollLeft() - containerRect.left
                        };

                        let svgContainer = d3.select("#dagView .dataflowArea.active .mainG");

                        // redraw all paths that go out from this node
                        $("#dagView").find('path[data-parentnodeid="' + nodeId + '"]').each(function() {
                            const childNodeId = $(this).attr("data-childnodeid");
                            let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                            if (connectorIndex === -1) {
                                connectorIndex = 0;
                            }
                            $(this).remove();

                            const $childConnector = $dagView.find('.operator[data-nodeid="' + childNodeId + '"]')
                                                            .find(".connector.in.hasConnection")
                                                            .eq(connectorIndex);
                            const $parentConnector = $el.find(".connector.out");

                            drawLineBetweenNodes($parentConnector, $childConnector,
                                nodeId, childNodeId, connectorIndex,
                                svgContainer, offset);

                        });

                        // redraw all paths that lead into this node
                        $("#dagView").find('path[data-childnodeid="' + nodeId + '"]').each(function() {
                            const parentNodeId = $(this).attr("data-parentnodeid");
                            let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                            if (connectorIndex === -1) {
                                connectorIndex = 0;
                            }
                            $(this).remove();

                            // XXX get index
                            const $childConnector = $el.find(".connector.in.hasConnection").eq(connectorIndex);
                            const $parentConnector = $dagView.find('.operator[data-nodeid="' + parentNodeId + '"]')
                                                             .find(".connector.out");

                            drawLineBetweenNodes($parentConnector, $childConnector,
                                 parentNodeId, nodeId, connectorIndex,
                                 svgContainer, offset);
                        });
                    });
                },
                onDragFail: function() {
                    $(self).closest(".operator").toggleClass("selected");
                },
                move: true
            });
        });

        // connecting 2 nodes
        $dfWrap.on("mousedown", ".operator .connector.out", function() {
            const $parentConnector = $(this);
            const $parentNode = $parentConnector.closest(".operator");
            const $dfArea = $dfWrap.find(".dataflowArea.active");
            new DragLineHelper({
                event: event,
                $element: $parentConnector,
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
                onDragEnd: function(_$el, event) {
                    let $childNode: JQuery;

                    const $operators = $dfArea.find(".operator").filter(function() {
                        return ($(this).find(".connector.in.noConnection").length > 0 ||
                                $(this).find(".connector.in.multi").length > 0);
                    });
                    $operators.not($parentNode).each(function() {
                        const rect: DOMRect = this.getBoundingClientRect();
                        const left: number = rect.left;
                        const right: number = rect.right;
                        const top: number = rect.top;
                        const bottom: number = rect.bottom;
                        if (event.pageX > left && event.pageX < right &&
                        event.pageY > top && event.pageY < bottom) {
                            $childNode = $(this);
                            return false;
                        }
                    });

                    if (!$childNode) {
                        return;
                    }

                    let connectorIndex: number;
                    let $childConnector: JQuery;
                    if ($childNode.find(".connector.in.multi").length) {
                        $childConnector = $childNode.find(".connector.in.multi");
                        connectorIndex = -1;
                    } else {
                        $childConnector = $childNode.find(".connector.in.noConnection").eq(0);
                        connectorIndex = $childConnector.index();
                    }
                    const parentNodeId: string = $parentNode.data("nodeid");
                    const childNodeId: string = $childNode.data("nodeid");
                    activeDag.connect(parentNodeId, childNodeId, connectorIndex);

                    $childConnector.removeClass("noConnection")
                                   .addClass("hasConnection");

                    const containerRect = $dfWrap[0].getBoundingClientRect();
                    const offset = {
                        top: $dfWrap.scrollTop() - containerRect.top,
                        left: $dfWrap.scrollLeft() - containerRect.left
                    };

                    const svgContainer = d3.select("#dagView .dataflowArea.active .mainG");

                    drawLineBetweenNodes($parentConnector, $childConnector,
                                         parentNodeId, childNodeId,
                                         connectorIndex, svgContainer, offset);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

    }

    const lineFunction = d3.svg.line()
                                .x(function(d) {return d.x;})
                                .y(function(d) {return d.y;})
                                .interpolate("cardinal");

    function drawLineBetweenNodes($parentConnector, $childConnector,
        parentNodeId, childNodeId, connectorIndex, svgContainer, offset) {

        const parentRect = $parentConnector[0].getBoundingClientRect();
        const parentCoors = {
            x: parentRect.right + offset.left - 1,
            y: parentRect.top + offset.top + 4
        };

        // XXX use index to find the correct connector
        const childRect = $childConnector[0].getBoundingClientRect();
        const childCoors = {
            x: childRect.left + offset.left,
            y: childRect.top + offset.top + 3
        };

        svgContainer.append("path")
                    .attr("class", "edge")
                    .attr("d", lineFunction([parentCoors, childCoors]))
                    .attr("data-childnodeid", childNodeId)
                    .attr("data-parentnodeid", parentNodeId)
                    .attr("data-connectorindex", connectorIndex);
    }

    function setupCategoryBar(): void {
        var categories: DagCategory[] = new DagCategories().getCategories();
        var html: HTML = "";

        categories.forEach(function(category: DagCategory) {
            // TODO: separate divs per category
            let operators: DagNode[] = category.getOperators();

            operators.forEach(function(operator: DagNode) {
                let numParents: number = operator.getMaxParents();
                let numChildren: number = operator.getMaxChildren();
                let inConnectorClass = "";
                if (numParents === -1) {
                    numParents = 1;
                    inConnectorClass += " multi "
                }
                if (numChildren === -1) {
                    numChildren = 1;
                }
                html += '<div class="operator" ' +
                            'data-category="' + category.getName() + '" ' +
                            'data-type="' + operator.getType() + '">' +
                        '<div class="connectorArea in">' +
                            ('<div class="connector in noConnection' +
                            inConnectorClass + '"></div>').repeat(numParents) +
                        '</div>' +
                        '<div class="main">' +
                            xcHelper.capitalize(operator.getType()) +
                        '</div>' +
                        '<div class="connectorArea out">' +
                            ('<div class="connector out"></div>').repeat(numChildren) +
                        '</div>' +
                    '</div>';
            });
        });

        $operatorBar.html(html);

    }
}