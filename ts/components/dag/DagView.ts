namespace DagView {
    let $dagView: JQuery;
    let $dfWrap: JQuery;
    let $operatorBar: JQuery;

    export function setup(): void {
        $dagView = $("#dagView");
        $dfWrap = $dagView.find(".dataflowWrap");
        $operatorBar = $dagView.find(".operatorWrap");

        setupDragDrop();
        setupCategoryBar();
    }

    function setupDragDrop(): void {
        $operatorBar.on("mousedown", ".operator .main", function(event) {
            new DragHelper({
                event: event,
                $element: $(this).closest(".operator"),
                $container: $dagView,
                $dropTarget: $dfWrap.find(".dataflowArea.active"),
                onDragEnd: function(_$el, _event) {

                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        $dfWrap.on("mousedown", ".operator .main", function(event) {
            const self = this;
            var $dfArea = $dfWrap.find(".dataflowArea.active");
            new DragHelper({
                event: event,
                $element: $(this).closest(".operator"),
                $elements: $(this).closest(".operator").add(
                            $dfArea.find(".operator.selected")),
                $container: $dagView,
                $dropTarget: $dfArea,
                onDragEnd: function(_$el, _event) {

                },
                onDragFail: function() {
                    $(self).closest(".operator").toggleClass("selected");
                },
                move: true
            });
        });


        $dfWrap.on("mousedown", ".operator .connector.out", function() {
            var $operator = $(this).closest(".operator");
            var $dfArea = $dfWrap.find(".dataflowArea.active");
            new DragLineHelper({
                event: event,
                $element: $(this),
                $container: $dagView,
                $dropTarget: $dfArea,
                offset: {
                    x: 0,
                    y: -2
                },
                onDragEnd: function(_$el, event) {
                    let $inConnector: JQuery;
                    $dfArea.find(".operator").not($operator).each(function() {
                        const rect: DOMRect = this.getBoundingClientRect();
                        const left: number = rect.left;
                        const right: number = rect.right;
                        const top: number = rect.top;
                        const bottom: number = rect.bottom;
                        if (event.pageX > left && event.pageX < right &&
                        event.pageY > top && event.pageY < bottom) {
                            $inConnector = $(this);
                            return false;
                        }
                    });

                    if ($inConnector) {
                        xcHelper.showSuccess("connection found");
                    } else {
                        xcHelper.showFail("no connection found");
                    }
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

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
                if (numParents === -1) {
                    numParents = 1;
                }
                if (numChildren === -1) {
                    numChildren = 1;
                }
                html += '<div class="operator">' +
                        '<div class="connectorArea in">' +
                            '<div class="connector in"></div>'.repeat(numParents) +
                        '</div>' +
                        '<div class="main">' +
                            xcHelper.capitalize(operator.getType()) +
                        '</div>' +
                        '<div class="connectorArea out">' +
                            '<div class="connector out"></div>'.repeat(numChildren) +
                        '</div>' +
                    '</div>';
            });
        });

        $operatorBar.html(html);

    }
}