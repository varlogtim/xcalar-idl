class DagCategoryBar {
    private static _instance: DagCategoryBar;

    public static get Instance() {
        return this._instance || (this._instance = new this());
    }

    private $dagView: JQuery;
    private $operatorBar: JQuery;
    private dagCategories: DagCategories;
    private currentCategory: DagCategoryType = DagCategoryType.Favorites;
    private _listScrollers: ListScroller[] = [];

    public setup(): void {
        this.dagCategories = new DagCategories();
        this.$dagView = $("#dagView");
        this.$operatorBar = this.$dagView.find(".operatorWrap");
        this._setupCategoryBar();
        this._setupDragDrop();
        this._setupScrolling();
        this._setupSearch();
        // Activate the favorites category by default
        this._focusOnCategory(DagCategoryType.Favorites);
    }

    public loadCategories(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();

        this.dagCategories.loadCategories()
        .then(() => {
            this._renderOperatorBar();
            this._focusOnCategory(this.currentCategory);
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    public showOrHideArrows(): void {
        const $catWrap: JQuery = this.$dagView.find(".categoryWrap");
        if ($catWrap.width() < $catWrap[0].scrollWidth) {
            this.$dagView.find(".categoryBar").addClass("scrollable");
        } else {
            this.$dagView.find(".categoryBar").removeClass("scrollable");
        }
    }

    /**
     * Add a operator on-the-fly
     * @param categoryName category type
     * @param dagNode DagNode object of the operator
     * @param isHidden OPTIONAL(default = false). Hide/Show in the category bar.
     * @param isFocusCategory OPTIONAL(default = true). If set focus to the category, which the newly added operator belongs to.
     * @returns Display name of the operator
     */
    public addOperator(props: {
        categoryName: DagCategoryType,
        dagNode: DagNode,
        isHidden?: boolean,
        isFocusCategory?: boolean
    }): XDPromise<string> {
        const { categoryName, dagNode, isHidden = false, isFocusCategory = true } = props;

        // Find the category data structure
        const targetCategory = this._getCategoryByName(categoryName);
        if (targetCategory == null) {
            return PromiseHelper.reject(`Category ${categoryName} not found`);
        }

        // Add operater to category
        targetCategory.add(DagCategoryNodeFactory.create({
            dagNode: dagNode, categoryType: categoryName, isHidden: isHidden
        }));

        // Defaut name
        let newName: string = dagNode.getType();
        if (targetCategory instanceof DagCategoryCustom) {
            if (dagNode instanceof DagNodeCustom) {
                newName = targetCategory.genOperatorName(dagNode.getCustomName());
                dagNode.setCustomName(newName);
            }
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(isFocusCategory? categoryName: this.currentCategory);

        // Persist the change
        const deferred: XDDeferred<string> = PromiseHelper.deferred();
        this.dagCategories.saveCategories()
        .then(() => {
            deferred.resolve(newName);
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _setupCategoryBar(): void {
        const self = this;
        this._renderCategoryBar();
        this._renderOperatorBar();
        this.$dagView.find(".categories").on("click", ".category", (event) => {
            const $category: JQuery = $(event.currentTarget);
            const category: string = $category.data("category");
            this._focusOnCategory(category);
        });
        this.$dagView.find(".operatorBar").mouseenter(function() {
            const index = $(this).find(".category").index($(this).find(".category.active"));
            if (self._listScrollers[index]) {
                self._listScrollers[index].showOrHideScrollers();
            }
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
        iconMap[DagCategoryType.Custom] = "xi-custom";

        this.dagCategories.getCategories().forEach((category: DagCategory) => {
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
        const self = this;
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
        this.dagCategories.getCategories().forEach((category: DagCategory) => {
            const categoryName: string = category.getName();
            const operators: DagCategoryNode[] = category.getOperators();

            let index = 0;
            let operatorHtml: HTML = "";
            operators.forEach((categoryNode: DagCategoryNode) => {
                operatorHtml += this._genOperatorHTML(categoryNode, {
                    x: 10 + index * (DagView.nodeWidth + 20),
                    y: 11
                });
                if (!categoryNode.isHidden()) {
                    index ++;
                }
            });
            const width = 10 + index * (DagView.nodeWidth + 20);
            html += `<div class="category category-${categoryName}">
                        <div class="svgWrap">
                            <svg version="1.1" height="100%" width="${width}">
                            ${operatorHtml}
                            </svg>
                        </div>
                        <div class="scrollArea top">
                            <i class="arrow icon xi-arrow-left"></i>
                        </div>
                        <div class="scrollArea bottom">
                            <i class="arrow icon xi-arrow-right"></i>
                        </div>
                    </div>`;
        });

        this.$operatorBar.html(html);
        this._listScrollers = [];
        this.$operatorBar.find(".category").each(function() {
            self._listScrollers.push(new ListScroller($(this),
                $(this).find(".svgWrap"), false, {
                    noPositionReset: true
                }));
        });
    }

    private _genOperatorHTML(categoryNode: DagCategoryNode, pos: { x, y }): string {
        const categoryName: DagCategoryType = categoryNode.getCategoryType();
        const operator: DagNode = categoryNode.getNode();
        let numParents: number = operator.getMaxParents();
        let numChildren: number = operator.getMaxChildren();
        const operatorName: string = categoryNode.getNodeType();
        let opDisplayName: string = categoryNode.getDisplayNodeType();
        const subType: string = categoryNode.getNodeSubType();
        const subTypeDisplayName: string = categoryNode.getDisplayNodeSubType();
        const color: string = categoryNode.getColor();
        const icon: string = categoryNode.getIcon();
        const description: string = categoryNode.getDescription();
        if (subType) {
            opDisplayName = subTypeDisplayName;
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



        const html = '<g class="operator ' + operatorName + ' ' +
            (categoryNode.isHidden() ? 'xc-hidden ' : '') +
            'category-' + categoryName + '" ' +
                'data-category="' + categoryName + '" ' +
                'data-type="' + operatorName + '" ' +
                'data-subtype="' + subType + '" ' +
                'data-opid="' +  operator.getId() + '" ' +
                'transform="translate(' + pos.x + ',' + pos.y + ')" >' +
                inConnector +
                ('<polygon class="connector out" ' +
                'points="95,8 103,14 95,20" fill="#BBC7D1" ' +
                'stroke="#849CB0" stroke-width="1" ry="1" rx="1" />')
                .repeat(numChildren) +
            '<rect class="main" x="6" y="0" width="90" height="28" ' +
                'fill="white" stroke="#849CB0" stroke-width="1" ' +
                'ry="28" rx="12" ' +
                xcTooltip.Attrs + ' data-original-title="' + description + '" />'+
            '<rect class="iconArea" clip-path="url(#cut-off-right)" ' +
                'x="0" y="0" width="26" height="28" stroke="#849CB0" ' +
                'stroke-width="1" fill="' + color + '" />'+
            '<text class="icon" x="11" y="19" font-family="icomoon" ' +
                'font-size="12" fill="white">' + icon + '</text>' +
            '<svg width="60" height="' + DagView.nodeHeight + '" x="27" y="1">' +
                '<text class="opTitle" x="50%" y="50%" ' +
                'text-anchor="middle" alignment-baseline="middle" font-family="Open Sans" ' +
                'font-size="11" fill="#44515c">' + opDisplayName +
                '</text></svg>' +
            '<circle class="statusIcon" cx="88" cy="27" r="5" ' +
                'stroke="#849CB0" stroke-width="1" fill="white" />' +
            '</g>';

        return html;
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
                $dropTarget: self.$dagView.find(".dataflowArea.active .dataflowAreaWrapper"),
                round: DagView.gridSpacing,
                scale: DagView.getActiveDag().getScale(),
                onDragEnd: function(_$newNode, _event, data) {
                    const newNodeInfo: DagNodeInfo = self._getOperatorInfo(
                        $operator.data('opid')
                    );
                    newNodeInfo.display = {
                        x: data.coors[0].x,
                        y: data.coors[0].y
                    };
                    DagView.newNode(newNodeInfo);
                },
                onDragFail: function() {

                },
                copy: true
            });
        });

        this.$operatorBar.on("dblclick", ".operator .main", function() {
            const $operator: JQuery = $(this).closest(".operator");
            const $selectedNodes: JQuery = DagView.getSelectedNodes();
            const newNodeInfo: DagNodeInfo = self._getOperatorInfo(
                $operator.data('opid')
            );
            const type: DagNodeType = newNodeInfo.type;
            const subType: DagNodeSubType = newNodeInfo.subType;
            let parentNodeId: DagNodeId = null;
            if ($selectedNodes.length === 1) {
                parentNodeId = $selectedNodes.data("nodeid");
            }
            DagView.autoAddNode(type, subType, parentNodeId);
        });
    }

    private _setupScrolling(): void {
        const self = this;
        let delayTimer;
        this.$dagView.find(".categoryScroll .arrow").mouseenter(function() {
            const $el = $(this)
            let scrollAmount;
            if ($(this).hasClass("left")) {
                scrollAmount = -15;
            } else {
                scrollAmount = 15;
            }

            // force user to hover for 150ms before scrolling to
            // prevent unintended scrolling
            delayTimer = setTimeout(function() {
                let timer;
                scroll();
                function scroll() {
                    timer = setTimeout(function() {
                        var scrollLeft = self.$dagView.find(".categoryWrap").scrollLeft();
                        self.$dagView.find(".categoryWrap").scrollLeft(scrollLeft + scrollAmount);
                        scroll();
                    }, 30);
                }

                $el.on("mouseleave.catScroll", function() {
                    clearTimeout(timer);
                    $(document).off("mouseup.catScroll");
                });
            }, 150);

            $el.on("mouseleave.catScrollTimer", function() {
                clearTimeout(delayTimer);
                $(document).off("mouseup.catScrollTimer");
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
        this.dagCategories.getCategories().forEach((category) => {
            if (category.getName() !== DagCategoryType.Favorites) {
                category.getOperators().forEach((categoryNode) => {
                    if (categoryNode.isHidden()) {
                        return;
                    }
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

    private _getOperatorInfo(nodeId: string): DagNodeInfo {
        for (const category of this.dagCategories.getCategories()) {
            for (const categoryNode of category.getOperators()) {
                if (categoryNode.getNode().getId() === nodeId) {
                    return categoryNode.getNode().getNodeCopyInfo();
                }
            }
        }
        return null;
    }

    private _deleteOperator(nodeId: DagNodeId): XDPromise<void> {
        // Delete from categories
        for (const category of this.dagCategories.getCategories()) {
            if (category.removeOperatorById(nodeId)) {
                break;
            }
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);

        // Persist the change
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dagCategories.saveCategories()
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);

        return deferred.promise();
    }

    private _renameOperator(nodeId: DagNodeId, newName: string): XDPromise<void> {
        // Validate inputs
        if (nodeId == null || newName == null || newName.length === 0) {
            console.error(`Invalid inputs: "${nodeId}", "${newName}"`);
            return PromiseHelper.reject('Invalid inputs');
        }

        // Validate name
        let targetCategory: DagCategory = null;
        for (const category of this.dagCategories.getCategories()) {
            if (category.getOperatorById(nodeId) != null) {
                targetCategory = category;
                break;
            }
        }
        if (targetCategory == null) {
            console.error(`Operator(${nodeId}) not found in category`);
            return PromiseHelper.reject('Operator not found');
        }
        if (targetCategory.isExistOperatorName(newName)) {
            return PromiseHelper.reject('name exists');
        }

        // Rename
        const dagNode = targetCategory.getOperatorById(nodeId).getNode();
        if (dagNode instanceof DagNodeCustom) {
            dagNode.setCustomName(newName);
        } else {
            throw new Error(`Operator(${nodeId}) doesn't support renaming`);
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);

        // Persist the change
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dagCategories.saveCategories()
        .then(() => {
            deferred.resolve();
        })
        .fail(deferred.reject);
        return deferred.promise();
    }

    private _getCategoryByName(categoryName: DagCategoryType): DagCategory {
        let targetCategory = null;
        for (const category of this.dagCategories.getCategories()) {
            if (category.getName() === categoryName) {
                targetCategory = category;
                break;
            }
        }
        return targetCategory;
    }

    private _focusOnCategory(category: string) {
        this.currentCategory = <DagCategoryType>category;
        const $categories: JQuery = this.$dagView.find(".categories");
        $categories.find(".category").removeClass("active");
        $categories.find(".category.category-" + category).addClass("active");
        this.$operatorBar.find(".category").removeClass("active");
        const $category = this.$operatorBar.find(".category.category-" + category);
        $category.addClass("active");
        const index = this.$operatorBar.find(".category").index($category);
        this._listScrollers[index].showOrHideScrollers();
    }
}