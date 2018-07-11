namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;
    let activeDag: DagGraph;

    export function setup(): void {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        // XXX used for testing
        activeDag = new DagGraph();

        setupDragDrop();
        setupCategoryBar();
        DagNodeMenu.setup();
    }

    // XXX test function
    export function getActiveDag(): DagGraph {
        return activeDag;
    }


    /**
     * DagView.removeNode
     * @param nodeId
     *  removes node from DagGraph, remove $element, connection lines, update
     * connector classes
     */
    export function removeNode(nodeId: DagNodeId): void {
        activeDag.removeNode(nodeId);
        DagView.getNode(nodeId).remove();
        $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').remove();
        $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
            const childNodeId = $(this).attr("data-childnodeid");
            _removeConnection($(this), childNodeId);
        });
    }

    /**
     * DagView.cloneNode
     * @param nodeId 
     * finds new position for cloned node, adds to dagGraph and UI
     */
    export function cloneNode(nodeId: DagNodeId): void {
        const offset = _getDFAreaOffset();
        const $originalNode = DagView.getNode(nodeId);
        const rect = $originalNode[0].getBoundingClientRect();
        const $dfArea = $dagView.find(".dataflowArea.active");
        const spacing = 20;
        let newLeft = rect.left;
        let newTop = rect.top + rect.height + spacing;
        let positionConflict = true;
    
        // XXX improve detection of other node positions
        while (positionConflict) {
            positionConflict = false;
            $dfArea.find(".operator").each(function() {
                const rect = this.getBoundingClientRect();
                if (rect.left === newLeft && rect.top === newTop) {
                    positionConflict = true;
                    newTop += 10;
                    return false;
                }
            });
        }

        const newPos = {
            x: newLeft + offset.left,
            y: newTop + offset.top
        };
        
        const newNode = activeDag.cloneNode(nodeId);
        const newNodeId = newNode.getId();
        activeDag.moveNode(newNodeId, newPos);
        const type = newNode.getType();
        const $newEl = $operatorBar.find('.operator[data-type="' + type + '"]').clone();
        $newEl.css({
            left: newPos.x,
            top: newPos.y
        });
        $dfArea.append($newEl);
        $newEl.attr("data-nodeid", newNodeId);
        $dfWrap.find(".operator").removeClass("selected");
        $newEl.addClass("selected");
    }

    /**
     * DagView.disconnect
     * @param parentNodeId
     * @param childNodeId
     * removes connection from DagGraph, connection line, updates connector classes
     */
    export function disconnect(parentNodeId, childNodeId) {
        const $edge: JQuery = $dagView.find('.edge[data-parentnodeid="' + parentNodeId + '"][data-childnodeid="' + childNodeId + '"]')
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        activeDag.disconnect(parentNodeId, childNodeId, connectorIndex);
        _removeConnection($edge, childNodeId);
    }

    /**
     * DagView.getNode
     * @param nodeId
     * returns $(".operator") element
     */
    export function getNode(nodeId: DagNodeId): JQuery {
        return $dagView.find('.operator[data-nodeid="' + nodeId + '"]');
    }

    function _removeConnection($edge, childNodeId) {
        const connectorIndex: number = parseInt($edge.attr('data-connectorindex'));
        $edge.remove();

        const $childNodeConnectors = DagView.getNode(childNodeId)
                                    .find(".connector.in.hasConnection");
        let $childConnector;
        if ($childNodeConnectors.hasClass("multi")) {
            $childConnector = $childNodeConnectors.eq(0);
        } else {
            $childConnector = $childNodeConnectors.eq(connectorIndex);
        }
        if (!$childConnector.hasClass("multi") ||
            activeDag.getNode(childNodeId).getNumParent() === 0) {
             $childConnector.removeClass("hasConnection")
                            .addClass("noConnection");
        }
    }

    function setupDragDrop(): void {
        // dragging operator bar node into dataflow area
        $operatorBar.on("mousedown", ".operator .main", function(event) {
            if (event.which !== 1) {
                return;
            }
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
            if (event.which !== 1) {
                return;
            }
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

                        const offset = _getDFAreaOffset();
                        let svg = d3.select("#dagView .dataflowArea.active .mainSvg");

                        // redraw all paths that go out from this node
                        $dagView.find('.edge[data-parentnodeid="' + nodeId + '"]').each(function() {
                            const childNodeId: DagNodeId = $(this).attr("data-childnodeid");
                            let connectorIndex: number = parseInt($(this).attr("data-connectorindex"));
                            $(this).remove();

                            const $childNodeConnectors = DagView.getNode(childNodeId)
                                                                .find(".connector.in.hasConnection");
                            let $childConnector;
                            if ($childNodeConnectors.hasClass("multi")) {
                                $childConnector = $childNodeConnectors.eq(0);
                            } else {
                                $childConnector = $childNodeConnectors.eq(connectorIndex);
                            }

                            const $parentConnector = $el.find(".connector.out");

                            drawLineBetweenNodes($parentConnector, $childConnector,
                                nodeId, childNodeId, connectorIndex, svg, offset);
                        });

                        // redraw all paths that lead into this node
                        $dagView.find('.edge[data-childnodeid="' + nodeId + '"]').each(function() {
                            const parentNodeId = $(this).attr("data-parentnodeid");
                            let connectorIndex = parseInt($(this).attr("data-connectorindex"));
                            $(this).remove();

                            const $childNodeConnectors = $el.find(".connector.in.hasConnection");
                            let $childConnector;
                            if ($childNodeConnectors.hasClass("multi")) {
                                $childConnector = $childNodeConnectors.eq(0);
                            } else {
                                $childConnector = $childNodeConnectors.eq(connectorIndex);
                            }

                            const $parentConnector =  DagView.getNode(parentNodeId)
                                                             .find(".connector.out");

                            drawLineBetweenNodes($parentConnector, $childConnector,
                                 parentNodeId, nodeId, connectorIndex,
                                 svg, offset);
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
        $dfWrap.on("mousedown", ".operator .connector.out", function(event) {
            if (event.which !== 1) {
                return;
            }
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
                    const node = activeDag.getNode($parentNode.data("nodeid"));
                    const isAggNode = node.getType() === DagNodeType.Aggregate;
                    const $operators = $dfArea.find(".operator").filter(function() {
                        const $operator: JQuery = $(this);
                        let notAllowed: boolean = false;
                        if (isAggNode) {
                            const childNode = activeDag.getNode($operator.data("nodeid"));
                            if (!childNode.isAllowAggNode()) {
                                notAllowed = true;
                            }
                        }

                        // return operators that allow agg nodes if parent is agg,
                        // and has space for connection or is multi
                        return (!notAllowed &&
                                ($(this).find(".connector.in.noConnection").length > 0 ||
                                $(this).find(".connector.in.multi").length) > 0);
                    });
                    // check if location of drop matches position of a valid
                    // $operator
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
                        console.log("invalid connection");
                        return;
                    }
                    const parentNodeId: DagNodeId = $parentNode.data("nodeid");
                    const childNodeId: DagNodeId = $childNode.data("nodeid");

                    let connectorIndex: number;
                    let $childConnector: JQuery;
                    if ($childNode.find(".connector.in.multi").length) {
                        $childConnector = $childNode.find(".connector.in.multi");
                        connectorIndex = activeDag.getNode(childNodeId)
                                                  .getNumParent();
                    } else {
                        $childConnector = $childNode.find(".connector.in.noConnection").eq(0);
                        connectorIndex = $childConnector.index();
                    }

                    activeDag.connect(parentNodeId, childNodeId, connectorIndex);

                    $childConnector.removeClass("noConnection")
                                   .addClass("hasConnection");

                    const offset = _getDFAreaOffset();
                    const svg = d3.select("#dagView .dataflowArea.active .mainSvg");

                    drawLineBetweenNodes($parentConnector, $childConnector,
                                         parentNodeId, childNodeId,
                                         connectorIndex, svg, offset);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        const lineFunction = d3.svg.line()
                                .x(function(d) {return d.x;})
                                .y(function(d) {return d.y;})
                                .interpolate("cardinal");

        function drawLineBetweenNodes($parentConnector, $childConnector,
            parentNodeId, childNodeId, connectorIndex, svg, offset) {

            const parentRect = $parentConnector[0].getBoundingClientRect();
            const parentCoors = {
                x: parentRect.right + offset.left - 1,
                y: parentRect.top + offset.top + 5
            };

            let offsetTop = $childConnector.height() / 2;
            const childRect = $childConnector[0].getBoundingClientRect();
            const childCoors = {
                x: childRect.left + offset.left,
                y: childRect.top + offset.top + offsetTop
            };

            const edge = svg.append("g")
                        .attr("class", "edge")
                        .attr("data-childnodeid", childNodeId)
                        .attr("data-parentnodeid", parentNodeId)
                        .attr("data-connectorindex", connectorIndex);
            edge.append("path")
                .attr("class", "visibleLine")
                .attr("d", lineFunction([parentCoors, childCoors]))
            edge.append("path")
                .attr("class", "invisibleLine")
                .attr("d", lineFunction([parentCoors, childCoors]))
        }
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

    function _getDFAreaOffset() {
        const containerRect = $dfWrap[0].getBoundingClientRect();
        const offsetTop = $dfWrap.scrollTop() - containerRect.top;
        const offsetLeft = $dfWrap.scrollLeft() - containerRect.left;

        return {
            top: offsetTop,
            left: offsetLeft
        }
    }
}