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
    private selectedOpId: string;

    constructor() {
        this.$dagView = $("#dagView");
        this.$operatorBar = this.$dagView.find(".operatorWrap");
    }

    public setup(): void {
        this.dagCategories = new DagCategories();
        this._setupCategoryBar();
        this._setupDragDrop();
        this._setupScrolling();
        this._setupSearch();
        this._setupActionBar();
        // Activate the favorites category by default
        this._focusOnCategory(DagCategoryType.In);
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
        return this._saveCategories()
        .then(() => newName);
    }

    /**
     * Update the connectorIn UI of a node
     * @param numParents
     * @param rect
     */
    public updateNodeConnectorIn(numParents: number, elemNode: d3): void {
        const params = this._getConnectorInParams(numParents);
        const elemConnIn = elemNode.select('.connIn');

        elemConnIn.selectAll('rect').remove();
        for (const param of params) {
            const elemRect = elemConnIn.append('rect');
            elemRect.attr('class', param.class.join(' '));
            for (const attrName of Object.keys(param.attrs)) {
                const attrValue = param.attrs[attrName];
                elemRect.attr(attrName, attrValue);
            }
        }
    }

    /**
     * Update the connectorOut UI of a node
     * @param numOutput
     * @param elemNode
     */
    public updateNodeConnectorOut(numOutput: number, elemNode: d3): void {
        const params = this._getConnectorOutParams(numOutput);
        const elemConnOut = elemNode.select('.connOut');

        elemConnOut.empty();
        for (const param of params) {
            const elemPolygon = elemConnOut.append('polygon');
            elemPolygon.attr('class', param.class.join(' '));
            for (const attrName of Object.keys(param.attrs)) {
                const attrValue = param.attrs[attrName];
                elemPolygon.attr(attrName, attrValue);
            }
        }
    }

    private _setupCategoryBar(): void {
        const self = this;
        this._renderCategoryBar();
        this._renderOperatorBar();
        this.$dagView.find(".categories").on("mousedown", ".category", (event) => {
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
            const operators: DagCategoryNode[] = category.getSortedOperators();

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
        if (this.selectedOpId != null) {
            this._setSelectedStyle(
                this.$operatorBar.find(`.operator[data-opid="${this.selectedOpId}"]`)
            );
        }
    }

    private _getConnectorOutParams(numOutput: number) {
        const params: {
            class: string[], attrs: {[attrName: string]: string}
        }[] = [];
        // ('<polygon class="connector out" ' +
        // 'points="95,8 103,14 95,20" fill="#BBC7D1" ' +
        // 'stroke="#849CB0" stroke-width="1" ry="1" rx="1" />')
        for (let i = 0; i < numOutput; i ++) {
            params.push({
                class: ['connector', 'out'],
                attrs: {
                    'points': '95,8 103,14 95,20',
                    'fill': '#BBC7D1',
                    'stroke': '#849CB0', 'stroke-width': '1',
                    'rx': '1', 'ry': '1'
                }
            });
        }
        return params;
    }

    private _getConnectorInParams(numParents: number) {
        const params: {
            class: string[], attrs: {[attrName: string]: string}
        }[] = [];

        if (numParents === 0) {
            // if no connector, still needs something that gives width
            // for positioning when dragging
            params.push({
                class: ['connectorSpace'],
                attrs: {
                    'x': '0', 'y': '11', 'fill': 'none', 'stroke': 'none',
                    'width': '7', 'height': '7'
                }
            });
            // '<rect class="connectorSpace" ' +
            //     'x="0" y="11" fill="none" ' +
            //     'stroke="none" width="7" height="7" />';
        } else if (numParents === -1) {
            params.push({
                class: ['connector', 'in', 'noConnection', 'multi'],
                attrs: {
                    'x': '0', 'y': '5', 'fill': '#BBC7D1', 'stroke': '#849CB0',
                    'stroke-width': '1', 'rx': '1', 'ry': '1',
                    'width': '7', 'height': '18',
                    'data-index': '0',
                }
            });
            // '<rect class="connector in noConnection multi"' +
            //     'data-index="0" x="0" y="5" fill="#BBC7D1" ' +
            //     'stroke="#849CB0" stroke-width="1" ' +
            //     'ry="1" rx="1" width="7" height="18" />';
        } else {
            for (let j = 0; j < numParents; j++) {
                const y  = 28 / (numParents + 1) * (1 + j) - 3;
                params.push({
                    class: ['connector', 'in', 'noConnection'],
                    attrs: {
                        'x': '0', 'y': `${y}`, 'fill': '#BBC7D1',
                        'stroke': '#849CB0', 'stroke-width': '1',
                        'rx': '1', 'ry': '1', 'width': '7', 'height': '7',
                        'data-index': `${j}`,
                    }
                });
                // '<rect class="connector in noConnection"' +
                //     'data-index="' + j + ' " x="0" y="' + y +
                //     '" fill="#BBC7D1" ' +
                //     'stroke="#849CB0" stroke-width="1" ry="1" ' +
                //     'rx="1" width="7" height="7" />';
            }
        }
        return params;
    }

    private _genConnectorInHTML(numParents: number): HTML {
        const params = this._getConnectorInParams(numParents);

        let html = '';
        for (const param of params) {
            const classes = param.class.join(' ');
            const attrs = Object.keys(param.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${param.attrs[attrName]}"`),
                '');
            html = `${html}<rect class="${classes}" ${attrs}></rect>`;
        }

        return html;
    }

    private _genConnectorOutHTML(numOutput: number): HTML {
        const params = this._getConnectorOutParams(numOutput);

        let html = '';
        for (const param of params) {
            const classes = param.class.join(' ');
            const attrs = Object.keys(param.attrs).reduce(
                (res, attrName) => (`${res} ${attrName}="${param.attrs[attrName]}"`),
                '');
            html = `${html}<polygon class="${classes}" ${attrs}></polygon>`;
        }

        return html;
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

        const inConnector = this._genConnectorInHTML(numParents);
        const outConnector = this._genConnectorOutHTML(numChildren);

        const opTitleHtml = this._formatOpTitle(opDisplayName);

        const html = '<g class="operator ' + operatorName + ' ' +
            (categoryNode.isHidden() ? 'xc-hidden ' : '') +
            'category-' + categoryName + '" ' +
                'data-category="' + categoryName + '" ' +
                'data-type="' + operatorName + '" ' +
                'data-subtype="' + subType + '" ' +
                'data-opid="' +  operator.getId() + '" ' +
                'transform="translate(' + pos.x + ',' + pos.y + ')" >' +
                '<svg class="connIn">' + inConnector + '</svg>' +
                '<svg class="connOut">' + outConnector + '</svg>' +
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
                opTitleHtml + '</svg>' +
            '<circle class="statusIcon" cx="88" cy="27" r="5" ' +
                'stroke="#849CB0" stroke-width="1" fill="white" />' +
            '</g>';

        return html;
    }

    private _formatOpTitle(name): HTML {
        let html: HTML;
        // XXX arbritrary way to decide if name is too long for 1 line
        if (name.length > 10 && name.indexOf(" ") > -1) {
            const namePart1 = name.substring(0, name.lastIndexOf(" "));
            const namePart2 = name.slice(name.lastIndexOf(" ") + 1);
            html = '<text class="opTitle" x="50%" y="30%" ' +
            'text-anchor="middle" alignment-baseline="middle" font-family="Open Sans" ' +
            'font-size="11" fill="#44515c">' + namePart1 +
            '</text>' +
            '<text class="opTitle" x="50%" y="70%" ' +
            'text-anchor="middle" alignment-baseline="middle" font-family="Open Sans" ' +
            'font-size="11" fill="#44515c">' + namePart2 +
            '</text>';

        } else {
            html = '<text class="opTitle" x="50%" y="50%" ' +
            'text-anchor="middle" alignment-baseline="middle" font-family="Open Sans" ' +
            'font-size="11" fill="#44515c">' + name +
            '</text>';
        }
        return html;
    }

    private _setupDragDrop(): void {
        const self = this;
        // dragging operator bar node into dataflow area
        this.$operatorBar.on("mousedown", ".operator .main", function(event) {
            if (DagView.isDisableActions()) {
                return;
            }
            if (event.which !== 1) {
                return;
            }
            const activeDag: DagGraph = DagView.getActiveDag();
            if (activeDag == null) {
                return;
            }
            const $operator = $(this).closest(".operator");
            new DragHelper({
                event: event,
                $element: $operator,
                $container: self.$dagView,
                $dropTarget: self.$dagView.find(".dataflowArea.active .dataflowAreaWrapper"),
                round: DagView.gridSpacing,
                scale: activeDag.getScale(),
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
                onDragFail: function(_wasDragged) {

                },
                copy: true
            });
        });

        this.$operatorBar.on("dblclick", ".operator .main", function() {
            if (DagView.isDisableActions()) {
                return;
            }
            const $operator: JQuery = $(this).closest(".operator");
            const $selectedNodes: JQuery = DagView.getSelectedNodes();
            const newNodeInfo: DagNodeCopyInfo = self._getOperatorInfo(
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

    private _setupActionBar(): void {
        this.$operatorBar.on('click', '.operator .main', (event) => {
            const $operator: JQuery = $(event.target).closest(".operator");
            const opInfo: DagNodeCopyInfo = this._getOperatorInfo(
                $operator.data('opid'));

            if (opInfo.type === DagNodeType.Custom) {
                // Clear the current selection
                if (this.selectedOpId != null) {
                    this._clearSelectedStyle(
                        this.$operatorBar.find(`.operator[data-opid="${this.selectedOpId}"]`)
                    );
                    this.selectedOpId = null;
                }

                // Select the node clicked on
                this.selectedOpId = opInfo.id || opInfo.nodeId;
                this._setSelectedStyle($operator);

                // Enable the action section
                this._enableActionSection(this.selectedOpId);
            }

            return false;
        });

        this.$operatorBar.on('click', () => {
            if (this.currentCategory === DagCategoryType.Custom) {
                // Clear the current selection
                if (this.selectedOpId != null) {
                    this._clearSelectedStyle(
                        this.$operatorBar.find(`.operator[data-opid="${this.selectedOpId}"]`)
                    );
                    this.selectedOpId = null;
                }

                // Disable the action section
                this._disableActionSection();
            }
        });
    }

    private _setSelectedStyle($operator: JQuery): void {
        // '<rect class="selection" x="-4" y="-8" width="111" height="43" ' +
        // 'fill="#EAF9FF" stroke="#38CBFF" stroke-width="1" ' +
        // 'ry="43" rx="16" />';
        if ($operator.find('.selection').length > 0) {
            return;
        }
        const rect = d3.select($operator[0]).insert('rect', ':first-child');
        rect.classed('selection', true);
        rect.attr('x', '-4').attr('y', '-8')
            .attr('width', '111').attr('height', '43')
            .attr('fill', '#EAF9FF').attr('stroke', '#38CBFF').attr('stroke-width', '1')
            .attr('rx', '16').attr('ry', '43');
    }

    private _clearSelectedStyle($operator: JQuery): void {
        d3.select($operator[0]).selectAll('.selection').remove();
    }

    private _showActionSection(): void {
        const $elemAction = this.$dagView.find('.actionWrap');
        $elemAction.removeClass('xc-hidden');
    }

    private _hideActionSection(): void {
        const $elemAction = this.$dagView.find('.actionWrap');
        if (!$elemAction.hasClass('xc-hidden')) {
            $elemAction.addClass('xc-hidden');
        }
    }

    private _enableActionSection(opId: string): void {
        const category = this.dagCategories.getCategoryByNodeId(opId);

        // Enable the buttons
        const $elemActions = this.$dagView.find('.actionWrap .actions');
        $elemActions.removeClass('disabled');

        // Setup action button event listeners
        const $elemActionRename = $elemActions.find('.selRename');
        $elemActionRename.off();
        if (category != null) {
            $elemActionRename.on('click', () => {
                DagCustomRenameModal.Instance.show({
                    name: category.getOperatorById(opId).getDisplayNodeType(),
                    validateFunc: (newName) => {
                        return this._isValidOperatorName(category, newName);
                    },
                    onSubmit: (newName) => {
                        this._renameOperator(opId, newName);
                    }
                });
            });
        }

        const $elemActionDel = $elemActions.find('.selDel');
        $elemActionDel.off();
        $elemActionDel.on('click', () => {
            Alert.show({
                title: 'delete operator',
                msg: `Are you sure you want to delete the operator`,
                onConfirm: () => {
                    this._deleteOperator(opId);
                }
            });
        });
    }

    private _disableActionSection(): void {
        // Diable the buttons
        const $elemActions = this.$dagView.find('.actionWrap .actions');
        if (!$elemActions.hasClass('disabled')) {
            $elemActions.addClass('disabled');
        }

        // Clear event listeners
        $elemActions.find('.selRename').off();
        $elemActions.find('.selDel').off();
    }

    private _setupScrolling(): void {
        const self = this;
        this.$dagView.find(".categoryScroll .arrow").mouseup(function() {
            const $catWrap = self.$dagView.find(".categoryWrap .categories");
            const $categories = self.$dagView.find(".categoryWrap .categories .category");
            if ($(this).hasClass("left")) {
                $catWrap.prepend($categories.last().detach());
                self._listScrollers.unshift(self._listScrollers.pop());
            } else {
                $catWrap.find(".spacer").before($categories.eq(0).detach());
                self._listScrollers.push(self._listScrollers.shift());
            }
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

    private _getOperatorInfo(nodeId: string): DagNodeCopyInfo {
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

        // Clear the current selection
        if (nodeId === this.selectedOpId) {
            this.selectedOpId = null;
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);

        // Persist the change
        return this._saveCategories();
    }

    private _isValidOperatorName(category: DagCategory, newName: string): boolean {
        // Validate inputs
        if (category == null || newName == null || newName.length === 0) {
            console.error(`Invalid inputs: "${category}", "${newName}"`);
            return false;
        }

        // Validate name
        if (category.isExistOperatorName(newName)) {
            return false;
        }

        return true;
    }

    private _renameOperator(nodeId: DagNodeId, newName: string): XDPromise<void> {
        const targetCategory = this.dagCategories.getCategoryByNodeId(nodeId);
        if (targetCategory == null) {
            return PromiseHelper.reject('Category not found');
        }

        // Validate name
        if (!this._isValidOperatorName(targetCategory, newName)) {
            return PromiseHelper.reject('Invalid name');
        }

        // Rename
        if (!targetCategory.renameOperatorById(nodeId, newName)) {
            return PromiseHelper.reject('Rename failed');
        }

        // Re-render the operator bar(UI)
        this._renderOperatorBar();
        this._focusOnCategory(this.currentCategory);

        // Persist the change
        return this._saveCategories();
    }

    private _saveCategories(): XDPromise<void> {
        const deferred: XDDeferred<void> = PromiseHelper.deferred();
        this.dagCategories.saveCategories()
        .then(() => {
            XcSocket.Instance.sendMessage("refreshDagCategory");
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
        if (category === DagCategoryType.Custom) {
            this._showActionSection();
            if (this.selectedOpId != null) {
                this._enableActionSection(this.selectedOpId);
            } else {
                this._disableActionSection();
            }
        } else {
            this._hideActionSection();
        }
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