class DagCategoryBar {
    private static _instance: DagCategoryBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $dagView: JQuery;
    private $operatorBar: JQuery;

    public setup(): void {
        this.$dagView = $("#dagView");
        this.$operatorBar = this.$dagView.find(".operatorWrap");
        this._setupCategoryBar();
        this._setupDragDrop();
        this._setupScrolling();
    }

    public showOrHideArrows(): void {
        const $catWrap: JQuery = this.$dagView.find(".categoryWrap");
        if ($catWrap.width() < $catWrap[0].scrollWidth) {
            this.$dagView.find(".categoryBar").addClass("scrollable");
        } else {
            this.$dagView.find(".categoryBar").removeClass("scrollable");
        }
    }

    private _setupCategoryBar(): void {
        const self = this;
        const categories: DagCategory[] = new DagCategories().getCategories();
        let html: HTML = "";

        const iconMap = {};
        iconMap[DagCategoryType.Favorites] = "xi-recommend";
        iconMap[DagCategoryType.In] = "xi-horizontal-align-center";
        iconMap[DagCategoryType.Out] = "xi-horizontal-align-center";
        iconMap[DagCategoryType.Value] = "xi-aggregate";
        iconMap[DagCategoryType.Operations] = "xi-table-2";
        iconMap[DagCategoryType.Column] = "xi-tables-columnsicon";
        iconMap[DagCategoryType.Join] = "xi-join-inner";
        iconMap[DagCategoryType.Set] = "xi-union";
        iconMap[DagCategoryType.Extensions] = "xi-menu-extension";
        iconMap[DagCategoryType.SQL] = "xi-menu-sql";

        categories.forEach((category: DagCategory) => {
            let classes = "";

            const categoryName: DagCategoryType = category.getName();
            let icon = iconMap[categoryName];
            html += `<div class="category category-${categoryName} ${classes}"
            data-category="${categoryName}">
            <i class="icon categoryIcon ${icon}"></i>
            <span class="text">${xcHelper.capitalize(categoryName)}</span>
            </div>`;
        });
        html += '<div class="spacer"></div>'; // adds right padding
        this.$dagView.find(".categories").html(html);

        this.$dagView.find(".categories").on("click", ".category", function() {
            const $category = $(this);
            const type = $category.data("category");
            self.$dagView.find(".categories .category").removeClass("active");

            $category.addClass("active");
            self.$operatorBar.find(".category").removeClass("active");
            self.$operatorBar.find(".category.category-" + type).addClass("active");
        });

        this._setupOperatorBar(categories);
    }

    private _setupOperatorBar(categories: DagCategory[]): void {
        // const iconMap = {};
        const iconMap = {};
        iconMap[DagNodeType.Dataset] = "&#xe90f";
        iconMap[DagNodeType.Filter] = "&#xe938;";
        iconMap[DagNodeType.Join] = "&#xe93e;";
        iconMap[DagNodeType.Set] = "&#xea2d;";
        iconMap[DagNodeType.Export] = "&#xe955;";
        iconMap[DagNodeType.Aggregate] = "&#xe939;";
        iconMap[DagNodeType.Map] = "&#xe9da;";
        iconMap[DagNodeType.GroupBy] = "&#xe937;";
        iconMap[DagNodeType.Project] = "&#xe9d7;";
        iconMap[DagNodeType.Extension] = "&#xe96d;";
        iconMap[DagNodeType.SQL] = "&#xe957;";

        const categoryColorMap = {};
        categoryColorMap[DagCategoryType.Favorites] = "#BBC7D1";
        categoryColorMap[DagCategoryType.In] = "#F4B48A";
        categoryColorMap[DagCategoryType.Out] = "#E7DC98";
        categoryColorMap[DagCategoryType.Value] = "#AACE8F";
        categoryColorMap[DagCategoryType.Operations] = "#7FD4B5";
        categoryColorMap[DagCategoryType.Column] = "#89D0E0";
        categoryColorMap[DagCategoryType.Join] = "#92B1DA";
        categoryColorMap[DagCategoryType.Set] = "#CCAADD";
        categoryColorMap[DagCategoryType.Extensions] = "#F896A9";
        categoryColorMap[DagCategoryType.SQL] = "#EAABD3";

        let html: HTML = "";
        html += '<svg height="0" width="0" style="position:absolute">' +
                '<defs>' +
                    '<clipPath id="cut-off-right">' +
                        '<rect width="90" height="27" ry="90" rx="11" stroke="black" stroke-width="1" fill="red" x="6.5" y="0.5" />' +
                    '</clipPath>' +
                '</defs>' +
                '</svg>';
        categories.forEach(function(category: DagCategory) {
            const categoryName: string = category.getName();
            const operators: DagCategoryNode[] = category.getOperators();
            html += `<svg version="1.1" height="100%" width="100%" class="category category-${categoryName}">`;

            operators.forEach(function(categoryNode: DagCategoryNode, i) {
                const categoryName: DagCategoryType = categoryNode.getCategoryType();
                const operator: DagNode = categoryNode.getNode();
                let numParents: number = operator.getMaxParents();
                let numChildren: number = operator.getMaxChildren();
                const operatorName: string = operator.getType();
                let opDisplayName = xcHelper.capitalize(operatorName);
                if (opDisplayName === "Sql") {
                    opDisplayName = "SQL";
                }

                if (numChildren === -1) {
                    numChildren = 1;
                }
                let inConnector = "";
                if (numParents === 0) {
                    // if no connector, still needs something that gives width
                    // for positioning when dragging
                    inConnector = '<rect class="connectorSpace" ' +
                                    'x="0" y="11" fill="none" ' +
                                    'stroke="none" width="7" height="7" />';
                } else if (numParents === -1) {
                    inConnector = '<rect class="connector in noConnection multi"' +
                                'data-index="0" x="0" y="5" fill="#BBC7D1" ' +
                                'stroke="#849CB0" stroke-width="1" ' +
                                'ry="1" rx="1" width="7" height="18" />';
                } else {
                    for (var j = 0; j < numParents; j++) {
                        let y  = 28 / (numParents + 1) * (1 + j) - 3;
                        inConnector += '<rect class="connector in noConnection"' +
                                'data-index="' + j + ' " x="0" y="' + y +
                                '" fill="#BBC7D1" ' +
                                'stroke="#849CB0" stroke-width="1" ry="1" ' +
                                'rx="1" width="7" height="7" />';
                    }
                }
                html +=  '<g class="operator ' + operatorName + ' ' +
                    'category-' + categoryName + '" ' +
                        'data-category="' + categoryName + '" ' +
                        'data-type="' + operatorName +
                        '" transform="translate(' + (10 + i * 123) + ', 11)" >' +
                        inConnector +
                        ('<polygon class="connector out" ' +
                        'points="95,8 103,14 95,20" fill="#BBC7D1" ' +
                        'stroke="#849CB0" stroke-width="1" ry="1" rx="1" />')
                        .repeat(numChildren) +
                    '<rect class="main" x="6" y="0" width="90" height="28" ' +
                        'fill="white" stroke="#849CB0" stroke-width="1" ' +
                        'ry="28" rx="12"/>'+
                    '<rect class="iconArea" clip-path="url(#cut-off-right)" ' +
                        'x="0" y="0" width="26" height="28" stroke="#849CB0" ' +
                        'stroke-width="1" fill="' +
                        categoryColorMap[categoryName] + '" />'+
                    '<text class="icon" x="11" y="19" font-family="icomoon" ' +
                        'font-size="12" fill="white" >' +
                         iconMap[operatorName] + '</text>' +
                    '<text class="opTitle" x="59" y="17" ' +
                        'text-anchor="middle" font-family="Open Sans" ' +
                        'font-size="11" fill="#44515c">' + opDisplayName +
                        '</text>' +
                    '<circle class="statusIcon" cx="88" cy="27" r="5" ' +
                        'stroke="#849CB0" stroke-width="1" fill="white" />' +
                '</g>';
            });
            html += `</svg>`;
        });

        this.$operatorBar.html(html);
        // Activate the favorites category by default
        this.$dagView.find(".categories .category-" + DagCategoryType.Favorites).click();
    }

    private _setupDragDrop(): void {
        const self = this;
        // dragging operator bar node into dataflow area
        this.$operatorBar.on("mousedown", ".operator .main", function(event) {
            if (event.which !== 1) {
                return;
            }

            const $operator = $(this).closest(".operator");
            new DragHelper({
                event: event,
                $element: $operator,
                $container: self.$dagView,
                $dropTarget: self.$dagView.find(".dataflowArea.active"),
                round: 20,
                onDragEnd: function(_$newNode, _event, data) {
                    const newNodeInfo: DagNodeInfo = {
                        type: $operator.data("type"),
                        display: {
                                    x: data.coors[0].x,
                                    y: data.coors[0].y
                                }
                    };
                    DagView.addNode(newNodeInfo);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });
    }

    private _setupScrolling(): void {
        const self = this;
        this.$dagView.find(".categoryScroll .arrow").mousedown(function() {
            let scrollAmount;
            if ($(this).hasClass("left")) {
                scrollAmount = -10;
            } else {
                scrollAmount = 10;
            }
            let timer;
            scroll();
            function scroll() {
                timer = setTimeout(function() {
                    var scrollLeft = self.$dagView.find(".categoryWrap").scrollLeft();
                    self.$dagView.find(".categoryWrap").scrollLeft(scrollLeft + scrollAmount);
                    scroll();
                }, 30);
            }

            $(document).on("mouseup.catScroll", function() {
                clearTimeout(timer);
                $(document).off("mouseup.catScroll");
            });
        });
    }
}