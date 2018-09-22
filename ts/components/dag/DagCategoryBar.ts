class DagCategoryBar {
    private static _instance: DagCategoryBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $dagView: JQuery;
    private $operatorBar: JQuery;
    private categories: DagCategory[];

    public setup(): void {
        this.categories = new DagCategories().getCategories();
        this.$dagView = $("#dagView");
        this.$operatorBar = this.$dagView.find(".operatorWrap");
        this._setupCategoryBar();
        this._setupDragDrop();
        this._setupScrolling();
        this._setupSearch();
        // Activate the favorites category by default
        this._focusOnCategory(DagCategoryType.Favorites);
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
        this._renderCategoryBar();
        this._renderOperatorBar();
        this.$dagView.find(".categories").on("click", ".category", (event) => {
            const $category: JQuery = $(event.currentTarget);
            const category: string = $category.data("category");
            this._focusOnCategory(category);
        });
    }

    private _renderCategoryBar() {
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
        iconMap[DagCategoryType.Custom] = "xi-menu-extension"; // TODO: UI Design

        this.categories.forEach((category: DagCategory) => {
            const categoryName: DagCategoryType = category.getName();
            const icon: string = iconMap[categoryName];
            html += `<div class="category category-${categoryName}"
            data-category="${categoryName}">
                <i class="icon categoryIcon ${icon}"></i>
                <span class="text">${xcHelper.capitalize(categoryName)}</span>
            </div>`;
        });
        html += '<div class="spacer"></div>'; // adds right padding
        this.$dagView.find(".categories").html(html);
    }

    private _renderOperatorBar(): void {
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
        iconMap[DagNodeType.Custom] = "&#xe96d;"; // TODO: UI design
        iconMap[DagNodeType.CustomInput] = "&#xe96d;"; // TODO: UI design
        iconMap[DagNodeType.IMDTable] = "&#xea55;";
        iconMap[DagNodeType.PublishIMD] = "&#xea55;";
        iconMap[DagNodeType.DFIn] = "&#xe952;"; // XXX TODO: UI design
        iconMap[DagNodeType.DFOut] = "&#xe955;"; // XXX TODO: UI design

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
        categoryColorMap[DagCategoryType.Custom] = "#89D0E0"; // TODO: UI design

        let html: HTML = "";
        html += '<svg height="0" width="0" style="position:absolute">' +
                '<defs>' +
                    '<clipPath id="cut-off-right">' +
                        '<rect width="90" height="27" ry="90" rx="11" ' +
                        'stroke="black" stroke-width="1" fill="red" ' +
                        'x="6.5" y="0.5" />' +
                    '</clipPath>' +
                '</defs>' +
                '</svg>';
        this.categories.forEach((category: DagCategory) => {
            const categoryName: string = category.getName();
            const operators: DagCategoryNode[] = category.getOperators();
            html += `<svg version="1.1" height="100%" width="100%" class="category category-${categoryName}">`;

            operators.forEach((categoryNode: DagCategoryNode, i) => {
                const categoryName: DagCategoryType = categoryNode.getCategoryType();
                const operator: DagNode = categoryNode.getNode();
                let numParents: number = operator.getMaxParents();
                let numChildren: number = operator.getMaxChildren();
                const operatorName: string = categoryNode.getNodeType();
                const opDisplayName: string = categoryNode.getDisplayNodeType();
                const subType: string = categoryNode.getNodeSubType();
                const subTypeDisplayName: string = categoryNode.getDisplayNodeSubType();

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

                let subTypeHTML = "";
                let opTitleY = 17;
                if (subType) {
                    subTypeHTML = '<text class="opSubTypeTitle" x="59" y="25" ' +
                    'text-anchor="middle" font-family="Open Sans" ' +
                    'font-size="9" fill="#44515c">' + subTypeDisplayName +
                    '</text>';
                    opTitleY = 14;
                }

                html +=  '<g class="operator ' + operatorName + ' ' +
                    (categoryNode.isHidden() ? 'xc-hidden ' : '') +
                    'category-' + categoryName + '" ' +
                        'data-category="' + categoryName + '" ' +
                        'data-type="' + operatorName + '" ' +
                        'data-subtype="' + subType + '" ' +
                        'transform="translate(' + (10 + i * 123) + ', 11)" >' +
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
                    '<text class="opTitle" x="59" y="' + opTitleY + '" ' +
                        'text-anchor="middle" font-family="Open Sans" ' +
                        'font-size="11" fill="#44515c">' + opDisplayName +
                        '</text>' +
                    '<circle class="statusIcon" cx="88" cy="27" r="5" ' +
                        'stroke="#849CB0" stroke-width="1" fill="white" />' +
                        subTypeHTML +
                    '</g>';
            });
            html += `</svg>`;
        });

        this.$operatorBar.html(html);
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
                        subType: $operator.data("subtype"),
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

    private _setupSearch(): void {
        const $seachArea: JQuery = this.$dagView.find(".categoryBar .searchArea");
        const $input: JQuery = $seachArea.find(".searchInput");
        const $ul: JQuery = $seachArea.find("ul");
        const menuHelper: MenuHelper = new MenuHelper($seachArea, {
            bounds: '#' + this.$dagView.attr("id"),
            bottomPadding: 5
        });

        $input.on("input", () =>{
            const keyword = $input.val();
            if (keyword) {
                this._renderSearchList(keyword, $ul);
                menuHelper.openList();
                this._addMenuEvent(menuHelper);
            } else {
                menuHelper.hideDropdowns();
            }
            return false;
        });

        $ul.on("click", "li", (event) =>  {
            const $li: JQuery = $(event.currentTarget);
            const category = $li.data("category");
            menuHelper.hideDropdowns();
            this._focusOnCategory(category);
        });
    }

    private _addMenuEvent(menuHelper: MenuHelper): void {
        $(document).off("click.CategoryBarSearch");
        $(document).on('click.CategoryBarSearch', (event) => {
            if ($(event.currentTarget).closest(".searchArea").length === 0) {
                menuHelper.hideDropdowns();
                $(document).off("click.CategoryBarSearch");
            }
        });
    } 

    private _renderSearchList(keyword: string, $ul: JQuery): void {
        const categoryNodes: DagCategoryNode[] = this._searchOperators(keyword);
        let html: HTML = "";
        html = categoryNodes.map((caterogyNode) => {
            let text: string = caterogyNode.getDisplayNodeType();
            const subType: string = caterogyNode.getDisplayNodeSubType();
            if (subType) {
                text += `(${subType})`;
            }
            return `<li data-category="${caterogyNode.getCategoryType()}">${text}</li>`
        }).join("");
        if (!html) {
            html = `<li class="hint">${CommonTxtTstr.NoResult}</li>`;
        }
        $ul.html(html);
    }

    private _searchOperators(keyword: string): DagCategoryNode[] {
        const categoryNodes: DagCategoryNode[] = [];
        keyword = keyword.toLowerCase();
        this.categories.forEach((category) => {
            if (category.getName() !== DagCategoryType.Favorites) {
                category.getOperators().forEach((categoryNode) => {
                    if (categoryNode.getDisplayNodeType().toLowerCase().includes(keyword) ||
                    categoryNode.getDisplayNodeSubType().toLowerCase().includes(keyword)
                    ) {
                        categoryNodes.push(categoryNode);
                    }
                });
            }
        });
        return categoryNodes;
    }

    private _focusOnCategory(category: string) {
        const $categories: JQuery = this.$dagView.find(".categories");
        $categories.find(".category").removeClass("active");
        $categories.find(".category.category-" + category).addClass("active");
        this.$operatorBar.find(".category").removeClass("active");
        this.$operatorBar.find(".category.category-" + category).addClass("active");
    }
}