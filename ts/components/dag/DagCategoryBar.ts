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
        this._setupOperatorBar();
        this._setupDragDrop();
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
            
            const categoryName: string = category.getName();
            let icon = iconMap[categoryName];
            if (categoryName === DagCategoryType.In) {
                classes += "active";
            }

            html += `<div class="category category-${categoryName} ${classes}"
            data-category="${categoryName}">
            <i class="icon categoryIcon ${icon}"></i>
            <span class="text">${xcHelper.capitalize(categoryName)}</span>
            </div>`;
        });
        this.$dagView.find(".categories").html(html);

        this.$dagView.find(".categories").on("click", ".category", function() {
            const $category = $(this);
            const type = $category.data("category");
            self.$dagView.find(".categories .category").removeClass("active");
            $category.addClass("active");
            self.$operatorBar.find(".category").removeClass("active");
            self.$operatorBar.find(".category.category-" + type).addClass("active");
        });
    }

    private _setupOperatorBar(): void {
        const categories: DagCategory[] = new DagCategories().getCategories();
        let html: HTML = "";
        categories.forEach(function(category: DagCategory) {
            const categoryName: string = category.getName();
            const operators: DagNode[] = category.getOperators();
            html += `<div class="category category-${categoryName}">`;

            operators.forEach(function(operator: DagNode) {
                let numParents: number = operator.getMaxParents();
                let numChildren: number = operator.getMaxChildren();
                const operatorName: string = operator.getType();
                let inConnectorClass = "";
                if (numParents === -1) {
                    numParents = 1;
                    inConnectorClass += " multi "
                }
                if (numChildren === -1) {
                    numChildren = 1;
                }
                html += '<div class="operator ' + operatorName + ' ' + 
                        'category-' + categoryName + '" ' +
                            'data-category="' + categoryName + '" ' +
                            'data-type="' + operatorName + '">' +
                        '<div class="connectorArea in">' +
                            ('<div class="connector in noConnection' +
                            inConnectorClass + '"></div>').repeat(numParents) +
                        '</div>' +
                        '<div class="main">' +
                            '<div class="iconArea">' + 
                            '</div>' +
                            '<div class="nameArea">' + 
                                xcHelper.capitalize(operatorName) +
                            '</div>' + 
                        '</div>' +
                        '<div class="connectorArea out">' +
                            ('<div class="connector out"></div>').repeat(numChildren) +
                        '</div>' +
                    '</div>';
            });
            html += `</div>`;
        });

        this.$operatorBar.html(html);
        this.$dagView.find(".categories .category-" + DagCategoryType.In).click();
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
                onDragEnd: function(_$newNode, _event, data) {
                    const newNodeInfo: DagNodeInfo = {
                        type: $operator.data("type"),
                        display: {
                                    x: data.coors[0].x, 
                                    y: data.coors[0].y
                                }
                    };
                    DagView.addNode(0, newNodeInfo);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });
    }
}